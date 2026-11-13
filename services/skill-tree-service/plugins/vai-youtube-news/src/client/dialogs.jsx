import { useState } from 'react';

function Modal({ label, onClose, children, wide = false }) {
  return (
    <div className="qrs-modal-backdrop" onClick={onClose}>
      <div className={`qrs-modal${wide ? ' is-wide' : ''}`} role="dialog" aria-label={label} onClick={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function AddFeedDialog({ api, onClose, onDone, notify }) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [group, setGroup] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Modal label="Thêm nguồn đăng ký" onClose={onClose}>
      <h2>Thêm nguồn đăng ký</h2>
      <input aria-label="Địa chỉ nguồn" placeholder="Địa chỉ RSS / Atom (https://…)" value={url} onChange={(event) => setUrl(event.target.value)} autoFocus />
      <input aria-label="Tên nguồn" placeholder="Tên (tùy chọn, mặc định lấy tiêu đề nguồn)" value={name} onChange={(event) => setName(event.target.value)} />
      <input aria-label="Nhóm" placeholder="Nhóm (tùy chọn)" value={group} onChange={(event) => setGroup(event.target.value)} />
      <div className="qrs-modal-actions">
        <button type="button" onClick={onClose}>Hủy</button>
        <button type="button" disabled={busy || !/^https?:\/\//i.test(url.trim())} onClick={async () => {
          setBusy(true);
          try {
            await api.addSubscription({ url: url.trim(), name: name.trim() || undefined, group: group.trim() || undefined });
            await onDone();
            onClose();
          } catch (error) {
            notify(`Thêm thất bại: ${error?.message ?? String(error)}`, true);
          } finally { setBusy(false); }
        }}>{busy ? 'Đang thêm…' : 'Đăng ký'}</button>
      </div>
    </Modal>
  );
}
