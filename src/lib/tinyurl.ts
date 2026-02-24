/**
 * Shortens a URL using the TinyURL API (no key required).
 * Falls back to the original URL on failure.
 */
export async function shortenUrl(url: string): Promise<string> {
  try {
    const response = await fetch(
      `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) {
      return url;
    }

    const shortened = await response.text();

    // Validate we got a proper URL back
    if (shortened.startsWith("https://tinyurl.com/")) {
      return shortened;
    }

    return url;
  } catch {
    // API failure: fall back to original URL
    return url;
  }
}
