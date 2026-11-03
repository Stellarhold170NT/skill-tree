/**
 * roadmap-viewer — smoke checks for the DESIGN.md recolor (no harness needed).
 * Run: node smoke.cjs   (exit 0 = all pass)
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');

const clientSrc = fs.readFileSync(path.join(__dirname, 'client/client.js'), 'utf8');
const hostSrc = fs.readFileSync(path.join(__dirname, 'lib/index.js'), 'utf8');

// Strip the __ModuleLoader__ wrapper (factory body only), then evaluate with a
// require stub — the body defines css + apply at top level.
const body = clientSrc.slice(
  clientSrc.indexOf('var module'),
  clientSrc.lastIndexOf('return module.exports;')
);
const mod = new Function(
  'require',
  body + '\nreturn { apply, css };'
)((name) => (name === 'react' ? { createElement: () => {}, useState: () => [null, () => {}], useEffect: () => {}, useMemo: (f) => f() } : {}));

function check(name, fn) {
  fn();
  console.log('PASS ' + name);
}

// 1. Legacy accent fully replaced by DESIGN.md tokens
check('css: #4136d6 removed; --st-* tokens present', () => {
  const cssText = mod.css();
  assert.ok(!cssText.includes('#4136d6'), 'legacy purple removed');
  assert.ok(!cssText.includes('#f3f2ff'), 'legacy next-state tint removed');
  assert.ok(!/gradient/i.test(cssText), 'no gradient (anti-slop)');
  assert.ok(cssText.includes('--st-primary-500:#27A95F'), 'brand primary token');
  assert.ok(cssText.includes('--st-success-tint:#E6F7EC'), 'success tint token');
  assert.ok(cssText.includes('--st-danger:#B3261E'), 'mastery danger token');
  assert.ok(cssText.includes('--st-warn:#8A4B00'), 'mastery warn token');
  assert.ok(cssText.includes('system-ui'), 'DESIGN.md UI font stack');
});

// 2. done/next/locked states kept (topology + states preserved)
check('states: done/next/locked classes still rendered', () => {
  assert.ok(clientSrc.includes(".rmv-node.rmv-next"));
  assert.ok(clientSrc.includes(".rmv-node.rmv-done"));
  assert.ok(clientSrc.includes(".rmv-node.rmv-locked"));
  assert.ok(clientSrc.includes("'roadmap.done.'"), 'localStorage progress kept');
});

// 3. Edge mapping fixed for the real M1 build_graph shape
check('edges: sourceIdentifier/targetIdentifier preferred (M1 shape)', () => {
  assert.ok(clientSrc.includes('e.sourceIdentifier'), 'edge source identifier mapping');
  assert.ok(clientSrc.includes('e.targetIdentifier'), 'edge target identifier mapping');
});

// 4. Host same-origin route + overlay registration untouched
check('wiring: /roadmap-viewer/get-graph route + shell.overlay entry', () => {
  assert.ok(hostSrc.includes("'/roadmap-viewer/get-graph'"));
  assert.ok(hostSrc.includes('webServer.register'));
  assert.ok(clientSrc.includes("'shell.overlay'"));
  assert.ok(!clientSrc.includes('host.call'), 'client must use the same-origin route');
  assert.ok(typeof mod.apply === 'function');
});

console.log('smoke: 4/4 checks passed');
