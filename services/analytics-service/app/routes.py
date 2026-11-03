"""REST API (prefix /api/v1). Append-only: no update/delete of events."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from . import config, service
from .database import get_db
from .schemas import BatchIn, EventIn, EventRead, LastInteractionRead
from sqlalchemy import select

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


def _fail(status: int, code: str, message: str, **details) -> None:
    raise HTTPException(status_code=status, detail={"code": code, "message": message, "details": details})


def _event_model_fields(event: EventIn) -> dict:
    return {
        "event_id": event.event_id,
        "type": event.type,
        "occurred_at": event.occurred_at or datetime.now(timezone.utc),
        "actor_id": event.actor.id,
        "actor_type": event.actor.type,
        "object_id": event.object.id,
        "object_type": event.object.type,
        "payload": event.payload,
        "producer": event.producer,
    }


@router.post("/events", response_model=EventRead, status_code=201)
def append_event(payload: EventIn, db: Session = Depends(get_db)):
    service.validate_type(payload.type)
    if payload.event_id and service.exists(db, payload.event_id):
        _fail(409, "DUPLICATE_EVENT_ID", f"Event {payload.event_id} already exists")
    event = service.append(db, **_event_model_fields(payload))
    db.commit()
    db.refresh(event)
    return event


@router.post("/events/batch")
def append_events_batch(payload: BatchIn, db: Session = Depends(get_db)):
    # Atomic: validate everything first, then write — duplicates abort the whole batch.
    for event in payload.events:
        service.validate_type(event.type)
        if event.event_id and service.exists(db, event.event_id):
            _fail(409, "DUPLICATE_EVENT_ID", f"Event {event.event_id} already exists")
    events = [service.append(db, **_event_model_fields(event)) for event in payload.events]
    db.commit()
    return {"accepted": len(events), "eventIds": [e.event_id for e in events]}


@router.get("/events", response_model=list[EventRead])
def list_events(
    actorId: str | None = None,
    objectId: str | None = None,
    type: str | None = None,
    since: datetime | None = None,
    until: datetime | None = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    rows = service.query_events(
        db,
        actor_id=actorId,
        object_id=objectId,
        event_type=type,
        since=since,
        until=until,
        limit=limit,
        offset=offset,
    )
    return rows


@router.get("/concepts/{concept_uri:path}/last-interaction", response_model=LastInteractionRead)
def concept_last_interaction(concept_uri: str, db: Session = Depends(get_db)):
    return service.last_interaction(db, concept_uri)
