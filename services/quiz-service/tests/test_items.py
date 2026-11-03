"""Item bank behavior: creation, QTI export, filters, patch, delete, validation."""


def test_create_item_generates_identifier_and_qti(client, sample_item):
    assert sample_item["identifier"].startswith("ITEM-")
    assert sample_item["interactionType"] == "single_choice"
    qti_resp = client.get(f"/api/v1/items/{sample_item['id']}/qti")
    assert qti_resp.status_code == 200
    assert "application/xml" in qti_resp.headers["content-type"]
    assert "qti-assessment-item" in qti_resp.text
    assert "<qti-value>B</qti-value>" in qti_resp.text


def test_list_filters(client, sample_item):
    client.post(
        "/api/v1/items",
        json={
            "title": "Loops",
            "prompt": "Which keyword starts a loop?",
            "choices": [{"identifier": "A", "text": "for"}, {"identifier": "B", "text": "if"}],
            "correctResponse": ["A"],
            "conceptUri": "http://testserver/case/CFItems/other",
        },
    )
    by_concept = client.get(
        "/api/v1/items", params={"conceptUri": "http://testserver/case/CFItems/abc123"}
    ).json()
    assert len(by_concept) == 1
    assert by_concept[0]["id"] == sample_item["id"]

    by_q = client.get("/api/v1/items", params={"q": "loop"}).json()
    assert len(by_q) == 1
    assert by_q[0]["title"] == "Loops"

    by_type = client.get("/api/v1/items", params={"interactionType": "single_choice"})
    assert by_type.status_code == 200


def test_invalid_correct_response_rejected(client):
    resp = client.post(
        "/api/v1/items",
        json={
            "title": "Bad",
            "prompt": "p",
            "choices": [{"identifier": "A", "text": "a"}, {"identifier": "B", "text": "b"}],
            "correctResponse": ["Z"],
        },
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "INVALID_CORRECT_RESPONSE"


def test_duplicate_choice_identifiers_rejected(client):
    resp = client.post(
        "/api/v1/items",
        json={
            "title": "Bad",
            "prompt": "p",
            "choices": [{"identifier": "A", "text": "a"}, {"identifier": "A", "text": "b"}],
            "correctResponse": ["A"],
        },
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "DUPLICATE_CHOICE_IDENTIFIER"


def test_patch_item_regenerates_xml(client, sample_item):
    resp = client.patch(
        f"/api/v1/items/{sample_item['id']}", json={"correctResponse": ["A"]}
    )
    assert resp.status_code == 200
    assert resp.json()["correctResponse"] == ["A"]
    qti_resp = client.get(f"/api/v1/items/{sample_item['id']}/qti")
    assert "<qti-value>A</qti-value>" in qti_resp.text


def test_delete_item_cascades_attempts(client, sample_item):
    client.post(
        "/api/v1/attempts",
        json={"itemId": sample_item["id"], "candidateId": "stu-1", "response": ["B"]},
    )
    assert client.delete(f"/api/v1/items/{sample_item['id']}").status_code == 204
    outcomes = client.get("/api/v1/candidates/stu-1/outcomes").json()
    assert outcomes["summary"]["total"] == 0
