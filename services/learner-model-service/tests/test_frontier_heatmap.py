"""Frontier recommendation, class heatmap, contrastive teaching plan."""

from .conftest import A, B, C, D, GRAPH, STUDENT


def _update(client, concept, correct):
    return client.post(
        f"/api/v1/students/{STUDENT}/update", json={"conceptUri": concept, "isCorrect": correct}
    )


def test_next_picks_highest_unlock_value(client, fake_graph):
    # A green (2 wins), B amber (1 win, prereq A satisfied), C blocked, D untouched
    _update(client, A, True)
    _update(client, A, True)
    _update(client, B, True)
    resp = client.get(f"/api/v1/students/{STUDENT}/next", params={"documentId": "doc-1"})
    assert resp.status_code == 200
    body = resp.json()
    # ready set: B (A green), D (no prereqs). B unlocks C; D unlocks nothing → B wins.
    assert body["conceptUri"] == B
    assert body["unlocks"] == [C]
    assert "unlock" in body["explanation"].lower()
    assert any(alt["conceptUri"] == D for alt in body["alternatives"])


def test_next_blocks_concepts_with_unsatisfied_prereqs(client, fake_graph):
    _update(client, A, False)  # A red
    resp = client.get(f"/api/v1/students/{STUDENT}/next", params={"documentId": "doc-1"})
    body = resp.json()
    # B and C are blocked (A red). A itself is ready again (retry, unlocks B) and
    # outranks D because it unlocks a concept while D unlocks nothing.
    candidates = [body["conceptUri"]] + [a["conceptUri"] for a in body["alternatives"]]
    assert body["conceptUri"] == A
    assert B not in candidates and C not in candidates


def test_next_returns_none_when_all_green(client, fake_graph):
    for concept in (A, B, C, D):
        for _ in range(6):
            _update(client, concept, True)
    resp = client.get(f"/api/v1/students/{STUDENT}/next", params={"documentId": "doc-1"})
    body = resp.json()
    assert body["conceptUri"] is None
    assert "green" in body["explanation"].lower()


def test_graph_unavailable_is_503_envelope(client, monkeypatch):
    from app import service

    def boom(document_id):
        raise service.BusinessError(503, "GRAPH_UNAVAILABLE", "opencase-service graph fetch failed: boom")

    monkeypatch.setattr("app.service.fetch_document_graph", boom)
    resp = client.get(f"/api/v1/students/{STUDENT}/next", params={"documentId": "doc-1"})
    assert resp.status_code == 503
    assert resp.json()["error"]["code"] == "GRAPH_UNAVAILABLE"


def test_heatmap_and_teaching_plan(client, fake_graph, fake_roster):
    other = "ffffffffffffffffffffffffffffffff"
    _update(client, A, True)   # STUDENT: A green after 1 win (amber/green), B, C untouched
    # other student: red on A (wrong), nothing on B
    client.post(
        f"/api/v1/students/{other}/update", json={"conceptUri": A, "isCorrect": False}
    )

    board = client.get(
        f"/api/v1/classes/cls-1/heatmap", params={"documentId": "doc-1"}
    ).json()
    assert set(board["students"]) == {STUDENT, other}
    assert board["concepts"] == sorted([A, B, C, D])
    assert board["cells"][STUDENT][B] == "none"
    assert board["cells"][other][A] == "red"

    plan = client.get(
        f"/api/v1/classes/cls-1/teaching-plan", params={"documentId": "doc-1", "topN": 3}
    ).json()["plan"]
    assert len(plan) == 3
    top = plan[0]
    # A has 1 red + STUDENT not-green; it also unlocks B → ranked first with a reason
    assert top["conceptUri"] == A
    assert top["redCount"] == 1
    assert "unlock" in top["reason"].lower()
