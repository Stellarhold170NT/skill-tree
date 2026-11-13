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

	const T = {
		bg: "#151517",
		card: "#1b1b1d",
		cardAlt: "#202023",
		field: "#111113",
		border: "rgba(255, 255, 255, 0.08)",
		borderLight: "rgba(255, 255, 255, 0.04)",
		brand: "#fd505a",
		brandSoft: "rgba(253, 80, 90, 0.12)",
		labelPrimary: "#f9fafb",
		labelSecondary: "#cfd3d6",
		labelTertiary: "#9ca3af",
		green: "#7cc48c",
		greenSoft: "rgba(124, 196, 140, 0.14)",
		amber: "#f0b25a",
		amberSoft: "rgba(240, 178, 90, 0.14)",
		red: "#e04b4b",
		redSoft: "rgba(224, 75, 75, 0.14)",
		rusty: "#9a7c48",
		rustySoft: "rgba(154, 124, 72, 0.14)",
		none: "#55534b",
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
	function VisNetworkGraph(props) {
		const { payload, onSelectNode } = props;
		const containerRef = useRef(null);
		const netRef = useRef(null);
		const [ready, setReady] = useState(Boolean(window.vis && window.vis.Network));

		useEffect(() => {
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

			if (window.ResizeObserver) {
				const ro = new ResizeObserver(() => {
					const r = el.getBoundingClientRect();
					if (r.width > 20 && r.height > 20) {
						net.setSize(r.width + "px", r.height + "px");
						net.redraw();
						net.fit({ animation: false });
					}
				});
				ro.observe(el);
			}

			net.on("click", (params) => {
				if (params.nodes && params.nodes.length > 0) {
					onSelectNode(params.nodes[0]);
				} else {
					onSelectNode(null);
				}
			});

			netRef.current = net;
		}, [ready, payload]);

		return h("div", {
			ref: containerRef,
			style: {
				width: "100%",
				height: "560px",
				minHeight: "560px",
				position: "relative",
				overflow: "hidden",
				background: "linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px), #131315",
				backgroundSize: "52px 52px",
				borderRadius: "10px",
				border: "0.5px solid rgba(255, 255, 255, 0.08)"
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

		// Computed Metrics
		const metrics = useMemo(() => {
			if (!heatmap || !Array.isArray(heatmap.students) || heatmap.students.length === 0) {
				return { total: 0, worstGapName: "—", redCount: 0, rustyCount: 0 };
			}
			const total = heatmap.students.length;
			let redCells = 0, rustyCells = 0;
			const conceptRedCounts = {};

			for (const sid of heatmap.students) {
				for (const cid of (heatmap.concepts || [])) {
					const st = heatmap.cells && heatmap.cells[sid] ? heatmap.cells[sid][cid] : "none";
					if (st === "red") {
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

			let worstGapName = "None";
			if (worstCid) {
				const n = (graph.nodes || []).find(x => x.identifier === worstCid);
				worstGapName = n ? (n.humanCodingScheme || n.human_coding_scheme || "Gap") : "Gap";
			}

			return { total, worstGapName, redCount: redCells, rustyCount: rustyCells };
		}, [heatmap, graph]);

		// Inspector details for selected node
		const selectedNodeInfo = useMemo(() => {
			if (!selectedNodeId) return null;
			const node = nodeByUri[selectedNodeId];
			if (!node) return null;

			const code = node.humanCodingScheme || node.human_coding_scheme || "CHUẨN";
			const title = node.fullStatement || node.full_statement || node.title || selectedNodeId;

			// Prerequisites
			const prereqs = (graph.edges || [])
				.filter(e => (e.targetIdentifier || e.target || e.to) === selectedNodeId)
				.map(e => nodeByUri[e.sourceIdentifier || e.source || e.from])
				.filter(Boolean);

			// Unlocks
			const unlocks = (graph.edges || [])
				.filter(e => (e.sourceIdentifier || e.source || e.from) === selectedNodeId)
				.map(e => nodeByUri[e.targetIdentifier || e.target || e.to])
				.filter(Boolean);

			// Red & rusty students
			const redStudents = [];
			const rustyStudents = [];
			if (heatmap && heatmap.cells) {
				(heatmap.students || []).forEach(sid => {
					const st = heatmap.cells[sid] ? heatmap.cells[sid][selectedNodeId] : "none";
					if (st === "red") redStudents.push(nameBySid[sid] || sid.slice(0, 8));
					else if (st === "rusty") rustyStudents.push(nameBySid[sid] || sid.slice(0, 8));
				});
			}

			return { uri: selectedNodeId, code, title, prereqs, unlocks, redStudents, rustyStudents };
		}, [selectedNodeId, nodeByUri, graph, heatmap, nameBySid]);

		const activeStudentName = activeStudentId ? (nameBySid[activeStudentId] || activeStudentId.slice(0, 8)) : null;

		/* ---- RENDER ---- */
		return h("div", {
			style: {
				fontFamily: FONT, background: T.bg, color: T.labelPrimary,
				minHeight: "100%", width: "100%", height: "100%", maxHeight: "100%",
				overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch",
				padding: "24px 28px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "18px"
			}
		},
			// Top Toolbar: Class & Document selector
			h("div", {
				style: {
					display: "flex", justifyContent: "space-between", alignItems: "center",
					flexWrap: "wrap", gap: "12px", background: T.card, border: "0.5px solid " + T.border,
					borderRadius: "12px", padding: "12px 18px"
				}
			},
				h("div", { style: { display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" } },
					h("div", null,
						h("label", { style: { display: "block", fontSize: "11px", fontWeight: 600, color: T.labelTertiary, marginBottom: "3px" } }, "LỚP HỌC PHẦN"),
						h("select", {
							value: classId,
							onChange: (e) => onSelectClass(e.target.value),
							style: {
								padding: "7px 10px", background: T.field, border: "0.5px solid " + T.border,
								borderRadius: "6px", color: T.labelPrimary, fontSize: "13px", outline: "none", minWidth: "200px"
							}
						},
							classes.length === 0 ? h("option", { value: "" }, "Đang tải...") :
								classes.map(c => h("option", { key: c.sourcedId, value: c.sourcedId }, c.title))
						)
					),
					h("div", null,
						h("label", { style: { display: "block", fontSize: "11px", fontWeight: 600, color: T.labelTertiary, marginBottom: "3px" } }, "MÔN HỌC & KHUNG NĂNG LỰC"),
						h("select", {
							value: documentId,
							onChange: (e) => {
								setDocumentId(e.target.value);
								setActiveStudentId(null);
								setSelectedNodeId(null);
								persist({ gatewayOverride, classId, documentId: e.target.value });
								loadDashboard(classId, e.target.value);
							},
							style: {
								padding: "7px 10px", background: T.field, border: "0.5px solid " + T.border,
								borderRadius: "6px", color: T.labelPrimary, fontSize: "13px", outline: "none", minWidth: "220px"
							}
						},
							documents.length === 0 ? h("option", { value: "" }, "Đang tải...") :
								documents.map(d => h("option", { key: d.id, value: d.id }, d.title))
						)
					)
				),
				h("button", {
					onClick: () => loadDashboard(), disabled: busy,
					style: {
						display: "inline-flex", alignItems: "center", gap: "6px",
						padding: "7px 14px", background: T.brand, color: "#fff",
						border: "none", borderRadius: "6px", fontSize: "12px",
						fontWeight: 500, cursor: busy ? "not-allowed" : "pointer"
					}
				},
					Icons.RefreshCw(13, "#fff"),
					busy ? "Đang tải..." : "Làm mới dữ liệu"
				)
			),

			// Alert messages
			error ? h("div", {
				style: { padding: "10px 14px", borderRadius: "8px", fontSize: "13px", background: T.redSoft, color: T.red }
			}, error) : null,

			notice ? h("div", {
				style: { padding: "10px 14px", borderRadius: "8px", fontSize: "13px", background: T.greenSoft, color: T.green }
			}, notice) : null,

			// TWO-COLUMN WORKBENCH (Classroom Memory Architecture)
			h("div", { style: { display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "flex-start" } },
				// LEFT COLUMN: Copilot + Teaching Plan + Students List
				h("div", { style: { flex: "1 1 380px", display: "flex", flexDirection: "column", gap: "16px", minWidth: "320px", maxWidth: "440px" } },
					// WIDGET 1: Ask the Class
					h("div", {
						style: {
							background: T.card, border: "0.5px solid " + T.border, borderRadius: "12px",
							padding: "16px 18px"
						}
					},
						h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" } },
							h("div", { style: { display: "flex", alignItems: "center", gap: "8px" } },
								h("span", { style: { width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e" } }),
								h("h3", { style: { margin: 0, fontSize: "14px", fontWeight: 600, color: T.labelPrimary } }, "ask the class")
							),
							h("code", { style: { fontSize: "11px", color: T.labelTertiary, fontFamily: MONO } }, "multi-dataset recall")
						),
						h("div", { style: { display: "flex", gap: "8px" } },
							h("input", {
								value: askQuestion,
								onChange: (e) => setAskQuestion(e.target.value),
								onKeyDown: (e) => { if (e.key === "Enter") sendAsk(); },
								placeholder: "who has mastered recursion? hoặc ai đang đỏ ở định thức?",
								style: {
									flex: 1, padding: "8px 12px", background: T.field, border: "0.5px solid " + T.border,
									borderRadius: "6px", color: T.labelPrimary, fontSize: "13px", outline: "none"
								}
							}),
							h("button", {
								onClick: () => sendAsk(), disabled: askBusy || !askQuestion.trim(),
								style: {
									padding: "8px 14px", background: T.brand, color: "#fff",
									border: "none", borderRadius: "6px", cursor: askBusy ? "not-allowed" : "pointer"
								}
							}, Icons.Send(13, "#fff"))
						),
						ask ? h("div", {
							style: {
								marginTop: "12px", padding: "12px 14px", background: T.field,
								border: "0.5px solid " + T.border, borderRadius: "8px", fontSize: "13px", lineHeight: "20px"
							}
						},
							ask.error ? h("div", { style: { color: T.red } }, ask.error) :
								h("div", null,
									h("div", { style: { color: T.labelPrimary, whiteSpace: "pre-wrap" } }, ask.answer),
									h("div", { style: { fontSize: "11px", color: T.labelTertiary, marginTop: "6px", fontFamily: MONO } }, "one recall, every student's memory")
								)
						) : null
					),

					// WIDGET 2: Teaching Plan (Graph-Reasoned)
					h("div", {
						style: {
							background: T.card, border: "0.5px solid " + T.border, borderRadius: "12px",
							padding: "16px 18px"
						}
					},
						h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" } },
							h("div", { style: { display: "flex", alignItems: "center", gap: "8px" } },
								h("span", { style: { width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e" } }),
								h("h3", { style: { margin: 0, fontSize: "14px", fontWeight: 600, color: T.labelPrimary } }, "teaching plan")
							),
							h("code", { style: { fontSize: "11px", color: T.labelTertiary, fontFamily: MONO } }, "graph-reasoned")
						),
						plan.length === 0 ? h("div", { style: { padding: "16px 0", color: T.labelTertiary, fontSize: "13px" } }, "reading the class memory graph…") :
							h("div", { style: { display: "flex", flexDirection: "column", gap: "10px" } },
								plan.slice(0, 3).map((entry, idx) => {
									const node = nodeByUri[entry.conceptUri];
									const code = node ? (node.humanCodingScheme || node.human_coding_scheme) : "TOP";
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
											h("div", { style: { fontSize: "13px", fontWeight: 600, color: T.labelPrimary, marginBottom: "2px" } },
												(idx + 1) + ". " + label
											),
											h("div", { style: { fontSize: "11px", color: T.labelTertiary, marginBottom: "4px" } }, entry.reason),
											h("div", { style: { display: "flex", gap: "6px" } },
												h("em", { style: { fontStyle: "normal", fontSize: "11px", color: T.red } }, entry.redCount + " ready"),
												h("em", { style: { fontStyle: "normal", fontSize: "11px", color: T.green } }, "unlocks " + unlocksCount)
											)
										),
										h("button", {
											onClick: () => {
												setAssignFor(entry.conceptUri);
												setAssignTitle("Ôn tập: [" + code + "] " + label);
											},
											style: {
												padding: "4px 10px", background: "rgba(255,255,255,0.06)", color: T.labelSecondary,
												border: "0.5px solid " + T.border, borderRadius: "6px", fontSize: "11px", cursor: "pointer"
											}
										}, "assign")
									);
								})
							)
					),

					// WIDGET 3: Students Roster
					h("div", {
						style: {
							background: T.card, border: "0.5px solid " + T.border, borderRadius: "12px",
							padding: "16px 18px"
						}
					},
						h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" } },
							h("div", { style: { display: "flex", alignItems: "center", gap: "8px" } },
								h("span", { style: { width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e" } }),
								h("h3", { style: { margin: 0, fontSize: "14px", fontWeight: 600, color: T.labelPrimary } }, "students")
							),
							activeStudentId ? h("button", {
								onClick: () => selectStudent(null),
								style: {
									background: "none", border: "none", color: T.brand, fontSize: "11px", cursor: "pointer"
								}
							}, "back to class") : null
						),
						!heatmap || !Array.isArray(heatmap.students) || heatmap.students.length === 0 ?
							h("div", { style: { padding: "16px 0", color: T.labelTertiary, fontSize: "12px" } }, "Chưa có dữ liệu học sinh.") :
							h("div", { style: { display: "flex", flexDirection: "column", gap: "6px" } },
								heatmap.students.map(sid => {
									const isCurrent = activeStudentId === sid;
									const sName = nameBySid[sid] || sid.slice(0, 8);
									let sMastered = 0, sGaps = 0, sTotal = (heatmap.concepts || []).length;
									(heatmap.concepts || []).forEach(cid => {
										const st = heatmap.cells && heatmap.cells[sid] ? heatmap.cells[sid][cid] : "none";
										if (st === "green") sMastered++;
										else if (st === "red") sGaps++;
									});
									const sPct = sTotal > 0 ? Math.round((sMastered / sTotal) * 100) : 0;

									return h("button", {
										key: sid,
										onClick: () => selectStudent(isCurrent ? null : sid),
										style: {
											padding: "9px 12px", borderRadius: "8px", cursor: "pointer", textAlign: "left",
											background: isCurrent ? "rgba(253, 80, 90, 0.12)" : T.field,
											border: isCurrent ? "1px solid " + T.brand : "0.5px solid " + T.borderLight,
											display: "flex", justifyContent: "space-between", alignItems: "center"
										}
									},
										h("div", null,
											h("span", { style: { fontSize: "13px", fontWeight: 600, color: isCurrent ? T.brand : T.labelPrimary, display: "block" } }, sName),
											h("span", { style: { fontSize: "11px", color: T.labelTertiary, marginTop: "2px", display: "block" } },
												sMastered + " mastered · " + sGaps + " gaps · " + sPct + "% mastered"
											)
										),
										h("span", { style: { fontSize: "12px", color: isCurrent ? T.brand : T.labelTertiary } }, "›")
									);
								})
							)
					),

					// Targeted Intervention Drawer (when assign clicked)
					assignFor ? h("div", {
						style: {
							background: T.card, border: "1px solid " + T.brand, borderRadius: "12px",
							padding: "16px 18px"
						}
					},
						h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" } },
							h("h4", { style: { margin: 0, fontSize: "14px", fontWeight: 600, color: T.labelPrimary } }, "Assign Review"),
							h("button", { onClick: () => setAssignFor(null), style: { background: "none", border: "none", color: T.labelTertiary, cursor: "pointer" } }, Icons.X(13, "currentColor"))
						),
						h("form", { onSubmit: submitAssign, style: { display: "flex", flexDirection: "column", gap: "10px" } },
							h("input", {
								value: assignTitle, onChange: e => setAssignTitle(e.target.value),
								placeholder: "Tiêu đề ôn tập...",
								style: { width: "100%", padding: "8px 10px", background: T.field, border: "0.5px solid " + T.border, borderRadius: "6px", color: T.labelPrimary, fontSize: "13px", boxSizing: "border-box", outline: "none" }
							}),
							h("div", { style: { display: "flex", justifyContent: "flex-end", gap: "8px" } },
								h("button", { type: "button", onClick: () => setAssignFor(null), style: { padding: "5px 10px", background: "none", border: "0.5px solid " + T.border, borderRadius: "6px", color: T.labelSecondary, fontSize: "11px", cursor: "pointer" } }, "Đóng"),
								h("button", { type: "submit", disabled: assignBusy, style: { padding: "5px 12px", background: T.brand, border: "none", borderRadius: "6px", color: "#fff", fontSize: "11px", fontWeight: 500, cursor: assignBusy ? "not-allowed" : "pointer" } }, assignBusy ? "..." : "Giao bài")
							)
						)
					) : null
				),

				// RIGHT COLUMN: THE MASTERY GRAPH (VIS-NETWORK)
				h("div", { style: { flex: "2 1 540px", display: "flex", flexDirection: "column", gap: "14px", minWidth: "360px" } },
					h("div", {
						style: {
							background: T.card, border: "0.5px solid " + T.border, borderRadius: "12px",
							padding: "16px 18px", display: "flex", flexDirection: "column", gap: "12px"
						}
					},
						// Window Bar
						h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
							h("div", { style: { display: "flex", alignItems: "center", gap: "8px" } },
								h("span", { style: { width: "8px", height: "8px", borderRadius: "50%", background: "#38bdf8", boxShadow: "0 0 6px #38bdf8" } }),
								h("span", { style: { fontSize: "14px", fontWeight: 600, color: T.labelPrimary } },
									activeStudentId ? activeStudentName + " · mastery graph" : "class heat map"
								)
							),
							activeStudentId ? h("button", {
								onClick: () => selectStudent(null),
								style: {
									display: "inline-flex", alignItems: "center", gap: "4px",
									background: "none", border: "none", color: T.brand, fontSize: "12px", cursor: "pointer"
								}
							}, "back to class") : null
						),

						// The vis-network Graph Canvas
						graphPayload ? h(VisNetworkGraph, {
							payload: graphPayload,
							onSelectNode: (nodeId) => setSelectedNodeId(nodeId),
							isStudentMode: Boolean(activeStudentId),
							activeStudentId,
							onBackToClass: () => selectStudent(null)
						}) : h("div", { style: { height: "560px", display: "grid", placeItems: "center", color: T.labelTertiary } }, "Đang tải dữ liệu đồ thị..."),

						// Legend (Classroom Memory exact)
						h("div", {
							style: {
								display: "flex", justifyContent: "space-between", alignItems: "center",
								flexWrap: "wrap", gap: "10px", padding: "8px 4px 0", fontSize: "11px", color: T.labelTertiary
							}
						},
							h("div", { style: { display: "flex", gap: "14px", alignItems: "center" } },
								h("span", { style: { display: "flex", alignItems: "center", gap: "5px" } },
									h("span", { style: { width: "10px", height: "10px", borderRadius: "50%", background: "#5a1f1f", border: "2px solid #e04b4b" } }), "class is red"
								),
								h("span", { style: { display: "flex", alignItems: "center", gap: "5px" } },
									h("span", { style: { width: "10px", height: "10px", borderRadius: "50%", background: "#4d3a17", border: "2px solid #f0b25a" } }), "class is mixed"
								),
								h("span", { style: { display: "flex", alignItems: "center", gap: "5px" } },
									h("span", { style: { width: "10px", height: "10px", borderRadius: "50%", background: "#20402a", border: "2px solid #7cc48c" } }), "class has mastered"
								)
							),
							h("span", { style: { fontStyle: "italic" } }, "color = class-average mastery per concept · click a student to inspect")
						),

						// Concept Inspector Card (when node clicked)
						selectedNodeInfo ? h("div", {
							style: {
								background: T.field, border: "1px solid " + T.border, borderRadius: "8px",
								padding: "14px 16px", marginTop: "4px"
							}
						},
							h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" } },
								h("div", null,
									h("div", { style: { fontSize: "11px", fontWeight: 700, color: T.brand, fontFamily: MONO } }, selectedNodeInfo.code),
									h("h4", { style: { margin: "2px 0 0", fontSize: "14px", fontWeight: 600, color: T.labelPrimary } }, selectedNodeInfo.title)
								),
								h("button", { onClick: () => setSelectedNodeId(null), style: { background: "none", border: "none", color: T.labelTertiary, cursor: "pointer" } }, Icons.X(13, "currentColor"))
							),
							h("div", { style: { fontSize: "12px", color: T.labelSecondary, marginBottom: "8px" } },
								selectedNodeInfo.prereqs.length > 0 ?
									"Prerequisites: " + selectedNodeInfo.prereqs.map(p => p.humanCodingScheme || p.identifier.slice(-8)).join(", ") :
									"Prerequisites: none: a starting concept"
							),
							selectedNodeInfo.redStudents.length > 0 ?
								h("div", { style: { fontSize: "12px", color: T.red, marginBottom: "8px" } },
									"Class red: " + selectedNodeInfo.redStudents.length + " students (" + selectedNodeInfo.redStudents.join(", ") + ")"
								) : null,
							h("button", {
								onClick: () => {
									setAssignFor(selectedNodeInfo.uri);
									setAssignTitle("Ôn tập: [" + selectedNodeInfo.code + "] " + selectedNodeInfo.title);
								},
								style: {
									padding: "5px 12px", background: T.brand, color: "#fff",
									border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: 500, cursor: "pointer"
								}
							}, "Assign review for this concept")
						) : null
					),

					// Bottom 3 Metrics Row (exact Classroom Memory)
					h("div", { style: { display: "flex", gap: "12px" } },
						h("div", { style: { flex: 1, background: T.card, border: "0.5px solid " + T.border, borderRadius: "10px", padding: "12px 16px", textAlign: "center" } },
							h("div", { style: { fontSize: "22px", fontWeight: 700, color: T.labelPrimary } }, metrics.total < 10 ? "0" + metrics.total : metrics.total),
							h("div", { style: { fontSize: "11px", color: T.labelTertiary, textTransform: "lowercase", marginTop: "2px" } }, "students")
						),
						h("div", { style: { flex: 1, background: T.card, border: "0.5px solid " + T.border, borderRadius: "10px", padding: "12px 16px", textAlign: "center" } },
							h("div", { style: { fontSize: "20px", fontWeight: 700, color: T.red } }, metrics.worstGapName.split(" ")[0]),
							h("div", { style: { fontSize: "11px", color: T.labelTertiary, textTransform: "lowercase", marginTop: "2px" } }, "biggest gap")
						),
						h("div", { style: { flex: 1, background: T.card, border: "0.5px solid " + T.border, borderRadius: "10px", padding: "12px 16px", textAlign: "center" } },
							h("div", { style: { fontSize: "22px", fontWeight: 700, color: T.amber } }, metrics.redCount + " gaps"),
							h("div", { style: { fontSize: "11px", color: T.labelTertiary, textTransform: "lowercase", marginTop: "2px" } }, "class red")
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
