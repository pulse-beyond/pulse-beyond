import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DAY_MS = 24 * 60 * 60 * 1000;

// The newsletter team works in Brazil; "which day is it" must follow their calendar,
// not the server's (UTC on Vercel). Otherwise Friday 21:00 BRT already counts as Saturday.
const APP_TIME_ZONE = "America/Sao_Paulo";
const ymdInAppTz = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Calendar day of `d` in the app time zone, as a UTC-midnight timestamp (for day arithmetic). */
function dayNumberInAppTz(d: Date): number {
  const [y, m, day] = ymdInAppTz.format(d).split("-").map(Number);
  return Date.UTC(y, m - 1, day);
}

/** Whole days an unpublished edition is past its target date (0 = not overdue), counted in America/Sao_Paulo. */
export function overdueDays(publishDate: Date | string | null | undefined, now: Date = new Date()): number {
  if (!publishDate) return 0;
  const d = new Date(publishDate);
  if (isNaN(d.getTime())) return 0;
  const target = dayNumberInAppTz(d);
  const today = dayNumberInAppTz(now);
  return Math.max(0, Math.round((today - target) / DAY_MS));
}
