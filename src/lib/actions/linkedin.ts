"use server";

import { prisma } from "@/lib/db";
import type { MainSectionContent } from "@/types";
import { revalidatePath } from "next/cache";

// Real posts as Roberto published them. Line breaks matter: the old examples were
// pasted flattened onto one line, and the model faithfully copied that (Oct 2026
// posts came out as one run-on block). Example 1 is his Nov 1, 2026 post verbatim
// (typo "approaching and AI" fixed). Examples 2-3 are earlier posts re-broken into
// his current layout, with the closing thesis he no longer uses removed.
const FEW_SHOT_EXAMPLES = `
EXAMPLE 1:
🗞 Weekly Snapshot — Nov 01, 2026

👉 AI investment. Science investment. Global business.

🌎 Three domains where you need to understand the game.

This week:

👉 Are we approaching an AI investment reckoning?
👉 The pressure for science to deliver prosperity is growing.
👉 Mbappé's comment about Mao cost hundreds of millions.

💡 AI stocks are making markets nervous.
💡 Meta-science units are becoming fashionable for a good reason.
💡 Global operations require cultural intelligence and respect.

👇🏼👇🏼 Dive into this week's Snapshot.

EXAMPLE 2:
🗞 Weekly Snapshot — Mar 08, 2026

👉 Supply chains. Warfare. Data.

🌎 Three arenas where power is being quietly redefined.

This week:

👉 Cars become computers on wheels and automakers move into chips.
👉 Cheap drones meet expensive defenses.
👉 Congo's geological archives are the real gold mine.

💡 Technology is reshaping industries.
💡 Cost structures are reshaping war.
💡 Data is reshaping geopolitics.

👇🏼👇🏼 Dive into this week's Snapshot.

EXAMPLE 3:
🗞 Weekly Snapshot — Mar 01, 2026

👉 Culture. Demographics. AI+Robotics.

🌎 Three forces quietly reshaping power.

This week:

👉 K-pop in Colombia and the real economics of soft power.
👉 South Korea's birthrate ticks up, but the storm remains.
👉 Google pulls robotics back in-house.

💡 Narratives create markets.
💡 People create power.
💡 AI is moving into the physical world.

👇🏼👇🏼 Dive into this week's Snapshot.
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
- Follow the EXACT same structure and line breaks as the examples, in this order:
  1. "🗞 Weekly Snapshot — <edition date>"
  2. blank line, "👉 " + topic keywords line
  3. blank line, "🌎 " + one-sentence tagline linking the three stories
  4. blank line, "This week:"
  5. blank line, three "👉 " hook lines, one per story, each on its own line
  6. blank line, three "💡 " insight lines, each on its own line
  7. blank line, "👇🏼👇🏼 Dive into this week's Snapshot."
- Every item goes on its OWN line. Put an empty line between blocks exactly as shown. Never merge lines.
- NO closing thesis paragraph. Go straight from the last 💡 line to the 👇🏼👇🏼 line.
- Keep every 👉 hook and 💡 insight short: about 6 to 10 words, one sentence. No dashes.
- The 👉 topic keywords line should use 2–4 broad theme words (e.g. "Markets. Design assumptions. Geopolitics."), not the full article titles.
- Each "This week:" hook (👉) hooks curiosity about that story (a question works well).
- Each 💡 insight is a short declarative takeaway.
- End with exactly: 👇🏼👇🏼 Dive into this week's Snapshot.
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
