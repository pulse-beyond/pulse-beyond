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
    try {
      for (const url of urlList) {
        await addLink(issueId, url, toneNote.trim() || undefined);
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Add Links</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Drop the links you collected during the week. For each one, tell me
          briefly what you think about it and, if you prefer, record a quick
          voice memo instead of typing. You need at least 3 for a full issue.
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
              Add another URL
            </button>
            {urlCount > 1 && (
              <p className="text-xs text-muted-foreground">
                {urlCount} URLs will share the same note below.
              </p>
            )}
          </div>
          <Textarea
            placeholder="What do you think about this? e.g. 'This confirms what I've been saying about China's industrial policy' or 'I'm skeptical, feels like hype'"
            value={toneNote}
            onChange={(e) => setToneNote(e.target.value)}
            rows={2}
          />
          <Button onClick={handleAddLinks} disabled={urlCount === 0 || adding}>
            {adding
              ? "Adding..."
              : urlCount > 1
              ? `Add ${urlCount} sources`
              : "Add source"}
          </Button>
        </CardContent>
      </Card>

      {/* Link list */}
      {links.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            {links.length} link{links.length !== 1 ? "s" : ""} added
          </h3>
          {links.map((link) => (
            <LinkCard
              key={link.id}
              link={link}
              issueId={issueId}
              onRemove={() => removeLink(link.id)}
              onToneNoteChange={(note) => updateLinkToneNote(link.id, note)}
              onAudioUpload={(file) => handleAudioUpload(link.id, file)}
            />
          ))}
        </div>
      )}

      {/* Navigation */}
      <div className="flex flex-col items-end gap-2 pt-4">
        <Button
          onClick={() => setIssueStep(issueId, "select")}
          disabled={links.length < 3}
        >
          Next: Select Final 3
        </Button>
        {links.length > 0 && links.length < 3 && (
          <p className="text-xs text-muted-foreground">
            Add at least {3 - links.length} more source{3 - links.length !== 1 ? "s" : ""} to continue (minimum 3).
          </p>
        )}
      </div>
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

        // Stop all tracks
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

// ---- Link Card ----

function LinkCard({
  link,
  issueId,
  onRemove,
  onToneNoteChange,
  onAudioUpload,
}: {
  link: LinkItem;
  issueId: string;
  onRemove: () => void;
  onToneNoteChange: (note: string) => void;
  onAudioUpload: (file: File) => void;
}) {
  const [editingTone, setEditingTone] = useState(false);
  const [toneValue, setToneValue] = useState(link.toneNote || "");
  const [micError, setMicError] = useState(false);
  const [addingUrl, setAddingUrl] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [savingUrl, setSavingUrl] = useState(false);
  const { isRecording, recordingTime, startRecording, stopRecording, formatTime } =
    useAudioRecorder();

  async function handleAddUrl() {
    const trimmed = newUrl.trim();
    if (!trimmed || (!trimmed.startsWith("http://") && !trimmed.startsWith("https://"))) return;
    setSavingUrl(true);
    try {
      await addLink(issueId, trimmed, link.toneNote || undefined);
      setNewUrl("");
      setAddingUrl(false);
    } finally {
      setSavingUrl(false);
    }
  }

  async function handleStartRecording() {
    setMicError(false);
    const ok = await startRecording();
    if (!ok) setMicError(true);
  }

  async function handleStopRecording() {
    const file = await stopRecording();
    if (file) onAudioUpload(file);
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Title and metadata */}
            <p className="font-medium text-sm truncate">
              {link.metaTitle || link.url}
            </p>
            {link.metaDescription && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {link.metaDescription}
              </p>
            )}
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline mt-1 block truncate"
            >
              {link.url}
            </a>

            {/* Tone note display / edit */}
            {link.toneNote && !editingTone && (
              <p
                className="text-xs mt-3 bg-muted px-2 py-1.5 rounded cursor-pointer hover:bg-muted/80"
                onClick={() => setEditingTone(true)}
              >
                <span className="font-medium">Your take:</span> {link.toneNote}
              </p>
            )}
            {!link.toneNote && !editingTone && (
              <button
                className="text-xs mt-3 text-muted-foreground hover:text-foreground"
                onClick={() => setEditingTone(true)}
              >
                + Add your thoughts on this
              </button>
            )}
            {editingTone && (
              <div className="mt-3 space-y-2">
                <Textarea
                  value={toneValue}
                  onChange={(e) => setToneValue(e.target.value)}
                  placeholder="What do you think about this one?"
                  rows={2}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      onToneNoteChange(toneValue);
                      setEditingTone(false);
                    }}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setToneValue(link.toneNote || "");
                      setEditingTone(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Audio: recorder + upload + playback */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {link.audioPath ? (
                <>
                  <span className="text-xs text-green-700 font-medium">
                    Voice memo attached
                  </span>
                  <audio src={link.audioPath} controls className="h-8" />
                </>
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
                    className="h-7 text-xs"
                  >
                    Stop and save
                  </Button>
                </>
              ) : (
                <>
                  {/* Record button */}
                  <button
                    onClick={handleStartRecording}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-4 h-4 text-red-400"
                    >
                      <path d="M7 4a3 3 0 0 1 6 0v6a3 3 0 1 1-6 0V4Z" />
                      <path d="M5.5 9.643a.75.75 0 0 0-1.5 0V10c0 3.06 2.29 5.585 5.25 5.954V17.5h-1.5a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-1.5v-1.546A6.001 6.001 0 0 0 16 10v-.357a.75.75 0 0 0-1.5 0V10a4.5 4.5 0 0 1-9 0v-.357Z" />
                    </svg>
                    Record voice memo
                  </button>

                  <span className="text-xs text-muted-foreground">or</span>

                  {/* Upload button */}
                  <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-4 h-4"
                    >
                      <path d="M9.25 13.25a.75.75 0 0 0 1.5 0V4.636l2.955 3.129a.75.75 0 0 0 1.09-1.03l-4.25-4.5a.75.75 0 0 0-1.09 0l-4.25 4.5a.75.75 0 1 0 1.09 1.03L9.25 4.636v8.614Z" />
                      <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
                    </svg>
                    Upload audio
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onAudioUpload(file);
                      }}
                    />
                  </label>

                  {micError && (
                    <span className="text-xs text-destructive">
                      Could not access microphone. Try uploading instead.
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setAddingUrl(!addingUrl)}
            >
              + URL
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={onRemove}
            >
              Remove
            </Button>
          </div>
        </div>

        {/* Add URL inline form */}
        {addingUrl && (
          <div className="mt-3 flex items-center gap-2">
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
      </CardContent>
    </Card>
  );
}
