"""Scoring, bulk attempts, outcomes aggregation, history ordering."""


def _second_item(client):
    resp = client.post(
        "/api/v1/items",
        json={
            "title": "Conditionals",
            "prompt": "Which keyword starts a branch?",
            "choices": [{"identifier": "A", "text": "if"}, {"identifier": "B", "text": "for"}],
            "correctResponse": ["A"],
            "conceptUri": "http://testserver/case/CFItems/branch",
        },
    )
    return resp.json()


def test_single_attempt_scoring(client, sample_item):
    ok = client.post(
        "/api/v1/attempts",
        json={"itemId": sample_item["id"], "candidateId": "stu-1", "response": ["B"]},
    )
    assert ok.status_code == 201
    body = ok.json()
    assert body["isCorrect"] is True
    assert body["score"] == 1.0

    bad = client.post(
        "/api/v1/attempts",
        json={"itemId": sample_item["id"], "candidateId": "stu-1", "response": ["A"]},
    ).json()
    assert bad["isCorrect"] is False
    assert bad["score"] == 0.0


def test_unknown_item_404(client):
    resp = client.post(
        "/api/v1/attempts",
        json={"itemId": "missing", "candidateId": "stu-1", "response": ["A"]},
    )
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "ITEM_NOT_FOUND"


def test_bulk_attempts_atomic_and_aggregated(client, sample_item):
    second = _second_item(client)
    resp = client.post(
        "/api/v1/attempts/bulk",
        json={
            "candidateId": "stu-2",
            "testId": "t1",
            "responses": [
                {"itemId": sample_item["id"], "response": ["B"]},
                {"itemId": second["id"], "response": ["B"]},  # wrong
            ],
        },
    )
    body = resp.json()
    assert resp.status_code == 200
    assert body["scored"] == 2
    assert body["correct"] == 1
    assert body["ratio"] == 0.5
    assert len(body["attempts"]) == 2


def test_bulk_unknown_item_writes_nothing(client, sample_item):
    resp = client.post(
        "/api/v1/attempts/bulk",
        json={
            "candidateId": "stu-3",
            "responses": [
                {"itemId": sample_item["id"], "response": ["B"]},
                {"itemId": "missing", "response": ["A"]},
            ],
        },
    )
    assert resp.status_code == 404
    outcomes = client.get("/api/v1/candidates/stu-3/outcomes").json()
    assert outcomes["summary"]["total"] == 0


def test_outcomes_aggregate_by_concept(client, sample_item):
    second = _second_item(client)
    client.post(
        "/api/v1/attempts",
        json={"itemId": sample_item["id"], "candidateId": "stu-4", "response": ["B"]},
    )
    client.post(
        "/api/v1/attempts",
        json={"itemId": second["id"], "candidateId": "stu-4", "response": ["B"]},
    )
    outcomes = client.get("/api/v1/candidates/stu-4/outcomes").json()
    assert outcomes["summary"]["total"] == 2
    assert outcomes["summary"]["ratio"] == 0.5
    by_concept = outcomes["summary"]["byConcept"]
    assert by_concept["http://testserver/case/CFItems/abc123"] == {
        "total": 1,
        "correct": 1,
        "ratio": 1.0,
    }
    assert by_concept["http://testserver/case/CFItems/branch"]["ratio"] == 0.0


def test_history_ordered_by_time(client, sample_item):
    for _ in range(3):
        client.post(
            "/api/v1/attempts",
            json={"itemId": sample_item["id"], "candidateId": "stu-5", "response": ["A"]},
        )
    history = client.get("/api/v1/candidates/stu-5/history").json()
    assert len(history) == 3
    times = [h["submittedAt"] for h in history]
    assert times == sorted(times)
