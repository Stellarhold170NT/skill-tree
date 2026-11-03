/**
 * skilltree-teacher-ui — CLIENT half (no build step; platform module format).
 * Registers one additive `shell.overlay` entry: a floating "Bảng GV" button and
 * a table-first teacher dashboard backed by learner-model (M5), assignment (M7),
 * analytics (M4), class (M6) and opencase (M1) through the api-gateway (M10).
 * All traffic goes through the host routes POST /skilltree-teacher/{batch,assign,
 * quiz,ask} — the page never addresses services directly, and the teacher JWT
 * (auth-ui, localStorage "skilltree.auth.v1") is forwarded per request.
 *
 * Sections: class selector + documentId → RAG heatmap (students × concepts),
 * contrastive teaching plan (frontier/bottleneck + "Giao ôn tập" → M7),
 * per-student drill-down (mastery + next + event history), Class Ask box.
 *
 * Design tokens: DESIGN.md (brand: leaf green + deep teal ink). Anti-slop:
 * no gradients, no glassmorphism, no nested-card stacking, WCAG AA contrast,
 * table-first information density for teachers, no motion slop.
 */
window.__ModuleLoader__.load({ id: "skilltree-teacher-ui", factory: (require) => {
	var module = { exports: {} };
	var exports = module.exports;
	const react = require("react");
	const { createElement: h, useState, useEffect, useCallback } = react;


	const NS = "skilltree-teacher-ui";
	const STORE_KEY = "skilltree.teacherui.settings";
	const AUTH_KEY = "skilltree.auth.v1";


	/* ---- DESIGN.md tokens (brand: leaf green + deep teal ink) ---- */
	const T = {
		primary500: "#27A95F",   // --st-primary-500 (brand fill, large UI only)
		primary50: "#F4FBF7",    // --st-primary-50
		primary100: "#E5F5EC",   // --st-primary-100
		primary200: "#C7E9D5",   // --st-primary-200
		boot: "#167F4D",         // --st-boot (white text on it: 5.03:1 AA)
		primary800: "#145831",   // --st-primary-800 (button hover)
		ink: "#1C3632",          // --st-ink
		inkSoft: "#3A544E",      // --st-ink-soft
		body: "#374151",         // --st-neutral-800 (body text, 10.31:1)
		muted: "#6B7280",        // --st-neutral-500 (muted text, 4.83:1)
		border: "#D4D8D6",       // --st-neutral-300 (hairline)
		surface: "#FFFFFF",      // --st-surface
		tint: "#F2F2F2",         // --st-neutral-100
		successTint: "#E6F7EC",  // --st-success-tint
		successText: "#167F4D",  // --st-success-text
		danger: "#B3261E",       // --st-danger (6.54:1 on white)
		dangerTint: "#FDECEC",   // --st-danger-tint
		// RAG semantics (dashboard-only, derived from the brand ramp — declared in README):
		amberText: "#7A5800",    // on amberTint: 6.1:1 AA
		amberTint: "#FDF3D9",    // amber state tint
	};
	const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
	const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';


	/* ---- styling (inline objects, theme-safe, no CSS files) ---- */
	const S = {
		root: { position: "relative", width: "100%", maxWidth: "100%", zIndex: 1, fontFamily: FONT },
		fab: {
			padding: "8px 14px", borderRadius: "999px", border: "none", cursor: "pointer",
			fontSize: "13px", fontWeight: 600, background: T.boot, color: "#FFFFFF",
			boxShadow: "0 2px 8px rgba(28,54,50,0.25)",
		},
		panel: {
			position: "relative", right: "auto", bottom: "auto", width: "100%", maxWidth: "100%",
			maxHeight: "none", overflow: "visible", background: "transparent", color: T.body,
			border: "none", borderRadius: "0", padding: "0",
			lineHeight: 1.45,
			pointerEvents: "auto",
			display: "flex", flexDirection: "column", gap: "12px",
			paddingBottom: "24px",
		},
		head: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" },
		title: { margin: 0, fontSize: "18px", fontWeight: 700, color: T.ink },
		subtitle: { margin: "2px 0 0", fontSize: "12px", color: T.muted },
		close: { border: "none", background: "none", fontSize: "20px", cursor: "pointer", color: T.muted, lineHeight: 1 },
		conn: { marginTop: "12px", padding: "12px", borderRadius: "8px", background: T.primary50, border: "1px solid " + T.primary200 },
		connRow: { display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "flex-end", marginTop: "6px" },
		label: { display: "block", fontSize: "12px", fontWeight: 600, color: T.inkSoft, margin: "6px 0 2px" },
		input: {
			boxSizing: "border-box", padding: "7px 9px", fontSize: "13px", borderRadius: "4px",
			border: "1px solid " + T.border, background: T.surface, color: T.ink, outline: "none",
		},
		select: {
			boxSizing: "border-box", padding: "7px 9px", fontSize: "13px", borderRadius: "4px",
			border: "1px solid " + T.border, background: T.surface, color: T.ink, outline: "none",
		},
		btn: {
			padding: "7px 14px", fontSize: "13px", fontWeight: 600, borderRadius: "8px", border: "none",
			cursor: "pointer", background: T.boot, color: "#FFFFFF",
		},
		btnGhost: {
			padding: "4px 10px", fontSize: "12px", borderRadius: "8px", cursor: "pointer",
			border: "1px solid " + T.border, background: T.surface, color: T.inkSoft,
		},
		btnSmall: {
			padding: "3px 9px", fontSize: "12px", fontWeight: 600, borderRadius: "8px", border: "none",
			cursor: "pointer", background: T.primary100, color: T.primary800,
		},
		error: {
			marginTop: "10px", padding: "8px 10px", borderRadius: "8px", fontSize: "13px",
			background: T.dangerTint, color: T.danger,
		},
		warn: {
			marginTop: "10px", padding: "8px 10px", borderRadius: "8px", fontSize: "13px",
			background: T.amberTint, color: T.amberText,
		},
		okMsg: {
			marginTop: "10px", padding: "8px 10px", borderRadius: "8px", fontSize: "13px",
			background: T.successTint, color: T.successText,
		},
		section: { marginTop: "16px" },
		sectionHead: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap" },
		sectionTitle: { margin: 0, fontSize: "14px", fontWeight: 700, color: T.ink },
		table: { width: "100%", borderCollapse: "collapse", marginTop: "8px", fontSize: "13px", tableLayout: "auto" },
		th: {
			textAlign: "left", fontSize: "12px", color: T.inkSoft, fontWeight: 600,
			borderBottom: "1px solid " + T.border, padding: "6px 8px", whiteSpace: "nowrap",
		},
		thConcept: {
			textAlign: "center", fontSize: "11px", color: T.inkSoft, fontWeight: 600,
			borderBottom: "1px solid " + T.border, padding: "4px 4px", maxWidth: "110px",
		},
		td: { borderBottom: "1px solid " + T.tint, padding: "6px 8px", verticalAlign: "top", color: T.body },
		tdCenter: { borderBottom: "1px solid " + T.tint, padding: "4px", textAlign: "center", verticalAlign: "middle" },
		studentBtn: {
			border: "none", background: "none", padding: 0, cursor: "pointer",
			fontSize: "13px", fontWeight: 600, color: T.boot, textDecoration: "underline",
		},
		mono: { fontFamily: MONO, fontSize: "11px", color: T.inkSoft, wordBreak: "break-all" },
		muted: { fontSize: "12px", color: T.muted },
		legend: { display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center", marginTop: "8px" },
		scrollX: { overflowX: "auto", marginTop: "4px" },
		back: { border: "none", background: "none", cursor: "pointer", color: T.boot, fontSize: "13px", padding: 0 },
		formGrid: { display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "flex-end", marginTop: "8px" },
		divider: { borderTop: "1px solid " + T.tint, margin: "12px 0" },
		askBox: { width: "100%", boxSizing: "border-box", minHeight: "56px", resize: "vertical",
			padding: "8px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid " + T.border,
			background: T.surface, color: T.ink, outline: "none", fontFamily: FONT },
		answer: { marginTop: "10px", padding: "10px 12px", borderRadius: "8px", fontSize: "13px",
			background: T.primary50, border: "1px solid " + T.primary200, color: T.ink, whiteSpace: "pre-wrap" },
		sourceLine: { marginTop: "4px", fontSize: "11px", color: T.muted },
		unlock: { color: T.inkSoft },
	};


	/* ---- settings persistence (browser-local; token stays client-side) ---- */
	function loadSettings() {
		try {
			const raw = JSON.parse(window.localStorage.getItem(STORE_KEY) || "{}");
			return {
				gatewayOverride: typeof raw.gatewayOverride === "string" ? raw.gatewayOverride : "",
				classId: typeof raw.classId === "string" ? raw.classId : "",
				documentId: typeof raw.documentId === "string" ? raw.documentId : "",
			};
		} catch (e) {
			return { gatewayOverride: "", classId: "", documentId: "" };
		}
	}


	function saveSettings(next) {
		try { window.localStorage.setItem(STORE_KEY, JSON.stringify(next)); } catch (e) { /* private mode */ }
	}


	function readToken() {
		try {
			const raw = JSON.parse(window.localStorage.getItem(AUTH_KEY) || "null");
			return raw && typeof raw.accessToken === "string" ? raw.accessToken : "";
		} catch (e) { return ""; }
	}


	/* ---- pure helpers (unit-tested in tests/client.mjs) ---- */

	/** RAG state → chip spec {label, bg, fg, dashed} with AA contrast pairs. */
	function stateChip(state) {
		if (state === "red") return { label: "Đỏ", bg: T.dangerTint, fg: T.danger, dashed: false };
		if (state === "amber") return { label: "Vàng", bg: T.amberTint, fg: T.amberText, dashed: false };
		if (state === "green") return { label: "Xanh", bg: T.successTint, fg: T.successText, dashed: false };
		if (state === "rusty") return { label: "Rusty", bg: T.amberTint, fg: T.amberText, dashed: true };
		return { label: "—", bg: T.surface, fg: T.muted, dashed: false };
	}


	/** Short display label for a concept column. */
	function conceptShort(node) {
		if (!node) return "";
		const scheme = typeof node.humanCodingScheme === "string" ? node.humanCodingScheme : "";
		const statement = typeof node.fullStatement === "string" ? node.fullStatement : (node.title || "");
		if (scheme && statement) return scheme;
		return statement || "";
	}


	/** GET-only batch for the class dashboard (allow-listed prefixes, one wire round-trip). */
	function buildDashboardCalls(classId, documentId) {
		const enc = encodeURIComponent;
		return [
			{ id: "classes", prefix: "class", path: "classes" },
			{ id: "heatmap", prefix: "learner", path: "classes/" + classId + "/heatmap", query: "documentId=" + enc(documentId) },
			{ id: "plan", prefix: "learner", path: "classes/" + classId + "/teaching-plan", query: "documentId=" + enc(documentId) + "&topN=5" },
			{ id: "roster", prefix: "class", path: "classes/" + classId + "/students" },
			{ id: "graph", prefix: "case", path: "documents/" + documentId + "/graph" },
		];
	}


	/** GET-only batch for the per-student drill-down. */
	function buildDrillCalls(studentId, documentId) {
		const enc = encodeURIComponent;
		return [
			{ id: "mastery", prefix: "learner", path: "students/" + studentId + "/mastery" },
			{ id: "next", prefix: "learner", path: "students/" + studentId + "/next", query: "documentId=" + enc(documentId) },
			{ id: "events", prefix: "events", path: "events", query: "actorId=" + enc(studentId) + "&limit=20" },
		];
	}


	function indexResults(results) {
		const byId = {};
		(Array.isArray(results) ? results : []).forEach((r) => { byId[r.id] = r; });
		return byId;
	}


	function resultData(result) {
		return result && result.ok ? result.data : null;
	}


	function resultError(result) {
		return result && !result.ok ? (result.error || "HTTP " + result.status) : "";
	}


	function api(path, body, token) {
		return window.fetch(path, {
			method: "POST",
			headers: Object.assign(
				{ "content-type": "application/json" },
				token ? { authorization: "Bearer " + token } : {},
			),
			body: JSON.stringify(body),
		}).then((res) => res.json().catch(() => ({ ok: false, error: "HTTP " + res.status })));
	}


	/* ---- components ---- */

	function Chip(props) {
		const chip = stateChip(props.state);
		return h("span", {
			title: chip.label,
			style: {
				display: "inline-block", minWidth: "44px", padding: "2px 8px", borderRadius: "999px",
				fontSize: "11px", fontWeight: 600, textAlign: "center",
				background: chip.bg, color: chip.fg,
				border: chip.dashed ? "1px dashed " + chip.fg : "1px solid transparent",
			},
		}, chip.label);
	}


	function HeatmapTable(props) {
		const { heatmap, roster, graph, onStudent } = props;
		const nodeByUri = {};
		(graph && Array.isArray(graph.nodes) ? graph.nodes : []).forEach((n) => { nodeByUri[n.identifier] = n; });
		const nameBySid = {};
		(Array.isArray(roster) ? roster : []).forEach((u) => { nameBySid[u.sourcedId] = u.displayName; });
		const concepts = Array.isArray(heatmap.concepts) ? heatmap.concepts : [];
		return h("div", { style: S.scrollX },
			h("table", { style: S.table },
				h("thead", null,
					h("tr", null,
						h("th", { style: S.th }, "Học sinh"),
						concepts.map((uri) => {
							const node = nodeByUri[uri];
							const short = conceptShort(node) || uri;
							return h("th", { key: uri, style: S.thConcept, title: node ? (node.fullStatement || uri) : uri }, short);
						}),
					),
				),
				h("tbody", null,
					(Array.isArray(heatmap.students) ? heatmap.students : []).map((sid) =>
						h("tr", { key: sid },
							h("td", { style: S.td },
								h("button", { style: S.studentBtn, onClick: () => onStudent(sid) }, nameBySid[sid] || sid),
								h("div", { style: S.mono }, sid),
							),
							concepts.map((uri) =>
								h("td", { key: uri, style: S.tdCenter },
									h(Chip, { state: heatmap.cells && heatmap.cells[sid] ? heatmap.cells[sid][uri] : "none" }),
								),
							),
						),
					),
				),
			),
		);
	}


	function PlanTable(props) {
		const { plan, graph, onAssign } = props;
		const nodeByUri = {};
		(graph && Array.isArray(graph.nodes) ? graph.nodes : []).forEach((n) => { nodeByUri[n.identifier] = n; });
		return h("table", { style: S.table },
			h("thead", null,
				h("tr", null,
					h("th", { style: S.th }, "#"),
					h("th", { style: S.th }, "Khái niệm"),
					h("th", { style: S.th }, "Đỏ"),
					h("th", { style: S.th }, "Rusty"),
					h("th", { style: S.th }, "Vàng"),
					h("th", { style: S.th }, "Mở khóa"),
					h("th", { style: S.th }, "Lý do (tương phản)"),
					h("th", { style: S.th }, "Hành động"),
				),
			),
			h("tbody", null,
				(Array.isArray(plan) ? plan : []).map((entry, index) => {
					const node = nodeByUri[entry.conceptUri];
					const label = node ? (node.humanCodingScheme ? node.humanCodingScheme + " · " + node.fullStatement : node.fullStatement) : entry.conceptUri;
					return h("tr", { key: entry.conceptUri },
						h("td", { style: S.td }, String(index + 1)),
						h("td", { style: S.td, title: entry.conceptUri }, label),
						h("td", { style: S.td }, String(entry.redCount)),
						h("td", { style: S.td }, String(entry.rustyCount)),
						h("td", { style: S.td }, String(entry.amberCount)),
						h("td", { style: S.td }, h("span", { style: S.unlock }, String(entry.unlocks ? entry.unlocks.length : 0) + " KCN")),
						h("td", { style: S.td }, entry.reason || ""),
						h("td", { style: S.td },
							h("button", { style: S.btnSmall, onClick: () => onAssign(entry.conceptUri, label) }, "Giao ôn tập"),
						),
					);
				}),
			),
		);
	}


	function AssignForm(props) {
		const { conceptLabel, targetGroup, title, dueAt, busy, onField, onSubmit, onCancel } = props;
		return h("form", { style: S.formGrid, onSubmit: onSubmit },
			h("div", { style: { minWidth: "220px", flex: "1 1 260px" } },
				h("label", { style: S.label, htmlFor: NS + "-assign-title" }, "Tiêu đề bài ôn tập *"),
				h("input", {
					id: NS + "-assign-title", style: Object.assign({}, S.input, { width: "100%" }),
					value: title, onChange: (e) => onField("title", e.target.value),
					placeholder: "Ôn tập " + conceptLabel + " — nhóm Red/Rusty",
				}),
				h("div", { style: S.muted, title: conceptLabel }, "Khái niệm: " + conceptLabel),
			),
			h("div", null,
				h("label", { style: S.label, htmlFor: NS + "-assign-group" }, "Nhóm đích *"),
				h("select", { id: NS + "-assign-group", style: S.select, value: targetGroup, onChange: (e) => onField("targetGroup", e.target.value) },
					h("option", { value: "red_rusty" }, "Red + Rusty"),
					h("option", { value: "red" }, "Red"),
					h("option", { value: "rusty" }, "Rusty"),
				),
			),
			h("div", null,
				h("label", { style: S.label, htmlFor: NS + "-assign-due" }, "Hạn (tùy chọn)"),
				h("input", {
					id: NS + "-assign-due", type: "datetime-local", style: S.input,
					value: dueAt, onChange: (e) => onField("dueAt", e.target.value),
				}),
			),
			h("div", { style: { display: "flex", gap: "8px" } },
				h("button", { style: S.btn, type: "submit", disabled: busy }, busy ? "Đang giao…" : "Giao bài (M7)"),
				h("button", { style: S.btnGhost, type: "button", onClick: onCancel }, "Đóng"),
			),
		);
	}


	function DrillPanel(props) {
		const { drill, documentId, onBack } = props;
		const mastery = resultData(drill.mastery);
		const next = resultData(drill.next);
		const events = resultData(drill.events);
		return h("div", { style: S.section },
			h("div", { style: S.sectionHead },
				h("button", { style: S.back, onClick: onBack }, "← Quay lại bảng lớp"),
				h("span", { style: S.mono }, drill.sid),
			),
			drill.error ? h("div", { style: S.error }, drill.error) : null,
			drill.loading ? h("p", { style: S.muted }, "Đang tải dữ liệu cá nhân…") : null,
			!drill.loading && next && next.conceptUri
				? h("div", { style: S.answer },
						h("strong", null, "Học tiếp theo: "),
						next.conceptUri,
						h("div", { style: S.sourceLine }, (next.explanation || "") + (Array.isArray(next.unlocks) ? " Mở khóa " + next.unlocks.length + " khái niệm." : "")),
					)
				: null,
			h("h4", { style: Object.assign({}, S.sectionTitle, { marginTop: "12px" }) }, "Mastery theo khái niệm (M5)"),
			h("table", { style: S.table },
				h("thead", null,
					h("tr", null,
						h("th", { style: S.th }, "Khái niệm"),
						h("th", { style: S.th }, "Trạng thái"),
						h("th", { style: S.th }, "Mastery"),
						h("th", { style: S.th }, "Rating ± RD"),
						h("th", { style: S.th }, "Lượt ôn"),
					),
				),
				h("tbody", null,
					(Array.isArray(mastery) ? mastery : []).map((m) =>
						h("tr", { key: m.conceptUri },
							h("td", { style: S.td, title: m.conceptUri }, m.conceptUri),
							h("td", { style: S.td }, h(Chip, { state: m.state })),
							h("td", { style: S.td }, Math.round((m.mastery || 0) * 100) + "%"),
							h("td", { style: S.td }, Math.round(m.rating || 0) + " ± " + Math.round(m.ratingDeviation || 0)),
							h("td", { style: S.td }, String(m.reviewCount)),
						),
					),
				),
			),
			h("h4", { style: Object.assign({}, S.sectionTitle, { marginTop: "12px" }) }, "Lịch sử học tập (M4 analytics)"),
			h("p", { style: S.muted }, "20 sự kiện gần nhất của học sinh (candidateId ẩn danh, Caliper)."),
			h("table", { style: S.table },
				h("thead", null,
					h("tr", null,
						h("th", { style: S.th }, "Thời điểm"),
						h("th", { style: S.th }, "Sự kiện"),
						h("th", { style: S.th }, "Đối tượng"),
						h("th", { style: S.th }, "Kết quả"),
					),
				),
				h("tbody", null,
					(Array.isArray(events) ? events : []).map((ev, i) =>
						h("tr", { key: ev.eventId || String(i) },
							h("td", { style: S.td }, String(ev.occurredAt || "").replace("T", " ").slice(0, 19)),
							h("td", { style: S.td }, ev.type || ""),
							h("td", { style: S.td, title: ev.objectId || "" }, String(ev.objectId || "").split("/").pop()),
							h("td", { style: S.td },
								ev.payload && typeof ev.payload.isCorrect === "boolean" ? (ev.payload.isCorrect ? "Đúng" : "Sai") : "—"),
						),
					),
				),
			),
			(!drill.loading && Array.isArray(mastery) && mastery.length === 0)
				? h("p", { style: S.muted }, "Học sinh chưa có dữ liệu mastery — chưa làm bài nào qua M2/M5.") : null,
			documentId ? null : null,
		);
	}


	function AskBox(props) {
		const { question, busy, ask, onField } = props;
		return h("div", null,
			h("textarea", {
				style: S.askBox, value: question,
				placeholder: "Ví dụ: Ai đã nắm vững recursion? — hay: Những em nào đang yếu ở đồ thị?",
				onChange: (e) => onField(e.target.value),
			}),
			h("div", { style: S.formGrid },
				h("button", { style: S.btn, type: "button", disabled: busy, onClick: ask }, busy ? "Đang hỏi…" : "Hỏi lớp"),
				h("span", { style: S.muted }, "Trả lời từ dữ liệu sống M5 (heatmap + teaching-plan); nâng cấp cognee M8 sau."),
			),
		);
	}


	function Panel(props) {
		const { onClose } = props;
		const initial = loadSettings();
		const [gatewayOverride, setGatewayOverride] = useState(initial.gatewayOverride);
		const [classId, setClassId] = useState(initial.classId);
		const [documentId, setDocumentId] = useState(initial.documentId);
		const [classes, setClasses] = useState([]);
		const [dash, setDash] = useState(null);
		const [busy, setBusy] = useState(false);
		const [error, setError] = useState("");
		const [notice, setNotice] = useState("");
		const [hasToken] = useState(Boolean(readToken()));
		const [drill, setDrill] = useState(null);
		const [assignFor, setAssignFor] = useState(null);
		const [assignTitle, setAssignTitle] = useState("");
		const [assignGroup, setAssignGroup] = useState("red_rusty");
		const [assignDue, setAssignDue] = useState("");
		const [assignBusy, setAssignBusy] = useState(false);
		const [assignment, setAssignment] = useState(null);
		const [askQuestion, setAskQuestion] = useState("");
		const [askBusy, setAskBusy] = useState(false);
		const [ask, setAsk] = useState(null);

		const token = readToken();

		const persist = useCallback((next) => {
			saveSettings({ gatewayOverride: next.gatewayOverride, classId: next.classId, documentId: next.documentId });
		}, []);

		const loadDashboard = useCallback(async () => {
			const trimmedClass = classId.trim();
			const trimmedDoc = documentId.trim();
			if (!trimmedClass || !trimmedDoc) { setError("Chọn lớp và nhập documentId của M1."); return; }
			setBusy(true); setError(""); setNotice(""); setDrill(null); setAssignment(null); setAsk(null);
			try {
				const res = await api("/skilltree-teacher/batch", {
					__baseUrl: gatewayOverride.trim() || undefined,
					calls: buildDashboardCalls(trimmedClass, trimmedDoc),
				}, token);
				if (!res || !res.ok) { setError((res && res.error) || "Không tải được dashboard."); setDash(null); return; }
				const byId = indexResults(res.results);
				const failed = ["heatmap", "plan", "roster", "graph"].filter((k) => !byId[k] || !byId[k].ok);
				if (failed.length) {
					const first = byId[failed[0]];
					setError("Mất kết nối dữ liệu lớp (" + failed.join(", ") + "): " + (resultError(first) || "unknown") +
						". Gợi ý: chạy `docker compose -f services/skill-tree-service/docker-compose.yml up -d` và bảo đảm gateway :8000 + M5/M6/M1 đang chạy.");
				}
				setDash(byId);
			} catch (callError) {
				setError("Lỗi gọi host route: " + String(callError));
			} finally { setBusy(false); }
		}, [classId, documentId, gatewayOverride, token]);

		const openDrill = useCallback(async (sid) => {
			setDrill({ sid, loading: true, error: "" });
			try {
				const res = await api("/skilltree-teacher/batch", {
					__baseUrl: gatewayOverride.trim() || undefined,
					calls: buildDrillCalls(sid, documentId.trim()),
				}, token);
				if (!res || !res.ok) { setDrill({ sid, loading: false, error: (res && res.error) || "Không tải được drill-down." }); return; }
				setDrill(Object.assign({ sid, loading: false, error: "" }, indexResults(res.results)));
			} catch (callError) {
				setDrill({ sid, loading: false, error: "Lỗi gọi host route: " + String(callError) });
			}
		}, [documentId, gatewayOverride, token]);

		const startAssign = useCallback((conceptUri, label) => {
			setAssignFor(conceptUri);
			setAssignTitle("Ôn tập " + (label || conceptUri) + " — nhóm Red/Rusty");
			setAssignment(null); setNotice("");
		}, []);

		const submitAssign = useCallback(async (e) => {
			e.preventDefault();
			if (!assignFor) return;
			setAssignBusy(true); setError(""); setNotice("");
			try {
				const res = await api("/skilltree-teacher/assign", {
					__baseUrl: gatewayOverride.trim() || undefined,
					title: assignTitle.trim() || "Ôn tập nhóm Red/Rusty",
					classId: classId.trim(),
					conceptUri: assignFor,
					targetGroup: assignGroup,
					dueAt: assignDue ? new Date(assignDue).toISOString() : undefined,
				}, token);
				if (!res || !res.ok) { setError("Giao bài thất bại: " + ((res && res.error) || "unknown")); return; }
				setAssignment(res.data);
				setNotice("Đã tạo bài ôn tập cho " + ((res.data && res.data.studentIds ? res.data.studentIds.length : 0)) + " học sinh, " + ((res.data && res.data.itemIds ? res.data.itemIds.length : 0)) + " câu hỏi (M2).");
			} catch (callError) {
				setError("Lỗi gọi host route: " + String(callError));
			} finally { setAssignBusy(false); }
		}, [assignFor, assignTitle, assignGroup, assignDue, classId, gatewayOverride, token]);

		const generateQuiz = useCallback(async () => {
			if (!assignment || !assignment.id) return;
			setAssignBusy(true); setError(""); setNotice("");
			try {
				const res = await api("/skilltree-teacher/quiz", {
					__baseUrl: gatewayOverride.trim() || undefined,
					assignmentId: assignment.id,
				}, token);
				if (!res || !res.ok) { setError("Tạo quiz thất bại: " + ((res && res.error) || "unknown")); return; }
				setAssignment(Object.assign({}, assignment, { quizTestId: res.data && res.data.quizTestId ? res.data.quizTestId : assignment.quizTestId }));
				setNotice("Đã tạo đề kiểm tra M2: " + (res.data && res.data.quizIdentifier ? res.data.quizIdentifier : res.data && res.data.quizTestId));
			} catch (callError) {
				setError("Lỗi gọi host route: " + String(callError));
			} finally { setAssignBusy(false); }
		}, [assignment, gatewayOverride, token]);

		const sendAsk = useCallback(async () => {
			setAskBusy(true); setError(""); setAsk(null);
			try {
				const res = await api("/skilltree-teacher/ask", {
					__baseUrl: gatewayOverride.trim() || undefined,
					question: askQuestion.trim(),
					classId: classId.trim(),
					documentId: documentId.trim(),
				}, token);
				if (!res || !res.ok) { setError("Class Ask thất bại: " + ((res && res.error) || "unknown")); return; }
				setAsk(res);
			} catch (callError) {
				setError("Lỗi gọi host route: " + String(callError));
			} finally { setAskBusy(false); }
		}, [askQuestion, classId, documentId, gatewayOverride, token]);

		// On open: nothing to fetch — the class list arrives with the dashboard batch.
		// Keep one mount effect for the token notice refresh.
		useEffect(() => { /* hook placeholder: token notice derived at render */ }, []);

		const classOptions = (dash && resultData(dash.classes) ? resultData(dash.classes) : classes) || [];
		const heatmap = dash && resultData(dash.heatmap);
		const plan = dash && resultData(dash.plan);
		const roster = dash && resultData(dash.roster);
		const graph = dash && resultData(dash.graph);

		const onField = (which, value) => {
			if (which === "title") setAssignTitle(value);
			if (which === "targetGroup") setAssignGroup(value);
			if (which === "dueAt") setAssignDue(value);
		};

		return h("div", { style: S.panel },
			h("div", { style: S.head },
				h("div", null,
					h("h3", { style: S.title }, "Bảng giáo viên — SkillTree"),
					h("p", { style: S.subtitle }, "Heatmap RAG + Teaching Plan (M5) · Giao bài (M7) · Drill-down (M4) · Class Ask"),
				),
				h("button", { style: S.close, onClick: onClose, "aria-label": "Đóng bảng giáo viên" }, "×"),
			),
			!hasToken ? h("div", { style: S.warn }, "Chưa có JWT (đăng nhập bằng plugin auth-ui trong Settings → Tài khoản). Gateway đang để auth off thì vẫn xem được, nhưng khuyến nghị đăng nhập.") : null,
			h("div", { style: S.conn },
				h("div", { style: S.connRow },
					h("div", null,
						h("label", { style: S.label, htmlFor: NS + "-class" }, "Lớp (M6)"),
						h("select", {
							id: NS + "-class", style: Object.assign({}, S.select, { minWidth: "180px" }),
							value: classId,
							onChange: (e) => { setClassId(e.target.value); persist({ gatewayOverride: gatewayOverride, classId: e.target.value, documentId: documentId }); },
						},
							h("option", { value: "" }, classOptions.length ? "— chọn lớp —" : "— tải dashboard để lấy lớp —"),
							classOptions.map((c) => h("option", { key: c.sourcedId, value: c.sourcedId }, c.title || c.sourcedId)),
						),
					),
					h("div", { style: { flex: "1 1 240px" } },
						h("label", { style: S.label, htmlFor: NS + "-doc" }, "DocumentId môn học (M1)"),
						h("input", {
							id: NS + "-doc", style: Object.assign({}, S.input, { width: "100%" }),
							value: documentId, placeholder: "UUID CFDocument",
							onChange: (e) => { setDocumentId(e.target.value); persist({ gatewayOverride: gatewayOverride, classId: classId, documentId: e.target.value }); },
						}),
					),
					h("div", { style: { flex: "1 1 180px" } },
						h("label", { style: S.label, htmlFor: NS + "-gw" }, "Gateway override (tùy chọn)"),
						h("input", {
							id: NS + "-gw", style: Object.assign({}, S.input, { width: "100%" }),
							value: gatewayOverride, placeholder: "http://localhost:8000",
							onChange: (e) => { setGatewayOverride(e.target.value); persist({ gatewayOverride: e.target.value, classId: classId, documentId: documentId }); },
						}),
					),
					h("button", { style: S.btn, onClick: loadDashboard, disabled: busy }, busy ? "Đang tải…" : "Tải dashboard"),
				),
			),
			error ? h("div", { style: S.error }, error) : null,
			notice ? h("div", { style: S.okMsg }, notice) : null,

			dash && heatmap ? h("div", { style: S.section },
				h("div", { style: S.sectionHead },
					h("h4", { style: S.sectionTitle }, "Heatmap lớp học — học sinh × khái niệm (M5)"),
					h("span", { style: S.muted }, (heatmap.students ? heatmap.students.length : 0) + " học sinh · " + (heatmap.concepts ? heatmap.concepts.length : 0) + " khái niệm"),
				),
				h("div", { style: S.legend },
					h(Chip, { state: "red" }), h("span", { style: S.muted }, "đỏ < 40%"),
					h(Chip, { state: "amber" }), h("span", { style: S.muted }, "vàng 40–85%"),
					h(Chip, { state: "green" }), h("span", { style: S.muted }, "xanh ≥ 85%"),
					h(Chip, { state: "rusty" }), h("span", { style: S.muted }, "rusty — từng học, đang quên"),
					h(Chip, { state: "none" }), h("span", { style: S.muted }, "chưa có dữ liệu"),
				),
				h("p", { style: S.muted }, "Bấm tên học sinh để mở drill-down cá nhân."),
				h(HeatmapTable, { heatmap: heatmap, roster: roster, graph: graph, onStudent: openDrill }),
			) : null,

			dash && Array.isArray(plan) && plan.length > 0 ? h("div", { style: S.section },
				h("div", { style: S.sectionHead },
					h("h4", { style: S.sectionTitle }, "Teaching Plan tuần tới — gợi ý tương phản (M5)"),
					h("span", { style: S.muted }, "dạy cái nào trước để mở khóa nhiều nhất"),
				),
				h(PlanTable, { plan: plan, graph: graph, onAssign: startAssign }),
			) : null,

			assignFor ? h("div", { style: S.section },
				h("h4", { style: S.sectionTitle }, "Giao bài ôn tập trúng đích (M7)"),
				h(AssignForm, {
					conceptLabel: assignFor, targetGroup: assignGroup, title: assignTitle, dueAt: assignDue,
					busy: assignBusy, onField: onField, onSubmit: submitAssign,
					onCancel: () => setAssignFor(null),
				}),
				assignment ? h("div", { style: S.okMsg },
					"Đã tạo bài tập #" + String(assignment.id || "").slice(0, 8) + " — nhóm " + assignment.targetGroup +
					", " + (assignment.studentIds ? assignment.studentIds.length : 0) + " học sinh, " + (assignment.itemIds ? assignment.itemIds.length : 0) + " câu hỏi.",
					assignment.quizTestId
						? h("div", { style: S.sourceLine }, "Đề kiểm tra M2: " + assignment.quizTestId)
						: h("div", { style: { marginTop: "6px" } },
							h("button", { style: S.btnGhost, onClick: generateQuiz, disabled: assignBusy }, assignBusy ? "Đang tạo…" : "Tạo đề kiểm tra M2"),
						),
				) : null,
			) : null,

			drill ? h(DrillPanel, { drill: drill, documentId: documentId, onBack: () => setDrill(null) }) : null,

			h("div", { style: S.section },
				h("h4", { style: S.sectionTitle }, "Class Ask — hỏi tổng quan lớp bằng ngôn ngữ tự nhiên"),
				h(AskBox, { question: askQuestion, busy: askBusy, ask: sendAsk, onField: setAskQuestion }),
				ask && ask.answer ? h("div", { style: S.answer }, ask.answer,
					h("div", { style: S.sourceLine }, "Nguồn: " + (ask.source || "M5")) ,
				) : null,
			),
			h("div", { style: S.divider }),
			h("p", { style: S.muted },
				"Dữ liệu qua api-gateway (M10): learner M5 · class M6 · case M1 · events M4 · assignments M7. ",
				"JWT giáo viên nằm trong localStorage và chỉ đi kèm mỗi lời gọi qua host route.",
			),
		);
	}



	function PageIcon(props) {
		const size = props && props.size ? props.size : 20;
		const sw = props && props.strokeWidth ? props.strokeWidth : 1.25;
		const active = Boolean(props && props.active);
		return h("span", { style: { display: "inline-flex", alignItems: "center", color: active ? "var(--dsw-alias-brand-primary, #27A95F)" : "inherit" } },
			h("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 16 16", width: size, height: size, fill: "none", stroke: "currentColor", strokeWidth: sw, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", focusable: "false" }, h("path", { d: 'M3.4041 13.096C2.49514 12.187 1.87614 11.0288 1.62537 9.76798C1.37459 8.50716 1.50331 7.20028 1.99525 6.01261C2.48719 4.82494 3.32025 3.80981 4.3891 3.09557C5.45795 2.38134 6.71458 2.00008 8.0001 2C9.28563 2.00008 10.5423 2.38134 11.6111 3.09557C12.68 3.80981 13.513 4.82494 14.005 6.01261C14.4969 7.20028 14.6256 8.50716 14.3748 9.76798C14.1241 11.0288 13.5051 12.187 12.5961 13.096', stroke: "currentColor" }), h("path", { d: 'M8 8.49994L11.6114 4.88855', stroke: "currentColor" }), h("circle", { cx: 8, cy: 8.5, r: 1.25, stroke: "currentColor", fill: "currentColor" })));
	}
	function SidebarIcon(props) {
		return h("span", { style: { display: "inline-flex", alignItems: "center", color: (props && props.active) ? "var(--dsw-alias-brand-primary, #27A95F)" : "inherit" } },
			h("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 16 16", width: 20, height: 20, fill: "none", stroke: "currentColor", strokeWidth: 1.25, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", focusable: "false" }, h("path", { d: 'M3.4041 13.096C2.49514 12.187 1.87614 11.0288 1.62537 9.76798C1.37459 8.50716 1.50331 7.20028 1.99525 6.01261C2.48719 4.82494 3.32025 3.80981 4.3891 3.09557C5.45795 2.38134 6.71458 2.00008 8.0001 2C9.28563 2.00008 10.5423 2.38134 11.6111 3.09557C12.68 3.80981 13.513 4.82494 14.005 6.01261C14.4969 7.20028 14.6256 8.50716 14.3748 9.76798C14.1241 11.0288 13.5051 12.187 12.5961 13.096', stroke: "currentColor" }), h("path", { d: 'M8 8.49994L11.6114 4.88855', stroke: "currentColor" }), h("circle", { cx: 8, cy: 8.5, r: 1.25, stroke: "currentColor", fill: "currentColor" })));
	}
	function PageHeader() {
		return h("div", { style: { display: "flex", alignItems: "center", gap: "12px", padding: "0 0 16px", borderBottom: "1px solid rgba(127,127,127,.18)", marginBottom: "16px" } },
			h("div", { style: { display: "grid", placeItems: "center", width: "40px", height: "40px", borderRadius: "10px", background: "rgba(39,169,95,.14)", color: "var(--dsw-alias-brand-primary, #27A95F)" } },
				h("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 16 16", width: 22, height: 22, fill: "none", stroke: "currentColor", strokeWidth: 1.1, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", focusable: "false" }, h("path", { d: 'M3.4041 13.096C2.49514 12.187 1.87614 11.0288 1.62537 9.76798C1.37459 8.50716 1.50331 7.20028 1.99525 6.01261C2.48719 4.82494 3.32025 3.80981 4.3891 3.09557C5.45795 2.38134 6.71458 2.00008 8.0001 2C9.28563 2.00008 10.5423 2.38134 11.6111 3.09557C12.68 3.80981 13.513 4.82494 14.005 6.01261C14.4969 7.20028 14.6256 8.50716 14.3748 9.76798C14.1241 11.0288 13.5051 12.187 12.5961 13.096', stroke: "currentColor" }), h("path", { d: 'M8 8.49994L11.6114 4.88855', stroke: "currentColor" }), h("circle", { cx: 8, cy: 8.5, r: 1.25, stroke: "currentColor", fill: "currentColor" }))),
			h("div", null,
				h("h2", { style: { margin: 0, fontSize: "20px", fontWeight: 650, letterSpacing: "-0.01em" } }, "Bảng GV"),
				h("p", { style: { margin: "2px 0 0", fontSize: "13px", opacity: 0.7 } }, "Giao bài, xem độ nhớ và điểm nghẽn của lớp — hỗ trợ đúng lúc, đúng người.")));
	}
	function MainPanel() {
		return h("div", { className: "st-page", style: { width: "100%", maxWidth: "100%", padding: "20px 28px 40px", boxSizing: "border-box", fontFamily: "inherit" } },
			h(PageHeader, null), h(Panel, { onClose: function () {} }));
	}


	exports.name = NS;
	exports.inject = ["slots"];
	// Pure helpers, exported for unit tests (tests/client.mjs) — no DOM/side effects.
	exports.stateChip = stateChip;
	exports.conceptShort = conceptShort;
	exports.buildDashboardCalls = buildDashboardCalls;
	exports.buildDrillCalls = buildDrillCalls;
	exports.apply = function apply(ctx) {
		ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
			name: "sidebar.panellist",
			id: NS,
			order: 23,
			label: "Bảng GV",
		}, SidebarIcon));
		ctx.slots.inject("main", () => ctx.slots.register({ name: "main", key: NS }, MainPanel));
	};
	return module.exports;
}});
