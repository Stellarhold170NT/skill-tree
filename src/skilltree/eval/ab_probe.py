"""A/B graph-reasoning probe — Stress set 20 câu × các chế độ search trên memory S2.

Chế độ:
  GRAPH_COMPLETION      : graph-traversed completion (cognee tự sinh câu trả lời)
  GRAPH_COMPLETION_COT  : graph completion + chain-of-thought
  TRIPLET_COMPLETION    : suy luận trên cạnh (chỉ câu type=triplet)
  CHUNKS                : vector thuần — answer do LLM tự tổng hợp từ chunks (RAG trần)

Judge mỗi (question, mode): correctness_multihop (0-1 vs gold) + element_completeness
(% phần tử key của gold xuất hiện trong answer) + latency.

Resumable: kết quả append ngay sau từng call vào runs/graph_probe/ab_results.jsonl;
chạy lại sẽ skip cặp (id, mode) đã có. Chạy: cwd=/workspace,
  /opt/venv/bin/python src/skilltree/eval/ab_probe.py
"""

from __future__ import annotations

import asyncio
import json
import os
import re
import sys
import time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT / "src") not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / "src"))

from skilltree.eval.quick_eval import (  # noqa: E402
    JUDGE_SYSTEM,
    JUDGE_TEMPLATE,
    extract_search_texts,
    install_key_round_robin,
    load_env_file,
    read_keys,
)

QUESTIONS = REPO_ROOT / "corpora" / "swebok-v4" / "questions_stress.jsonl"
OUT_DIR = REPO_ROOT / "runs" / "graph_probe"
RESULTS = OUT_DIR / "ab_results.jsonl"
SUMMARY = OUT_DIR / "ab_summary.json"
DATASET = "swebok_v4"
BASE_MODES = ["GRAPH_COMPLETION", "GRAPH_COMPLETION_COT", "CHUNKS"]
TRIPLET_MODE = "TRIPLET_COMPLETION"

JUDGE_ELEMENTS_TEMPLATE = """Câu hỏi: {question}

Đáp án chuẩn (gold) liệt kê các phần tử key (khái niệm, kỹ thuật, artifact) cần có trong
câu trả lời: {gold}

Câu trả lời cần chấm: {answer}

Nhiệm vụ: từ gold, xác định các PHẦN TỬ KEY (danh mục ngắn, mỗi phần tử 1-4 từ), rồi chấm
tỷ lệ phần số phần tử key được đề cập (dù cách diễn đạt khác, kể cả tiếng Anh) trong câu trả
lời. Trả về JSON duy nhất: {{"completeness": <0.0-1.0>, "missing": ["<phần tử thiếu>", ...]}}"""


def client_cfg() -> dict:
    keys = read_keys()
    return {
        "model": os.environ.get("LLM_MODEL", ""),
        "endpoint": os.environ.get("LLM_ENDPOINT", ""),
        "api_key": keys[0] if keys else "",
    }


async def litellm_text(cfg: dict, user_prompt: str, system: str = JUDGE_SYSTEM,
                       max_tokens: int = 2000) -> str:
    import litellm

    resp = await litellm.acompletion(
        model=cfg["model"], api_key=cfg["api_key"], api_base=cfg["endpoint"],
        messages=[{"role": "system", "content": system},
                  {"role": "user", "content": user_prompt}],
        max_completion_tokens=max_tokens, temperature=0.1,
    )
    msg = resp.choices[0].message
    text = (msg.content or "").strip()
    if not text:
        text = (getattr(msg, "reasoning_content", None) or "").strip()
    return text


async def judge_correctness(cfg, q, gold, answer) -> dict:
    if not answer or answer.startswith("__ERROR__"):
        return {"score": 0.0, "reason": "empty/error answer"}
    prompt = JUDGE_TEMPLATE.format(question=q[:600], gold=gold[:1500], answer=answer[:1500])
    try:
        text = await litellm_text(cfg, prompt)
        m = re.search(r'"score"\s*:\s*([0-9.]+)', text)
        if not m:
            m = re.search(r"([01](?:\.[0-9]+)?)", text)
        score = max(0.0, min(1.0, float(m.group(1)))) if m else 0.0
        return {"score": score, "reason": text[:150]}
    except Exception as exc:  # noqa: BLE001
        return {"score": 0.0, "reason": f"judge_error {type(exc).__name__}"}


async def judge_elements(cfg, q, gold, answer) -> dict:
    if not answer or answer.startswith("__ERROR__"):
        return {"completeness": 0.0, "missing": ["answer empty"]}
    prompt = JUDGE_ELEMENTS_TEMPLATE.format(question=q[:500], gold=gold[:1500], answer=answer[:1500])
    try:
        text = await litellm_text(cfg, prompt)
        m = re.search(r'"completeness"\s*:\s*([0-9.]+)', text)
        comp = max(0.0, min(1.0, float(m.group(1)))) if m else 0.0
        mm = re.search(r'"missing"\s*:\s*\[(.*?)\]', text, re.S)
        missing = re.findall(r'"([^"]+)"', mm.group(1))[:8] if mm else []
        return {"completeness": comp, "missing": missing}
    except Exception as exc:  # noqa: BLE001
        return {"completeness": 0.0, "missing": [f"judge_error {type(exc).__name__}"]}


