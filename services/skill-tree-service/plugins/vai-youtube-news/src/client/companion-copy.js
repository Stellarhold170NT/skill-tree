const messages = {
  zh: {
    passage: 'Đoạn đang xử lý', selected: 'Nội dung đã chọn', characters: 'ký tự', scope: 'Chỉ xử lý đoạn đã chọn', syncing: 'Đang đồng bộ…',
    remove: 'Bỏ đoạn chọn', removeHint: 'Bỏ đoạn chọn, quay lại hỏi đáp cả bài', expand: 'Mở rộng', collapse: 'Thu gọn', background: 'Tham khảo bài viết', article: 'Bài hiện tại',
  },
  en: {
    passage: 'Passage to process', selected: 'Selected passage', characters: 'characters', scope: 'Selection only', syncing: 'Syncing…',
    remove: 'Remove selection', removeHint: 'Remove selection and return to article questions', expand: 'Expand', collapse: 'Collapse', background: 'Article background', article: 'Current article',
  },
};
export function companionCopy(language = globalThis.document?.documentElement?.lang || 'zh') {
  return messages[language.toLowerCase().split('-')[0]] || messages.zh;
}
