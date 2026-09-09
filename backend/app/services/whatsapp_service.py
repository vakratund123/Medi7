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
import httpx
from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

_META_BASE = "https://graph.facebook.com/v19.0"


def _normalize_mobile(mobile: str) -> str:
    """Ensure number has India country code (91) and no special chars."""
    mobile = mobile.strip().replace("+", "").replace(" ", "").replace("-", "")
    if mobile.startswith("0"):
        mobile = mobile[1:]
    # Prefix India code if 10-digit number
    if len(mobile) == 10:
        mobile = "91" + mobile
    return mobile


# ─────────────────────────── Meta Cloud API ───────────────────────────────────

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
        logger.info(f"[Meta WA] ✅ Text sent to {mobile} | id={resp.json().get('messages', [{}])[0].get('id')}")
        return True


async def _meta_send_document(mobile: str, file_url: str, caption: str = "") -> bool:
    url = f"{_META_BASE}/{settings.META_PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {settings.META_WHATSAPP_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": mobile,
        "type": "document",
        "document": {"link": file_url, "caption": caption},
    }
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()
        logger.info(f"[Meta WA] ✅ Document sent to {mobile}")
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

async def send_whatsapp_message(mobile: str, message: str) -> bool:
    """Send a plain text WhatsApp message. Auto-selects provider."""
    mobile = _normalize_mobile(mobile)

    # Meta Cloud API
    if settings.META_WHATSAPP_TOKEN and settings.META_PHONE_NUMBER_ID:
        try:
            return await _meta_send_text(mobile, message)
        except Exception as e:
            logger.error(f"[Meta WA] Text failed to {mobile}: {e}")
            return False

    # WATI fallback
    if settings.WATI_API_TOKEN and settings.WATI_API_ENDPOINT:
        try:
            return await _wati_send_text(mobile, message)
        except Exception as e:
            logger.error(f"[WATI] Text failed to {mobile}: {e}")
            return False

    # Stub / dev mode
    logger.info(f"[WhatsApp STUB] To: {mobile}\n{message}")
    return True


async def send_whatsapp_document(mobile: str, file_url: str, caption: str = "") -> bool:
    """Send a document (PDF) via WhatsApp. Auto-selects provider."""
    mobile = _normalize_mobile(mobile)

    if settings.META_WHATSAPP_TOKEN and settings.META_PHONE_NUMBER_ID:
        try:
            return await _meta_send_document(mobile, file_url, caption)
        except Exception as e:
            logger.error(f"[Meta WA] Document failed to {mobile}: {e}")
            return False

    if settings.WATI_API_TOKEN and settings.WATI_API_ENDPOINT:
        try:
            return await _wati_send_document(mobile, file_url, caption)
        except Exception as e:
            logger.error(f"[WATI] Document failed to {mobile}: {e}")
            return False

    logger.info(f"[WhatsApp STUB] Document to: {mobile} | {file_url}")
    return True
