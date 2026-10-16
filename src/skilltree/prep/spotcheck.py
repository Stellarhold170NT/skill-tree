"""Spot-check question set vàng với text gốc Corpus SWEBOK v4 (thủ công hóa).

Sử dụng: /opt/venv/bin/python src/skilltree/prep/spotcheck.py [--n 10] [--seed 42]

- Chọn ngẫu nhiên N câu từ questions.jsonl (seed cố định để tái lập được).
- Với mỗi câu, tìm các "probe" (cụm tiếng Anh đặc trưng lấy từ đoạn gốc SWEBOK
  hỗ trợ gold_answer) trong swebok-v4.md và báo page nơi tìm thấy.
- Chuẩn hóa để so khớp: nối từ bị gạch chân xuống dòng ("con-\ncepts" ->
  "concepts"), bỏ gạch chân còn lại, gộp whitespace, hạ chữ thường.
- Exit code 0 nếu mọi câu được sample đều tìm thấy >=1 probe.
"""

from __future__ import annotations

import argparse
import json
import random
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
CORPUS_DIR = REPO_ROOT / "corpora" / "swebok-v4"

# Probe tiếng Anh đặc trưng cho từng câu hỏi (đoạn gốc hỗ trợ gold_answer).
# key = id câu hỏi, value = danh sách cụm cần tìm trong md (không phân biệt hoa thường).
PROBES: dict[str, list[str]] = {
    "SWEBOK-Q01": ["condition or capability needed by a user to solve a problem"],
    "SWEBOK-Q02": ["incompleteness", "ambiguity", "open to multiple interpretations"],
    "SWEBOK-Q03": ["Functional requirements specify observable"],
    "SWEBOK-Q04": ["Quality of Service Constraints", "response time, throughput, accuracy"],
    "SWEBOK-Q05": ["unambiguous", "be testable", "internally consistent", "feasible"],
    "SWEBOK-Q06": ["5-whys", "Why is this the requirement"],
    "SWEBOK-Q07": ["fundamental concepts or properties of a system in its environment"],
    "SWEBOK-Q08": ["architecture view represents one or more", "architecture viewpoint"],
    "SWEBOK-Q09": ["architectural style", "common solution to a recurring problem"],
    "SWEBOK-Q10": ["copies of the communication structures of these organizations"],
    "SWEBOK-Q11": ["architectural design of the software system", "detailed or internal-facing design"],
    "SWEBOK-Q12": ["blueprint or model of the system"],
    "SWEBOK-Q13": ["focuses on the information relevant to a particular purpose", "ordering of one"],
    "SWEBOK-Q14": ["detailed creation and maintenance of software"],
    "SWEBOK-Q15": ["Minimizing complexity", "Anticipating and embracing change", "Constructing for verification"],
    "SWEBOK-Q16": ["executable predicate placed in a program", "protect a routine from being broken"],
    "SWEBOK-Q17": ["dynamic validation", "finite set of test cases", "infinite execution domain"],
    "SWEBOK-Q18": ["could require months or years", "trade-off between limited resources"],
    "SWEBOK-Q19": ["testing for validation", "testing for verification"],
    "SWEBOK-Q20": ["top-down, bottom-up", "big bang"],
    "SWEBOK-Q21": ["selective retesting of a SUT", "unintended effects"],
    "SWEBOK-Q22": ["partitioning the input domain", "concentrate near the extreme values"],
    "SWEBOK-Q23": ["deploy, operate and support", "preserving its integrity and stability"],
    "SWEBOK-Q24": ["modify existing software while preserving its integrity"],
    "SWEBOK-Q25": ["Corrective maintenance", "Preventive maintenance", "Adaptive maintenance", "Perfective maintenance"],
    "SWEBOK-Q26": ["configuration management", "ensure the completeness and correctness of CIs"],
    "SWEBOK-Q27": ["configuration identification", "configuration change control", "release management and delivery"],
    "SWEBOK-Q28": ["planning, estimating", "controlling, coordinating, leading and managing risk"],
    "SWEBOK-Q29": ["work breakdown structure", "does not itself include cost and schedule baselines"],
    "SWEBOK-Q30": ["concept phase, requirements phase, design phase", "little or no iteration"],
    "SWEBOK-Q31": ["Basili", "Quality Improvement Paradigm"],
    "SWEBOK-Q32": ["impose structure on software engineering", "more success-oriented"],
    "SWEBOK-Q33": ["Heuristic Methods", "Formal Methods", "Prototyping Methods", "Agile Methods"],
    "SWEBOK-Q34": ["conformance to requirements", "fitness for use", "market-driven quality"],
    "SWEBOK-Q35": ["accurately represent stakeholder needs", "constraints on) functional requirements"],
    "SWEBOK-Q36": ["Confidentiality is the property", "Integrity is the property", "Availability is the property"],
    "SWEBOK-Q37": ["protects information and data", "types and levels of authorization"],
    "SWEBOK-Q38": ["ISO/IEC 27001:2022", "information security management system"],
    "SWEBOK-Q39": ["way of conducting services to achieve certain standards"],
    "SWEBOK-Q40": ["science of choice, not the science of money", "invest its limited resources"],
}

