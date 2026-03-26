import * as vscode from 'vscode';
import { IconStore } from './iconStore';
import { IconEntry } from './cssParser';

/**
 * CompletionProvider adds icon name suggestions with unicode preview
 * in the VS Code autocomplete popup — just like MDI does.
 */
export class CompletionProvider implements vscode.CompletionItemProvider, vscode.Disposable {
  private _cachedItems: vscode.CompletionItem[] = [];
  private _disposables: vscode.Disposable[] = [];

  constructor(private store: IconStore) {
    // Rebuild cache when store reloads
    this._disposables.push(
      store.onDidReload(() => this._buildCache())
    );
    this._buildCache();
  }

  private _buildCache() {
    this._cachedItems = this.store.icons.map(icon => this._buildItem(icon));
  }

  private _buildItem(icon: IconEntry): vscode.CompletionItem {
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

  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.CompletionContext
  ): vscode.CompletionItem[] {
    if (this.store.isEmpty) return [];

    const config = vscode.workspace.getConfiguration('iconFontPreview');
    const activeLanguages: string[] = config.get('languages') ?? [];
    if (!activeLanguages.includes(document.languageId)) return [];

    // Only trigger when the user is typing something that looks like an icon class
    const linePrefix = document.lineAt(position).text.slice(0, position.character);
    const prefix = this.store.prefix;

    // Check if the current word starts with the icon prefix
    const wordMatch = linePrefix.match(/[\w-]+$/);
    if (!wordMatch) return [];

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
