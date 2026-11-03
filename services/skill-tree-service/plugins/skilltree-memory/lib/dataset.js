/**
 * skilltree-memory/lib/dataset.js — pure dataset-grouping logic (no I/O, no deps).
 *
 * Contract (V1, AGENTS.md §1.6 + openspec/changes/v1-cognee-plugin/):
 *   - ONE isolated Cognee dataset per student: `student-<candidateId>`,
 *     where candidateId is the anonymous candidate id from class-service (M6).
 *   - Learning events (Caliper v1.2 style tuples or plain progress records)
 *     are grouped per student before ingestion so one agent call can fan out
 *     into one document per student dataset — no cross-student bleed.
 *   - Events that cannot be resolved to a student are collected in
 *     `unassigned` (with the reason) — never silently dropped, never ingested
 *     into a wrong dataset.
 *
 * Every function here is deterministic and side-effect free so that
 * test/dataset.test.mjs can verify the grouping rules with plain node:test.
 */

export const DATASET_PREFIX = 'student-'

/** Dataset label for events that carry no resolvable student id. */
export const UNASSIGNED_DATASET = `${DATASET_PREFIX}unassigned`

/** Max characters kept from a candidateId after sanitization. */
export const ID_MAX_LENGTH = 64

/** Characters allowed inside a dataset id segment (after lowercasing). */
const ALLOWED_ID_CHARS = /[^a-z0-9._-]/g

/** Student identity field aliases, most specific first (Caliper actor last). */
export const STUDENT_FIELDS = [
  'candidateId',
  'candidate_id',
  'studentId',
  'student_id',
  'userId',
  'user_id',
  'actor.id',
]

/** Action (Caliper verb) aliases. */
export const ACTION_FIELDS = ['action', 'type', 'eventType', 'event_type']

/** Learning object (concept/document) aliases. */
export const OBJECT_FIELDS = [
  'object',
  'concept',
  'conceptId',
  'concept_id',
  'object.id',
  'target',
]

/** Timestamp aliases (Caliper eventTime first). */
export const TIME_FIELDS = ['timestamp', 'eventTime', 'event_time', 'time', 'ts']

/** Actor display aliases (name preferred over raw id). */
export const ACTOR_FIELDS = ['actor.name', 'userName', 'user_name', 'actor.id', 'actor']

export class DatasetError extends Error {}

/** Read a dotted path ('actor.id') without throwing on missing links. */
function getField(event, path) {
  let cursor = event
  for (const key of path.split('.')) {
    if (cursor === null || typeof cursor !== 'object') return undefined
    cursor = cursor[key]
  }
  return cursor
}

