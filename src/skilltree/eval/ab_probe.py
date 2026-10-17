"""A/B graph-reasoning probe — Stress set 24 câu × các chế độ search trên memory S2.

Chế độ:
  GRAPH_COMPLETION      : graph-traversed completion (cognee tự sinh câu trả lời)
  GRAPH_COMPLETION_COT  : graph completion + chain-of-thought
  TRIPLET_COMPLETION    : suy luận trên cạnh (chỉ câu type=triplet; có thể NoDataError)
  CHUNKS                : vector thuần — answer do LLM tự tổng hợp từ chunks (RAG trần)

Judge mỗi (question, mode):
  - correctness_multihop (0-1 vs gold); câu topology=negative dùng NEGATIVE judge
    (chấm phát hiện bẫy + flag fabricated/hallucination)
  - element_completeness (% phần tử key của gold xuất hiện trong answer)
  - hop_precision (hops_correct/hops_total theo expected_path)
  - latency

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
BASE_MODES = ["GRAPH_COMPLETION", "CHUNKS"]  # đối đầu chính: Graph Core vs Vector RAG
COT_CEILING_TOPOLOGIES = {"reverse", "paradox"}  # COT chỉ làm probe trần năng lực (S23/S24)
TRIPLET_MODE = "TRIPLET_COMPLETION"  # ĐÃ LOẠI: NoDataError trên pipeline mặc định


def modes_for(q) -> list[str]:
    ms = list(BASE_MODES)
    if q.get("topology") in COT_CEILING_TOPOLOGIES:
        ms.append("GRAPH_COMPLETION_COT")  # ceiling probe, không vào ma trận chính
    return ms

JUDGE_ELEMENTS_TEMPLATE = """Câu hỏi: {question}

Đáp án chuẩn (gold) liệt kê các phần tử key (khái niệm, kỹ thuật, artifact) cần có trong
câu trả lời: {gold}

Câu trả lời cần chấm: {answer}

Nhiệm vụ: từ gold, xác định các PHẦN TỬ KEY (danh mục ngắn, mỗi phần tử 1-4 từ), rồi chấm
tỷ lệ phần số phần tử key được đề cập (dù cách diễn đạt khác, kể cả tiếng Anh) trong câu trả
lời. Trả về JSON duy nhất: {{"completeness": <0.0-1.0>, "missing": ["<phần tử thiếu>", ...]}}"""

NEGATIVE_JUDGE_TEMPLATE = """Câu hỏi: {question}

Câu trả lời cần chấm: {answer}

Gold mô tả các ĐIỂM BẪY của tiền đề sai trong câu hỏi: {gold}

Chấm khả năng phát hiện bẫy (anti-hallucination):
- 1.0: phát hiện tiền đề sai và phản bác đúng theo gold (nêu được các điểm bẫy chính)
- 0.5: nghi ngờ/đính chính một phần, hoặc phản bác đúng nhưng thiếu điểm bẫy quan trọng
- 0.0: KHÔNG phát hiện bẫy và cố chứng minh tiền đề sai là đúng ('gọt chân cho vừa giày'
  = hallucination), hoặc trả lời sai trọng tâm
Trả về JSON duy nhất: {{"score": <0.0-1.0>, "fabricated": <true nếu chứng minh tiền đề sai>, "reason": "<1 câu>"}}"""

HOP_TEMPLATE = """Câu hỏi: {question}

Chuỗi các bước/hop kỳ vọng (expected path): {expected_path}

Câu trả lời: {answer}

