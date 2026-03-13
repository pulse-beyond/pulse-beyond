import sharp from "sharp";
import * as opentype from "opentype.js";
import path from "path";
import fs from "fs";

// Load the font once at module level (server-side only)
const FONT_PATH = path.join(process.cwd(), "src/lib/fonts/Roboto-Bold.ttf");
let _font: opentype.Font | null = null;

function getFont(): opentype.Font {
  if (!_font) {
    const buffer = fs.readFileSync(FONT_PATH);
    _font = opentype.parse(buffer.buffer);
  }
  return _font;
}

/**
 * Format a Date as "Mar 08 | 2026"
 */
function formatOverlayDate(date: Date): string {
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month} ${day} | ${year}`;
}

/**
 * Build an SVG path element for a text string, horizontally centered at cx.
 * Returns the `d` attribute string + the bounding box width.
 */
function textToPathD(
  font: opentype.Font,
  text: string,
  fontSize: number,
  cx: number,
  baseline: number
): string {
  // Measure total advance width to center the text
  const glyphs = font.stringToGlyphs(text);
  let totalWidth = 0;
  for (const glyph of glyphs) {
    totalWidth += (glyph.advanceWidth ?? 0) * (fontSize / font.unitsPerEm);
  }

  const startX = cx - totalWidth / 2;
  const pathObj = font.getPath(text, startX, baseline, fontSize);
  return pathObj.toPathData(2);
}

/**
 * Apply a "[ WEEKLY SNAPSHOT ]" + date text overlay with a dark bottom gradient
 * onto a base64-encoded PNG image.  Returns the composited image as base64.
 *
 * Uses opentype.js to convert text → SVG paths so there is zero dependency
 * on the system font stack (works on macOS and on Vercel Lambda alike).
 */
export async function applyTextOverlay(
  imageBase64: string,
  publishDate: Date | null
): Promise<string> {
  const imageBuffer = Buffer.from(imageBase64, "base64");

  const meta = await sharp(imageBuffer).metadata();
  const W = meta.width ?? 1792;
  const H = meta.height ?? 1024;

  const font = getFont();

  // ── Typography sizes ──────────────────────────────────────────────
  const titleFontSize = Math.round(H * 0.072); // ~74px @ 1024
  const dateFontSize = Math.round(H * 0.040);  // ~41px @ 1024

  // ── Vertical positioning ──────────────────────────────────────────
  // Gradient covers the bottom 38% of the image
  const gradientH = Math.round(H * 0.38);
  const gradientY = H - gradientH;

  // Title baseline: 13% from bottom
  const titleBaseline = H - Math.round(H * 0.115);
  // Date baseline: below the title by ~1.1× title font size
  const dateBaseline = titleBaseline + Math.round(titleFontSize * 1.12);

  const cx = W / 2;

  // ── Convert text → SVG path data ─────────────────────────────────
  const titlePath = textToPathD(
    font,
    "[ WEEKLY SNAPSHOT ]",
    titleFontSize,
    cx,
    titleBaseline
  );

  const dateStr = publishDate ? formatOverlayDate(publishDate) : null;
  const datePath = dateStr
    ? textToPathD(font, dateStr, dateFontSize, cx, dateBaseline)
    : null;

  // ── Build SVG overlay ─────────────────────────────────────────────
  const svgOverlay = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#000000" stop-opacity="0.0"/>
      <stop offset="50%"  stop-color="#000000" stop-opacity="0.38"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.70"/>
    </linearGradient>
  </defs>

  <!-- Dark bottom gradient for legibility -->
  <rect x="0" y="${gradientY}" width="${W}" height="${gradientH}" fill="url(#g)"/>

  <!-- Title: [ WEEKLY SNAPSHOT ] -->
  <path d="${titlePath}" fill="white"/>

  ${datePath ? `<!-- Date --><path d="${datePath}" fill="rgba(255,255,255,0.85)"/>` : ""}
</svg>`.trim();

  const result = await sharp(imageBuffer)
    .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
    .png()
    .toBuffer();

  return result.toString("base64");
}
