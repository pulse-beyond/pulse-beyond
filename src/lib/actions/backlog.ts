"use server";

import { prisma } from "@/lib/db";
import { fetchUrlMetadata } from "@/lib/url-metadata";
import { addLink } from "@/lib/actions/links";
import { revalidatePath } from "next/cache";
import type { BacklogItem } from "@/types/index";

export async function getBacklogItems(): Promise<BacklogItem[]> {
  return prisma.backlogItem.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function addBacklogItem(
  url: string,
  note?: string
): Promise<{ error?: string }> {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return { error: "Invalid URL." };
  }

  const metadata = await fetchUrlMetadata(url);

  await prisma.backlogItem.create({
    data: {
      url,
      metaTitle: metadata.title ?? null,
      metaDescription: metadata.description ?? null,
      note: note?.trim() || null,
    },
  });

  revalidatePath("/brain-dump");
  return {};
}

export async function deleteBacklogItem(id: string): Promise<void> {
  await prisma.backlogItem.delete({ where: { id } });
  revalidatePath("/brain-dump");
}

export async function addBacklogItemToEdition(
  url: string,
  issueId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await addLink(issueId, url);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to add to edition." };
  }
}
