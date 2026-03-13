import sharp from "sharp";
import * as opentype from "opentype.js";
import { ROBOTO_BOLD_B64 } from "./fonts/roboto-bold-b64";

// Parse the font once from the bundled base64 constant — no filesystem access needed.
let _font: opentype.Font | null = null;

function getFont(): opentype.Font {
  if (!_font) {
    const binary = Buffer.from(ROBOTO_BOLD_B64, "base64");
    // Ensure we have a properly-sliced ArrayBuffer (not a pool slice)
    const ab = binary.buffer.slice(
      binary.byteOffset,
      binary.byteOffset + binary.byteLength
    );
    _font = opentype.parse(ab as ArrayBuffer);
  }
  return _font;
}

/** Format a Date as "Mar 08 | 2026" */
function formatOverlayDate(date: Date): string {
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month} ${day} | ${year}`;
}

/**
 * Return the SVG path `d` string for `text`, horizontally centered at `cx`
 * and with the baseline at `baseline`.
 */
function textToPathD(
  font: opentype.Font,
  text: string,
  fontSize: number,
  cx: number,
  baseline: number
): string {
  const glyphs = font.stringToGlyphs(text);
  let totalWidth = 0;
  for (const g of glyphs) {
    totalWidth += (g.advanceWidth ?? 0) * (fontSize / font.unitsPerEm);
  }
  const startX = cx - totalWidth / 2;
  return font.getPath(text, startX, baseline, fontSize).toPathData(2);
}

/**
 * Composite a "[ WEEKLY SNAPSHOT ]" + date text overlay with a dark bottom
 * gradient onto a base64-encoded PNG image.
 *
 * The font is embedded as a base64 constant so this function has no runtime
 * filesystem dependency and works identically on macOS and on Vercel Lambda.
 *
 * If anything goes wrong the original image is returned unchanged.
 */
export async function applyTextOverlay(
  imageBase64: string,
  publishDate: Date | null
): Promise<string> {
  try {
    const imageBuffer = Buffer.from(imageBase64, "base64");

    const meta = await sharp(imageBuffer).metadata();
    const W = meta.width ?? 1792;
    const H = meta.height ?? 1024;

    const font = getFont();

    // ── Typography sizes ────────────────────────────────────────────
    const titleFontSize = Math.round(H * 0.072); // ~74 px @ 1024
    const dateFontSize = Math.round(H * 0.040);  // ~41 px @ 1024

    // ── Vertical positioning ────────────────────────────────────────
    const gradientH = Math.round(H * 0.38);
    const gradientY = H - gradientH;
    const titleBaseline = H - Math.round(H * 0.115);
    const dateBaseline = titleBaseline + Math.round(titleFontSize * 1.12);

    const cx = W / 2;

    // ── Text → SVG paths ────────────────────────────────────────────
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

    // ── SVG overlay ─────────────────────────────────────────────────
    const svgOverlay = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#000000" stop-opacity="0.0"/>
      <stop offset="50%"  stop-color="#000000" stop-opacity="0.38"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.70"/>
    </linearGradient>
  </defs>
  <rect x="0" y="${gradientY}" width="${W}" height="${gradientH}" fill="url(#g)"/>
  <path d="${titlePath}" fill="white"/>
  ${datePath ? `<path d="${datePath}" fill="rgba(255,255,255,0.85)"/>` : ""}
</svg>`.trim();

    const result = await sharp(imageBuffer)
      .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
      .png()
      .toBuffer();

    return result.toString("base64");
  } catch (err) {
    // Overlay failed — return the original image so the rest of the flow
    // continues uninterrupted. The error is logged for debugging.
    console.error("[applyTextOverlay] Failed to apply overlay:", err);
    return imageBase64;
  }
}
