"""Latency evidence bench (design §8).

Usage: python bench/bench.py [base_url]      (default http://localhost:8109)

1. Uploads a generated ~100-page Markdown doc, polls the job, prints stageMs.
2. Runs 20 sequential retrieval-only /ask calls, prints p50/p95/max + /metrics.
"""

import json
import statistics
import sys
import time

import httpx

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8109"
PAGES = 100
CHARS_PER_PAGE = 3000  # ~500 words


def page(i: int) -> str:
    lines = [f"# Chapter {i} > topics", ""]
    for j in range(1, 6):
        lines.append(f"## Topic {i}.{j} concept {j}")
        lines.append("")
        lines.append(
            f"Section {i}.{j} explains concept {j} with worked examples, definitions "
            f"and common mistakes that students make when learning topic {i} part {j}. " * 22
        )
        lines.append("")
    return "\n".join(lines)


def main() -> None:
    doc = "\n\n".join(page(i) for i in range(1, 21))  # 20 chapters ≈ PAGES pages
    print(f"bench doc: {len(doc)} chars ≈ {round(len(doc) / CHARS_PER_PAGE)} pages")
    with httpx.Client(timeout=180) as client:
        t0 = time.perf_counter()
        up = client.post(
            f"{BASE}/api/v1/documents/upload",
            files={"file": ("bench-100pages.md", doc.encode("utf-8"))},
            data={"title": "Bench 100 pages"},
        )
        up.raise_for_status()
        job = up.json()
        print(
            f"upload: HTTP {up.status_code} jobId={job['jobId']} "
            f"uploadMs={round((time.perf_counter() - t0) * 1000, 1)}"
        )
        while True:
            j = client.get(f"{BASE}/api/v1/jobs/{job['jobId']}").json()
            if j["status"] in ("ready", "failed"):
                break
            time.sleep(0.1)
        print("job:", json.dumps(j, ensure_ascii=False))
        assert j["status"] == "ready", j
        stage = j.get("stageMs", {})
        ingest_ms = sum(v for k, v in stage.items() if k.endswith("Ms") and k != "conversionMs")
        print(f"INGEST BUDGET (parse+chunk+index+mirror, excl conversionMs): {round(ingest_ms, 1)} ms  (limit 60000)")

        samples = []
        for i in range(20):
            t = time.perf_counter()
            r = client.post(
                f"{BASE}/api/v1/ask",
                json={"question": f"concept {i % 5 + 1} worked examples", "mode": "retrieve"},
            )
            r.raise_for_status()
            samples.append((time.perf_counter() - t) * 1000)
        samples.sort()
        m = client.get(f"{BASE}/api/v1/metrics").json()
        p95 = samples[int(0.95 * (len(samples) - 1))]
        print(
            f"ASK sequential n=20: p50={round(statistics.median(samples), 1)}ms "
            f"p95={round(p95, 1)}ms max={round(samples[-1], 1)}ms (limit 3000)"
        )
        print("metrics:", json.dumps(m, ensure_ascii=False))


if __name__ == "__main__":
    main()
