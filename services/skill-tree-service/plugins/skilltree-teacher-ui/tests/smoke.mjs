/**
 * skilltree-teacher-ui — host-half smoke test (Node ≥ 18, no dependencies).
 *
 * Verifies the real proxy behavior of lib/index.js against a fake harness
 * webServer + a fake M10 gateway (echo + canned M5/M7/M1/M6 responses):
 *   T1  GET  /skilltree-teacher/config → gatewayBaseUrl + prefixes
 *   T2  POST /skilltree-teacher/batch  → 5 calls pass through, wire paths + Authorization verified
 *   T3  batch disallowed prefix → INVALID_CALL
 *   T4  batch path with '..' → INVALID_CALL
 *   T5  POST /skilltree-teacher/assign → M7 POST /assignments/assignments, token forwarded,
 *       __baseUrl stripped
 *   T6  assign invalid targetGroup → 400, no upstream call
 *   T7  POST /skilltree-teacher/quiz → POST /assignments/assignments/{id}/quiz; bad id → 400
 *   T8  POST /skilltree-teacher/ask → answer composed from live heatmap/plan/roster/graph
 *   T9  ask bad classId → 400
 *   T10 cross-origin POST → 403 UNTRUSTED_ORIGIN
 *   T11 GET on a POST route → 405
 *   T12 body too large → 400
 *   T13 batch against dead default gateway → per-call 502 UPSTREAM_UNAVAILABLE
 *   U1..U4 unit: normalizeText, matchConcept, answerClassAsk (green/red/summary), state helpers
 *
 * Run:  node tests/smoke.mjs   (from the plugin directory)
 */
import http from 'node:http'
import assert from 'node:assert/strict'

// Deterministic "default gateway": dead port so T13 never depends on :8000.
process.env.SKILLTREE_GATEWAY_URL = 'http://127.0.0.1:9'

const PORT_PROXY = 9401
const PORT_UPSTREAM = 9402
const CLASS_ID = '11111111-2222-3333-4444-555555555555'
const DOC_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
const ASSIGN_ID = 'f0f0f0f0-f0f0-f0f0-f0f0-f0f0f0f0f0f0'

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

