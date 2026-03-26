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
exports.fontFileToDataUri = fontFileToDataUri;
exports.buildFontFaceCSS = buildFontFaceCSS;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Converts a font file to a base64 data URI usable in VS Code decorations.
 * VS Code's decoration API uses CSS, so we embed the font as a data URI
 * inside a generated stylesheet injected via the webview / decoration.
 */
function fontFileToDataUri(fontFilePath) {
    if (!fontFilePath || !fs.existsSync(fontFilePath))
        return null;
    const ext = path.extname(fontFilePath).toLowerCase();
    const mimeMap = {
        '.ttf': 'font/truetype',
        '.otf': 'font/opentype',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.eot': 'application/vnd.ms-fontobject',
    };
    const mime = mimeMap[ext];
    if (!mime)
        return null;
    try {
        const data = fs.readFileSync(fontFilePath);
        return `data:${mime};base64,${data.toString('base64')}`;
    }
    catch {
        return null;
    }
}
/**
 * Generates a minimal CSS snippet that registers a font face using a data URI.
 * This is injected into the webview HTML for the icon browser panel.
 */
function buildFontFaceCSS(fontFamily, fontFilePath) {
    const dataUri = fontFileToDataUri(fontFilePath);
    if (!dataUri)
        return '';
    return `@font-face {
  font-family: '${fontFamily}';
  src: url('${dataUri}') format('truetype');
  font-weight: normal;
  font-style: normal;
}`;
}
//# sourceMappingURL=fontRenderer.js.map