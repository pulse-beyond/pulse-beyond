"use server";

import { prisma } from "@/lib/db";
import { addLink } from "@/lib/actions/links";
import { revalidatePath } from "next/cache";
import type { BrainDumpCard, BrainDumpTopic, BrainDumpConfig, OpenIssue } from "@/types/index";
import { cardBucket, isAICard, isAITopic } from "@/lib/topics";

// ─── Default topics (used until Roberto customizes them in the Topics tab) ───
// Order carries NO priority — the prompt treats every topic as equally important.

const DEFAULT_TOPICS: BrainDumpTopic[] = [
  { name: "Artificial Intelligence", description: "foundation models, regulation, AI in science, infrastructure, sovereignty, safety, democratization, disinformation" },
  { name: "Robotics & Physical Computing", description: "humanoid robots, industrial automation, eVTOLs, drones, brain-computer interfaces" },
  { name: "Semiconductors & Deep Hardware", description: "chip war (US-China-Taiwan), advanced architectures, TSMC/Intel/ASML, quantum computing" },
  { name: "Space & Satellite Economy", description: "SpaceX/Starlink, satellite geopolitics, lunar/Martian ambitions, commercial applications" },
  { name: "Biotechnology & Life Sciences", description: "genomics, CRISPR, longevity, regenerative medicine, AI drug discovery, biosecurity" },
  { name: "Energy Transition & Climate", description: "EVs, nuclear (fission+fusion), renewables, carbon capture, critical minerals" },
  { name: "Geopolitics & Strategic Competition", description: "US-China tech war, China's global expansion, Europe's competitiveness, BRICS, emerging markets" },
  { name: "Venture Capital & Deep Tech Finance", description: "frontier tech funding, sovereign wealth funds, innovation ecosystems" },
  { name: "Environment & Resources", description: "rare earths, water scarcity, biodiversity, food security" },
  { name: "Digital Infrastructure", description: "5G/6G, cybersecurity, cloud, crypto/CBDCs" },
];

const DEFAULT_MAX_PER_TOPIC = 3;

// ─── Editorial DNA (Roberto's content scope) ────────────────────────────────
// The topics block is built from the editable config; everything else is fixed.

function buildEditorialDNA(topics: BrainDumpTopic[]): string {
  const topicList = topics
    .map((t) => `- ${t.name}${t.description ? ` — ${t.description}` : ""}`)
    .join("\n");

  return `
ABOUT THE NEWSLETTER:
Weekly Snapshot is an intellectually serious, globally-minded newsletter that connects emerging scientific and technological developments with strategic, geopolitical, and economic consequences. Written for sophisticated readers — investors, executives, policymakers, and curious global citizens — who want to understand not just WHAT is happening, but WHY IT MATTERS and WHAT COMES NEXT.

TOPICS TO MONITOR (no particular order — treat every topic as equally important):
${topicList}

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
- Wikipedia, Wikimedia, wikis, or any crowd-sourced reference content
- Press releases or company blog posts without independent editorial coverage

TONE: Intellectually curious, never sensationalist. Global and multipolar. Analytically honest. Forward-looking.
`.trim();
}

// ─── Config: read & write the editable topics ────────────────────────────────

/** Read the Brain Dump config, falling back to defaults when none is saved yet. */
export async function getBrainDumpConfig(): Promise<BrainDumpConfig> {
  const row = await prisma.brainDumpConfig.findUnique({ where: { id: "singleton" } });
  if (!row) {
    return { topics: DEFAULT_TOPICS, maxPerTopic: DEFAULT_MAX_PER_TOPIC };
  }
  let topics: BrainDumpTopic[];
  try {
    topics = JSON.parse(row.topics) as BrainDumpTopic[];
  } catch {
    topics = DEFAULT_TOPICS;
  }
  if (!Array.isArray(topics) || topics.length === 0) topics = DEFAULT_TOPICS;
  return { topics, maxPerTopic: row.maxPerTopic };
}

