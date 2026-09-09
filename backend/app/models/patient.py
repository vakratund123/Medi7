from datetime import date, datetime
from sqlalchemy import String, Date, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Patient(Base):
    __tablename__ = "patients"

    patient_id: Mapped[str] = mapped_column(String(20), primary_key=True)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    mobile_number: Mapped[str] = mapped_column(String(15), nullable=False)
    date_of_birth: Mapped[date | None] = mapped_column(Date)
    age: Mapped[int | None]
    gender: Mapped[str] = mapped_column(String(10), nullable=False)
    address: Mapped[str | None]
    blood_group: Mapped[str | None] = mapped_column(String(5))
    known_allergies: Mapped[str | None]
    chronic_conditions: Mapped[str | None]
    language_preference: Mapped[str] = mapped_column(String(20), default="english")
    referred_by: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
