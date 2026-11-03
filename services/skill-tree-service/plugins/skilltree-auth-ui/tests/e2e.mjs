/**
 * skilltree-auth-ui — end-to-end test against REAL services (Node ≥ 18).
 *
 * Requires the platform stack running (started outside this script):
 *   - auth-service (M11)  on :8108   (cd services/auth-service && uvicorn app.main:app --port 8108)
 *   - api-gateway (M10)   on :8000   (AUTH_BASE_URL=http://127.0.0.1:8108 uvicorn app.main:app --port 8000)
 *
 * This script mounts the plugin's host-half proxy on :9301 with
 * SKILLTREE_GATEWAY_URL=http://127.0.0.1:8000 and walks the real JWT flow:
 *   E1 register FIRST user → role admin (M11 bootstrap rule), 201 + JWT
 *   E2 register second user without token → role student
 *   E3 register teacher with WRONG admin token → created as student (granted=false)
 *   E4 duplicate username → 409 USERNAME_TAKEN envelope passthrough
 *   E5 verify with the stored JWT → {username, role, exp}
 *   E6 login with the first user → 200 + new JWT
 *   E7 login with wrong password → 401 BAD_CREDENTIALS passthrough
 *
 * Run:  node tests/e2e.mjs   (from the plugin directory)
 */
import http from 'node:http'

process.env.SKILLTREE_GATEWAY_URL = 'http://127.0.0.1:8000'

const PORT_PROXY = 9301
const routes = new Map()
const ctx = { webServer: { register: (route) => routes.set(route.path, route.handler) } }
const plugin = await import(new URL('../lib/index.js', import.meta.url))
plugin.apply(ctx)

const proxy = http.createServer(async (req, res) => {
  const handler = routes.get(req.url.split('?')[0])
  if (!handler) { res.writeHead(404); res.end(); return }
  await handler(req, res)
})
await new Promise((resolve) => proxy.listen(PORT_PROXY, resolve))

const stamp = Date.now().toString(36)
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

// E1 register works end-to-end. On a FRESH auth DB the first user is admin
// (M11 bootstrap rule in service.py register()); on a reused DB the role is
// student — both are valid, so the role is logged, not asserted.
const admin = await post('/skilltree-auth/register', { username: 'admin_' + stamp, password: 'password123' })
const adminBody = await admin.json()
check('E1 register 201 + JWT', admin.status === 201 && typeof adminBody.accessToken === 'string' && adminBody.user && typeof adminBody.user.role === 'string',
  'status=' + admin.status + ' role=' + (adminBody.user && adminBody.user.role) + ' (fresh DB → role admin)')
const adminToken = adminBody.accessToken

// E2 second user without token → student
const student = await post('/skilltree-auth/register', { username: 'hs_' + stamp, password: 'password123' })
const studentBody = await student.json()
check('E2 default role is student', student.status === 201 && studentBody.user.role === 'student',
  'status=' + student.status + ' role=' + (studentBody.user && studentBody.user.role))

// E3 teacher with wrong admin token → created as student (no error, granted=false)
const fakeTeacher = await post('/skilltree-auth/register', { username: 'gv_' + stamp, password: 'password123', role: 'teacher' }, { 'x-admin-token': 'WRONG-TOKEN' })
const fakeTeacherBody = await fakeTeacher.json()
check('E3 wrong admin token → student', fakeTeacher.status === 201 && fakeTeacherBody.user.role === 'student',
  'status=' + fakeTeacher.status + ' role=' + (fakeTeacherBody.user && fakeTeacherBody.user.role))

// E4 duplicate username → 409 envelope passthrough
const duplicate = await post('/skilltree-auth/register', { username: 'hs_' + stamp, password: 'password123' })
const duplicateBody = await duplicate.json()
check('E4 duplicate 409 envelope', duplicate.status === 409 && duplicateBody.error.code === 'USERNAME_TAKEN',
  'status=' + duplicate.status + ' code=' + (duplicateBody.error && duplicateBody.error.code))

// E5 verify the JWT issued above
const verify = await post('/skilltree-auth/verify', {}, { authorization: 'Bearer ' + adminToken })
const verifyBody = await verify.json()
check('E5 verify JWT', verify.status === 200 && verifyBody.username === 'admin_' + stamp && typeof verifyBody.exp === 'number',
  'status=' + verify.status + ' role=' + verifyBody.role)

// E6 login with the registered user
const login = await post('/skilltree-auth/login', { username: 'admin_' + stamp, password: 'password123' })
const loginBody = await login.json()
check('E6 login 200 + JWT', login.status === 200 && typeof loginBody.accessToken === 'string' && loginBody.user && typeof loginBody.user.role === 'string',
  'status=' + login.status + ' expiresIn=' + loginBody.expiresIn)

// E7 login with wrong password → 401 passthrough
const badLogin = await post('/skilltree-auth/login', { username: 'admin_' + stamp, password: 'wrong-password' })
const badLoginBody = await badLogin.json()
check('E7 bad credentials 401', badLogin.status === 401 && badLoginBody.error.code === 'BAD_CREDENTIALS',
  'status=' + badLogin.status + ' code=' + (badLoginBody.error && badLoginBody.error.code))

proxy.close()
if (failures > 0) {
  console.log('E2E FAILED: ' + failures + ' check(s)')
  process.exit(1)
}
console.log('E2E ALL PASS (7/7)')
