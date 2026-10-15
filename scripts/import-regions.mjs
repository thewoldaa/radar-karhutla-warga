/**
 * Imports ADM1 (province) boundaries into public.regions.
 *
 * Usage:
 *   node scripts/import-regions.mjs <path-to-geojson> [supabase-url] [secret-key]
 *
 * Get the GeoJSON (Indonesia ADM1) from geoBoundaries:
 *   https://www.geoboundaries.org/api/current/gbOpen/IDN/ADM1/
 *   → gjDownloadURL (geoBoundaries-IDN-ADM1.geojson)
 *
 * LICENSE NOTE (verified 2026-10-15): the gbOpen IDN ADM1 release is licensed
 * under ODbL 1.0 (Open Data Commons Open Database License), sourced from
 * OpenStreetMap. If you use it, keep the attribution
 * "geoBoundaries / OpenStreetMap contributors" on the "Tentang Data" page.
 *
 * Requires the migration (0001_init.sql) to have been applied first.
 * The script replaces the whole regions table (delete + insert).
 */

import { readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

const [, , geoJsonPath, urlArg, keyArg] = process.argv;
const url = urlArg ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = keyArg ?? process.env.SUPABASE_SECRET_KEY;

if (!geoJsonPath) {
  console.error("Usage: node scripts/import-regions.mjs <path-to-geojson> [url] [secret]");
  process.exit(1);
}
if (!url || !key) {
  console.error("Supabase URL/key tidak ditemukan. Isi .env.local atau lewatkan argumen.");
  process.exit(1);
}

const geo = JSON.parse(readFileSync(geoJsonPath, "utf8"));
if (geo.type !== "FeatureCollection" || !Array.isArray(geo.features)) {
  console.error("Berkas bukan FeatureCollection GeoJSON.");
  process.exit(1);
}

function ringToWkt(ring) {
  return `(${ring.map(([lon, lat]) => `${lon} ${lat}`).join(",")})`;
}

function polygonToWkt(polygon) {
  return `(${polygon.map(ringToWkt).join(",")})`;
}

function geoJsonToWkt(geometry) {
  if (geometry.type === "Polygon") {
    return `MULTIPOLYGON(${polygonToWkt(geometry.coordinates)})`;
  }
  if (geometry.type === "MultiPolygon") {
    return `MULTIPOLYGON(${geometry.coordinates.map(polygonToWkt).join(",")})`;
  }
  throw new Error(`Geometri tidak didukung: ${geometry.type}`);
}

const payload = geo.features.map((feature, index) => {
  const props = feature.properties ?? {};
  const name =
    props.shapeName ?? props.NAME_1 ?? props.name ?? props.NAME ?? `Wilayah ${index + 1}`;
  const code = props.shapeISO ?? props.shapeID ?? props.GID_1 ?? null;
  return {
    code: code ? String(code) : null,
    name: String(name),
    geom: `SRID=4326;${geoJsonToWkt(feature.geometry)}`,
  };
});

console.log(`Menyiapkan ${payload.length} wilayah…`);

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { error: deleteError } = await supabase.from("regions").delete().neq("id", 0);
if (deleteError) {
  console.error("Gagal mengosongkan tabel regions:", deleteError.message);
  process.exit(1);
}

const { data, error } = await supabase.from("regions").insert(payload).select("id");
if (error) {
  console.error("Gagal menyimpan regions:", error.message);
  process.exit(1);
}
console.log(`Selesai: ${data?.length ?? 0} wilayah tersimpan di public.regions.`);
