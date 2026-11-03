// patch-ui2.js v2 — class/teacher/student: entry+register replacement AND flat page styles
const fs = require('fs');
const P = (p) => '/ws/services/skill-tree-service/plugins/' + p;
const once = (s, re, rep, tag) => {
  const m = s.match(re);
  if (!m) throw new Error('REGEX MISS: ' + tag);
  return s.replace(re, rep);
};
const REG = /ctx\.slots\.inject\("shell\.overlay", \(\) => ctx\.slots\.register\(\{[\s\S]*?\}, \(\) => h\(OverlayEntry\)\)\);/;

const jobs = [
  { f: 'skilltree-class-ui/client/client.js', icon: '🏫', label: 'Lớp học', order: 22, panel: 'h(Panel, null)' },
  { f: 'skilltree-teacher-ui/client/client.js', icon: '📊', label: 'Bảng GV', order: 23, panel: 'h(Panel, { onClose: function () {} })' },
  { f: 'skilltree-student-ui/client/client.js', icon: '🎒', label: 'Học sinh', order: 24, panel: 'h(Panel, { onClose: function () {} })' },
];
for (const j of jobs) {
  const p = P(j.f);
  let s = fs.readFileSync(p, 'utf8');
  if (!s.includes('sidebar.panellist')) {
    s = once(s, /\tfunction OverlayEntry\(props?\)? ?\(\) \{[\s\S]*?\n\t\}/, `
	function SidebarIcon(props) {
		const active = Boolean(props && props.active);
		return h("span", { style: { display: "inline-flex", alignItems: "center", fontSize: "15px", color: active ? "#27A95F" : "inherit" } }, "${j.icon}");
	}
	function MainPanel() {
		return h("div", { style: { width: "100%", maxWidth: "100%", padding: "20px 28px 40px", boxSizing: "border-box", fontFamily: "inherit" } }, ${j.panel});
	}`, j.f + ' entry');
    s = once(s, REG, `ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
			name: "sidebar.panellist",
			id: NS,
			order: ${j.order},
			label: "${j.label}",
		}, SidebarIcon));
		ctx.slots.inject("main", () => ctx.slots.register({ name: "main", key: NS }, MainPanel));`, j.f + ' register');
    fs.writeFileSync(p, s);
    console.log('sidebar OK:', j.f);
  } else console.log('skip register (done):', j.f);
  // flatten panel root (was fixed bottom-right popup)
  let t = fs.readFileSync(p, 'utf8');
  const flatRoot = t.replace(/root: \{ position: "fixed", right: "18px", bottom: "64px", zIndex: 60, fontFamily: FONT \},/,
    'root: { position: "relative", width: "100%", maxWidth: "100%", zIndex: 1, fontFamily: FONT },');
  if (flatRoot !== t) { fs.writeFileSync(p, flatRoot); console.log('root flattened:', j.f); }
  else console.log('root: no popup style found (already flat?):', j.f);
}

// gd + rmv css: root was fixed popup -> normal page block
{
  const p = P('skilltree-graph-dashboard/client/client.js');
  let s = fs.readFileSync(p, 'utf8');
  const before = s;
  s = s.replace('.gd-root{position:fixed;right:18px;bottom:18px;z-index:60;font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;color:var(--st-neutral-800);}',
    '.gd-root{position:relative;width:100%;max-width:100%;padding:20px 28px 40px;box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;color:var(--st-neutral-800);}');
  if (s !== before) { fs.writeFileSync(p, s); console.log('gd root css flattened'); } else console.log('gd root css: no change');
}
{
  const p = P('roadmap-viewer/client/client.js');
  let s = fs.readFileSync(p, 'utf8');
  const before = s;
  s = s.replace('.rmv-root{position:fixed;right:18px;bottom:18px;z-index:60;font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;color:var(--st-neutral-800);}',
    '.rmv-root{position:relative;width:100%;max-width:100%;padding:20px 28px 40px;box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;color:var(--st-neutral-800);}');
  if (s !== before) { fs.writeFileSync(p, s); console.log('rmv root css flattened'); } else console.log('rmv root css: no change');
}
console.log('PATCH2v2 DONE');
