from datetime import date
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.visit import Visit
from app.models.staff import Staff
from app.schemas.visit import VisitCreate, VisitUpdate, VisitOut
from app.middleware.auth_middleware import require_any, require_receptionist, require_doctor

router = APIRouter(prefix="/api/visits", tags=["Visits"])


@router.post("/", response_model=VisitOut)
async def create_visit(
    data: VisitCreate,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_receptionist),
):
    visit = Visit(
        patient_id=data.patient_id,
        doctor_id=data.doctor_id,
        visit_date=date.today(),
        visit_type=data.visit_type,
        chief_complaint=data.chief_complaint,
    )
    db.add(visit)
    await db.commit()
    await db.refresh(visit)
    return visit


@router.get("/today", response_model=list[VisitOut])
async def get_today_queue(
    doctor_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_any),
):
    stmt = select(Visit).where(Visit.visit_date == date.today())
    if doctor_id:
        stmt = stmt.where(Visit.doctor_id == doctor_id)
    stmt = stmt.order_by(Visit.created_at.asc())
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
    _: Staff = Depends(require_doctor),
):
    result = await db.execute(select(Visit).where(Visit.visit_id == visit_id))
    visit = result.scalar_one_or_none()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(visit, field, value)

    await db.commit()
    await db.refresh(visit)
    return visit
