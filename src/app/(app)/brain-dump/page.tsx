import type { Metadata } from "next";
import { Lightbulb } from "lucide-react";
import { FeedFilters } from "@/components/brain-dump/feed-filters";
import { BrainDumpRefreshButton } from "@/components/brain-dump/brain-dump-refresh-button";
import { getCachedBrainDump, getOpenIssues } from "@/lib/actions/brain-dump";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Brain Dump | Snapshot Builder",
  description: "Curated articles to inspire your next Snapshot edition",
};

export default async function BrainDumpPage() {
  const [{ cards, fetchedAt }, openIssues] = await Promise.all([
    getCachedBrainDump(),
    getOpenIssues(),
  ]);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
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
        <BrainDumpRefreshButton fetchedAt={fetchedAt} />
      </div>

      {/* Feed */}
      {cards.length === 0 ? (
        <div className="rounded-lg border bg-muted/30 px-6 py-16 text-center">
          <p className="text-muted-foreground text-sm mb-1">No articles cached yet.</p>
          <p className="text-muted-foreground text-xs">Click <strong>Refresh</strong> to fetch this week&apos;s top stories.</p>
        </div>
      ) : (
        <FeedFilters cards={cards} openIssues={openIssues} />
      )}
    </div>
  );
}
