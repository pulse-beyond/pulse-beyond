import { isBlockedTitle } from "@/lib/link-utils";

/** Decode HTML entities like &quot; &amp; &#39; etc. */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

const USER_AGENT = "Mozilla/5.0 (compatible; SnapshotBuilder/1.0)";

function metaContent(html: string, attr: "property" | "name", key: string): string | null {
  // content can come before or after the property/name attribute
  const a = new RegExp(`<meta[^>]+${attr}=["']${key}["'][^>]*content=["']([^"']+)["']`, "i");
  const b = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*${attr}=["']${key}["']`, "i");
  return html.match(a)?.[1] ?? html.match(b)?.[1] ?? null;
}

async function fetchHtml(url: string): Promise<string | null> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    signal: AbortSignal.timeout(8000),
  });
  return res.ok ? await res.text() : null;
}

/**
 * Fetches basic metadata (title, description) from a URL.
 * Falls back gracefully (null title → the UI shows the URL) if the page blocks scraping.
 */
export async function fetchUrlMetadata(
  url: string
): Promise<{ title: string | null; description: string | null }> {
  try {
    const html = await fetchHtml(url);
    if (!html) return { title: null, description: null };

    // og:title / citation_title are the clean headline (no " | Site name" suffix).
    const candidates = [
      metaContent(html, "property", "og:title"),
      metaContent(html, "name", "citation_title"),
      metaContent(html, "name", "twitter:title"),
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? null,
    ]
      .filter((t): t is string => !!t)
      .map((t) => decodeHtmlEntities(t.trim()));
    const title = candidates.find((t) => !isBlockedTitle(t)) ?? null;

    const description =
      metaContent(html, "name", "description") ?? metaContent(html, "property", "og:description");

    return {
      title,
      // A challenge page's description is junk too.
      description: title && description ? decodeHtmlEntities(description) : null,
    };
  } catch {
    // Network error, timeout, or blocked. Fall back silently.
    return { title: null, description: null };
  }
}
