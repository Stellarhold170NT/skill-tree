import { FONTS, TEXT_WIDTHS, THEMES, READING_DEFAULTS } from '../reading-settings.js';
import { Monitor } from 'lucide-react';

/** Shared controls for the quick popover and the full plugin settings page. */
export function ReadingControls({ settings, onChange, variant = 'compact' }) {
  const set = (patch) => onChange(patch);
  const page = variant === 'page';
  return (
    <>
      <div className="qrs-reading-settings-fields">
        <label className="qrs-reading-setting">
          <span>Phông chữ</span>
          <select value={settings.readingFont} onChange={(event) => set({ readingFont: event.target.value })}>
            {Object.entries(FONTS).map(([value, font]) => <option key={value} value={value}>{font.label}</option>)}
          </select>
        </label>
        {settings.readingFont === 'custom' && (
          <label className="qrs-reading-setting">
            <span>Tên phông</span>
            <input aria-label="Tên phông tự chọn" value={settings.customFont ?? ''} placeholder="Ví dụ LXGW WenKai"
              onChange={(event) => set({ customFont: event.target.value })} />
          </label>
        )}
        <label className="qrs-reading-setting">
          <span>Cỡ chữ</span>
          <output>{settings.fontSize} px</output>
          <input type="range" min="14" max="32" step="1" value={settings.fontSize}
            onChange={(event) => set({ fontSize: Number(event.target.value) })} />
        </label>
        <label className="qrs-reading-setting">
          <span>Giãn dòng</span>
          <output>{settings.lineHeight.toFixed(1)}x</output>
          <input type="range" min="1.5" max="2.4" step="0.1" value={settings.lineHeight}
            onChange={(event) => set({ lineHeight: Number(event.target.value) })} />
        </label>
        <div className="qrs-reading-setting">
          <span>Độ rộng cột</span>
          {page ? <div className="qrs-segmented qrs-width-options" role="group" aria-label="Độ rộng cột">{TEXT_WIDTHS.map((width) => <button key={width.value} type="button" aria-pressed={settings.textWidth === width.value} onClick={() => set({ textWidth: width.value })}>{width.value}</button>)}</div> :
            <select aria-label="Độ rộng cột" value={settings.textWidth} onChange={(event) => set({ textWidth: Number(event.target.value) })}>{TEXT_WIDTHS.map((width) => <option key={width.value} value={width.value}>{width.label}</option>)}</select>}
        </div>
        <div className="qrs-reading-setting qrs-theme-setting">
          <span>Chủ đề đọc</span>
          {page ? <div className="qrs-theme-options" role="group" aria-label="Chủ đề đọc">{[['auto','Theo ứng dụng'],['light','Sáng'],['paper','Giấy'],['sage','Xanh lục'],['mist','Xanh mờ'],['dark','Tối'],['black','Đen']].map(([value,label]) => <button key={value} type="button" aria-pressed={settings.readingTheme === value} onClick={() => set({ readingTheme:value })}><span className={`qrs-theme-swatch${value === 'auto' ? ' qrs-theme-swatch-auto' : ''}`} style={value === 'auto' ? undefined : { background: THEMES[value][0], color: THEMES[value][1] }}>{value === 'auto' ? <Monitor size={20} strokeWidth={1.6} /> : 'Aa'}</span><span>{label}</span></button>)}</div> :
            <select aria-label="Chủ đề đọc" value={settings.readingTheme} onChange={(event) => set({ readingTheme: event.target.value })}>{[['auto','Theo ứng dụng'],['light','Sáng'],['paper','Giấy'],['sage','Xanh lục'],['mist','Xanh mờ'],['dark','Tối'],['black','Đen']].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select>}
        </div>
        <div className="qrs-reading-setting">
          <span>Phiên bản mặc định</span>
          {page ? <div className="qrs-segmented" role="group" aria-label="Phiên bản mặc định">{[['original','Bản gốc'],['translation','Bản dịch'],['rewrite','Giải thích AI']].map(([value,label]) => <button key={value} type="button" aria-pressed={settings.defaultVersion === value} onClick={() => set({ defaultVersion:value })}>{label}</button>)}</div> :
            <select aria-label="Phiên bản mặc định" value={settings.defaultVersion} onChange={(event) => set({ defaultVersion: event.target.value })}><option value="original">Bản gốc</option><option value="translation">Bản dịch</option><option value="rewrite">Giải thích AI</option></select>}
        </div>
        <div className="qrs-reading-setting qrs-reading-setting-check">
          <span>Ảnh trong bài</span>
          {page ? <label className="qrs-switch"><input type="checkbox" aria-label="Ảnh trong bài" checked={settings.showImages !== false} onChange={(event) => set({ showImages: event.target.checked })} /><span aria-hidden="true" /></label> :
            <input type="checkbox" aria-label="Ảnh trong bài" checked={settings.showImages !== false} onChange={(event) => set({ showImages: event.target.checked })} />}
        </div>
      </div>
      <button type="button" className="qrs-reading-reset"
        onClick={() => set({ ...READING_DEFAULTS })}>
        Khôi phục mặc định
      </button>
    </>
  );
}

/** Compact reader-toolbar popover. */
export function ReadingAppearance({ settings, onChange, onClose }) {
  return <div className="qrs-reading-settings" role="dialog" aria-label="Cài đặt đọc">
    <div className="qrs-reading-settings-head"><strong>Cài đặt đọc</strong><button type="button" onClick={onClose}>Xong</button></div>
    <ReadingControls settings={settings} onChange={onChange} />
  </div>;
}
