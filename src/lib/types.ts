/**
 * Shared domain types for the app (server and client).
 */

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

/** Top provinces by hot-spot count inside the current filter window. */
export interface ProvinceCount {
  name: string;
  count: number;
}

/** Freshness metadata shown to users; `stale: true` renders the fallback banner. */
export interface DataFreshness {
  lastUpdated: string; // ISO UTC — newest ingestion/observation time we have
  fetchedAt: string; // ISO UTC — when this response was produced
  stale: boolean; // true when the source failed or data is older than expected
  staleReason?: string; // human-readable Indonesian reason when stale
  source: "firms" | "demo";
}

export interface HotspotsResponse {
  data: HotspotFeature[];
  freshness: DataFreshness;
  total24h: number; // national count in the last 24h (independent of the selected filter)
  topProvinces: ProvinceCount[]; // 5 provinces with the most hot spots in the window
  window: { from: string; to: string; hours: number };
  truncated: boolean; // true when the viewport limit clipped the result
}
