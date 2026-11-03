// patch-brand2.js — apply on the GIT CLONE (no VFS drift): mark css + st-page design css + heroTitle
const fs = require('fs');
const B = '/ws/services/skill-tree-service/plugins/skilltree-brand/';
const read = (p) => fs.readFileSync(B + p, 'utf8');
const write = (p, s) => fs.writeFileSync(B + p, s);

// config
const cfg = JSON.parse(read('brand.config.json'));
cfg.ui.heroTitle = 'SkillTree — Decode the invisible thread';
write('brand.config.json', JSON.stringify(cfg, null, 2) + '\n');

let s = read('lib/index.js');
const CSS = `
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
`;
if (!s.includes('.st-page{')) {
  const anchor = '${heroRules(ui, iconUri)}';
  if (!s.includes(anchor)) throw new Error('MISS: heroRules anchor');
  s = s.replace(anchor, anchor + CSS);
  write('lib/index.js', s);
}
console.log('brand OK:', JSON.parse(read('brand.config.json')).ui.heroTitle, '| mark:', read('lib/index.js').includes('conversation.hero.brand.mark'), '| st-page:', read('lib/index.js').includes('.st-page{'));
