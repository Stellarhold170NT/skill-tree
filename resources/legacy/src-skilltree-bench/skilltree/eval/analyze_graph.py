"""Phân tích đồ thị 1 dataset: phân bố predicate, degree, entity types, isolation.

Chạy: /opt/venv/bin/python src/skilltree/eval/analyze_graph.py --dataset swebok_v4_b1
Ghi: runs/graph_probe/structure_<dataset>.json
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT / "src") not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / "src"))

from skilltree.eval.quick_eval import find_dataset_graph_db, load_env_file  # noqa: E402


def _n(x):
    try:
        return int(x)
    except (TypeError, ValueError):
        return 0


async def analyze(dataset: str) -> dict:
    db_path = find_dataset_graph_db(dataset)
    if db_path is None:
        raise SystemExit(f"Không tìm thấy graph db của dataset {dataset}")
    print(f"[graph] db: {db_path}")

    from cognee.infrastructure.databases.graph.ladybug.adapter import LadybugAdapter

    db = LadybugAdapter(str(db_path))

    rel_rows = await db.query(
        "MATCH ()-[r]->() RETURN r.relationship_name AS t, count(r) AS c ORDER BY c DESC")
    counts = [(row[0], _n(row[1])) for row in (rel_rows or [])]
    total = sum(c for _, c in counts) or 1

    node_rows = await db.query("MATCH (n) RETURN count(n)")
    n_nodes = _n((node_rows or [(0,)])[0][0])

    iso_rows = await db.query(
        "MATCH (n) WHERE NOT EXISTS { MATCH (n)--() } RETURN count(n)")
    n_iso = _n((iso_rows or [(0,)])[0][0])

    deg_rows = await db.query(
        "MATCH (n)-[r]-() RETURN n.name, count(r) AS d ORDER BY d DESC LIMIT 10")
    top_deg = [(str(r[0]), _n(r[1])) for r in (deg_rows or [])]

    type_rows = await db.query(
        "MATCH (n:Entity) RETURN n.type, count(*) AS c ORDER BY c DESC LIMIT 12")
    ent_types = [(str(r[0]), _n(r[1])) for r in (type_rows or [])]

    structural = {"contains", "is_a", "made_from", "authored", "published_at",
                  "has_timestamp"}
    samples = {}
    for label, _ in counts[:15]:
        ex_rows = await db.query(
            "MATCH (a)-[r:" + label + "]->(b) "
            "RETURN coalesce(a.name, a.text, toString(a.id)) AS an, "
            "coalesce(b.name, b.text, toString(b.id)) AS bn LIMIT 3")
        samples[label] = [{"from": r[0], "to": r[1]} for r in (ex_rows or [])]
    sem_count = sum(c for t, c in counts if t not in structural)

    return {
        "dataset": dataset,
        "nodes": n_nodes,
        "edges": total,
        "edge_ratio": round(total / max(1, n_nodes), 3),
        "isolated": n_iso,
        "isolated_pct": round(100 * n_iso / max(1, n_nodes), 2),
        "semantic_edges": sem_count,
        "semantic_pct": round(100 * sem_count / total, 1),
        "predicates": [{"type": t, "count": c, "pct": round(100 * c / total, 1)}
                       for t, c in counts[:15]],
        "predicate_samples": samples,
        "top_degree": top_deg,
        "entity_types": ent_types,
    }


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", default="swebok_v4")
    args = ap.parse_args()
    load_env_file()
    out = asyncio.run(analyze(args.dataset))
    dest = REPO_ROOT / "runs" / "graph_probe" / f"structure_{args.dataset}.json"
    dest.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps({k: out[k] for k in ("nodes", "edges", "semantic_pct",
                                          "isolated_pct", "edge_ratio")}, indent=1))
    print("[top predicates]", [(p["type"], p["pct"]) for p in out["predicates"][:8]])
    print("->", dest)
