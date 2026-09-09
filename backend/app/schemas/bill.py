from datetime import datetime
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
