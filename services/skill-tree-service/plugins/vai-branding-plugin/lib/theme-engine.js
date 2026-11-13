'use strict'

/**
 * vAiPlatform Theme Engine v2 — mirrors the entire DeepSeek Harness design
 * token surface so the whole UI rebrands by editing styles/design-platform.css
 * alone (no DeepSeek source edits, no rebuild). Token names and roles are
 * lifted from @deepseek-ai/dsh-client-ui-theme/src/styles/design-platform.css.
 *
 * Rebrand strategy (see WIKI): every DeepSeek-blue surface resolves through
 * one ramp — `--dsw-static-deepseek-50..-900` — plus a handful of literal
 * aliases. The plugin ships a verbatim copy of design-platform.css (in
 * styles/) that is injected last with !important, and THAT copy is the single
 * source of truth for colors. brand.config.json no longer carries any color
 * keys; logo/wordmark/title/favicon surfaces are still CSS/config-driven.
 */
const fs = require('node:fs')
const path = require('node:path')

/* ------------------------------------------------------------------ *
 * File logging (shared logs/ dir)                                     *
 * ------------------------------------------------------------------ */

/** Ghi log ra file? Trả false khi tắt file log (ghi console). */
let fileLogging = true

/**
 * Xin stream ghi log: thử lần lượt các vị trí mount chung (ghi được trong
 * bwrap), rồi chỗ của plugin. Trả null khi mọi nơi chỉ đọc.
 */
function acquireLogStream(baseDir) {
  const candidates = [
    process.env.VAI_LOG_DIR,
    '/app/data/logs',
    path.join(baseDir, '..', 'logs'),
    path.join(baseDir, 'logs')
  ].filter(Boolean)
  for (const dir of candidates) {
    try {
      fs.mkdirSync(dir, { recursive: true })
      const file = path.join(dir, 'vai-branding.log')
      const fd = fs.openSync(file, 'a')
      console.log(`[vai-branding] log file: ${file}`)
      return { fd, file }
    } catch { /* read-only — thử vị trí kế */ }
  }
  return null
}

/** Ghi log ra vị trí chung: console + file .log khi cấu hình bật. */
function logTo(stream, tag, entry) {
  const line = `${new Date().toISOString()} ${tag} ${JSON.stringify(entry)}`
  console.log(`[vai-branding] ${line}`)
  if (fileLogging && stream) {
    try { fs.writeSync(stream.fd, line + '\n') } catch { /* đĩa đầy — bỏ */ }
  }
}

/* ------------------------------------------------------------------ *
 * Config loading (backward compatible with the original schema)       *
 * ------------------------------------------------------------------ */

const DEFAULT_CONFIG = {
  brandName: 'vAiPlatform',
  debug: false,
  assets: { logo: 'logo.svg', favicon: 'icon.svg', heroIcon: 'icon.svg', railIcon: 'icon.svg' },
  ui: {
    hideOriginalBrandWordmark: true,
    logoSelectors: ['[class*="brandMark"] svg'],
    railMarkSelectors: ['[class*="railMark"] svg'],
    wordmarkSelectors: ['[class*="brandName"]:not([class*="fallback"]):not([class*="localBuild"])'],
    bootWordmarkSelectors: ['[data-dsh-boot] [class*="wordmark"]'],
    logoWidth: '120px',
    logoHeight: '26px',
    heroLogoWidth: '220px',
    heroLogoHeight: '54px',
    heroTitle: 'Shaping the Invisible',
    heroIconWidth: '34px',
    heroIconHeight: '28px',
    railIconWidth: '26px',
    railIconHeight: '26px',
    heroTitleFontSize: '26px',
    heroTitleLineHeight: '32px',
    wordmarkFontSize: '15px',
    bootWordmarkFontSize: '16px',
    hideBuildVersion: true,
    stylePrimaryButtons: true
  },
  browser: { replaceTitle: true, setFavicon: true, rewriteBootWordmark: true, titleFormat: 'suffix', titleSeparator: ' — ' },
  logging: { file: true, requests: true }
}

