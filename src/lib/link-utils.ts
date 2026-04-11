import type { LinkItem } from "@prisma/client";

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
