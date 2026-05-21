"use server";

import { prisma } from "@/lib/db";
import { fetchUrlMetadata } from "@/lib/url-metadata";
import { revalidatePath } from "next/cache";
import { put, del } from "@vercel/blob";

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

/** Remove the audio transcript for a link */
export async function deleteAudioTranscript(linkId: string) {
  const link = await prisma.linkItem.update({
    where: { id: linkId },
    data: { audioTranscript: null },
  });
  revalidatePath(`/issues/${link.issueId}`);
}

/** Record and transcribe a voice memo for a link */
export async function uploadAudio(
  linkId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const file = formData.get("audio") as File;
  if (!file || file.size === 0) return { error: "No audio file received." };

  const link = await prisma.linkItem.findUnique({ where: { id: linkId } });
  if (!link) return { error: "Link not found." };

  // 1. Save audio to Blob storage first so it's never lost if transcription fails
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { error: "Audio upload is not configured. Contact support." };
  }
  let blobUrl: string;
  try {
    const mimeType = file.type || "audio/webm";
    const ext = mimeType.includes("webm") ? "webm" : "m4a";
    const { url } = await put(`audio/${linkId}.${ext}`, file, {
      access: "public",
      addRandomSuffix: false,
      contentType: mimeType,
    });
    blobUrl = url;
  } catch (e) {
    console.error("Blob upload failed:", e);
    return { error: "Failed to save audio. Please try again." };
  }

  // 2. Persist the audio URL immediately so it's recoverable even if transcription fails
  await prisma.linkItem.update({
    where: { id: linkId },
    data: { audioPath: blobUrl },
  });

  // 3. Transcribe
  let transcript: string;
  try {
    const { transcribeAudio } = await import("@/lib/whisper");
    transcript = await transcribeAudio(file);
  } catch (e) {
    console.error("Transcription failed:", e);
    // Audio is saved in Blob — user can retry later
    revalidatePath(`/issues/${link.issueId}`);
    return { error: "Transcription failed. Your audio was saved and can be retried." };
  }

  // 4. Save transcript and clean up the Blob (no longer needed)
  await prisma.linkItem.update({
    where: { id: linkId },
    data: { audioTranscript: transcript, audioPath: null },
  });
  await del(blobUrl);

  revalidatePath(`/issues/${link.issueId}`);
  return {};
}

/** Re-transcribe a voice memo from the audio already saved in Blob storage */
export async function retryTranscription(
  linkId: string
): Promise<{ error?: string }> {
  const link = await prisma.linkItem.findUnique({ where: { id: linkId } });
  if (!link) return { error: "Link not found." };
  if (!link.audioPath) return { error: "No saved audio to transcribe." };

  // 1. Download the saved audio from Blob storage
  let file: File;
  try {
    const res = await fetch(link.audioPath);
    if (!res.ok) throw new Error(`Blob fetch failed: ${res.status}`);
    const blob = await res.blob();
    const ext = link.audioPath.endsWith(".m4a") ? "m4a" : "webm";
    const mimeType = ext === "m4a" ? "audio/mp4" : "audio/webm";
    file = new File([blob], `voice-memo.${ext}`, { type: mimeType });
  } catch (e) {
    console.error("Failed to load saved audio:", e);
    return { error: "Could not load the saved audio. Please try again." };
  }

  // 2. Transcribe
  let transcript: string;
  try {
    const { transcribeAudio } = await import("@/lib/whisper");
    transcript = await transcribeAudio(file);
  } catch (e) {
    console.error("Retry transcription failed:", e);
    return { error: "Transcription failed again. Your audio is still saved." };
  }

  // 3. Save transcript and clean up the Blob
  await prisma.linkItem.update({
    where: { id: linkId },
    data: { audioTranscript: transcript, audioPath: null },
  });
  await del(link.audioPath);

  revalidatePath(`/issues/${link.issueId}`);
  return {};
}
