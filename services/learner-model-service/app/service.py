"""Mastery state machine + cross-service read models (graph, roster).

Integration with other modules goes through small, monkeypatch-friendly
functions (fetch_document_graph / fetch_class_students) so the core stays
testable without live neighbors.
"""

import math
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import config, glicko
from .models import MasteryRecord


class BusinessError(Exception):
    def __init__(self, status: int, code: str, message: str, **details):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.details = details


# ---------- cross-service reads (HTTP, short timeout, no back-references) ----------


def fetch_document_graph(document_id: str) -> dict:
    """M1 graph for a course framework: {nodes: [...], edges: [...]}."""
    url = f"{config.OPENCASE_BASE_URL}/api/v1/documents/{document_id}/graph"
    try:
        resp = httpx.get(url, timeout=5.0)
        resp.raise_for_status()
        return resp.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise BusinessError(
            503, "GRAPH_UNAVAILABLE", f"opencase-service graph fetch failed: {exc}"
        ) from exc


def fetch_class_students(class_id: str) -> list[dict]:
    """M6 roster: students of a class ([{sourcedId, displayName, ...}])."""
    url = f"{config.CLASS_BASE_URL}/api/v1/classes/{class_id}/students"
    try:
        resp = httpx.get(url, timeout=5.0)
        resp.raise_for_status()
        return resp.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise BusinessError(
            503, "ROSTER_UNAVAILABLE", f"class-service roster fetch failed: {exc}"
        ) from exc


# ---------- mastery math ----------


def _as_utc(dt: datetime) -> datetime:
    """SQLite returns naive datetimes; treat them as UTC."""
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


def mastery_of(rating: float) -> float:
    """Map Glicko rating to mastery probability vs the reference player (0..1)."""
    return 1.0 / (1.0 + math.exp(-(rating - 1500.0) / glicko.GLICKO_SCALE))


def retention(record: MasteryRecord, now: datetime) -> float:
    """Ebbinghaus retention R(t)=exp(-Δt/S); stability grows with review count."""
    delta_days = max(
        0.0, (_as_utc(now) - _as_utc(record.last_played_at)).total_seconds() / 86400.0
    )
    stability = max(
        config.BASE_STABILITY_DAYS,
        config.BASE_STABILITY_DAYS + config.STABILITY_PER_REVIEW_DAYS * record.review_count,
    )
    return math.exp(-delta_days / stability)


def compute_state(record: MasteryRecord, now: datetime | None = None) -> str:
    """red | amber | green | rusty (decay overrides green/amber on read)."""
    now = now or datetime.now(timezone.utc)
    mastery = mastery_of(record.rating)
    if mastery < config.MASTERY_AMBER:
        return "red"
    if retention(record, now) < config.RETENTION_RUSTY:
        return "rusty"
    if mastery < config.MASTERY_GREEN:
        return "amber"
    return "green"


def get_record(db: Session, student_id: str, concept_uri: str) -> MasteryRecord | None:
    return db.execute(
        select(MasteryRecord).where(
            MasteryRecord.student_sourced_id == student_id,
            MasteryRecord.concept_uri == concept_uri,
        )
    ).scalar_one_or_none()


def apply_attempt(
    db: Session,
    student_id: str,
    concept_uri: str,
    is_correct: bool,
    occurred_at: datetime | None = None,
) -> MasteryRecord:
    """One attempt = one rating period vs the reference opponent."""
    record = get_record(db, student_id, concept_uri)
    if record is None:
        record = MasteryRecord(student_sourced_id=student_id, concept_uri=concept_uri)
        db.add(record)
        db.flush()

    when = occurred_at or datetime.now(timezone.utc)
    idle_days = max(
        0.0, (_as_utc(when) - _as_utc(record.last_played_at)).total_seconds() / 86400.0
    )
    rd_after_idle = glicko.add_inactivity_rd(record.rating_deviation, idle_days)

    score = 1.0 if is_correct else 0.0
    new_rating, new_rd, new_vol = glicko.rate(
        record.rating,
        rd_after_idle,
        record.volatility,
        [(glicko.REFERENCE_RATING, glicko.REFERENCE_RD, score)],
    )
    record.rating = new_rating
    record.rating_deviation = new_rd
    record.volatility = new_vol
    record.review_count += 1
    record.last_played_at = when
    db.commit()
    db.refresh(record)
    return record


def record_payload(record: MasteryRecord, now: datetime | None = None) -> dict:
    """Serialized mastery record incl. computed mastery + state (for responses)."""
    return {
        "conceptUri": record.concept_uri,
        "rating": round(record.rating, 2),
        "ratingDeviation": round(record.rating_deviation, 2),
        "volatility": round(record.volatility, 5),
        "mastery": round(mastery_of(record.rating), 4),
        "state": compute_state(record, now),
        "reviewCount": record.review_count,
        "lastPlayedAt": record.last_played_at,
    }


def student_mastery(db: Session, student_id: str, now: datetime | None = None) -> list[dict]:
    records = (
        db.execute(
            select(MasteryRecord)
            .where(MasteryRecord.student_sourced_id == student_id)
            .order_by(MasteryRecord.concept_uri)
        )
        .scalars()
        .all()
    )
    return [record_payload(r, now) for r in records]


