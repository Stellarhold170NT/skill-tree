"""CASE v1.1 data model: CFDocument / CFItem / CFAssociation."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def _uuid() -> str:
    return uuid.uuid4().hex


def _now() -> datetime:
    return datetime.now(timezone.utc)


class CFDocument(Base):
    __tablename__ = "cf_documents"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    identifier: Mapped[str] = mapped_column(String(500), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    creator: Mapped[str] = mapped_column(String(500))
    publisher: Mapped[str | None] = mapped_column(String(500), nullable=True)
    version: Mapped[str | None] = mapped_column(String(50), nullable=True)
    status: Mapped[str | None] = mapped_column(String(50), default="Draft")
    language: Mapped[str | None] = mapped_column(String(20), default="eng")
    last_change_date_time: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    items: Mapped[list["CFItem"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )
    associations: Mapped[list["CFAssociation"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )


class CFItem(Base):
    __tablename__ = "cf_items"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    identifier: Mapped[str] = mapped_column(String(500), unique=True, index=True)
    document_id: Mapped[str] = mapped_column(ForeignKey("cf_documents.id"), index=True)
    human_coding_scheme: Mapped[str | None] = mapped_column(String(100), nullable=True)
    full_statement: Mapped[str] = mapped_column(Text)
    abbrev_statement: Mapped[str | None] = mapped_column(String(500), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    language: Mapped[str | None] = mapped_column(String(20), nullable=True)
    status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    last_change_date_time: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    document: Mapped[CFDocument] = relationship(back_populates="items")


class CFAssociation(Base):
    __tablename__ = "cf_associations"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    identifier: Mapped[str] = mapped_column(String(500), unique=True, index=True)
    document_id: Mapped[str] = mapped_column(ForeignKey("cf_documents.id"), index=True)
    association_type: Mapped[str] = mapped_column(String(50))
    origin_item_id: Mapped[str] = mapped_column(ForeignKey("cf_items.id"), index=True)
    destination_item_id: Mapped[str] = mapped_column(ForeignKey("cf_items.id"), index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    document: Mapped[CFDocument] = relationship(back_populates="associations")
