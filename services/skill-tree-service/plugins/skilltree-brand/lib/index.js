/**
 * skilltree-brand — host-only rebrand via `webServer.tapIndex`.
 *
 * Co che giong vai-branding-plugin (da chung minh trong deployment nay):
 * chen 1 <style> + 1 <script> vao truoc </head> cua moi index.html.
 * KHONG co client half (client-modules registry khong phuc vu bundle cho
 * plugin file-path — /plugins/<pkg>/client.js tra 404), KHONG can mirror
 * design-platform.css: ramp mau sinh dong tu primaryColor trong config.
 *
 * Cau hinh: brand.config.json (doc lai moi request — sua + F5 la thay).
 * Assets  : assets/logo.svg (sidebar mo) + assets/icon.svg (rail, hero, favicon).
 */
import { readFileSync, existsSync, mkdirSync, openSync, appendFileSync, closeSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const name = 'skilltree-brand'
export const inject = ['webServer']

const PLUGIN_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const DEFAULT_CONFIG = {
  brandName: 'SkillTree',
  theme: {
    primaryColor: '#27A95F',   // xanh la chu dao (lay tu resources/logo.svg)
    brandPrimaryInvert: '#FFFFFF',
    boot: '#167F4D',
  },
  ui: {
    logoSelectors: ['[class*="brandMark"] svg'],
    railMarkSelectors: ['[class*="railMark"] svg'],
    wordmarkSelectors: ['[class*="brandName"]:not([class*="fallback"]):not([class*="localBuild"])'],
    bootWordmarkSelectors: ['[data-dsh-boot] [class*="wordmark"]'],
    logoWidth: '120px', logoHeight: '26px',
    railIconWidth: '26px', railIconHeight: '26px',
    heroIconWidth: '34px', heroIconHeight: '30px',
    heroTitle: 'Hoc vung chac — SkillTree',
    heroTitleFontSize: '26px', heroTitleLineHeight: '32px',
    wordmarkFontSize: '15px', bootWordmarkFontSize: '16px',
    hideBuildVersion: true,
  },
  browser: { replaceTitle: true, setFavicon: true, titleFormat: 'suffix', titleSeparator: ' — ' },
}

/* ---- config (deep-merge nhe) ---- */
function merge(base, over) {
  if (over === null || typeof over !== 'object') return base
  const out = Array.isArray(base) ? base.slice() : { ...base }
  for (const k of Object.keys(over)) {
    out[k] = (base?.[k] !== null && typeof base[k] === 'object' && over[k] !== null && typeof over[k] === 'object')
      ? merge(base[k], over[k]) : over[k]
  }
  return out
}

function loadConfig() {
  try {
    const raw = readFileSync(join(PLUGIN_DIR, 'brand.config.json'), 'utf8').replace(/^\uFEFF/, '')
    return merge(DEFAULT_CONFIG, JSON.parse(raw))
  } catch (err) {
    console.warn('[skilltree-brand] brand.config.json doc loi, dung default:', err.message)
    return structuredClone(DEFAULT_CONFIG)
  }
}

/* ---- mau sac: ramp tu primaryColor (cung cong thuc mix voi theme API) ---- */
const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)))
function parse(hex) {
  let h = String(hex).trim().replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  return { r: parseInt(h.slice(0, 2), 16) || 0, g: parseInt(h.slice(2, 4), 16) || 0, b: parseInt(h.slice(4, 6), 16) || 0 }
}
const rgb = (c) => `rgb(${clamp(c.r)}, ${clamp(c.g)}, ${clamp(c.b)})`
const mixTo = (hex, target, t) => {
  const a = parse(hex); const b = parse(target)
  return rgb({ r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t })
}

function brandTokens(theme) {
  const p = theme.primaryColor || DEFAULT_CONFIG.theme.primaryColor
  const ramp = {
    50: mixTo(p, '#ffffff', 0.95), 100: mixTo(p, '#ffffff', 0.88),
    200: mixTo(p, '#ffffff', 0.74), 300: mixTo(p, '#ffffff', 0.55),
    400: mixTo(p, '#ffffff', 0.28), 450: mixTo(p, '#ffffff', 0.12),
    500: rgb(parse(p)), 600: mixTo(p, '#000000', 0.16),
    800: mixTo(p, '#000000', 0.48), 900: mixTo(p, '#000000', 0.64),
  }
  const tokens = {}
  for (const [k, v] of Object.entries(ramp)) tokens[`--dsw-static-deepseek-${k}`] = v
  tokens['--dsw-alias-brand-primary-new-colorprimary-new-color'] = ramp[450]
  tokens['--dsw-alias-brand-primary'] = ramp[500]
  tokens['--dsw-alias-brand-primary-invert'] = theme.brandPrimaryInvert || '#FFFFFF'
  tokens['--dsw-alias-brand-text'] = ramp[500]
  tokens['--dsh-boot-brand'] = theme.boot || p
  return tokens
}

