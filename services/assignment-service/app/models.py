"""Assignment model: targeted practice generated from mastery states."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


def _uuid() -> str:
    return uuid.uuid4().hex


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Assignment(Base):
    __tablename__ = "assignments"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    title: Mapped[str] = mapped_column(String(300))
    class_id: Mapped[str] = mapped_column(String(64), index=True)
    concept_uri: Mapped[str] = mapped_column(String(500), index=True)
    target_group: Mapped[str] = mapped_column(String(20), default="red_rusty")  # red|rusty|red_rusty
    student_ids: Mapped[list] = mapped_column(JSON, default=list)
    item_ids: Mapped[list] = mapped_column(JSON, default=list)
    quiz_test_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="published")  # draft|published|closed
    due_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
