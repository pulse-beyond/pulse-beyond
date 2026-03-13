import sharp from "sharp";

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
 * Apply a "[ WEEKLY SNAPSHOT ]" + date text overlay with a dark bottom gradient
 * onto a base64-encoded PNG image.  Returns the composited image as base64.
 */
export async function applyTextOverlay(
  imageBase64: string,
  publishDate: Date | null
): Promise<string> {
  const imageBuffer = Buffer.from(imageBase64, "base64");

  // Get actual dimensions (DALL-E returns 1792×1024 but let's be safe)
  const meta = await sharp(imageBuffer).metadata();
  const W = meta.width ?? 1792;
  const H = meta.height ?? 1024;

  // ── Typography sizes (scaled to image height) ──
  const titleSize = Math.round(H * 0.075); // ~77px @ 1024
  const dateSize = Math.round(H * 0.042);  // ~43px @ 1024
  const letterSpacingTitle = Math.round(titleSize * 0.12);
  const letterSpacingDate = Math.round(dateSize * 0.08);

  // ── Positioning ──
  const gradientH = Math.round(H * 0.38);  // gradient covers bottom 38%
  const gradientY = H - gradientH;
  // Title sits 14% from the bottom, date sits below that
  const titleY = H - Math.round(H * 0.135);
  const dateY = titleY + Math.round(H * 0.07);

  const cx = W / 2;

  const dateStr = publishDate ? formatOverlayDate(publishDate) : null;

  const svgOverlay = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#000000" stop-opacity="0.0"/>
      <stop offset="55%"  stop-color="#000000" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.72"/>
    </linearGradient>
  </defs>

  <!-- Dark gradient at the bottom -->
  <rect x="0" y="${gradientY}" width="${W}" height="${gradientH}" fill="url(#g)"/>

  <!-- Title -->
  <text
    x="${cx}"
    y="${titleY}"
    text-anchor="middle"
    dominant-baseline="auto"
    font-family="DejaVu Sans, Liberation Sans, Arial, Helvetica, sans-serif"
    font-weight="700"
    font-size="${titleSize}"
    fill="white"
    letter-spacing="${letterSpacingTitle}"
  >[ WEEKLY SNAPSHOT ]</text>

  ${
    dateStr
      ? `<text
    x="${cx}"
    y="${dateY}"
    text-anchor="middle"
    dominant-baseline="auto"
    font-family="DejaVu Sans, Liberation Sans, Arial, Helvetica, sans-serif"
    font-weight="400"
    font-size="${dateSize}"
    fill="rgba(255,255,255,0.88)"
    letter-spacing="${letterSpacingDate}"
  >${dateStr}</text>`
      : ""
  }
</svg>`.trim();

  const result = await sharp(imageBuffer)
    .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
    .png()
    .toBuffer();

  return result.toString("base64");
}
