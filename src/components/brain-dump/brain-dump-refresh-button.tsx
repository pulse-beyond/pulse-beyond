"use client";

import { useTransition } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { refreshBrainDump } from "@/lib/actions/brain-dump";

interface Props {
  fetchedAt: Date | null;
}

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function BrainDumpRefreshButton({ fetchedAt }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleRefresh() {
    startTransition(async () => {
      await refreshBrainDump();
    });
  }

  return (
    <div className="flex items-center gap-3">
      {fetchedAt && !isPending && (
        <span className="text-xs text-muted-foreground">
          Updated {formatRelativeTime(new Date(fetchedAt))}
        </span>
      )}
      {isPending && (
        <span className="text-xs text-muted-foreground animate-pulse">
          Searching the web…
        </span>
      )}
      <Button
        onClick={handleRefresh}
        disabled={isPending}
        variant="outline"
        size="sm"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Refreshing…
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </>
        )}
      </Button>
    </div>
  );
}
