"""Document CRUD lifecycle tests."""

import uuid


def _create_document(client, title="CS101"):
    resp = client.post(
        "/api/v1/documents",
        json={"title": title, "creator": "Bộ môn Khoa học Máy tính", "version": "1.0"},
    )
    assert resp.status_code == 201
    return resp.json()


def test_create_and_get_document(client):
    doc = _create_document(client)
    assert doc["identifier"].endswith(f"/CFDocuments/{doc['id']}")
    assert doc["status"] == "Draft"

    got = client.get(f"/api/v1/documents/{doc['id']}")
    assert got.status_code == 200
    assert got.json()["title"] == "CS101"


def test_list_documents_paginated(client):
    for i in range(3):
        _create_document(client, title=f"DOC-{i}")
    page = client.get("/api/v1/documents", params={"limit": 2, "offset": 1})
    assert page.status_code == 200
    body = page.json()
    assert len(body) == 2


def test_patch_document(client):
    doc = _create_document(client)
    resp = client.patch(
        f"/api/v1/documents/{doc['id']}", json={"title": "CS101 (2026)", "status": "Final"}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["title"] == "CS101 (2026)"
    assert body["status"] == "Final"


def test_get_unknown_document_404_envelope(client):
    resp = client.get(f"/api/v1/documents/{uuid.uuid4().hex}")
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "DOCUMENT_NOT_FOUND"


def test_delete_document_cascades(client):
    doc = _create_document(client)
    item = client.post(
        f"/api/v1/documents/{doc['id']}/items",
        json={"fullStatement": "Variables"},
    ).json()
    assoc = client.post(
        f"/api/v1/documents/{doc['id']}/associations",
        json={
            "associationType": "isPartOf",
            "originItemId": item["id"],
            "destinationItemId": item["id"],  # isPartOf self-edge allowed for simplicity here
        },
    ).json()

    assert client.delete(f"/api/v1/documents/{doc['id']}").status_code == 204
    assert client.get(f"/api/v1/items/{item['id']}").status_code == 404
    assert client.get(f"/api/v1/associations/{assoc['id']}").status_code == 404
