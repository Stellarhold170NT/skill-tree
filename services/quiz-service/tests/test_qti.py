"""QTI XML builder/parser round-trip and the import endpoint."""

import pytest

from app.qti import build_item_xml, parse_item_xml


def _sample():
    return dict(
        identifier="ITEM-abc123",
        title="Numeric types",
        prompt="What is 5 / 2 in Python 3?",
        choices=[
            {"identifier": "A", "text": "int"},
            {"identifier": "B", "text": "float <x> & more"},
        ],
        correct_response=["B"],
        interaction_type="single_choice",
        shuffle=True,
    )


def test_build_then_parse_round_trip():
    xml = build_item_xml(**_sample())
    parsed = parse_item_xml(xml)
    assert parsed["identifier"] == "ITEM-abc123"
    assert parsed["title"] == "Numeric types"
    assert parsed["prompt"] == "What is 5 / 2 in Python 3?"
    assert parsed["choices"][1]["text"] == "float <x> & more"
    assert parsed["correctResponse"] == ["B"]
    assert parsed["interactionType"] == "single_choice"


def test_multiple_choice_cardinality():
    data = _sample()
    data.update(interaction_type="multiple_choice", correct_response=["A", "B"])
    parsed = parse_item_xml(build_item_xml(**data))
    assert parsed["interactionType"] == "multiple_choice"
    assert parsed["correctResponse"] == ["A", "B"]


def test_parse_rejects_single_choice_item():
    bad = (
        '<qti-assessment-item identifier="X" xmlns="https://purl.imsglobal.org/spec/qti/v3p0/ns">'
        '<qti-item-body><qti-choice-interaction response-identifier="R">'
        '<qti-simple-choice identifier="A">only</qti-simple-choice>'
        "</qti-choice-interaction></qti-item-body></qti-assessment-item>"
    )
    with pytest.raises(ValueError):
        parse_item_xml(bad)


def test_parse_rejects_missing_response_declaration():
    bad = (
        '<qti-assessment-item identifier="X" xmlns="https://purl.imsglobal.org/spec/qti/v3p0/ns">'
        "<qti-item-body><qti-p>hi</qti-p></qti-item-body></qti-assessment-item>"
    )
    with pytest.raises(ValueError):
        parse_item_xml(bad)


def test_import_qti_endpoint_end_to_end(client):
    xml = build_item_xml(**_sample())
    resp = client.post("/api/v1/items/import-qti", json={"qtiXml": xml})
    assert resp.status_code == 201
    imported = resp.json()
    assert imported["identifier"] == "ITEM-abc123"
    assert imported["correctResponse"] == ["B"]
    assert imported["interactionType"] == "single_choice"

    # duplicate identifier -> 409
    resp = client.post("/api/v1/items/import-qti", json={"qtiXml": xml})
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "DUPLICATE_IDENTIFIER"

    # broken XML -> 422 PARSE_ERROR
    resp = client.post("/api/v1/items/import-qti", json={"qtiXml": "not-xml"})
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "PARSE_ERROR"
