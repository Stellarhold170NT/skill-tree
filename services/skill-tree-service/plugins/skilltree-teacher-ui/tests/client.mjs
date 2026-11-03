/**
 * skilltree-teacher-ui — client-half behavior test (Node ≥ 18, no dependencies).
 *
 * Loads client/client.js in a fake browser environment (window, localStorage,
 * fetch stub, module-loader capture, frame-aware React hook emulation) and drives
 * the REAL component event handlers end to end:
 *   C1  "Tải dashboard" → POST /skilltree-teacher/batch with the 5 allow-listed
 *       calls + Authorization from localStorage["skilltree.auth.v1"]; heatmap renders
 *   C2  student click → drill batch (mastery/next/events) renders "Học tiếp theo"
 *   C3  plan "Giao ôn tập" → assign form; submit → POST /skilltree-teacher/assign
 *       (title auto-filled, targetGroup red_rusty, token forwarded); "Tạo đề kiểm
 *       tra M2" → POST /skilltree-teacher/quiz
 *   C4  Class Ask: question → POST /skilltree-teacher/ask → answer rendered
 *   C5  settings persisted to localStorage["skilltree.teacherui.settings"]
 *   E1  gateway down → actionable degraded banner
 *   P1  pure helpers: stateChip AA pairs, conceptShort, buildDashboardCalls,
 *       buildDrillCalls
 *
 * React emulation notes: each function-component invocation owns a persistent
 * frame (state + memo slots) keyed by its deterministic invocation index per
 * render pass — nested hookful components (OverlayEntry → Panel) never collide.
 *
 * Run:  node tests/client.mjs   (from the plugin directory)
 */
import { readFile } from 'node:fs/promises'

let failures = 0
function check(label, condition, detail) {
  if (condition) console.log('PASS', label, detail ? '(' + detail + ')' : '')
  else { failures += 1; console.log('FAIL', label, detail ? '(' + detail + ')' : '') }
}

const settle = async () => { for (let i = 0; i < 8; i += 1) await new Promise((r) => setTimeout(r, 0)) }

const CLASS_ID = '11111111-2222-3333-4444-555555555555'
const DOC_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
const ASSIGN_ID = 'f0f0f0f0-f0f0-f0f0-f0f0-f0f0f0f0f0f0'
const HEATMAP = { students: ['sid-red', 'sid-green'], concepts: ['u-recursion'], cells: { 'sid-red': { 'u-recursion': 'red' }, 'sid-green': { 'u-recursion': 'green' } } }
const GRAPH = { nodes: [{ identifier: 'u-recursion', humanCodingScheme: '1.2', fullStatement: 'Đệ quy (Recursion)' }], edges: [] }
const PLAN = [{ conceptUri: 'u-recursion', redCount: 1, rustyCount: 0, amberCount: 0, unlocks: ['u-graph'], reason: '1 student(s) red — teach first.' }]

function fakeStorage() {
  const map = new Map()
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    _map: map,
  }
}

/** Frame-aware React emulation: per-invocation state slots, stable across renders. */
function fakeReact() {
  const frames = new Map()
  let effects = []
  let invocation = 0
  let current = null
  let hookSeq = 0
  const react = {
    createElement(tag, props, ...children) {
      if (typeof tag === 'function') {
        const id = invocation++
        if (!frames.has(id)) frames.set(id, { state: [], memo: [] })
        const prev = current
        current = frames.get(id)
        hookSeq = 0
        let out
        try { out = tag(props || {}) } finally { current = prev }
        return out
      }
      return { tag, props: props || {}, children }
    },
    useState(initial) {
      const frame = current
      const i = hookSeq++
      if (!(i in frame.state)) frame.state[i] = typeof initial === 'function' ? initial() : initial
      return [frame.state[i], (v) => { frame.state[i] = typeof v === 'function' ? v(frame.state[i]) : v }]
    },
    useEffect(cb) { effects.push(cb) },
    useCallback(fn, deps) {
      const frame = current
      const i = hookSeq++
      if (!frame.memo) frame.memo = []
      if (!frame.memoDeps) frame.memoDeps = []
      const prev = frame.memoDeps[i]
      const changed = !prev || !deps || deps.length !== prev.length || deps.some((d, j) => d !== prev[j])
      if (changed || !(i in frame.memo)) { frame.memo[i] = fn; frame.memoDeps[i] = deps || [] }
      return frame.memo[i]
    },
    /** Reset the invocation counter before a fresh top-level render pass. */
    _beginPass() { invocation = 0 },
    _flushEffects: async () => { const run = effects; effects = []; for (const cb of run) await cb() },
  }
  return react
}

