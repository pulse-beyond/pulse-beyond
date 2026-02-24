"use client";

import { useState } from "react";
import { generateImage } from "@/lib/actions/image";
import { setIssueStep } from "@/lib/actions/issues";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { GeneratedSection, LinkItem, GeneratedImage } from "@prisma/client";
import type { MainSectionContent } from "@/types";

type SectionWithLink = GeneratedSection & { linkItem: LinkItem | null };

interface Props {
  issueId: string;
  sections: SectionWithLink[];
  latestImage: GeneratedImage | null;
}

function getSectionTitle(section: GeneratedSection): string {
  try {
    const content: MainSectionContent = JSON.parse(
      section.editedContent || section.content
    );
    if (content.selectedTitle === "__custom__") {
      return content.customTitle || content.titleOptions[0] || "Untitled";
    }
    return content.selectedTitle || content.titleOptions[0] || "Untitled";
  } catch {
    return "Untitled";
  }
}

export function StepImage({ issueId, sections, latestImage }: Props) {
  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    latestImage?.sectionId || ""
  );
  const [generating, setGenerating] = useState(false);
  const [imageData, setImageData] = useState<string | null>(
    latestImage?.imageData || null
  );
  const [mimeType, setMimeType] = useState<string | null>(
    latestImage?.mimeType || null
  );
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!selectedSectionId) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await generateImage(issueId, selectedSectionId);
      setImageData(result.imageData);
      setMimeType(result.mimeType);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Image generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopyImage() {
    if (!imageData || !mimeType) return;
    try {
      const byteCharacters = atob(imageData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      await navigator.clipboard.write([
        new ClipboardItem({ [mimeType]: blob }),
      ]);
    } catch {
      // Fallback: if clipboard write fails for the mime type, try as PNG
      try {
        const byteCharacters = atob(imageData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "image/png" });
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
      } catch {
        setError("Could not copy image to clipboard.");
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Step G: Cover Image</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Select a topic and generate an editorial cover image using AI.
        </p>
      </div>

      {/* Topic selection */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Choose a topic:</p>
        <div className="grid gap-2">
          {sections.map((section) => {
            const title = getSectionTitle(section);
            const isSelected = selectedSectionId === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setSelectedSectionId(section.id)}
                className={`text-left p-3 rounded-lg border transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <span className="text-sm font-medium">{title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Generate button */}
      <Button
        onClick={handleGenerate}
        disabled={!selectedSectionId || generating}
      >
        {generating ? "Generating..." : "Generate Image"}
      </Button>

      {/* Error message */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Image preview */}
      {imageData && mimeType && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <img
              src={`data:${mimeType};base64,${imageData}`}
              alt="Generated editorial cover"
              className="w-full rounded-lg"
            />
            <div className="flex gap-2">
              <Button onClick={handleCopyImage}>
                Copy Image
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex gap-3 pt-4">
        <Button
          variant="outline"
          onClick={() => setIssueStep(issueId, "export")}
        >
          Back
        </Button>
      </div>
    </div>
  );
}
