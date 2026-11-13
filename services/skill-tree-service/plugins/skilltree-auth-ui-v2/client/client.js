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

	/* ---- Official vai-brand Vector Mark ---- */
	function VaiBrandIcon() {
		return h("svg", {
			viewBox: "0 0 791 791",
			width: 28,
			height: 28,
			style: { flex: "none" }
		}, h("g", { transform: "translate(466 -145)" },
			h("path", {
				d: "M83.26 249.22c-1.09 1.08-1.09 1.08-1.87 2.9-.31.82-.62 1.61-.92 2.4-.35.92-.7 1.82-1.04 2.72-.57 1.5-.57 1.5-1.13 2.97-3.21 8.44-6.25 16.92-9.18 25.46-2.81 8.24-5.85 16.33-9.18 24.37-.38.9-.75 1.78-1.13 2.66-.35.85-.7 1.67-1.04 2.5-2.19 5.14-3.3 10.07-1.99 15.57.67 1.73.67 1.73 1.33 3.42.5 1.32.99 2.61 1.48 3.89 1.4 3.56 2.77 7.13 4.12 10.71.29.77.57 1.51.85 2.25 2.68 7.02 5.2 14.08 7.63 21.2 3.72 10.96 7.55 21.85 11.67 32.66 2.84 7.44 5.54 14.9 8.04 22.46 2.81 8.57 5.66 17.09 8.85 25.53 3.96 10.39 7.8 20.82 11.49 31.31 7.86 22.39 7.86 22.39 27.52 76.79 18.87 0 37.18 0 55.49 0v-4.35l-.98-3.14-.69-1.84c-.68-1.81-1.46-3.9-2.24-5.99-.79-2.09-1.58-4.18-2.37-6.27-1.05-2.78-2.09-5.55-3.12-8.33-.4-1.07-.4-1.07-.79-2.11-2.44-6.54-4.79-13.1-7.09-19.69-3.5-10.03-7.05-20.04-10.63-30.04-.34-.96-.68-1.9-.99-2.82-5.32-14.86-10.67-29.7-16.05-44.54-4.05-11.15-8.04-22.32-11.9-33.54-2.85-8.29-5.75-16.55-8.77-24.78-3.33-9.07-6.6-18.17-9.83-27.28-.27-.74-.52-1.47-.78-2.19-2.43-6.84-4.85-13.68-7.27-20.53-4.42-12.52-8.85-25.02-13.3-37.52-1.24-3.47-2.47-6.93-3.71-10.4-1.23-3.48-2.47-6.95-3.7-10.42-.48-1.34-.95-2.64-1.41-3.94-.46-1.29-.9-2.55-1.35-3.8-.43-1.19-.84-2.35-1.26-3.51-1.21-3.42-2.28-5.88-4.31-8.92z",
				fill: "#FD505A"
			}),
			h("path", {
				d: "M-4.35 227.74c-3.19 8-6.42 15.94-9.41 24-.44 1.2-.44 1.2-.88 2.38-1.03 2.77-2.05 5.55-3.08 8.32-.74 2-.1.47-.84 4-2.7 6.82-5.41 13.64-8.15 20.45-3.47 8.16-7.04 16.3-10.61 24.45-2.26 6.08-4.52 12.16-6.78 18.25-1.41 3.8-2.82 7.6-4.23 11.4-.46 1.25-.92 2.5-1.38 3.75-.49 1.3-.96 2.56-1.43 3.82-.68 1.83-.68 1.83-1.34 3.62-1.97 5.3-1.97 5.3-5.62 17.48h19.1v-16.91l6.28-16.89c4.44-11.96 8.88-23.92 13.3-35.89.46-1.26.92-2.48 1.37-3.7 1.84-4.98 3.68-9.97 5.52-14.96 4.79-12.98 9.57-25.96 14.45-38.9.6-1.58.6-1.58 1.19-3.13 1.81-4.81 3.62-9.61 5.45-14.41.65-1.71 1.31-3.43 1.95-5.14.45-1.21.45-1.21.9-2.39 2.33-6.02 3.74-11.71 5.16-18.12H-4.35z",
				fill: "#FD505A"
			}),
			h("path", {
				d: "M-417.63 262.86h324c-3.67 12.18-3.67 12.18-5.92 17.51-.47 1.13-.95 2.26-1.44 3.43-.49 1.14-.97 2.28-1.47 3.46-.5 1.18-.99 2.36-1.5 3.58-3.65 8.64-3.65 8.64-4.89 9.87-3.16.11-6.3.15-9.46.14-1.01 0-2.02 0-3.06 0-3.43 0-6.85 0-10.28 0-2.47 0-4.94 0-7.41 0-6.8 0-13.6 0-20.4 0-4.28 0-8.56 0-12.83 0-77.79 0-155.58-.6-233.37-1.18-1.71-4.71-3.41-9.43-5.11-14.15-.58-1.6-1.16-3.21-1.74-4.81-.84-2.3-1.67-4.61-2.5-6.92-.26-.72-.52-1.44-.79-2.17-1.1-3.07-1.83-5.44-1.83-8.72z",
				fill: "#FD4F59"
			})
		));
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
		const [role, setRole] = useState("student");
		const [busy, setBusy] = useState(false);
		const [errorMsg, setErrorMsg] = useState("");
		const [doneMsg, setDoneMsg] = useState(null);

		const verifyCurrent = useCallback(async () => {
			const cur = loadSession();
			if (!cur || !cur.token) { setStatus("anon"); return; }
			try {
				await authCall("/skilltree-auth/verify", {}, cur.token);
				setStatus("authed");
			} catch (e) {
				clearSession();
				setSession(null);
				setStatus("anon");
			}
		}, []);

		useEffect(() => {
			if (session) verifyCurrent();
		}, [verifyCurrent]);

		async function handleLogin(e) {
			if (e) e.preventDefault();
			setErrorMsg("");
			if (!username.trim()) { setErrorMsg("Vui lòng nhập Email hoặc tên tài khoản."); return; }
			if (password.length < 6) { setErrorMsg("Mật khẩu cần ít nhất 6 ký tự."); return; }
			setBusy(true);
			try {
				const data = await authCall("/skilltree-auth/login", { username: username.trim(), password: password });
				saveSession(data);
				setSession(data);
				setDoneMsg({ title: "Đăng nhập thành công", sub: username });
				setTimeout(() => setStatus("authed"), 1200);
			} catch (err) {
				setErrorMsg(err.message || "Đăng nhập thất bại.");
			}
			setBusy(false);
		}

		async function handleRegister(e) {
			if (e) e.preventDefault();
			setErrorMsg("");
			if (!name.trim()) { setErrorMsg("Vui lòng nhập họ và tên của bạn."); return; }
			if (!username.trim()) { setErrorMsg("Vui lòng nhập Email hợp lệ."); return; }
			if (password.length < 8) { setErrorMsg("Mật khẩu bảo mật cần ít nhất 8 ký tự."); return; }
			if (password !== confirmPassword) { setErrorMsg("Mật khẩu nhập lại chưa khớp."); return; }
			setBusy(true);
			try {
				const data = await authCall("/skilltree-auth/register", {
					username: username.trim(),
					password: password,
					name: name.trim(),
					role: role
				});
				saveSession(data);
				setSession(data);
				setDoneMsg({ title: "Đăng ký tài khoản thành công", sub: username });
				setTimeout(() => setStatus("authed"), 1400);
			} catch (err) {
				setErrorMsg(err.message || "Đăng ký thất bại.");
			}
			setBusy(false);
		}

		// When authenticated, do not show modal overlay
		if (status === "authed" || status === "checking") return null;

		return h("div", {
			style: {
				position: "fixed",
				inset: 0,
				zIndex: 99999,
				background: "#151517",
				color: "#f9fafb",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				padding: "24px",
				fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Arial, sans-serif'
			}
		},
			h("main", {
				style: {
					width: "100%",
					maxWidth: "380px",
					background: "#1b1b1c",
					border: "1px solid rgba(255,255,255,.12)",
					borderRadius: "10px",
					padding: "24px"
				}
			},
				// Header Brand with official vai-brand logo
				h("div", {
					style: {
						display: "flex",
						alignItems: "center",
						gap: "10px",
						marginBottom: "24px"
					}
				},
					h(VaiBrandIcon),
					h("b", {
						style: {
							fontSize: "18px",
							fontWeight: "500",
							letterSpacing: "0.1px"
						}
					}, "v", h("i", { style: { fontStyle: "normal", color: "#fd505a" } }, "Ai"), "Platform"),
					h("span", {
						style: {
							fontSize: "9px",
							fontWeight: "600",
							letterSpacing: "0.4px",
							border: "1px solid rgba(255,255,255,.2)",
							borderRadius: "3px",
							padding: "1px 4px",
							color: "#cfd3d6",
							marginLeft: "auto"
						}
					}, "SKILLTREE")
				),

				// Done Success State
				doneMsg ? h("div", { style: { padding: "16px 0", textAlign: "center" } },
					h("div", {
						style: {
							width: "36px",
							height: "36px",
							borderRadius: "50%",
							background: "#22c55e",
							display: "grid",
							placeItems: "center",
							margin: "0 auto 12px"
						}
					}, h("svg", {
						width: "18", height: "18", viewBox: "0 0 24 24", fill: "none",
						stroke: "#fff", strokeWidth: "3.2", strokeLinecap: "round", strokeLinejoin: "round"
					}, h("path", { d: "M5 12.5l4.5 4.5L19 7.5" }))),
					h("h2", { style: { fontSize: "16px", fontWeight: "600", margin: "0 0 4px" } }, doneMsg.title),
					h("p", { style: { margin: 0, color: "#cfd3d6", fontSize: "13px" } }, doneMsg.sub)
				) :

				// Main Form
				h("div", null,
					// Tabs
					h("div", {
						style: {
							display: "flex",
							gap: "24px",
							borderBottom: "1px solid rgba(255,255,255,.12)",
							marginBottom: "20px"
						}
					},
						h("button", {
							type: "button",
							onClick: () => { setTab("login"); setErrorMsg(""); },
							style: {
								background: "none",
								border: 0,
								borderBottom: tab === "login" ? "2px solid #fd505a" : "2px solid transparent",
								color: tab === "login" ? "#fd505a" : "#cfd3d6",
								font: "inherit",
								fontWeight: "500",
								padding: "0 0 10px",
								marginBottom: "-1px",
								cursor: "pointer"
							}
						}, "Đăng nhập"),
						h("button", {
							type: "button",
							onClick: () => { setTab("register"); setErrorMsg(""); },
							style: {
								background: "none",
								border: 0,
								borderBottom: tab === "register" ? "2px solid #fd505a" : "2px solid transparent",
								color: tab === "register" ? "#fd505a" : "#cfd3d6",
								font: "inherit",
								fontWeight: "500",
								padding: "0 0 10px",
								marginBottom: "-1px",
								cursor: "pointer"
							}
						}, "Đăng ký")
					),

					// Form body
					h("form", {
						onSubmit: tab === "login" ? handleLogin : handleRegister
					},
						// Field: Name (Register only)
						tab === "register" ? h("div", { style: { marginBottom: "14px" } },
							h("label", { style: { display: "block", fontSize: "13px", color: "#cfd3d6", marginBottom: "6px" } }, "Họ và tên"),
							h("input", {
								type: "text",
								value: name,
								onChange: (e) => setName(e.target.value),
								placeholder: "Nguyễn Văn A",
								style: {
									width: "100%", height: "38px", borderRadius: "8px",
									border: "1px solid rgba(255,255,255,.12)", background: "#232324",
									color: "#f9fafb", padding: "0 12px", outline: "none", boxSizing: "border-box"
								}
							})
						) : null,

						// Field: Email / Username
						h("div", { style: { marginBottom: "14px" } },
							h("label", { style: { display: "block", fontSize: "13px", color: "#cfd3d6", marginBottom: "6px" } }, "Tài khoản hoặc Email"),
							h("input", {
								type: "text",
								value: username,
								onChange: (e) => setUsername(e.target.value),
								placeholder: "ban@example.com hoặc username",
								style: {
									width: "100%", height: "38px", borderRadius: "8px",
									border: "1px solid rgba(255,255,255,.12)", background: "#232324",
									color: "#f9fafb", padding: "0 12px", outline: "none", boxSizing: "border-box"
								}
							})
						),

						// Field: Role (Register only)
						tab === "register" ? h("div", { style: { marginBottom: "14px" } },
							h("label", { style: { display: "block", fontSize: "13px", color: "#cfd3d6", marginBottom: "6px" } }, "Vai trò"),
							h("select", {
								value: role,
								onChange: (e) => setRole(e.target.value),
								style: {
									width: "100%", height: "38px", borderRadius: "8px",
									border: "1px solid rgba(255,255,255,.12)", background: "#232324",
									color: "#f9fafb", padding: "0 10px", outline: "none", boxSizing: "border-box"
								}
							},
								h("option", { value: "student" }, "Học sinh"),
								h("option", { value: "teacher" }, "Giáo viên")
							)
						) : null,

						// Field: Password
						h("div", { style: { marginBottom: "14px" } },
							h("label", { style: { display: "block", fontSize: "13px", color: "#cfd3d6", marginBottom: "6px" } }, "Mật khẩu"),
							h("div", { style: { position: "relative" } },
								h("input", {
									type: showPassword ? "text" : "password",
									value: password,
									onChange: (e) => setPassword(e.target.value),
									placeholder: "Ít nhất 6-8 ký tự",
									style: {
										width: "100%", height: "38px", borderRadius: "8px",
										border: "1px solid rgba(255,255,255,.12)", background: "#232324",
										color: "#f9fafb", padding: "0 54px 0 12px", outline: "none", boxSizing: "border-box"
									}
								}),
								h("button", {
									type: "button",
									onClick: () => setShowPassword(!showPassword),
									style: {
										position: "absolute", right: "4px", top: "4px", height: "30px",
										padding: "0 8px", border: 0, borderRadius: "6px", background: "none",
										color: "#81858c", cursor: "pointer", fontSize: "12px"
									}
								}, showPassword ? "Ẩn" : "Hiện")
							)
						),

						// Field: Confirm Password (Register only)
						tab === "register" ? h("div", { style: { marginBottom: "14px" } },
							h("label", { style: { display: "block", fontSize: "13px", color: "#cfd3d6", marginBottom: "6px" } }, "Nhập lại mật khẩu"),
							h("input", {
								type: "password",
								value: confirmPassword,
								onChange: (e) => setConfirmPassword(e.target.value),
								placeholder: "Xác nhận mật khẩu",
								style: {
									width: "100%", height: "38px", borderRadius: "8px",
									border: "1px solid rgba(255,255,255,.12)", background: "#232324",
									color: "#f9fafb", padding: "0 12px", outline: "none", boxSizing: "border-box"
								}
							})
						) : null,

						// Error Message
						errorMsg ? h("p", {
							style: { color: "#f25a5a", fontSize: "12px", margin: "4px 0 12px" }
						}, errorMsg) : null,

						// Remember me row (Login only)
						tab === "login" ? h("div", {
							style: {
								display: "flex", justifyContent: "space-between", alignItems: "center",
								fontSize: "13px", margin: "2px 0 18px"
							}
						},
							h("label", { style: { display: "flex", alignItems: "center", gap: "6px", color: "#cfd3d6", cursor: "pointer" } },
								h("input", { type: "checkbox", defaultChecked: true, style: { accentColor: "#fd505a" } }),
								"Ghi nhớ đăng nhập"
							),
							h("a", { href: "#", onClick: (e) => e.preventDefault(), style: { color: "#fd505a", textDecoration: "none" } }, "Quên mật khẩu?")
						) : null,

						// Submit button
						h("button", {
							type: "submit",
							disabled: busy,
							style: {
								width: "100%", height: "38px", border: "1px solid rgba(255,255,255,.2)",
								borderRadius: "8px", background: "#3c3d3f", color: "#f9fafb",
								fontWeight: "500", cursor: busy ? "wait" : "pointer", fontSize: "14px"
							}
						}, busy ? "Đang xử lý..." : (tab === "login" ? "Đăng nhập" : "Đăng ký"))
					),

					// Bottom Switch
					h("p", {
						style: { textAlign: "center", color: "#81858c", fontSize: "13px", marginTop: "16px" }
					},
						tab === "login" ? "Chưa có tài khoản? " : "Đã có tài khoản? ",
						h("button", {
							type: "button",
							onClick: () => { setTab(tab === "login" ? "register" : "login"); setErrorMsg(""); },
							style: { background: "none", border: 0, color: "#fd505a", cursor: "pointer", padding: 0, fontWeight: "500" }
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
		}, h(VaiBrandIcon));
	}

	function SettingsPage() {
		const [session, setSession] = useState(loadSession);
		return h("div", { style: { padding: "16px", color: "#f9fafb" } },
			h("h3", { style: { margin: "0 0 12px" } }, "Tài khoản vAiPlatform / SkillTree"),
			session ? h("div", null,
				h("p", null, "Đã đăng nhập: ", h("strong", null, session.username || "User")),
				h("button", {
					onClick: () => { clearSession(); setSession(null); location.reload(); },
					style: { padding: "6px 12px", background: "#f25a5a", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }
				}, "Đăng xuất")
			) : h("p", null, "Chưa đăng nhập.")
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
			label: "Đăng nhập",
		}, SidebarIcon));

		ctx.slots.inject("main", () => ctx.slots.register({ name: "main", key: NS }, SettingsPage));
	};

	return module.exports;
}});
