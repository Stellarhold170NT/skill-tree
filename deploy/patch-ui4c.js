// patch-ui4c.js — only h-based jobs (class/teacher/student), fixed OverlayEntry regex
const fs = require('fs');
const P = (p) => '/ws/services/skill-tree-service/plugins/' + p;
const read = (p) => fs.readFileSync(P(p), 'utf8');
const write = (p, s) => fs.writeFileSync(P(p), s);
const once = (s, re, rep, tag) => { const m = s.match(re); if (!m) throw new Error('MISS: ' + tag); return s.replace(re, rep); };
const ACTIVE = "var(--dsw-alias-brand-primary, #27A95F)";

const WL = {
  gauge: { vb: 16, els: [
    { p: 'M3.4041 13.096C2.49514 12.187 1.87614 11.0288 1.62537 9.76798C1.37459 8.50716 1.50331 7.20028 1.99525 6.01261C2.48719 4.82494 3.32025 3.80981 4.3891 3.09557C5.45795 2.38134 6.71458 2.00008 8.0001 2C9.28563 2.00008 10.5423 2.38134 11.6111 3.09557C12.68 3.80981 13.513 4.82494 14.005 6.01261C14.4969 7.20028 14.6256 8.50716 14.3748 9.76798C14.1241 11.0288 13.5051 12.187 12.5961 13.096' },
    { p: 'M8 8.49994L11.6114 4.88855' },
    { c: [8, 8.5, 1.25], fill: true },
  ] },
  skill: { vb: 17, els: [
    { p: 'M4.57788 5.77124H10.7029' },
    { p: 'M4.57788 8.89819H7.91879' },
    { p: 'M12.1404 1.19446C12.9442 1.19446 13.6404 1.81999 13.6404 2.64465V8.89856H12.6404V2.64465C12.6404 2.42015 12.4411 2.19446 12.1404 2.19446H3.14038C2.83968 2.19446 2.64038 2.42015 2.64038 2.64465V13.0929C2.64082 13.3172 2.84001 13.5421 3.14038 13.5421H8.88159V14.5421H3.14038C2.33675 14.5421 1.6408 13.9172 1.64038 13.0929V2.64465C1.64038 1.81999 2.33651 1.19446 3.14038 1.19446H12.1404Z' },
    { p: 'M12.0051 15.1056C12.0051 13.6395 10.8166 12.451 9.35059 12.451C10.8166 12.451 12.0051 11.2626 12.0051 9.79651C12.0051 11.2626 13.1936 12.451 14.6597 12.451C13.1936 12.451 12.0051 13.6395 12.0051 15.1056Z' },
  ] },
  users: { vb: 16, els: [
    { p: 'M6 8.25C7.51878 8.25 8.75 7.01878 8.75 5.5C8.75 3.98122 7.51878 2.75 6 2.75C4.48122 2.75 3.25 3.98122 3.25 5.5C3.25 7.01878 4.48122 8.25 6 8.25Z' },
    { p: 'M1 14.5C1 11.5 3.5 10.25 6 10.25C8.5 10.25 11 11.5 11 14.5' },
    { p: 'M10.5 2.9C11.65 3.35 12.45 4.35 12.45 5.5C12.45 6.65 11.65 7.65 10.5 8.1' },
    { p: 'M12.4 10.6C13.9 11.3 15 12.6 15 14.5' },
  ] },
};
function svgNode(key, sizeExpr, swExpr) {
  const ic = WL[key];
  const els = ic.els.map((e) => e.p
    ? `h("path", { d: '${e.p}', stroke: "currentColor" })`
    : `h("circle", { cx: ${e.c[0]}, cy: ${e.c[1]}, r: ${e.c[2]}, stroke: "currentColor"${e.fill ? ', fill: "currentColor"' : ''} })`
  ).join(', ');
  return `h("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 ${ic.vb} ${ic.vb}", width: ${sizeExpr}, height: ${sizeExpr}, fill: "none", stroke: "currentColor", strokeWidth: ${swExpr}, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", focusable: "false" }, ${els})`;
}

const jobs = [
  { f: 'skilltree-class-ui/client/client.js', icon: 'users', title: 'Lớp học', sub: 'Quản lý lớp theo OneRoster v1.2 — M6 · qua gateway M10', order: 22, panel: 'h(Panel, null)' },
  { f: 'skilltree-teacher-ui/client/client.js', icon: 'gauge', title: 'Bảng GV', sub: 'Bảng điều khiển giáo viên — M5/M7/M4 · qua gateway M10', order: 23, panel: 'h(Panel, { onClose: function () {} })' },
  { f: 'skilltree-student-ui/client/client.js', icon: 'skill', title: 'Học sinh', sub: 'Góc học tập — lộ trình · tài liệu · kiểm tra (M5 · rag · M2)', order: 24, panel: 'h(Panel, { onClose: function () {} })' },
];
for (const j of jobs) {
  const f = j.f;
  let s = read(f);
  if (s.includes('PageIcon')) { console.log('skip:', f); continue; }
  const block = `
	function PageIcon(props) {
		const size = props && props.size ? props.size : 20;
		const sw = props && props.strokeWidth ? props.strokeWidth : 1.25;
		const active = Boolean(props && props.active);
		return h("span", { style: { display: "inline-flex", alignItems: "center", color: active ? "${ACTIVE}" : "inherit" } },
			${svgNode(j.icon, 'size', 'sw')});
	}
	function SidebarIcon(props) {
		return h("span", { style: { display: "inline-flex", alignItems: "center", color: (props && props.active) ? "${ACTIVE}" : "inherit" } },
			${svgNode(j.icon, '20', '1.25')});
	}
	function PageHeader() {
		return h("div", { style: { display: "flex", alignItems: "center", gap: "12px", padding: "0 0 16px", borderBottom: "1px solid rgba(127,127,127,.18)", marginBottom: "16px" } },
			h("div", { style: { display: "grid", placeItems: "center", width: "40px", height: "40px", borderRadius: "10px", background: "rgba(39,169,95,.14)", color: "${ACTIVE}" } },
				${svgNode(j.icon, '22', '1.1')}),
			h("div", null,
				h("h2", { style: { margin: 0, fontSize: "20px", fontWeight: 650, letterSpacing: "-0.01em" } }, "${j.title}"),
				h("p", { style: { margin: "2px 0 0", fontSize: "13px", opacity: 0.7 } }, "${j.sub}")));
	}
	function MainPanel() {
		return h("div", { style: { width: "100%", maxWidth: "100%", padding: "20px 28px 40px", boxSizing: "border-box", fontFamily: "inherit" } },
			h(PageHeader, null), ${j.panel});
	}`;
  s = once(s, /\tfunction OverlayEntry\([^)]*\) \{[\s\S]*?\n\t\}/, block, f + ' entry');
  s = once(s, /ctx\.slots\.inject\("shell\.overlay", \(\) => ctx\.slots\.register\(\{[\s\S]*?\}, \(\) => h\(OverlayEntry\)\)\);/, `ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
			name: "sidebar.panellist",
			id: NS,
			order: ${j.order},
			label: "${j.title}",
		}, SidebarIcon));
		ctx.slots.inject("main", () => ctx.slots.register({ name: "main", key: NS }, MainPanel));`, f + ' register');
  s = s.replace(/root: \{ position: "fixed", right: "18px", bottom: "64px", zIndex: 60, fontFamily: FONT \},/,
    'root: { position: "relative", width: "100%", maxWidth: "100%", zIndex: 1, fontFamily: FONT },');
  write(f, s); console.log('workloop-style OK:', f);
}
console.log('PATCH4C DONE');
