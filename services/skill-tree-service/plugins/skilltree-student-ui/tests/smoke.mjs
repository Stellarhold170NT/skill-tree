/**
 * skilltree-student-ui — host-half smoke test (Node ≥ 18, no dependencies).
 *
 * Verifies the real proxy behavior of lib/index.js against a fake harness
 * webServer + a fake M10 gateway (canned M1/M2/M5/M6/rag responses):
 *   T1  GET  /skilltree-student/config → gatewayBaseUrl + prefixes + uploadLimitMb
 *   T2  POST /skilltree-student/batch → 6 calls pass through, wire paths + Authorization verified
 *   T3  batch disallowed prefix → INVALID_CALL
 *   T4  batch path with '..' → INVALID_CALL
 *   T5  POST /skilltree-student/quiz-submit → M2 POST /quiz/attempts/bulk, body shape, token
 *   T6  quiz-submit invalid candidateId → 400, no upstream call
 *   T7  POST /skilltree-student/mastery-update → M5 POST /learner/students/{id}/update/bulk
 *   T8  mastery-update invalid conceptUri → 400, no upstream call
 *   T9  POST /skilltree-student/rag-ask → rag POST /rag/ask, question + mode + top_k
 *   T10 rag-ask empty question → 400, no upstream call
 *   T11 POST /skilltree-student/rag-upload → multipart passthrough (bytes + boundary kept);
 *       the route has no JSON body to carry __baseUrl, so the test points
 *       SKILLTREE_GATEWAY_URL at the fake gateway for its duration (env is
 *       re-read per call — 12-factor behavior, also verified here)
 *   T12 rag-upload over the 1MB cap (env SKILLTREE_STUDENT_RAG_UPLOAD_MB=1) → 413
 *   T13 cross-origin POST → 403 UNTRUSTED_ORIGIN
 *   T14 GET on a POST route → 405
 *   T15 batch against dead default gateway → per-call 502 UPSTREAM_UNAVAILABLE
 *   U1..U4 unit: validateBatchCall, quiz/mastery/ask request builders
 *
 * Run:  node tests/smoke.mjs   (from the plugin directory)
 */
import http from 'node:http'

// Deterministic "default gateway": dead port so T15 never depends on :8000.
process.env.SKILLTREE_GATEWAY_URL = 'http://127.0.0.1:9'

const PORT_PROXY = 9411
const PORT_UPSTREAM = 9412
const SID = '11111111-2222-3333-4444-555555555555'
const DOC1 = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
const ITEM1 = 'c1111111-2222-3333-4444-555555555555'
const RAG_DOC = 'dddddddd-0000-0000-0000-000000000001'
const CONCEPT1 = 'https://case.example/cfitems/concept-func'
const CONCEPT2 = 'https://case.example/cfitems/concept-graph'

let failures = 0
function check(label, condition, detail) {
  if (condition) console.log('PASS', label, detail ? '(' + detail + ')' : '')
  else { failures += 1; console.log('FAIL', label, detail ? '(' + detail + ')' : '') }
}

const settle = async () => { for (let i = 0; i < 6; i += 1) await new Promise((r) => setTimeout(r, 0)) }

// --- fake harness webServer: collect routes, serve them ---
const routes = new Map()
const ctx = { webServer: { register: (route) => routes.set(route.path, route.handler) } }
const plugin = await import(new URL('../lib/index.js', import.meta.url))
plugin.apply(ctx)
console.log('PLUGIN', plugin.name, 'routes:', [...routes.keys()].sort().join(', '))

const proxy = http.createServer(async (req, res) => {
  const handler = routes.get(req.url.split('?')[0])
  if (!handler) { res.writeHead(404); res.end(); return }
  await handler(req, res)
})
await new Promise((resolve) => proxy.listen(PORT_PROXY, resolve))
const ORIGIN = 'http://127.0.0.1:' + PORT_PROXY

