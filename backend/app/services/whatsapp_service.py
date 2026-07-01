"""
WhatsApp Service — sends messages via WATI API.
Falls back to logging when WATI_API_TOKEN is not set.
"""
import logging
import httpx
from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


async def send_whatsapp_message(mobile: str, message: str) -> bool:
    """Send a plain text WhatsApp message via WATI."""
    if not settings.WATI_API_TOKEN or not settings.WATI_API_ENDPOINT:
        logger.info(f"[WhatsApp STUB] To: {mobile}\n{message}")
        return True

    url = f"{settings.WATI_API_ENDPOINT}/api/v1/sendSessionMessage/{mobile}"
    headers = {"Authorization": f"Bearer {settings.WATI_API_TOKEN}"}
    payload = {"messageText": message}

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            return True
    except Exception as e:
        logger.error(f"WhatsApp send failed to {mobile}: {e}")
        return False


async def send_whatsapp_document(mobile: str, file_url: str, caption: str = "") -> bool:
    """Send a document (PDF) via WATI."""
    if not settings.WATI_API_TOKEN or not settings.WATI_API_ENDPOINT:
        logger.info(f"[WhatsApp STUB] Document to: {mobile} | {file_url}")
        return True

    url = f"{settings.WATI_API_ENDPOINT}/api/v1/sendSessionFile/{mobile}"
    headers = {"Authorization": f"Bearer {settings.WATI_API_TOKEN}"}
    payload = {"url": file_url, "caption": caption}

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            return True
    except Exception as e:
        logger.error(f"WhatsApp document send failed to {mobile}: {e}")
        return False
