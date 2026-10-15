/**
 * Static site configuration.
 * All user-facing text is in Bahasa Indonesia; code identifiers in English.
 */

export const SITE = {
  name: "Radar Karhutla Warga",
  tagline: "Titik panas satelit, kualitas udara, dan laporan warga dalam satu peta",
  description:
    "Peta titik panas satelit, kualitas udara, dan laporan warga. Bukan pengganti peringatan resmi.",
} as const;

/** Emergency numbers — VERIFY per-region before public release (see docs/01-VERIFIKASI.md B20). */
export const EMERGENCY = {
  national: { number: "112", label: "Darurat nasional" },
  bnpb: { number: "117", label: "Pusdalops BNPB (laporan titik api)" },
  ambulance: { number: "119", label: "Ambulans / gawat darurat medis" },
  fire: { number: "113", label: "Pemadam kebakaran (dapat berbeda per daerah)" },
} as const;

export const OFFICIAL_LINKS = [
  { label: "BMKG", href: "https://www.bmkg.go.id" },
  { label: "BNPB", href: "https://bnpb.go.id" },
  { label: "KLH — pemantauan kualitas udara", href: "https://ispu.kemenlh.go.id" },
] as const;

/**
 * Demo data: development only, always labelled "DATA CONTOH" in the UI.
 * Hard-disabled in production builds regardless of the environment variable.
 */
export const DEMO_MODE =
  process.env.NEXT_PUBLIC_DEMO_MODE === "true" &&
  process.env.NODE_ENV !== "production";

/** Indonesian wildfire hot-spot season months (rough, for awareness copy only). */
export const DRY_SEASON_NOTE =
  "Musim kemarau meningkatkan risiko karhutla. Ikuti informasi resmi BMKG dan BNPB/BPBD.";
