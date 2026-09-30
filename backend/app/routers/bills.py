from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, case
from pathlib import Path
import uuid
from datetime import datetime, date

from app.database import get_db
from app.models.bill import Bill
from app.models.patient import Patient
from app.models.staff import Staff
from app.models.visit import Visit
from app.schemas.bill import BillCreate, BillUpdate, BillOut, BillPaymentUpdate, BillDetailOut, BillStatsOut
from app.middleware.auth_middleware import require_any, require_roles
from app.services.pdf_service import generate_bill_pdf
from app.services.whatsapp_service import send_whatsapp_document, send_whatsapp_message, send_whatsapp_template
from app.services.ai_service import generate_whatsapp_message
from app.config import get_settings

settings = get_settings()
router = APIRouter(prefix="/api/bills", tags=["Bills & Billing"])

BILL_ROLES = ["manager", "doctor", "admin", "owner", "cashier", "receptionist", "reception"]


async def _generate_bill_number(db: AsyncSession) -> str:
    """Generate sequential bill number e.g. SEMH-B26-0001."""
    prefix = f"SEMH-B{datetime.now().strftime('%y')}-"
    result = await db.execute(
        select(func.count(Bill.bill_id)).where(Bill.bill_number.like(f"{prefix}%"))
    )
    count = result.scalar() or 0
    return f"{prefix}{count + 1:04d}"


async def _send_bill_whatsapp(
    patient_id: str,
    full_name: str,
    mobile_number: str,
    lang: str,
    bill_number: str,
    net_amount: float,
    payment_status: str,
    bill_id: str,
    pdf_url: str | None,
):
    try:
        amt_str = f"{net_amount:.2f}"
        status_str = payment_status.upper()
        base_url = (settings.PUBLIC_URL or "http://localhost:8000").rstrip("/")
        download_url = f"{base_url}/api/bills/public/{bill_id}/pdf"
        if pdf_url and pdf_url.startswith("http"):
            download_url = pdf_url

        msg = await generate_whatsapp_message(
            "bill",
            lang,
            {
                "name": full_name,
                "bill_number": bill_number,
                "net_amount": amt_str,
                "payment_status": status_str,
                "download_url": download_url,
            },
        )
        await send_whatsapp_template(
            mobile=mobile_number,
            template_name="hospital_bill_ready",
            parameters=[full_name, bill_number, amt_str, status_str],
            fallback_message=msg,
            patient_id=patient_id,
            preferred_language=lang,
        )
        if pdf_url:
            await send_whatsapp_document(
                mobile=mobile_number,
                file_path_or_url=pdf_url,
                caption=f"Final Bill {bill_number}",
                patient_id=patient_id,
            )
    except Exception as e:
        print(f"[WhatsApp] Bill notification error: {e}")


@router.post("/", response_model=BillOut)
async def create_or_update_bill(
    data: BillCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: Staff = Depends(require_roles(BILL_ROLES)),
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

    # Trigger WhatsApp notification in background ONLY if paid (pending bills wait for cashier collection)
    if bill.payment_status.lower() == "paid":
        background_tasks.add_task(
            _send_bill_whatsapp,
            patient.patient_id,
            patient.full_name,
            patient.mobile_number,
            getattr(patient, "language_preference", "english") or "english",
            bill.bill_number,
            bill.net_amount,
            bill.payment_status,
            str(bill.bill_id),
            bill.pdf_url,
        )

    return bill


@router.get("/visit/{visit_id}", response_model=BillOut)
async def get_bill_by_visit(
    visit_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_roles(BILL_ROLES)),
):
    result = await db.execute(select(Bill).where(Bill.visit_id == visit_id))
    bill = result.scalar_one_or_none()
    if not bill:
        raise HTTPException(status_code=404, detail="No bill found for this visit")
    return bill


