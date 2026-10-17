"""eval — truy xuất + đánh giá Memory (bản mỏng của Task 5, phục vụ Giai đoạn A).

quick_eval.py 2 chế độ:
  recall : cognee.search GRAPH_COMPLETION (câu trả lời) + CHUNKS (context)
           cho mỗi câu trong questions.jsonl (lọc theo KA) -> runs/<run_id>/answers.jsonl
  eval   : đọc answers.jsonl -> judge GLM:
             - correctness 0-1 (semantic, tiếng Việt)
             - context_coverage SEMANTIC (chính): context (EN) có đủ thông tin trả
               lời câu hỏi (VI) không — chéo ngôn ngữ được, chấm theo ý nghĩa
             - context_coverage_lexical (phụ): token overlap gold VI vs context EN
             + extraction sanity (từ graph: node/edge, % description, top entity type)
           -> runs/<run_id>/metrics.json

Lưu ý hình dạng kết quả (cognee 1.6.4, đã probe runtime):
- search() trả về list[dict] với khoá: dataset_id, dataset_name, dataset_tenant_id,
  search_result. GRAPH_COMPLETION -> search_result: list[str];
  CHUNKS -> search_result: list[dict] có khoá 'text' (chunk model).
- get_graph_engine() ở process MỚI mở graph db rỗng (graph Ladybug là per-dataset,
  uuid nằm trong tên file <dataset_id>.lbug). extraction_sanity resolve tay qua
  bảng datasets (sqlite của cognee_system) rồi mở LadybugAdapter(db_path) trực tiếp.
- GLM thinking model: max_completion_tokens thấp có khi làm content rỗng
  (reasoning ăn hết budget) — judge dùng 2000 token + fallback reasoning_content.

Sử dụng (cwd = /workspace):
  /opt/venv/bin/python src/skilltree/eval/quick_eval.py recall --run-id run-00 \
      --kas "Software Requirements,Software Testing,Software Quality,Software Security"
  /opt/venv/bin/python src/skilltree/eval/quick_eval.py eval --run-id run-00 \
      --dataset swebok_v4
"""

from __future__ import annotations

import argparse
import asyncio
import glob
import json
import os
import re
import sqlite3
import sys
import time
import unicodedata
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT / "src") not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / "src"))

QUESTIONS_PATH = REPO_ROOT / "corpora" / "swebok-v4" / "questions.jsonl"

JUDGE_SYSTEM = (
    "Bạn là chấm điểm đánh giá chất lượng câu trả lời (tiếng Việt) về SWEBOK v4. "
    "Chỉ trả về một dòng JSON duy nhất."
)
JUDGE_TEMPLATE = """Câu hỏi: {question}

Đáp án chuẩn (gold, lấy từ SWEBOK v4): {gold}

Câu trả lời cần chấm (từ memory agent): {answer}

Chấm điểm độ chính xác ngữ nghĩa (correctness) của câu trả lời so với gold, thang 0.0-1.0:
- 1.0: đúng và đủ ý chính như gold, không có thông tin sai.
- 0.5: đúng một phần ý chính, thiếu thông tin quan trọng hoặc mơ hồ.
- 0.0: sai, trái ngược gold, hoặc không liên quan.
Chỉ đánh giá nội dung so với gold, không thêm yêu cầu ngoài gold.
Trả về JSON: {{"score": <số 0.0-1.0>, "reason": "<1 câu ngắn>"}}"""

JUDGE_COVERAGE_TEMPLATE = """Câu hỏi: {question}

Đáp án chuẩn (gold, tiếng Việt): {gold}

Các đoạn trích từ bộ nhớ (context, có thể tiếng Anh): {context}

Câu hỏi: các đoạn trích trên có chứa đủ thông tin cần thiết để trả lời câu hỏi không
(chấm theo Ý NGHĨA, cho phép khác ngôn ngữ giữa gold và context)?
- 1.0: có — một hoặc nhiều đoạn chứa thông tin trả lời được câu hỏi.
- 0.5: chỉ chứa một phần thông tin cần thiết.
- 0.0: không — không đoạn nào liên quan.
Trả về JSON: {{"score": <số>, "reason": "<1 câu ngắn>"}}"""


# ------------------------------------------------------------------ utils ----

def load_env_file() -> None:
    from dotenv import load_dotenv

    load_dotenv(REPO_ROOT / ".env", override=False)


def read_keys() -> list[str]:
    keys: list[str] = []
    for name in ("LLM_API_KEY", "LLM_API_KEY_2", "LLM_API_KEY_3"):
        value = os.environ.get(name, "").strip()
        if value and value not in keys:
            keys.append(value)
    return keys


