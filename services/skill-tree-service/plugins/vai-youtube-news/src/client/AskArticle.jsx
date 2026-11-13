import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { companionCopy } from './companion-copy.js';
import { Icon } from './icons.jsx';
import { readQuickPrompts, scopedQuickPrompts } from './quick-prompts.js';

/** Reader on the left; Harness's own conversation stays mounted on the right. */
export function AskArticle({ api, context, onClose, onManagePrompts, onClearSelection, SessionProvider, renderSlot }) {
  const copy = companionCopy();
  const [workspaceId, setWorkspaceId] = useState(() => api.defaultChatWorkspace?.());
  const [chat, setChat] = useState(null);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(true);
  const [attached, setAttached] = useState('');
  const [attachedVersion, setAttachedVersion] = useState(context.version);
  const [prompts, setPrompts] = useState(readQuickPrompts);
  const [promptMount, setPromptMount] = useState(null);
  const [quoteMount, setQuoteMount] = useState(null);
  const [expandedQuote, setExpandedQuote] = useState(false);
  const [emptyConversation, setEmptyConversation] = useState(false);
  const [sendingPrompt, setSendingPrompt] = useState(false);
  const chatRoot = useRef(null);
  const sending = useRef(false);
  const owned = useRef(null);
  const generation = useRef(0);
  const started = useRef(false);
  const bindingQueue = useRef(Promise.resolve());
  const bindContext = request => {
    const pending = bindingQueue.current.catch(() => {}).then(() => api.setReadingContext(request));
    bindingQueue.current = pending;
    return pending;
  };
  const contextKey = [context.key, context.version, context.selection || '', context.quoteId || ''].join('|');

  useEffect(() => {
    if (workspaceId) return;
    return api.watchChatWorkspaces?.(() => setWorkspaceId(api.defaultChatWorkspace?.()));
  }, [api, workspaceId]);
  useEffect(() => () => { generation.current += 1; owned.current?.release(); }, []);
  useEffect(() => { const reload = () => setPrompts(readQuickPrompts()); window.addEventListener('qrs-prompts-changed', reload); return () => window.removeEventListener('qrs-prompts-changed', reload); }, []);
  useEffect(() => { setActionError(''); setExpandedQuote(false); }, [contextKey]);
  useEffect(() => {
    if (!chat || !SessionProvider) return;
    const root = chatRoot.current;
    if (!root) return;
    const mount = document.createElement('div');
    mount.className = 'qrs-companion-prompt-anchor';
    const quote = document.createElement('div');
    quote.className = 'qrs-companion-quote-anchor';
    let placed = false;
    let quotePlaced = false;
    const place = () => {
      const seat = root.querySelector('[data-composer-seat]');
      if (seat?.parentNode) {
        if (mount.nextSibling !== seat) seat.parentNode.insertBefore(mount, seat);
        if (!placed) { placed = true; setPromptMount(mount); }
      }
      const card = root.querySelector('[data-composer-card]');
      if (card && quote.parentNode !== card) card.insertBefore(quote, card.firstChild);
      if (card && !quotePlaced) { quotePlaced = true; setQuoteMount(quote); }
      setEmptyConversation(root.querySelector('[data-content-phase]')?.getAttribute('data-content-phase') === 'hero');
    };
    const observer = new MutationObserver(place);
    observer.observe(root, { childList:true, subtree:true, attributes:true, attributeFilter:['data-content-phase'] });
    place();
    return () => { observer.disconnect(); mount.remove(); quote.remove(); setPromptMount(null); setQuoteMount(null); setEmptyConversation(false); };
  }, [chat, SessionProvider]);

  useEffect(() => {
    const card = quoteMount?.parentElement;
    if (!card) return;
    // A typed native submission must also wait for the current selection binding.
    card.inert = attached !== contextKey || Boolean(error);
    return () => { card.inert = false; };
  }, [quoteMount, attached, contextKey, error]);

  async function start(fresh = false) {
    if (!workspaceId) return;
    const current = ++generation.current;
    setBusy(true);
    setError('');
    setActionError('');
    let acquired;
    try {
      const saved = fresh ? null : localStorage.getItem(`qrs.chat.${workspaceId}.${context.key}`);
      try {
        acquired = await api.openChat({ workspaceId, sessionId: saved || undefined });
      } catch (cause) {
        if (!saved) throw cause;
        localStorage.removeItem(`qrs.chat.${workspaceId}.${context.key}`);
        acquired = await api.openChat({ workspaceId });
      }
      if (current !== generation.current) { acquired.release(); return; }
      const binding = await bindContext({ sessionId: acquired.sessionId, ...context });
      if (current !== generation.current) { acquired.release(); return; }
      owned.current?.release();
      owned.current = acquired;
      setChat(acquired);
      setAttached(contextKey);
      setAttachedVersion(binding?.version ?? context.version);
      localStorage.setItem(`qrs.chat.${workspaceId}.${context.key}`, acquired.sessionId);
      acquired = null;
    } catch (cause) {
      acquired?.release();
      setError(cause?.message ?? String(cause));
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }

  useEffect(() => {
    if (!workspaceId || started.current) return;
    started.current = true;
    void start();
  }, [workspaceId]);
  useEffect(() => {
    if (!chat || attached === contextKey) return;
    let stale = false;
    setError('');
    bindContext({ sessionId: chat.sessionId, ...context })
      .then((binding) => { if (!stale) { setAttached(contextKey); setAttachedVersion(binding?.version ?? context.version); } })
      .catch(cause => { if (!stale) setError(cause?.message ?? String(cause)); });
    return () => { stale = true; };
  }, [chat, contextKey]);
  async function sendQuickPrompt(item) {
    if (sending.current || !chat || attached !== contextKey) return;
    sending.current = true;
    setSendingPrompt(true);
    setActionError('');
    try { await chat.sendPrompt(item.body); }
    catch (cause) { setActionError(cause?.message?.includes('bản nháp') ? 'Ô nhập đang có bản nháp, hãy gửi hoặc xóa bản nháp trước khi dùng lệnh nhanh.' : `Gửi nhanh thất bại: ${cause?.message ?? String(cause)}`); }
    finally { setSendingPrompt(false); sending.current = false; }
  }

  return <aside className="qrs-companion" aria-label="Trợ lý AI">
    <header className="qrs-companion-header">
      <strong>Trợ lý AI</strong>
      <button className="qrs-icon" title="Trò chuyện mới" aria-label="Trò chuyện mới" onClick={() => void start(true)} disabled={busy || !workspaceId}><Icon name="plus" /></button>
      <button className="qrs-icon" title="Đóng trợ lý" aria-label="Đóng trợ lý" onClick={onClose}><Icon name="x" /></button>
    </header>
    <div className="qrs-companion-context">
      <strong>{context.title}</strong>
      <small>{({ original: 'Bản gốc', translation: 'Bản dịch', rewrite: 'Giải thích AI' })[attached === contextKey ? attachedVersion : context.version]}{attached === contextKey && attachedVersion !== context.version ? 'có sẵn nhưng bản hiện tại thiếu' : ''} · {context.selection ? copy.background : copy.article}</small>
    </div>
    {error && <div className="qrs-companion-error" role="alert"><strong>{error.includes('chưa có nội dung') ? 'Tạm thời chưa thể trò chuyện về bài này' : 'Kết nối trợ lý chưa hoàn tất'}</strong><p>{error.includes('chưa có nội dung') ? 'Bài này hiện chưa có nội dung để tham chiếu. Thử lại sau hoặc đọc bài khác trước.' : error}</p><button type="button" onClick={() => void start()}>Kết nối lại</button></div>}
    {actionError && <div className="qrs-companion-notice" role="status"><span>{actionError}</span><button type="button" aria-label="Đóng thông báo" onClick={() => setActionError('')}><Icon name="x" size={13} /></button></div>}
    {!chat && !error && <div className="qrs-companion-loading" role="status">{workspaceId ? 'Đang mở hội thoại…' : 'Đang kết nối workspace mặc định…'}</div>}
    {chat && SessionProvider && <div className="qrs-native-chat" ref={chatRoot}>
      <SessionProvider session={chat.reference}>{renderSlot('qiaomu-rss.chat', {})}</SessionProvider>
      {emptyConversation && attached === contextKey && !error && <div className="qrs-companion-opening" aria-label="Bắt đầu trò chuyện">
        <div className="qrs-companion-book" aria-hidden="true">
          <svg viewBox="0 0 112 88" fill="none">
            <path d="M56 72c-10-7-21-10-37-9V19c16-1 27 2 37 9 10-7 21-10 37-9v44c-16-1-27 2-37 9Z" />
            <path d="M56 28v44M25 29c9 .3 17 2.5 24 6M25 38c9 .3 17 2.5 24 6M63 35c7-3.5 15-5.7 24-6M63 44c7-3.5 15-5.7 24-6" />
            <path d="M11 68c18-3 33 0 45 9 12-9 27-12 45-9" />
            <circle cx="77" cy="13" r="2.5" className="qrs-companion-book-spark" />
            <path d="M77 3v4M77 19v4M67 13h4M83 13h4" className="qrs-companion-book-spark" />
          </svg>
        </div>
        <span className="qrs-companion-opening-label">Đọc cùng bài viết</span>
        <h2>Mỗi hiểu biết bắt đầu từ một thắc mắc.</h2>
        <p>Một chi tiết, một câu hỏi, hay một ý bạn chưa đồng ý.<br />Viết xuống, ta cùng đọc tiếp.</p>
      </div>}
    </div>}
    {quoteMount && context.selection && createPortal(<section className="qrs-companion-quote" aria-label={copy.passage} aria-busy={attached !== contextKey}>
      <div className="qrs-companion-quote-heading"><strong>{copy.selected} · {Array.from(context.selection).length} {copy.characters}</strong><span>{attached === contextKey ? copy.scope : copy.syncing}</span>
        <button type="button" aria-label={copy.remove} title={copy.removeHint} disabled={sendingPrompt || !onClearSelection} onClick={onClearSelection}><Icon name="x" size={14} /></button>
      </div>
      <blockquote className={expandedQuote ? 'is-expanded' : ''}>{context.selection}</blockquote>
      {context.selection.length > 100 && <button type="button" className="qrs-companion-quote-expand" aria-expanded={expandedQuote} onClick={() => setExpandedQuote(value => !value)}>{expandedQuote ? copy.collapse : copy.expand}</button>}
    </section>, quoteMount)}
    {promptMount && createPortal(<div className="qrs-companion-prompt-strip" role="group" aria-label="Lệnh nhanh">
      <div className="qrs-companion-prompt-scroll">{scopedQuickPrompts(prompts, context.selection).map(item => <button type="button" className="qrs-companion-prompt-ghost" key={item.id} title={item.body} aria-label={`Gửi ngay: ${item.title}`} disabled={sendingPrompt || attached !== contextKey} onClick={() => void sendQuickPrompt(item)}>{item.title}</button>)}</div>
      <button type="button" className="qrs-companion-add-prompt" aria-label="Thêm lệnh nhanh" title="Thêm lệnh nhanh" onClick={onManagePrompts}><Icon name="plus" size={14} /></button>
    </div>, promptMount)}
  </aside>;
}
