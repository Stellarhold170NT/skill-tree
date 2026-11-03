/**
 * skilltree-memory — host half. Classroom memory for the SkillTree harness (M4).
 *
 *   LLM (inside Cognee MCP server, NetMind gateway via env — never in this repo)
 *     <- Cognee MCP (HTTP JSON-RPC, streamable-http)
 *     <- tool memory_* (this plugin)
 *     <- agent in skill-tree-service
 *
 * Registered model tools — exactly 3 (brief b_cognee_plugin):
 *   memory_ingest : Caliper/progress learning events (+/- raw text) -> ONE
 *                   document per student in that student's Cognee dataset.
 *   memory_ask    : Q&A over ONE student's evolving knowledge (hybrid
 *                   vector+graph recall scoped to student-<candidateId>).
 *   memory_evolve : periodic knowledge-evolution pipeline: progress digest
 *                   (+ optional note) re-ingested with an education-specific
 *                   extraction prompt, then pipeline status.
 *
 * Dataset isolation: `student-<candidateId>` (candidateId = anonymous id from
 * class-service M6) — see lib/dataset.js. Events that cannot be resolved to a
 * student are reported in the tool result as `unassigned`, never ingested.
 *
 * Connection: the SAME Cognee MCP server the harness already wires via the
 * `mcp-cognee-memory` row in plugins/patch.yml (dev server cognee-mcp-v2 at
 * http://${DEV_HOST}:8021/mcp). Config: patch row `config:{url,clientName,
 * timeoutMs}`; env override SKILLTREE_MEMORY_MCP_URL. This plugin stores no
 * credentials and calls no LLM itself.
 */
import { defineTool } from '@deepseek-ai/dsh-tools'
import {
  DatasetError,
  UNASSIGNED_DATASET,
  buildEvolutionDocument,
  datasetForStudent,
  eventsToDocument,
  groupEventsByStudent,
  sanitizeStudentId,
  summarizeEvents,
} from './dataset.js'

export const name = 'skilltree-memory'
export const inject = ['tools']

const DEFAULT_URL = 'http://${DEV_HOST}:8021/mcp'
const PROTOCOL_VERSION = '2025-03-26'
const MAX_DATA_CHARS = 2_000_000 // sanity guard before pushing to the server
const EVOLUTION_PROMPT =
  'Extract education entities (Concept, MasteryLevel, StruggleArea, ReviewEvent) ' +
  'and temporal relations (mastered_before, struggled_with, reviewed_after) ' +
  'including their timestamps.'

const str = (desc) => ({ type: 'string', description: desc })
const num = (desc) => ({ type: 'number', description: desc })
const bool = (desc) => ({ type: 'boolean', description: desc })
const j = (value) => JSON.stringify(value)

/** Friendly aliases -> Cognee SearchType enum names (lowercase in, enum out). */
const SEARCH_ALIASES = {
  hybrid: 'HYBRID_COMPLETION',
  rag: 'RAG_COMPLETION',
  graph: 'GRAPH_COMPLETION',
  graph_cot: 'GRAPH_COMPLETION_COT',
  summaries: 'SUMMARIES',
  chunks: 'CHUNKS',
  code: 'CODE',
  temporal: 'TEMPORAL',
}

function resolveSearchType(value) {
  if (!value) return undefined
  const key = String(value).trim()
  if (!key) return undefined
  return SEARCH_ALIASES[key.toLowerCase()] || key
}

/** Clamp top_k into 1..50 (server default 15). */
function clampTopK(k, fallback = 10) {
  const val = Number(k)
  if (!Number.isFinite(val)) return fallback
  return Math.min(50, Math.max(1, Math.round(val)))
}

/** Parse an MCP streamable-HTTP body: plain JSON or SSE (`data:` lines). */
function parseMcpBody(text) {
  const trimmed = (text || '').trim()
  if (trimmed.startsWith('{')) {
    try {
      return JSON.parse(trimmed)
    } catch {
      /* fall through to SSE scan */
    }
  }
  let last
  for (const line of trimmed.split(/\r?\n/)) {
    if (line.startsWith('data:')) {
      try {
        last = JSON.parse(line.slice(5).trim())
      } catch {
        /* skip malformed line */
      }
    }
  }
  return last
}

