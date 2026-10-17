"""Test Stage C toolkit — thuần local, không LLM, không cognee."""

import json
import os
import sys
import tempfile
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from skilltree.agent import entity_merge as em
from skilltree.agent import traverse as tr
from skilltree.eval import audit_edges as ae
from skilltree.ontology.swebok import (CUSTOM_PROMPT_V2, SWEBOKEdge, SWEBOKGraph,
                                       SWEBOKNode)


def make_fixture():
    nodes = [
        {"id": "n1", "name": "Design by Contract", "type": "Technique",
         "description": "Kỹ thuật hợp đồng trước/sau điều kiện"},
        {"id": "n2", "name": "design by contract", "type": "Entity"},
        {"id": "n3", "name": "Design By Contract!", "type": "Entity"},
        {"id": "n4", "name": "Source Code", "type": "Artifact"},
        {"id": "n5", "name": "Defect", "type": "Fault"},
        {"id": "n6", "name": "bug", "type": "Entity"},
        {"id": "n7", "name": "Failure", "type": "FailureMode"},
        {"id": "n8", "name": "Human Error", "type": "HumanError"},
        {"id": "n9", "name": "Coding", "type": "Activity"},
        {"id": "n10", "name": "Software Construction", "type": "KnowledgeArea"},
        {"id": "n11", "name": "Assertions, design by contract and defensive programming",
         "type": "Entity"},
    ]
    edges = [
        {"source": "n1", "target": "n4", "relationship_name": "VERIFIES", "properties": {}},
        {"source": "n1", "target": "n5", "relationship_name": "MITIGATES", "properties": {}},
        {"source": "n5", "target": "n7", "relationship_name": "CAUSES", "properties": {}},
        {"source": "n8", "target": "n5", "relationship_name": "INJECTS", "properties": {}},
        {"source": "n1", "target": "n9", "relationship_name": "PART_OF", "properties": {}},
        {"source": "n9", "target": "n10", "relationship_name": "PART_OF", "properties": {}},
        {"source": "n2", "target": "n4", "relationship_name": "VERIFIES", "properties": {}},
        {"source": "n3", "target": "n6", "relationship_name": "MITIGATES", "properties": {}},
        {"source": "n11", "target": "n9", "relationship_name": "PART_OF", "properties": {}},
        {"source": "n10", "target": "n9", "relationship_name": "contains", "properties": {}},
    ]
    return {"nodes": nodes, "edges": edges}


# ---------- traverse ----------

def test_traverse_filters_predicates():
    g = make_fixture()
    idx = tr.build_index(g)
    sub = tr.traverse(g, idx, "Defect", {"CAUSES"}, direction="out", k=2)
    preds = {e["relationship_name"] for e in sub["edges"]}
    assert preds <= {"CAUSES"}
    names = {n["name"] for n in sub["nodes"]}
    assert "Failure" in names


def test_traverse_in_direction_lineage():
    g = make_fixture()
    idx = tr.build_index(g)
    sub = tr.traverse(g, idx, "Failure", {"CAUSES", "INJECTS"}, direction="in", k=3)
    names = {n["name"] for n in sub["nodes"]}
    assert "Defect" in names
    assert "Human Error" in names  # HumanError -INJECTS-> Defect -CAUSES-> Failure


def test_traverse_khop_limit():
    g = make_fixture()
    idx = tr.build_index(g)
    sub = tr.traverse(g, idx, "Software Construction", {"PART_OF"}, direction="out", k=1)
    names = {n["name"] for n in sub["nodes"]}
    # từ SC không có cạnh PART_OF đi ra (n10->n9 là 'contains' bị lọc) => chỉ có SC
    assert names == {"Software Construction"}
    sub2 = tr.traverse(g, idx, "Coding", {"PART_OF"}, direction="out", k=2)
    assert "Software Construction" in {n["name"] for n in sub2["nodes"]}


def test_render_context_budget():
    g = make_fixture()
    idx = tr.build_index(g)
    sub = tr.traverse(g, idx, "Defect", {"CAUSES", "MITIGATES", "INJECTS"}, direction="both", k=2)
    ctx = tr.render_context(sub, max_tokens=20)
    assert len(ctx) <= 20 * 4 + 1


