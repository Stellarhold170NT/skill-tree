"""REST API (prefix /api/v1). Handlers stay thin; logic lives in service/ingest/search."""

import hashlib
import json
import re
import shutil
import time
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from . import config, ingest, latexml_client, llm, search, service
from .database import get_db
from .metrics import metrics
from .models import Chunk, Doc, Job, Section
from .schemas import AskRequest

router = APIRouter(prefix="/api/v1")

_SAFE_NAME = re.compile(r"[^A-Za-z0-9._-]+")


# ---------------------------------------------------------------------------
# error envelope (platform contract, services/README)
# ---------------------------------------------------------------------------


def _fail(status: int, code: str, message: str, **details) -> None:
    raise HTTPException(
        status_code=status, detail={"code": code, "message": message, "details": details}
    )


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


# ---------------------------------------------------------------------------
# health + metrics
# ---------------------------------------------------------------------------


@router.get("/health")
def health():
    return {"status": "ok", "service": config.SERVICE_NAME, "version": config.SERVICE_VERSION}


@router.get("/metrics")
def get_metrics():
    return metrics.snapshot()


# ---------------------------------------------------------------------------
# upload + jobs
# ---------------------------------------------------------------------------


@router.post("/documents/upload", status_code=202)
async def upload_document(
    file: UploadFile = File(...),
    title: str | None = Form(None),
    uploader_id: str | None = Form(None, alias="uploaderId"),
    db: Session = Depends(get_db),
):
    payload = await file.read()
    if len(payload) > config.MAX_UPLOAD_MB * 1024 * 1024:
        _fail(413, "DOCUMENT_TOO_LARGE", f"Upload exceeds {config.MAX_UPLOAD_MB}MB")
    filename = file.filename or "upload.bin"
    kind = config.kind_for(filename)
    if kind is None:
        _fail(
            422,
            "UNSUPPORTED_TYPE",
            f"Unsupported file type: {filename}",
            supported=list(config.SUPPORTED_SUFFIXES),
        )

    doc_id, job_id = service.new_id(), service.new_id()
    safe = _SAFE_NAME.sub("_", Path(filename).name) or "upload.bin"
    doc_dir = Path(config.UPLOAD_DIR) / doc_id
    doc_dir.mkdir(parents=True, exist_ok=True)
    raw_path = doc_dir / safe
    raw_path.write_bytes(payload)

    doc = Doc(
        id=doc_id,
        title=(title or Path(filename).stem or "Untitled").strip()[:500],
        uploader_id=uploader_id,
        source_kind=kind,
        raw_path=str(raw_path),
        raw_filename=safe,
        sha256=hashlib.sha256(payload).hexdigest(),
    )
    job = Job(id=job_id, doc_id=doc_id, status="queued")
    db.add(doc)
    db.add(job)
    db.commit()
    metrics.upload_total += 1
    ingest.schedule_ingest(job_id)
    return {"jobId": job_id, "statusUrl": f"/api/v1/jobs/{job_id}", "docId": doc_id}


@router.get("/jobs/{job_id}")
def job_status(job_id: str, db: Session = Depends(get_db)):
    job = service.get_job(db, job_id)
    body: dict = {"jobId": job.id, "status": job.status, "docId": job.doc_id}
    if job.stage_ms:
        body["stageMs"] = json.loads(job.stage_ms)
    if job.error:
        body["error"] = job.error
    return body


# ---------------------------------------------------------------------------
# documents
# ---------------------------------------------------------------------------