function jsonResp(status, data) {
  return { ok: status >= 200 && status < 300, status, json: async () => data }
}

/** Depth-first search over the fake element tree (arrays + strings count as nodes). */
function walk(node, visitor) {
  if (node === null || node === undefined) return
  if (Array.isArray(node)) { node.forEach((c) => walk(c, visitor)); return }
  if (typeof node === 'string' || typeof node === 'number') { visitor(String(node)); return }
  if (typeof node !== 'object') return
  visitor(node)
  walk(node.children, visitor)
}

function textOf(node) {
  let out = ''
  walk(node, (n) => { if (typeof n === 'string') out += n + ' ' })
  return out
}

function findAll(root, predicate) {
  const out = []
  walk(root, (n) => { if (predicate(n)) out.push(n) })
  return out
}

function findButton(root, matchText) {
  return findAll(root, (n) => n.tag === 'button' && n.props && n.props.onClick && textOf(n).toLowerCase().includes(matchText.toLowerCase()))[0] || null
}

const baseResponder = (path) => {
  if (path === '/skilltree-teacher/batch') {
    return jsonResp(200, {
      ok: true,
      results: [
        { id: 'classes', ok: true, status: 200, data: [{ sourcedId: CLASS_ID, title: 'Lớp A1 — 2026' }] },
        { id: 'heatmap', ok: true, status: 200, data: HEATMAP },
        { id: 'plan', ok: true, status: 200, data: PLAN },
        { id: 'roster', ok: true, status: 200, data: [{ sourcedId: 'sid-red', displayName: 'Nguyễn Văn Đỏ' }, { sourcedId: 'sid-green', displayName: 'Trần Thị Xanh' }] },
        { id: 'graph', ok: true, status: 200, data: GRAPH },
      ],
    })
  }
  return jsonResp(404, { ok: false, error: 'unfaked ' + path })
}

async function boot(options = {}) {
  const storage = fakeStorage()
  if (options.seedToken) {
    storage.setItem('skilltree.auth.v1', JSON.stringify({ accessToken: 'jwt-teacher-1', tokenType: 'Bearer', user: { role: 'teacher' } }))
  }
  const react = fakeReact()
  const calls = []
  const responder = options.responder || baseResponder
  const loader = {}
  globalThis.window = {
    localStorage: storage,
    fetch: async (path, init) => { calls.push({ path, init }); return responder(path, init) },
    __ModuleLoader__: { load: (def) => { loader.def = def } },
  }
  const src = await readFile(new URL('../client/client.js', import.meta.url), 'utf8')
  new Function('window', src)(globalThis.window)
  const mod = loader.def.factory((name) => { if (name === 'react') return react; throw new Error('unexpected require: ' + name) })
  const slotDefs = []
  mod.apply({ slots: {
    inject: (name, register) => { slotDefs.push(register()) },
    register: (def, component) => ({ def, component }),
  } })
  const render = () => { react._beginPass(); return react.createElement(slotDefs[0].component, {}) }
  return { react, calls, storage, mod, render, entry: render() }
}

