import * as vscode from 'vscode';
import { IconStore } from './iconStore';

/**
 * DecorationProvider adds inline glyph previews next to icon class names
 * in the editor — identical to what the MDI VS Code plugin does.
 *
 * Example:  class="my-icon-home"  →  shows  [⌂] inline after the text
 */
export class DecorationProvider implements vscode.Disposable {
  private _decorationType: vscode.TextEditorDecorationType;
  private _disposables: vscode.Disposable[] = [];

  constructor(private store: IconStore) {
    this._decorationType = this._createDecorationType();

    // Re-decorate when store reloads
    this._disposables.push(
      store.onDidReload(() => this._updateAll())
    );

    // Re-decorate on editor change
    this._disposables.push(
      vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) this._update(editor);
      })
    );

    // Re-decorate on document edits
    this._disposables.push(
      vscode.workspace.onDidChangeTextDocument(event => {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document === event.document) {
          this._update(editor);
        }
      })
    );

    // Initial decoration
    this._updateAll();
  }

  private _createDecorationType(): vscode.TextEditorDecorationType {
    const config = vscode.workspace.getConfiguration('iconFontPreview');
    const color: string = config.get('decorationColor') ?? '#C7C7FF';

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

  private _updateAll() {
    for (const editor of vscode.window.visibleTextEditors) {
      this._update(editor);
    }
  }

  private _update(editor: vscode.TextEditor) {
    if (this.store.isEmpty) {
      editor.setDecorations(this._decorationType, []);
      return;
    }

    const config = vscode.workspace.getConfiguration('iconFontPreview');
    const activeLanguages: string[] = config.get('languages') ?? [];

    if (!activeLanguages.includes(editor.document.languageId)) {
      return;
    }

    const text = editor.document.getText();
    const decorations: vscode.DecorationOptions[] = [];
    const prefix = this.store.prefix;

    // Build a regex that matches any known class name in the document.
    // We scan line by line for performance.
    const lines = text.split('\n');

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];

      // Quick pre-filter: skip lines that don't mention the prefix at all
      if (prefix && !line.includes(prefix)) continue;

      // Find all icon class name occurrences in this line
      // Pattern: matches class names that start with our prefix
      const classPattern = new RegExp(`\\b(${escapeRegex(prefix)}[\\w-]+)`, 'g');
      let m: RegExpExecArray | null;

      while ((m = classPattern.exec(line)) !== null) {
        const matched = m[1];
        const icon = this.store.findByClass(matched);
        if (!icon) continue;

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

  private _buildHoverMessage(icon: { className: string; codepoint: string; char: string }): vscode.MarkdownString {
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

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
