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
- Length: ONE single paragraph, 100-150 words. Never split it into several paragraphs.
- No bullet points.
- No em dashes. Use commas, periods, or "and" instead.

"MY THOUGHTS ON IT" section:
- Deeply personal, first person singular ("I").
- Personal references (travels, meetings with policymakers, conversations with investors, participation in events) are a known feature of Roberto's writing style, BUT they must ONLY appear when grounded in real data: his tone note, voice memo transcript, or archive context provided. NEVER fabricate or invent personal experiences he has not mentioned.
- Phrases like "I remember...", "I have seen...", "I have had the chance to...", "In one of my previous lives..." should only be used when the content is explicitly supported by provided context. If no personal context is available, express his analytical perspective as a VC investor (Roberto is part of Seldor Capital, a VC firm investing in space tech) without inventing experiences.
- NEVER open with "I find myself", "I find myself thinking", "I can't help but", "I can't help but wonder", or any other generic introspective opener. Begin directly with a specific observation, a bold assertion, or a grounded contextual frame.
- NEVER mention, reference, or cite Roberto's voice memo, audio recording, or transcript in the output. The transcript is invisible raw material — it informs the writing but must never appear as a source or be acknowledged in any way (no "as I mentioned in my voice note", "my recording", "the phrase I used", "as I said", etc.).
- Closes on the central question at stake. Often framed as a statement ("The fundamental question is whether..."), at most one direct question to the reader.
- Slightly opinionated but grounded. Never arrogant.
- Tone: curious, insightful, warm, intellectually honest.
- Length: ONE single paragraph, 100-150 words. Never split it into several paragraphs.
- No bullet points. No em dashes.

