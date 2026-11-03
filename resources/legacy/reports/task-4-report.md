# Task #4 Report — M10 api-gateway (routing + rate-limit + auth hook)

**Status:** DONE · **Main:** see commits below

## What was built

`services/api-gateway/` (port **8000**, stateless — no DB) — the single entry point:

- **Routing**: `/{prefix}/{rest}` → `{upstream}/api/v1/{rest}` for 7 prefixes
  (`case, quiz, class, events, learner, assignments, documents`); live table at
  `GET /api/v1/routes`. Bodies, methods, query strings and headers stream through
  (hop-by-hop headers stripped both ways).
- **Rate limiting**: in-memory token bucket per client IP
  (`GATEWAY_RATE_LIMIT` req/min) → `429 RATE_LIMITED` envelope.
- **Auth hook**: optional static bearer (`GATEWAY_AUTH_TOKEN`) on proxied routes —
  `401 UNAUTHORIZED` envelope; `/health` + `/api/v1/routes` exempt. M11 JWT
  verification is the designated successor.
- **Resilience semantics**: upstream down/timeout → `502 UPSTREAM_UNAVAILABLE`;
  unknown prefix → 404; validation → 422, all in the platform error envelope.
- Standards: `GET /health` → `{status, service, version}`; gateway exempted from the
  `/api/v1` prefix rule per docs/MODULES.md principle 3.

## Commits

- `feat(platform): add api-gateway (M10) …` — 12 files (fast-forward merged to main
  via the GitHub Git Data API; author
  `Nguyễn Việt Huy <Stellarhold170NT@users.noreply.github.com>`).

## Tests

```
docker run --rm -v /workspace:/code -w /code/services/api-gateway py-test pytest -q
→ 10 passed (path/method/body/query forwarding, all prefixes, 404, 502 with a dead
  transport, rate limit 429, auth hook on/off, health exemption)
```

Upstream faked with `httpx.MockTransport` (echo handler); the 502 case uses a
transport whose handler raises `httpx.ConnectError`.

## Docs / deploy integration

- `deploy/docker-compose.yml`: `api-gateway` (8000, `platform-net` only, all
  `*_BASE_URL` wired to service names); `.env.example` gains `GATEWAY_PORT`,
  `GATEWAY_RATE_LIMIT`.
- `services/README.md` + `docs/deployment.md` + `docs/MODULES.md` updated (M10 ✅).

## Concerns

- In-memory rate limiting is per-process (fine for one replica; Redis bucket listed
  in the roadmap). JWT verification is delegated to M11 next.
