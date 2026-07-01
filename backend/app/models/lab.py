import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, func, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class LabOrder(Base):
    __tablename__ = "lab_orders"

    order_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    visit_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("visits.visit_id"), nullable=False)
    patient_id: Mapped[str] = mapped_column(String(20), ForeignKey("patients.patient_id"), nullable=False)
    ordered_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("staff.staff_id"), nullable=False)
    tests: Mapped[list] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(30), default="ordered")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class LabReport(Base):
    __tablename__ = "lab_reports"

    report_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("lab_orders.order_id"), nullable=False)
    patient_id: Mapped[str] = mapped_column(String(20), ForeignKey("patients.patient_id"), nullable=False)
    report_type: Mapped[str] = mapped_column(String(50), nullable=False)
    uploaded_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("staff.staff_id"), nullable=False)
    file_url: Mapped[str] = mapped_column(nullable=False)
    ai_summary: Mapped[str | None]
    abnormal_flags: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