class MemoryMcpError extends Error {}

/** Minimal MCP streamable-HTTP client: initialize -> tools/call (+ one re-init retry). */
class MemoryMcpClient {
  constructor({ url, clientName, timeoutMs }) {
    this.url = url
    this.clientName = clientName
    this.timeoutMs = timeoutMs
    this.sessionId = null
    this.serverInfo = null
  }

  async #exchange(payload, session, signal) {
    const headers = {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    }
    if (session) headers['mcp-session-id'] = session
    const deadline = AbortSignal.any([signal, AbortSignal.timeout(this.timeoutMs)])
    let res
    try {
      res = await fetch(this.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: deadline,
      })
    } catch (err) {
      if (signal && signal.aborted) throw new Error('memory request cancelled')
      throw new MemoryMcpError(
        `skilltree-memory MCP unreachable (${this.url}): ${err?.cause?.message || err?.message || err}`,
      )
    }
    const text = await res.text()
    return { status: res.status, session: res.headers.get('mcp-session-id'), text }
  }

  async handshake(signal) {
    this.sessionId = null
    const init = await this.#exchange(
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: { name: this.clientName, version: '0.1.0' },
        },
      },
      null,
      signal,
    )
    if (init.status !== 200) {
      throw new MemoryMcpError(`skilltree-memory MCP HTTP ${init.status}: ${init.text.slice(0, 300)}`)
    }
    const body = parseMcpBody(init.text)
    if (body?.error) throw new MemoryMcpError(`skilltree-memory MCP initialize failed: ${body.error.message}`)
    this.sessionId = init.session || this.sessionId
    this.serverInfo = body?.result?.serverInfo || null
    if (this.sessionId) {
      try {
        await this.#exchange({ jsonrpc: '2.0', method: 'notifications/initialized' }, this.sessionId, signal)
      } catch {
        /* non-fatal */
      }
    }
    return { serverInfo: this.serverInfo }
  }

  async ensureSession(signal) {
    if (!this.sessionId) await this.handshake(signal)
  }

  async call(name, args, signal, { retry = true } = {}) {
    await this.ensureSession(signal)
    const payload = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name, arguments: args && Object.keys(args).length ? args : {} },
    }
    const res = await this.#exchange(payload, this.sessionId, signal)
    // Server restarted / session expired -> one fresh-handshake retry.
    if (res.status === 404 && retry) {
      await this.handshake(signal)
      return this.call(name, args, signal, { retry: false })
    }
    if (res.status !== 200) {
      throw new MemoryMcpError(`skilltree-memory MCP tools/call ${name} HTTP ${res.status}: ${res.text.slice(0, 300)}`)
    }
    const body = parseMcpBody(res.text)
    if (body?.error) throw new MemoryMcpError(`skilltree-memory MCP ${name} failed: ${body.error.message}`)
    return body?.result ?? {}
  }
}

/** Flatten MCP tool result content to text; throw on isError. */
function extractText(result) {
  const parts = []
  for (const c of result?.content || []) {
    if (c?.type === 'text') parts.push(c.text)
    else if (c?.type === 'resource' && typeof c.resource?.text === 'string') parts.push(c.resource.text)
    else parts.push(JSON.stringify(c))
  }
  const text = parts.join('\n').trim()
  if (result?.isError) throw new Error(`skilltree-memory server error: ${text.slice(0, 500) || 'unknown'}`)
  return text || '(empty result)'
}

