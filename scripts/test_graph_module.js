/* Test openmemory v0.4.0 graph.cjs (in-process @ladybugdb/core) against the REAL .lbug. */
process.env.COGNEE_RECALL_DEBUG = "1"
process.env.COGNEE_DEPS_DIR = "/tmp/lbugtest/node_modules"
const { openGraph, closeAll } = require("/workspace/openmemory-v040/graph.cjs")

const DB =
  "/workspace/.cognee_system/databases/319c34d8-55c2-4aba-894b-030aafdbb49d/b15b5f24-eb51-5655-b773-07c21aa4adb9.lbug"

async function main() {
  let t0 = Date.now()
  const g = await openGraph(DB, { debug: true })
  if (!g) { console.error("engine not available"); process.exit(1) }
  console.log("openGraph resolved (lazy):", Date.now() - t0, "ms")

  t0 = Date.now()
  const tables = await g.query("CALL show_tables() RETURN *")
  console.log("schema (warm):", Date.now() - t0, "ms —", tables.map((r) => r[2]).join(", "))

  t0 = Date.now()
  const oneHop = await g.traverse(["quality of service constraints", "software quality"], { hops: 1 })
  console.log("traverse 1-hop:", Date.now() - t0, "ms")
  for (const l of oneHop.slice(0, 8)) console.log("   ", l)

  t0 = Date.now()
  const twoHop = await g.traverse(["software quality"], { hops: 2, perTerm: 4 })
  console.log("traverse 2-hop:", Date.now() - t0, "ms")
  for (const l of twoHop.slice(0, 4)) console.log("   ", l)

  t0 = Date.now()
  const rows = await g.query("MATCH (a:Node)-[r]->(b:Node) WHERE a.name CONTAINS $t RETURN count(*)", { t: "quality" })
  console.log("param query edge-count:", rows[0][0], "—", Date.now() - t0, "ms")

  await closeAll()
  console.log("closed OK")
}
main().catch((e) => { console.error("FAIL:", e.message); process.exit(1) })
