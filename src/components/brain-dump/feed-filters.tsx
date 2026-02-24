"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ArticleCard } from "@/components/brain-dump/article-card";

const TOPICS = ["All", "Business", "Finance", "Leadership", "Tech"];

interface Article {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  readingTime?: string;
  topic: string;
  excerpt?: string;
}

interface FeedFiltersProps {
  articles: Article[];
}

export function FeedFilters({ articles }: FeedFiltersProps) {
  const [activeTopic, setActiveTopic] = useState("All");

  const filtered =
    activeTopic === "All"
      ? articles
      : articles.filter((a) => a.topic === activeTopic);

  return (
    <div className="space-y-6">
      {/* Topic filter tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {TOPICS.map((topic) => (
          <button
            key={topic}
            onClick={() => setActiveTopic(topic)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              activeTopic === topic
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            {topic}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} article{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Article grid */}
      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No articles for this topic yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((article, idx) => (
            <ArticleCard key={idx} {...article} />
          ))}
        </div>
      )}
    </div>
  );
}
