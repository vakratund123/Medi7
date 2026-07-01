from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import bcrypt

from app.database import get_db
from app.models.staff import Staff
from app.schemas.auth import LoginRequest, TokenResponse
from app.middleware.auth_middleware import create_access_token

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Staff).where(Staff.login_email == payload.email))
    staff = result.scalar_one_or_none()

    if not staff or not bcrypt.checkpw(payload.password.encode('utf-8'), staff.password_hash.encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not staff.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive")

    token = create_access_token({"staff_id": str(staff.staff_id), "role": staff.role})
    return TokenResponse(
        access_token=token,
        role=staff.role,
        staff_id=str(staff.staff_id),
        full_name=staff.full_name,
    )
