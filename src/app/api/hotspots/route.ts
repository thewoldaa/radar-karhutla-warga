/**
 * GET /api/hotspots — internal API used by the map.
 *
 * The browser NEVER calls FIRMS directly: this route reads from our database
 * (populated by the scheduled ingest) and returns a compact GeoJSON-friendly
 * payload plus freshness metadata.
 *
 * Caching: 5 minutes at the CDN (`s-maxage`) — ingest runs every 30 minutes and
 * FIRMS itself refreshes at most hourly, so this protects the source quota
 * without making the UI feel stale.
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { buildHotspotsResponse } from "@/lib/data/hotspot-response";
import { parseTimeFilter } from "@/lib/utils/time";

export const runtime = "nodejs";

const bboxSchema = z
  .string()
  .regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/, "bbox tidak valid");

const querySchema = z.object({
  hours: z.enum(["24h", "48h", "7d"]).optional().default("24h"),
  low: z.enum(["0", "1"]).optional().default("0"),
  bbox: bboxSchema.optional(),
});

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    hours: url.searchParams.get("hours") ?? undefined,
    low: url.searchParams.get("low") ?? undefined,
    bbox: url.searchParams.get("bbox") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parameter tidak valid", details: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const timeFilter = parseTimeFilter(parsed.data.hours);
  let bbox: { west: number; south: number; east: number; north: number } | undefined;
  if (parsed.data.bbox) {
    const [west, south, east, north] = parsed.data.bbox.split(",").map(Number);
    // Ignore degenerate boxes (e.g. the user panned across the antimeridian):
    // lon >= west AND lon <= east would silently return nothing.
    if (west < east && south < north) {
      bbox = { west, south, east, north };
    }
  }

  const payload = await buildHotspotsResponse({
    hours: timeFilter.hours,
    includeLowConfidence: parsed.data.low === "1",
    bbox,
  });

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
