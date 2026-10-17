"""Stage C — Entity Resolution: ĐỀ XUẤT gộp node (không tự ý merge).

Nguyên tắc từ review:
- Chỉ gộp biến thể bề mặt của CÙNG khái niệm (fault ≈ defect ≈ bug),
  KHÔNG gộp khái niệm kề trong chuỗi nhân quả (error != fault != failure, IEEE 610.12)
- Node tiêu đề mục gộp nhiều khái niệm → đề xuất TÁCH, không phải gộp
- Mọi đề xuất kèm evidence; quyết định cuối thuộc người/agent duyệt
"""

from __future__ import annotations

import re
import unicodedata

# Đồng nghĩa CÙNG khái niệm → canonical (theo IEEE 610.12 / SWEBOK)
SYNONYM_CANONICAL = {
    "fault": "Fault", "defect": "Fault", "bug": "Fault",
    "software fault": "Fault", "software defect": "Fault", "software bug": "Fault",
    "faults": "Fault", "defects": "Fault", "bugs": "Fault",
}
# KHÔNG gộp — khái niệm kề trong chuỗi nhân quả, phải giữ riêng
PROTECTED_CONCEPTS = {"failure", "failure mode", "error", "human error", "mistake"}

_PUNCT = re.compile(r"[^\w\s]")
_SPACES = re.compile(r"\s+")
_ARTICLES = {"the", "a", "an"}


def normalize(name: str) -> str:
    """Chuẩn hoá tên: lowercase, bỏ dấu câu, bỏ mạo từ đầu, gộp khoảng trắng."""
    s = unicodedata.normalize("NFKC", name or "").strip().lower()
    s = _PUNCT.sub(" ", s)
    s = _SPACES.sub(" ", s).strip()
    words = s.split()
    if words and words[0] in _ARTICLES:
        words = words[1:]
    return " ".join(words)


def _node_pairs(graph: dict):
    nodes = graph.get("nodes", {})
    if isinstance(nodes, dict):
        return list(nodes.items())
    return [(n.get("id", f"n{i}"), n) for i, n in enumerate(nodes)]


def _conflict(members: list[str]) -> bool:
    """Nhóm chứa khái niệm protected kèm khái niệm khác → REVIEW_REQUIRED."""
    keys = {normalize(m) for m in members}
    if any(k in PROTECTED_CONCEPTS for k in keys) and len(keys) > 1:
        return True
    return False


def canonical_of(members: list[str]) -> str:
    if _conflict(members):
        return "REVIEW_REQUIRED"
    for m in members:
        if normalize(m) in SYNONYM_CANONICAL:
            return SYNONYM_CANONICAL[normalize(m)]
    return sorted(members, key=len)[0]


def find_merge_groups(graph: dict, embed_fn=None, sim_threshold: float = 0.92) -> list[dict]:
    """Danh sách đề xuất gộp: [{kind, canonical, variants, evidence}]."""
    groups: dict[str, list] = {}
    for nid, n in _node_pairs(graph):
        key = normalize(n.get("name") or "")
        if not key:
            continue
        # nhóm qua synonym canonical: fault/defect/bug là CÙNG khái niệm
        key = SYNONYM_CANONICAL.get(key, key).lower()
        groups.setdefault(key, []).append({"id": nid, "name": n.get("name", "")})
    proposals = []
    for key, members in sorted(groups.items()):
        if len(members) < 2:
            continue
        proposals.append({
            "kind": "exact",
            "canonical": canonical_of([m["name"] for m in members]),
            "variants": members,
            "evidence": f"{len(members)} node normalize về cùng nhóm '{key}'",
        })
    if embed_fn is not None:
        proposals.extend(_semantic_groups(graph, embed_fn, sim_threshold))
    return proposals


def _semantic_groups(graph: dict, embed_fn, thr: float) -> list[dict]:
    import math

    items = [(nid, n.get("name", "")) for nid, n in _node_pairs(graph) if n.get("name")]
    if len(items) < 2:
        return []
    vecs = embed_fn([n for _, n in items])
    used: set[int] = set()
    out = []
    for i in range(len(items)):
        if i in used:
            continue
        cluster = [i]
        for j in range(i + 1, len(items)):
            if j in used:
                continue
            a, b = vecs[i], vecs[j]
            dot = sum(x * y for x, y in zip(a, b))
            na = math.sqrt(sum(x * x for x in a)) or 1.0
            nb = math.sqrt(sum(x * x for x in b)) or 1.0
            if dot / (na * nb) >= thr:
                cluster.append(j)
                used.add(j)
        if len(cluster) > 1:
            members = [items[c][1] for c in cluster]
            if not _conflict(members):
                out.append({
                    "kind": "semantic",
                    "canonical": canonical_of(members),
                    "variants": [{"id": items[c][0], "name": items[c][1]} for c in cluster],
                    "evidence": f"cosine >= {thr}",
                })
    return out


_HEADING_SEP = re.compile(r"\band\b|,|;")


def split_heading_candidates(graph: dict) -> list[dict]:
    """Phát hiện node là TIÊU ĐỀ MỤC gộp ≥2 khái niệm (vd 'Assertions, design by
    contract and defensive programming') → đề xuất tách thành leaf concepts."""
    out = []
    for nid, n in _node_pairs(graph):
        name = (n.get("name") or "").strip()
        if len(name) > 30 and _HEADING_SEP.search(name):
            parts = [p.strip() for p in _HEADING_SEP.split(name) if len(p.strip()) > 3]
            if len(parts) >= 2:
                out.append({
                    "node_id": nid,
                    "heading": name,
                    "proposed_leaves": parts,
                    "note": "heading gộp nhiều khái niệm — cần tách thành leaf concept riêng",
                })
    return out
