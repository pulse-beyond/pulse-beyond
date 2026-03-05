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

/** Group key for a link: its subjectGroup if set, else its own id */
function getGroupKey(link: LinkItem): string {
  return link.subjectGroup ?? link.id;
}

/** Group links into ordered subjects. Returns array of [groupKey, links[]] preserving first-seen order. */
function groupLinksBySubject(links: LinkItem[]): [string, LinkItem[]][] {
  const map = new Map<string, LinkItem[]>();
  for (const link of links) {
    const key = getGroupKey(link);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(link);
  }
  return Array.from(map.entries());
}

export function StepSelect({ issueId, links }: Props) {
  const subjectGroups = groupLinksBySubject(links);

  // Initialize selection based on which subjects have at least one selected link
  const initialSelected = new Set<string>(
    subjectGroups
      .filter(([, groupLinks]) => groupLinks.some((l) => l.selected))
      .map(([groupKey]) => groupKey)
  );
  const [selectedGroupKeys, setSelectedGroupKeys] = useState<Set<string>>(initialSelected);
  const [saving, setSaving] = useState(false);
  const [limitHit, setLimitHit] = useState(false);

  function toggleSubject(groupKey: string) {
    const next = new Set(selectedGroupKeys);
    if (next.has(groupKey)) {
      next.delete(groupKey);
      setLimitHit(false);
    } else {
      if (next.size >= 3) {
        setLimitHit(true);
        return;
      }
      setLimitHit(false);
      next.add(groupKey);
    }
    setSelectedGroupKeys(next);
  }

  async function handleConfirm() {
    setSaving(true);
    try {
      // Collect all link IDs from selected subject groups
      const selectedIds: string[] = [];
      for (const [groupKey, groupLinks] of subjectGroups) {
        if (selectedGroupKeys.has(groupKey)) {
          selectedIds.push(...groupLinks.map((l) => l.id));
        }
      }
      await selectFinalLinks(issueId, selectedIds);
      await setIssueStep(issueId, "generate");
    } finally {
      setSaving(false);
    }
  }

  // If 3 or fewer subjects, auto-advance
  if (subjectGroups.length <= 3) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-1">Step B: Select Final 3</h2>
          <p className="text-sm text-muted-foreground mb-4">
            You have {subjectGroups.length} subject{subjectGroups.length !== 1 ? "s" : ""}. All
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
          Pick exactly 3 subjects for this issue. Selected: {selectedGroupKeys.size}/3
        </p>
        {limitHit && (
          <p className="text-sm text-amber-600 mb-4">
            You&apos;ve already selected 3. Deselect one to swap it.
          </p>
        )}
      </div>

      <div className="space-y-3">
        {subjectGroups.map(([groupKey, groupLinks], index) => {
          const isSelected = selectedGroupKeys.has(groupKey);
          const selectionOrder = Array.from(selectedGroupKeys).indexOf(groupKey);
          const primaryLink = groupLinks[0];

          return (
            <Card
              key={groupKey}
              className={cn(
                "cursor-pointer transition-colors",
                isSelected
                  ? "ring-2 ring-primary bg-primary/5"
                  : "hover:bg-accent/50"
              )}
              onClick={() => toggleSubject(groupKey)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center mt-0.5",
                      isSelected
                        ? "border-primary bg-primary"
                        : "border-muted-foreground"
                    )}
                  >
                    {isSelected && (
                      <span className="text-white text-xs font-bold">
                        {selectionOrder + 1}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">
                      Subject {index + 1}
                    </p>
                    {primaryLink.toneNote && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {primaryLink.toneNote}
                      </p>
                    )}
                    {/* List all URLs in this subject */}
                    <div className="mt-2 space-y-1">
                      {groupLinks.map((link) => (
                        <p key={link.id} className="text-xs truncate text-muted-foreground">
                          • {link.metaTitle || link.url}
                        </p>
                      ))}
                    </div>
                  </div>
                  {groupLinks.length > 1 && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {groupLinks.length} URLs
                    </span>
                  )}
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
            disabled={selectedGroupKeys.size !== 3 || saving}
          >
            {saving ? "Saving..." : "Continue with 3 selected"}
          </Button>
        </div>
        {selectedGroupKeys.size > 0 && selectedGroupKeys.size < 3 && (
          <p className="text-xs text-muted-foreground">
            Select {3 - selectedGroupKeys.size} more subject{3 - selectedGroupKeys.size !== 1 ? "s" : ""} to continue (exactly 3 required).
          </p>
        )}
      </div>
    </div>
  );
}
