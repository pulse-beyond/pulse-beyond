"use client";

import { useState, useRef, useEffect } from "react";
import { ExternalLink, Plus, ChevronDown, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { addBacklogItem, deleteBacklogItem, addBacklogItemToEdition } from "@/lib/actions/backlog";
import type { BacklogItem, OpenIssue } from "@/types/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─── Edition Dropdown (same pattern as article-card.tsx) ──────────────────────

interface EditionDropdownProps {
  openIssues: OpenIssue[];
  url: string;
  onAdded: () => void;
}

function EditionDropdown({ openIssues, url, onAdded }: EditionDropdownProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  async function handleSelect(issueId: string) {
    setLoading(issueId);
    const result = await addBacklogItemToEdition(url, issueId);
    setLoading(null);
    if (result.success) {
      onAdded();
      setOpen(false);
    } else {
      alert(`Could not add to edition: ${result.error}`);
    }
  }

  if (openIssues.length === 0) {
    return (
      <span className="text-[11px] text-muted-foreground italic">No open editions</span>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <Plus className="h-3 w-3" />
        Add to edition
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute bottom-full mb-1 left-0 z-50 min-w-[240px] max-h-64 overflow-y-auto rounded-lg border bg-white shadow-xl py-1" style={{ backgroundColor: "white" }}>
          <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Choose an edition
          </p>
          {openIssues.map((issue) => (
            <button
              key={issue.id}
              onClick={() => handleSelect(issue.id)}
              disabled={loading === issue.id}
              className="w-full text-left px-3 py-2 text-[12px] hover:bg-muted transition-colors flex items-center justify-between gap-2 disabled:opacity-60"
            >
              <span className="font-medium text-foreground">
                {issue.publishDate ?? issue.title.replace(/^Snapshot - /, "")}
              </span>
              {loading === issue.id && (
                <Loader2 className="h-3 w-3 animate-spin shrink-0 text-muted-foreground" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Backlog Card ──────────────────────────────────────────────────────────────

interface BacklogCardProps {
  item: BacklogItem;
  openIssues: OpenIssue[];
}

function BacklogCard({ item, openIssues }: BacklogCardProps) {
  const [added, setAdded] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const domain = (() => {
    try { return new URL(item.url).hostname.replace(/^www\./, ""); }
    catch { return item.url; }
  })();

  const savedAt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(item.createdAt));

  return (
    <article className="rounded-xl border bg-card flex flex-col hover:shadow-sm transition-shadow overflow-hidden">
      <div className="p-5 flex flex-col gap-2 flex-1">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
            {domain}
          </span>
          <span className="text-[11px] text-muted-foreground ml-auto">saved {savedAt}</span>
        </div>

        <h3 className="text-sm font-semibold text-foreground leading-snug">
          {item.metaTitle ?? item.url}
        </h3>

        {item.metaDescription && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {item.metaDescription}
          </p>
        )}

        {item.note && (
          <blockquote className="border-l-2 border-primary/40 pl-3 text-xs italic text-muted-foreground leading-relaxed">
            {item.note}
          </blockquote>
        )}
      </div>

      <div className="px-5 py-3 border-t bg-muted/20 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {confirmingDelete ? (
            <>
              <span className="text-xs text-muted-foreground">Delete this item?</span>
              <Button
                size="sm"
                variant="destructive"
                className="h-6 text-xs"
                onClick={() => deleteBacklogItem(item.id)}
              >
                Confirm
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs"
                onClick={() => setConfirmingDelete(false)}
              >
                Cancel
              </Button>
            </>
          ) : (
            <button
              onClick={() => setConfirmingDelete(true)}
              className="flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
              title="Delete item"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Open article"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>

          {added ? (
            <span className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-medium bg-green-100 text-green-700">
              Added
            </span>
          ) : (
            <EditionDropdown
              openIssues={openIssues}
              url={item.url}
              onAdded={() => setAdded(true)}
            />
          )}
        </div>
      </div>
    </article>
  );
}

// ─── Add Form ─────────────────────────────────────────────────────────────────

function AddBacklogForm() {
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;
    setLoading(true);
    setError(null);
    const result = await addBacklogItem(trimmedUrl, note || undefined);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setUrl("");
      setNote("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-xl border bg-card p-4">
      <div className="flex gap-2">
        <Input
          type="url"
          placeholder="https://example.com/article"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="font-mono text-sm flex-1"
          required
        />
        <Input
          placeholder="Your take (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="text-sm flex-1"
        />
        <Button type="submit" disabled={loading || !url.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}

// ─── Backlog Tab ───────────────────────────────────────────────────────────────

interface BacklogTabProps {
  items: BacklogItem[];
  openIssues: OpenIssue[];
}

export function BacklogTab({ items, openIssues }: BacklogTabProps) {
  return (
    <div className="space-y-6">
      <AddBacklogForm />

      {items.length === 0 ? (
        <div className="rounded-lg border bg-muted/30 px-6 py-16 text-center">
          <p className="text-muted-foreground text-sm">No saved items yet.</p>
          <p className="text-muted-foreground text-xs mt-1">Paste a URL above to start your backlog.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((item) => (
            <BacklogCard key={item.id} item={item} openIssues={openIssues} />
          ))}
        </div>
      )}
    </div>
  );
}
