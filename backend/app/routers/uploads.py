from fastapi import APIRouter, UploadFile, File, Depends
from app.models.staff import Staff
from app.middleware.auth_middleware import require_any
from app.services.storage_service import save_file

router = APIRouter(prefix="/api/uploads", tags=["Uploads"])


@router.post("/file")
async def upload_file(
    folder: str = "general",
    file: UploadFile = File(...),
    _: Staff = Depends(require_any),
):
    file_bytes = await file.read()
    url = await save_file(file_bytes, file.filename, folder)
    return {"url": url, "filename": file.filename}
