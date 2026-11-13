import { useState } from 'react';

export function OpmlImport({ api, onDone }) {
  const [xml, setXml] = useState('');
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState(null);
  const [selected, setSelected] = useState([]);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const run = async (fn) => {
    setBusy(true); setMessage('');
    try { await fn(); } catch (error) { setMessage(error?.message ?? String(error)); }
    finally { setBusy(false); }
  };
  const inspect = (params) => run(async () => {
    const result = await api.opmlPreview(params);
    setPreview(result);
    setSelected(result.entries.filter((entry) => !entry.duplicate).map((entry) => entry.url));
  });
  const reset = () => { setPreview(null); setSelected([]); };
  const visible = preview?.entries.filter((entry) => `${entry.name} ${entry.group ?? ''} ${entry.url}`.toLowerCase().includes(query.toLowerCase())) ?? [];
  return <fieldset className="qrs-opml-import" disabled={busy}>
    <legend>Nhập OPML</legend>
    <input type="file" aria-label="Chọn tệp OPML" accept=".opml,.xml,text/xml" onChange={(e) => {
      const file = e.target.files?.[0];
      if (file) void run(async () => {
        if (file.size > 5 * 1024 * 1024) throw new Error('Tệp vượt quá 5 MB');
        const text = await file.text(); setXml(text); reset();
      });
    }} />
    <textarea aria-label="Nội dung OPML" placeholder="Dán OPML, hoặc chọn tệp" rows={4} value={xml} onChange={(e) => { setXml(e.target.value); reset(); }} />
    <button type="button" className="qmrss-btn" disabled={!xml.trim()} onClick={() => void inspect({ xml })}>Xem trước</button>
    <input aria-label="Địa chỉ OPML" placeholder="https://example.org/subscriptions.opml" value={url} onChange={(e) => { setUrl(e.target.value); reset(); }} />
    <button type="button" className="qmrss-btn" disabled={!url.trim()} onClick={() => void inspect({ url: url.trim() })}>Xem trước từ địa chỉ</button>
    {preview && <>
      <input aria-label="Lọc nguồn nhập" placeholder="Lọc theo tên, nhóm, địa chỉ" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="qmrss-row">
        <button type="button" className="qmrss-btn" onClick={() => setSelected(visible.filter((entry) => !entry.duplicate).map((entry) => entry.url))}>Chọn kết quả lọc</button>
        <button type="button" className="qmrss-btn" onClick={() => setSelected([])}>Bỏ chọn hết</button>
      </div>
      <div className="qrs-opml-results">{visible.map((entry) => <label key={entry.url}>
        <input type="checkbox" disabled={entry.duplicate} checked={selected.includes(entry.url)} onChange={(e) => setSelected(e.target.checked ? [...selected,entry.url] : selected.filter((url) => url !== entry.url))} />
        {entry.name || entry.url} {entry.group && ` · ${entry.group}`} {entry.duplicate && '(đã đăng ký)'}
      </label>)}</div>
      <button type="button" className="qmrss-btn" disabled={!selected.length} onClick={() => void run(async () => {
        const result = await api.opmlImport(preview.xml, selected);
        setMessage(`Đã nhập ${result.added} nguồn, bỏ qua ${result.skipped}. Vào kênh sẽ tự lấy bài viết.`);
        reset(); await onDone();
      })}>Nhập nguồn đã chọn ({selected.length})</button>
    </>}
    {busy && <div role="status">Đang xử lý…</div>}
    {message && <div role="status">{message}</div>}
  </fieldset>;
}