/* ---- P1 pure helpers (module-level, no DOM needed) ---- */
{
  const env0 = await boot({})
  const mod = env0.mod
  const chip = mod.stateChip('red')
  check('P1 stateChip red uses AA pair', chip.label === 'Đỏ' && chip.bg === '#FDECEC' && chip.fg === '#B3261E')
  check('P1 stateChip rusty dashed', mod.stateChip('rusty').dashed === true && mod.stateChip('none').label === '—')
  check('P1 conceptShort prefers scheme', mod.conceptShort({ humanCodingScheme: '1.2', fullStatement: 'Đệ quy' }) === '1.2')
  const dashCalls = mod.buildDashboardCalls(CLASS_ID, DOC_ID)
  check('P1 dashboard batch shape', dashCalls.length === 5 && dashCalls[1].prefix === 'learner' && dashCalls[1].path === 'classes/' + CLASS_ID + '/heatmap' && dashCalls[2].query.includes('topN=5') && dashCalls[4].path === 'documents/' + DOC_ID + '/graph')
  const drillCalls = mod.buildDrillCalls('sid-1', DOC_ID)
  check('P1 drill batch shape', drillCalls.length === 3 && drillCalls[0].prefix === 'learner' && drillCalls[1].query === 'documentId=' + DOC_ID && drillCalls[2].query.includes('actorId=sid-1'))
}

/* ---- C1 dashboard load + heatmap render ---- */
const env = await boot({ seedToken: true })
{
  const fab = findButton(env.entry, 'Bảng GV')
  check('C0 fab button present', Boolean(fab))
  fab.props.onClick()
  env.entry = env.render()
  const closeBtn = findAll(env.entry, (n) => n.tag === 'button' && n.props && n.props['aria-label'] === 'Đóng bảng giáo viên')
  check('C1 panel opens (close button present)', closeBtn.length === 1)

  const docInput = findAll(env.entry, (n) => n.props && n.props.id === 'skilltree-teacher-ui-doc')[0]
  check('C1 documentId input present', Boolean(docInput))
  docInput.props.onChange({ target: { value: DOC_ID } })
  env.entry = env.render()
  const classSelect = findAll(env.entry, (n) => n.props && n.props.id === 'skilltree-teacher-ui-class')[0]
  classSelect.props.onChange({ target: { value: CLASS_ID } })
  env.entry = env.render()

  const loadBtn = findButton(env.entry, 'Tải dashboard')
  await loadBtn.props.onClick()
  await settle()
  env.entry = env.render()

  const batch = env.calls.find((c) => c.path === '/skilltree-teacher/batch')
  check('C1 batch POST sent with 5 calls + token', Boolean(batch) && JSON.parse(batch.init.body).calls.length === 5 &&
    batch.init.headers.authorization === 'Bearer jwt-teacher-1')
  const sentCalls = JSON.parse(batch.init.body).calls
  check('C1 wire calls match allow-list contract', sentCalls[1].path === 'classes/' + CLASS_ID + '/heatmap' && sentCalls[1].query === 'documentId=' + DOC_ID)

  const tables = findAll(env.entry, (n) => n.tag === 'table')
  const studentBtns = findAll(env.entry, (n) => n.tag === 'button' && n.props && n.props.onClick && textOf(n).includes('Nguyễn Văn Đỏ'))
  check('C1 heatmap rows render roster names', tables.length >= 1 && studentBtns.length >= 1)
  check('C1 plan table renders assign action + reason', textOf(env.entry).includes('Giao ôn tập') && textOf(env.entry).includes('1 student(s) red'))
  check('C1 legend present', textOf(env.entry).includes('rusty — từng học, đang quên'))
}

