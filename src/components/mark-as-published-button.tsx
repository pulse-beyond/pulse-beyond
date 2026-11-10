"use client";

import { useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { markAsPublished } from "@/lib/actions/issues";

interface Props {
  issueId: string;
}

export function MarkAsPublishedButton({ issueId }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await markAsPublished(issueId);
    } catch {
      setLoading(false);
      setConfirming(false);
      setError("Não foi possível marcar como publicada. Recarregue a página e tente de novo.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        onClick={handleClick}
        title={confirming ? "Click again to confirm" : "Mark as published — moves to Past Editions"}
        className={[
          "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
          confirming
            ? "bg-green-100 text-green-700 hover:bg-green-200"
            : "text-muted-foreground hover:bg-muted hover:text-green-700",
        ].join(" ")}
      >
        <CheckCircle className="h-3.5 w-3.5" />
        {confirming ? "Confirm?" : "Add as published"}
      </button>
      {error && <p className="max-w-[12rem] text-right text-xs text-red-600">{error}</p>}
    </div>
  );
}
