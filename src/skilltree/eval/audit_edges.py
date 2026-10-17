"""Stage C — Audit mẫu cạnh: đo edge precision theo review (chỉ tiêu >= 90%).

Chảy 2 pha:
1. sample_edges: chọn n cạnh phân tầng theo predicate -> JSONL để chấm tay/LLM-audit
2. audit_summary: đọc kết quả chấm (JSONL có trường 'correct') -> precision theo predicate
"""

from __future__ import annotations

import json
import random
from collections import defaultdict
from pathlib import Path


def sample_edges(graph: dict, n: int = 100, stratified: bool = True, seed: int = 7) -> list[dict]:
    """Chọn mẫu cạnh. stratified=True: đều theo predicate (ít nhất 1 cạnh/loại)."""
    rng = random.Random(seed)
    by_pred: dict[str, list] = defaultdict(list)
    for e in graph["edges"]:
        by_pred[e.get("relationship_name", "?")].append(e)
    sample: list[dict] = []
    preds = sorted(by_pred)
    if stratified:
        per = max(1, n // max(1, len(preds)))
        for p in preds:
            pool = by_pred[p]
            sample.extend(rng.sample(pool, min(per, len(pool))))
    # bù cho đủ n
    rest = [e for e in graph["edges"] if e not in sample]
    while len(sample) < n and rest:
        sample.append(rest.pop(rng.randrange(len(rest))))
    nodes = graph["nodes"]
    if isinstance(nodes, list):
        nodes = {n.get("id", f"n{i}"): n for i, n in enumerate(nodes)}
    out = []
    for e in sample:
        out.append({
            "edge": {"source": e["source"], "target": e["target"],
                     "relationship_name": e.get("relationship_name", "?"),
                     "properties": e.get("properties", {})},
            "from": (nodes.get(e["source"], {}).get("name") or e["source"]),
            "to": (nodes.get(e["target"], {}).get("name") or e["target"]),
            "predicate": e.get("relationship_name", "?"),
            "sampled_for_audit": True,
            "correct": None,
        })
    return out


def write_sample(graph: dict, path: str | Path, n: int = 100) -> Path:
    rows = sample_edges(graph, n=n)
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text("\n".join(json.dumps(r, ensure_ascii=False) for r in rows), encoding="utf-8")
    return p


def audit_summary(audited_path: str | Path) -> dict:
    """Đọc file audit đã chấm (mỗi dòng JSON có 'correct': true/false/null)."""
    per: dict[str, dict] = defaultdict(lambda: {"n": 0, "ok": 0})
    total = {"n": 0, "ok": 0}
    for line in Path(audited_path).read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        r = json.loads(line)
        if r.get("correct") is None:
            continue
        p = r.get("predicate", "?")
        per[p]["n"] += 1
        total["n"] += 1
        if r["correct"]:
            per[p]["ok"] += 1
            total["ok"] += 1
    return {
        "precision_total": round(total["ok"] / total["n"], 3) if total["n"] else None,
        "n_audited": total["n"],
        "target": 0.90,
        "pass": bool(total["n"]) and total["ok"] / total["n"] >= 0.90,
        "per_predicate": {
            p: {"precision": round(v["ok"] / v["n"], 3) if v["n"] else None, "n": v["n"]}
            for p, v in sorted(per.items())
        },
    }
