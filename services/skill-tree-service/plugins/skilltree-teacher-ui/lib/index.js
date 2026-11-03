/**
 * skilltree-teacher-ui — HOST half.
 *
 * Mounts same-origin HTTP routes for the teacher dashboard client half.
 * The browser never talks to services directly: everything is proxied through
 * the M10 api-gateway (route contract: /{prefix}/{rest} → {upstream}/api/v1/{rest}).
 *
 *   GET  /skilltree-teacher/config  → { gatewayBaseUrl, prefixes, upstream }
 *   POST /skilltree-teacher/batch   → GET-only fan-out, allow-listed prefixes:
 *                                     class (M6) · learner (M5) · case (M1) · events (M4)
 *   POST /skilltree-teacher/assign  → M7  POST /api/v1/assignments
 *   POST /skilltree-teacher/quiz    → M7  POST /api/v1/assignments/{id}/quiz
 *   POST /skilltree-teacher/ask     → Class Ask: live M5 heatmap + teaching-plan (+ M1
 *                                     graph labels, M6 roster), deterministic matcher
 *                                     (V1 heuristic — upgradeable to cognee M8 later).
 *
 * Base URL (env-configurable, 12-factor): SKILLTREE_GATEWAY_URL, default
 * http://localhost:8000. Every POST may carry an optional `__baseUrl` field
 * (validated http(s)) to override the gateway per call — stripped before
 * forwarding. The teacher JWT (skilltree.auth.v1) arrives as the Authorization
 * header and is forwarded verbatim; tokens are never logged or persisted.
 *
 * Secrets discipline: fixed allow-lists, no open proxy; POSTs must be same-origin;
 * bodies capped at 16 KiB; upstream timeout 10 s; platform error envelope preserved.
 */

export const name = 'skilltree-teacher-ui'
export const inject = ['webServer']


const DEFAULT_GATEWAY = 'http://localhost:8000'
const BODY_LIMIT_BYTES = 16 * 1024
const UPSTREAM_TIMEOUT_MS = 10_000
const MAX_BATCH_CALLS = 8

/** Gateway prefixes the dashboard may read (GET-only fan-out). */
export const READ_PREFIXES = ['class', 'learner', 'case', 'events']
/** M7 assignment-service prefix (mutations get dedicated routes). */
const ASSIGN_PREFIX = 'assignments'

const GROUPS = new Set(['red', 'rusty', 'red_rusty'])

// OneRoster/CASE sub-path after the gateway prefix. No '..', no scheme tricks.
const PATH_RE = /^[A-Za-z0-9][A-Za-z0-9/_.~-]*$/
const QUERY_RE = /^[A-Za-z0-9/_.~=&%:+-]*$/
const UUID_RE = /^[0-9a-fA-F-]{8,64}$/
const ISO_RE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:?\d{2})?)?$/


function gatewayBaseUrl() {
  const raw = process.env.SKILLTREE_GATEWAY_URL
  const base = typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : DEFAULT_GATEWAY
  return base.replace(/\/+$/, '')
}


function isHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value) && value.length <= 2048
}


function clientBase(body) {
  return body && isHttpUrl(body.__baseUrl) ? String(body.__baseUrl).replace(/\/+$/, '') : gatewayBaseUrl()
}


function stripTransport(body) {
  const payload = Object.assign({}, body)
  delete payload.__baseUrl
  return payload
}


function sendJson(response, status, value) {
  response.writeHead(status, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
  })
  response.end(JSON.stringify(value))
}


function isSameOrigin(request) {
  const origin = request.headers.origin
  const host = request.headers.host
  if (origin === undefined || host === undefined) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}


async function readJsonBody(request) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? Buffer.from(chunk) : Buffer.from(chunk)
    size += buffer.length
    if (size > BODY_LIMIT_BYTES) throw new Error('request body too large')
    chunks.push(buffer)
  }
  if (chunks.length === 0) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}


/**
 * Forward the raw Authorization header verbatim (already "Bearer <jwt>" —
 * never re-prefix, never log).
 */
function authHeaders(authorization) {
  return typeof authorization === 'string' && authorization !== '' ? { authorization } : {}
}


