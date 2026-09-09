from datetime import date, datetime
from uuid import UUID
from pydantic import BaseModel


class VisitCreate(BaseModel):
    patient_id: str
    doctor_id: UUID | None = None
    visit_type: str = "opd"
    chief_complaint: str | None = None
    referred_by: str | None = None


class VisitUpdate(BaseModel):
    status: str | None = None
    chief_complaint: str | None = None
    diagnosis: str | None = None
    notes: str | None = None
    referred_by: str | None = None
    follow_up_date: date | None = None


class VisitOut(BaseModel):
    visit_id: UUID
    patient_id: str
    doctor_id: UUID | None
    visit_date: date
    visit_type: str
    status: str
    chief_complaint: str | None
    diagnosis: str | None
    notes: str | None
    referred_by: str | None = None
    follow_up_date: date | None
    created_at: datetime

    model_config = {"from_attributes": True}
