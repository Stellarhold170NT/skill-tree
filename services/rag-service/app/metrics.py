"""In-process metrics: counters + rolling p50/p95/max over the last 1000 samples."""

import time
from collections import deque

from . import config


def _percentile(ordered: list[float], pct: float) -> float:
    if not ordered:
        return 0.0
    k = max(0, min(len(ordered) - 1, round(pct / 100 * (len(ordered) - 1))))
    return ordered[k]


class Metric:
    def __init__(self, window: int = config.METRICS_WINDOW):
        self.count = 0
        self.total_ms = 0.0
        self.samples: deque[float] = deque(maxlen=window)

    def observe(self, ms: float) -> None:
        self.count += 1
        self.total_ms += ms
        self.samples.append(ms)

    def snapshot(self) -> dict:
        ordered = sorted(self.samples)
        return {
            "count": self.count,
            "p50Ms": round(_percentile(ordered, 50), 2),
            "p95Ms": round(_percentile(ordered, 95), 2),
            "maxMs": round(ordered[-1], 2) if ordered else 0.0,
            "avgMs": round(self.total_ms / self.count, 2) if self.count else 0.0,
        }


class Metrics:
    def __init__(self):
        self.retrieve = Metric()
        self.generate = Metric()
        self.ingest = Metric()
        self.ask_total = 0
        self.upload_total = 0
        self.started_at = time.time()

    def snapshot(self) -> dict:
        return {
            "uptimeS": round(time.time() - self.started_at, 1),
            "counters": {"askTotal": self.ask_total, "uploadTotal": self.upload_total},
            "askRetrieveMs": self.retrieve.snapshot(),
            "askGenerateMs": self.generate.snapshot(),
            "ingestMs": self.ingest.snapshot(),
        }


metrics = Metrics()
