// patch-ui.js v2 — regex-based, asserts exactly-once per replacement
// 1) secret plugin mojibake -> UTF-8
// 2) 5 UI plugins: shell.overlay FAB -> sidebar.panellist + main (vai-youtube-news layout)
// 3) brand: heroTitle + hero mark CSS (margin-top -8px)
const fs = require('fs');
const path = require('path');
const P = (p) => path.join('/ws/services/skill-tree-service', p);
const read = (p) => fs.readFileSync(P(p), 'utf8');
const write = (p, s) => fs.writeFileSync(P(p), s);
const once = (s, re, rep, tag) => {
  const m = s.match(re);
  if (!m) throw new Error('REGEX MISS: ' + tag);
  if (s.slice(m.index + m[0].length).match(re)) throw new Error('MULTI MATCH: ' + tag);
  return s.replace(re, rep);
};

const CP1252 = { '\u20AC':0x80, '\u201A':0x82, '\u0192':0x83, '\u201E':0x84, '\u2026':0x85, '\u2020':0x86,
  '\u2021':0x87, '\u02C6':0x88, '\u2030':0x89, '\u0160':0x8A, '\u2039':0x8B, '\u0152':0x8C, '\u017D':0x8E,
  '\u2018':0x91, '\u2019':0x92, '\u201C':0x93, '\u201D':0x94, '\u2022':0x95, '\u2013':0x96, '\u2014':0x97,
  '\u02DC':0x98, '\u2122':0x99, '\u0161':0x9A, '\u203A':0x9B, '\u0153':0x9C, '\u017E':0x9E, '\u0178':0x9F };
function mojibakeToUtf8(s) {
  const bytes = [];
  for (const ch of s) {
    const code = ch.codePointAt(0);
    if (code <= 0xFF) bytes.push(code);
    else if (CP1252[ch] !== undefined) bytes.push(CP1252[ch]);
    else return null;
  }
  return Buffer.from(bytes).toString('utf8');
}

// ---- 1) secret plugin ----
for (const f of ['plugins/secret/client/client.js', 'plugins/secret/lib/index.js']) {
  const src = read(f);
  if (!/Ã|áº|â€/.test(src)) { console.log('skip (clean):', f); continue; }
  const fixed = mojibakeToUtf8(src);
  if (fixed && /Quản lý|Lưu|Đang|Chưa/.test(fixed)) { write(f, fixed); console.log('de-mojibake OK:', f); }
  else console.log('WARN: roundtrip unsure for', f, fixed ? fixed.slice(0, 120) : 'null');
}

// ---- 2) graph-dashboard ----
{
  const f = 'plugins/skilltree-graph-dashboard/client/client.js';
  let s = read(f);
  s = once(s, /  function OverlayEntry\(\) \{[\s\S]*?\n  \}/, `
  function SidebarIcon(props) {
    const active = Boolean(props && props.active);
    return el('span', {
      style: { display: 'inline-flex', alignItems: 'center', fontSize: '15px', color: active ? 'var(--dsw-alias-brand-primary, #27A95F)' : 'inherit' },
    }, '🌳');
  }

  function MainPanel() {
    return el('div', { className: 'gd-root', style: { padding: '24px', maxWidth: '1240px', margin: '0 auto' } }, el(Panel, { onClose: function () {} }));
  }`, 'gd entry');
  s = once(s, /  ctx\.slots\.inject\('shell\.overlay', \(\) =>[\s\S]*?\n  \);/, `  ctx.slots.inject('sidebar.panellist', () =>
    ctx.slots.register(
      { name: 'sidebar.panellist', id: 'skilltree-graph-dashboard', order: 20, label: 'Dashboard' },
      SidebarIcon
    )
  );
  ctx.slots.inject('main', () =>
    ctx.slots.register({ name: 'main', key: 'skilltree-graph-dashboard' }, MainPanel)
  );`, 'gd register');
  write(f, s); console.log('sidebar OK: graph-dashboard');
}

