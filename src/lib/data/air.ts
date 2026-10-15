/**
 * Data access + assembly for air quality (Fase 2).
 *
 * Two distinct providers, never mixed in one number:
 *   - "model"   : Open-Meteo (CAMS global ~45 km) — an estimate for an area.
 *   - "station" : OpenAQ (ground monitors) — an actual measurement (Fase 2b).
 *
 * Honesty rules enforced here:
 *   - a failed read yields `null`, never 0;
 *   - ISPU from anything other than a 24-hour average is flagged as an estimate;
 *   - every reading carries its observation time and its kind (model/station).
 */

import "server-only";

import { CITIES, type City } from "@/config/cities";
import { getServerSupabase } from "@/lib/db/client";
import { pm25ToIspu, type IspuResult } from "@/lib/ispu/convert";
import { fetchAirQualityModel } from "@/lib/sources/openmeteo/client";
import type { AirReading, AirResponse } from "@/lib/types";

interface AirRow {
  provider: string;
  kind: string;
  station_id: string | null;
  location_name: string | null;
  lat: number;
  lon: number;
  pm25: number | string | null;
  pm10: number | string | null;
  aqi_us: number | null;
  ispu_value: number | null;
  ispu_category: string | null;
  observed_at: string;
}

function num(value: number | string | null): number | null {
  if (value === null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Persists model readings (idempotent per provider+location+observation). */
export async function upsertAirReadings(readings: AirReading[]): Promise<number> {
  const supabase = getServerSupabase();
  if (!supabase || readings.length === 0) return 0;

  const payload = readings.map((r) => ({
    provider: r.provider,
    kind: r.kind,
    station_id: r.stationId,
    location_name: r.locationName,
    lat: r.lat,
    lon: r.lon,
    pm25: r.pm25,
    pm10: r.pm10,
    aqi_us: r.usAqi,
    ispu_value: r.ispu?.value ?? null,
    ispu_category: r.ispu?.category.id ?? null,
    observed_at: r.observedAt,
  }));

  const { data, error } = await supabase
    .from("air_readings")
    .upsert(payload, {
      onConflict: "provider,station_id,observed_at",
      ignoreDuplicates: false,
    })
    .select("id");
  if (error) throw new Error(`upsert air_readings gagal: ${error.message}`);
  return data?.length ?? payload.length;
}

/**
 * Fetches model readings for the configured cities and returns them ready to
 * display. Does NOT write to the database — the scheduled ingest does that.
 */
export async function loadCityAirModel(): Promise<{
  readings: AirReading[];
  ok: boolean;
  error?: string;
}> {
  const points = CITIES.map((c) => ({ lat: c.lat, lon: c.lon }));
  const result = await fetchAirQualityModel(points);
  if (!result.ok) return { readings: [], ok: false, error: result.error };

  // Open-Meteo may snap coordinates to its grid; match back to the nearest city.
  const readings: AirReading[] = result.readings.map((r) => {
    const city = nearestCityTo(r.lat, r.lon);
    return {
      provider: "open-meteo",
      kind: "model",
      stationId: null,
      locationName: city ? `${city.name} (model)` : "Model CAMS",
      lat: city?.lat ?? r.lat,
      lon: city?.lon ?? r.lon,
      pm25: r.pm25,
      pm10: r.pm10,
      usAqi: r.usAqi,
      // The CAMS value is a 3-hourly model field, NOT a 24-hour average, so the
      // ISPU derived from it must be presented as an estimate.
      ispu: pm25ToIspu(r.pm25, { isEstimate: true }),
      observedAt: r.observedAt,
      attribution: "Weather data by Open-Meteo.com (CAMS ENSEMBLE)",
    };
  });

  return { readings, ok: true };
}

function nearestCityTo(lat: number, lon: number): City | null {
  let best: { city: City; distance: number } | null = null;
  for (const city of CITIES) {
    const distance = Math.hypot(city.lat - lat, city.lon - lon);
    if (!best || distance < best.distance) best = { city, distance };
  }
  return best?.city ?? null;
}

/** Reads the most recent stored readings for display (freshness-aware). */
export async function readStoredAir(now: Date = new Date()): Promise<AirResponse> {
  const supabase = getServerSupabase();
  const fetchedAt = now.toISOString();

  if (!supabase) {
    return {
      readings: [],
      freshness: {
        lastUpdated: null,
        fetchedAt,
        level: "nodata",
        stale: true,
        staleReason:
          "Basis data belum dikonfigurasi. Data kualitas udara akan tampil setelah ingest berjalan.",
        source: "firms",
      },
      attribution: {
        openMeteo: "Weather data by Open-Meteo.com",
        cams: "CAMS ENSEMBLE (Copernicus Atmosphere Monitoring Service)",
      },
    };
  }

  // Most recent observation per provider+location within the last day.
  const since = new Date(now.getTime() - 24 * 3_600_000).toISOString();
  const { data, error } = await supabase
    .from("air_readings")
    .select(
      "provider, kind, station_id, location_name, lat, lon, pm25, pm10, aqi_us, ispu_value, ispu_category, observed_at",
    )
    .gte("observed_at", since)
    .order("observed_at", { ascending: false })
    .limit(400);

  if (error) {
    console.error("[air] gagal membaca basis data:", error);
    return {
      readings: [],
      freshness: {
        lastUpdated: null,
        fetchedAt,
        level: "nodata",
        stale: true,
        staleReason: "Gagal membaca data kualitas udara.",
        source: "firms",
      },
      attribution: {
        openMeteo: "Weather data by Open-Meteo.com",
        cams: "CAMS ENSEMBLE (Copernicus Atmosphere Monitoring Service)",
      },
    };
  }

  const rows = (data ?? []) as unknown as AirRow[];
  // Keep only the newest row per location so a city is not listed twice.
  const newest = new Map<string, AirRow>();
  for (const row of rows) {
    const key = `${row.provider}:${row.station_id ?? ""}:${row.location_name ?? ""}`;
    if (!newest.has(key)) newest.set(key, row);
  }

  const readings: AirReading[] = [...newest.values()].map((row) => {
    const ispu: IspuResult | null =
      row.ispu_value === null
        ? pm25ToIspu(num(row.pm25), { isEstimate: true })
        : null;
    return {
      provider: row.provider === "openaq" ? "openaq" : "open-meteo",
      kind: row.kind === "station" ? "station" : "model",
      stationId: row.station_id,
      locationName: row.location_name ?? "Lokasi tidak bernama",
      lat: row.lat,
      lon: row.lon,
      pm25: num(row.pm25),
      pm10: num(row.pm10),
      usAqi: row.aqi_us,
      ispu,
      observedAt: row.observed_at,
      attribution:
        row.provider === "openaq"
          ? "OpenAQ (dan sumber aslinya)"
          : "Weather data by Open-Meteo.com (CAMS ENSEMBLE)",
    };
  });

  const lastUpdated = readings.reduce<string | null>(
    (latest, r) => (!latest || r.observedAt > latest ? r.observedAt : latest),
    null,
  );

  return {
    readings,
    freshness: {
      lastUpdated,
      fetchedAt,
      level: lastUpdated ? "fresh" : "nodata",
      stale: !lastUpdated,
      staleReason: lastUpdated
        ? undefined
        : "Belum ada data kualitas udara tersimpan. Ingest mungkin belum berjalan.",
      source: "firms",
    },
    attribution: {
      openMeteo: "Weather data by Open-Meteo.com",
      cams: "CAMS ENSEMBLE (Copernicus Atmosphere Monitoring Service)",
    },
  };
}

/** Air quality nearest to a user-supplied point (model readings only for now). */
export function nearestReading(
  readings: AirReading[],
  lat: number,
  lon: number,
): { reading: AirReading; distanceKm: number } | null {
  let best: { reading: AirReading; distanceKm: number } | null = null;
  for (const reading of readings) {
    const dLat = (reading.lat - lat) * 111;
    const dLon = (reading.lon - lon) * 111 * Math.cos((lat * Math.PI) / 180);
    const distanceKm = Math.hypot(dLat, dLon);
    if (!best || distanceKm < best.distanceKm) best = { reading, distanceKm };
  }
  return best;
}
