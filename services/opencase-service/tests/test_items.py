"""Item CRUD + validation tests."""


def _doc(client):
    resp = client.post(
        "/api/v1/documents", json={"title": "CS101", "creator": "Faculty"}
    )
    return resp.json()


def test_create_item_generates_identifier(client):
    doc = _doc(client)
    resp = client.post(
        f"/api/v1/documents/{doc['id']}/items",
        json={"fullStatement": "Understand variables", "humanCodingScheme": "1.1"},
    )
    assert resp.status_code == 201
    item = resp.json()
    assert item["identifier"].endswith(f"/CFItems/{item['id']}")
    assert item["humanCodingScheme"] == "1.1"


def test_item_missing_full_statement_rejected(client):
    doc = _doc(client)
    resp = client.post(
        f"/api/v1/documents/{doc['id']}/items", json={"humanCodingScheme": "1.1"}
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "VALIDATION_ERROR"


def test_patch_item(client):
    doc = _doc(client)
    item = client.post(
        f"/api/v1/documents/{doc['id']}/items", json={"fullStatement": "Loops"}
    ).json()
    resp = client.patch(
        f"/api/v1/items/{item['id']}", json={"fullStatement": "Loops and iteration"}
    )
    assert resp.status_code == 200
    assert resp.json()["fullStatement"] == "Loops and iteration"


def test_delete_item_removes_referencing_associations(client):
    doc = _doc(client)
    a = client.post(f"/api/v1/documents/{doc['id']}/items", json={"fullStatement": "A"}).json()
    b = client.post(f"/api/v1/documents/{doc['id']}/items", json={"fullStatement": "B"}).json()
    assoc = client.post(
        f"/api/v1/documents/{doc['id']}/associations",
        json={
            "associationType": "isPrerequisiteOf",
            "originItemId": a["id"],
            "destinationItemId": b["id"],
        },
    ).json()

    assert client.delete(f"/api/v1/items/{a['id']}").status_code == 204
    assert client.get(f"/api/v1/associations/{assoc['id']}").status_code == 404