@router.get("/", response_model=list[BillDetailOut])
async def list_bills(
    payment_status: str | None = Query(None, description="Filter by pending, paid, etc."),
    search: str | None = Query(None, description="Search by patient name, ID, or bill number"),
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_roles(BILL_ROLES)),
):
    """List bills with optional filter by payment status and keyword search, enriched with patient and doctor details."""
    stmt = (
        select(
            Bill,
            Patient.full_name.label("patient_name"),
            Patient.mobile_number.label("patient_mobile"),
            Patient.age.label("patient_age"),
            Patient.gender.label("patient_gender"),
            Staff.full_name.label("doctor_name"),
            Staff.department.label("doctor_department"),
            Visit.visit_type.label("visit_type"),
            Visit.visit_date.label("visit_date"),
            Visit.chief_complaint.label("chief_complaint"),
            Visit.diagnosis.label("diagnosis"),
        )
        .join(Patient, Bill.patient_id == Patient.patient_id, isouter=True)
        .join(Staff, Bill.doctor_id == Staff.staff_id, isouter=True)
        .join(Visit, Bill.visit_id == Visit.visit_id, isouter=True)
    )

    if payment_status and payment_status.lower() != "all":
        stmt = stmt.where(func.lower(Bill.payment_status) == payment_status.lower())

    if search:
        search_term = f"%{search.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Bill.bill_number).like(search_term),
                func.lower(Bill.patient_id).like(search_term),
                func.lower(Patient.full_name).like(search_term),
                func.lower(Patient.mobile_number).like(search_term),
            )
        )

    stmt = stmt.order_by(Bill.created_at.desc()).limit(limit)
    result = await db.execute(stmt)
    rows = result.all()

    output = []
    for r in rows:
        bill, p_name, p_mob, p_age, p_gen, doc_name, doc_dept, v_type, v_date, v_comp, v_diag = r
        item_data = BillDetailOut.model_validate(bill)
        item_data.patient_name = p_name
        item_data.patient_mobile = p_mob
        item_data.patient_age = p_age
        item_data.patient_gender = p_gen
        item_data.doctor_name = doc_name
        item_data.doctor_department = doc_dept
        item_data.visit_type = v_type
        item_data.visit_date = v_date
        item_data.chief_complaint = v_comp
        item_data.diagnosis = v_diag
        output.append(item_data)

    return output


@router.get("/stats/summary", response_model=BillStatsOut)
async def get_billing_stats(
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_roles(BILL_ROLES)),
):
    """Aggregate billing statistics for the Billing & Cashier Desk."""
    # Pending bills & total pending amount
    pending_res = await db.execute(
        select(
            func.count(Bill.bill_id),
            func.coalesce(func.sum(Bill.net_amount), 0.0),
        ).where(func.lower(Bill.payment_status) == "pending")
    )
    pending_count, pending_amount = pending_res.one()

    # Today's collections
    today_date = date.today()
    today_paid_res = await db.execute(
        select(
            func.coalesce(func.sum(Bill.net_amount), 0.0),
            func.coalesce(
                func.sum(
                    case((func.lower(Bill.payment_mode) == "cash", Bill.net_amount), else_=0.0)
                ),
                0.0,
            ),
            func.coalesce(
                func.sum(
                    case((func.lower(Bill.payment_mode) == "upi", Bill.net_amount), else_=0.0)
                ),
                0.0,
            ),
            func.coalesce(
                func.sum(
                    case((func.lower(Bill.payment_mode) == "card", Bill.net_amount), else_=0.0)
                ),
                0.0,
            ),
        ).where(
            func.lower(Bill.payment_status) == "paid",
            or_(
                func.date(Bill.updated_at) == today_date,
                func.date(Bill.created_at) == today_date,
            ),
        )
    )
    total_today, today_cash, today_upi, today_card = today_paid_res.one()

    total_bills_res = await db.execute(select(func.count(Bill.bill_id)))
    total_bills = total_bills_res.scalar() or 0

    return BillStatsOut(
        total_pending_count=int(pending_count or 0),
        total_pending_amount=float(pending_amount or 0.0),
        total_collected_today=float(total_today or 0.0),
        today_cash=float(today_cash or 0.0),
        today_upi=float(today_upi or 0.0),
        today_card=float(today_card or 0.0),
        total_bills_count=int(total_bills),
    )


@router.get("/{bill_id}", response_model=BillOut)
async def get_bill_by_id(
    bill_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_roles(BILL_ROLES)),
):
    result = await db.execute(select(Bill).where(Bill.bill_id == bill_id))
    bill = result.scalar_one_or_none()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    return bill


