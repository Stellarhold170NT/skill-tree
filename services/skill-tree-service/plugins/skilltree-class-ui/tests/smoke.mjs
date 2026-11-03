/**
 * End-to-end smoke for the skilltree-class-ui plugin (no test framework needed).
 *
 * Starts the REAL class-service (M6, uvicorn + temp sqlite), a minimal
 * api-gateway shim (:8000) implementing the documented M10 mapping
 * `/class/{rest}` -> M6 `/api/v1/{rest}`, registers the REAL host route
 * (`apply()` on a stub ctx) and drives the proxy like the panel does.
 *
 * Run from the repo root:  node services/skill-tree-service/plugins/skilltree-class-ui/tests/smoke.mjs
 * Exits 0 when every check passes.
 */
import { spawn } from 'node:child_process'
import http from 'node:http'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const PLUGIN_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REPO = path.resolve(PLUGIN_ROOT, '../../../..')
const CLASS_SVC = path.join(REPO, 'services', 'class-service')
const { apply, forwardClassRequest } = await import(path.join(PLUGIN_ROOT, 'lib', 'index.js'))

const M6 = 8103, GW = 8000, LOCAL = 'http://localhost:' + GW
let pass = 0, fail = 0
function check(name, cond, extra) {
  if (cond) { pass++; console.log('PASS', name, extra === undefined ? '' : String(extra).slice(0, 160)) }
  else { fail++; console.log('FAIL', name, extra === undefined ? '' : String(extra).slice(0, 300)) }
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// --- start real M6 ---
const m6 = spawn('python3', ['-m', 'uvicorn', 'app.main:app', '--port', String(M6)], {
  cwd: CLASS_SVC,
  env: { ...process.env, DATABASE_URL: 'sqlite:////tmp/skilltree-classui-smoke.db' }, stdio: 'ignore',
})
process.on('exit', () => { try { m6.kill('SIGTERM') } catch { /* already gone */ } })
async function waitHealth(url, tries) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url); if (r.ok) return true } catch { /* not up yet */ }
    await sleep(500)
  }
  return false
}
check('M6 up :8103', await waitHealth('http://127.0.0.1:' + M6 + '/api/v1/health', 60))

// --- gateway shim :8000  /class/{rest} -> M6 /api/v1/{rest} ---
let lastAuth = null
const shim = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost:' + GW)
  if (!url.pathname.startsWith('/class/')) { res.writeHead(404); res.end(); return }
  lastAuth = req.headers.authorization || null
  const rest = '/api/v1' + url.pathname.slice('/class'.length) // M10 mapping: /class/{rest} -> /api/v1/{rest}
  const target = 'http://127.0.0.1:' + M6 + rest + url.search
  const chunks = []
  req.on('data', c => chunks.push(c))
  req.on('end', () => {
    const body = Buffer.concat(chunks)
    const upReq = http.request(target, {
      method: req.method,
      headers: { 'content-type': req.headers['content-type'] || 'application/json', accept: 'application/json' },
    }, upRes => {
      const b = []
      upRes.on('data', c => b.push(c))
      upRes.on('end', () => { res.writeHead(upRes.statusCode, { 'content-type': 'application/json' }); res.end(Buffer.concat(b)) })
    })
    upReq.on('error', () => { res.writeHead(502); res.end('{"error":{"code":"BAD_GATEWAY","message":"upstream down","details":{}}}') })
    if (body.length) upReq.write(body)
    upReq.end()
  })
})
await new Promise(r => shim.listen(GW, r))
check('gateway shim up :8000', true)

// --- register the real host route on a stub ctx ---
const routes = []
const ctx = { webServer: { register: (route) => routes.push(route) } }
apply(ctx)
const proxy = routes.find(r => r.path === '/classui/proxy').handler
check('host route registered', !!proxy)

