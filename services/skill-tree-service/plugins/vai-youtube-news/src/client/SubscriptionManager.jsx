import { useEffect, useState } from 'react';
import { Search, Pencil, Copy, RefreshCw, Trash2, X, Folder } from 'lucide-react';

function host(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return url; }
}

export function SubscriptionManager({ api, subscriptions, onChange, notify }) {
  const [query, setQuery] = useState('');
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [selected, setSelected] = useState([]);
  const [group, setGroup] = useState('');
  const [editing, setEditing] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const errorCount = subscriptions.filter(sub => sub.lastError).length;
  useEffect(() => { if (!errorCount) setErrorsOnly(false); }, [errorCount]);
  const visible = subscriptions.filter((sub) => (!errorsOnly || sub.lastError) && `${sub.name} ${sub.group ?? ''} ${sub.url}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const groups = [...new Set(subscriptions.map(sub => sub.group).filter(Boolean))].sort((a,b) => a.localeCompare(b, 'zh-CN'));
  const execute = async (operation) => {
    setBusy(true);
    try { await operation(); } catch (error) { notify(`Thao tác thất bại: ${error?.message ?? String(error)}`, true); }
    finally {
      try { const result = await api.listSubscriptions(); onChange(result.subscriptions); }
      catch (error) { notify(`Đọc lại nguồn thất bại: ${error?.message ?? String(error)}`, true); }
      setBusy(false);
    }
  };
  const batch = async (operation) => {
    const failed = [];
    for (const id of selected) {
      try { await operation(id); } catch (error) { failed.push(`${id}: ${error?.message ?? String(error)}`); }
    }
    setSelected([]);
    if (failed.length) throw new Error(failed.join('; '));
    notify('Đã xong thao tác hàng loạt');
  };
  const toggleSelected = (id, checked) => setSelected(current => checked ? [...current,id] : current.filter(item => item !== id));
  return <section className="qrs-subscriptions" aria-label="Quản lý nguồn đăng ký">
    <div className="qrs-subscriptions-toolbar">
      <label className="qrs-subscriptions-search"><Search size={16} /><input aria-label="Tìm nguồn" placeholder="Tìm theo tên, nhóm hoặc địa chỉ" value={query} onChange={event => setQuery(event.target.value)} /></label>
      {errorCount > 0 && <div className="qrs-segmented" role="group" aria-label="Trạng thái nguồn"><button type="button" aria-pressed={!errorsOnly} onClick={() => setErrorsOnly(false)}>Tất cả</button><button type="button" aria-pressed={errorsOnly} title="Lọc nguồn gặp lỗi" onClick={() => setErrorsOnly(true)}>Lỗi {errorCount}</button></div>}
    </div>
    <div className="qrs-subscriptions-selection"><button type="button" disabled={busy || !visible.length} onClick={() => setSelected(visible.map(sub => sub.id))}>Chọn tất cả kết quả</button><span>{visible.length} kết quả</span></div>
    {selected.length > 0 && <div className="qrs-subscriptions-batch" aria-label="Thao tác hàng loạt">
      <strong>Đã chọn {selected.length}</strong>
      <label><Folder size={15} /><input aria-label="Chuyển nhóm hàng loạt" placeholder="Nhóm đích, để trống = không nhóm" value={group} onChange={event => setGroup(event.target.value)} /></label>
      <button type="button" disabled={busy} onClick={() => void execute(() => batch(id => api.updateSubscription({ id, group })))}>Chuyển nhóm</button>
      <button type="button" disabled={busy} onClick={() => void execute(() => batch(id => api.refresh(id)))}><RefreshCw size={14} />Làm mới</button>
      <button type="button" disabled={busy} className="danger" onClick={() => setConfirmDelete(true)}><Trash2 size={14} />Hủy đăng ký</button>
      <button type="button" className="icon" aria-label="Bỏ chọn" onClick={() => { setSelected([]); setConfirmDelete(false); }}><X size={16} /></button>
    </div>}
    {confirmDelete && <div className="qrs-subscriptions-confirm" role="alert">Hủy đăng ký {selected.length} nguồn này?<button type="button" className="danger" onClick={() => { setConfirmDelete(false); void execute(() => batch(id => api.removeSubscription(id))); }}>Xác nhận hủy</button><button type="button" onClick={() => setConfirmDelete(false)}>Hủy</button></div>}
    <div className="qrs-subscriptions-list">
      {visible.map(sub => <div key={sub.id} className="qrs-subscription-row">
        <input type="checkbox" aria-label={`Chọn ${sub.name}`} disabled={busy} checked={selected.includes(sub.id)} onChange={event => toggleSelected(sub.id,event.target.checked)} />
        <div className="qrs-subscription-avatar" aria-hidden="true">{sub.name.trim().slice(0,1) || 'R'}</div>
        <div className="qrs-subscription-copy"><strong>{sub.name}</strong><span title={sub.url}>{host(sub.url)}{sub.group && <> · {sub.group}</>}</span>{sub.lastError && <small role="status">Lấy dữ liệu thất bại: {sub.lastError}</small>}</div>
        <div className="qrs-subscription-actions">
          <button type="button" aria-label={`Sửa ${sub.name}`} title="Sửa" disabled={busy} onClick={() => setEditing({ id:sub.id, name:sub.name, group:sub.group ?? '' })}><Pencil size={15} /></button>
          <button type="button" aria-label={`Sao chép địa chỉ ${sub.name}`} title="Sao chép địa chỉ" onClick={() => void navigator.clipboard.writeText(sub.url).then(() => notify('Đã sao chép địa chỉ')).catch(error => notify(`Sao chép thất bại: ${error.message}`,true))}><Copy size={15} /></button>
        </div>
      </div>)}
      {!visible.length && <div className="qrs-subscriptions-empty">{errorsOnly ? 'Không có nguồn nào gặp lỗi' : 'Không có nguồn phù hợp'}</div>}
    </div>
    {groups.length > 0 && <div className="qrs-group-manager"><div className="qrs-group-heading"><strong>Nhóm nguồn</strong><span>{groups.length} nhóm</span></div>
      {groups.map(name => <div className="qrs-group-row" key={name}><Folder size={15} /><span>{name}</span><small>{subscriptions.filter(sub => sub.group === name).length} nguồn đăng ký</small><button type="button" aria-label={`Sửa nhóm ${name}`} onClick={() => setEditingGroup({ oldName:name, name })}><Pencil size={15} /></button></div>)}
    </div>}
    {editing && <div className="qrs-subscription-editor-backdrop" onClick={() => setEditing(null)}><form className="qrs-subscription-editor" role="dialog" aria-modal="true" aria-label="Sửa nguồn đăng ký" onClick={event => event.stopPropagation()} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); setEditing(null); } }} onSubmit={event => { event.preventDefault(); if (!busy && editing.name.trim()) void execute(async () => { await api.updateSubscription(editing); setEditing(null); notify('Đã cập nhật nguồn'); }); }}>
      <div><strong>Sửa nguồn</strong><button type="button" aria-label="Đóng" onClick={() => setEditing(null)}><X size={16} /></button></div>
      <label>Tên<input autoFocus aria-label="Tên nguồn" value={editing.name} onChange={event => setEditing({ ...editing,name:event.target.value })} /></label>
      <label>Nhóm<input aria-label="Nhóm nguồn" list="qrs-existing-groups" value={editing.group} onChange={event => setEditing({ ...editing,group:event.target.value })} /><datalist id="qrs-existing-groups">{groups.map(name => <option key={name} value={name} />)}</datalist></label>
      <div className="qrs-subscription-editor-actions"><button type="button" onClick={() => setEditing(null)}>Hủy</button><button type="submit" disabled={busy || !editing.name.trim()}>Lưu thay đổi</button></div>
    </form></div>}
    {editingGroup && <div className="qrs-subscription-editor-backdrop" onClick={() => setEditingGroup(null)}><form className="qrs-subscription-editor" role="dialog" aria-modal="true" aria-label="Sửa nhóm nguồn" onClick={event => event.stopPropagation()} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); setEditingGroup(null); } }} onSubmit={event => { event.preventDefault(); if (busy) return; void execute(async () => { const targets = subscriptions.filter(sub => sub.group === editingGroup.oldName); for (const sub of targets) await api.updateSubscription({ id:sub.id, group:editingGroup.name.trim() }); setEditingGroup(null); notify('Đã cập nhật nhóm'); }); }}>
      <div><strong>Sửa nhóm</strong><button type="button" aria-label="Đóng" onClick={() => setEditingGroup(null)}><X size={16} /></button></div>
      <p>Đổi tên nhóm sẽ chuyển toàn bộ nguồn trong nhóm sang tên mới. Để trống để bỏ nhóm; nguồn đăng ký vẫn giữ nguyên.</p>
      <label>Tên nhóm<input autoFocus aria-label="Tên nhóm" value={editingGroup.name} onChange={event => setEditingGroup({ ...editingGroup, name:event.target.value })} /></label>
      <div className="qrs-subscription-editor-actions"><button type="button" onClick={() => setEditingGroup(null)}>Hủy</button><button type="submit" disabled={busy || editingGroup.name.trim() === editingGroup.oldName}>Lưu nhóm</button></div>
    </form></div>}
  </section>;
}
