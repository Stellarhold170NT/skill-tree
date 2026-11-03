/**
 * skilltree-graph-dashboard — HOST half (skill-tree harness module format).
 *
 * Mounts same-origin HTTP routes for the dashboard client half — the proven
 * pattern of skilltree-teacher-ui / skilltree-student-ui. The page never
 * addresses services directly; every upstream call happens here.
 *
 *   GET  /skilltree-graph/config         → { routes }
 *   POST /skilltree-graph/list-subjects  { baseUrl }                     → M1 GET /api/v1/documents?limit=200
 *   POST /skilltree-graph/get-graph      { baseUrl, documentId }          → M1 GET /api/v1/documents/{id}/graph
 *   POST /skilltree-graph/get-materials  { baseUrl, documentId, documentUri? } → M9 chunks
 *   POST /skilltree-graph/get-mastery    { baseUrl, studentId, asOf? }    → M5 GET /api/v1/students/{id}/mastery
 *
 * Response envelope identical to the previous host.call contract:
 *   { ok: true, data } | { ok: false, error }
 *
 * M1↔M9 join: document-service links a document row to the M1 CFDocument via
 * `Document.documentUri` (the M1 CFDocument.identifier) — the two services do
 * NOT share primary keys. When documentUri is given, get-materials first
 * resolves the M9 row (GET /api/v1/documents?limit=200, match documentUri) and
 * then lists its chunks; without it the call falls back to the raw documentId.
 *
 * Only the base URL comes from the client; paths/ids are composed and encoded
 * here, and the base must be an http(s) URL.
 */
export const name = 'skilltree-graph-dashboard'
export const inject = ['webServer']

const BODY_LIMIT_BYTES = 64 * 1024
const UPSTREAM_TIMEOUT_MS = 10_000

function isHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value) && value.length <= 2048
}

function guardUrl(url, label) {
  if (!isHttpUrl(url)) throw new Error(label + ': invalid or missing base url')
  return String(url).replace(/\/+$/, '')
}

function guardId(value, label) {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  if (!trimmed) throw new Error(label + ' is required')
  return encodeURIComponent(trimmed)
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
  try { return new URL(origin).host === host } catch { return false }
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

async function fetchUpstream(url) {
  if (typeof globalThis.fetch !== 'function') throw new Error('fetch unavailable in host runtime')
  try {
    return await globalThis.fetch(url, { redirect: 'error', signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) })
  } catch (err) {
    throw new Error('upstream unreachable: ' + String(err && err.message ? err.message : err))
  }
}

async function fetchJson(url) {
  const response = await fetchUpstream(url)
  const text = await response.text()
  if (!response.ok) throw new Error('HTTP ' + response.status)
  try { return JSON.parse(text) } catch { throw new Error('upstream returned non-JSON') }
}

/** One POST route with same-origin + JSON-body guards. */
function postRoute(ctx, path, handler) {
  ctx.webServer.register({
    kind: 'exact',
    path,
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
      try {
        sendJson(response, 200, await handler(body))
      } catch (error) {
        sendJson(response, 200, { ok: false, error: 'skilltree: ' + String(error && error.message ? error.message : error) })
      }
    },
  })
}

export function apply(ctx) {
  postRoute(ctx, '/skilltree-graph/list-subjects', async (body) => {
    const base = guardUrl(body && body.baseUrl, 'list-subjects')
    const data = await fetchJson(base + '/api/v1/documents?limit=200')
    const rows = Array.isArray(data) ? data : []
    return { ok: true, data: rows.map((d) => ({ id: d.id, identifier: d.identifier, title: d.title })) }
  })

  postRoute(ctx, '/skilltree-graph/get-graph', async (body) => {
    const base = guardUrl(body && body.baseUrl, 'get-graph')
    const docId = guardId(body && body.documentId, 'documentId')
    const data = await fetchJson(base + '/api/v1/documents/' + docId + '/graph')
    return { ok: true, data }
  })

  postRoute(ctx, '/skilltree-graph/get-materials', async (body) => {
    const base = guardUrl(body && body.baseUrl, 'get-materials')
    const docId = guardId(body && body.documentId, 'documentId')
    // Resolve the M9 row by documentUri (the M1 CFDocument identifier) —
    // M9 primary ids are locally generated and differ from M1 ids.
    const uri = body && typeof body.documentUri === 'string' ? body.documentUri.trim() : ''
    let docRef = docId
    if (uri) {
      const rows = await fetchJson(base + '/api/v1/documents?limit=200')
      const list = Array.isArray(rows) ? rows : []
      const match = list.find((d) => d && d.documentUri === uri)
      if (match && match.id) docRef = encodeURIComponent(match.id)
    }
    const data = await fetchJson(base + '/api/v1/documents/' + docRef + '/chunks')
    return { ok: true, data: Array.isArray(data) ? data : [] }
  })

  postRoute(ctx, '/skilltree-graph/get-mastery', async (body) => {
    const base = guardUrl(body && body.baseUrl, 'get-mastery')
    const studentId = guardId(body && body.studentId, 'studentId')
    const asOf = body && typeof body.asOf === 'string' && body.asOf.trim() !== ''
      ? '?asOf=' + encodeURIComponent(body.asOf.trim())
      : ''
    const data = await fetchJson(base + '/api/v1/students/' + studentId + '/mastery' + asOf)
    return { ok: true, data }
  })

  ctx.webServer.register({
    kind: 'exact',
    path: '/skilltree-graph/config',
    handler: async (request, response) => {
      if (request.method !== 'GET') {
        response.writeHead(405, { allow: 'GET' })
        response.end()
        return
      }
      sendJson(response, 200, {
        routes: ['/skilltree-graph/list-subjects', '/skilltree-graph/get-graph', '/skilltree-graph/get-materials', '/skilltree-graph/get-mastery'],
        upstream: 'M1 opencase (graph) · M9 document-service (chunks) · M5 learner-model (mastery)',
      })
    },
  })

  console.log('[skilltree-graph-dashboard] ready (routes: /skilltree-graph/config|list-subjects|get-graph|get-materials|get-mastery)')
}
