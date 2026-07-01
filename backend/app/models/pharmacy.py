import uuid
from datetime import datetime, date
from sqlalchemy import String, DateTime, Date, Integer, ForeignKey, func, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class PharmacyDispensing(Base):
    __tablename__ = "pharmacy_dispensing"

    dispense_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[str] = mapped_column(String(20), ForeignKey("patients.patient_id"), nullable=False)
    prescription_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("prescriptions.prescription_id"), nullable=False)
    medicines_dispensed: Mapped[list] = mapped_column(JSON, default=list)
    dispensed_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("staff.staff_id"), nullable=False)
    dispensed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Inventory(Base):
    __tablename__ = "inventory"

    item_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    medicine_name: Mapped[str] = mapped_column(String(200), nullable=False)
    generic_name: Mapped[str | None] = mapped_column(String(200))
    quantity_available: Mapped[int] = mapped_column(Integer, default=0)
    unit: Mapped[str] = mapped_column(String(20), default="tablets")
    reorder_level: Mapped[int] = mapped_column(Integer, default=50)
    expiry_date: Mapped[date | None] = mapped_column(Date)
    last_updated: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
