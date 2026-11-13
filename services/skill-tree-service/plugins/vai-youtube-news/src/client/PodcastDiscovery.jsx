import { useState } from 'react';
import { Icon } from './icons.jsx';

export function PodcastDiscovery({ api, onImported }) {
  const [query, setQuery] = useState('');
  const [shows, setShows] = useState([]);
  const [show, setShow] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const search = async (event) => {
    event.preventDefault();
    setBusy('search'); setError(''); setShow(null); setEpisodes([]); setSearched(true);
    try { setShows((await api.searchPodcastShows(query)).shows); }
    catch (cause) { setError(cause.message ?? String(cause)); }
    finally { setBusy(''); }
  };
  const openShow = async (item, nextPage = 1) => {
    setBusy('episodes'); setError('');
    try {
      const result = await api.listPodcastEpisodes(item.slug, nextPage);
      setShow(item); setEpisodes(result.episodes); setPage(nextPage);
    } catch (cause) { setError(cause.message ?? String(cause)); }
    finally { setBusy(''); }
  };
  const importEpisode = async (item) => {
    setBusy(item.episode_slug); setError('');
    try {
      const result = await api.importPodcastTranscript(show.slug, item.episode_slug);
      await onImported(result.key);
    } catch (cause) { setError(cause.message ?? String(cause)); }
    finally { setBusy(''); }
  };

  return <div className="qrs-podscribe">
    <form className="qrs-podscribe-search" onSubmit={search}>
      <Icon name="search" size={16} />
      <input autoFocus aria-label="Tìm podcast nước ngoài" placeholder="Tìm podcast tiếng Anh, ví dụ Acquired" value={query} onChange={event => setQuery(event.target.value)} />
      <button type="submit" disabled={busy === 'search' || query.trim().length < 2}>{busy === 'search' ? 'Đang tìm…' : 'Tìm'}</button>
    </form>
    <p className="qrs-podscribe-hint">Tìm trong danh mục transcript podcast công khai. Chọn một tập để lấy nguyên văn, có thể dịch hoặc hỏi đáp trong trình đọc.</p>
    {error && <p role="alert" className="qrs-podscribe-error">{error}</p>}
    {show && <button type="button" className="qrs-podscribe-back" onClick={() => { setShow(null); setEpisodes([]); }}>‹ Về danh sách chương trình</button>}
    <div className="qrs-podscribe-list">
      {show ? <>
        <h4>{show.name}</h4>
        {episodes.map(item => <div className="qrs-podscribe-row" key={item.episode_slug}>
          <div><strong>{item.title}</strong><small>{item.published_relative || ''}</small></div>
          <button type="button" disabled={Boolean(busy)} onClick={() => void importEpisode(item)}>{busy === item.episode_slug ? 'Đang lấy…' : 'Đọc nguyên văn'}</button>
        </div>)}
        {page > 1 && <button type="button" className="qrs-podscribe-next" disabled={Boolean(busy)} onClick={() => void openShow(show, page - 1)}>Trang trước</button>}
        {episodes.length > 0 && <button type="button" className="qrs-podscribe-next" disabled={Boolean(busy)} onClick={() => void openShow(show, page + 1)}>Trang sau</button>}
      </> : shows.map(item => <button type="button" className="qrs-podscribe-row qrs-podscribe-show" key={item.slug} disabled={Boolean(busy)} onClick={() => void openShow(item)}>
        {item.image && <img src={item.image} alt="" loading="lazy" />}
        <span><strong>{item.name}</strong><small>{item.episodes_with_transcripts ?? '—'} tập có transcript</small></span>
        <Icon name="chevron-right" size={15} />
      </button>)}
      {!show && !shows.length && !busy && searched && !error && <p className="qrs-podscribe-hint">Không có chương trình phù hợp, thử tìm bằng tên tiếng Anh.</p>}
    </div>
  </div>;
}
