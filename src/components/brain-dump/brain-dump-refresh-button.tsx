"use client";

import { useState, useTransition } from "react";
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
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  function handleRefresh() {
    setError(null);
    setWarning(null);
    startTransition(async () => {
      try {
        const res = await refreshBrainDump();
        if (!res.ok) setError(res.error ?? "Refresh failed. The previous stories are still shown.");
        else if (res.warning) setWarning(res.warning);
      } catch (err) {
        // Network drop or the function being killed (e.g. Vercel timeout) never returns a result.
        console.error("Brain Dump refresh failed:", err);
        setError("Refresh failed or timed out. The previous stories are still shown — try again.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
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
      {error && !isPending && (
        <p role="alert" className="max-w-md text-right text-xs text-destructive">{error}</p>
      )}
      {warning && !isPending && (
        <p className="max-w-md text-right text-xs text-amber-700">{warning}</p>
      )}
    </div>
  );
}
