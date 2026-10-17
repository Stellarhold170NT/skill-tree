"""Stage C — C1/C2/C3 ablation trên graph dump (traversal thuần local + gen/judge qua gateway).

C1 — constrained traversal: với mỗi câu stress (SWEBOK-S01..S24) chọn mode theo Ý câu hỏi
     (lineage / verify / overview — CONTEXT_MODES của traverse.py), extract start node từ
     câu hỏi, traverse có lọc predicate (k=2, lineage k=3), render_context(max_tokens=1200)
     rồi gọi LLM trả lời. Judge dùng template Y NGUYÊN của ab_probe (import trực tiếp từ
     skilltree.eval.ab_probe / quick_eval — không copy tay): judge_correctness cho mọi câu,
     judge_elements + judge_hops cho câu thường, judge_negative cho câu topology=negative
     (S21). Baseline B1 champion (docs/adr/0003): corr 0.456 / elems 0.322 / hop ~0.73.
     C1 thắng nếu correctness_mean > 0.50 hoặc hop_precision_mean > 0.78.

C2 — entity merge trên graph thật: find_merge_groups + split_heading_candidates
     (entity_merge.py) -> proposals JSONL (kèm evidence) -> apply_merges (chỉ nhóm
     kind='exact' có canonical != 'REVIEW_REQUIRED': giữ node biến thể đẹp nhất làm
     canonical, trỏ mọi cạnh của variants về canonical, xóa variants, khử self-loop +
     cạnh trùng) -> chạy lại phần gen+judge của C1 trên graph đã merge.

C3 — audit precision mẫu cạnh: sample_edges(n=100, seed=7) rồi judge TỪNG cạnh bằng LLM
     ("Quan hệ A -[PRED]-> B có ĐÚNG ngữ nghĩa theo tên predicate không?") — precision
     < 0.90 => FAIL (kèm predicate yếu nhất).

structure — tính lại các metric cấu trúc giống analyze_graph.py (script đó crash với
     "Table Entity does not exist" trên graph B1 mới vì schema Ladybug không có label
     Entity) nhưng tính TỪ DUMP (không sửa file có sẵn): cùng output shape
     runs/graph_probe/structure_<dataset>.json.

LLM client: AsyncOpenAI tới gateway OpenAI-compatible ($LLM_ENDPOINT), model = $LLM_MODEL
bỏ prefix "openai/", round-robin 3 key (LLM_API_KEY, LLM_API_KEY_2, LLM_API_KEY_3).
GLM-5.3-Flash là reasoning model hay trả content RỖNG (reasoning ăn hết budget) =>
retry-on-empty 3 lần: content rỗng -> thử reasoning_content -> max_completion_tokens x2
-> retry. Judge: temp 0.1, 2000 tokens, parse JSON, 3 attempts.

PRED_UP: dump_graph.py trả predicate lowercase ("part_of", "verifies"...) trong khi
CONTEXT_MODES của traverse.py lọc theo UPPERCASE ("PART_OF", "VERIFIES"...) — load_dump()
chuẩn hóa predicate theo bảng PRED_UP (is_a -> SUBTYPE_OF cho mode overview), giữ nguyên
các predicate provenance (contains, made_from...).

Resumable: kết quả append sau từng câu/cạnh; chạy lại sẽ skip id đã có trong file out.

Sử dụng (cwd = /workspace, export OMP_NUM_THREADS=2 ORT_INTRA_OP_NUM_THREADS=2):
  /opt/venv/bin/python src/skilltree/eval/c1_traverse_eval.py structure \
      --dump artifacts/graph_swebok_v4_b1.json.gz --dataset swebok_v4_b1
  /opt/venv/bin/python src/skilltree/eval/c1_traverse_eval.py c1 \
      --dump artifacts/graph_swebok_v4_b1.json.gz
  /opt/venv/bin/python src/skilltree/eval/c1_traverse_eval.py c2 \
      --dump artifacts/graph_swebok_v4_b1.json.gz --save-merged artifacts/graph_swebok_v4_b1_merged.json.gz
  /opt/venv/bin/python src/skilltree/eval/c1_traverse_eval.py c3 \
      --dump artifacts/graph_swebok_v4_b1.json.gz
"""

from __future__ import annotations

import argparse
import asyncio
import gzip
import itertools
import json
import os
import re
import sys
import time
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT / "src") not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / "src"))

from skilltree.agent.entity_merge import (  # noqa: E402
    find_merge_groups,
    split_heading_candidates,
)
from skilltree.agent.traverse import (  # noqa: E402
    CONTEXT_MODES,
    build_index,
    load_graph,
    render_context,
    traverse,
)
from skilltree.eval.ab_probe import (  # noqa: E402  — template judge Y NGUYÊN
    HOP_TEMPLATE,
    JUDGE_ELEMENTS_TEMPLATE,
    NEGATIVE_JUDGE_TEMPLATE,
)
from skilltree.eval.audit_edges import audit_summary, sample_edges  # noqa: E402
from skilltree.eval.quick_eval import (  # noqa: E402
    JUDGE_SYSTEM,
    JUDGE_TEMPLATE,
    load_env_file,
    read_keys,
)