@router.get("/documents")
def list_documents(
    uploaderId: str | None = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    limit = min(max(limit, 1), 200)
    stmt = select(Doc).order_by(Doc.created_at)
    if uploaderId:
        stmt = stmt.where(Doc.uploader_id == uploaderId)
    docs = db.execute(stmt.offset(offset).limit(limit)).scalars().all()
    out = []
    for doc in docs:
        entry = {
            "id": doc.id,
            "title": doc.title,
            "sourceKind": doc.source_kind,
            "charCount": doc.char_count,
            "sections": len(doc.sections),
            "chunks": len(doc.chunks),
            "createdAt": doc.created_at,
        }
        if doc.source_url:
            entry["sourceUrl"] = doc.source_url
        out.append(entry)
    return out


@router.get("/documents/{doc_id}")
def get_document(doc_id: str, db: Session = Depends(get_db)):
    doc = service.get_doc(db, doc_id)
    sections = [
        {
            "id": s.id,
            "level": s.level,
            "title": s.title,
            "path": s.path,
            "orderIdx": s.order_idx,
        }
        for s in doc.sections
    ]
    body: dict = {
        "id": doc.id,
        "title": doc.title,
        "sourceKind": doc.source_kind,
        "charCount": doc.char_count,
        "createdAt": doc.created_at,
        "sections": sections,
        "chunks": len(doc.chunks),
    }
    if doc.source_url:
        body["sourceUrl"] = doc.source_url
    if doc.doc_service_id:
        body["docServiceId"] = doc.doc_service_id
    return body


@router.delete("/documents/{doc_id}", status_code=204)
def delete_document(doc_id: str, db: Session = Depends(get_db)):
    doc = service.get_doc(db, doc_id)
    raw_dir = Path(doc.raw_path).parent if doc.raw_path else None
    # Deterministic FK-safe order (self-FK on sections.parent_id defeats the ORM
    # unit-of-work sort): chunks → null parent links → sections → doc.
    # Raw bulk DELETEs keep the FTS5 delete triggers firing per row.
    db.execute(delete(Chunk).where(Chunk.doc_id == doc.id))
    db.execute(update(Section).where(Section.doc_id == doc.id).values(parent_id=None))
    db.execute(delete(Section).where(Section.doc_id == doc.id))
    db.execute(delete(Doc).where(Doc.id == doc.id))
    db.commit()
    if raw_dir is not None:
        shutil.rmtree(raw_dir, ignore_errors=True)
    return None


@router.post("/documents/{doc_id}/reingest", status_code=202)
def reingest_document(doc_id: str, db: Session = Depends(get_db)):
    doc = service.get_doc(db, doc_id)
    if doc.source_kind == "latexml" and not latexml_client.latexml_available():
        _fail(502, "LATEXML_UNAVAILABLE", f"latexml not reachable at {config.LATEXML_BASE_URL}")
    job_id = service.new_id()
    job = Job(id=job_id, doc_id=doc.id, status="queued")
    db.add(job)
    db.commit()
    ingest.schedule_ingest(job_id)
    return {"jobId": job_id, "statusUrl": f"/api/v1/jobs/{job_id}", "docId": doc.id}


# ---------------------------------------------------------------------------
# ask
# ---------------------------------------------------------------------------


@router.post("/ask")
def ask(payload: AskRequest, db: Session = Depends(get_db)):
    question = (payload.question or "").strip()
    if not question:
        _fail(422, "EMPTY_QUESTION", "question must not be empty")
    top_k = payload.top_k or config.DEFAULT_TOPK
    metrics.ask_total += 1

    hits, retrieve_ms = search.retrieve(question, payload.document_ids, top_k)
    metrics.retrieve.observe(retrieve_ms)
    body: dict = {
        "mode": "retrieve",
        "question": question,
        "timings": {"retrieveMs": round(retrieve_ms, 2)},
        "citations": search.assemble_citations(db, hits),
    }

    if payload.mode == "answer":
        t0 = time.perf_counter()
        answer, llm_error = llm.synthesize(question, body["citations"])
        generate_ms = (time.perf_counter() - t0) * 1000
        metrics.generate.observe(generate_ms)
        body["timings"]["generateMs"] = round(generate_ms, 2)
        if answer:
            body["mode"] = "answer"
            body["answer"] = answer
        else:
            body["llmError"] = llm_error
    return body
