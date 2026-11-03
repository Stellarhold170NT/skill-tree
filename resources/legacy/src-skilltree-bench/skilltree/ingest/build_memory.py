"""build_memory — dựng Memory cognee từ Corpus SWEBOK theo preset (Task 3).

Pipeline (GLOSSARY.md): ingest (cognee.add) → cognify → index, tất cả trong
cognee legacy V1 API. Mọi Run phải ghi resolved config + timing để tái lập
(CONTEXT.md).

Sử dụng (cwd = repo root /workspace):
    /opt/venv/bin/python src/skilltree/ingest/build_memory.py --preset smoke
    /opt/venv/bin/python src/skilltree/ingest/build_memory.py --preset base4ka --run-id run-00

Artifacts ghi vào runs/<run_id>/:
    ingest.log           — log thời gian từng bước + MemAvailable mỗi 60s (guardrail)
    resolved_config.json — preset đã resolve + môi trường (reproducible)
    ingest_metrics.json  — timing add/cognify/graph/search (đầu vào cho Task 4-6)
    search_sample.txt    — trích kết quả truy vấn kiểm chứng
    llm_activity.json    — nhịp LLM call (cho supervisor/watchdog)

Chống OOM (sandbox gVisor 8Gi, 2 lần chết khi cognify nặng):
- OMP_NUM_THREADS / ORT_INTRA_OP_NUM_THREADS = 2 (setdefault, TRƯỚC import onnxruntime)
- MemoryGuard thread log MemAvailable mỗi phút vào ingest.log

Chịu lỗi gateway LLM (bài học C5b 2026-10-17: chết 23:31 vì ServiceUnavailableError,
chỉ retry 1 lần rồi process chết lặng 23 phút không ai hay):
- cognify_resilient: retry backoff luỹ thừa + jitter (env SKILLTREE_COGNIFY_*).
  incremental_loading=true khiến mỗi retry chỉ tính tiếp chunk chưa xong.
- llm_activity.json: rotating_acompletion ghi nhịp MỌI LLM call (kể cả call lỗi) —
  supervisor/watchdog dùng để phân biệt "đang chạy" với "treo".
- ingest.log mở mode="a": restart không xoá lịch sử; [session] đánh dấu pid/attempt.
- acquire_build_lock: chặn 2 process build cùng run_id (orphan + supervisor đè nhau).
- Supervisor: scripts/run_supervised.sh — preflight gateway, watchdog treo, restart.

LLM key round-robin: khi preset khai báo >=2 env var trong `llm_api_keys_env`,
monkeypatch litellm.acompletion để xoay vòng api_key trên TỪNG call (adapter
litellm_native của cognee lookup litellm.acompletion qua module attr LÚC GỜI
nên patch toàn cục, chỉ đổi kwarg api_key).
"""

from __future__ import annotations

import argparse
import asyncio
import importlib
import itertools
import json
import logging
import os
import random
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# Chống OOM: cap thread ONNX runtime TRƯỚC khi cognee/fastembed import onnxruntime.
os.environ.setdefault("OMP_NUM_THREADS", "2")
os.environ.setdefault("ORT_INTRA_OP_NUM_THREADS", "2")

REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT / "src") not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / "src"))

from skilltree.ingest.presets import (  # noqa: E402
    public_preset,
    resolve_files,
    summarize_files,
)

LOG = logging.getLogger("skilltree.ingest")


# ------------------------------------------------------- llm key rotation ----

def load_env_file() -> None:
    """Nạp .env của repo vào os.environ (override=False) TRƯỚC khi đọc key."""
    try:
        from dotenv import load_dotenv

        load_dotenv(REPO_ROOT / ".env", override=False)
    except ImportError:
        LOG.warning("[llm-keys] python-dotenv không có sẵn — chỉ dùng os.environ")


def read_api_keys(env_names: list[str]) -> list[str]:
    """Đọc danh sách key gateway từ biến môi trường (theo tên trong preset)."""
    keys: list[str] = []
    for name in env_names:
        value = os.environ.get(name, "").strip()
        if value and value not in keys:
            keys.append(value)
    return keys


