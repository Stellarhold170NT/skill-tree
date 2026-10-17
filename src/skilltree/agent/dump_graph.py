"""Dump toàn bộ graph 1 dataset ra JSON nén (artifact commit-able).

Chạy: /opt/venv/bin/python src/skilltree/agent/dump_graph.py --dataset swebok_v4_b1
Ghi:  artifacts/graph_<dataset>.json.gz
"""

from __future__ import annotations

import argparse
import asyncio
import gzip
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT / "src") not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / "src"))

from skilltree.eval.quick_eval import find_dataset_graph_db, load_env_file  # noqa: E402


async def dump(dataset: str) -> dict:
    db_path = find_dataset_graph_db(dataset)
    if db_path is None:
        raise SystemExit(f"không thấy db {dataset}")
    from cognee.infrastructure.databases.graph.ladybug.adapter import LadybugAdapter

    db = LadybugAdapter(str(db_path))
    nodes = await db.query("MATCH (n:Node) RETURN n.id, n.name, n.type LIMIT 20000")
    edges = await db.query(
        "MATCH (a:Node)-[r]->(b:Node) RETURN a.id, r.relationship_name, b.id LIMIT 50000")
    node_list = [{"id": str(r[0]), "name": r[1], "type": r[2]} for r in (nodes or [])]
    edge_list = [{"src": str(r[0]), "rel": r[1], "dst": str(r[2])} for r in (edges or [])]
    return {"dataset": dataset, "n_nodes": len(node_list), "n_edges": len(edge_list),
            "nodes": node_list, "edges": edge_list}


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", default="swebok_v4_b1")
    args = ap.parse_args()
    load_env_file()
    out = asyncio.run(dump(args.dataset))
    (REPO_ROOT / "artifacts").mkdir(exist_ok=True)
    dest = REPO_ROOT / "artifacts" / f"graph_{args.dataset}.json.gz"
    with gzip.open(dest, "wt", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False)
    print(f"dumped {out['n_nodes']} nodes / {out['n_edges']} edges -> {dest} "
          f"({dest.stat().st_size // 1024} KB gz)")
