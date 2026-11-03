/**
 * skilltree-student-ui — CLIENT half (no build step; platform module format).
 *
 * Registers one additive `shell.overlay` entry (order 57): a floating
 * "🎒 Học sinh" button and a warm, student-facing dashboard. One purpose per
 * screen (DESIGN.md tone: "feels like a bookshop" — Georgia serif headings,
 * encouraging copy, no information cramming):
 *
 *   Tổng quan   — "Lớp của tôi + Lộ trình của tôi": M6 classes of the logged-in
 *                 student (by sourcedId), M1 concept graph as a readable spine
 *                 with M5 mastery states and the M5 next-concept highlighted.
 *   Tài liệu    — Notebook-style study material: upload → ingest progress
 *                 (rag-service job pipeline) → Q&A with section-path citations.
 *   Kiểm tra    — quick quiz: M2 items by concept, submit bulk attempts, then
 *                 push results to M5 so mastery + the next recommendation move.
 *   Cài đặt     — student sourcedId (M6), gateway override, JWT account info.
 *
 * All traffic goes through the host routes POST /skilltree-student/{batch,
 * quiz-submit,mastery-update,rag-upload,rag-ask} — the page never addresses
 * services directly, and the student JWT (skilltree-auth-ui, localStorage
 * "skilltree.auth.v1") is forwarded per request.
 *
 * Design tokens: only DESIGN.md values (brand leaf green + deep teal ink +
 * sanctioned red/amber). Anti-slop: flat surfaces, no gradients/glass/glow,
 * AA text contrast, radius 4/8/12/999, 4px spacing, no Inter/Geist, motion-free.
 */
