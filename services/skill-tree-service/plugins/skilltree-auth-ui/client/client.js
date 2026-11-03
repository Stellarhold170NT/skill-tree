/**
 * skilltree-auth-ui — client half (no build step; platform module format).
 *
 * Settings "Tài khoản" section: login + register against M11 auth-service
 * through the same-origin proxy routes mounted by the host half
 * (/skilltree-auth/*), which forwards to the M10 api-gateway.
 *
 * JWT flow:
 *   - token + user are stored in localStorage under "skilltree.auth.v1"
 *     (shared contract — other SkillTree plugins may read it to attach
 *     `Authorization: Bearer <token>` to their own calls);
 *   - on every mount the stored token is re-verified via POST
 *     /skilltree-auth/verify; invalid/expired tokens are cleared;
 *   - "Kiểm tra phiên" re-verifies on demand; "Đăng xuất" clears storage.
 *
 * Roles (V1 — two visible roles):
 *   - student (default, no extra input);
 *   - teacher/admin require an admin token (sent as X-Admin-Token). The form
 *     explains that the platform's FIRST registered account becomes admin.
 *
 * Design tokens: only DESIGN.md values (brand greens, ink, neutrals,
 * semantic red/amber) — declared as --st-* custom properties on the root
 * element so nothing leaks outside this section. Anti-slop: flat surfaces,
 * no gradients/glass/glow, AA text contrast, radius 4/8/12/999, 4px spacing.
 */
