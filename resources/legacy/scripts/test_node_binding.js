/* Test @ladybugdb/core@0.19.0 (Node binding) against the REAL .lbug built by pip ladybug 0.19.0.
 * Verifies: open read-only, schema, node/edge counts, 1-hop + 2-hop traversal, latency.
 */
const lbug = require("@ladybugdb/core");

const DB =
  "/workspace/.cognee_system/databases/319c34d8-55c2-4aba-894b-030aafdbb49d/b15b5f24-eb51-5655-b773-07c21aa4adb9.lbug";

const ms = (label, t0) => console.log(label, Date.now() - t0, "ms");

async function main() {
  let t0 = Date.now();
  const db = new lbug.Database(DB, 256 * 1024 * 1024, undefined, true);
  const conn = new lbug.Connection(db);
  console.log("open read-only (lazy init):", Date.now() - t0, "ms");

  t0 = Date.now();
  const tables = await conn.query("CALL show_tables() RETURN *");
  const tabRows = await tables.getAll();
  console.log("first query (schema) total:", Date.now() - t0, "ms");
  for (const r of tabRows) console.log("  table:", Object.values(r).slice(0, 4).join(" | "));

  t0 = Date.now();
  let res = await (await conn.query("MATCH (n) RETURN count(n) AS c")).getAll();
  console.log("node count:", res[0].c, "— query", Date.now() - t0, "ms");
  res = await (await conn.query("MATCH ()-[r]->() RETURN count(r) AS c")).getAll();
  console.log("edge count:", res[0].c);

  t0 = Date.now();
  res = await (
    await conn.query(
      "MATCH (a:Node)-[r]->(b:Node) WHERE a.name CONTAINS 'quality' RETURN a.name, r.relationship_name, b.name LIMIT 5"
    )
  ).getAll();
  console.log("1-hop traversal:", Date.now() - t0, "ms");
  for (const row of res) console.log("   ", Object.values(row).join("  —"));

  t0 = Date.now();
  res = await (
    await conn.query(
      "MATCH (a:Node)-[r1]->(m:Node)-[r2]->(c:Node) WHERE a.name CONTAINS 'quality' RETURN a.name, r1.relationship_name, m.name, r2.relationship_name, c.name LIMIT 5"
    )
  ).getAll();
  console.log("2-hop traversal:", Date.now() - t0, "ms");
  for (const row of res) console.log("   ", Object.values(row).join("  —"));

  t0 = Date.now();
  res = await (
    await conn.query(
      "MATCH (a:Node)-[r]->(b:Node) WHERE a.name CONTAINS 'quality' RETURN count(*) AS c"
    )
  ).getAll();
  console.log("edge-count from 'quality':", res[0].c, "— query", Date.now() - t0, "ms");
}

main().catch((e) => {
  console.error("FAIL:", e.message || e);
  process.exit(1);
});
