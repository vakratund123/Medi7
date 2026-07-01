from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


class LabOrderCreate(BaseModel):
    visit_id: UUID
    patient_id: str
    ordered_by: UUID
    tests: list[str]


class LabOrderOut(BaseModel):
    order_id: UUID
    visit_id: UUID
    patient_id: str
    ordered_by: UUID
    tests: list
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class LabReportCreate(BaseModel):
    order_id: UUID
    patient_id: str
    report_type: str
    uploaded_by: UUID
    file_url: str


class LabReportOut(BaseModel):
    report_id: UUID
    order_id: UUID
    patient_id: str
    report_type: str
    uploaded_by: UUID
    file_url: str
    ai_summary: str | None
    abnormal_flags: dict
    created_at: datetime

    model_config = {"from_attributes": True}
