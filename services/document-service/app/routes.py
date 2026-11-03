"""REST API (prefix /api/v1)."""

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import config, service
from .database import get_db
from .models import Alignment, Document, DocumentFile
from .schemas import (
    AlignmentCreate,
    AlignmentRead,
    ChunkRead,
    ChunksCreate,
    DocumentCreate,
    DocumentRead,
    FileRead,
)
from .models import Chunk

router = APIRouter(prefix="/api/v1")


@router.get("/health")
def health():
    return {"status": "ok", "service": config.SERVICE_NAME, "version": config.SERVICE_VERSION}


# ---------- error envelope ----------


def _business_error_handler(request: Request, exc: service.BusinessError):
    return JSONResponse(
        status_code=exc.status,
        content={"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
    )


def _http_error_handler(request: Request, exc: HTTPException):
    detail = exc.detail
    if isinstance(detail, dict) and "code" in detail:
        payload = {"error": detail}
    else:
        payload = {"error": {"code": "HTTP_ERROR", "message": str(detail), "details": {}}}
    return JSONResponse(status_code=exc.status_code, content=payload)


def _validation_error_handler(request: Request, exc: RequestValidationError):
    errors = [
        {"loc": [str(x) for x in err.get("loc", [])], "msg": err.get("msg", ""), "type": err.get("type", "")}
        for err in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed",
                "details": {"errors": errors},
            }
        },
    )


def register_exception_handlers(app):
    app.add_exception_handler(service.BusinessError, _business_error_handler)
    app.add_exception_handler(HTTPException, _http_error_handler)
    app.add_exception_handler(RequestValidationError, _validation_error_handler)


# ---------- documents ----------


@router.post("/documents", response_model=DocumentRead, status_code=201)
def create_document(payload: DocumentCreate, db: Session = Depends(get_db)):
    doc = Document(**payload.model_dump())
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.get("/documents", response_model=list[DocumentRead])
def list_documents(limit: int = 50, offset: int = 0, db: Session = Depends(get_db)):
    limit = min(max(limit, 1), 200)
    stmt = select(Document).order_by(Document.created_at).offset(offset).limit(limit)
    return db.execute(stmt).scalars().all()


@router.get("/documents/{document_id}", response_model=DocumentRead)
def get_document(document_id: str, db: Session = Depends(get_db)):
    return service.get_document(db, document_id)


@router.delete("/documents/{document_id}", status_code=204)
def delete_document(document_id: str, db: Session = Depends(get_db)):
    doc = service.get_document(db, document_id)
    db.delete(doc)
    db.commit()
    return None


# ---------- files ----------


@router.post("/documents/{document_id}/upload", response_model=FileRead, status_code=201)
def upload_file(document_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    doc = service.get_document(db, document_id)
    payload = file.file.read()
    record = service.store_upload(db, doc, file.filename or "upload.bin", file.content_type, payload)
    return record


@router.get("/documents/{document_id}/files", response_model=list[FileRead])
def list_files(document_id: str, db: Session = Depends(get_db)):
    service.get_document(db, document_id)
    stmt = select(DocumentFile).where(DocumentFile.document_id == document_id).order_by(DocumentFile.created_at)
    return db.execute(stmt).scalars().all()


# ---------- chunks + alignments ----------


@router.post("/documents/{document_id}/chunks", response_model=list[ChunkRead], status_code=201)
def create_chunks(document_id: str, payload: ChunksCreate, db: Session = Depends(get_db)):
    doc = service.get_document(db, document_id)
    if not payload.chunks:
        raise HTTPException(
            422, detail={"code": "EMPTY_CHUNKS", "message": "chunks must not be empty", "details": {}}
        )
    created = service.add_chunks(db, doc, payload.chunks)
    return created


@router.get("/documents/{document_id}/chunks", response_model=list[ChunkRead])
def list_chunks(document_id: str, alignmentType: str | None = None, db: Session = Depends(get_db)):
    service.get_document(db, document_id)
    return service.chunks_with_alignment(db, document_id, alignmentType)


@router.post("/chunks/{chunk_id}/alignments", response_model=AlignmentRead, status_code=201)
def create_alignment(chunk_id: str, payload: AlignmentCreate, db: Session = Depends(get_db)):
    chunk = service.get_chunk(db, chunk_id)
    return service.add_alignment(db, chunk, payload.concept_uri, payload.alignment_type)


@router.get("/chunks/{chunk_id}/alignments", response_model=list[AlignmentRead])
def list_alignments(chunk_id: str, db: Session = Depends(get_db)):
    chunk = service.get_chunk(db, chunk_id)
    return chunk.alignments
