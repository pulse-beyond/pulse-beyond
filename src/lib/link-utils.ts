import type { LinkItem } from "@prisma/client";

/**
 * Titles of bot-check / paywall / error interstitials. Some publishers (Nature,
 * Bloomberg...) answer automated requests with a page titled "Client Challenge";
 * that must never be shown or fed to the AI as the article's headline.
 */
const BLOCKED_TITLE_RE =
  /^(client challenge|just a moment|attention required|access denied|are you a robot|robot check|security check|verify you are human|please verify|captcha|forbidden|403|404|page not found|not found|subscribe to read|log ?in|sign ?in|redirecting)\b/i;

export function isBlockedTitle(title: string | null | undefined): boolean {
  if (!title) return true;
  return BLOCKED_TITLE_RE.test(title.trim());
}

/** The fetched title if it is a real headline, else null. */
export function usableTitle(title: string | null | undefined): string | null {
  return title && !isBlockedTitle(title) ? title : null;
}

/** Group key for a link: its subjectGroup if set, else its own id */
export function getGroupKey(link: LinkItem): string {
  return link.subjectGroup ?? link.id;
}

/** Group links into ordered subjects. Returns array of [groupKey, links[]] preserving first-seen order. */
export function groupLinksBySubject(links: LinkItem[]): [string, LinkItem[]][] {
  const map = new Map<string, LinkItem[]>();
  for (const link of links) {
    const key = getGroupKey(link);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(link);
  }
  return Array.from(map.entries());
}
