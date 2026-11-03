/**
 * roadmap-viewer — HOST half (skill-tree harness module format).
 *
 * Mounts one same-origin POST route for the viewer client half:
 *
 *   GET  /roadmap-viewer/config      → { routes }
 *   POST /roadmap-viewer/get-graph   { url } → fetch the M1 graph JSON
 *
 * The client composes the full M1 URL ({baseUrl}/api/v1/documents/{id}/graph);
 * the host only validates that it is an http(s) URL and fetches it server-side.
 * Response envelope identical to the previous host.call contract:
 *   { ok: true, data } | { ok: false, error }
 */
export const name = 'roadmap-viewer'
export const inject = ['webServer']

const BODY_LIMIT_BYTES = 16 * 1024
const UPSTREAM_TIMEOUT_MS = 10_000

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

export function apply(ctx) {
  ctx.webServer.register({
    kind: 'exact',
    path: '/roadmap-viewer/get-graph',
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
      const url = body && typeof body.url === 'string' ? body.url : ''
      if (!/^https?:\/\//i.test(url)) {
        sendJson(response, 200, { ok: false, error: 'roadmap: invalid or missing url' })
        return
      }
      try {
        if (typeof globalThis.fetch !== 'function') throw new Error('fetch unavailable in host runtime')
        const upstream = await globalThis.fetch(url, { redirect: 'error', signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) })
        const text = await upstream.text()
        if (!upstream.ok) throw new Error('HTTP ' + upstream.status)
        const data = JSON.parse(text)
        sendJson(response, 200, { ok: true, data })
      } catch (error) {
        sendJson(response, 200, { ok: false, error: 'roadmap: ' + String(error && error.message ? error.message : error) })
      }
    },
  })

  ctx.webServer.register({
    kind: 'exact',
    path: '/roadmap-viewer/config',
    handler: async (request, response) => {
      if (request.method !== 'GET') {
        response.writeHead(405, { allow: 'GET' })
        response.end()
        return
      }
      sendJson(response, 200, { routes: ['/roadmap-viewer/get-graph'], upstream: 'M1 opencase (graph)' })
    },
  })

  console.log('[roadmap-viewer] ready (routes: /roadmap-viewer/config|get-graph)')
}