QUESTIONS = REPO_ROOT / "corpora" / "swebok-v4" / "questions_stress.jsonl"
DEFAULT_DUMP = REPO_ROOT / "artifacts" / "graph_swebok_v4_b1.json.gz"

# Baseline B1 champion — docs/adr/0003 (Stage B tuning), không chạy lại
BASELINE_B1 = {
    "name": "B1_semantic_boost (cognee GRAPH_COMPLETION)",
    "correctness_mean": 0.456,
    "element_completeness_mean": 0.322,
    "hop_precision_mean": 0.73,
    "source": "docs/adr/0003-stage-b-config-tuning.md",
}
WIN_CORRECTNESS = 0.50
WIN_HOP = 0.78

# dump predicate (lowercase) -> predicate chuẩn của CONTEXT_MODES / ontology
PRED_UP = {
    "part_of": "PART_OF",
    "verifies": "VERIFIES",
    "validates": "VALIDATES",
    "mitigates": "MITIGATES",
    "causes": "CAUSES",
    "requires": "REQUIRES",
    "uses": "USES",
    "produces": "PRODUCES",
    "constrains": "CONSTRAINS",
    "transforms_to": "TRANSFORMS_TO",
    "injects": "INJECTS",
    "depends_on": "DEPENDS_ON",
    "is_a": "SUBTYPE_OF",
}
# predicate provenance/structural — giữ nguyên, không tính là semantic (như analyze_graph)
STRUCTURAL_PREDICATES = {"contains", "is_a", "made_from", "authored", "published_at",
                         "has_timestamp"}

# Generator prompt — copy Y NGUYÊN từ ab_probe.rag_answer_over_chunks (CHUNKS mode),
# chỉ thay "Các đoạn trích" bằng context render từ subgraph traversal.
GENERATOR_SYSTEM = "Bạn là trợ lý SWEBOK. Chỉ trả lời dựa trên đoạn trích."
GENERATOR_TEMPLATE = (
    "Bạn là trợ lý trả lời câu hỏi về SWEBOK v4. Chỉ dùng các đoạn trích dưới đây "
    "(tiếng Anh) để trả lời câu hỏi (tiếng Việt). Nếu đoạn trích không đủ thông tin, "
    "hãy nói rõ phần nào không tìm thấy trong đoạn trích.\n\n"
    "Câu hỏi: {question}\n\n"
    "Các đoạn trích:\n{context}\n\n"
    "Trả lời ngắn gọn bằng tiếng Việt."
)

# Audit cạnh (C3) — prompt theo brief Stage C
C3_AUDIT_TEMPLATE = (
    'Cho quan hệ "{a}" -[{pred}]-> "{b}" trích từ đồ thị SWEBOK. Quan hệ này có ĐÚNG '
    "ngữ nghĩa theo tên predicate không? (PART_OF=thuộc bộ phận, VERIFIES=kiểm tra tính "
    "đúng, MITIGATES=giảm thiểu, CAUSES=gây ra, contains=provenance chunk-tài-liệu luôn "
    'ĐÚNG...). Trả JSON {{"correct": true/false}}'
)

# Mode selection theo ý câu hỏi (brief BƯỚC 4)
LINEAGE_IDS = {"SWEBOK-S22", "SWEBOK-S23"}
LINEAGE_RE = re.compile(r"ngược|nguồn gốc|truy vết|root.?cause|nhân quả", re.I)
VERIFY_RE = re.compile(
    r"kiểm tra|kiểm thử|verif|valid|xác thực|xác nhận|mitigat|giảm thiểu|threat"
    r"|bảo mật|quality assurance|quality control",
    re.I,
)


def select_mode(q: dict) -> str:
    """lineage: câu lineage/reverse/root-cause; verify: câu về verify/mitigate; còn lại overview."""
    if (
        q.get("id") in LINEAGE_IDS
        or q.get("topology") in ("reverse", "lineage")
        or LINEAGE_RE.search(q.get("question", ""))
    ):
        return "lineage"
    if VERIFY_RE.search(q.get("question", "")):
        return "verify"
    return "overview"


# --------------------------------------------------------------- LLM client ---


