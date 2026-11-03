"""SQLAlchemy models (design §4; raw-path columns added for reingest, decision D4)."""

from datetime import datetime, timezone

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class Doc(Base):
    __tablename__ = "docs"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    title: Mapped[str] = mapped_column(String(500))
    uploader_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source_kind: Mapped[str] = mapped_column(String(20))
    source_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    render_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    doc_service_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    raw_path: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    raw_filename: Mapped[str | None] = mapped_column(String(500), nullable=True)
    sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)
    char_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[str] = mapped_column(String(40), default=utcnow)

    sections: Mapped[list["Section"]] = relationship(
        back_populates="doc", cascade="all, delete-orphan", order_by="Section.order_idx"
    )
    chunks: Mapped[list["Chunk"]] = relationship(
        back_populates="doc", cascade="all, delete-orphan"
    )


class Section(Base):
    """STAIR ToC tree: one row per section node (design §4)."""

    __tablename__ = "sections"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    doc_id: Mapped[str] = mapped_column(ForeignKey("docs.id", ondelete="CASCADE"), index=True)
    parent_id: Mapped[str | None] = mapped_column(ForeignKey("sections.id"), nullable=True)
    level: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(500))
    path: Mapped[str] = mapped_column(String(2000))
    order_idx: Mapped[int] = mapped_column(Integer)

    doc: Mapped[Doc] = relationship(back_populates="sections")


class Chunk(Base):
    __tablename__ = "chunks"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    doc_id: Mapped[str] = mapped_column(ForeignKey("docs.id", ondelete="CASCADE"), index=True)
    section_id: Mapped[str] = mapped_column(ForeignKey("sections.id", ondelete="CASCADE"))
    part: Mapped[int] = mapped_column(Integer, default=0)
    heading: Mapped[str] = mapped_column(String(500))
    path: Mapped[str] = mapped_column(String(2000))
    body: Mapped[str] = mapped_column(Text)
    char_count: Mapped[int] = mapped_column(Integer, default=0)

    doc: Mapped[Doc] = relationship(back_populates="chunks")


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    doc_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="queued")
    stage_ms: Mapped[str | None] = mapped_column(Text, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[str] = mapped_column(String(40), default=utcnow)
    updated_at: Mapped[str] = mapped_column(String(40), default=utcnow, onupdate=utcnow)