PAGE_MARKER_RE = re.compile(r"=== \[p\. (\d+)\] ===")


def normalize(text: str) -> str:
    """Nối từ bị gạch chân xuống dòng ("con-\\ncepts" -> "concepts"), sau đó
    bỏ gạch chân còn lại (chỉ để so khớp, ví dụ 'top-down' -> 'topdown'),
    gộp whitespace và hạ chữ thường."""
    text = re.sub(r"-\s*\n\s*", "", text)
    text = text.replace("-", "")
    return re.sub(r"\s+", " ", text).casefold()


def page_of(md_norm: str, pos: int) -> int | None:
    """Trang chứa vị trí pos (số marker '=== [p. N] ===' gần nhất trước pos)."""
    last = None
    for m in PAGE_MARKER_RE.finditer(md_norm, 0, pos + 1):
        last = int(m.group(1))
    return last


def run(questions_path: Path, md_path: Path, n: int, seed: int) -> bool:
    questions = [json.loads(l) for l in questions_path.read_text(encoding="utf-8").splitlines() if l.strip()]
    md_norm = normalize(md_path.read_text(encoding="utf-8"))
    sample = random.Random(seed).sample(questions, min(n, len(questions)))

    all_ok = True
    print(f"[spotcheck] n={len(sample)} seed={seed} corpus={md_path.name}")
    for q in sample:
        probes = PROBES.get(q["id"], [])
        found = []
        for probe in probes:
            m = re.search(re.escape(normalize(probe)), md_norm)
            if m:
                found.append({"probe": probe, "page": page_of(md_norm, m.start()), "pos": m.start()})
        ok = len(found) > 0
        all_ok = all_ok and ok
        status = "OK " if ok else "MISS"
        pages = sorted({f["page"] for f in found if f["page"] is not None})
        print(
            f"[spotcheck] {status} {q['id']} ({q['ka']}): "
            f"{len(found)}/{len(probes)} probe khop, pages={pages[:5]}"
        )
        if not ok:
            print(f"    question: {q['question'][:90]}")
    return all_ok


def main() -> int:
    ap = argparse.ArgumentParser(description="Spot-check question set voi text goc SWEBOK")
    ap.add_argument("--questions", type=Path, default=CORPUS_DIR / "questions.jsonl")
    ap.add_argument("--md", type=Path, default=CORPUS_DIR / "swebok-v4.md")
    ap.add_argument("--n", type=int, default=10)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()
    ok = run(args.questions, args.md, args.n, args.seed)
    print(f"[spotcheck] {'PASS' if ok else 'FAIL'}")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
