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

/**
 * Fetches basic metadata (title, description) from a URL.
 * Falls back gracefully if the page blocks scraping.
 */
export async function fetchUrlMetadata(
  url: string
): Promise<{ title: string | null; description: string | null }> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; SnapshotBuilder/1.0; +https://example.com)",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return { title: null, description: null };
    }

    const html = await response.text();

    // Extract <title>
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : null;

    // Extract meta description
    const descMatch = html.match(
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i
    );
    // Also try og:description
    const ogDescMatch = html.match(
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i
    );
    const description = descMatch?.[1] || ogDescMatch?.[1] || null;

    return {
      title: title ? decodeHtmlEntities(title) : null,
      description: description ? decodeHtmlEntities(description) : null,
    };
  } catch {
    // Network error, timeout, or blocked. Fall back silently.
    return { title: null, description: null };
  }
}
