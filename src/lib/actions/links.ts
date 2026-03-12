"use server";

import { prisma } from "@/lib/db";
import { fetchUrlMetadata } from "@/lib/url-metadata";
import { revalidatePath } from "next/cache";

/** Add a new link to an issue, fetching URL metadata automatically */
export async function addLink(
  issueId: string,
  url: string,
  toneNote?: string,
  subjectGroup?: string
) {
  // Count existing links to set order
  const count = await prisma.linkItem.count({ where: { issueId } });

  // Fetch metadata in background (non-blocking for UX)
  const metadata = await fetchUrlMetadata(url);

  await prisma.linkItem.create({
    data: {
      issueId,
      url,
      metaTitle: metadata.title,
      metaDescription: metadata.description,
      toneNote: toneNote || null,
      subjectGroup: subjectGroup || null,
      order: count,
    },
  });

  revalidatePath(`/issues/${issueId}`);
}

/** Update a link's tone note */
export async function updateLinkToneNote(linkId: string, toneNote: string) {
  const link = await prisma.linkItem.update({
    where: { id: linkId },
    data: { toneNote },
  });
  revalidatePath(`/issues/${link.issueId}`);
}

/** Remove a link from an issue */
export async function removeLink(linkId: string) {
  const link = await prisma.linkItem.findUnique({ where: { id: linkId } });
  if (!link) return;

  await prisma.linkItem.delete({ where: { id: linkId } });
  revalidatePath(`/issues/${link.issueId}`);
}

/** Toggle link selection (for the "select final 3" step) */
export async function toggleLinkSelection(linkId: string, selected: boolean) {
  const link = await prisma.linkItem.update({
    where: { id: linkId },
    data: { selected },
  });
  revalidatePath(`/issues/${link.issueId}`);
}

/** Select exactly these link IDs and deselect all others */
export async function selectFinalLinks(
  issueId: string,
  selectedIds: string[]
) {
  // Deselect all first
  await prisma.linkItem.updateMany({
    where: { issueId },
    data: { selected: false },
  });

  // Select the chosen ones
  if (selectedIds.length > 0) {
    await prisma.linkItem.updateMany({
      where: { id: { in: selectedIds } },
      data: { selected: true },
    });
  }

  revalidatePath(`/issues/${issueId}`);
}

/** Record and transcribe a voice memo for a link (no disk write — memory only) */
export async function uploadAudio(
  linkId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const file = formData.get("audio") as File;
  if (!file || file.size === 0) return { error: "No audio file received." };

  const link = await prisma.linkItem.findUnique({ where: { id: linkId } });
  if (!link) return { error: "Link not found." };

  // Transcribe directly from the in-memory File — no disk write needed
  let transcript: string;
  try {
    const { transcribeAudio } = await import("@/lib/whisper");
    transcript = await transcribeAudio(file);
  } catch (e) {
    console.error("Transcription failed:", e);
    return { error: "Transcription failed. Please try again." };
  }

  await prisma.linkItem.update({
    where: { id: linkId },
    data: { audioTranscript: transcript },
  });

  revalidatePath(`/issues/${link.issueId}`);
  return {};
}
