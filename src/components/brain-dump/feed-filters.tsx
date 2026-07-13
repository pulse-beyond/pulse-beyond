"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { ArticleCard } from "./article-card";
import { cardFilterLabels, AI_LABEL } from "@/lib/topics";
import type { BrainDumpCard, OpenIssue } from "@/types/index";

interface FeedFiltersProps {
  cards: BrainDumpCard[];
  openIssues: OpenIssue[];
}

export function FeedFilters({ cards, openIssues }: FeedFiltersProps) {
  // Unchecked labels = topics the user has hidden. Empty = show everything.
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the dropdown on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Build the label list with per-label card counts; pin "AI" to the top.
  const labels = useMemo(() => {
    const counts = new Map<string, number>();
    for (const card of cards) {
      for (const label of cardFilterLabels(card)) {
        counts.set(label, (counts.get(label) ?? 0) + 1);
      }
    }
    const entries = Array.from(counts.entries());
    entries.sort((a, b) => {
      if (a[0] === AI_LABEL) return -1;
      if (b[0] === AI_LABEL) return 1;
      return a[0].localeCompare(b[0]);
    });
    return entries; // [label, count][]
  }, [cards]);

  const filtered = useMemo(() => {
    if (hidden.size === 0) return cards;
    return cards.filter((card) => cardFilterLabels(card).every((l) => !hidden.has(l)));
  }, [cards, hidden]);

  function toggle(label: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  const hiddenCount = hidden.size;

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen((o) => !o)}
            className={[
              "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
              hiddenCount > 0
                ? "border-primary/40 bg-primary/5 text-foreground"
                : "border-input bg-background text-foreground hover:bg-muted/60",
            ].join(" ")}
            aria-haspopup="true"
            aria-expanded={open}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Topics
            {hiddenCount > 0 && (
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">
                {hiddenCount} hidden
              </span>
            )}
            <ChevronDown className={["h-4 w-4 transition-transform", open ? "rotate-180" : ""].join(" ")} />
          </button>

          {open && (
            <div className="absolute left-0 z-20 mt-2 w-72 rounded-lg border bg-background shadow-lg">
              <div className="flex items-center justify-between border-b px-3 py-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Uncheck a topic to hide its stories
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto py-1">
                {labels.map(([label, count]) => {
                  const isChecked = !hidden.has(label);
                  return (
                    <label
                      key={label}
                      className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-muted/60"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggle(label)}
                        className="h-4 w-4 rounded border-input accent-primary"
                      />
                      <span className={["flex-1", label === AI_LABEL ? "font-semibold" : ""].join(" ")}>
                        {label}
                      </span>
                      <span className="text-xs text-muted-foreground">{count}</span>
                    </label>
                  );
                })}
              </div>
              {hiddenCount > 0 && (
                <div className="border-t px-3 py-2">
                  <button
                    onClick={() => setHidden(new Set())}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Reset — show all
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "story" : "stories"}
        </span>
      </div>

      {/* Cards Grid */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground text-sm">
          No stories match the selected topics.{" "}
          <button onClick={() => setHidden(new Set())} className="text-primary hover:underline">
            Reset
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((card, i) => (
            // Neither id nor url is unique — similar titles slugify the same, and a
            // roundup URL (e.g. a daily "headlines" page) backs several distinct
            // cards. Only the index guarantees a collision-free React key.
            <ArticleCard key={`${card.id}-${i}`} card={card} openIssues={openIssues} />
          ))}
        </div>
      )}
    </div>
  );
}
