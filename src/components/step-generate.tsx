"use client";

import { useState, useEffect, useRef } from "react";
import { generateDraft, updateSectionContent, selectTitle } from "@/lib/actions/generate";
import { setIssueStep } from "@/lib/actions/issues";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { MainSectionContent } from "@/types";
import type { GeneratedSection, LinkItem } from "@prisma/client";

interface Props {
  issueId: string;
  sections: GeneratedSection[];
  links: LinkItem[];
}

/** Convert "Title Case Words" to "Title case words" — keeps first letter and proper nouns */
function toSentenceCase(str: string): string {
  if (!str) return str;
  // Only transform if most words are capitalized (title case detection)
  const words = str.split(" ");
  const capitalizedCount = words.filter(
    (w) => w.length > 0 && w[0] === w[0].toUpperCase() && w[0] !== w[0].toLowerCase()
  ).length;
  // If more than 60% of words are capitalized, it's likely title case
  if (capitalizedCount / words.length > 0.6 && words.length > 2) {
    return words
      .map((w, i) => {
        if (i === 0) return w; // Keep first word as-is
        // Keep short acronyms/proper nouns (all caps or starts with known proper patterns)
        if (w === w.toUpperCase() && w.length <= 4) return w;
        return w.charAt(0).toLowerCase() + w.slice(1);
      })
      .join(" ");
  }
  return str;
}

const LOADING_PHRASES = [
  "\u2728 Fazendo nossa magia... tudo que vale a pena demora um pouquinho!",
  "\ud83d\ude80 Preparando um Snapshot digno de LinkedIn... calma que vem coisa boa!",
  "\ud83e\udde0 A IA est\u00e1 pensando com carinho em cada se\u00e7\u00e3o...",
  "\ud83c\udf73 Cozinhando seu draft em fogo baixo, pra sair no ponto certo!",
  "\u2615 Escrevendo como se fosse domingo de manh\u00e3, com calma e caf\u00e9...",
  "\ud83e\udd16 Rob\u00f4s trabalhando... n\u00e3o t\u00e3o r\u00e1pido quanto um estagi\u00e1rio, mas quase!",
  "\ud83d\udc4f Gerando insights que fariam o LinkedIn aplaudir de p\u00e9!",
  "\u270d\ufe0f Nosso ghostwriter virtual est\u00e1 inspirado hoje...",
  "\ud83d\udcab Transformando links em ouro... ou pelo menos em um bom Snapshot!",
  "\ud83c\udfaf Paci\u00eancia \u00e9 virtude, e um bom draft \u00e9 recompensa!",
  "\ud83d\udcdd Cada grande newsletter come\u00e7a com um pouquinho de espera...",
  "\ud83d\udd0d Analisando, conectando pontos, formulando opini\u00f5es... j\u00e1 j\u00e1 sai!",
  "\ud83c\udfdb\ufe0f Se at\u00e9 Roma n\u00e3o foi feita em um dia, imagine um Snapshot!",
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
    const interval = setInterval(pickPhrase, 5000);
    return () => clearInterval(interval);
  }, [active]);

  return phrase;
}

