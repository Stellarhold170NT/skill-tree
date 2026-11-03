/* Degrade test: path sai / engine thiếu — openGraph phải null/không crash. */
const g = require("/tmp/weather-fix/graph.cjs")
process.env.COGNEE_DEPS_DIR = "/tmp/lbugtest/node_modules"

async function main() {
  const ok = await g.openGraph("/nonexistent/path/file.lbug", { debug: false })
  console.log("sai path, engine OK -> api object:", typeof ok)
  delete process.env.COGNEE_DEPS_DIR
  console.log("— dòng này in ra là không crash —")
  process.env.COGNEE_DEPS_DIR = "/tmp/lbugtest/node_modules"
}
main().catch((e) => { console.error("FAIL:", e.message); process.exit(1) })