class LLM:
    """AsyncOpenAI tới gateway OpenAI-compatible, round-robin 3 key, retry-on-empty."""

    def __init__(self) -> None:
        load_env_file()
        self.keys = read_keys()
        if not self.keys:
            raise RuntimeError("Không có LLM_API_KEY trong .env/os.environ")
        raw_model = os.environ.get("LLM_MODEL", "")
        self.model = raw_model.removeprefix("openai/")
        self.endpoint = os.environ.get("LLM_ENDPOINT", "")
        self._clients: dict[str, object] = {}
        self._cycle = itertools.cycle(self.keys)
        self.n_calls = 0

    def _client(self, key: str):
        if key not in self._clients:
            from openai import AsyncOpenAI

            self._clients[key] = AsyncOpenAI(
                base_url=self.endpoint, api_key=key, timeout=300.0, max_retries=1
            )
        return self._clients[key]

    async def _create(self, key: str, messages: list[dict], tokens: int, temperature: float):
        kwargs = dict(model=self.model, temperature=temperature, messages=messages)
        try:
            return await self._client(key).chat.completions.create(
                max_completion_tokens=tokens, **kwargs
            )
        except Exception as exc:  # gateway cũ có thể không nhận max_completion_tokens
            if "max_completion_tokens" in str(exc):
                return await self._client(key).chat.completions.create(
                    max_tokens=tokens, **kwargs
                )
            raise

    async def chat(
        self,
        system: str,
        user: str,
        max_completion_tokens: int = 2400,
        temperature: float = 0.1,
    ) -> tuple[str, dict]:
        """1 lượt gọi. Retry-on-empty 3 lần: content rỗng -> reasoning_content ->
        max_completion_tokens x2 -> retry. Lỗi gateway (429/5xx/timeout) -> backoff
        rồi retry (contention với build song song là chấp nhận được)."""
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ]
        tokens = max_completion_tokens
        last_err: str | None = None
        for attempt in range(3):
            key = next(self._cycle)
            self.n_calls += 1
            try:
                resp = await asyncio.wait_for(
                    self._create(key, messages, tokens, temperature), timeout=300
                )
                msg = resp.choices[0].message
                text = (getattr(msg, "content", None) or "").strip()
                if not text:
                    # GLM thinking: content rỗng nhưng reasoning_content có chữ
                    rc = getattr(msg, "reasoning_content", None)
                    if not rc and isinstance(getattr(msg, "model_extra", None), dict):
                        rc = msg.model_extra.get("reasoning_content")
                    text = (rc or "").strip()
                if text:
                    return text, {
                        "attempts": attempt + 1,
                        "max_completion_tokens": tokens,
                        "error": None,
                    }
                last_err = "empty_content"
                tokens *= 2  # reasoning ăn hết budget -> nới token rồi thử lại
            except Exception as exc:  # noqa: BLE001
                last_err = f"{type(exc).__name__}: {str(exc)[:160]}"
                await asyncio.sleep(5 * (attempt + 1))  # contention backoff
        return "", {"attempts": 3, "max_completion_tokens": tokens, "error": last_err}


# ----------------------------------------------------------------- judging ---

_SCORE_RE = re.compile(r'"score"\s*:\s*([0-9.]+)')
_NUM_RE = re.compile(r"([01](?:\.[0-9]+)?)")


def _clamp(x: float) -> float:
    return max(0.0, min(1.0, x))


async def judge_correctness(llm: LLM, question: str, gold: str, answer: str) -> dict:
    """Template Y NGUYÊN JUDGE_TEMPLATE (quick_eval, dùng bởi ab_probe)."""
    if not answer:
        return {"score": 0.0, "reason": "empty/error answer"}
    prompt = JUDGE_TEMPLATE.format(
        question=question[:600], gold=gold[:1500], answer=answer[:1500]
    )
    text = ""
    for _ in range(3):  # 3 attempts: parse fail -> retry (temp 0.1, 2000 token)
        text, _meta = await llm.chat(JUDGE_SYSTEM, prompt, max_completion_tokens=2000)
        m = _SCORE_RE.search(text) or _NUM_RE.search(text)
        if m:
            return {"score": _clamp(float(m.group(1))), "reason": text[:150]}
    return {"score": 0.0, "reason": f"judge_parse_fail {text[:100]}"}


async def judge_negative(llm: LLM, question: str, gold: str, answer: str) -> dict:
    """Template Y NGUYÊN NEGATIVE_JUDGE_TEMPLATE (ab_probe) — câu topology=negative."""
    if not answer:
        return {"score": 0.0, "fabricated": None, "reason": "empty/error answer"}
    prompt = NEGATIVE_JUDGE_TEMPLATE.format(
        question=question[:600], gold=gold[:1500], answer=answer[:1500]
    )
    text = ""
    for _ in range(3):
        text, _meta = await llm.chat(JUDGE_SYSTEM, prompt, max_completion_tokens=2000)
        m = _SCORE_RE.search(text) or _NUM_RE.search(text)
        if m:
            fab = bool(re.search(r'"fabricated"\s*:\s*true', text, re.I))
            return {"score": _clamp(float(m.group(1))), "fabricated": fab, "reason": text[:150]}
    return {"score": 0.0, "fabricated": None, "reason": f"judge_parse_fail {text[:100]}"}


async def judge_elements(llm: LLM, question: str, gold: str, answer: str) -> dict:
    """Template Y NGUYÊN JUDGE_ELEMENTS_TEMPLATE (ab_probe)."""
    if not answer:
        return {"completeness": 0.0, "missing": ["answer empty"]}
    prompt = JUDGE_ELEMENTS_TEMPLATE.format(
        question=question[:500], gold=gold[:1500], answer=answer[:1500]
    )
    text = ""
    for _ in range(3):
        text, _meta = await llm.chat(JUDGE_SYSTEM, prompt, max_completion_tokens=2000)
        m = re.search(r'"completeness"\s*:\s*([0-9.]+)', text)
        if m:
            mm = re.search(r'"missing"\s*:\s*\[(.*?)\]', text, re.S)
            missing = re.findall(r'"([^"]+)"', mm.group(1))[:8] if mm else []
            return {"completeness": _clamp(float(m.group(1))), "missing": missing}
    return {"completeness": 0.0, "missing": [f"judge_parse_fail {text[:80]}"]}


