/**
 * secret — host half.
 * Mounts same-origin HTTP routes for the Settings "Secrets" tab:
 *   GET  /secret/list   → { names: [...] }  (names only — values never leave the vault)
 *   POST /secret/set     { name, value }    → ctx.credentials.set
 *   POST /secret/delete  { name }           → ctx.credentials.unset
 * Writes go through the credentials service (dsh-credentials-local), whose
 * vault watcher hot-reloads consumers (e.g. webhook secretEnv rotations).
 */
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { credentialRef } from '@deepseek-ai/dsh-credentials'

export const name = 'secret'
export const inject = ['webServer', 'credentials']

const NAME_RE = /^[A-Za-z_][A-Za-z0-9_.-]{0,63}$/
const BODY_LIMIT_BYTES = 16 * 1024

function vaultPath() {
  const home = process.env.DSH_HOME ?? join(homedir(), '.dsh')
  return join(home, '.credentials.yaml')
}

/** User-facing credential names live under `refs:` (2-space indent) of the
 * vault YAML. Internal `records:` keys (e.g. browser-session grants) are
 * hidden on purpose. Values are never read out. */
async function listNames() {
  try {
    const raw = await readFile(vaultPath(), 'utf8')
    const names = []
    let inRefs = false
    for (const line of raw.split('\n')) {
      if (/^\S/.test(line)) {
        inRefs = /^refs\s*:/.test(line)
        continue
      }
      if (!inRefs) continue
      const m = /^  ([A-Za-z_][A-Za-z0-9_.\/-]*)\s*:/.exec(line)
      if (m && !names.includes(m[1])) names.push(m[1])
    }
    return names.sort()
  } catch {
    return []
  }
}

function sendJson(response, status, value) {
  response.writeHead(status, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
  })
  response.end(JSON.stringify(value))
}

function isSameOrigin(request) {
  const origin = request.headers.origin
  const host = request.headers.host
  if (origin === undefined || host === undefined) return false
  try {
    const url = new URL(origin)
    const localHostnames = new Set(['localhost', '127.0.0.1', '[::1]',
      // vAi deployment authorities (LAN + public gateway)
      '${DEV_HOST}', '${EDGE_HOST}'])
    return url.host === host && localHostnames.has(url.hostname)
  } catch {
    return false
  }
}

function requireTrustedPost(request, response) {
  if (request.method !== 'POST') {
    response.writeHead(405, { allow: 'POST' })
    response.end()
    return false
  }
  if (isSameOrigin(request)) return true
  sendJson(response, 403, { error: 'untrusted origin' })
  return false
}

async function readJsonBody(request) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > BODY_LIMIT_BYTES) throw new Error('request body too large')
    chunks.push(buffer)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

/**
 * Mount the Secrets routes on the host web server.
 * @param ctx - cordis host context with webServer + credentials services.
 */
export function apply(ctx) {
  ctx.webServer.register({
    kind: 'exact',
    path: '/secret/list',
    handler: async (request, response) => {
      if (request.method !== 'GET') {
        response.writeHead(405, { allow: 'GET' })
        response.end()
        return
      }
      sendJson(response, 200, { names: await listNames() })
    },
  })

  ctx.webServer.register({
    kind: 'exact',
    path: '/secret/set',
    handler: async (request, response) => {
      if (!requireTrustedPost(request, response)) return
      try {
        const body = await readJsonBody(request)
        const name = body !== null && typeof body === 'object' ? body.name : ''
        const value = body !== null && typeof body === 'object' ? body.value : ''
        if (typeof name !== 'string' || !NAME_RE.test(name)) {
          sendJson(response, 400, { error: 'invalid secret name (A-Z a-z 0-9 _ . -)' })
          return
        }
        if (typeof value !== 'string' || value.length === 0 || value.length > 8192) {
          sendJson(response, 400, { error: 'invalid secret value' })
          return
        }
        await ctx.credentials.set(credentialRef(name), value)
        sendJson(response, 200, { ok: true, name })
      } catch (error) {
        sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) })
      }
    },
  })

  ctx.webServer.register({
    kind: 'exact',
    path: '/secret/delete',
    handler: async (request, response) => {
      if (!requireTrustedPost(request, response)) return
      try {
        const body = await readJsonBody(request)
        const name = body !== null && typeof body === 'object' ? body.name : ''
        if (typeof name !== 'string' || !NAME_RE.test(name)) {
          sendJson(response, 400, { error: 'invalid secret name' })
          return
        }
        await ctx.credentials.unset(credentialRef(name))
        sendJson(response, 200, { ok: true, name })
      } catch (error) {
        sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) })
      }
    },
  })

  console.log('[secret] Settings Secrets tab ready (routes: /secret/list|set|delete)')
}