window.__ModuleLoader__.load({ id: "skilltree-auth-ui", factory: (require) => {
	var module = { exports: {} };
	var exports = module.exports;
	const react = require("react");
	const { createElement: h, useState, useEffect, useCallback } = react;

	const NS = "skilltree-auth-ui";
	const STORAGE_KEY = "skilltree.auth.v1";
	const GATEWAY_OVERRIDE_KEY = "skilltree.auth.gateway";

	/* ---- DESIGN.md tokens (single source: DESIGN.md on branch agent-v1-bootstrap) ---- */
	const T = {
		"--st-primary-100": "#E5F5EC",
		"--st-primary-800": "#145831",
		"--st-boot": "#167F4D",
		"--st-ink": "#1C3632",
		"--st-ink-soft": "#3A544E",
		"--st-neutral-100": "#F2F2F2",
		"--st-neutral-300": "#D4D8D6",
		"--st-neutral-500": "#6B7280",
		"--st-neutral-800": "#374151",
		"--st-surface": "#FFFFFF",
		"--st-danger": "#B3261E",
		"--st-warn": "#8A4B00",
		"--st-warn-tint": "#FFF4D6",
	};

	/* ---- styling over DESIGN.md tokens (no CSS files, scoped to this section) ---- */
	const S = {
		root: {
			maxWidth: "560px", display: "flex", flexDirection: "column", gap: "16px",
			color: "var(--st-ink)",
			fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
			fontSize: "14px", lineHeight: 1.5,
		},
		heading: {
			margin: "0", fontSize: "20px", fontWeight: "700", color: "var(--st-ink)",
			fontFamily: 'Georgia, "Times New Roman", serif',
		},
		caption: { margin: "0", fontSize: "12px", color: "var(--st-neutral-500)" },
		card: {
			background: "var(--st-surface)", border: "1px solid var(--st-neutral-300)",
			borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "12px",
		},
		tabs: { display: "flex", gap: "8px" },
		tab: (active) => ({
			padding: "6px 14px", fontSize: "13px", fontWeight: active ? "600" : "400",
			borderRadius: "999px", border: "none", cursor: "pointer",
			background: active ? "var(--st-neutral-100)" : "transparent",
			color: active ? "var(--st-ink)" : "var(--st-neutral-500)",
		}),
		label: { display: "block", fontSize: "12px", fontWeight: "500", color: "var(--st-ink-soft)", marginBottom: "4px" },
		input: {
			width: "100%", boxSizing: "border-box", padding: "8px 10px", fontSize: "14px",
			borderRadius: "4px", border: "1px solid var(--st-neutral-300)",
			background: "var(--st-surface)", color: "var(--st-ink)", outline: "none",
		},
		btnPrimary: {
			padding: "8px 14px", fontSize: "14px", fontWeight: "600", borderRadius: "8px",
			border: "none", cursor: "pointer", background: "var(--st-boot)", color: "#FFFFFF",
		},
		btnGhost: {
			padding: "6px 12px", fontSize: "13px", borderRadius: "8px",
			border: "1px solid var(--st-neutral-300)", background: "transparent",
			color: "var(--st-ink-soft)", cursor: "pointer",
		},
		btnLink: {
			padding: "0", fontSize: "13px", border: "none", background: "transparent",
			color: "var(--st-boot)", cursor: "pointer", textDecoration: "underline",
		},
		btnDanger: {
			padding: "6px 12px", fontSize: "13px", borderRadius: "8px",
			border: "1px solid var(--st-neutral-300)", background: "transparent",
			color: "var(--st-danger)", cursor: "pointer",
		},
		msg: (ok) => ({ margin: "0", fontSize: "13px", color: ok ? "var(--st-boot)" : "var(--st-danger)" }),
		badge: (role) => {
			const palette = {
				student: { background: "var(--st-primary-100)", color: "var(--st-primary-800)" },
				teacher: { background: "var(--st-warn-tint)", color: "var(--st-warn)" },
				admin: { background: "var(--st-ink)", color: "#FFFFFF" },
			};
			const p = palette[role] || palette.student;
			return {
				display: "inline-block", padding: "2px 10px", borderRadius: "999px",
				fontSize: "12px", fontWeight: "600", background: p.background, color: p.color,
			};
		},
		profileRow: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px" },
		profileName: { margin: "0", fontSize: "16px", fontWeight: "600", color: "var(--st-ink)", fontFamily: 'Georgia, "Times New Roman", serif' },
		actions: { display: "flex", gap: "8px", flexWrap: "wrap" },
		advanced: { borderTop: "1px solid var(--st-neutral-300)", paddingTop: "8px" },
		summary: { fontSize: "12px", color: "var(--st-neutral-500)", cursor: "pointer" },
	};

	function readStored(key) {
		try { return window.localStorage.getItem(key); } catch (e) { return null; }
	}

	function readAuth() {
		const raw = readStored(STORAGE_KEY);
		if (!raw) return null;
		try {
			const parsed = JSON.parse(raw);
			if (parsed && typeof parsed.accessToken === "string" && parsed.accessToken.length > 0) return parsed;
		} catch (e) { /* corrupted entry — treated as logged out */ }
		return null;
	}

	function writeAuth(session) {
		try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session)); } catch (e) { /* private mode */ }
	}

	function clearAuth() {
		try { window.localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
	}

	function gatewayOverride() {
		return readStored(GATEWAY_OVERRIDE_KEY) || "";
	}

	/** Same-origin POST to the host-half proxy; attaches stored JWT when asked.
	 *  extraHeaders — optional extra request headers (e.g. X-Admin-Token on register). */
	async function authCall(path, body, session, extraHeaders) {
		const headers = { "content-type": "application/json" };
		if (session && session.accessToken) headers.authorization = "Bearer " + session.accessToken;
		if (extraHeaders) Object.assign(headers, extraHeaders);
		const payload = Object.assign({}, body || {});
		const override = gatewayOverride();
		if (override) payload.__baseUrl = override;
		const resp = await fetch(path, {
			method: "POST", headers,
			body: JSON.stringify(payload),
		});
		let data = null;
		try { data = await resp.json(); } catch (e) { data = null; }
		if (!resp.ok) {
			const message = data && data.error && data.error.message ? data.error.message : "HTTP " + resp.status;
			const err = new Error(message);
			err.status = resp.status;
			throw err;
		}
		return data;
	}

	function saveSession(data) {
		const session = {
			accessToken: data.accessToken,
			tokenType: data.tokenType || "Bearer",
			expiresAt: Date.now() + (Number(data.expiresIn) || 3600) * 1000,
			user: data.user || null,
		};
		writeAuth(session);
		return session;
	}

	function AccountSection() {
		const [session, setSession] = useState(null);
		const [status, setStatus] = useState("anon"); // anon | authed (verify runs on mount)
		const [tab, setTab] = useState("login");
		const [username, setUsername] = useState("");
		const [password, setPassword] = useState("");
		const [confirmPassword, setConfirmPassword] = useState("");
		const [role, setRole] = useState("student");
		const [adminToken, setAdminToken] = useState("");
		const [gatewayUrl, setGatewayUrl] = useState("");
		const [msg, setMsg] = useState(null);
		const [busy, setBusy] = useState(false);

		const verifySession = useCallback(async (candidate) => {
			if (!candidate || !candidate.accessToken) { setStatus("anon"); return; }
			try {
				const payload = await authCall("/skilltree-auth/verify", null, candidate);
				setSession(Object.assign({}, candidate, { user: Object.assign({}, candidate.user, payload) }));
				setStatus("authed");
			} catch (e) {
				clearAuth();
				setSession(null);
				setStatus("anon");
				if (e.status !== 502) {
					setMsg({ ok: false, text: "Phiên đăng nhập đã hết hạn hoặc không hợp lệ — hãy đăng nhập lại." });
				} else {
					setMsg({ ok: false, text: "Chưa xác minh lại được phiên (gateway không phản hồi) — thử \"Kiểm tra phiên\" sau." });
				}
			}
		}, []);

		useEffect(() => {
			setGatewayUrl(gatewayOverride());
			fetch("/skilltree-auth/config", { cache: "no-store" })
				.then((r) => r.json())
				.then((cfg) => { if (!gatewayOverride() && cfg && cfg.gatewayBaseUrl) setGatewayUrl(cfg.gatewayBaseUrl); })
				.catch(() => { /* config is informational only */ });
			verifySession(readAuth());
		}, [verifySession]);

		async function handleLogin(ev) {
			ev.preventDefault();
			if (busy) return;
			setBusy(true); setMsg(null);
			try {
				const data = await authCall("/skilltree-auth/login", { username: username.trim(), password });
				setSession(saveSession(data));
				setStatus("authed");
				setPassword("");
				setMsg({ ok: true, text: "Đã đăng nhập. Chào mừng " + (data.user && data.user.username ? data.user.username : username.trim()) + "!" });
			} catch (e) {
				setMsg({ ok: false, text: "Đăng nhập thất bại: " + e.message });
			} finally { setBusy(false); }
		}

		async function handleRegister(ev) {
			ev.preventDefault();
			if (busy) return;
			const name = username.trim();
			if (name.length < 3) { setMsg({ ok: false, text: "Tên tài khoản cần ít nhất 3 ký tự." }); return; }
			if (password.length < 8) { setMsg({ ok: false, text: "Mật khẩu cần ít nhất 8 ký tự." }); return; }
			if (password !== confirmPassword) { setMsg({ ok: false, text: "Mật khẩu nhập lại chưa khớp." }); return; }
			if (role !== "student" && adminToken.trim() === "") {
				setMsg({ ok: false, text: "Vai " + (role === "teacher" ? "giáo viên" : "quản trị") + " cần X-Admin-Token — liên hệ chủ hệ thống để nhận mã." });
				return;
			}
			setBusy(true); setMsg(null);
			try {
				const headersToken = adminToken.trim();
				const extraHeaders = role !== "student" && headersToken !== "" ? { "x-admin-token": headersToken } : undefined;
				const data = await authCall("/skilltree-auth/register", { username: name, password, role }, null, extraHeaders);
				const session = saveSession(data);
				if (headersToken !== "" && data.user && data.user.role !== role) {
					setMsg({ ok: true, text: "Đã tạo tài khoản nhưng hệ thống vẫn xếp vai học sinh — mã admin chưa được chấp nhận." });
				} else {
					setMsg({ ok: true, text: "Đã tạo tài khoản và đăng nhập. Chào mừng " + name + "!" });
				}
				setSession(session); setStatus("authed"); setPassword(""); setConfirmPassword(""); setAdminToken("");
			} catch (e) {
				setMsg({ ok: false, text: "Tạo tài khoản thất bại: " + e.message });
			} finally { setBusy(false); }
		}

		async function reverify() {
			if (busy) return;
			setBusy(true); setMsg(null);
			await verifySession(readAuth());
			if (readAuth()) setMsg({ ok: true, text: "Phiên còn hiệu lực." });
			setBusy(false);
		}

		function logout() {
			clearAuth();
			setSession(null);
			setStatus("anon");
			setMsg({ ok: true, text: "Đã đăng xuất khỏi trình duyệt này." });
		}

		function saveGateway(value) {
			setGatewayUrl(value);
			try {
				if (value.trim() === "") window.localStorage.removeItem(GATEWAY_OVERRIDE_KEY);
				else window.localStorage.setItem(GATEWAY_OVERRIDE_KEY, value.trim());
			} catch (e) { /* private mode */ }
		}

		const loginForm = h("form", { onSubmit: handleLogin, style: { display: "flex", flexDirection: "column", gap: "12px" } },
			h("div", null,
				h("label", { style: S.label, htmlFor: NS + "-login-username" }, "Tên tài khoản"),
				h("input", {
					id: NS + "-login-username", style: S.input, value: username,
					onChange: (e) => setUsername(e.target.value),
					autoComplete: "username", spellCheck: false, required: true,
				}),
			),
			h("div", null,
				h("label", { style: S.label, htmlFor: NS + "-login-password" }, "Mật khẩu"),
				h("input", {
					id: NS + "-login-password", style: S.input, value: password, type: "password",
					onChange: (e) => setPassword(e.target.value),
					autoComplete: "current-password", required: true,
				}),
			),
			h("div", { style: S.actions },
				h("button", { type: "submit", style: S.btnPrimary, disabled: busy || !username || !password },
					busy ? "Đang đăng nhập…" : "Đăng nhập"),
				h("button", { type: "button", style: S.btnLink, onClick: () => { setTab("register"); setMsg(null); } },
					"Chưa có tài khoản? Tạo tài khoản"),
			),
		);

		const registerForm = h("form", { onSubmit: handleRegister, style: { display: "flex", flexDirection: "column", gap: "12px" } },
			h("div", null,
				h("label", { style: S.label, htmlFor: NS + "-reg-username" }, "Tên tài khoản (tối thiểu 3 ký tự)"),
				h("input", {
					id: NS + "-reg-username", style: S.input, value: username,
					onChange: (e) => setUsername(e.target.value),
					autoComplete: "username", spellCheck: false, required: true,
				}),
			),
			h("div", null,
				h("label", { style: S.label, htmlFor: NS + "-reg-password" }, "Mật khẩu (tối thiểu 8 ký tự)"),
				h("input", {
					id: NS + "-reg-password", style: S.input, value: password, type: "password",
					onChange: (e) => setPassword(e.target.value),
					autoComplete: "new-password", required: true,
				}),
			),
			h("div", null,
				h("label", { style: S.label, htmlFor: NS + "-reg-confirm" }, "Nhập lại mật khẩu"),
				h("input", {
					id: NS + "-reg-confirm", style: S.input, value: confirmPassword, type: "password",
					onChange: (e) => setConfirmPassword(e.target.value),
					autoComplete: "new-password", required: true,
				}),
			),
			h("div", null,
				h("label", { style: S.label, htmlFor: NS + "-reg-role" }, "Bạn là"),
				h("select", {
					id: NS + "-reg-role", style: S.input, value: role,
					onChange: (e) => setRole(e.target.value),
				},
					h("option", { value: "student" }, "Học sinh / sinh viên"),
					h("option", { value: "teacher" }, "Giáo viên"),
					h("option", { value: "admin" }, "Quản trị"),
				),
			),
			role !== "student"
				? h("div", null,
					h("label", { style: S.label, htmlFor: NS + "-reg-token" }, "Mã admin (X-Admin-Token)"),
					h("input", {
						id: NS + "-reg-token", style: S.input, value: adminToken,
						onChange: (e) => setAdminToken(e.target.value),
						autoComplete: "off", spellCheck: false, type: "password",
						placeholder: "Nhập mã do chủ hệ thống cấp",
					}),
					h("p", { style: S.caption },
						"Tài khoản ĐẦU TIÊN của hệ thống tự nhận vai quản trị, không cần mã. " +
						"Các tài khoản giáo viên/quản trị sau đó phải có mã này — nếu thiếu, hệ thống vẫn tạo tài khoản nhưng xếp vai học sinh."),
				)
				: null,
			h("div", { style: S.actions },
				h("button", { type: "submit", style: S.btnPrimary, disabled: busy || !username || !password || !confirmPassword },
					busy ? "Đang tạo…" : "Tạo tài khoản"),
				h("button", { type: "button", style: S.btnLink, onClick: () => { setTab("login"); setMsg(null); } },
					"Đã có tài khoản? Đăng nhập"),
			),
		);

		const profile = session ? h("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } },
			h("div", { style: S.profileRow },
				h("p", { style: S.profileName }, "Xin chào, " + ((session.user && session.user.username) || "bạn")),
				h("span", { style: S.badge(session.user && session.user.role) },
					session.user && session.user.role === "teacher" ? "Giáo viên"
						: session.user && session.user.role === "admin" ? "Quản trị" : "Học sinh"),
			),
			h("p", { style: S.caption },
				"Phiên hết hạn lúc " + (session.expiresAt ? new Date(session.expiresAt).toLocaleString() : "không rõ") +
				". Token được gửi kèm header Authorization cho các service SkillTree."),
			h("div", { style: S.actions },
				h("button", { type: "button", style: S.btnGhost, onClick: reverify, disabled: busy }, "Kiểm tra phiên"),
				h("button", { type: "button", style: S.btnDanger, onClick: logout }, "Đăng xuất"),
			),
		) : null;

		return h("div", { style: Object.assign({}, S.root, T) },
			h("div", null,
				h("h2", { style: S.heading }, "Tài khoản SkillTree"),
				h("p", { style: { margin: "4px 0 0", fontSize: "13px", color: "var(--st-ink-soft)" } },
					"Đăng nhập để hệ thống nhận diện vai của bạn — giáo viên thấy lớp của mình, học sinh thấy lộ trình của mình."),
			),
			status === "anon"
				? h("div", { style: S.card },
					h("div", { style: S.tabs, role: "tablist" },
						h("button", { type: "button", style: S.tab(tab === "login"), onClick: () => { setTab("login"); setMsg(null); } }, "Đăng nhập"),
						h("button", { type: "button", style: S.tab(tab === "register"), onClick: () => { setTab("register"); setMsg(null); } }, "Tạo tài khoản"),
					),
					tab === "login" ? loginForm : registerForm,
				)
				: h("div", { style: S.card }, profile),
			msg ? h("p", { style: S.msg(msg.ok), role: "status" }, msg.text) : null,
			h("details", { style: S.advanced },
				h("summary", { style: S.summary }, "Cấu hình nâng cao — địa chỉ API gateway (M10)"),
				h("div", { style: { display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" } },
					h("label", { style: S.label, htmlFor: NS + "-gateway" }, "Gateway base URL (mặc định lấy từ máy chủ)"),
					h("input", {
						id: NS + "-gateway", style: S.input, value: gatewayUrl,
						onChange: (e) => saveGateway(e.target.value),
						spellCheck: false, placeholder: "http://localhost:8000",
					}),
					h("p", { style: S.caption },
						"Đổi địa chỉ này khi gateway chạy ở nơi khác (mặc định do biến SKILLTREE_GATEWAY_URL của máy chủ quyết định). Bỏ trống để dùng mặc định."),
				),
			),
			h("p", { style: S.caption },
				"JWT được lưu trong localStorage của trình duyệt này (khóa skilltree.auth.v1) và đính kèm header Authorization cho các lời gọi SkillTree."),
		);
	}

	exports.name = NS;

	function PageIcon(props) {
		const size = props && props.size ? props.size : 20;
		const sw = props && props.strokeWidth ? props.strokeWidth : 1.25;
		const active = Boolean(props && props.active);
		return h("span", { style: { display: "inline-flex", alignItems: "center", color: active ? "var(--dsw-alias-brand-primary, #27A95F)" : "inherit" } },
			h("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 16 16", width: size, height: size, fill: "none", stroke: "currentColor", strokeWidth: sw, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", focusable: "false" }, h("path", { d: 'M8 8.25C9.51878 8.25 10.75 7.01878 10.75 5.5C10.75 3.98122 9.51878 2.75 8 2.75C6.48122 2.75 5.25 3.98122 5.25 5.5C5.25 7.01878 6.48122 8.25 8 8.25Z', stroke: "currentColor" }), h("path", { d: 'M2.5 14.5C2.5 11.5 5.25 10.25 8 10.25C10.75 10.25 13.5 11.5 13.5 14.5', stroke: "currentColor" })));
	}
	function SidebarIcon(props) {
		return h("span", { style: { display: "inline-flex", alignItems: "center", color: (props && props.active) ? "var(--dsw-alias-brand-primary, #27A95F)" : "inherit" } },
			h("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 16 16", width: 20, height: 20, fill: "none", stroke: "currentColor", strokeWidth: 1.25, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", focusable: "false" }, h("path", { d: 'M8 8.25C9.51878 8.25 10.75 7.01878 10.75 5.5C10.75 3.98122 9.51878 2.75 8 2.75C6.48122 2.75 5.25 3.98122 5.25 5.5C5.25 7.01878 6.48122 8.25 8 8.25Z', stroke: "currentColor" }), h("path", { d: 'M2.5 14.5C2.5 11.5 5.25 10.25 8 10.25C10.75 10.25 13.5 11.5 13.5 14.5', stroke: "currentColor" })));
	}
	function PageHeader() {
		return h("div", { style: { display: "flex", alignItems: "center", gap: "12px", padding: "0 0 16px", borderBottom: "1px solid rgba(127,127,127,.18)", marginBottom: "16px" } },
			h("div", { style: { display: "grid", placeItems: "center", width: "40px", height: "40px", borderRadius: "10px", background: "rgba(39,169,95,.14)", color: "var(--dsw-alias-brand-primary, #27A95F)" } },
				h("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 16 16", width: 22, height: 22, fill: "none", stroke: "currentColor", strokeWidth: 1.1, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", focusable: "false" }, h("path", { d: 'M8 8.25C9.51878 8.25 10.75 7.01878 10.75 5.5C10.75 3.98122 9.51878 2.75 8 2.75C6.48122 2.75 5.25 3.98122 5.25 5.5C5.25 7.01878 6.48122 8.25 8 8.25Z', stroke: "currentColor" }), h("path", { d: 'M2.5 14.5C2.5 11.5 5.25 10.25 8 10.25C10.75 10.25 13.5 11.5 13.5 14.5', stroke: "currentColor" }))),
			h("div", null,
				h("h2", { style: { margin: 0, fontSize: "20px", fontWeight: 650, letterSpacing: "-0.01em" } }, "Đăng nhập"),
				h("p", { style: { margin: "2px 0 0", fontSize: "13px", opacity: 0.7 } }, "Đăng nhập để lưu tiến độ — hồ sơ năng lực gắn với mã học sinh ẩn danh, không lưu dữ liệu cá nhân.")));
	}
	function AuthPage() {
		return h("div", { className: "st-page", style: { width: "100%", maxWidth: "100%", padding: "20px 28px 40px", boxSizing: "border-box", fontFamily: "inherit" } },
			h(PageHeader, null), h(AccountSection, null));
	}



	function GateArt() {
		const useR = react.useRef;
		const cvRef = useR(null);
		const stRef = useR(null);
		const runRef = useR(null);
		const [seedTxt, setSeedTxt] = useState("");

		useEffect(function paint() {
			const cv = cvRef.current, st = stRef.current;
			if (!cv) return;
			const ctx = cv.getContext("2d");
			let raf = 0, last = 0;
			const C = ["#ff3b0a", "#ffee66", "#ff9fdc", "#4a55ff", "#5bf0ff", "#2fff8a"];
			const RGB = C.map((hh) => [1, 3, 5].map((i) => parseInt(hh.slice(i, i + 2), 16)));
			const mix = (a, b, f) => "rgb(" + [0, 1, 2].map((i) => Math.round(RGB[a][i] + (RGB[b][i] - RGB[a][i]) * f)).join(",") + ")";
			const W = 1000, H = 1414;
			function rng(sv) { return () => { sv |= 0; sv = sv + 0x6D2B79F5 | 0; let t = Math.imul(sv ^ sv >>> 15, 1 | sv); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
			const P = (a, d0, d1, sc, n, b, t, r0, r1, g) => ({ k: "p", a, d0, d1, s: sc, n, b, t, r: [r0, r1], g });
			const B = (x, y, sx, sy, rot, n, b, t, r0, r1, g) => ({ k: "b", x, y, sx, sy, rot, n, b, t, r: [r0, r1], g });
			const MAIN2 = [
				P(-2.35, 115, 260, .3, 300, [3, 3, 1], [4, 1, 4], 1.6, 2.4, "a"),
				P(3.05, 115, 265, .28, 300, [1, 2, 1], [1, 2], 1.6, 2.4, "b"),
				P(2.6, 105, 200, .2, 130, [5], [5], 1.6, 2.4, "c"),
				P(1.95, 115, 265, .36, 330, [3, 3, 4], [4, 4, 1], 1.6, 2.4, "d"),
				P(1.3, 115, 230, .28, 200, [2, 1], [2, 1], 1.8, 2.5, "e"),
				B(430, 320, 70, 45, -.8, 170, [0], [0, 5], 1.4, 2.2, "f"),
				Object.assign(P(-1.4, 100, 285, .3, 300, [3, 0], [5], 2.6, 3.8, "f"), { o: [455, 320] }),
				B(306, 41, 0, 0, 0, 1, [3], [3], 2, 2.8, "f"), B(250, 163, 0, 0, 0, 1, [3], [3], 2, 2.8, "f"), B(560, 60, 0, 0, 0, 1, [3], [5], 2.6, 3.4, "f"),
				B(690, 450, 115, 85, -.1, 700, [3, 1, 1, 2], [2, 5, 2, 5], 2.8, 4.2, "g"),
				B(770, 590, 80, 50, .3, 220, [1, 3], [2, 5], 2.8, 4.2, "g"),
				B(700, 205, 80, 45, -.6, 160, [1, 3], [2, 3], 2.8, 4, "g"),
				B(500, 760, 48, 115, .1, 330, [1], [2], 3, 4.4, "g"),
			].concat([[875, 320], [942, 436], [270, 832], [345, 990], [905, 775], [790, 140], [600, 130], [247, 165]].map((q) => B(q[0], q[1], 0, 0, 0, 1, [1], [2], 3, 3.8, "g")));
			const SMALL2 = [
				B(540, 1185, 75, 80, 0, 260, [3, 0, 0, 4, 1], [4, 3, 1, 4], 1.8, 3, "a"),
				B(580, 1090, 60, 40, 0, 100, [3, 1], [3, 1], 1.8, 2.6, "a"),
				B(470, 1290, 40, 35, 0, 50, [0, 4], [4], 1.8, 2.6, "a"),
				B(790, 1185, 45, 38, 0, 90, [0], [3, 0], 1.8, 2.6, "b"),
			];
			function run(seed) {
				last = seed;
				cancelAnimationFrame(raf);
				const rnd = rng(seed);
				const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(6.2832 * rnd());
				const pick = (a) => a[rnd() * a.length | 0];
				const ph = [0, 1, 2, 3, 4, 5].map(() => rnd() * 6.28);
				const wob = (x, y) => [Math.sin(x * .021 + ph[0]) * Math.cos(y * .017 + ph[1]) + .6 * Math.sin((x + y) * .012 + ph[2]), Math.sin(y * .02 + ph[3]) * Math.cos(x * .015 + ph[4]) + .6 * Math.sin((x - y) * .011 + ph[5])];
				const w = cv.parentElement.clientWidth, hh = w * H / W, dpr = Math.min(window.devicePixelRatio || 1, 2);
				cv.style.width = w + "px"; cv.style.height = hh + "px";
				cv.width = Math.round(w * dpr); cv.height = Math.round(hh * dpr);
				ctx.setTransform(w * dpr / W, 0, 0, w * dpr / W, 0, 0);
				ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
				ctx.lineCap = "round"; ctx.lineJoin = "round";
				const leaves = [];
				function build(pts, Pn, depth, bend, cfg) {
					const n = pts.length; if (!n) return;
					if (n === 1) { const p = pts[0]; leaves.push({ p, trunk: cfg.trunk, bend: cfg.b0, node: { x: p.x, y: p.y, p: Pn } }); return; }
					let cx = 0, cy = 0; for (const p of pts) { cx += p.x; cy += p.y; } cx /= n; cy /= n;
					const t = depth === 0 ? cfg.t0 : .15 + rnd() * .25, th = bend + gauss() * .14;
					const vx = (cx - Pn.x) * t, vy = (cy - Pn.y) * t, co = Math.cos(th), si = Math.sin(th);
					const Q = { x: Pn.x + vx * co - vy * si + gauss() * 2, y: Pn.y + vx * si + vy * co + gauss() * 2, p: Pn };
					const a = Math.atan2(cy - Q.y, cx - Q.x) + 1.5708 + (rnd() - .5), ax = Math.cos(a), ay = Math.sin(a);
					const sc = pts.map((p) => [p, p.x * ax + p.y * ay]).sort((u, v) => u[1] - v[1]).map((u) => u[0]);
					const k = Math.max(1, Math.min(n - 1, Math.round(n * (.3 + rnd() * .4))));
					build(sc.slice(0, k), Q, depth + 1, bend * .85, cfg);
					build(sc.slice(k), Q, depth + 1, bend * .85, cfg);
				}
				function neuron(rx, ry, specs, y0, y1, star) {
					const root = { x: rx, y: ry, p: null }, groups = {};
					for (const sp of specs) {
						const g = groups[sp.g] || (groups[sp.g] = { pts: [], yellow: true });
						if (!sp.b.every((c) => c === 1)) g.yellow = false;
						for (let j = 0; j < sp.n * (sp.n > 1 ? 1.45 : 1); j++) {
							let x, y;
							if (sp.k === "p") {
								const a = sp.a + gauss() * sp.s, d = Math.sqrt(sp.d0 * sp.d0 + rnd() * (sp.d1 * sp.d1 - sp.d0 * sp.d0)) + gauss() * 8;
								x = (sp.o ? sp.o[0] : rx) + Math.cos(a) * d; y = (sp.o ? sp.o[1] : ry) + Math.sin(a) * d;
							} else {
								const u = gauss() * sp.sx, v = gauss() * sp.sy, cr = Math.cos(sp.rot), sr = Math.sin(sp.rot);
								x = sp.x + u * cr - v * sr; y = sp.y + u * sr + v * cr;
							}
							if (x < 25 || x > W - 25 || y < y0 || y > y1) continue;
							g.pts.push({ x, y, c: pick(sp.b), tc: pick(sp.t), r: sp.r[0] + rnd() * (sp.r[1] - sp.r[0]) });
						}
					}
					for (const k in groups) {
						const g = groups[k];
						if (!star || k === "g" || k === "f") { const b0 = (rnd() - .5) * .6; build(g.pts, root, 0, b0, { t0: k === "g" ? .32 : .12, trunk: g.yellow ? 1 : 3, b0 }); }
						else { const o = g.pts.map((p) => [Math.atan2(p.y - ry, p.x - rx), p]).sort((u, v) => u[0] - v[0]).map((u) => u[1]);
							for (let i = 0; i < o.length; i += 14) { const b0 = (rnd() - .5) * .5; build(o.slice(i, i + 14), root, 0, b0, { t0: .3, trunk: g.yellow ? 1 : 3, b0 }); } }
					}
				}
				neuron(295, 465, MAIN2, 25, 1000, true);
				neuron(690, 1176, SMALL2, 1010, 1380);
				for (let i = leaves.length - 1; i > 0; i--) { const j = rnd() * (i + 1) | 0; const tmp = leaves[i]; leaves[i] = leaves[j]; leaves[j] = tmp; }
				function path(L) {
					const arr = []; let a = L.node; while (a) { arr.push(a); a = a.p; } arr.reverse();
					const m = arr.length, r = arr[0], e = arr[m - 1];
					const q = arr.map((n, i) => { const u = i / (m - 1); return (i === 0 || i === m - 1) ? { x: n.x, y: n.y } : { x: .85 * n.x + .15 * (r.x + (e.x - r.x) * u) + gauss() * 1.8 * u, y: .85 * n.y + .15 * (r.y + (e.y - r.y) * u) + gauss() * 1.8 * u }; });
					{ const A = q[q.length - 2], Z = q[q.length - 1], dx = Z.x - A.x, dy = Z.y - A.y, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, bd = (L.bend + gauss() * .12) * len * .7;
						q.splice(q.length - 1, 0, { x: A.x + dx * .35 + nx * bd, y: A.y + dy * .35 + ny * bd }, { x: A.x + dx * .72 + nx * bd * .55, y: A.y + dy * .72 + ny * bd * .55 }); }
					for (let it = 0; it < 2; it++) for (let i = 1; i < q.length - 1; i++) q[i] = { x: (q[i - 1].x + 2 * q[i].x + q[i + 1].x) / 4, y: (q[i - 1].y + 2 * q[i].y + q[i + 1].y) / 4 };
					const S = [];
					const M = q.length; for (let i = 0; i < M - 1; i++) {
						const p0 = q[Math.max(0, i - 1)], p1 = q[i], p2 = q[i + 1], p3 = q[Math.min(M - 1, i + 2)];
						for (let k = 0; k < 6; k++) {
							const t = k / 6, t2 = t * t, t3 = t2 * t;
							S.push([.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
								.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)]);
						}
					}
					S.push([e.x, e.y]);
					{ const n = S.length; for (let i = 1; i < n - 1; i++) { const wv = wob(S[i][0], S[i][1]), env = Math.sin(3.1416 * i / (n - 1)) * 15; S[i][0] += wv[0] * env; S[i][1] += wv[1] * env; } }
					const N = S.length, cut = [0, Math.round(N * .25), Math.round(N * .6), N - 1];
					for (let j = 0; j < 3; j++) {
						ctx.strokeStyle = mix(L.trunk, L.p.c, [.35, .8, 1][j]);
						ctx.globalAlpha = [.4, .8, .95][j]; ctx.lineWidth = [.5, .55, .6][j];
						ctx.beginPath(); ctx.moveTo(S[cut[j]][0], S[cut[j]][1]);
						for (let i = cut[j] + 1; i <= cut[j + 1]; i++) ctx.lineTo(S[i][0], S[i][1]);
						ctx.stroke();
					}
					ctx.fillStyle = C[L.p.tc];
					ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(e.x, e.y, L.p.r, 0, 6.2832); ctx.fill();
				}
				const per = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? leaves.length : Math.ceil(leaves.length / 140);
				let i = 0;
				(function frame() {
					for (let k = 0; k < per && i < leaves.length; k++) path(leaves[i++]);
					if (i < leaves.length) { st.textContent = "Đang mọc… " + Math.round(i / leaves.length * 100) + "%"; raf = window.requestAnimationFrame(frame); }
					else st.textContent = leaves.length.toLocaleString("vi-VN") + " sợi · seed " + seed;
				})();
			}
			runRef.current = () => run(Math.random() * 1e9 | 0);
			run(Math.random() * 1e9 | 0);
			let rt;
			const onResize = () => { window.clearTimeout(rt); rt = window.setTimeout(() => { if (Math.abs(cv.parentElement.clientWidth - parseFloat(cv.style.width)) > 2) run(last); }, 250); };
			window.addEventListener("resize", onResize);
			return () => { window.removeEventListener("resize", onResize); cancelAnimationFrame(raf); window.clearTimeout(rt); };
		}, []);
		const legend = ["#ff3b0a", "#ffee66", "#ff9fdc", "#4a55ff", "#5bf0ff", "#2fff8a"];
		return h("div", { style: { position: "relative", width: "100%", maxWidth: "440px", justifySelf: "end", background: "#000", marginRight: "100px" } },
			h("canvas", { ref: cvRef, style: { display: "block", width: "100%", background: "#000" } }),
			h("div", { style: { display: "flex", gap: "2px", marginTop: "12px" } },
				legend.map((c) => h("span", { key: c, style: { flex: "1", height: "5px", background: c, display: "inline-block" } }))),
			h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", fontSize: "11px", color: "#55555f", gap: "8px" } },
				h("span", { ref: stRef }, seedTxt),
				h("button", { onClick: () => runRef.current && runRef.current(), style: { font: "inherit", fontSize: "11px", color: "#8a8a96", background: "transparent", border: "1px solid #3a3a44", borderRadius: "999px", padding: "3px 10px", cursor: "pointer" } }, "Mọc lại")));
	}

	const LOGO_URI = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDg2IiBoZWlnaHQ9IjUyMyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSIgb3ZlcmZsb3c9ImhpZGRlbiI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTIzMSAtMTA3MCkiPjxwYXRoIGQ9Ik0tMi44MDU3NSAzNzEuNDg1Qy0xLjk4NzkzIDM3MC4zMjUtMS4zMzc5NCAzNjkuMzI5LTAuMTc2NzMxIDM2OC40ODMgNS44NTc2MiAzNjQuMDYgMTMuMzk0MiAzNjAuNjM0IDE5Ljg5NDQgMzU2Ljg0N0w2MS40MDM2IDMzMi4xODggMTk0Ljg3OCAyNTIuMjg1QzIwMy45NjUgMjQ2Ljk2MSAyMTIuOTEyIDI0MS40MTggMjIxLjczMyAyMzUuNjQ3IDIyNy4yMzcgMjMyLjA0OCAyMzMuMTk2IDIyNy4xNTYgMjM5LjEzMiAyMjQuNDY2IDIzOS4wNzcgMTQ4LjUwNyAyMzguMTkxIDcyLjQzNzEgMjM5LjE5NC0zLjUxNDY1IDIyOC4zNTggNi4xODQyMSAyMTIuODAyIDEyLjc3NzkgMjAwLjM2NyAyMC40NzczIDE5Ny44ODEgMjUuNzQ2NSAxNS4zMjMxIDEyNS4xNDItMS4zNTY2MiAxMzUuNDY4LTIuNTgwNjkgMTU4LjI4NC0xLjczOTQzIDE4MS41MTUtMS42NTg3OCAyMDQuMzg3TC0xLjUzODY5IDMxMC4xMDFDLTEuNTAwMTQgMzI1LjY1NyAwLjc1MDgxIDM1Ny44NTktMi44MDU3NSAzNzEuNDg1WiIgZmlsbD0iIzU2Qzk3NCIgZmlsbC1ydWxlPSJldmVub2RkIiB0cmFuc2Zvcm09Im1hdHJpeCgxIDAgMCAtMSAyMzQgMTU4NykiLz48cGF0aCBkPSJNMjQwLjQyNiAzNzAuNDg5QzIzOC45MSAzNDQuMTYyIDI0MC4yNDYgMzE3LjE3OSAyNDAuMjQ2IDI5MC43NjZMMjQwLjI5NCAxMzkuNDZDMjI0LjIwMyAxMjkuMzAzIDIwNy41NzIgMTIwLjA2OSAxOTEuMiAxMTAuMzY1TDEyNC44NSA3MC40NTY3Qzk1LjYgNTMuMjMxNSA2Ni4xNjI3IDM2LjQ5ODYgMzcuMzgxOCAxOC40NTI1IDI0LjQ1NzQgMTEuNDA3NSAxMS45NzEgMi45OTQyLTEuMTcyMzgtMy41MTEzN0wtMy4wOTU3NC0xLjQ1NDg3Qy00LjEwNDI0IDc0LjQ1MjQtMy4yMTMwOSAxNTAuNDkyLTMuMTU4MjcgMjI2LjQwOEwtMi40NzAxMyAyMjcuMDY0QzE1LjQ1MDIgMjM4LjA3NCAzMy45NzI4IDI0OC4wOTggNTIuMDU3NiAyNTguODU3IDg5Ljg4NDUgMjgxLjc1OCAxMjcuODY4IDMwNC4zODcgMTY2LjAwOCAzMjYuNzQ5IDE5MC4zNTUgMzQwLjk2NCAyMTguMTIgMzUzLjQyIDI0MC40MjYgMzcwLjQ4OVoiIGZpbGw9IiMyN0E5NUYiIGZpbGwtcnVsZT0iZXZlbm9kZCIgdHJhbnNmb3JtPSJtYXRyaXgoMSAwIDAgLTEgNDc1IDE1ODkpIi8+PHBhdGggZD0iTS0yLjc5MDM1IDE0Mi44MTFDLTIuNTQ5NjEgMTQzLjMyNS0yLjQwMzkxIDE0My45LTIuMDY3MjIgMTQ0LjM2Mi0wLjM2NTQxNCAxNDYuNjk3IDIyNy4yMjMgMjg0LjA1OCAyMzguOTk5IDI4OC4xNjIgMjY1LjgyMiAyNzMuNjA0IDQ3NS4xOTYgMTUwLjcwNSA0ODAuOTggMTQyLjY3MiA0ODEuNTY0IDE0MS44NyA0ODEuOCAxNDAuODYgNDgyLjIxIDEzOS45NDUgNDU5LjkxNCAxMjIuOTIgNDMyLjE3NSAxMTAuNDc5IDQwNy44NDcgOTYuMzAzOCAzNjkuNzM3IDczLjk4MjMgMzMxLjc3NSA1MS4zOTkzIDI5My45ODggMjguNTQ2NiAyNzUuOTE0IDE3LjgxMjUgMjU3LjQxMyA3LjgwMTg0IDIzOS40OTYtMy4xODQ1NkwyMzguODA3LTMuODM3OTJDMjMyLjg4NC0xLjE1NDY5IDIyNi45MzYgMy43MjQzNCAyMjEuNDMxIDcuMzE0MTEgMjEyLjYzIDEzLjA2NDIgMjAzLjY5OCAxOC41OTY5IDE5NC42MTcgMjMuOTExM0w2MS4zMjg4IDEwMy42MTMgMTkuODc0MiAxMjguMjA5QzEzLjM5MDYgMTMxLjk4MSA1Ljg2MDgzIDEzNS4zOTctMC4xNjU4MjggMTM5LjgwNS0xLjMyNDg1IDE0MC42NTktMS45NzQ4MyAxNDEuNjUyLTIuNzkwMzUgMTQyLjgxMVoiIGZpbGw9IiMxNjdGNEQiIGZpbGwtcnVsZT0iZXZlbm9kZCIgdHJhbnNmb3JtPSJtYXRyaXgoMSAwIDAgLTEgMjM0IDEzNTkpIi8+PHBhdGggZD0iTS0yLjQ2MzA3IDE0Mi44MTFDLTIuMjIxNzIgMTQzLjMyNS0yLjA3NTY2IDE0My45LTEuNzM4MTMgMTQ0LjM2Mi0wLjAzMjA2MTEgMTQ2LjY5NyAyMjguMTI2IDI4NC4wNTggMjM5LjkzMiAyODguMTYyIDI0MS4zNDggMTkxLjA1MiAyMzkuNzM5IDkzLjkxNjMgMjQwLjQzLTMuMTg0NTZMMjM5LjczOS0zLjgzNzkyQzIzMy44MDEtMS4xNTQ2OSAyMjcuODM4IDMuNzI0MzQgMjIyLjMyIDcuMzE0MTEgMjEzLjQ5NiAxMy4wNjQyIDIwNC41NDIgMTguNTk2OSAxOTUuNDM5IDIzLjkxMTNMNjEuODE2MyAxMDMuNjEzIDIwLjI1ODIgMTI4LjIwOUMxMy43NTgxIDEzMS45ODEgNi4yMDk3NyAxMzUuMzk3IDAuMTY4MDI0IDEzOS44MDUtMC45OTQxOTIgMTQwLjY1OS0xLjY0NTUxIDE0MS42NTItMi40NjMwNyAxNDIuODExWiIgZmlsbD0iIzI3QTk1RiIgZmlsbC1ydWxlPSJldmVub2RkIiB0cmFuc2Zvcm09Im1hdHJpeCgxIDAgMCAtMSAyMzQgMTM1OSkiLz48L2c+PC9zdmc+";
	function GateLogo(props) {
		const px = props && props.size ? props.size : 26;
		return h("img", { src: LOGO_URI, alt: "SkillTree", width: px, height: px, style: { display: "block", width: px + "px", height: "auto" } });
	}
	function GateHeader(props) {
		const onBack = props && props.back;
		return h("header", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "28px" } },
			h("span", { style: { display: "inline-flex", alignItems: "center", gap: "10px", fontWeight: 600, letterSpacing: ".02em" } },
				h(GateLogo, { size: 26 }), "SkillTree"),
			onBack
				? h("button", { onClick: onBack, style: { font: "inherit", fontSize: "14px", color: "#8a8a96", background: "transparent", border: "none", cursor: "pointer", padding: 0 } }, "Quay lại")
				: h("nav", { style: { display: "flex", gap: "22px", fontSize: "14px", color: "#8a8a96" } },
					h("button", { onClick: props.login, style: { font: "inherit", fontSize: "14px", color: "inherit", background: "transparent", border: "none", cursor: "pointer", padding: 0 } }, "Đăng nhập"),
					h("button", { onClick: props.register, style: { font: "inherit", fontSize: "14px", color: "inherit", background: "transparent", border: "none", cursor: "pointer", padding: 0 } }, "Đăng ký")));
	}
	function GateFormView(props) {
		const tab = props.tab, setTab = props.setTab, busy = props.busy, msg = props.msg;
		const inputStyle = { width: "100%", boxSizing: "border-box", padding: "11px 14px", fontSize: "14px", borderRadius: "12px", border: "1px solid #1d1d22", background: "rgba(255,255,255,.045)", color: "inherit", outline: "none", font: "inherit" };
		const btnPrimary = { font: "inherit", fontWeight: 600, fontSize: "14px", borderRadius: "999px", padding: "11px 24px", cursor: "pointer", border: "1px solid #27A95F", background: "#27A95F", color: "#00130a" };
		const btnGhost = { font: "inherit", fontWeight: 600, fontSize: "14px", borderRadius: "999px", padding: "11px 24px", cursor: "pointer", border: "1px solid #3a3a44", background: "transparent", color: "inherit" };
		return h("div", { style: { minHeight: "calc(100vh - 76px)", display: "grid", placeItems: "center", paddingBottom: "40px" } },
			h("div", { style: { width: "min(420px, 100%)", border: "1px solid #1d1d22", borderRadius: "16px", padding: "26px", background: "rgba(255,255,255,.02)" } },
				h("div", { style: { display: "flex", gap: "8px", marginBottom: "18px", justifyContent: "center" } },
					h("button", { style: Object.assign({}, btnGhost, tab === "login" ? { borderColor: "#27A95F", color: "#56C974" } : null), onClick: () => setTab("login") }, "Đăng nhập"),
					h("button", { style: Object.assign({}, btnGhost, tab === "register" ? { borderColor: "#27A95F", color: "#56C974" } : null), onClick: () => setTab("register") }, "Đăng ký")),
				tab === "login"
					? h("form", { onSubmit: props.doLogin, style: { display: "flex", flexDirection: "column", gap: "12px" } },
						h("input", { placeholder: "Tên đăng nhập", value: props.username, onChange: (e) => props.setUsername(e.target.value), style: inputStyle, autoComplete: "username" }),
						h("input", { placeholder: "Mật khẩu", type: "password", value: props.password, onChange: (e) => props.setPassword(e.target.value), style: inputStyle, autoComplete: "current-password" }),
						h("button", { type: "submit", disabled: busy, style: Object.assign({}, btnPrimary, busy ? { opacity: .6 } : null) }, busy ? "Đang xử lý…" : "Vào SkillTree"))
					: h("form", { onSubmit: props.doRegister, style: { display: "flex", flexDirection: "column", gap: "12px" } },
						h("input", { placeholder: "Tên đăng nhập", value: props.username, onChange: (e) => props.setUsername(e.target.value), style: inputStyle, autoComplete: "username" }),
						h("input", { placeholder: "Mật khẩu", type: "password", value: props.password, onChange: (e) => props.setPassword(e.target.value), style: inputStyle, autoComplete: "new-password" }),
						h("input", { placeholder: "Nhập lại mật khẩu", type: "password", value: props.confirmPassword, onChange: (e) => props.setConfirmPassword(e.target.value), style: inputStyle, autoComplete: "new-password" }),
						h("select", { value: props.role, onChange: (e) => props.setRole(e.target.value), style: inputStyle },
							h("option", { value: "student" }, "Học sinh"),
							h("option", { value: "teacher" }, "Giáo viên")),
						props.role === "teacher" ? h("input", { placeholder: "Mã giáo viên (nếu có)", value: props.adminToken, onChange: (e) => props.setAdminToken(e.target.value), style: inputStyle }) : null,
						h("button", { type: "submit", disabled: busy, style: Object.assign({}, btnPrimary, busy ? { opacity: .6 } : null) }, busy ? "Đang tạo…" : "Tạo tài khoản")),
				msg ? h("p", { style: { margin: "12px 0 0", fontSize: "13px", color: msg.ok ? "#56C974" : "#ff7a68", textAlign: "center" } }, msg.text) : null,
				h("p", { style: { margin: "16px 0 0", fontSize: "12px", color: "#8a8a96", lineHeight: 1.5, textAlign: "center" } },
					"Tài khoản đầu tiên của hệ thống tự trở thành quản trị viên. Hồ sơ năng lực gắn với mã học sinh ẩn danh — không lưu dữ liệu cá nhân.")));
	}

	function AuthGate() {

		const [status, setStatus] = useState("checking");
		const [tab, setTab] = useState("login");
		const [view, setView] = useState("landing");
		const [username, setUsername] = useState("");
		const [password, setPassword] = useState("");
		const [confirmPassword, setConfirmPassword] = useState("");
		const [role, setRole] = useState("student");
		const [adminToken, setAdminToken] = useState("");
		const [msg, setMsg] = useState(null);
		const [busy, setBusy] = useState(false);

		useEffect(function verifyOnMount() {
			const candidate = readAuth();
			if (!candidate) { setStatus("anon"); return; }
			authCall("/skilltree-auth/verify", null, candidate)
				.then(() => setStatus("authed"))
				.catch(() => { clearAuth(); setStatus("anon"); });
		}, []);

		function openForm(t) { setTab(t); setView("form"); }

		async function doLogin(ev) {
			ev.preventDefault();
			setBusy(true); setMsg(null);
			try {
				const data = await authCall("/skilltree-auth/login", { username: username, password: password });
				saveSession(data);
				setStatus("authed");
			} catch (e) { setMsg({ ok: false, text: "Đăng nhập thất bại: " + e.message }); }
			setBusy(false);
		}

		async function doRegister(ev) {
			ev.preventDefault();
			if (password !== confirmPassword) { setMsg({ ok: false, text: "Mật khẩu nhập lại chưa khớp." }); return; }
			setBusy(true); setMsg(null);
			try {
				const headers = adminToken ? { "X-Admin-Token": adminToken } : undefined;
				const data = await authCall("/skilltree-auth/register", { username: username, password: password, role: role }, null, headers);
				saveSession(data);
				setStatus("authed");
			} catch (e) { setMsg({ ok: false, text: "Đăng ký thất bại: " + e.message }); }
			setBusy(false);
		}

		if (status !== "anon") return null;
		const cols = [
			{ c: "#4a55ff", t: "Tải đề cương lên", d: "Nạp syllabus hoặc tài liệu môn học — hệ thống tách thành các kỹ năng nhỏ rồi nối thành đồ thị kiến thức." },
			{ c: "#ff9fdc", t: "Học đúng thứ tự", d: "Mỗi kỹ năng chỉ nên học khi nền tảng đã chắc — đồ thị chỉ ra bước tiếp theo hợp lý nhất." },
			{ c: "#2fff8a", t: "Nhìn thấy cả lớp", d: "Giáo viên thấy ngay nút nào nhiều học sinh đang vấp để hỗ trợ đúng lúc, đúng người." },
		];
		if (view === "form") {
			return h("div", { style: { position: "fixed", inset: 0, zIndex: 9999, background: "#000", color: "#e9e9ee", overflow: "auto", fontFamily: "inherit" } },
				h("div", { style: { maxWidth: "1360px", margin: "0 auto", padding: "0 clamp(20px,5vw,72px)" } },
					h(GateHeader, { back: () => setView("landing") }),
					h(GateFormView, { tab: tab, setTab: setTab, busy: busy, msg: msg, doLogin: doLogin, doRegister: doRegister,
						username: username, setUsername: setUsername, password: password, setPassword: setPassword,
						confirmPassword: confirmPassword, setConfirmPassword: setConfirmPassword, role: role, setRole: setRole,
						adminToken: adminToken, setAdminToken: setAdminToken })));
		}
		return h("div", { style: { position: "fixed", inset: 0, zIndex: 9999, background: "#000", color: "#e9e9ee", overflow: "auto", fontFamily: "inherit" } },
			h("div", { style: { maxWidth: "1360px", margin: "0 auto", padding: "0 clamp(20px,5vw,72px)" } },
				h(GateHeader, { login: () => openForm("login"), register: () => openForm("register") }),
				h("section", { style: { display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: "clamp(24px,5vw,72px)", alignItems: "center", padding: "clamp(28px,6vh,72px) 0 40px" } },
					h("div", null,
						h("h1", { style: { fontWeight: 300, fontSize: "clamp(34px,4.4vw,62px)", lineHeight: 1.12, letterSpacing: "-.01em", margin: "0 0 20px", maxWidth: "11em" } }, "Decode the invisible thread"),
						h("p", { style: { color: "#8a8a96", fontSize: "clamp(15px,1.2vw,17px)", lineHeight: 1.6, margin: "0 0 26px", maxWidth: "30em" } },
							"Mỗi môn học là một mạng lưới kỹ năng: nút là điều bạn cần biết, nối là thứ tự nên học. Đăng nhập để hệ thống ghi nhớ bước tiếp theo của riêng bạn."),
						h("div", { style: { display: "flex", gap: "12px", flexWrap: "wrap" } },
							h("button", { style: { font: "inherit", fontWeight: 600, fontSize: "14px", borderRadius: "999px", padding: "11px 24px", cursor: "pointer", border: "1px solid #27A95F", background: "#27A95F", color: "#00130a" }, onClick: () => openForm("login") }, "Đăng nhập"),
							h("button", { style: { font: "inherit", fontWeight: 600, fontSize: "14px", borderRadius: "999px", padding: "11px 24px", cursor: "pointer", border: "1px solid #3a3a44", background: "transparent", color: "inherit" }, onClick: () => openForm("register") }, "Đăng ký"))),
					h(GateArt, null))),
			h("section", { style: { maxWidth: "1360px", margin: "0 auto", padding: "0 clamp(20px,5vw,72px)" } },
				h("div", { style: { borderTop: "1px solid #1d1d22", padding: "clamp(32px,6vh,64px) 0 56px" } },
					h("h2", { style: { fontWeight: 300, fontSize: "clamp(24px,2.6vw,34px)", margin: "0 0 30px", maxWidth: "16em" } }, "Ba sợi chỉ nối kiến thức thành một lộ trình"),
					h("div", { style: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "clamp(18px,3vw,44px)" } },
						cols.map((c2) => h("div", { key: c2.t, style: { borderTop: "2px solid " + c2.c, paddingTop: "16px" } },
							h("h3", { style: { fontWeight: 600, fontSize: "16px", margin: "0 0 8px" } }, c2.t),
							h("p", { style: { margin: 0, color: "#8a8a96", fontSize: "14px", lineHeight: 1.55, maxWidth: "26em" } }, c2.d)))),
					h("footer", { style: { borderTop: "1px solid #1d1d22", marginTop: "44px", paddingTop: "20px", display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", fontSize: "12px", color: "#55555f" } },
						h("span", null, "SkillTree"),
						h("span", null, "Nghệ thuật nền theo bộ “Neurones” của Colorpong.com")))));
	}

	exports.inject = ["slots"];

	exports.apply = function apply(ctx) {
		ctx.slots.inject("shell.overlay", () => ctx.slots.register({
			name: "shell.overlay",
			id: NS + "-gate",
			order: 12,
			label: () => "Auth gate",
			inject: () => ({}),
		}, () => h(AuthGate)));
		ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
			name: "sidebar.panellist",
			id: NS,
			order: 19,
			label: "Đăng nhập",
		}, SidebarIcon));
		ctx.slots.inject("main", () => ctx.slots.register({ name: "main", key: NS }, AuthPage));
	};
	return module.exports;
}});
