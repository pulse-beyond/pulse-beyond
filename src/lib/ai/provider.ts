import type { GenerateSectionInput, GeneratedDraft } from "@/types";

export interface UpcomingEvent {
  title: string;
  date: string;
  location: string;
  description: string;
  sourceUrl?: string;
}

/**
 * AI Provider interface. All AI generation goes through this abstraction,
 * making it easy to swap between mock, OpenAI, or any other provider.
 */
export interface AIProvider {
  /** Generate a newsletter section draft for one link */
  generateSection(input: GenerateSectionInput): Promise<GeneratedDraft>;

  /** Generate provocative event descriptions (questions format) */
  generateEventDescription(event: {
    title: string;
    date: string;
    location: string;
  }): Promise<string>;

  /** Fetch/generate upcoming events for a given date range */
  generateUpcomingEvents(input: {
    weekStartDate: string; // ISO date string (Monday)
    weekEndDate: string;   // ISO date string (Saturday)
    calendarContext?: string; // Scraped calendar data for context
  }): Promise<UpcomingEvent[]>;
}
