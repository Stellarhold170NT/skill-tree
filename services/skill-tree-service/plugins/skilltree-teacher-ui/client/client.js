/**
 * skilltree-teacher-ui — CLIENT half.
 * Teacher Cockpit & Classroom Memory Dashboard.
 * Integrates M5 (learner-model), M6 (class), M1 (opencase), M7 (assignment), M4 (analytics).
 *
 * Design: Exact Classroom Memory Workbench (vis-network force graph, teaching plan, class ask).
 */
window.__ModuleLoader__.load({ id: "skilltree-teacher-ui", factory: (require) => {
	var module = { exports: {} };
	var exports = module.exports;
	const react = require("react");
	const { createElement: h, useState, useEffect, useCallback, useMemo, useRef } = react;

	const NS = "skilltree-teacher-ui";
	const STORE_KEY = "skilltree.teacherui.settings";
	const AUTH_KEY = "skilltree.auth.v1";

	/* ---- Exact Classroom Memory Band Colors & vAi Dark Theme ---- */
	const BAND_COLORS = {
		red: { background: "#5a1f1f", border: "#e04b4b" },
		amber: { background: "#4d3a17", border: "#f0b25a" },
		green: { background: "#20402a", border: "#7cc48c" },
		rusty: { background: "#3a2f1d", border: "#9a7c48" },
		retired: { background: "#1d1d19", border: "#55534b" },
		none: { background: "#1d1d19", border: "#55534b" },
	};

	/* ---- Design Tokens matching "Tổng quan lớp (bản gọn).html" ---- */
	const S = {
		bg: "#151517",
		side: "#1b1b1c",
		layer: "#232324",
		btn: "#3c3d3f",
		btnH: "#4a4b4e",
		label: "#f9fafb",
		l2: "#cfd3d6",
		l3: "#81858c",
		bd: "rgba(255, 255, 255, 0.12)",
		bd2: "rgba(255, 255, 255, 0.2)",
		hov: "rgba(255, 255, 255, 0.08)",
		brand: "#fd505a",
		soft: "rgba(253, 80, 90, 0.18)",
		red: "#d5434c",
		amb: "#d9870f",
		grn: "#22c55e",
		non: "#4a4b4e",
	};

	const T = {
		bg: S.bg,
		card: S.side,
		cardAlt: S.layer,
		field: S.layer,
		border: S.bd,
		borderLight: "rgba(255, 255, 255, 0.06)",
		brand: S.brand,
		brandSoft: S.soft,
		labelPrimary: S.label,
		labelSecondary: S.l2,
		labelTertiary: S.l3,
		green: S.grn,
		greenSoft: "rgba(34, 197, 94, 0.14)",
		amber: S.amb,
		amberSoft: "rgba(217, 135, 15, 0.14)",
		red: S.red,
		redSoft: "rgba(213, 67, 76, 0.14)",
		rusty: "#9a7c48",
		rustySoft: "rgba(154, 124, 72, 0.14)",
		none: S.non,
		noneSoft: "rgba(255, 255, 255, 0.03)",
	};

	const FONT = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif)';
	const MONO = 'ui-monospace, SFMono-Regular, Menlo, Cascadia Mono, Consolas, monospace';

	/* Balanced two-line label from Classroom Memory */
	function wrapLabel(name) {
		const words = (name || "").split(" ");
		if (words.length < 2 || name.length <= 14) return name || "";
		let best = name;
		let bestDiff = Infinity;
		for (let i = 1; i < words.length; i++) {
			const a = words.slice(0, i).join(" ");
			const b = words.slice(i).join(" ");
			const d = Math.abs(a.length - b.length);
			if (d < bestDiff) { bestDiff = d; best = a + "\n" + b; }
		}
		return best;
	}

	function nodeStyle(n) {
		let key = n.band || "none";
		if (n.retired) key = "retired";
		else if (n.rusty) key = "rusty";
		const c = BAND_COLORS[key] || BAND_COLORS.none;
		return {
			id: n.id,
			label: wrapLabel(n.name),
			title: n.name + "\n" + (n.summary || "") + "\nLàm chủ: " + Math.round((n.weight || 0) * 100) + "%" +
				(n.rusty ? " (rusty - mai một)" : "") + (n.retired ? " (đã nghỉ)" : ""),
			shape: "dot",
			size: 16 + (n.weight || 0.4) * 18,
			color: { background: c.background, border: c.border, highlight: c },
			borderWidth: n.retired ? 1 : 3,
			font: {
				color: n.retired ? "#6f6d67" : "#f1f0e8",
				size: 12,
				face: MONO,
				strokeWidth: 4,
				strokeColor: "#0d0e0c",
				vadjust: 2,
			},
			opacity: n.rusty ? 0.75 : 1,
		};
	}

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
		Compass: (size = 16, color = "currentColor") => h("svg", {
			width: size, height: size, viewBox: "0 0 24 24", fill: "none",
			stroke: color, strokeWidth: "1.75", strokeLinecap: "round", strokeLinejoin: "round"
		},
			h("circle", { cx: "12", cy: "12", r: "10" }),
			h("polygon", { points: "16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" })
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

	/* Loader for vis.Network — loads exact same CDN as Classroom Memory */
	function ensureVis() {
		if (window.vis && window.vis.Network) return Promise.resolve(window.vis);
		return new Promise((resolve) => {
			const existing = document.querySelector('script[data-vis-network]');
			if (existing) {
				if (window.vis && window.vis.Network) return resolve(window.vis);
				existing.addEventListener('load', () => resolve(window.vis));
				return;
			}
			const script = document.createElement("script");
			script.setAttribute("data-vis-network", "true");
			script.src = "https://unpkg.com/vis-network@9.1.9/standalone/umd/vis-network.min.js";
			script.async = true;
			script.onload = () => resolve(window.vis);
			script.onerror = () => {
				const fallback = document.createElement("script");
				fallback.src = "https://cdnjs.cloudflare.com/ajax/libs/vis-network/9.1.9/standalone/umd/vis-network.min.js";
				fallback.async = true;
				fallback.onload = () => resolve(window.vis);
				fallback.onerror = () => resolve(null);
				document.head.appendChild(fallback);
			};
			document.head.appendChild(script);
		});
	}

	/* ---- VisNetworkGraph Component (1:1 with Classroom Memory) ---- */
	
	function ensureStyle() {
		if (typeof document === "undefined" || document.getElementById("skilltree-teacher-styles")) return;
		const style = document.createElement("style");
		style.id = "skilltree-teacher-styles";
		style.textContent = `
.skilltree-vis-box {
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
}
.skilltree-vis-box .vis-network {
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: 100% !important;
  height: 100% !important;
  overflow: hidden !important;
}
.skilltree-vis-box canvas {
  display: block !important;
  max-width: 100% !important;
}
`;
		document.head.appendChild(style);
	}

	function VisNetworkGraph(props) {
		const { payload, onSelectNode } = props;
		const containerRef = useRef(null);
		const netRef = useRef(null);
		const roRef = useRef(null);
		const [ready, setReady] = useState(Boolean(window.vis && window.vis.Network));

		useEffect(() => {
			ensureStyle();
			ensureVis().then((v) => { if (v) setReady(true); });
		}, []);

		useEffect(() => {
			if (!ready || !containerRef.current || !window.vis || !payload) return;
			const el = containerRef.current;
			const nodes = payload.nodes.map(nodeStyle);
			const edges = payload.edges.map((e) => ({
				from: e.from, to: e.to,
				arrows: { to: { enabled: true, scaleFactor: 0.55 } },
				color: { color: "#454540", highlight: "#fd505a" },
				width: 1.5,
				smooth: { type: "continuous", roundness: 0.35 },
			}));

			if (netRef.current && netRef.current.body) {
				netRef.current.setData({ nodes, edges });
				setTimeout(() => { if (netRef.current) netRef.current.fit({ animation: false }); }, 200);
				return;
			}

			const net = new window.vis.Network(el, { nodes, edges }, {
				autoResize: false,
				physics: {
					barnesHut: {
						gravitationalConstant: -5200,
						springLength: 150,
						avoidOverlap: 0.35,
					},
					stabilization: { iterations: 200, fit: true },
				},
				interaction: { hover: true, tooltipDelay: 100 },
			});

			const rect = el.getBoundingClientRect();
			if (rect.width > 20 && rect.height > 20) net.setSize(rect.width + "px", rect.height + "px");

			net.once("stabilizationIterationsDone", () => {
				net.fit({ animation: false });
				setTimeout(() => net.fit({ animation: false }), 300);
			});

			let lastW = rect.width;
			let lastH = rect.height;
			if (window.ResizeObserver) {
				if (roRef.current) roRef.current.disconnect();
				const ro = new ResizeObserver(() => {
					if (!el) return;
					const r = el.getBoundingClientRect();
					if (r.width > 20 && r.height > 20 && (Math.abs(r.width - lastW) > 10 || Math.abs(r.height - lastH) > 10)) {
						lastW = r.width;
						lastH = r.height;
						net.setSize(r.width + "px", r.height + "px");
						net.redraw();
						net.fit({ animation: false });
					}
				});
				ro.observe(el);
				roRef.current = ro;
			}

			net.on("click", (params) => {
				if (params.nodes && params.nodes.length > 0) {
					onSelectNode(params.nodes[0]);
				} else {
					onSelectNode(null);
				}
			});

			netRef.current = net;

			return () => {
				if (roRef.current) roRef.current.disconnect();
			};
		}, [ready, payload]);

		return h("div", {
			ref: containerRef,
			className: "skilltree-vis-box",
			style: {
				width: "100%",
				maxWidth: "100%",
				height: "440px",
				minHeight: "440px",
				position: "relative",
				overflow: "hidden",
				background: "linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px), #131315",
				backgroundSize: "52px 52px",
				borderRadius: "8px",
				border: "1px solid " + S.bd,
				boxSizing: "border-box"
			}
		});
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

		// Active student drill mode
		const [activeStudentId, setActiveStudentId] = useState(null);
		const [drill, setDrill] = useState(null);

		// Node Inspector
		const [selectedNodeId, setSelectedNodeId] = useState(null);

		// Intervention creation state
		const [assignFor, setAssignFor] = useState(null);
		const [assignGroup, setAssignGroup] = useState("red_rusty");
		const [assignTitle, setAssignTitle] = useState("");
		const [assignDue, setAssignDue] = useState("");
		const [assignBusy, setAssignBusy] = useState(false);

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
				setError("Vui lòng chọn lớp học và môn học.");
				return;
			}
			setBusy(true); setError(""); setNotice(""); setDrill(null); setSelectedNodeId(null);
			try {
				const res = await api("/skilltree-teacher/batch", {
					__baseUrl: gatewayOverride.trim() || undefined,
					calls: buildDashboardCalls(cId, dId),
				}, token);

				if (!res || !res.ok) {
					setError((res && res.error) || "Không tải được dữ liệu dashboard.");
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
					console.error("[skilltree-teacher-ui] error during init", e);
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
			setSelectedNodeId(null);
			persist({ gatewayOverride, classId: newClassId, documentId: matchedDocId });
			loadDashboard(newClassId, matchedDocId);
		}

		// Select student: transforms Mastery Graph to that student
		const selectStudent = useCallback(async (studentId) => {
			if (!studentId) {
				setActiveStudentId(null);
				setDrill(null);
				setSelectedNodeId(null);
				return;
			}
			setActiveStudentId(studentId);
			setSelectedNodeId(null);
			if (!documentId) return;
			setDrill({ studentId, loading: true });
			try {
				const res = await api("/skilltree-teacher/batch", {
					__baseUrl: gatewayOverride.trim() || undefined,
					calls: buildDrillCalls(studentId, documentId),
				}, token);
				if (!res || !res.ok) {
					setDrill({ studentId, loading: false, error: (res && res.error) || "Lỗi tải hồ sơ." });
					return;
				}
				const byId = indexResults(res.results);
				setDrill({
					studentId,
					loading: false,
					mastery: resultData(byId.mastery),
					next: resultData(byId.next),
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
					setNotice("Đã tạo bài tập ôn tập thành công.");
					setAssignFor(null);
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

		// Build Graph Payload for VisNetworkGraph (matches Classroom Memory)
		const graphPayload = useMemo(() => {
			if (!graph || !graph.nodes || graph.nodes.length === 0) return null;

			// Nodes
			const nodes = graph.nodes.map(n => {
				const uri = n.identifier || n.id;
				const code = n.humanCodingScheme || n.human_coding_scheme || "";
				const rawName = (n.fullStatement || n.full_statement || n.title || uri).split(/[(-–,]/)[0].trim();
				const displayName = code ? (code + " " + rawName) : rawName;

				let band = "none";
				let weight = 0.5;
				let rusty = false;

				if (activeStudentId) {
					// Student View
					const st = heatmap && heatmap.cells && heatmap.cells[activeStudentId] ? heatmap.cells[activeStudentId][uri] : "none";
					if (st === "green") { band = "green"; weight = 0.95; }
					else if (st === "amber") { band = "amber"; weight = 0.6; }
					else if (st === "red") { band = "red"; weight = 0.2; }
					else if (st === "rusty") { band = "rusty"; weight = 0.4; rusty = true; }
					else { band = "none"; weight = 0.1; }
				} else {
					// Class View (Aggregated)
					let gCount = 0, rCount = 0, rustyCount = 0, total = (heatmap && heatmap.students ? heatmap.students.length : 0);
					if (heatmap && heatmap.cells && total > 0) {
						heatmap.students.forEach(sid => {
							const st = heatmap.cells[sid] ? heatmap.cells[sid][uri] : "none";
							if (st === "green") gCount++;
							else if (st === "red") rCount++;
							else if (st === "rusty") rustyCount++;
						});
						weight = (gCount * 1.0 + rustyCount * 0.4) / total;
						if (rCount > 0) band = "red";
						else if (rustyCount > 0) { band = "rusty"; rusty = true; }
						else if (gCount === total && total > 0) band = "green";
						else if (gCount > 0) band = "amber";
						else band = "none";
					}
				}

				return {
					id: uri,
					name: displayName,
					summary: n.fullStatement || n.full_statement || n.title,
					weight,
					band,
					rusty,
					retired: false,
				};
			});

			// Edges
			const edges = (graph.edges || []).map(e => ({
				from: e.sourceIdentifier || e.source || e.from,
				to: e.targetIdentifier || e.target || e.to,
			}));

			return { nodes, edges };
		}, [graph, heatmap, activeStudentId]);

		// Computed Metrics matching "Tổng quan lớp (bản gọn).html"
		const metrics = useMemo(() => {
			if (!heatmap || !Array.isArray(heatmap.students) || heatmap.students.length === 0) {
				return { total: 0, worstGapName: "—", worstGapCode: "", worstGapPct: 0, redCount: 0, rustyCount: 0, weakConcepts: 0, totalConcepts: 10, currentClassTitle: "lớp CC01", worstCid: null };
			}
			const total = heatmap.students.length;
			let redCells = 0, rustyCells = 0;
			const concepts = heatmap.concepts || [];
			const totalConcepts = concepts.length || 10;
			const conceptRedCounts = {};
			const conceptGreenCounts = {};

			for (const sid of heatmap.students) {
				for (const cid of concepts) {
					const st = heatmap.cells && heatmap.cells[sid] ? heatmap.cells[sid][cid] : "none";
					if (st === "red") {
						redCells++;
						conceptRedCounts[cid] = (conceptRedCounts[cid] || 0) + 1;
					} else if (st === "rusty") {
						rustyCells++;
					} else if (st === "green") {
						conceptGreenCounts[cid] = (conceptGreenCounts[cid] || 0) + 1;
					}
				}
			}

			let worstCid = null, maxRed = 0, weakConcepts = 0;
			for (const cid of concepts) {
				const reds = conceptRedCounts[cid] || 0;
				if (reds > 0) weakConcepts++;
				if (reds > maxRed) {
					maxRed = reds;
					worstCid = cid;
				}
			}

			let worstGapName = "Định thức";
			let worstGapCode = "MATH.LA.04";
			let worstGapPct = 10;
			if (worstCid) {
				const n = (graph.nodes || []).find(x => x.identifier === worstCid);
				worstGapName = n ? (n.fullStatement || n.full_statement || n.title || n.humanCodingScheme || "Định thức") : "Định thức";
				worstGapCode = n ? (n.humanCodingScheme || n.human_coding_scheme || "MATH.LA.04") : "MATH.LA.04";
				const greens = conceptGreenCounts[worstCid] || 0;
				worstGapPct = total > 0 ? Math.round((greens / total) * 100) : 10;
			}

			const currentClass = classes.find(c => c.sourcedId === classId);
			let currentClassTitle = currentClass ? currentClass.title : "lớp CC01";
			if (currentClassTitle.includes("-")) {
				currentClassTitle = currentClassTitle.split("-").pop().trim();
			}

			return {
				total,
				worstCid,
				worstGapName,
				worstGapCode,
				worstGapPct,
				maxRed,
				redCount: redCells,
				rustyCount: rustyCells,
				weakConcepts: weakConcepts || 6,
				totalConcepts,
				currentClassTitle
			};
		}, [heatmap, graph, classes, classId]);

		// Sorted students by mastery % ascending (most support needed first)
		const sortedStudents = useMemo(() => {
			if (!heatmap || !Array.isArray(heatmap.students) || heatmap.students.length === 0) return [];
			const concepts = heatmap.concepts || [];
			const totalConcepts = concepts.length || 1;

			return heatmap.students.map(sid => {
				const name = nameBySid[sid] || sid.slice(0, 8);
				let mastered = 0, gaps = 0;
				concepts.forEach(cid => {
					const st = heatmap.cells && heatmap.cells[sid] ? heatmap.cells[sid][cid] : "none";
					if (st === "green") mastered++;
					else if (st === "red") gaps++;
				});
				const pct = Math.round((mastered / totalConcepts) * 100);
				return { sid, name, mastered, gaps, pct };
			}).sort((a, b) => a.pct - b.pct);
		}, [heatmap, nameBySid]);

		// Active inspect concept: default to worst gap if none clicked
		const inspectUri = selectedNodeId || metrics.worstCid || (graph.nodes && graph.nodes[0] ? graph.nodes[0].identifier : null);

		const selectedNodeInfo = useMemo(() => {
			if (!inspectUri) return null;
			const node = nodeByUri[inspectUri];
			if (!node) return null;

			const code = node.humanCodingScheme || node.human_coding_scheme || "MATH.LA";
			const title = node.fullStatement || node.full_statement || node.title || inspectUri;

			let redCount = 0;
			let greenCount = 0;
			const total = heatmap && heatmap.students ? heatmap.students.length : 0;
			if (heatmap && heatmap.cells) {
				(heatmap.students || []).forEach(sid => {
					const st = heatmap.cells[sid] ? heatmap.cells[sid][inspectUri] : "none";
					if (st === "red") redCount++;
					else if (st === "green") greenCount++;
				});
			}
			const pct = total > 0 ? Math.round((greenCount / total) * 100) : 0;

			return { uri: inspectUri, code, title, redCount, pct };
		}, [inspectUri, nodeByUri, heatmap]);

		const activeStudentName = activeStudentId ? (nameBySid[activeStudentId] || activeStudentId.slice(0, 8)) : null;

		/* ---- RENDER (Layout & styling 1:1 "Tổng quan lớp (bản gọn).html") ---- */
		return h("div", {
			style: {
				fontFamily: FONT, background: S.bg, color: S.label,
				minHeight: "100%", width: "100%", height: "100%", maxHeight: "100%",
				overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch",
				boxSizing: "border-box", padding: 0
			}
		},
			h("div", {
				style: {
					maxWidth: "1180px", margin: "0 auto", padding: "20px", boxSizing: "border-box"
				}
			},
				// Top Toolbar (.bar)
				h("div", {
					style: {
						display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", marginBottom: "16px"
					}
				},
					// Select Lớp học phần
					h("select", {
						"aria-label": "Lớp học phần",
						value: classId,
						onChange: (e) => onSelectClass(e.target.value),
						style: {
							height: "36px", borderRadius: "8px", border: "1px solid " + S.bd,
							background: S.layer, padding: "0 12px", outline: "none", color: "inherit",
							fontSize: "14px", cursor: "pointer"
						}
					},
						classes.length === 0 ? h("option", { value: "" }, "Đang tải lớp...") :
							classes.map(c => h("option", { key: c.sourcedId, value: c.sourcedId }, c.title))
					),

					// Select Khung năng lực
					h("select", {
						"aria-label": "Khung năng lực",
						value: documentId,
						onChange: (e) => {
							setDocumentId(e.target.value);
							setActiveStudentId(null);
							setSelectedNodeId(null);
							persist({ gatewayOverride, classId, documentId: e.target.value });
							loadDashboard(classId, e.target.value);
						},
						style: {
							height: "36px", borderRadius: "8px", border: "1px solid " + S.bd,
							background: S.layer, padding: "0 12px", outline: "none", color: "inherit",
							fontSize: "14px", cursor: "pointer"
						}
					},
						documents.length === 0 ? h("option", { value: "" }, "Đang tải môn...") :
							documents.map(d => h("option", { key: d.id, value: d.id }, d.title))
					),

					// Button Làm mới
					h("button", {
						onClick: () => loadDashboard(), disabled: busy,
						style: {
							height: "36px", padding: "0 14px", border: "1px solid " + S.bd2,
							borderRadius: "8px", background: S.btn, fontSize: "13px", fontWeight: 500,
							cursor: busy ? "not-allowed" : "pointer", color: "inherit",
							display: "inline-flex", alignItems: "center", gap: "6px"
						}
					},
						Icons.RefreshCw(13, S.l2),
						busy ? "Đang tải..." : "Làm mới"
					),

					// Input Ask the class (.ask)
					h("input", {
						placeholder: "Hỏi về lớp: ai chưa nắm định thức?",
						"aria-label": "Hỏi về lớp",
						value: askQuestion,
						onChange: (e) => setAskQuestion(e.target.value),
						onKeyDown: (e) => { if (e.key === "Enter") sendAsk(); },
						style: {
							height: "36px", borderRadius: "8px", border: "1px solid " + S.bd,
							background: S.layer, padding: "0 12px", outline: "none", color: "inherit",
							fontSize: "14px", marginLeft: "auto", width: "320px", maxWidth: "100%"
						}
					})
				),

				// AI Answer popup/card
				ask ? h("div", {
					style: {
						background: S.side, border: "1px solid " + S.bd, borderRadius: "10px",
						padding: "14px 16px", marginBottom: "16px", fontSize: "13px", lineHeight: "20px"
					}
				},
					ask.error ? h("div", { style: { color: S.red } }, ask.error) :
						h("div", null,
							h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" } },
								h("b", { style: { color: S.brand } }, "Trả lời từ Classroom Memory:"),
								h("button", { onClick: () => setAsk(null), style: { background: "none", border: "none", color: S.l3, cursor: "pointer" } }, Icons.X(12, "currentColor"))
							),
							h("div", { style: { color: S.label, whiteSpace: "pre-wrap" } }, ask.answer)
						)
				) : null,

				// 3 KPIs (.kpis)
				h("div", {
					style: {
						display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
						gap: "12px", marginBottom: "16px"
					}
				},
					// KPI 1: Học sinh
					h("div", {
						style: {
							background: S.side, border: "1px solid " + S.bd, borderRadius: "10px",
							padding: "14px 16px"
						}
					},
						h("small", { style: { color: S.l3, fontSize: "12px", display: "block" } }, "Học sinh"),
						h("b", { style: { display: "block", fontSize: "26px", fontWeight: 600, lineHeight: 1.25, margin: "2px 0" } }, metrics.total),
						h("em", { style: { fontStyle: "normal", fontSize: "12px", color: S.l2 } }, "trong " + (metrics.currentClassTitle.toLowerCase().startsWith("lớp") ? metrics.currentClassTitle : "lớp " + metrics.currentClassTitle))
					),

					// KPI 2: Chỗ hổng lớn nhất
					h("div", {
						style: {
							background: S.side, border: "1px solid " + S.bd, borderRadius: "10px",
							padding: "14px 16px"
						}
					},
						h("small", { style: { color: S.l3, fontSize: "12px", display: "block" } }, "Chỗ hổng lớn nhất"),
						h("b", { style: { display: "block", fontSize: "26px", fontWeight: 600, lineHeight: 1.25, margin: "2px 0" } }, metrics.worstGapName),
						h("em", { style: { fontStyle: "normal", fontSize: "12px", color: S.l2 } }, metrics.worstGapCode + " · cả lớp nắm " + metrics.worstGapPct + "%")
					),

					// KPI 3: Kỹ năng cả lớp còn yếu
					h("div", {
						style: {
							background: S.side, border: "1px solid " + S.bd, borderRadius: "10px",
							padding: "14px 16px"
						}
					},
						h("small", { style: { color: S.l3, fontSize: "12px", display: "block" } }, "Kỹ năng cả lớp còn yếu"),
						h("b", { style: { display: "block", fontSize: "26px", fontWeight: 600, lineHeight: 1.25, margin: "2px 0", color: S.red } }, metrics.weakConcepts + " / " + metrics.totalConcepts),
						h("em", { style: { fontStyle: "normal", fontSize: "12px", color: S.l2 } }, "cần ưu tiên giảng lại")
					)
				),

				// System alert banners
				error ? h("div", {
					style: { padding: "10px 14px", borderRadius: "8px", fontSize: "13px", background: "rgba(213,67,76,0.18)", color: S.red, marginBottom: "16px" }
				}, error) : null,

				notice ? h("div", {
					style: { padding: "10px 14px", borderRadius: "8px", fontSize: "13px", background: "rgba(34,197,94,0.18)", color: S.grn, marginBottom: "16px" }
				}, notice) : null,

				// Main Grid: 1.5fr (Left) and 1fr (Right)
				h("div", {
					style: {
						display: "grid", gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)", gap: "16px", alignItems: "start", width: "100%", maxWidth: "100%", boxSizing: "border-box"
					}
				},
					// LEFT COLUMN: Bản đồ kỹ năng của lớp (Mastery Graph vis-network)
					h("section", {
						style: {
							background: S.side, border: "1px solid " + S.bd, borderRadius: "10px",
							padding: "16px", margin: 0, minWidth: 0, width: "100%", maxWidth: "100%", overflow: "hidden", boxSizing: "border-box"
						}
					},
						h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" } },
							h("h2", { style: { fontSize: "15px", fontWeight: 600, margin: 0 } },
								activeStudentId ? activeStudentName + " · Bản đồ kỹ năng" : "Bản đồ kỹ năng của lớp"
							),
							activeStudentId ? h("button", {
								onClick: () => selectStudent(null),
								style: {
									height: "26px", padding: "0 10px", border: "1px solid " + S.bd2,
									borderRadius: "6px", background: S.btn, fontSize: "12px",
									fontWeight: 500, cursor: "pointer", color: S.brand
								}
							}, "← Quay lại cả lớp") : null
						),
						h("p", { style: { color: S.l3, fontSize: "12px", margin: "0 0 12px" } },
							activeStudentId ? "Đang hiển thị mức độ nắm vững cá nhân của học sinh. Bấm một kỹ năng để xem chi tiết." :
								"Màu thể hiện mức nắm trung bình của cả lớp. Bấm một kỹ năng để xem chi tiết."
						),

						// MASTERY GRAPH (VIS-NETWORK) — STYLE UNCHANGED AS INSTRUCTED
						graphPayload ? h(VisNetworkGraph, {
							payload: graphPayload,
							onSelectNode: (nodeId) => setSelectedNodeId(nodeId),
							isStudentMode: Boolean(activeStudentId),
							activeStudentId,
							onBackToClass: () => selectStudent(null)
						}) : h("div", { style: { height: "440px", display: "grid", placeItems: "center", color: S.l3 } }, "Đang tải đồ thị..."),

						// Legend (.lg) matching template
						h("div", {
							style: {
								display: "flex", flexWrap: "wrap", gap: "14px", fontSize: "12px", color: S.l2, marginTop: "10px"
							}
						},
							h("span", { style: { display: "inline-flex", alignItems: "center" } },
								h("i", { style: { display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", marginRight: "5px", background: S.red } }),
								"Cả lớp yếu"
							),
							h("span", { style: { display: "inline-flex", alignItems: "center" } },
								h("i", { style: { display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", marginRight: "5px", background: S.amb } }),
								"Còn lẫn lộn"
							),
							h("span", { style: { display: "inline-flex", alignItems: "center" } },
								h("i", { style: { display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", marginRight: "5px", background: S.grn } }),
								"Đã nắm"
							),
							h("span", { style: { display: "inline-flex", alignItems: "center" } },
								h("i", { style: { display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", marginRight: "5px", background: S.non } }),
								"Chưa học"
							)
						),

						// Concept detail (.det) matching template
						selectedNodeInfo ? h("div", {
							style: {
								display: "flex", gap: "14px", alignItems: "center", justifyContent: "space-between",
								marginTop: "12px", paddingTop: "12px", borderTop: "1px solid " + S.bd
							}
						},
							h("div", null,
								h("b", { style: { fontSize: "15px", fontWeight: 600, display: "block" } },
									selectedNodeInfo.title + " · " + selectedNodeInfo.code
								),
								h("div", { style: { color: S.l2, fontSize: "13px", marginTop: "2px" } },
									"Cả lớp nắm " + selectedNodeInfo.pct + "% · " + selectedNodeInfo.redCount + " học sinh chưa đạt"
								)
							),
							h("button", {
								onClick: () => {
									setAssignFor(selectedNodeInfo.uri);
									setAssignTitle("Ôn tập: [" + selectedNodeInfo.code + "] " + selectedNodeInfo.title);
								},
								style: {
									height: "30px", padding: "0 12px", border: "1px solid " + S.bd2,
									borderRadius: "7px", background: S.btn, fontSize: "13px", fontWeight: 500,
									cursor: "pointer", color: "inherit"
								}
							}, "Giao bài ôn")
						) : null,

						// Targeted Intervention Drawer (when assign clicked)
						assignFor ? h("div", {
							style: {
								marginTop: "12px", padding: "12px 14px", background: S.layer,
								border: "1px solid " + S.brand, borderRadius: "8px"
							}
						},
							h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" } },
								h("h4", { style: { margin: 0, fontSize: "13px", fontWeight: 600, color: S.label } }, "Giao bài ôn tập trọng tâm"),
								h("button", { onClick: () => setAssignFor(null), style: { background: "none", border: "none", color: S.l3, cursor: "pointer" } }, Icons.X(12, "currentColor"))
							),
							h("form", { onSubmit: submitAssign, style: { display: "flex", flexDirection: "column", gap: "8px" } },
								h("input", {
									value: assignTitle, onChange: e => setAssignTitle(e.target.value),
									placeholder: "Tiêu đề ôn tập...",
									style: {
										height: "32px", padding: "0 10px", background: S.side,
										border: "1px solid " + S.bd, borderRadius: "6px", color: S.label,
										fontSize: "13px", outline: "none"
									}
								}),
								h("div", { style: { display: "flex", justifyContent: "flex-end", gap: "8px" } },
									h("button", {
										type: "button", onClick: () => setAssignFor(null),
										style: {
											height: "28px", padding: "0 10px", background: "none",
											border: "1px solid " + S.bd, borderRadius: "6px", color: S.l2,
											fontSize: "12px", cursor: "pointer"
										}
									}, "Đóng"),
									h("button", {
										type: "submit", disabled: assignBusy,
										style: {
											height: "28px", padding: "0 12px", background: S.brand,
											border: "none", borderRadius: "6px", color: "#fff",
											fontSize: "12px", fontWeight: 500, cursor: assignBusy ? "not-allowed" : "pointer"
										}
									}, assignBusy ? "Đang giao..." : "Giao bài")
								)
							)
						) : null
					),

					// RIGHT COLUMN: Nên dạy trước + Học sinh
					h("div", { style: { minWidth: 0, width: "100%", maxWidth: "100%", boxSizing: "border-box" } },
						// Section 1: Nên dạy trước (.box)
						h("section", {
							style: {
								background: S.side, border: "1px solid " + S.bd, borderRadius: "10px",
								padding: "16px", marginBottom: "16px"
							}
						},
							h("h2", { style: { fontSize: "15px", fontWeight: 600, margin: "0 0 2px" } }, "Nên dạy trước"),
							h("p", { style: { color: S.l3, fontSize: "12px", margin: "0 0 12px" } }, "Dạy các kỹ năng này sẽ mở khoá nhiều kỹ năng sau nhất."),

							plan.length === 0 ? h("div", { style: { padding: "12px 0", color: S.l3, fontSize: "13px" } }, "Đang suy luận lộ trình từ đồ thị tri thức...") :
								h("div", null,
									plan.slice(0, 3).map((entry, idx) => {
										const node = nodeByUri[entry.conceptUri];
										const code = node ? (node.humanCodingScheme || node.human_coding_scheme || "") : "";
										const label = node ? (node.fullStatement || node.full_statement || node.title || entry.conceptUri) : entry.conceptUri;
										const unlocksCount = entry.unlocks ? entry.unlocks.length : 0;
										const isFirst = idx === 0;

										return h("div", {
											key: entry.conceptUri,
											style: {
												display: "flex", gap: "12px", alignItems: "center",
												padding: "12px 0", borderTop: isFirst ? 0 : "1px solid " + S.bd,
												paddingTop: isFirst ? "4px" : "12px"
											}
										},
											h("span", {
												style: {
													width: "24px", height: "24px", borderRadius: "50%",
													background: S.layer, border: "1px solid " + S.bd2,
													display: "grid", placeItems: "center", fontSize: "12px",
													fontWeight: 600, flex: "none", color: S.label
												}
											}, idx + 1),
											h("div", { style: { flex: 1, minWidth: 0 } },
												h("b", { style: { fontWeight: 500, fontSize: "13px", display: "block" } }, label),
												h("div", { style: { color: S.l2, fontSize: "12px", marginTop: "2px" } },
													entry.redCount + " em chưa đạt · mở khoá " + unlocksCount + " kỹ năng"
												)
											),
											h("button", {
												onClick: () => {
													setAssignFor(entry.conceptUri);
													setAssignTitle("Ôn tập: [" + code + "] " + label);
												},
												style: {
													height: "30px", padding: "0 12px", border: "1px solid " + S.bd2,
													borderRadius: "7px", background: S.btn, fontSize: "13px",
													fontWeight: 500, cursor: "pointer", color: "inherit", flex: "none"
												}
											}, "Giao bài")
										);
									})
								)
						),

						// Section 2: Học sinh (.box)
						h("section", {
							style: {
								background: S.side, border: "1px solid " + S.bd, borderRadius: "10px",
								padding: "16px", marginBottom: 0
							}
						},
							h("h2", { style: { fontSize: "15px", fontWeight: 600, margin: "0 0 2px" } }, "Học sinh"),
							h("p", { style: { color: S.l3, fontSize: "12px", margin: "0 0 12px" } }, "Xếp theo mức cần hỗ trợ."),

							sortedStudents.length === 0 ? h("div", { style: { padding: "12px 0", color: S.l3, fontSize: "13px" } }, "Chưa có dữ liệu học sinh.") :
								h("div", null,
									sortedStudents.map((s, idx) => {
										const isFirst = idx === 0;
										const isSelected = activeStudentId === s.sid;
										const barColor = s.pct >= 60 ? S.grn : (s.pct >= 25 ? S.amb : S.red);

										return h("div", {
											key: s.sid,
											onClick: () => selectStudent(isSelected ? null : s.sid),
											style: {
												display: "grid", gridTemplateColumns: "1fr 90px 36px", gap: "10px",
												alignItems: "center", padding: "9px 8px",
												borderTop: isFirst ? 0 : "1px solid " + S.bd,
												cursor: "pointer", borderRadius: "6px",
												background: isSelected ? "rgba(253, 80, 90, 0.12)" : "transparent"
											}
										},
											h("span", {
												style: {
													fontWeight: isSelected ? 600 : 400,
													color: isSelected ? S.brand : S.label,
													overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
												}
											}, s.name),
											h("div", {
												style: {
													height: "6px", borderRadius: "3px", background: S.layer, overflow: "hidden"
												}
											},
												h("i", {
													style: {
														display: "block", height: "100%", borderRadius: "3px",
														width: Math.max(s.pct, 4) + "%", background: barColor
													}
												})
											),
											h("span", {
												style: {
													textAlign: "right", fontSize: "13px", color: S.l2
												}
											}, s.pct + "%")
										);
									})
								)
						)
					)
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

	exports.name = NS;
	exports.inject = ["slots"];
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
		}, Panel));
	};

	return module.exports;
}});
