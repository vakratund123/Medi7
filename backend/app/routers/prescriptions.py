from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pathlib import Path
import uuid

from app.database import get_db
from app.models.prescription import Prescription
from app.models.patient import Patient
from app.models.staff import Staff
from app.models.visit import Visit
from app.schemas.prescription import PrescriptionCreate, PrescriptionOut
from app.middleware.auth_middleware import require_doctor, require_any
from app.services.pdf_service import generate_prescription_pdf
from app.services.whatsapp_service import send_whatsapp_document, send_whatsapp_message, send_whatsapp_template
from app.services.ai_service import generate_whatsapp_message
from app.config import get_settings

settings = get_settings()
router = APIRouter(prefix="/api/prescriptions", tags=["Prescriptions"])


async def _send_rx_whatsapp(patient: Patient, pdf_url: str, follow_up: str | None):
    fu = follow_up or "As needed"
    msg = await generate_whatsapp_message(
        "prescription",
        patient.language_preference,
        {"name": patient.full_name, "follow_up": fu},
    )
    await send_whatsapp_template(
        mobile=patient.mobile_number,
        template_name="hospital_prescription_ready",
        parameters=[patient.full_name, fu],
        fallback_message=msg,
    )
    if pdf_url and pdf_url.startswith("http"):
        await send_whatsapp_document(patient.mobile_number, pdf_url, "Your Prescription")


@router.post("/", response_model=PrescriptionOut)
async def create_prescription(
    data: PrescriptionCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_doctor),
):
    # Fetch related records for PDF generation
    patient_result = await db.execute(select(Patient).where(Patient.patient_id == data.patient_id))
    patient = patient_result.scalar_one_or_none()
    doctor_result = await db.execute(select(Staff).where(Staff.staff_id == data.doctor_id))
    doctor = doctor_result.scalar_one_or_none()
    visit_result = await db.execute(select(Visit).where(Visit.visit_id == data.visit_id))
    visit = visit_result.scalar_one_or_none()

    if not patient or not doctor or not visit:
        raise HTTPException(status_code=404, detail="Patient, doctor, or visit not found")

    # Create prescription record
    rx = Prescription(
        visit_id=data.visit_id,
        patient_id=data.patient_id,
        doctor_id=data.doctor_id,
        medicines=[m.model_dump() for m in data.medicines],
    )
    db.add(rx)
    await db.flush()  # get prescription_id before PDF

    # Generate PDF
    pdf_path = generate_prescription_pdf(
        patient={"full_name": patient.full_name, "patient_id": patient.patient_id,
                 "age": patient.age, "gender": patient.gender, "known_allergies": patient.known_allergies},
        doctor={"full_name": doctor.full_name, "department": doctor.department},
        prescription={"prescription_id": str(rx.prescription_id), "medicines": [m.model_dump() for m in data.medicines]},
        visit={"diagnosis": visit.diagnosis, "follow_up_date": str(visit.follow_up_date) if visit.follow_up_date else None},
    )
    rx.pdf_url = pdf_path
    await db.commit()
    await db.refresh(rx)

    # Send WhatsApp in background
    background_tasks.add_task(_send_rx_whatsapp, patient, pdf_path, str(visit.follow_up_date) if visit.follow_up_date else None)

    return rx


@router.get("/{prescription_id}", response_model=PrescriptionOut)
async def get_prescription(
    prescription_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_any),
):
    result = await db.execute(select(Prescription).where(Prescription.prescription_id == prescription_id))
    rx = result.scalar_one_or_none()
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")
    return rx


@router.get("/{prescription_id}/pdf")
async def download_prescription_pdf(
    prescription_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_any),
):
    result = await db.execute(select(Prescription).where(Prescription.prescription_id == prescription_id))
    rx = result.scalar_one_or_none()
    if not rx or not rx.pdf_url:
        raise HTTPException(status_code=404, detail="PDF not found")

    # For local storage, serve the file
    if rx.pdf_url.startswith("/uploads"):
        file_path = Path(settings.LOCAL_STORAGE_PATH) / rx.pdf_url.lstrip("/uploads/")
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="PDF file not found on disk")
        return FileResponse(str(file_path), media_type="application/pdf", filename=f"prescription_{prescription_id}.pdf")

    return {"pdf_url": rx.pdf_url}
