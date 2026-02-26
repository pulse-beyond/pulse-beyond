"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addEvent, removeEvent, updateEvent, fetchUpcomingEvents, toggleEventIncluded } from "@/lib/actions/events";
import { setIssueStep } from "@/lib/actions/issues";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import type { EventItem } from "@prisma/client";

interface Props {
  issueId: string;
  events: EventItem[];
  publishDate: string | null; // ISO string
}

const LOADING_PHRASES = [
  "🔍 Vasculhando o calendário geopolítico... quem disse que política é chata?",
  "🌍 Escaneando o mundo em busca dos próximos acontecimentos...",
  "📅 Cruzando datas, conferências e eleições... já já sai!",
  "🗳️ Procurando eleições, cúpulas e decisões que vão dar o que falar...",
  "🛰️ Rastreando eventos como um satélite geopolítico...",
  "☕ Analisando o calendário global com calma e café...",
  "🎯 Selecionando os eventos mais relevantes para o Roberto...",
  "🧠 Conectando pontos entre política, economia e tecnologia...",
  "📡 Sintonizando nas frequências do que importa essa semana...",
];

function useLoadingPhrase(active: boolean) {
  const [phrase, setPhrase] = useState("");
  const usedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!active) {
      usedRef.current.clear();
      return;
    }

    function pickPhrase() {
      if (usedRef.current.size >= LOADING_PHRASES.length) {
        usedRef.current.clear();
      }
      let idx: number;
      do {
        idx = Math.floor(Math.random() * LOADING_PHRASES.length);
      } while (usedRef.current.has(idx));
      usedRef.current.add(idx);
      setPhrase(LOADING_PHRASES[idx]);
    }

    pickPhrase();
    const interval = setInterval(pickPhrase, 5000);
    return () => clearInterval(interval);
  }, [active]);

  return phrase;
}

export function StepEvents({ issueId, events, publishDate }: Props) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [weekRange, setWeekRange] = useState<string | null>(null);
  const loadingPhrase = useLoadingPhrase(fetching);

  // Compute display range from publishDate
  const dateRangeLabel = publishDate
    ? (() => {
        const pub = new Date(publishDate);
        const mon = new Date(pub);
        mon.setDate(pub.getDate() + 1);
        const sat = new Date(mon);
        sat.setDate(mon.getDate() + 5);
        const fmt = (d: Date) =>
          d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        return `${fmt(mon)} – ${fmt(sat)}`;
      })()
    : null;

  async function handleFetchEvents() {
    setFetching(true);
    setFetchError(null);
    try {
      const result = await fetchUpcomingEvents(issueId);
      setWeekRange(result.weekRange);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Failed to fetch events");
    } finally {
      setFetching(false);
    }
  }

  async function handleAdd() {
    if (!title.trim() || !date.trim() || !location.trim()) return;
    setAdding(true);
    try {
      await addEvent(issueId, {
        title: title.trim(),
        date: date.trim(),
        location: location.trim(),
        description:
          description.trim() ||
          `Will ${title.trim()} change the game? What should we be watching for?`,
        sourceUrl: sourceUrl.trim() || undefined,
      });
      setTitle("");
      setDate("");
      setLocation("");
      setDescription("");
      setSourceUrl("");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">
          Step D: To Keep an Eye On
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Upcoming events for the &quot;To keep an eye on&quot; section.
          {dateRangeLabel && (
            <> Looking at the week of <strong>{dateRangeLabel}</strong>.</>
          )}
        </p>
      </div>

      {/* Auto-fetch button */}
      <div className="flex items-center gap-3">
        <Button onClick={handleFetchEvents} disabled={fetching}>
          {fetching ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Buscando eventos...
            </span>
          ) : events.length > 0 ? (
            "Search again"
          ) : (
            "Search for events"
          )}
        </Button>
        {!fetching && events.length === 0 && (
          <span className="text-sm text-muted-foreground">
            Based on Control Risks calendar + AI suggestions
          </span>
        )}
      </div>

      {fetching && (
        <p className="text-sm font-medium text-primary animate-pulse">
          {loadingPhrase}
        </p>
      )}

      {fetchError && (
        <p className="text-sm text-destructive">{fetchError}</p>
      )}

      {weekRange && !fetching && events.length > 0 && (
        <p className="text-sm text-muted-foreground">
          ✅ Found {events.length} events for {weekRange}
        </p>
      )}

      {/* Event list */}
      {events.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            {events.length} event{events.length !== 1 ? "s" : ""} found
            {events.filter((e) => e.included).length > 0 && (
              <span className="text-green-600 ml-1">
                ({events.filter((e) => e.included).length} included)
              </span>
            )}
            {" "}— include the ones you want, edit or remove as needed
          </h3>
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}

      {/* Manual add form */}
      <details className="group">
        <summary className="text-sm font-medium cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
          + Add event manually
        </summary>
        <Card className="mt-3">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                placeholder="Event title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Input
                placeholder="Date (e.g. Feb 15, 2025)"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <Input
              placeholder="Location (e.g. San Francisco, CA)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <Textarea
              placeholder="Provocative description as questions (optional, auto-generated if empty)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
            <Input
              placeholder="Source URL (optional)"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
            />
            <Button
              onClick={handleAdd}
              disabled={!title.trim() || !date.trim() || !location.trim() || adding}
            >
              {adding ? "Adding..." : "Add Event"}
            </Button>
          </CardContent>
        </Card>
      </details>

      <div className="flex flex-col gap-2 pt-4">
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setIssueStep(issueId, "generate")}
          >
            Back
          </Button>
          <Button
            onClick={() => setIssueStep(issueId, "shorten")}
            disabled={events.filter((e) => e.included).length === 0}
          >
            Next
          </Button>
        </div>
        {events.length > 0 && events.filter((e) => e.included).length === 0 && (
          <p className="text-sm text-muted-foreground">
            Include at least one event to continue.
          </p>
        )}
      </div>
    </div>
  );
}

