from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_NAME: str = "MEDI7"
    HOSPITAL_NAME: str = "Sai Hospital"
    PATIENT_ID_PREFIX: str = "SAI"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./medi7.db"
    SYNC_DATABASE_URL: str = "sqlite:///./medi7.db"

    # Redis / Celery
    REDIS_URL: str = "redis://redis:6379/0"
    CELERY_BROKER_URL: str = "redis://redis:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://redis:6379/1"

    # JWT
    JWT_SECRET_KEY: str = "change-this-to-a-secure-random-secret"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # File Storage (S3 / local)
    STORAGE_BACKEND: str = "local"          # "local" | "s3"
    LOCAL_STORAGE_PATH: str = "./uploads"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "ap-south-1"
    S3_BUCKET: str = "medi7-files"

    # AI
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""

    # WhatsApp (WATI)
    WATI_API_ENDPOINT: str = ""
    WATI_API_TOKEN: str = ""

    # CORS
    FRONTEND_URL: str = "http://localhost:5173"

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()
