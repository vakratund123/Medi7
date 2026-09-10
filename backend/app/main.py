from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from pathlib import Path

from app.config import get_settings
from app.database import engine
from app.models import *  # noqa: F401,F403 — import all models for Alembic
from app.routers import auth, patients, visits, prescriptions, bills, lab, radiology, pharmacy, staff, owner, uploads, whatsapp

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure upload directories exist
    Path(settings.LOCAL_STORAGE_PATH).mkdir(parents=True, exist_ok=True)
    # Ensure database schema is created on startup (essential for fresh cloud Postgres deployments)
    try:
        from app.database import Base, AsyncSessionLocal
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        from app.models.staff import Staff
        from sqlalchemy import select
        async with AsyncSessionLocal() as session:
            check = await session.execute(select(Staff).limit(1))
            if not check.scalar_one_or_none():
                print("[Startup] No staff found in database. Seeding official hospital accounts...")
                import sys, os
                sys.path.insert(0, str(Path(__file__).parent.parent))
                from seed_data import seed
                await seed()
                print("[Startup] Hospital database successfully initialized.")
    except Exception as e:
        print(f"[Startup Warning] Auto-seed or table creation failed: {e}")
    yield
    await engine.dispose()


app = FastAPI(
    title="MEDI7 API",
    description="Paperless Hospital Management System — Sai Hospital",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — FRONTEND_URL can be comma-separated for multiple origins
# e.g. "https://medi7.netlify.app,https://yourdomain.com"
raw_origins = [
    origin.strip().rstrip("/")
    for origin in settings.FRONTEND_URL.split(",")
    if origin.strip()
]
allowed_origins = list(set(raw_origins + [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https:\/\/.*\.netlify\.app|https:\/\/.*\.onrender\.com|https:\/\/.*\.vercel\.app|http:\/\/(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(visits.router)
app.include_router(prescriptions.router)
app.include_router(bills.router)
app.include_router(lab.router)
app.include_router(radiology.router)
app.include_router(pharmacy.router)
app.include_router(staff.router)
app.include_router(owner.router)
app.include_router(uploads.router)
app.include_router(whatsapp.router)

# Serve local uploads as static files (dev only)
uploads_path = Path(settings.LOCAL_STORAGE_PATH)
uploads_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_path)), name="uploads")


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "MEDI7 API", "hospital": settings.HOSPITAL_NAME}
