import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, func, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Prescription(Base):
    __tablename__ = "prescriptions"

    prescription_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    visit_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("visits.visit_id"), nullable=False)
    patient_id: Mapped[str] = mapped_column(String(20), ForeignKey("patients.patient_id"), nullable=False)
    doctor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("staff.staff_id"), nullable=False)
    medicines: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    pdf_url: Mapped[str | None]