export function StepGenerate({ issueId, sections, links }: Props) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingPhrase = useLoadingPhrase(generating);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const result = await generateDraft(issueId);
      if (result && result.errors && result.errors.length > 0) {
        setError(`Generated ${result.generated}/${result.total} sections. Errors: ${result.errors.join("; ")}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Step C: Generate Draft</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Generate newsletter sections for your {links.length} selected link
          {links.length !== 1 ? "s" : ""}. You can edit everything after generation.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Generating...
            </span>
          ) : sections.length > 0 ? (
            "Regenerate All"
          ) : (
            "Generate Draft"
          )}
        </Button>
      </div>

      {generating && (
        <p className="text-sm font-medium text-primary animate-pulse">
          {loadingPhrase}
        </p>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Rendered sections */}
      {sections.length > 0 && (
        <div className="space-y-6 mt-4">
          {sections.map((section, i) => {
            const link = links.find((l) => l.id === section.linkItemId);
            return (
              <SectionEditor
                key={section.id}
                section={section}
                index={i}
                linkUrl={link?.url}
              />
            );
          })}
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={() => setIssueStep(issueId, "select")}>
          Back
        </Button>
        <Button
          onClick={() => setIssueStep(issueId, "events")}
          disabled={sections.length === 0}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

function SectionEditor({
  section,
  index,
  linkUrl,
}: {
  section: GeneratedSection;
  index: number;
  linkUrl?: string;
}) {
  const content: MainSectionContent = JSON.parse(
    section.editedContent || section.content
  );

  const [whyItMatters, setWhyItMatters] = useState(content.whyItMatters);
  const [myThoughts, setMyThoughts] = useState(content.myThoughts);
  const [customTitle, setCustomTitle] = useState(content.customTitle || "");
  const [saving, setSaving] = useState(false);

  const isCustomSelected = content.selectedTitle === "__custom__";
  const hasChanges =
    whyItMatters !== content.whyItMatters ||
    myThoughts !== content.myThoughts ||
    customTitle !== (content.customTitle || "");

  async function handleSave() {
    setSaving(true);
    const updated: MainSectionContent = {
      ...content,
      whyItMatters,
      myThoughts,
      customTitle: customTitle || undefined,
    };
    await updateSectionContent(section.id, JSON.stringify(updated));
    setSaving(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Section {index + 1}
          {linkUrl && (
            <a
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline font-normal ml-2"
            >
              {linkUrl}
            </a>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Title options */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            Title (pick one)
          </label>
          <div className="space-y-2">
            {content.titleOptions.map((title, i) => {
              const isSelected = content.selectedTitle === title;
              return (
                <button
                  key={i}
                  onClick={() => selectTitle(section.id, title)}
                  className={cn(
                    "group flex items-center gap-3 w-full text-left text-sm px-3 py-2.5 rounded border transition-colors",
                    isSelected
                      ? "border-primary bg-primary/5 font-medium"
                      : "border-border hover:bg-accent/50"
                  )}
                >
                  {/* Radio circle */}
                  <span
                    className={cn(
                      "w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors",
                      isSelected
                        ? "border-primary"
                        : "border-muted-foreground/40 group-hover:border-muted-foreground"
                    )}
                  >
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </span>
                  <span>{toSentenceCase(title)}</span>
                </button>
              );
            })}

            {/* Custom title option */}
            <button
              onClick={async () => {
                await selectTitle(section.id, "__custom__");
              }}
              className={cn(
                "group flex items-center gap-3 w-full text-left text-sm px-3 py-2.5 rounded border transition-colors",
                isCustomSelected
                  ? "border-primary bg-primary/5 font-medium"
                  : "border-border hover:bg-accent/50"
              )}
            >
              <span
                className={cn(
                  "w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors",
                  isCustomSelected
                    ? "border-primary"
                    : "border-muted-foreground/40 group-hover:border-muted-foreground"
                )}
              >
                {isCustomSelected && (
                  <span className="w-2 h-2 rounded-full bg-primary" />
                )}
              </span>
              <span className="text-muted-foreground">Write your own title...</span>
            </button>

            {isCustomSelected && (
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Solte a criatividade aqui... o titulo perfeito esta na sua cabeca!"
                className="w-full text-sm px-3 py-2.5 rounded border border-primary bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/30 ml-7"
                autoFocus
              />
            )}
          </div>
        </div>

        {/* Why it matters */}
        <div>
          <label className="text-sm font-medium mb-1 block">
            Why it matters
          </label>
          <Textarea
            value={whyItMatters}
            onChange={(e) => setWhyItMatters(e.target.value)}
            rows={6}
            className="text-sm leading-relaxed"
          />
        </div>

        {/* My thoughts */}
        <div>
          <label className="text-sm font-medium mb-1 block">
            My thoughts on it
          </label>
          <Textarea
            value={myThoughts}
            onChange={(e) => setMyThoughts(e.target.value)}
            rows={8}
            className="text-sm leading-relaxed"
          />
        </div>

        {hasChanges && (
          <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
