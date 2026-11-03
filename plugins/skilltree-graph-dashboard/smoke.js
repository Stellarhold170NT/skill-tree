/**
 * skilltree-graph-dashboard — smoke checks (no harness, no services needed).
 * Run: node smoke.js   (exit 0 = all pass)
 * Covers the pure logic of client.js, token purity, and the host RPC wiring.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');

const clientSrc = fs.readFileSync(path.join(__dirname, 'client.js'), 'utf8');
const hostSrc = fs.readFileSync(path.join(__dirname, 'host.js'), 'utf8');

const mod = new Function(
  clientSrc +
    '\nreturn { edgeIds, linearize, masteryIndex, displayState, materialsForConcept, pct, css, apply };'
)();

function check(name, fn) {
  fn();
  console.log('PASS ' + name);
}

// 1. linearize — real M1 shape (identifier keys + sourceIdentifier/targetIdentifier)
check('linearize: topo order + prereq/unlock maps (M1 build_graph shape)', () => {
  const graph = {
    nodes: [
      { id: 'uuid-a', identifier: 'https://case/CFItems/a', fullStatement: 'Biến', humanCodingScheme: '1.1' },
      { id: 'uuid-b', identifier: 'https://case/CFItems/b', fullStatement: 'Hàm', humanCodingScheme: '1.2' },
      { id: 'uuid-c', identifier: 'https://case/CFItems/c', fullStatement: 'Đệ quy', humanCodingScheme: '1.3' },
    ],
    edges: [
      { source: 'uuid-a', target: 'uuid-b', type: 'isPrerequisiteOf', sourceIdentifier: 'https://case/CFItems/a', targetIdentifier: 'https://case/CFItems/b' },
      { source: 'uuid-b', target: 'uuid-c', type: 'isPrerequisiteOf', sourceIdentifier: 'https://case/CFItems/b', targetIdentifier: 'https://case/CFItems/c' },
      { source: 'uuid-b', target: 'uuid-c', type: 'isPartOf', sourceIdentifier: 'https://case/CFItems/b', targetIdentifier: 'https://case/CFItems/c' },
    ],
  };
  const view = mod.linearize(graph);
  assert.deepStrictEqual(view.order, [
    'https://case/CFItems/a', 'https://case/CFItems/b', 'https://case/CFItems/c',
  ]);
  assert.deepStrictEqual(view.prereqs.get('https://case/CFItems/c'), ['https://case/CFItems/b']);
  assert.deepStrictEqual(view.unlocks.get('https://case/CFItems/a'), ['https://case/CFItems/b']);
  assert.strictEqual(view.isPartOf.get('https://case/CFItems/c'), 'https://case/CFItems/b');
  assert.strictEqual(view.labelOf(graph.nodes[0]), '1.1 · Biến');
});

// 2. linearize — legacy raw-id shape still works (node keyed by id only)
check('linearize: fallback to raw source/target when identifiers absent', () => {
  const graph = {
    nodes: [
      { id: 'x1', fullStatement: 'X' },
      { id: 'x2', fullStatement: 'Y' },
    ],
    edges: [{ source: 'x1', target: 'x2', type: 'isPrerequisiteOf' }],
  };
  const view = mod.linearize(graph);
  assert.deepStrictEqual(view.order, ['x1', 'x2']);
  assert.deepStrictEqual(view.unlocks.get('x1'), ['x2']);
});

// 3. linearize — cycle fallback keeps every node visible
check('linearize: cycle fallback appends unvisited nodes', () => {
  const graph = {
    nodes: [{ identifier: 'a' }, { identifier: 'b' }],
    edges: [
      { sourceIdentifier: 'a', targetIdentifier: 'b', type: 'isPrerequisiteOf' },
      { sourceIdentifier: 'b', targetIdentifier: 'a', type: 'isPrerequisiteOf' },
    ],
  };
  const view = mod.linearize(graph);
  assert.deepStrictEqual([...view.order].sort(), ['a', 'b']);
});

// 4. masteryIndex + displayState (M5 states vs structural fallback)
check('masteryIndex/displayState: green|amber|red|rusty + next|locked fallback', () => {
  const map = mod.masteryIndex([
    { conceptUri: 'c1', state: 'green', mastery: 0.92, rating: 1660, ratingDeviation: 70, reviewCount: 5 },
    { conceptUri: 'c2', state: 'rusty', mastery: 0.7, rating: 1520, ratingDeviation: 90, reviewCount: 3 },
  ]);
  assert.strictEqual(map.get('c1').state, 'green');
  assert.strictEqual(mod.displayState(0, undefined), 'next');
  assert.strictEqual(mod.displayState(2, undefined), 'locked');
  assert.strictEqual(mod.displayState(1, map.get('c1')), 'green');
  assert.strictEqual(mod.displayState(1, map.get('c2')), 'rusty');
  assert.strictEqual(mod.displayState(1, { state: 'amber' }), 'amber');
  assert.strictEqual(mod.displayState(1, { state: 'red' }), 'red');
  assert.strictEqual(map.size, 2);
  assert.strictEqual(mod.masteryIndex('nope').size, 0);
});

// 5. materialsForConcept — M9 chunks filtered by alignment conceptUri
check('materialsForConcept: filters chunks by alignment conceptUri', () => {
  const chunks = [
    { id: 'k1', orderIndex: 0, text: 'Biến là…', alignments: [{ conceptUri: 'c1', alignmentType: 'teaches' }] },
    { id: 'k2', orderIndex: 1, text: 'Hàm là…', alignments: [{ conceptUri: 'c2', alignmentType: 'assesses' }] },
    { id: 'k3', orderIndex: 2, text: 'Không alignment', alignments: [] },
  ];
  const got = mod.materialsForConcept(chunks, 'c1');
  assert.strictEqual(got.length, 1);
  assert.strictEqual(got[0].id, 'k1');
  assert.deepStrictEqual(mod.materialsForConcept(chunks, 'zz'), []);
  assert.deepStrictEqual(mod.materialsForConcept(undefined, 'c1'), []);
});

// 6. pct formatting
check('pct: 0..1 mastery → percent label', () => {
  assert.strictEqual(mod.pct(0.85), '85%');
  assert.strictEqual(mod.pct(0.3999), '40%');
  assert.strictEqual(mod.pct(undefined), '—');
});

// 7. Token purity — DESIGN.md tokens present, legacy accent gone, no gradients
check('css: --st-* tokens present; #4136d6 and gradients absent', () => {
  const cssText = mod.css();
  assert.ok(cssText.includes('--st-primary-500:#27A95F'), 'primary token');
  assert.ok(cssText.includes('--st-danger:#B3261E'), 'danger token');
  assert.ok(cssText.includes('--st-warn-fill:#F5C453'), 'warn fill token');
  assert.ok(!cssText.includes('#4136d6'), 'legacy purple removed');
  assert.ok(!/gradient/i.test(cssText), 'no gradient (anti-slop)');
  assert.ok(cssText.includes('system-ui'), 'DESIGN.md UI font stack');
});

// 8. Host half wires the four RPCs through the host web service
check('host.js: four RPCs + ctx.get("web") wiring + M9 documentUri resolution', () => {
  assert.ok(hostSrc.includes("'skilltree.listSubjects'"));
  assert.ok(hostSrc.includes("'skilltree.getGraph'"));
  assert.ok(hostSrc.includes("'skilltree.getMaterials'"));
  assert.ok(hostSrc.includes("'skilltree.getMastery'"));
  assert.ok(hostSrc.includes("ctx.get('web')"));
  // M1↔M9 join: document-service links rows via Document.documentUri
  // (the M1 CFDocument identifier), so getMaterials must resolve the M9 row
  // by documentUri before listing chunks.
  assert.ok(hostSrc.includes('documentUri'), 'getMaterials resolves M9 document by documentUri');
  assert.ok(hostSrc.includes('/api/v1/documents?limit=200'), 'M9 document listing for resolution');
});

// 9. Client half registers the additive overlay entry and passes documentUri
check('client.js: shell.overlay registration (order 51) + documentUri passthrough', () => {
  assert.ok(clientSrc.includes("'shell.overlay'"));
  assert.ok(clientSrc.includes("id: 'skilltree-graph-dashboard'"));
  assert.ok(clientSrc.includes('documentUri: subjectUri'), 'client passes the selected subject identifier');
  assert.ok(typeof mod.apply === 'function');
});

console.log('smoke: 9/9 checks passed');
