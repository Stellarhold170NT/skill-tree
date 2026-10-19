"""C5 Bước 5 — C3 re-audit trên graph C5: chấm ĐÚNG NGHĨA cạnh bằng LLM.

Khác C3 gốc (audit_edges.py): graph C5 do cognee lưu relationship_name đã
lowercase và cạnh semantic nằm cạnh cạnh infra (contains/is_a/made_from/
is_part_of) — script này:
  1. query trực tiếp Ladybug DB của dataset (nodes + edges + properties)
  2. lọc CHỈ cạnh semantic (sản phẩm C5), chuẩn hoá predicate về UPPER để tra
     PREDICATE_DOC (cảnh báo normalize trong swebok.py)
  3. sample phân tầng n=100 seed=7 (>=1 cạnh/predicate)
  4. LLM chấm từng cạnh: "A -[PRED]-> B có đúng ngữ nghĩa không?" với định
     nghĩa predicate từ PREDICATE_DOC + ngữ cảnh edge_text, temp 0.1,
     round-robin 3 keys (.env), retry 3 lần khi rỗng/không parse được
  5. ghi artifacts/c5-audit-sample.jsonl + artifacts/c5-audit-precision.json

Chạy: /opt/venv/bin/python src/skilltree/eval/c5_audit_edges.py --dataset swebok_v4_c5
"""

from __future__ import annotations

import argparse
import asyncio
import json
import random
import re
import sys
from collections import defaultdict
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT / "src") not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / "src"))

from skilltree.eval.ab_probe import client_cfg, litellm_text  # noqa: E402
from skilltree.eval.quick_eval import (  # noqa: E402
    find_dataset_graph_db,
    install_key_round_robin,
    load_env_file,
    read_keys,
)
from skilltree.ontology.swebok import PREDICATE_DOC, parse_confidence  # noqa: E402

# Cạnh infra do cognee tự sinh (không phải sản phẩm extraction của C5)
INFRA_PREDS = {"contains", "is_a", "made_from", "is_part_of", "belongs_to"}

JUDGE_SYSTEM = "Bạn là chuyên gia SWEBOK chấm chất lượng đồ thị tri thức. Chỉ trả về JSON."

JUDGE_TEMPLATE = """Chấm tính đúng ngữ nghĩa của một cạnh trong đồ thị tri thức SWEBOK v4.

Cạnh: "{src}" -[{pred}]-> "{dst}"
Định nghĩa predicate {pred}: {pred_doc}
Ngữ cảnh từ tài liệu (edge_text): {edge_text}

Cạnh đúng nếu vai trò của {pred} giữa {src} và {dst} khớp định nghĩa trên (dựa vào ngữ cảnh và hiểu biết SWEBOK chuẩn). Cạnh sai nếu quan hệ bịa, ngược chiều, hoặc {pred} dùng sai loại cặp khái niệm.
Trả về JSON duy nhất: {{"correct": true}} hoặc {{"correct": false}}"""


async def load_graph(dataset: str) -> dict:
    from cognee.infrastructure.databases.graph.ladybug.adapter import LadybugAdapter

    db = LadybugAdapter(str(find_dataset_graph_db(dataset)))
    nodes = await db.query(
        "MATCH (n:Node) RETURN n.id, n.name, n.type, n.properties LIMIT 50000")
    edges = await db.query(
        "MATCH (a:Node)-[r]->(b:Node) RETURN a.id, r.relationship_name, b.id, r.properties LIMIT 200000")
    id2name, id2type = {}, {}
    for nid, name, ntype, props in nodes:
        key = str(nid)
        id2name[key] = name or key[:8]
        id2type[key] = ntype
    semantic = []
    for src, rel, dst, props in edges:
        pred = (rel or "").lower()
        if pred in INFRA_PREDS:
            continue
        p = json.loads(props) if props else {}
        txt = (p.get("edge_text") or "").strip()
        confidence, _ = parse_confidence(txt)
        semantic.append({
            "source_id": str(src), "target_id": str(dst),
            "source": id2name.get(str(src), str(src)),
            "target": id2name.get(str(dst), str(dst)),
            "relationship_name": (rel or "?").upper(),
            "edge_text": txt,
            "confidence": confidence,
        })
    return {"nodes": [{"id": str(n[0]), "name": n[1], "type": n[2]} for n in nodes],
            "edges": semantic}


