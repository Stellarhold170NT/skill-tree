"""Patch openmemory/index.ts for v0.4.0: replace Python graph-server block with in-process @ladybugdb/core."""
import os

ts = open('/tmp/openmemory-main/index.ts').read()

assert '// ---- graph layer (opt-in)' in ts, 'graph layer block not found'
start = ts.index('\t// ---- graph layer (opt-in)')
end = ts.index('\t// disposer')

new_block = """\t// ---- graph layer (v0.4.0, in-process @ladybugdb/core — không Python, không sidecar, không HTTP)
\ttry {
\t  const rq = createRequire(join(PKG, "noop.js"))
\t  const graphLib = rq(join(PKG, "graph.cjs"))
\t  if (graphLib.resolveCore()) {
\t\tapi.tool.transform((tools) => {
\t\t  tools.add({
\t\t\tname: "cognee_graph",
\t\t\tdescription:
\t\t\t  "Query the knowledge GRAPH inside the embedded cognee memory (multi-hop relations between entities). "
\t\t\t  + "Schema: one node table `Node` (classify via property `type`: Entity/TextSummary/DocumentChunk/EntityType/TextDocument), "
\t\t\t  + "traverse edges WITHOUT table annotation: MATCH (a:Node)-[r]->(b:Node); edge property r.relationship_name "
\t\t\t  + "e.g. 'is_a'/'part_of'. DO NOT write [:REL] in patterns. Params bind via $name. "
\t\t\t  + "Example: MATCH (a:Node)-[r]->(b:Node) WHERE a.name CONTAINS $t RETURN a.name, r.relationship_name, b.name LIMIT 20",
\t\t\tparameters: {
\t\t\t  type: "object",
\t\t\t  properties: {
\t\t\t\tmemory: { type: "string", description: "Registered memory name (optional — first memory's graph if omitted)" },
\t\t\t\tcypher: { type: "string", description: "Cypher query (see description for schema)" },
\t\t\t\tparams: { type: "object", description: "Cypher parameters, e.g. { \"t\": \"iso/iec 12207\" }", additionalProperties: true },
\t\t\t  },
\t\t\t  required: ["cypher"],
\t\t\t},
\t\t\tasync execute(args) {
\t\t\t  const lbugPaths = findLbugPaths_(memories)
\t\t\t  if (!lbugPaths.length) return "ERROR: không tìm thấy file *.lbug trong dbDir của memory đã đăng ký"
\t\t\t  let lbugFile = lbugPaths[0].path
\t\t\t  if (args.memory) {
\t\t\t\tconst hit = lbugPaths.find((p) => p.memory === String(args.memory))
\t\t\t\tif (hit) lbugFile = hit.path
\t\t\t\telse process.stderr.write(`[openmemory] memory "${args.memory}" không có *.lbug — dùng cái đầu`)
\t\t\t  }
\t\t\t  const g = await graphLib.openGraph(lbugFile, { debug: !!process.env.COGNEE_RECALL_DEBUG })
\t\t\t  if (!g) return "ERROR: @ladybugdb/core chưa cài. Chạy: npm i @ladybugdb/core@0.19.0"
\t\t\t  const rows = await g.query(String(args.cypher), args.params || {})
\t\t\t  return JSON.stringify(rows, null, 1)
\t\t\t},
\t\t  })
\t\t  return tools
\t\t})
\t\tlog("graph layer (in-process @ladybugdb/core) sẵn sàng — tool cognee_graph đã đăng ký")
\t\tdisposers.push(async () => { try { await graphLib.closeAll() } catch {} })
\t  }
\t} catch (e) {
\t  log(`graph layer bỏ qua: ${e.message}`)
\t}

"""

ts = ts[:start] + new_block + ts[end:]
# drop leftover old disposer block (was between markers)
ts = ts.replace("""  // disposer — tắt graph server khi plugin unload
  return () => {
    for (const s of graphServers) { try { s.child.kill() } catch {} }
  }""", """  // disposer
  return () => {
    for (const d of disposers) { try { d() } catch {} }
  }""")

# disposers array init
ts = ts.replace("""export const setup = async (api) => {
  try {
    selfInstall()""", """export const setup = async (api) => {
  const disposers = []
  try {
    selfInstall()""")

# selfInstall: graph-server.py -> graph.cjs
ts = ts.replace("""  copyFileSync(join(PKG, "graph-server.py"), join(INSTALL_DIR, "graph-server.py"))""",
"""  copyFileSync(join(PKG, "graph.cjs"), join(INSTALL_DIR, "graph.cjs"))""")

# createRequire import
ts = ts.replace('import { spawn } from "node:child_process"',
'''import { spawn } from "node:child_process"
import { createRequire } from "node:module"''')

# helper before selfInstall
helper = '''
// [memoryName, dbDir] → danh sách *.lbug (≤3 tầng) cho graph layer
const findLbugPaths_ = (memories) => {
  const out = []
  for (const [name, m] of Object.entries(memories || {})) {
    if (!m?.dbDir) continue
    const files = []
    const walk = (dir, depth) => {
      if (depth > 3) return
      let entries; try { entries = readdirSync(dir) } catch { return }
      for (const e of entries) {
        const p = join(dir, e)
        let st; try { st = statSync(p) } catch { continue }
        if (st.isDirectory()) walk(p, depth + 1)
        else if (e.endsWith(".lbug")) files.push(p)
      }
    }
    walk(m.dbDir, 0)
    for (const f of files) out.push({ memory: name, path: f })
  }
  return out
}
'''
ts = ts.replace('function selfInstall()', helper + '\nfunction selfInstall()')

open('/tmp/openmemory-main/index.ts', 'w').write(ts)
print("index.ts patched,", len(ts.splitlines()), "lines")
