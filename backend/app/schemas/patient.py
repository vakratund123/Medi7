from datetime import date, datetime
from pydantic import BaseModel


class PatientBase(BaseModel):
    full_name: str
    mobile_number: str
    date_of_birth: date | None = None
    age: int | None = None
    gender: str
    address: str | None = None
    blood_group: str | None = None
    known_allergies: str | None = None
    chronic_conditions: str | None = None
    language_preference: str = "english"
    referred_by: str | None = None


class PatientCreate(PatientBase):
    pass


class PatientOut(PatientBase):
    patient_id: str
    created_at: datetime

    model_config = {"from_attributes": True}


class PatientSearch(BaseModel):
    query: str  # name, mobile, or patient_id
