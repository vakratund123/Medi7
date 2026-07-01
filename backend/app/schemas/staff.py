from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, EmailStr


class StaffBase(BaseModel):
    full_name: str
    mobile: str
    role: str
    department: str | None = None
    login_email: EmailStr
    is_active: bool = True


class StaffCreate(StaffBase):
    password: str


class StaffOut(StaffBase):
    staff_id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class StaffUpdate(BaseModel):
    full_name: str | None = None
    department: str | None = None
    is_active: bool | None = None
