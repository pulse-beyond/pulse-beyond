import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days an unpublished edition is past its target date (0 = not overdue). */
export function overdueDays(publishDate: Date | string | null | undefined, now: Date = new Date()): number {
  if (!publishDate) return 0;
  const d = new Date(publishDate);
  const target = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(0, Math.round((today - target) / DAY_MS));
}
