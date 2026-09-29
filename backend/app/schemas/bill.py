from datetime import datetime, date
from uuid import UUID
from pydantic import BaseModel, Field


class BillItem(BaseModel):
    name: str
    category: str = "General"  # Consultation, Procedure, Nursing, Pharmacy, Lab, Radiology, Bed, Other
    quantity: int = 1
    unit_price: float = 0.0
    total: float = 0.0


class BillCreate(BaseModel):
    visit_id: UUID
    patient_id: str
    doctor_id: UUID
    items: list[BillItem]
    subtotal: float
    discount: float = 0.0
    tax: float = 0.0
    net_amount: float
    payment_status: str = "pending"  # pending, paid, partially_paid
    payment_mode: str | None = None  # cash, upi, card, insurance
    notes: str | None = None


class BillPaymentUpdate(BaseModel):
    payment_status: str  # paid, partially_paid, pending
    payment_mode: str  # cash, upi, card, insurance
    notes: str | None = None


class BillOut(BaseModel):
    bill_id: UUID
    bill_number: str
    visit_id: UUID
    patient_id: str
    doctor_id: UUID
    items: list
    subtotal: float
    discount: float
    tax: float
    net_amount: float
    payment_status: str
    payment_mode: str | None
    notes: str | None
    pdf_url: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BillDetailOut(BillOut):
    patient_name: str | None = None
    patient_mobile: str | None = None
    patient_age: int | None = None
    patient_gender: str | None = None
    doctor_name: str | None = None
    doctor_department: str | None = None
    visit_type: str | None = None
    visit_date: date | None = None
    chief_complaint: str | None = None
    diagnosis: str | None = None


class BillStatsOut(BaseModel):
    total_pending_count: int
    total_pending_amount: float
    total_collected_today: float
    today_cash: float
    today_upi: float
    today_card: float
    total_bills_count: int

