"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/** Create a new issue and redirect to its builder page.
 *  If an edition already exists for that Sunday, appends "(versão 2)", "(versão 3)", etc. */
export async function createIssue() {
  const nextSunday = getNextSunday();
  const baseTitle = `Snapshot - ${formatDate(nextSunday)}`;

  // Count how many issues already exist for this Sunday
  const { start, end } = dayBounds(nextSunday);
  const existingCount = await prisma.issue.count({
    where: { publishDate: { gte: start, lte: end } },
  });

  const title =
    existingCount === 0
      ? baseTitle
      : `${baseTitle} (versão ${existingCount + 1})`;

  const issue = await prisma.issue.create({
    data: { title, publishDate: nextSunday, currentStep: "links" },
  });

  redirect(`/issues/${issue.id}`);
}

/** Ensure empty editions exist for every Sunday in the next 2 months.
 *  Safe to call on every page load — skips dates that already have an edition. */
export async function ensureUpcomingIssues() {
  const sundays = getUpcomingSundays(2);

  for (const sunday of sundays) {
    const { start, end } = dayBounds(sunday);
    const existing = await prisma.issue.findFirst({
      where: { publishDate: { gte: start, lte: end } },
    });
    if (!existing) {
      await prisma.issue.create({
        data: {
          title: `Snapshot - ${formatDate(sunday)}`,
          publishDate: sunday,
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
    },
  });
}

function getNextSunday(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 7 : 7 - day;
  const next = new Date(now);
  next.setDate(now.getDate() + diff);
  next.setHours(9, 0, 0, 0);
  return next;
}

/** Returns all Sundays (at 9 AM) from next Sunday up to N months from now */
function getUpcomingSundays(months: number): Date[] {
  const sundays: Date[] = [];
  const now = new Date();

  // End boundary: N months from today
  const end = new Date(now);
  end.setMonth(end.getMonth() + months);

  // Start from next Sunday
  const cursor = getNextSunday();

  while (cursor <= end) {
    sundays.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }

  return sundays;
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
