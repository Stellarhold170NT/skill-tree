const { createRequire } = require("node:module");
const req = createRequire("/tmp/lbugtest/node_modules/noop.js");
const { lancedb } = { lancedb: req("@lancedb/lancedb") };
const fs = require("fs");

(async () => {
  const dbDir = "/workspace/.cognee_system/databases/319c34d8-55c2-4aba-894b-030aafdbb49d";
  const db = await lancedb.connect(dbDir);
  const tables = await db.tableNames();
  console.log("tables:", tables.join(", "));
  if (!tables.includes("SessionQAVector_text")) { console.log("no SessionQA table"); return; }
  const t = await db.openTable("SessionQAVector_text");
  const n = await t.countRows();
  console.log("SessionQA rows:", n);

  const r = await t.query().select(["payload"]).limit(500).execute();
  const texts = [];
  for await (const b of r) for (const row of b.toArray()) {
    const p = row.payload;
    let s = "";
    if (typeof p === "string") {
      const m = p.match(/"text": "(?:[^"\\]|\\.)*"/);
      s = m ? m[0] : p;
      s = s.replace(/\\"/g, '"').replace(/\\n/g, " ");
    } else if (p && typeof p === "object") {
      s = String(p.text || "");
    }
    texts.push(s);
  }
  console.log("scanned:", texts.length);
  console.log("--- sample[0]:", texts[0] ? texts[0].slice(0, 300).replace(/\n/g, " ") : "(none)");

  const bank = fs.readFileSync("/workspace/corpora/swebok-v4/questions_bank_T7.jsonl", "utf8")
    .split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const norm = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();
  let hits = 0;
  const hitIds = [];
  for (const q of bank) {
    const qn = norm(q.question).slice(0, 60);
    if (texts.some((t) => norm(t).includes(qn))) { hits++; hitIds.push(q.id); }
  }
  console.log(`bank questions appearing VERBATIM in SessionQA: ${hits}/54`);
  console.log("first 10:", hitIds.slice(0, 10).join(", "));
})().catch((e) => console.error("ERR", e.message));
