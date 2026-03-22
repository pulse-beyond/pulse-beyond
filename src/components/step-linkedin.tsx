"use client";

import { useState, useEffect, useRef } from "react";
import { generateLinkedInPost } from "@/lib/actions/linkedin";
import { setIssueStep } from "@/lib/actions/issues";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { LinkedInPostDraft } from "@prisma/client";

interface Props {
  issueId: string;
  latestDraft: LinkedInPostDraft | null;
}

const LOADING_PHRASES = [
  "✍️ Consultando o manual de boas práticas do LinkedIn...",
  "🧠 Claude está destilando geopolítica em parágrafo de engajamento...",
  "📢 Formulando o hook perfeito para parar o scroll...",
  "🌎 Traduzindo complexidade em clareza editorial...",
  "💡 Calibrando o tom entre inteligente e acessível...",
  "🗞 Montando o post que vai fazer a galera clicar...",
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

export function StepLinkedIn({ issueId, latestDraft }: Props) {
  const [generating, setGenerating] = useState(false);
  const [postText, setPostText] = useState<string>(latestDraft?.content ?? "");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const loadingPhrase = useLoadingPhrase(generating);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const result = await generateLinkedInPost(issueId);
      setPostText(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Post generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(postText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy to clipboard.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Step 8: LinkedIn Post</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Generate the LinkedIn post announcing this week&apos;s edition.
        </p>
      </div>

      <Button onClick={handleGenerate} disabled={generating}>
        {generating ? (
          <span className="inline-flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Generating...
          </span>
        ) : postText ? (
          "Regenerate Post"
        ) : (
          "Generate LinkedIn Post"
        )}
      </Button>

      {generating && (
        <p className="text-sm font-medium text-primary animate-pulse">
          {loadingPhrase}
        </p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {postText && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <textarea
              className="w-full min-h-[320px] text-sm font-mono border-0 bg-transparent resize-none focus:outline-none"
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
            />
            <Button onClick={handleCopy} variant={copied ? "outline" : "default"}>
              {copied ? "Copied!" : "Copy to Clipboard"}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={() => setIssueStep(issueId, "image")}>
          Back
        </Button>
      </div>
    </div>
  );
}
