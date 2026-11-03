/**
 * skilltree-graph-dashboard — CLIENT half.
 * Main concept-graph dashboard: pick a subject (M1 document) → render the CASE
 * concept graph as a readable vertical spine → click a node for its detail
 * (statement, prerequisites), related materials (document-service M9 chunks
 * aligned to the concept) and the student's mastery (learner-model M5, Glicko
 * rating + state green/amber/red/rusty) when a student sourcedId is given.
 *
 * Colors come exclusively from the DESIGN.md token sheet (--st-* variables
 * declared on .gd-root). Pure helpers (edgeIds/linearize/masteryIndex/
 * displayState/materialsForConcept/pct) live at top level and are unit-checked
 * by smoke.js.
 */

// ---------- pure helpers (no React, no harness) ----------

function edgeIds(e) {
  // M1 build_graph: { source, target, type, sourceIdentifier, targetIdentifier }.
  // Nodes are keyed by CASE identifier, so the *Identifier pair is authoritative;
  // the fallbacks keep older/alternative edge shapes working.
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
  const prereqs = new Map();
  const unlocks = new Map();
  const isPartOf = new Map();
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

function masteryIndex(list) {
  // conceptUri -> M5 MasteryRead entry { conceptUri, rating, ratingDeviation,
  // volatility, mastery, state, reviewCount, lastPlayedAt }.
  const map = new Map();
  (Array.isArray(list) ? list : []).forEach((entry) => {
    if (entry && typeof entry.conceptUri === 'string') map.set(entry.conceptUri, entry);
  });
  return map;
}

function displayState(prereqCount, masteryEntry) {
  // With M5 data the state IS the display state (green|amber|red|rusty);
  // without it, structural fallback: roots are ready ("next"), the rest locked.
  if (masteryEntry && masteryEntry.state) return masteryEntry.state;
  return prereqCount === 0 ? 'next' : 'locked';
}

function materialsForConcept(chunks, conceptUri) {
  // M9 ChunkRead: { id, documentId, orderIndex, text, alignments: [{conceptUri, alignmentType}] }.
  return (Array.isArray(chunks) ? chunks : []).filter((chunk) =>
    Array.isArray(chunk && chunk.alignments) &&
    chunk.alignments.some((a) => a && a.conceptUri === conceptUri)
  );
}

function pct(value) {
  const num = Number(value);
  if (!isFinite(num)) return '—';
  return Math.round(num * 100) + '%';
}

// ---------- components ----------

function apply(ctx) {
  const el = React.createElement;

  ctx.effect(() => styles.insert(css()), 'skilltree-graph-dashboard: styles');

  const STATE_LABEL = {
    green: 'Đã vững', amber: 'Cần củng cố', red: 'Cần học lại', rusty: 'Cần ôn tập',
    next: 'Sẵn sàng', locked: 'Chưa mở',
  };

  function Chip(props) {
    const { state } = props;
    return el('span', { className: 'gd-chip gd-chip-' + state }, STATE_LABEL[state] || state);
  }

  function Dot(props) {
    return el('span', { className: 'gd-dot gd-dot-' + props.state, 'aria-hidden': true });
  }

  function DetailCard(props) {
    const { node, view, masteryEntry, chunks, hasStudentId } = props;
    const id = node.identifier || node.id || '';
    const prereqLabels = (view.prereqs.get(id) || [])
      .map((pid) => (view.byId.get(pid) ? view.labelOf(view.byId.get(pid)) : pid));
    const unlocksCount = (view.unlocks.get(id) || []).length;
    const materials = materialsForConcept(chunks, id);

    return el('div', { className: 'gd-detail' },
      el('div', { className: 'gd-detail-row' },
        el('span', { className: 'gd-detail-k' }, 'Phát biểu đầy đủ'),
        el('span', { className: 'gd-detail-v' }, node.fullStatement || '—')
      ),
      node.humanCodingScheme
        ? el('div', { className: 'gd-detail-row' },
            el('span', { className: 'gd-detail-k' }, 'Mã khái niệm'),
            el('span', { className: 'gd-detail-v gd-mono' }, node.humanCodingScheme))
        : null,
      el('div', { className: 'gd-detail-row' },
        el('span', { className: 'gd-detail-k' }, 'Tiên đề'),
        el('span', { className: 'gd-detail-v' },
          prereqLabels.length ? prereqLabels.join('; ') : 'Không có (khái niệm gốc)')),
      el('div', { className: 'gd-detail-row' },
        el('span', { className: 'gd-detail-k' }, 'Mở khóa'),
        el('span', { className: 'gd-detail-v' }, unlocksCount + ' khái niệm phía sau')),

      el('div', { className: 'gd-detail-sec' }, 'Độ nhớ (learner-model M5)'),
      masteryEntry
        ? el('div', { className: 'gd-detail-row' },
            el('span', { className: 'gd-detail-k' }, 'Mức nhớ'),
            el('span', { className: 'gd-detail-v' },
              pct(masteryEntry.mastery) + ' · ' + (STATE_LABEL[masteryEntry.state] || masteryEntry.state)))
        : el('div', { className: 'gd-detail-row' },
            el('span', { className: 'gd-detail-k' }, 'Mức nhớ'),
            el('span', { className: 'gd-detail-v gd-muted' },
              hasStudentId ? 'Chưa có dữ liệu M5 cho khái niệm này.' : 'Nhập sourcedId học sinh để xem độ nhớ.')),
      masteryEntry
        ? el('div', { className: 'gd-detail-row' },
            el('span', { className: 'gd-detail-k' }, 'Glicko'),
            el('span', { className: 'gd-detail-v gd-mono' },
              'rating ' + Math.round(masteryEntry.rating || 0) + ' ± RD ' + Math.round(masteryEntry.ratingDeviation || 0) +
              ' · ' + (masteryEntry.reviewCount || 0) + ' lần ôn'))
        : null,

      el('div', { className: 'gd-detail-sec' }, 'Tài liệu liên quan (document-service)'),
      materials.length
        ? el('ul', { className: 'gd-materials' },
            materials.map((chunk) =>
              el('li', { key: chunk.id, className: 'gd-material' },
                el('div', { className: 'gd-material-meta' },
                  'Đoạn #' + (chunk.orderIndex != null ? chunk.orderIndex : '?') +
                  (chunk.alignments && chunk.alignments[0] && chunk.alignments[0].alignmentType
                    ? ' · ' + chunk.alignments[0].alignmentType : '')),
                el('div', { className: 'gd-material-text' },
                  (chunk.text || '').length > 180 ? (chunk.text || '').slice(0, 180) + '…' : (chunk.text || ''))))
          )
        : el('div', { className: 'gd-detail-row' },
            el('span', { className: 'gd-detail-k' }, 'Kết quả'),
            el('span', { className: 'gd-detail-v gd-muted' }, 'Chưa có tài liệu liên kết cho khái niệm này.'))
    );
  }

  function NodeRow(props) {
    const { id, label, state, masteryEntry, unlockCount, selected, onSelect, children } = props;
    return el('li', { className: 'gd-node' + (selected ? ' gd-node-selected' : '') },
      el('button', { className: 'gd-node-hit', onClick: () => onSelect(id) },
        el(Dot, { state }),
        el('span', { className: 'gd-node-label' }, label),
        el(Chip, { state }),
        masteryEntry
          ? el('span', { className: 'gd-node-pct gd-mono' }, pct(masteryEntry.mastery))
          : null,
        unlockCount
          ? el('span', { className: 'gd-node-unlock' }, 'mở khóa ' + unlockCount)
          : null
      ),
      selected ? children : null
    );
  }

  function Panel(props) {
    const { onClose } = props;
    const [m1Base, setM1Base] = React.useState('http://localhost:8101');
    const [docBase, setDocBase] = React.useState('http://localhost:8107');
    const [m5Base, setM5Base] = React.useState('http://localhost:8105');
    const [subjects, setSubjects] = React.useState([]);
    const [docId, setDocId] = React.useState('');
    const [studentId, setStudentId] = React.useState('');
    const [graph, setGraph] = React.useState(null);
    const [mastery, setMastery] = React.useState([]);
    const [chunks, setChunks] = React.useState([]);
    const [selectedId, setSelectedId] = React.useState('');
    const [error, setError] = React.useState('');
    const [busy, setBusy] = React.useState(false);

    const load = async () => {
      setBusy(true); setError('');
      try {
        if (subjects.length === 0) {
          const subj = await host.call('skilltree.listSubjects', { baseUrl: m1Base });
          if (subj && subj.ok) setSubjects(subj.data);
          else { setError((subj && subj.error) || 'Không tải được danh sách môn học.'); return; }
        }
        const trimmed = docId.trim();
        if (!trimmed) { setError('Chọn một môn học (hoặc nhập documentId của M1).'); return; }
        const resp = await host.call('skilltree.getGraph', { baseUrl: m1Base, documentId: trimmed });
        if (!(resp && resp.ok)) {
          setError((resp && resp.error) || 'Không tải được đồ thị khái niệm.');
          setGraph(null);
          return;
        }
        setGraph(resp.data);
        setSelectedId('');
        // M9 materials + M5 mastery are soft dependencies: a failure must not
        // blank the graph — the dashboard still shows structure without them.
        // M9 joins on Document.documentUri (the M1 CFDocument identifier), so the
        // selected subject identifier travels along for the resolution.
        const subject = subjects.find((s) => s && s.id === trimmed);
        const subjectUri = subject && typeof subject.identifier === 'string' ? subject.identifier : '';
        const mats = await host.call('skilltree.getMaterials', {
          baseUrl: docBase, documentId: trimmed, documentUri: subjectUri,
        });
        setChunks(mats && mats.ok ? mats.data : []);
        if (studentId.trim()) {
          const mas = await host.call('skilltree.getMastery', { baseUrl: m5Base, studentId: studentId.trim() });
          setMastery(mas && mas.ok ? mas.data : []);
        } else {
          setMastery([]);
        }
      } catch (callError) {
        setError('RPC thất bại: ' + String(callError));
      } finally { setBusy(false); }
    };

    const view = React.useMemo(() => (graph ? linearize(graph) : null), [graph]);
    const masteryMap = React.useMemo(() => masteryIndex(mastery), [mastery]);
    const selectedNode = view && selectedId ? view.byId.get(selectedId) : null;

    return el('div', { className: 'gd-panel' },
      el('div', { className: 'gd-head' },
        el('strong', null, 'Graph Dashboard — đồ thị khái niệm'),
        el('button', { className: 'gd-close', onClick: onClose, title: 'Đóng' }, '×')
      ),
      el('div', { className: 'gd-form' },
        el('input', {
          className: 'gd-input', value: m1Base, onChange: (e) => setM1Base(e.target.value),
          placeholder: 'http://localhost:8101', title: 'M1 opencase-service base URL',
        }),
        el('select', {
          className: 'gd-input', value: docId,
          onChange: (e) => { setDocId(e.target.value); },
        },
          el('option', { value: '' }, '— Chọn môn học —'),
          subjects.map((s) => el('option', { key: s.id, value: s.id }, s.title || s.id))
        ),
        el('input', {
          className: 'gd-input', value: docId, onChange: (e) => setDocId(e.target.value),
          placeholder: 'hoặc documentId (UUID)', title: 'M1 documentId',
        }),
        el('input', {
          className: 'gd-input', value: studentId, onChange: (e) => setStudentId(e.target.value),
          placeholder: 'sourcedId học sinh (M5, không bắt buộc)', title: 'Learner-model sourcedId',
        }),
        el('details', { className: 'gd-advanced' },
          el('summary', null, 'Nâng cao — URL M9/M5'),
          el('input', {
            className: 'gd-input', value: docBase, onChange: (e) => setDocBase(e.target.value),
            placeholder: 'http://localhost:8107', title: 'M9 document-service base URL',
          }),
          el('input', {
            className: 'gd-input', value: m5Base, onChange: (e) => setM5Base(e.target.value),
            placeholder: 'http://localhost:8105', title: 'M5 learner-model-service base URL',
          })),
        el('button', { className: 'gd-load', onClick: load, disabled: busy },
          busy ? 'Đang tải…' : 'Tải dashboard')
      ),
      error ? el('div', { className: 'gd-error' },
        error,
        el('div', { className: 'gd-hint' },
          'Gợi ý: chạy `docker compose -f deploy/docker-compose.yml up -d` (M1 :8101, M9 :8107, M5 :8105) hoặc đi qua gateway :8000.')
      ) : null,
      !error && view
        ? el('div', { className: 'gd-graph-wrap' },
            el('div', { className: 'gd-legend' },
              el(Chip, { state: 'green' }), el(Chip, { state: 'amber' }),
              el(Chip, { state: 'red' }), el(Chip, { state: 'rusty' }),
              el('span', { className: 'gd-legend-note' },
                studentId.trim() ? 'trạng thái theo điểm nhớ M5' : 'chưa nhập học sinh — trạng thái theo tiên đề')),
            el('ul', { className: 'gd-nodes' },
              view.order.map((id) => {
                const node = view.byId.get(id) || {};
                const mEntry = masteryMap.get(id);
                const state = displayState((view.prereqs.get(id) || []).length, mEntry);
                return el(NodeRow, {
                  key: id, id,
                  label: view.labelOf(node),
                  state, masteryEntry: mEntry,
                  unlockCount: (view.unlocks.get(id) || []).length,
                  selected: id === selectedId,
                  onSelect: (nid) => setSelectedId(nid === selectedId ? '' : nid),
                },
                el(DetailCard, {
                  node, view, masteryEntry: mEntry,
                  chunks, hasStudentId: Boolean(studentId.trim()),
                }));
              }))
          )
        : null,
      !error && !view && !busy
        ? el('div', { className: 'gd-empty' },
            'Chọn môn học rồi bấm “Tải dashboard”. M1 (opencase :8101) phải đang chạy; M9 :8107 và M5 :8105 là dữ liệu bổ sung.')
        : null
    );
  }

  function OverlayEntry() {
    const [open, setOpen] = React.useState(false);
    return el('div', { className: 'gd-root' },
      el('button', {
        className: 'gd-fab', title: 'Graph Dashboard (M1 + M9 + M5)',
        onClick: () => setOpen(!open),
      }, '🌳 Dashboard'),
      open ? el(Panel, { onClose: () => setOpen(false) }) : null
    );
  }

  ctx.slots.inject('shell.overlay', () =>
    ctx.slots.register(
      { name: 'shell.overlay', id: 'skilltree-graph-dashboard', order: 51, label: 'Graph Dashboard' },
      OverlayEntry
    )
  );
}

function css() {
  return [
    // ---- DESIGN.md tokens (source: branch agent-v1-bootstrap / PR #6) ----
    '.gd-root{',
    '--st-primary-50:#F4FBF7;--st-primary-100:#E5F5EC;--st-primary-200:#C7E9D5;--st-primary-300:#9ED8B7;',
    '--st-primary-400:#63C18C;--st-primary-450:#41B372;--st-primary-500:#27A95F;--st-primary-600:#218E50;',
    '--st-primary-800:#145831;--st-primary-900:#0E3D22;--st-boot:#167F4D;--st-accent-light:#56C974;',
    '--st-primary-invert:#FFFFFF;--st-ink:#1C3632;--st-ink-soft:#3A544E;--st-neutral-100:#F2F2F2;',
    '--st-neutral-300:#D4D8D6;--st-neutral-500:#6B7280;--st-neutral-800:#374151;--st-surface:#FFFFFF;',
    '--st-danger:#B3261E;--st-danger-tint:#FDECEC;--st-warn:#8A4B00;--st-warn-tint:#FFF4D6;',
    '--st-success-text:#167F4D;--st-success-tint:#E6F7EC;--st-success-fill:#27A95F;',
    '--st-warn-fill:#F5C453;--st-danger-fill:#D9534F;',
    '}',
    '.gd-root{position:fixed;right:18px;bottom:18px;z-index:60;font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;color:var(--st-neutral-800);}',
    '.gd-fab{padding:8px 14px;border-radius:999px;border:1px solid var(--st-primary-800);background:var(--st-primary-800);color:var(--st-primary-invert);cursor:pointer;font-size:13px;box-shadow:0 2px 8px rgba(20,88,49,.25);}',
    '.gd-fab:hover{background:var(--st-primary-900);}',
    '.gd-panel{position:fixed;right:18px;bottom:64px;width:460px;max-height:76vh;overflow:auto;background:var(--st-surface);color:var(--st-neutral-800);border:1px solid var(--st-neutral-300);border-radius:12px;padding:14px;pointer-events:auto;}',
    '.gd-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;font-size:15px;color:var(--st-ink);}',
    '.gd-close{border:none;background:none;font-size:18px;cursor:pointer;color:var(--st-neutral-500);}',
    '.gd-form{display:flex;flex-direction:column;gap:6px;margin-bottom:10px;}',
    '.gd-input{padding:7px 9px;border:1px solid var(--st-neutral-300);border-radius:8px;font-size:13px;background:var(--st-surface);color:var(--st-neutral-800);}',
    '.gd-advanced{font-size:12px;color:var(--st-neutral-500);}',
    '.gd-advanced summary{cursor:pointer;margin-bottom:4px;}',
    '.gd-advanced .gd-input{width:100%;box-sizing:border-box;margin-bottom:4px;}',
    '.gd-load{padding:8px 12px;border:none;border-radius:8px;background:var(--st-primary-800);color:var(--st-primary-invert);cursor:pointer;font-size:13px;}',
    '.gd-load:hover{background:var(--st-primary-900);}',
    '.gd-load:disabled{opacity:.6;cursor:default;}',
    '.gd-error{background:var(--st-danger-tint);border:1px solid var(--st-danger);color:var(--st-danger);padding:8px;border-radius:8px;font-size:12px;margin-bottom:8px;}',
    '.gd-hint{color:var(--st-neutral-500);margin-top:4px;font-size:11px;}',
    '.gd-empty{color:var(--st-neutral-500);font-size:13px;}',
    '.gd-legend{display:flex;gap:6px;align-items:center;margin:0 0 10px 14px;flex-wrap:wrap;}',
    '.gd-legend-note{font-size:11px;color:var(--st-neutral-500);}',
    '.gd-nodes{list-style:none;margin:0;padding:0 0 0 18px;position:relative;}',
    '.gd-nodes::before{content:"";position:absolute;left:6px;top:10px;bottom:10px;width:2px;background:var(--st-primary-200);}',
    '.gd-node{position:relative;margin:0 0 6px 14px;}',
    '.gd-node-hit{display:flex;gap:8px;align-items:center;width:100%;box-sizing:border-box;text-align:left;padding:8px 10px;border-radius:8px;border:1px solid var(--st-neutral-300);background:var(--st-surface);cursor:pointer;font:inherit;color:var(--st-neutral-800);}',
    '.gd-node-hit:hover{background:var(--st-primary-50);}',
    '.gd-node-selected .gd-node-hit{border-color:var(--st-primary-500);background:var(--st-primary-50);}',
    '.gd-dot{position:absolute;left:-14px;top:15px;width:10px;height:10px;border-radius:999px;box-shadow:0 0 0 2px var(--st-surface);}',
    '.gd-dot-green{background:var(--st-success-fill);}',
    '.gd-dot-amber{background:var(--st-warn-fill);}',
    '.gd-dot-red{background:var(--st-danger-fill);}',
    '.gd-dot-rusty{background:var(--st-neutral-500);}',
    '.gd-dot-next{background:var(--st-primary-500);}',
    '.gd-dot-locked{background:var(--st-neutral-300);}',
    '.gd-node-label{flex:1;font-size:13px;line-height:1.35;}',
    '.gd-node-pct{font-size:12px;color:var(--st-ink-soft);}',
    '.gd-node-unlock{font-size:11px;color:var(--st-neutral-500);}',
    '.gd-chip{padding:1px 8px;border-radius:999px;font-size:11px;white-space:nowrap;}',
    '.gd-chip-green{background:var(--st-success-tint);color:var(--st-success-text);}',
    '.gd-chip-amber{background:var(--st-warn-tint);color:var(--st-warn);}',
    '.gd-chip-red{background:var(--st-danger-tint);color:var(--st-danger);}',
    '.gd-chip-rusty{background:var(--st-neutral-100);color:var(--st-neutral-800);}',
    '.gd-chip-next{background:var(--st-primary-100);color:var(--st-primary-800);}',
    '.gd-chip-locked{background:var(--st-surface);color:var(--st-neutral-500);border:1px solid var(--st-neutral-300);}',
    '.gd-detail{margin-top:8px;padding:10px;border-radius:8px;background:var(--st-primary-50);border:1px solid var(--st-primary-200);}',
    '.gd-detail-row{display:flex;gap:8px;margin-bottom:4px;font-size:12px;}',
    '.gd-detail-k{flex:0 0 118px;color:var(--st-neutral-500);}',
    '.gd-detail-v{color:var(--st-neutral-800);}',
    '.gd-detail-sec{margin:8px 0 4px;font-size:12px;font-weight:600;color:var(--st-ink);}',
    '.gd-muted{color:var(--st-neutral-500);}',
    '.gd-mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;}',
    '.gd-materials{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px;}',
    '.gd-material{padding:8px;border-radius:8px;background:var(--st-surface);border:1px solid var(--st-neutral-300);}',
    '.gd-material-meta{font-size:11px;color:var(--st-neutral-500);margin-bottom:2px;}',
    '.gd-material-text{font-size:12px;line-height:1.45;color:var(--st-neutral-800);}',
  ].join('\n');
}