def install_key_round_robin(keys: list[str], activity_path: Path | None = None) -> int:
    """Monkeypatch litellm.acompletion (idempotent):
    - xoay vòng api_key trên từng call khi có >=2 key;
    - ghi nhịp MỌI LLM call (kể cả call lỗi) vào activity_path (llm_activity.json)
      để supervisor/watchdog phân biệt run đang chạy với run treo.
    Return: số key đang xoay vòng (0 nếu <2 key — tracker vẫn hoạt động)."""
    import litellm

    if getattr(litellm.acompletion, "__skilltree_rr__", False):
        return 0

    cycle = itertools.cycle(keys) if len(keys) >= 2 else None
    original = litellm.acompletion
    state: dict[str, Any] = {"n_calls": 0, "n_errors": 0, "last_call_ts": "", "last_ok_ts": ""}

    def _touch(ok: bool | None) -> None:
        now = datetime.now(timezone.utc).isoformat()
        if ok is None:  # call bắt đầu
            state["n_calls"] += 1
            state["last_call_ts"] = now
        elif ok:
            state["last_ok_ts"] = now
        else:
            state["n_errors"] += 1
            state["last_call_ts"] = now  # call lỗi cũng là hoạt động gần nhất
        if activity_path is None:
            return
        try:
            tmp = f"{activity_path}.tmp"
            with open(tmp, "w", encoding="utf-8") as fh:
                json.dump(state, fh)
            os.replace(tmp, activity_path)
        except OSError:
            pass  # tracker không bao giờ được làm chết build

    async def rotating_acompletion(*args: Any, **kwargs: Any):
        if cycle is not None:
            kwargs["api_key"] = next(cycle)
        _touch(None)
        try:
            result = await original(*args, **kwargs)
        except Exception:
            _touch(False)
            raise
        _touch(True)
        return result

    rotating_acompletion.__skilltree_rr__ = True  # type: ignore[attr-defined]
    rotating_acompletion.__skilltree_rr_original__ = original  # type: ignore[attr-defined]
    litellm.acompletion = rotating_acompletion
    return len(keys) if cycle is not None else 0


def key_fingerprint(key: str) -> str:
    return f"...{key[-4:]}" if len(key) >= 4 else "..."


# ----------------------------------------------------------- memory guard ----

class MemoryGuard:
    """Thread nền log MemAvailable mỗi `interval` giây vào ingest.log (guardrail OOM)."""

    def __init__(self, interval: int = 60) -> None:
        self.interval = interval
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def _loop(self) -> None:
        while not self._stop.wait(self.interval):
            try:
                for line in open("/proc/meminfo", encoding="utf-8"):
                    if line.startswith("MemAvailable") or line.startswith("MemFree"):
                        LOG.info("[mem] %s", line.strip())
                        break
            except OSError:
                pass

    def start(self) -> None:
        self._thread = threading.Thread(target=self._loop, daemon=True, name="mem-guard")
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()


# ---------------------------------------------------------------- logging ----

def setup_logging(run_dir: Path) -> Path:
    """Logger ghi song song ra runs/<run_id>/ingest.log (mode="a" — append qua các
    lần restart của supervisor) và stdout."""
    run_dir.mkdir(parents=True, exist_ok=True)
    log_path = run_dir / "ingest.log"
    LOG.setLevel(logging.INFO)
    LOG.handlers.clear()
    fmt = logging.Formatter("%(asctime)s %(levelname)s %(message)s", "%Y-%m-%dT%H:%M:%S")
    fh = logging.FileHandler(log_path, mode="a", encoding="utf-8")
    fh.setFormatter(fmt)
    sh = logging.StreamHandler(sys.stdout)
    sh.setFormatter(fmt)
    LOG.addHandler(fh)
    LOG.addHandler(sh)
    return log_path


# ------------------------------------------------------------ build lock ----

