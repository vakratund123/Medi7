"""
WhatsApp Celery tasks — runs in background worker.
"""
import asyncio
from app.celery_worker import celery_app
from app.services.whatsapp_service import send_whatsapp_message, send_whatsapp_document


@celery_app.task(bind=True, max_retries=3)
def task_send_whatsapp(self, mobile: str, message: str):
    try:
        asyncio.run(send_whatsapp_message(mobile, message))
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)


@celery_app.task(bind=True, max_retries=3)
def task_send_whatsapp_document(self, mobile: str, file_url: str, caption: str = ""):
    try:
        asyncio.run(send_whatsapp_document(mobile, file_url, caption))
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)
