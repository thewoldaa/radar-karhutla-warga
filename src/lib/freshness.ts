/**
 * Freshness policy for satellite hot-spot data.
 *
 * VERIFIED: NRT global data has a typical latency of ~3 hours after satellite
 * overpass (https://www.earthdata.nasa.gov/data/tools/firms/faq). The app shows
 * an age warning well before that so users never assume "real time".
 */

export const STALE_WARN_HOURS = 6; // show the amber "data may be old" banner
export const STALE_CRITICAL_HOURS = 24; // show the red banner

export type FreshnessLevel = "fresh" | "warn" | "critical";

export function freshnessLevel(
  lastUpdatedIso: string | null,
  now: Date = new Date(),
): FreshnessLevel {
  if (!lastUpdatedIso) return "critical";
  const updated = new Date(lastUpdatedIso);
  if (Number.isNaN(updated.getTime())) return "critical";
  const hours = (now.getTime() - updated.getTime()) / 3_600_000;
  if (hours >= STALE_CRITICAL_HOURS) return "critical";
  if (hours >= STALE_WARN_HOURS) return "warn";
  return "fresh";
}

export function freshnessMessage(level: FreshnessLevel, lastUpdatedLabel: string): string {
  switch (level) {
    case "fresh":
      return `Data terakhir diperbarui: ${lastUpdatedLabel}`;
    case "warn":
      return `Data mungkin tertunda. Terakhir diperbarui: ${lastUpdatedLabel}`;
    case "critical":
      return `Data belum diperbarui sejak ${lastUpdatedLabel}. Sumber mungkin sedang tidak tersedia.`;
  }
}
