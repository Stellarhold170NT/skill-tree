/**
 * skilltree-course-ui — CLIENT half.
 * Clean, production-grade LMS Course & Curriculum Management aligned with
 * DeepSeek Harness & vAiPlatform design language.
 * Strictly connects to backend services:
 *   - class-service (M6): Course metadata & Class sections
 *   - opencase-service (M1): CASE Competency Framework (CLOs, Skill Tree DAG & Prerequisites)
 *   - document-service (M9) & rag-service (M8): Document ingestion & concept alignments
 */
window.__ModuleLoader__.load({ id: "skilltree-course-ui", factory: (require) => {
	var module = { exports: {} };
	var exports = module.exports;
	const react = require("react");
	const { createElement: h, useState, useEffect, useCallback, useMemo } = react;

	const NS = "skilltree-course-ui";
	const AUTH_STORAGE_KEY = "skilltree.auth.v1";
	const GATEWAY_STORAGE_KEY = "skilltree.auth.gateway";

	/* ---- Standard deepseek-harness & vAiPlatform design tokens ---- */
	const T = {
		bg: "var(--dsw-alias-bg-base, #151517)",
		card: "var(--dsw-alias-bg-layer-2, #1b1b1d)",
		cardHover: "var(--dsw-alias-bg-layer-3, #232326)",
		field: "var(--dsw-specific-login-input, #1f1f22)",
		border: "var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.1))",
		borderLight: "rgba(255, 255, 255, 0.06)",
		borderFocus: "#fd505a",
		labelPrimary: "var(--dsw-alias-label-primary, #f9fafb)",
		labelSecondary: "var(--dsw-alias-label-secondary, #cfd3d6)",
		labelTertiary: "var(--dsw-alias-label-tertiary, #81858c)",
		brand: "#fd505a",
		brandHover: "#e0444e",
		brandSoft: "rgba(253, 80, 90, 0.12)",
		accent: "#22c55e",
		accentSoft: "rgba(34, 197, 94, 0.12)",
		danger: "#f25a5a",
		dangerSoft: "rgba(242, 90, 90, 0.12)",
		info: "#3b82f6",
		infoSoft: "rgba(59, 130, 246, 0.12)",
	};

	const FONT = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif)';

	/* ---- DeepSeek Harness Clean SVG Icons (No emojis, no arbitrary opacity) ---- */
	const Icons = {
		Book: (size = 18, color = "currentColor") => h("svg", {
			width: size, height: size, viewBox: "0 0 24 24", fill: "none",
			stroke: color, strokeWidth: "1.75", strokeLinecap: "round", strokeLinejoin: "round"
		},
			h("path", { d: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20" }),
			h("path", { d: "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" }),
			h("line", { x1: "9", y1: "7", x2: "15", y2: "7" }),
			h("line", { x1: "9", y1: "11", x2: "15", y2: "11" })
		),
		Target: (size = 16, color = "currentColor") => h("svg", {
			width: size, height: size, viewBox: "0 0 24 24", fill: "none",
			stroke: color, strokeWidth: "1.75", strokeLinecap: "round", strokeLinejoin: "round"
		},
			h("circle", { cx: "12", cy: "12", r: "10" }),
			h("circle", { cx: "12", cy: "12", r: "6" }),
			h("circle", { cx: "12", cy: "12", r: "2" })
		),
		Tree: (size = 16, color = "currentColor") => h("svg", {
			width: size, height: size, viewBox: "0 0 24 24", fill: "none",
			stroke: color, strokeWidth: "1.75", strokeLinecap: "round", strokeLinejoin: "round"
		},
			h("circle", { cx: "18", cy: "5", r: "3" }),
			h("circle", { cx: "6", cy: "12", r: "3" }),
			h("circle", { cx: "18", cy: "19", r: "3" }),
			h("line", { x1: "8.59", y1: "13.51", x2: "15.42", y2: "17.49" }),
			h("line", { x1: "15.41", y1: "6.51", x2: "8.59", y2: "10.49" })
		),
		Syllabus: (size = 16, color = "currentColor") => h("svg", {
			width: size, height: size, viewBox: "0 0 24 24", fill: "none",
			stroke: color, strokeWidth: "1.75", strokeLinecap: "round", strokeLinejoin: "round"
		},
			h("line", { x1: "8", y1: "6", x2: "21", y2: "6" }),
			h("line", { x1: "8", y1: "12", x2: "21", y2: "12" }),
			h("line", { x1: "8", y1: "18", x2: "21", y2: "18" }),
			h("line", { x1: "3", y1: "6", x2: "3.01", y2: "6" }),
			h("line", { x1: "3", y1: "12", x2: "3.01", y2: "12" }),
			h("line", { x1: "3", y1: "18", x2: "3.01", y2: "18" })
		),
		FileText: (size = 16, color = "currentColor") => h("svg", {
			width: size, height: size, viewBox: "0 0 24 24", fill: "none",
			stroke: color, strokeWidth: "1.75", strokeLinecap: "round", strokeLinejoin: "round"
		},
			h("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
			h("polyline", { points: "14 2 14 8 20 8" }),
			h("line", { x1: "16", y1: "13", x2: "8", y2: "13" }),
			h("line", { x1: "16", y1: "17", x2: "8", y2: "17" })
		),
		Users: (size = 16, color = "currentColor") => h("svg", {
			width: size, height: size, viewBox: "0 0 24 24", fill: "none",
			stroke: color, strokeWidth: "1.75", strokeLinecap: "round", strokeLinejoin: "round"
		},
			h("path", { d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" }),
			h("circle", { cx: "9", cy: "7", r: "4" }),
			h("path", { d: "M23 21v-2a4 4 0 0 0-3-3.87" }),
			h("path", { d: "M16 3.13a4 4 0 0 1 0 7.75" })
		),
		Plus: (size = 14, color = "currentColor") => h("svg", {
			width: size, height: size, viewBox: "0 0 24 24", fill: "none",
			stroke: color, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round"
		},
			h("line", { x1: "12", y1: "5", x2: "12", y2: "19" }),
			h("line", { x1: "5", y1: "12", x2: "19", y2: "12" })
		),
		ArrowLeft: (size = 14, color = "currentColor") => h("svg", {
			width: size, height: size, viewBox: "0 0 24 24", fill: "none",
			stroke: color, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round"
		},
			h("line", { x1: "19", y1: "12", x2: "5", y2: "12" }),
			h("polyline", { points: "12 19 5 12 12 5" })
		),
		ArrowRight: (size = 14, color = "currentColor") => h("svg", {
			width: size, height: size, viewBox: "0 0 24 24", fill: "none",
			stroke: color, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round"
		},
			h("line", { x1: "5", y1: "12", x2: "19", y2: "12" }),
			h("polyline", { points: "12 5 19 12 12 19" })
		),
		Check: (size = 14, color = "currentColor") => h("svg", {
			width: size, height: size, viewBox: "0 0 24 24", fill: "none",
			stroke: color, strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round"
		},
			h("polyline", { points: "20 6 9 17 4 12" })
		),
		Search: (size = 14, color = "currentColor") => h("svg", {
			width: size, height: size, viewBox: "0 0 24 24", fill: "none",
			stroke: color, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round"
		},
			h("circle", { cx: "11", cy: "11", r: "8" }),
			h("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })
		),
		Link: (size = 14, color = "currentColor") => h("svg", {
			width: size, height: size, viewBox: "0 0 24 24", fill: "none",
			stroke: color, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round"
		},
			h("path", { d: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" }),
			h("path", { d: "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" })
		),
		X: (size = 14, color = "currentColor") => h("svg", {
			width: size, height: size, viewBox: "0 0 24 24", fill: "none",
			stroke: color, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round"
		},
			h("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
			h("line", { x1: "6", y1: "6", x2: "18", y2: "18" })
		)
	};

	function getActiveToken() {
		try {
			const raw = localStorage.getItem(AUTH_STORAGE_KEY);
			if (!raw) return "";
			const parsed = JSON.parse(raw);
			return parsed && typeof parsed.token === "string" ? parsed.token : "";
		} catch (e) {
			return "";
		}
	}

	function getGatewayUrl() {
		try {
			return localStorage.getItem(GATEWAY_STORAGE_KEY) || "http://localhost:8000";
		} catch (e) {
			return "http://localhost:8000";
		}
	}

	async function callProxy(method, path, body) {
		const token = getActiveToken();
		const baseUrl = getGatewayUrl();
		const res = await fetch("/courseui/proxy", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ baseUrl, token, method, path, body }),
		});
		const env = await res.json();
		if (!res.ok || !env.ok) {
			const msg = (env && (env.error || (env.details && env.details.message))) || `Lỗi HTTP ${res.status}`;
			throw new Error(msg);
		}
		return env.data;
	}

	function PageHeader() {
		return h("div", {
			style: {
				display: "flex", alignItems: "center", gap: "12px",
				padding: "0 0 16px", borderBottom: `0.5px solid ${T.border}`,
				marginBottom: "20px"
			}
		},
			h("div", {
				style: {
					display: "flex", alignItems: "center", justifyContent: "center",
					width: "28px", height: "28px", color: "#ffffff"
				}
			}, Icons.Book(24, "#ffffff")),
			h("div", null,
				h("h2", { style: { margin: 0, fontSize: "18px", fontWeight: 600, color: T.labelPrimary, lineHeight: "24px" } }, "Môn học"),
				h("p", { style: { margin: "2px 0 0", fontSize: "13px", color: T.labelTertiary, lineHeight: "18px" } },
					"Quản lý danh mục môn học, chuẩn đầu ra (CLO), cây kỹ năng tiên quyết (CASE) và tài liệu giáo trình"
				)
			)
		);
	}

	function CourseManagementPanel() {
		const [courses, setCourses] = useState(null);
		const [classes, setClasses] = useState([]);
		const [caseDocs, setCaseDocs] = useState([]);
		const [documents, setDocuments] = useState([]);
		const [busy, setBusy] = useState(false);
		const [error, setError] = useState(null);
		const [msg, setMsg] = useState(null);

		// Navigation & Selected Course
		const [selectedCourse, setSelectedCourse] = useState(null);
		const [activeSubTab, setActiveSubTab] = useState("clos"); // "clos" | "graph" | "syllabus" | "materials" | "classes"

		// Selected Course's CASE Framework Data
		const [caseDoc, setCaseDoc] = useState(null);
		const [caseItems, setCaseItems] = useState([]);
		const [caseGraph, setCaseGraph] = useState(null);

		// Create course form
		const [showCreateCourse, setShowCreateCourse] = useState(false);
		const [newTitle, setNewTitle] = useState("");
		const [newSchoolYear, setNewSchoolYear] = useState("2026-2027");

		// Create CLO item form
		const [showAddClo, setShowAddClo] = useState(false);
		const [newCloCode, setNewCloCode] = useState("");
		const [newCloStatement, setNewCloStatement] = useState("");
		const [newCloLevel, setNewCloLevel] = useState("Vận dụng (Apply)");

		// Add Prerequisite Association Form
		const [showAddPrereq, setShowAddPrereq] = useState(false);
		const [prereqOrigin, setPrereqOrigin] = useState("");
		const [prereqDest, setPrereqDest] = useState("");

		// Create document form
		const [showAddDoc, setShowAddDoc] = useState(false);
		const [newDocTitle, setNewDocTitle] = useState("");
		const [newDocUri, setNewDocUri] = useState("");

		// Search
		const [search, setSearch] = useState("");

		// Load global list of courses, classes, case docs
		const loadAll = useCallback(async () => {
			setBusy(true);
			setError(null);
			try {
				const [courseList, classList, caseDocList, docList] = await Promise.all([
					callProxy("GET", "class/courses").catch(() => []),
					callProxy("GET", "class/classes").catch(() => []),
					callProxy("GET", "case/documents").catch(() => []),
					callProxy("GET", "documents/documents").catch(() => []),
				]);
				setCourses(Array.isArray(courseList) ? courseList : []);
				setClasses(Array.isArray(classList) ? classList : []);
				setCaseDocs(Array.isArray(caseDocList) ? caseDocList : []);
				setDocuments(Array.isArray(docList) ? docList : []);
			} catch (err) {
				setError(err.message);
			} finally {
				setBusy(false);
			}
		}, []);

		useEffect(() => {
			loadAll();
		}, [loadAll]);

		// Load CASE framework details (items + graph) for the selected course
		const loadCourseCaseFramework = useCallback(async (course, allCaseDocs) => {
			if (!course) {
				setCaseDoc(null);
				setCaseItems([]);
				setCaseGraph(null);
				return;
			}
			const docs = allCaseDocs || caseDocs;
			// Match by course title or identifier
			const matched = docs.find(d => (
				d.title === course.title ||
				d.identifier === `urn:course:${course.sourcedId}` ||
				(d.title && course.title && d.title.toLowerCase().trim() === course.title.toLowerCase().trim())
			));

			if (!matched) {
				setCaseDoc(null);
				setCaseItems([]);
				setCaseGraph(null);
				return;
			}

			setCaseDoc(matched);
			try {
				const [items, graph] = await Promise.all([
					callProxy("GET", `case/documents/${matched.id}/items`).catch(() => []),
					callProxy("GET", `case/documents/${matched.id}/graph`).catch(() => null),
				]);
				setCaseItems(Array.isArray(items) ? items : []);
				setCaseGraph(graph && graph.nodes ? graph : null);
			} catch (e) {
				console.error("[course-ui] error loading framework items/graph", e);
			}
		}, [caseDocs]);

		useEffect(() => {
			if (selectedCourse) {
				loadCourseCaseFramework(selectedCourse, caseDocs);
			}
		}, [selectedCourse, caseDocs, loadCourseCaseFramework]);

		// Action: Create Course
		const createCourse = async (e) => {
			if (e) e.preventDefault();
			if (!newTitle.trim()) {
				setMsg({ ok: false, text: "Vui lòng nhập tên môn học" });
				return;
			}
			setBusy(true);
			try {
				const created = await callProxy("POST", "class/courses", {
					title: newTitle.trim(),
					school_year: newSchoolYear.trim() || undefined,
				});
				// Also create corresponding CASE Framework in opencase-service
				try {
					await callProxy("POST", "case/documents", {
						title: newTitle.trim(),
						creator: "Teacher",
						identifier: `urn:course:${created.sourcedId}`,
						description: `Khung chuẩn đầu ra & Cây kỹ năng cho môn ${newTitle.trim()}`
					});
				} catch (caseErr) {
					console.warn("[course-ui] case doc init warning:", caseErr);
				}

				setNewTitle("");
				setShowCreateCourse(false);
				setMsg({ ok: true, text: `Đã tạo môn học "${newTitle.trim()}" thành công!` });
				await loadAll();
			} catch (err) {
				setMsg({ ok: false, text: `Lỗi tạo môn học: ${err.message}` });
			} finally {
				setBusy(false);
			}
		};

		// Action: Initialize Framework if missing
		const initFramework = async () => {
			if (!selectedCourse) return;
			setBusy(true);
			try {
				await callProxy("POST", "case/documents", {
					title: selectedCourse.title,
					creator: "Teacher",
					identifier: `urn:course:${selectedCourse.sourcedId}`,
					description: `Khung chuẩn đầu ra & Cây kỹ năng cho môn ${selectedCourse.title}`
				});
				setMsg({ ok: true, text: `Đã khởi tạo Khung chuẩn đầu ra (OpenCASE) cho môn ${selectedCourse.title}!` });
				const updatedDocs = await callProxy("GET", "case/documents");
				setCaseDocs(updatedDocs);
				await loadCourseCaseFramework(selectedCourse, updatedDocs);
			} catch (err) {
				setMsg({ ok: false, text: `Lỗi tạo khung chuẩn: ${err.message}` });
			} finally {
				setBusy(false);
			}
		};

		// Action: Create CLO item
		const createClo = async (e) => {
			if (e) e.preventDefault();
			if (!caseDoc) return;
			if (!newCloStatement.trim()) {
				setMsg({ ok: false, text: "Vui lòng nhập nội dung chuẩn đầu ra" });
				return;
			}
			setBusy(true);
			try {
				await callProxy("POST", `case/documents/${caseDoc.id}/items`, {
					human_coding_scheme: newCloCode.trim() || `CLO.${caseItems.length + 1}`,
					full_statement: newCloStatement.trim(),
					description: newCloLevel.trim(),
				});
				setNewCloCode("");
				setNewCloStatement("");
				setShowAddClo(false);
				setMsg({ ok: true, text: "Đã thêm chuẩn đầu ra mới vào cây kỹ năng môn học!" });
				// Reload items & graph
				const [items, graph] = await Promise.all([
					callProxy("GET", `case/documents/${caseDoc.id}/items`),
					callProxy("GET", `case/documents/${caseDoc.id}/graph`).catch(() => null),
				]);
				setCaseItems(items);
				setCaseGraph(graph && graph.nodes ? graph : null);
			} catch (err) {
				setMsg({ ok: false, text: `Lỗi thêm chuẩn: ${err.message}` });
			} finally {
				setBusy(false);
			}
		};

		// Action: Add Prerequisite
		const addPrerequisite = async (e) => {
			if (e) e.preventDefault();
			if (!caseDoc || !prereqOrigin || !prereqDest) {
				setMsg({ ok: false, text: "Vui lòng chọn kỹ năng tiên quyết và kỹ năng kế tiếp" });
				return;
			}
			if (prereqOrigin === prereqDest) {
				setMsg({ ok: false, text: "Kỹ năng tiên quyết không được trùng với kỹ năng đích" });
				return;
			}
			setBusy(true);
			try {
				await callProxy("POST", `case/documents/${caseDoc.id}/associations`, {
					association_type: "isPrerequisiteOf",
					origin_item_id: prereqOrigin,
					destination_item_id: prereqDest,
				});
				setShowAddPrereq(false);
				setPrereqOrigin("");
				setPrereqDest("");
				setMsg({ ok: true, text: "Đã thiết lập mối quan hệ tiên quyết thành công!" });
				const graph = await callProxy("GET", `case/documents/${caseDoc.id}/graph`);
				setCaseGraph(graph && graph.nodes ? graph : null);
			} catch (err) {
				setMsg({ ok: false, text: `Lỗi gán tiên quyết: ${err.message}` });
			} finally {
				setBusy(false);
			}
		};

		// Action: Create Document
		const createDocument = async (e) => {
			if (e) e.preventDefault();
			if (!newDocTitle.trim()) {
				setMsg({ ok: false, text: "Vui lòng nhập tên tài liệu / giáo trình" });
				return;
			}
			setBusy(true);
			try {
				await callProxy("POST", "documents/documents", {
					title: newDocTitle.trim(),
					uri: newDocUri.trim() || `urn:doc:${Date.now()}`,
				});
				setNewDocTitle("");
				setNewDocUri("");
				setShowAddDoc(false);
				setMsg({ ok: true, text: `Đã nạp tài liệu "${newDocTitle.trim()}" thành công!` });
				const docList = await callProxy("GET", "documents/documents");
				setDocuments(Array.isArray(docList) ? docList : []);
			} catch (err) {
				setMsg({ ok: false, text: `Lỗi nạp tài liệu: ${err.message}` });
			} finally {
				setBusy(false);
			}
		};

		// Filter courses
		const filteredCourses = useMemo(() => {
			if (!courses) return [];
			const q = search.trim().toLowerCase();
			if (!q) return courses;
			return courses.filter(c => (c.title || "").toLowerCase().includes(q) || (c.schoolYear || "").toLowerCase().includes(q));
		}, [courses, search]);

		// Linked classes for selected course
		const courseClasses = useMemo(() => {
			if (!selectedCourse) return [];
			return classes.filter(c => c.courseSourcedId === selectedCourse.sourcedId);
		}, [selectedCourse, classes]);

		/* ==================== VIEW 1: COURSE DETAIL ==================== */
		if (selectedCourse) {
			return h("div", { style: { display: "flex", flexDirection: "column", gap: "20px" } },
				// Top Action Bar
				h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
					h("button", {
						onClick: () => { setSelectedCourse(null); setMsg(null); },
						style: {
							background: "transparent", border: "none", color: T.labelTertiary,
							fontSize: "13px", cursor: "pointer", padding: "4px 0",
							display: "inline-flex", alignItems: "center", gap: "6px"
						},
						onMouseEnter: (e) => { e.currentTarget.style.color = T.labelPrimary; },
						onMouseLeave: (e) => { e.currentTarget.style.color = T.labelTertiary; }
					},
						Icons.ArrowLeft(14, "currentColor"),
						"Quay lại danh sách môn học"
					),
					h("div", { style: { display: "flex", gap: "8px" } },
						h("span", {
							style: {
								padding: "4px 12px", background: T.brandSoft, color: T.brand,
								borderRadius: "16px", fontSize: "12px", fontWeight: 500
							}
						}, `${courseClasses.length} lớp học phần`)
					)
				),

				// Course Banner Card
				h("div", {
					style: {
						background: T.card, border: `0.5px solid ${T.border}`, borderRadius: "12px",
						padding: "20px 24px"
					}
				},
					h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "14px" } },
						h("div", null,
							h("h1", { style: { margin: "0 0 6px", fontSize: "18px", fontWeight: 600, color: T.labelPrimary, lineHeight: "24px" } }, selectedCourse.title),
							h("p", { style: { margin: 0, fontSize: "13px", color: T.labelTertiary, lineHeight: "20px" } },
								`Năm học: ${selectedCourse.schoolYear || "Chưa xác định"} • Mã hệ thống: ${selectedCourse.sourcedId.slice(0, 12)}`
							)
						),
						h("div", { style: { display: "flex", gap: "8px", alignItems: "center" } },
							h("span", {
								style: {
									padding: "4px 10px", background: T.accentSoft, color: T.accent,
									borderRadius: "8px", fontSize: "12px", fontWeight: 500
								}
							}, `${caseItems.length} Chuẩn đầu ra (CLO)`),
							h("span", {
								style: {
									padding: "4px 10px", background: T.infoSoft, color: T.info,
									borderRadius: "8px", fontSize: "12px", fontWeight: 500
								}
							}, `${caseGraph && caseGraph.edges ? caseGraph.edges.length : 0} Tiên quyết`)
						)
					)
				),

				// Alert message
				msg ? h("div", {
					style: {
						padding: "8px 12px", borderRadius: "8px", fontSize: "13px",
						background: msg.ok ? T.accentSoft : T.dangerSoft,
						color: msg.ok ? T.accent : T.danger,
						border: `1px solid ${msg.ok ? "rgba(34,197,94,0.3)" : "rgba(242,90,90,0.3)"}`
					}
				}, msg.text) : null,

				// Sub-tabs navigation bar
				h("div", {
					style: {
						display: "flex", gap: "8px", borderBottom: `0.5px solid ${T.border}`,
						paddingBottom: "8px", overflowX: "auto"
					}
				},
					[
						{ id: "clos", label: "Chuẩn đầu ra (CLO)", icon: Icons.Target, count: caseItems.length },
						{ id: "graph", label: "Cây kỹ năng & Tiên quyết", icon: Icons.Tree, count: caseGraph && caseGraph.edges ? caseGraph.edges.length : 0 },
						{ id: "syllabus", label: "Đề cương phân bổ", icon: Icons.Syllabus, count: null },
						{ id: "materials", label: "Giáo trình & Học liệu (RAG)", icon: Icons.FileText, count: documents.length },
						{ id: "classes", label: "Lớp học phần đang mở", icon: Icons.Users, count: courseClasses.length },
					].map(tab => {
						const active = activeSubTab === tab.id;
						return h("button", {
							key: tab.id,
							onClick: () => { setActiveSubTab(tab.id); setMsg(null); },
							style: {
								display: "inline-flex", alignItems: "center", gap: "8px",
								padding: "8px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: 500,
								border: "none", cursor: "pointer", transition: "background 0.15s, color 0.15s",
								background: active ? T.cardHover : "transparent",
								color: active ? T.brand : T.labelSecondary,
								borderBottom: active ? `2px solid ${T.brand}` : "2px solid transparent"
							}
						},
							tab.icon(15, active ? T.brand : "currentColor"),
							tab.count !== null ? `${tab.label} (${tab.count})` : tab.label
						);
					})
				),

				// Check if CASE framework exists
				!caseDoc ? h("div", {
					style: {
						background: T.card, border: `0.5px solid ${T.border}`, borderRadius: "12px",
						padding: "36px 24px", textAlign: "center"
					}
				},
					h("div", { style: { display: "inline-flex", color: T.labelTertiary, marginBottom: "12px" } }, Icons.Tree(32, "currentColor")),
					h("h3", { style: { margin: "0 0 6px", fontSize: "15px", fontWeight: 600, color: T.labelPrimary } }, "Chưa thiết lập Khung năng lực & Cây kỹ năng"),
					h("p", { style: { margin: "0 0 18px", fontSize: "13px", color: T.labelTertiary } },
						"Môn học này chưa có khung chuẩn đầu ra (OpenCASE standard) để cấu trúc hóa các kỹ năng và tiên quyết."
					),
					h("button", {
						onClick: initFramework, disabled: busy,
						style: {
							display: "inline-flex", alignItems: "center", gap: "6px",
							padding: "8px 18px", background: T.brand, color: "#fff",
							border: "none", borderRadius: "8px", fontSize: "13px",
							fontWeight: 500, cursor: busy ? "not-allowed" : "pointer"
						},
						onMouseEnter: (e) => { if (!busy) e.currentTarget.style.background = T.brandHover; },
						onMouseLeave: (e) => { if (!busy) e.currentTarget.style.background = T.brand; }
					},
						Icons.Plus(14, "#fff"),
						busy ? "Đang thiết lập..." : "Khởi tạo khung năng lực (CASE Framework)"
					)
				) :

				/* TAB 1: CHUẨN ĐẦU RA (CLO & COMPETENCIES) */
				activeSubTab === "clos" ? h("div", { style: { display: "flex", flexDirection: "column", gap: "16px" } },
					// Action Bar: Add CLO Button
					h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
						h("div", null,
							h("h3", { style: { margin: "0 0 4px", fontSize: "15px", fontWeight: 600, color: T.labelPrimary } }, "Danh mục chuẩn đầu ra môn học (CLO)"),
							h("p", { style: { margin: 0, fontSize: "13px", color: T.labelTertiary } },
								"Các kỹ năng và kiến thức cốt lõi học sinh cần đạt được sau khi hoàn thành môn học."
							)
						),
						h("button", {
							onClick: () => setShowAddClo(!showAddClo),
							style: {
								display: "inline-flex", alignItems: "center", gap: "6px",
								padding: "6px 14px", background: T.brand, color: "#fff",
								border: "none", borderRadius: "8px", fontSize: "13px",
								fontWeight: 500, cursor: "pointer", transition: "background 0.15s"
							},
							onMouseEnter: (e) => { e.currentTarget.style.background = T.brandHover; },
							onMouseLeave: (e) => { e.currentTarget.style.background = T.brand; }
						},
							showAddClo ? Icons.X(14, "#fff") : Icons.Plus(14, "#fff"),
							showAddClo ? "Đóng" : "Thêm chuẩn đầu ra"
						)
					),

					// Form Add CLO
					showAddClo ? h("div", {
						style: {
							background: T.card, border: `0.5px solid ${T.border}`, borderRadius: "12px",
							padding: "20px 24px"
						}
					},
						h("h4", { style: { margin: "0 0 14px", fontSize: "14px", fontWeight: 600, color: T.labelPrimary } }, "Khai báo Chuẩn đầu ra mới"),
						h("form", { onSubmit: createClo, style: { display: "flex", flexDirection: "column", gap: "12px" } },
							h("div", { style: { display: "flex", gap: "12px", flexWrap: "wrap" } },
								h("div", { style: { flex: "1 1 140px" } },
									h("label", { style: { display: "block", fontSize: "12px", color: T.labelTertiary, marginBottom: "6px" } }, "Mã chuẩn (Code) *"),
									h("input", {
										value: newCloCode, onChange: e => setNewCloCode(e.target.value),
										placeholder: "Ví dụ: CLO.1, MATH.01",
										style: {
											width: "100%", padding: "8px 12px", background: T.field, border: `0.5px solid ${T.border}`,
											borderRadius: "8px", color: T.labelPrimary, fontSize: "13px", boxSizing: "border-box", outline: "none"
										}
									})
								),
								h("div", { style: { flex: "1 1 200px" } },
									h("label", { style: { display: "block", fontSize: "12px", color: T.labelTertiary, marginBottom: "6px" } }, "Cấp độ nhận thức (Bloom)"),
									h("select", {
										value: newCloLevel, onChange: e => setNewCloLevel(e.target.value),
										style: {
											width: "100%", padding: "8px 12px", background: T.field, border: `0.5px solid ${T.border}`,
											borderRadius: "8px", color: T.labelPrimary, fontSize: "13px", boxSizing: "border-box", outline: "none"
										}
									},
										h("option", { value: "Nhận biết (Remember)" }, "Nhận biết (Remember)"),
										h("option", { value: "Thông hiểu (Understand)" }, "Thông hiểu (Understand)"),
										h("option", { value: "Vận dụng (Apply)" }, "Vận dụng (Apply)"),
										h("option", { value: "Phân tích & Đánh giá (Analyze)" }, "Phân tích & Đánh giá (Analyze)")
									)
								)
							),
							h("div", null,
								h("label", { style: { display: "block", fontSize: "12px", color: T.labelTertiary, marginBottom: "6px" } }, "Nội dung chuẩn năng lực cần đạt *"),
								h("textarea", {
									value: newCloStatement, onChange: e => setNewCloStatement(e.target.value),
									rows: 3,
									placeholder: "Ví dụ: Giải được hệ phương trình đại số tuyến tính bằng phương pháp khử Gauss-Jordan.",
									style: {
										width: "100%", padding: "8px 12px", background: T.field, border: `0.5px solid ${T.border}`,
										borderRadius: "8px", color: T.labelPrimary, fontSize: "13px", boxSizing: "border-box", outline: "none", resize: "vertical"
									}
								})
							),
							h("div", { style: { display: "flex", justifyContent: "flex-end" } },
								h("button", {
									type: "submit", disabled: busy,
									style: {
										padding: "8px 18px", background: T.brand, color: "#fff",
										border: "none", borderRadius: "8px", fontSize: "13px",
										fontWeight: 500, cursor: busy ? "not-allowed" : "pointer"
									},
									onMouseEnter: (e) => { if (!busy) e.currentTarget.style.background = T.brandHover; },
									onMouseLeave: (e) => { if (!busy) e.currentTarget.style.background = T.brand; }
								}, busy ? "Đang lưu..." : "Lưu chuẩn đầu ra")
							)
						)
					) : null,

					// CLO Table
					h("div", {
						style: {
							background: T.card, border: `0.5px solid ${T.border}`, borderRadius: "12px",
							overflow: "hidden"
						}
					},
						caseItems.length === 0 ? h("div", { style: { textAlign: "center", padding: "40px", color: T.labelTertiary, fontSize: "13px" } },
							"Chưa có chuẩn đầu ra nào được định nghĩa. Nhấp 'Thêm chuẩn đầu ra' ở trên để bắt đầu."
						) :
							h("table", { style: { width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" } },
								h("thead", null,
									h("tr", { style: { borderBottom: `0.5px solid ${T.border}`, color: T.labelTertiary } },
										h("th", { style: { padding: "12px 16px", fontWeight: 500, fontSize: "12px", width: "120px" } }, "Mã chuẩn"),
										h("th", { style: { padding: "12px 16px", fontWeight: 500, fontSize: "12px" } }, "Phát biểu chuẩn năng lực (CLO Statement)"),
										h("th", { style: { padding: "12px 16px", fontWeight: 500, fontSize: "12px", width: "180px" } }, "Cấp độ nhận thức")
									)
								),
								h("tbody", null,
									caseItems.map(item => h("tr", {
										key: item.id,
										style: { borderBottom: `0.5px solid ${T.borderLight}` }
									},
										h("td", { style: { padding: "14px 16px", fontWeight: 600, color: T.brand, fontFamily: "monospace" } },
											item.humanCodingScheme || item.human_coding_scheme || "CLO"
										),
										h("td", { style: { padding: "14px 16px", color: T.labelPrimary, lineHeight: "20px" } },
											item.fullStatement || item.full_statement
										),
										h("td", { style: { padding: "14px 16px", color: T.labelSecondary } },
											h("span", {
												style: {
													padding: "3px 8px", background: "rgba(255,255,255,0.06)",
													borderRadius: "6px", fontSize: "12px", color: T.labelSecondary
												}
											}, item.description || "Vận dụng")
										)
									))
								)
							)
					)
				) :

				/* TAB 2: CÂY KỸ NĂNG & TIÊN QUYẾT (SKILL TREE DAG) */
				activeSubTab === "graph" ? h("div", { style: { display: "flex", flexDirection: "column", gap: "16px" } },
					// Action Bar: Add Prerequisite Relation
					h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
						h("div", null,
							h("h3", { style: { margin: "0 0 4px", fontSize: "15px", fontWeight: 600, color: T.labelPrimary } }, "Cây kỹ năng & Mối quan hệ tiên quyết (Directed Acyclic Graph)"),
							h("p", { style: { margin: 0, fontSize: "13px", color: T.labelTertiary } },
								"Xác định rõ kỹ năng nào là tiền đề bắt buộc phải nắm vững trước khi học kỹ năng kế tiếp."
							)
						),
						caseItems.length >= 2 ? h("button", {
							onClick: () => setShowAddPrereq(!showAddPrereq),
							style: {
								display: "inline-flex", alignItems: "center", gap: "6px",
								padding: "6px 14px", background: T.brand, color: "#fff",
								border: "none", borderRadius: "8px", fontSize: "13px",
								fontWeight: 500, cursor: "pointer", transition: "background 0.15s"
							},
							onMouseEnter: (e) => { e.currentTarget.style.background = T.brandHover; },
							onMouseLeave: (e) => { e.currentTarget.style.background = T.brand; }
						},
							showAddPrereq ? Icons.X(14, "#fff") : Icons.Link(14, "#fff"),
							showAddPrereq ? "Đóng" : "Gán quan hệ tiên quyết"
						) : null
					),

					// Form Add Prerequisite
					showAddPrereq ? h("div", {
						style: {
							background: T.card, border: `0.5px solid ${T.border}`, borderRadius: "12px",
							padding: "20px 24px"
						}
					},
						h("h4", { style: { margin: "0 0 12px", fontSize: "14px", fontWeight: 600, color: T.labelPrimary } }, "Thiết lập điều kiện tiên quyết (Prerequisite)"),
						h("form", { onSubmit: addPrerequisite, style: { display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" } },
							h("div", { style: { flex: "1 1 240px" } },
								h("label", { style: { display: "block", fontSize: "12px", color: T.labelTertiary, marginBottom: "6px" } }, "Kỹ năng tiên quyết (Học trước) *"),
								h("select", {
									value: prereqOrigin, onChange: e => setPrereqOrigin(e.target.value),
									style: {
										width: "100%", padding: "8px 12px", background: T.field, border: `0.5px solid ${T.border}`,
										borderRadius: "8px", color: T.labelPrimary, fontSize: "13px", boxSizing: "border-box", outline: "none"
									}
								},
									h("option", { value: "" }, "— Chọn kỹ năng làm tiền đề —"),
									caseItems.map(i => h("option", { key: i.id, value: i.id }, `${i.humanCodingScheme || i.human_coding_scheme || "CLO"}: ${(i.fullStatement || i.full_statement).slice(0, 45)}...`))
								)
							),
							h("div", { style: { flex: "1 1 240px" } },
								h("label", { style: { display: "block", fontSize: "12px", color: T.labelTertiary, marginBottom: "6px" } }, "Kỹ năng kế tiếp (Học sau) *"),
								h("select", {
									value: prereqDest, onChange: e => setPrereqDest(e.target.value),
									style: {
										width: "100%", padding: "8px 12px", background: T.field, border: `0.5px solid ${T.border}`,
										borderRadius: "8px", color: T.labelPrimary, fontSize: "13px", boxSizing: "border-box", outline: "none"
									}
								},
									h("option", { value: "" }, "— Chọn kỹ năng học sau —"),
									caseItems.map(i => h("option", { key: i.id, value: i.id }, `${i.humanCodingScheme || i.human_coding_scheme || "CLO"}: ${(i.fullStatement || i.full_statement).slice(0, 45)}...`))
								)
							),
							h("button", {
								type: "submit", disabled: busy,
								style: {
									padding: "8px 18px", background: T.brand, color: "#fff",
									border: "none", borderRadius: "8px", fontSize: "13px",
									fontWeight: 500, cursor: busy ? "not-allowed" : "pointer", height: "35px"
								},
								onMouseEnter: (e) => { if (!busy) e.currentTarget.style.background = T.brandHover; },
								onMouseLeave: (e) => { if (!busy) e.currentTarget.style.background = T.brand; }
							}, busy ? "Đang liên kết..." : "Tạo liên kết tiên quyết")
						)
					) : null,

					// Graph Progression View
					h("div", {
						style: {
							background: T.card, border: `0.5px solid ${T.border}`, borderRadius: "12px",
							padding: "20px 24px"
						}
					},
						caseItems.length === 0 ? h("div", { style: { textAlign: "center", padding: "30px", color: T.labelTertiary, fontSize: "13px" } },
							"Chưa có nút kỹ năng nào. Vui lòng thêm Chuẩn đầu ra ở Tab 1 trước."
						) :
							h("div", { style: { display: "flex", flexDirection: "column", gap: "10px" } },
								caseItems.map((item, idx) => {
									// Find prerequisites for this item from graph edges
									const prereqEdges = caseGraph && caseGraph.edges ? caseGraph.edges.filter(e => e.target === item.id) : [];
									const prereqItemNames = prereqEdges.map(e => {
										const found = caseItems.find(it => it.id === e.source);
										return found ? (found.humanCodingScheme || found.human_coding_scheme || "CLO") : e.source;
									});

									return h("div", {
										key: item.id,
										style: {
											display: "flex", alignItems: "center", gap: "14px",
											padding: "14px 18px", background: T.field, border: `0.5px solid ${T.borderLight}`,
											borderRadius: "10px"
										}
									},
										h("div", {
											style: {
												width: "32px", height: "32px", borderRadius: "8px",
												display: "grid", placeItems: "center", fontSize: "12px", fontWeight: 600,
												background: prereqEdges.length === 0 ? T.accentSoft : "rgba(255,255,255,0.06)",
												color: prereqEdges.length === 0 ? T.accent : T.labelSecondary
											}
										}, String(idx + 1)),
										h("div", { style: { flex: 1 } },
											h("div", { style: { display: "flex", alignItems: "center", gap: "8px" } },
												h("span", { style: { fontSize: "12px", fontWeight: 600, color: T.brand, fontFamily: "monospace" } },
													item.humanCodingScheme || item.human_coding_scheme || "CLO"
												),
												h("span", { style: { fontSize: "14px", fontWeight: 600, color: T.labelPrimary } },
													item.fullStatement || item.full_statement
												)
											),
											h("div", { style: { fontSize: "12px", color: T.labelTertiary, marginTop: "4px" } },
												prereqItemNames.length > 0 ?
													`Yêu cầu nắm vững trước: ${prereqItemNames.join(", ")}` :
													"Kỹ năng nền tảng (Bắt đầu học ngay, không có tiền đề)"
											)
										),
										h("div", null,
											h("span", {
												style: {
													padding: "4px 10px", borderRadius: "10px", fontSize: "11px", fontWeight: 500,
													background: prereqEdges.length === 0 ? T.accentSoft : T.infoSoft,
													color: prereqEdges.length === 0 ? T.accent : T.info
												}
											}, prereqEdges.length === 0 ? "Nền tảng" : `${prereqEdges.length} Tiên quyết`)
										)
									);
								})
							)
					)
				) :

				/* TAB 3: ĐỀ CƯƠNG PHÂN BỔ (SYLLABUS & MODULES) */
				activeSubTab === "syllabus" ? h("div", {
					style: {
						background: T.card, border: `0.5px solid ${T.border}`, borderRadius: "12px",
						padding: "20px 24px"
					}
				},
					h("h3", { style: { margin: "0 0 4px", fontSize: "15px", fontWeight: 600, color: T.labelPrimary } }, "Đề cương phân bổ bài học (Course Outline / Syllabus)"),
					h("p", { style: { margin: "0 0 16px", fontSize: "13px", color: T.labelTertiary } },
						"Cấu trúc cây phân cấp Chương / Bài giảng và sự phân bổ các Chuẩn đầu ra tương ứng theo từng giai đoạn."
					),
					caseItems.length === 0 ? h("div", { style: { textAlign: "center", padding: "30px", color: T.labelTertiary, fontSize: "13px" } }, "Chưa có chuẩn đầu ra nào được thiết lập.") :
						h("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } },
							(() => {
								const isMathLA = caseItems.some(it => (it.humanCodingScheme || it.human_coding_scheme || "").startsWith("MATH.LA."));
								const chapters = isMathLA ? [
									{ chapter: "Chương 1: Ma trận & Hệ phương trình đại số tuyến tính", range: "Tuần 1 – Tuần 4 (12 tiết lý thuyết + bài tập)", items: caseItems.filter(it => ["MATH.LA.01", "MATH.LA.02", "MATH.LA.03"].includes(it.humanCodingScheme || it.human_coding_scheme)) },
									{ chapter: "Chương 2: Định thức (Determinant) & Ma trận nghịch đảo", range: "Tuần 5 – Tuần 7 (9 tiết lý thuyết + bài tập)", items: caseItems.filter(it => ["MATH.LA.04", "MATH.LA.05"].includes(it.humanCodingScheme || it.human_coding_scheme)) },
									{ chapter: "Chương 3: Không gian vector Euclide & 4 Không gian con cơ bản", range: "Tuần 8 – Tuần 11 (12 tiết lý thuyết + thảo luận)", items: caseItems.filter(it => ["MATH.LA.06", "MATH.LA.07"].includes(it.humanCodingScheme || it.human_coding_scheme)) },
									{ chapter: "Chương 4: Trị riêng, Vector riêng & Phép biến đổi trực giao", range: "Tuần 12 – Tuần 14 (9 tiết lý thuyết + thực hành máy)", items: caseItems.filter(it => ["MATH.LA.08", "MATH.LA.09"].includes(it.humanCodingScheme || it.human_coding_scheme)) },
									{ chapter: "Chương 5: Phân tích SVD & Ứng dụng khoa học dữ liệu", range: "Tuần 15 (3 tiết tổng kết chuyên đề)", items: caseItems.filter(it => ["MATH.LA.10"].includes(it.humanCodingScheme || it.human_coding_scheme)) },
								] : [
									{ chapter: "Chương 1: Kiến thức nền tảng & Cơ sở lý thuyết", range: "Tuần 1 – Tuần 4", items: caseItems.slice(0, Math.max(1, Math.ceil(caseItems.length / 3))) },
									{ chapter: "Chương 2: Các phương pháp tính toán & Ứng dụng trọng tâm", range: "Tuần 5 – Tuần 9", items: caseItems.slice(Math.max(1, Math.ceil(caseItems.length / 3)), Math.ceil((caseItems.length * 2) / 3)) },
									{ chapter: "Chương 3: Tổng hợp chuyên sâu & Đánh giá năng lực cuối kỳ", range: "Tuần 10 – Tuần 15", items: caseItems.slice(Math.ceil((caseItems.length * 2) / 3)) },
								];

								return chapters.filter(g => g.items.length > 0).map((grp, idx) => h("div", {
									key: idx,
									style: {
										background: T.field, border: `0.5px solid ${T.borderLight}`, borderRadius: "10px",
										padding: "16px"
									}
								},
									h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" } },
										h("h4", { style: { margin: 0, fontSize: "14px", fontWeight: 600, color: T.labelPrimary } }, grp.chapter),
										h("span", { style: { fontSize: "12px", color: T.labelTertiary } }, grp.range)
									),
									h("div", { style: { display: "flex", flexDirection: "column", gap: "6px" } },
										grp.items.map(it => h("div", {
											key: it.id,
											style: {
												display: "flex", alignItems: "center", gap: "8px", fontSize: "13px",
												color: T.labelSecondary, padding: "4px 8px", background: "rgba(255,255,255,0.03)", borderRadius: "6px"
											}
										},
											h("span", { style: { color: T.brand, fontWeight: 600, fontSize: "12px", fontFamily: "monospace" } },
												it.humanCodingScheme || it.human_coding_scheme || "CLO"
											),
											h("span", null, it.fullStatement || it.full_statement)
										))
									)
								));
							})()
						)
				) :

				/* TAB 4: HỌC LIỆU & GIÁO TRÌNH (RAG INGESTION) */
				activeSubTab === "materials" ? h("div", { style: { display: "flex", flexDirection: "column", gap: "16px" } },
					h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
						h("div", null,
							h("h3", { style: { margin: "0 0 4px", fontSize: "15px", fontWeight: 600, color: T.labelPrimary } }, "Kho học liệu & Giáo trình liên kết"),
							h("p", { style: { margin: 0, fontSize: "13px", color: T.labelTertiary } },
								"Tài liệu bài giảng (PDF, Slide) được RAG phân tích để cắt chunks và gắn vào từng nút kỹ năng."
							)
						),
						h("button", {
							onClick: () => setShowAddDoc(!showAddDoc),
							style: {
								display: "inline-flex", alignItems: "center", gap: "6px",
								padding: "6px 14px", background: T.brand, color: "#fff",
								border: "none", borderRadius: "8px", fontSize: "13px",
								fontWeight: 500, cursor: "pointer", transition: "background 0.15s"
							},
							onMouseEnter: (e) => { e.currentTarget.style.background = T.brandHover; },
							onMouseLeave: (e) => { e.currentTarget.style.background = T.brand; }
						},
							showAddDoc ? Icons.X(14, "#fff") : Icons.Plus(14, "#fff"),
							showAddDoc ? "Đóng" : "Nạp tài liệu vào RAG"
						)
					),

					showAddDoc ? h("div", {
						style: {
							background: T.card, border: `0.5px solid ${T.border}`, borderRadius: "12px",
							padding: "20px 24px"
						}
					},
						h("h4", { style: { margin: "0 0 12px", fontSize: "14px", fontWeight: 600, color: T.labelPrimary } }, "Gắn tài liệu giáo trình vào môn học"),
						h("form", { onSubmit: createDocument, style: { display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" } },
							h("div", { style: { flex: "1 1 240px" } },
								h("label", { style: { display: "block", fontSize: "12px", color: T.labelTertiary, marginBottom: "6px" } }, "Tên tài liệu / Giáo trình *"),
								h("input", {
									value: newDocTitle, onChange: e => setNewDocTitle(e.target.value),
									placeholder: "Ví dụ: Giáo trình Toán Cao Cấp Tập 1",
									style: {
										width: "100%", padding: "8px 12px", background: T.field, border: `0.5px solid ${T.border}`,
										borderRadius: "8px", color: T.labelPrimary, fontSize: "13px", boxSizing: "border-box", outline: "none"
									}
								})
							),
							h("div", { style: { flex: "1 1 200px" } },
								h("label", { style: { display: "block", fontSize: "12px", color: T.labelTertiary, marginBottom: "6px" } }, "Đường dẫn file / URI"),
								h("input", {
									value: newDocUri, onChange: e => setNewDocUri(e.target.value),
									placeholder: "Ví dụ: /data/math_course.pdf",
									style: {
										width: "100%", padding: "8px 12px", background: T.field, border: `0.5px solid ${T.border}`,
										borderRadius: "8px", color: T.labelPrimary, fontSize: "13px", boxSizing: "border-box", outline: "none"
									}
								})
							),
							h("button", {
								type: "submit", disabled: busy,
								style: {
									padding: "8px 16px", background: T.brand, color: "#fff",
									border: "none", borderRadius: "8px", fontSize: "13px",
									fontWeight: 500, cursor: busy ? "not-allowed" : "pointer", height: "35px"
								},
								onMouseEnter: (e) => { if (!busy) e.currentTarget.style.background = T.brandHover; },
								onMouseLeave: (e) => { if (!busy) e.currentTarget.style.background = T.brand; }
							}, busy ? "Đang lưu..." : "Lưu vào kho tài liệu")
						)
					) : null,

					h("div", {
						style: {
							background: T.card, border: `0.5px solid ${T.border}`, borderRadius: "12px",
							overflow: "hidden"
						}
					},
						documents.length === 0 ? h("div", { style: { textAlign: "center", padding: "30px", color: T.labelTertiary, fontSize: "13px" } },
							"Chưa có tài liệu nào được nạp cho môn học này."
						) :
							h("table", { style: { width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" } },
								h("thead", null,
									h("tr", { style: { borderBottom: `0.5px solid ${T.border}`, color: T.labelTertiary } },
										h("th", { style: { padding: "12px 16px", fontWeight: 500, fontSize: "12px" } }, "Tài liệu / Giáo trình"),
										h("th", { style: { padding: "12px 16px", fontWeight: 500, fontSize: "12px" } }, "Mã tài liệu / URI"),
										h("th", { style: { padding: "12px 16px", fontWeight: 500, fontSize: "12px" } }, "Trạng thái bóc tách RAG")
									)
								),
								h("tbody", null,
									documents.map(d => h("tr", {
										key: d.id,
										style: { borderBottom: `0.5px solid ${T.borderLight}` }
									},
										h("td", { style: { padding: "12px 16px", fontWeight: 500, color: T.labelPrimary } }, d.title || "Tài liệu không tên"),
										h("td", { style: { padding: "12px 16px", color: T.labelTertiary, fontFamily: "monospace", fontSize: "12px" } }, d.uri || d.id),
										h("td", { style: { padding: "12px 16px" } },
											h("span", {
												style: {
													padding: "3px 8px", borderRadius: "6px", fontSize: "11px",
													background: T.accentSoft, color: T.accent, fontWeight: 500
												}
											}, "Khả dụng trong RAG")
										)
									))
								)
							)
					)
				) :

				/* TAB 5: LỚP HỌC PHẦN LIÊN KẾT */
				activeSubTab === "classes" ? h("div", {
					style: {
						background: T.card, border: `0.5px solid ${T.border}`, borderRadius: "12px",
						padding: "20px 24px"
					}
				},
					h("h3", { style: { margin: "0 0 16px", fontSize: "15px", fontWeight: 600, color: T.labelPrimary } }, "Các lớp học phần đang giảng dạy môn này"),
					courseClasses.length === 0 ? h("div", { style: { textAlign: "center", padding: "30px", color: T.labelTertiary, fontSize: "13px" } },
						"Chưa có lớp học nào liên kết với môn học này. Hãy sang tab 'Lớp học' để tạo lớp và chọn môn này."
					) :
						h("div", {
							style: {
								display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
								gap: "12px"
							}
						},
							courseClasses.map(c => h("div", {
								key: c.sourcedId,
								style: {
									background: T.field, border: `0.5px solid ${T.borderLight}`, borderRadius: "10px",
									padding: "16px"
								}
							},
								h("h4", { style: { margin: "0 0 6px", fontSize: "14px", fontWeight: 600, color: T.labelPrimary } }, c.title),
								h("p", { style: { margin: 0, fontSize: "12px", color: T.labelTertiary } }, c.term ? `Học kỳ: ${c.term}` : "Chưa đặt kỳ")
							))
						)
				) : null
			);
		}

		/* ==================== VIEW 2: COURSE LIST ==================== */
		return h("div", { style: { display: "flex", flexDirection: "column", gap: "20px" } },
			// Toolbar: Search + Create Course CTA Button
			h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" } },
				h("div", { style: { position: "relative", width: "300px", maxWidth: "100%" } },
					h("input", {
						value: search, onChange: e => setSearch(e.target.value),
						placeholder: "Tìm kiếm môn học...",
						style: {
							width: "100%", padding: "8px 12px 8px 34px", background: T.card, border: `0.5px solid ${T.border}`,
							borderRadius: "8px", color: T.labelPrimary, fontSize: "13px", outline: "none",
							boxSizing: "border-box"
						}
					}),
					h("div", {
						style: {
							position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)",
							color: T.labelTertiary, pointerEvents: "none", display: "flex", alignItems: "center"
						}
					}, Icons.Search(14, "currentColor"))
				),
				h("div", { style: { display: "flex", gap: "10px" } },
					h("button", {
						onClick: () => setShowCreateCourse(!showCreateCourse),
						style: {
							display: "inline-flex", alignItems: "center", gap: "6px",
							padding: "8px 16px", background: T.brand, color: "#fff",
							border: "none", borderRadius: "8px", fontSize: "13px",
							fontWeight: 500, cursor: "pointer", transition: "background 0.15s"
						},
						onMouseEnter: (e) => { e.currentTarget.style.background = T.brandHover; },
						onMouseLeave: (e) => { e.currentTarget.style.background = T.brand; }
					},
						showCreateCourse ? Icons.X(14, "#fff") : Icons.Plus(14, "#fff"),
						showCreateCourse ? "Đóng" : "Tạo môn học mới"
					)
				)
			),

			// Alert Message
			msg ? h("div", {
				style: {
					padding: "8px 12px", borderRadius: "8px", fontSize: "13px",
					background: msg.ok ? T.accentSoft : T.dangerSoft,
					color: msg.ok ? T.accent : T.danger,
					border: `1px solid ${msg.ok ? "rgba(34,197,94,0.3)" : "rgba(242,90,90,0.3)"}`
				}
			}, msg.text) : null,

			// System Error Banner
			error ? h("div", {
				style: {
					padding: "10px 14px", borderRadius: "8px", fontSize: "13px",
					background: T.dangerSoft, color: T.danger,
					border: "1px solid rgba(242,90,90,0.3)"
				}
			},
				h("p", { style: { margin: "0 0 4px", fontWeight: 600 } }, "Không thể tải danh sách môn học:"),
				h("p", { style: { margin: 0, color: T.labelSecondary } }, error)
			) : null,

			// Create Course Modal / Card
			showCreateCourse ? h("div", {
				style: {
					background: T.card, border: `0.5px solid ${T.border}`, borderRadius: "12px",
					padding: "20px", display: "flex", flexDirection: "column", gap: "14px"
				}
			},
				h("h3", { style: { margin: 0, fontSize: "15px", fontWeight: 600, color: T.labelPrimary } }, "Tạo môn học mới"),
				h("form", { onSubmit: createCourse, style: { display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" } },
					h("div", { style: { flex: "1 1 240px" } },
						h("label", { style: { display: "block", fontSize: "12px", color: T.labelTertiary, marginBottom: "6px" } }, "Tên môn học *"),
						h("input", {
							value: newTitle, onChange: e => setNewTitle(e.target.value),
							placeholder: "Ví dụ: Đại số tuyến tính, Lập trình Python, Vật lý đại cương",
							style: {
								width: "100%", padding: "8px 12px", background: T.field, border: `0.5px solid ${T.border}`,
								borderRadius: "8px", color: T.labelPrimary, fontSize: "13px", boxSizing: "border-box", outline: "none"
							}
						})
					),
					h("div", { style: { flex: "1 1 180px" } },
						h("label", { style: { display: "block", fontSize: "12px", color: T.labelTertiary, marginBottom: "6px" } }, "Năm học / Khóa"),
						h("input", {
							value: newSchoolYear, onChange: e => setNewSchoolYear(e.target.value),
							placeholder: "Ví dụ: 2026-2027",
							style: {
								width: "100%", padding: "8px 12px", background: T.field, border: `0.5px solid ${T.border}`,
								borderRadius: "8px", color: T.labelPrimary, fontSize: "13px", boxSizing: "border-box", outline: "none"
							}
						})
					),
					h("button", {
						type: "submit", disabled: busy,
						style: {
							padding: "8px 18px", background: T.brand, color: "#fff",
							border: "none", borderRadius: "8px", fontSize: "13px",
							fontWeight: 500, cursor: busy ? "not-allowed" : "pointer", height: "35px",
							transition: "background 0.15s"
						},
						onMouseEnter: (e) => { if (!busy) e.currentTarget.style.background = T.brandHover; },
						onMouseLeave: (e) => { if (!busy) e.currentTarget.style.background = T.brand; }
					}, busy ? "Đang lưu..." : "Lưu môn học")
				)
			) : null,

			// Course Cards Grid
			courses === null ? h("div", { style: { textAlign: "center", padding: "40px", color: T.labelTertiary, fontSize: "13px" } }, "Đang tải danh sách môn học...") :
				filteredCourses.length === 0 ? h("div", {
					style: {
						textAlign: "center", padding: "48px 20px", background: T.card,
						border: `0.5px solid ${T.border}`, borderRadius: "12px"
					}
				},
					h("div", { style: { display: "inline-flex", color: T.labelTertiary, marginBottom: "12px" } }, Icons.Book(32, "currentColor")),
					h("h3", { style: { margin: "0 0 4px", fontSize: "15px", fontWeight: 600, color: T.labelPrimary } }, "Chưa có môn học nào"),
					h("p", { style: { margin: "0 0 16px", fontSize: "13px", color: T.labelTertiary } },
						"Bắt đầu tạo môn học đầu tiên để thiết lập chuẩn đầu ra (CLO), cây kỹ năng và tài liệu."
					),
					h("button", {
						onClick: () => setShowCreateCourse(true),
						style: {
							display: "inline-flex", alignItems: "center", gap: "6px",
							padding: "8px 16px", background: T.brand, color: "#fff",
							border: "none", borderRadius: "8px", fontSize: "13px",
							fontWeight: 500, cursor: "pointer", transition: "background 0.15s"
						},
						onMouseEnter: (e) => { e.currentTarget.style.background = T.brandHover; },
						onMouseLeave: (e) => { e.currentTarget.style.background = T.brand; }
					},
						Icons.Plus(14, "#fff"),
						"Tạo môn học ngay"
					)
				) :
				h("div", {
					style: {
						display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
						gap: "14px"
					}
				},
					filteredCourses.map(c => {
						const linkedClasses = classes.filter(cls => cls.courseSourcedId === c.sourcedId);
						return h("div", {
							key: c.sourcedId,
							onClick: () => { setSelectedCourse(c); setActiveSubTab("clos"); setMsg(null); },
							style: {
								background: T.card, border: `0.5px solid ${T.border}`, borderRadius: "12px",
								padding: "16px 18px", cursor: "pointer", transition: "border-color 0.16s, background 0.16s",
								display: "flex", flexDirection: "column", justifyContent: "space-between",
								minHeight: "120px"
							},
							onMouseEnter: (e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; e.currentTarget.style.background = T.cardHover; },
							onMouseLeave: (e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.card; }
						},
							h("div", null,
								h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" } },
									h("h4", { style: { margin: 0, fontSize: "15px", fontWeight: 600, color: T.labelPrimary, lineHeight: "20px" } }, c.title),
									h("span", {
										style: {
											fontSize: "12px", padding: "2px 8px", borderRadius: "10px",
											background: T.brandSoft, color: T.brand, fontWeight: 500
										}
									}, `${linkedClasses.length} Lớp`)
								),
								h("p", { style: { margin: "0 0 10px", fontSize: "13px", color: T.labelTertiary, lineHeight: "18px" } },
									c.schoolYear ? `Năm học: ${c.schoolYear}` : "Chưa xác định năm học"
								)
							),
							h("div", {
								style: {
									display: "flex", justifyContent: "space-between", alignItems: "center",
									paddingTop: "10px", borderTop: `0.5px solid ${T.borderLight}`, fontSize: "12px"
								}
							},
								h("span", { style: { color: T.labelTertiary } }, "Xem chuẩn CLO & cây kỹ năng"),
								h("span", {
									style: {
										color: T.brand, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: "4px"
									}
								},
									"Chi tiết",
									Icons.ArrowRight(12, T.brand)
								)
							)
						);
					})
				)
		);
	}

	function SidebarIcon(props) {
		const active = Boolean(props && props.active);
		return h("span", { style: { display: "inline-flex", alignItems: "center", color: active ? "#fd505a" : "inherit" } },
			Icons.Book(18, active ? "#fd505a" : "currentColor")
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
					maxWidth: "1100px",
					margin: "0 auto",
					padding: "24px 32px 64px",
					boxSizing: "border-box"
				}
			},
				h(PageHeader, null),
				h(CourseManagementPanel, null)
			)
		);
	}

	exports.name = NS;
	exports.inject = ["slots"];
	exports.apply = function apply(ctx) {
		ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
			name: "sidebar.panellist",
			id: NS,
			order: 21,
			label: "Môn học",
		}, SidebarIcon));

		ctx.slots.inject("main", () => ctx.slots.register({
			name: "main",
			key: NS,
		}, MainPanel));
	};

	return module.exports;
}});
