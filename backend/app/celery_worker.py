from celery import Celery
from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "medi7",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks.whatsapp_tasks", "app.tasks.reminder_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    beat_schedule={
        "send-followup-reminders": {
            "task": "app.tasks.reminder_tasks.send_followup_reminders",
            "schedule": 3600.0,  # every hour
        },
    },
)
