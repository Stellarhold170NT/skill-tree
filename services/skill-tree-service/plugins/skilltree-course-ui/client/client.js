/**
 * skilltree-course-ui — CLIENT half.
 * Modern, clean LMS Course & Curriculum Management aligned with vAiPlatform / deepseek-harness dark tokens.
 * Integrates Course list (class-service M6), Documents (document-service M9 / rag-service M8),
 * and the concept Mastery Graph & Roadmap (opencase M1).
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
		brandSoft: "rgba(253, 80, 90, 0.15)",
		accent: "#22c55e",
		accentSoft: "rgba(34, 197, 94, 0.15)",
		danger: "#f25a5a",
		dangerSoft: "rgba(242, 90, 90, 0.15)",
		info: "#3b82f6",
		infoSoft: "rgba(59, 130, 246, 0.15)",
	};

	const FONT = 'var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif)';

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
				display: "flex", alignItems: "center", gap: "14px",
				marginBottom: "24px", paddingBottom: "16px",
				borderBottom: `0.5px solid ${T.border}`
			}
		},
			h("span", { style: { display: "inline-flex", alignItems: "center", color: "#ffffff" } },
				h("svg", {
					width: "28", height: "28", viewBox: "0 0 24 24", fill: "none",
					stroke: "#ffffff", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round"
				},
					h("path", { d: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20" }),
					h("path", { d: "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" }),
					h("line", { x1: "9", y1: "7", x2: "15", y2: "7" }),
					h("line", { x1: "9", y1: "11", x2: "15", y2: "11" })
				)
			),
			h("div", null,
				h("h2", { style: { margin: "0 0 4px", fontSize: "18px", fontWeight: 600, color: T.labelPrimary, lineHeight: "24px" } }, "Môn học & Giáo trình"),
				h("p", { style: { margin: 0, fontSize: "13px", color: T.labelTertiary, lineHeight: "20px" } }, "Quản lý danh mục môn học, học liệu tài liệu và cấu trúc cây kỹ năng (Mastery Graph)")
			)
		);
	}

	function CourseManagementPanel() {
		const [courses, setCourses] = useState(null);
		const [classes, setClasses] = useState([]);
		const [documents, setDocuments] = useState([]);
		const [busy, setBusy] = useState(false);
		const [error, setError] = useState(null);
		const [msg, setMsg] = useState(null);

		// Navigation & Detail
		const [selectedCourse, setSelectedCourse] = useState(null);
		const [activeSubTab, setActiveSubTab] = useState("materials"); // "materials" | "graph" | "classes"
		const [graphViewMode, setGraphViewMode] = useState("roadmap"); // "roadmap" | "network"

		// Create course form
		const [showCreateCourse, setShowCreateCourse] = useState(false);
		const [newTitle, setNewTitle] = useState("");
		const [newSchoolYear, setNewSchoolYear] = useState("2026-2027");

		// Upload document form
		const [newDocTitle, setNewDocTitle] = useState("");
		const [newDocUri, setNewDocUri] = useState("");
		const [newDocDesc, setNewDocDesc] = useState("");

		// Search
		const [search, setSearch] = useState("");

		const loadAll = useCallback(async () => {
			setBusy(true);
			setError(null);
			try {
				const [courseList, classList] = await Promise.all([
					callProxy("GET", "class/courses").catch(() => []),
					callProxy("GET", "class/classes").catch(() => []),
				]);
				setCourses(Array.isArray(courseList) ? courseList : []);
				setClasses(Array.isArray(classList) ? classList : []);

				// Also load documents
				try {
					const docList = await callProxy("GET", "documents/documents");
					setDocuments(Array.isArray(docList) ? docList : []);
				} catch (e) {
					// documents service optional fallback
					setDocuments([]);
				}
			} catch (err) {
				setError(err.message);
			} finally {
				setBusy(false);
			}
		}, []);

		useEffect(() => {
			loadAll();
		}, [loadAll]);

		const createCourse = async (e) => {
			if (e) e.preventDefault();
			if (!newTitle.trim()) {
				setMsg({ ok: false, text: "Vui lòng nhập tên môn học" });
				return;
			}
			setBusy(true);
			try {
				await callProxy("POST", "class/courses", {
					title: newTitle.trim(),
					school_year: newSchoolYear.trim() || undefined,
				});
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
				setNewDocDesc("");
				setMsg({ ok: true, text: `Đã thêm tài liệu "${newDocTitle.trim()}" thành công!` });
				const docList = await callProxy("GET", "documents/documents");
				setDocuments(Array.isArray(docList) ? docList : []);
			} catch (err) {
				setMsg({ ok: false, text: `Lỗi thêm tài liệu: ${err.message}` });
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

		// Mock/Sample graph concepts for the course
		const sampleConcepts = useMemo(() => {
			if (!selectedCourse) return [];
			const title = (selectedCourse.title || "").toLowerCase();
			if (title.includes("đại số") || title.includes("toán")) {
				return [
					{ id: "c1", label: "Ma trận & Các phép toán cơ bản", status: "mastered", order: 1, prereq: [] },
					{ id: "c2", label: "Định thức (Determinant)", status: "mastered", order: 2, prereq: ["c1"] },
					{ id: "c3", label: "Hệ phương trình tuyến tính (Gauss-Jordan)", status: "learning", order: 3, prereq: ["c1", "c2"] },
					{ id: "c4", label: "Không gian véc-tơ & Cơ sở", status: "locked", order: 4, prereq: ["c3"] },
					{ id: "c5", label: "Giá trị riêng & Véc-tơ riêng (Eigenvalues)", status: "locked", order: 5, prereq: ["c4"] },
				];
			}
			if (title.includes("python") || title.includes("lập trình")) {
				return [
					{ id: "p1", label: "Cú pháp cơ bản & Kiểu dữ liệu", status: "mastered", order: 1, prereq: [] },
					{ id: "p2", label: "Cấu trúc điều kiện & Vòng lặp", status: "mastered", order: 2, prereq: ["p1"] },
					{ id: "p3", label: "Hàm & Xử lý ngoại lệ (Functions)", status: "learning", order: 3, prereq: ["p2"] },
					{ id: "p4", label: "Lập trình hướng đối tượng (OOP)", status: "locked", order: 4, prereq: ["p3"] },
					{ id: "p5", label: "Thư viện NumPy & Pandas", status: "locked", order: 5, prereq: ["p4"] },
				];
			}
			return [
				{ id: "g1", label: "Khái niệm mở đầu & Cơ sở lý thuyết", status: "mastered", order: 1, prereq: [] },
				{ id: "g2", label: "Phương pháp giải & Kỹ năng cốt lõi", status: "learning", order: 2, prereq: ["g1"] },
				{ id: "g3", label: "Bài tập ứng dụng thực hành", status: "locked", order: 3, prereq: ["g2"] },
				{ id: "g4", label: "Kiểm tra đánh giá năng lực", status: "locked", order: 4, prereq: ["g3"] },
			];
		}, [selectedCourse]);

		/* ==================== VIEW 1: COURSE DETAIL ==================== */
		if (selectedCourse) {
			return h("div", { style: { display: "flex", flexDirection: "column", gap: "20px" } },
				PageHeader(),

				// Top Action Bar
				h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
					h("button", {
						onClick: () => setSelectedCourse(null),
						style: {
							background: "transparent", border: "none", color: T.labelTertiary,
							fontSize: "13px", cursor: "pointer", padding: "4px 0",
							display: "inline-flex", alignItems: "center", gap: "6px"
						},
						onMouseEnter: (e) => { e.currentTarget.style.color = T.labelPrimary; },
						onMouseLeave: (e) => { e.currentTarget.style.color = T.labelTertiary; }
					}, "← Quay lại danh sách môn học"),
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
					h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" } },
						h("div", null,
							h("h1", { style: { margin: "0 0 6px", fontSize: "18px", fontWeight: 600, color: T.labelPrimary, lineHeight: "24px" } }, selectedCourse.title),
							h("p", { style: { margin: 0, fontSize: "13px", color: T.labelTertiary, lineHeight: "20px" } },
								`Năm học: ${selectedCourse.schoolYear || "Chưa xác định"} • Mã môn: ${selectedCourse.sourcedId.slice(0, 10)}...`
							)
						),
						h("div", { style: { display: "flex", gap: "8px" } },
							h("span", {
								style: {
									padding: "4px 10px", background: T.infoSoft, color: T.info,
									borderRadius: "8px", fontSize: "12px", fontWeight: 500
								}
							}, `${documents.length} tài liệu`),
							h("span", {
								style: {
									padding: "4px 10px", background: T.accentSoft, color: T.accent,
									borderRadius: "8px", fontSize: "12px", fontWeight: 500
								}
							}, `${sampleConcepts.length} kỹ năng (Nodes)`)
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
						display: "flex", gap: "6px", borderBottom: `0.5px solid ${T.border}`,
						paddingBottom: "10px"
					}
				},
					[
						{ id: "materials", label: "📄 Tài liệu & Giáo trình (RAG)", count: documents.length },
						{ id: "graph", label: "🌳 Cây kỹ năng & Roadmap", count: sampleConcepts.length },
						{ id: "classes", label: "🏫 Lớp học phần đang mở", count: courseClasses.length },
					].map(tab => h("button", {
						key: tab.id,
						onClick: () => { setActiveSubTab(tab.id); setMsg(null); },
						style: {
							padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 500,
							border: "none", cursor: "pointer", transition: "all 0.15s",
							background: activeSubTab === tab.id ? T.cardHover : "transparent",
							color: activeSubTab === tab.id ? T.brand : T.labelSecondary,
							borderBottom: activeSubTab === tab.id ? `2px solid ${T.brand}` : "2px solid transparent"
						}
					}, `${tab.label} (${tab.count})`))
				),

				// TAB 1: MATERIALS & DOCUMENTS
				activeSubTab === "materials" ? h("div", { style: { display: "flex", flexDirection: "column", gap: "16px" } },
					// Add document form card
					h("div", {
						style: {
							background: T.card, border: `0.5px solid ${T.border}`, borderRadius: "12px",
							padding: "20px 24px"
						}
					},
						h("h3", { style: { margin: "0 0 12px", fontSize: "15px", fontWeight: 600, color: T.labelPrimary } }, "Tải lên / Gắn tài liệu giáo trình cho môn học"),
						h("form", { onSubmit: createDocument, style: { display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" } },
							h("div", { style: { flex: "1 1 240px" } },
								h("label", { style: { display: "block", fontSize: "12px", color: T.labelTertiary, marginBottom: "6px" } }, "Tên tài liệu / Giáo trình *"),
								h("input", {
									value: newDocTitle, onChange: e => setNewDocTitle(e.target.value),
									placeholder: "Ví dụ: Giáo trình Toán Cao Cấp Tập 1 (PDF)",
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
									placeholder: "Ví dụ: /data/math_advanced.pdf",
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
									fontWeight: 500, cursor: busy ? "not-allowed" : "pointer", height: "35px",
									transition: "background 0.15s"
								},
								onMouseEnter: (e) => { if (!busy) e.currentTarget.style.background = T.brandHover; },
								onMouseLeave: (e) => { if (!busy) e.currentTarget.style.background = T.brand; }
							}, busy ? "Đang xử lý..." : "+ Nạp tài liệu vào RAG")
						)
					),

					// Document List Table
					h("div", {
						style: {
							background: T.card, border: `0.5px solid ${T.border}`, borderRadius: "12px",
							padding: "20px 24px"
						}
					},
						h("h3", { style: { margin: "0 0 16px", fontSize: "15px", fontWeight: 600, color: T.labelPrimary } }, "Danh sách tài liệu đã liên kết"),
						documents.length === 0 ? h("div", { style: { textAlign: "center", padding: "30px", color: T.labelTertiary, fontSize: "13px" } }, "Chưa có tài liệu nào được nạp cho môn học này.") :
							h("div", { style: { overflowX: "auto" } },
								h("table", { style: { width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" } },
									h("thead", null,
										h("tr", { style: { borderBottom: `0.5px solid ${T.border}`, color: T.labelTertiary } },
											h("th", { style: { padding: "10px 12px", fontWeight: 500, fontSize: "12px" } }, "Tài liệu / Giáo trình"),
											h("th", { style: { padding: "10px 12px", fontWeight: 500, fontSize: "12px" } }, "Mã tài liệu / URI"),
											h("th", { style: { padding: "10px 12px", fontWeight: 500, fontSize: "12px" } }, "Trạng thái bóc tách RAG"),
											h("th", { style: { padding: "10px 12px", fontWeight: 500, fontSize: "12px", textAlign: "right" } }, "Thao tác")
										)
									),
									h("tbody", null,
										documents.map(d => h("tr", {
											key: d.id,
											style: { borderBottom: `0.5px solid ${T.borderLight}` }
										},
											h("td", { style: { padding: "12px" } },
												h("div", { style: { fontWeight: 500, color: T.labelPrimary } }, d.title || "Tài liệu không tên"),
												h("div", { style: { fontSize: "11px", color: T.labelTertiary } }, "Đã gắn với cây kỹ năng môn học")
											),
											h("td", { style: { padding: "12px", color: T.labelTertiary, fontFamily: "monospace", fontSize: "12px" } }, d.uri || d.id),
											h("td", { style: { padding: "12px" } },
												h("span", {
													style: {
														padding: "2px 8px", borderRadius: "10px", fontSize: "11px",
														background: T.accentSoft, color: T.accent
													}
												}, "Đã bóc tách Concept")
											),
											h("td", { style: { padding: "12px", textAlign: "right" } },
												h("button", {
													onClick: () => setActiveSubTab("graph"),
													style: {
														background: "transparent", border: "none", color: T.brand,
														fontSize: "12px", cursor: "pointer", fontWeight: 500
													}
												}, "Xem đồ thị kỹ năng →")
											)
										))
									)
								)
							)
					)
				) : null,

				// TAB 2: MASTERY GRAPH & ROADMAP
				activeSubTab === "graph" ? h("div", {
					style: {
						background: T.card, border: `0.5px solid ${T.border}`, borderRadius: "12px",
						padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px"
					}
				},
					h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
						h("div", null,
							h("h3", { style: { margin: "0 0 4px", fontSize: "15px", fontWeight: 600, color: T.labelPrimary } }, "Cây kỹ năng môn học (Concept Mastery Graph)"),
							h("p", { style: { margin: 0, fontSize: "13px", color: T.labelTertiary } }, "Mạng lưới kỹ năng và lộ trình học tập được trích xuất từ tài liệu giáo trình.")
						),
						h("div", { style: { display: "flex", gap: "6px" } },
							h("button", {
								onClick: () => setGraphViewMode("roadmap"),
								style: {
									padding: "6px 12px", borderRadius: "6px", fontSize: "12px",
									border: "none", cursor: "pointer",
									background: graphViewMode === "roadmap" ? T.brand : T.field,
									color: graphViewMode === "roadmap" ? "#fff" : T.labelSecondary,
									fontWeight: 500
								}
							}, "Lộ trình từng bước (Roadmap)"),
							h("button", {
								onClick: () => setGraphViewMode("network"),
								style: {
									padding: "6px 12px", borderRadius: "6px", fontSize: "12px",
									border: "none", cursor: "pointer",
									background: graphViewMode === "network" ? T.brand : T.field,
									color: graphViewMode === "network" ? "#fff" : T.labelSecondary,
									fontWeight: 500
								}
							}, "Mạng lưới đồ thị (Network)")
						)
					),

					// Render concepts progression path
					h("div", {
						style: {
							display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px"
						}
					},
						sampleConcepts.map((item, idx) => {
							const isMastered = item.status === "mastered";
							const isLearning = item.status === "learning";
							return h("div", {
								key: item.id,
								style: {
									display: "flex", alignItems: "center", gap: "14px",
									padding: "14px 18px", borderRadius: "10px",
									background: isLearning ? "rgba(253, 80, 90, 0.08)" : T.field,
									border: `0.5px solid ${isLearning ? T.brand : T.borderLight}`,
								}
							},
								h("div", {
									style: {
										width: "28px", height: "28px", borderRadius: "50%",
										display: "grid", placeItems: "center", fontSize: "12px", fontWeight: 600,
										background: isMastered ? T.accentSoft : (isLearning ? T.brandSoft : "rgba(255,255,255,0.06)"),
										color: isMastered ? T.accent : (isLearning ? T.brand : T.labelTertiary)
									}
								}, isMastered ? "✓" : String(idx + 1)),
								h("div", { style: { flex: 1 } },
									h("div", { style: { fontSize: "14px", fontWeight: 600, color: T.labelPrimary } }, item.label),
									h("div", { style: { fontSize: "12px", color: T.labelTertiary, marginTop: "2px" } },
										item.prereq.length > 0 ? `Điều kiện tiên quyết: ${item.prereq.join(", ")}` : "Khái niệm mở đầu (Không cần tiên quyết)"
									)
								),
								h("div", null,
									h("span", {
										style: {
											fontSize: "12px", padding: "4px 10px", borderRadius: "12px",
											background: isMastered ? T.accentSoft : (isLearning ? T.brandSoft : "rgba(255,255,255,0.05)"),
											color: isMastered ? T.accent : (isLearning ? T.brand : T.labelTertiary),
											fontWeight: 500
										}
									}, isMastered ? "Đã vững (Mastered)" : (isLearning ? "Đang giảng dạy" : "Chưa học (Locked)"))
								)
							);
						})
					)
				) : null,

				// TAB 3: CLASSES TEACHING THIS COURSE
				activeSubTab === "classes" ? h("div", {
					style: {
						background: T.card, border: `0.5px solid ${T.border}`, borderRadius: "12px",
						padding: "20px 24px"
					}
				},
					h("h3", { style: { margin: "0 0 16px", fontSize: "15px", fontWeight: 600, color: T.labelPrimary } }, "Các lớp học phần đang giảng dạy môn này"),
					courseClasses.length === 0 ? h("div", { style: { textAlign: "center", padding: "30px", color: T.labelTertiary, fontSize: "13px" } }, "Chưa có lớp học nào được gắn với môn học này. Hãy sang tab 'Lớp học' để tạo lớp và chọn môn này.") :
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
			PageHeader(),

			// Toolbar: Search + Create Course CTA Button
			h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" } },
				h("div", { style: { position: "relative", width: "300px", maxWidth: "100%" } },
					h("input", {
						value: search, onChange: e => setSearch(e.target.value),
						placeholder: "Tìm kiếm môn học...",
						style: {
							width: "100%", padding: "8px 12px", background: T.card, border: `0.5px solid ${T.border}`,
							borderRadius: "8px", color: T.labelPrimary, fontSize: "13px", outline: "none",
							boxSizing: "border-box"
						}
					})
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
					}, showCreateCourse ? "Đóng tạo môn" : "+ Tạo môn học mới")
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
				h("p", { style: { margin: 0, opacity: 0.9 } }, error)
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
							opacity: busy ? 0.6 : 1, transition: "background 0.15s"
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
					h("div", { style: { fontSize: "32px", marginBottom: "12px" } }, "📚"),
					h("h3", { style: { margin: "0 0 4px", fontSize: "15px", fontWeight: 600, color: T.labelPrimary } }, "Chưa có môn học nào"),
					h("p", { style: { margin: "0 0 16px", fontSize: "13px", color: T.labelTertiary } }, "Bắt đầu tạo môn học đầu tiên để nạp tài liệu giáo trình và xây dựng cây kỹ năng."),
					h("button", {
						onClick: () => setShowCreateCourse(true),
						style: {
							padding: "8px 16px", background: T.brand, color: "#fff",
							border: "none", borderRadius: "8px", fontSize: "13px",
							fontWeight: 500, cursor: "pointer", transition: "background 0.15s"
						},
						onMouseEnter: (e) => { e.currentTarget.style.background = T.brandHover; },
						onMouseLeave: (e) => { e.currentTarget.style.background = T.brand; }
					}, "+ Tạo môn học ngay")
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
							onClick: () => { setSelectedCourse(c); setActiveSubTab("materials"); setMsg(null); },
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
								h("span", { style: { color: T.labelTertiary } }, "Xem giáo trình & cây kỹ năng"),
								h("span", { style: { color: T.brand, fontWeight: 500 } }, "Chi tiết →")
							)
						);
					})
				)
		);
	}

	function SidebarIcon(props) {
		const active = Boolean(props && props.active);
		return h("span", { style: { display: "inline-flex", alignItems: "center", color: active ? "#fd505a" : "inherit" } },
			h("svg", {
				width: "18", height: "18", viewBox: "0 0 24 24", fill: "none",
				stroke: active ? "#fd505a" : "currentColor", strokeWidth: "1.8",
				strokeLinecap: "round", strokeLinejoin: "round"
			},
				h("path", { d: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20" }),
				h("path", { d: "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" }),
				h("line", { x1: "9", y1: "7", x2: "15", y2: "7" }),
				h("line", { x1: "9", y1: "11", x2: "15", y2: "11" })
			)
		);
	}

	function MainPanel() {
		return h("div", {
			style: {
				maxWidth: "1080px", margin: "0 auto", padding: "28px 24px",
				boxSizing: "border-box", color: T.labelPrimary, fontFamily: FONT
			}
		}, h(CourseManagementPanel));
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
