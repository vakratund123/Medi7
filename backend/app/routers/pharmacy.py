from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from app.database import get_db
from app.models.pharmacy import PharmacyDispensing, Inventory
from app.models.prescription import Prescription
from app.models.staff import Staff
from app.schemas.pharmacy import DispenseCreate, DispenseOut, InventoryCreate, InventoryUpdate, InventoryOut
from app.middleware.auth_middleware import require_pharmacist, require_any

router = APIRouter(prefix="/api/pharmacy", tags=["Pharmacy"])


@router.get("/prescription/{patient_id}")
async def get_active_prescription(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_pharmacist),
):
    result = await db.execute(
        select(Prescription)
        .where(Prescription.patient_id == patient_id)
        .order_by(Prescription.created_at.desc())
        .limit(1)
    )
    rx = result.scalar_one_or_none()
    if not rx:
        raise HTTPException(status_code=404, detail="No active prescription found")
    return {
        "prescription_id": str(rx.prescription_id),
        "patient_id": rx.patient_id,
        "medicines": rx.medicines,
        "created_at": rx.created_at,
        "pdf_url": rx.pdf_url,
    }


@router.post("/dispense/", response_model=DispenseOut)
async def dispense_medicines(
    data: DispenseCreate,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_pharmacist),
):
    dispense = PharmacyDispensing(
        patient_id=data.patient_id,
        prescription_id=data.prescription_id,
        medicines_dispensed=[m.model_dump() for m in data.medicines_dispensed],
        dispensed_by=data.dispensed_by,
    )
    db.add(dispense)

    # Auto-update inventory
    for item in data.medicines_dispensed:
        inv_result = await db.execute(
            select(Inventory).where(Inventory.medicine_name.ilike(item.medicine_name))
        )
        inv_item = inv_result.scalar_one_or_none()
        if inv_item:
            inv_item.quantity_available = max(0, inv_item.quantity_available - item.quantity)

    await db.commit()
    await db.refresh(dispense)
    return dispense


@router.get("/inventory/", response_model=list[InventoryOut])
async def list_inventory(
    low_stock_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_pharmacist),
):
    stmt = select(Inventory)
    result = await db.execute(stmt)
    items = result.scalars().all()
    out = []
    for item in items:
        d = InventoryOut.model_validate(item)
        d.is_low_stock = item.quantity_available <= item.reorder_level
        if not low_stock_only or d.is_low_stock:
            out.append(d)
    return out


@router.post("/inventory/", response_model=InventoryOut)
async def add_inventory_item(
    data: InventoryCreate,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_pharmacist),
):
    item = Inventory(**data.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.put("/inventory/{item_id}", response_model=InventoryOut)
async def update_inventory_item(
    item_id: uuid.UUID,
    data: InventoryUpdate,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_pharmacist),
):
    result = await db.execute(select(Inventory).where(Inventory.item_id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(item, field, value)
    await db.commit()
    await db.refresh(item)
    return item