// ---- 2b) roadmap-viewer ----
{
  const f = 'plugins/roadmap-viewer/client/client.js';
  let s = read(f);
  s = once(s, /  function OverlayEntry\(\) \{[\s\S]*?\n  \}/, `
  function SidebarIcon(props) {
    const active = Boolean(props && props.active);
    return el('span', {
      style: { display: 'inline-flex', alignItems: 'center', fontSize: '15px', color: active ? 'var(--dsw-alias-brand-primary, #27A95F)' : 'inherit' },
    }, '🗺️');
  }

  function MainPanel() {
    return el('div', { className: 'rmv-root', style: { padding: '24px', maxWidth: '1240px', margin: '0 auto' } }, el(Panel, { onClose: function () {} }));
  }`, 'rmv entry');
  s = once(s, /  ctx\.slots\.inject\('shell\.overlay', \(\) =>[\s\S]*?\n  \);/, `  ctx.slots.inject('sidebar.panellist', () =>
    ctx.slots.register(
      { name: 'sidebar.panellist', id: 'roadmap-viewer', order: 21, label: 'Roadmap' },
      SidebarIcon
    )
  );
  ctx.slots.inject('main', () =>
    ctx.slots.register({ name: 'main', key: 'roadmap-viewer' }, MainPanel)
  );`, 'rmv register');
  write(f, s); console.log('sidebar OK: roadmap-viewer');
}

