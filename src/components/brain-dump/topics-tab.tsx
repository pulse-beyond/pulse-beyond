"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Loader2, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveBrainDumpConfig } from "@/lib/actions/brain-dump";
import type { BrainDumpConfig, BrainDumpTopic } from "@/types/index";

interface Props {
  config: BrainDumpConfig;
}

export function TopicsTab({ config }: Props) {
  const [topics, setTopics] = useState<BrainDumpTopic[]>(config.topics);
  const [maxPerTopic, setMaxPerTopic] = useState<number>(config.maxPerTopic);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateTopic(index: number, field: keyof BrainDumpTopic, value: string) {
    setTopics((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
    setSaved(false);
  }

  function addTopic() {
    setTopics((prev) => [...prev, { name: "", description: "" }]);
    setSaved(false);
  }

  function removeTopic(index: number) {
    setTopics((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const res = await saveBrainDumpConfig({ topics, maxPerTopic });
      if (res.success) {
        setSaved(true);
      } else {
        setError(res.error ?? "Could not save. Try again.");
      }
    });
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Explainer */}
      <div className="rounded-lg border bg-muted/30 px-4 py-3">
        <p className="text-sm text-muted-foreground">
          These are the topics the web search looks for when curating stories. Add, edit, or remove
          them to shape what shows up under <strong>AI Curated</strong>. The cap below limits how
          many stories any single topic can take, so no theme dominates the edition.
        </p>
      </div>

      {/* Per-topic cap */}
      <div className="flex items-center gap-3">
        <label htmlFor="maxPerTopic" className="text-sm font-medium">
          Max stories per topic
        </label>
        <Input
          id="maxPerTopic"
          type="number"
          min={1}
          max={15}
          value={maxPerTopic}
          onChange={(e) => {
            setMaxPerTopic(Number(e.target.value));
            setSaved(false);
          }}
          className="w-20"
        />
      </div>

      {/* Topic list */}
      <div className="space-y-3">
        {topics.map((topic, i) => (
          <div key={i} className="flex items-start gap-2 rounded-lg border p-3">
            <div className="flex-1 space-y-2">
              <Input
                placeholder="Topic name (e.g. Biotechnology)"
                value={topic.name}
                onChange={(e) => updateTopic(i, "name", e.target.value)}
              />
              <Input
                placeholder="Keywords / sub-themes to monitor (optional)"
                value={topic.description}
                onChange={(e) => updateTopic(i, "description", e.target.value)}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeTopic(i)}
              aria-label="Remove topic"
              className="text-muted-foreground hover:text-destructive shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={addTopic}>
        <Plus className="h-4 w-4 mr-2" />
        Add topic
      </Button>

      {/* Save bar */}
      <div className="flex items-center gap-3 border-t pt-4">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Saving…
            </>
          ) : (
            "Save topics"
          )}
        </Button>
        {saved && !isPending && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <Check className="h-4 w-4" />
            Saved — next Refresh uses these topics.
          </span>
        )}
        {error && <span className="text-sm text-destructive">{error}</span>}
        <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
          <RotateCcw className="h-3 w-3" />
          Changes apply on the next Refresh.
        </span>
      </div>
    </div>
  );
}
