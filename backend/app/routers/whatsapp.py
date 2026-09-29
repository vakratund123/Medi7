"""
WhatsApp Router — diagnostics, live testing, manual re-send, and logs.
Allows staff/admin to monitor and test WhatsApp delivery end-to-end.
"""
import logging
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db
from app.services.whatsapp_service import send_whatsapp_message, send_whatsapp_document, send_whatsapp_template
from app.services.ai_service import generate_whatsapp_message
from app.config import get_settings
from app.middleware.auth_middleware import require_any
from app.models.staff import Staff
from app.models.patient import Patient
from app.models.bill import Bill
from app.models.prescription import Prescription
from app.models.audit import WhatsAppLog

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


class TestTemplateRequest(BaseModel):
    mobile: str = "8618688243"
    template_name: str = "hospital_welcome_update"
    parameters: list[str] = ["SAI-2026-TEST"]


@router.get("/status")
async def whatsapp_status(_: Staff = Depends(require_any)):
    """Check which WhatsApp provider is currently active and configuration health."""
    if settings.META_WHATSAPP_TOKEN and settings.META_PHONE_NUMBER_ID:
        return {
            "provider": "Meta WhatsApp Cloud API",
            "status": "configured",
            "phone_number_id": settings.META_PHONE_NUMBER_ID[:6] + "..." + settings.META_PHONE_NUMBER_ID[-4:],
            "hospital_number": settings.HOSPITAL_WHATSAPP_NUMBER,
            "token_set": True,
            "approved_templates": ["hospital_welcome_update", "hospital_prescription_ready"],
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
    Default target is the verified hospital test number 8618688243.
    """
    logger.info(f"[WA Test] Sending test message to {req.mobile}")
    success = await send_whatsapp_message(req.mobile, req.message)
    if not success:
        raise HTTPException(status_code=502, detail="WhatsApp delivery failed — check server logs.")
    return {
        "ok": True,
        "to": req.mobile,
        "message": req.message,
        "detail": "Message sent successfully.",
    }


@router.post("/test/document")
async def test_send_document(
    req: TestDocumentRequest,
    _: Staff = Depends(require_any),
):
    """
    Fire a test WhatsApp document (supports public HTTPS URL or local file path).
    Verifies PDF delivery works end-to-end.
    """
    success = await send_whatsapp_document(req.mobile, req.file_url, req.caption)
    if not success:
        raise HTTPException(status_code=502, detail="Document delivery failed — check server logs.")
    return {
        "ok": True,
        "to": req.mobile,
        "file_url": req.file_url,
        "detail": "Document delivered successfully.",
    }


@router.post("/test/template")
async def test_send_template(
    req: TestTemplateRequest,
    _: Staff = Depends(require_any),
):
    """Test sending an approved WhatsApp template."""
    success = await send_whatsapp_template(
        mobile=req.mobile,
        template_name=req.template_name,
        parameters=req.parameters,
        fallback_message=f"Test notification for {req.template_name}",
    )
    if not success:
        raise HTTPException(status_code=502, detail="Template delivery failed — check server logs.")
    return {
        "ok": True,
        "to": req.mobile,
        "template": req.template_name,
        "parameters": req.parameters,
        "detail": "Template delivered successfully.",
    }


@router.post("/resend/bill/{bill_id}")
async def resend_bill_whatsapp(
    bill_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_any),
):
    """Manually re-send bill notification and letterhead PDF to patient's WhatsApp."""
    b_res = await db.execute(select(Bill).where(Bill.bill_id == bill_id))
    bill = b_res.scalar_one_or_none()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    p_res = await db.execute(select(Patient).where(Patient.patient_id == bill.patient_id))
    patient = p_res.scalar_one_or_none()
    if not patient or not patient.mobile_number:
        raise HTTPException(status_code=400, detail="Patient or patient mobile number not found")

    from app.routers.bills import _send_bill_whatsapp
    background_tasks.add_task(_send_bill_whatsapp, patient, bill, bill.pdf_url)

    return {
        "ok": True,
        "message": f"Bill {bill.bill_number} WhatsApp dispatched to {patient.mobile_number}",
        "patient": patient.full_name,
    }


@router.post("/resend/prescription/{prescription_id}")
async def resend_prescription_whatsapp(
    prescription_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_any),
):
    """Manually re-send prescription and PDF to patient's WhatsApp."""
    rx_res = await db.execute(select(Prescription).where(Prescription.prescription_id == prescription_id))
    rx = rx_res.scalar_one_or_none()
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")

    p_res = await db.execute(select(Patient).where(Patient.patient_id == rx.patient_id))
    patient = p_res.scalar_one_or_none()
    if not patient or not patient.mobile_number:
        raise HTTPException(status_code=400, detail="Patient or patient mobile number not found")

    from app.routers.prescriptions import _send_rx_whatsapp
    background_tasks.add_task(_send_rx_whatsapp, patient, rx.pdf_url, None)

    return {
        "ok": True,
        "message": f"Prescription WhatsApp dispatched to {patient.mobile_number}",
        "patient": patient.full_name,
    }


@router.get("/logs")
async def get_whatsapp_logs(
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_any),
):
    """Retrieve recent WhatsApp delivery logs for audit and verification."""
    stmt = select(WhatsAppLog).order_by(desc(WhatsAppLog.sent_at)).limit(limit)
    res = await db.execute(stmt)
    logs = res.scalars().all()
    return logs
