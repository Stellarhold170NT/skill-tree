// patch-ui4b.js — fixed: no comment anchor, replace SidebarIcon + MainPanel blocks separately
const fs = require('fs');
const P = (p) => '/ws/services/skill-tree-service/plugins/' + p;
const read = (p) => fs.readFileSync(P(p), 'utf8');
const write = (p, s) => fs.writeFileSync(P(p), s);
const once = (s, re, rep, tag) => { const m = s.match(re); if (!m) throw new Error('MISS: ' + tag); return s.replace(re, rep); };
const ACTIVE = "var(--dsw-alias-brand-primary, #27A95F)";

const WL = {
  branch: { vb: 16, els: [
    { p: 'M1.01503 8.0001L5.6964 8.0001C6.41913 8.0001 6.78049 8.0001 7.12115 7.91951C7.4232 7.84804 7.71233 7.73014 7.97821 7.57C8.27809 7.38939 8.5364 7.13669 9.05303 6.63129L11.3281 4.40564' },
    { p: 'M1.01221 7.9999L5.6964 7.9999C6.41913 7.9999 6.78049 7.9999 7.12115 8.08049C7.4232 8.15196 7.71233 8.26986 7.97821 8.43C8.27809 8.61061 8.5364 8.86331 9.05303 9.36871L11.3281 11.5944' },
    { c: [12.4502, 3.3079, 1.56962] },
    { c: [12.4502, 12.6921, 1.56962] },
  ] },
  goal: { vb: 16, els: [
    { p: 'M14.5001 8C14.5 9.28552 14.1188 10.5422 13.4045 11.611C12.6903 12.6799 11.6752 13.5129 10.4875 14.0049C9.29982 14.4968 7.99295 14.6255 6.73212 14.3747C5.4713 14.124 4.31314 13.505 3.4041 12.596C2.49514 11.687 1.87614 10.5288 1.62537 9.26798C1.37459 8.00716 1.50331 6.70028 1.99525 5.51261C2.48719 4.32494 3.32025 3.30981 4.3891 2.59557C5.45795 1.88134 6.71458 1.50008 8.0001 1.5' },
    { p: 'M11.5 8C11.5001 8.69227 11.2948 9.36901 10.9102 9.94463C10.5257 10.5202 9.97901 10.9689 9.33944 11.2338C8.69986 11.4987 7.99609 11.5681 7.31712 11.433C6.63816 11.2979 6.01449 10.9645 5.52501 10.475C5.03548 9.98552 4.70209 9.36185 4.56702 8.68289C4.43195 8.00392 4.50127 7.30015 4.76619 6.66057C5.03112 6.021 5.47976 5.47436 6.05538 5.08978C6.631 4.70519 7.30774 4.49995 8.00001 4.5' },
    { p: 'M8.00024 7.99976L11.2 4.80005' },
    { p: 'M12.4719 5.62245C12.4246 5.66972 12.3569 5.69025 12.2913 5.67715L10.7814 5.37555C10.7022 5.35972 10.6402 5.29781 10.6244 5.2186L10.3228 3.70866C10.3097 3.6431 10.3302 3.57533 10.3775 3.52806L12.1826 1.723C12.2863 1.61929 12.4627 1.65879 12.5122 1.79684L12.9271 2.95225C12.9472 3.00847 12.9915 3.05272 13.0477 3.07291L14.2031 3.48774C14.3412 3.5373 14.3807 3.71368 14.277 3.81739L12.4719 5.62245Z' },
  ] },
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
function svgNode(el, key, sizeExpr, swExpr) {
  const ic = WL[key];
  const els = ic.els.map((e) => e.p
    ? `${el}('path', { d: '${e.p}', stroke: 'currentColor' })`
    : `${el}('circle', { cx: ${e.c[0]}, cy: ${e.c[1]}, r: ${e.c[2]}, stroke: 'currentColor'${e.fill ? ", fill: 'currentColor'" : ''} })`
  ).join(', ');
  return `${el}('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 ${ic.vb} ${ic.vb}', width: ${sizeExpr}, height: ${sizeExpr}, fill: 'none', stroke: 'currentColor', strokeWidth: ${swExpr}, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true', focusable: 'false' }, ${els})`;
}
const PAGE_HEAD = (el, key, title, sub) => `
  function PageHeader() {
    return ${el}('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', padding: '0 0 16px', borderBottom: '1px solid rgba(127,127,127,.18)', marginBottom: '16px' } },
      ${el}('div', { style: { display: 'grid', placeItems: 'center', width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(39,169,95,.14)', color: '${ACTIVE}' } },
        ${svgNode(el, key, '22', '1.1')}),
      ${el}('div', null,
        ${el}('h2', { style: { margin: 0, fontSize: '20px', fontWeight: 650, letterSpacing: '-0.01em' } }, '${title}'),
        ${el}('p', { style: { margin: '2px 0 0', fontSize: '13px', opacity: 0.7 } }, '${sub}')));
  }`;

// ---------- el-based: graph-dashboard + roadmap-viewer ----------
const elJobs = [
  { f: 'skilltree-graph-dashboard/client/client.js', icon: 'branch', title: 'Dashboard', sub: 'Đường đi năng lực — graph CASE M1 · tài liệu M9 · mức thành thạo M5', id: 'skilltree-graph-dashboard', root: 'gd-root', panel: "el(Panel, { onClose: function () {} })" },
  { f: 'roadmap-viewer/client/client.js', icon: 'goal', title: 'Roadmap', sub: 'Lộ trình học tập — graph CASE theo môn (M12)', id: 'roadmap-viewer', root: 'rmv-root', panel: "el(Panel, { onClose: function () {} })" },
];
for (const j of elJobs) {
  const f = j.f;
  let s = read(f);
  if (s.includes('PageIcon')) { console.log('skip:', f); continue; }
  const block = `
  // workloop ui-primitives icon artwork (16x16 fluent outline, currentColor)
  function PageIcon(props) {
    const size = props && props.size ? props.size : 20;
    const sw = props && props.strokeWidth ? props.strokeWidth : 1.25;
    const active = Boolean(props && props.active);
    return el('span', { style: { display: 'inline-flex', alignItems: 'center', color: active ? '${ACTIVE}' : 'inherit' } },
      ${svgNode('el', j.icon, 'size', 'sw')});
  }

  function SidebarIcon(props) {
    return el('span', { style: { display: 'inline-flex', alignItems: 'center', color: (props && props.active) ? '${ACTIVE}' : 'inherit' } },
      ${svgNode('el', j.icon, '20', '1.25')});
  }
${PAGE_HEAD('el', j.icon, j.title, j.sub)}

  function MainPanel() {
    return el('div', { className: '${j.root}' }, el(PageHeader, null), ${j.panel});
  }`;
  if (s.includes('function MainPanel')) {
    // strip earlier interim block: SidebarIcon...MainPanel (incl. old emoji + comment lines)
    s = once(s, /  (?:\/\/[^\n]*\n  )?function SidebarIcon\(props\) \{[\s\S]*?\n  \}\n\n  function MainPanel\(\) \{[\s\S]*?\n  \}/, block, f + ' interim block');
  } else {
    s = once(s, /  function OverlayEntry\(\) \{[\s\S]*?\n  \}/, block, f + ' entry');
    s = once(s, /  ctx\.slots\.inject\('shell\.overlay', \(\) =>[\s\S]*?\n  \);/, `  ctx.slots.inject('sidebar.panellist', () =>
    ctx.slots.register(
      { name: 'sidebar.panellist', id: '${j.id}', order: ${j.id === 'roadmap-viewer' ? 21 : 20}, label: '${j.title}' },
      SidebarIcon
    )
  );
  ctx.slots.inject('main', () =>
    ctx.slots.register({ name: 'main', key: '${j.id}' }, MainPanel)
  );`, f + ' register');
  }
  s = s.replace(`.${j.root}{position:fixed;right:18px;bottom:18px;z-index:60;font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;color:var(--st-neutral-800);}`,
    `.${j.root}{position:relative;width:100%;max-width:100%;padding:20px 28px 40px;box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;color:var(--st-neutral-800);}`);
  write(f, s); console.log('workloop-style OK:', f);
}

// ---------- h-based: class / teacher / student ----------
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
			${svgNode('h', j.icon, 'size', 'sw')});
	}
	function SidebarIcon(props) {
		return h("span", { style: { display: "inline-flex", alignItems: "center", color: (props && props.active) ? "${ACTIVE}" : "inherit" } },
			${svgNode('h', j.icon, '20', '1.25')});
	}
