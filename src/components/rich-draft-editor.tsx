"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

/**
 * Editable, formatted view of the final newsletter draft.
 *
 * The export is stored as plain text with lightweight markers (👉 title, ↳ subtitle,
 * "* " bullets). Here it's rendered the way Roberto publishes it (bold headings,
 * spacing) inside a contentEditable area, and copied as rich HTML so headings and
 * bold survive pasting into the LinkedIn article editor.
 */

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function draftTextToHtml(text: string): string {
  const out: string[] = [];
  let inList = false;
  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };

  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      closeList();
      continue;
    }
    if (line.startsWith("👉")) {
      closeList();
      out.push(`<h2>${escapeHtml(line)}</h2>`);
    } else if (line.startsWith("↳")) {
      closeList();
      out.push(`<h3>${escapeHtml(line)}</h3>`);
    } else if (/^\*\s+/.test(line)) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${escapeHtml(line.replace(/^\*\s+/, ""))}</li>`);
    } else {
      closeList();
      out.push(`<p>${escapeHtml(line)}</p>`);
    }
  }
  closeList();
  return out.join("\n");
}

export interface RichDraftEditorHandle {
  /** Copy the current (possibly edited) draft as rich HTML + plain text. */
  copy: () => Promise<void>;
}

export const RichDraftEditor = forwardRef<RichDraftEditorHandle, { text: string }>(
  function RichDraftEditor({ text }, ref) {
    const elRef = useRef<HTMLDivElement>(null);

    // Re-render only when a new draft is generated; local edits live in the DOM.
    useEffect(() => {
      if (elRef.current) elRef.current.innerHTML = draftTextToHtml(text);
    }, [text]);

    useImperativeHandle(ref, () => ({
      async copy() {
        const el = elRef.current;
        if (!el) return;
        const html = el.innerHTML;
        const plain = el.innerText;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              "text/html": new Blob([html], { type: "text/html" }),
              "text/plain": new Blob([plain], { type: "text/plain" }),
            }),
          ]);
        } catch {
          // Older browsers / denied permission: fall back to plain text.
          await navigator.clipboard.writeText(plain);
        }
      },
    }));

    return (
      <div
        ref={elRef}
        contentEditable
        suppressContentEditableWarning
        className={[
          "min-h-[400px] max-h-[70vh] overflow-y-auto rounded-md border border-input bg-background px-6 py-5",
          "text-[15px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring",
          "[&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-bold first:[&_h2]:mt-0",
          "[&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-bold",
          "[&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-1",
        ].join(" ")}
      />
    );
  }
);
