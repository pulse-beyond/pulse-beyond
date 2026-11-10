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

// The event prompts live in src/lib/ai/*-provider.ts; every provider appends
// calendarContext to its prompt, so this rule rides along with it.
const SOURCE_URL_RULE = `IMPORTANT rule for sourceUrl: it must be the event's OWN official page (the organizer's page, or a news article about that specific event). Never use an events listing, calendar, aggregator or directory page (e.g. a URL ending in /events/ or /calendar/), and never give the same sourceUrl to two different events. If you cannot find the event's own page, leave sourceUrl empty.`;

/** Path segments that mark a listing/aggregator page rather than a single event. */
const LISTING_SEGMENT_RE =
  /^(events?|calendar|calendars|agenda|upcoming(-events)?|event-calendar|events-calendar|conferences|whats-on|schedule)$/i;

/** True if the URL looks like a listing page: no path, or a path that ends in /events/ etc. */
function looksLikeListingPage(raw: string): boolean {
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const segments = u.pathname.split("/").filter(Boolean);
    if (segments.length === 0) return true; // bare homepage
    return LISTING_SEGMENT_RE.test(segments[segments.length - 1]);
  } catch {
    return true; // unparseable → not a usable source
  }
}

function normalizeUrl(raw: string): string {
  return raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "");
}

/** Drop sourceUrls that are shared by 2+ events or point at a listing page. */
function cleanSourceUrls<T extends { sourceUrl?: string }>(events: T[]): T[] {
  const counts = new Map<string, number>();
  for (const e of events) {
    if (e.sourceUrl) {
      const key = normalizeUrl(e.sourceUrl);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return events.map((e) => {
    if (!e.sourceUrl) return e;
    const shared = (counts.get(normalizeUrl(e.sourceUrl)) ?? 0) > 1;
    if (shared || looksLikeListingPage(e.sourceUrl)) {
      console.warn("[fetchUpcomingEvents] dropping non-specific sourceUrl:", e.sourceUrl);
      return { ...e, sourceUrl: undefined };
    }
    return e;
  });
}

/** Auto-fetch upcoming events for an issue's week */
export async function fetchUpcomingEvents(issueId: string) {
  const ai = getAIProvider();

  // Get the issue to determine publish date
  const issue = await prisma.issue.findUnique({ where: { id: issueId } });
  if (!issue || !issue.publishDate) {
    throw new Error("Issue not found or no publish date set.");
  }

  // Forward-looking window: from the publication day through the day of the next edition.
  // For a Friday publish this covers Friday → next Friday (8 days inclusive) — the events
  // the reader should "keep an eye on" between now and the next issue.
  const publishDate = new Date(issue.publishDate);
  const weekStart = new Date(publishDate);
  const weekEnd = new Date(publishDate);
  weekEnd.setDate(publishDate.getDate() + 7);

  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const weekStartDate = formatDate(weekStart);
  const weekEndDate = formatDate(weekEnd);

  // Scrape Control Risks calendar for context
  const calendarContext = await scrapeControlRisksCalendar();

  // Generate events using AI
  const rawEvents = await ai.generateUpcomingEvents({
    weekStartDate,
    weekEndDate,
    calendarContext: [calendarContext, SOURCE_URL_RULE].filter(Boolean).join("\n\n"),
  });
  const events = cleanSourceUrls(rawEvents);

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
