const messages = {
  zh: {
    lab: 'Phòng thử nghiệm', enableFirst: 'Xác minh mã mời bên dưới trước khi bật.', enableHint: 'Sau khi bật, bấm chuột phải vào liên kết trong bài và chọn “Yêu cầu thu thập”. Thay đổi được lưu tự động.', inviteDraft: 'Bấm “Xác minh và lưu” để kiểm tra mã mời.', replaceInvite: 'Đã lưu; nhập mã mới để thay thế', myRequests: 'Yêu cầu của tôi', requestsHint: 'Dán liên kết, xem tiến độ hoặc mở kết quả. Sẽ có thông báo khi xong.', viewRequests: 'Xem yêu cầu', loading: 'Đang tải…', enabledNotice: 'Đã bật thu thập liên kết', disabledNotice: 'Đã tắt thu thập liên kết', title: 'Thu thập và viết lại liên kết', intro: 'Gửi trang web để thu thập vào AI Engineer World\'s Fair và tự động tạo bản viết lại.',
    disclosure: 'Trang web bạn gửi và bản viết lại tạo ra sẽ được công khai.',
    enabled: 'Bật thu thập liên kết', invite: 'Mã mời', inviteHint: 'Nhập mã mời', verify: 'Xác minh và lưu', save: 'Lưu', saving: 'Đang xác minh…', verified: 'Mã mời đã được xác minh', unverified: 'Nhập mã mời và xác minh để bật.',
    url: 'Liên kết trang', submit: 'Gửi yêu cầu', submitting: 'Đang gửi…', submitted: 'Đã lưu yêu cầu thu thập', jobs: 'Yêu cầu của tôi',
    refresh: 'Làm mới yêu cầu', more: 'Tải thêm yêu cầu', empty: 'Chưa có yêu cầu nào', open: 'Mở để đọc', retry: 'Thử lại', close: 'Đóng',
    queued: 'Đang chờ', running: 'Đang xử lý', complete: 'Hoàn tất', failed: 'Thất bại', copy: 'Sao chép liên kết', copied: 'Đã sao chép liên kết', request: 'Yêu cầu thu thập', settings: 'Cài đặt phòng thử nghiệm', configured: 'Đã lưu cài đặt', offline: 'Tạm thời không đồng bộ được, đã giữ yêu cầu trên máy', original: 'Tiêu đề gốc', search: 'Tìm yêu cầu',
  },
  en: {
    lab: 'Labs', enableFirst: 'Verify your invitation code below to enable this feature.', enableHint: 'Right-click a link in an article and choose “Collect and rewrite”. Changes save automatically.', inviteDraft: 'Choose “Verify and save” to check this code.', replaceInvite: 'Saved; enter a code to replace it', myRequests: 'My requests', requestsHint: 'Paste a link, check progress or read results. You will be notified on completion.', viewRequests: 'View requests', loading: 'Loading…', enabledNotice: 'Link collection enabled', disabledNotice: 'Link collection disabled', title: 'Collect and rewrite links', intro: 'Submit a web page to Qiaomu, then read and discuss the result here.',
    disclosure: 'Submitted web pages and generated rewrites are publicly collected.',
    enabled: 'Enable link collection', invite: 'Invitation code', inviteHint: 'Enter a code; leave blank to keep the verified configuration', verify: 'Verify and save', save: 'Save', saving: 'Working…', verified: 'Invitation verified', unverified: 'Invitation not verified',
    url: 'Web page link', submit: 'Submit link', submitting: 'Submitting…', submitted: 'Collection request saved', jobs: 'Collection requests',
    refresh: 'Refresh requests', more: 'Load more requests', empty: 'No collection requests yet', open: 'Read result', retry: 'Retry', close: 'Close',
    queued: 'Queued', running: 'Processing', complete: 'Collection complete', failed: 'Failed', copy: 'Copy link', copied: 'Link copied', request: 'Collect and rewrite', settings: 'Labs settings', configured: 'Labs settings saved', offline: 'Unable to sync; local requests are preserved', original: 'Original title', search: 'Search requests',
  },
};
export function collectionCopy(language = globalThis.document?.documentElement?.lang || 'zh') { return messages[language.toLowerCase().split('-')[0]] || messages.zh; }
export function clickedLink(event, root) {
  const anchor = event.target?.closest?.('a[href]');
  if (!anchor || !root?.contains(anchor)) return undefined;
  try { const url = new URL(anchor.href); if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) return url.href; } catch {}
}
