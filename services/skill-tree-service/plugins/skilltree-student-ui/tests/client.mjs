/**
 * skilltree-student-ui — client-half behavior test (Node ≥ 18, no dependencies).
 *
 * Loads client/client.js in a fake browser environment (window, localStorage,
 * fetch stub, module-loader capture, minimal React hook emulation) and drives
 * the REAL component event handlers end to end:
 *   C1  linearize — topo order over prereq edges + cycle fallback
 *   C2  nodeState — next > mastery state > ready/locked
 *   C3  buildOverviewCalls — 6 calls with documentId, 3 without; path/query split
 *   C4  buildQuizItemsCall — conceptUri encoded, limit capped 1..10
 *   C5  buildBulkAttemptBody + buildMasteryBulkBody shapes (M2/M5 contracts)
 *   C6  citationPath — sectionPath join " › " with heading fallback
 *   C7  progressSteps — queued→ready mapping + failed stays visible
 *   C8  mount → overview batch call (Authorization forwarded), classes + spine
 *       rendered, M5 next concept highlighted with "Học ngay"
 *   C9  quiz flow — node click sets concept, items load, answer picked, Nộp bài
 *       → quiz-submit body {candidateId, responses[]} + mastery-update body
 *       {studentId, responses[]}; result line rendered; answer key not marked
 *   C10 ask flow — question typed, Hỏi → rag-ask body {question, mode}; answer
 *       + section-path citation rendered
 *   C11 upload flow — FormData posted to rag-upload; job poll renders progress
 *       steps and the ready notice
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const SID = '11111111-2222-3333-4444-555555555555'
const DOC1 = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
const CON1 = 'https://case.example/cfitems/concept-func'
const CON2 = 'https://case.example/cfitems/concept-graph'

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

/** Minimal React emulation: per-component hook stores, fresh callbacks, manual flush. */
function fakeReact() {
  const stores = new Map() // component fn → { state: [], effects: [] }
  let currentStore = null
  let seq = 0
  const react = {
    createElement(tag, props, ...children) {
      if (typeof tag === 'function') {
        const prev = currentStore
        if (!stores.has(tag)) stores.set(tag, { state: [], effects: [] })
        currentStore = stores.get(tag)
        seq = 0
        let out
        try { out = tag(props || {}) } finally { currentStore = prev }
        return out
      }
      return { tag, props: props || {}, children }
    },
    useState(initial) {
      const s = currentStore
      const i = seq++
      if (!(i in s.state)) s.state[i] = typeof initial === 'function' ? initial() : initial
      return [s.state[i], (v) => { s.state[i] = typeof v === 'function' ? v(s.state[i]) : v }]
    },
    useEffect(cb) { currentStore.effects.push(cb) },
    useCallback(fn) { return fn },
    _flushEffects: async () => {
      for (const store of stores.values()) {
        const run = store.effects
        store.effects = []
        for (const cb of run) {
          const out = cb()
          if (out && typeof out.then === 'function') await out
        }
      }
    },
  }
  return react
}

function jsonResp(status, data) {
  return { ok: status >= 200 && status < 300, status, json: async () => data }
}

function batchResult(results) {
  return jsonResp(200, { ok: true, results })
}