@router.put("/{bill_id}", response_model=BillOut)
async def update_bill(
    bill_id: uuid.UUID,
    data: BillUpdate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: Staff = Depends(require_roles(BILL_ROLES)),
):
    """Edit bill items, quantities, rates, discounts, notes, and payment mode. Accessible to Doctor & Receptionist."""
    result = await db.execute(select(Bill).where(Bill.bill_id == bill_id))
    bill = result.scalar_one_or_none()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    if data.items is not None:
        bill.items = [item.model_dump() for item in data.items]
    if data.subtotal is not None:
        bill.subtotal = data.subtotal
    if data.discount is not None:
        bill.discount = data.discount
    if data.tax is not None:
        bill.tax = data.tax
    if data.net_amount is not None:
        bill.net_amount = data.net_amount
    if data.payment_status is not None:
        bill.payment_status = data.payment_status
    if data.payment_mode is not None:
        bill.payment_mode = data.payment_mode
    if data.notes is not None:
        bill.notes = data.notes

    # Fetch patient, doctor, and visit to regenerate Letterhead PDF
    patient_result = await db.execute(select(Patient).where(Patient.patient_id == bill.patient_id))
    patient = patient_result.scalar_one_or_none()
    doctor_result = await db.execute(select(Staff).where(Staff.staff_id == bill.doctor_id))
    doctor = doctor_result.scalar_one_or_none()
    visit_result = await db.execute(select(Visit).where(Visit.visit_id == bill.visit_id))
    visit = visit_result.scalar_one_or_none()

    if patient and doctor and visit:
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
            print(f"[PDF Error] Failed to regenerate bill PDF on edit: {e}")

    await db.commit()
    await db.refresh(bill)

    # If marked paid, send updated bill & receipt to patient WhatsApp in background
    if bill.payment_status.lower() == "paid" and patient:
        background_tasks.add_task(
            _send_bill_whatsapp,
            patient.patient_id,
            patient.full_name,
            patient.mobile_number,
            getattr(patient, "language_preference", "english") or "english",
            bill.bill_number,
            bill.net_amount,
            bill.payment_status,
            str(bill.bill_id),
            bill.pdf_url,
        )

    return bill


@router.patch("/{bill_id}/payment", response_model=BillOut)
async def update_bill_payment(
    bill_id: uuid.UUID,
    data: BillPaymentUpdate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_roles(BILL_ROLES)),
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

    # If marked paid, send updated bill & receipt to patient WhatsApp in background
    if data.payment_status.lower() == "paid":
        p_res = await db.execute(select(Patient).where(Patient.patient_id == bill.patient_id))
        patient = p_res.scalar_one_or_none()
        if patient:
            background_tasks.add_task(
                _send_bill_whatsapp,
                patient.patient_id,
                patient.full_name,
                patient.mobile_number,
                getattr(patient, "language_preference", "english") or "english",
                bill.bill_number,
                bill.net_amount,
                bill.payment_status,
                str(bill.bill_id),
                bill.pdf_url,
            )

    return bill


@router.get("/public/{bill_id}/pdf")
async def download_bill_pdf_public(
    bill_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Public bill PDF download for patients via WhatsApp link without needing staff login."""
    result = await db.execute(select(Bill).where(Bill.bill_id == bill_id))
    bill = result.scalar_one_or_none()
    if not bill or not bill.pdf_url:
        raise HTTPException(status_code=404, detail="Bill PDF not found")

    from app.services.whatsapp_service import _resolve_local_file
    local_file = _resolve_local_file(bill.pdf_url)
    if local_file and local_file.exists():
        return FileResponse(str(local_file), media_type="application/pdf", filename=f"{bill.bill_number}.pdf")

    if bill.pdf_url.startswith("http"):
        from fastapi.responses import RedirectResponse
        return RedirectResponse(bill.pdf_url)

    raise HTTPException(status_code=404, detail="Bill PDF file not found on disk")


@router.get("/{bill_id}/pdf")
async def download_bill_pdf(
    bill_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_roles(BILL_ROLES)),
):
    result = await db.execute(select(Bill).where(Bill.bill_id == bill_id))
    bill = result.scalar_one_or_none()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    if not bill.pdf_url:
        raise HTTPException(status_code=404, detail="Bill PDF not yet generated")

    from app.services.whatsapp_service import _resolve_local_file
    local_file = _resolve_local_file(bill.pdf_url)
    if local_file and local_file.exists():
        return FileResponse(str(local_file), media_type="application/pdf", filename=f"{bill.bill_number}.pdf")

    if bill.pdf_url.startswith("http"):
        from fastapi.responses import RedirectResponse
        return RedirectResponse(bill.pdf_url)

    raise HTTPException(status_code=404, detail="Bill PDF file not found on disk")