async function fetchUpstream(url, init, fetchImpl) {
  const fetchFn = typeof fetchImpl === 'function' ? fetchImpl : globalThis.fetch
  if (typeof fetchFn !== 'function') {
    return { __networkError: 'fetch unavailable in host runtime' }
  }
  try {
    return await fetchFn(url, Object.assign({ redirect: 'error' }, init, {
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    }))
  } catch (err) {
    const message = err && err.message ? err.message : String(err)
    return { __networkError: 'upstream unreachable: ' + message }
  }
}


function textToData(text) {
  try { return text ? JSON.parse(text) : null } catch { return text }
}


/** Read a fetch Response (or network-error marker) exactly once. */
async function readUpstream(response) {
  if (!response || response.__networkError) {
    return {
      status: 502,
      ok: false,
      text: '',
      networkError: response && response.__networkError ? response.__networkError : 'no response',
    }
  }
  let text = ''
  try {
    text = await response.text()
  } catch (err) {
    return { status: response.status || 0, ok: false, text: '', networkError: 'unreadable upstream response: ' + String(err && err.message ? err.message : err) }
  }
  return { status: response.status, ok: Boolean(response.ok), text }
}


/** Turn one upstream read into the plugin result shape (platform envelope preserved). */
function toResult(read) {
  if (read.networkError) {
    return { ok: false, status: 502, error: read.networkError }
  }
  const data = textToData(read.text)
  if (!read.ok) {
    const envelope = data && typeof data === 'object' && data.error ? data.error : null
    return {
      ok: false,
      status: read.status,
      error: envelope ? envelope.code + ': ' + envelope.message : 'HTTP ' + read.status,
      details: envelope && envelope.details ? envelope.details : undefined,
    }
  }
  return { ok: true, status: read.status, data }
}


/**
 * Validate one batch call against the GET-only allow-list.
 * @returns {string|null} error message or null when valid
 */
export function validateBatchCall(call) {
  if (!call || typeof call !== 'object' || Array.isArray(call)) return 'call must be an object'
  const prefix = typeof call.prefix === 'string' ? call.prefix : ''
  if (!READ_PREFIXES.includes(prefix)) return 'prefix not allowed (allowed: ' + READ_PREFIXES.join(', ') + ')'
  const path = typeof call.path === 'string' ? call.path.replace(/^\/+/, '') : ''
  if (!PATH_RE.test(path) || path.includes('..')) return 'invalid resource path'
  if (call.query !== undefined && call.query !== null) {
    if (typeof call.query !== 'string' || !QUERY_RE.test(call.query)) return 'invalid query string'
  }
  if (call.id !== undefined && typeof call.id !== 'string') return 'id must be a string'
  return null
}


/**
 * Execute the GET-only fan-out against the gateway. Pure except for the
 * outbound fetch; `fetchImpl` is injectable for tests.
 * `token` is the raw Authorization header value (e.g. "Bearer <jwt>"), forwarded verbatim.
 * @returns {Promise<{ok: boolean, results?: Array<{id: string, ok: boolean, status: number, data?: unknown, error?: string}>, error?: string}>}
 */
export async function forwardBatch(input, fetchImpl, base, token) {
  const calls = input && Array.isArray(input.calls) ? input.calls : null
  if (!calls || calls.length === 0) return { ok: false, error: 'calls[] required (1..' + MAX_BATCH_CALLS + ')' }
  if (calls.length > MAX_BATCH_CALLS) return { ok: false, error: 'too many calls (max ' + MAX_BATCH_CALLS + ')' }

  const gatewayBase = typeof base === 'string' && base !== '' ? base.replace(/\/+$/, '') : gatewayBaseUrl()
  const headers = Object.assign({ accept: 'application/json' }, authHeaders(token))

  const results = await Promise.all(calls.map(async (call) => {
    const id = call && typeof call.id === 'string' ? call.id : 'call'
    const invalid = validateBatchCall(call)
    if (invalid) return { id, ok: false, status: 0, error: 'INVALID_CALL: ' + invalid }
    const path = call.path.replace(/^\/+/, '')
    const url = gatewayBase + '/' + call.prefix + '/' + path + (call.query ? '?' + call.query : '')
    const response = await fetchUpstream(url, { method: 'GET', headers }, fetchImpl)
    const read = await readUpstream(response)
    return Object.assign({ id }, toResult(read))
  }))
  return { ok: true, results }
}