function loadBrandConfig(pluginDir) {
  const configPath = path.join(pluginDir, 'brand.config.json')
  try {
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf8').replace(/^\uFEFF/, '')
      const parsed = JSON.parse(raw)
      return mergeConfig(DEFAULT_CONFIG, parsed)
    }
  } catch (err) {
    console.error('[vai-branding] Error loading brand.config.json:', err.message)
  }
  return structuredClone(DEFAULT_CONFIG)
}

/** Deep-merge user overrides onto defaults; arrays/objects nest, scalars win. */
function mergeConfig(base, override) {
  if (override === null || typeof override !== 'object') return base
  const out = Array.isArray(base) ? base.slice() : { ...base }
  for (const key of Object.keys(override)) {
    const b = base[key]
    const o = override[key]
    out[key] = b !== null && typeof b === 'object' && o !== null && typeof o === 'object'
      ? mergeConfig(b, o)
      : o
  }
  return out
}

/* ------------------------------------------------------------------ *
 * Asset loading                                                       *
 * ------------------------------------------------------------------ */

function getLogoDataUri(pluginDir, logoFile) {
  try {
    const logoPath = path.join(pluginDir, 'assets', logoFile || 'logo.svg')
    if (fs.existsSync(logoPath)) {
      const raw = fs.readFileSync(logoPath, 'utf8')
      return `data:image/svg+xml;base64,${Buffer.from(raw).toString('base64')}`
    }
  } catch (_) { /* fall through to empty */ }
  return ''
}

/* ------------------------------------------------------------------ *
 * CSS generation                                                      *
 * ------------------------------------------------------------------ */

/**
 * Đọc bản sao design-platform.css của DSH đặt trong plugin
 * (styles/design-platform.css). Nội dung được chèn NGUYÊN VERBATIM vào cuối
 * stylesheet — nằm sau mọi rule khác nên cùng specificity luôn thắng, cho
 * phép sửa trực tiếp token/mã màu trong file đó rồi F5.
 * Đổi lại bản gốc từ:
 *   deepseek-harness-source/packages/client/ui-theme/src/styles/design-platform.css
 */
function getPlatformMirrorCss(pluginDir) {
  try {
    const mirrorPath = path.join(pluginDir, 'styles', 'design-platform.css')
    if (fs.existsSync(mirrorPath)) {
      const raw = fs.readFileSync(mirrorPath, 'utf8').trim()
      if (raw !== '') {
        // Mọi declaration thêm !important để file copy này LUÔN thắng (nó nằm
        // cuối stylesheet và là nguồn sự thật cho token màu — sửa tại đây, F5).
        const boosted = raw.replace(/([\s:])([^;{}!]+)(;)/g, (m, pre, val, semi) => (
          /!important/.test(val) ? m : `${pre}${val} !important${semi}`
        ))
        return `\n/* === styles/design-platform.css (BẢN SAO — SỬA MÃ MÀU TẠI ĐÂY) === */\n${boosted}\n`
      }
    }
  } catch (err) {
    console.warn('[vai-branding] read styles/design-platform.css failed:', err.message)
  }
  return ''
}

/**
 * Sinh rules thay logo. Selector mặc định bám đúng DOM thật của DSH
 * (SidebarRoot.tsx): `.brandMark` và `.railMark` bọc FishLogo svg.
 * - brandMark (sidebar mở) → assets.logo, cấu hình qua ui.logoSelectors.
 * - railMark (sidebar thu gọn/collapse) → assets.railIcon, cấu hình qua
 *   ui.railMarkSelectors; mặc định dùng icon.svg.
 */
