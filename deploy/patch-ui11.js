// patch-ui11.js — gate v4: logo SkillTree + form view rieng CANH GIUA (bam CTA thi chi form, khong hero)
// + ui9 (bo vien canvas, margin-right 100px)
// Run on CLONE: docker run --rm -v /tmp/skill-tree-fix:/ws -w /ws node:22-alpine node deploy/patch-ui11.js
const fs = require('fs');
const F = '/ws/services/skill-tree-service/plugins/skilltree-auth-ui/client/client.js';
let s = fs.readFileSync(F, 'utf8');
if (s.includes('GateFormView')) { console.log('skip: v4 present'); process.exit(0); }
const once = (re, rep, tag) => { const m = s.match(re); if (!m) throw new Error('MISS: ' + tag); s = s.replace(re, rep); };

// 0) ui9: bo vien canvas + margin-right 100px
const a = 'style: { position: "relative", width: "100%", maxWidth: "440px", justifySelf: "end", background: "#000" }';
const b = 'style: { position: "relative", width: "100%", maxWidth: "440px", justifySelf: "end", background: "#000", marginRight: "100px" }';
const c = 'style: { display: "block", width: "100%", background: "#000", borderRadius: "12px", border: "1px solid #1d1d22" }';
const d = 'style: { display: "block", width: "100%", background: "#000" }';
if (s.includes(a)) s = s.replace(a, b);
if (s.includes(c)) s = s.replace(c, d);

// 1) LOGO_URI + GateLogo (doc deploy/logo-sm.svg tu clone)
const logoSvg = fs.readFileSync('/ws/deploy/logo-sm.svg', 'utf8').trim();
const logoUri = 'data:image/svg+xml;base64,' + Buffer.from(logoSvg).toString('base64');
const HEAD = `\tconst LOGO_URI = "${logoUri}";
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

\tfunction AuthGate() {`;

