/**
 * Unit tests for skilltree-memory/lib/dataset.js — the per-student dataset
 * grouping rules (V1 minimum bar: unit tests for logic + manual verify guide).
 *
 * Run:  npm test                          (from plugins/skilltree-memory/, node >= 18)
 *   (= "node --test" + the glob declared in package.json scripts.test)
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  DATASET_PREFIX,
  DatasetError,
  UNASSIGNED_DATASET,
  buildEvolutionDocument,
  datasetForStudent,
  eventsToDocument,
  groupEventsByStudent,
  resolveEventAction,
  resolveEventObject,
  resolveEventStudent,
  resolveEventTime,
  sanitizeStudentId,
  summarizeEvents,
} from '../lib/dataset.js'

// ---------------------------------------------------------------- sanitizeStudentId

test('sanitizeStudentId keeps a plain candidateId (trimmed, lowercased)', () => {
  assert.equal(sanitizeStudentId('  CAND-2026-001 '), 'cand-2026-001')
})

test('sanitizeStudentId keeps uuid-like ids intact', () => {
  const id = '3fa85f64-5717-4562-b3fc-2c963f66afa6'
  assert.equal(sanitizeStudentId(id), id)
})

test('sanitizeStudentId replaces illegal characters with dashes', () => {
  assert.equal(sanitizeStudentId('hs../../etc/passwd'), 'hs..-..-etc-passwd')
  assert.equal(sanitizeStudentId('học sinh 12'), 'h-c-sinh-12')
})

test('sanitizeStudentId collapses separator runs and strips edges', () => {
  assert.equal(sanitizeStudentId('--a***b--'), 'a-b')
  assert.equal(sanitizeStudentId('...x...'), 'x')
})

test('sanitizeStudentId caps length at 64 characters', () => {
  const long = 'a'.repeat(100)
  assert.equal(sanitizeStudentId(long).length, 64)
})

test('sanitizeStudentId rejects empty / blank / unusable ids', () => {
  assert.throws(() => sanitizeStudentId(''), DatasetError)
  assert.throws(() => sanitizeStudentId('   '), DatasetError)
  assert.throws(() => sanitizeStudentId(null), DatasetError)
  assert.throws(() => sanitizeStudentId(undefined), DatasetError)
  assert.throws(() => sanitizeStudentId('///'), DatasetError)
})

// ---------------------------------------------------------------- datasetForStudent

test('datasetForStudent prefixes with student-', () => {
  assert.equal(datasetForStudent('hs001'), 'student-hs001')
  assert.equal(DATASET_PREFIX, 'student-')
})

test('datasetForStudent isolates distinct students into distinct datasets', () => {
  const a = datasetForStudent('cand-a')
  const b = datasetForStudent('cand-b')
  assert.notEqual(a, b)
  assert.equal(a, 'student-cand-a')
  assert.equal(b, 'student-cand-b')
})

test('datasetForStudent is stable for case/whitespace variants of one id', () => {
  assert.equal(datasetForStudent('Cand-A'), datasetForStudent(' cand-a '))
})

// ---------------------------------------------------------------- event field resolution

test('resolveEventStudent reads the documented aliases in order', () => {
  assert.equal(resolveEventStudent({ candidateId: 'cand-1' }), 'cand-1')
  assert.equal(resolveEventStudent({ candidate_id: 'cand-2' }), 'cand-2')
  assert.equal(resolveEventStudent({ studentId: 'hs-9' }), 'hs-9')
  assert.equal(resolveEventStudent({ actor: { id: 'caliper-actor-1' } }), 'caliper-actor-1')
  assert.equal(resolveEventStudent({ unrelated: true }), null)
  assert.equal(resolveEventStudent('not-an-object'), null)
})

test('resolveEventAction defaults to interacted and reads aliases', () => {
  assert.equal(resolveEventAction({}), 'interacted')
  assert.equal(resolveEventAction({ action: 'attempted' }), 'attempted')
  assert.equal(resolveEventAction({ type: 'NavigationEvent' }), 'NavigationEvent')
})

test('resolveEventObject and resolveEventTime read aliases', () => {
  assert.equal(resolveEventObject({ object: 'recursion' }), 'recursion')
  assert.equal(resolveEventObject({ conceptId: 'c-graph' }), 'c-graph')
  assert.equal(resolveEventObject({}), '')
  assert.equal(resolveEventTime({ eventTime: '2026-10-31T10:00:00Z' }), '2026-10-31T10:00:00Z')
  assert.equal(resolveEventTime({ ts: 1730000000 }), '1730000000')
  assert.equal(resolveEventTime({}), '')
})

// ---------------------------------------------------------------- groupEventsByStudent

const MIXED_EVENTS = [
  { candidateId: 'cand-a', action: 'attempted', object: 'recursion', timestamp: '2026-10-31T09:00:00Z' },
  { studentId: 'HS-02', action: 'mastered', object: 'loops', timestamp: '2026-10-31T09:05:00Z' },
  { actor: { id: 'cand-a' }, type: 'ViewedEvent', object: { id: 'doc-7' } },
  { action: 'practiced', object: 'sorting', timestamp: '2026-10-31T09:10:00Z' }, // no student -> fallback below
]

test('groupEventsByStudent groups a mixed batch per student', () => {
  const { groups, unassigned } = groupEventsByStudent(MIXED_EVENTS)
  assert.equal(unassigned.length, 1) // only the event with no student and no fallback
  assert.deepEqual(unassigned[0], { index: 3, event: MIXED_EVENTS[3], reason: 'no student field and no fallbackStudentId' })
  const byDataset = new Map(groups.map((g) => [g.dataset, g]))
  assert.equal(groups.length, 2)
  assert.equal(byDataset.get('student-cand-a').events.length, 2)
  assert.equal(byDataset.get('student-hs-02').events.length, 1)
})

test('groupEventsByStudent uses fallbackStudentId for anonymous events', () => {
  const { groups, unassigned } = groupEventsByStudent(MIXED_EVENTS, 'cand-b')
  assert.equal(unassigned.length, 0)
  const byDataset = new Map(groups.map((g) => [g.dataset, g]))
  assert.equal(byDataset.get('student-cand-b').events.length, 1)
  assert.equal(byDataset.get('student-cand-b').studentId, 'cand-b')
})

test('groupEventsByStudent keeps every event in exactly one group (no duplication, no loss)', () => {
  const { groups, unassigned } = groupEventsByStudent(MIXED_EVENTS, 'cand-b')
  const grouped = groups.reduce((sum, g) => sum + g.events.length, 0)
  assert.equal(grouped + unassigned.length, MIXED_EVENTS.length)
})

test('groupEventsByStudent throws on non-array input and rejects null events safely', () => {
  assert.throws(() => groupEventsByStudent('nope'), DatasetError)
  const { unassigned } = groupEventsByStudent([null, 42, { candidateId: 'cand-a' }])
  assert.equal(unassigned.length, 2)
  assert.equal(unassigned[0].index, 0)
  assert.equal(unassigned[1].index, 1)
})

// ---------------------------------------------------------------- eventsToDocument

test('eventsToDocument is deterministic and timestamp-sorted', () => {
  const dataset = 'student-cand-a'
  const events = [
    { candidateId: 'cand-a', action: 'practiced', object: 'sorting', timestamp: '2026-10-31T09:10:00Z' },
    { candidateId: 'cand-a', action: 'attempted', object: 'recursion', timestamp: '2026-10-31T09:00:00Z' },
  ]
  const once = eventsToDocument(dataset, events)
  const twice = eventsToDocument(dataset, [...events].reverse())
  assert.equal(once, twice)
  const attemptedLine = once.split('\n').findIndex((l) => l.includes('attempted'))
  const practicedLine = once.split('\n').findIndex((l) => l.includes('practiced'))
  assert.ok(attemptedLine < practicedLine, 'earlier event must come first')
})

test('eventsToDocument renders the Caliper tuple (actor, action, object, time)', () => {
  const doc = eventsToDocument('student-hs-02', [
    { studentId: 'HS-02', actor: { name: 'An' }, action: 'mastered', object: 'loops', timestamp: '2026-10-31T09:05:00Z' },
  ])
  const line = doc.split('\n').find((l) => l.startsWith('- ['))
  assert.match(line, /\[2026-10-31T09:05:00Z\]/)
  assert.match(line, /\bAn\b/)
  assert.match(line, /\bmastered\b/)
  assert.match(line, /\bloops\b/)
})

test('eventsToDocument marks missing timestamps as no-time', () => {
  const doc = eventsToDocument('student-x', [{ candidateId: 'x', action: 'viewed' }])
  assert.match(doc, /\[no-time\]/)
})

// ---------------------------------------------------------------- summarizeEvents

test('summarizeEvents counts actions, unique concepts and latest timestamp', () => {
  const summary = summarizeEvents([
    { candidateId: 'cand-a', action: 'attempted', object: 'recursion', timestamp: '2026-10-31T09:00:00Z' },
    { candidateId: 'cand-a', action: 'attempted', object: 'recursion', timestamp: '2026-10-31T09:01:00Z' },
    { candidateId: 'cand-a', action: 'mastered', object: 'loops', timestamp: '2026-10-31T09:05:00Z' },
  ])
  assert.equal(summary.total, 3)
  assert.deepEqual(summary.byAction, { attempted: 2, mastered: 1 })
  assert.deepEqual(summary.concepts, ['recursion', 'loops'])
  assert.equal(summary.lastTimestamp, '2026-10-31T09:05:00Z')
})

// ---------------------------------------------------------------- buildEvolutionDocument

test('buildEvolutionDocument includes digest, concepts and optional note', () => {
  const summary = summarizeEvents([
    { candidateId: 'cand-a', action: 'attempted', object: 'recursion', timestamp: '2026-10-31T09:00:00Z' },
    { candidateId: 'cand-a', action: 'attempted', object: 'recursion', timestamp: '2026-10-31T09:01:00Z' },
    { candidateId: 'cand-a', action: 'mastered', object: 'loops', timestamp: '2026-10-31T09:05:00Z' },
  ])
  const doc = buildEvolutionDocument('student-cand-a', summary, 'Cần ôn lại đệ quy trước kỳ thi.')
  assert.match(doc, /# Knowledge evolution — dataset student-cand-a/)
  assert.match(doc, /- attempted: 2/)
  assert.match(doc, /- mastered: 1/)
  assert.match(doc, /## Concepts touched/)
  assert.match(doc, /- recursion/)
  assert.match(doc, /- loops/)
  assert.match(doc, /Cần ôn lại đệ quy trước kỳ thi\./)
})

test('buildEvolutionDocument omits the note section when note is blank', () => {
  const doc = buildEvolutionDocument('student-x', summarizeEvents([]), '   ')
  assert.doesNotMatch(doc, /## Teacher\/agent note/)
})

// ---------------------------------------------------------------- unassigned dataset constant

test('UNASSIGNED_DATASET is namespaced under the student- prefix', () => {
  assert.equal(UNASSIGNED_DATASET, 'student-unassigned')
})
