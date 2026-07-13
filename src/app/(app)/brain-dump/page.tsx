import type { Metadata } from "next";
import { Lightbulb } from "lucide-react";
import { BrainDumpTabs } from "@/components/brain-dump/brain-dump-tabs";
import { getBalancedBrainDump, getOpenIssues, getBrainDumpConfig } from "@/lib/actions/brain-dump";
import { getBacklogItems } from "@/lib/actions/backlog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Brain Dump | Snapshot Builder",
  description: "Curated articles to inspire your next Snapshot edition",
};

export default async function BrainDumpPage() {
  const [{ cards, fetchedAt }, openIssues, backlogItems, config] = await Promise.all([
    getBalancedBrainDump(),
    getOpenIssues(),
    getBacklogItems(),
    getBrainDumpConfig(),
  ]);

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
            AI-curated stories for this week — or save your own links to use in upcoming editions.
          </p>
        </div>
      </div>

      <BrainDumpTabs
        cards={cards}
        backlogItems={backlogItems}
        openIssues={openIssues}
        fetchedAt={fetchedAt}
        config={config}
      />
    </div>
  );
}
