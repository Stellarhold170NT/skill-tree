"""Xây glossary VI→EN từ key terms của bank T7 (dịch qua LLM proxy, in JSON ra stdout).

Chạy: cwd=/workspace
  /opt/venv/bin/python src/skilltree/eval/t7_build_glossary.py > /tmp/glossary.json (cấm — dùng stdout)
"""

from __future__ import annotations

import asyncio
import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT / "src") not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / "src"))

from skilltree.eval.ab_probe import client_cfg, litellm_text  # noqa: E402
from skilltree.eval.quick_eval import install_key_round_robin, load_env_file, read_keys  # noqa: E402

QUESTIONS = REPO_ROOT / "corpora" / "swebok-v4" / "questions_bank_T7.jsonl"
TONE = set("ăâđêôơưàáảãạằắẳẵặấầẩẫậèéẻẽẹếềểễệìíỉĩịòóỏõọốồổỗộớờởỡợùúủũụứừửữựỳýỷỹỵ")


def is_vi(s: str) -> bool:
    return any(ch in TONE for ch in s.lower())


def key_terms(gold: str) -> list[str]:
    m = re.search(r"Phần tử key:\s*(.+)$", gold.strip(), re.S)
    return [t.strip() for t in m.group(1).split(",") if t.strip()] if m else []


PROMPT = (
    "Bạn dịch thuật ngữ kỹ thuật phần mềm tiếng Việt sang thuật ngữ SWEBOK v4 tiếng Anh chuẩn.\n"
    "Trả về DUY NHẤT một JSON object: mỗi khóa là term tiếng Việt gốc, giá trị là mảng 1-3 "
    "tương đương tiếng Anh chuẩn (viết tắt phổ biến nếu có, ví dụ NPV, CVSS).\n"
    "Không giải thích, không markdown.\n\nTERMS:\n{terms}"
)


async def main() -> None:
    load_env_file()
    install_key_round_robin(read_keys())
    cfg = client_cfg()
    bank = [
        json.loads(l)
        for l in QUESTIONS.read_text(encoding="utf-8").splitlines()
        if l.strip()
    ]
    terms = sorted({t for q in bank for t in key_terms(q["gold_answer"]) if is_vi(t)})
    print(f"// VI terms: {len(terms)}", flush=True)

    glossary: dict[str, list[str]] = {}
    B = 20
    for i in range(0, len(terms), B):
        chunk = terms[i : i + B]
        obj = None
        for attempt in range(3):
            try:
                text = await litellm_text(cfg, PROMPT.format(terms=json.dumps(chunk, ensure_ascii=False, indent=1)))
                s, e = text.find("{"), text.rfind("}")
                obj = json.loads(text[s : e + 1])
                break
            except Exception as exc:  # noqa: BLE001
                print(f"// batch {i//B + 1} attempt {attempt + 1} failed: {type(exc).__name__}", flush=True)
                await asyncio.sleep(5)
        if not obj:
            continue
        for k, v in obj.items():
            if isinstance(v, list) and v:
                glossary[k] = [str(x) for x in v][:3]
        print(f"// batch {i//B + 1}: +{len(obj)} (total {len(glossary)})", flush=True)

    missing = [t for t in terms if t not in glossary]
    print(json.dumps({"glossary": glossary, "missing": missing}, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    asyncio.run(main())
