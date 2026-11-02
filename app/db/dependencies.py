from typing import Generator
from fastapi import Depends
from sqlalchemy.orm import Session
from app.db.database import get_db_session


def get_db() -> Generator[Session, None, None]:
    """FastAPI Depends hook for database session."""
    yield from get_db_session()
