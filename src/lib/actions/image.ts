"use server";

import { prisma } from "@/lib/db";
import type { MainSectionContent } from "@/types";
import { revalidatePath } from "next/cache";

const CONCEPT_PROMPT_TEMPLATE = `You are an editorial visual concept designer for a high-end magazine (like The Economist or Bloomberg Businessweek).

Read the following newsletter section carefully. Extract:
1. The central theme or subject (e.g. AI regulation, market concentration, climate tech, geopolitics)
2. The emotional tone (e.g. tension, optimism, disruption, fragility, power shift)
3. Key players or forces involved (e.g. governments, corporations, technologies, markets)

Then write a single DALL-E image prompt (max 800 characters) that:
- Uses a concrete visual metaphor directly tied to the theme you extracted — do NOT use generic concepts
- Looks like a real photograph — shot on a professional camera, natural lighting, documentary or editorial photography style
- Feels grounded and real, NOT futuristic, digital, or illustrated — no glowing effects, no sci-fi aesthetics, no CGI look
- Specifies lighting (e.g. golden hour, overcast, studio), color palette, and mood aligned with the emotional tone
- Has NO text, logos, flags, faces, or brand names
- Assumes a wide 16:9 frame, as if shot by a photojournalist for a magazine cover

Examples of theme-to-metaphor mapping (for reference only — create your own based on the actual text):
- AI regulation → a lone chess board on a government office desk, natural window light, documentary photography
- Market crash → an empty trading floor at dusk, chairs overturned, warm late light casting long shadows
- Climate finance → a dried riverbed with cracked earth beside a lush green field, shot on a 35mm lens

Reply with ONLY the image prompt. No explanation, no preamble.

SECTION:
{SECTION_TEXT}`;

/**
 * Build the full section text from a GeneratedSection's content
 */
function buildSectionText(content: MainSectionContent): string {
  const title =
    content.selectedTitle === "__custom__"
      ? content.customTitle || content.titleOptions[0]
      : content.selectedTitle || content.titleOptions[0];

  return `${title}\n\nWhy it matters:\n${content.whyItMatters}\n\nMy thoughts on it:\n${content.myThoughts}`;
}

/**
 * Generate an editorial cover image for a newsletter section using OpenAI DALL-E 3.
 */
export async function generateImage(
  issueId: string,
  sectionId: string
): Promise<{ imageData: string; mimeType: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set. Add it to your .env file.");
  }

  // Fetch the section
  const section = await prisma.generatedSection.findUnique({
    where: { id: sectionId },
    include: { linkItem: true },
  });

  if (!section) throw new Error("Section not found");

  // Parse the section content
  const content: MainSectionContent = JSON.parse(
    section.editedContent || section.content
  );

  // Build the full text for the prompt
  const sectionText = buildSectionText(content);

  // Step 1: Use Claude to generate a concise DALL-E prompt from the section text
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) throw new Error("ANTHROPIC_API_KEY is not set.");

  const conceptResponse = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: CONCEPT_PROMPT_TEMPLATE.replace("{SECTION_TEXT}", sectionText),
        },
      ],
    }),
  });

  if (!conceptResponse.ok) {
    const err = await conceptResponse.text();
    console.error("Claude API error:", conceptResponse.status, err);
    throw new Error(`Claude API error: ${conceptResponse.status}`);
  }

  const conceptData = await conceptResponse.json();
  const prompt = conceptData.content?.[0]?.text?.trim();
  if (!prompt) throw new Error("Claude did not return a prompt.");

  console.log("Generated DALL-E prompt:", prompt);

  // Step 2: Call OpenAI DALL-E 3 API with the concise prompt
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1792x1024",
      response_format: "b64_json",
    }),
    signal: AbortSignal.timeout(120000),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("OpenAI API error:", response.status, error);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const imageData: string | null = data.data?.[0]?.b64_json ?? null;
  const mimeType = "image/png";

  if (!imageData) {
    throw new Error("OpenAI did not return an image. Try again.");
  }

  // Save to database
  await prisma.generatedImage.create({
    data: {
      issueId,
      sectionId,
      prompt,
      imageData,
      mimeType,
    },
  });

  revalidatePath(`/issues/${issueId}`);

  return { imageData, mimeType };
}
