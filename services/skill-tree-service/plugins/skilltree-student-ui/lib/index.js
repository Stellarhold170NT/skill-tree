/**
 * skilltree-student-ui — HOST half.
 *
 * Mounts same-origin HTTP routes for the student client half. The browser never
 * talks to platform services directly: everything is proxied through the M10
 * api-gateway (route contract: /{prefix}/{rest} → {upstream}/api/v1/{rest}).
 *
 *   GET  /skilltree-student/config         → { gatewayBaseUrl, prefixes, uploadLimitMb }
 *   POST /skilltree-student/batch          → GET-only fan-out, allow-listed prefixes:
 *                                            class (M6) · learner (M5) · case (M1) ·
 *                                            quiz (M2) · rag (rag-service, GET-only)
 *   POST /skilltree-student/quiz-submit    → M2  POST /api/v1/attempts/bulk (score a batch)
 *   POST /skilltree-student/mastery-update → M5  POST /api/v1/students/{id}/update/bulk
 *   POST /skilltree-student/rag-upload     → rag-service POST /api/v1/documents/upload
 *                                            (multipart passthrough, size-capped)
 *   POST /skilltree-student/rag-ask        → rag-service POST /api/v1/ask (citations =
 *                                            section paths, mode answer|retrieve)
 *
 * Base URL (env-configurable, 12-factor): SKILLTREE_GATEWAY_URL, default
 * http://localhost:8000. Every POST may carry an optional `__baseUrl` field
 * (validated http(s)) to override the gateway per call — stripped before
 * forwarding. The student JWT (skilltree.auth.v1, from skilltree-auth-ui)
 * arrives as the Authorization header and is forwarded verbatim; tokens are
 * never logged or persisted.
 *
 * Secrets discipline: fixed allow-lists, no open proxy; POSTs must be
 * same-origin; JSON bodies capped at 16 KiB; multipart uploads capped at
 * SKILLTREE_STUDENT_RAG_UPLOAD_MB (default 20, aligned with the rag-service
 * RAG_MAX_UPLOAD_MB default); upstream timeout 10 s (30 s for uploads);
 * platform error envelope preserved.
 */

export const name = 'skilltree-student-ui'
export const inject = ['webServer']

const DEFAULT_GATEWAY = 'http://localhost:8000'
const BODY_LIMIT_BYTES = 16 * 1024
const UPSTREAM_TIMEOUT_MS = 10_000
const UPLOAD_TIMEOUT_MS = 30_000
const MAX_BATCH_CALLS = 8

/** Gateway prefixes the student UI may read (GET-only fan-out). */
export const READ_PREFIXES = ['class', 'learner', 'case', 'quiz', 'rag']

/** Default multipart upload cap in MB (rag-service default RAG_MAX_UPLOAD_MB is 20). */
export const DEFAULT_RAG_UPLOAD_MB = 20

const UUID_RE = /^[0-9a-fA-F-]{8,64}$/
const CHOICE_RE = /^[A-Za-z0-9_-]{1,64}$/
const CONCEPT_URI_RE = /^https?:\/\/\S{1,500}$/i
const ISO_RE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:?\d{2})?)?$/
const ASK_MODES = new Set(['retrieve', 'answer'])

// OneRoster/CASE/rag sub-path after the gateway prefix. No '..', no scheme tricks.
const PATH_RE = /^[A-Za-z0-9][A-Za-z0-9/_.~-]*$/
const QUERY_RE = /^[A-Za-z0-9/_.~=&%:+-]*$/

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

export function ragUploadLimitBytes() {
  const raw = parseInt(process.env.SKILLTREE_STUDENT_RAG_UPLOAD_MB, 10)
  const mb = Number.isFinite(raw) && raw >= 1 && raw <= 200 ? raw : DEFAULT_RAG_UPLOAD_MB
  return mb * 1024 * 1024
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
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > BODY_LIMIT_BYTES) throw new Error('request body too large')
    chunks.push(buffer)
  }
  if (chunks.length === 0) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

async function readRawBody(request, limitBytes) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > limitBytes) throw new Error('upload too large')
    chunks.push(buffer)
  }
  return Buffer.concat(chunks)
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
 * Validate and build the M2 bulk-attempt scoring request.
 * `token` is the raw Authorization header value, forwarded verbatim.
 * @returns {{ url: string, init: object } | { error: string }}
 */
