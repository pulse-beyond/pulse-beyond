// Shared topic-normalization helpers — used by the server (balancing) and the
// client (filter dropdown) so both bucket topics the same way.

import type { BrainDumpCard, BrainDumpTopic } from "@/types/index";

export const AI_LABEL = "AI";

export function topicTokens(s: string): string[] {
  return (s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function firstToken(s: string): string {
  return topicTokens(s)[0] ?? "";
}

/** True for any AI variant: "AI", "AI Investment", "Enterprise AI",
 *  "Video AI", "Conversational AI", "Artificial Intelligence", … */
export function isAITopic(raw: string): boolean {
  const tokens = topicTokens(raw);
  return tokens.includes("ai") || (raw ?? "").toLowerCase().includes("artificial intelligence");
}

/** Map a free-form topic string onto one of the configured topics (for balancing). */
export function canonicalTopic(rawTopic: string, topics: BrainDumpTopic[]): string {
  const raw = (rawTopic ?? "").trim();
  if (!raw) return "Other";
  const rawFirst = firstToken(raw);
  const ai = isAITopic(raw);
  // Exact name first: "Digital finance" and "Digital Infrastructure" share a first token.
  const exact = topics.find((t) => t.name.trim().toLowerCase() === raw.toLowerCase());
  if (exact) return exact.name;
  for (const t of topics) {
    const nameFirst = firstToken(t.name);
    if (ai && (nameFirst === "artificial" || nameFirst === "ai")) return t.name;
    if (nameFirst && nameFirst === rawFirst) return t.name;
  }
  if (ai) return "Artificial Intelligence"; // AI-ish but no AI topic configured
  return raw; // unknown topic → its own bucket
}

// Subject-level AI detection for cards. Matches AI as a whole word / known AI
// entities in the title. Used when the card predates the `aiCentric` field or the
// model forgot it. Kept to the TITLE: tags and facts mention AI in passing too often.
const AI_TITLE_RE =
  /\b(ai|a\.i\.|artificial intelligence|genai|llms?|chatbots?|machine learning|openai|anthropic|chatgpt|gpt-?\d*|gemini|copilot|deepseek|agentic|ai-\w+)\b/i;

/** True when the card's main SUBJECT is AI, regardless of its stated primary topic. */
export function isAICard(card: Pick<BrainDumpCard, "title" | "topic"> & { aiCentric?: boolean }): boolean {
  if (card.aiCentric === true) return true;
  if (isAITopic(card.topic)) return true;
  // Title check applies even when the model said aiCentric=false: it labels by angle
  // ("AI Data Centers Race for Power" → infrastructure), which is the bug we're fixing.
  return AI_TITLE_RE.test(card.title ?? "");
}

/** The single bucket a card is filtered/capped under: AI if it's about AI, else its topic. */
export function cardBucket(card: BrainDumpCard, topics: BrainDumpTopic[]): string {
  if (isAICard(card)) {
    const aiTopic = topics.find((t) => isAITopic(t.name));
    return aiTopic ? aiTopic.name : "Artificial Intelligence";
  }
  return canonicalTopic(card.topic, topics);
}

/** Collapse a tag to its filter label: every AI variant becomes a single "AI". */
export function foldTag(tag: string): string {
  return isAITopic(tag) ? AI_LABEL : tag;
}

/** The set of filter labels a card carries (tags folded so all AI is one "AI"). */
export function cardFilterLabels(card: BrainDumpCard): string[] {
  const set = new Set<string>();
  for (const tag of card.topicTags ?? []) set.add(foldTag(tag));
  if (isAICard(card)) set.add(AI_LABEL);
  return Array.from(set);
}