// --- fake gateway (echo + canned platform responses) ---
const seen = { paths: [], auths: [], bodies: [] }
const upstream = http.createServer(async (req, res) => {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const bodyRaw = Buffer.concat(chunks).toString('utf8')
  seen.paths.push(req.url)
  seen.auths.push(req.headers.authorization || null)
  seen.bodies.push(bodyRaw)
  const send = (status, data) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(data)) }

  // M5 heatmap
  if (req.method === 'GET' && req.url.startsWith('/learner/classes/' + CLASS_ID + '/heatmap')) {
    return send(200, {
      students: ['sid-red', 'sid-green'],
      concepts: ['https://case.example/cfitems/concept-recursion'],
      cells: {
        'sid-red': { 'https://case.example/cfitems/concept-recursion': 'red' },
        'sid-green': { 'https://case.example/cfitems/concept-recursion': 'green' },
      },
    })
  }
  // M5 teaching plan
  if (req.method === 'GET' && req.url.startsWith('/learner/classes/' + CLASS_ID + '/teaching-plan')) {
    return send(200, [{
      conceptUri: 'https://case.example/cfitems/concept-recursion',
      redCount: 1, rustyCount: 0, amberCount: 0, unlocks: ['https://case.example/cfitems/concept-graph'],
      reason: '1 student(s) red, 0 rusty — teaching it first unlocks 1 follow-up concept(s).',
    }])
  }
  // M6 roster
  if (req.method === 'GET' && req.url.startsWith('/class/classes/' + CLASS_ID + '/students')) {
    return send(200, [
      { sourcedId: 'sid-red', displayName: 'Nguyễn Văn Đỏ', role: 'student', email: null, orgSourcedId: null, createdAt: '2026-10-31T00:00:00Z' },
      { sourcedId: 'sid-green', displayName: 'Trần Thị Xanh', role: 'student', email: null, orgSourcedId: null, createdAt: '2026-10-31T00:00:00Z' },
    ])
  }
  // M1 graph
  if (req.method === 'GET' && req.url.startsWith('/case/documents/' + DOC_ID + '/graph')) {
    return send(200, {
      nodes: [
        { identifier: 'https://case.example/cfitems/concept-recursion', humanCodingScheme: '1.2', fullStatement: 'Đệ quy (Recursion)' },
        { identifier: 'https://case.example/cfitems/concept-graph', humanCodingScheme: '2.1', fullStatement: 'Đồ thị (Graph)' },
      ],
      edges: [{ type: 'isPrerequisiteOf', source: 'https://case.example/cfitems/concept-recursion', destination: 'https://case.example/cfitems/concept-graph' }],
    })
  }
  // M4 events
  if (req.method === 'GET' && req.url.startsWith('/events/events')) {
    return send(200, [{ eventId: 'e1', type: 'AssessmentItemSubmitted', occurredAt: '2026-10-31T10:00:00Z', actorId: 'sid-red', actorType: 'Person', objectId: 'https://case.example/cfitems/concept-recursion', objectType: 'Concept', payload: { isCorrect: false } }])
  }
  // M6 classes list
  if (req.method === 'GET' && req.url === '/class/classes') {
    return send(200, [{ sourcedId: CLASS_ID, title: 'Lớp A1 — 2026', courseSourcedId: null, orgSourcedId: null, term: null, createdAt: '2026-10-31T00:00:00Z' }])
  }
  // M7 assignment create
  if (req.method === 'POST' && req.url === '/assignments/assignments') {
    const parsed = JSON.parse(bodyRaw || '{}')
    return send(201, {
      id: ASSIGN_ID, title: parsed.title, classId: parsed.classId, conceptUri: parsed.conceptUri,
      targetGroup: parsed.targetGroup, studentIds: ['sid-red'], itemIds: ['item-1', 'item-2'],
      quizTestId: null, status: 'draft', dueAt: parsed.dueAt || null,
    })
  }
  // M7 quiz generation
  if (req.method === 'POST' && req.url === '/assignments/assignments/' + ASSIGN_ID + '/quiz') {
    return send(200, { quizTestId: 'quiz-1', quizIdentifier: 'ASG-' + ASSIGN_ID, itemIds: ['item-1', 'item-2'], studentIds: ['sid-red'] })
  }
  return send(404, { error: { code: 'NOT_FOUND', message: req.url, details: {} } })
})
await new Promise((resolve) => upstream.listen(PORT_UPSTREAM, resolve))
const GATEWAY = 'http://127.0.0.1:' + PORT_UPSTREAM

async function callRoute(path, init) {
  const response = await fetch(ORIGIN + path, init)
  const text = await response.text()
  let data
  try { data = JSON.parse(text) } catch { data = text }
  return { status: response.status, data }
}

function post(path, payload, extraHeaders) {
  return callRoute(path, {
    method: 'POST',
    headers: Object.assign({ origin: ORIGIN, host: '127.0.0.1:' + PORT_PROXY, 'content-type': 'application/json' }, extraHeaders || {}),
    body: JSON.stringify(payload || {}),
  })
}

const AUTH = 'Bearer jwt-teacher-1'

/* ---- T1 config ---- */
{
  const res = await callRoute('/skilltree-teacher/config', { method: 'GET' })
  check('T1 config returns dead-port gateway + prefixes', res.status === 200 &&
    res.data.gatewayBaseUrl === 'http://127.0.0.1:9' &&
    Array.isArray(res.data.prefixes) && res.data.prefixes.includes('learner') && res.data.prefixes.includes('assignments'),
    JSON.stringify(res.data))
}

