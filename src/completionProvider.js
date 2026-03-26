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
exports.CompletionProvider = void 0;
const vscode = __importStar(require("vscode"));
/**
 * CompletionProvider adds icon name suggestions with unicode preview
 * in the VS Code autocomplete popup — just like MDI does.
 */
class CompletionProvider {
    constructor(store) {
        this.store = store;
        this._cachedItems = [];
        this._disposables = [];
        // Rebuild cache when store reloads
        this._disposables.push(store.onDidReload(() => this._buildCache()));
        this._buildCache();
    }
    _buildCache() {
        this._cachedItems = this.store.icons.map(icon => this._buildItem(icon));
    }
    _buildItem(icon) {
        const item = new vscode.CompletionItem(icon.className, vscode.CompletionItemKind.Value);
        // The label shown in the completion list — same style as MDI plugin
        item.label = {
            label: icon.className,
            description: `${icon.char}  U+${icon.codepoint}`,
        };
        // Detail shown on the right side of the completion popup
        item.detail = `Icon · U+${icon.codepoint}`;
        // Documentation panel shown when the item is highlighted
        const doc = new vscode.MarkdownString();
        doc.isTrusted = true;
        doc.appendMarkdown(`### \`${icon.className}\`\n\n`);
        doc.appendMarkdown(`**Glyph:** ${icon.char}\n\n`);
        doc.appendMarkdown(`**Unicode:** \`U+${icon.codepoint}\`\n\n`);
        doc.appendMarkdown(`**CSS content:** \`"\\${icon.codepoint.toLowerCase()}"\``);
        item.documentation = doc;
        // Sort prefix so icons sort to top
        item.sortText = `0_${icon.className}`;
        // Filter text includes both class name and codepoint
        item.filterText = `${icon.className} ${icon.codepoint}`;
        // Insert just the class name
        item.insertText = icon.className;
        return item;
    }
    provideCompletionItems(document, position, _token, _context) {
        if (this.store.isEmpty)
            return [];
        const config = vscode.workspace.getConfiguration('iconFontPreview');
        const activeLanguages = config.get('languages') ?? [];
        if (!activeLanguages.includes(document.languageId))
            return [];
        // Only trigger when the user is typing something that looks like an icon class
        const linePrefix = document.lineAt(position).text.slice(0, position.character);
        const prefix = this.store.prefix;
        // Check if the current word starts with the icon prefix
        const wordMatch = linePrefix.match(/[\w-]+$/);
        if (!wordMatch)
            return [];
        const typedWord = wordMatch[0];
        if (prefix && !typedWord.startsWith(prefix.slice(0, typedWord.length))) {
            // Only offer completions if typing matches the prefix
            if (!prefix.startsWith(typedWord) && !typedWord.startsWith(prefix)) {
                return [];
            }
        }
        return this._cachedItems;
    }
    dispose() {
        this._disposables.forEach(d => d.dispose());
    }
}
exports.CompletionProvider = CompletionProvider;
//# sourceMappingURL=completionProvider.js.map