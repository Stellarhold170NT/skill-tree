/**
 * skilltree-class-ui — CLIENT half (no build step; platform module format).
 * Registers one additive `shell.overlay` entry: a floating "Lớp học" button and
 * a teacher-facing management panel for personal classes backed by
 * class-service (M6, OneRoster v1.2 subset) through the api-gateway (M10).
 * All traffic goes through the host route POST /classui/proxy — the page never
 * addresses services directly, and the teacher JWT stays in the browser
 * (localStorage) and is forwarded per-request by the host half.
 *
 * Design tokens: DESIGN.md (single source of truth). Anti-slop: no gradients,
 * no glassmorphism, no nested-card stacking, WCAG AA contrast, no motion slop.
 */
window.__ModuleLoader__.load({ id: "skilltree-class-ui", factory: (require) => {
	var module = { exports: {} };
	var exports = module.exports;
	const react = require("react");
	const { createElement: h, useState, useEffect, useCallback } = react;

	const NS = "skilltree-class-ui";
	const STORE_KEY = "skilltree.classui.settings";

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
		connRow: { display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "6px" },
		label: { display: "block", fontSize: "12px", fontWeight: 600, color: T.inkSoft, margin: "6px 0 2px" },
		input: {
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
		btnDanger: {
			padding: "4px 10px", fontSize: "12px", borderRadius: "8px", cursor: "pointer",
			border: "1px solid " + T.dangerTint, background: T.dangerTint, color: T.danger,
		},
		error: {
			marginTop: "10px", padding: "8px 10px", borderRadius: "8px", fontSize: "13px",
			background: T.dangerTint, color: T.danger,
		},
		okMsg: {
			marginTop: "10px", padding: "8px 10px", borderRadius: "8px", fontSize: "13px",
			background: T.successTint, color: T.successText,
		},
		section: { marginTop: "16px" },
		sectionHead: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" },
		sectionTitle: { margin: 0, fontSize: "14px", fontWeight: 700, color: T.ink },
		table: { width: "100%", borderCollapse: "collapse", marginTop: "8px", fontSize: "13px" },
		th: {
			textAlign: "left", fontSize: "12px", color: T.inkSoft, fontWeight: 600,
			borderBottom: "1px solid " + T.border, padding: "6px 8px",
		},
		td: { borderBottom: "1px solid " + T.tint, padding: "7px 8px", verticalAlign: "top", color: T.body },
		mono: { fontFamily: MONO, fontSize: "11px", color: T.inkSoft, wordBreak: "break-all" },
		muted: { fontSize: "12px", color: T.muted },
		pill: {
			display: "inline-block", padding: "1px 8px", borderRadius: "999px", fontSize: "11px",
			background: T.primary100, color: T.ink,
		},
		back: { border: "none", background: "none", cursor: "pointer", color: T.boot, fontSize: "13px", padding: 0 },
		formGrid: { display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "flex-end", marginTop: "8px" },
		divider: { borderTop: "1px solid " + T.tint, margin: "12px 0" },
		matchRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", padding: "6px 4px", borderBottom: "1px solid " + T.tint },
	};

	/* ---- settings persistence (browser-local; token stays client-side) ---- */
	function loadSettings() {
		try {
			const raw = JSON.parse(window.localStorage.getItem(STORE_KEY) || "{}");
			return {
				baseUrl: typeof raw.baseUrl === "string" && raw.baseUrl ? raw.baseUrl : "http://localhost:8000",
				token: typeof raw.token === "string" ? raw.token : "",
			};
		} catch (e) {
			return { baseUrl: "http://localhost:8000", token: "" };
		}
	}

	function saveSettings(settings) {
		try { window.localStorage.setItem(STORE_KEY, JSON.stringify(settings)); } catch (e) { /* private mode */ }
	}

	/* ---- display helpers ---- */
	function courseTitle(courses, courseSourcedId) {
		if (!courseSourcedId) return "—";
		const found = (courses || []).find((c) => c.sourcedId === courseSourcedId);
		return found ? found.title : courseSourcedId;
	}

	function fmtDate(iso) {
		if (!iso) return "";
		try { return new Date(iso).toLocaleDateString("vi-VN"); } catch (e) { return iso; }
	}

	/* ---- panel ---- */
	function Panel() {
		const [settings, setSettings] = useState(loadSettings);
		const [baseUrlDraft, setBaseUrlDraft] = useState(settings.baseUrl);
		const [tokenDraft, setTokenDraft] = useState(settings.token);
		const [connMsg, setConnMsg] = useState(null);

		const [classes, setClasses] = useState(null); // null = loading
		const [counts, setCounts] = useState({});
		const [courses, setCourses] = useState([]);
		const [error, setError] = useState("");
		const [msg, setMsg] = useState(null);
		const [busy, setBusy] = useState(false);
		const [showCreate, setShowCreate] = useState(false);
		const [newTitle, setNewTitle] = useState("");
		const [newTerm, setNewTerm] = useState("");
		const [newCourse, setNewCourse] = useState("");
		const [showEdit, setShowEdit] = useState(false);
		const [editTitle, setEditTitle] = useState("");
		const [editTerm, setEditTerm] = useState("");

		const [detail, setDetail] = useState(null); // {cls, students, enrollments}
		const [pool, setPool] = useState(null);
		const [search, setSearch] = useState("");
		const [newStudentName, setNewStudentName] = useState("");
		const [newStudentEmail, setNewStudentEmail] = useState("");

		const api = useCallback(async (method, path, body) => {
			const res = await window.fetch("/classui/proxy", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ baseUrl: settings.baseUrl, token: settings.token, method, path, body }),
			});
			const data = await res.json().catch(() => ({}));
			if (!data || typeof data.ok !== "boolean") throw new Error("Proxy không phản hồi đúng định dạng");
			if (!data.ok) throw new Error(data.error || ("HTTP " + data.status));
			return data.data;
		}, [settings]);

		const refreshCounts = useCallback(async (list) => {
			const entries = await Promise.all((list || []).map(async (c) => {
				try {
					const students = await api("GET", "classes/" + c.sourcedId + "/students");
					return [c.sourcedId, Array.isArray(students) ? students.length : 0];
				} catch (e) { return [c.sourcedId, "?"]; }
			}));
			setCounts(Object.fromEntries(entries));
		}, [api]);

		const loadClasses = useCallback(async () => {
			setError(""); setClasses(null);
			try {
				const [list, courseList] = await Promise.all([
					api("GET", "classes?limit=200"),
					api("GET", "courses?limit=200").catch(() => []),
				]);
				setClasses(Array.isArray(list) ? list : []);
				setCourses(Array.isArray(courseList) ? courseList : []);
				await refreshCounts(list || []);
			} catch (e) {
				setError(String(e.message || e)); setClasses([]);
			}
		}, [api, refreshCounts]);

		useEffect(() => { loadClasses(); }, [loadClasses]);

		function saveConn(ev) {
			ev.preventDefault();
			const next = { baseUrl: baseUrlDraft.trim(), token: tokenDraft.trim() };
			if (!/^https?:\/\//i.test(next.baseUrl)) {
				setConnMsg({ ok: false, text: "Base URL phải bắt đầu bằng http:// hoặc https://" });
				return;
			}
			setSettings(next); saveSettings(next); setConnMsg({ ok: true, text: "Đã lưu kết nối." });
		}

		async function createClass(ev) {
			ev.preventDefault();
			if (busy) return;
			if (!newTitle.trim()) { setMsg({ ok: false, text: "Nhập tên lớp." }); return; }
			setBusy(true); setMsg(null);
			try {
				const body = { title: newTitle.trim() };
				if (newTerm.trim()) body.term = newTerm.trim();
				if (newCourse) body.courseSourcedId = newCourse;
				await api("POST", "classes", body);
				setNewTitle(""); setNewTerm(""); setNewCourse(""); setShowCreate(false);
				setMsg({ ok: true, text: "Đã tạo lớp." });
				await loadClasses();
			} catch (e) {
				setMsg({ ok: false, text: "Tạo lớp thất bại: " + String(e.message || e) });
			} finally { setBusy(false); }
		}

		async function saveClassEdit(ev) {
			ev.preventDefault();
			if (busy || !detail) return;
			if (!editTitle.trim()) { setMsg({ ok: false, text: "Nhập tên lớp." }); return; }
			setBusy(true); setMsg(null);
			try {
				const body = { title: editTitle.trim() };
				if (editTerm.trim()) body.term = editTerm.trim();
				const updated = await api("PATCH", "classes/" + detail.cls.sourcedId, body);
				setDetail(Object.assign({}, detail, { cls: updated }));
				setShowEdit(false);
				setMsg({ ok: true, text: "Đã lưu thông tin lớp." });
				await loadClasses();
			} catch (e) {
				setMsg({ ok: false, text: "Lưu thông tin lớp thất bại: " + String(e.message || e) });
			} finally { setBusy(false); }
		}


		async function removeClass(cls) {
			if (busy) return;
			if (!window.confirm('Xóa lớp "' + cls.title + '"? Ghi danh trong lớp cũng bị xóa.')) return;
			setBusy(true); setMsg(null);
			try {
				await api("DELETE", "classes/" + cls.sourcedId);
				setMsg({ ok: true, text: "Đã xóa lớp." });
				if (detail && detail.cls.sourcedId === cls.sourcedId) setDetail(null);
				await loadClasses();
			} catch (e) {
				setMsg({ ok: false, text: "Xóa lớp thất bại: " + String(e.message || e) });
			} finally { setBusy(false); }
		}

		async function openDetail(cls) {
			if (busy) return;
			setBusy(true); setError(""); setMsg(null); setSearch(""); setPool(null);
			setShowEdit(false); setEditTitle(cls.title || ""); setEditTerm(cls.term || "");
			try {
				const [students, enrollments] = await Promise.all([
					api("GET", "classes/" + cls.sourcedId + "/students"),
					api("GET", "enrollments?class_id=" + encodeURIComponent(cls.sourcedId) + "&limit=200"),
				]);
				setDetail({ cls, students: Array.isArray(students) ? students : [], enrollments: Array.isArray(enrollments) ? enrollments : [] });
			} catch (e) {
				setError(String(e.message || e));
			} finally { setBusy(false); }
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
			setBusy(true); setMsg(null);
			try {
				await api("POST", "enrollments", {
					userSourcedId: student.sourcedId,
					classSourcedId: detail.cls.sourcedId,
					role: "student",
				});
				setMsg({ ok: true, text: 'Đã ghi danh "' + student.displayName + '".' });
				await openDetail(detail.cls);
			} catch (e) {
				const text = String(e.message || e);
				setMsg({ ok: false, text: text.indexOf("DUPLICATE_ENROLLMENT") !== -1 ? "Học sinh đã ở trong lớp với vai trò này." : "Ghi danh thất bại: " + text });
			} finally { setBusy(false); }
		}

		async function createAndEnroll(ev) {
			ev.preventDefault();
			if (busy || !detail) return;
			if (!newStudentName.trim()) { setMsg({ ok: false, text: "Nhập tên hiển thị của học sinh." }); return; }
			setBusy(true); setMsg(null);
			try {
				const body = { displayName: newStudentName.trim(), role: "student" };
				if (newStudentEmail.trim()) body.email = newStudentEmail.trim();
				const user = await api("POST", "users", body);
				await api("POST", "enrollments", {
					userSourcedId: user.sourcedId,
					classSourcedId: detail.cls.sourcedId,
					role: "student",
				});
				setNewStudentName(""); setNewStudentEmail("");
				setMsg({ ok: true, text: 'Đã tạo học sinh ẩn danh và ghi danh (candidateId: ' + user.sourcedId + ').' });
				await openDetail(detail.cls);
				setPool(null);
			} catch (e) {
				setMsg({ ok: false, text: "Tạo học sinh thất bại: " + String(e.message || e) });
			} finally { setBusy(false); }
		}

		async function removeStudent(student) {
			if (busy || !detail) return;
			const enrollment = (detail.enrollments || []).find((en) => en.userSourcedId === student.sourcedId && en.role === "student");
			if (!enrollment) { setMsg({ ok: false, text: "Không tìm thấy bản ghi ghi danh của học sinh này." }); return; }
			if (!window.confirm('Hủy ghi danh "' + student.displayName + '" khỏi lớp?')) return;
			setBusy(true); setMsg(null);
			try {
				await api("DELETE", "enrollments/" + enrollment.sourcedId);
				setMsg({ ok: true, text: 'Đã hủy ghi danh "' + student.displayName + '".' });
				await openDetail(detail.cls);
				if (detail.cls) await refreshCounts([detail.cls]);
			} catch (e) {
				setMsg({ ok: false, text: "Hủy ghi danh thất bại: " + String(e.message || e) });
			} finally { setBusy(false); }
		}

		const matches = (() => {
			if (!pool) return null;
			const q = search.trim().toLowerCase();
			const list = q
				? pool.filter((u) => (u.displayName || "").toLowerCase().indexOf(q) !== -1 || (u.email || "").toLowerCase().indexOf(q) !== -1)
				: pool;
			return list.slice(0, 8);
		})();

		return h("div", { className: "stc-panel" },
			h("div", { style: S.head },
				h("div", null,
					h("p", { style: S.title }, detail ? detail.cls.title : "Lớp học của tôi"),
					h("p", { style: S.subtitle }, "Quản lý lớp cá nhân giáo viên — OneRoster M6 qua gateway"),
				),
				h("button", { style: S.close, onClick: () => setDetail(null), title: detail ? "Về danh sách lớp" : "Đóng" }, "×"),
			),

			// connection settings
			h("form", { style: S.conn, onSubmit: saveConn },
				h("label", { style: S.label, htmlFor: NS + "-base" }, "Gateway (M10)"),
				h("div", { style: S.connRow },
					h("input", {
						id: NS + "-base", style: Object.assign({}, S.input, { flex: "1 1 220px" }),
						value: baseUrlDraft, onChange: (e) => setBaseUrlDraft(e.target.value),
						placeholder: "http://localhost:8000", spellCheck: false,
					}),
				),
				h("label", { style: S.label, htmlFor: NS + "-token" }, "Token giáo viên (từ trang Đăng nhập — auth-ui)"),
				h("div", { style: S.connRow },
					h("input", {
						id: NS + "-token", style: Object.assign({}, S.input, { flex: "1 1 220px" }),
						type: "password", value: tokenDraft, onChange: (e) => setTokenDraft(e.target.value),
						placeholder: "Bỏ trống nếu gateway không bật xác thực", autoComplete: "off",
					}),
					h("button", { style: S.btn, type: "submit" }, "Lưu kết nối"),
				),
				connMsg ? h("p", { style: Object.assign({}, S.muted, { marginTop: "6px", color: connMsg.ok ? T.successText : T.danger }) }, connMsg.text) : null,
			),

			error ? h("div", { style: S.error, role: "alert" },
				error,
				h("div", { style: S.muted },
					"Kiểm tra gateway đã chạy chưa: docker compose -f deploy/docker-compose.yml up -d api-gateway class-service"),
			) : null,
			msg ? h("div", { style: msg.ok ? S.okMsg : S.error, role: "status" }, msg.text) : null,

			!detail
				? h("div", { style: S.section },
						h("div", { style: S.sectionHead },
							h("p", { style: S.sectionTitle }, "Danh sách lớp"),
							h("button", { style: S.btnGhost, onClick: () => setShowCreate(!showCreate) }, showCreate ? "Đóng biểu mẫu" : "+ Tạo lớp mới"),
						),
						showCreate ? h("form", { style: S.formGrid, onSubmit: createClass },
							h("div", null,
								h("label", { style: S.label, htmlFor: NS + "-ct" }, "Tên lớp *"),
								h("input", { id: NS + "-ct", style: S.input, value: newTitle, onChange: (e) => setNewTitle(e.target.value), placeholder: "VD: Toán 10A1" }),
							),
							h("div", null,
								h("label", { style: S.label, htmlFor: NS + "-cm" }, "Học kỳ"),
								h("input", { id: NS + "-cm", style: S.input, value: newTerm, onChange: (e) => setNewTerm(e.target.value), placeholder: "VD: HK1 2026" }),
							),
							h("div", null,
								h("label", { style: S.label, htmlFor: NS + "-cc" }, "Khóa học (tùy chọn)"),
								h("select", { id: NS + "-cc", style: S.input, value: newCourse, onChange: (e) => setNewCourse(e.target.value) },
									h("option", { value: "" }, "— Không gắn —"),
									courses.map((c) => h("option", { key: c.sourcedId, value: c.sourcedId }, c.title)),
								),
							),
							h("button", { style: S.btn, type: "submit", disabled: busy }, busy ? "Đang tạo…" : "Tạo lớp"),
						) : null,
						classes === null
							? h("p", { style: S.muted }, "Đang tải…")
							: classes.length === 0
								? h("p", { style: S.muted }, "Chưa có lớp nào. Bấm “+ Tạo lớp mới” để bắt đầu.")
								: h("table", { style: S.table },
										h("thead", null, h("tr", null,
											h("th", { style: S.th }, "Lớp"),
											h("th", { style: S.th }, "Khóa học"),
											h("th", { style: S.th }, "Học kỳ"),
											h("th", { style: S.th }, "Sĩ số"),
											h("th", { style: S.th }, "Hành động"),
										)),
										h("tbody", null, classes.map((c) =>
											h("tr", { key: c.sourcedId },
												h("td", { style: S.td },
													h("div", { style: { fontWeight: 600, color: T.ink, cursor: "pointer" }, onClick: () => openDetail(c), title: "Xem chi tiết" }, c.title),
													h("div", { style: S.mono }, c.sourcedId),
												),
												h("td", { style: S.td }, courseTitle(courses, c.courseSourcedId)),
												h("td", { style: S.td }, c.term || "—"),
												h("td", { style: S.td },
													h("span", { style: S.pill }, counts[c.sourcedId] === undefined ? "…" : counts[c.sourcedId] + " HS"),
												),
												h("td", { style: S.td },
													h("div", { style: { display: "flex", gap: "6px" } },
														h("button", { style: S.btnGhost, onClick: () => openDetail(c) }, "Chi tiết"),
														h("button", { style: S.btnDanger, disabled: busy, onClick: () => removeClass(c) }, "Xóa"),
													),
												),
											))),
									),
					)
				: h("div", { style: S.section },
						h("button", { style: S.back, onClick: () => setDetail(null) }, "← Danh sách lớp"),
						h("p", { style: Object.assign({}, S.muted, { marginTop: "4px" }) },
							(detail.cls.term ? detail.cls.term + " · " : "")
							+ courseTitle(courses, detail.cls.courseSourcedId)
							+ " · tạo ngày " + fmtDate(detail.cls.createdAt)),
						h("div", { style: { marginTop: "8px" } },
							h("button", { style: S.btnGhost, disabled: busy, onClick: () => setShowEdit(!showEdit) },
								showEdit ? "Đóng biểu mẫu sửa" : "✏️ Sửa thông tin lớp"),
							showEdit ? h("form", { style: S.formGrid, onSubmit: saveClassEdit },
								h("div", null,
									h("label", { style: S.label, htmlFor: NS + "-et" }, "Tên lớp *"),
									h("input", { id: NS + "-et", style: S.input, value: editTitle, onChange: (e) => setEditTitle(e.target.value), placeholder: "VD: Toán 10A1" }),
								),
								h("div", null,
									h("label", { style: S.label, htmlFor: NS + "-em" }, "Học kỳ"),
									h("input", { id: NS + "-em", style: S.input, value: editTerm, onChange: (e) => setEditTerm(e.target.value), placeholder: "VD: HK1 2026" }),
								),
								h("button", { style: S.btn, type: "submit", disabled: busy }, busy ? "Đang lưu…" : "Lưu thay đổi"),
							) : null,
						),
						h("div", { style: S.sectionHead },
							h("p", { style: S.sectionTitle }, "Học sinh trong lớp (" + detail.students.length + ")"),
							h("button", { style: S.btnGhost, disabled: busy, onClick: loadPool }, pool ? "Tải lại danh sách học sinh" : "Tra cứu học sinh"),
						),
						detail.students.length === 0
							? h("p", { style: S.muted }, "Lớp chưa có học sinh. Dùng mục bên dưới để ghi danh.")
							: h("table", { style: S.table },
									h("thead", null, h("tr", null,
										h("th", { style: S.th }, "Học sinh"),
										h("th", { style: S.th }, "Email"),
										h("th", { style: S.th }, "candidateId (sourcedId)"),
										h("th", { style: S.th }, "Hành động"),
									)),
									h("tbody", null, detail.students.map((st) =>
										h("tr", { key: st.sourcedId },
											h("td", { style: S.td }, st.displayName),
											h("td", { style: S.td }, st.email || "—"),
											h("td", { style: S.td }, h("span", { style: S.mono }, st.sourcedId)),
											h("td", { style: S.td }, h("button", { style: S.btnDanger, disabled: busy, onClick: () => removeStudent(st) }, "Hủy ghi danh")),
										))),
								),

						// enroll / create students
						h("div", { style: S.divider }),
						h("div", { style: S.sectionHead },
							h("p", { style: S.sectionTitle }, "Thêm học sinh vào lớp"),
						),
						h("div", { style: S.connRow },
							h("input", {
								style: Object.assign({}, S.input, { flex: "1 1 240px" }),
								value: search, onChange: (e) => setSearch(e.target.value),
								placeholder: pool ? "Tìm theo tên hoặc email…" : "Bấm “Tra cứu học sinh” trước",
								disabled: !pool,
							}),
						),
						pool === null
							? h("p", { style: S.muted }, "Tra cứu lấy danh sách học sinh hiện có (identity ẩn danh do M6 cấp).")
							: matches.length === 0
								? h("p", { style: S.muted }, "Không có học sinh khớp — tạo mới bên dưới.")
								: h("div", null, matches.map((u) =>
										h("div", { key: u.sourcedId, style: S.matchRow },
											h("span", null,
												h("span", { style: { color: T.ink, fontWeight: 600 } }, u.displayName),
												" ",
												h("span", { style: S.mono }, u.sourcedId),
												u.email ? h("span", { style: S.muted }, " · " + u.email) : null,
											),
											h("button", { style: S.btnGhost, disabled: busy, onClick: () => enroll(u) }, "Ghi danh"),
										))),
						h("form", { style: S.formGrid, onSubmit: createAndEnroll },
							h("div", null,
								h("label", { style: S.label, htmlFor: NS + "-sn" }, "Tên học sinh mới *"),
								h("input", { id: NS + "-sn", style: S.input, value: newStudentName, onChange: (e) => setNewStudentName(e.target.value), placeholder: "VD: Nguyễn Văn A" }),
							),
							h("div", null,
								h("label", { style: S.label, htmlFor: NS + "-se" }, "Email (tùy chọn)"),
								h("input", { id: NS + "-se", style: S.input, value: newStudentEmail, onChange: (e) => setNewStudentEmail(e.target.value), placeholder: "ten@example.com" }),
							),
							h("button", { style: S.btn, type: "submit", disabled: busy }, busy ? "Đang tạo…" : "Tạo & ghi danh"),
						),
						h("p", { style: S.muted }, "M6 chỉ cấp sourcedId ẩn danh (candidateId) — các service khác chỉ thấy mã này, không thấy dữ liệu cá nhân."),
					),
		);
	}


	function PageIcon(props) {
		const size = props && props.size ? props.size : 20;
		const sw = props && props.strokeWidth ? props.strokeWidth : 1.25;
		const active = Boolean(props && props.active);
		return h("span", { style: { display: "inline-flex", alignItems: "center", color: active ? "var(--dsw-alias-brand-primary, #27A95F)" : "inherit" } },
			h("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 16 16", width: size, height: size, fill: "none", stroke: "currentColor", strokeWidth: sw, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", focusable: "false" }, h("path", { d: 'M6 8.25C7.51878 8.25 8.75 7.01878 8.75 5.5C8.75 3.98122 7.51878 2.75 6 2.75C4.48122 2.75 3.25 3.98122 3.25 5.5C3.25 7.01878 4.48122 8.25 6 8.25Z', stroke: "currentColor" }), h("path", { d: 'M1 14.5C1 11.5 3.5 10.25 6 10.25C8.5 10.25 11 11.5 11 14.5', stroke: "currentColor" }), h("path", { d: 'M10.5 2.9C11.65 3.35 12.45 4.35 12.45 5.5C12.45 6.65 11.65 7.65 10.5 8.1', stroke: "currentColor" }), h("path", { d: 'M12.4 10.6C13.9 11.3 15 12.6 15 14.5', stroke: "currentColor" })));
	}
	function SidebarIcon(props) {
		return h("span", { style: { display: "inline-flex", alignItems: "center", color: (props && props.active) ? "var(--dsw-alias-brand-primary, #27A95F)" : "inherit" } },
			h("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 16 16", width: 20, height: 20, fill: "none", stroke: "currentColor", strokeWidth: 1.25, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", focusable: "false" }, h("path", { d: 'M6 8.25C7.51878 8.25 8.75 7.01878 8.75 5.5C8.75 3.98122 7.51878 2.75 6 2.75C4.48122 2.75 3.25 3.98122 3.25 5.5C3.25 7.01878 4.48122 8.25 6 8.25Z', stroke: "currentColor" }), h("path", { d: 'M1 14.5C1 11.5 3.5 10.25 6 10.25C8.5 10.25 11 11.5 11 14.5', stroke: "currentColor" }), h("path", { d: 'M10.5 2.9C11.65 3.35 12.45 4.35 12.45 5.5C12.45 6.65 11.65 7.65 10.5 8.1', stroke: "currentColor" }), h("path", { d: 'M12.4 10.6C13.9 11.3 15 12.6 15 14.5', stroke: "currentColor" })));
	}
	function PageHeader() {
		return h("div", { style: { display: "flex", alignItems: "center", gap: "12px", padding: "0 0 16px", borderBottom: "1px solid rgba(127,127,127,.18)", marginBottom: "16px" } },
			h("div", { style: { display: "grid", placeItems: "center", width: "40px", height: "40px", borderRadius: "10px", background: "rgba(39,169,95,.14)", color: "var(--dsw-alias-brand-primary, #27A95F)" } },
				h("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 16 16", width: 22, height: 22, fill: "none", stroke: "currentColor", strokeWidth: 1.1, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", focusable: "false" }, h("path", { d: 'M6 8.25C7.51878 8.25 8.75 7.01878 8.75 5.5C8.75 3.98122 7.51878 2.75 6 2.75C4.48122 2.75 3.25 3.98122 3.25 5.5C3.25 7.01878 4.48122 8.25 6 8.25Z', stroke: "currentColor" }), h("path", { d: 'M1 14.5C1 11.5 3.5 10.25 6 10.25C8.5 10.25 11 11.5 11 14.5', stroke: "currentColor" }), h("path", { d: 'M10.5 2.9C11.65 3.35 12.45 4.35 12.45 5.5C12.45 6.65 11.65 7.65 10.5 8.1', stroke: "currentColor" }), h("path", { d: 'M12.4 10.6C13.9 11.3 15 12.6 15 14.5', stroke: "currentColor" }))),
			h("div", null,
				h("h2", { style: { margin: 0, fontSize: "20px", fontWeight: 650, letterSpacing: "-0.01em" } }, "Lớp học"),
				h("p", { style: { margin: "2px 0 0", fontSize: "13px", opacity: 0.7 } }, "Tạo lớp, thêm học sinh và theo dõi tiến độ cả lớp trong một màn hình.")));
	}
	function MainPanel() {
		return h("div", { className: "st-page", style: { width: "100%", maxWidth: "100%", padding: "20px 28px 40px", boxSizing: "border-box", fontFamily: "inherit" } },
			h(PageHeader, null), h(Panel, null));
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
