# Report — Task `skilltree-v1--c_student_ui--ec90537a` (c_student_ui)

**Kết luận: DONE** — plugin `skilltree-student-ui` hoàn chỉnh, test xanh toàn
bộ, đã push lên branch `agent-v1-student-ui` và xác minh trên GitHub.

## Đã làm

- Plugin UI học sinh `services/skill-tree-service/plugins/skilltree-student-ui/`:
  - `package.json` — dsh client platform `web`, inject
    `@deepseek-ai/dsh-client-ui-slots`, exports `.` → `lib/index.js`,
    `./client` → `client/client.js`.
  - `lib/index.js` (host, ~21 KB) — 6 route same-origin:
    `GET /skilltree-student/config`, `POST …/batch` (fan-out GET-only,
    allow-list `class, learner, case, quiz, rag`, tối đa 8 call,
    `Authorization` chuyển nguyên vẹn), `POST …/quiz-submit` → M2
    `POST /quiz/attempts/bulk` (candidateId UUID, 1..50 responses, choice id
    `[A-Za-z0-9_-]{1,64}`), `POST …/mastery-update` → M5
    `POST /learner/students/{id}/update/bulk` (conceptUri http(s), occurredAt
    ISO-8601), `POST …/rag-upload` → rag-service `POST /documents/upload`
    (multipart passthrough giữ nguyên bytes + boundary, cap
    `SKILLTREE_STUDENT_RAG_UPLOAD_MB` mặc định 20 MB → 413, timeout 30 s),
    `POST …/rag-ask` → rag `POST /ask` (question 1..2000, mode
    answer/retrieve, topK 1..10). JSON cap 16 KiB, chặn cross-origin POST
    (403), chặn `..` trong path, gateway base đọc env từng request.
  - `client/client.js` (client, ~43 KB) — slot `shell.overlay` order 57,
    FAB "🎒 Học sinh" + 4 tab một mục đích:
    **Tổng quan** (M6 `users/{id}`, `users/{id}/classes` + M1 documents/graph
    linearize Kahn + state `done/next/learning/locked/ready` từ M5 mastery,
    badge "Học ngay" cho next-concept, % mastery từng node),
    **Tài liệu** (upload FormData → rag, progress bar 6 bước
    queued→received→parsed→chunked→mirrored→ready, poll 1.5 s qua batch,
    hỏi đáp kèm trích dẫn `sectionPath.join(" › ")`),
    **Kiểm tra nhanh** (M2 items theo conceptUri → nộp `attempts/bulk` → cập
    nhật M5 `update/bulk`, dòng kết quả + copy khích lệ),
    **Cài đặt** (sourcedId M6, gateway override, thông tin tài khoản JWT).
    M2 `correctResponse` KHÔNG BAO GIỜ render cho học sinh (assert trong test
    C9b). Token DESIGN.md (xanh lá #27A95F, ink #1C3632, heading Georgia),
    anti-slop: flat, không gradient/glass, radius 4/8/12/999, cặp màu AA.
  - `README.md` — EGM chuẩn: vai trò, INPUT/OUTPUT, env var, wiring 2 bước,
    lệnh chạy/test, phụ thuộc, giới hạn V1.
- Wiring: thêm row bare-name `skilltree-student-ui` vào **cả**
  `plugins/patch.yml` (docker) và `plugins/patch.local.yml` (local Windows),
  giữ 2 file đồng bộ.
- OpenSpec: `openspec/changes/add-skilltree-student-ui/` đầy đủ
  `proposal.md`, `design.md`, `specs/student-ui/spec.md` (5 Requirement /
  11 Scenario WHEN-THEN), `tasks.md` (đã tick hết).

## Bằng chứng (TDD)

`node --check` sạch cho cả 4 file JS. Hai suite không phụ thuộc (Node ≥ 18,
socket thật 127.0.0.1):

```
$ node tests/smoke.mjs        # host half — 19/19 PASS
PASS T1 config exposes prefixes + upload cap
PASS T2 batch overview 6 calls, wire paths + JWT forwarded
PASS T3 batch disallowed prefix → INVALID_CALL
PASS T4 batch path with .. → INVALID_CALL
PASS T5 quiz-submit → POST /quiz/attempts/bulk, shape + JWT
PASS T6 quiz-submit invalid candidateId → 400, no upstream
PASS T7 mastery-update → POST /learner/students/{id}/update/bulk
PASS T8 mastery-update invalid conceptUri → 400, no upstream
PASS T9 rag-ask → POST /rag/ask, question + top_k + document_ids
PASS T10 rag-ask empty question → 400, no upstream
PASS T11 rag-upload passthrough keeps bytes + boundary + JWT
PASS T12 rag-upload 2MB with 1MB cap → 413
PASS T13 cross-origin POST → 403 UNTRUSTED_ORIGIN
PASS T14 GET on POST route → 405
PASS T15 batch dead gateway → per-call 502
PASS U1..U4 (validateBatchCall, quiz/mastery/ask builders)
ALL SMOKE CHECKS PASSED

$ node tests/client.mjs       # client half, fake browser — 24/24 PASS
PASS C1 linearize topo order + cycle fallback (z,a,b,c)
PASS C2 nodeState priority
PASS C3 buildOverviewCalls shape
PASS C4 buildQuizItemsCall encodes + caps
PASS C5 M2/M5 body builders
PASS C6 citationPath
PASS C7 progressSteps mapping
PASS C8-pre/a/b/c/d panel FAB → batch 6 calls + JWT → classes + spine + "Học ngay" + settings persist
PASS C9a..e node click → items (không lộ đáp án) → chọn → Nộp bài
      → body M2 {candidateId, responses[]} + M5 {studentId, responses[]} + dòng kết quả
PASS C10a/b Hỏi → rag-ask {question, mode:answer} → câu trả lời + trích dẫn "Chương 1 › Hàm số"
PASS C11a..d Nạp tài liệu → FormData (title/uploaderId) → progress "Đang chờ"
      → poll batch rag jobs/j1 → "Tài liệu đã sẵn sàng"
ALL CLIENT CHECKS PASSED
```

Quá trình TDD có thật: suite bắt đỏ trước khi xanh — ví dụ T5 (JSON body
không được capture ở fake gateway) phát hiện lỗi harness test; C7 phát hiện
bug thật `progressSteps` hiển thị bước "ready" đang chạy thay vì hoàn tất
(đã sửa `client/client.js`); U4 phát hiện builder không chuẩn hóa trailing
slash của base URL (đã sửa `lib/index.js`).

OpenSpec validate: `npx @fission-ai/openspec validate
add-skilltree-student-ui --strict` → `Change 'add-skilltree-student-ui' is
valid`.

## Git

- Commit: `0df1664` `feat: [STUD-61007] add skilltree-student-ui plugin
  (classes + roadmap + rag docs + quiz UI)` — scopes:
  skill-tree-service,plugins; author `Nguyễn Việt Huy
  <Stellarhold170NT@users.noreply.github.com>`; parent `49c0ee2` (main).
- Branch đã lên GitHub (API xác minh):
  https://github.com/Stellarhold170NT/skill-tree/tree/agent-v1-student-ui
- PR: môi trường agent không có token GitHub API → mở PR bằng link compare
  (1 cú click "Create pull request"):
  https://github.com/Stellarhold170NT/skill-tree/compare/main...agent-v1-student-ui?expand=1

## Anti-slop self-check (theo anti-slop-catalog)

- Không gradient tím-xanh, không glassmorphism, không glow — chỉ surface phẳng
  + border hairline `#D4D8D6`. ✅
- Không Inter/Geist — `system-ui` stack cho body, Georgia serif cho tiêu đề
  phía học sinh. ✅
- Contrast AA: boot #167F4D + trắng 5.03:1; muted #6B7280 trên trắng 4.83:1;
  danger #B3261E 6.54:1; warn #8A4B00 6.80:1. ✅
- Không card lồng nhiều lớp; mỗi tab một mục đích; tone ấm "feels like a
  bookshop" (copy khích lệ tiếng Việt). ✅
- Chỉ dùng token DESIGN.md (kể cả màu dot mastery amber/red là màu có chủ đích
  trong bảng semantics, không màu tự chế ngoài hệ thống). ✅

## Chưa làm / lưu ý

- **PR chưa mở** (không có token API trong môi trường agent) — dùng compare
  link ở trên; mọi nội dung đã trên branch.
- Route upload multipart không nhận `__baseUrl` override của client (body là
  FormData) — gateway lấy từ env `SKILLTREE_GATEWAY_URL`; đã ghi rõ trong
  README (giới hạn V1, có chủ đích).
- Học sinh tự nhập sourcedId lần đầu (V1 chưa có UI map định danh) — đúng
  phạm vi brief.
- Sandbox trải nghiệm 24h + cloudflared tunnel + e2e qua SDK harness là đầu
  việc của node triển khai/release theo AGENTS.md §8, không thuộc brief này.
