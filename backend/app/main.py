from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from pathlib import Path

from app.config import get_settings
from app.database import engine
from app.models import *  # noqa: F401,F403 — import all models for Alembic
from app.routers import auth, patients, visits, prescriptions, lab, radiology, pharmacy, staff, owner, uploads

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure upload directories exist
    Path(settings.LOCAL_STORAGE_PATH).mkdir(parents=True, exist_ok=True)
    yield
    await engine.dispose()


app = FastAPI(
    title="MEDI7 API",
    description="Paperless Hospital Management System — Sai Hospital",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(visits.router)
app.include_router(prescriptions.router)
app.include_router(lab.router)
app.include_router(radiology.router)
app.include_router(pharmacy.router)
app.include_router(staff.router)
app.include_router(owner.router)
app.include_router(uploads.router)

# Serve local uploads as static files (dev only)
uploads_path = Path(settings.LOCAL_STORAGE_PATH)
uploads_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_path)), name="uploads")


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "MEDI7 API", "hospital": settings.HOSPITAL_NAME}
