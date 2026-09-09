import uuid
from datetime import datetime
from sqlalchemy import String, Float, DateTime, ForeignKey, func, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Bill(Base):
    __tablename__ = "bills"

    bill_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    bill_number: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    visit_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("visits.visit_id"), nullable=False, index=True)
    patient_id: Mapped[str] = mapped_column(String(20), ForeignKey("patients.patient_id"), nullable=False, index=True)
    doctor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("staff.staff_id"), nullable=False)
    
    # List of billing items: [{"name": "Consultation", "category": "Consultation", "quantity": 1, "unit_price": 500, "total": 500}]
    items: Mapped[list] = mapped_column(JSON, default=list)
    
    subtotal: Mapped[float] = mapped_column(Float, default=0.0)
    discount: Mapped[float] = mapped_column(Float, default=0.0)
    tax: Mapped[float] = mapped_column(Float, default=0.0)
    net_amount: Mapped[float] = mapped_column(Float, default=0.0)
    
    payment_status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, paid, partially_paid
    payment_mode: Mapped[str | None] = mapped_column(String(30), nullable=True)  # cash, upi, card, insurance
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    pdf_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
