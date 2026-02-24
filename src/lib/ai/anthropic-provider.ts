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
 * Anthropic Claude-backed AI provider with Roberto's style prompt.
 * Uses Claude Sonnet for section generation and event descriptions.
 */
export class AnthropicProvider implements AIProvider {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || "";
    if (!this.apiKey) {
      console.warn(
        "AnthropicProvider: ANTHROPIC_API_KEY not set. Calls will fail."
      );
    }
  }

  private async callClaude(
    userMessage: string,
    options?: { maxTokens?: number; jsonMode?: boolean }
  ): Promise<string> {
    const maxTokens = options?.maxTokens || 4096;

    const body: Record<string, unknown> = {
      model: "claude-sonnet-4-5-20250929",
      max_tokens: maxTokens,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    };

    // Claude doesn't have a "json mode" toggle like OpenAI,
    // but we instruct it in the prompt and it reliably returns JSON.
    // We can add prefill to nudge JSON output.
    if (options?.jsonMode) {
      body.messages = [
        { role: "user", content: userMessage },
        { role: "assistant", content: "{" },
      ];
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Anthropic API error:", response.status, error);
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      throw new Error("Claude returned empty response");
    }

    // If we used prefill with "{", prepend it back
    if (options?.jsonMode) {
      return "{" + content;
    }

    return content;
  }

  async generateSection(input: GenerateSectionInput): Promise<GeneratedDraft> {
    const userPrompt = buildUserPrompt(input);
    const content = await this.callClaude(userPrompt, { jsonMode: true });

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
    try {
      const content = await this.callClaude(
        `Write a short provocative description (1-2 sentences, written as questions) for the "To Keep An Eye On" section about this event:\n\nEvent: ${event.title}\nDate: ${event.date}\nLocation: ${event.location}\n\nReturn only the description text, no JSON.`,
        { maxTokens: 256 }
      );
      return content.trim();
    } catch {
      return `Will ${event.title} bring any surprises? Worth watching.`;
    }
  }

  async generateUpcomingEvents(input: {
    weekStartDate: string;
    weekEndDate: string;
    calendarContext?: string;
  }): Promise<UpcomingEvent[]> {
    // Use OpenAI Responses API with web search for real-time event discovery
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      console.warn("OPENAI_API_KEY not set, falling back to Claude for events.");
      return this.generateUpcomingEventsFallback(input);
    }

    let prompt = `Search the web and find up to 6 important geopolitical, economic, or technology events happening between ${input.weekStartDate} and ${input.weekEndDate}.

Focus on events that would interest an executive/investor audience:
- Elections, referendums, political transitions
- Major international summits and conferences (G7, G20, UN, Davos, etc.)
- Central bank meetings and economic policy decisions
- Major tech/industry conferences and product launches
- Significant diplomatic meetings or treaty deadlines
- Space launches and milestones
- Important court rulings or regulatory deadlines

Also check the Control Risks geopolitical calendar at https://www.controlrisks.com/our-thinking/geopolitical-calendar for relevant events in this date range.`;

    if (input.calendarContext) {
      prompt += `\n\nAdditional calendar context:\n${input.calendarContext}`;
    }

    prompt += `\n\nFor each event, write a provocative description as 1-2 questions that spark curiosity. Example style: "Presidential elections in Portugal (Jan 18): How far will the far-right go?"

Return a JSON object with this structure:
{
  "events": [
    {
      "title": "Event name",
      "date": "Feb 17, 2025",
      "location": "City, Country or just Country",
      "description": "Provocative question(s) about this event",
      "sourceUrl": "https://real-source-url.com/article"
    }
  ]
}

RULES:
- Maximum 6 events
- Dates must be formatted like "Feb 17, 2025" or "Feb 17-19, 2025" for multi-day events
- Descriptions should be provocative questions, not statements
- No em dashes (use commas or periods instead)
- Sort events by date
- sourceUrl MUST be a real URL from your web search results where the user can verify the event. Every event must have a sourceUrl.
- Return ONLY the JSON object, no other text.`;

    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          tools: [{ type: "web_search" }],
          input: prompt,
        }),
        signal: AbortSignal.timeout(90000),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("OpenAI web search API error:", response.status, error);
        return this.generateUpcomingEventsFallback(input);
      }

      const data = await response.json();

      // Extract text from the response output
      let text = "";
      for (const item of data.output || []) {
        if (item.type === "message") {
          for (const block of item.content || []) {
            if (block.type === "output_text") {
              text += block.text;
            }
          }
        }
      }

      if (!text) {
        console.error("OpenAI web search returned no text content");
        return this.generateUpcomingEventsFallback(input);
      }

      // Extract JSON from the response (might be wrapped in markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*"events"[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("Could not extract JSON from web search response:", text.substring(0, 500));
        return this.generateUpcomingEventsFallback(input);
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return (parsed.events || []).slice(0, 6);
    } catch (e) {
      console.error("Web search events failed:", e);
      return this.generateUpcomingEventsFallback(input);
    }
  }

  /** Fallback: use Claude without web search if OpenAI is unavailable */
  private async generateUpcomingEventsFallback(input: {
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

For each event, provide a provocative description written as 1-2 questions that spark curiosity.`;

    if (input.calendarContext) {
      userPrompt += `\n\nHere is data from the Control Risks Geopolitical Calendar for reference:\n\n${input.calendarContext}`;
    }

    userPrompt += `\n\nReturn a JSON object with this structure:
{
  "events": [
    {
      "title": "Event name",
      "date": "Feb 17, 2025",
      "location": "City, Country or just Country",
      "description": "Provocative question(s) about this event"
    }
  ]
}

RULES:
- Maximum 6 events
- Sort events by date
- No em dashes`;

    const content = await this.callClaude(userPrompt, { jsonMode: true });
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
    prompt += `- Do NOT explicitly mention or reference past editions (e.g., never say "as I wrote before" or "in a previous Snapshot").\n`;
    prompt += `- If Roberto has covered this topic before, DEEPEN the analysis, don't repeat the same points.\n`;
    prompt += `- Use prior context to inform your reasoning and ensure coherence with Roberto's established views.\n`;
    prompt += `- If Roberto previously took a position on this topic, maintain or thoughtfully evolve that position.\n`;
  }

  return prompt;
}
