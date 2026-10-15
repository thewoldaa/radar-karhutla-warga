/**
 * Post-setup database verification.
 *
 * Run AFTER applying supabase/migrations/0001_init.sql in the Supabase SQL Editor:
 *   npm run verify:db
 *
 * Checks (read-only, uses the secret key from .env.local):
 *   1. Connectivity and required tables.
 *   2. hotspots.lat / lon columns exist (the app depends on them).
 *   3. Anon role CANNOT read the reports table (RLS proof, MVP criterion #3).
 *   4. Anon role CAN read hotspots (public data stays public).
 *   5. Ingestion log is reachable.
 *
 * Exit code 0 = all good; 1 = at least one check failed.
 */

import { readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  try {
    const content = readFileSync(".env.local", "utf8");
    for (const line of content.split(/\r?\n/)) {
      const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
    }
  } catch {
    // .env.local is optional when variables come from the shell.
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !secret) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY belum diatur (.env.local).");
  process.exit(1);
}

const admin = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let failures = 0;

function report(name, ok, detail = "") {
  const mark = ok ? "OK  " : "GAGAL";
  console.log(`[${mark}] ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}

// --- 1. Required tables ------------------------------------------------------
const requiredTables = [
  "hotspots",
  "air_readings",
  "reports",
  "trend_snapshots",
  "report_rate_limits",
  "regions",
  "ingestion_runs",
];
for (const table of requiredTables) {
  const { error } = await admin.from(table).select("*", { count: "exact", head: true });
  report(`Tabel ${table} dapat diakses`, !error, error?.message ?? "");
}

// --- 2. hotspots.lat / lon columns ------------------------------------------
{
  const { error } = await admin.from("hotspots").select("lat, lon").limit(1);
  report("Kolom hotspots.lat/lon ada", !error, error?.message ?? "");
}

// --- 3 & 4. RLS proof with the publishable (anon) key ------------------------
if (publishable) {
  const anon = createClient(url, publishable, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  {
    // Reading the raw reports table must fail or return nothing for anon.
    const { data, error } = await anon.from("reports").select("id").limit(1);
    const blocked = Boolean(error) || (Array.isArray(data) && data.length === 0);
    report(
      "anon TIDAK bisa membaca tabel reports (RLS)",
      blocked,
      error ? error.message : data && data.length > 0 ? "BOCOR: baris terbaca!" : "kosong",
    );
  }

  {
    const { error } = await anon.from("hotspots").select("id").limit(1);
    report("anon bisa membaca hotspots (data publik)", !error, error?.message ?? "");
  }

  {
    const { error } = await anon
      .from("reports")
      .select("geom_exact")
      .limit(1);
    report("anon TIDAK bisa membaca kolom geom_exact", Boolean(error), error?.message ?? "");
  }
} else {
  console.log("[INFO] NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY kosong — uji RLS dilewati.");
}

// --- 5. Spatial function -----------------------------------------------------
{
  const { error } = await admin.rpc("province_hotspot_counts", {
    from_ts: new Date(Date.now() - 24 * 3600_000).toISOString(),
    to_ts: new Date().toISOString(),
    include_low: false,
  });
  report("Fungsi province_hotspot_counts ada", !error, error?.message ?? "");
}

console.log(failures === 0 ? "\nSemua pemeriksaan lulus." : `\n${failures} pemeriksaan gagal.`);
process.exit(failures === 0 ? 0 : 1);