export function buildQuizSubmitRequest(body, base, token) {
  const gatewayBase = String(base || '').replace(/\/+$/, '')
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'JSON object body required' }
  const candidateId = typeof body.candidateId === 'string' ? body.candidateId.trim() : ''
  if (!UUID_RE.test(candidateId)) return { error: 'candidateId must be a sourcedId (M6)' }
  const responses = Array.isArray(body.responses) ? body.responses : null
  if (!responses || responses.length < 1 || responses.length > 50) return { error: 'responses[] required (1..50)' }
  const clean = []
  for (const entry of responses) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return { error: 'each response must be an object' }
    const itemId = typeof entry.itemId === 'string' ? entry.itemId.trim() : ''
    if (!UUID_RE.test(itemId)) return { error: 'itemId must be a quiz item id' }
    const response = Array.isArray(entry.response) ? entry.response : null
    if (!response || response.length < 1 || response.length > 10) return { error: 'response[] required (1..10 choice identifiers)' }
    for (const choiceId of response) {
      if (typeof choiceId !== 'string' || !CHOICE_RE.test(choiceId)) return { error: 'choice identifiers must match [A-Za-z0-9_-]{1,64}' }
    }
    clean.push({ itemId, response: response.slice() })
  }
  const payload = { candidateId, responses: clean }
  if (body.testId !== undefined && body.testId !== null && body.testId !== '') {
    if (typeof body.testId !== 'string' || !UUID_RE.test(body.testId)) return { error: 'testId must be a quiz test id' }
    payload.testId = body.testId
  }
  return {
    url: gatewayBase + '/quiz/attempts/bulk',
    init: {
      method: 'POST',
      headers: Object.assign({ 'content-type': 'application/json', accept: 'application/json' }, authHeaders(token)),
      body: JSON.stringify(payload),
    },
  }
}

/**
 * Validate and build the M5 bulk mastery-update request.
 * @returns {{ url: string, init: object } | { error: string }}
 */
export function buildMasteryUpdateRequest(body, base, token) {
  const gatewayBase = String(base || '').replace(/\/+$/, '')
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'JSON object body required' }
  const studentId = typeof body.studentId === 'string' ? body.studentId.trim() : ''
  if (!UUID_RE.test(studentId)) return { error: 'studentId must be a sourcedId (M6)' }
  const responses = Array.isArray(body.responses) ? body.responses : null
  if (!responses || responses.length < 1 || responses.length > 50) return { error: 'responses[] required (1..50)' }
  const clean = []
  for (const entry of responses) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return { error: 'each response must be an object' }
    const conceptUri = typeof entry.conceptUri === 'string' ? entry.conceptUri.trim() : ''
    if (!CONCEPT_URI_RE.test(conceptUri)) return { error: 'conceptUri must be an http(s) URI (M1 CFItem.identifier)' }
    if (typeof entry.isCorrect !== 'boolean') return { error: 'isCorrect must be a boolean' }
    const item = { conceptUri, isCorrect: entry.isCorrect }
    if (entry.occurredAt !== undefined && entry.occurredAt !== null && entry.occurredAt !== '') {
      if (typeof entry.occurredAt !== 'string' || !ISO_RE.test(entry.occurredAt.trim())) return { error: 'occurredAt must be an ISO-8601 timestamp' }
      item.occurredAt = entry.occurredAt.trim()
    }
    clean.push(item)
  }
  return {
    url: gatewayBase + '/learner/students/' + encodeURIComponent(studentId) + '/update/bulk',
    init: {
      method: 'POST',
      headers: Object.assign({ 'content-type': 'application/json', accept: 'application/json' }, authHeaders(token)),
      body: JSON.stringify({ responses: clean }),
    },
  }
}

/**
 * Validate and build the rag-service ask request.
 * @returns {{ url: string, init: object } | { error: string }}
 */
export function buildRagAskRequest(body, base, token) {
  const gatewayBase = String(base || '').replace(/\/+$/, '')
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'JSON object body required' }
  const question = typeof body.question === 'string' ? body.question.trim() : ''
  if (question.length < 1 || question.length > 2000) return { error: 'question must be 1..2000 characters' }
  const mode = body.mode === undefined || body.mode === null || body.mode === '' ? 'answer' : body.mode
  if (!ASK_MODES.has(mode)) return { error: "mode must be 'retrieve' or 'answer'" }
  const payload = { question, mode }
  if (body.topK !== undefined && body.topK !== null && body.topK !== '') {
    const topK = Number(body.topK)
    if (!Number.isInteger(topK) || topK < 1 || topK > 10) return { error: 'topK must be an integer 1..10' }
    payload.top_k = topK
  }
  if (body.documentIds !== undefined && body.documentIds !== null) {
    if (!Array.isArray(body.documentIds) || body.documentIds.length < 1 || body.documentIds.length > 10) {
      return { error: 'documentIds[] must contain 1..10 document ids' }
    }
    for (const docId of body.documentIds) {
      if (typeof docId !== 'string' || !UUID_RE.test(docId)) return { error: 'documentIds entries must be document ids' }
    }
    payload.document_ids = body.documentIds.slice()
  }
  return {
    url: gatewayBase + '/rag/ask',
    init: {
      method: 'POST',
      headers: Object.assign({ 'content-type': 'application/json', accept: 'application/json' }, authHeaders(token)),
      body: JSON.stringify(payload),
    },
  }
}

