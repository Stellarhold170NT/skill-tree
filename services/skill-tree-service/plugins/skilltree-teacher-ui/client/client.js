/**
 * skilltree-teacher-ui — CLIENT half.
 * Teacher Cockpit & Classroom Memory Dashboard.
 * Integrates M5 (learner-model), M6 (class), M1 (opencase), M7 (assignment), M4 (analytics).
 *
 * Design tokens: DeepSeek Harness & vAiPlatform dark theme.
 * Two-Column Workbench layout from Classroom Memory:
 *   - Top: 4 Live Diagnostic Metrics Cards
 *   - Left: Ask the Class Copilot + Graph-Reasoned Teaching Plan + Targeted Intervention
 *   - Right: Class Heat Map (Students × Competency Matrix) + Student Diagnostic Drill-down
 */
window.__ModuleLoader__.load({ id: "skilltree-teacher-ui", factory: (require) => {
	var module = { exports: {} };
	var exports = module.exports;
	const react = require("react");
	const { createElement: h, useState, useEffect, useCallback, useMemo } = react;

	const NS = "skilltree-teacher-ui";
	const STORE_KEY = "skilltree.teacherui.settings";
	const AUTH_KEY = "skilltree.auth.v1";

	/* ---- DeepSeek Harness & vAiPlatform Dark Theme Tokens ---- */
	const T = {
		bg: "#151517",
		card: "#1b1b1d",
		cardAlt: "#202023",
		field: "#111113",
		border: "rgba(255, 255, 255, 0.08)",
		borderLight: "rgba(255, 255, 255, 0.04)",
		brand: "#fd505a",
		brandHover: "#ff6b74",
		brandSoft: "rgba(253, 80, 90, 0.12)",
		labelPrimary: "#f9fafb",
		labelSecondary: "#cfd3d6",
		labelTertiary: "#9ca3af",
		// Cognitive States (Classroom Memory 4-state vocabulary)
		green: "#22c55e",
		greenSoft: "rgba(34, 197, 94, 0.12)",
		amber: "#f59e0b",
		amberSoft: "rgba(245, 158, 11, 0.12)",
		red: "#ef4444",
		redSoft: "rgba(239, 68, 68, 0.14)",
		rusty: "#d97706",
		rustySoft: "rgba(217, 119, 6, 0.14)",
		none: "#6b7280",
		noneSoft: "rgba(107, 114, 128, 0.10)",
	};

	const FONT = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif)';
	const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

	/* ---- Clean Vector SVG Icons ---- */
	const Icons = {
		Users: (size = 16, color = "currentColor") => h("svg", {
			width: size, height: size, viewBox: "0 0 24 24", fill: "none",
			stroke: color, strokeWidth: "1.75", strokeLinecap: "round", strokeLinejoin: "round"
		},
			h("path", { d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" }),
			h("circle", { cx: "9", cy: "7", r: "4" }),
			h("path", { d: "M23 21v-2a4 4 0 0 0-3-3.87" }),
			h("path", { d: "M16 3.13a4 4 0 0 1 0 7.75" })
		),
		Sparkles: (size = 16, color = "currentColor") => h("svg", {
			width: size, height: size, viewBox: "0 0 24 24", fill: "none",
			stroke: color, strokeWidth: "1.75", strokeLinecap: "round", strokeLinejoin: "round"
		},
			h("path", { d: "m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" }),
			h("path", { d: "M5 3v4" }),
			h("path", { d: "M19 17v4" }),
			h("path", { d: "M3 5h4" }),
			h("path", { d: "M17 19h4" })
		),
		Send: (size = 14, color = "currentColor") => h("svg", {
			width: size, height: size, viewBox: "0 0 24 24", fill: "none",
			stroke: color, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round"
		},
			h("line", { x1: "22", y1: "2", x2: "11", y2: "13" }),
			h("polygon", { points: "22 2 15 22 11 13 2 9 22 2" })
		),
		AlertCircle: (size = 16, color = "currentColor") => h("svg", {
			width: size, height: size, viewBox: "0 0 24 24", fill: "none",
			stroke: color, strokeWidth: "1.75", strokeLinecap: "round", strokeLinejoin: "round"
		},
			h("circle", { cx: "12", cy: "12", r: "10" }),
			h("line", { x1: "12", y1: "8", x2: "12", y2: "12" }),
			h("line", { x1: "12", y1: "16", x2: "12.01", y2: "16" })
		),
		TrendingUp: (size = 16, color = "currentColor") => h("svg", {
			width: size, height: size, viewBox: "0 0 24 24", fill: "none",
			stroke: color, strokeWidth: "1.75", strokeLinecap: "round", strokeLinejoin: "round"
		},
			h("polyline", { points: "23 6 13.5 15.5 8.5 10.5 1 18" }),
			h("polyline", { points: "17 6 23 6 23 12" })
		),
		Compass: (size = 16, color = "currentColor") => h("svg", {
			width: size, height: size, viewBox: "0 0 24 24", fill: "none",
			stroke: color, strokeWidth: "1.75", strokeLinecap: "round", strokeLinejoin: "round"
		},
			h("circle", { cx: "12", cy: "12", r: "10" }),
			h("polygon", { points: "16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" })
		),
		X: (size = 14, color = "currentColor") => h("svg", {
			width: size, height: size, viewBox: "0 0 24 24", fill: "none",
			stroke: color, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round"
		},
			h("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
			h("line", { x1: "6", y1: "6", x2: "18", y2: "18" })
		),
		RefreshCw: (size = 14, color = "currentColor") => h("svg", {
			width: size, height: size, viewBox: "0 0 24 24", fill: "none",
			stroke: color, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round"
		},
			h("polyline", { points: "23 4 23 10 17 10" }),
			h("polyline", { points: "1 20 1 14 7 14" }),
			h("path", { d: "M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" })
		)
	};

	/* ---- settings persistence ---- */
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
		try { window.localStorage.setItem(STORE_KEY, JSON.stringify(next)); } catch (e) {}
	}

	function readToken() {
		try {
			const raw = JSON.parse(window.localStorage.getItem(AUTH_KEY) || "null");
			return raw && typeof raw.accessToken === "string" ? raw.accessToken : "";
		} catch (e) { return ""; }
	}

	/* ---- pure helpers (unit-tested in tests/client.mjs) ---- */
	function stateChip(state) {
		if (state === "red") return { label: "Hổng (Red)", bg: T.redSoft, fg: T.red, dashed: false };
		if (state === "amber") return { label: "Đang học", bg: T.amberSoft, fg: T.amber, dashed: false };
		if (state === "green") return { label: "Thành thạo", bg: T.greenSoft, fg: T.green, dashed: false };
		if (state === "rusty") return { label: "Mai một", bg: T.rustySoft, fg: T.rusty, dashed: true };
		return { label: "—", bg: "rgba(255,255,255,0.04)", fg: T.labelTertiary, dashed: false };
	}

	function conceptShort(node) {
		if (!node) return "";
		const scheme = typeof node.humanCodingScheme === "string" ? node.humanCodingScheme : (node.human_coding_scheme || "");
		const statement = typeof node.fullStatement === "string" ? node.fullStatement : (node.full_statement || node.title || "");
		if (scheme && statement) return scheme;
		return statement || "";
	}

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

	function api(path, body, token) {
		return window.fetch(path, {
			method: "POST",
			headers: Object.assign(
				{ "content-type": "application/json" },
				token ? { authorization: "Bearer " + token } : {}
			),
			body: JSON.stringify(body),
		}).then((res) => res.json().catch(() => ({ ok: false, error: "HTTP " + res.status })));
	}

	/* ---- Components ---- */

	function MetricCard({ title, value, subtext, icon, color, bgSoft }) {
		return h("div", {
			style: {
				flex: "1 1 200px", background: T.card, border: `0.5px solid ${T.border}`,
				borderRadius: "12px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "16px",
				boxSizing: "border-box"
			}
		},
			h("div", {
				style: {
					width: "42px", height: "42px", borderRadius: "10px",
					display: "grid", placeItems: "center", background: bgSoft || "rgba(255,255,255,0.05)",
					color: color || T.brand, flexShrink: 0
				}
			}, icon),
			h("div", { style: { minWidth: 0 } },
				h("div", { style: { fontSize: "12px", color: T.labelTertiary, marginBottom: "2px" } }, title),
				h("div", { style: { fontSize: "20px", fontWeight: 700, color: T.labelPrimary, lineHeight: "26px" } }, value),
				subtext ? h("div", { style: { fontSize: "12px", color: color || T.labelSecondary, marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, subtext) : null
			)
		);
	}

	function Chip(props) {
		const chip = stateChip(props.state);
		return h("span", {
			title: chip.label,
			style: {
				display: "inline-flex", alignItems: "center", justifyContent: "center",
				minWidth: "48px", padding: "3px 8px", borderRadius: "6px",
				fontSize: "11px", fontWeight: 600, textAlign: "center",
				background: chip.bg, color: chip.fg,
				border: chip.dashed ? `1px dashed ${chip.fg}` : "1px solid transparent",
			},
		}, chip.label);
	}

	function Panel() {
		const initial = loadSettings();
		const [gatewayOverride, setGatewayOverride] = useState(initial.gatewayOverride);
		const [classId, setClassId] = useState(initial.classId);
		const [documentId, setDocumentId] = useState(initial.documentId);
		const [classes, setClasses] = useState([]);
		const [documents, setDocuments] = useState([]);
		const [dash, setDash] = useState(null);
		const [busy, setBusy] = useState(false);
		const [error, setError] = useState("");
		const [notice, setNotice] = useState("");
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

		const loadDashboard = useCallback(async (targetClassId, targetDocId) => {
			const cId = (targetClassId || classId).trim();
			const dId = (targetDocId || documentId).trim();
			if (!cId || !dId) {
				setError("Vui lòng chọn lớp học và môn học để phân tích.");
				return;
			}
			setBusy(true); setError(""); setNotice(""); setDrill(null); setAssignment(null);
			try {
				const res = await api("/skilltree-teacher/batch", {
					__baseUrl: gatewayOverride.trim() || undefined,
					calls: buildDashboardCalls(cId, dId),
				}, token);

				if (!res || !res.ok) {
					setError((res && res.error) || "Không tải được dữ liệu dashboard từ máy chủ.");
					setDash(null);
					return;
				}
				const byId = indexResults(res.results);
				setDash(byId);
			} catch (e) {
				setError("Lỗi kết nối: " + String(e.message || e));
				setDash(null);
			} finally {
				setBusy(false);
			}
		}, [classId, documentId, gatewayOverride, token]);

		// Initial Auto-Discovery: fetch available classes & documents, auto-link & auto-load
		useEffect(() => {
			let active = true;
			async function init() {
				try {
					const [clsRes, docRes] = await Promise.all([
						api("/skilltree-teacher/batch", { calls: [{ id: "classes", prefix: "class", path: "classes" }] }, token),
						api("/skilltree-teacher/batch", { calls: [{ id: "documents", prefix: "case", path: "documents" }] }, token),
					]);
					if (!active) return;
					const clsList = clsRes && clsRes.ok && clsRes.results && clsRes.results[0] && clsRes.results[0].ok ? clsRes.results[0].data : [];
					const docList = docRes && docRes.ok && docRes.results && docRes.results[0] && docRes.results[0].ok ? docRes.results[0].data : [];
					setClasses(Array.isArray(clsList) ? clsList : []);
					setDocuments(Array.isArray(docList) ? docList : []);

					let selectedC = classId;
					if (!selectedC && clsList.length > 0) {
						selectedC = clsList[0].sourcedId;
						setClassId(selectedC);
					}

					let selectedD = documentId;
					if (!selectedD && docList.length > 0) {
						// Match linear algebra or default to first doc
						const matched = docList.find(d => d.title && d.title.includes("Đại số tuyến tính")) || docList[0];
						selectedD = matched.id;
						setDocumentId(selectedD);
					}

					if (selectedC && selectedD) {
						persist({ gatewayOverride, classId: selectedC, documentId: selectedD });
						loadDashboard(selectedC, selectedD);
					}
				} catch (e) {
					console.error("[skilltree-teacher-ui] error during auto-discovery", e);
				}
			}
			init();
			return () => { active = false; };
		}, []);

		// Handler when class selection changes
		function onSelectClass(newClassId) {
			setClassId(newClassId);
			const cls = classes.find(c => c.sourcedId === newClassId);
			let matchedDocId = documentId;
			if (cls && cls.title) {
				const doc = documents.find(d => d.title && cls.title.includes(d.title.split(" ")[0]));
				if (doc) {
					matchedDocId = doc.id;
					setDocumentId(doc.id);
				}
			}
			persist({ gatewayOverride, classId: newClassId, documentId: matchedDocId });
			loadDashboard(newClassId, matchedDocId);
		}

		// Drill-down for individual student
		const openDrill = useCallback(async (studentId) => {
			if (!documentId) return;
			setDrill({ studentId, loading: true });
			try {
				const res = await api("/skilltree-teacher/batch", {
					__baseUrl: gatewayOverride.trim() || undefined,
					calls: buildDrillCalls(studentId, documentId),
				}, token);
				if (!res || !res.ok) {
					setDrill({ studentId, loading: false, error: (res && res.error) || "Lỗi tải hồ sơ học sinh." });
					return;
				}
				const byId = indexResults(res.results);
				setDrill({
					studentId,
					loading: false,
					mastery: resultData(byId.mastery),
					next: resultData(byId.next),
					events: resultData(byId.events),
				});
			} catch (e) {
				setDrill({ studentId, loading: false, error: String(e.message || e) });
			}
		}, [documentId, gatewayOverride, token]);

		// Assign review mutation
		const submitAssign = useCallback(async (ev) => {
			ev.preventDefault();
			if (!classId || !assignFor) return;
			setAssignBusy(true); setError(""); setNotice("");
			try {
				const res = await api("/skilltree-teacher/assign", {
					__baseUrl: gatewayOverride.trim() || undefined,
					classId,
					conceptUri: assignFor,
					targetGroup: assignGroup,
					title: assignTitle.trim() || undefined,
					dueAt: assignDue ? new Date(assignDue).toISOString() : undefined,
				}, token);
				if (!res || !res.ok) {
					setError((res && res.error) || "Giao bài tập thất bại.");
				} else {
					setAssignment(res.assignment || res);
					setNotice("Đã tạo bài tập can thiệp thành công cho nhóm học sinh.");
					loadDashboard();
				}
			} catch (e) {
				setError("Lỗi giao bài: " + String(e.message || e));
			} finally {
				setAssignBusy(false);
			}
		}, [classId, assignFor, assignGroup, assignTitle, assignDue, gatewayOverride, token, loadDashboard]);

		// Ask class AI query
		const sendAsk = useCallback(async (q) => {
			const query = (typeof q === "string" ? q : askQuestion).trim();
			if (!query || !classId || !documentId) return;
			setAskBusy(true); setAsk(null);
			try {
				const res = await api("/skilltree-teacher/ask", {
					__baseUrl: gatewayOverride.trim() || undefined,
					classId,
					documentId,
					question: query,
				}, token);
				if (!res || !res.ok) {
					setAsk({ ok: false, error: (res && res.error) || "Lỗi truy vấn AI." });
				} else {
					setAsk(res);
				}
			} catch (e) {
				setAsk({ ok: false, error: String(e.message || e) });
			} finally {
				setAskBusy(false);
			}
		}, [askQuestion, classId, documentId, gatewayOverride, token]);

		const heatmap = resultData(dash && dash.heatmap);
		const planObj = resultData(dash && dash.plan);
		const plan = Array.isArray(planObj) ? planObj : (planObj && Array.isArray(planObj.plan) ? planObj.plan : []);
		const roster = resultData(dash && dash.roster) || [];
		const graph = resultData(dash && dash.graph) || { nodes: [], edges: [] };

		// Computed Metrics
		const metrics = useMemo(() => {
			if (!heatmap || !Array.isArray(heatmap.students) || heatmap.students.length === 0) {
				return { total: 0, avgMastery: 0, worstGapName: "—", redCount: 0, rustyCount: 0 };
			}
			const total = heatmap.students.length;
			let totalCells = 0, masteredCells = 0, redCells = 0, rustyCells = 0;
			const conceptRedCounts = {};

			for (const sid of heatmap.students) {
				for (const cid of (heatmap.concepts || [])) {
					totalCells++;
					const state = heatmap.cells && heatmap.cells[sid] ? heatmap.cells[sid][cid] : "none";
					if (state === "green") masteredCells++;
					else if (state === "amber") masteredCells += 0.5;
					else if (state === "red") {
						redCells++;
						conceptRedCounts[cid] = (conceptRedCounts[cid] || 0) + 1;
					} else if (state === "rusty") {
						rustyCells++;
					}
				}
			}

			// Find biggest gap concept
			let worstCid = null, maxReds = -1;
			for (const [cid, count] of Object.entries(conceptRedCounts)) {
				if (count > maxReds) {
					maxReds = count;
					worstCid = cid;
				}
			}
			let worstGapName = "Không có";
			if (worstCid && graph && graph.nodes) {
				const n = graph.nodes.find(node => node.identifier === worstCid);
				worstGapName = n ? (n.humanCodingScheme || n.fullStatement || "KCN") : worstCid.slice(-8);
				if (maxReds > 0) worstGapName += ` (${maxReds} em đỏ)`;
			}

			return {
				total,
				avgMastery: totalCells > 0 ? Math.round((masteredCells / totalCells) * 100) : 0,
				worstGapName,
				redCount: redCells,
				rustyCount: rustyCells,
			};
		}, [heatmap, graph]);

		const nodeByUri = useMemo(() => {
			const map = {};
			(graph && graph.nodes ? graph.nodes : []).forEach(n => { map[n.identifier] = n; });
			return map;
		}, [graph]);

		const nameBySid = useMemo(() => {
			const map = {};
			(roster || []).forEach(u => { map[u.sourcedId] = u.displayName || u.email || u.sourcedId; });
			return map;
		}, [roster]);

		return h("div", { style: { display: "flex", flexDirection: "column", gap: "20px" } },
			// Top Toolbar: Class & Document selector
			h("div", {
				style: {
					display: "flex", justifyContent: "space-between", alignItems: "center",
					flexWrap: "wrap", gap: "12px", background: T.card, border: `0.5px solid ${T.border}`,
					borderRadius: "12px", padding: "14px 20px"
				}
			},
				h("div", { style: { display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" } },
					h("div", null,
						h("label", { style: { display: "block", fontSize: "11px", fontWeight: 600, color: T.labelTertiary, marginBottom: "4px" } }, "LỚP HỌC PHẦN"),
						h("select", {
							value: classId,
							onChange: (e) => onSelectClass(e.target.value),
							style: {
								padding: "8px 12px", background: T.field, border: `0.5px solid ${T.border}`,
								borderRadius: "8px", color: T.labelPrimary, fontSize: "13px", fontWeight: 500, outline: "none", minWidth: "220px"
							}
						},
							classes.length === 0 ? h("option", { value: "" }, "Đang tải danh sách lớp...") :
								classes.map(c => h("option", { key: c.sourcedId, value: c.sourcedId }, c.title))
						)
					),
					h("div", null,
						h("label", { style: { display: "block", fontSize: "11px", fontWeight: 600, color: T.labelTertiary, marginBottom: "4px" } }, "MÔN HỌC & KHUNG NĂNG LỰC"),
						h("select", {
							value: documentId,
							onChange: (e) => {
								setDocumentId(e.target.value);
								persist({ gatewayOverride, classId, documentId: e.target.value });
								loadDashboard(classId, e.target.value);
							},
							style: {
								padding: "8px 12px", background: T.field, border: `0.5px solid ${T.border}`,
								borderRadius: "8px", color: T.labelPrimary, fontSize: "13px", fontWeight: 500, outline: "none", minWidth: "240px"
							}
						},
							documents.length === 0 ? h("option", { value: "" }, "Đang tải môn học...") :
								documents.map(d => h("option", { key: d.id, value: d.id }, d.title))
						)
					)
				),
				h("button", {
					onClick: () => loadDashboard(), disabled: busy,
					style: {
						display: "inline-flex", alignItems: "center", gap: "6px",
						padding: "8px 16px", background: T.brand, color: "#fff",
						border: "none", borderRadius: "8px", fontSize: "13px",
						fontWeight: 500, cursor: busy ? "not-allowed" : "pointer"
					}
				},
					Icons.RefreshCw(14, "#fff"),
					busy ? "Đang cập nhật..." : "Làm mới dữ liệu"
				)
			),

			// Alert messages
			error ? h("div", {
				style: {
					padding: "10px 14px", borderRadius: "8px", fontSize: "13px",
					background: T.redSoft, color: T.red, border: `1px solid rgba(239, 68, 68, 0.3)`
				}
			}, error) : null,

			notice ? h("div", {
				style: {
					padding: "10px 14px", borderRadius: "8px", fontSize: "13px",
					background: T.greenSoft, color: T.green, border: `1px solid rgba(34, 197, 94, 0.3)`
				}
			}, notice) : null,

			// 1. TOP METRICS ROW (4 Live Diagnostic Cards)
			h("div", { style: { display: "flex", gap: "14px", flexWrap: "wrap" } },
				h(MetricCard, {
					title: "SĨ SỐ LỚP",
					value: `${metrics.total} học sinh`,
					subtext: "Đã đồng bộ OneRoster M6",
					icon: Icons.Users(20, T.brand),
					bgSoft: T.brandSoft
				}),
				h(MetricCard, {
					title: "LÀM CHỦ TRUNG BÌNH",
					value: `${metrics.avgMastery}%`,
					subtext: "Mô hình nhận thức Glicko-2",
					icon: Icons.TrendingUp(20, T.green),
					color: T.green,
					bgSoft: T.greenSoft
				}),
				h(MetricCard, {
					title: "LỖ HỔNG LỚN NHẤT",
					value: metrics.worstGapName,
					subtext: "Khái niệm cả lớp đang đuối",
					icon: Icons.AlertCircle(20, T.red),
					color: T.red,
					bgSoft: T.redSoft
				}),
				h(MetricCard, {
					title: "BÁO ĐỘNG ĐỎ & MAI MỘT",
					value: `${metrics.redCount} đỏ · ${metrics.rustyCount} rusty`,
					subtext: "Cần can thiệp sư phạm",
					icon: Icons.Compass(20, T.amber),
					color: T.amber,
					bgSoft: T.amberSoft
				})
			),

			// 2. TWO-COLUMN WORKBENCH (Classroom Memory Architecture)
			h("div", { style: { display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "flex-start" } },
				// LEFT COLUMN: Copilot + Teaching Plan + Intervention
				h("div", { style: { flex: "1 1 420px", display: "flex", flexDirection: "column", gap: "16px", minWidth: "320px" } },
					// WIDGET 1: Ask the Class Copilot
					h("div", {
						style: {
							background: T.card, border: `0.5px solid ${T.border}`, borderRadius: "12px",
							padding: "18px 20px"
						}
					},
						h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" } },
							h("div", { style: { display: "flex", alignItems: "center", gap: "8px" } },
								Icons.Sparkles(16, T.brand),
								h("h3", { style: { margin: 0, fontSize: "14px", fontWeight: 600, color: T.labelPrimary } }, "Ask the Class Copilot")
							),
							h("span", {
								style: {
									padding: "2px 8px", background: T.brandSoft, color: T.brand,
									borderRadius: "6px", fontSize: "11px", fontWeight: 600, fontFamily: MONO
								}
							}, "Cognee Memory")
						),
						h("div", { style: { display: "flex", gap: "8px" } },
							h("input", {
								value: askQuestion,
								onChange: (e) => setAskQuestion(e.target.value),
								onKeyDown: (e) => { if (e.key === "Enter") sendAsk(); },
								placeholder: "Hỏi AI: Ai đang bị đỏ ở Định thức? Hoặc tổng quan lớp...",
								style: {
									flex: 1, padding: "8px 12px", background: T.field, border: `0.5px solid ${T.border}`,
									borderRadius: "8px", color: T.labelPrimary, fontSize: "13px", outline: "none"
								}
							}),
							h("button", {
								onClick: () => sendAsk(), disabled: askBusy || !askQuestion.trim(),
								style: {
									padding: "8px 14px", background: T.brand, color: "#fff",
									border: "none", borderRadius: "8px", cursor: askBusy ? "not-allowed" : "pointer"
								}
							}, Icons.Send(14, "#fff"))
						),
						// Suggested prompt chips
						h("div", { style: { display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "10px" } },
							[
								"Ai đang bị đỏ ở Định thức?",
								"Ai đã nắm vững Ma trận?",
								"Tổng quan tình hình lớp học ra sao?"
							].map((chip, idx) => h("button", {
								key: idx,
								onClick: () => { setAskQuestion(chip); sendAsk(chip); },
								style: {
									padding: "3px 8px", background: "rgba(255,255,255,0.04)", border: `0.5px solid ${T.borderLight}`,
									borderRadius: "6px", fontSize: "11px", color: T.labelSecondary, cursor: "pointer"
								}
							}, chip))
						),
						// AI Response Card
						ask ? h("div", {
							style: {
								marginTop: "12px", padding: "12px 14px", background: T.field,
								border: `0.5px solid ${T.border}`, borderRadius: "8px", fontSize: "13px", lineHeight: "20px"
							}
						},
							ask.error ? h("div", { style: { color: T.red } }, ask.error) :
								h("div", null,
									h("div", { style: { color: T.labelPrimary, whiteSpace: "pre-wrap" } }, ask.answer),
									h("div", { style: { fontSize: "11px", color: T.labelTertiary, marginTop: "6px", fontFamily: MONO } }, `Nguồn: ${ask.source || "M5 Learner Model"}`)
								)
						) : null
					),

					// WIDGET 2: Graph-Reasoned Teaching Plan
					h("div", {
						style: {
							background: T.card, border: `0.5px solid ${T.border}`, borderRadius: "12px",
							padding: "18px 20px"
						}
					},
						h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" } },
							h("div", null,
								h("h3", { style: { margin: "0 0 2px", fontSize: "14px", fontWeight: 600, color: T.labelPrimary } }, "Kế hoạch bài giảng (Teaching Plan)"),
								h("p", { style: { margin: 0, fontSize: "12px", color: T.labelTertiary } }, "Suy luận từ đồ thị tri thức: dạy bài nào để mở khóa nhiều nhất")
							),
							h("span", {
								style: {
									padding: "2px 8px", background: T.greenSoft, color: T.green,
									borderRadius: "6px", fontSize: "11px", fontWeight: 600, fontFamily: MONO
								}
							}, "Graph-Reasoned")
						),
						plan.length === 0 ? h("div", { style: { textAlign: "center", padding: "20px", color: T.labelTertiary, fontSize: "13px" } }, "Lớp chưa có điểm nghẽn hoặc chưa có bài tập.") :
							h("div", { style: { display: "flex", flexDirection: "column", gap: "10px" } },
								plan.map((entry, idx) => {
									const node = nodeByUri[entry.conceptUri];
									const code = node ? (node.humanCodingScheme || node.human_coding_scheme) : "KCN";
									const label = node ? (node.fullStatement || node.full_statement || entry.conceptUri) : entry.conceptUri;
									const unlocksCount = entry.unlocks ? entry.unlocks.length : 0;

									return h("div", {
										key: entry.conceptUri,
										style: {
											padding: "12px 14px", background: T.field, border: `0.5px solid ${T.borderLight}`,
											borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px"
										}
									},
										h("div", { style: { flex: 1, minWidth: 0 } },
											h("div", { style: { display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" } },
												h("span", { style: { fontSize: "12px", fontWeight: 700, color: T.brand, fontFamily: MONO } }, `${idx + 1}. [${code}]`),
												h("span", { style: { fontSize: "13px", fontWeight: 600, color: T.labelPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, label)
											),
											h("div", { style: { fontSize: "12px", color: T.labelTertiary, lineHeight: "16px", marginBottom: "6px" } }, entry.reason),
											h("div", { style: { display: "flex", gap: "6px", flexWrap: "wrap" } },
												entry.redCount > 0 ? h("span", { style: { padding: "1px 6px", borderRadius: "4px", fontSize: "11px", background: T.redSoft, color: T.red } }, `${entry.redCount} em đỏ`) : null,
												entry.rustyCount > 0 ? h("span", { style: { padding: "1px 6px", borderRadius: "4px", fontSize: "11px", background: T.rustySoft, color: T.rusty } }, `${entry.rustyCount} em rusty`) : null,
												h("span", { style: { padding: "1px 6px", borderRadius: "4px", fontSize: "11px", background: T.greenSoft, color: T.green } }, `Mở khóa ${unlocksCount} bài sau`)
											)
										),
										h("button", {
											onClick: () => {
												setAssignFor(entry.conceptUri);
												setAssignTitle(`Ôn tập củng cố: [${code}] ${label}`);
											},
											style: {
												padding: "6px 12px", background: T.brand, color: "#fff",
												border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap"
											}
										}, "Giao ôn tập")
									);
								})
							)
					),

					// WIDGET 3: Targeted Intervention Card (when Assign is clicked)
					assignFor ? h("div", {
						style: {
							background: T.card, border: `1px solid ${T.brand}`, borderRadius: "12px",
							padding: "18px 20px"
						}
					},
						h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" } },
							h("h4", { style: { margin: 0, fontSize: "14px", fontWeight: 600, color: T.labelPrimary } }, "Tạo đợt can thiệp sư phạm (M7)"),
							h("button", { onClick: () => setAssignFor(null), style: { background: "none", border: "none", color: T.labelTertiary, cursor: "pointer" } }, Icons.X(14, "currentColor"))
						),
						h("form", { onSubmit: submitAssign, style: { display: "flex", flexDirection: "column", gap: "10px" } },
							h("div", null,
								h("label", { style: { display: "block", fontSize: "11px", color: T.labelTertiary, marginBottom: "4px" } }, "Tiêu đề bài tập *"),
								h("input", {
									value: assignTitle, onChange: e => setAssignTitle(e.target.value),
									style: { width: "100%", padding: "8px 12px", background: T.field, border: `0.5px solid ${T.border}`, borderRadius: "6px", color: T.labelPrimary, fontSize: "13px", boxSizing: "border-box", outline: "none" }
								})
							),
							h("div", { style: { display: "flex", gap: "10px" } },
								h("div", { style: { flex: 1 } },
									h("label", { style: { display: "block", fontSize: "11px", color: T.labelTertiary, marginBottom: "4px" } }, "Nhóm học sinh đích"),
									h("select", {
										value: assignGroup, onChange: e => setAssignGroup(e.target.value),
										style: { width: "100%", padding: "8px 10px", background: T.field, border: `0.5px solid ${T.border}`, borderRadius: "6px", color: T.labelPrimary, fontSize: "13px", boxSizing: "border-box", outline: "none" }
									},
										h("option", { value: "red_rusty" }, "Tất cả học sinh Đỏ + Rusty"),
										h("option", { value: "red" }, "Chỉ học sinh Đỏ (Lỗ hổng lớn)"),
										h("option", { value: "rusty" }, "Chỉ học sinh Rusty (Cần ôn lại)")
									)
								),
								h("div", { style: { flex: 1 } },
									h("label", { style: { display: "block", fontSize: "11px", color: T.labelTertiary, marginBottom: "4px" } }, "Hạn nộp (Tùy chọn)"),
									h("input", {
										type: "datetime-local", value: assignDue, onChange: e => setAssignDue(e.target.value),
										style: { width: "100%", padding: "8px 10px", background: T.field, border: `0.5px solid ${T.border}`, borderRadius: "6px", color: T.labelPrimary, fontSize: "13px", boxSizing: "border-box", outline: "none" }
									})
								)
							),
							h("div", { style: { display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "6px" } },
								h("button", { type: "button", onClick: () => setAssignFor(null), style: { padding: "6px 12px", background: "none", border: `0.5px solid ${T.border}`, borderRadius: "6px", color: T.labelSecondary, fontSize: "12px", cursor: "pointer" } }, "Đóng"),
								h("button", { type: "submit", disabled: assignBusy, style: { padding: "6px 14px", background: T.brand, border: "none", borderRadius: "6px", color: "#fff", fontSize: "12px", fontWeight: 500, cursor: assignBusy ? "not-allowed" : "pointer" } }, assignBusy ? "Đang giao..." : "Giao bài tập ngay")
							)
						)
					) : null
				),

				// RIGHT COLUMN: Class Heat Map Matrix & Student Drill-Down
				h("div", { style: { flex: "2 1 540px", display: "flex", flexDirection: "column", gap: "16px", minWidth: "340px" } },
					// WIDGET 4: Class Heat Map Matrix
					h("div", {
						style: {
							background: T.card, border: `0.5px solid ${T.border}`, borderRadius: "12px",
							padding: "18px 20px"
						}
					},
						h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px", marginBottom: "14px" } },
							h("div", null,
								h("h3", { style: { margin: "0 0 2px", fontSize: "14px", fontWeight: 600, color: T.labelPrimary } }, "Bản đồ nhiệt năng lực (Class Heat Map)"),
								h("p", { style: { margin: 0, fontSize: "12px", color: T.labelTertiary } }, "Ma trận Học sinh × Chuẩn đầu ra; nhấp vào tên học sinh để xem chẩn đoán cá nhân")
							),
							// Legend
							h("div", { style: { display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" } },
								h(Chip, { state: "green" }),
								h(Chip, { state: "amber" }),
								h(Chip, { state: "red" }),
								h(Chip, { state: "rusty" }),
							)
						),

						!heatmap || !Array.isArray(heatmap.students) || heatmap.students.length === 0 ?
							h("div", { style: { textAlign: "center", padding: "40px", color: T.labelTertiary, fontSize: "13px" } }, "Chưa có dữ liệu học tập cho lớp học này.") :
							h("div", { style: { overflowX: "auto", border: `0.5px solid ${T.borderLight}`, borderRadius: "8px" } },
								h("table", { style: { width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12px" } },
									h("thead", null,
										h("tr", { style: { background: T.field, borderBottom: `0.5px solid ${T.border}` } },
											h("th", { style: { padding: "10px 14px", fontWeight: 600, color: T.labelSecondary, minWidth: "150px" } }, "Học sinh"),
											(heatmap.concepts || []).map(uri => {
												const node = nodeByUri[uri];
												const short = conceptShort(node) || uri.slice(-6);
												return h("th", {
													key: uri,
													title: node ? (node.fullStatement || node.full_statement || uri) : uri,
													style: { padding: "8px 6px", textAlign: "center", fontWeight: 600, color: T.brand, fontFamily: MONO, minWidth: "75px" }
												}, short);
											})
										)
									),
									h("tbody", null,
										heatmap.students.map(sid => {
											const isSelected = drill && drill.studentId === sid;
											return h("tr", {
												key: sid,
												style: {
													borderBottom: `0.5px solid ${T.borderLight}`,
													background: isSelected ? "rgba(253, 80, 90, 0.06)" : "transparent"
												}
											},
												h("td", { style: { padding: "10px 14px", verticalAlign: "middle" } },
													h("button", {
														onClick: () => openDrill(sid),
														style: {
															background: "none", border: "none", padding: 0,
															color: isSelected ? T.brand : T.labelPrimary, fontWeight: 600, fontSize: "13px",
															cursor: "pointer", textAlign: "left", textDecoration: "underline"
														}
													}, nameBySid[sid] || sid.slice(0, 8)),
													h("div", { style: { fontSize: "11px", color: T.labelTertiary, fontFamily: MONO } }, sid.slice(0, 8))
												),
												(heatmap.concepts || []).map(uri => {
													const state = heatmap.cells && heatmap.cells[sid] ? heatmap.cells[sid][uri] : "none";
													return h("td", {
														key: uri,
														style: { padding: "6px 4px", textAlign: "center", verticalAlign: "middle" }
													}, h(Chip, { state }));
												})
											);
										})
									)
								)
							)
					),

					// WIDGET 5: Individual Student Drill-Down Card
					drill ? h("div", {
						style: {
							background: T.card, border: `0.5px solid ${T.border}`, borderRadius: "12px",
							padding: "18px 20px"
						}
					},
						h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" } },
							h("div", null,
								h("h4", { style: { margin: "0 0 2px", fontSize: "14px", fontWeight: 600, color: T.labelPrimary } },
									`Chẩn đoán cá nhân: ${nameBySid[drill.studentId] || drill.studentId}`
								),
								h("p", { style: { margin: 0, fontSize: "12px", color: T.labelTertiary, fontFamily: MONO } }, `ID: ${drill.studentId}`)
							),
							h("button", { onClick: () => setDrill(null), style: { background: "none", border: "none", color: T.labelTertiary, cursor: "pointer" } }, Icons.X(14, "currentColor"))
						),
						drill.loading ? h("div", { style: { textAlign: "center", padding: "20px", color: T.labelTertiary, fontSize: "13px" } }, "Đang tải hồ sơ nhận thức cá nhân...") :
							drill.error ? h("div", { style: { color: T.red, fontSize: "13px" } }, drill.error) :
								h("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } },
									// Recommended Next Step (XAI)
									drill.next ? h("div", {
										style: {
											padding: "12px 14px", background: T.field, border: `0.5px solid ${T.green}`,
											borderRadius: "8px"
										}
									},
										h("div", { style: { fontSize: "11px", fontWeight: 600, color: T.green, marginBottom: "2px" } }, "KHUYẾN NGHỊ BƯỚC HỌC TIẾP THEO (XAI)"),
										h("div", { style: { fontSize: "13px", fontWeight: 600, color: T.labelPrimary } },
											nodeByUri[drill.next.conceptUri] ? (nodeByUri[drill.next.conceptUri].fullStatement || nodeByUri[drill.next.conceptUri].full_statement) : drill.next.conceptUri
										),
										drill.next.reason ? h("div", { style: { fontSize: "12px", color: T.labelSecondary, marginTop: "4px" } }, drill.next.reason) : null
									) : null,

									// Skills Breakdown Table
									drill.mastery && drill.mastery.length > 0 ? h("div", { style: { overflowX: "auto" } },
										h("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "12px" } },
											h("thead", null,
												h("tr", { style: { borderBottom: `0.5px solid ${T.border}`, color: T.labelTertiary } },
													h("th", { style: { padding: "6px 8px" } }, "Khái niệm"),
													h("th", { style: { padding: "6px 8px", textAlign: "center" } }, "Trạng thái"),
													h("th", { style: { padding: "6px 8px", textAlign: "right" } }, "Điểm làm chủ"),
													h("th", { style: { padding: "6px 8px", textAlign: "right" } }, "Lần luyện tập")
												)
											),
											h("tbody", null,
												drill.mastery.map(m => {
													const node = nodeByUri[m.conceptUri];
													const label = node ? (node.humanCodingScheme || node.human_coding_scheme || node.fullStatement) : m.conceptUri.slice(-8);
													return h("tr", { key: m.conceptUri, style: { borderBottom: `0.5px solid ${T.borderLight}` } },
														h("td", { style: { padding: "6px 8px", color: T.labelPrimary } }, label),
														h("td", { style: { padding: "6px 8px", textAlign: "center" } }, h(Chip, { state: m.state })),
														h("td", { style: { padding: "6px 8px", textAlign: "right", fontWeight: 600, color: T.labelPrimary } }, `${Math.round(m.mastery * 100)}%`),
														h("td", { style: { padding: "6px 8px", textAlign: "right", color: T.labelTertiary } }, String(m.reviewCount || 0))
													);
												})
											)
										)
									) : h("div", { style: { fontSize: "12px", color: T.labelTertiary } }, "Chưa có vết làm bài nào được ghi nhận.")
								)
					) : null
				)
			)
		);
	}

	function SidebarIcon(props) {
		const active = Boolean(props && props.active);
		return h("span", { style: { display: "inline-flex", alignItems: "center", color: active ? T.brand : "inherit" } },
			Icons.Compass(18, active ? T.brand : "currentColor")
		);
	}

	function PageHeader() {
		return h("div", {
			style: {
				display: "flex", alignItems: "center", gap: "12px",
				paddingBottom: "16px", borderBottom: `0.5px solid ${T.border}`, marginBottom: "20px"
			}
		},
			h("div", {
				style: {
					display: "grid", placeItems: "center", width: "40px", height: "40px",
					borderRadius: "10px", background: T.brandSoft, color: T.brand
				}
			}, Icons.Compass(22, T.brand)),
			h("div", null,
				h("h2", { style: { margin: 0, fontSize: "18px", fontWeight: 600, color: T.labelPrimary, lineHeight: "24px" } }, "Tổng quan giáo viên (Teacher Cockpit)"),
				h("p", { style: { margin: "2px 0 0", fontSize: "13px", color: T.labelTertiary, lineHeight: "18px" } },
					"Bản đồ nhiệt năng lực, kế hoạch bài giảng suy luận từ đồ thị tri thức & hỏi đáp toàn lớp (Classroom Memory)"
				)
			)
		);
	}

	function MainPanel() {
		return h("div", {
			className: "st-page",
			style: {
				width: "100%",
				height: "100%",
				maxHeight: "100%",
				overflowY: "auto",
				overflowX: "hidden",
				boxSizing: "border-box",
				fontFamily: FONT,
				color: T.labelPrimary,
				WebkitOverflowScrolling: "touch"
			}
		},
			h("div", {
				style: {
					width: "100%",
					maxWidth: "1180px",
					margin: "0 auto",
					padding: "24px 32px 64px",
					boxSizing: "border-box"
				}
			},
				h(PageHeader, null),
				h(Panel, null)
			)
		);
	}

	exports.name = NS;
	exports.inject = ["slots"];
	exports.stateChip = stateChip;
	exports.conceptShort = conceptShort;
	exports.buildDashboardCalls = buildDashboardCalls;
	exports.buildDrillCalls = buildDrillCalls;

	exports.apply = function apply(ctx) {
		ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
			name: "sidebar.panellist",
			id: NS,
			order: 20,
			label: "Tổng quan",
		}, SidebarIcon));

		ctx.slots.inject("main", () => ctx.slots.register({
			name: "main",
			key: NS,
		}, MainPanel));
	};

	return module.exports;
}});
