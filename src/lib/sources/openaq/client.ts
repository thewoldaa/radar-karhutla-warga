/**
 * Server-only OpenAQ v3 client (STATION data — actual ground measurements).
 *
 * VERIFIED 2026-10-15 (docs/01-VERIFIKASI.md B8-B14):
 * - Auth: `X-API-Key` header; free key at https://explore.openaq.org/register
 * - Rate limits: 60 requests/minute and 2 000/hour per key (HTTP 429 on excess,
 *   with `x-ratelimit-*` response headers). Results MUST be cached.
 * - CORS is blocked for browsers: the official FAQ says to proxy through your own
 *   backend. This module is therefore server-only and the browser never calls it.
 * - Locations: GET /v3/locations?bbox=minLon,minLat,maxLon,maxLat&parameters_id=2
 *   (parameter 2 = pm25); latest values: GET /v3/parameters/2/latest
 * - Licences vary PER LOCATION (`licenses[].commercialUseAllowed`), so we carry
 *   the licence through to the UI instead of assuming one.
 *
 * [VERIFIKASI] Station coverage in Sumatra/Kalimantan could not be checked without
 * a key (every /v3 call returned 401 during research). Run `npm run check:openaq`
 * once a key is configured to see how many PM2.5 stations actually exist there.
 */

import "server-only";

import { z } from "zod";

const BASE_URL = "https://api.openaq.org/v3";

/** Parameter id for PM2.5 in OpenAQ v3. */
export const PM25_PARAMETER_ID = 2;

/** Indonesia's country id in OpenAQ. */
export const INDONESIA_COUNTRY_ID = 1;

const licenseSchema = z
  .object({
    id: z.number().optional(),
    name: z.string().optional(),
    attribution: z.string().nullable().optional(),
    commercialUseAllowed: z.boolean().nullable().optional(),
    attributionRequired: z.boolean().nullable().optional(),
  })
  .partial();

const locationSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  country: z.object({ id: z.number().optional(), code: z.string().optional() }).partial().optional(),
  coordinates: z.object({ latitude: z.number(), longitude: z.number() }).optional(),
  datetimeLast: z.union([z.string(), z.record(z.string(), z.unknown())]).nullable().optional(),
  sensors: z
    .array(
      z
        .object({
          id: z.number(),
          parameter: z
            .object({ id: z.number().optional(), name: z.string().optional(), units: z.string().optional() })
            .partial()
            .optional(),
        })
        .partial(),
    )
    .optional(),
  licenses: z.array(licenseSchema).optional(),
});

const locationsResponseSchema = z.object({
  meta: z.object({ found: z.union([z.number(), z.string()]).optional() }).partial().optional(),
  results: z.array(locationSchema),
});

export interface StationLocation {
  id: number;
  name: string;
  lat: number;
  lon: number;
  /** True only when EVERY licence on the location allows commercial use. */
  commercialUseAllowed: boolean | null;
  licenseNames: string[];
  lastObservedAt: string | null;
}

export interface StationsResult {
  locations: StationLocation[];
  ok: boolean;
  error?: string;
  configured: boolean;
}

export function isOpenAqConfigured(): boolean {
  return Boolean(process.env.OPENAQ_API_KEY?.trim());
}

function readKey(): string | null {
  return process.env.OPENAQ_API_KEY?.trim() ?? null;
}

/** Extracts an ISO instant from OpenAQ's `datetimeLast` (object or string). */
function parseDatetime(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof value === "object" && value !== null && "utc" in value) {
    const utc = (value as { utc?: unknown }).utc;
    if (typeof utc === "string") {
      const d = new Date(utc);
      return Number.isNaN(d.getTime()) ? null : d.toISOString();
    }
  }
  return null;
}

/**
 * Lists PM2.5 stations inside a bounding box.
 * Returns `configured: false` (not an error) when no key is set, so callers can
 * distinguish "feature not set up" from "the provider failed".
 */
export async function fetchStationsInBbox(
  bbox: { west: number; south: number; east: number; north: number },
  limit = 200,
): Promise<StationsResult> {
  const key = readKey();
  if (!key) {
    return { locations: [], ok: false, configured: false, error: "OPENAQ_API_KEY belum diatur" };
  }

  const params = new URLSearchParams({
    bbox: [bbox.west, bbox.south, bbox.east, bbox.north].map((n) => n.toFixed(4)).join(","),
    parameters_id: String(PM25_PARAMETER_ID),
    limit: String(Math.min(1000, Math.max(1, limit))),
  });

  try {
    const res = await fetch(`${BASE_URL}/locations?${params.toString()}`, {
      // Station data changes hourly at most; cache generously to protect the
      // 60/minute limit. The scheduled ingest is the only caller.
      next: { revalidate: 3600 },
      headers: {
        "X-API-Key": key,
        "User-Agent": "RadarKarhutlaWarga/0.2 (server ingest)",
      },
    });

    if (res.status === 429) {
      const reset = res.headers.get("x-ratelimit-reset");
      return {
        locations: [],
        ok: false,
        configured: true,
        error: `Batas laju OpenAQ tercapai${reset ? ` (reset dalam ${reset}s)` : ""}`,
      };
    }
    if (!res.ok) {
      return { locations: [], ok: false, configured: true, error: `HTTP ${res.status}` };
    }

    const parsed = locationsResponseSchema.safeParse(await res.json());
    if (!parsed.success) {
      return {
        locations: [],
        ok: false,
        configured: true,
        error: "Bentuk respons OpenAQ tidak dikenali",
      };
    }

    const locations: StationLocation[] = parsed.data.results.flatMap((loc) => {
      const coords = loc.coordinates;
      if (!coords) return [];
      const licences = loc.licenses ?? [];
      // Be conservative: if any licence forbids commercial use (or is unknown),
      // we do not claim it is commercially usable.
      const flags = licences.map((l) => l.commercialUseAllowed);
      const commercialUseAllowed =
        flags.length === 0 ? null : flags.every((f) => f === true);

      return [
        {
          id: loc.id,
          name: loc.name ?? `Stasiun ${loc.id}`,
          lat: coords.latitude,
          lon: coords.longitude,
          commercialUseAllowed,
          licenseNames: licences
            .map((l) => l.name ?? l.attribution ?? "")
            .filter((n): n is string => n.length > 0),
          lastObservedAt: parseDatetime(loc.datetimeLast),
        },
      ];
    });

    return { locations, ok: true, configured: true };
  } catch (error) {
    return {
      locations: [],
      ok: false,
      configured: true,
      error: error instanceof Error ? error.message : "Gagal menghubungi OpenAQ",
    };
  }
}

/**
 * Counts PM2.5 stations in Indonesia using the API's own `meta.found`.
 * Useful as a one-off coverage check once a key exists (see docs/01-VERIFIKASI.md B12).
 */
export async function countIndonesiaStations(): Promise<{
  count: number | null;
  ok: boolean;
  error?: string;
}> {
  const key = readKey();
  if (!key) return { count: null, ok: false, error: "OPENAQ_API_KEY belum diatur" };

  const params = new URLSearchParams({
    countries_id: String(INDONESIA_COUNTRY_ID),
    parameters_id: String(PM25_PARAMETER_ID),
    limit: "1", // we only want meta.found
  });

  try {
    const res = await fetch(`${BASE_URL}/locations?${params.toString()}`, {
      cache: "no-store",
      headers: { "X-API-Key": key, "User-Agent": "RadarKarhutlaWarga/0.2 (coverage check)" },
    });
    if (!res.ok) {
      return { count: null, ok: false, error: `HTTP ${res.status}` };
    }
    const json = (await res.json()) as { meta?: { found?: number | string } };
    const found = json.meta?.found;
    const count = found === undefined ? null : Number(found);
    return { count: Number.isFinite(count) ? count : null, ok: count !== null };
  } catch (error) {
    return {
      count: null,
      ok: false,
      error: error instanceof Error ? error.message : "Gagal menghubungi OpenAQ",
    };
  }
}