/** Deterministic string coercion: objects become stable JSON. */
function stringifyValue(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function firstField(event, fields) {
  for (const field of fields) {
    const value = stringifyValue(getField(event, field))
    if (value !== '') return value
  }
  return null
}

/**
 * Sanitize a candidateId into a safe dataset segment:
 * trimmed, lowercased, only [a-z0-9._-], dashes collapsed, no leading/trailing
 * separators, capped at ID_MAX_LENGTH. Throws DatasetError when nothing usable
 * remains — a wrong-but-quiet dataset name would silently mix students.
 */
export function sanitizeStudentId(raw) {
  if (raw === null || raw === undefined) {
    throw new DatasetError('studentId is required (candidateId from class-service M6)')
  }
  const lowered = String(raw).trim().toLowerCase()
  if (lowered === '') throw new DatasetError('studentId is empty')
  const cleaned = lowered
    .replace(ALLOWED_ID_CHARS, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+/, '')
    .replace(/[-.]+$/, '')
  if (cleaned === '') {
    throw new DatasetError(`studentId "${raw}" has no usable characters`)
  }
  return cleaned.slice(0, ID_MAX_LENGTH)
}

/** Dataset name owning this student's memory: `student-<sanitized candidateId>`. */
export function datasetForStudent(studentId) {
  return DATASET_PREFIX + sanitizeStudentId(studentId)
}

/** Resolve the student a single event belongs to (null when unresolvable). */
export function resolveEventStudent(event) {
  if (event === null || typeof event !== 'object') return null
  return firstField(event, STUDENT_FIELDS)
}

/** Resolve a display action verb (default: `interacted` — Caliper generic). */
export function resolveEventAction(event) {
  if (event === null || typeof event !== 'object') return 'interacted'
  return firstField(event, ACTION_FIELDS) ?? 'interacted'
}

/** Resolve the learning object of the event ('' when absent). */
export function resolveEventObject(event) {
  if (event === null || typeof event !== 'object') return ''
  return firstField(event, OBJECT_FIELDS) ?? ''
}

/** Resolve the event timestamp ('' when absent). */
export function resolveEventTime(event) {
  if (event === null || typeof event !== 'object') return ''
  return firstField(event, TIME_FIELDS) ?? ''
}

/** Resolve a display actor ('unknown-actor' when absent). */
export function resolveEventActor(event) {
  if (event === null || typeof event !== 'object') return 'unknown-actor'
  return firstField(event, ACTOR_FIELDS) ?? 'unknown-actor'
}

/**
 * Group events into per-student buckets.
 *
 * @param {Array} events - learning events (objects); non-objects are unassigned.
 * @param {string|null} fallbackStudentId - used when an event itself carries no
 *   student field (e.g. the agent ingests a single student's batch).
 * @returns {{groups: Array<{dataset, studentId, events}>, unassigned: Array<{index, event, reason}>}}
 */
export function groupEventsByStudent(events, fallbackStudentId = null) {
  if (!Array.isArray(events)) throw new DatasetError('events must be an array')
  const fallbackDataset = fallbackStudentId ? datasetForStudent(fallbackStudentId) : null
  const byDataset = new Map()
  const unassigned = []
  events.forEach((event, index) => {
    const studentId = resolveEventStudent(event)
    if (studentId === null && fallbackDataset === null) {
      unassigned.push({ index, event, reason: 'no student field and no fallbackStudentId' })
      return
    }
    const dataset = studentId !== null ? datasetForStudent(studentId) : fallbackDataset
    if (!byDataset.has(dataset)) {
      byDataset.set(dataset, { dataset, studentId: studentId ?? sanitizeStudentId(fallbackStudentId), events: [] })
    }
    byDataset.get(dataset).events.push(event)
  })
  return { groups: [...byDataset.values()], unassigned }
}

/**
 * Render one student's events as a deterministic markdown document
 * (sorted by timestamp so re-ingesting the same batch yields the same bytes).
 */
export function eventsToDocument(dataset, events) {
  const rows = events.map((event) => ({
    time: resolveEventTime(event),
    actor: resolveEventActor(event),
    action: resolveEventAction(event),
    object: resolveEventObject(event),
  }))
  rows.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0))
  const lines = [
    `# Learning events — dataset ${dataset}`,
    `# Events: ${rows.length}`,
    '',
    ...rows.map(
      (row) =>
        `- [${row.time || 'no-time'}] ${row.actor} ${row.action}${row.object ? ` ${row.object}` : ''}`,
    ),
  ]
  return lines.join('\n')
}

/** Aggregate counters used by the periodic evolution digest. */
export function summarizeEvents(events) {
  const byAction = {}
  const concepts = []
  let lastTimestamp = ''
  for (const event of events) {
    const action = resolveEventAction(event)
    byAction[action] = (byAction[action] ?? 0) + 1
    const object = resolveEventObject(event)
    if (object !== '' && !concepts.includes(object)) concepts.push(object)
    const time = resolveEventTime(event)
    if (time > lastTimestamp) lastTimestamp = time
  }
  return { total: events.length, byAction, concepts, lastTimestamp }
}

/**
 * Render the periodic "knowledge evolution" document ingested by
 * memory_evolve: progress digest + concepts touched + optional note.
 */
export function buildEvolutionDocument(dataset, summary, note = '') {
  const parts = [
    `# Knowledge evolution — dataset ${dataset}`,
    `# Latest event: ${summary.lastTimestamp || 'n/a'} — events in batch: ${summary.total}`,
    '',
    '## Progress digest',
    ...Object.entries(summary.byAction).map(([action, count]) => `- ${action}: ${count}`),
  ]
  if (summary.concepts.length > 0) {
    parts.push('', '## Concepts touched', ...summary.concepts.map((concept) => `- ${concept}`))
  }
  const trimmedNote = typeof note === 'string' ? note.trim() : ''
  if (trimmedNote !== '') {
    parts.push('', '## Teacher/agent note', trimmedNote)
  }
  return parts.join('\n')
}
