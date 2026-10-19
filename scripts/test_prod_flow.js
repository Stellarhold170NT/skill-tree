/* Integration smoke test: replicate index.ts graph-layer wiring exactly. */
const { join } = require("node:path")
const { createRequire } = require("node:module")

process.env.COGNEE_DEPS_DIR = process.env.COGNEE_DEPS_DIR || "/tmp/lbugtest/node_modules"
const PKG = "/tmp/openmemory-main"
const rq = createRequire(join(PKG, "noop.js"))
const graphLib = rq(join(PKG, "graph.cjs"))

async function main() {
  console.log("1. resolveCore:", graphLib.resolveCore() ? "OK" : "MISSING")
  const lbugPaths = graphLib.findLbugFiles("/workspace/.cognee_system/databases/319c34d8-55c2-4aba-894b-030aafdbb49d")
  if (!lbugPaths.length) throw new Error("no .lbug")
  let t0 = Date.now()
  const g = await graphLib.openGraph(lbugPaths[0], { debug: true })
  if (!g) throw new Error("engine missing")
  const rows = await g.query(
    "MATCH (a:Node)-[r]->(b:Node) WHERE a.name CONTAINS $t RETURN a.name, r.relationship_name, b.name LIMIT 5",
    { t: "iso 25010" }
  )
  console.log("2. execute()-flow query:", rows.length, "rows,", Date.now() - t0, "ms")
  for (const r of rows) console.log("    ", r.join("  |  "))
  await graphLib.closeAll()
  console.log("3. closeAll disposed OK")
}
main().catch((e) => { console.error("FAIL:", e.message); process.exit(1) })
