"""REST API (prefix /api/v1)."""

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import config, service
from .database import get_db
from .models import Assignment
from .schemas import AssignmentCreate, AssignmentRead, AssignmentUpdate

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


@router.post("/assignments", response_model=AssignmentRead, status_code=201)
def create_assignment(payload: AssignmentCreate, db: Session = Depends(get_db)):
    if payload.target_group not in service.TARGET_GROUPS:
        raise HTTPException(
            status_code=422,
            detail={"code": "INVALID_TARGET_GROUP", "message": "targetGroup must be red, rusty or red_rusty", "details": {}},
        )
    heatmap = service.fetch_heatmap(payload.class_id, payload.concept_uri)
    students = service.students_in_group(heatmap, payload.concept_uri, payload.target_group)
    items = service.fetch_items(payload.concept_uri)
    assignment = Assignment(
        title=payload.title,
        class_id=payload.class_id,
        concept_uri=payload.concept_uri,
        target_group=payload.target_group,
        student_ids=students,
        item_ids=[item["id"] for item in items],
        due_at=payload.due_at,
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


@router.get("/assignments", response_model=list[AssignmentRead])
def list_assignments(classId: str | None = None, limit: int = 50, offset: int = 0, db: Session = Depends(get_db)):
    limit = min(max(limit, 1), 200)
    stmt = select(Assignment).order_by(Assignment.created_at)
    if classId:
        stmt = stmt.where(Assignment.class_id == classId)
    return db.execute(stmt.offset(offset).limit(limit)).scalars().all()


@router.get("/assignments/{assignment_id}", response_model=AssignmentRead)
def get_assignment(assignment_id: str, db: Session = Depends(get_db)):
    return service.get_assignment(db, assignment_id)


@router.patch("/assignments/{assignment_id}", response_model=AssignmentRead)
def update_assignment(assignment_id: str, payload: AssignmentUpdate, db: Session = Depends(get_db)):
    assignment = service.get_assignment(db, assignment_id)
    updates = payload.model_dump(exclude_unset=True)
    if "status" in updates and updates["status"] not in service.STATUSES:
        raise HTTPException(
            status_code=422,
            detail={"code": "INVALID_STATUS", "message": "status must be draft, published or closed", "details": {}},
        )
    for field, value in updates.items():
        setattr(assignment, field, value)
    db.commit()
    db.refresh(assignment)
    return assignment


@router.delete("/assignments/{assignment_id}", status_code=204)
def delete_assignment(assignment_id: str, db: Session = Depends(get_db)):
    assignment = service.get_assignment(db, assignment_id)
    db.delete(assignment)
    db.commit()
    return None


@router.post("/assignments/{assignment_id}/quiz")
def create_assignment_quiz(assignment_id: str, db: Session = Depends(get_db)):
    assignment = service.get_assignment(db, assignment_id)
    test = service.generate_quiz(db, assignment)
    assignment.quiz_test_id = test["id"]
    db.commit()
    db.refresh(assignment)
    return {
        "assignmentId": assignment.id,
        "quizTestId": test["id"],
        "quizIdentifier": test["identifier"],
        "itemIds": assignment.item_ids,
        "studentIds": assignment.student_ids,
    }
