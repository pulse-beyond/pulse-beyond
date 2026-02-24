"use server";

import { prisma } from "@/lib/db";
import { getAIProvider } from "@/lib/ai";
import { searchArchive } from "@/lib/archive";
import type { MainSectionContent } from "@/types";
import { revalidatePath } from "next/cache";

/** Generate draft sections for all selected links using the AI provider */
export async function generateDraft(issueId: string) {
  const ai = getAIProvider();

  // Get selected links
  const links = await prisma.linkItem.findMany({
    where: { issueId, selected: true },
    orderBy: { order: "asc" },
  });

  if (links.length === 0) {
    throw new Error("No links selected. Select at least 1 link to generate.");
  }

  // Clear any existing main sections for this issue
  await prisma.generatedSection.deleteMany({
    where: { issueId, sectionType: "main" },
  });

  // Generate a section for each selected link
  const errors: string[] = [];
  let generated = 0;

  for (let i = 0; i < links.length; i++) {
    const link = links[i];

    try {
      // Search archive for relevant past content
      const archiveContext = searchArchive({
        metaTitle: link.metaTitle ?? undefined,
        metaDescription: link.metaDescription ?? undefined,
        url: link.url,
      });

      const draft = await ai.generateSection({
        url: link.url,
        metaTitle: link.metaTitle,
        metaDescription: link.metaDescription,
        toneNote: link.toneNote,
        audioTranscript: link.audioTranscript,
        archiveContext: archiveContext || null,
      });

      const content: MainSectionContent = {
        titleOptions: draft.titleOptions,
        whyItMatters: draft.whyItMatters,
        myThoughts: draft.myThoughts,
      };

      await prisma.generatedSection.create({
        data: {
          issueId,
          linkItemId: link.id,
          sectionType: "main",
          content: JSON.stringify(content),
          order: i,
        },
      });
      generated++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      console.error(`Failed to generate section for link ${link.url}:`, msg);
      errors.push(`Section ${i + 1} (${link.metaTitle || link.url}): ${msg}`);
    }
  }

  revalidatePath(`/issues/${issueId}`);
  return { generated, total: links.length, errors };
}

/** Update a generated section's edited content */
export async function updateSectionContent(
  sectionId: string,
  editedContent: string
) {
  const section = await prisma.generatedSection.update({
    where: { id: sectionId },
    data: { editedContent },
  });
  revalidatePath(`/issues/${section.issueId}`);
}

/** Select a title option for a section */
export async function selectTitle(sectionId: string, title: string) {
  const section = await prisma.generatedSection.findUnique({
    where: { id: sectionId },
  });
  if (!section) return;

  const content: MainSectionContent = JSON.parse(
    section.editedContent || section.content
  );
  content.selectedTitle = title;

  await prisma.generatedSection.update({
    where: { id: sectionId },
    data: { editedContent: JSON.stringify(content) },
  });

  revalidatePath(`/issues/${section.issueId}`);
}