/** Persist the editable topics + per-topic cap. */
export async function saveBrainDumpConfig(
  config: BrainDumpConfig
): Promise<{ success: boolean; error?: string }> {
  // Sanitize: drop empty topics, trim fields, clamp the cap to a sane range.
  const topics = (config.topics ?? [])
    .map((t) => ({ name: (t.name ?? "").trim(), description: (t.description ?? "").trim() }))
    .filter((t) => t.name.length > 0);

  if (topics.length === 0) {
    return { success: false, error: "Add at least one topic before saving." };
  }

  const maxPerTopic = Math.min(15, Math.max(1, Math.round(config.maxPerTopic || DEFAULT_MAX_PER_TOPIC)));

  try {
    const payload = JSON.stringify(topics);
    await prisma.brainDumpConfig.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", topics: payload, maxPerTopic },
      update: { topics: payload, maxPerTopic },
    });
    revalidatePath("/brain-dump");
    return { success: true };
  } catch (err) {
    console.error("Failed to save Brain Dump config:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// ─── Edition window: last Friday → next Thursday ─────────────────────────────
// Editions ship on Friday (default), so the 7-day window leading up to (and ending the day
// before) the next Friday is what feeds the upcoming edition.

function getEditionWindowForDate(date: Date): { start: Date; end: Date } {
  const dayOfWeek = date.getDay(); // 0=Sun, 5=Fri
  // Distance back to the most recent Friday (0 if today is Friday).
  const daysSinceLastFriday = dayOfWeek >= 5 ? dayOfWeek - 5 : dayOfWeek + 2;
  const start = new Date(date);
  start.setDate(date.getDate() - daysSinceLastFriday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function getEditionWindow(): { start: Date; end: Date } {
  return getEditionWindowForDate(new Date());
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
// Diversity strategy (Nov 2026 fix — Roberto saw almost only AI stories even with
// the AI filter unchecked). Real cache showed 9/12 cards were about AI but labelled
// "Digital Infrastructure", "Venture Capital"… Two causes, two fixes:
//  1. Supply: a single search over 15 topics drifts to whatever dominates the news
//     (AI). We now run one search per topic GROUP in parallel; non-AI groups are
//     forbidden from returning AI-centric stories, so every area gets real slots.
//  2. Labelling: GPT tagged stories by angle, not subject. Each card now carries
//     `aiCentric` and the primary topic must be what the story is ABOUT; the client
//     filter and the per-topic cap treat any AI-centric card as AI (see topics.ts).

const TOPICS_PER_GROUP = 4;
// Ask for more than we show: roughly half of GPT-4o's links fail verification and are dropped.
const STORIES_PER_GROUP = 8;

function groupTopics(topics: BrainDumpTopic[]): { topics: BrainDumpTopic[]; isAI: boolean }[] {
  const ai = topics.filter((t) => isAITopic(t.name));
  const rest = topics.filter((t) => !isAITopic(t.name));
  const groups: { topics: BrainDumpTopic[]; isAI: boolean }[] = [];
  if (ai.length) groups.push({ topics: ai, isAI: true });
  for (let i = 0; i < rest.length; i += TOPICS_PER_GROUP) {
    groups.push({ topics: rest.slice(i, i + TOPICS_PER_GROUP), isAI: false });
  }
  return groups;
}

function buildSearchPrompt(opts: {
  today: string;
  startStr: string;
  endStr: string;
  groupTopics: BrainDumpTopic[];
  allTopics: BrainDumpTopic[];
  isAIGroup: boolean;
  count: number;
}): string {
  const { today, startStr, endStr, groupTopics, allTopics, isAIGroup, count } = opts;
  const focusList = groupTopics
    .map((t) => `- ${t.name}${t.description ? ` — ${t.description}` : ""}`)
    .join("\n");

  const aiRule = isAIGroup
    ? ""
    : `
NO AI STORIES IN THIS SEARCH — THIS IS CRITICAL:
Artificial intelligence is covered by a separate search. Do NOT return any story whose main subject is AI
(AI models, AI companies, AI investment/stocks, AI data centers, AI chips, AI regulation, AI adoption, etc.).
A story qualifies only if it would still be the same story with every mention of AI removed.
Prefer fewer stories over AI stories.
`;

  return `Today is ${today}.

You are a specialized research assistant for Weekly Snapshot, a weekly newsletter written by Roberto.

Your task: Search the web to find up to ${count} of the most relevant, insightful, and timely news stories
in THESE FOCUS TOPICS (spread across them — don't pick them all from one):
${focusList}

STRICT DATE REQUIREMENT — THIS IS CRITICAL:
Only include stories published between ${startStr} and ${endStr}.
If you cannot confirm a story was published within this exact date range, exclude it.
${aiRule}
${buildEditorialDNA(allTopics)}

HOW TO SEARCH:
- Run several SHORT, separate web searches, at least one per focus topic, each 3-8 words plus the month,
  e.g. "fusion energy news November 2026", "sovereign wealth fund deep tech investment this week".
- Never paste these instructions into the search box.

LINKS — THIS IS CRITICAL:
- "url" must be copied EXACTLY from a page your web search returned. Never type, guess, reconstruct or
  "clean up" a URL from memory. Any URL that is not in your search results is discarded automatically.
- The url must be the article itself, not a section, category, tag or home page.
- Only report what the article actually says. Do not present old events (e.g. a bank founded years ago) as new.
- Returning 2 real stories is far better than 5 with invented links.

TOPIC FIT — THIS IS CRITICAL:
- Every story must clearly fall under one focus topic AS DESCRIBED above (its sub-themes), not merely touch the topic's name.
- It must pass the editorial filter: a strategic signal with consequences beyond the story itself.
- Skip local curiosities, single product launches or redesigns, a single species found somewhere, routine corporate news,
  lifestyle pieces and listicles — unless the article itself shows a structural shift.
- Fewer stories that fit beat more stories that don't.

INSTRUCTIONS:
- Search for real, recent stories published between ${startStr} and ${endStr} ONLY
- Prioritize Tier 1 sources when available
- Favor non-Western perspectives where possible (China, India, Southeast Asia, Africa, Latin America, Middle East)
- All output must be in English
- For each story, generate a Roberto-style title (declarative, provocative, or forward-looking — never generic)
- "topic" must be the topic the story is fundamentally ABOUT (its subject), not the angle it touches.
  Use the exact name of one of the focus topics above.
- "aiCentric" is true if the story's main subject is artificial intelligence, false otherwise.

Return ONLY a valid JSON array (no markdown, no explanation, no code blocks) with exactly this structure for each item:
[
  {
    "id": "unique-slug-from-title",
    "title": "Roberto-style punchy headline",
    "source": "Publication Name",
    "url": "https://actual-article-url.com",
    "publishedAt": "X days ago",
    "topic": "Exact focus topic name",
    "aiCentric": false,
    "whyItMatters": "2-3 sentences on the strategic or global significance — not just what happened, but what it signals.",
    "robertosAngle": "1-2 sentences on how Roberto would frame this — geopolitical lens, competitive dynamics, or civilizational implication.",
    "keyFacts": ["Specific fact 1", "Specific fact 2", "Specific fact 3"],
    "topicTags": ["Tag1", "Tag2", "Tag3"]
  }
]`;
}

/** One web-search call → parsed cards. */
/** Normalize a URL for comparison: no protocol, www, query, hash or trailing slash. */
function normalizeUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    return (u.hostname.replace(/^www\./, "") + u.pathname.replace(/\/+$/, "")).toLowerCase();
  } catch {
    return null;
  }
}

/** Section/home pages ("/category/renewables", "/") are not articles.
 *  `inSearchResults`: the URL came back from the web search itself, so a shorter slug
 *  (3+ words, e.g. spectrum.ieee.org/china-chip-export-controls) is accepted. URLs only
 *  confirmed by a live GET keep the strict rule. 2-word hubs ("/fusion-energy/") fail both. */
function looksLikeArticle(raw: string, inSearchResults = false): boolean {
  try {
    const u = new URL(raw);
    const segs = u.pathname.split("/").filter(Boolean);
    if (segs.length === 0) return false;
    if (/^(category|categories|tag|tags|topic|topics|section|archive|search)$/i.test(segs[0])) return false;
    if (segs.join("/").length < 12) return false;
    // Hub pages end in a short slug ("/fusion-energy/", "/policy/fusion-industry-highlights/");
    // articles end in a long slug or carry an id/date number somewhere in the path.
    const last = segs[segs.length - 1].replace(/\.(html?|php|aspx?)$/i, "");
    const words = last.split(/[-_]+/).filter(Boolean).length;
    const hasId = /\d{4,}/.test(u.pathname); // id or date anywhere in the path
    if (inSearchResults && words >= 3) return true;
    return words >= 5 || hasId || (words >= 3 && segs.length >= 3);
  } catch {
    return false;
  }
}

/** A /YYYY/MM/(DD/) path older than the search window means an old story. */
function urlDateTooOld(raw: string, start: Date): boolean {
  const m = raw.match(/\/(20\d{2})[/-](\d{1,2})(?:[/-](\d{1,2}))?(?:[/-]|$)/);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return false;
  const day = m[3] ? Number(m[3]) : 28; // month-only paths: give the benefit of the doubt
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getTime() < start.getTime() - 2 * 86_400_000;
}

/** "2 weeks ago", "3 months ago", "last year"... is outside a weekly window. */
function publishedTooLongAgo(publishedAt: string | undefined): boolean {
  if (!publishedAt) return false;
  const p = publishedAt.toLowerCase();
  if (/\b(month|months|year|years)\b/.test(p)) return true;
  const weeks = p.match(/(\d+)\s*weeks?/);
  if (weeks && Number(weeks[1]) >= 2) return true;
  const days = p.match(/(\d+)\s*days?/);
  return !!days && Number(days[1]) > 10;
}

/**
 * Does the page exist? A plain GET (no disguise): 200 on an article-like final URL.
 * Publishers return a real 404 for invented slugs; anything we can't confirm is dropped.
 */
async function urlResolves(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SnapshotBuilder/1.0)" },
      signal: AbortSignal.timeout(6000),
    });
    res.body?.cancel().catch(() => {});
    return res.ok && looksLikeArticle(res.url || url);
  } catch {
    return false;
  }
}

