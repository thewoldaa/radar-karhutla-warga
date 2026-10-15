/**
 * Build-time payload for the static staging site (GitHub Pages).
 *
 * No server, no database: the map runs on deterministic demo data that is
 * clearly labelled "DATA CONTOH" / "STAGING" in the UI. This module must never
 * be reachable from the production build path.
 */

import { buildDemoHotspots, buildDemoProvinceCounts } from "@/lib/demo/hotspots";
import type { HotspotsResponse } from "@/lib/types";

export function buildStaticHotspotsResponse(now: Date = new Date()): HotspotsResponse {
  const features = buildDemoHotspots(now);
  const from = new Date(now.getTime() - 24 * 3_600_000);
  const to = now;

  return {
    data: features.filter((h) => h.confidenceClass !== "low"),
    freshness: {
      lastUpdated: features[0]?.acqAt ?? now.toISOString(),
      fetchedAt: now.toISOString(),
      stale: false,
      staleReason: "STAGING — DATA CONTOH. Bukan data satelit sebenarnya.",
      source: "demo",
    },
    total24h: features.filter((h) => h.confidenceClass !== "low").length,
    topProvinces: buildDemoProvinceCounts(),
    window: { from: from.toISOString(), to: to.toISOString(), hours: 24 },
    truncated: false,
  };
}
