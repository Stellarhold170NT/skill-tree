"""Users, enrollments, rosters, and the sourcedId anonymity contract."""


def _student(client, school, name):
    resp = client.post(
        "/api/v1/users",
        json={"displayName": name, "role": "student", "orgSourcedId": school["sourcedId"]},
    )
    assert resp.status_code == 201
    return resp.json()


def test_user_invalid_role_rejected(client):
    resp = client.post("/api/v1/users", json={"displayName": "X", "role": "superhero"})
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "INVALID_ROLE"


def test_sourced_id_is_opaque_uuid(client, school, teacher):
    sid = teacher["sourcedId"]
    assert len(sid) == 32 and all(c in "0123456789abcdef" for c in sid)
    got = client.get(f"/api/v1/users/{sid}").json()
    assert got["displayName"] == "Cô Lan"


def test_enrollment_flow_and_rosters(client, school, class_10a, teacher):
    students = [_student(client, school, f"Học sinh {i}") for i in range(3)]
    for s in students:
        resp = client.post(
            "/api/v1/enrollments",
            json={
                "userSourcedId": s["sourcedId"],
                "classSourcedId": class_10a["sourcedId"],
                "role": "student",
            },
        )
        assert resp.status_code == 201
    resp = client.post(
        "/api/v1/enrollments",
        json={
            "userSourcedId": teacher["sourcedId"],
            "classSourcedId": class_10a["sourcedId"],
            "role": "teacher",
            "primary": True,
        },
    )
    assert resp.status_code == 201

    roster = client.get(f"/api/v1/classes/{class_10a['sourcedId']}/students").json()
    assert len(roster) == 3
    assert all(u["role"] == "student" for u in roster)

    teachers = client.get(f"/api/v1/classes/{class_10a['sourcedId']}/teachers").json()
    assert len(teachers) == 1 and teachers[0]["sourcedId"] == teacher["sourcedId"]

    classes = client.get(f"/api/v1/users/{teacher['sourcedId']}/classes").json()
    assert [c["sourcedId"] for c in classes] == [class_10a["sourcedId"]]


def test_duplicate_enrollment_conflict(client, school, class_10a):
    s = _student(client, school, "Minh")
    payload = {
        "userSourcedId": s["sourcedId"],
        "classSourcedId": class_10a["sourcedId"],
        "role": "student",
    }
    assert client.post("/api/v1/enrollments", json=payload).status_code == 201
    resp = client.post("/api/v1/enrollments", json=payload)
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "DUPLICATE_ENROLLMENT"


def test_enrollment_unknown_user(client, class_10a):
    resp = client.post(
        "/api/v1/enrollments",
        json={"userSourcedId": "missing", "classSourcedId": class_10a["sourcedId"], "role": "student"},
    )
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "USER_NOT_FOUND"


def test_admin_cannot_be_enrolled(client, school, class_10a):
    resp = client.post(
        "/api/v1/users", json={"displayName": "Hiệu trưởng", "role": "admin"}
    )
    admin = resp.json()
    resp = client.post(
        "/api/v1/enrollments",
        json={
            "userSourcedId": admin["sourcedId"],
            "classSourcedId": class_10a["sourcedId"],
            "role": "student",
        },
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "INVALID_ROLE"


def test_delete_enrollment(client, school, class_10a):
    s = _student(client, school, "Hà")
    enrollment = client.post(
        "/api/v1/enrollments",
        json={"userSourcedId": s["sourcedId"], "classSourcedId": class_10a["sourcedId"], "role": "student"},
    ).json()
    assert client.delete(f"/api/v1/enrollments/{enrollment['sourcedId']}").status_code == 204
    assert client.get(f"/api/v1/classes/{class_10a['sourcedId']}/students").json() == []


def test_user_delete_cascades_enrollments(client, school, class_10a):
    s = _student(client, school, "Khoa")
    client.post(
        "/api/v1/enrollments",
        json={"userSourcedId": s["sourcedId"], "classSourcedId": class_10a["sourcedId"], "role": "student"},
    )
    assert client.delete(f"/api/v1/users/{s['sourcedId']}").status_code == 204
    assert client.get("/api/v1/enrollments").json() == []
