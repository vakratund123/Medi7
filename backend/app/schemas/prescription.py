from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


class MedicineItem(BaseModel):
    medicine_name: str
    dosage: str
    frequency: str          # e.g. "1-0-1"
    duration_days: int
    instructions: str | None = None


class PrescriptionCreate(BaseModel):
    visit_id: UUID
    patient_id: str
    doctor_id: UUID
    medicines: list[MedicineItem]


class PrescriptionOut(BaseModel):
    prescription_id: UUID
    visit_id: UUID
    patient_id: str
    doctor_id: UUID
    medicines: list
    created_at: datetime
    pdf_url: str | None

    model_config = {"from_attributes": True}
