/**
 * skilltree-auth-ui — HOST half.
 *
 * Mounts same-origin HTTP routes for the client half (Settings "Tài khoản" tab).
 * The browser never talks to M10/M11 directly: this half proxies the fixed
 * allow-list of M11 auth endpoints through the M10 api-gateway.
 *
 *   GET  /skilltree-auth/config    → { gatewayBaseUrl }  (host-configured default)
 *   POST /skilltree-auth/login     → {base}/auth/auth/login      (M11 POST /api/v1/auth/login)
 *   POST /skilltree-auth/register  → {base}/auth/auth/register   (forwards X-Admin-Token)
 *   POST /skilltree-auth/verify    → {base}/auth/auth/verify     (forwards Authorization)
 *
 * Gateway routing contract (services/api-gateway): /{prefix}/{rest} →
 * {upstream}/api/v1/{rest}; prefix "auth" maps to auth-service (M11 :8108),
 * so the wire path is {base}/auth/auth/login.
 *
 * Base URL (env-configurable, 12-factor):
 *   SKILLTREE_GATEWAY_URL — default http://localhost:8000
 * The client may also send an optional `__baseUrl` field (validated http(s))
 * to point at a different gateway; the field is stripped before forwarding.
 *
 * Secrets discipline: tokens/body values are never logged; only allow-listed
 * routes exist; POSTs must be same-origin; bodies are capped at 16 KiB.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const name = 'skilltree-auth-ui-v2'
export const inject = ['webServer']

const DEFAULT_GATEWAY = 'http://localhost:8000'
const BODY_LIMIT_BYTES = 16 * 1024
const UPSTREAM_TIMEOUT_MS = 10_000

/** M11 sub-paths (after the gateway "auth" prefix). Fixed allow-list. */
const UPSTREAM_PATHS = {
  login: 'auth/login',
  register: 'auth/register',
  verify: 'auth/verify',
}

const HOP_BY_HOP = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailers', 'transfer-encoding', 'upgrade', 'host', 'content-length',
])

function gatewayBaseUrl() {
  const raw = process.env.SKILLTREE_GATEWAY_URL
  const base = typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : DEFAULT_GATEWAY
  return base.replace(/\/+$/, '')
}

function isHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value) && value.length <= 2048
}

function sendJson(response, status, value, extraHeaders) {
  response.writeHead(status, Object.assign({
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
  }, extraHeaders || {}))
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
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

/**
 * Build the upstream request for one allow-listed M11 call.
 * Returns { url, init } — path fixed by `key`, base from env or `__baseUrl`.
 */
function buildUpstream(key, body, request) {
  const base = body && isHttpUrl(body.__baseUrl)
    ? String(body.__baseUrl).replace(/\/+$/, '')
    : gatewayBaseUrl()
  const url = base + '/auth/' + UPSTREAM_PATHS[key]

  const headers = { 'content-type': 'application/json' }
  const auth = request.headers.authorization
  if (typeof auth === 'string' && auth !== '') headers.authorization = auth
  if (key === 'register') {
    const adminToken = request.headers['x-admin-token']
    if (typeof adminToken === 'string' && adminToken !== '') headers['x-admin-token'] = adminToken
  }

  // Strip the transport-only field; forward the rest verbatim to M11.
  const payload = Object.assign({}, body)
  delete payload.__baseUrl

  return {
    url,
    init: {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    },
  }
}

async function proxyAuthRoute(key, request, response) {
  if (request.method !== 'POST') {
    response.writeHead(405, { allow: 'POST' })
    response.end()
    return
  }
  if (!isSameOrigin(request)) {
    sendJson(response, 403, { error: { code: 'UNTRUSTED_ORIGIN', message: 'Cross-origin POST is not allowed', details: {} } })
    return
  }
  let body
  try {
    body = await readJsonBody(request)
  } catch (error) {
    sendJson(response, 400, { error: { code: 'BAD_REQUEST', message: 'Invalid JSON body: ' + String(error && error.message ? error.message : error), details: {} } })
    return
  }
  let upstream
  try {
    upstream = buildUpstream(key, body, request)
  } catch (error) {
    sendJson(response, 400, { error: { code: 'BAD_REQUEST', message: String(error && error.message ? error.message : error), details: {} } })
    return
  }
  try {
    const upstreamResponse = await fetch(upstream.url, upstream.init)
    const text = await upstreamResponse.text()
    const forwardHeaders = {}
    for (const [headerName, headerValue] of upstreamResponse.headers) {
      const lower = headerName.toLowerCase()
      if (!HOP_BY_HOP.has(lower) && lower !== 'set-cookie' && lower !== 'content-length') {
        forwardHeaders[headerName] = headerValue
      }
    }
    response.writeHead(upstreamResponse.status, Object.assign({
      'cache-control': 'no-store',
    }, forwardHeaders))
    response.end(text)
  } catch (error) {
    sendJson(response, 502, {
      error: {
        code: 'UPSTREAM_UNAVAILABLE',
        message: 'Gateway/auth-service unreachable: ' + String(error && error.message ? error.message : error),
        details: {},
      },
    })
  }
}

function getAssetBuffer(filename) {
  const candidates = [
    path.resolve(__dirname, '../../vai-branding-plugin/assets', filename),
    path.resolve(__dirname, '../assets', filename),
  ]
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return fs.readFileSync(c)
    } catch {}
  }
  return null
}

/**
 * Mount the auth proxy routes on the harness web server.
 * @param ctx - cordis host context providing the webServer service.
 */
export function apply(ctx) {
  function serveSvg(filename) {
    return (request, response) => {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.writeHead(405, { allow: 'GET, HEAD' })
        response.end()
        return
      }
      const buf = getAssetBuffer(filename)
      if (!buf) {
        response.writeHead(404)
        response.end(filename + ' not found')
        return
      }
      response.writeHead(200, {
        'content-type': 'image/svg+xml; charset=utf-8',
        'cache-control': 'public, max-age=86400',
      })
      if (request.method === 'HEAD') response.end()
      else response.end(buf)
    }
  }

  ctx.webServer.register({
    kind: 'exact',
    path: '/skilltree-auth/logo.svg',
    handler: serveSvg('logo.svg'),
  })

  ctx.webServer.register({
    kind: 'exact',
    path: '/skilltree-auth/icon.svg',
    handler: serveSvg('icon.svg'),
  })

  ctx.webServer.register({
    kind: 'exact',
    path: '/skilltree-auth/config',
    handler: async (request, response) => {
      if (request.method !== 'GET') {
        response.writeHead(405, { allow: 'GET' })
        response.end()
        return
      }
      sendJson(response, 200, {
        gatewayBaseUrl: gatewayBaseUrl(),
        gatewayPrefix: 'auth',
        upstream: 'auth-service (M11)',
      })
    },
  })

  ctx.webServer.register({
    kind: 'exact',
    path: '/skilltree-auth/login',
    handler: (request, response) => proxyAuthRoute('login', request, response),
  })

  ctx.webServer.register({
    kind: 'exact',
    path: '/skilltree-auth/register',
    handler: (request, response) => proxyAuthRoute('register', request, response),
  })

  ctx.webServer.register({
    kind: 'exact',
    path: '/skilltree-auth/verify',
    handler: (request, response) => proxyAuthRoute('verify', request, response),
  })

  console.log('[skilltree-auth-ui] auth proxy ready (routes: /skilltree-auth/config|login|register|verify, gateway: ' + gatewayBaseUrl() + ')')
}