/**
 * GPT-4o writes the JSON itself and routinely invents plausible URLs from memory
 * (e.g. nature.com/articles/fusion-energy-breakthrough-2026, an Al Jazeera "BRICS
 * founds a development bank" story that 404s) even with web search on.
 * A card survives only if its URL is one the search returned, or (the API's source
 * list is incomplete) the page actually exists.
 */
async function keepVerifiedCards(
  cards: BrainDumpCard[],
  searchedUrls: Set<string>,
  start: Date
): Promise<BrainDumpCard[]> {
  const checked = await Promise.all(
    cards.map(async (card) => {
      const norm = card.url ? normalizeUrl(card.url) : null;
      const inSearch = !!norm && searchedUrls.has(norm);
      let reason: string | null = !norm
        ? "bad url"
        : !looksLikeArticle(card.url, inSearch)
        ? "not an article page"
        : urlDateTooOld(card.url, start) || publishedTooLongAgo(card.publishedAt)
        ? "old story"
        : null;
      if (!reason && !inSearch && !(await urlResolves(card.url))) {
        reason = "url not found in search results and does not resolve (invented)";
      }
      if (reason) {
        console.warn(`[brain-dump] dropped card (${reason}): ${card.url}`);
        return null;
      }
      // Strip OpenAI's tracking param so the saved link is the clean article URL.
      try {
        const u = new URL(card.url);
        u.searchParams.delete("utm_source");
        card.url = u.toString();
      } catch {}
      card.verified = true;
      return card;
    })
  );
  return checked.filter((c): c is BrainDumpCard => c !== null);
}