def stratified_sample(edges: list, n: int, seed: int) -> list:
    rng = random.Random(seed)
    by_pred = defaultdict(list)
    for e in edges:
        by_pred[e["relationship_name"]].append(e)
    sample = []
    for pred in sorted(by_pred):
        pool = by_pred[pred]
        sample.extend(rng.sample(pool, min(max(1, n // len(by_pred)), len(pool))))
    seen = set()
    for e in sample:
        seen.add(id(e))
    rest = [e for e in edges if id(e) not in seen]
    while len(sample) < n and rest:
        sample.append(rest.pop(rng.randrange(len(rest))))
    return sample[:n]


def parse_judge(text: str):
    if not text:
        return None
    m = re.search(r'"correct"\s*:\s*(true|false)', text, re.IGNORECASE)
    if m:
        return m.group(1).lower() == "true"
    return None


async def audit_edge(cfg, e: dict, sem: asyncio.Semaphore, tries: int = 3) -> dict:
    pred = e["relationship_name"]
    prompt = JUDGE_TEMPLATE.format(
        src=e["source"][:120], dst=e["target"][:120], pred=pred,
        pred_doc=PREDICATE_DOC.get(pred, "quan hệ khác"),
        edge_text=(e["edge_text"] or "(không có)")[:400],
    )
    verdict = None
    async with sem:
        for attempt in range(tries):
            try:
                text = await litellm_text(cfg, prompt, system=JUDGE_SYSTEM, max_tokens=1000)
                verdict = parse_judge(text)
                if verdict is not None:
                    break
            except Exception as exc:  # noqa: BLE001
                if attempt == tries - 1:
                    e["error"] = f"{type(exc).__name__}: {str(exc)[:120]}"
            await asyncio.sleep(2 * (attempt + 1))
    e["correct"] = verdict
    return e


async def main(dataset: str, n: int, seed: int, concurrency: int) -> dict:
    load_env_file()
    keys = read_keys()
    n_rr = install_key_round_robin(keys)
    cfg = client_cfg()
    print(f"[audit] keys round-robin: {n_rr} keys | dataset={dataset}")
    graph = await load_graph(dataset)
    print(f"[audit] graph: {len(graph['nodes'])} nodes / {len(graph['edges'])} semantic edges")
    sample = stratified_sample(graph["edges"], n=n, seed=seed)
    print(f"[audit] sample {len(sample)} edges (seed={seed})")
    sem = asyncio.Semaphore(concurrency)
    done = await asyncio.gather(*[audit_edge(cfg, dict(e), sem) for e in sample])
    out_dir = REPO_ROOT / "artifacts"
    out_dir.mkdir(exist_ok=True)
    sample_path = out_dir / "c5-audit-sample.jsonl"
    sample_path.write_text(
        "\n".join(json.dumps(e, ensure_ascii=False) for e in done), encoding="utf-8")
    scored = [e for e in done if e.get("correct") is not None]
    per = defaultdict(lambda: {"n": 0, "ok": 0})
    for e in scored:
        per[e["relationship_name"]]["n"] += 1
        if e["correct"]:
            per[e["relationship_name"]]["ok"] += 1
    result = {
        "dataset": dataset,
        "semantic_edges_total": len(graph["edges"]),
        "sampled": len(done),
        "scored": len(scored),
        "unscored": len(done) - len(scored),
        "precision_total": round(sum(e["correct"] for e in scored) / len(scored), 3) if scored else None,
        "target": 0.90,
        "pass": bool(scored) and sum(e["correct"] for e in scored) / len(scored) >= 0.90,
        "per_predicate": {
            p: {"precision": round(v["ok"] / v["n"], 3), "n": v["n"]}
            for p, v in sorted(per.items())
        },
        "note": "predicate đã UPPERCASE từ dạng lowercase cognee lưu; cạnh infra (contains/is_a/made_from/is_part_of) loại khỏi audit vì không phải sản phẩm C5",
    }
    (out_dir / "c5-audit-precision.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return result


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", default="swebok_v4_c5")
    ap.add_argument("--n", type=int, default=100)
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--concurrency", type=int, default=5)
    args = ap.parse_args()
    asyncio.run(main(args.dataset, args.n, args.seed, args.concurrency))