function makeReq(method, headers, bodyObj) {
  const body = bodyObj === undefined ? '' : JSON.stringify(bodyObj)
  return { method, headers, async *[Symbol.asyncIterator]() { if (body) yield Buffer.from(body) } }
}
function makeRes() {
  const res = { statusCode: null, headers: null, body: '' }
  res.writeHead = (status, headers) => { res.statusCode = status; res.headers = headers }
  res.end = (data) => { res.body = data ? String(data) : '' }
  return res
}
async function callProxy(payload, headers) {
  const req = makeReq('POST', headers || { origin: 'http://localhost:8099', host: 'localhost:8099' }, payload)
  const res = makeRes()
  await proxy(req, res)
  let data = null
  try { data = JSON.parse(res.body || 'null') } catch { data = res.body }
  return { status: res.statusCode, data }
}
const BASE = { baseUrl: LOCAL }
const TOK = { baseUrl: LOCAL, token: 'jwt-teacher-token-123' }

// 1. health through proxy + token attachment
{
  const r = await callProxy({ ...TOK, method: 'GET', path: 'health' })
  check('health via proxy', !!r.data && r.data.ok === true && !!r.data.data && r.data.data.status === 'ok', JSON.stringify(r.data))
  check('token attached as Bearer', lastAuth === 'Bearer jwt-teacher-token-123', String(lastAuth))
  await callProxy({ ...BASE, method: 'GET', path: 'health' })
  check('no token -> no auth header', lastAuth === null, String(lastAuth))
}
// 2. create class
let cls
{
  const r = await callProxy({ ...TOK, method: 'POST', path: 'classes', body: { title: 'Toán 10A1', term: 'HK1 2026' } })
  cls = r.data && r.data.ok && r.data.data ? r.data.data : null
  check('create class 201', !!cls && !!cls.sourcedId, JSON.stringify(r.data))
}
// 3. PATCH class (rename + term) — the edit-class feature
{
  const r = await callProxy({ ...TOK, method: 'PATCH', path: 'classes/' + cls.sourcedId, body: { title: 'Toán 10A1 (chuyên)', term: 'HK2 2026' } })
  const d = r.data && r.data.data
  check('PATCH class 200 + updated', !!r.data && r.data.ok && d.title === 'Toán 10A1 (chuyên)' && d.term === 'HK2 2026', JSON.stringify(r.data))
  const g = await callProxy({ ...TOK, method: 'GET', path: 'classes/' + cls.sourcedId })
  check('PATCH persisted on GET', !!g.data && !!g.data.data && g.data.data.title === 'Toán 10A1 (chuyên)', JSON.stringify(g.data))
}
// 4. PATCH guards
{
  const r1 = await callProxy({ ...TOK, method: 'PATCH', path: 'classes/' + cls.sourcedId })
  check('PATCH without body -> host error', !!r1.data && !r1.data.ok && /PATCH requires a JSON object body/.test(r1.data.error || ''), JSON.stringify(r1.data))
  const r2 = await callProxy({ ...TOK, method: 'PATCH', path: 'classes/does-not-exist', body: { title: 'X' } })
  check('PATCH missing class -> 404 CLASS_NOT_FOUND', !!r2.data && !r2.data.ok && /CLASS_NOT_FOUND/.test(r2.data.error || ''), JSON.stringify(r2.data))
  const r3 = await callProxy({ ...TOK, method: 'PATCH', path: 'classes/' + cls.sourcedId, body: { courseSourcedId: 'missing' } })
  check('PATCH bad course ref -> 404 COURSE_NOT_FOUND', !!r3.data && !r3.data.ok && /COURSE_NOT_FOUND/.test(r3.data.error || ''), JSON.stringify(r3.data))
}
// 5. enroll flow (regression of the first run's checks)
{
  const u = await callProxy({ ...TOK, method: 'POST', path: 'users', body: { displayName: 'Nguyễn Văn A', role: 'student' } })
  const student = u.data && u.data.data
  check('create student', !!student && !!student.sourcedId, JSON.stringify(u.data))
  const e = await callProxy({ ...TOK, method: 'POST', path: 'enrollments', body: { userSourcedId: student.sourcedId, classSourcedId: cls.sourcedId, role: 'student' } })
  check('enroll 201', !!e.data && e.data.ok, JSON.stringify(e.data))
  const dup = await callProxy({ ...TOK, method: 'POST', path: 'enrollments', body: { userSourcedId: student.sourcedId, classSourcedId: cls.sourcedId, role: 'student' } })
  check('duplicate enroll -> 409 surfaced', !!dup.data && !dup.data.ok && /DUPLICATE_ENROLLMENT/.test(dup.data.error || ''), JSON.stringify(dup.data))
  const roster = await callProxy({ ...TOK, method: 'GET', path: 'classes/' + cls.sourcedId + '/students' })
  check('roster 1 student', !!roster.data && roster.data.ok && Array.isArray(roster.data.data) && roster.data.data.length === 1, JSON.stringify(roster.data))
  const list = await callProxy({ ...TOK, method: 'GET', path: 'enrollments?class_id=' + encodeURIComponent(cls.sourcedId) + '&limit=200' })
  const enr = list.data && list.data.ok ? list.data.data[0] : null
  check('enrollment listing for un-enroll', !!enr && !!enr.sourcedId, JSON.stringify(list.data))
  const del = await callProxy({ ...TOK, method: 'DELETE', path: 'enrollments/' + enr.sourcedId })
  check('un-enroll 204', !!del.data && del.data.ok, JSON.stringify(del.data))
  const roster2 = await callProxy({ ...TOK, method: 'GET', path: 'classes/' + cls.sourcedId + '/students' })
  check('roster empty after un-enroll', !!roster2.data && Array.isArray(roster2.data.data) && roster2.data.data.length === 0, JSON.stringify(roster2.data))
}
// 6. guards: upstream down, cross-origin, unsupported method, path traversal
{
  const down = await forwardClassRequest({ baseUrl: 'http://localhost:59999', method: 'GET', path: 'health' }, async () => { throw new Error('connect ECONNREFUSED') })
  check('upstream unreachable -> ok:false status 0', !!down && down.ok === false && down.status === 0 && /upstream unreachable/.test(down.error || ''), JSON.stringify(down))
  const co = await callProxy({ ...TOK, method: 'GET', path: 'health' }, { origin: 'http://evil.example', host: 'localhost:8099' })
  check('cross-origin -> 403', co.status === 403 && !!co.data && co.data.error === 'untrusted origin', JSON.stringify(co.data))
  const bad = await callProxy({ ...TOK, method: 'PUT', path: 'health' })
  check('unsupported method PUT rejected', !!bad.data && !bad.data.ok && /unsupported method/.test(bad.data.error || ''), JSON.stringify(bad.data))
  const bad2 = await callProxy({ ...TOK, method: 'GET', path: '../etc/passwd' })
  check('path traversal rejected', !!bad2.data && !bad2.data.ok && /invalid resource path/.test(bad2.data.error || ''), JSON.stringify(bad2.data))
}
// 7. delete class
{
  const d = await callProxy({ ...TOK, method: 'DELETE', path: 'classes/' + cls.sourcedId })
  check('delete class 204', !!d.data && d.data.ok, JSON.stringify(d.data))
  const g = await callProxy({ ...TOK, method: 'GET', path: 'classes/' + cls.sourcedId })
  check('deleted class -> 404', !!g.data && !g.data.ok && /CLASS_NOT_FOUND/.test(g.data.error || ''), JSON.stringify(g.data))
}

console.log('SMOKE RESULT: ' + pass + '/' + (pass + fail) + ' checks passed')
shim.close(); m6.kill('SIGTERM')
process.exit(fail === 0 ? 0 : 1)
