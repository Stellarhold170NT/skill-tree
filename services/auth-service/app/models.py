"""User accounts (identity lives ONLY here — behavioral layers use sourcedId)."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


def _uuid() -> str:
    return uuid.uuid4().hex


def _now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(200))
    role: Mapped[str] = mapped_column(String(20), default="student")  # student|teacher|admin
    sourced_id: Mapped[str | None] = mapped_column(String(64), nullable=True)  # M6 link
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
