"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { deleteIssue } from "@/lib/actions/issues";

interface DeleteIssueButtonProps {
  issueId: string;
  issueTitle: string;
}

export function DeleteIssueButton({ issueId, issueTitle }: DeleteIssueButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault(); // prevent Link navigation
    e.stopPropagation();

    if (!confirming) {
      setConfirming(true);
      // Auto-reset confirm state after 3 seconds if not clicked
      setTimeout(() => setConfirming(false), 3000);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await deleteIssue(issueId);
      // deleteIssue redirects on success, so no need to reset state
    } catch (err) {
      // redirect() surfaces as a NEXT_REDIRECT error — that's success, not failure
      if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) return;
      setLoading(false);
      setConfirming(false);
      setError("Não foi possível apagar. Recarregue a página e tente de novo.");
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
        onClick={handleDelete}
        title={confirming ? "Click again to confirm deletion" : `Delete "${issueTitle}"`}
        className={[
          "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
          confirming
            ? "bg-red-100 text-red-700 hover:bg-red-200"
            : "text-muted-foreground hover:bg-muted hover:text-red-600",
        ].join(" ")}
      >
        <Trash2 className="h-3.5 w-3.5" />
        {confirming ? "Confirm?" : "Delete"}
      </button>
      {error && <p className="max-w-[12rem] text-right text-xs text-red-600">{error}</p>}
    </div>
  );
}
