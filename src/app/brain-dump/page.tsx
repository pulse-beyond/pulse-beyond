import type { Metadata } from "next";
import { Suspense } from "react";
import { Lightbulb, Loader2 } from "lucide-react";
import { FeedFilters } from "@/components/brain-dump/feed-filters";
import { fetchBrainDumpCards, getOpenIssues } from "@/lib/actions/brain-dump";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Brain Dump | Pulse Beyond",
  description: "Curated articles to inspire your next newsletter issue",
};

async function BrainDumpFeed() {
  let cards;
  let openIssues;

  try {
    [cards, openIssues] = await Promise.all([
      fetchBrainDumpCards(),
      getOpenIssues(),
    ]);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error";
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-5 text-sm text-red-800">
        <strong>Could not load articles.</strong>{" "}
        <span className="text-red-700">{message}</span>
        <p className="mt-1 text-red-600 text-xs">
          Please check that OPENAI_API_KEY is configured and try refreshing the page.
        </p>
      </div>
    );
  }

  return <FeedFilters cards={cards} openIssues={openIssues} />;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Searching the web for this week&apos;s top stories…</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border bg-card p-5 space-y-3 animate-pulse"
          >
            <div className="flex gap-2">
              <div className="h-5 w-24 rounded-full bg-muted" />
              <div className="h-5 w-16 rounded-full bg-muted" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full rounded bg-muted" />
              <div className="h-4 w-4/5 rounded bg-muted" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-3/4 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BrainDumpPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary mt-0.5">
          <Lightbulb className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Brain Dump</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            This week&apos;s top stories curated by AI — select any card to add it directly to an edition.
          </p>
        </div>
      </div>

      {/* Feed with Suspense */}
      <Suspense fallback={<LoadingSkeleton />}>
        <BrainDumpFeed />
      </Suspense>
    </div>
  );
}