Chấm multi-hop precision: câu trả lời có đi qua đúng bao nhiêu hop của expected path?
- hops_total: số hop trong expected path
- hops_correct: số hop được trả lời ĐÚNG nội dung (diễn đạt khác cũng tính)
- hops_extra: số khái niệm trả lời thêm không thuộc path (0 nếu không có)
Trả về JSON duy nhất: {{"hops_total": <số>, "hops_correct": <số>, "hops_extra": <số>, "reason": "<1 câu>"}}"""


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


async def judge_negative(cfg, q, gold, answer) -> dict:
    if not answer or answer.startswith("__ERROR__"):
        return {"score": 0.0, "fabricated": None, "reason": "empty/error answer"}
    prompt = NEGATIVE_JUDGE_TEMPLATE.format(question=q[:600], gold=gold[:1500], answer=answer[:1500])
    try:
        text = await litellm_text(cfg, prompt)
        m = re.search(r'"score"\s*:\s*([0-9.]+)', text)
        score = max(0.0, min(1.0, float(m.group(1)))) if m else 0.0
        fab = bool(re.search(r'"fabricated"\s*:\s*true', text, re.I))
        return {"score": score, "fabricated": fab, "reason": text[:150]}
    except Exception as exc:  # noqa: BLE001
        return {"score": 0.0, "fabricated": None, "reason": f"judge_error {type(exc).__name__}"}


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


async def judge_hops(cfg, q, expected_path, answer) -> dict:
    if not answer or answer.startswith("__ERROR__"):
        return {"hops_total": None, "hops_correct": 0, "hops_extra": 0, "reason": "empty answer"}
    prompt = HOP_TEMPLATE.format(question=q[:500], expected_path=expected_path[:600], answer=answer[:1500])
    try:
        text = await litellm_text(cfg, prompt)
        def _int(name):
            m = re.search(rf'"{name}"\s*:\s*([0-9]+)', text)
            return int(m.group(1)) if m else None
        return {"hops_total": _int("hops_total"), "hops_correct": _int("hops_correct") or 0,
                "hops_extra": _int("hops_extra") or 0, "reason": text[:120]}
    except Exception as exc:  # noqa: BLE001
        return {"hops_total": None, "hops_correct": 0, "hops_extra": 0,
                "reason": f"judge_error {type(exc).__name__}"}


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


async def run_pair(q, mode, cfg, SearchType) -> None:
    t0 = time.perf_counter()
    try:
        res = await asyncio.wait_for(cognee_search(q, mode, SearchType), timeout=900)
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
        append_row({"id": q["id"], "type": q["type"], "topology": q.get("topology", ""),
                    "mode": mode, "error": f"{type(exc).__name__}: {str(exc)[:150]}",
                    "ts": datetime.now(timezone.utc).isoformat()})
        print(f"[ab] {q['id']} {mode} ERROR {type(exc).__name__}", flush=True)
        return

    topo = q.get("topology", "")
    row = {"id": q["id"], "type": q["type"], "topology": topo, "mode": mode,
           "latency_search_s": latency, "latency_rag_s": rag_s,
           "answer_chars": len(answer), "answer": answer[:1200]}
    if topo == "negative":
        neg = await judge_negative(cfg, q["question"], q["gold_answer"], answer)
        row.update({"correctness": neg["score"], "fabricated": neg["fabricated"],
                    "corr_reason": neg["reason"][:120]})
    else:
        corr = await judge_correctness(cfg, q["question"], q["gold_answer"], answer)
        elems = await judge_elements(cfg, q["question"], q["gold_answer"], answer)
        row.update({"correctness": corr["score"], "corr_reason": corr["reason"][:120],
                    "element_completeness": elems["completeness"],
                    "missing_elements": elems["missing"]})
        hops = await judge_hops(cfg, q["question"], q.get("expected_path", ""), answer)
        row.update({"hops_total": hops["hops_total"], "hops_correct": hops["hops_correct"],
                    "hops_extra": hops["hops_extra"],
                    "hop_precision": round(hops["hops_correct"] / hops["hops_total"], 2)
                    if hops["hops_total"] else None})
    row["ts"] = datetime.now(timezone.utc).isoformat()
    append_row(row)
    print(f"[ab] {q['id']} {mode}: corr={row['correctness']} "
          f"elems={row.get('element_completeness', '-')} "
          f"hops={row.get('hop_precision', '-')} t={latency}s(+{rag_s}s rag)", flush=True)


async def cognee_search(q, mode, SearchType):
    return await cognee.search(query_text=q["question"],
                               query_type=getattr(SearchType, mode),
                               datasets=[DATASET])


cognee = None  # set in main


async def main() -> int:
    global cognee
    load_env_file()
    keys = read_keys()
    n_rr = install_key_round_robin(keys)
    print(f"[keys] round-robin {'ON(' + str(n_rr) + ')' if n_rr else 'OFF'}", flush=True)
    cfg = client_cfg()
    questions = [json.loads(l) for l in QUESTIONS.read_text(encoding="utf-8").splitlines() if l.strip()]
    skip = done_pairs()
    todo = [(q, m) for q in questions for m in modes_for(q)
            if (q["id"], m) not in skip and hasattr_check(m)]
    print(f"[ab] {len(questions)} câu | skip {len(skip)} cặp | todo {len(todo)}", flush=True)

    import cognee as _cognee
    from cognee.api.v1.search import SearchType
    cognee = _cognee

    for i, (q, mode) in enumerate(todo, 1):
        await run_pair(q, mode, cfg, SearchType)

    return await summarize()


def hasattr_check(mode: str) -> bool:
    try:
        from cognee.api.v1.search import SearchType
        return hasattr(SearchType, mode)
    except Exception:  # noqa: BLE001
        return False


async def summarize() -> int:
    rows = []
    if RESULTS.exists():
        for line in RESULTS.read_text(encoding="utf-8").splitlines():
            try:
                rows.append(json.loads(line))
            except Exception:  # noqa: BLE001
                continue
    ok = [r for r in rows if "error" not in r and r.get("answer_chars", 0) > 0]
    by_mode: dict[str, list] = defaultdict(list)
    by_mt: dict[tuple, list] = defaultdict(list)
    for r in ok:
        by_mode[r["mode"]].append(r)
        by_mt[(r["mode"], r.get("topology") or r["type"])].append(r)

    def agg(rs):
        n = len(rs) or 1
        hops = [r["hop_precision"] for r in rs if r.get("hop_precision") is not None]
        return {
            "n": len(rs),
            "correctness_mean": round(sum(r.get("correctness", 0) for r in rs) / n, 3),
            "element_completeness_mean": round(
                sum(r.get("element_completeness", 0) for r in rs) / n, 3),
            "hop_precision_mean": round(sum(hops) / len(hops), 3) if hops else None,
            "fabrication_count": sum(1 for r in rs if r.get("fabricated") is True),
            "latency_p50": sorted(r.get("latency_search_s", 0) + r.get("latency_rag_s", 0)
                                  for r in rs)[max(0, len(rs) - 1) // 2] if rs else None,
        }

    summary = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "n_scored": len(ok), "n_errors": len(rows) - len(ok),
        "by_mode": {m: agg(rs) for m, rs in sorted(by_mode.items())},
        "by_mode_and_topology": {f"{m}|{t}": agg(rs) for (m, t), rs in sorted(by_mt.items())},
    }
    SUMMARY.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summary["by_mode"], ensure_ascii=False, indent=1), flush=True)
    print("[ab] DONE", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
