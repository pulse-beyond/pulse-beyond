"use server";

import { prisma } from "@/lib/db";
import { getAIProvider } from "@/lib/ai";
import { revalidatePath } from "next/cache";

/** Scrape the Control Risks geopolitical calendar for context */
async function scrapeControlRisksCalendar(): Promise<string> {
  try {
    const res = await fetch(
      "https://www.controlrisks.com/our-thinking/geopolitical-calendar",
      {
        signal: AbortSignal.timeout(15000),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      }
    );
    if (!res.ok) return "";
    const html = await res.text();

    // Extract text content from table rows — simple regex-based extraction
    // The calendar has a table structure with Date, Event, Location columns
    const rows: string[] = [];
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let match;
    while ((match = rowRegex.exec(html)) !== null) {
      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      const cells: string[] = [];
      let cellMatch;
      while ((cellMatch = cellRegex.exec(match[1])) !== null) {
        // Strip HTML tags and decode entities
        const text = cellMatch[1]
          .replace(/<[^>]+>/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&nbsp;/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        if (text) cells.push(text);
      }
      if (cells.length >= 2) {
        rows.push(cells.join(" | "));
      }
    }

    if (rows.length === 0) return "";
    return "Control Risks Geopolitical Calendar entries:\n" + rows.join("\n");
  } catch (e) {
    console.error("Failed to scrape Control Risks calendar:", e);
    return "";
  }
}

/** Auto-fetch upcoming events for an issue's week */
export async function fetchUpcomingEvents(issueId: string) {
  const ai = getAIProvider();

  // Get the issue to determine publish date
  const issue = await prisma.issue.findUnique({ where: { id: issueId } });
  if (!issue || !issue.publishDate) {
    throw new Error("Issue not found or no publish date set.");
  }

  // Compute Monday-Saturday range from the publish date (Sunday)
  const publishDate = new Date(issue.publishDate);
  const monday = new Date(publishDate);
  monday.setDate(publishDate.getDate() + 1); // Sunday + 1 = Monday

  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5); // Monday + 5 = Saturday

  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const weekStartDate = formatDate(monday);
  const weekEndDate = formatDate(saturday);

  // Scrape Control Risks calendar for context
  const calendarContext = await scrapeControlRisksCalendar();

  // Generate events using AI
  const events = await ai.generateUpcomingEvents({
    weekStartDate,
    weekEndDate,
    calendarContext: calendarContext || undefined,
  });

  // Clear existing events for this issue before adding new ones
  await prisma.eventItem.deleteMany({ where: { issueId } });

  // Save generated events
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    await prisma.eventItem.create({
      data: {
        issueId,
        title: event.title,
        date: event.date,
        location: event.location,
        description: event.description,
        sourceUrl: event.sourceUrl || null,
        order: i,
      },
    });
  }

  revalidatePath(`/issues/${issueId}`);
  return { count: events.length, weekRange: `${weekStartDate} – ${weekEndDate}` };
}

/** Add an event to an issue */
export async function addEvent(
  issueId: string,
  data: {
    title: string;
    date: string;
    location: string;
    description: string;
    sourceUrl?: string;
  }
) {
  const count = await prisma.eventItem.count({ where: { issueId } });

  await prisma.eventItem.create({
    data: {
      issueId,
      title: data.title,
      date: data.date,
      location: data.location,
      description: data.description,
      sourceUrl: data.sourceUrl || null,
      order: count,
    },
  });

  revalidatePath(`/issues/${issueId}`);
}

/** Update an event */
export async function updateEvent(
  eventId: string,
  data: {
    title?: string;
    date?: string;
    location?: string;
    description?: string;
    sourceUrl?: string;
  }
) {
  const event = await prisma.eventItem.update({
    where: { id: eventId },
    data,
  });
  revalidatePath(`/issues/${event.issueId}`);
}

/** Toggle an event's included status */
export async function toggleEventIncluded(eventId: string) {
  const event = await prisma.eventItem.findUnique({ where: { id: eventId } });
  if (!event) return;

  await prisma.eventItem.update({
    where: { id: eventId },
    data: { included: !event.included },
  });
  revalidatePath(`/issues/${event.issueId}`);
}

/** Remove an event */
export async function removeEvent(eventId: string) {
  const event = await prisma.eventItem.findUnique({ where: { id: eventId } });
  if (!event) return;

  await prisma.eventItem.delete({ where: { id: eventId } });
  revalidatePath(`/issues/${event.issueId}`);
}
