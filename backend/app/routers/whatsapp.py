"""
WhatsApp Router — diagnostics, live testing, manual re-send, and logs.
Allows staff/admin to monitor and test WhatsApp delivery end-to-end.
"""
import logging
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, Request
from fastapi.responses import PlainTextResponse
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
    background_tasks.add_task(
        _send_bill_whatsapp,
        patient.patient_id,
        patient.full_name,
        patient.mobile_number,
        getattr(patient, "language_preference", "english") or "english",
        bill.bill_number,
        bill.net_amount,
        bill.payment_status,
        str(bill.bill_id),
        bill.pdf_url,
    )

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
    background_tasks.add_task(
        _send_rx_whatsapp,
        patient.patient_id,
        patient.full_name,
        patient.mobile_number,
        patient.language_preference,
        rx.pdf_url,
        None,
        str(rx.prescription_id),
    )

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


@router.get("/webhook")
async def verify_meta_webhook(request: Request):
    """Meta webhook verification endpoint."""
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")
    if mode == "subscribe" and token == settings.META_WEBHOOK_VERIFY_TOKEN:
        logger.info("[Meta Webhook] Successfully verified webhook!")
        return PlainTextResponse(content=challenge or "", status_code=200)
    logger.warning(f"[Meta Webhook] Verification mismatch. token={token}")
    raise HTTPException(status_code=403, detail="Verification token mismatch")


@router.post("/webhook")
async def receive_meta_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Handles incoming messages (e.g. patient sends 'HI' or replies on WhatsApp).
    Automatically replies to the patient in their chosen language with their Patient ID,
    confirming that digital bills and prescriptions will be delivered to this chat!
    """
    try:
        data = await request.json()
    except Exception:
        return {"status": "ignored"}

    entries = data.get("entry", [])
    for entry in entries:
        for change in entry.get("changes", []):
            val = change.get("value", {})
            messages = val.get("messages", [])
            for msg in messages:
                sender_raw = msg.get("from")
                if not sender_raw:
                    continue

                # Extract pure 10-digit number
                sender_digits = "".join(filter(str.isdigit, str(sender_raw)))
                clean_10 = sender_digits[-10:] if len(sender_digits) >= 10 else sender_digits

                async def _auto_reply(sender_num: str, ten_digit: str):
                    from app.database import AsyncSessionLocal
                    async with AsyncSessionLocal() as session:
                        stmt = select(Patient).where(
                            Patient.mobile_number.ilike(f"%{ten_digit}%")
                        ).order_by(Patient.created_at.desc()).limit(1)
                        p_res = await session.execute(stmt)
                        patient = p_res.scalar_one_or_none()

                        lang = (patient.language_preference if patient else "english") or "english"
                        name = patient.full_name if patient else "Patient"
                        pid = patient.patient_id if patient else ""

                        if lang.lower() == "marathi":
                            reply_text = (
                                f"🙏 नमस्कार {name}!\n"
                                f"साई हॉस्पिटलमध्ये आपले स्वागत आहे. तुमची व्हॉट्सअॅप सेवा सक्रिय झाली आहे!\n\n"
                                f"📋 Patient ID: {pid}\n"
                                f"आपल्या तपासणीनंतर डॉक्टरांचे प्रिस्क्रिप्शन (औषधांची चिठ्ठी) आणि बिल तुम्हाला येथे थेट PDF स्वरूपात प्राप्त होईल.\n\n"
                                f"🏥 साई मल्टीस्पेशालिटी हॉस्पिटल, सांगली\n"
                                f"📞 हेल्पलाईन: +91 91801 98107"
                            )
                        elif lang.lower() == "kannada":
                            reply_text = (
                                f"🙏 ನಮಸ್ಕಾರ {name}!\n"
                                f"ಸಾಯಿ ಆಸ್ಪತ್ರೆಗೆ ಸುಸ್ವಾಗತ. ನಿಮ್ಮ WhatsApp ಸೇವೆ ಯಶಸ್ವಿಯಾಗಿ ಸಕ್ರಿಯಗೊಂಡಿದೆ!\n\n"
                                f"📋 Patient ID: {pid}\n"
                                f"ವೈದ್ಯರ ತಪಾಸಣೆಯ ನಂತರ ನಿಮ್ಮ ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಮತ್ತು ಬಿಲ್ ಅನ್ನು ಇಲ್ಲಿ ನೇರವಾಗಿ PDF ನಲ್ಲಿ ಕಳುಹಿಸಲಾಗುತ್ತದೆ.\n\n"
                                f"🏥 ಸಾಯಿ ಮಲ್ಟಿಸ್ಪೆಷಾಲಿಟಿ ಆಸ್ಪತ್ರೆ\n"
                                f"📞 ಸಹಾಯವಾಣಿ: +91 91801 98107"
                            )
                        elif lang.lower() == "hindi":
                            reply_text = (
                                f"🙏 नमस्ते {name}!\n"
                                f"साई हॉस्पिटल में आपका स्वागत है। आपकी व्हाट्सएप सेवा सक्रिय हो गई है!\n\n"
                                f"📋 Patient ID: {pid}\n"
                                f"डॉक्टर के परामर्श के बाद आपका पर्चा और बिल यहाँ सीधे PDF में प्राप्त होगा।\n\n"
                                f"🏥 साई मल्टीस्पेशलिटी हॉस्पिटल\n"
                                f"📞 हेल्पलाइन: +91 91801 98107"
                            )
                        else:
                            reply_text = (
                                f"🙏 Hello {name}!\n"
                                f"Welcome to Sai Hospital. Your WhatsApp notifications are now active!\n\n"
                                f"📋 Patient ID: {pid}\n"
                                f"Following your consultation, your doctor's prescription and bill PDFs will be delivered here directly.\n\n"
                                f"🏥 Sai Multispecialty Hospital\n"
                                f"📞 Helpline: +91 91801 98107"
                            )

                        await send_whatsapp_message(sender_num, reply_text, patient_id=pid)

                background_tasks.add_task(_auto_reply, sender_raw, clean_10)

    return {"status": "ok"}

