"""graph_probe — khảo sát cấu trúc đồ thị + probe từng SearchType suy luận (Stage A+).

Chạy TRÊN MEMORY S2 đang sống (không prune, không rebuild — chỉ đọc + search):

  Bước 1: phân tích cấu trúc Ladybug db của dataset (resolve qua sqlite như
          extraction_sanity): phân bố loại quan hệ + ví dụ cạnh, top-degree nodes,
          degree distribution, tỷ lệ node theo loại -> runs/graph_probe/structure.json
  Bước 2: 3 câu hỏi đa bước (tiếng Việt) × các SearchType suy luận đồ thị
          (GRAPH_COMPLETION, GRAPH_COMPLETION_COT, GRAPH_COMPLETION_CONTEXT_EXTENSION,
          TRIPLET_COMPLETION, GRAPH_SUMMARY_COMPLETION) + 1 query CYPHER
          -> runs/graph_probe/probe_results.json (raw answer ĐẦY ĐỦ, latency, lỗi)
  Bước 3: nhận xét định tính -> runs/graph_probe/probe_notes.md (viết tay sau khi xem)

Sử dụng (cwd = /workspace):
  /opt/venv/bin/python src/skilltree/eval/graph_probe.py
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
import time
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT / "src") not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / "src"))

OUT_DIR = REPO_ROOT / "runs" / "graph_probe"
DATASET = "swebok_v4"

QUESTIONS = [
    "Verification và validation khác nhau thế nào, và chúng thuộc hoạt động nào theo SWEBOK?",
    "Để kiểm thử tốt cần những kỹ thuật thiết kế test case nào và chúng thuộc kiến thức nền gì?",
    "Mối liên hệ giữa kiến trúc phần mềm và chất lượng phần mềm được SWEBOK mô tả ra sao?",
]

SEARCH_TYPES = [
    "GRAPH_COMPLETION",
    "GRAPH_COMPLETION_COT",
    "GRAPH_COMPLETION_CONTEXT_EXTENSION",
    "TRIPLET_COMPLETION",
    "GRAPH_SUMMARY_COMPLETION",
]

CYPHER_QUERY = (
    "MATCH (a:Node)-[r:EDGE]->(b:Node) "
    "WHERE toLower(a.name) CONTAINS 'testing' "
    "RETURN a.name, r.relationship_name, b.name LIMIT 20"
)


def node_label(props: dict, limit: int = 80) -> str:
    name = str(props.get("name") or props.get("text") or "(không tên)")
    name = " ".join(name.split())
    return name[:limit]


def load_env() -> None:
    from dotenv import load_dotenv

    load_dotenv(REPO_ROOT / ".env", override=False)


def install_rr() -> None:
    from skilltree.eval.quick_eval import install_key_round_robin, read_keys

    keys = read_keys()
    n = install_key_round_robin(keys)
    print(f"[llm-keys] round-robin: {'ON (' + str(n) + ' keys)' if n else 'OFF'}")


# ------------------------------------------------------------- bước 1 --------

async def analyse_structure() -> dict:
    from skilltree.eval.quick_eval import find_dataset_graph_db
    from cognee.infrastructure.databases.graph.ladybug.adapter import LadybugAdapter

    db_path = find_dataset_graph_db(DATASET)
    if db_path is None:
        return {"error": "không tìm thấy file .lbug"}
    adapter = LadybugAdapter(db_path=str(db_path))
    try:
        nodes, edges = await adapter.get_graph_data()
    finally:
        close = getattr(adapter, "close", None)
        if close is not None:
            res = close()
            if asyncio.iscoroutine(res):
                await res

    node_props: dict[str, dict] = {}
    label_of: dict[str, str] = {}
    type_of: dict[str, str] = {}
    for nid, props in nodes:
        props = props if isinstance(props, dict) else {}
        node_props[nid] = props
        label_of[nid] = node_label(props)
        type_of[nid] = str(props.get("type") or "UNKNOWN")

    # --- phân bố loại quan hệ + 5 ví dụ cạnh / loại
    rel_counter: Counter = Counter()
    rel_examples: dict[str, list] = defaultdict(list)
    for src, dst, rel, _props in edges:
        rel = str(rel)
        rel_counter[rel] += 1
        if len(rel_examples[rel]) < 5:
            rel_examples[rel].append({
                "subject": label_of.get(src, str(src)[:12]),
                "subject_type": type_of.get(src, "?"),
                "object": label_of.get(dst, str(dst)[:12]),
                "object_type": type_of.get(dst, "?"),
            })
    rel_distribution = [
        {
            "relation": rel,
            "count": cnt,
            "pct": round(100 * cnt / len(edges), 1),
            "examples": rel_examples[rel],
        }
        for rel, cnt in rel_counter.most_common(15)
    ]

    # --- degree (vô hướng) từng node
    degree: Counter = Counter()
    for src, dst, _rel, _p in edges:
        degree[src] += 1
        degree[dst] += 1
    degs = sorted(degree.values())
    n_nodes = len(nodes)
    top_nodes = [
        {
            "name": label_of.get(nid, str(nid)[:12]),
            "type": type_of.get(nid, "?"),
            "degree": deg,
        }
        for nid, deg in degree.most_common(10)
    ]
    isolated = sum(1 for nid in node_props if degree[nid] == 0)

    # --- tỷ lệ node theo loại bảng
    type_counter = Counter(type_of.values())

    # --- EntityType thật: entity -> is_a -> EntityType (nếu có)
    et_counter: Counter = Counter()
    for src, dst, rel, _p in edges:
        if str(rel).lower() in ("is_a", "isa"):
            et_counter[label_of.get(dst, "?")] += 1

    structure = {
        "dataset": DATASET,
        "graph_db": str(db_path),
        "analysed_at": datetime.now(timezone.utc).isoformat(),
        "n_nodes": n_nodes,
        "n_edges": len(edges),
        "node_edge_ratio": round(n_nodes / len(edges), 3) if edges else None,
        "node_types": [
            {"type": t, "count": c, "pct": round(100 * c / n_nodes, 1)}
            for t, c in type_counter.most_common()
        ],
        "n_distinct_relations": len(rel_counter),
        "relation_distribution_top15": rel_distribution,
        "degree": {
            "mean": round(sum(degs) / len(degs), 2) if degs else 0,
            "median": degs[len(degs) // 2] if degs else 0,
            "max": degs[-1] if degs else 0,
            "n_isolated_nodes": isolated,
            "pct_isolated": round(100 * isolated / n_nodes, 1) if n_nodes else None,
        },
        "top10_degree_nodes": top_nodes,
        "entity_type_distribution_via_is_a": [
            {"type": t, "count": c} for t, c in et_counter.most_common(15)
        ],
    }
    return structure


# ------------------------------------------------------------- bước 2 --------

async def probe_search_types() -> list[dict]:
    import cognee
    from cognee.api.v1.search import SearchType
    from skilltree.eval.quick_eval import extract_search_texts

    results = []
    for q_i, question in enumerate(QUESTIONS, 1):
        for st_name in SEARCH_TYPES:
            entry: dict = {
                "question_index": q_i,
                "question": question,
                "search_type": st_name,
            }
            t0 = time.perf_counter()
            try:
                res = await cognee.search(
                    query_text=question,
                    query_type=SearchType[st_name],
                    datasets=[DATASET],
                )
                entry["latency_seconds"] = round(time.perf_counter() - t0, 2)
                raw_texts: list[str] = []
                for item in res or []:
                    raw_texts.extend(extract_search_texts(item))
                    # TRIPLET_COMPLETION có thể trả về triplet (s, p, o) không phải text
                    if isinstance(item, dict) and not raw_texts:
                        raw_texts.append(json.dumps(item, ensure_ascii=False, default=str))
                entry["answer"] = "\n\n---\n\n".join(t for t in raw_texts if t.strip()) or \
                    json.dumps(res, ensure_ascii=False, default=str)[:3000]
                entry["n_result_items"] = len(res) if isinstance(res, list) else 1
                print(f"[probe Q{q_i} {st_name}] OK {entry['latency_seconds']}s "
                      f"len={len(entry['answer'])}", flush=True)
            except Exception as exc:  # noqa: BLE001
                entry["latency_seconds"] = round(time.perf_counter() - t0, 2)
                entry["error"] = f"{type(exc).__name__}: {exc}"[:400]
                print(f"[probe Q{q_i} {st_name}] ERROR: {entry['error'][:120]}", flush=True)
            results.append(entry)

        # CYPHER: 1 query liệt kê cạnh từ "Software Testing" (chỉ chạy cho Q2)
        if q_i == 2:
            entry = {"question_index": q_i, "question": question,
                     "search_type": "CYPHER", "cypher_query": CYPHER_QUERY}
            t0 = time.perf_counter()
            try:
                res = await cognee.search(
                    query_text=CYPHER_QUERY,
                    query_type=SearchType.CYPHER,
                    datasets=[DATASET],
                )
                entry["latency_seconds"] = round(time.perf_counter() - t0, 2)
                rows = []
                for item in res or []:
                    if isinstance(item, dict):
                        rows.append(item)
                    else:
                        rows.append(str(item))
                entry["answer"] = json.dumps(rows, ensure_ascii=False, default=str)[:5000]
                entry["n_result_items"] = len(res) if isinstance(res, list) else 1
                print(f"[probe Q2 CYPHER] OK {entry['latency_seconds']}s "
                      f"rows={entry['n_result_items']}", flush=True)
            except Exception as exc:  # noqa: BLE001
                entry["latency_seconds"] = round(time.perf_counter() - t0, 2)
                entry["error"] = f"{type(exc).__name__}: {exc}"[:400]
                print(f"[probe Q2 CYPHER] ERROR: {entry['error'][:160]}", flush=True)
            results.append(entry)
    return results


async def main() -> int:
    load_env()
    install_rr()
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    print("=== Bước 1: cấu trúc đồ thị ===", flush=True)
    t0 = time.perf_counter()
    structure = await analyse_structure()
    print(f"[structure] {time.perf_counter() - t0:.1f}s | nodes={structure.get('n_nodes')} "
          f"edges={structure.get('n_edges')} rel_types={structure.get('n_distinct_relations')}",
          flush=True)
    for r in (structure.get("relation_distribution_top15") or [])[:10]:
        print(f"  {r['relation']}: {r['count']} ({r['pct']}%) — vd: "
              f"{r['examples'][0]['subject'][:40]} -> {r['examples'][0]['object'][:40]}"
              if r.get("examples") else f"  {r['relation']}: {r['count']}", flush=True)
    print(f"  degree: {json.dumps(structure.get('degree'), ensure_ascii=False)}", flush=True)
    (OUT_DIR / "structure.json").write_text(
        json.dumps(structure, ensure_ascii=False, indent=2, default=str), encoding="utf-8")

    print("=== Bước 2: probe SearchType × 3 câu đa bước ===", flush=True)
    t0 = time.perf_counter()
    probes = await probe_search_types()
    print(f"[probe] tổng {time.perf_counter() - t0:.1f}s cho {len(probes)} call", flush=True)
    (OUT_DIR / "probe_results.json").write_text(
        json.dumps({
            "dataset": DATASET,
            "probed_at": datetime.now(timezone.utc).isoformat(),
            "questions": QUESTIONS,
            "search_types": SEARCH_TYPES + ["CYPHER"],
            "results": probes,
        }, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    print("=== DONE: runs/graph_probe/{structure.json, probe_results.json} ===", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
