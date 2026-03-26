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
exports.DecorationProvider = void 0;
const vscode = __importStar(require("vscode"));
/**
 * DecorationProvider adds inline glyph previews next to icon class names
 * in the editor — identical to what the MDI VS Code plugin does.
 *
 * Example:  class="my-icon-home"  →  shows  [⌂] inline after the text
 */
class DecorationProvider {
    constructor(store) {
        this.store = store;
        this._disposables = [];
        this._decorationType = this._createDecorationType();
        // Re-decorate when store reloads
        this._disposables.push(store.onDidReload(() => this._updateAll()));
        // Re-decorate on editor change
        this._disposables.push(vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor)
                this._update(editor);
        }));
        // Re-decorate on document edits
        this._disposables.push(vscode.workspace.onDidChangeTextDocument(event => {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document === event.document) {
                this._update(editor);
            }
        }));
        // Initial decoration
        this._updateAll();
    }
    _createDecorationType() {
        const config = vscode.workspace.getConfiguration('iconFontPreview');
        const color = config.get('decorationColor') ?? '#C7C7FF';
        return vscode.window.createTextEditorDecorationType({
            // We use `after` to render the glyph after the matched class name,
            // exactly like the MDI plugin does.
            after: {
                margin: '0 0 0 4px',
                color,
            },
            rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
        });
    }
    _updateAll() {
        for (const editor of vscode.window.visibleTextEditors) {
            this._update(editor);
        }
    }
    _update(editor) {
        if (this.store.isEmpty) {
            editor.setDecorations(this._decorationType, []);
            return;
        }
        const config = vscode.workspace.getConfiguration('iconFontPreview');
        const activeLanguages = config.get('languages') ?? [];
        if (!activeLanguages.includes(editor.document.languageId)) {
            return;
        }
        const text = editor.document.getText();
        const decorations = [];
        const prefix = this.store.prefix;
        // Build a regex that matches any known class name in the document.
        // We scan line by line for performance.
        const lines = text.split('\n');
        for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
            const line = lines[lineIdx];
            // Quick pre-filter: skip lines that don't mention the prefix at all
            if (prefix && !line.includes(prefix))
                continue;
            // Find all icon class name occurrences in this line
            // Pattern: matches class names that start with our prefix
            const classPattern = new RegExp(`\\b(${escapeRegex(prefix)}[\\w-]+)`, 'g');
            let m;
            while ((m = classPattern.exec(line)) !== null) {
                const matched = m[1];
                const icon = this.store.findByClass(matched);
                if (!icon)
                    continue;
                const startPos = new vscode.Position(lineIdx, m.index);
                const endPos = new vscode.Position(lineIdx, m.index + matched.length);
                const range = new vscode.Range(startPos, endPos);
                decorations.push({
                    range,
                    renderOptions: {
                        after: {
                            // Display the actual glyph character as a decoration
                            contentText: icon.char,
                            color: config.get('decorationColor') ?? '#C7C7FF',
                            margin: '0 0 0 6px',
                            // Inject font-family via textDecoration trick (VS Code API limitation)
                            textDecoration: `none; font-family: '${this.store.fontFamily}', monospace`,
                        },
                    },
                    hoverMessage: this._buildHoverMessage(icon),
                });
            }
        }
        editor.setDecorations(this._decorationType, decorations);
    }
    _buildHoverMessage(icon) {
        const md = new vscode.MarkdownString();
        md.isTrusted = true;
        md.supportHtml = true;
        // Mimic MDI plugin hover: shows class name + unicode info
        md.appendMarkdown(`**${icon.className}**\n\n`);
        md.appendMarkdown(`Unicode: \`U+${icon.codepoint}\`\n\n`);
        md.appendMarkdown(`CSS content: \`"\\${icon.codepoint.toLowerCase()}"\``);
        return md;
    }
    dispose() {
        this._decorationType.dispose();
        this._disposables.forEach(d => d.dispose());
    }
}
exports.DecorationProvider = DecorationProvider;
function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
//# sourceMappingURL=decorationProvider.js.map