/* ---- T2 batch passthrough ---- */
{
  seen.paths.length = 0; seen.auths.length = 0
  const res = await post('/skilltree-teacher/batch', {
    __baseUrl: GATEWAY,
    calls: [
      { id: 'classes', prefix: 'class', path: 'classes' },
      { id: 'heatmap', prefix: 'learner', path: 'classes/' + CLASS_ID + '/heatmap', query: 'documentId=' + DOC_ID },
      { id: 'plan', prefix: 'learner', path: 'classes/' + CLASS_ID + '/teaching-plan', query: 'documentId=' + DOC_ID + '&topN=5' },
      { id: 'roster', prefix: 'class', path: 'classes/' + CLASS_ID + '/students' },
      { id: 'graph', prefix: 'case', path: 'documents/' + DOC_ID + '/graph' },
    ],
  }, { authorization: AUTH })
  const byId = {}
  ;(res.data.results || []).forEach((r) => { byId[r.id] = r })
  check('T2 batch ok:true with 5 results', res.status === 200 && res.data.ok === true && res.data.results.length === 5)
  check('T2 heatmap result carries M5 shape', byId.heatmap && byId.heatmap.ok && byId.heatmap.data.students.length === 2 && byId.heatmap.data.cells['sid-red']['https://case.example/cfitems/concept-recursion'] === 'red')
  check('T2 plan result carries reason', byId.plan && byId.plan.ok && byId.plan.data[0].reason.includes('unlocks 1'))
  check('T2 roster names pass through', byId.roster && byId.roster.ok && byId.roster.data[0].displayName === 'Nguyễn Văn Đỏ')
  check('T2 graph nodes pass through', byId.graph && byId.graph.ok && byId.graph.data.nodes.length === 2)
  check('T2 token forwarded to gateway', seen.auths.every((a) => a === AUTH), JSON.stringify(seen.auths))
  check('T2 wire paths hit gateway prefix contract', seen.paths.includes('/learner/classes/' + CLASS_ID + '/heatmap?documentId=' + DOC_ID) && seen.paths.includes('/case/documents/' + DOC_ID + '/graph'))
}

/* ---- T3/T4 batch validation ---- */
{
  const res = await post('/skilltree-teacher/batch', { __baseUrl: GATEWAY, calls: [{ id: 'x', prefix: 'quiz', path: 'items' }] })
  check('T3 disallowed prefix rejected', res.status === 200 && res.data.ok === true && res.data.results[0].error.includes('INVALID_CALL'))
  const res2 = await post('/skilltree-teacher/batch', { __baseUrl: GATEWAY, calls: [{ id: 'y', prefix: 'class', path: '../../admin' }] })
  check('T4 traversal path rejected', res2.data.results[0].error.includes('INVALID_CALL'))
}

/* ---- T5/T6 assign ---- */
{
  seen.bodies.length = 0; seen.auths.length = 0
  const res = await post('/skilltree-teacher/assign', {
    __baseUrl: GATEWAY, title: 'Ôn tập Đệ quy', classId: CLASS_ID,
    conceptUri: 'https://case.example/cfitems/concept-recursion', targetGroup: 'red_rusty',
    dueAt: '2026-11-07T10:00:00Z',
  }, { authorization: AUTH })
  check('T5 assign 201-shaped result ok', res.status === 200 && res.data.ok === true && res.data.data.id === ASSIGN_ID && res.data.data.studentIds.length === 1)
  const sent = JSON.parse(seen.bodies[seen.bodies.length - 1])
  check('T5 body forwarded without __baseUrl', !('__baseUrl' in sent) && sent.title === 'Ôn tập Đệ quy' && sent.targetGroup === 'red_rusty')
  check('T5 token forwarded', seen.auths[seen.auths.length - 1] === AUTH)

  const res2 = await post('/skilltree-teacher/assign', { __baseUrl: GATEWAY, title: 'x', classId: CLASS_ID, conceptUri: 'uri-x', targetGroup: 'everyone' })
  check('T6 invalid targetGroup → 400', res2.status === 400 && res2.data.error.includes('targetGroup'))
}

/* ---- T7 quiz ---- */
{
  const res = await post('/skilltree-teacher/quiz', { __baseUrl: GATEWAY, assignmentId: ASSIGN_ID }, { authorization: AUTH })
  check('T7 quiz generation ok', res.status === 200 && res.data.ok === true && res.data.data.quizTestId === 'quiz-1')
  const res2 = await post('/skilltree-teacher/quiz', { __baseUrl: GATEWAY, assignmentId: 'not-a-uuid' })
  check('T7 bad assignmentId → 400', res2.status === 400 && res2.data.error.includes('assignmentId'))
}

