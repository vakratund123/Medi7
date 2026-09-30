"""
WhatsApp Service — Meta WhatsApp Cloud API (primary) with WATI fallback.

Provider priority:
  1. Meta Cloud API  → if META_WHATSAPP_TOKEN + META_PHONE_NUMBER_ID are set
  2. WATI            → if WATI_API_TOKEN + WATI_API_ENDPOINT are set
  3. Stub / logging  → falls back silently in dev

Meta phone numbers must include country code, no '+':
  India → 91XXXXXXXXXX
"""
import logging
import re
import os
import io
from pathlib import Path
import httpx
from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

_META_BASE = "https://graph.facebook.com/v19.0"

# Approved templates registered on this Meta WhatsApp Business Account
APPROVED_META_TEMPLATES = {
    "hospital_welcome_update",       # Takes 1 param: [patient_id]
    "hospital_prescription_ready",   # Takes 2 params: [patient_name, follow_up]
}


def _normalize_mobile(mobile: str) -> str | None:
    """
    Ensure number has India country code (91) and no special characters.
    Handles +91, 0, spaces, dashes, parentheses.
    Returns normalized string like '919823012345' or None if invalid.
    """
    if not mobile:
        return None
    raw = str(mobile).strip()
    digits = re.sub(r"\D", "", raw)
    if digits.startswith("0"):
        digits = digits[1:]
    
    # 10-digit standard Indian mobile number
    if len(digits) == 10:
        return "91" + digits
    # 12-digit already prefixed with 91
    if len(digits) == 12 and digits.startswith("91"):
        return digits
    # 11-digit leading zero that wasn't stripped
    if len(digits) == 11 and digits.startswith("0"):
        return "91" + digits[1:]

    # If it's another length, check if valid E.164 (7-15 digits)
    if 10 <= len(digits) <= 15:
        return digits

    logger.warning(f"[WhatsApp] Invalid or unparseable mobile number '{mobile}'")
    return None


async def log_whatsapp_db(patient_id: str | None, message_type: str, status: str):
    """Asynchronously record WhatsApp delivery to the whatsapp_logs table."""
    if not patient_id:
        return
    try:
        from app.database import AsyncSessionLocal
        from app.models.audit import WhatsAppLog
        async with AsyncSessionLocal() as session:
            entry = WhatsAppLog(
                patient_id=patient_id,
                message_type=message_type,
                status=status,
            )
            session.add(entry)
            await session.commit()
    except Exception as e:
        logger.debug(f"[WhatsApp Log] Could not save to DB: {e}")


# ─────────────────────────── Meta Cloud API ───────────────────────────────────

async def _meta_send_template(
    mobile: str,
    template_name: str,
    parameters: list[str] | None = None,
    language_code: str = "en_US",
) -> bool:
    url = f"{_META_BASE}/{settings.META_PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {settings.META_WHATSAPP_TOKEN}",
        "Content-Type": "application/json",
    }
    components = []
    if parameters:
        components.append({
            "type": "body",
            "parameters": [{"type": "text", "text": str(p)} for p in parameters],
        })
    payload = {
        "messaging_product": "whatsapp",
        "to": mobile,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": language_code},
            "components": components,
        },
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        msg_id = data.get("messages", [{}])[0].get("id")
        logger.info(f"[Meta WA] ✅ Template '{template_name}' sent to {mobile} | id={msg_id}")
        return True


async def _meta_send_text(mobile: str, message: str) -> bool:
    url = f"{_META_BASE}/{settings.META_PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {settings.META_WHATSAPP_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": mobile,
        "type": "text",
        "text": {"preview_url": False, "body": message},
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        msg_id = data.get("messages", [{}])[0].get("id")
        logger.info(f"[Meta WA] ✅ Text sent to {mobile} | id={msg_id}")
        return True


async def _meta_upload_media(file_bytes: bytes, filename: str, mime_type: str = "application/pdf") -> str | None:
    """Upload binary file to Meta Cloud API media endpoint and return media_id."""
    url = f"{_META_BASE}/{settings.META_PHONE_NUMBER_ID}/media"
    headers = {"Authorization": f"Bearer {settings.META_WHATSAPP_TOKEN}"}
    files = {"file": (filename, io.BytesIO(file_bytes), mime_type)}
    data = {"messaging_product": "whatsapp", "type": mime_type}

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, headers=headers, data=data, files=files)
        resp.raise_for_status()
        media_id = resp.json().get("id")
        logger.info(f"[Meta WA] ✅ Media uploaded: {filename} -> media_id={media_id}")
        return media_id


