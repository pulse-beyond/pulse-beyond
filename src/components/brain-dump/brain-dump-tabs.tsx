"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { FeedFilters } from "./feed-filters";
import { BacklogTab } from "./backlog-tab";
import { BrainDumpRefreshButton } from "./brain-dump-refresh-button";
import type { BrainDumpCard, BacklogItem, OpenIssue } from "@/types/index";

interface BrainDumpTabsProps {
  cards: BrainDumpCard[];
  backlogItems: BacklogItem[];
  openIssues: OpenIssue[];
  fetchedAt: Date | null;
}

export function BrainDumpTabs({ cards, backlogItems, openIssues, fetchedAt }: BrainDumpTabsProps) {
  const [tab, setTab] = useState<"ai" | "manual">("ai");

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex items-center justify-between gap-4 border-b">
        <div className="flex gap-0">
          {(["ai", "manual"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                tab === t
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "ai" ? "AI Curated" : `Manual Backlog${backlogItems.length > 0 ? ` (${backlogItems.length})` : ""}`}
            </button>
          ))}
        </div>

        {tab === "ai" && <BrainDumpRefreshButton fetchedAt={fetchedAt} />}
      </div>

      {/* Tab content */}
      {tab === "ai" ? (
        cards.length === 0 ? (
          <div className="rounded-lg border bg-muted/30 px-6 py-16 text-center">
            <p className="text-muted-foreground text-sm mb-1">No articles cached yet.</p>
            <p className="text-muted-foreground text-xs">Click <strong>Refresh</strong> to fetch this week&apos;s top stories.</p>
          </div>
        ) : (
          <FeedFilters cards={cards} openIssues={openIssues} />
        )
      ) : (
        <BacklogTab items={backlogItems} openIssues={openIssues} />
      )}
    </div>
  );
}