/**
 * Validate and build the M7 assignment creation request.
 * `token` is the raw Authorization header value (e.g. "Bearer <jwt>"), forwarded verbatim.
 * @returns {{ url: string, init: object } | { error: string }}
 */
export function buildAssignRequest(body, base, token) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'JSON object body required' }
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  if (title.length < 1 || title.length > 200) return { error: 'title must be 1..200 characters' }
  const classId = typeof body.classId === 'string' ? body.classId.trim() : ''
  if (!UUID_RE.test(classId)) return { error: 'classId must be a sourcedId' }
  const conceptUri = typeof body.conceptUri === 'string' ? body.conceptUri.trim() : ''
  if (conceptUri.length < 3 || conceptUri.length > 512) return { error: 'conceptUri required' }
  const targetGroup = typeof body.targetGroup === 'string' ? body.targetGroup : 'red_rusty'
  if (!GROUPS.has(targetGroup)) return { error: "targetGroup must be 'red', 'rusty' or 'red_rusty'" }
  const payload = { title, classId, conceptUri, targetGroup }
  if (body.dueAt !== undefined && body.dueAt !== null && body.dueAt !== '') {
    if (typeof body.dueAt !== 'string' || !ISO_RE.test(body.dueAt.trim())) return { error: 'dueAt must be an ISO-8601 timestamp' }
    payload.dueAt = body.dueAt.trim()
  }
  return {
    url: base + '/' + ASSIGN_PREFIX + '/assignments',
    init: {
      method: 'POST',
      headers: Object.assign({ 'content-type': 'application/json', accept: 'application/json' }, authHeaders(token)),
      body: JSON.stringify(payload),
    },
  }
}


/**
 * Validate and build the M7 quiz-generation request.
 * `token` is the raw Authorization header value (e.g. "Bearer <jwt>"), forwarded verbatim.
 * @returns {{ url: string, init: object } | { error: string }}
 */
export function buildQuizRequest(body, base, token) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'JSON object body required' }
  const assignmentId = typeof body.assignmentId === 'string' ? body.assignmentId.trim() : ''
  if (!UUID_RE.test(assignmentId)) return { error: 'assignmentId must be a UUID' }
  return {
    url: base + '/' + ASSIGN_PREFIX + '/assignments/' + encodeURIComponent(assignmentId) + '/quiz',
    init: {
      method: 'POST',
      headers: Object.assign({ 'content-type': 'application/json', accept: 'application/json' }, authHeaders(token)),
      body: '{}',
    },
  }
}


/* ------------------------------------------------------------------ *
 * Class Ask — deterministic V1 answerer over live M5 data.            *
 * ------------------------------------------------------------------ */

const STOPWORDS = new Set([
  'ai', 'da', 'nam', 'vung', 'dang', 'yeu', 'ket', 'chua', 'bao', 'nhieu', 'hoc', 'sinh',
  'em', 'lop', 'class', 'the', 'an', 'is', 'are', 'who', 'whom', 'what', 'how', 'many',
  'students', 'student', 'bi', 'trong', 'va', 'cac', 'nhung', 'toi', 'cho', 've', 'ra',
  'khoa', 'mon', 'nao', 'sao', 'truoc', 'nhin', 'xem', 'vay', 'nhu',
])


/** Lowercase + strip diacritics (Vietnamese) for keyword matching. */
export function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
}


function tokenize(value) {
  return normalizeText(value).split(/[^a-z0-9]+/).filter((t) => t.length > 1 && !STOPWORDS.has(t))
}


/**
 * Pick the graph node whose label best matches the question keywords.
 * @returns {{ node: object, score: number } | null}
 */
export function matchConcept(question, nodes) {
  const tokens = tokenize(question)
  if (tokens.length === 0) return null
  let best = null
  for (const node of Array.isArray(nodes) ? nodes : []) {
    const labelTokens = new Set(tokenize((node.humanCodingScheme || '') + ' ' + (node.fullStatement || node.title || '')))
    let score = 0
    for (const token of tokens) {
      if (labelTokens.has(token)) score += token.length >= 4 ? 2 : 1
    }
    if (score > 0 && (best === null || score > best.score)) best = { node, score }
  }
  return best
}


