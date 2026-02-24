"use server";

import { prisma } from "@/lib/db";
import { shortenUrl } from "@/lib/tinyurl";
import { revalidatePath } from "next/cache";

/** Shorten all URLs for selected links and events in an issue */
export async function shortenAllLinks(issueId: string) {
  // Shorten selected link URLs
  const links = await prisma.linkItem.findMany({
    where: { issueId, selected: true },
  });

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
