/**
 * skilltree-teacher-ui — CLIENT half.
 * Teacher Cockpit & Classroom Memory Dashboard.
 * Integrates M5 (learner-model), M6 (class), M1 (opencase), M7 (assignment), M4 (analytics).
 *
 * Design tokens: DeepSeek Harness & vAiPlatform dark theme.
 * Two-Column Workbench layout from Classroom Memory:
 *   - Top: 4 Live Diagnostic Metrics Cards
 *   - Left: Ask the Class Copilot + Graph-Reasoned Teaching Plan + Student Roster List
 *   - Right: THE MASTERY GRAPH (Interactive SVG DAG) + Concept Inspector + View Toggle
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
		// Cognitive States (Subdued, ergonomic tones)
		green: "#22c55e",
		greenSoft: "rgba(34, 197, 94, 0.14)",
		amber: "#f59e0b",
		amberSoft: "rgba(245, 158, 11, 0.14)",
		red: "#ef4444",
		redSoft: "rgba(239, 68, 68, 0.14)",
		rusty: "#d97706",
		rustySoft: "rgba(217, 119, 6, 0.14)",
		none: "#52525b",
		noneSoft: "rgba(255, 255, 255, 0.03)",
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
		Network: (size = 16, color = "currentColor") => h("svg", {
			width: size, height: size, viewBox: "0 0 24 24", fill: "none",
			stroke: color, strokeWidth: "1.75", strokeLinecap: "round", strokeLinejoin: "round"
		},
			h("rect", { x: "16", y: "16", width: "6", height: "6", rx: "1" }),
			h("rect", { x: "2", y: "16", width: "6", height: "6", rx: "1" }),
			h("rect", { x: "9", y: "2", width: "6", height: "6", rx: "1" }),
			h("path", { d: "M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" }),
			h("path", { d: "M12 12V8" })
		),
		Table: (size = 16, color = "currentColor") => h("svg", {
			width: size, height: size, viewBox: "0 0 24 24", fill: "none",
			stroke: color, strokeWidth: "1.75", strokeLinecap: "round", strokeLinejoin: "round"
		},
			h("rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }),
			h("path", { d: "M3 9h18" }),
			h("path", { d: "M3 15h18" }),
			h("path", { d: "M9 3v18" })
		),
		ArrowLeft: (size = 14, color = "currentColor") => h("svg", {
			width: size, height: size, viewBox: "0 0 24 24", fill: "none",
			stroke: color, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round"
		},
			h("line", { x1: "19", y1: "12", x2: "5", y2: "12" }),
			h("polyline", { points: "12 19 5 12 12 5" })
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

	function stateChip(state) {
		if (state === "red") return { label: "Hổng (Red)", bg: T.redSoft, fg: T.red, border: T.red };
		if (state === "amber") return { label: "Đang học", bg: T.amberSoft, fg: T.amber, border: T.amber };
		if (state === "green") return { label: "Thành thạo", bg: T.greenSoft, fg: T.green, border: T.green };
		if (state === "rusty") return { label: "Mai một", bg: T.rustySoft, fg: T.rusty, border: T.rusty, dashed: true };
		return { label: "Chưa học", bg: T.noneSoft, fg: T.labelTertiary, border: "transparent" };
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

	/* ---- Dynamic Topological DAG Layout Engine ---- */
	function computeDagLayout(nodes, edges, width = 860, height = 440) {
		const nodeMap = new Map();
		nodes.forEach(n => {
			const id = n.identifier || n.id;
			nodeMap.set(id, n);
		});

		const inDegree = new Map();
		const adj = new Map();
		nodes.forEach(n => {
			const id = n.identifier || n.id;
			inDegree.set(id, 0);
			adj.set(id, []);
		});

		edges.forEach(e => {
			const src = e.sourceIdentifier || e.source || e.from;
			const tgt = e.targetIdentifier || e.target || e.to;
			if (adj.has(src) && inDegree.has(tgt)) {
				adj.get(src).push(tgt);
				inDegree.set(tgt, inDegree.get(tgt) + 1);
			}
		});

		const layers = new Map();
		const queue = [];
		nodes.forEach(n => {
			const id = n.identifier || n.id;
			if (inDegree.get(id) === 0) {
				layers.set(id, 0);
				queue.push(id);
			}
		});

		const visited = new Set(queue);
		while (queue.length > 0) {
			const u = queue.shift();
			const uLayer = layers.get(u) || 0;
			for (const v of (adj.get(u) || [])) {
				const vLayer = Math.max(layers.get(v) || 0, uLayer + 1);
				layers.set(v, vLayer);
				if (!visited.has(v)) {
					visited.add(v);
					queue.push(v);
				}
			}
		}

		const layerGroups = [];
		nodes.forEach(n => {
			const id = n.identifier || n.id;
			const l = layers.get(id) || 0;
			while (layerGroups.length <= l) layerGroups.push([]);
			layerGroups[l].push(n);
		});

		const numLayers = Math.max(layerGroups.length, 1);
		const padX = 85;
		const padY = 55;
		const availW = width - padX * 2;
		const stepX = numLayers > 1 ? availW / (numLayers - 1) : availW / 2;

		const positions = new Map();
		layerGroups.forEach((group, lIdx) => {
			const x = padX + lIdx * stepX;
			const numNodes = group.length;
			const availH = height - padY * 2;
			const stepY = numNodes > 1 ? availH / (numNodes - 1) : 0;

			group.forEach((node, nIdx) => {
				const id = node.identifier || node.id;
				const y = numNodes === 1 ? height / 2 : padY + nIdx * stepY;
				positions.set(id, { x, y, layer: lIdx });
			});
		});

		return { positions, layerGroups };
	}

	/* ---- Components ---- */

	function MetricCard({ title, value, subtext, icon, color, bgSoft }) {
		return h("div", {
			style: {
				flex: "1 1 200px", background: T.card, border: "0.5px solid " + T.border,
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
				padding: "3px 8px", borderRadius: "6px",
				fontSize: "11px", fontWeight: 600, textAlign: "center",
				background: chip.bg, color: chip.fg,
				border: chip.dashed ? "1px dashed " + chip.border : "1px solid " + chip.border,
			},
		}, chip.label);
	}

	/* ---- MAIN DASHBOARD PANEL ---- */
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

		// Student drill mode (Classroom Memory pattern: active student changes Mastery Graph)
		const [activeStudentId, setActiveStudentId] = useState(null);
		const [drill, setDrill] = useState(null);

		// Mastery Graph interactive state
		const [selectedNodeUri, setSelectedNodeUri] = useState(null);
		const [graphViewMode, setGraphViewMode] = useState("graph"); // "graph" | "table"

		// Intervention creation state
		const [assignFor, setAssignFor] = useState(null);
		const [assignGroup, setAssignGroup] = useState("red_rusty");
		const [assignTitle, setAssignTitle] = useState("");
		const [assignDue, setAssignDue] = useState("");
		const [assignBusy, setAssignBusy] = useState(false);
		const [assignment, setAssignment] = useState(null);

		// Ask Copilot state
		const [askQuestion, setAskQuestion] = useState("");
		const [askBusy, setAskBusy] = useState(false);
		const [ask, setAsk] = useState(null);

		const token = readToken();

		const persist = useCallback((next) => {
			setGatewayOverride(next.gatewayOverride);
			setClassId(next.classId);
			setDocumentId(next.documentId);
			saveSettings(next);
		}, []);

		// Load Dashboard Data
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

		// Initial Auto-Discovery
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
			setActiveStudentId(null);
			setDrill(null);
			persist({ gatewayOverride, classId: newClassId, documentId: matchedDocId });
			loadDashboard(newClassId, matchedDocId);
		}

		// Drill-down for individual student: updates active student & personal mastery graph
		const selectStudent = useCallback(async (studentId) => {
			if (!studentId) {
				setActiveStudentId(null);
				setDrill(null);
				return;
			}
			setActiveStudentId(studentId);
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
					const st = heatmap.cells && heatmap.cells[sid] ? heatmap.cells[sid][cid] : "none";
					if (st === "green") masteredCells++;
					else if (st === "red") {
						redCells++;
						conceptRedCounts[cid] = (conceptRedCounts[cid] || 0) + 1;
					} else if (st === "rusty") {
						rustyCells++;
					}
				}
			}

			let worstCid = null, maxRed = 0;
			for (const cid in conceptRedCounts) {
				if (conceptRedCounts[cid] > maxRed) {
					maxRed = conceptRedCounts[cid];
					worstCid = cid;
				}
			}

			let worstGapName = "Không có";
			if (worstCid) {
				const n = (graph.nodes || []).find(x => x.identifier === worstCid);
				const code = n ? (n.humanCodingScheme || n.human_coding_scheme) : "Lỗ hổng";
				worstGapName = code + " (" + maxRed + " em đỏ)";
			}

			const avgMastery = totalCells > 0 ? Math.round((masteredCells / totalCells) * 100) : 0;
			return { total, avgMastery, worstGapName, redCount: redCells, rustyCount: rustyCells };
		}, [heatmap, graph]);

		const nameBySid = useMemo(() => {
			const m = {};
			roster.forEach(u => {
				const name = u.displayName || (u.givenName ? ((u.givenName || "") + " " + (u.familyName || "")).trim() : u.email || u.sourcedId);
				m[u.sourcedId] = name;
			});
			return m;
		}, [roster]);

		const nodeByUri = useMemo(() => {
			const m = {};
			(graph.nodes || []).forEach(n => {
				m[n.identifier || n.id] = n;
			});
			return m;
		}, [graph]);

		// Layout for SVG DAG Mastery Graph
		const dagLayout = useMemo(() => {
			return computeDagLayout(graph.nodes || [], graph.edges || [], 860, 440);
		}, [graph]);

		// Selected node inspector details
		const selectedNodeInfo = useMemo(() => {
			if (!selectedNodeUri) return null;
			const node = nodeByUri[selectedNodeUri];
			if (!node) return null;

			const code = node.humanCodingScheme || node.human_coding_scheme || "CHUẨN";
			const title = node.fullStatement || node.full_statement || node.title || selectedNodeUri;

			// Prerequisites (incoming edges)
			const prereqs = (graph.edges || [])
				.filter(e => (e.targetIdentifier || e.target || e.to) === selectedNodeUri)
				.map(e => nodeByUri[e.sourceIdentifier || e.source || e.from])
				.filter(Boolean);

			// Unlocks (outgoing edges)
			const unlocks = (graph.edges || [])
				.filter(e => (e.sourceIdentifier || e.source || e.from) === selectedNodeUri)
				.map(e => nodeByUri[e.targetIdentifier || e.target || e.to])
				.filter(Boolean);

			// Students struggling with this node
			const redStudents = [];
			const rustyStudents = [];
			if (heatmap && heatmap.cells) {
				(heatmap.students || []).forEach(sid => {
					const st = heatmap.cells[sid] ? heatmap.cells[sid][selectedNodeUri] : "none";
					if (st === "red") redStudents.push(nameBySid[sid] || sid.slice(0, 8));
					else if (st === "rusty") rustyStudents.push(nameBySid[sid] || sid.slice(0, 8));
				});
			}

			// Active student specific state if in drill mode
			let studentState = null;
			if (activeStudentId && heatmap && heatmap.cells) {
				studentState = heatmap.cells[activeStudentId] ? heatmap.cells[activeStudentId][selectedNodeUri] : "none";
			}

			return {
				uri: selectedNodeUri,
				code,
				title,
				prereqs,
				unlocks,
				redStudents,
				rustyStudents,
				studentState
			};
		}, [selectedNodeUri, nodeByUri, graph, heatmap, nameBySid, activeStudentId]);

		const activeStudentName = activeStudentId ? (nameBySid[activeStudentId] || activeStudentId.slice(0, 8)) : null;
		const nextStepUri = drill && drill.next && drill.next.conceptUri ? drill.next.conceptUri : null;

		/* ---- RENDER ---- */
		return h("div", {
			style: {
				fontFamily: FONT, background: T.bg, color: T.labelPrimary,
				minHeight: "100%", width: "100%", height: "100%", maxHeight: "100%",
				overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch",
				padding: "24px 28px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "20px"
			}
		},
			// Header Banner
			h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" } },
				h("div", null,
					h("div", { style: { display: "flex", alignItems: "center", gap: "10px" } },
						h("span", {
							style: {
								display: "inline-grid", placeItems: "center", width: "28px", height: "28px",
								borderRadius: "8px", background: T.brandSoft, color: T.brand
							}
						}, Icons.Compass(18, T.brand)),
						h("h1", { style: { margin: 0, fontSize: "20px", fontWeight: 700, color: T.labelPrimary } }, "Tổng quan giáo viên (Teacher Cockpit)")
					),
					h("p", { style: { margin: "4px 0 0", fontSize: "13px", color: T.labelTertiary } },
						"Bản đồ nhận thức tri thức (Mastery Graph), kế hoạch bài giảng suy luận đồ thị & hỏi đáp lớp học"
					)
				)
			),

			// Top Toolbar: Class & Document selector
			h("div", {
				style: {
					display: "flex", justifyContent: "space-between", alignItems: "center",
					flexWrap: "wrap", gap: "12px", background: T.card, border: "0.5px solid " + T.border,
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
								padding: "8px 12px", background: T.field, border: "0.5px solid " + T.border,
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
								setActiveStudentId(null);
								setDrill(null);
								persist({ gatewayOverride, classId, documentId: e.target.value });
								loadDashboard(classId, e.target.value);
							},
							style: {
								padding: "8px 12px", background: T.field, border: "0.5px solid " + T.border,
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
					background: T.redSoft, color: T.red, border: "1px solid rgba(239, 68, 68, 0.3)"
				}
			}, error) : null,

			notice ? h("div", {
				style: {
					padding: "10px 14px", borderRadius: "8px", fontSize: "13px",
					background: T.greenSoft, color: T.green, border: "1px solid rgba(34, 197, 94, 0.3)"
				}
			}, notice) : null,

			// 1. TOP METRICS ROW (4 Live Diagnostic Cards)
			h("div", { style: { display: "flex", gap: "14px", flexWrap: "wrap" } },
				h(MetricCard, {
					title: "SĨ SỐ LỚP",
					value: metrics.total + " học sinh",
					subtext: "Đã đồng bộ OneRoster M6",
					icon: Icons.Users(20, T.brand),
					bgSoft: T.brandSoft
				}),
				h(MetricCard, {
					title: "LÀM CHỦ TRUNG BÌNH",
					value: metrics.avgMastery + "%",
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
					value: metrics.redCount + " đỏ · " + metrics.rustyCount + " rusty",
					subtext: "Cần can thiệp sư phạm",
					icon: Icons.Compass(20, T.amber),
					color: T.amber,
					bgSoft: T.amberSoft
				})
			),

			// 2. TWO-COLUMN WORKBENCH (Classroom Memory Architecture)
			h("div", { style: { display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "flex-start" } },
				// LEFT COLUMN: Copilot + Teaching Plan + Student Roster List
				h("div", { style: { flex: "1 1 380px", display: "flex", flexDirection: "column", gap: "16px", minWidth: "320px", maxWidth: "460px" } },
					// WIDGET 1: Ask the Class Copilot
					h("div", {
						style: {
							background: T.card, border: "0.5px solid " + T.border, borderRadius: "12px",
							padding: "16px 18px"
						}
					},
						h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" } },
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
									flex: 1, padding: "8px 12px", background: T.field, border: "0.5px solid " + T.border,
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
									padding: "3px 8px", background: "rgba(255,255,255,0.04)", border: "0.5px solid " + T.borderLight,
									borderRadius: "6px", fontSize: "11px", color: T.labelSecondary, cursor: "pointer"
								}
							}, chip))
						),
						// AI Response Card
						ask ? h("div", {
							style: {
								marginTop: "12px", padding: "12px 14px", background: T.field,
								border: "0.5px solid " + T.border, borderRadius: "8px", fontSize: "13px", lineHeight: "20px"
							}
						},
							ask.error ? h("div", { style: { color: T.red } }, ask.error) :
								h("div", null,
									h("div", { style: { color: T.labelPrimary, whiteSpace: "pre-wrap" } }, ask.answer),
									h("div", { style: { fontSize: "11px", color: T.labelTertiary, marginTop: "6px", fontFamily: MONO } }, "Nguồn: " + (ask.source || "M5 Learner Model"))
								)
						) : null
					),

					// WIDGET 2: Graph-Reasoned Teaching Plan
					h("div", {
						style: {
							background: T.card, border: "0.5px solid " + T.border, borderRadius: "12px",
							padding: "16px 18px"
						}
					},
						h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" } },
							h("div", null,
								h("h3", { style: { margin: "0 0 2px", fontSize: "14px", fontWeight: 600, color: T.labelPrimary } }, "Kế hoạch bài giảng (Teaching Plan)"),
								h("p", { style: { margin: 0, fontSize: "12px", color: T.labelTertiary } }, "Suy luận thứ tự dạy mở khóa nhiều nhất")
							),
							h("span", {
								style: {
									padding: "2px 8px", background: T.greenSoft, color: T.green,
									borderRadius: "6px", fontSize: "11px", fontWeight: 600, fontFamily: MONO
								}
							}, "Graph-Reasoned")
						),
						plan.length === 0 ? h("div", { style: { textAlign: "center", padding: "16px", color: T.labelTertiary, fontSize: "13px" } }, "Lớp chưa có điểm nghẽn hoặc chưa có bài tập.") :
							h("div", { style: { display: "flex", flexDirection: "column", gap: "8px" } },
								plan.slice(0, 3).map((entry, idx) => {
									const node = nodeByUri[entry.conceptUri];
									const code = node ? (node.humanCodingScheme || node.human_coding_scheme) : "KCN";
									const label = node ? (node.fullStatement || node.full_statement || entry.conceptUri) : entry.conceptUri;
									const unlocksCount = entry.unlocks ? entry.unlocks.length : 0;

									return h("div", {
										key: entry.conceptUri,
										style: {
											padding: "10px 12px", background: T.field, border: "0.5px solid " + T.borderLight,
											borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px"
										}
									},
										h("div", { style: { flex: 1, minWidth: 0 } },
											h("div", { style: { display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" } },
												h("span", { style: { fontSize: "12px", fontWeight: 700, color: T.brand, fontFamily: MONO } }, (idx + 1) + ". [" + code + "]"),
												h("span", { style: { fontSize: "13px", fontWeight: 600, color: T.labelPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, label)
											),
											h("div", { style: { fontSize: "11px", color: T.labelTertiary, lineHeight: "15px", marginBottom: "4px" } }, entry.reason),
											h("div", { style: { display: "flex", gap: "6px", flexWrap: "wrap" } },
												entry.redCount > 0 ? h("span", { style: { padding: "1px 5px", borderRadius: "4px", fontSize: "10px", background: T.redSoft, color: T.red } }, entry.redCount + " em đỏ") : null,
												entry.rustyCount > 0 ? h("span", { style: { padding: "1px 5px", borderRadius: "4px", fontSize: "10px", background: T.rustySoft, color: T.rusty } }, entry.rustyCount + " em rusty") : null,
												h("span", { style: { padding: "1px 5px", borderRadius: "4px", fontSize: "10px", background: T.greenSoft, color: T.green } }, "Mở khóa " + unlocksCount + " bài")
											)
										),
										h("button", {
											onClick: () => {
												setAssignFor(entry.conceptUri);
												setAssignTitle("Ôn tập củng cố: [" + code + "] " + label);
											},
											style: {
												padding: "5px 10px", background: T.brand, color: "#fff",
												border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap"
											}
										}, "Giao ôn tập")
									);
								})
							)
					),

					// WIDGET 3: Student Roster List (Classroom Memory Pattern: click student to drill into Mastery Graph)
					h("div", {
						style: {
							background: T.card, border: "0.5px solid " + T.border, borderRadius: "12px",
							padding: "16px 18px"
						}
					},
						h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" } },
							h("div", null,
								h("h3", { style: { margin: "0 0 2px", fontSize: "14px", fontWeight: 600, color: T.labelPrimary } }, "Danh sách học sinh (Class Roster)"),
								h("p", { style: { margin: 0, fontSize: "11px", color: T.labelTertiary } }, "Chọn học sinh để hiển thị Bản đồ tri thức cá nhân")
							),
							activeStudentId ? h("button", {
								onClick: () => selectStudent(null),
								style: {
									padding: "3px 8px", background: "rgba(255,255,255,0.06)", border: "0.5px solid " + T.border,
									borderRadius: "6px", fontSize: "11px", color: T.labelSecondary, cursor: "pointer"
								}
							}, "Xem cả lớp") : null
						),
						!heatmap || !Array.isArray(heatmap.students) || heatmap.students.length === 0 ?
							h("div", { style: { textAlign: "center", padding: "16px", color: T.labelTertiary, fontSize: "12px" } }, "Chưa có danh sách sinh viên.") :
							h("div", { style: { display: "flex", flexDirection: "column", gap: "6px" } },
								heatmap.students.map(sid => {
									const isCurrent = activeStudentId === sid;
									const sName = nameBySid[sid] || sid.slice(0, 8);
									// compute student stats
									let sMastered = 0, sRed = 0, sRusty = 0, sTotal = (heatmap.concepts || []).length;
									(heatmap.concepts || []).forEach(cid => {
										const st = heatmap.cells && heatmap.cells[sid] ? heatmap.cells[sid][cid] : "none";
										if (st === "green") sMastered++;
										else if (st === "red") sRed++;
										else if (st === "rusty") sRusty++;
									});
									const sPct = sTotal > 0 ? Math.round((sMastered / sTotal) * 100) : 0;

									return h("div", {
										key: sid,
										onClick: () => selectStudent(isCurrent ? null : sid),
										style: {
											padding: "10px 12px", borderRadius: "8px", cursor: "pointer",
											background: isCurrent ? "rgba(253, 80, 90, 0.12)" : T.field,
											border: isCurrent ? "1px solid " + T.brand : "0.5px solid " + T.borderLight,
											display: "flex", justifyContent: "space-between", alignItems: "center",
											transition: "all 0.15s ease"
										}
									},
										h("div", { style: { minWidth: 0 } },
											h("div", { style: { fontSize: "13px", fontWeight: 600, color: isCurrent ? T.brand : T.labelPrimary } }, sName),
											h("div", { style: { fontSize: "11px", color: T.labelTertiary, display: "flex", gap: "8px", marginTop: "2px" } },
												h("span", { style: { color: T.green } }, sMastered + " vững"),
												sRed > 0 ? h("span", { style: { color: T.red } }, sRed + " hổng") : null,
												sRusty > 0 ? h("span", { style: { color: T.rusty } }, sRusty + " rusty") : null,
												h("span", null, sPct + "%")
											)
										),
										h("div", {
											style: {
												fontSize: "11px", fontWeight: 600, color: isCurrent ? T.brand : T.labelTertiary,
												display: "flex", alignItems: "center", gap: "4px"
											}
										}, isCurrent ? "Đang chọn ›" : "Xem đồ thị ›")
									);
								})
							)
					),

					// Targeted Intervention Modal/Drawer (when Assign is clicked)
					assignFor ? h("div", {
						style: {
							background: T.card, border: "1px solid " + T.brand, borderRadius: "12px",
							padding: "16px 18px"
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
									style: { width: "100%", padding: "8px 12px", background: T.field, border: "0.5px solid " + T.border, borderRadius: "6px", color: T.labelPrimary, fontSize: "13px", boxSizing: "border-box", outline: "none" }
								})
							),
							h("div", { style: { display: "flex", gap: "10px" } },
								h("div", { style: { flex: 1 } },
									h("label", { style: { display: "block", fontSize: "11px", color: T.labelTertiary, marginBottom: "4px" } }, "Nhóm học sinh đích"),
									h("select", {
										value: assignGroup, onChange: e => setAssignGroup(e.target.value),
										style: { width: "100%", padding: "8px 10px", background: T.field, border: "0.5px solid " + T.border, borderRadius: "6px", color: T.labelPrimary, fontSize: "13px", boxSizing: "border-box", outline: "none" }
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
										style: { width: "100%", padding: "8px 10px", background: T.field, border: "0.5px solid " + T.border, borderRadius: "6px", color: T.labelPrimary, fontSize: "13px", boxSizing: "border-box", outline: "none" }
									})
								)
							),
							h("div", { style: { display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "6px" } },
								h("button", { type: "button", onClick: () => setAssignFor(null), style: { padding: "6px 12px", background: "none", border: "0.5px solid " + T.border, borderRadius: "6px", color: T.labelSecondary, fontSize: "12px", cursor: "pointer" } }, "Đóng"),
								h("button", { type: "submit", disabled: assignBusy, style: { padding: "6px 14px", background: T.brand, border: "none", borderRadius: "6px", color: "#fff", fontSize: "12px", fontWeight: 500, cursor: assignBusy ? "not-allowed" : "pointer" } }, assignBusy ? "Đang giao..." : "Giao bài tập ngay")
							)
						)
					) : null
				),

				// RIGHT COLUMN: THE MASTERY GRAPH (The True Hero of the Dashboard)
				h("div", { style: { flex: "2 1 540px", display: "flex", flexDirection: "column", gap: "16px", minWidth: "360px" } },
					h("div", {
						style: {
							background: T.card, border: "0.5px solid " + T.border, borderRadius: "12px",
							padding: "18px 20px", display: "flex", flexDirection: "column", gap: "14px"
						}
					},
						// Graph Window Bar
						h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" } },
							h("div", { style: { display: "flex", alignItems: "center", gap: "10px" } },
								h("div", {
									style: {
										width: "10px", height: "10px", borderRadius: "50%",
										background: activeStudentId ? T.brand : "#38bdf8",
										boxShadow: activeStudentId ? "0 0 8px #fd505a" : "0 0 8px #38bdf8"
									}
								}),
								h("h3", { style: { margin: 0, fontSize: "15px", fontWeight: 600, color: T.labelPrimary } },
									activeStudentId ? activeStudentName + " · mastery graph" : "mastery graph · Bản đồ nhận thức cả lớp"
								),
								activeStudentId ? h("button", {
									onClick: () => selectStudent(null),
									style: {
										display: "inline-flex", alignItems: "center", gap: "4px",
										padding: "3px 8px", background: "rgba(255,255,255,0.06)", border: "0.5px solid " + T.border,
										borderRadius: "6px", fontSize: "11px", color: T.labelSecondary, cursor: "pointer"
									}
								}, Icons.ArrowLeft(12, "currentColor"), "Quay lại cả lớp") : null
							),

							// View Mode Switcher
							h("div", { style: { display: "flex", background: T.field, border: "0.5px solid " + T.borderLight, borderRadius: "8px", padding: "2px" } },
								h("button", {
									onClick: () => setGraphViewMode("graph"),
									style: {
										display: "inline-flex", alignItems: "center", gap: "6px",
										padding: "5px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 500,
										background: graphViewMode === "graph" ? "rgba(255,255,255,0.08)" : "transparent",
										color: graphViewMode === "graph" ? T.labelPrimary : T.labelTertiary,
										border: "none", cursor: "pointer"
									}
								}, Icons.Network(14, "currentColor"), "Đồ thị (Graph)"),
								h("button", {
									onClick: () => setGraphViewMode("table"),
									style: {
										display: "inline-flex", alignItems: "center", gap: "6px",
										padding: "5px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 500,
										background: graphViewMode === "table" ? "rgba(255,255,255,0.08)" : "transparent",
										color: graphViewMode === "table" ? T.labelPrimary : T.labelTertiary,
										border: "none", cursor: "pointer"
									}
								}, Icons.Table(14, "currentColor"), "Ma trận (Matrix)")
							)
						),

						// VIEW 1: THE INTERACTIVE SVG MASTERY GRAPH
						graphViewMode === "graph" ? h("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } },
							// Canvas Container
							h("div", {
								style: {
									width: "100%", background: "#131315", borderRadius: "10px",
									border: "0.5px solid rgba(255,255,255,0.06)", overflow: "hidden", position: "relative"
								}
							},
								h("svg", {
									viewBox: "0 0 860 440",
									style: { width: "100%", height: "auto", display: "block" }
								},
									// Arrowhead marker definitions
									h("defs", null,
										h("marker", {
											id: "arrow-default", viewBox: "0 0 10 10", refX: "28", refY: "5",
											markerWidth: "6", markerHeight: "6", orient: "auto-start-reverse"
										}, h("path", { d: "M 0 1.5 L 10 5 L 0 8.5 z", fill: "#45454b" })),
										h("marker", {
											id: "arrow-active", viewBox: "0 0 10 10", refX: "28", refY: "5",
											markerWidth: "7", markerHeight: "7", orient: "auto-start-reverse"
										}, h("path", { d: "M 0 1.5 L 10 5 L 0 8.5 z", fill: T.brand }))
									),

									// Background Grid / Connection Curves
									(graph.edges || []).map((edge, idx) => {
										const srcId = edge.sourceIdentifier || edge.source || edge.from;
										const tgtId = edge.targetIdentifier || edge.target || edge.to;
										const p1 = dagLayout.positions.get(srcId);
										const p2 = dagLayout.positions.get(tgtId);
										if (!p1 || !p2) return null;

										const isEdgeActive = selectedNodeUri && (srcId === selectedNodeUri || tgtId === selectedNodeUri);
										const midX = (p1.x + p2.x) / 2;
										const pathD = "M " + p1.x + " " + p1.y + " C " + midX + " " + p1.y + ", " + midX + " " + p2.y + ", " + p2.x + " " + p2.y;

										return h("path", {
											key: "edge-" + idx,
											d: pathD,
											fill: "none",
											stroke: isEdgeActive ? T.brand : "#38383e",
											strokeWidth: isEdgeActive ? "2.5" : "1.5",
											markerEnd: isEdgeActive ? "url(#arrow-active)" : "url(#arrow-default)",
											style: { transition: "stroke 0.2s, stroke-width 0.2s" }
										});
									}),

									// Graph Nodes
									(graph.nodes || []).map(node => {
										const id = node.identifier || node.id;
										const pos = dagLayout.positions.get(id);
										if (!pos) return null;

										const isSelected = selectedNodeUri === id;
										const isNext = activeStudentId && nextStepUri === id;

										// Calculate state
										let nodeState = "none";
										let centerText = "—";

										if (activeStudentId) {
											// Student View: exact student state
											nodeState = heatmap && heatmap.cells && heatmap.cells[activeStudentId] ? heatmap.cells[activeStudentId][id] : "none";
											if (nodeState === "green") centerText = "✓";
											else if (nodeState === "red") centerText = "!";
											else if (nodeState === "rusty") centerText = "◷";
											else if (nodeState === "amber") centerText = "…";
										} else {
											// Class View: aggregated class state
											let gCount = 0, rCount = 0, rustyCount = 0, total = (heatmap && heatmap.students ? heatmap.students.length : 0);
											if (heatmap && heatmap.cells && total > 0) {
												heatmap.students.forEach(sid => {
													const st = heatmap.cells[sid] ? heatmap.cells[sid][id] : "none";
													if (st === "green") gCount++;
													else if (st === "red") rCount++;
													else if (st === "rusty") rustyCount++;
												});
												if (rCount > 0) {
													nodeState = "red";
													centerText = rCount + " đỏ";
												} else if (rustyCount > 0) {
													nodeState = "rusty";
													centerText = rustyCount + " ôn";
												} else if (gCount === total && total > 0) {
													nodeState = "green";
													centerText = "100%";
												} else if (gCount > 0) {
													nodeState = "amber";
													centerText = Math.round((gCount / total) * 100) + "%";
												} else {
													nodeState = "none";
													centerText = "0%";
												}
											}
										}

										const chip = stateChip(nodeState);
										const code = node.humanCodingScheme || node.human_coding_scheme || "KCN";
										const statement = node.fullStatement || node.full_statement || node.title || id;
										const shortName = statement.split(/[(-–,]/)[0].trim().slice(0, 18);

										return h("g", {
											key: id,
											transform: "translate(" + pos.x + ", " + pos.y + ")",
											cursor: "pointer",
											onClick: () => setSelectedNodeUri(isSelected ? null : id)
										},
											// Next Step Pulsing Outer Halo
											isNext ? h("circle", {
												r: "30", fill: "none", stroke: T.brand, strokeWidth: "2",
												strokeDasharray: "4 2", opacity: "0.8"
											}) : null,

											// Selection Outer Ring
											isSelected ? h("circle", {
												r: "28", fill: "none", stroke: "#fff", strokeWidth: "2", opacity: "0.9"
											}) : null,

											// Main Circle
											h("circle", {
												r: "22",
												fill: chip.bg,
												stroke: chip.border,
												strokeWidth: nodeState === "rusty" ? "2" : "2.5",
												strokeDasharray: chip.dashed ? "4 2" : "none"
											}),

											// Center Status Text
											h("text", {
												textAnchor: "middle", dy: "4",
												fontSize: "10px", fontWeight: "700",
												fontFamily: MONO, fill: chip.fg
											}, centerText),

											// Top Code Scheme Tag
											h("text", {
												textAnchor: "middle", y: "-28",
												fontSize: "10px", fontWeight: "700",
												fontFamily: MONO, fill: isSelected ? T.brand : T.labelTertiary
											}, code),

											// Bottom Concept Name Label
											h("text", {
												textAnchor: "middle", y: "36",
												fontSize: "11px", fontWeight: "500",
												fill: isSelected ? T.labelPrimary : T.labelSecondary
											}, shortName),

											// "BƯỚC TIẾP THEO" Badge if AI recommended frontier
											isNext ? h("g", { transform: "translate(0, -42)" },
												h("rect", { x: "-38", y: "-8", width: "76", height: "16", rx: "4", fill: T.brand }),
												h("text", { textAnchor: "middle", y: "4", fontSize: "9px", fontWeight: "700", fill: "#fff" }, "TIẾP THEO")
											) : null
										);
									})
								)
							),

							// Graph Legend
							h("div", {
								style: {
									display: "flex", justifyContent: "space-between", alignItems: "center",
									flexWrap: "wrap", gap: "10px", padding: "6px 4px", fontSize: "11px", color: T.labelTertiary
								}
							},
								h("div", { style: { display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" } },
									h("span", { style: { display: "flex", alignItems: "center", gap: "4px" } },
										h("span", { style: { width: "8px", height: "8px", borderRadius: "50%", background: T.red } }), "Lỗ hổng (Gap / Đỏ)"
									),
									h("span", { style: { display: "flex", alignItems: "center", gap: "4px" } },
										h("span", { style: { width: "8px", height: "8px", borderRadius: "50%", background: T.amber } }), "Đang học / Hỗn hợp"
									),
									h("span", { style: { display: "flex", alignItems: "center", gap: "4px" } },
										h("span", { style: { width: "8px", height: "8px", borderRadius: "50%", background: T.green } }), "Đã nắm vững (Mastered)"
									),
									h("span", { style: { display: "flex", alignItems: "center", gap: "4px" } },
										h("span", { style: { width: "8px", height: "8px", borderRadius: "50%", border: "1px dashed " + T.rusty, background: "transparent" } }), "Mai một (Rusty / Cần ôn)"
									)
								),
								h("span", { style: { fontStyle: "italic" } }, "Mũi tên = Quan hệ tiên quyết · Nhấp vào nút để xem phân tích")
							),

							// CONCEPT INSPECTOR CARD (Shown when a node is clicked)
							selectedNodeInfo ? h("div", {
								style: {
									background: T.field, border: "1px solid " + T.border, borderRadius: "10px",
									padding: "16px 18px", display: "flex", flexDirection: "column", gap: "10px",
									animation: "fadeIn 0.2s ease"
								}
							},
								h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" } },
									h("div", null,
										h("div", { style: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" } },
											h("span", { style: { fontSize: "12px", fontWeight: 700, color: T.brand, fontFamily: MONO } }, selectedNodeInfo.code),
											selectedNodeInfo.studentState ? h(Chip, { state: selectedNodeInfo.studentState }) : null
										),
										h("h4", { style: { margin: 0, fontSize: "14px", fontWeight: 600, color: T.labelPrimary } }, selectedNodeInfo.title)
									),
									h("button", {
										onClick: () => setSelectedNodeUri(null),
										style: { background: "none", border: "none", color: T.labelTertiary, cursor: "pointer", padding: "4px" }
									}, Icons.X(14, "currentColor"))
								),

								// Prerequisites and Unlocks row
								h("div", { style: { display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "12px" } },
									h("div", { style: { flex: 1, minWidth: "200px" } },
										h("span", { style: { color: T.labelTertiary, display: "block", marginBottom: "2px" } }, "Điều kiện tiên quyết (Prerequisites):"),
										selectedNodeInfo.prereqs.length === 0 ?
											h("span", { style: { color: T.green } }, "Khái niệm khởi đầu (Không cần tiên quyết)") :
											h("div", { style: { display: "flex", gap: "4px", flexWrap: "wrap" } },
												selectedNodeInfo.prereqs.map(p => h("span", {
													key: p.identifier,
													style: { padding: "2px 6px", background: "rgba(255,255,255,0.05)", borderRadius: "4px", fontFamily: MONO }
												}, p.humanCodingScheme || p.identifier.slice(-8)))
											)
									),
									h("div", { style: { flex: 1, minWidth: "200px" } },
										h("span", { style: { color: T.labelTertiary, display: "block", marginBottom: "2px" } }, "Mở khóa tiếp theo (Unlocks):"),
										selectedNodeInfo.unlocks.length === 0 ?
											h("span", { style: { color: T.labelTertiary } }, "Chuẩn đầu ra đích môn học") :
											h("div", { style: { display: "flex", gap: "4px", flexWrap: "wrap" } },
												selectedNodeInfo.unlocks.map(u => h("span", {
													key: u.identifier,
													style: { padding: "2px 6px", background: "rgba(255,255,255,0.05)", borderRadius: "4px", fontFamily: MONO, color: T.green }
												}, u.humanCodingScheme || u.identifier.slice(-8)))
											)
									)
								),

								// Student cohort breakdown
								selectedNodeInfo.redStudents.length > 0 || selectedNodeInfo.rustyStudents.length > 0 ? h("div", {
									style: { fontSize: "12px", background: "rgba(0,0,0,0.2)", padding: "8px 12px", borderRadius: "6px" }
								},
									selectedNodeInfo.redStudents.length > 0 ? h("div", { style: { color: T.red, marginBottom: "2px" } },
										"● " + selectedNodeInfo.redStudents.length + " học sinh đang bị đỏ: " + selectedNodeInfo.redStudents.join(", ")
									) : null,
									selectedNodeInfo.rustyStudents.length > 0 ? h("div", { style: { color: T.rusty } },
										"● " + selectedNodeInfo.rustyStudents.length + " học sinh bị mai một kiến thức: " + selectedNodeInfo.rustyStudents.join(", ")
									) : null
								) : null,

								// Action
								h("div", { style: { display: "flex", justifyContent: "flex-end", marginTop: "4px" } },
									h("button", {
										onClick: () => {
											setAssignFor(selectedNodeInfo.uri);
											setAssignTitle("Ôn tập củng cố: [" + selectedNodeInfo.code + "] " + selectedNodeInfo.title);
										},
										style: {
											padding: "6px 14px", background: T.brand, color: "#fff",
											border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 500, cursor: "pointer"
										}
									}, "Giao bài tập củng cố cho nhóm này")
								)
							) : null
						) :

						// VIEW 2: COMPACT CLEAN MATRIX TABLE (Secondary View)
						h("div", { style: { overflowX: "auto", border: "0.5px solid " + T.borderLight, borderRadius: "8px" } },
							h("table", { style: { width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12px" } },
								h("thead", null,
									h("tr", { style: { background: T.field, borderBottom: "0.5px solid " + T.border } },
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
									(heatmap.students || []).map(sid => {
										const isSelected = activeStudentId === sid;
										return h("tr", {
											key: sid,
											style: {
												borderBottom: "0.5px solid " + T.borderLight,
												background: isSelected ? "rgba(253, 80, 90, 0.08)" : "transparent"
											}
										},
											h("td", { style: { padding: "10px 14px", verticalAlign: "middle" } },
												h("button", {
													onClick: () => selectStudent(sid),
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
					)
				)
			)
		);
	}

	exports.Panel = Panel;
	return exports;
}});
