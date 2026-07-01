from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import bcrypt
import uuid

from app.database import get_db
from app.models.staff import Staff
from app.schemas.staff import StaffCreate, StaffOut, StaffUpdate
from app.middleware.auth_middleware import require_owner, require_any

router = APIRouter(prefix="/api/staff", tags=["Staff"])


@router.post("/", response_model=StaffOut)
async def create_staff(
    data: StaffCreate,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_owner),
):
    existing = await db.execute(select(Staff).where(Staff.login_email == data.login_email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    staff = Staff(
        full_name=data.full_name,
        mobile=data.mobile,
        role=data.role,
        department=data.department,
        login_email=data.login_email,
        password_hash=bcrypt.hashpw(data.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8"),
        is_active=data.is_active,
    )
    db.add(staff)
    await db.commit()
    await db.refresh(staff)
    return staff


@router.get("/", response_model=list[StaffOut])
async def list_staff(
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_any),
):
    result = await db.execute(select(Staff).order_by(Staff.created_at.desc()))
    return result.scalars().all()


@router.put("/{staff_id}", response_model=StaffOut)
async def update_staff(
    staff_id: uuid.UUID,
    data: StaffUpdate,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_owner),
):
    result = await db.execute(select(Staff).where(Staff.staff_id == staff_id))
    staff = result.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(staff, field, value)
    await db.commit()
    await db.refresh(staff)
    return staff
