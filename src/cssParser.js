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
exports.parseCssFile = parseCssFile;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Parses an icon font CSS file and extracts all icon definitions.
 *
 * Supports patterns like:
 *   .icon-name:before { content: "\eXXX"; }
 *   .icon-name::before { content: '\F01C3'; }
 *   .icon-name:before, .icon-name-alias:before { content: "\e001" }
 */
function parseCssFile(cssFilePath) {
    const result = {
        icons: [],
        prefix: '',
        fontFamily: '',
        fontFilePath: null,
    };
    if (!fs.existsSync(cssFilePath)) {
        return result;
    }
    const css = fs.readFileSync(cssFilePath, 'utf8');
    // --- Extract font-family from @font-face ---
    const fontFaceMatch = css.match(/@font-face\s*\{([^}]+)\}/s);
    if (fontFaceMatch) {
        const fontFaceBlock = fontFaceMatch[1];
        // font-family
        const familyMatch = fontFaceBlock.match(/font-family\s*:\s*['"]?([^'";,\n]+)['"]?/i);
        if (familyMatch) {
            result.fontFamily = familyMatch[1].trim();
        }
        // font file path (prefer ttf/woff2/woff)
        const srcMatch = fontFaceBlock.match(/src\s*:[^;]+;/s);
        if (srcMatch) {
            const urlMatches = [...srcMatch[0].matchAll(/url\s*\(\s*['"]?([^'")\s]+\.(?:ttf|woff2|woff|eot|otf))['"]?\s*\)/gi)];
            if (urlMatches.length > 0) {
                // Prefer ttf, then woff2, then woff
                const preferred = urlMatches.find(m => m[1].endsWith('.ttf'))
                    ?? urlMatches.find(m => m[1].endsWith('.woff2'))
                    ?? urlMatches.find(m => m[1].endsWith('.woff'))
                    ?? urlMatches[0];
                const rawUrl = preferred[1];
                // Resolve relative to CSS file
                if (!rawUrl.startsWith('http')) {
                    result.fontFilePath = path.resolve(path.dirname(cssFilePath), rawUrl);
                }
            }
        }
    }
    // --- Extract icon classes ---
    // Match patterns: .prefix-name:before or .prefix-name::before
    // Followed (eventually) by content: "\eXXX"
    const iconRegex = /\.([\w-]+)::?before\s*(?:,\s*\.[\w-]+::?before\s*)*\{[^}]*content\s*:\s*['"]\\([0-9a-fA-F]+)['"]/g;
    const seen = new Set();
    let match;
    while ((match = iconRegex.exec(css)) !== null) {
        const className = match[1];
        const codepoint = match[2].toUpperCase();
        if (seen.has(className))
            continue;
        seen.add(className);
        const char = String.fromCodePoint(parseInt(codepoint, 16));
        result.icons.push({ name: className, className, codepoint, char });
    }
    // --- Auto-detect prefix from most common prefix ---
    if (result.icons.length > 0) {
        result.prefix = detectPrefix(result.icons.map(i => i.className));
    }
    return result;
}
/**
 * Detects the most common prefix among class names.
 * E.g. ["mdi-home", "mdi-car", "mdi-alert"] → "mdi-"
 */
function detectPrefix(classNames) {
    if (classNames.length === 0)
        return '';
    // Count prefix lengths by finding common leading substring
    const prefixCounts = new Map();
    for (const name of classNames) {
        const dashIdx = name.indexOf('-');
        if (dashIdx > 0) {
            const prefix = name.slice(0, dashIdx + 1);
            prefixCounts.set(prefix, (prefixCounts.get(prefix) ?? 0) + 1);
        }
    }
    if (prefixCounts.size === 0)
        return '';
    // Return most common
    return [...prefixCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}
//# sourceMappingURL=cssParser.js.map