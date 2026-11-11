"""Chunker unit tests: ToC paths, ltx HTML, paragraph splits, tiny merges."""

import pytest

from app import chunker
from .conftest import LTX_HTML, SAMPLE_MD


def test_markdown_tree_paths_and_parts():
    sections = chunker.build(SAMPLE_MD, "markdown")
    paths = [s.path for s in sections]
    assert paths == [
        "Democracies",
        "Democracies > Electoral Systems",
        "Democracies > Institutions within Democracy",
        "Democracies > Institutions within Democracy > Courts",
        "Chapter 2: economies",
        "Chapter 2: economies > Markets",
    ]
    electoral = sections[1]
    assert electoral.parts and "plurality voting system" in electoral.parts[0][1]


def test_ltx_html_sections_with_bibliography_dropped():
    sections = chunker.build(LTX_HTML, "html")
    paths = [s.path for s in sections]
    assert paths == [
        "Abstract",
        "1 Introduction",
        "1 Introduction > 1.1 Contributions",
    ]  # ltx_bibliography dropped; abstract indexed like a normal section
    intro = sections[1]
    assert "chunk boundaries" in intro.body
    contributions = sections[2]
    assert any("path boost" in part for _, part in contributions.parts)


def test_long_section_splits_parts_same_path():
    para_a = ("Sentence one about thermal dynamics with details. " * 110).strip()
    para_b = ("Sentence two about thermodynamic cycles and entropy. " * 110).strip()
    doc = f"# Thermodynamics\n\n{para_a}\n\n{para_b}\n"
    sections = chunker.build(doc, "markdown")
    assert len(sections) == 1
    assert sections[0].path == "Thermodynamics"
    parts = sections[0].parts
    assert len(parts) >= 2  # > 8000 chars → split on paragraph boundaries
    assert [idx for idx, _ in parts] == list(range(len(parts)))
    joined = "\n\n".join(text for _, text in parts)
    assert len(joined) >= len(para_a) + len(para_b)


def test_tiny_section_merges_into_parent():
    parent_body = "The parent section carries substantial study content. " * 6
    doc = f"# Parent\n\n{parent_body}\n\n## Tiny\n\nshort text\n"
    sections = chunker.build(doc, "markdown")
    assert [s.title for s in sections] == ["Parent"]  # Tiny merged away
    assert "short text" in sections[0].body


def test_empty_document_raises():
    with pytest.raises(chunker.EmptyDocument):
        chunker.build("   \n  ", "markdown")
    with pytest.raises(chunker.EmptyDocument):
        chunker.build("", "text")
