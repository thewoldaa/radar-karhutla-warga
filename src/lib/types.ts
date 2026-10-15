/**
 * Shared domain types for the app (server and client).
 */

import type { IspuResult } from "@/lib/ispu/convert";

export type ConfidenceClass = "low" | "nominal" | "high";

/** Geographic bounding box in degrees (west,south,east,north — same order as FIRMS). */
export interface Bbox {
  west: number;
  south: number;
  east: number;
  north: number;
}

/** A satellite hot spot as returned by the internal API (never raw FIRMS rows). */
export interface HotspotFeature {
  id: string;
  lat: number;
  lon: number;
  acqAt: string; // ISO UTC
  satellite: string;
  instrument: string;
  confidenceClass: ConfidenceClass;
  confidenceRaw: string;
  frp: number | null;
  daynight: "D" | "N" | null;
  source: string;
}

/**
 * Air quality reading.
 *
 * `kind` is load-bearing for honesty: "model" is a coarse-area ESTIMATE from a
 * CAMS grid cell (~45 km), "station" is an actual ground measurement. The UI must
 * label them differently and must never present a model value as a measurement.
 */
export interface AirReading {
  provider: "open-meteo" | "openaq";
  kind: "model" | "station";
  stationId: string | null;
  locationName: string;
  lat: number;
  lon: number;
  pm25: number | null;
  pm10: number | null;
  usAqi: number | null;
  /** Present when we could compute ISPU; carries its own estimate flag. */
  ispu: IspuResult | null;
  observedAt: string; // ISO UTC
  attribution: string;
}

export interface AirResponse {
  readings: AirReading[];
  freshness: DataFreshness;
  attribution: { openMeteo: string; cams: string };
}

/** Top provinces by hot-spot count inside the current filter window. */
export interface ProvinceCount {
  name: string;
  count: number;
}

/**
 * Freshness metadata shown to users.
 *
 * `level` is computed ONCE on the server and is the single source of truth for
 * the UI banner. It must never be recomputed on the client from `lastUpdated`,
 * because "no data at all" and "data from 10 minutes ago" must look different:
 * an empty database must NOT read as "no fires today".
 */
export interface DataFreshness {
  /** Newest observation timestamp we hold. `null` = we hold no data at all. */
  lastUpdated: string | null;
  fetchedAt: string; // ISO UTC — when this response was produced
  level: "fresh" | "warn" | "critical" | "nodata";
  stale: boolean; // true when the source failed or data is older than expected
  staleReason?: string; // human-readable Indonesian reason when stale
  source: "firms" | "demo";
}

export interface HotspotsResponse {
  data: HotspotFeature[];
  freshness: DataFreshness;
  /**
   * Detections in the last 24h inside our watch bbox — which is slightly larger
   * than Indonesia, so neighbouring countries' detections are included.
   * `null` = the count could not be determined (read failed). Never render a
   * null count as "0".
   */
  total24h: number | null;
  topProvinces: ProvinceCount[]; // 5 provinces with the most hot spots in the window
  window: { from: string; to: string; hours: number };
  truncated: boolean; // true when the viewport limit clipped the result
}