function getValidSourceUrl(sourceUrl: string): string | null {
  let href = sourceUrl.trim();
  if (!/^https?:\/\//i.test(href)) href = "https://" + href;
  try {
    new URL(href);
    return href;
  } catch {
    return null;
  }
}

function EventCard({ event }: { event: EventItem }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(event.title);
  const [date, setDate] = useState(event.date);
  const [location, setLocation] = useState(event.location);
  const [description, setDescription] = useState(event.description);
  const [saving, setSaving] = useState(false);

  const hasChanges =
    title !== event.title ||
    date !== event.date ||
    location !== event.location ||
    description !== event.description;

  async function handleSave() {
    setSaving(true);
    try {
      await updateEvent(event.id, {
        title: title.trim(),
        date: date.trim(),
        location: location.trim(),
        description: description.trim(),
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setTitle(event.title);
    setDate(event.date);
    setLocation(event.location);
    setDescription(event.description);
    setEditing(false);
  }

  if (editing) {
    return (
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
            />
            <Input
              value={date}
              onChange={(e) => setDate(e.target.value)}
              placeholder="Date"
            />
          </div>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location"
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Description"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !hasChanges}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={event.included ? "border-green-300 bg-green-50/50" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="font-medium text-sm">{event.title}</p>
            <p className="text-xs text-muted-foreground">
              {event.date} | {event.location}
            </p>
            <p className="text-sm mt-2 italic">{event.description}</p>
            {event.sourceUrl && getValidSourceUrl(event.sourceUrl) && (
              <a
                href={getValidSourceUrl(event.sourceUrl)!}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline mt-1 inline-block"
              >
                {event.title}
              </a>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            <button
              className={`inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-3 transition-colors ${
                event.included
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "border border-green-600 text-green-600 hover:bg-green-50 bg-transparent"
              } ${isPending ? "opacity-50 pointer-events-none" : ""}`}
              onClick={() => {
                startTransition(async () => {
                  await toggleEventIncluded(event.id);
                  router.refresh();
                });
              }}
            >
              {event.included ? "✓ Included" : "Include"}
            </button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(true)}
            >
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => removeEvent(event.id)}
            >
              Remove
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