async def judge_hops(llm: LLM, question: str, expected_path: str, answer: str) -> dict:
    """Template Y NGUYÊN HOP_TEMPLATE (ab_probe)."""
    if not answer:
        return {"hops_total": None, "hops_correct": 0, "hops_extra": 0, "reason": "empty answer"}
    prompt = HOP_TEMPLATE.format(
        question=question[:500], expected_path=expected_path[:600], answer=answer[:1500]
    )
    text = ""

    def _int(name: str, src: str) -> int | None:
        m = re.search(rf'"{name}"\s*:\s*([0-9]+)', src)
        return int(m.group(1)) if m else None

    for _ in range(3):
        text, _meta = await llm.chat(JUDGE_SYSTEM, prompt, max_completion_tokens=2000)
        total = _int("hops_total", text)
        if total:
            return {
                "hops_total": total,
                "hops_correct": _int("hops_correct", text) or 0,
                "hops_extra": _int("hops_extra", text) or 0,
                "reason": text[:120],
            }
    return {
        "hops_total": None,
        "hops_correct": 0,
        "hops_extra": 0,
        "reason": f"judge_parse_fail {text[:100]}",
    }


# ------------------------------------------------------- graph load + start --


def load_dump(path: str | Path) -> dict:
    """Nạp dump của dump_graph.py (edges src/rel/dst, predicate lowercase) về shape
    chuẩn traverse.py (edges source/target/relationship_name UPPERCASE theo PRED_UP)
    — không sửa file có sẵn."""
    graph = load_graph(path)  # load_graph chấp nhận .json.gz
    norm_edges: list[dict] = []
    for e in graph["edges"]:
        if "source" in e and "target" in e:
            src, dst, rel = e["source"], e["target"], e.get("relationship_name", "?")
        else:
            src, dst, rel = e["src"], e["dst"], e.get("rel", "?")
        rel_norm = PRED_UP.get(str(rel).lower(), rel)
        norm_edges.append(
            {
                "source": src,
                "target": dst,
                "relationship_name": rel_norm,
                "properties": e.get("properties", {}),
            }
        )
    return {"nodes": graph["nodes"], "edges": norm_edges}


def node_name(graph: dict, nid: str) -> str:
    n = graph["nodes"].get(nid) or {}
    return n.get("name") or nid


def _name_index(graph: dict) -> list[tuple[str, str]]:
    return [
        (nid, (n.get("name") or "").strip())
        for nid, n in graph["nodes"].items()
        if (n.get("name") or "").strip()
    ]


_ENGLISH_TERM_RE = re.compile(r"[A-Z][A-Za-z0-9]+(?:[ /&-][A-Z]?[A-Za-z0-9]+)*")


def candidate_phrases(question: str) -> list[str]:
    """Ứng viên start node: thuật ngữ Anh hoa liên tục trước, n-gram tiếng Việt sau."""
    cands: list[str] = []
    for m in _ENGLISH_TERM_RE.finditer(question):
        cands.append(m.group(0))
    words = re.sub(r"[^\w\sÀ-ỹ]", " ", question, flags=re.UNICODE).split()
    for n in range(min(6, len(words)), 1, -1):
        for i in range(len(words) - n + 1):
            cands.append(" ".join(words[i : i + n]))
    return cands


def extract_start_node(graph: dict, question: str, name_index: list[tuple[str, str]]):
    """Entity chính của câu hỏi -> node id. Ưu tiên khớp TÊN ĐÚNG, sau đó tên ngắn nhất
    chứa cụm (word-boundary, tránh 'fault' dính 'default')."""
    seen: set[str] = set()
    for phrase in candidate_phrases(question):
        p = phrase.strip()
        if len(p) < 3:
            continue
        pl = p.lower()
        if pl in seen:
            continue
        seen.add(pl)
        for nid, nm in name_index:
            if nm.lower() == pl:
                return nid, p
        subs = [
            (len(nm), nid, nm)
            for nid, nm in name_index
            if re.search(rf"\b{re.escape(pl)}\b", nm.lower())
        ]
        if subs:
            subs.sort()
            return subs[0][1], p
    return None, None


# --------------------------------------------------------------- eval loop ---


def load_questions() -> list[dict]:
    return [
        json.loads(line)
        for line in QUESTIONS.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]


def read_rows(path: Path) -> list[dict]:
    if not path.exists():
        return []
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        try:
            rows.append(json.loads(line))
        except ValueError:
            continue
    return rows


def append_row(path: Path, row: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(row, ensure_ascii=False) + "\n")


async def eval_one(q: dict, graph: dict, index: dict, name_index: list, llm: LLM) -> dict:
    t0 = time.perf_counter()
    mode = select_mode(q)
    spec = CONTEXT_MODES[mode]
    k = 3 if mode == "lineage" else 2
    row: dict = {
        "id": q["id"],
        "type": q.get("type", ""),
        "topology": q.get("topology", ""),
        "mode": mode,
        "k": k,
        "allowed_predicates": sorted(spec["predicates"]),
        "direction": spec["direction"],
    }
    start_id, start_phrase = extract_start_node(graph, q["question"], name_index)
    row["start_node_query"] = start_phrase
    if not start_id:
        row.update(
            {
                "error": "no_start_node",
                "answer": "",
                "answer_chars": 0,
                "correctness": 0.0,
                "element_completeness": 0.0,
                "latency_traverse_s": round(time.perf_counter() - t0, 2),
            }
        )
        return row
    row["start_node"] = node_name(graph, start_id)
    sub = traverse(
        graph,
        index,
        start_id,
        set(spec["predicates"]),
        direction=spec["direction"],
        k=k,
    )
    row["latency_traverse_s"] = round(time.perf_counter() - t0, 2)
    if "error" in sub:
        row.update(
            {
                "error": sub["error"],
                "answer": "",
                "answer_chars": 0,
                "correctness": 0.0,
                "element_completeness": 0.0,
            }
        )
        return row
    context = render_context(sub, max_tokens=1200)
    row["n_ctx_nodes"] = len(sub.get("nodes", []))
    row["n_ctx_edges"] = len(sub.get("edges", []))

    t1 = time.perf_counter()
    answer, gen_meta = await llm.chat(
        GENERATOR_SYSTEM,
        GENERATOR_TEMPLATE.format(
            question=q["question"], context=context or "(không có context)"
        ),
        max_completion_tokens=2400,
    )
    row["latency_gen_s"] = round(time.perf_counter() - t1, 2)
    row["latency_total_s"] = round(time.perf_counter() - t0, 2)
    row["gen_meta"] = gen_meta
    row["answer"] = answer[:1200]
    row["answer_chars"] = len(answer)

    tj = time.perf_counter()
    if q.get("topology") == "negative":
        neg = await judge_negative(llm, q["question"], q.get("gold_answer", ""), answer)
        row.update(
            {
                "correctness": neg["score"],
                "fabricated": neg.get("fabricated"),
                "corr_reason": neg.get("reason", "")[:120],
            }
        )
    else:
        corr, elems, hops = await asyncio.gather(
            judge_correctness(llm, q["question"], q.get("gold_answer", ""), answer),
            judge_elements(llm, q["question"], q.get("gold_answer", ""), answer),
            judge_hops(llm, q["question"], q.get("expected_path", ""), answer),
        )
        row.update(
            {
                "correctness": corr["score"],
                "corr_reason": corr.get("reason", "")[:120],
                "element_completeness": elems["completeness"],
                "missing_elements": elems.get("missing", []),
                "hops_total": hops.get("hops_total"),
                "hops_correct": hops.get("hops_correct"),
                "hops_extra": hops.get("hops_extra"),
            }
        )
        ht = hops.get("hops_total")
        row["hop_precision"] = round(hops["hops_correct"] / ht, 2) if ht else None
    row["latency_judge_s"] = round(time.perf_counter() - tj, 2)
    row["ts"] = datetime.now(timezone.utc).isoformat()
    return row


async def run_eval(
    graph: dict, tag: str, out_path: Path, summary_path: Path, limit: int | None = None
) -> dict:
    index = build_index(graph)
    name_index = _name_index(graph)
    questions = load_questions()
    done = {r.get("id") for r in read_rows(out_path) if not r.get("error") or r.get("answer")}
    todo = [q for q in questions if q["id"] not in done]
    if limit:
        todo = todo[:limit]
    llm = LLM()
    print(
        f"[{tag}] {len(questions)} câu | done {len(done)} | todo {len(todo)} | "
        f"model={llm.model} keys={len(llm.keys)}",
        flush=True,
    )
    for i, q in enumerate(todo, 1):
        row = await eval_one(q, graph, index, name_index, llm)
        append_row(out_path, row)
        print(
            f"[{tag} {i}/{len(todo)}] {q['id']} mode={row.get('mode')} "
            f"start={row.get('start_node', '-')} ctx={row.get('n_ctx_edges', '-')}e "
            f"corr={row.get('correctness', '-')} elems={row.get('element_completeness', '-')} "
            f"hop={row.get('hop_precision', '-')} gen={row.get('latency_gen_s', '-')}s",
            flush=True,
        )
    rows = read_rows(out_path)
    summary = summarize(rows, tag, gateway_calls=llm.n_calls)
    summary_path.parent.mkdir(parents=True, exist_ok=True)
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(
        json.dumps(
            {k: summary[k] for k in (
                "variant", "n_scored", "n_errors", "correctness_mean",
                "element_completeness_mean", "hop_precision_mean", "latency_p50",
            ) if k in summary},
            ensure_ascii=False,
        ),
        flush=True,
    )
    return summary


def summarize(rows: list[dict], tag: str, gateway_calls: int = 0) -> dict:
    ok = [
        r
        for r in rows
        if r.get("answer_chars", 0) > 0 and "correctness" in r
    ]
    n = len(ok) or 1
    hops = [r["hop_precision"] for r in ok if r.get("hop_precision") is not None]
    lat = sorted(r.get("latency_total_s", 0) for r in ok)
    correctness_mean = round(sum(r.get("correctness", 0) for r in ok) / n, 3)
    elems_mean = round(sum(r.get("element_completeness", 0) for r in ok) / n, 3)
    hop_mean = round(sum(hops) / len(hops), 3) if hops else None
    summary: dict = {
        "variant": tag,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "n_scored": len(ok),
        "n_errors": len(rows) - len(ok),
        "gateway_calls": gateway_calls,
        "correctness_mean": correctness_mean,
        "element_completeness_mean": elems_mean,
        "hop_precision_mean": hop_mean,
        "fabrication_count": sum(1 for r in ok if r.get("fabricated") is True),
        "latency_p50": lat[max(0, len(lat) - 1) // 2] if lat else None,
        "per_question": [
            {
                k: r.get(k)
                for k in (
                    "id", "mode", "start_node", "n_ctx_nodes", "n_ctx_edges",
                    "correctness", "element_completeness", "hop_precision",
                    "fabricated", "latency_total_s",
                )
            }
            for r in rows
        ],
    }
    if tag == "c1":
        win = correctness_mean > WIN_CORRECTNESS or (hop_mean is not None and hop_mean > WIN_HOP)
        summary.update(
            {
                "baseline_b1": BASELINE_B1,
                "win_rule": f"correctness_mean > {WIN_CORRECTNESS} hoặc hop_precision_mean > {WIN_HOP}",
                "win": win,
                "delta_vs_baseline": {
                    "correctness": round(correctness_mean - BASELINE_B1["correctness_mean"], 3),
                    "element_completeness": round(
                        elems_mean - BASELINE_B1["element_completeness_mean"], 3
                    ),
                    "hop_precision": round(hop_mean - BASELINE_B1["hop_precision_mean"], 3)
                    if hop_mean is not None
                    else None,
                },
            }
        )
    return summary


# -------------------------------------------------------------------- C2 -----


def apply_merges(graph: dict, proposals: list[dict]) -> list[dict]:
    """Áp các nhóm kind='exact' có canonical != 'REVIEW_REQUIRED' lên graph (in-place):
    giữ node biến thể đẹp nhất làm canonical (giữ name/type của nó), trỏ mọi cạnh của
    variants về canonical, xóa variants, khử self-loop + cạnh trùng."""
    nodes: dict = graph["nodes"]
    edges: list[dict] = graph["edges"]
    applied: list[dict] = []
    for p in proposals:
        if p.get("kind") != "exact" or p.get("canonical") == "REVIEW_REQUIRED":
            continue
        ids = [v["id"] for v in p.get("variants", []) if v["id"] in nodes]
        if len(ids) < 2:
            continue

        def beauty(nid: str) -> tuple:
            nm = (nodes[nid].get("name") or "").strip()
            return (
                0 if nm.lower() == str(p["canonical"]).lower() else 1,
                -len(nm.split()),
                -len(nm),
                nid,
            )

        keep = sorted(ids, key=beauty)[0]
        drop = [i for i in ids if i != keep]
        for nid in drop:
            del nodes[nid]
        drop_set = set(drop)
        new_edges: list[dict] = []
        seen: set[tuple] = set()
        for e in edges:
            s = keep if e["source"] in drop_set else e["source"]
            t = keep if e["target"] in drop_set else e["target"]
            if s == t:
                continue  # self-loop phát sinh sau merge
            key = (s, e.get("relationship_name", ""), t)
            if key in seen:
                continue  # cạnh trùng sau khi gộp variants
            seen.add(key)
            new_edges.append({**e, "source": s, "target": t})
        edges[:] = new_edges
        applied.append(
            {
                "canonical": p["canonical"],
                "kept_node": keep,
                "kept_name": nodes[keep].get("name"),
                "merged_variants": [
                    {"id": i, "name": p["variants"][[v["id"] for v in p["variants"]].index(i)]["name"]}
                    for i in drop
                ],
                "n_edges_after": len(new_edges),
            }
        )
    return applied


async def cmd_c2(args) -> int:
    graph = load_dump(args.dump)
    print(
        f"[c2] graph: {len(graph['nodes'])} nodes / {len(graph['edges'])} edges", flush=True
    )
    proposals = find_merge_groups(graph)
    headings = split_heading_candidates(graph)
    prop_path = Path(args.proposals)
    prop_path.parent.mkdir(parents=True, exist_ok=True)
    with prop_path.open("w", encoding="utf-8") as fh:
        for p in proposals:
            fh.write(json.dumps(p, ensure_ascii=False) + "\n")
        for h in headings:
            fh.write(json.dumps({"kind": "heading_split", **h}, ensure_ascii=False) + "\n")
    print(
        f"[c2] proposals: {len(proposals)} exact/semantic nhóm + {len(headings)} heading split "
        f"-> {prop_path}",
        flush=True,
    )

    applied = apply_merges(graph, proposals)
    print(
        f"[c2] applied {len(applied)} nhóm exact: "
        f"graph sau merge {len(graph['nodes'])} nodes / {len(graph['edges'])} edges",
        flush=True,
    )
    if args.save_merged:
        dest = Path(args.save_merged)
        dest.parent.mkdir(parents=True, exist_ok=True)
        with gzip.open(dest, "wt", encoding="utf-8") as fh:
            json.dump(
                {
                    "dataset": f"{Path(args.dump).stem}_merged",
                    "n_nodes": len(graph["nodes"]),
                    "n_edges": len(graph["edges"]),
                    "nodes": [
                        {"id": nid, **{k: v for k, v in n.items() if k != "id"}}
                        for nid, n in graph["nodes"].items()
                    ],
                    "edges": graph["edges"],
                },
                fh,
                ensure_ascii=False,
            )
        print(f"[c2] merged graph -> {dest}", flush=True)

    summary = await run_eval(graph, "c2", Path(args.out), Path(args.summary), args.limit)
    summary["merge_stats"] = {
        "n_proposals": len(proposals),
        "n_heading_splits": len(headings),
        "n_applied": len(applied),
        "applied": applied,
    }
    Path(args.summary).write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return 0


# -------------------------------------------------------------------- C3 -----


async def judge_edge(llm: LLM, r: dict) -> bool | None:
    prompt = C3_AUDIT_TEMPLATE.format(a=r["from"], pred=r["predicate"], b=r["to"])
    text = ""
    for _ in range(3):  # round-robin key bên trong llm.chat; parse fail -> retry
        text, _meta = await llm.chat(JUDGE_SYSTEM, prompt, max_completion_tokens=2000)
        m = re.search(r'"correct"\s*:\s*(true|false)', text, re.I)
        if m:
            return m.group(1).lower() == "true"
    return None


def _edge_key(r: dict) -> str:
    return f"{r['edge']['source']}|{r['predicate']}|{r['edge']['target']}"


async def cmd_c3(args) -> int:
    graph = load_dump(args.dump)
    print(
        f"[c3] graph: {len(graph['nodes'])} nodes / {len(graph['edges'])} edges", flush=True
    )
    rows = sample_edges(graph, n=args.n, seed=args.seed)
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    done = {_edge_key(r) for r in read_rows(out_path) if r.get("correct") is not None}
    llm = LLM()
    todo = [r for r in rows if _edge_key(r) not in done]
    print(
        f"[c3] mẫu {len(rows)} cạnh (n={args.n}, seed={args.seed}) | done {len(done)} "
        f"| todo {len(todo)}",
        flush=True,
    )
    for i, r in enumerate(todo, 1):
        t0 = time.perf_counter()
        r["correct"] = await judge_edge(llm, r)
        r["audit_latency_s"] = round(time.perf_counter() - t0, 2)
        append_row(out_path, r)
        print(
            f"[c3 {i}/{len(todo)}] {r['from'][:40]} -[{r['predicate']}]-> {r['to'][:40]} "
            f"=> {r['correct']} ({r['audit_latency_s']}s)",
            flush=True,
        )
    stored = read_rows(out_path)
    summ = audit_summary(out_path)
    per = summ.get("per_predicate", {})
    weakest = None
    if per:
        weakest = min(
            ((p, v) for p, v in per.items() if v.get("n")),
            key=lambda kv: kv[1]["precision"] if kv[1]["precision"] is not None else 1.0,
            default=None,
        )
    report = {
        "variant": "c3_edge_audit",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "n_sampled": len(rows),
        "gateway_calls": llm.n_calls,
        "audit_summary": summ,
        "weakest_predicate": {
            "predicate": weakest[0],
            "precision": weakest[1]["precision"],
            "n": weakest[1]["n"],
        }
        if weakest
        else None,
        "fail_flag": bool(summ.get("precision_total") is not None and not summ.get("pass")),
        "note": "FAIL nếu precision_total < 0.90 (target theo review Stage C)",
    }
    Path(args.summary).write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "precision_total": summ.get("precision_total"),
                "n_audited": summ.get("n_audited"),
                "pass": summ.get("pass"),
                "weakest": report["weakest_predicate"],
            },
            ensure_ascii=False,
        ),
        flush=True,
    )
    return 0


