"use server";

import { prisma } from "@/lib/db";
import { addLink } from "@/lib/actions/links";
import type { BrainDumpCard, OpenIssue } from "@/types/index";

// ─── Editorial DNA (Roberto's content scope) ────────────────────────────────

const EDITORIAL_DNA = `
ABOUT THE NEWSLETTER:
Weekly Snapshot is an intellectually serious, globally-minded newsletter that connects emerging scientific and technological developments with strategic, geopolitical, and economic consequences. Written for sophisticated readers — investors, executives, policymakers, and curious global citizens — who want to understand not just WHAT is happening, but WHY IT MATTERS and WHAT COMES NEXT.

TOPICS TO MONITOR (in priority order):
1. Artificial Intelligence — foundation models, regulation, AI in science, infrastructure, sovereignty, safety, democratization, disinformation
2. Robotics & Physical Computing — humanoid robots, industrial automation, eVTOLs, drones, brain-computer interfaces
3. Semiconductors & Deep Hardware — chip war (US-China-Taiwan), advanced architectures, TSMC/Intel/ASML, quantum computing
4. Space & Satellite Economy — SpaceX/Starlink, satellite geopolitics, lunar/Martian ambitions, commercial applications
5. Biotechnology & Life Sciences — genomics, CRISPR, longevity, regenerative medicine, AI drug discovery, biosecurity
6. Energy Transition & Climate — EVs, nuclear (fission+fusion), renewables, carbon capture, critical minerals
7. Geopolitics & Strategic Competition — US-China tech war, China's global expansion, Europe's competitiveness, BRICS, emerging markets
8. Venture Capital & Deep Tech Finance — frontier tech funding, sovereign wealth funds, innovation ecosystems
9. Environment & Resources — rare earths, water scarcity, biodiversity, food security
10. Digital Infrastructure — 5G/6G, cybersecurity, cloud, crypto/CBDCs

EDITORIAL FILTER (apply to every story):
- Why does this matter STRATEGICALLY? Second and third-order effects on power, markets, sovereignty, society.
- Who wins and who loses? Always look for the competitive or geopolitical dimension.
- Is this a signal or noise? Prioritize structural shifts, not one-off announcements.
- Global lens required — not just US/Silicon Valley. China, India, Europe, Africa, Latin America must be represented.
- Science meets strategy — bridge peer-reviewed research and real-world implications.

PREFERRED SOURCES (Tier 1):
South China Morning Post, Nature, Financial Times, TechCrunch, Nikkei Asia, MIT Technology Review, Al Jazeera, Bloomberg, IEEE Spectrum, PubMed/NIH

PREFERRED SOURCES (Tier 2):
Reuters, New York Times, The Economist, CNN International, Interesting Engineering, Space.com, Atlantic Council, Washington Post

EXCLUDE:
- Pure financial market updates (stock prices, earnings) unless they signal a structural shift
- Celebrity or lifestyle tech (gadget reviews, consumer apps)
- US domestic political news unless it has significant global tech/economic implications
- Opinion pieces with no factual news anchor

TONE: Intellectually curious, never sensationalist. Global and multipolar. Analytically honest. Forward-looking.
`.trim();

// ─── Edition window: last Sunday → next Saturday ─────────────────────────────

