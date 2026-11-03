/**
 * roadmap-viewer — HOST half.
 * RPC: host.call('roadmap.getGraph', { url }) from the browser.
 * Fetches the M1 concept graph over the Host `web` service (no direct browser
 * access to service addresses is required).
 */
function apply(ctx) {
  ctx.effect(
    () =>
      harness.handle('roadmap.getGraph', async (args) => {
        const url = args && typeof args.url === 'string' ? args.url : '';
        if (!/^https?:\/\//i.test(url)) {
          return { ok: false, error: 'roadmap: invalid or missing url' };
        }
        const web = ctx.get('web');
        if (web === undefined || typeof web.fetch !== 'function') {
          return { ok: false, error: 'roadmap: host web service unavailable' };
        }
        try {
          const result = await web.fetch({ url });
          const raw =
            result && typeof result === 'object'
              ? result.content ?? result.text ?? result.body ?? result
              : result;
          if (typeof raw === 'string') {
            try {
              return { ok: true, data: JSON.parse(raw) };
            } catch (parseError) {
              return { ok: false, error: 'roadmap: upstream returned non-JSON' };
            }
          }
          if (raw && typeof raw === 'object') {
            return { ok: true, data: raw };
          }
          return { ok: false, error: 'roadmap: unexpected fetch result shape' };
        } catch (fetchError) {
          return { ok: false, error: 'roadmap: fetch failed: ' + String(fetchError) };
        }
      }),
    'roadmap-viewer: rpc'
  );
}
