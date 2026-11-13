import { useEffect, useMemo, useState } from 'react';
import blogCatalog from '../data/independent-blogs.json';
import podcastCatalog from '../data/podcast-feeds.json';
import { Icon } from './icons.jsx';
import { PodcastDiscovery } from './PodcastDiscovery.jsx';

const featured = [
  ['潮流周刊 · Tw93','https://weekly.tw93.fun/rss.xml'],
  ['阮一峰的网络日志','https://www.ruanyifeng.com/blog/atom.xml'],
  ['云风','https://blog.codingnow.com/atom.xml'],
  ['和菜头','https://www.hecaitou.com/feeds/posts/default?alt=rss'],
  ['张鑫旭','https://www.zhangxinxu.com/wordpress/feed/'],
  ['小众软件','https://www.appinn.com/feed/'],
  ['月光博客','https://www.williamlong.info/rss.xml'],
  ['Reorx','https://reorx.com/feed.xml'],
  ['pseudoyu','https://www.pseudoyu.com/zh/index.xml'],
].map(([name,url]) => ({ name,url,category:'Tác giả chọn lọc' }));
const wechat = [
  ['向阳乔木推荐看','3008229483'],['葬AI','3988614169'],['AGENT橘','3903697567'],
  ['赛博禅心','3934419561'],['数字生命卡兹克','3223096120'],['晚点LatePost','3572959446'],
  ['新智元','3271041950'],['elsewhere别处发生','3635075805'],
].map(([name,id]) => ({ name,url:`https://rss.t5t6.com/weread/MP_WXS_${id}.xml`,category:'WeChat chính danh' }));
const catalog = [...featured,...wechat,...podcastCatalog.items.map((entry) => ({ ...entry, category:'Podcast' })),...blogCatalog.items.map((entry) => ({ ...entry, category:'Blog độc lập' }))];
const topics = [...new Set(blogCatalog.items.flatMap((entry) => entry.tags ?? []))].sort();
const categories = ['Tất cả','Tác giả chọn lọc','WeChat chính danh','Podcast','Podcast nước ngoài','Blog độc lập'];
function feedHost(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return url; }
}

export function Discover({ api, onClose, onAdded, onRead, onPodcastImported }) {
  const [query,setQuery] = useState('');
  const [category,setCategory] = useState('Tất cả');
  const [topic,setTopic] = useState('');
  const [limit,setLimit] = useState(40);
  const [subscribed,setSubscribed] = useState([]);
  const [busy,setBusy] = useState('');
  const [message,setMessage] = useState('');
  useEffect(() => setLimit(40),[query,category,topic]);
  useEffect(() => { void api.listSubscriptions().then((result) => setSubscribed(result.subscriptions)).catch((error) => setMessage(error.message)); },[api]);
  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);
  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return catalog.filter((entry) => (category === 'Tất cả' || entry.category === category) && (!topic || entry.tags?.includes(topic)) && `${entry.name} ${entry.url} ${(entry.tags ?? []).join(' ')}`.toLocaleLowerCase().includes(needle));
  }, [query,category,topic]);
  const add = async (entry) => {
    setBusy(entry.url); setMessage('');
    try {
      const result = await api.addSubscription({ name:entry.name,url:entry.url,group:entry.category });
      setSubscribed((current) => [...current,result]);
      setMessage(result.lastError ? `Đã thêm, lấy dữ liệu lần đầu thất bại: ${result.lastError}` : `Đã đăng ký ${entry.name}`);
      await onAdded();
    } catch (error) { setMessage(error?.message ?? String(error)); }
    finally { setBusy(''); }
  };
  return <div className="qmrss-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="qmrss-dialog qrs-discover" role="dialog" aria-modal="true" aria-label="Khám phá nguồn">
      <header className="qrs-discover-head">
        <div><h3>Khám phá nguồn</h3><p>Tìm nội dung bạn quan tâm, thêm vào kênh của bạn.</p></div>
        <button type="button" className="qrs-icon" aria-label="Đóng khám phá" title="Đóng" onClick={onClose}><Icon name="x" /></button>
      </header>
      <div className="qrs-discover-filters">
        {category !== 'Podcast nước ngoài' && <label className="qrs-discover-search"><Icon name="search" /><input autoFocus aria-label="Tìm nguồn gợi ý" placeholder="Tìm tác giả, podcast hoặc địa chỉ RSS" value={query} onChange={(event) => setQuery(event.target.value)} /></label>}
        <div className="qrs-discover-categories" role="group" aria-label="Phân loại nguồn">
          {categories.map((name) => <button key={name} type="button" className={category === name ? 'active' : ''} aria-pressed={category === name} onClick={() => { setCategory(name); if (name !== 'Tất cả' && name !== 'Blog độc lập') setTopic(''); }}>{name}</button>)}
        </div>
        {category !== 'Podcast nước ngoài' && <div className="qrs-discover-filter-line"><span>{visible.length} kết quả</span><select aria-label="Chủ đề" value={topic} onChange={(event) => setTopic(event.target.value)} disabled={category !== 'Tất cả' && category !== 'Blog độc lập'}><option value="">Mọi chủ đề</option>{topics.map((tag) => <option key={tag}>{tag}</option>)}</select></div>}
      </div>
      {category === 'Podcast nước ngoài' ? <PodcastDiscovery api={api} onImported={onPodcastImported} /> : <div className="qrs-discover-results">
        {visible.slice(0,limit).map((entry,index) => {
          const subscription = subscribed.find((sub) => sub.url === entry.url);
          return <div key={`${entry.url}:${index}`} className="qrs-discover-row">
            <span className="qrs-discover-avatar" aria-hidden="true">{entry.category === 'Podcast' ? <Icon name="podcast" size={17} /> : entry.name.slice(0,1)}</span>
            <div className="qrs-discover-info"><strong>{entry.name}</strong><span title={entry.url}>{feedHost(entry.url)}<span className="qrs-discover-dot"> · </span>{entry.category}</span></div>
            {subscription ? <div className="qrs-discover-actions"><button type="button" className="qrs-discover-read" aria-label={`Đọc ${entry.name}`} onClick={() => onRead(`feed:${subscription.id}`)}>Đọc</button><span className="qrs-discover-subscribed">Đã đăng ký</span></div>
              : <button type="button" className="qrs-discover-add" disabled={Boolean(busy)} aria-label={`Đăng ký ${entry.name}`} onClick={() => void add(entry)}>{busy === entry.url ? 'Đang thêm…' : <><Icon name="plus" />Đăng ký</>}</button>}
          </div>;
        })}
        {visible.length > limit && <button type="button" className="qrs-discover-more" onClick={() => setLimit((current) => current + 40)}>Hiện thêm</button>}
        {!visible.length && <div className="qrs-discover-empty">Không tìm thấy nguồn phù hợp</div>}
      </div>}
      <footer className="qrs-discover-foot">
        {message && <div className="qrs-discover-message" role="status">{message}</div>}
        <span>Blog độc lập từ <a href={blogCatalog.source} target="_blank" rel="noreferrer">Tim Qian</a> · MIT</span>
        <span>Danh mục podcast từ <a href={podcastCatalog.source} target="_blank" rel="noreferrer">Qiaomu RSS</a></span>
        <span>Nguồn WeChat do bên thứ ba cung cấp, có thể chỉ có tóm tắt</span>
      </footer>
    </div>
  </div>;
}