def install_key_round_robin(keys: list[str]) -> int:
    """Giống build_memory — xoay vòng api_key trên litellm.acompletion."""
    import itertools

    import litellm

    if getattr(litellm.acompletion, "__skilltree_rr__", False):
        return 0
    if len(keys) < 2:
        return 0
    cycle = itertools.cycle(keys)
    original = litellm.acompletion

    async def rotating(*args, **kwargs):
        kwargs["api_key"] = next(cycle)
        return await original(*args, **kwargs)

    rotating.__skilltree_rr__ = True  # type: ignore[attr-defined]
    litellm.acompletion = rotating
    return len(keys)


def norm_tokens(text: str) -> set[str]:
    """Token hoá để đo overlap: bỏ dấu tiếng Việt, lowercase, token >=2 ký tự."""
    text = unicodedata.normalize("NFD", text.lower())
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    return {t for t in re.split(r"[^a-z0-9]+", text) if len(t) >= 2}


def extract_search_texts(result_item: object) -> list[str]:
    """Trích text từ 1 phần tử của cognee.search() (dict của cognee 1.6.4).

    GRAPH_COMPLETION -> search_result: list[str]
    CHUNKS           -> search_result: list[dict] có khoá 'text'
    """
    if isinstance(result_item, dict):
        sr = result_item.get("search_result")
    else:
        sr = getattr(result_item, "search_result", None)
        if sr is None:
            t = getattr(result_item, "text", None)
            sr = [t] if t is not None else None
    if isinstance(sr, str):
        return [sr]
    out: list[str] = []
    if isinstance(sr, list):
        for e in sr:
            if isinstance(e, dict):
                out.append(str(e.get("text") or e.get("search_result") or ""))
            else:
                out.append(str(e))
    return [t for t in (s.strip() for s in out) if t]


# ---------------------------------------------------- dataset graph db path ---

def find_dataset_graph_db(dataset_name: str) -> Path | None:
    """Tìm file graph Ladybug của dataset: databases/**/<dataset_id>.lbug.

    get_graph_engine() ở process MỚI mở db rỗng (graph Ladybug là per-dataset),
    nên resolve tay qua bảng datasets (sqlite của cognee_system).
    """
    sys_root = Path(os.environ.get("SYSTEM_ROOT_DIRECTORY", REPO_ROOT / ".cognee_system"))
    dbs_dir = sys_root / "databases"
    # 1) sqlite datasets table
    for dbf in glob.glob(str(dbs_dir / "**" / "*.sqlite"), recursive=True):
        try:
            con = sqlite3.connect(f"file:{dbf}?mode=ro", uri=True)
            row = con.execute(
                "SELECT id FROM datasets WHERE name = ?", (dataset_name,)
            ).fetchone()
            con.close()
            if row:
                matches = glob.glob(str(dbs_dir / "**" / f"{row[0]}.lbug"), recursive=True)
                if matches:
                    return Path(matches[0])
        except sqlite3.Error:
            continue
    # 2) fallback: file .lbug mới nhất
    cands = sorted(
        glob.glob(str(dbs_dir / "**" / "*.lbug"), recursive=True),
        key=lambda p: os.path.getmtime(p),
    )
    return Path(cands[-1]) if cands else None


# ----------------------------------------------------- extraction sanity ----

