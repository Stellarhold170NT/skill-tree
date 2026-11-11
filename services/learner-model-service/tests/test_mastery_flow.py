"""Mastery updates, state transitions, decay (rusty)."""

from datetime import datetime, timedelta, timezone

from app.database import SessionLocal
from app.service import compute_state, get_record
from .conftest import A, B, STUDENT


def _update(client, concept, correct, occurred_at=None):
    body = {"conceptUri": concept, "isCorrect": correct}
    if occurred_at:
        body["occurredAt"] = occurred_at
    return client.post(f"/api/v1/students/{STUDENT}/update", json=body)


def test_first_correct_attempt_stays_amber(client):
    resp = _update(client, A, True)
    assert resp.status_code == 201
    body = resp.json()
    assert body["conceptUri"] == A
    assert body["reviewCount"] == 1
    # a single win from 1500/350 → ~0.73 mastery: encouraging but not "mastered"
    assert body["state"] == "amber"
    assert 0.5 < body["mastery"] < 0.85


def test_wrong_attempt_is_red(client):
    body = _update(client, A, False).json()
    assert body["state"] == "red"
    assert body["mastery"] < 0.5


def test_repeated_correct_attempts_reach_green(client):
    t0 = datetime.now(timezone.utc) - timedelta(days=5)
    body = None
    for i in range(6):
        occurred = t0 + timedelta(days=i)
        body = _update(client, A, True, occurred.isoformat()).json()
    assert body["state"] == "green"
    assert body["mastery"] >= 0.85
    assert body["ratingDeviation"] < 250.0


def test_bulk_update_processes_in_order(client):
    resp = client.post(
        f"/api/v1/students/{STUDENT}/update/bulk",
        json={
            "responses": [
                {"conceptUri": A, "isCorrect": True},
                {"conceptUri": B, "isCorrect": False},
            ]
        },
    )
    body = resp.json()
    assert resp.status_code == 200
    assert body["updated"] == 2
    entries = {e["conceptUri"]: e for e in body["mastery"]}
    assert entries[B]["state"] == "red"
    assert entries[A]["state"] in ("amber", "green")


def test_rusty_overrides_green_after_long_idle(client):
    _update(client, A, True)
    # 6 correct answers to be safely green, all finishing 40 days ago
    t0 = datetime.now(timezone.utc) - timedelta(days=46)
    for i in range(6):
        _update(client, B, True, (t0 + timedelta(days=i)).isoformat())

    with SessionLocal() as db:
        record = get_record(db, STUDENT, B)
        now = datetime.now(timezone.utc)
        # at the time of the last review (no idle gap): green
        assert compute_state(record, record.last_played_at) == "green"
        # decayed view: 40 days idle with 6 reviews → S = 3 + 7*6 = 45d → R = e^(-40/45) < 0.7
        assert compute_state(record, now) == "rusty"

    api_view = client.get(f"/api/v1/students/{STUDENT}/mastery").json()
    states = {e["conceptUri"]: e["state"] for e in api_view}
    assert states[B] == "rusty"


def test_mastery_asof_query(client):
    t0 = datetime.now(timezone.utc) - timedelta(days=90)
    _update(client, A, True, t0.isoformat())
    fresh = client.get(f"/api/v1/students/{STUDENT}/mastery").json()[0]
    assert fresh["state"] in ("rusty", "amber", "red")
    as_of = client.get(
        f"/api/v1/students/{STUDENT}/mastery", params={"asOf": t0.isoformat()}
    ).json()[0]
    assert as_of["state"] in ("amber", "green")
