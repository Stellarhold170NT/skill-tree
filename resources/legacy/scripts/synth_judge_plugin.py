"""Synthesis + judge cho plugin context — phép so corr apples-to-apples với cognee.

cognee GRAPH_COMPLETION: graph context -> LLM synthesis -> answer (corr 0.51).
Plugin: context block -> LLM synthesis (mô phỏng agent OpenCode) -> answer -> judge.
Chạy cho deep-noqa. Prompt synthesis KHÔNG cho biết gold; judge như t7 (ab_probe).
"""
from __future__ import annotations

import asyncio
import json
import sys
import time
from pathlib import Path

REPO = Path("/workspace")
LOGF = REPO / "runs/t7/PLUGIN-synth.log"
sys.path.insert(0, str(REPO / "src"))

SYN_SYS = "Bạn là agent trả lời câu hỏi về SWEBOK v4 dựa TRỌNG TUYỆT ĐỐI trên ngữ cảnh được cung cấp. Trả lời ngắn gọn, trực tiếp, bằng tiếng Việt, nêu đủ các khái niệm mà ngữ cảnh nêu. Nếu ngữ cảnh không đủ để trả lời, hãy nói rõ phần nào thiếu."
SYN_TMPL = "Câu hỏi: {q}\n\nNgữ cảnh truy xuất từ bộ nhớ SWEBOK:\n{ctx}\n\nHãy trả lời câu hỏi chỉ dựa trên ngữ cảnh trên."


def log(msg: str) -> None:
    with LOGF.open("a", encoding="utf-8") as f:
        f.write(f"{time.strftime('%H:%M:%S')} {msg}\n")


async def litellm_text(cfg, user_prompt, system):
    import litellm
    resp = await litellm.acompletion(
        model=cfg["model"], api_key=cfg["api_key"], api_base=cfg["endpoint"],
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user_prompt}],
        max_completion_tokens=1200, temperature=0.1,
    )
    msg = resp.choices[0].message
    return (msg.content or "").strip() or (getattr(msg, "reasoning_content", None) or "").strip()


async def run(mode: str) -> None:
    from skilltree.eval.ab_probe import client_cfg, judge_correctness
    from skilltree.eval.quick_eval import install_key_round_robin, load_env_file, read_keys

    load_env_file()
    keys = read_keys()
    install_key_round_robin(keys)
    cfg = client_cfg()
    out_dir = REPO / "runs/t7" / f"PLUGIN-v040-{mode}"
    rows = [json.loads(l) for l in (out_dir / "results.jsonl").read_text(encoding="utf-8").splitlines() if l.strip()]
    bank = {q["id"]: q for q in (json.loads(l) for l in (REPO / "corpora/swebok-v4/questions_bank_T7.jsonl").read_text(encoding="utf-8").splitlines() if l.strip())}
    scores, answers = [], {}
    for i, r in enumerate(rows, 1):
        q = bank[r["id"]]
        if "error" in r or not r.get("answer"):
            scores.append(0.0)
            continue
        try:
            ans = await asyncio.wait_for(litellm_text(cfg, SYN_TMPL.format(q=q["question"], ctx=r["answer"]), SYN_SYS), timeout=120)
        except Exception as exc:
            log(f"[{mode}] {r['id']} synth error {type(exc).__name__}")
            ans = ""
        c = await judge_correctness(cfg, q["question"], q["gold_answer"], ans) if ans else {"score": 0.0}
        scores.append(c["score"])
        (out_dir / "synth").mkdir(exist_ok=True)
        (out_dir / "synth" / f"{r['id']}.txt").write_text(ans, encoding="utf-8")
        if i % 10 == 0:
            log(f"[{mode}] {i}/{len(rows)} running_corr={round(sum(scores)/len(scores), 3)}")
    mean = round(sum(scores) / len(scores), 3) if scores else None
    (out_dir / "corr_synth.json").write_text(json.dumps({"corr_synth_mean": mean, "n": len(scores)}, ensure_ascii=False), encoding="utf-8")
    log(f"[{mode}] DONE corr_synth={mean}")


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "deep-noqa"
    log(f"=== synth+judge START {mode} ===")
    asyncio.run(run(mode))
    log("=== synth+judge ALL DONE ===")
