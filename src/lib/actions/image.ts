"use server";

import { prisma } from "@/lib/db";
import type { MainSectionContent } from "@/types";
import { revalidatePath } from "next/cache";

const IMAGE_PROMPT_TEMPLATE = `You are an editorial visual concept designer.
First, carefully analyze the following text and identify: – The central strategic theme – The underlying tension or conflict – The power dynamics involved – The emotional tone (e.g., optimism, risk, disruption, concentration, fragility, control)
TEXT TO ANALYZE:
{SECTION_TEXT}

Based on this analysis, generate a single strong visual concept that symbolically represents the core idea of the text.
The image should not literally illustrate the topic. Instead, it should use metaphor, symbolism, and high-level abstraction suitable for a magazine cover (e.g., The Economist, Financial Times, Bloomberg Businessweek).
Choose a visual metaphor that best represents the theme. The composition, environment, and objects should emerge naturally from the meaning of the text — do not default to any predefined scene.
The scene must be cinematic, hyper-realistic, and high-end editorial.
The final output should describe one cohesive image scene including: – Main symbolic object or structure representing the core subject – Surrounding environment reflecting the power structure and market dynamics – Subtle secondary symbolic elements reinforcing the key tensions (risk, control, capital, regulation, disruption — as applicable to the text) – Lighting style and color palette aligned with the emotional tone
No text, no logos, no brand names.
Ultra-detailed, high dynamic range, cinematic depth of field, 8K resolution, magazine cover quality.
Aspect ratio 16:9, wide frame composition.
The mood should clearly communicate the dominant emotional tone you identified from the text.`;

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
 * Generate an editorial cover image for a newsletter section using Google Gemini (Nano Banana).
 */
export async function generateImage(
  issueId: string,
  sectionId: string
): Promise<{ imageData: string; mimeType: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set. Add it to your .env file.");
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

  // Build the full prompt
  const prompt = IMAGE_PROMPT_TEMPLATE.replace("{SECTION_TEXT}", sectionText);

  // Call Google Gemini API (Nano Banana)
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: {
            aspectRatio: "16:9",
          },
        },
      }),
      signal: AbortSignal.timeout(120000), // 2 minute timeout for image generation
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Gemini API error:", response.status, error);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();

  // Extract the image from the response
  let imageData: string | null = null;
  let mimeType: string | null = null;

  for (const candidate of data.candidates || []) {
    for (const part of candidate.content?.parts || []) {
      if (part.inlineData) {
        imageData = part.inlineData.data;
        mimeType = part.inlineData.mimeType;
        break;
      }
    }
    if (imageData) break;
  }

  if (!imageData || !mimeType) {
    throw new Error("Gemini did not return an image. Try again.");
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
