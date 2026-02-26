"use client";

import { useState, useEffect, useRef } from "react";
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

const LOADING_PHRASES = [
  "🎨 Nosso artista digital está em transe criativo...",
  "🖼️ Consultando Picasso, Dalí e o ChatGPT para inspiração...",
  "✨ Transformando palavras em pixels mágicos...",
  "🤖 A IA está escolhendo a paleta de cores com muito critério...",
  "🌅 Gerando uma obra digna de capa de revista... quase lá!",
  "🎭 Metáforas visuais sendo destiladas com carinho...",
  "🔮 Cristalizando o conceito em imagem... isso demora um pouquinho!",
  "🎬 Configurando câmera, luz e composição cinematográfica...",
  "🧠 Claude pensou, DALL-E pintou... aguarda mais um segundo!",
  "🌊 Deixa a criatividade fluir... ela tem o próprio ritmo!",
];

function useLoadingPhrase(active: boolean) {
  const [phrase, setPhrase] = useState("");
  const usedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!active) {
      usedRef.current.clear();
      return;
    }

    function pickPhrase() {
      if (usedRef.current.size >= LOADING_PHRASES.length) {
        usedRef.current.clear();
      }
      let idx: number;
      do {
        idx = Math.floor(Math.random() * LOADING_PHRASES.length);
      } while (usedRef.current.has(idx));
      usedRef.current.add(idx);
      setPhrase(LOADING_PHRASES[idx]);
    }

    pickPhrase();
    const interval = setInterval(pickPhrase, 4000);
    return () => clearInterval(interval);
  }, [active]);

  return phrase;
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
  const loadingPhrase = useLoadingPhrase(generating);

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
      const byteArray = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArray[i] = byteCharacters.charCodeAt(i);
      }
      const blob = new Blob([byteArray], { type: mimeType });
      await navigator.clipboard.write([new ClipboardItem({ [mimeType]: blob })]);
    } catch {
      try {
        const byteCharacters = atob(imageData);
        const byteArray = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteArray[i] = byteCharacters.charCodeAt(i);
        }
        const blob = new Blob([byteArray], { type: "image/png" });
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      } catch {
        setError("Could not copy image to clipboard.");
      }
    }
  }

  function handleDownload() {
    if (!imageData || !mimeType) return;
    const ext = mimeType.split("/")[1] || "png";
    const link = document.createElement("a");
    link.href = `data:${mimeType};base64,${imageData}`;
    link.download = `snapshot-cover.${ext}`;
    link.click();
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
      <Button onClick={handleGenerate} disabled={!selectedSectionId || generating}>
        {generating ? (
          <span className="inline-flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Generating...
          </span>
        ) : imageData ? (
          "Regenerate Image"
        ) : (
          "Generate Image"
        )}
      </Button>

      {/* Loading phrase */}
      {generating && (
        <p className="text-sm font-medium text-primary animate-pulse">
          {loadingPhrase}
        </p>
      )}

      {/* Error message */}
      {error && <p className="text-sm text-destructive">{error}</p>}

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
              <Button onClick={handleCopyImage}>Copy Image</Button>
              <Button variant="outline" onClick={handleDownload}>
                Download
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={() => setIssueStep(issueId, "export")}>
          Back
        </Button>
      </div>
    </div>
  );
}
