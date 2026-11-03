"""Org / course / class CRUD and reference validation."""


def _student(client, school, name):
    resp = client.post(
        "/api/v1/users",
        json={"displayName": name, "role": "student", "orgSourcedId": school["sourcedId"]},
    )
    assert resp.status_code == 201
    return resp.json()


def test_health(client):
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body == {"status": "ok", "service": "class-service", "version": body["version"]}


def test_create_org_invalid_type(client):
    resp = client.post("/api/v1/orgs", json={"name": "X", "orgType": "galaxy"})
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "INVALID_ORG_TYPE"


def test_course_requires_existing_org(client):
    resp = client.post("/api/v1/courses", json={"title": "Tin học", "orgSourcedId": "missing"})
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "ORG_NOT_FOUND"


def test_class_requires_existing_course(client, school):
    resp = client.post(
        "/api/v1/classes", json={"title": "10A1", "courseSourcedId": "missing"}
    )
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "COURSE_NOT_FOUND"


def test_full_hierarchy_listing(client, school, course, class_10a):
    orgs = client.get("/api/v1/orgs").json()
    courses = client.get("/api/v1/courses").json()
    classes = client.get("/api/v1/classes", params={"courseId": course["sourcedId"]}).json()
    assert len(orgs) == 1 and len(courses) == 1 and len(classes) == 1
    assert classes[0]["title"] == "10A1"


def test_patch_class_updates_title_and_term(client, class_10a):
    resp = client.patch(
        f"/api/v1/classes/{class_10a['sourcedId']}",
        json={"title": "10A1 (chuyên)", "term": "2026-fall"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["title"] == "10A1 (chuyên)"
    assert body["term"] == "2026-fall"
    # untouched fields stay as-is
    assert body["courseSourcedId"] == class_10a["courseSourcedId"]
    assert body["orgSourcedId"] == class_10a["orgSourcedId"]
    fetched = client.get(f"/api/v1/classes/{class_10a['sourcedId']}").json()
    assert fetched["title"] == "10A1 (chuyên)"


def test_patch_class_requires_existing_course(client, class_10a):
    resp = client.patch(
        f"/api/v1/classes/{class_10a['sourcedId']}", json={"courseSourcedId": "missing"}
    )
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "COURSE_NOT_FOUND"


def test_patch_class_not_found(client):
    resp = client.patch("/api/v1/classes/nope", json={"title": "X"})
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "CLASS_NOT_FOUND"


def test_patch_class_empty_body(client, class_10a):
    resp = client.patch(f"/api/v1/classes/{class_10a['sourcedId']}", json={})
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "EMPTY_UPDATE"


def test_delete_class(client, school, course, class_10a):
    student = _student(client, school, "Lan Anh")
    resp = client.post(
        "/api/v1/enrollments",
        json={
            "userSourcedId": student["sourcedId"],
            "classSourcedId": class_10a["sourcedId"],
            "role": "student",
        },
    )
    assert resp.status_code == 201
    assert client.delete(f"/api/v1/classes/{class_10a['sourcedId']}").status_code == 204
    remaining = client.get("/api/v1/enrollments").json()
    assert remaining == []
