/**
 * skilltree-class-ui — CLIENT half (no build step; platform module format).
 * Modern, clean LMS Class Management for teachers aligned with vAiPlatform design.
 * Integrates seamlessly with class-service (M6) and api-gateway (M10).
 */
window.__ModuleLoader__.load({ id: "skilltree-class-ui", factory: (require) => {
	var module = { exports: {} };
	var exports = module.exports;
	const react = require("react");
	const { createElement: h, useState, useEffect, useCallback, useMemo } = react;

	const NS = "skilltree-class-ui";
	const AUTH_STORAGE_KEY = "skilltree.auth.v1";
	const GATEWAY_STORAGE_KEY = "skilltree.auth.gateway";

	/* ---- Modern Dark/vAiPlatform Design Tokens ---- */
	const T = {
		bg: "#151517",
		card: "#1e1f23",
		cardHover: "#26282e",
		field: "#25262b",
		border: "rgba(255, 255, 255, 0.1)",
		borderFocus: "rgba(253, 80, 90, 0.5)",
		label: "#f9fafb",
		labelMuted: "#9ca3af",
		labelSubtle: "#6b7280",
		brand: "#fd505a",
		brandHover: "#e0444e",
		brandSoft: "rgba(253, 80, 90, 0.15)",
		accent: "#22c55e",
		accentSoft: "rgba(34, 197, 94, 0.15)",
		danger: "#ef4444",
		dangerSoft: "rgba(239, 68, 68, 0.15)",
	};

	const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Arial, sans-serif';

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
			const custom = localStorage.getItem(GATEWAY_STORAGE_KEY);
			if (custom && /^https?:\/\//i.test(custom)) return custom.trim();
		} catch (e) {}
		return "http://api-gateway:8000";
	}

	function courseTitle(courses, courseSourcedId) {
		if (!courseSourcedId) return "— Chưa gắn khóa học —";
		const found = (courses || []).find((c) => c.sourcedId === courseSourcedId);
		return found ? found.title : courseSourcedId;
	}

	function Panel() {
		const [classes, setClasses] = useState(null); // null = loading
		const [counts, setCounts] = useState({});
		const [courses, setCourses] = useState([]);
		const [error, setError] = useState("");
		const [msg, setMsg] = useState(null);
		const [busy, setBusy] = useState(false);
		const [search, setSearch] = useState("");

		// Create modal/form
		const [showCreate, setShowCreate] = useState(false);
		const [newTitle, setNewTitle] = useState("");
		const [newTerm, setNewTerm] = useState("");
		const [newCourse, setNewCourse] = useState("");

		// Detail view
		const [detail, setDetail] = useState(null); // {cls, students, enrollments}
		const [studentSearch, setStudentSearch] = useState("");
		const [pool, setPool] = useState(null);
		const [showEnrollNew, setShowEnrollNew] = useState(false);
		const [newStudentName, setNewStudentName] = useState("");
		const [newStudentEmail, setNewStudentEmail] = useState("");

		const api = useCallback(async (method, path, body) => {
			const baseUrl = getGatewayUrl();
			const token = getActiveToken();
			const res = await window.fetch("/classui/proxy", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ baseUrl, token, method, path, body }),
			});
			const data = await res.json().catch(() => ({}));
			if (!data || typeof data.ok !== "boolean") throw new Error("Hệ thống proxy lớp học không phản hồi.");
			if (!data.ok) throw new Error(data.error || ("HTTP " + data.status));
			return data.data;
		}, []);

		const refreshCounts = useCallback(async (list) => {
			const entries = await Promise.all((list || []).map(async (c) => {
				try {
					const students = await api("GET", "classes/" + c.sourcedId + "/students");
					return [c.sourcedId, Array.isArray(students) ? students.length : 0];
				} catch (e) {
					return [c.sourcedId, 0];
				}
			}));
			setCounts(Object.fromEntries(entries));
		}, [api]);

		const loadClasses = useCallback(async () => {
			setError("");
			setClasses(null);
			try {
				const [list, courseList] = await Promise.all([
					api("GET", "classes?limit=200"),
					api("GET", "courses?limit=200").catch(() => []),
				]);
				const classArray = Array.isArray(list) ? list : [];
				setClasses(classArray);
				setCourses(Array.isArray(courseList) ? courseList : []);
				await refreshCounts(classArray);
			} catch (e) {
				const errStr = String(e.message || e);
				// Friendly error when services are unreachable
				if (errStr.includes("fetch failed") || errStr.includes("upstream unreachable")) {
					setError("Chưa kết nối được với hệ thống lớp học (class-service). Vui lòng kiểm tra dịch vụ.");
				} else {
					setError(errStr);
				}
				setClasses([]);
			}
		}, [api, refreshCounts]);

		useEffect(() => {
			loadClasses();
		}, [loadClasses]);

		async function createClass(ev) {
			ev.preventDefault();
			if (busy) return;
			if (!newTitle.trim()) {
				setMsg({ ok: false, text: "Vui lòng nhập tên lớp học." });
				return;
			}
			setBusy(true);
			setMsg(null);
			try {
				const body = { title: newTitle.trim() };
				if (newTerm.trim()) body.term = newTerm.trim();
				if (newCourse) body.courseSourcedId = newCourse;
				await api("POST", "classes", body);
				setNewTitle("");
				setNewTerm("");
				setNewCourse("");
				setShowCreate(false);
				setMsg({ ok: true, text: "Đã tạo lớp học thành công!" });
				await loadClasses();
			} catch (e) {
				setMsg({ ok: false, text: "Tạo lớp thất bại: " + String(e.message || e) });
			} finally {
				setBusy(false);
			}
		}

		async function removeClass(cls, e) {
			if (e) e.stopPropagation();
			if (busy) return;
			if (!window.confirm('Bạn có chắc muốn xóa lớp "' + cls.title + '" không?')) return;
			setBusy(true);
			setMsg(null);
			try {
				await api("DELETE", "classes/" + cls.sourcedId);
				setMsg({ ok: true, text: "Đã xóa lớp học." });
				if (detail && detail.cls.sourcedId === cls.sourcedId) setDetail(null);
				await loadClasses();
			} catch (e) {
				setMsg({ ok: false, text: "Xóa lớp thất bại: " + String(e.message || e) });
			} finally {
				setBusy(false);
			}
		}

		async function openDetail(cls) {
			if (busy) return;
			setBusy(true);
			setError("");
			setMsg(null);
			setStudentSearch("");
			setPool(null);
			setShowEnrollNew(false);
			try {
				const [students, enrollments] = await Promise.all([
					api("GET", "classes/" + cls.sourcedId + "/students"),
					api("GET", "enrollments?class_id=" + encodeURIComponent(cls.sourcedId) + "&limit=200"),
				]);
				setDetail({
					cls,
					students: Array.isArray(students) ? students : [],
					enrollments: Array.isArray(enrollments) ? enrollments : [],
				});
			} catch (e) {
				setMsg({ ok: false, text: "Không thể mở chi tiết lớp: " + String(e.message || e) });
			} finally {
				setBusy(false);
			}
		}

		async function loadPool() {
			try {
				const users = await api("GET", "users?role=student&limit=200");
				setPool(Array.isArray(users) ? users : []);
			} catch (e) {
				setMsg({ ok: false, text: "Không tải được danh sách học sinh: " + String(e.message || e) });
			}
		}

		async function enroll(student) {
			if (busy || !detail) return;
			setBusy(true);
			setMsg(null);
			try {
				await api("POST", "enrollments", {
					userSourcedId: student.sourcedId,
					classSourcedId: detail.cls.sourcedId,
					role: "student",
				});
				setMsg({ ok: true, text: 'Đã thêm học sinh "' + student.displayName + '" vào lớp.' });
				await openDetail(detail.cls);
				if (detail.cls) await refreshCounts([detail.cls]);
			} catch (e) {
				const text = String(e.message || e);
				setMsg({ ok: false, text: text.includes("DUPLICATE_ENROLLMENT") ? "Học sinh này đã có trong lớp." : "Thêm học sinh thất bại: " + text });
			} finally {
				setBusy(false);
			}
		}

		async function createAndEnroll(ev) {
			ev.preventDefault();
			if (busy || !detail) return;
			if (!newStudentName.trim()) {
				setMsg({ ok: false, text: "Vui lòng nhập họ tên học sinh." });
				return;
			}
			setBusy(true);
			setMsg(null);
			try {
				const body = { displayName: newStudentName.trim(), role: "student" };
				if (newStudentEmail.trim()) body.email = newStudentEmail.trim();
				const user = await api("POST", "users", body);
				await api("POST", "enrollments", {
					userSourcedId: user.sourcedId,
					classSourcedId: detail.cls.sourcedId,
					role: "student",
				});
				setNewStudentName("");
				setNewStudentEmail("");
				setShowEnrollNew(false);
				setMsg({ ok: true, text: 'Đã thêm học sinh "' + user.displayName + '" vào lớp.' });
				await openDetail(detail.cls);
				if (detail.cls) await refreshCounts([detail.cls]);
				setPool(null);
			} catch (e) {
				setMsg({ ok: false, text: "Thêm học sinh thất bại: " + String(e.message || e) });
			} finally {
				setBusy(false);
			}
		}

		async function removeStudent(student) {
			if (busy || !detail) return;
			const enrollment = (detail.enrollments || []).find((en) => en.userSourcedId === student.sourcedId && en.role === "student");
			if (!enrollment) {
				setMsg({ ok: false, text: "Không tìm thấy thông tin ghi danh của học sinh này." });
				return;
			}
			if (!window.confirm('Xóa học sinh "' + student.displayName + '" khỏi lớp?')) return;
			setBusy(true);
			setMsg(null);
			try {
				await api("DELETE", "enrollments/" + enrollment.sourcedId);
				setMsg({ ok: true, text: 'Đã xóa "' + student.displayName + '" khỏi lớp.' });
				await openDetail(detail.cls);
				if (detail.cls) await refreshCounts([detail.cls]);
			} catch (e) {
				setMsg({ ok: false, text: "Xóa thất bại: " + String(e.message || e) });
			} finally {
				setBusy(false);
			}
		}

		const filteredClasses = useMemo(() => {
			if (!classes) return [];
			const q = search.trim().toLowerCase();
			if (!q) return classes;
			return classes.filter(c => (c.title || "").toLowerCase().includes(q) || (c.term || "").toLowerCase().includes(q));
		}, [classes, search]);

		const filteredPool = useMemo(() => {
			if (!pool) return [];
			const q = studentSearch.trim().toLowerCase();
			const enrolledIds = new Set((detail ? detail.students : []).map(s => s.sourcedId));
			const unenrolled = pool.filter(p => !enrolledIds.has(p.sourcedId));
			if (!q) return unenrolled.slice(0, 8);
			return unenrolled.filter(u => (u.displayName || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q)).slice(0, 8);
		}, [pool, studentSearch, detail]);

		/* ==================== RENDER DETAIL VIEW ==================== */
		if (detail) {
			return h("div", { style: { display: "flex", flexDirection: "column", gap: "20px" } },
				// Header bar
				h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
					h("button", {
						onClick: () => setDetail(null),
						style: {
							display: "inline-flex", alignItems: "center", gap: "6px",
							background: "transparent", border: "none", color: T.labelMuted,
							cursor: "pointer", fontSize: "14px", padding: 0
						}
					}, "← Quay lại danh sách lớp"),
					h("div", { style: { display: "flex", gap: "10px" } },
						h("button", {
							onClick: () => removeClass(detail.cls),
							style: {
								padding: "6px 12px", background: T.dangerSoft, color: T.danger,
								border: "1px solid rgba(239,68,68,0.2)", borderRadius: "6px",
								fontSize: "13px", cursor: "pointer"
							}
						}, "Xóa lớp này")
					)
				),

				// Class Banner Card
				h("div", {
					style: {
						background: T.card, border: `1px solid ${T.border}`, borderRadius: "12px",
						padding: "24px", position: "relative", overflow: "hidden"
					}
				},
					h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" } },
						h("div", null,
							h("h1", { style: { margin: "0 0 6px", fontSize: "22px", fontWeight: 650, color: T.label } }, detail.cls.title),
							h("p", { style: { margin: 0, fontSize: "14px", color: T.labelMuted } },
								courseTitle(courses, detail.cls.courseSourcedId) + (detail.cls.term ? ` • Học kỳ: ${detail.cls.term}` : "")
							)
						),
						h("div", {
							style: {
								padding: "6px 14px", background: T.brandSoft, color: T.brand,
								borderRadius: "20px", fontSize: "13px", fontWeight: 600
							}
						}, `${detail.students.length} học sinh`)
					)
				),

				// Feedback message
				msg ? h("div", {
					style: {
						padding: "10px 14px", borderRadius: "8px", fontSize: "13px",
						background: msg.ok ? T.accentSoft : T.dangerSoft,
						color: msg.ok ? T.accent : T.danger,
						border: `1px solid ${msg.ok ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`
					}
				}, msg.text) : null,

				// Student List Section
				h("div", { style: { background: T.card, border: `1px solid ${T.border}`, borderRadius: "12px", padding: "20px" } },
					h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" } },
						h("h3", { style: { margin: 0, fontSize: "16px", fontWeight: 600, color: T.label } }, "Danh sách học sinh"),
						h("div", { style: { display: "flex", gap: "8px" } },
							h("button", {
								onClick: () => { if (!pool) loadPool(); setShowEnrollNew(!showEnrollNew); },
								style: {
									padding: "7px 14px", background: T.brand, color: "#fff",
									border: "none", borderRadius: "6px", fontSize: "13px",
									fontWeight: 500, cursor: "pointer"
								}
							}, showEnrollNew ? "Đóng thêm học sinh" : "+ Thêm học sinh")
						)
					),

					// Add / Enroll drawer form
					showEnrollNew ? h("div", {
						style: {
							background: T.field, border: `1px solid ${T.border}`, borderRadius: "8px",
							padding: "16px", marginBottom: "20px"
						}
					},
						h("h4", { style: { margin: "0 0 12px", fontSize: "14px", color: T.label } }, "Thêm học sinh mới vào lớp"),
						h("form", { onSubmit: createAndEnroll, style: { display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" } },
							h("input", {
								value: newStudentName, onChange: e => setNewStudentName(e.target.value),
								placeholder: "Họ và tên học sinh *",
								style: {
									flex: "1 1 200px", padding: "8px 12px", background: T.bg, border: `1px solid ${T.border}`,
									borderRadius: "6px", color: T.label, fontSize: "13px", outline: "none"
								}
							}),
							h("input", {
								value: newStudentEmail, onChange: e => setNewStudentEmail(e.target.value),
								placeholder: "Email học sinh (tùy chọn)",
								style: {
									flex: "1 1 200px", padding: "8px 12px", background: T.bg, border: `1px solid ${T.border}`,
									borderRadius: "6px", color: T.label, fontSize: "13px", outline: "none"
								}
							}),
							h("button", {
								type: "submit", disabled: busy,
								style: {
									padding: "8px 16px", background: T.brand, color: "#fff",
									border: "none", borderRadius: "6px", fontSize: "13px",
									fontWeight: 500, cursor: "pointer"
								}
							}, busy ? "Đang thêm..." : "Thêm vào lớp")
						),

						// Pool lookup existing
						pool ? h("div", { style: { marginTop: "16px", borderTop: `1px solid ${T.border}`, paddingTop: "12px" } },
							h("div", { style: { fontSize: "13px", color: T.labelMuted, marginBottom: "8px" } }, "Hoặc chọn từ danh sách học sinh sẵn có:"),
							h("input", {
								value: studentSearch, onChange: e => setStudentSearch(e.target.value),
								placeholder: "Tìm học sinh theo tên/email...",
								style: {
									width: "100%", padding: "7px 10px", background: T.bg, border: `1px solid ${T.border}`,
									borderRadius: "6px", color: T.label, fontSize: "13px", boxSizing: "border-box", marginBottom: "8px"
								}
							}),
							filteredPool.length === 0 ? h("p", { style: { fontSize: "12px", color: T.labelSubtle, margin: "4px 0" } }, "Không còn học sinh nào chưa ghi danh.") :
								h("div", { style: { display: "flex", flexDirection: "column", gap: "6px" } },
									filteredPool.map(u => h("div", {
										key: u.sourcedId,
										style: {
											display: "flex", justifyContent: "space-between", alignItems: "center",
											padding: "8px 12px", background: T.bg, borderRadius: "6px"
										}
									},
										h("div", null,
											h("span", { style: { color: T.label, fontSize: "13px", fontWeight: 500 } }, u.displayName),
											u.email ? h("span", { style: { color: T.labelSubtle, fontSize: "12px", marginLeft: "8px" } }, u.email) : null
										),
										h("button", {
											onClick: () => enroll(u), disabled: busy,
											style: {
												padding: "4px 10px", background: T.brandSoft, color: T.brand,
												border: "none", borderRadius: "4px", fontSize: "12px", cursor: "pointer"
											}
										}, "Ghi danh")
									))
								)
						) : null
					) : null,

					// Students Table
					detail.students.length === 0 ? h("div", {
						style: { textAlign: "center", padding: "40px 20px", color: T.labelSubtle }
					},
						h("p", { style: { margin: "0 0 8px", fontSize: "15px" } }, "Lớp học chưa có học sinh nào."),
						h("p", { style: { margin: 0, fontSize: "13px" } }, 'Nhấp vào nút "+ Thêm học sinh" ở trên để đưa học sinh vào lớp.')
					) : h("div", { style: { overflowX: "auto" } },
						h("table", { style: { width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" } },
							h("thead", null,
								h("tr", { style: { borderBottom: `1px solid ${T.border}`, color: T.labelMuted } },
									h("th", { style: { padding: "10px 12px", fontWeight: 500 } }, "Học sinh"),
									h("th", { style: { padding: "10px 12px", fontWeight: 500 } }, "Email"),
									h("th", { style: { padding: "10px 12px", fontWeight: 500 } }, "Mã hệ thống (ID)"),
									h("th", { style: { padding: "10px 12px", fontWeight: 500, textAlign: "right" } }, "Thao tác")
								)
							),
							h("tbody", null,
								detail.students.map((st) => h("tr", {
									key: st.sourcedId,
									style: { borderBottom: `1px solid rgba(255,255,255,0.05)` }
								},
									h("td", { style: { padding: "12px", color: T.label, fontWeight: 500 } }, st.displayName),
									h("td", { style: { padding: "12px", color: T.labelMuted } }, st.email || "—"),
									h("td", { style: { padding: "12px", color: T.labelSubtle, fontFamily: "monospace", fontSize: "12px" } }, st.sourcedId),
									h("td", { style: { padding: "12px", textAlign: "right" } },
										h("button", {
											onClick: () => removeStudent(st),
											style: {
												background: "transparent", border: "none", color: T.danger,
												cursor: "pointer", fontSize: "12px", padding: "4px 8px"
											}
										}, "Xóa khỏi lớp")
									)
								))
							)
						)
					)
				)
			);
		}

		/* ==================== RENDER LIST VIEW ==================== */
		return h("div", { style: { display: "flex", flexDirection: "column", gap: "20px" } },
			// Top Action Bar
			h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" } },
				h("div", { style: { position: "relative", width: "320px", maxWidth: "100%" } },
					h("input", {
						value: search, onChange: e => setSearch(e.target.value),
						placeholder: "Tìm kiếm lớp học...",
						style: {
							width: "100%", padding: "9px 14px", background: T.card, border: `1px solid ${T.border}`,
							borderRadius: "8px", color: T.label, fontSize: "14px", outline: "none",
							boxSizing: "border-box"
						}
					})
				),
				h("div", { style: { display: "flex", gap: "10px" } },
					h("button", {
						onClick: () => setShowCreate(!showCreate),
						style: {
							display: "inline-flex", alignItems: "center", gap: "6px",
							padding: "9px 16px", background: T.brand, color: "#fff",
							border: "none", borderRadius: "8px", fontSize: "14px",
							fontWeight: 500, cursor: "pointer", transition: "background 0.15s"
						}
					}, showCreate ? "Đóng tạo lớp" : "+ Tạo lớp học mới")
				)
			),

			// Alert Message
			msg ? h("div", {
				style: {
					padding: "10px 14px", borderRadius: "8px", fontSize: "13px",
					background: msg.ok ? T.accentSoft : T.dangerSoft,
					color: msg.ok ? T.accent : T.danger,
					border: `1px solid ${msg.ok ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`
				}
			}, msg.text) : null,

			// System Error Banner
			error ? h("div", {
				style: {
					padding: "12px 16px", borderRadius: "8px", fontSize: "13px",
					background: T.dangerSoft, color: T.danger,
					border: "1px solid rgba(239,68,68,0.3)"
				}
			},
				h("p", { style: { margin: "0 0 4px", fontWeight: 600 } }, "Không thể tải danh sách lớp học:"),
				h("p", { style: { margin: 0, opacity: 0.9 } }, error)
			) : null,

			// Create Class Modal / Card
			showCreate ? h("div", {
				style: {
					background: T.card, border: `1px solid ${T.border}`, borderRadius: "12px",
					padding: "20px", display: "flex", flexDirection: "column", gap: "16px"
				}
			},
				h("h3", { style: { margin: 0, fontSize: "16px", fontWeight: 600, color: T.label } }, "Tạo lớp học mới"),
				h("form", { onSubmit: createClass, style: { display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" } },
					h("div", { style: { flex: "1 1 220px" } },
						h("label", { style: { display: "block", fontSize: "12px", color: T.labelMuted, marginBottom: "6px" } }, "Tên lớp học *"),
						h("input", {
							value: newTitle, onChange: e => setNewTitle(e.target.value),
							placeholder: "Ví dụ: Đại số 10A1, Python Cơ bản",
							style: {
								width: "100%", padding: "8px 12px", background: T.field, border: `1px solid ${T.border}`,
								borderRadius: "6px", color: T.label, fontSize: "13px", boxSizing: "border-box", outline: "none"
							}
						})
					),
					h("div", { style: { flex: "1 1 150px" } },
						h("label", { style: { display: "block", fontSize: "12px", color: T.labelMuted, marginBottom: "6px" } }, "Học kỳ"),
						h("input", {
							value: newTerm, onChange: e => setNewTerm(e.target.value),
							placeholder: "Ví dụ: HK1 2026",
							style: {
								width: "100%", padding: "8px 12px", background: T.field, border: `1px solid ${T.border}`,
								borderRadius: "6px", color: T.label, fontSize: "13px", boxSizing: "border-box", outline: "none"
							}
						})
					),
					h("div", { style: { flex: "1 1 200px" } },
						h("label", { style: { display: "block", fontSize: "12px", color: T.labelMuted, marginBottom: "6px" } }, "Khóa học liên kết"),
						h("select", {
							value: newCourse, onChange: e => setNewCourse(e.target.value),
							style: {
								width: "100%", padding: "8px 12px", background: T.field, border: `1px solid ${T.border}`,
								borderRadius: "6px", color: T.label, fontSize: "13px", boxSizing: "border-box", outline: "none"
							}
						},
							h("option", { value: "" }, "— Không gắn khóa học —"),
							courses.map(c => h("option", { key: c.sourcedId, value: c.sourcedId }, c.title))
						)
					),
					h("button", {
						type: "submit", disabled: busy,
						style: {
							padding: "9px 20px", background: T.brand, color: "#fff",
							border: "none", borderRadius: "6px", fontSize: "13px",
							fontWeight: 500, cursor: "pointer", height: "35px"
						}
					}, busy ? "Đang tạo..." : "Tạo lớp")
				)
			) : null,

			// Class Cards Grid
			classes === null ? h("div", { style: { textAlign: "center", padding: "40px", color: T.labelMuted } }, "Đang tải danh sách lớp học...") :
				filteredClasses.length === 0 ? h("div", {
					style: {
						textAlign: "center", padding: "60px 20px", background: T.card,
						border: `1px solid ${T.border}`, borderRadius: "12px"
					}
				},
					h("div", { style: { fontSize: "36px", marginBottom: "12px" } }, "🏫"),
					h("h3", { style: { margin: "0 0 6px", fontSize: "16px", color: T.label } }, "Chưa có lớp học nào"),
					h("p", { style: { margin: "0 0 16px", fontSize: "13px", color: T.labelMuted } }, "Bắt đầu tạo lớp học đầu tiên để quản lý học sinh và tiến độ học tập."),
					h("button", {
						onClick: () => setShowCreate(true),
						style: {
							padding: "8px 18px", background: T.brand, color: "#fff",
							border: "none", borderRadius: "6px", fontSize: "13px",
							fontWeight: 500, cursor: "pointer"
						}
					}, "+ Tạo lớp học ngay")
				) :
				h("div", {
					style: {
						display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
						gap: "16px"
					}
				},
					filteredClasses.map(c => h("div", {
						key: c.sourcedId,
						onClick: () => openDetail(c),
						style: {
							background: T.card, border: `1px solid ${T.border}`, borderRadius: "12px",
							padding: "20px", cursor: "pointer", transition: "all 0.15s ease",
							display: "flex", flexDirection: "column", justifyContent: "space-between",
							minHeight: "130px"
						},
						onMouseEnter: (e) => { e.currentTarget.style.borderColor = "rgba(253,80,90,0.4)"; e.currentTarget.style.background = T.cardHover; },
						onMouseLeave: (e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.card; }
					},
						h("div", null,
							h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" } },
								h("h4", { style: { margin: 0, fontSize: "16px", fontWeight: 650, color: T.label } }, c.title),
								h("span", {
									style: {
										fontSize: "12px", padding: "2px 8px", borderRadius: "12px",
										background: T.brandSoft, color: T.brand, fontWeight: 500
									}
								}, `${counts[c.sourcedId] || 0} HS`)
							),
							h("p", { style: { margin: "0 0 12px", fontSize: "13px", color: T.labelMuted } },
								courseTitle(courses, c.courseSourcedId)
							)
						),
						h("div", {
							style: {
								display: "flex", justifyContent: "space-between", alignItems: "center",
								paddingTop: "12px", borderTop: `1px solid rgba(255,255,255,0.06)`, fontSize: "12px"
							}
						},
							h("span", { style: { color: T.labelSubtle } }, c.term ? `Học kỳ: ${c.term}` : "Chưa đặt kỳ"),
							h("span", { style: { color: T.brand, fontWeight: 500 } }, "Quản lý lớp →")
						)
					))
				)
		);
	}

	function SidebarIcon(props) {
		const active = Boolean(props && props.active);
		return h("span", { style: { display: "inline-flex", alignItems: "center", color: active ? "var(--vai-brand, #fd505a)" : "inherit" } },
			h("svg", {
				xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", width: 18, height: 18,
				fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round", strokeLinejoin: "round"
			},
				h("path", { d: "M22 10v6M2 10l10-5 10 5-10 5z" }),
				h("path", { d: "M6 12v5c3 3 9 3 12 0v-5" })
			)
		);
	}

	function PageHeader() {
		return h("div", {
			style: {
				display: "flex", alignItems: "center", gap: "14px",
				padding: "0 0 20px", borderBottom: `1px solid ${T.border}`,
				marginBottom: "24px"
			}
		},
			h("div", {
				style: {
					display: "grid", placeItems: "center", width: "42px", height: "42px",
					borderRadius: "10px", background: T.brandSoft, color: T.brand
				}
			},
				h("svg", {
					xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", width: 22, height: 22,
					fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round", strokeLinejoin: "round"
				},
					h("path", { d: "M22 10v6M2 10l10-5 10 5-10 5z" }),
					h("path", { d: "M6 12v5c3 3 9 3 12 0v-5" })
				)
			),
			h("div", null,
				h("h2", { style: { margin: 0, fontSize: "20px", fontWeight: 650, color: T.label, letterSpacing: "-0.01em" } }, "Lớp học"),
				h("p", { style: { margin: "2px 0 0", fontSize: "13px", color: T.labelMuted } }, "Quản lý danh sách lớp, môn học và phân bổ học sinh theo tiêu chuẩn OneRoster")
			)
		);
	}

	function MainPanel() {
		return h("div", {
			className: "st-page",
			style: {
				width: "100%", maxWidth: "1200px", margin: "0 auto",
				padding: "24px 32px 48px", boxSizing: "border-box",
				fontFamily: FONT, color: T.label
			}
		},
			h(PageHeader, null),
			h(Panel, null)
		);
	}

	exports.name = NS;
	exports.inject = ["slots"];
	exports.apply = function apply(ctx) {
		ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
			name: "sidebar.panellist",
			id: NS,
			order: 22,
			label: "Lớp học",
		}, SidebarIcon));
		ctx.slots.inject("main", () => ctx.slots.register({ name: "main", key: NS }, MainPanel));
	};
	return module.exports;
}});
