"""Prototype Graph→Chunk grounding: duyệt đồ thị B1 → lấy chunk GỐC.

Đáp ứng đề xuất "Graph-first, chunk làm bằng chứng": Agent dùng đồ thị định hướng
đường ray suy luận, chunk nguyên bản (DocumentChunk) làm bằng chứng đối chiếu.

Chạy: /opt/venv/bin/python src/skilltree/agent/graph_to_chunks.py --entity "Design by Contract"
Ghi:  runs/agent/graph_chunks_<slug>.json
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT / "src") not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / "src"))

from skilltree.eval.quick_eval import find_dataset_graph_db, load_env_file  # noqa: E402


async def main(entity: str, dataset: str) -> None:
    load_env_file()
    db_path = find_dataset_graph_db(dataset)
    if db_path is None:
        raise SystemExit(f"không thấy db của {dataset}")
    from cognee.infrastructure.databases.graph.ladybug.adapter import LadybugAdapter

    db = LadybugAdapter(str(db_path))

    # 1) Tìm node khớp tên (không phân biệt hoa thường) — lọc trong Python
    raw = await db.query("MATCH (n:Node) RETURN n.id, n.name, n.type LIMIT 3000")
    hits = [r for r in (raw or []) if entity.lower() in str(r[1] or "").lower()]
    print(f"[1] node khớp '{entity}': {len(hits)}")
    for r in hits[:5]:
        print("    ", r[1], "|", r[2])

    if not hits:
        return

    # 2) Duyệt 1-hop quanh node đầu tiên: quan hệ + node kề
    nid = str(hits[0][0])
    neighbors = await db.query(
        "MATCH (a:Node)-[r]->(b:Node) WHERE a.id = '" + nid + "' "
        "RETURN r.relationship_name, coalesce(b.name,''), b.type LIMIT 40")
    print(f"[2] quan hệ 1-hop của '{hits[0][1]}': {len(neighbors or [])}")
    for r in (neighbors or [])[:12]:
        print("    -", r[0], "->", r[1], f"({r[2]})")

    # 3) Truy ngược DocumentChunk chứa entity (cạnh contains: chunk -> entity)
    chunk_rows = await db.query(
        "MATCH (c:Node)-[r]->(e:Node) WHERE e.id = '" + nid + "' "
        "AND r.relationship_name = 'contains' "
        "RETURN c.id, c.name, c.type LIMIT 5")
    print(f"[3] DocumentChunk chứa entity: {len(chunk_rows or [])}")
    chunks = []
    for r in (chunk_rows or []):
        chunks.append({"chunk_id": str(r[0]), "name": r[1], "type": r[2]})
    for c in chunks:
        m = re.search(r"p\.\s*(\d+)|page\s*(\d+)", c["name"] or "", re.I)
        c["page_guess"] = (m.group(1) or m.group(2)) if m else None

    out = {"entity": entity, "dataset": dataset, "matched_nodes": [
               {"id": str(r[0]), "name": r[1], "type": r[2]} for r in hits[:5]],
           "one_hop": [{"rel": r[0], "neighbor": r[1], "type": r[2]}
                       for r in (neighbors or [])[:12]],
           "source_chunks": chunks}
    dest = REPO_ROOT / "runs" / "agent" / f"graph_chunks_{re.sub(r'[^a-zA-Z0-9]+', '_', entity)[:40]}.json"
    dest.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print("->", dest)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--entity", required=True)
    ap.add_argument("--dataset", default="swebok_v4_b1")
    args = ap.parse_args()
    asyncio.run(main(args.entity, args.dataset))
