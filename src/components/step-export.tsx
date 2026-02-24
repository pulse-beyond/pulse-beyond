"use client";

import { useState } from "react";
import { buildExport } from "@/lib/actions/export";
import { setIssueStep } from "@/lib/actions/issues";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import type { Export } from "@prisma/client";

interface Props {
  issueId: string;
  latestExport: Export | null;
}

export function StepExport({ issueId, latestExport }: Props) {
  const [content, setContent] = useState(latestExport?.content || "");
  const [building, setBuilding] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleBuild(format: "txt" | "md") {
    setBuilding(true);
    try {
      const result = await buildExport(issueId, format);
      setContent(result);
    } finally {
      setBuilding(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }


  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Step F: Export</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Generate the final newsletter text. Edit if needed, then copy to clipboard.
        </p>
      </div>

      <div className="flex gap-2">
        <Button onClick={() => handleBuild("txt")} disabled={building}>
          {building ? "Building..." : "Generate Now"}
        </Button>
      </div>

      {content && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={25}
              className="font-mono text-sm"
            />
            <div className="flex gap-2">
              <Button onClick={handleCopy}>
                {copied ? "Copied!" : "Copy to Clipboard"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3 pt-4">
        <Button
          variant="outline"
          onClick={() => setIssueStep(issueId, "shorten")}
        >
          Back
        </Button>
        <Button onClick={() => setIssueStep(issueId, "image")}>
          Next: Cover Image
        </Button>
      </div>
    </div>
  );
}