/**
 * Validate a multipart upload before it is forwarded (pure, unit-testable).
 * @returns {string|null} error message or null when valid
 */
export function validateRagUpload(contentType, byteLength, limitBytes) {
  const type = typeof contentType === 'string' ? contentType.toLowerCase() : ''
  if (!type.startsWith('multipart/form-data')) return 'expected multipart/form-data with a file field'
  if (!Number.isFinite(byteLength) || byteLength < 1) return 'empty upload'
  if (byteLength > limitBytes) return 'upload too large (limit ' + Math.round(limitBytes / (1024 * 1024)) + 'MB)'
  return null
}

/**
 * Build the multipart passthrough request to rag-service via the gateway.
 * The body bytes and content-type (with its boundary) are forwarded verbatim.
 * @returns {{ url: string, init: object }}
 */
export function buildRagUploadRequest(rawBody, contentType, base, token, timeoutMs) {
  return {
    url: base + '/rag/documents/upload',
    init: {
      method: 'POST',
      headers: Object.assign(
        { accept: 'application/json', 'content-type': contentType, 'content-length': String(rawBody.length) },
        authHeaders(token),
      ),
      body: rawBody,
    },
    timeoutMs: typeof timeoutMs === 'number' && timeoutMs > 0 ? timeoutMs : UPLOAD_TIMEOUT_MS,
  }
}

function mountProxyRoute(key, buildRequest, ctx, options) {
  const opts = options || {}
  ctx.webServer.register({
    kind: 'exact',
    path: '/skilltree-student/' + key,
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
 * Mount the student UI proxy routes on the harness web server.
 * @param ctx - cordis host context providing the webServer service.
 */
export function apply(ctx) {
  ctx.webServer.register({
    kind: 'exact',
    path: '/skilltree-student/config',
    handler: async (request, response) => {
      if (request.method !== 'GET') {
        response.writeHead(405, { allow: 'GET' })
        response.end()
        return
      }
      sendJson(response, 200, {
        gatewayBaseUrl: gatewayBaseUrl(),
        prefixes: READ_PREFIXES,
        uploadLimitMb: Math.round(ragUploadLimitBytes() / (1024 * 1024)),
        upstream: 'api-gateway (M10) → M1/M2/M5/M6 + rag-service',
      })
    },
  })

  ctx.webServer.register({
    kind: 'exact',
    path: '/skilltree-student/batch',
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

  mountProxyRoute('quiz-submit', buildQuizSubmitRequest, ctx)
  mountProxyRoute('mastery-update', buildMasteryUpdateRequest, ctx)
  mountProxyRoute('rag-ask', buildRagAskRequest, ctx)

  ctx.webServer.register({
    kind: 'exact',
    path: '/skilltree-student/rag-upload',
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
      const contentType = request.headers['content-type']
      let rawBody
      try {
        rawBody = await readRawBody(request, ragUploadLimitBytes())
      } catch (error) {
        sendJson(response, 413, { ok: false, error: 'TOO_LARGE: ' + String(error && error.message ? error.message : error) })
        return
      }
      const invalid = validateRagUpload(contentType, rawBody.length, ragUploadLimitBytes())
      if (invalid) {
        sendJson(response, 400, { ok: false, error: 'BAD_REQUEST: ' + invalid })
        return
      }
      const built = buildRagUploadRequest(rawBody, contentType, clientBase({}), request.headers.authorization)
      const upstreamResponse = await fetchUpstream(built.url, Object.assign({}, built.init, {
        signal: AbortSignal.timeout(built.timeoutMs),
      }))
      const read = await readUpstream(upstreamResponse)
      const result = toResult(read)
      sendJson(response, result.ok ? 200 : Math.max(400, Math.min(result.status, 599)), result)
    },
  })

  console.log('[skilltree-student-ui] student dashboard ready (routes: /skilltree-student/config|batch|quiz-submit|mastery-update|rag-upload|rag-ask, gateway: ' + gatewayBaseUrl() + ')')
}