function detectIntent(question) {
  const q = normalizeText(question)
  if (/(master|nam vung|vung|solid|green|thong|hieu ro|xong)/.test(q)) return 'green'
  if (/(rusty|quen|lang quen|on tap|review|forget|bo quen)/.test(q)) return 'rusty'
  if (/(yeu|red|kho|bi ket|ket|gap kho|struggl|fail|truot)/.test(q)) return 'red'
  return 'summary'
}


function namesOf(sids, roster) {
  const byId = new Map((Array.isArray(roster) ? roster : []).map((u) => [u.sourcedId, u.displayName || u.sourcedId]))
  return (Array.isArray(sids) ? sids : []).map((sid) => byId.get(sid) || sid)
}


/**
 * Compose the Class Ask answer from live M5 heatmap + teaching-plan + M1 labels.
 * Pure: no network, fully unit-testable.
 * @returns {{ answer: string, evidence: object }}
 */
export function answerClassAsk(question, data) {
  const heatmap = data && data.heatmap ? data.heatmap : null
  const plan = Array.isArray(data && data.plan) ? data.plan : []
  const nodes = Array.isArray(data && data.nodes) ? data.nodes : []
  const roster = Array.isArray(data && data.roster) ? data.roster : []
  if (!heatmap || !Array.isArray(heatmap.students) || !Array.isArray(heatmap.concepts)) {
    return { answer: 'Chưa có dữ liệu heatmap của lớp (M5) — hãy chọn lớp + documentId rồi tải dashboard trước.', evidence: { intent: detectIntent(question) } }
  }
  const intent = detectIntent(question)
  const total = heatmap.students.length

  if (intent !== 'summary') {
    const match = matchConcept(question, nodes)
    if (!match) {
      const labels = nodes.slice(0, 8).map((n) => n.humanCodingScheme || n.fullStatement || n.identifier).filter(Boolean)
      return {
        answer: 'Không tìm thấy khái niệm nào khớp câu hỏi. Các khái niệm có trong môn: ' + labels.join(' · ') + '.',
        evidence: { intent, conceptUri: null },
      }
    }
    const uri = match.node.identifier
    const counts = { green: [], red: [], rusty: [], amber: [], none: [] }
    for (const sid of heatmap.students) {
      const state = heatmap.cells && heatmap.cells[sid] ? heatmap.cells[sid][uri] : 'none'
      if (counts[state]) counts[state].push(sid)
    }
    const label = match.node.humanCodingScheme
      ? match.node.humanCodingScheme + ' · ' + match.node.fullStatement
      : (match.node.fullStatement || uri)
    let answer
    if (intent === 'green') {
      const green = namesOf(counts.green, roster)
      answer = total === 0
        ? 'Lớp chưa có học sinh nào trong heatmap.'
        : green.length + '/' + total + ' học sinh đã nắm vững «' + label + '»: ' + (green.join(', ') || '—') + '.'
      if (counts.red.length) answer += ' Còn ' + counts.red.length + ' em đỏ: ' + namesOf(counts.red, roster).join(', ') + '.'
      if (counts.rusty.length) answer += ' ' + counts.rusty.length + ' em rusty (cần ôn): ' + namesOf(counts.rusty, roster).join(', ') + '.'
    } else if (intent === 'red') {
      const red = namesOf(counts.red, roster)
      answer = red.length
        ? counts.red.length + '/' + total + ' học sinh đang đỏ ở «' + label + '»: ' + red.join(', ') + '.'
        : 'Không có ai đỏ ở «' + label + '» (xanh ' + counts.green.length + ', vàng ' + counts.amber.length + ', rusty ' + counts.rusty.length + ').'
      if (counts.rusty.length) answer += ' Rusty cần ôn: ' + namesOf(counts.rusty, roster).join(', ') + '.'
    } else {
      const rusty = namesOf(counts.rusty, roster)
      answer = rusty.length
        ? counts.rusty.length + ' học sinh rusty (đã từng học, đang quên) ở «' + label + '»: ' + rusty.join(', ') + '.'
        : 'Không có ai rusty ở «' + label + '» (xanh ' + counts.green.length + ', vàng ' + counts.amber.length + ', đỏ ' + counts.red.length + ').'
    }
    return {
      answer,
      evidence: {
        intent,
        conceptUri: uri,
        label,
        counts: {
          green: counts.green.length, amber: counts.amber.length,
          red: counts.red.length, rusty: counts.rusty.length, none: counts.none.length,
        },
      },
    }
  }

  // summary intent: contrastive plan digest
  if (plan.length === 0) {
    return {
      answer: 'Lớp có ' + total + ' học sinh — teaching-plan trống (M5 chưa có dữ liệu luyện tập hoặc mọi khái niệm đã xanh).',
      evidence: { intent, total },
    }
  }
  const lines = plan.slice(0, 3).map((entry, index) => {
    const node = nodes.find((n) => n.identifier === entry.conceptUri)
    const label = node ? (node.humanCodingScheme ? node.humanCodingScheme + ' · ' + node.fullStatement : node.fullStatement) : entry.conceptUri
    return (index + 1) + '. «' + label + '»: ' + entry.redCount + ' đỏ, ' + entry.rustyCount + ' rusty, mở khóa ' + (entry.unlocks ? entry.unlocks.length : 0) + ' khái niệm.'
  })
  return {
    answer: 'Tổng quan lớp (' + total + ' học sinh): ' + lines.join(' ') + ' Ưu tiên dạy khái niệm hàng đầu trước vì nó mở khóa nhiều khái niệm phía sau nhất.',
    evidence: { intent, total, planTop: plan.slice(0, 3).map((p) => p.conceptUri) },
  }
}


