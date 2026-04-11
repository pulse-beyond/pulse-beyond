"use server";

import { prisma } from "@/lib/db";
import { shortenUrl } from "@/lib/tinyurl";
import { revalidatePath } from "next/cache";

/** Shorten all URLs for selected links and events in an issue */
export async function shortenAllLinks(issueId: string) {
  // Shorten selected links + secondary links from the same subject groups
  const allLinks = await prisma.linkItem.findMany({ where: { issueId } });
  const selectedGroupIds = new Set(
    allLinks
      .filter((l) => l.selected && l.subjectGroup)
      .map((l) => l.subjectGroup!)
  );
  const links = allLinks.filter(
    (l) => l.selected || (l.subjectGroup && selectedGroupIds.has(l.subjectGroup))
  );

  for (const link of links) {
    const shortUrl = await shortenUrl(link.url);
    await prisma.linkItem.update({
      where: { id: link.id },
      data: { shortUrl },
    });
  }

  // Shorten event source URLs
  const events = await prisma.eventItem.findMany({
    where: { issueId },
  });

  for (const event of events) {
    if (event.sourceUrl) {
      const shortUrl = await shortenUrl(event.sourceUrl);
      await prisma.eventItem.update({
        where: { id: event.id },
        data: { shortUrl },
      });
    }
  }

  revalidatePath(`/issues/${issueId}`);
}
