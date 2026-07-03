from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
import logging

from app.database import get_db, AsyncSessionLocal
from app.models.lab import LabOrder, LabReport
from app.models.patient import Patient
from app.models.staff import Staff
from app.schemas.lab import LabOrderCreate, LabOrderOut, LabReportOut
from app.middleware.auth_middleware import require_doctor, require_lab, require_any
from app.services.storage_service import save_file
from app.services.ai_service import summarize_lab_report
from app.services.whatsapp_service import send_whatsapp_message, send_whatsapp_document
from app.services.ai_service import generate_whatsapp_message

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/lab", tags=["Lab"])


@router.post("/orders/", response_model=LabOrderOut)
async def create_lab_order(
    data: LabOrderCreate,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_doctor),
):
    order = LabOrder(**data.model_dump())
    db.add(order)
    await db.commit()
    await db.refresh(order)
    return order


@router.get("/orders/pending", response_model=list[LabOrderOut])
async def get_pending_orders(
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_lab),
):
    result = await db.execute(
        select(LabOrder)
        .where(LabOrder.status.in_(["ordered", "sample_collected"]))
        .order_by(LabOrder.created_at.asc())
    )
    return result.scalars().all()


@router.put("/orders/{order_id}/sample")
async def mark_sample_collected(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_lab),
):
    result = await db.execute(select(LabOrder).where(LabOrder.order_id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = "sample_collected"
    await db.commit()
    return {"message": "Sample collected"}


@router.post("/reports/", response_model=LabReportOut)
async def upload_lab_report(
    order_id: uuid.UUID,
    patient_id: str,
    report_type: str,
    uploaded_by: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_lab),
):
    try:
        # Read file and save to storage
        file_bytes = await file.read()
        file_url = await save_file(file_bytes, file.filename, "lab_reports")

        # Convert uploaded_by string to UUID
        try:
            uploaded_by_uuid = uuid.UUID(uploaded_by)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid uploaded_by ID format")

        # Create report
        report = LabReport(
            order_id=order_id,
            patient_id=patient_id,
            report_type=report_type,
            uploaded_by=uploaded_by_uuid,
            file_url=file_url,
        )
        db.add(report)

        # Mark order as completed
        order_result = await db.execute(select(LabOrder).where(LabOrder.order_id == order_id))
        order = order_result.scalar_one_or_none()
        if order:
            order.status = "completed"

        await db.commit()
        await db.refresh(report)

        # AI summary in background — uses its own DB session
        background_tasks.add_task(_process_report_ai, report.report_id, patient_id)

        return report
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Lab report upload failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


async def _process_report_ai(report_id: uuid.UUID, patient_id: str):
    """Run AI analysis in background with its own DB session."""
    try:
        async with AsyncSessionLocal() as db:
            patient_result = await db.execute(select(Patient).where(Patient.patient_id == patient_id))
            patient = patient_result.scalar_one_or_none()
            report_result = await db.execute(select(LabReport).where(LabReport.report_id == report_id))
            report = report_result.scalar_one_or_none()
            if not report or not patient:
                return
            ai_result = await summarize_lab_report("Lab report uploaded.", patient.full_name)
            report.ai_summary = ai_result.get("summary")
            report.abnormal_flags = ai_result.get("abnormal_flags", {})
            await db.commit()
            # WhatsApp notification
            msg = await generate_whatsapp_message("report", patient.language_preference, {"name": patient.full_name, "test_name": report.report_type})
            await send_whatsapp_message(patient.mobile_number, msg)
            if report.file_url and report.file_url.startswith("http"):
                await send_whatsapp_document(patient.mobile_number, report.file_url, "Your Lab Report")
    except Exception as e:
        logger.error(f"AI report processing failed: {e}", exc_info=True)


@router.get("/reports/{report_id}", response_model=LabReportOut)
async def get_lab_report(
    report_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_any),
):
    result = await db.execute(select(LabReport).where(LabReport.report_id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report
