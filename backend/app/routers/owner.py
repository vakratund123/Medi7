from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import date

from app.database import get_db
from app.models.staff import Staff
from app.models.patient import Patient
from app.models.visit import Visit
from app.models.lab import LabReport
from app.models.radiology import Radiology
from app.models.pharmacy import Inventory
from app.models.audit import AuditLog
from app.middleware.auth_middleware import require_owner

router = APIRouter(prefix="/api/owner", tags=["Owner Dashboard"])


@router.get("/stats")
async def get_owner_stats(
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_owner),
):
    today = date.today()

    # Today's OPD count
    opd_result = await db.execute(
        select(func.count(Visit.visit_id)).where(Visit.visit_date == today)
    )
    today_opd = opd_result.scalar() or 0

    # Total patients
    patients_result = await db.execute(select(func.count(Patient.patient_id)))
    total_patients = patients_result.scalar() or 0

    # Pending lab reports
    pending_lab_result = await db.execute(
        select(func.count(Visit.visit_id)).where(Visit.status.in_(["waiting", "in_consultation"]))
    )
    pending_visits = pending_lab_result.scalar() or 0

    # Low stock items
    low_stock_result = await db.execute(
        select(func.count(Inventory.item_id)).where(
            Inventory.quantity_available <= Inventory.reorder_level
        )
    )
    low_stock = low_stock_result.scalar() or 0

    # Doctor-wise patient count today
    doctor_result = await db.execute(
        select(Staff.full_name, func.count(Visit.visit_id).label("count"))
        .join(Visit, Visit.doctor_id == Staff.staff_id)
        .where(Visit.visit_date == today)
        .group_by(Staff.full_name)
    )
    doctor_stats = [{"doctor": row[0], "count": row[1]} for row in doctor_result.all()]

    # Recent audit logs (last 20)
    audit_result = await db.execute(
        select(AuditLog).order_by(AuditLog.created_at.desc()).limit(20)
    )
    audit_logs = [
        {
            "action": log.action,
            "entity": log.entity,
            "entity_id": log.entity_id,
            "created_at": str(log.created_at),
        }
        for log in audit_result.scalars().all()
    ]

    # Staff count by role
    staff_result = await db.execute(
        select(Staff.role, func.count(Staff.staff_id).label("count"))
        .where(Staff.is_active == True)
        .group_by(Staff.role)
    )
    staff_by_role = {row[0]: row[1] for row in staff_result.all()}

    return {
        "today_opd": today_opd,
        "total_patients": total_patients,
        "pending_visits": pending_visits,
        "low_stock_alerts": low_stock,
        "doctor_stats": doctor_stats,
        "staff_by_role": staff_by_role,
        "recent_activity": audit_logs,
    }


