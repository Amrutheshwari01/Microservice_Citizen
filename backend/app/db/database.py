import logging
from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings

logger = logging.getLogger("cis.database")

DATABASE_URL = settings.DATABASE_URL

# Create reusable SQLAlchemy 2.x engine with PgBouncer compatibility
# (prepare_threshold=None is required for Supabase transaction/session poolers)
connect_args = {
    "prepare_threshold": None,
    "connect_timeout": 15,
}

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    pool_recycle=settings.DB_POOL_RECYCLE,
    connect_args=connect_args,
    echo=settings.DEBUG,
)

# Session factory
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


def get_db_session() -> Generator[Session, None, None]:
    """
    FastAPI database session dependency.
    Provides an isolated session per request with automatic rollback on error
    and guaranteed cleanup on completion.
    """
    session = SessionLocal()
    try:
        yield session
    except Exception as exc:
        session.rollback()
        logger.error(f"Database session error, transaction rolled back: {exc}")
        raise
    finally:
        session.close()


def test_connection() -> int:
    """Verifies that the database pool and connection are healthy."""
    with engine.connect() as connection:
        return connection.execute(text("SELECT 1")).scalar_one()
