"""SQLAlchemy engine/session wiring. SQLite by default, Postgres via DATABASE_URL."""

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from . import config

_URL = config.DATABASE_URL

if _URL.startswith("sqlite"):
    _path = _URL.split("sqlite:///", 1)[-1]
    if _path not in (":memory:", ""):
        os.makedirs(os.path.dirname(_path) or ".", exist_ok=True)

engine = create_engine(
    _URL,
    connect_args={"check_same_thread": False} if _URL.startswith("sqlite") else {},
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from . import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
