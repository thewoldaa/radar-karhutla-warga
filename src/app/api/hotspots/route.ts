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
  .regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/, "bbox tidak valid")
  .transform((value) => value.split(",").map(Number))
  .refine(([west, south, east, north]) => {
    // Bounded, finite coordinates only. Unbounded decimal precision would also
    // create an unlimited CDN cache-key space (cache bypass) and force a DB
    // round-trip per request.
    return (
      [west, south, east, north].every((n) => Number.isFinite(n)) &&
      west >= -180 &&
      east <= 180 &&
      south >= -90 &&
      north <= 90 &&
      west < east &&
      south < north
    );
  }, "bbox di luar rentang yang sah");

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
  // Coordinates arrive validated and finite; round to 3 decimals (~110 m) so the
  // cache key space stays bounded and near-identical viewports share a response.
  const bbox = parsed.data.bbox
    ? {
        west: Number(parsed.data.bbox[0].toFixed(3)),
        south: Number(parsed.data.bbox[1].toFixed(3)),
        east: Number(parsed.data.bbox[2].toFixed(3)),
        north: Number(parsed.data.bbox[3].toFixed(3)),
      }
    : undefined;

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
