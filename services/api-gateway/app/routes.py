"""Reverse proxy + rate limiting + optional static-token auth.

Routing contract: `/{prefix}/{rest}` forwards to `{upstream_base_url}/{rest}`
where the upstream itself serves under `/api/v1`. Example:
`GET /case/documents` → `GET http://opencase:8101/api/v1/documents`.

(The gateway is the ONE entry point exempted from the `/api/v1` prefix rule —
see docs/MODULES.md principle 3.)
"""

import asyncio
import time

import httpx
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, StreamingResponse

from . import config

router = APIRouter()

# ---------------------------------------------------------------------------
# rate limiting: token bucket per client IP (in-memory, dev-grade)
# ---------------------------------------------------------------------------

_buckets: dict[str, tuple[float, float]] = {}  # ip -> (tokens, last_ts)
_lock = asyncio.Lock()


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def check_rate_limit(request: Request) -> bool:
    capacity = float(config.RATE_LIMIT_PER_MINUTE)
    rate = capacity / 60.0  # tokens per second
    ip = _client_ip(request)
    async with _lock:
        now = time.monotonic()
        tokens, last = _buckets.get(ip, (capacity, now))
        tokens = min(capacity, tokens + (now - last) * rate)
        if tokens < 1.0:
            _buckets[ip] = (tokens, now)
            return False
        _buckets[ip] = (tokens - 1.0, now)
        return True


def error(status: int, code: str, message: str, **details) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={"error": {"code": code, "message": message, "details": details}},
    )


def _auth_ok(request: Request) -> bool:
    if not config.AUTH_TOKEN:
        return True
    header = request.headers.get("authorization", "")
    return header == f"Bearer {config.AUTH_TOKEN}"


# ---------------------------------------------------------------------------
# proxying
# ---------------------------------------------------------------------------

HOP_BY_HOP = {
    "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
    "te", "trailers", "transfer-encoding", "upgrade", "host", "content-length",
}


async def forward(request: Request, prefix: str, rest: str):
    if not await check_rate_limit(request):
        return error(429, "RATE_LIMITED", "Too many requests, slow down",
                     limitPerMinute=config.RATE_LIMIT_PER_MINUTE)
    if not _auth_ok(request):
        return error(401, "UNAUTHORIZED", "Missing or invalid bearer token")

    upstream = config.upstream_base_url(prefix)
    url = f"{upstream}/api/v1/{rest}"  # services serve their APIs under /api/v1
    headers = {k: v for k, v in request.headers.items() if k.lower() not in HOP_BY_HOP}

    client: httpx.AsyncClient = request.app.state.upstream_client
    try:
        upstream_resp = await client.request(
            request.method, url, headers=headers,
            content=await request.body(),
            params=request.query_params,
            timeout=config.TIMEOUT_SECONDS,
        )
    except httpx.HTTPError as exc:
        return error(502, "UPSTREAM_UNAVAILABLE",
                     f"Upstream {prefix} unreachable: {exc}")

    resp_headers = {k: v for k, v in upstream_resp.headers.items()
                    if k.lower() not in HOP_BY_HOP}
    return StreamingResponse(
        upstream_resp.aiter_bytes(),
        status_code=upstream_resp.status_code,
        headers=resp_headers,
        media_type=upstream_resp.headers.get("content-type"),
    )


@router.get("/health")
async def health():
    return {"status": "ok", "service": config.SERVICE_NAME, "version": config.SERVICE_VERSION}


@router.get("/api/v1/routes")
async def route_table():
    """Route table — where each gateway prefix leads."""
    return {
        "prefixes": {
            prefix: {
                "upstream": config.upstream_base_url(prefix),
                "example": f"/{prefix}/api-v1-path → {{upstream}}/api-v1-path",
            }
            for prefix in config.UPSTREAMS
        },
        "notes": "Gateway path = /{prefix}/{rest}; rest is forwarded verbatim "
                 "(services serve their APIs under /api/v1/...).",
    }
