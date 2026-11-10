"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { markAsPublished } from "@/lib/actions/issues";

interface Props {
  issueId: string;
  label?: string;
  size?: "default" | "lg";
}

/**
 * The primary "finish line" action of an edition: marks it as published and moves
 * it to Past Editions. Two-click confirm because it changes the edition's status.
 */
export function ConcludeEditionButton({
  issueId,
  label = "Conclude edition & mark as published",
  size = "default",
}: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 4000);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await markAsPublished(issueId);
      router.push("/past-editions");
    } catch (e) {
      console.error("markAsPublished failed:", e);
      setLoading(false);
      setConfirming(false);
      // Server action errors arrive with opaque/redacted messages in production
      // (or as a redirect to /login if the session expired), so show a clear message.
      setError("Could not mark as published. Reload the page (you may need to sign in again) and try again.");
    }
  }

  return (
    <div className="space-y-1">
      <button
        onClick={handleClick}
        disabled={loading}
        className={[
          "inline-flex items-center justify-center gap-2 rounded-md font-semibold text-white shadow-sm transition-colors",
          "bg-green-600 hover:bg-green-700 disabled:opacity-60",
          size === "lg" ? "h-12 px-6 text-base" : "h-10 px-4 text-sm",
        ].join(" ")}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        {loading ? "Moving to Past Editions..." : confirming ? "Click again to confirm" : label}
      </button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