/** Accept an events argument as an array or a JSON string. */
function parseEventsArg(args) {
  if (args.events === undefined || args.events === null || args.events === '') return null
  if (Array.isArray(args.events)) return args.events
  if (typeof args.events === 'string') {
    try {
      const parsed = JSON.parse(args.events)
      if (!Array.isArray(parsed)) throw new DatasetError('events JSON must be an array')
      return parsed
    } catch (err) {
      throw new DatasetError(`events is not valid JSON: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  throw new DatasetError('events must be an array or a JSON array string')
}

/** Guard against oversized payloads before they reach the MCP server. */
function assertDataSize(text) {
  if (text.length > MAX_DATA_CHARS) {
    throw new DatasetError(`payload too large (${text.length} chars) — split into smaller batches`)
  }
}

/**
 * Register the classroom-memory toolset.
 * @param ctx - Cordis host context (tools).
 * @param config - optional plugin config: { url, clientName, timeoutMs }.
 */
export function apply(ctx, config = {}) {
  const url = (config.url || process.env.SKILLTREE_MEMORY_MCP_URL || DEFAULT_URL).replace(/\/+$/, '')
  const clientName = config.clientName || 'skilltree-memory'
  const timeoutMs = Number(config.timeoutMs) || 120_000
  const client = new MemoryMcpClient({ url, clientName, timeoutMs })

  const T = defineTool
  const out = {
    schema: { type: 'string' },
    render: (_a, v) => [{ type: 'text', text: typeof v === 'string' ? v : JSON.stringify(v, null, 2) }],
  }

  console.log(`[skilltree-memory] registering 3 classroom-memory tools over Cognee MCP (${url})`)

  // 1. memory_ingest — learning events -> per-student dataset(s)
  ctx.tools.register(
    T({
      name: 'memory_ingest',
      description:
        'Ingest learning events (Caliper v1.2 tuples or plain progress records) and/or raw text into the Cognee ' +
        'dataset of the student they belong to. Dataset isolation: one dataset per studentId — `student-<candidateId>` ' +
        '(candidateId from class-service M6). Mixed-student event batches are grouped automatically into one document ' +
        'per student dataset; events with no resolvable student (and no studentId fallback) are returned as `unassigned` ' +
        'and NOT ingested. Use background=true for large batches, then poll memory_evolve.',
      parameters: {
        studentId: str('Fallback student id (candidateId M6) used when an event itself carries no student field'),
        events: str('Learning events as a JSON array string (Caliper or progress records). Each item may carry candidateId/studentId/actor.id, action/type, object/concept, timestamp'),
        text: str('Raw text knowledge to store instead of structured events (ingested as-is)'),
        background: bool('Queue ingestion in background and return immediately (default false)'),
        self_improvement: bool('Run the post-ingestion improve loop (default true)'),
      },
      output: out,
      async execute(args, exec) {
        const events = parseEventsArg(args)
        const text = typeof args.text === 'string' ? args.text.trim() : ''
        if (events === null && text === '') {
          throw new DatasetError('provide events (JSON array string) or text')
        }
        const ingested = []
        let unassigned = []
        if (events !== null) {
          const grouped = groupEventsByStudent(events, args.studentId || null)
          unassigned = grouped.unassigned
          for (const group of grouped.groups) {
            const document = eventsToDocument(group.dataset, group.events)
            assertDataSize(document)
            const result = await client.call(
              'remember',
              {
                data: document,
                dataset_name: group.dataset,
                background: args.background === true,
                self_improvement: args.self_improvement !== false,
              },
              exec.signal,
            )
            ingested.push({ dataset: group.dataset, events: group.events.length, result: extractText(result) })
          }
        }
        if (text !== '') {
          const dataset = datasetForStudent(args.studentId)
          assertDataSize(text)
          const result = await client.call(
            'remember',
            {
              data: text,
              dataset_name: dataset,
              background: args.background === true,
              self_improvement: args.self_improvement !== false,
            },
            exec.signal,
          )
          ingested.push({ dataset, events: 0, result: extractText(result) })
        }
        return j({
          source: 'cognee_memory',
          mode: args.background === true ? 'background' : 'permanent',
          ingested,
          unassigned: unassigned.map((u) => ({ index: u.index, reason: u.reason, dataset: UNASSIGNED_DATASET })),
        })
      },
    }),
  )

  // 2. memory_ask — Q&A scoped to ONE student's evolving knowledge
  ctx.tools.register(
    T({
      name: 'memory_ask',
      description:
        'Ask ONE student\u2019s evolving knowledge graph (Cognee GraphRAG hybrid vector+graph recall) — grounded in the ' +
        'learning events previously ingested into that student\u2019s dataset `student-<candidateId>`. Answers never mix ' +
        'other students\u2019 data. Omit search_type for server auto-routing.',
      parameters: {
        studentId: str('Student id (candidateId M6) whose dataset to query (REQUIRED)'),
        query: str('The question in natural language (REQUIRED)'),
        search_type: str('Alias: hybrid (default) | rag | graph | graph_cot | summaries | chunks | code | temporal — or an exact Cognee SearchType'),
        top_k: num('Max results (1-50, default 10)'),
      },
      output: out,
      async execute(args, exec) {
        if (!args.studentId) throw new DatasetError('studentId is required')
        if (!args.query) throw new DatasetError('query is required')
        const dataset = datasetForStudent(args.studentId)
        const mcpArgs = { query: args.query, datasets: dataset, top_k: clampTopK(args.top_k, 10) }
        const searchType = resolveSearchType(args.search_type)
        if (searchType) mcpArgs.search_type = searchType
        const result = await client.call('recall', mcpArgs, exec.signal)
        return j({
          source: 'cognee_memory',
          dataset,
          search_type: searchType || 'auto',
          answer: extractText(result),
        })
      },
    }),
  )

  // 3. memory_evolve — periodic knowledge-evolution pipeline per student
  ctx.tools.register(
    T({
      name: 'memory_evolve',
      description:
        'Run the periodic knowledge-evolution pipeline for ONE student: summarize the batch of learning events ' +
        '(progress digest + concepts touched, optionally plus a teacher/agent note) into a dated evolution document ' +
        'and re-ingest it into the student\u2019s dataset with an education-specific extraction prompt (Concept, ' +
        'MasteryLevel, StruggleArea, ReviewEvent), then report the Cognee pipeline status. Call it on a regular ' +
        'cadence (e.g. after each study session) so the student\u2019s knowledge graph evolves over time.',
      parameters: {
        studentId: str('Student id (candidateId M6) whose memory evolves (REQUIRED)'),
        events: str('Learning events since the last evolution, as a JSON array string (optional if note given)'),
        note: str('Distilled note to consolidate into long-term knowledge (optional if events given)'),
        background: bool('Queue the ingestion in background and return immediately (default false)'),
      },
      output: out,
      async execute(args, exec) {
        if (!args.studentId) throw new DatasetError('studentId is required')
        const events = parseEventsArg(args) ?? []
        const note = typeof args.note === 'string' ? args.note : ''
        if (events.length === 0 && note.trim() === '') {
          throw new DatasetError('provide events (since last evolution) or a note to consolidate')
        }
        const dataset = datasetForStudent(args.studentId)
        const summary = summarizeEvents(events)
        const document = buildEvolutionDocument(dataset, summary, note)
        assertDataSize(document)
        const result = await client.call(
          'remember',
          {
            data: document,
            dataset_name: dataset,
            custom_prompt: EVOLUTION_PROMPT,
            background: args.background === true,
            self_improvement: true,
          },
          exec.signal,
        )
        let status = null
        try {
          const statusResult = await client.call('cognify_status', { dataset_name: dataset }, exec.signal)
          status = extractText(statusResult)
        } catch (err) {
          status = `unavailable: ${err instanceof Error ? err.message : String(err)}`
        }
        return j({
          source: 'cognee_memory',
          dataset,
          events_in_batch: summary.total,
          concepts_touched: summary.concepts,
          pipeline: args.background === true ? 'background' : 'permanent',
          result: extractText(result),
          status,
        })
      },
    }),
  )

  console.log('[skilltree-memory] 3 tools registered (memory_ingest, memory_ask, memory_evolve — datasets student-<candidateId>)')
}
