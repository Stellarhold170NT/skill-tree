/**
 * skilltree-auth-ui — client-half behavior test (Node ≥ 18, no dependencies).
 *
 * Loads client/client.js in a fake browser environment (window, localStorage,
 * fetch stub, module-loader capture, minimal React hook emulation) and drives
 * the REAL component event handlers end to end:
 *   C1  login submit → POST /skilltree-auth/login; JWT stored in
 *       localStorage["skilltree.auth.v1"]
 *   C2  stored token re-verified on mount → Authorization header sent
 *   C3  register student → NO x-admin-token header
 *   C4  register teacher with admin token → x-admin-token header sent
 *   C5  teacher/admin with empty token → blocked client-side (no request)
 *   C6  verify returns 401 on mount → stored token cleared
 *
 * Run:  node tests/client.mjs   (from the plugin directory)
 */
import { readFile } from 'node:fs/promises'

let failures = 0
function check(label, condition, detail) {
  if (condition) console.log('PASS', label, detail ? '(' + detail + ')' : '')
  else { failures += 1; console.log('FAIL', label, detail ? '(' + detail + ')' : '') }
}

const settle = async () => { for (let i = 0; i < 6; i += 1) await new Promise((r) => setTimeout(r, 0)) }

/** Fake localStorage. */
function fakeStorage() {
  const map = new Map()
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    _map: map,
  }
}

/** Minimal React emulation: hooks are per-hook-index slots persisting across renders. */
function fakeReact() {
  const state = []
  const memo = []
  let effects = []
  let seq = 0
  const react = {
    createElement(tag, props, ...children) {
      if (typeof tag === 'function') { seq = 0; return tag(props || {}) }
      return { tag, props: props || {}, children }
    },
    useState(initial) {
      const i = seq++
      if (!(i in state)) state[i] = initial
      return [state[i], (v) => { state[i] = typeof v === 'function' ? v(state[i]) : v }]
    },
    useEffect(cb) { effects.push(cb) },
    useCallback(fn) {
      const i = seq++
      if (!(i in memo)) memo[i] = fn
      return memo[i]
    },
    _flushEffects: async () => { const run = effects; effects = []; for (const cb of run) await cb() },
  }
  return react
}

function jsonResp(status, data) {
  return { ok: status >= 200 && status < 300, status, json: async () => data }
}

/**
 * Boot one fresh component instance.
 * options.seedSession — pre-seed localStorage["skilltree.auth.v1"]
 * options.verifyOk — whether POST /skilltree-auth/verify answers 200 or 401
 * Returns { render, storage, calls }
 */
async function setup(options = {}) {
  const storage = fakeStorage()
  if (options.seedSession) storage.setItem('skilltree.auth.v1', JSON.stringify(options.seedSession))
  const react = fakeReact()
  const calls = []
  const verifyOk = options.verifyOk !== false
  globalThis.fetch = async (path, init) => {
    calls.push({ path, init })
    if (path === '/skilltree-auth/config') return jsonResp(200, { gatewayBaseUrl: 'http://gw:8000', gatewayPrefix: 'auth', upstream: 'auth-service (M11)' })
    if (path === '/skilltree-auth/login') return jsonResp(200, { accessToken: 'jwt-login', tokenType: 'Bearer', expiresIn: 3600, user: { username: 'huy', role: 'admin' } })
    if (path === '/skilltree-auth/register') return jsonResp(201, { accessToken: 'jwt-reg', tokenType: 'Bearer', expiresIn: 3600, user: { username: 'x', role: 'student' } })
    if (path === '/skilltree-auth/verify') {
      return verifyOk
        ? jsonResp(200, { username: 'huy', role: 'admin', exp: 9999999 })
        : jsonResp(401, { error: { code: 'UNAUTHORIZED', message: 'token expired', details: {} } })
    }
    return jsonResp(404, { error: { code: 'NOT_FOUND', message: path, details: {} } })
  }
  const loader = {}
  const fakeWindow = { localStorage: storage, __ModuleLoader__: { load: (def) => { loader.def = def } } }
  const src = await readFile(new URL('../client/client.js', import.meta.url), 'utf8')
  new Function('window', src)(fakeWindow)
  const requireShim = (name) => {
    if (name === 'react') return react
    throw new Error('unexpected require: ' + name)
  }
  const pluginModule = loader.def.factory(requireShim)
  let renderFn
  // Real slot contract: inject(name, registerFn) triggers lazy registration;
  // register(registration, renderFn) receives the render function as arg 2.
  pluginModule.apply({ slots: { inject: (_name, registerFn) => { registerFn() }, register: (_registration, render) => { renderFn = render } } })
  const render = async () => { const tree = renderFn(); await react._flushEffects(); await settle(); return tree }
  return { render, storage, calls }
}

/* ---- tree helpers ---- */
function walk(node, fn) {
  if (!node || typeof node !== 'object') return false
  if (node.tag !== undefined && node.props) { if (fn(node) === true) return true }
  const kids = Array.isArray(node.children) ? node.children : node.children !== undefined ? [node.children] : []
  for (const k of kids) if (walk(k, fn) === true) return true
  return false
}
const findAll = (tree, pred) => { const out = []; walk(tree, (n) => { if (pred(n)) { out.push(n); return true } return false }); return out }
const findFirst = (tree, pred) => findAll(tree, pred)[0] || null
const text = (n) => {
  const c = n.children
  if (typeof c === 'string') return c
  if (Array.isArray(c) && c.length === 1 && typeof c[0] === 'string') return c[0]
  return ''
}

