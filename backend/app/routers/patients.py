from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text

from app.database import get_db
from app.models.patient import Patient
from app.models.visit import Visit
from app.models.prescription import Prescription
from app.models.lab import LabOrder, LabReport
from app.models.radiology import Radiology
from app.schemas.patient import PatientCreate, PatientOut
from app.middleware.auth_middleware import require_any, require_doctor, get_current_staff, require_receptionist
from app.services.audit_service import log_action
from app.services.whatsapp_service import send_whatsapp_message
from app.services.ai_service import generate_whatsapp_message, generate_patient_summary
from app.models.staff import Staff

router = APIRouter(prefix="/api/patients", tags=["Patients"])


async def _generate_patient_id(db: AsyncSession) -> str:
    try:
        result = await db.execute(text("SELECT generate_patient_id()"))
        val = result.scalar()
        if val:
            return val
    except Exception:
        await db.rollback()
    
    # SQLite / general Python fallback
    import datetime
    year_str = str(datetime.date.today().year)
    stmt = select(Patient.patient_id).where(Patient.patient_id.like(f"SAI-{year_str}-%")).order_by(Patient.patient_id.desc()).limit(1)
    result = await db.execute(stmt)
    last_id = result.scalar_one_or_none()
    
    if last_id:
        try:
            parts = last_id.split("-")
            seq = int(parts[2]) + 1
        except Exception:
            seq = 1
    else:
        seq = 1
        
    return f"SAI-{year_str}-{str(seq).zfill(5)}"


@router.post("/", response_model=PatientOut)
async def register_patient(
    data: PatientCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_staff: Staff = Depends(require_receptionist),
):
    staff_id = current_staff.staff_id  # Capture immediately before any potential db rollback in UDF generation
    patient_id = await _generate_patient_id(db)
    patient = Patient(patient_id=patient_id, **data.model_dump())
    db.add(patient)
    await db.commit()
    await db.refresh(patient)

    # Audit log
    await log_action(db, staff_id, "register_patient", "patient", patient_id, ip_address=request.client.host)

    # Welcome WhatsApp (fire and forget)
    msg = await generate_whatsapp_message(
        "welcome",
        data.language_preference,
        {"name": data.full_name, "patient_id": patient_id},
    )
    await send_whatsapp_message(data.mobile_number, msg)

    return patient


@router.get("/", response_model=list[PatientOut])
async def search_patients(
    q: str | None = Query(None, description="Name, mobile, or patient ID"),
    limit: int = Query(20, le=100),
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_any),
):
    stmt = select(Patient)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            Patient.full_name.ilike(like)
            | Patient.mobile_number.ilike(like)
            | Patient.patient_id.ilike(like)
        )
    stmt = stmt.order_by(Patient.created_at.desc()).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{patient_id}", response_model=PatientOut)
async def get_patient(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_any),
):
    result = await db.execute(select(Patient).where(Patient.patient_id == patient_id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.get("/{patient_id}/history")
async def get_patient_history(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_doctor),
):
    # Patient
    result = await db.execute(select(Patient).where(Patient.patient_id == patient_id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Visits
    visits_result = await db.execute(
        select(Visit).where(Visit.patient_id == patient_id).order_by(Visit.visit_date.desc())
    )
    visits = visits_result.scalars().all()

    # Prescriptions
    px_result = await db.execute(
        select(Prescription).where(Prescription.patient_id == patient_id).order_by(Prescription.created_at.desc())
    )
    prescriptions = px_result.scalars().all()

    # Lab orders
    lab_result = await db.execute(
        select(LabOrder).where(LabOrder.patient_id == patient_id).order_by(LabOrder.created_at.desc())
    )
    lab_orders = lab_result.scalars().all()

    # Lab reports
    lr_result = await db.execute(
        select(LabReport).where(LabReport.patient_id == patient_id).order_by(LabReport.created_at.desc())
    )
    lab_reports = lr_result.scalars().all()

    # Radiology
    rad_result = await db.execute(
        select(Radiology).where(Radiology.patient_id == patient_id).order_by(Radiology.created_at.desc())
    )
    scans = rad_result.scalars().all()

    history = {
        "patient": {
            "patient_id": patient.patient_id,
            "full_name": patient.full_name,
            "age": patient.age,
            "gender": patient.gender,
            "blood_group": patient.blood_group,
            "known_allergies": patient.known_allergies,
            "chronic_conditions": patient.chronic_conditions,
        },
        "visits": [{"visit_id": str(v.visit_id), "visit_date": str(v.visit_date), "diagnosis": v.diagnosis, "notes": v.notes} for v in visits],
        "prescriptions": [{"prescription_id": str(p.prescription_id), "medicines": p.medicines, "created_at": str(p.created_at)} for p in prescriptions],
        "lab_orders": [{"order_id": str(o.order_id), "tests": o.tests, "status": o.status} for o in lab_orders],
        "lab_reports": [{"report_id": str(r.report_id), "ai_summary": r.ai_summary, "abnormal_flags": r.abnormal_flags} for r in lab_reports],
        "scans": [{"scan_id": str(s.scan_id), "scan_type": s.scan_type, "radiologist_remarks": s.radiologist_remarks} for s in scans],
    }

    ai_summary = await generate_patient_summary(history)
    history["ai_summary"] = ai_summary
    return history
