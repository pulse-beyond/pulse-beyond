"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/** Create a new issue and redirect to its builder page */
export async function createIssue() {
  const nextSunday = getNextSunday();
  const issue = await prisma.issue.create({
    data: {
      title: `Snapshot - ${formatDate(nextSunday)}`,
      publishDate: nextSunday,
      currentStep: "links",
    },
  });

  redirect(`/issues/${issue.id}`);
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

/** Get all issues ordered by creation date */
export async function getIssues() {
  return prisma.issue.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { links: true, events: true } },
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

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
