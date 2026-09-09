import uuid
from datetime import date, datetime
from sqlalchemy import String, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Visit(Base):
    __tablename__ = "visits"

    visit_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[str] = mapped_column(String(20), ForeignKey("patients.patient_id"), nullable=False)
    doctor_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("staff.staff_id"), nullable=True)
    visit_date: Mapped[date] = mapped_column(Date, nullable=False)
    visit_type: Mapped[str] = mapped_column(String(20), nullable=False, default="opd")
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="waiting")
    chief_complaint: Mapped[str | None]
    diagnosis: Mapped[str | None]
    notes: Mapped[str | None]
    referred_by: Mapped[str | None] = mapped_column(String(200), nullable=True)
    follow_up_date: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
