"""REST API (prefix /api/v1). Handlers stay thin; logic lives in service.py / qti.py."""

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import config, qti, service
from .database import get_db
from .models import Attempt, AssessmentTest, Item
from .schemas import (
    AttemptBulkRequest,
    AttemptCreate,
    AttemptRead,
    ImportQtiRequest,
    ItemCreate,
    ItemRead,
    ItemUpdate,
    TestCreate,
    TestRead,
)

router = APIRouter(prefix="/api/v1")


@router.get("/health")
def health():
    return {"status": "ok", "service": config.SERVICE_NAME, "version": config.SERVICE_VERSION}


def _fail(status: int, code: str, message: str, **details) -> None:
    raise HTTPException(status_code=status, detail={"code": code, "message": message, "details": details})


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


def _to_item_model_fields(data: dict) -> dict:
    return {
        "title": data["title"],
        "prompt": data["prompt"],
        "interaction_type": data["interactionType"],
        "choices": data["choices"],
        "correct_response": data["correctResponse"],
        "shuffle": data.get("shuffle", True),
    }


# ---------- items ----------


@router.post("/items", response_model=ItemRead, status_code=201)
def create_item(payload: ItemCreate, db: Session = Depends(get_db)):
    choices = [c.model_dump() for c in payload.choices]
    service.validate_item_fields(
        choices=choices,
        correct_response=payload.correct_response,
        interaction_type=payload.interaction_type,
    )
    item = Item(
        title=payload.title,
        prompt=payload.prompt,
        interaction_type=payload.interaction_type,
        choices=choices,
        correct_response=payload.correct_response,
        shuffle=payload.shuffle,
        concept_uri=payload.concept_uri,
        difficulty=payload.difficulty,
        discrimination=payload.discrimination,
        language=payload.language,
        identifier=qti.new_item_identifier(),
    )
    item.id = service.new_id()
    item.qti_xml = qti.build_item_xml(
        identifier=item.identifier,
        title=item.title,
        prompt=item.prompt,
        choices=choices,
        correct_response=payload.correct_response,
        interaction_type=payload.interaction_type,
        shuffle=payload.shuffle,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.post("/items/import-qti", response_model=ItemRead, status_code=201)
def import_item_qti(payload: ImportQtiRequest, db: Session = Depends(get_db)):
    try:
        parsed = qti.parse_item_xml(payload.qti_xml)
    except ValueError as exc:
        _fail(422, "PARSE_ERROR", str(exc))
    existing = db.execute(
        select(Item).where(Item.identifier == parsed["identifier"])
    ).scalar_one_or_none()
    if existing is not None:
        _fail(409, "DUPLICATE_IDENTIFIER", f"Item identifier '{parsed['identifier']}' already exists")
    item = Item(identifier=parsed["identifier"], **_to_item_model_fields(parsed))
    item.id = service.new_id()
    item.qti_xml = payload.qti_xml
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/items", response_model=list[ItemRead])
def list_items(
    conceptUri: str | None = None,
    interactionType: str | None = None,
    q: str | None = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    limit = min(max(limit, 1), 200)
    stmt = select(Item).order_by(Item.created_at)
    if conceptUri:
        stmt = stmt.where(Item.concept_uri == conceptUri)
    if interactionType:
        stmt = stmt.where(Item.interaction_type == interactionType)
    if q:
        like = f"%{q}%"
        stmt = stmt.where((Item.title.ilike(like)) | (Item.prompt.ilike(like)))
    return db.execute(stmt.offset(offset).limit(limit)).scalars().all()


@router.get("/items/{item_id}", response_model=ItemRead)
def get_item(item_id: str, db: Session = Depends(get_db)):
    return service.get_item(db, item_id)


@router.patch("/items/{item_id}", response_model=ItemRead)
def update_item(item_id: str, payload: ItemUpdate, db: Session = Depends(get_db)):
    item = service.get_item(db, item_id)
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        if field == "choices" and value is not None:
            value = [c.model_dump() if hasattr(c, "model_dump") else c for c in value]
        setattr(item, field, value)
    service.validate_item_fields(
        choices=item.choices,
        correct_response=item.correct_response,
        interaction_type=item.interaction_type,
    )
    item.qti_xml = qti.build_item_xml(
        identifier=item.identifier,
        title=item.title,
        prompt=item.prompt,
        choices=item.choices,
        correct_response=item.correct_response,
        interaction_type=item.interaction_type,
        shuffle=item.shuffle,
    )
    db.commit()
    db.refresh(item)
    return item


@router.delete("/items/{item_id}", status_code=204)
def delete_item(item_id: str, db: Session = Depends(get_db)):
    item = service.get_item(db, item_id)
    db.delete(item)
    db.commit()
    return None


@router.get("/items/{item_id}/qti")
def get_item_qti(item_id: str, db: Session = Depends(get_db)):
    item = service.get_item(db, item_id)
    return Response(content=item.qti_xml, media_type="application/xml")


# ---------- tests (assessment test assembly) ----------


@router.post("/tests", response_model=TestRead, status_code=201)
def create_test(payload: TestCreate, db: Session = Depends(get_db)):
    existing = db.execute(
        select(AssessmentTest).where(AssessmentTest.identifier == payload.identifier)
    ).scalar_one_or_none()
    if existing is not None:
        _fail(409, "DUPLICATE_IDENTIFIER", f"Test identifier '{payload.identifier}' already exists")
    sections = [
        {"title": s.title, "itemIds": list(s.item_ids)} for s in payload.sections
    ]
    service.validate_sections(db, sections)
    test = AssessmentTest(
        identifier=payload.identifier, title=payload.title, sections=sections
    )
    test.id = service.new_id()
    db.add(test)
    db.commit()
    db.refresh(test)
    return test


@router.get("/tests", response_model=list[TestRead])
def list_tests(limit: int = 50, offset: int = 0, db: Session = Depends(get_db)):
    limit = min(max(limit, 1), 200)
    stmt = select(AssessmentTest).order_by(AssessmentTest.created_at)
    return db.execute(stmt.offset(offset).limit(limit)).scalars().all()


@router.get("/tests/{test_id}")
def get_test(test_id: str, db: Session = Depends(get_db)):
    test = service.get_test(db, test_id)
    resolved = []
    for section in test.sections:
        items = [service.get_item(db, item_id) for item_id in section["itemIds"]]
        resolved.append(
            {
                "title": section["title"],
                "itemIds": section["itemIds"],
                "items": [
                    ItemRead.model_validate(i).model_dump(by_alias=True) for i in items
                ],
            }
        )
    body = TestRead.model_validate(test).model_dump(by_alias=True)
    body["sections"] = resolved
    return body


@router.delete("/tests/{test_id}", status_code=204)
def delete_test(test_id: str, db: Session = Depends(get_db)):
    test = service.get_test(db, test_id)
    db.delete(test)
    db.commit()
    return None


# ---------- attempts / scoring ----------


@router.post("/attempts", response_model=AttemptRead, status_code=201)
def submit_attempt(payload: AttemptCreate, db: Session = Depends(get_db)):
    item = service.get_item(db, payload.item_id)
    is_correct, score = service.score_response(item.correct_response, payload.response)
    attempt = Attempt(
        item_id=item.id,
        test_id=payload.test_id,
        candidate_id=payload.candidate_id,
        response=payload.response,
        is_correct=is_correct,
        score=score,
    )
    attempt.id = service.new_id()
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    return attempt


@router.post("/attempts/bulk")
def submit_attempts_bulk(payload: AttemptBulkRequest, db: Session = Depends(get_db)):
    # Validate everything first — atomic: no partial writes on unknown items.
    resolved: list[tuple] = []
    for entry in payload.responses:
        item = service.get_item(db, entry.item_id)  # raises 404 for unknown item
        resolved.append((item, entry.response))

    attempts: list[Attempt] = []
    for item, response in resolved:
        is_correct, score = service.score_response(item.correct_response, response)
        attempt = Attempt(
            item_id=item.id,
            test_id=payload.test_id,
            candidate_id=payload.candidate_id,
            response=response,
            is_correct=is_correct,
            score=score,
        )
        attempt.id = service.new_id()
        db.add(attempt)
        attempts.append(attempt)
    db.commit()

    correct = sum(1 for a in attempts if a.is_correct)
    total = len(attempts)
    return {
        "candidateId": payload.candidate_id,
        "testId": payload.test_id,
        "scored": total,
        "correct": correct,
        "ratio": round(correct / total, 4) if total else 0.0,
        "attempts": [AttemptRead.model_validate(a).model_dump(by_alias=True) for a in attempts],
    }


@router.get("/candidates/{candidate_id}/outcomes")
def candidate_outcomes(candidate_id: str, db: Session = Depends(get_db)):
    summary = service.candidate_summary(db, candidate_id)
    attempts = (
        db.execute(
            select(Attempt)
            .where(Attempt.candidate_id == candidate_id)
            .order_by(Attempt.submitted_at)
        )
        .scalars()
        .all()
    )
    summary["attempts"] = [AttemptRead.model_validate(a).model_dump(by_alias=True) for a in attempts]
    return summary


@router.get("/candidates/{candidate_id}/history", response_model=list[AttemptRead])
def candidate_history(candidate_id: str, db: Session = Depends(get_db)):
    stmt = (
        select(Attempt)
        .where(Attempt.candidate_id == candidate_id)
        .order_by(Attempt.submitted_at)
    )
    return db.execute(stmt).scalars().all()
