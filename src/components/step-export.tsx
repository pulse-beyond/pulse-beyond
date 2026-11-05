"use client";

import { useRef, useState } from "react";
import { buildExport } from "@/lib/actions/export";
import { setIssueStep } from "@/lib/actions/issues";
import { Button } from "@/components/ui/button";
import { RichDraftEditor, type RichDraftEditorHandle } from "@/components/rich-draft-editor";
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
  const editorRef = useRef<RichDraftEditorHandle>(null);

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
    await editorRef.current?.copy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }


  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Step F: Export</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Generate the final newsletter text. Edit it right here, then copy. Formatting (headings, bold, spacing) is kept when you paste into the LinkedIn article editor.
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          variant={content ? "outline" : "default"}
          onClick={() => handleBuild("txt")}
          disabled={building}
        >
          {building ? "Building..." : content ? "Regenerate" : "Generate Now"}
        </Button>
      </div>

      {content && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <RichDraftEditor ref={editorRef} text={content} />
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleCopy}>
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
        <Button variant={content ? "default" : "outline"} onClick={() => setIssueStep(issueId, "image")}>
          Next: Cover Image
        </Button>
      </div>
    </div>
  );
}
