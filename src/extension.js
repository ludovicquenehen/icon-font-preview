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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const iconStore_1 = require("./iconStore");
const decorationProvider_1 = require("./decorationProvider");
const completionProvider_1 = require("./completionProvider");
const iconBrowserPanel_1 = require("./iconBrowserPanel");
async function activate(context) {
    const store = new iconStore_1.IconStore();
    // Boot: load icons
    const count = await store.load();
    if (count > 0) {
        vscode.window.setStatusBarMessage(`Icon Font Preview: ${count} icons loaded`, 4000);
    }
    else {
        const cssFile = vscode.workspace.getConfiguration('iconFontPreview').get('cssFile') ?? '';
        if (cssFile) {
            vscode.window.showWarningMessage(`Icon Font Preview: Could not load "${cssFile}". Check the path in settings.`, 'Open Settings').then(a => {
                if (a === 'Open Settings') {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'iconFontPreview');
                }
            });
        }
    }
    // Providers
    const decorationProvider = new decorationProvider_1.DecorationProvider(store);
    const completionProvider = new completionProvider_1.CompletionProvider(store);
    // Register completion for all configured languages
    const config = vscode.workspace.getConfiguration('iconFontPreview');
    const languages = config.get('languages') ?? [];
    const triggerChars = config.get('triggerCharacters') ?? ['"', "'", ' '];
    const completionDisposable = vscode.languages.registerCompletionItemProvider(languages.map(lang => ({ language: lang })), completionProvider, ...triggerChars);
    // Commands
    const reloadCommand = vscode.commands.registerCommand('iconFontPreview.reload', async () => {
        const n = await store.load();
        vscode.window.showInformationMessage(`Icon Font Preview: ${n} icons reloaded.`);
    });
    const browserCommand = vscode.commands.registerCommand('iconFontPreview.openBrowser', () => {
        if (store.isEmpty) {
            vscode.window.showWarningMessage('No icons loaded. Please configure iconFontPreview.cssFile in settings.', 'Open Settings').then(action => {
                if (action === 'Open Settings') {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'iconFontPreview');
                }
            });
            return;
        }
        iconBrowserPanel_1.IconBrowserPanel.createOrShow(store);
    });
    // Watch the resolved CSS file for changes (works for node_modules too)
    const watchResolvedFile = () => {
        const cssFileSetting = vscode.workspace.getConfiguration('iconFontPreview').get('cssFile') ?? '';
        const resolvedPath = store.resolveCssPath(cssFileSetting);
        if (!resolvedPath)
            return undefined;
        // Use a glob that matches the absolute path
        const watcher = vscode.workspace.createFileSystemWatcher(resolvedPath);
        watcher.onDidChange(async () => {
            await store.load();
            vscode.window.setStatusBarMessage('Icon Font Preview: CSS reloaded.', 3000);
        });
        return watcher;
    };
    let cssWatcher = watchResolvedFile();
    if (cssWatcher)
        context.subscriptions.push(cssWatcher);
    // Reload when settings change
    vscode.workspace.onDidChangeConfiguration(async (e) => {
        if (e.affectsConfiguration('iconFontPreview')) {
            await store.load();
            // Re-create watcher in case cssFile changed
            if (cssWatcher)
                cssWatcher.dispose();
            cssWatcher = watchResolvedFile();
            if (cssWatcher)
                context.subscriptions.push(cssWatcher);
        }
    }, null, context.subscriptions);
    context.subscriptions.push(decorationProvider, completionProvider, completionDisposable, reloadCommand, browserCommand);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map