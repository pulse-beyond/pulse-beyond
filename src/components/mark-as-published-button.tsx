"use client";

import { useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { markAsPublished } from "@/lib/actions/issues";

interface Props {
  issueId: string;
}

export function MarkAsPublishedButton({ issueId }: Props) {
  const [loading, setLoading] = useState(false);

  async function handlePublish(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    await markAsPublished(issueId);
    // revalidatePath causes page refresh, no need to reset state
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  return (
    <button
      onClick={handlePublish}
      title="Mark as published — moves to Past Editions"
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors text-muted-foreground hover:bg-green-50 hover:text-green-700"
    >
      <CheckCircle className="h-3.5 w-3.5" />
      Publish
    </button>
  );
}
