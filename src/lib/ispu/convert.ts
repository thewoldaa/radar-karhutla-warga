/**
 * ISPU (Indeks Standar Pencemar Udara) conversion — Indonesia.
 *
 * Source: Permen LHK No. P.14/MENLHK/SETJEN/KUM.1/7/2020, Berita Negara RI
 * Tahun 2020 Nomor 774. Verified 2026-10-15 (docs/01-VERIFIKASI.md B16-B19).
 *
 * Formula (Lampiran I):
 *   I = ((Ia - Ib) / (Xa - Xb)) * (Xx - Xb) + Ib
 *   Ia/Ib = ISPU upper/lower bound, Xa/Xb = concentration upper/lower bound,
 *   Xx = measured concentration.
 *
 * IMPORTANT: ISPU is defined for a 24-HOUR average. If we display a value
 * derived from a shorter window (instantaneous or hourly), the caller MUST set
 * `isEstimate: true` so the UI can label it "perkiraan". The regulation does not
 * define a label for this; treating it as an estimate is our own precaution.
 */

export type IspuCategoryId =
  | "baik"
  | "sedang"
  | "tidak-sehat"
  | "sangat-tidak-sehat"
  | "berbahaya";

export interface IspuCategory {
  id: IspuCategoryId;
  label: string;
  /** Official colour per Lampiran II (kept for parity with official displays). */
  color: string;
  /** General, non-medical guidance in simple Indonesian. */
  advice: string;
}

/**
 * Category colours follow the regulation's own palette (Lampiran II):
 * hijau / biru / kuning / merah / hitam. The UI must never rely on colour
 * alone — always render the label text and a distinct shape/icon too.
 */
export const ISPU_CATEGORIES: Record<IspuCategoryId, IspuCategory> = {
  baik: {
    id: "baik",
    label: "Baik",
    color: "#16a34a",
    advice:
      "Udara baik. Aktivitas di luar ruangan aman untuk semua orang.",
  },
  sedang: {
    id: "sedang",
    label: "Sedang",
    color: "#2563eb",
    advice:
      "Kelompok sensitif (anak-anak, lansia, ibu hamil, penderita asma atau jantung) sebaiknya mengurangi aktivitas berat di luar ruangan.",
  },
  "tidak-sehat": {
    id: "tidak-sehat",
    label: "Tidak Sehat",
    color: "#ca8a04",
    advice:
      "Kurangi aktivitas di luar ruangan. Kelompok sensitif sebaiknya tetap di dalam ruangan. Pakai masker bila harus keluar.",
  },
  "sangat-tidak-sehat": {
    id: "sangat-tidak-sehat",
    label: "Sangat Tidak Sehat",
    color: "#dc2626",
    advice:
      "Hindari aktivitas di luar ruangan. Tutup jendela dan tetap di dalam ruangan. Pakai masker bila terpaksa keluar.",
  },
  berbahaya: {
    id: "berbahaya",
    label: "Berbahaya",
    color: "#111827",
    advice:
      "Tetap di dalam ruangan dan ikuti arahan otoritas setempat. Segera cari bantuan medis bila mengalami sesak napas atau nyeri dada.",
  },
};

/**
 * PM2.5 breakpoints (24-hour average, µg/m³).
 *
 * The ISPU bounds are the CATEGORY boundaries (0/50/100/200/300/500), which is
 * what the regulation's worked example implies: 31.4 µg/m³ → ISPU 70.
 *   ((100 - 50) / (55.4 - 15.5)) * (31.4 - 15.5) + 50 = 69.9 ≈ 70
 *
 * VERIFY (docs/01-VERIFIKASI.md B19): the regulation does not state what to do
 * above 500 µg/m³. We cap at 500 and flag `isBeyondScale` so the UI can say
 * "> 500" instead of inventing a number.
 */
