import * as fs from 'fs';
import * as path from 'path';

/**
 * Converts a font file to a base64 data URI usable in VS Code decorations.
 * VS Code's decoration API uses CSS, so we embed the font as a data URI
 * inside a generated stylesheet injected via the webview / decoration.
 */
export function fontFileToDataUri(fontFilePath: string): string | null {
  if (!fontFilePath || !fs.existsSync(fontFilePath)) return null;

  const ext = path.extname(fontFilePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.ttf': 'font/truetype',
    '.otf': 'font/opentype',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.eot': 'application/vnd.ms-fontobject',
  };

  const mime = mimeMap[ext];
  if (!mime) return null;

  try {
    const data = fs.readFileSync(fontFilePath);
    return `data:${mime};base64,${data.toString('base64')}`;
  } catch {
    return null;
  }
}

/**
 * Generates a minimal CSS snippet that registers a font face using a data URI.
 * This is injected into the webview HTML for the icon browser panel.
 */
export function buildFontFaceCSS(fontFamily: string, fontFilePath: string): string {
  const dataUri = fontFileToDataUri(fontFilePath);
  if (!dataUri) return '';

  return `@font-face {
  font-family: '${fontFamily}';
  src: url('${dataUri}') format('truetype');
  font-weight: normal;
  font-style: normal;
}`;
}
