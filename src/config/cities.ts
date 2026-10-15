/**
 * Cities monitored for air quality.
 *
 * Chosen for smoke-haze exposure: fire-prone provinces plus the largest
 * population centres downwind. ~30 points keeps Open-Meteo usage modest —
 * remember multi-coordinate requests multiply the API-call count
 * (docs/01-VERIFIKASI.md B2), so this list is polled by the server on a
 * schedule and cached, never per user request.
 *
 * Coordinates are approximate city centres (4 decimals ≈ 11 m), which is far
 * more precision than a ~45 km CAMS grid cell needs — good enough and honest.
 */

export interface City {
  id: string;
  name: string;
  province: string;
  lat: number;
  lon: number;
  /** Higher = more relevant to the haze season (used for ordering in the UI). */
  priority: number;
}

export const CITIES: City[] = [
  // --- Sumatra (Riau/Jambi/Sumsel: the classic haze corridor) ---
  { id: "pekanbaru", name: "Pekanbaru", province: "Riau", lat: 0.5071, lon: 101.4478, priority: 1 },
  { id: "dumai", name: "Dumai", province: "Riau", lat: 1.6667, lon: 101.45, priority: 2 },
  { id: "bengkalis", name: "Bengkalis", province: "Riau", lat: 1.4667, lon: 102.1167, priority: 3 },
  { id: "jambi", name: "Jambi", province: "Jambi", lat: -1.6101, lon: 103.6131, priority: 1 },
  { id: "palembang", name: "Palembang", province: "Sumatera Selatan", lat: -2.9761, lon: 104.7754, priority: 1 },
  { id: "kayu-agung", name: "Kayu Agung", province: "Sumatera Selatan", lat: -3.4, lon: 104.8333, priority: 3 },
  { id: "medan", name: "Medan", province: "Sumatera Utara", lat: 3.5952, lon: 98.6722, priority: 2 },
  { id: "padang", name: "Padang", province: "Sumatera Barat", lat: -0.9471, lon: 100.4172, priority: 3 },
  { id: "bandar-lampung", name: "Bandar Lampung", province: "Lampung", lat: -5.4292, lon: 105.2611, priority: 3 },
  { id: "batam", name: "Batam", province: "Kepulauan Riau", lat: 1.0456, lon: 104.0305, priority: 2 },
  { id: "banda-aceh", name: "Banda Aceh", province: "Aceh", lat: 5.5483, lon: 95.3238, priority: 4 },

  // --- Kalimantan (peat fires; the second haze corridor) ---
  { id: "pontianak", name: "Pontianak", province: "Kalimantan Barat", lat: -0.0263, lon: 109.3425, priority: 1 },
  { id: "ketapang", name: "Ketapang", province: "Kalimantan Barat", lat: -1.8205, lon: 109.9801, priority: 2 },
  { id: "sintang", name: "Sintang", province: "Kalimantan Barat", lat: 0.0746, lon: 111.4936, priority: 2 },
  { id: "palangka-raya", name: "Palangka Raya", province: "Kalimantan Tengah", lat: -2.208, lon: 113.9165, priority: 1 },
  { id: "sampit", name: "Sampit", province: "Kalimantan Tengah", lat: -2.5333, lon: 112.95, priority: 2 },
  { id: "banjarmasin", name: "Banjarmasin", province: "Kalimantan Selatan", lat: -3.3186, lon: 114.5944, priority: 2 },
  { id: "balikpapan", name: "Balikpapan", province: "Kalimantan Timur", lat: -1.2379, lon: 116.8529, priority: 2 },
  { id: "samarinda", name: "Samarinda", province: "Kalimantan Timur", lat: -0.5022, lon: 117.1536, priority: 2 },
  { id: "tarakan", name: "Tarakan", province: "Kalimantan Utara", lat: 3.3273, lon: 117.5775, priority: 4 },

  // --- Java & Bali (population centres affected by transported haze) ---
  { id: "jakarta", name: "Jakarta", province: "DKI Jakarta", lat: -6.2088, lon: 106.8456, priority: 2 },
  { id: "bandung", name: "Bandung", province: "Jawa Barat", lat: -6.9175, lon: 107.6191, priority: 3 },
  { id: "semarang", name: "Semarang", province: "Jawa Tengah", lat: -6.9932, lon: 110.4203, priority: 3 },
  { id: "surabaya", name: "Surabaya", province: "Jawa Timur", lat: -7.2575, lon: 112.7521, priority: 3 },
  { id: "denpasar", name: "Denpasar", province: "Bali", lat: -8.6705, lon: 115.2126, priority: 4 },

  // --- Sulawesi, Nusa Tenggara, Papua ---
  { id: "makassar", name: "Makassar", province: "Sulawesi Selatan", lat: -5.1477, lon: 119.4327, priority: 3 },
  { id: "kendari", name: "Kendari", province: "Sulawesi Tenggara", lat: -3.945, lon: 122.4989, priority: 4 },
  { id: "manado", name: "Manado", province: "Sulawesi Utara", lat: 1.4748, lon: 124.8421, priority: 4 },
  { id: "mataram", name: "Mataram", province: "Nusa Tenggara Barat", lat: -8.5833, lon: 116.1167, priority: 4 },
  { id: "kupang", name: "Kupang", province: "Nusa Tenggara Timur", lat: -10.1772, lon: 123.607, priority: 5 },
  { id: "jayapura", name: "Jayapura", province: "Papua", lat: -2.5916, lon: 140.669, priority: 4 },
  { id: "merauke", name: "Merauke", province: "Papua Selatan", lat: -8.4932, lon: 140.4018, priority: 3 },
];

/** Nearest configured city to a point (used to label a user's own location). */
export function nearestCity(
  lat: number,
  lon: number,
): { city: City; distanceKm: number } | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  let best: { city: City; distanceKm: number } | null = null;
  for (const city of CITIES) {
    const distanceKm = haversineKm(lat, lon, city.lat, city.lon);
    if (!best || distanceKm < best.distanceKm) best = { city, distanceKm };
  }
  return best;
}

/** Great-circle distance in kilometres. */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}