/* ---- assets -> data URI ---- */
function dataUri(file) {
  try {
    const p = join(PLUGIN_DIR, 'assets', file)
    if (existsSync(p)) return `data:image/svg+xml;base64,${Buffer.from(readFileSync(p)).toString('base64')}`
  } catch { /* bo qua */ }
  return ''
}

/* ---- CSS ---- */
const markRules = (sels, uri, w, h, darkUri) => `${sels.join(',\n')} {
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
${darkUri ? `/* Dark mode: chu trang de thay tren nen toi */
[data-ds-dark-theme] ${sels.join(', [data-ds-dark-theme] ')},
[data-theme="dark"] ${sels.join(', [data-theme="dark"] ')} {
  background-image: url('${darkUri}') !important;
}
` : ''}`

const heroRules = (ui, iconUri) => `
${iconUri ? `[data-slot="conversation.hero.brand.mark"] svg {
  display: inline-block !important;
  box-sizing: content-box !important;
  width: ${ui.heroIconWidth || '34px'} !important;
  height: ${ui.heroIconHeight || '30px'} !important;
  background-image: url('${iconUri}') !important;
  background-repeat: no-repeat !important;
  background-position: center !important;
  background-size: contain !important;
}
[data-slot="conversation.hero.brand.mark"] svg > * {
  display: none !important;
}
` : ''}${ui.heroTitle ? `[class*="titleGroup"] > span:not([class]) {
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

const bootWordmarkRules = (ui, varName) => {
  const sels = ui.bootWordmarkSelectors
  return `${sels.join(',\n')} {
  font-size: 0 !important;
  color: transparent !important;
}
${sels.map((s) => `${s}::after`).join(',\n')} {
  content: var(${varName});
  font-size: ${ui.bootWordmarkFontSize || '16px'};
  line-height: 24px;
  font-weight: 600;
  letter-spacing: 0.08em;
}
`
}

function generateCss(cfg) {
  const ui = cfg.ui
  const varName = '--st-wm'
  const logoUri = dataUri('logo.svg')
  const logoDarkUri = dataUri('logo-dark.svg')
  const iconUri = dataUri('icon.svg')
  if (!logoUri) console.warn('[skilltree-brand] WARNING: thieu assets/logo.svg — bo qua logo swap')

  const tokenBlock = Object.entries(brandTokens(cfg.theme))
    .map(([k, v]) => `  ${k}: ${v} !important;`).join('\n')

  return `
/* ================= skilltree-brand (xanh la #27A95F) ================= */
:root, html, body, [data-theme], [data-ds-dark-theme], [data-dsh-boot] {
  ${varName}: ${JSON.stringify(cfg.brandName)};
${tokenBlock}
}

/* Logo sidebar mo (dark mode dung ban chu trang) + rail thu gop + hero */
${logoUri ? markRules(ui.logoSelectors, logoUri, ui.logoWidth, ui.logoHeight, logoDarkUri) : ''}
${iconUri ? markRules(ui.railMarkSelectors, iconUri, ui.railIconWidth, ui.railIconHeight) : ''}
${heroRules(ui, iconUri)}
/* Hero mark: logo SkillTree thay svg mac dinh (review 2026-11-01) */
[data-slot="conversation.hero.brand.mark"] svg {
    display: inline-block !important;
    box-sizing: content-box !important;
    width: 34px !important;
    height: 30px !important;
    margin-top: -8px !important;
    background-image: url(data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSI2MzYgMTMxMyA0ODQgNTIzIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4bWw6c3BhY2U9InByZXNlcnZlIiBvdmVyZmxvdz0iaGlkZGVuIj48cGF0aCBkPSJNLTIuODA1NzUgMzcwLjQ5NUMtMS45ODc5MyAzNjkuMzM3LTEuMzM3OTQgMzY4LjM0NC0wLjE3NjczMSAzNjcuNSA1Ljg1NzYyIDM2My4wODkgMTMuMzk0MiAzNTkuNjcyIDE5Ljg5NDQgMzU1Ljg5NUw2MS40MDM2IDMzMS4zMDIgMTk0Ljg3OCAyNTEuNjEyQzIwMy45NjUgMjQ2LjMwMyAyMTIuOTEyIDI0MC43NzQgMjIxLjczMyAyMzUuMDE5IDIyNy4yMzcgMjMxLjQyOSAyMzMuMTk2IDIyNi41NSAyMzkuMTMyIDIyMy44NjggMjM5LjA3NyAxNDguMTEgMjM4LjE5MSA3Mi4yNDM5IDIzOS4xOTQtMy41MDUyNyAyMjguMzU4IDYuMTY3NzIgMjEyLjgwMiAxMi43NDM4IDIwMC4zNjcgMjAuNDIyNyAxOTcuODgxIDI1LjY3NzggMTUuMzIzMSAxMjQuODA4LTEuMzU2NjIgMTM1LjEwNi0yLjU4MDY5IDE1Ny44NjItMS43Mzk0MyAxODEuMDMxLTEuNjU4NzggMjAzLjg0MUwtMS41Mzg2OSAzMDkuMjc0Qy0xLjUwMDE0IDMyNC43ODkgMC43NTA4MSAzNTYuOTA0LTIuODA1NzUgMzcwLjQ5NVoiIGZpbGw9IiM1NkM5NzQiIGZpbGwtcnVsZT0iZXZlbm9kZCIgdHJhbnNmb3JtPSJtYXRyaXgoMSAwIDAgLTEgNjM5IDE4MzApIi8+PHBhdGggZD0iTTI0MC40MjYgMzY5LjQ5OEMyMzguOTEgMzQzLjI0MiAyNDAuMjQ2IDMxNi4zMzEgMjQwLjI0NiAyODkuOTg4TDI0MC4yOTQgMTM5LjA3N0MyMjQuMjAzIDEyOC45NTcgMjA3LjU3MiAxMTkuNzQ4IDE5MS4yIDExMC4wN0wxMjQuODUgNzAuMjY4M0M5NS42IDUzLjA4OTIgNjYuMTYyNyAzNi40MDEgMzcuMzgxOCAxOC40MDMxIDI0LjQ1NzQgMTEuMzc3IDExLjk3MSAyLjk4NjItMS4xNzIzOC0zLjUwMTk4TC0zLjA5NTc0LTEuNDUwOThDLTQuMTA0MjQgNzQuMjUzMy0zLjIxMzA5IDE1MC4wOS0zLjE1ODI3IDIyNS44MDJMLTIuNDcwMTMgMjI2LjQ1N0MxNS40NTAyIDIzNy40MzcgMzMuOTcyOCAyNDcuNDM0IDUyLjA1NzYgMjU4LjE2NCA4OS44ODQ1IDI4MS4wMDUgMTI3Ljg2OCAzMDMuNTczIDE2Ni4wMDggMzI1Ljg3NSAxOTAuMzU1IDM0MC4wNTIgMjE4LjEyIDM1Mi40NzUgMjQwLjQyNiAzNjkuNDk4WiIgZmlsbD0iIzI3QTk1RiIgZmlsbC1ydWxlPSJldmVub2RkIiB0cmFuc2Zvcm09Im1hdHJpeCgxIDAgMCAtMSA4ODAgMTgzMikiLz48cGF0aCBkPSJNLTIuNzkwMzUgMTQyLjgxMUMtMi41NDk2MSAxNDMuMzI1LTIuNDAzOTEgMTQzLjktMi4wNjcyMiAxNDQuMzYyLTAuMzY1NDE0IDE0Ni42OTcgMjI3LjIyMyAyODQuMDU4IDIzOC45OTkgMjg4LjE2MiAyNjUuODIyIDI3My42MDQgNDc1LjE5NiAxNTAuNzA1IDQ4MC45OCAxNDIuNjcyIDQ4MS41NjQgMTQxLjg3IDQ4MS44IDE0MC44NiA0ODIuMjEgMTM5Ljk0NSA0NTkuOTE0IDEyMi45MiA0MzIuMTc1IDExMC40NzkgNDA3Ljg0NyA5Ni4zMDM4IDM2OS43MzcgNzMuOTgyMyAzMzEuNzc1IDUxLjM5OTMgMjkzLjk4OCAyOC41NDY2IDI3NS45MTQgMTcuODEyNSAyNTcuNDEzIDcuODAxODQgMjM5LjQ5Ni0zLjE4NDU2TDIzOC44MDctMy44Mzc5MkMyMzIuODg0LTEuMTU0NjkgMjI2LjkzNiAzLjcyNDM0IDIyMS40MzEgNy4zMTQxMSAyMTIuNjMgMTMuMDY0MiAyMDMuNjk4IDE4LjU5NjkgMTk0LjYxNyAyMy45MTEzTDYxLjMyODggMTAzLjYxMyAxOS44NzQyIDEyOC4yMDlDMTMuMzkwNiAxMzEuOTgxIDUuODYwODMgMTM1LjM5Ny0wLjE2NTgyOCAxMzkuODA1LTEuMzI0ODUgMTQwLjY1OS0xLjk3NDgzIDE0MS42NTItMi43OTAzNSAxNDIuODExWiIgZmlsbD0iIzE2N0Y0RCIgZmlsbC1ydWxlPSJldmVub2RkIiB0cmFuc2Zvcm09Im1hdHJpeCgxIDAgMCAtMSA2MzkgMTYwMikiLz48cGF0aCBkPSJNLTIuNDUyOTMgMTQyLjgxMUMtMi4yMTI1OCAxNDMuMzI1LTIuMDY3MTIgMTQzLjktMS43MzA5OCAxNDQuMzYyLTAuMDMxOTI5MiAxNDYuNjk3IDIyNy4xODggMjg0LjA1OCAyMzguOTQ0IDI4OC4xNjIgMjQwLjM1NSAxOTEuMDUyIDIzOC43NTIgOTMuOTE2MyAyMzkuNDQxLTMuMTg0NTZMMjM4Ljc1Mi0zLjgzNzkyQzIzMi44MzktMS4xNTQ2OSAyMjYuOSAzLjcyNDM0IDIyMS40MDUgNy4zMTQxMSAyMTIuNjE4IDEzLjA2NDIgMjAzLjcgMTguNTk2OSAxOTQuNjM0IDIzLjkxMTNMNjEuNTYxOSAxMDMuNjEzIDIwLjE3NDggMTI4LjIwOUMxMy43MDE1IDEzMS45ODEgNi4xODQyMSAxMzUuMzk3IDAuMTY3MzMzIDEzOS44MDUtMC45OTAxMDEgMTQwLjY1OS0xLjYzODc0IDE0MS42NTItMi40NTI5MyAxNDIuODExWiIgZmlsbD0iIzI3QTk1RiIgZmlsbC1ydWxlPSJldmVub2RkIiB0cmFuc2Zvcm09Im1hdHJpeCgxIDAgMCAtMSA2MzkgMTYwMikiLz48L3N2Zz4K) !important;
    background-repeat: no-repeat !important;
    background-position: center !important;
    background-size: contain !important;
}
/* ===== st-page design language (tu landing SkillTree; giu font DSH) ===== */
.st-page{background:transparent;color:inherit;}
.st-page h2{font-weight:300 !important;font-size:30px !important;letter-spacing:-.01em !important;line-height:1.15 !important;}
.st-page h3{font-weight:600 !important;font-size:17px !important;margin:0 0 8px !important;}
.st-page p{color:#8a8a96 !important;font-size:14px !important;line-height:1.55 !important;}
.st-page button{border-radius:999px !important;font-weight:600 !important;font-size:13.5px !important;transition:background .2s,border-color .2s !important;}
.st-page input,.st-page select,.st-page textarea{border-radius:10px !important;background:rgba(255,255,255,.045) !important;border:1px solid #1d1d22 !important;color:inherit !important;}
.st-page input:focus,.st-page select:focus,.st-page textarea:focus{outline:2px solid #56C97433 !important;outline-offset:1px !important;}
.st-intro{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(18px,3vw,44px);margin:6px 0 22px;}
.st-col{border-top:2px solid var(--c,#27A95F);padding-top:16px;}
.st-col h3{margin:0 0 8px !important;}
.st-col p{margin:0 !important;max-width:26em !important;}
@media(max-width:900px){.st-intro{grid-template-columns:1fr;}}

/* BrandName de trong: logo da chua ten, chi an phan local build/version con sot */
${ui.hideBuildVersion ? `[class*="brandName"] [class*="localBuild"], [class*="buildVersion"], [class*="localBuildTitle"] { display: none !important; }` : ''}
${bootWordmarkRules(ui, varName)}
`
}

/* ---- script: title + favicon (phan CSS khong lam duoc) ---- */
function generateScript(cfg) {
  const faviconUri = dataUri('icon.svg') || dataUri('logo.svg')
  const opts = {
    replaceTitle: cfg.browser.replaceTitle !== false,
    setFavicon: cfg.browser.setFavicon !== false && Boolean(faviconUri),
    faviconUri,
    titleFormat: cfg.browser.titleFormat === 'brand' ? 'brand' : 'suffix',
    sep: cfg.browser.titleSeparator || ' — ',
    brand: cfg.brandName,
  }
  const payload = JSON.stringify(opts).replaceAll('<', '\\u003c')
  return `(function(){try{var C=${payload};
function isBrand(s){return s===C.brand||s.indexOf(C.sep+C.brand)===s.length-(C.brand.length+C.sep.length);}
function fixTitle(){if(!C.replaceTitle)return;var s=document.title||'';if(isBrand(s))return;
var i=s.lastIndexOf(C.sep);document.title=(i>=0&&C.titleFormat==='suffix')?(s.slice(0,i)+C.sep+C.brand):C.brand;}
function fixFavicon(){if(!C.setFavicon)return;var l=document.querySelectorAll('link[rel~="icon"]');
for(var i=0;i<l.length;i++){l[i].setAttribute('href',C.faviconUri);l[i].setAttribute('type','image/svg+xml');}
if(l.length===0){var n=document.createElement('link');n.rel='icon';n.type='image/svg+xml';n.href=C.faviconUri;
(document.head||document.documentElement).appendChild(n);}}
fixTitle();fixFavicon();
if(window.MutationObserver){var t=document.querySelector('title');
if(t){var to=new MutationObserver(fixTitle);to.observe(t,{childList:true,characterData:true,subtree:true});}
var fo=new MutationObserver(fixFavicon);fo.observe(document.head,{childList:true,subtree:false});}
}catch(e){if(window.console)console.warn('[skilltree-brand]',e);}})();`
}

/* ---- file log (thu /app/data/logs truoc, roi thu muc plugins/) ---- */
function acquireLog() {
  for (const dir of [process.env.VAI_LOG_DIR, '/app/data/logs', join(PLUGIN_DIR, '..', 'logs')].filter(Boolean)) {
    try {
      mkdirSync(dir, { recursive: true })
      const file = join(dir, 'skilltree-brand.log')
      const fd = openSync(file, 'a')
      return { file, write(line) { try { appendFileSync(fd, line + '\n') } catch { /* dd day */ } } }
    } catch { /* read-only — thu cho khac */ }
  }
  return null
}

/** @param ctx - cordis host context (webServer da inject). */
export function apply(ctx) {
  const webServer = ctx.webServer ?? ctx.get?.('webServer')
  if (!webServer || typeof webServer.tapIndex !== 'function') {
    console.warn('[skilltree-brand] khong co webServer.tapIndex — plugin khong hoat dong')
    return
  }

  const log = acquireLog()
  let lastSig = ''

  ctx.effect(() => {
    return webServer.tapIndex((html) => {
      const cfg = loadConfig()
      const css = generateCss(cfg)
      const script = generateScript(cfg)
      const sig = `${cfg.brandName}|${css.length}|${script.length}`
      if (sig !== lastSig) {
        const line = `${new Date().toISOString()} inject brand=${cfg.brandName} cssBytes=${css.length} scriptBytes=${script.length}`
        console.log(`[skilltree-brand] ${line}`)
        log?.write(line)
        lastSig = sig
      }
      const styleTag = `\n<style id="skilltree-brand-theme">\n${css}\n</style>\n`
      const scriptTag = `\n<script id="skilltree-brand-boot">${script}</script>\n`
      let out = html.replace('</head>', `${scriptTag}${styleTag}</head>`)
      if (out === html) out = `${scriptTag}${styleTag}${html}`
      return out
    })
  }, 'skilltree-brand: tapIndex')

  console.log('[skilltree-brand] armed (tapIndex: CSS xanh #27A95F + logo + favicon/title)')
}
