"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/** Create a new issue and redirect to its builder page.
 *  Accepts an optional FormData with a `publishDate` (YYYY-MM-DD) override; defaults to next Friday.
 *  If an edition already exists for the chosen day, appends "(versão 2)", "(versão 3)", etc. */
export async function createIssue(formData?: FormData) {
  const overrideRaw = formData?.get("publishDate");
  const targetDate =
    typeof overrideRaw === "string" && overrideRaw
      ? parseDateInput(overrideRaw)
      : getNextFriday();

  const baseTitle = `Snapshot - ${formatDate(targetDate)}`;

  // Count how many issues already exist for this day
  const { start, end } = dayBounds(targetDate);
  const existingCount = await prisma.issue.count({
    where: { publishDate: { gte: start, lte: end } },
  });

  const title =
    existingCount === 0
      ? baseTitle
      : `${baseTitle} (versão ${existingCount + 1})`;

  const issue = await prisma.issue.create({
    data: {
      title,
      publishDate: targetDate,
      imageDate: targetDate,
      currentStep: "links",
    },
  });

  redirect(`/issues/${issue.id}`);
}

/** Ensure empty editions exist for every Friday in the next 2 months.
 *  Safe to call on every page load — skips dates that already have an edition. */
export async function ensureUpcomingIssues() {
  const fridays = getUpcomingFridays(2);

  for (const friday of fridays) {
    const { start, end } = dayBounds(friday);
    const existing = await prisma.issue.findFirst({
      where: { publishDate: { gte: start, lte: end } },
    });
    if (!existing) {
      await prisma.issue.create({
        data: {
          title: `Snapshot - ${formatDate(friday)}`,
          publishDate: friday,
          imageDate: friday,
          currentStep: "links",
        },
      });
    }
  }

  revalidatePath("/create");
}

/** Update issue title */
export async function updateIssueTitle(issueId: string, title: string) {
  await prisma.issue.update({
    where: { id: issueId },
    data: { title },
  });
  revalidatePath(`/issues/${issueId}`);
}

/** Persist the date that should be rendered into the cover image overlay.
 *  Accepts a `YYYY-MM-DD` string (from <input type="date">). */
export async function updateImageDate(issueId: string, rawDate: string) {
  const imageDate = parseDateInput(rawDate);
  await prisma.issue.update({
    where: { id: issueId },
    data: { imageDate },
  });
  revalidatePath(`/issues/${issueId}`);
}

/** Advance or set the current workflow step */
export async function setIssueStep(issueId: string, step: string) {
  await prisma.issue.update({
    where: { id: issueId },
    data: { currentStep: step },
  });
  revalidatePath(`/issues/${issueId}`);
}

/** Delete an issue */
export async function deleteIssue(issueId: string) {
  await prisma.issue.delete({ where: { id: issueId } });
  revalidatePath("/create");
  revalidatePath("/issues");
  redirect("/create");
}

/** Get all active (unpublished) issues ordered by publish date ascending (soonest first) */
export async function getIssues() {
  return prisma.issue.findMany({
    where: { publishedAt: null },
    orderBy: [{ publishDate: "asc" }, { createdAt: "asc" }],
    include: {
      _count: { select: { links: true, events: true } },
    },
  });
}

/** Count all published issues (for the "X past editions" link on Create) */
export async function countPublishedIssues() {
  return prisma.issue.count({ where: { publishedAt: { not: null } } });
}

/** Mark an issue as published — moves it from Create to Past Editions */
export async function markAsPublished(issueId: string) {
  await prisma.issue.update({
    where: { id: issueId },
    data: { publishedAt: new Date() },
  });
  revalidatePath("/create");
  revalidatePath("/past-editions");
}

/** Get all published issues ordered by publish date descending (most recent first) */
export async function getPublishedIssues() {
  return prisma.issue.findMany({
    where: { publishedAt: { not: null } },
    orderBy: [{ publishDate: "desc" }, { publishedAt: "desc" }],
    include: {
      sections: {
        where: { sectionType: "main" },
        orderBy: { order: "asc" },
      },
      exports: { orderBy: { createdAt: "desc" }, take: 1 },
      images: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}

/** Get a single published issue for the detail view */
export async function getPublishedIssue(id: string) {
  return prisma.issue.findUnique({
    where: { id },
    include: {
      sections: {
        where: { sectionType: "main" },
        orderBy: { order: "asc" },
      },
      exports: { orderBy: { createdAt: "desc" }, take: 1 },
      images: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}

/** Get a single issue with all related data */
export async function getIssue(id: string) {
  return prisma.issue.findUnique({
    where: { id },
    include: {
      links: { orderBy: { order: "asc" } },
      events: { orderBy: { order: "asc" } },
      sections: { orderBy: { order: "asc" }, include: { linkItem: true } },
      exports: { orderBy: { createdAt: "desc" }, take: 1 },
      images: { orderBy: { createdAt: "desc" }, take: 1 },
      linkedInDrafts: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}

/** Returns the upcoming Friday (today included if today is a Friday before 9 AM), at 9 AM. */
function getNextFriday(): Date {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 5=Fri
  const diff = (5 - day + 7) % 7 || 7; // always strictly future
  const next = new Date(now);
  next.setDate(now.getDate() + diff);
  next.setHours(9, 0, 0, 0);
  return next;
}

/** Returns all Fridays (at 9 AM) from next Friday up to N months from now */
function getUpcomingFridays(months: number): Date[] {
  const fridays: Date[] = [];
  const now = new Date();

  const end = new Date(now);
  end.setMonth(end.getMonth() + months);

  const cursor = getNextFriday();

  while (cursor <= end) {
    fridays.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }

  return fridays;
}

/** Parse a `YYYY-MM-DD` string (from <input type="date">) into a local-time Date at 9 AM. */
function parseDateInput(raw: string): Date {
  const [y, m, d] = raw.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1, 9, 0, 0, 0);
  return date;
}

/** List of the next N Fridays as ISO date strings (YYYY-MM-DD), for UI presets. */
export async function getUpcomingFridayOptions(count: number = 8): Promise<string[]> {
  const fridays = getUpcomingFridays(3).slice(0, count);
  return fridays.map((d) => toDateInputValue(d));
}

function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Start and end of a day for date-only comparisons */
function dayBounds(d: Date): { start: Date; end: Date } {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
