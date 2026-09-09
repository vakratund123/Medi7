from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pathlib import Path
import uuid
from datetime import datetime

from app.database import get_db
from app.models.bill import Bill
from app.models.patient import Patient
from app.models.staff import Staff
from app.models.visit import Visit
from app.schemas.bill import BillCreate, BillOut, BillPaymentUpdate
from app.middleware.auth_middleware import require_any, require_roles
from app.services.pdf_service import generate_bill_pdf
from app.services.whatsapp_service import send_whatsapp_document, send_whatsapp_message
from app.config import get_settings

settings = get_settings()
router = APIRouter(prefix="/api/bills", tags=["Bills & Billing"])


async def _generate_bill_number(db: AsyncSession) -> str:
    """Generate sequential bill number e.g. SEMH-B26-0001."""
    year_suffix = datetime.now().strftime("%y")
    prefix = f"SEMH-B{year_suffix}-"
    result = await db.execute(
        select(func.count(Bill.bill_id)).where(Bill.bill_number.like(f"{prefix}%"))
    )
    count = result.scalar() or 0
    return f"{prefix}{count + 1:04d}"


async def _send_bill_whatsapp(patient: Patient, bill: Bill, pdf_url: str | None):
    try:
        msg = (
            f"Dear {patient.full_name},\n\n"
            f"Your Final Bill for Sai Emergency & Multispeciality Hospital has been generated.\n"
            f"Bill No: {bill.bill_number}\n"
            f"Total Amount: Rs. {bill.net_amount:.2f}\n"
            f"Status: {bill.payment_status.upper()}\n\n"
            f"Hospital Contact: 9632219690 / 7204583699\n"
            f"Get well soon!"
        )
        await send_whatsapp_message(patient.mobile_number, msg)
        if pdf_url and pdf_url.startswith("http"):
            await send_whatsapp_document(patient.mobile_number, pdf_url, f"Final Bill {bill.bill_number}")
    except Exception as e:
        print(f"[WhatsApp] Bill notification error: {e}")


@router.post("/", response_model=BillOut)
async def create_or_update_bill(
    data: BillCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: Staff = Depends(require_any),
):
    # Fetch related records
    patient_result = await db.execute(select(Patient).where(Patient.patient_id == data.patient_id))
    patient = patient_result.scalar_one_or_none()
    doctor_result = await db.execute(select(Staff).where(Staff.staff_id == data.doctor_id))
    doctor = doctor_result.scalar_one_or_none()
    visit_result = await db.execute(select(Visit).where(Visit.visit_id == data.visit_id))
    visit = visit_result.scalar_one_or_none()

    if not patient or not doctor or not visit:
        raise HTTPException(status_code=404, detail="Patient, doctor, or visit record not found")

    # Check if a bill already exists for this visit
    existing_result = await db.execute(select(Bill).where(Bill.visit_id == data.visit_id))
    bill = existing_result.scalar_one_or_none()

    items_dump = [item.model_dump() for item in data.items]

    if bill:
        # Update existing bill
        bill.items = items_dump
        bill.subtotal = data.subtotal
        bill.discount = data.discount
        bill.tax = data.tax
        bill.net_amount = data.net_amount
        if data.payment_status:
            bill.payment_status = data.payment_status
        if data.payment_mode:
            bill.payment_mode = data.payment_mode
        if data.notes is not None:
            bill.notes = data.notes
    else:
        bill_number = await _generate_bill_number(db)
        bill = Bill(
            bill_number=bill_number,
            visit_id=data.visit_id,
            patient_id=data.patient_id,
            doctor_id=data.doctor_id,
            items=items_dump,
            subtotal=data.subtotal,
            discount=data.discount,
            tax=data.tax,
            net_amount=data.net_amount,
            payment_status=data.payment_status or "pending",
            payment_mode=data.payment_mode,
            notes=data.notes,
        )
        db.add(bill)

    await db.flush()

    # Generate Letterhead PDF
    doctor_dict = {
        "full_name": doctor.full_name,
        "department": doctor.department,
        "reg_no": getattr(doctor, "reg_no", "BLG03043ALHL3") or "BLG03043ALHL3",
    }
    patient_dict = {
        "full_name": patient.full_name,
        "patient_id": patient.patient_id,
        "age": patient.age,
        "gender": patient.gender,
        "phone": patient.mobile_number,
        "address": getattr(patient, "address", "") or "",
        "referred_by": getattr(patient, "referred_by", None),
    }
    visit_dict = {
        "visit_id": str(visit.visit_id),
        "diagnosis": visit.diagnosis,
        "visit_type": getattr(visit, "visit_type", "OPD"),
        "referred_by": getattr(visit, "referred_by", None),
    }
    bill_dict = {
        "bill_number": bill.bill_number,
        "items": bill.items,
        "subtotal": bill.subtotal,
        "discount": bill.discount,
        "tax": bill.tax,
        "net_amount": bill.net_amount,
        "payment_status": bill.payment_status,
        "payment_mode": bill.payment_mode,
        "notes": bill.notes,
    }

    try:
        pdf_rel_path = generate_bill_pdf(patient_dict, doctor_dict, bill_dict, visit_dict)
        bill.pdf_url = pdf_rel_path
    except Exception as e:
        print(f"[PDF Error] Failed to generate bill PDF: {e}")

    await db.commit()
    await db.refresh(bill)

    # Trigger WhatsApp notification in background
    background_tasks.add_task(_send_bill_whatsapp, patient, bill, bill.pdf_url)

    return bill


@router.get("/visit/{visit_id}", response_model=BillOut)
async def get_bill_by_visit(
    visit_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_any),
):
    result = await db.execute(select(Bill).where(Bill.visit_id == visit_id))
    bill = result.scalar_one_or_none()
    if not bill:
        raise HTTPException(status_code=404, detail="No bill found for this visit")
    return bill


@router.get("/{bill_id}", response_model=BillOut)
async def get_bill_by_id(
    bill_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_any),
):
    result = await db.execute(select(Bill).where(Bill.bill_id == bill_id))
    bill = result.scalar_one_or_none()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    return bill


@router.patch("/{bill_id}/payment", response_model=BillOut)
async def update_bill_payment(
    bill_id: uuid.UUID,
    data: BillPaymentUpdate,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_roles(["reception", "manager", "doctor", "admin", "owner"])),
):
    result = await db.execute(select(Bill).where(Bill.bill_id == bill_id))
    bill = result.scalar_one_or_none()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    bill.payment_status = data.payment_status
    bill.payment_mode = data.payment_mode
    if data.notes:
        bill.notes = data.notes

    await db.commit()
    await db.refresh(bill)
    return bill


@router.get("/{bill_id}/pdf")
async def download_bill_pdf(
    bill_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_any),
):
    result = await db.execute(select(Bill).where(Bill.bill_id == bill_id))
    bill = result.scalar_one_or_none()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    if not bill.pdf_url:
        raise HTTPException(status_code=404, detail="Bill PDF not yet generated")

    rel_path = bill.pdf_url.lstrip("/")
    if rel_path.startswith("uploads/"):
        rel_path = rel_path[len("uploads/"):]
    file_path = Path(settings.LOCAL_STORAGE_PATH) / rel_path

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Bill PDF file not found on disk")

    return FileResponse(
        str(file_path),
        media_type="application/pdf",
        filename=f"{bill.bill_number}.pdf",
    )