def _resolve_local_file(file_path_or_url: str) -> Path | None:
    """Resolve a relative or absolute local file path across multiple candidate directories."""
    if not file_path_or_url or file_path_or_url.startswith("http://") or file_path_or_url.startswith("https://"):
        return None
    clean = str(file_path_or_url).replace("\\", "/").strip()
    direct = Path(clean)
    if direct.is_file():
        return direct

    rel = clean.lstrip("/")
    if rel.startswith("uploads/"):
        rel = rel[len("uploads/"):]

    candidates = [
        Path(settings.LOCAL_STORAGE_PATH) / rel,
        Path(settings.LOCAL_STORAGE_PATH) / "uploads" / rel,
        Path(__file__).resolve().parent.parent / "uploads" / rel,
        Path(__file__).resolve().parent.parent.parent / "uploads" / rel,
        Path.cwd() / "uploads" / rel,
        Path.cwd() / "backend" / "uploads" / rel,
        Path.cwd() / rel,
    ]
    for c in candidates:
        if c.is_file():
            return c
    return None


async def _meta_send_document(mobile: str, file_path_or_url: str, caption: str = "") -> bool:
    """
    Send PDF document via WhatsApp.
    Supports BOTH:
    1. Local files / relative paths (e.g. '/uploads/prescriptions/rx_123.pdf') -> uploads directly to Meta media API
    2. Public HTTPS URLs -> passes URL directly to Meta
    """
    url = f"{_META_BASE}/{settings.META_PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {settings.META_WHATSAPP_TOKEN}",
        "Content-Type": "application/json",
    }
    doc_name = f"{caption}.pdf" if caption and not caption.lower().endswith(".pdf") else (caption or "Medical_Document.pdf")
    # Clean doc_name for safe header
    doc_name = re.sub(r'[\\/*?:"<>|]', "_", doc_name)

    # Check if local file path
    local_file = _resolve_local_file(file_path_or_url)

    if local_file and local_file.exists():
        # Upload binary directly to Meta WhatsApp Media API
        file_bytes = local_file.read_bytes()
        media_id = await _meta_upload_media(file_bytes, local_file.name, "application/pdf")
        if not media_id:
            raise RuntimeError("Failed to obtain media_id from Meta API upload")
        doc_payload = {
            "id": media_id,
            "caption": caption,
            "filename": doc_name,
        }
    elif file_path_or_url.startswith("http://") or file_path_or_url.startswith("https://"):
        # Public URL link
        doc_payload = {
            "link": file_path_or_url,
            "caption": caption,
            "filename": doc_name,
        }
    else:
        logger.error(f"[Meta WA] Document file not found on disk or invalid URL: {file_path_or_url}")
        return False

    payload = {
        "messaging_product": "whatsapp",
        "to": mobile,
        "type": "document",
        "document": doc_payload,
    }

    async with httpx.AsyncClient(timeout=25) as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()
        logger.info(f"[Meta WA] ✅ Document '{doc_name}' sent to {mobile}")
        return True


# ─────────────────────────── WATI Fallback ────────────────────────────────────

async def _wati_send_text(mobile: str, message: str) -> bool:
    url = f"{settings.WATI_API_ENDPOINT}/api/v1/sendSessionMessage/{mobile}"
    headers = {"Authorization": f"Bearer {settings.WATI_API_TOKEN}"}
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(url, json={"messageText": message}, headers=headers)
        resp.raise_for_status()
        return True


async def _wati_send_document(mobile: str, file_url: str, caption: str = "") -> bool:
    url = f"{settings.WATI_API_ENDPOINT}/api/v1/sendSessionFile/{mobile}"
    headers = {"Authorization": f"Bearer {settings.WATI_API_TOKEN}"}
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(url, json={"url": file_url, "caption": caption}, headers=headers)
        resp.raise_for_status()
        return True


# ─────────────────────────── Public API ───────────────────────────────────────

