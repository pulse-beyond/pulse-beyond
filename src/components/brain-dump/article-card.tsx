"use client";

import { useState, useRef, useEffect } from "react";
import { ExternalLink, Plus, Check, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { addCardToEdition } from "@/lib/actions/brain-dump";
import type { BrainDumpCard, OpenIssue } from "@/types/index";

// ─── Source color palette ─────────────────────────────────────────────────────

const SOURCE_COLORS: Record<string, string> = {
  "Financial Times": "bg-pink-100 text-pink-800",
  Bloomberg: "bg-blue-100 text-blue-800",
  "MIT Technology Review": "bg-purple-100 text-purple-800",
  "MIT Tech Review": "bg-purple-100 text-purple-800",
  "The Economist": "bg-red-100 text-red-800",
  "South China Morning Post": "bg-amber-100 text-amber-800",
  "Nikkei Asia": "bg-teal-100 text-teal-800",
  Nature: "bg-green-100 text-green-800",
  "Al Jazeera": "bg-orange-100 text-orange-800",
  "IEEE Spectrum": "bg-indigo-100 text-indigo-800",
  TechCrunch: "bg-emerald-100 text-emerald-800",
  Reuters: "bg-slate-100 text-slate-800",
  "Atlantic Council": "bg-cyan-100 text-cyan-800",
};

function getSourceColor(source: string): string {
  // Exact match first
  if (SOURCE_COLORS[source]) return SOURCE_COLORS[source];
  // Partial match
  const key = Object.keys(SOURCE_COLORS).find((k) =>
    source.toLowerCase().includes(k.toLowerCase())
  );
  return key ? SOURCE_COLORS[key] : "bg-secondary text-secondary-foreground";
}

// ─── Edition Dropdown ─────────────────────────────────────────────────────────

interface EditionDropdownProps {
  openIssues: OpenIssue[];
  cardUrl: string;
  onAdded: (issueId: string) => void;
}

function EditionDropdown({ openIssues, cardUrl, onAdded }: EditionDropdownProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  async function handleSelect(issueId: string) {
    setLoading(issueId);
    const result = await addCardToEdition(cardUrl, issueId);
    setLoading(null);
    if (result.success) {
      onAdded(issueId);
      setOpen(false);
    } else {
      alert(`Could not add to edition: ${result.error}`);
    }
  }

  if (openIssues.length === 0) {
    return (
      <span className="text-[11px] text-muted-foreground italic">
        No open editions
      </span>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <Plus className="h-3 w-3" />
        Add to edition
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute bottom-full mb-1 left-0 z-50 min-w-[200px] rounded-lg border bg-white shadow-xl py-1" style={{ backgroundColor: 'white' }}>
          <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Choose an edition
          </p>
          {openIssues.map((issue) => (
            <button
              key={issue.id}
              onClick={() => handleSelect(issue.id)}
              disabled={loading === issue.id}
              className="w-full text-left px-3 py-2 text-[12px] hover:bg-muted transition-colors flex items-center justify-between gap-2 disabled:opacity-60"
            >
              <span className="font-medium text-foreground truncate">
                {issue.title}
              </span>
              {issue.publishDate && (
                <span className="text-muted-foreground shrink-0 text-[10px]">
                  {issue.publishDate}
                </span>
              )}
              {loading === issue.id && (
                <Loader2 className="h-3 w-3 animate-spin shrink-0 text-muted-foreground" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Article Card ─────────────────────────────────────────────────────────────

interface ArticleCardProps {
  card: BrainDumpCard;
  openIssues: OpenIssue[];
}

export function ArticleCard({ card, openIssues }: ArticleCardProps) {
  const [addedToIssues, setAddedToIssues] = useState<Set<string>>(new Set());

  const wasAdded = addedToIssues.size > 0;

  return (
    <article className="rounded-xl border bg-card flex flex-col gap-0 hover:shadow-sm transition-shadow overflow-hidden">
      {/* Card body */}
      <div className="p-5 flex flex-col gap-3 flex-1">
        {/* Source badge + topic tags */}
        <div className="flex items-start justify-between gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold shrink-0",
              getSourceColor(card.source)
            )}
          >
            {card.source}
          </span>
          <div className="flex gap-1 flex-wrap justify-end">
            {card.topicTags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-3">
          {card.title}
        </h3>

        {/* Why it matters */}
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
          {card.whyItMatters}
        </p>

        {/* Key Facts */}
        {card.keyFacts && card.keyFacts.length > 0 && (
          <ul className="space-y-1">
            {card.keyFacts.map((fact, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-foreground/80">
                <span className="mt-0.5 shrink-0 text-muted-foreground">•</span>
                <span className="leading-snug">{fact}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Roberto's angle */}
        {card.robertosAngle && (
          <blockquote className="border-l-2 border-primary/40 pl-3 text-xs italic text-muted-foreground leading-relaxed">
            {card.robertosAngle}
          </blockquote>
        )}
      </div>

      {/* Card footer */}
      <div className="px-5 py-3 border-t bg-muted/20 flex items-center justify-between gap-2">
        {/* Published time */}
        <span className="text-[11px] text-muted-foreground shrink-0">
          {card.publishedAt}
        </span>

        <div className="flex items-center gap-2">
          {/* Added badge */}
          {wasAdded && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-green-700">
              <Check className="h-3 w-3" />
              Added
            </span>
          )}

          {/* Open article link */}
          <a
            href={card.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Open article"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>

          {/* Add to edition dropdown */}
          {!wasAdded ? (
            <EditionDropdown
              openIssues={openIssues}
              cardUrl={card.url}
              onAdded={(issueId) =>
                setAddedToIssues((prev) => { const next = new Set(prev); next.add(issueId); return next; })
              }
            />
          ) : (
            <button
              disabled
              className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-medium bg-green-100 text-green-700 cursor-default"
            >
              <Check className="h-3 w-3" />
              Added
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