/* ---- C2 drill-down ---- */
{
  env.calls.length = 0
  const drillResponder = (path, init) => {
    if (path === '/skilltree-teacher/batch' && JSON.parse(init.body).calls[0].id === 'mastery') {
      return jsonResp(200, {
        ok: true,
        results: [
          { id: 'mastery', ok: true, status: 200, data: [{ conceptUri: 'u-recursion', rating: 1200, ratingDeviation: 200, volatility: 0.06, mastery: 0.32, state: 'red', reviewCount: 2, lastPlayedAt: '2026-10-30T00:00:00Z' }] },
          { id: 'next', ok: true, status: 200, data: { studentId: 'sid-red', documentId: DOC_ID, conceptUri: 'u-recursion', mastery: 0.32, state: 'red', unlocks: ['u-graph'], explanation: 'All prerequisites are green.', alternatives: [] } },
          { id: 'events', ok: true, status: 200, data: [{ eventId: 'e1', type: 'AssessmentItemSubmitted', occurredAt: '2026-10-31T10:00:00Z', actorId: 'sid-red', actorType: 'Person', objectId: 'u-recursion', objectType: 'Concept', payload: { isCorrect: false } }] },
        ],
      })
    }
    return baseResponder(path, init)
  }
  globalThis.window.fetch = async (path, init) => { env.calls.push({ path, init }); return drillResponder(path, init) }
  const studentBtn = findAll(env.entry, (n) => n.tag === 'button' && n.props && n.props.onClick && textOf(n).includes('Nguyễn Văn Đỏ'))[0]
  await studentBtn.props.onClick()
  await settle()
  env.entry = env.render()
  const drill = env.calls.find((c) => JSON.parse(c.init.body).calls[0].id === 'mastery')
  check('C2 drill batch has 3 allow-listed calls', Boolean(drill) && JSON.parse(drill.init.body).calls.length === 3 &&
    JSON.parse(drill.init.body).calls[2].query.includes('actorId=sid-red'))
  check('C2 next recommendation rendered', textOf(env.entry).includes('Học tiếp theo') && textOf(env.entry).includes('All prerequisites are green.'))
  check('C2 mastery table shows rating + state', textOf(env.entry).includes('1200 ± 200') && textOf(env.entry).includes('32%'))
  check('C2 event history shows Sai for wrong answer', textOf(env.entry).includes('AssessmentItemSubmitted') && textOf(env.entry).includes('Sai'))
  check('C2 back button present', Boolean(findButton(env.entry, 'Quay lại bảng lớp')))
}

/* ---- C3 assign + quiz ---- */
{
  env.calls.length = 0
  const assignResponder = (path, init) => {
    if (path === '/skilltree-teacher/assign') {
      return jsonResp(200, { ok: true, data: { id: ASSIGN_ID, title: JSON.parse(init.body).title, targetGroup: 'red_rusty', studentIds: ['sid-red'], itemIds: ['i1', 'i2'], quizTestId: null, status: 'draft' } })
    }
    if (path === '/skilltree-teacher/quiz') {
      return jsonResp(200, { ok: true, data: { quizTestId: 'quiz-1', quizIdentifier: 'ASG-' + ASSIGN_ID, itemIds: ['i1', 'i2'], studentIds: ['sid-red'] } })
    }
    return baseResponder(path, init)
  }
  globalThis.window.fetch = async (path, init) => { env.calls.push({ path, init }); return assignResponder(path, init) }

  const assignBtn = findButton(env.entry, 'Giao ôn tập')
  await assignBtn.props.onClick()
  await settle()
  env.entry = env.render()
  const titleInput = findAll(env.entry, (n) => n.props && n.props.id === 'skilltree-teacher-ui-assign-title')[0]
  check('C3 assign form opens with auto title', Boolean(titleInput) && String(titleInput.props.value).includes('Ôn tập 1.2'), titleInput ? String(titleInput.props.value) : 'missing')

  const form = findAll(env.entry, (n) => n.tag === 'form')[0]
  check('C3 assign form present with onSubmit', Boolean(form) && typeof form.props.onSubmit === 'function')
  await form.props.onSubmit({ preventDefault: () => {} })
  await settle()
  env.entry = env.render()

  const assignCall = env.calls.find((c) => c.path === '/skilltree-teacher/assign')
  const assignBody = JSON.parse(assignCall.init.body)
  check('C3 assign POST carries M7 contract', assignBody.classId === CLASS_ID && assignBody.conceptUri === 'u-recursion' && assignBody.targetGroup === 'red_rusty' && assignCall.init.headers.authorization === 'Bearer jwt-teacher-1')

  const quizBtn = findButton(env.entry, 'Tạo đề kiểm tra M2')
  check('C3 quiz button appears after assignment', Boolean(quizBtn))
  await quizBtn.props.onClick()
  await settle()
  env.entry = env.render()
  const quizCall = env.calls.find((c) => c.path === '/skilltree-teacher/quiz')
  check('C3 quiz POST uses assignment id', Boolean(quizCall) && JSON.parse(quizCall.init.body).assignmentId === ASSIGN_ID)
  check('C3 quiz identifier surfaced', textOf(env.entry).includes('ASG-' + ASSIGN_ID))
}

