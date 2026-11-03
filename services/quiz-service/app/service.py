"""Domain helpers: validation, scoring, aggregation (no HTTP concerns)."""

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import qti
from .models import Attempt, AssessmentTest, Item


class BusinessError(Exception):
    """Raised by service functions; translated to the error envelope by routes."""

    def __init__(self, status: int, code: str, message: str, **details):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.details = details


def new_id() -> str:
    return uuid.uuid4().hex


def _choice_map(choices: list[dict]) -> dict[str, str]:
    return {c["identifier"]: c["text"] for c in choices}


def validate_item_fields(
    *, choices: list[dict], correct_response: list[str], interaction_type: str
) -> None:
    if interaction_type not in qti.INTERACTION_TYPES:
        raise BusinessError(
            422,
            "INVALID_INTERACTION_TYPE",
            f"interactionType must be one of {list(qti.INTERACTION_TYPES)}",
        )
    identifiers = [c["identifier"] for c in choices]
    if len(set(identifiers)) != len(identifiers):
        raise BusinessError(422, "DUPLICATE_CHOICE_IDENTIFIER", "Choice identifiers must be unique")
    unknown = [r for r in correct_response if r not in identifiers]
    if unknown:
        raise BusinessError(
            422,
            "INVALID_CORRECT_RESPONSE",
            "correctResponse must reference existing choice identifiers",
            unknown=unknown,
        )
    if interaction_type == "single_choice" and len(correct_response) != 1:
        raise BusinessError(
            422,
            "INVALID_CORRECT_RESPONSE",
            "single_choice items must have exactly one correct response",
        )


def score_response(correct_response: list[str], response: list[str]) -> tuple[bool, float]:
    """match_correct semantics: order-insensitive exact set match."""
    is_correct = sorted(response) == sorted(correct_response)
    return is_correct, (1.0 if is_correct else 0.0)


def get_item(db: Session, item_id: str) -> Item:
    item = db.get(Item, item_id)
    if item is None:
        raise BusinessError(404, "ITEM_NOT_FOUND", f"Item {item_id} not found")
    return item


def get_test(db: Session, test_id: str) -> AssessmentTest:
    test = db.get(AssessmentTest, test_id)
    if test is None:
        raise BusinessError(404, "TEST_NOT_FOUND", f"Test {test_id} not found")
    return test


def validate_sections(db: Session, sections: list[dict]) -> None:
    known = set(db.execute(select(Item.id)).scalars().all())
    for section in sections:
        unknown = [item_id for item_id in section["itemIds"] if item_id not in known]
        if unknown:
            raise BusinessError(
                422,
                "UNKNOWN_ITEM_IN_SECTION",
                f"Section '{section['title']}' references unknown items",
                unknown=unknown,
            )


def candidate_summary(db: Session, candidate_id: str) -> dict:
    attempts = (
        db.execute(
            select(Attempt)
            .where(Attempt.candidate_id == candidate_id)
            .order_by(Attempt.submitted_at)
        )
        .scalars()
        .all()
    )
    total = len(attempts)
    correct = sum(1 for a in attempts if a.is_correct)

    by_concept: dict[str, dict] = {}
    for attempt in attempts:
        item = db.get(Item, attempt.item_id)
        uri = item.concept_uri if item is not None else None
        if not uri:
            continue
        bucket = by_concept.setdefault(uri, {"total": 0, "correct": 0})
        bucket["total"] += 1
        bucket["correct"] += 1 if attempt.is_correct else 0
    for bucket in by_concept.values():
        bucket["ratio"] = round(bucket["correct"] / bucket["total"], 4) if bucket["total"] else 0.0

    return {
        "candidateId": candidate_id,
        "summary": {
            "total": total,
            "correct": correct,
            "ratio": round(correct / total, 4) if total else 0.0,
            "byConcept": by_concept,
        },
    }
