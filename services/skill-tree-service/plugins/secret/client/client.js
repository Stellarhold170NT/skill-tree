/**
 * secret — client half (no build step; platform module format).
 * Registers the Settings "Secrets" section: list names, add (write-only
 * value), delete. Values are never displayed after saving.
 */
window.__ModuleLoader__.load({ id: "secret", factory: (require) => {
	var module = { exports: {} };
	var exports = module.exports;
	const react = require("react");
	const { createElement: h, useState, useEffect, useCallback } = react;

	const NS = "secret";

	/* ---- styling over DSH design tokens (theme-aware, no CSS files) ---- */
	const S = {
		page: { maxWidth: "560px", display: "flex", flexDirection: "column", gap: "20px" },
		title: { margin: "0", fontSize: "18px", fontWeight: "600", color: "var(--dsw-alias-label-primary)" },
		desc: { margin: "0", fontSize: "13px", lineHeight: "20px", color: "var(--dsw-alias-label-secondary)" },
		card: { border: "0.5px solid var(--dsw-alias-border-l2)", borderRadius: "8px", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" },
		label: { display: "block", fontSize: "12px", fontWeight: "500", color: "var(--dsw-alias-label-secondary)", marginBottom: "4px" },
		input: { width: "100%", boxSizing: "border-box", padding: "8px 10px", fontSize: "13px", borderRadius: "6px", border: "0.5px solid var(--dsw-alias-border-l3)", background: "var(--dsw-alias-bg-base)", color: "var(--dsw-alias-label-primary)", outline: "none" },
		btnPrimary: { padding: "8px 14px", fontSize: "13px", fontWeight: "500", borderRadius: "6px", border: "none", cursor: "pointer", background: "var(--dsw-alias-brand-primary)", color: "var(--dsw-alias-brand-primary-invert, var(--dsw-alias-label-primary-inverted))" },
		btnGhost: { padding: "4px 10px", fontSize: "12px", borderRadius: "6px", border: "0.5px solid var(--dsw-alias-border-l2)", background: "transparent", color: "var(--dsw-alias-label-secondary)", cursor: "pointer" },
		row: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "8px 12px", borderRadius: "6px", border: "0.5px solid var(--dsw-alias-border-l1)" },
		name: { fontSize: "13px", fontFamily: "var(--ds-font-family-code, monospace)", color: "var(--dsw-alias-label-primary)", wordBreak: "break-all" },
		muted: { fontSize: "13px", color: "var(--dsw-alias-label-tertiary)" },
		msg: (ok) => ({ margin: "0", fontSize: "13px", color: ok ? "var(--dsw-alias-state-success-primary)" : "var(--dsw-alias-state-error-primary)" }),
	};

	function SecretsSection() {
		const [names, setNames] = useState(null);
		const [name, setName] = useState("");
		const [value, setValue] = useState("");
		const [msg, setMsg] = useState(null);
		const [busy, setBusy] = useState(false);

		const load = useCallback(async () => {
			try {
				const r = await fetch("/secret/list", { cache: "no-store" });
				if (!r.ok) throw new Error("HTTP " + r.status);
				const d = await r.json();
				setNames(d.names || []);
			} catch (e) {
				setNames([]);
				setMsg({ ok: false, text: "Không tải được danh sách: " + e.message });
			}
		}, []);

		useEffect(() => { load(); }, [load]);

		async function save(ev) {
			ev.preventDefault();
			if (busy) return;
			setBusy(true); setMsg(null);
			try {
				const r = await fetch("/secret/set", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ name, value }),
				});
				const d = await r.json().catch(() => ({}));
				if (!r.ok) throw new Error(d.error || ("HTTP " + r.status));
				setMsg({ ok: true, text: 'Đã lưu "' + name + '" — giá trị không thể xem lại.' });
				setName(""); setValue("");
				await load();
			} catch (e) {
				setMsg({ ok: false, text: "Lưu thất bại: " + e.message });
			} finally {
				setBusy(false);
			}
		}

		async function remove(n) {
			if (busy) return;
			if (!window.confirm('Xóa secret "' + n + '"?')) return;
			setBusy(true); setMsg(null);
			try {
				const r = await fetch("/secret/delete", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ name: n }),
				});
				const d = await r.json().catch(() => ({}));
				if (!r.ok) throw new Error(d.error || ("HTTP " + r.status));
				setMsg({ ok: true, text: 'Đã xóa "' + n + '".' });
				await load();
			} catch (e) {
				setMsg({ ok: false, text: "Xóa thất bại: " + e.message });
			} finally {
				setBusy(false);
			}
		}

		return h("div", { style: S.page },
			h("div", null,
				h("h2", { style: S.title }, "Secrets"),
				h("p", { style: S.desc },
					"Quản lý khoá/bí mật cho webhook và dịch vụ. Giá trị ghi vào vault cục bộ (",
					h("code", null, ".credentials.yaml"),
					"), tự động hot-reload. Sau khi lưu, giá trị KHÔNG thể xem lại — chỉ đổi mới hoặc xóa."),
			),
			h("form", { style: S.card, onSubmit: save },
				h("div", null,
					h("label", { style: S.label, htmlFor: NS + "-name" }, "Tên (VD: DSH_GITHUB_WEBHOOK_SECRET)"),
					h("input", { id: NS + "-name", style: S.input, value: name,
						onChange: (e) => setName(e.target.value),
						autoComplete: "off", spellCheck: false, placeholder: "TÊN_BIẾN" }),
				),
				h("div", null,
					h("label", { style: S.label, htmlFor: NS + "-value" }, "Giá trị (chỉ ghi — không xem lại được)"),
					h("input", { id: NS + "-value", style: S.input, value: value, type: "password",
						onChange: (e) => setValue(e.target.value),
						autoComplete: "new-password", placeholder: "••••••••" }),
				),
				h("div", { style: { display: "flex", alignItems: "center", gap: "12px" } },
					h("button", { type: "submit", style: S.btnPrimary, disabled: busy || !name || !value },
						busy ? "Đang lưu…" : "Lưu secret"),
					msg ? h("span", { style: S.msg(msg.ok) }, msg.text) : null,
				),
			),
			h("div", { style: { display: "flex", flexDirection: "column", gap: "8px" } },
				names === null
					? h("p", { style: S.muted }, "Đang tải…")
					: names.length === 0
						? h("p", { style: S.muted }, "Chưa có secret nào trong vault.")
						: names.map((n) =>
							h("div", { key: n, style: S.row },
								h("span", { style: S.name }, n),
								h("button", { type: "button", style: S.btnGhost, disabled: busy, onClick: () => remove(n) }, "Xóa"),
							)),
			),
		);
	}

	exports.name = NS;
	exports.inject = ["slots"];
	exports.apply = function apply(ctx) {
		ctx.slots.inject("settings.section", () => ctx.slots.register({
			name: "settings.section",
			id: NS,
			order: 70,
			label: () => "Secrets",
			inject: () => ({}),
		}, () => h(SecretsSection)));
	};
	return module.exports;
}});
