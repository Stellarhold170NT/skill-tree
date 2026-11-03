/**
 * skilltree-graph-dashboard — HOST half.
 * Package-private RPCs called from the browser via host.call(...). Every outbound
 * request goes through the Host `web` service (ctx.get('web')), so the page never
 * needs direct network access to the backend services.
 *
 * RPC contracts — each returns { ok: true, data } | { ok: false, error }:
 * - skilltree.listSubjects { baseUrl }                    GET M1 /api/v1/documents?limit=200
 * - skilltree.getGraph     { baseUrl, documentId }        GET M1 /api/v1/documents/{id}/graph
 * - skilltree.getMaterials { baseUrl, documentId,
 *                            documentUri? }               GET M9 /api/v1/documents/{m9Id}/chunks
 * - skilltree.getMastery   { baseUrl, studentId, asOf? }  GET M5 /api/v1/students/{id}/mastery[?asOf=]
 *
 * M1↔M9 join: document-service links a document row to the M1 CFDocument via
 * `Document.documentUri` (the M1 CFDocument.identifier) — the two services do
 * NOT share primary keys. When documentUri is given, getMaterials first resolves
 * the M9 row (GET /api/v1/documents?limit=200, match documentUri) and then lists
 * its chunks; without it the call falls back to the raw documentId (works when
 * the caller already holds an M9 id).
 *
 * Only the base URL comes from the browser; paths/ids are composed and encoded
 * here, and the base must be an http(s) URL.
 */
function apply(ctx) {
  async function fetchJson(web, url) {
    const result = await web.fetch({ url });
    const raw =
      result && typeof result === 'object'
        ? result.content ?? result.text ?? result.body ?? result
        : result;
    if (typeof raw === 'string') {
      try { return JSON.parse(raw); }
      catch (parseError) { throw new Error('upstream returned non-JSON'); }
    }
    if (raw && typeof raw === 'object') return raw;
    throw new Error('unexpected fetch result shape');
  }

  function guardUrl(url, label) {
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
      throw new Error(label + ': invalid or missing base url');
    }
    return url.replace(/\/+$/, '');
  }

  function guardId(value, label) {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (!trimmed) throw new Error(label + ' is required');
    return encodeURIComponent(trimmed);
  }

  ctx.effect(
    () =>
      harness.handle('skilltree.listSubjects', async (args) => {
        try {
          const base = guardUrl(args && args.baseUrl, 'skilltree.listSubjects');
          const web = ctx.get('web');
          if (web === undefined || typeof web.fetch !== 'function') {
            return { ok: false, error: 'skilltree: host web service unavailable' };
          }
          const data = await fetchJson(web, base + '/api/v1/documents?limit=200');
          const rows = Array.isArray(data) ? data : [];
          return {
            ok: true,
            data: rows.map((d) => ({ id: d.id, identifier: d.identifier, title: d.title })),
          };
        } catch (err) {
          return { ok: false, error: 'skilltree: ' + String(err && err.message ? err.message : err) };
        }
      }),
    'skilltree-graph-dashboard: rpc listSubjects'
  );

  ctx.effect(
    () =>
      harness.handle('skilltree.getGraph', async (args) => {
        try {
          const base = guardUrl(args && args.baseUrl, 'skilltree.getGraph');
          const docId = guardId(args && args.documentId, 'documentId');
          const web = ctx.get('web');
          if (web === undefined || typeof web.fetch !== 'function') {
            return { ok: false, error: 'skilltree: host web service unavailable' };
          }
          const data = await fetchJson(web, base + '/api/v1/documents/' + docId + '/graph');
          return { ok: true, data };
        } catch (err) {
          return { ok: false, error: 'skilltree: ' + String(err && err.message ? err.message : err) };
        }
      }),
    'skilltree-graph-dashboard: rpc getGraph'
  );

  ctx.effect(
    () =>
      harness.handle('skilltree.getMaterials', async (args) => {
        try {
          const base = guardUrl(args && args.baseUrl, 'skilltree.getMaterials');
          const docId = guardId(args && args.documentId, 'documentId');
          const web = ctx.get('web');
          if (web === undefined || typeof web.fetch !== 'function') {
            return { ok: false, error: 'skilltree: host web service unavailable' };
          }
          // Resolve the M9 row by documentUri (the M1 CFDocument identifier) —
          // M9 primary ids are locally generated and differ from M1 ids.
          const uri = args && typeof args.documentUri === 'string' ? args.documentUri.trim() : '';
          let docRef = docId;
          if (uri) {
            const rows = await fetchJson(web, base + '/api/v1/documents?limit=200');
            const list = Array.isArray(rows) ? rows : [];
            const match = list.find((d) => d && d.documentUri === uri);
            if (match && match.id) docRef = encodeURIComponent(match.id);
          }
          const data = await fetchJson(web, base + '/api/v1/documents/' + docRef + '/chunks');
          return { ok: true, data: Array.isArray(data) ? data : [] };
        } catch (err) {
          return { ok: false, error: 'skilltree: ' + String(err && err.message ? err.message : err) };
        }
      }),
    'skilltree-graph-dashboard: rpc getMaterials'
  );

  ctx.effect(
    () =>
      harness.handle('skilltree.getMastery', async (args) => {
        try {
          const base = guardUrl(args && args.baseUrl, 'skilltree.getMastery');
          const studentId = guardId(args && args.studentId, 'studentId');
          const asOf = args && typeof args.asOf === 'string' && args.asOf.trim() ? encodeURIComponent(args.asOf.trim()) : '';
          const web = ctx.get('web');
          if (web === undefined || typeof web.fetch !== 'function') {
            return { ok: false, error: 'skilltree: host web service unavailable' };
          }
          const url = base + '/api/v1/students/' + studentId + '/mastery' + (asOf ? '?asOf=' + asOf : '');
          const data = await fetchJson(web, url);
          return { ok: true, data: Array.isArray(data) ? data : [] };
        } catch (err) {
          return { ok: false, error: 'skilltree: ' + String(err && err.message ? err.message : err) };
        }
      }),
    'skilltree-graph-dashboard: rpc getMastery'
  );
}
