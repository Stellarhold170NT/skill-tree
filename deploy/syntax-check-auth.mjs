// syntax-check-auth.mjs — validate auth-ui factory body after gate patch
import fs from 'fs';
const s = fs.readFileSync('/ws/services/skill-tree-service/plugins/skilltree-auth-ui/client/client.js', 'utf8');
const m = s.match(/factory:\s*\(require\)\s*=>\s*\{([\s\S]*)\}\s*\}\)\s*;?\s*$/);
if (!m) { console.log('NO FACTORY MATCH'); process.exit(1); }
try { new Function('require', 'window', m[1]); console.log('SYNTAX OK'); }
catch (e) { console.log('ERR', e.message.slice(0, 160)); process.exit(1); }