/** GPT's JSON (especially objects salvaged from a broken array) can miss fields or use
 *  the wrong types; a card missing `source`/`topicTags` used to crash the whole feed. */
function normalizeCard(raw: unknown): BrainDumpCard | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const strArr = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "") : [];
  const url = str(r.url);
  const title = str(r.title);
  if (!url || !title) return null;
  return {
    id: str(r.id),
    title,
    source: str(r.source),
    url,
    publishedAt: str(r.publishedAt),
    topic: str(r.topic),
    aiCentric: typeof r.aiCentric === "boolean" ? r.aiCentric : undefined,
    whyItMatters: str(r.whyItMatters),
    robertosAngle: str(r.robertosAngle),
    keyFacts: strArr(r.keyFacts),
    topicTags: strArr(r.topicTags),
  };
}

/** Per-call cap on one web-search request, so one hung group can't eat the whole refresh. */
const SEARCH_TIMEOUT_MS = 90_000;

async function searchCards(apiKey: string, prompt: string, start: Date): Promise<BrainDumpCard[]> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      tools: [{ type: "web_search_preview" }],
      tool_choice: "required",
      // Return every page the search tool actually fetched, so we can verify URLs.
      include: ["web_search_call.action.sources"],
      input: prompt,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} — ${error}`);
  }

  const data = await response.json();

  let rawText = "";
  const searchedUrls = new Set<string>();
  const addUrl = (u: unknown) => {
    const n = typeof u === "string" ? normalizeUrl(u) : null;
    if (n) searchedUrls.add(n);
  };
  if (data.output && Array.isArray(data.output)) {
    for (const item of data.output) {
      if (item.type === "web_search_call") {
        for (const src of item.action?.sources ?? []) addUrl(src?.url);
      }
      if (item.type === "message" && item.content) {
        for (const block of item.content) {
          if (block.type === "output_text") rawText += block.text;
          for (const ann of block.annotations ?? []) {
            if (ann?.type === "url_citation") addUrl(ann.url);
          }
        }
      }
    }
  }
  if (!rawText) throw new Error("No text output from OpenAI API");

  const jsonMatch = rawText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    // A group with nothing qualifying may legitimately answer "[]"-less prose.
    console.warn("[brain-dump] no JSON array in response:", rawText.slice(0, 300));
    return [];
  }

  // Sanitize common GPT-4o JSON issues (smart quotes, dashes).
  const jsonStr = jsonMatch[0]
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-");

  let parsed: unknown[];
  try {
    const p = JSON.parse(jsonStr);
    parsed = Array.isArray(p) ? p : [];
  } catch {
    // Salvage individual objects from a truncated/broken array.
    const objectMatches = jsonStr.match(/\{[\s\S]*?\}(?=\s*[,\]])/g) ?? [];
    const cards: unknown[] = [];
    for (const obj of objectMatches) {
      try {
        cards.push(JSON.parse(obj));
      } catch {
        // skip broken object
      }
    }
    if (cards.length === 0) {
      throw new Error(`JSON parse failed. Raw: ${jsonStr.slice(0, 300)}`);
    }
    parsed = cards;
  }
  const normalized = parsed
    .map(normalizeCard)
    .filter((c): c is BrainDumpCard => c !== null);
  return keepVerifiedCards(normalized, searchedUrls, start);
}

// ─── Relevance gate ──────────────────────────────────────────────────────────
// Real links aren't enough: the search also returns real-but-trivial stories
// (a wetsuit redesign, an orchid found in one park). Score each card 1-5 for fit
// with Roberto's topics + editorial filter; keep RELEVANCE_MIN and up.

const RELEVANCE_MIN = 3;

async function keepRelevantCards(
  apiKey: string,
  cards: BrainDumpCard[],
  topics: BrainDumpTopic[]
): Promise<BrainDumpCard[]> {
  if (cards.length === 0) return cards;
  const topicList = topics.map((t) => `- ${t.name}: ${t.description}`).join("\n");
  const items = cards
    .map((c, i) => `${i}. [${c.topic}] ${c.title} (${c.source}) — ${c.whyItMatters ?? ""}`)
    .join("\n");
  const prompt = `You curate stories for Weekly Snapshot, a strategic newsletter for investors, executives and policymakers
