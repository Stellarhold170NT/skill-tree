import { CollectionSettings } from './CollectionPanel.jsx';
import { collectionCopy } from './collection-copy.js';
import { useEffect, useState } from 'react';
import { BookOpen, Rss, Info, Download, Upload, ArrowUpRight, Heart, Sparkles } from 'lucide-react';
import packageInfo from '../../package.json';
import { Icon } from './icons.jsx';
import { ReadingControls } from './ReadingAppearance.jsx';
import { OpmlImport } from './OpmlImport.jsx';
import { SubscriptionManager } from './SubscriptionManager.jsx';
import { PromptManager } from './PromptManager.jsx';

const TABS = [['reading', 'Trải nghiệm đọc', BookOpen], ['sources', 'Quản lý nguồn', Rss], ['prompts', 'Lệnh nhanh', Sparkles], ['about', 'Giới thiệu', Info]];
const REWARD_QR = 'https://radio.qiaomu.ai/assets/qiaomu_reward_qr.png';
const FOLLOW_QR = 'https://radio.qiaomu.ai/assets/qiaomu_wechat_public_account_qr.jpg';

export function SettingsPage({ api, onClose, notify, initialTab = 'reading', startAddingPrompt = false, onCollection }) {
  const [tab, setTab] = useState(initialTab);
  const [settings, setSettings] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [showImport, setShowImport] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void Promise.all([api.getSettings(), api.listSubscriptions()]).then(([preferences, feeds]) => {
      if (!cancelled) { setSettings(preferences.settings); setSubscriptions(feeds.subscriptions); }
    }).catch(error => { if (!cancelled) setMessage(`Đọc cài đặt thất bại: ${error?.message ?? String(error)}`); });
    const onKey = event => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { cancelled = true; window.removeEventListener('keydown', onKey); };
  }, [api, onClose]);
  const change = patch => setSettings(previous => ({ ...previous, ...patch }));
  const reloadSubscriptions = async () => {
    const list = await api.listSubscriptions();
    setSubscriptions(list.subscriptions);
  };
  const save = async () => {
    setSaving(true);
    try {
      const result = await api.saveSettings({ ...settings, origin: (settings.origin ?? '').trim() });
      setSettings(result.settings);
      window.dispatchEvent(new Event('qrs-settings-changed'));
      setMessage('Đã lưu cài đặt');
    } catch (error) { setMessage(`Lưu thất bại: ${error?.message ?? String(error)}`); }
    finally { setSaving(false); }
  };
  const exportOpml = async () => {
    try {
      const result = await api.opmlExport();
      const url = URL.createObjectURL(new Blob([result.xml], { type: 'text/xml' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'qiaomu-rss-subscriptions.opml';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setMessage(`Xuất thất bại: ${error?.message ?? String(error)}`); }
  };
  return <div className="qrs-settings-backdrop" onClick={onClose}>
    <section className="qrs-settings-page" role="dialog" aria-modal="true" aria-label="Cài đặt AI Engineer World's Fair" onClick={event => event.stopPropagation()}>
      <header className="qrs-settings-head">
        <div><span>AI ENGINEER WORLD'S FAIR</span><strong>Cài đặt</strong></div>
        <button type="button" className="qrs-icon" title="Đóng cài đặt" aria-label="Đóng cài đặt" onClick={onClose}><Icon name="x" /></button>
      </header>
      <div className="qrs-settings-body">
        <nav className="qrs-settings-tabs" aria-label="Nhóm cài đặt">
          <span className="qrs-settings-nav-caption">Cài đặt</span>
          {[...TABS.slice(0, -1), ['lab', collectionCopy().lab, Sparkles], TABS.at(-1)].map(([key, label, TabIcon]) => <button key={key} type="button" aria-current={tab === key ? 'page' : undefined} onClick={() => setTab(key)}><TabIcon size={17} strokeWidth={1.8} />{label}</button>)}
        </nav>
        <main className="qrs-settings-content">
          {!settings && <p role="status">{message || 'Đang tải cài đặt…'}</p>}
          {settings && tab === 'reading' && <section aria-label="Cài đặt đọc">
            <div className="qrs-settings-intro"><h2>Trải nghiệm đọc</h2><p>Tùy chỉnh nhịp độ và giao diện khi đọc bài.</p></div>
            <div className="qrs-settings-card qrs-settings-reading-card">
              <div className="qrs-settings-card-head"><h3>Hiển thị bài</h3><p>Phông chữ, độ rộng cột và màu chỉ áp dụng cho chế độ đọc.</p></div>
              <ReadingControls settings={settings} onChange={change} variant="page" />
            </div>
            <div className="qrs-settings-card qrs-settings-toggle-row">
              <div><h3>Tạo phiên bản bằng AI</h3><p>Khi bài thiếu bản dịch hoặc bản giải thích, dùng mô hình hiện tại của Harness để tạo.</p></div>
              <label className="qrs-switch"><input type="checkbox" aria-label="Tạo phiên bản bằng AI" checked={settings.aiAssist !== false} onChange={event => change({ aiAssist: event.target.checked })} /><span aria-hidden="true" /></label>
            </div>
            <p className="qrs-settings-hint">Trợ lý AI dùng hội thoại gốc và workspace mặc định của Harness. Có thể đổi mô hình trong khung chat bên phải.</p>
          </section>}
          {settings && tab === 'sources' && <section aria-label="Quản lý nguồn">
            <div className="qrs-settings-intro"><h2>Quản lý nguồn</h2><p>Sắp xếp nguồn đăng ký cá nhân, hoặc nhập danh sách OPML sẵn có.</p></div>
            <div className="qrs-settings-card">
              <div className="qrs-settings-card-head"><h3>Dịch vụ vai-crawler</h3><p>Địa chỉ dịch vụ nội dung của crawler. Nguồn cá nhân vẫn đọc trực tiếp từ máy.</p></div>
              <label className="qrs-settings-url"><span>Địa chỉ dịch vụ</span><input type="url" aria-label="Địa chỉ dịch vụ crawler" value={settings.origin ?? ''} onChange={event => change({ origin: event.target.value })} /></label>
            </div>
            <div className="qrs-settings-card qrs-settings-sources-card">
              <div className="qrs-settings-card-head qrs-settings-source-head"><div><h3>Nguồn của tôi</h3><p>{subscriptions.length} nguồn đăng ký</p></div><div className="qrs-settings-source-actions">
                <button type="button" onClick={() => setShowImport(current => !current)} aria-expanded={showImport}><Upload size={15} />Nhập OPML</button>
                <button type="button" onClick={() => void exportOpml()}><Download size={15} />Xuất</button>
              </div></div>
              {showImport && <div className="qrs-settings-import"><OpmlImport api={api} onDone={async () => { await reloadSubscriptions(); setShowImport(false); }} /></div>}
              <SubscriptionManager api={api} subscriptions={subscriptions} onChange={setSubscriptions} notify={(text, isError) => { setMessage(text); if (isError) notify(text, true); }} />
            </div>
          </section>}
          {tab === 'lab' && <CollectionSettings api={api} notify={setMessage} onOpenRequests={onCollection} />}
          {tab === 'prompts' && <section aria-label="Cài đặt lệnh nhanh"><div className="qrs-settings-intro"><h2>Lệnh nhanh</h2><p>Đặt sẵn những câu hỏi hay dùng khi đọc.</p></div><div className="qrs-settings-card"><PromptManager notify={setMessage} startAdding={startAddingPrompt} /></div></section>}
          {tab === 'about' && <section aria-label="Giới thiệu">
            <div className="qrs-settings-intro"><h2>Về AI Engineer World's Fair</h2><p>Góc đọc tin yên tĩnh dành cho DeepSeek Harness, dựa trên Qiaomu RSS.</p></div>
            <div className="qrs-settings-card qrs-settings-about-card"><div className="qrs-settings-about-brand"><span>V</span><div><h3>AI Engineer World's Fair</h3><p>Phiên bản {packageInfo.version} · GPL-3.0-only</p></div></div><p>Đọc video tuyển chọn và RSS cá nhân, kèm trợ lý AI hội thoại gốc của Harness. Dữ liệu đọc lưu tại thư mục Harness trên máy.</p></div>
            <div className="qrs-settings-card"><div className="qrs-settings-card-head"><h3>Dự án & phản hồi</h3></div><div className="qrs-settings-links">
              {[['Mã nguồn & cập nhật','https://github.com/joeseesun/qiaomu-rss-dsh'],['Báo lỗi','https://github.com/joeseesun/qiaomu-rss-dsh/issues'],['Tác giả 向阳乔木','https://qiaomu.ai/'],['Blog 向阳乔木','https://blog.qiaomu.ai/']].map(([label,href]) => <a key={href} href={href} target="_blank" rel="noopener noreferrer">{label}<ArrowUpRight size={15} /></a>)}
            </div></div>
            <div className="qrs-settings-support">
              <div className="qrs-settings-card"><Heart size={18} /><h3>Ủng hộ tác giả gốc</h3><p>Cảm ơn bạn ủng hộ 向阳乔木 duy trì plugin gốc.</p><img src={REWARD_QR} alt="Mã QR ủng hộ của 向阳乔木" loading="lazy" width="140" height="140" referrerPolicy="no-referrer" /></div>
              <div className="qrs-settings-card"><Rss size={18} /><h3>Theo dõi WeChat</h3><p>向阳乔木推荐看</p><img src={FOLLOW_QR} alt="Mã QR WeChat 向阳乔木推荐看" loading="lazy" width="140" height="140" referrerPolicy="no-referrer" /></div>
            </div>
          </section>}
        </main>
      </div>
      <footer className="qrs-settings-footer"><span role="status">{message}</span>{tab === 'reading' || tab === 'sources' ? <button type="button" disabled={!settings || saving} onClick={() => void save()}>{saving ? 'Đang lưu…' : 'Lưu cài đặt'}</button> : null}</footer>
    </section>
  </div>;
}
