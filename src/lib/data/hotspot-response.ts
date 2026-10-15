/**
 * Builds the /api/hotspots response (and the server-rendered initial payload).
 *
 * Degradation ladder (never invents data):
 *   1. Supabase configured  -> read stored data, report freshness honestly.
 *   2. Supabase missing + DEMO_MODE -> clearly-labelled DATA CONTOH.
 *   3. Otherwise            -> empty data + "stale" freshness with a reason.
 */

import "server-only";

import { DEMO_MODE } from "@/config/site";
import {
  countSince,
  latestObservationAt,
  provinceCounts,
  queryHotspots,
} from "@/lib/data/hotspots";
import { buildDemoHotspots, buildDemoProvinceCounts } from "@/lib/demo/hotspots";
import { freshnessLevel } from "@/lib/freshness";
import { isSupabaseConfigured } from "@/lib/db/client";
import type { DataFreshness, HotspotsResponse, ProvinceCount } from "@/lib/types";

export interface HotspotQueryParams {
  hours: number;
  includeLowConfidence: boolean;
  bbox?: { west: number; south: number; east: number; north: number };
  limit?: number;
}

const DEFAULT_LIMIT = 2000;

export async function buildHotspotsResponse(
  params: HotspotQueryParams,
  now: Date = new Date(),
): Promise<HotspotsResponse> {
  const to = now;
  const from = new Date(now.getTime() - params.hours * 3_600_000);
  const window = { from: from.toISOString(), to: to.toISOString(), hours: params.hours };

  // --- 1. Real data ---------------------------------------------------------
  if (isSupabaseConfigured()) {
    try {
      const [result, lastObservation, total24h, provinces] = await Promise.all([
        queryHotspots({
          fromIso: window.from,
          toIso: window.to,
          includeLowConfidence: params.includeLowConfidence,
          bbox: params.bbox,
          limit: params.limit ?? DEFAULT_LIMIT,
        }),
        latestObservationAt(),
        countSince(
          new Date(now.getTime() - 24 * 3_600_000).toISOString(),
          params.includeLowConfidence,
        ),
        provinceCounts(window.from, window.to, params.includeLowConfidence),
      ]);

      const level = freshnessLevel(lastObservation, now);
      const freshness: DataFreshness = {
        // Never substitute "now" for a missing observation: that would make an
        // empty database look freshly updated (level would read as "fresh").
        lastUpdated: lastObservation,
        fetchedAt: now.toISOString(),
        level,
        stale: level !== "fresh",
        staleReason:
          level === "fresh"
            ? undefined
            : lastObservation
              ? "Data satelit terakhir lebih lama dari biasanya."
              : "Belum ada data titik panas tersimpan. Ingest mungkin belum berjalan.",
        source: "firms",
      };

      return {
        data: result.features,
        freshness,
        // `null` propagates an unknown count; the UI shows "-" instead of 0.
        total24h,
        topProvinces: provinces,
        window,
        truncated: result.truncated,
      };
    } catch (error) {
      // Log the detail server-side; the public response stays generic so internal
      // schema/permission messages never reach users (and never get CDN-cached).
      console.error("[hotspots] gagal membaca basis data:", error);
      const freshness: DataFreshness = {
        lastUpdated: null,
        fetchedAt: now.toISOString(),
        level: "nodata",
        stale: true,
        staleReason:
          process.env.NODE_ENV === "production"
            ? "Gagal membaca basis data. Menampilkan data terakhir yang tersedia."
            : `Gagal membaca basis data: ${
                error instanceof Error ? error.message : "penyebab tidak diketahui"
              }`,
        source: "firms",
      };
      // total24h is null (unknown), not 0: the read failed, so we cannot claim
      // "no hot spots in the last 24 hours".
      return {
        data: [],
        freshness,
        total24h: null,
        topProvinces: [],
        window,
        truncated: false,
      };
    }
  }

  // --- 2. Demo data (development only, clearly labelled) --------------------
  if (DEMO_MODE) {
    const all = buildDemoHotspots(now);
    const filtered = all.filter((h) => {
      const inWindow = h.acqAt >= window.from && h.acqAt <= window.to;
      const visible = params.includeLowConfidence || h.confidenceClass !== "low";
      const inBbox = params.bbox
        ? h.lon >= params.bbox.west &&
          h.lon <= params.bbox.east &&
          h.lat >= params.bbox.south &&
          h.lat <= params.bbox.north
        : true;
      return inWindow && visible && inBbox;
    });
    const freshness: DataFreshness = {
      lastUpdated: filtered[0]?.acqAt ?? null,
      fetchedAt: now.toISOString(),
      level: "fresh",
      stale: false,
      staleReason: "DATA CONTOH — bukan data satelit sebenarnya.",
      source: "demo",
    };
    return {
      data: filtered,
      freshness,
      total24h: all.filter(
        (h) => params.includeLowConfidence || h.confidenceClass !== "low",
      ).length,
      topProvinces: buildDemoProvinceCounts(),
      window,
      truncated: false,
    };
  }

  // --- 3. Nothing configured ------------------------------------------------
  const freshness: DataFreshness = {
    lastUpdated: null,
    fetchedAt: now.toISOString(),
    level: "nodata",
    stale: true,
    staleReason:
      "Basis data belum dikonfigurasi. Hubungkan Supabase dan jalankan ingest agar data titik panas tampil.",
    source: "firms",
  };
  const empty: ProvinceCount[] = [];
  // total24h is null (unknown) — no data source is connected at all.
  return {
    data: [],
    freshness,
    total24h: null,
    topProvinces: empty,
    window,
    truncated: false,
  };
}