about science and technology and their geopolitical and economic consequences.

The editor's topics (a story must fit one AS DESCRIBED):
${topicList}

Score each story from 1 to 5:
5 = squarely in a topic, clear strategic signal (power, markets, sovereignty, structural shift)
4 = fits a topic well, meaningful consequences
3 = fits a topic, modest but real significance
2 = loosely related, or trivial (local curiosity, single product or redesign, routine corporate news, lifestyle)
1 = off-topic

Stories:
${items}

Return ONLY JSON: {"scores":[{"i":0,"score":4,"reason":"few words"}, ...]} with one entry per story.`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
    const scores = new Map<number, { score: number; reason?: string }>();
    for (const s of parsed.scores ?? []) {
      if (typeof s?.i === "number" && typeof s?.score === "number") scores.set(s.i, s);
    }
    return cards.filter((card, i) => {
      const s = scores.get(i);
      if (!s) {
        // Unscored → don't punish the card for the grader's omission; mark it ungraded
        // so later same-week refreshes keep it instead of reading "no relevance" as 0.
        card.graded = false;
        return true;
      }
      card.graded = true;
      card.relevance = s.score;
      if (s.score < RELEVANCE_MIN) {
        console.warn(`[brain-dump] dropped card (relevance ${s.score}: ${s.reason ?? ""}): ${card.title}`);
        return false;
      }
      return true;
    });
  } catch (err) {
    // Fail open, but loudly: a broken grader must not empty the feed.
    console.error("[brain-dump] relevance check failed, keeping all cards:", err);
    for (const c of cards) {
      c.graded = false;
      delete c.relevance;
    }
    return cards;
  }
}

/** Past this point a refresh skips the per-topic retries: they would push the grader
 *  and the DB write past Vercel's 300s maxDuration (and then nothing is saved). */
const RETRY_BUDGET_MS = 150_000;

export async function fetchBrainDumpCards(): Promise<{ cards: BrainDumpCard[]; failedGroups: string[] }> {
  const startedAt = Date.now();
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

  const { topics, maxPerTopic } = await getBrainDumpConfig();
  const groups = groupTopics(topics);

  const results = await Promise.allSettled(
    groups.map((g) =>
    (async () => {
      const prompt = buildSearchPrompt({
        today,
        startStr,
        endStr,
        groupTopics: g.topics,
        allTopics: topics,
        isAIGroup: g.isAI,
        count: g.isAI ? Math.max(maxPerTopic, 6) : STORIES_PER_GROUP,
      });
      // Safety net: a non-AI group that still returns AI stories doesn't get to keep them.
      const clean = (cs: BrainDumpCard[]) => (g.isAI ? cs : cs.filter((c) => !isAICard(c)));
      let cards = clean(await searchCards(apiKey, prompt, start));
      // Most of a group's links can fail verification; one more search usually finds real ones.
      // Retry topic by topic: a narrower search returns real articles instead of nothing.
      if (cards.length < 2 && Date.now() - startedAt > RETRY_BUDGET_MS) {
        console.warn("[brain-dump] skipping per-topic retries: %ds elapsed", Math.round((Date.now() - startedAt) / 1000));
      } else if (cards.length < 2) {
        const retries = await Promise.all(
          g.topics.map((t) =>
            searchCards(
              apiKey,
              buildSearchPrompt({
                today,
                startStr,
                endStr,
                groupTopics: [t],
                allTopics: topics,
                isAIGroup: g.isAI,
                count: 3,
              }),
              start
            ).catch(() => [] as BrainDumpCard[])
          )
        );
        cards = cards.concat(clean(retries.flat()));
      }
      return cards;
    })()
    )
  );

  const cards: BrainDumpCard[] = [];
  const failures: string[] = [];
  const failedGroups: string[] = [];
  results.forEach((r, i) => {
    const label = groups[i].topics.map((t) => t.name).join(", ");
    if (r.status === "fulfilled") {
      console.log("[brain-dump] group [%s] → %d cards", label, r.value.length);
      cards.push(...r.value);
    } else {
      const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
      console.error("[brain-dump] group [%s] failed: %s", label, msg);
      failures.push(msg);
      failedGroups.push(label);
    }
  });

  // Only fail loudly if every group failed — partial results are still useful.
  if (cards.length === 0 && failures.length > 0) {
    throw new Error(failures[0]);
  }

  // The same article can come back from two searches.
  const seenUrls = new Set<string>();
  const unique = cards.filter((c) => {
    const k = normalizeUrl(c.url) ?? c.url;
    if (seenUrls.has(k)) return false;
    seenUrls.add(k);
    return true;
  });

  // Search models drift to whatever is loudest; a second, cheap pass judges each card
  // against Roberto's topic descriptions and editorial filter and drops the weak ones.
  const relevant = await keepRelevantCards(apiKey, unique, topics);

  // Interleave groups so the feed opens with a mix rather than one block per group.
  const interleaved = interleaveByTopic(relevant, topics);

  return {
    cards: interleaved.map((card, i) => ({
      ...card,
      id: card.id || slugify(card.title ?? "") || `card-${i}`,
    })),
    failedGroups,
  };
}

/** Round-robin across canonical topics so neighbouring cards differ. */
function interleaveByTopic(cards: BrainDumpCard[], topics: BrainDumpTopic[]): BrainDumpCard[] {
  const buckets = new Map<string, BrainDumpCard[]>();
  for (const c of cards) {
    const b = cardBucket(c, topics);
    if (!buckets.has(b)) buckets.set(b, []);
    buckets.get(b)!.push(c);
  }
  const lists = Array.from(buckets.values());
  const out: BrainDumpCard[] = [];
  for (let i = 0; out.length < cards.length; i++) {
    for (const l of lists) if (l[i]) out.push(l[i]);
  }
  return out;
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
      // Show the same issues as the Create tab (exclude only published editions)
      publishedAt: null,
      dismissedAt: null,
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
    publishDateISO: issue.publishDate ? issue.publishDate.toISOString() : null,
  }));
}

// ─── Cache: read & refresh ────────────────────────────────────────────────────

/** Read cached Brain Dump cards from the DB (instant, no API call) */
export async function getCachedBrainDump(): Promise<{
  cards: BrainDumpCard[];
  fetchedAt: Date | null;
}> {
  const cache = await prisma.brainDumpCache.findUnique({
    where: { id: "singleton" },
  });
  if (!cache) return { cards: [], fetchedAt: null };
  let cards: BrainDumpCard[] = [];
  try {
    const parsed = JSON.parse(cache.cards);
    cards = Array.isArray(parsed) ? (parsed as BrainDumpCard[]) : [];
  } catch (err) {
    console.error("[brain-dump] cache JSON is corrupt, showing an empty feed:", err);
  }
  return { cards, fetchedAt: cache.fetchedAt };
}

// ─── Topic balancing (the hard cap that actually curbs AI dominance) ─────────
// GPT fragments AI into many labels ("AI Models", "AI Investment", "Enterprise AI"…),
// so a prompt-level cap can't hold. We bucket each card into a canonical topic and
// enforce the per-topic cap in code, at display time — deterministic, config-driven.

/** Keep at most `maxPerTopic` cards per canonical topic, preserving order. */
function balanceByTopic(
  cards: BrainDumpCard[],
  topics: BrainDumpTopic[],
  maxPerTopic: number
): BrainDumpCard[] {
  const counts = new Map<string, number>();
  const kept: BrainDumpCard[] = [];
  for (const card of cards) {
    // AI-centric cards share the AI bucket whatever their stated topic, so the cap holds.
    const bucket = cardBucket(card, topics);
    const n = counts.get(bucket) ?? 0;
    if (n < maxPerTopic) {
      counts.set(bucket, n + 1);
      kept.push(card);
    }
  }
  return kept;
}

/** Read the cache and apply the per-topic cap for display.
 *  `totalCached` is the raw count before balancing (so the UI can show "X of Y"). */
export async function getBalancedBrainDump(): Promise<{
  cards: BrainDumpCard[];
  fetchedAt: Date | null;
  totalCached: number;
}> {
  const [{ cards, fetchedAt }, config] = await Promise.all([
    getCachedBrainDump(),
    getBrainDumpConfig(),
  ]);
  return {
    cards: balanceByTopic(cards, config.topics, config.maxPerTopic),
    fetchedAt,
    totalCached: cards.length,
  };
}

const CARD_CAP = 50;

const EXCLUDED_DOMAINS = ["wikipedia.org", "wikimedia.org", "wikidata.org", "wiki."];

function isRelevantSource(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return !EXCLUDED_DOMAINS.some((d) => hostname.includes(d));
  } catch {
    return true;
  }
}

/** Fetch fresh articles from OpenAI and save to DB cache.
 *  - Same week as last fetch → appends new cards on top (content dedup, cap 50)
 *  - New week → resets the cache with only the fresh cards
 */
export type RefreshBrainDumpResult = {
  ok: boolean;
  /** Blocking: nothing was saved; the previous feed is still shown. */
  error?: string;
  /** Non-blocking: cards were saved, but something is missing (e.g. a topic group failed). */
  warning?: string;
};

/** Same-week cached cards worth keeping: link-verified, and either graded ≥ RELEVANCE_MIN
 *  or explicitly left ungraded by a skipped/failed grader. Cards cached before the
 *  relevance gate have no `graded` field and are purged (they were never judged). */
function keepCachedCard(c: BrainDumpCard): boolean {
  if (!c.verified || c.graded === undefined) return false;
  if (c.graded === false) return true;
  return (c.relevance ?? 0) >= RELEVANCE_MIN;
}

export async function refreshBrainDump(): Promise<RefreshBrainDumpResult> {
  try {
    return await refreshBrainDumpInner();
  } catch (err) {
    console.error("[brain-dump] refresh failed:", err);
    return {
      ok: false,
      error: `Refresh failed: ${err instanceof Error ? err.message : String(err)}. The previous stories are still shown.`,
    };
  }
}

async function refreshBrainDumpInner(): Promise<RefreshBrainDumpResult> {
  const { start: currentWindowStart } = getEditionWindow();

  // Decide whether to append or reset based on week boundary
  const existing = await getCachedBrainDump();
  let existingCards: BrainDumpCard[] = [];
  if (existing.fetchedAt) {
    const { start: cachedWindowStart } = getEditionWindowForDate(new Date(existing.fetchedAt));
    if (cachedWindowStart.getTime() === currentWindowStart.getTime()) {
      // same week → keep verified + relevant cards; drop pre-verification/pre-gate ones.
      existingCards = existing.cards.filter(keepCachedCard);
    }
    // different week → existingCards stays empty (reset)
  }

  // Fetch and filter new cards
  const { cards: fetched, failedGroups } = await fetchBrainDumpCards();
  const newCards = fetched.filter((c) => isRelevantSource(c.url));
  const warning = failedGroups.length
    ? `Some topic searches failed and are missing from this refresh: ${failedGroups.join("; ")}.`
    : undefined;

  // Nothing new survived verification/grading: keep the old cache as is (a reset to an
  // empty feed, or silently dropping stale-format cards, is worse than showing last results).
  if (newCards.length === 0) {
    return {
      ok: false,
      error:
        "The search found no new stories that passed link and relevance checks. The previous stories are still shown — try again later." +
        (warning ? ` ${warning}` : ""),
    };
  }

  // Merge: new on top, then collapse near-duplicate stories by CONTENT (not URL).
  // GPT's web search surfaces the same story from different aggregator URLs, so
  // URL dedup misses them; meanwhile a single roundup URL (e.g. a daily headlines
  // page) legitimately backs several distinct cards, so URL dedup would wrongly
  // merge those. Content similarity handles both. First occurrence wins → the
  // freshest phrasing of a repeated story is kept.
  const merged = dedupeByContent([...newCards, ...existingCards]).slice(0, CARD_CAP);

  await prisma.brainDumpCache.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", cards: JSON.stringify(merged), fetchedAt: new Date() },
    update: { cards: JSON.stringify(merged), fetchedAt: new Date() },
  });
  revalidatePath("/brain-dump");
  return { ok: true, warning };
}

// ─── Content-level dedup ─────────────────────────────────────────────────────
// GPT-4o returns the same story from different aggregator URLs (different titles
// and URLs, same underlying event), which URL-based dedup can't catch. We compare
// cards by content similarity instead.
//
// The signal is an IDF-weighted Jaccard over each card's (title + keyFacts) tokens:
// tokens shared by many cards in the batch (ai, venture, billion…) are down-weighted,
// so what drives a match is shared RARE tokens — the specific entities/products/
// figures that identify a story ("hynix", "gpt", "muse", "zipline", "26.5"). That's
// what separates a true dupe from two distinct stories that merely share generic
// vocabulary.
//
// Thresholds were tuned against a real 30-card cache: every true duplicate scored a
// weighted-Jaccard ≥ 0.23, the closest distinct pair scored 0.12, and distinct
// stories sharing a roundup URL didn't clear 0.12 at all. WJ_THRESHOLD sits in that
// gap. TITLE_THRESHOLD is a safety net for near-identical titles whose facts happen
// to diverge (distinct same-URL stories have unrelated titles, so it never fires on
// them).

const WJ_THRESHOLD = 0.18;
const TITLE_THRESHOLD = 0.75;

// Common + domain-generic words carry no story identity; drop them before scoring.
// (IDF already down-weights frequent tokens; this just trims obvious noise up front.)
const DEDUP_STOPWORDS = new Set([
  "the", "and", "for", "with", "from", "that", "this", "are", "its", "has", "have",
  "was", "were", "will", "amid", "into", "over", "out", "new", "aims", "aim", "could",
  "more", "than", "then", "they", "their", "been", "but", "not", "can", "all", "how",
  "why", "what", "who", "about", "after", "before",
  "billion", "million", "percent", "year", "week", "first", "second", "half",
  "recent", "report", "reports",
]);

function tokenizeForDedup(text: string): string[] {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t.length >= 3 && !DEDUP_STOPWORDS.has(t));
}

function contentSignature(card: BrainDumpCard): Set<string> {
  return new Set(tokenizeForDedup([card.title, ...(card.keyFacts ?? [])].join(" ")));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  a.forEach((t) => {
    if (b.has(t)) inter++;
  });
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function weightedJaccard(a: Set<string>, b: Set<string>, idf: (t: string) => number): number {
  let inter = 0;
  let union = 0;
  a.forEach((t) => {
    const w = idf(t);
    union += w;
    if (b.has(t)) inter += w;
  });
  b.forEach((t) => {
    if (!a.has(t)) union += idf(t); // tokens only in b (a's were counted above)
  });
  return union === 0 ? 0 : inter / union;
}

/** Drop near-duplicate stories by content similarity, keeping the first occurrence. */
function dedupeByContent(cards: BrainDumpCard[]): BrainDumpCard[] {
  if (cards.length < 2) return cards;

  const sigs = cards.map(contentSignature);

  // Document frequency across the batch → IDF (rare tokens weigh more).
  const df = new Map<string, number>();
  sigs.forEach((sig) => sig.forEach((t) => df.set(t, (df.get(t) ?? 0) + 1)));
  const n = cards.length;
  const idf = (t: string) => Math.log((n + 1) / ((df.get(t) ?? 0) + 1)) + 1;

  const kept: BrainDumpCard[] = [];
  const keptSigs: Set<string>[] = [];
  const keptTitles: Set<string>[] = [];

  for (let i = 0; i < cards.length; i++) {
    const sig = sigs[i];
    const titleTokens = new Set(tokenizeForDedup(cards[i].title));
    let isDupe = false;
    for (let k = 0; k < kept.length; k++) {
      if (
        weightedJaccard(sig, keptSigs[k], idf) >= WJ_THRESHOLD ||
        jaccard(titleTokens, keptTitles[k]) >= TITLE_THRESHOLD
      ) {
        isDupe = true;
        break;
      }
    }
    if (!isDupe) {
      kept.push(cards[i]);
      keptSigs.push(sig);
      keptTitles.push(titleTokens);
    }
  }
  return kept;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}
