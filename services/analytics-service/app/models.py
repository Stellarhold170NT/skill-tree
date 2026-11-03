"""Caliper-aligned learning event store: append-only, idempotent by eventId."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


def _uuid() -> str:
    return uuid.uuid4().hex


def _now() -> datetime:
    return datetime.now(timezone.utc)


class LearningEvent(Base):
    __tablename__ = "learning_events"

    event_id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    type: Mapped[str] = mapped_column(String(100))
    occurred_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    actor_id: Mapped[str] = mapped_column(String(64), index=True)
    actor_type: Mapped[str] = mapped_column(String(30), default="Person")
    object_id: Mapped[str] = mapped_column(String(500), index=True)
    object_type: Mapped[str] = mapped_column(String(30), default="Concept")
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    producer: Mapped[str] = mapped_column(String(100), default="unknown")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    __table_args__ = (
        Index("ix_events_actor_object_time", "actor_id", "object_id", "occurred_at"),
    )
