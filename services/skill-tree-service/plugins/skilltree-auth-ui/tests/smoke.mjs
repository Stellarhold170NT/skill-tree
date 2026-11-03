/**
 * skilltree-auth-ui — host-half smoke test (Node ≥ 18, no dependencies).
 *
 * Verifies the real proxy behavior of lib/index.js against fake harness
 * webServer + fake M11-behind-gateway upstreams:
 *   T1  GET  /skilltree-auth/config  → gatewayPrefix "auth"
 *   T2  POST /skilltree-auth/login with default gateway (nothing listening) → 502 UPSTREAM_UNAVAILABLE
 *   T3  POST /skilltree-auth/login via __baseUrl → M11 LoginResponse passes through
 *   T4  POST /skilltree-auth/register → X-Admin-Token forwarded, __baseUrl stripped
 *   T5  POST /skilltree-auth/verify → Authorization header forwarded
 *   T6  cross-origin POST → 403 UNTRUSTED_ORIGIN
 *   T7  GET on a POST route → 405
 *   T8  non-http(s) __baseUrl → ignored (falls back to default gateway)
 *
 * Run:  node tests/smoke.mjs   (from the plugin directory)
 */
import http from 'node:http'

// Deterministic "default gateway" for T2/T8: point the env default at a dead
// port so the check never depends on what happens to listen on :8000 locally.
process.env.SKILLTREE_GATEWAY_URL = 'http://127.0.0.1:9'

const PORT_PROXY = 9301
const PORT_UPSTREAM = 9302

// --- fake harness webServer: collect routes, serve them ---
const routes = new Map()
const ctx = { webServer: { register: (route) => routes.set(route.path, route.handler) } }
const plugin = await import(new URL('../lib/index.js', import.meta.url))
plugin.apply(ctx)
console.log('PLUGIN', plugin.name, 'routes:', [...routes.keys()].join(', '))

const proxy = http.createServer(async (req, res) => {
  const handler = routes.get(req.url.split('?')[0])
  if (!handler) { res.writeHead(404); res.end(); return }
  await handler(req, res)
})
await new Promise((resolve) => proxy.listen(PORT_PROXY, resolve))

// --- fake gateway/upstream (echo + canned M11 login response) ---
const upstream = http.createServer(async (req, res) => {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const body = Buffer.concat(chunks).toString('utf8')
  // The fake upstream plays the M10 gateway: /{prefix}/{rest} → /api/v1/{rest}
  const rest = req.url.startsWith('/auth/') ? req.url.slice('/auth/'.length) : null
  if (rest === 'auth/login') {
    const parsed = JSON.parse(body || '{}')
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({
      accessToken: 'fake.jwt.token', tokenType: 'Bearer', expiresIn: 3600,
      user: { id: 'u1', username: parsed.username, role: 'admin', sourcedId: null, createdAt: '2026-10-31T00:00:00Z' },
    }))
    return
  }
  res.writeHead(200, { 'content-type': 'application/json' })
  res.end(JSON.stringify({
    echoPath: req.url,
    echoAuth: req.headers.authorization || null,
    echoAdmin: req.headers['x-admin-token'] || null,
    echoBody: body,
  }))
})
await new Promise((resolve) => upstream.listen(PORT_UPSTREAM, resolve))

const ORIGIN = { origin: 'http://127.0.0.1:' + PORT_PROXY, host: '127.0.0.1:' + PORT_PROXY }
const post = (path, body, headers = {}) => fetch('http://127.0.0.1:' + PORT_PROXY + path, {
  method: 'POST',
  headers: Object.assign({}, ORIGIN, { 'content-type': 'application/json' }, headers),
  body: JSON.stringify(body),
})

let failures = 0
function check(label, condition, detail) {
  if (condition) console.log('PASS', label, detail ? '(' + detail + ')' : '')
  else { failures += 1; console.log('FAIL', label, detail ? '(' + detail + ')' : '') }
}

// T1 config
const config = await (await fetch('http://127.0.0.1:' + PORT_PROXY + '/skilltree-auth/config')).json()
check('T1 config', config.gatewayPrefix === 'auth' && config.upstream.includes('M11'), JSON.stringify(config))

// T2 default gateway unreachable → 502 envelope
const loginDefault = await post('/skilltree-auth/login', { username: 'a', password: 'b' })
const loginDefaultBody = await loginDefault.json()
check('T2 default gateway 502', loginDefault.status === 502 && loginDefaultBody.error.code === 'UPSTREAM_UNAVAILABLE', 'status=' + loginDefault.status)

// T3 login via __baseUrl → real passthrough of the M11 LoginResponse
const loginOk = await post('/skilltree-auth/login', { username: 'huy', password: 'password123', __baseUrl: 'http://127.0.0.1:' + PORT_UPSTREAM })
const loginOkBody = await loginOk.json()
check('T3 login passthrough', loginOk.status === 200 && loginOkBody.accessToken === 'fake.jwt.token' && loginOkBody.user.role === 'admin', 'body=' + JSON.stringify(loginOkBody).slice(0, 140))

// T4 register forwards X-Admin-Token, strips __baseUrl
const registerResp = await post('/skilltree-auth/register', { username: 'gv1', password: 'password123', role: 'teacher', __baseUrl: 'http://127.0.0.1:' + PORT_UPSTREAM }, { 'x-admin-token': 'ADMIN-SECRET' })
const registerBody = await registerResp.json()
check('T4a x-admin-token forwarded', registerBody.echoAdmin === 'ADMIN-SECRET', String(registerBody.echoAdmin))
check('T4b __baseUrl stripped', !registerBody.echoBody.includes('__baseUrl'), '')
check('T4c authorization empty ok', registerBody.echoAuth === null, String(registerBody.echoAuth))

// T5 verify forwards Authorization (via the fake gateway; __baseUrl is stripped)
const verifyResp = await post('/skilltree-auth/verify', { __baseUrl: 'http://127.0.0.1:' + PORT_UPSTREAM }, { authorization: 'Bearer fake.jwt.token' })
const verifyBody = await verifyResp.json()
check('T5 authorization forwarded', verifyBody.echoAuth === 'Bearer fake.jwt.token', 'body=' + JSON.stringify(verifyBody).slice(0, 140))

// T6 cross-origin blocked
const evil = await fetch('http://127.0.0.1:' + PORT_PROXY + '/skilltree-auth/login', {
  method: 'POST',
  headers: { origin: 'http://evil.example', host: '127.0.0.1:' + PORT_PROXY, 'content-type': 'application/json' },
  body: '{}',
})
const evilBody = await evil.json()
check('T6 cross-origin 403', evil.status === 403 && evilBody.error.code === 'UNTRUSTED_ORIGIN', 'status=' + evil.status)

// T7 wrong method
const wrongMethod = await fetch('http://127.0.0.1:' + PORT_PROXY + '/skilltree-auth/login')
check('T7 GET on POST route 405', wrongMethod.status === 405, 'status=' + wrongMethod.status)

// T8 non-http(s) __baseUrl ignored (falls back to default gateway → 502)
const badBase = await post('/skilltree-auth/login', { username: 'a', password: 'b', __baseUrl: 'ftp://bad' })
check('T8 bad __baseUrl ignored', badBase.status === 502, 'status=' + badBase.status)

proxy.close()
upstream.close()
if (failures > 0) {
  console.log('SMOKE FAILED: ' + failures + ' check(s)')
  process.exit(1)
}
console.log('SMOKE ALL PASS (8/8)')