/** Fake host routes — asserts are collected by the caller via `calls`. */
async function fakeHost(path, init, calls) {
  const raw = init && init.body
  const body = raw instanceof FormData
    ? raw // upload route: keep the FormData so the test can assert fields
    : raw ? JSON.parse(raw) : {}
  calls.push({ path, body, authorization: (init && init.headers && init.headers.authorization) || null })
  if (path === '/skilltree-student/batch') {
    const results = (body.calls || []).map((call) => {
      if (call.id === 'user') return { id: 'user', ok: true, status: 200, data: { sourcedId: SID, displayName: 'Nguyễn Văn A', role: 'student' } }
      if (call.id === 'classes') return { id: 'classes', ok: true, status: 200, data: [{ sourcedId: 'cc000000-0000-0000-0000-000000000001', title: 'Toán 10A1', term: 'HK1', courseSourcedId: null }] }
      if (call.id === 'subjects') return { id: 'subjects', ok: true, status: 200, data: [{ sourcedId: DOC1, title: 'Toán 10' }] }
      if (call.id === 'graph') return {
        id: 'graph', ok: true, status: 200,
        data: {
          nodes: [
            { id: 'n1', identifier: CON1, fullStatement: 'Hàm số bậc nhất', humanCodingScheme: 'C1' },
            { id: 'n2', identifier: CON2, fullStatement: 'Hàm số bậc hai', humanCodingScheme: 'C2' },
          ],
          edges: [{ source: 'n1', target: 'n2', type: 'isPrerequisiteOf', sourceIdentifier: CON1, targetIdentifier: CON2 }],
        },
      }
      if (call.id === 'mastery') return { id: 'mastery', ok: true, status: 200, data: [{ conceptUri: CON1, mastery: 0.9, state: 'green', reviewCount: 2 }] }
      if (call.id === 'next') return { id: 'next', ok: true, status: 200, data: { studentId: SID, documentId: DOC1, conceptUri: CON2, explanation: 'Ready to learn next.', unlocks: [] } }
      if (call.id === 'items') return {
        id: 'items', ok: true, status: 200,
        data: [{ id: 'it1', prompt: 'Đạo hàm của x² là gì?', interactionType: 'single_choice', choices: [{ identifier: 'cA', text: '2x' }, { identifier: 'cB', text: 'x' }], conceptUri: CON2, correctResponse: ['cA'] }],
      }
      if (call.id === 'job') return { id: 'job', ok: true, status: 200, data: { jobId: 'j1', status: 'ready', docId: 'd1', stageMs: { parseMs: 1.2, chunkMs: 3.4 } } }
      if (call.id === 'docs') return { id: 'docs', ok: true, status: 200, data: [{ id: 'd1', title: 'Toán 10 — Chương 1' }] }
      return { id: call.id, ok: false, status: 404, error: 'NOT_FOUND' }
    })
    return batchResult(results)
  }
  if (path === '/skilltree-student/quiz-submit') return jsonResp(200, { ok: true, status: 200, data: { scored: 1, correct: 1, ratio: 1.0, attempts: [{ itemId: 'it1', isCorrect: true, score: 1.0 }] } })
  if (path === '/skilltree-student/mastery-update') return jsonResp(200, { ok: true, status: 200, data: { updated: 1, mastery: [{ conceptUri: CON2, mastery: 0.55, state: 'amber' }] } })
  if (path === '/skilltree-student/rag-ask') return jsonResp(200, { ok: true, status: 200, data: { mode: 'answer', question: body.question, answer: 'Đạo hàm của x² là 2x.', timings: { retrieveMs: 1.5 }, citations: [{ chunkId: 'ch1', documentId: 'd1', sectionPath: ['Chương 1', 'Hàm số'], heading: 'Hàm số', snippet: 'Đạo hàm…', score: 0.87 }] } })
  if (path === '/skilltree-student/rag-upload') return jsonResp(200, { ok: true, status: 200, data: { jobId: 'j1', statusUrl: '/api/v1/jobs/j1', docId: 'd1' } })
  return jsonResp(404, { ok: false, error: 'NOT_FOUND: ' + path })
}

/**
 * Boot one fresh component instance.
 * options.settings — pre-seed localStorage["skilltree.studentui.settings"]
 * Returns { render, storage, calls, exports }
 */
async function setup(options = {}) {
  const storage = fakeStorage()
  storage.setItem('skilltree.auth.v1', JSON.stringify({ accessToken: 'jwt-stu', user: { username: 'huyhs', role: 'student' } }))
  if (options.settings) storage.setItem('skilltree.studentui.settings', JSON.stringify(options.settings))
  const react = fakeReact()
  const calls = []
  globalThis.fetch = async (path, init) => fakeHost(path, init, calls)
  const loader = {}
  const fakeWindow = {
    localStorage: storage,
    fetch: (path, init) => fakeHost(path, init, calls),
    FormData: globalThis.FormData,
    setInterval: (fn, ms) => setInterval(fn, ms),
    clearInterval: (id) => clearInterval(id),
    __ModuleLoader__: { load: (def) => { loader.def = def } },
  }
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
  const render = async () => {
    let tree
    try {
      tree = renderFn()
      await react._flushEffects()
      await settle()
      tree = renderFn() // re-render with state set by async effects
      await react._flushEffects()
      await settle()
    } catch (err) {
      console.log('DEBUG render threw:', err && err.stack)
      throw err
    }
    return tree
  }
  return { render, storage, calls, exports: pluginModule }
}