def test_resolve_node_fuzzy():
    g = make_fixture()
    assert tr.resolve_node(g, "design by contract") in ("n1", "n2", "n3")
    assert tr.resolve_node(g, "Failure") == "n7"


# ---------- entity_merge ----------

def test_normalize():
    assert em.normalize("The Design by Contract!") == em.normalize("design by contract")
    assert em.normalize("  Bug,  ") == "bug"


def test_merge_groups_exact():
    g = make_fixture()
    props = em.find_merge_groups(g)
    by_canon = {p["canonical"]: p for p in props}
    assert "Design by Contract" in by_canon
    assert len(by_canon["Design by Contract"]["variants"]) == 3
    # fault/defect/bug -> nhóm Fault, KHÔNG dính Failure
    assert "Fault" in by_canon
    fault_ids = {v["id"] for v in by_canon["Fault"]["variants"]}
    assert fault_ids == {"n5", "n6"}
    assert "n7" not in fault_ids  # Failure protected


def test_protected_concepts_not_merged():
    g = make_fixture()
    props = em.find_merge_groups(g)
    for p in props:
        names = {em.normalize(v["name"]) for v in p["variants"]}
        assert not ({"failure"} & names and len(names) > 1)


def test_heading_splitter():
    g = make_fixture()
    cands = em.split_heading_candidates(g)
    assert any("Assertions" in c["heading"] for c in cands)
    target = next(c for c in cands if "Assertions" in c["heading"])
    assert set(target["proposed_leaves"]) >= {"Assertions", "design by contract",
                                              "defensive programming"}


# ---------- audit_edges ----------

def test_sample_edges_stratified(tmp_path):
    g = make_fixture()
    rows = ae.sample_edges(g, n=8, seed=3)
    assert len(rows) == 8
    preds = {r["predicate"] for r in rows}
    assert "VERIFIES" in preds and "CAUSES" in preds
    p = ae.write_sample(g, tmp_path / "audit_sample.jsonl", n=8)
    assert p.exists()


def test_audit_summary_precision():
    rows = [
        {"predicate": "VERIFIES", "correct": True},
        {"predicate": "VERIFIES", "correct": True},
        {"predicate": "VERIFIES", "correct": False},
        {"predicate": "contains", "correct": True},
        {"predicate": "contains", "correct": None},  # bỏ qua
    ]
    f = tempfile.NamedTemporaryFile("w", suffix=".jsonl", delete=False)
    for r in rows:
        f.write(json.dumps(r) + "\n")
    f.close()
    s = ae.audit_summary(f.name)
    assert s["precision_total"] == round(3 / 4, 3)
    assert s["per_predicate"]["VERIFIES"]["n"] == 3
    os.unlink(f.name)


# ---------- ontology schema ----------

def test_schema_valid():
    g = SWEBOKGraph(
        summary="ok",
        nodes=[SWEBOKNode(name="Design by Contract", type="Technique", description="x")],
        edges=[SWEBOKEdge(source_name="Design by Contract", target_name="Source Code",
                          relationship="VERIFIES", confidence=0.9)],
    )
    assert g.edges[0].relationship == "VERIFIES"


def test_schema_confidence_range():
    with pytest.raises(Exception):
        SWEBOKEdge(source_name="a", target_name="b", relationship="OTHER", confidence=1.5)


def test_schema_unknown_predicate_rejected():
    # Literal enum: predicate lạ phải bị TỪ CHỐI lúc validation (không tự chuyển OTHER)
    with pytest.raises(Exception):
        SWEBOKEdge(source_name="a", target_name="b", relationship="LOVES")


def test_schema_duplicate_node_names_rejected():
    with pytest.raises(Exception):
        SWEBOKGraph(nodes=[SWEBOKNode(name="Fault"), SWEBOKNode(name="fault")])


def test_prompt_v2_contains_lessons():
    assert "FailureMode" in CUSTOM_PROMPT_V2 and "HumanError" in CUSTOM_PROMPT_V2
    assert "OTHER" in CUSTOM_PROMPT_V2
    assert "KHÔNG tạo node" in CUSTOM_PROMPT_V2  # heading-split rule
