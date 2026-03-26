"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.IconBrowserPanel = void 0;
const vscode = __importStar(require("vscode"));
const fontRenderer_1 = require("./fontRenderer");
class IconBrowserPanel {
    constructor(panel, store) {
        this.store = store;
        this._disposables = [];
        this._panel = panel;
        this._render();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        store.onDidReload(() => {
            if (this._panel.visible)
                this._render();
        }, null, this._disposables);
    }
    static createOrShow(store) {
        const column = vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One;
        if (IconBrowserPanel.currentPanel) {
            IconBrowserPanel.currentPanel._panel.reveal(column);
            return;
        }
        const panel = vscode.window.createWebviewPanel('iconFontBrowser', 'Icon Font Browser', column, { enableScripts: true, retainContextWhenHidden: true });
        IconBrowserPanel.currentPanel = new IconBrowserPanel(panel, store);
    }
    _render() {
        this._panel.title = `Icon Browser (${this.store.icons.length} icons)`;
        this._panel.webview.html = this._buildHtml();
    }
    _buildHtml() {
        const fontFaceCSS = this.store.fontFilePath
            ? (0, fontRenderer_1.buildFontFaceCSS)(this.store.fontFamily, this.store.fontFilePath)
            : '';
        const iconsJson = JSON.stringify(this.store.icons.map(i => ({
            name: i.className,
            cp: i.codepoint,
            char: i.char,
        })));
        return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Icon Font Browser</title>
<style>
  ${fontFaceCSS}

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: var(--vscode-editor-background);
    --fg: var(--vscode-editor-foreground);
    --border: var(--vscode-panel-border, #3c3c3c);
    --input-bg: var(--vscode-input-background);
    --input-fg: var(--vscode-input-foreground);
    --input-border: var(--vscode-input-border);
    --hover-bg: var(--vscode-list-hoverBackground);
    --active-bg: var(--vscode-list-activeSelectionBackground);
    --active-fg: var(--vscode-list-activeSelectionForeground);
    --accent: var(--vscode-button-background, #0e639c);
    --card-bg: var(--vscode-editorWidget-background, #252526);
    --font-icon: '${this.store.fontFamily}', sans-serif;
    --font-ui: var(--vscode-font-family, 'Segoe UI', system-ui, sans-serif);
    --font-mono: var(--vscode-editor-font-family, 'Courier New', monospace);
  }

  body {
    font-family: var(--font-ui);
    background: var(--bg);
    color: var(--fg);
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* ── Header ── */
  .header {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }

  .search-wrap {
    flex: 1;
    position: relative;
  }

  .search-icon {
    position: absolute;
    left: 8px;
    top: 50%;
    transform: translateY(-50%);
    opacity: 0.5;
    pointer-events: none;
    font-size: 13px;
  }

  input[type="search"] {
    width: 100%;
    padding: 5px 10px 5px 28px;
    background: var(--input-bg);
    color: var(--input-fg);
    border: 1px solid var(--input-border, transparent);
    border-radius: 3px;
    font-size: 13px;
    outline: none;
  }
  input[type="search"]:focus {
    border-color: var(--accent);
  }

  .count {
    font-size: 11px;
    opacity: 0.6;
    white-space: nowrap;
  }

  /* ── Grid ── */
  .grid-container {
    flex: 1;
    overflow-y: auto;
    padding: 12px 16px;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
    gap: 6px;
  }

  .icon-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 6px 8px;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.1s;
    border: 1px solid transparent;
    text-align: center;
  }

  .icon-card:hover {
    background: var(--hover-bg);
    border-color: var(--border);
  }

  .icon-card.selected {
    background: var(--active-bg);
    color: var(--active-fg);
    border-color: var(--accent);
  }

  .icon-glyph {
    font-family: var(--font-icon);
    font-size: 24px;
    line-height: 1;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-name {
    font-size: 10px;
    opacity: 0.75;
    word-break: break-all;
    line-height: 1.3;
    max-width: 100%;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  /* ── Detail panel ── */
  .detail {
    border-top: 1px solid var(--border);
    padding: 14px 18px;
    flex-shrink: 0;
    display: none;
    gap: 18px;
    align-items: flex-start;
  }

  .detail.visible { display: flex; }

  .detail-glyph {
    font-family: var(--font-icon);
    font-size: 48px;
    line-height: 1;
    flex-shrink: 0;
    width: 60px;
    text-align: center;
  }

  .detail-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .detail-name {
    font-size: 14px;
    font-weight: 600;
  }

  .detail-meta {
    font-family: var(--font-mono);
    font-size: 11px;
    opacity: 0.7;
  }

  .detail-actions {
    display: flex;
    gap: 8px;
    margin-top: 6px;
    flex-wrap: wrap;
  }

  button.copy-btn {
    font-size: 11px;
    padding: 3px 10px;
    background: var(--accent);
    color: var(--vscode-button-foreground, #fff);
    border: none;
    border-radius: 3px;
    cursor: pointer;
  }
  button.copy-btn:hover { opacity: 0.85; }

  .toast {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: var(--vscode-notificationCenterHeader-background, #333);
    color: var(--fg);
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 12px;
    opacity: 0;
    transition: opacity 0.2s;
    pointer-events: none;
  }
  .toast.show { opacity: 1; }

  .empty {
    grid-column: 1 / -1;
    text-align: center;
    padding: 40px;
    opacity: 0.5;
    font-size: 13px;
  }
</style>
</head>
<body>

<div class="header">
  <div class="search-wrap">
    <span class="search-icon">🔍</span>
    <input type="search" id="search" placeholder="Search icons…" autofocus>
  </div>
  <span class="count" id="count"></span>
</div>

<div class="grid-container">
  <div class="grid" id="grid"></div>
</div>

<div class="detail" id="detail">
  <div class="detail-glyph" id="detail-glyph"></div>
  <div class="detail-info">
    <div class="detail-name" id="detail-name"></div>
    <div class="detail-meta" id="detail-cp"></div>
    <div class="detail-meta" id="detail-css"></div>
    <div class="detail-actions">
      <button class="copy-btn" onclick="copyDetail('class')">Copy class name</button>
      <button class="copy-btn" onclick="copyDetail('css')">Copy CSS content</button>
      <button class="copy-btn" onclick="copyDetail('char')">Copy glyph char</button>
    </div>
  </div>
</div>

<div class="toast" id="toast">Copied!</div>

<script>
  const ICONS = ${iconsJson};
  let filtered = ICONS;
  let selected = null;

  const grid = document.getElementById('grid');
  const countEl = document.getElementById('count');
  const searchEl = document.getElementById('search');
  const detailEl = document.getElementById('detail');
  const detailGlyph = document.getElementById('detail-glyph');
  const detailName = document.getElementById('detail-name');
  const detailCp = document.getElementById('detail-cp');
  const detailCss = document.getElementById('detail-css');

  function render() {
    grid.innerHTML = '';
    countEl.textContent = filtered.length + ' / ' + ICONS.length + ' icons';

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'No icons match your search.';
      grid.appendChild(empty);
      return;
    }

    const frag = document.createDocumentFragment();
    for (const icon of filtered) {
      const card = document.createElement('div');
      card.className = 'icon-card' + (selected && selected.name === icon.name ? ' selected' : '');
      card.dataset.name = icon.name;
      card.innerHTML =
        '<div class="icon-glyph">' + icon.char + '</div>' +
        '<div class="icon-name">' + icon.name + '</div>';
      card.addEventListener('click', () => selectIcon(icon));
      frag.appendChild(card);
    }
    grid.appendChild(frag);
  }

  function selectIcon(icon) {
    selected = icon;
    // Update cards
    document.querySelectorAll('.icon-card').forEach(el => {
      el.classList.toggle('selected', el.dataset.name === icon.name);
    });
    // Update detail panel
    detailEl.classList.add('visible');
    detailGlyph.textContent = icon.char;
    detailName.textContent = icon.name;
    detailCp.textContent = 'Unicode: U+' + icon.cp;
    detailCss.textContent = 'CSS content: "\\\\' + icon.cp.toLowerCase() + '"';
  }

  function copyDetail(what) {
    if (!selected) return;
    let text = '';
    if (what === 'class') text = selected.name;
    else if (what === 'css') text = '"\\\\' + selected.cp.toLowerCase() + '"';
    else if (what === 'char') text = selected.char;
    navigator.clipboard.writeText(text).then(() => showToast('Copied: ' + text));
  }

  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 1800);
  }

  searchEl.addEventListener('input', () => {
    const q = searchEl.value.toLowerCase().trim();
    filtered = q ? ICONS.filter(i => i.name.toLowerCase().includes(q) || i.cp.toLowerCase().includes(q)) : ICONS;
    render();
  });

  render();
</script>
</body>
</html>`;
    }
    dispose() {
        IconBrowserPanel.currentPanel = undefined;
        this._panel.dispose();
        this._disposables.forEach(d => d.dispose());
    }
}
exports.IconBrowserPanel = IconBrowserPanel;
//# sourceMappingURL=iconBrowserPanel.js.map