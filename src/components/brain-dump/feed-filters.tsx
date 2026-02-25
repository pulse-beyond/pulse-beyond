"use client";

import { useState, useMemo } from "react";
import { ArticleCard } from "./article-card";
import type { BrainDumpCard, OpenIssue } from "@/types/index";

interface FeedFiltersProps {
  cards: BrainDumpCard[];
  openIssues: OpenIssue[];
}

export function FeedFilters({ cards, openIssues }: FeedFiltersProps) {
  const [activeTopic, setActiveTopic] = useState("All");

  // Build unique topic list from all topicTags across cards
  const topics = useMemo(() => {
    const tagSet = new Set<string>();
    for (const card of cards) {
      for (const tag of card.topicTags) {
        tagSet.add(tag);
      }
    }
    return ["All", ...Array.from(tagSet).sort()];
  }, [cards]);

  const filtered = useMemo(() => {
    if (activeTopic === "All") return cards;
    return cards.filter((card) => card.topicTags.includes(activeTopic));
  }, [cards, activeTopic]);

  return (
    <div className="space-y-6">
      {/* Topic Filter Tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {topics.map((topic) => (
          <button
            key={topic}
            onClick={() => setActiveTopic(topic)}
            className={[
              "px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors",
              activeTopic === topic
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
            ].join(" ")}
          >
            {topic}
          </button>
        ))}

        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "story" : "stories"}
        </span>
      </div>

      {/* Cards Grid */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground text-sm">
          No stories found for &quot;{activeTopic}&quot;.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((card) => (
            <ArticleCard key={card.id} card={card} openIssues={openIssues} />
          ))}
        </div>
      )}
    </div>
  );
}
