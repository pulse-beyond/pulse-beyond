"use client";

import { useState } from "react";
import { ExternalLink, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ArticleCardProps {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  readingTime?: string;
  topic: string;
  excerpt?: string;
}

const SOURCE_COLORS: Record<string, string> = {
  "Financial Times": "bg-pink-100 text-pink-700",
  Bloomberg: "bg-blue-100 text-blue-700",
  HBR: "bg-red-100 text-red-700",
  "MIT Tech Review": "bg-purple-100 text-purple-700",
  "The Economist": "bg-red-100 text-red-800",
  Axios: "bg-orange-100 text-orange-700",
};

export function ArticleCard({
  title,
  source,
  url,
  publishedAt,
  readingTime,
  topic,
  excerpt,
}: ArticleCardProps) {
  const [starred, setStarred] = useState(false);
  const sourceColor =
    SOURCE_COLORS[source] ?? "bg-secondary text-secondary-foreground";

  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-3 hover:border-border/80 transition-colors">
      {/* Top: source badge + topic */}
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
            sourceColor
          )}
        >
          {source}
        </span>
        <span className="text-[11px] text-muted-foreground">{topic}</span>
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-3">
        {title}
      </h3>

      {/* Excerpt */}
      {excerpt && (
        <p className="text-xs text-muted-foreground line-clamp-2">{excerpt}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-1">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>{publishedAt}</span>
          {readingTime && (
            <>
              <span>·</span>
              <span>{readingTime}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setStarred(!starred)}
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
              starred
                ? "bg-amber-100 text-amber-700"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            title={starred ? "Remove from interesting" : "Mark as interesting"}
          >
            <Star
              className={cn(
                "h-3.5 w-3.5",
                starred && "fill-amber-500 text-amber-500"
              )}
            />
            {starred ? "Saved" : "Interesting"}
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Open article"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
