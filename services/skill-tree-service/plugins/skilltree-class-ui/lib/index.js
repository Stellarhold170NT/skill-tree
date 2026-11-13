/**
 * skilltree-class-ui — HOST half.
 * Registers one same-origin HTTP route for the teacher class-management panel:
 *   POST /classui/proxy  { baseUrl, token?, method, path, body? }
 * and forwards it to the platform api-gateway (M10) which maps
 *   {baseUrl}/class/{rest}  ->  class-service (M6) /api/v1/{rest}.
 * The browser never talks to service addresses directly (same principle as
 * roadmap-viewer's RPC), and the teacher JWT (from auth-ui / M11) is attached
 * here as `Authorization: Bearer <token>` when provided. Tokens are never
 * logged and never persisted server-side.
 */
export const name = 'skilltree-class-ui'
export const inject = ['webServer']

const ALLOWED_METHODS = new Set(['GET', 'POST', 'PATCH', 'DELETE'])
// OneRoster rest path, optionally with a query string. No '..', no scheme tricks.
const PATH_RE = /^[A-Za-z0-9][A-Za-z0-9/_.~-]*(\?[A-Za-z0-9/_.~=&%-]*)?$/
const BODY_LIMIT_BYTES = 64 * 1024

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
    const url = new URL(origin)
    const localHostnames = new Set(['localhost', '127.0.0.1', '[::1]',
      // vAi deployment authorities (LAN + public gateway)
      '${DEV_HOST}', '${EDGE_HOST}'])
    return url.host === host && localHostnames.has(url.hostname)
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

/**
 * Validate the client request and forward it to the class upstream through
 * the gateway. Pure except for the outbound fetch; `fetchImpl` is injectable
 * for tests.
 * @returns {Promise<{ok: boolean, status: number, data?: unknown, error?: string, details?: unknown}>}
 */
export async function forwardClassRequest(input, fetchImpl) {
  const fetchFn = typeof fetchImpl === 'function' ? fetchImpl : globalThis.fetch
  if (typeof fetchFn !== 'function') {
    return { ok: false, status: 0, error: 'fetch unavailable in host runtime' }
  }
  let baseUrl = input && typeof input.baseUrl === 'string' ? input.baseUrl.trim() : ''
  if (!baseUrl || baseUrl === 'http://localhost:8000') {
    // If running in docker container, api-gateway:8000 is the internal service network
    baseUrl = process.env.API_GATEWAY_URL || 'http://api-gateway:8000'
  }
  if (!/^https?:\/\//i.test(baseUrl) || /[\s]/.test(baseUrl)) {
    return { ok: false, status: 0, error: 'invalid or missing baseUrl (must start with http:// or https://)' }
  }
  const method = input && typeof input.method === 'string' ? input.method.toUpperCase() : 'GET'
  if (!ALLOWED_METHODS.has(method)) {
    return { ok: false, status: 0, error: 'unsupported method (allowed: GET, POST, PATCH, DELETE)' }
  }
  const rest = input && typeof input.path === 'string' ? input.path.replace(/^\/+/, '') : ''
  if (!PATH_RE.test(rest) || rest.includes('..')) {
    return { ok: false, status: 0, error: 'invalid resource path' }
  }
  const token = input && typeof input.token === 'string' ? input.token.trim() : ''

  const headers = { accept: 'application/json' }
  if (token) headers.authorization = 'Bearer ' + token
  let body
  if (method === 'POST' || method === 'PATCH') {
    if (!input.body || typeof input.body !== 'object' || Array.isArray(input.body)) {
      return { ok: false, status: 0, error: method + ' requires a JSON object body' }
    }
    headers['content-type'] = 'application/json'
    body = JSON.stringify(input.body)
  }

  const url = baseUrl.replace(/\/+$/, '') + '/class/' + rest
  let resp
  try {
    resp = await fetchFn(url, { method, headers, body, redirect: 'error' })
  } catch (err) {
    const message = err && err.message ? err.message : String(err)
    return { ok: false, status: 0, error: 'upstream unreachable: ' + message }
  }
  const text = await resp.text()
  let data
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  if (!resp.ok) {
    const envelope = data && typeof data === 'object' && data.error ? data.error : null
    return {
      ok: false,
      status: resp.status,
      error: envelope
        ? envelope.code + ': ' + envelope.message
        : 'HTTP ' + resp.status,
      details: envelope && envelope.details ? envelope.details : undefined,
    }
  }
  return { ok: true, status: resp.status, data }
}

/**
 * Register the proxy route on the host web server.
 * @param ctx - cordis host context with the webServer service.
 */
export function apply(ctx) {
  ctx.webServer.register({
    kind: 'exact',
    path: '/classui/proxy',
    handler: async (request, response) => {
      if (request.method !== 'POST') {
        response.writeHead(405, { allow: 'POST' })
        response.end()
        return
      }
      if (!isSameOrigin(request)) {
        sendJson(response, 403, { ok: false, status: 403, error: 'untrusted origin' })
        return
      }
      try {
        const body = await readJsonBody(request)
        const result = await forwardClassRequest(body)
        sendJson(response, 200, result)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        sendJson(response, 400, { ok: false, status: 0, error: 'bad proxy request: ' + message })
      }
    },
  })
  console.log('[skilltree-class-ui] teacher class management ready (route: POST /classui/proxy)')
}
