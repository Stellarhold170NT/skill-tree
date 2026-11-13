const KEY = 'qrs.quick-prompts.v1';

export const DEFAULT_PROMPTS = [
  { id: 'summary', title: 'Tóm tắt ý chính', body: 'Hãy tóm tắt ba điểm cốt lõi của bài viết, phân biệt sự kiện với ý kiến của tác giả.' },
  { id: 'translate', title: 'Dịch toàn văn', body: 'Hãy dịch toàn bộ bài viết sang tiếng Việt, giữ nguyên cấu trúc gốc.' },
  { id: 'explain', title: 'Giải thích đoạn chọn', body: 'Hãy giải thích đoạn tôi đã chọn dựa trên ngữ cảnh bài viết, bằng lời đơn giản dễ hiểu.' },
  { id: 'question', title: 'Hỏi về bằng chứng', body: 'Các kết luận chính của bài viết có bằng chứng gì hỗ trợ? Đâu những điểm cần kiểm chứng thêm?' },
];

export function readQuickPrompts() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (Array.isArray(saved)) return saved.filter(item => item && typeof item.id === 'string' && typeof item.title === 'string' && typeof item.body === 'string').slice(0, 20);
  } catch { /* Damaged preferences must not block reading. */ }
  return DEFAULT_PROMPTS;
}

export function saveQuickPrompts(items) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('qrs-prompts-changed'));
}

/** Adapt built-in prompts only; preserve customized instructions, including explicit full-article requests. */
export function scopedQuickPrompts(items, selection = '') {
  const scoped = {
    summary: { title: 'Tóm tắt đoạn chọn', body: 'Hãy tóm tắt ba ý chính của đoạn được chọn, phân biệt sự kiện với ý kiến. Chỉ xử lý đoạn đã chọn, bài viết chỉ làm ngữ cảnh.' },
    translate: { title: 'Dịch đoạn chọn', body: 'Hãy chỉ dịch đoạn được chọn sang tiếng Việt, giữ nguyên ý và cấu trúc. Bài viết chỉ làm ngữ cảnh.' },
    explain: { title: 'Giải thích đoạn chọn', body: 'Dựa trên ngữ cảnh bài viết, hãy giải thích đoạn được chọn một cách dễ hiểu. Chỉ giải thích đoạn đã chọn.' },
    question: { title: 'Hỏi về bằng chứng', body: 'Kết luận trong đoạn được chọn có bằng chứng gì hỗ trợ? Đâu những điểm cần kiểm chứng? Tập trung vào đoạn chọn.' },
  };
  return items.map(item => {
    const original = DEFAULT_PROMPTS.find(prompt => prompt.id === item.id);
    if (!original || original.body !== item.body) return item;
    if (selection.trim()) return { ...item, ...scoped[item.id] };
    if (item.id === 'explain') return { ...item, title: 'Giải thích bài viết', body: 'Hãy giải thích ý chính của bài viết một cách dễ hiểu.' };
    return item;
  });
}