LENGTH AND DENSITY (learned from Roberto's own edits):
Roberto consistently cuts drafts to ONE tight paragraph per section, roughly half the length of a typical draft.
He keeps the argument's spine in order and cuts: lists of extra examples ("From Bologna to Tirana", "Chile, South Africa, Asia, the US"),
throwaway punchlines ("These aren't marginal grievances.", "We've seen it before."), strings of rhetorical questions, and any idea that repeats.

Example of a section exactly as Roberto published it:

Why it matters:
The torching of the College of Europe campus in Albania, amid wider student protests in France, Italy and across Europe, points to something deeper than isolated unrest. Young Europeans are facing high housing costs, stagnant wages, weak social mobility and persistent unemployment in parts of Southern and Eastern Europe. That makes the symbolism powerful: an institution associated with European integration and elite opportunity becoming a target of anger from a generation increasingly unsure that the system delivers. These protests matter because economic frustration rarely remains economic. It reshapes politics, weakens centrist parties and creates space for more radical alternatives.

My thoughts on it:
What strikes me is how familiar this pattern has become across very different societies: young people look at the implicit bargain, study, work hard, play by the rules and build a decent life, and conclude that it no longer works. The protests are symptoms of a deeper institutional problem. Governance systems designed for a different era are struggling to keep pace with economic dislocation, technological change, inequality and climate stress. When democracies fail to deliver opportunity and dignity, simple narratives and populist alternatives become more attractive. The fundamental question is whether our political systems can redesign the social contract fast enough to restore trust before frustration turns into rejection of the system itself.

"TO KEEP AN EYE ON" events:
- Format: Event name (Date, Location): One provocative question or observation.
- Examples: "Presidential elections in Portugal (Jan 18): How far will the far-right go?"
- Keep descriptions as questions that spark curiosity.

WRITE LIKE A HUMAN, NOT LIKE AI (Beyond "Humanizer" rules, Roberto edits these out):
- Write like a sharp operator explaining something to an intelligent peer. Calm confidence, pragmatic, slightly skeptical. No hype, no preaching, no SaaS-homepage tone.
- Be specific: numbers, names, places, concrete mechanisms, real tradeoffs, clear cause and effect. If a sentence could be pasted into any article, cut it.
- Mix short and long sentences. Vary rhythm. Never start two consecutive sentences with the same word.
- BANNED WORDS: delve, leverage, transformative, game-changing, game-changer, seamless, robust, synergy, landscape, paradigm, harness, navigate, unlock, unleash, empower, streamline, holistic, tapestry, multifaceted, nuanced, foster, cultivate, facilitate, utilize, comprehensive, elevate, realm, essentially, certainly, overall, absolutely, typically, various, crucial, essential, incredibly, significantly, pivotal, underscore, cutting-edge, innovative, revolutionary, disruptive, journey, testament.
- BANNED PHRASES: "Furthermore", "Moreover", "Additionally", "In conclusion", "It's worth noting", "It's important to note", "In today's...", "When it comes to", "At the end of the day", "The truth is", "Here's the thing", "not only... but also", "a testament to", "in the ever-evolving landscape", "will never be the same", "this changes everything", "One might argue", "It goes without saying".
- BANNED STRUCTURES:
  * Negation-contrast: "It's not X. It's Y." / "This isn't about X, it's about Y." State the positive claim directly.
  * Stacked fragments as punchlines: "More X. More Y." / "This is big." / "Game changer."
  * Self-question transitions: "Why? Because..." / "The result? ..."
  * Declarative reveal: "The skill that matters...? It's X."
  * Lists of 3+ abstract nouns for emotional weight ("creativity, passion and drive"). Use one concrete claim.
  * Closing line that just summarizes what was said, or a mic-drop one-liner.
  * Generic opening claim. Open on the specific fact, number or observation.
  * Passive voice where active is stronger. Hedging filler. Exclamation marks.

GENERAL RULES:
- Language: English only.
- Never use em dashes. Use commas, periods, or conjunctions.
- Never use bullet lists inside sections.
- Conversational but intellectually rigorous.
- Topics often span: geopolitics, technology (AI, space, robotics, energy), emerging markets, industrial policy, education, science, and global economics.
- Roberto frequently references: China, the U.S., Europe, Latin America, Africa, Japan, South Korea.
- He often contrasts market-driven vs state-driven approaches to economic development.`;

/** Roberto publishes each section as ONE paragraph. Safety net if the model splits it. */
function toSingleParagraph(text: string): string {
  return text.replace(/\s*\n+\s*/g, " ").replace(/ {2,}/g, " ").trim();
}

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
      whyItMatters: toSingleParagraph(parsed.whyItMatters || ""),
      myThoughts: toSingleParagraph(parsed.myThoughts || ""),
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
          tools: [{ type: "web_search_preview" }],
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
  const hasMultipleSources = input.additionalSources && input.additionalSources.length > 0;
  let prompt = `Generate a Snapshot newsletter section for this subject.\n\n`;

  if (hasMultipleSources) {
    prompt += `PRIMARY SOURCE:\n`;
  }
  prompt += `URL: ${input.url}\n`;
  if (input.metaTitle) prompt += `Article title: ${input.metaTitle}\n`;
  if (input.metaDescription) prompt += `Description: ${input.metaDescription}\n`;

  if (hasMultipleSources) {
    prompt += `\nADDITIONAL SOURCES (same subject, use all for context):\n`;
    for (const src of input.additionalSources!) {
      prompt += `- URL: ${src.url}\n`;
      if (src.metaTitle) prompt += `  Title: ${src.metaTitle}\n`;
      if (src.metaDescription) prompt += `  Description: ${src.metaDescription}\n`;
    }
    prompt += `\n`;
  }

  if (input.toneNote) prompt += `\nRoberto's tone note (his initial reaction): "${input.toneNote}"\n`;
  if (input.audioTranscript) prompt += `\nRoberto's voice memo (invisible raw material — ideas to absorb, NOT to cite): "${input.audioTranscript}"\n`;

  prompt += `\nReturn a JSON object with exactly these keys:\n`;
  prompt += `- "titleOptions": array of 5 short, punchy title options (following the style examples above)\n`;
  prompt += `- "whyItMatters": the "Why it matters" section (ONE single paragraph, 100-150 words, analytical, macro perspective, no line breaks)\n`;
  prompt += `- "myThoughts": the "My thoughts on it" section (ONE single paragraph, 100-150 words, personal, first person as Roberto, closes on the central question at stake, no line breaks)\n`;
  prompt += `\nCRITICAL RULES:\n`;
  prompt += `- NEVER use em dashes (—). Use commas, periods, or "and" instead.\n`;
  prompt += `- No bullet points inside the sections.\n`;
  prompt += `- Conversational but intellectually rigorous.\n`;
  prompt += `- Follow the "WRITE LIKE A HUMAN, NOT LIKE AI" rules strictly: no banned words, phrases or structures.\n`;
  prompt += `- In "myThoughts": NEVER invent or fabricate personal experiences for Roberto (travels, events attended, meetings, conversations). Only reference a specific personal experience if it is explicitly mentioned in his tone note, voice memo transcript, or archive context. When no personal context is available, express his perspective as a VC investor analytically without inventing anecdotes.\n`;
  if (input.toneNote) {
    prompt += `- Incorporate Roberto's tone note naturally into "myThoughts". It reflects his genuine initial reaction.\n`;
  }
  if (input.audioTranscript) {
    prompt += `- Absorb the ideas and feelings from Roberto's voice memo and express them naturally in "myThoughts" as if they occurred to him in the moment. NEVER mention the voice memo, recording, transcript, or audio in any way. NEVER write phrases like "as I mentioned", "my voice note", "as I recorded", "the phrase I used", or anything that acknowledges the transcript as a source. It is invisible raw material only.\n`;
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