// --- fake gateway (canned platform responses) ---
const seen = { paths: [], methods: [], auths: [], bodies: [], contentTypes: [], rawBodies: [] }
const upstream = http.createServer(async (req, res) => {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks)
  seen.paths.push(req.url)
  seen.methods.push(req.method)
  seen.auths.push(req.headers.authorization || null)
  seen.contentTypes.push(req.headers['content-type'] || null)
  seen.rawBodies.push(raw)
  seen.bodies.push(raw.toString('utf8'))
  const send = (status, data) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(data)) }

  if (req.method === 'GET' && req.url === '/class/users/' + SID) {
    return send(200, { sourcedId: SID, displayName: 'Nguyễn Văn A', role: 'student' })
  }
  if (req.method === 'GET' && req.url === '/class/users/' + SID + '/classes') {
    return send(200, [{ sourcedId: 'cc000000-0000-0000-0000-000000000001', title: 'Toán 10A1', term: 'HK1' }])
  }
  if (req.method === 'GET' && req.url === '/case/documents?limit=200') {
    return send(200, [{ sourcedId: DOC1, title: 'Toán 10' }])
  }
  if (req.method === 'GET' && req.url === '/case/documents/' + DOC1 + '/graph') {
    return send(200, {
      nodes: [
        { id: 'n1', identifier: CONCEPT1, fullStatement: 'Hàm số bậc nhất', humanCodingScheme: 'C1' },
        { id: 'n2', identifier: CONCEPT2, fullStatement: 'Hàm số bậc hai', humanCodingScheme: 'C2' },
      ],
      edges: [{ source: 'n1', target: 'n2', type: 'isPrerequisiteOf', sourceIdentifier: CONCEPT1, targetIdentifier: CONCEPT2 }],
    })
  }
  if (req.method === 'GET' && req.url === '/learner/students/' + SID + '/mastery') {
    return send(200, [{ conceptUri: CONCEPT1, mastery: 0.9, state: 'green', reviewCount: 2 }])
  }
  if (req.method === 'GET' && req.url === '/learner/students/' + SID + '/next?documentId=' + DOC1) {
    return send(200, { studentId: SID, documentId: DOC1, conceptUri: CONCEPT2, explanation: 'Ready to learn next.' })
  }
  if (req.method === 'POST' && req.url === '/quiz/attempts/bulk') {
    return send(200, { scored: 1, correct: 1, ratio: 1.0, attempts: [{ itemId: ITEM1, isCorrect: true, score: 1.0 }] })
  }
  if (req.method === 'POST' && req.url === '/learner/students/' + SID + '/update/bulk') {
    return send(200, { updated: 1, mastery: [{ conceptUri: CONCEPT1, mastery: 0.95, state: 'green' }] })
  }
  if (req.method === 'POST' && req.url === '/rag/ask') {
    return send(200, {
      mode: 'answer', question: 'Hàm số bậc nhất là gì?',
      answer: 'Hàm số bậc nhất có dạng y = ax + b.',
      timings: { retrieveMs: 2.1 },
      citations: [{ chunkId: 'ch1', documentId: 'd1', sectionPath: ['Chương 1', 'Hàm số'], heading: 'Hàm số', snippet: 'y = ax + b với a khác 0.', score: 0.87 }],
    })
  }
  if (req.method === 'POST' && req.url === '/rag/documents/upload') {
    return send(202, { jobId: 'j0000000-0000-0000-0000-000000000001', statusUrl: '/api/v1/jobs/j1', docId: 'd1' })
  }
  if (req.method === 'GET' && req.url === '/rag/jobs/j0000000-0000-0000-0000-000000000001') {
    return send(200, { jobId: 'j0000000-0000-0000-0000-000000000001', status: 'ready', docId: 'd1', stageMs: { parseMs: 1.1 } })
  }
  if (req.method === 'GET' && req.url === '/rag/documents?uploaderId=' + encodeURIComponent(SID)) {
    return send(200, [{ id: 'd1', title: 'Toán 10 — Chương 1' }])
  }
  return send(404, { error: { code: 'NOT_FOUND', message: req.url, details: {} } })
})
await new Promise((resolve) => upstream.listen(PORT_UPSTREAM, resolve))
const GW = 'http://127.0.0.1:' + PORT_UPSTREAM

