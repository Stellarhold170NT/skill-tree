/**
 * skilltree-course-ui — HOST half.
 * Registers one same-origin HTTP route for the teacher course & curriculum management panel:
 *   POST /courseui/proxy  { baseUrl, token?, method, path, body? }
 * and forwards it to the platform api-gateway (M10) which maps:
 *   {baseUrl}/class/courses*     -> class-service (M6)
 *   {baseUrl}/documents/*        -> document-service (M9)
 *   {baseUrl}/case/*             -> opencase-service (M1)
 *   {baseUrl}/rag/*              -> rag-service (M8)
 */
export const name = 'skilltree-course-ui'
export const inject = ['webServer']

const ALLOWED_METHODS = new Set(['GET', 'POST', 'PATCH', 'DELETE'])
const PATH_RE = /^[A-Za-z0-9][A-Za-z0-9/_.~-]*(\?[A-Za-z0-9/_.~=&%-]*)?$/
const BODY_LIMIT_BYTES = 512 * 1024

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

export async function forwardCourseRequest(input, fetchImpl) {
  const fetchFn = typeof fetchImpl === 'function' ? fetchImpl : globalThis.fetch
  if (typeof fetchFn !== 'function') {
    return { ok: false, status: 0, error: 'fetch unavailable in host runtime' }
  }
  let baseUrl = input && typeof input.baseUrl === 'string' ? input.baseUrl.trim() : ''
  if (!baseUrl || baseUrl === 'http://localhost:8000') {
    baseUrl = process.env.API_GATEWAY_URL || 'http://api-gateway:8000'
  }
  baseUrl = baseUrl.replace(/\/+$/, '')

  const method = input && typeof input.method === 'string' ? input.method.toUpperCase() : 'GET'
  if (!ALLOWED_METHODS.has(method)) {
    return { ok: false, status: 400, error: 'method not allowed' }
  }

  const path = input && typeof input.path === 'string' ? input.path.trim().replace(/^\/+/, '') : ''
  if (!path || !PATH_RE.test(path)) {
    return { ok: false, status: 400, error: 'invalid path' }
  }

  const targetUrl = `${baseUrl}/${path}`
  const headers = { 'accept': 'application/json' }
  if (input && typeof input.token === 'string' && input.token.trim()) {
    headers['authorization'] = `Bearer ${input.token.trim()}`
  }

  const init = { method, headers }
  if (method !== 'GET' && input && input.body !== undefined) {
    headers['content-type'] = 'application/json'
    init.body = typeof input.body === 'string' ? input.body : JSON.stringify(input.body)
  }

  try {
    const upstream = await fetchFn(targetUrl, init)
    const text = await upstream.text()
    let data = null
    if (text) {
      try { data = JSON.parse(text) } catch { data = text }
    }
    if (!upstream.ok) {
      return {
        ok: false,
        status: upstream.status,
        error: `HTTP ${upstream.status}`,
        details: data,
      }
    }
    return { ok: true, status: upstream.status, data }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: String(error && error.message ? error.message : error),
    }
  }
}

export function apply(ctx) {
  ctx.webServer.register({
    kind: 'exact',
    path: '/courseui/proxy',
    handler: async (request, response) => {
      if (request.method !== 'POST') {
        response.writeHead(405, { allow: 'POST' })
        response.end()
        return
      }
      if (!isSameOrigin(request)) {
        sendJson(response, 403, { ok: false, error: 'UNTRUSTED_ORIGIN: cross-origin POST rejected' })
        return
      }
      let body
      try {
        body = await readJsonBody(request)
      } catch (err) {
        sendJson(response, 400, { ok: false, error: `BAD_REQUEST: ${err.message}` })
        return
      }

      const res = await forwardCourseRequest(body)
      sendJson(response, res.ok ? 200 : (res.status >= 400 ? res.status : 502), res)
    },
  })

  console.log('[skilltree-course-ui] ready (route: POST /courseui/proxy)')
}
