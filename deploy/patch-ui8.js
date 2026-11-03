// patch-ui8.js — gate v2: canvas cay Neurones (port tu landing HTML) + form chi hien khi bam CTA
// Run on CLONE: docker run --rm -v /tmp/skill-tree-fix:/ws -w /ws node:22-alpine node deploy/patch-ui8.js
const fs = require('fs');
const F = '/ws/services/skill-tree-service/plugins/skilltree-auth-ui/client/client.js';
let s = fs.readFileSync(F, 'utf8');
if (s.includes('GateArt')) { console.log('skip: GateArt present'); process.exit(0); }
const once = (re, rep, tag) => { const m = s.match(re); if (!m) throw new Error('MISS: ' + tag); s = s.replace(re, rep); };

const GATE_V2 = `
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
		return h("div", { style: { position: "relative", width: "100%", maxWidth: "440px", justifySelf: "end", background: "#000" } },
			h("canvas", { ref: cvRef, style: { display: "block", width: "100%", background: "#000", borderRadius: "12px", border: "1px solid #1d1d22" } }),
			h("div", { style: { display: "flex", gap: "2px", marginTop: "12px" } },
				legend.map((c) => h("span", { key: c, style: { flex: "1", height: "5px", background: c, display: "inline-block" } }))),
			h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", fontSize: "11px", color: "#55555f", gap: "8px" } },
				h("span", { ref: stRef }, seedTxt),
				h("button", { onClick: () => runRef.current && runRef.current(), style: { font: "inherit", fontSize: "11px", color: "#8a8a96", background: "transparent", border: "1px solid #3a3a44", borderRadius: "999px", padding: "3px 10px", cursor: "pointer" } }, "Mọc lại")));
	}

	function AuthGate() {
		const [status, setStatus] = useState("checking");
		const [tab, setTab] = useState("login");
		const [showForm, setShowForm] = useState(false);
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

		function openForm(t) { setTab(t); setShowForm(true); }

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
						h("button", { onClick: () => openForm("login"), style: { font: "inherit", fontSize: "14px", color: "inherit", background: "transparent", border: "none", cursor: "pointer", padding: 0 } }, "Đăng nhập"),
						h("button", { onClick: () => openForm("register"), style: { font: "inherit", fontSize: "14px", color: "inherit", background: "transparent", border: "none", cursor: "pointer", padding: 0 } }, "Đăng ký"))),
				h("section", { style: { display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: "clamp(24px,5vw,72px)", alignItems: "center", padding: "clamp(28px,6vh,72px) 0 40px" } },
					h("div", null,
						h("h1", { style: { fontWeight: 300, fontSize: "clamp(34px,4.4vw,62px)", lineHeight: 1.12, letterSpacing: "-.01em", margin: "0 0 20px", maxWidth: "11em" } }, "Decode the invisible thread"),
						h("p", { style: { color: "#8a8a96", fontSize: "clamp(15px,1.2vw,17px)", lineHeight: 1.6, margin: "0 0 26px", maxWidth: "30em" } },
							"Mỗi môn học là một mạng lưới kỹ năng: nút là điều bạn cần biết, nối là thứ tự nên học. Đăng nhập để hệ thống ghi nhớ bước tiếp theo của riêng bạn."),
						h("div", { style: { display: "flex", gap: "12px", flexWrap: "wrap" } },
							h("button", { style: btnPrimary, onClick: () => openForm("login") }, "Đăng nhập"),
							h("button", { style: btnGhost, onClick: () => openForm("register") }, "Đăng ký"))),
					showForm
						? h("div", { style: { border: "1px solid #1d1d22", borderRadius: "16px", padding: "22px", background: "rgba(255,255,255,.02)", justifySelf: "stretch", maxWidth: "440px", justifyItems: "start", width: "100%" } },
							h("div", { style: { display: "flex", gap: "8px", marginBottom: "16px" } },
								h("button", { style: Object.assign({}, btnGhost, tab === "login" ? { borderColor: "#27A95F", color: "#56C974" } : null), onClick: () => setTab("login") }, "Đăng nhập"),
								h("button", { style: Object.assign({}, btnGhost, tab === "register" ? { borderColor: "#27A95F", color: "#56C974" } : null), onClick: () => setTab("register") }, "Đăng ký"),
								h("button", { onClick: () => setShowForm(false), style: { font: "inherit", fontSize: "12px", color: "#8a8a96", background: "transparent", border: "none", cursor: "pointer", marginLeft: "auto" } }, "Quay lại")),
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
								"Tài khoản đầu tiên của hệ thống tự trở thành quản trị viên. Hồ sơ năng lực gắn với mã học sinh ẩn danh — không lưu dữ liệu cá nhân."))
						: h(GateArt, null)),
				h("section", { style: { borderTop: "1px solid #1d1d22", padding: "clamp(32px,6vh,64px) 0 56px" } },
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

once(/\tfunction AuthGate\(\) \{[\s\S]*?\n\t\}\n\n\texports\.inject = \["slots"\];/, GATE_V2 + "\n", 'AuthGate v1 block');
fs.writeFileSync(F, s);
console.log('gate v2 OK — cay Neurones + form on click');
