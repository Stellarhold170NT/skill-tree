/**
 * roadmap-viewer — CLIENT half.
 * Registers one additive `shell.overlay` entry: a floating "Roadmap" button and
 * a slide-over panel that renders the M1 concept graph as a learning path.
 *
 * Colors come exclusively from the DESIGN.md token sheet (--st-* variables,
 * declared on .rmv-root below). The legacy accent #4136d6 is gone.
 */
function apply(ctx) {
  const el = React.createElement;

  ctx.effect(() => styles.insert(css()), 'roadmap-viewer: styles');

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
        const resp = await host.call('roadmap.getGraph', {
          url: baseUrl.replace(/\/+$/, '') + '/api/v1/documents/' + encodeURIComponent(trimmed) + '/graph',
        });
        if (resp && resp.ok) { setGraph(resp.data); setDone(loadDone(trimmed)); }
        else { setError((resp && resp.error) || 'Không tải được graph.'); setGraph(null); }
      } catch (callError) {
        setError('RPC thất bại: ' + String(callError));
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

  function OverlayEntry() {
    const [open, setOpen] = React.useState(false);
    return el('div', { className: 'rmv-root' },
      el('button', {
        className: 'rmv-fab', title: 'Roadmap Viewer (M12)',
        onClick: () => setOpen(!open),
      }, '🗺 Roadmap'),
      open ? el(Panel, { onClose: () => setOpen(false) }) : null
    );
  }

  ctx.slots.inject('shell.overlay', () =>
    ctx.slots.register(
      { name: 'shell.overlay', id: 'roadmap-viewer', order: 50, label: 'Roadmap Viewer' },
      OverlayEntry
    )
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
    '.rmv-root{position:fixed;right:18px;bottom:18px;z-index:60;font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;color:var(--st-neutral-800);}',
    '.rmv-fab{padding:8px 14px;border-radius:999px;border:1px solid var(--st-primary-800);background:var(--st-primary-800);color:var(--st-primary-invert);cursor:pointer;font-size:13px;box-shadow:0 2px 8px rgba(20,88,49,.25);}',
    '.rmv-fab:hover{background:var(--st-primary-900);}',
    '.rmv-panel{position:fixed;right:18px;bottom:64px;width:400px;max-height:70vh;overflow:auto;background:var(--st-surface);color:var(--st-neutral-800);border:1px solid var(--st-neutral-300);border-radius:12px;padding:14px;pointer-events:auto;}',
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
