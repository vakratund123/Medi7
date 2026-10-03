from datetime import date
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func

from app.database import get_db
from app.models.visit import Visit
from app.models.staff import Staff
from app.schemas.visit import VisitCreate, VisitUpdate, VisitOut
from app.middleware.auth_middleware import require_any, require_receptionist, require_doctor, require_roles

router = APIRouter(prefix="/api/visits", tags=["Visits"])


@router.post("/", response_model=VisitOut)
async def create_visit(
    data: VisitCreate,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_receptionist),
):
    referred_by = data.referred_by
    if not referred_by:
        from app.models.patient import Patient
        p_res = await db.execute(select(Patient.referred_by).where(Patient.patient_id == data.patient_id))
        referred_by = p_res.scalar_one_or_none()

    visit = Visit(
        patient_id=data.patient_id,
        doctor_id=data.doctor_id,
        visit_date=date.today(),
        visit_type=data.visit_type,
        chief_complaint=data.chief_complaint,
        referred_by=referred_by,
    )
    db.add(visit)
    await db.commit()
    await db.refresh(visit)
    return visit


@router.get("/today", response_model=list[VisitOut])
async def get_today_queue(
    doctor_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_staff: Staff = Depends(require_any),
):
    """Returns today's OPD visits PLUS all currently admitted IPD patients.
    If a Doctor role calls this, it strictly filters only their own patients.
    Dr. Vinay's patients are kept exclusively for receptionist and never shown to Dr. Rahul."""
    from sqlalchemy import or_
    stmt = select(Visit).where(
        or_(
            Visit.visit_date == date.today(),
            Visit.status == "admitted",
        )
    )
    if current_staff.role == "doctor":
        # Strict isolation: doctor only sees their own patients
        stmt = stmt.where(Visit.doctor_id == current_staff.staff_id)
    elif doctor_id:
        stmt = stmt.where(Visit.doctor_id == doctor_id)

    stmt = stmt.order_by(Visit.created_at.asc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/admitted", response_model=list[VisitOut])
async def get_admitted_patients(
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_any),
):
    """Returns all currently admitted Inpatients (IPD) across hospital."""
    stmt = select(Visit).where(Visit.status == "admitted").order_by(Visit.created_at.asc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{visit_id}", response_model=VisitOut)
async def get_visit(
    visit_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_any),
):
    result = await db.execute(select(Visit).where(Visit.visit_id == visit_id))
    visit = result.scalar_one_or_none()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    return visit


@router.put("/{visit_id}", response_model=VisitOut)
async def update_visit(
    visit_id: uuid.UUID,
    data: VisitUpdate,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_roles("doctor", "receptionist", "reception", "cashier", "owner", "manager")),
):
    result = await db.execute(select(Visit).where(Visit.visit_id == visit_id))
    visit = result.scalar_one_or_none()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(visit, field, value)

    if data.status in ["completed", "in_consultation", "admitted"]:
        visit.visit_date = date.today()

    await db.commit()
    await db.refresh(visit)
    return visit


@router.delete("/{visit_id}")
async def delete_visit(
    visit_id: uuid.UUID,
    delete_patient: bool = Query(False, description="Also delete patient if no other visits/records exist"),
    reason: str = Query("Duplicate entry", description="Reason for deletion"),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
    current_staff: Staff = Depends(require_roles("receptionist", "reception", "owner", "manager", "admin", "cashier", "doctor")),
):
    """Allows receptionist or authorized staff to safely delete accidental double entries or cancelled visits."""
    result = await db.execute(select(Visit).where(Visit.visit_id == visit_id))
    visit = result.scalar_one_or_none()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    from app.models.bill import Bill
    from app.models.prescription import Prescription
    from app.models.lab import LabOrder, LabReport
    from app.models.radiology import Radiology
    from app.models.patient import Patient
    from app.models.audit import WhatsAppLog
    from app.services.audit_service import log_action

    # 1. Check for paid bills (prevent financial corruption)
    bills_res = await db.execute(select(Bill).where(Bill.visit_id == visit_id))
    bills = bills_res.scalars().all()
    paid_bills = [b for b in bills if b.payment_status == "paid"]
    if paid_bills:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete entry: A paid bill ({paid_bills[0].bill_number}) exists for this visit. Please refund or consult management."
        )

    # 2. Check for completed lab reports unless supervisor
    lab_res = await db.execute(select(LabOrder).where(LabOrder.visit_id == visit_id))
    lab_orders = lab_res.scalars().all()
    lab_order_ids = [lo.order_id for lo in lab_orders]
    if lab_order_ids:
        rep_res = await db.execute(select(LabReport).where(LabReport.order_id.in_(lab_order_ids)))
        lab_reports = rep_res.scalars().all()
        if lab_reports and current_staff.role not in ("owner", "manager", "admin"):
            raise HTTPException(
                status_code=400,
                detail="Cannot delete entry: Lab reports have already been completed for this visit."
            )
        for rep in lab_reports:
            await db.delete(rep)
        for lo in lab_orders:
            await db.delete(lo)

    # 3. Clean up radiology orders for this visit
    rad_res = await db.execute(select(Radiology).where(Radiology.visit_id == visit_id))
    for scan in rad_res.scalars().all():
        await db.delete(scan)

    # 4. Clean up prescriptions for this visit
    px_res = await db.execute(select(Prescription).where(Prescription.visit_id == visit_id))
    for px in px_res.scalars().all():
        await db.delete(px)

    # 5. Clean up unpaid bills for this visit
    for b in bills:
        await db.delete(b)

    patient_id = visit.patient_id
    patient_deleted = False

    # 6. Delete the visit
    await db.delete(visit)
    await db.flush()

    # 7. If delete_patient requested (e.g. receptionist registered duplicate patient record):
    if delete_patient:
        other_visits_res = await db.execute(select(func.count(Visit.visit_id)).where(Visit.patient_id == patient_id))
        other_visits_count = other_visits_res.scalar() or 0
        if other_visits_count == 0:
            # Check for any remaining paid bills across any records
            p_paid_bills = await db.execute(select(Bill).where(Bill.patient_id == patient_id, Bill.payment_status == "paid"))
            if not p_paid_bills.scalars().first():
                # Clean up any remaining records linked to patient
                await db.execute(delete(WhatsAppLog).where(WhatsAppLog.patient_id == patient_id))
                await db.execute(delete(LabReport).where(LabReport.patient_id == patient_id))
                await db.execute(delete(LabOrder).where(LabOrder.patient_id == patient_id))
                await db.execute(delete(Radiology).where(Radiology.patient_id == patient_id))
                await db.execute(delete(Prescription).where(Prescription.patient_id == patient_id))
                await db.execute(delete(Bill).where(Bill.patient_id == patient_id))

                p_res = await db.execute(select(Patient).where(Patient.patient_id == patient_id))
                patient_obj = p_res.scalar_one_or_none()
                if patient_obj:
                    await db.delete(patient_obj)
                    patient_deleted = True

    await db.commit()

    # 8. Audit log
    client_ip = request.client.host if request and request.client else None
    await log_action(
        db,
        current_staff.staff_id,
        "delete_visit",
        "visit",
        str(visit_id),
        details={
            "patient_id": patient_id,
            "reason": reason,
            "patient_deleted": patient_deleted,
        },
        ip_address=client_ip,
    )

    msg = f"Queue entry deleted successfully{' and duplicate patient record removed' if patient_deleted else ''}."
    return {
        "status": "success",
        "message": msg,
        "visit_id": str(visit_id),
        "patient_id": patient_id,
        "patient_deleted": patient_deleted,
    }

