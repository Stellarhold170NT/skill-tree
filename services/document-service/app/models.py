"""Document store models: LRMI documents, chunks, concept alignments."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def _uuid() -> str:
    return uuid.uuid4().hex


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    document_uri: Mapped[str | None] = mapped_column(String(500), index=True, nullable=True)  # M1 CFDocument.identifier
    learning_resource_type: Mapped[str] = mapped_column(String(100), default="Text")  # LRMI vocabulary
    educational_level: Mapped[str | None] = mapped_column(String(100), nullable=True)
    typical_learning_time: Mapped[str | None] = mapped_column(String(50), nullable=True)  # ISO-8601 duration
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    chunks: Mapped[list["Chunk"]] = relationship(
        back_populates="document", cascade="all, delete-orphan", order_by="Chunk.order_index"
    )
    files: Mapped[list["DocumentFile"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )


class Chunk(Base):
    __tablename__ = "chunks"
    __table_args__ = (UniqueConstraint("document_id", "order_index", name="uq_chunk_order"),)

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id"), index=True)
    order_index: Mapped[int] = mapped_column(Integer)
    text: Mapped[str] = mapped_column(Text)
    char_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    document: Mapped[Document] = relationship(back_populates="chunks")
    alignments: Mapped[list["Alignment"]] = relationship(
        back_populates="chunk", cascade="all, delete-orphan"
    )


ALIGNMENT_TYPES = ("teaches", "assesses", "requires", "summarizes")


class Alignment(Base):
    __tablename__ = "alignments"
    __table_args__ = (UniqueConstraint("chunk_id", "concept_uri", "alignment_type", name="uq_alignment"),)

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    chunk_id: Mapped[str] = mapped_column(ForeignKey("chunks.id"), index=True)
    concept_uri: Mapped[str] = mapped_column(String(500), index=True)  # M1 CFItem.identifier
    alignment_type: Mapped[str] = mapped_column(String(20), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    chunk: Mapped[Chunk] = relationship(back_populates="alignments")


class DocumentFile(Base):
    __tablename__ = "document_files"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id"), index=True)
    filename: Mapped[str] = mapped_column(String(300))
    content_type: Mapped[str] = mapped_column(String(100), default="application/octet-stream")
    size_bytes: Mapped[int] = mapped_column(Integer)
    sha256: Mapped[str] = mapped_column(String(64))
    storage_path: Mapped[str] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    document: Mapped[Document] = relationship(back_populates="files")
