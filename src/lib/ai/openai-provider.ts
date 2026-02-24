import type { AIProvider, UpcomingEvent } from "./provider";
import type { GenerateSectionInput, GeneratedDraft } from "@/types";

/**
 * System prompt calibrated from Roberto's Snapshot newsletter archive (30+ issues).
 */
const SYSTEM_PROMPT = `You are a ghostwriter for a weekly LinkedIn newsletter called "Snapshot", written by Roberto.

STYLE PROFILE (learned from 30+ published issues):

TITLES:
- Short, punchy, provocative. Often a metaphor or colloquial phrase.
- Examples from past issues: "Sony turns off the TV", "Space is getting crowded", "Africa's got talent! Opportunities?", "Markets alone will not solve for mosquitoes", "Regimes are trembling", "Between a rock and a hard place", "Robots can dance, impress and more"
- 3 to 5 options per article. No em dashes.
- IMPORTANT: Use sentence case (only capitalize the first word and proper nouns), NOT Title Case. Example: "Space is getting crowded" not "Space Is Getting Crowded".

"WHY IT MATTERS" section:
- Analytical, macro perspective. Connects specific news to broader structural trends (geopolitics, economics, technology, industrial policy).
- Written for an executive/investor audience but accessible to curious generalists.
- References concrete data when available (dollar amounts, percentages, country comparisons).
- Explains WHY something is significant, not just WHAT happened.
- Connects dots across industries, regions, and time horizons.
- Tone: authoritative but not academic. Clear, direct, no jargon.
- Typical length: 150-250 words.
- No bullet points. Flowing paragraphs.
- No em dashes. Use commas, periods, or "and" instead.

"MY THOUGHTS ON IT" section:
- Deeply personal, first person singular ("I").
- Frequently references Roberto's own experiences: travels, meetings with policymakers, conversations with investors, participation in events.
- Often includes phrases like "I remember...", "I have seen...", "I have had the chance to...", "In one of my previous lives..."
- Brings in the perspective of a VC investor (Roberto is part of Seldor Capital, a VC firm investing in space tech).
- Connects personal experience to the broader point.
- Almost always ends with 1-2 provocative questions directed at the reader.
- Slightly opinionated but grounded. Never arrogant.
- Tone: curious, insightful, warm, intellectually honest.
- Typical length: 150-300 words.
- No bullet points. No em dashes.

"TO KEEP AN EYE ON" events:
- Format: Event name (Date, Location): One provocative question or observation.
- Examples: "Presidential elections in Portugal (Jan 18): How far will the far-right go?"
- Keep descriptions as questions that spark curiosity.

GENERAL RULES:
- Language: English only.
- Never use em dashes. Use commas, periods, or conjunctions.
- Never use bullet lists inside sections.
- Conversational but intellectually rigorous.
- Topics often span: geopolitics, technology (AI, space, robotics, energy), emerging markets, industrial policy, education, science, and global economics.
- Roberto frequently references: China, the U.S., Europe, Latin America, Africa, Japan, South Korea.
- He often contrasts market-driven vs state-driven approaches to economic development.`;

/**
 * OpenAI-backed AI provider with Roberto's style prompt.
 * Uses GPT-4o for section generation and event descriptions.
 */
export class OpenAIProvider implements AIProvider {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || "";
    if (!this.apiKey) {
      console.warn(
        "OpenAIProvider: OPENAI_API_KEY not set. Calls will fail."
      );
    }
  }

  async generateSection(input: GenerateSectionInput): Promise<GeneratedDraft> {
    const userPrompt = buildUserPrompt(input);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.7,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI API error:", response.status, error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("OpenAI returned empty response");
    }

    const parsed = safeParseJSON(content);

    return {
      titleOptions: parsed.titleOptions || [],
      whyItMatters: parsed.whyItMatters || "",
      myThoughts: parsed.myThoughts || "",
    };
  }

  async generateEventDescription(event: {
    title: string;
    date: string;
    location: string;
  }): Promise<string> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Write a short provocative description (1-2 sentences, written as questions) for the "To Keep An Eye On" section about this event:\n\nEvent: ${event.title}\nDate: ${event.date}\nLocation: ${event.location}\n\nReturn only the description text, no JSON.`,
          },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      return `Will ${event.title} bring any surprises? Worth watching.`;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || `Will ${event.title} bring any surprises?`;
  }

  async generateUpcomingEvents(input: {
    weekStartDate: string;
    weekEndDate: string;
    calendarContext?: string;
  }): Promise<UpcomingEvent[]> {
    let userPrompt = `Find and suggest up to 6 important geopolitical, economic, or technology events happening between ${input.weekStartDate} and ${input.weekEndDate}.

These will be used in the "To Keep An Eye On" section of Roberto's Snapshot newsletter.

