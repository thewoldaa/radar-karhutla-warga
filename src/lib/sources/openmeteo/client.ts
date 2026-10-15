/**
 * Server-only Open-Meteo Air Quality client (MODEL data, not station data).
 *
 * VERIFIED 2026-10-15 (docs/01-VERIFIKASI.md B1-B7):
 * - Endpoint: https://air-quality-api.open-meteo.com/v1/air-quality
 * - `current=pm2_5,pm10,us_aqi` works; units μg/m³ and USAQI.
 * - Multiple coordinates are comma-separated; the response becomes an array.
 *   Up to 1000 locations per request (enforced server-side), and N coordinates
 *   multiply the API-call count — so we poll ~30 cities from the server only.
 * - Indonesia is served by the GLOBAL CAMS domain (~45 km, 3-hourly). The
 *   European 11 km domain returns "No data is available for this location".
 * - LICENCE: the FREE tier is NON-COMMERCIAL. Advertising or sponsorship counts
 *   as commercial use, so a paid plan is required once the site is monetised.
 *   Attribution is mandatory: "Weather data by Open-Meteo.com" plus a CAMS
 *   ENSEMBLE credit (docs/02-ATRIBUSI-DAN-LEGAL.md §1.2).
 */

import "server-only";

import { z } from "zod";

const BASE_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";

/** Hard ceiling from the API itself; we stay far below it. */
export const MAX_LOCATIONS_PER_REQUEST = 1000;

const currentSchema = z.object({
  time: z.string(),
  interval: z.number().optional(),
  pm2_5: z.number().nullable().optional(),
  pm10: z.number().nullable().optional(),
  us_aqi: z.number().nullable().optional(),
});

const locationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  utc_offset_seconds: z.number().optional(),
  timezone: z.string().optional(),
  current: currentSchema.optional(),
  // Present from the second location onwards in multi-coordinate responses.
  location_id: z.number().optional(),
});

const responseSchema = z.union([locationSchema, z.array(locationSchema)]);

export interface AirModelReading {
  lat: number;
  lon: number;
  pm25: number | null;
  pm10: number | null;
  usAqi: number | null;
  observedAt: string; // ISO UTC
  provider: "open-meteo";
  kind: "model";
}

export interface AirModelResult {
  readings: AirModelReading[];
  ok: boolean;
  error?: string;
  /** True when the commercial plan is configured (affects licence compliance). */
  usingPaidPlan: boolean;
}

function config() {
  const apiKey = process.env.OPEN_METEO_API_KEY?.trim();
  return {
    apiKey,
    // The commercial endpoint has identical syntax; only the host and key differ.
    baseUrl: apiKey ? "https://customer-air-quality-api.open-meteo.com/v1/air-quality" : BASE_URL,
  };
}

/**
 * Fetches current air quality for many coordinates in ONE request.
 * Returns model data only — the caller must label it as "model", never "station".
 */
export async function fetchAirQualityModel(
  points: Array<{ lat: number; lon: number }>,
): Promise<AirModelResult> {
  const { apiKey, baseUrl } = config();
  const usingPaidPlan = Boolean(apiKey);

  if (points.length === 0) {
    return { readings: [], ok: true, usingPaidPlan };
  }
  if (points.length > MAX_LOCATIONS_PER_REQUEST) {
    return {
      readings: [],
      ok: false,
      error: `Terlalu banyak lokasi (${points.length}); maksimum ${MAX_LOCATIONS_PER_REQUEST}.`,
      usingPaidPlan,
    };
  }

  const params = new URLSearchParams({
    latitude: points.map((p) => p.lat.toFixed(4)).join(","),
    longitude: points.map((p) => p.lon.toFixed(4)).join(","),
    current: "pm2_5,pm10,us_aqi",
    timezone: "UTC",
    // Global domain: Indonesia is not covered by the European domain.
    domains: "cams_global",
  });
  if (apiKey) params.set("apikey", apiKey);

  try {
    const res = await fetch(`${baseUrl}?${params.toString()}`, {
      // Model output updates a few times per day; 15 minutes of caching is safe
      // and keeps us far from the 600-calls/minute limit.
      next: { revalidate: 900 },
      headers: { "User-Agent": "RadarKarhutlaWarga/0.2 (server ingest)" },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        readings: [],
        ok: false,
        error: `HTTP ${res.status}${text ? `: ${text.slice(0, 120)}` : ""}`,
        usingPaidPlan,
      };
    }

    const json = await res.json();
    const parsed = responseSchema.safeParse(json);
    if (!parsed.success) {
      return {
        readings: [],
        ok: false,
        error: "Bentuk respons Open-Meteo tidak dikenali",
        usingPaidPlan,
      };
    }

    const entries = Array.isArray(parsed.data) ? parsed.data : [parsed.data];
    const readings: AirModelReading[] = [];

    for (const entry of entries) {
      if (!entry.current) continue;
      const observedAt = toUtcIso(entry.current.time, entry.utc_offset_seconds ?? 0);
      if (!observedAt) continue;
      readings.push({
        lat: entry.latitude,
        lon: entry.longitude,
        pm25: entry.current.pm2_5 ?? null,
        pm10: entry.current.pm10 ?? null,
        usAqi: entry.current.us_aqi ?? null,
        observedAt,
        provider: "open-meteo",
        kind: "model",
      });
    }

    return { readings, ok: true, usingPaidPlan };
  } catch (error) {
    return {
      readings: [],
      ok: false,
      error: error instanceof Error ? error.message : "Gagal menghubungi Open-Meteo",
      usingPaidPlan,
    };
  }
}

/**
 * Converts an Open-Meteo local timestamp + utc offset into an ISO UTC instant.
 * We request timezone=UTC, but the offset is honoured anyway for robustness.
 */
function toUtcIso(localTime: string, utcOffsetSeconds: number): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(localTime);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match;
  const asUtc = Date.UTC(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
  );
  if (!Number.isFinite(asUtc)) return null;
  return new Date(asUtc - utcOffsetSeconds * 1000).toISOString();
}
