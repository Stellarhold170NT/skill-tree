import { useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { readQuickPrompts, saveQuickPrompts } from './quick-prompts.js';

export function PromptManager({ notify, startAdding = false }) {
  const [items, setItems] = useState(readQuickPrompts);
  const [editing, setEditing] = useState(() => startAdding && readQuickPrompts().length < 20 ? { title:'', body:'' } : null);
  const save = () => {
    const title = editing.title.trim();
    const body = editing.body.trim();
    if (!title || !body) return;
    const next = editing.id ? items.map(item => item.id === editing.id ? { id:item.id, title, body } : item)
      : [...items, { id:crypto.randomUUID(), title, body }];
    saveQuickPrompts(next);
    setItems(next);
    setEditing(null);
    notify('Đã lưu lệnh nhanh');
  };
  return <div className="qrs-prompt-manager">
    <div className="qrs-settings-card-head qrs-settings-source-head"><div><h3>Lệnh nhanh</h3><p>Hiển thị phía trên ô nhập của trợ lý, bấm là gửi ngay. Bản nháp trong ô nhập sẽ được giữ lại.</p></div>
      <button type="button" className="qrs-prompt-add" disabled={items.length >= 20} onClick={() => setEditing({ title:'', body:'' })}><Plus size={15} />Thêm</button></div>
    <div className="qrs-prompt-list">{items.map(item => <div className="qrs-prompt-row" key={item.id}>
      <div><strong>{item.title}</strong><span>{item.body}</span></div>
      <button type="button" aria-label={`Sửa ${item.title}`} onClick={() => setEditing(item)}><Pencil size={15} /></button>
      <button type="button" aria-label={`Xóa ${item.title}`} onClick={() => { const next = items.filter(prompt => prompt.id !== item.id); saveQuickPrompts(next); setItems(next); notify('Đã xóa lệnh nhanh'); }}><Trash2 size={15} /></button>
    </div>)}{!items.length && <p>Chưa có lệnh nhanh nào.</p>}</div>
    {editing && <div className="qrs-subscription-editor-backdrop" onClick={() => setEditing(null)}>
      <form className="qrs-subscription-editor" role="dialog" aria-modal="true" aria-label={editing.id ? 'Sửa lệnh nhanh' : 'Thêm lệnh nhanh'} onClick={event => event.stopPropagation()} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); setEditing(null); } }} onSubmit={event => { event.preventDefault(); save(); }}>
        <div><strong>{editing.id ? 'Sửa lệnh nhanh' : 'Thêm lệnh nhanh'}</strong><button type="button" aria-label="Đóng" onClick={() => setEditing(null)}><X size={16} /></button></div>
        <label>Tên<input autoFocus maxLength={60} value={editing.title} onChange={event => setEditing({ ...editing, title:event.target.value })} /></label>
        <label>Nội dung lệnh<textarea rows={5} maxLength={5000} value={editing.body} onChange={event => setEditing({ ...editing, body:event.target.value })} /></label>
        <div className="qrs-subscription-editor-actions"><button type="button" onClick={() => setEditing(null)}>Hủy</button><button type="submit" disabled={!editing.title.trim() || !editing.body.trim()}>Lưu</button></div>
      </form>
    </div>}
  </div>;
}
