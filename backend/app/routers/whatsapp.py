"""
WhatsApp Test Router — dev/admin use only.
Endpoints to manually fire WhatsApp messages for integration testing.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.services.whatsapp_service import send_whatsapp_message, send_whatsapp_document
from app.config import get_settings
from app.middleware.auth_middleware import require_any
from app.models.staff import Staff

settings = get_settings()
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/whatsapp", tags=["WhatsApp"])


class TestMessageRequest(BaseModel):
    mobile: str = "8618688243"
    message: str = "🏥 Hello from Medi7! WhatsApp integration is working perfectly. — Sai Hospital"


class TestDocumentRequest(BaseModel):
    mobile: str = "8618688243"
    file_url: str
    caption: str = "Test Document from Medi7"


@router.get("/status")
async def whatsapp_status(_: Staff = Depends(require_any)):
    """Check which WhatsApp provider is currently active."""
    if settings.META_WHATSAPP_TOKEN and settings.META_PHONE_NUMBER_ID:
        return {
            "provider": "Meta WhatsApp Cloud API",
            "status": "configured",
            "phone_number_id": settings.META_PHONE_NUMBER_ID[:8] + "...",
            "token_set": True,
        }
    if settings.WATI_API_TOKEN and settings.WATI_API_ENDPOINT:
        return {
            "provider": "WATI",
            "status": "configured",
            "endpoint": settings.WATI_API_ENDPOINT,
            "token_set": True,
        }
    return {
        "provider": "stub",
        "status": "no provider configured — messages will only appear in logs",
        "token_set": False,
    }


@router.post("/test/message")
async def test_send_message(
    req: TestMessageRequest,
    _: Staff = Depends(require_any),
):
    """
    Fire a test WhatsApp text message.
    Default target is the dev test number 8618688243.
    """
    logger.info(f"[WA Test] Sending test message to {req.mobile}")
    success = await send_whatsapp_message(req.mobile, req.message)
    if not success:
        raise HTTPException(status_code=502, detail="WhatsApp delivery failed — check server logs.")
    return {
        "ok": True,
        "to": req.mobile,
        "message": req.message,
        "detail": "Message queued for delivery.",
    }


@router.post("/test/document")
async def test_send_document(
    req: TestDocumentRequest,
    _: Staff = Depends(require_any),
):
    """
    Fire a test WhatsApp document (must be a public HTTPS URL).
    Useful to verify PDF delivery works end-to-end.
    """
    if not req.file_url.startswith("https://"):
        raise HTTPException(
            status_code=400,
            detail="file_url must be a public HTTPS URL. Local paths won't work with Meta API.",
        )
    success = await send_whatsapp_document(req.mobile, req.file_url, req.caption)
    if not success:
        raise HTTPException(status_code=502, detail="Document delivery failed — check server logs.")
    return {
        "ok": True,
        "to": req.mobile,
        "file_url": req.file_url,
        "detail": "Document queued for delivery.",
    }