# ---------- graph reasoning ----------


def _prereq_adjacency(graph: dict) -> dict[str, list[str]]:
    """conceptUri -> [prerequisite conceptUris] (edge source=prerequisite)."""
    adjacency: dict[str, list[str]] = {node["identifier"]: [] for node in graph.get("nodes", [])}
    for edge in graph.get("edges", []):
        if edge.get("type") == "isPrerequisiteOf":
            src, dst = edge["sourceIdentifier"], edge["targetIdentifier"]
            adjacency.setdefault(dst, []).append(src)
            adjacency.setdefault(src, [])
    return adjacency


def _dependents(graph: dict) -> dict[str, list[str]]:
    dependents: dict[str, list[str]] = {}
    for edge in graph.get("edges", []):
        if edge.get("type") == "isPrerequisiteOf":
            dependents.setdefault(edge["sourceIdentifier"], []).append(edge["targetIdentifier"])
    return dependents


def _transitive_prereqs(adjacency: dict[str, list[str]], concept: str) -> set[str]:
    seen: set[str] = set()
    stack = list(adjacency.get(concept, []))
    while stack:
        current = stack.pop()
        if current in seen:
            continue
        seen.add(current)
        stack.extend(adjacency.get(current, []))
    return seen


def frontier(
    graph: dict, mastery_by_concept: dict[str, dict], now: datetime | None = None
) -> list[dict]:
    """Concepts ready to learn: not green/rusty-yet, all prereqs green (not rusty).

    Ranked by unlock value (number of direct dependents), then mastery descending.
    """
    adjacency = _prereq_adjacency(graph)
    dependents = _dependents(graph)
    state_by_concept = {
        uri: entry["state"] for uri, entry in mastery_by_concept.items()
    }

    def satisfied(uri: str) -> bool:
        entry = mastery_by_concept.get(uri)
        return entry is not None and entry["state"] == "green"

    candidates = []
    for concept in adjacency:
        state = state_by_concept.get(concept)
        if state in ("green", "rusty"):
            continue
        prereqs = _transitive_prereqs(adjacency, concept)
        if all(satisfied(p) for p in prereqs):
            candidates.append(
                {
                    "conceptUri": concept,
                    "mastery": mastery_by_concept.get(concept, {}).get("mastery", 0.0),
                    "state": state or "none",
                    "unlocks": sorted(dependents.get(concept, [])),
                }
            )
    candidates.sort(key=lambda c: (-len(c["unlocks"]), -c["mastery"], c["conceptUri"]))
    return candidates


def heatmap(
    db: Session,
    students: list[dict],
    graph: dict,
    now: datetime | None = None,
) -> dict:
    concept_uris = sorted(node["identifier"] for node in graph.get("nodes", []))
    cells: dict[str, dict[str, str]] = {}
    for student in students:
        sid = student["sourcedId"]
        records = (
            db.execute(
                select(MasteryRecord).where(MasteryRecord.student_sourced_id == sid)
            )
            .scalars()
            .all()
        )
        by_concept = {r.concept_uri: r for r in records}
        cells[sid] = {
            uri: (compute_state(by_concept[uri], now) if uri in by_concept else "none")
            for uri in concept_uris
        }
    return {
        "students": [s["sourcedId"] for s in students],
        "concepts": concept_uris,
        "cells": cells,
    }


def teaching_plan(
    db: Session,
    students: list[dict],
    graph: dict,
    top_n: int = 5,
    now: datetime | None = None,
) -> list[dict]:
    """Contrastive plan: teach what most students struggle with AND what unlocks most."""
    board = heatmap(db, students, graph, now)
    dependents = _dependents(graph)

    plan = []
    for concept in board["concepts"]:
        red = sum(1 for sid in board["students"] if board["cells"][sid][concept] == "red")
        rusty = sum(1 for sid in board["students"] if board["cells"][sid][concept] == "rusty")
        amber = sum(1 for sid in board["students"] if board["cells"][sid][concept] == "amber")
        unlocks = sorted(dependents.get(concept, []))
        plan.append(
            {
                "conceptUri": concept,
                "redCount": red,
                "rustyCount": rusty,
                "amberCount": amber,
                "unlocks": unlocks,
            }
        )
    plan.sort(key=lambda p: (-(p["redCount"] + p["rustyCount"]), -len(p["unlocks"]), p["conceptUri"]))
    plan = plan[:top_n]
    for entry in plan:
        if entry["rustyCount"] and not entry["redCount"]:
            reason = (
                f"{entry['rustyCount']} student(s) forgot this concept (rusty) — schedule review; "
                f"it unlocks {len(entry['unlocks'])} follow-up concept(s)."
            )
        else:
            reason = (
                f"{entry['redCount']} student(s) red, {entry['rustyCount']} rusty — "
                f"teaching it first unlocks {len(entry['unlocks'])} follow-up concept(s)."
            )
        entry["reason"] = reason
    return plan