async def extraction_sanity(dataset_name: str = "swebok_v4") -> dict:
    """Từ graph: node/edge ratio, % entity node có description, top-10 entity type.

    Mục tiêu: phát hiện degenerate (mọi entity là 'Thing'/'Concept', description rỗng...).
    Mở trực tiếp LadybugAdapter theo dataset (get_graph_engine() mặc định ra db rỗng).
    LƯU Ý: nếu build đang chạy (giữ lock ladybug) -> RuntimeError lock, ghi vào metrics.
    """
    from cognee.infrastructure.databases.graph.ladybug.adapter import LadybugAdapter

    db_path = find_dataset_graph_db(dataset_name)
    if db_path is None:
        return {"error": f"không tìm thấy file .lbug cho dataset '{dataset_name}'"}

    adapter = LadybugAdapter(db_path=str(db_path))
    try:
        nodes, edges = await adapter.get_graph_data()
    finally:
        close = getattr(adapter, "close", None)
        try:
            if close is not None:
                res = close()
                if asyncio.iscoroutine(res):
                    await res
        except Exception:  # noqa: BLE001
            pass

    n_nodes, n_edges = len(nodes), len(edges)
    entity_like: list[dict] = []
    for _, props in nodes:
        props = props if isinstance(props, dict) else {}
        if "description" in props and ("name" in props or "text" in props):
            entity_like.append(props)

    non_empty = sum(1 for p in entity_like if str(p.get("description") or "").strip())
    label_counter = Counter(
        str(p.get("type") or p.get("label") or "UNKNOWN") for p in entity_like
    )

    # Phân bố EntityType THẬT: đếm cạnh is_a -> tên node EntityType (props 'name').
    # (props['type'] chỉ là label bảng, không phân biệt kiểu entity.)
    node_name_by_id = {
        nid: (props.get("name") or props.get("text") or "")
        for nid, props in ((n[0], n[1] if isinstance(n[1], dict) else {}) for n in nodes)
    }
    et_counter: Counter = Counter()
    for src, rel, dst, _ in edges:
        if str(rel).lower() in ("is_a", "isa") and str(node_name_by_id.get(dst, "")).strip():
            et_counter[node_name_by_id[dst]] += 1
    top10_types = (
        [{"type": k, "count": v} for k, v in et_counter.most_common(10)]
        if et_counter
        else [{"type": k, "count": v} for k, v in label_counter.most_common(10)]
    )
    degenerate = bool(et_counter) and (
        et_counter.most_common(1)[0][1] > 0.8 * sum(et_counter.values())
    )
    return {
        "graph_db": str(db_path),
        "nodes": n_nodes,
        "edges": n_edges,
        "node_edge_ratio": round(n_nodes / n_edges, 3) if n_edges else None,
        "n_entity_like_nodes": len(entity_like),
        "pct_entity_with_description": round(100 * non_empty / len(entity_like), 1)
        if entity_like else None,
        "top10_entity_types": top10_types,
        "n_distinct_entity_types": len(et_counter) if et_counter else len(label_counter),
        "degenerate_type_distribution": degenerate,
    }


# ----------------------------------------------------------------- recall ----