/**
 * Class Ask route core: fetches live M5/M1/M6 data once, then answers deterministically.
 * `token` is the raw Authorization header value (e.g. "Bearer <jwt>"), forwarded verbatim.
 * @returns {Promise<{ok: boolean, answer?: string, evidence?: object, source?: string, error?: string, status?: number}>}
 */
export async function askClass(input, fetchImpl, base, token) {
  const question = input && typeof input.question === 'string' ? input.question.trim() : ''
  if (question.length < 3 || question.length > 500) return { ok: false, error: 'question must be 3..500 characters' }
  const classId = input && typeof input.classId === 'string' ? input.classId.trim() : ''
  if (!UUID_RE.test(classId)) return { ok: false, error: 'classId must be a sourcedId' }
  const documentId = input && typeof input.documentId === 'string' ? input.documentId.trim() : ''
  if (!UUID_RE.test(documentId)) return { ok: false, error: 'documentId must be a UUID' }

  const gatewayBase = typeof base === 'string' && base !== '' ? base.replace(/\/+$/, '') : gatewayBaseUrl()
  const headers = Object.assign({ accept: 'application/json' }, authHeaders(token))
  const enc = encodeURIComponent
  const docQuery = 'documentId=' + enc(documentId)

  const [heatmapRes, planRes, rosterRes, graphRes] = await Promise.all([
    fetchUpstream(gatewayBase + '/learner/classes/' + enc(classId) + '/heatmap?' + docQuery, { method: 'GET', headers }, fetchImpl),
    fetchUpstream(gatewayBase + '/learner/classes/' + enc(classId) + '/teaching-plan?' + docQuery + '&topN=5', { method: 'GET', headers }, fetchImpl),
    fetchUpstream(gatewayBase + '/class/classes/' + enc(classId) + '/students', { method: 'GET', headers }, fetchImpl),
    fetchUpstream(gatewayBase + '/case/documents/' + enc(documentId) + '/graph', { method: 'GET', headers }, fetchImpl),
  ])

  const heatmapRead = await readUpstream(heatmapRes)
  const heatmapResult = toResult(heatmapRead)
  if (!heatmapResult.ok) return { ok: false, status: heatmapResult.status, error: 'heatmap: ' + heatmapResult.error }
  const planRead = await readUpstream(planRes)
  const planResult = toResult(planRead)
  if (!planResult.ok) return { ok: false, status: planResult.status, error: 'teaching-plan: ' + planResult.error }

  const rosterRead = await readUpstream(rosterRes)
  const rosterResult = toResult(rosterRead)
  const graphRead = await readUpstream(graphRes)
  const graphResult = toResult(graphRead)

  const composed = answerClassAsk(question, {
    heatmap: heatmapResult.data,
    plan: planResult.data,
    roster: rosterResult.ok && Array.isArray(rosterResult.data) ? rosterResult.data : [],
    nodes: graphResult.ok && graphResult.data && Array.isArray(graphResult.data.nodes) ? graphResult.data.nodes : [],
  })
  return Object.assign({ ok: true, source: 'learner-model (M5): heatmap + teaching-plan — V1 heuristic, upgradeable to cognee (M8)' }, composed)
}


