"""SQLite wiring: SQLAlchemy metadata tables + FTS5 external-content index (design §4)."""

import os
import sqlite3
from contextlib import contextmanager

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from . import config

_PATH = config.DB_PATH
if _PATH not in (":memory:", ""):
    os.makedirs(os.path.dirname(_PATH) or ".", exist_ok=True)

engine = create_engine(
    f"sqlite:///{_PATH}",
    connect_args={"check_same_thread": False, "timeout": 30},
)


@event.listens_for(engine, "connect")
def _sqlite_pragma(dbapi_conn, _record):
    cur = dbapi_conn.cursor()
    cur.execute("PRAGMA foreign_keys=ON")
    cur.execute("PRAGMA busy_timeout=30000")
    cur.close()


SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


@contextmanager
def fts_connect():
    """Raw sqlite3 connection for FTS5 DDL + BM25 queries (WAL + busy timeout)."""
    conn = sqlite3.connect(_PATH, timeout=30, check_same_thread=False)
    try:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA busy_timeout=30000")
        yield conn
        conn.commit()
    finally:
        conn.close()


# FTS5 external-content pattern (A/B/D triggers from the SQLite docs, design §4).
FTS_DDL = (
    """
    CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
        heading, path, body, content='chunks', content_rowid='rowid'
    )
    """,
    """
    CREATE TRIGGER IF NOT EXISTS chunks_ai AFTER INSERT ON chunks BEGIN
        INSERT INTO chunks_fts(rowid, heading, path, body)
        VALUES (new.rowid, new.heading, new.path, new.body);
    END
    """,
    """
    CREATE TRIGGER IF NOT EXISTS chunks_ad AFTER DELETE ON chunks BEGIN
        INSERT INTO chunks_fts(chunks_fts, rowid, heading, path, body)
        VALUES ('delete', old.rowid, old.heading, old.path, old.body);
    END
    """,
    """
    CREATE TRIGGER IF NOT EXISTS chunks_au AFTER UPDATE ON chunks BEGIN
        INSERT INTO chunks_fts(chunks_fts, rowid, heading, path, body)
        VALUES ('delete', old.rowid, old.heading, old.path, old.body);
        INSERT INTO chunks_fts(rowid, heading, path, body)
        VALUES (new.rowid, new.heading, new.path, new.body);
    END
    """,
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from . import models  # noqa: F401  (register mappings)

    Base.metadata.create_all(bind=engine)
    with fts_connect() as conn:
        for ddl in FTS_DDL:
            conn.execute(ddl)