// ---- 2c) class-ui ----
{
  const f = 'plugins/skilltree-class-ui/client/client.js';
  let s = read(f);
  s = once(s, /\tfunction OverlayEntry\(\) \{[\s\S]*?\n\t\}/, `
	function SidebarIcon(props) {
		const active = Boolean(props && props.active);
		return h("span", { style: { display: "inline-flex", alignItems: "center", fontSize: "15px", color: active ? "#27A95F" : "inherit" } }, "🏫");
	}
	function MainPanel() {
		return h("div", { style: { padding: "24px", maxWidth: "1240px", margin: "0 auto" } }, h(Panel, null));
	}`, 'class entry');
  s = once(s, /\tctx\.slots\.inject\("shell\.overlay", \(\) => ctx\.slots\.register\(\{[\s\S]*?\n\t\}\);/, `		ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
			name: "sidebar.panellist",
			id: NS,
			order: 22,
			label: "Lớp học",
		}, SidebarIcon));
		ctx.slots.inject("main", () => ctx.slots.register({ name: "main", key: NS }, MainPanel));`, 'class register');
  write(f, s); console.log('sidebar OK: class-ui');
}

// ---- 2d) teacher-ui ----
{
  const f = 'plugins/skilltree-teacher-ui/client/client.js';
  let s = read(f);
  s = once(s, /\tfunction OverlayEntry\(\) \{[\s\S]*?\n\t\}/, `
	function SidebarIcon(props) {
		const active = Boolean(props && props.active);
		return h("span", { style: { display: "inline-flex", alignItems: "center", fontSize: "15px", color: active ? "#27A95F" : "inherit" } }, "📊");
	}
	function MainPanel() {
		return h("div", { style: { padding: "24px", maxWidth: "1240px", margin: "0 auto" } }, h(Panel, { onClose: function () {} }));
	}`, 'teacher entry');
  s = once(s, /\tctx\.slots\.inject\("shell\.overlay", \(\) => ctx\.slots\.register\(\{[\s\S]*?\n\t\}\);/, `		ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
			name: "sidebar.panellist",
			id: NS,
			order: 23,
			label: "Bảng GV",
		}, SidebarIcon));
		ctx.slots.inject("main", () => ctx.slots.register({ name: "main", key: NS }, MainPanel));`, 'teacher register');
  write(f, s); console.log('sidebar OK: teacher-ui');
}

// ---- 2e) student-ui ----
{
  const f = 'plugins/skilltree-student-ui/client/client.js';
  let s = read(f);
  s = once(s, /\tfunction OverlayEntry\(props\) \{[\s\S]*?\n\t\}/, `
	function SidebarIcon(props) {
		const active = Boolean(props && props.active);
		return h("span", { style: { display: "inline-flex", alignItems: "center", fontSize: "15px", color: active ? "#27A95F" : "inherit" } }, "🎒");
	}
	function MainPanel() {
		return h("div", { style: { padding: "24px", maxWidth: "1240px", margin: "0 auto" } }, h(Panel, { onClose: function () {} }));
	}`, 'student entry');
  s = once(s, /\t\tctx\.slots\.inject\("shell\.overlay", \(\) => ctx\.slots\.register\(\{[\s\S]*?\n\t\t\}, \(\) => h\(OverlayEntry\)\)\);/, `		ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
			name: "sidebar.panellist",
			id: NS,
			order: 24,
			label: "Học sinh",
		}, SidebarIcon));
		ctx.slots.inject("main", () => ctx.slots.register({ name: "main", key: NS }, MainPanel));`, 'student register');
  write(f, s); console.log('sidebar OK: student-ui');
}

// ---- 3) brand ----
{
  const f = 'plugins/skilltree-brand/brand.config.json';
  const cfg = JSON.parse(read(f));
  cfg.ui.heroTitle = 'SkillTree — Decode the invisible thread';
  write(f, JSON.stringify(cfg, null, 2) + '\n');
  console.log('brand config: heroTitle ->', cfg.ui.heroTitle);

  const bf = 'plugins/skilltree-brand/lib/index.js';
  let s = read(bf);
  if (!/Hero mark: logo SkillTree/.test(s)) {
    const MARK_CSS = `
/* Hero mark: logo SkillTree thay svg mac dinh (review 2026-11-01) */
[data-slot="conversation.hero.brand.mark"] svg {
    display: inline-block !important;
    box-sizing: content-box !important;
    width: 34px !important;
    height: 30px !important;
    margin-top: -8px !important;
    background-image: url(data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSI2MzYgMTMxMyA0ODQgNTIzIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4bWw6c3BhY2U9InByZXNlcnZlIiBvdmVyZmxvdz0iaGlkZGVuIj48cGF0aCBkPSJNLTIuODA1NzUgMzcwLjQ5NUMtMS45ODc5MyAzNjkuMzM3LTEuMzM3OTQgMzY4LjM0NC0wLjE3NjczMSAzNjcuNSA1Ljg1NzYyIDM2My4wODkgMTMuMzk0MiAzNTkuNjcyIDE5Ljg5NDQgMzU1Ljg5NUw2MS40MDM2IDMzMS4zMDIgMTk0Ljg3OCAyNTEuNjEyQzIwMy45NjUgMjQ2LjMwMyAyMTIuOTEyIDI0MC43NzQgMjIxLjczMyAyMzUuMDE5IDIyNy4yMzcgMjMxLjQyOSAyMzMuMTk2IDIyNi41NSAyMzkuMTMyIDIyMy44NjggMjM5LjA3NyAxNDguMTEgMjM4LjE5MSA3Mi4yNDM5IDIzOS4xOTQtMy41MDUyNyAyMjguMzU4IDYuMTY3NzIgMjEyLjgwMiAxMi43NDM4IDIwMC4zNjcgMjAuNDIyNyAxOTcuODgxIDI1LjY3NzggMTUuMzIzMSAxMjQuODA4LTEuMzU2NjIgMTM1LjEwNi0yLjU4MDY5IDE1Ny44NjItMS43Mzk0MyAxODEuMDMxLTEuNjU4NzggMjAzLjg0MUwtMS41Mzg2OSAzMDkuMjc0Qy0xLjUwMDE0IDMyNC43ODkgMC43NTA4MSAzNTYuOTA0LTIuODA1NzUgMzcwLjQ5NVoiIGZpbGw9IiM1NkM5NzQiIGZpbGwtcnVsZT0iZXZlbm9kZCIgdHJhbnNmb3JtPSJtYXRyaXgoMSAwIDAgLTEgNjM5IDE4MzApIi8+PHBhdGggZD0iTTI0MC40MjYgMzY5LjQ5OEMyMzguOTEgMzQzLjI0MiAyNDAuMjQ2IDMxNi4zMzEgMjQwLjI0NiAyODkuOTg4TDI0MC4yOTQgMTM5LjA4N0MyMjQuMjAzIDEyOC45NTcgMjA3LjU3MiAxMTkuNzQ4IDE5MS4yIDExMC4wN0wxMjQuODUgNzAuMjY4M0M5NS42IDUzLjA4OTIgNjYuMTYyNyAzNi40MDEgMzcuMzgxOCAxOC40MDMxIDI0LjQ1NzQgMTEuMzc3IDExLjk3MSAyLjk4NjItMS4xNzIzOC0zLjUwMTk4TC0zLjA5NTc0LTEuNDUwOThDLTQuMTA0MjQgNzQuMjUzMy0zLjIxMzA5IDE1MC4wOS0zLjE1ODI3IDIyNS44MDJMLTIuNDcwMTMgMjI2LjQ1N0MxNS40NTAyIDIzNy40MzcgMzMuOTcyOCAyNDcuNDM0IDUyLjA1NzYgMjU4LjE2NCA4OS44ODQ1IDI4MS4wMDUgMTI3Ljg2OCAzMDMuNTczIDE2Ni4wMDggMzI1Ljg3NSAxOTAuMzU1IDM0MC4wNTIgMjE4LjEyIDM1Mi40NzUgMjQwLjQyNiAzNjkuNDk4WiIgZmlsbD0iIzI3QTk1RiIgZmlsbC1ydWxlPSJldmVub2RkIiB0cmFuc2Zvcm09Im1hdHJpeCgxIDAgMCAtMSA4ODAgMTgzMikiLz48cGF0aCBkPSJNLTIuNzkwMzUgMTQyLjgxMUMtMi41NDk2MSAxNDMuMzI1LTIuNDAzOTEgMTQzLjktMi4wNjcyMiAxNDQuMzYyLTAuMzY1NDE0IDE0Ni42OTcgMjI3LjIyMyAyODQuMDU4IDIzOC45OTkgMjg4LjE2MiAyNjUuODIyIDI3My42MDQgNDc1LjE5NiAxNTAuNzA1IDQ4MC45OCAxNDIuNjcyIDQ4MS41NjQgMTQxLjg3IDQ4MS44IDE0MC44NiA0ODIuMjEgMTM5Ljk0NSA0NTkuOTE0IDEyMi45MiA0MzIuMTc1IDExMC40NzkgNDA3Ljg0NyA5Ni4zMDM4IDM2OS43MzcgNzMuOTgyMyAzMzEuNzc1IDUxLjM5OTMgMjkzLjk4OCAyOC41NDY2IDI3NS45MTQgMTcuODEyNSAyNTcuNDEzIDcuODAxODQgMjM5LjQ5Ni0zLjE4NDU2TDIzOC44MDctMy44Mzc5MkMyMzIuODg0LTEuMTU0NjkgMjI2LjkzNiAzLjcyNDM0IDIyMS40MzEgNy4zMTQxMSAyMTIuNjMgMTMuMDY0MiAyMDMuNjk4IDE4LjU5NjkgMTk0LjYxNyAyMy45MTEzTDYxLjMyODggMTAzLjYxMyAxOS44NzQyIDEyOC4yMDlDMTMuMzkwNiAxMzEuOTgxIDUuODYwODMgMTM1LjM5Ny0wLjE2NTgyOCAxMzkuODA1LTEuMzI0ODUgMTQwLjY1OS0xLjk3NDgzIDE0MS42NTItMi43OTAzNSAxNDIuODExWiIgZmlsbD0iIzE2N0Y0RCIgZmlsbC1ydWxlPSJldmVub2RkIiB0cmFuc2Zvcm09Im1hdHJpeCgxIDAgMCAtMSA2MzkgMTYwMikiLz48cGF0aCBkPSJNLTIuNDUyOTMgMTQyLjgxMUMtMi4yMTI1OCAxNDMuMzI1LTIuMDY3MTIgMTQzLjktMS43MzA5OCAxNDQuMzYyLTAuMDMxOTI5MiAxNDYuNjk3IDIyNy4xODggMjg0LjA1OCAyMzguOTQ0IDI4OC4xNjIgMjQwLjM1NSAxOTEuMDUyIDIzOC43NTIgOTMuOTE2MyAyMzkuNDQxLTMuMTg0NTZMMjM4Ljc1Mi0zLjgzNzkyQzIzMi44MzktMS4xNTQ2OSAyMjYuOSAzLjcyNDM0IDIyMS40MDUgNy4zMTQxMSAyMTIuNjE4IDEzLjA2NDIgMjAzLjcgMTguNTk2OSAxOTQuNjM0IDIzLjkxMTNMNjEuNTYxOSAxMDMuNjEzIDIwLjE3NDggMTI4LjIwOUMxMy43MDE1IDEzMS45ODEgNi4xODQyMSAxMzUuMzk3IDAuMTY3MzMzIDEzOS44MDUtMC45OTAxMDEgMTQwLjY1OS0xLjYzODc0IDE0MS42NTItMi40NTI5MyAxNDIuODExWiIgZmlsbD0iIzI3QTk1RiIgZmlsbC1ydWxlPSJldmVub2RkIiB0cmFuc2Zvcm09Im1hdHJpeCgxIDAgMCAtMSA2MzkgMTYwMikiLz48L3N2Zz4K) !important;
    background-repeat: no-repeat !important;
    background-position: center !important;
    background-size: contain !important;
}
`;
    const anchor = '${heroRules(ui, iconUri)}';
    if (!s.includes(anchor)) throw new Error('anchor miss: brand heroRules');
    s = s.replace(anchor, anchor + MARK_CSS);
    write(bf, s); console.log('brand css: hero mark appended');
  } else console.log('brand css: already patched');
}

console.log('ALL PATCHES APPLIED');
