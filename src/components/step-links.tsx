"use client";

import { useState, useRef, useEffect } from "react";
import { addLink, removeLink, updateLinkToneNote, uploadAudio } from "@/lib/actions/links";
import { setIssueStep } from "@/lib/actions/issues";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
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

export function StepLinks({ issueId, links }: Props) {
  const [urlFields, setUrlFields] = useState<string[]>([""]);
  const [toneNote, setToneNote] = useState("");
  const [adding, setAdding] = useState(false);

  function updateUrlField(index: number, value: string) {
    setUrlFields((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function addUrlField() {
    setUrlFields((prev) => [...prev, ""]);
  }

  function removeUrlField(index: number) {
    setUrlFields((prev) => {
      if (prev.length <= 1) return [""];
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleAddLinks() {
    const urlList = urlFields
      .map((u) => u.trim())
      .filter((u) => u.length > 0 && (u.startsWith("http://") || u.startsWith("https://")));
    if (urlList.length === 0) return;
    setAdding(true);
    // All URLs in this batch share one subject group
    const groupId = crypto.randomUUID();
    try {
      for (const url of urlList) {
        await addLink(issueId, url, toneNote.trim() || undefined, groupId);
      }
      setUrlFields([""]);
      setToneNote("");
    } finally {
      setAdding(false);
    }
  }

  const urlCount = urlFields.filter(
    (u) => u.trim().startsWith("http://") || u.trim().startsWith("https://")
  ).length;

  async function handleAudioUpload(linkId: string, file: File) {
    const formData = new FormData();
    formData.append("audio", file);
    await uploadAudio(linkId, formData);
  }

  const subjectGroups = groupLinksBySubject(links);
  const subjectCount = subjectGroups.length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Add Links</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Drop the links you collected during the week. For each subject, tell me
          briefly what you think about it and, if you prefer, record a quick
          voice memo instead of typing. You need at least 3 subjects for a full issue.
        </p>
      </div>

      {/* Add link form */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="space-y-2">
            {urlFields.map((url, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  placeholder="https://example.com/article"
                  value={url}
                  onChange={(e) => updateUrlField(index, e.target.value)}
                  className="font-mono text-sm"
                />
                {urlFields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeUrlField(index)}
                    className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                    title="Remove this URL"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM6.75 9.25a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addUrlField}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors pt-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" clipRule="evenodd" />
              </svg>
              Add another URL (same subject)
            </button>
            {urlCount > 1 && (
              <p className="text-xs text-muted-foreground">
                {urlCount} URLs will be grouped under the same subject.
              </p>
            )}
          </div>
          <Textarea
            placeholder="What do you think about this subject? e.g. 'This confirms what I've been saying about China's industrial policy' or 'I'm skeptical, feels like hype'"
            value={toneNote}
            onChange={(e) => setToneNote(e.target.value)}
            rows={2}
          />
          <Button onClick={handleAddLinks} disabled={urlCount === 0 || adding}>
            {adding
              ? "Adding..."
              : urlCount > 1
              ? `Add ${urlCount} sources as 1 subject`
              : "Add subject"}
          </Button>
        </CardContent>
      </Card>

      {/* Subject group list */}
      {subjectGroups.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            {subjectCount} subject{subjectCount !== 1 ? "s" : ""} added
            {links.length !== subjectCount && (
              <span className="ml-1">({links.length} URLs total)</span>
            )}
          </h3>
          {subjectGroups.map(([groupKey, groupLinks], groupIndex) => (
            <SubjectGroupCard
              key={groupKey}
              groupKey={groupKey}
              groupIndex={groupIndex}
              links={groupLinks}
              issueId={issueId}
              onRemoveLink={(linkId) => removeLink(linkId)}
              onToneNoteChange={(linkId, note) => updateLinkToneNote(linkId, note)}
              onAudioUpload={(linkId, file) => handleAudioUpload(linkId, file)}
            />
          ))}
        </div>
      )}

      {/* Navigation */}
      <div className="flex flex-col items-end gap-2 pt-4">
        <Button
          onClick={() => setIssueStep(issueId, "select")}
          disabled={subjectCount < 3}
        >
          Next: Select Final 3
        </Button>
        {subjectCount > 0 && subjectCount < 3 && (
          <p className="text-xs text-muted-foreground">
            Add at least {3 - subjectCount} more subject{3 - subjectCount !== 1 ? "s" : ""} to continue (minimum 3).
          </p>
        )}
      </div>
    </div>
  );
}

// ---- Subject Group Card ----

function SubjectGroupCard({
  groupKey,
  groupIndex,
  links,
  issueId,
  onRemoveLink,
  onToneNoteChange,
  onAudioUpload,
}: {
  groupKey: string;
  groupIndex: number;
  links: LinkItem[];
  issueId: string;
  onRemoveLink: (linkId: string) => void;
  onToneNoteChange: (linkId: string, note: string) => void;
  onAudioUpload: (linkId: string, file: File) => Promise<void>;
}) {
  const primaryLink = links[0];
  const [editingTone, setEditingTone] = useState(false);
  const [toneValue, setToneValue] = useState(primaryLink.toneNote || "");
  const [addingUrl, setAddingUrl] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [savingUrl, setSavingUrl] = useState(false);

  // Group's tone note is from the primary link
  const sharedToneNote = primaryLink.toneNote;

  async function handleAddUrl() {
    const trimmed = newUrl.trim();
    if (!trimmed || (!trimmed.startsWith("http://") && !trimmed.startsWith("https://"))) return;
    setSavingUrl(true);
    try {
      // Use groupKey as the subjectGroup for the new link
      // groupKey is either link.subjectGroup or link.id — both work as the group identifier
      await addLink(issueId, trimmed, primaryLink.toneNote || undefined, groupKey);
      setNewUrl("");
      setAddingUrl(false);
    } finally {
      setSavingUrl(false);
    }
  }

  async function handleSaveToneNote() {
    // Update tone note for all links in this group
    for (const link of links) {
      await updateLinkToneNote(link.id, toneValue);
    }
    setEditingTone(false);
  }

  return (
    <Card className="border-l-4 border-l-primary/20">
      <CardContent className="p-4 space-y-3">
        {/* Subject header */}
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-semibold text-primary uppercase tracking-wide">
            Subject {groupIndex + 1}
          </span>
          <span className="text-xs text-muted-foreground">
            {links.length} URL{links.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Shared tone note */}
        {!editingTone && (
          <div>
            {sharedToneNote ? (
              <p
                className="text-xs bg-muted px-2 py-1.5 rounded cursor-pointer hover:bg-muted/80"
                onClick={() => setEditingTone(true)}
              >
                <span className="font-medium">Your take:</span> {sharedToneNote}
              </p>
            ) : (
              <button
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setEditingTone(true)}
              >
                + Add your thoughts on this subject
              </button>
            )}
          </div>
        )}
        {editingTone && (
          <div className="space-y-2">
            <Textarea
              value={toneValue}
              onChange={(e) => setToneValue(e.target.value)}
              placeholder="What do you think about this subject?"
              rows={2}
              className="text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveToneNote}>
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setToneValue(primaryLink.toneNote || "");
                  setEditingTone(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Links in this group */}
        <div className="space-y-2">
          {links.map((link) => (
            <LinkRow
              key={link.id}
              link={link}
              onRemove={() => onRemoveLink(link.id)}
              onAudioUpload={(file) => onAudioUpload(link.id, file)}
            />
          ))}
        </div>

        {/* Add another URL to this group */}
        <div>
          {!addingUrl ? (
            <button
              type="button"
              onClick={() => setAddingUrl(true)}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" clipRule="evenodd" />
              </svg>
              Add another URL to this subject
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <Input
                placeholder="https://another-source.com/article"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="font-mono text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddUrl();
                }}
              />
              <Button
                size="sm"
                onClick={handleAddUrl}
                disabled={savingUrl || !newUrl.trim().startsWith("http")}
              >
                {savingUrl ? "Adding..." : "Add"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setAddingUrl(false); setNewUrl(""); }}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Link Row (inside a subject group) ----

function LinkRow({
  link,
  onRemove,
  onAudioUpload,
}: {
  link: LinkItem;
  onRemove: () => void;
  onAudioUpload: (file: File) => Promise<void>;
}) {
  const [micError, setMicError] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const { isRecording, recordingTime, startRecording, stopRecording, formatTime } =
    useAudioRecorder();

  async function handleStartRecording() {
    setMicError(false);
    const ok = await startRecording();
    if (!ok) setMicError(true);
  }

  async function handleStopRecording() {
    const file = await stopRecording();
    if (file) {
      setTranscribing(true);
      try {
        await onAudioUpload(file);
      } finally {
        setTranscribing(false);
      }
    }
  }

  return (
    <div className="flex items-start gap-2 p-2 rounded bg-muted/40">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">
          {link.metaTitle || link.url}
        </p>
        {link.metaDescription && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {link.metaDescription}
          </p>
        )}
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline mt-0.5 block truncate"
        >
          {link.url}
        </a>

        {/* Audio controls */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {link.audioTranscript ? (
            <div className="w-full">
              <span className="text-xs text-green-700 font-medium">Voice memo transcribed</span>
              <p className="text-xs text-muted-foreground italic mt-0.5 line-clamp-2">
                &ldquo;{link.audioTranscript}&rdquo;
              </p>
            </div>
          ) : transcribing ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse">
              <svg className="w-3 h-3 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Transcribing…
            </span>
          ) : isRecording ? (
            <>
              <span className="inline-flex items-center gap-1.5 text-xs text-red-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Recording {formatTime(recordingTime)}
              </span>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleStopRecording}
                className="h-6 text-xs"
              >
                Stop
              </Button>
            </>
          ) : (
            <>
              <button
                onClick={handleStartRecording}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-red-400">
                  <path d="M7 4a3 3 0 0 1 6 0v6a3 3 0 1 1-6 0V4Z" />
                  <path d="M5.5 9.643a.75.75 0 0 0-1.5 0V10c0 3.06 2.29 5.585 5.25 5.954V17.5h-1.5a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-1.5v-1.546A6.001 6.001 0 0 0 16 10v-.357a.75.75 0 0 0-1.5 0V10a4.5 4.5 0 0 1-9 0v-.357Z" />
                </svg>
                Voice memo
              </button>
              {micError && (
                <span className="text-xs text-destructive">
                  Mic unavailable.
                </span>
              )}
            </>
          )}
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="text-destructive shrink-0 h-7 px-2"
        onClick={onRemove}
      >
        Remove
      </Button>
    </div>
  );
}

// ---- Audio Recorder Hook ----

function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function startRecording(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4",
      });
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);

      return true;
    } catch {
      return false;
    }
  }

  function stopRecording(): Promise<File | null> {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder || mediaRecorder.state === "inactive") {
        resolve(null);
        return;
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mediaRecorder.mimeType,
        });
        const ext = mediaRecorder.mimeType.includes("webm") ? "webm" : "m4a";
        const file = new File([blob], `voice-memo.${ext}`, {
          type: mediaRecorder.mimeType,
        });

        mediaRecorder.stream.getTracks().forEach((t) => t.stop());

        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setIsRecording(false);
        setRecordingTime(0);
        resolve(file);
      };

      mediaRecorder.stop();
    });
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  return { isRecording, recordingTime, startRecording, stopRecording, formatTime };
}
