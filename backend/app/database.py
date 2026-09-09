from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import StaticPool
from app.config import get_settings

settings = get_settings()

def get_async_database_url(url: str) -> str:
    """Normalize database URL for SQLAlchemy asyncpg driver and resolve local sqlite path."""
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif "sqlite" in url and ("./medi7.db" in url or url.endswith("medi7.db")):
        from pathlib import Path
        backend_db = Path(__file__).resolve().parent.parent / "medi7.db"
        if backend_db.exists():
            return f"sqlite+aiosqlite:///{backend_db.as_posix()}"
    return url


db_url = get_async_database_url(settings.DATABASE_URL)
_is_sqlite = db_url.startswith("sqlite")

_engine_kwargs = dict(
    echo=settings.DEBUG,
)

if _is_sqlite:
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
    _engine_kwargs["poolclass"] = StaticPool
else:
    _engine_kwargs["pool_size"] = 10
    _engine_kwargs["max_overflow"] = 20

engine = create_async_engine(
    db_url,
    **_engine_kwargs,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