window.__ModuleLoader__.load({ id: "skilltree-student-ui", factory: (require) => {
	var module = { exports: {} };
	var exports = module.exports;
	const react = require("react");
	const { createElement: h, useState, useEffect, useCallback } = react;

	const NS = "skilltree-student-ui";
	const STORE_KEY = "skilltree.studentui.settings";
	const AUTH_KEY = "skilltree.auth.v1";

	/* ---- DESIGN.md tokens (brand: leaf green + deep teal ink) ---- */
	const T = {
		primary50: "#F4FBF7",    // --st-primary-50
		primary100: "#E5F5EC",   // --st-primary-100
		primary200: "#C7E9D5",   // --st-primary-200
		primary500: "#27A95F",   // --st-primary-500 (brand fill, large UI only)
		boot: "#167F4D",         // --st-boot (white text on it: 5.03:1 AA)
		primary800: "#145831",   // --st-primary-800
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
		// Mastery semantics (DESIGN.md §2, dashboard-only):
		amberText: "#8A4B00",    // --st-warn (6.80:1 on white)
		amberTint: "#FFF4D6",    // --st-warn-tint
	};
	const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
	const SERIF = 'Georgia, "Times New Roman", serif';

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
			lineHeight: 1.5, fontSize: "14px",
			pointerEvents: "auto",
			display: "flex", flexDirection: "column", gap: "12px",
			paddingBottom: "24px",
		},
		head: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" },
		title: { margin: 0, fontSize: "20px", fontWeight: 700, color: T.ink, fontFamily: SERIF },
		subtitle: { margin: "2px 0 0", fontSize: "12px", color: T.muted },
		close: { border: "none", background: "none", fontSize: "20px", cursor: "pointer", color: T.muted, lineHeight: 1 },
		tabs: { display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" },
		tab: (active) => ({
			padding: "6px 14px", fontSize: "13px", fontWeight: active ? "600" : "400",
			borderRadius: "999px", border: "none", cursor: "pointer",
			background: active ? T.primary100 : "transparent",
			color: active ? T.primary800 : T.muted,
		}),
		greet: { margin: "12px 0 0", padding: "12px", borderRadius: "8px", background: T.primary50, border: "1px solid " + T.primary200 },
		greetLine: { margin: 0, fontSize: "15px", color: T.ink, fontFamily: SERIF, fontWeight: 600 },
		greetSub: { margin: "2px 0 0", fontSize: "12px", color: T.inkSoft },
		label: { display: "block", fontSize: "12px", fontWeight: 600, color: T.inkSoft, margin: "10px 0 2px" },
		input: {
			boxSizing: "border-box", padding: "7px 9px", fontSize: "13px", borderRadius: "4px",
			border: "1px solid " + T.border, background: T.surface, color: T.ink, outline: "none",
		},
		select: {
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
		row: { display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "flex-end" },
		section: { marginTop: "16px" },
		sectionTitle: { margin: 0, fontSize: "15px", fontWeight: 700, color: T.ink, fontFamily: SERIF },
		sectionSub: { margin: "2px 0 0", fontSize: "12px", color: T.muted },
		muted: { fontSize: "12px", color: T.muted },
		error: {
			marginTop: "10px", padding: "8px 10px", borderRadius: "8px", fontSize: "13px",
			background: T.dangerTint, color: T.danger,
		},
		okMsg: {
			marginTop: "10px", padding: "8px 10px", borderRadius: "8px", fontSize: "13px",
			background: T.successTint, color: T.successText,
		},
		warnMsg: {
			marginTop: "10px", padding: "8px 10px", borderRadius: "8px", fontSize: "13px",
			background: T.amberTint, color: T.amberText,
		},
		classCard: {
			display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px",
			padding: "8px 10px", borderRadius: "8px", border: "1px solid " + T.border,
			marginTop: "6px", background: T.surface,
		},
		className: { fontSize: "13px", fontWeight: 600, color: T.ink, margin: 0 },
		spine: { listStyle: "none", margin: "8px 0 0", padding: 0 },
		nodeItem: { position: "relative", margin: "0 0 6px 14px" },
		nodeHit: {
			display: "flex", gap: "8px", alignItems: "center", width: "100%", boxSizing: "border-box",
			textAlign: "left", padding: "8px 10px", borderRadius: "8px",
			border: "1px solid " + T.border, background: T.surface, cursor: "pointer",
			font: "inherit", color: T.body,
		},
		nodeHitNext: {
			display: "flex", gap: "8px", alignItems: "center", width: "100%", boxSizing: "border-box",
			textAlign: "left", padding: "8px 10px", borderRadius: "8px",
			border: "2px solid " + T.primary500, background: T.primary50, cursor: "pointer",
			font: "inherit", color: T.ink,
		},
		nodeDot: (color) => ({
			width: "12px", height: "12px", borderRadius: "999px", background: color, flexShrink: 0,
			border: "1px solid rgba(28,54,50,0.15)",
		}),
		nodeLabel: { flex: 1, fontSize: "13px", lineHeight: 1.35 },
		nodePct: { fontSize: "12px", color: T.inkSoft, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" },
		nextBadge: {
			padding: "2px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: 600,
			background: T.primary100, color: T.primary800,
		},
		progressTrack: {
			marginTop: "8px", height: "10px", borderRadius: "999px", background: T.tint,
			border: "1px solid " + T.border, overflow: "hidden",
		},
		progressFill: { height: "100%", background: T.primary500 },
		progressSteps: { display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "8px" },
		progressStep: (state) => ({
			padding: "2px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: 600,
			background: state === "done" ? T.successTint : state === "current" ? T.primary100 : T.tint,
			color: state === "done" ? T.successText : state === "current" ? T.primary800 : T.muted,
		}),
		questionBox: {
			width: "100%", boxSizing: "border-box", minHeight: "56px", resize: "vertical",
			padding: "8px 10px", fontSize: "13px", borderRadius: "8px",
			border: "1px solid " + T.border, background: T.surface, color: T.ink, outline: "none",
		},
		askItem: {
			marginTop: "8px", padding: "8px 10px", borderRadius: "8px",
			border: "1px solid " + T.border, background: T.surface,
		},
		askAnswer: {
			marginTop: "10px", padding: "10px", borderRadius: "8px", fontSize: "13px",
			background: T.primary50, border: "1px solid " + T.primary200, color: T.ink,
			whiteSpace: "pre-wrap",
		},
		citationPath: { fontSize: "12px", fontWeight: 600, color: T.primary800 },
		snippet: { fontSize: "12px", color: T.inkSoft, fontStyle: "italic", marginTop: "4px" },
		quizItem: {
			marginTop: "10px", padding: "10px", borderRadius: "8px",
			border: "1px solid " + T.border, background: T.surface,
		},
		quizPrompt: { margin: 0, fontSize: "14px", color: T.ink, fontWeight: 600 },
		choice: { display: "flex", gap: "8px", alignItems: "baseline", margin: "6px 0 0", fontSize: "13px", color: T.body },
		resultLine: { margin: "8px 0 0", fontSize: "14px", color: T.ink, fontWeight: 600, fontFamily: SERIF },
		divider: { borderTop: "1px solid " + T.tint, margin: "12px 0" },
		noteLine: { margin: "10px 0 0", fontSize: "12px", color: T.muted },
	};

	/* ---- settings persistence (browser-local; JWT stays in auth-ui storage) ---- */
	function loadSettings() {
		try {
			const parsed = JSON.parse(window.localStorage.getItem(STORE_KEY) || "{}");
			return parsed && typeof parsed === "object" ? parsed : {};
		} catch (e) { return {}; }
	}
	function saveSettings(settings) {
		try { window.localStorage.setItem(STORE_KEY, JSON.stringify(settings)); } catch (e) { /* private mode */ }
	}
	function readSession() {
		try {
			const parsed = JSON.parse(window.localStorage.getItem(AUTH_KEY) || "null");
			if (parsed && typeof parsed.accessToken === "string" && parsed.accessToken.length > 0) return parsed;
		} catch (e) { /* private mode */ }
		return null;
	}

	/* ---- host-route call (same-origin; JWT forwarded per request) ---- */
	function api(path, body, token) {
		return window.fetch(path, {
			method: "POST",
			headers: Object.assign(
				{ "content-type": "application/json" },
				token ? { authorization: "Bearer " + token } : {},
			),
			body: JSON.stringify(body),
		}).then((res) => res.json().catch(() => ({ ok: false, error: "HTTP " + res.status })));
	}

	/* ================= pure helpers (exported for tests, no DOM) ================= */

	function edgeIds(e) {
		// M1 build_graph: { source, target, type, sourceIdentifier, targetIdentifier }.
		// Nodes are keyed by CASE identifier — the *Identifier pair is authoritative
		// (same convention as skilltree-graph-dashboard / M5 next-concept matching).
		return {
			type: e.type || e.relationType || e.associationType || "",
			src: e.sourceIdentifier || e.source || e.originId || e.sourceId || "",
			dst: e.targetIdentifier || e.target || e.destinationId || e.targetId || "",
		};
	}

	/** Kahn topological order over isPrerequisiteOf edges (prereq → concept). */
	function linearize(graph) {
		const nodes = Array.isArray(graph && graph.nodes) ? graph.nodes : [];
		const edges = Array.isArray(graph && graph.edges) ? graph.edges : [];
		const idOf = (n) => n.identifier || n.id || "";
		const labelOf = (n) => n.humanCodingScheme ? n.humanCodingScheme + " · " + (n.fullStatement || "") : (n.fullStatement || n.title || idOf(n));
		const prereqs = new Map();
		const unlocks = new Map();
		nodes.forEach((n) => { prereqs.set(idOf(n), []); unlocks.set(idOf(n), []); });
		edges.forEach((e) => {
			const { type, src, dst } = edgeIds(e);
			if (!prereqs.has(src) || !prereqs.has(dst)) return;
			if (type.includes("isPrerequisiteOf")) { prereqs.get(dst).push(src); unlocks.get(src).push(dst); }
		});
		const indeg = new Map();
		prereqs.forEach((list, id) => indeg.set(id, list.length));
		const queue = nodes.map(idOf).filter((id) => indeg.get(id) === 0);
		const order = [];
		while (queue.length) {
			const id = queue.shift();
			order.push(id);
			(unlocks.get(id) || []).forEach((nxt) => {
				indeg.set(nxt, indeg.get(nxt) - 1);
				if (indeg.get(nxt) === 0) queue.push(nxt);
			});
		}
		// cycle fallback: append anything unvisited (degraded but visible)
		nodes.forEach((n) => { if (order.indexOf(idOf(n)) === -1) order.push(idOf(n)); });
		const byId = new Map(nodes.map((n) => [idOf(n), n]));
		return { order, byId, labelOf, prereqs, unlocks, idOf };
	}

	/** Mastery % display (M5 mastery is 0..1). */
	function pct(value) {
		const n = Number(value);
		if (!Number.isFinite(n)) return "—";
		return Math.round(n * 100) + "%";
	}

	/** Warm chip info per M5 mastery state (DESIGN.md §2 tokens, AA pairings). */
	function displayState(state) {
		switch (state) {
			case "green": return { label: "Nhớ tốt", bg: T.successTint, fg: T.successText, dot: T.primary500 };
			case "amber": return { label: "Ổn", bg: T.amberTint, fg: T.amberText, dot: "#F5C453" };
			case "red": return { label: "Cần ôn", bg: T.dangerTint, fg: T.danger, dot: "#D9534F" };
			case "rusty": return { label: "Sắp quên — ôn lại nhé", bg: T.amberTint, fg: T.amberText, dot: "#F5C453" };
			default: return { label: "Chưa học", bg: T.tint, fg: T.muted, dot: T.border };
		}
	}

	/**
	 * Per-node display state on the student spine.
	 * next (M5 recommendation) > mastery state > ready/locked from prereqs.
	 */
	function nodeState(masteryState, isNext, hasPrereqs) {
		if (isNext) return "next";
		if (masteryState === "green") return "done";
		if (masteryState === "amber" || masteryState === "red" || masteryState === "rusty") return "learning";
		return hasPrereqs ? "locked" : "ready";
	}

	/** Batch calls for the Tổng quan screen (GET-only, allow-listed prefixes). */
	function buildOverviewCalls(studentId, documentId) {
		const calls = [
			{ id: "user", prefix: "class", path: "users/" + encodeURIComponent(studentId) },
			{ id: "classes", prefix: "class", path: "users/" + encodeURIComponent(studentId) + "/classes" },
			{ id: "subjects", prefix: "case", path: "documents", query: "limit=200" },
		];
		if (documentId) {
			calls.push({ id: "graph", prefix: "case", path: "documents/" + encodeURIComponent(documentId) + "/graph" });
			calls.push({ id: "mastery", prefix: "learner", path: "students/" + encodeURIComponent(studentId) + "/mastery" });
			calls.push({ id: "next", prefix: "learner", path: "students/" + encodeURIComponent(studentId) + "/next", query: "documentId=" + encodeURIComponent(documentId) });
		}
		return calls;
	}

	function buildQuizItemsCall(conceptUri, limit) {
		const capped = Math.max(1, Math.min(Number(limit) || 5, 10));
		return { id: "items", prefix: "quiz", path: "items", query: "conceptUri=" + encodeURIComponent(conceptUri) + "&limit=" + capped };
	}

	function buildRagJobCall(jobId) {
		return { id: "job", prefix: "rag", path: "jobs/" + encodeURIComponent(jobId) };
	}

	function buildRagDocsCall(uploaderId) {
		const query = uploaderId ? "uploaderId=" + encodeURIComponent(uploaderId) : "limit=50";
		return { id: "docs", prefix: "rag", path: "documents", query };
	}

	/** M2 POST /attempts/bulk body (candidateId = M6 sourcedId). */
	function buildBulkAttemptBody(candidateId, answers) {
		return {
			candidateId: candidateId,
			responses: (answers || []).map((a) => ({ itemId: a.itemId, response: [a.choiceId] })),
		};
	}

	/** M5 POST /students/{id}/update/bulk body from scored attempts. */
	function buildMasteryBulkBody(attempts) {
		return {
			responses: (attempts || [])
				.filter((a) => a.conceptUri)
				.map((a) => ({ conceptUri: a.conceptUri, isCorrect: Boolean(a.isCorrect) })),
		};
	}

	/** "Chapter 4.2 › Institutions › Electoral Systems" from a rag citation. */
	function citationPath(citation) {
		if (!citation) return "";
		if (Array.isArray(citation.sectionPath) && citation.sectionPath.length > 0) return citation.sectionPath.join(" › ");
		return citation.heading || "";
	}

	/** rag-service ingest pipeline: status → student-facing step label. */
	const INGEST_STEPS = ["queued", "received", "parsed", "chunked", "mirrored", "ready"];
	function progressSteps(status) {
		const terminal = status === "ready" || status === "failed";
		const idx = INGEST_STEPS.indexOf(status);
		return INGEST_STEPS.map((step, i) => ({
			step,
			label: { queued: "Đang chờ", received: "Đã nhận", parsed: "Đã đọc", chunked: "Chia đoạn", mirrored: "Ghi sổ", ready: "Sẵn sàng" }[step],
			state: terminal ? "done" : idx >= 0 ? (i < idx ? "done" : i === idx ? "current" : "todo") : "todo",
		}));
	}

	function resultData(result) {
		return result && result.ok ? result.data : null;
	}
	function resultError(result) {
		return result && !result.ok ? (result.error || "HTTP " + result.status) : "";
	}

	/* ================= components ================= */

	function Chip(props) {
		const chip = displayState(props.state);
		return h("span", {
			title: chip.label,
			style: {
				display: "inline-block", padding: "2px 8px", borderRadius: "999px",
				fontSize: "11px", fontWeight: 600, textAlign: "center",
				background: chip.bg, color: chip.fg,
			},
		}, chip.label);
	}

	function ClassList(props) {
		const classes = Array.isArray(props.classes) ? props.classes : [];
		if (classes.length === 0) return h("p", { style: S.muted }, "Chưa thấy lớp nào gắn với mã này — hỏi cô/cứu phụ trách để được thêm vào lớp nhé.");
		return h("div", null, classes.map((c) =>
			h("div", { key: c.sourcedId, style: S.classCard },
				h("div", null,
					h("p", { style: S.className }, c.title || "(lớp không tên)"),
					h("div", { style: S.muted }, (c.term || "") + (c.courseSourcedId ? " · môn " + String(c.courseSourcedId).slice(0, 8) : "")),
				),
				h("span", { style: S.nextBadge }, "đang học"),
			),
		));
	}

	/** The learning-path spine: topo order + mastery + next highlight. */
	function Roadmap(props) {
		const { view, masteryMap, nextUri, onSelect, selectedUri } = props;
		if (!view || view.order.length === 0) return null;
		return h("ol", { style: S.spine },
			view.order.map((id) => {
				const node = view.byId.get(id) || {};
				const entry = masteryMap.get(id);
				const state = nodeState(entry ? entry.state : undefined, id === nextUri, (view.prereqs.get(id) || []).length > 0);
				const isNext = state === "next";
				return h("li", { key: id, style: S.nodeItem },
					h("button", {
						style: state === "next" ? S.nodeHitNext : S.nodeHit,
						onClick: () => onSelect(id, node),
					},
						h("span", { style: S.nodeDot(displayState(entry ? entry.state : undefined).dot) }),
						h("span", { style: S.nodeLabel }, view.labelOf(node)),
						entry ? h("span", { style: S.nodePct }, pct(entry.mastery)) : null,
						isNext ? h("span", { style: S.nextBadge }, "Học ngay") : null,
						!isNext && state === "locked" ? h("span", { style: S.nextBadge }, "Chưa mở") : null,
						selectedUri === id ? h("span", { style: S.nodePct }, "←") : null,
					),
				);
			}),
		);
	}

	function Citation(props) {
		const c = props.citation;
		return h("div", { style: S.askItem },
			h("div", { style: S.citationPath }, citationPath(c) || "(không rõ mục lục)"),
			h("div", { style: S.snippet }, "“" + String(c.snippet || "").slice(0, 220) + "”"),
			h("div", { style: S.muted }, "độ khớp " + pct(c.score) + (c.sourceUrl ? " · " + c.sourceUrl : "")),
		);
	}

	function UploadForm(props) {
		const { title, busy, onTitle, onFile, onUpload } = props;
		return h("div", null,
			h("label", { style: S.label }, "Tên tài liệu (tùy chọn)"),
			h("input", {
				style: Object.assign({}, S.input, { width: "100%" }),
				value: title, placeholder: "Ví dụ: Toán 10 — Chương 1 ôn tập",
				onChange: (e) => onTitle(e.target.value),
			}),
			h("label", { style: S.label }, "Chọn tệp (.md .txt .html .tex .zip .tar.gz — tối đa " + props.limitMb + "MB)"),
			h("input", { type: "file", accept: ".md,.txt,.html,.htm,.tex,.zip,.tar.gz,.tgz", onChange: (e) => onFile(e.target.files && e.target.files[0] ? e.target.files[0] : null) }),
			h("div", { style: Object.assign({}, S.row, { marginTop: "8px" }) },
				h("button", { style: S.btn, onClick: onUpload, disabled: busy || !props.file }, busy ? "Đang nạp…" : "Nạp tài liệu"),
			),
		);
	}

	function QuizForm(props) {
		const { items, answers, onPick, onSubmit, busy, submitted } = props;
		if (!items || items.length === 0) return h("p", { style: S.muted }, "Chưa có câu hỏi cho khái niệm này — thử chọn khái niệm khác trên lộ trình nhé.");
		return h("div", null,
			items.map((item) => {
				const picked = answers[item.id] || "";
				return h("div", { key: item.id, style: S.quizItem },
					h("p", { style: S.quizPrompt }, item.prompt),
					h("div", null, (Array.isArray(item.choices) ? item.choices : []).map((choice) =>
						h("label", { key: choice.identifier, style: S.choice },
							h("input", {
								type: "radio", name: "quiz-" + item.id, checked: picked === choice.identifier,
								onChange: () => onPick(item.id, choice.identifier),
							}),
							h("span", null, choice.text),
						),
					)),
					submitted && submitted[item.id]
						? h("p", { style: Object.assign({}, S.noteLine, { color: submitted[item.id].isCorrect ? T.successText : T.danger }) },
							submitted[item.id].isCorrect ? "Chính xác!" : "Chưa đúng — coi lại phần học nhé.")
						: null,
				);
			}),
			h("button", { style: S.btn, onClick: onSubmit, disabled: busy || Object.keys(answers).length === 0 },
				busy ? "Đang chấm…" : "Nộp bài",
			),
		);
	}

	/* ---- main panel ---- */

	function Panel(props) {
		const { onClose } = props;
		const [settings, setSettings] = useState(loadSettings);
		const [tab, setTab] = useState("overview");
		const [busy, setBusy] = useState(false);
		const [error, setError] = useState("");
		const [notice, setNotice] = useState("");

		// identity + overview data
		const [identity, setIdentity] = useState(null);
		const [classes, setClasses] = useState([]);
		const [subjects, setSubjects] = useState([]);
		const [graph, setGraph] = useState(null);
		const [mastery, setMastery] = useState([]);
		const [nextRec, setNextRec] = useState(null);

		// docs screen
		const [docTitle, setDocTitle] = useState("");
		const [docFile, setDocFile] = useState(null);
		const [uploadJob, setUploadJob] = useState(null);
		const [ragDocs, setRagDocs] = useState([]);
		const [question, setQuestion] = useState("");
		const [askResult, setAskResult] = useState(null);
		const [askMode, setAskMode] = useState("answer");

		// quiz screen
		const [quizItems, setQuizItems] = useState([]);
		const [answers, setAnswers] = useState({});
		const [quizBusy, setQuizBusy] = useState(false);
		const [quizResult, setQuizResult] = useState(null);
		const [submitted, setSubmitted] = useState({});

		const token = (readSession() || {}).accessToken || "";
		const studentId = settings.studentId || "";
		const documentId = settings.documentId || "";
		const uploadLimitMb = Number(props.uploadLimitMb) > 0 ? Number(props.uploadLimitMb) : 20;

		const update = (patch) => {
			setSettings((prev) => {
				const merged = Object.assign({}, prev, patch);
				saveSettings(merged);
				return merged;
			});
		};

		/* ---- overview load ---- */
		const loadOverview = useCallback(async () => {
			setError(""); setNotice("");
			if (!studentId) { setNotice('Hãy nhập "Mã học sinh (sourcedId)" ở tab Cài đặt để mình ghi nhận lớp và lộ trình của em nhé.'); return; }
			setBusy(true);
			try {
				const result = await api("/skilltree-student/batch", Object.assign(
					{ calls: buildOverviewCalls(studentId, documentId) },
					settings.gatewayOverride ? { __baseUrl: settings.gatewayOverride } : {},
				), token);
				if (!result || !result.ok) { setError(resultError(result) || "Không tải được dữ liệu"); return; }
				const byId = {};
				(result.results || []).forEach((r) => { byId[r.id] = r; });
				setIdentity(resultData(byId.user));
				setClasses(resultData(byId.classes) || []);
				setSubjects(resultData(byId.subjects) || []);
				if (documentId) {
					setGraph(resultData(byId.graph));
					setMastery(resultData(byId.mastery) || []);
					setNextRec(resultData(byId.next));
				} else {
					setGraph(null); setMastery([]); setNextRec(null);
				}
				if (identity && identity.role && identity.role !== "student") {
					setNotice("Giao diện này dành cho học sinh — tài khoản hiện tại đang là " + identity.role + ".");
				}
			} finally {
				setBusy(false);
			}
		}, [studentId, documentId, settings.gatewayOverride, token]);

		useEffect(() => { loadOverview(); }, []);

		/* ---- rag docs ---- */
		const loadRagDocs = useCallback(async () => {
			const result = await api("/skilltree-student/batch", Object.assign(
				{ calls: [buildRagDocsCall(studentId)] },
				settings.gatewayOverride ? { __baseUrl: settings.gatewayOverride } : {},
			), token);
			if (result && result.ok) {
				const row = (result.results || []).find((r) => r.id === "docs");
				const docs = resultData(row);
				setRagDocs(Array.isArray(docs) ? docs : (docs && Array.isArray(docs.documents) ? docs.documents : []));
			}
		}, [studentId, settings.gatewayOverride, token]);

		/* ---- upload + progress polling ---- */
		const uploadDoc = useCallback(async () => {
			setError(""); setNotice(""); setUploadJob(null);
			if (!docFile) { setError("Chọn tệp trước đã em nhé."); return; }
			setBusy(true);
			try {
				const form = new window.FormData();
				form.append("file", docFile);
				if (docTitle) form.append("title", docTitle);
				if (studentId) form.append("uploaderId", studentId);
				const res = await window.fetch("/skilltree-student/rag-upload", {
					method: "POST",
					headers: token ? { authorization: "Bearer " + token } : {},
					body: form,
				});
				const data = await res.json().catch(() => ({ ok: false, error: "HTTP " + res.status }));
				if (!data || !data.ok) { setError(data && data.error ? String(data.error) : "Nạp tài liệu thất bại"); return; }
				setUploadJob({ jobId: data.data.jobId, status: "queued", stageMs: null });
				setNotice("Đã nhận tệp — đang xử lý, theo dõi thanh tiến độ nhé.");
			} finally {
				setBusy(false);
			}
		}, [docFile, docTitle, studentId, token]);

		useEffect(() => {
			if (!uploadJob || uploadJob.status === "ready" || uploadJob.status === "failed") return undefined;
			const timer = window.setInterval(async () => {
				const result = await api("/skilltree-student/batch", Object.assign(
					{ calls: [buildRagJobCall(uploadJob.jobId)] },
					settings.gatewayOverride ? { __baseUrl: settings.gatewayOverride } : {},
				), token);
				const row = result && result.ok ? (result.results || []).find((r) => r.id === "job") : null;
				const job = resultData(row);
				if (job && job.status) {
					setUploadJob((prev) => Object.assign({}, prev, job));
					if (job.status === "ready" || job.status === "failed") loadRagDocs();
				}
			}, 1500);
			return () => window.clearInterval(timer);
		}, [uploadJob, settings.gatewayOverride, token]);

		/* ---- ask ---- */
		const sendAsk = useCallback(async () => {
			setError(""); setAskResult(null);
			if (!question.trim()) { setError("Gõ câu hỏi trước đã em nhé."); return; }
			setBusy(true);
			try {
				const body = { question, mode: askMode };
				if (settings.ragDocId) body.documentIds = [settings.ragDocId];
				const result = await api("/skilltree-student/rag-ask", Object.assign(body,
					settings.gatewayOverride ? { __baseUrl: settings.gatewayOverride } : {},
				), token);
				if (!result || !result.ok) { setError(resultError(result) || "Hỏi đáp thất bại"); return; }
				setAskResult(result.data);
			} finally {
				setBusy(false);
			}
		}, [question, askMode, settings.ragDocId, settings.gatewayOverride, token]);

		/* ---- quiz ---- */
		const loadQuiz = useCallback(async () => {
			setError(""); setQuizResult(null); setSubmitted({}); setAnswers({});
			const conceptUri = settings.conceptUri;
			if (!conceptUri) { setError("Chọn một khái niệm trên lộ trình (tab Tổng quan) hoặc dán đường dẫn khái niệm."); return; }
			setQuizBusy(true);
			try {
				const result = await api("/skilltree-student/batch", Object.assign(
					{ calls: [buildQuizItemsCall(conceptUri, 5)] },
					settings.gatewayOverride ? { __baseUrl: settings.gatewayOverride } : {},
				), token);
				const row = result && result.ok ? (result.results || []).find((r) => r.id === "items") : null;
				if (!row || !row.ok) { setError(row ? row.error : "Không tải được câu hỏi"); return; }
				setQuizItems(Array.isArray(row.data) ? row.data : []);
			} finally {
				setQuizBusy(false);
			}
		}, [settings.conceptUri, settings.gatewayOverride, token]);

		const submitQuiz = useCallback(async () => {
			setError(""); setQuizResult(null);
			if (!studentId) { setError("Thiếu mã học sinh — vào Cài đặt nhập sourcedId nhé."); return; }
			setQuizBusy(true);
			try {
				const answerList = Object.keys(answers).map((itemId) => ({ itemId, choiceId: answers[itemId] }));
				const submitBody = Object.assign(buildBulkAttemptBody(studentId, answerList),
					settings.gatewayOverride ? { __baseUrl: settings.gatewayOverride } : {});
				const submit = await api("/skilltree-student/quiz-submit", submitBody, token);
				if (!submit || !submit.ok) { setError(resultError(submit) || "Chấm bài thất bại"); return; }
				setQuizResult(submit.data);
				const scored = submit.data && Array.isArray(submit.data.attempts) ? submit.data.attempts : [];
				const byItem = {};
				scored.forEach((a) => { byItem[a.itemId] = a; });
				setSubmitted(byItem);
				const attempts = quizItems.map((item) => ({
					itemId: item.id,
					conceptUri: item.conceptUri,
					isCorrect: byItem[item.id] ? byItem[item.id].isCorrect : false,
				}));
				const masteryBody = buildMasteryBulkBody(attempts);
				if (masteryBody.responses.length === 0) { setNotice("Chấm xong! Câu hỏi này chưa gắn khái niệm nên chưa cập nhật độ nhớ."); return; }
				const masteryRes = await api("/skilltree-student/mastery-update", Object.assign(
					{ studentId, responses: masteryBody.responses },
					settings.gatewayOverride ? { __baseUrl: settings.gatewayOverride } : {},
				), token);
				if (masteryRes && masteryRes.ok) {
					setNotice("Đã chấm và cập nhật độ nhớ — lộ trình sẽ sáng dần lên mỗi lần em ôn!");
				} else {
					setNotice("Chấm xong! Chưa cập nhật được độ nhớ: " + resultError(masteryRes));
				}
			} finally {
				setQuizBusy(false);
			}
		}, [answers, studentId, quizItems, settings.gatewayOverride, token]);

		const pickConcept = useCallback((uri) => {
			update({ conceptUri: uri });
			setTab("quiz");
		}, []);

		const view = graph ? linearize(graph) : null;
		const masteryMap = new Map((Array.isArray(mastery) ? mastery : []).map((m) => [m.conceptUri, m]));
		const nextUri = nextRec && nextRec.conceptUri ? nextRec.conceptUri : "";
		const selectedNode = settings.conceptUri && view ? (view.byId.get(settings.conceptUri) || null) : null;

		return h("div", { style: S.panel, className: "stu-root" },
			h("div", { style: S.head },
				h("div", null,
					h("h3", { style: S.title }, "Góc học tập của em"),
					h("p", { style: S.subtitle }, "Lớp · lộ trình · tài liệu · kiểm tra nhanh — SkillTree V1"),
				),
				h("button", { style: S.close, onClick: onClose, title: "Đóng" }, "×"),
			),

			h("div", { style: S.tabs },
				[["overview", "Tổng quan"], ["docs", "Tài liệu"], ["quiz", "Kiểm tra nhanh"], ["settings", "Cài đặt"]].map(([key, label]) =>
					h("button", { key: key, style: S.tab(tab === key), onClick: () => setTab(key) }, label),
				),
			),

			h("div", { style: S.greet },
				h("p", { style: S.greetLine },
					readSession() && readSession().user ? "Chào " + (readSession().user.username || "bạn") + "!" : "Chào em!",
				),
				h("p", { style: S.greetSub },
					identity && identity.displayName
						? identity.displayName + " · mã " + String(identity.sourcedId || studentId).slice(0, 8) + "…"
						: studentId ? "Mã học sinh " + String(studentId).slice(0, 8) + "…" : "Chưa có mã học sinh — nhập ở tab Cài đặt.",
				),
			),

			tab === "overview" ? h("div", { style: S.section },
				h("h4", { style: S.sectionTitle }, "Lớp của tôi"),
				h("p", { style: S.sectionSub }, "Các lớp em đang theo học (theo mã học sinh M6)."),
				identity ? null : h("p", { style: S.muted }, studentId ? "Chưa xác minh được mã — kiểm tra lại nhé." : "Nhập mã học sinh ở tab Cài đặt."),
				h(ClassList, { classes: classes }),

				h("h4", { style: Object.assign({}, S.sectionTitle, { marginTop: "16px" }) }, "Lộ trình của tôi"),
				h("p", { style: S.sectionSub }, "Chọn môn để xem hành trình khái niệm — nút “Học ngay” là gợi ý tiếp theo dành cho em (M5)."),
				h("div", { style: S.row },
					h("select", {
						style: Object.assign({}, S.select, { minWidth: "220px" }),
						value: documentId,
						onChange: (e) => update({ documentId: e.target.value }),
					},
						h("option", { value: "" }, "— chọn môn học —"),
						(Array.isArray(subjects) ? subjects : []).map((d) =>
							h("option", { key: d.sourcedId || d.id, value: d.sourcedId || d.id }, d.title || (d.sourcedId || d.id)),
						),
					),
					h("button", { style: S.btn, onClick: loadOverview, disabled: busy || !studentId }, busy ? "Đang tải…" : "Tải lộ trình"),
				),
				view ? h(Roadmap, {
					view: view, masteryMap: masteryMap, nextUri: nextUri,
					selectedUri: settings.conceptUri, onSelect: (uri) => pickConcept(uri),
				}) : null,
				nextRec && nextRec.conceptUri ? h("p", { style: S.noteLine }, nextRec.explanation || "") : null,
				settings.conceptUri ? h("p", { style: S.noteLine },
					"Khái niệm đang chọn: " + (selectedNode ? (selectedNode.humanCodingScheme || "") + " " : "") + String(settings.conceptUri),
					h("button", { style: S.btnGhost, onClick: () => setTab("quiz") }, "Làm bài kiểm tra nhanh"),
				) : null,
			) : null,

			tab === "docs" ? h("div", { style: S.section },
				h("h4", { style: S.sectionTitle }, "Tài liệu của tôi"),
				h("p", { style: S.sectionSub }, "Nạp tài liệu ôn tập — hệ thống đọc cấu trúc, chia đoạn và trả lời kèm trích dẫn đúng mục."),
				h(UploadForm, {
					title: docTitle, busy: busy, file: docFile, limitMb: uploadLimitMb,
					onTitle: setDocTitle, onFile: setDocFile, onUpload: uploadDoc,
				}),
				uploadJob ? h("div", { style: { marginTop: "10px" } },
					h("div", { style: S.progressTrack },
						h("div", { style: Object.assign({}, S.progressFill, {
							width: (INGEST_STEPS.indexOf(uploadJob.status) + 1) / INGEST_STEPS.length * 100 + "%",
						}) }),
					),
					h("div", { style: S.progressSteps },
						progressSteps(uploadJob.status).map((s) =>
							h("span", { key: s.step, style: S.progressStep(s.state) }, s.label),
						),
					),
					uploadJob.status === "ready" ? h("p", { style: S.okMsg }, "Tài liệu đã sẵn sàng — chuyển sang khung hỏi đáp bên dưới nhé!") : null,
					uploadJob.status === "failed" ? h("p", { style: S.error }, "Xử lý gặp lỗi: " + (uploadJob.error || "không rõ")) : null,
				) : null,

				h("h4", { style: Object.assign({}, S.sectionTitle, { marginTop: "16px" }) }, "Hỏi đáp tài liệu"),
				h("div", { style: S.row },
					h("select", {
						style: Object.assign({}, S.select, { minWidth: "220px" }),
						value: settings.ragDocId || "",
						onChange: (e) => update({ ragDocId: e.target.value }),
					},
						h("option", { value: "" }, "— mọi tài liệu của em —"),
						(Array.isArray(ragDocs) ? ragDocs : []).map((d) =>
							h("option", { key: d.id, value: d.id }, d.title || d.id),
						),
					),
					h("button", { style: S.btnGhost, onClick: loadRagDocs, disabled: busy }, "Làm mới danh sách"),
				),
				h("label", { style: S.label }, "Câu hỏi của em"),
				h("textarea", {
					style: S.questionBox, value: question,
					placeholder: "Ví dụ: Định nghĩa hệ phương trình bậc nhất hai ẩn là gì?",
					onChange: (e) => setQuestion(e.target.value),
				}),
				h("div", { style: Object.assign({}, S.row, { marginTop: "8px" }) },
					h("select", { style: S.select, value: askMode, onChange: (e) => setAskMode(e.target.value) },
						h("option", { value: "answer" }, "Trả lời (có LLM)"),
						h("option", { value: "retrieve" }, "Chỉ trích dẫn"),
					),
					h("button", { style: S.btn, onClick: sendAsk, disabled: busy }, busy ? "Đang tìm…" : "Hỏi"),
				),
				askResult ? h("div", null,
					askResult.answer ? h("div", { style: S.askAnswer }, askResult.answer) : null,
					askResult.llmError ? h("p", { style: S.warnMsg }, "Chưa tổng hợp được câu trả lời tự nhiên — dưới đây là các trích dẫn khớp nhất.") : null,
					askResult.mode === "retrieve" ? h("p", { style: S.noteLine }, "Chế độ trích dẫn — không gọi LLM.") : null,
					(Array.isArray(askResult.citations) ? askResult.citations : []).map((c, i) =>
						h(Citation, { key: c.chunkId || i, citation: c }),
					),
				) : null,
			) : null,

			tab === "quiz" ? h("div", { style: S.section },
				h("h4", { style: S.sectionTitle }, "Kiểm tra nhanh"),
				h("p", { style: S.sectionSub }, "Vài câu hỏi ngắn cho khái niệm đang chọn — xong là độ nhớ của em được cập nhật (M5)."),
				h("label", { style: S.label }, "Khái niệm (URI — bấm một nút trên lộ trình để chọn nhanh)"),
				h("input", {
					style: Object.assign({}, S.input, { width: "100%" }),
					value: settings.conceptUri || "",
					placeholder: "https://…/CFItems/…",
					onChange: (e) => update({ conceptUri: e.target.value }),
				}),
				h("div", { style: Object.assign({}, S.row, { marginTop: "8px" }) },
					h("button", { style: S.btn, onClick: loadQuiz, disabled: quizBusy }, quizBusy ? "Đang lấy câu hỏi…" : "Lấy câu hỏi"),
				),
				quizResult ? h("div", null,
					h("p", { style: S.resultLine },
						"Kết quả: đúng " + quizResult.correct + "/" + quizResult.scored + " (" + pct(quizResult.ratio) + ") — " +
						(quizResult.ratio >= 0.8 ? "tuyệt vời, giữ phong độ nhé!" : quizResult.ratio >= 0.5 ? "khá lắm, coi lại mấy câu sai nhé!" : "không sao, ôn lại rồi làm lại nhé!"),
					),
				) : null,
				h(QuizForm, {
					items: quizItems, answers: answers, busy: quizBusy, submitted: submitted,
					onPick: (itemId, choiceId) => setAnswers((prev) => Object.assign({}, prev, { [itemId]: choiceId })),
					onSubmit: submitQuiz,
				}),
			) : null,

			tab === "settings" ? h("div", { style: S.section },
				h("h4", { style: S.sectionTitle }, "Cài đặt"),
				h("label", { style: S.label }, "Mã học sinh — sourcedId trên lớp học (M6)"),
				h("input", {
					style: Object.assign({}, S.input, { width: "100%" }),
					value: studentId,
					placeholder: "sourcedId cô giáo đưa cho em",
					onChange: (e) => update({ studentId: e.target.value.trim() }),
				}),
				h("p", { style: S.noteLine }, "Mã này giúp ghi nhận điểm kiểm tra và độ nhớ đúng cho em (không dùng tên thật)."),
				h("label", { style: S.label }, "Gateway override (tùy chọn)"),
				h("input", {
					style: Object.assign({}, S.input, { width: "100%" }),
					value: settings.gatewayOverride || "",
					placeholder: "http://localhost:8000",
					onChange: (e) => update({ gatewayOverride: e.target.value.trim() }),
				}),
				h("p", { style: S.noteLine },
					"Tài khoản: " + (readSession() && readSession().user ? readSession().user.username + " (" + (readSession().user.role || "?") + ")" : "chưa đăng nhập qua mục Tài khoản") +
					" — JWT nằm trong localStorage và đi kèm từng lời gọi."),
			) : null,

			error ? h("div", { style: S.error }, error) : null,
			notice ? h("div", { style: S.okMsg }, notice) : null,
			h("div", { style: S.divider }),
			h("p", { style: S.muted },
				"Dữ liệu qua api-gateway (M10): class M6 · case M1 · learner M5 · quiz M2 · rag-service. ",
				"Điểm kiểm tra và độ nhớ gắn với mã học sinh (sourcedId), không lưu dữ liệu cá nhân."),
		);
	}


	function PageIcon(props) {
		const size = props && props.size ? props.size : 20;
		const sw = props && props.strokeWidth ? props.strokeWidth : 1.25;
		const active = Boolean(props && props.active);
		return h("span", { style: { display: "inline-flex", alignItems: "center", color: active ? "var(--dsw-alias-brand-primary, #27A95F)" : "inherit" } },
			h("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 17 17", width: size, height: size, fill: "none", stroke: "currentColor", strokeWidth: sw, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", focusable: "false" }, h("path", { d: 'M4.57788 5.77124H10.7029', stroke: "currentColor" }), h("path", { d: 'M4.57788 8.89819H7.91879', stroke: "currentColor" }), h("path", { d: 'M12.1404 1.19446C12.9442 1.19446 13.6404 1.81999 13.6404 2.64465V8.89856H12.6404V2.64465C12.6404 2.42015 12.4411 2.19446 12.1404 2.19446H3.14038C2.83968 2.19446 2.64038 2.42015 2.64038 2.64465V13.0929C2.64082 13.3172 2.84001 13.5421 3.14038 13.5421H8.88159V14.5421H3.14038C2.33675 14.5421 1.6408 13.9172 1.64038 13.0929V2.64465C1.64038 1.81999 2.33651 1.19446 3.14038 1.19446H12.1404Z', fill: "currentColor", stroke: "none" }), h("path", { d: 'M12.0051 15.1056C12.0051 13.6395 10.8166 12.451 9.35059 12.451C10.8166 12.451 12.0051 11.2626 12.0051 9.79651C12.0051 11.2626 13.1936 12.451 14.6597 12.451C13.1936 12.451 12.0051 13.6395 12.0051 15.1056Z', stroke: "currentColor" })));
	}
	function SidebarIcon(props) {
		return h("span", { style: { display: "inline-flex", alignItems: "center", color: (props && props.active) ? "var(--dsw-alias-brand-primary, #27A95F)" : "inherit" } },
			h("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 17 17", width: 20, height: 20, fill: "none", stroke: "currentColor", strokeWidth: 1.25, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", focusable: "false" }, h("path", { d: 'M4.57788 5.77124H10.7029', stroke: "currentColor" }), h("path", { d: 'M4.57788 8.89819H7.91879', stroke: "currentColor" }), h("path", { d: 'M12.1404 1.19446C12.9442 1.19446 13.6404 1.81999 13.6404 2.64465V8.89856H12.6404V2.64465C12.6404 2.42015 12.4411 2.19446 12.1404 2.19446H3.14038C2.83968 2.19446 2.64038 2.42015 2.64038 2.64465V13.0929C2.64082 13.3172 2.84001 13.5421 3.14038 13.5421H8.88159V14.5421H3.14038C2.33675 14.5421 1.6408 13.9172 1.64038 13.0929V2.64465C1.64038 1.81999 2.33651 1.19446 3.14038 1.19446H12.1404Z', fill: "currentColor", stroke: "none" }), h("path", { d: 'M12.0051 15.1056C12.0051 13.6395 10.8166 12.451 9.35059 12.451C10.8166 12.451 12.0051 11.2626 12.0051 9.79651C12.0051 11.2626 13.1936 12.451 14.6597 12.451C13.1936 12.451 12.0051 13.6395 12.0051 15.1056Z', stroke: "currentColor" })));
	}
	function PageHeader() {
		return h("div", { style: { display: "flex", alignItems: "center", gap: "12px", padding: "0 0 16px", borderBottom: "1px solid rgba(127,127,127,.18)", marginBottom: "16px" } },
			h("div", { style: { display: "grid", placeItems: "center", width: "40px", height: "40px", borderRadius: "10px", background: "rgba(39,169,95,.14)", color: "var(--dsw-alias-brand-primary, #27A95F)" } },
				h("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 17 17", width: 22, height: 22, fill: "none", stroke: "currentColor", strokeWidth: 1.1, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", focusable: "false" }, h("path", { d: 'M4.57788 5.77124H10.7029', stroke: "currentColor" }), h("path", { d: 'M4.57788 8.89819H7.91879', stroke: "currentColor" }), h("path", { d: 'M12.1404 1.19446C12.9442 1.19446 13.6404 1.81999 13.6404 2.64465V8.89856H12.6404V2.64465C12.6404 2.42015 12.4411 2.19446 12.1404 2.19446H3.14038C2.83968 2.19446 2.64038 2.42015 2.64038 2.64465V13.0929C2.64082 13.3172 2.84001 13.5421 3.14038 13.5421H8.88159V14.5421H3.14038C2.33675 14.5421 1.6408 13.9172 1.64038 13.0929V2.64465C1.64038 1.81999 2.33651 1.19446 3.14038 1.19446H12.1404Z', fill: "currentColor", stroke: "none" }), h("path", { d: 'M12.0051 15.1056C12.0051 13.6395 10.8166 12.451 9.35059 12.451C10.8166 12.451 12.0051 11.2626 12.0051 9.79651C12.0051 11.2626 13.1936 12.451 14.6597 12.451C13.1936 12.451 12.0051 13.6395 12.0051 15.1056Z', stroke: "currentColor" }))),
			h("div", null,
				h("h2", { style: { margin: 0, fontSize: "20px", fontWeight: 650, letterSpacing: "-0.01em" } }, "Học sinh"),
				h("p", { style: { margin: "2px 0 0", fontSize: "13px", opacity: 0.7 } }, "Không gian học của bạn: lộ trình hôm nay, tài liệu đọc và bài kiểm tra nhanh.")));
	}
	function MainPanel() {
		return h("div", { className: "st-page", style: { width: "100%", maxWidth: "100%", padding: "20px 28px 40px", boxSizing: "border-box", fontFamily: "inherit" } },
			h(PageHeader, null), h(Panel, { onClose: function () {} }));
	}

	exports.name = NS;
	exports.inject = ["slots"];
	// Pure helpers, exported for unit tests (tests/client.mjs) — no DOM/side effects.
	exports.linearize = linearize;
	exports.nodeState = nodeState;
	exports.displayState = displayState;
	exports.buildOverviewCalls = buildOverviewCalls;
	exports.buildQuizItemsCall = buildQuizItemsCall;
	exports.buildRagJobCall = buildRagJobCall;
	exports.buildRagDocsCall = buildRagDocsCall;
	exports.buildBulkAttemptBody = buildBulkAttemptBody;
	exports.buildMasteryBulkBody = buildMasteryBulkBody;
	exports.citationPath = citationPath;
	exports.progressSteps = progressSteps;
	exports.INGEST_STEPS = INGEST_STEPS;
	exports.apply = function apply(ctx) {
		ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
			name: "sidebar.panellist",
			id: NS,
			order: 24,
			label: "Học sinh",
		}, SidebarIcon));
		ctx.slots.inject("main", () => ctx.slots.register({ name: "main", key: NS }, MainPanel));
	};
	return module.exports;
}});
