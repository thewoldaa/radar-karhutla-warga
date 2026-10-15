/**
 * Confidence classification for FIRMS detections.
 *
 * VIIRS: confidence is already categorical (l/n/h) — used as-is.
 * MODIS: confidence is a 0-100% value. NASA assigns it to the three fire classes
 * (low / nominal / high) but does NOT publish the numeric thresholds.
 *   Source (verified 2026-10-15):
 *   https://www.earthdata.nasa.gov/data/tools/firms/active-fire-data-attributes-modis-viirs
 *   ("Confidence estimates range between 0 and 100% and are assigned one of the
 *    three fire classes..."; the cut-offs themselves are not documented.)
 *
 * Therefore the thresholds below are a project-chosen approximation, kept in one
 * place so they can be tuned after field validation. They are NOT an official
 * NASA classification.
 *
 * VERIFY (docs/01-VERIFIKASI.md A8): confirm the intended MODIS thresholds before
 * publishing any copy that claims an official class.
 */

import type { ConfidenceClass } from "@/lib/types";

export const MODIS_CONFIDENCE_THRESHOLDS = {
  /** Below this value → low confidence. */
  nominal: 30,
  /** At or above this value → high confidence. */
  high: 80,
} as const;

export function classifyConfidence(
  raw: string,
  instrument: string,
): ConfidenceClass | null {
  const value = raw.trim().toLowerCase();
  if (!value) return null;

  const isViirs = instrument.trim().toUpperCase().includes("VIIRS");
  if (isViirs || value === "l" || value === "n" || value === "h") {
    if (value === "l" || value === "low") return "low";
    if (value === "n" || value === "nominal") return "nominal";
    if (value === "h" || value === "high") return "high";
    // Unknown categorical value: fall through to numeric handling.
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  if (numeric < MODIS_CONFIDENCE_THRESHOLDS.nominal) return "low";
  if (numeric >= MODIS_CONFIDENCE_THRESHOLDS.high) return "high";
  return "nominal";
}

/**
 * Default UI rule: hide "low" confidence detections unless the user opts in.
 * Rationale (verified): over Indonesia, VIIRS low-confidence NIGHT pixels can be
 * spurious — the South Atlantic Magnetic Anomaly region (11°E-110°W, 7°N-55°S)
 * covers Indonesia and can cause false brightness temperatures in channel I-4.
 *   https://firms.modaps.eosdis.nasa.gov/content/descriptions/FIRMS_VIIRS_Firehotspots.html
 * NASA removes some of these from NRT, but the guidance stands: treat low
 * confidence carefully.
 */
export function isHiddenByDefault(confidence: ConfidenceClass): boolean {
  return confidence === "low";
}
