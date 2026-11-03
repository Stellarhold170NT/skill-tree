"""Domain rules: document/chunk/alignment/file storage."""

import hashlib
import os
import re
import uuid as uuidlib
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import config
from .models import ALIGNMENT_TYPES, Alignment, Chunk, Document, DocumentFile


class BusinessError(Exception):
    def __init__(self, status: int, code: str, message: str, **details):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.details = details


def get_document(db: Session, document_id: str) -> Document:
    doc = db.get(Document, document_id)
    if doc is None:
        raise BusinessError(404, "DOCUMENT_NOT_FOUND", f"Document {document_id} not found")
    return doc


def get_chunk(db: Session, chunk_id: str) -> Chunk:
    chunk = db.get(Chunk, chunk_id)
    if chunk is None:
        raise BusinessError(404, "CHUNK_NOT_FOUND", f"Chunk {chunk_id} not found")
    return chunk


def next_order_index(db: Session, document_id: str) -> int:
    current = db.execute(
        select(Chunk.order_index)
        .where(Chunk.document_id == document_id)
        .order_by(Chunk.order_index.desc())
        .limit(1)
    ).scalar_one_or_none()
    return 0 if current is None else current + 1


def add_chunks(db: Session, document: Document, chunks_in: list[dict]) -> list[Chunk]:
    result: list[Chunk] = []
    next_index = next_order_index(db, document.id)
    for item in chunks_in:
        if item.order_index is None:
            order = next_index
            next_index += 1
        else:
            order = item.order_index
            exists = db.execute(
                select(Chunk.id).where(Chunk.document_id == document.id, Chunk.order_index == order)
            ).scalar_one_or_none()
            if exists:
                raise BusinessError(
                    409, "DUPLICATE_ORDER_INDEX", f"Chunk order {order} already exists in this document"
                )
        result.append(
            Chunk(
                document_id=document.id,
                order_index=order,
                text=item.text,
                char_count=len(item.text),
            )
        )
    db.add_all(result)
    db.commit()
    for chunk in result:
        db.refresh(chunk)
    return result


def chunks_with_alignment(db: Session, document_id: str, alignment_type: str | None) -> list[Chunk]:
    stmt = select(Chunk).where(Chunk.document_id == document_id).order_by(Chunk.order_index)
    chunks = list(db.execute(stmt).scalars().all())
    if alignment_type is None:
        return chunks
    return [
        c for c in chunks
        if any(a.alignment_type == alignment_type for a in c.alignments)
    ]


def add_alignment(db: Session, chunk: Chunk, concept_uri: str, alignment_type: str) -> Alignment:
    if alignment_type not in ALIGNMENT_TYPES:
        raise BusinessError(
            422,
            "INVALID_ALIGNMENT_TYPE",
            "alignmentType must be one of: teaches, assesses, requires, summarizes",
        )
    dup = db.execute(
        select(Alignment).where(
            Alignment.chunk_id == chunk.id,
            Alignment.concept_uri == concept_uri,
            Alignment.alignment_type == alignment_type,
        )
    ).scalar_one_or_none()
    if dup:
        raise BusinessError(
            409, "DUPLICATE_ALIGNMENT", "This chunk is already aligned to the concept with this type"
        )
    alignment = Alignment(chunk_id=chunk.id, concept_uri=concept_uri, alignment_type=alignment_type)
    db.add(alignment)
    db.commit()
    db.refresh(alignment)
    return alignment


_SAFE_NAME = re.compile(r"[^A-Za-z0-9._-]+")


def store_upload(db: Session, document: Document, filename: str, content_type: str, payload: bytes) -> DocumentFile:
    if len(payload) > config.MAX_UPLOAD_BYTES:
        raise BusinessError(
            413, "FILE_TOO_LARGE", f"Upload exceeds {config.MAX_UPLOAD_BYTES} bytes"
        )
    safe = _SAFE_NAME.sub("_", Path(filename).name) or "upload.bin"
    doc_dir = Path(config.UPLOAD_DIR) / document.id
    doc_dir.mkdir(parents=True, exist_ok=True)
    stored = f"{uuidlib.uuid4().hex[:8]}-{safe}"
    path = doc_dir / stored
    path.write_bytes(payload)
    record = DocumentFile(
        document_id=document.id,
        filename=safe,
        content_type=content_type or "application/octet-stream",
        size_bytes=len(payload),
        sha256=hashlib.sha256(payload).hexdigest(),
        storage_path=str(path),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
