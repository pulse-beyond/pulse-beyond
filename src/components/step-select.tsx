"use client";

import { useState } from "react";
import { selectFinalLinks } from "@/lib/actions/links";
import { setIssueStep } from "@/lib/actions/issues";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LinkItem } from "@prisma/client";

interface Props {
  issueId: string;
  links: LinkItem[];
}

export function StepSelect({ issueId, links }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(links.filter((l) => l.selected).map((l) => l.id))
  );
  const [saving, setSaving] = useState(false);
  const [limitHit, setLimitHit] = useState(false);

  function toggleSelection(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
      setLimitHit(false);
    } else {
      if (next.size >= 3) {
        setLimitHit(true);
        return;
      }
      setLimitHit(false);
      next.add(id);
    }
    setSelectedIds(next);
  }

  async function handleConfirm() {
    setSaving(true);
    try {
      await selectFinalLinks(issueId, Array.from(selectedIds));
      await setIssueStep(issueId, "generate");
    } finally {
      setSaving(false);
    }
  }

  // If 3 or fewer links, auto-advance
  if (links.length <= 3) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-1">Step B: Select Final 3</h2>
          <p className="text-sm text-muted-foreground mb-4">
            You have {links.length} link{links.length !== 1 ? "s" : ""}. All
            will be used.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setIssueStep(issueId, "links")}>
            Back
          </Button>
          <Button
            onClick={async () => {
              await selectFinalLinks(
                issueId,
                links.map((l) => l.id)
              );
              await setIssueStep(issueId, "generate");
            }}
          >
            Use All and Continue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Step B: Select Final 3</h2>
        <p className="text-sm text-muted-foreground mb-2">
          Pick exactly 3 links for this issue. Selected: {selectedIds.size}/3
        </p>
        {limitHit && (
          <p className="text-sm text-amber-600 mb-4">
            You've already selected 3. Feel free to deselect one and swap it if you'd like to change your picks.
          </p>
        )}
      </div>

      <div className="space-y-3">
        {links.map((link) => {
          const isSelected = selectedIds.has(link.id);
          return (
            <Card
              key={link.id}
              className={cn(
                "cursor-pointer transition-colors",
                isSelected
                  ? "ring-2 ring-primary bg-primary/5"
                  : "hover:bg-accent/50"
              )}
              onClick={() => toggleSelection(link.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center",
                      isSelected
                        ? "border-primary bg-primary"
                        : "border-muted-foreground"
                    )}
                  >
                    {isSelected && (
                      <span className="text-white text-xs font-bold">
                        {Array.from(selectedIds).indexOf(link.id) + 1}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {link.metaTitle || link.url}
                    </p>
                    {link.toneNote && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Tone: {link.toneNote}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col items-start gap-2 pt-4">
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setIssueStep(issueId, "links")}>
            Back
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedIds.size !== 3 || saving}
          >
            {saving ? "Saving..." : "Continue with 3 selected"}
          </Button>
        </div>
        {selectedIds.size > 0 && selectedIds.size < 3 && (
          <p className="text-xs text-muted-foreground">
            Select {3 - selectedIds.size} more source{3 - selectedIds.size !== 1 ? "s" : ""} to continue (exactly 3 required).
          </p>
        )}
      </div>
    </div>
  );
}
