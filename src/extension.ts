import * as vscode from 'vscode';
import { IconStore } from './iconStore';
import { DecorationProvider } from './decorationProvider';
import { CompletionProvider } from './completionProvider';
import { IconBrowserPanel } from './iconBrowserPanel';

export async function activate(context: vscode.ExtensionContext) {
  const store = new IconStore();

  // Boot: load icons
  const count = await store.load();
  if (count > 0) {
    vscode.window.setStatusBarMessage(`Icon Font Preview: ${count} icons loaded`, 4000);
  } else {
    const cssFile: string = vscode.workspace.getConfiguration('iconFontPreview').get('cssFile') ?? '';
    if (cssFile) {
      vscode.window.showWarningMessage(
        `Icon Font Preview: Could not load "${cssFile}". Check the path in settings.`,
        'Open Settings'
      ).then(a => {
        if (a === 'Open Settings') {
          vscode.commands.executeCommand('workbench.action.openSettings', 'iconFontPreview');
        }
      });
    }
  }

  // Providers
  const decorationProvider = new DecorationProvider(store);
  const completionProvider = new CompletionProvider(store);

  // Register completion for all configured languages
  const config = vscode.workspace.getConfiguration('iconFontPreview');
  const languages: string[] = config.get('languages') ?? [];
  const triggerChars: string[] = config.get('triggerCharacters') ?? ['"', "'", ' '];

  const completionDisposable = vscode.languages.registerCompletionItemProvider(
    languages.map(lang => ({ language: lang })),
    completionProvider,
    ...triggerChars
  );

  // Commands
  const reloadCommand = vscode.commands.registerCommand('iconFontPreview.reload', async () => {
    const n = await store.load();
    vscode.window.showInformationMessage(`Icon Font Preview: ${n} icons reloaded.`);
  });

  const browserCommand = vscode.commands.registerCommand('iconFontPreview.openBrowser', () => {
    if (store.isEmpty) {
      vscode.window.showWarningMessage(
        'No icons loaded. Please configure iconFontPreview.cssFile in settings.',
        'Open Settings'
      ).then(action => {
        if (action === 'Open Settings') {
          vscode.commands.executeCommand('workbench.action.openSettings', 'iconFontPreview');
        }
      });
      return;
    }
    IconBrowserPanel.createOrShow(store);
  });

  // Watch the resolved CSS file for changes (works for node_modules too)
  const watchResolvedFile = () => {
    const cssFileSetting: string = vscode.workspace.getConfiguration('iconFontPreview').get('cssFile') ?? '';
    const resolvedPath = store.resolveCssPath(cssFileSetting);
    if (!resolvedPath) return undefined;

    // Use a glob that matches the absolute path
    const watcher = vscode.workspace.createFileSystemWatcher(resolvedPath);
    watcher.onDidChange(async () => {
      await store.load();
      vscode.window.setStatusBarMessage('Icon Font Preview: CSS reloaded.', 3000);
    });
    return watcher;
  };

  let cssWatcher = watchResolvedFile();
  if (cssWatcher) context.subscriptions.push(cssWatcher);

  // Reload when settings change
  vscode.workspace.onDidChangeConfiguration(async e => {
    if (e.affectsConfiguration('iconFontPreview')) {
      await store.load();
      // Re-create watcher in case cssFile changed
      if (cssWatcher) cssWatcher.dispose();
      cssWatcher = watchResolvedFile();
      if (cssWatcher) context.subscriptions.push(cssWatcher);
    }
  }, null, context.subscriptions);

  context.subscriptions.push(
    decorationProvider,
    completionProvider,
    completionDisposable,
    reloadCommand,
    browserCommand,
  );
}

export function deactivate() {}
