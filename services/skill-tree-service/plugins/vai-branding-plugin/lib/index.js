'use strict'

const path = require('node:path')
const engine = require('./theme-engine')

const PLUGIN_DIR = path.resolve(__dirname, '..')

exports.name = 'vai-branding-plugin'
exports.inject = ['webServer']

exports.apply = function (ctx) {
  if (!ctx.webServer) return

  const boot = engine.loadBrandConfig(PLUGIN_DIR)
  const { log, file } = engine.initLogging(PLUGIN_DIR, boot.logging)

  // Ghi log t???ng l???n inject; ch??? nh???c l???i khi ch??? k?? ?????i ????? tr??nh spam.
  let lastSig = ''

  // 1. Hook index.html to inject the rebrand stylesheet + boot script.
  //    Brand.config.json is re-read on every index request, so editing the
  //    config and pressing F5 (no container/host restart) rebrands live.
  if (typeof ctx.webServer.tapIndex === 'function') {
    ctx.effect(() => {
      return ctx.webServer.tapIndex((html) => {
        const result = engine.generateThemeCss(PLUGIN_DIR)
        const cfg = result.cfg
        const script = engine.generateClientScript({ ...cfg, _dir: PLUGIN_DIR })

        const sig = `${cfg.brandName}|${result.css.length}|${script.length}`
        const requests = cfg.logging !== undefined ? (typeof cfg.logging === 'object' ? cfg.logging.requests !== false : !!cfg.logging) : true
        if (sig !== lastSig || requests) {
          log('inject', {
            changed: sig !== lastSig,
            brand: cfg.brandName,
            cssBytes: result.css.length,
            scriptBytes: script.length,
            logo: cfg.assets.logo
          })
          lastSig = sig
        }

        const styleTag = `\n<style id="vai-branding-theme">\n${result.css}\n</style>\n`
        const scriptTag = `\n<script id="vai-branding-boot">${script}</script>\n`

        // Inject the script first, then the style, both ahead of </head> so
        // they apply before the page's own scripts run.
        let out = html.replace('</head>', `${scriptTag}${styleTag}</head>`)
        // Fallback for documents without </head>: prepend to <html> body.
        if (out === html) out = `${scriptTag}${styleTag}${html}`
        return out
      })
    }, 'vai-branding-plugin: tapIndex')
  }

  // 2. REST API exposing the live brand config (for diagnostics/tools).
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/brand/config',
    handler: (req, res) => {
      if (req.method === 'GET') {
        const config = engine.loadBrandConfig(PLUGIN_DIR)
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify(config, null, 2))
        return
      }
      res.writeHead(405, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Method not allowed' }))
    }
  })

  log('init', {
    status: 'ready',
    version: '2.1.0',
    logFile: file,
    note: 'UI errors are browser-side; check browser console for mount failures'
  })
}
