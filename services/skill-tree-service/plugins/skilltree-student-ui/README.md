# skilltree-student-ui

Student-facing plugin UI for SkillTree V1 (DSH harness, skill-tree-service M4).
One additive `shell.overlay` entry (order 57) — a floating "🎒 Học sinh" button
opening a warm, student-first dashboard with four single-purpose screens:

| Tab | Purpose | Platform flow |
|---|---|---|
| **Tổng quan** | "Lớp của tôi + Lộ trình của tôi" — classes by sourcedId, concept graph as a readable spine with mastery states and the next-concept highlight ("Học ngay") | M6 `GET /users/{id}`, `GET /users/{id}/classes` · M1 `GET /documents`, `GET /documents/{id}/graph` · M5 `GET /students/{id}/mastery`, `GET /students/{id}/next` |
| **Tài liệu** | Notebook-style study material: upload → ingest progress → Q&A with section-path citations | rag-service `POST /documents/upload`, `GET /jobs/{id}`, `GET /documents`, `POST /ask` |
| **Kiểm tra nhanh** | Quick quiz per concept; results push back to the learner model | M2 `GET /items?conceptUri=`, `POST /attempts/bulk` · M5 `POST /students/{id}/update/bulk` |
| **Cài đặt** | Student sourcedId (M6 pseudonym), optional gateway override, account info | localStorage only |

Design follows `DESIGN.md` (SkillTree brand tokens: leaf green `#27A95F`,
deep teal ink `#1C3632`, Georgia serif headings for student-facing titles) and
the anti-slop catalog: flat surfaces, no gradients/glass, AA contrast, radius
4/8/12/999, encouraging tone ("feels like a bookshop"), one purpose per screen.

## Role

Read-mostly student surface + three safe write actions. The page **never**
addresses services directly: every call goes through this plugin's host routes,
which enforce allow-listed prefixes, same-origin, JWT forwarding, and payload
validation before touching the api-gateway (M10) or rag-service.

## INPUT (what the plugin consumes)

- **From the harness**: `webServer` service (host half) and the `shell.overlay`
  slot (client half). No other DSH capabilities.
- **From the browser (student)**: the JWT issued by `skilltree-auth-ui`,
  read from `localStorage["skilltree.auth.v1"]` (`{accessToken, user}`) and
  forwarded as `Authorization: Bearer …` on every request. Student identity is
  the M6 `sourcedId` (pseudonymous), typed once in Cài đặt and persisted in
  `localStorage["skilltree.studentui.settings"]`.
- **From upstreams** (via gateway): M6/M1/M5/M2 JSON contracts above plus
  rag-service `202 {jobId, statusUrl, docId}` / job status / citations.

## OUTPUT (what the plugin serves)

Host half (`lib/index.js`, all same-origin POST/GET, 16 KiB JSON cap):

| Route | Upstream | Notes |
|---|---|---|
| `GET /skilltree-student/config` | — | `{gatewayBaseUrl, prefixes, uploadLimitMb}` for the client |
| `POST /skilltree-student/batch` | M10 gateway `/api/v1/{prefix}/{path}` | GET-only fan-out (max 8 calls), allow-list `class, learner, case, quiz, rag`; per-call `{id, ok, status, data\|error}` |
| `POST /skilltree-student/quiz-submit` | M2 `POST /quiz/attempts/bulk` | validates candidateId UUID, 1..50 responses, choice ids `[A-Za-z0-9_-]{1,64}` |
| `POST /skilltree-student/mastery-update` | M5 `POST /learner/students/{id}/update/bulk` | validates conceptUri http(s), isCorrect boolean, optional ISO-8601 occurredAt |
| `POST /skilltree-student/rag-upload` | rag-service `POST /documents/upload` | multipart passthrough (bytes + boundary kept), size cap → 413, 30 s timeout |
| `POST /skilltree-student/rag-ask` | rag-service `POST /ask` | question 1..2000 chars, mode `answer\|retrieve`, topK 1..10, ≤10 document ids |

Client half (`client/client.js`): slot `shell.overlay` order 57 (between
class-ui 55/teacher-ui 56 and auth-ui 65), pure helpers exported for tests.

**Deliberately NOT rendered**: M2 `correctResponse` (answer key) is never shown
to students — the quiz UI marks only right/wrong after submission.

## Environment variables (host half)

| Var | Default | Purpose |
|---|---|---|
| `SKILLTREE_GATEWAY_URL` | `http://localhost:8000` | Base URL of the api-gateway (M10). Re-read per request (12-factor). JSON routes also accept a `__baseUrl` override from the client (Cài đặt tab); the multipart upload route uses the env value only. |
| `SKILLTREE_STUDENT_RAG_UPLOAD_MB` | `20` | Upload size cap in MiB; larger bodies are rejected with 413 before any upstream call. |

## Wiring (2 steps)

1. Add one bare-name row to `services/skill-tree-service/plugins/patch.yml`
   (docker image) **and** `patch.local.yml` (local run) — keep both in sync:

   ```yaml
   - id: skilltree-student-ui
     name: 'skilltree-student-ui'
   ```

2. Restart skill-tree-service (M4). The plugin registers its routes and the
   overlay entry automatically.

## Run / test

```bash
cd services/skill-tree-service/plugins/skilltree-student-ui

node --check lib/index.js && node --check client/client.js   # syntax
node tests/smoke.mjs      # host-half: 19 checks (T1–T15 routes, U1–U4 builders)
node tests/client.mjs     # client-half: 24 checks (C1–C11 behavior, fake browser)
```

Both suites are dependency-free (Node ≥ 18) and start real HTTP listeners on
127.0.0.1 (9411/9412) — no services, no gateway, no database required.

## Dependencies

- **Runtime**: `skilltree-auth-ui` (JWT in localStorage — without it the UI
  works read-only and write actions fail 401 upstream), api-gateway M10 with
  M1/M2/M5/M6 upstreams, **rag-service** (branch `agent-v1-rag-service`) for
  the Tài liệu tab — without rag the upload/ask screens show upstream errors,
  everything else keeps working.
- **Wiring**: entry in `patch.yml` + `patch.local.yml` (this repo).
- **Contract notes**: candidateId = M6 `sourcedId` (pseudonym, no real names);
  M5 next-concept and mastery drive the spine highlight; rag job statuses
  `queued→received→parsed→chunked→mirrored→ready|failed` map to student-facing
  progress labels.

## Known V1 limitations

- Quiz `correctResponse` is fetched (needed for scoring upstream-side) but is
  never rendered; do not add it to student views.
- The student must paste their sourcedId once (V1 has no identity mapping UI);
  upload route always uses the env-configured gateway (no per-student override
  for multipart).
