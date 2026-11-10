"use server";

import { prisma } from "@/lib/db";
import { fetchUrlMetadata } from "@/lib/url-metadata";
import { addLink } from "@/lib/actions/links";
import { revalidatePath } from "next/cache";
import type { BacklogItem } from "@/types/index";

/** Notes expire this many days after the edition they're attached to. */
const EXPIRE_DAYS_AFTER_EDITION = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

function formatEditionDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export async function getBacklogItems(): Promise<BacklogItem[]> {
  // Lazily archive notes whose edition date is more than 5 days in the past.
  // Archived (not deleted), so nothing is lost if one needs to be recovered.
  const cutoff = new Date(Date.now() - EXPIRE_DAYS_AFTER_EDITION * DAY_MS);
  await prisma.backlogItem.updateMany({
    where: { archivedAt: null, issue: { publishDate: { lt: cutoff } } },
    data: { archivedAt: new Date() },
  });

  const rows = await prisma.backlogItem.findMany({
    where: { archivedAt: null },
    orderBy: { createdAt: "desc" },
    include: { issue: { select: { publishDate: true, title: true } } },
  });

  return rows.map(({ issue, ...r }) => ({
    id: r.id,
    url: r.url,
    metaTitle: r.metaTitle,
    metaDescription: r.metaDescription,
    note: r.note,
    createdAt: r.createdAt,
    issueId: r.issueId,
    issueLabel: issue
      ? issue.publishDate
        ? formatEditionDate(issue.publishDate)
        : issue.title
      : null,
    expiresAt: issue?.publishDate
      ? new Date(issue.publishDate.getTime() + EXPIRE_DAYS_AFTER_EDITION * DAY_MS)
      : null,
  }));
}

export async function addBacklogItem(
  url: string,
  note?: string,
  issueId?: string
): Promise<{ error?: string }> {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return { error: "Invalid URL." };
  }

  try {
    // Metadata is best-effort: a site that blocks us must not stop the save.
    const metadata = await fetchUrlMetadata(url).catch((err) => {
      console.warn("[backlog] metadata fetch failed:", err);
      return { title: null, description: null };
    });

    await prisma.backlogItem.create({
      data: {
        url,
        metaTitle: metadata.title ?? null,
        metaDescription: metadata.description ?? null,
        note: note?.trim() || null,
        issueId: issueId || null,
      },
    });
  } catch (err) {
    console.error("[backlog] failed to save item:", err);
    return { error: `Could not save: ${err instanceof Error ? err.message : "unknown error"}` };
  }

  revalidatePath("/brain-dump");
  return {};
}

export async function deleteBacklogItem(id: string): Promise<{ error?: string }> {
  try {
    // deleteMany: a double click (or an already-deleted item) is not an error.
    await prisma.backlogItem.deleteMany({ where: { id } });
  } catch (err) {
    console.error("[backlog] failed to delete item:", err);
    return { error: `Could not delete: ${err instanceof Error ? err.message : "unknown error"}` };
  }
  revalidatePath("/brain-dump");
  return {};
}

export async function addBacklogItemToEdition(
  url: string,
  issueId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await addLink(issueId, url);
    return { success: true };
  } catch (e) {
    console.error("[backlog] failed to add item to edition:", e);
    return { success: false, error: e instanceof Error ? e.message : "Failed to add to edition." };
  }
}
