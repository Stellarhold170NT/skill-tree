"""Stage C — Constrained traversal trên graph dump (thuần local, không cần LLM/cognee).

Đọc graph từ dump JSON.gz (nodes/edges) hoặc dict fixture, duyệt có kiểm soát
theo predicate + hướng + độ sâu k. Chế độ ngữ cảnh dựng sẵn cho 3 nhóm câu
hỏi stress (lineage / verify / overview).

Dùng cho ablation C1: đo hop_precision/correctness trên traversal lọc cạnh
so với subgraph nguyên trạng (bài học R2: thêm ngữ cảnh = nhiễu).
"""

from __future__ import annotations

import gzip
import json
from collections import deque
from pathlib import Path

# Chế độ truy vấn dựng sẵn — predicate được phép + hướng duyệt
CONTEXT_MODES: dict[str, dict] = {
    # truy vết nguyên nhân ngược: failure <- fault <- error/design
    "lineage": {"predicates": {"CAUSES", "DEPENDS_ON", "REQUIRES", "INJECTS"}, "direction": "in"},
    # biện pháp kiểm soát cái gì
    "verify": {"predicates": {"VERIFIES", "VALIDATES", "MITIGATES"}, "direction": "out"},
    # bối cảnh cấu trúc
    "overview": {"predicates": {"PART_OF", "SUBTYPE_OF"}, "direction": "both"},
}


def _node_map(graph: dict) -> dict:
    """Chấp nhận nodes dạng list hoặc dict."""
    nodes = graph.get("nodes", {})
    if isinstance(nodes, dict):
        return nodes
    return {n["id"]: n for n in nodes}


def load_graph(path: str | Path) -> dict:
    """Nạp graph dump (JSON.gz hoặc JSON). Trả {'nodes': {...}, 'edges': [...]}."""
    p = Path(path)
    opener = gzip.open if p.suffix == ".gz" else open
    with opener(p, "rt", encoding="utf-8") as f:
        raw = json.load(f)
    return {"nodes": _node_map(raw), "edges": list(raw.get("edges", []))}


def build_index(graph: dict) -> dict:
    """Chỉ số kề hai chiều: out[nid] = [(pred, other_id, edge)], in[nid] tương tự."""
    out: dict[str, list] = {}
    inn: dict[str, list] = {}
    for e in graph["edges"]:
        s, t, pred = e["source"], e["target"], e.get("relationship_name", "")
        out.setdefault(s, []).append((pred, t, e))
        inn.setdefault(t, []).append((pred, s, e))
    return {"out": out, "in": inn}


def resolve_node(graph: dict, name_or_id: str) -> str | None:
    """Tìm node id theo id hoặc tên (không phân biệt hoa thường, trim)."""
    nodes = _node_map(graph)
    key = name_or_id.strip().lower()
    if key in {k.lower() for k in nodes}:
        for nid in nodes:
            if nid.lower() == key:
                return nid
    for nid, n in nodes.items():
        if (n.get("name") or "").strip().lower() == key:
            return nid
    for nid, n in nodes.items():
        nm = (n.get("name") or "").strip().lower()
        if key and key in nm:
            return nid
    return None


def traverse(graph: dict, index: dict, start: str, allowed_predicates: set[str],
             direction: str = "both", k: int = 2, max_nodes: int = 60) -> dict:
    """BFS giới hạn: chỉ đi cạnh thuộc allowed_predicates, sâu k, theo direction."""
    s = resolve_node(graph, start)
    if s is None:
        return {"error": f"node not found: {start!r}"}
    nodes = _node_map(graph)
    seen_nodes = {s}
    kept_edges: list[dict] = []
    frontier = deque([(s, 0)])
    while frontier and len(seen_nodes) < max_nodes:
        nid, depth = frontier.popleft()
        if depth >= k:
            continue
        dirs = []
        if direction in ("out", "both"):
            dirs.append(index["out"].get(nid, []))
        if direction in ("in", "both"):
            dirs.append(index["in"].get(nid, []))
        for entries in dirs:
            for pred, other, edge in entries:
                if pred not in allowed_predicates:
                    continue
                if other not in seen_nodes:
                    seen_nodes.add(other)
                    frontier.append((other, depth + 1))
                if edge not in kept_edges:
                    kept_edges.append(edge)
    sub_nodes = [nodes[nid] for nid in seen_nodes if nid in nodes]
    return {"start": s, "nodes": sub_nodes, "edges": kept_edges}


def render_context(subgraph: dict, max_tokens: int = 1200, char_per_token: int = 4) -> str:
    """Render subgraph thành ngữ cảnh văn bản gọn cho LLM."""
    budget = max_tokens * char_per_token
    nodes = subgraph.get("nodes", [])
    nodes_by_id = ({n["id"]: n for n in nodes} if isinstance(nodes, list)
                   else dict(nodes))
    lines: list[str] = []
    for n in nodes_by_id.values():
        desc = (n.get("description") or "").strip()
        if desc:
            lines.append(f"{n.get('name', '?')} [{n.get('type', '?')}]: {desc[:160]}")
    for e in subgraph.get("edges", []):
        frm = (nodes_by_id.get(e["source"], {}).get("name") or e["source"])[:60]
        to = (nodes_by_id.get(e["target"], {}).get("name") or e["target"])[:60]
        lines.append(f"- {frm} -[{e.get('relationship_name', '?')}]-> {to}")
    out: list[str] = []
    used = 0
    for ln in lines:
        cost = len(ln) + 1
        if used + cost > budget:
            break
        out.append(ln)
        used += cost
    return "\n".join(out)
