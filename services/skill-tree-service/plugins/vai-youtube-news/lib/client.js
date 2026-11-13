window.__ModuleLoader__.load({
	id: "vai-youtube-news",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.jsx
var index_exports = {};
__export(index_exports, {
  PANEL_ID: () => PANEL_ID,
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);

// src/client/NativeConversation.jsx
function ChatView({ renderSlot }) {
  return renderSlot("conversation.session", { view: "chat" });
}
function NativeConversation({ sessionId, useSession, useConversation, useSessions, renderFactorySlot }) {
  const session = useSession((s) => s);
  const conversation = useConversation((s) => s);
  const blank = useSessions((s) => s.byId[sessionId]?.blank);
  const active = conversation.activeTargets.size > 0 || !session.blank && !session.awaitingFirstTurn || session.running;
  const settling = !active && session.openState === "loading" && blank !== true;
  const hero = !active && (session.openState === "open" || blank === true);
  return renderFactorySlot("conversation.content", { variant: "embedded", phase: settling ? "settling" : hero ? "hero" : "active", hero }, { slots: { views: ChatView } });
}

// src/client/native-chat.js
function nativeChatBridge(ctx) {
  let scope;
  const watchers = /* @__PURE__ */ new Set();
  ctx.inject(["sessions", "uiSession", "uiWorkspace"], (child) => {
    scope = child;
    for (const notify of watchers) notify();
    return () => {
      scope = void 0;
      for (const notify of watchers) notify();
    };
  });
  return {
    defaultChatWorkspace() {
      const items = scope?.uiWorkspace.workspaces.list.getSnapshot().items ?? [];
      const preferred = items.find((w) => w.title === "default-workspace" || /(?:^|\/)default-workspace$/.test(w.path || ""));
      return (preferred ?? items[0])?.workspaceId;
    },
    watchChatWorkspaces(listener) {
      watchers.add(listener);
      const unsubscribe = scope?.uiWorkspace.workspaces.list.subscribe(listener) ?? (() => {
      });
      return () => {
        watchers.delete(listener);
        unsubscribe();
      };
    },
    chatWorkspaces() {
      return scope?.uiWorkspace.workspaces.list.getSnapshot().items.map((w) => ({ id: w.workspaceId, name: w.title || w.name || w.path, path: w.path })) ?? [];
    },
    async openChat({ workspaceId, sessionId }) {
      if (!scope) throw new Error("D\u1ECBch v\u1EE5 h\u1ED9i tho\u1EA1i c\u1EE7a Harness ch\u01B0a s\u1EB5n s\xE0ng");
      const active = scope;
      if (!active.uiWorkspace.workspaces.list.getSnapshot().items.some((w) => w.workspaceId === workspaceId)) throw new Error("H\xE3y ch\u1ECDn m\u1ED9t workspace");
      const id = sessionId || await active.sessions.create({ workspaceId });
      const reference = active.sessions.retain(id, { source: "qiaomu-rss" });
      try {
        const source = active.uiSession.bindingSource(reference);
        if (typeof source.value.props.inputActions?.setDraft !== "function") throw new Error("Phi\xEAn b\u1EA3n Harness hi\u1EC7n t\u1EA1i kh\xF4ng h\u1ED7 tr\u1EE3 tr\u1EE3 l\xFD \u0111\u1ECDc");
        return {
          sessionId: id,
          reference,
          release: () => reference.release(),
          async sendPrompt(prompt) {
            const { input } = source.value.hooks ?? {};
            const actions = source.value.props.inputActions;
            if (typeof actions.submit !== "function" || typeof input?.getSnapshot !== "function" || typeof input?.subscribe !== "function") throw new Error("Phi\xEAn b\u1EA3n Harness hi\u1EC7n t\u1EA1i kh\xF4ng h\u1ED7 tr\u1EE3 g\u1EEDi nhanh");
            const state = input.getSnapshot();
            if (state.phase !== "plain") throw new Error("\xD4 nh\u1EADp \u0111ang x\u1EED l\xFD tin nh\u1EAFn, th\u1EED l\u1EA1i sau");
            if (state.attachmentIds?.length) throw new Error("\xD4 nh\u1EADp c\xF2n t\u1EC7p \u0111\xEDnh k\xE8m, h\xE3y x\u1EED l\xFD tr\u01B0\u1EDBc");
            if (state.draft.trim()) throw new Error("\xD4 nh\u1EADp \u0111ang c\xF3 b\u1EA3n nh\xE1p, h\xE3y g\u1EEDi ho\u1EB7c x\xF3a b\u1EA3n nh\xE1p tr\u01B0\u1EDBc");
            actions.setDraft(prompt);
            if (input.getSnapshot().draft !== prompt) await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                unsubscribe();
                reject(new Error("\u0110\xE3 \u0111\u01B0a l\u1EC7nh v\xE0o \xF4 nh\u1EADp, h\xE3y g\u1EEDi th\u1EE7 c\xF4ng"));
              }, 1200);
              const unsubscribe = input.subscribe(() => {
                if (input.getSnapshot().draft === prompt) {
                  clearTimeout(timeout);
                  unsubscribe();
                  resolve();
                }
              });
              if (input.getSnapshot().draft === prompt) {
                clearTimeout(timeout);
                unsubscribe();
                resolve();
              }
            });
            if (input.getSnapshot().phase !== "plain") throw new Error("\xD4 nh\u1EADp \u0111ang x\u1EED l\xFD tin nh\u1EAFn, th\u1EED l\u1EA1i sau");
            actions.submit();
          }
        };
      } catch (error) {
        reference.release();
        throw error;
      }
    }
  };
}

// src/client/ReaderPage.jsx
var import_react15 = require("react");

// src/host/sanitize.js
var VOID_TAGS = /* @__PURE__ */ new Set([
  "br",
  "hr",
  "img",
  "wbr",
  "input",
  "col",
  "source"
]);
var ALLOWED_TAGS = /* @__PURE__ */ new Set([
  "p",
  "br",
  "hr",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
  "code",
  "em",
  "i",
  "strong",
  "b",
  "u",
  "s",
  "del",
  "a",
  "img",
  "figure",
  "figcaption",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "sup",
  "sub",
  "small",
  "mark",
  "details",
  "summary",
  "span",
  "div",
  "abbr",
  "time",
  "kbd",
  "samp"
]);
var DROP_CONTENT_TAGS = /* @__PURE__ */ new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "noscript",
  "form",
  "textarea",
  "select",
  "button",
  "svg",
  "math",
  "template",
  "title",
  "head",
  "link",
  "meta",
  "base"
]);
var SAFE_URL_ATTRS = /* @__PURE__ */ new Set(["href", "src", "cite", "poster"]);
function decodeHtmlEntities(text) {
  if (!text.includes("&")) return text;
  const named = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    mdash: "\u2014",
    ndash: "\u2013",
    hellip: "\u2026",
    laquo: "\xAB",
    raquo: "\xBB",
    ldquo: "\u201C",
    rdquo: "\u201D",
    lsquo: "\u2018",
    rsquo: "\u2019",
    copy: "\xA9",
    reg: "\xAE",
    trade: "\u2122",
    middot: "\xB7",
    bull: "\u2022",
    times: "\xD7",
    deg: "\xB0"
  };
  return text.replace(/&(#[0-9]{1,7}|#x[0-9a-fA-F]{1,6}|[a-zA-Z][a-zA-Z0-9]{1,30});/g, (raw, body) => {
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code < 32 || code > 1114111 || code >= 55296 && code <= 57343) return raw;
      try {
        return String.fromCodePoint(code);
      } catch {
        return raw;
      }
    }
    return named[body.toLowerCase()] ?? raw;
  });
}
function escapeText(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr(value) {
  return escapeText(value).replace(/"/g, "&quot;");
}
function isSafeUrl(raw) {
  const value = raw.trim();
  if (value === "" || value.startsWith("#")) return true;
  if (/^(?:https?:|mailto:)/i.test(value)) return true;
  if (value.startsWith("/") || value.startsWith("./") || value.startsWith("../")) return true;
  return false;
}
function safeUrl(raw, baseUrl) {
  const value = raw.trim();
  if (!isSafeUrl(value)) return void 0;
  if (baseUrl) {
    try {
      return new URL(value, baseUrl).href;
    } catch {
      return void 0;
    }
  }
  return value;
}
function sanitizeHtml(html, options = {}) {
  const { baseUrl, maxLength = 4e5 } = options;
  let out = "";
  const stack = [];
  let i = 0;
  const n = html.length;
  let droppedDepth = 0;
  while (i < n && out.length < maxLength) {
    const lt = html.indexOf("<", i);
    if (lt === -1) {
      if (droppedDepth === 0) out += escapeText(decodeHtmlEntities(html.slice(i)));
      break;
    }
    if (lt > i && droppedDepth === 0) out += escapeText(decodeHtmlEntities(html.slice(i, lt)));
    if (html.startsWith("<!--", lt)) {
      const end = html.indexOf("-->", lt + 4);
      i = end === -1 ? n : end + 3;
      continue;
    }
    if (html.startsWith("<!", lt) || html.startsWith("<?", lt)) {
      const end = html.indexOf(">", lt);
      i = end === -1 ? n : end + 1;
      continue;
    }
    const gt = findTagEnd(html, lt);
    if (gt === -1) break;
    const source = html.slice(lt + 1, gt);
    i = gt + 1;
    if (source.startsWith("/")) {
      const name = source.slice(1).trim().toLowerCase();
      const openIdx = stack.lastIndexOf(name);
      if (openIdx !== -1) {
        while (stack.length > openIdx) {
          const closing = stack.pop();
          if (droppedDepth > 0) {
            if (closing === "__drop__") droppedDepth -= 1;
            else out += `</${closing}>`;
          } else {
            out += `</${closing}>`;
          }
        }
      }
      continue;
    }
    const selfClosing = source.endsWith("/");
    const header = selfClosing ? source.slice(0, -1) : source;
    const nameMatch = /^[^\s/>]+/.exec(header);
    if (!nameMatch) continue;
    const tag = nameMatch[0].toLowerCase();
    if (DROP_CONTENT_TAGS.has(tag)) {
      if (!selfClosing && !VOID_TAGS.has(tag)) droppedDepth += 1;
      continue;
    }
    if (!ALLOWED_TAGS.has(tag)) continue;
    const attrs = parseAttrs(header.slice(nameMatch[0].length));
    const rendered = [];
    for (const [key, value] of Object.entries(attrs)) {
      if (key.startsWith("on") || key === "style" || key === "class" && false) continue;
      if (!SAFE_URL_ATTRS.has(key)) {
        if (key === "alt" || key === "title" || key === "colspan" || key === "rowspan" || key === "datetime") {
          rendered.push(`${key}="${escapeAttr(value.slice(0, 300))}"`);
        }
        continue;
      }
      const url = safeUrl(decodeHtmlEntities(value), baseUrl);
      if (url !== void 0) rendered.push(`${key}="${escapeAttr(url)}"`);
    }
    const attrText = rendered.length > 0 ? ` ${rendered.join(" ")}` : "";
    if (tag === "img") {
      out += `<img${attrText} loading="lazy">`;
      continue;
    }
    if (VOID_TAGS.has(tag)) {
      out += `<${tag}>`;
      continue;
    }
    out += `<${tag}${attrText}>`;
    if (!selfClosing) stack.push(tag);
  }
  while (stack.length > 0) out += `</${stack.pop()}>`;
  return out.slice(0, maxLength);
}
function findTagEnd(source, from) {
  let quote = "";
  for (let i = from + 1; i < source.length; i += 1) {
    const ch = source[i];
    if (quote !== "") {
      if (ch === quote) quote = "";
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === ">") return i;
  }
  return -1;
}
var ATTR = /([^\s=/]+)\s*=\s*("([^"]*)"|'([^']*)')?/g;
function parseAttrs(header) {
  const attrs = {};
  ATTR.lastIndex = 0;
  let match;
  while ((match = ATTR.exec(header)) !== null) {
    attrs[match[1].toLowerCase()] = match[3] ?? match[4] ?? "";
  }
  return attrs;
}

// src/host/markdown.js
function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttrPart(value) {
  return value.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function inline(text) {
  let out = escapeHtml(text);
  const codes = [];
  out = out.replace(/`([^`]+)`/g, (_, code) => {
    codes.push(`<code>${code}</code>`);
    return `\0${codes.length - 1}\0`;
  });
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, alt, src) => `<img src="${escapeAttrPart(src)}" alt="${alt}" loading="lazy">`).replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, label, href) => {
    const safe = /^(?:https?:|mailto:|\/|#)/i.test(href) ? href : "#";
    return `<a href="${escapeAttrPart(safe)}" target="_blank" rel="noreferrer">${label}</a>`;
  }).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>").replace(/(^|[\s(])_([^_\s][^_]*)_/g, "$1<em>$2</em>").replace(/~~([^~]+)~~/g, "<del>$1</del>");
  return out.replace(/\u0000(\d+)\u0000/g, (_, index) => codes[Number(index)]);
}
function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let paragraph = [];
  let listType;
  let inQuote = false;
  let codeFence = false;
  let codeBuffer = [];
  const closeParagraph = () => {
    if (paragraph.length > 0) {
      out.push(`<p>${inline(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };
  const closeList = () => {
    if (listType !== void 0) {
      out.push(`</${listType}>`);
      listType = void 0;
    }
  };
  const closeQuote = () => {
    if (inQuote) {
      out.push("</blockquote>");
      inQuote = false;
    }
  };
  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, "");
    if (codeFence) {
      if (/^```/.test(line)) {
        out.push(`<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
        codeBuffer = [];
        codeFence = false;
      } else {
        codeBuffer.push(rawLine);
      }
      continue;
    }
    if (/^```/.test(line)) {
      closeParagraph();
      closeList();
      closeQuote();
      codeFence = true;
      continue;
    }
    if (line.trim() === "") {
      closeParagraph();
      closeList();
      closeQuote();
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      closeParagraph();
      closeList();
      closeQuote();
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }
    if (/^(?:-{3,}|\*{3,})$/.test(line.trim())) {
      closeParagraph();
      closeList();
      closeQuote();
      out.push("<hr>");
      continue;
    }
    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) {
      closeParagraph();
      closeList();
      if (!inQuote) {
        out.push("<blockquote>");
        inQuote = true;
      }
      out.push(`<p>${inline(quote[1])}</p>`);
      continue;
    }
    const ordered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const unordered = /^\s*[-*+]\s+(.*)$/.exec(line);
    if (ordered || unordered) {
      closeParagraph();
      closeQuote();
      const wanted = ordered ? "ol" : "ul";
      if (listType !== wanted) {
        closeList();
        out.push(`<${wanted}>`);
        listType = wanted;
      }
      out.push(`<li>${inline((ordered ?? unordered)[1])}</li>`);
      continue;
    }
    paragraph.push(line.trim());
  }
  if (codeFence && codeBuffer.length > 0) out.push(`<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
  closeParagraph();
  closeList();
  closeQuote();
  return out.join("\n");
}

// src/reading-settings.js
var READING_DEFAULTS = {
  readingTheme: "auto",
  readingFont: "serif",
  customFont: "",
  fontSize: 19,
  lineHeight: 1.9,
  textWidth: 36,
  defaultVersion: "rewrite",
  showImages: true
};
var THEMES = {
  auto: null,
  light: ["#ffffff", "#202124"],
  paper: ["#f5efdf", "#40382e"],
  sage: ["#e8eee3", "#29382c"],
  mist: ["#e7edf2", "#293741"],
  dark: ["#252525", "#dedede"],
  black: ["#090909", "#cccccc"]
};
var FONTS = {
  serif: { label: "Lora (m\u1EB7c \u0111\u1ECBnh)", family: 'Lora,"Times New Roman",Times,serif' },
  sans: { label: "Sans-serif", family: 'system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif' },
  sourceHanSerif: { label: "Source Han Serif (CJK)", family: '"Songti SC","Noto Serif CJK SC","Source Han Serif SC",serif' },
  sourceHanSans: { label: "Source Han Sans (CJK)", family: '"PingFang SC","Noto Sans CJK SC","Source Han Sans SC",sans-serif' },
  wenkai: { label: "LXGW WenKai", family: '"LXGW WenKai","Kaiti SC",serif' },
  zhenkai: { label: "Zhuque Fangsong", family: '"Zhuque Fangsong","Fangsong","STFangsong",serif' },
  custom: { label: "Ph\xF4ng c\u1EE7a m\xE1y", family: "serif" }
};
var TEXT_WIDTHS = [
  { value: 28, label: "H\u1EB9p \xB7 28 k\xFD t\u1EF1" },
  { value: 32, label: "H\u01A1i h\u1EB9p \xB7 32" },
  { value: 36, label: "V\u1EEBa \xB7 36" },
  { value: 40, label: "H\u01A1i r\u1ED9ng \xB7 40" },
  { value: 44, label: "R\u1ED9ng \xB7 44" }
];
function fontStack(settings) {
  if (settings.readingFont === "custom") {
    const name = String(settings.customFont ?? "").trim();
    return name ? `${JSON.stringify(name)},${FONTS.serif.family}` : FONTS.serif.family;
  }
  return (FONTS[settings.readingFont] ?? FONTS.serif).family;
}

// node_modules/lucide-react/dist/esm/createLucideIcon.js
var import_react2 = require("react");

// node_modules/lucide-react/dist/esm/shared/src/utils.js
var toKebabCase = (string) => string.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
var toCamelCase = (string) => string.replace(
  /^([A-Z])|[\s-_]+(\w)/g,
  (match, p1, p2) => p2 ? p2.toUpperCase() : p1.toLowerCase()
);
var toPascalCase = (string) => {
  const camelCase = toCamelCase(string);
  return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
};
var mergeClasses = (...classes) => classes.filter((className, index, array) => {
  return Boolean(className) && className.trim() !== "" && array.indexOf(className) === index;
}).join(" ").trim();
var hasA11yProp = (props) => {
  for (const prop in props) {
    if (prop.startsWith("aria-") || prop === "role" || prop === "title") {
      return true;
    }
  }
};

// node_modules/lucide-react/dist/esm/Icon.js
var import_react = require("react");

// node_modules/lucide-react/dist/esm/defaultAttributes.js
var defaultAttributes = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round"
};

// node_modules/lucide-react/dist/esm/Icon.js
var Icon = (0, import_react.forwardRef)(
  ({
    color = "currentColor",
    size = 24,
    strokeWidth = 2,
    absoluteStrokeWidth,
    className = "",
    children,
    iconNode,
    ...rest
  }, ref) => (0, import_react.createElement)(
    "svg",
    {
      ref,
      ...defaultAttributes,
      width: size,
      height: size,
      stroke: color,
      strokeWidth: absoluteStrokeWidth ? Number(strokeWidth) * 24 / Number(size) : strokeWidth,
      className: mergeClasses("lucide", className),
      ...!children && !hasA11yProp(rest) && { "aria-hidden": "true" },
      ...rest
    },
    [
      ...iconNode.map(([tag, attrs]) => (0, import_react.createElement)(tag, attrs)),
      ...Array.isArray(children) ? children : [children]
    ]
  )
);

// node_modules/lucide-react/dist/esm/createLucideIcon.js
var createLucideIcon = (iconName, iconNode) => {
  const Component2 = (0, import_react2.forwardRef)(
    ({ className, ...props }, ref) => (0, import_react2.createElement)(Icon, {
      ref,
      iconNode,
      className: mergeClasses(
        `lucide-${toKebabCase(toPascalCase(iconName))}`,
        `lucide-${iconName}`,
        className
      ),
      ...props
    })
  );
  Component2.displayName = toPascalCase(iconName);
  return Component2;
};

// node_modules/lucide-react/dist/esm/icons/arrow-up-right.js
var __iconNode = [
  ["path", { d: "M7 7h10v10", key: "1tivn9" }],
  ["path", { d: "M7 17 17 7", key: "1vkiza" }]
];
var ArrowUpRight = createLucideIcon("arrow-up-right", __iconNode);

// node_modules/lucide-react/dist/esm/icons/book-open.js
var __iconNode2 = [
  ["path", { d: "M12 7v14", key: "1akyts" }],
  [
    "path",
    {
      d: "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",
      key: "ruj8y"
    }
  ]
];
var BookOpen = createLucideIcon("book-open", __iconNode2);

// node_modules/lucide-react/dist/esm/icons/copy.js
var __iconNode3 = [
  ["rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2", key: "17jyea" }],
  ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2", key: "zix9uf" }]
];
var Copy = createLucideIcon("copy", __iconNode3);

// node_modules/lucide-react/dist/esm/icons/download.js
var __iconNode4 = [
  ["path", { d: "M12 15V3", key: "m9g1x1" }],
  ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", key: "ih7n3h" }],
  ["path", { d: "m7 10 5 5 5-5", key: "brsn70" }]
];
var Download = createLucideIcon("download", __iconNode4);

// node_modules/lucide-react/dist/esm/icons/external-link.js
var __iconNode5 = [
  ["path", { d: "M15 3h6v6", key: "1q9fwt" }],
  ["path", { d: "M10 14 21 3", key: "gplh6r" }],
  ["path", { d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6", key: "a6xqqp" }]
];
var ExternalLink = createLucideIcon("external-link", __iconNode5);

// node_modules/lucide-react/dist/esm/icons/folder.js
var __iconNode6 = [
  [
    "path",
    {
      d: "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z",
      key: "1kt360"
    }
  ]
];
var Folder = createLucideIcon("folder", __iconNode6);

// node_modules/lucide-react/dist/esm/icons/heart.js
var __iconNode7 = [
  [
    "path",
    {
      d: "M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5",
      key: "mvr1a0"
    }
  ]
];
var Heart = createLucideIcon("heart", __iconNode7);

// node_modules/lucide-react/dist/esm/icons/info.js
var __iconNode8 = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "M12 16v-4", key: "1dtifu" }],
  ["path", { d: "M12 8h.01", key: "e9boi3" }]
];
var Info = createLucideIcon("info", __iconNode8);

// node_modules/lucide-react/dist/esm/icons/layers.js
var __iconNode9 = [
  [
    "path",
    {
      d: "M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z",
      key: "zw3jo"
    }
  ],
  [
    "path",
    {
      d: "M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12",
      key: "1wduqc"
    }
  ],
  [
    "path",
    {
      d: "M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17",
      key: "kqbvx6"
    }
  ]
];
var Layers = createLucideIcon("layers", __iconNode9);

// node_modules/lucide-react/dist/esm/icons/link-2.js
var __iconNode10 = [
  ["path", { d: "M9 17H7A5 5 0 0 1 7 7h2", key: "8i5ue5" }],
  ["path", { d: "M15 7h2a5 5 0 1 1 0 10h-2", key: "1b9ql8" }],
  ["line", { x1: "8", x2: "16", y1: "12", y2: "12", key: "1jonct" }]
];
var Link2 = createLucideIcon("link-2", __iconNode10);

// node_modules/lucide-react/dist/esm/icons/monitor.js
var __iconNode11 = [
  ["rect", { width: "20", height: "14", x: "2", y: "3", rx: "2", key: "48i651" }],
  ["line", { x1: "8", x2: "16", y1: "21", y2: "21", key: "1svkeh" }],
  ["line", { x1: "12", x2: "12", y1: "17", y2: "21", key: "vw1qmm" }]
];
var Monitor = createLucideIcon("monitor", __iconNode11);

// node_modules/lucide-react/dist/esm/icons/pencil.js
var __iconNode12 = [
  [
    "path",
    {
      d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
      key: "1a8usu"
    }
  ],
  ["path", { d: "m15 5 4 4", key: "1mk7zo" }]
];
var Pencil = createLucideIcon("pencil", __iconNode12);

// node_modules/lucide-react/dist/esm/icons/plus.js
var __iconNode13 = [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "M12 5v14", key: "s699le" }]
];
var Plus = createLucideIcon("plus", __iconNode13);

// node_modules/lucide-react/dist/esm/icons/podcast.js
var __iconNode14 = [
  [
    "path",
    { d: "M13 17a1 1 0 1 0-2 0l.5 4.5a0.5 0.5 0 0 0 1 0z", fill: "currentColor", key: "x1mxqr" }
  ],
  ["path", { d: "M16.85 18.58a9 9 0 1 0-9.7 0", key: "d71mpg" }],
  ["path", { d: "M8 14a5 5 0 1 1 8 0", key: "fc81rn" }],
  ["circle", { cx: "12", cy: "11", r: "1", fill: "currentColor", key: "vqiwd" }]
];
var Podcast = createLucideIcon("podcast", __iconNode14);

// node_modules/lucide-react/dist/esm/icons/refresh-cw.js
var __iconNode15 = [
  ["path", { d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8", key: "v9h5vc" }],
  ["path", { d: "M21 3v5h-5", key: "1q7to0" }],
  ["path", { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16", key: "3uifl3" }],
  ["path", { d: "M8 16H3v5", key: "1cv678" }]
];
var RefreshCw = createLucideIcon("refresh-cw", __iconNode15);

// node_modules/lucide-react/dist/esm/icons/rotate-ccw.js
var __iconNode16 = [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }]
];
var RotateCcw = createLucideIcon("rotate-ccw", __iconNode16);

// node_modules/lucide-react/dist/esm/icons/rss.js
var __iconNode17 = [
  ["path", { d: "M4 11a9 9 0 0 1 9 9", key: "pv89mb" }],
  ["path", { d: "M4 4a16 16 0 0 1 16 16", key: "k0647b" }],
  ["circle", { cx: "5", cy: "19", r: "1", key: "bfqh0e" }]
];
var Rss = createLucideIcon("rss", __iconNode17);

// node_modules/lucide-react/dist/esm/icons/search.js
var __iconNode18 = [
  ["path", { d: "m21 21-4.34-4.34", key: "14j7rj" }],
  ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }]
];
var Search = createLucideIcon("search", __iconNode18);

// node_modules/lucide-react/dist/esm/icons/settings.js
var __iconNode19 = [
  [
    "path",
    {
      d: "M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",
      key: "1i5ecw"
    }
  ],
  ["circle", { cx: "12", cy: "12", r: "3", key: "1v7zrd" }]
];
var Settings = createLucideIcon("settings", __iconNode19);

// node_modules/lucide-react/dist/esm/icons/sparkles.js
var __iconNode20 = [
  [
    "path",
    {
      d: "M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z",
      key: "1s2grr"
    }
  ],
  ["path", { d: "M20 2v4", key: "1rf3ol" }],
  ["path", { d: "M22 4h-4", key: "gwowj6" }],
  ["circle", { cx: "4", cy: "20", r: "2", key: "6kqj1y" }]
];
var Sparkles = createLucideIcon("sparkles", __iconNode20);

// node_modules/lucide-react/dist/esm/icons/trash-2.js
var __iconNode21 = [
  ["path", { d: "M10 11v6", key: "nco0om" }],
  ["path", { d: "M14 11v6", key: "outv1u" }],
  ["path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6", key: "miytrc" }],
  ["path", { d: "M3 6h18", key: "d0wm0j" }],
  ["path", { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2", key: "e791ji" }]
];
var Trash2 = createLucideIcon("trash-2", __iconNode21);

// node_modules/lucide-react/dist/esm/icons/upload.js
var __iconNode22 = [
  ["path", { d: "M12 3v12", key: "1x0j5s" }],
  ["path", { d: "m17 8-5-5-5 5", key: "7q97r8" }],
  ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", key: "ih7n3h" }]
];
var Upload = createLucideIcon("upload", __iconNode22);

// node_modules/lucide-react/dist/esm/icons/users.js
var __iconNode23 = [
  ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", key: "1yyitq" }],
  ["path", { d: "M16 3.128a4 4 0 0 1 0 7.744", key: "16gr8j" }],
  ["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87", key: "kshegd" }],
  ["circle", { cx: "9", cy: "7", r: "4", key: "nufk8" }]
];
var Users = createLucideIcon("users", __iconNode23);

// node_modules/lucide-react/dist/esm/icons/wand-sparkles.js
var __iconNode24 = [
  [
    "path",
    {
      d: "m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72",
      key: "ul74o6"
    }
  ],
  ["path", { d: "m14 7 3 3", key: "1r5n42" }],
  ["path", { d: "M5 6v4", key: "ilb8ba" }],
  ["path", { d: "M19 14v4", key: "blhpug" }],
  ["path", { d: "M10 2v2", key: "7u0qdc" }],
  ["path", { d: "M7 8H3", key: "zfb6yr" }],
  ["path", { d: "M21 16h-4", key: "1cnmox" }],
  ["path", { d: "M11 3H9", key: "1obp7u" }]
];
var WandSparkles = createLucideIcon("wand-sparkles", __iconNode24);

// node_modules/lucide-react/dist/esm/icons/x.js
var __iconNode25 = [
  ["path", { d: "M18 6 6 18", key: "1bl5f8" }],
  ["path", { d: "m6 6 12 12", key: "d8bk6v" }]
];
var X = createLucideIcon("x", __iconNode25);

// src/client/icons.jsx
var import_jsx_runtime = require("react/jsx-runtime");
var PATHS = {
  "chevron-down": ["m6 9 6 6 6-6"],
  "chevron-up": ["m18 15-6-6-6 6"],
  plus: ["M12 5v14", "M5 12h14"],
  x: ["M18 6 6 18", "M6 6l12 12"],
  search: ["M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16", "m21 21-4.3-4.3"],
  "refresh-cw": ["M3 12a9 9 0 0 1 15.5-6.2L21 8", "M21 3v5h-5", "M21 12a9 9 0 0 1-15.5 6.2L3 16", "M3 21v-5h5"],
  "panel-left-close": ["M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z", "M9 3v18", "m16 15-3-3 3-3"],
  "panel-left-open": ["M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z", "M9 3v18", "m14 9 3 3-3 3"],
  bookmark: ["m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z"],
  "circle-check": ["M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20", "m9 12 2 2 4-4"],
  circle: ["M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20"],
  "file-plus": ["M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", "M14 2v5h6", "M12 12v6", "M9 15h6"],
  "file-check": ["M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", "M14 2v5h6", "m9 15 2 2 4-4"],
  "file-pen": ["M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", "M14 2v5h6", "M11 14h3l4-4-3-3-4 4Z"],
  "notebook-pen": ["M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4", "M2 6h4", "M2 10h4", "M2 14h4", "M2 18h4", "m18.4 2.6a2.1 2.1 0 0 1 3 3L14 13l-4 1 1-4Z"],
  ellipsis: ["M12 12h.01", "M19 12h.01", "M5 12h.01"],
  settings: ["M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"],
  type: ["M4 7V4h16v3", "M9 20h6", "M12 4v16"],
  sparkles: ["M9.9 2.6 11.4 7l4.4 1.5-4.4 1.5-1.5 4.4-1.5-4.4L4 8.5 8.4 7Z", "M18 5.5l.9 2.5 2.5.9-2.5.9-.9 2.5-.9-2.5-2.5-.9 2.5-.9Z"],
  rss: ["M4 11a9 9 0 0 1 9 9", "M4 4a16 16 0 0 1 16 16", "M6 19a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"],
  folder: ["M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"],
  globe: ["M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20", "M2 12h20", "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"],
  "message-circle": ["M7.9 20A9 9 0 1 0 4 16.1L2 22Z"],
  podcast: ["M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z", "M16.85 18.58a9 9 0 1 0-9.7 0", "M8 14a5 5 0 1 1 8 0", "M10 20a1 1 0 0 1-1-1v-1a2 2 0 1 1 4 0v1a1 1 0 0 1-1 1Z"],
  mail: ["M2 5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2Z", "m22 7-10 5L2 7"],
  newspaper: ["M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-4 0V6", "M18 14h-8", "M15 18h-5", "M10 6h8v4h-8Z"],
  tv: ["M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2Z", "m17 2-5 5-5-5"],
  "code-xml": ["m18 16 4-4-4-4", "m6 8-4 4 4 4", "m14.5 4-5 16"],
  feather: ["M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5Z", "M16 8 2 22", "M17.5 15H9"],
  braces: ["M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1", "M16 3h1a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2 2 2 0 0 0-2 2v5a2 2 0 0 1-2 2h-1"],
  "app-window": ["M2 5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2Z", "M2 9h20", "M6 6.5h.01", "M9 6.5h.01"],
  moon: ["M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"],
  hammer: ["m15 12-8.5 8.5a2.12 2.12 0 1 1-3-3L12 9", "M17.64 15 22 10.64", "m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25v-.86L16.01 4.6a5.56 5.56 0 0 0-3.94-1.64H9l.92.82A6.18 6.18 0 0 1 12 8.4v1.56l2 2h2.47l2.26 1.91"],
  gamepad: ["M6 12h4", "M8 10v4", "M15 13h.01", "M18 11h.01", "M17.32 5H6.68a4 4 0 0 0-3.98 3.59l-.87 7a4 4 0 0 0 6.79 3.35L9.7 18h4.6l1.08 1a4 4 0 0 0 6.79-3.35l-.87-7A4 4 0 0 0 17.32 5Z"],
  "tree-deciduous": ["M9.9 2.6 11.4 7l4.4 1.5-4.4 1.5-1.5 4.4-1.5-4.4L4 8.5 8.4 7Z"],
  "circle-alert": ["M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20", "M12 8v4", "M12 16h.01"]
};
var ALIASES = { "gamepad-2": "gamepad", "notebook-pen-2": "notebook-pen", "panel-left": "panel-left-close" };
function Icon2({ name, size = 17, className, strokeWidth = 1.7, ...rest }) {
  if (name === "wand-sparkles") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WandSparkles, { size, className, strokeWidth, "aria-hidden": "true", focusable: "false", ...rest });
  const paths = PATHS[ALIASES[name] ?? name] ?? PATHS.circle;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 24 24",
      width: size,
      height: size,
      fill: "none",
      stroke: "currentColor",
      strokeWidth,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      className,
      "aria-hidden": "true",
      focusable: "false",
      ...rest,
      children: paths.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d }, d))
    }
  );
}

// src/client/ChannelPicker.jsx
var import_react3 = require("react");
var import_jsx_runtime2 = require("react/jsx-runtime");
function groupChannels(channels) {
  const sections = { "T\u1ED5ng h\u1EE3p": [], "Nh\xF3m \u0111\u0103ng k\xFD": [], "K\xEAnh n\u1ED5i b\u1EADt": [], "C\u1ED9ng \u0111\u1ED3ng": [], "Ngu\u1ED3n c\u1EE7a t\xF4i": [] };
  for (const channel of channels) {
    if (channel.key === "all" || channel.key === "qiaomu" || channel.key === "feeds:all") {
      const subtitle = channel.key === "qiaomu" ? "Video tuy\u1EC3n ch\u1ECDn t\u1EEB k\xEAnh AI Engineer" : channel.key === "feeds:all" ? `${channels.filter((item) => item.kind === "feed").length} ngu\u1ED3n \u0111\u0103ng k\xFD c\xE1 nh\xE2n` : `${channel.unread} b\xE0i ch\u01B0a \u0111\u1ECDc`;
      sections["T\u1ED5ng h\u1EE3p"].push({ ...channel, subtitle });
    } else if (channel.kind === "qiaomu") {
      sections["K\xEAnh n\u1ED5i b\u1EADt"].push({ ...channel, subtitle: `${channel.total} b\xE0i vi\u1EBFt`, monogram: channel.name.trim().slice(0, 1) });
    } else if (channel.kind === "community") {
      sections["C\u1ED9ng \u0111\u1ED3ng"].push({ ...channel, subtitle: `${channel.total} b\xE0i vi\u1EBFt` });
    } else if (channel.kind === "podcast" || channel.kind === "collection") {
      sections["T\u1ED5ng h\u1EE3p"].push({ ...channel, subtitle: channel.kind === "collection" ? `${channel.total} y\xEAu c\u1EA7u` : `${channel.total} k\u1EF3 \u0111\xE3 l\u1EA5y` });
    } else if (channel.key.startsWith("group:")) {
      sections["Nh\xF3m \u0111\u0103ng k\xFD"].push({ ...channel, subtitle: `${channels.filter((item) => item.group === channel.name).length} ngu\u1ED3n \u0111\u0103ng k\xFD` });
    } else {
      sections["Ngu\u1ED3n c\u1EE7a t\xF4i"].push({ ...channel, subtitle: channel.lastError ? `L\u1EA5y d\u1EEF li\u1EC7u th\u1EA5t b\u1EA1i: ${channel.lastError}` : channel.url, error: Boolean(channel.lastError) });
    }
  }
  return sections;
}
function ChannelMark({ channel, size = 22 }) {
  const key = channel.key ?? "";
  const IconType = channel.kind === "community" ? Users : key === "all" ? Layers : key === "qiaomu" ? Sparkles : key === "podscribe" ? Podcast : key === "feeds:all" || key.startsWith("feed:") ? Rss : key.startsWith("group:") ? Folder : BookOpen;
  const variant = key === "qiaomu" ? " curated" : key === "all" ? " all" : "";
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: `qrs-channel-mark${variant}`, style: { width: size, height: size, flex: `0 0 ${size}px` }, "aria-hidden": "true", children: channel.monogram && key.startsWith("qiaomu:") ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: channel.monogram }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(IconType, { size: Math.max(16, Math.round(size * 0.72)), strokeWidth: 1.8 }) });
}
function ChannelPicker({ channels, current, anchor, onSelect, onManage, onClose }) {
  const [query, setQuery] = (0, import_react3.useState)("");
  const sections = (0, import_react3.useMemo)(() => groupChannels(channels), [channels]);
  const searching = query.trim() !== "";
  const matches = (channel) => `${channel.name} ${channel.subtitle ?? ""}`.toLowerCase().includes(query.trim().toLowerCase());
  const visible = searching ? channels.map((channel) => {
    const all = Object.values(sections).flat();
    return all.find((item) => item.key === channel.key) ?? channel;
  }).filter(matches) : [];
  const row = (channel) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "qrs-channel-option-wrap", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
    "button",
    {
      type: "button",
      className: "qrs-channel-option",
      "aria-current": channel.key === current,
      onClick: () => {
        onSelect(channel.key);
        onClose();
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(ChannelMark, { channel, size: 26 }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "qrs-channel-copy", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "qrs-channel-name", children: channel.name }),
          channel.subtitle && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "qrs-channel-subtitle", children: channel.subtitle })
        ] }),
        channel.key === current && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "qrs-channel-check", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "circle-check", size: 16 }) })
      ]
    }
  ) }, channel.key);
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "qrs-channel-backdrop", onClick: onClose, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "qrs-channel-picker", style: anchor ? { left: anchor.left, top: anchor.top } : void 0, role: "dialog", "aria-label": "Ch\u1ECDn k\xEAnh", onClick: (event) => event.stopPropagation(), children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "qrs-channel-heading", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: "Chuy\u1EC3n k\xEAnh" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("small", { children: "Ch\u1ECDn n\u1ED9i dung mu\u1ED1n \u0111\u1ECDc" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", className: "qrs-icon", "aria-label": "\u0110\xF3ng danh s\xE1ch k\xEAnh", onClick: onClose, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "x" }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "qrs-channel-top", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "search", size: 16 }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "input",
        {
          type: "search",
          "aria-label": "T\xECm k\xEAnh",
          placeholder: "T\xECm k\xEAnh, nh\xF3m ho\u1EB7c ngu\u1ED3n \u0111\u0103ng k\xFD\u2026",
          value: query,
          onChange: (event) => setQuery(event.target.value),
          autoFocus: true
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "qrs-channel-options", children: searching ? visible.length ? visible.map(row) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "qrs-channel-empty", children: "Kh\xF4ng c\xF3 k\xEAnh ph\xF9 h\u1EE3p" }) : Object.entries(sections).map(([title, items]) => items.length === 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "qrs-channel-section", children: title }),
      items.map((channel) => row(channel))
    ] }, title)) }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "qrs-channel-footer", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("button", { type: "button", className: "qrs-channel-manage", onClick: onManage, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "settings", size: 16 }),
        "Qu\u1EA3n l\xFD \u0111\u0103ng k\xFD",
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Icon2, { name: "chevron-down", size: 13 })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", className: "qrs-channel-close", onClick: onClose, children: "Xong" })
    ] })
  ] }) });
}

// src/client/ReadingAppearance.jsx
var import_jsx_runtime3 = require("react/jsx-runtime");
function ReadingControls({ settings, onChange, variant = "compact" }) {
  const set = (patch) => onChange(patch);
  const page = variant === "page";
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "qrs-reading-settings-fields", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("label", { className: "qrs-reading-setting", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: "Ph\xF4ng ch\u1EEF" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("select", { value: settings.readingFont, onChange: (event) => set({ readingFont: event.target.value }), children: Object.entries(FONTS).map(([value, font]) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value, children: font.label }, value)) })
      ] }),
      settings.readingFont === "custom" && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("label", { className: "qrs-reading-setting", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: "T\xEAn ph\xF4ng" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          "input",
          {
            "aria-label": "T\xEAn ph\xF4ng t\u1EF1 ch\u1ECDn",
            value: settings.customFont ?? "",
            placeholder: "V\xED d\u1EE5 LXGW WenKai",
            onChange: (event) => set({ customFont: event.target.value })
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("label", { className: "qrs-reading-setting", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: "C\u1EE1 ch\u1EEF" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("output", { children: [
          settings.fontSize,
          " px"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          "input",
          {
            type: "range",
            min: "14",
            max: "32",
            step: "1",
            value: settings.fontSize,
            onChange: (event) => set({ fontSize: Number(event.target.value) })
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("label", { className: "qrs-reading-setting", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: "Gi\xE3n d\xF2ng" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("output", { children: [
          settings.lineHeight.toFixed(1),
          "x"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          "input",
          {
            type: "range",
            min: "1.5",
            max: "2.4",
            step: "0.1",
            value: settings.lineHeight,
            onChange: (event) => set({ lineHeight: Number(event.target.value) })
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "qrs-reading-setting", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: "\u0110\u1ED9 r\u1ED9ng c\u1ED9t" }),
        page ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "qrs-segmented qrs-width-options", role: "group", "aria-label": "\u0110\u1ED9 r\u1ED9ng c\u1ED9t", children: TEXT_WIDTHS.map((width) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", "aria-pressed": settings.textWidth === width.value, onClick: () => set({ textWidth: width.value }), children: width.value }, width.value)) }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("select", { "aria-label": "\u0110\u1ED9 r\u1ED9ng c\u1ED9t", value: settings.textWidth, onChange: (event) => set({ textWidth: Number(event.target.value) }), children: TEXT_WIDTHS.map((width) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: width.value, children: width.label }, width.value)) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "qrs-reading-setting qrs-theme-setting", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: "Ch\u1EE7 \u0111\u1EC1 \u0111\u1ECDc" }),
        page ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "qrs-theme-options", role: "group", "aria-label": "Ch\u1EE7 \u0111\u1EC1 \u0111\u1ECDc", children: [["auto", "Theo \u1EE9ng d\u1EE5ng"], ["light", "S\xE1ng"], ["paper", "Gi\u1EA5y"], ["sage", "Xanh l\u1EE5c"], ["mist", "Xanh m\u1EDD"], ["dark", "T\u1ED1i"], ["black", "\u0110en"]].map(([value, label]) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("button", { type: "button", "aria-pressed": settings.readingTheme === value, onClick: () => set({ readingTheme: value }), children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: `qrs-theme-swatch${value === "auto" ? " qrs-theme-swatch-auto" : ""}`, style: value === "auto" ? void 0 : { background: THEMES[value][0], color: THEMES[value][1] }, children: value === "auto" ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Monitor, { size: 20, strokeWidth: 1.6 }) : "Aa" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: label })
        ] }, value)) }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("select", { "aria-label": "Ch\u1EE7 \u0111\u1EC1 \u0111\u1ECDc", value: settings.readingTheme, onChange: (event) => set({ readingTheme: event.target.value }), children: [["auto", "Theo \u1EE9ng d\u1EE5ng"], ["light", "S\xE1ng"], ["paper", "Gi\u1EA5y"], ["sage", "Xanh l\u1EE5c"], ["mist", "Xanh m\u1EDD"], ["dark", "T\u1ED1i"], ["black", "\u0110en"]].map(([value, label]) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value, children: label }, value)) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "qrs-reading-setting", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: "Phi\xEAn b\u1EA3n m\u1EB7c \u0111\u1ECBnh" }),
        page ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "qrs-segmented", role: "group", "aria-label": "Phi\xEAn b\u1EA3n m\u1EB7c \u0111\u1ECBnh", children: [["original", "B\u1EA3n g\u1ED1c"], ["translation", "B\u1EA3n d\u1ECBch"], ["rewrite", "Gi\u1EA3i th\xEDch AI"]].map(([value, label]) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", "aria-pressed": settings.defaultVersion === value, onClick: () => set({ defaultVersion: value }), children: label }, value)) }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("select", { "aria-label": "Phi\xEAn b\u1EA3n m\u1EB7c \u0111\u1ECBnh", value: settings.defaultVersion, onChange: (event) => set({ defaultVersion: event.target.value }), children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: "original", children: "B\u1EA3n g\u1ED1c" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: "translation", children: "B\u1EA3n d\u1ECBch" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: "rewrite", children: "Gi\u1EA3i th\xEDch AI" })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "qrs-reading-setting qrs-reading-setting-check", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: "\u1EA2nh trong b\xE0i" }),
        page ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("label", { className: "qrs-switch", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("input", { type: "checkbox", "aria-label": "\u1EA2nh trong b\xE0i", checked: settings.showImages !== false, onChange: (event) => set({ showImages: event.target.checked }) }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { "aria-hidden": "true" })
        ] }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("input", { type: "checkbox", "aria-label": "\u1EA2nh trong b\xE0i", checked: settings.showImages !== false, onChange: (event) => set({ showImages: event.target.checked }) })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      "button",
      {
        type: "button",
        className: "qrs-reading-reset",
        onClick: () => set({ ...READING_DEFAULTS }),
        children: "Kh\xF4i ph\u1EE5c m\u1EB7c \u0111\u1ECBnh"
      }
    )
  ] });
}
function ReadingAppearance({ settings, onChange, onClose }) {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "qrs-reading-settings", role: "dialog", "aria-label": "C\xE0i \u0111\u1EB7t \u0111\u1ECDc", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "qrs-reading-settings-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("strong", { children: "C\xE0i \u0111\u1EB7t \u0111\u1ECDc" }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", onClick: onClose, children: "Xong" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(ReadingControls, { settings, onChange })
  ] });
}

// src/client/dialogs.jsx
var import_react4 = require("react");
var import_jsx_runtime4 = require("react/jsx-runtime");
function Modal({ label, onClose, children, wide = false }) {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "qrs-modal-backdrop", onClick: onClose, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: `qrs-modal${wide ? " is-wide" : ""}`, role: "dialog", "aria-label": label, onClick: (event) => event.stopPropagation(), children }) });
}
function AddFeedDialog({ api, onClose, onDone, notify }) {
  const [url, setUrl] = (0, import_react4.useState)("");
  const [name, setName] = (0, import_react4.useState)("");
  const [group, setGroup] = (0, import_react4.useState)("");
  const [busy, setBusy] = (0, import_react4.useState)(false);
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(Modal, { label: "Th\xEAm ngu\u1ED3n \u0111\u0103ng k\xFD", onClose, children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("h2", { children: "Th\xEAm ngu\u1ED3n \u0111\u0103ng k\xFD" }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("input", { "aria-label": "\u0110\u1ECBa ch\u1EC9 ngu\u1ED3n", placeholder: "\u0110\u1ECBa ch\u1EC9 RSS / Atom (https://\u2026)", value: url, onChange: (event) => setUrl(event.target.value), autoFocus: true }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("input", { "aria-label": "T\xEAn ngu\u1ED3n", placeholder: "T\xEAn (t\xF9y ch\u1ECDn, m\u1EB7c \u0111\u1ECBnh l\u1EA5y ti\xEAu \u0111\u1EC1 ngu\u1ED3n)", value: name, onChange: (event) => setName(event.target.value) }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("input", { "aria-label": "Nh\xF3m", placeholder: "Nh\xF3m (t\xF9y ch\u1ECDn)", value: group, onChange: (event) => setGroup(event.target.value) }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "qrs-modal-actions", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { type: "button", onClick: onClose, children: "H\u1EE7y" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { type: "button", disabled: busy || !/^https?:\/\//i.test(url.trim()), onClick: async () => {
        setBusy(true);
        try {
          await api.addSubscription({ url: url.trim(), name: name.trim() || void 0, group: group.trim() || void 0 });
          await onDone();
          onClose();
        } catch (error) {
          notify(`Th\xEAm th\u1EA5t b\u1EA1i: ${error?.message ?? String(error)}`, true);
        } finally {
          setBusy(false);
        }
      }, children: busy ? "\u0110ang th\xEAm\u2026" : "\u0110\u0103ng k\xFD" })
    ] })
  ] });
}

// src/client/CollectionPanel.jsx
var import_react5 = require("react");

// src/client/collection-copy.js
var messages = {
  zh: {
    lab: "Ph\xF2ng th\u1EED nghi\u1EC7m",
    enableFirst: "X\xE1c minh m\xE3 m\u1EDDi b\xEAn d\u01B0\u1EDBi tr\u01B0\u1EDBc khi b\u1EADt.",
    enableHint: "Sau khi b\u1EADt, b\u1EA5m chu\u1ED9t ph\u1EA3i v\xE0o li\xEAn k\u1EBFt trong b\xE0i v\xE0 ch\u1ECDn \u201CY\xEAu c\u1EA7u thu th\u1EADp\u201D. Thay \u0111\u1ED5i \u0111\u01B0\u1EE3c l\u01B0u t\u1EF1 \u0111\u1ED9ng.",
    inviteDraft: "B\u1EA5m \u201CX\xE1c minh v\xE0 l\u01B0u\u201D \u0111\u1EC3 ki\u1EC3m tra m\xE3 m\u1EDDi.",
    replaceInvite: "\u0110\xE3 l\u01B0u; nh\u1EADp m\xE3 m\u1EDBi \u0111\u1EC3 thay th\u1EBF",
    myRequests: "Y\xEAu c\u1EA7u c\u1EE7a t\xF4i",
    requestsHint: "D\xE1n li\xEAn k\u1EBFt, xem ti\u1EBFn \u0111\u1ED9 ho\u1EB7c m\u1EDF k\u1EBFt qu\u1EA3. S\u1EBD c\xF3 th\xF4ng b\xE1o khi xong.",
    viewRequests: "Xem y\xEAu c\u1EA7u",
    loading: "\u0110ang t\u1EA3i\u2026",
    enabledNotice: "\u0110\xE3 b\u1EADt thu th\u1EADp li\xEAn k\u1EBFt",
    disabledNotice: "\u0110\xE3 t\u1EAFt thu th\u1EADp li\xEAn k\u1EBFt",
    title: "Thu th\u1EADp v\xE0 vi\u1EBFt l\u1EA1i li\xEAn k\u1EBFt",
    intro: "G\u1EEDi trang web \u0111\u1EC3 thu th\u1EADp v\xE0o AI Engineer World's Fair v\xE0 t\u1EF1 \u0111\u1ED9ng t\u1EA1o b\u1EA3n vi\u1EBFt l\u1EA1i.",
    disclosure: "Trang web b\u1EA1n g\u1EEDi v\xE0 b\u1EA3n vi\u1EBFt l\u1EA1i t\u1EA1o ra s\u1EBD \u0111\u01B0\u1EE3c c\xF4ng khai.",
    enabled: "B\u1EADt thu th\u1EADp li\xEAn k\u1EBFt",
    invite: "M\xE3 m\u1EDDi",
    inviteHint: "Nh\u1EADp m\xE3 m\u1EDDi",
    verify: "X\xE1c minh v\xE0 l\u01B0u",
    save: "L\u01B0u",
    saving: "\u0110ang x\xE1c minh\u2026",
    verified: "M\xE3 m\u1EDDi \u0111\xE3 \u0111\u01B0\u1EE3c x\xE1c minh",
    unverified: "Nh\u1EADp m\xE3 m\u1EDDi v\xE0 x\xE1c minh \u0111\u1EC3 b\u1EADt.",
    url: "Li\xEAn k\u1EBFt trang",
    submit: "G\u1EEDi y\xEAu c\u1EA7u",
    submitting: "\u0110ang g\u1EEDi\u2026",
    submitted: "\u0110\xE3 l\u01B0u y\xEAu c\u1EA7u thu th\u1EADp",
    jobs: "Y\xEAu c\u1EA7u c\u1EE7a t\xF4i",
    refresh: "L\xE0m m\u1EDBi y\xEAu c\u1EA7u",
    more: "T\u1EA3i th\xEAm y\xEAu c\u1EA7u",
    empty: "Ch\u01B0a c\xF3 y\xEAu c\u1EA7u n\xE0o",
    open: "M\u1EDF \u0111\u1EC3 \u0111\u1ECDc",
    retry: "Th\u1EED l\u1EA1i",
    close: "\u0110\xF3ng",
    queued: "\u0110ang ch\u1EDD",
    running: "\u0110ang x\u1EED l\xFD",
    complete: "Ho\xE0n t\u1EA5t",
    failed: "Th\u1EA5t b\u1EA1i",
    copy: "Sao ch\xE9p li\xEAn k\u1EBFt",
    copied: "\u0110\xE3 sao ch\xE9p li\xEAn k\u1EBFt",
    request: "Y\xEAu c\u1EA7u thu th\u1EADp",
    settings: "C\xE0i \u0111\u1EB7t ph\xF2ng th\u1EED nghi\u1EC7m",
    configured: "\u0110\xE3 l\u01B0u c\xE0i \u0111\u1EB7t",
    offline: "T\u1EA1m th\u1EDDi kh\xF4ng \u0111\u1ED3ng b\u1ED9 \u0111\u01B0\u1EE3c, \u0111\xE3 gi\u1EEF y\xEAu c\u1EA7u tr\xEAn m\xE1y",
    original: "Ti\xEAu \u0111\u1EC1 g\u1ED1c",
    search: "T\xECm y\xEAu c\u1EA7u"
  },
  en: {
    lab: "Labs",
    enableFirst: "Verify your invitation code below to enable this feature.",
    enableHint: "Right-click a link in an article and choose \u201CCollect and rewrite\u201D. Changes save automatically.",
    inviteDraft: "Choose \u201CVerify and save\u201D to check this code.",
    replaceInvite: "Saved; enter a code to replace it",
    myRequests: "My requests",
    requestsHint: "Paste a link, check progress or read results. You will be notified on completion.",
    viewRequests: "View requests",
    loading: "Loading\u2026",
    enabledNotice: "Link collection enabled",
    disabledNotice: "Link collection disabled",
    title: "Collect and rewrite links",
    intro: "Submit a web page to Qiaomu, then read and discuss the result here.",
    disclosure: "Submitted web pages and generated rewrites are publicly collected.",
    enabled: "Enable link collection",
    invite: "Invitation code",
    inviteHint: "Enter a code; leave blank to keep the verified configuration",
    verify: "Verify and save",
    save: "Save",
    saving: "Working\u2026",
    verified: "Invitation verified",
    unverified: "Invitation not verified",
    url: "Web page link",
    submit: "Submit link",
    submitting: "Submitting\u2026",
    submitted: "Collection request saved",
    jobs: "Collection requests",
    refresh: "Refresh requests",
    more: "Load more requests",
    empty: "No collection requests yet",
    open: "Read result",
    retry: "Retry",
    close: "Close",
    queued: "Queued",
    running: "Processing",
    complete: "Collection complete",
    failed: "Failed",
    copy: "Copy link",
    copied: "Link copied",
    request: "Collect and rewrite",
    settings: "Labs settings",
    configured: "Labs settings saved",
    offline: "Unable to sync; local requests are preserved",
    original: "Original title",
    search: "Search requests"
  }
};
function collectionCopy(language = globalThis.document?.documentElement?.lang || "zh") {
  return messages[language.toLowerCase().split("-")[0]] || messages.zh;
}
function clickedLink(event, root) {
  const anchor = event.target?.closest?.("a[href]");
  if (!anchor || !root?.contains(anchor)) return void 0;
  try {
    const url = new URL(anchor.href);
    if (["http:", "https:"].includes(url.protocol) && !url.username && !url.password) return url.href;
  } catch {
  }
}

// src/client/CollectionPanel.jsx
var import_jsx_runtime5 = require("react/jsx-runtime");
function CollectionSettings({ api, notify, onOpenRequests }) {
  const copy = collectionCopy();
  const [state, setState] = (0, import_react5.useState)(null), [invite, setInvite] = (0, import_react5.useState)(""), [busy, setBusy] = (0, import_react5.useState)(false), [error, setError] = (0, import_react5.useState)("");
  (0, import_react5.useEffect)(() => {
    let live = true;
    api.getCollectionSettings().then((result) => {
      if (live) setState(result);
    }).catch((error2) => {
      if (live) setError(error2.message);
    });
    return () => {
      live = false;
    };
  }, [api]);
  const save = async (patch) => {
    setBusy(true);
    setError("");
    try {
      const result = await api.configureCollection({ enabled: state.enabled, ...patch });
      setState(result);
      if (patch.invite) setInvite("");
      window.dispatchEvent(new Event("qrs-collection-changed"));
      notify(patch.invite ? copy.verified : result.enabled ? copy.enabledNotice : copy.disabledNotice);
    } catch (error2) {
      setError(error2.message);
    } finally {
      setBusy(false);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("section", { "aria-label": copy.lab, className: "qrs-lab-settings", children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "qrs-settings-intro", children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("h2", { children: copy.title }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { children: copy.intro })
    ] }),
    state ? /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "qrs-lab-rows", children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "qrs-lab-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "qrs-lab-info", children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("h3", { children: copy.enabled }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { id: "qrs-lab-enable-hint", children: state.verified ? copy.enableHint : copy.enableFirst })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("label", { className: "qrs-switch qrs-lab-switch", children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("input", { type: "checkbox", role: "switch", "aria-label": copy.enabled, "aria-describedby": "qrs-lab-enable-hint", checked: state.enabled, disabled: busy || !state.verified, onChange: (event) => void save({ enabled: event.target.checked }) }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { "aria-hidden": "true" })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("form", { className: "qrs-lab-row", onSubmit: (event) => {
        event.preventDefault();
        if (!busy && invite.trim()) void save({ invite: invite.trim() });
      }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "qrs-lab-info", children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("h3", { id: "qrs-lab-invite-label", children: copy.invite }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { id: "qrs-lab-invite-status", role: "status", "aria-live": "polite", children: invite.trim() ? copy.inviteDraft : state.verified ? copy.verified : copy.unverified })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "qrs-lab-controls", children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("input", { type: "password", autoComplete: "off", "aria-labelledby": "qrs-lab-invite-label", "aria-describedby": "qrs-lab-invite-status", placeholder: state.verified ? copy.replaceInvite : copy.inviteHint, value: invite, disabled: busy, onChange: (event) => {
            setInvite(event.target.value);
            setError("");
          } }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { className: "qrs-collection-button", type: "submit", disabled: busy || !invite.trim(), children: busy ? copy.saving : copy.verify })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "qrs-lab-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "qrs-lab-info", children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("h3", { children: copy.myRequests }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { children: copy.requestsHint })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { className: "qrs-collection-button", type: "button", disabled: !onOpenRequests || busy, onClick: onOpenRequests, children: copy.viewRequests })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { className: "qrs-lab-note", children: copy.disclosure })
    ] }) : !error && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { className: "qrs-settings-hint", role: "status", children: copy.loading }),
    error && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { role: "alert", className: "qrs-collection-error", children: error })
  ] });
}
function CollectionPanel({ api, onOpen, onSettings, notify, revision = 0 }) {
  const copy = collectionCopy();
  const [jobs, setJobs] = (0, import_react5.useState)([]);
  const [url, setUrl] = (0, import_react5.useState)("");
  const [query, setQuery] = (0, import_react5.useState)("");
  const [page, setPage] = (0, import_react5.useState)({ hasMore: false });
  const [busy, setBusy] = (0, import_react5.useState)(false);
  const [error, setError] = (0, import_react5.useState)("");
  const [settings, setSettings] = (0, import_react5.useState)({});
  const serial = (0, import_react5.useRef)(0);
  const load = async (cursor) => {
    const ticket = ++serial.current;
    setBusy(true);
    setError("");
    try {
      const snapshot = await api.collectionSnapshot();
      if (ticket !== serial.current) return;
      setSettings(snapshot);
      if (!cursor) setJobs(snapshot.jobs);
      if (snapshot.verified) {
        const result = await api.listCollectionJobs({ cursor });
        if (ticket !== serial.current) return;
        setPage(result);
        setJobs((previous) => cursor ? [...previous, ...result.jobs.filter((job) => !previous.some((item) => item.id === job.id))] : [...result.jobs, ...snapshot.jobs.filter((job) => !result.jobs.some((item) => item.id === job.id) && ["queued", "running"].includes(job.status))]);
      }
    } catch (error2) {
      if (ticket === serial.current) setError(`${copy.offline}: ${error2.message}`);
    } finally {
      if (ticket === serial.current) setBusy(false);
    }
  };
  (0, import_react5.useEffect)(() => {
    void load();
    return () => {
      serial.current++;
    };
  }, [api]);
  (0, import_react5.useEffect)(() => {
    let live = true;
    api.collectionSnapshot().then((result) => {
      if (live) {
        setSettings(result);
        setJobs((previous) => [...previous.map((job) => result.jobs.find((item) => item.id === job.id) || job), ...result.jobs.filter((job) => !previous.some((item) => item.id === job.id))]);
      }
    }).catch(() => {
    });
    return () => {
      live = false;
    };
  }, [api, revision]);
  const submit = async (value, retryId) => {
    setBusy(true);
    setError("");
    try {
      await api.submitCollection({ url: value, ...retryId ? { retryId } : {} });
      setUrl("");
      notify(copy.submitted);
      window.dispatchEvent(new Event("qrs-collection-changed"));
      await load();
    } catch (error2) {
      setError(error2.message);
    } finally {
      setBusy(false);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "qrs-collection-panel", children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "qrs-collection-heading", children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("h2", { children: copy.jobs }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { className: "qrs-icon", "aria-label": copy.settings, title: copy.settings, onClick: onSettings, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Settings, { size: 17 }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { className: "qrs-collection-disclosure", children: copy.disclosure }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("form", { className: "qrs-collection-submit", onSubmit: (event) => {
      event.preventDefault();
      void submit(url);
    }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("input", { type: "url", "aria-label": copy.url, placeholder: "https://\u2026", required: true, value: url, disabled: busy, onChange: (event) => setUrl(event.target.value) }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { className: "qrs-icon", type: "submit", "aria-label": busy ? copy.submitting : copy.submit, title: copy.submit, disabled: busy || !url.trim() || !settings.enabled || !settings.verified, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Link2, { size: 17 }) })
    ] }),
    (!settings.enabled || !settings.verified) && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { className: "qrs-collection-button", onClick: onSettings, children: copy.settings }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "qrs-collection-submit", children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("input", { type: "search", "aria-label": copy.search, placeholder: copy.search, value: query, onChange: (event) => setQuery(event.target.value) }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { className: "qrs-icon", "aria-label": copy.refresh, title: copy.refresh, disabled: busy, onClick: () => void load(), children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(RefreshCw, { size: 16 }) })
    ] }),
    error && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { className: "qrs-collection-error", role: "alert", children: error }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "qrs-collection-jobs", "aria-busy": busy, children: [
      !jobs.length && !busy && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { children: copy.empty }),
      jobs.filter((job) => `${job.title} ${job.originalTitle || ""} ${job.url}`.toLowerCase().includes(query.toLowerCase())).map((job) => /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "qrs-entry qrs-collection-job", children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("h3", { children: job.title || job.url }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("small", { children: [
            copy[job.status],
            " \xB7 ",
            new Date(job.createdAt).toLocaleDateString()
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "qrs-collection-job-actions", children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { className: "qrs-icon", "aria-label": copy.copy, title: copy.copy, onClick: () => void navigator.clipboard.writeText(job.url).then(() => notify(copy.copied)).catch((error2) => setError(error2.message)), children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Copy, { size: 15 }) }),
          job.status === "complete" && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { className: "qrs-icon", "aria-label": copy.open, title: copy.open, disabled: busy, onClick: () => void onOpen(job.id), children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(ExternalLink, { size: 16 }) }),
          job.status === "failed" && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { className: "qrs-icon", "aria-label": copy.retry, title: copy.retry, disabled: busy || !settings.enabled, onClick: () => void submit(job.url, job.id), children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(RotateCcw, { size: 16 }) })
        ] })
      ] }, job.id)),
      page.hasMore && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { className: "qrs-more", disabled: busy, onClick: () => void load(page.nextCursor), children: copy.more })
    ] })
  ] });
}

// src/client/SettingsPage.jsx
var import_react9 = require("react");

// package.json
var package_default = {
  name: "vai-youtube-news",
  description: "Vai YouTube News: AI Engineer video feed, explanations and glossary inside DSH, powered by the local vai-crawler service",
  version: "0.1.0",
  private: true,
  license: "MIT",
  keywords: [
    "deepseek-harness",
    "dsh-plugin",
    "youtube",
    "vaiplatform"
  ],
  type: "module",
  scripts: {
    build: "node build.mjs",
    prepack: "npm run build"
  },
  main: "lib/index.js",
  exports: {
    ".": {
      default: "./lib/index.js"
    },
    "./client": {
      default: "./lib/client.js"
    },
    "./package.json": "./package.json"
  },
  files: [
    "README.md",
    "cordis.patch.yml",
    "lib"
  ],
  dsh: {
    bundle: {
      patch: "./cordis.patch.yml"
    },
    meta: {
      title: "Vai YouTube News",
      description: "News feed kenh AI Engineer: video moi, giai thich va bang thuat ngu tu vai-crawler"
    },
    client: {
      platform: "web"
    }
  },
  peerDependencies: {
    "@deepseek-ai/cordis": "*"
  },
  peerDependenciesMeta: {
    "@deepseek-ai/cordis": {
      optional: true
    }
  },
  devDependencies: {
    esbuild: "^0.28.1",
    "lucide-react": "^0.539.0",
    react: "^18.3.1",
    "react-dom": "^18.3.1"
  }
};

// src/client/OpmlImport.jsx
var import_react6 = require("react");
var import_jsx_runtime6 = require("react/jsx-runtime");
function OpmlImport({ api, onDone }) {
  const [xml, setXml] = (0, import_react6.useState)("");
  const [url, setUrl] = (0, import_react6.useState)("");
  const [preview, setPreview] = (0, import_react6.useState)(null);
  const [selected, setSelected] = (0, import_react6.useState)([]);
  const [query, setQuery] = (0, import_react6.useState)("");
  const [busy, setBusy] = (0, import_react6.useState)(false);
  const [message, setMessage] = (0, import_react6.useState)("");
  const run = async (fn) => {
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (error) {
      setMessage(error?.message ?? String(error));
    } finally {
      setBusy(false);
    }
  };
  const inspect = (params) => run(async () => {
    const result = await api.opmlPreview(params);
    setPreview(result);
    setSelected(result.entries.filter((entry) => !entry.duplicate).map((entry) => entry.url));
  });
  const reset = () => {
    setPreview(null);
    setSelected([]);
  };
  const visible = preview?.entries.filter((entry) => `${entry.name} ${entry.group ?? ""} ${entry.url}`.toLowerCase().includes(query.toLowerCase())) ?? [];
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("fieldset", { className: "qrs-opml-import", disabled: busy, children: [
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("legend", { children: "Nh\u1EADp OPML" }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("input", { type: "file", "aria-label": "Ch\u1ECDn t\u1EC7p OPML", accept: ".opml,.xml,text/xml", onChange: (e) => {
      const file = e.target.files?.[0];
      if (file) void run(async () => {
        if (file.size > 5 * 1024 * 1024) throw new Error("T\u1EC7p v\u01B0\u1EE3t qu\xE1 5 MB");
        const text = await file.text();
        setXml(text);
        reset();
      });
    } }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("textarea", { "aria-label": "N\u1ED9i dung OPML", placeholder: "D\xE1n OPML, ho\u1EB7c ch\u1ECDn t\u1EC7p", rows: 4, value: xml, onChange: (e) => {
      setXml(e.target.value);
      reset();
    } }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("button", { type: "button", className: "qmrss-btn", disabled: !xml.trim(), onClick: () => void inspect({ xml }), children: "Xem tr\u01B0\u1EDBc" }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("input", { "aria-label": "\u0110\u1ECBa ch\u1EC9 OPML", placeholder: "https://example.org/subscriptions.opml", value: url, onChange: (e) => {
      setUrl(e.target.value);
      reset();
    } }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("button", { type: "button", className: "qmrss-btn", disabled: !url.trim(), onClick: () => void inspect({ url: url.trim() }), children: "Xem tr\u01B0\u1EDBc t\u1EEB \u0111\u1ECBa ch\u1EC9" }),
    preview && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("input", { "aria-label": "L\u1ECDc ngu\u1ED3n nh\u1EADp", placeholder: "L\u1ECDc theo t\xEAn, nh\xF3m, \u0111\u1ECBa ch\u1EC9", value: query, onChange: (e) => setQuery(e.target.value) }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "qmrss-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("button", { type: "button", className: "qmrss-btn", onClick: () => setSelected(visible.filter((entry) => !entry.duplicate).map((entry) => entry.url)), children: "Ch\u1ECDn k\u1EBFt qu\u1EA3 l\u1ECDc" }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("button", { type: "button", className: "qmrss-btn", onClick: () => setSelected([]), children: "B\u1ECF ch\u1ECDn h\u1EBFt" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "qrs-opml-results", children: visible.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("label", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("input", { type: "checkbox", disabled: entry.duplicate, checked: selected.includes(entry.url), onChange: (e) => setSelected(e.target.checked ? [...selected, entry.url] : selected.filter((url2) => url2 !== entry.url)) }),
        entry.name || entry.url,
        " ",
        entry.group && ` \xB7 ${entry.group}`,
        " ",
        entry.duplicate && "(\u0111\xE3 \u0111\u0103ng k\xFD)"
      ] }, entry.url)) }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("button", { type: "button", className: "qmrss-btn", disabled: !selected.length, onClick: () => void run(async () => {
        const result = await api.opmlImport(preview.xml, selected);
        setMessage(`\u0110\xE3 nh\u1EADp ${result.added} ngu\u1ED3n, b\u1ECF qua ${result.skipped}. V\xE0o k\xEAnh s\u1EBD t\u1EF1 l\u1EA5y b\xE0i vi\u1EBFt.`);
        reset();
        await onDone();
      }), children: [
        "Nh\u1EADp ngu\u1ED3n \u0111\xE3 ch\u1ECDn (",
        selected.length,
        ")"
      ] })
    ] }),
    busy && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { role: "status", children: "\u0110ang x\u1EED l\xFD\u2026" }),
    message && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { role: "status", children: message })
  ] });
}

// src/client/SubscriptionManager.jsx
var import_react7 = require("react");
var import_jsx_runtime7 = require("react/jsx-runtime");
function host(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
function SubscriptionManager({ api, subscriptions, onChange, notify }) {
  const [query, setQuery] = (0, import_react7.useState)("");
  const [errorsOnly, setErrorsOnly] = (0, import_react7.useState)(false);
  const [selected, setSelected] = (0, import_react7.useState)([]);
  const [group, setGroup] = (0, import_react7.useState)("");
  const [editing, setEditing] = (0, import_react7.useState)(null);
  const [editingGroup, setEditingGroup] = (0, import_react7.useState)(null);
  const [busy, setBusy] = (0, import_react7.useState)(false);
  const [confirmDelete, setConfirmDelete] = (0, import_react7.useState)(false);
  const errorCount = subscriptions.filter((sub) => sub.lastError).length;
  (0, import_react7.useEffect)(() => {
    if (!errorCount) setErrorsOnly(false);
  }, [errorCount]);
  const visible = subscriptions.filter((sub) => (!errorsOnly || sub.lastError) && `${sub.name} ${sub.group ?? ""} ${sub.url}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const groups = [...new Set(subscriptions.map((sub) => sub.group).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-CN"));
  const execute = async (operation) => {
    setBusy(true);
    try {
      await operation();
    } catch (error) {
      notify(`Thao t\xE1c th\u1EA5t b\u1EA1i: ${error?.message ?? String(error)}`, true);
    } finally {
      try {
        const result = await api.listSubscriptions();
        onChange(result.subscriptions);
      } catch (error) {
        notify(`\u0110\u1ECDc l\u1EA1i ngu\u1ED3n th\u1EA5t b\u1EA1i: ${error?.message ?? String(error)}`, true);
      }
      setBusy(false);
    }
  };
  const batch = async (operation) => {
    const failed = [];
    for (const id of selected) {
      try {
        await operation(id);
      } catch (error) {
        failed.push(`${id}: ${error?.message ?? String(error)}`);
      }
    }
    setSelected([]);
    if (failed.length) throw new Error(failed.join("; "));
    notify("\u0110\xE3 xong thao t\xE1c h\xE0ng lo\u1EA1t");
  };
  const toggleSelected = (id, checked) => setSelected((current) => checked ? [...current, id] : current.filter((item) => item !== id));
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("section", { className: "qrs-subscriptions", "aria-label": "Qu\u1EA3n l\xFD ngu\u1ED3n \u0111\u0103ng k\xFD", children: [
    /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "qrs-subscriptions-toolbar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("label", { className: "qrs-subscriptions-search", children: [
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Search, { size: 16 }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("input", { "aria-label": "T\xECm ngu\u1ED3n", placeholder: "T\xECm theo t\xEAn, nh\xF3m ho\u1EB7c \u0111\u1ECBa ch\u1EC9", value: query, onChange: (event) => setQuery(event.target.value) })
      ] }),
      errorCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "qrs-segmented", role: "group", "aria-label": "Tr\u1EA1ng th\xE1i ngu\u1ED3n", children: [
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("button", { type: "button", "aria-pressed": !errorsOnly, onClick: () => setErrorsOnly(false), children: "T\u1EA5t c\u1EA3" }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("button", { type: "button", "aria-pressed": errorsOnly, title: "L\u1ECDc ngu\u1ED3n g\u1EB7p l\u1ED7i", onClick: () => setErrorsOnly(true), children: [
          "L\u1ED7i ",
          errorCount
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "qrs-subscriptions-selection", children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("button", { type: "button", disabled: busy || !visible.length, onClick: () => setSelected(visible.map((sub) => sub.id)), children: "Ch\u1ECDn t\u1EA5t c\u1EA3 k\u1EBFt qu\u1EA3" }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("span", { children: [
        visible.length,
        " k\u1EBFt qu\u1EA3"
      ] })
    ] }),
    selected.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "qrs-subscriptions-batch", "aria-label": "Thao t\xE1c h\xE0ng lo\u1EA1t", children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("strong", { children: [
        "\u0110\xE3 ch\u1ECDn ",
        selected.length
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("label", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Folder, { size: 15 }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("input", { "aria-label": "Chuy\u1EC3n nh\xF3m h\xE0ng lo\u1EA1t", placeholder: "Nh\xF3m \u0111\xEDch, \u0111\u1EC3 tr\u1ED1ng = kh\xF4ng nh\xF3m", value: group, onChange: (event) => setGroup(event.target.value) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("button", { type: "button", disabled: busy, onClick: () => void execute(() => batch((id) => api.updateSubscription({ id, group }))), children: "Chuy\u1EC3n nh\xF3m" }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("button", { type: "button", disabled: busy, onClick: () => void execute(() => batch((id) => api.refresh(id))), children: [
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(RefreshCw, { size: 14 }),
        "L\xE0m m\u1EDBi"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("button", { type: "button", disabled: busy, className: "danger", onClick: () => setConfirmDelete(true), children: [
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Trash2, { size: 14 }),
        "H\u1EE7y \u0111\u0103ng k\xFD"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("button", { type: "button", className: "icon", "aria-label": "B\u1ECF ch\u1ECDn", onClick: () => {
        setSelected([]);
        setConfirmDelete(false);
      }, children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(X, { size: 16 }) })
    ] }),
    confirmDelete && /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "qrs-subscriptions-confirm", role: "alert", children: [
      "H\u1EE7y \u0111\u0103ng k\xFD ",
      selected.length,
      " ngu\u1ED3n n\xE0y?",
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("button", { type: "button", className: "danger", onClick: () => {
        setConfirmDelete(false);
        void execute(() => batch((id) => api.removeSubscription(id)));
      }, children: "X\xE1c nh\u1EADn h\u1EE7y" }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("button", { type: "button", onClick: () => setConfirmDelete(false), children: "H\u1EE7y" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "qrs-subscriptions-list", children: [
      visible.map((sub) => /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "qrs-subscription-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("input", { type: "checkbox", "aria-label": `Ch\u1ECDn ${sub.name}`, disabled: busy, checked: selected.includes(sub.id), onChange: (event) => toggleSelected(sub.id, event.target.checked) }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "qrs-subscription-avatar", "aria-hidden": "true", children: sub.name.trim().slice(0, 1) || "R" }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "qrs-subscription-copy", children: [
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("strong", { children: sub.name }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("span", { title: sub.url, children: [
            host(sub.url),
            sub.group && /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(import_jsx_runtime7.Fragment, { children: [
              " \xB7 ",
              sub.group
            ] })
          ] }),
          sub.lastError && /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("small", { role: "status", children: [
            "L\u1EA5y d\u1EEF li\u1EC7u th\u1EA5t b\u1EA1i: ",
            sub.lastError
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "qrs-subscription-actions", children: [
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("button", { type: "button", "aria-label": `S\u1EEDa ${sub.name}`, title: "S\u1EEDa", disabled: busy, onClick: () => setEditing({ id: sub.id, name: sub.name, group: sub.group ?? "" }), children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Pencil, { size: 15 }) }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("button", { type: "button", "aria-label": `Sao ch\xE9p \u0111\u1ECBa ch\u1EC9 ${sub.name}`, title: "Sao ch\xE9p \u0111\u1ECBa ch\u1EC9", onClick: () => void navigator.clipboard.writeText(sub.url).then(() => notify("\u0110\xE3 sao ch\xE9p \u0111\u1ECBa ch\u1EC9")).catch((error) => notify(`Sao ch\xE9p th\u1EA5t b\u1EA1i: ${error.message}`, true)), children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Copy, { size: 15 }) })
        ] })
      ] }, sub.id)),
      !visible.length && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "qrs-subscriptions-empty", children: errorsOnly ? "Kh\xF4ng c\xF3 ngu\u1ED3n n\xE0o g\u1EB7p l\u1ED7i" : "Kh\xF4ng c\xF3 ngu\u1ED3n ph\xF9 h\u1EE3p" })
    ] }),
    groups.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "qrs-group-manager", children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "qrs-group-heading", children: [
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("strong", { children: "Nh\xF3m ngu\u1ED3n" }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("span", { children: [
          groups.length,
          " nh\xF3m"
        ] })
      ] }),
      groups.map((name) => /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "qrs-group-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Folder, { size: 15 }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { children: name }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("small", { children: [
          subscriptions.filter((sub) => sub.group === name).length,
          " ngu\u1ED3n \u0111\u0103ng k\xFD"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("button", { type: "button", "aria-label": `S\u1EEDa nh\xF3m ${name}`, onClick: () => setEditingGroup({ oldName: name, name }), children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Pencil, { size: 15 }) })
      ] }, name))
    ] }),
    editing && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "qrs-subscription-editor-backdrop", onClick: () => setEditing(null), children: /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("form", { className: "qrs-subscription-editor", role: "dialog", "aria-modal": "true", "aria-label": "S\u1EEDa ngu\u1ED3n \u0111\u0103ng k\xFD", onClick: (event) => event.stopPropagation(), onKeyDown: (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setEditing(null);
      }
    }, onSubmit: (event) => {
      event.preventDefault();
      if (!busy && editing.name.trim()) void execute(async () => {
        await api.updateSubscription(editing);
        setEditing(null);
        notify("\u0110\xE3 c\u1EADp nh\u1EADt ngu\u1ED3n");
      });
    }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("strong", { children: "S\u1EEDa ngu\u1ED3n" }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("button", { type: "button", "aria-label": "\u0110\xF3ng", onClick: () => setEditing(null), children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(X, { size: 16 }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("label", { children: [
        "T\xEAn",
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("input", { autoFocus: true, "aria-label": "T\xEAn ngu\u1ED3n", value: editing.name, onChange: (event) => setEditing({ ...editing, name: event.target.value }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("label", { children: [
        "Nh\xF3m",
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("input", { "aria-label": "Nh\xF3m ngu\u1ED3n", list: "qrs-existing-groups", value: editing.group, onChange: (event) => setEditing({ ...editing, group: event.target.value }) }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("datalist", { id: "qrs-existing-groups", children: groups.map((name) => /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("option", { value: name }, name)) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "qrs-subscription-editor-actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("button", { type: "button", onClick: () => setEditing(null), children: "H\u1EE7y" }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("button", { type: "submit", disabled: busy || !editing.name.trim(), children: "L\u01B0u thay \u0111\u1ED5i" })
      ] })
    ] }) }),
    editingGroup && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "qrs-subscription-editor-backdrop", onClick: () => setEditingGroup(null), children: /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("form", { className: "qrs-subscription-editor", role: "dialog", "aria-modal": "true", "aria-label": "S\u1EEDa nh\xF3m ngu\u1ED3n", onClick: (event) => event.stopPropagation(), onKeyDown: (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setEditingGroup(null);
      }
    }, onSubmit: (event) => {
      event.preventDefault();
      if (busy) return;
      void execute(async () => {
        const targets = subscriptions.filter((sub) => sub.group === editingGroup.oldName);
        for (const sub of targets) await api.updateSubscription({ id: sub.id, group: editingGroup.name.trim() });
        setEditingGroup(null);
        notify("\u0110\xE3 c\u1EADp nh\u1EADt nh\xF3m");
      });
    }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("strong", { children: "S\u1EEDa nh\xF3m" }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("button", { type: "button", "aria-label": "\u0110\xF3ng", onClick: () => setEditingGroup(null), children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(X, { size: 16 }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("p", { children: "\u0110\u1ED5i t\xEAn nh\xF3m s\u1EBD chuy\u1EC3n to\xE0n b\u1ED9 ngu\u1ED3n trong nh\xF3m sang t\xEAn m\u1EDBi. \u0110\u1EC3 tr\u1ED1ng \u0111\u1EC3 b\u1ECF nh\xF3m; ngu\u1ED3n \u0111\u0103ng k\xFD v\u1EABn gi\u1EEF nguy\xEAn." }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("label", { children: [
        "T\xEAn nh\xF3m",
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("input", { autoFocus: true, "aria-label": "T\xEAn nh\xF3m", value: editingGroup.name, onChange: (event) => setEditingGroup({ ...editingGroup, name: event.target.value }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "qrs-subscription-editor-actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("button", { type: "button", onClick: () => setEditingGroup(null), children: "H\u1EE7y" }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("button", { type: "submit", disabled: busy || editingGroup.name.trim() === editingGroup.oldName, children: "L\u01B0u nh\xF3m" })
      ] })
    ] }) })
  ] });
}

// src/client/PromptManager.jsx
var import_react8 = require("react");

// src/client/quick-prompts.js
var KEY = "qrs.quick-prompts.v1";
var DEFAULT_PROMPTS = [
  { id: "summary", title: "T\xF3m t\u1EAFt \xFD ch\xEDnh", body: "H\xE3y t\xF3m t\u1EAFt ba \u0111i\u1EC3m c\u1ED1t l\xF5i c\u1EE7a b\xE0i vi\u1EBFt, ph\xE2n bi\u1EC7t s\u1EF1 ki\u1EC7n v\u1EDBi \xFD ki\u1EBFn c\u1EE7a t\xE1c gi\u1EA3." },
  { id: "translate", title: "D\u1ECBch to\xE0n v\u0103n", body: "H\xE3y d\u1ECBch to\xE0n b\u1ED9 b\xE0i vi\u1EBFt sang ti\u1EBFng Vi\u1EC7t, gi\u1EEF nguy\xEAn c\u1EA5u tr\xFAc g\u1ED1c." },
  { id: "explain", title: "Gi\u1EA3i th\xEDch \u0111o\u1EA1n ch\u1ECDn", body: "H\xE3y gi\u1EA3i th\xEDch \u0111o\u1EA1n t\xF4i \u0111\xE3 ch\u1ECDn d\u1EF1a tr\xEAn ng\u1EEF c\u1EA3nh b\xE0i vi\u1EBFt, b\u1EB1ng l\u1EDDi \u0111\u01A1n gi\u1EA3n d\u1EC5 hi\u1EC3u." },
  { id: "question", title: "H\u1ECFi v\u1EC1 b\u1EB1ng ch\u1EE9ng", body: "C\xE1c k\u1EBFt lu\u1EADn ch\xEDnh c\u1EE7a b\xE0i vi\u1EBFt c\xF3 b\u1EB1ng ch\u1EE9ng g\xEC h\u1ED7 tr\u1EE3? \u0110\xE2u nh\u1EEFng \u0111i\u1EC3m c\u1EA7n ki\u1EC3m ch\u1EE9ng th\xEAm?" }
];
function readQuickPrompts() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (Array.isArray(saved)) return saved.filter((item) => item && typeof item.id === "string" && typeof item.title === "string" && typeof item.body === "string").slice(0, 20);
  } catch {
  }
  return DEFAULT_PROMPTS;
}
function saveQuickPrompts(items) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("qrs-prompts-changed"));
}
function scopedQuickPrompts(items, selection = "") {
  const scoped = {
    summary: { title: "T\xF3m t\u1EAFt \u0111o\u1EA1n ch\u1ECDn", body: "H\xE3y t\xF3m t\u1EAFt ba \xFD ch\xEDnh c\u1EE7a \u0111o\u1EA1n \u0111\u01B0\u1EE3c ch\u1ECDn, ph\xE2n bi\u1EC7t s\u1EF1 ki\u1EC7n v\u1EDBi \xFD ki\u1EBFn. Ch\u1EC9 x\u1EED l\xFD \u0111o\u1EA1n \u0111\xE3 ch\u1ECDn, b\xE0i vi\u1EBFt ch\u1EC9 l\xE0m ng\u1EEF c\u1EA3nh." },
    translate: { title: "D\u1ECBch \u0111o\u1EA1n ch\u1ECDn", body: "H\xE3y ch\u1EC9 d\u1ECBch \u0111o\u1EA1n \u0111\u01B0\u1EE3c ch\u1ECDn sang ti\u1EBFng Vi\u1EC7t, gi\u1EEF nguy\xEAn \xFD v\xE0 c\u1EA5u tr\xFAc. B\xE0i vi\u1EBFt ch\u1EC9 l\xE0m ng\u1EEF c\u1EA3nh." },
    explain: { title: "Gi\u1EA3i th\xEDch \u0111o\u1EA1n ch\u1ECDn", body: "D\u1EF1a tr\xEAn ng\u1EEF c\u1EA3nh b\xE0i vi\u1EBFt, h\xE3y gi\u1EA3i th\xEDch \u0111o\u1EA1n \u0111\u01B0\u1EE3c ch\u1ECDn m\u1ED9t c\xE1ch d\u1EC5 hi\u1EC3u. Ch\u1EC9 gi\u1EA3i th\xEDch \u0111o\u1EA1n \u0111\xE3 ch\u1ECDn." },
    question: { title: "H\u1ECFi v\u1EC1 b\u1EB1ng ch\u1EE9ng", body: "K\u1EBFt lu\u1EADn trong \u0111o\u1EA1n \u0111\u01B0\u1EE3c ch\u1ECDn c\xF3 b\u1EB1ng ch\u1EE9ng g\xEC h\u1ED7 tr\u1EE3? \u0110\xE2u nh\u1EEFng \u0111i\u1EC3m c\u1EA7n ki\u1EC3m ch\u1EE9ng? T\u1EADp trung v\xE0o \u0111o\u1EA1n ch\u1ECDn." }
  };
  return items.map((item) => {
    const original = DEFAULT_PROMPTS.find((prompt) => prompt.id === item.id);
    if (!original || original.body !== item.body) return item;
    if (selection.trim()) return { ...item, ...scoped[item.id] };
    if (item.id === "explain") return { ...item, title: "Gi\u1EA3i th\xEDch b\xE0i vi\u1EBFt", body: "H\xE3y gi\u1EA3i th\xEDch \xFD ch\xEDnh c\u1EE7a b\xE0i vi\u1EBFt m\u1ED9t c\xE1ch d\u1EC5 hi\u1EC3u." };
    return item;
  });
}

// src/client/PromptManager.jsx
var import_jsx_runtime8 = require("react/jsx-runtime");
function PromptManager({ notify, startAdding = false }) {
  const [items, setItems] = (0, import_react8.useState)(readQuickPrompts);
  const [editing, setEditing] = (0, import_react8.useState)(() => startAdding && readQuickPrompts().length < 20 ? { title: "", body: "" } : null);
  const save = () => {
    const title = editing.title.trim();
    const body = editing.body.trim();
    if (!title || !body) return;
    const next = editing.id ? items.map((item) => item.id === editing.id ? { id: item.id, title, body } : item) : [...items, { id: crypto.randomUUID(), title, body }];
    saveQuickPrompts(next);
    setItems(next);
    setEditing(null);
    notify("\u0110\xE3 l\u01B0u l\u1EC7nh nhanh");
  };
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "qrs-prompt-manager", children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "qrs-settings-card-head qrs-settings-source-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("h3", { children: "L\u1EC7nh nhanh" }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("p", { children: "Hi\u1EC3n th\u1ECB ph\xEDa tr\xEAn \xF4 nh\u1EADp c\u1EE7a tr\u1EE3 l\xFD, b\u1EA5m l\xE0 g\u1EEDi ngay. B\u1EA3n nh\xE1p trong \xF4 nh\u1EADp s\u1EBD \u0111\u01B0\u1EE3c gi\u1EEF l\u1EA1i." })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("button", { type: "button", className: "qrs-prompt-add", disabled: items.length >= 20, onClick: () => setEditing({ title: "", body: "" }), children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Plus, { size: 15 }),
        "Th\xEAm"
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "qrs-prompt-list", children: [
      items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "qrs-prompt-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("strong", { children: item.title }),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { children: item.body })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("button", { type: "button", "aria-label": `S\u1EEDa ${item.title}`, onClick: () => setEditing(item), children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Pencil, { size: 15 }) }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("button", { type: "button", "aria-label": `X\xF3a ${item.title}`, onClick: () => {
          const next = items.filter((prompt) => prompt.id !== item.id);
          saveQuickPrompts(next);
          setItems(next);
          notify("\u0110\xE3 x\xF3a l\u1EC7nh nhanh");
        }, children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Trash2, { size: 15 }) })
      ] }, item.id)),
      !items.length && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("p", { children: "Ch\u01B0a c\xF3 l\u1EC7nh nhanh n\xE0o." })
    ] }),
    editing && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "qrs-subscription-editor-backdrop", onClick: () => setEditing(null), children: /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("form", { className: "qrs-subscription-editor", role: "dialog", "aria-modal": "true", "aria-label": editing.id ? "S\u1EEDa l\u1EC7nh nhanh" : "Th\xEAm l\u1EC7nh nhanh", onClick: (event) => event.stopPropagation(), onKeyDown: (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setEditing(null);
      }
    }, onSubmit: (event) => {
      event.preventDefault();
      save();
    }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("strong", { children: editing.id ? "S\u1EEDa l\u1EC7nh nhanh" : "Th\xEAm l\u1EC7nh nhanh" }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("button", { type: "button", "aria-label": "\u0110\xF3ng", onClick: () => setEditing(null), children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(X, { size: 16 }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("label", { children: [
        "T\xEAn",
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("input", { autoFocus: true, maxLength: 60, value: editing.title, onChange: (event) => setEditing({ ...editing, title: event.target.value }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("label", { children: [
        "N\u1ED9i dung l\u1EC7nh",
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("textarea", { rows: 5, maxLength: 5e3, value: editing.body, onChange: (event) => setEditing({ ...editing, body: event.target.value }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "qrs-subscription-editor-actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("button", { type: "button", onClick: () => setEditing(null), children: "H\u1EE7y" }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("button", { type: "submit", disabled: !editing.title.trim() || !editing.body.trim(), children: "L\u01B0u" })
      ] })
    ] }) })
  ] });
}

// src/client/SettingsPage.jsx
var import_jsx_runtime9 = require("react/jsx-runtime");
var TABS = [["reading", "Tr\u1EA3i nghi\u1EC7m \u0111\u1ECDc", BookOpen], ["sources", "Qu\u1EA3n l\xFD ngu\u1ED3n", Rss], ["prompts", "L\u1EC7nh nhanh", Sparkles], ["about", "Gi\u1EDBi thi\u1EC7u", Info]];
var REWARD_QR = "https://radio.qiaomu.ai/assets/qiaomu_reward_qr.png";
var FOLLOW_QR = "https://radio.qiaomu.ai/assets/qiaomu_wechat_public_account_qr.jpg";
function SettingsPage({ api, onClose, notify, initialTab = "reading", startAddingPrompt = false, onCollection }) {
  const [tab, setTab] = (0, import_react9.useState)(initialTab);
  const [settings, setSettings] = (0, import_react9.useState)(null);
  const [subscriptions, setSubscriptions] = (0, import_react9.useState)([]);
  const [message, setMessage] = (0, import_react9.useState)("");
  const [saving, setSaving] = (0, import_react9.useState)(false);
  const [showImport, setShowImport] = (0, import_react9.useState)(false);
  (0, import_react9.useEffect)(() => {
    let cancelled = false;
    void Promise.all([api.getSettings(), api.listSubscriptions()]).then(([preferences, feeds]) => {
      if (!cancelled) {
        setSettings(preferences.settings);
        setSubscriptions(feeds.subscriptions);
      }
    }).catch((error) => {
      if (!cancelled) setMessage(`\u0110\u1ECDc c\xE0i \u0111\u1EB7t th\u1EA5t b\u1EA1i: ${error?.message ?? String(error)}`);
    });
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKey);
    };
  }, [api, onClose]);
  const change = (patch) => setSettings((previous) => ({ ...previous, ...patch }));
  const reloadSubscriptions = async () => {
    const list = await api.listSubscriptions();
    setSubscriptions(list.subscriptions);
  };
  const save = async () => {
    setSaving(true);
    try {
      const result = await api.saveSettings({ ...settings, origin: (settings.origin ?? "").trim() });
      setSettings(result.settings);
      window.dispatchEvent(new Event("qrs-settings-changed"));
      setMessage("\u0110\xE3 l\u01B0u c\xE0i \u0111\u1EB7t");
    } catch (error) {
      setMessage(`L\u01B0u th\u1EA5t b\u1EA1i: ${error?.message ?? String(error)}`);
    } finally {
      setSaving(false);
    }
  };
  const exportOpml = async () => {
    try {
      const result = await api.opmlExport();
      const url = URL.createObjectURL(new Blob([result.xml], { type: "text/xml" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "qiaomu-rss-subscriptions.opml";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1e3);
    } catch (error) {
      setMessage(`Xu\u1EA5t th\u1EA5t b\u1EA1i: ${error?.message ?? String(error)}`);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "qrs-settings-backdrop", onClick: onClose, children: /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("section", { className: "qrs-settings-page", role: "dialog", "aria-modal": "true", "aria-label": "C\xE0i \u0111\u1EB7t AI Engineer World's Fair", onClick: (event) => event.stopPropagation(), children: [
    /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("header", { className: "qrs-settings-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { children: "AI ENGINEER WORLD'S FAIR" }),
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("strong", { children: "C\xE0i \u0111\u1EB7t" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("button", { type: "button", className: "qrs-icon", title: "\u0110\xF3ng c\xE0i \u0111\u1EB7t", "aria-label": "\u0110\xF3ng c\xE0i \u0111\u1EB7t", onClick: onClose, children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(Icon2, { name: "x" }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "qrs-settings-body", children: [
      /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("nav", { className: "qrs-settings-tabs", "aria-label": "Nh\xF3m c\xE0i \u0111\u1EB7t", children: [
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "qrs-settings-nav-caption", children: "C\xE0i \u0111\u1EB7t" }),
        [...TABS.slice(0, -1), ["lab", collectionCopy().lab, Sparkles], TABS.at(-1)].map(([key, label, TabIcon]) => /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("button", { type: "button", "aria-current": tab === key ? "page" : void 0, onClick: () => setTab(key), children: [
          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(TabIcon, { size: 17, strokeWidth: 1.8 }),
          label
        ] }, key))
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("main", { className: "qrs-settings-content", children: [
        !settings && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("p", { role: "status", children: message || "\u0110ang t\u1EA3i c\xE0i \u0111\u1EB7t\u2026" }),
        settings && tab === "reading" && /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("section", { "aria-label": "C\xE0i \u0111\u1EB7t \u0111\u1ECDc", children: [
          /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "qrs-settings-intro", children: [
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("h2", { children: "Tr\u1EA3i nghi\u1EC7m \u0111\u1ECDc" }),
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("p", { children: "T\xF9y ch\u1EC9nh nh\u1ECBp \u0111\u1ED9 v\xE0 giao di\u1EC7n khi \u0111\u1ECDc b\xE0i." })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "qrs-settings-card qrs-settings-reading-card", children: [
            /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "qrs-settings-card-head", children: [
              /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("h3", { children: "Hi\u1EC3n th\u1ECB b\xE0i" }),
              /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("p", { children: "Ph\xF4ng ch\u1EEF, \u0111\u1ED9 r\u1ED9ng c\u1ED9t v\xE0 m\xE0u ch\u1EC9 \xE1p d\u1EE5ng cho ch\u1EBF \u0111\u1ED9 \u0111\u1ECDc." })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(ReadingControls, { settings, onChange: change, variant: "page" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "qrs-settings-card qrs-settings-toggle-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("h3", { children: "T\u1EA1o phi\xEAn b\u1EA3n b\u1EB1ng AI" }),
              /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("p", { children: "Khi b\xE0i thi\u1EBFu b\u1EA3n d\u1ECBch ho\u1EB7c b\u1EA3n gi\u1EA3i th\xEDch, d\xF9ng m\xF4 h\xECnh hi\u1EC7n t\u1EA1i c\u1EE7a Harness \u0111\u1EC3 t\u1EA1o." })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("label", { className: "qrs-switch", children: [
              /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("input", { type: "checkbox", "aria-label": "T\u1EA1o phi\xEAn b\u1EA3n b\u1EB1ng AI", checked: settings.aiAssist !== false, onChange: (event) => change({ aiAssist: event.target.checked }) }),
              /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { "aria-hidden": "true" })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("p", { className: "qrs-settings-hint", children: "Tr\u1EE3 l\xFD AI d\xF9ng h\u1ED9i tho\u1EA1i g\u1ED1c v\xE0 workspace m\u1EB7c \u0111\u1ECBnh c\u1EE7a Harness. C\xF3 th\u1EC3 \u0111\u1ED5i m\xF4 h\xECnh trong khung chat b\xEAn ph\u1EA3i." })
        ] }),
        settings && tab === "sources" && /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("section", { "aria-label": "Qu\u1EA3n l\xFD ngu\u1ED3n", children: [
          /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "qrs-settings-intro", children: [
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("h2", { children: "Qu\u1EA3n l\xFD ngu\u1ED3n" }),
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("p", { children: "S\u1EAFp x\u1EBFp ngu\u1ED3n \u0111\u0103ng k\xFD c\xE1 nh\xE2n, ho\u1EB7c nh\u1EADp danh s\xE1ch OPML s\u1EB5n c\xF3." })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "qrs-settings-card", children: [
            /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "qrs-settings-card-head", children: [
              /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("h3", { children: "D\u1ECBch v\u1EE5 vai-crawler" }),
              /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("p", { children: "\u0110\u1ECBa ch\u1EC9 d\u1ECBch v\u1EE5 n\u1ED9i dung c\u1EE7a crawler. Ngu\u1ED3n c\xE1 nh\xE2n v\u1EABn \u0111\u1ECDc tr\u1EF1c ti\u1EBFp t\u1EEB m\xE1y." })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("label", { className: "qrs-settings-url", children: [
              /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { children: "\u0110\u1ECBa ch\u1EC9 d\u1ECBch v\u1EE5" }),
              /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("input", { type: "url", "aria-label": "\u0110\u1ECBa ch\u1EC9 d\u1ECBch v\u1EE5 crawler", value: settings.origin ?? "", onChange: (event) => change({ origin: event.target.value }) })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "qrs-settings-card qrs-settings-sources-card", children: [
            /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "qrs-settings-card-head qrs-settings-source-head", children: [
              /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("h3", { children: "Ngu\u1ED3n c\u1EE7a t\xF4i" }),
                /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("p", { children: [
                  subscriptions.length,
                  " ngu\u1ED3n \u0111\u0103ng k\xFD"
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "qrs-settings-source-actions", children: [
                /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("button", { type: "button", onClick: () => setShowImport((current) => !current), "aria-expanded": showImport, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(Upload, { size: 15 }),
                  "Nh\u1EADp OPML"
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("button", { type: "button", onClick: () => void exportOpml(), children: [
                  /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(Download, { size: 15 }),
                  "Xu\u1EA5t"
                ] })
              ] })
            ] }),
            showImport && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "qrs-settings-import", children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(OpmlImport, { api, onDone: async () => {
              await reloadSubscriptions();
              setShowImport(false);
            } }) }),
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(SubscriptionManager, { api, subscriptions, onChange: setSubscriptions, notify: (text, isError) => {
              setMessage(text);
              if (isError) notify(text, true);
            } })
          ] })
        ] }),
        tab === "lab" && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(CollectionSettings, { api, notify: setMessage, onOpenRequests: onCollection }),
        tab === "prompts" && /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("section", { "aria-label": "C\xE0i \u0111\u1EB7t l\u1EC7nh nhanh", children: [
          /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "qrs-settings-intro", children: [
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("h2", { children: "L\u1EC7nh nhanh" }),
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("p", { children: "\u0110\u1EB7t s\u1EB5n nh\u1EEFng c\xE2u h\u1ECFi hay d\xF9ng khi \u0111\u1ECDc." })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "qrs-settings-card", children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(PromptManager, { notify: setMessage, startAdding: startAddingPrompt }) })
        ] }),
        tab === "about" && /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("section", { "aria-label": "Gi\u1EDBi thi\u1EC7u", children: [
          /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "qrs-settings-intro", children: [
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("h2", { children: "V\u1EC1 AI Engineer World's Fair" }),
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("p", { children: "G\xF3c \u0111\u1ECDc tin y\xEAn t\u0129nh d\xE0nh cho DeepSeek Harness, d\u1EF1a tr\xEAn Qiaomu RSS." })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "qrs-settings-card qrs-settings-about-card", children: [
            /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "qrs-settings-about-brand", children: [
              /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { children: "V" }),
              /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("h3", { children: "AI Engineer World's Fair" }),
                /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("p", { children: [
                  "Phi\xEAn b\u1EA3n ",
                  package_default.version,
                  " \xB7 GPL-3.0-only"
                ] })
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("p", { children: "\u0110\u1ECDc video tuy\u1EC3n ch\u1ECDn v\xE0 RSS c\xE1 nh\xE2n, k\xE8m tr\u1EE3 l\xFD AI h\u1ED9i tho\u1EA1i g\u1ED1c c\u1EE7a Harness. D\u1EEF li\u1EC7u \u0111\u1ECDc l\u01B0u t\u1EA1i th\u01B0 m\u1EE5c Harness tr\xEAn m\xE1y." })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "qrs-settings-card", children: [
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "qrs-settings-card-head", children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("h3", { children: "D\u1EF1 \xE1n & ph\u1EA3n h\u1ED3i" }) }),
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "qrs-settings-links", children: [["M\xE3 ngu\u1ED3n & c\u1EADp nh\u1EADt", "https://github.com/joeseesun/qiaomu-rss-dsh"], ["B\xE1o l\u1ED7i", "https://github.com/joeseesun/qiaomu-rss-dsh/issues"], ["T\xE1c gi\u1EA3 \u5411\u9633\u4E54\u6728", "https://qiaomu.ai/"], ["Blog \u5411\u9633\u4E54\u6728", "https://blog.qiaomu.ai/"]].map(([label, href]) => /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("a", { href, target: "_blank", rel: "noopener noreferrer", children: [
              label,
              /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(ArrowUpRight, { size: 15 })
            ] }, href)) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "qrs-settings-support", children: [
            /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "qrs-settings-card", children: [
              /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(Heart, { size: 18 }),
              /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("h3", { children: "\u1EE6ng h\u1ED9 t\xE1c gi\u1EA3 g\u1ED1c" }),
              /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("p", { children: "C\u1EA3m \u01A1n b\u1EA1n \u1EE7ng h\u1ED9 \u5411\u9633\u4E54\u6728 duy tr\xEC plugin g\u1ED1c." }),
              /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("img", { src: REWARD_QR, alt: "M\xE3 QR \u1EE7ng h\u1ED9 c\u1EE7a \u5411\u9633\u4E54\u6728", loading: "lazy", width: "140", height: "140", referrerPolicy: "no-referrer" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "qrs-settings-card", children: [
              /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(Rss, { size: 18 }),
              /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("h3", { children: "Theo d\xF5i WeChat" }),
              /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("p", { children: "\u5411\u9633\u4E54\u6728\u63A8\u8350\u770B" }),
              /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("img", { src: FOLLOW_QR, alt: "M\xE3 QR WeChat \u5411\u9633\u4E54\u6728\u63A8\u8350\u770B", loading: "lazy", width: "140", height: "140", referrerPolicy: "no-referrer" })
            ] })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("footer", { className: "qrs-settings-footer", children: [
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { role: "status", children: message }),
      tab === "reading" || tab === "sources" ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("button", { type: "button", disabled: !settings || saving, onClick: () => void save(), children: saving ? "\u0110ang l\u01B0u\u2026" : "L\u01B0u c\xE0i \u0111\u1EB7t" }) : null
    ] })
  ] }) });
}

// src/client/reading-version.js
var ORDER = ["original", "translation", "rewrite"];
function resolveReadingVersion(preferred, article) {
  const readable = (kind) => kind === "original" ? Boolean(article?.html?.trim()) : article?.versions?.[kind]?.available === true && Boolean(article.versions[kind].markdown?.trim());
  const candidates = [preferred, ...ORDER.filter((kind) => kind !== preferred && kind !== "original"), "original"];
  return candidates.find((kind) => ORDER.includes(kind) && readable(kind)) ?? "original";
}

// src/client/Discover.jsx
var import_react11 = require("react");

// src/data/independent-blogs.json
var independent_blogs_default = {
  source: "https://github.com/timqian/chinese-independent-blogs",
  revision: "4fbded82114fc10f16770d53f287e3af951678cd",
  skipped: 139,
  items: [
    {
      id: "blog-1f081c225f94a663",
      name: "\u900F\u660E\u521B\u4E1A\u5B9E\u9A8C",
      url: "https://blog.t9t.io/atom.xml",
      site: "https://blog.t9t.io/",
      tags: [
        "\u521B\u4E1A",
        "\u7F16\u7A0B",
        "\u5F00\u6E90"
      ]
    },
    {
      id: "blog-e8e67d7f7b2e4f7d",
      name: "\u962E\u4E00\u5CF0\u7684\u7F51\u7EDC\u65E5\u5FD7",
      url: "http://feeds.feedburner.com/ruanyifeng",
      site: "https://www.ruanyifeng.com/blog/",
      tags: [
        "\u521B\u4E1A",
        "\u7F16\u7A0B",
        "\u524D\u7AEF"
      ]
    },
    {
      id: "blog-1f78500ee39edc23",
      name: "\u9177 \u58F3 \u2013 CoolShell",
      url: "http://coolshell.cn/feed",
      site: "https://coolshell.cn/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-f30975b391928088",
      name: "\u5F20\u946B\u65ED-\u946B\u7A7A\u95F4-\u946B\u751F\u6D3B",
      url: "http://www.zhangxinxu.com/wordpress/?feed=rss2",
      site: "https://www.zhangxinxu.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF"
      ]
    },
    {
      id: "blog-030534a537d16fd1",
      name: "Alili\u4E36\u524D\u7AEF\u5927\u7206\u70B8",
      url: "https://alili.tech/index.xml",
      site: "https://alili.tech/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF"
      ]
    },
    {
      id: "blog-dc9e87308221aae5",
      name: "\u868A\u5B50\u524D\u7AEF\u535A\u5BA2",
      url: "https://www.xiabingbao.com/atom.xml",
      site: "https://www.xiabingbao.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF"
      ]
    },
    {
      id: "blog-ca3610ee701db5fb",
      name: "DIYGod - \u5199\u4EE3\u7801\u662F\u70ED\u7231\uFF0C\u5199\u5230\u4E16\u754C\u5145\u6EE1\u7231!",
      url: "https://diygod.me/atom.xml",
      site: "https://diygod.me/",
      tags: [
        "\u7F16\u7A0B",
        "\u5F00\u6E90"
      ]
    },
    {
      id: "blog-234f2256d21515e5",
      name: "MacTalk-\u6C60\u5EFA\u5F3A\u7684\u968F\u60F3\u5F55",
      url: "http://macshuo.com/?feed=rss2",
      site: "http://macshuo.com/",
      tags: [
        "\u7F16\u7A0B",
        "iOS"
      ]
    },
    {
      id: "blog-3ac4a02c5f3053d6",
      name: "ShrekShao",
      url: "http://shrekshao.github.io/feed.xml",
      site: "https://shrekshao.github.io/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-1eb515079381c356",
      name: "\u4E91\u98CE\u7684 BLOG",
      url: "http://blog.codingnow.com/atom.xml",
      site: "https://blog.codingnow.com/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-2dbe4080c3206c39",
      name: "Reorx\u2019s Forge",
      url: "https://reorx.com/feed.xml",
      site: "https://reorx.com/",
      tags: [
        "\u6570\u5B57\u751F\u6D3B",
        "\u4EA7\u54C1\u601D\u8003",
        "\u751F\u4EA7\u529B\u5DE5\u5177",
        "\u8F6F\u4EF6\u5F00\u53D1"
      ]
    },
    {
      id: "blog-a90f96d2d652979a",
      name: "ZDDHUB \u7684\u535A\u5BA2",
      url: "https://zddhub.com/feed",
      site: "https://zddhub.com/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-53d456836f7360df",
      name: "\u5168\u6808\u5E94\u7528\u5F00\u53D1:\u7CBE\u76CA\u5B9E\u8DF5",
      url: "https://www.phodal.com/blog/feeds/rss/",
      site: "https://www.phodal.com/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-75d133a8c5f8343f",
      name: "Python \u5DE5\u5320",
      url: "https://www.piglei.com/feeds/latest/",
      site: "https://www.piglei.com/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-9882c6fdf34b99ed",
      name: "\u4F46\u884C\u597D\u4E8B\uFF0C\u83AB\u95EE\u524D\u7A0B",
      url: "https://windard.com/feed.xml",
      site: "https://windard.com/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-8741d8e8a817293b",
      name: "Ric's Blog",
      url: "https://www.lichong.work/atom.xml",
      site: "https://www.lichong.work/",
      tags: [
        "\u7F16\u7A0B",
        "\u67B6\u6784",
        "\u8BBE\u8BA1",
        "\u7B97\u6CD5"
      ]
    },
    {
      id: "blog-340e3b693b6d18b4",
      name: "\u7F57\u78CA\u7684\u72EC\u7ACB\u535A\u5BA2",
      url: "http://luolei.org/feed/",
      site: "https://luolei.org/",
      tags: [
        "\u7F16\u7A0B",
        "\u65C5\u884C"
      ]
    },
    {
      id: "blog-4069237d4cae96ad",
      name: "\u9601\u5B50",
      url: "https://dfine.tech/atom.xml",
      site: "https://dfine.tech/",
      tags: [
        "\u7F16\u7A0B",
        "\u7B97\u6CD5",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-b01ab45552459845",
      name: "\u4EE3\u7801\u5BB6",
      url: "https://daimajia.com/feed",
      site: "https://daimajia.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u6295\u8D44"
      ]
    },
    {
      id: "blog-60d4e118882d4ae5",
      name: "\u5F00\u6E90\u5B9E\u9A8C\u5BA4",
      url: "https://www.kymjs.com/feed.xml",
      site: "https://kymjs.com/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-cacb46e391a0f42e",
      name: "\u6280\u672F\u5C0F\u9ED1\u5C4B",
      url: "https://droidyue.com/atom.xml",
      site: "https://droidyue.com/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-ae18da9519ddf79f",
      name: "vzard's blog",
      url: "https://vzardlloo.github.io/atom.xml",
      site: "https://vzardlloo.github.io/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-7db2176bcabd913d",
      name: "\u540E\u7AEF\u6280\u672F\u6742\u8C08",
      url: "https://rowkey.cn/atom.xml",
      site: "https://rowkey.cn/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-2b870e352dca15a4",
      name: "zhonger \u524D\u7AEF\u5F00\u53D1\u8005\uFF0C\u559C\u7231\u8FD0\u7EF4\u7BA1\u7406",
      url: "https://blog.lui8.cn/feed.xml",
      site: "https://blog.lui8.cn/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-a5571903f7c23232",
      name: "\u4F9D\u4E91's Blog",
      url: "https://blog.lilydjwg.me/posts.rss",
      site: "https://blog.lilydjwg.me/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-8094acaf0da76b9f",
      name: "zgh's Blog",
      url: "https://hundren.github.io/atom.xml",
      site: "https://hundren.github.io/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF",
        "\u6E38\u620F",
        "\u91CF\u5B50\u7269\u7406"
      ]
    },
    {
      id: "blog-8de8d90d2477d0ee",
      name: "\u673D\u513F",
      url: "https://xiuer.medium.com/feed",
      site: "https://xiuer.medium.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF",
        "\u6E38\u620F"
      ]
    },
    {
      id: "blog-c5574af3a99b0e5f",
      name: "INTJer",
      url: "https://arminli.com/rss.xml",
      site: "https://arminli.com/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-4d6c175f9f140650",
      name: "\u601D\u5706\u7B14\u8BB0",
      url: "https://hintsnet.com/pimgeek/feed/",
      site: "https://hintsnet.com/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-1fd240c4f8bd6e97",
      name: "\u524D\u7AEF\u5DE5\u7A0B\u5E08 Toweave",
      url: "https://toweave.github.io/rss.xml",
      site: "https://toweave.github.io/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-b98ab5a026c3805a",
      name: "MouT.me",
      url: "https://ghost.mout.me/rss/",
      site: "https://mout.me/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-72bdbce58d380579",
      name: "diss\u5E26\u7801",
      url: "https://dumplingbao.github.io/atom.xml",
      site: "https://dumplingbao.github.io/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-c380c225bb7e023a",
      name: "\u738B\u767B\u79D1-DK\u535A\u5BA2",
      url: "https://greatdk.com/feed",
      site: "https://greatdk.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u521B\u4E1A"
      ]
    },
    {
      id: "blog-7192d6e8e0b518d1",
      name: "chai2010 \u7684\u535A\u5BA2",
      url: "https://chai2010.cn/index.xml",
      site: "https://chai2010.cn/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-21ea5c98ca7129d5",
      name: "\u7B28\u65B9\u6CD5\u5B66\u5199\u4F5C",
      url: "https://www.cnfeat.com/feed.xml",
      site: "https://www.cnfeat.com/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-25cfbc8e8cd07d3b",
      name: "\u4E91\u539F\u751F",
      url: "https://jimmysong.io/index.xml",
      site: "https://jimmysong.io/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-b356a3ec3e55c431",
      name: "Hawstein's Blog",
      url: "http://hawstein.com/feed.xml",
      site: "https://hawstein.com/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-702d535f4c52ea2f",
      name: "Skywind Inside",
      url: "http://www.skywind.me/blog/feed",
      site: "https://www.skywind.me/blog/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-86935c76189797d5",
      name: "\u67D0\u5C9B",
      url: "http://www.shuizilong.com/house/feed/",
      site: "http://www.shuizilong.com/house",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-32a740b89574cdb9",
      name: "\u9648\u6C99\u514B\u65E5\u5FD7",
      url: "http://www.chenshake.com/feed/",
      site: "http://www.chenshake.com/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-f5e0e65c9295b4a6",
      name: "Cat in Chinese",
      url: "http://chinese.catchen.me/feeds/posts/default",
      site: "https://chinese.catchen.me/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-6fd3ac558bdf1b68",
      name: "Randy's Blog",
      url: "https://lutaonan.com/rss.xml",
      site: "https://lutaonan.com/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-b59268d45c4fefeb",
      name: "iTimothy",
      url: "https://xiaozhou.net/atom.xml",
      site: "https://xiaozhou.net/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-acf073b5a23dd8a8",
      name: "idea's blog",
      url: "http://www.ideawu.net/blog/feed",
      site: "http://www.ideawu.net/blog",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-9767b9411f65fe4e",
      name: "xiaix's Blog",
      url: "http://xiaix.me/rss/",
      site: "https://xiaix.me/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-6a38d7d4706204db",
      name: "\u641E\u7B11\u8AC7\u8EDF\u5DE5",
      url: "http://teddy-chen-tw.blogspot.com/feeds/posts/default",
      site: "https://teddy-chen-tw.blogspot.com/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-3587e9524d9abc0d",
      name: "The Will Will Web",
      url: "https://feeds.feedburner.com/TheWillWillWeb",
      site: "https://blog.miniasp.com/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-85c38a34df8cc8ab",
      name: "\u7A0B\u5E8F\u5E08",
      url: "http://www.techug.com/feed",
      site: "https://www.techug.com/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-9191a6042d0d2a93",
      name: "\u89E3\u9053jdon.com",
      url: "https://www.jdon.com/jivejdon/rss",
      site: "https://www.jdon.com/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-7fec04f18a176980",
      name: "\u5C0F\u80E1\u5B50\u54E5\u7684\u4E2A\u4EBA\u7F51\u7AD9",
      url: "http://www.barretlee.com/rss2.xml",
      site: "https://www.barretlee.com/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-eccf69b93e7e19ff",
      name: "\u665A\u6674\u5E7D\u8349\u8F69",
      url: "https://www.jeffjade.com/atom.xml",
      site: "https://www.jeffjade.com/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-076472a522ec066c",
      name: "\u6797\u5C0F\u6C90",
      url: "http://feed.immmmm.com/",
      site: "https://immmmm.com/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-0842b6b483353651",
      name: "HelloDog",
      url: "https://wsgzao.github.io/atom.xml",
      site: "https://wsgzao.github.io/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-48cc720e91a494b4",
      name: "the5fire\u7684\u6280\u672F\u535A\u5BA2",
      url: "http://www.the5fire.com/rss",
      site: "https://www.the5fire.com/",
      tags: [
        "\u7F16\u7A0B",
        "Python",
        "\u7B97\u6CD5",
        "\u968F\u7B14",
        "\u8BFB\u4E66"
      ]
    },
    {
      id: "blog-7bfb9c90558f97ba",
      name: "\u4F59\u6D77\u5CEF David \u7269\u7406\u55B5 phycat",
      url: "https://hfdavidyu.com/feed/",
      site: "https://hfdavidyu.com/",
      tags: [
        "\u7269\u7406"
      ]
    },
    {
      id: "blog-fa0254532581e19c",
      name: "\u6C34\u661F\u6295\u8D44\u7406\u8D22",
      url: "http://mercurychong.blogspot.com/feeds/posts/default",
      site: "https://mercurychong.blogspot.com/",
      tags: [
        "\u6295\u8D44"
      ]
    },
    {
      id: "blog-1f5b976e7e3e37dd",
      name: "Mr. PM \u4E0B\u5348\u5148\u751F",
      url: "http://feeds.feedburner.com/pmmustknow",
      site: "https://mrpm.cc/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-68660ec81b91bb5b",
      name: "\u4EBA\u4EBA\u90FD\u662F\u4EA7\u54C1\u7ECF\u7406\u2014\u2014iamsujie",
      url: "http://iamsujie.com/feed/",
      site: "http://iamsujie.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u4EA7\u54C1"
      ]
    },
    {
      id: "blog-7dd71b590d0375c9",
      name: "\u8F49\u500B\u5F4E\u65E5\u8A8C",
      url: "http://blog.turn.tw/?feed=rss2",
      site: "https://blog.turn.tw/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-c535e12a7a94af36",
      name: "\u4F59\u679C\u7684\u535A\u5BA2",
      url: "http://feeds.feedburner.com/yuguo",
      site: "https://yuguo.us/",
      tags: [
        "\u7F16\u7A0B",
        "\u4EA7\u54C1"
      ]
    },
    {
      id: "blog-23b5f3422307c63f",
      name: "O3noBLOG",
      url: "https://feeds.feedburner.com/othree",
      site: "https://blog.othree.net/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-fdab7cbd76809b36",
      name: "Vivaxy's blog",
      url: "https://vivaxyblog.github.io/atom.xml",
      site: "https://vivaxyblog.github.io/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF"
      ]
    },
    {
      id: "blog-96b6b832741c21e1",
      name: "Debug\u5BA2\u6808",
      url: "https://blog.debuginn.com/index.xml",
      site: "https://blog.debuginn.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u79D1\u6280",
        "\u7B97\u6CD5",
        "\u8BFB\u4E66",
        "\u667A\u80FD\u5BB6\u5C45",
        "\u968F\u60F3",
        "\u597D\u7269\u5206\u4EAB",
        "\u6444\u5F71"
      ]
    },
    {
      id: "blog-f337cd2fa3b9f994",
      name: "isaced",
      url: "http://www.isaced.com/index.xml",
      site: "https://www.isaced.com/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-0646166414fecf1c",
      name: "Jason",
      url: "https://atjason.com/atom.xml",
      site: "https://atjason.com/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-6afe4687cee0247c",
      name: "forecho \u7684\u72EC\u7ACB\u535A\u5BA2",
      url: "https://blog.forecho.com/atom.xml",
      site: "https://blog.forecho.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u7F8E\u80A1\u6295\u8D44",
        "\u8BFB\u4E66",
        "\u968F\u60F3"
      ]
    },
    {
      id: "blog-37553084787eb6f4",
      name: "Jack Liu\u535A\u5BA2",
      url: "https://www.jack-liu.com/rss.php",
      site: "https://www.jack-liu.com/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-e343c37b03fe3aa3",
      name: "GeekPlux",
      url: "https://geekplux.com/atom.xml",
      site: "https://geekplux.com/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-37e3dab267730580",
      name: "\u738B\u5B50\u4EAD\u7684\u535A\u5BA2",
      url: "https://jysperm.me/atom.xml",
      site: "https://jysperm.me/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-16f5d95668b0acf2",
      name: "\u738B\u57A0\u7684\u535A\u5BA2",
      url: "https://rsshub.app/blogs/wangyin",
      site: "https://www.yinwang.org/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-0b2560ae2333b12b",
      name: "\u626F\u6C2E\u96C6",
      url: "http://weiwuhui.com/feed",
      site: "http://weiwuhui.com/",
      tags: [
        "\u521B\u4E1A",
        "\u4EBA\u751F"
      ]
    },
    {
      id: "blog-8704488c666283ba",
      name: "Aiur \xB7 Zellux \u7684\u535A\u5BA2",
      url: "https://blog.yxwang.me/index.xml",
      site: "https://blog.yxwang.me/",
      tags: [
        "\u7F16\u7A0B",
        "\u667A\u80FD\u5BB6\u5C45"
      ]
    },
    {
      id: "blog-fe3062af8502aaf9",
      name: "\u7855\u9F20\u7684\u535A\u5BA2\u7AD9",
      url: "http://lukefan.com/?feed=rss2",
      site: "http://lukefan.com/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-6de52b58bc01cdf9",
      name: "\u9ED1\xB7\u767D",
      url: "http://blog.xiayf.cn/feeds/rss.xml",
      site: "http://blog.xiayf.cn/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-833ec169fe0988a2",
      name: "\u5C0F\u733F\u5927\u5723",
      url: "https://hufangyun.com/atom.xml",
      site: "https://hufangyun.com/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-7bb9916b5179c0f8",
      name: "\u56E7\u514B\u65AF \u52FE\u4E09\u80A1\u56DB",
      url: "https://jiongks.name/atom.xml",
      site: "https://jiongks.name/",
      tags: [
        "\u7F16\u7A0B",
        "\u5F00\u6E90",
        "\u524D\u7AEF"
      ]
    },
    {
      id: "blog-29cab3a209aec578",
      name: "\u51B0\u7CD6\u6A59\u5B50",
      url: "http://www.btorange.com/feed",
      site: "http://www.btorange.com/",
      tags: [
        "\u524D\u7AEF",
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-b30a136ee5983525",
      name: "\u51AF\u5510\u535A\u5BA2",
      url: "http://www.fengtang.com/blog/?feed=rss2",
      site: "http://www.fengtang.com/blog/",
      tags: [
        "\u6587\u5B66"
      ]
    },
    {
      id: "blog-770e12afa803a7d7",
      name: "Lucifr",
      url: "https://lucifr.com/rss/",
      site: "https://lucifr.com/",
      tags: [
        "\u4EA7\u54C1"
      ]
    },
    {
      id: "blog-7dca85d464043b0a",
      name: "\u5F20\u6208\u535A\u5BA2",
      url: "https://zhang.ge/feed",
      site: "https://zhang.ge/",
      tags: [
        "\u7F16\u7A0B",
        "\u8FD0\u7EF4"
      ]
    },
    {
      id: "blog-f2538205afd4539d",
      name: "ChrAlpha \u7684\u5E7B\u60F3\u4E61\uFF08\u535A\u5BA2\uFF09",
      url: "https://blog.ichr.me/atom.xml",
      site: "https://blog.ichr.me/",
      tags: [
        "\u7B14\u8BB0\u672C",
        "\u6280\u672F\u5411",
        "\u7F16\u7A0B",
        "\u601D\u8003"
      ]
    },
    {
      id: "blog-cf66b0dc2a000e6c",
      name: "\u892A\u58A8\u30FB\u65F6\u95F4\u7BA1\u7406",
      url: "https://www.mifengtd.cn/feed.xml",
      site: "https://www.mifengtd.cn/",
      tags: [
        "\u65F6\u95F4\u7BA1\u7406"
      ]
    },
    {
      id: "blog-e91b7df7f6be3096",
      name: "\u6211\u7231\u81EA\u7136\u8BED\u8A00\u5904\u7406",
      url: "http://www.52nlp.cn/feed",
      site: "https://www.52nlp.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u673A\u5668\u5B66\u4E60"
      ]
    },
    {
      id: "blog-20f51c01876ec8a4",
      name: "\u5510\u5DE7\u7684\u535A\u5BA2",
      url: "https://blog.devtang.com/atom.xml",
      site: "https://blog.devtang.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u521B\u4E1A",
        "iOS"
      ]
    },
    {
      id: "blog-08565a3afc930424",
      name: "OneV's Den",
      url: "https://onevcat.com/feed.xml",
      site: "https://onevcat.com/",
      tags: [
        "\u7F16\u7A0B",
        "iOS"
      ]
    },
    {
      id: "blog-c6d2d7ea5945ccb0",
      name: "Garan no dou",
      url: "https://blog.ibireme.com/feed/",
      site: "https://blog.ibireme.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u5F00\u6E90",
        "iOS"
      ]
    },
    {
      id: "blog-28a96967a6a8b940",
      name: "\u53EF\u80FD\u5427",
      url: "http://feeds.kenengba.com/kenengbarss",
      site: "https://kenengba.com/",
      tags: [
        "\u521B\u4E1A"
      ]
    },
    {
      id: "blog-f939d23b59d4a328",
      name: "\u9E1F\u7A9D",
      url: "https://colobu.com/atom.xml",
      site: "https://colobu.com/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-191164c48d96bf6b",
      name: "libfeihu Blog",
      url: "http://feihu.me/blog/feed.atom",
      site: "https://feihu.me/blog/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-e64d658b4413c0ad",
      name: "Nic Lin's Blog",
      url: "https://blog.niclin.tw/index.xml",
      site: "https://blog.niclin.tw/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-985734313aa25fae",
      name: "Halfrost's Field",
      url: "http://halfrost.com/rss/",
      site: "https://halfrost.com/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-a2a4d4b2cd3ee361",
      name: "limboy's HQ",
      url: "http://feeds.feedburner.com/lzyy",
      site: "https://limboy.me/",
      tags: [
        "\u7F16\u7A0B",
        "\u8BBE\u8BA1"
      ]
    },
    {
      id: "blog-b44e3c2f7ba9feb6",
      name: "sunnyxx\u7684\u6280\u672F\u535A\u5BA2",
      url: "http://blog.sunnyxx.com/atom.xml",
      site: "https://blog.sunnyxx.com/",
      tags: [
        "\u7F16\u7A0B",
        "iOS"
      ]
    },
    {
      id: "blog-f26e71c9a60ccf71",
      name: "\u963F\u6BDB\u7684\u86CB\u75BC\u5730",
      url: "https://xiangwangfeng.com/atom.xml",
      site: "https://xiangwangfeng.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u5F00\u6E90"
      ]
    },
    {
      id: "blog-f8afcefe1f653e57",
      name: "Kevin Blog",
      url: "https://blog.kevinzhow.com/feed.xml",
      site: "https://blog.kevinzhow.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u521B\u4E1A"
      ]
    },
    {
      id: "blog-b56f55f3dcaefdbd",
      name: "bang's blog",
      url: "http://blog.cnbang.net/feed/",
      site: "https://blog.cnbang.net/",
      tags: [
        "\u7F16\u7A0B",
        "\u5F00\u6E90"
      ]
    },
    {
      id: "blog-d42298424bef52a0",
      name: "I'm TualatriX",
      url: "http://feeds.feedburner.com/tualatrix",
      site: "https://imtx.me/",
      tags: [
        "\u7F16\u7A0B",
        "\u5F00\u6E90"
      ]
    },
    {
      id: "blog-8c3d52e65495e286",
      name: "Wujunze's Blog",
      url: "https://wujunze.com/index.xml",
      site: "https://wujunze.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u67B6\u6784",
        "\u65C5\u884C"
      ]
    },
    {
      id: "blog-7c310f0953be3bf5",
      name: "\u591C\u884C\u4EBA",
      url: "https://wwj718.github.io/index.xml",
      site: "https://wwj718.github.io/",
      tags: [
        "\u7F16\u7A0B",
        "\u6559\u80B2",
        "\u968F\u7B14",
        "\u8BD7",
        "\u54F2\u5B66"
      ]
    },
    {
      id: "blog-54ea5eeb608bbcca",
      name: "Est's Blog",
      url: "http://feeds.feedburner.com/initiative",
      site: "https://blog.est.im/",
      tags: [
        "\u7F16\u7A0B",
        "\u521B\u4E1A",
        "\u54F2\u5B66"
      ]
    },
    {
      id: "blog-e7c7410a9b24673e",
      name: "Wiken",
      url: "https://www.hehuapei.com/feed",
      site: "https://www.hehuapei.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14",
        "\u5F00\u6E90"
      ]
    },
    {
      id: "blog-c2cd789b424e7184",
      name: "\u70B8\u88C2\u5FD7",
      url: "https://zh.fyi/rss.xml",
      site: "https://zh.fyi/",
      tags: [
        "\u5355\u8F66",
        "\u65C5\u884C",
        "\u64AD\u5BA2",
        "\u6444\u5F71"
      ]
    },
    {
      id: "blog-af35afb83af2ac2d",
      name: "kok\u7684\u7B14\u8BB0\u672C",
      url: "https://wocai.de/index.xml/",
      site: "https://wocai.de/",
      tags: [
        "\u7F16\u7A0B",
        "\u6444\u5F71"
      ]
    },
    {
      id: "blog-f95db1a593ff4b08",
      name: "\u641E\u641E\u9707",
      url: "https://www.wujingquan.com/atom.xml",
      site: "https://www.wujingquan.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u5F00\u6E90"
      ]
    },
    {
      id: "blog-234105e2e8eb7b62",
      name: "Qt\u8FDB\u9636\u4E4B\u8DEF-\u6D9B\u54E5\u7684\u535A\u5BA2",
      url: "https://jaredtao.github.io/atom.xml",
      site: "https://jaredtao.github.io/",
      tags: [
        "\u7F16\u7A0B",
        "Qt"
      ]
    },
    {
      id: "blog-38c9350152e4ab3d",
      name: "Fred Wu's Blog",
      url: "https://persumi.com/u/fredwu/feed/rss",
      site: "https://persumi.com/u/fredwu",
      tags: [
        "\u7F16\u7A0B",
        "\u5F00\u6E90",
        "\u6444\u5F71",
        "\u8BBE\u8BA1",
        "\u9886\u5BFC",
        "\u6FB3\u6D32"
      ]
    },
    {
      id: "blog-fc1e5e89b442853a",
      name: "ISLAND",
      url: "https://youngxhui.top/index.xml",
      site: "https://youngxhui.top/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-5bbd718eb463f666",
      name: "\u8D3A\u53F6\u971C\u7684\u6811",
      url: "https://blog.heysh.xyz/feed.xml",
      site: "https://blog.heysh.xyz/",
      tags: [
        "\u5F00\u6E90",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-60c0fbeaebefc072",
      name: "Frytea's Blog",
      url: "https://www.frytea.com/index.xml",
      site: "https://www.frytea.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u601D\u8003",
        "\u9AD8\u6548"
      ]
    },
    {
      id: "blog-e357b00dfa46bda0",
      name: "Mohuishou's Blog",
      url: "https://lailin.xyz/atom.xml",
      site: "https://lailin.xyz/",
      tags: [
        "\u7F16\u7A0B",
        "Go"
      ]
    },
    {
      id: "blog-fdf0a4e4b4014f63",
      name: "\u7B97\u6CD5\u82B1\u56ED",
      url: "https://xiang578.com/atom.xml",
      site: "https://xiang578.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u7B97\u6CD5",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-40179c5051f3163c",
      name: "1A23 Studio",
      url: "https://1a23.com/feed/",
      site: "https://1a23.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u8BBE\u8BA1",
        "\u97F3\u4E50",
        "\u5F00\u6E90"
      ]
    },
    {
      id: "blog-bf225021e0af606c",
      name: "Jiajun\u7684\u7F16\u7A0B\u968F\u60F3",
      url: "https://jiajunhuang.com/rss",
      site: "https://jiajunhuang.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u5F00\u6E90",
        "\u968F\u60F3"
      ]
    },
    {
      id: "blog-b25c28d5a06ab10f",
      name: "\u8D3C\u62C9\u6B63\u7ECF\u7684\u6280\u672F\u535A\u5BA2",
      url: "https://stackoverflow.wiki/blog/rss.xml",
      site: "https://www.stackoverflow.wiki/blog/",
      tags: [
        "\u7F16\u7A0B",
        "\u540E\u7AEF",
        "Java"
      ]
    },
    {
      id: "blog-a27624ecbe1afb15",
      name: "Lenix Blog",
      url: "https://blog.p2hp.com/feed",
      site: "https://blog.p2hp.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u540E\u7AEF",
        "WEB\u5F00\u53D1"
      ]
    },
    {
      id: "blog-6ecf861535481c47",
      name: "\u897F\u79E6\u516C\u5B50",
      url: "https://www.ixiqin.com/feed/",
      site: "https://www.ixiqin.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u5F00\u6E90"
      ]
    },
    {
      id: "blog-f3c7bf8dd9dc1f9f",
      name: "OnionTalk",
      url: "https://hateonion.me/index.xml",
      site: "https://hateonion.me/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-0179f784ef7c3908",
      name: "Nicksxs's Blog",
      url: "https://nicksxs.me/atom.xml",
      site: "https://nicksxs.me/",
      tags: [
        "\u7F16\u7A0B",
        "\u540E\u7AEF",
        "Java",
        "PHP"
      ]
    },
    {
      id: "blog-51a74e53405a0dd8",
      name: "Allen's Blog",
      url: "https://www.capallen.top/atom.xml",
      site: "https://www.capallen.top/",
      tags: [
        "\u7F16\u7A0B",
        "\u6570\u636E\u79D1\u5B66"
      ]
    },
    {
      id: "blog-cd41c7267b93f297",
      name: "\u8C22\u76CA\u8F89",
      url: "http://yihui.name/cn/feed/",
      site: "https://yihui.name/cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u7EDF\u8BA1\u5B66",
        "\u5F00\u6E90"
      ]
    },
    {
      id: "blog-2b117aa309c83520",
      name: "\u6728\u9065\u7684\u7A97\u5B50",
      url: "https://blog.farmostwood.net/feed",
      site: "https://blog.farmostwood.net/",
      tags: [
        "\u6570\u5B66",
        "\u5C0F\u8BF4",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-36951c45b2b9029c",
      name: "\u5362\u660C\u6D77\u7684\u4E2A\u4EBA\u4E3B\u9875",
      url: "https://www.changhai.org/feed.xml",
      site: "https://www.changhai.org/",
      tags: [
        "\u7269\u7406",
        "\u79D1\u666E"
      ]
    },
    {
      id: "blog-f865f992f82c97ce",
      name: "UsubeniFantasy",
      url: "https://ssshooter.com/rss.xml",
      site: "https://ssshooter.com/",
      tags: [
        "\u524D\u7AEF",
        "\u968F\u60F3",
        "\u6E38\u620F",
        "\u6444\u5F71"
      ]
    },
    {
      id: "blog-bb72fc1d78548edc",
      name: "Alexander D Huang's Blog",
      url: "https://alxddh.github.io/feed.xml",
      site: "https://alxddh.github.io/",
      tags: [
        "\u7F16\u7A0B",
        "\u6E38\u620F"
      ]
    },
    {
      id: "blog-f451863227fe105c",
      name: "KAIX.IN",
      url: "https://kaix.in/feed/",
      site: "https://kaix.in/",
      tags: [
        "\u8BFB\u4E66",
        "\u5496\u5561",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-fdcf0479e8c2c656",
      name: "\u671D\u821E",
      url: "https://ii74.com/feed.php",
      site: "https://ii74.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-66d5f3e47d13c46d",
      name: "Matrix67: The Aha Moments",
      url: "http://www.matrix67.com/blog/feed",
      site: "http://www.matrix67.com/blog/",
      tags: [
        "\u6570\u5B66",
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-3c9b7d63ceb39900",
      name: "Livid",
      url: "https://livid.v2ex.com/feed.xml",
      site: "https://livid.v2ex.com/",
      tags: [
        "\u521B\u4E1A",
        "\u793E\u533A",
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-93ea9707c2d73a76",
      name: "hanjm's Blog",
      url: "https://www.imhanjm.com/atom.xml",
      site: "https://www.imhanjm.com/",
      tags: [
        "\u7F16\u7A0B",
        "GO",
        "Golang",
        "\u540E\u7AEF"
      ]
    },
    {
      id: "blog-8fdd69cad6ab85c4",
      name: "\u8C22\u4E7E\u5764-\u9752\u5357",
      url: "https://www.kingname.info/atom.xml",
      site: "https://www.kingname.info/",
      tags: [
        "\u7F16\u7A0B",
        "Python",
        "\u722C\u866B"
      ]
    },
    {
      id: "blog-bf7fc6dd139c8b46",
      name: "SEO \u7F51\u7AD9\u4F18\u5316\u53CA\u7F51\u7AD9\u63A8\u5E7F",
      url: "https://seo.g2soft.net/atom.xml",
      site: "https://seo.g2soft.net/",
      tags: [
        "\u641C\u7D22\u5F15\u64CE\u4F18\u5316",
        "\u7F51\u7AD9\u4F18\u5316",
        "\u7F51\u7AD9\u63A8\u5E7F",
        "\u7F51\u7AD9"
      ]
    },
    {
      id: "blog-1fd8d09332aa7e9e",
      name: "\u9AD8\u91D1\u7684\u535A\u5BA2",
      url: "https://igaojin.me/atom.xml",
      site: "https://igaojin.me/",
      tags: [
        "\u7F16\u7A0B",
        "python",
        "\u533A\u5757\u94FE"
      ]
    },
    {
      id: "blog-c7cf275e41312ff7",
      name: "\u81E8\u6C60\u4E0D\u8F1F",
      url: "https://keelii.com/atom.xml",
      site: "https://keelii.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF",
        "\u8F6F\u4EF6\u5F00\u53D1",
        "\u601D\u8003"
      ]
    },
    {
      id: "blog-a7d454bb70d676ca",
      name: "\u7280\u5229\u8C46\u7684\u535A\u5BA2",
      url: "https://xilidou.com/atom.xml",
      site: "https://xilidou.com/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-9a522f58c9904d5b",
      name: "Kuricat's Blog",
      url: "https://kuricat.com/rss",
      site: "https://kuricat.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u601D\u8003",
        "\u4E91\u539F\u751F"
      ]
    },
    {
      id: "blog-ad79549a34b0bdf1",
      name: "Howard Cheung",
      url: "https://h-cheung.gitlab.io/index.xml",
      site: "https://h-cheung.gitlab.io/",
      tags: [
        "\u7B97\u6CD5",
        "Linux",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-9ea70d5f49ca13cb",
      name: "\u5EAD\u8BF4",
      url: "https://tingtalk.me/atom.xml",
      site: "https://tingtalk.me/",
      tags: [
        "\u79D1\u6280\u4E92\u8054\u7F51",
        "\u6570\u5B57\u751F\u6D3B",
        "\u5916\u8D38",
        "\u8BBE\u8BA1",
        "\u6392\u7248",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-76f7caf2f112ba72",
      name: "\u9065\u884C Gofurther \u6280\u672F&ML&BC\u535A\u5BA2",
      url: "https://charlesliuyx.github.io/atom.xml",
      site: "https://charlesliuyx.github.io/",
      tags: [
        "\u673A\u5668\u5B66\u4E60",
        "\u533A\u5757\u94FE",
        "\u7B97\u6CD5",
        "\u5E55\u5E03",
        "Dota2"
      ]
    },
    {
      id: "blog-533aa2c25eaf1d30",
      name: "\u5F20\u51EF\u5F3A\u7684\u535A\u5BA2",
      url: "https://zkqiang.cn/atom.xml",
      site: "https://zkqiang.cn/",
      tags: [
        "Python",
        "\u722C\u866B",
        "Java",
        "\u540E\u7AEF"
      ]
    },
    {
      id: "blog-285d3d4a473799ff",
      name: "xulihang's blog",
      url: "https://blog.xulihang.me/feed/",
      site: "https://blog.xulihang.me/",
      tags: [
        "\u7F16\u7A0B",
        "\u7FFB\u8BD1",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-cf776748d3bf5fac",
      name: "\u89C1\u5B57\u5982\u9762",
      url: "https://hiwannz.com/feed",
      site: "https://hiwannz.com/",
      tags: [
        "\u4EA7\u54C1",
        "\u601D\u8003",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-8932f3cebbce174a",
      name: "\u628A\u9152\u8BD7\u4EE3\u7801",
      url: "https://102no.com/atom.xml",
      site: "https://102no.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-033f09eb70bd5c4f",
      name: "NotJustCode",
      url: "https://mebtte.com/rss.xml",
      site: "https://mebtte.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF",
        "\u540E\u7AEF"
      ]
    },
    {
      id: "blog-2fd32906bdb76d3c",
      name: "\u6C5F\u8FB9\u7684\u65F1\u9E2D\u5B50",
      url: "https://blog.joouis.com/atom.xml",
      site: "https://blog.joouis.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF",
        "\u65C5\u884C",
        "\u9605\u8BFB",
        "\u62DB\u8058"
      ]
    },
    {
      id: "blog-aec9b6491da7e0d8",
      name: "\u8FFD\u98CE\u4E4B\u5F71",
      url: "https://www.devashen.com/atom.xml",
      site: "https://www.devashen.com/",
      tags: [
        "\u7F16\u7A0B",
        "iOS",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-90dc20012cb73518",
      name: "HansChen \u7684\u535A\u5BA2",
      url: "http://blog.hanschen.site/atom.xml",
      site: "https://blog.hanschen.site/",
      tags: [
        "\u7F16\u7A0B",
        "Android"
      ]
    },
    {
      id: "blog-3a2fdc672989484c",
      name: "IPhysResearch",
      url: "https://iphysresearch.github.io/blog/post/index.xml",
      site: "https://iphysresearch.github.io/blog/",
      tags: [
        "\u7F16\u7A0B",
        "\u79D1\u7814",
        "\u7269\u7406",
        "\u5F15\u529B\u6CE2",
        "AI",
        "\u673A\u5668\u5B66\u4E60",
        "\u6DF1\u5EA6\u5B66\u4E60",
        "\u5F00\u6E90"
      ]
    },
    {
      id: "blog-23f68e49f2fe1771",
      name: "Desvl's blog",
      url: "https://desvl.xyz/atom.xml",
      site: "https://desvl.xyz/",
      tags: [
        "\u6570\u5B66"
      ]
    },
    {
      id: "blog-20fd67da840c0553",
      name: "HaoKunT\u7684\u535A\u5BA2",
      url: "https://hkvision.cn/index.xml",
      site: "https://hkvision.cn/",
      tags: [
        "Python",
        "Golang",
        "GIS",
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-151e49fb55ca84ed",
      name: "Deepzz's Blog",
      url: "https://deepzz.com/feed",
      site: "https://deepzz.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-393a4c4b4b5f1097",
      name: "lucifer\u7684\u7F51\u7EDC\u535A\u5BA2",
      url: "https://lucifer.ren/blog/atom.xml",
      site: "https://lucifer.ren/blog",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF",
        "\u7B97\u6CD5"
      ]
    },
    {
      id: "blog-d18407c7121e5aa3",
      name: "\u97F3\u89C6\u9891\u5F00\u53D1\u8FDB\u9636",
      url: "https://glumes.com/index.xml",
      site: "https://glumes.com/",
      tags: [
        "\u8F6F\u4EF6\u5F00\u53D1",
        "\u97F3\u89C6\u9891",
        "\u56FE\u5F62\u56FE\u50CF",
        "\u968F\u7B14\u601D\u8003"
      ]
    },
    {
      id: "blog-fafd4c8b2150103a",
      name: "Josherich\u7684\u535A\u5BA2",
      url: "https://www.josherich.me/feed.xml",
      site: "https://www.josherich.me/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-f4c0321ddb4264f6",
      name: "Zhshch`s Blog",
      url: "https://xzhsh.ch/index.xml",
      site: "https://xzhsh.ch/",
      tags: [
        "\u65E5\u5E38",
        "\u5B66\u751F",
        "\u7F16\u7A0B",
        "\u5947\u601D\u5999\u60F3"
      ]
    },
    {
      id: "blog-f8b191a97ca5e6b5",
      name: "FlyingSky's Blog",
      url: "https://blog.fsky7.com/feed",
      site: "https://blog.fsky7.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-2cff566d0782e053",
      name: "\u5DF1\u7F8A\u7684\u68A6",
      url: "https://www.jiyang00.cn/atom.xml",
      site: "https://www.jiyang00.cn/",
      tags: [
        "\u6587\u5B66",
        "\u5C0F\u8BF4"
      ]
    },
    {
      id: "blog-f6f5d764a0461844",
      name: "anran758's blog",
      url: "https://anran758.github.io/blog/atom.xml",
      site: "https://anran758.github.io/blog/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF"
      ]
    },
    {
      id: "blog-b87b22385268c9d2",
      name: "\u601D\u6709\u4E91",
      url: "https://www.ioiox.com/feed",
      site: "https://www.ioiox.com/",
      tags: [
        "\u6280\u672F\u6559\u7A0B",
        "\u4E91\u670D\u52A1",
        "\u79C1\u6709\u4E91",
        "\u5B58\u50A8NAS",
        "\u7FA4\u6656\u6280\u5DE7",
        "Synology"
      ]
    },
    {
      id: "blog-fe65c811223015e5",
      name: "\u521D\u7B49\u8A18\u61B6\u9AD4",
      url: "https://axionl.me/index.xml",
      site: "https://axionl.me/",
      tags: [
        "Linux \u4F7F\u7528",
        "\u500B\u4EBA\u96A8\u7B46"
      ]
    },
    {
      id: "blog-43a5b34b952a5f9b",
      name: "\u53EF\u53EF\u6258\u6D77\u6CA1\u6709\u6D77",
      url: "https://darmau.co/zh/article/rss.xml",
      site: "https://darmau.co/zh",
      tags: [
        "\u8BBE\u8BA1",
        "\u524D\u7AEF",
        "\u6444\u5F71",
        "\u751F\u6D3B",
        "\u4EBA\u6587"
      ]
    },
    {
      id: "blog-bfd2596010870a4e",
      name: "\u4E94\u5206\u949F\u5B66\u7B97\u6CD5",
      url: "https://www.cxyxiaowu.com/feed",
      site: "https://www.cxyxiaowu.com/",
      tags: [
        "\u7B97\u6CD5",
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-85169e297a110589",
      name: "Tianke Youke",
      url: "https://jyzhu.top/atom.xml",
      site: "https://jyzhu.top/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14",
        "\u8BD7",
        "\u604B\u7231"
      ]
    },
    {
      id: "blog-3b0c5566198150bc",
      name: "\u7231\u5199\u4EE3\u7801\u7684\u5C0F\u4E66\u7AE5",
      url: "https://zofun.github.io/atom.xml",
      site: "https://zofun.github.io/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14",
        "\u540E\u7AEF"
      ]
    },
    {
      id: "blog-42a20d6f04f5c8cd",
      name: "Teach Talk",
      url: "https://www.ttalk.im/rss.xml",
      site: "https://www.ttalk.im/",
      tags: [
        "Web",
        "MQTT",
        "XMPP",
        "RabbitMQ",
        "\u7FFB\u8BD1"
      ]
    },
    {
      id: "blog-3fed2d065e7e6dd3",
      name: "\u9010\u9E7FIT-\u731B\u731B\u5982\u7389",
      url: "https://amonxu.com/atom.xml",
      site: "https://amonxu.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u601D\u8003",
        "\u968F\u7B14",
        "\u9B3C\u753B\u5F27"
      ]
    },
    {
      id: "blog-150384502afbf9ef",
      name: "Xiaoi's Blog",
      url: "https://blog.xiaoi.me/feed.xml",
      site: "https://blog.xiaoi.me/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F\u6559\u7A0B"
      ]
    },
    {
      id: "blog-c381219a8287a204",
      name: "\u5C0F\u863F\u8514\u4E01",
      url: "http://xlbd.me/rss/",
      site: "https://www.xlbd.me/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF"
      ]
    },
    {
      id: "blog-a643f33f4094f385",
      name: "Realcat",
      url: "https://www.vincentqin.tech/atom.xml",
      site: "https://www.vincentqin.tech/",
      tags: [
        "\u8BA1\u7B97\u673A\u89C6\u89C9",
        "\u7B97\u6CD5",
        "\u601D\u8003",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-75c0bc0845603dbc",
      name: "\u8303\u53F6\u4EAE\u7684\u535A\u5BA2",
      url: "https://leovan.me/cn/index.xml",
      site: "https://leovan.me/",
      tags: [
        "\u7F16\u7A0B",
        "\u7B97\u6CD5",
        "\u6570\u636E\u79D1\u5B66",
        "\u601D\u8003",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-6999904ab188ef17",
      name: "\u81EA\u7531\u4EBA\u7684 BLOG",
      url: "https://ifttl.com/index.xml",
      site: "https://ifttl.com/",
      tags: [
        "\u751F\u6D3B",
        "\u8BFB\u4E66",
        "\u968F\u60F3",
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-80ab1a4b1e262e69",
      name: "WEB VIEW",
      url: "https://webview.tech/category/blog/feed/",
      site: "https://webview.tech/",
      tags: [
        "\u6CDB\u79D1\u6280",
        "\u601D\u8003",
        "\u64AD\u5BA2"
      ]
    },
    {
      id: "blog-b570d106673e0661",
      name: "\u540E\u7AEF\u8FDB\u9636",
      url: "https://objcoding.github.io/feed.xml",
      site: "https://objcoding.com/",
      tags: [
        "Java\u3001Golang\u3001\u5206\u5E03\u5F0F\u4E2D\u95F4\u4EF6\u3001WEB\u6846\u67B6\u3001\u670D\u52A1\u6CBB\u7406\u7B49\u7B49"
      ]
    },
    {
      id: "blog-f5c832261388c944",
      name: "Yuexun's Blog",
      url: "https://yuexun.me/rss.xml",
      site: "https://yuexun.me/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-51f4cc54fedd80d1",
      name: "Panda Home",
      url: "https://old-panda.com/feed/",
      site: "https://old-panda.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-4e7b8be449ca2a45",
      name: "\u6E38\u9B42\u535A\u5BA2",
      url: "https://www.iyouhun.com/rss.php",
      site: "https://www.iyouhun.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF",
        "\u6280\u672F",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-4ebfc3e2eee56efc",
      name: "\u84DD\u5361",
      url: "https://www.lanka.cn/feed/",
      site: "https://www.lanka.cn/",
      tags: [
        "\u79D1\u6280",
        "\u6570\u7801",
        "\u6280\u672F",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-3c3ea76edaa18f5b",
      name: "\u81EA\u5B66\u8DEF\u6F2B\u6F2B",
      url: "https://blog.fxcdev.com/atom.xml",
      site: "https://blog.fxcdev.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-97388708ebdf8ee5",
      name: "CodeSky",
      url: "https://codesky.me/feed/",
      site: "https://codesky.me/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF",
        "\u540E\u7AEF",
        "\u8FD0\u7EF4",
        "\u6298\u817E"
      ]
    },
    {
      id: "blog-8daddbe6b8392ed2",
      name: "\u7A7A\u4E4B\u9886\u57DF",
      url: "https://xsky.me/atom.xml",
      site: "https://xsky.me/",
      tags: [
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-e744dd35c8c084c6",
      name: "Claude's Blog",
      url: "https://claude-ray.github.io/atom.xml",
      site: "https://claude-ray.github.io/",
      tags: [
        "\u7F16\u7A0B",
        "\u6298\u817E"
      ]
    },
    {
      id: "blog-1f5c5df214815c97",
      name: "Just lepture",
      url: "https://lepture.com/feed.xml",
      site: "https://lepture.com/",
      tags: [
        "\u521B\u4E1A",
        "\u5F00\u6E90",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-c3280f32e16aef76",
      name: "Lyric",
      url: "https://quaily.com/lyric/feed/atom",
      site: "https://quaily.com/lyric",
      tags: [
        "\u4EA7\u54C1",
        "\u521B\u4E1A",
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-ed65113e2a2a5608",
      name: "\u6851\u5F27\u84EC\u77E2\u5C04\u56DB\u65B9",
      url: "https://iphyer.github.io/feed.xml",
      site: "https://iphyer.github.io/",
      tags: [
        "\u6DF1\u5EA6\u5B66\u4E60",
        "\u79D1\u7814",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-50ae606b41003fa3",
      name: "\u6742\u8D27\u5C4B",
      url: "https://sword.studio/feed/",
      site: "https://sword.studio/",
      tags: [
        "\u6280\u672F",
        "\u5206\u4EAB",
        "\u8BB0\u5F55"
      ]
    },
    {
      id: "blog-b7412da14056332b",
      name: "\u6C90\u51C9",
      url: "https://blog.lacia.cn/atom.xml",
      site: "https://blog.lacia.cn/",
      tags: [
        "\u7F16\u7A0B",
        "Java"
      ]
    },
    {
      id: "blog-5f995f871f6a6908",
      name: "idealclover",
      url: "https://idealclover.top/feed",
      site: "https://idealclover.top/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14",
        "\u601D\u8003",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-56001a72fb123c90",
      name: "\u9752\u7A7A\u4E4B\u84DD",
      url: "https://blog.ixk.me/feed",
      site: "https://blog.ixk.me/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14",
        "Web\u5F00\u53D1"
      ]
    },
    {
      id: "blog-8e5a42c33428c76e",
      name: "\u708E\u5FCD\u7684\u535A\u5BA2",
      url: "https://blog.imyan.ren/atom.xml",
      site: "https://blog.imyan.ren/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14",
        "\u751F\u6D3B",
        "\u6298\u817E"
      ]
    },
    {
      id: "blog-d2f92363cb1dcd53",
      name: "\u554A\u54C8\u5475\u55E8\u7684\u535A\u5BA2",
      url: "https://gylidian.js.org/rss2.xml",
      site: "https://gylidian.js.org/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF",
        "\u5168\u6808",
        "\u4EFB\u5929\u5802",
        "\u4E13\u680F"
      ]
    },
    {
      id: "blog-3a21a4b89f97a522",
      name: "\u9648\u770B\u5DDD\u535A\u5BA2",
      url: "https://kanchuan.com/feed.xml",
      site: "https://kanchuan.com/blog",
      tags: [
        "iOS",
        "\u5F00\u53D1",
        "\u4EA7\u54C1",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-45002d82ae975e62",
      name: "\u5D0E\u5F84 \u5176\u955C\u8D75\u5B89\u742A\u7684\u535A\u5BA2",
      url: "http://www.z16388.top/atom.xml",
      site: "http://www.z16388.top/",
      tags: [
        "\u7F16\u7A0B",
        "\u6E38\u620F",
        "\u97F3\u4E50"
      ]
    },
    {
      id: "blog-377c4da9173f9a82",
      name: "The Art of Chawye Hsu",
      url: "https://chawyehsu.com/feed/atom.xml",
      site: "https://chawyehsu.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u6E38\u620F",
        "\u968F\u7B14",
        "\u6742\u8C08"
      ]
    },
    {
      id: "blog-2d19c7b16fc84aa9",
      name: "\u5415\u5C0F\u8363\u7684\u7F51\u5FD7",
      url: "https://mednoter.com/feed.xml",
      site: "https://mednoter.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-dd9f34fc194a0371",
      name: "\u52A0\u83F2\u732B\u7684\u521B\u5BA2\u5DE5\u574A",
      url: "https://gaficat.com/atom.xml",
      site: "https://gaficat.com/",
      tags: [
        "\u7535\u5B50DIY",
        "\u7269\u8054\u7F51",
        "\u751F\u6D3B",
        "\u6280\u672F\u6559\u7A0B",
        "\u94A2\u7434",
        "\u7F51\u7EDC\u5B89\u5168"
      ]
    },
    {
      id: "blog-348d8d1a07974006",
      name: "\u80E1\u6D82\u8BF4",
      url: "https://hutusi.com/feed.xml",
      site: "https://hutusi.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-8fea106c4ad20c19",
      name: "\u5F20\u4F73\u5706",
      url: "http://blog.jiayuanzhang.com/index.xml",
      site: "https://jiayuanzhang.com/",
      tags: [
        "\u7F16\u7A0B",
        "Python",
        "Web"
      ]
    },
    {
      id: "blog-7d6694d1acbb993e",
      name: "\u6731\u53CC\u5370",
      url: "https://www.zsythink.net/feed/",
      site: "https://www.zsythink.net/",
      tags: [
        "\u8FD0\u7EF4",
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-20d216ba06ae27e1",
      name: "HUHUHANG",
      url: "https://huhuhang.com/feed",
      site: "https://huhuhang.com/",
      tags: [
        "\u673A\u5668\u5B66\u4E60",
        "\u5E94\u7528\u63A8\u8350",
        "\u624B\u673A\u6444\u5F71"
      ]
    },
    {
      id: "blog-e917721610a29e9d",
      name: "\u5C0F\u660E\u660Es \xE0 domicile",
      url: "https://www.dongwm.com/atom.xml",
      site: "https://www.dongwm.com/",
      tags: [
        "\u7F16\u7A0B",
        "Python",
        "k8s",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-27de75be13582b9a",
      name: "LFhacks.com",
      url: "https://www.lfhacks.com/rss/",
      site: "https://www.lfhacks.com/",
      tags: [
        "\u65E5\u5FD7",
        "\u6D4B\u8BD5",
        "\u6570\u5B66"
      ]
    },
    {
      id: "blog-76fd607b53a9a56c",
      name: "oldj's blog",
      url: "https://oldj.net/feed",
      site: "https://oldj.net/",
      tags: [
        "\u7F16\u7A0B",
        "\u5199\u4F5C",
        "\u4EE5\u53CA\u6D82\u9E26"
      ]
    },
    {
      id: "blog-f75293e15e782440",
      name: "Yiran's Blog",
      url: "https://zdyxry.github.io/atom.xml",
      site: "https://zdyxry.github.io/",
      tags: [
        "\u7F16\u7A0B",
        "Linux"
      ]
    },
    {
      id: "blog-d1c5136b1e279133",
      name: "\u4E09\u7701\u543E\u8EAB\u4E36\u4E36",
      url: "https://blog.guowenfh.com/atom.xml",
      site: "https://blog.guowenfh.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-dd7d154239b0a5fe",
      name: "\u56DE\u672A\u89C6\u6212",
      url: "https://huiweishijie.com/feed.xml",
      site: "https://huiweishijie.com/",
      tags: [
        "\u8BBE\u8BA1",
        "\u8BFB\u4E66",
        "\u65E5\u8BB0"
      ]
    },
    {
      id: "blog-68f5e60ba215a736",
      name: "ITBOB'S BLOG",
      url: "https://www.itbob.cn/atom.xml",
      site: "https://www.itbob.cn/",
      tags: [
        "\u7F16\u7A0B",
        "Python",
        "\u722C\u866B",
        "\u6570\u636E\u5206\u6790"
      ]
    },
    {
      id: "blog-d9280314e61a4203",
      name: "\u8001\u9AD8\u7684\u535A\u5BA2",
      url: "https://blog.mute-g.com/index.xml",
      site: "https://blog.mute-g.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14",
        "\u67B6\u6784"
      ]
    },
    {
      id: "blog-6485ec63ee4025ee",
      name: "CallMeSoul",
      url: "https://callmesoul.cn/rss.xml",
      site: "https://callmesoul.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF"
      ]
    },
    {
      id: "blog-65e38a140b5cf256",
      name: "\u9F9A\u6210\u535A\u5BA2",
      url: "https://laogongshuo.com/feed",
      site: "https://laogongshuo.com/",
      tags: [
        "\u968F\u60F3",
        "\u7F16\u7A0B",
        "\u54F2\u5B66",
        "\u7ECF\u6D4E\u5B66"
      ]
    },
    {
      id: "blog-1d4c33d20f258cd3",
      name: "Seven's blog",
      url: "https://blog.diqigan.cn/atom.xml",
      site: "https://blog.diqigan.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14",
        "Geek",
        "Java",
        "Linux"
      ]
    },
    {
      id: "blog-60e278f8c73ef8b7",
      name: "\u6728\u571F\u91D1\u738B\u53EF",
      url: "https://kinnoukabokudo.com/feed",
      site: "https://kinnoukabokudo.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-4dd08cacf8a2463c",
      name: "\u6CBB\u90E8\u5C11\u8F85",
      url: "https://www.codewoody.com/atom.xml",
      site: "https://www.codewoody.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14",
        "\u65B0\u95FB"
      ]
    },
    {
      id: "blog-9c603d7244c03ceb",
      name: "CRIMX Blog",
      url: "https://blog.crimx.com/rss.xml",
      site: "https://blog.crimx.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF",
        "\u5F00\u6E90",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-288b15f238095021",
      name: "\u5C0F\u975E\u7684\u7269\u7406\u5C0F\u7AD9",
      url: "https://xiaophy.com/feed.xml",
      site: "https://xiaophy.com/",
      tags: [
        "\u7269\u7406",
        "\u5F00\u653E\u79D1\u5B66",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-0cf1e86d5ab96b2f",
      name: "Michael\u7FD4",
      url: "https://michael728.github.io/atom.xml",
      site: "https://michael728.github.io/",
      tags: [
        "\u7F16\u7A0B",
        "DevOps",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-ab324d7aa380df02",
      name: "Dosk \u6280\u672F\u7AD9",
      url: "https://dosk.win/feed.xml",
      site: "https://dosk.win/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF",
        "C++"
      ]
    },
    {
      id: "blog-16db9e923109dad2",
      name: "Lu Shuyu",
      url: "https://blog.lushuyu.site/feed/",
      site: "https://blog.lushuyu.site/",
      tags: [
        "\u7F16\u7A0B",
        "OI",
        "\u968F\u7B14",
        "\u601D\u8003"
      ]
    },
    {
      id: "blog-00464e19be0e959e",
      name: "Xieisabug",
      url: "https://www.xiejingyang.com/feed/",
      site: "https://www.xiejingyang.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF",
        "\u968F\u7B14",
        "\u601D\u8003",
        "\u521B\u610F"
      ]
    },
    {
      id: "blog-d282470aaadffce1",
      name: "\u90D1\u6CFD\u946B\u7684\u535A\u5BA2",
      url: "https://zhengzexin.com/feed/",
      site: "https://zhengzexin.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u7269\u4FE1\u606F\u5B66",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-bfec11696518c0f6",
      name: "\u8F76\u54E5\u535A\u5BA2",
      url: "https://www.wyr.me/rss.xml",
      site: "https://www.wyr.me/",
      tags: [
        "\u7F16\u7A0B",
        "\u5168\u6808",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-50baacc6123a5e95",
      name: "\u6E05\u7AF9\u8336\u9986\u535A\u5BA2",
      url: "https://blog.vadxq.com/atom.xml",
      site: "https://blog.vadxq.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF",
        "\u5168\u6808",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-d667eda9358732e2",
      name: "YeungYeah \u7684\u4E71\u5199\u5730",
      url: "http://scottyeung.top/atom.xml",
      site: "https://scottyeung.top/",
      tags: [
        "\u7F16\u7A0B",
        "\u7B97\u6CD5",
        "\u968F\u7B14",
        "\u7384\u5B66"
      ]
    },
    {
      id: "blog-514ccd26ad2733c6",
      name: "LarsCheng",
      url: "https://www.larscheng.com/atom.xml",
      site: "https://www.larscheng.com/",
      tags: [
        "\u7F16\u7A0B",
        "Java",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-cac85ff1db0b1cf1",
      name: "Origin",
      url: "https://blog.singee.me/atom.xml",
      site: "https://blog.singee.me/",
      tags: [
        "\u7F16\u7A0B",
        "Python",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-aa93c645a5c422c1",
      name: "Bryan's Blog",
      url: "https://articles.singee.me/feed/xml",
      site: "https://articles.singee.me/",
      tags: [
        "\u7F16\u7A0B",
        "\u5168\u6808",
        "Go",
        "\u4EA7\u54C1"
      ]
    },
    {
      id: "blog-b4a14695af1a5075",
      name: "\u7801\u5FD7",
      url: "https://mazhuang.org/feed.xml",
      site: "https://mazhuang.org/",
      tags: [
        "\u7F16\u7A0B",
        "Java",
        "Android"
      ]
    },
    {
      id: "blog-918c7fc3e3df7ad4",
      name: "\u5317\u95E8\u6E05\u71D5",
      url: "https://www.bmqy.net/feed.xml",
      site: "https://www.bmqy.net/",
      tags: [
        "\u751F\u6D3B",
        "\u968F\u7B14",
        "\u524D\u7AEF"
      ]
    },
    {
      id: "blog-4a5f19f8d8760c78",
      name: "Joe's Blog",
      url: "https://hijiangtao.github.io/feed.xml",
      site: "https://hijiangtao.github.io/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-1f68e32aa8838e17",
      name: "Yuechuan Blog",
      url: "https://yuechuanx.top/atom.xml",
      site: "https://yuechuanx.top/",
      tags: [
        "\u7F16\u7A0B",
        "DevOps",
        "Automation"
      ]
    },
    {
      id: "blog-0f4a531ff95f4467",
      name: "\u7D20\u751F",
      url: "http://z.arlmy.me/atom.xml",
      site: "https://z.arlmy.me/",
      tags: [
        "\u968F\u7B14",
        "\u5199\u4F5C",
        "\u65C5\u884C",
        "\u65E5\u5E38",
        "\u8BFB\u4E66"
      ]
    },
    {
      id: "blog-6b7bf8819d5b9d5c",
      name: "\u7EF4\u57FA\u840C",
      url: "https://www.wikimoe.com/rss.php",
      site: "https://www.wikimoe.com/",
      tags: [
        "\u52A8\u753B",
        "\u6F2B\u753B",
        "\u6E38\u620F",
        "\u65E5\u5E38",
        "\u524D\u7AEF"
      ]
    },
    {
      id: "blog-96521b4ab7a5057e",
      name: "strongwong's Blog",
      url: "https://blog.strongwong.top/atom.xml",
      site: "https://blog.strongwong.top/",
      tags: [
        "\u7F16\u7A0B",
        "\u5D4C\u5165\u5F0F",
        "ASIC",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-723a02abb420b4f6",
      name: "\u4FDD\u7F57\u7684\u5C0F\u5B87\u5B99",
      url: "https://paugram.com/feed",
      site: "https://paugram.com/",
      tags: [
        "\u751F\u6D3B",
        "\u968F\u7B14",
        "\u524D\u7AEF",
        "\u52A8\u6F2B",
        "\u6570\u7801"
      ]
    },
    {
      id: "blog-5b826e5a77e242bc",
      name: "typeblog",
      url: "https://typeblog.net/rss/",
      site: "https://typeblog.net/",
      tags: [
        "Linux",
        "\u9690\u79C1",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-ac46da0eb01d5b10",
      name: "HuoJu's BLOG",
      url: "https://jhuo.ca/index.xml",
      site: "https://jhuo.ca/",
      tags: [
        "\u9690\u79C1",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-5810c2d742a97f66",
      name: "MikeoPerfect's Diary",
      url: "http://blog.mikeoperfect.com/atom.xml",
      site: "https://blog.mikeoperfect.com/",
      tags: [
        "\u751F\u6D3B",
        "\u65E5\u5FD7"
      ]
    },
    {
      id: "blog-5f7af4472d7ce976",
      name: "\u6A59\u5149\u7B14\u8BB0",
      url: "https://www.kai666666.top/atom.xml",
      site: "https://www.kai666666.top/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF",
        "\u7B14\u8BB0",
        "\u8FD0\u52A8"
      ]
    },
    {
      id: "blog-0fbf017b28e14260",
      name: "Mobility",
      url: "http://lichuanyang.top/atom.xml",
      site: "https://lichuanyang.top/",
      tags: [
        "\u7F16\u7A0B",
        "\u540E\u7AEF",
        "java"
      ]
    },
    {
      id: "blog-fda92d05b2a62935",
      name: "not LSD",
      url: "https://notlsd.github.io/atom.xml",
      site: "https://notlsd.github.io/",
      tags: [
        "\u7F16\u7A0B",
        "\u6E38\u620F\u8BBE\u8BA1",
        "\u65C5\u884C"
      ]
    },
    {
      id: "blog-a1e7007ac1db274d",
      name: "\u5931\u7720\u6D77\u5CE1",
      url: "https://blog.imalan.cn/feed.xml",
      site: "https://blog.imalan.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u65E5\u5E38",
        "\u4E8C\u6B21\u5143",
        "\u8BFB\u4E66"
      ]
    },
    {
      id: "blog-bb6b5464362a27f5",
      name: "DuyaoSS",
      url: "https://www.duyaoss.com/feed/",
      site: "https://www.duyaoss.com/",
      tags: [
        "SS",
        "SSR"
      ]
    },
    {
      id: "blog-8ccc78c03371cd68",
      name: "\u6728\u5B50",
      url: "https://blog.k8s.li/atom.xml",
      site: "https://blog.k8s.li/",
      tags: [
        "Linux",
        "\u79D1\u5B66\u4E0A\u7F51",
        "\u8BFB\u4E66\u7B14\u8BB0",
        "\u8FD0\u7EF4",
        "\u9690\u79C1",
        "android"
      ]
    },
    {
      id: "blog-9c827581efe52ebf",
      name: "wuxinhua's Blog",
      url: "https://wuxinhua.com/atom.xml",
      site: "https://wuxinhua.com/",
      tags: [
        "\u751F\u6D3B",
        "\u7F16\u7A0B",
        "\u968F\u60F3"
      ]
    },
    {
      id: "blog-c6e2d635ae279299",
      name: "\u9759\u304B\u306A\u68EE",
      url: "https://innei.ren/feed",
      site: "https://innei.ren/",
      tags: [
        "\u751F\u6D3B",
        "\u968F\u7B14",
        "\u524D\u7AEF",
        "\u52A8\u6F2B"
      ]
    },
    {
      id: "blog-080b5ee8aadea69a",
      name: "\u571F\u6728\u575B\u5B50",
      url: "https://tumutanzi.com/feed",
      site: "https://tumutanzi.com/",
      tags: [
        "\u79D1\u7814\u5B66\u4E60",
        "\u793E\u4F1A\u4EBA\u6587",
        "\u4FE1\u606F\u6280\u672F",
        "\u56FD\u5916\u89C1\u95FB"
      ]
    },
    {
      id: "blog-e8c249e5e6a6d739",
      name: "seisamuse",
      url: "https://www.seis-jun.xyz/atom.xml",
      site: "https://seis-jun.xyz/",
      tags: [
        "\u79D1\u7814",
        "\u5B66\u4E60",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-ab51a6d5e4aa5504",
      name: "\u722A\u54C7\u5802",
      url: "https://www.javatang.com/feed",
      site: "https://www.javatang.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-c596fb3388eb45a3",
      name: "\u6697\u65E0\u5929\u65E5",
      url: "https://www.lujun9972.win/rss.xml",
      site: "https://www.lujun9972.win/",
      tags: [
        "Emacs",
        "Linux"
      ]
    },
    {
      id: "blog-c0274fa6af6aaff4",
      name: "Jacky's Blog",
      url: "https://jw1.dev/atom.xml",
      site: "https://jw1.dev/",
      tags: [
        "\u524D\u7AEF",
        "\u751F\u6D3B",
        "\u6280\u672F",
        "\u97F3\u4E50"
      ]
    },
    {
      id: "blog-b3c6bb4d29f1f5e0",
      name: "\u738B\u6B23\u7684\u535A\u5BA2",
      url: "https://wangxin.io/atom.xml",
      site: "https://wangxin.io/",
      tags: [
        "\u540E\u7AEF",
        "\u5F00\u6E90",
        "RPC",
        "\u5FAE\u670D\u52A1"
      ]
    },
    {
      id: "blog-f81c3e70465442a1",
      name: "Jartto's Blog",
      url: "http://jartto.wang/atom.xml",
      site: "http://jartto.wang/",
      tags: [
        "\u524D\u7AEF",
        "\u67B6\u6784",
        "\u4EBA\u5DE5\u667A\u80FD"
      ]
    },
    {
      id: "blog-010630d2d9e7309d",
      name: "ScarSu\u7684\u4E2A\u4EBA\u7F51\u7AD9",
      url: "https://www.scarsu.com/atom.xml",
      site: "https://www.scarsu.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF",
        "\u601D\u8003"
      ]
    },
    {
      id: "blog-6d4aa90eb2ce3fd6",
      name: "Lucien's Blog",
      url: "https://blog.lucien.ink/feed/",
      site: "https://blog.lucien.ink/",
      tags: [
        "\u7F16\u7A0B",
        "\u7B97\u6CD5",
        "\u540E\u7AEF",
        "ACM",
        "\u601D\u8003"
      ]
    },
    {
      id: "blog-b6e2dba2cc85bcbf",
      name: "\u62AB\u8428\u76D2\u7684\u535A\u5BA2",
      url: "https://blog.pushihao.com/atom.xml",
      site: "https://blog.pushihao.com/",
      tags: [
        "\u7F16\u7A0B",
        "AI",
        "\u5168\u6808",
        "\u601D\u8003",
        "\u7B14\u8BB0",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-8d457aa3e159c244",
      name: "TonyHe \u7684\u535A\u5BA2",
      url: "https://www.ouorz.com/feed",
      site: "https://www.ouorz.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u601D\u8003",
        "\u524D\u7AEF",
        "\u7B14\u8BB0",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-dc63e10f66f56d63",
      name: "\u683C\u7269\u81F4\u77E5",
      url: "https://liqiang.io/atom.xml",
      site: "https://liqiang.io/",
      tags: [
        "\u7F16\u7A0B",
        "\u540E\u53F0",
        "Go",
        "Kubernetes",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-fcf925887fb41d05",
      name: "\u9EC4\u7426\u96F2\u7684\u535A\u5BA2",
      url: "https://knightyun.github.io/feed.xml",
      site: "https://knightyun.github.io/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF",
        "Linux",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-51b911a262d5da72",
      name: "\u9633\u5FD7\u5E73\u7684\u7F51\u5FD7",
      url: "https://www.yangzhiping.com/feed.xml",
      site: "https://www.yangzhiping.com/",
      tags: [
        "\u8BA4\u77E5\u79D1\u5B66",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-d3fa90ca44b78fe2",
      name: "\u9648\u534E",
      url: "https://www.chen.fun/index.xml",
      site: "https://www.chen.fun/",
      tags: [
        "\u7269\u7406",
        "\u79D1\u7814",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-26fc1440f9d006ac",
      name: "Chores",
      url: "https://raincorn.top/feed/",
      site: "https://raincorn.top/",
      tags: [
        "\u8BA1\u7B97\u673A",
        "\u7F51\u7EDC",
        "\u65E5\u5E38"
      ]
    },
    {
      id: "blog-878b663ac6a24906",
      name: "\u987E\u5B87\u7684\u7814\u4E60\u7B14\u8BB0",
      url: "https://www.guyu.me/posts/index.xml",
      site: "https://www.guyu.me/posts/",
      tags: [
        "\u7F16\u7A0B",
        "\u5FAE\u670D\u52A1",
        "DevOps",
        "\u7814\u53D1\u6548\u80FD",
        "\u7814\u53D1\u4F53\u7CFB",
        "\u4E91\u8BA1\u7B97"
      ]
    },
    {
      id: "blog-2057f0239edfa56f",
      name: "\u5C0F\u718A\u5199\u5B57\u7684\u5730\u65B9",
      url: "https://blog.skrskrskrskr.com/atom.xml",
      site: "https://blog.skrskrskrskr.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-468387d23182071c",
      name: "\u7F16\u7A0B\u6C89\u601D\u5F55",
      url: "https://www.cyhone.com/atom.xml",
      site: "https://www.cyhone.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u540E\u7AEF"
      ]
    },
    {
      id: "blog-66160679a0916eb0",
      name: "LiesAuer's Blog",
      url: "https://www.liesauer.net/blog/feed/",
      site: "https://www.liesauer.net/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-e42a3230b7bbfb8e",
      name: "Blog of Music",
      url: "http://www.blogofmusic.com/feed",
      site: "https://www.blogofmusic.com/",
      tags: [
        "\u97F3\u4E50",
        "\u97F3\u4E50\u63A8\u8350",
        "\u97F3\u4E50\u6587\u5316"
      ]
    },
    {
      id: "blog-49256183b3be61fc",
      name: "Beyond the Void",
      url: "https://www.byvoid.com/feed",
      site: "https://www.byvoid.com/",
      tags: [
        "\u8BED\u8A00\u5B66",
        "\u7ECF\u6D4E\u5B66",
        "\u4FE1\u606F\u5B66\u7ADE\u8D5B/ACM\u7ECF\u9A8C",
        "\u7B97\u6CD5\u8BB2\u89E3",
        "\u6280\u672F\u77E5\u8BC6",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-9115c269d8b187c7",
      name: "Yi's blog",
      url: "https://wangyi.ai/atom.xml",
      site: "https://wangyi.ai/",
      tags: [
        "C++",
        "LeetCode",
        "Python",
        "iOS",
        "\u5DE5\u5177\u6D3B\u7528",
        "\u8BD1\u6587",
        "\u8BFB\u4E66\u7B14\u8BB0",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-f2fe842bf873f331",
      name: "1 Byte",
      url: "https://1byte.io/rss.xml",
      site: "https://1byte.io/",
      tags: [
        "\u521B\u4E1A",
        "\u6295\u8D44",
        "\u7F16\u7A0B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-60bbc97c8d8f0f2e",
      name: "Inevitable",
      url: "https://www.inevitable.tech/atom.xml",
      site: "https://www.inevitable.tech/",
      tags: [
        "\u5927\u5B66",
        "\u7F16\u7A0B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-1d016b12fa51096b",
      name: "BMPI",
      url: "https://www.bmpi.dev/index.xml",
      site: "https://www.bmpi.dev/",
      tags: [
        "Learn",
        "Dev",
        "Trade"
      ]
    },
    {
      id: "blog-a5f966b7addc4ab6",
      name: "61's life",
      url: "https://61.life/feed.xml",
      site: "https://61.life/",
      tags: [
        "\u521B\u4E1A",
        "\u7BA1\u7406",
        "\u4EA7\u54C1"
      ]
    },
    {
      id: "blog-072710b3a5147cdf",
      name: "Power's Wiki",
      url: "https://wiki-power.com/feed_rss_updated.xml",
      site: "https://wiki-power.com/",
      tags: [
        "\u786C\u4EF6",
        "\u7F16\u7A0B",
        "\u751F\u6D3B\u65B9\u5F0F",
        "\u8BFB\u4E66"
      ]
    },
    {
      id: "blog-1e3c4c3ec52c9727",
      name: "\u77AC\u95F4 Press",
      url: "https://tripper.press/atom.xml",
      site: "https://tripper.press/",
      tags: [
        "\u6444\u5F71",
        "\u6587\u5316\u4EA7\u4E1A",
        "\u65B0\u5A92\u4F53"
      ]
    },
    {
      id: "blog-0f0675d954f81a34",
      name: "\u672A\u77E5\u7684\u4E16\u754C",
      url: "http://lulalap.com/atom.xml",
      site: "http://lulalap.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-d9a5290c8b058368",
      name: "shingle's blog",
      url: "https://shingle.me/index.xml",
      site: "https://shingle.me/",
      tags: [
        "\u6280\u672F",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-f56fe05fe69fc5d3",
      name: "@Lenciel",
      url: "https://lenciel.com/feed.xml",
      site: "https://lenciel.com/",
      tags: [
        "\u6280\u672F",
        "\u7BA1\u7406",
        "\u521B\u4E1A",
        "\u5439\u6C34"
      ]
    },
    {
      id: "blog-b62257ce3c26980a",
      name: "M-x Chris-An-Emacser",
      url: "https://chriszheng.science/atom.xml",
      site: "https://chriszheng.science/",
      tags: [
        "\u968F\u7B14",
        "Emacs"
      ]
    },
    {
      id: "blog-142a80726d5d72af",
      name: "\u7B2C\u4E03\u661F\u5C18\u7684\u72EC\u7ACB\u535A\u5BA2",
      url: "https://blog.star7th.com/feed",
      site: "https://blog.star7th.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u5F00\u6E90",
        "\u6280\u672F\u4EBA\u751F"
      ]
    },
    {
      id: "blog-12fd20a567003e9c",
      name: "Chino's Workspace",
      url: "https://chinomars.github.io/atom.xml",
      site: "https://chinomars.github.io/",
      tags: [
        "\u7F16\u8BD1\u5668",
        "\u7F16\u7A0B",
        "\u7BA1\u7406"
      ]
    },
    {
      id: "blog-e8fea68a68d8df0a",
      name: "chattymoney(\u8DDF\u6211\u4E00\u8D77\u6765\u8C08\u94B1)",
      url: "https://chattymoney.com/feed/",
      site: "https://chattymoney.com/",
      tags: [
        "\u7406\u8D22"
      ]
    },
    {
      id: "blog-8155d04faac4059b",
      name: "TCPGNL",
      url: "https://tcpgnl.com/feed/",
      site: "https://tcpgnl.com/",
      tags: [
        "\u8BA4\u77E5",
        "\u7F16\u7A0B",
        "\u968F\u60F3",
        "\u751F\u6D3B",
        "\u601D\u8003"
      ]
    },
    {
      id: "blog-054b30288f5a58f3",
      name: "weirane's blog",
      url: "https://weirane.github.io/feed.xml",
      site: "https://weirane.github.io/",
      tags: [
        "\u7F16\u7A0B",
        "Linux",
        "Rust"
      ]
    },
    {
      id: "blog-4479341ac2c69e62",
      name: "Joway's Blog",
      url: "https://blog.joway.io/index.xml",
      site: "https://blog.joway.io/",
      tags: [
        "\u7F16\u7A0B",
        "\u65C5\u884C",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-59214f0e8a79de75",
      name: "Mayx\u7684\u535A\u5BA2",
      url: "https://mabbs.github.io/atom.xml",
      site: "https://mabbs.github.io/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-d9e327f8d1291c3c",
      name: "Rapiz's Blog",
      url: "https://rapiz.me/atom.xml",
      site: "https://rapiz.me/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-dbb6ee285410475e",
      name: "Ground Oddity",
      url: "http://idle.systems/atom.xml",
      site: "http://idle.systems/",
      tags: [
        "\u7F16\u7A0B",
        "\u65C5\u884C",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-dd77e2bc468a31ef",
      name: "\u59EC\u6D9B\u7684\u4E2A\u4EBA\u7F51\u7AD9",
      url: "https://www.jitao.tech/rss.xml",
      site: "https://www.jitao.tech/",
      tags: [
        "\u79D1\u6280",
        "\u5168\u6808",
        "\u7B14\u8BB0",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-106511c832fa66da",
      name: "\u6570\u5B57\u79FB\u6C11\u535A\u5BA2",
      url: "https://blog.shuziyimin.org/feed",
      site: "https://blog.shuziyimin.org/",
      tags: [
        "\u6570\u5B57\u79FB\u6C11",
        "\u751F\u6D3B\u65B9\u5F0F",
        "\u82F1\u8BED"
      ]
    },
    {
      id: "blog-065afdbc047aca73",
      name: "Bob Jiang's Blog",
      url: "https://www.bobjiang.com/index.xml",
      site: "https://www.bobjiang.com/",
      tags: [
        "\u654F\u6377",
        "Scrum",
        "\u9AD8\u6548\u80FD\u7EC4\u7EC7",
        "\u4E2A\u4EBA\u6210\u957F"
      ]
    },
    {
      id: "blog-db85f6fd4ad90cfc",
      name: "\u6E05\u8A00",
      url: "https://plausistory.blog/feed/",
      site: "https://plausistory.blog/",
      tags: [
        "\u4EBA\u6587",
        "\u6E05\u53F2\u7814\u7A76",
        "\u8BFB\u4E66"
      ]
    },
    {
      id: "blog-ef833a8df661afe3",
      name: "\u51C9\u5929\u5BA2\u6808",
      url: "https://earture.org/atom.xml",
      site: "https://earture.org/",
      tags: [
        "\u6280\u672F",
        "\u968F\u7B14",
        "\u97F3\u4E50"
      ]
    },
    {
      id: "blog-b1ab899ab5b22864",
      name: "\u8FD1\u89C6\u773C\u901B\u535A\u5BA2",
      url: "https://blog.9hz.club/feed/",
      site: "https://blog.9hz.club/",
      tags: [
        "\u968F\u7B14",
        "\u751F\u6D3B",
        "\u5206\u4EAB"
      ]
    },
    {
      id: "blog-b3d39e2a69e8e907",
      name: "\u5F71\u7559",
      url: "https://leftshadow.com/?call_custom_simple_rss=1&csrp_cat=11",
      site: "https://leftshadow.com/",
      tags: [
        "\u8BFB\u4E66",
        "\u5FF5\u7ECF"
      ]
    },
    {
      id: "blog-c0e524fda00bcdaf",
      name: "wzyboy's blog",
      url: "https://wzyboy.im/feed.xml",
      site: "https://wzyboy.im/",
      tags: [
        "\u79D1\u6280",
        "\u8FD0\u7EF4",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-ba3d7b8f874aaf21",
      name: "beyond stars",
      url: "https://beyondstars.xyz/api/feeds/atom",
      site: "https://beyondstars.xyz/",
      tags: [
        "\u63A2\u7D22",
        "\u601D\u8003",
        "\u8BB0\u5F55"
      ]
    },
    {
      id: "blog-ce13fbce9bf1f9fe",
      name: "iPotato",
      url: "https://ipotato.me/feed",
      site: "https://ipotato.me/",
      tags: [
        "\u6280\u672F",
        "\u601D\u8003",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-b942ff6758c017a0",
      name: "\u4E09\u5E1B\u7684\u4E16\u754C",
      url: "https://blog.vvzero.com/atom.xml",
      site: "https://blog.vvzero.com/",
      tags: [
        "\u8F6F\u786C\u4EF6\u5168\u6808\u5F00\u53D1",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-6a63a60e2190d1d0",
      name: "HCLonely",
      url: "https://blog.hclonely.com/atom.xml",
      site: "https://blog.hclonely.com/",
      tags: [
        "\u524D\u7AEF",
        "\u4E8C\u6B21\u5143",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-86b0885ec0f057bc",
      name: "\u6A35\u592B\u7684\u5C0F\u7AD9",
      url: "https://geofftools.cn/blog/atom.xml",
      site: "https://geofftools.cn/blog/",
      tags: [
        "\u7F16\u7A0B",
        "Swift",
        "Python"
      ]
    },
    {
      id: "blog-1e537306467833ff",
      name: "\u7535\u6CE2\u969C\u5BB3",
      url: "https://www.sund.site/index.xml",
      site: "https://sund.site/",
      tags: [
        "\u6570\u5B57\u751F\u6D3B",
        "\u6587\u5316",
        "\u67B6\u6784"
      ]
    },
    {
      id: "blog-252db6e0d38cbce9",
      name: "\u4E00\u4E2A\u574F\u6389\u7684\u756A\u8304",
      url: "https://tomotoes.com/blog/atom.xml",
      site: "https://tomotoes.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u601D\u8003"
      ]
    },
    {
      id: "blog-cc6d108b362b21ca",
      name: "DHTalk's Blog",
      url: "https://zhangdinghao.cn/atom.xml",
      site: "https://zhangdinghao.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u9605\u8BFB",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-eefafe1d5c6d1ab3",
      name: "shwei's blog",
      url: "http://weisenhui.top/atom.xml",
      site: "http://weisenhui.top/",
      tags: [
        "\u7F16\u7A0B",
        "\u7B97\u6CD5",
        "\u601D\u8003"
      ]
    },
    {
      id: "blog-574f61ef29d6ab0c",
      name: "MiaoTony's Blog",
      url: "https://miaotony.xyz/atom.xml",
      site: "https://miaotony.xyz/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u6298\u817E",
        "\u751F\u6D3B",
        "EE"
      ]
    },
    {
      id: "blog-8e6c623ca054bf0e",
      name: "ryank231231.blog",
      url: "https://ryank231231.top/feed/",
      site: "https://ryank231231.top/",
      tags: [
        "\u751F\u6D3B",
        "\u968F\u7B14",
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-3b283625c87dd3db",
      name: "RivenNero's Studio",
      url: "https://rivennero.com/atom.xml",
      site: "https://rivennero.com/",
      tags: [
        "\u8BA1\u7B97\u673A",
        "\u79D1\u6280",
        "\u751F\u6D3B",
        "\u52A8\u6F2B"
      ]
    },
    {
      id: "blog-aabb7cdc5d0ee2b8",
      name: "\u6398\u5893\u4EBA\u7684\u5C0F\u94F2\u5B50",
      url: "https://juemuren4449.com/atom.xml",
      site: "https://juemuren4449.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u5FAE\u4FE1",
        "\u652F\u4ED8",
        "\u6548\u7387"
      ]
    },
    {
      id: "blog-0fdab2fa17279fff",
      name: "Hwchiu Learning Note",
      url: "https://hwchiu.com/atom.xml",
      site: "https://hwchiu.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "Kubernetes",
        "Linux",
        "Networking"
      ]
    },
    {
      id: "blog-bcd8bd84eb1449e6",
      name: "JieJiSS' Blog",
      url: "https://blog.jiejiss.com/atom.xml",
      site: "https://blog.jiejiss.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u7B97\u6CD5",
        "\u5BC6\u7801\u5B66",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-85c7256c513d8dc2",
      name: "the wandering potato \u51FA\u904A\u7684\u571F\u8C46",
      url: "https://thewanderingpotato.github.io/feed.xml",
      site: "https://thewanderingpotato.github.io/",
      tags: [
        "\u968F\u7B14",
        "\u751F\u6D3B",
        "\u6444\u5F71"
      ]
    },
    {
      id: "blog-e5ab98a705794ba8",
      name: "\u5C0F\u7092\u8089",
      url: "https://jicki.cn/index.xml",
      site: "https://jicki.cn/",
      tags: [
        "Kubernetes",
        "\u8FD0\u7EF4",
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-742c028712696ac8",
      name: "\u9038\u6587\u7B14\u8BB0EvenNotes",
      url: "https://www.evennotes.cn/atom.xml",
      site: "https://www.evennotes.cn/",
      tags: [
        "\u65F6\u653F",
        "\u54F2\u5B66",
        "\u5386\u53F2"
      ]
    },
    {
      id: "blog-6c404285e3ddfa73",
      name: "\u6851\u6CB3\u4E00\u6986",
      url: "https://justpic.org/index.xml",
      site: "https://justpic.org/",
      tags: [
        "\u4EE3\u7801",
        "\u5DE5\u5177",
        "\u9605\u8BFB",
        "\u6587\u7AE0"
      ]
    },
    {
      id: "blog-6e48b98bacadf0df",
      name: "Tinyfool\u7684\u4E2D\u6587Blog",
      url: "https://codechina.org/feed/",
      site: "https://codechina.org/",
      tags: [
        "\u4EE3\u7801",
        "\u8BFB\u4E66",
        "\u5386\u53F2",
        "\u7ECF\u6D4E"
      ]
    },
    {
      id: "blog-54b6bcf06f751b8e",
      name: "Muyun\u7684\u6742\u8C08",
      url: "https://muyun.work/feed/",
      site: "https://muyun.work/",
      tags: [
        "\u79D1\u6280",
        "\u751F\u6D3B",
        "\u7B97\u6CD5",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-77bf5180672c0618",
      name: "\u741A\u81F4\u8FDC",
      url: "https://wineso.me/index.xml",
      site: "https://wineso.me/blog",
      tags: [
        "\u7F16\u7A0B",
        "\u81EA\u7531\u804C\u4E1A",
        "\u751F\u6D3B",
        "\u601D\u8003"
      ]
    },
    {
      id: "blog-1767d2f30b193756",
      name: "\u8001\u5F20\u8BF4\u601D\u8DEF",
      url: "https://www.aceact.com/feed/",
      site: "https://www.aceact.com/",
      tags: [
        "\u9879\u76EE\u7BA1\u7406"
      ]
    },
    {
      id: "blog-a9b59439bcb74b90",
      name: "\u4E8C\u4E2B\u8BB2\u68B5",
      url: "https://wiki.eryajf.net/rss.xml",
      site: "https://wiki.eryajf.net/",
      tags: [
        "\u8FD0\u7EF4",
        "\u601D\u7D22",
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-80d0769d0d36814f",
      name: "Wulu's Blog",
      url: "https://wulu.zone/feed/post.xml",
      site: "https://wulu.zone/",
      tags: [
        "\u7B14\u8BB0",
        "\u7ECF\u9A8C\u5206\u4EAB",
        "\u5B66\u4E60",
        "\u6559\u80B2"
      ]
    },
    {
      id: "blog-373b4e4903588322",
      name: "RAIS",
      url: "https://ai.renyuzhuo.cn/atom.xml",
      site: "https://ai.renyuzhuo.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u4EBA\u5DE5\u667A\u80FD",
        "\u6DF1\u5EA6\u5B66\u4E60"
      ]
    },
    {
      id: "blog-987b6e853fff3177",
      name: "L1Yu's Blog - \u84DD\u8272\u7684\u535A\u5BA2",
      url: "https://www.l1yu.com/feed/feed.xml",
      site: "https://www.l1yu.com/",
      tags: [
        "\u6280\u672F",
        "\u6298\u817E",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-99e02ecde458ae87",
      name: "\u91CE\u751F\u7A0B\u5E8F\u7334\u5B50",
      url: "https://ljason.cn/atom.xml",
      site: "https://ljason.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u6298\u817E",
        "\u7FFB\u8BD1"
      ]
    },
    {
      id: "blog-12a12ebde871c27b",
      name: "\u4E0D\u5410\u4E0D\u5FEB",
      url: "https://mianao.info/atom.xml",
      site: "https://mianao.info/",
      tags: [
        "\u751F\u6D3B",
        "\u786C\u4EF6",
        "\u6559\u7A0B",
        "DIY"
      ]
    },
    {
      id: "blog-e77f8f4ac8e6d6d4",
      name: "\u6D77\u5E03\u91CC\u5929\u4E95",
      url: "https://blog.feimind.xyz/feed.xml",
      site: "https://blog.feimind.xyz/",
      tags: [
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-101ecade312a5a74",
      name: "Jay Zangwill\u7684\u535A\u5BA2",
      url: "https://jayzangwill.github.io/blog/atom.xml",
      site: "https://jayzangwill.github.io/blog/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-e5795c6d62623fca",
      name: "Dawner",
      url: "https://dawner.top/atom.xml",
      site: "https://dawner.top/",
      tags: [
        "\u751F\u6D3B",
        "\u6587\u5B66",
        "\u827A\u672F",
        "\u54F2\u5B66"
      ]
    },
    {
      id: "blog-5a95fa14ebe037a1",
      name: "\u6DAF\u4F59",
      url: "https://yanhang.me/index.xml",
      site: "https://yanhang.me/",
      tags: [
        "\u7F16\u7A0B",
        "\u601D\u8003"
      ]
    },
    {
      id: "blog-8689a021c075f642",
      name: "Frost's Blog",
      url: "https://frost-lee.github.io/atom.xml",
      site: "https://frost-lee.github.io/",
      tags: [
        "\u7F16\u7A0B",
        "\u6570\u636E\u5206\u6790",
        "\u968F\u7B14",
        "\u65C5\u884C"
      ]
    },
    {
      id: "blog-3adea187bfb38737",
      name: "Kerminate's Blog",
      url: "https://kerminate.me/atom.xml",
      site: "https://kerminate.me/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-00c1290c08549ca5",
      name: "Ray's Blog",
      url: "https://blog.mk1.io/api/feed",
      site: "https://blog.mk1.io/",
      tags: [
        "\u7F16\u7A0B",
        "Web"
      ]
    },
    {
      id: "blog-8b424944ff909c2b",
      name: "ChungZH \u7684\u5C0F\u7A9D",
      url: "https://blog.chungzh.cn/index.xml",
      site: "https://blog.chungzh.cn/",
      tags: [
        "\u7F16\u7A0B",
        "C++",
        "\u7B97\u6CD5",
        "OI"
      ]
    },
    {
      id: "blog-cd9a5b08458b72b4",
      name: "\u8003\u62C9\u5496\u5561\u9986",
      url: "https://guhub.cn/feed/",
      site: "https://guhub.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF",
        "\u751F\u6D3B",
        "\u6E38\u620F",
        "\u601D\u8003",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-3bad7a903d7b2de4",
      name: "Lineuman's Blog",
      url: "https://lineuman.github.io/blog/feed.xml",
      site: "https://lineuman.github.io/blog/",
      tags: [
        "\u7F16\u7A0B",
        "\u6D4B\u8BD5"
      ]
    },
    {
      id: "blog-3d6c753ba396324d",
      name: "news view",
      url: "https://zsqk.github.io/news/feed.xml",
      site: "https://zsqk.github.io/news/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-44d3104b3ea1f4ef",
      name: "Nala Ginrut's Blog",
      url: "https://nalaginrut.com/feed/atom",
      site: "https://nalaginrut.com/index",
      tags: [
        "\u7F16\u7A0B",
        "GNU Guile"
      ]
    },
    {
      id: "blog-c0f69371e3742d84",
      name: "\u4F2A\u659C\u6760\u9752\u5E74",
      url: "http://i.lckiss.com/?feed=rss2",
      site: "http://i.lckiss.com/",
      tags: [
        "\u6280\u672F",
        "\u6298\u817E",
        "\u968F\u8BB0"
      ]
    },
    {
      id: "blog-f286dcf80b108e80",
      name: "\u53CC\u7EDE\u9EBB\u75F9",
      url: "https://numb.tech/atom.xml",
      site: "https://numb.tech/",
      tags: [
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-73ee099bc1981148",
      name: "ZedeX",
      url: "https://zedex.cn/feed",
      site: "https://zedex.cn/",
      tags: [
        "\u4EA7\u54C1",
        "\u79D1\u6280",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-403cbda083f3633d",
      name: "Gavin notes",
      url: "https://blog.gavln.com/atom.xml",
      site: "https://blog.gavln.com/",
      tags: [
        "\u6280\u672F",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-16a8e649923f0e83",
      name: "TwIStOy",
      url: "https://twistoy.cn/index.xml",
      site: "https://twistoy.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u540E\u7AEF",
        "C++"
      ]
    },
    {
      id: "blog-f1a5dbf8bd8dba7e",
      name: "\u4E00\u676F\u8336",
      url: "https://www.zuoyu.top/atom.xml",
      site: "https://www.zuoyu.top/",
      tags: [
        "\u6280\u672F",
        "\u751F\u6D3B",
        "\u7ECF\u6D4E"
      ]
    },
    {
      id: "blog-fceb9a1735a82e47",
      name: "Louis Aeilot's Blog",
      url: "https://blog.aeilot.top/index.xml",
      site: "https://blog.aeilot.top/",
      tags: [
        "\u968F\u7B14",
        "\u6280\u672F",
        "\u827A\u672F",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-24345d77747c9d10",
      name: "CLCK's Space",
      url: "https://www.clckblog.space/blog/rss.xml",
      site: "https://www.clckblog.space/blog/",
      tags: [
        "\u968F\u7B14",
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-410b11347b8a16bf",
      name: "\u4E91\u6E38\u541B\u7684\u5C0F\u7AD9",
      url: "https://www.yunyoujun.cn/atom.xml",
      site: "https://www.yunyoujun.cn/",
      tags: [
        "\u751F\u6D3B",
        "\u6280\u672F",
        "\u827A\u672F",
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-1902fb391dee9765",
      name: "\u9A81\u4E4B\u5C4B - \u5B59\u5929\u9A81\u7684\u968F\u8EAB\u8BB0\u5F55\u4E2A\u4EBA\u7F51\u7AD9",
      url: "https://www.ybusad.com/rss",
      site: "https://www.ybusad.com/",
      tags: [
        "\u751F\u6D3B",
        "\u968F\u8BB0",
        "\u6280\u672F",
        "\u601D\u8003"
      ]
    },
    {
      id: "blog-61c4ce74e30160cb",
      name: "WuSiYu Blog",
      url: "https://wusiyu.me/feed/",
      site: "https://wusiyu.me/",
      tags: [
        "\u6298\u817E",
        "\u6280\u672F",
        "DIY",
        "Linux"
      ]
    },
    {
      id: "blog-99c480898524f4c7",
      name: "\u653F\u5B50\u7684\u535A\u5BA2",
      url: "https://blog.zhengzi.me/atom.xml",
      site: "https://blog.zhengzi.me/",
      tags: [
        "\u6280\u672F",
        "\u751F\u6D3B",
        "\u601D\u8003"
      ]
    },
    {
      id: "blog-8ba90ab6760cc369",
      name: "\u98DE\u5200\u535A\u5BA2",
      url: "https://www.feidaoboke.com/feed.php",
      site: "https://www.feidaoboke.com/",
      tags: [
        "\u751F\u6D3B",
        "\u7F16\u7A0B",
        "\u8BFB\u4E66",
        "\u8DB3\u7403"
      ]
    },
    {
      id: "blog-f0541a6609cd6584",
      name: "\u5B87\u5B99\u7684\u5FC3\u5F26",
      url: "https://www.physixfan.com/feed",
      site: "https://www.physixfan.com/",
      tags: [
        "\u7269\u7406",
        "\u6295\u8D44"
      ]
    },
    {
      id: "blog-71bd46eca1764377",
      name: "Bingwhispers",
      url: "https://cyril3.github.io/feed.xml",
      site: "https://cyril3.github.io/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-76b9d0ce172fc307",
      name: "PlayerCatboy",
      url: "https://ralf.ren/feed",
      site: "https://ralf.ren/",
      tags: [
        "\u7F16\u7A0B",
        "\u6298\u817E",
        "\u521B\u9020"
      ]
    },
    {
      id: "blog-32f1c0a723013b90",
      name: "\u6728\u5323\u5B50",
      url: "https://blog.mutoo.im/atom.xml",
      site: "https://mutoo.im/",
      tags: [
        "\u524D\u7AEF",
        "\u6E38\u620F\u5F00\u53D1",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-6143fbd12b60beb7",
      name: "\u6B27\u96F7\u6D41",
      url: "https://ourai.ws/atom.xml",
      site: "https://ourai.ws/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF",
        "\u751F\u6D3B",
        "\u601D\u8003",
        "\u65E5\u8BED",
        "\u5B85\u6587\u5316"
      ]
    },
    {
      id: "blog-527e8fc3339961de",
      name: "VictriD's blog",
      url: "https://victrid.dev/feed.xml",
      site: "https://victrid.dev/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-53174aff5610370f",
      name: "\u6325\u821E\u601D\u7EEA\u7684\u535A\u5BA2",
      url: "https://asazero.blogspot.com/feeds/posts/default",
      site: "https://asazero.blogspot.com/",
      tags: [
        "\u8BC4\u8BBA",
        "\u5FC3\u8DEF\u5386\u7A0B",
        "\u5206\u4EAB"
      ]
    },
    {
      id: "blog-64864672e2d8aba9",
      name: "ddadaal.me",
      url: "https://ddadaal.me/rss.xml",
      site: "https://ddadaal.me/",
      tags: [
        "\u7F16\u7A0B",
        "\u6D88\u8D39\u6570\u7801",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-3c0fabe8f0574a21",
      name: "\u65E0\u4E3B\u9898\u535A\u5BA2",
      url: "https://wuzhuti.cn/feed",
      site: "https://wuzhuti.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u5206\u4EAB"
      ]
    },
    {
      id: "blog-10e1e03b1e52676a",
      name: "\u533A\u5757\u94FE\u7F57\u5BBE",
      url: "https://dbarobin.com/feed.xml",
      site: "https://dbarobin.com/",
      tags: [
        "\u533A\u5757\u94FE",
        "\u52A0\u5BC6\u8D27\u5E01",
        "\u6BD4\u7279\u5E01",
        "\u4EE5\u592A\u574A",
        "DeFi",
        "\u9690\u79C1"
      ]
    },
    {
      id: "blog-fa66ae700f696118",
      name: "\u751C\u6B23\u5C4B",
      url: "https://tcxx.info/feed",
      site: "https://www.tcxx.info/",
      tags: [
        "\u7F8E\u56FD\u751F\u6D3B",
        "\u6280\u672F",
        "\u4EBA\u5DE5\u667A\u80FD"
      ]
    },
    {
      id: "blog-f03805cf08d25cae",
      name: "Luyu Huang's Tech Blog",
      url: "https://luyuhuang.github.io/feed.xml",
      site: "https://luyuhuang.github.io/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-492893d716450a53",
      name: "\u8D39\u7167\u541B\u4E2A\u4EBA\u7F51\u7AD9",
      url: "https://feizhaojun.com/?feed=rss2",
      site: "https://feizhaojun.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u79D1\u6280",
        "\u5206\u4EAB"
      ]
    },
    {
      id: "blog-4ebf99049b317711",
      name: "\u5E74\u534E\u8F6C\u77AC",
      url: "https://blog.xiaket.org/feed.xml",
      site: "https://blog.xiaket.org/",
      tags: [
        "\u7F16\u7A0B",
        "\u8BFB\u4E66"
      ]
    },
    {
      id: "blog-96088d246682debc",
      name: "\u9038\u601D\u6742\u9648",
      url: "https://blog.ponder.work/atom.xml",
      site: "https://blog.ponder.work/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-7632c10dc6f836fd",
      name: "\u738B\u7384\u7684\u535A\u5BA2",
      url: "https://blog.wangxuan.name/feed/",
      site: "https://blog.wangxuan.name/",
      tags: [
        "\u968F\u7B14",
        "\u81EA\u7531\u4E92\u8054\u7F51",
        "\u6570\u5B57\u751F\u6D3B",
        "\u5206\u4EAB"
      ]
    },
    {
      id: "blog-8943d43c1056c0c2",
      name: "\u91CD\u5F52\u6DF7\u6C8C\u7684BLOG",
      url: "https://blog.gotocoding.com/feed/",
      site: "https://blog.gotocoding.com/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-df80c62d2a1c735e",
      name: "\u65C1\u9038\u659C\u51FA",
      url: "https://www.mihu.live/feed/",
      site: "https://www.mihu.live/",
      tags: [
        "\u6280\u672F",
        "\u5206\u4EAB",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-cbc5b353287474ff",
      name: "\u4E00\u5927\u52A0\u8D1D",
      url: "https://tianheg.co/index.xml",
      site: "https://tianheg.co/",
      tags: [
        "\u751F\u6D3B",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-c2ca9e86eec78849",
      name: "\u56DB\u65B9\u4E4B\u4E91",
      url: "https://jingyig01.github.io/atom.xml",
      site: "https://jingyig01.github.io/",
      tags: [
        "\u601D\u8003",
        "\u5916\u8BED",
        "\u6570\u5B66",
        "\u8BB0\u5F55"
      ]
    },
    {
      id: "blog-dc53cf887984ae1c",
      name: "\u56DB\u559C\u4E38\u5B50",
      url: "https://fourhappylions.com/index.xml",
      site: "https://fourhappylions.com/",
      tags: [
        "\u517B\u5A03",
        "\u5BB6\u5EAD",
        "\u6D77\u5916\u751F\u6D3B"
      ]
    },
    {
      id: "blog-005a1ddd65cffb9a",
      name: "\u5B89\u5FD7\u5408\u7684\u5B66\u4E60\u535A\u5BA2",
      url: "https://chegva.com/feed/",
      site: "https://chegva.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u8FD0\u7EF4",
        "\u968F\u7B14",
        "\u56FD\u5B66"
      ]
    },
    {
      id: "blog-823e795a2d2f0042",
      name: "\u6D6E\u4E91\u6E38\u5B50\u610F",
      url: "https://leonson.me/feed.xml",
      site: "https://leonson.me/",
      tags: [
        "\u751F\u6D3B",
        "\u7F8E\u56FD",
        "\u601D\u8003",
        "\u9605\u8BFB",
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-b8ef08bcfa0c5e04",
      name: "HappyHack",
      url: "https://blog.happyhack.io/atom.xml",
      site: "https://blog.happyhack.io/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u4E91\u539F\u751F",
        "Hack"
      ]
    },
    {
      id: "blog-89a46a336ace18e9",
      name: "Jiansing's Blog",
      url: "https://blog.ofo.moe/rss.xml",
      site: "https://blog.ofo.moe/",
      tags: [
        "\u6280\u672F",
        "\u751F\u6D3B",
        "\u601D\u8003",
        "\u9605\u8BFB"
      ]
    },
    {
      id: "blog-97e3aff52f7a20b1",
      name: "\u76AE\u76AE\u51DB\u57FA\u5730",
      url: "https://owomoe.net/feed/",
      site: "https://owomoe.net/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u8BC4\u8BBA"
      ]
    },
    {
      id: "blog-4c7e4d9b4a395867",
      name: "Ljcbaby \u7684 \u7F51\u7EDC\u5C0F\u5C4B",
      url: "https://cdn.jsdelivr.net/gh/ljcbaby/ljcbaby.github.io@latest/atom.xml",
      site: "https://blog.ljcbaby.top/",
      tags: [
        "\u6280\u672F",
        "\u8BC4\u8BBA",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-15d9c5005b948ed5",
      name: "Velas\u7535\u6CE2\u7AD9",
      url: "https://www.velasx.com/feed",
      site: "https://www.velasx.com/",
      tags: [
        "\u52A8\u753B",
        "\u6E38\u620F",
        "\u5C0F\u8BF4",
        "\u8BBE\u8BA1",
        "\u9274\u8D4F"
      ]
    },
    {
      id: "blog-5a0693b1e534fd99",
      name: "\u4E0D\u70B9\u8BED\u4E66",
      url: "https://yjalifebook.com/feed/",
      site: "https://yjalifebook.com/",
      tags: [
        "\u8FD9\u91CC\u662F\u4E0D\u70B9\u8BED\u4E66\uFF0C\u4E00\u5757\u300C\u601D\u8003\u300D\u7684\u81EA\u7559\u5730\u3002"
      ]
    },
    {
      id: "blog-be369da94e7d650e",
      name: "zu1k",
      url: "https://zu1k.com/rss.xml",
      site: "https://zu1k.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u7F51\u5B89",
        "\u601D\u8003"
      ]
    },
    {
      id: "blog-f1c6a614ee0bf0c7",
      name: "Jalen",
      url: "https://jalenz.cn/atom.xml",
      site: "https://jalenz.cn/",
      tags: [
        "\u7B97\u6CD5",
        "\u751F\u6D3B",
        "\u6298\u817E"
      ]
    },
    {
      id: "blog-fc22a5624b6492c5",
      name: "Gowhich",
      url: "https://www.gowhich.com/feed",
      site: "https://www.gowhich.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u7F51\u7EDC",
        "\u8BA1\u7B97\u673A",
        "\u65E5\u5E38"
      ]
    },
    {
      id: "blog-344285a1c34d164d",
      name: "\u6768\u6C38\u5EB7\u7684\u4E2A\u4EBA\u535A\u5BA2",
      url: "https://blog.yangyk.com/feed.xml",
      site: "https://blog.yangyk.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-fdb7344ed690c674",
      name: "Platform Thinking +",
      url: "https://pt.plus/rss/",
      site: "https://pt.plus/",
      tags: [
        "\u79D1\u6280",
        "\u4EBA\u6587",
        "\u5546\u4E1A"
      ]
    },
    {
      id: "blog-84bde7b1989bcb9e",
      name: "\u6587\u827A\u6570\u5B66\u541B",
      url: "https://mathpretty.com/feed/",
      site: "https://mathpretty.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u6570\u5B66"
      ]
    },
    {
      id: "blog-4fa65aa6cf44ee33",
      name: "luozhiyun`s Blog \u6211\u7684\u6280\u672F\u5206\u4EAB",
      url: "https://www.luozhiyun.com/feed",
      site: "https://www.luozhiyun.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-e4684d96afcb48d2",
      name: "\u4EBA\u751F\u9019\u90E8\u6232",
      url: "https://www.frank.hk/rss.xml",
      site: "https://www.frank.hk/",
      tags: [
        "\u751F\u6D3B",
        "\u601D\u8003",
        "\u95B1\u8B80",
        "\u65C5\u884C",
        "\u6280\u8853"
      ]
    },
    {
      id: "blog-546e3c0c56ce6be8",
      name: "\u5730\u7403\u4EBA\u7684\u7A7A\u95F4",
      url: "https://h.cjh0613.com/zh/index.xml",
      site: "https://cjh0613.com/",
      tags: [
        "\u6280\u672F",
        "\u751F\u6D3B",
        "\u601D\u8003",
        "\u5206\u4EAB",
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-ea9f35bd359b1266",
      name: "\u72EC\u5B64\u4F36\u4FDC",
      url: "https://blog.dugulingping.com/feed",
      site: "https://blog.dugulingping.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-9df271707b21db37",
      name: "maxOS",
      url: "https://maxoxo.me/rss/",
      site: "https://maxoxo.me/",
      tags: [
        "\u8BBE\u8BA1",
        "\u9605\u8BFB",
        "\u968F\u7B14",
        "\u6B4C\u5355"
      ]
    },
    {
      id: "blog-1ec1a4fb81035fdf",
      name: "Yuko's Blog",
      url: "https://yuukoamamiya.github.io/index.xml",
      site: "https://yuukoamamiya.github.io/",
      tags: [
        "\u4E8C\u6B21\u5143",
        "\u4EBA\u6587",
        "\u793E\u79D1",
        "\u8BFB\u4E66",
        "\u6E38\u620F"
      ]
    },
    {
      id: "blog-fdd1cd421b655c05",
      name: "\u6E1A\u78A7",
      url: "https://jubeny.com/feed.xml",
      site: "https://jubeny.com/",
      tags: [
        "\u8BFB\u4E66",
        "\u751F\u6D3B",
        "\u968F\u60F3"
      ]
    },
    {
      id: "blog-67ccd7e5910b0e32",
      name: "\u4EE5\u68A6\u4E3A\u9A6C",
      url: "https://lhymwm.github.io//atom.xml",
      site: "https://lhymwm.github.io/",
      tags: [
        "\u5B66\u4E60",
        "\u751F\u6D3B",
        "\u65AD\u60F3"
      ]
    },
    {
      id: "blog-8d3a5be393349313",
      name: "Jiayi Liu",
      url: "https://jiayiliu.me/index.xml",
      site: "https://jiayiliu.me/",
      tags: [
        "\u751F\u6D3B",
        "\u968F\u7B14",
        "\u751F\u7269\u4FE1\u606F\u5B66",
        "\u751F\u7269\u533B\u5B66",
        "\u6298\u817E"
      ]
    },
    {
      id: "blog-da17b0e4d85d08d3",
      name: "\u9065\u8FDC\u7684\u8857\u5E02",
      url: "https://blog.henix.info/rss2.0.xml",
      site: "https://blog.henix.info/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-cff1e8fc43a948ab",
      name: "\u9648\u4ED3\u9889",
      url: "https://imzm.im/feed",
      site: "https://imzm.im/",
      tags: [
        "\u751F\u6D3B",
        "\u968F\u7B14",
        "\u6444\u5F71"
      ]
    },
    {
      id: "blog-f9973b9be9e526d2",
      name: "\u591C\u5EAD\u8A18",
      url: "https://musenxi.com/feed",
      site: "https://musenxi.com/",
      tags: [
        "\u751F\u6D3B",
        "\u968F\u7B14",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-a07f0b67ac271f83",
      name: "Ngzhio's Blog",
      url: "https://ngzhio.github.io/feed.xml",
      site: "https://ngzhio.github.io/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u6587\u5B66",
        "\u6570\u5B66",
        "\u7269\u7406",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-fbe59874d5dc775f",
      name: "Eric's Blog",
      url: "https://wsdjeg.net/feed.xml",
      site: "https://wsdjeg.net/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-2effcf621925e131",
      name: "ephz3nt",
      url: "https://painso.com/posts/index.xml",
      site: "https://painso.com/",
      tags: [
        "\u968F\u60F3",
        "\u8FD0\u7EF4",
        "\u5B66\u4E60"
      ]
    },
    {
      id: "blog-74aed0b83ae1dc53",
      name: "\u5C0F\u732A",
      url: "https://xiaozhu.dev/index.xml",
      site: "https://xiaozhu.dev/",
      tags: [
        "\u6280\u672F",
        "\u7F16\u7A0B",
        "\u524D\u7AEF",
        "\u5B66\u4E60"
      ]
    },
    {
      id: "blog-22ba31402466ff1c",
      name: "251",
      url: "https://blog.251.sh/feed/",
      site: "https://blog.251.sh/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u6280\u672F",
        "\u6559\u7A0B",
        "\u5B66\u4E60"
      ]
    },
    {
      id: "blog-70894d5f7d2d7763",
      name: "\u5362\u8D24\u6CFC\u7684\u535A\u5BA2",
      url: "https://www.luxianpo.com/rss.xml",
      site: "https://www.luxianpo.com/",
      tags: [
        "\u5DE5\u4F5C",
        "\u751F\u6D3B",
        "\u6280\u672F",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-b43967b166ef0d2b",
      name: "\u8FF7\u9014\u5C0F\u4E66\u7AE5",
      url: "https://xugaoxiang.com/feed",
      site: "https://xugaoxiang.com/",
      tags: [
        "\u5DE5\u4F5C",
        "\u7F16\u7A0B",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-75aab3296b8329e9",
      name: "\u5F90\u5B9C\u751F",
      url: "https://xuyisheng.top/rss/",
      site: "https://xuyisheng.top/",
      tags: [
        "\u5DE5\u4F5C",
        "\u7F16\u7A0B",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-f33728be425f2c5e",
      name: "Scvoet",
      url: "https://scvoet.me/feed",
      site: "https://scvoet.me/",
      tags: [
        "\u7F16\u7A0B",
        "\u5B66\u4E60",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-44e1066ea59803be",
      name: "Diff\u5BA2\u65C5\u65E5\u8BB0",
      url: "https://diff.im/blog/?feed=rss2",
      site: "https://diff.im/blog/",
      tags: [
        "\u57FA\u7763\u4FE1\u4EF0\uFF0C\u8BBE\u8BA1\uFF0C\u751F\u6D3B\uFF0C\u6559\u80B2"
      ]
    },
    {
      id: "blog-6a3c69e3224027e3",
      name: "jax - \u8D70\u5728\u8DEF\u4E0A",
      url: "https://cdjax.com/?feed=rss2",
      site: "https://cdjax.com/",
      tags: [
        "\u4EA7\u54C1",
        "\u6570\u7801",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-8cd81772ccd344d6",
      name: "XINDOO\u7684\u535A\u5BA2",
      url: "https://zxs.io/feed",
      site: "https://zxs.io/",
      tags: [
        "\u7B97\u6CD5",
        "\u7F16\u7A0B",
        "\u4EBA\u751F"
      ]
    },
    {
      id: "blog-7c101361702430d1",
      name: "\u61D2\u5F97\u52E4\u5FEB\u7684\u535A\u5BA2",
      url: "https://masuit.com/rss",
      site: "https://masuit.com/",
      tags: [
        "\u7EFF\u8272\u8F6F\u4EF6",
        ".net",
        "\u8D44\u6E90\u5206\u4EAB"
      ]
    },
    {
      id: "blog-c7f73cff8a281b46",
      name: "\u6781\u5BA2\u5154\u5154",
      url: "https://geektutu.com/feed.xml",
      site: "https://geektutu.com/",
      tags: [
        "\u5206\u4EAB\u6709\u8DA3\u7684\u6280\u672F\u5B9E\u8DF5"
      ]
    },
    {
      id: "blog-6d2979e4e315641b",
      name: "\u6781\u5BA2\u4E2D\u5FC3",
      url: "https://www.geekzl.com/feed",
      site: "https://www.geekzl.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "SEO",
        "\u6559\u7A0B",
        "dotnet",
        "python"
      ]
    },
    {
      id: "blog-53543afb37e37a0b",
      name: "\u9648\u5C11\u6587\u7684\u535A\u5BA2",
      url: "https://www.chenshaowen.com/atom.xml",
      site: "https://www.chenshaowen.com/blog/",
      tags: [
        "\u7F16\u7A0B",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-97f7fad621f4fb37",
      name: "\u4E00\u5207\u7686\u6709\u53EF\u80FD",
      url: "https://kubesphereio.com/tags/index.xml",
      site: "https://kubesphereio.com/",
      tags: [
        "\u5B66\u4E60",
        "K8s",
        "\u8FD0\u7EF4"
      ]
    },
    {
      id: "blog-3414ac359690eacf",
      name: "\u6781\u5BA2\u73A9\u5BB6\u5927\u767D",
      url: "https://geekplayers.com/feed.xml",
      site: "https://geekplayers.com/",
      tags: [
        "\u6280\u672F",
        "SEO",
        "\u8FD0\u8425",
        "\u6559\u7A0B",
        "python"
      ]
    },
    {
      id: "blog-420ef332ad5ff1d6",
      name: "\u5806\u6808\u9152\u9986",
      url: "https://atticuslab.com/atom.xml",
      site: "https://atticuslab.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u540E\u7AEF",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-9174c81ec558a1fe",
      name: "\u7231\u91CC\u74DC",
      url: "https://www.eriqua.com/index.php/feed",
      site: "https://www.eriqua.com/",
      tags: [
        "\u8BFB\u4E66",
        "\u5916\u8BED",
        "\u65E5\u8BB0"
      ]
    },
    {
      id: "blog-f7e74c7631e53e08",
      name: "\u738B\u4E00\u77F3",
      url: "https://yishi.io/feed",
      site: "https://yishi.io/",
      tags: [
        "\u5546\u4E1A",
        "\u91D1\u878D",
        "\u52A0\u5BC6\u8D27\u5E01",
        "\u521B\u4E1A"
      ]
    },
    {
      id: "blog-478a5b763531a24e",
      name: "TripleZ's Blog",
      url: "https://blog.triplez.cn/index.xml",
      site: "https://blog.triplez.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-7482107b729b3c20",
      name: "AmbroseRen",
      url: "https://ambroseren.github.io/",
      site: "https://ambroseren.github.io/test/",
      tags: [
        "\u7EFC\u5408\u6570\u636E\u5E93\u7B14\u8BB0",
        "\u535A\u5BA2"
      ]
    },
    {
      id: "blog-41fb6408d1c58a9b",
      name: "Fat Blog - \u633A\u80A5\u7684\u535A\u5BA2",
      url: "https://tingfei.space/index.xml",
      site: "https://tingfei.space/",
      tags: [
        "\u533A\u5757\u94FE",
        "\u79D1\u5E7B",
        "Rust",
        "\u7F8E\u98DF"
      ]
    },
    {
      id: "blog-4a7f8a8fc7fb49a5",
      name: "\u6258\u5C3C\u54E5\u7684\u73A9\u5177\u535A\u5BA2",
      url: "https://www.tony-bro.com/atom.xml",
      site: "https://www.tony-bro.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-04ded9caa82de04a",
      name: "Ramen's Box",
      url: "https://blog.lxdlam.com/index.xml",
      site: "https://blog.lxdlam.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-61060f0d7e1f8c07",
      name: "\u6B65\u6B65\u8D70\u524D\u7AEF",
      url: "https://bubuzou.com/atom.xml",
      site: "https://bubuzou.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF",
        "\u751F\u6D3B",
        "\u8BFB\u4E66"
      ]
    },
    {
      id: "blog-f22315f57e0ce45d",
      name: "Holmesian Blog",
      url: "https://holmesian.org/feed",
      site: "https://holmesian.org/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-8043facc01a7e39c",
      name: "\u5F20\u5C0F\u51EF\u7684\u535A\u5BA2",
      url: "https://jasonkayzk.github.io/atom.xml",
      site: "https://jasonkayzk.github.io/",
      tags: [
        "\u7F16\u7A0B",
        "\u540E\u7AEF",
        "\u751F\u6D3B",
        "\u5206\u4EAB"
      ]
    },
    {
      id: "blog-de2767e65b6109af",
      name: "DLog - \u674E\u4E01\u7684\u535A\u5BA2",
      url: "https://dingzeyu.li/blog/feed.xml",
      site: "https://dingzeyu.li/blog/",
      tags: [
        "\u7814\u7A76",
        "\u6280\u672F",
        "\u5206\u4EAB",
        "\u5546\u4E1A\u6A21\u5F0F",
        "\u601D\u8003"
      ]
    },
    {
      id: "blog-d6987db6c6eda8bc",
      name: "JimmyLv@\u5415\u7ACB\u9752\u7684\u535A\u5BA2",
      url: "https://blog.jimmylv.info/pages/feed.xml",
      site: "https://blog.jimmylv.info/",
      tags: [
        "\u524D\u7AEF",
        "\u601D\u8003",
        "\u7F16\u7A0B",
        "\u6F14\u8BB2",
        "\u77E5\u8BC6\u7BA1\u7406",
        "\u6548\u7387"
      ]
    },
    {
      id: "blog-11718f648cc1d309",
      name: "\u5899\u5916\u770B\u7684\u535A\u5BA2",
      url: "https://qiangwaikan.com/feed/",
      site: "https://qiangwaikan.com/",
      tags: [
        "\u6559\u7A0B",
        "\u5B89\u5168",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-ac855eb4da986493",
      name: "kirito\u7684\u535A\u5BA2",
      url: "https://www.kirito41dd.cn/index.xml",
      site: "https://www.kirito41dd.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u6BD4\u7279\u5E01",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-a8415e4a28f6d113",
      name: "herrkaefer",
      url: "https://herrkaefer.com/feed/",
      site: "https://herrkaefer.com/",
      tags: [
        "\u6280\u672F",
        "\u521B\u9020",
        "\u601D\u8003"
      ]
    },
    {
      id: "blog-b1d6fe19b5d5ab70",
      name: "\u0164hinking Null",
      url: "https://awsl.blog/feed",
      site: "https://awsl.blog/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-0e2b4c97778e017a",
      name: "teobler",
      url: "https://teobler.com/rss.xml",
      site: "https://teobler.com/",
      tags: [
        "\u524D\u7AEF",
        "\u654F\u6377"
      ]
    },
    {
      id: "blog-a33d57797ea7120a",
      name: "\u9B5A\u7ACB\u8BF4",
      url: "https://www.yulisay.com/rss.xml",
      site: "https://www.yulisay.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14",
        "\u8BFB\u4E66",
        "\u5206\u4EAB"
      ]
    },
    {
      id: "blog-6a0927a8702749aa",
      name: "winter's Blog",
      url: "https://blog.winterchen.com/atom.xml",
      site: "https://blog.winterchen.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u6444\u5F71"
      ]
    },
    {
      id: "blog-fab8e4ce0a1b6e07",
      name: "\u7A0B\u6C9B\u6743 - \u517B\u4E86\u4E09\u53EA\u732B",
      url: "https://chengpeiquan.com/feed/",
      site: "https://chengpeiquan.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14",
        "\u524D\u7AEF",
        "\u5206\u4EAB"
      ]
    },
    {
      id: "blog-d3aa619f9c8c067a",
      name: "yzqzss-\u4E00\u5EA7\u6865\u5728\u6C34\u4E0A's Blog",
      url: "https://blog.othing.xyz/feed/",
      site: "https://blog.othing.xyz/",
      tags: [
        "\u751F\u6D3B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-a373d131d0673005",
      name: "Terrarum::\u5F02\u4E16\u754C\u4E28\u5C45\u6B63\u535A\u5BA2",
      url: "https://blog.skyju.cc/index.xml",
      site: "https://blog.skyju.cc/",
      tags: [
        "\u7F16\u7A0B",
        "PHP",
        "\u6E17\u900F",
        "\u5F00\u6E90",
        "\u5206\u4EAB"
      ]
    },
    {
      id: "blog-e7e5730c6bf4edf2",
      name: "Li Hui Blog",
      url: "https://lihui.net/feed",
      site: "https://lihui.net/",
      tags: [
        "\u8BA4\u77E5",
        "\u601D\u8003",
        "\u8BFB\u4E66",
        "\u6280\u672F",
        "\u7F16\u7A0B",
        "\u968F\u60F3"
      ]
    },
    {
      id: "blog-16d139f9d294032f",
      name: "186526's Blog",
      url: "https://blog.186526.xyz/atom.xml",
      site: "https://blog.186526.xyz/",
      tags: [
        "\u6559\u7A0B",
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u5439\u6C34",
        "\u524D\u7AEF"
      ]
    },
    {
      id: "blog-d0369b0647343315",
      name: "Enoch2090",
      url: "https://enoch2090.me/atom.xml",
      site: "https://enoch2090.me/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u968F\u7B14",
        "\u827A\u672F"
      ]
    },
    {
      id: "blog-7afeb62e3f9af074",
      name: "\u4E4C\u6258\u90A6\u662F\u4E2A\u7406\u60F3\u56FD",
      url: "https://shenyongfan.com/rss/",
      site: "https://shenyongfan.com/",
      tags: [
        "\u8BBE\u8BA1",
        "\u751F\u6D3B",
        "\u968F\u7B14",
        "\u8BFB\u4E66"
      ]
    },
    {
      id: "blog-68fd3f2828776651",
      name: "Anillc's blog",
      url: "https://anillc.cn/atom.xml",
      site: "https://anillc.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-f72d8a15baccc2ae",
      name: "\u58A8\u5B88",
      url: "https://moshou.me/?feed=rss2",
      site: "https://moshou.me/",
      tags: [
        "\u521B\u4E1A",
        "Apple",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-6d329732001798f8",
      name: "This cute world",
      url: "https://thiscute.world/index.xml",
      site: "https://thiscute.world/",
      tags: [
        "\u4E91\u539F\u751F",
        "Kubernetes",
        "\u8FD0\u7EF4",
        "Linux"
      ]
    },
    {
      id: "blog-3c9df03d70271a79",
      name: "\u5D2E\u751F \u2022 \u4E00\u4E9B\u968F\u7B14 \u{1F3A8}",
      url: "https://shenzilong.cn/blog/feed",
      site: "https://shenzilong.cn/",
      tags: [
        "\u968F\u7B14",
        "\u7F16\u7A0B",
        "\u5206\u4EAB",
        "\u524D\u7AEF"
      ]
    },
    {
      id: "blog-a9cbc757d80a1328",
      name: "I'm OWenT",
      url: "https://owent.net/index.xml",
      site: "https://owent.net/",
      tags: [
        "\u7F16\u7A0B",
        "\u540E\u7AEF",
        "\u6280\u672F",
        "\u601D\u8003"
      ]
    },
    {
      id: "blog-1aa1837ca33d8d55",
      name: "Android Performance",
      url: "https://www.androidperformance.com/atom.xml",
      site: "https://www.androidperformance.com/",
      tags: [
        "\u7F16\u7A0B",
        "Android",
        "\u5206\u4EAB"
      ]
    },
    {
      id: "blog-3994432594be50f3",
      name: "Nansey\u7684\u535A\u5BA2",
      url: "https://www.nansey.me/feeds/posts/default",
      site: "https://www.nansey.me/",
      tags: [
        "\u7FFB\u8BD1",
        "\u8BFB\u4E66",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-4c8fd7efbc72c962",
      name: "\u7FFB\u8BD1\u52A8\u6001",
      url: "https://fanyi.news/feed.xml",
      site: "https://fanyi.news/",
      tags: [
        "\u7FFB\u8BD1",
        "\u672C\u5730\u5316",
        "\u884C\u4E1A\u52A8\u6001"
      ]
    },
    {
      id: "blog-083b20939090d460",
      name: "\u6CA1\u559D\u7684",
      url: "https://blog.nodr.ink/atom.xml",
      site: "https://blog.nodr.ink/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14",
        "\u5B66\u4E60",
        "\u8BFB\u4E66"
      ]
    },
    {
      id: "blog-945e450263e3d043",
      name: "\u6DF1\u5EA6\u6295\u8D44\u7B14\u8BB0",
      url: "https://deepinvest.org/index.xml",
      site: "https://deepinvest.org/",
      tags: [
        "\u6295\u8D44"
      ]
    },
    {
      id: "blog-f5e261a05ccdc07d",
      name: "\u53F6\u5BFB\u7684\u535A\u5BA2",
      url: "https://cyrusyip.org/zh-cn/index.xml",
      site: "https://cyrusyip.org/",
      tags: [
        "\u751F\u6D3B",
        "\u5B66\u4E60"
      ]
    },
    {
      id: "blog-ff646ba4fa340159",
      name: "\u82CD\u7A79\u306E\u4E0B",
      url: "https://www.blueskyxn.com/feed/",
      site: "https://www.blueskyxn.com/",
      tags: [
        "\u6280\u672F",
        "Linux",
        "\u751F\u6D3B",
        "\u7F51\u7EDC",
        "\u8BA1\u7B97\u673A",
        "\u4E8C\u6B21\u5143"
      ]
    },
    {
      id: "blog-f32fbab3ec69d9fa",
      name: "\u660E\u8FDC\u7684\u81EA\u7559\u5730",
      url: "https://blog.mayandev.top/atom.xml",
      site: "https://blog.mayandev.top/",
      tags: [
        "\u6280\u672F",
        "\u524D\u7AEF",
        "\u751F\u6D3B",
        "\u4E92\u8054\u7F51"
      ]
    },
    {
      id: "blog-9a934dee341181f7",
      name: "TimeMachine Notes",
      url: "https://timemachine.icu/atom.xml",
      site: "https://timemachine.icu/",
      tags: [
        "\u5927\u6570\u636E",
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u968F\u7B14",
        "\u5B66\u4E60"
      ]
    },
    {
      id: "blog-5caa51bed0ed717f",
      name: "\u72C2\u4E14\u7684\u535A\u5BA2",
      url: "http://blog.kuangjux.top/atom.xml",
      site: "https://blog.kuangjux.top/",
      tags: [
        "\u6280\u672F",
        "\u968F\u7B14",
        "\u8BFB\u4E66",
        "\u6587\u5B66"
      ]
    },
    {
      id: "blog-727f298ab6e445bc",
      name: "I Am I",
      url: "https://5ime.cn/atom.xml",
      site: "https://5ime.cn/",
      tags: [
        "\u6280\u672F",
        "\u968F\u7B14",
        "\u5B66\u4E60",
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-b5f597108a8137c2",
      name: "Super Blog",
      url: "https://superpung.com/atom.xml",
      site: "https://superpung.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u6280\u672F",
        "\u89C2\u70B9",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-dbfc32e43ce6f922",
      name: "\u79BB\u522B\u6B4C",
      url: "https://www.leavesongs.com/feed/",
      site: "https://www.leavesongs.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u5B89\u5168"
      ]
    },
    {
      id: "blog-9f75c7e1bf12736b",
      name: "crblog",
      url: "https://blog.cal1.cn/atom.xml",
      site: "https://blog.cal1.cn/",
      tags: [
        "\u5B89\u5168"
      ]
    },
    {
      id: "blog-b6e871df0f584360",
      name: "EVILCOS",
      url: "https://evilcos.me/?feed=rss2",
      site: "https://evilcos.me/",
      tags: [
        "\u5B89\u5168"
      ]
    },
    {
      id: "blog-4030cfeb2971ee46",
      name: "Lyunvy's Blog",
      url: "https://blog.lyunvy.top/atom.xml",
      site: "https://blog.lyunvy.top/",
      tags: [
        "\u751F\u6D3B",
        "\u5B66\u4E60"
      ]
    },
    {
      id: "blog-cbb771fa729437f7",
      name: "PRIEWIENV's blog",
      url: "https://blog.priewienv.me/index.xml",
      site: "https://blog.priewienv.me/",
      tags: [
        "\u5BC6\u7801\u5B66",
        "\u7406\u8BBA\u8BA1\u7B97\u673A\u79D1\u5B66",
        "\u6570\u5B66",
        "\u533A\u5757\u94FE"
      ]
    },
    {
      id: "blog-243802528f27926a",
      name: "\u6E38\u620F\u7814\u7A76\u793E",
      url: "https://www.yystv.cn/rss/feed",
      site: "https://www.yystv.cn/",
      tags: [
        "\u6E38\u620F",
        "\u6742\u8C08"
      ]
    },
    {
      id: "blog-ccf9f0909295afe7",
      name: "KSkun's Blog",
      url: "https://ksmeow.moe/feed/",
      site: "https://ksmeow.moe/",
      tags: [
        "\u7B97\u6CD5",
        "\u5F00\u53D1",
        "\u4E92\u8054\u7F51",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-64eb0519096fa127",
      name: "Lucas's Blog",
      url: "http://kevinnan.org.cn/feed",
      site: "http://kevinnan.org.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u7B97\u6CD5",
        "\u97F3\u89C6\u9891\u5F00\u53D1",
        "\u670D\u52A1\u5668\u5F00\u53D1"
      ]
    },
    {
      id: "blog-ebee40055dc23819",
      name: "\u6C88\u5501\u5FD7",
      url: "https://qq52o.me/feed",
      site: "https://qq52o.me/",
      tags: [
        "\u7F16\u7A0B",
        "\u540E\u7AEF",
        "\u6280\u672F",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-72c1d1aeb8aa3d17",
      name: "\u4E8C\u53EA\u8001\u864E",
      url: "https://2hu.net/feed.xml",
      site: "https://2hu.net/",
      tags: [
        "\u4E92\u8054\u7F51",
        "\u968F\u7B14",
        "\u5B66\u4E60",
        "\u8D44\u6E90"
      ]
    },
    {
      id: "blog-508383443fa54b1c",
      name: "Fanta's Blog",
      url: "https://fantalovelife.club/archives/",
      site: "https://fantalovelife.club/",
      tags: [
        "\u6280\u672F",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-ab99f55731c9dcd9",
      name: "\u738B\u5B9C\u6977\u5DE5\u4F5C\u5BA4",
      url: "http://wangyikai.com/feed",
      site: "http://wangyikai.com/",
      tags: [
        "\u975E\u865A\u6784\u5199\u4F5C",
        "\u7528\u8EAB\u4F53\u5199\u4F5C\u7684\u7EAF\u6587\u5B66"
      ]
    },
    {
      id: "blog-3a90934eba50f2da",
      name: "Saul's Space",
      url: "https://saulnoble.github.io/atom.xml",
      site: "https://saulnoble.github.io/",
      tags: [
        "\u5C0F\u8BF4",
        "\u7EDF\u8BA1\u5B66",
        "\u827A\u672F"
      ]
    },
    {
      id: "blog-e5ce98095e470a79",
      name: "Jun's Blog",
      url: "https://www.junz.org/index.xml",
      site: "https://www.junz.org/",
      tags: [
        "\u7F16\u7A0B",
        "C++",
        "Linux",
        "\u968F\u60F3"
      ]
    },
    {
      id: "blog-fc2cf8213e80a87f",
      name: "Shuo's Blog",
      url: "https://wushuo.me/atom.xml",
      site: "https://wushuo.me/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14",
        "\u5927\u5B66\u751F\u6D3B"
      ]
    },
    {
      id: "blog-3fc4bcf7d030727b",
      name: "fivestone - \u540C\u4E00\u79CD\u8C03\u8C03",
      url: "http://blog.fivest.one/feed",
      site: "https://blog.fivest.one/",
      tags: [
        "\u751F\u6D3B",
        "\u5410\u69FD",
        "\u6587\u827A",
        "\u793E\u4F1A",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-ca7e4fa3e394f51e",
      name: "fieldnotes",
      url: "http://anthropology.fivest.one/feed",
      site: "https://anthropology.fivest.one/",
      tags: [
        "\u4EBA\u7C7B\u5B66"
      ]
    },
    {
      id: "blog-052ad0f2be10bb75",
      name: "rxliuli blog",
      url: "https://blog.rxliuli.com/atom.xml",
      site: "https://blog.rxliuli.com/",
      tags: [
        "\u524D\u7AEF",
        "\u7F16\u7A0B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-e059d15068f7e60f",
      name: "\u65E0\u8F84\u7684\u6808",
      url: "https://www.zackwu.com/feed.xml",
      site: "https://www.zackwu.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-f9c4d1b0f4e59d86",
      name: "Markon Review",
      url: "https://markonreview.com/rss/",
      site: "https://markonreview.com/",
      tags: [
        "\u6E38\u620F\u53CA\u4EA7\u4E1A\u8BC4\u8BBA"
      ]
    },
    {
      id: "blog-348c32ed954c975c",
      name: "\u601D\u8003\u95EE\u9898\u7684\u718A",
      url: "https://kaopubear.top/blog/atom.xml",
      site: "https://kaopubear.top/blog/",
      tags: [
        "\u6280\u672F",
        "\u968F\u7B14",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-fb33426c5f0914e0",
      name: "\u9AD8\u539F\u77F3\u535A\u5BA2",
      url: "https://www.gaoyuanshi.com/?feed=rss2",
      site: "https://www.gaoyuanshi.com/",
      tags: [
        "\u65C5\u884C",
        "\u6444\u5F71",
        "\u82F1\u8BED",
        "\u7559\u5B66"
      ]
    },
    {
      id: "blog-16187f5a0dd3691b",
      name: "mghio",
      url: "https://www.mghio.cn/atom.xml",
      site: "https://www.mghio.cn/",
      tags: [
        "\u6280\u672F",
        "\u540E\u7AEF",
        "\u968F\u7B14",
        "\u7EC8\u8EAB\u5B66\u4E60\u8005"
      ]
    },
    {
      id: "blog-0f7be28208339804",
      name: "\u4FAF\u7237\u7684\u535A\u5BA2",
      url: "https://houye.xyz/atom.xml",
      site: "https://houye.xyz/",
      tags: [
        "\u8BB0\u5F55",
        "\u5206\u4EAB"
      ]
    },
    {
      id: "blog-11b501d91d932431",
      name: "Richie\u7684\u65F6\u5149\u673A",
      url: "https://www.riichiie.net/feed/",
      site: "https://riichiie.net/",
      tags: [
        "\u751F\u6D3B",
        "\u5174\u8DA3",
        "\u601D\u8003",
        "Blog"
      ]
    },
    {
      id: "blog-9897c29e0dd75325",
      name: "\u672C\u683C\u5F02\u60F3\u5F55",
      url: "https://astrianzheng.cn/atom.xml",
      site: "https://astrianzheng.cn/",
      tags: [
        "\u968F\u7B14",
        "\u751F\u6D3B",
        "\u968F\u60F3"
      ]
    },
    {
      id: "blog-2e77e94dd9c78a9b",
      name: "\u6728\u5C0F\u4E30\u7684\u535A\u5BA2",
      url: "https://lesofn.com/atom.xml",
      site: "https://lesofn.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u540E\u7AEF",
        "\u67B6\u6784"
      ]
    },
    {
      id: "blog-0641ef4870d15b31",
      name: "Frank's Weblog",
      url: "https://nyan.im/feed",
      site: "https://nyan.im/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-8f54a72ecb9116df",
      name: "Robotkang",
      url: "https://robotkang.cc/feed",
      site: "https://robotkang.cc/",
      tags: [
        "\u79D1\u6280",
        "\u751F\u6D3B",
        "\u97F3\u4E50",
        "\u4EBA\u751F"
      ]
    },
    {
      id: "blog-08e654894f6ab664",
      name: "\u798F\u5F3A\u8BF4 \u4E00\u4E2A\u67B6\u6784\u58EB\u7684\u601D\u8003\u4E0E\u6C89\u6DC0",
      url: "https://afoo.me/feeds.xml",
      site: "https://afoo.me/",
      tags: [
        "\u67B6\u6784",
        "\u521B\u4E1A",
        "\u601D\u8003"
      ]
    },
    {
      id: "blog-3876bed2fd6e747e",
      name: "\u795D\u878D\u8BF4",
      url: "https://zhurongshuo.com/index.xml",
      site: "https://zhurongshuo.com/",
      tags: [
        "\u6CD5\u4E0D\u51C0\u7A7A\uFF0C\u89C9\u65E0\u6027\u4E5F\u3002"
      ]
    },
    {
      id: "blog-5d4c544332d5afde",
      name: "\u5982\u9C7C\u996E\u6C34",
      url: "https://wangjiezhe.com/atom.xml",
      site: "https://wangjiezhe.com/",
      tags: [
        "\u6570\u5B66",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-781d4cda558c3ea0",
      name: "\u7948\u96E8\u7684\u535A\u5BA2",
      url: "https://wakzz.cn/atom.xml",
      site: "https://wakzz.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u540E\u7AEF",
        "\u67B6\u6784"
      ]
    },
    {
      id: "blog-7d6779c7001e5a6e",
      name: "\u5218\u8363\u661F\u7684\u535A\u5BA2",
      url: "https://www.liurongxing.com/feed",
      site: "https://www.liurongxing.com/",
      tags: [
        "Linux",
        "BSD",
        "\u8FD0\u7EF4"
      ]
    },
    {
      id: "blog-e4f582f77dd01d9f",
      name: "Phuker's Blog",
      url: "https://phuker.github.io/feeds/all.atom.xml",
      site: "https://phuker.github.io/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u5B89\u5168"
      ]
    },
    {
      id: "blog-028f969a8f9b83a8",
      name: "\u73D2\u9676",
      url: "https://blog.chenjt.com/feed.xml",
      site: "https://blog.chenjt.com/",
      tags: [
        "\u6280\u672F",
        "\u751F\u6D3B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-8f7dc5d3af675c58",
      name: "\u8463\u73C2\u74A0\u2615",
      url: "https://kefan.me/rss.xml",
      site: "https://kefan.me/blog",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14",
        "\u5B66\u751F",
        "\u8BFB\u4E66\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-ab5e8d9c0fbfa440",
      name: "\u8FF0\u5C14 - \u4E00\u4E2A\u4EA7\u54C1\u7ECF\u7406\u7684\u788E\u788E\u5FF5",
      url: "https://amore.ink/feed/",
      site: "https://amore.ink/",
      tags: [
        "\u4EA7\u54C1\u7ECF\u7406",
        "\u968F\u7B14",
        "\u751F\u6D3B",
        "\u8BFB\u4E66\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-3e786037a1c4202b",
      name: "\u828D\u828B\u4E4B\u5BB6",
      url: "https://shoyu.top/feed",
      site: "https://shoyu.top/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14",
        "\u5206\u4EAB"
      ]
    },
    {
      id: "blog-fb6e0cb7980f8dad",
      name: "\u4EFB\u5CFB\u5B8F\u7684\u5C0F\u7AD9",
      url: "https://renny.ren/feed",
      site: "https://renny.ren/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u5B66\u4E60",
        "\u94A2\u7434"
      ]
    },
    {
      id: "blog-ca1171761f1920d7",
      name: "\u82B1\u675F\u6E32\u67D3",
      url: "https://bouquetrender.space/feed.xml",
      site: "https://bouquetrender.space/",
      tags: [
        "\u751F\u6D3B",
        "\u6E38\u620F",
        "\u7535\u5F71",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-eeff60deaeecaab8",
      name: "LoRexxar's Blog",
      url: "https://lorexxar.cn/atom.xml",
      site: "https://lorexxar.cn/",
      tags: [
        "\u5B89\u5168"
      ]
    },
    {
      id: "blog-82920f75e22a34a2",
      name: "Orange",
      url: "https://feeds.feedburner.com/blogspot/Aohx",
      site: "https://blog.orange.tw/",
      tags: [
        "\u5B89\u5168"
      ]
    },
    {
      id: "blog-10bf0261f3a9a4e5",
      name: "Nuclear'Atk\uFF08\u6838\u653B\u51FB\uFF09\u7F51\u7EDC\u5B89\u5168\u5B9E\u9A8C\u5BA4",
      url: "https://lcx.cc/index.xml",
      site: "https://lcx.cc/",
      tags: [
        "\u5B89\u5168"
      ]
    },
    {
      id: "blog-0475590c8cfaad1d",
      name: "bboysoul\u7684\u535A\u5BA2",
      url: "https://www.bboy.app/atom.xml",
      site: "https://www.bboy.app/",
      tags: [
        "k8s \u8FD0\u7EF4"
      ]
    },
    {
      id: "blog-5c063e091f97c5b8",
      name: "\u4E00\u6D3E\u80E1\u8A00",
      url: "https://dantezy.xyz/rss.xml",
      site: "https://dantezy.xyz/",
      tags: [
        "\u7F16\u7A0B",
        "\u9605\u8BFB",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-7bfcf492a33df504",
      name: "\u7075\u611F\u7535\u53F0 - Jack's art hobby habitat",
      url: "http://museradio.net/atom.xml",
      site: "http://museradio.net/",
      tags: []
    },
    {
      id: "blog-51921935e0c616e1",
      name: "sulinehk's blog",
      url: "https://www.sulinehk.com/index.xml",
      site: "https://www.sulinehk.com/",
      tags: [
        "\u7F16\u7A0B",
        "Golang"
      ]
    },
    {
      id: "blog-ac8102be57927019",
      name: "\u7626\u4EBA\u5FD7",
      url: "http://www.wuqiwen.cn/feed/",
      site: "http://www.wuqiwen.cn/",
      tags: [
        "\u4EA7\u54C1\u8BBE\u8BA1",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-b5d637124ae65ebd",
      name: "JustZht",
      url: "https://www.justzht.com/rss/",
      site: "https://www.justzht.com/",
      tags: [
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-f197b42e873d4a3c",
      name: "Mokeyjay's Blog",
      url: "https://www.mokeyjay.com/feed",
      site: "https://www.mokeyjay.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u5F00\u6E90",
        "PHP",
        "\u751F\u6D3B",
        "\u5206\u4EAB",
        "\u8BB0\u5F55"
      ]
    },
    {
      id: "blog-b79d22140e21e52c",
      name: "\u53F6\u5F00\u535A\u5BA2",
      url: "https://qq.md/feed/",
      site: "https://qq.md/",
      tags: [
        "\u65E5\u5E38",
        "\u751F\u6D3B",
        "\u8BB0\u5F55"
      ]
    },
    {
      id: "blog-2efef720b4ca4745",
      name: "Shiau",
      url: "https://shiau.xyz/atom.xml",
      site: "https://shiau.xyz/",
      tags: [
        "\u4EA7\u54C1",
        "\u8BBE\u8BA1",
        "SwiftUI"
      ]
    },
    {
      id: "blog-2502abddcbe26308",
      name: "\u58A8\u83F2\u6613",
      url: "https://blog.murphyyi.com/atom.xml",
      site: "https://blog.murphyyi.com/",
      tags: [
        "\u6280\u672F",
        "\u540E\u7AEF",
        "golang"
      ]
    },
    {
      id: "blog-4f883b37c1d8ae48",
      name: "\u4E00\u53EA\u4F1A\u6572\u4EE3\u7801\u7684Sheep",
      url: "https://codeyang.pages.dev/atom.xml",
      site: "https://codeyang.pages.dev/",
      tags: [
        "\u7F16\u7A0B",
        "\u5206\u4EAB",
        "\u6298\u817E",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-d25a3910713725eb",
      name: "\u6668\u66E6\u7684\u535A\u5BA2",
      url: "https://blog.whuzfb.cn/feed.xml",
      site: "https://blog.whuzfb.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u65E5\u5E38",
        "\u8FD0\u7EF4"
      ]
    },
    {
      id: "blog-41916827d3bbdf11",
      name: "Easton Man's Blog",
      url: "https://blog.eastonman.com/feed",
      site: "https://blog.eastonman.com/",
      tags: [
        "\u5F00\u6E90",
        "Linux",
        "\u8BA1\u7B97\u673A\u7CFB\u7EDF"
      ]
    },
    {
      id: "blog-1622309388b3f178",
      name: "Lawrence's Blog",
      url: "https://lawrenceli.me/atom.xml",
      site: "https://lawrenceli.me/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u5206\u5E03\u5F0F",
        "DevOps"
      ]
    },
    {
      id: "blog-23b9c568713da6d0",
      name: "Ziv Log",
      url: "https://zivlog.io/feed.xml",
      site: "https://zivlog.io/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u6570\u5B66",
        "\u7269\u7406",
        "\u8BFB\u4E66",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-706cf6795705586f",
      name: "\u5F00\u6E90\u4E4B\u5FC3",
      url: "http://sht2019.cn/atom.xml",
      site: "http://sht2019.cn/",
      tags: [
        "\u54F2\u5B66",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-7548565ce9158fdd",
      name: "\u8424\u706B\u4E4B\u68EE",
      url: "http://frankorz.com/atom.xml",
      site: "http://frankorz.com/",
      tags: [
        "\u6E38\u620F\u5F00\u53D1",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-ce8dc356a1746518",
      name: "\u4E0D\u5982\u5403\u8336\u53BB",
      url: "https://imhan.cn/feed.xml",
      site: "https://imhan.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-aa2012b5f23ffcfe",
      name: "\u8D30\u7339\u7684\u5C0F\u7A9D",
      url: "https://noionion.top/atom.xml",
      site: "https://noionion.top/",
      tags: [
        "\u7F16\u7A0B",
        "\u5206\u4EAB",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-6e560c8dbb6006a4",
      name: "\u65B9\u6CFD\u5F3A",
      url: "https://zeqiang.fun/index.xml",
      site: "https://zeqiang.fun/",
      tags: [
        "\u6570\u636E\u79D1\u5B66",
        "\u5730\u56FE\u6570\u636E\u53EF\u89C6\u5316",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-4610760be1f513bb",
      name: "ChenYFan\u306EBlog",
      url: "https://blog.cyfan.top/atom.xml",
      site: "https://blog.cyfan.top/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u5206\u4EAB",
        "\u8BB0\u5F55"
      ]
    },
    {
      id: "blog-100b3c7f04dd8a77",
      name: "hiDandelion's Space",
      url: "https://www.hidandelion.com/rss",
      site: "https://www.hidandelion.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u7269\u7406",
        "\u7B14\u8BB0",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-a46fb4722c52610a",
      name: "emperinter's blog",
      url: "https://www.emperinter.info/sitemap.rss",
      site: "https://www.emperinter.info/",
      tags: [
        "IT",
        "\u8BA1\u7B97\u673A",
        "\u5F71\u8BC4",
        "\u8BFB\u4E66\u7B14\u8BB0",
        "\u4F53\u9A8C"
      ]
    },
    {
      id: "blog-37acec20cbb74c2c",
      name: "W4J1e's blog",
      url: "https://hin.cool/atom.xml",
      site: "https://hin.cool/",
      tags: [
        "\u5206\u4EAB",
        "\u8BB0\u5F55",
        "\u6280\u672F",
        "\u5199\u4F5C"
      ]
    },
    {
      id: "blog-e38458e0f586e9c0",
      name: "Leon.D's blog",
      url: "https://kongfandong.cn/blog/rss.xml",
      site: "https://kongfandong.cn/",
      tags: [
        "\u524D\u7AEF",
        "\u7F16\u7A0B",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-5623449bb5c1ace9",
      name: "Fl0w3r",
      url: "https://yousazoe.top/atom.xml",
      site: "https://yousazoe.top/",
      tags: [
        "\u8BA1\u7B97\u673A\u56FE\u5F62\u5B66",
        "\u6E38\u620F\u5F00\u53D1",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-788b331cf37723e2",
      name: "\u725B\u6D25\u7684\u535A\u5BA2",
      url: "https://blog.jinreal.com/index.xml",
      site: "https://blog.jinreal.com/",
      tags: [
        "\u968F\u60F3"
      ]
    },
    {
      id: "blog-e445b8a8e24ae092",
      name: "Haoxiang's Blog",
      url: "http://haoxiang.org/rss",
      site: "http://haoxiang.org/",
      tags: [
        "\u8BA1\u7B97\u673A\u89C6\u89C9",
        "\u7F16\u7A0B",
        "\u6E38\u620F",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-043d13307ec6e6b1",
      name: "\u6D69\u5B50's Blog",
      url: "https://blog.lihaoya.com/rss",
      site: "https://blog.lihaoya.com/",
      tags: [
        "\u5168\u6808",
        "\u72EC\u7ACB\u5F00\u53D1\u8005",
        "\u7F16\u7A0B",
        "DevOps",
        "\u67B6\u6784"
      ]
    },
    {
      id: "blog-e16b418fa3ab4852",
      name: "mengtnt\u7684Blog",
      url: "https://mengtnt.com/rss",
      site: "https://mengtnt.com/",
      tags: [
        "iOS",
        "\u79FB\u52A8\u7AEF\u5F00\u53D1",
        "\u7F16\u7A0B",
        "\u67B6\u6784"
      ]
    },
    {
      id: "blog-7e65e38b2b0abad8",
      name: "Surager Blog",
      url: "https://surager.pub/feed.xml",
      site: "https://surager.pub/",
      tags: [
        "\u5B89\u5168",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-744e885c13153300",
      name: "ControlNet Blog",
      url: "https://controlnet.space/atom.xml",
      site: "https://controlnet.space/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-901964e6a8ea9541",
      name: "Amphibia",
      url: "https://iaarwu.github.io/index.xml",
      site: "https://iaarwu.github.io/",
      tags: [
        "Programming",
        "\u60F3\u6CD5"
      ]
    },
    {
      id: "blog-fbfe5f8374dd02ff",
      name: "Eluyee\u4E2A\u4EBA\u535A\u5BA2",
      url: "https://www.eluyee.com/feed/",
      site: "https://www.eluyee.com/",
      tags: [
        "\u8DE8\u5883\u652F\u4ED8",
        "\u865A\u62DF\u5361",
        "\u4E9A\u9A6C\u900A"
      ]
    },
    {
      id: "blog-699f51c1b1d5e10d",
      name: "\u54B8\u7CD6\u7684\u535A\u5BA2",
      url: "https://vim0.com/index.xml",
      site: "https://vim0.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u7406\u8D22",
        "\u60F3\u6CD5"
      ]
    },
    {
      id: "blog-92fe908a8f6e53e9",
      name: "Sanzo's Blog",
      url: "https://sanzo.top/atom.xml",
      site: "https://sanzo.top/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-4cae66a26d0ef1b5",
      name: "Allen Hua \u7684\u7F51\u7EDC\u535A\u5BA2",
      url: "https://hellodk.cn/feed/",
      site: "https://hellodk.cn/",
      tags: [
        "\u7F16\u7A0B",
        "Linux",
        "\u540E\u7AEF",
        "\u7F51\u7EDC",
        "\u968F\u7B14",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-4e463f82a1647fc4",
      name: "7gugu's Blog",
      url: "https://www.7gugu.com/feed/",
      site: "https://www.7gugu.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF",
        "\u968F\u7B14",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-48991939208c9e68",
      name: "std::bodun::blog",
      url: "https://www.bodunhu.com/blog/index.xml",
      site: "https://www.bodunhu.com/blog/",
      tags: [
        "Linux",
        "OS",
        "\u7F51\u7EDC",
        "\u7406\u8BBA",
        "Programming",
        "Others"
      ]
    },
    {
      id: "blog-2c111948561e963e",
      name: "\u7A0B\u5E8F\u5458\u5FC6\u521D",
      url: "https://www.developerastrid.com/index.xml",
      site: "https://www.developerastrid.com/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-8277182a1ee819ff",
      name: "\u963F\u822A\u7684\u6280\u672F\u5C0F\u7AD9",
      url: "https://www.bugcatt.com/feed",
      site: "https://www.bugcatt.com/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-ad7a8e6f2b567bc5",
      name: "QuarticCat's Blog",
      url: "https://blog.quarticcat.com/index.xml",
      site: "https://blog.quarticcat.com/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-7b64c6afbcaebd46",
      name: "\u9014\u4E2D\u7684\u6811",
      url: "https://zkpeace.com/blog-cn/atom.xml",
      site: "https://zkpeace.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u673A\u5668"
      ]
    },
    {
      id: "blog-ca06f6e12d7d2989",
      name: "LitStronger's notes",
      url: "http://fetchrss.com/rss/60e1767cf877a4023a2caee260e176387504cf483957bf43.xml",
      site: "https://liaoyq.club/",
      tags: [
        "\u524D\u7AEF\u7B14\u8BB0\uFF0C\u751F\u6D3B"
      ]
    },
    {
      id: "blog-5e6bb91c138f0a20",
      name: "WeepingDogel's Blog",
      url: "https://weepingdogel.github.io/index.xml",
      site: "https://weepingdogel.github.io/",
      tags: [
        "Linux",
        "\u7F16\u7A0B",
        "\u524D\u7AEF",
        "\u5B89\u5168",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-01d246a27bb75590",
      name: "Lss233's.Blog();",
      url: "https://blog.lss233.com/rss/",
      site: "https://blog.lss233.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u7B14\u8BB0",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-c57d3f50e6ad4bf1",
      name: "\u8BFB\u5199\u9519\u8BEF",
      url: "https://ioerr.github.io/index.xml",
      site: "https://ioerr.github.io/",
      tags: [
        "\u6742\u6587",
        "\u8BFB\u4E66",
        "\u60F3\u6CD5",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-adfe220771c3a4cf",
      name: "Zhendong\u7684\u535A\u5BA2",
      url: "https://www.kxit.net/blog/feed/",
      site: "https://www.kxit.net/",
      tags: [
        "\u65E5\u5E38",
        "\u7B14\u8BB0",
        "\u751F\u6D3B",
        "\u6D4B\u8BC4",
        "\u7F16\u7A0B",
        "\u8D44\u8BAF"
      ]
    },
    {
      id: "blog-ef06e4fd123b0474",
      name: "f2h2h1's blog",
      url: "https://f2h2h1.github.io/rss.xml",
      site: "https://f2h2h1.github.io/",
      tags: [
        "\u7B14\u8BB0",
        "\u7F16\u7A0B",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-493b21607379d8b4",
      name: "Fidel's Lab",
      url: "https://fidel.js.org/rss.xml",
      site: "https://fidel.js.org/",
      tags: [
        "\u7F16\u7A0B",
        "OI",
        "\u65E5\u5E38"
      ]
    },
    {
      id: "blog-1c475f58c4cd991e",
      name: "Java for You",
      url: "https://java4u.cn/feed",
      site: "http://java4u.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u540E\u7AEF",
        "\u6280\u672F",
        "Java"
      ]
    },
    {
      id: "blog-d897a148086cad26",
      name: "Eason Yang's Blog",
      url: "https://easonyang.com/atom.xml",
      site: "https://easonyang.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u67B6\u6784",
        "\u6280\u672F",
        "\u4EA7\u54C1",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-7fb1bb906512d7aa",
      name: "\u5055\u81E7\u7684\u5C0F\u7AD9",
      url: "https://ifmet.cn/atom.xml",
      site: "https://ifmet.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u601D\u8003"
      ]
    },
    {
      id: "blog-2ae7f12d5c65572b",
      name: "\u65C5\u884C\u8005\u7684\u968F\u60F3",
      url: "https://besscroft.com/rss.xml",
      site: "https://besscroft.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u968F\u60F3"
      ]
    },
    {
      id: "blog-edd8ead2e714e994",
      name: "3\u53F7\u5B9E\u9A8C\u5BA4",
      url: "https://www.labno3.com/feed/",
      site: "https://www.labno3.com/",
      tags: [
        "\u6811\u8393\u6D3E",
        "\u5F00\u53D1\u677F",
        "\u7F16\u7A0B",
        "\u6298\u817E"
      ]
    },
    {
      id: "blog-3faa06f954fb9cc6",
      name: "Shall We Code?",
      url: "https://www.waynerv.com/rss.xml",
      site: "https://www.waynerv.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u540E\u7AEF",
        "Linux",
        "\u4E91\u539F\u751F",
        "Kubernetes"
      ]
    },
    {
      id: "blog-659500c27ea74bcb",
      name: "\u80E1\u5B50\u7684\u72EC\u7ACB\u535A\u5BA2",
      url: "https://huzizi.com/feed/",
      site: "https://www.huzizi.com/",
      tags: [
        "\u666E\u62C9\u63D0",
        "\u5065\u8EAB",
        "\u751F\u6D3B",
        "\u65C5\u884C",
        "\u7A0B\u5E8F\u5458"
      ]
    },
    {
      id: "blog-b2d2bc7b4b8ba746",
      name: "ipfans",
      url: "https://www.4async.com/atom.xml",
      site: "https://www.4async.com/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-f91f0e9e46b36ff9",
      name: "Xudong's Blog",
      url: "https://misfork.com/atom.xml",
      site: "https://misfork.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-def1db9a0ce11951",
      name: "Simple code Simple life",
      url: "https://blog.halberd.cn/rss.xml",
      site: "https://blog.halberd.cn/",
      tags: [
        "\u524D\u7AEF",
        "\u7F16\u7A0B",
        "\u8BA1\u7B97\u673A",
        "\u751F\u6D3B\u8BB0\u5F55"
      ]
    },
    {
      id: "blog-f5c02072897b3a45",
      name: "\u5434\u6DA6\u5199\u5B57\u7684\u5730\u65B9",
      url: "http://wu.run/atom.xml",
      site: "http://wu.run/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u601D\u8003"
      ]
    },
    {
      id: "blog-4372c83cde71cff1",
      name: "Rainshaw's Blog",
      url: "https://blog.ruixiaolu.com/feed/",
      site: "https://blog.ruixiaolu.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u60F3",
        "\u5B89\u5168"
      ]
    },
    {
      id: "blog-7c263721b8334a14",
      name: "Aemon's Blog",
      url: "https://aemoncao.github.io/rss2.xml",
      site: "https://aemoncao.github.io/",
      tags: [
        "\u7F16\u7A0B",
        "\u6298\u817E",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-34579e55cc80af7d",
      name: "\u601D\u4E3A\u8BF4",
      url: "https://siwei.io/index.xml",
      site: "https://siwei.io/",
      tags: [
        "\u56FE\u6570\u636E\u5E93",
        "\u7F16\u7A0B",
        "\u4E91\u8BA1\u7B97",
        "\u5927\u6570\u636E"
      ]
    },
    {
      id: "blog-be38680b6336cce3",
      name: "Marwin's Blog",
      url: "https://marwin.cn/rss2.xml",
      site: "https://marwin.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u6570\u7801"
      ]
    },
    {
      id: "blog-8ebdf736afcb8b1f",
      name: "\u706B\u55B5\u65E5\u8BB0\u672C",
      url: "https://www.mmbkz.cn/feed",
      site: "https://www.mmbkz.cn/",
      tags: [
        "\u751F\u6D3B",
        "\u65E5\u5E38",
        "\u7F16\u7A0B",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-d1246f660a9a432b",
      name: "\u5FA1\u5742\u7814\u7A76\u6240",
      url: "https://www.nosuchfield.com/atom.xml",
      site: "https://www.nosuchfield.com/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-8864aa6eb54739c6",
      name: "Acmic",
      url: "https://acmic.top/feed",
      site: "https://acmic.top/",
      tags: [
        "\u8BFB\u4E66",
        "\u751F\u6D3B",
        "\u7F16\u7A0B",
        "\u7B14\u8BB0",
        "\u5206\u4EAB"
      ]
    },
    {
      id: "blog-417f625928630d9d",
      name: "\u7126\u70B9\u7684\u52A8\u529B\u7089",
      url: "https://dianjiaogit.github.io/feed.xml",
      site: "https://dianjiaogit.github.io/",
      tags: [
        "\u751F\u6D3B",
        "\u6742\u6587",
        "\u5206\u4EAB",
        "\u8BFB\u4E66"
      ]
    },
    {
      id: "blog-1a73c638df364c03",
      name: "\u5F20\u6D69\u5728\u8DEF\u4E0A",
      url: "https://imzhanghao.com/atom.xml",
      site: "https://imzhanghao.com/",
      tags: [
        "\u673A\u5668\u5B66\u4E60",
        "\u8BA1\u7B97\u5E7F\u544A",
        "\u63A8\u8350\u7CFB\u7EDF",
        "\u6280\u672F\u53D8\u73B0"
      ]
    },
    {
      id: "blog-16b361dae94b8995",
      name: "\u51CC\u8D5F's blog",
      url: "https://www.zhukang.tech/feed.xml",
      site: "https://www.zhukang.tech/",
      tags: [
        "\u751F\u6D3B",
        "\u8BFB\u4E66",
        "\u601D\u8003",
        "\u56FD\u5B66",
        "\u7F16\u7A0B",
        "\u5206\u4EAB"
      ]
    },
    {
      id: "blog-ad63f04564772ba4",
      name: "lowinli's blog",
      url: "https://lowin.li/atom.xml",
      site: "https://lowin.li/",
      tags: [
        "NLP",
        "AI",
        "\u5F00\u6E90",
        "\u751F\u6D3B",
        "\u5206\u4EAB"
      ]
    },
    {
      id: "blog-96d7a2590147ca76",
      name: "\u540C\u548C\u6545\u4E8B\u532F",
      url: "https://hocassian.cn/feed/",
      site: "https://hocassian.cn/",
      tags: [
        "\u7DE8\u7A0B",
        "\u96A8\u7B46",
        "Galgame",
        "\u96DC\u8AC7"
      ]
    },
    {
      id: "blog-bcc29edc8610c3f9",
      name: "\u6728\u6FA4\u7684\u7814\u767C\u8166",
      url: "https://woodloch.blog/feed/",
      site: "https://woodloch.blog/",
      tags: [
        "\u7DE8\u7A0B",
        "\u958B\u6E90",
        "\u96A8\u7B46"
      ]
    },
    {
      id: "blog-442db2221babc159",
      name: "\u5468\u826F\u535A\u5BA2",
      url: "https://imzl.com/feed/",
      site: "https://imzl.com/",
      tags: [
        "\u4EA7\u54C1",
        "\u8FD0\u8425",
        "\u5546\u4E1A",
        "\u7F16\u7A0B",
        "WordPress",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-c70fcc82b235aae2",
      name: "DGideas' Blog",
      url: "https://dgideas.net/feed/",
      site: "https://dgideas.net/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-e8f9065945cad327",
      name: "\u55B5\u4E8C\u306E\u5C0F\u535A\u5BA2",
      url: "https://www.miaoer.net/feed",
      site: "https://www.miaoer.net/",
      tags: [
        "\u6280\u672F",
        "\u751F\u6D3B",
        "\u5B66\u4E60"
      ]
    },
    {
      id: "blog-e35d47d530fb4b8f",
      name: "nojsja'\u4E2A\u4EBA\u535A\u5BA2",
      url: "https://nojsja.github.io/blogs/atom.xml",
      site: "https://nojsja.github.io/blogs/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u524D\u7AEF",
        "Linux"
      ]
    },
    {
      id: "blog-2383465c443c59f5",
      name: "itgoyo's blog",
      url: "https://itgoyo.github.io/atom.xml",
      site: "https://itgoyo.github.io/",
      tags: [
        "\u7F16\u7A0B",
        "UP",
        "\u5B66\u4E60",
        "Vim",
        "Mac",
        "Linux"
      ]
    },
    {
      id: "blog-8b7ec464b9526d6a",
      name: "\u601D\u6CC9-Jev0n",
      url: "https://Jev0n.com/feed/",
      site: "https://jev0n.com/",
      tags: [
        "\u5B89\u5168",
        "\u7F16\u7A0B",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-b1096249c1eec270",
      name: "\u6A58\u5B50\u5473\u7684\u5FC3",
      url: "https://www.52xml.cn/atom.xml",
      site: "https://www.52xml.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u5B89\u5168",
        "\u6559\u7A0B"
      ]
    },
    {
      id: "blog-3fa45497a21aaad0",
      name: "hqingLau\u7684\u535A\u5BA2",
      url: "https://orzlinux.cn/index.html",
      site: "https://orzlinux.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u540E\u7AEF",
        "Linux",
        "Bug"
      ]
    },
    {
      id: "blog-6c64f84f5799b930",
      name: "\u6D9B\u53D4",
      url: "https://taoshu.in/feed.xml",
      site: "https://taoshu.in/",
      tags: [
        "\u6280\u672F",
        "\u5B66\u4E60",
        "\u601D\u8003"
      ]
    },
    {
      id: "blog-3977b9f524a35e1e",
      name: "czp's blog",
      url: "https://www.hiczp.com/rss.xml",
      site: "https://www.hiczp.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u7F51\u7EDC"
      ]
    },
    {
      id: "blog-a0dfc9ed6c80a002",
      name: "iMaeGoo's Blog",
      url: "https://www.imaegoo.com/atom.xml",
      site: "https://www.imaegoo.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF",
        "Serverless"
      ]
    },
    {
      id: "blog-6043d3f827a08648",
      name: "\u5927\u5927\u7684\u5C0F\u8717\u725B",
      url: "https://eallion.com/atom.xml",
      site: "https://eallion.com/",
      tags: [
        "\u751F\u6D3B",
        "\u7535\u5546"
      ]
    },
    {
      id: "blog-58552498f4ea1262",
      name: "BAI YUN",
      url: "https://baiyun.me/feed",
      site: "https://baiyun.me/",
      tags: [
        "\u6280\u672F",
        "\u5206\u4EAB"
      ]
    },
    {
      id: "blog-79d102e9ced41a1e",
      name: "\u5B9D\u7855\u535A\u5BA2",
      url: "https://blog.baoshuo.ren/atom.xml",
      site: "https://blog.baoshuo.ren/",
      tags: [
        "\u6280\u672F",
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u524D\u7AEF",
        "\u540E\u7AEF",
        "\u5206\u4EAB",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-768216cef667f3f5",
      name: "\u6C89\u821F\u4FA7\u7554 Blog",
      url: "https://springwood.me/feed/",
      site: "https://springwood.me/",
      tags: [
        "\u6280\u672F",
        "\u65E5\u672C\u751F\u6D3B",
        "iOS",
        "macOS",
        "\u5206\u4EAB"
      ]
    },
    {
      id: "blog-f5829d7bc954e51c",
      name: "\u5B66\u65E0\u6B62\u5883@\u4E00\u70B9\u4E00\u6EF4",
      url: "http://yibie.github.io/index.xml",
      site: "http://gtdstudy.com/",
      tags: [
        "\u9605\u8BFB",
        "\u601D\u8003"
      ]
    },
    {
      id: "blog-b6933e2bc38ce584",
      name: "EdNovas\u7684\u5C0F\u7AD9",
      url: "https://ednovas.xyz/atom.xml",
      site: "https://ednovas.xyz/",
      tags: [
        "\u7F16\u7A0B",
        "\u7B97\u6CD5",
        "Linux",
        "\u79D1\u5B66\u4E0A\u7F51"
      ]
    },
    {
      id: "blog-ccc2ac22af107518",
      name: "wentao's blog",
      url: "https://wentao.org/index.xml",
      site: "https://wentao.org/",
      tags: [
        "\u7F16\u7A0B",
        "\u9605\u8BFB",
        "\u601D\u8003"
      ]
    },
    {
      id: "blog-bc8e8db9e91d5b62",
      name: "\u8D3E\u8DC3\u534E",
      url: "https://www.jiayuehua.com/feed.xml",
      site: "https://www.jiayuehua.com/",
      tags: [
        "\u7F16\u7A0B",
        "C++\uFF0CLinux\uFF0C\u591A\u5F69\u4EBA\u751F"
      ]
    },
    {
      id: "blog-9ddeb7bda1bcc35b",
      name: "\u6728\u9E1F\u6742\u8BB0",
      url: "https://www.qtmuniao.com/atom.xml",
      site: "https://www.qtmuniao.com/",
      tags: [
        "\u5206\u5E03\u5F0F\u7CFB\u7EDF",
        "\u5B58\u50A8",
        "boltdb",
        "\u6E90\u7801\u9605\u8BFB"
      ]
    },
    {
      id: "blog-2b52a8fdfbfc1c40",
      name: "\u7389\u660EBLOG",
      url: "https://xdym11235.com/feed",
      site: "https://xdym11235.com/",
      tags: [
        "\u4FE1\u606F\u5B89\u5168"
      ]
    },
    {
      id: "blog-8a2fab2d87898bc5",
      name: "Godot's Blog",
      url: "https://iamgodot.com/posts/index.xml",
      site: "https://iamgodot.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u601D\u8003",
        "\u65C5\u884C"
      ]
    },
    {
      id: "blog-9bd399d53aed5f40",
      name: "ZingLix Blog",
      url: "https://zinglix.xyz/feed.xml",
      site: "https://zinglix.xyz/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-92457b68031b9262",
      name: "gyro\u6C38\u4E0D\u62BD\u98CE\uFF01",
      url: "https://gyrojeff.top/index.php/feed",
      site: "https://gyrojeff.top/",
      tags: [
        "\u6280\u672F",
        "\u7F16\u7A0B",
        "\u601D\u8003"
      ]
    },
    {
      id: "blog-3e335517f4e1112a",
      name: "DrPika's Blog",
      url: "https://blog.drpika.com/atom.xml",
      site: "https://blog.drpika.com/",
      tags: [
        "\u533B\u5B66",
        "\u968F\u7B14",
        "\u751F\u6D3B",
        "\u601D\u8003",
        "\u653F\u6CBB"
      ]
    },
    {
      id: "blog-3498b9ab780b3f60",
      name: "whyes\u7684\u535A\u5BA2",
      url: "https://whyes.org/feed.xml",
      site: "https://whyes.org/",
      tags: [
        "\u533B\u5B66",
        "\u79D1\u7814",
        "\u4E34\u5E8A\u7814\u7A76",
        "\u786C\u4EF6"
      ]
    },
    {
      id: "blog-01047dc349a6f9b0",
      name: "\u661F\u8FB0\u65E5\u8BB0",
      url: "https://blog.xsot.cn/feed",
      site: "https://blog.xsot.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u5206\u4EAB",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-01b23718db66774b",
      name: "\u98CE\u96E8\u96F7\u7535\u5802",
      url: "https://www.linchangyu.com/feed.xml",
      site: "https://www.linchangyu.com/",
      tags: [
        "\u6781\u5BA2",
        "\u7F16\u7A0B",
        "UX"
      ]
    },
    {
      id: "blog-878cefd6c4c5408b",
      name: "White Space",
      url: "https://whites.space/feed",
      site: "https://whites.space/",
      tags: [
        "\u8BBE\u8BA1\u968F\u7B14",
        "\u751F\u6D3B",
        "\u601D\u8003"
      ]
    },
    {
      id: "blog-ab1795dbc1cfaede",
      name: "\u975E\u5B66\xB7\u6D3E",
      url: "https://fxpai.com/feed",
      site: "https://fxpai.com/",
      tags: [
        "\u6444\u5F71",
        "\u6280\u672F",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-aac2d7122c37d58f",
      name: "Ayx \u535A\u5BA2",
      url: "https://imayx.top/index.xml",
      site: "https://imayx.top/",
      tags: [
        "\u4FE1\u606F\u5B66\u7ADE\u8D5B",
        "C++",
        "\u7B97\u6CD5",
        "\u7F16\u7A0B",
        "\u60F3\u6CD5",
        "\u968F\u7B14",
        "\u751F\u6D3B",
        "\u5206\u4EAB",
        "\u8BB0\u5F55"
      ]
    },
    {
      id: "blog-77088a44e87b3fab",
      name: "\u5FD8\u5FE7 \u5FD8\u5FE7\u7684\u5C0F\u7AD9",
      url: "https://wangyou233.wang/rss",
      site: "https://wangyou233.wang/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u5206\u4EAB",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-b10439652a324750",
      name: "\u7F51\u7EDC\u70ED\u5EA6",
      url: "https://www.packetmania.net/atom.xml",
      site: "https://www.packetmania.net/",
      tags: [
        "\u7F51\u7EDC",
        "\u7F16\u7A0B",
        "\u5BC6\u7801\u5B66"
      ]
    },
    {
      id: "blog-e794da76acae6c7b",
      name: "\u87F9\u58F3",
      url: "https://shellc.cn/feed.xml",
      site: "https://shellc.cn/",
      tags: [
        "\u6280\u672F",
        "\u8BFB\u4E66",
        "\u521B\u4E1A",
        "\u6295\u8D44"
      ]
    },
    {
      id: "blog-8adf849dbdfd7e0c",
      name: "icebreaker",
      url: "https://www.icebreaker.top/rss.xml",
      site: "https://www.icebreaker.top/",
      tags: [
        "\u5927\u524D\u7AEF",
        "\u7F16\u7A0B",
        "\u968F\u7B14",
        "\u5373\u65F6\u6218\u7565"
      ]
    },
    {
      id: "blog-406fa0e727d3cbb3",
      name: "\u95F2\u8DA3\u65E5\u8BC4",
      url: "https://xqrp.com/feed",
      site: "https://xqrp.com/",
      tags: [
        "\u751F\u6D3B",
        "\u7B14\u8BB0",
        "\u5206\u4EAB"
      ]
    },
    {
      id: "blog-3a50c127a492976e",
      name: "\u6106\u4F0F",
      url: "https://www.tortorse.com/atom.xml",
      site: "https://www.tortorse.com/",
      tags: [
        "\u4EA7\u54C1",
        "\u524D\u7AEF",
        "\u8BBE\u8BA1",
        "\u6742\u8C08"
      ]
    },
    {
      id: "blog-4eff40f1d773176c",
      name: "Librehat's Blog",
      url: "https://www.librehat.com/feed",
      site: "https://www.librehat.com/",
      tags: [
        "C++",
        "Qt",
        "Python",
        "Linux",
        "Windows",
        "\u7F51\u7EDC",
        "\u7F16\u7A0B",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-2a0692c31646d65b",
      name: "\u51AF\u5144\u8BDD\u5409\u535A\u5BA2",
      url: "https://fengmengzhao.github.io/feed.xml",
      site: "https://fengmengzhao.github.io/",
      tags: [
        "Java",
        "Linux",
        "\u7F16\u7A0B",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-389ce89775c1cd8d",
      name: "\u5F53\u4EE3\u5199\u4F5C\u4ED3\u5E93",
      url: "https://zuopin.jingluole.com/feed",
      site: "https://zuopin.jingluole.com/",
      tags: [
        "\u7EAF\u6587\u5B66",
        "\u5199\u4F5C",
        "\u5C0F\u8BF4",
        "\u8BD7\u6B4C",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-3cfaf524276ef0fe",
      name: "\u7A0B\u5E8F\u733FDD",
      url: "https://blog.didispace.com/atom.xml",
      site: "https://blog.didispace.com/",
      tags: [
        "Java",
        "Spring",
        "\u7F16\u7A0B",
        "\u601D\u8003"
      ]
    },
    {
      id: "blog-1fe89e83d720a104",
      name: "\u6B65\u4E08\u4E5D\u5DDE\u7684\u535A\u5BA2",
      url: "https://www.buzhangjiuzhou.com/index.php/feed/",
      site: "https://www.buzhangjiuzhou.com/",
      tags: [
        "\u535A\u5BA2",
        "\u968F\u60F3"
      ]
    },
    {
      id: "blog-ed576c7c0e7c6773",
      name: "SKYue's Home",
      url: "https://www.skyue.com/feed/",
      site: "https://www.skyue.com/",
      tags: [
        "\u751F\u6D3B",
        "\u80A1\u7968\u6295\u8D44",
        "\u4EA7\u54C1\u7ECF\u7406",
        "\u8F6F\u4EF6\u6570\u7801"
      ]
    },
    {
      id: "blog-8770956e7178d69d",
      name: "BBing's Blog",
      url: "https://www.bbing.com.cn/index.xml",
      site: "https://www.bbing.com.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-7f44374b8ecbfd94",
      name: "lzw-723's blog",
      url: "https://lzw-723.github.io/atom.xml",
      site: "https://blog.lzwi.fun/",
      tags: [
        "\u7F16\u7A0B",
        "\u7FFB\u8BD1",
        "\u5199\u4F5C",
        "\u52A8\u753B",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-6fd2599cb7a3c41a",
      name: "2BAB \u7684\u5DE5\u7A0B\u535A\u5BA2",
      url: "https://2bab.me/atom.xml",
      site: "https://2bab.me/",
      tags: [
        "Android",
        "\u7F16\u8BD1\u6784\u5EFA"
      ]
    },
    {
      id: "blog-8dcaa2c7add1ae4b",
      name: "ypingcn's blog",
      url: "https://blog.ypingcn.com/feed.xml",
      site: "https://blog.ypingcn.com/",
      tags: [
        "\u6280\u672F",
        "\u751F\u6D3B",
        "\u5206\u4EAB",
        "\u706B\u72D0",
        "\u6295\u8D44"
      ]
    },
    {
      id: "blog-261b645fa4c04cd0",
      name: "LCZBlog",
      url: "https://blog.licaoz.com/feed/",
      site: "https://blog.licaoz.com/",
      tags: [
        "\u751F\u6D3B",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-e74906223bceda8e",
      name: "Surmon.me",
      url: "https://surmon.me/rss.xml",
      site: "https://surmon.me/",
      tags: [
        "\u524D\u7AEF",
        "\u7F16\u7A0B",
        "\u601D\u8003"
      ]
    },
    {
      id: "blog-ac8dbc2bdf21224a",
      name: "ZhensJoke \u98DE\u4E91\u7B97",
      url: "https://blog.fyun.org/feed",
      site: "https://blog.fyun.org/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u6298\u817E"
      ]
    },
    {
      id: "blog-3f3850f44a18a254",
      name: "\u5343\u53E4\u58F9\u53F7",
      url: "https://qianguyihao.com/atom.xml",
      site: "https://www.qianguyihao.com/",
      tags: [
        "\u524D\u7AEF",
        "\u8BFB\u4E66\u7B14\u8BB0",
        "\u4EA7\u54C1\u601D\u8003",
        "\u8F6F\u4EF6\u5DE5\u5177",
        "\u5177\u4F53\u751F\u6D3B"
      ]
    },
    {
      id: "blog-c265f5fe1171c128",
      name: "Kevin Blog",
      url: "https://blog.kevinzhow.com/rss/",
      site: "https://blog.kevinzhow.com/",
      tags: [
        "\u4EA7\u54C1",
        "\u6280\u672F",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-f57a638ecb8e7d26",
      name: "Tmr Blog",
      url: "https://blog.xlab.app/atom.xml",
      site: "https://blog.xlab.app/",
      tags: [
        "\u5B89\u5168",
        "\u601D\u8003"
      ]
    },
    {
      id: "blog-a12e644ffd6754b0",
      name: "\u5C0F\u7403\u98DE\u9C7C",
      url: "https://mantyke.icu/index.xml",
      site: "https://mantyke.icu/",
      tags: [
        "\u751F\u6D3B",
        "\u7B14\u8BB0",
        "\u8BFB\u4E66"
      ]
    },
    {
      id: "blog-008b4dbe0a6a98a8",
      name: "\u7D20\u5C65\u72EC\u884C",
      url: "https://blog.yuanpei.me/atom.xml",
      site: "https://blog.yuanpei.me/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u601D\u8003"
      ]
    },
    {
      id: "blog-803255a995435957",
      name: "\u5F00\u98DE\u673A\u7684\u8001\u5F20",
      url: "https://kaifeiji.cc/atom.xml",
      site: "https://kaifeiji.cc/",
      tags: [
        "\u7F16\u7A0B",
        "\u624B\u5DE5",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-0048e20b09841f14",
      name: "jdhao's blog",
      url: "https://jdhao.github.io/index.xml",
      site: "https://jdhao.github.io/",
      tags: [
        "\u7F16\u7A0B",
        "Nvim",
        "\u751F\u6D3B",
        "\u8BFB\u4E66",
        "\u601D\u8003"
      ]
    },
    {
      id: "blog-0d40be26f931c4c2",
      name: "\u738B\u5C0F\u55E8\u7684\u4E0D\u8001\u6B4C",
      url: "https://sogola.com/index.xml",
      site: "https://sogola.com/",
      tags: [
        "\u9A6C\u514B\u601D\u4E3B\u4E49",
        "\u5DE5\u4EBA",
        "\u5DE5\u5382",
        "\u8BFB\u4E66",
        "\u7FFB\u8BD1"
      ]
    },
    {
      id: "blog-495459235b298d65",
      name: "\u4E1C\u6CFD\u716E\u7CA5",
      url: "https://eurychen.me/index.xml",
      site: "https://eurychen.me/",
      tags: [
        "\u673A\u5668\u5B66\u4E60",
        "\u533A\u5757\u94FE",
        "\u97F3\u4E50",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-5c933253194d6591",
      name: "icy's blog",
      url: "https://icys.top/atom.xml",
      site: "https://icys.top/",
      tags: [
        "\u7F16\u7A0B",
        "\u601D\u8003",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-da33db2661274884",
      name: "Alliot's blog",
      url: "https://blog.alliot.tech/atom.xml",
      site: "https://blog.alliot.tech/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u8FD0\u7EF4",
        "\u786C\u4EF6"
      ]
    },
    {
      id: "blog-ec3a57c1dddfcc03",
      name: "\u7A0B\u5E8F\u5458\u5145\u7535\u7AD9",
      url: "https://itcharge.cn/feed/",
      site: "https://itcharge.cn/",
      tags: [
        "iOS",
        "\u7B97\u6CD5",
        "\u6570\u636E\u7ED3\u6784",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-d04b22b1b7243269",
      name: "Yuk\u7684\u90E8\u843D\u683C",
      url: "https://blog.yuk7.com/atom.xml",
      site: "https://blog.yuk7.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u7ED8\u753B",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-78a6233ab9c3a513",
      name: "Domon",
      url: "https://www.domon.cn/rss/",
      site: "https://www.domon.cn/",
      tags: [
        "\u6280\u672F",
        "\u751F\u6D3B",
        "\u4EA7\u54C1"
      ]
    },
    {
      id: "blog-f013ac8b98b25ff2",
      name: "[\u7C73\u968F\u968F] s5s5",
      url: "https://s5s5.me/feed/",
      site: "https://s5s5.me/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u601D\u8003"
      ]
    },
    {
      id: "blog-49d7f5315edb73d0",
      name: "Dvel's Blog",
      url: "https://dvel.me/index.xml",
      site: "https://dvel.me/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-49c5eb3d1105c4d3",
      name: "\u9ED1\u7FBD\u7684\u4E2A\u4EBA\u535A\u5BA2",
      url: "https://blog.thetbw.xyz/atom.xml",
      site: "https://blog.thetbw.xyz/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-107ca8081f4c520a",
      name: "\u5C71\u6708",
      url: "https://sanguok.com/feed/",
      site: "https://sanguok.com/",
      tags: [
        "\u6587\u827A",
        "\u6587\u5B66",
        "\u5F71\u89C6",
        "\u8BED\u8A00",
        "\u65E5\u8BED",
        "\u65B9\u8A00",
        "\u968F\u7B14",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-5de23fbcb18c9202",
      name: "\u521D\u4E4B\u97F3",
      url: "https://www.himiku.com/feed",
      site: "https://www.himiku.com/",
      tags: [
        "\u52A8\u753B",
        "\u6E38\u620F",
        "\u65E5\u5E38",
        "\u4E8C\u6B21\u5143"
      ]
    },
    {
      id: "blog-ab040ab2f912e89a",
      name: "L\u306EWorld",
      url: "https://lllgoyour.com/feed/",
      site: "https://lllgoyour.com/",
      tags: [
        "\u52A8\u753B",
        "\u6587\u5B66",
        "\u8BED\u8A00",
        "\u5B66\u672F",
        "\u6280\u672F",
        "\u751F\u6D3B",
        "\u4E8C\u6B21\u5143",
        "\u97F3\u4E50",
        "\u7F16\u7A0B",
        "\u5B89\u5168"
      ]
    },
    {
      id: "blog-1b4aa7cbf6f7a779",
      name: "\u7AF9\u6797\u91CC\u6709\u51B0\u7684\u535A\u5BA2",
      url: "https://zhul.in/rss.xml",
      site: "https://zhul.in/",
      tags: [
        "\u6280\u672F",
        "\u6298\u817E",
        "\u7B14\u8BB0",
        "\u5206\u4EAB"
      ]
    },
    {
      id: "blog-1acf2011ec29ed9c",
      name: "\u4E00\u9897\u5C0F\u6811",
      url: "https://yeshu.cloud/atom.xml",
      site: "https://yeshu.cloud/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u6295\u8D44"
      ]
    },
    {
      id: "blog-db976fd2b3f13f2c",
      name: "Huiliu",
      url: "https://fucktheworld.top/atom.xml",
      site: "https://fucktheworld.top/",
      tags: [
        "\u6444\u5F71",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-0c48f32b737d9197",
      name: "yiyun's Blog",
      url: "https://moeci.com/atom.xml",
      site: "https://moeci.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u5168\u6808",
        "\u673A\u5668\u5B66\u4E60"
      ]
    },
    {
      id: "blog-68520950093b2249",
      name: "EE Archeology \u7535\u5B50\u8003\u53E4\u5B66",
      url: "http://7400.me/atom.xml",
      site: "http://7400.me/",
      tags: [
        "\u786C\u4EF6",
        "\u6444\u5F71",
        "\u6298\u817E",
        "\u65E0\u7EBF\u7535"
      ]
    },
    {
      id: "blog-7e99347d8e2c378c",
      name: "\u8D6B\u5C14\u7C73\u5A1C\u53CA\u5176\u4ED6",
      url: "https://hermine.in/atom.xml",
      site: "https://hermine.in/",
      tags: [
        "\u968F\u7B14",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-8e13c9b4367ced0b",
      name: "jtr109's Castle",
      url: "https://www.jtr109.com/index.xml",
      site: "https://jtr109.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-3c02197095d8f522",
      name: "\u4E54\u514B\u53D4\u53D4\u7684\u5E8A\u8FB9\u6545\u4E8B",
      url: "https://lifeodyssey.github.io/atom.xml",
      site: "https://lifeodyssey.github.io/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u9065\u611F",
        "\u79D1\u7814"
      ]
    },
    {
      id: "blog-666a62db15f7b4c3",
      name: "\u5370\u8BB0",
      url: "https://yinji.org/feed",
      site: "https://yinji.org/",
      tags: [
        "\u751F\u6D3B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-82f9f2084b1f57ed",
      name: "\u6797\u6797\u6742\u8BED",
      url: "https://www.xiaozonglin.cn/feed/",
      site: "https://www.xiaozonglin.cn/",
      tags: [
        "\u751F\u6D3B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-4cd7029a6d7ef6f3",
      name: "\u4E00\u53F6\u658B",
      url: "https://xieguanglei.github.io/blog/feed.xml",
      site: "https://xieguanglei.github.io/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-2eed24bfdbfb24de",
      name: "WangDeer",
      url: "https://w.toomore.us/index.xml",
      site: "https://w.toomore.us/",
      tags: [
        "\u751F\u6D3B",
        "\u8BFB\u4E66",
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-9d0a429dcf88073f",
      name: "Wenxuan 1999",
      url: "https://www.whexy.com/feed/feed.xml",
      site: "https://www.whexy.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u5B89\u5168",
        "\u7CFB\u7EDF"
      ]
    },
    {
      id: "blog-d56f250cc3ca7694",
      name: "\u5C79\u94ED\u8BF4",
      url: "https://www.iccat.cn/feed",
      site: "https://www.iccat.cn/",
      tags: [
        "\u751F\u6D3B",
        "\u9605\u8BFB",
        "\u6444\u5F71"
      ]
    },
    {
      id: "blog-6cdd9b87fe9a8156",
      name: "JohnSmith\u7684\u5C0F\u5BB6",
      url: "https://xsn123.top/feed/",
      site: "https://xsn123.top/",
      tags: [
        "\u751F\u6D3B",
        "\u968F\u7B14",
        "\u7F16\u7A0B",
        "\u79D1\u7814"
      ]
    },
    {
      id: "blog-0d3e5aabaf685ef3",
      name: "ShineKid",
      url: "https://shinekid.com/feed/",
      site: "https://shinekid.com/",
      tags: [
        "\u751F\u6D3B",
        "\u5F71\u89C6",
        "\u6587\u5B66"
      ]
    },
    {
      id: "blog-f7265378223af53f",
      name: "An's Blog",
      url: "https://zincnode.com/index.xml",
      site: "https://zincnode.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u601D\u8003",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-bce30cd6f6f02c40",
      name: "\u7F57\u4E8C\u5FB7",
      url: "https://lorde627.xyz/atom.xml",
      site: "https://Lorde627.xyz/",
      tags: [
        "\u6298\u817E",
        "\u751F\u6D3B",
        "\u6570\u5B57"
      ]
    },
    {
      id: "blog-c74540a535b659fa",
      name: "zStack",
      url: "https://blog.noicdi.com/atom.xml",
      site: "https://blog.noicdi.com/",
      tags: [
        "\u7B14\u8BB0",
        "\u7F16\u7A0B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-d77da1f5a450a088",
      name: "\u70E7\u997C\u535A\u5BA2",
      url: "https://u.sb/rss.xml",
      site: "https://u.sb/",
      tags: [
        "\u8FD0\u7EF4",
        "\u57DF\u540D"
      ]
    },
    {
      id: "blog-00134be2d3024bb2",
      name: "Lei Mao's Log Book",
      url: "https://leimao.github.io/atom.xml",
      site: "https://leimao.github.io/",
      tags: [
        "\u4EBA\u5DE5\u667A\u80FD",
        "\u673A\u5668\u5B66\u4E60",
        "\u8BA1\u7B97\u673A\u79D1\u5B66",
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-42624d2a99f3a99f",
      name: "gd1214b's blog",
      url: "https://blog.gd1214b.icu/atom.xml",
      site: "https://blog.gd1214b.icu/",
      tags: [
        "\u6280\u672F",
        "\u65F6\u8BC4"
      ]
    },
    {
      id: "blog-2ac7f7c47e7e2029",
      name: "Sirius's Blog",
      url: "https://blog.yeefire.com/atom.xml",
      site: "https://blog.yeefire.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u8FD0\u7EF4",
        "\u751F\u6D3B",
        "Linux",
        "\u5206\u4EAB"
      ]
    },
    {
      id: "blog-4d4703a4269e59b7",
      name: "7Wate`s Blog",
      url: "https://blog.7wate.com/rss.xml",
      site: "https://blog.7wate.com/",
      tags: [
        "\u751F\u6D3B",
        "\u5F00\u53D1",
        "\u65C5\u884C",
        "\u6444\u5F71",
        "\u5206\u4EAB"
      ]
    },
    {
      id: "blog-e626aaa7994112f6",
      name: "\u884C\u8FD0\u8BBE\u8BA1\u5E08",
      url: "https://www.luckydesigner.space/feed",
      site: "https://www.luckydesigner.space/",
      tags: [
        "\u7F16\u7A0B",
        "\u5206\u4EAB",
        "\u6280\u672F",
        "\u79D1\u6280"
      ]
    },
    {
      id: "blog-4bc2e7aab910609f",
      name: "\u53F8\u9A6C\u4ED6",
      url: "https://www.congcong.us/feed",
      site: "https://www.congcong.us/",
      tags: [
        "\u751F\u6D3B",
        "\u968F\u7B14",
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-7302afaa6e1d335e",
      name: "elmagnifico",
      url: "http://elmagnifico.tech/feed.xml",
      site: "http://elmagnifico.tech/",
      tags: [
        "\u5D4C\u5165\u5F0F",
        "\u968F\u7B14",
        "\u6E38\u620F",
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-e4ebf88846cdd6f9",
      name: "\u9648\u6631\u884C\u535A\u5BA2",
      url: "https://blog.yuhang.ch/index.xml",
      site: "https://blog.yuhang.ch/",
      tags: [
        "\u968F\u7B14",
        "\u751F\u6D3B",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-809b4d214796331c",
      name: "\u51B0\u4EE5\u4E1C\u7684\u535A\u5BA2",
      url: "https://bninecoding.com/atom.xml",
      site: "https://bninecoding.com/",
      tags: [
        "iOS",
        "\u7F16\u7A0B",
        "\u804C\u573A",
        "\u4EA7\u54C1\u89C2",
        "\u6280\u672F\u65B9\u6848"
      ]
    },
    {
      id: "blog-90708b1d48ffca18",
      name: "inDev. Journal",
      url: "https://www.frankindev.com/feed.xml",
      site: "https://www.frankindev.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u5206\u4EAB",
        "\u6280\u672F",
        "\u79D1\u6280"
      ]
    },
    {
      id: "blog-701fc2f801bc389a",
      name: "\u7A46\u91CE\u971C\u6CC9\u7684\u9ED1\u6D1E",
      url: "https://muyesq.cn/index.xml",
      site: "https://muyesq.cn/",
      tags: [
        "\u8BD7\u6B4C",
        "\u6587\u5B66"
      ]
    },
    {
      id: "blog-485e89b8c98ba41d",
      name: "\u6742\u70E9\u996D",
      url: "https://zahui.fan/index.xml",
      site: "https://zahui.fan/",
      tags: [
        "\u7F16\u7A0B",
        "\u8FD0\u7EF4",
        "\u6280\u672F",
        "\u6298\u817E",
        "\u5B89\u5168"
      ]
    },
    {
      id: "blog-10bc93a2647cc70d",
      name: "conge",
      url: "https://conge.github.io/feed.xml",
      site: "https://conge.github.io/",
      tags: [
        "\u751F\u6D3B",
        "\u8DD1\u6B65",
        "\u9605\u8BFB"
      ]
    },
    {
      id: "blog-f9553c8a5c4f05f2",
      name: "zd\u5C0F\u8FBE's blog",
      url: "https://blog.zhangda.xyz/feed/",
      site: "https://blog.zhangda.xyz/",
      tags: [
        "\u6280\u672F",
        "\u6298\u817E",
        "\u6559\u7A0B"
      ]
    },
    {
      id: "blog-a40a577fbd849052",
      name: "\u50CF\u6E05\u6C34\u4E00\u822C\u6E05\u6F88\u900F\u660E",
      url: "https://sumsec.me/resources/atom.xml",
      site: "https://sumsec.me/",
      tags: [
        "\u6280\u672F",
        "\u5B89\u5168",
        "\u751F\u6D3B",
        "Java\u5B89\u5168"
      ]
    },
    {
      id: "blog-45241df422a2b991",
      name: "ROYWANG",
      url: "https://roy.wang/feed/",
      site: "https://roy.wang/",
      tags: [
        "\u6280\u672F",
        "\u751F\u6D3B",
        "\u65E5\u8BB0"
      ]
    },
    {
      id: "blog-1aabf388eee72dec",
      name: "Vulkey_Chen's Blog",
      url: "https://gh0st.cn/feed.xml",
      site: "https://gh0st.cn/",
      tags: [
        "\u5B89\u5168",
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-3d75cef3110de509",
      name: "zjun's blog",
      url: "https://blog.zjun.info/rss.xml",
      site: "https://blog.zjun.info/",
      tags: [
        "\u5B89\u5168",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-a7aa4f412b17e031",
      name: "RUNNINGJ",
      url: "https://runningj.top/feed.xml",
      site: "https://runningj.top/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u9605\u8BFB",
        "\u7F8E\u98DF",
        "\u521B\u4E1A"
      ]
    },
    {
      id: "blog-823d60810d29d4f9",
      name: "\u7985\u623F\u82B1\u6728",
      url: "https://jdqiong.cn/rss.xml",
      site: "https://jdqiong.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u521B\u4F5C"
      ]
    },
    {
      id: "blog-e18b8c1b372eee85",
      name: "Frange Zone\uFF5CXu's Blog",
      url: "https://frangezone.github.io/index.xml",
      site: "https://frangezone.github.io/",
      tags: [
        "\u4EA7\u54C1",
        "\u751F\u6D3B",
        "\u6570\u7801",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-82c4bcb6bba028cf",
      name: "\u7A0B\u5E8F\u5458\u7684\u55B5",
      url: "https://catcoding.me/atom.xml",
      site: "https://catcoding.me/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u5199\u4F5C",
        "\u9605\u8BFB",
        "\u5206\u4EAB"
      ]
    },
    {
      id: "blog-848d4c9778efa046",
      name: "\u540E\u7AEF\u5DE5\u7A0B\u5E08",
      url: "https://hdgcs.com/feed.xml",
      site: "https://hdgcs.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u5F00\u6E90",
        "\u540E\u7AEF"
      ]
    },
    {
      id: "blog-7328790d5f5da067",
      name: "BlogKe\u8BB0\u5F55\u5FD7",
      url: "https://blogke.cn/index.xml",
      site: "https://blogke.cn/index.html",
      tags: [
        "\u7B14\u8BB0",
        "\u60F3\u6CD5"
      ]
    },
    {
      id: "blog-2313030567fa749f",
      name: "nickChenyx",
      url: "https://nickchenyx.github.io/atom.xml",
      site: "https://nickchenyx.github.io/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u5206\u4EAB"
      ]
    },
    {
      id: "blog-a1baf2eb3b9463da",
      name: "\u8BA9\u6211\u4EEC\u4E00\u8D77\u53D1\u73B0\u897F\u897F\u91CC\u5C9B",
      url: "https://mattia88.com/feed/",
      site: "https://mattia88.com/",
      tags: [
        "\u897F\u897F\u91CC\u4EBA",
        "\u897F\u897F\u91CC\u65C5\u6E38"
      ]
    },
    {
      id: "blog-b2315981be0d2c2e",
      name: "Shadow Walker \u677E\u70DF\u9601",
      url: "https://www.edony.ink/rss/",
      site: "https://www.edony.ink/",
      tags: [
        "Linux \u64CD\u4F5C\u7CFB\u7EDF\u5B89\u5168",
        "LSM",
        "ebpf",
        "\u57FA\u7840\u8BBE\u65BD\u53EF\u4FE1",
        "\u4EA7\u54C1\u601D\u8003",
        "\u6570\u5B57\u82B1\u56ED",
        "Obsidian"
      ]
    },
    {
      id: "blog-765430fbffd22e49",
      name: "\u70DF\u8349\u7684\u9999\u5473",
      url: "https://hujingnb.com/feed",
      site: "https://hujingnb.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-d92181606b544c27",
      name: "SpaceTime Blog",
      url: "https://blog.spacetimee.xyz/atom.xml",
      site: "https://blog.spacetimee.xyz/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-abc3e3fe739d7ffb",
      name: "\u98DE\u7FD4\u6CAB\u6CAB\u60C5\u535A\u5BA2",
      url: "https://www.fxkjnj.com/feed/",
      site: "https://fxkjnj.com/",
      tags: [
        "\u79D1\u6280",
        "\u8FD0\u7EF4",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-1a0b869d92e55f6d",
      name: "\u5E06\u57DF - \u5E06\u5E06\u7684\u4E2A\u4EBA\u7AD9",
      url: "https://www.fancraft.top/feed/",
      site: "https://www.fancraft.top/",
      tags: [
        "\u5B66\u4E1A",
        "\u7F16\u7A0B",
        "\u5174\u8DA3",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-6f1a17500c6e5fa9",
      name: "Jieran233's Blog",
      url: "https://jieran233.github.io/feed.xml",
      site: "https://jieran233.github.io/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14",
        "\u8BB0\u5F55"
      ]
    },
    {
      id: "blog-d14ada2e991a4801",
      name: "Zkeq\u306ECoding\u65E5\u5FD7",
      url: "https://icodeq.com/feed.xml",
      site: "https://icodeq.com/",
      tags: [
        "\u7F16\u7A0B",
        "Python"
      ]
    },
    {
      id: "blog-889932b92c48e765",
      name: "Redish101\u535A\u5BA2",
      url: "https://blog.redish101.top/atom.xml",
      site: "https://blog.redish101.top/",
      tags: [
        "Python",
        "Java",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-0a349425fbfa0800",
      name: "Amicoyuan\u7684\u9AD8\u6027\u80FD\u8BA1\u7B97\u4E16\u754C",
      url: "https://my-rssh-gwb5d33jd-amicoyuan.vercel.app/hexo/fluid/xingyuanjie.top",
      site: "https://xingyuanjie.top/",
      tags: [
        "\u9AD8\u6027\u80FD\u8BA1\u7B97",
        "\u5E76\u884C\u8BA1\u7B97",
        "\u6027\u80FD\u4F18\u5316",
        "\u7B97\u6CD5"
      ]
    },
    {
      id: "blog-0489c2a168a3daa7",
      name: "Measure Zero",
      url: "https://shiina18.github.io/atom.xml",
      site: "https://shiina18.github.io/",
      tags: [
        "\u7B14\u8BB0",
        "\u6E38\u620F",
        "\u673A\u5668\u5B66\u4E60"
      ]
    },
    {
      id: "blog-35e38b60eead4d75",
      name: "Sc's \u795E\u5947\u7684JavaWeb",
      url: "https://shicheng.cool/atom.xml",
      site: "https://shicheng.cool/",
      tags: [
        "Java",
        "SSM",
        "Linux",
        "\u524D\u540E\u7AEF"
      ]
    },
    {
      id: "blog-94343ecca47c0a2f",
      name: "openSUSE \u4E2D\u6587\u793E\u533A",
      url: "https://suse.org.cn/feed.xml",
      site: "https://suse.org.cn/",
      tags: [
        "Linux",
        "openSUSE",
        "\u65B0\u95FB",
        "\u672C\u5730\u5316"
      ]
    },
    {
      id: "blog-8877d7cd5a69ba8a",
      name: "D2PE",
      url: "https://d2pe.com/atom.xml",
      site: "https://d2pe.com/",
      tags: [
        "\u91D1\u878D",
        "\u6280\u672F",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-fad8f728d6d54231",
      name: "Moeif",
      url: "https://blog.moeif.com/index.xml",
      site: "https://blog.moeif.com/",
      tags: [
        "\u72EC\u7ACB\u5F00\u53D1",
        "\u6280\u672F",
        "\u6E38\u620F"
      ]
    },
    {
      id: "blog-cfeea54d5416e1a5",
      name: "\u9891\u7387 - \u98CE\u5377\u8FC7\u7684\u8D77\u70B9",
      url: "https://pinlyu.com/feed/",
      site: "https://pinlyu.com/",
      tags: [
        "\u968F\u7B14",
        "\u89C2\u70B9",
        "\u751F\u6D3B",
        "\u5F71\u89C6"
      ]
    },
    {
      id: "blog-5b3148d1696e5e28",
      name: "Peacalm Notes - \u53CC\u5168\u7684\u7F51\u7AD9",
      url: "https://lishuangquan.cn/index.xml",
      site: "https://lishuangquan.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u540E\u7AEF",
        "\u4E92\u8054\u7F51",
        "\u6280\u672F",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-a0c278c682b5a3c4",
      name: "icodex - \u4E2A\u4EBA\u7F51\u7AD9",
      url: "https://icodex.me/atom.xml",
      site: "https://icodex.me/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF",
        "\u4E92\u8054\u7F51",
        "\u6280\u672F",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-6ca8dad181aa82ec",
      name: "shrik3",
      url: "https://shrik3.com/index.xml",
      site: "https://shrik3.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u968F\u7B14",
        "\u97F3\u4E50"
      ]
    },
    {
      id: "blog-0382958dce74571c",
      name: "MegaMU\u4E2A\u4EBA\u7AD9",
      url: "https://megamu.icu/feed.xml",
      site: "https://megamu.icu/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u6821\u56ED",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-bf538db59644f825",
      name: "Rei's Blog",
      url: "https://rei.ac/index.xml",
      site: "https://rei.ac/",
      tags: [
        "\u6280\u672F",
        "\u7B97\u6CD5",
        "\u6298\u817E"
      ]
    },
    {
      id: "blog-5bc27b0ee3e70c28",
      name: "yonniye's blog",
      url: "https://yonniye.com/feed",
      site: "https://yonniye.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u5730\u4FE1",
        "Python",
        "\u968F\u7B14",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-643e6acd3c6ebba5",
      name: "Cubik\u7684\u5C0F\u7AD9",
      url: "https://cubik65536.top/atom.xml",
      site: "http://cubik65536.top/",
      tags: [
        "\u7F16\u7A0B",
        "\u5F00\u53D1",
        "\u6298\u817E",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-4c94ab053bfdf21c",
      name: "Peijie's Wiki",
      url: "https://liupj.top/atom.xml",
      site: "https://liupj.top/",
      tags: [
        "CS",
        "\u6298\u817E",
        "\u968F\u60F3"
      ]
    },
    {
      id: "blog-1ee16b47ed518f0d",
      name: "Yunfeng's Simple Blog",
      url: "https://vra.github.io/atom.xml",
      site: "https://vra.github.io/",
      tags: [
        "\u8BA1\u7B97\u673A\u89C6\u89C9",
        "Linux",
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-3220380a653cecc0",
      name: "Lao_Liu's Blog",
      url: "https://blog.laoliu.eu.org/atom.xml",
      site: "https://blog.laoliu.eu.org/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u5F00\u53D1",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-8846405a80af8d17",
      name: "QAIU's Blog",
      url: "https://blog.qaiu.top/rss.xml",
      site: "https://blog.qaiu.top/",
      tags: [
        "\u624B\u673A\u7F16\u7A0B",
        "\u6280\u672F",
        "\u5F00\u53D1",
        "\u6559\u7A0B",
        "C4droid"
      ]
    },
    {
      id: "blog-de64767f82d371c7",
      name: "\u597D\u5DE5\u5177\u5468\u520A",
      url: "https://bestxtools.github.io/atom.xml",
      site: "https://bestxtools.github.io/",
      tags: [
        "\u5DE5\u5177",
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u8BBE\u8BA1"
      ]
    },
    {
      id: "blog-8b79d7a0a76d844a",
      name: "\u72EC\u7ACB\u5F00\u53D1\u53D8\u73B0\u5468\u520A",
      url: "https://www.ezindie.com/feed/rss.xml",
      site: "https://www.ezindie.com/",
      tags: [
        "\u72EC\u7ACB\u5F00\u53D1\u8005",
        "\u5F00\u53D1"
      ]
    },
    {
      id: "blog-fa90e95e2850db36",
      name: "\u8FD0\u7EF4\u5496\u5561\u5427",
      url: "https://blog.ops-coffee.cn/feed.xml",
      site: "https://blog.ops-coffee.cn/",
      tags: [
        "devops",
        "\u8FD0\u7EF4",
        "\u81EA\u52A8\u5316\u5F00\u53D1",
        "\u6280\u672F",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-5da14aea8f2f0e1c",
      name: "EINDEX's Blog",
      url: "https://eindex.me/feed.xml",
      site: "https://eindex.me/",
      tags: [
        "\u540E\u7AEF",
        "\u7B97\u6CD5",
        "\u5E94\u7528\u5B89\u5168",
        "HomeLab",
        "\u6444\u5F71",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-cd6cfd9721fbf5d0",
      name: "OK Computer\u300C\u597D\u7535\u8111\u300D",
      url: "https://wumanho.cn/index.xml",
      site: "https://wumanho.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u524D\u7AEF",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-3e4fbd957a99ebec",
      name: "\u8FDC\u98DE\u95F2\u8BB0",
      url: "https://leonhe.cn/index.xml",
      site: "https://leonhe.cn/",
      tags: [
        "\u9605\u8BFB",
        "\u601D\u8003",
        "\u751F\u6D3B",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-57d6ecebab1bb0a5",
      name: "Pseudoyu",
      url: "https://www.pseudoyu.com/zh/index.xml",
      site: "https://www.pseudoyu.com/",
      tags: [
        "\u533A\u5757\u94FE",
        "\u7F16\u7A0B",
        "\u5DE5\u5177",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-ac828cbda4575678",
      name: "Starfury",
      url: "http://starfury.tech/feed",
      site: "http://starfury.tech/",
      tags: [
        "\u6280\u672F",
        "\u67B6\u6784",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-5c98d1c0401ad41f",
      name: "\u6234\u515C\u7684\u5C0F\u5C4B",
      url: "https://daidr.me/feed",
      site: "https://daidr.me/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF",
        "\u751F\u6D3B",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-3081993327aee2b4",
      name: "Timochan\u306EBlog",
      url: "https://www.timochan.cn/feed",
      site: "https://www.timochan.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u5B89\u5168",
        "\u968F\u7B14",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-b654cc50572177cd",
      name: "Shiroha\u767D\u7FBD\u7684\u535A\u5BA2",
      url: "https://hukeqing.github.io/rss.xml",
      site: "https://hukeqing.github.io/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-a2fdce43fbcfa395",
      name: "\u767D\u4E91\u82CD\u72D7",
      url: "https://www.imalun.com/atom.xml",
      site: "https://www.imalun.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF",
        "\u751F\u6D3B",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-ad437368ff6e8a4c",
      name: "\u6211\u6709\u70B9\u9177-HuntZou\u7684\u535A\u5BA2",
      url: "https://blog.woyou.cool/feed",
      site: "https://blog.woyou.cool/",
      tags: [
        "\u6280\u672F",
        "\u968F\u7B14",
        "whim"
      ]
    },
    {
      id: "blog-396f9156df62a23c",
      name: "Benson",
      url: "https://blog.bensontech.dev/feed.xml",
      site: "https://blog.bensontech.dev/",
      tags: [
        "\u6280\u672F",
        "\u968F\u7B14",
        "NLP",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-014e0dfeb3c13b0a",
      name: "\u6D6E\u4E91\u7FE9\u8FC1\u4E4B\u95F4",
      url: "https://blognas.hwb0307.com/feed/",
      site: "https://blognas.hwb0307.com/",
      tags: [
        "Docker",
        "Linux",
        "\u751F\u7269\u533B\u5B66"
      ]
    },
    {
      id: "blog-f949991d7be048e2",
      name: "\u661F\u7A7A\u4E0B\u7684YZY",
      url: "https://www.226yzy.com/atom.xml",
      site: "https://www.226yzy.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u5B66\u4E60",
        "\u968F\u7B14",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-4ba7749fdfc7f815",
      name: "SakuraWald",
      url: "https://sakurawald.github.io/sitemap.xml",
      site: "https://sakurawald.github.io/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-19b40efd326e42cd",
      name: "ImCaO's Blog",
      url: "https://www.imcao.cn/atom.xml",
      site: "https://www.imcao.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-5999006a511fd61b",
      name: "NoneData",
      url: "https://www.nonedata.com/rss.xml",
      site: "https://www.nonedata.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF",
        "\u751F\u6D3B",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-09cc7e61fa598de3",
      name: "Cysime Moflu",
      url: "https://blog.cysi.me/index.xml",
      site: "https://blog.cysi.me/",
      tags: [
        "\u751F\u6D3B",
        "\u968F\u7B14",
        "\u8BC4\u6D4B"
      ]
    },
    {
      id: "blog-a89e1bb215131ed0",
      name: "\u4E03\u7C73\u84DD",
      url: "https://www.chirmyram.top/feed",
      site: "https://www.chirmyram.top/",
      tags: [
        "\u8BB0\u5F55",
        "\u6280\u672F",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-825c82447bcac9ab",
      name: "\u51B0\u96EA\u6B87\u7483\u964C\u68A6\u306E\u5C0F\u7AD9",
      url: "https://www.dreamofice.cn/atom.xml",
      site: "https://www.dreamofice.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14",
        "\u6280\u672F",
        "\u4E8C\u6B21\u5143",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-e4835ff59c4deaba",
      name: "Bright LGM's Blog",
      url: "https://brightliao.com/atom.xml",
      site: "https://brightliao.com/",
      tags: [
        "\u6280\u672F",
        "\u6570\u636E",
        "\u667A\u80FD"
      ]
    },
    {
      id: "blog-68efc75dd39bedb1",
      name: "\u6587\u8F69\u7684Blog",
      url: "https://allanware.github.io/zh/index.xml",
      site: "https://allanware.github.io/zh/",
      tags: [
        "\u7535\u5F71",
        "\u97F3\u4E50",
        "\u8DB3\u7403",
        "\u56F4\u68CB",
        "\u7F16\u7A0B",
        "\u4E66"
      ]
    },
    {
      id: "blog-f1bf108695467aad",
      name: "Airing's Blog",
      url: "https://blog.ursb.me/feed.xml",
      site: "https://ursb.me/",
      tags: [
        "\u751F\u6D3B",
        "\u968F\u7B14",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-d1d54f69dd05db47",
      name: "\u6768\u5B9D\u5F3A\u7684\u6280\u672F\u7B14\u8BB0",
      url: "https://bqyang.top/atom.xml",
      site: "https://bqyang.top/",
      tags: [
        "\u7F16\u7A0B",
        "Golang",
        "\u751F\u6D3B",
        "\u968F\u7B14",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-1a2f7c6f61d30df8",
      name: "Raz1ner",
      url: "https://raz1ner.com/atom.xml",
      site: "https://raz1ner.com/",
      tags: [
        "Excel\u51FD\u6570",
        "Google\u811A\u672C",
        "\u6280\u672F",
        "\u968F\u7B14",
        "\u8F6F\u4EF6"
      ]
    },
    {
      id: "blog-46ce1f91a34182af",
      name: "DAVID'S BLOG",
      url: "https://blog.blahaj.uk/feed",
      site: "https://blog.blahaj.uk/",
      tags: [
        "\u751F\u6D3B",
        "\u968F\u7B14",
        "\u5F71\u8BC4",
        "\u4F5C\u54C1\u96C6"
      ]
    },
    {
      id: "blog-9d74eda68b416b4d",
      name: "Ethan's Blog",
      url: "https://ethan-phu.github.io/index.xml",
      site: "https://ethan-phu.github.io/",
      tags: [
        "\u751F\u6D3B",
        "\u6280\u672F",
        "\u540E\u7AEF",
        "\u6DF1\u5EA6\u5B66\u4E60"
      ]
    },
    {
      id: "blog-15280431b2da5439",
      name: "jinji's Blog",
      url: "https://jinjipang.com/index.xml",
      site: "https://jinjipang.com/",
      tags: [
        "\u7231\u597D",
        "\u968F\u7B14",
        "\u751F\u7269",
        "\u7EDF\u8BA1"
      ]
    },
    {
      id: "blog-74bd1a0c7196fd9e",
      name: "Owen\u7684\u535A\u5BA2",
      url: "https://www.owenyoung.com/atom.xml",
      site: "https://www.owenyoung.com/",
      tags: [
        "\u6CE8\u610F\u529B\u7BA1\u7406\uFF0C\u8BFB\u4E66\uFF0C\u7B14\u8BB0\uFF0C\u6280\u672F"
      ]
    },
    {
      id: "blog-a3f1fd61c3a9d526",
      name: "\u8C2D\u5347\u7684\u535A\u5BA2",
      url: "https://face2ai.com/atom.xml",
      site: "https://face2ai.com/",
      tags: [
        "\u673A\u5668\u5B66\u4E60",
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-b0daf832284b133c",
      name: "\u571F\u8C46\u4E0D\u597D\u5403",
      url: "https://dmesg.app/feed",
      site: "https://dmesg.app/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-f6786af950754079",
      name: "\u5361\u74E6\u90A6\u5676\uFF01",
      url: "https://www.kawabangga.com/feed",
      site: "https://www.kawabangga.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-960d863974eaea20",
      name: "\u4F0A\u85E4\u2022\u535A\u6587",
      url: "https://moc.1tlt1.com/index.php/feed",
      site: "https://moc.1tlt1.com/",
      tags: [
        "\u6280\u672F",
        "\u968F\u7B14",
        "\u79D1\u7814"
      ]
    },
    {
      id: "blog-085b9cb4c58579db",
      name: "\u5982\u6709\u4E50\u4EAB",
      url: "https://51.ruyo.net/feed",
      site: "https://51.ruyo.net/",
      tags: [
        "\u6280\u672F",
        "\u5206\u4EAB"
      ]
    },
    {
      id: "blog-e9370c92df774711",
      name: "\u695A\u5929\u4E50\u7684\u5C0F\u7AD9",
      url: "http://blog.shyclouds.net/feed/",
      site: "http://blog.shyclouds.net/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-c8adde5ad4115162",
      name: "\u6797\u6D77\u8349\u539F",
      url: "https://lhcy.org/feed",
      site: "https://lhcy.org/",
      tags: [
        "\u751F\u6D3B",
        "\u5DE5\u4F5C",
        "\u4EBA\u751F",
        "\u601D\u8003"
      ]
    },
    {
      id: "blog-5a6cec5b7049c21c",
      name: "\u65E0\u7AE0",
      url: "https://hetaoblog.site/atom.xml",
      site: "https://hetaoblog.site/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14",
        "\u601D\u8003",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-c4b9cdc0255e56d8",
      name: "\u5341\u8D30\u7684\u5C0F\u7A9D",
      url: "https://hehysh.github.io/atom.xml",
      site: "https://hehysh.github.io/",
      tags: [
        "\u6280\u672F",
        "\u968F\u7B14",
        "\u601D\u8003",
        "\u6210\u957F"
      ]
    },
    {
      id: "blog-85ebfa6ee9e72216",
      name: "\u667A\u670B\u7684\u4E2A\u4EBA\u535A\u5BA2",
      url: "https://coffeelize.top/atom.xml",
      site: "https://coffeelize.top/",
      tags: [
        "\u751F\u6D3B",
        "LaTeX",
        "\u968F\u7B14",
        "\u5206\u4EAB"
      ]
    },
    {
      id: "blog-8b39aeeb7d6f1d4d",
      name: "\u5B50\u6052\u7684\u535A\u5BA2",
      url: "https://chestnutheng.cn/index.xml",
      site: "https://chestnutheng.cn/",
      tags: [
        "\u540E\u53F0",
        "\u4E92\u8054\u7F51",
        "\u8BFB\u4E66",
        "\u65C5\u884C"
      ]
    },
    {
      id: "blog-f66c4d9a4820bbc1",
      name: "Chancel's blog",
      url: "https://www.chancel.me/rest/api/v1/feed",
      site: "https://www.chancel.me/",
      tags: [
        "\u6280\u672F",
        "\u7F16\u7A0B",
        "\u7F51\u7EDC"
      ]
    },
    {
      id: "blog-fdab7a443c37e973",
      name: "\u4E92\u822A\u98DE",
      url: "https://www.huhangfei.com/feed/",
      site: "https://www.huhangfei.com/",
      tags: [
        "\u6280\u672F",
        "\u5206\u4EAB"
      ]
    },
    {
      id: "blog-7e5cf41d6b52e598",
      name: "Jimersy Lee\u2019s blog",
      url: "https://blog.jimersylee.com/feed",
      site: "https://blog.jimersylee.com/",
      tags: [
        "\u6280\u672F",
        "\u5206\u4EAB",
        "\u968F\u7B14",
        "\u6210\u957F"
      ]
    },
    {
      id: "blog-411d02ae36d3106c",
      name: "Jim Luo's blog",
      url: "https://blog.jimmieluo.com/feed",
      site: "https://www.jimmieluo.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u601D\u8003"
      ]
    },
    {
      id: "blog-4d26f30438e4d8da",
      name: "\u5F20\u6D2AHeo",
      url: "https://blog.zhheo.com/rss.xml",
      site: "https://blog.zhheo.com/",
      tags: [
        "\u8BBE\u8BA1",
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u4EA7\u54C1"
      ]
    },
    {
      id: "blog-70fe8be93de1c16a",
      name: "Save The Web Project",
      url: "https://blog.save-web.org/feed/",
      site: "https://blog.save-web.org/",
      tags: [
        "\u5B58\u6863",
        "\u5907\u4EFD",
        "\u4E92\u8054\u7F51",
        "\u516C\u76CA"
      ]
    },
    {
      id: "blog-dca7f6ec7f541f5e",
      name: "AlbertAz's Blog",
      url: "https://www.albertaz.com/rss.xml",
      site: "https://www.albertaz.com/",
      tags: [
        "\u524D\u7AEF",
        "\u6280\u672F",
        "\u7ED8\u753B",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-e449062d39b7affa",
      name: "\u5DE5\u52B3\u5C0F\u62A5",
      url: "https://newsletter.laborinfocn.com/rss",
      site: "https://newsletter.laborinfocn.com/",
      tags: [
        "\u5DE5\u4EBA",
        "\u52B3\u52A8",
        "\u5206\u4EAB"
      ]
    },
    {
      id: "blog-220f782a1e65db7f",
      name: "\u96EA\u732B\u793E",
      url: "https://www.yukicat.net/feed/",
      site: "https://www.yukicat.net/",
      tags: [
        "\u751F\u6D3B",
        "\u968F\u7B14",
        "\u8FD0\u7EF4",
        "\u601D\u8003"
      ]
    },
    {
      id: "blog-117a5287ce8741cf",
      name: "\u662F\u975E\u9898",
      url: "https://www.shifeiti.com/atom.xml",
      site: "https://www.shifeiti.com/",
      tags: [
        "\u751F\u6D3B",
        "\u8DD1\u6B65",
        "FPGA"
      ]
    },
    {
      id: "blog-836dd4e3eb50d569",
      name: "\u4E14\u70BC\u65F6\u5149",
      url: "https://linshenkx.cn/atom.xml",
      site: "https://linshenkx.cn/",
      tags: [
        "\u6280\u672F",
        "\u751F\u4EA7\u529B",
        "\u6298\u817E"
      ]
    },
    {
      id: "blog-971950b0ed8ed288",
      name: "\u9053\u8F72",
      url: "https://dorck.cn/feed.xml",
      site: "https://dorck.cn/",
      tags: [
        "\u6280\u672F",
        "\u5F00\u6E90",
        "\u968F\u7B14",
        "\u81EA\u7531"
      ]
    },
    {
      id: "blog-8b0f51923e33c429",
      name: "\u591C\u6CD5\u4E4B\u4E66",
      url: "https://blog.17lai.site/atom.xml",
      site: "https://blog.17lai.site/",
      tags: [
        "\u6280\u672F",
        "\u5F00\u6E90",
        "hexo",
        "\u6210\u957F",
        "nas",
        "linux"
      ]
    },
    {
      id: "blog-cd7f715f3722cf51",
      name: "Makerlife \u7684\u5C0F\u7AD9",
      url: "https://blog.makerlife.top/atom.xml",
      site: "https://blog.makerlife.top/",
      tags: [
        "\u7F16\u7A0B",
        "C++",
        "\u4FE1\u606F\u5B66\u7ADE\u8D5B",
        "\u5206\u4EAB",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-785d0efdcf0f3841",
      name: "\u5B50\u8212\u7684\u535A\u5BA2",
      url: "https://zishu.me/index.xml",
      site: "https://zishu.me/",
      tags: [
        "\u6280\u672F",
        "\u751F\u6D3B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-58e1597cd7d4164b",
      name: "\u6D41\u6D6A\u5929\u4E0B",
      url: "https://maie.name/feed",
      site: "https://maie.name/",
      tags: [
        "\u6237\u5916",
        "\u65C5\u884C",
        "\u884C\u8D70",
        "\u968F\u7B14",
        "vtiger"
      ]
    },
    {
      id: "blog-52f5ef425726b040",
      name: "zguishen's blog",
      url: "https://zguishen.com/atom.xml",
      site: "https://zguishen.com/",
      tags: [
        "\u6280\u672F",
        "\u751F\u6D3B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-c12118d09bb572dd",
      name: "\u6D1B\u96EA\u306ECat",
      url: "https://blog.sayhi.moe/index.php/feed/",
      site: "https://blog.sayhi.moe/",
      tags: [
        "\u6821\u56ED",
        "\u751F\u6D3B",
        "\u968F\u7B14",
        "\u4E8C\u6B21\u5143",
        "\u65E5\u5E38"
      ]
    },
    {
      id: "blog-ce7fd263dbbe863b",
      name: "matsuri's neverland",
      url: "https://matsuri.site/atom.xml",
      site: "https://matsuri.site/",
      tags: [
        "\u7F16\u7A0B",
        "\u6548\u7387\u5DE5\u5177",
        "\u6E38\u620F",
        "\u4E92\u8054\u7F51"
      ]
    },
    {
      id: "blog-fe2bffb8252b1d22",
      name: "\u989C\u6D77\u955C",
      url: "https://yanhaijing.com/rss.xml",
      site: "https://yanhaijing.com/",
      tags: [
        "\u524D\u7AEF"
      ]
    },
    {
      id: "blog-8e3abe0137c117f8",
      name: "\u4E5D\u65EC\u7684\u535A\u5BA2",
      url: "http://www.zhangningle.top/rss.xml",
      site: "http://www.zhangningle.top/",
      tags: [
        "\u524D\u7AEF",
        "\u968F\u7B14",
        "\u5206\u4EAB",
        "\u6210\u957F"
      ]
    },
    {
      id: "blog-36e734c40c591d4e",
      name: "\u4F60\u662F\u4E0B\u96E8\u5929",
      url: "https://glooow1024.github.io/atom.xml",
      site: "https://glooow1024.github.io/",
      tags: [
        "\u5B66\u4E60",
        "\u6570\u5B66",
        "\u6280\u672F",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-afba0a49df3a92b9",
      name: "\u65F6\u95F4\u7684\u670B\u53CB",
      url: "https://blog.storycn.cn/index.xml",
      site: "https://blog.storycn.cn/",
      tags: [
        "\u524D\u7AEF",
        "\u5206\u4EAB",
        "\u5DE5\u4F5C\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-f10087ed46ae0a5a",
      name: "\u5E03\u9C81\u65AF\u9C7C\u7684\u5947\u601D\u4E71\u60F3",
      url: "https://emergencyexit.xyz/feed.xml",
      site: "https://emergencyexit.xyz/",
      tags: [
        "\u7F16\u7A0B",
        "\u5DE5\u4F5C\u7B14\u8BB0",
        "\u751F\u6D3B",
        "\u6E38\u620F",
        "\u7535\u5F71"
      ]
    },
    {
      id: "blog-4f62f68163524272",
      name: "\u9759\u6C34\u6DF1\u6D41\u7684\u535A\u5BA2",
      url: "https://slbyml.github.io/rss.xml",
      site: "https://slbyml.github.io/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF",
        "\u6280\u672F",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-9843080d5e0c03ca",
      name: "Tw93 \u7684\u535A\u5BA2",
      url: "https://tw93.fun/feed.xml",
      site: "https://tw93.fun/",
      tags: [
        "\u5F00\u6E90",
        "\u524D\u7AEF",
        "\u5206\u4EAB",
        "MacOS"
      ]
    },
    {
      id: "blog-fe62bfa2d8d9a894",
      name: "ocero\u7684\u535A\u5BA2",
      url: "https://oceroblogentry.metalstudio.top/rss.xml",
      site: "https://oceroblogentry.metalstudio.top/",
      tags: [
        "\u524D\u7AEF",
        "\u5206\u4EAB",
        "\u751F\u6D3B\u5C0F\u8BB0"
      ]
    },
    {
      id: "blog-f26fdb3d885568b2",
      name: "BinGo\u2018s Blog",
      url: "https://www.zh996.com/index.php/feed/",
      site: "https://www.zh996.com/",
      tags: [
        "\u7F16\u7A0B",
        "Java",
        "\u5206\u4EAB",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-917549e2a4f11bf1",
      name: "Finisky Garden",
      url: "https://finisky.github.io/atom.xml",
      site: "https://finisky.github.io/",
      tags: [
        "\u673A\u5668\u5B66\u4E60",
        "NLP",
        "\u4E92\u8054\u7F51",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-c122a4b382f340f4",
      name: "Qiuyuair\u7684\u81EA\u7559\u5730",
      url: "https://qiuyuair.com/feed/",
      site: "https://qiuyuair.com/",
      tags: [
        "\u751F\u6D3B",
        "\u6280\u672F",
        "\u5E7F\u64AD",
        "\u65E0\u7EBF\u7535"
      ]
    },
    {
      id: "blog-8486a5f1c6c58af6",
      name: "\u963F\u732B\u7684\u535A\u5BA2",
      url: "https://ameow.xyz/atom.xml",
      site: "https://ameow.xyz/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u6298\u817E"
      ]
    },
    {
      id: "blog-9bc62e4c57cc75e9",
      name: "\u9020\u58F3 MkShell",
      url: "https://www.mkshell.com/feed/",
      site: "https://www.mkshell.com/",
      tags: [
        "\u968F\u7B14",
        "\u6280\u672F",
        "\u6298\u817E",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-3a23b79f28ee86d6",
      name: "\u6D41\u5E74\u77F3\u523B",
      url: "https://www.timeshike.com/atom.xml",
      site: "https://www.timeshike.com/",
      tags: [
        "\u8BB0\u5F55",
        "\u7F16\u7A0B",
        "\u5B66\u4E60",
        "\u6587\u5B66"
      ]
    },
    {
      id: "blog-ffd4a1e9a1b5cc09",
      name: "\u516D\u4E2A\u5468",
      url: "https://blog.liugezhou.online/atom.xml",
      site: "https://blog.liugezhou.online/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF",
        "\u6280\u672F",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-f663bd1b58ba034f",
      name: "\u5B59\u5A01\u7684\u9633\u5149\u6D77",
      url: "https://www.sunnyfly.com/feed",
      site: "https://www.sunnyfly.com/",
      tags: [
        "\u4EA7\u54C1",
        "\u751F\u6D3B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-9cee8089643b6a0a",
      name: "Sean's Note",
      url: "https://blog.sean.taipei/feed.xml",
      site: "https://blog.sean.taipei/",
      tags: [
        "\u6280\u672F",
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u65E5\u5E38"
      ]
    },
    {
      id: "blog-1b169f3b2efbb9bb",
      name: "cserwen",
      url: "https://blog.cserwen.com/feed.xml",
      site: "https://blog.cserwen.com/",
      tags: [
        "\u5B66\u4E60",
        "\u6280\u672F",
        "\u751F\u6D3B",
        "\u65E5\u5E38"
      ]
    },
    {
      id: "blog-30a8eeb0d7443e8c",
      name: "\u4E91\u8427\u7684\u5495\u5495\u5C4B",
      url: "https://blog.crrashh.com/feed",
      site: "https://blog.crrashh.com/",
      tags: [
        "\u524D\u7AEF",
        "\u6280\u672F",
        "\u6574\u6D3B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-c5b8b29fbcadc939",
      name: "xiongxinwei\u7684\u4E2A\u4EBA\u535A\u5BA2",
      url: "https://nsddd.top/rss.xml",
      site: "https://nsddd.top/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u533A\u5757\u94FE",
        "\u5B66\u4E60",
        "\u8D44\u6599\u6536\u96C6"
      ]
    },
    {
      id: "blog-5f3b7bca48a6bd8b",
      name: "\u8D6B\u8D6B\u6587\u738B",
      url: "https://kqh.me/index.xml",
      site: "https://kqh.me/",
      tags: [
        "\u5386\u53F2",
        "\u4EBA\u6587",
        "\u827A\u672F",
        "\u65E5\u5E38"
      ]
    },
    {
      id: "blog-211ed4466033fe3d",
      name: "\u4E00\u6D3E\u80E1\u8A00",
      url: "https://yipai.me/feed",
      site: "https://yipai.me/",
      tags: [
        "\u80E1\u4E00\u6D3E",
        "\u968F\u7B14",
        "\u4E0D\u6298\u817E"
      ]
    },
    {
      id: "blog-b6f3c5198a961d57",
      name: "SuperEggs",
      url: "https://www.supereggs.cn/index.xml",
      site: "https://www.supereggs.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u9605\u8BFB",
        "\u751F\u6D3B\u968F\u7B14"
      ]
    },
    {
      id: "blog-87755ef63e46fd29",
      name: "\u4E86\u8FF9\u5947\u6709\u6CA1",
      url: "https://whrss.com/feed",
      site: "https://whrss.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u601D\u8003",
        "\u751F\u6D3B\u968F\u7B14"
      ]
    },
    {
      id: "blog-668f90dc0e090cfd",
      name: "\u8C2D\u65B0\u5B87\u7684\u535A\u5BA2",
      url: "https://tanxinyu.work/atom.xml",
      site: "https://tanxinyu.work/",
      tags: [
        "\u5171\u8BC6\u7B97\u6CD5",
        "\u5206\u5E03\u5F0F\u5B58\u50A8",
        "\u65F6\u5E8F\u6570\u636E\u5E93",
        "\u8BBA\u6587\u7B14\u8BB0",
        "\u6E90\u7801\u5206\u6790"
      ]
    },
    {
      id: "blog-ca0ea264cce7d97a",
      name: "\u5C71\u6942\u7247\u7684\u535A\u5BA2",
      url: "https://szp15.com/index.xml",
      site: "https://szp15.com/",
      tags: [
        "\u8BA1\u7B97\u673A\u89C6\u89C9",
        "\u673A\u5668\u5B66\u4E60"
      ]
    },
    {
      id: "blog-3c455fe8ede6b323",
      name: "Kaichao You",
      url: "https://youkaichao.github.io/feed.xml",
      site: "https://youkaichao.github.io/research",
      tags: [
        "\u6DF1\u5EA6\u5B66\u4E60"
      ]
    },
    {
      id: "blog-4239475992326c85",
      name: "Eren Zhao",
      url: "https://zhaochenyang20.github.io/atom.xml",
      site: "https://zhaochenyang20.github.io/",
      tags: [
        "\u65E5\u8BB0",
        "\u6DF1\u5EA6\u5B66\u4E60"
      ]
    },
    {
      id: "blog-a7c251c463d0580c",
      name: "\u6770\u54E5\u7684\u5C0F\u7B14\u8BB0",
      url: "https://jia.je/feed.xml",
      site: "https://jia.je/",
      tags: [
        "\u8FD0\u7EF4",
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-5de314a1a7f0a808",
      name: "Wriprin's Blog",
      url: "https://blog.cnix.cc/index.php/feed",
      site: "https://blog.cnix.cc/",
      tags: [
        "SAP",
        "\u7F16\u7A0B",
        "\u6280\u672F\u5206\u4EAB",
        "\u65E5\u5E38"
      ]
    },
    {
      id: "blog-9d6462e44f3fbeee",
      name: "\u5B8B\u6D69\u5FD7\u7684\u535A\u5BA2",
      url: "https://songhaozhi.com/atom.xml",
      site: "https://songhaozhi.com/",
      tags: [
        "\u5B66\u4E60",
        "\u6280\u672F",
        "Java"
      ]
    },
    {
      id: "blog-506777005e94107a",
      name: "\u5B50\u6765\u56ED",
      url: "https://simplecoding.fun/index.xml",
      site: "https://simplecoding.fun/",
      tags: [
        "\u7F16\u8BD1\u5668",
        "\u82AF\u7247",
        "AI",
        "\u8F6F\u4EF6\u5DE5\u7A0B",
        "\u5199\u4F5C",
        "\u4EBA\u6587"
      ]
    },
    {
      id: "blog-f56fe1502c1b14eb",
      name: "Mereith's Blog",
      url: "https://www.mereith.com/feed.xml",
      site: "https://www.mereith.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F\u5206\u4EAB",
        "\u6298\u817E",
        "\u65E5\u5E38"
      ]
    },
    {
      id: "blog-ccba727063d86140",
      name: "Wang Fenjin's Blog",
      url: "https://www.wangfenjin.com/index.xml",
      site: "https://www.wangfenjin.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F\u5206\u4EAB",
        "\u6298\u817E",
        "\u65E5\u5E38"
      ]
    },
    {
      id: "blog-47d4620d9a11056f",
      name: "Ligdyu Blog",
      url: "https://ligdy.com/rss/feed.xml",
      site: "https://ligdy.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F\u5206\u4EAB",
        "\u65E5\u8BB0",
        "\u968F\u7B14",
        "\u5B66\u4E60",
        "\u524D\u7AEF"
      ]
    },
    {
      id: "blog-58b59cdd41ab2af9",
      name: "SeerSu",
      url: "https://suus.me/index.xml",
      site: "https://suus.me/",
      tags: [
        "\u6280\u672F\u5206\u4EAB",
        "\u65E5\u8BB0",
        "\u968F\u7B14",
        "\u5B66\u4E60"
      ]
    },
    {
      id: "blog-893a45fcc4d5ec38",
      name: "Mycpen",
      url: "https://blog.cpen.top/atom.xml",
      site: "https://blog.cpen.top/",
      tags: [
        "\u6280\u672F\u5206\u4EAB",
        "\u65E5\u8BB0",
        "\u968F\u7B14",
        "\u5B66\u4E60"
      ]
    },
    {
      id: "blog-3356d11d896f3879",
      name: "\u6548\u7387\u5DE5\u5177\u6307\u5357",
      url: "https://penghh.fun/atom.xml",
      site: "https://penghh.fun/",
      tags: [
        "\u6548\u7387\u5DE5\u5177",
        "\u8F6F\u4EF6",
        "Macbook",
        "\u524D\u7AEF",
        "\u5DE5\u5177",
        "App",
        "\u535A\u5BA2",
        "\u5199\u4F5C"
      ]
    },
    {
      id: "blog-824ed8b164c89d01",
      name: "Mark24Code",
      url: "https://mark24code.github.io/feed.xml",
      site: "https://mark24code.github.io/",
      tags: [
        "\u524D\u7AEF",
        "\u6280\u672F",
        "\u535A\u5BA2",
        "\u968F\u7B14",
        "\u7F16\u7A0B\u601D\u8003"
      ]
    },
    {
      id: "blog-387ee4ba75fc90aa",
      name: "\u5C0F\u8D75\u535A\u5BA2 - XiaoZhao233",
      url: "https://blog.xiaozhao233.top/feed/",
      site: "https://blog.xiaozhao233.top/",
      tags: [
        "\u65E5\u8BB0",
        "\u968F\u7B14",
        "\u5B66\u4E60",
        "\u6280\u672F\u5206\u4EAB",
        "\u601D\u8003",
        "\u9605\u8BFB"
      ]
    },
    {
      id: "blog-95fe54629b118005",
      name: "\u7FFB\u8EAB\u732B",
      url: "https://www.zy99.net/feed",
      site: "https://www.zy99.net/",
      tags: [
        "\u81EA\u5A92\u4F53",
        "\u5EFA\u7B51",
        "\u5B66\u4E60"
      ]
    },
    {
      id: "blog-aa9242079a1cc647",
      name: "Macin",
      url: "https://www.macin.org/atom.xml",
      site: "https://macin.org/",
      tags: [
        "\u5206\u4EAB",
        "\u6295\u8D44",
        "\u5B66\u4E60",
        "Crypto",
        "\u65E5\u5E38",
        "\u9605\u8BFB",
        "\u4EBA\u6587"
      ]
    },
    {
      id: "blog-a8fae414b32efd1d",
      name: "\u667A\u4F24\u5E1D",
      url: "https://blog.l0v0.com/atom.xml",
      site: "https://blog.l0v0.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F\u7F8E\u672F",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-43ad6c864e875bac",
      name: "GamerNoTitle",
      url: "https://bili33.top/atom.xml",
      site: "https://bili33.top/",
      tags: [
        "\u7F16\u7A0B",
        "\u5B66\u4E60",
        "\u6280\u672F",
        "\u6742\u8C08"
      ]
    },
    {
      id: "blog-1383230fc76497fb",
      name: "YuZhangWang\u7684\u9886\u57DF",
      url: "https://yuzhang.wang/atom.xml",
      site: "https://yuzhang.wang/",
      tags: [
        "\u7F16\u7A0B",
        "DL",
        "ML",
        "\u751F\u6D3B\u8BB0\u5F55",
        "\u9879\u76EE\u63CF\u8FF0"
      ]
    },
    {
      id: "blog-9f60092f8ce10cb1",
      name: "\u9759\u98CE\u8BF4",
      url: "http://www.jfsay.com/feed",
      site: "http://www.jfsay.com/",
      tags: [
        "\u751F\u6D3B",
        "\u8BFB\u4E66",
        "\u7535\u5F71",
        "\u65C5\u6E38"
      ]
    },
    {
      id: "blog-1f4c50f66d694a50",
      name: "To the Lighthouse",
      url: "https://owlswims.com/feed",
      site: "https://owlswims.com/",
      tags: [
        "\u8BFB\u4E66",
        "\u64AD\u5BA2",
        "\u968F\u7B14",
        "\u4E66\u8BC4",
        "\u4EBA\u6587"
      ]
    },
    {
      id: "blog-55882a5c594529c5",
      name: "TrumanDu \u535A\u5BA2",
      url: "http://blog.trumandu.top/atom.xml",
      site: "http://blog.trumandu.top/",
      tags: [
        "\u65E5\u8BB0",
        "\u968F\u7B14",
        "\u5B66\u4E60",
        "\u6280\u672F\u5206\u4EAB",
        "\u601D\u8003",
        "\u9605\u8BFB"
      ]
    },
    {
      id: "blog-0be500b42d21e2c9",
      name: "Wang's Blog",
      url: "https://vlight.me/rss2.xml",
      site: "https://vlight.me/",
      tags: [
        "\u6570\u503C\u8BA1\u7B97",
        "\u4F18\u5316\u7B97\u6CD5"
      ]
    },
    {
      id: "blog-c50ef0bc2c5a2f26",
      name: "HUOYIJIE's WEB\u5F00\u53D1\u7B14\u8BB0",
      url: "https://huoyijie.cn/rss",
      site: "https://huoyijie.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F\u5206\u4EAB",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-592dcc10481f926d",
      name: "Spaceack's Blog",
      url: "https://spaceack.com/index.xml",
      site: "https://spaceack.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F\u5206\u4EAB",
        "\u751F\u6D3B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-20d642c0c4bd5f78",
      name: "\u6613\u826F\u540C\u5B66\u7684\u535A\u5BA2",
      url: "https://yiliang.site/sitemap.xml",
      site: "https://yiliang.site/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F\u5206\u4EAB",
        "\u5B66\u4E60",
        "\u751F\u6D3B\u8BB0\u5F55"
      ]
    },
    {
      id: "blog-618448946e57b714",
      name: "Yubolun \u535A\u5BA2",
      url: "https://yubolun.com/feed.xml",
      site: "https://yubolun.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u6295\u8D44",
        "\u52A0\u5BC6\u8D27\u5E01"
      ]
    },
    {
      id: "blog-5821a00c7ea1bc6c",
      name: "BlackHole's Blog",
      url: "https://blackholemax.github.io/atom.xml",
      site: "https://blackholemax.github.io/",
      tags: [
        "\u7F16\u7A0B",
        "\u4EBA\u6587\u793E\u79D1",
        "\u9605\u8BFB",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-0fdcf1f2b5c68a0f",
      name: "Mephisto's blog",
      url: "https://mephisto.cc/index.xml",
      site: "https://mephisto.cc/",
      tags: [
        "Linux",
        "Python",
        "Travel",
        "Note"
      ]
    },
    {
      id: "blog-7810aaf574555fc0",
      name: "Tony Bai",
      url: "http://feed.tonybai.com/",
      site: "https://tonybai.com/",
      tags: [
        "\u7F16\u7A0B",
        "Golang",
        "GO"
      ]
    },
    {
      id: "blog-0f9fdd4b2d386a97",
      name: "\u6211\u4E0D\u662F\u5495\u5495\u9E3D",
      url: "https://blog.laoda.de/rss.xml",
      site: "https://blog.laoda.de/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F\u5206\u4EAB",
        "\u7F51\u7EDC",
        "\u5BB9\u5668",
        "VPS"
      ]
    },
    {
      id: "blog-8b3c2bec126cb1ee",
      name: "\u65B9\u6C38\u3001\u5357\u5929\u7D2B\u4E91",
      url: "https://www.vinoca.org/atom.xml",
      site: "https://www.vinoca.org/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-c9ea3a188bc5625b",
      name: "\u5927\u767D\u6700\u9ED1\u306EHome",
      url: "https://dabaizuihei.github.io/atom.xml",
      site: "https://dabaizuihei.github.io/",
      tags: [
        "\u5B66\u4E60",
        "\u6781\u5BA2",
        "\u65E5\u8BB0",
        "\u751F\u6D3B",
        "\u6444\u5F71",
        "\u4E8C\u6B21\u5143",
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-b3d27f018dab6838",
      name: "\u5B5F\u5764\u535A\u5BA2",
      url: "https://mkblog.cn/feed/",
      site: "https://mkblog.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u4E91\u670D\u52A1",
        "PHP",
        "WordPress"
      ]
    },
    {
      id: "blog-134edb00504655a2",
      name: "\u4E00\u7EB8\u5FD8\u5FE7",
      url: "https://www.ikxin.com/feed/",
      site: "https://www.ikxin.com/",
      tags: [
        "\u7F16\u7A0B",
        "PHP",
        "\u5F00\u7BB1",
        "Linux",
        "\u4E91\u670D\u52A1",
        "Typecho"
      ]
    },
    {
      id: "blog-b9cc063ddd8e30c8",
      name: "YuxiangWang_0525\u7684\u535A\u5BA2",
      url: "https://blog.yuxiangwang0525.com/index.php/feed/",
      site: "https://blog.yuxiangwang0525.com/",
      tags: [
        "\u9526\u4F9D\u536B",
        "\u6D1B\u5929\u4F9D",
        "\u4FE1\u606F\u5B66\u7ADE\u8D5B",
        "Typecho",
        "\u4E8C\u6B21\u5143",
        "\u5B66\u4E60"
      ]
    },
    {
      id: "blog-9c4077b5db5a8ad5",
      name: "tj\u2018sblog_\u65E0\u804A\u9879\u76EE\u805A\u96C6\u5730",
      url: "https://www.tjsite.cn/feed.php",
      site: "https://www.tjsite.cn/",
      tags: [
        "\u5F00\u7BB1",
        "\u6E38\u620F",
        "\u6280\u672F",
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-b26f687e90afe1e5",
      name: "EAimTY \u7684\u535A\u5BA2",
      url: "https://www.eaimty.com/feed/",
      site: "https://www.eaimty.com/",
      tags: [
        "\u4FE1\u606F\u5B89\u5168",
        "\u6280\u672F",
        "Typecho",
        "\u7F16\u7A0B",
        "\u4E91\u670D\u52A1",
        "Linux",
        "Android"
      ]
    },
    {
      id: "blog-ed8fde767fc491cc",
      name: "R4y\u7684\u535A\u5BA2",
      url: "https://blog.12ms.xyz/feed/",
      site: "https://blog.12ms.xyz/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u8FD0\u7EF4",
        "\u52A0\u5BC6\u8D27\u5E01"
      ]
    },
    {
      id: "blog-5ad7fbb656402a58",
      name: "619's blog",
      url: "https://66619.eu.org/feed/",
      site: "https://66619.eu.org/",
      tags: [
        "\u5B66\u4E60",
        "\u7F16\u7A0B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-27faefb9a0ec15ac",
      name: "Hubert's Blog",
      url: "https://trle5.xyz/atom.xml",
      site: "https://trle5.xyz/",
      tags: [
        "\u7EFC\u5408",
        "\u6742\u8C08",
        "\u6559\u7A0B"
      ]
    },
    {
      id: "blog-6fa988573041d66e",
      name: "smallyu\u7684\u535A\u5BA2",
      url: "https://smallyu.net/atom.xml",
      site: "https://smallyu.net/",
      tags: [
        "\u6280\u672F",
        "\u751F\u6D3B",
        "\u533A\u5757\u94FE"
      ]
    },
    {
      id: "blog-fdd311847fb7261f",
      name: "\u5410\u53F8\u9762\u5305",
      url: "https://toast.pub/totoro/index.xml",
      site: "https://toast.pub/totoro/",
      tags: [
        "\u6280\u672F",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-49ade784eb429b1c",
      name: "vegetable1024\u7684\u535A\u5BA2",
      url: "https://oi-liu.com/atom.xml",
      site: "https://oi-liu.com/",
      tags: [
        "\u7B97\u6CD5\u7ADE\u8D5B",
        "\u6280\u672F",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-75d0fa99d454587a",
      name: "Kenvix's Blog",
      url: "https://kenvix.com/rss.xml",
      site: "https://kenvix.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u8BA1\u7B97\u673A\u7F51\u7EDC",
        "Windows",
        "\u6280\u672F",
        "\u5206\u4EAB",
        "Kotlin"
      ]
    },
    {
      id: "blog-7c3556dfc38193f0",
      name: "\u5FC3\u7684\u9053\u7406",
      url: "https://stephenleng.com/feed/",
      site: "https://stephenleng.com/",
      tags: [
        "\u968F\u7B14",
        "\u6587\u5316\u6279\u8BC4",
        "\u5FC3\u7406\u5B66",
        "\u56FD\u9645\u95EE\u9898",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-f74f1b4a359aa6eb",
      name: "Eson Wong's Blog",
      url: "https://blog.esonwong.com/atom.xml",
      site: "https://blog.esonwong.com/",
      tags: [
        "Web \u5F00\u53D1",
        "\u968F\u7B14",
        "\u5206\u4EAB",
        "\u6559\u7A0B"
      ]
    },
    {
      id: "blog-04562fcc1dc4d0ce",
      name: "\u963F\u554A\u963F\u5416\u4E01",
      url: "https://4ading.com/feed/",
      site: "https://4ading.com/",
      tags: [
        "\u968F\u7B14",
        "\u65E5\u5E38",
        "\u6280\u672F",
        "\u6D4B\u8BD5"
      ]
    },
    {
      id: "blog-a58c9408e78242f9",
      name: "Java\u4E0D\u52A0\u7CD6's Blog",
      url: "https://blog.javazero.top/atom.xml",
      site: "https://blog.javazero.top/",
      tags: [
        "\u8F6F\u4EF6\u5206\u4EAB",
        "\u8BA1\u7B97\u673A\u89C6\u89C9"
      ]
    },
    {
      id: "blog-f5dc99344cb51716",
      name: "Mathor's Blog",
      url: "https://wmathor.com/index.php/feed",
      site: "https://wmathor.com/",
      tags: [
        "\u6DF1\u5EA6\u5B66\u4E60",
        "\u6E38\u620F",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-732c91331ac82e5c",
      name: "\u4EE3\u7801\u8303",
      url: "https://codefine.site/feed/",
      site: "https://codefine.site/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u6559\u7A0B"
      ]
    },
    {
      id: "blog-595cd13aeef24898",
      name: "BB\u9171\u7684\u535A\u5BA2",
      url: "https://www.bbbbchan.com/feed/atom/",
      site: "https://www.bbbbchan.com/",
      tags: [
        "\u6DF1\u5EA6\u5B66\u4E60",
        "\u968F\u7B14",
        "\u7F16\u7A0B\u6280\u672F",
        "\u4E8C\u6B21\u5143"
      ]
    },
    {
      id: "blog-6769bebcfdf75fe5",
      name: "Kris Yan",
      url: "https://blog.krisyan.dev/feed.xml",
      site: "https://blog.krisyan.dev/",
      tags: [
        "\u6280\u672F",
        "\u968F\u7B14",
        "\u751F\u6D3B",
        "\u65E5\u5E38"
      ]
    },
    {
      id: "blog-3fcf5c531b5f1c64",
      name: "\u4E1C\u65B9\u661F\u75D5",
      url: "https://ystyle.top/atom.xml",
      site: "https://ystyle.top/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-83c9f44cf7f06124",
      name: "Anjhon\u2019s Blog",
      url: "https://www.anjhon.top/feed",
      site: "https://www.anjhon.top/",
      tags: [
        "\u673A\u5668\u5B66\u4E60",
        "\u7F16\u7A0B",
        "\u968F\u7B14",
        "\u751F\u6D3B",
        "\u65E5\u5E38"
      ]
    },
    {
      id: "blog-23512c16438589b2",
      name: "Mythsman",
      url: "https://blog.mythsman.com/rss",
      site: "https://blog.mythsman.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14",
        "\u6280\u672F",
        "\u540E\u7AEF"
      ]
    },
    {
      id: "blog-511f3e9d589e2612",
      name: "\u6B8B\u9875\u7684\u5C0F\u535A\u5BA2",
      url: "https://blog.canyie.top/atom.xml",
      site: "https://blog.canyie.top/",
      tags: [
        "\u7F16\u7A0B",
        "Android",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-b843042d11e0f8e2",
      name: "\u81A8\u80C0\u7684\u9762\u5305",
      url: "https://blog.wangtwothree.com/feed",
      site: "https://blog.wangtwothree.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u5F00\u53D1\u677F",
        "\u6280\u672F",
        "\u6559\u7A0B"
      ]
    },
    {
      id: "blog-68b585d25b258919",
      name: "\u6653\u7A7Ablog",
      url: "https://blog.moeworld.tech/feed/",
      site: "https://blog.moeworld.tech/",
      tags: [
        "\u751F\u6D3B",
        "\u5F00\u53D1\uFF0C\u65E5\u5E38",
        "\u4E8C\u6B21\u5143",
        "\u6E38\u620F"
      ]
    },
    {
      id: "blog-0533e34e244dabda",
      name: "Mosu - Mosuzi\u7684\u535A\u5BA2",
      url: "https://www.mosuzi.com/atom.xml",
      site: "https://www.mosuzi.com/",
      tags: [
        "\u968F\u7B14",
        "\u751F\u6D3B",
        "\u5F00\u53D1"
      ]
    },
    {
      id: "blog-f201da3c5c0d5f33",
      name: "Weishu's Notes",
      url: "https://weishu.me/atom.xml",
      site: "https://weishu.me/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-cda736d5225105cf",
      name: "\u6674\u96C0\u5802",
      url: "https://blog.verynb.me/atom.xml",
      site: "https://blog.verynb.me/",
      tags: [
        "\u751F\u6D3B",
        "\u6210\u957F",
        "\u4EBA\u751F",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-4f971972bf44fd79",
      name: "SkyWT",
      url: "https://blog.skywt.cn/feed/",
      site: "https://blog.skywt.cn/",
      tags: [
        "\u6280\u672F",
        "\u5F00\u53D1",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-3893e023542a3cbc",
      name: "Jing Blog",
      url: "https://jingine.com/feed/",
      site: "https://jingine.com/",
      tags: [
        "\u6280\u672F",
        "\u6D77\u5916",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-39984e08a9bd3313",
      name: "\u738B\u4F73\u51AC\u4E2D\u6587\u535A\u5BA2",
      url: "http://wjd.name/feed/",
      site: "http://wjd.name/",
      tags: [
        "\u65C5\u884C",
        "\u4EA7\u54C1",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-16d00491fccece0d",
      name: "HugeTerry-Den",
      url: "http://hugeterry.cn/feed",
      site: "http://hugeterry.cn/",
      tags: [
        "\u6280\u672F",
        "\u751F\u6D3B",
        "\u8C03\u9152"
      ]
    },
    {
      id: "blog-242fb8933626f530",
      name: "\u660E\u660E\u5982\u6708\u7684\u535A\u5BA2",
      url: "https://lmmsoft.github.io/feed.atom",
      site: "https://lmmsoft.github.io/",
      tags: [
        "\u7F16\u7A0B",
        "\u65C5\u884C",
        "\u8FD0\u52A8"
      ]
    },
    {
      id: "blog-0d6bf0f17bb6b4a4",
      name: "\u8C61\u5E1D\u6D6E\u534E\u751F",
      url: "https://www.ahianzhang.com/index.xml",
      site: "https://www.ahianzhang.com/",
      tags: [
        "\u6280\u672F",
        "\u67B6\u6784"
      ]
    },
    {
      id: "blog-c7f15f711166992e",
      name: "\u7C7B\u5E93\u5927\u9B54\u738B\u7684\u6316\u4E95\u65E5\u8BB0",
      url: "https://blog.ismisv.com/feed.xml",
      site: "https://blog.ismisv.com/",
      tags: [
        "\u6280\u672F",
        "\u968F\u7B14",
        "\u751F\u6D3B",
        "\u65E5\u5E38"
      ]
    },
    {
      id: "blog-f8228f5eed311fd9",
      name: "u3blog",
      url: "https://u3blog.xyz/feed.php",
      site: "https://u3blog.xyz/",
      tags: [
        "\u7F16\u7A0B",
        "Android"
      ]
    },
    {
      id: "blog-65c118616b6776ed",
      name: "Cerallin's blog",
      url: "https://notes.cerallin.top/atom.xml",
      site: "https://notes.cerallin.top/",
      tags: [
        "\u7F16\u7A0B",
        "\u7B14\u8BB0\u672C"
      ]
    },
    {
      id: "blog-509f85ccc33f487e",
      name: "Cestlavie's Blog",
      url: "https://www.cestlavie.moe/index.xml",
      site: "https://www.cestlavie.moe/",
      tags: [
        "\u5B66\u4E60",
        "\u6280\u672F",
        "\u751F\u6D3B",
        "\u65E5\u5E38"
      ]
    },
    {
      id: "blog-a8f24a5ffe962f14",
      name: "happy xiao \u7684\u535A\u5BA2",
      url: "https://happyxiao.com/feed",
      site: "https://happyxiao.com/",
      tags: [
        "\u4E2A\u4EBA\u6210\u957F"
      ]
    },
    {
      id: "blog-a8afb7c15ada46c4",
      name: "Clark's \u5C27\u671B Blog",
      url: "https://www.dongyao.ren/feed/",
      site: "https://www.dongyao.ren/",
      tags: [
        "\u7F16\u7A0B",
        "\u5B66\u4E60",
        "\u65E5\u5E38"
      ]
    },
    {
      id: "blog-d76544c6235c8a74",
      name: "/home/rook1e",
      url: "https://rook1e.com/feed.xml",
      site: "https://rook1e.com/",
      tags: [
        "\u5B89\u5168",
        "\u5F00\u53D1",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-b2354d914084c5aa",
      name: "Yi's Blog",
      url: "https://ycao.top/feed.xml",
      site: "https://ycao.top/",
      tags: [
        "\u7F16\u7A0B",
        "\u5B66\u4E60",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-40feb2be9c5fd574",
      name: "\u4ECE\u767E\u8349\u56ED\u5230\u4E09\u5473\u4E66\u5C4B",
      url: "https://youngforever.tech/index.xml",
      site: "https://youngforever.tech/",
      tags: [
        "\u79D1\u7814",
        "\u4EBA\u5DE5\u667A\u80FD",
        "\u8BBA\u6587",
        "\u5B66\u4E60"
      ]
    },
    {
      id: "blog-15d561a454f76de3",
      name: "Long Luo's Life Notes",
      url: "https://www.longluo.me/atom.xml",
      site: "https://www.longluo.me/",
      tags: [
        "\u6570\u5B66",
        "\u7269\u7406",
        "\u7B97\u6CD5",
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u5B66\u4E60",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-466df47cd04b6b36",
      name: "\u56DB\u7573\u534A\u306E\u3078\u3084",
      url: "https://moeyua.com/atom.xml",
      site: "https://moeyua.com/",
      tags: [
        "\u8BA1\u7B97\u673A",
        "\u9605\u8BFB",
        "\u65E5\u5E38",
        "\u6E38\u620F"
      ]
    },
    {
      id: "blog-b17bbe6706dc20f6",
      name: "\u304A\u524D\u306F\u3069\u3053\u307E\u3067\u898B\u3048\u3066\u3044\u308B",
      url: "https://hotarugali.github.io/atom.xml",
      site: "https://hotarugali.github.io/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u8BBA\u6587",
        "\u5B66\u4E60"
      ]
    },
    {
      id: "blog-4d2e76e09f0826f3",
      name: "Magren's Blog",
      url: "https://magren.me/atom.xml",
      site: "https://magren.me/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF",
        "\u968F\u7B14",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-4c56b0b939d72f56",
      name: "\u4E00\u4E2A\u5DE5\u5320",
      url: "https://www.yigegongjiang.com/atom.xml",
      site: "https://www.yigegongjiang.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u65E5\u5E38"
      ]
    },
    {
      id: "blog-dddce9fbe8ac3901",
      name: "AlexSJC \u7684\u535A\u5BA2",
      url: "https://www.alexsjc.top/atom.xml",
      site: "https://www.alexsjc.top/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-94a6b2f119eed3fe",
      name: "\u8001\u9C7C\u7684\u535A\u5BA2",
      url: "https://hgoldfish.com/blogs/rss/articles.xml",
      site: "https://hgoldfish.com/",
      tags: [
        "\u7F16\u7A0B",
        "Python",
        "Qt"
      ]
    },
    {
      id: "blog-81c80071cfc3cdb9",
      name: "xxxx\u7684\u4E2A\u4EBA\u535A\u5BA2",
      url: "https://www.windsong.top/atom.xml",
      site: "https://www.windsong.top/",
      tags: [
        "\u79D1\u7814",
        "\u7535\u5B50\u5668\u4EF6",
        "\u4F20\u70ED",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-02d5dcb15ba33cf7",
      name: "Ethan's Wiki",
      url: "https://wiki-mkdocs-topaz.vercel.app/feed_rss_updated.xml",
      site: "https://wiki-mkdocs-topaz.vercel.app/",
      tags: [
        "\u7F16\u7A0B",
        "wiki",
        "\u6548\u7387",
        "\u5DE5\u4F5C",
        "\u5B66\u4E60"
      ]
    },
    {
      id: "blog-2f4fea6f78b91845",
      name: "\u8303\u660E\u660E",
      url: "https://www.fanmingming.com/feed/",
      site: "https://www.fanmingming.com/",
      tags: [
        "\u5206\u4EAB",
        "\u65E5\u5E38",
        "\u5B66\u4E60",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-04e4fadd3b8bc620",
      name: "\u5B81\u946B\u7684\u4E2A\u4EBA\u535A\u5BA2",
      url: "https://n-xin.com/index.php/feed/",
      site: "https://n-xin.com/",
      tags: [
        "JAVA",
        "\u5B66\u4E60",
        "\u5DE5\u4F5C\u65E5\u5FD7"
      ]
    },
    {
      id: "blog-0582a977dd0333db",
      name: "\u6708\u843D\u661F\u6CB3Tsukistar",
      url: "https://www.tsukistar.fun/atom.xml",
      site: "https://www.tsukistar.fun/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-ccc20a6766c1aa74",
      name: "dsy4567 \u7684\u5C0F\u7AD9",
      url: "https://dsy4567.github.io/rss.xml",
      site: "https://dsy4567.github.io/blog.html",
      tags: [
        "\u7F16\u7A0B",
        "HTML",
        "CSS",
        "JS",
        "\u7B97\u6CD5\u7ADE\u8D5B"
      ]
    },
    {
      id: "blog-fc7150500715ba1b",
      name: "\u68A6\u6EAA\u535A\u5BA2",
      url: "https://www.cyrilstudio.top/feed",
      site: "http://www.cyrilstudio.top/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-722031319ae2391e",
      name: "Captain\u7684\u535A\u5BA2",
      url: "https://totapo.netlify.app/index.xml",
      site: "https://totapo.netlify.app/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u5B66\u4E60",
        "\u6559\u7A0B",
        "\u8F6F\u4EF6\u5206\u4EAB",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-efc05f91a7d6d909",
      name: "\u4E07\u5723\u8282\u6076\u9B54\u7684\u9886\u5730",
      url: "https://cytrogen.icu/atom.xml",
      site: "https://cytrogen.icu/",
      tags: [
        "\u7F16\u7A0B",
        "Python",
        "\u5B66\u4E60",
        "\u7B14\u8BB0",
        "\u5168\u6808",
        "JS"
      ]
    },
    {
      id: "blog-2a8d561592de1b57",
      name: "Dejavu's Blog",
      url: "https://blog.dejavu.moe/index.xml",
      site: "https://blog.dejavu.moe/",
      tags: [
        "\u6298\u817E",
        "\u5B66\u4E60",
        "\u751F\u6D3B",
        "\u65E5\u5FD7"
      ]
    },
    {
      id: "blog-7a9511be2d9e978e",
      name: "zhaolife Blog",
      url: "https://zhaolife.com/atom.xml",
      site: "https://zhaolife.com/",
      tags: [
        "\u751F\u6D3B",
        "\u6570\u7801",
        "\u8BB0\u5F55"
      ]
    },
    {
      id: "blog-61fb8ecfbca00d3a",
      name: "iCooper",
      url: "https://icooper.cc/feed/",
      site: "https://icooper.cc/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u751F\u6D3B",
        "\u65E5\u5FD7",
        "\u5B66\u4E60"
      ]
    },
    {
      id: "blog-543488cc7f5da48f",
      name: "Max\u7684\u6280\u672F\u672D\u8BB0",
      url: "https://www.immaxfang.com/atom.xml",
      site: "https://www.immaxfang.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u540E\u7AEF",
        "\u4E91\u539F\u751F"
      ]
    },
    {
      id: "blog-a5956bb87425f31e",
      name: "Fernweh",
      url: "https://blog.wohin.me/index.xml",
      site: "https://blog.wohin.me/",
      tags: [
        "\u4FE1\u606F\u5B89\u5168",
        "\u8BD7\u6B4C",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-430324923d0948b8",
      name: "Suiko\u7684\u81EA\u7559\u5730",
      url: "https://suiko.dev/rss/feed.xml",
      site: "https://suiko.dev/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF"
      ]
    },
    {
      id: "blog-a67862d878ccc51c",
      name: "\u675C\u8001\u5E08\u8BF4",
      url: "https://dusays.com/atom.xml",
      site: "https://dusays.com/",
      tags: [
        "\u8FD0\u7EF4\uFF0C\u6570\u7801\uFF0C\u8D44\u6E90"
      ]
    },
    {
      id: "blog-cd60b498a011cd24",
      name: "\u4E16\u754C\u89C2\u5BDF\u65E5\u8BB0",
      url: "https://fiftysixtimes7.github.io/MyWorldObservationJournal/feeds/all.atom.xml",
      site: "https://fiftysixtimes7.github.io/MyWorldObservationJournal/",
      tags: [
        "\u968F\u7B14",
        "\u601D\u8003",
        "\u54F2\u5B66",
        "\u6587\u5B66",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-cee70eb6a2dae4c3",
      name: "plus studio",
      url: "https://studyinglover.com/atom.xml",
      site: "https://studyinglover.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u673A\u5668\u5B66\u4E60",
        "\u8BA1\u7B97\u673A\u89C6\u89C9",
        "\u5143\u5B87\u5B99"
      ]
    },
    {
      id: "blog-078babdbbae770e4",
      name: "Wayne\u7684\u6280\u672F\u535A\u5BA2",
      url: "https://blog.michealwayne.cn/atom.xml",
      site: "https://blog.michealwayne.cn/",
      tags: [
        "\u524D\u7AEF",
        "\u7F16\u7A0B",
        "\u8F6F\u4EF6\u5DE5\u7A0B",
        "\u9879\u76EE\u7BA1\u7406",
        "\u8BFB\u4E66\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-c72636e1309e9873",
      name: "\u65F6\u5149\u7684\u65F6\u5149\u8F74",
      url: "https://outti.me/feed/xml",
      site: "https://outti.me/",
      tags: [
        "\u7F16\u7A0B",
        "\u6298\u817E",
        "\u751F\u6D3B",
        "\u5206\u4EAB",
        "\u8BB0\u5F55"
      ]
    },
    {
      id: "blog-e5f2ab5725f05910",
      name: "whtli\u7684\u4E2A\u4EBA\u535A\u5BA2",
      url: "http://hexo.whtli.cn/atom.xml",
      site: "http://hexo.whtli.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u540E\u7AEF",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-b9675b02231f1c6f",
      name: "\u84B2\u5C0F\u82B1\u7684\u535A\u5BA2",
      url: "https://www.jackpu.com/rss/",
      site: "https://www.jackpu.com/",
      tags: [
        "\u524D\u7AEF",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-bb74ea1925cb1acf",
      name: "ccagml\u7684\u535A\u5BA2",
      url: "http://www.ccagml.com/?feed=rss2",
      site: "http://www.ccagml.com/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-442a7e86b004d4ca",
      name: "\u6CE0\u6CEB\u51DD\u7684\u5F02\u6B21\u5143\u7A7A\u95F4",
      url: "https://lxnchan.cn/atom.xml",
      site: "https://lxnchan.cn/",
      tags: [
        "\u8FD0\u7EF4",
        "\u540E\u7AEF"
      ]
    },
    {
      id: "blog-aeade3106e6cd1dd",
      name: "Colorful - \u4E00\u679A\u6570\u5B57\u827A\u672F\u5BB6\u7684\u81EA\u7559\u5730",
      url: "https://xiaoa.name/feed.xml",
      site: "https://xiaoa.name/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF",
        "Javascript",
        "Node.js",
        "Rust",
        "Java",
        "Python",
        "\u8BFB\u4E66\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-473cd94670f92a5e",
      name: "Sekyoro\u7684\u535A\u5BA2\u5C0F\u5C4B",
      url: "https://www.sekyoro.top/atom.xml",
      site: "https://www.sekyoro.top/",
      tags: [
        "\u7F16\u7A0B",
        "\u5B66\u4E60\u7B14\u8BB0",
        "\u673A\u5668\u5B66\u4E60",
        "\u5DE5\u5177\u4F7F\u7528",
        "\u8F6F\u4EF6\u5DE5\u7A0B"
      ]
    },
    {
      id: "blog-ad4ce1c299836a7f",
      name: "\u67F4\u90E1\u732B",
      url: "https://www.cheshirex.com/feed",
      site: "https://www.cheshirex.com/",
      tags: [
        "\u751F\u6D3B",
        "\u5206\u4EAB",
        "\u8BB0\u5F55"
      ]
    },
    {
      id: "blog-3605428f389c801c",
      name: "obaby@mars",
      url: "https://h4ck.org.cn/feed/",
      site: "http://nai.dog/",
      tags: [
        "\u751F\u6D3B",
        "\u7F16\u7A0B",
        "\u786C\u4EF6",
        "\u4EBA\u5DE5\u667A\u80FD"
      ]
    },
    {
      id: "blog-f536be364a24931f",
      name: "aikenh",
      url: "https://aikenh.cn/index.xml",
      site: "https://aikenh.cn/",
      tags: [
        "\u751F\u6D3B",
        "\u5B66\u4E60",
        "\u7F16\u7A0B",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-89f5bedc03a1a74e",
      name: "\u9189\u91CC\u535A\u5BA2",
      url: "https://202271.xyz/atom.xml",
      site: "https://202271.xyz/",
      tags: [
        "\u751F\u6D3B",
        "\u5B66\u4E60",
        "\u7F16\u7A0B",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-f63f82ceaa4dcec2",
      name: "RBA\u7684\u6280\u672F\u5206\u4EAB",
      url: "https://www.firfor.cn/rss.xml",
      site: "https://firfor.cn/",
      tags: [
        "JAVA",
        "JVM",
        "HotSpot",
        "\u865A\u62DF\u673A",
        "\u7F16\u7A0B",
        "\u5B66\u4E60",
        "\u601D\u8003"
      ]
    },
    {
      id: "blog-7e857040af4cb175",
      name: "\u9ED1\u5DDD\u7720\u4E5F\u7684\u732B\u7A9D",
      url: "https://www.nekow.cn/index.php/feed/",
      site: "https://nekow.cn/",
      tags: [
        "\u751F\u6D3B",
        "\u4E2A\u4EBA\u6210\u957F",
        "\u6298\u817E",
        "\u5B66\u4E60",
        "\u6E38\u620F",
        "\u5199\u4F5C"
      ]
    },
    {
      id: "blog-b779af565479a8e9",
      name: "LearnData \u5F00\u6E90\u7B14\u8BB0",
      url: "https://newzone.top/rss.xml",
      site: "https://newzone.top/",
      tags: [
        "\u7B14\u8BB0",
        "\u4E2A\u4EBA\u6210\u957F",
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-d1f83ad9fe440dda",
      name: "\u4E5D\u4EDE\u4E4B\u884C",
      url: "https://styunlen.cn/feed",
      site: "https://styunlen.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u4EBA\u6587",
        "\u97F3\u4E50",
        "\u7B14\u8BB0",
        "\u751F\u6D3B\u65E5\u5E38"
      ]
    },
    {
      id: "blog-d38b7e6299976e6a",
      name: "Enderfga's blog",
      url: "https://enderfga.cn/atom.xml",
      site: "https://enderfga.cn/",
      tags: [
        "CV",
        "DL",
        "\u968F\u7B14",
        "\u6559\u7A0B",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-3a6536d420a021e3",
      name: "szhshp \u7684\u7B2C\u4E09\u8FB9\u5883\u7814\u7A76\u6240",
      url: "https://szhshp.org/sitemap.xml",
      site: "https://szhshp.org/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u4EBA\u6587",
        "\u97F3\u4E50",
        "\u7B14\u8BB0",
        "\u751F\u6D3B\u65E5\u5E38"
      ]
    },
    {
      id: "blog-53c0c4a0ee790f4b",
      name: "\u5C0F\u5B59\u540C\u5B66",
      url: "https://blog.sunguoqi.com/rss.xml",
      site: "https://blog.sunguoqi.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u6444\u5F71",
        "\u751F\u6D3B",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-3848da7c3bdc4eff",
      name: "ming5ming's blog",
      url: "https://ming5ming.xlog.app/feed/xml",
      site: "https://ming5ming.xlog.app/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-39b7b1449e2a015f",
      name: "\u7267\u5C18\u7684\u7F51\u7EDC\u65E5\u5FD7",
      url: "https://www.dreamlyn.cn/feed",
      site: "https://www.dreamlyn.cn/",
      tags: [
        "\u89E3\u51B3\u751F\u6D3B\u3001\u5DE5\u4F5C\u4E2D\u9047\u5230\u7684\u95EE\u9898"
      ]
    },
    {
      id: "blog-18e9ca61a0079afc",
      name: "\u8349\u6885\u53CB\u4EC1\u7684\u535A\u5BA2",
      url: "https://blog.cmyr.ltd/atom.xml",
      site: "https://blog.cmyr.ltd/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u524D\u7AEF",
        "\u65E5\u5E38",
        "TypeScript",
        "JavaScript",
        "Vue",
        "Node.js",
        "Docker"
      ]
    },
    {
      id: "blog-20c0584fdd211a8e",
      name: "Yusank's Site",
      url: "https://yusank.space/index.xml",
      site: "https://yusank.space/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "Golang",
        "Kubernetes",
        "\u5B66\u4E60",
        "\u7B14\u8BB0",
        "\u65E5\u5E38"
      ]
    },
    {
      id: "blog-33ba241a2896d9ae",
      name: "\u90D1\u6587\u5CF0\u7684\u535A\u5BA2",
      url: "https://www.zhengwenfeng.com/rss.xml",
      site: "https://www.zhengwenfeng.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u5B66\u4E60",
        "\u751F\u6D3B",
        "python",
        "golang"
      ]
    },
    {
      id: "blog-b344e3956a60de32",
      name: "MiaoHN's Blog",
      url: "https://miaohn.github.io/index.xml",
      site: "https://miaohn.github.io/",
      tags: [
        "\u7F16\u7A0B",
        "\u5B66\u4E60",
        "\u7B14\u8BB0",
        "C++",
        "Linux"
      ]
    },
    {
      id: "blog-bf668cf7c8a2e4de",
      name: "n0tr00t's blog",
      url: "https://www.n0tr00t.eu.org/index.xml",
      site: "https://www.n0tr00t.eu.org/",
      tags: [
        "\u5B89\u5168",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-c4735a027150a882",
      name: "CRUDMAN",
      url: "https://www.crudman.cn/index.xml",
      site: "https://www.crudman.cn/",
      tags: [
        "\u8F6F\u4EF6\u5F00\u53D1",
        "\u67B6\u6784\u8BBE\u8BA1",
        "\u804C\u4E1A\u53D1\u5C55",
        "\u8BFB\u4E66\u7B14\u8BB0",
        "\u751F\u6D3B\u968F\u7B14"
      ]
    },
    {
      id: "blog-94ad0042e204b4f5",
      name: "PHP\u6B66\u5668\u5E93",
      url: "https://phpreturn.com/atom.xml",
      site: "https://phpreturn.com/",
      tags: [
        "PHP",
        "PHP\u9879\u76EE",
        "\u7F16\u7A0B",
        "\u8D44\u8BAF",
        "\u6280\u672F\u6587\u7AE0"
      ]
    },
    {
      id: "blog-23a39e4913c64676",
      name: "\u6D66\u660E\u7684\u535A\u5BA2",
      url: "https://puming.zone/index.xml",
      site: "https://puming.zone/",
      tags: [
        "\u5B89\u5168",
        "\u751F\u6D3B",
        "\u968F\u7B14",
        "\u4E91\u539F\u751F"
      ]
    },
    {
      id: "blog-11a0ca3e7804c69c",
      name: "\u7834\u788E\u5343\u79CB",
      url: "https://breakinglead.github.io/atom.xml",
      site: "https://breakinglead.github.io/",
      tags: [
        "\u521D\u4E2D",
        "\u7F16\u7A0B",
        "\u8BED\u8A00\u5B66",
        "Rust",
        "\u4E1C\u65B9Project",
        "\u968F\u7B14",
        "\u97F3\u4E50",
        "OI"
      ]
    },
    {
      id: "blog-c88cb6c0fcbe5e95",
      name: "Xiaobin's Blog",
      url: "https://lxb.wiki/atom.xml",
      site: "https://lxb.wiki/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-09e218cddca6c621",
      name: "LanYun\u306EBlog",
      url: "https://lanyundev.com/atom.xml",
      site: "https://lanyundev.com/",
      tags: [
        "\u6280\u672F",
        "\u968F\u7B14",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-826b09f5e4959749",
      name: "mikaelzero",
      url: "https://xrandroid.com/atom.xml",
      site: "https://xrandroid.com/",
      tags: [
        "VR",
        "Android Framework"
      ]
    },
    {
      id: "blog-fa6724be21541854",
      name: "Leo's blog",
      url: "https://leonis.cc/feed.xml",
      site: "https://leonis.cc/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u9605\u8BFB",
        "\u6587\u5B66",
        "\u79D1\u7814"
      ]
    },
    {
      id: "blog-92b88f04a81cba4c",
      name: "WuHJ's Personel Site",
      url: "https://hjwu.cc/rss/feed.xml",
      site: "https://hjwu.cc/",
      tags: [
        "\u751F\u6D3B",
        "\u97F3\u4E50",
        "\u804A\u5929"
      ]
    },
    {
      id: "blog-07df1b9e4e588db1",
      name: "Tifa's Blog",
      url: "https://blog.tifa-233.com/atom.xml",
      site: "https://blog.tifa-233.com/",
      tags: [
        "\u7B97\u6CD5",
        "\u7F16\u7A0B",
        "C++",
        "\u4FE1\u606F\u5B66\u7ADE\u8D5B",
        "\u6570\u5B66",
        "\u6280\u672F",
        "\u5B66\u4E60",
        "\u968F\u7B14",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-399dd9af778e3872",
      name: "\u5B50\u865A\u6808",
      url: "https://blog.si-on.top/atom.xml",
      site: "https://blog.si-on.top/",
      tags: [
        "\u9605\u8BFB",
        "\u751F\u6D3B",
        "\u6750\u6599\u79D1\u5B66",
        "LaTeX",
        "\u6444\u5F71"
      ]
    },
    {
      id: "blog-b9f54fbb4dafe787",
      name: "sjdhome blog",
      url: "https://sjdhome.com/blog/atom.xml",
      site: "https://sjdhome.com/blog/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u5B66\u4E60"
      ]
    },
    {
      id: "blog-2b9fe0b08093218c",
      name: "Hsu Yeung \u7684\u535A\u5BA2",
      url: "https://www.hsuyeung.com/feed",
      site: "https://www.hsuyeung.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u65E5\u5E38",
        "\u5B66\u4E60",
        "\u97F3\u4E50"
      ]
    },
    {
      id: "blog-7f38dbba3ed144fa",
      name: "Moby",
      url: "https://isfalse.pro/feed",
      site: "https://isfalse.pro/",
      tags: [
        "\u65E5\u5E38\u7B14\u8BB0",
        "\u6280\u672F\u5165\u95E8"
      ]
    },
    {
      id: "blog-64b383701ad1fae6",
      name: "kkocdko \u7684\u535A\u5BA2",
      url: "https://kkocdko.site/feed.xml",
      site: "https://kkocdko.site/",
      tags: [
        "\u6298\u817E",
        "Rust",
        "\u524D\u7AEF",
        "\u8E29\u5751"
      ]
    },
    {
      id: "blog-0575fabb3ac3c041",
      name: "\u82E5\u7EFE",
      url: "https://royc30ne.xlog.app/feed/xml",
      site: "https://royc30ne.com/",
      tags: [
        "\u673A\u5668\u5B66\u4E60",
        "\u6280\u672F",
        "\u7B97\u6CD5",
        "\u65E5\u5E38",
        "\u6444\u5F71",
        "\u97F3\u4E50"
      ]
    },
    {
      id: "blog-ba99d6a1960ac4a6",
      name: "\u5343\u53E4\u516B\u65B9\u7684\u535A\u5BA2",
      url: "https://rangotec.com/feed",
      site: "https://rangotec.com/",
      tags: [
        "\u7F16\u7A0B",
        "Android",
        "\u6570\u636E\u79C1\u6709\u5316"
      ]
    },
    {
      id: "blog-74f3947ba5873e22",
      name: "\u949F\u610F\u535A\u5BA2",
      url: "https://blog.thatcoder.cn/atom.xml",
      site: "https://blog.thatcoder.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u5B66\u4E60",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-c74d5492689f86d0",
      name: "ikeno blog",
      url: "https://blog.ikeno.top/rss.xml",
      site: "https://blog.ikeno.top/",
      tags: [
        "\u6280\u672F",
        "\u5B66\u4E60",
        "ACG"
      ]
    },
    {
      id: "blog-9ef934b9da3571a2",
      name: "Coding\u624B\u827A\u4EBA",
      url: "https://www.smiletoyou.cn/feed",
      site: "https://www.smiletoyou.cn/",
      tags: [
        "\u6280\u672F",
        "\u7F16\u7A0B",
        "\u67B6\u6784\u8BBE\u8BA1",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-7e42d974075da400",
      name: "AlexSJC \u7684\u535A\u5BA2",
      url: "https://blog.c3c.one/feed",
      site: "https://blog.c3c.one/",
      tags: [
        "\u7B14\u8BB0",
        "\u6280\u672F",
        "\u5B66\u4E60",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-f0e120a8d2e561f8",
      name: "\u788E\u8A00\u535A\u5BA2",
      url: "https://suiyan.cc/rss.xml",
      site: "https://suiyan.cc/",
      tags: [
        "\u7F16\u7A0B",
        "\u7B14\u8BB0",
        "\u968F\u611F"
      ]
    },
    {
      id: "blog-ccc43e6e73528e9f",
      name: "Dr3@m's Blog",
      url: "https://blog.ctftools.com/atom.xml",
      site: "https://blog.ctftools.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14",
        "\u7ECF\u9A8C"
      ]
    },
    {
      id: "blog-82634375c085f86b",
      name: "\u4EFB\u970F\u535A\u5BA2",
      url: "https://blog.renfei.net/rss.xml",
      site: "https://blog.renfei.net/",
      tags: [
        "\u7F16\u7A0B",
        "Java",
        "\u7ECF\u9A8C"
      ]
    },
    {
      id: "blog-7249e376df69e935",
      name: "Shuibaco \u2022 \u6C34\u516B\u53E3",
      url: "https://shuiba.co/feed",
      site: "https://shuiba.co/",
      tags: [
        "\u65E5\u5E38",
        "\u65C5\u9014",
        "\u601D\u8003"
      ]
    },
    {
      id: "blog-967921ed1134b9ac",
      name: "\u6D41\u91D1\u5C81\u6708",
      url: "https://iliu.org/feed",
      site: "https://iliu.org/",
      tags: [
        "\u751F\u6D3B",
        "\u8BFB\u4E66",
        "\u65E5\u5E38"
      ]
    },
    {
      id: "blog-8a8d1ce82248f056",
      name: "Darren blog",
      url: "https://blog.darrenzzy.cn/atom.xml",
      site: "https://blog.darrenzzy.cn/",
      tags: [
        "\u7B97\u6CD5\uFF0C\u7F16\u7A0B\uFF0C\u67B6\u6784"
      ]
    },
    {
      id: "blog-ea1fb3315e2a9a57",
      name: "\u51CC\u89C8\u793E",
      url: "http://linglan01.cn/feed.xml",
      site: "http://linglan01.cn/",
      tags: [
        "\u524D\u7AEF",
        "Node.js",
        "\u968F\u7B14",
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-0c8833508cea8a94",
      name: "SRE\u8FD0\u7EF4\u535A\u5BA2",
      url: "https://www.cnsre.cn/index.xml",
      site: "https://www.cnsre.cn/",
      tags: [
        "Linux",
        "\u81EA\u52A8\u5316\u8FD0\u7EF4",
        "AWS",
        "K8S"
      ]
    },
    {
      id: "blog-605d56c4052411a0",
      name: "Ripple's blog",
      url: "https://hiripple.com/feed",
      site: "https://hiripple.com/",
      tags: [
        "\u6280\u672F",
        "\u6E38\u620F",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-4a6a13895b1025c9",
      name: "\u8FDC\u9E4F\u7684\u535A\u5BA2",
      url: "https://liangyuanpeng.com/index.xml",
      site: "https://liangyuanpeng.com/",
      tags: [
        "\u4E91\u539F\u751F",
        "Pulsar",
        "CNCF",
        "CDF",
        "\u5BB9\u5668",
        "K8S"
      ]
    },
    {
      id: "blog-54091469dca9af52",
      name: "\u98CE\u8427\u53E4\u9053",
      url: "https://windypath.com/rss.xml",
      site: "https://windypath.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u8F6F\u4EF6",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-94f881b6bd968fab",
      name: "\u996D\u55B5",
      url: "https://blog.fanmiao.site/feed",
      site: "https://blog.fanmiao.site/",
      tags: [
        "\u7F16\u7A0B",
        "\u667A\u80FD",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-0dbb1d17d3d512b7",
      name: "\u4E18\u5361\u996E\u54C1\u5E97",
      url: "https://blog.zerolacqua.top/atom.xml",
      site: "https://blog.zerolacqua.top/",
      tags: [
        "\u5B66\u4E60",
        "\u751F\u6D3B",
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-8fa0b874217c6da8",
      name: "\u8BC6\u6587\u89E3\u610F\u7684\u7231\u4E66\u4EBA",
      url: "http://yyy.zone/rss",
      site: "http://yyy.zone/",
      tags: [
        "\u7B14\u8BB0",
        "\u672D\u8BB0"
      ]
    },
    {
      id: "blog-d7362ff8d6c949e6",
      name: "Oragekk's Blog",
      url: "https://oragekk.me/rss.xml",
      site: "https://oragekk.me/",
      tags: [
        "\u7F16\u7A0B",
        "\u601D\u8003",
        "\u5B66\u4E60\u7B14\u8BB0",
        "\u751F\u6D3B\u6742\u60F3",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-2b382f9f676cf20f",
      name: "\u53C8\u8033\u7B14\u8BB0",
      url: "https://youerning.top/index.xml",
      site: "https://youerning.top/",
      tags: [
        "\u6280\u672F",
        "\u7F16\u7A0B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-ad6fbdc9fc94726f",
      name: "\u8C46\u9017\u5B50\u7684\u5C0F\u9ED1\u5C4B",
      url: "https://weaxsey.org/index.html",
      site: "https://weaxsey.org/",
      tags: [
        "\u5B66\u4E60",
        "\u968F\u7B14",
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-eb634e0d096bcc5a",
      name: "Log4D",
      url: "https://blog.alswl.com/atom.xml",
      site: "https://blog.alswl.com/",
      tags: [
        "\u7B14\u8BB0",
        "\u6280\u672F",
        "\u5B66\u4E60",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-4f4e11d22a4877e6",
      name: "\u6C99\u591A\u591A\u7684\u5947\u601D\u5999\u60F3",
      url: "https://fallen.wang/index.xml",
      site: "https://fallen.wang/",
      tags: [
        "\u533B\u5B66",
        "\u7F16\u7A0B",
        "\u65E5\u5E38"
      ]
    },
    {
      id: "blog-2be19476fc34739d",
      name: "\u571F\u6CD5\u70BC\u94A2\u5174\u8DA3\u5C0F\u7EC4\u7684\u535A\u5BA2",
      url: "https://quant67.com/rss.xml",
      site: "https://quant67.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u5B89\u5168"
      ]
    },
    {
      id: "blog-5f1a4cefa8ca92fd",
      name: "Dorad's Life",
      url: "https://blog.cuger.cn/atom.xml",
      site: "https://blog.cuger.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u6444\u5F71",
        "\u65E5\u5E38",
        "\u79D1\u7814"
      ]
    },
    {
      id: "blog-2603c09278f1b112",
      name: "\u30CD\u30B3\u306E\u30E1\u30E2\u5E33",
      url: "https://n.ova.moe/blog/rss.xml",
      site: "https://n.ova.moe/",
      tags: [
        "\u7F16\u7A0B",
        "\u5B89\u5168",
        "\u65E5\u5E38"
      ]
    },
    {
      id: "blog-c1dd866e6e615426",
      name: "\u6D45\u65F6\u5149\u535A\u5BA2",
      url: "https://www.dqzboy.com/feed",
      site: "https://www.dqzboy.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F\u5206\u4EAB",
        "\u5B66\u4E60\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-a20d5b63c25de68d",
      name: "Cirry's Blog",
      url: "https://cirry.cn/rss.xml",
      site: "https://cirry.cn/",
      tags: [
        "\u524D\u7AEF",
        "\u7F16\u7A0B",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-9aec54b5dc7413c8",
      name: "Kivinsae's Nest",
      url: "https://www.kivinsae.com/atom.xml",
      site: "https://www.kivinsae.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u65E5\u5E38",
        "\u601D\u8003"
      ]
    },
    {
      id: "blog-19bff396b1b735f3",
      name: "\u665A\u98CE\u535A\u5BA2",
      url: "https://xlog.me/feed",
      site: "https://xlog.me/",
      tags: [
        "\u751F\u6D3B",
        "\u65C5\u884C",
        "\u80B2\u513F"
      ]
    },
    {
      id: "blog-5a857dea54fa2057",
      name: "\u8D28\u6570\u4EBA\u751F",
      url: "https://2357.life/rss/feed.xml",
      site: "https://2357.life/",
      tags: [
        "\u751F\u6D3B",
        "\u5B66\u4E60",
        "\u5B9E\u8DF5",
        "\u6210\u957F"
      ]
    },
    {
      id: "blog-ab4bc36347087fb3",
      name: "HikariLan's Blog",
      url: "https://my.minecraft.kim/feed",
      site: "https://my.minecraft.kim/",
      tags: [
        "\u7F16\u7A0B",
        "\u5F00\u6E90",
        "\u751F\u6D3B",
        "\u65E5\u5E38"
      ]
    },
    {
      id: "blog-04e06f6a53a8ef27",
      name: "Rehtt's Blog",
      url: "https://rehtt.com/index.php/feed/",
      site: "https://rehtt.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F\u5206\u4EAB",
        "\u5B66\u4E60\u7B14\u8BB0",
        "\u6298\u817E",
        "Furry"
      ]
    },
    {
      id: "blog-41ae23ae7b6c8263",
      name: "Bluemangoo;s Blog",
      url: "https://blog.bluemangoo.net/rss.xml",
      site: "https://blog.bluemangoo.net/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F\u5206\u4EAB",
        "\u751F\u6D3B",
        "\u5199\u4F5C"
      ]
    },
    {
      id: "blog-09e9f8ed14148d11",
      name: "trudbot's blog",
      url: "https://trudbot.cn/atom.xml",
      site: "https://trudbot.cn/",
      tags: [
        "\u7B97\u6CD5",
        "\u6280\u672F",
        "\u5B66\u4E60"
      ]
    },
    {
      id: "blog-a64614caba7ffa38",
      name: "\u8FD9\u91CC\u662FL",
      url: "https://liuuzaki.net/feed",
      site: "https://liuuzaki.net/",
      tags: [
        "CG\u7F8E\u672F",
        "\u54F2\u5B66",
        "\u793E\u4F1A",
        "\u5404\u79CD\u6742\u5B66"
      ]
    },
    {
      id: "blog-6aab44f73fd8638a",
      name: "shimmer",
      url: "https://wp-boke.work/rss.xml",
      site: "https://wp-boke.work/",
      tags: [
        "\u524D\u7AEF",
        "\u6280\u672F\u5206\u4EAB",
        "\u751F\u6D3B",
        "\u6444\u5F71"
      ]
    },
    {
      id: "blog-0350e654b916b3ef",
      name: "\u8C4C\u8C46\u82B1\u4E0B\u732B - Python\u732B",
      url: "https://pythoncat.top/rss.xml",
      site: "https://pythoncat.top/",
      tags: [
        "\u7F16\u7A0B",
        "Python",
        "\u7FFB\u8BD1",
        "\u968F\u7B14",
        "\u5F00\u6E90"
      ]
    },
    {
      id: "blog-5f0496066d21540a",
      name: "WAYJAM's Blog",
      url: "https://wayjam.me/index.xml",
      site: "https://wayjam.me/",
      tags: [
        "\u968F\u7B14",
        "\u6280\u672F",
        "\u6298\u817E"
      ]
    },
    {
      id: "blog-cc4a91532acba8cc",
      name: "\u91CD\u751F\u4E91",
      url: "https://xiaochopin.github.io/feed.xml",
      site: "https://xiaochopin.github.io/",
      tags: [
        "\u968F\u7B14",
        "\u65E5\u5E38",
        "\u6E38\u620F",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-0bb5f350ddc3bda3",
      name: "\u67D2\u6708\u662F\u4F60\u7684\u8C0E\u8A00",
      url: "https://www.huangdf.xyz/rss.xml",
      site: "https://www.huangdf.xyz/",
      tags: [
        "Java",
        "Rust",
        "\u968F\u7B14",
        "\u6280\u672F",
        "\u6298\u817E"
      ]
    },
    {
      id: "blog-3f3b394a1cf12ebb",
      name: "FKY&JYQ",
      url: "https://blog.fkynjyq.com/feed.xml",
      site: "https://blog.fkynjyq.com/",
      tags: [
        "\u968F\u7B14",
        "\u6280\u672F",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-cc739ac8e5e9847e",
      name: "Vincent' blog",
      url: "https://wekic.com/rss.xml",
      site: "https://wekic.com/",
      tags: [
        "\u524D\u7AEF",
        "\u6280\u672F\u5206\u4EAB",
        "\u751F\u6D3B",
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-7662101feaad690e",
      name: "\u95F2\u4EBALife",
      url: "https://www.xianrenlife.com/feeds/posts/default",
      site: "https://www.xianrenlife.com/",
      tags: [
        "\u968F\u7B14",
        "\u5C0F\u8BF4",
        "\u4E66\u8BC4"
      ]
    },
    {
      id: "blog-82b025f5fe45fcaf",
      name: "\u826F\u8BF4",
      url: "https://xijingxu.blog/atom.xml",
      site: "https://xijingxu.blog/",
      tags: [
        "\u8BBE\u8BA1",
        "\u827A\u672F",
        "\u98DF\u7269",
        "\u624B\u5DE5",
        "\u521B\u4F5C",
        "\u8C03\u7814",
        "\u8BB0\u5F55"
      ]
    },
    {
      id: "blog-070aa5aff40ca04a",
      name: "\u53E4\u65F6\u7684\u98CE\u7B5D",
      url: "https://www.moonkite.cn/index.xml",
      site: "https://www.moonkite.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u968F\u7B14",
        "\u968F\u610F\u53D1\u6325"
      ]
    },
    {
      id: "blog-5d83da2eadd5e308",
      name: "\u83DC\u76AE\u65E5\u8BB0",
      url: "https://www.lipijin.com/feed",
      site: "https://www.lipijin.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u8BFB\u4E66",
        "\u968F\u7B14",
        "\u6444\u5F71",
        "\u505A\u996D",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-a0e80a34ecb21e75",
      name: "\u8679\u7EBF",
      url: "https://1q43.blog/feed",
      site: "https://1q43.blog/",
      tags: [
        "\u5546\u4E1A",
        "\u793E\u79D1",
        "\u79D1\u6280",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-070be887fe0b6785",
      name: "\u65E0\u540D\u5C0F\u7AD9",
      url: "https://waahah.xyz/atom.xml",
      site: "https://waahah.xyz/",
      tags: [
        "\u7F16\u7A0B",
        "\u8E29\u5751",
        "\u8BB0\u5F55"
      ]
    },
    {
      id: "blog-65e535f0d9a1e76f",
      name: "\u79CB\u8272\u90E8\u843D",
      url: "https://qiu.se/feed",
      site: "https://qiu.se/",
      tags: [
        "\u751F\u6D3B",
        "\u968F\u7B14",
        "\u8FD0\u52A8"
      ]
    },
    {
      id: "blog-53fc3b22d7750bc0",
      name: "Seraphine\u306E\u5C0F\u7A9D",
      url: "https://www.helloseraphine.top/atom.xml",
      site: "https://www.helloseraphine.top/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u5B66\u4E60",
        "\u673A\u5668\u5B66\u4E60",
        "\u5FAE\u8F6F\u5929\u5751"
      ]
    },
    {
      id: "blog-1227e5dcf432c0ec",
      name: "\u4E1C\u8BC4\u897F\u5C31",
      url: "https://dongjunke.cn/atom.xml",
      site: "https://dongjunke.cn/",
      tags: [
        "\u793E\u4EA4\u5A92\u4F53",
        "\u79D1\u6280\u4E92\u8054\u7F51",
        "\u601D\u8003",
        "\u8BFB\u4E66",
        "\u968F\u7B14",
        "\u5206\u4EAB"
      ]
    },
    {
      id: "blog-b3221a83f4f582d0",
      name: "Leon Fong \u7684\u4E2A\u4EBA\u7F51\u7AD9",
      url: "https://leonfong.me/feed.xml",
      site: "https://leonfong.me/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF",
        "\u5206\u4EAB",
        "\u8BB0\u5F55",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-749b77566d26a164",
      name: "Ke's blog",
      url: "https://mengke.me/feed.xml",
      site: "https://mengke.me/",
      tags: [
        "\u6280\u672F",
        "\u751F\u6D3B",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-2068bc31d6729c97",
      name: "\u86EE\u8346",
      url: "https://dbwu.tech/index.xml",
      site: "https://dbwu.tech/",
      tags: [
        "Go \u8BED\u8A00",
        "\u4E91\u539F\u751F",
        "CS \u57FA\u7840\u7406\u8BBA\u548C\u8F6F\u4EF6"
      ]
    },
    {
      id: "blog-ae1544ad84803038",
      name: "\u6587\u6B66\u79D1\u6280\u67DC",
      url: "https://www.wangdu.site/feed",
      site: "https://www.wangdu.site/",
      tags: [
        "\u7F16\u7A0B",
        "\u8F6F\u4EF6",
        "\u968F\u7B14",
        "\u751F\u6D3B",
        "\u524D\u7AEF"
      ]
    },
    {
      id: "blog-b226b16eab9c881f",
      name: "Oct.Cool",
      url: "https://www.oct.cool/index.xml",
      site: "https://www.oct.cool/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF",
        "Flutter"
      ]
    },
    {
      id: "blog-2e6b4db232821824",
      name: "\u7279\u7ACB\u72EC\u884C\u7684\u5F02\u7C7B",
      url: "https://www.demochen.com/atom.xml",
      site: "https://www.demochen.com/",
      tags: [
        "\u9605\u8BFB\u4E0E\u601D\u8003",
        "\u6548\u7387\u4E0E\u5DE5\u5177",
        "\u751F\u6D3B\u4E0E\u6210\u957F"
      ]
    },
    {
      id: "blog-39fc48a2a07f5a2c",
      name: "Ivan's blog",
      url: "https://ivanli.cc/feed.xml",
      site: "https://ivanli.cc/",
      tags: [
        "\u7F16\u7A0B",
        "Web",
        "\u786C\u4EF6",
        "\u5168\u6808"
      ]
    },
    {
      id: "blog-de26f736b56666e8",
      name: "Ivan's Timeline",
      url: "https://tl.ivanli.cc/u/1/rss.xml",
      site: "https://tl.ivanli.cc/",
      tags: [
        "\u7F16\u7A0B",
        "\u786C\u4EF6",
        "\u968F\u60F3",
        "\u5206\u4EAB"
      ]
    },
    {
      id: "blog-44965c6dd24848c9",
      name: "Nemo",
      url: "https://nemo.cool/rss",
      site: "https://nemo.cool/",
      tags: [
        "\u673A\u5668\u4EBA",
        "\u6280\u672F",
        "\u751F\u6D3B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-9eda51e751b5bcc9",
      name: "\u5143\u5426\u7684\u7814\u7A76\u5BA4",
      url: "https://www.happyfou.com/index.xml",
      site: "https://www.happyfou.com/",
      tags: [
        "\u6559\u7A0B",
        "\u8BA4\u77E5",
        "\u5206\u4EAB"
      ]
    },
    {
      id: "blog-9af69af27ac44cdf",
      name: "\u65B9\u5BF8\u4E4B\u95F4",
      url: "https://smj.im/rss.xml",
      site: "https://smj.im/",
      tags: [
        "Linux",
        "\u540E\u7AEF",
        "\u6280\u672F",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-605cfed1cc1cf5bb",
      name: "\u83AB\u5C14\u7D22",
      url: "https://liduos.com/atom.xml",
      site: "https://liduos.com/",
      tags: [
        "Python",
        "SDN",
        "\u8BFB\u4E66\u7B14\u8BB0",
        "LLM\u5E94\u7528\u5F00\u53D1"
      ]
    },
    {
      id: "blog-fbdf26bfa5a9e8b1",
      name: "\u534A\u65B9\u6C60\u6C34\u534A\u65B9\u7530",
      url: "https://uuanqin.top/atom.xml",
      site: "https://uuanqin.top/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u5206\u4EAB"
      ]
    },
    {
      id: "blog-633af6928ae6f096",
      name: "\u897F\u884C\u5996",
      url: "https://my.toho.red/index.xml",
      site: "https://my.toho.red/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u7B14\u8BB0",
        "\u968F\u7B14",
        "\u5206\u4EAB"
      ]
    },
    {
      id: "blog-a58bfb56f8f8a107",
      name: "\u54C8\u5C14\u7684\u57CE\u5821",
      url: "https://hallee.me/atom",
      site: "https://hallee.me/",
      tags: [
        "\u8BBE\u8BA1",
        "\u65E5\u5E38",
        "\u65C5\u884C",
        "\u5F00\u53D1"
      ]
    },
    {
      id: "blog-9e65c7b14e4bd489",
      name: "X\xB7myLog",
      url: "https://www.xmylog.com/rss/feed.xml",
      site: "https://www.xmylog.com/",
      tags: [
        "\u968F\u7B14",
        "\u6280\u672F",
        "\u7ECF\u9A8C",
        "\u65C5\u884C",
        "\u63A8\u8350",
        "\u751F\u6D3B",
        "\u97F3\u4E50",
        "\u7535\u5F71"
      ]
    },
    {
      id: "blog-af5149b0a2697453",
      name: "\u767D\u83DC",
      url: "https://blog.baicai.me/index.xml",
      site: "https://blog.baicai.me/",
      tags: [
        "\u968F\u7B14",
        "\u6280\u672F",
        "\u7ECF\u9A8C",
        "\u65C5\u884C",
        "\u63A8\u8350",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-c7356b172af43f7f",
      name: "\u5211\u8FA9\u4EBA\u5728\u8DEF\u4E0A",
      url: "https://xingbianren.cn/feed.php",
      site: "https://xingbianren.cn/",
      tags: [
        "\u5F8B\u5E08",
        "\u5211\u4E8B\u8FA9\u62A4",
        "\u65E0\u7F6A\u8FA9\u62A4",
        "\u529E\u6848\u6545\u4E8B"
      ]
    },
    {
      id: "blog-e48c6ed1143b2ad6",
      name: "Krysztal\u7684\u4E66\u684C",
      url: "https://blog.krysztal.dev/atom.xml",
      site: "https://blog.krysztal.dev/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14",
        "\u5206\u4EAB",
        "\u751F\u6D3B",
        "\u786C\u4EF6",
        "\u540E\u7AEF",
        "Furry",
        "\u7ECF\u9A8C"
      ]
    },
    {
      id: "blog-4d25ecfc161b5c74",
      name: "\u5927\u5C0F\u7897\u8BD7\u8BDD",
      url: "https://christianpoet.github.io/atom.xml",
      site: "https://christianpoet.github.io/",
      tags: [
        "\u8BD7\u6B4C\u539F\u521B",
        "\u8BD7\u6B4C\u7FFB\u8BD1",
        "\u57FA\u7763\u5F92\u8BD7\u6B4C",
        "\u5723\u7ECF\u601D\u8003",
        "\u751F\u6D3B\u968F\u7B14"
      ]
    },
    {
      id: "blog-db2909fca5d9edda",
      name: "Yuteng's Blog",
      url: "https://yanyuteng.netlify.app/atom.xml",
      site: "https://yanyuteng.github.io/",
      tags: [
        "\u793E\u4F1A\u5B66",
        "\u4EBA\u53E3\u5B66",
        "\u65C5\u884C",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-122ce48fd6f04297",
      name: "\u6642\u9593\u8C46",
      url: "http://halo.zfc.life/archives/5152aea5-c2e8-4717-8bba-2263d46e19d5",
      site: "http://halo.zfc.life/",
      tags: [
        "\u7B14\u8BB0",
        "\u751F\u6D3B",
        "\u968F\u60F3"
      ]
    },
    {
      id: "blog-4641e0d32f880b58",
      name: "\u5341\u4E8C\u7684\u7F16\u7A0B\u7B14\u8BB0",
      url: "https://blog.twelveeee.top/rss.xml",
      site: "https://blog.twelveeee.top/",
      tags: [
        "\u7B14\u8BB0",
        "\u6280\u672F",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-4bb66be337f4a1eb",
      name: "\u674E\u5BD2\u7684\u5C0F\u7A9D",
      url: "https://lihan3238.github.io/index.xml",
      site: "https://lihan3238.github.io/",
      tags: [
        "\u5B66\u4E60",
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u601D\u7D22"
      ]
    },
    {
      id: "blog-5633273a33f1248f",
      name: "Ryan' Lab",
      url: "https://blog.gaoran.xyz/rss/feed.xml",
      site: "https://blog.gaoran.xyz/",
      tags: [
        "\u4EA7\u54C1",
        "\u8BC4\u6D4B",
        "AIGC",
        "\u751F\u6D3B",
        "\u6280\u5DE7"
      ]
    },
    {
      id: "blog-ea383a35d259098c",
      name: "\u53F9\u4E16\u754C",
      url: "https://www.hauhau.cn/feed.xml",
      site: "https://www.hauhau.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u5F00\u6E90"
      ]
    },
    {
      id: "blog-869a7d57baf3edf2",
      name: "Abner\u7684\u79D8\u5BC6\u57FA\u5730",
      url: "https://cdt3211.top/atom.xml",
      site: "https://cdt3211.top/",
      tags: [
        "\u751F\u6D3B",
        "\u5B66\u4E60",
        "\u968F\u60F3"
      ]
    },
    {
      id: "blog-828944604f520895",
      name: "\u519C\u7801\u751F\u6DAF \u65E0\u9152\u65E0\u82B1",
      url: "https://nicrosoft.net/blog/feed/",
      site: "https://www.nicrosoft.net/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-e6386e9a9c034b67",
      name: "\u6D6E\u751F\u7B14\u8BB0",
      url: "https://www.dennisthink.com/index.xml",
      site: "https://www.dennisthink.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "C++"
      ]
    },
    {
      id: "blog-c64a0cf7ea289586",
      name: "Laike9m's blog",
      url: "https://laike9m.com/blog/rss/",
      site: "https://laike9m.com/blog/",
      tags: [
        "Python",
        "\u751F\u6D3B",
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-1025baa467c11dec",
      name: "\u65F6\u7A7A\u4E4B\u6B4C",
      url: "https://space520.eu.org/feed/",
      site: "https://space520.eu.org/",
      tags: [
        "\u751F\u6D3B",
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-2c2e30555879cff0",
      name: "\u6708\u68A6\u306E\u6280\u672F\u535A\u5BA2",
      url: "https://ymiir.top/feed.xml",
      site: "https://ymiir.top/",
      tags: [
        "\u7F16\u7A0B",
        "\u8BA1\u7B97\u673A\u6280\u672F",
        "Golang",
        "\u4E91\u539F\u751F"
      ]
    },
    {
      id: "blog-f3edc9e5c0533a82",
      name: "Jason Lee\u7684\u4E2A\u4EBA\u535A\u5BA2",
      url: "https://blog.jasonleehere.com/atom.xml",
      site: "https://blog.jasonleehere.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u6DA6",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-4185aec407410d4a",
      name: "by Upsangel",
      url: "https://upsangel.com/feed/",
      site: "https://upsangel.com/",
      tags: [
        "\u7F51\u8DEF\u786C\u4EF6",
        "NAS",
        "\u5355\u677F\u7535\u8111",
        "\u8BB0\u5F55"
      ]
    },
    {
      id: "blog-1d46eabe78a3147d",
      name: "krkr2(beta)",
      url: "https://www.krkr2.xyz/feed/",
      site: "https://www.krkr2.xyz/",
      tags: [
        "\u7F16\u7A0B",
        "\u65E5\u5E38",
        "\u5206\u4EAB",
        "\u4E8C\u6B21\u5143",
        "\u601D\u8003"
      ]
    },
    {
      id: "blog-ec10738ac6e845df",
      name: "\u79CB\u6FAAAkimio",
      url: "https://blog.akimio.top/rss2.xml/",
      site: "https://blog.akimio.top/",
      tags: [
        "\u79D1\u6280",
        "\u7F51\u8DEF",
        "\u5B66\u4E60\u8BB0\u5F55",
        "NAS",
        "PC"
      ]
    },
    {
      id: "blog-3ed3cb90db68abd1",
      name: "Sky Watch",
      url: "https://darksair.org/blog/feed.xml",
      site: "https://darksair.org/blog/",
      tags: [
        "\u65E5\u5E38",
        "\u7B14\u8BB0",
        "\u601D\u8003",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-b375c756d73d5a44",
      name: "booop",
      url: "https://booop.net/feed/",
      site: "https://booop.net/",
      tags: [
        "\u65E5\u5E38",
        "\u5206\u4EAB",
        "\u751F\u6D3B",
        "\u5F00\u53D1",
        "\u968F\u7B14",
        "\u6280\u672F",
        "\u7F16\u7A0B",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-31409ba385083bb9",
      name: "Shanwer's Blog",
      url: "https://blog.shanwer.top/feed/",
      site: "https://blog.shanwer.top/",
      tags: [
        "\u65E5\u5E38",
        "\u751F\u6D3B",
        "\u7F16\u7A0B",
        "\u968F\u7B14",
        "\u7B14\u8BB0",
        "\u5F00\u53D1",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-d1c71a0576b4eb2c",
      name: "xnum's Blog",
      url: "https://xnum.github.io/feed.xml",
      site: "https://xnum.github.io/",
      tags: [
        "\u7F16\u7A0B",
        "\u6298\u817E",
        "\u540E\u7AEF"
      ]
    },
    {
      id: "blog-31d359cd29088a29",
      name: "\u65E0\u540D\u535A\u5BA2",
      url: "https://wuminboke.site/feed/",
      site: "https://wuminboke.site/",
      tags: [
        "\u65E5\u5E38",
        "\u5206\u4EAB",
        "\u751F\u6D3B",
        "\u5F00\u53D1",
        "\u968F\u7B14",
        "\u6280\u672F",
        "\u7F16\u7A0B",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-ec114d8437bb9160",
      name: "gorpeln\u7684\u4E2A\u4EBA\u535A\u5BA2",
      url: "https://gorpeln.top/feed.xml",
      site: "https://gorpeln.top/",
      tags: [
        "\u65E5\u5E38",
        "\u5206\u4EAB",
        "\u751F\u6D3B",
        "\u5F00\u53D1",
        "\u968F\u7B14",
        "\u6280\u672F",
        "\u7F16\u7A0B",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-6139ae6974131bf8",
      name: "\u9762\u6761\u5B9E\u9A8C\u5BA4",
      url: "https://feed.miantiao.me/",
      site: "https://chi.miantiao.me/",
      tags: [
        "\u7F16\u7A0B",
        "\u5F00\u6E90",
        "\u524D\u7AEF"
      ]
    },
    {
      id: "blog-40824c1b1b8b648b",
      name: "Longlong's Blog",
      url: "https://blog.xlonglong.cn/feed/",
      site: "https://blog.xlonglong.cn/",
      tags: [
        "\u751F\u6D3B\u65E5\u5E38",
        "\u968F\u7B14",
        "\u5B66\u4E60\u7B14\u8BB0",
        "\u70BC\u4E39",
        "\u5F00\u53D1"
      ]
    },
    {
      id: "blog-07be1537517d9631",
      name: "Ruter's Blog",
      url: "https://ruterly.com/feed/",
      site: "https://ruterly.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u968F\u7B14",
        "\u5F00\u53D1",
        "\u5206\u4EAB"
      ]
    },
    {
      id: "blog-75a0875de2ddcc9c",
      name: "\u5C0F\u5434\u4E50\u610F\u2019blog",
      url: "http://xiaowuleyi/feed",
      site: "https://www.xiaowuleyi.com/",
      tags: [
        "\u751F\u6D3B\u968F\u60F3",
        "\u5546\u4E1A\u601D\u8003"
      ]
    },
    {
      id: "blog-b5c81ee58bfc8e22",
      name: "Gary's Blog",
      url: "https://garymeng.com/feed/",
      site: "https://garymeng.com/",
      tags: [
        "\u7F16\u7A0B",
        "IT\u6280\u672F",
        "\u6D77\u5916\u5DE5\u4F5C",
        "AI Agent"
      ]
    },
    {
      id: "blog-d3b8801173111df8",
      name: "\u5C40\u57DF\u81EA\u7531",
      url: "https://localfreedom.pages.dev/index.xml",
      site: "https://localfreedom.pages.dev/",
      tags: [
        "\u8F6F\u4EF6",
        "\u9690\u79C1",
        "\u7B14\u8BB0",
        "\u672C\u5730\u5316"
      ]
    },
    {
      id: "blog-806d4dceff54be45",
      name: "Qifei's Blog",
      url: "https://blog.sci.ci/rss2.xml",
      site: "https://blog.sci.ci/",
      tags: [
        "\u5B66\u4E60\u7B14\u8BB0",
        "\u673A\u5668\u5B66\u4E60",
        "\u524D\u7AEF",
        "\u7B97\u6CD5",
        "\u5F00\u6E90"
      ]
    },
    {
      id: "blog-d02c8cca3cb9fe93",
      name: "\u732B\u56DB\u53D4",
      url: "https://yuanj.top/index.xml",
      site: "https://yuanj.top/",
      tags: [
        "\u5B66\u4E60",
        "\u751F\u6D3B",
        "\u751F\u7269\u4FE1\u606F\u5B66"
      ]
    },
    {
      id: "blog-00b2801a789c4e10",
      name: "\u4E91\u65E0\u5FC3\u5929\u5929\u5411\u4E0A",
      url: "https://yangk.net/blog/rss.xml",
      site: "https://yangk.net/blog/",
      tags: [
        "\u95F2\u8C08",
        "\u7B14\u8BB0",
        "\u9605\u8BFB"
      ]
    },
    {
      id: "blog-425b6879ca479dac",
      name: "Qborfy\u77E5\u8BC6\u5E93",
      url: "https://qborfy.com/atom.xml",
      site: "https://qborfy.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u9605\u8BFB\u603B\u7ED3",
        "\u6280\u672F",
        "\u67B6\u6784"
      ]
    },
    {
      id: "blog-d935f70dea797037",
      name: "fwqaaq's Blog",
      url: "https://www.fwqaq.us/feed.xml",
      site: "https://www.fwqaq.us/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14",
        "\u5F00\u53D1",
        "\u5206\u4EAB"
      ]
    },
    {
      id: "blog-03b5018606a363ba",
      name: "AabyssZG's Blog",
      url: "https://blog.zgsec.cn/feed/",
      site: "https://blog.zgsec.cn/",
      tags: [
        "\u7F51\u7EDC\u5B89\u5168",
        "\u968F\u7B14",
        "\u5B66\u4E60\u7B14\u8BB0",
        "\u7ECF\u9A8C\u5206\u4EAB",
        "\u7F16\u7A0B",
        "\u4E91\u5B89\u5168",
        "\u6E17\u900F\u6D4B\u8BD5"
      ]
    },
    {
      id: "blog-f7cb835d90c44e7e",
      name: "Mox\u7684\u7B14\u8BB0\u5E93",
      url: "https://mocusez.site/zh-CN/atom.xml",
      site: "https://mocusez.site/",
      tags: [
        "\u7F16\u7A0B",
        "\u6570\u636E\u5E93",
        "\u7A0B\u5E8F\u7F16\u8BD1\u5668",
        "\u968F\u7B14",
        "\u5B66\u4E60\u7B14\u8BB0",
        "\u7ECF\u9A8C\u5206\u4EAB",
        "IT\u6280\u672F"
      ]
    },
    {
      id: "blog-c9aaf1634bc55ef4",
      name: "\u4E13\u4EAB\u751F\u6D3B",
      url: "https://zhjwork.online/feed",
      site: "https://zhjwork.online/",
      tags: [
        "\u4E13\u5229",
        "\u79D1\u6280",
        "\u968F\u7B14",
        "\u6CD5\u5F8B",
        "\u5468\u906D\u751F\u6D3B"
      ]
    },
    {
      id: "blog-63b44a8e9eea8798",
      name: "\u6B63\u5FF5",
      url: "https://wp.wtrzl.xyz/feed",
      site: "https://wp.wtrzl.xyz/",
      tags: [
        "\u6280\u672F\u5206\u4EAB",
        "\u884C\u4E1A\u7ECF\u9A8C",
        "AGI",
        "\u5927\u6570\u636E",
        "\u4E91\u8BA1\u7B97",
        "\u67B6\u6784\u8BBE\u8BA1",
        "\u751F\u6D3B\u601D\u8003"
      ]
    },
    {
      id: "blog-9eab86a84b8cf389",
      name: "8ug.icu",
      url: "https://www.8ug.icu/rss.xml",
      site: "https://www.8ug.icu/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u5F00\u6E90\u8F6F\u4EF6"
      ]
    },
    {
      id: "blog-a29911e0e35d33e2",
      name: "QP's Blog",
      url: "https://www.szqp.site/feed",
      site: "https://www.szqp.site/",
      tags: [
        "\u751F\u6D3B",
        "\u65C5\u884C",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-c722b0b68c35ed6d",
      name: "lazy_forever's Blog",
      url: "https://blog.lazyforever.top/atom.xml",
      site: "https://blog.lazyforever.top/",
      tags: [
        "\u7F16\u7A0B",
        "\u5B89\u5168",
        "\u6280\u672F",
        "\u968F\u7B14",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-3caa39256feddd0e",
      name: "\u963F\u732A",
      url: "https://yfzhu.cn/rss2.xml",
      site: "https://yfzhu.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u65E5\u5E38",
        "\u91CF\u5316\u4EA4\u6613",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-6a5d4a36239441d8",
      name: "\u5BD2\u4E5D",
      url: "https://hhao.wang/feed",
      site: "https://www.hhao.wang/",
      tags: [
        "Web",
        "C#",
        "\u6280\u672F",
        "\u67B6\u6784"
      ]
    },
    {
      id: "blog-f630d18e1e851e1f",
      name: "\u6BB5\u67D0\u4EBA\u7684\u535A\u5BA2",
      url: "https://duanmourena.github.io/feed.xml",
      site: "https://duanmourena.github.io/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u67B6\u6784",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-c627326d7ffb7158",
      name: "\u6D41\u52A8",
      url: "https://liudon.com/index.xml",
      site: "https://liudon.com/",
      tags: [
        "\u6280\u672F",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-f4a860a0c07cd882",
      name: "FGHRSH \u7684\u535A\u5BA2",
      url: "https://www.fghrsh.net/feed.php",
      site: "https://www.fghrsh.net/",
      tags: [
        "\u751F\u6D3B",
        "\u65E5\u5E38",
        "\u79D1\u6280",
        "\u6570\u7801",
        "\u7F16\u7A0B",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-3d308b2279dc6e3c",
      name: "ZLA \u5C0F\u7AD9",
      url: "https://www.zla.pub/feed.xml",
      site: "https://www.zla.pub/",
      tags: [
        "\u751F\u6D3B",
        "\u65E5\u5E38",
        "\u79D1\u6280",
        "\u6570\u7801",
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u968F\u7B14",
        "\u673A\u5668\u5B66\u4E60",
        "\u6DF1\u5EA6\u5B66\u4E60"
      ]
    },
    {
      id: "blog-f27b014e68997790",
      name: "Another Dayu",
      url: "https://anotherdayu.com/feed/",
      site: "https://anotherdayu.com/",
      tags: [
        "\u65E5\u5E38",
        "\u6D41\u884C\u75C5\u4E0E\u536B\u751F\u7EDF\u8BA1",
        "\u79D1\u6280",
        "\u6570\u7801"
      ]
    },
    {
      id: "blog-ebb8b19187d2d35b",
      name: "\u80E1\u8BF4",
      url: "https://blog.zhangyingwei.com/index.xml",
      site: "https://blog.zhangyingwei.com/",
      tags: [
        "\u751F\u6D3B",
        "\u65E5\u5E38",
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u4EA7\u54C1"
      ]
    },
    {
      id: "blog-76bf5668950a678d",
      name: "\u5531\u8BD7\u73ED",
      url: "https://changshiban.com/index.xml",
      site: "https://changshiban.com/",
      tags: [
        "\u751F\u6D3B\u65B9\u5F0F",
        "\u54F2\u5B66\u5B97\u6559",
        "\u5386\u53F2\u4EBA\u6587",
        "\u8D22\u5BCC\u5E78\u798F"
      ]
    },
    {
      id: "blog-c4be37168cb549c0",
      name: "\u738B\u5149\u536B\u535A\u5BA2",
      url: "https://www.guangweiblog.com/feed/",
      site: "https://www.guangweiblog.com/",
      tags: [
        "\u6570\u5B57\u8425\u9500",
        "\u6570\u636E\u5206\u6790"
      ]
    },
    {
      id: "blog-0fd4a048717c3271",
      name: "\u7CA5\u91CC\u6709\u52FA\u7CD6",
      url: "https://sugarat.top/feed.rss",
      site: "https://sugarat.top/",
      tags: [
        "\u7F16\u7A0B",
        "\u5927\u524D\u7AEF",
        "\u5F00\u6E90",
        "\u751F\u6D3B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-c22bd02141f37972",
      name: "Path2Exile",
      url: "https://path2exile.com/feed.xml",
      site: "https://path2exile.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u7231\u597D",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-2f2bc72c8c392d17",
      name: "Innomad\u4E00\u632A\u8FC8",
      url: "https://innomad.io/feed",
      site: "https://innomad.io/",
      tags: [
        "\u6295\u8D44",
        "\u72EC\u7ACB\u5F00\u53D1",
        "\u6570\u5B57\u6E38\u6C11"
      ]
    },
    {
      id: "blog-7aa87b8ea8a0f0dd",
      name: "Raye's Journey",
      url: "https://rayepeng.net/feed",
      site: "https://rayepeng.net/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u968F\u7B14",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-d2805a6f6e333d6a",
      name: "CuB3y0nd's Writings",
      url: "https://www.cubeyond.net/feed.xml",
      site: "https://cubeyond.net/",
      tags: [
        "\u7F51\u7EDC\u5B89\u5168",
        "PWN",
        "\u9006\u5411",
        "\u5BC6\u7801\u5B66",
        "\u7F16\u7A0B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-6282b8c33a7d1514",
      name: "\u4FDF\u6CB3\u6E05",
      url: "https://naive514.top/atom.xml",
      site: "https://naive514.top/",
      tags: [
        "\u6280\u672F",
        "\u968F\u7B14",
        "\u6C34\u6587",
        "\u6C34\u5229\u5DE5\u7A0B"
      ]
    },
    {
      id: "blog-ef4ac5475e2dc397",
      name: "\u6E38\u9493\u56DB\u65B9",
      url: "https://lhasa.icu/atom.xml",
      site: "https://lhasa.icu/",
      tags: [
        "\u9A91\u884C",
        "\u97F3\u4E50",
        "\u6280\u672F",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-cbaabbd5c6986227",
      name: "\u5341\u6708\u9057\u5FD8\u8BD7",
      url: "https://greniray.org/feed",
      site: "https://greniray.org/",
      tags: [
        "\u751F\u6D3B",
        "\u968F\u7B14",
        "\u6587\u5B66",
        "\u8BD7\u6B4C"
      ]
    },
    {
      id: "blog-6d6b880fc98d09be",
      name: "AsyncX's Blog",
      url: "https://hi.asyncx.top/rss.xml",
      site: "https://hi.asyncx.top/",
      tags: [
        "\u7F16\u7A0B",
        "\u65E5\u5E38",
        "\u54F2\u5B66",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-18862d954f2988ec",
      name: "Mag\u2018s Blog",
      url: "https://mag267.github.io/atom.xml",
      site: "https://mag267.github.io/",
      tags: [
        "\u7ED8\u753B",
        "\u7F8E\u672F",
        "\u4E66\u5F71\u97F3"
      ]
    },
    {
      id: "blog-2372e4a96c499bff",
      name: "Ali's Blog",
      url: "https://blog.liuailin.top/atom.xml",
      site: "https://blog.liuailin.top/",
      tags: [
        "\u751F\u6D3B",
        "\u65E5\u5E38",
        "\u6280\u672F",
        "\u7F16\u7A0B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-797de34c428820a0",
      name: "\u88F4\u5148\u751F\u7B14\u8BB0",
      url: "https://blog.peiluming.com/feed",
      site: "https://blog.peiluming.com/",
      tags: [
        "\u6280\u672F",
        "\u968F\u7B14",
        "\u7F16\u7A0B",
        "\u6559\u7A0B",
        "\u653B\u7565"
      ]
    },
    {
      id: "blog-a21173ec90f16554",
      name: "\u7EB8\u706F\u7684\u535A\u5BA2",
      url: "https://qingmingzong.cn/index.php/feed/",
      site: "https://qingmingzong.cn/",
      tags: [
        "\u6E38\u620F",
        "\u65E5\u5E38",
        "\u7F16\u7A0B",
        "\u6742\u8C08"
      ]
    },
    {
      id: "blog-e85bebae0b0bc6b3",
      name: "I BCL.",
      url: "https://ibcl.us/atom.xml",
      site: "https://ibcl.us/",
      tags: [
        "\u6280\u672F",
        "\u7F16\u7A0B",
        "Linux",
        "\u524D\u540E\u7AEF",
        "\u7535\u5B50",
        "\u786C\u4EF6",
        "\u65E0\u7EBF\u7535"
      ]
    },
    {
      id: "blog-c8694561a49aa85f",
      name: "Oyyko's Blog",
      url: "https://blog.oyyko.com/index.xml",
      site: "https://blog.oyyko.com/",
      tags: [
        "\u65E5\u5E38",
        "\u7F16\u7A0B",
        "\u968F\u7B14",
        "C++",
        "infra"
      ]
    },
    {
      id: "blog-0917d7312645a608",
      name: "\u96F7\u8499\u4E09\u5341",
      url: "https://raymondhouch.com/feed",
      site: "https://raymondhouch.com/",
      tags: [
        "\u521B\u4E1A",
        "\u6570\u7801",
        "\u6570\u5B57\u6E38\u6C11",
        "\u751F\u4EA7\u529B\u5DE5\u5177",
        "Notion",
        "\u6570\u5B57\u751F\u6D3B"
      ]
    },
    {
      id: "blog-fbbfe5bfa5204ab2",
      name: "Kaffa",
      url: "https://kaffa.im/feeds/all.atom.xml",
      site: "https://kaffa.im/",
      tags: [
        "\u7814\u53D1",
        "\u7F16\u7A0B",
        "\u9605\u8BFB",
        "\u6570\u667A",
        "\u8F6F\u4EF6",
        "\u8BA4\u77E5\u65B9\u6CD5\u8BBA",
        "\u4E66\u5F71\u97F3\u7269"
      ]
    },
    {
      id: "blog-c78783de4590883a",
      name: "Val.istar.Guo Blog",
      url: "https://val-istar-guo.com/api/rss/feed",
      site: "https://val-istar-guo.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u65E5\u5E38"
      ]
    },
    {
      id: "blog-87faa028979a6139",
      name: "\u7801\u519C\u5C0F\u6613\u7684\u535A\u5BA2",
      url: "https://0xlau.dev/posts/index.xml",
      site: "https://0xlau.dev/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14",
        "\u6280\u672F",
        "\u9006\u5411",
        "\u751F\u6D3B",
        "\u5B89\u5168"
      ]
    },
    {
      id: "blog-8913715f4defa7d3",
      name: "jdjwzx233-Blog",
      url: "https://www.jdjwzx233.cn/atom.xml",
      site: "https://www.jdjwzx233.cn/",
      tags: [
        "\u751F\u6D3B",
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u65E5\u5E38",
        "\u524D\u7AEF"
      ]
    },
    {
      id: "blog-92a77bfacd821259",
      name: "\u7F16\u7A0B\u968F\u60F3\u7684\u535A\u5BA2",
      url: "https://feeds2.feedburner.com/programthink",
      site: "https://program-think.blogspot.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14",
        "\u5206\u4EAB",
        "\u9690\u79C1",
        "\u7BA1\u7406"
      ]
    },
    {
      id: "blog-78fc04749f7250f2",
      name: "\u4E4C\u4E91\u76D6\u96EA",
      url: "https://wygxmew.github.io/index.xml",
      site: "https://wygxmew.github.io/",
      tags: [
        "\u751F\u6D3B",
        "\u65E5\u5E38",
        "\u601D\u8003",
        "\u611F\u609F",
        "\u968F\u7B14",
        "\u6587\u5B66",
        "\u8BD7\u6B4C",
        "\u7B14\u8BB0",
        "\u8BFB\u4E66"
      ]
    },
    {
      id: "blog-ffcf329a7063e309",
      name: "\u90A2\u5E73cn-xingpingcn",
      url: "https://xingpingcn.top/atom.xml",
      site: "https://xingpingcn.top/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u793E\u4F1A\u79D1\u5B66",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-38a78d4ac49f3674",
      name: "\u9A91\u884C\u8D85\u8FC7\u725B",
      url: "https://www.chaoniulian.com/rss/",
      site: "https://www.chaoniulian.com/",
      tags: [
        "\u597D\u73A9\u7684\u4E2A\u4EBA\u7F51\u5FD7",
        "\u8BFB\u4E66",
        "\u9A91\u884C",
        "\u6548\u7387\u7FFB\u500D"
      ]
    },
    {
      id: "blog-07bbc5198fe0ea98",
      name: "\u6F84\u6CA8\u7684\u6F2B\u6E38\u8336\u8BB0",
      url: "https://champhoon.xyz/atom.xml",
      site: "https://champhoon.xyz/",
      tags: [
        "ACG",
        "\u65E5\u5E38",
        "\u968F\u7B14",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-a9be18f3d9ebc3b2",
      name: "\u5343\u91CC\u4E4B\u8C6A",
      url: "https://blog.gadore.top/feed.xml",
      site: "https://blog.gadore.top/",
      tags: [
        "\u6280\u672F",
        "\u751F\u6D3B",
        "\u56FE\u7247"
      ]
    },
    {
      id: "blog-6b6276905417e627",
      name: "Shaun's Space",
      url: "https://cniter.github.io/atom.xml",
      site: "https://cniter.github.io/",
      tags: [
        "\u6280\u672F",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-3c5e7e7fb1065270",
      name: "\u5927\u718A\u8981\u98DE\u7FD4",
      url: "https://blog.wexiami.com/feed",
      site: "https://blog.wexiami.com/",
      tags: [
        "\u751F\u6D3B",
        "\u6210\u957F",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-3e9bab53fc5aeff2",
      name: "\u7528\u4E2D\u6587\u7F16\u7A0B",
      url: "http://codeinchinese.com/feed.xml",
      site: "http://codeinchinese.com/",
      tags: [
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-ba545c3bca7a4dee",
      name: "\u8FFD\u9010\u65E5\u843D",
      url: "https://zzrl.cc/atom.xml",
      site: "https://zzrl.cc/",
      tags: [
        "\u7F16\u7A0B",
        "\u540E\u7AEF",
        "\u751F\u6D3B",
        "\u6280\u672F",
        "\u7B14\u8BB0",
        "Java"
      ]
    },
    {
      id: "blog-612c5e4f7fe579d8",
      name: "\u6708\u591CMoonlight",
      url: "https://moonlt.site/posts/index.xml",
      site: "https://moonlt.site/",
      tags: [
        "\u968F\u7B14",
        "\u8BFB\u4E66",
        "\u751F\u6D3B",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-0cb3f7cd16afa345",
      name: "\u536B\u661F\u5B9E\u9A8C\u5BA4",
      url: "https://www.xlabs.club/index.xml",
      site: "https://www.xlabs.club/",
      tags: [
        "\u7F16\u7A0B",
        "\u79D1\u6280",
        "\u4E91\u539F\u751F",
        "Java"
      ]
    },
    {
      id: "blog-65ea418199176c53",
      name: "\u5F20\u667A\u52C7",
      url: "https://zyzhang.com/feed/",
      site: "https://zyzhang.com/",
      tags: [
        "\u521B\u4E1A",
        "\u6295\u8D44",
        "\u9605\u8BFB"
      ]
    },
    {
      id: "blog-f758f20d9efa2b6c",
      name: "\u7693\u5B50\u7684\u5C0F\u7AD9",
      url: "https://howiehz.top/rss.xml",
      site: "https://howiehz.top/",
      tags: [
        "\u6280\u672F",
        "\u7F16\u7A0B",
        "\u5F00\u6E90",
        "\u524D\u7AEF",
        "\u540E\u7AEF",
        "\u65E5\u5E38",
        "\u968F\u7B14",
        "\u751F\u6D3B",
        "\u6742\u8C08",
        "Python",
        "\u5206\u4EAB"
      ]
    },
    {
      id: "blog-862437a0b6f651d9",
      name: "ZoDream's Blog",
      url: "https://zodream.cn/blog/rss",
      site: "https://zodream.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u5F00\u6E90",
        "\u5168\u6808"
      ]
    },
    {
      id: "blog-c40d22e319d816c3",
      name: "\u61CB\u548C\u9053\u4EBA",
      url: "https://blog.dao.js.cn/atom.xml",
      site: "https://blog.dao.js.cn/",
      tags: [
        "\u674E\u81F3\u81E3",
        "\u674E\u61CB\u548C",
        "\u5357\u901A\u9053\u58EB",
        "\u98CE\u6C34",
        "\u5BB6\u5C45\u98CE\u6C34",
        "\u4F4F\u5B85\u98CE\u6C34"
      ]
    },
    {
      id: "blog-2e5b60999230fdd3",
      name: "\u9876\u5C16\u7814\u53D1\u7684\u4E2A\u4EBA\u535A\u5BA2",
      url: "https://bestcoder.cn/feed",
      site: "https://bestcoder.cn/",
      tags: [
        "\u65E5\u5E38",
        "\u968F\u7B14",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-b33863dd8c7e2091",
      name: "\u4E91\u5FC3\u6000\u9E64",
      url: "https://bluehe.cn/feed/",
      site: "https://bluehe.cn/",
      tags: [
        "\u751F\u6D3B",
        "\u751F\u6D3B\u65B9\u5F0F",
        "\u98CE\u5149\u6444\u5F71",
        "\u79D1\u6280",
        "\u65C5\u884C",
        "\u9605\u8BFB"
      ]
    },
    {
      id: "blog-c02ac7e5f66b2441",
      name: "\u4E00\u4E2A\u590F\u5929\u7684\u5E74\u5C11",
      url: "https://forrestgump618.github.io/atom.xml",
      site: "https://forrestgump618.github.io/",
      tags: [
        "\u968F\u7B14",
        "\u751F\u7269\u4FE1\u606F\u5B66",
        "\u4E34\u5E8A\u533B\u5B66"
      ]
    },
    {
      id: "blog-0871590a584d0d62",
      name: "Dallas Lu",
      url: "https://dallas.lu/feed",
      site: "https://dallas.lu/",
      tags: [
        "\u7F16\u7A0B",
        "\u7F51\u7EDC"
      ]
    },
    {
      id: "blog-20e71ee81c1eaddf",
      name: "\u96FE\u6797\u535A\u5BA2",
      url: "https://www.baiwulin.com/feed/",
      site: "https://www.baiwulin.com/",
      tags: [
        "\u6280\u672F",
        "\u968F\u7B14",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-56dc02a299f4192a",
      name: "Yuics Blog",
      url: "https://arckive.cn/index.xml",
      site: "https://arckive.cn/",
      tags: [
        "\u7B97\u6CD5\u7ADE\u8D5B",
        "\u7B97\u6CD5\u4E0E\u6570\u636E\u7ED3\u6784",
        "\u751F\u6D3B",
        "\u968F\u7B14",
        "\u6570\u5B66",
        "\u9605\u8BFB",
        "ACGN"
      ]
    },
    {
      id: "blog-bc2e1dc27cc256fb",
      name: "A small world of unnamedtat",
      url: "https://unnamedtat.xyz/rss.xml",
      site: "https://unnamedtat.xyz/",
      tags: [
        "\u6280\u672F",
        "GIS\u3001\u751F\u6001\u6587\u732E\u9605\u8BFB\u3001\u7B97\u6CD5\u5206\u4EAB",
        "Web\u524D\u7AEF",
        "Python",
        "R"
      ]
    },
    {
      id: "blog-6a8815fc3adf214e",
      name: "\u98DE\u98DE\u7231\u6298\u817E",
      url: "https://songfei.org/index.xml",
      site: "https://songfei.org/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u968F\u7B14",
        "\u65E0\u7EBF\u7535",
        "DIY"
      ]
    },
    {
      id: "blog-bff9eba5617423f9",
      name: "Menghuan1918\u7684\u535A\u5BA2",
      url: "https://blog.menghuan1918.com/rss.xml",
      site: "https://blog.menghuan1918.com/",
      tags: [
        "\u7F16\u7A0B",
        "Linux",
        "\u6298\u817E"
      ]
    },
    {
      id: "blog-5af53383279963f1",
      name: "\u7B03\u5FD7\u8005\u7684\u535A\u5BA2",
      url: "https://ceeji.net/blog/feed/",
      site: "https://ceeji.net/",
      tags: [
        "\u7F16\u7A0B",
        "\u6444\u5F71",
        "\u65C5\u884C",
        "\u6C49\u8BED",
        "\u6587\u5316"
      ]
    },
    {
      id: "blog-df82a58233a59b6d",
      name: "Cosmos\u7684\u535A\u5BA2",
      url: "https://cosmo-polite.com/feed/",
      site: "https://cosmo-polite.com/",
      tags: [
        "\u5317\u7F8E\u751F\u6D3B",
        "\u601D\u7EF4\u788E\u7247"
      ]
    },
    {
      id: "blog-f26cdf4037718a26",
      name: "\u6912\u76D0\u8C46\u8C49",
      url: "https://blog.douchi.space/index.xml",
      site: "https://blog.douchi.space/",
      tags: [
        "\u6D4B\u8BC4",
        "\u751F\u6D3B",
        "\u65C5\u884C",
        "\u79D1\u6280"
      ]
    },
    {
      id: "blog-6590aba5a33a56af",
      name: "\u572801\u4E4B\u95F4\u5230\u5904\u627E\u6211",
      url: "https://imzh.me/index.xml",
      site: "https://imzh.me/",
      tags: [
        "\u5DE5\u5177"
      ]
    },
    {
      id: "blog-64765a8186b7fea2",
      name: "JZ's Rambles",
      url: "https://ramble.imzh.me/index.xml",
      site: "https://ramble.imzh.me/",
      tags: [
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-73db9290f380e037",
      name: "mafeifan\u7684\u6280\u672F\u535A\u5BA2",
      url: "https://mafeifan.com/feed.rss",
      site: "https://mafeifan.com/",
      tags: [
        "Devops",
        "\u6280\u672F",
        "\u4E91\u539F\u751F"
      ]
    },
    {
      id: "blog-214e6eeb7dd51365",
      name: "Wener's Live & Life",
      url: "https://wener.me/story/rss.xml",
      site: "https://wener.me/",
      tags: [
        "\u751F\u6D3B",
        "\u6280\u672F",
        "\u7F16\u7A0B",
        "\u6587\u5316",
        "\u6742\u8C08",
        "\u67B6\u6784",
        "\u8BBE\u8BA1",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-26571f4450b46fad",
      name: "\u5C3C\u666E\u5B66\u79CD\u82B1",
      url: "https://kneep.github.io/index.xml",
      site: "https://kneep.github.io/",
      tags: [
        "\u6280\u672F",
        "\u5DE5\u4F5C",
        "\u65C5\u884C",
        "\u968F\u60F3"
      ]
    },
    {
      id: "blog-54941b5c309eb4c6",
      name: "\u6570\u636E\u4ED3\u5E93\u6280\u672F",
      url: "https://www.dwsql.com/interview",
      site: "https://www.dwsql.com/",
      tags: [
        "\u5927\u6570\u636E",
        "\u6570\u636E\u4ED3\u5E93",
        "\u6570\u636E\u5F00\u53D1\u9762\u8BD5SQL"
      ]
    },
    {
      id: "blog-f19790cbc41b057b",
      name: "\u8098\u5B50\u7684 Swift \u8BB0\u4E8B\u672C",
      url: "https://fatbobman.com/zh/rss.xml",
      site: "https://fatbobman.com/",
      tags: [
        "\u7F16\u7A0B",
        "Swift",
        "SwiftUI"
      ]
    },
    {
      id: "blog-527d0a9b24966d9e",
      name: "Tevin Zhang",
      url: "https://tevinzhang.com/zh/feed.xml",
      site: "https://tevinzhang.com/zh/",
      tags: [
        "\u6570\u5B57\u5316\u751F\u6D3B",
        "\u6570\u636E\u81EA\u4E3B",
        "\u6570\u5B57\u8D44\u4EA7",
        "\u751F\u4EA7\u529B\u5DE5\u5177",
        "\u7ECF\u9A8C\u5206\u4EAB",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-3725135f83abf17d",
      name: "Linzihao's Blog",
      url: "https://www.linzihao.com/",
      site: "https://linzihao.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u521B\u4E1A",
        "\u751F\u6D3B",
        "\u601D\u8003"
      ]
    },
    {
      id: "blog-4ae79bc5ef928023",
      name: "Keenwon's Blog",
      url: "https://keenwon.com/rss.xml",
      site: "https://keenwon.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u601D\u8003",
        "\u6280\u672F\u535A\u5BA2",
        "\u524D\u7AEF\u5F00\u53D1",
        "\u5168\u6808"
      ]
    },
    {
      id: "blog-133bdec23f8fbc01",
      name: "Stray Episode",
      url: "https://farer.org/rss/",
      site: "https://farer.org/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u6E38\u620F",
        "\u601D\u8003",
        "\u968F\u7B14",
        "\u9605\u8BFB",
        "\u5410\u69FD"
      ]
    },
    {
      id: "blog-511a941174e52a33",
      name: "\u8499\u5947\u65E5\u8BB0",
      url: "https://luffy.cc/feed",
      site: "https://luffy.cc/",
      tags: [
        "\u751F\u6D3B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-ed41ce13f18362ad",
      name: "data4fun",
      url: "https://data4fun.cc/index.xml",
      site: "https://data4fun.cc/",
      tags: [
        "\u4E2A\u4EBA\u968F\u7B14",
        "\u5927\u6570\u636E",
        "AI"
      ]
    },
    {
      id: "blog-9c4a22f6d5dac455",
      name: "\u5931\u8FF9\u306E\u535A\u5BA2",
      url: "https://blog.reincarnatey.net/index.xml",
      site: "https://blog.reincarnatey.net/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u968F\u7B14",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-473dba4ed370bd88",
      name: "Kerry\u7684\u5B66\u4E60\u7B14\u8BB0",
      url: "https://kerrynotes.com/feed/",
      site: "https://kerrynotes.com/",
      tags: [
        "\u8F6F\u4EF6",
        "\u6280\u672F",
        "\u5206\u4EAB"
      ]
    },
    {
      id: "blog-40ff35feaec15190",
      name: "smile \u7684\u535A\u5BA2\u82B1\u56ED",
      url: "https://nsddd.top/zh/posts/index.xml",
      site: "https://nsddd.top/zh",
      tags: [
        "\u6280\u672F",
        "\u7F16\u7A0B",
        "AI",
        "\u521B\u4E1A",
        "\u751F\u6D3B",
        "\u601D\u8003",
        "\u7B14\u8BB0",
        "\u751F\u4EA7\u529B\u5DE5\u5177",
        "\u5F00\u6E90"
      ]
    },
    {
      id: "blog-b6ba0e2deee267d3",
      name: "\u4E1C\u4E1C's Blog",
      url: "https://blog.yasking.org/atom.xml",
      site: "https://blog.yasking.org/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-05da7b2c78958fb4",
      name: "\u6709\u601D\u60F3\u7684\u82A6\u82C7's Blog",
      url: "https://thinking-reed.cn/atom.xml",
      site: "https://thinking-reed.cn/",
      tags: [
        "\u6280\u672F",
        "\u79D1\u7814",
        "AI",
        "\u751F\u6D3B",
        "\u601D\u8003",
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-e2e2d58fdca9d562",
      name: "\u962E\u8D85\u6C11\u7684\u4E2A\u4EBA\u7F51\u7AD9",
      url: "https://www.ruanchaomin.com/api/rss",
      site: "https://www.ruanchaomin.com/",
      tags: [
        "\u524D\u7AEF",
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-87e0282cdc09da62",
      name: "\u9010\u6C34\u5BFB\u6E90",
      url: "https://www.zair.top/index.xml",
      site: "https://www.zair.top/",
      tags: [
        "AI",
        "\u5927\u6A21\u578B",
        "\u6570\u636E\u79D1\u5B66",
        "\u673A\u5668\u5B66\u4E60",
        "\u5B66\u4E60\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-0d35d3aaeb0494b9",
      name: "Razeen's Blog",
      url: "https://razeen.me/index.xml",
      site: "https://razeen.me/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-8454f0b4c5f9e3bb",
      name: "\u9752\u77F3\u575E",
      url: "https://www.qs5.org/feed/",
      site: "https://www.qs5.org/",
      tags: [
        "\u6280\u672F",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-fe7c65a85aa9cd1e",
      name: "hsfzxjy \u7684\u535A\u5BA2",
      url: "https://i.hsfzxjy.site/rss.xml",
      site: "https://i.hsfzxjy.site/",
      tags: [
        "\u7F16\u7A0B",
        "\u5F00\u6E90",
        "\u968F\u60F3",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-d6c3a344dc6cd5b3",
      name: "S\u0415SS\u306EB10G\u0422\u04155\u0422",
      url: "https://sess.moe/feed.xml",
      site: "https://sess.moe/",
      tags: [
        "\u7F16\u7A0B",
        "\u5F00\u6E90",
        "Linux",
        "\u751F\u6D3B",
        "\u7F51\u7EDC"
      ]
    },
    {
      id: "blog-fe293c4313735242",
      name: "C0reFast\u8BB0\u4E8B\u672C",
      url: "https://www.ichenfu.com/atom.xml",
      site: "https://www.ichenfu.com/",
      tags: [
        "\u6280\u672F",
        "\u7F16\u7A0B",
        "Linux"
      ]
    },
    {
      id: "blog-368f8a851f5b565d",
      name: "\u7801\u519C\u660E\u660E\u6851",
      url: "https://isming.me/index.xml",
      site: "https://isming.me/",
      tags: [
        "\u6280\u672F",
        "\u751F\u6D3B",
        "\u65C5\u884C",
        "\u8BFB\u4E66"
      ]
    },
    {
      id: "blog-ab8c1b3aaee3aa9b",
      name: "Deeprouter",
      url: "https://deeprouter.org/rss/feed.xml",
      site: "https://deeprouter.org/",
      tags: [
        "\u8DEF\u7531\u5668",
        "\u5BB6\u5EAD\u7F51\u7EDC",
        "\u5DE5\u5177",
        "OpenWRT",
        "\u5206\u4EAB"
      ]
    },
    {
      id: "blog-2418d477ad0c1b8d",
      name: "Jame",
      url: "https://jame.work/feed.xml",
      site: "https://jame.work/",
      tags: [
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-0f572c39bb021d6e",
      name: "iNote",
      url: "https://inote.xyz/zh/rss.xml",
      site: "https://inote.xyz/zh/",
      tags: [
        "\u6295\u8D44",
        "\u521B\u4E1A",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-b1fe890d7b3501df",
      name: "\u4EBA\u751F\u8DB3\u8FF9 \xB7 \u535A\u5BA2\u5E73\u53F0",
      url: "https://blog.lifebus.top/feed.xml",
      site: "https://blog.lifebus.top/",
      tags: [
        "\u6559\u7A0B",
        "\u8F6F\u4EF6",
        "\u6280\u672F",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-7426851e2a80b887",
      name: "\u767D\u4E01\u8F76\u4E8B",
      url: "https://www.moranfong.com/feed/",
      site: "https://www.moranfong.com/",
      tags: [
        "\u968F\u7B14",
        "\u751F\u6D3B",
        "\u6559\u7A0B"
      ]
    },
    {
      id: "blog-683d422bac016565",
      name: "OneCoder\u7684\u535A\u5BA2",
      url: "https://www.coderli.com/feed.xml",
      site: "https://www.coderli.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u6559\u7A0B",
        "\u6280\u672F",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-7c350c4b6fd9b43b",
      name: "\u83F2\u5179\u514B\u65AF\u55B5",
      url: "https://physnya.top/atom.xml",
      site: "https://physnya.top/",
      tags: [
        "\u7269\u7406",
        "\u6570\u5B66",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-8b7fd1f10c61aebd",
      name: "Xeonzilla's Note",
      url: "https://xeonzilla.top/index.xml",
      site: "https://xeonzilla.top/",
      tags: [
        "\u4E8C\u6B21\u5143",
        "\u6280\u672F",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-ac915179eb80b3ad",
      name: "Kang's Blog",
      url: "https://blog.kdev.top/atom.xml",
      site: "https://blog.kdev.top/",
      tags: [
        "\u7F16\u7A0B",
        "Linux",
        "\u79D1\u7814\u5B66\u4E60"
      ]
    },
    {
      id: "blog-2dd2b43e0dda3eab",
      name: "JaSpirit \u7684\u4E07\u4E8B\u5C4B",
      url: "https://blog.jaspirit.cc/atom.xml",
      site: "https://blog.jaspirit.cc/",
      tags: [
        "\u7B97\u6CD5",
        "\u8BA1\u7B97\u673A\u79D1\u5B66",
        "\u795E\u7ECF\u79D1\u5B66",
        "\u5316\u5B66",
        "\u6280\u672F",
        "\u6559\u7A0B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-f4ba2692c636b939",
      name: "\u6DF1\u6D77\u4E4B\u773C",
      url: "https://www.seaeye.cn/feed/",
      site: "https://www.seaeye.cn/",
      tags: [
        "\u533A\u5757\u94FE",
        "CTF"
      ]
    },
    {
      id: "blog-69f6fca89668dbe5",
      name: "\u5E3D\u4E4B\u5C9B - Hat's Land",
      url: "https://www.hats-land.com/atom.xml",
      site: "https://www.hats-land.com/",
      tags: [
        "\u968F\u7B14",
        "\u601D\u8003",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-b8b29b1691cdf437",
      name: "Niracler's Blog",
      url: "https://niracler.com/rss.xml",
      site: "https://niracler.com/",
      tags: [
        "\u751F\u6D3B",
        "\u7F16\u7A0B",
        "\u5DE5\u5177",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-96fa651e54efee95",
      name: "\u62D2\u7EDD\u5185\u8017\u76F4\u63A5\u53D1\u75AF",
      url: "https://blog.luijp.cn/rss.xml",
      site: "https://blog.luijp.cn/",
      tags: [
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-cb1cf69344608bc4",
      name: "gentlelucky",
      url: "https://blog.gentlelucky.com/zh/index.xml",
      site: "https://blog.gentlelucky.com/",
      tags: [
        "\u968F\u7B14",
        "\u601D\u8003",
        "Java",
        "\u77E5\u8BC6\u7BA1\u7406"
      ]
    },
    {
      id: "blog-6df70b7bcee7d7a8",
      name: "\u4F46\u4E3A\u541B\u6545",
      url: "https://dreams.plus/rss.xml",
      site: "https://dreams.plus/",
      tags: [
        "\u751F\u6D3B",
        "\u968F\u7B14",
        "\u7F16\u7A0B",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-f060eb32f6b89839",
      name: "\u5C0F\u677E\u9F20\u7684\u535A\u5BA2",
      url: "https://ycyin.eu.org/sitemap.xml",
      site: "https://ycyin.eu.org/",
      tags: [
        "\u7F16\u7A0B",
        "\u907F\u5751",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-81ef81d50cdeee4b",
      name: "Taxodium",
      url: "https://taxodium.ink/rss.xml",
      site: "https://taxodium.ink/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-af6ac9b2316ba68e",
      name: "\u9177\u9177\u7684\u767D",
      url: "https://bducds.com/feed",
      site: "https://bducds.com/",
      tags: [
        "\u6280\u672F",
        "\u751F\u6D3B",
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-ad9a9187dda70948",
      name: "Yesterday17's Blog",
      url: "https://blog.mmf.moe/rss.xml",
      site: "https://blog.mmf.moe/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u4E8C\u6B21\u5143",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-a86f1598cc365b58",
      name: "WSH",
      url: "https://www.wsh233.cn/feed.xml",
      site: "https://wsh233.cn/",
      tags: [
        "\u751F\u6D3B",
        "\u968F\u7B14",
        "GISer",
        "\u5730\u4FE1"
      ]
    },
    {
      id: "blog-8ab97d16e61dbd5d",
      name: "Heggria",
      url: "https://heggria.site/feed.xml",
      site: "https://heggria.site/",
      tags: [
        "\u6280\u672F",
        "\u751F\u6D3B",
        "\u7F16\u7A0B",
        "\u524D\u7AEF"
      ]
    },
    {
      id: "blog-a03af3c82baf17bc",
      name: "Sehnsucht",
      url: "https://blog.sehnsucht.top/rss.xml",
      site: "https://blog.sehnsucht.top/",
      tags: [
        "\u6280\u672F",
        "\u751F\u6D3B",
        "\u968F\u7B14",
        "\u8BFB\u4E66",
        "\u6742\u8C08",
        "\u5A31\u4E50",
        "\u601D\u8003"
      ]
    },
    {
      id: "blog-8b983ff304020862",
      name: "RisingIce",
      url: "https://www.imrising.cn/sitemap.xml",
      site: "https://www.imrising.cn/",
      tags: [
        "\u6280\u672F",
        "\u751F\u6D3B",
        "\u968F\u7B14",
        "AIGC"
      ]
    },
    {
      id: "blog-ad22fe809b19576a",
      name: "Muspi Merol \u7684\u4E2A\u4EBA\u4E3B\u9875",
      url: "https://muspimerol.site/feed",
      site: "https://muspimerol.site/",
      tags: [
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-949966295b76b7ee",
      name: "qubeijun's Blog",
      url: "https://qubeijun.github.io/atom.xml",
      site: "https://qubeijun.github.io/",
      tags: [
        "\u6280\u672F",
        "\u751F\u6D3B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-9baf2ebea6f3d6bc",
      name: "VPS\u4E25\u9009",
      url: "https://www.vpscp.top/feed/",
      site: "https://www.vpscp.top/",
      tags: [
        "\u6280\u672F",
        "\u6D4B\u8BC4",
        "Linux",
        "\u4E3B\u673A"
      ]
    },
    {
      id: "blog-77febfddf3cba637",
      name: "\u6709\u8BDD\u8C6A\u8BF4",
      url: "https://www.lihao00.com/feed/",
      site: "https://www.lihao00.com/",
      tags: [
        "\u601D\u8003",
        "\u751F\u6D3B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-46c68dbe18d3bb2d",
      name: "Yonglin's Blog",
      url: "https://xieyonglin.com/posts/rss.xml",
      site: "https://xieyonglin.com/",
      tags: [
        "\u6280\u672F",
        "\u751F\u6D3B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-50096e383f5c6839",
      name: "\u6674\u7A7A\u6811",
      url: "https://pinaland.cn/feed/",
      site: "https://pinaland.cn/",
      tags: [
        "\u65E5\u5E38",
        "\u4E8C\u6B21\u5143",
        "\u52A8\u753B",
        "\u6E38\u620F",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-4e6c252e8ec436ad",
      name: "\u7A7A\u9E23\u6DF1\u8BED",
      url: "https://blog.deepchirp.com/atom.xml",
      site: "https://blog.deepchirp.com/",
      tags: [
        "\u6280\u672F",
        "\u751F\u6D3B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-83f030735cbb132c",
      name: "\u8FD0\u7EF4\u5F00\u53D1\u7EFF\u76AE\u4E66",
      url: "https://www.geekery.cn/rss.xml",
      site: "https://www.geekery.cn/",
      tags: [
        "\u6280\u672F",
        "\u751F\u6D3B",
        "\u5F00\u6E90"
      ]
    },
    {
      id: "blog-e637b0cb1aa5fe8c",
      name: "\u8292\u679C\u52FF\u8BED",
      url: "https://mangoman.us.kg/?feed=rss2",
      site: "https://mangoman.us.kg/",
      tags: [
        "\u968F\u7B14",
        "\u5206\u4EAB",
        "\u641E\u4E8B\u60C5"
      ]
    },
    {
      id: "blog-d54a4309c6c11726",
      name: "distjr_'s blog",
      url: "https://blog.distjr.top/atom.xml",
      site: "https://blog.distjr.top/",
      tags: [
        "\u6280\u672F",
        "\u968F\u7B14",
        "\u97F3\u4E50",
        "\u4E8C\u6B21\u5143"
      ]
    },
    {
      id: "blog-b08f10563d8aebbf",
      name: "\u6708\u77F3MoonStone",
      url: "https://moonstone.fun/feed/",
      site: "https://moonstone.fun/",
      tags: [
        "\u4E2D\u56FD\u53E4\u5EFA\u7B51",
        "\u5510\u5B8B\u8FBD\u91D1\u53E4\u5EFA\u7B51",
        "\u4E2D\u56FD\u6728\u7ED3\u6784\u5EFA\u7B51",
        "\u53E4\u5EFA\u7B51\u77E5\u8BC6",
        "\u8425\u9020\u6CD5\u5F0F",
        "\u6597\u6831",
        "\u5927\u6728\u4F5C",
        "3D\u6A21\u578B"
      ]
    },
    {
      id: "blog-f6467bb593ee0436",
      name: "\u6816\u6728\u7684\u7F51\u7EDC\u65E5\u5FD7",
      url: "https://blog.thedoga.tech/feed",
      site: "https://blog.thedoga.tech/",
      tags: [
        "\u968F\u7B14",
        "\u751F\u6D3B",
        "\u6742\u4E03\u6742\u516B"
      ]
    },
    {
      id: "blog-50310b27b0e26534",
      name: "\u53F6\u6CEF\u5E0C",
      url: "https://blog.418121.xyz/rss2.xml",
      site: "https://blog.418121.xyz/",
      tags: [
        "\u751F\u6D3B",
        "\u6444\u5F71",
        "\u6559\u7A0B"
      ]
    },
    {
      id: "blog-f862cc3e01bacfa6",
      name: "\u4E00\u6850\u306EBlog",
      url: "https://blog.ytmc.fun/rss.xml",
      site: "https://blog.ytmc.fun/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u6298\u817E",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-ba55c58c476706e2",
      name: "Evan",
      url: "https://evan.xin/feed",
      site: "https://evan.xin/",
      tags: [
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-8e361dea9ece20bf",
      name: "\u5047\u88C5\u770B\u98CE\u666F",
      url: "https://pt2mu.top/atom.xml",
      site: "https://pt2mu.top/",
      tags: [
        "\u751F\u6D3B",
        "\u8BB0\u5F55",
        "\u788E\u788E\u5FF5"
      ]
    },
    {
      id: "blog-492a11da10f97c41",
      name: "\u597D\u597D\u5B66\u4E60\u7684\u90DD",
      url: "https://www.voidking.com/sitemap.xml",
      site: "https://www.voidking.com/",
      tags: [
        "\u6280\u672F",
        "\u7F16\u7A0B",
        "\u4E91\u539F\u751F",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-30822138aa99e099",
      name: "\u55BB\u7075\u7684\u535A\u5BA2",
      url: "https://yvling.cn/rss",
      site: "https://yvling.cn/",
      tags: [
        "\u7F51\u7EDC\u5B89\u5168",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-942caad239dc5b56",
      name: "\u7EB8\u9E7F\u6478\u9C7C\u5904",
      url: "https://blog.zhilu.cyou/atom.xml",
      site: "https://blog.zhilu.cyou/",
      tags: [
        "\u6280\u672F",
        "\u751F\u6D3B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-604ae8ff703c8426",
      name: "\u5D14\u9E4F\u98DE\u7684blog",
      url: "https://cuipengfei.me/atom.xml",
      site: "https://cuipengfei.me/",
      tags: [
        "\u6280\u672F",
        "\u7F16\u7A0B",
        "\u8F6F\u4EF6"
      ]
    },
    {
      id: "blog-207f6e65632bf687",
      name: "\u901A\u7075\u5361\u7247",
      url: "https://www.yuqiqin.me/feed.xml",
      site: "https://www.yuqiqin.me/",
      tags: [
        "\u6559\u7814",
        "\u8BED\u8A00\u5B66\u4E60",
        "\u751F\u6D3B",
        "\u65C5\u6E38"
      ]
    },
    {
      id: "blog-0dcf1686a076c147",
      name: "\u66AE\u51ACZ\u7FA1\u6155\u7684\u535A\u5BA2",
      url: "https://forcheetah.github.io/atom.xml",
      site: "https://forcheetah.github.io/",
      tags: [
        "AI\u7F16\u8BD1",
        "\u8BA1\u7B97\u52A0\u901F"
      ]
    },
    {
      id: "blog-50b55c3f34083fc0",
      name: "Bolaxious \u7684\u5C0F\u7AD9",
      url: "http://bolaxious.fun/rss.xml",
      site: "http://bolaxious.fun/",
      tags: [
        "\u524D\u7AEF\uFF0C\u751F\u6D3B\uFF0C\u6280\u672F\uFF0C\u968F\u7B14"
      ]
    },
    {
      id: "blog-e503883fe8ec3c75",
      name: "Maohang Gao's Blog",
      url: "https://kangaroogao.com/atom.xml",
      site: "https://kangaroogao.com/",
      tags: [
        "\u6E38\u8BB0",
        "\u8BFB\u4E66\u7B14\u8BB0",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-32dd27b06a559d04",
      name: "\u963F\u6396\u5C71\xB7\u535A\u5BA2",
      url: "https://blog.mountaye.com/feed.xml",
      site: "https://blog.mountaye.com/",
      tags: [
        "\u7269\u7406",
        "\u751F\u7269",
        "\u7F16\u7A0B",
        "\u6444\u5F71",
        "\u5386\u53F2"
      ]
    },
    {
      id: "blog-81f1c69c8212063f",
      name: "\u4E8C\u6B6A\u540C\u5B66",
      url: "https://blog.waistu.com/rss.xml",
      site: "https://blog.waistu.com/",
      tags: [
        "\u6570\u7801",
        "\u79D1\u6280",
        "\u751F\u6D3B",
        "\u6559\u7A0B"
      ]
    },
    {
      id: "blog-2f5da050f9a76a6d",
      name: "\u9648\u661F\u5B87\u7684\u4E3B\u9875",
      url: "https://cxy0714.github.io/index.xml",
      site: "https://cxy0714.github.io/",
      tags: [
        "\u7EDF\u8BA1\u5B66",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-6a29cc4a415e3214",
      name: "\u6E05\u7FBD\u98DE\u626C",
      url: "https://blog.liushen.fun/atom.xml",
      site: "https://blog.liushen.fun/",
      tags: [
        "\u6280\u672F",
        "\u751F\u6D3B",
        "\u968F\u7B14",
        "\u8BB0\u5F55"
      ]
    },
    {
      id: "blog-906abc0cdfecff2d",
      name: "Peter267",
      url: "https://peter267.github.io/atom.xml",
      site: "https://peter267.github.io/",
      tags: [
        "\u751F\u6D3B",
        "\u6280\u672F",
        "\u6559\u7A0B",
        "AIGC"
      ]
    },
    {
      id: "blog-5778ffe2b6cca8a0",
      name: "Huan's Blog",
      url: "https://blog.huan99.com/atom.xml",
      site: "https://blog.huan99.com/",
      tags: [
        "\u81EA\u6211\u6210\u957F",
        "\u540E\u7AEF",
        "\u9605\u8BFB",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-c55498f84bc7b562",
      name: "\u6CEB\u8A00",
      url: "https://blog.cugxuan.cn/atom.xml",
      site: "https://blog.cugxuan.cn/",
      tags: [
        "\u751F\u6D3B",
        "\u7F16\u7A0B",
        "\u79D1\u6280",
        "\u8BB0\u5F55"
      ]
    },
    {
      id: "blog-dc39d847274f1452",
      name: "FrWalker's Blog",
      url: "https://blog.frwalker.top/atom.xml",
      site: "https://blog.frwalker.top/",
      tags: [
        "\u5B66\u4E60",
        "\u968F\u7B14",
        "\u7814\u7A76",
        "\u8BB0\u5F55"
      ]
    },
    {
      id: "blog-28fbdcbbeea5a436",
      name: "Sunset \u7684\u91CD\u6784\u535A\u5BA2",
      url: "https://blog.sunmkt.uk/feed.xml",
      site: "https://blog.sunmkt.uk/",
      tags: [
        "\u7F16\u7A0B",
        "\u5F00\u6E90",
        "\u751F\u6D3B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-9f8a6889fc2a7964",
      name: "Flowable\u4E2D\u6587\u535A\u5BA2",
      url: "https://flowable.me/blog/atom.xml",
      site: "https://flowable.me/blog/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F\u5206\u4EAB",
        "\u6559\u7A0B",
        "Flowable"
      ]
    },
    {
      id: "blog-55855f3bb272e675",
      name: "\u987A\u6BDB\u5E08\u4E4B\u5BB6",
      url: "https://www.cvzoo.cn/atom.xml",
      site: "https://www.cvzoo.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u79D1\u7814",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-9484623f6bc89d72",
      name: "Rolenx",
      url: "https://blog.yesord.top/atom.xml",
      site: "https://home.yesord.top/",
      tags: [
        "\u751F\u6D3B",
        "\u601D\u8003",
        "\u8BB0\u5F55"
      ]
    },
    {
      id: "blog-e4300799f5d871d0",
      name: "\u6625\u6C34\u714E\u8336",
      url: "https://writings.sh/feed",
      site: "https://writings.sh/",
      tags: [
        "\u7F16\u7A0B",
        "\u7B97\u6CD5",
        "\u8BB0\u5F55"
      ]
    },
    {
      id: "blog-70bc5e2c0a39d833",
      name: "KEKKJ BLOG",
      url: "https://kekkj123.github.io/RSS_atom.xml",
      site: "https://kekkj123.github.io/",
      tags: [
        "\u751F\u6D3B",
        "\u968F\u7B14",
        "\u6280\u672F",
        "\u5B66\u4E60"
      ]
    },
    {
      id: "blog-a88156fd41fa96c6",
      name: "s22y",
      url: "https://blog.s22y.moe/rss.xml",
      site: "https://blog.s22y.moe/",
      tags: [
        "\u524D\u7AEF",
        "\u7F16\u7A0B",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-39f855bcb1a85d52",
      name: "\u75AF\u5B50\u7684\u5929\u7A7A",
      url: "https://xuexc.cn/api/articles/rss",
      site: "https://xuexc.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u8BB0\u5F55"
      ]
    },
    {
      id: "blog-89a01e53f7f45d80",
      name: "\u522B\u5E74",
      url: "https://fylsen.com/rss.xml",
      site: "https://fylsen.com/",
      tags: [
        "\u751F\u6D3B",
        "\u968F\u7B14",
        "\u8BB0\u5F55"
      ]
    },
    {
      id: "blog-b1eaf646ae3962cb",
      name: "\u51B0\u5C4B",
      url: "https://blog.millya.top/feed",
      site: "https://blog.millya.top/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-f6fc492cc7f50c19",
      name: "\u97E9\u5C0F\u97E9\u535A\u5BA2",
      url: "https://www.vvhan.com/rss.xml",
      site: "https://www.vvhan.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14",
        "\u5206\u4EAB",
        "\u751F\u6D3B",
        "\u524D\u7AEF",
        "\u540E\u7AEF",
        "\u5F00\u6E90",
        "\u7ECF\u9A8C"
      ]
    },
    {
      id: "blog-60284b6a37104807",
      name: "\u8499\u9700",
      url: "https://jiangcl.com/feed",
      site: "https://jiangcl.com/",
      tags: [
        "\u6CD5\u5F8B",
        "\u751F\u6D3B",
        "\u7F16\u7A0B",
        "\u5DE5\u7A0B"
      ]
    },
    {
      id: "blog-436d6f2cda2fbd21",
      name: "\u963F\u6770\u9C81\u7684\u81EA\u7559\u5730",
      url: "https://zaunist.com/rss/feed.xml",
      site: "https://zaunist.com/",
      tags: [
        "\u6280\u672F",
        "\u968F\u7B14",
        "\u8BB0\u5F55",
        "\u7ECF\u9A8C",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-193e31f1cd801d48",
      name: "runzhliu\u7684\u5BB9\u5668\u7B14\u8BB0",
      url: "https://runzhliu.cn/index.xml",
      site: "https://runzhliu.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u8BB0\u5F55"
      ]
    },
    {
      id: "blog-c4865d56754dd4b3",
      name: "Fall's Blog",
      url: "https://fallzhang.top/sitemap.xml",
      site: "https://fallzhang.top/",
      tags: [
        "\u524D\u7AEF",
        "\u8DE8\u7AEF",
        "\u5168\u6808"
      ]
    },
    {
      id: "blog-dc238884b1d6bbb3",
      name: "YOLO",
      url: "https://www.yolo.blue/blog/rss.xml",
      site: "https://www.yolo.blue/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u7B14",
        "\u6E38\u620F",
        "\u751F\u6D3B",
        "\u65C5\u884C"
      ]
    },
    {
      id: "blog-53b582927a7f9eab",
      name: "\u72EC\u5143\u6B87",
      url: "https://www.ccgxk.com/rss.php",
      site: "https://www.ccgxk.com/",
      tags: [
        "\u751F\u6D3B",
        "\u7F16\u7A0B",
        "\u79D1\u6280",
        "\u8BB0\u5F55"
      ]
    },
    {
      id: "blog-e2bb6da5f6e41772",
      name: "HFwas",
      url: "https://www.hfwas.tech/sitemap.xml",
      site: "https://www.hfwas.tech/",
      tags: [
        "\u751F\u6D3B",
        "\u7F16\u7A0B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-958a686b4e3c0982",
      name: "DaBai",
      url: "https://ucds.me/feed",
      site: "https://ucds.me/",
      tags: [
        "\u6280\u672F",
        "\u751F\u6D3B",
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-1a6e74a4f6f8f95e",
      name: "\u4E91\u7AEF\u7684\u89E3\u6784\u8005",
      url: "https://www.zheep.top/atom.xml",
      site: "https://www.zheep.top/",
      tags: [
        "code",
        "\u751F\u6D3B",
        "\u9605\u8BFB",
        "\u6E38\u620F"
      ]
    },
    {
      id: "blog-11a5e7831daceefe",
      name: "GoodBoyboy 's Blog",
      url: "https://blog.goodboyboy.top/atom.xml",
      site: "https://blog.goodboyboy.top/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-7cc226fc8e0aca23",
      name: "Peng's Blog",
      url: "https://pengs.top/atom.xml",
      site: "https://pengs.top/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "linux",
        "\u751F\u6D3B",
        "\u5F00\u6E90",
        "\u6444\u5F71"
      ]
    },
    {
      id: "blog-8732cb4df569133e",
      name: "\u6620\u5C7F",
      url: "https://www.glowisle.me/atom.xml",
      site: "https://www.glowisle.me/",
      tags: [
        "\u6280\u672F",
        "\u968F\u7B14",
        "\u601D\u8003",
        "\u9605\u8BFB"
      ]
    },
    {
      id: "blog-393098b77a4809b5",
      name: "DailyMinz",
      url: "https://dailyminz.org/atom.xml",
      site: "https://dailyminz.org/",
      tags: [
        "\u4EBA\u6587\u793E\u79D1",
        "\u601D\u8003",
        "\u968F\u7B14",
        "\u9605\u8BFB",
        "\u54F2\u5B66"
      ]
    },
    {
      id: "blog-72d25a48ea192829",
      name: "Watermelonabc\u7684Blog",
      url: "https://blog.watermelonabc.top/atom.xml",
      site: "https://blog.watermelonabc.top/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u7B14\u8BB0",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-694625d3aa680241",
      name: "unixetc",
      url: "https://unixetc.com/index.xml",
      site: "https://unixetc.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "linux",
        "\u751F\u6D3B",
        "\u5F00\u6E90"
      ]
    },
    {
      id: "blog-d569850956129d76",
      name: "0xd00's blog",
      url: "https://blog.0xd00.com/rss.xml",
      site: "https://blog.0xd00.com/",
      tags: [
        "\u7F51\u7EDC\u5B89\u5168",
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-31a0dc469a29cc74",
      name: "\u7845\u4E0A\u89C2\u9053\u7684\u4E2A\u4EBA\u535A\u5BA2",
      url: "https://www.changsun.work/atom.xml",
      site: "https://www.changsun.work/",
      tags: [
        "\u6280\u672F",
        "\u5F00\u6E90",
        "\u968F\u7B14",
        "\u8BFB\u4E66\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-92a48d46990381bc",
      name: "Shine\u7684AI\u535A\u5BA2",
      url: "https://blog.fuxieyi.top/rss.xml",
      site: "https://blog.fuxieyi.top/",
      tags: [
        "\u6280\u672F\u5F00\u6E90",
        "\u5927\u6A21\u578B",
        "AI",
        "\u751F\u6D3B",
        "\u968F\u7B14",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-127f9a4ae50b45af",
      name: "NBlog",
      url: "https://nocp.space/rss/feed.json",
      site: "https://blog.nocp.space/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u968F\u7B14",
        "\u97F3\u4E50"
      ]
    },
    {
      id: "blog-5d3f672b9dc6bc41",
      name: "\u6A59\u6811\u5FD7",
      url: "https://citydatum.cn/feed",
      site: "https://citydatum.cn/",
      tags: [
        "\u57CE\u5E02",
        "\u6570\u636E\u5206\u6790",
        "\u6280\u672F",
        "\u89C6\u89C9",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-fe886d4a9923a0c8",
      name: "\u5C60\xB7\u57CE",
      url: "https://www.haomwei.com/atom.xml",
      site: "https://www.haomwei.com/",
      tags: [
        "\u751F\u6D3B",
        "\u968F\u7B14",
        "\u8BB0\u5F55",
        "\u97F3\u4E50"
      ]
    },
    {
      id: "blog-2681d5fc252408db",
      name: "\u53C9\u606F\u7684\u7A7A\u4E2D\u5496\u5561\u9986",
      url: "https://www.xchere.xyz/atom.xml",
      site: "https://www.xchere.xyz/",
      tags: [
        "\u751F\u6D3B",
        "\u968F\u7B14",
        "\u8BB0\u5F55",
        "\u8BFB\u4E66\u7B14\u8BB0",
        "\u4E71\u4E03\u516B\u7CDF"
      ]
    },
    {
      id: "blog-28a0521c3b379b63",
      name: "\u660E\u7ACB\u975E(Mingnify)\u7684\u535A\u5BA2",
      url: "https://mingnify.com/zh/blog/atom.xml",
      site: "https://mingnify.com/zh/blog/",
      tags: [
        "Indie Maker",
        "\u72EC\u7ACB\u5F00\u53D1",
        "AI",
        "\u6253\u9020\u4EA7\u54C1",
        "\u5185\u5BB9\u521B\u4F5C",
        "\u6570\u5B57\u6E38\u6C11"
      ]
    },
    {
      id: "blog-80afb10b9a84b25a",
      name: "Kevin's Blog",
      url: "https://kevintan.pro/sitemap.xml",
      site: "https://kevintan.pro/",
      tags: [
        "\u6280\u672F",
        "\u9006\u5411",
        "\u5927\u5B66",
        "\u751F\u6D3B",
        "\u8BB0\u5F55"
      ]
    },
    {
      id: "blog-5ed13c2f53547971",
      name: "Lamber\u7684\u535A\u5BA2",
      url: "https://lamber-maybe.com/blog/index.xml",
      site: "https://lamber-maybe.com/",
      tags: [
        "\u6280\u672F",
        "\u7F51\u7EDC\u5B89\u5168",
        "\u6210\u957F",
        "\u8BB0\u5F55",
        "BugBounty"
      ]
    },
    {
      id: "blog-365173f818c98c11",
      name: "\u5047\u8BBE\u68C0\u9A8C",
      url: "https://jiashejianyan.com/sitemap.xml",
      site: "https://jiashejianyan.com/",
      tags: [
        "\u751F\u6D3B",
        "\u54C1\u724C",
        "\u6295\u8D44",
        "\u8BB0\u5F55"
      ]
    },
    {
      id: "blog-325bd5d57880b616",
      name: "\u738B\u5706\u5706",
      url: "https://www.iconpik.com/rss/",
      site: "https://www.iconpik.com/",
      tags: [
        "AI",
        "\u7F16\u7A0B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-ed6d6c7430ba8d00",
      name: "\u5E26\u9C7CBlog",
      url: "https://blog.beltfish.cn/feed/",
      site: "https://blog.beltfish.cn/",
      tags: [
        "\u751F\u6D3B",
        "\u65E5\u5E38",
        "\u5BA1\u8BA1",
        "\u8D22\u52A1",
        "\u6570\u7801"
      ]
    },
    {
      id: "blog-929d825dc3461af2",
      name: "\u6DB5\u54F2\u5B50\u5C45",
      url: "https://iluc.cn/rss.xml",
      site: "https://iluc.cn/",
      tags: [
        "\u65E5\u5E38",
        "\u968F\u7B14",
        "\u4E71\u4E03\u516B\u7CDF"
      ]
    },
    {
      id: "blog-d6c6a9eb69e9ccd0",
      name: "SuperGrey\u7684\u7B14\u8BB0\u672C",
      url: "https://supergrey.bearblog.dev/rss/",
      site: "https://supergrey.bearblog.dev/",
      tags: [
        "\u9605\u8BFB\u968F\u7B14",
        "\u52A8\u6F2B\u5F71\u8BC4"
      ]
    },
    {
      id: "blog-fc047f873cc70373",
      name: "\u59D3\u738B\u8005\u7684\u535A\u5BA2",
      url: "https://xingwangzhe.fun/rss.xml",
      site: "https://xingwangzhe.fun/",
      tags: [
        "\u7F16\u7A0B\uFF0C\u968F\u7B14\uFF0C\u5927\u5B66\uFF0C\u751F\u6D3B\uFF0C\u5F00\u6E90"
      ]
    },
    {
      id: "blog-9478c3aef0598306",
      name: "\u4E66\u8FDC\u89C1",
      url: "https://bookvision7.com/feed.xml",
      site: "https://bookvision7.com/",
      tags: [
        "\u7F16\u7A0B\uFF0C\u6280\u672F\uFF0C\u751F\u6D3B\uFF0C\u601D\u8003"
      ]
    },
    {
      id: "blog-be7347e2cdab6d28",
      name: "solaireh3",
      url: "https://Ashlord.com/feed.xml",
      site: "https://Ashlord.com/",
      tags: [
        "\u533B\u5B66\uFF0C\u751F\u6D3B\uFF0C\u968F\u7B14\uFF0C\u539F\u521B"
      ]
    },
    {
      id: "blog-d506e8f3266ede31",
      name: "\u9165\u7C73\u7684\u5C0F\u7AD9",
      url: "https://www.sumi233.top/rss.xml",
      site: "https://www.sumi233.top/",
      tags: [
        "\u751F\u6D3B\uFF0C\u6280\u672F\uFF0C\u7F51\u7EDC\uFF0C\u65E5\u5E38\uFF0C\u968F\u7B14"
      ]
    },
    {
      id: "blog-2161db4e789c11c9",
      name: "\u8B1D\u61FFShine\xA9\u7684AI\u535A\u5BA2",
      url: "https://xieyi.org/rss.xml",
      site: "https://xieyi.org/",
      tags: [
        "\u6280\u672F\u5F00\u6E90",
        "\u5927\u6A21\u578B",
        "AI",
        "\u751F\u6D3B",
        "\u968F\u7B14",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-48465a134cae3ef2",
      name: "Fgaoxing\u7684\u535A\u5BA2",
      url: "https://www.yt-blog.top/atom.xml",
      site: "https://www.yt-blog.top/",
      tags: [
        "\u6280\u672F",
        "\u5F00\u6E90",
        "\u968F\u7B14",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-5a5cd00767d78ffe",
      name: "yCENzh's Blog",
      url: "https://fuwari.oh1.top/rss.xml",
      site: "https://fuwari.oh1.top/",
      tags: [
        "\u6280\u672F",
        "\u968F\u7B14",
        "\u7B14\u8BB0",
        "\u4E71\u4E03\u516B\u7CDF"
      ]
    },
    {
      id: "blog-35d7b31cd5973828",
      name: "\u624B\u91CC\u6709\u53EA\u6BDB\u6BDB\u866B",
      url: "https://www.krjojo.com/feed",
      site: "https://www.krjojo.com/",
      tags: [
        "\u6280\u672F",
        "\u5F00\u6E90",
        "\u968F\u7B14",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-8aab6211c898be87",
      name: "Henry Z's blog",
      url: "https://changchen.me/atom.xml",
      site: "https://changchen.me/",
      tags: [
        "\u6280\u672F",
        "Python",
        "SRE",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-1e9b57d2030f9f35",
      name: "fenglielie",
      url: "https://fenglielie.top/atom.xml",
      site: "https://fenglielie.top/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-bde8fa324603b67e",
      name: "ICDYCT\u6211\u80FD\u4F60\u4E5F\u884C",
      url: "https://zelikk.blogspot.com/rss.xml",
      site: "https://zelikk.blogspot.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u968F\u60F3",
        "DIY"
      ]
    },
    {
      id: "blog-88f01c5b02c2bf09",
      name: "\u5C0F\u6DB5Naiwenel",
      url: "https://www.naiwenel.com/rss.xml",
      site: "https://www.naiwenel.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u65E5\u5E38",
        "\u72EC\u7ACB\u6E38\u620F",
        "\u72EC\u7ACB\u5F00\u53D1",
        "\u5F00\u6E90",
        "\u5B66\u4E60",
        "\u4E8C\u6B21\u5143"
      ]
    },
    {
      id: "blog-c67e74e0ee2a891b",
      name: "\u7E41\u661F\u70B9\u70B9",
      url: "https://blog.52013120.xyz/rss.xml",
      site: "https://blog.52013120.xyz/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u539F\u521B",
        "\u7F51\u7EDC",
        "\u6559\u7A0B"
      ]
    },
    {
      id: "blog-5e0b799929db84ff",
      name: "Under the Sun with Paddy",
      url: "https://www.paddysun.top/feed",
      site: "https://www.paddysun.top/",
      tags: [
        "\u7B97\u6CD5",
        "\u751F\u6D3B",
        "\u5DE5\u4F5C",
        "\u60C5\u611F",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-35c176318a5de3d3",
      name: "ArgoVICT's blog",
      url: "https://argovict.asia/blog/rss/rss.xml",
      site: "https://argovict.asia/",
      tags: [
        "\u5D4C\u5165\u5F0F",
        "\u4E1A\u4F59\u65E0\u7EBF\u7535",
        "\u7F16\u7A0B",
        "\u5DE5\u7A0B",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-1977eb190ed70fce",
      name: "Honesty",
      url: "https://blog.hehouhui.cn/rss/feed.xml",
      site: "https://blog.hehouhui.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u65E5\u5E38",
        "\u7EAA\u5F55",
        "AI"
      ]
    },
    {
      id: "blog-d9c473daa3b4d341",
      name: "\u58A8\u5BD2\u8F69",
      url: "http://hankmo.com/index.xml",
      site: "https://hankmo.com/",
      tags: [
        "\u6F5C\u5FC3\u7814\u6280\u672F\uFF0C\u79EF\u6781\u54C1\u4EBA\u751F"
      ]
    },
    {
      id: "blog-1352ff1225be4ffd",
      name: "\u9B3C\u5F71\u7684\u57FA\u5730 - \u9B3C\u5F71233",
      url: "https://gui-ying233.github.io/Nest/src/atom.xml",
      site: "https://gui-ying233.github.io/Nest/",
      tags: [
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-f4a9375efd376b63",
      name: "zhecydn\u7684\u535A\u5BA2\u7AD9",
      url: "https://blog.zhecydn.asia/feed/",
      site: "https://blog.zhecydn.asia/",
      tags: [
        "\u751F\u6D3B",
        "\u968F\u7B14",
        "\u6280\u672F",
        "\u5206\u4EAB",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-ad3b783c297f9403",
      name: "\u6556\u82DB\u8BB0",
      url: "https://blog.kayro.cn/atom.xml",
      site: "https://blog.kayro.cn/",
      tags: [
        "\u751F\u6D3B",
        "\u6280\u672F",
        "\u7F16\u7A0B",
        "\u5F00\u6E90",
        "\u8BB0\u5F55"
      ]
    },
    {
      id: "blog-a2dd60828db8415a",
      name: "HaydenBi",
      url: "https://haydenbi.com/feed.xml",
      site: "https://haydenbi.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u51FA\u6D77",
        "\u751F\u6D3B",
        "\u5206\u4EAB",
        "\u5DE5\u4F5C"
      ]
    },
    {
      id: "blog-6fd90eb2b3450d0f",
      name: "\u81F4\u4EE5\u65E0\u7455\u4E4B\u4EBA",
      url: "https://blog.elykia.cn/atom.xml",
      site: "https://blog.elykia.cn/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-6454ffa8c3f59648",
      name: "\u95EA\u7535\u7684\u81EA\u7559\u5730",
      url: "https://blog.lyujp.com/sitemap.xml",
      site: "https://blog.lyujp.com/",
      tags: [
        "\u751F\u6D3B",
        "\u5206\u4EAB"
      ]
    },
    {
      id: "blog-e7f1ccdd329f91d3",
      name: "S T C H E N G",
      url: "https://cheng.st/atom.xml",
      site: "https://cheng.st/",
      tags: [
        "\u968F\u7B14",
        "\u65C5\u884C",
        "\u6444\u5F71",
        "\u8FD0\u52A8",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-8d21015af3b79fb9",
      name: "Luenci\u7684\u6280\u672F\u535A\u5BA2",
      url: "https://luenci.com/en/index.xml",
      site: "https://luenci.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u968F\u7B14",
        "\u7B14\u8BB0"
      ]
    },
    {
      id: "blog-7ab8f6321b994b14",
      name: "GISerLab \u5730\u7406\u7A7A\u95F4",
      url: "https://blog.giserlab.cn/feed.xml",
      site: "https://blog.giserlab.cn/",
      tags: [
        "GIS",
        "\u6280\u672F",
        "\u5730\u4FE1",
        "\u5730\u56FE",
        "\u5DE5\u5177",
        "\u51B3\u89E3\u65B9\u6848",
        "Cesium"
      ]
    },
    {
      id: "blog-a355384e2f096376",
      name: "Rokcso's Blog",
      url: "https://rokcso.com/index.xml",
      site: "https://rokcso.com/",
      tags: [
        "\u751F\u6D3B",
        "\u6280\u672F",
        "\u597D\u5947\u5FC3",
        "\u4EA7\u54C1\u7BA1\u7406",
        "\u7F16\u7A0B",
        "AI",
        "\u72EC\u7ACB\u5F00\u53D1"
      ]
    },
    {
      id: "blog-5633e3dd1a239a71",
      name: "\u5C0F\u9676\u6301\u7EED\u7CBE\u8FDB",
      url: "https://whyya.xyz/rss.xml",
      site: "https://whyya.xyz/",
      tags: [
        "\u751F\u6D3B",
        "\u751F\u4EA7\u529B\u5DE5\u5177",
        "\u6548\u7387",
        "\u77E5\u8BC6\u7BA1\u7406"
      ]
    },
    {
      id: "blog-59c588d68d7bcc67",
      name: "UWillno's Blog",
      url: "https://uwillno.com/rss.xml",
      site: "https://uwillno.com/",
      tags: [
        "Qt",
        "WASM",
        "\u6280\u672F",
        "\u8BB0\u5F55"
      ]
    },
    {
      id: "blog-255d7d15c5ddc1aa",
      name: "ventuss",
      url: "https://ventuss.xyz/rss/zh.xml",
      site: "https://ventuss.xyz/",
      tags: [
        "\u601D\u8003",
        "\u5199\u4F5C"
      ]
    },
    {
      id: "blog-ac0ef534e9c919eb",
      name: "\u50B2\u96EA\u306E",
      url: "https://www.oxue.de/rss.xml",
      site: "https://www.oxue.de/",
      tags: [
        "\u6280\u672F",
        "\u5199\u4F5C",
        "\u751F\u6D3B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-3fcef7355352f1b0",
      name: "\u963F\u5C14\u7684\u4EE3\u7801\u5C4B",
      url: "https://blog.algieba12.cn/atom.xml",
      site: "https://blog.algieba12.cn/",
      tags: [
        "\u968F\u7B14",
        "AI",
        "\u6E38\u620F\u5F00\u53D1",
        "C++",
        "Python",
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-ffa2a65c3d9144b8",
      name: "wklken",
      url: "https://wklken.me/posts/index.xml",
      site: "https://wklken.me/",
      tags: [
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-975b7b131234580b",
      name: "\u732B\u6D85\u7684\u6280\u672F\u535A\u5BA2",
      url: "https://www.maonie.top/atom.xml",
      site: "https://www.maonie.top/",
      tags: [
        "\u6280\u672F",
        "\u4FE1\u606F\u5B89\u5168",
        "\u968F\u7B14",
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-632adab04d993cc1",
      name: "Yourlai's Blog",
      url: "https://yourlai.com/feed/",
      site: "https://yourlai.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u5D4C\u5165\u5F0F",
        "\u6280\u672F",
        "\u6444\u5F71"
      ]
    },
    {
      id: "blog-b19bdcf0c5520493",
      name: "Jake Blog",
      url: "https://jaketao.com/feed/",
      site: "https://jaketao.com/blog",
      tags: [
        "\u7845\u8C37\u79D1\u6280",
        "\u4E3B\u673A\u6E38\u620F",
        "\u7559\u5B66\u65C5\u5C45",
        "\u8DE8\u5883\u7535\u5546"
      ]
    },
    {
      id: "blog-8493b38312725c73",
      name: "ABB00717's Blog",
      url: "https://blog.abb00717.com/index.xml",
      site: "https://blog.abb00717.com/",
      tags: [
        "\u8CC7\u8A0A\u5B89\u5168",
        "\u7A0B\u5F0F\u8A2D\u8A08",
        "\u6280\u8853",
        "\u5BEB\u4F5C",
        "\u97F3\u6A02"
      ]
    },
    {
      id: "blog-e174af50c2c650d4",
      name: "\u8CC7\u5DE5\u5C0F\u5EE2\u7269 - JN",
      url: "https://blog.giveanornot.com/index.xml",
      site: "https://blog.giveanornot.com/",
      tags: [
        "\u4F86\u81EA\u53F0\u7063",
        "\u751F\u6D3B\u53CD\u601D",
        "\u793E\u7FA4\u5A92\u9AD4\u8CA0\u9762\u5F71\u97FF",
        "\u958B\u6E90\u8EDF\u9AD4"
      ]
    },
    {
      id: "blog-1b3f8e0b2d9ccf4d",
      name: "\u5218\u679C\u7684\u5C0F\u7AD9",
      url: "https://liu-guo.com/feed.xml",
      site: "https://liu-guo.com/",
      tags: [
        "\u6587\u5B57\u3001\u97F3\u4E50\u4E0E\u4EA4\u4E92\u5B9E\u9A8C"
      ]
    },
    {
      id: "blog-15a5d205ab9d66dc",
      name: "\u4E94\u6708\u4E03\u65E5\u7684\u601D\u8003\u672D\u8BB0",
      url: "https://fivsevn.com/rss",
      site: "https://fivsevn.com/",
      tags: [
        "\u4E2A\u4EBA\u6570\u5B57\u82B1\u56ED"
      ]
    },
    {
      id: "blog-28f7651b6c45720d",
      name: "49th LunaSea",
      url: "https://maki49.github.io/feed.xml",
      site: "https://maki49.github.io/",
      tags: [
        "\u52A8\u6F2B\u6E38\u620F",
        "\u751F\u6D3B\u968F\u7B14",
        "\u79D1\u7814",
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-785ed136e9903682",
      name: "\u8B80\u89D2\u7378 \u2014 \u82F1\u6587\u4F86\u6E90\u7684\u77DB\u76FE\u6524\u958B\u8B93\u4F60\u81EA\u5DF1\u5224\u65B7",
      url: "https://ducorn.com/feed.xml",
      site: "https://ducorn.com/",
      tags: [
        "\u6295\u8CC7",
        "\u5065\u5EB7",
        "\u5224\u65B7"
      ]
    },
    {
      id: "blog-9bb83c5fce2af2cf",
      name: "CSS\u68EE\u6797",
      url: "https://www.cssforest.org/feed/",
      site: "https://www.cssforest.org/",
      tags: [
        "\u751F\u6D3B\u968F\u7B14",
        "\u4EA4\u4E92\u4F53\u9A8C",
        "\u524D\u7AEF",
        "\u5B66\u4E60\u601D\u8003"
      ]
    },
    {
      id: "blog-4dbc5f607ba6fc70",
      name: "fengc's Blog",
      url: "https://rssweball.top/feed/afaf2a3c-e11a-4783-a358-9e2d20d76a69.xml",
      site: "https://fengcblog.880200.xyz/",
      tags: [
        "\u6444\u5F71\u4E60\u4F5C",
        "\u6444\u5F71\u95F2\u626F",
        "\u76F8\u5173\u6D4B\u8BD5",
        "AI\u89C6\u9891"
      ]
    },
    {
      id: "blog-53e675e543a5fc82",
      name: "for_the_zero\u7684\u5C0F\u7AD9",
      url: "https://ftz.is-a.dev/rss.xml",
      site: "https://ftz.is-a.dev/",
      tags: [
        "\u7F16\u7A0B",
        "\u524D\u7AEF",
        "\u8F6F\u4EF6\u5F00\u53D1",
        "\u601D\u8003",
        "\u968F\u7B14",
        "AI",
        "Web\u5F00\u53D1"
      ]
    },
    {
      id: "blog-64d84211648934fb",
      name: "\u5ECA\u6865\u9057\u68A6",
      url: "https://blog.moran.im/rss.xml",
      site: "https://blog.moran.im/",
      tags: [
        "\u968F\u7B14",
        "\u751F\u6D3B",
        "\u6559\u7A0B"
      ]
    },
    {
      id: "blog-d755bc724b5af93f",
      name: "\u67AB\u6797\u706F\u8BED",
      url: "https://blog.mfwt.top/index.php/feed/",
      site: "https://blog.mfwt.top/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u6280\u672F",
        "\u65E0\u7EBF\u7535",
        "\u7F51\u7EDC"
      ]
    },
    {
      id: "blog-8bb8b2b5aa466934",
      name: "Neil\u7684\u81EA\u7559\u5730",
      url: "https://neilmin.com/zh/posts/index.xml",
      site: "https://neilmin.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u7B14\u8BB0",
        "\u968F\u60F3"
      ]
    },
    {
      id: "blog-d26b7e63ffb2b4ed",
      name: "\u5BD2\u591C\u96E8",
      url: "https://www.coderlock.site/index.php/feed/",
      site: "https://www.coderlock.site/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "AI",
        "\u968F\u60F3"
      ]
    },
    {
      id: "blog-945af708f34d7d2b",
      name: "\u50A5\u5E08\u59B9TangShiMei\u7684\u5C0F\u7A7A\u95F4",
      url: "https://blog.224418.xyz/rss2.xml",
      site: "https://blog.224418.xyz/",
      tags: [
        "\u6280\u672F",
        "\u751F\u6D3B",
        "\u968F\u7B14",
        "\u6298\u817E"
      ]
    },
    {
      id: "blog-1be0d0eebcfedec7",
      name: "QingCCL",
      url: "https://qingccl.github.io/rss.xml",
      site: "https://qingccl.github.io/",
      tags: [
        "\u6587\u5B66",
        "\u8BFB\u4E66",
        "\u968F\u7B14",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-880c351ebb22015b",
      name: "\u8B1D\u61FFShine",
      url: "https://www.futseyi.com/rss.xml",
      site: "https://www.futseyi.com/",
      tags: [
        "AI",
        "\u8BFB\u535A\u79D1\u7814",
        "\u968F\u7B14",
        "\u6280\u672F",
        "\u6559\u7A0B"
      ]
    },
    {
      id: "blog-a793def00859ab23",
      name: "\u6240\u8C13\u7A7A\u60F3",
      url: "https://www.alxh.page/feed.rss",
      site: "https://alxh.page/",
      tags: [
        "\u6587\u5B66",
        "\u97F3\u4E50",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-aa86c8fa1c6708ea",
      name: "\u7FD4\u5B87\u5DE5\u4F5C\u6D41",
      url: "https://xiangyugongzuoliu.com/latest/rss/",
      site: "https://xiangyugongzuoliu.com/",
      tags: [
        "AI",
        "\u7F16\u7A0B",
        "\u81EA\u52A8\u5316",
        "Claude Code",
        "\u6559\u7A0B"
      ]
    },
    {
      id: "blog-234887a2897bc7d0",
      name: "\u521D\u7136\u5FC6",
      url: "https://www.imcry.vip/index.xml",
      site: "https://www.imcry.vip/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u8BB0\u5F55"
      ]
    },
    {
      id: "blog-183876508856d545",
      name: "\u5218\u90CE\u9601",
      url: "https://vjo.cc/feed/",
      site: "https://vjo.cc/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u8BB0\u5F55",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-b568c5170dfc342e",
      name: "Im Patrick",
      url: "https://impatrick.blog/feed/",
      site: "https://impatrick.blog/",
      tags: [
        "\u7E41\u4E2D",
        "\u651D\u5F71",
        "\u751F\u6D3B",
        "\u8A18\u9304"
      ]
    },
    {
      id: "blog-720ebfedd6c9e207",
      name: "cocolia\u5C0F\u7A9D",
      url: "https://cocolia.fun/feed.xml",
      site: "https://cocolia.fun/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u6444\u5F71",
        "AI"
      ]
    },
    {
      id: "blog-995ee2666dd305ce",
      name: "Dax",
      url: "https://daolanx.me/zh/rss.xml",
      site: "https://daolanx.me/zh/",
      tags: [
        "\u7F16\u7A0B",
        "\u5168\u6808",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-7a1796c45455a541",
      name: "Haku",
      url: "https://re.karlbaey.top/rss.xml",
      site: "https://re.karlbaey.top/",
      tags: [
        "\u6280\u672F",
        "\u751F\u6D3B",
        "\u7F16\u7A0B",
        "\u6587\u5B66",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-9b534cde8a12a1df",
      name: "Amiya\u7684\u4E66\u684C",
      url: "https://blog.sayori.org/rss.xml",
      site: "https://blog.sayori.org/",
      tags: [
        "\u65E5\u8BB0",
        "\u8D44\u6E90",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-9c885b4ea11b1f50",
      name: "\u661F\u89C5\u6D77\u7684\u535A\u5BA2",
      url: "https://www.xmhai.cn/rss.xml",
      site: "https://www.xmhai.cn/",
      tags: [
        "\u6280\u672F",
        "\u751F\u6D3B",
        "\u8D44\u6E90"
      ]
    },
    {
      id: "blog-00895a433c62f69b",
      name: "Oleg's Tech Blog",
      url: "https://timoshinoleg-eng.github.io/blog/feed.xml",
      site: "https://timoshinoleg-eng.github.io/blog/",
      tags: [
        "Python",
        "Telegram",
        "AI",
        "Bot"
      ]
    },
    {
      id: "blog-85480ab02defd463",
      name: "MoeBlog",
      url: "https://1loli.link/feed/",
      site: "https://1loli.link/",
      tags: [
        "\u6280\u672F",
        "AI",
        "\u7F16\u7A0B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-40a00054fc8f72d3",
      name: "AI\u5B66\u4E60\u65E5\u8BB0",
      url: "https://livk30.github.io/rss.xml",
      site: "https://livk30.github.io/",
      tags: [
        "AI",
        "\u673A\u5668\u5B66\u4E60",
        "\u6DF1\u5EA6\u5B66\u4E60"
      ]
    },
    {
      id: "blog-76354eeeea30da83",
      name: "\u51B0\u51BB\u5927\u897F\u74DC\u7684\u535A\u5BA2",
      url: "https://bddxg.top/feed.rss",
      site: "https://bddxg.top/",
      tags: [
        "\u524D\u7AEF",
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "AI"
      ]
    },
    {
      id: "blog-62f29089e6a12656",
      name: "\u6BDB\u82F1\u9F99\u7684\u6570\u5B57\u82B1\u56ED",
      url: "https://blog.rnm.gv.uy/atom.xml",
      site: "https://blog.rnm.gv.uy/",
      tags: [
        "\u7F16\u7A0B",
        "\u5F00\u6E90",
        "\u524D\u7AEF",
        "\u6298\u817E",
        "\u6570\u5B57\u751F\u6D3B",
        "agent",
        "openclaw",
        "Hermes"
      ]
    },
    {
      id: "blog-e48ba14180f4a41a",
      name: "BotForge Notes",
      url: "https://blog.notlove.me/feed.xml",
      site: "https://blog.notlove.me/",
      tags: [
        "AI",
        "Telegram",
        "Bot",
        "\u7F16\u7A0B",
        "\u81EA\u52A8\u5316"
      ]
    },
    {
      id: "blog-07e5d58fbe5ad069",
      name: "keggin's blog",
      url: "https://keggin.tech/rss.xml",
      site: "https://keggin.tech/",
      tags: [
        "\u7F16\u7A0B",
        "Linux",
        "\u6570\u6A21",
        "\u9006\u5411"
      ]
    },
    {
      id: "blog-a39dee7cbc520239",
      name: "BWYLBT Blog",
      url: "https://blog.sxizhuo.cn/rss/feed.xml",
      site: "https://blog.sxizhuo.cn/",
      tags: [
        "\u7F16\u7A0B",
        "AI",
        "\u968F\u7B14",
        "\u6280\u672F"
      ]
    },
    {
      id: "blog-330ec66b178e45be",
      name: "My Mods",
      url: "https://dayzmod.kdns.fr/rss.xml",
      site: "https://dayzmod.kdns.fr/",
      tags: [
        "\u7F16\u7A0B",
        "\u6A21\u7EC4",
        "\u6E38\u620F"
      ]
    },
    {
      id: "blog-758d7e929f816768",
      name: "LX blog",
      url: "https://blog.liua.us.ci/rss.xml",
      site: "https://blog.liua.us.ci/",
      tags: [
        "\u7F16\u7A0B",
        "AI",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-297214c4189e5b1d",
      name: "\u7801\u5F55\u96C6\uFF08CoderLog\uFF09",
      url: "https://www.coderlog.net/rss.xml",
      site: "https://www.coderlog.net/",
      tags: [
        "\u7F16\u7A0B",
        "AI",
        "C#",
        ".NET",
        "\u5168\u6808"
      ]
    },
    {
      id: "blog-019bb7ff8ec1db35",
      name: "Abyss\u7684\u5C0F\u5C4B",
      url: "https://www.rsnocsi.cn/feed",
      site: "https://www.rsnocsi.cn/",
      tags: [
        "AI",
        "\u6280\u672F",
        "\u751F\u6D3B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-cb01583341a78fd1",
      name: "wmhwiki",
      url: "https://wmhwiki.cn/rss.xml",
      site: "https://wmhwiki.cn/",
      tags: [
        "\u6280\u672F",
        "\u751F\u6D3B"
      ]
    },
    {
      id: "blog-b7a433656e06c665",
      name: "Victor42",
      url: "https://victor42.eth.limo/index.xml",
      site: "https://victor42.eth.limo/",
      tags: [
        "\u79D1\u5B66",
        "\u6570\u636E\u5206\u6790",
        "\u8BBE\u8BA1",
        "\u6E38\u8BB0",
        "\u5F00\u53D1\u8005"
      ]
    },
    {
      id: "blog-2044190e91b292dd",
      name: "\u521B\u89C1\u601D\u8003",
      url: "https://www.fengcan.net/feed/",
      site: "https://www.fengcan.net/",
      tags: [
        "AI",
        "\u8BFB\u4E66",
        "\u533B\u7597",
        "\u4EBA\u751F\u51B3\u7B56"
      ]
    },
    {
      id: "blog-1491b066e2acd0b5",
      name: "\u6768\u8F69\u7684\u535A\u5BA2:AI\xD7\u6295\u8D44\u5B9E\u76D8\u8BB0\u5F55",
      url: "https://yangxuan.ai/feed/",
      site: "https://yangxuan.ai/",
      tags: [
        "AI",
        "\u6295\u8D44",
        "\u91CF\u5316"
      ]
    },
    {
      id: "blog-4d8b78f41ff9f2e8",
      name: "RYANUO\u7684\u535A\u5BA2",
      url: "https://ryanuo.cc/sitemap.xml",
      site: "https://ryanuo.cc/",
      tags: [
        "\u7F16\u7A0B",
        "\u5D4C\u5165\u5F0F",
        "\u524D\u7AEF",
        "AI",
        "\u5F00\u6E90"
      ]
    },
    {
      id: "blog-795e3153b39dbc19",
      name: "MOMB\u95F2\u8C08",
      url: "https://www.momb.top/rss/feed.xml",
      site: "https://www.momb.top/",
      tags: [
        "\u70ED\u70B9",
        "\u968F\u7B14",
        "\u77E5\u8BC6",
        "\u6E38\u620F"
      ]
    },
    {
      id: "blog-bb3444c05fe9f65b",
      name: "\u80E1\u4E1C\u4E1C\u535A\u5BA2",
      url: "https://blog.hudd.cn/feed/",
      site: "https://blog.hudd.cn/",
      tags: [
        "\u524D\u7AEF",
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "AI"
      ]
    },
    {
      id: "blog-fea37358cbc4f384",
      name: "\u733F\u5BA2\u968F\u7B14",
      url: "https://monkeyke.com/index.xml",
      site: "https://monkeyke.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-f00e541a644bc1d9",
      name: "\u6208\u58C1\u6709\u8033",
      url: "https://www.zhanggeer.net/feed/",
      site: "https://www.zhanggeer.net/",
      tags: [
        "\u751F\u6D3B",
        "\u968F\u7B14",
        "\u6444\u5F71",
        "\u97F3\u4E50"
      ]
    },
    {
      id: "blog-218f8d6dbaeac4ae",
      name: "Arthur's Review",
      url: "https://blog.leesaitool.com/feed.xml",
      site: "https://blog.leesaitool.com/",
      tags: [
        "AI",
        "\u793E\u4F1A",
        "\u54F2\u5B66",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-16edf0976ca5b769",
      name: "\u6885\u4E4B\u590F",
      url: "https://blog.mcenahle.page/feed.xml",
      site: "https://blog.mcenahle.page/",
      tags: [
        "\u968F\u7B14",
        "\u8BB0\u5F55",
        "\u6210\u957F",
        "\u5B66\u4E60",
        "\u533B\u7597"
      ]
    },
    {
      id: "blog-0b7b2f4bafe67a14",
      name: "Suk\u306EBlog",
      url: "https://imsuk.cn/feed/",
      site: "https://imsuk.cn/",
      tags: [
        "\u524D\u7AEF",
        "\u7F16\u7A0B",
        "\u6280\u672F",
        "AI"
      ]
    },
    {
      id: "blog-8216516218f62d25",
      name: "Fei's Tours and Tales",
      url: "https://www.feifun.cn/feed.xml",
      site: "https://www.feifun.cn/",
      tags: [
        "\u65C5\u884C",
        "\u590D\u53E4\u8BA1\u7B97\u8BBE\u5907",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-c32d6e52db57c758",
      name: "LiaoKe\u7684\u535A\u5BA2",
      url: "https://blog.liao-ke.com/rss.xml",
      site: "https://blog.liao-ke.com/",
      tags: [
        "\u7F16\u7A0B",
        "\u5F00\u6E90",
        "\u5168\u6808",
        "\u5F00\u53D1\u8005"
      ]
    },
    {
      id: "blog-16ca6917947c2f04",
      name: "Dort \u7684\u535A\u5BA2",
      url: "https://blog.dort.me/rss.xml",
      site: "https://blog.dort.me/",
      tags: [
        "\u968F\u7B14",
        "\u751F\u6D3B",
        "\u8BB0\u5F55"
      ]
    },
    {
      id: "blog-ff6e874b296c734f",
      name: "\u637B\u58A8\u8FD0\u8425\u7B14\u8BB0",
      url: "https://dyy.nianmo.top/rss.xml",
      site: "https://dyy.nianmo.top/",
      tags: [
        "\u8FD0\u8425",
        "\u81EA\u5A92\u4F53",
        "\u5C0F\u7EA2\u4E66",
        "\u521B\u4E1A"
      ]
    },
    {
      id: "blog-6c6e727209fbec7d",
      name: "67\u7684\u535A\u5BA2",
      url: "https://www.liuqi.cc/rss/feed.xml",
      site: "https://www.liuqi.cc/",
      tags: [
        "\u7F16\u7A0B",
        "\u751F\u6D3B",
        "\u8BB0\u5F55",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-95bb91070385bccb",
      name: "DataShare \u6570\u636E\u4EBA\u963F\u591A",
      url: "https://datashare-duo.github.io/datashare-blog/rss.xml",
      site: "https://datashare-duo.github.io/datashare-blog/",
      tags: [
        "\u7F16\u7A0B",
        "\u6570\u636E",
        "\u968F\u7B14",
        "\u6280\u672F",
        "AI",
        "\u673A\u5668\u5B66\u4E60"
      ]
    },
    {
      id: "blog-352c9ad39dedea32",
      name: "\u70ED\u8877\u4E8E\u7684\u535A\u5BA2",
      url: "https://zooyoo.top/feed/",
      site: "https://zooyoo.top/",
      tags: [
        "\u751F\u6D3B",
        "\u6280\u672F",
        "\u968F\u7B14",
        "\u89C2\u5BDF"
      ]
    },
    {
      id: "blog-7e105df8e0969fc7",
      name: "\u697C\u8239INKFLAKE",
      url: "https://fravilion.top/index.php/feed/",
      site: "https://fravilion.top/",
      tags: [
        "\u968F\u7B14",
        "\u751F\u6D3B",
        "\u65C5\u884C",
        "\u6444\u5F71",
        "\u6570\u7801"
      ]
    },
    {
      id: "blog-8467ddb3da52abc3",
      name: "\u4E09\u53F6\u7684\u535A\u5BA2",
      url: "https://blog.cloverta.top/rss.xml",
      site: "https://blog.cloverta.top/",
      tags: [
        "\u968F\u7B14",
        "\u751F\u6D3B",
        "\u6280\u672F",
        "\u7F16\u7A0B"
      ]
    },
    {
      id: "blog-81a830d73ca38885",
      name: "\u674E\u4E0D\u8A00\u7684\u535A\u5BA2",
      url: "https://libuyan.top/rss.xml",
      site: "https://libuyan.top/",
      tags: [
        "\u6280\u672F",
        "\u601D\u8003",
        "\u91CF\u5316",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-86d71333b0b222ef",
      name: "\u4EF2\u5E73 \xB7 \u6587\u8F91",
      url: "https://blog.zopiya.com/rss.xml",
      site: "https://blog.zopiya.com/",
      tags: [
        "\u751F\u6D3B",
        "\u5F00\u53D1",
        "\u65C5\u884C",
        "\u6444\u5F71",
        "\u5206\u4EAB"
      ]
    },
    {
      id: "blog-997d9c82a6ff8695",
      name: "Moyuin's Blog",
      url: "https://moyuin.top/rss.xml",
      site: "https://moyuin.top/",
      tags: [
        "\u751F\u6D3B",
        "\u6280\u672F",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-c9c32ec12e4e9b78",
      name: "ChangYo's Blog",
      url: "https://changyo.pages.dev/index.xml",
      site: "https://changyo.pages.dev/",
      tags: [
        "\u6280\u672F\uFF0C\u968F\u7B14\uFF0C\u9605\u8BFB\uFF0C\u8BBE\u8BA1"
      ]
    },
    {
      id: "blog-61f48a869f9a14ad",
      name: "XBSTACK",
      url: "https://www.xbstack.com/rss.xml",
      site: "https://www.xbstack.com/",
      tags: [
        "\u6280\u672F",
        "\u7F16\u7A0B",
        "AI",
        "\u4EA7\u54C1",
        "\u6295\u8D44",
        "\u968F\u7B14"
      ]
    },
    {
      id: "blog-69b330627ab25c4d",
      name: "Sanmussh Blog",
      url: "https://blog.movcloud.xyz/rss.xml",
      site: "https://blog.movcloud.xyz/",
      tags: [
        "\u6280\u672F",
        "AI",
        "\u77E5\u8BC6",
        "\u968F\u7B14"
      ]
    }
  ]
};

// src/data/podcast-feeds.json
var podcast_feeds_default = {
  source: "https://github.com/joeseesun/qiaomu-ai-rss/blob/main/src/data/tidings.json",
  items: [
    {
      name: "30 for 30 Podcasts",
      url: "https://feeds.megaphone.fm/ESP5765452710",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "en"
    },
    {
      name: "42\u7AE0\u7ECF \u2014 Podcast",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/648b0b641c48983391a63f98",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "AI\u70BC\u91D1\u672F \u2014 Podcast",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/63e9ef4de99bdef7d39944c8",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "Darknet Diaries",
      url: "https://feeds.megaphone.fm/darknetdiaries",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "en"
    },
    {
      name: "Discovery",
      url: "https://podcasts.files.bbci.co.uk/p002w557.rss",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "en"
    },
    {
      name: "Fragmented - AI Developer Podcast",
      url: "https://feeds.simplecast.com/LpAGSLnY",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "en"
    },
    {
      name: "Gastropod",
      url: "https://www.omnycontent.com/d/playlist/aaea4e69-af51-495e-afc9-a9760146922b/2a195077-f014-41d2-8313-ab190186b4c2/277bcd5c-0a05-4c14-8ba6-ab190186b4d5/podcast.rss",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "en"
    },
    {
      name: "Hacking Humans",
      url: "https://feeds.megaphone.fm/hacking-humans",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "en"
    },
    {
      name: "Hanselminutes with Scott Hanselman",
      url: "https://feeds.simplecast.com/gvtxUiIf",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "en"
    },
    {
      name: "Invest Like the Best with Patrick O'Shaughnessy",
      url: "https://investlikethebest.libsyn.com/rss",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "en"
    },
    {
      name: "Invisibilia",
      url: "https://feeds.npr.org/510307/podcast.xml",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "en"
    },
    {
      name: "Planet Money",
      url: "https://feeds.npr.org/510289/podcast.xml",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "en"
    },
    {
      name: "Reply All",
      url: "https://feeds.megaphone.fm/replyall",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "en"
    },
    {
      name: "The Cynical Developer",
      url: "https://cynicaldeveloper.com/feed/podcast",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "en"
    },
    {
      name: "The Startup Junkies Podcast",
      url: "https://startupjunkie.libsyn.com/rss",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "en"
    },
    {
      name: "The Vergecast",
      url: "https://feeds.megaphone.fm/vergecast",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "en"
    },
    {
      name: "Throughline",
      url: "https://feeds.npr.org/510333/podcast.xml",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "en"
    },
    {
      name: "TIANYU2FM \u2014 \u5BF9\u8C08\u672A\u77E5\u9886\u57DF",
      url: "https://rsshub.xiaowuaiblog.com/xiaoyuzhou/podcast/5f22729f9504bbdb77253e46",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "What's Next\uFF5C\u79D1\u6280\u65E9\u77E5\u9053",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/5e74b52c418a84a046ecaceb",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u4E00\u5E2D",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/5e285326418a84a04627343f",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u4E09\u4E94\u73AF",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/5e280fab418a84a0461faa3c",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u4E0D\u5408\u65F6\u5B9C",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/5e280fb8418a84a0461fd076",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u4E1C\u4E9A\u89C2\u5BDF\u5C40",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/5e9a4e25418a84a046bc6156",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u4E1C\u8154\u897F\u8C03",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/5f72b66083c34e85dd14fde9",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u4E71\u7FFB\u4E66",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/61358d971c5d56efe5bcb5d2",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u4EBA\u6C11\u516C\u56ED\u8BF4AI",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/65257ff6e8ce9deaf70a65e9",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u4FDD\u6301\u504F\u89C1",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/663e3c95af1e22bb157dcee3",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u4FE1\u53F7\u4E0E\u566A\u58F0",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/6819d5a7e37664602a344e0e",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u51F9\u51F8\u7535\u6CE2",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/5e2839ca418a84a0462431b7",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u5341\u5B57\u8DEF\u53E3Crossing \u2014 Podcast",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/60502e253c92d4f62c2a9577",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u534A\u62FF\u94C1 | \u5546\u4E1A\u6C89\u6D6E\u5F55",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/62382c1103bea1ebfffa1c00",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u536B\u8BD7\u5A55\uFF5C\u6F2B\u8C08Light the Star",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/6627fda4b56459544087d86a",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u5546\u4E1A\u5C31\u662F\u8FD9\u6837",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/6022a180ef5fdaddc30bb101",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u58F0\u4E1C\u51FB\u897F",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/5e2831ed418a84a046231c00",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u58F0\u52A8\u65E9\u5496\u5561",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/60de7c003dd577b40d5a40f3",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u5929\u771F\u4E0D\u5929\u771F",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/65cef9e3cace72dff8d98de3",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u5C60\u9F99\u4E4B\u672F",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/6507bc165c88d2412626b401",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u5CA9\u4E2D\u82B1\u8FF0",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/625635587bfca4e73e990703",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u5F00\u59CB\u8FDE\u63A5 LinkStart",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/63ff0da51b1faf8a0b70b337",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u5F20\u5C0F\u73FAJ\xF9n\uFF5C\u5546\u4E1A\u8BBF\u8C08\u5F55",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/626b46ea9cbbf0451cf5a962",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u5FFD\u5DE6\u5FFD\u53F3",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/5e4ee557418a84a0466737b7",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u6162\u901F\u751F\u957F",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/668d00c38fcadceb90158ac1",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u6355\u86C7\u8005\u8BF4",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/5e2864f7418a84a04628f2da",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u641E\u94B1\u5973\u5B69",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/63d945ece725b5378a158d29",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u6587\u5316\u6709\u9650",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/5e4515bd418a84a046e2b11a",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u665A\u70B9\u804A LateTalk",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/61933ace1b4320461e91fd55",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u674E\u8BDE",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/65bb55f6513a776b57dedb32",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u67AB\u8A00\u67AB\u8BED \u2014 Podcast",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/5e2864f5418a84a04628e249",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u6B64\u8BDD\u5F53\u771F",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/646f194853a5e5ea1408d97c",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u6E38\u8361\u96C6",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/6163ca67c8c1d14e83366b31",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u725B\u6CB9\u679C\u70E4\u9762\u5305",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/5e7c8b2b418a84a046e3ecbc",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u72EC\u6811\u4E0D\u6210\u6797",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/64acd33c7a3d479103fbd32d",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u75AF\u6295\u5708",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/5e280faf418a84a0461fbd39",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u76AE\u86CB\u6F2B\u6E38\u8BB0",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/6281264ad22bcf3950c80b56",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u770B\u7406\u60F3\u5706\u684C",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/5e4ff4c7418a84a046977618",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u77E5\u884C\u5C0F\u9152\u9986",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/6013f9f58e2f7ee375cf4216",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u7845\u8C37101 \u2014 Podcast",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/5e5c52c9418a84a04625e6cc",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u786C\u5730\u9A87\u5BA2",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/640ee2438be5d40013fe4a87",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u79D1\u6280\u4E71\u7096",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/5e4243cd418a84a0469573fb",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u7B2C\u4E00\u8D22\u7ECF",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/64c75555e8176c3ff81de98c",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u7EB5\u6A2A\u56DB\u6D77",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/62694abdb221dd5908417d1e",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u7F57\u6C38\u6D69\u7684\u5341\u5B57\u8DEF\u53E3",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/68981df29e7bcd326eb91d88",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u80A5\u8BDD\u8FDE\u7BC7",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/61d50d72ee197a3aac3dac42",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u81EA\u4E60\u5BA4 STUDY ROOM",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/65a5fb7540d4ef949c0140ac",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u81EA\u6211\u8FDB\u5316\u8BBA",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/5e5de5cb418a84a0467beb90",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u848B\u65B9\u821F\xB7\u4E00\u5BF8",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/67c7eeb07ac3e30992e75a2f",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u8BD7\u68B3\u98CE",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/696496f4db4738160d5fabde",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u8C2D\u7ACB\u4EBA",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/65a2d0f07242f9fc1c1df60a",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u8D77\u6731\u697C\u5BB4\u5BBE\u5BA2",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/61dd99a47b29652ff572257b",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u8DE8\u56FD\u4E32\u95E8\u513F\u8BA1\u5212",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/670f3da40d2f24f28978736f",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u968F\u673A\u6CE2\u52A8StochasticVolatility",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/5e7cc741418a84a046b0c2bd",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u9762\u57FA",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/6388760f22567e8ea6ad070f",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    },
    {
      name: "\u9AD8\u80FD\u91CF",
      url: "https://rsshub.bestblogs.dev/xiaoyuzhou/podcast/62c6ae08c4eaa82b112b9c84",
      description: "\u64AD\u5BA2\u8282\u76EE",
      language: "zh"
    }
  ]
};

// src/client/PodcastDiscovery.jsx
var import_react10 = require("react");
var import_jsx_runtime10 = require("react/jsx-runtime");
function PodcastDiscovery({ api, onImported }) {
  const [query, setQuery] = (0, import_react10.useState)("");
  const [shows, setShows] = (0, import_react10.useState)([]);
  const [show, setShow] = (0, import_react10.useState)(null);
  const [episodes, setEpisodes] = (0, import_react10.useState)([]);
  const [page, setPage] = (0, import_react10.useState)(1);
  const [busy, setBusy] = (0, import_react10.useState)("");
  const [error, setError] = (0, import_react10.useState)("");
  const [searched, setSearched] = (0, import_react10.useState)(false);
  const search = async (event) => {
    event.preventDefault();
    setBusy("search");
    setError("");
    setShow(null);
    setEpisodes([]);
    setSearched(true);
    try {
      setShows((await api.searchPodcastShows(query)).shows);
    } catch (cause) {
      setError(cause.message ?? String(cause));
    } finally {
      setBusy("");
    }
  };
  const openShow = async (item, nextPage = 1) => {
    setBusy("episodes");
    setError("");
    try {
      const result = await api.listPodcastEpisodes(item.slug, nextPage);
      setShow(item);
      setEpisodes(result.episodes);
      setPage(nextPage);
    } catch (cause) {
      setError(cause.message ?? String(cause));
    } finally {
      setBusy("");
    }
  };
  const importEpisode = async (item) => {
    setBusy(item.episode_slug);
    setError("");
    try {
      const result = await api.importPodcastTranscript(show.slug, item.episode_slug);
      await onImported(result.key);
    } catch (cause) {
      setError(cause.message ?? String(cause));
    } finally {
      setBusy("");
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "qrs-podscribe", children: [
    /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("form", { className: "qrs-podscribe-search", onSubmit: search, children: [
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(Icon2, { name: "search", size: 16 }),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("input", { autoFocus: true, "aria-label": "T\xECm podcast n\u01B0\u1EDBc ngo\xE0i", placeholder: "T\xECm podcast ti\u1EBFng Anh, v\xED d\u1EE5 Acquired", value: query, onChange: (event) => setQuery(event.target.value) }),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("button", { type: "submit", disabled: busy === "search" || query.trim().length < 2, children: busy === "search" ? "\u0110ang t\xECm\u2026" : "T\xECm" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("p", { className: "qrs-podscribe-hint", children: "T\xECm trong danh m\u1EE5c transcript podcast c\xF4ng khai. Ch\u1ECDn m\u1ED9t t\u1EADp \u0111\u1EC3 l\u1EA5y nguy\xEAn v\u0103n, c\xF3 th\u1EC3 d\u1ECBch ho\u1EB7c h\u1ECFi \u0111\xE1p trong tr\xECnh \u0111\u1ECDc." }),
    error && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("p", { role: "alert", className: "qrs-podscribe-error", children: error }),
    show && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("button", { type: "button", className: "qrs-podscribe-back", onClick: () => {
      setShow(null);
      setEpisodes([]);
    }, children: "\u2039 V\u1EC1 danh s\xE1ch ch\u01B0\u01A1ng tr\xECnh" }),
    /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "qrs-podscribe-list", children: [
      show ? /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(import_jsx_runtime10.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("h4", { children: show.name }),
        episodes.map((item) => /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "qrs-podscribe-row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("strong", { children: item.title }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("small", { children: item.published_relative || "" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("button", { type: "button", disabled: Boolean(busy), onClick: () => void importEpisode(item), children: busy === item.episode_slug ? "\u0110ang l\u1EA5y\u2026" : "\u0110\u1ECDc nguy\xEAn v\u0103n" })
        ] }, item.episode_slug)),
        page > 1 && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("button", { type: "button", className: "qrs-podscribe-next", disabled: Boolean(busy), onClick: () => void openShow(show, page - 1), children: "Trang tr\u01B0\u1EDBc" }),
        episodes.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("button", { type: "button", className: "qrs-podscribe-next", disabled: Boolean(busy), onClick: () => void openShow(show, page + 1), children: "Trang sau" })
      ] }) : shows.map((item) => /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("button", { type: "button", className: "qrs-podscribe-row qrs-podscribe-show", disabled: Boolean(busy), onClick: () => void openShow(item), children: [
        item.image && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("img", { src: item.image, alt: "", loading: "lazy" }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("span", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("strong", { children: item.name }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("small", { children: [
            item.episodes_with_transcripts ?? "\u2014",
            " t\u1EADp c\xF3 transcript"
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(Icon2, { name: "chevron-right", size: 15 })
      ] }, item.slug)),
      !show && !shows.length && !busy && searched && !error && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("p", { className: "qrs-podscribe-hint", children: "Kh\xF4ng c\xF3 ch\u01B0\u01A1ng tr\xECnh ph\xF9 h\u1EE3p, th\u1EED t\xECm b\u1EB1ng t\xEAn ti\u1EBFng Anh." })
    ] })
  ] });
}

// src/client/Discover.jsx
var import_jsx_runtime11 = require("react/jsx-runtime");
var featured = [
  ["\u6F6E\u6D41\u5468\u520A \xB7 Tw93", "https://weekly.tw93.fun/rss.xml"],
  ["\u962E\u4E00\u5CF0\u7684\u7F51\u7EDC\u65E5\u5FD7", "https://www.ruanyifeng.com/blog/atom.xml"],
  ["\u4E91\u98CE", "https://blog.codingnow.com/atom.xml"],
  ["\u548C\u83DC\u5934", "https://www.hecaitou.com/feeds/posts/default?alt=rss"],
  ["\u5F20\u946B\u65ED", "https://www.zhangxinxu.com/wordpress/feed/"],
  ["\u5C0F\u4F17\u8F6F\u4EF6", "https://www.appinn.com/feed/"],
  ["\u6708\u5149\u535A\u5BA2", "https://www.williamlong.info/rss.xml"],
  ["Reorx", "https://reorx.com/feed.xml"],
  ["pseudoyu", "https://www.pseudoyu.com/zh/index.xml"]
].map(([name, url]) => ({ name, url, category: "T\xE1c gi\u1EA3 ch\u1ECDn l\u1ECDc" }));
var wechat = [
  ["\u5411\u9633\u4E54\u6728\u63A8\u8350\u770B", "3008229483"],
  ["\u846CAI", "3988614169"],
  ["AGENT\u6A58", "3903697567"],
  ["\u8D5B\u535A\u7985\u5FC3", "3934419561"],
  ["\u6570\u5B57\u751F\u547D\u5361\u5179\u514B", "3223096120"],
  ["\u665A\u70B9LatePost", "3572959446"],
  ["\u65B0\u667A\u5143", "3271041950"],
  ["elsewhere\u522B\u5904\u53D1\u751F", "3635075805"]
].map(([name, id]) => ({ name, url: `https://rss.t5t6.com/weread/MP_WXS_${id}.xml`, category: "WeChat ch\xEDnh danh" }));
var catalog = [...featured, ...wechat, ...podcast_feeds_default.items.map((entry) => ({ ...entry, category: "Podcast" })), ...independent_blogs_default.items.map((entry) => ({ ...entry, category: "Blog \u0111\u1ED9c l\u1EADp" }))];
var topics = [...new Set(independent_blogs_default.items.flatMap((entry) => entry.tags ?? []))].sort();
var categories = ["T\u1EA5t c\u1EA3", "T\xE1c gi\u1EA3 ch\u1ECDn l\u1ECDc", "WeChat ch\xEDnh danh", "Podcast", "Podcast n\u01B0\u1EDBc ngo\xE0i", "Blog \u0111\u1ED9c l\u1EADp"];
function feedHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
function Discover({ api, onClose, onAdded, onRead, onPodcastImported }) {
  const [query, setQuery] = (0, import_react11.useState)("");
  const [category, setCategory] = (0, import_react11.useState)("T\u1EA5t c\u1EA3");
  const [topic, setTopic] = (0, import_react11.useState)("");
  const [limit, setLimit] = (0, import_react11.useState)(40);
  const [subscribed, setSubscribed] = (0, import_react11.useState)([]);
  const [busy, setBusy] = (0, import_react11.useState)("");
  const [message, setMessage] = (0, import_react11.useState)("");
  (0, import_react11.useEffect)(() => setLimit(40), [query, category, topic]);
  (0, import_react11.useEffect)(() => {
    void api.listSubscriptions().then((result) => setSubscribed(result.subscriptions)).catch((error) => setMessage(error.message));
  }, [api]);
  (0, import_react11.useEffect)(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  const visible = (0, import_react11.useMemo)(() => {
    const needle = query.trim().toLocaleLowerCase();
    return catalog.filter((entry) => (category === "T\u1EA5t c\u1EA3" || entry.category === category) && (!topic || entry.tags?.includes(topic)) && `${entry.name} ${entry.url} ${(entry.tags ?? []).join(" ")}`.toLocaleLowerCase().includes(needle));
  }, [query, category, topic]);
  const add = async (entry) => {
    setBusy(entry.url);
    setMessage("");
    try {
      const result = await api.addSubscription({ name: entry.name, url: entry.url, group: entry.category });
      setSubscribed((current) => [...current, result]);
      setMessage(result.lastError ? `\u0110\xE3 th\xEAm, l\u1EA5y d\u1EEF li\u1EC7u l\u1EA7n \u0111\u1EA7u th\u1EA5t b\u1EA1i: ${result.lastError}` : `\u0110\xE3 \u0111\u0103ng k\xFD ${entry.name}`);
      await onAdded();
    } catch (error) {
      setMessage(error?.message ?? String(error));
    } finally {
      setBusy("");
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { className: "qmrss-dialog-backdrop", onMouseDown: (event) => {
    if (event.target === event.currentTarget) onClose();
  }, children: /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "qmrss-dialog qrs-discover", role: "dialog", "aria-modal": "true", "aria-label": "Kh\xE1m ph\xE1 ngu\u1ED3n", children: [
    /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("header", { className: "qrs-discover-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("h3", { children: "Kh\xE1m ph\xE1 ngu\u1ED3n" }),
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("p", { children: "T\xECm n\u1ED9i dung b\u1EA1n quan t\xE2m, th\xEAm v\xE0o k\xEAnh c\u1EE7a b\u1EA1n." })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("button", { type: "button", className: "qrs-icon", "aria-label": "\u0110\xF3ng kh\xE1m ph\xE1", title: "\u0110\xF3ng", onClick: onClose, children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(Icon2, { name: "x" }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "qrs-discover-filters", children: [
      category !== "Podcast n\u01B0\u1EDBc ngo\xE0i" && /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("label", { className: "qrs-discover-search", children: [
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(Icon2, { name: "search" }),
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("input", { autoFocus: true, "aria-label": "T\xECm ngu\u1ED3n g\u1EE3i \xFD", placeholder: "T\xECm t\xE1c gi\u1EA3, podcast ho\u1EB7c \u0111\u1ECBa ch\u1EC9 RSS", value: query, onChange: (event) => setQuery(event.target.value) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { className: "qrs-discover-categories", role: "group", "aria-label": "Ph\xE2n lo\u1EA1i ngu\u1ED3n", children: categories.map((name) => /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("button", { type: "button", className: category === name ? "active" : "", "aria-pressed": category === name, onClick: () => {
        setCategory(name);
        if (name !== "T\u1EA5t c\u1EA3" && name !== "Blog \u0111\u1ED9c l\u1EADp") setTopic("");
      }, children: name }, name)) }),
      category !== "Podcast n\u01B0\u1EDBc ngo\xE0i" && /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "qrs-discover-filter-line", children: [
        /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("span", { children: [
          visible.length,
          " k\u1EBFt qu\u1EA3"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("select", { "aria-label": "Ch\u1EE7 \u0111\u1EC1", value: topic, onChange: (event) => setTopic(event.target.value), disabled: category !== "T\u1EA5t c\u1EA3" && category !== "Blog \u0111\u1ED9c l\u1EADp", children: [
          /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("option", { value: "", children: "M\u1ECDi ch\u1EE7 \u0111\u1EC1" }),
          topics.map((tag) => /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("option", { children: tag }, tag))
        ] })
      ] })
    ] }),
    category === "Podcast n\u01B0\u1EDBc ngo\xE0i" ? /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(PodcastDiscovery, { api, onImported: onPodcastImported }) : /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "qrs-discover-results", children: [
      visible.slice(0, limit).map((entry, index) => {
        const subscription = subscribed.find((sub) => sub.url === entry.url);
        return /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "qrs-discover-row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { className: "qrs-discover-avatar", "aria-hidden": "true", children: entry.category === "Podcast" ? /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(Icon2, { name: "podcast", size: 17 }) : entry.name.slice(0, 1) }),
          /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "qrs-discover-info", children: [
            /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("strong", { children: entry.name }),
            /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("span", { title: entry.url, children: [
              feedHost(entry.url),
              /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { className: "qrs-discover-dot", children: " \xB7 " }),
              entry.category
            ] })
          ] }),
          subscription ? /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "qrs-discover-actions", children: [
            /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("button", { type: "button", className: "qrs-discover-read", "aria-label": `\u0110\u1ECDc ${entry.name}`, onClick: () => onRead(`feed:${subscription.id}`), children: "\u0110\u1ECDc" }),
            /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { className: "qrs-discover-subscribed", children: "\u0110\xE3 \u0111\u0103ng k\xFD" })
          ] }) : /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("button", { type: "button", className: "qrs-discover-add", disabled: Boolean(busy), "aria-label": `\u0110\u0103ng k\xFD ${entry.name}`, onClick: () => void add(entry), children: busy === entry.url ? "\u0110ang th\xEAm\u2026" : /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(import_jsx_runtime11.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(Icon2, { name: "plus" }),
            "\u0110\u0103ng k\xFD"
          ] }) })
        ] }, `${entry.url}:${index}`);
      }),
      visible.length > limit && /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("button", { type: "button", className: "qrs-discover-more", onClick: () => setLimit((current) => current + 40), children: "Hi\u1EC7n th\xEAm" }),
      !visible.length && /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { className: "qrs-discover-empty", children: "Kh\xF4ng t\xECm th\u1EA5y ngu\u1ED3n ph\xF9 h\u1EE3p" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("footer", { className: "qrs-discover-foot", children: [
      message && /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { className: "qrs-discover-message", role: "status", children: message }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("span", { children: [
        "Blog \u0111\u1ED9c l\u1EADp t\u1EEB ",
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("a", { href: independent_blogs_default.source, target: "_blank", rel: "noreferrer", children: "Tim Qian" }),
        " \xB7 MIT"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("span", { children: [
        "Danh m\u1EE5c podcast t\u1EEB ",
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("a", { href: podcast_feeds_default.source, target: "_blank", rel: "noreferrer", children: "Qiaomu RSS" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { children: "Ngu\u1ED3n WeChat do b\xEAn th\u1EE9 ba cung c\u1EA5p, c\xF3 th\u1EC3 ch\u1EC9 c\xF3 t\xF3m t\u1EAFt" })
    ] })
  ] }) });
}

// src/client/VideoPlayer.jsx
var import_react12 = require("react");

// src/video.js
function youtubeEmbedUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    const host2 = url.hostname.toLowerCase();
    let id;
    if (host2 === "youtu.be") id = url.pathname.slice(1);
    else if (["youtube.com", "www.youtube.com", "m.youtube.com", "www.youtube-nocookie.com"].includes(host2)) {
      if (url.pathname === "/watch") id = url.searchParams.get("v");
      else {
        const match = /^\/(?:embed|shorts|live)\/([^/]+)\/?$/.exec(url.pathname);
        id = match?.[1];
      }
    }
    return /^[A-Za-z0-9_-]{11}$/.test(id ?? "") ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  } catch {
    return null;
  }
}
function bilibiliEmbedUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    if (!["bilibili.com", "www.bilibili.com", "m.bilibili.com"].includes(url.hostname.toLowerCase())) return null;
    const bvid = /^\/video\/(BV[0-9A-Za-z]{10})\/?$/.exec(url.pathname)?.[1];
    if (!bvid) return null;
    const part = parseInt(url.searchParams.get("p") || "1", 10);
    return `https://player.bilibili.com/player.html?isOutside=true&bvid=${bvid}&p=${part > 0 ? part : 1}&autoplay=0&high_quality=1&danmaku=0`;
  } catch {
    return null;
  }
}
function articleVideoEmbed(article) {
  return youtubeEmbedUrl(article?.videoUrl) ?? youtubeEmbedUrl(article?.url) ?? bilibiliEmbedUrl(article?.videoUrl) ?? bilibiliEmbedUrl(article?.url);
}
var isBilibiliEmbed = (embed) => typeof embed === "string" && embed.startsWith("https://player.bilibili.com/");
function articleAudioUrl(article) {
  const value = typeof article?.audio === "string" ? article.audio : article?.audio?.url;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    const type = article?.audio?.type?.toLowerCase();
    return !type || type.startsWith("audio/") ? url.href : null;
  } catch {
    return null;
  }
}

// src/client/VideoPlayer.jsx
var import_jsx_runtime12 = require("react/jsx-runtime");
function VideoPlayer({ embed, playerUrl }) {
  return isBilibiliEmbed(embed) ? /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(BilibiliPlayer, { embed }) : /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(YouTubePlayer, { embed, playerUrl });
}
function BilibiliPlayer({ embed }) {
  const params = new URL(embed).searchParams;
  const part = Number(params.get("p")) || 1;
  const watchUrl = `https://www.bilibili.com/video/${params.get("bvid")}/${part > 1 ? `?p=${part}` : ""}`;
  return /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { style: { marginBottom: 26 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("iframe", { className: "qrs-video-frame", src: embed, title: "Tr\xECnh ph\xE1t video Bilibili", loading: "lazy", sandbox: "allow-scripts allow-same-origin allow-presentation allow-popups", referrerPolicy: "strict-origin-when-cross-origin", allowFullScreen: true, style: { marginBottom: 8 } }),
    /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("a", { className: "qmrss-btn", href: watchUrl, target: "_blank", rel: "noopener noreferrer", children: [
      /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(Icon2, { name: "external-link", size: 16 }),
      "M\u1EDF tr\xEAn Bilibili"
    ] })
  ] });
}
function YouTubePlayer({ embed, playerUrl }) {
  const bridge = typeof window !== "undefined" ? window.dshDesktop?.browser : void 0;
  const [lease, setLease] = (0, import_react12.useState)(null);
  const [error, setError] = (0, import_react12.useState)("");
  const watchUrl = `https://www.youtube.com/watch?v=${new URL(embed).pathname.split("/").pop()}`;
  const openYouTube = () => window.open(watchUrl, "_blank", "noopener,noreferrer");
  const view = (0, import_react12.useRef)(null);
  const loaded = (0, import_react12.useRef)(false);
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent.replace(/\sElectron\/\S+/g, "").replace(/\sDeepSeek[\w-]*\/\S+/g, "") : void 0;
  (0, import_react12.useEffect)(() => {
    if (!bridge || !playerUrl) return;
    let cancelled = false;
    let acquired;
    let unsubscribe;
    void bridge.acquire("qiaomu-rss:youtube").then((value) => {
      acquired = value;
      if (cancelled) {
        void bridge.release(value.lease);
        return;
      }
      unsubscribe = bridge.onOpenRequested(value.lease, openYouTube);
      setLease(value);
    }).catch((e) => setError(e.message));
    return () => {
      cancelled = true;
      unsubscribe?.();
      if (acquired) void bridge.release(acquired.lease);
    };
  }, [bridge, playerUrl]);
  (0, import_react12.useEffect)(() => {
    const element = view.current;
    if (!element || !lease) return;
    loaded.current = false;
    const ready = () => {
      if (loaded.current) return;
      loaded.current = true;
      element.setUserAgent(userAgent);
      void element.loadURL(playerUrl, { userAgent }).catch((e) => setError(e.message));
    };
    element.addEventListener("dom-ready", ready);
    return () => element.removeEventListener("dom-ready", ready);
  }, [lease, playerUrl]);
  const externalLink = /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("a", { className: "qmrss-btn", href: watchUrl, target: "_blank", rel: "noopener noreferrer", children: [
    /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(Icon2, { name: "external-link", size: 16 }),
    "M\u1EDF tr\xEAn YouTube"
  ] });
  if (!bridge || !playerUrl || error) return /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { style: { marginBottom: 26 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("iframe", { className: "qrs-video-frame", src: playerUrl || embed, title: "Tr\xECnh ph\xE1t video YouTube", loading: "lazy", sandbox: "allow-scripts allow-same-origin allow-presentation", allow: "autoplay; encrypted-media; picture-in-picture; fullscreen", allowFullScreen: true, referrerPolicy: "strict-origin-when-cross-origin" }),
    error && /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { role: "alert", children: "Tr\xECnh ph\xE1t t\u1EA1m kh\xF4ng kh\u1EA3 d\u1EE5ng" }),
    externalLink
  ] });
  return /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { style: { marginBottom: 26 }, children: [
    lease ? /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("webview", { ref: view, className: "qrs-video-frame", style: { marginBottom: 8 }, src: `about:blank#${lease.lease}`, partition: lease.partition, allowpopups: "true", useragent: userAgent, title: "Tr\xECnh ph\xE1t video YouTube" }) : /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { role: "status", children: "\u0110ang t\u1EA3i tr\xECnh ph\xE1t\u2026" }),
    externalLink
  ] });
}

// src/client/MediaDock.jsx
var import_react13 = require("react");
var import_jsx_runtime13 = require("react/jsx-runtime");
function MediaDock({ episode }) {
  const audio = (0, import_react13.useRef)();
  const [error, setError] = (0, import_react13.useState)("");
  (0, import_react13.useEffect)(() => {
    setError("");
    if (!episode || !navigator.mediaSession) return;
    const session = navigator.mediaSession;
    if (typeof MediaMetadata !== "undefined") session.metadata = new MediaMetadata({ title: episode.titleZh || episode.title, artist: episode.author || episode.channelName || "AI Engineer World's Fair" });
    const handlers = {
      play: () => {
        void audio.current?.play().catch(() => setError("Ph\xE1t th\u1EA5t b\u1EA1i, th\u1EED l\u1EA1i ho\u1EB7c m\u1EDF b\u1EA3n g\u1ED1c"));
      },
      pause: () => audio.current?.pause(),
      seekbackward: () => {
        if (audio.current) audio.current.currentTime = Math.max(0, audio.current.currentTime - 15);
      },
      seekforward: () => {
        if (audio.current && Number.isFinite(audio.current.duration)) audio.current.currentTime = Math.min(audio.current.duration, audio.current.currentTime + 15);
      }
    };
    for (const [name, handler] of Object.entries(handlers)) {
      try {
        session.setActionHandler(name, handler);
      } catch {
      }
    }
    return () => {
      session.metadata = null;
      for (const name of Object.keys(handlers)) {
        try {
          session.setActionHandler(name, null);
        } catch {
        }
      }
    };
  }, [episode]);
  if (!episode) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "qrs-article-audio", "aria-label": "Audio b\xE0i vi\u1EBFt", style: { margin: "0 0 26px" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("audio", { ref: audio, controls: true, preload: "metadata", src: episode.audio, style: { display: "block", width: "100%" }, "aria-label": `${episode.titleZh || episode.title} audio`, onError: () => setError("Audio t\u1EA1m kh\xF4ng kh\u1EA3 d\u1EE5ng, th\u1EED l\u1EA1i ho\u1EB7c m\u1EDF b\u1EA3n g\u1ED1c") }),
    error && /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { role: "alert", style: { marginTop: 8 }, children: [
      error,
      " ",
      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("button", { type: "button", className: "qmrss-btn", onClick: () => {
        setError("");
        audio.current?.load();
      }, children: "Th\u1EED l\u1EA1i audio" }),
      episode.url && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("a", { className: "qmrss-btn", href: episode.url, target: "_blank", rel: "noopener noreferrer", children: "M\u1EDF b\u1EA3n g\u1ED1c" })
    ] })
  ] });
}

// src/client/selection.js
function selectedPassage(root, selection = window.getSelection()) {
  if (!root || !selection?.rangeCount || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;
  const quote = selection.toString().trim();
  if (!quote || quote.length > 6e3) return null;
  const before = range.cloneRange();
  before.selectNodeContents(root);
  before.setEnd(range.startContainer, range.startOffset);
  const offset = before.toString().length;
  return { quote, prefix: root.textContent.slice(Math.max(0, offset - 40), offset), suffix: root.textContent.slice(offset + selection.toString().length, offset + selection.toString().length + 40) };
}
function quoteRange(root, note) {
  const text = root.textContent;
  let start = text.indexOf(note.quote);
  if (start < 0 || !note.quote) return null;
  if (note.prefix) {
    const anchored = text.indexOf(note.prefix + note.quote);
    if (anchored >= 0) start = anchored + note.prefix.length;
  }
  const end = start + note.quote.length;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let offset = 0, node, range = document.createRange(), begun = false;
  while (node = walker.nextNode()) {
    const next = offset + node.length;
    if (!begun && start < next) {
      range.setStart(node, start - offset);
      begun = true;
    }
    if (begun && end <= next) {
      range.setEnd(node, end - offset);
      return range;
    }
    offset = next;
  }
  return null;
}

// src/client/AskArticle.jsx
var import_react14 = require("react");
var import_react_dom = require("react-dom");

// src/client/companion-copy.js
var messages2 = {
  zh: {
    passage: "\u0110o\u1EA1n \u0111ang x\u1EED l\xFD",
    selected: "N\u1ED9i dung \u0111\xE3 ch\u1ECDn",
    characters: "k\xFD t\u1EF1",
    scope: "Ch\u1EC9 x\u1EED l\xFD \u0111o\u1EA1n \u0111\xE3 ch\u1ECDn",
    syncing: "\u0110ang \u0111\u1ED3ng b\u1ED9\u2026",
    remove: "B\u1ECF \u0111o\u1EA1n ch\u1ECDn",
    removeHint: "B\u1ECF \u0111o\u1EA1n ch\u1ECDn, quay l\u1EA1i h\u1ECFi \u0111\xE1p c\u1EA3 b\xE0i",
    expand: "M\u1EDF r\u1ED9ng",
    collapse: "Thu g\u1ECDn",
    background: "Tham kh\u1EA3o b\xE0i vi\u1EBFt",
    article: "B\xE0i hi\u1EC7n t\u1EA1i"
  },
  en: {
    passage: "Passage to process",
    selected: "Selected passage",
    characters: "characters",
    scope: "Selection only",
    syncing: "Syncing\u2026",
    remove: "Remove selection",
    removeHint: "Remove selection and return to article questions",
    expand: "Expand",
    collapse: "Collapse",
    background: "Article background",
    article: "Current article"
  }
};
function companionCopy(language = globalThis.document?.documentElement?.lang || "zh") {
  return messages2[language.toLowerCase().split("-")[0]] || messages2.zh;
}

// src/client/AskArticle.jsx
var import_jsx_runtime14 = require("react/jsx-runtime");
function AskArticle({ api, context, onClose, onManagePrompts, onClearSelection, SessionProvider, renderSlot }) {
  const copy = companionCopy();
  const [workspaceId, setWorkspaceId] = (0, import_react14.useState)(() => api.defaultChatWorkspace?.());
  const [chat, setChat] = (0, import_react14.useState)(null);
  const [error, setError] = (0, import_react14.useState)("");
  const [actionError, setActionError] = (0, import_react14.useState)("");
  const [busy, setBusy] = (0, import_react14.useState)(true);
  const [attached, setAttached] = (0, import_react14.useState)("");
  const [attachedVersion, setAttachedVersion] = (0, import_react14.useState)(context.version);
  const [prompts, setPrompts] = (0, import_react14.useState)(readQuickPrompts);
  const [promptMount, setPromptMount] = (0, import_react14.useState)(null);
  const [quoteMount, setQuoteMount] = (0, import_react14.useState)(null);
  const [expandedQuote, setExpandedQuote] = (0, import_react14.useState)(false);
  const [emptyConversation, setEmptyConversation] = (0, import_react14.useState)(false);
  const [sendingPrompt, setSendingPrompt] = (0, import_react14.useState)(false);
  const chatRoot = (0, import_react14.useRef)(null);
  const sending = (0, import_react14.useRef)(false);
  const owned = (0, import_react14.useRef)(null);
  const generation = (0, import_react14.useRef)(0);
  const started = (0, import_react14.useRef)(false);
  const bindingQueue = (0, import_react14.useRef)(Promise.resolve());
  const bindContext = (request) => {
    const pending = bindingQueue.current.catch(() => {
    }).then(() => api.setReadingContext(request));
    bindingQueue.current = pending;
    return pending;
  };
  const contextKey = [context.key, context.version, context.selection || "", context.quoteId || ""].join("|");
  (0, import_react14.useEffect)(() => {
    if (workspaceId) return;
    return api.watchChatWorkspaces?.(() => setWorkspaceId(api.defaultChatWorkspace?.()));
  }, [api, workspaceId]);
  (0, import_react14.useEffect)(() => () => {
    generation.current += 1;
    owned.current?.release();
  }, []);
  (0, import_react14.useEffect)(() => {
    const reload = () => setPrompts(readQuickPrompts());
    window.addEventListener("qrs-prompts-changed", reload);
    return () => window.removeEventListener("qrs-prompts-changed", reload);
  }, []);
  (0, import_react14.useEffect)(() => {
    setActionError("");
    setExpandedQuote(false);
  }, [contextKey]);
  (0, import_react14.useEffect)(() => {
    if (!chat || !SessionProvider) return;
    const root = chatRoot.current;
    if (!root) return;
    const mount = document.createElement("div");
    mount.className = "qrs-companion-prompt-anchor";
    const quote = document.createElement("div");
    quote.className = "qrs-companion-quote-anchor";
    let placed = false;
    let quotePlaced = false;
    const place = () => {
      const seat = root.querySelector("[data-composer-seat]");
      if (seat?.parentNode) {
        if (mount.nextSibling !== seat) seat.parentNode.insertBefore(mount, seat);
        if (!placed) {
          placed = true;
          setPromptMount(mount);
        }
      }
      const card = root.querySelector("[data-composer-card]");
      if (card && quote.parentNode !== card) card.insertBefore(quote, card.firstChild);
      if (card && !quotePlaced) {
        quotePlaced = true;
        setQuoteMount(quote);
      }
      setEmptyConversation(root.querySelector("[data-content-phase]")?.getAttribute("data-content-phase") === "hero");
    };
    const observer = new MutationObserver(place);
    observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-content-phase"] });
    place();
    return () => {
      observer.disconnect();
      mount.remove();
      quote.remove();
      setPromptMount(null);
      setQuoteMount(null);
      setEmptyConversation(false);
    };
  }, [chat, SessionProvider]);
  (0, import_react14.useEffect)(() => {
    const card = quoteMount?.parentElement;
    if (!card) return;
    card.inert = attached !== contextKey || Boolean(error);
    return () => {
      card.inert = false;
    };
  }, [quoteMount, attached, contextKey, error]);
  async function start(fresh = false) {
    if (!workspaceId) return;
    const current = ++generation.current;
    setBusy(true);
    setError("");
    setActionError("");
    let acquired;
    try {
      const saved = fresh ? null : localStorage.getItem(`qrs.chat.${workspaceId}.${context.key}`);
      try {
        acquired = await api.openChat({ workspaceId, sessionId: saved || void 0 });
      } catch (cause) {
        if (!saved) throw cause;
        localStorage.removeItem(`qrs.chat.${workspaceId}.${context.key}`);
        acquired = await api.openChat({ workspaceId });
      }
      if (current !== generation.current) {
        acquired.release();
        return;
      }
      const binding = await bindContext({ sessionId: acquired.sessionId, ...context });
      if (current !== generation.current) {
        acquired.release();
        return;
      }
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
  (0, import_react14.useEffect)(() => {
    if (!workspaceId || started.current) return;
    started.current = true;
    void start();
  }, [workspaceId]);
  (0, import_react14.useEffect)(() => {
    if (!chat || attached === contextKey) return;
    let stale = false;
    setError("");
    bindContext({ sessionId: chat.sessionId, ...context }).then((binding) => {
      if (!stale) {
        setAttached(contextKey);
        setAttachedVersion(binding?.version ?? context.version);
      }
    }).catch((cause) => {
      if (!stale) setError(cause?.message ?? String(cause));
    });
    return () => {
      stale = true;
    };
  }, [chat, contextKey]);
  async function sendQuickPrompt(item) {
    if (sending.current || !chat || attached !== contextKey) return;
    sending.current = true;
    setSendingPrompt(true);
    setActionError("");
    try {
      await chat.sendPrompt(item.body);
    } catch (cause) {
      setActionError(cause?.message?.includes("b\u1EA3n nh\xE1p") ? "\xD4 nh\u1EADp \u0111ang c\xF3 b\u1EA3n nh\xE1p, h\xE3y g\u1EEDi ho\u1EB7c x\xF3a b\u1EA3n nh\xE1p tr\u01B0\u1EDBc khi d\xF9ng l\u1EC7nh nhanh." : `G\u1EEDi nhanh th\u1EA5t b\u1EA1i: ${cause?.message ?? String(cause)}`);
    } finally {
      setSendingPrompt(false);
      sending.current = false;
    }
  }
  return /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("aside", { className: "qrs-companion", "aria-label": "Tr\u1EE3 l\xFD AI", children: [
    /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("header", { className: "qrs-companion-header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("strong", { children: "Tr\u1EE3 l\xFD AI" }),
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("button", { className: "qrs-icon", title: "Tr\xF2 chuy\u1EC7n m\u1EDBi", "aria-label": "Tr\xF2 chuy\u1EC7n m\u1EDBi", onClick: () => void start(true), disabled: busy || !workspaceId, children: /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(Icon2, { name: "plus" }) }),
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("button", { className: "qrs-icon", title: "\u0110\xF3ng tr\u1EE3 l\xFD", "aria-label": "\u0110\xF3ng tr\u1EE3 l\xFD", onClick: onClose, children: /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(Icon2, { name: "x" }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: "qrs-companion-context", children: [
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("strong", { children: context.title }),
      /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("small", { children: [
        { original: "B\u1EA3n g\u1ED1c", translation: "B\u1EA3n d\u1ECBch", rewrite: "Gi\u1EA3i th\xEDch AI" }[attached === contextKey ? attachedVersion : context.version],
        attached === contextKey && attachedVersion !== context.version ? "c\xF3 s\u1EB5n nh\u01B0ng b\u1EA3n hi\u1EC7n t\u1EA1i thi\u1EBFu" : "",
        " \xB7 ",
        context.selection ? copy.background : copy.article
      ] })
    ] }),
    error && /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: "qrs-companion-error", role: "alert", children: [
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("strong", { children: error.includes("ch\u01B0a c\xF3 n\u1ED9i dung") ? "T\u1EA1m th\u1EDDi ch\u01B0a th\u1EC3 tr\xF2 chuy\u1EC7n v\u1EC1 b\xE0i n\xE0y" : "K\u1EBFt n\u1ED1i tr\u1EE3 l\xFD ch\u01B0a ho\xE0n t\u1EA5t" }),
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("p", { children: error.includes("ch\u01B0a c\xF3 n\u1ED9i dung") ? "B\xE0i n\xE0y hi\u1EC7n ch\u01B0a c\xF3 n\u1ED9i dung \u0111\u1EC3 tham chi\u1EBFu. Th\u1EED l\u1EA1i sau ho\u1EB7c \u0111\u1ECDc b\xE0i kh\xE1c tr\u01B0\u1EDBc." : error }),
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("button", { type: "button", onClick: () => void start(), children: "K\u1EBFt n\u1ED1i l\u1EA1i" })
    ] }),
    actionError && /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: "qrs-companion-notice", role: "status", children: [
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { children: actionError }),
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("button", { type: "button", "aria-label": "\u0110\xF3ng th\xF4ng b\xE1o", onClick: () => setActionError(""), children: /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(Icon2, { name: "x", size: 13 }) })
    ] }),
    !chat && !error && /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("div", { className: "qrs-companion-loading", role: "status", children: workspaceId ? "\u0110ang m\u1EDF h\u1ED9i tho\u1EA1i\u2026" : "\u0110ang k\u1EBFt n\u1ED1i workspace m\u1EB7c \u0111\u1ECBnh\u2026" }),
    chat && SessionProvider && /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: "qrs-native-chat", ref: chatRoot, children: [
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(SessionProvider, { session: chat.reference, children: renderSlot("qiaomu-rss.chat", {}) }),
      emptyConversation && attached === contextKey && !error && /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: "qrs-companion-opening", "aria-label": "B\u1EAFt \u0111\u1EA7u tr\xF2 chuy\u1EC7n", children: [
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("div", { className: "qrs-companion-book", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("svg", { viewBox: "0 0 112 88", fill: "none", children: [
          /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("path", { d: "M56 72c-10-7-21-10-37-9V19c16-1 27 2 37 9 10-7 21-10 37-9v44c-16-1-27 2-37 9Z" }),
          /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("path", { d: "M56 28v44M25 29c9 .3 17 2.5 24 6M25 38c9 .3 17 2.5 24 6M63 35c7-3.5 15-5.7 24-6M63 44c7-3.5 15-5.7 24-6" }),
          /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("path", { d: "M11 68c18-3 33 0 45 9 12-9 27-12 45-9" }),
          /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("circle", { cx: "77", cy: "13", r: "2.5", className: "qrs-companion-book-spark" }),
          /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("path", { d: "M77 3v4M77 19v4M67 13h4M83 13h4", className: "qrs-companion-book-spark" })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "qrs-companion-opening-label", children: "\u0110\u1ECDc c\xF9ng b\xE0i vi\u1EBFt" }),
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("h2", { children: "M\u1ED7i hi\u1EC3u bi\u1EBFt b\u1EAFt \u0111\u1EA7u t\u1EEB m\u1ED9t th\u1EAFc m\u1EAFc." }),
        /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("p", { children: [
          "M\u1ED9t chi ti\u1EBFt, m\u1ED9t c\xE2u h\u1ECFi, hay m\u1ED9t \xFD b\u1EA1n ch\u01B0a \u0111\u1ED3ng \xFD.",
          /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("br", {}),
          "Vi\u1EBFt xu\u1ED1ng, ta c\xF9ng \u0111\u1ECDc ti\u1EBFp."
        ] })
      ] })
    ] }),
    quoteMount && context.selection && (0, import_react_dom.createPortal)(/* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("section", { className: "qrs-companion-quote", "aria-label": copy.passage, "aria-busy": attached !== contextKey, children: [
      /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: "qrs-companion-quote-heading", children: [
        /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("strong", { children: [
          copy.selected,
          " \xB7 ",
          Array.from(context.selection).length,
          " ",
          copy.characters
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { children: attached === contextKey ? copy.scope : copy.syncing }),
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("button", { type: "button", "aria-label": copy.remove, title: copy.removeHint, disabled: sendingPrompt || !onClearSelection, onClick: onClearSelection, children: /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(Icon2, { name: "x", size: 14 }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("blockquote", { className: expandedQuote ? "is-expanded" : "", children: context.selection }),
      context.selection.length > 100 && /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("button", { type: "button", className: "qrs-companion-quote-expand", "aria-expanded": expandedQuote, onClick: () => setExpandedQuote((value) => !value), children: expandedQuote ? copy.collapse : copy.expand })
    ] }), quoteMount),
    promptMount && (0, import_react_dom.createPortal)(/* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: "qrs-companion-prompt-strip", role: "group", "aria-label": "L\u1EC7nh nhanh", children: [
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("div", { className: "qrs-companion-prompt-scroll", children: scopedQuickPrompts(prompts, context.selection).map((item) => /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("button", { type: "button", className: "qrs-companion-prompt-ghost", title: item.body, "aria-label": `G\u1EEDi ngay: ${item.title}`, disabled: sendingPrompt || attached !== contextKey, onClick: () => void sendQuickPrompt(item), children: item.title }, item.id)) }),
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("button", { type: "button", className: "qrs-companion-add-prompt", "aria-label": "Th\xEAm l\u1EC7nh nhanh", title: "Th\xEAm l\u1EC7nh nhanh", onClick: onManagePrompts, children: /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(Icon2, { name: "plus", size: 14 }) })
    ] }), promptMount)
  ] });
}

// src/platform.js
var PLATFORMS = [["youtube", "YouTube"], ["bilibili", "Bilibili"], ["wechat", "WeChat"], ["web", "B\xE0i vi\u1EBFt"]];
function platformOf(link) {
  let host2 = "";
  try {
    host2 = new URL(link || "").hostname.toLowerCase();
  } catch {
    return "web";
  }
  const is = (domain) => host2 === domain || host2.endsWith(`.${domain}`);
  if (is("youtube.com") || is("youtu.be")) return "youtube";
  if (is("bilibili.com") || is("b23.tv")) return "bilibili";
  if (host2 === "mp.weixin.qq.com") return "wechat";
  return "web";
}

// src/client/print-article.js
function printArticle({ title, html, url, version }, hostDocument = document) {
  const frame = hostDocument.createElement("iframe");
  frame.title = "Xem tr\u01B0\u1EDBc b\u1EA3n in";
  frame.style.cssText = "position:fixed;width:1px;height:1px;left:-10000px;border:0";
  hostDocument.body.appendChild(frame);
  const doc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!doc || !win) {
    frame.remove();
    throw new Error("M\xF4i tr\u01B0\u1EDDng hi\u1EC7n t\u1EA1i kh\xF4ng t\u1EA1o \u0111\u01B0\u1EE3c t\xE0i li\u1EC7u in");
  }
  doc.title = title || "B\xE0i vi\u1EBFt RSS";
  const style = doc.createElement("style");
  style.textContent = "@page{margin:20mm}body{font:16px/1.8 serif;color:#111;background:#fff;max-width:44em;margin:auto}img{max-width:100%;height:auto}pre{white-space:pre-wrap;overflow-wrap:anywhere}h1{font-size:26px}a{overflow-wrap:anywhere}iframe,audio,video,button{display:none}";
  doc.head.appendChild(style);
  const heading = doc.createElement("h1");
  heading.textContent = title;
  doc.body.appendChild(heading);
  const meta = doc.createElement("p");
  meta.textContent = `Phi\xEAn b\u1EA3n \u0111\u1ECDc: ${version}`;
  doc.body.appendChild(meta);
  try {
    const source = new URL(url);
    if (["http:", "https:"].includes(source.protocol)) {
      const link = doc.createElement("a");
      link.href = source.href;
      link.textContent = source.href;
      doc.body.appendChild(link);
    }
  } catch {
  }
  const body = doc.createElement("article");
  body.innerHTML = sanitizeHtml(html, { baseUrl: url });
  doc.body.appendChild(body);
  let timer;
  const dispose = () => {
    clearTimeout(timer);
    frame.remove();
  };
  win.addEventListener("afterprint", dispose, { once: true });
  timer = setTimeout(dispose, 12e4);
  win.focus();
  try {
    win.print();
  } catch (error) {
    dispose();
    throw error;
  }
  return dispose;
}

// src/client/refinements.css
var refinements_default = `/* Lora variable \u2014 subset: vietnamese (8992 bytes) */\r
@font-face {\r
  font-family: 'Lora';\r
  font-style: normal;\r
  font-weight: 400 700;\r
  font-display: swap;\r
  src: url(data:font/woff2;base64,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) format('woff2');\r
  unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB;\r
}\r
\r
/* Lora variable \u2014 subset: latin-ext (20088 bytes) */\r
@font-face {\r
  font-family: 'Lora';\r
  font-style: normal;\r
  font-weight: 400 700;\r
  font-display: swap;\r
  src: url(data:font/woff2;base64,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) format('woff2');\r
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF;\r
}\r
\r
/* Lora variable \u2014 subset: latin (37788 bytes) */\r
@font-face {\r
  font-family: 'Lora';\r
  font-style: normal;\r
  font-weight: 400 700;\r
  font-display: swap;\r
  src: url(data:font/woff2;base64,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) format('woff2');\r
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;\r
}\r
\r
\r
/* The article list remains available while a native Harness conversation is open. */\r
.qrs-workarea.has-companion > .qrs-layout {\r
  grid-template-columns: min(var(--qrs-list-width), 38%) 1px minmax(0, 1fr);\r
}\r
.qrs-workarea.has-companion > .qrs-layout > .qrs-sidebar { display: flex; }\r
.qrs-workarea.has-companion > .qrs-layout > .qrs-resize { display: block; }\r
.qrs-workarea.has-companion .qrs-article { padding-inline: clamp(18px, 3%, 36px); }\r
.qrs-root .qrs-channel { gap: 9px; }\r
.qrs-channel-mark { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--qrs-muted); border-radius: 7px; }\r
.qrs-channel-mark.curated { color: var(--qrs-fg); }\r
.qrs-channel-mark.all { color: var(--qrs-fg); }\r
.qrs-root .qrs-filters .qrs-settings-button { width: 30px; height: 30px; padding: 6px; margin-left: auto; border-radius: 7px; color: var(--qrs-muted); }\r
.qrs-root .qrs-filters .qrs-settings-button:hover { background: var(--qrs-hover); color: var(--qrs-fg); }\r
.qrs-root .qrs-filters .qrs-settings-button svg { width: 17px; height: 17px; }\r
\r
/* Keep the reading measure stable while an article is fetched. */\r
.qrs-article-loading { animation: qrs-skeleton-enter .16s ease .14s both; }\r
.qrs-skeleton-toolbar { gap: 11px; }\r
.qrs-skeleton-toolbar .qrs-skeleton-pill { width: 94px; height: 26px; border-radius: 999px; margin-right: 6px; }\r
.qrs-skeleton-icon { width: 28px; height: 28px; border-radius: 7px; }\r
.qrs-article-skeleton { padding-top: 34px; }\r
.qrs-skeleton { background: color-mix(in srgb, var(--qrs-fg) 8%, var(--qrs-bg)); background-image: linear-gradient(100deg, transparent 18%, color-mix(in srgb, var(--qrs-bg) 65%, transparent) 50%, transparent 82%); background-size: 200% 100%; animation: qrs-skeleton-shimmer 1.7s ease-in-out infinite; }\r
.qrs-skeleton-meta { width: 132px; height: 15px; border-radius: 5px; margin-bottom: 28px; }\r
.qrs-skeleton-title { width: 82%; height: 29px; border-radius: 6px; margin-bottom: 14px; }\r
.qrs-skeleton-title.short { width: 56%; margin-bottom: 50px; }\r
.qrs-skeleton-paragraph { display: grid; gap: 19px; margin-bottom: 51px; }\r
.qrs-skeleton-paragraph .qrs-skeleton { height: 14px; border-radius: 5px; }\r
.qrs-skeleton-paragraph .qrs-skeleton:nth-child(2) { width: 93%; }\r
.qrs-skeleton-paragraph .qrs-skeleton:last-child { width: 67%; }\r
@keyframes qrs-skeleton-enter { from { opacity: 0; } to { opacity: 1; } }\r
@keyframes qrs-skeleton-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }\r
@media (prefers-reduced-motion: reduce) { .qrs-article-loading { animation: none; } .qrs-skeleton { animation: none; background-image: none; } }\r
.qrs-article-load-error { display: grid; justify-items: start; gap: 9px; width: min(100% - 48px, 480px); margin: clamp(60px, 12vh, 140px) auto; color: var(--qrs-muted); }\r
.qrs-article-load-error h2 { margin: 7px 0 0; color: var(--qrs-fg); font-size: 19px; }\r
.qrs-article-load-error p { margin: 0 0 9px; font-size: 13px; }\r
.qrs-article-load-error button { min-height: 36px; padding: 0 13px; border: 1px solid color-mix(in srgb, var(--qrs-fg) 18%, var(--qrs-bg)); border-radius: 8px; background: transparent; color: var(--qrs-fg); font: inherit; font-size: 12px; cursor: pointer; }\r
.qrs-article-load-error button:hover { background: color-mix(in srgb, var(--qrs-fg) 5%, var(--qrs-bg)); }\r
\r
/* Reading surfaces keep their paper/dark theme through hover and selection. */\r
.qrs-root button.qrs-entry:hover,\r
.qrs-root .qrs-filters button:hover,\r
.qrs-root .qrs-icon:hover { background: color-mix(in srgb, var(--qrs-fg) 5%, var(--qrs-bg)); color: var(--qrs-fg); }\r
.qrs-root button.qrs-entry.qrs-selected { background: color-mix(in srgb, var(--qrs-fg) 8%, var(--qrs-bg)); box-shadow: inset 2px 0 0 color-mix(in srgb, var(--qrs-fg) 58%, var(--qrs-bg)); }\r
.qrs-root .qrs-filters button[aria-pressed=true] { background: color-mix(in srgb, var(--qrs-fg) 8%, var(--qrs-bg)); }\r
.qrs-prose::selection, .qrs-prose *::selection, ::highlight(qrs-reading-selection) { background: color-mix(in srgb, var(--qrs-fg) 17%, var(--qrs-bg)); color: var(--qrs-fg); }\r
\r
/* Searchable, anchored channel switcher. */\r
.qrs-channel-backdrop { align-items: initial; justify-content: initial; padding: 0; background: transparent; }\r
.qrs-channel-picker {\r
  position: absolute; width: min(480px, calc(100vw - 24px)); max-height: min(560px, calc(100vh - 24px));\r
  padding: 0; gap: 0; border: 1px solid color-mix(in srgb, var(--qrs-fg) 11%, var(--qrs-bg)); border-radius: 12px;\r
  background: var(--qrs-bg); color: var(--qrs-fg); box-shadow: 0 14px 42px rgba(0,0,0,.13), 0 1px 2px rgba(0,0,0,.04);\r
}\r
.qrs-channel-heading { display: flex; align-items: center; justify-content: space-between; padding: 16px 17px 8px; }\r
.qrs-channel-heading > div { display: flex; flex-direction: column; gap: 2px; }\r
.qrs-channel-heading strong { font-size: 15px; letter-spacing: -.015em; }\r
.qrs-channel-heading small { color: var(--qrs-muted); font-size: 11px; }\r
.qrs-channel-heading .qrs-icon { width: 28px; height: 28px; }\r
.qrs-channel-top { height: 46px; min-height: 46px; margin: 10px 16px 10px; padding: 0 14px; gap: 10px; border: 1px solid color-mix(in srgb, var(--qrs-fg) 13%, var(--qrs-bg)); border-radius: 9px; color: var(--qrs-muted); background: color-mix(in srgb, var(--qrs-fg) 2%, var(--qrs-bg)); }\r
.qrs-channel-top:focus-within { border-color: color-mix(in srgb, var(--qrs-fg) 33%, var(--qrs-bg)); box-shadow: none; }\r
.qrs-root .qrs-channel-top input[type=search] { flex: 1; width: 100%; height: 100%; padding: 0; min-width: 0; border: 0 !important; border-radius: 0; background: transparent !important; color: var(--qrs-fg); outline: 0 !important; box-shadow: none !important; appearance: none; font-size: 13px; }\r
.qrs-root .qrs-channel-top input[type=search]:focus { border: 0 !important; outline: 0 !important; box-shadow: none !important; }\r
.qrs-channel-options { padding: 2px 10px 8px; }\r
.qrs-channel-section { padding: 14px 11px 6px; color: var(--qrs-muted); font-size: 11px; letter-spacing: .02em; }\r
.qrs-channel-option-wrap { border-radius: 8px; }\r
.qrs-channel-option { min-height: 50px; padding: 9px 10px; gap: 9px; border-radius: 8px; }\r
.qrs-channel-option[aria-current=true] { background: color-mix(in srgb, var(--qrs-fg) 8%, var(--qrs-bg)); }\r
.qrs-channel-option:hover { background: color-mix(in srgb, var(--qrs-fg) 5%, var(--qrs-bg)); }\r
.qrs-channel-option[aria-current=true]:hover { background: color-mix(in srgb, var(--qrs-fg) 11%, var(--qrs-bg)); }\r
.qrs-channel-option:focus-visible { outline: 1px solid color-mix(in srgb, var(--qrs-fg) 40%, var(--qrs-bg)); outline-offset: -2px; }\r
.qrs-channel-option .qrs-channel-mark { background: transparent; }\r
.qrs-channel-name { font-size: 13px; font-weight: 520; }\r
.qrs-channel-subtitle { font-size: 11px; }\r
.qrs-channel-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 9px 14px; border-top: 1px solid color-mix(in srgb, var(--qrs-fg) 9%, var(--qrs-bg)); background: color-mix(in srgb, var(--qrs-fg) 2%, var(--qrs-bg)); }\r
.qrs-channel-manage, .qrs-channel-close { height: 30px; margin: 0; border: 0; background: transparent; padding: 0 8px; font-size: 12px; border-radius: 7px; }\r
.qrs-channel-manage:hover, .qrs-channel-close:hover { background: color-mix(in srgb, var(--qrs-fg) 7%, var(--qrs-bg)); }\r
.qrs-channel-manage svg:last-child { transform: rotate(-90deg); margin-left: 4px; }\r
\r
/* A wide drag target with a hairline instead of a heavy panel border. */\r
.qrs-workarea .qrs-companion-divider { position: relative; width: 8px; flex-basis: 8px; background: transparent; }\r
.qrs-workarea .qrs-companion-divider::after { content: ''; position: absolute; top: 0; bottom: 0; left: calc(50% - .5px); width: 1px; background: color-mix(in srgb, var(--qrs-fg) 12%, var(--qrs-bg)); pointer-events: none; }\r
.qrs-workarea .qrs-companion-divider:hover,\r
.qrs-workarea .qrs-companion-divider:focus-visible,\r
.qrs-workarea .qrs-companion-divider[data-dragging=true] { background: transparent; outline: none; }\r
.qrs-workarea .qrs-companion-divider:hover::after,\r
.qrs-workarea .qrs-companion-divider:focus-visible::after,\r
.qrs-workarea .qrs-companion-divider[data-dragging=true]::after { width: 2px; background: color-mix(in srgb, var(--qrs-fg) 34%, var(--qrs-bg)); }\r
\r
/* Reading theme also colors the embedded Harness conversation. Host controls stay native. */\r
.qrs-companion { background: var(--qrs-bg); color: var(--qrs-fg); }\r
.qrs-root[data-reading-theme]:not([data-reading-theme=auto]) .qrs-companion {\r
  --dsw-alias-bg-base: var(--qrs-chat-bg);\r
  --dsw-alias-bg-layer-1: color-mix(in srgb, var(--qrs-chat-fg) 3%, var(--qrs-chat-bg));\r
  --dsw-alias-bg-layer-2: color-mix(in srgb, var(--qrs-chat-fg) 6%, var(--qrs-chat-bg));\r
  --dsw-alias-bg-overlay: color-mix(in srgb, var(--qrs-chat-fg) 8%, var(--qrs-chat-bg));\r
  --dsw-alias-label-primary: var(--qrs-chat-fg);\r
  --dsw-alias-label-secondary: color-mix(in srgb, var(--qrs-chat-fg) 67%, var(--qrs-chat-bg));\r
  --dsw-alias-border-l1: color-mix(in srgb, var(--qrs-chat-fg) 12%, var(--qrs-chat-bg));\r
  --dsw-alias-border-l2: color-mix(in srgb, var(--qrs-chat-fg) 20%, var(--qrs-chat-bg));\r
  --dsw-alias-brand-primary: var(--qrs-chat-fg);\r
}\r
.qrs-companion-header { min-height: 52px; padding: 9px 14px; border-bottom: 1px solid color-mix(in srgb, var(--qrs-fg) 10%, var(--qrs-bg)); }\r
.qrs-companion-header strong { color: var(--qrs-fg); font-size: 14px; }\r
.qrs-companion-context { padding: 11px 16px; border-bottom-color: color-mix(in srgb, var(--qrs-fg) 9%, var(--qrs-bg)); color: var(--qrs-muted); }\r
.qrs-companion-context strong { color: var(--qrs-fg); font-size: 12px; }\r
.qrs-companion-prompt-anchor { min-width: 0; width: 100%; flex: none; }\r
.qrs-companion-prompt-strip { display: flex; align-items: center; gap: 5px; min-width: 0; width: 100%; padding: 7px 14px 8px; white-space: nowrap; color: var(--qrs-fg); }\r
.qrs-companion-prompt-scroll { display: flex; align-items: center; gap: 5px; min-width: 0; flex: 1; overflow-x: auto; overflow-y: hidden; overscroll-behavior-inline: contain; scrollbar-width: none; }\r
.qrs-companion-prompt-scroll::-webkit-scrollbar { display: none; }\r
.qrs-native-chat .qrs-companion-prompt-strip button { appearance: none; display: inline-flex; align-items: center; justify-content: center; flex: none; min-height: 34px; padding: 0 11px; border: 0; border-radius: 8px; background: transparent; box-shadow: none; color: var(--qrs-muted); font: inherit; font-size: 12px; font-weight: 500; line-height: 1; white-space: nowrap; cursor: pointer; transition: background-color .14s ease, color .14s ease; }\r
.qrs-native-chat .qrs-companion-prompt-strip .qrs-companion-prompt-ghost { background: color-mix(in srgb, var(--qrs-fg) 5%, var(--qrs-bg)); color: var(--qrs-fg); }\r
.qrs-native-chat .qrs-companion-prompt-strip button:hover:not(:disabled) { background: color-mix(in srgb, var(--qrs-fg) 7%, var(--qrs-bg)); color: var(--qrs-fg); }\r
.qrs-native-chat .qrs-companion-prompt-strip button:active:not(:disabled) { background: color-mix(in srgb, var(--qrs-fg) 11%, var(--qrs-bg)); }\r
.qrs-native-chat .qrs-companion-prompt-strip button:focus-visible { outline: 1px solid color-mix(in srgb, var(--qrs-fg) 45%, var(--qrs-bg)); outline-offset: -1px; }\r
.qrs-native-chat .qrs-companion-prompt-strip button:disabled { opacity: .45; cursor: not-allowed; }\r
.qrs-native-chat .qrs-companion-prompt-strip .qrs-companion-add-prompt { width: 32px; padding: 0; }\r
.qrs-companion-error { margin: 20px 16px; padding: 18px; border: 1px solid var(--qrs-border); border-radius: 12px; background: var(--qrs-bg-2); color: var(--qrs-fg); }\r
.qrs-companion-error strong { display: block; font-size: 13px; font-weight: 600; }\r
.qrs-companion-error p { margin: 7px 0 14px; color: var(--qrs-muted); font-size: 12px; line-height: 1.6; }\r
.qrs-companion-error button { margin: 0; min-height: 32px; padding: 0 11px; border: 1px solid var(--qrs-border); border-radius: 7px; background: var(--qrs-bg); color: var(--qrs-fg); font: inherit; font-size: 12px; cursor: pointer; }\r
.qrs-companion-error button:hover { background: var(--qrs-hover); }\r
.qrs-companion-notice { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 10px 16px 0; padding: 9px 11px; border-radius: 8px; background: var(--qrs-bg-2); color: var(--qrs-muted); font-size: 11px; line-height: 1.5; }\r
.qrs-companion-notice button { display: grid; place-items: center; flex: none; width: 24px; height: 24px; border: 0; border-radius: 5px; background: transparent; color: inherit; cursor: pointer; }\r
.qrs-companion-notice button:hover { background: var(--qrs-hover); color: var(--qrs-fg); }\r
.qrs-native-chat { position: relative; }\r
.qrs-native-chat [data-conversation-scroll] :has(> [data-chat-flow]) { padding-inline: 16px; }\r
.qrs-companion-opening { position: absolute; inset: 0 0 172px; z-index: 2; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 0; padding: 18px 24px 0; overflow: hidden; text-align: center; pointer-events: none; color: var(--qrs-fg); }\r
.qrs-companion-book { width: 112px; height: 88px; margin-bottom: 22px; color: color-mix(in srgb, var(--qrs-fg) 42%, var(--qrs-bg)); }\r
.qrs-companion-book svg { display: block; width: 100%; height: 100%; stroke: currentColor; stroke-width: 1.35; stroke-linecap: round; stroke-linejoin: round; }\r
.qrs-companion-book-spark { color: color-mix(in srgb, #ad7e49 68%, var(--qrs-fg)); stroke: currentColor; }\r
.qrs-companion-opening-label { color: color-mix(in srgb, #ad7e49 54%, var(--qrs-muted)); font-size: 11px; font-weight: 600; letter-spacing: .12em; }\r
.qrs-companion-opening h2 { margin: 10px 0 0; color: var(--qrs-fg); font-family: Lora, "Times New Roman", Times, "Songti SC", "Noto Serif CJK SC", serif; font-size: clamp(20px, 2vw, 26px); font-weight: 600; line-height: 1.5; }\r
.qrs-companion-opening p { margin: 14px 0 0; color: var(--qrs-muted); font-size: 12px; line-height: 1.9; letter-spacing: .015em; }\r
@media (max-height: 660px) { .qrs-companion-book { width: 80px; height: 63px; margin-bottom: 10px; } .qrs-companion-opening p { margin-top: 6px; } }\r
/* Harness centers a blank-session Hero. Embedded reading keeps its native composer at the same bottom position as an active conversation. */\r
.qrs-native-chat [data-content-phase="hero"] [data-conversation-scroll] { justify-content: flex-end; }\r
.qrs-native-chat [data-content-phase="hero"] [data-composer-seat] { position: sticky; bottom: 0; z-index: 7; background: var(--qrs-bg); }\r
.qrs-native-chat [data-content-phase="hero"] [class*="composerHero"] { padding-bottom: 0; }\r
.qrs-native-chat [data-content-phase="hero"] [class*="composerHero"] > :first-child,\r
.qrs-native-chat [data-content-phase="hero"] [class*="heroWorkspaceRow"] { display: none; }\r
.qrs-discover-actions { display: flex; align-items: center; flex: none; gap: 8px; }\r
.qrs-discover-read { min-height: 32px; padding: 0 11px; border: 0; border-radius: 7px; background: transparent; color: var(--qrs-fg); font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }\r
.qrs-discover-read:hover { background: var(--qrs-hover); }\r
.qrs-discover-subscribed { color: var(--qrs-muted); font-size: 11px; white-space: nowrap; }\r
\r
/* The subscription library uses the active reading palette, including focus and hover states. */\r
.qrs-root .qmrss-dialog.qrs-discover {\r
  --qrs-discover-tint: color-mix(in srgb, var(--qrs-fg) 3%, var(--qrs-bg));\r
  --qrs-discover-hover: color-mix(in srgb, var(--qrs-fg) 5%, var(--qrs-bg));\r
  background: var(--qrs-bg); color: var(--qrs-fg);\r
  border: 1px solid color-mix(in srgb, var(--qrs-fg) 12%, var(--qrs-bg));\r
  box-shadow: 0 18px 55px rgba(0,0,0,.16), 0 1px 2px rgba(0,0,0,.05);\r
}\r
.qrs-discover-head p, .qrs-discover-info > span, .qrs-discover-filter-line, .qrs-discover-foot { color: var(--qrs-muted); }\r
.qrs-root .qrs-discover-search { height: 44px; background: var(--qrs-discover-tint); border: 1px solid color-mix(in srgb, var(--qrs-fg) 12%, var(--qrs-bg)); color: var(--qrs-muted); transition: border-color .14s ease, background-color .14s ease; }\r
.qrs-root .qrs-discover-search:focus-within { border-color: color-mix(in srgb, var(--qrs-fg) 45%, var(--qrs-bg)); background: var(--qrs-bg); box-shadow: none; outline: none; }\r
.qrs-root .qmrss-dialog .qrs-discover-search input, .qrs-root .qmrss-dialog .qrs-discover-search input:focus-visible { min-width: 0; height: 100%; padding: 0; border: 0 !important; border-radius: 0; background: transparent !important; box-shadow: none !important; outline: none !important; color: var(--qrs-fg); }\r
.qrs-root .qmrss-dialog .qrs-discover-search input::placeholder { color: var(--qrs-muted); opacity: .8; }\r
.qrs-root .qrs-discover-categories button { min-height: 34px; color: var(--qrs-muted); }\r
.qrs-root .qrs-discover-categories button:hover { background: var(--qrs-discover-hover); color: var(--qrs-fg); }\r
.qrs-root .qrs-discover-categories button.active, .qrs-root .qrs-discover-categories button.active:hover { background: color-mix(in srgb, var(--qrs-fg) 8%, var(--qrs-bg)); color: var(--qrs-fg); }\r
.qrs-root .qmrss-dialog .qrs-discover-filter-line select { min-height: 32px; color: var(--qrs-fg); }\r
.qrs-root .qmrss-dialog .qrs-discover-filter-line select:hover:not(:disabled) { background: var(--qrs-discover-hover); }\r
.qrs-root .qrs-discover-row { border-bottom: 1px solid color-mix(in srgb, var(--qrs-fg) 9%, var(--qrs-bg)); transition: background-color .14s ease; }\r
.qrs-root .qrs-discover-row:hover, .qrs-root .qrs-discover-row:focus-within { background: var(--qrs-discover-tint); }\r
.qrs-root .qrs-discover-avatar { background: color-mix(in srgb, var(--qrs-fg) 6%, var(--qrs-bg)); color: var(--qrs-muted); }\r
.qrs-root .qrs-discover-add { min-height: 34px; border-color: color-mix(in srgb, var(--qrs-fg) 16%, var(--qrs-bg)); color: var(--qrs-fg); }\r
.qrs-root .qrs-discover-add:hover:not(:disabled), .qrs-root .qrs-discover-read:hover { background: var(--qrs-discover-hover); }\r
.qrs-root .qrs-discover-foot { border-top: 1px solid color-mix(in srgb, var(--qrs-fg) 10%, var(--qrs-bg)); background: var(--qrs-discover-tint); }\r
.qrs-root .qrs-discover-results { scrollbar-width: thin; scrollbar-color: color-mix(in srgb, var(--qrs-fg) 20%, transparent) transparent; }\r
.qrs-root .qrs-discover-results::-webkit-scrollbar { width: 6px; }\r
.qrs-root .qrs-discover-results::-webkit-scrollbar-thumb { border-radius: 99px; background: color-mix(in srgb, var(--qrs-fg) 20%, transparent); }\r
@media (prefers-reduced-motion: reduce) { .qrs-native-chat .qrs-companion-prompt-strip button, .qrs-root .qrs-discover-row, .qrs-root .qrs-discover-search { transition: none; } }\r
.qrs-native-chat :is(textarea,[contenteditable=true],[role=textbox]) { color: var(--qrs-fg); }\r
.qrs-native-chat button[aria-label="\u53D1\u9001\u6D88\u606F"] { background: var(--qrs-fg); color: var(--qrs-bg); }\r
.qrs-native-chat button[aria-label="\u53D1\u9001\u6D88\u606F"]:hover { background: color-mix(in srgb, var(--qrs-fg) 83%, var(--qrs-bg)); color: var(--qrs-bg); }\r
\r
.qrs-root :is(.qrs-list, .qrs-reader, .qrs-channel-options, .qrs-settings-content, .qrs-native-chat, .qrs-native-chat *) { scrollbar-width: thin; scrollbar-color: color-mix(in srgb, var(--qrs-fg) 18%, transparent) transparent; }\r
.qrs-root :is(.qrs-list, .qrs-reader, .qrs-channel-options, .qrs-settings-content, .qrs-native-chat, .qrs-native-chat *)::-webkit-scrollbar { width: 6px; height: 6px; }\r
.qrs-root :is(.qrs-list, .qrs-reader, .qrs-channel-options, .qrs-settings-content, .qrs-native-chat, .qrs-native-chat *)::-webkit-scrollbar-thumb { border-radius: 99px; background: color-mix(in srgb, var(--qrs-fg) 18%, transparent); }\r
.qrs-root :is(.qrs-list, .qrs-reader, .qrs-channel-options, .qrs-settings-content, .qrs-native-chat, .qrs-native-chat *)::-webkit-scrollbar-thumb:hover { background: color-mix(in srgb, var(--qrs-fg) 31%, transparent); }\r
.qrs-root :is(.qrs-list, .qrs-reader, .qrs-channel-options, .qrs-settings-content, .qrs-native-chat, .qrs-native-chat *)::-webkit-scrollbar-track { background: transparent; }\r
\r
/* A quiet, host-themed settings workspace with a stable side navigation. */\r
.qrs-settings-backdrop { background: rgba(17,17,17,.38); }\r
.qrs-settings-page { width: min(980px, 100%); height: min(810px, 100%); border-radius: 16px; background: var(--dsw-alias-bg-base); box-shadow: 0 22px 70px rgba(0,0,0,.20); }\r
.qrs-settings-head { flex: none; padding: 20px 24px; border-bottom: 1px solid var(--qrs-border); }\r
.qrs-settings-head > div { display: flex; align-items: center; gap: 12px; }\r
.qrs-settings-head span { padding-right: 12px; border-right: 1px solid var(--qrs-border); font-size: 10px; font-weight: 700; letter-spacing: .18em; color: var(--qrs-muted); }\r
.qrs-settings-head strong { font-size: 17px; letter-spacing: -.025em; }\r
.qrs-settings-body { display: grid; grid-template-columns: 190px minmax(0,1fr); flex: 1; min-height: 0; }\r
.qrs-settings-tabs { display: flex; flex-direction: column; align-items: stretch; gap: 3px; padding: 23px 12px; border: 0; border-right: 1px solid var(--qrs-border); background: var(--dsw-alias-bg-layer-1); }\r
.qrs-settings-nav-caption { padding: 0 11px 10px; color: var(--qrs-muted); font-size: 11px; }\r
.qrs-settings-tabs button { display: flex; align-items: center; gap: 10px; padding: 10px 11px; font-size: 13px; text-align: left; border-radius: 8px; }\r
.qrs-settings-tabs button:hover { background: var(--qrs-hover); color: var(--qrs-fg); }\r
.qrs-settings-tabs button[aria-current=page] { background: var(--dsw-alias-bg-base); color: var(--qrs-fg); box-shadow: 0 0 0 1px var(--qrs-border); font-weight: 600; }\r
.qrs-settings-content { min-width: 0; padding: 30px clamp(22px, 4%, 42px) 40px; background: var(--dsw-alias-bg-base); }\r
.qrs-settings-content section { gap: 18px; }\r
.qrs-settings-intro { margin-bottom: 7px; }\r
.qrs-settings-intro h2 { margin: 0 0 4px; font-size: 24px; font-weight: 650; letter-spacing: -.035em; }\r
.qrs-settings-intro p { margin: 0; color: var(--qrs-muted); font-size: 13px; }\r
.qrs-settings-card { padding: 20px; border: 1px solid var(--qrs-border); border-radius: 12px; background: var(--dsw-alias-bg-base); }\r
.qrs-settings-card-head { margin-bottom: 18px; }\r
.qrs-settings-content .qrs-settings-card h3 { margin: 0; font-size: 14px; font-weight: 620; letter-spacing: -.01em; }\r
.qrs-settings-card-head p, .qrs-settings-hint { margin: 4px 0 0; color: var(--qrs-muted); font-size: 12px; line-height: 1.6; }\r
.qrs-settings-reading-card .qrs-reading-settings-fields { max-width: none; gap: 0; }\r
.qrs-settings-reading-card .qrs-reading-setting { display: grid; grid-template-columns: 110px minmax(0,1fr) 58px; align-items: center; gap: 10px; min-height: 56px; padding: 10px 0; border-bottom: 1px solid var(--qrs-border); font-size: 12px; }\r
.qrs-settings-reading-card .qrs-reading-setting > span:first-child { color: var(--qrs-muted); }\r
.qrs-settings-reading-card .qrs-reading-setting select { grid-column: 2 / 4; height: 34px; max-width: 300px; padding: 0 10px; border: 1px solid var(--qrs-border); border-radius: 7px; background: var(--qrs-bg); color: var(--qrs-fg); font: inherit; }\r
.qrs-settings-reading-card .qrs-reading-setting output { grid-column: 3; grid-row: 1; text-align: right; font-size: 11px; color: var(--qrs-muted); }\r
.qrs-settings-reading-card .qrs-reading-setting input[type=range] { grid-column: 2; grid-row: 1; accent-color: var(--qrs-fg); }\r
.qrs-settings-reading-card .qrs-reading-setting-check { border: 0; }\r
.qrs-settings-reading-card .qrs-reading-reset { margin-top: 13px; padding: 5px 0; border: 0; background: none; color: var(--qrs-muted); font-size: 12px; cursor: pointer; }\r
.qrs-settings-reading-card .qrs-reading-reset:hover { color: var(--qrs-fg); }\r
.qrs-segmented { display: inline-flex; align-items: center; gap: 2px; padding: 3px; border: 1px solid var(--qrs-border); border-radius: 8px; background: var(--qrs-bg-2); width: max-content; max-width: 100%; }\r
.qrs-segmented button, .qrs-settings-content .qrs-segmented button { min-width: 37px; height: 28px; padding: 0 10px; border: 0; border-radius: 5px; background: transparent; color: var(--qrs-muted); font: inherit; font-size: 11px; cursor: pointer; white-space: nowrap; }\r
.qrs-segmented button[aria-pressed=true], .qrs-settings-content .qrs-segmented button[aria-pressed=true] { background: var(--dsw-alias-bg-base); color: var(--qrs-fg); box-shadow: 0 1px 3px rgba(0,0,0,.08); font-weight: 600; }\r
.qrs-settings-reading-card .qrs-segmented { grid-column: 2 / 4; }\r
.qrs-settings-reading-card .qrs-theme-setting { display: block; padding: 18px 0; }\r
.qrs-settings-reading-card .qrs-theme-setting > span { display: block; margin-bottom: 12px; }\r
.qrs-theme-options { display: grid; grid-template-columns: repeat(7,minmax(0,1fr)); gap: 8px; }\r
.qrs-theme-options button { display: flex; flex-direction: column; align-items: stretch; gap: 6px; min-width: 0; padding: 5px; border: 1px solid var(--qrs-border); border-radius: 8px; background: transparent; color: var(--qrs-muted); font: inherit; font-size: 10px; text-align: center; cursor: pointer; }\r
.qrs-theme-options button[aria-pressed=true] { border-color: var(--qrs-fg); color: var(--qrs-fg); }\r
.qrs-theme-swatch { display: grid; place-items: center; height: 44px; border-radius: 5px; font-family: Georgia,serif; font-size: 15px; }\r
.qrs-theme-swatch-auto { background: var(--dsw-alias-bg-layer-2); color: var(--qrs-fg); }\r
.qrs-switch { position: relative; display: inline-flex; align-items: center; cursor: pointer; }\r
.qrs-switch input { position: absolute; opacity: 0; width: 1px; height: 1px; }\r
.qrs-switch span { display: block; width: 34px; height: 20px; border-radius: 999px; background: var(--qrs-border-strong); transition: background .15s; }\r
.qrs-switch span::after { content: ''; display: block; width: 16px; height: 16px; margin: 2px; border-radius: 50%; background: white; box-shadow: 0 1px 2px rgba(0,0,0,.18); transition: transform .15s; }\r
.qrs-switch input:checked + span { background: var(--qrs-fg); }\r
.qrs-switch input:checked + span::after { transform: translateX(14px); }\r
.qrs-switch input:focus-visible + span { outline: 1px solid var(--qrs-accent); outline-offset: 2px; }\r
.qrs-settings-toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 20px; }\r
.qrs-settings-toggle-row p { margin: 4px 0 0; color: var(--qrs-muted); font-size: 12px; }\r
.qrs-settings-url { display: grid; grid-template-columns: 90px minmax(0,1fr); align-items: center; gap: 10px; color: var(--qrs-muted); font-size: 12px; }\r
.qrs-settings-url input { height: 38px; min-width: 0; padding: 0 11px; border: 1px solid var(--qrs-border); border-radius: 7px; background: var(--qrs-bg); color: var(--qrs-fg); font: inherit; font-size: 12px; }\r
.qrs-settings-url input:focus { outline: 1px solid var(--qrs-accent); }\r
.qrs-settings-source-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }\r
.qrs-settings-source-actions { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }\r
.qrs-settings-source-actions button { display: inline-flex; align-items: center; gap: 5px; height: 32px; padding: 0 9px; border: 1px solid var(--qrs-border); border-radius: 7px; background: transparent; color: var(--qrs-fg); font: inherit; font-size: 11px; cursor: pointer; }\r
.qrs-settings-source-actions button:hover { background: var(--qrs-hover); }\r
.qrs-settings-import { padding: 15px; margin-bottom: 14px; border: 1px solid var(--qrs-border); border-radius: 9px; background: var(--qrs-bg-2); }\r
.qrs-settings-content .qrs-opml-import { display: grid; gap: 9px; border: 0; padding: 0; }\r
.qrs-opml-import legend { padding: 0 0 8px; font-size: 12px; font-weight: 600; }\r
.qrs-opml-import input, .qrs-opml-import textarea { width: 100%; min-width: 0; padding: 8px 10px; border: 1px solid var(--qrs-border); border-radius: 7px; background: var(--qrs-bg); color: var(--qrs-fg); font: inherit; font-size: 12px; }\r
.qrs-opml-import input[type=file] { border-style: dashed; }\r
.qrs-opml-import .qmrss-btn { width: max-content; }\r
.qrs-opml-results { max-height: 200px; overflow: auto; }\r
.qrs-opml-results label { display: block; padding: 5px; font-size: 12px; }\r
.qrs-settings-about-brand { display: flex; gap: 14px; align-items: center; }\r
.qrs-settings-about-brand > span { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 12px; background: var(--qrs-fg); color: var(--qrs-bg); font-size: 21px; font-family: Georgia,serif; }\r
.qrs-settings-about-brand p, .qrs-settings-about-card > p { margin: 4px 0 0; font-size: 12px; color: var(--qrs-muted); }\r
.qrs-settings-links { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 8px; }\r
.qrs-settings-links a { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 10px 11px; border: 1px solid var(--qrs-border); border-radius: 8px; color: var(--qrs-fg); font-size: 12px; text-decoration: none; }\r
.qrs-settings-links a:hover { background: var(--qrs-hover); text-decoration: none; }\r
.qrs-settings-support { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12px; margin: 0; }\r
.qrs-settings-support > div { min-width: 0; }\r
.qrs-settings-support p { margin: 4px 0 15px; color: var(--qrs-muted); font-size: 12px; }\r
.qrs-settings-support img { width: 140px; height: 140px; border: 1px solid var(--qrs-border); border-radius: 8px; background: white; }\r
.qrs-settings-footer { flex: none; min-height: 62px; padding: 12px 23px; background: var(--dsw-alias-bg-base); }\r
.qrs-settings-footer button { min-width: 86px; height: 34px; background: var(--qrs-fg); color: var(--qrs-bg); font-size: 12px; }\r
\r
/* Manage feeds as a searchable list, with actions only where they are useful. */\r
.qrs-subscriptions { display: block !important; }\r
.qrs-subscriptions-toolbar { display: flex; gap: 8px; align-items: center; justify-content: space-between; }\r
.qrs-subscriptions-search { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; height: 42px; padding: 0 12px; border: 1px solid var(--qrs-border); border-radius: 8px; color: var(--qrs-muted); }\r
.qrs-subscriptions-search:focus-within { border-color: color-mix(in srgb, var(--qrs-fg) 34%, var(--qrs-border)); }\r
.qrs-subscriptions-search input { min-width: 0; flex: 1; height: 100%; border: 0; outline: 0; background: transparent; color: var(--qrs-fg); font: inherit; font-size: 12px; }\r
.qrs-root .qrs-settings-page .qrs-subscriptions-search input:focus-visible { outline: none; box-shadow: none; border: 0; }\r
.qrs-subscriptions-selection { display: flex; justify-content: space-between; align-items: center; padding: 8px 0 4px; color: var(--qrs-muted); font-size: 11px; }\r
.qrs-subscriptions-selection button { border: 0; background: transparent; color: var(--qrs-muted); padding: 3px 0; font: inherit; cursor: pointer; }\r
.qrs-subscriptions-selection button:hover { color: var(--qrs-fg); }\r
.qrs-subscriptions-list { max-height: 310px; overflow-y: auto; }\r
.qrs-subscription-row { display: flex; align-items: center; gap: 10px; min-height: 64px; padding: 8px 2px; border-bottom: 1px solid var(--qrs-border); }\r
.qrs-subscription-row input[type=checkbox] { accent-color: var(--qrs-fg); }\r
.qrs-subscription-avatar { flex: 0 0 31px; width: 31px; height: 31px; display: grid; place-items: center; border-radius: 8px; background: var(--qrs-bg-2); font-size: 13px; font-weight: 600; }\r
.qrs-subscription-copy { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }\r
.qrs-subscription-copy strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; font-weight: 600; }\r
.qrs-subscription-copy > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--qrs-muted); font-size: 11px; }\r
.qrs-subscription-copy small { color: var(--dsw-alias-state-error-primary); font-size: 11px; }\r
.qrs-subscription-actions { display: flex; gap: 2px; }\r
.qrs-subscription-actions button, .qrs-subscription-editor > div:first-child button { display: grid; place-items: center; width: 29px; height: 29px; padding: 0; border: 0; border-radius: 6px; background: transparent; color: var(--qrs-muted); cursor: pointer; }\r
.qrs-subscription-actions button:hover, .qrs-subscription-editor > div:first-child button:hover { background: var(--qrs-hover); color: var(--qrs-fg); }\r
.qrs-subscriptions-empty { padding: 36px 8px; color: var(--qrs-muted); text-align: center; font-size: 12px; }\r
.qrs-subscriptions-batch { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 10px; margin: 8px 0; border: 1px solid var(--qrs-border); border-radius: 8px; background: var(--qrs-bg-2); }\r
.qrs-subscriptions-batch strong { margin-right: 4px; font-size: 11px; }\r
.qrs-subscriptions-batch label { display: flex; align-items: center; gap: 5px; min-width: 150px; flex: 1; padding: 0 7px; border: 1px solid var(--qrs-border); border-radius: 6px; background: var(--qrs-bg); }\r
.qrs-subscriptions-batch input { width: 100%; height: 28px; border: 0; outline: 0; background: transparent; color: var(--qrs-fg); font-size: 11px; }\r
.qrs-subscriptions-batch button, .qrs-subscriptions-confirm button, .qrs-subscription-editor-actions button { display: inline-flex; align-items: center; gap: 4px; min-height: 28px; padding: 0 8px; border: 1px solid var(--qrs-border); border-radius: 6px; background: var(--qrs-bg); color: var(--qrs-fg); font: inherit; font-size: 11px; cursor: pointer; }\r
.qrs-subscriptions-batch button.danger, .qrs-subscriptions-confirm button.danger { color: var(--dsw-alias-state-error-primary); }\r
.qrs-subscriptions-batch button.icon { width: 28px; justify-content: center; padding: 0; }\r
.qrs-subscriptions-confirm { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; padding: 10px; border: 1px solid var(--qrs-border); border-radius: 7px; font-size: 11px; }\r
.qrs-subscription-editor-backdrop { position: fixed; inset: 0; z-index: 70; display: grid; place-items: center; padding: 20px; background: rgba(0,0,0,.35); }\r
.qrs-subscription-editor { display: grid; gap: 16px; width: min(430px, 100%); max-height: min(600px,90vh); overflow: auto; padding: 22px; border: 1px solid var(--qrs-border); border-radius: 13px; background: var(--dsw-alias-bg-base); box-shadow: 0 18px 54px rgba(0,0,0,.17); color: var(--qrs-fg); }\r
.qrs-subscription-editor > div:first-child { display: flex; align-items: center; justify-content: space-between; font-size: 13px; }\r
.qrs-subscription-editor label { display: grid; gap: 4px; color: var(--qrs-muted); font-size: 11px; }\r
.qrs-subscription-editor input, .qrs-subscription-editor textarea { width: 100%; min-height: 42px; padding: 10px 12px; border: 1px solid var(--qrs-border); border-radius: 8px; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; }\r
.qrs-root .qrs-subscription-editor :is(input,textarea):focus-visible { outline: 0; box-shadow: none; border-color: var(--dsw-alias-label-secondary); }\r
.qrs-subscription-editor textarea { resize: vertical; line-height: 1.5; }\r
.qrs-subscription-editor p { margin: 0; color: var(--qrs-muted); font-size: 12px; line-height: 1.5; }\r
.qrs-subscription-editor-actions { display: flex; justify-content: flex-end; gap: 6px; }\r
.qrs-subscription-editor-actions button:last-child { background: var(--qrs-fg); color: var(--qrs-bg); }\r
.qrs-subscription-editor-actions button { min-height: 36px; padding: 0 13px; }\r
.qrs-group-manager { margin-top: 20px; }\r
.qrs-group-heading { display: flex; justify-content: space-between; padding: 0 2px 8px; font-size: 12px; }\r
.qrs-group-heading span, .qrs-group-row small { color: var(--qrs-muted); font-size: 11px; }\r
.qrs-group-row { display: flex; align-items: center; gap: 9px; min-height: 40px; border-top: 1px solid var(--qrs-border); color: var(--qrs-fg); font-size: 12px; }\r
.qrs-group-row span { flex: 1; }\r
.qrs-group-row button, .qrs-prompt-row button { display: grid; place-items: center; width: 32px; height: 32px; border: 0; border-radius: 7px; background: transparent; color: var(--qrs-muted); cursor: pointer; }\r
.qrs-group-row button:hover, .qrs-prompt-row button:hover { background: var(--qrs-hover); color: var(--qrs-fg); }\r
.qrs-prompt-add { display: inline-flex; align-items: center; gap: 5px; height: 36px; padding: 0 12px; border: 1px solid var(--qrs-border); border-radius: 8px; background: transparent; color: var(--qrs-fg); font: inherit; font-size: 12px; cursor: pointer; }\r
.qrs-prompt-add:hover { background: var(--qrs-hover); }\r
.qrs-prompt-row { display: flex; align-items: center; gap: 3px; min-height: 58px; border-top: 1px solid var(--qrs-border); }\r
.qrs-prompt-row > div { display: grid; gap: 4px; flex: 1; min-width: 0; }\r
.qrs-prompt-row strong { font-size: 12px; }\r
.qrs-prompt-row span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--qrs-muted); font-size: 11px; }\r
\r
@container (max-width: 820px) {\r
  .qrs-workarea.has-companion { flex-direction: column; }\r
  .qrs-workarea.has-companion > .qrs-layout { flex: 1; min-height: 220px; grid-template-columns: min(var(--qrs-list-width), 38%) 1px minmax(0,1fr); }\r
  .qrs-workarea.has-companion .qrs-companion-divider { flex: 0 0 8px; width: 100%; cursor: row-resize; }\r
  .qrs-workarea.has-companion .qrs-companion-divider::after { top: calc(50% - .5px); bottom: auto; left: 0; right: 0; width: 100%; height: 1px; }\r
  .qrs-workarea.has-companion .qrs-companion-divider:hover::after,\r
  .qrs-workarea.has-companion .qrs-companion-divider:focus-visible::after,\r
  .qrs-workarea.has-companion .qrs-companion-divider[data-dragging=true]::after { width: 100%; height: 2px; }\r
  .qrs-workarea.has-companion .qrs-companion { width: 100%; flex: 0 0 var(--qrs-companion-width,44%); min-height: 170px; }\r
  .qrs-settings-page { width: min(900px,100%); }\r
}\r
@container (max-width: 700px) {\r
  .qrs-settings-body { grid-template-columns: 1fr; grid-template-rows: auto minmax(0,1fr); }\r
  .qrs-settings-tabs { flex-direction: row; gap: 4px; padding: 8px 12px; border-right: 0; border-bottom: 1px solid var(--qrs-border); overflow-x: auto; }\r
  .qrs-settings-nav-caption { display: none; }\r
  .qrs-settings-tabs button { white-space: nowrap; padding: 8px; }\r
  .qrs-settings-content { padding: 22px; }\r
  .qrs-theme-options { grid-template-columns: repeat(4,minmax(0,1fr)); }\r
}\r
@container (max-width: 460px) {\r
  .qrs-workarea.has-companion > .qrs-layout { grid-template-columns: minmax(0,1fr); }\r
  .qrs-workarea.has-companion > .qrs-layout > .qrs-sidebar, .qrs-workarea.has-companion > .qrs-layout > .qrs-resize { display: none; }\r
  .qrs-settings-page { border-radius: 0; height: 100%; }\r
  .qrs-settings-head { padding: 14px 16px; }\r
  .qrs-settings-content { padding: 18px 16px; }\r
  .qrs-settings-reading-card .qrs-reading-setting { grid-template-columns: 80px minmax(0,1fr) 48px; }\r
  .qrs-settings-source-head, .qrs-subscriptions-toolbar { flex-direction: column; align-items: stretch; }\r
  .qrs-settings-source-actions { justify-content: flex-start; }\r
  .qrs-settings-support { grid-template-columns: 1fr; }\r
}\r
.qrs-podscribe{flex:1;min-height:0;display:flex;flex-direction:column;padding:0 18px 14px;color:var(--qrs-fg)}\r
.qrs-podscribe-search{display:flex;align-items:center;gap:8px;border:1px solid var(--qrs-border);border-radius:7px;padding:5px 8px;background:var(--qrs-bg)}\r
.qrs-podscribe-search input{flex:1;min-width:0;border:0;outline:0;background:transparent;color:inherit;font:inherit}\r
.qrs-podscribe-search:focus-within{outline:1px solid var(--qrs-accent);outline-offset:1px}\r
.qrs-podscribe-search button,.qrs-podscribe-row button,.qrs-podscribe-next{border:0;border-radius:5px;padding:6px 10px;background:var(--qrs-hover);color:var(--qrs-fg);cursor:pointer}\r
.qrs-podscribe-search button:disabled,.qrs-podscribe-row button:disabled{opacity:.5;cursor:default}\r
.qrs-podscribe-hint{font-size:12px;color:var(--qrs-muted);line-height:1.5}\r
.qrs-podscribe-error{font-size:12px;color:var(--dsw-alias-state-error-primary)}\r
.qrs-podscribe-list{overflow:auto;flex:1;min-height:0}\r
.qrs-podscribe-list h4{margin:12px 0}\r
.qrs-podscribe-row{display:flex;align-items:center;gap:12px;padding:10px 2px;border-bottom:1px solid var(--qrs-border)}\r
.qrs-podscribe-row>div,.qrs-podscribe-row>span{min-width:0;flex:1}\r
.qrs-podscribe-row strong,.qrs-podscribe-row small{display:block}\r
.qrs-podscribe-row strong{font-size:13px;line-height:1.4}\r
.qrs-podscribe-row small{font-size:11px;color:var(--qrs-muted);margin-top:3px}\r
.qrs-podscribe-show{width:100%;text-align:left;background:transparent;color:var(--qrs-fg);border:0;cursor:pointer}\r
.qrs-podscribe-show:hover{background:var(--qrs-hover)}\r
.qrs-podscribe-show img{width:36px;height:36px;object-fit:cover;border-radius:5px}\r
.qrs-podscribe-back{align-self:flex-start;border:0;background:transparent;color:var(--qrs-muted);cursor:pointer;padding:5px 0}\r
.qrs-podscribe-next{display:block;margin:12px auto}\r
\r
/* The selected passage belongs inside the native composer card, separate from its draft. */\r
.qrs-companion-quote-anchor { flex: none; min-width: 0; width: 100%; }\r
.qrs-companion-quote-anchor:empty { display: none; }\r
.qrs-companion-quote { margin: 12px 14px 4px; padding: 9px 11px; border: 0; border-radius: 8px; background: color-mix(in srgb, var(--qrs-fg) 5%, var(--qrs-bg)); color: var(--qrs-fg); }\r
.qrs-companion-quote-heading { display: flex; align-items: center; gap: 8px; min-width: 0; font-size: 11px; line-height: 1.5; }\r
.qrs-companion-quote-heading strong { font-weight: 500; }\r
.qrs-companion-quote-heading span { margin-left: auto; color: var(--qrs-muted); font-size: 10px; }\r
.qrs-companion-quote-heading button { display: grid; place-items: center; flex: none; width: 30px; height: 30px; padding: 0; }\r
.qrs-native-chat .qrs-companion-quote button { appearance: none; border: 0; border-radius: 6px; background: transparent; color: var(--qrs-muted); box-shadow: none; font: inherit; cursor: pointer; }\r
.qrs-native-chat .qrs-companion-quote button:hover:not(:disabled) { background: color-mix(in srgb, var(--qrs-fg) 7%, var(--qrs-bg)); color: var(--qrs-fg); }\r
.qrs-native-chat .qrs-companion-quote button:active:not(:disabled) { background: color-mix(in srgb, var(--qrs-fg) 11%, var(--qrs-bg)); }\r
.qrs-native-chat .qrs-companion-quote button:focus-visible { outline: 1px solid color-mix(in srgb, var(--qrs-fg) 45%, var(--qrs-bg)); outline-offset: -1px; }\r
.qrs-native-chat .qrs-companion-quote button:disabled { opacity: .45; cursor: not-allowed; }\r
.qrs-companion-quote blockquote { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; margin: 3px 0 0; padding: 0; border: 0; color: var(--qrs-fg); font-size: 12px; line-height: 1.65; white-space: pre-wrap; overflow-wrap: anywhere; }\r
.qrs-companion-quote blockquote.is-expanded { display: block; max-height: 160px; overflow-y: auto; }\r
.qrs-native-chat .qrs-companion-quote .qrs-companion-quote-expand { min-height: 28px; margin: 3px 0 -3px; padding: 0 4px; font-size: 11px; }\r
\r
/* Link collection keeps the existing reader palette and list density. */\r
.qrs-collection-panel{display:flex;flex-direction:column;gap:12px;padding:14px 16px;height:100%;min-height:0;box-sizing:border-box}\r
.qrs-collection-heading{display:flex;align-items:center;justify-content:space-between;gap:8px}\r
.qrs-collection-heading h2{font-size:16px;margin:0}\r
.qrs-collection-disclosure,.qrs-original-title{font-size:12px;line-height:1.6;color:var(--qrs-muted);margin:0}\r
.qrs-collection-submit{display:flex;align-items:center;gap:6px}\r
.qrs-collection-submit input{min-width:0;flex:1;min-height:42px;box-sizing:border-box;border:1px solid var(--qrs-border);border-radius:6px;background:var(--qrs-bg);color:var(--qrs-fg);padding:8px 10px;font:inherit;font-size:13px}\r
.qrs-collection-submit input:focus-visible{outline:1px solid var(--qrs-accent);outline-offset:2px}\r
.qrs-collection-button{min-height:40px;border:1px solid var(--qrs-border);border-radius:6px;padding:8px 12px;background:var(--qrs-bg);color:var(--qrs-fg);font:inherit;cursor:pointer}\r
.qrs-collection-button:disabled{opacity:.5;cursor:default}\r
.qrs-collection-toggle{display:flex;align-items:center;gap:8px;margin:14px 0}\r
.qrs-collection-jobs{flex:1;min-height:0;overflow:auto}\r
.qrs-collection-job{display:flex;align-items:center;gap:8px;padding:13px 0;border-bottom:1px solid var(--qrs-border);width:auto;text-align:left;background:transparent}\r
.qrs-collection-job>div:first-child{min-width:0;flex:1}\r
.qrs-collection-job h3{margin:0 0 6px;font-size:15px;font-weight:550;line-height:1.5;overflow-wrap:anywhere}\r
.qrs-collection-job small{color:var(--qrs-muted);font-size:12px}\r
.qrs-collection-job-actions{display:flex;gap:2px}\r
.qrs-collection-error{font-size:12px;color:var(--dsw-alias-state-error-primary);overflow-wrap:anywhere}\r
.qrs-root .qrs-link-menu{position:fixed;right:auto;z-index:120;min-width:215px}\r
.qrs-original-title{margin:-12px 0 22px}\r
\r
/* Labs follows Obsidian's setting rows: information left, controls right. */\r
.qrs-settings-content section.qrs-lab-settings { display:block; }\r
.qrs-lab-settings .qrs-settings-intro { margin-bottom: 12px; }\r
.qrs-lab-settings .qrs-settings-intro h2 { font-size: 20px; }\r
.qrs-lab-rows { max-width: 840px; }\r
.qrs-lab-row { display:flex; align-items:center; justify-content:space-between; gap:24px; padding:16px 0; border-bottom:1px solid var(--qrs-border); }\r
.qrs-lab-info { flex:1; min-width:0; }\r
.qrs-lab-info h3 { margin:0; font-size:14px; font-weight:600; }\r
.qrs-lab-info p { margin:6px 0 0; color:var(--qrs-muted); font-size:12px; line-height:1.65; }\r
.qrs-lab-controls { display:flex; align-items:center; gap:8px; flex:0 1 370px; min-width:0; }\r
.qrs-lab-controls input { width:100%; min-width:0; height:42px; box-sizing:border-box; padding:0 12px; border:1px solid var(--qrs-border); border-radius:6px; background:var(--qrs-bg); color:var(--qrs-fg); font:inherit; font-size:13px; }\r
.qrs-lab-controls input:focus-visible { outline:1px solid var(--qrs-accent); outline-offset:2px; }\r
.qrs-lab-row .qrs-collection-button { flex-shrink:0; white-space:nowrap; font-size:13px; min-height:42px; }\r
.qrs-lab-switch { min-width:44px; min-height:44px; justify-content:center; flex-shrink:0; }\r
.qrs-lab-switch:has(input:disabled) { opacity:.45; cursor:default; }\r
.qrs-lab-note { color:var(--qrs-muted); font-size:12px; line-height:1.6; margin:16px 0; }\r
@media(max-width:760px) {\r
  .qrs-lab-row { gap:12px; flex-wrap:wrap; }\r
  .qrs-lab-controls { flex-basis:100%; }\r
}\r
\r
/* ---- Vietnamese diacritics shaping shield ----\r
   letter-spacing khien Blink coi combining mark la glyph doc lap, dau bi xet roi.\r
   Ep normal toan panel + bat shaping chuan cho khu van ban bai doc. */\r
.qrs-root, .qrs-root * { letter-spacing: normal !important; }\r
.qrs-prose, .qrs-prose * {\r
  text-rendering: optimizeLegibility !important;\r
  font-feature-settings: normal !important;\r
  font-variant-ligatures: normal !important;\r
}\r
`;

// src/client/ReaderPage.jsx
var import_jsx_runtime15 = require("react/jsx-runtime");
var PANEL_CSS = `
.qrs-root{--qrs-bg:var(--dsw-alias-bg-base);--qrs-bg-2:var(--dsw-alias-bg-layer-1);--qrs-fg:var(--dsw-alias-label-primary);--qrs-muted:var(--dsw-alias-label-secondary);--qrs-faint:var(--dsw-alias-label-secondary);--qrs-border:var(--dsw-alias-border-l1);--qrs-border-strong:var(--dsw-alias-border-l2);--qrs-hover:var(--dsw-alias-bg-overlay);--qrs-accent:var(--dsw-alias-brand-primary);--qrs-font-size:19px;--qrs-line-height:1.9;--qrs-article-width:804px;--qrs-list-width:300px;display:flex;flex-direction:column;height:100%;min-width:0;padding:0;color:var(--qrs-fg);background:var(--qrs-bg);outline:none;container-type:inline-size}
.qrs-root{min-height:0;overflow:hidden}.qrs-root button,.qrs-root input,.qrs-root select,.qrs-root textarea{-webkit-app-region:no-drag}.qrs-root :focus-visible{outline:1px solid var(--qrs-accent);outline-offset:2px}.qrs-root *{box-sizing:border-box}
.qrs-workarea{display:flex;flex:1;min-height:0;min-width:0}.qrs-workarea>.qrs-layout{min-width:0}.qrs-workarea.has-companion>.qrs-layout{grid-template-columns:minmax(0,1fr)}.qrs-workarea.has-companion>.qrs-layout>.qrs-sidebar,.qrs-workarea.has-companion>.qrs-layout>.qrs-resize{display:none}.qrs-workarea.has-companion .qrs-reader{display:block}.qrs-companion-divider{flex:0 0 6px;cursor:col-resize;touch-action:none;background:var(--qrs-border);z-index:4}.qrs-companion-divider:hover,.qrs-companion-divider:focus-visible,.qrs-companion-divider[data-dragging=true]{background:var(--qrs-accent)}.qrs-companion{width:var(--qrs-companion-width,44%);flex:0 0 var(--qrs-companion-width,44%);min-width:0;max-width:none;display:flex;flex-direction:column;min-height:0;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary)}.qrs-companion-header{display:flex;align-items:center;gap:8px;padding:8px 12px;flex-shrink:0}.qrs-companion-header strong{flex:1}.qrs-companion-context{padding:8px 12px;border-bottom:1px solid var(--qrs-border);font-size:12px;flex-shrink:0}.qrs-companion-context strong,.qrs-companion-context small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.qrs-companion-context blockquote{max-height:70px;overflow:auto;margin:6px 0;white-space:pre-wrap}.qrs-companion-loading,.qrs-companion-error{padding:16px;font-size:13px;color:var(--dsw-alias-label-secondary)}.qrs-companion-error{color:var(--dsw-alias-state-error-primary)}.qrs-companion-error button{margin-left:8px}.qrs-native-chat{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden}.qrs-native-chat>[data-conversation-content]{flex:1;min-height:0}@container (max-width:700px){.qrs-workarea.has-companion{flex-direction:column}.qrs-workarea.has-companion>.qrs-layout{flex:1;min-height:180px}.qrs-companion-divider{flex-basis:6px;width:100%;cursor:row-resize}.qrs-companion{width:100%;flex:0 0 var(--qrs-companion-width,50%);min-width:0;max-width:none;min-height:180px}}

.qrs-visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.qrs-layout{flex:1;min-height:0;display:grid;grid-template-columns:min(var(--qrs-list-width),calc(100cqw - 330px)) 1px minmax(0,1fr)}
.qrs-sidebar{min-width:0;min-height:0;display:flex;flex-direction:column;background:var(--qrs-bg-2)}
.qrs-sidebar-toolbar{display:flex;align-items:center;gap:2px;height:44px;flex-shrink:0;padding:5px 8px 5px 12px}
.qrs-root .qrs-channel{min-width:0;flex:1;display:flex;align-items:center;justify-content:flex-start;gap:7px;padding:4px 0;height:32px;border:0;background:transparent;color:var(--qrs-fg);font:inherit;font-size:13px;font-weight:600;cursor:pointer}
.qrs-root .qrs-channel:hover{color:var(--qrs-accent)}
.qrs-channel-label{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left}
.qrs-channel-label + svg{flex:0 0 auto;color:var(--qrs-muted)}
.qrs-filters{display:flex;gap:4px;align-items:center;padding:0 12px 8px}
.qrs-root .qrs-filters button{height:26px;padding:2px 10px;font:inherit;font-size:11px;color:var(--qrs-muted);background:transparent;border:0;border-radius:5px;cursor:pointer}
.qrs-root .qrs-filters button[aria-pressed=true]{background:var(--qrs-hover);color:var(--qrs-fg)}
.qrs-filters .qrs-settings-button{margin-left:auto;width:26px;height:26px;padding:4px;display:inline-flex;align-items:center;justify-content:center}
.qrs-search-box{padding:0 12px 10px}
.qrs-search-box input{width:100%;height:30px;font:inherit;font-size:12px;color:var(--qrs-fg);background:var(--qrs-bg);border:.5px solid var(--qrs-border-strong);border-radius:6px;padding:0 9px}
.qrs-search-box.is-hidden{display:none}
.qrs-status{padding:8px 12px;font-size:12px;color:var(--qrs-muted);line-height:1.6}
.qrs-status:empty{display:none}
.qrs-status.is-error{color:var(--dsw-alias-state-error-primary)}
.qrs-list{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain}
.qrs-root button.qrs-entry{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:12px;align-items:start;width:100%;text-align:left;height:auto;white-space:normal;border:0;border-radius:0;background:transparent;color:var(--qrs-fg);padding:12px 16px 13px 22px;cursor:pointer;font:inherit}
.qrs-root button.qrs-entry:not(:has(.qrs-entry-thumb)){grid-template-columns:minmax(0,1fr)}
.qrs-root button.qrs-entry::after{content:'';position:absolute;bottom:0;left:22px;right:16px;height:1px;background:var(--qrs-border);opacity:.6}
.qrs-root button.qrs-entry:hover{background:var(--qrs-hover)}
.qrs-root button.qrs-entry.qrs-selected{background:var(--qrs-hover);box-shadow:inset 2px 0 0 var(--qrs-accent)}
.qrs-entry-copy{display:contents}
.qrs-entry-meta{grid-column:1 / -1;display:flex;align-items:center;gap:8px;min-width:0;color:var(--qrs-muted);font-size:12px;line-height:16px}
.qrs-source-name{overflow:hidden;white-space:nowrap;text-overflow:ellipsis;flex:1;font-weight:500}
.qrs-date{order:1;margin-left:auto;color:var(--qrs-faint);font-variant-numeric:tabular-nums;white-space:nowrap}
.qrs-entry-title{grid-column:1;min-width:0;display:flex;align-items:baseline;gap:6px;margin-top:5px}
.qrs-unread-dot,.qrs-read-dot{flex-shrink:0;width:6px;height:6px;border-radius:50%;background:var(--qrs-accent);position:absolute;left:9px;margin-top:8px}
.qrs-read-dot{background:transparent}
.qrs-entry h3{margin:0;font-size:15px;font-weight:600;line-height:22px;color:var(--qrs-fg);overflow-wrap:anywhere;flex:1;overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2}
.qrs-entry.qrs-no-summary h3{-webkit-line-clamp:3}
.qrs-entry.qrs-read h3{font-weight:400;opacity:.78}
.qrs-entry.qrs-read .qrs-summary{color:var(--qrs-faint)}
.qrs-bookmarked{display:inline-flex;align-items:center;color:var(--qrs-muted)}
.qrs-bookmarked svg{width:12px;height:12px;fill:currentColor}
.qrs-summary{grid-column:1;min-width:0;margin:4px 0 0;color:var(--qrs-muted);font-size:13px;line-height:20px;overflow:hidden;overflow-wrap:anywhere;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2}
.qrs-entry-thumb{grid-column:2;grid-row:2 / span 2;margin-top:7px;width:64px;height:64px;overflow:hidden;border-radius:6px;background:var(--qrs-border)}
.qrs-entry-thumb img{width:100%;height:100%;display:block;object-fit:cover}
.qrs-empty{padding:30px 20px;text-align:center;color:var(--qrs-muted);line-height:1.8;font-size:13px}
.qrs-empty button{margin-top:10px}
.qrs-root .qrs-more{display:block;margin:16px auto 24px;padding:6px 14px;font:inherit;font-size:12px;color:var(--qrs-muted);background:transparent;border:.5px solid var(--qrs-border-strong);border-radius:6px;cursor:pointer}
.qrs-root .qrs-more:hover{background:var(--qrs-hover)}
.qrs-resize{position:relative;background:var(--qrs-border);z-index:4;cursor:col-resize;touch-action:none}
.qrs-resize::after{content:'';position:absolute;left:-4px;top:0;bottom:0;width:9px}
.qrs-resize:hover{background:var(--qrs-border-strong)}
.qrs-reader{min-width:0;min-height:0;overflow:auto;overscroll-behavior:contain;position:relative;outline:none;background:var(--qrs-bg)}
.qrs-reader-toolbar{display:flex;align-items:center;gap:6px;height:44px;padding:5px 12px;position:sticky;top:0;background:var(--qrs-bg);z-index:3}
.qrs-version-switch{display:inline-flex;align-items:center;gap:3px;height:30px;padding:0 7px;border:1px solid var(--qrs-border);border-radius:999px;background:var(--qrs-bg-2);color:var(--qrs-muted);font-size:12px;white-space:nowrap}.qrs-version-switch span{font-size:11px}.qrs-root .qrs-mode-select{appearance:none;border:0;background:transparent;width:auto;max-width:110px;padding:3px 1px;height:26px;font:inherit;font-size:12px;color:var(--qrs-fg);cursor:pointer;outline:none}.qrs-version-switch:focus-within{outline:1px solid var(--qrs-accent);outline-offset:1px}.qrs-root select option{background:#ffffff;color:#1f2329}.qrs-root select optgroup{background:#ffffff;color:#1f2329}
.qrs-root .qrs-mode-select:disabled{opacity:.6;cursor:default}
.qrs-reader-nav{display:flex;gap:0;margin-left:10px}
.qrs-actions{display:flex;align-items:center;gap:2px;margin-left:auto;position:relative}
.qrs-root .qrs-icon{display:inline-flex;flex-shrink:0;align-items:center;justify-content:center;width:32px;height:32px;padding:7px;border:0;border-radius:5px;background:transparent;color:var(--qrs-muted);cursor:pointer}
.qrs-root .qrs-icon:hover{color:var(--qrs-fg);background:var(--qrs-hover)}
.qrs-root .qrs-icon svg{width:17px;height:17px}
.qrs-root .qrs-icon.is-active svg{fill:currentColor}
.qrs-root .qrs-icon.is-loading svg{animation:qrs-spin 1.2s linear infinite}
@keyframes qrs-spin{to{transform:rotate(360deg)}}
.qrs-root.qrs-focus .qrs-layout{grid-template-columns:minmax(0,1fr)}
.qrs-root.qrs-focus .qrs-sidebar,.qrs-root.qrs-focus .qrs-resize{display:none}
.qrs-article{max-width:var(--qrs-article-width);margin:0 auto;padding:30px clamp(24px,5%,60px) 90px}
.qrs-article-head{display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;margin-bottom:14px;color:var(--qrs-muted);font-size:12px;line-height:1.6}
.qrs-article-head .qrs-mode-chip{padding:1px 7px;border:.5px solid var(--qrs-border-strong);border-radius:999px;font-size:11px}
.qrs-article h1{font-size:clamp(24px,2.5cqw,32px);line-height:1.5;margin:0 0 26px;overflow-wrap:anywhere;font-weight:600;text-wrap:balance;font-family:var(--qrs-font-family)}
.qrs-article h1 a{color:inherit;text-decoration:none}
.qrs-article h1 a:hover{text-decoration:underline;text-underline-offset:.15em}
.qrs-prose{font-family:var(--qrs-font-family);font-size:var(--qrs-font-size);line-height:var(--qrs-line-height);overflow-wrap:anywhere;-webkit-user-select:text;user-select:text}
.qrs-prose p{margin:1.1em 0}
.qrs-prose h2{margin:1.8em 0 .7em;font-size:1.3em;line-height:1.6}
.qrs-prose h3{margin:1.6em 0 .6em;font-size:1.12em}
.qrs-prose img{display:block;max-width:100%;height:auto;border-radius:6px;margin:1.2em 0}
.qrs-prose pre{overflow:auto;padding:16px;border-radius:6px;background:var(--qrs-bg-2);font-size:13px;line-height:1.6}
.qrs-prose pre,.qrs-prose code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.qrs-prose blockquote{margin:1.4em 0;padding:16px 20px;border:0;background:var(--qrs-bg-2);border-radius:6px}
.qrs-prose table{display:block;overflow:auto;border-collapse:collapse;max-width:100%}
.qrs-prose td,.qrs-prose th{border:1px solid var(--qrs-border);padding:8px}
.qrs-prose a{color:var(--qrs-accent);text-underline-offset:3px}
.qrs-root[data-images=false] .qrs-prose img{display:none}
.qrs-video-frame{display:block;width:100%;aspect-ratio:16/9;min-height:200px;margin:0 0 26px;border:0;border-radius:8px;background:#000}
/* Electron's internal iframe needs flex layout to fill the webview. */
webview.qrs-video-frame{display:flex}
.qrs-missing{margin-top:24px;padding:22px;border:1px dashed var(--qrs-border-strong);border-radius:10px;text-align:center;color:var(--qrs-muted);font-size:13px;line-height:1.8}
.qrs-welcome{width:min(100%,440px);margin:clamp(48px,14vh,160px) auto 48px;padding:0 28px;text-align:left}
.qrs-welcome-brand{font-size:10px;font-weight:600;letter-spacing:.2em;color:var(--qrs-faint);margin-bottom:28px}
.qrs-welcome h2{font-family:var(--qrs-font-family);font-size:clamp(25px,3vw,34px);font-weight:400;line-height:1.5;margin:0 0 12px;color:var(--qrs-fg)}
.qrs-welcome-intro{font-size:13px;line-height:1.8;color:var(--qrs-muted);margin:0}
.qrs-welcome-keys{display:flex;flex-wrap:wrap;gap:18px;margin-top:44px;color:var(--qrs-faint);font-size:10px}
.qrs-welcome-keys > span{display:flex;align-items:center;gap:5px}
.qrs-welcome-keys kbd{font:inherit;font-size:10px}
.qrs-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);background:var(--dsw-alias-bg-overlay);border:.5px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);border-radius:10px;padding:8px 16px;font-size:13px;box-shadow:0 8px 24px rgba(0,0,0,.18);z-index:60}
.qrs-toast.is-error{color:var(--dsw-alias-state-error-primary)}
.qrs-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.28);display:flex;align-items:center;justify-content:center;z-index:50}
.qrs-menu{position:absolute;top:36px;right:0;min-width:210px;padding:5px;background:var(--dsw-alias-bg-overlay);border:.5px solid var(--dsw-alias-border-l2);border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.22);z-index:20;display:flex;flex-direction:column}
.qrs-menu button{display:flex;align-items:center;gap:9px;padding:7px 10px;font:inherit;font-size:13px;text-align:left;color:var(--qrs-fg);background:transparent;border:0;border-radius:6px;cursor:pointer}
.qrs-menu button:hover{background:var(--qrs-hover)}
.qrs-menu hr{margin:5px 4px;border:0;border-top:.5px solid var(--qrs-border)}
.qrs-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;z-index:55}
.qrs-modal{width:min(480px,92vw);max-height:86vh;display:flex;flex-direction:column;gap:10px;padding:18px;background:var(--dsw-alias-bg-overlay);border:.5px solid var(--dsw-alias-border-l2);border-radius:14px;color:var(--dsw-alias-label-primary);overflow:auto}
.qrs-modal.is-wide{width:min(620px,94vw)}
.qrs-modal h2{margin:0;font-size:15px}
.qrs-modal input[type=text],.qrs-modal input[type=url],.qrs-modal input:not([type]),.qrs-modal select,.qrs-modal textarea{width:100%;font:inherit;font-size:13px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);border:.5px solid var(--dsw-alias-border-l2);border-radius:8px;padding:7px 10px}
.qrs-modal-head{display:flex;align-items:center;justify-content:space-between}
.qrs-modal-body{display:flex;flex-direction:column;gap:10px}
.qrs-modal-actions{display:flex;justify-content:flex-end;gap:8px}
.qrs-modal-actions button,.qrs-modal-row button,.qrs-modal-body button{padding:6px 12px;font:inherit;font-size:13px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2);border:.5px solid var(--dsw-alias-border-l2);border-radius:8px;cursor:pointer}
.qrs-modal-row{display:flex;gap:8px;flex-wrap:wrap}
.qrs-modal-note{margin:0;font-size:12px;color:var(--dsw-alias-label-secondary)}
.qrs-settings-backdrop{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,.32)}
.qrs-settings-page{width:min(820px,100%);height:min(780px,100%);min-height:0;display:flex;flex-direction:column;border:1px solid var(--qrs-border);border-radius:14px;background:var(--dsw-alias-bg-overlay);color:var(--qrs-fg);box-shadow:0 18px 48px rgba(0,0,0,.2);overflow:hidden}
.qrs-settings-head{display:flex;align-items:center;justify-content:space-between;padding:16px 20px 10px}.qrs-settings-head>div{display:flex;align-items:baseline;gap:9px}.qrs-settings-head strong{font-size:18px}.qrs-settings-head span{font-size:12px;color:var(--qrs-muted)}
.qrs-settings-tabs{display:flex;gap:4px;padding:0 16px 10px;border-bottom:1px solid var(--qrs-border)}.qrs-settings-tabs button{border:0;border-radius:7px;background:transparent;color:var(--qrs-muted);padding:7px 14px;font:inherit;cursor:pointer}.qrs-settings-tabs button[aria-current=page]{background:var(--qrs-bg-2);color:var(--qrs-fg);font-weight:600}
.qrs-settings-content{flex:1;min-height:0;overflow:auto;padding:18px 22px}.qrs-settings-content section{display:flex;flex-direction:column;gap:14px}.qrs-settings-content h3{font-size:14px;margin:8px 0 0}.qrs-settings-content p{line-height:1.6}.qrs-settings-content .qrs-reading-settings-fields{max-width:500px}.qrs-settings-content .qrs-reading-setting{grid-template-columns:110px minmax(0,1fr) 54px}.qrs-settings-content .qrs-reading-reset{max-width:500px;margin-top:0}.qrs-settings-content .qrs-field{max-width:560px}.qrs-settings-content .qrs-field input[type=url]{width:100%;padding:8px 10px;border:1px solid var(--qrs-border);border-radius:7px;background:var(--qrs-bg);color:var(--qrs-fg);font:inherit}.qrs-settings-ai{margin-top:8px}
.qrs-settings-content .qrs-modal-row button{border:1px solid var(--qrs-border);border-radius:7px;background:var(--qrs-bg-2);color:var(--qrs-fg);padding:6px 10px;font:inherit;cursor:pointer}.qrs-settings-content .qrs-modal-row{display:flex;gap:8px}
.qrs-settings-footer{display:flex;justify-content:space-between;align-items:center;gap:12px;min-height:55px;padding:10px 20px;border-top:1px solid var(--qrs-border);font-size:12px;color:var(--qrs-muted)}.qrs-settings-footer button{border:0;border-radius:7px;background:var(--qrs-accent);color:white;padding:7px 14px;font:inherit;cursor:pointer}.qrs-settings-footer button:disabled{opacity:.5;cursor:default}
@container (max-width:560px){.qrs-settings-backdrop{padding:0}.qrs-settings-page{width:100%;height:100%;border-radius:0}.qrs-settings-content{padding:16px}.qrs-settings-content .qrs-reading-setting{grid-template-columns:80px minmax(0,1fr) 50px}}
.qrs-field{display:flex;flex-direction:column;gap:5px;font-size:12px;color:var(--dsw-alias-label-secondary)}
.qrs-field-check{flex-direction:row;align-items:center;gap:8px}
.qrs-reading-settings{position:absolute;z-index:5;top:100%;right:12px;max-height:calc(100vh - 180px);overflow:auto;width:300px;max-width:calc(100vw - 32px);padding:14px;border:.5px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);box-shadow:0 10px 30px rgba(0,0,0,.22)}
.qrs-reading-settings-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.qrs-reading-settings-head strong{font-size:14px}
.qrs-reading-settings-head button{padding:4px 10px;font:inherit;font-size:12px;background:var(--dsw-alias-bg-layer-2);border:.5px solid var(--dsw-alias-border-l2);border-radius:7px;color:inherit;cursor:pointer}
.qrs-reading-settings-fields{display:grid;gap:12px}
.qrs-reading-setting{display:grid;grid-template-columns:72px minmax(0,1fr) 54px;align-items:center;gap:8px;color:var(--dsw-alias-label-secondary);font-size:12px}
.qrs-reading-setting select,.qrs-reading-setting input{grid-column:2/-1;min-width:0;font:inherit;font-size:12px;color:inherit;background:var(--dsw-alias-bg-base);border:.5px solid var(--dsw-alias-border-l2);border-radius:7px;padding:5px 8px}
.qrs-reading-setting select{width:100%;height:32px;appearance:auto}.qrs-reading-setting output{white-space:nowrap;grid-column:3;grid-row:1;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}
.qrs-reading-setting input[type=range]{grid-row:2;padding:0;border:0;background:transparent}
.qrs-reading-setting-check{grid-template-columns:84px auto}
.qrs-reading-setting-check input{grid-column:2;justify-self:start}
.qrs-reading-reset{width:100%;margin-top:14px;padding:6px;font:inherit;font-size:12px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);border:.5px solid var(--dsw-alias-border-l2);border-radius:7px;cursor:pointer}
.qrs-channel-backdrop{position:fixed;inset:0;z-index:58;background:rgba(0,0,0,.28);display:flex;align-items:flex-start;justify-content:center;padding-top:12vh}
.qrs-channel-picker{width:min(430px,92vw);max-height:520px;display:flex;flex-direction:column;padding:8px;border:.5px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);box-shadow:0 14px 40px rgba(0,0,0,.28);overflow:hidden}
.qrs-channel-top{display:flex;gap:6px;align-items:center;margin-bottom:8px}
.qrs-channel-top input[type=search]{flex:1;height:36px;font:inherit;font-size:13px;color:inherit;background:var(--dsw-alias-bg-base);border:.5px solid var(--dsw-alias-border-l2);border-radius:8px;padding:0 10px}
.qrs-channel-manage{display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 10px;font:inherit;font-size:12px;color:inherit;background:transparent;border:.5px solid var(--dsw-alias-border-l2);border-radius:8px;cursor:pointer;white-space:nowrap}
.qrs-channel-options{overflow-y:auto;overscroll-behavior:contain;min-height:0}
.qrs-channel-section{padding:14px 10px 5px;color:var(--dsw-alias-label-secondary);font-size:11px}
.qrs-channel-option-wrap{display:flex;align-items:center;border-radius:6px}
.qrs-channel-option{display:flex;align-items:center;gap:9px;min-width:0;flex:1;padding:7px 10px;min-height:36px;text-align:left;border:0;border-radius:6px;background:transparent;color:inherit;font:inherit;cursor:pointer}
.qrs-channel-option:hover{background:var(--dsw-alias-bg-layer-2)}
.qrs-channel-copy{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.qrs-channel-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}
.qrs-channel-subtitle{color:var(--dsw-alias-label-secondary);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.qrs-channel-check{display:flex;flex-shrink:0;color:var(--dsw-alias-brand-primary)}
.qrs-channel-empty{padding:22px 12px;color:var(--dsw-alias-label-secondary);text-align:center;font-size:13px}
.qrs-channel-close{align-self:flex-end;margin-top:6px;padding:5px 12px;font:inherit;font-size:12px;color:inherit;background:transparent;border:.5px solid var(--dsw-alias-border-l2);border-radius:7px;cursor:pointer}
.qmrss-btn{font:inherit;font-size:13px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2);border:.5px solid var(--dsw-alias-border-l2);border-radius:8px;padding:5px 10px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;text-decoration:none}
.qmrss-btn:hover{background:var(--dsw-alias-bg-overlay)}
.qmrss-btn:disabled{opacity:.5;cursor:default}
.qmrss-row{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
.qmrss-empty{padding:14px 6px;color:var(--dsw-alias-label-secondary);text-align:center;font-size:13px;line-height:1.7}
.qmrss-dialog-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;z-index:57}
.qmrss-dialog{background:var(--dsw-alias-bg-overlay);border:.5px solid var(--dsw-alias-border-l2);border-radius:14px;padding:18px;width:min(480px,92vw);max-height:86vh;overflow-y:auto;display:flex;flex-direction:column;gap:10px;color:var(--dsw-alias-label-primary)}
.qmrss-dialog h3{margin:0;font-size:15px}
.qmrss-dialog input,.qmrss-dialog select,.qmrss-dialog textarea{width:100%;font:inherit;font-size:13px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);border:.5px solid var(--dsw-alias-border-l2);border-radius:8px;padding:7px 10px}
.qmrss-dialog fieldset{border:.5px solid var(--dsw-alias-border-l1);border-radius:10px;padding:10px;display:grid;gap:8px}
.qmrss-dialog.qrs-discover{width:min(720px,calc(100vw - 32px));height:min(740px,calc(100vh - 56px));max-height:none;padding:0;gap:0;overflow:hidden;border-radius:16px;box-shadow:0 18px 56px rgba(0,0,0,.18)}
.qrs-discover-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:23px 26px 16px;flex:none}
.qrs-discover-head h3{font-size:19px;line-height:1.4;font-weight:650}
.qrs-discover-head p{margin:4px 0 0;color:var(--dsw-alias-label-secondary);font-size:12px}
.qrs-discover-head .qrs-icon{margin:-4px -6px 0 0;flex:none}
.qrs-discover-filters{padding:0 26px 8px;flex:none}
.qrs-discover-search{display:flex;align-items:center;gap:9px;height:40px;padding:0 12px;background:var(--dsw-alias-bg-layer-2);border:1px solid transparent;border-radius:9px;color:var(--dsw-alias-label-secondary)}
.qrs-discover-search:focus-within{border-color:var(--dsw-alias-brand-primary)}
.qrs-discover-search svg{width:16px;height:16px;flex:none}
.qmrss-dialog .qrs-discover-search input{min-width:0;width:100%;height:100%;padding:0;border:0;background:transparent;outline:0;font-size:13px}
.qrs-discover-categories{display:flex;gap:6px;align-items:center;overflow-x:auto;padding:14px 0 10px}
.qrs-discover-categories button{white-space:nowrap;border:0;border-radius:7px;padding:6px 11px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:13px;cursor:pointer}
.qrs-discover-categories button:hover{background:var(--dsw-alias-bg-layer-2)}
.qrs-discover-categories button.active{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-weight:600}
.qrs-discover-filter-line{height:30px;display:flex;justify-content:space-between;align-items:center;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));font-size:12px}
.qmrss-dialog .qrs-discover-filter-line select{width:auto;max-width:180px;padding:3px 24px 3px 8px;font-size:12px;border:0;background:transparent;cursor:pointer}
.qrs-discover-filter-line select:disabled{opacity:.45;cursor:default}
.qrs-discover-results{overflow-y:auto;min-height:0;flex:1;padding:0 26px}
.qrs-discover-row{display:flex;align-items:center;gap:12px;min-height:68px;border-bottom:.5px solid var(--dsw-alias-border-l1)}
.qrs-discover-avatar{display:grid;place-items:center;width:36px;height:36px;flex:none;border-radius:9px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:15px;font-weight:600}
.qrs-discover-info{display:flex;flex:1;min-width:0;flex-direction:column;gap:3px}
.qrs-discover-info strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:600}
.qrs-discover-info>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary);font-size:11px}
.qrs-discover-dot{padding:0 2px}
.qrs-discover-add{display:inline-flex;align-items:center;justify-content:center;gap:4px;flex:none;min-width:72px;height:30px;padding:0 10px;border:.5px solid var(--dsw-alias-border-l2);border-radius:7px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;cursor:pointer}
.qrs-discover-add:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2)}
.qrs-discover-add:disabled{opacity:.5;cursor:default}
.qrs-discover-add svg{width:13px;height:13px}
.qrs-discover-more{display:block;margin:14px auto 18px;padding:6px 14px;border:0;background:transparent;color:var(--dsw-alias-brand-primary);font:inherit;font-size:12px;cursor:pointer}
.qrs-discover-empty{padding:72px 10px;text-align:center;color:var(--dsw-alias-label-secondary);font-size:13px}
.qrs-discover-foot{flex:none;display:flex;flex-wrap:wrap;gap:4px 12px;justify-content:space-between;border-top:.5px solid var(--dsw-alias-border-l1);padding:10px 26px 14px;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:1.5}
.qrs-discover-foot a{color:inherit;text-decoration:underline;text-underline-offset:2px}
.qrs-discover-message{width:100%;padding:4px 0;color:var(--dsw-alias-label-primary);font-size:12px}
@media (max-width:600px){.qmrss-dialog.qrs-discover{height:calc(100vh - 30px)}.qrs-discover-head{padding:18px 18px 13px}.qrs-discover-filters{padding:0 18px 6px}.qrs-discover-results{padding:0 18px}.qrs-discover-foot{padding:10px 18px}.qrs-discover-avatar{width:32px;height:32px}.qrs-discover-row{gap:9px}}
.qmrss-article{font-size:15px;line-height:1.8}
.qmrss-article h1{font-size:20px;margin:.2em 0 .6em}
.qmrss-article p{margin:.7em 0}
.qmrss-article a{color:var(--dsw-alias-brand-primary)}
.qrs-root{position:relative}.qrs-root[data-titlebar=true]{padding-top:40px}.qrs-root[data-titlebar=true]::before{content:"";position:absolute;top:0;left:0;right:0;height:38px;-webkit-app-region:drag}.qrs-reading-settings{flex-shrink:0}.qrs-reading-setting select{color:var(--dsw-alias-label-primary);padding-right:22px}.qrs-reading-setting input[type=range]{width:100%;height:20px}.qrs-reader-toolbar{height:auto;min-height:44px;flex-wrap:wrap}.qrs-reader-nav{margin-left:0}.qrs-mode-select{flex-shrink:0}
@container (max-width:700px){.qrs-layout{grid-template-columns:min(240px,42cqw) 1px minmax(0,1fr)}.qrs-article{padding:20px 18px 70px}.qrs-actions{margin-left:0}.qrs-reading-settings{position:fixed;right:12px;top:70px}.qrs-entry-thumb{width:44px;height:44px}.qrs-root button.qrs-entry{padding:10px 10px 10px 18px}.qrs-reader-toolbar{gap:2px;padding:4px}.qrs-root .qrs-icon{width:28px;height:28px;padding:5px}}
@container (max-width:460px){.qrs-layout{grid-template-columns:minmax(0,1fr)}.qrs-reader{display:none}.qrs-root.qrs-focus .qrs-reader{display:block}.qrs-resize{display:none}}

`;
var VERSION_LABELS = { original: "B\u1EA3n g\u1ED1c", translation: "B\u1EA3n d\u1ECBch", rewrite: "Gi\u1EA3i th\xEDch AI" };
var FALLBACK_READING = { ...READING_DEFAULTS };
var stylesReady = false;
function ensureStyles() {
  if (stylesReady) return;
  stylesReady = true;
  const style = document.createElement("style");
  style.dataset.plugin = "qiaomu-rss-dsh";
  style.textContent = PANEL_CSS + refinements_default;
  document.head.appendChild(style);
}
function ReaderIcon({ size = 18, active = false }) {
  return /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { style: { color: active ? "var(--dsw-alias-brand-primary)" : "inherit", display: "inline-flex", alignItems: "center" }, children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(Icon2, { name: "tv", size, strokeWidth: 1.8 }) });
}
function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
function ReaderPage({ api, SessionProvider, renderSlot }) {
  const [channels, setChannels] = (0, import_react15.useState)([]);
  const [channel, setChannel] = (0, import_react15.useState)(() => localStorage.getItem("qrs.channel") || "qiaomu");
  const [filter, setFilter] = (0, import_react15.useState)("all");
  const [platform, setPlatform] = (0, import_react15.useState)("all");
  const [query, setQuery] = (0, import_react15.useState)("");
  const [searchOpen, setSearchOpen] = (0, import_react15.useState)(false);
  const [page, setPage] = (0, import_react15.useState)({ entries: [], hasMore: false, nextCursor: void 0 });
  const [loading, setLoading] = (0, import_react15.useState)(true);
  const [loadingMore, setLoadingMore] = (0, import_react15.useState)(false);
  const [pageError, setPageError] = (0, import_react15.useState)("");
  const [refreshing, setRefreshing] = (0, import_react15.useState)(false);
  const [selected, setSelected] = (0, import_react15.useState)(void 0);
  const [toast, setToast] = (0, import_react15.useState)(void 0);
  const [collectionRevision, setCollectionRevision] = (0, import_react15.useState)(0);
  const [linkMenu, setLinkMenu] = (0, import_react15.useState)(null);
  const [dialog, setDialog] = (0, import_react15.useState)(void 0);
  const [settingsEntry, setSettingsEntry] = (0, import_react15.useState)({ tab: "reading", addPrompt: false });
  const [pickerOpen, setPickerOpen] = (0, import_react15.useState)(false);
  const [pickerAnchor, setPickerAnchor] = (0, import_react15.useState)(null);
  (0, import_react15.useEffect)(() => {
    if (dialog) setPickerOpen(false);
  }, [dialog]);
  const openPicker = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const width = Math.min(480, window.innerWidth - 24);
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
    const top = Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - 580));
    setPickerAnchor({ left, top });
    setPickerOpen(true);
  };
  const [appearanceOpen, setAppearanceOpen] = (0, import_react15.useState)(false);
  const [menuOpen, setMenuOpen] = (0, import_react15.useState)(false);
  const [focused, setFocused] = (0, import_react15.useState)(false);
  const [reading, setReading] = (0, import_react15.useState)(FALLBACK_READING);
  const [listWidth, setListWidth] = (0, import_react15.useState)(() => Number(localStorage.getItem("qrs.listWidth")) || 300);
  const [askContext, setAskContext] = (0, import_react15.useState)(null);
  const activeChannelRef = (0, import_react15.useRef)(channel);
  activeChannelRef.current = channel;
  const automaticRefresh = (0, import_react15.useRef)(/* @__PURE__ */ new Map());
  const [passage, setPassage] = (0, import_react15.useState)(null);
  const selectionSerial = (0, import_react15.useRef)(0);
  const proseRef = (0, import_react15.useRef)();
  const rootRef = (0, import_react15.useRef)();
  const workareaRef = (0, import_react15.useRef)();
  const companionDrag = (0, import_react15.useRef)(false);
  const [companionWidth, setCompanionWidth] = (0, import_react15.useState)(() => {
    const saved = Number(localStorage.getItem("qrs.companionWidth"));
    return Number.isFinite(saved) && saved >= 25 && saved <= 75 ? saved : 44;
  });
  const companionWidthRef = (0, import_react15.useRef)(companionWidth);
  (0, import_react15.useEffect)(() => {
    const root = rootRef.current;
    if (!root) return;
    const update = () => {
      const r = root.getBoundingClientRect();
      root.dataset.titlebar = String(window.location.protocol === "dsh-app:" && /Mac/.test(navigator.platform) && r.left < 110 && r.top < 45);
    };
    update();
    if (!globalThis.ResizeObserver) return;
    const observer = new ResizeObserver(update);
    observer.observe(root);
    return () => observer.disconnect();
  }, []);
  (0, import_react15.useEffect)(() => {
    const record = selected?.article;
    if (record) localStorage.setItem("qrs.view." + channel, JSON.stringify({ key: record.key, active: selected.active }));
  }, [selected?.article?.key, selected?.active, channel]);
  (0, import_react15.useEffect)(() => {
    setPassage(null);
  }, [selected?.article?.key]);
  (0, import_react15.useEffect)(() => {
    const highlights = globalThis.CSS?.highlights;
    const HighlightType = globalThis.Highlight;
    if (!highlights || !HighlightType) return;
    const range = passage && proseRef.current ? quoteRange(proseRef.current, passage) : null;
    if (range) highlights.set("qrs-reading-selection", new HighlightType(range));
    else highlights.delete("qrs-reading-selection");
    return () => highlights.delete("qrs-reading-selection");
  }, [passage, selected?.article?.key, selected?.active]);
  const toastTimer = (0, import_react15.useRef)();
  const pageRequest = (0, import_react15.useRef)(0);
  const articleRequest = (0, import_react15.useRef)(0);
  const searchInput = (0, import_react15.useRef)();
  const notify = (message, isError = false) => {
    setToast({ message, isError });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(void 0), isError ? 4200 : 2400);
  };
  const run = async (promise, { errorPrefix = "Thao t\xE1c th\u1EA5t b\u1EA1i" } = {}) => {
    try {
      return await promise;
    } catch (error) {
      notify(`${errorPrefix}: ${error?.message ?? String(error)}`, true);
      return void 0;
    }
  };
  const openCollectionSettings = () => {
    setSettingsEntry({ tab: "lab", addPrompt: false });
    setDialog("settings");
  };
  const openCollection = async (id) => {
    const result = await run(api.openCollectionResult({ id }));
    if (result) await openArticle(result.key, "rewrite");
  };
  (0, import_react15.useEffect)(() => {
    let live = true, timer;
    const delivered = /* @__PURE__ */ new Set();
    const update = async () => {
      try {
        const snapshot = await api.collectionSnapshot();
        if (!live) return;
        setCollectionRevision((value) => value + 1);
        const completed = snapshot.jobs.filter((job) => !job.notified && ["complete", "failed"].includes(job.status) && !delivered.has(job.id));
        if (completed.length) {
          const copy = collectionCopy();
          notify(completed.map((job) => `${copy[job.status]}: ${job.title || job.url}`).join(", "), completed.some((job) => job.status === "failed"));
          completed.forEach((job) => delivered.add(job.id));
          try {
            await api.acknowledgeCollection({ ids: completed.map((job) => job.id).slice(0, 100) });
          } catch {
            completed.forEach((job) => delivered.delete(job.id));
          }
        }
        if (live && snapshot.enabled && snapshot.pending > 0) timer = setTimeout(update, 15e3);
      } catch {
      }
    };
    const changed = () => {
      clearTimeout(timer);
      void loadChannels();
      void update();
    };
    void update();
    window.addEventListener("qrs-collection-changed", changed);
    window.addEventListener("focus", changed);
    return () => {
      live = false;
      clearTimeout(timer);
      window.removeEventListener("qrs-collection-changed", changed);
      window.removeEventListener("focus", changed);
    };
  }, [api]);
  (0, import_react15.useEffect)(() => {
    if (!linkMenu) return;
    const close = (event) => {
      if (event.type !== "keydown" || event.key === "Escape") setLinkMenu(null);
    };
    window.addEventListener("click", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", close);
    };
  }, [linkMenu]);
  const linkContext = (event) => {
    const url = clickedLink(event, event.currentTarget);
    if (!url) return;
    event.preventDefault();
    setLinkMenu({ url, x: Math.max(8, Math.min(event.clientX, window.innerWidth - 240)), y: Math.max(8, Math.min(event.clientY, window.innerHeight - 125)) });
  };
  const applyReading = async (patch) => {
    const next = { ...reading, ...patch };
    setReading(next);
    await run(api.saveSettings(patch), { errorPrefix: "L\u01B0u c\xE0i \u0111\u1EB7t \u0111\u1ECDc th\u1EA5t b\u1EA1i" });
  };
  (0, import_react15.useEffect)(() => {
    void api.getSettings().then((result) => setReading({ ...FALLBACK_READING, ...result.settings })).catch(() => {
    });
    const reload = () => {
      void api.getSettings().then((result) => setReading({ ...FALLBACK_READING, ...result.settings })).catch(() => {
      });
    };
    window.addEventListener("qrs-settings-changed", reload);
    return () => window.removeEventListener("qrs-settings-changed", reload);
  }, [api]);
  const loadChannels = async () => {
    const data = await run(api.listChannels(), { errorPrefix: "\u0110\u1ECDc danh s\xE1ch k\xEAnh th\u1EA5t b\u1EA1i" });
    if (data) setChannels(data.channels);
    return data?.channels ?? [];
  };
  const loadPage = async (cursor, replace = true) => {
    const request = ++pageRequest.current;
    if (replace) setLoading(true);
    else setLoadingMore(true);
    setPageError("");
    try {
      const data = await api.listEntries({ channel, filter, search: query || void 0, cursor });
      if (request !== pageRequest.current) return;
      if (!data || !Array.isArray(data.entries)) throw new Error("D\u1ECBch v\u1EE5 \u0111\u1ECDc tr\u1EA3 v\u1EC1 danh s\xE1ch b\xE0i kh\xF4ng h\u1EE3p l\u1EC7");
      setPage((previous) => replace ? data : {
        entries: [...previous.entries, ...data.entries.filter((entry) => !previous.entries.some((seen) => seen.key === entry.key))],
        hasMore: data.hasMore,
        nextCursor: data.nextCursor
      });
    } catch (error) {
      if (request === pageRequest.current) setPageError(error?.message ?? String(error));
    } finally {
      if (request === pageRequest.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };
  (0, import_react15.useEffect)(() => {
    let cancelled = false;
    void (async () => {
      ensureStyles();
      const loaded = await loadChannels();
      if (cancelled) return;
      if (!loaded.some((item) => item.total > 0)) {
        setRefreshing(true);
        await run(api.refresh(void 0), { errorPrefix: "L\xE0m m\u1EDBi l\u1EA7n \u0111\u1EA7u th\u1EA5t b\u1EA1i" });
        setRefreshing(false);
        await loadChannels();
        if (!cancelled) await loadPage(void 0, true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  (0, import_react15.useEffect)(() => {
    localStorage.setItem("qrs.channel", channel);
    setPage({ entries: [], hasMore: false, nextCursor: void 0 });
    void loadPage(void 0, true);
  }, [channel, filter, query]);
  (0, import_react15.useEffect)(() => {
    const entry = channels.find((item) => item.key === channel);
    if (!entry || channel === "podscribe" || channel === "collection" || entry.total > 0 && (channel === "all" || channel === "feeds:all")) return;
    const last = automaticRefresh.current.get(channel) ?? 0;
    if (Date.now() - last < (entry.total > 0 ? 15 * 6e4 : 6e4)) return;
    automaticRefresh.current.set(channel, Date.now());
    let cancelled = false;
    setRefreshing(true);
    void api.refresh(channel).then((outcome) => {
      if (cancelled || activeChannelRef.current !== channel) return;
      return Promise.all([loadChannels(), loadPage(void 0, true)]).then(() => {
        if (outcome?.error) setPageError(outcome.error);
      });
    }).catch((error) => {
      if (!cancelled && activeChannelRef.current === channel) setPageError(error?.message ?? String(error));
    }).finally(() => setRefreshing(false));
    return () => {
      cancelled = true;
    };
  }, [channel, channels]);
  const openArticle = async (key, restoreVersion) => {
    const request = ++articleRequest.current;
    setSelected({ loading: true, key });
    setPassage(null);
    if (document.querySelector(".qrs-root")?.clientWidth > 0 && document.querySelector(".qrs-root").clientWidth < 460) setFocused(true);
    const data = await run(api.getArticle(key), { errorPrefix: "\u0110\u1ECDc n\u1ED9i dung b\xE0i th\u1EA5t b\u1EA1i" });
    if (request !== articleRequest.current) return;
    if (!data) {
      setSelected({ error: true, key });
      return;
    }
    setSelected({ ...data, article: { ...data.article, read: true }, active: resolveReadingVersion(restoreVersion || reading.defaultVersion, data) });
    document.querySelector(".qrs-reader")?.scrollTo?.({ top: 0 });
    if (data.article?.read === false) {
      void api.setRead([key], true).catch((e) => notify(e.message, true));
      setPage((previous) => ({ ...previous, entries: previous.entries.map((entry) => entry.key === key ? { ...entry, read: true } : entry) }));
    }
  };
  (0, import_react15.useEffect)(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("qrs.view." + channel) || "null");
      if (saved?.key) void openArticle(saved.key, saved.active);
    } catch {
    }
  }, []);
  const refresh = async (target) => {
    setRefreshing(true);
    if (target === "collection") {
      setCollectionRevision((value) => value + 1);
      setRefreshing(false);
      return;
    }
    const outcome = await run(api.refresh(target), { errorPrefix: "L\xE0m m\u1EDBi th\u1EA5t b\u1EA1i" });
    setRefreshing(false);
    if (outcome) {
      const bits = [];
      if (outcome.qiaomu !== void 0) bits.push(`Qiaomu ${outcome.qiaomu} b\xE0i`);
      if (outcome.feeds !== void 0) bits.push(`${outcome.feeds} ngu\u1ED3n \u0111\u0103ng k\xFD`);
      notify(bits.length > 0 ? `\u0110\xE3 l\xE0m m\u1EDBi: ${bits.join(", ")}` : "\u0110\xE3 l\xE0m m\u1EDBi");
    }
    await Promise.all([loadChannels(), loadPage(void 0, true)]);
  };
  const toggleFavorite = async (key, favorite) => {
    const result = await run(api.setFavorite(key, !favorite), { errorPrefix: "\u0110\xE1nh d\u1EA5u y\xEAu th\xEDch th\u1EA5t b\u1EA1i" });
    if (!result) return;
    setPage((previous) => ({ ...previous, entries: previous.entries.map((entry) => entry.key === key ? { ...entry, favorite: !favorite } : entry) }));
    if (selected?.article?.key === key) setSelected((current) => ({ ...current, article: { ...current.article, favorite: !favorite } }));
  };
  const setRead = async (key, read) => {
    const result = await run(api.setRead([key], read), { errorPrefix: "\u0110\xE1nh d\u1EA5u th\u1EA5t b\u1EA1i" });
    if (!result) return;
    setPage((previous) => ({ ...previous, entries: previous.entries.map((entry) => entry.key === key ? { ...entry, read } : entry) }));
    if (selected?.article?.key === key) setSelected((current) => ({ ...current, article: { ...current.article, read } }));
  };
  const generate = async (kind) => {
    const key = selected?.article?.key;
    if (!key) return;
    setSelected((current) => ({ ...current, generating: kind }));
    const version = await run(api.generateVersion(key, kind), { errorPrefix: "T\u1EA1o phi\xEAn b\u1EA3n th\u1EA5t b\u1EA1i" });
    setSelected((current) => {
      if (current?.article?.key !== key) return current;
      return { ...current, generating: void 0, ...version ? {
        active: kind,
        versions: { ...current.versions, [kind]: { ...version, available: true } }
      } : {} };
    });
    if (version) notify(version.source === "qiaomu" ? "\u0110\xE3 t\u1EA3i phi\xEAn b\u1EA3n do vai-crawler t\u1EA1o" : "\u0110\xE3 t\u1EA3i phi\xEAn b\u1EA3n do Harness t\u1EA1o");
  };
  const navigate = (direction) => {
    const index = page.entries.findIndex((entry) => entry.key === selected?.article?.key);
    const target = page.entries[index < 0 ? 0 : index + direction];
    if (target) void openArticle(target.key);
  };
  const startDrag = (event) => {
    event.preventDefault();
    const startX = event.clientX;
    let width = listWidth;
    const move = (moveEvent) => {
      width = Math.round(Math.min(Math.max(startX === 0 ? 300 : listWidth + moveEvent.clientX - startX, 220), 520));
      setListWidth(width);
    };
    const up = () => {
      localStorage.setItem("qrs.listWidth", String(width));
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  (0, import_react15.useEffect)(() => {
    const onKey = (event) => {
      if (dialog || pickerOpen || askContext || appearanceOpen || menuOpen || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.target?.closest?.('input,textarea,select,[contenteditable="true"]')) return;
      if (event.key === "j" || event.key === "k") {
        event.preventDefault();
        navigate(event.key === "j" ? 1 : -1);
      } else if (event.key === "[" || event.key === "f") {
        event.preventDefault();
        setFocused((current) => !current);
      } else if (event.key === "/") {
        event.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInput.current?.focus(), 0);
      } else if (event.key === "Escape") {
        setFocused(false);
        setSearchOpen(false);
        setQuery("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialog, pickerOpen, askContext, appearanceOpen, menuOpen, page.entries, selected?.article?.key]);
  const activeArticle = selected && !selected.loading ? selected : void 0;
  const versions = activeArticle?.versions;
  const active = activeArticle?.active ?? "original";
  const audioUrl = articleAudioUrl(activeArticle?.article);
  const videoEmbed = audioUrl ? null : articleVideoEmbed(activeArticle?.article);
  const currentChannel = channels.find((item) => item.key === channel);
  const bodyHtml = (0, import_react15.useMemo)(() => {
    if (!activeArticle) return "";
    if (active === "original") return activeArticle.html ?? "";
    const markdown = versions?.[active]?.markdown;
    return markdown ? markdownToHtml(markdown) : "";
  }, [activeArticle, active, versions]);
  (0, import_react15.useEffect)(() => {
    if (askContext && activeArticle?.article) setAskContext((previous) => ({ ...previous, key: activeArticle.article.key, title: activeArticle.article.titleZh || activeArticle.article.title, version: active, selection: previous.key === activeArticle.article.key && previous.version === active ? previous.selection : "", quoteId: previous.key === activeArticle.article.key && previous.version === active ? previous.quoteId : void 0 }));
  }, [activeArticle?.article?.key, active]);
  const openCompanion = (quote = "") => {
    if (!activeArticle) return;
    setFocused(false);
    setAskContext({ key: activeArticle.article.key, title: activeArticle.article.titleZh || activeArticle.article.title, version: active, selection: quote, quoteId: quote ? ++selectionSerial.current : void 0 });
  };
  const selectChannel = (key) => {
    if (key === channel) return;
    articleRequest.current++;
    setAskContext(null);
    setFocused(false);
    setSelected(void 0);
    setPassage(null);
    setFilter("all");
    setPlatform("all");
    setQuery("");
    setChannel(key);
  };
  const captureSelection = () => {
    const found = selectedPassage(proseRef.current);
    if (found?.quote === passage?.quote) return;
    setPassage(found);
    if (found) openCompanion(found.quote);
  };
  const theme = reading.readingTheme && reading.readingTheme !== "auto" ? reading.readingTheme : null;
  const THEME_COLORS = { light: ["#ffffff", "#202124"], paper: ["#f5efdf", "#40382e"], sage: ["#e8eee3", "#29382c"], mist: ["#e7edf2", "#293741"], dark: ["#252525", "#dedede"], black: ["#090909", "#cccccc"] };
  return /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
    "div",
    {
      ref: rootRef,
      className: `qrs-root${focused ? " qrs-focus" : ""}`,
      tabIndex: 0,
      "data-images": String(reading.showImages !== false),
      "data-reading-theme": theme ?? "auto",
      style: {
        "--qrs-list-width": `${listWidth}px`,
        "--qrs-font-size": `${reading.fontSize}px`,
        "--qrs-line-height": reading.lineHeight,
        "--qrs-article-width": `${reading.fontSize * reading.textWidth + 120}px`,
        "--qrs-font-family": fontStack(reading),
        ...theme ? { "--qrs-bg": THEME_COLORS[theme][0], "--qrs-bg-2": THEME_COLORS[theme][0], "--qrs-fg": THEME_COLORS[theme][1], "--qrs-chat-bg": THEME_COLORS[theme][0], "--qrs-chat-fg": THEME_COLORS[theme][1] } : {}
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { ref: workareaRef, style: { "--qrs-companion-width": `${companionWidth}%` }, className: `qrs-workarea${askContext ? " has-companion" : ""}`, children: [
          /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { className: "qrs-layout", children: [
            /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("aside", { className: "qrs-sidebar", children: [
              /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { className: "qrs-sidebar-toolbar", children: [
                /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("button", { type: "button", className: "qrs-channel", "aria-haspopup": "dialog", "aria-expanded": pickerOpen, onClick: openPicker, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(ChannelMark, { channel: currentChannel ?? { key: "qiaomu", name: "AI Engineer World's Fair" }, size: 26 }),
                  /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { className: "qrs-channel-label", children: currentChannel?.name ?? "AI Engineer World's Fair" }),
                  /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(Icon2, { name: "chevron-down", size: 13 })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("button", { type: "button", className: "qrs-icon", title: "Kh\xE1m ph\xE1 ngu\u1ED3n", "aria-label": "Kh\xE1m ph\xE1 ngu\u1ED3n", onClick: () => setDialog("discover"), children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(Icon2, { name: "plus" }) }),
                channel !== "collection" && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("button", { type: "button", className: "qrs-icon", title: "T\xECm ki\u1EBFm", "aria-label": "T\xECm ki\u1EBFm", onClick: () => {
                  setSearchOpen((open) => !open);
                  setTimeout(() => searchInput.current?.focus(), 0);
                }, children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(Icon2, { name: "search" }) }),
                channel !== "collection" && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("button", { type: "button", className: `qrs-icon${refreshing ? " is-loading" : ""}`, title: "L\xE0m m\u1EDBi", "aria-label": "L\xE0m m\u1EDBi", onClick: () => void refresh(channel), children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(Icon2, { name: "refresh-cw" }) })
              ] }),
              channel !== "collection" && /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { className: "qrs-filters", role: "group", children: [
                [["all", "T\u1EA5t c\u1EA3"], ["unread", "Ch\u01B0a \u0111\u1ECDc"], ["favorites", "Y\xEAu th\xEDch"]].map(([value, label]) => /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("button", { type: "button", "aria-pressed": filter === value, onClick: () => setFilter(value), children: label }, value)),
                currentChannel?.kind === "community" && [["all", "T\u1EA5t c\u1EA3"], ...PLATFORMS].map(([value, label]) => /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("button", { type: "button", "data-platform": value, "aria-pressed": platform === value, onClick: () => setPlatform(value), children: label }, value)),
                /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("button", { type: "button", className: "qrs-settings-button", title: "C\xE0i \u0111\u1EB7t", "aria-label": "C\xE0i \u0111\u1EB7t", onClick: () => setDialog("settings"), children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(Icon2, { name: "settings", size: 17 }) })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { className: `qrs-search-box${searchOpen && channel !== "collection" ? "" : " is-hidden"}`, children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                "input",
                {
                  ref: searchInput,
                  type: "search",
                  "aria-label": "T\xECm b\xE0i vi\u1EBFt",
                  placeholder: "T\xECm trong c\xE1c b\xE0i \u0111\xE3 t\u1EA3i\u2026",
                  value: query,
                  onChange: (event) => setQuery(event.target.value),
                  onKeyDown: (event) => {
                    if (event.key === "Escape") {
                      event.stopPropagation();
                      setSearchOpen(false);
                      setQuery("");
                    }
                  }
                }
              ) }),
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { className: `qrs-status${pageError ? " is-error" : ""}`, role: "status", "aria-live": "polite", children: pageError ? pageError : "" }),
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { className: "qrs-list", children: channel === "collection" ? /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(CollectionPanel, { api, revision: collectionRevision, onOpen: openCollection, onSettings: openCollectionSettings, notify }) : /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(import_jsx_runtime15.Fragment, { children: [
                pageError && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { className: "qrs-empty", children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("button", { type: "button", onClick: () => void loadPage(void 0, true), children: "Th\u1EED l\u1EA1i" }) }),
                !pageError && loading && page.entries.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { className: "qrs-empty", children: "\u0110ang t\u1EA3i\u2026" }),
                !pageError && !loading && page.entries.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { className: "qrs-empty", children: filter === "favorites" ? "Ch\u01B0a c\xF3 b\xE0i y\xEAu th\xEDch" : filter === "unread" ? "Kh\xF4ng c\xF3 b\xE0i ch\u01B0a \u0111\u1ECDc" : refreshing ? "\u0110ang l\u1EA5y b\xE0i c\u1EE7a k\xEAnh n\xE0y\u2026" : "K\xEAnh n\xE0y ch\u01B0a c\xF3 b\xE0i, s\u1EBD t\u1EF1 th\u1EED c\u1EADp nh\u1EADt sau." }),
                page.entries.filter((entry) => platform === "all" || currentChannel?.kind !== "community" || platformOf(entry.url) === platform).map((entry) => /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
                  "button",
                  {
                    type: "button",
                    className: `qrs-entry${selected?.article?.key === entry.key ? " qrs-selected" : ""}${entry.read ? " qrs-read" : ""}${entry.summary ? "" : " qrs-no-summary"}`,
                    "aria-pressed": selected?.article?.key === entry.key,
                    onClick: () => void openArticle(entry.key),
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("span", { className: "qrs-entry-copy", children: [
                        /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("span", { className: "qrs-entry-meta", children: [
                          /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { className: "qrs-source-name", children: entry.channelName || channels.find((item) => item.key === entry.channelKey)?.name || currentChannel?.name }),
                          /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { className: "qrs-date", children: formatDate(entry.publishedAt) })
                        ] }),
                        /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("span", { className: "qrs-entry-title", children: [
                          /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { className: entry.read ? "qrs-read-dot" : "qrs-unread-dot", "aria-hidden": "true" }),
                          /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { className: "qrs-visually-hidden", children: entry.read ? "\u0110\xE3 \u0111\u1ECDc" : "Ch\u01B0a \u0111\u1ECDc" }),
                          /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("h3", { children: entry.titleZh ?? entry.title }),
                          entry.favorite && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { className: "qrs-bookmarked", children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(Icon2, { name: "bookmark", size: 12 }) })
                        ] }),
                        entry.summary && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("p", { className: "qrs-summary", children: entry.summary })
                      ] }),
                      entry.image && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { className: "qrs-entry-thumb", children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("img", { src: entry.image, alt: "", loading: "lazy", referrerPolicy: "no-referrer" }) })
                    ]
                  },
                  entry.key
                )),
                page.hasMore && page.nextCursor && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("button", { type: "button", className: "qrs-more", disabled: loadingMore, onClick: () => void loadPage(page.nextCursor, false), children: loadingMore ? "\u0110ang t\u1EA3i\u2026" : "T\u1EA3i b\xE0i c\u0169 h\u01A1n" })
              ] }) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
              "div",
              {
                className: "qrs-resize",
                role: "separator",
                "aria-orientation": "vertical",
                onPointerDown: startDrag,
                onDoubleClick: () => {
                  setListWidth(300);
                  localStorage.setItem("qrs.listWidth", "300");
                }
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("section", { className: "qrs-reader", tabIndex: 0, children: selected?.loading ? /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { className: "qrs-article-loading", role: "status", "aria-label": "\u0110ang t\u1EA3i b\xE0i vi\u1EBFt", children: [
              /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { className: "qrs-reader-toolbar qrs-skeleton-toolbar", "aria-hidden": "true", children: [
                /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { className: "qrs-skeleton qrs-skeleton-icon" }),
                /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { className: "qrs-skeleton qrs-skeleton-pill" }),
                /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { className: "qrs-skeleton qrs-skeleton-icon" }),
                /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { className: "qrs-skeleton qrs-skeleton-icon" })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { className: "qrs-article qrs-article-skeleton", "aria-hidden": "true", children: [
                /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { className: "qrs-skeleton qrs-skeleton-meta" }),
                /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { className: "qrs-skeleton qrs-skeleton-title" }),
                /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { className: "qrs-skeleton qrs-skeleton-title short" }),
                /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { className: "qrs-skeleton-paragraph", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { className: "qrs-skeleton" }),
                  /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { className: "qrs-skeleton" }),
                  /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { className: "qrs-skeleton" })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { className: "qrs-skeleton-paragraph", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { className: "qrs-skeleton" }),
                  /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { className: "qrs-skeleton" }),
                  /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { className: "qrs-skeleton" })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { className: "qrs-skeleton-paragraph", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { className: "qrs-skeleton" }),
                  /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { className: "qrs-skeleton" })
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { className: "qrs-visually-hidden", children: "\u0110ang t\u1EA3i b\xE0i vi\u1EBFt\u2026" })
            ] }) : selected?.error ? /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { className: "qrs-article-load-error", role: "alert", children: [
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(Icon2, { name: "file-check", size: 22 }),
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("h2", { children: "Kh\xF4ng th\u1EC3 m\u1EDF b\xE0i vi\u1EBFt" }),
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("p", { children: "Vui l\xF2ng th\u1EED \u0111\u1ECDc l\u1EA1i b\xE0i n\xE0y." }),
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("button", { type: "button", onClick: () => void openArticle(selected.key), children: "T\u1EA3i l\u1EA1i" })
            ] }) : !activeArticle ? /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { className: "qrs-welcome", children: [
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { className: "qrs-welcome-brand", children: "AI ENGINEER WORLD'S FAIR" }),
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("h2", { children: "\u0110\u1ECDc k\xEAnh AI Engineer trong Harness" }),
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("p", { className: "qrs-welcome-intro", children: "B\xEAn tr\xE1i l\xE0 danh s\xE1ch k\xEAnh v\xE0 b\xE0i vi\u1EBFt: chuy\u1EC3n gi\u1EEFa T\u1EA5t c\u1EA3, Ch\u01B0a \u0111\u1ECDc, Y\xEAu th\xEDch; b\u1EA5m ti\xEAu \u0111\u1EC1 \u0111\u1EC3 b\u1EAFt \u0111\u1EA7u \u0111\u1ECDc. B\u1EA3n d\u1ECBch v\xE0 b\u1EA3n Gi\u1EA3i th\xEDch AI \u0111i k\xE8m b\xE0i vi\u1EBFt, n\u1EBFu thi\u1EBFu s\u1EBD \u0111\u01B0\u1EE3c t\u1EA1o b\u1EB1ng m\xF4 h\xECnh m\u1EB7c \u0111\u1ECBnh c\u1EE7a Harness." }),
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { className: "qrs-welcome-keys", children: [["J / K", "B\xE0i tr\u01B0\u1EDBc / b\xE0i sau"], ["[", "\u0110\u1ECDc t\u1EADp trung"], ["/", "T\xECm b\xE0i vi\u1EBFt"]].map(([key, label]) => /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("span", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("kbd", { children: key }),
                /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { children: label })
              ] }, key)) })
            ] }) : /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(import_jsx_runtime15.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { className: "qrs-reader-toolbar", children: [
                /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                  "button",
                  {
                    type: "button",
                    className: "qrs-icon",
                    title: askContext ? "Ch\u1ECDn k\xEAnh" : focused ? "Hi\u1EC7n danh s\xE1ch" : "\u0110\u1ECDc t\u1EADp trung",
                    "aria-label": askContext ? "Ch\u1ECDn k\xEAnh" : focused ? "Hi\u1EC7n danh s\xE1ch" : "\u0110\u1ECDc t\u1EADp trung",
                    onClick: (event) => askContext ? openPicker(event) : setFocused((current) => !current),
                    children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(Icon2, { name: askContext ? "panel-left-open" : focused ? "panel-left-open" : "panel-left-close" })
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("label", { className: "qrs-visually-hidden", htmlFor: "qrs-mode", children: "Phi\xEAn b\u1EA3n \u0111\u1ECDc" }),
                /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { className: "qrs-version-switch", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { "aria-hidden": "true", children: "Phi\xEAn b\u1EA3n" }),
                  /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("select", { id: "qrs-mode", className: "qrs-mode-select", value: active, onChange: (event) => {
                    setPassage(null);
                    setSelected((current) => ({ ...current, active: event.target.value }));
                  }, children: ["original", "translation", "rewrite"].map((kind) => {
                    const available = kind === "original" || versions?.[kind]?.available;
                    return /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("option", { value: kind, children: [
                      VERSION_LABELS[kind],
                      available ? "" : " (thi\u1EBFu)"
                    ] }, kind);
                  }) }),
                  /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(Icon2, { name: "chevron-down", size: 12 })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { className: "qrs-reader-nav", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("button", { type: "button", className: "qrs-icon", title: "B\xE0i tr\u01B0\u1EDBc", "aria-label": "B\xE0i tr\u01B0\u1EDBc", onClick: () => navigate(-1), children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(Icon2, { name: "chevron-up" }) }),
                  /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("button", { type: "button", className: "qrs-icon", title: "B\xE0i sau", "aria-label": "B\xE0i sau", onClick: () => navigate(1), children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(Icon2, { name: "chevron-down" }) })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { className: "qrs-actions", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                    "button",
                    {
                      type: "button",
                      className: `qrs-icon${activeArticle.article.favorite ? " is-active" : ""}`,
                      title: activeArticle.article.favorite ? "B\u1ECF y\xEAu th\xEDch" : "Y\xEAu th\xEDch",
                      "aria-label": "Y\xEAu th\xEDch",
                      "aria-pressed": Boolean(activeArticle.article.favorite),
                      onClick: () => void toggleFavorite(activeArticle.article.key, activeArticle.article.favorite),
                      children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(Icon2, { name: "bookmark" })
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                    "button",
                    {
                      type: "button",
                      className: "qrs-icon",
                      title: activeArticle.article.read ? "\u0110\xE1nh d\u1EA5u ch\u01B0a \u0111\u1ECDc" : "\u0110\xE1nh d\u1EA5u \u0111\xE3 \u0111\u1ECDc",
                      "aria-label": "Tr\u1EA1ng th\xE1i \u0111\xE3 \u0111\u1ECDc",
                      "aria-pressed": Boolean(activeArticle.article.read),
                      onClick: () => void setRead(activeArticle.article.key, !activeArticle.article.read),
                      children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(Icon2, { name: activeArticle.article.read ? "circle-check" : "circle" })
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("button", { type: "button", className: "qrs-icon", title: "Tr\u1EE3 l\xFD AI", "aria-label": "Tr\u1EE3 l\xFD AI", onClick: () => openCompanion(passage?.quote ?? ""), children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(Icon2, { name: "wand-sparkles" }) }),
                  /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                    "button",
                    {
                      type: "button",
                      className: "qrs-icon",
                      title: "Thao t\xE1c kh\xE1c",
                      "aria-label": "Thao t\xE1c kh\xE1c",
                      "aria-expanded": menuOpen,
                      onClick: () => setMenuOpen((open) => !open),
                      children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(Icon2, { name: "ellipsis" })
                    }
                  ),
                  menuOpen && /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { className: "qrs-menu", role: "menu", children: [
                    /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("button", { type: "button", onClick: () => {
                      setMenuOpen(false);
                      setAppearanceOpen(true);
                    }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(Icon2, { name: "type", size: 15 }),
                      "C\xE0i \u0111\u1EB7t \u0111\u1ECDc"
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("button", { type: "button", onClick: () => {
                      setMenuOpen(false);
                      openCompanion(passage?.quote ?? "");
                    }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(Icon2, { name: "wand-sparkles", size: 15 }),
                      "H\u1ECFi AI"
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("hr", {}),
                    activeArticle.article.url && /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("button", { type: "button", onClick: () => {
                      setMenuOpen(false);
                      window.open(activeArticle.article.url, "_blank", "noopener,noreferrer");
                    }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(Icon2, { name: "globe", size: 15 }),
                      "M\u1EDF b\u1EA3n g\u1ED1c"
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("button", { type: "button", onClick: () => {
                      setMenuOpen(false);
                      try {
                        printArticle({ title: activeArticle.article.title, url: activeArticle.article.url, version: VERSION_LABELS[active], html: bodyHtml });
                      } catch (error) {
                        notify(`In th\u1EA5t b\u1EA1i: ${error?.message ?? String(error)}`, true);
                      }
                    }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(Icon2, { name: "file-check", size: 15 }),
                      "In / l\u01B0u PDF"
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("button", { type: "button", onClick: () => {
                      setMenuOpen(false);
                      void openArticle(activeArticle.article.key);
                    }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(Icon2, { name: "refresh-cw", size: 15 }),
                      "T\u1EA3i l\u1EA1i b\xE0i vi\u1EBFt"
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("button", { type: "button", onClick: () => {
                      setMenuOpen(false);
                      selectChannel("collection");
                    }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(Icon2, { name: "rss", size: 15 }),
                      collectionCopy().jobs
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("button", { type: "button", onClick: () => {
                      setMenuOpen(false);
                      setDialog("settings");
                    }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(Icon2, { name: "settings", size: 15 }),
                      "C\xE0i \u0111\u1EB7t"
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("button", { type: "button", onClick: (event) => {
                      setMenuOpen(false);
                      openPicker(event);
                    }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(Icon2, { name: "rss", size: 15 }),
                      "Ch\u1ECDn k\xEAnh"
                    ] })
                  ] }),
                  appearanceOpen && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(ReadingAppearance, { settings: reading, onChange: applyReading, onClose: () => setAppearanceOpen(false) })
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("article", { className: "qrs-article", onContextMenu: linkContext, children: [
                /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { className: "qrs-article-head", children: [
                  activeArticle.article.channelName && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { children: activeArticle.article.channelName }),
                  activeArticle.article.publishedAt && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { children: new Date(activeArticle.article.publishedAt).toLocaleDateString("zh-CN") }),
                  activeArticle.article.author && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { children: activeArticle.article.author }),
                  /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { className: "qrs-mode-chip", children: VERSION_LABELS[active] })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("h1", { children: activeArticle.article.url ? /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("a", { href: activeArticle.article.url, target: "_blank", rel: "noopener noreferrer", children: activeArticle.article.titleZh ?? activeArticle.article.title }) : activeArticle.article.titleZh ?? activeArticle.article.title }),
                activeArticle.article.titleZh && activeArticle.article.titleZh !== activeArticle.article.title && activeArticle.article.key.startsWith("collection:") && /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("p", { className: "qrs-original-title", children: [
                  collectionCopy().original,
                  ": ",
                  activeArticle.article.title
                ] }),
                audioUrl && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(MediaDock, { episode: { ...activeArticle.article, audio: audioUrl } }, activeArticle.article.key),
                videoEmbed && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(VideoPlayer, { embed: videoEmbed, playerUrl: activeArticle.videoPlayerUrl }, videoEmbed),
                bodyHtml ? /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { ref: proseRef, className: "qrs-prose", onMouseUp: captureSelection, onKeyUp: captureSelection, dangerouslySetInnerHTML: { __html: sanitizeHtml(bodyHtml, { baseUrl: activeArticle.article.url, maxLength: activeArticle.article.key.startsWith("podscribe:") ? 2e6 : void 0 }) } }) : /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { className: "qrs-missing", children: [
                  "Phi\xEAn b\u1EA3n n\xE0y ch\u01B0a c\xF3 n\u1ED9i dung.",
                  active !== "original" && /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(import_jsx_runtime15.Fragment, { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("br", {}),
                    /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
                      "button",
                      {
                        type: "button",
                        className: "qrs-more",
                        style: { display: "inline-block" },
                        disabled: selected?.generating === active,
                        onClick: () => void generate(active),
                        children: selected?.generating === active ? "\u0110ang t\u1EA1o\u2026" : "T\u1EA1o b\u1EB1ng m\xF4 h\xECnh m\u1EB7c \u0111\u1ECBnh c\u1EE7a Harness"
                      }
                    )
                  ] })
                ] })
              ] })
            ] }) })
          ] }),
          askContext && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
            "div",
            {
              className: "qrs-companion-divider",
              role: "separator",
              "aria-label": "\u0110i\u1EC1u ch\u1EC9nh \u0111\u1ED9 r\u1ED9ng b\xE0i v\xE0 tr\u1EE3 l\xFD",
              "aria-orientation": "vertical",
              "aria-valuemin": 25,
              "aria-valuemax": 75,
              "aria-valuenow": companionWidth,
              tabIndex: 0,
              onPointerDown: (event) => {
                event.preventDefault();
                companionDrag.current = true;
                event.currentTarget.setPointerCapture(event.pointerId);
                event.currentTarget.dataset.dragging = "true";
              },
              onPointerMove: (event) => {
                if (!companionDrag.current) return;
                const area = workareaRef.current;
                const rect = area?.getBoundingClientRect();
                if (!rect) return;
                const vertical = getComputedStyle(area).flexDirection === "column";
                const total = vertical ? rect.height : rect.width;
                const span = vertical ? rect.bottom - event.clientY : rect.right - event.clientX;
                const minimum = Math.min(320, total * 0.3);
                const amount = Math.max(minimum, Math.min(span, total - minimum));
                companionWidthRef.current = Math.round(amount / total * 100);
                setCompanionWidth(companionWidthRef.current);
              },
              onPointerUp: (event) => {
                companionDrag.current = false;
                event.currentTarget.dataset.dragging = "false";
                localStorage.setItem("qrs.companionWidth", String(companionWidthRef.current));
              },
              onPointerCancel: (event) => {
                companionDrag.current = false;
                event.currentTarget.dataset.dragging = "false";
              },
              onKeyDown: (event) => {
                const step = event.shiftKey ? 10 : 2;
                if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
                  event.preventDefault();
                  const next = Math.max(25, Math.min(75, companionWidth + (["ArrowLeft", "ArrowUp"].includes(event.key) ? step : -step)));
                  companionWidthRef.current = next;
                  setCompanionWidth(next);
                  localStorage.setItem("qrs.companionWidth", String(next));
                }
              },
              onDoubleClick: () => {
                companionWidthRef.current = 44;
                setCompanionWidth(44);
                localStorage.setItem("qrs.companionWidth", "44");
              }
            }
          ),
          askContext && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(AskArticle, { api, context: askContext, onClearSelection: () => {
            setPassage(null);
            window.getSelection()?.removeAllRanges();
            setAskContext((previous) => previous ? { ...previous, selection: "", quoteId: void 0 } : previous);
          }, SessionProvider, renderSlot, onClose: () => setAskContext(null), onManagePrompts: () => {
            setSettingsEntry({ tab: "prompts", addPrompt: true });
            setDialog("settings");
          } })
        ] }),
        pickerOpen && !dialog && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
          ChannelPicker,
          {
            channels,
            current: channel,
            anchor: pickerAnchor,
            onClose: () => setPickerOpen(false),
            onSelect: selectChannel,
            onManage: () => {
              setPickerOpen(false);
              setDialog("settings");
            }
          }
        ),
        dialog === "discover" && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(Discover, { api, onClose: () => setDialog(void 0), onAdded: loadChannels, onRead: (key) => {
          setDialog(void 0);
          selectChannel(key);
        }, onPodcastImported: async (key) => {
          setDialog(void 0);
          selectChannel("podscribe");
          await loadChannels();
          await openArticle(key);
        } }),
        dialog === "add" && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(AddFeedDialog, { api, onClose: () => setDialog(void 0), onDone: async () => {
          await loadChannels();
          await loadPage(void 0, true);
        }, notify }),
        dialog === "settings" && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(SettingsPage, { api, onCollection: () => {
          setDialog(void 0);
          selectChannel("collection");
        }, initialTab: settingsEntry.tab, startAddingPrompt: settingsEntry.addPrompt, onClose: () => {
          setDialog(void 0);
          setSettingsEntry({ tab: "reading", addPrompt: false });
        }, notify }),
        linkMenu && /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { className: "qrs-menu qrs-link-menu", role: "menu", style: { left: linkMenu.x, top: linkMenu.y }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("button", { type: "button", role: "menuitem", autoFocus: true, onClick: () => {
            void navigator.clipboard.writeText(linkMenu.url).then(() => notify(collectionCopy().copied)).catch((error) => notify(error.message, true));
            setLinkMenu(null);
          }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(Icon2, { name: "file-check", size: 15 }),
            collectionCopy().copy
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("button", { type: "button", role: "menuitem", onClick: () => {
            const url = linkMenu.url;
            setLinkMenu(null);
            void api.getCollectionSettings().then((settings) => {
              if (!settings.enabled || !settings.verified) {
                openCollectionSettings();
                return;
              }
              if (window.confirm(collectionCopy().disclosure + "\n\n" + url)) void run(api.submitCollection({ url })).then((result) => {
                if (result) {
                  notify(collectionCopy().submitted);
                  window.dispatchEvent(new Event("qrs-collection-changed"));
                }
              });
            }).catch((error) => notify(error.message, true));
          }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(Icon2, { name: "rss", size: 15 }),
            collectionCopy().request
          ] })
        ] }),
        toast && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { role: "status", "aria-live": "polite", className: `qrs-toast${toast.isError ? " is-error" : ""}`, children: toast.message })
      ]
    }
  );
}

// src/client/ReaderBoundary.jsx
var import_react16 = require("react");
var import_jsx_runtime16 = require("react/jsx-runtime");
var ReaderBoundary = class extends import_react16.Component {
  state = { error: null, attempt: 0 };
  static getDerivedStateFromError(error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
  render() {
    if (this.state.error) return /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { role: "alert", style: { padding: 24, color: "var(--dsw-alias-label-primary)" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("h2", { children: "Kh\xF4ng t\u1EA3i \u0111\u01B0\u1EE3c trang AI Engineer World's Fair" }),
      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("p", { style: { whiteSpace: "pre-wrap" }, children: this.state.error }),
      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("button", { type: "button", onClick: () => this.setState((state) => ({ error: null, attempt: state.attempt + 1 })), children: "M\u1EDF l\u1EA1i tr\xECnh \u0111\u1ECDc" })
    ] });
    return /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(ReaderPage, { ...this.props }, this.state.attempt);
  }
};
function ReaderPanel(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(ReaderBoundary, { ...props });
}

// src/client/vai-api.js
var DEFAULT_BASE = typeof location !== "undefined" && location.hostname && location.hostname !== "localhost" && location.hostname !== "127.0.0.1" ? `${location.protocol}//${location.hostname}:8600` : "http://10.0.10.195:8600";
var CHANNEL_KEY = "ai-engineer";
var CHANNEL_NAME = "AI Engineer";
var STORE_KEYS = {
  read: "vai_yt_read",
  favorite: "vai_yt_fav",
  settings: "vai_yt_settings",
  base: "vai_yt_api_base"
};
function apiBase() {
  return localStorage.getItem(STORE_KEYS.base) || DEFAULT_BASE;
}
async function http(path, options) {
  const response = await fetch(apiBase() + path, options);
  if (!response.ok) throw new Error(`vai-crawler HTTP ${response.status}`);
  return response.json();
}
function mapGet(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    return {};
  }
}
function mapSet(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function publishedMs(value) {
  if (typeof value === "number") return value;
  const ms = Date.parse(value ?? "");
  return Number.isNaN(ms) ? 0 : ms;
}
function summarize(text, limit = 180) {
  const flat = String(text ?? "").replace(/\s+/g, " ").trim();
  return flat.length > limit ? `${flat.slice(0, limit)}\u2026` : flat;
}
function escapeHtml2(text) {
  return String(text ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function fmtClock(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
function toEntry(row) {
  const read = mapGet(STORE_KEYS.read);
  const favorite = mapGet(STORE_KEYS.favorite);
  const publishedAt = publishedMs(row.publish_date);
  return {
    key: row.video_id,
    channelKey: CHANNEL_KEY,
    channelName: CHANNEL_NAME,
    title: row.title ?? "(kh\xF4ng ti\xEAu \u0111\u1EC1)",
    summary: summarize(row.description),
    publishedAt,
    url: `https://www.youtube.com/watch?v=${row.video_id}`,
    image: row.thumbnail_url || void 0,
    read: read[row.video_id] !== void 0,
    favorite: favorite[row.video_id] !== void 0,
    hasBody: true
  };
}
function explanationsToMarkdown(detail) {
  const parts = [];
  for (const section of detail.explanations ?? []) {
    parts.push(`## ${section.heading ?? ""}

${section.content ?? ""}`);
  }
  const terms = detail.terms ?? [];
  if (terms.length) {
    const lines = terms.map((term) => {
      const at = term.first_seen_seconds != null ? ` (m\u1ED1c ${fmtClock(term.first_seen_seconds)})` : "";
      return `- **${term.term ?? ""}**${at} \u2014 ${term.definition ?? ""}`;
    });
    parts.push(`## Thu\u1EADt ng\u1EEF

${lines.join("\n")}`);
  }
  return parts.join("\n\n");
}
async function versionsFor(key) {
  let detail;
  try {
    detail = await http(`/api/videos/${encodeURIComponent(key)}`);
  } catch {
    return {
      original: { available: false, status: "missing" },
      translation: { available: false, status: "missing" },
      rewrite: { available: false, status: "missing" }
    };
  }
  const video = detail.video ?? {};
  const transcript = detail.has_transcript ? await http(`/api/videos/${encodeURIComponent(key)}/transcript?max_segments=500`).catch(() => null) : null;
  const bodyParts = [];
  if (video.description) bodyParts.push(`<p>${escapeHtml2(video.description)}</p>`);
  if (transcript?.segments?.length) {
    const paragraphs = transcript.segments.map((segment) => `[${fmtClock(segment.start_seconds)}] ${escapeHtml2(segment.text)}`).join("<br>");
    bodyParts.push(`<h2>Transcript</h2><p>${paragraphs}</p>`);
  }
  const rewriteMarkdown = explanationsToMarkdown(detail);
  return {
    original: { available: bodyParts.length > 0, title: video.title, html: bodyParts.join("\n") },
    translation: { available: false, status: "missing" },
    rewrite: {
      available: Boolean(rewriteMarkdown),
      status: rewriteMarkdown ? "ok" : "missing",
      title: "Gi\u1EA3i th\xEDch AI (vai-crawler)",
      markdown: rewriteMarkdown || void 0,
      source: "vai-crawler"
    }
  };
}
async function pollJob(jobId, { timeoutMs = 18e4, intervalMs = 3e3 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const job = await http(`/api/jobs/${encodeURIComponent(jobId)}`);
    if (job.status === "done") return job;
    if (job.status === "error") throw new Error(job.error || "job th\u1EA5t b\u1EA1i");
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error("job qu\xE1 th\u1EDDi gian ch\u1EDD");
}

/**
 * Đề cương và nội dung bài học môn: Đại số tuyến tính ứng dụng
 * Cấu trúc ánh xạ 1-1 với khung chuẩn đầu ra MATH.LA.01 -> MATH.LA.10
 */

var MATH_LA_CHANNELS = [
  { key: "all-math-la", kind: "feed", name: "Đại số tuyến tính ứng dụng (Tất cả)", unread: 10, total: 10 },
  { key: "ch-01", kind: "feed", name: "Chương 1: Ma trận & Hệ phương trình", unread: 3, total: 3 },
  { key: "ch-02", kind: "feed", name: "Chương 2: Định thức & Ma trận nghịch đảo", unread: 2, total: 2 },
  { key: "ch-03", kind: "feed", name: "Chương 3: Không gian vector Euclide", unread: 2, total: 2 },
  { key: "ch-04", kind: "feed", name: "Chương 4: Trị riêng & Vector riêng", unread: 2, total: 2 },
  { key: "ch-05", kind: "feed", name: "Chương 5: Phân tích SVD & Ứng dụng DS", unread: 1, total: 1 },
];

var MATH_LA_LESSONS = {
  "MATH.LA.01": {
    key: "MATH.LA.01",
    channelKey: "ch-01",
    channelName: "Chương 1: Ma trận & Hệ phương trình",
    title: "MATH.LA.01: Ma trận, các phép toán ma trận và ma trận chuyển vị",
    summary: "Định nghĩa ma trận cấp m x n, phép cộng, phép nhân vô hướng, nhân ma trận và ma trận chuyển vị với các tính chất đại số cốt lõi.",
    publishedAt: Date.parse("2026-09-01T08:00:00Z"),
    videoUrl: "https://www.youtube.com/watch?v=fNk_zzaMoSs",
    videoEmbedUrl: "https://www.youtube.com/embed/fNk_zzaMoSs",
    image: "https://img.youtube.com/vi/fNk_zzaMoSs/hqdefault.jpg",
    contentHtml: `
<div class="math-lesson">
  <h1>MATH.LA.01: Ma trận, Các phép toán và Ma trận chuyển vị</h1>
  <p class="lesson-meta"><strong>Môn học:</strong> Đại số tuyến tính ứng dụng | <strong>Phân bổ:</strong> Tuần 1 (3 tiết lý thuyết + bài tập)</p>

  <div class="concept-callout">
    <h3>Mục tiêu chuẩn đầu ra</h3>
    <p>Nắm vững định nghĩa ma trận, điều kiện nhân hai ma trận, tính chất ma trận chuyển vị và ứng dụng biểu diễn bảng dữ liệu nhiều chiều (Feature Matrix) trong Machine Learning.</p>
  </div>

  <h2>1. Định nghĩa ma trận</h2>
  <p>Một ma trận thực cấp $m \\times n$ là một bảng hình chữ nhật gồm $m$ hàng và $n$ cột các số thực:</p>
  <div class="math-block">
    $$A = \\begin{bmatrix} a_{11} & a_{12} & \\dots & a_{1n} \\\\ a_{21} & a_{22} & \\dots & a_{2n} \\\\ \\vdots & \\vdots & \\ddots & \\vdots \\\\ a_{m1} & a_{m2} & \\dots & a_{mn} \\end{bmatrix} \\in \\mathbb{R}^{m \\times n}$$
  </div>

  <h2>2. Các phép toán ma trận cốt lõi</h2>
  <h3>2.1. Phép nhân ma trận (Matrix Multiplication)</h3>
  <p>Cho $A \\in \\mathbb{R}^{m \\times p}$ và $B \\in \\mathbb{R}^{p \\times n}$. Tích $C = AB \\in \\mathbb{R}^{m \\times n}$ có phần tử ở vị trí $(i, j)$ được tính theo công thức:</p>
  <div class="math-block">
    $$c_{ij} = \\sum_{k=1}^p a_{ik} b_{kj} = a_{i1}b_{1j} + a_{i2}b_{2j} + \\dots + a_{ip}b_{pj}$$
  </div>
  <p><em>Lưu ý quan trọng:</em> Phép nhân ma trận <strong>không có tính chất giao hoán</strong> ($AB \\neq BA$ nói chung).</p>

  <h3>2.2. Ma trận chuyển vị (Transpose)</h3>
  <p>Chuyển vị của ma trận $A$, ký hiệu là $A^T \\in \\mathbb{R}^{n \\times m}$, thu được bằng cách đổi hàng thành cột: $(A^T)_{ij} = a_{ji}$.</p>
  <p>Các tính chất then chốt:</p>
  <ul>
    <li>$(A + B)^T = A^T + B^T$</li>
    <li>$(cA)^T = c A^T$ với mọi vô hướng $c \\in \\mathbb{R}$</li>
    <li>$(AB)^T = B^T A^T$ (đổi thứ tự khi chuyển vị tích)</li>
    <li>Ma trận đối xứng nếu $A = A^T$; phản đối xứng nếu $A^T = -A$.</li>
  </ul>

  <h2>3. Ứng dụng trong Khoa học Dữ liệu</h2>
  <p>Trong học máy, tập dữ liệu gồm $N$ mẫu, mỗi mẫu có $D$ đặc trưng (features) được gom thành ma trận dữ liệu $X \\in \\mathbb{R}^{N \\times D}$. Ma trận hiệp phương sai mẫu (Covariance Matrix) được biểu diễn gọn gàng qua phép nhân chuyển vị:</p>
  <div class="math-block">
    $$\\Sigma = \\frac{1}{N} X^T X \\in \\mathbb{R}^{D \\times D}$$
  </div>
</div>
    `,
    explanationMarkdown: `## Trọng tâm cần nhớ

1. **Điều kiện nhân**: Số cột của ma trận đứng trước phải bằng số hàng của ma trận đứng sau: $(m \\times p) \\cdot (p \\times n) = (m \\times n)$.
2. **Quy tắc đảo ngược chuyển vị**: $(AB)^T = B^T A^T$. Khi mở rộng cho nhiều ma trận: $(A_1 A_2 \\dots A_k)^T = A_k^T \\dots A_2^T A_1^T$.
3. **Ý nghĩa hình học**: Mỗi ma trận $A \\in \\mathbb{R}^{m \\times n}$ biểu diễn một ánh xạ tuyến tính $T: \\mathbb{R}^n \\to \\mathbb{R}^m$.`
  },

  "MATH.LA.02": {
    key: "MATH.LA.02",
    channelKey: "ch-01",
    channelName: "Chương 1: Ma trận & Hệ phương trình",
    title: "MATH.LA.02: Phép biến đổi sơ cấp trên dòng và ma trận bậc thang",
    summary: "3 phép biến đổi sơ cấp dòng, ma trận bậc thang (REF), ma trận bậc thang rút gọn (RREF) và kỹ thuật tìm hệ số dẫn đầu (pivot).",
    publishedAt: Date.parse("2026-09-08T08:00:00Z"),
    videoUrl: "https://www.youtube.com/watch?v=QVKj3LADCnA",
    videoEmbedUrl: "https://www.youtube.com/embed/QVKj3LADCnA",
    image: "https://img.youtube.com/vi/QVKj3LADCnA/hqdefault.jpg",
    contentHtml: `
<div class="math-lesson">
  <h1>MATH.LA.02: Phép biến đổi sơ cấp trên dòng & Ma trận bậc thang</h1>
  <p class="lesson-meta"><strong>Môn học:</strong> Đại số tuyến tính ứng dụng | <strong>Phân bổ:</strong> Tuần 2 (3 tiết lý thuyết + bài tập)</p>

  <div class="concept-callout">
    <h3>Mục tiêu chuẩn đầu ra</h3>
    <p>Thành thạo áp dụng 3 phép biến đổi dòng để đưa ma trận về dạng bậc thang (Row Echelon Form - REF) và bậc thang rút gọn (RREF), xác định vị trí pivot và hạng (rank) của ma trận.</p>
  </div>

  <h2>1. Ba phép biến đổi sơ cấp trên dòng (Elementary Row Operations)</h2>
  <ol>
    <li><strong>Hoán đổi:</strong> Đổi chỗ hai dòng $i$ và $j$: $r_i \\leftrightarrow r_j$.</li>
    <li><strong>Nhân vô hướng:</strong> Nhân một dòng với số thực $c \\neq 0$: $r_i \\leftarrow c \\cdot r_i$.</li>
    <li><strong>Cộng dòng:</strong> Cộng vào dòng $i$ một bội số của dòng $j$: $r_i \\leftarrow r_i + c \\cdot r_j$.</li>
  </ol>

  <h2>2. Ma trận bậc thang (REF) và bậc thang rút gọn (RREF)</h2>
  <p>Một ma trận ở dạng <strong>bậc thang (REF)</strong> khi thỏa mãn:</p>
  <ul>
    <li>Các dòng gồm toàn số 0 nằm ở dưới cùng.</li>
    <li>Hệ số dẫn đầu (pivot - phần tử khác 0 đầu tiên) của một dòng luôn nằm lệch sang phải so với pivot của dòng phía trên nó.</li>
  </ul>
  <p>Một ma trận ở dạng <strong>bậc thang rút gọn (RREF)</strong> nếu thỏa mãn thêm:</p>
  <ul>
    <li>Mọi pivot đều bằng $1$.</li>
    <li>Pivot là phần tử khác 0 duy nhất trong cột chứa nó.</li>
  </ul>
  <div class="math-block">
    $$\\text{RREF}(A) = \\begin{bmatrix} 1 & 0 & * & 0 & * \\\\ 0 & 1 & * & 0 & * \\\\ 0 & 0 & 0 & 1 & * \\\\ 0 & 0 & 0 & 0 & 0 \\end{bmatrix}$$
  </div>

  <h2>3. Định lý về hạng của ma trận (Rank)</h2>
  <p><strong>Hạng (Rank)</strong> của ma trận $A$, ký hiệu $\\text{rank}(A)$, chính là số lượng pivot trong dạng bậc thang của $A$:</p>
  <div class="math-block">
    $$\\text{rank}(A) = \\text{số dòng khác 0 trong REF}(A)$$
  </div>
</div>
    `,
    explanationMarkdown: `## Thuật toán khử Gauss đưa về REF

1. Tìm cột khác 0 ngoài cùng bên trái (cột pivot).
2. Hoán đổi dòng nếu cần để phần tử đầu cột khác 0.
3. Dùng phép cộng dòng $r_i \\leftarrow r_i - \\frac{a_{i1}}{a_{11}} r_1$ để triệt tiêu toàn bộ các phần tử bên dưới pivot.
4. Lặp lại với ma trận con thu được bằng cách bỏ dòng và cột chứa pivot vừa xử lý.`
  },

  "MATH.LA.03": {
    key: "MATH.LA.03",
    channelKey: "ch-01",
    channelName: "Chương 1: Ma trận & Hệ phương trình",
    title: "MATH.LA.03: Hệ phương trình đại số tuyến tính & phương pháp khử Gauss-Jordan",
    summary: "Hệ phương trình tuyến tính tổng quát A x = b, ma trận bổ sung, định lý Kronecker-Capelli và thuật toán giải toàn diện Gauss-Jordan.",
    publishedAt: Date.parse("2026-09-15T08:00:00Z"),
    videoUrl: "https://www.youtube.com/watch?v=2NzN_d_37jA",
    videoEmbedUrl: "https://www.youtube.com/embed/2NzN_d_37jA",
    image: "https://img.youtube.com/vi/2NzN_d_37jA/hqdefault.jpg",
    contentHtml: `
<div class="math-lesson">
  <h1>MATH.LA.03: Hệ phương trình đại số tuyến tính & Khử Gauss-Jordan</h1>
  <p class="lesson-meta"><strong>Môn học:</strong> Đại số tuyến tính ứng dụng | <strong>Phân bổ:</strong> Tuần 3 – Tuần 4 (6 tiết)</p>

  <div class="concept-callout">
    <h3>Mục tiêu chuẩn đầu ra</h3>
    <p>Biểu diễn hệ phương trình tuyến tính dưới dạng ma trận $A\\mathbf{x} = \\mathbf{b}$, áp dụng định lý Kronecker-Capelli để biện luận số nghiệm, và giải hệ bằng khử Gauss-Jordan.</p>
  </div>

  <h2>1. Biểu diễn ma trận của hệ phương trình tuyến tính</h2>
  <p>Hệ $m$ phương trình tuyến tính với $n$ ẩn số có dạng:</p>
  <div class="math-block">
    $$\\begin{cases} a_{11}x_1 + a_{12}x_2 + \\dots + a_{1n}x_n = b_1 \\\\ a_{21}x_1 + a_{22}x_2 + \\dots + a_{2n}x_n = b_2 \\\\ \\vdots \\\\ a_{m1}x_1 + a_{m2}x_2 + \\dots + a_{mn}x_n = b_m \\end{cases} \\iff A\\mathbf{x} = \\mathbf{b}$$
  </div>
  <p>Trong đó $A \\in \\mathbb{R}^{m \\times n}$ là ma trận hệ số, $\\mathbf{x} \\in \\mathbb{R}^n$ là vector ẩn, và $\\mathbf{b} \\in \\mathbb{R}^m$ là vector vế phải. Ma trận bổ sung được ký hiệu là $\\bar{A} = [A \\mid \\mathbf{b}]$.</p>

  <h2>2. Định lý Kronecker - Capelli (Điều kiện có nghiệm)</h2>
  <div class="theorem-box">
    <p><strong>Định lý:</strong> Hệ phương trình tuyến tính $A\\mathbf{x} = \\mathbf{b}$ có nghiệm khi và chỉ khi:</p>
    $$\\text{rank}(A) = \\text{rank}(\\bar{A})$$
    <ul>
      <li>Nếu $\\text{rank}(A) < \\text{rank}(\\bar{A})$: Hệ <strong>vô nghiệm</strong>.</li>
      <li>Nếu $\\text{rank}(A) = \\text{rank}(\\bar{A}) = n$ (số ẩn): Hệ có <strong>nghiệm duy nhất</strong>.</li>
      <li>Nếu $\\text{rank}(A) = \\text{rank}(\\bar{A}) = r < n$: Hệ có <strong>vô số nghiệm</strong>, phụ thuộc vào $n - r$ tham số tự do.</li>
    </ul>
  </div>

  <h2>3. Phương pháp khử Gauss - Jordan</h2>
  <p>Đưa ma trận bổ sung $[A \\mid \\mathbf{b}]$ về dạng bậc thang rút gọn $[\text{RREF}(A) \\mid \\mathbf{b}']$. Từ đó đọc trực tiếp nghiệm của các biến cơ sở (pivot variables) theo các biến tự do (free variables).</p>
</div>
    `,
    explanationMarkdown: `## Ứng dụng trong Kỹ thuật & Khoa học Máy tính

1. **Định tuyến mạng (Network Flow)**: Cân bằng lưu lượng dòng vào bằng dòng ra tại mỗi nút mạng biểu diễn bằng một hệ $A\\mathbf{x} = \\mathbf{0}$.
2. **Hồi quy tuyến tính (Linear Regression)**: Nghiệm xấp xỉ bình phương tối thiểu thỏa mãn phương trình pháp tuyến (Normal Equation):
   $$A^T A \\mathbf{x} = A^T \\mathbf{b}$$`
  },

  "MATH.LA.04": {
    key: "MATH.LA.04",
    channelKey: "ch-02",
    channelName: "Chương 2: Định thức & Ma trận nghịch đảo",
    title: "MATH.LA.04: Định thức (Determinant) và tính chất đại số",
    summary: "Ý nghĩa hình học của định thức, tỷ lệ phóng đại thể tích, công thức tính định thức qua khai triển Laplace và biến đổi sơ cấp.",
    publishedAt: Date.parse("2026-09-22T08:00:00Z"),
    videoUrl: "https://www.youtube.com/watch?v=Ip3X9LOh2dk",
    videoEmbedUrl: "https://www.youtube.com/embed/Ip3X9LOh2dk",
    image: "https://img.youtube.com/vi/Ip3X9LOh2dk/hqdefault.jpg",
    contentHtml: `
<div class="math-lesson">
  <h1>MATH.LA.04: Định thức (Determinant) & Tính chất đại số</h1>
  <p class="lesson-meta"><strong>Môn học:</strong> Đại số tuyến tính ứng dụng | <strong>Phân bổ:</strong> Tuần 5 – Tuần 6 (6 tiết)</p>

  <div class="concept-callout">
    <h3>Mục tiêu chuẩn đầu ra</h3>
    <p>Hiểu bản chất hình học của định thức (hệ số co dãn diện tích/thể tích của phép biến đổi tuyến tính), tính toán định thức cấp $n$ và vận dụng các tính chất đại số.</p>
  </div>

  <h2>1. Ý nghĩa hình học của định thức</h2>
  <p>Với ma trận $A \\in \\mathbb{R}^{2 \\times 2}$, giá trị tuyệt đối $|\\det(A)|$ bằng <strong>diện tích hình bình hành</strong> tạo bởi hai vector cột của $A$. Trong không gian $\\mathbb{R}^3$, $|\\det(A)|$ bằng <strong>thể tích khối hộp song song</strong>.</p>
  <p>Dấu của $\\det(A)$ chỉ ra phép biến đổi có làm đảo chiều định hướng không gian (orientation) hay không.</p>

  <h2>2. Các tính chất đại số cơ bản</h2>
  <ul>
    <li>$\\det(I) = 1$ (ma trận đơn vị có định thức bằng 1).</li>
    <li>$\\det(A^T) = \\det(A)$ (chuyển vị không làm đổi định thức).</li>
    <li><strong>Tính chất nhân:</strong> $\\det(AB) = \\det(A) \\cdot \\det(B)$.</li>
    <li>$\\det(cA) = c^n \\det(A)$ với $A$ cấp $n \\times n$.</li>
    <li>Nếu $A$ có một dòng (hoặc cột) toàn số 0, hoặc có 2 dòng tỉ lệ nhau thì $\\det(A) = 0$.</li>
    <li>Đổi chỗ 2 dòng làm định thức đổi dấu.</li>
    <li>Cộng vào một dòng bội số của dòng khác <em>không làm thay đổi</em> định thức.</li>
  </ul>

  <h2>3. Khai triển Laplace</h2>
  <div class="math-block">
    $$\\det(A) = \\sum_{j=1}^n (-1)^{i+j} a_{ij} M_{ij}$$
  </div>
  <p>Trong đó $M_{ij}$ là định thức con cấp $n-1$ thu được bằng cách bỏ hàng $i$ và cột $j$.</p>
</div>
    `,
    explanationMarkdown: `## Mẹo tính định thức nhanh trong thực tế

- Đưa ma trận về dạng tam giác trên (hoặc tam giác dưới) bằng các phép biến đổi sơ cấp dòng loại 3 (không làm đổi $\\det$).
- Định thức ma trận tam giác bằng **tích các phần tử trên đường chéo chính**:
  $$\\det(U) = u_{11} \\cdot u_{22} \\dots u_{nn}$$`
  },

  "MATH.LA.05": {
    key: "MATH.LA.05",
    channelKey: "ch-02",
    channelName: "Chương 2: Định thức & Ma trận nghịch đảo",
    title: "MATH.LA.05: Ma trận nghịch đảo và phương pháp tìm nghịch đảo",
    summary: "Điều kiện khả nghịch det(A) ≠ 0, công thức ma trận phụ hợp và thuật toán tìm nghịch đảo Gauss-Jordan [A | I] -> [I | A^-1].",
    publishedAt: Date.parse("2026-09-29T08:00:00Z"),
    videoUrl: "https://www.youtube.com/watch?v=FX4C-JpTFgY",
    videoEmbedUrl: "https://www.youtube.com/embed/FX4C-JpTFgY",
    image: "https://img.youtube.com/vi/FX4C-JpTFgY/hqdefault.jpg",
    contentHtml: `
<div class="math-lesson">
  <h1>MATH.LA.05: Ma trận nghịch đảo & Phương pháp tìm nghịch đảo</h1>
  <p class="lesson-meta"><strong>Môn học:</strong> Đại số tuyến tính ứng dụng | <strong>Phân bổ:</strong> Tuần 7 (3 tiết)</p>

  <div class="concept-callout">
    <h3>Mục tiêu chuẩn đầu ra</h3>
    <p>Nắm vững định nghĩa ma trận khả nghịch, thành thạo tìm $A^{-1}$ bằng phương pháp Gauss-Jordan và phương pháp ma trận phụ hợp, áp dụng giải phương trình ma trận.</p>
  </div>

  <h2>1. Định nghĩa ma trận nghịch đảo</h2>
  <p>Cho ma trận vuông $A$ cấp $n$. Nếu tồn tại ma trận $B$ sao cho $AB = BA = I_n$ thì $A$ được gọi là <strong>khả nghịch (invertible / non-singular)</strong>, và $B$ được gọi là ma trận nghịch đảo của $A$, ký hiệu $A^{-1}$.</p>
  <div class="theorem-box">
    <p><strong>Điều kiện cần và đủ:</strong> Ma trận $A$ khả nghịch khi và chỉ khi:</p>
    $$\\det(A) \\neq 0 \\iff \\text{rank}(A) = n$$
  </div>

  <h2>2. Thuật toán tìm ma trận nghịch đảo Gauss - Jordan</h2>
  <p>Ghép ma trận đơn vị $I$ vào bên phải ma trận $A$ để lập ma trận khối $[A \\mid I_n]$. Dùng các phép biến đổi sơ cấp dòng đưa nửa bên trái về $I_n$:</p>
  <div class="math-block">
    $$[A \\mid I_n] \\xrightarrow{\\text{Row Operations}} [I_n \\mid A^{-1}]$$
  </div>
  <p>Nếu trong quá trình biến đổi, nửa bên trái xuất hiện một dòng toàn số 0 thì $A$ không khả nghịch.</p>

  <h2>3. Tính chất của ma trận nghịch đảo</h2>
  <ul>
    <li>$(A^{-1})^{-1} = A$</li>
    <li>$(AB)^{-1} = B^{-1} A^{-1}$ (đảo thứ tự khi nghịch đảo tích)</li>
    <li>$(A^T)^{-1} = (A^{-1})^T$</li>
    <li>$\\det(A^{-1}) = \\frac{1}{\\det(A)}$</li>
  </ul>
</div>
    `,
    explanationMarkdown: `## Công thức ma trận phụ hợp (Adjugate Formula)

$$A^{-1} = \\frac{1}{\\det(A)} \\text{adj}(A)$$

Với ma trận cấp $2 \\times 2$:
$$\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}^{-1} = \\frac{1}{ad - bc} \\begin{bmatrix} d & -b \\\\ -c & a \\end{bmatrix}$$`
  },

  "MATH.LA.06": {
    key: "MATH.LA.06",
    channelKey: "ch-03",
    channelName: "Chương 3: Không gian vector Euclide",
    title: "MATH.LA.06: Không gian vector R^n, tổ hợp tuyến tính và hệ độc lập tuyến tính",
    summary: "Không gian vector Euclid R^n, khái niệm Span (không gian sinh), tổ hợp tuyến tính và điều kiện độc lập tuyến tính / phụ thuộc tuyến tính.",
    publishedAt: Date.parse("2026-10-06T08:00:00Z"),
    videoUrl: "https://www.youtube.com/watch?v=k7RM-ot2NWY",
    videoEmbedUrl: "https://www.youtube.com/embed/k7RM-ot2NWY",
    image: "https://img.youtube.com/vi/k7RM-ot2NWY/hqdefault.jpg",
    contentHtml: `
<div class="math-lesson">
  <h1>MATH.LA.06: Không gian vector $\\mathbb{R}^n$, Tổ hợp tuyến tính & Độc lập tuyến tính</h1>
  <p class="lesson-meta"><strong>Môn học:</strong> Đại số tuyến tính ứng dụng | <strong>Phân bổ:</strong> Tuần 8 – Tuần 9 (6 tiết)</p>

  <div class="concept-callout">
    <h3>Mục tiêu chuẩn đầu ra</h3>
    <p>Hiểu bản chất không gian vector $\\mathbb{R}^n$, kiểm tra hệ vector độc lập tuyến tính hay phụ thuộc tuyến tính bằng cách giải hệ thuần nhất $A\\mathbf{x} = \\mathbf{0}$.</p>
  </div>

  <h2>1. Tổ hợp tuyến tính (Linear Combination) và Bao tuyến tính (Span)</h2>
  <p>Cho tập các vector $\\{\\mathbf{v}_1, \\mathbf{v}_2, \\dots, \\mathbf{v}_k\\} \\subset \\mathbb{R}^n$. Một vector $\\mathbf{w}$ được gọi là <strong>tổ hợp tuyến tính</strong> của hệ nếu tồn tại các số thực $c_1, \\dots, c_k$ sao cho:</p>
  <div class="math-block">
    $$\\mathbf{w} = c_1 \\mathbf{v}_1 + c_2 \\mathbf{v}_2 + \\dots + c_k \\mathbf{v}_k$$
  </div>
  <p>Tập hợp tất cả các tổ hợp tuyến tính của hệ được gọi là <strong>không gian sinh (Span)</strong>:</p>
  <div class="math-block">
    $$\\text{Span}(\\mathbf{v}_1, \\dots, \\mathbf{v}_k) = \\left\\{ \\sum_{i=1}^k c_i \\mathbf{v}_i \\;\\middle|\\; c_i \\in \\mathbb{R} \\right\\}$$
  </div>

  <h2>2. Độc lập tuyến tính (Linear Independence)</h2>
  <p>Hệ vector $\\{\\mathbf{v}_1, \\dots, \\mathbf{v}_k\\}$ được gọi là <strong>độc lập tuyến tính</strong> nếu phương trình vectơ:</p>
  <div class="math-block">
    $$c_1 \\mathbf{v}_1 + c_2 \\mathbf{v}_2 + \\dots + c_k \\mathbf{v}_k = \\mathbf{0}$$
  </div>
  <p><strong>chỉ có nghiệm duy nhất</strong> $c_1 = c_2 = \\dots = c_k = 0$. Nếu tồn tại ít nhất một $c_i \\neq 0$ thỏa mãn phương trình trên thì hệ là <strong>phụ thuộc tuyến tính</strong>.</p>
</div>
    `,
    explanationMarkdown: `## Tiêu chuẩn ma trận kiểm tra độc lập tuyến tính

Xếp các vector thành các cột của ma trận $A = [\\mathbf{v}_1 \\mid \\mathbf{v}_2 \\mid \\dots \\mid \\mathbf{v}_k]$:
- Hệ **độc lập tuyến tính** $\\iff$ Hệ thuần nhất $A\\mathbf{c} = \\mathbf{0}$ chỉ có nghiệm tầm thường $\\mathbf{c} = \\mathbf{0} \\iff \\text{rank}(A) = k$ (mọi cột đều có pivot).
- Nếu số vector $k > n$ (số chiều không gian) thì hệ **chắc chắn phụ thuộc tuyến tính**.`
  },

  "MATH.LA.07": {
    key: "MATH.LA.07",
    channelKey: "ch-03",
    channelName: "Chương 3: Không gian vector Euclide",
    title: "MATH.LA.07: Cơ sở, số chiều (Dimension) và 4 không gian con cơ bản",
    summary: "Cơ sở của không gian vector, số chiều, định lý Rank-Nullity và 4 không gian con cơ bản của ma trận: C(A), N(A), C(A^T), N(A^T).",
    publishedAt: Date.parse("2026-10-13T08:00:00Z"),
    videoUrl: "https://www.youtube.com/watch?v=nP390Vdc_Xg",
    videoEmbedUrl: "https://www.youtube.com/embed/nP390Vdc_Xg",
    image: "https://img.youtube.com/vi/nP390Vdc_Xg/hqdefault.jpg",
    contentHtml: `
<div class="math-lesson">
  <h1>MATH.LA.07: Cơ sở, Số chiều & Bốn không gian con cơ bản</h1>
  <p class="lesson-meta"><strong>Môn học:</strong> Đại số tuyến tính ứng dụng | <strong>Phân bổ:</strong> Tuần 10 – Tuần 11 (6 tiết)</p>

  <div class="concept-callout">
    <h3>Mục tiêu chuẩn đầu ra</h3>
    <p>Nắm vững khái niệm cơ sở và số chiều, xác định cơ sở của 4 không gian con cơ bản của ma trận theo định lý cơ bản của Gilbert Strang.</p>
  </div>

  <h2>1. Cơ sở (Basis) và Số chiều (Dimension)</h2>
  <p>Một tập vector $\\mathcal{B} = \\{\\mathbf{v}_1, \\dots, \\mathbf{v}_d\\}$ là một <strong>cơ sở</strong> của không gian vector $V$ nếu:</p>
  <ol>
    <li>$\\mathcal{B}$ độc lập tuyến tính.</li>
    <li>$\\text{Span}(\\mathcal{B}) = V$ (sinh ra toàn bộ $V$).</li>
  </ol>
  <p>Số lượng vector trong cơ sở được gọi là <strong>số chiều</strong> của $V$, ký hiệu $\\dim(V) = d$.</p>

  <h2>2. Bốn không gian con cơ bản của ma trận $A \\in \\mathbb{R}^{m \\times n}$</h2>
  <table class="math-table">
    <thead>
      <tr>
        <th>Không gian con</th>
        <th>Ký hiệu</th>
        <th>Không gian chứa</th>
        <th>Số chiều</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Không gian cột (Column Space)</td>
        <td>$C(A)$</td>
        <td>$\\mathbb{R}^m$</td>
        <td>$r = \\text{rank}(A)$</td>
      </tr>
      <tr>
        <td>Không gian dòng (Row Space)</td>
        <td>$C(A^T)$</td>
        <td>$\\mathbb{R}^n$</td>
        <td>$r = \\text{rank}(A)$</td>
      </tr>
      <tr>
        <td>Không gian nghiệm (Null Space)</td>
        <td>$N(A)$</td>
        <td>$\\mathbb{R}^n$</td>
        <td>$n - r$</td>
      </tr>
      <tr>
        <td>Không gian nghiệm trái (Left Null Space)</td>
        <td>$N(A^T)$</td>
        <td>$\\mathbb{R}^m$</td>
        <td>$m - r$</td>
      </tr>
    </tbody>
  </table>

  <h2>3. Định lý Rank - Nullity</h2>
  <div class="math-block">
    $$\\dim(C(A)) + \\dim(N(A)) = \\text{rank}(A) + \\text{nullity}(A) = n$$
  </div>
  <p>Hơn nữa, $C(A^T) \\perp N(A)$ (không gian dòng trực giao với không gian nghiệm trong $\\mathbb{R}^n$), và $C(A) \\perp N(A^T)$ trong $\\mathbb{R}^m$.</p>
</div>
    `,
    explanationMarkdown: `## Ý nghĩa 4 không gian con

Mỗi phép nhân ma trận - vector $\\mathbf{x} \\mapsto A\\mathbf{x}$ biến đổi:
1. Thành phần của $\\mathbf{x}$ nằm trong $N(A)$ bị triệt tiêu về $\\mathbf{0}$.
2. Thành phần của $\\mathbf{x}$ nằm trong $C(A^T)$ được ánh xạ 1-1 sang $C(A)$.`
  },

  "MATH.LA.08": {
    key: "MATH.LA.08",
    channelKey: "ch-04",
    channelName: "Chương 4: Trị riêng & Vector riêng",
    title: "MATH.LA.08: Giá trị riêng, vector riêng (Eigenvalues & Eigenvectors) và bài toán chéo hóa",
    summary: "Phương trình đặc trưng det(A - λ I) = 0, tìm vector riêng tương ứng, điều kiện chéo hóa ma trận A = P D P^-1 và ứng dụng lũy thừa ma trận.",
    publishedAt: Date.parse("2026-10-20T08:00:00Z"),
    videoUrl: "https://www.youtube.com/watch?v=PFDu9oVAE-g",
    videoEmbedUrl: "https://www.youtube.com/embed/PFDu9oVAE-g",
    image: "https://img.youtube.com/vi/PFDu9oVAE-g/hqdefault.jpg",
    contentHtml: `
<div class="math-lesson">
  <h1>MATH.LA.08: Trị riêng, Vector riêng & Bài toán chéo hóa</h1>
  <p class="lesson-meta"><strong>Môn học:</strong> Đại số tuyến tính ứng dụng | <strong>Phân bổ:</strong> Tuần 12 – Tuần 13 (6 tiết)</p>

  <div class="concept-callout">
    <h3>Mục tiêu chuẩn đầu ra</h3>
    <p>Tìm đa thức đặc trưng, tính trị riêng và không gian riêng (eigenspace), kiểm tra điều kiện chéo hóa ma trận và ứng dụng giải hệ phương trình vi phân / mô hình Markov.</p>
  </div>

  <h2>1. Định nghĩa Trị riêng & Vector riêng</h2>
  <p>Cho ma trận vuông $A \\in \\mathbb{R}^{n \\times n}$. Số vô hướng $\\lambda$ được gọi là <strong>giá trị riêng (eigenvalue)</strong> của $A$ nếu tồn tại vector khác không $\\mathbf{v} \\neq \\mathbf{0}$ sao cho:</p>
  <div class="math-block">
    $$A\\mathbf{v} = \\lambda \\mathbf{v} \\iff (A - \\lambda I)\\mathbf{v} = \\mathbf{0}$$
  </div>
  <p>Vector $\\mathbf{v}$ được gọi là <strong>vector riêng (eigenvector)</strong> ứng với trị riêng $\\lambda$.</p>

  <h2>2. Phương trình đặc trưng (Characteristic Equation)</h2>
  <p>Để hệ $(A - \\lambda I)\\mathbf{v} = \\mathbf{0}$ có nghiệm không tầm thường, ta phải có:</p>
  <div class="math-block">
    $$p(\\lambda) = \\det(A - \\lambda I) = 0$$
  </div>
  <p>Các nghiệm của phương trình trên chính là các giá trị riêng của $A$.</p>

  <h2>3. Chéo hóa ma trận (Diagonalization)</h2>
  <p>Ma trận $A$ <strong>chéo hóa được</strong> khi và chỉ khi $A$ có đủ $n$ vector riêng độc lập tuyến tính $\\{\\mathbf{v}_1, \\dots, \\mathbf{v}_n\\}$. Khi đó:</p>
  <div class="math-block">
    $$A = P D P^{-1}$$
  </div>
  <p>Trong đó $P = [\\mathbf{v}_1 \\mid \\dots \\mid \\mathbf{v}_n]$ là ma trận chứa các vector riêng ở các cột, và $D = \\text{diag}(\\lambda_1, \\dots, \\lambda_n)$ là ma trận đường chéo chứa các giá trị riêng tương ứng.</p>
  <p><em>Ứng dụng:</em> Tính lũy thừa ma trận cực nhanh: $A^k = P D^k P^{-1}$.</p>
</div>
    `,
    explanationMarkdown: `## Ứng dụng: Chuỗi Markov & Thuật toán PageRank

Trong chuỗi Markov, vector trạng thái xác suất tại bước $k+1$ tuân theo $\\mathbf{p}_{k+1} = P \\mathbf{p}_k$. Trạng thái dừng cân bằng $\\mathbf{p}_\\infty$ chính là vector riêng ứng với giá trị riêng $\\lambda = 1$:
$$P \\mathbf{p}_\\infty = \\mathbf{p}_\\infty$$`
  },

  "MATH.LA.09": {
    key: "MATH.LA.09",
    channelKey: "ch-04",
    channelName: "Chương 4: Trị riêng & Vector riêng",
    title: "MATH.LA.09: Trực giao hóa Gram-Schmidt và phân tích ma trận QR",
    summary: "Tích vô hướng trong R^n, hệ trực giao/trực chuẩn, thuật toán trực giao hóa Gram-Schmidt và phân tích ma trận A = Q R.",
    publishedAt: Date.parse("2026-10-27T08:00:00Z"),
    videoUrl: "https://www.youtube.com/watch?v=Y_Ac6KiQ1t0",
    videoEmbedUrl: "https://www.youtube.com/embed/Y_Ac6KiQ1t0",
    image: "https://img.youtube.com/vi/Y_Ac6KiQ1t0/hqdefault.jpg",
    contentHtml: `
<div class="math-lesson">
  <h1>MATH.LA.09: Trực giao hóa Gram - Schmidt & Phân tích ma trận QR</h1>
  <p class="lesson-meta"><strong>Môn học:</strong> Đại số tuyến tính ứng dụng | <strong>Phân bổ:</strong> Tuần 14 (3 tiết)</p>

  <div class="concept-callout">
    <h3>Mục tiêu chuẩn đầu ra</h3>
    <p>Biến đổi cơ sở bất kỳ thành cơ sở trực chuẩn (Orthonormal Basis) bằng thuật toán Gram-Schmidt, phân tích ma trận $A = QR$ ứng dụng giải bài toán bình phương cực tiểu.</p>
  </div>

  <h2>1. Hệ trực giao & Hệ trực chuẩn</h2>
  <p>Hai vector $\\mathbf{u}, \\mathbf{v} \\in \\mathbb{R}^n$ trực giao nhau nếu tích vô hướng bằng 0: $\\mathbf{u}^T \\mathbf{v} = 0$.</p>
  <p>Một hệ vector $\\{\\mathbf{q}_1, \\dots, \\mathbf{q}_k\\}$ là <strong>trực chuẩn (orthonormal)</strong> nếu:</p>
  <div class="math-block">
    $$\\mathbf{q}_i^T \\mathbf{q}_j = \\begin{cases} 1 & \\text{khi } i = j \\\\ 0 & \\text{khi } i \\neq j \\end{cases}$$
  </div>

  <h2>2. Thuật toán trực giao hóa Gram - Schmidt</h2>
  <p>Từ cơ sở $\\{\\mathbf{v}_1, \\dots, \\mathbf{v}_k\\}$, xây dựng cơ sở trực giao $\\{\\mathbf{u}_1, \\dots, \\mathbf{u}_k\\}$:</p>
  <div class="math-block">
    $$\\begin{aligned} \\mathbf{u}_1 &= \\mathbf{v}_1 \\\\ \\mathbf{u}_2 &= \\mathbf{v}_2 - \\frac{\\mathbf{u}_1^T \\mathbf{v}_2}{\\mathbf{u}_1^T \\mathbf{u}_1} \\mathbf{u}_1 \\\\ \\mathbf{u}_k &= \\mathbf{v}_k - \\sum_{j=1}^{k-1} \\frac{\\mathbf{u}_j^T \\mathbf{v}_k}{\\mathbf{u}_j^T \\mathbf{u}_j} \\mathbf{u}_j \\end{aligned}$$
  </div>
  <p>Sau đó chuẩn hóa từng vector: $\\mathbf{q}_i = \\frac{\\mathbf{u}_i}{\\|\\mathbf{u}_i\\|}$.</p>

  <h2>3. Phân tích ma trận $A = QR$</h2>
  <div class="math-block">
    $$A = Q R$$
  </div>
  <p>Trong đó $Q$ có các cột trực chuẩn ($Q^T Q = I$), và $R$ là ma trận tam giác trên khả nghịch. Bài toán bình phương tối thiểu $A\\mathbf{x} = \\mathbf{b}$ trở thành giải hệ tam giác:</p>
  <div class="math-block">
    $$R\\mathbf{x} = Q^T \\mathbf{b}$$
  </div>
</div>
    `,
    explanationMarkdown: `## Ưu điểm của phân tích QR

Thuật toán QR ổn định về mặt số học hơn nhiều so với việc tính trực tiếp ma trận nghịch đảo $(A^T A)^{-1}$, tránh hiện tượng ma trận bị xấu điều kiện (ill-conditioned matrix).`
  },

  "MATH.LA.10": {
    key: "MATH.LA.10",
    channelKey: "ch-05",
    channelName: "Chương 5: Phân tích SVD & Ứng dụng DS",
    title: "MATH.LA.10: Phân tích giá trị suy biến (Singular Value Decomposition - SVD) và ứng dụng thực tế",
    summary: "Định lý SVD: A = U Σ V^T, ý nghĩa hình học, xấp xỉ ma trận hạng thấp Eckart-Young, nén ảnh, lọc cộng tác và phân tích thành phần chính PCA.",
    publishedAt: Date.parse("2026-11-03T08:00:00Z"),
    videoUrl: "https://www.youtube.com/watch?v=gXbThCXjZFM",
    videoEmbedUrl: "https://www.youtube.com/embed/gXbThCXjZFM",
    image: "https://img.youtube.com/vi/gXbThCXjZFM/hqdefault.jpg",
    contentHtml: `
<div class="math-lesson">
  <h1>MATH.LA.10: Phân tích giá trị suy biến (SVD) & Ứng dụng</h1>
  <p class="lesson-meta"><strong>Môn học:</strong> Đại số tuyến tính ứng dụng | <strong>Phân bổ:</strong> Tuần 15 (Tổng kết chuyên đề Data Science)</p>

  <div class="concept-callout">
    <h3>Mục tiêu chuẩn đầu ra</h3>
    <p>Nắm vững định lý phân tích giá trị suy biến $A = U \\Sigma V^T$ cho ma trận hình chữ nhật bất kỳ, hiểu định lý Eckart-Young về xấp xỉ hạng thấp (Low-rank approximation) và ứng dụng nén ảnh, hệ gợi ý (Collaborative Filtering) và PCA.</p>
  </div>

  <h2>1. Định lý phân tích SVD</h2>
  <p>Mọi ma trận thực $A \\in \\mathbb{R}^{m \\times n}$ bất kỳ đều có thể phân tích thành tích của 3 ma trận:</p>
  <div class="math-block">
    $$A = U \\Sigma V^T$$
  </div>
  <p>Trong đó:</p>
  <ul>
    <li>$U \\in \\mathbb{R}^{m \\times m}$ là ma trận trực giao ($U^T U = I_m$), các cột $\\mathbf{u}_i$ là các <strong>left singular vectors</strong> (vector riêng của $AA^T$).</li>
    <li>$V \\in \\mathbb{R}^{n \\times n}$ là ma trận trực giao ($V^T V = I_n$), các cột $\\mathbf{v}_i$ là các <strong>right singular vectors</strong> (vector riêng của $A^T A$).</li>
    <li>$\\Sigma \\in \\mathbb{R}^{m \\times n}$ là ma trận đường chéo chữ nhật chứa các <strong>giá trị suy biến (singular values)</strong> được sắp xếp giảm dần:
      $$\\sigma_1 \\ge \\sigma_2 \\ge \\dots \\ge \\sigma_r > 0 = \\sigma_{r+1} = \\dots = 0$$
      với $\\sigma_i = \\sqrt{\\lambda_i(A^T A)}$.
    </li>
  </ul>

  <h2>2. Dạng phân rã tổng các ma trận hạng 1 (Dyadic Expansion)</h2>
  <div class="math-block">
    $$A = \\sum_{i=1}^r \\sigma_i \\mathbf{u}_i \\mathbf{v}_i^T = \\sigma_1 \\mathbf{u}_1 \\mathbf{v}_1^T + \\sigma_2 \\mathbf{u}_2 \\mathbf{v}_2^T + \\dots + \\sigma_r \\mathbf{u}_r \\mathbf{v}_r^T$$
  </div>
  <p>Mỗi số hạng $\\sigma_i \\mathbf{u}_i \\mathbf{v}_i^T$ là một ma trận cấp $m \\times n$ có hạng đúng bằng 1.</p>

  <h2>3. Định lý Eckart - Young - Mirsky (Xấp xỉ hạng thấp)</h2>
  <div class="theorem-box">
    <p><strong>Định lý:</strong> Với số nguyên $k < r$, ma trận hạng $k$ xấp xỉ tốt nhất cho ma trận $A$ theo chuẩn Frobenius $\\|\\cdot\\|_F$ hoặc chuẩn Spectral $\\|\\cdot\\|_2$ là:</p>
    $$A_k = \\sum_{i=1}^k \\sigma_i \\mathbf{u}_i \\mathbf{v}_i^T$$
    $$\\min_{\\text{rank}(B) \\le k} \\|A - B\\|_F = \\|A - A_k\\|_F = \\sqrt{\\sum_{i=k+1}^r \\sigma_i^2}$$
  </div>

  <h2>4. Ứng dụng thực tế trong AI & Data Science</h2>
  <h3>4.1. Nén ảnh và Khử nhiễu (Image Compression & Denoising)</h3>
  <p>Một bức ảnh xám kích thước $m \\times n$ lưu trữ $m \\times n$ số thực. Thay vì lưu toàn bộ, ta chỉ lưu $k$ bộ $(\\mathbf{u}_i, \\sigma_i, \\mathbf{v}_i)$ với chi phí lưu trữ $k(m + n + 1)$. Với $k \\ll \\min(m, n)$, ta tiết kiệm tới 80-90% dung lượng mà vẫn giữ nguyên các đặc trưng trực quan của bức ảnh.</p>

  <h3>4.2. Giảm chiều dữ liệu PCA (Principal Component Analysis)</h3>
  <p>Với ma trận dữ liệu đã chuẩn hóa tâm $\\tilde{X} \\in \\mathbb{R}^{N \\times D}$, phân tích SVD $\\tilde{X} = U \\Sigma V^T$ cho ra ngay các trục thành phần chính (Principal Components) chính là các cột của $V$. Tọa độ của dữ liệu trên không gian $k$ chiều mới là $Z = \\tilde{X} V_k$.</p>
</div>
    `,
    explanationMarkdown: `## Tóm tắt công thức SVD

$$A = U \\Sigma V^T = \\sum_{i=1}^r \\sigma_i \\mathbf{u}_i \\mathbf{v}_i^T$$

- **Left singular vectors**: $A A^T \\mathbf{u}_i = \\sigma_i^2 \\mathbf{u}_i$
- **Right singular vectors**: $A^T A \\mathbf{v}_i = \\sigma_i^2 \\mathbf{v}_i$
- **Mối liên hệ chuyển giao**: $A \\mathbf{v}_i = \\sigma_i \\mathbf{u}_i$`
  }
};


function ensureKatex() {
  if (typeof document === 'undefined') return;
  if (!document.getElementById('katex-css')) {
    const link = document.createElement('link');
    link.id = 'katex-css';
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
    document.head.appendChild(link);
  }
  if (!document.getElementById('math-la-custom-styles')) {
    const div = document.createElement('div');
    div.innerHTML = "\n<style id=\"math-la-custom-styles\">\n  .math-lesson { font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif; line-height: 1.7; color: var(--dsw-alias-label-primary, #e2e8f0); }\n  .math-lesson h1 { font-size: 20px; font-weight: 700; margin-bottom: 8px; color: var(--dsw-alias-label-primary, #f8fafc); }\n  .math-lesson h2 { font-size: 16px; font-weight: 600; margin-top: 24px; margin-bottom: 10px; border-bottom: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.1)); padding-bottom: 6px; }\n  .math-lesson h3 { font-size: 14.5px; font-weight: 600; margin-top: 18px; margin-bottom: 8px; }\n  .lesson-meta { font-size: 13px; color: var(--dsw-alias-label-muted, #94a3b8); margin-bottom: 16px; }\n  .concept-callout { background: rgba(59, 130, 246, 0.1); border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 6px; margin: 16px 0; }\n  .concept-callout h3 { margin: 0 0 6px 0; font-size: 13.5px; font-weight: 600; color: #60a5fa; text-transform: uppercase; letter-spacing: 0.5px; }\n  .theorem-box { background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-left: 4px solid #10b981; padding: 12px 16px; border-radius: 6px; margin: 16px 0; }\n  .theorem-box p:first-child { margin-top: 0; }\n  .math-block { margin: 16px 0; padding: 12px 16px; background: rgba(0,0,0,0.25); border-radius: 6px; overflow-x: auto; text-align: center; }\n  .math-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13.5px; }\n  .math-table th, .math-table td { border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.15)); padding: 8px 12px; text-align: left; }\n  .math-table th { background: rgba(255,255,255,0.05); font-weight: 600; }\n  .katex-display { margin: 0.5em 0 !important; }\n</style>\n";
    document.head.appendChild(div.firstElementChild);
  }
  if (!window.katex && !document.getElementById('katex-js')) {
    const s = document.createElement('script');
    s.id = 'katex-js';
    s.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js';
    s.onload = () => {
      const s2 = document.createElement('script');
      s2.id = 'katex-auto-render-js';
      s2.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js';
      s2.onload = () => setTimeout(triggerMathRender, 50);
      document.head.appendChild(s2);
    };
    document.head.appendChild(s);
  } else {
    setTimeout(triggerMathRender, 50);
  }
}

function triggerMathRender() {
  if (typeof window !== 'undefined' && typeof window.renderMathInElement === 'function') {
    const elms = document.querySelectorAll('.qrs-prose, .math-lesson');
    elms.forEach(el => {
      try {
        window.renderMathInElement(el, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true }
          ],
          throwOnError: false
        });
      } catch (err) {
        console.warn('KaTeX render error:', err);
      }
    });
  }
}



/**
 * Đề cương và nội dung bài học môn: Đại số tuyến tính ứng dụng
 * Cấu trúc ánh xạ 1-1 với khung chuẩn đầu ra MATH.LA.01 -> MATH.LA.10
 */

var MATH_LA_CHANNELS = [
  { key: "all-math-la", kind: "feed", name: "Đại số tuyến tính ứng dụng (Tất cả)", unread: 10, total: 10 },
  { key: "ch-01", kind: "feed", name: "Chương 1: Ma trận & Hệ phương trình", unread: 3, total: 3 },
  { key: "ch-02", kind: "feed", name: "Chương 2: Định thức & Ma trận nghịch đảo", unread: 2, total: 2 },
  { key: "ch-03", kind: "feed", name: "Chương 3: Không gian vector Euclide", unread: 2, total: 2 },
  { key: "ch-04", kind: "feed", name: "Chương 4: Trị riêng & Vector riêng", unread: 2, total: 2 },
  { key: "ch-05", kind: "feed", name: "Chương 5: Phân tích SVD & Ứng dụng DS", unread: 1, total: 1 },
];

var MATH_LA_LESSONS = {
  "MATH.LA.01": {
    key: "MATH.LA.01",
    channelKey: "ch-01",
    channelName: "Chương 1: Ma trận & Hệ phương trình",
    title: "MATH.LA.01: Ma trận, các phép toán ma trận và ma trận chuyển vị",
    summary: "Định nghĩa ma trận cấp m x n, phép cộng, phép nhân vô hướng, nhân ma trận và ma trận chuyển vị với các tính chất đại số cốt lõi.",
    publishedAt: Date.parse("2026-09-01T08:00:00Z"),
    videoUrl: "https://www.youtube.com/watch?v=fNk_zzaMoSs",
    videoEmbedUrl: "https://www.youtube.com/embed/fNk_zzaMoSs",
    image: "https://img.youtube.com/vi/fNk_zzaMoSs/hqdefault.jpg",
    contentHtml: `
<div class="math-lesson">
  <h1>MATH.LA.01: Ma trận, Các phép toán và Ma trận chuyển vị</h1>
  <p class="lesson-meta"><strong>Môn học:</strong> Đại số tuyến tính ứng dụng | <strong>Phân bổ:</strong> Tuần 1 (3 tiết lý thuyết + bài tập)</p>

  <div class="concept-callout">
    <h3>Mục tiêu chuẩn đầu ra</h3>
    <p>Nắm vững định nghĩa ma trận, điều kiện nhân hai ma trận, tính chất ma trận chuyển vị và ứng dụng biểu diễn bảng dữ liệu nhiều chiều (Feature Matrix) trong Machine Learning.</p>
  </div>

  <h2>1. Định nghĩa ma trận</h2>
  <p>Một ma trận thực cấp $m \\times n$ là một bảng hình chữ nhật gồm $m$ hàng và $n$ cột các số thực:</p>
  <div class="math-block">
    $$A = \\begin{bmatrix} a_{11} & a_{12} & \\dots & a_{1n} \\\\ a_{21} & a_{22} & \\dots & a_{2n} \\\\ \\vdots & \\vdots & \\ddots & \\vdots \\\\ a_{m1} & a_{m2} & \\dots & a_{mn} \\end{bmatrix} \\in \\mathbb{R}^{m \\times n}$$
  </div>

  <h2>2. Các phép toán ma trận cốt lõi</h2>
  <h3>2.1. Phép nhân ma trận (Matrix Multiplication)</h3>
  <p>Cho $A \\in \\mathbb{R}^{m \\times p}$ và $B \\in \\mathbb{R}^{p \\times n}$. Tích $C = AB \\in \\mathbb{R}^{m \\times n}$ có phần tử ở vị trí $(i, j)$ được tính theo công thức:</p>
  <div class="math-block">
    $$c_{ij} = \\sum_{k=1}^p a_{ik} b_{kj} = a_{i1}b_{1j} + a_{i2}b_{2j} + \\dots + a_{ip}b_{pj}$$
  </div>
  <p><em>Lưu ý quan trọng:</em> Phép nhân ma trận <strong>không có tính chất giao hoán</strong> ($AB \\neq BA$ nói chung).</p>

  <h3>2.2. Ma trận chuyển vị (Transpose)</h3>
  <p>Chuyển vị của ma trận $A$, ký hiệu là $A^T \\in \\mathbb{R}^{n \\times m}$, thu được bằng cách đổi hàng thành cột: $(A^T)_{ij} = a_{ji}$.</p>
  <p>Các tính chất then chốt:</p>
  <ul>
    <li>$(A + B)^T = A^T + B^T$</li>
    <li>$(cA)^T = c A^T$ với mọi vô hướng $c \\in \\mathbb{R}$</li>
    <li>$(AB)^T = B^T A^T$ (đổi thứ tự khi chuyển vị tích)</li>
    <li>Ma trận đối xứng nếu $A = A^T$; phản đối xứng nếu $A^T = -A$.</li>
  </ul>

  <h2>3. Ứng dụng trong Khoa học Dữ liệu</h2>
  <p>Trong học máy, tập dữ liệu gồm $N$ mẫu, mỗi mẫu có $D$ đặc trưng (features) được gom thành ma trận dữ liệu $X \\in \\mathbb{R}^{N \\times D}$. Ma trận hiệp phương sai mẫu (Covariance Matrix) được biểu diễn gọn gàng qua phép nhân chuyển vị:</p>
  <div class="math-block">
    $$\\Sigma = \\frac{1}{N} X^T X \\in \\mathbb{R}^{D \\times D}$$
  </div>
</div>
    `,
    explanationMarkdown: `## Trọng tâm cần nhớ

1. **Điều kiện nhân**: Số cột của ma trận đứng trước phải bằng số hàng của ma trận đứng sau: $(m \\times p) \\cdot (p \\times n) = (m \\times n)$.
2. **Quy tắc đảo ngược chuyển vị**: $(AB)^T = B^T A^T$. Khi mở rộng cho nhiều ma trận: $(A_1 A_2 \\dots A_k)^T = A_k^T \\dots A_2^T A_1^T$.
3. **Ý nghĩa hình học**: Mỗi ma trận $A \\in \\mathbb{R}^{m \\times n}$ biểu diễn một ánh xạ tuyến tính $T: \\mathbb{R}^n \\to \\mathbb{R}^m$.`
  },

  "MATH.LA.02": {
    key: "MATH.LA.02",
    channelKey: "ch-01",
    channelName: "Chương 1: Ma trận & Hệ phương trình",
    title: "MATH.LA.02: Phép biến đổi sơ cấp trên dòng và ma trận bậc thang",
    summary: "3 phép biến đổi sơ cấp dòng, ma trận bậc thang (REF), ma trận bậc thang rút gọn (RREF) và kỹ thuật tìm hệ số dẫn đầu (pivot).",
    publishedAt: Date.parse("2026-09-08T08:00:00Z"),
    videoUrl: "https://www.youtube.com/watch?v=QVKj3LADCnA",
    videoEmbedUrl: "https://www.youtube.com/embed/QVKj3LADCnA",
    image: "https://img.youtube.com/vi/QVKj3LADCnA/hqdefault.jpg",
    contentHtml: `
<div class="math-lesson">
  <h1>MATH.LA.02: Phép biến đổi sơ cấp trên dòng & Ma trận bậc thang</h1>
  <p class="lesson-meta"><strong>Môn học:</strong> Đại số tuyến tính ứng dụng | <strong>Phân bổ:</strong> Tuần 2 (3 tiết lý thuyết + bài tập)</p>

  <div class="concept-callout">
    <h3>Mục tiêu chuẩn đầu ra</h3>
    <p>Thành thạo áp dụng 3 phép biến đổi dòng để đưa ma trận về dạng bậc thang (Row Echelon Form - REF) và bậc thang rút gọn (RREF), xác định vị trí pivot và hạng (rank) của ma trận.</p>
  </div>

  <h2>1. Ba phép biến đổi sơ cấp trên dòng (Elementary Row Operations)</h2>
  <ol>
    <li><strong>Hoán đổi:</strong> Đổi chỗ hai dòng $i$ và $j$: $r_i \\leftrightarrow r_j$.</li>
    <li><strong>Nhân vô hướng:</strong> Nhân một dòng với số thực $c \\neq 0$: $r_i \\leftarrow c \\cdot r_i$.</li>
    <li><strong>Cộng dòng:</strong> Cộng vào dòng $i$ một bội số của dòng $j$: $r_i \\leftarrow r_i + c \\cdot r_j$.</li>
  </ol>

  <h2>2. Ma trận bậc thang (REF) và bậc thang rút gọn (RREF)</h2>
  <p>Một ma trận ở dạng <strong>bậc thang (REF)</strong> khi thỏa mãn:</p>
  <ul>
    <li>Các dòng gồm toàn số 0 nằm ở dưới cùng.</li>
    <li>Hệ số dẫn đầu (pivot - phần tử khác 0 đầu tiên) của một dòng luôn nằm lệch sang phải so với pivot của dòng phía trên nó.</li>
  </ul>
  <p>Một ma trận ở dạng <strong>bậc thang rút gọn (RREF)</strong> nếu thỏa mãn thêm:</p>
  <ul>
    <li>Mọi pivot đều bằng $1$.</li>
    <li>Pivot là phần tử khác 0 duy nhất trong cột chứa nó.</li>
  </ul>
  <div class="math-block">
    $$\\text{RREF}(A) = \\begin{bmatrix} 1 & 0 & * & 0 & * \\\\ 0 & 1 & * & 0 & * \\\\ 0 & 0 & 0 & 1 & * \\\\ 0 & 0 & 0 & 0 & 0 \\end{bmatrix}$$
  </div>

  <h2>3. Định lý về hạng của ma trận (Rank)</h2>
  <p><strong>Hạng (Rank)</strong> của ma trận $A$, ký hiệu $\\text{rank}(A)$, chính là số lượng pivot trong dạng bậc thang của $A$:</p>
  <div class="math-block">
    $$\\text{rank}(A) = \\text{số dòng khác 0 trong REF}(A)$$
  </div>
</div>
    `,
    explanationMarkdown: `## Thuật toán khử Gauss đưa về REF

1. Tìm cột khác 0 ngoài cùng bên trái (cột pivot).
2. Hoán đổi dòng nếu cần để phần tử đầu cột khác 0.
3. Dùng phép cộng dòng $r_i \\leftarrow r_i - \\frac{a_{i1}}{a_{11}} r_1$ để triệt tiêu toàn bộ các phần tử bên dưới pivot.
4. Lặp lại với ma trận con thu được bằng cách bỏ dòng và cột chứa pivot vừa xử lý.`
  },

  "MATH.LA.03": {
    key: "MATH.LA.03",
    channelKey: "ch-01",
    channelName: "Chương 1: Ma trận & Hệ phương trình",
    title: "MATH.LA.03: Hệ phương trình đại số tuyến tính & phương pháp khử Gauss-Jordan",
    summary: "Hệ phương trình tuyến tính tổng quát A x = b, ma trận bổ sung, định lý Kronecker-Capelli và thuật toán giải toàn diện Gauss-Jordan.",
    publishedAt: Date.parse("2026-09-15T08:00:00Z"),
    videoUrl: "https://www.youtube.com/watch?v=2NzN_d_37jA",
    videoEmbedUrl: "https://www.youtube.com/embed/2NzN_d_37jA",
    image: "https://img.youtube.com/vi/2NzN_d_37jA/hqdefault.jpg",
    contentHtml: `
<div class="math-lesson">
  <h1>MATH.LA.03: Hệ phương trình đại số tuyến tính & Khử Gauss-Jordan</h1>
  <p class="lesson-meta"><strong>Môn học:</strong> Đại số tuyến tính ứng dụng | <strong>Phân bổ:</strong> Tuần 3 – Tuần 4 (6 tiết)</p>

  <div class="concept-callout">
    <h3>Mục tiêu chuẩn đầu ra</h3>
    <p>Biểu diễn hệ phương trình tuyến tính dưới dạng ma trận $A\\mathbf{x} = \\mathbf{b}$, áp dụng định lý Kronecker-Capelli để biện luận số nghiệm, và giải hệ bằng khử Gauss-Jordan.</p>
  </div>

  <h2>1. Biểu diễn ma trận của hệ phương trình tuyến tính</h2>
  <p>Hệ $m$ phương trình tuyến tính với $n$ ẩn số có dạng:</p>
  <div class="math-block">
    $$\\begin{cases} a_{11}x_1 + a_{12}x_2 + \\dots + a_{1n}x_n = b_1 \\\\ a_{21}x_1 + a_{22}x_2 + \\dots + a_{2n}x_n = b_2 \\\\ \\vdots \\\\ a_{m1}x_1 + a_{m2}x_2 + \\dots + a_{mn}x_n = b_m \\end{cases} \\iff A\\mathbf{x} = \\mathbf{b}$$
  </div>
  <p>Trong đó $A \\in \\mathbb{R}^{m \\times n}$ là ma trận hệ số, $\\mathbf{x} \\in \\mathbb{R}^n$ là vector ẩn, và $\\mathbf{b} \\in \\mathbb{R}^m$ là vector vế phải. Ma trận bổ sung được ký hiệu là $\\bar{A} = [A \\mid \\mathbf{b}]$.</p>

  <h2>2. Định lý Kronecker - Capelli (Điều kiện có nghiệm)</h2>
  <div class="theorem-box">
    <p><strong>Định lý:</strong> Hệ phương trình tuyến tính $A\\mathbf{x} = \\mathbf{b}$ có nghiệm khi và chỉ khi:</p>
    $$\\text{rank}(A) = \\text{rank}(\\bar{A})$$
    <ul>
      <li>Nếu $\\text{rank}(A) < \\text{rank}(\\bar{A})$: Hệ <strong>vô nghiệm</strong>.</li>
      <li>Nếu $\\text{rank}(A) = \\text{rank}(\\bar{A}) = n$ (số ẩn): Hệ có <strong>nghiệm duy nhất</strong>.</li>
      <li>Nếu $\\text{rank}(A) = \\text{rank}(\\bar{A}) = r < n$: Hệ có <strong>vô số nghiệm</strong>, phụ thuộc vào $n - r$ tham số tự do.</li>
    </ul>
  </div>

  <h2>3. Phương pháp khử Gauss - Jordan</h2>
  <p>Đưa ma trận bổ sung $[A \\mid \\mathbf{b}]$ về dạng bậc thang rút gọn $[\text{RREF}(A) \\mid \\mathbf{b}']$. Từ đó đọc trực tiếp nghiệm của các biến cơ sở (pivot variables) theo các biến tự do (free variables).</p>
</div>
    `,
    explanationMarkdown: `## Ứng dụng trong Kỹ thuật & Khoa học Máy tính

1. **Định tuyến mạng (Network Flow)**: Cân bằng lưu lượng dòng vào bằng dòng ra tại mỗi nút mạng biểu diễn bằng một hệ $A\\mathbf{x} = \\mathbf{0}$.
2. **Hồi quy tuyến tính (Linear Regression)**: Nghiệm xấp xỉ bình phương tối thiểu thỏa mãn phương trình pháp tuyến (Normal Equation):
   $$A^T A \\mathbf{x} = A^T \\mathbf{b}$$`
  },

  "MATH.LA.04": {
    key: "MATH.LA.04",
    channelKey: "ch-02",
    channelName: "Chương 2: Định thức & Ma trận nghịch đảo",
    title: "MATH.LA.04: Định thức (Determinant) và tính chất đại số",
    summary: "Ý nghĩa hình học của định thức, tỷ lệ phóng đại thể tích, công thức tính định thức qua khai triển Laplace và biến đổi sơ cấp.",
    publishedAt: Date.parse("2026-09-22T08:00:00Z"),
    videoUrl: "https://www.youtube.com/watch?v=Ip3X9LOh2dk",
    videoEmbedUrl: "https://www.youtube.com/embed/Ip3X9LOh2dk",
    image: "https://img.youtube.com/vi/Ip3X9LOh2dk/hqdefault.jpg",
    contentHtml: `
<div class="math-lesson">
  <h1>MATH.LA.04: Định thức (Determinant) & Tính chất đại số</h1>
  <p class="lesson-meta"><strong>Môn học:</strong> Đại số tuyến tính ứng dụng | <strong>Phân bổ:</strong> Tuần 5 – Tuần 6 (6 tiết)</p>

  <div class="concept-callout">
    <h3>Mục tiêu chuẩn đầu ra</h3>
    <p>Hiểu bản chất hình học của định thức (hệ số co dãn diện tích/thể tích của phép biến đổi tuyến tính), tính toán định thức cấp $n$ và vận dụng các tính chất đại số.</p>
  </div>

  <h2>1. Ý nghĩa hình học của định thức</h2>
  <p>Với ma trận $A \\in \\mathbb{R}^{2 \\times 2}$, giá trị tuyệt đối $|\\det(A)|$ bằng <strong>diện tích hình bình hành</strong> tạo bởi hai vector cột của $A$. Trong không gian $\\mathbb{R}^3$, $|\\det(A)|$ bằng <strong>thể tích khối hộp song song</strong>.</p>
  <p>Dấu của $\\det(A)$ chỉ ra phép biến đổi có làm đảo chiều định hướng không gian (orientation) hay không.</p>

  <h2>2. Các tính chất đại số cơ bản</h2>
  <ul>
    <li>$\\det(I) = 1$ (ma trận đơn vị có định thức bằng 1).</li>
    <li>$\\det(A^T) = \\det(A)$ (chuyển vị không làm đổi định thức).</li>
    <li><strong>Tính chất nhân:</strong> $\\det(AB) = \\det(A) \\cdot \\det(B)$.</li>
    <li>$\\det(cA) = c^n \\det(A)$ với $A$ cấp $n \\times n$.</li>
    <li>Nếu $A$ có một dòng (hoặc cột) toàn số 0, hoặc có 2 dòng tỉ lệ nhau thì $\\det(A) = 0$.</li>
    <li>Đổi chỗ 2 dòng làm định thức đổi dấu.</li>
    <li>Cộng vào một dòng bội số của dòng khác <em>không làm thay đổi</em> định thức.</li>
  </ul>

  <h2>3. Khai triển Laplace</h2>
  <div class="math-block">
    $$\\det(A) = \\sum_{j=1}^n (-1)^{i+j} a_{ij} M_{ij}$$
  </div>
  <p>Trong đó $M_{ij}$ là định thức con cấp $n-1$ thu được bằng cách bỏ hàng $i$ và cột $j$.</p>
</div>
    `,
    explanationMarkdown: `## Mẹo tính định thức nhanh trong thực tế

- Đưa ma trận về dạng tam giác trên (hoặc tam giác dưới) bằng các phép biến đổi sơ cấp dòng loại 3 (không làm đổi $\\det$).
- Định thức ma trận tam giác bằng **tích các phần tử trên đường chéo chính**:
  $$\\det(U) = u_{11} \\cdot u_{22} \\dots u_{nn}$$`
  },

  "MATH.LA.05": {
    key: "MATH.LA.05",
    channelKey: "ch-02",
    channelName: "Chương 2: Định thức & Ma trận nghịch đảo",
    title: "MATH.LA.05: Ma trận nghịch đảo và phương pháp tìm nghịch đảo",
    summary: "Điều kiện khả nghịch det(A) ≠ 0, công thức ma trận phụ hợp và thuật toán tìm nghịch đảo Gauss-Jordan [A | I] -> [I | A^-1].",
    publishedAt: Date.parse("2026-09-29T08:00:00Z"),
    videoUrl: "https://www.youtube.com/watch?v=FX4C-JpTFgY",
    videoEmbedUrl: "https://www.youtube.com/embed/FX4C-JpTFgY",
    image: "https://img.youtube.com/vi/FX4C-JpTFgY/hqdefault.jpg",
    contentHtml: `
<div class="math-lesson">
  <h1>MATH.LA.05: Ma trận nghịch đảo & Phương pháp tìm nghịch đảo</h1>
  <p class="lesson-meta"><strong>Môn học:</strong> Đại số tuyến tính ứng dụng | <strong>Phân bổ:</strong> Tuần 7 (3 tiết)</p>

  <div class="concept-callout">
    <h3>Mục tiêu chuẩn đầu ra</h3>
    <p>Nắm vững định nghĩa ma trận khả nghịch, thành thạo tìm $A^{-1}$ bằng phương pháp Gauss-Jordan và phương pháp ma trận phụ hợp, áp dụng giải phương trình ma trận.</p>
  </div>

  <h2>1. Định nghĩa ma trận nghịch đảo</h2>
  <p>Cho ma trận vuông $A$ cấp $n$. Nếu tồn tại ma trận $B$ sao cho $AB = BA = I_n$ thì $A$ được gọi là <strong>khả nghịch (invertible / non-singular)</strong>, và $B$ được gọi là ma trận nghịch đảo của $A$, ký hiệu $A^{-1}$.</p>
  <div class="theorem-box">
    <p><strong>Điều kiện cần và đủ:</strong> Ma trận $A$ khả nghịch khi và chỉ khi:</p>
    $$\\det(A) \\neq 0 \\iff \\text{rank}(A) = n$$
  </div>

  <h2>2. Thuật toán tìm ma trận nghịch đảo Gauss - Jordan</h2>
  <p>Ghép ma trận đơn vị $I$ vào bên phải ma trận $A$ để lập ma trận khối $[A \\mid I_n]$. Dùng các phép biến đổi sơ cấp dòng đưa nửa bên trái về $I_n$:</p>
  <div class="math-block">
    $$[A \\mid I_n] \\xrightarrow{\\text{Row Operations}} [I_n \\mid A^{-1}]$$
  </div>
  <p>Nếu trong quá trình biến đổi, nửa bên trái xuất hiện một dòng toàn số 0 thì $A$ không khả nghịch.</p>

  <h2>3. Tính chất của ma trận nghịch đảo</h2>
  <ul>
    <li>$(A^{-1})^{-1} = A$</li>
    <li>$(AB)^{-1} = B^{-1} A^{-1}$ (đảo thứ tự khi nghịch đảo tích)</li>
    <li>$(A^T)^{-1} = (A^{-1})^T$</li>
    <li>$\\det(A^{-1}) = \\frac{1}{\\det(A)}$</li>
  </ul>
</div>
    `,
    explanationMarkdown: `## Công thức ma trận phụ hợp (Adjugate Formula)

$$A^{-1} = \\frac{1}{\\det(A)} \\text{adj}(A)$$

Với ma trận cấp $2 \\times 2$:
$$\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}^{-1} = \\frac{1}{ad - bc} \\begin{bmatrix} d & -b \\\\ -c & a \\end{bmatrix}$$`
  },

  "MATH.LA.06": {
    key: "MATH.LA.06",
    channelKey: "ch-03",
    channelName: "Chương 3: Không gian vector Euclide",
    title: "MATH.LA.06: Không gian vector R^n, tổ hợp tuyến tính và hệ độc lập tuyến tính",
    summary: "Không gian vector Euclid R^n, khái niệm Span (không gian sinh), tổ hợp tuyến tính và điều kiện độc lập tuyến tính / phụ thuộc tuyến tính.",
    publishedAt: Date.parse("2026-10-06T08:00:00Z"),
    videoUrl: "https://www.youtube.com/watch?v=k7RM-ot2NWY",
    videoEmbedUrl: "https://www.youtube.com/embed/k7RM-ot2NWY",
    image: "https://img.youtube.com/vi/k7RM-ot2NWY/hqdefault.jpg",
    contentHtml: `
<div class="math-lesson">
  <h1>MATH.LA.06: Không gian vector $\\mathbb{R}^n$, Tổ hợp tuyến tính & Độc lập tuyến tính</h1>
  <p class="lesson-meta"><strong>Môn học:</strong> Đại số tuyến tính ứng dụng | <strong>Phân bổ:</strong> Tuần 8 – Tuần 9 (6 tiết)</p>

  <div class="concept-callout">
    <h3>Mục tiêu chuẩn đầu ra</h3>
    <p>Hiểu bản chất không gian vector $\\mathbb{R}^n$, kiểm tra hệ vector độc lập tuyến tính hay phụ thuộc tuyến tính bằng cách giải hệ thuần nhất $A\\mathbf{x} = \\mathbf{0}$.</p>
  </div>

  <h2>1. Tổ hợp tuyến tính (Linear Combination) và Bao tuyến tính (Span)</h2>
  <p>Cho tập các vector $\\{\\mathbf{v}_1, \\mathbf{v}_2, \\dots, \\mathbf{v}_k\\} \\subset \\mathbb{R}^n$. Một vector $\\mathbf{w}$ được gọi là <strong>tổ hợp tuyến tính</strong> của hệ nếu tồn tại các số thực $c_1, \\dots, c_k$ sao cho:</p>
  <div class="math-block">
    $$\\mathbf{w} = c_1 \\mathbf{v}_1 + c_2 \\mathbf{v}_2 + \\dots + c_k \\mathbf{v}_k$$
  </div>
  <p>Tập hợp tất cả các tổ hợp tuyến tính của hệ được gọi là <strong>không gian sinh (Span)</strong>:</p>
  <div class="math-block">
    $$\\text{Span}(\\mathbf{v}_1, \\dots, \\mathbf{v}_k) = \\left\\{ \\sum_{i=1}^k c_i \\mathbf{v}_i \\;\\middle|\\; c_i \\in \\mathbb{R} \\right\\}$$
  </div>

  <h2>2. Độc lập tuyến tính (Linear Independence)</h2>
  <p>Hệ vector $\\{\\mathbf{v}_1, \\dots, \\mathbf{v}_k\\}$ được gọi là <strong>độc lập tuyến tính</strong> nếu phương trình vectơ:</p>
  <div class="math-block">
    $$c_1 \\mathbf{v}_1 + c_2 \\mathbf{v}_2 + \\dots + c_k \\mathbf{v}_k = \\mathbf{0}$$
  </div>
  <p><strong>chỉ có nghiệm duy nhất</strong> $c_1 = c_2 = \\dots = c_k = 0$. Nếu tồn tại ít nhất một $c_i \\neq 0$ thỏa mãn phương trình trên thì hệ là <strong>phụ thuộc tuyến tính</strong>.</p>
</div>
    `,
    explanationMarkdown: `## Tiêu chuẩn ma trận kiểm tra độc lập tuyến tính

Xếp các vector thành các cột của ma trận $A = [\\mathbf{v}_1 \\mid \\mathbf{v}_2 \\mid \\dots \\mid \\mathbf{v}_k]$:
- Hệ **độc lập tuyến tính** $\\iff$ Hệ thuần nhất $A\\mathbf{c} = \\mathbf{0}$ chỉ có nghiệm tầm thường $\\mathbf{c} = \\mathbf{0} \\iff \\text{rank}(A) = k$ (mọi cột đều có pivot).
- Nếu số vector $k > n$ (số chiều không gian) thì hệ **chắc chắn phụ thuộc tuyến tính**.`
  },

  "MATH.LA.07": {
    key: "MATH.LA.07",
    channelKey: "ch-03",
    channelName: "Chương 3: Không gian vector Euclide",
    title: "MATH.LA.07: Cơ sở, số chiều (Dimension) và 4 không gian con cơ bản",
    summary: "Cơ sở của không gian vector, số chiều, định lý Rank-Nullity và 4 không gian con cơ bản của ma trận: C(A), N(A), C(A^T), N(A^T).",
    publishedAt: Date.parse("2026-10-13T08:00:00Z"),
    videoUrl: "https://www.youtube.com/watch?v=nP390Vdc_Xg",
    videoEmbedUrl: "https://www.youtube.com/embed/nP390Vdc_Xg",
    image: "https://img.youtube.com/vi/nP390Vdc_Xg/hqdefault.jpg",
    contentHtml: `
<div class="math-lesson">
  <h1>MATH.LA.07: Cơ sở, Số chiều & Bốn không gian con cơ bản</h1>
  <p class="lesson-meta"><strong>Môn học:</strong> Đại số tuyến tính ứng dụng | <strong>Phân bổ:</strong> Tuần 10 – Tuần 11 (6 tiết)</p>

  <div class="concept-callout">
    <h3>Mục tiêu chuẩn đầu ra</h3>
    <p>Nắm vững khái niệm cơ sở và số chiều, xác định cơ sở của 4 không gian con cơ bản của ma trận theo định lý cơ bản của Gilbert Strang.</p>
  </div>

  <h2>1. Cơ sở (Basis) và Số chiều (Dimension)</h2>
  <p>Một tập vector $\\mathcal{B} = \\{\\mathbf{v}_1, \\dots, \\mathbf{v}_d\\}$ là một <strong>cơ sở</strong> của không gian vector $V$ nếu:</p>
  <ol>
    <li>$\\mathcal{B}$ độc lập tuyến tính.</li>
    <li>$\\text{Span}(\\mathcal{B}) = V$ (sinh ra toàn bộ $V$).</li>
  </ol>
  <p>Số lượng vector trong cơ sở được gọi là <strong>số chiều</strong> của $V$, ký hiệu $\\dim(V) = d$.</p>

  <h2>2. Bốn không gian con cơ bản của ma trận $A \\in \\mathbb{R}^{m \\times n}$</h2>
  <table class="math-table">
    <thead>
      <tr>
        <th>Không gian con</th>
        <th>Ký hiệu</th>
        <th>Không gian chứa</th>
        <th>Số chiều</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Không gian cột (Column Space)</td>
        <td>$C(A)$</td>
        <td>$\\mathbb{R}^m$</td>
        <td>$r = \\text{rank}(A)$</td>
      </tr>
      <tr>
        <td>Không gian dòng (Row Space)</td>
        <td>$C(A^T)$</td>
        <td>$\\mathbb{R}^n$</td>
        <td>$r = \\text{rank}(A)$</td>
      </tr>
      <tr>
        <td>Không gian nghiệm (Null Space)</td>
        <td>$N(A)$</td>
        <td>$\\mathbb{R}^n$</td>
        <td>$n - r$</td>
      </tr>
      <tr>
        <td>Không gian nghiệm trái (Left Null Space)</td>
        <td>$N(A^T)$</td>
        <td>$\\mathbb{R}^m$</td>
        <td>$m - r$</td>
      </tr>
    </tbody>
  </table>

  <h2>3. Định lý Rank - Nullity</h2>
  <div class="math-block">
    $$\\dim(C(A)) + \\dim(N(A)) = \\text{rank}(A) + \\text{nullity}(A) = n$$
  </div>
  <p>Hơn nữa, $C(A^T) \\perp N(A)$ (không gian dòng trực giao với không gian nghiệm trong $\\mathbb{R}^n$), và $C(A) \\perp N(A^T)$ trong $\\mathbb{R}^m$.</p>
</div>
    `,
    explanationMarkdown: `## Ý nghĩa 4 không gian con

Mỗi phép nhân ma trận - vector $\\mathbf{x} \\mapsto A\\mathbf{x}$ biến đổi:
1. Thành phần của $\\mathbf{x}$ nằm trong $N(A)$ bị triệt tiêu về $\\mathbf{0}$.
2. Thành phần của $\\mathbf{x}$ nằm trong $C(A^T)$ được ánh xạ 1-1 sang $C(A)$.`
  },

  "MATH.LA.08": {
    key: "MATH.LA.08",
    channelKey: "ch-04",
    channelName: "Chương 4: Trị riêng & Vector riêng",
    title: "MATH.LA.08: Giá trị riêng, vector riêng (Eigenvalues & Eigenvectors) và bài toán chéo hóa",
    summary: "Phương trình đặc trưng det(A - λ I) = 0, tìm vector riêng tương ứng, điều kiện chéo hóa ma trận A = P D P^-1 và ứng dụng lũy thừa ma trận.",
    publishedAt: Date.parse("2026-10-20T08:00:00Z"),
    videoUrl: "https://www.youtube.com/watch?v=PFDu9oVAE-g",
    videoEmbedUrl: "https://www.youtube.com/embed/PFDu9oVAE-g",
    image: "https://img.youtube.com/vi/PFDu9oVAE-g/hqdefault.jpg",
    contentHtml: `
<div class="math-lesson">
  <h1>MATH.LA.08: Trị riêng, Vector riêng & Bài toán chéo hóa</h1>
  <p class="lesson-meta"><strong>Môn học:</strong> Đại số tuyến tính ứng dụng | <strong>Phân bổ:</strong> Tuần 12 – Tuần 13 (6 tiết)</p>

  <div class="concept-callout">
    <h3>Mục tiêu chuẩn đầu ra</h3>
    <p>Tìm đa thức đặc trưng, tính trị riêng và không gian riêng (eigenspace), kiểm tra điều kiện chéo hóa ma trận và ứng dụng giải hệ phương trình vi phân / mô hình Markov.</p>
  </div>

  <h2>1. Định nghĩa Trị riêng & Vector riêng</h2>
  <p>Cho ma trận vuông $A \\in \\mathbb{R}^{n \\times n}$. Số vô hướng $\\lambda$ được gọi là <strong>giá trị riêng (eigenvalue)</strong> của $A$ nếu tồn tại vector khác không $\\mathbf{v} \\neq \\mathbf{0}$ sao cho:</p>
  <div class="math-block">
    $$A\\mathbf{v} = \\lambda \\mathbf{v} \\iff (A - \\lambda I)\\mathbf{v} = \\mathbf{0}$$
  </div>
  <p>Vector $\\mathbf{v}$ được gọi là <strong>vector riêng (eigenvector)</strong> ứng với trị riêng $\\lambda$.</p>

  <h2>2. Phương trình đặc trưng (Characteristic Equation)</h2>
  <p>Để hệ $(A - \\lambda I)\\mathbf{v} = \\mathbf{0}$ có nghiệm không tầm thường, ta phải có:</p>
  <div class="math-block">
    $$p(\\lambda) = \\det(A - \\lambda I) = 0$$
  </div>
  <p>Các nghiệm của phương trình trên chính là các giá trị riêng của $A$.</p>

  <h2>3. Chéo hóa ma trận (Diagonalization)</h2>
  <p>Ma trận $A$ <strong>chéo hóa được</strong> khi và chỉ khi $A$ có đủ $n$ vector riêng độc lập tuyến tính $\\{\\mathbf{v}_1, \\dots, \\mathbf{v}_n\\}$. Khi đó:</p>
  <div class="math-block">
    $$A = P D P^{-1}$$
  </div>
  <p>Trong đó $P = [\\mathbf{v}_1 \\mid \\dots \\mid \\mathbf{v}_n]$ là ma trận chứa các vector riêng ở các cột, và $D = \\text{diag}(\\lambda_1, \\dots, \\lambda_n)$ là ma trận đường chéo chứa các giá trị riêng tương ứng.</p>
  <p><em>Ứng dụng:</em> Tính lũy thừa ma trận cực nhanh: $A^k = P D^k P^{-1}$.</p>
</div>
    `,
    explanationMarkdown: `## Ứng dụng: Chuỗi Markov & Thuật toán PageRank

Trong chuỗi Markov, vector trạng thái xác suất tại bước $k+1$ tuân theo $\\mathbf{p}_{k+1} = P \\mathbf{p}_k$. Trạng thái dừng cân bằng $\\mathbf{p}_\\infty$ chính là vector riêng ứng với giá trị riêng $\\lambda = 1$:
$$P \\mathbf{p}_\\infty = \\mathbf{p}_\\infty$$`
  },

  "MATH.LA.09": {
    key: "MATH.LA.09",
    channelKey: "ch-04",
    channelName: "Chương 4: Trị riêng & Vector riêng",
    title: "MATH.LA.09: Trực giao hóa Gram-Schmidt và phân tích ma trận QR",
    summary: "Tích vô hướng trong R^n, hệ trực giao/trực chuẩn, thuật toán trực giao hóa Gram-Schmidt và phân tích ma trận A = Q R.",
    publishedAt: Date.parse("2026-10-27T08:00:00Z"),
    videoUrl: "https://www.youtube.com/watch?v=Y_Ac6KiQ1t0",
    videoEmbedUrl: "https://www.youtube.com/embed/Y_Ac6KiQ1t0",
    image: "https://img.youtube.com/vi/Y_Ac6KiQ1t0/hqdefault.jpg",
    contentHtml: `
<div class="math-lesson">
  <h1>MATH.LA.09: Trực giao hóa Gram - Schmidt & Phân tích ma trận QR</h1>
  <p class="lesson-meta"><strong>Môn học:</strong> Đại số tuyến tính ứng dụng | <strong>Phân bổ:</strong> Tuần 14 (3 tiết)</p>

  <div class="concept-callout">
    <h3>Mục tiêu chuẩn đầu ra</h3>
    <p>Biến đổi cơ sở bất kỳ thành cơ sở trực chuẩn (Orthonormal Basis) bằng thuật toán Gram-Schmidt, phân tích ma trận $A = QR$ ứng dụng giải bài toán bình phương cực tiểu.</p>
  </div>

  <h2>1. Hệ trực giao & Hệ trực chuẩn</h2>
  <p>Hai vector $\\mathbf{u}, \\mathbf{v} \\in \\mathbb{R}^n$ trực giao nhau nếu tích vô hướng bằng 0: $\\mathbf{u}^T \\mathbf{v} = 0$.</p>
  <p>Một hệ vector $\\{\\mathbf{q}_1, \\dots, \\mathbf{q}_k\\}$ là <strong>trực chuẩn (orthonormal)</strong> nếu:</p>
  <div class="math-block">
    $$\\mathbf{q}_i^T \\mathbf{q}_j = \\begin{cases} 1 & \\text{khi } i = j \\\\ 0 & \\text{khi } i \\neq j \\end{cases}$$
  </div>

  <h2>2. Thuật toán trực giao hóa Gram - Schmidt</h2>
  <p>Từ cơ sở $\\{\\mathbf{v}_1, \\dots, \\mathbf{v}_k\\}$, xây dựng cơ sở trực giao $\\{\\mathbf{u}_1, \\dots, \\mathbf{u}_k\\}$:</p>
  <div class="math-block">
    $$\\begin{aligned} \\mathbf{u}_1 &= \\mathbf{v}_1 \\\\ \\mathbf{u}_2 &= \\mathbf{v}_2 - \\frac{\\mathbf{u}_1^T \\mathbf{v}_2}{\\mathbf{u}_1^T \\mathbf{u}_1} \\mathbf{u}_1 \\\\ \\mathbf{u}_k &= \\mathbf{v}_k - \\sum_{j=1}^{k-1} \\frac{\\mathbf{u}_j^T \\mathbf{v}_k}{\\mathbf{u}_j^T \\mathbf{u}_j} \\mathbf{u}_j \\end{aligned}$$
  </div>
  <p>Sau đó chuẩn hóa từng vector: $\\mathbf{q}_i = \\frac{\\mathbf{u}_i}{\\|\\mathbf{u}_i\\|}$.</p>

  <h2>3. Phân tích ma trận $A = QR$</h2>
  <div class="math-block">
    $$A = Q R$$
  </div>
  <p>Trong đó $Q$ có các cột trực chuẩn ($Q^T Q = I$), và $R$ là ma trận tam giác trên khả nghịch. Bài toán bình phương tối thiểu $A\\mathbf{x} = \\mathbf{b}$ trở thành giải hệ tam giác:</p>
  <div class="math-block">
    $$R\\mathbf{x} = Q^T \\mathbf{b}$$
  </div>
</div>
    `,
    explanationMarkdown: `## Ưu điểm của phân tích QR

Thuật toán QR ổn định về mặt số học hơn nhiều so với việc tính trực tiếp ma trận nghịch đảo $(A^T A)^{-1}$, tránh hiện tượng ma trận bị xấu điều kiện (ill-conditioned matrix).`
  },

  "MATH.LA.10": {
    key: "MATH.LA.10",
    channelKey: "ch-05",
    channelName: "Chương 5: Phân tích SVD & Ứng dụng DS",
    title: "MATH.LA.10: Phân tích giá trị suy biến (Singular Value Decomposition - SVD) và ứng dụng thực tế",
    summary: "Định lý SVD: A = U Σ V^T, ý nghĩa hình học, xấp xỉ ma trận hạng thấp Eckart-Young, nén ảnh, lọc cộng tác và phân tích thành phần chính PCA.",
    publishedAt: Date.parse("2026-11-03T08:00:00Z"),
    videoUrl: "https://www.youtube.com/watch?v=gXbThCXjZFM",
    videoEmbedUrl: "https://www.youtube.com/embed/gXbThCXjZFM",
    image: "https://img.youtube.com/vi/gXbThCXjZFM/hqdefault.jpg",
    contentHtml: `
<div class="math-lesson">
  <h1>MATH.LA.10: Phân tích giá trị suy biến (SVD) & Ứng dụng</h1>
  <p class="lesson-meta"><strong>Môn học:</strong> Đại số tuyến tính ứng dụng | <strong>Phân bổ:</strong> Tuần 15 (Tổng kết chuyên đề Data Science)</p>

  <div class="concept-callout">
    <h3>Mục tiêu chuẩn đầu ra</h3>
    <p>Nắm vững định lý phân tích giá trị suy biến $A = U \\Sigma V^T$ cho ma trận hình chữ nhật bất kỳ, hiểu định lý Eckart-Young về xấp xỉ hạng thấp (Low-rank approximation) và ứng dụng nén ảnh, hệ gợi ý (Collaborative Filtering) và PCA.</p>
  </div>

  <h2>1. Định lý phân tích SVD</h2>
  <p>Mọi ma trận thực $A \\in \\mathbb{R}^{m \\times n}$ bất kỳ đều có thể phân tích thành tích của 3 ma trận:</p>
  <div class="math-block">
    $$A = U \\Sigma V^T$$
  </div>
  <p>Trong đó:</p>
  <ul>
    <li>$U \\in \\mathbb{R}^{m \\times m}$ là ma trận trực giao ($U^T U = I_m$), các cột $\\mathbf{u}_i$ là các <strong>left singular vectors</strong> (vector riêng của $AA^T$).</li>
    <li>$V \\in \\mathbb{R}^{n \\times n}$ là ma trận trực giao ($V^T V = I_n$), các cột $\\mathbf{v}_i$ là các <strong>right singular vectors</strong> (vector riêng của $A^T A$).</li>
    <li>$\\Sigma \\in \\mathbb{R}^{m \\times n}$ là ma trận đường chéo chữ nhật chứa các <strong>giá trị suy biến (singular values)</strong> được sắp xếp giảm dần:
      $$\\sigma_1 \\ge \\sigma_2 \\ge \\dots \\ge \\sigma_r > 0 = \\sigma_{r+1} = \\dots = 0$$
      với $\\sigma_i = \\sqrt{\\lambda_i(A^T A)}$.
    </li>
  </ul>

  <h2>2. Dạng phân rã tổng các ma trận hạng 1 (Dyadic Expansion)</h2>
  <div class="math-block">
    $$A = \\sum_{i=1}^r \\sigma_i \\mathbf{u}_i \\mathbf{v}_i^T = \\sigma_1 \\mathbf{u}_1 \\mathbf{v}_1^T + \\sigma_2 \\mathbf{u}_2 \\mathbf{v}_2^T + \\dots + \\sigma_r \\mathbf{u}_r \\mathbf{v}_r^T$$
  </div>
  <p>Mỗi số hạng $\\sigma_i \\mathbf{u}_i \\mathbf{v}_i^T$ là một ma trận cấp $m \\times n$ có hạng đúng bằng 1.</p>

  <h2>3. Định lý Eckart - Young - Mirsky (Xấp xỉ hạng thấp)</h2>
  <div class="theorem-box">
    <p><strong>Định lý:</strong> Với số nguyên $k < r$, ma trận hạng $k$ xấp xỉ tốt nhất cho ma trận $A$ theo chuẩn Frobenius $\\|\\cdot\\|_F$ hoặc chuẩn Spectral $\\|\\cdot\\|_2$ là:</p>
    $$A_k = \\sum_{i=1}^k \\sigma_i \\mathbf{u}_i \\mathbf{v}_i^T$$
    $$\\min_{\\text{rank}(B) \\le k} \\|A - B\\|_F = \\|A - A_k\\|_F = \\sqrt{\\sum_{i=k+1}^r \\sigma_i^2}$$
  </div>

  <h2>4. Ứng dụng thực tế trong AI & Data Science</h2>
  <h3>4.1. Nén ảnh và Khử nhiễu (Image Compression & Denoising)</h3>
  <p>Một bức ảnh xám kích thước $m \\times n$ lưu trữ $m \\times n$ số thực. Thay vì lưu toàn bộ, ta chỉ lưu $k$ bộ $(\\mathbf{u}_i, \\sigma_i, \\mathbf{v}_i)$ với chi phí lưu trữ $k(m + n + 1)$. Với $k \\ll \\min(m, n)$, ta tiết kiệm tới 80-90% dung lượng mà vẫn giữ nguyên các đặc trưng trực quan của bức ảnh.</p>

  <h3>4.2. Giảm chiều dữ liệu PCA (Principal Component Analysis)</h3>
  <p>Với ma trận dữ liệu đã chuẩn hóa tâm $\\tilde{X} \\in \\mathbb{R}^{N \\times D}$, phân tích SVD $\\tilde{X} = U \\Sigma V^T$ cho ra ngay các trục thành phần chính (Principal Components) chính là các cột của $V$. Tọa độ của dữ liệu trên không gian $k$ chiều mới là $Z = \\tilde{X} V_k$.</p>
</div>
    `,
    explanationMarkdown: `## Tóm tắt công thức SVD

$$A = U \\Sigma V^T = \\sum_{i=1}^r \\sigma_i \\mathbf{u}_i \\mathbf{v}_i^T$$

- **Left singular vectors**: $A A^T \\mathbf{u}_i = \\sigma_i^2 \\mathbf{u}_i$
- **Right singular vectors**: $A^T A \\mathbf{v}_i = \\sigma_i^2 \\mathbf{v}_i$
- **Mối liên hệ chuyển giao**: $A \\mathbf{v}_i = \\sigma_i \\mathbf{u}_i$`
  }
};


function ensureKatex() {
  if (typeof document === 'undefined') return;
  if (!document.getElementById('katex-css')) {
    const link = document.createElement('link');
    link.id = 'katex-css';
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
    document.head.appendChild(link);
  }
  if (!document.getElementById('math-la-custom-styles')) {
    const div = document.createElement('div');
    div.innerHTML = "\n<style id=\"math-la-custom-styles\">\n  .math-lesson { font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif; line-height: 1.7; color: var(--dsw-alias-label-primary, #e2e8f0); }\n  .math-lesson h1 { font-size: 20px; font-weight: 700; margin-bottom: 8px; color: var(--dsw-alias-label-primary, #f8fafc); }\n  .math-lesson h2 { font-size: 16px; font-weight: 600; margin-top: 24px; margin-bottom: 10px; border-bottom: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.1)); padding-bottom: 6px; }\n  .math-lesson h3 { font-size: 14.5px; font-weight: 600; margin-top: 18px; margin-bottom: 8px; }\n  .lesson-meta { font-size: 13px; color: var(--dsw-alias-label-muted, #94a3b8); margin-bottom: 16px; }\n  .concept-callout { background: rgba(59, 130, 246, 0.1); border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 6px; margin: 16px 0; }\n  .concept-callout h3 { margin: 0 0 6px 0; font-size: 13.5px; font-weight: 600; color: #60a5fa; text-transform: uppercase; letter-spacing: 0.5px; }\n  .theorem-box { background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-left: 4px solid #10b981; padding: 12px 16px; border-radius: 6px; margin: 16px 0; }\n  .theorem-box p:first-child { margin-top: 0; }\n  .math-block { margin: 16px 0; padding: 12px 16px; background: rgba(0,0,0,0.25); border-radius: 6px; overflow-x: auto; text-align: center; }\n  .math-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13.5px; }\n  .math-table th, .math-table td { border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.15)); padding: 8px 12px; text-align: left; }\n  .math-table th { background: rgba(255,255,255,0.05); font-weight: 600; }\n  .katex-display { margin: 0.5em 0 !important; }\n</style>\n";
    document.head.appendChild(div.firstElementChild);
  }
  if (!window.katex && !document.getElementById('katex-js')) {
    const s = document.createElement('script');
    s.id = 'katex-js';
    s.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js';
    s.onload = () => {
      const s2 = document.createElement('script');
      s2.id = 'katex-auto-render-js';
      s2.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js';
      s2.onload = () => setTimeout(triggerMathRender, 50);
      document.head.appendChild(s2);
    };
    document.head.appendChild(s);
  } else {
    setTimeout(triggerMathRender, 50);
  }
}

function triggerMathRender() {
  if (typeof window !== 'undefined' && typeof window.renderMathInElement === 'function') {
    const elms = document.querySelectorAll('.qrs-prose, .math-lesson');
    elms.forEach(el => {
      try {
        window.renderMathInElement(el, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true }
          ],
          throwOnError: false
        });
      } catch (err) {
        console.warn('KaTeX render error:', err);
      }
    });
  }
}


function createVaiApi() {
  let activeChannel = 'all-math-la';

  return {
    async listChannels() {
      ensureKatex();
      const read = mapGet(STORE_KEYS.read);
      let ytEntries = [];
      try {
        const data = await http("/api/videos?limit=100");
        ytEntries = (data.items ?? []).map(toEntry);
      } catch (e) {
        console.warn("vai-crawler not available, using offline mode", e.message);
      }

      const channels = [
        ...MATH_LA_CHANNELS.map(ch => {
          let count = 0;
          let unreadCount = 0;
          if (ch.key === 'all-math-la') {
            count = Object.keys(MATH_LA_LESSONS).length;
            unreadCount = Object.keys(MATH_LA_LESSONS).filter(k => !read[k]).length;
          } else {
            const lessons = Object.values(MATH_LA_LESSONS).filter(l => l.channelKey === ch.key);
            count = lessons.length;
            unreadCount = lessons.filter(l => !read[l.key]).length;
          }
          return {
            ...ch,
            unread: unreadCount,
            total: count
          };
        }),
        {
          key: CHANNEL_KEY,
          kind: "feed",
          name: "Video AI Engineer (Tin tức & Nghiên cứu)",
          unread: ytEntries.filter(entry => !read[entry.key]).length,
          total: ytEntries.length || 245
        }
      ];

      return { channels };
    },

    async listEntries(request = {}) {
      ensureKatex();
      const read = mapGet(STORE_KEYS.read);
      const favorite = mapGet(STORE_KEYS.favorite);
      const channelKey = request.channelKey || activeChannel;
      activeChannel = channelKey;

      if (channelKey === CHANNEL_KEY) {
        try {
          const data = await http("/api/videos?limit=100");
          let entries = (data.items ?? []).map(toEntry);
          if (request.filter === "unread") entries = entries.filter(entry => !entry.read);
          if (request.filter === "favorites") entries = entries.filter(entry => entry.favorite);
          const search = String(request.search ?? "").trim().toLowerCase();
          if (search) entries = entries.filter(entry => entry.title.toLowerCase().includes(search));
          return { entries, hasMore: false };
        } catch (e) {
          console.warn("Crawl fetch failed:", e.message);
        }
      }

      // Filter Math LA lessons
      let lessons = Object.values(MATH_LA_LESSONS);
      if (channelKey && channelKey !== 'all-math-la') {
        lessons = lessons.filter(l => l.channelKey === channelKey);
      }

      let entries = lessons.map(l => ({
        key: l.key,
        channelKey: l.channelKey,
        channelName: l.channelName,
        title: l.title,
        summary: summarize(l.summary),
        publishedAt: l.publishedAt,
        url: l.videoUrl,
        image: l.image,
        read: read[l.key] !== undefined,
        favorite: favorite[l.key] !== undefined,
        hasBody: true
      }));

      if (request.filter === "unread") entries = entries.filter(entry => !entry.read);
      if (request.filter === "favorites") entries = entries.filter(entry => entry.favorite);
      const search = String(request.search ?? "").trim().toLowerCase();
      if (search) entries = entries.filter(entry => entry.title.toLowerCase().includes(search) || entry.summary.toLowerCase().includes(search));

      return { entries, hasMore: false };
    },

    async getArticle(key) {
      ensureKatex();
      setTimeout(triggerMathRender, 100);
      setTimeout(triggerMathRender, 300);

      // Check if Math LA lesson
      if (MATH_LA_LESSONS[key]) {
        const l = MATH_LA_LESSONS[key];
        return {
          article: {
            key: l.key,
            channelKey: l.channelKey,
            channelName: l.channelName,
            title: l.title,
            summary: summarize(l.summary),
            publishedAt: l.publishedAt,
            url: l.videoUrl,
            image: l.image,
            read: mapGet(STORE_KEYS.read)[key] !== undefined,
            favorite: mapGet(STORE_KEYS.favorite)[key] !== undefined,
            hasBody: true
          },
          videoPlayerUrl: l.videoEmbedUrl,
          html: l.contentHtml,
          truncated: false,
          versions: {
            original: {
              available: true,
              title: "Lý thuyết & Công thức LaTeX",
              html: l.contentHtml
            },
            rewrite: {
              available: true,
              status: "ok",
              title: "Trọng tâm & Ứng dụng DS/AI",
              markdown: l.explanationMarkdown,
              source: "SkillTree Linear Algebra Engine"
            }
          }
        };
      }

      // Otherwise fetch from crawler
      const [detail, versions] = await Promise.all([
        http(`/api/videos/${encodeURIComponent(key)}`),
        versionsFor(key)
      ]);
      const video = detail.video ?? {};
      return {
        article: {
          key,
          channelKey: CHANNEL_KEY,
          channelName: CHANNEL_NAME,
          title: video.title ?? "",
          summary: summarize(video.description),
          publishedAt: publishedMs(video.publish_date),
          url: `https://www.youtube.com/watch?v=${key}`,
          image: video.thumbnail_url || void 0,
          read: mapGet(STORE_KEYS.read)[key] !== undefined,
          favorite: mapGet(STORE_KEYS.favorite)[key] !== undefined,
          hasBody: true
        },
        videoPlayerUrl: `https://www.youtube.com/embed/${key}`,
        html: versions.original.html ?? "",
        truncated: false,
        versions
      };
    },

    async refresh() {
      return { feeds: MATH_LA_CHANNELS.length, entries: Object.keys(MATH_LA_LESSONS).length };
    },

    async generateVersion(key, kind) {
      if (MATH_LA_LESSONS[key]) {
        return {
          available: true,
          status: "ok",
          title: "Trọng tâm & Ứng dụng DS/AI",
          markdown: MATH_LA_LESSONS[key].explanationMarkdown,
          source: "SkillTree Linear Algebra Engine",
          generatedAt: Date.now()
        };
      }
      const { job_id: jobId } = await http(`/api/explain/${encodeURIComponent(key)}`, { method: "POST" });
      const job = await pollJob(jobId, { timeoutMs: 6e5, intervalMs: 4e3 });
      return {
        available: true,
        status: "ok",
        title: "Giải thích AI (vai-crawler)",
        markdown: explanationsToMarkdown(job.result ?? {}),
        source: "vai-crawler",
        generatedAt: Date.now()
      };
    },

    async getVersionContent(request = {}) {
      if (MATH_LA_LESSONS[request.key]) {
        const l = MATH_LA_LESSONS[request.key];
        if (request.kind === "original") return { available: true, title: "Lý thuyết & Công thức LaTeX", html: l.contentHtml };
        if (request.kind === "rewrite") return { available: true, status: "ok", title: "Trọng tâm & Ứng dụng DS/AI", markdown: l.explanationMarkdown };
        return { available: false, status: "missing" };
      }
      const versions = await versionsFor(request.key);
      return versions[request.kind] ?? { available: false, status: "missing" };
    },

    async setRead(keys, read) {
      const map = mapGet(STORE_KEYS.read);
      for (const key of keys ?? []) {
        if (read) map[key] = Date.now();
        else delete map[key];
      }
      mapSet(STORE_KEYS.read, map);
      return { ok: true };
    },

    async setFavorite(key, favorite) {
      const map = mapGet(STORE_KEYS.favorite);
      if (favorite) map[key] = Date.now();
      else delete map[key];
      mapSet(STORE_KEYS.favorite, map);
      return { ok: true };
    },

    async getSettings() {
      let settings;
      try {
        settings = JSON.parse(localStorage.getItem(STORE_KEYS.settings) || "{}");
      } catch {
        settings = {};
      }
      return { settings: { ...READING_DEFAULTS, aiAssist: true, origin: "", ...settings, defaultVersion: "original" } };
    },

    async saveSettings(request = {}) {
      const current = await this.getSettings();
      const next = { ...current.settings, ...request.patch ?? {} };
      localStorage.setItem(STORE_KEYS.settings, JSON.stringify(next));
      return { ok: true };
    },

    async listSubscriptions() {
      return {
        subscriptions: [
          ...MATH_LA_CHANNELS.map(ch => ({
            id: ch.key,
            name: ch.name,
            url: "#",
            group: "Đại số tuyến tính"
          })),
          {
            id: CHANNEL_KEY,
            name: CHANNEL_NAME,
            url: "https://www.youtube.com/@aiDotEngineer",
            group: "Video Tech"
          }
        ]
      };
    },

    async addSubscription() { return { ok: true }; },
    async removeSubscription() { return { ok: true }; },
    async updateSubscription() { return { ok: true }; },
    async opmlPreview() { return { entries: [] }; },
    async opmlImport() { throw new Error("không hỗ trợ nhập OPML"); },
    async opmlExport() { return '<?xml version="1.0" encoding="UTF-8"?><opml version="2.0"><body></body></opml>'; },
    async searchArticles() { return { entries: [], hasMore: false }; },
    async searchPodcastShows() { return { shows: [] }; },
    async listPodcastEpisodes() { return { episodes: [], hasMore: false }; },
    async importPodcastTranscript() { throw new Error("không hỗ trợ podcast"); },
    async getCollectionSettings() { return { enabled: false, verified: false }; },
    async configureCollection() { throw new Error("Link collection không khả dụng"); },
    async submitCollection() { throw new Error("Link collection không khả dụng"); },
    async listCollectionJobs() { return { jobs: [], hasMore: false, nextCursor: "" }; },
    async collectionSnapshot() { return { enabled: false, pending: 0, jobs: [] }; },
    async acknowledgeCollection() { return { ok: true }; },
    async openCollectionResult() { throw new Error("Link collection không khả dụng"); },
    async setReadingContext() { return { ok: true }; },
    async prepareChat() { return {}; }
  };
}

// src/client/index.jsx
var PANEL_ID = "vai-youtube-news";
var inject = ["slots"];
async function apply(ctx) {
  const api = { ...createVaiApi(), ...nativeChatBridge(ctx) };
  ctx.slots.inject("main", () => ctx.slots.register({
    name: "main",
    key: PANEL_ID,
    children: { "qiaomu-rss.chat": { kind: "single", scope: "session" } },
    inject: () => ({ api })
  }, ReaderPanel));
  ctx.slots.inject("qiaomu-rss.chat", () => ctx.slots.register({ name: "qiaomu-rss.chat" }, NativeConversation));
  ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
    name: "sidebar.panellist",
    id: PANEL_ID,
    order: 23,
    label: "Học tập"
  }, ReaderIcon));
}

		return module.exports;
	}
});