/* ---- C4 Class Ask ---- */
{
  env.calls.length = 0
  const askResponder = (path) => {
    if (path === '/skilltree-teacher/ask') {
      return jsonResp(200, { ok: true, answer: '1/2 học sinh đã nắm vững «1.2 · Đệ quy (Recursion)»: Trần Thị Xanh.', source: 'learner-model (M5): heatmap + teaching-plan — V1 heuristic' })
    }
    return baseResponder(path)
  }
  globalThis.window.fetch = async (path, init) => { env.calls.push({ path, init }); return askResponder(path, init) }

  const askArea = findAll(env.entry, (n) => n.tag === 'textarea')[0]
  check('C4 ask textarea present', Boolean(askArea))
  askArea.props.onChange({ target: { value: 'Ai đã nắm vững recursion?' } })
  env.entry = env.render()
  const askBtn = findButton(env.entry, 'Hỏi lớp')
  await askBtn.props.onClick()
  await settle()
  env.entry = env.render()
  const askCall = env.calls.find((c) => c.path === '/skilltree-teacher/ask')
  check('C4 ask POST sends question + class + doc', Boolean(askCall) && JSON.parse(askCall.init.body).question === 'Ai đã nắm vững recursion?' && JSON.parse(askCall.init.body).classId === CLASS_ID)
  check('C4 answer rendered with source line', textOf(env.entry).includes('Trần Thị Xanh') && textOf(env.entry).includes('V1 heuristic'))
}

/* ---- C5 settings persistence ---- */
{
  const stored = JSON.parse(env.storage.getItem('skilltree.teacherui.settings'))
  check('C5 settings persisted (class + doc)', stored.classId === CLASS_ID && stored.documentId === DOC_ID && typeof stored.gatewayOverride === 'string')
}

/* ---- E1 degraded state ---- */
{
  const env2 = await boot({
    seedToken: true,
    responder: (path) => path === '/skilltree-teacher/batch'
      ? jsonResp(200, { ok: true, results: [{ id: 'classes', ok: false, status: 502, error: 'upstream unreachable: ECONNREFUSED' }, { id: 'heatmap', ok: false, status: 502, error: 'upstream unreachable' }, { id: 'plan', ok: false, status: 502, error: 'upstream unreachable' }, { id: 'roster', ok: false, status: 502, error: 'upstream unreachable' }, { id: 'graph', ok: false, status: 502, error: 'upstream unreachable' }] })
      : jsonResp(404, {}),
  })
  findButton(env2.entry, 'Bảng GV').props.onClick()
  await settle()
  env2.entry = env2.render()
  const docInput2 = findAll(env2.entry, (n) => n.props && n.props.id === 'skilltree-teacher-ui-doc')[0]
  docInput2.props.onChange({ target: { value: DOC_ID } })
  env2.entry = env2.render()
  const classSelect2 = findAll(env2.entry, (n) => n.props && n.props.id === 'skilltree-teacher-ui-class')[0]
  classSelect2.props.onChange({ target: { value: CLASS_ID } })
  env2.entry = env2.render()
  await findButton(env2.entry, 'Tải dashboard').props.onClick()
  await settle()
  env2.entry = env2.render()
  check('E1 degraded state names failed keys + compose hint', textOf(env2.entry).includes('heatmap, plan, roster, graph') && textOf(env2.entry).includes('docker compose'))
}

await settle()
console.log(failures === 0 ? '\nALL CLIENT CHECKS PASSED' : '\n' + failures + ' CHECK(S) FAILED')
process.exit(failures === 0 ? 0 : 1)
