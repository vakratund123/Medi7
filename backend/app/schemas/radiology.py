from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


class RadiologyOrderCreate(BaseModel):
    patient_id: str
    visit_id: UUID
    scan_type: str
    ordered_by: UUID


class RadiologyUpload(BaseModel):
    scan_id: UUID
    file_url: str
    radiologist_remarks: str | None = None
    uploaded_by: UUID


class RadiologyOut(BaseModel):
    scan_id: UUID
    patient_id: str
    visit_id: UUID
    scan_type: str
    ordered_by: UUID
    status: str
    file_url: str | None
    radiologist_remarks: str | None
    uploaded_by: UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}