${PAGE_HEAD('h', j.icon, j.title, j.sub).replaceAll("'", '"').replace(/'${ACTIVE}'/g, `"${ACTIVE}"`).replace(/rgba\(39,169,95,\.14\)/, 'rgba(39,169,95,.14)')}

	function MainPanel() {
		return h("div", { style: { width: "100%", maxWidth: "100%", padding: "20px 28px 40px", boxSizing: "border-box", fontFamily: "inherit" } },
			h(PageHeader, null), ${j.panel});
	}`;
  if (s.includes('function SidebarIcon') && s.includes('function MainPanel')) {
    s = once(s, /\tfunction SidebarIcon\(props\) \{[\s\S]*?\n\t\}\n\tfunction MainPanel\(\) \{[\s\S]*?\n\t\}/, block, f + ' interim block');
  } else {
    s = once(s, /\tfunction OverlayEntry\(props?\)? ?\(\) \{[\s\S]*?\n\t\}/, block, f + ' entry');
    s = once(s, /ctx\.slots\.inject\("shell\.overlay", \(\) => ctx\.slots\.register\(\{[\s\S]*?\}, \(\) => h\(OverlayEntry\)\)\);/, `ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
			name: "sidebar.panellist",
			id: NS,
			order: ${j.order},
			label: "${j.title}",
		}, SidebarIcon));
		ctx.slots.inject("main", () => ctx.slots.register({ name: "main", key: NS }, MainPanel));`, f + ' register');
  }
  s = s.replace(/root: \{ position: "fixed", right: "18px", bottom: "64px", zIndex: 60, fontFamily: FONT \},/,
    'root: { position: "relative", width: "100%", maxWidth: "100%", zIndex: 1, fontFamily: FONT },');
  write(f, s); console.log('workloop-style OK:', f);
}
console.log('PATCH4B DONE');
