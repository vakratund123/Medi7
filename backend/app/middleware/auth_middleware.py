from datetime import datetime, timedelta, timezone
from typing import Any
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import get_settings
from app.database import get_db
from app.models.staff import Staff

settings = get_settings()
bearer_scheme = HTTPBearer()


def create_access_token(data: dict[str, Any]) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_staff(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> Staff:
    payload = decode_token(credentials.credentials)
    staff_id = payload.get("staff_id")
    if not staff_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    import uuid
    try:
        staff_uuid = uuid.UUID(staff_id)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid staff ID in token")
        
    result = await db.execute(select(Staff).where(Staff.staff_id == staff_uuid))
    staff = result.scalar_one_or_none()
    if not staff or not staff.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return staff


def require_roles(*roles: str):
    """Dependency factory: enforce RBAC by role."""
    async def _check(current_staff: Staff = Depends(get_current_staff)) -> Staff:
        if current_staff.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {list(roles)}",
            )
        return current_staff
    return _check


# Convenience role checkers
require_receptionist = require_roles("receptionist", "owner")
require_doctor = require_roles("doctor", "owner")
require_lab = require_roles("lab_technician", "owner")
require_radiology = require_roles("radiologist", "owner")
require_pharmacist = require_roles("pharmacist", "owner")
require_owner = require_roles("owner")
require_any = require_roles("receptionist", "doctor", "lab_technician", "radiologist", "pharmacist", "owner")