@router.get("/referrals")
async def get_doctor_referrals(
    year: int | None = Query(None, description="Filter by year, e.g. 2026"),
    month: int | None = Query(None, ge=1, le=12, description="Filter by month 1-12"),
    referring_doctor: str | None = Query(None, description="Filter by referring doctor name"),
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_owner),
):
    import calendar
    from sqlalchemy import case

    effective_ref = func.coalesce(Visit.referred_by, Patient.referred_by)

    stmt = (
        select(
            Visit.visit_id,
            Visit.visit_date,
            Patient.patient_id,
            Patient.full_name.label("patient_name"),
            Patient.mobile_number,
            Patient.age,
            Patient.gender,
            effective_ref.label("referred_by"),
            Staff.full_name.label("doctor_name"),
            Visit.visit_type,
            Visit.diagnosis,
            Visit.chief_complaint,
        )
        .join(Patient, Visit.patient_id == Patient.patient_id)
        .outerjoin(Staff, Visit.doctor_id == Staff.staff_id)
        .where(effective_ref.isnot(None), effective_ref != "")
    )

    if year and month:
        start_date = date(year, month, 1)
        _, last_day = calendar.monthrange(year, month)
        end_date = date(year, month, last_day)
        stmt = stmt.where(Visit.visit_date >= start_date, Visit.visit_date <= end_date)
    elif year:
        start_date = date(year, 1, 1)
        end_date = date(year, 12, 31)
        stmt = stmt.where(Visit.visit_date >= start_date, Visit.visit_date <= end_date)

    if referring_doctor:
        stmt = stmt.where(effective_ref.ilike(f"%{referring_doctor}%"))

    stmt = stmt.order_by(Visit.visit_date.desc(), Visit.created_at.desc())
    result = await db.execute(stmt)
    rows = result.all()

    referrals = []
    doctor_counts: dict[str, int] = {}

    for row in rows:
        ref_doc = row.referred_by.strip() if row.referred_by else "Unassigned"
        doctor_counts[ref_doc] = doctor_counts.get(ref_doc, 0) + 1

        referrals.append({
            "visit_id": str(row.visit_id),
            "date": str(row.visit_date),
            "patient_id": row.patient_id,
            "patient_name": row.patient_name,
            "mobile_number": row.mobile_number,
            "age": row.age,
            "gender": row.gender,
            "referred_by": ref_doc,
            "doctor_name": row.doctor_name or "Not assigned",
            "visit_type": row.visit_type,
            "diagnosis": row.diagnosis or "—",
            "chief_complaint": row.chief_complaint or "—",
        })

    sorted_counts = sorted(doctor_counts.items(), key=lambda x: x[1], reverse=True)

    return {
        "total_referrals": len(referrals),
        "doctor_counts": [{"doctor": doc, "count": cnt} for doc, cnt in sorted_counts],
        "referrals": referrals,
    }


@router.get("/referrals/export")
async def export_doctor_referrals_csv(
    year: int | None = Query(None),
    month: int | None = Query(None, ge=1, le=12),
    referring_doctor: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_owner),
):
    import calendar
    import csv
    import io
    from fastapi.responses import Response

    effective_ref = func.coalesce(Visit.referred_by, Patient.referred_by)

    stmt = (
        select(
            Visit.visit_id,
            Visit.visit_date,
            Patient.patient_id,
            Patient.full_name.label("patient_name"),
            Patient.mobile_number,
            Patient.age,
            Patient.gender,
            effective_ref.label("referred_by"),
            Staff.full_name.label("doctor_name"),
            Visit.visit_type,
            Visit.diagnosis,
            Visit.chief_complaint,
        )
        .join(Patient, Visit.patient_id == Patient.patient_id)
        .outerjoin(Staff, Visit.doctor_id == Staff.staff_id)
        .where(effective_ref.isnot(None), effective_ref != "")
    )

    if year and month:
        start_date = date(year, month, 1)
        _, last_day = calendar.monthrange(year, month)
        end_date = date(year, month, last_day)
        stmt = stmt.where(Visit.visit_date >= start_date, Visit.visit_date <= end_date)
        file_suffix = f"{year}_{str(month).zfill(2)}"
    elif year:
        start_date = date(year, 1, 1)
        end_date = date(year, 12, 31)
        stmt = stmt.where(Visit.visit_date >= start_date, Visit.visit_date <= end_date)
        file_suffix = f"{year}"
    else:
        file_suffix = "all"

    if referring_doctor:
        stmt = stmt.where(effective_ref.ilike(f"%{referring_doctor}%"))

    stmt = stmt.order_by(Visit.visit_date.desc(), Visit.created_at.desc())
    result = await db.execute(stmt)
    rows = result.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Visit Date",
        "Patient ID",
        "Patient Name",
        "Mobile Number",
        "Age",
        "Gender",
        "Referred By Doctor / Source",
        "Attending Doctor (Sai Hospital)",
        "Visit Type",
        "Chief Complaint",
        "Diagnosis",
    ])

    for row in rows:
        writer.writerow([
            str(row.visit_date),
            row.patient_id,
            row.patient_name,
            row.mobile_number,
            row.age or "",
            (row.gender or "").capitalize(),
            row.referred_by or "Direct Walk-in",
            row.doctor_name or "Not assigned",
            row.visit_type,
            row.chief_complaint or "",
            row.diagnosis or "",
        ])

    csv_content = output.getvalue()
    filename = f"sai_hospital_referrals_{file_suffix}.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )
