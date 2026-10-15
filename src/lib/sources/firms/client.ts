/**
 * Server-only FIRMS Area API client.
 *
 * VERIFIED (2026-10-15, docs/01-VERIFIKASI.md A1-A5):
 * - URL pattern: /api/area/csv/{MAP_KEY}/{SOURCE}/{west,south,east,north}/{DAY_RANGE}
 * - Response format: CSV only (other formats rejected by the API).
 * - bbox order is west,south,east,north — NOT north,south,east,west.
 * - DAY_RANGE is 1..5 (server also accepts 0/-1 — validate on our side).
 * - Quota: 5000 transactions / 10 minutes / MAP_KEY; large queries count as
 *   multiple transactions (a world/1 VIIRS query ≈ 36 transactions in the
 *   official tutorial). We only ever ask for a small Indonesia bbox.
 *
 * The MAP_KEY travels in the URL, so this module must NEVER be imported from
 * client components. The route handlers enforce that by construction.
 */

import "server-only";

import { parseFirmsCsv, type FirmsHotspot } from "./parse";

const BASE_URL = "https://firms.modaps.eosdis.nasa.gov/api/area/csv";

export const DEFAULT_BBOX = "95,-11,141,6"; // Indonesia — VERIFY (docs/01-VERIFIKASI.md A2)

export interface FirmsFetchResult {
  source: string;
  hotspots: FirmsHotspot[];
  ok: boolean;
  error?: string;
}

function readConfig() {
  const mapKey = process.env.FIRMS_MAP_KEY?.trim();
  const sources = (process.env.FIRMS_SOURCES ?? "VIIRS_NOAA21_NRT,VIIRS_NOAA20_NRT")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const bbox = (process.env.FIRMS_BBOX ?? DEFAULT_BBOX).trim();
  return { mapKey, sources, bbox };
}

export function isFirmsConfigured(): boolean {
  return Boolean(process.env.FIRMS_MAP_KEY?.trim());
}

/**
 * Fetches one SOURCE for the last `dayRange` days (1..5).
 * Never throws: failures are reported per source so a partial ingest can succeed.
 */
export async function fetchFirmsSource(
  source: string,
  dayRange = 1,
): Promise<FirmsFetchResult> {
  const { mapKey, bbox } = readConfig();
  if (!mapKey) {
    return { source, hotspots: [], ok: false, error: "FIRMS_MAP_KEY belum diatur" };
  }
  const days = Math.min(5, Math.max(1, Math.trunc(dayRange)));
  const url = `${BASE_URL}/${encodeURIComponent(mapKey)}/${encodeURIComponent(source)}/${bbox}/${days}`;

  try {
    const res = await fetch(url, {
      // FIRMS data updates at most hourly; 5 minutes of caching protects quota.
      next: { revalidate: 300 },
      headers: { "User-Agent": "RadarKarhutlaWarga/0.1 (server ingest)" },
    });
    const text = await res.text();

    if (!res.ok) {
      // The API answers 200 with error text in some cases; treat both as failure.
      return { source, hotspots: [], ok: false, error: `HTTP ${res.status}` };
    }
    const hotspots = parseFirmsCsv(text);
    if (hotspots.length === 0 && /invalid|error/i.test(text)) {
      return { source, hotspots: [], ok: false, error: "Respons API tidak valid" };
    }
    return { source, hotspots, ok: true };
  } catch (error) {
    return {
      source,
      hotspots: [],
      ok: false,
      error: error instanceof Error ? error.message : "Gagal menghubungi FIRMS",
    };
  }
}

/** Fetches every configured SOURCE sequentially to stay well inside the quota. */
export async function fetchAllFirmsSources(dayRange = 1): Promise<FirmsFetchResult[]> {
  const { sources } = readConfig();
  const results: FirmsFetchResult[] = [];
  for (const source of sources) {
    results.push(await fetchFirmsSource(source, dayRange));
  }
  return results;
}
