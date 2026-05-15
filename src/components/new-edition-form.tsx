"use client";

import { useState, useTransition } from "react";
import { createIssue } from "@/lib/actions/issues";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  upcomingFridays: string[]; // YYYY-MM-DD strings
}

function formatPreset(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function NewEditionForm({ upcomingFridays }: Props) {
  const defaultDate = upcomingFridays[0] ?? "";
  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const [customizing, setCustomizing] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!selectedDate) return;
    const formData = new FormData();
    formData.set("publishDate", selectedDate);
    startTransition(() => {
      createIssue(formData);
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {!customizing ? (
        <div className="flex items-center gap-2">
          <select
            value={selectedDate}
            onChange={(e) => {
              if (e.target.value === "__custom__") {
                setCustomizing(true);
                return;
              }
              setSelectedDate(e.target.value);
            }}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            disabled={pending}
          >
            {upcomingFridays.map((iso) => (
              <option key={iso} value={iso}>
                {formatPreset(iso)}
              </option>
            ))}
            <option value="__custom__">Outra data…</option>
          </select>
          <Button type="button" onClick={submit} disabled={pending || !selectedDate}>
            {pending ? "Criando…" : "New Edition"}
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-44"
            disabled={pending}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setCustomizing(false);
              setSelectedDate(defaultDate);
            }}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={submit} disabled={pending || !selectedDate}>
            {pending ? "Criando…" : "New Edition"}
          </Button>
        </div>
      )}
    </div>
  );
}