/* ---- T8/T9 ask ---- */
{
  const res = await post('/skilltree-teacher/ask', {
    __baseUrl: GATEWAY, question: 'Ai đã nắm vững đệ quy?', classId: CLASS_ID, documentId: DOC_ID,
  }, { authorization: AUTH })
  check('T8 ask ok with live-data answer', res.status === 200 && res.data.ok === true &&
    res.data.answer.includes('1/2 học sinh đã nắm vững') && res.data.answer.includes('Trần Thị Xanh') &&
    res.data.answer.includes('Nguyễn Văn Đỏ'), res.data.answer)
  check('T8 evidence cites concept + counts', res.data.evidence.conceptUri === 'https://case.example/cfitems/concept-recursion' && res.data.evidence.counts.green === 1 && res.data.evidence.counts.red === 1)
  check('T8 source line names M5 heuristic', res.data.source.includes('learner-model (M5)'))

  const res2 = await post('/skilltree-teacher/ask', { __baseUrl: GATEWAY, question: 'Ai yếu?', classId: 'bad', documentId: DOC_ID })
  check('T9 bad classId → 400', res2.status === 400 && res2.data.error.includes('classId'))
}

/* ---- T10/T11/T12 transport discipline ---- */
{
  const res = await fetch(ORIGIN + '/skilltree-teacher/batch', {
    method: 'POST', headers: { origin: 'http://evil.example', host: '127.0.0.1:' + PORT_PROXY, 'content-type': 'application/json' }, body: '{}',
  })
  const data = await res.json()
  check('T10 cross-origin POST → 403', res.status === 403 && data.error.includes('UNTRUSTED_ORIGIN'))
  const res2 = await callRoute('/skilltree-teacher/batch', { method: 'GET' })
  check('T11 GET on POST route → 405', res2.status === 405)
  const big = { calls: [{ id: 'x', prefix: 'class', path: 'classes', pad: 'y'.repeat(17 * 1024) }] }
  const res3 = await post('/skilltree-teacher/batch', big)
  check('T12 oversized body → 400', res3.status === 400 && res3.data.error.includes('BAD_REQUEST'))
}

/* ---- T13 dead gateway default ---- */
{
  const res = await post('/skilltree-teacher/batch', { calls: [{ id: 'hm', prefix: 'learner', path: 'classes/' + CLASS_ID + '/heatmap' }] })
  check('T13 dead gateway → per-call 502', res.status === 200 && res.data.ok === true && res.data.results[0].ok === false && res.data.results[0].error.includes('upstream unreachable'))
}

/* ---- U1..U4 pure units ---- */
{
  check('U1 normalizeText strips diacritics', plugin.normalizeText('Đệ QuyVIDÊN').includes('quyviden') || plugin.normalizeText('Đệ QuyVIDÊN') === 'de quyviden')
  const nodes = [
    { identifier: 'u1', humanCodingScheme: '1.2', fullStatement: 'Đệ quy (Recursion)' },
    { identifier: 'u2', humanCodingScheme: '2.1', fullStatement: 'Đồ thị (Graph)' },
  ]
  const match = plugin.matchConcept('Ai đã nắm vững recursion?', nodes)
  check('U2 matchConcept picks recursion node', match && match.node.identifier === 'u1')
  const green = plugin.answerClassAsk('Ai đã nắm vững đệ quy?', {
    heatmap: { students: ['a', 'b'], concepts: ['u1'], cells: { a: { u1: 'green' }, b: { u1: 'red' } } },
    plan: [], nodes,
    roster: [{ sourcedId: 'a', displayName: 'An' }, { sourcedId: 'b', displayName: 'Bình' }],
  })
  check('U3 green intent names roster students', green.answer.includes('1/2') && green.answer.includes('An') && green.answer.includes('Bình'))
  const summary = plugin.answerClassAsk('Tổng quan lớp?', {
    heatmap: { students: ['a'], concepts: ['u1'], cells: { a: { u1: 'red' } } },
    plan: [{ conceptUri: 'u1', redCount: 1, rustyCount: 0, amberCount: 0, unlocks: ['u2'], reason: 'r' }],
    nodes, roster: [],
  })
  check('U4 summary intent digests the plan', summary.answer.includes('1. «') && summary.answer.includes('mở khóa 1 khái niệm'))
}

await settle()
proxy.close()
upstream.close()
console.log(failures === 0 ? '\nALL SMOKE CHECKS PASSED' : '\n' + failures + ' CHECK(S) FAILED')
process.exit(failures === 0 ? 0 : 1)