async def do_recall(run_id: str, kas: str | None, limit: int | None) -> None:
    import cognee
    from cognee.api.v1.search import SearchType

    load_env_file()
    keys = read_keys()
    n_rr = install_key_round_robin(keys)
    print(f"[llm-keys] round-robin: {'ON (' + str(n_rr) + ' keys)' if n_rr else 'OFF'}")

    run_dir = REPO_ROOT / "runs" / run_id
    run_dir.mkdir(parents=True, exist_ok=True)

    questions = [
        json.loads(line)
        for line in QUESTIONS_PATH.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    if kas:
        allow = {k.strip() for k in kas.split(",") if k.strip()}
        questions = [q for q in questions if q.get("ka") in allow]
    if limit:
        questions = questions[:limit]
    print(f"[recall] questions: {len(questions)} | KA: {sorted({q['ka'] for q in questions})}")

    results = []
    for i, q in enumerate(questions, 1):
        t0 = time.perf_counter()
        try:
            ans = await cognee.search(
                query_text=q["question"],
                query_type=SearchType.GRAPH_COMPLETION,
                datasets=["swebok_v4"],
            )
            answer = "\n".join(extract_search_texts(ans[0])) if ans else ""
        except Exception as exc:  # noqa: BLE001
            answer = f"__ERROR__: {type(exc).__name__}: {exc}"
        answer_s = time.perf_counter() - t0

        t1 = time.perf_counter()
        try:
            ctx = await cognee.search(
                query_text=q["question"],
                query_type=SearchType.CHUNKS,
                datasets=["swebok_v4"],
                top_k=10,
            )
            contexts: list[str] = []
            for item in ctx or []:
                contexts.extend(t[:600] for t in extract_search_texts(item))
        except Exception as exc:  # noqa: BLE001
            contexts = [f"__ERROR__: {type(exc).__name__}: {exc}"]
        chunk_s = time.perf_counter() - t1

        results.append({
            "id": q["id"], "ka": q["ka"], "question": q["question"],
            "gold_answer": q.get("gold_answer", ""), "source_section": q.get("source_section", ""),
            "answer": answer[:1500], "contexts": contexts[:5],
            "answer_seconds": round(answer_s, 2), "chunks_seconds": round(chunk_s, 2),
        })
        print(f"[recall {i}/{len(questions)}] {q['id']} ans={answer_s:.1f}s "
              f"len={len(answer)} chunks={chunk_s:.1f}s", flush=True)

    out = run_dir / "answers.jsonl"
    out.write_text(
        "\n".join(json.dumps(r, ensure_ascii=False) for r in results), encoding="utf-8"
    )
    print(f"[recall] wrote {len(results)} -> {out}")


# ------------------------------------------------------------------- judge ----

async def _llm_judge_json(client_cfg: dict, prompt: str, sem: asyncio.Semaphore) -> dict:
    """1 call judge LLM -> parse JSON {score, reason}. Dùng chung cho
    correctness và context coverage (temp 0.1, 2000 token, fallback reasoning)."""
    import litellm

    async with sem:
        for attempt in range(3):
            try:
                resp = await litellm.acompletion(
                    model=client_cfg["model"],
                    api_key=client_cfg["api_key"],
                    api_base=client_cfg["endpoint"],
                    messages=[
                        {"role": "system", "content": JUDGE_SYSTEM},
                        {"role": "user", "content": prompt},
                    ],
                    max_completion_tokens=2000,
                    temperature=0.1,  # cố định judge (nondeterministic ở temp cao)
                )
                msg = resp.choices[0].message
                text = (msg.content or "").strip()
                if not text:
                    # GLM thinking có khi để content rỗng (reasoning ăn hết budget)
                    text = (getattr(msg, "reasoning_content", None) or "").strip()
                m = re.search(r'"score"\s*:\s*([0-9.]+)', text)
                if not m:
                    m = re.search(r"([01](?:\.[0-9]+)?)", text)
                score = max(0.0, min(1.0, float(m.group(1)))) if m else 0.0
                r = re.search(r'"reason"\s*:\s*"(.+?)"', text, re.S)
                return {"score": score, "reason": (r.group(1) if r else text[:120])}
            except Exception as exc:  # noqa: BLE001
                if attempt == 2:
                    return {"score": 0.0,
                            "reason": f"judge_error: {type(exc).__name__}: {str(exc)[:150]}"}
                await asyncio.sleep(3 * (attempt + 1))
    return {"score": 0.0, "reason": "unreachable"}


async def judge_one(client_cfg: dict, question: dict, answer_row: dict,
                    sem: asyncio.Semaphore) -> dict:
    """Correctness: câu trả lời (VI) khớp gold (VI) tới đâu — 0.0/0.5/1.0."""
    prompt = JUDGE_TEMPLATE.format(
        question=question["question"][:600],
        gold=answer_row.get("gold_answer", "")[:1500],
        answer=answer_row["answer"][:1500],
    )
    return await _llm_judge_json(client_cfg, prompt, sem)


async def judge_coverage_one(client_cfg: dict, question: dict, answer_row: dict,
                             sem: asyncio.Semaphore) -> dict:
    """Coverage SEMANTIC: context (EN) có đủ thông tin trả lời câu hỏi (VI) không —
    chấm theo ý nghĩa, cho phép chéo ngôn ngữ."""
    context = "\n\n---\n\n".join(answer_row.get("contexts", []))[:3000]
    prompt = JUDGE_COVERAGE_TEMPLATE.format(
        question=question["question"][:600],
        gold=answer_row.get("gold_answer", "")[:1200],
        context=context or "(không có context)",
    )
    return await _llm_judge_json(client_cfg, prompt, sem)


# -------------------------------------------------------------------- eval ----

async def do_eval(run_id: str, dataset: str = "swebok_v4") -> None:
    from skilltree.ingest.build_memory import load_env_file, read_api_keys, install_key_round_robin

    load_env_file()
    keys = read_api_keys(["LLM_API_KEY", "LLM_API_KEY_2", "LLM_API_KEY_3"])
    install_key_round_robin(keys)
    client_cfg = {
        "model": os.environ.get("LLM_MODEL", "openai/zai-org/GLM-5.3-Flash"),
        "endpoint": os.environ.get("LLM_ENDPOINT"),
        "api_key": os.environ.get("LLM_API_KEY"),
    }

    run_dir = REPO_ROOT / "runs" / run_id
    answers_path = run_dir / "answers.jsonl"
    answers = [
        json.loads(line)
        for line in answers_path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    questions = {
        json.loads(line)["id"]: json.loads(line)
        for line in QUESTIONS_PATH.read_text(encoding="utf-8").splitlines()
        if line.strip()
    }
    print(f"[eval] {len(answers)} answers từ {answers_path.name}")

    sem = asyncio.Semaphore(6)
    t0 = time.perf_counter()
    judgments = await asyncio.gather(*[
        judge_one(client_cfg, questions[a["id"]], a, sem) for a in answers
    ])
    judge_s = time.perf_counter() - t0
    print(f"[eval] correctness judge {len(answers)} câu trong {judge_s:.1f}s")

    t0 = time.perf_counter()
    coverages = await asyncio.gather(*[
        judge_coverage_one(client_cfg, questions[a["id"]], a, sem) for a in answers
    ])
    cov_s = time.perf_counter() - t0
    print(f"[eval] semantic coverage judge {len(answers)} câu trong {cov_s:.1f}s")

    rows = []
    for a, j, c in zip(answers, judgments, coverages):
        # lexical (phụ): token overlap gold VI vs context EN — chéo ngôn ngữ nên thấp
        gold_toks = norm_tokens(a.get("gold_answer", ""))
        ctx_toks: set[str] = set()
        for x in a.get("contexts", []):
            ctx_toks |= norm_tokens(x)
        lexical = (
            round(len(gold_toks & ctx_toks) / len(gold_toks), 3) if gold_toks else None
        )
        rows.append({
            "id": a["id"], "ka": a["ka"], "score": j["score"], "reason": j["reason"][:160],
            "context_coverage_semantic": c["score"],
            "context_coverage_lexical": lexical,
            "answer_seconds": a.get("answer_seconds"),
        })

    n = len(rows)
    sem_covs = [r["context_coverage_semantic"] for r in rows]
    scores = sorted(r["score"] for r in rows)
    metrics: dict = {
        "run_id": run_id,
        "evaluated_at": datetime.now(timezone.utc).isoformat(),
        "n_questions": n,
        "kas": sorted({r["ka"] for r in rows}),
        "correctness_mean": round(sum(scores) / n, 3) if n else None,
        "correctness_median": scores[n // 2] if n else None,
        "correctness_min": scores[0] if n else None,
        "n_score_zero": sum(1 for s in scores if s == 0.0),
        "context_coverage_mean": round(sum(sem_covs) / n, 3) if n else None,
        "context_coverage_lexical_mean": round(
            sum(r["context_coverage_lexical"] or 0 for r in rows) / n, 3) if n else None,
        "mean_answer_seconds": round(sum(r["answer_seconds"] or 0 for r in rows) / n, 2)
        if n else None,
        "judge_seconds": round(judge_s, 1),
        "coverage_judge_seconds": round(cov_s, 1),
        "by_ka": {},
        "per_question": rows,
    }
    by_ka: dict[str, list[dict]] = {}
    for r in rows:
        by_ka.setdefault(r["ka"], []).append(r)
    for ka, rr in by_ka.items():
        metrics["by_ka"][ka] = {
            "n": len(rr),
            "correctness_mean": round(sum(x["score"] for x in rr) / len(rr), 3),
            "context_coverage_mean": round(
                sum(x["context_coverage_semantic"] for x in rr) / len(rr), 3),
        }

    print("[sanity] collecting graph stats...")
    try:
        metrics["extraction_sanity"] = await extraction_sanity(dataset)
    except Exception as exc:  # noqa: BLE001
        metrics["extraction_sanity"] = {"error": f"{type(exc).__name__}: {exc}"}

    out = run_dir / "metrics.json"
    out.write_text(json.dumps(metrics, ensure_ascii=False, indent=2, default=str),
                   encoding="utf-8")
    print(f"[eval] metrics -> {out}")
    print(json.dumps({k: metrics[k] for k in (
        "n_questions", "correctness_mean", "context_coverage_mean",
        "context_coverage_lexical_mean", "mean_answer_seconds")}, ensure_ascii=False))
    s = metrics.get("extraction_sanity") or {}
    print("[sanity] nodes=%s edges=%s pct_desc=%s distinct_types=%s top3=%s" % (
        s.get("nodes"), s.get("edges"), s.get("pct_entity_with_description"),
        s.get("n_distinct_entity_types"), (s.get("top10_entity_types") or [])[:3]))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Quick eval (preview Task 5) cho Stage A")
    sub = parser.add_subparsers(dest="mode", required=True)

    pr = sub.add_parser("recall", help="truy xuất memory cho question set -> answers.jsonl")
    pr.add_argument("--run-id", required=True)
    pr.add_argument("--kas", default=None,
                    help="danh sách KA cách nhau bởi dấu phẩy (lọc questions.jsonl)")
    pr.add_argument("--limit", type=int, default=None, help="giới hạn số câu (debug)")

    pe = sub.add_parser("eval", help="judge + metrics cho answers.jsonl của run")
    pe.add_argument("--run-id", required=True)
    pe.add_argument("--dataset", default="swebok_v4")

    args = parser.parse_args(argv)
    if args.mode == "recall":
        asyncio.run(do_recall(args.run_id, args.kas, args.limit))
    else:
        asyncio.run(do_eval(args.run_id, args.dataset))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