async def send_whatsapp_template(
    mobile: str,
    template_name: str,
    parameters: list[str] | None = None,
    language_code: str = "en_US",
    fallback_message: str | None = None,
    patient_id: str | None = None,
    preferred_language: str = "english",
) -> bool:
    """
    Send an approved WhatsApp template with automatic smart language handling:
    - If preferred_language is NOT English (e.g. Marathi, Hindi, Kannada) and fallback_message is provided:
      Sends the rich, localized message in that language via WhatsApp text (Meta templates are English-only).
    - If preferred_language is English and template is in APPROVED_META_TEMPLATES:
      Sends the official Meta template with automatic fallback.
    - Validates mobile number and records status to audit log.
    """
    normalized = _normalize_mobile(mobile)
    if not normalized:
        logger.warning(f"[WhatsApp] Skipped template '{template_name}' due to invalid mobile '{mobile}'")
        return False

    # Map language names to Meta Cloud API language codes
    lang_code_map = {
        "kannada": "kn",
        "marathi": "mr",
        "hindi": "hi",
        "english": "en_US",
    }
    target_lang_code = lang_code_map.get(lang, language_code or "en_US")

    # Check Meta Cloud API
    if settings.META_WHATSAPP_TOKEN and settings.META_PHONE_NUMBER_ID:
        if lang != "english" and fallback_message:
            # Regional language patient (Marathi, Kannada, Hindi)
            # Send the localized message directly so they receive ONLY their preferred language.
            # Do NOT send the English template when localized message is delivered!
            try:
                logger.info(f"[Meta WA] Sending clean localized message in '{lang}' to {normalized}")
                success = await _meta_send_text(normalized, fallback_message)
            except Exception as e:
                logger.warning(f"[Meta WA] Localized text failed: {e}. Falling back to template.")
                # Only if text delivery fails (e.g. 24h window closed), fall back to approved template
                if template_name in APPROVED_META_TEMPLATES:
                    try:
                        success = await _meta_send_template(normalized, template_name, parameters, "en_US")
                    except Exception as ex2:
                        logger.error(f"[Meta WA] Template fallback failed: {ex2}")
        else:
            # English patient — send approved Meta template or text
            if template_name in APPROVED_META_TEMPLATES:
                try:
                    success = await _meta_send_template(normalized, template_name, parameters, "en_US")
                except Exception as e:
                    if fallback_message:
                        try:
                            success = await _meta_send_text(normalized, fallback_message)
                        except Exception as ex2:
                            logger.error(f"[Meta WA] English text fallback failed: {ex2}")
            elif fallback_message:
                try:
                    success = await _meta_send_text(normalized, fallback_message)
                except Exception as ex:
                    logger.error(f"[Meta WA] Text sending failed: {ex}")

        await log_whatsapp_db(patient_id, template_name, "delivered" if success else "failed")
        return success

    # WATI / Stub fallback
    if fallback_message:
        success = await send_whatsapp_message(mobile, fallback_message, patient_id=patient_id)
        await log_whatsapp_db(patient_id, template_name, "delivered" if success else "failed")
        return success

    return True


async def send_whatsapp_message(mobile: str, message: str, patient_id: str | None = None) -> bool:
    """Send a plain text WhatsApp message. Auto-selects active provider."""
    normalized = _normalize_mobile(mobile)
    if not normalized:
        logger.warning(f"[WhatsApp] Skipped message due to invalid mobile '{mobile}'")
        return False

    success = False
    # Meta Cloud API
    if settings.META_WHATSAPP_TOKEN and settings.META_PHONE_NUMBER_ID:
        try:
            success = await _meta_send_text(normalized, message)
        except Exception as e:
            logger.error(f"[Meta WA] Text failed to {normalized}: {e}")
            success = False
        await log_whatsapp_db(patient_id, "text_message", "delivered" if success else "failed")
        return success

    # WATI fallback
    if settings.WATI_API_TOKEN and settings.WATI_API_ENDPOINT:
        try:
            success = await _wati_send_text(normalized, message)
        except Exception as e:
            logger.error(f"[WATI] Text failed to {normalized}: {e}")
            success = False
        await log_whatsapp_db(patient_id, "text_message", "delivered" if success else "failed")
        return success

    # Stub / dev mode
    logger.info(f"[WhatsApp STUB] To: {normalized}\n{message}")
    await log_whatsapp_db(patient_id, "text_message", "stub_logged")
    return True


async def send_whatsapp_document(
    mobile: str,
    file_path_or_url: str,
    caption: str = "",
    patient_id: str | None = None,
) -> bool:
    """
    Send a document (PDF) via WhatsApp.
    Supports local file paths (uploaded to Meta binary media endpoint) and public URLs.
    """
    normalized = _normalize_mobile(mobile)
    if not normalized:
        logger.warning(f"[WhatsApp] Skipped document due to invalid mobile '{mobile}'")
        return False

    success = False
    if settings.META_WHATSAPP_TOKEN and settings.META_PHONE_NUMBER_ID:
        try:
            success = await _meta_send_document(normalized, file_path_or_url, caption)
        except Exception as e:
            logger.error(f"[Meta WA] Document delivery failed to {normalized}: {e}")
            success = False
        await log_whatsapp_db(patient_id, "document", "delivered" if success else "failed")
        return success

    if settings.WATI_API_TOKEN and settings.WATI_API_ENDPOINT:
        try:
            success = await _wati_send_document(normalized, file_path_or_url, caption)
        except Exception as e:
            logger.error(f"[WATI] Document failed to {normalized}: {e}")
            success = False
        await log_whatsapp_db(patient_id, "document", "delivered" if success else "failed")
        return success

    logger.info(f"[WhatsApp STUB] Document to: {normalized} | {file_path_or_url}")
    await log_whatsapp_db(patient_id, "document", "stub_logged")
    return True
