from fastapi import APIRouter, Depends
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
