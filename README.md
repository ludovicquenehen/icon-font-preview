<div align="center">
  <img src="icon.png" alt="Logo" width="300">
</div>

# Icon Font Preview — VS Code Extension

Preview your custom icon font glyphs **inline in the editor**, just like the [Material Design Icons](https://marketplace.visualstudio.com/items?itemName=Lukazovic.vscode-material-design-icon-intellisense) plugin does for MDI.

---

## Features

| Feature | Description |
|---|---|
| **Inline glyph preview** | Renders the actual icon character next to every class name in your code |
| **Autocomplete** | Suggests icon class names with glyph + Unicode info in the popup |
| **Hover info** | Hover over any icon class to see the Unicode codepoint and CSS content value |
| **Icon Browser** | Full searchable grid of all icons in a panel (`Ctrl+Shift+P` → *Open Icon Browser*) |
| **Auto-detect** | Reads your CSS `@font-face` to find the font file automatically |

---

## Quick Start

### 1. Install
Place this folder in `.vscode/extensions/icon-font-preview` or package it as a `.vsix`:

```bash
npm install
npm run compile
npx vsce package   # produces icon-font-preview-1.0.0.vsix
```

Install the `.vsix`:
`Ctrl+Shift+P` → *Install from VSIX…*

---

### 2. Configure

Open your `settings.json` (or `Ctrl+Shift+P` → *Preferences: Open Settings*) and add:

```json
{
  "iconFontPreview.cssFile": "./assets/icons/my-icons.css",
  "iconFontPreview.fontFile": "",
  "iconFontPreview.classPrefix": ""
}
```

| Setting | Required | Description |
|---|---|---|
| `cssFile` | ✅ | Path to your icon CSS file (relative to workspace root) |
| `fontFile` | ❌ | Override font file path (auto-detected from `@font-face` if empty) |
| `classPrefix` | ❌ | Override icon class prefix (auto-detected if empty) |
| `decorationColor` | ❌ | Color of the inline glyph (default `#C7C7FF`) |
| `languages` | ❌ | Languages where preview is active (default: html, css, js, ts, vue…) |

---

### 3. CSS file format

Your CSS file must define icons using `:before` pseudo-elements:

```css
/* @font-face must be present so the extension can find the font file */
@font-face {
  font-family: 'MyIcons';
  src: url('../fonts/my-icons.ttf') format('truetype');
}

.my-icon-home:before     { content: "\e001"; }
.my-icon-settings:before { content: "\e002"; }
.my-icon-user:before     { content: "\f123"; }
```

This is the standard format exported by tools like **IcoMoon**, **Fontello**, and **Webfont Generator**.

---

## Commands

| Command | Description |
|---|---|
| `Icon Font Preview: Reload CSS font file` | Re-parse the CSS file (useful after edits) |
| `Icon Font Preview: Open Icon Browser` | Open the searchable icon grid panel |

---

## Icon Browser

![Icon Browser screenshot]

The browser panel shows all icons in a grid. Click any icon to:
- See its name, Unicode codepoint, and CSS content value
- Copy the class name, CSS content, or raw glyph character

---

## How It Works

1. On startup, the extension reads `iconFontPreview.cssFile`
2. It parses all `.classname:before { content: "\eXXX" }` rules
3. It detects the font file from `@font-face src:` (or uses your `fontFile` override)
4. The font file is embedded as a base64 data URI for use in the Icon Browser webview
5. For inline decorations, VS Code renders the glyph using `after` decorations with the font family

---

## Troubleshooting

**No icons appear:**
- Check that `iconFontPreview.cssFile` points to the correct file
- Open the Output panel and check for errors from *Icon Font Preview*
- Run the *Reload* command

**Glyphs show as boxes (□):**
- The font file path couldn't be resolved from `@font-face src:`
- Set `iconFontPreview.fontFile` manually to the absolute path of your `.ttf` file

**Wrong icons detected:**
- Set `iconFontPreview.classPrefix` explicitly (e.g. `"my-icon-"`)
