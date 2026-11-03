"""Assignment creation from mastery groups, quiz generation, lifecycle."""


def _body(group=None):
    body = {"title": "Ôn tập biến", "classId": "cls-1", "conceptUri": "http://opencase:8101/api/v1/case/CFItems/abc"}
    if group:
        body["targetGroup"] = group
    return body


def test_create_assigns_red_rusty_students_and_items(client, fake_neighbors):
    resp = client.post("/api/v1/assignments", json=_body())
    assert resp.status_code == 201
    body = resp.json()
    # red + rusty included, green excluded
    assert set(body["studentIds"]) == {"1" * 32, "2" * 32}
    assert body["itemIds"] == ["a" * 32, "b" * 32]
    assert body["status"] == "published"
    assert body["quizTestId"] is None


def test_create_target_group_red_only(client, fake_neighbors):
    body = client.post("/api/v1/assignments", json=_body("red")).json()
    assert body["studentIds"] == ["1" * 32]


def test_invalid_target_group(client):
    resp = client.post("/api/v1/assignments", json=_body("gold"))
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "INVALID_TARGET_GROUP"


def test_heatmap_unavailable_503(client, monkeypatch):
    from app import service

    def boom(class_id, document_id):
        raise service.BusinessError(503, "HEATMAP_UNAVAILABLE", "down")

    monkeypatch.setattr("app.service.fetch_heatmap", boom)
    resp = client.post("/api/v1/assignments", json=_body())
    assert resp.status_code == 503
    assert resp.json()["error"]["code"] == "HEATMAP_UNAVAILABLE"


def test_generate_quiz_stores_test_id(client, assignment, monkeypatch):
    from app import service

    def fake_generate_quiz(db, asg):
        if asg.quiz_test_id:
            raise service.BusinessError(409, "QUIZ_ALREADY_GENERATED", "already generated")
        return {"id": "test-123", "identifier": f"ASG-{asg.id[:12]}"}

    monkeypatch.setattr("app.service.generate_quiz", fake_generate_quiz)
    resp = client.post(f"/api/v1/assignments/{assignment['id']}/quiz")
    assert resp.status_code == 200
    body = resp.json()
    assert body["quizTestId"] == "test-123"
    assert body["studentIds"] == assignment["studentIds"]

    # second generation -> 409
    resp = client.post(f"/api/v1/assignments/{assignment['id']}/quiz")
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "QUIZ_ALREADY_GENERATED"


def test_generate_quiz_without_items_422(client, fake_neighbors, monkeypatch):
    # no quiz items exist for this concept
    monkeypatch.setattr("app.service.fetch_items", lambda concept_uri: [])
    resp = client.post("/api/v1/assignments", json=_body())
    asg = resp.json()
    resp = client.post(f"/api/v1/assignments/{asg['id']}/quiz")
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "NO_ITEMS"


def test_patch_status_and_list_filter(client, assignment):
    resp = client.patch(f"/api/v1/assignments/{assignment['id']}", json={"status": "closed"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "closed"

    resp = client.patch(f"/api/v1/assignments/{assignment['id']}", json={"status": "bogus"})
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "INVALID_STATUS"

    assert len(client.get("/api/v1/assignments", params={"classId": "cls-1"}).json()) == 1
    assert client.get("/api/v1/assignments", params={"classId": "other"}).json() == []


def test_get_unknown_and_delete(client, fake_neighbors):
    resp = client.get("/api/v1/assignments/missing")
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "ASSIGNMENT_NOT_FOUND"

    created = client.post("/api/v1/assignments", json=_body())
    assert created.status_code == 201
    assert client.delete(f"/api/v1/assignments/{created.json()['id']}").status_code == 204
    assert client.get(f"/api/v1/assignments/{created.json()['id']}").status_code == 404
