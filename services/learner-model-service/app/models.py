"""Learner model data: one Glicko-2 "player" per (student, concept)."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


def _uuid() -> str:
    return uuid.uuid4().hex


def _now() -> datetime:
    return datetime.now(timezone.utc)


class MasteryRecord(Base):
    __tablename__ = "mastery_records"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    student_sourced_id: Mapped[str] = mapped_column(String(64), index=True)
    concept_uri: Mapped[str] = mapped_column(String(500))
    rating: Mapped[float] = mapped_column(Float, default=1500.0)
    rating_deviation: Mapped[float] = mapped_column(Float, default=350.0)
    volatility: Mapped[float] = mapped_column(Float, default=0.06)
    review_count: Mapped[int] = mapped_column(Integer, default=0)
    last_played_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now)

    __table_args__ = (
        Index("ix_mastery_student_concept", "student_sourced_id", "concept_uri", unique=True),
    )
