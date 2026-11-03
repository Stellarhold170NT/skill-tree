"""QTI v3.0 data model: item bank, assessment tests, scored attempts."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def _uuid() -> str:
    return uuid.uuid4().hex


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Item(Base):
    __tablename__ = "items"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    identifier: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(500))
    prompt: Mapped[str] = mapped_column(Text)
    interaction_type: Mapped[str] = mapped_column(String(30), default="single_choice")
    choices: Mapped[list] = mapped_column(JSON)
    correct_response: Mapped[list] = mapped_column(JSON)
    shuffle: Mapped[bool] = mapped_column(Boolean, default=True)
    qti_xml: Mapped[str] = mapped_column(Text)
    concept_uri: Mapped[str | None] = mapped_column(String(500), nullable=True, index=True)
    difficulty: Mapped[float | None] = mapped_column(Float, nullable=True)
    discrimination: Mapped[float | None] = mapped_column(Float, nullable=True)
    language: Mapped[str | None] = mapped_column(String(20), default="eng")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now)

    attempts: Mapped[list["Attempt"]] = relationship(
        back_populates="item", cascade="all, delete-orphan"
    )


class AssessmentTest(Base):
    __tablename__ = "assessment_tests"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    identifier: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(500))
    sections: Mapped[list] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now)


class Attempt(Base):
    __tablename__ = "attempts"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    item_id: Mapped[str] = mapped_column(ForeignKey("items.id"), index=True)
    test_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    candidate_id: Mapped[str] = mapped_column(String(100), index=True)
    response: Mapped[list] = mapped_column(JSON)
    is_correct: Mapped[bool] = mapped_column(Boolean)
    score: Mapped[float] = mapped_column(Float)
    submitted_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    item: Mapped[Item] = relationship(back_populates="attempts")
