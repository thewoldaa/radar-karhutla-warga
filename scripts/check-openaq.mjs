/**
 * One-off OpenAQ coverage check.
 *
 * Usage: OPENAQ_API_KEY=... node scripts/check-openaq.mjs
 *
 * Answers the open question in docs/01-VERIFIKASI.md (B12): how many PM2.5
 * stations OpenAQ actually has in Indonesia, and whether their licences allow
 * commercial use. Decides whether the station layer is worth building out or
 * whether model data alone is the honest choice.
 */

import { readFileSync } from "node:fs";

function loadEnvLocal() {
  try {
    for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
      const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
    }
  } catch {
    /* .env.local optional */
  }
}

loadEnvLocal();

const key = process.env.OPENAQ_API_KEY?.trim();
if (!key) {
  console.error("OPENAQ_API_KEY belum diatur. Daftar gratis: https://explore.openaq.org/register");
  process.exit(1);
}

const BASE = "https://api.openaq.org/v3";
const headers = { "X-API-Key": key, "User-Agent": "RadarKarhutlaWarga/0.2 (coverage check)" };

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { headers });
  if (!res.ok) {
    throw new Error(`${path} → HTTP ${res.status}`);
  }
  return res.json();
}

console.log("Memeriksa cakupan stasiun OpenAQ di Indonesia (PM2.5, parameter id 2)…\n");

try {
  // 1. National count.
  const national = await get("/locations?countries_id=1&parameters_id=2&limit=1");
  const total = national.meta?.found ?? "tidak diketahui";
  console.log(`Stasiun PM2.5 di Indonesia (semua jaringan): ${total}`);

  // 2. Reference monitors only — higher data quality.
  const reference = await get("/locations?countries_id=1&parameters_id=2&monitor=true&limit=1");
  console.log(`  di antaranya monitor referensi (monitor=true): ${reference.meta?.found ?? "?"}`);

  // 3. The fire-prone corridor: Sumatra + Kalimantan.
  const bbox = "95,-6,119.5,7.5";
  const corridor = await get(`/locations?bbox=${bbox}&parameters_id=2&limit=100`);
  const results = corridor.results ?? [];
  console.log(`\nDi Sumatra + Kalimantan (bbox ${bbox}): ${corridor.meta?.found ?? results.length}`);

  if (results.length === 0) {
    console.log("  (tidak ada stasiun — lapisan stasiun mungkin tidak layak untuk wilayah ini)");
  } else {
    console.log("\n  Contoh 10 lokasi pertama:");
    for (const loc of results.slice(0, 10)) {
      const licences = (loc.licenses ?? []).map((l) => l.name ?? "?").join(", ") || "tidak dicantumkan";
      const commercial = (loc.licenses ?? []).every((l) => l.commercialUseAllowed === true);
      console.log(
        `   - ${loc.name ?? loc.id} (${loc.coordinates?.latitude?.toFixed(2)}, ${loc.coordinates?.longitude?.toFixed(2)})`,
      );
      console.log(`       lisensi: ${licences} | komersial diizinkan: ${commercial ? "ya" : "tidak/tidak jelas"}`);
    }
  }

  console.log("\nKesimpulan yang perlu Anda ambil:");
  console.log("  - Jika jumlah di Sumatra/Kalimantan < ~5, lapisan stasiun tidak menambah nilai");
  console.log("    nyata; model CAMS (~45 km) sudah cukup dan lebih jujur ditampilkan sendirian.");
  console.log("  - Periksa kolom 'komersial diizinkan' sebelum menampilkan stasiun di situs beriklan.");
} catch (error) {
  console.error("Gagal memeriksa:", error instanceof Error ? error.message : error);
  process.exit(1);
}