def acquire_build_lock(run_id: str) -> Path:
    """Chặn 2 process build cùng run_id chạy song song (orphan + supervisor
    restart đè nhau lên cùng dataset → hỏng graph). Lock /tmp kèm pid; lock
    stale (pid đã chết) tự động được chiếm lại."""
    lock_path = Path("/tmp") / f"skilltree-build-{run_id}.lock"
    while True:
        try:
            fd = os.open(lock_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            os.write(fd, str(os.getpid()).encode())
            os.close(fd)
            return lock_path
        except FileExistsError:
            try:
                other = int(lock_path.read_text().strip() or "0")
            except (ValueError, OSError):
                other = 0
            if other and Path(f"/proc/{other}").exists():
                LOG.error("[lock] build khác đang chạy pid=%d — thoát", other)
                raise SystemExit(3)
            LOG.warning("[lock] lock stale (pid %s chết) — chiếm lại", other)
            try:
                lock_path.unlink()
            except OSError:
                pass


# ------------------------------------------------------- cognify mapping ----

def resolve_graph_model(name: str) -> type:
    """Resolve `graph_model` preset ("Class" | "module.Class" | "module:Class") thành class."""
    candidates: list[str] = []
    if ":" in name:
        candidates.append(name)
    elif "." in name:
        candidates.append(name)
        module, _, cls = name.rpartition(".")
        candidates.append(f"{module}:{cls}")
    else:
        candidates.append(f"cognee.shared.data_models:{name}")
        candidates.append(f"cognee.shared.data_models:{name}Model")
    for cand in candidates:
        module, _, cls = cand.partition(":")
        try:
            mod = importlib.import_module(module)
            obj = getattr(mod, cls)
            if isinstance(obj, type):
                return obj
        except (ImportError, AttributeError):
            continue
    raise ImportError(f"Không resolve được graph_model '{name}' (thử: {candidates})")


def build_cognify_kwargs(preset: dict[str, Any]) -> dict[str, Any]:
    """Map preset thẳng vào kwargs của cognee.cognify() (signature đã xác minh 1.6.4)."""
    kwargs: dict[str, Any] = {"datasets": preset["dataset"]}
    if preset.get("chunk_size") is not None:
        kwargs["chunk_size"] = int(preset["chunk_size"])
    if preset.get("chunks_per_batch") is not None:
        kwargs["chunks_per_batch"] = int(preset["chunks_per_batch"])
    if preset.get("custom_prompt"):
        kwargs["custom_prompt"] = preset["custom_prompt"]
    if preset.get("graph_model"):
        kwargs["graph_model"] = resolve_graph_model(preset["graph_model"])
    if preset.get("extractor"):
        kwargs["extractor"] = preset["extractor"]  # "llm" | "gliner"
    kwargs["incremental_loading"] = bool(preset.get("incremental_loading", True))
    if preset.get("chunk_attachment") in ("direct", "all"):
        kwargs["chunk_attachment"] = preset["chunk_attachment"]
    # Continue-on-error cho build dài: chunk fail sau retry sẽ bị log + bỏ qua,
    # không làm chết cả Run (đã từng chết vì gateway 502 + schema retry).
    kwargs["raise_on_error"] = bool(preset.get("raise_on_error", False))
    return kwargs


# ------------------------------------------------ cognify chịu lỗi gateway ----

COGNIFY_MAX_ATTEMPTS = int(os.environ.get("SKILLTREE_COGNIFY_ATTEMPTS", "12"))
COGNIFY_BACKOFF_BASE_S = float(os.environ.get("SKILLTREE_COGNIFY_BACKOFF_S", "60"))
COGNIFY_BACKOFF_CAP_S = float(os.environ.get("SKILLTREE_COGNIFY_BACKOFF_CAP_S", "900"))

# Marker lỗi tạm thời (gateway 5xx / timeout / rate-limit) — khớp theo tên class
# và message, đi theo chuỗi __cause__/__context__ của litellm.
_TRANSIENT_MARKERS = (
    "ServiceUnavailable", "Service Unavailable", "temporarily unreachable",
    "APIConnectionError", "APITimeoutError", "Timeout", "timed out",
    "RateLimit", "rate limit", "429", "InternalServerError", "overloaded",
    "Connection reset", "Connection error", "bad gateway", "Bad Gateway",
    "502", "503", "EOF",
)


def _is_transient(exc: BaseException) -> bool:
    """Gateway 5xx/timeout/ratelimit coi là tạm thời → retry nhiều lần được."""
    seen: set[int] = set()
    cur: BaseException | None = exc
    while cur is not None and id(cur) not in seen:
        seen.add(id(cur))
        text = f"{type(cur).__name__} {cur}"
        if any(m in text for m in _TRANSIENT_MARKERS):
            return True
        cur = cur.__cause__ or cur.__context__
    return False


async def cognify_resilient(cognee: Any, kwargs: dict[str, Any]) -> tuple[Any, int, list[str]]:
    """cognify với retry backoff luỹ thừa + jitter.

    An toàn khi retry vì preset dùng incremental_loading=true — mỗi lần retry
    chỉ tính tiếp các chunk chưa xử lý xong, không làm lại từ đầu.

    - Lỗi tạm thời: retry tới COGNIFY_MAX_ATTEMPTS (mặc định 12), backoff
      60s × 2^k, cap 15 phút, jitter ±20% → chịu được outage gateway ~2h.
    - Lỗi khác (schema sai, auth, config): chỉ cho tối đa 3 attempt tổng rồi
      raise — đỡ đốt giờ cho lỗi cứng, supervisor sẽ quyết định ở tầng trên.
    """
    errors: list[str] = []
    attempt = 0
    while True:
        attempt += 1
        try:
            return await cognee.cognify(**kwargs), attempt, errors
        except Exception as exc:  # noqa: BLE001
            errors.append(f"attempt{attempt}: {type(exc).__name__}: {exc}"[:400])
            transient = _is_transient(exc)
            hard_cap = COGNIFY_MAX_ATTEMPTS if transient else 3
            if attempt >= hard_cap:
                LOG.error("[cognify] bỏ cuộc sau %d attempt (transient=%s): %s",
                          attempt, transient, errors[-1])
                raise
            if transient:
                delay = min(COGNIFY_BACKOFF_BASE_S * (2 ** (attempt - 1)), COGNIFY_BACKOFF_CAP_S)
                delay *= random.uniform(0.8, 1.2)
            else:
                delay = 120.0
            LOG.warning("[cognify] attempt %d/%s fail (transient=%s): %s — retry sau %.0fs",
                        attempt, hard_cap, transient, errors[-1][:280], delay)
            await asyncio.sleep(delay)


# ------------------------------------------------------------- graph stats ---

async def collect_graph_stats() -> dict[str, Any]:
    """Đếm node/edge của graph Ladybug (best-effort, không làm chết Run)."""
    from cognee.infrastructure.databases.graph import get_graph_engine

    stats: dict[str, Any] = {}
    try:
        graph = await get_graph_engine()
        t0 = time.perf_counter()
        nodes, edges = await graph.get_graph_counts()
        stats.update(
            nodes=nodes,
            edges=edges,
            counts_seconds=round(time.perf_counter() - t0, 3),
        )
    except Exception as exc:  # noqa: BLE001
        stats["error"] = f"{type(exc).__name__}: {exc}"
    return stats


def compact_results(results: Any, limit_each: int = 400, limit_n: int = 3) -> list[str]:
    """Rút gọn kết quả search thành chuỗi ngắn để log/report."""
    out: list[str] = []
    items = results if isinstance(results, list) else [results]
    for item in items[:limit_n]:
        text = getattr(item, "search_result", None) or getattr(item, "text", None)
        if text is None:
            text = str(item)
        if not isinstance(text, str):
            text = json.dumps(text, ensure_ascii=False, default=str)
        out.append(text.strip()[:limit_each])
    return out


# ------------------------------------------------------------------- build ---

async def run_build(preset: dict[str, Any], run_id: str, run_search: bool = True) -> dict[str, Any]:
    run_id = run_id or f"run-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    run_dir = REPO_ROOT / "runs" / run_id
    log_path = setup_logging(run_dir)
    lock_path = acquire_build_lock(run_id)
    guard = MemoryGuard(interval=60)
    guard.start()
    LOG.info("[session] pid=%d attempt=%s log_mode=append", os.getpid(),
             os.environ.get("SKILLTREE_ATTEMPT", "1"))
    LOG.info("[threads] OMP_NUM_THREADS=%s ORT_INTRA_OP_NUM_THREADS=%s",
             os.environ.get("OMP_NUM_THREADS"), os.environ.get("ORT_INTRA_OP_NUM_THREADS"))

    try:
        # Nạp .env rồi patch litellm TRƯỚC khi cognee build client lần đầu.
        load_env_file()
        keys = read_api_keys(preset.get("llm_api_keys_env") or ["LLM_API_KEY"])
        n_rotating = install_key_round_robin(keys, activity_path=run_dir / "llm_activity.json")
        if n_rotating:
            LOG.info("[llm-keys] round-robin ACTIVE: %d keys %s",
                     n_rotating, [key_fingerprint(k) for k in keys])
        else:
            LOG.info("[llm-keys] round-robin OFF (dùng 1 key %s)",
                     key_fingerprint(keys[0]) if keys else "n/a")

        import cognee  # import sau khi logging + patch sẵn sàng

        LOG.info("=== Run %s | preset=%s ===", run_id, preset.get("name"))
        metrics: dict[str, Any] = {
            "run_id": run_id,
            "preset_name": preset.get("name"),
            "preset_path": preset.get("path"),
            "started_at": datetime.now(timezone.utc).isoformat(),
            "cognee_version": getattr(cognee, "__version__", "1.6.4"),
            "env": {"OMP_NUM_THREADS": os.environ.get("OMP_NUM_THREADS"),
                    "ORT_INTRA_OP_NUM_THREADS": os.environ.get("ORT_INTRA_OP_NUM_THREADS")},
            "llm_keys": {
                "env_names": list(preset.get("llm_api_keys_env") or ["LLM_API_KEY"]),
                "n_active": max(n_rotating, 1 if keys else 0),
                "fingerprints": [key_fingerprint(k) for k in keys],
                "round_robin": bool(n_rotating),
            },
        }

        # 1) Resolve Corpus (glob + subsets)
        files = resolve_files(preset, out_dir=run_dir / "corpus")
        summary = summarize_files(files)
        LOG.info("[corpus] %s", json.dumps(summary, ensure_ascii=False))
        metrics["corpus"] = summary

        # 2) Reset state (nếu preset yêu cầu) — prune_data + prune_system(metadata=True)
        if preset.get("reset"):
            t0 = time.perf_counter()
            await cognee.prune.prune_data()
            await cognee.prune.prune_system(metadata=True)
            prune_s = time.perf_counter() - t0
            LOG.info("[prune] prune_data + prune_system(metadata=True) done")
            LOG.info("[prune] time=%.2fs", prune_s)
            metrics["prune"] = {"seconds": round(prune_s, 3)}
        else:
            LOG.info("[prune] reset=false — giữ nguyên state hiện có (resume incremental)")

        # 3) ingest: add từng file text vào Dataset của preset
        t_add0 = time.perf_counter()
        add_details = []
        for f in files:
            t0 = time.perf_counter()
            await cognee.add(str(f), dataset_name=preset["dataset"])
            dt = time.perf_counter() - t0
            add_details.append({"file": str(f), "seconds": round(dt, 3),
                                "chars": len(f.read_text(encoding="utf-8"))})
            LOG.info("[add] file=%s chars=%d time=%.2fs", f.name,
                     add_details[-1]["chars"], dt)
        add_s = time.perf_counter() - t_add0
        LOG.info("[add] total files=%d chars=%d time=%.2fs",
                 len(files), summary["n_chars"], add_s)
        metrics["add"] = {"seconds": round(add_s, 3), "details": add_details}

        # 4) cognify — kwargs map thẳng từ preset, retry chịu lỗi gateway
        kwargs = build_cognify_kwargs(preset)
        LOG.info("[cognify] kwargs=%s", json.dumps(
            {k: (v.__name__ if isinstance(v, type) else v) for k, v in kwargs.items()},
            ensure_ascii=False, default=str))
        t0 = time.perf_counter()
        cognify_result, cognify_attempts, cognify_errors = await cognify_resilient(cognee, kwargs)
        cognify_s = time.perf_counter() - t0
        LOG.info("[cognify] time=%.2fs attempts=%d", cognify_s, cognify_attempts)
        metrics["cognify"] = {"seconds": round(cognify_s, 3), "attempts": cognify_attempts}
        if cognify_errors:
            metrics["cognify"]["attempt_errors"] = cognify_errors
        try:
            blob = json.dumps(cognify_result, ensure_ascii=False, default=str)
            LOG.info("[cognify] result=%s", blob[:600])
            metrics["cognify"]["result"] = json.loads(blob) if len(blob) < 100000 else blob[:2000]
        except (TypeError, ValueError):
            LOG.info("[cognify] result(unserializable)=%s", str(cognify_result)[:600])

        # 5) Thống kê graph: node/edge
        stats = await collect_graph_stats()
        LOG.info("[graph] %s", json.dumps(stats, ensure_ascii=False, default=str))
        metrics["graph"] = stats

        # 6) Truy vấn kiểm chứng — chứng minh Memory dùng được sau build
        if run_search:
            from cognee.api.v1.search import SearchType

            qtype = SearchType[preset.get("search_type", "GRAPH_COMPLETION")]
            query = preset.get("search_query") or "Software requirements là gì?"
            t0 = time.perf_counter()
            results = await cognee.search(
                query_text=query, query_type=qtype, datasets=[preset["dataset"]]
            )
            search_s = time.perf_counter() - t0
            sample = compact_results(results)
            LOG.info("[search] type=%s query=%r results=%d time=%.2fs",
                     qtype.name, query,
                     len(results) if isinstance(results, list) else 1, search_s)
            LOG.info("[search] sample_0=%r", sample[0] if sample else "(empty)")
            (run_dir / "search_sample.txt").write_text(
                f"query: {query}\ntype: {qtype.name}\n"
                + "\n---\n".join(compact_results(results, limit_each=1200, limit_n=3))
                + "\n",
                encoding="utf-8",
            )
            metrics["search"] = {
                "type": qtype.name, "query": query, "seconds": round(search_s, 3),
                "n_results": len(results) if isinstance(results, list) else 1,
                "sample": sample,
            }

        # 7) Ghi metrics + resolved config (reproducible; KHÔNG ghi giá trị key)
        metrics["finished_at"] = datetime.now(timezone.utc).isoformat()
        total_s = sum(
            metrics.get(k, {}).get("seconds", 0)
            for k in ("prune", "add", "cognify", "search")
            if isinstance(metrics.get(k), dict)
        )
        metrics["total_seconds"] = round(total_s, 3)
        LOG.info("[total] %.2fs (prune+add+cognify+search)", metrics["total_seconds"])
        (run_dir / "ingest_metrics.json").write_text(
            json.dumps(metrics, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
        (run_dir / "resolved_config.json").write_text(
            json.dumps({
                "run_id": run_id,
                "resolved_at": metrics["finished_at"],
                "preset": public_preset(preset),
                "corpus": summary,
                "cognify_kwargs": {
                    k: (v.__name__ if isinstance(v, type) else v)
                    for k, v in build_cognify_kwargs(preset).items()
                },
                "cognee_version": metrics["cognee_version"],
                "env": metrics["env"],
                "llm_keys": metrics["llm_keys"],
                "timings_seconds": {k: metrics.get(k, {}).get("seconds")
                                    for k in ("prune", "add", "cognify", "search")
                                    if isinstance(metrics.get(k), dict)},
            }, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
        LOG.info("=== Run %s DONE | log=%s ===", run_id, log_path)
        return metrics
    finally:
        guard.stop()
        try:
            lock_path.unlink(missing_ok=True)
        except OSError:
            pass


def main(argv: list[str] | None = None) -> int:
    from skilltree.ingest.presets import load_preset

    parser = argparse.ArgumentParser(description="Build Memory cognee từ Corpus theo preset")
    parser.add_argument("--preset", required=True, help="tên preset (configs/presets/) hoặc path")
    parser.add_argument("--run-id", default=None, help="id Run (mặc định: run_id trong preset)")
    parser.add_argument("--skip-search", action="store_true", help="bỏ qua truy vấn kiểm chứng")
    args = parser.parse_args(argv)

    preset = load_preset(args.preset)
    run_id = args.run_id or preset.get("run_id") or f"run-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    metrics = asyncio.run(run_build(preset, run_id, run_search=not args.skip_search))
    print(json.dumps({k: metrics.get(k) for k in ("run_id", "total_seconds", "graph")},
                     ensure_ascii=False, default=str))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