function buildLogoRules(ui, logoUri, railUri) {
  const selectors = Array.isArray(ui.logoSelectors) && ui.logoSelectors.length > 0
    ? ui.logoSelectors
    : ['[class*="brandMark"] svg']
  const railSelectors = Array.isArray(ui.railMarkSelectors) && ui.railMarkSelectors.length > 0
    ? ui.railMarkSelectors
    : ['[class*="railMark"] svg']
  const group = (sels, uri, w, h) => `${sels.join(',\n')} {
  display: inline-block !important;
  box-sizing: border-box !important;
  width: ${w} !important;
  height: ${h} !important;
  background-image: url('${uri}') !important;
  background-repeat: no-repeat !important;
  background-position: center left !important;
  background-size: contain !important;
}
${sels.map((s) => `${s} > *`).join(',\n')} {
  display: none !important;
}
`
  let css = ''
  if (logoUri) css += group(selectors, logoUri, ui.logoWidth || '120px', ui.logoHeight || '26px')
  if (railUri) css += group(railSelectors, railUri, ui.railIconWidth || '26px', ui.railIconHeight || '26px')
  return css
}

/**
 * Sinh rules thay wordmark bằng tên thương hiệu. Selector cấu hình qua
 * `ui.wordmarkSelectors` (mặc định bám DOM thật SidebarRoot của DSH).
 */
function buildWordmarkRules(ui) {
  const selectors = Array.isArray(ui.wordmarkSelectors) && ui.wordmarkSelectors.length > 0
    ? ui.wordmarkSelectors
    : ['[class*="brandName"]:not([class*="fallback"]):not([class*="localBuild"])']
  return `${selectors.join(',\n')} {
  display: inline-flex !important;
  align-items: center !important;
  font-weight: 600 !important;
  letter-spacing: 0.01em !important;
  text-decoration: none !important;
}
${selectors.map((s) => `${s} svg`).join(',\n')},
${selectors.map((s) => `${s} ~ [class*="BrandWordmark"]`).join(',\n')} {
  display: none !important;
}
${selectors.map((s) => `${s}::after`).join(',\n')} {
  content: var(--vai-wm);
  font-size: ${ui.wordmarkFontSize || '15px'};
  line-height: 1;
  color: var(--dsw-alias-label-primary, currentColor) !important;
}
[class*="BrandWordmark"],
[class*="brandWordmark"],
[class*="BrandName"][data-legacy],
[data-testid="brand-name"] {
  display: none !important;
}
`
}

/**
 * Sinh rules cho màn hình hero/welcome:
 * - Icon cá DeepSeek ([data-slot="conversation.hero.brand.mark"] svg) → icon
 *   thương hiệu (assets.heroIcon), kỹ thuật giống buildLogoRules.
 * - Tiêu đề tĩnh ("Into the Unknown") → text mới qua font-size:0 + ::after.
 *   Span tiêu đề là span DUY NHẤT không có class trong .titleGroup (span còn
 *   lại là .previewBadge có class) nên selector `span:not([class])` bám đúng.
 *   Font gốc lấy từ HeroShell.module.css: 26px/32px weight 500.
 */
function buildHeroRules(ui, iconUri) {
  const iconRules = `${iconUri ? `[data-slot="conversation.hero.brand.mark"] svg {
  display: inline-block !important;
  box-sizing: content-box !important;
  width: ${ui.heroIconWidth || '34px'} !important;
  height: ${ui.heroIconHeight || '28px'} !important;
  background-image: url('${iconUri}') !important;
  background-repeat: no-repeat !important;
  background-position: center !important;
  background-size: contain !important;
}
[data-slot="conversation.hero.brand.mark"] svg > * {
  display: none !important;
}
` : ''}`
  const titleRules = `${ui.heroTitle ? `[class*="titleGroup"] > span:not([class]) {
  font-size: 0 !important;
}
[class*="titleGroup"] > span:not([class])::after {
  content: ${JSON.stringify(ui.heroTitle)};
  font-size: ${ui.heroTitleFontSize || '26px'};
  line-height: ${ui.heroTitleLineHeight || '32px'};
  font-weight: 500;
  white-space: pre-wrap;
}
` : ''}`
  return `${iconRules}${titleRules}`
}

/**
 * Sinh rules viết lại wordmark màn hình boot (text tĩnh 'HARNESS').
 * Selector cấu hình qua `ui.bootWordmarkSelectors`.
 */