const postJson = async (path, body, headers) => {
  const res = await fetch(ORIGIN + path, {
    method: 'POST',
    headers: Object.assign({ 'content-type': 'application/json', origin: ORIGIN, host: new URL(ORIGIN).host }, headers || {}),
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  return { status: res.status, data }
}

const OVERVIEW_CALLS = [
  { id: 'user', prefix: 'class', path: 'users/' + SID },
  { id: 'classes', prefix: 'class', path: 'users/' + SID + '/classes' },
  { id: 'subjects', prefix: 'case', path: 'documents', query: 'limit=200' },
  { id: 'graph', prefix: 'case', path: 'documents/' + DOC1 + '/graph' },
  { id: 'mastery', prefix: 'learner', path: 'students/' + SID + '/mastery' },
  { id: 'next', prefix: 'learner', path: 'students/' + SID + '/next', query: 'documentId=' + DOC1 },
]

// ---------- route tests ----------

// T1 config
{
  const res = await fetch(ORIGIN + '/skilltree-student/config')
  const data = await res.json()
  check('T1 config exposes prefixes + upload cap', res.status === 200 && data.gatewayBaseUrl === 'http://127.0.0.1:9'
    && Array.isArray(data.prefixes) && data.prefixes.join(',') === 'class,learner,case,quiz,rag' && data.uploadLimitMb === 20,
    JSON.stringify(data))
}

// T2 batch overview fan-out
{
  const before = seen.paths.length
  const { status, data } = await postJson('/skilltree-student/batch', { calls: OVERVIEW_CALLS, __baseUrl: GW }, { authorization: 'Bearer jwt-s' })
  const ok = status === 200 && data.ok === true && data.results.length === 6
    && data.results.every((r) => r.ok === true)
    && seen.paths.slice(before).includes('/learner/students/' + SID + '/next?documentId=' + DOC1)
    && seen.auths.slice(before).every((a) => a === 'Bearer jwt-s')
  check('T2 batch overview 6 calls, wire paths + JWT forwarded', ok, JSON.stringify(data.results && data.results.map((r) => [r.id, r.ok])))
}

// T3 disallowed prefix
{
  const before = seen.paths.length
  const { status, data } = await postJson('/skilltree-student/batch', { calls: [{ id: 'x', prefix: 'documents', path: 'documents' }], __baseUrl: GW })
  check('T3 batch disallowed prefix → INVALID_CALL', status === 200 && data.ok === true && data.results[0].ok === false
    && /prefix not allowed/.test(data.results[0].error) && seen.paths.length === before, JSON.stringify(data.results))
}

// T4 path traversal
{
  const { status, data } = await postJson('/skilltree-student/batch', { calls: [{ id: 'x', prefix: 'class', path: 'users/../secret' }], __baseUrl: GW })
  check('T4 batch path with .. → INVALID_CALL', status === 200 && data.ok === true && data.results[0].ok === false
    && /invalid resource path/.test(data.results[0].error), JSON.stringify(data.results))
}

// T5 quiz-submit happy path
{
  const before = seen.paths.length
  const { status, data } = await postJson('/skilltree-student/quiz-submit', {
    candidateId: SID, responses: [{ itemId: ITEM1, response: ['cA'] }], __baseUrl: GW,
  }, { authorization: 'Bearer jwt-q' })
  const upstreamBody = JSON.parse(seen.bodies[before] || 'null')
  check('T5 quiz-submit → POST /quiz/attempts/bulk, shape + JWT',
    status === 200 && data.ok === true && data.data.scored === 1
    && seen.paths[before] === '/quiz/attempts/bulk' && seen.methods[before] === 'POST'
    && upstreamBody && upstreamBody.candidateId === SID && Array.isArray(upstreamBody.responses)
    && seen.auths[before] === 'Bearer jwt-q', JSON.stringify(data))
}

// T6 quiz-submit invalid candidateId
{
  const before = seen.paths.length
  const { status, data } = await postJson('/skilltree-student/quiz-submit', { candidateId: 'not-a-uuid', responses: [{ itemId: ITEM1, response: ['cA'] }], __baseUrl: GW })
  check('T6 quiz-submit invalid candidateId → 400, no upstream', status === 400 && data.ok === false
    && /candidateId/.test(data.error) && seen.paths.length === before, JSON.stringify(data))
}

// T7 mastery-update happy path
{
  const before = seen.paths.length
  const { status, data } = await postJson('/skilltree-student/mastery-update', {
    studentId: SID, responses: [{ conceptUri: CONCEPT1, isCorrect: true }], __baseUrl: GW,
  }, { authorization: 'Bearer jwt-m' })
  const upstreamBody = JSON.parse(seen.bodies[before] || 'null')
  check('T7 mastery-update → POST /learner/students/{id}/update/bulk',
    status === 200 && data.ok === true && data.data.updated === 1
    && seen.paths[before] === '/learner/students/' + SID + '/update/bulk'
    && upstreamBody && upstreamBody.responses[0].conceptUri === CONCEPT1 && upstreamBody.responses[0].isCorrect === true
    && seen.auths[before] === 'Bearer jwt-m', JSON.stringify(data))
}

// T8 mastery-update invalid conceptUri
{
  const before = seen.paths.length
  const { status, data } = await postJson('/skilltree-student/mastery-update', { studentId: SID, responses: [{ conceptUri: 'no-uri', isCorrect: true }], __baseUrl: GW })
  check('T8 mastery-update invalid conceptUri → 400, no upstream', status === 400 && data.ok === false
    && /conceptUri/.test(data.error) && seen.paths.length === before, JSON.stringify(data))
}

// T9 rag-ask happy path
{
  const before = seen.paths.length
  const { status, data } = await postJson('/skilltree-student/rag-ask', {
    question: 'Hàm số bậc nhất là gì?', mode: 'answer', topK: 5, documentIds: [RAG_DOC], __baseUrl: GW,
  }, { authorization: 'Bearer jwt-r' })
  const upstreamBody = JSON.parse(seen.bodies[before] || 'null')
  check('T9 rag-ask → POST /rag/ask, question + top_k + document_ids',
    status === 200 && data.ok === true && data.data.mode === 'answer' && Array.isArray(data.data.citations)
    && data.data.citations[0].sectionPath.join(' › ') === 'Chương 1 › Hàm số'
    && seen.paths[before] === '/rag/ask' && upstreamBody && upstreamBody.top_k === 5 && upstreamBody.document_ids[0] === RAG_DOC
    && seen.auths[before] === 'Bearer jwt-r', JSON.stringify(data))
}

// T10 rag-ask empty question
{
  const before = seen.paths.length
  const { status, data } = await postJson('/skilltree-student/rag-ask', { question: '   ', __baseUrl: GW })
  check('T10 rag-ask empty question → 400, no upstream', status === 400 && data.ok === false
    && /question/.test(data.error) && seen.paths.length === before, JSON.stringify(data))
}

// T11 rag-upload multipart passthrough (gateway base from env — re-read per call)
{
  process.env.SKILLTREE_GATEWAY_URL = GW
  const before = seen.paths.length
  const boundary = '----stuBoundary7d1'
  const payload = [
    '--' + boundary,
    'Content-Disposition: form-data; name="file"; filename="on-tap.md"',
    'Content-Type: text/markdown',
    '',
    '# Chương 1 — Hàm số',
    'Hàm số bậc nhất y = ax + b.',
    '--' + boundary,
    'Content-Disposition: form-data; name="title"',
    '',
    'Toán 10 — Chương 1',
    '--' + boundary,
    'Content-Disposition: form-data; name="uploaderId"',
    '',
    SID,
    '--' + boundary + '--',
    '',
  ].join('\r\n')
  const body = Buffer.from(payload, 'utf8')
  const res = await fetch(ORIGIN + '/skilltree-student/rag-upload', {
    method: 'POST',
    headers: { 'content-type': 'multipart/form-data; boundary=' + boundary, origin: ORIGIN, authorization: 'Bearer jwt-u', host: new URL(ORIGIN).host },
    body,
  })
  const data = await res.json().catch(() => null)
  const sent = seen.rawBodies[before]
  check('T11 rag-upload passthrough keeps bytes + boundary + JWT',
    res.status === 200 && data && data.ok === true && data.data.docId === 'd1'
    && seen.paths[before] === '/rag/documents/upload'
    && seen.contentTypes[before] === 'multipart/form-data; boundary=' + boundary
    && sent && sent.equals(body) && seen.auths[before] === 'Bearer jwt-u',
    JSON.stringify(data))
  process.env.SKILLTREE_GATEWAY_URL = 'http://127.0.0.1:9'
}

// T13 cross-origin POST
{
  const { status, data } = await postJson('/skilltree-student/quiz-submit', { candidateId: SID, responses: [{ itemId: ITEM1, response: ['cA'] }], __baseUrl: GW }, { origin: 'http://evil.example' })
  check('T13 cross-origin POST → 403 UNTRUSTED_ORIGIN', status === 403 && /UNTRUSTED_ORIGIN/.test(data.error), JSON.stringify(data))
}

// T14 GET on a POST route
{
  const res = await fetch(ORIGIN + '/skilltree-student/quiz-submit', { method: 'GET' })
  check('T14 GET on POST route → 405', res.status === 405)
}

// T15 dead default gateway → per-call 502
{
  const { status, data } = await postJson('/skilltree-student/batch', { calls: [{ id: 'user', prefix: 'class', path: 'users/' + SID }] })
  check('T15 batch dead gateway → per-call 502', status === 200 && data.ok === true
    && data.results[0].ok === false && data.results[0].status === 502, JSON.stringify(data.results))
}

// T12 rag-upload over the 1MB cap (env re-read per call). Kept after the other
// HTTP tests on purpose: the aborted 2MB body poisons that keep-alive socket.
{
  process.env.SKILLTREE_STUDENT_RAG_UPLOAD_MB = '1'
  const big = Buffer.alloc(2 * 1024 * 1024, 65)
  const res = await fetch(ORIGIN + '/skilltree-student/rag-upload', {
    method: 'POST',
    headers: { 'content-type': 'multipart/form-data; boundary=----x', origin: ORIGIN },
    body: big,
  })
  const data = await res.json().catch(() => null)
  check('T12 rag-upload 2MB with 1MB cap → 413', res.status === 413 && data && data.ok === false && /too large/.test(String(data.error)), JSON.stringify(data))
  delete process.env.SKILLTREE_STUDENT_RAG_UPLOAD_MB
}

// ---------- pure-builder units ----------

// U1 validateBatchCall
check('U1 validateBatchCall allows known prefix, rejects unknown',
  plugin.validateBatchCall({ prefix: 'quiz', path: 'items', query: 'conceptUri=https%3A%2F%2Fx&limit=5' }) === null
  && plugin.validateBatchCall({ prefix: 'admin', path: 'x' }) !== null
  && plugin.validateBatchCall({ prefix: 'quiz', path: 'it ems' }) !== null, '')

// U2 quiz builder rejects bad choice ids / oversized batches
{
  const base = 'http://gw.example'
  const bad = plugin.buildQuizSubmitRequest({ candidateId: SID, responses: [{ itemId: ITEM1, response: ['bad choice!'] }] }, base, 't')
  const many = plugin.buildQuizSubmitRequest({ candidateId: SID, responses: Array.from({ length: 51 }, (_, i) => ({ itemId: ITEM1, response: ['cA'] })) }, base, 't')
  check('U2 quiz builder validation', bad && /choice identifiers/.test(bad.error) && many && /1..50/.test(many.error), JSON.stringify(bad && bad.error))
}

// U3 mastery builder validates occurredAt
{
  const bad = plugin.buildMasteryUpdateRequest({ studentId: SID, responses: [{ conceptUri: CONCEPT1, isCorrect: true, occurredAt: 'yesterday' }] }, 'http://gw.example', 't')
  const good = plugin.buildMasteryUpdateRequest({ studentId: SID, responses: [{ conceptUri: CONCEPT1, isCorrect: false, occurredAt: '2026-11-02T10:00:00Z' }] }, 'http://gw.example', 't')
  check('U3 mastery builder occurredAt', bad && /occurredAt/.test(bad.error) && good && good.url.endsWith('/update/bulk'), JSON.stringify(bad && bad.error))
}

// U4 ask builder defaults + top_k validation
{
  const good = plugin.buildRagAskRequest({ question: 'abc' }, 'http://gw.example/', 't')
  const badTopK = plugin.buildRagAskRequest({ question: 'abc', topK: 99 }, 'http://gw.example', 't')
  const badMode = plugin.buildRagAskRequest({ question: 'abc', mode: 'vibes' }, 'http://gw.example', 't')
  check('U4 ask builder defaults + validation',
    good && good.url === 'http://gw.example/rag/ask' && JSON.parse(good.init.body).mode === 'answer'
    && badTopK && /topK/.test(badTopK.error) && badMode && /mode/.test(badMode.error), '')
}

await settle()
proxy.close()
upstream.close()
console.log(failures === 0 ? 'ALL SMOKE CHECKS PASSED' : failures + ' CHECKS FAILED')
process.exit(failures === 0 ? 0 : 1)
