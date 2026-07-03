from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from app.database import get_db
from app.models.radiology import Radiology
from app.models.staff import Staff
from app.schemas.radiology import RadiologyOrderCreate, RadiologyOut
from app.middleware.auth_middleware import require_doctor, require_radiology, require_any
from app.services.storage_service import save_file

router = APIRouter(prefix="/api/radiology", tags=["Radiology"])


@router.post("/orders/", response_model=RadiologyOut)
async def create_radiology_order(
    data: RadiologyOrderCreate,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_doctor),
):
    scan = Radiology(**data.model_dump())
    db.add(scan)
    await db.commit()
    await db.refresh(scan)
    return scan


@router.get("/orders/pending", response_model=list[RadiologyOut])
async def get_pending_orders(
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_radiology),
):
    result = await db.execute(
        select(Radiology).where(Radiology.status == "ordered").order_by(Radiology.created_at.asc())
    )
    return result.scalars().all()


@router.post("/scans/{scan_id}/upload", response_model=RadiologyOut)
async def upload_scan(
    scan_id: uuid.UUID,
    remarks: str = "",
    uploaded_by: str = "",
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_radiology),
):
    result = await db.execute(select(Radiology).where(Radiology.scan_id == scan_id))
    scan = result.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan order not found")

    file_bytes = await file.read()
    file_url = await save_file(file_bytes, file.filename, "radiology")

    scan.file_url = file_url
    scan.radiologist_remarks = remarks
    
    if uploaded_by:
        try:
            scan.uploaded_by = uuid.UUID(uploaded_by)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid uploaded_by ID format")
    else:
        scan.uploaded_by = None

    scan.status = "completed"
    await db.commit()
    await db.refresh(scan)
    return scan


@router.get("/scans/{scan_id}", response_model=RadiologyOut)
async def get_scan(
    scan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Staff = Depends(require_any),
):
    result = await db.execute(select(Radiology).where(Radiology.scan_id == scan_id))
    scan = result.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan
