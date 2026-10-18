"""T7 A1 — element_completeness v2: deterministic key-term matching.

Protocol: mỗi gold_answer trong bank T7 kết thúc bằng 'Phần tử key: t1, t2, ...'.
v1 (ab_probe.judge_elements) là LLM judge -> nhiễu (14/54 câu elems=0.0, flip
giữa runs, pilot B1: L1-08 0.67 -> 0.0). v2 đếm tỷ lệ key terms có mặt trong
answer bằng fuzzy matching bất biến (không LLM, không sampling):
  normalize: NFD bỏ dấu, lowercase, dấu '/' '-' '_' -> space
  match: substring HOẶC sliding-window ratio (difflib) >= 0.8 cùng độ dài token

Chạy: cwd=/workspace
  /opt/venv/bin/python src/skilltree/eval/t7_element_v2.py \
      [--results runs/t7/T7-bank/results.jsonl] [--out runs/t7/T7-bank/element_v2.json]
"""

from __future__ import annotations

import argparse
import difflib
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
QUESTIONS = REPO_ROOT / "corpora" / "swebok-v4" / "questions_bank_T7.jsonl"
WINDOW_RATIO = 0.8


def norm(s: str) -> str:
    s = unicodedata.normalize("NFD", s)
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    s = s.lower()
    s = re.sub(r"[/\-_]+", " ", s)
    s = re.sub(r"[^a-z0-9àáãạăằắẵặâầấẫậèéẹêềếễệìíịòóọôồốỗộơờớỡợùúụũưừứữựỳýỵỷỹđ\s]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def key_terms_from_gold(gold: str) -> list[str]:
    m = re.search(r"Phần tử key:\s*(.+)$", gold.strip(), re.S)
    if not m:
        return []
    return [t.strip() for t in m.group(1).split(",") if t.strip()]


def term_in_answer(term: str, ans_norm: str, ans_tokens: list[str]) -> bool:
    t_norm = norm(term)
    if not t_norm:
        return False
    if t_norm in ans_norm:
        return True
    t_tokens = t_norm.split()
    n = len(t_tokens)
    if n == 0:
        return False
    for size in (n, n + 1, n - 1):
        if size <= 0 or size > len(ans_tokens):
            continue
        for i in range(len(ans_tokens) - size + 1):
            window = " ".join(ans_tokens[i : i + size])
            if difflib.SequenceMatcher(None, t_norm, window).ratio() >= WINDOW_RATIO:
                return True
    return False


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--results", type=Path, default=REPO_ROOT / "runs/t7/T7-bank/results.jsonl")
    ap.add_argument("--out", type=Path, default=REPO_ROOT / "runs/t7/T7-bank/element_v2.json")
    args = ap.parse_args()

    bank = {
        q["id"]: q
        for q in (json.loads(l) for l in QUESTIONS.read_text(encoding="utf-8").splitlines() if l.strip())
    }
    rows = [
        json.loads(l) for l in args.results.read_text(encoding="utf-8").splitlines() if l.strip()
    ]

    out_rows = []
    agg = defaultdict(list)
    for r in rows:
        if "error" in r:
            continue
        q = bank[r["id"]]
        terms = key_terms_from_gold(q["gold_answer"])
        ans_norm = norm(r.get("answer") or "")
        ans_tokens = ans_norm.split()
        matched, missing = [], []
        for t in terms:
            if term_in_answer(t, ans_norm, ans_tokens):
                matched.append(t)
            else:
                missing.append(t)
        comp = round(len(matched) / len(terms), 3) if terms else None
        r2 = {
            "id": r["id"], "level": r.get("level"), "ka": r.get("ka"),
            "corr": r.get("correctness"),
            "elems_v1": r.get("element_completeness"),
            "elems_v2": comp,
            "n_terms": len(terms), "missing": missing[:6],
        }
        out_rows.append(r2)
        if comp is not None:
            agg[r.get("level") or "unk"].append(comp)

    def _mean(xs):
        return round(sum(xs) / len(xs), 3) if xs else None

    corr_mean = _mean([r["corr"] for r in out_rows if r["corr"] is not None])
    v1_mean = _mean([r["elems_v1"] for r in out_rows if r["elems_v1"] is not None])
    v2_mean = _mean([r["elems_v2"] for r in out_rows if r["elems_v2"] is not None])

    # mối tương quan v2 với corr (đo instrument hợp lý hơn chưa)
    pairs = [(r["corr"], r["elems_v2"]) for r in out_rows if r["corr"] is not None and r["elems_v2"] is not None]
    if len(pairs_v := pairs) and len(pairs) > 2:  # noqa: F841
        n = len(pairs)
        mx = sum(p[0] for p in pairs) / n
        my = sum(p[1] for p in pairs) / n
        cov = sum((p[0] - mx) * (p[1] - my) for p in pairs)
        sx = (sum((p[0] - mx) ** 2 for p in pairs)) ** 0.5
        sy = (sum((p[1] - my) ** 2 for p in pairs)) ** 0.5
        pearson = round(cov / (sx * sy), 3) if sx and sy else None
    else:
        pearson = None

    result = {
        "n": len(out_rows),
        "elems_v1_mean": v1_mean,
        "elems_v2_mean": v2_mean,
        "corr_mean": corr_mean,
        "pearson_v2_vs_corr": pearson,
        "by_level_v2": {k: _mean(v) for k, v in sorted(agg.items())},
        "zero_v1_rows": [r["id"] for r in out_rows if r["elems_v1"] == 0.0],
        "zero_v2_rows": [r["id"] for r in out_rows if r["elems_v2"] == 0.0],
        "rows": out_rows,
    }
    args.out.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({k: v for k, v in result.items() if k != "rows"}, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
