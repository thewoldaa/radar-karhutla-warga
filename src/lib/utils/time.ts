/**
 * Time helpers. All timestamps are stored in UTC; UI shows local time with a zone label.
 */

export const WIB = "Asia/Jakarta";

export interface TimeFilter {
  id: "24h" | "48h" | "7d";
  hours: number;
  label: string;
}

export const TIME_FILTERS: TimeFilter[] = [
  { id: "24h", hours: 24, label: "24 jam" },
  { id: "48h", hours: 48, label: "48 jam" },
  { id: "7d", hours: 168, label: "7 hari" },
];

export function filterById(id: string): TimeFilter {
  return TIME_FILTERS.find((f) => f.id === id) ?? TIME_FILTERS[0];
}

/** Formats an instant as "15 Okt 2026, 14.05 WIB" (Indonesian, Asia/Jakarta). */
export function formatWIB(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const date = new Intl.DateTimeFormat("id-ID", {
    timeZone: WIB,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
  return `${date} WIB`;
}

/** Formats an instant as "14.05 UTC" (used for satellite observation times). */
export function formatUTC(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const time = new Intl.DateTimeFormat("id-ID", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);
  return `${time} UTC`;
}

/** Short relative age such as "12 menit lalu" / "3 jam lalu" / "2 hari lalu". */
export function ageLabel(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "tidak diketahui";
  const diffMs = Math.max(0, now.getTime() - d.getTime());
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

/** ISO timestamp for N hours ago (used by time filters and API cache keys). */
export function hoursAgoIso(hours: number, now: Date = new Date()): string {
  return new Date(now.getTime() - hours * 3_600_000).toISOString();
}

/**
 * Reads a time-filter query parameter and returns it when valid.
 * Defaults to "24h" for anything unknown.
 */
export function parseTimeFilter(value: string | null): TimeFilter {
  if (!value) return TIME_FILTERS[0];
  return TIME_FILTERS.find((f) => f.id === value) ?? TIME_FILTERS[0];
}