export const PM25_BREAKPOINTS = [
  { concLow: 0, concHigh: 15.5, ispuLow: 0, ispuHigh: 50 },
  { concLow: 15.5, concHigh: 55.4, ispuLow: 50, ispuHigh: 100 },
  { concLow: 55.4, concHigh: 150.4, ispuLow: 100, ispuHigh: 200 },
  { concLow: 150.4, concHigh: 250.4, ispuLow: 200, ispuHigh: 300 },
  { concLow: 250.4, concHigh: 500, ispuLow: 300, ispuHigh: 500 },
] as const;

/** Highest concentration the regulation's table covers. */
export const PM25_SCALE_MAX = 500;

export interface IspuResult {
  /** Rounded ISPU value, capped at 500. */
  value: number;
  category: IspuCategory;
  /** True when PM2.5 exceeded the regulation's table (>500 µg/m³). */
  isBeyondScale: boolean;
  /** True when the input was not a 24-hour average (caller decides). */
  isEstimate: boolean;
}

export interface ConvertOptions {
  /** Set true when the concentration is NOT a 24-hour average. */
  isEstimate?: boolean;
}

/**
 * Converts a PM2.5 concentration (µg/m³) to an ISPU value and category.
 * Returns null for invalid input (negative, NaN, Infinity) — the caller must
 * treat that as "unknown", never as "clean air".
 */
export function pm25ToIspu(
  concentration: number | null | undefined,
  options: ConvertOptions = {},
): IspuResult | null {
  if (concentration === null || concentration === undefined) return null;
  if (!Number.isFinite(concentration) || concentration < 0) return null;

  const isBeyondScale = concentration > PM25_SCALE_MAX;
  // Cap only for the interpolation; `isBeyondScale` records the real situation.
  const clamped = Math.min(concentration, PM25_SCALE_MAX);

  // Pick the first bucket whose upper bound covers the value. Using `<=` keeps
  // boundary values (e.g. exactly 15.5) in the lower category, matching the
  // regulation's continuous ranges.
  const bucket =
    PM25_BREAKPOINTS.find((b) => clamped <= b.concHigh) ??
    PM25_BREAKPOINTS[PM25_BREAKPOINTS.length - 1];

  const raw =
    ((bucket.ispuHigh - bucket.ispuLow) / (bucket.concHigh - bucket.concLow)) *
      (clamped - bucket.concLow) +
    bucket.ispuLow;

  /**
   * Round UP, not to nearest.
   *
   * Why: the regulation defines categories by CONCENTRATION range, but displays
   * an ISPU number. Rounding to nearest can push a value back into the category
   * below — e.g. 15.6 µg/m³ computes to 50.125, which rounds to 50 = "Baik",
   * even though 15.6 µg/m³ is in the "Sedang" range. Understating air quality is
   * the dangerous direction for a health warning.
   *
   * Ceiling keeps the number and the category consistent, and still matches the
   * regulation's own worked example (31.4 µg/m³ → 69.9 → 70).
   */
  const value = Math.min(PM25_SCALE_MAX, Math.max(0, Math.ceil(raw)));

  return {
    value,
    category: categoryForIspu(value),
    isBeyondScale,
    isEstimate: options.isEstimate ?? false,
  };
}

/** Maps an ISPU value to its category (Lampiran II). */
export function categoryForIspu(value: number): IspuCategory {
  if (value <= 50) return ISPU_CATEGORIES.baik;
  if (value <= 100) return ISPU_CATEGORIES.sedang;
  if (value <= 200) return ISPU_CATEGORIES["tidak-sehat"];
  if (value <= 300) return ISPU_CATEGORIES["sangat-tidak-sehat"];
  return ISPU_CATEGORIES.berbahaya;
}

/**
 * Formats an ISPU result for display, honouring the two honesty flags:
 * beyond-scale values are shown as "> 500", estimates get an explicit suffix.
 */
export function formatIspu(result: IspuResult): string {
  const base = result.isBeyondScale ? `> ${PM25_SCALE_MAX}` : String(result.value);
  return result.isEstimate ? `${base} (perkiraan)` : base;
}
