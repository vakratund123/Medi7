import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Radiology(Base):
    __tablename__ = "radiology"

    scan_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[str] = mapped_column(String(20), ForeignKey("patients.patient_id"), nullable=False)
    visit_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("visits.visit_id"), nullable=False)
    scan_type: Mapped[str] = mapped_column(String(30), nullable=False)
    ordered_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("staff.staff_id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="ordered")
    file_url: Mapped[str | None]
    radiologist_remarks: Mapped[str | None]
    uploaded_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("staff.staff_id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
