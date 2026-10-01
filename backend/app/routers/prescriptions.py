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
from app.middleware.auth_middleware import require_doctor, require_any, require_roles
from app.services.pdf_service import generate_prescription_pdf
from app.services.whatsapp_service import send_whatsapp_document, send_whatsapp_message, send_whatsapp_template
from app.services.ai_service import generate_whatsapp_message
from app.config import get_settings

settings = get_settings()
router = APIRouter(prefix="/api/prescriptions", tags=["Prescriptions"])


async def _send_rx_whatsapp(
    patient_id: str,
    full_name: str,
    mobile_number: str,
    lang_pref: str,
    pdf_url: str,
    follow_up: str | None,
    rx_id: str,
):
    try:
        fu = follow_up or "As needed"
        base_url = (settings.PUBLIC_URL or "http://localhost:8000").rstrip("/")
        download_url = f"{base_url}/api/prescriptions/public/{rx_id}/pdf"
        if pdf_url and pdf_url.startswith("http"):
            download_url = pdf_url

        msg = await generate_whatsapp_message(
            "prescription",
            lang_pref,
            {"name": full_name, "follow_up": fu, "download_url": download_url},
        )

        await send_whatsapp_template(
            mobile=mobile_number,
            template_name="hospital_prescription_ready",
            parameters=[full_name, fu],
            fallback_message=msg,
            patient_id=patient_id,
            preferred_language=lang_pref,
        )
        if pdf_url:
            await send_whatsapp_document(
                mobile=mobile_number,
                file_path_or_url=pdf_url,
                caption=f"Prescription - {full_name}",
                patient_id=patient_id,
            )
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"[WhatsApp] Prescription notification failed: {e}")


@router.post("/", response_model=PrescriptionOut)
async def create_prescription(
    data: PrescriptionCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_roles("doctor", "receptionist", "reception", "cashier", "owner", "manager")),
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
    follow_up_str = str(visit.follow_up_date) if visit.follow_up_date else None
    background_tasks.add_task(
        _send_rx_whatsapp,
        patient.patient_id,
        patient.full_name,
        patient.mobile_number,
        patient.language_preference,
        pdf_path,
        follow_up_str,
        str(rx.prescription_id),
    )

    return rx


@router.get("/public/{prescription_id}/pdf")
async def download_prescription_pdf_public(
    prescription_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Public PDF download for patients via WhatsApp link without requiring staff login."""
    result = await db.execute(select(Prescription).where(Prescription.prescription_id == prescription_id))
    rx = result.scalar_one_or_none()
    if not rx or not rx.pdf_url:
        raise HTTPException(status_code=404, detail="Prescription PDF not found")

    from app.services.whatsapp_service import _resolve_local_file
    local_file = _resolve_local_file(rx.pdf_url)
    if local_file and local_file.exists():
        return FileResponse(str(local_file), media_type="application/pdf", filename=f"prescription_{prescription_id}.pdf")

    if rx.pdf_url.startswith("http"):
        from fastapi.responses import RedirectResponse
        return RedirectResponse(rx.pdf_url)

    raise HTTPException(status_code=404, detail="PDF file not found on disk")


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

    from app.services.whatsapp_service import _resolve_local_file
    local_file = _resolve_local_file(rx.pdf_url)
    if local_file and local_file.exists():
        return FileResponse(str(local_file), media_type="application/pdf", filename=f"prescription_{prescription_id}.pdf")

    if rx.pdf_url.startswith("http"):
        from fastapi.responses import RedirectResponse
        return RedirectResponse(rx.pdf_url)

    return {"pdf_url": rx.pdf_url}


@router.get("/visit/{visit_id}", response_model=PrescriptionOut)
async def get_prescription_by_visit(
    visit_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_any),
):
    """Retrieve the prescription associated with a specific visit."""
    result = await db.execute(
        select(Prescription)
        .where(Prescription.visit_id == visit_id)
        .order_by(Prescription.created_at.desc())
        .limit(1)
    )
    rx = result.scalar_one_or_none()
    if not rx:
        raise HTTPException(status_code=404, detail="No prescription found for this visit")
    return rx


@router.get("/patient/{patient_id}", response_model=list[PrescriptionOut])
async def get_prescriptions_by_patient(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_any),
):
    """Retrieve all prescriptions for a patient (supports SEM and SAI prefixes)."""
    from app.routers.patients import _normalize_patient_id
    normalized = _normalize_patient_id(patient_id)
    result = await db.execute(
        select(Prescription)
        .where(Prescription.patient_id.ilike(normalized))
        .order_by(Prescription.created_at.desc())
    )
    return result.scalars().all()