/* ---- tree helpers (own-text match on buttons/labels) ---- */
function walk(el, fn) {
  if (Array.isArray(el)) { el.forEach((c) => walk(c, fn)); return }
  if (!el || typeof el !== 'object') return
  if (el.tag !== undefined) fn(el)
  const children = el && el.children
  if (children !== null && children !== undefined) walk(children, fn)
}
function textOf(el) {
  if (el === null || el === undefined || typeof el === 'boolean' || typeof el === 'number') return ''
  if (typeof el === 'string') return el
  if (Array.isArray(el)) return el.map(textOf).join('')
  if (el && typeof el === 'object' && el.tag !== undefined) return textOf(el.children)
  return ''
}
function fullText(tree) { let out = ''; walk(tree, (el) => { out += textOf(el) + '\n' }); return out }
function findButton(tree, label) {
  let exact = null
  let partial = null
  walk(tree, (el) => {
    if (el.tag !== 'button') return
    const t = textOf(el)
    if (t === label && !exact) exact = el
    if (t.includes(label) && !partial) partial = el
  })
  return exact || partial
}
function findTextarea(tree) {
  let hit = null
  walk(tree, (el) => { if (!hit && el.tag === 'textarea') hit = el })
  return hit
}
function findFileInput(tree) {
  let hit = null
  walk(tree, (el) => { if (!hit && el.tag === 'input' && el.props && el.props.type === 'file') hit = el })
  return hit
}
function findRadio(tree, name) {
  const hits = []
  walk(tree, (el) => { if (el.tag === 'input' && el.props && el.props.type === 'radio' && el.props.name === name) hits.push(el) })
  return hits
}
function callsTo(calls, path) { return calls.filter((c) => c.path === path) }
function lastCall(calls, path) { const list = callsTo(calls, path); return list[list.length - 1] || null }

/* ================= pure helper units ================= */

async function unitTests(mod) {
  const { linearize, nodeState, buildOverviewCalls, buildQuizItemsCall, buildBulkAttemptBody, buildMasteryBulkBody, citationPath, progressSteps } = mod

  // C1 linearize
  // C1 linearize: true cycle (a→b→c→a) leaves a,b,c unreachable → appended; z is a root.
  const graph = {
    nodes: [
      { identifier: 'a', fullStatement: 'A' },
      { identifier: 'b', fullStatement: 'B' },
      { identifier: 'c', fullStatement: 'C' },
      { identifier: 'z', fullStatement: 'Z (root)' },
    ],
    edges: [
      { sourceIdentifier: 'a', targetIdentifier: 'b', type: 'isPrerequisiteOf' },
      { sourceIdentifier: 'b', targetIdentifier: 'c', type: 'isPrerequisiteOf' },
      { sourceIdentifier: 'c', targetIdentifier: 'a', type: 'isPrerequisiteOf' }, // cycle
    ],
  }
  const view = linearize(graph)
  check('C1 linearize topo order + cycle fallback',
    view.order.join(',') === 'z,a,b,c'
    && view.prereqs.get('b')[0] === 'a'
    && view.prereqs.get('c')[0] === 'b'
    && view.unlocks.get('a')[0] === 'b', view.order.join(','))

  // C2 nodeState
  check('C2 nodeState priority',
    nodeState('green', false, true) === 'done'
    && nodeState(undefined, true, true) === 'next'
    && nodeState('amber', false, true) === 'learning'
    && nodeState('rusty', false, false) === 'learning'
    && nodeState(undefined, false, true) === 'locked'
    && nodeState(undefined, false, false) === 'ready', '')

  // C3 buildOverviewCalls
  const withDoc = buildOverviewCalls(SID, DOC1)
  const noDoc = buildOverviewCalls(SID, '')
  check('C3 buildOverviewCalls shape',
    withDoc.length === 6 && noDoc.length === 3
    && withDoc[2].path === 'documents' && withDoc[2].query === 'limit=200'
    && withDoc[5].path === 'students/' + SID + '/next' && withDoc[5].query === 'documentId=' + DOC1
    && withDoc[3].path === 'documents/' + DOC1 + '/graph', JSON.stringify(withDoc.map((c) => c.id)))

  // C4 buildQuizItemsCall
  const itemCall = buildQuizItemsCall('https://x/y z', 99)
  check('C4 buildQuizItemsCall encodes + caps',
    itemCall.prefix === 'quiz' && itemCall.path === 'items'
    && itemCall.query === 'conceptUri=' + encodeURIComponent('https://x/y z') + '&limit=10', itemCall.query)

  // C5 request body builders
  const attempt = buildBulkAttemptBody(SID, [{ itemId: 'it1', choiceId: 'cA' }])
  const mastery = buildMasteryBulkBody([{ itemId: 'it1', conceptUri: CON2, isCorrect: true }, { itemId: 'it2', conceptUri: null, isCorrect: false }])
  check('C5 M2/M5 body builders',
    attempt.candidateId === SID && attempt.responses[0].itemId === 'it1' && attempt.responses[0].response[0] === 'cA'
    && mastery.responses.length === 1 && mastery.responses[0].conceptUri === CON2 && mastery.responses[0].isCorrect === true, JSON.stringify(mastery))

  // C6 citationPath
  check('C6 citationPath',
    citationPath({ sectionPath: ['Chương 1', 'Hàm số'], heading: 'Hàm số' }) === 'Chương 1 › Hàm số'
    && citationPath({ heading: 'Định lý Pytago' }) === 'Định lý Pytago'
    && citationPath({}) === '', '')

  // C7 progressSteps
  const queued = progressSteps('queued')
  const ready = progressSteps('ready')
  const failed = progressSteps('failed')
  check('C7 progressSteps mapping',
    queued.length === 6 && queued[0].state === 'current' && queued[0].label === 'Đang chờ'
    && ready.every((s) => s.state === 'done') && ready[5].label === 'Sẵn sàng'
    && failed.every((s) => s.state === 'done'), JSON.stringify(queued[0]))
}