# --------------------------------------------------------------- structure ---


def cmd_structure(args) -> int:
    """Metric cấu trúc giống analyze_graph.py nhưng tính từ DUMP (analyze_graph crash
    'Table Entity does not exist' với graph B1 mới)."""
    graph = load_dump(args.dump)
    nodes = graph["nodes"]
    edges = graph["edges"]
    n_nodes, n_edges = len(nodes), len(edges)

    degree: Counter = Counter()
    by_pred: dict[str, list[dict]] = defaultdict(list)
    sem_count = 0
    for e in edges:
        degree[e["source"]] += 1
        degree[e["target"]] += 1
        pred = e.get("relationship_name", "?")
        by_pred[pred].append(e)
        if pred.lower() not in STRUCTURAL_PREDICATES:
            sem_count += 1
    total = n_edges or 1

    # sample cạnh theo predicate (đúng nghĩa sample của analyze_graph.predicate_samples)
    samples: dict[str, list] = {}
    for pred, lst in by_pred.items():
        ex = []
        for e in lst[:3]:
            ex.append({
                "from": node_name(graph, e["source"])[:80],
                "to": node_name(graph, e["target"])[:80],
            })
        samples[pred] = ex

    out = {
        "dataset": args.dataset,
        "generated_from": f"dump {Path(args.dump).name} (subcommand structure của c1_traverse_eval.py; analyze_graph.py crash 'Table Entity does not exist')",
        "nodes": n_nodes,
        "edges": n_edges,
        "edge_ratio": round(n_edges / max(1, n_nodes), 3),
        "isolated": sum(1 for nid in nodes if degree.get(nid, 0) == 0),
        "isolated_pct": round(100 * sum(1 for nid in nodes if degree.get(nid, 0) == 0) / max(1, n_nodes), 2),
        "semantic_edges": sem_count,
        "semantic_pct": round(100 * sem_count / total, 1),
        "predicates": [
            {"type": p, "count": len(by_pred[p]), "pct": round(100 * len(by_pred[p]) / total, 1)}
            for p in sorted(by_pred, key=lambda k: -len(by_pred[k]))[:15]
        ],
        "predicate_samples": samples,
        "top_degree": [
            (node_name(graph, nid)[:80], deg)
            for nid, deg in sorted(degree.items(), key=lambda kv: -kv[1])[:10]
        ],
        "entity_types": [
            [t, c] for t, c in Counter(
                (n.get("type") or "UNKNOWN") for n in nodes.values()
            ).most_common(12)
        ],
    }
    dest = Path(args.dest)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps({k: out[k] for k in ("nodes", "edges", "semantic_pct",
                                          "isolated_pct", "edge_ratio")}, indent=1))
    print("[top predicates]", [(p["type"], p["pct"]) for p in out["predicates"][:8]])
    print("->", dest)
    return 0


