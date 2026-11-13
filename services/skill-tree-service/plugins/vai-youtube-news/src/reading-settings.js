/** Reading appearance: shared defaults, options, and validation for both halves. */
export const READING_DEFAULTS = {
  readingTheme: 'auto',
  readingFont: 'serif',
  customFont: '',
  fontSize: 19,
  lineHeight: 1.9,
  textWidth: 36,
  defaultVersion: 'rewrite',
  showImages: true,
};

/** Theme id -> [background, foreground]; `auto` follows the host theme. */
export const THEMES = {
  auto: null, light: ['#ffffff', '#202124'], paper: ['#f5efdf', '#40382e'], sage: ['#e8eee3', '#29382c'],
  mist: ['#e7edf2', '#293741'], dark: ['#252525', '#dedede'], black: ['#090909', '#cccccc'],
};

export const FONTS = {
  serif: { label: 'Lora (mặc định)', family: 'Lora,"Times New Roman",Times,serif' },
  sans: { label: 'Sans-serif', family: 'system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif' },
  sourceHanSerif: { label: 'Source Han Serif (CJK)', family: '"Songti SC","Noto Serif CJK SC","Source Han Serif SC",serif' },
  sourceHanSans: { label: 'Source Han Sans (CJK)', family: '"PingFang SC","Noto Sans CJK SC","Source Han Sans SC",sans-serif' },
  wenkai: { label: 'LXGW WenKai', family: '"LXGW WenKai","Kaiti SC",serif' },
  zhenkai: { label: 'Zhuque Fangsong', family: '"Zhuque Fangsong","Fangsong","STFangsong",serif' },
  custom: { label: 'Phông của máy', family: 'serif' },
};

export const TEXT_WIDTHS = [
  { value: 28, label: 'Hẹp · 28 ký tự' },
  { value: 32, label: 'Hơi hẹp · 32' },
  { value: 36, label: 'Vừa · 36' },
  { value: 40, label: 'Hơi rộng · 40' },
  { value: 44, label: 'Rộng · 44' },
];

/** Resolve the CSS font stack for one settings object. */
export function fontStack(settings) {
  if (settings.readingFont === 'custom') {
    const name = String(settings.customFont ?? '').trim();
    return name ? `${JSON.stringify(name)},${FONTS.serif.family}` : FONTS.serif.family;
  }
  return (FONTS[settings.readingFont] ?? FONTS.serif).family;
}

export function validateSettings(patch = {}) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new Error('Cài đặt phải là object');
  const result = {};
  for (const [key, value] of Object.entries(patch)) {
    if (['aiAssist', 'showImages'].includes(key)) {
      if (typeof value !== 'boolean') throw new Error(`${key} phải là boolean`);
    } else if (key === 'origin') {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Địa chỉ dịch vụ phải là HTTPS không kèm thông tin đăng nhập');
      result.origin = url.href.replace(/\/$/, '');
      continue;
    } else if (key === 'readingTheme') {
      if (!Object.hasOwn(THEMES, value)) throw new Error('Chủ đề đọc không hợp lệ');
    } else if (key === 'readingFont') {
      if (!Object.hasOwn(FONTS, value)) throw new Error('Phông chữ không hợp lệ');
    } else if (key === 'defaultVersion') {
      if (!['original', 'translation', 'rewrite'].includes(value)) throw new Error('Phiên bản mặc định không hợp lệ');
    } else if (key === 'customFont') {
      if (typeof value !== 'string' || value.length > 100) throw new Error('Tên phông tự chọn tối đa 100 ký tự');
    } else if (['fontSize', 'lineHeight', 'textWidth'].includes(key)) {
      const ranges = { fontSize: [14, 32], lineHeight: [1.5, 2.4], textWidth: [28, 44] };
      const [min, max] = ranges[key];
      if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`${key} ngoài khoảng cho phép`);
    } else continue;
    result[key] = value;
  }
  return result;
}
