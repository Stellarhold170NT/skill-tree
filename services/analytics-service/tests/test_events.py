"""Append, idempotency, batch atomicity, filters, last-interaction."""

from tests.conftest import CONCEPT, STUDENT, _event


def test_health(client):
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok" and body["service"] == "analytics-service"


def test_append_single_event_defaults(client):
    resp = client.post("/api/v1/events", json=_event())
    assert resp.status_code == 201
    body = resp.json()
    assert len(body["eventId"]) == 32
    assert body["actorId"] == STUDENT
    assert body["objectId"] == CONCEPT
    assert body["occurredAt"]


def test_unknown_event_type_rejected(client):
    resp = client.post("/api/v1/events", json=_event(event_type="BossFightCompleted"))
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "UNKNOWN_EVENT_TYPE"


def test_duplicate_event_id_conflict(client):
    body = _event(event_id="fixed-1")
    assert client.post("/api/v1/events", json=body).status_code == 201
    resp = client.post("/api/v1/events", json=body)
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "DUPLICATE_EVENT_ID"


def test_batch_atomic_all_or_nothing(client):
    batch = {"events": [_event(event_id="b-1"), _event(event_id="b-2", event_type="ResourceViewed")]}
    resp = client.post("/api/v1/events/batch", json=batch)
    assert resp.status_code == 200
    assert resp.json()["accepted"] == 2

    # second batch contains one duplicate -> whole batch rejected
    bad_batch = {"events": [_event(event_id="b-3"), _event(event_id="b-1")]}
    resp = client.post("/api/v1/events/batch", json=bad_batch)
    assert resp.status_code == 409
    ids = [e["eventId"] for e in client.get("/api/v1/events").json()]
    assert "b-3" not in ids and set(ids) == {"b-1", "b-2"}


def test_filters_actor_type_since(client):
    t0 = "2026-01-10T08:00:00Z"
    t1 = "2026-01-12T08:00:00Z"
    client.post("/api/v1/events", json=_event(event_id="e1", occurred_at=t0))
    client.post(
        "/api/v1/events",
        json=_event(event_id="e2", occurred_at=t1, event_type="ResourceViewed", object_id="http://x/doc1"),
    )

    by_actor = client.get("/api/v1/events", params={"actorId": STUDENT}).json()
    assert {e["eventId"] for e in by_actor} == {"e1", "e2"}

    by_type = client.get("/api/v1/events", params={"type": "ResourceViewed"}).json()
    assert [e["eventId"] for e in by_type] == ["e2"]

    by_object = client.get("/api/v1/events", params={"objectId": "http://x/doc1"}).json()
    assert [e["eventId"] for e in by_object] == ["e2"]

    since = client.get("/api/v1/events", params={"since": "2026-01-11T00:00:00Z"}).json()
    assert [e["eventId"] for e in since] == ["e2"]

    ordered = client.get("/api/v1/events").json()
    times = [e["occurredAt"] for e in ordered]
    assert times == sorted(times)


def test_last_interaction(client):
    t0 = "2026-01-10T08:00:00Z"
    t1 = "2026-01-15T08:00:00Z"
    client.post("/api/v1/events", json=_event(event_id="e1", occurred_at=t0))
    client.post(
        "/api/v1/events",
        json=_event(event_id="e2", occurred_at=t1, event_type="ResourceViewed"),
    )
    resp = client.get(f"/api/v1/concepts/{CONCEPT}/last-interaction")
    body = resp.json()
    assert body["conceptUri"] == CONCEPT
    assert body["eventCount"] == 2
    assert body["lastInteractionAt"].startswith("2026-01-15")
    assert body["lastEventType"] == "ResourceViewed"

    empty = client.get("/api/v1/concepts/http://nope/x/last-interaction").json()
    assert empty["eventCount"] == 0 and empty["lastInteractionAt"] is None


def test_events_are_append_only(client):
    # No update/delete routes exist: mutations fall through to 404/405.
    assert client.patch("/api/v1/events/e1", json={"type": "ResourceViewed"}).status_code in (404, 405)
    assert client.delete("/api/v1/events/e1").status_code in (404, 405)
