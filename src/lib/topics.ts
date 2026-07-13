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
  for (const t of topics) {
    const nameFirst = firstToken(t.name);
    if (ai && (nameFirst === "artificial" || nameFirst === "ai")) return t.name;
    if (nameFirst && nameFirst === rawFirst) return t.name;
  }
  if (ai) return "Artificial Intelligence"; // AI-ish but no AI topic configured
  return raw; // unknown topic → its own bucket
}

/** Collapse a tag to its filter label: every AI variant becomes a single "AI". */
export function foldTag(tag: string): string {
  return isAITopic(tag) ? AI_LABEL : tag;
}

/** The set of filter labels a card carries (tags folded so all AI is one "AI"). */
export function cardFilterLabels(card: BrainDumpCard): string[] {
  const set = new Set<string>();
  for (const tag of card.topicTags ?? []) set.add(foldTag(tag));
  if (isAITopic(card.topic)) set.add(AI_LABEL);
  return Array.from(set);
}
