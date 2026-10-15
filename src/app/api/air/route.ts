/**
 * GET /api/air — internal API for air quality (Fase 2).
 *
 * The browser never calls Open-Meteo/OpenAQ directly: those calls happen on the
 * server (scheduled ingest) and this route reads what we stored. When the
 * database is empty it falls back to a LIVE model fetch for the configured
 * cities, so the panel works before the first ingest — and it says so.
 *
 * Caching: 15 minutes at the CDN. The CAMS model refreshes a few times a day, so
 * this is generous for users while keeping us far from Open-Meteo's limits.
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { loadCityAirModel, readStoredAir } from "@/lib/data/air";
import { isSupabaseConfigured } from "@/lib/db/client";

export const runtime = "nodejs";

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lon: z.coerce.number().min(-180).max(180).optional(),
});

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    lat: url.searchParams.get("lat") ?? undefined,
    lon: url.searchParams.get("lon") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parameter lokasi tidak valid", details: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  // Prefer stored data (fast, and survives an upstream outage).
  if (isSupabaseConfigured()) {
    const stored = await readStoredAir();
    if (stored.readings.length > 0) {
      return NextResponse.json(stored, {
        headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" },
      });
    }
  }

  // Nothing stored yet: fetch live from the model and be explicit about it.
  const live = await loadCityAirModel();
  const now = new Date().toISOString();

  if (!live.ok) {
    return NextResponse.json(
      {
        readings: [],
        freshness: {
          lastUpdated: null,
          fetchedAt: now,
          level: "nodata",
          stale: true,
          staleReason: "Gagal mengambil data kualitas udara.",
          source: "firms",
        },
        attribution: {
          openMeteo: "Weather data by Open-Meteo.com",
          cams: "CAMS ENSEMBLE (Copernicus Atmosphere Monitoring Service)",
        },
      } satisfies import("@/lib/types").AirResponse,
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }

  const lastUpdated = live.readings.reduce<string | null>(
    (latest, r) => (!latest || r.observedAt > latest ? r.observedAt : latest),
    null,
  );

  return NextResponse.json(
    {
      readings: live.readings,
      freshness: {
        lastUpdated,
        fetchedAt: now,
        level: lastUpdated ? "fresh" : "nodata",
        stale: false,
        staleReason: "Data model diambil langsung (belum tersimpan di basis data).",
        source: "firms",
      },
      attribution: {
        openMeteo: "Weather data by Open-Meteo.com",
        cams: "CAMS ENSEMBLE (Copernicus Atmosphere Monitoring Service)",
      },
    } satisfies import("@/lib/types").AirResponse,
    { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" } },
  );
}