function getEditionWindow(): { start: Date; end: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday

  // Last Sunday (or today if today is Sunday)
  const start = new Date(now);
  start.setDate(now.getDate() - dayOfWeek);
  start.setHours(0, 0, 0, 0);

  // Next Saturday
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function formatDateLong(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Fetch cards using GPT-4o web search ─────────────────────────────────────

export async function fetchBrainDumpCards(): Promise<BrainDumpCard[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const { start, end } = getEditionWindow();
  const startStr = formatDateLong(start);
  const endStr = formatDateLong(end);

  const prompt = `Today is ${today}.

You are a specialized research assistant for Weekly Snapshot, a weekly newsletter written by Roberto.

Your task: Search the web to find 12 to 15 of the most relevant, insightful, and timely news stories. Apply the editorial DNA below to filter and frame each story.

STRICT DATE REQUIREMENT — THIS IS CRITICAL:
Only include stories published between ${startStr} and ${endStr}.
Do NOT include any story published before ${startStr}.
If you cannot confirm a story was published within this exact date range, exclude it.
Every story must be from this current week's edition window only.

${EDITORIAL_DNA}

INSTRUCTIONS:
- Search for real, recent stories published between ${startStr} and ${endStr} ONLY
- Cover at least 5 different topic areas from the list above
- Prioritize Tier 1 sources when available
- Include at least 2 stories from non-Western perspectives (China, India, Southeast Asia, Africa, Latin America, Middle East)
- All output must be in English
- For each story, generate a Roberto-style title (declarative, provocative, or forward-looking — never generic)

Return ONLY a valid JSON array (no markdown, no explanation, no code blocks) with exactly this structure for each item:
[
  {
    "id": "unique-slug-from-title",
    "title": "Roberto-style punchy headline",
    "source": "Publication Name",
    "url": "https://actual-article-url.com",
    "publishedAt": "X days ago",
    "topic": "Primary topic (e.g. AI, Geopolitics, Energy, Biotech, Semiconductors, Space, Robotics, Climate, Finance)",
    "whyItMatters": "2-3 sentences on the strategic or global significance — not just what happened, but what it signals.",
    "robertosAngle": "1-2 sentences on how Roberto would frame this — geopolitical lens, competitive dynamics, or civilizational implication.",
    "keyFacts": ["Specific fact 1", "Specific fact 2", "Specific fact 3"],
    "topicTags": ["Tag1", "Tag2", "Tag3"]
  }
]`;

  // Call OpenAI API with web_search_preview tool
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      tools: [{ type: "web_search_preview" }],
      tool_choice: "required",
      input: prompt,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} — ${error}`);
  }

  const data = await response.json();

  // Extract the text output from the response
  let rawText = "";
  if (data.output && Array.isArray(data.output)) {
    for (const item of data.output) {
      if (item.type === "message" && item.content) {
        for (const block of item.content) {
          if (block.type === "output_text") {
            rawText += block.text;
          }
        }
      }
    }
  }

  if (!rawText) {
    throw new Error("No text output from OpenAI API");
  }

  // Parse JSON — strip any markdown fences if present
  const jsonMatch = rawText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error(`Could not find JSON array in response: ${rawText.slice(0, 500)}`);
  }

  let jsonStr = jsonMatch[0];

  // Sanitize common GPT-4o JSON issues:
  // 1. Replace curly/smart quotes with straight quotes
  jsonStr = jsonStr
    .replace(/[\u2018\u2019]/g, "'")   // ' '  → '
    .replace(/[\u201C\u201D]/g, '"')   // " "  → "
    .replace(/[\u2013\u2014]/g, "-");  // – —  → -

  // 2. Try parsing; if it fails, extract as many valid cards as possible
  let cards: BrainDumpCard[];
  try {
    cards = JSON.parse(jsonStr);
  } catch {
    // Attempt to salvage individual objects from a truncated/broken array
    const objectMatches = jsonStr.match(/\{[\s\S]*?\}(?=\s*[,\]])/g);
    if (!objectMatches || objectMatches.length === 0) {
      throw new Error(`JSON parse failed and no salvageable objects found. Raw: ${jsonStr.slice(0, 500)}`);
    }
    cards = [];
    for (const obj of objectMatches) {
      try {
        cards.push(JSON.parse(obj));
      } catch {
        // skip broken object
      }
    }
    if (cards.length === 0) {
      throw new Error("Could not parse any cards from GPT-4o response");
    }
  }

  // Ensure all cards have valid IDs
  return cards.map((card, i) => ({
    ...card,
    id: card.id || slugify(card.title) || `card-${i}`,
  }));
}

// ─── Add a card's URL to an edition as a link ───────────────────────────────

export async function addCardToEdition(
  cardUrl: string,
  issueId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await addLink(issueId, cardUrl);
    return { success: true };
  } catch (err) {
    console.error("Failed to add card to edition:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ─── Get all open (non-completed) issues ────────────────────────────────────

export async function getOpenIssues(): Promise<OpenIssue[]> {
  const issues = await prisma.issue.findMany({
    orderBy: { publishDate: "asc" },
    where: {
      // Exclude issues that have been fully completed (have an export)
      exports: { none: {} },
    },
    select: {
      id: true,
      title: true,
      publishDate: true,
    },
  });

  return issues.map((issue) => ({
    id: issue.id,
    title: issue.title,
    publishDate: issue.publishDate
      ? issue.publishDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : null,
  }));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}