/* ================= behavior flows ================= */

async function behaviorTests() {
  // C8 mount → FAB click opens panel → overview loads, classes + roadmap + next highlight
  {
    const { render, calls, storage } = await setup({ settings: { studentId: SID, documentId: DOC1 } })
    let tree = await render()
    check('C8-pre panel closed until FAB clicked', !fullText(tree).includes('Lớp của tôi'), '')
    findButton(tree, '🎒 Học sinh').props.onClick()
    tree = await render()
    const overview = lastCall(calls, '/skilltree-student/batch')
    check('C8a overview batch sent with JWT + 6 calls',
      overview && overview.authorization === 'Bearer jwt-stu' && overview.body.calls.length === 6, JSON.stringify(overview && overview.body.calls.map((c) => c.id)))
    const text = fullText(tree)
    check('C8b classes + identity rendered', text.includes('Toán 10A1') && text.includes('Nguyễn Văn A'), '')
    check('C8c roadmap spine rendered with next highlight',
      text.includes('Hàm số bậc nhất') && text.includes('Hàm số bậc hai') && text.includes('Học ngay') && text.includes('90%'), '')
    check('C8d settings persisted', JSON.parse(storage.getItem('skilltree.studentui.settings')).studentId === SID, '')
  }

  // C9 quiz flow
  {
    const { render, calls } = await setup({ settings: { studentId: SID, documentId: DOC1 } })
    let tree = await render()
    findButton(tree, '🎒 Học sinh').props.onClick()
    tree = await render()
    const nodeBtn = findButton(tree, 'Hàm số bậc hai')
    if (!nodeBtn) {
      const btnTexts = []
      walk(tree, (el) => { if (el.tag === 'button') btnTexts.push(textOf(el)) })
      console.log('DEBUG C9 buttons:', JSON.stringify(btnTexts))
    }
    check('C9a node button exists', Boolean(nodeBtn), '')
    nodeBtn.props.onClick()
    tree = await render()
    const quizTab = findButton(tree, 'Kiểm tra nhanh')
    quizTab.props.onClick()
    tree = await render()
    const loadBtn = findButton(tree, 'Lấy câu hỏi')
    loadBtn.props.onClick()
    tree = await render()
    const text = fullText(tree)
    check('C9b items rendered without answer-key marker',
      text.includes('Đạo hàm của x² là gì?') && text.includes('2x') && text.includes('x')
      && !text.includes('Đáp án đúng') && !text.includes('correctResponse'), '')
    const radio = findRadio(tree, 'quiz-it1')[0]
    radio.props.onChange()
    tree = await render()
    const submitBtn = findButton(tree, 'Nộp bài')
    submitBtn.props.onClick()
    tree = await render()
    const quizCall = lastCall(calls, '/skilltree-student/quiz-submit')
    const masteryCall = lastCall(calls, '/skilltree-student/mastery-update')
    check('C9c quiz-submit body (candidateId + response)',
      quizCall && quizCall.authorization === 'Bearer jwt-stu'
      && quizCall.body.candidateId === SID && quizCall.body.responses[0].itemId === 'it1' && quizCall.body.responses[0].response[0] === 'cA',
      JSON.stringify(quizCall && quizCall.body))
    check('C9d mastery-update body (studentId + concept results)',
      masteryCall && masteryCall.body.studentId === SID
      && masteryCall.body.responses[0].conceptUri === CON2 && masteryCall.body.responses[0].isCorrect === true,
      JSON.stringify(masteryCall && masteryCall.body))
    check('C9e result line + per-question verdict rendered', fullText(tree).includes('Kết quả: đúng 1/1') && fullText(tree).includes('Chính xác!'), '')
  }

  // C10 ask flow
  {
    const { render, calls } = await setup({ settings: { studentId: SID, documentId: DOC1 } })
    let tree = await render()
    findButton(tree, '🎒 Học sinh').props.onClick()
    tree = await render()
    findButton(tree, 'Tài liệu').props.onClick()
    tree = await render()
    const box = findTextarea(tree)
    box.props.onChange({ target: { value: 'Đạo hàm của x² là gì?' } })
    tree = await render()
    const askBtn = findButton(tree, 'Hỏi')
    askBtn.props.onClick()
    tree = await render()
    const askCall = lastCall(calls, '/skilltree-student/rag-ask')
    check('C10a rag-ask body (question + default mode answer)',
      askCall && askCall.body.question === 'Đạo hàm của x² là gì?' && askCall.body.mode === 'answer', JSON.stringify(askCall && askCall.body))
    const text = fullText(tree)
    check('C10b answer + section-path citation rendered',
      text.includes('Đạo hàm của x² là 2x.') && text.includes('Chương 1 › Hàm số'), '')
  }

  // C11 upload flow + progress polling
  {
    const { render, calls } = await setup({ settings: { studentId: SID, documentId: DOC1 } })
    let tree = await render()
    findButton(tree, '🎒 Học sinh').props.onClick()
    tree = await render()
    findButton(tree, 'Tài liệu').props.onClick()
    tree = await render()
    const titleInput = (function findTitle(t) {
      let hit = null
      walk(t, (el) => { if (!hit && el.tag === 'input' && el.props && el.props.value === '' && el.props.placeholder && el.props.placeholder.includes('Ví dụ')) hit = el })
      return hit
    })(tree)
    titleInput.props.onChange({ target: { value: 'Toán 10 — Chương 1' } })
    const fileInput = findFileInput(tree)
    const fakeFile = { name: 'on-tap.md', size: 128 }
    fileInput.props.onChange({ target: { files: [fakeFile] } })
    tree = await render()
    const uploadBtn = findButton(tree, 'Nạp tài liệu')
    uploadBtn.props.onClick()
    tree = await render()
    const uploadCall = lastCall(calls, '/skilltree-student/rag-upload')
    check('C11a rag-upload posted as FormData with file + metadata',
      uploadCall && typeof uploadCall.body === 'object' && uploadCall.body instanceof globalThis.FormData
      && uploadCall.body.get('title') === 'Toán 10 — Chương 1' && uploadCall.body.get('uploaderId') === SID,
      uploadCall ? String(uploadCall.body) : 'no call')
    check('C11b progress steps visible (Đang chờ first)', fullText(tree).includes('Đang chờ'), '')
    await sleep(1700) // one poll tick
    tree = await render()
    const jobCall = callsTo(calls, '/skilltree-student/batch').filter((c) => c.body.calls && c.body.calls[0] && c.body.calls[0].id === 'job').pop()
    check('C11c job polled via batch (GET-only rag prefix)',
      jobCall && jobCall.body.calls[0].path === 'jobs/j1' && jobCall.body.calls[0].prefix === 'rag', JSON.stringify(jobCall && jobCall.body.calls))
    check('C11d ready notice rendered after poll', fullText(tree).includes('Tài liệu đã sẵn sàng'), '')
  }
}

const { exports: mod } = await setup({ settings: { studentId: SID, documentId: DOC1 } })
await unitTests(mod)
await behaviorTests()

console.log(failures === 0 ? 'ALL CLIENT CHECKS PASSED' : failures + ' CHECKS FAILED')
process.exit(failures === 0 ? 0 : 1)
