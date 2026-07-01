"""
Follow-up reminder Celery tasks.
Runs hourly — checks visits with follow_up_date = tomorrow and sends reminders.
"""
import asyncio
from datetime import date, timedelta
from app.celery_worker import celery_app


@celery_app.task
def send_followup_reminders():
    """Send follow-up reminders for tomorrow's appointments."""
    from sqlalchemy import create_engine, select
    from sqlalchemy.orm import Session
    from app.config import get_settings
    from app.models.visit import Visit
    from app.models.patient import Patient
    from app.models.staff import Staff
    from app.services.whatsapp_service import send_whatsapp_message
    from app.services.ai_service import generate_whatsapp_message

    settings = get_settings()
    tomorrow = date.today() + timedelta(days=1)

    # Use sync engine for Celery task
    from sqlalchemy import create_engine
    engine = create_engine(settings.SYNC_DATABASE_URL)
    with Session(engine) as session:
        visits = session.execute(
            select(Visit).where(Visit.follow_up_date == tomorrow)
        ).scalars().all()

        for visit in visits:
            patient = session.get(Patient, visit.patient_id)
            doctor = session.get(Staff, visit.doctor_id)
            if not patient:
                continue
            msg = asyncio.run(generate_whatsapp_message(
                "reminder",
                patient.language_preference,
                {
                    "name": patient.full_name,
                    "doctor": doctor.full_name if doctor else "your doctor",
                    "time": "Morning",
                }
            ))
            asyncio.run(send_whatsapp_message(patient.mobile_number, msg))
