/**
 * skilltree-auth-ui-v2 — client half
 *
 * Implements the exact layout and style of vAiPlatform login design
 * (from "vAiPlatform · Đăng nhập.html") with the official vai-brand logo,
 * while securely wiring auth against M11 auth-service via /skilltree-auth/* proxy.
 */
window.__ModuleLoader__.load({ id: "skilltree-auth-ui-v2", factory: (require) => {
	var module = { exports: {} };
	var exports = module.exports;
	const react = require("react");
	const { createElement: h, useState, useEffect, useCallback } = react;

	const NS = "skilltree-auth-ui-v2";
	const STORAGE_KEY = "skilltree.auth.v1";
	const GATEWAY_OVERRIDE_KEY = "skilltree.auth.gateway";

	/* ---- Inject exact CSS from vAiPlatform · Đăng nhập.html ---- */
	const CSS_TEXT = `
:root {
  --vai-bg: #151517;
  --vai-side: #1b1b1c;
  --vai-layer: #232324;
  --vai-field: #232324;
  --vai-btn: #3c3d3f;
  --vai-btn-hover: #4a4b4e;
  --vai-label: #f9fafb;
  --vai-label-2: #cfd3d6;
  --vai-label-3: #81858c;
  --vai-border: rgba(255,255,255,.12);
  --vai-border-2: rgba(255,255,255,.2);
  --vai-hover: rgba(255,255,255,.08);
  --vai-brand: #fd505a;
  --vai-brand-soft: rgba(253,80,90,.22);
  --vai-error: #f25a5a;
  --vai-ok: #22c55e;
}
.vai-auth-overlay, .vai-auth-overlay * {
  box-sizing: border-box !important;
}
.vai-auth-overlay {
  position: fixed !important;
  inset: 0 !important;
  z-index: 999999 !important;
  background: var(--vai-bg) !important;
  color: var(--vai-label) !important;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Arial, sans-serif !important;
  font-size: 14px !important;
  line-height: 1.5 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 24px !important;
}
.vai-auth-card {
  width: 100% !important;
  max-width: 380px !important;
  background: var(--vai-side) !important;
  border: 1px solid var(--vai-border) !important;
  border-radius: 10px !important;
  padding: 24px !important;
  box-shadow: 0 16px 40px rgba(0,0,0,0.5) !important;
}
.vai-auth-brand {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  margin-bottom: 24px !important;
}
.vai-auth-brand img {
  height: 24px !important;
  max-width: 240px !important;
  object-fit: contain !important;
  display: block !important;
}
.vai-auth-tabs {
  display: flex !important;
  gap: 24px !important;
  border-bottom: 1px solid var(--vai-border) !important;
  margin: 0 0 20px !important;
}
.vai-auth-tab {
  background: none !important;
  border: 0 !important;
  border-bottom: 2px solid transparent !important;
  color: var(--vai-label-2) !important;
  font-family: inherit !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  padding: 0 0 10px !important;
  margin-bottom: -1px !important;
  cursor: pointer !important;
  transition: color .15s, border-bottom-color .15s !important;
}
.vai-auth-tab:hover {
  color: var(--vai-label) !important;
}
.vai-auth-tab[aria-selected="true"] {
  color: var(--vai-brand) !important;
  border-bottom-color: var(--vai-brand) !important;
}
.vai-auth-field {
  margin-bottom: 14px !important;
}
.vai-auth-field label {
  display: block !important;
  font-size: 13px !important;
  color: var(--vai-label-2) !important;
  margin-bottom: 6px !important;
  font-family: inherit !important;
}
.vai-auth-input {
  position: relative !important;
  width: 100% !important;
}
.vai-auth-input input {
  width: 100% !important;
  height: 38px !important;
  border-radius: 8px !important;
  border: 1px solid var(--vai-border) !important;
  background: var(--vai-field) !important;
  color: var(--vai-label) !important;
  font-family: inherit !important;
  font-size: 14px !important;
  padding: 0 12px !important;
  outline: none !important;
  transition: border-color .15s !important;
}
.vai-auth-input input::placeholder {
  color: var(--vai-label-3) !important;
}
.vai-auth-input input:focus {
  border-color: var(--vai-brand) !important;
  box-shadow: 0 0 0 2px var(--vai-brand-soft) !important;
}
.vai-auth-input input[aria-invalid="true"] {
  border-color: var(--vai-error) !important;
}
.vai-auth-input.has-toggle input {
  padding-right: 56px !important;
}
.vai-auth-toggle {
  position: absolute !important;
  right: 4px !important;
  top: 4px !important;
  height: 30px !important;
  padding: 0 8px !important;
  border: 0 !important;
  border-radius: 6px !important;
  background: none !important;
  color: var(--vai-label-3) !important;
  font-family: inherit !important;
  font-size: 12px !important;
  cursor: pointer !important;
}
.vai-auth-toggle:hover {
  background: var(--vai-hover) !important;
  color: var(--vai-label) !important;
}
.vai-auth-err {
  color: var(--vai-error) !important;
  font-size: 12px !important;
  margin: 5px 0 0 !important;
  font-family: inherit !important;
}
.vai-auth-row {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  font-size: 13px !important;
  margin: 2px 0 18px !important;
}
.vai-auth-check {
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
  color: var(--vai-label-2) !important;
  margin: 0 !important;
  font-size: 13px !important;
  cursor: pointer !important;
}
.vai-auth-check input {
  width: 14px !important;
  height: 14px !important;
  accent-color: var(--vai-brand) !important;
  margin: 0 !important;
}
.vai-auth-row a {
  color: var(--vai-brand) !important;
  text-decoration: none !important;
  font-size: 13px !important;
}
.vai-auth-row a:hover {
  text-decoration: underline !important;
}
.vai-auth-btn {
  width: 100% !important;
  height: 38px !important;
  border: 1px solid var(--vai-border-2) !important;
  border-radius: 8px !important;
  background: var(--vai-btn) !important;
  color: var(--vai-label) !important;
  font-family: inherit !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  cursor: pointer !important;
  transition: background .15s !important;
}
.vai-auth-btn:hover:not(:disabled) {
  background: var(--vai-btn-hover) !important;
}
.vai-auth-btn:disabled {
  opacity: 0.6 !important;
  cursor: wait !important;
}
.vai-auth-btn.ghost {
  background: none !important;
  border-color: var(--vai-border) !important;
}
.vai-auth-btn.ghost:hover {
  background: var(--vai-hover) !important;
}
.vai-auth-or {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  color: var(--vai-label-3) !important;
  font-size: 12px !important;
  margin: 16px 0 !important;
}
.vai-auth-or::before, .vai-auth-or::after {
  content: "" !important;
  flex: 1 !important;
  height: 1px !important;
  background: var(--vai-border) !important;
}
.vai-auth-foot {
  text-align: center !important;
  color: var(--vai-label-3) !important;
  font-size: 13px !important;
  margin: 16px 0 0 !important;
  font-family: inherit !important;
}
.vai-auth-foot button {
  background: none !important;
  border: 0 !important;
  color: var(--vai-brand) !important;
  font-family: inherit !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  cursor: pointer !important;
  padding: 0 !important;
}
.vai-auth-done {
  text-align: center !important;
  padding: 8px 0 4px !important;
}
.vai-auth-done h2 {
  font-size: 16px !important;
  font-weight: 500 !important;
  margin: 12px 0 2px !important;
  color: var(--vai-label) !important;
}
.vai-auth-done p {
  margin: 0 !important;
  color: var(--vai-label-2) !important;
  font-size: 13px !important;
}
.vai-auth-tick {
  width: 32px !important;
  height: 32px !important;
  border-radius: 50% !important;
  background: var(--vai-ok) !important;
  display: grid !important;
  place-items: center !important;
  margin: 0 auto !important;
}
`;

	function ensureStyle() {
		if (typeof document === "undefined") return;
		if (document.getElementById("vai-platform-auth-style")) return;
		const style = document.createElement("style");
		style.id = "vai-platform-auth-style";
		style.textContent = CSS_TEXT;
		document.head.appendChild(style);
	}
	ensureStyle();

	/* ---- Session helpers ---- */
	function loadSession() {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (!raw) return null;
			const parsed = JSON.parse(raw);
			if (parsed && typeof parsed.token === "string" && parsed.token.length > 0) return parsed;
		} catch (e) {}
		return null;
	}

	function saveSession(data) {
		try {
			if (!data || !data.token) return;
			localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
		} catch (e) {}
	}

	function clearSession() {
		try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
	}

	function getGatewayOverride() {
		try { return localStorage.getItem(GATEWAY_OVERRIDE_KEY) || ""; } catch (e) { return ""; }
	}

	async function authCall(path, body, token, extraHeaders) {
		const headers = { "Content-Type": "application/json" };
		if (token) headers["Authorization"] = "Bearer " + token;
		if (extraHeaders) Object.assign(headers, extraHeaders);
		const payload = Object.assign({}, body || {});
		const override = getGatewayOverride();
		if (override) payload.__baseUrl = override;
		const res = await fetch(path, { method: "POST", headers: headers, body: JSON.stringify(payload) });
		const text = await res.text();
		let json = null;
		try { json = JSON.parse(text); } catch (e) {}
		if (!res.ok) {
			const err = json && json.error;
			const msg = (err && (err.message || err.code)) || ("HTTP " + res.status);
			throw new Error(msg);
		}
		return json;
	}

	/* ---- Official vai-brand Assets ---- */
	function BrandLogo(props) {
		return h("img", {
			src: "/skilltree-auth/logo.svg",
			alt: "vAiPlatform",
			style: Object.assign({
				height: "24px",
				maxWidth: "240px",
				objectFit: "contain",
				display: "block"
			}, (props && props.style) || {})
		});
	}

	function BrandIcon(props) {
		return h("img", {
			src: "/skilltree-auth/icon.svg",
			alt: "vAiPlatform",
			style: Object.assign({
				width: "22px",
				height: "22px",
				objectFit: "contain",
				display: "block"
			}, (props && props.style) || {})
		});
	}

	/* ---- vAiPlatform Auth Gate Overlay Component ---- */
	function AuthGate() {
		const [session, setSession] = useState(loadSession);
		const [status, setStatus] = useState(session ? "checking" : "anon");
		const [tab, setTab] = useState("login");
		const [username, setUsername] = useState("");
		const [name, setName] = useState("");
		const [password, setPassword] = useState("");
		const [confirmPassword, setConfirmPassword] = useState("");
		const [showPassword, setShowPassword] = useState(false);
		const [busy, setBusy] = useState(false);
		const [errorMsg, setErrorMsg] = useState("");
		const [doneMsg, setDoneMsg] = useState(null);

		useEffect(() => {
			ensureStyle();
			if (!session || !session.token) {
				setStatus("anon");
				return;
			}
			let active = true;
			authCall("/skilltree-auth/verify", {}, session.token)
				.then(() => { if (active) setStatus("authed"); })
				.catch(() => {
					if (!active) return;
					clearSession();
					setSession(null);
					setStatus("anon");
				});
			return () => { active = false; };
		}, []);

		async function handleLogin(e) {
			if (e) e.preventDefault();
			setErrorMsg("");
			if (!username.trim()) { setErrorMsg("Vui lòng nhập Email."); return; }
			if (!password) { setErrorMsg("Vui lòng nhập Mật khẩu."); return; }
			setBusy(true);
			try {
				const data = await authCall("/skilltree-auth/login", {
					username: username.trim(),
					password: password
				});
				saveSession(data);
				setSession(data);
				setDoneMsg({ title: "Đăng nhập thành công", sub: username });
				setTimeout(() => setStatus("authed"), 1000);
			} catch (err) {
				setErrorMsg(err.message || "Đăng nhập thất bại.");
			}
			setBusy(false);
		}

		async function handleRegister(e) {
			if (e) e.preventDefault();
			setErrorMsg("");
			if (!name.trim()) { setErrorMsg("Vui lòng nhập Họ và tên."); return; }
			if (!username.trim()) { setErrorMsg("Vui lòng nhập Email."); return; }
			if (password.length < 8) { setErrorMsg("Mật khẩu cần ít nhất 8 ký tự."); return; }
			if (password !== confirmPassword) { setErrorMsg("Nhập lại mật khẩu chưa khớp."); return; }
			setBusy(true);
			try {
				const data = await authCall("/skilltree-auth/register", {
					username: username.trim(),
					password: password,
					name: name.trim(),
					role: "student"
				});
				saveSession(data);
				setSession(data);
				setDoneMsg({ title: "Đăng ký thành công", sub: username });
				setTimeout(() => setStatus("authed"), 1200);
			} catch (err) {
				setErrorMsg(err.message || "Đăng ký thất bại.");
			}
			setBusy(false);
		}

		// When authenticated, do not show modal overlay
		if (status === "authed" || status === "checking") return null;

		return h("div", { className: "vai-auth-overlay" },
			h("main", { className: "vai-auth-card" },
				// Header Brand with official vai-brand logo (logo.svg)
				h("div", { className: "vai-auth-brand" },
					h(BrandLogo)
				),

				// Done Success State
				doneMsg ? h("div", { className: "vai-auth-done" },
					h("div", { className: "vai-auth-tick" },
						h("svg", {
							width: "16", height: "16", viewBox: "0 0 24 24", fill: "none",
							stroke: "#fff", strokeWidth: "3.2", strokeLinecap: "round", strokeLinejoin: "round"
						}, h("path", { d: "M5 12.5l4.5 4.5L19 7.5" }))
					),
					h("h2", null, doneMsg.title),
					h("p", null, doneMsg.sub)
				) :

				// Main Form Container
				h("div", null,
					// Tabs
					h("div", { className: "vai-auth-tabs", role: "tablist" },
						h("button", {
							type: "button",
							role: "tab",
							"aria-selected": String(tab === "login"),
							className: "vai-auth-tab",
							onClick: () => { setTab("login"); setErrorMsg(""); }
						}, "Đăng nhập"),
						h("button", {
							type: "button",
							role: "tab",
							"aria-selected": String(tab === "register"),
							className: "vai-auth-tab",
							onClick: () => { setTab("register"); setErrorMsg(""); }
						}, "Đăng ký")
					),

					// Form body
					h("form", {
						onSubmit: tab === "login" ? handleLogin : handleRegister,
						noValidate: true
					},
						// Field: Name (Register only)
						tab === "register" ? h("div", { className: "vai-auth-field" },
							h("label", null, "Họ và tên"),
							h("div", { className: "vai-auth-input" },
								h("input", {
									type: "text",
									value: name,
									onChange: (e) => setName(e.target.value),
									placeholder: "Nguyễn Văn A",
									autoComplete: "name"
								})
							)
						) : null,

						// Field: Email / Username
						h("div", { className: "vai-auth-field" },
							h("label", null, "Email"),
							h("div", { className: "vai-auth-input" },
								h("input", {
									type: "email",
									value: username,
									onChange: (e) => setUsername(e.target.value),
									placeholder: "ban@example.com",
									autoComplete: "email"
								})
							)
						),

						// Field: Password
						h("div", { className: "vai-auth-field" },
							h("label", null, "Mật khẩu"),
							h("div", { className: "vai-auth-input has-toggle" },
								h("input", {
									type: showPassword ? "text" : "password",
									value: password,
									onChange: (e) => setPassword(e.target.value),
									placeholder: "Ít nhất 8 ký tự",
									autoComplete: tab === "login" ? "current-password" : "new-password"
								}),
								h("button", {
									type: "button",
									className: "vai-auth-toggle",
									onClick: () => setShowPassword(!showPassword)
								}, showPassword ? "Ẩn" : "Hiện")
							)
						),

						// Field: Confirm Password (Register only)
						tab === "register" ? h("div", { className: "vai-auth-field" },
							h("label", null, "Nhập lại mật khẩu"),
							h("div", { className: "vai-auth-input" },
								h("input", {
									type: "password",
									value: confirmPassword,
									onChange: (e) => setConfirmPassword(e.target.value),
									placeholder: "Nhập lại mật khẩu",
									autoComplete: "new-password"
								})
							)
						) : null,

						// Login Row: Remember me + Forgot password (Login only)
						tab === "login" ? h("div", { className: "vai-auth-row" },
							h("label", { className: "vai-auth-check" },
								h("input", { type: "checkbox", defaultChecked: true }),
								" Ghi nhớ đăng nhập"
							),
							h("a", { href: "#quen-mat-khau", onClick: (e) => e.preventDefault() }, "Quên mật khẩu?")
						) : null,

						// Error Message
						errorMsg ? h("p", { className: "vai-auth-err" }, errorMsg) : null,

						// Submit button
						h("button", {
							type: "submit",
							disabled: busy,
							className: "vai-auth-btn",
							style: { marginTop: "14px" }
						}, busy ? "Đang xử lý..." : (tab === "login" ? "Đăng nhập" : "Đăng ký")),

						// SSO Section (Login only)
						tab === "login" ? h("div", null,
							h("div", { className: "vai-auth-or" }, "hoặc"),
							h("button", {
								type: "button",
								className: "vai-auth-btn ghost"
							}, "Tiếp tục với SSO")
						) : null
					),

					// Bottom Switch
					h("p", { className: "vai-auth-foot" },
						tab === "login" ? "Chưa có tài khoản? " : "Đã có tài khoản? ",
						h("button", {
							type: "button",
							onClick: () => { setTab(tab === "login" ? "register" : "login"); setErrorMsg(""); }
						}, tab === "login" ? "Đăng ký" : "Đăng nhập")
					)
				)
			)
		);
	}

	/* ---- Sidebar Icon & Settings Card ---- */
	function SidebarIcon() {
		return h("div", {
			title: "Tài khoản SkillTree",
			style: { display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }
		}, h(BrandIcon));
	}

	function SettingsPage() {
		const [session, setSession] = useState(loadSession);
		return h("div", {
			style: {
				padding: "24px",
				color: "#f9fafb",
				fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Arial, sans-serif'
			}
		},
			h("div", {
				style: {
					maxWidth: "380px",
					background: "#1b1b1c",
					border: "1px solid rgba(255,255,255,.12)",
					borderRadius: "10px",
					padding: "24px"
				}
			},
				h("div", { style: { marginBottom: "20px" } }, h(BrandLogo)),
				session ? h("div", null,
					h("div", { style: { fontSize: "13px", color: "#cfd3d6", marginBottom: "8px" } }, "Trạng thái phiên đăng nhập"),
					h("div", { style: { fontSize: "16px", fontWeight: "500", color: "#f9fafb", marginBottom: "16px" } },
						"Xin chào, ", h("strong", { style: { color: "#fd505a" } }, session.username || "User")
					),
					h("button", {
						onClick: () => { clearSession(); setSession(null); location.reload(); },
						className: "vai-auth-btn",
						style: { background: "#f25a5a", color: "#fff", border: "none" }
					}, "Đăng xuất")
				) : h("div", null,
					h("p", { style: { color: "#cfd3d6", fontSize: "13px", margin: "0 0 16px" } }, "Bạn chưa đăng nhập vào hệ thống."),
					h("button", {
						onClick: () => location.reload(),
						className: "vai-auth-btn"
					}, "Mở bảng đăng nhập")
				)
			)
		);
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
			label: () => (loadSession() ? "Tài khoản" : "Đăng nhập"),
		}, SidebarIcon));

		ctx.slots.inject("main", () => ctx.slots.register({ name: "main", key: NS }, SettingsPage));
	};

	return module.exports;
}});
