"""REST API (prefix /api/v1)."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from . import config, service
from .database import get_db
from .schemas import BulkUpdateRequest, MasteryRead, UpdateRequest

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


# ---------- student mastery ----------


@router.post("/students/{student_id}/update", response_model=MasteryRead, status_code=201)
def update_mastery(student_id: str, payload: UpdateRequest, db: Session = Depends(get_db)):
    record = service.apply_attempt(
        db, student_id, payload.concept_uri, payload.is_correct, payload.occurred_at
    )
    return service.record_payload(record)


@router.post("/students/{student_id}/update/bulk")
def update_mastery_bulk(student_id: str, payload: BulkUpdateRequest, db: Session = Depends(get_db)):
    records = []
    for entry in payload.responses:
        records.append(
            service.apply_attempt(
                db, student_id, entry.concept_uri, entry.is_correct, entry.occurred_at
            )
        )
    return {
        "updated": len(records),
        "mastery": service.student_mastery(db, student_id),
    }


@router.get("/students/{student_id}/mastery", response_model=list[MasteryRead])
def get_mastery(student_id: str, asOf: datetime | None = None, db: Session = Depends(get_db)):
    return service.student_mastery(db, student_id, asOf)


@router.get("/students/{student_id}/next")
def next_concept(student_id: str, documentId: str, db: Session = Depends(get_db)):
    graph = service.fetch_document_graph(documentId)
    mastery = service.student_mastery(db, student_id)
    mastery_by_concept = {entry["conceptUri"]: entry for entry in mastery}
    candidates = service.frontier(graph, mastery_by_concept)
    if not candidates:
        return {
            "studentId": student_id,
            "documentId": documentId,
            "conceptUri": None,
            "explanation": "All concepts in this document are green — nothing is ready to learn next.",
            "alternatives": [],
        }
    best = candidates[0]
    explanation = (
        f"All prerequisites are green and this concept unlocks {len(best['unlocks'])} follow-up "
        f"concept(s) — highest unlock value among {len(candidates)} ready concept(s)."
    )
    return {
        "studentId": student_id,
        "documentId": documentId,
        "conceptUri": best["conceptUri"],
        "mastery": best["mastery"],
        "state": best["state"],
        "unlocks": best["unlocks"],
        "explanation": explanation,
        "alternatives": [
            {"conceptUri": c["conceptUri"], "mastery": c["mastery"], "unlocks": c["unlocks"]}
            for c in candidates[1:4]
        ],
    }


# ---------- class-level views ----------


@router.get("/classes/{class_id}/heatmap")
def class_heatmap(class_id: str, documentId: str, db: Session = Depends(get_db)):
    students = service.fetch_class_students(class_id)
    graph = service.fetch_document_graph(documentId)
    board = service.heatmap(db, students, graph)
    board["classId"] = class_id
    board["documentId"] = documentId
    return board


@router.get("/classes/{class_id}/teaching-plan")
def class_teaching_plan(
    class_id: str,
    documentId: str,
    topN: int = 5,
    db: Session = Depends(get_db),
):
    students = service.fetch_class_students(class_id)
    graph = service.fetch_document_graph(documentId)
    plan = service.teaching_plan(db, students, graph, top_n=min(max(topN, 1), 20))
    return {"classId": class_id, "documentId": documentId, "plan": plan}