Focus on events that would interest an executive/investor audience:
- Elections, referendums, political transitions
- Major international summits and conferences (G7, G20, UN, Davos, etc.)
- Central bank meetings and economic policy decisions
- Major tech/industry conferences and product launches
- Significant diplomatic meetings or treaty deadlines
- Space launches and milestones
- Important court rulings or regulatory deadlines

For each event, provide a provocative description written as 1-2 questions that spark curiosity, following Roberto's style.`;

    if (input.calendarContext) {
      userPrompt += `\n\nHere is data from the Control Risks Geopolitical Calendar for reference. Use relevant events from this data AND supplement with other important events you know about:\n\n${input.calendarContext}`;
    }

    userPrompt += `\n\nReturn a JSON object with this structure:
{
  "events": [
    {
      "title": "Event name",
      "date": "Feb 17, 2025",
      "location": "City, Country or just Country",
      "description": "Provocative question(s) about this event",
      "sourceUrl": "https://example.com/event-page"
    }
  ]
}

RULES:
- Maximum 6 events
- Dates must be formatted like "Feb 17, 2025" or "Feb 17-19, 2025" for multi-day events
- Descriptions should be provocative questions, not statements
- No em dashes
- Sort events by date
- For sourceUrl, provide a real, verifiable URL where the user can read more about the event (official event page, news article, or institutional website). If you are not confident the URL exists, omit the field.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.7,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI API error (events):", response.status, error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("OpenAI returned empty response for events");
    }

    const parsed = safeParseJSON(content);
    return (parsed.events || []).slice(0, 6);
  }
}

/**
 * Safely extract and parse JSON from an LLM response.
 * Handles cases where the model returns extra text after the JSON object,
 * or wraps it in markdown code blocks.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeParseJSON(raw: string): any {
  // First, try direct parse (fast path)
  try {
    return JSON.parse(raw);
  } catch {
    // ignore and try extraction
  }

  // Strip markdown code blocks if present
  const stripped = raw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
  try {
    return JSON.parse(stripped);
  } catch {
    // ignore and try bracket matching
  }

  // Find the outermost JSON object using bracket matching
  const start = raw.indexOf("{");
  if (start === -1) {
    throw new Error("No JSON object found in LLM response");
  }

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === "\\") {
      escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return JSON.parse(raw.substring(start, i + 1));
      }
    }
  }

  throw new Error("Could not extract valid JSON from LLM response");
}

/** Build the user prompt for section generation */
function buildUserPrompt(input: GenerateSectionInput): string {
  let prompt = `Generate a Snapshot newsletter section for this article.\n\n`;
  prompt += `URL: ${input.url}\n`;
  if (input.metaTitle) prompt += `Article title: ${input.metaTitle}\n`;
  if (input.metaDescription) prompt += `Description: ${input.metaDescription}\n`;
  if (input.toneNote) prompt += `\nRoberto's tone note (his initial reaction): "${input.toneNote}"\n`;
  if (input.audioTranscript) prompt += `\nRoberto's voice memo transcript (his spoken thoughts): "${input.audioTranscript}"\n`;

  prompt += `\nReturn a JSON object with exactly these keys:\n`;
  prompt += `- "titleOptions": array of 5 short, punchy title options (following the style examples above)\n`;
  prompt += `- "whyItMatters": the "Why it matters" section (150-250 words, analytical, macro perspective, flowing paragraphs)\n`;
  prompt += `- "myThoughts": the "My thoughts on it" section (150-300 words, personal, first person as Roberto, ends with provocative questions to the reader)\n`;
  prompt += `\nCRITICAL RULES:\n`;
  prompt += `- NEVER use em dashes (—). Use commas, periods, or "and" instead.\n`;
  prompt += `- No bullet points inside the sections.\n`;
  prompt += `- Conversational but intellectually rigorous.\n`;
  if (input.toneNote) {
    prompt += `- Incorporate Roberto's tone note naturally into "myThoughts". It reflects his genuine initial reaction.\n`;
  }
  if (input.audioTranscript) {
    prompt += `- Weave Roberto's voice memo insights naturally into "myThoughts". These are his actual spoken thoughts and should be reflected authentically.\n`;
  }

  if (input.archiveContext) {
    prompt += `\n${input.archiveContext}`;
    prompt += `\nIMPORTANT ABOUT THE ARCHIVE CONTEXT ABOVE:\n`;
    prompt += `- Use this as INTERNAL REFERENCE ONLY to maintain consistency and build on previous thinking.\n`;
    prompt += `- Do NOT explicitly mention or reference past editions.\n`;
    prompt += `- If Roberto has covered this topic before, DEEPEN the analysis, don't repeat the same points.\n`;
    prompt += `- Use prior context to inform your reasoning and ensure coherence with Roberto's established views.\n`;
  }

  return prompt;
}
