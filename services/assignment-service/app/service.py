"""Domain rules + cross-service reads (M5 heatmap, M2 item bank)."""

import httpx
from sqlalchemy.orm import Session

from . import config
from .models import Assignment

TARGET_GROUPS = {"red", "rusty", "red_rusty"}
STATUSES = {"draft", "published", "closed"}


class BusinessError(Exception):
    def __init__(self, status: int, code: str, message: str, **details):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.details = details


def fetch_heatmap(class_id: str, document_id: str) -> dict:
    """M5 class heatmap: {students: [...], concepts: [...], cells: {sid: {uri: state}}}."""
    url = f"{config.LEARNER_BASE_URL}/api/v1/classes/{class_id}/heatmap"
    try:
        resp = httpx.get(url, params={"documentId": document_id}, timeout=5.0)
        resp.raise_for_status()
        return resp.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise BusinessError(
            503, "HEATMAP_UNAVAILABLE", f"learner-model-service heatmap fetch failed: {exc}"
        ) from exc


def fetch_items(concept_uri: str) -> list[dict]:
    """M2 item bank filtered by conceptUri: [{id, identifier, ...}]."""
    url = f"{config.QUIZ_BASE_URL}/api/v1/items"
    try:
        resp = httpx.get(url, params={"conceptUri": concept_uri}, timeout=5.0)
        resp.raise_for_status()
        return resp.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise BusinessError(
            503, "ITEMS_UNAVAILABLE", f"quiz-service item fetch failed: {exc}"
        ) from exc


def students_in_group(heatmap: dict, concept_uri: str, target_group: str) -> list[str]:
    """Pseudonymous sourcedIds whose cell state matches the target group."""
    wanted = {"red", "rusty"} if target_group == "red_rusty" else {target_group}
    picked: list[str] = []
    for student in heatmap.get("students", []):
        state = heatmap.get("cells", {}).get(student, {}).get(concept_uri)
        if state == "none":
            continue
        if state in wanted:
            picked.append(student)
    return sorted(picked)


def get_assignment(db: Session, assignment_id: str) -> Assignment:
    assignment = db.get(Assignment, assignment_id)
    if assignment is None:
        raise BusinessError(404, "ASSIGNMENT_NOT_FOUND", f"Assignment {assignment_id} not found")
    return assignment


def generate_quiz(db: Session, assignment: Assignment) -> dict:
    """Create an M2 assessment test from the assignment's items (idempotent-guarded)."""
    if assignment.quiz_test_id:
        raise BusinessError(409, "QUIZ_ALREADY_GENERATED", "This assignment already has a quiz test")
    if not assignment.item_ids:
        raise BusinessError(422, "NO_ITEMS", "Assignment has no quiz items to assemble")
    payload = {
        "identifier": f"ASG-{assignment.id[:12]}",
        "title": assignment.title,
        "sections": [{"title": assignment.concept_uri, "itemIds": assignment.item_ids}],
    }
    try:
        resp = httpx.post(
            f"{config.QUIZ_BASE_URL}/api/v1/tests", json=payload, timeout=5.0
        )
    except httpx.HTTPError as exc:
        raise BusinessError(
            503, "QUIZ_SERVICE_UNAVAILABLE", f"quiz-service test creation failed: {exc}"
        ) from exc
    if resp.status_code == 409:
        raise BusinessError(409, "QUIZ_ALREADY_GENERATED", "quiz-service already has this test identifier")
    if resp.status_code != 201:
        raise BusinessError(
            502, "QUIZ_TEST_REJECTED", f"quiz-service rejected the test payload ({resp.status_code})"
        )
    return resp.json()
