"use server";

import { prisma } from "@/lib/db";
import type { MainSectionContent } from "@/types";
import { revalidatePath } from "next/cache";

const FEW_SHOT_EXAMPLES = `
EXAMPLE 1:
🗞 Weekly Snapshot is live👉 Markets. Design assumptions. Geopolitics.🌎  Three places where the rules are quietly changing.This week:👉 Can biodiversity preservation become a profitable business model?👉 Rivian's founder challenges the humanoid robot assumption👉 Afghanistan reminds the world that even great powers have limits💡 Conservation needs economic engineering.💡 AI may require rethinking the physical and organizational structures we build.💡 Some places continue to resist both hard and soft power.In a world being reshaped by technology, natural limits and geopolitics, old models are cracking.👇🏼👇🏼  Dive into this week's Snapshot.

EXAMPLE 2:
🗞 Weekly Snapshot — Mar 08, 2026👉 Supply chains. Warfare. Data. 🌎  Three arenas where power is being quietly redefined.This week:👉 Cars become computers on wheels — and automakers move upstream into semiconductors 👉 Warfare enters the age of industrial asymmetry, where cheap drones meet expensive defenses 👉 A dispute over Congo's geological archives reveals the real gold mine: data💡 Technology is reshaping industries.💡 Cost structures are reshaping war.💡 Data is reshaping geopolitics.In the 21st century, whoever controls chips, production capacity and data will shape the rules of the game.👇🏼👇🏼  Dive into this week's Snapshot.

EXAMPLE 3:
🗞 Weekly Snapshot — Mar 01, 2026👉 Culture. Demographics. AI+Robotics.🌎 Three forces quietly reshaping power.This week:👉 K-pop in Colombia and the real economics of soft power👉 South Korea's birthrate ticks up — but the demographic storm remains👉 Google pulls robotics back in-house as software meets hardware at scale💡 Narratives create markets.💡 People create power.💡 AI is moving into the physical world.Competitiveness is no longer just about factories or code. It is culture, population dynamics and embodied intelligence.And the pace is accelerating.👇🏼👇🏼 Dive into this week's Snapshot.
`;

function resolveTitle(content: MainSectionContent): string {
  if (content.selectedTitle === "__custom__") {
    return content.customTitle || content.titleOptions[0] || "";
  }
  return content.selectedTitle || content.titleOptions[0] || "";
}

function formatPostDate(date: Date | null): string | null {
  if (!date) return null;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

/**
 * Generate a LinkedIn post announcing the new newsletter edition using Claude.
 */
export async function generateLinkedInPost(issueId: string): Promise<string> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) throw new Error("ANTHROPIC_API_KEY is not set.");

  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: {
      sections: {
        where: { sectionType: "main" },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!issue) throw new Error("Issue not found");
  if (issue.sections.length === 0) throw new Error("No sections found. Complete the Generate step first.");

  const dateStr = formatPostDate(issue.publishDate);

  const sectionsText = issue.sections
    .map((s, i) => {
      const content: MainSectionContent = JSON.parse(s.editedContent || s.content);
      const title = resolveTitle(content);
      return `Section ${i + 1}:
Title: ${title}
Why it matters: ${content.whyItMatters}
My thoughts: ${content.myThoughts}`;
    })
    .join("\n\n");

  const prompt = `You are a ghostwriter for a weekly geopolitics and technology newsletter called "Weekly Snapshot". Your task is to write the LinkedIn post that announces the new edition.

Study the examples below carefully — they define the EXACT tone, format, and structure you must follow:

${FEW_SHOT_EXAMPLES}

Now write a LinkedIn post for this week's edition.

Edition date: ${dateStr ?? "not set"}
Sections:
${sectionsText}

Rules:
- Follow the EXACT same structure as the examples: header, topic keywords line, tagline line, "This week:" hooks, insights, closing thesis, CTA.
- The 👉 topic keywords line should use 2–4 broad theme words (e.g. "Markets. Design assumptions. Geopolitics."), not the full article titles.
- Each "This week:" hook (👉) should be one punchy sentence that hooks curiosity about that story.
- Each 💡 insight should be a short declarative sentence (pattern: "[Subject] is reshaping/needs/requires [something]").
- The closing thesis is 1–3 sentences that synthesize the big picture across all 3 stories.
- End with exactly: 👇🏼👇🏼  Dive into this week's Snapshot.
- Match the energy and editorial intelligence of the examples. Do NOT be generic.
- Reply with ONLY the LinkedIn post text. No explanation, no preamble.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("Claude API error:", response.status, err);
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  const postText: string = data.content?.[0]?.text?.trim();
  if (!postText) throw new Error("Claude did not return a post.");

  await prisma.linkedInPostDraft.create({
    data: { issueId, content: postText },
  });

  revalidatePath(`/issues/${issueId}`);

  return postText;
}