# -------------------------------------------------------------------- CLI ----


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(
        description="Stage C ablation: C1 traversal / C2 merge / C3 edge audit / structure"
    )
    sub = ap.add_subparsers(dest="cmd", required=True)

    def add_common(p, out_default: str, summary_default: str):
        p.add_argument("--dump", default=str(DEFAULT_DUMP), help="graph dump .gz của dump_graph.py")
        p.add_argument("--out", default=out_default)
        p.add_argument("--summary", default=summary_default)
        p.add_argument("--limit", type=int, default=None, help="giới hạn số câu (debug)")

    p1 = sub.add_parser("c1", help="C1: constrained traversal eval")
    add_common(p1, "runs/c1/c1_results.jsonl", "runs/c1/c1_summary.json")

    p2 = sub.add_parser("c2", help="C2: entity merge + chạy lại gen+judge")
    add_common(p2, "runs/c2/c2_results.jsonl", "runs/c2/c2_summary.json")
    p2.add_argument("--proposals", default="runs/c2/merge_proposals.jsonl")
    p2.add_argument("--save-merged", default=None, help="ghi graph đã merge ra .json.gz")

    p3 = sub.add_parser("c3", help="C3: audit precision mẫu cạnh")
    p3.add_argument("--dump", default=str(DEFAULT_DUMP))
    p3.add_argument("--out", default="runs/c3/audit_edges.jsonl")
    p3.add_argument("--summary", default="runs/c3/c3_audit_summary.json")
    p3.add_argument("--n", type=int, default=100)
    p3.add_argument("--seed", type=int, default=7)

    ps = sub.add_parser("structure", help="metric cấu trúc graph từ dump (thay analyze_graph)")
    ps.add_argument("--dump", default=str(DEFAULT_DUMP))
    ps.add_argument("--dataset", default="swebok_v4_b1")
    ps.add_argument("--dest", default=None, help="mặc định runs/graph_probe/structure_<dataset>.json")

    args = ap.parse_args(argv)
    os.environ.setdefault("OMP_NUM_THREADS", "2")
    os.environ.setdefault("ORT_INTRA_OP_NUM_THREADS", "2")
    if args.cmd == "c1":
        graph = load_dump(args.dump)
        print(
            f"[c1] graph: {len(graph['nodes'])} nodes / {len(graph['edges'])} edges",
            flush=True,
        )
        asyncio.run(run_eval(graph, "c1", Path(args.out), Path(args.summary), args.limit))
    elif args.cmd == "c2":
        asyncio.run(cmd_c2(args))
    elif args.cmd == "c3":
        asyncio.run(cmd_c3(args))
    else:
        if not getattr(args, "dest", None):
            args.dest = str(REPO_ROOT / "runs" / "graph_probe" / f"structure_{args.dataset}.json")
        cmd_structure(args)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
