"""
Storage service — abstract over local filesystem or AWS S3.
Set STORAGE_BACKEND=local (dev) or STORAGE_BACKEND=s3 (prod).
"""
import os
import uuid
import aiofiles
from pathlib import Path
from app.config import get_settings

settings = get_settings()


async def save_file(file_bytes: bytes, filename: str, folder: str = "uploads") -> str:
    """Save file and return its URL/path."""
    if settings.STORAGE_BACKEND == "s3":
        return await _save_to_s3(file_bytes, filename, folder)
    return await _save_local(file_bytes, filename, folder)


async def _save_local(file_bytes: bytes, filename: str, folder: str) -> str:
    ext = Path(filename).suffix
    unique_name = f"{uuid.uuid4().hex}{ext}"
    upload_dir = Path(settings.LOCAL_STORAGE_PATH) / folder
    upload_dir.mkdir(parents=True, exist_ok=True)
    filepath = upload_dir / unique_name
    async with aiofiles.open(filepath, "wb") as f:
        await f.write(file_bytes)
    return f"/uploads/{folder}/{unique_name}"


async def _save_to_s3(file_bytes: bytes, filename: str, folder: str) -> str:
    import boto3
    ext = Path(filename).suffix
    unique_name = f"{folder}/{uuid.uuid4().hex}{ext}"
    s3 = boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION,
    )
    s3.put_object(Bucket=settings.S3_BUCKET, Key=unique_name, Body=file_bytes)
    return f"https://{settings.S3_BUCKET}.s3.{settings.AWS_REGION}.amazonaws.com/{unique_name}"
