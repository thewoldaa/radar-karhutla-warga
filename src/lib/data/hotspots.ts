/**
 * Data access layer for hot spots.
 *
 * All reads/writes for hot spots go through this module. It hides Supabase
 * details from API routes and components, and it degrades gracefully when
 * Supabase is not configured (fresh installs, local development).
 *
 * GeoJSON parsing note: PostgREST returns PostGIS geography columns as WKB hex
 * strings. To stay independent of that encoding, we select lat/lon as plain
 * numbers using a generated column in the migration (`lat`, `lon`).
 */

import "server-only";

import { getServerSupabase } from "@/lib/db/client";
import type { HotspotRow } from "@/lib/db/types";
import type { ConfidenceClass, HotspotFeature, ProvinceCount } from "@/lib/types";

export interface UpsertHotspot {
  lat: number;
  lon: number;
  acqAt: string;
  satellite: string;
  instrument: string;
  confidenceClass: ConfidenceClass;
  confidenceRaw: string;
  frp: number | null;
  daynight: "D" | "N" | null;
  source: string;
}

export interface IngestSummary {
  fetched: number;
  upserted: number;
  perSource: Array<{ source: string; ok: boolean; fetched: number; upserted: number; error?: string }>;
}

export interface HotspotQuery {
  fromIso: string;
  toIso: string;
  includeLowConfidence: boolean;
  /** Optional viewport filter (west, south, east, north) — data loads per viewport. */
  bbox?: { west: number; south: number; east: number; north: number };
  limit: number;
}

interface HotspotDbRow extends HotspotRow {
  lat: number;
  lon: number;
}

function toFeature(row: HotspotDbRow): HotspotFeature {
  return {
    id: String(row.id),
    lat: row.lat,
    lon: row.lon,
    acqAt: row.acq_at,
    satellite: row.satellite,
    instrument: row.instrument,
    confidenceClass: (row.confidence_class as ConfidenceClass) ?? "nominal",
    confidenceRaw: row.confidence_raw ?? "",
    frp: row.frp === null ? null : Number(row.frp),
    daynight: row.daynight === "D" || row.daynight === "N" ? row.daynight : null,
    source: row.source,
  };
}

/** Idempotent upsert: unique key is (lat, lon, acq_at, satellite).
 * NOTE: `geom` is a GENERATED ALWAYS column in Postgres — it must NOT appear in
 * the payload, and the conflict target must match the SQL unique constraint. */
export async function upsertHotspots(rows: UpsertHotspot[]): Promise<number> {
  const supabase = getServerSupabase();
  if (!supabase || rows.length === 0) return 0;

  const payload = rows.map((r) => ({
    lat: r.lat,
    lon: r.lon,
    acq_at: r.acqAt,
    satellite: r.satellite,
    instrument: r.instrument,
    confidence_class: r.confidenceClass,
    confidence_raw: r.confidenceRaw,
    frp: r.frp,
    daynight: r.daynight,
    source: r.source,
  }));

  let upserted = 0;
  const CHUNK = 500;
  for (let i = 0; i < payload.length; i += CHUNK) {
    const chunk = payload.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from("hotspots")
      .upsert(chunk, {
        onConflict: "lat,lon,acq_at,satellite",
        ignoreDuplicates: true,
      })
      .select("id");
    if (error) throw new Error(`upsert hotspots gagal: ${error.message}`);
    upserted += data?.length ?? chunk.length;
  }
  return upserted;
}

export async function queryHotspots(query: HotspotQuery): Promise<{
  features: HotspotFeature[];
  truncated: boolean;
}> {
  const supabase = getServerSupabase();
  if (!supabase) return { features: [], truncated: false };

  let builder = supabase
    .from("hotspots")
    .select("id, lat, lon, acq_at, satellite, instrument, confidence_class, confidence_raw, frp, daynight, source")
    .gte("acq_at", query.fromIso)
    .lte("acq_at", query.toIso)
    .order("acq_at", { ascending: false })
    .limit(query.limit + 1); // +1 to detect truncation

  if (!query.includeLowConfidence) {
    builder = builder.neq("confidence_class", "low");
  }
  if (query.bbox) {
    builder = builder
      .gte("lon", query.bbox.west)
      .lte("lon", query.bbox.east)
      .gte("lat", query.bbox.south)
      .lte("lat", query.bbox.north);
  }

  const { data, error } = await builder;
  if (error) throw new Error(`query hotspots gagal: ${error.message}`);
  const rows = (data ?? []) as unknown as HotspotDbRow[];
  const truncated = rows.length > query.limit;
  return {
    features: rows.slice(0, query.limit).map(toFeature),
    truncated,
  };
}

/** Newest observation timestamp we hold (freshness banner input). */
export async function latestObservationAt(): Promise<string | null> {
  const supabase = getServerSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("hotspots")
    .select("acq_at")
    .order("acq_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return (data as { acq_at: string }).acq_at ?? null;
}

export async function countSince(fromIso: string, includeLowConfidence: boolean): Promise<number> {
  const supabase = getServerSupabase();
  if (!supabase) return 0;
  let builder = supabase
    .from("hotspots")
    .select("id", { count: "exact", head: true })
    .gte("acq_at", fromIso);
  if (!includeLowConfidence) builder = builder.neq("confidence_class", "low");
  const { count, error } = await builder;
  if (error) return 0;
  return count ?? 0;
}

/**
 * Top 5 provinces by hot-spot count inside the window.
 * Uses the SQL function `province_hotspot_counts` (spatial join with `regions`).
 * Returns [] when the regions table has not been imported yet — the UI simply
 * hides the province card in that case.
 */
export async function provinceCounts(
  fromIso: string,
  toIso: string,
  includeLowConfidence: boolean,
): Promise<ProvinceCount[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("province_hotspot_counts", {
    from_ts: fromIso,
    to_ts: toIso,
    include_low: includeLowConfidence,
  });
  if (error || !Array.isArray(data)) return [];
  return (data as Array<{ name: string; count: number | string }>).map((row) => ({
    name: row.name,
    count: Number(row.count),
  }));
}

export async function recordIngestionRun(run: {
  source: string;
  status: "ok" | "error" | "skipped";
  detail?: string;
  fetched: number;
  upserted: number;
  durationMs?: number;
}): Promise<void> {
  const supabase = getServerSupabase();
  if (!supabase) return;
  // Best-effort: logging must never break the ingest response.
  await supabase.from("ingestion_runs").insert({
    source: run.source,
    status: run.status,
    detail: run.detail ?? null,
    fetched: run.fetched,
    upserted: run.upserted,
    duration_ms: run.durationMs ?? null,
  });
}
