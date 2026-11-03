"""Minimal QTI 3.0 XML generation/parsing for choice interactions.

This is a documented subset (single/multiple choice + match_correct response
processing) — enough for the item bank and its scoring flow; a full QTI engine
is out of scope for module M2 v0.1.
"""

import uuid
import xml.etree.ElementTree as ET
from xml.sax.saxutils import escape, quoteattr

QTI_NS = "https://purl.imsglobal.org/spec/qti/v3p0/ns"
MATCH_CORRECT_TEMPLATE = "https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct"

INTERACTION_TYPES = ("single_choice", "multiple_choice")


def build_item_xml(
    *,
    identifier: str,
    title: str,
    prompt: str,
    choices: list[dict],
    correct_response: list[str],
    interaction_type: str,
    shuffle: bool,
) -> str:
    """Serialize an item into a QTI 3.0 assessment-item XML string."""
    if interaction_type not in INTERACTION_TYPES:
        raise ValueError(f"interaction_type must be one of {INTERACTION_TYPES}")
    cardinality = "multiple" if interaction_type == "multiple_choice" else "single"
    max_choices = "0" if interaction_type == "multiple_choice" else "1"

    values = "".join(f"<qti-value>{escape(v)}</qti-value>" for v in correct_response)
    choice_xml = "".join(
        f"<qti-simple-choice identifier={quoteattr(c['identifier'])}>"
        f"{escape(c['text'])}</qti-simple-choice>"
        for c in choices
    )
    return (
        f"<qti-assessment-item identifier={quoteattr(identifier)} "
        f"title={quoteattr(title)} "
        f'xmlns="{QTI_NS}">'
        "<qti-response-declaration identifier=\"RESPONSE\" "
        f'cardinality="{cardinality}" base-type="identifier">'
        f"<qti-correct-response>{values}</qti-correct-response>"
        "</qti-response-declaration>"
        "<qti-outcome-declaration identifier=\"SCORE\" "
        'cardinality="single" base-type="float">'
        "<qti-default-value><qti-value>0</qti-value></qti-default-value>"
        "</qti-outcome-declaration>"
        "<qti-item-body>"
        f"<qti-p>{escape(prompt)}</qti-p>"
        "<qti-choice-interaction response-identifier=\"RESPONSE\" "
        f'shuffle="{str(shuffle).lower()}" max-choices="{max_choices}">'
        f"{choice_xml}"
        "</qti-choice-interaction>"
        "</qti-item-body>"
        f'<qti-response-processing template="{MATCH_CORRECT_TEMPLATE}"/>'
        "</qti-assessment-item>"
    )


def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def parse_item_xml(xml_str: str) -> dict:
    """Parse the supported QTI subset into an item-like dict. Raises ValueError."""
    try:
        root = ET.fromstring(xml_str)
    except ET.ParseError as exc:
        raise ValueError(f"invalid XML: {exc}") from exc

    if _local(root.tag) != "qti-assessment-item":
        raise ValueError("root element must be qti-assessment-item")

    identifier = root.get("identifier")
    if not identifier:
        raise ValueError("missing identifier on qti-assessment-item")
    title = root.get("title", "")

    response_decl = next(
        (el for el in root.iter() if _local(el.tag) == "qti-response-declaration"), None
    )
    if response_decl is None:
        raise ValueError("missing qti-response-declaration")
    cardinality = response_decl.get("cardinality", "single")
    correct = [
        (el.text or "").strip()
        for el in response_decl.iter()
        if _local(el.tag) == "qti-value"
    ]
    if not correct:
        raise ValueError("missing qti-correct-response values")

    interaction_el = next(
        (el for el in root.iter() if _local(el.tag) == "qti-choice-interaction"), None
    )
    if interaction_el is None:
        raise ValueError("missing qti-choice-interaction")
    choices = [
        {"identifier": el.get("identifier"), "text": "".join(el.itertext()).strip()}
        for el in interaction_el
        if _local(el.tag) == "qti-simple-choice"
    ]
    if len(choices) < 2:
        raise ValueError("a choice interaction needs at least 2 choices")

    body = next((el for el in root.iter() if _local(el.tag) == "qti-item-body"), None)
    prompt = ""
    if body is not None:
        first_p = next((el for el in body.iter() if _local(el.tag) == "qti-p"), None)
        if first_p is not None:
            prompt = "".join(first_p.itertext()).strip()

    interaction_type = "multiple_choice" if cardinality == "multiple" else "single_choice"
    shuffle = (interaction_el.get("shuffle", "true").lower() == "true")

    return {
        "identifier": identifier,
        "title": title,
        "prompt": prompt,
        "choices": choices,
        "correctResponse": correct,
        "interactionType": interaction_type,
        "shuffle": shuffle,
    }


def new_item_identifier() -> str:
    return f"ITEM-{uuid.uuid4().hex[:12]}"
