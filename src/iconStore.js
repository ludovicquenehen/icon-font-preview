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
exports.IconStore = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const cssParser_1 = require("./cssParser");
class IconStore {
    constructor() {
        this._data = { icons: [], prefix: '', fontFamily: '', fontFilePath: null };
        this._onDidReload = new vscode.EventEmitter();
        this.onDidReload = this._onDidReload.event;
        this._byClass = new Map();
        this._resolvedFontPath = null;
    }
    get icons() { return this._data.icons; }
    get prefix() { return this._data.prefix; }
    get fontFamily() { return this._data.fontFamily; }
    get fontFilePath() { return this._resolvedFontPath ?? this._data.fontFilePath; }
    get isEmpty() { return this._data.icons.length === 0; }
    findByClass(className) {
        return this._byClass.get(className);
    }
    /**
     * Load (or reload) icons from the configured CSS file.
     * Supports:
     *   - Local paths:  "./assets/icons.css"
     *   - npm packages: "@nibelis/theme/theme-brand.css"
     */
    async load() {
        const config = vscode.workspace.getConfiguration('iconFontPreview');
        const cssFileSetting = config.get('cssFile') ?? '';
        const fontFileSetting = config.get('fontFile') ?? '';
        const cssFilePath = this.resolveCssPath(cssFileSetting);
        if (!cssFilePath) {
            this._data = { icons: [], prefix: '', fontFamily: '', fontFilePath: null };
            this._byClass.clear();
            this._resolvedFontPath = null;
            this._onDidReload.fire();
            return 0;
        }
        this._data = (0, cssParser_1.parseCssFile)(cssFilePath);
        const prefixSetting = config.get('classPrefix') ?? '';
        if (prefixSetting)
            this._data.prefix = prefixSetting;
        if (fontFileSetting) {
            this._resolvedFontPath = this.resolveCssPath(fontFileSetting);
        }
        else {
            this._resolvedFontPath = null;
        }
        this._byClass.clear();
        for (const icon of this._data.icons) {
            this._byClass.set(icon.className, icon);
        }
        this._onDidReload.fire();
        return this._data.icons.length;
    }
    /**
     * Resolves a file path from:
     * 1. Absolute path
     * 2. npm package specifier  e.g. "@nibelis/theme/theme-brand.css"
     * 3. Relative path from workspace root  e.g. "./assets/icons.css"
     */
    resolveCssPath(filePath) {
        if (!filePath)
            return null;
        if (path.isAbsolute(filePath)) {
            return fs.existsSync(filePath) ? filePath : null;
        }
        const workspaceRoot = this.getWorkspaceRoot();
        // npm package specifier: "@scope/pkg/file" or "pkg/file"
        const isNpmSpecifier = /^(@[^/]+\/[^/]+|[^./][^/]*)\//.test(filePath);
        if (isNpmSpecifier && workspaceRoot) {
            const resolved = this.resolveFromNodeModules(filePath, workspaceRoot);
            if (resolved)
                return resolved;
        }
        if (workspaceRoot) {
            const resolved = path.join(workspaceRoot, filePath);
            return fs.existsSync(resolved) ? resolved : null;
        }
        return null;
    }
    /**
     * Walks up the directory tree looking for node_modules containing the package.
     * Handles monorepos and nested workspaces.
     */
    resolveFromNodeModules(specifier, startDir) {
        let dir = startDir;
        while (true) {
            const candidate = path.join(dir, 'node_modules', specifier);
            if (fs.existsSync(candidate))
                return candidate;
            const pkgResolved = this.resolveViaPackageSubpath(specifier, dir);
            if (pkgResolved)
                return pkgResolved;
            const parent = path.dirname(dir);
            if (parent === dir)
                break;
            dir = parent;
        }
        return null;
    }
    /**
     * Splits "@scope/pkg/sub/path.css" into package name + subpath,
     * then resolves directly inside node_modules.
     */
    resolveViaPackageSubpath(specifier, workspaceRoot) {
        const scopedMatch = specifier.match(/^(@[^/]+\/[^/]+)\/(.+)$/);
        const plainMatch = specifier.match(/^([^@/][^/]*)\/(.+)$/);
        const m = scopedMatch ?? plainMatch;
        if (!m)
            return null;
        const [, pkgName, subPath] = m;
        const pkgDir = path.join(workspaceRoot, 'node_modules', pkgName);
        if (!fs.existsSync(pkgDir))
            return null;
        const candidate = path.join(pkgDir, subPath);
        return fs.existsSync(candidate) ? candidate : null;
    }
    getWorkspaceRoot() {
        const folders = vscode.workspace.workspaceFolders;
        return folders && folders.length > 0 ? folders[0].uri.fsPath : null;
    }
}
exports.IconStore = IconStore;
//# sourceMappingURL=iconStore.js.map