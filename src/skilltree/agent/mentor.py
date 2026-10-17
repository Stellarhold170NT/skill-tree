"""SWEBOK Agent MVP — Mentor (Q&A VI) + Reviewer (Gap Analysis checklist).

Memory: dataset B1 (winner Stage B — semantic edges 42.1%).

Chế độ (cwd = /workspace):
  # Mentor: trả lời câu hỏi tiếng Việt bằng GRAPH_COMPLETION
  /opt/venv/bin/python src/skilltree/agent/mentor.py ask \
      "Verification và validation khác nhau thế nào?"

  # Reviewer: duyệt đồ thị KA -> checklist con -> Gap Analysis với draft
  /opt/venv/bin/python src/skilltree/agent/mentor.py review \
      --ka "Software Design" --draft path/to/draft.md

  # Batch Q&A từ file questions (mỗi dòng 1 câu) — dùng cho demo/eval
  /opt/venv/bin/python src/skilltree/agent/mentor.py batch --file questions.txt
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT / "src") not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / "src"))

from skilltree.eval.quick_eval import (  # noqa: E402
    extract_search_texts,
    find_dataset_graph_db,
    install_key_round_robin,
    load_env_file,
    read_keys,
)

DEFAULT_DATASET = "swebok_v4_b1"
OUT_DIR = REPO_ROOT / "runs" / "agent"

MENTOR_SYSTEM = (
    "Bạn là SWEBOK Principal Advisor — cố vấn kiến trúc & thẩm định dựa trên SWEBOK v4 "
    "(ISO/IEC TR 19759). Nguyên tắc: (1) KHÔNG lý thuyết suông — bám ngữ cảnh đồ thị được "
    "cung cấp; (2) chỉ ra đúng KA/section liên quan; (3) nếu ngữ cảnh không đủ, nói rõ "
    "'ngoài phạm vi kiến thức đã nạp' thay vì bịa; (4) trả lời tiếng Việt, ngắn gọn, có cấu trúc."
)

CHECKLIST_SYSTEM = (
    "Bạn là SWEBOK Reviewer. So khớp draft với checklist chuẩn từ đồ thị SWEBOK và xuất "
    "Gap Analysis dạng bảng: [Mục checklist | Trạng thái (COVERED/PARTIAL/MISSING) | Bằng chứng "
    "trong draft | Khuyến nghị]. KHÔNG bịa mục không có trong checklist; KHÔNG bắt buộc draft "
    "phải có mục không áp dụng — ghi N/A kèm lý do."
)


def cfg() -> dict:
    keys = read_keys()
    return {"model": os.environ.get("LLM_MODEL", ""), "endpoint": os.environ.get("LLM_ENDPOINT", ""),
            "api_key": keys[0] if keys else ""}





async def graph_answer(question: str, dataset: str) -> tuple[str, float]:
    import cognee
    from cognee.api.v1.search import SearchType

    t0 = time.perf_counter()
    res = await cognee.search(query_text=question, query_type=SearchType.GRAPH_COMPLETION,
                              datasets=[dataset])
    latency = round(time.perf_counter() - t0, 2)
    texts: list[str] = []
    for item in res or []:
        texts.extend(extract_search_texts(item))
    return "\n".join(texts)[:3000], latency


async def cmd_ask(question: str, dataset: str) -> dict:
    load_env_file()
    install_key_round_robin(read_keys())
    answer, latency = await graph_answer(question, dataset)
    out = await llm(
        f"Ngữ cảnh từ memory đồ thị SWEBOK:\n{answer}\n\nCâu hỏi: {question}\n\n"
        "Trả lời theo nguyên tắc hệ thống (bám ngữ cảnh, nêu KA/section, nói rõ nếu thiếu).",
        MENTOR_SYSTEM)
    row = {"mode": "ask", "question": question, "answer": out, "raw_context_chars": len(answer),
           "latency_graph_s": latency, "dataset": dataset,
           "ts": datetime.now(timezone.utc).isoformat()}
    print(f"\n=== MENTOR ({latency}s graph) ===\n{out}\n", flush=True)
    return row


async def cmd_review(ka: str, draft_path: str, dataset: str) -> dict:
    load_env_file()
    db_path = find_dataset_graph_db(dataset)
    if db_path is None:
        raise SystemExit(f"Không tìm thấy graph db {dataset}")
    from cognee.infrastructure.databases.graph.ladybug.adapter import LadybugAdapter

    db = LadybugAdapter(str(db_path))
    # 1-hop traversal rồi lọc parent theo tên KA trong Python (an toàn, tránh param API)
    raw = await db.query(
        "MATCH (a:Node)-[r]->(b:Node) "
        "RETURN coalesce(a.name,''), r.relationship_name, coalesce(b.name,'') LIMIT 800")
    items = []
    for row in (raw or []):
        if ka.lower() in str(row[0]).lower() and str(row[1]) not in ("contains", "made_from"):
            items.append({"parent": row[0], "rel": row[1], "child": row[2],
                          "description": ""})
    print(f"[review] {len(items)} node con từ KA '{ka}'", flush=True)

    dpath = Path(draft_path)
    draft = dpath.read_text(encoding="utf-8")[:8000] if dpath.exists() else ""
    checklist_txt = "\n".join(
        f"- [{i['rel']}] {i['child']}: {i['description']}" for i in items if i["child"])
    gap = await llm(
        f"Checklist các khía cạnh của KA '{ka}' (từ đồ thị SWEBOK):\n{checklist_txt}\n\n"
        f"Draft cần thẩm định:\n{draft}\n\n"
        "Xuất Gap Analysis: bảng [Mục checklist | COVERED/PARTIAL/MISSING/N/A | Bằng chứng | "
        "Khuyến nghị] + tổng kết số mục thiếu rủi ro nhất.",
        CHECKLIST_SYSTEM)
    out = {"mode": "review", "ka": ka, "draft": draft_path, "checklist_items": len(items),
           "items": items, "gap_analysis": gap, "dataset": dataset,
           "ts": datetime.now(timezone.utc).isoformat()}
    print(gap, flush=True)
    return out


async def cmd_batch(file_path: str, dataset: str) -> None:
    load_env_file()
    install_key_round_robin(read_keys())
    qs = [l.strip() for l in Path(file_path).read_text(encoding="utf-8").splitlines() if l.strip()]
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    rows = []
    for q in qs:
        row = await cmd_ask(q, dataset)
        rows.append(row)
    dest = OUT_DIR / f"batch_{datetime.now(timezone.utc).strftime('%H%M%S')}.jsonl"
    dest.write_text("\n".join(json.dumps(r, ensure_ascii=False) for r in rows), encoding="utf-8")
    print(f"[batch] wrote {len(rows)} -> {dest}", flush=True)


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["ask", "review", "batch"])
    ap.add_argument("--dataset", default=DEFAULT_DATASET)
    ap.add_argument("question", nargs="?", help="câu hỏi (mode ask)")
    ap.add_argument("--ka", help="KA để review (mode review)")
    ap.add_argument("--draft", help="đường dẫn draft (mode review)")
    ap.add_argument("--file", help="file câu hỏi (mode batch)")
    args = ap.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    if args.mode == "ask" and args.question:
        row = await cmd_ask(args.question, args.dataset)
        (OUT_DIR / "last_ask.json").write_text(
            json.dumps(row, ensure_ascii=False, indent=1), encoding="utf-8")
    elif args.mode == "review" and args.ka and args.draft:
        row = await cmd_review(args.ka, args.draft, args.dataset)
        (OUT_DIR / "last_review.json").write_text(
            json.dumps(row, ensure_ascii=False, indent=1), encoding="utf-8")
    elif args.mode == "batch" and args.file:
        await cmd_batch(args.file, args.dataset)
    else:
        ap.print_usage()
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