async def rag_answer_over_chunks(cfg, question, chunks) -> str:
    prompt = (
        "Bạn là trợ lý trả lời câu hỏi về SWEBOK v4. Chỉ dùng các đoạn trích dưới đây "
        "(tiếng Anh) để trả lời câu hỏi (tiếng Việt). Nếu đoạn trích không đủ thông tin, "
        "hãy nói rõ phần nào không tìm thấy trong đoạn trích.\n\n"
        f"Câu hỏi: {question}\n\nCác đoạn trích:\n{chunks[:6000]}\n\n"
        "Trả lời ngắn gọn bằng tiếng Việt."
    )
    return await litellm_text(cfg, prompt, system="Bạn là trợ lý SWEBOK. Chỉ trả lời dựa trên đoạn trích.")


def done_pairs() -> set[tuple[str, str]]:
    if not RESULTS.exists():
        return set()
    out = set()
    for line in RESULTS.read_text(encoding="utf-8").splitlines():
        try:
            row = json.loads(line)
            out.add((row["id"], row["mode"]))
        except Exception:  # noqa: BLE001
            continue
    return out


def append_row(row: dict) -> None:
    with RESULTS.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(row, ensure_ascii=False) + "\n")


async def main() -> int:
    load_env_file()
    keys = read_keys()
    n_rr = install_key_round_robin(keys)
    print(f"[keys] round-robin {'ON(' + str(n_rr) + ')' if n_rr else 'OFF'}", flush=True)
    cfg = client_cfg()
    questions = [json.loads(l) for l in QUESTIONS.read_text(encoding="utf-8").splitlines() if l.strip()]
    skip = done_pairs()
    print(f"[ab] {len(questions)} câu | skip {len(skip)} cặp đã có", flush=True)

    import cognee
    from cognee.api.v1.search import SearchType

    for i, q in enumerate(questions, 1):
        modes = list(BASE_MODES)
        if q.get("type") == "triplet":
            modes.append(TRIPLET_MODE)
        for mode in modes:
            if (q["id"], mode) in skip:
                continue
            if not hasattr(SearchType, mode):
                append_row({"id": q["id"], "type": q["type"], "mode": mode,
                            "error": f"SearchType {mode} không tồn tại",
                            "ts": datetime.now(timezone.utc).isoformat()})
                skip.add((q["id"], mode))
                continue
            t0 = time.perf_counter()
            try:
                res = await cognee.search(query_text=q["question"],
                                          query_type=getattr(SearchType, mode),
                                          datasets=[DATASET])
                texts: list[str] = []
                for item in res or []:
                    texts.extend(extract_search_texts(item))
                latency = round(time.perf_counter() - t0, 2)
                if mode == "CHUNKS":
                    joined = "\n\n---\n\n".join(t[:1200] for t in texts[:10])
                    t1 = time.perf_counter()
                    answer = await rag_answer_over_chunks(cfg, q["question"], joined) if joined else ""
                    rag_s = round(time.perf_counter() - t1, 2)
                else:
                    answer = "\n".join(texts)[:2500]
                    rag_s = 0.0
            except Exception as exc:  # noqa: BLE001
                append_row({"id": q["id"], "type": q["type"], "mode": mode,
                            "error": f"{type(exc).__name__}: {str(exc)[:150]}",
                            "ts": datetime.now(timezone.utc).isoformat()})
                print(f"[ab {i}] {q['id']} {mode} ERROR {type(exc).__name__}", flush=True)
                continue
            corr = await judge_correctness(cfg, q["question"], q["gold_answer"], answer)
            elems = await judge_elements(cfg, q["question"], q["gold_answer"], answer)
            row = {"id": q["id"], "type": q["type"], "mode": mode,
                   "latency_search_s": latency, "latency_rag_s": rag_s,
                   "answer_chars": len(answer), "answer": answer[:1200],
                   "correctness": corr["score"], "corr_reason": corr["reason"][:120],
                   "element_completeness": elems["completeness"],
                   "missing_elements": elems["missing"],
                   "ts": datetime.now(timezone.utc).isoformat()}
            append_row(row)
            print(f"[ab {i}] {q['id']} {mode}: corr={corr['score']} "
                  f"elems={elems['completeness']} t={latency}s(+{rag_s}s rag)", flush=True)

    # ---------- summary ----------
    rows = []
    if RESULTS.exists():
        for line in RESULTS.read_text(encoding="utf-8").splitlines():
            try:
                rows.append(json.loads(line))
            except Exception:  # noqa: BLE001
                continue
    ok = [r for r in rows if "error" not in r and r.get("answer_chars", 0) > 0]
    by_mode: dict[str, list] = defaultdict(list)
    by_mode_type: dict[tuple, list] = defaultdict(list)
    for r in ok:
        by_mode[r["mode"]].append(r)
        by_mode_type[(r["mode"], r["type"])].append(r)

    def agg(rs):
        n = len(rs) or 1
        return {
            "n": len(rs),
            "correctness_mean": round(sum(r.get("correctness", 0) for r in rs) / n, 3),
            "element_completeness_mean": round(
                sum(r.get("element_completeness", 0) for r in rs) / n, 3),
            "latency_p50": sorted(r.get("latency_search_s", 0) + r.get("latency_rag_s", 0)
                                  for r in rs)[max(0, len(rs) - 1) // 2] if rs else None,
        }

    summary = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "n_questions": len(questions), "n_scored": len(ok), "n_errors": len(rows) - len(ok),
        "by_mode": {m: agg(rs) for m, rs in sorted(by_mode.items())},
        "by_mode_and_type": {f"{m}|{t}": agg(rs) for (m, t), rs in sorted(by_mode_type.items())},
    }
    SUMMARY.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summary["by_mode"], ensure_ascii=False, indent=1), flush=True)
    print("[ab] DONE", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