function buildBootWordmarkRules(ui) {
  const selectors = Array.isArray(ui.bootWordmarkSelectors) && ui.bootWordmarkSelectors.length > 0
    ? ui.bootWordmarkSelectors
    : ['[data-dsh-boot] [class*="wordmark"]']
  return `${selectors.join(',\n')} {
  font-size: 0 !important;
  color: transparent !important;
}
${selectors.map((s) => `${s}::after`).join(',\n')} {
  content: var(--vai-wm);
  font-size: ${ui.bootWordmarkFontSize || '16px'};
  line-height: 24px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--dsw-alias-label-primary, var(--dsh-boot-label-primary)) !important;
}
`
}

/**
 * Build the complete injected stylesheet. The rules are grouped:
 *   A. Wordmark text variable (--vai-wm).
 *   B. Logo, wordmark and boot surfaces.
 *   C. Full token mirror — the verbatim copy of design-platform.css in
 *      styles/ (boosted with !important). This copy is the SINGLE source of
 *      truth for colors: edit token values there, press F5, done.
 *   D. Raw passthrough from config `css`.
 * brand.config.json carries no color keys anymore.
 */
function generateThemeCss(pluginDir) {
  const cfg = loadBrandConfig(pluginDir)
  const ui = cfg.ui
  const logoUri = getLogoDataUri(pluginDir, cfg.assets.logo)
  if (!logoUri) console.warn(`[vai-branding] WARNING: assets/${cfg.assets.logo} not found — logo swap rules skipped`)
  const railUri = getLogoDataUri(pluginDir, cfg.assets.railIcon)
  if (!railUri) console.warn(`[vai-branding] WARNING: assets/${cfg.assets.railIcon} not found — rail mark rules skipped`)
  const wmWord = JSON.stringify(cfg.brandName)

  const css = `
/* ================================================================== */
/* vAiPlatform Theme Engine v2.1 — DeepSeek design-token mirror       */
/* MÀU SẮC: không cấu hình trong brand.config.json nữa.               */
/* Sửa trực tiếp token/mã màu trong styles/design-platform.css.       */
/* ================================================================== */

/* A. Wordmark text variable (tên thương hiệu dùng cho ::after). */
:root, html, body, [data-theme], [data-ds-dark-theme] {
  --vai-wm: ${wmWord};
}

/* B1. Brand mark → vAiPlatform logo. Chỉ 2 bề mặt brand thật của DSH
   (.brandMark sidebar mở, .railMark sidebar thu gọn); danh sách selector
   cấu hình qua ui.logoSelectors — tránh selector trúng icon panel khác. */
${buildLogoRules(ui, logoUri, railUri)}

/* B1b. Hero (màn hình chào) — icon cá + tiêu đề "Into the Unknown" →
   icon thương hiệu (assets.heroIcon) + ui.heroTitle. */
${buildHeroRules(ui, getLogoDataUri(pluginDir, cfg.assets.heroIcon))}

/* B2. Wordmark → brand-name text. Selector cấu hình qua ui.wordmarkSelectors;
   /*    ẩn svg wordmark gốc và vẽ tên bằng ::after đọc biến --vai-wm.    */
${ui.hideOriginalBrandWordmark ? buildWordmarkRules(ui) : ''}

/* B2b. Ẩn buildVersion (VD "0.1.5-rc.2-449af19" cạnh brand) — tắt qua
   ui.hideBuildVersion: false nếu muốn giữ. */
${ui.hideBuildVersion ? `[class*="buildVersion"], [class*="localBuildTitle"] {
  display: none !important;
}
` : ''}

/* B3. Boot splash wordmark (static text 'HARNESS' on the loader page).
   Selector cấu hình qua ui.bootWordmarkSelectors. */
${cfg.browser.rewriteBootWordmark ? buildBootWordmarkRules(ui) : ''}

/* C. Full token mirror (nguồn sự thật cho màu) — bản sao design-platform.css
    của DSH đặt trong plugin (styles/design-platform.css). Mọi declaration
    được boost !important nên luôn thắng; sửa token/mã màu trực tiếp trong
    bản copy này rồi F5 là áp dụng. Copy lại từ ui-theme nguồn khi DSH nâng cấp. */
${getPlatformMirrorCss(pluginDir)}
/* D. Passthrough từ brand.config.json (nếu có). Lưu ý: khối C dùng
    !important nên muốn đè màu qua đây phải tự viết !important. */
${cfg.css ? stringifyCssBlock(cfg.css) : ''}
`
  return { css, cfg }
}

