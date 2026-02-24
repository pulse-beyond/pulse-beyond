"use server";

import { prisma } from "@/lib/db";
import type { MainSectionContent } from "@/types";
import { revalidatePath } from "next/cache";

/**
 * Format a date as "Mon DD, YYYY" (e.g. "Feb 08, 2026").
 * Falls back to the raw title if no publishDate is set.
 */
function formatHeaderDate(date: Date | null): string | null {
  if (!date) return null;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

/** Build the final newsletter text for export */
export async function buildExport(
  issueId: string,
  format: "txt" | "md" = "txt"
) {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: {
      links: { where: { selected: true }, orderBy: { order: "asc" } },
      events: { where: { included: true }, orderBy: { order: "asc" } },
      sections: {
        where: { sectionType: "main" },
        orderBy: { order: "asc" },
        include: { linkItem: true },
      },
    },
  });

  if (!issue) throw new Error("Issue not found");

  const lines: string[] = [];

  // ── Header ──
  const dateStr = formatHeaderDate(issue.publishDate);
  const header = dateStr ? `Weekly Snapshot - ${dateStr}` : issue.title;
  lines.push(header);
  lines.push("");

  // ── Main sections ──
  // Build a map of linkItemId → list of URLs for the "Read more" section
  const sectionLinks: { title: string; urls: string[] }[] = [];

  for (let i = 0; i < issue.sections.length; i++) {
    const section = issue.sections[i];
    const content: MainSectionContent = JSON.parse(
      section.editedContent || section.content
    );
    const title =
      content.selectedTitle === "__custom__"
        ? content.customTitle || content.titleOptions[0]
        : content.selectedTitle || content.titleOptions[0];

    // 👉 Section title
    lines.push(`👉 ${title}`);

    // ↳ Why it matters
    lines.push(`↳ Why it matters`);
    lines.push(content.whyItMatters);

    // ↳ My thoughts on it
    lines.push(`↳ My thoughts on it`);
    lines.push(content.myThoughts);
    lines.push("");

    // Collect links for this section
    const linkedItem = section.linkItem;
    if (linkedItem) {
      // Find all links that belong to the same group/section
      // Each section maps to one selected link; gather its URLs
      const urls: string[] = [];
      // The primary link for this section
      urls.push(linkedItem.shortUrl || linkedItem.url);
      sectionLinks.push({ title, urls });
    }
  }

  // ── Events section ──
  if (issue.events.length > 0) {
    lines.push(`👉 To Keep an Eye On`);
    lines.push("");

    for (const event of issue.events) {
      // Format: * Event title (Date, Location) – Description
      const locationPart = event.location ? `, ${event.location}` : "";
      lines.push(
        `* ${event.title} (${event.date}${locationPart}) – ${event.description}`
      );
    }
    lines.push("");
  }

  // ── Read more section ──
  // Group links by section title, then append any event source URLs
  if (sectionLinks.length > 0 || issue.events.some((e) => e.sourceUrl || e.shortUrl)) {
    lines.push("");
    lines.push(
      "You can read more about each topic by accessing the links below."
    );

    // Links grouped by section
    for (const group of sectionLinks) {
      lines.push(group.title);
      lines.push("");
      for (const url of group.urls) {
        lines.push(`* ${url}`);
      }
      lines.push("");
    }
  }

  const exportContent = lines.join("\n");

  // Save to database
  await prisma.export.create({
    data: {
      issueId,
      format,
      content: exportContent,
    },
  });

  revalidatePath(`/issues/${issueId}`);

  return exportContent;
}
