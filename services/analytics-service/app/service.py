"""Domain rules: event-type vocabulary + append helpers."""

from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .models import LearningEvent

# Caliper-aligned profile names used by the platform (MODULES.md section 5).
EVENT_TYPES = {
    "AssessmentItemSubmitted",
    "ResourceViewed",
    "ToolUsed",
    "NavigationEvent",
}


class BusinessError(Exception):
    def __init__(self, status: int, code: str, message: str, **details):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.details = details


def validate_type(event_type: str) -> None:
    if event_type not in EVENT_TYPES:
        raise BusinessError(
            422,
            "UNKNOWN_EVENT_TYPE",
            f"Event type '{event_type}' is not part of the platform profile",
            allowed=sorted(EVENT_TYPES),
        )


def append(db: Session, **fields) -> LearningEvent:
    event = LearningEvent(**fields)
    db.add(event)
    return event


def exists(db: Session, event_id: str) -> bool:
    return db.get(LearningEvent, event_id) is not None


def query_events(
    db: Session,
    *,
    actor_id: str | None = None,
    object_id: str | None = None,
    event_type: str | None = None,
    since: datetime | None = None,
    until: datetime | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[LearningEvent]:
    limit = min(max(limit, 1), 500)
    stmt = select(LearningEvent).order_by(LearningEvent.occurred_at, LearningEvent.event_id)
    if actor_id:
        stmt = stmt.where(LearningEvent.actor_id == actor_id)
    if object_id:
        stmt = stmt.where(LearningEvent.object_id == object_id)
    if event_type:
        stmt = stmt.where(LearningEvent.type == event_type)
    if since:
        stmt = stmt.where(LearningEvent.occurred_at >= since)
    if until:
        stmt = stmt.where(LearningEvent.occurred_at <= until)
    return db.execute(stmt.offset(offset).limit(limit)).scalars().all()


def last_interaction(db: Session, concept_uri: str) -> dict:
    row = db.execute(
        select(
            func.max(LearningEvent.occurred_at),
            func.count(LearningEvent.event_id),
        ).where(LearningEvent.object_id == concept_uri)
    ).one()
    last_at, count = row
    last_type = None
    if last_at is not None:
        last_type = db.execute(
            select(LearningEvent.type)
            .where(LearningEvent.object_id == concept_uri)
            .order_by(LearningEvent.occurred_at.desc())
            .limit(1)
        ).scalar_one()
    return {
        "conceptUri": concept_uri,
        "lastInteractionAt": last_at,
        "lastEventType": last_type,
        "eventCount": count,
    }
