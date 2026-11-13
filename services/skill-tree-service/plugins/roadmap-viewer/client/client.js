/**
 * roadmap-viewer — CLIENT half (no build step; platform module format,
 * identical loader contract to the other skilltree UI plugins).
 * Data access: same-origin POST routes mounted by lib/index.js
 * (replaces the earlier RPC — same { ok, data | error } envelope).
 */
window.__ModuleLoader__.load({ id: "roadmap-viewer", factory: (require) => {
	var module = { exports: {} };
	var exports = module.exports;
	const React = require("react");

/**
 * roadmap-viewer — CLIENT half.
 * Registers one additive `shell.overlay` entry: a floating "Roadmap" button and
 * a slide-over panel that renders the M1 concept graph as a learning path.
 *
 * Colors come exclusively from the DESIGN.md token sheet (--st-* variables,
 * declared on .rmv-root below). The legacy accent #4136d6 is gone.
 */
	async function postJson(path, body) {
		const res = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) });
		try { return await res.json(); } catch (e) { return { ok: false, error: 'HTTP ' + res.status }; }
	}

function apply(ctx) {
  const el = React.createElement;

  // V1 deploy note: platform styles service unavailable → inject <style> directly.
  ctx.effect(() => {
    const styleEl = document.createElement("style");
    styleEl.textContent = css();
    document.head.appendChild(styleEl);
    return () => styleEl.remove();
  }, "roadmap-viewer: styles");

  // ---------- graph helpers (pure) ----------

  function edgeIds(e) {
    // M1 build_graph emits { source, target, type, sourceIdentifier, targetIdentifier };
    // source/target are raw item ids while nodes are keyed by CASE identifier, so the
    // *Identifier pair is the authoritative mapping (fallbacks keep old shapes working).
    return {
      type: e.type || e.relationType || e.associationType || '',
      src: e.sourceIdentifier || e.source || e.originId || e.sourceId || '',
      dst: e.targetIdentifier || e.target || e.destinationId || e.targetId || '',
    };
  }

  function linearize(graph) {
    // Kahn topological order over isPrerequisiteOf edges (prereq → concept).
    const nodes = Array.isArray(graph && graph.nodes) ? graph.nodes : [];
    const edges = Array.isArray(graph && graph.edges) ? graph.edges : [];
    const idOf = (n) => n.identifier || n.id || '';
    const labelOf = (n) => n.humanCodingScheme ? n.humanCodingScheme + ' · ' + (n.fullStatement || '') : (n.fullStatement || n.title || idOf(n));
    const prereqs = new Map(); // concept -> [prereq ids]
    const unlocks = new Map(); // prereq -> [concept ids]
    const isPartOf = new Map(); // concept -> parent
    nodes.forEach((n) => { prereqs.set(idOf(n), []); unlocks.set(idOf(n), []); });
    edges.forEach((e) => {
      const { type, src, dst } = edgeIds(e);
      if (!prereqs.has(src) || !prereqs.has(dst)) return;
      if (type.includes('isPrerequisiteOf')) { prereqs.get(dst).push(src); unlocks.get(src).push(dst); }
      if (type.includes('isPartOf')) isPartOf.set(dst, src);
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
    return { order, byId, labelOf, prereqs, unlocks, isPartOf };
  }

  function loadDone(docId) {
    try { return new Set(JSON.parse(localStorage.getItem('roadmap.done.' + docId) || '[]')); }
    catch (e) { return new Set(); }
  }

  function saveDone(docId, done) {
    try { localStorage.setItem('roadmap.done.' + docId, JSON.stringify(Array.from(done))); } catch (e) {}
  }

  // ---------- components ----------

  function NodeRow(props) {
    const { id, label, state, unlockCount, onToggle } = props;
    return el(
      'div',
      { className: 'rmv-node rmv-' + state },
      el('label', { className: 'rmv-check' },
        el('input', {
          type: 'checkbox', checked: state === 'done', onChange: onToggle,
        }),
        el('span', { className: 'rmv-mark' })
      ),
      el('div', { className: 'rmv-body' },
        el('div', { className: 'rmv-label' }, label),
        el('div', { className: 'rmv-meta' },
          state === 'next' ? 'Sẵn sàng học — ' + unlockCount + ' khái niệm sẽ mở khóa'
            : state === 'done' ? 'Đã đạt (progress marker)'
            : state === 'locked' ? 'Còn ' + unlockCount + ' tiên đề chưa xong'
            : ''
        )
      )
    );
  }

  function Panel(props) {
    const { onClose } = props;
    const [baseUrl, setBaseUrl] = React.useState('http://localhost:8101');
    const [docId, setDocId] = React.useState('');
    const [graph, setGraph] = React.useState(null);
    const [error, setError] = React.useState('');
    const [busy, setBusy] = React.useState(false);
    const [done, setDone] = React.useState(new Set());

    const load = async () => {
      setBusy(true); setError('');
      try {
        const trimmed = docId.trim();
        if (!trimmed) { setError('Nhập documentId của M1.'); return; }
        const resp = await postJson('/roadmap-viewer/get-graph', {
          url: baseUrl.replace(/\/+$/, '') + '/api/v1/documents/' + encodeURIComponent(trimmed) + '/graph',
        });
        if (resp && resp.ok) { setGraph(resp.data); setDone(loadDone(trimmed)); }
        else { setError((resp && resp.error) || 'Không tải được graph.'); setGraph(null); }
      } catch (callError) {
        setError('Gọi API thất bại: ' + String(callError));
      } finally { setBusy(false); }
    };

    const view = React.useMemo(() => (graph ? linearize(graph) : null), [graph]);
    const nodeState = (id) => {
      if (done.has(id)) return 'done';
      const reqs = view ? view.prereqs.get(id) || [] : [];
      return reqs.every((r) => done.has(r)) ? 'next' : 'locked';
    };
    const toggle = (id) => {
      const nxt = new Set(done);
      if (nxt.has(id)) nxt.delete(id); else nxt.add(id);
      setDone(nxt); saveDone(docId.trim(), nxt);
    };

    return el('div', { className: 'rmv-panel' },
      el('div', { className: 'rmv-head' },
        el('strong', null, 'Roadmap Viewer — M1 concept graph'),
        el('button', { className: 'rmv-close', onClick: onClose }, '×')
      ),
      el('div', { className: 'rmv-form' },
        el('input', {
          value: baseUrl, onChange: (e) => setBaseUrl(e.target.value),
          placeholder: 'http://localhost:8101', title: 'M1 base URL',
        }),
        el('input', {
          value: docId, onChange: (e) => setDocId(e.target.value),
          placeholder: 'documentId (UUID)',
        }),
        el('button', { className: 'rmv-load', onClick: load, disabled: busy }, busy ? 'Đang tải…' : 'Load graph')
      ),
      error ? el('div', { className: 'rmv-error' },
        error,
        el('div', { className: 'rmv-hint' },
          'Gợi ý: chạy `docker compose -f deploy/docker-compose.yml up -d` rồi dùng gateway http://localhost:8000 thay cho 8101 nếu going through gateway.')
      ) : null,
      !error && view
        ? el('div', { className: 'rmv-nodes' },
            view.order.map((id) =>
              el(NodeRow, {
                key: id, id,
                label: view.labelOf(view.byId.get(id) || {}),
                state: nodeState(id),
                unlockCount: (view.unlocks.get(id) || []).length,
                onToggle: () => toggle(id),
              })
            )
          )
        : null,
      !error && !view && !busy
        ? el('div', { className: 'rmv-empty' }, 'Nhập documentId rồi bấm Load graph. Backend M1 phải đang chạy (opencase-service, cổng 8101 hoặc qua gateway 8000).')
        : null
    );
  }



  // workloop ui-primitives icon artwork (16x16 fluent outline, currentColor)
  function PageIcon(props) {
    const size = props && props.size ? props.size : 20;
    const sw = props && props.strokeWidth ? props.strokeWidth : 1.25;
    const active = Boolean(props && props.active);
    return el('span', { style: { display: 'inline-flex', alignItems: 'center', color: active ? 'var(--dsw-alias-brand-primary, #27A95F)' : 'inherit' } },
      el('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 16 16', width: size, height: size, fill: 'none', stroke: 'currentColor', strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true', focusable: 'false' }, el('path', { d: 'M14.5001 8C14.5 9.28552 14.1188 10.5422 13.4045 11.611C12.6903 12.6799 11.6752 13.5129 10.4875 14.0049C9.29982 14.4968 7.99295 14.6255 6.73212 14.3747C5.4713 14.124 4.31314 13.505 3.4041 12.596C2.49514 11.687 1.87614 10.5288 1.62537 9.26798C1.37459 8.00716 1.50331 6.70028 1.99525 5.51261C2.48719 4.32494 3.32025 3.30981 4.3891 2.59557C5.45795 1.88134 6.71458 1.50008 8.0001 1.5', stroke: 'currentColor' }), el('path', { d: 'M11.5 8C11.5001 8.69227 11.2948 9.36901 10.9102 9.94463C10.5257 10.5202 9.97901 10.9689 9.33944 11.2338C8.69986 11.4987 7.99609 11.5681 7.31712 11.433C6.63816 11.2979 6.01449 10.9645 5.52501 10.475C5.03548 9.98552 4.70209 9.36185 4.56702 8.68289C4.43195 8.00392 4.50127 7.30015 4.76619 6.66057C5.03112 6.021 5.47976 5.47436 6.05538 5.08978C6.631 4.70519 7.30774 4.49995 8.00001 4.5', stroke: 'currentColor' }), el('path', { d: 'M8.00024 7.99976L11.2 4.80005', stroke: 'currentColor' }), el('path', { d: 'M12.4719 5.62245C12.4246 5.66972 12.3569 5.69025 12.2913 5.67715L10.7814 5.37555C10.7022 5.35972 10.6402 5.29781 10.6244 5.2186L10.3228 3.70866C10.3097 3.6431 10.3302 3.57533 10.3775 3.52806L12.1826 1.723C12.2863 1.61929 12.4627 1.65879 12.5122 1.79684L12.9271 2.95225C12.9472 3.00847 12.9915 3.05272 13.0477 3.07291L14.2031 3.48774C14.3412 3.5373 14.3807 3.71368 14.277 3.81739L12.4719 5.62245Z', stroke: 'currentColor' })));
  }

  function SidebarIcon(props) {
    return el('span', { style: { display: 'inline-flex', alignItems: 'center', color: (props && props.active) ? 'var(--dsw-alias-brand-primary, #27A95F)' : 'inherit' } },
      el('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 16 16', width: 20, height: 20, fill: 'none', stroke: 'currentColor', strokeWidth: 1.25, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true', focusable: 'false' }, el('path', { d: 'M14.5001 8C14.5 9.28552 14.1188 10.5422 13.4045 11.611C12.6903 12.6799 11.6752 13.5129 10.4875 14.0049C9.29982 14.4968 7.99295 14.6255 6.73212 14.3747C5.4713 14.124 4.31314 13.505 3.4041 12.596C2.49514 11.687 1.87614 10.5288 1.62537 9.26798C1.37459 8.00716 1.50331 6.70028 1.99525 5.51261C2.48719 4.32494 3.32025 3.30981 4.3891 2.59557C5.45795 1.88134 6.71458 1.50008 8.0001 1.5', stroke: 'currentColor' }), el('path', { d: 'M11.5 8C11.5001 8.69227 11.2948 9.36901 10.9102 9.94463C10.5257 10.5202 9.97901 10.9689 9.33944 11.2338C8.69986 11.4987 7.99609 11.5681 7.31712 11.433C6.63816 11.2979 6.01449 10.9645 5.52501 10.475C5.03548 9.98552 4.70209 9.36185 4.56702 8.68289C4.43195 8.00392 4.50127 7.30015 4.76619 6.66057C5.03112 6.021 5.47976 5.47436 6.05538 5.08978C6.631 4.70519 7.30774 4.49995 8.00001 4.5', stroke: 'currentColor' }), el('path', { d: 'M8.00024 7.99976L11.2 4.80005', stroke: 'currentColor' }), el('path', { d: 'M12.4719 5.62245C12.4246 5.66972 12.3569 5.69025 12.2913 5.67715L10.7814 5.37555C10.7022 5.35972 10.6402 5.29781 10.6244 5.2186L10.3228 3.70866C10.3097 3.6431 10.3302 3.57533 10.3775 3.52806L12.1826 1.723C12.2863 1.61929 12.4627 1.65879 12.5122 1.79684L12.9271 2.95225C12.9472 3.00847 12.9915 3.05272 13.0477 3.07291L14.2031 3.48774C14.3412 3.5373 14.3807 3.71368 14.277 3.81739L12.4719 5.62245Z', stroke: 'currentColor' })));
  }

  function PageHeader() {
    return el('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', padding: '0 0 16px', borderBottom: '1px solid rgba(127,127,127,.18)', marginBottom: '16px' } },
      el('div', { style: { display: 'grid', placeItems: 'center', width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(39,169,95,.14)', color: 'var(--dsw-alias-brand-primary, #27A95F)' } },
        el('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 16 16', width: 22, height: 22, fill: 'none', stroke: 'currentColor', strokeWidth: 1.1, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true', focusable: 'false' }, el('path', { d: 'M14.5001 8C14.5 9.28552 14.1188 10.5422 13.4045 11.611C12.6903 12.6799 11.6752 13.5129 10.4875 14.0049C9.29982 14.4968 7.99295 14.6255 6.73212 14.3747C5.4713 14.124 4.31314 13.505 3.4041 12.596C2.49514 11.687 1.87614 10.5288 1.62537 9.26798C1.37459 8.00716 1.50331 6.70028 1.99525 5.51261C2.48719 4.32494 3.32025 3.30981 4.3891 2.59557C5.45795 1.88134 6.71458 1.50008 8.0001 1.5', stroke: 'currentColor' }), el('path', { d: 'M11.5 8C11.5001 8.69227 11.2948 9.36901 10.9102 9.94463C10.5257 10.5202 9.97901 10.9689 9.33944 11.2338C8.69986 11.4987 7.99609 11.5681 7.31712 11.433C6.63816 11.2979 6.01449 10.9645 5.52501 10.475C5.03548 9.98552 4.70209 9.36185 4.56702 8.68289C4.43195 8.00392 4.50127 7.30015 4.76619 6.66057C5.03112 6.021 5.47976 5.47436 6.05538 5.08978C6.631 4.70519 7.30774 4.49995 8.00001 4.5', stroke: 'currentColor' }), el('path', { d: 'M8.00024 7.99976L11.2 4.80005', stroke: 'currentColor' }), el('path', { d: 'M12.4719 5.62245C12.4246 5.66972 12.3569 5.69025 12.2913 5.67715L10.7814 5.37555C10.7022 5.35972 10.6402 5.29781 10.6244 5.2186L10.3228 3.70866C10.3097 3.6431 10.3302 3.57533 10.3775 3.52806L12.1826 1.723C12.2863 1.61929 12.4627 1.65879 12.5122 1.79684L12.9271 2.95225C12.9472 3.00847 12.9915 3.05272 13.0477 3.07291L14.2031 3.48774C14.3412 3.5373 14.3807 3.71368 14.277 3.81739L12.4719 5.62245Z', stroke: 'currentColor' }))),
      el('div', null,
        el('h2', { style: { margin: 0, fontSize: '20px', fontWeight: 650, letterSpacing: '-0.01em' } }, 'Roadmap'),
        el('p', { style: { margin: '2px 0 0', fontSize: '13px', opacity: 0.7 } }, 'Lộ trình từng bước tới đích — thấy rõ mình đang ở đâu và học tiếp gì.')));
  }

  function MainPanel() {
    return el('div', { className: 'rmv-root' + ' st-page' }, el(PageHeader, null), el(Panel, { onClose: function () {} }));
  }

  // Consolidated into Môn học tab (skilltree-course-ui)
  /*
  ctx.slots.inject('sidebar.panellist', () =>
    ctx.slots.register(
      { name: 'sidebar.panellist', id: 'roadmap-viewer', order: 21, label: 'Roadmap' },
      SidebarIcon
    )
  );
  */
  ctx.slots.inject('main', () =>
    ctx.slots.register({ name: 'main', key: 'roadmap-viewer' }, MainPanel)
  );
}

function css() {
  return [
    // ---- DESIGN.md tokens (source: branch agent-v1-bootstrap / PR #6) ----
    // Declared on the plugin root so this plugin never reaches outside the system.
    '.rmv-root{',
    '--st-primary-50:#F4FBF7;--st-primary-100:#E5F5EC;--st-primary-200:#C7E9D5;--st-primary-300:#9ED8B7;',
    '--st-primary-400:#63C18C;--st-primary-450:#41B372;--st-primary-500:#27A95F;--st-primary-600:#218E50;',
    '--st-primary-800:#145831;--st-primary-900:#0E3D22;--st-boot:#167F4D;--st-accent-light:#56C974;',
    '--st-primary-invert:#FFFFFF;--st-ink:#1C3632;--st-ink-soft:#3A544E;--st-neutral-100:#F2F2F2;',
    '--st-neutral-300:#D4D8D6;--st-neutral-500:#6B7280;--st-neutral-800:#374151;--st-surface:#FFFFFF;',
    '--st-danger:#B3261E;--st-danger-tint:#FDECEC;--st-warn:#8A4B00;--st-warn-tint:#FFF4D6;',
    '--st-success-text:#167F4D;--st-success-tint:#E6F7EC;--st-success-fill:#27A95F;',
    '--st-warn-fill:#F5C453;--st-danger-fill:#D9534F;',
    '}',
    '.rmv-root{position:relative;width:100%;max-width:100%;padding:20px 28px 40px;box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;color:var(--st-neutral-800);}',
    '.rmv-fab{padding:8px 14px;border-radius:999px;border:1px solid var(--st-primary-800);background:var(--st-primary-800);color:var(--st-primary-invert);cursor:pointer;font-size:13px;box-shadow:0 2px 8px rgba(20,88,49,.25);}',
    '.rmv-fab:hover{background:var(--st-primary-900);}',
    '.rmv-panel{position:relative;width:100%;max-width:100%;max-height:none;overflow:visible;background:transparent;color:var(--st-neutral-800);border:none;border-radius:0;padding:0;}',
    '.rmv-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;font-size:14px;color:var(--st-ink);}',
    '.rmv-close{border:none;background:none;font-size:18px;cursor:pointer;color:var(--st-neutral-500);}',
    '.rmv-form{display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;}',
    '.rmv-form input{flex:1;min-width:120px;padding:6px 8px;border:1px solid var(--st-neutral-300);border-radius:8px;font-size:12px;background:var(--st-surface);color:var(--st-neutral-800);}',
    '.rmv-load{padding:6px 10px;border:none;border-radius:8px;background:var(--st-primary-800);color:var(--st-primary-invert);cursor:pointer;font-size:12px;}',
    '.rmv-load:hover{background:var(--st-primary-900);}',
    '.rmv-error{background:var(--st-danger-tint);border:1px solid var(--st-danger);color:var(--st-danger);padding:8px;border-radius:8px;font-size:12px;margin-bottom:8px;}',
    '.rmv-hint{color:var(--st-neutral-500);margin-top:4px;font-size:11px;}',
    '.rmv-empty{color:var(--st-neutral-500);font-size:12px;}',
    '.rmv-nodes{display:flex;flex-direction:column;gap:6px;}',
    '.rmv-node{display:flex;gap:8px;align-items:flex-start;padding:8px;border-radius:8px;border:1px solid var(--st-neutral-300);background:var(--st-neutral-100);}',
    '.rmv-node.rmv-next{border-color:var(--st-primary-500);background:var(--st-primary-50);}',
    '.rmv-node.rmv-done{opacity:.75;background:var(--st-success-tint);border-color:var(--st-primary-200);}',
    '.rmv-node.rmv-locked{opacity:.55;}',
    '.rmv-check input{margin-top:3px;accent-color:var(--st-primary-500);}',
    '.rmv-label{font-size:13px;line-height:1.35;color:var(--st-neutral-800);}',
    '.rmv-meta{font-size:11px;color:var(--st-neutral-500);margin-top:2px;}',
    // Mastery (M5) tokens kept ready here: done→green already uses --st-success-*;
    // when M5 wiring lands, map amber→--st-warn(-fill), red→--st-danger(-fill),
    // rusty→neutral dim (see skilltree-graph-dashboard for the live mapping).
  ].join('\n');
}

	exports.inject = ["slots"];
	exports.apply = apply;
	return module.exports;
}});