once(/\tfunction AuthGate\(\) \{/, HEAD + "\n", 'AuthGate head');

// 2) showForm -> view
s = s.replace('const [showForm, setShowForm] = useState(false);', 'const [view, setView] = useState("landing");');
s = s.replace('function openForm(t) { setTab(t); setShowForm(true); }', 'function openForm(t) { setTab(t); setView("form"); }');

// 3) thay toan bo JSX return cua AuthGate: landing | form
const RETURN_RE = /\t\tif \(status !== "anon"\) return null;\n\t\tconst inputStyle[\s\S]*?h\("span", null, "Nghệ thuật nền theo bộ “Neurones” của Colorpong\.com"\)\)\)\)\n\t\t\);\n\t\}/;
const NEW_RETURN = `\t\tif (status !== "anon") return null;
\t\tconst cols = [
\t\t\t{ c: "#4a55ff", t: "Tải đề cương lên", d: "Nạp syllabus hoặc tài liệu môn học — hệ thống tách thành các kỹ năng nhỏ rồi nối thành đồ thị kiến thức." },
\t\t\t{ c: "#ff9fdc", t: "Học đúng thứ tự", d: "Mỗi kỹ năng chỉ nên học khi nền tảng đã chắc — đồ thị chỉ ra bước tiếp theo hợp lý nhất." },
\t\t\t{ c: "#2fff8a", t: "Nhìn thấy cả lớp", d: "Giáo viên thấy ngay nút nào nhiều học sinh đang vấp để hỗ trợ đúng lúc, đúng người." },
\t\t];
\t\tif (view === "form") {
\t\t\treturn h("div", { style: { position: "fixed", inset: 0, zIndex: 9999, background: "#000", color: "#e9e9ee", overflow: "auto", fontFamily: "inherit" } },
\t\t\t\th("div", { style: { maxWidth: "1360px", margin: "0 auto", padding: "0 clamp(20px,5vw,72px)" } },
\t\t\t\t\th(GateHeader, { back: () => setView("landing") }),
\t\t\t\t\th(GateFormView, { tab: tab, setTab: setTab, busy: busy, msg: msg, doLogin: doLogin, doRegister: doRegister,
\t\t\t\t\t\tusername: username, setUsername: setUsername, password: password, setPassword: setPassword,
\t\t\t\t\t\tconfirmPassword: confirmPassword, setConfirmPassword: setConfirmPassword, role: role, setRole: setRole,
\t\t\t\t\t\tadminToken: adminToken, setAdminToken: setAdminToken })));
\t\t}
\t\treturn h("div", { style: { position: "fixed", inset: 0, zIndex: 9999, background: "#000", color: "#e9e9ee", overflow: "auto", fontFamily: "inherit" } },
\t\t\th("div", { style: { maxWidth: "1360px", margin: "0 auto", padding: "0 clamp(20px,5vw,72px)" } },
\t\t\t\th(GateHeader, { login: () => openForm("login"), register: () => openForm("register") }),
\t\t\t\th("section", { style: { display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: "clamp(24px,5vw,72px)", alignItems: "center", padding: "clamp(28px,6vh,72px) 0 40px" } },
\t\t\t\t\th("div", null,
\t\t\t\t\t\th("h1", { style: { fontWeight: 300, fontSize: "clamp(34px,4.4vw,62px)", lineHeight: 1.12, letterSpacing: "-.01em", margin: "0 0 20px", maxWidth: "11em" } }, "Decode the invisible thread"),
\t\t\t\t\t\th("p", { style: { color: "#8a8a96", fontSize: "clamp(15px,1.2vw,17px)", lineHeight: 1.6, margin: "0 0 26px", maxWidth: "30em" } },
\t\t\t\t\t\t\t"Mỗi môn học là một mạng lưới kỹ năng: nút là điều bạn cần biết, nối là thứ tự nên học. Đăng nhập để hệ thống ghi nhớ bước tiếp theo của riêng bạn."),
\t\t\t\t\t\th("div", { style: { display: "flex", gap: "12px", flexWrap: "wrap" } },
\t\t\t\t\t\t\th("button", { style: { font: "inherit", fontWeight: 600, fontSize: "14px", borderRadius: "999px", padding: "11px 24px", cursor: "pointer", border: "1px solid #27A95F", background: "#27A95F", color: "#00130a" }, onClick: () => openForm("login") }, "Đăng nhập"),
\t\t\t\t\t\t\th("button", { style: { font: "inherit", fontWeight: 600, fontSize: "14px", borderRadius: "999px", padding: "11px 24px", cursor: "pointer", border: "1px solid #3a3a44", background: "transparent", color: "inherit" }, onClick: () => openForm("register") }, "Đăng ký"))),
\t\t\t\t\th(GateArt, null))),
\t\t\th("section", { style: { maxWidth: "1360px", margin: "0 auto", padding: "0 clamp(20px,5vw,72px)" } },
\t\t\t\th("div", { style: { borderTop: "1px solid #1d1d22", padding: "clamp(32px,6vh,64px) 0 56px" } },
\t\t\t\t\th("h2", { style: { fontWeight: 300, fontSize: "clamp(24px,2.6vw,34px)", margin: "0 0 30px", maxWidth: "16em" } }, "Ba sợi chỉ nối kiến thức thành một lộ trình"),
\t\t\t\t\th("div", { style: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "clamp(18px,3vw,44px)" } },
\t\t\t\t\t\tcols.map((c2) => h("div", { key: c2.t, style: { borderTop: "2px solid " + c2.c, paddingTop: "16px" } },
\t\t\t\t\t\t\th("h3", { style: { fontWeight: 600, fontSize: "16px", margin: "0 0 8px" } }, c2.t),
\t\t\t\t\t\t\th("p", { style: { margin: 0, color: "#8a8a96", fontSize: "14px", lineHeight: 1.55, maxWidth: "26em" } }, c2.d)))),
\t\t\t\t\th("footer", { style: { borderTop: "1px solid #1d1d22", marginTop: "44px", paddingTop: "20px", display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", fontSize: "12px", color: "#55555f" } },
\t\t\t\t\t\th("span", null, "SkillTree"),
\t\t\t\t\t\th("span", null, "Nghệ thuật nền theo bộ “Neurones” của Colorpong.com")))));
\t}`;
once(RETURN_RE, NEW_RETURN, 'AuthGate return block');
fs.writeFileSync(F, s);
console.log('gate v4 OK — logo + form view canh giua');
