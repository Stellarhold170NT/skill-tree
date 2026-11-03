// patch-ui7.js — AUTH GATE: chua dang nhap = landing full-screen (design landing SkillTree,
// giu font DSH); login xong -> app. Ap dung tren GIT CLONE (/ws = /tmp/skill-tree-fix).
// Run: docker run --rm -v /tmp/skill-tree-fix:/ws -w /ws node:22-alpine node deploy/patch-ui7.js
const fs = require('fs');
const F = '/ws/services/skill-tree-service/plugins/skilltree-auth-ui/client/client.js';
let s = fs.readFileSync(F, 'utf8');
if (s.includes('AuthGate')) { console.log('skip: auth gate already present'); process.exit(0); }
const once = (re, rep, tag) => { const m = s.match(re); if (!m) throw new Error('MISS: ' + tag); s = s.replace(re, rep); };

const GATE = `
	function AuthGate() {
		const [status, setStatus] = useState("checking"); // checking | anon | authed
		const [tab, setTab] = useState("login");
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
		const inputStyle = { width: "100%", boxSizing: "border-box", padding: "11px 14px", fontSize: "14px", borderRadius: "12px", border: "1px solid #1d1d22", background: "rgba(255,255,255,.045)", color: "inherit", outline: "none", font: "inherit" };
		const btnPrimary = { font: "inherit", fontWeight: 600, fontSize: "14px", borderRadius: "999px", padding: "11px 24px", cursor: "pointer", border: "1px solid #27A95F", background: "#27A95F", color: "#00130a" };
		const btnGhost = { font: "inherit", fontWeight: 600, fontSize: "14px", borderRadius: "999px", padding: "11px 24px", cursor: "pointer", border: "1px solid #3a3a44", background: "transparent", color: "inherit" };
		const cols = [
			{ c: "#4a55ff", t: "Tải đề cương lên", d: "Nạp syllabus hoặc tài liệu môn học — hệ thống tách thành các kỹ năng nhỏ rồi nối thành đồ thị kiến thức." },
			{ c: "#ff9fdc", t: "Học đúng thứ tự", d: "Mỗi kỹ năng chỉ nên học khi nền tảng đã chắc — đồ thị chỉ ra bước tiếp theo hợp lý nhất." },
			{ c: "#2fff8a", t: "Nhìn thấy cả lớp", d: "Giáo viên thấy ngay nút nào nhiều học sinh đang vấp để hỗ trợ đúng lúc, đúng người." },
		];
		return h("div", { style: { position: "fixed", inset: 0, zIndex: 9999, background: "#000", color: "#e9e9ee", overflow: "auto", fontFamily: "inherit" } },
			h("div", { style: { maxWidth: "1360px", margin: "0 auto", padding: "0 clamp(20px,5vw,72px)" } },
				h("header", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "28px" } },
					h("span", { style: { display: "inline-flex", alignItems: "center", gap: "10px", fontWeight: 600, letterSpacing: ".02em" } },
						h(PageIcon, { size: 20, strokeWidth: 1.4 }), "SkillTree"),
					h("nav", { style: { display: "flex", gap: "22px", fontSize: "14px", color: "#8a8a96" } },
						h("a", { href: "#st-gate-lo-trinh", style: { color: "inherit" } }, "Lộ trình"),
						h("span", null, tab === "login" ? "Đăng nhập" : "Đăng ký"))),
				h("section", { style: { display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: "clamp(24px,5vw,72px)", alignItems: "center", padding: "clamp(28px,6vh,72px) 0 40px" } },
					h("div", null,
						h("h1", { style: { fontWeight: 300, fontSize: "clamp(34px,4.4vw,62px)", lineHeight: 1.12, letterSpacing: "-.01em", margin: "0 0 20px", maxWidth: "11em" } }, "Decode the invisible thread"),
						h("p", { style: { color: "#8a8a96", fontSize: "clamp(15px,1.2vw,17px)", lineHeight: 1.6, margin: "0 0 26px", maxWidth: "30em" } },
							"Mỗi môn học là một mạng lưới kỹ năng: nút là điều bạn cần biết, nối là thứ tự nên học. Đăng nhập để hệ thống ghi nhớ bước tiếp theo của riêng bạn."),
						h("div", { style: { display: "flex", gap: "12px", flexWrap: "wrap" } },
							h("button", { style: btnPrimary, onClick: () => setTab("login") }, tab === "login" ? "Đăng nhập" : "Chuyển sang đăng nhập"),
							h("button", { style: btnGhost, onClick: () => setTab("register") }, tab === "register" ? "Tạo tài khoản" : "Đăng ký"))),
					h("div", { style: { border: "1px solid #1d1d22", borderRadius: "16px", padding: "22px", background: "rgba(255,255,255,.02)" } },
						h("div", { style: { display: "flex", gap: "8px", marginBottom: "16px" } },
							h("button", { style: Object.assign({}, btnGhost, tab === "login" ? { borderColor: "#27A95F", color: "#56C974" } : null), onClick: () => setTab("login") }, "Đăng nhập"),
							h("button", { style: Object.assign({}, btnGhost, tab === "register" ? { borderColor: "#27A95F", color: "#56C974" } : null), onClick: () => setTab("register") }, "Đăng ký")),
						tab === "login"
							? h("form", { onSubmit: doLogin, style: { display: "flex", flexDirection: "column", gap: "12px" } },
								h("input", { placeholder: "Tên đăng nhập", value: username, onChange: (e) => setUsername(e.target.value), style: inputStyle, autoComplete: "username" }),
								h("input", { placeholder: "Mật khẩu", type: "password", value: password, onChange: (e) => setPassword(e.target.value), style: inputStyle, autoComplete: "current-password" }),
								h("button", { type: "submit", disabled: busy, style: Object.assign({}, btnPrimary, busy ? { opacity: .6 } : null) }, busy ? "Đang xử lý…" : "Vào SkillTree"))
							: h("form", { onSubmit: doRegister, style: { display: "flex", flexDirection: "column", gap: "12px" } },
								h("input", { placeholder: "Tên đăng nhập", value: username, onChange: (e) => setUsername(e.target.value), style: inputStyle, autoComplete: "username" }),
								h("input", { placeholder: "Mật khẩu", type: "password", value: password, onChange: (e) => setPassword(e.target.value), style: inputStyle, autoComplete: "new-password" }),
								h("input", { placeholder: "Nhập lại mật khẩu", type: "password", value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value), style: inputStyle, autoComplete: "new-password" }),
								h("select", { value: role, onChange: (e) => setRole(e.target.value), style: inputStyle },
									h("option", { value: "student" }, "Học sinh"),
									h("option", { value: "teacher" }, "Giáo viên")),
								role === "teacher" ? h("input", { placeholder: "Mã giáo viên (nếu có)", value: adminToken, onChange: (e) => setAdminToken(e.target.value), style: inputStyle }) : null,
								h("button", { type: "submit", disabled: busy, style: Object.assign({}, btnPrimary, busy ? { opacity: .6 } : null) }, busy ? "Đang tạo…" : "Tạo tài khoản")),
						msg ? h("p", { style: { margin: "10px 0 0", fontSize: "13px", color: msg.ok ? "#56C974" : "#ff7a68" } }, msg.text) : null,
						h("p", { style: { margin: "14px 0 0", fontSize: "12px", color: "#8a8a96", lineHeight: 1.5 } },
							"Tài khoản đầu tiên của hệ thống tự trở thành quản trị viên. Hồ sơ năng lực gắn với mã học sinh ẩn danh — không lưu dữ liệu cá nhân."))),
				h("section", { id: "st-gate-lo-trinh", style: { borderTop: "1px solid #1d1d22", padding: "clamp(32px,6vh,64px) 0 56px" } },
					h("h2", { style: { fontWeight: 300, fontSize: "clamp(24px,2.6vw,34px)", margin: "0 0 30px", maxWidth: "16em" } }, "Ba sợi chỉ nối kiến thức thành một lộ trình"),
					h("div", { style: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "clamp(18px,3vw,44px)" } },
						cols.map((c) => h("div", { key: c.t, style: { borderTop: "2px solid " + c.c, paddingTop: "16px" } },
							h("h3", { style: { fontWeight: 600, fontSize: "16px", margin: "0 0 8px" } }, c.t),
							h("p", { style: { margin: 0, color: "#8a8a96", fontSize: "14px", lineHeight: 1.55, maxWidth: "26em" } }, c.d)))),
					h("footer", { style: { borderTop: "1px solid #1d1d22", marginTop: "44px", paddingTop: "20px", display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", fontSize: "12px", color: "#55555f" } },
						h("span", null, "SkillTree"),
						h("span", null, "Nghệ thuật nền theo bộ “Neurones” của Colorpong.com"))))
		);
	}

	exports.inject = ["slots"];`;

// replace the existing exports.inject/apply block: keep main page + add gate overlay
once(/\texports\.inject = \["slots"\];\n\texports\.apply = function apply\(ctx\) \{\n\t\tctx\.slots\.inject\("sidebar\.panellist"[\s\S]*?\n\t\};/, GATE + `
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
	};`, 'auth apply block');

// PageIcon must be defined before AuthGate uses it at render time (hoisting: function decls are fine).
fs.writeFileSync(F, s);
console.log('auth gate OK — landing pre-login + app post-login');
