// syntax-check2.mjs — factory bodies declare their own React; wrap with require/window only
import fs from 'fs';
const files = ['skilltree-graph-dashboard', 'roadmap-viewer', 'skilltree-class-ui', 'skilltree-teacher-ui', 'skilltree-student-ui', 'secret'];
let bad = 0;
for (const f of files) {
  const p = '/ws/services/skill-tree-service/plugins/' + f + '/client/client.js';
  const s = fs.readFileSync(p, 'utf8');
  const m = s.match(/factory:\s*\(require\)\s*=>\s*\{([\s\S]*)\}\s*\}\)\s*;?\s*$/);
  if (!m) { console.log(f + ': NO FACTORY MATCH'); bad++; continue; }
  try { new Function('require', 'window', m[1]); console.log(f + ': SYNTAX OK'); }
  catch (e) { console.log(f + ': ' + e.message.slice(0, 120)); bad++; }
}
console.log(bad ? 'FAIL ' + bad : 'ALL SYNTAX OK');
