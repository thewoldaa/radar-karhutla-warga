/**
 * DEMO DATA — development only.
 *
 * Rules (project constraints):
 * - Never shown in production: `DEMO_MODE` is hard-disabled when NODE_ENV=production.
 * - Always labelled "DATA CONTOH" in the UI (the response carries source: "demo").
 * - Deterministic (no randomness) so repeated renders are stable.
 *
 * The coordinates below are approximate provincial capitals / known fire-prone
 * areas, used only to make the map meaningful during development.
 */

import type { ConfidenceClass, HotspotFeature } from "@/lib/types";

interface Seed {
  name: string;
  lat: number;
  lon: number;
  weight: number; // relative number of generated points
}

const SEEDS: Seed[] = [
  { name: "Pekanbaru (Riau)", lat: 0.507, lon: 101.447, weight: 6 },
  { name: "Dumai (Riau)", lat: 1.667, lon: 101.444, weight: 4 },
  { name: "Jambi", lat: -1.61, lon: 103.613, weight: 5 },
  { name: "Palembang (Sumsel)", lat: -2.976, lon: 104.775, weight: 5 },
  { name: "Ogan Ilir (Sumsel)", lat: -3.4, lon: 104.6, weight: 3 },
  { name: "Pontianak (Kalbar)", lat: -0.026, lon: 109.342, weight: 4 },
  { name: "Ketapang (Kalbar)", lat: -1.82, lon: 109.98, weight: 3 },
  { name: "Palangka Raya (Kalteng)", lat: -2.21, lon: 113.92, weight: 6 },
  { name: "Sampit (Kalteng)", lat: -2.53, lon: 112.95, weight: 4 },
  { name: "Banjarmasin (Kalsel)", lat: -3.318, lon: 114.594, weight: 3 },
  { name: "Balikpapan (Kaltim)", lat: -1.237, lon: 116.852, weight: 3 },
  { name: "Samarinda (Kaltim)", lat: -0.502, lon: 117.153, weight: 3 },
  { name: "Merauke (Papua)", lat: -8.493, lon: 140.401, weight: 2 },
  { name: "Medan (Sumut)", lat: 3.595, lon: 98.672, weight: 2 },
  { name: "Kubu Raya (Kalbar)", lat: -0.32, lon: 109.4, weight: 3 },
];

const CONFIDENCE_CYCLE: ConfidenceClass[] = ["high", "nominal", "nominal", "high", "low"];
const SATELLITES = ["N21", "N20"];

function pad(n: number, width = 2): string {
  return String(n).padStart(width, "0");
}

/**
 * Builds ~140 deterministic demo hot spots spread over the last 24 hours.
 * `now` is injected so the output is testable.
 */
export function buildDemoHotspots(now: Date = new Date()): HotspotFeature[] {
  const features: HotspotFeature[] = [];
  let index = 0;

  for (const seed of SEEDS) {
    for (let i = 0; i < seed.weight * 3; i++) {
      index += 1;
      // Deterministic offsets: a small lattice around the seed.
      const offsetLat = ((index * 7) % 17) / 100 - 0.08;
      const offsetLon = ((index * 11) % 19) / 100 - 0.09;
      const minutesAgo = (index * 37) % (24 * 60);
      const acqAt = new Date(now.getTime() - minutesAgo * 60_000);

      const confidenceClass = CONFIDENCE_CYCLE[index % CONFIDENCE_CYCLE.length];
      const frp = 2 + ((index * 13) % 90);

      features.push({
        id: `demo-${index}`,
        lat: Number((seed.lat + offsetLat).toFixed(4)),
        lon: Number((seed.lon + offsetLon).toFixed(4)),
        acqAt: acqAt.toISOString(),
        satellite: SATELLITES[index % SATELLITES.length],
        instrument: "VIIRS",
        confidenceClass,
        confidenceRaw:
          confidenceClass === "high" ? "h" : confidenceClass === "nominal" ? "n" : "l",
        frp,
        daynight: index % 3 === 0 ? "N" : "D",
        source: "DEMO",
      });
    }
  }

  return features.sort((a, b) => (a.acqAt < b.acqAt ? 1 : -1));
}

/** Province counts for demo data (approximate grouping by seed name). */
export function buildDemoProvinceCounts(): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();
  for (const seed of SEEDS) {
    const province = seed.name.replace(/\s*\(.*\)$/, "");
    counts.set(province, (counts.get(province) ?? 0) + seed.weight * 3);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

/** Human-readable demo timestamp helper (used in tests). */
export function demoStamp(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}
