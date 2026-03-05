"use server";

import { prisma } from "@/lib/db";
import { getAIProvider } from "@/lib/ai";
import { searchArchive } from "@/lib/archive";
import type { MainSectionContent } from "@/types";
import { revalidatePath } from "next/cache";

/** Group key for a link: its subjectGroup if set, else its own id */
function getLinkGroupKey(link: { id: string; subjectGroup: string | null }): string {
  return link.subjectGroup ?? link.id;
}

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

  // Group selected links by subject
  const subjectMap = new Map<string, typeof links>();
  for (const link of links) {
    const key = getLinkGroupKey(link);
    if (!subjectMap.has(key)) subjectMap.set(key, []);
    subjectMap.get(key)!.push(link);
  }
  const subjects = Array.from(subjectMap.values());

  // Clear any existing main sections for this issue
  await prisma.generatedSection.deleteMany({
    where: { issueId, sectionType: "main" },
  });

  // Generate one section per subject
  const errors: string[] = [];
  let generated = 0;

  for (let i = 0; i < subjects.length; i++) {
    const groupLinks = subjects[i];
    const primaryLink = groupLinks[0];
    const additionalLinks = groupLinks.slice(1);

    try {
      // Search archive for relevant past content (using primary link)
      const archiveContext = searchArchive({
        metaTitle: primaryLink.metaTitle ?? undefined,
        metaDescription: primaryLink.metaDescription ?? undefined,
        url: primaryLink.url,
      });

      const draft = await ai.generateSection({
        url: primaryLink.url,
        metaTitle: primaryLink.metaTitle,
        metaDescription: primaryLink.metaDescription,
        toneNote: primaryLink.toneNote,
        audioTranscript: primaryLink.audioTranscript,
        archiveContext: archiveContext || null,
        additionalSources: additionalLinks.map((l) => ({
          url: l.url,
          metaTitle: l.metaTitle,
          metaDescription: l.metaDescription,
        })),
      });

      const content: MainSectionContent = {
        titleOptions: draft.titleOptions,
        whyItMatters: draft.whyItMatters,
        myThoughts: draft.myThoughts,
      };

      await prisma.generatedSection.create({
        data: {
          issueId,
          linkItemId: primaryLink.id,
          sectionType: "main",
          content: JSON.stringify(content),
          order: i,
        },
      });
      generated++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      console.error(`Failed to generate section for subject ${i + 1}:`, msg);
      errors.push(`Section ${i + 1} (${primaryLink.metaTitle || primaryLink.url}): ${msg}`);
    }
  }

  revalidatePath(`/issues/${issueId}`);
  return { generated, total: subjects.length, errors };
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