/** Render a { token: value } object as a `:root` variable block. */
function stringifyCssBlock(block) {
  if (typeof block === 'string') return block
  if (!block || typeof block !== 'object') return ''
  const decls = Object.entries(block)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n')
  return `:root {\n${decls}\n}`
}

/* ------------------------------------------------------------------ *
 * Client script generation                                            *
 * ------------------------------------------------------------------ */

/**
 * Zero-dependency browser script inject into <head>. It handles only what
 * CSS cannot: the live browser tab title (React-managed via
 * DocumentTitle) and the favicon (DSH ships none). In-app brand surfaces
 * stay CSS-driven to avoid fighting React reconciliation.
 */
function generateClientScript(cfg) {
  const brandName = cfg.brandName
  const logoUri = getLogoDataUri(cfg._dir, cfg.assets.favicon || cfg.assets.logo)
  const opts = {
    replaceTitle: cfg.browser.replaceTitle !== false,
    setFavicon: cfg.browser.setFavicon !== false && Boolean(logoUri),
    faviconUri: logoUri,
    // Định dạng tiêu đề tab: 'suffix' = "<session> — <brand>"; 'brand' = chỉ tên.
    titleFormat: cfg.browser.titleFormat === 'brand' ? 'brand' : 'suffix',
    sep: cfg.browser.titleSeparator || ' — '
  }
  // Build the script with the config inlined as JSON (no closing-tag chars).
  const payload = JSON.stringify({ brand: brandName, ...opts }).replaceAll('<', '\\u003c')
  return `(function(){try{var C=${payload};var SEP=C.sep;
function isBrand(s){return s===C.brand||s.indexOf(SEP+C.brand)===s.length-(C.brand.length+SEP.length);}
function fixTitle(){
  if(!C.replaceTitle)return;
  var s=document.title||'';
  if(isBrand(s))return;
  var i=s.lastIndexOf(SEP);
  document.title=(i>=0&&C.titleFormat==='suffix')?(s.slice(0,i)+SEP+C.brand):C.brand;
}
function fixFavicon(){
  if(!C.setFavicon)return;
  var links=document.querySelectorAll('link[rel~=\"icon\"]');
  if(links.length>0){
    for(var i=0;i<links.length;i++){
      links[i].setAttribute('href',C.faviconUri);
      links[i].setAttribute('type','image/svg+xml');
    }
    return;
  }
  var n=document.createElement('link');n.rel='icon';n.type='image/svg+xml';
  n.href=C.faviconUri;
  (document.head||document.documentElement).appendChild(n);
}
fixTitle();fixFavicon();
if(window.MutationObserver){
  var to=new MutationObserver(function(){fixTitle();});
  if(document.head){var t=document.querySelector('title');
    if(t)to.observe(t,{childList:true,characterData:true,subtree:true});}
  var fo=new MutationObserver(function(){fixFavicon();});
  if(document.head)fo.observe(document.head,{childList:true,subtree:false});
}
}catch(e){if(window.console)console.warn('[vai-branding]',e);}})();`
}

module.exports = {
  loadBrandConfig,
  generateThemeCss,
  generateClientScript,
  initLogging
}

/** Khởi tạo logger: trả về {log,file} cho bên gọi (xem initLogging bên trên). */
function initLogging(baseDir, logging) {
  fileLogging = logging === undefined ? true : (typeof logging === 'object' ? logging.file !== false : !!logging)
  const stream = fileLogging ? acquireLogStream(baseDir) : null
  return {
    file: stream === null ? null : stream.file,
    log(tag, entry) { logTo(stream, tag, entry) }
  }
}