function mountProxyRoute(key, buildRequest, ctx) {
  ctx.webServer.register({
    kind: 'exact',
    path: '/skilltree-teacher/' + key,
    handler: async (request, response) => {
      if (request.method !== 'POST') {
        response.writeHead(405, { allow: 'POST' })
        response.end()
        return
      }
      if (!isSameOrigin(request)) {
        sendJson(response, 403, { ok: false, error: 'UNTRUSTED_ORIGIN: cross-origin POST is not allowed' })
        return
      }
      let body
      try {
        body = await readJsonBody(request)
      } catch (error) {
        sendJson(response, 400, { ok: false, error: 'BAD_REQUEST: invalid JSON body (' + String(error && error.message ? error.message : error) + ')' })
        return
      }
      const gatewayBase = clientBase(body)
      const built = buildRequest(stripTransport(body), gatewayBase, request.headers.authorization)
      if (built.error) {
        sendJson(response, 400, { ok: false, error: 'BAD_REQUEST: ' + built.error })
        return
      }
      const upstreamResponse = await fetchUpstream(built.url, built.init)
      const read = await readUpstream(upstreamResponse)
      const result = toResult(read)
      sendJson(response, result.ok ? 200 : Math.max(400, Math.min(result.status, 599)), result)
    },
  })
}


/**
 * Mount the teacher dashboard proxy routes on the harness web server.
 * @param ctx - cordis host context providing the webServer service.
 */
export function apply(ctx) {
  ctx.webServer.register({
    kind: 'exact',
    path: '/skilltree-teacher/config',
    handler: async (request, response) => {
      if (request.method !== 'GET') {
        response.writeHead(405, { allow: 'GET' })
        response.end()
        return
      }
      sendJson(response, 200, {
        gatewayBaseUrl: gatewayBaseUrl(),
        prefixes: READ_PREFIXES.concat([ASSIGN_PREFIX]),
        upstream: 'api-gateway (M10) → M1/M4/M5/M6/M7',
      })
    },
  })

  ctx.webServer.register({
    kind: 'exact',
    path: '/skilltree-teacher/batch',
    handler: async (request, response) => {
      if (request.method !== 'POST') {
        response.writeHead(405, { allow: 'POST' })
        response.end()
        return
      }
      if (!isSameOrigin(request)) {
        sendJson(response, 403, { ok: false, error: 'UNTRUSTED_ORIGIN: cross-origin POST is not allowed' })
        return
      }
      let body
      try {
        body = await readJsonBody(request)
      } catch (error) {
        sendJson(response, 400, { ok: false, error: 'BAD_REQUEST: invalid JSON body (' + String(error && error.message ? error.message : error) + ')' })
        return
      }
      const result = await forwardBatch(stripTransport(body), undefined, clientBase(body), request.headers.authorization)
      sendJson(response, result.ok ? 200 : 400, result)
    },
  })

  mountProxyRoute('assign', buildAssignRequest, ctx)
  mountProxyRoute('quiz', buildQuizRequest, ctx)

  ctx.webServer.register({
    kind: 'exact',
    path: '/skilltree-teacher/ask',
    handler: async (request, response) => {
      if (request.method !== 'POST') {
        response.writeHead(405, { allow: 'POST' })
        response.end()
        return
      }
      if (!isSameOrigin(request)) {
        sendJson(response, 403, { ok: false, error: 'UNTRUSTED_ORIGIN: cross-origin POST is not allowed' })
        return
      }
      let body
      try {
        body = await readJsonBody(request)
      } catch (error) {
        sendJson(response, 400, { ok: false, error: 'BAD_REQUEST: invalid JSON body (' + String(error && error.message ? error.message : error) + ')' })
        return
      }
      const result = await askClass(stripTransport(body), undefined, clientBase(body), request.headers.authorization)
      sendJson(response, result.ok ? 200 : Math.max(400, Math.min(result.status || 400, 599)), result)
    },
  })

  console.log('[skilltree-teacher-ui] teacher dashboard ready (routes: /skilltree-teacher/config|batch|assign|quiz|ask, gateway: ' + gatewayBaseUrl() + ')')
}