async function fill(env, tree, id, value) {
  const input = findFirst(tree, (n) => n.props && n.props.id === id)
  if (!input) throw new Error('input not found: ' + id)
  input.props.onChange({ target: { value } })
  return env.render()
}

async function openRegisterTab(env, tree) {
  const tabButton = findFirst(tree, (n) => n.tag === 'button' && text(n) === 'Tạo tài khoản')
  if (!tabButton) throw new Error('register tab button not found')
  tabButton.props.onClick()
  return env.render()
}

const registerCall = (calls) => calls.find((c) => c.path === '/skilltree-auth/register')
const bodyOf = (call) => JSON.parse(call.init.body)

async function fillRegisterForm(env, tree, { username, password, confirm, role, adminToken }) {
  tree = await fill(env, tree, 'skilltree-auth-ui-reg-username', username)
  tree = await fill(env, tree, 'skilltree-auth-ui-reg-password', password)
  tree = await fill(env, tree, 'skilltree-auth-ui-reg-confirm', confirm)
  tree = await fill(env, tree, 'skilltree-auth-ui-reg-role', role)
  if (adminToken !== undefined) tree = await fill(env, tree, 'skilltree-auth-ui-reg-token', adminToken)
  return tree
}

/* ---- C1 login stores JWT ---- */
{
  const env = await setup()
  let tree = await env.render()
  tree = await fill(env, tree, 'skilltree-auth-ui-login-username', 'huy')
  tree = await fill(env, tree, 'skilltree-auth-ui-login-password', 'password123')
  const form = findFirst(tree, (n) => n.tag === 'form')
  await form.props.onSubmit({ preventDefault() {} })
  await settle()
  const login = env.calls.find((c) => c.path === '/skilltree-auth/login')
  check('C1a login POST sent', Boolean(login) && bodyOf(login).username === 'huy' && bodyOf(login).password === 'password123',
    login ? 'body=' + login.init.body : 'no login call')
  const stored = env.storage.getItem('skilltree.auth.v1')
  check('C1b JWT stored', Boolean(stored) && JSON.parse(stored).accessToken === 'jwt-login', stored ? 'accessToken=' + JSON.parse(stored).accessToken : 'missing')
}

/* ---- C2 stored token re-verified on mount with Authorization header ---- */
{
  const env = await setup({ seedSession: { accessToken: 'jwt-stored', tokenType: 'Bearer', expiresAt: Date.now() + 3600e3, user: { username: 'huy', role: 'admin' } } })
  await env.render()
  const verify = env.calls.find((c) => c.path === '/skilltree-auth/verify')
  check('C2 verify-on-mount sends Bearer token', Boolean(verify) && verify.init.headers.authorization === 'Bearer jwt-stored',
    verify ? String(verify.init.headers.authorization) : 'no verify call')
}

/* ---- C3 student register → no admin token header ---- */
{
  const env = await setup()
  let tree = await env.render()
  tree = await openRegisterTab(env, tree)
  tree = await fillRegisterForm(env, tree, { username: 'hs1', password: 'password123', confirm: 'password123', role: 'student' })
  const form = findFirst(tree, (n) => n.tag === 'form')
  await form.props.onSubmit({ preventDefault() {} })
  await settle()
  const reg = registerCall(env.calls)
  const sent = reg && reg.init.headers['x-admin-token']
  check('C3 student register has no x-admin-token', Boolean(reg) && !sent, 'header=' + String(sent))
}

/* ---- C4 teacher register with admin token → header sent (RED before fix) ---- */
{
  const env = await setup()
  let tree = await env.render()
  tree = await openRegisterTab(env, tree)
  tree = await fillRegisterForm(env, tree, { username: 'gv1', password: 'password123', confirm: 'password123', role: 'teacher', adminToken: 'SECRET-TOKEN' })
  const form = findFirst(tree, (n) => n.tag === 'form')
  await form.props.onSubmit({ preventDefault() {} })
  await settle()
  const reg = registerCall(env.calls)
  const sent = reg && reg.init.headers['x-admin-token']
  check('C4 teacher register sends x-admin-token', Boolean(reg) && sent === 'SECRET-TOKEN', 'header=' + String(sent))
}

/* ---- C5 teacher without token blocked client-side ---- */
{
  const env = await setup()
  let tree = await env.render()
  tree = await openRegisterTab(env, tree)
  tree = await fillRegisterForm(env, tree, { username: 'gv2', password: 'password123', confirm: 'password123', role: 'teacher', adminToken: '' })
  const form = findFirst(tree, (n) => n.tag === 'form')
  await form.props.onSubmit({ preventDefault() {} })
  await settle()
  check('C5 empty admin token blocked (no request)', !registerCall(env.calls), 'calls=' + env.calls.map((c) => c.path).join(','))
}

/* ---- C6 invalid verify on mount clears stored token ---- */
{
  const env = await setup({ seedSession: { accessToken: 'jwt-expired', tokenType: 'Bearer', expiresAt: Date.now() + 3600e3, user: { username: 'huy', role: 'admin' } }, verifyOk: false })
  await env.render()
  check('C6 invalid verify clears storage', env.storage.getItem('skilltree.auth.v1') === null, 'storage=' + String(env.storage.getItem('skilltree.auth.v1')))
}

if (failures > 0) {
  console.log('CLIENT TESTS FAILED: ' + failures + ' check(s)')
  process.exit(1)
}
console.log('CLIENT TESTS ALL PASS (6/6)')
