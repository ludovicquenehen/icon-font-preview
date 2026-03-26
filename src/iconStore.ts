import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { parseCssFile, ParseResult, IconEntry } from './cssParser';

export class IconStore {
  private _data: ParseResult = { icons: [], prefix: '', fontFamily: '', fontFilePath: null };
  private _onDidReload = new vscode.EventEmitter<void>();
  public readonly onDidReload = this._onDidReload.event;

  private _byClass = new Map<string, IconEntry>();
  private _resolvedFontPath: string | null = null;

  constructor() {}

  get icons(): IconEntry[] { return this._data.icons; }
  get prefix(): string { return this._data.prefix; }
  get fontFamily(): string { return this._data.fontFamily; }
  get fontFilePath(): string | null { return this._resolvedFontPath ?? this._data.fontFilePath; }
  get isEmpty(): boolean { return this._data.icons.length === 0; }

  findByClass(className: string): IconEntry | undefined {
    return this._byClass.get(className);
  }

  /**
   * Load (or reload) icons from the configured CSS file.
   * Supports:
   *   - Local paths:  "./assets/icons.css"
   *   - npm packages: "@nibelis/theme/theme-brand.css"
   */
  async load(): Promise<number> {
    const config = vscode.workspace.getConfiguration('iconFontPreview');
    const cssFileSetting: string = config.get('cssFile') ?? '';
    const fontFileSetting: string = config.get('fontFile') ?? '';

    const cssFilePath = this.resolveCssPath(cssFileSetting);

    if (!cssFilePath) {
      this._data = { icons: [], prefix: '', fontFamily: '', fontFilePath: null };
      this._byClass.clear();
      this._resolvedFontPath = null;
      this._onDidReload.fire();
      return 0;
    }

    this._data = parseCssFile(cssFilePath);

    const prefixSetting: string = config.get('classPrefix') ?? '';
    if (prefixSetting) this._data.prefix = prefixSetting;

    if (fontFileSetting) {
      this._resolvedFontPath = this.resolveCssPath(fontFileSetting);
    } else {
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
  resolveCssPath(filePath: string): string | null {
    if (!filePath) return null;

    if (path.isAbsolute(filePath)) {
      return fs.existsSync(filePath) ? filePath : null;
    }

    const workspaceRoot = this.getWorkspaceRoot();

    // npm package specifier: "@scope/pkg/file" or "pkg/file"
    const isNpmSpecifier = /^(@[^/]+\/[^/]+|[^./][^/]*)\//.test(filePath);
    if (isNpmSpecifier && workspaceRoot) {
      const resolved = this.resolveFromNodeModules(filePath, workspaceRoot);
      if (resolved) return resolved;
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
  private resolveFromNodeModules(specifier: string, startDir: string): string | null {
    let dir = startDir;
    while (true) {
      const candidate = path.join(dir, 'node_modules', specifier);
      if (fs.existsSync(candidate)) return candidate;

      const pkgResolved = this.resolveViaPackageSubpath(specifier, dir);
      if (pkgResolved) return pkgResolved;

      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return null;
  }

  /**
   * Splits "@scope/pkg/sub/path.css" into package name + subpath,
   * then resolves directly inside node_modules.
   */
  private resolveViaPackageSubpath(specifier: string, workspaceRoot: string): string | null {
    const scopedMatch = specifier.match(/^(@[^/]+\/[^/]+)\/(.+)$/);
    const plainMatch  = specifier.match(/^([^@/][^/]*)\/(.+)$/);
    const m = scopedMatch ?? plainMatch;
    if (!m) return null;

    const [, pkgName, subPath] = m;
    const pkgDir = path.join(workspaceRoot, 'node_modules', pkgName);
    if (!fs.existsSync(pkgDir)) return null;

    const candidate = path.join(pkgDir, subPath);
    return fs.existsSync(candidate) ? candidate : null;
  }

  private getWorkspaceRoot(): string | null {
    const folders = vscode.workspace.workspaceFolders;
    return folders && folders.length > 0 ? folders[0].uri.fsPath : null;
  }
}
