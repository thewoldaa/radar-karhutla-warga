/**
 * POST /api/ingest — scheduled FIRMS ingestion.
 *
 * Callers (both authenticated; the endpoint is fail-closed without config):
 *   - GitHub Actions cron (HMAC signature headers) — the project default.
 *   - Cloud Scheduler with an OIDC identity token — optional self-host path.
 *
 * Idempotent by design: rows are upserted on (lat, lon, acq_at, satellite),
 * so overlapping 30-minute windows never duplicate data.
 */

import { NextResponse } from "next/server";

import {
  recordIngestionRun,
  upsertHotspots,
  type UpsertHotspot,
} from "@/lib/data/hotspots";
import { isSupabaseConfigured } from "@/lib/db/client";
import {
  isIngestAuthConfigured,
  isHmacConfigured,
  isOidcConfigured,
  verifyIngestRequest,
} from "@/lib/ingest-auth";
import { classifyConfidence } from "@/lib/sources/firms/confidence";
import { fetchAllFirmsSources } from "@/lib/sources/firms/client";
import { acqToIso } from "@/lib/sources/firms/parse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  if (!isIngestAuthConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Ingest belum dikonfigurasi di server." },
      { status: 503 },
    );
  }

  // Read the raw body once: the HMAC is computed over the exact bytes sent.
  const rawBody = await request.text();
  const auth = await verifyIngestRequest(request, rawBody);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.reason }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Basis data belum dikonfigurasi." },
      { status: 503 },
    );
  }

  const startedAt = Date.now();
  const results = await fetchAllFirmsSources(1); // DAY_RANGE 1 (quota-friendly)

  const summary = {
    ok: true,
    method: auth.method,
    sources: [] as Array<{
      source: string;
      ok: boolean;
      fetched: number;
      upserted: number;
      error?: string;
    }>,
    durationMs: 0,
  };

  for (const result of results) {
    const sourceStarted = Date.now();
    let upserted = 0;
    let rows: UpsertHotspot[] = [];

    if (result.ok) {
      rows = result.hotspots.flatMap((h): UpsertHotspot[] => {
        const acqAt = acqToIso(h.acqDate, h.acqTime);
        const confidenceClass = classifyConfidence(h.confidenceRaw, h.instrument);
        if (!acqAt || !confidenceClass) return [];
        return [
          {
            lat: h.lat,
            lon: h.lon,
            acqAt,
            satellite: h.satellite,
            instrument: h.instrument,
            confidenceClass,
            confidenceRaw: h.confidenceRaw,
            frp: h.frp,
            daynight: h.daynight,
            source: result.source,
          },
        ];
      });

      try {
        upserted = await upsertHotspots(rows);
      } catch (error) {
        result.ok = false;
        result.error =
          error instanceof Error ? error.message : "Gagal menyimpan titik panas";
      }
    }

    await recordIngestionRun({
      source: result.source,
      status: result.ok ? "ok" : "error",
      detail: result.error,
      fetched: result.hotspots.length,
      upserted,
      durationMs: Date.now() - sourceStarted,
    });

    summary.sources.push({
      source: result.source,
      ok: result.ok,
      fetched: result.hotspots.length,
      upserted,
      error: result.error,
    });
  }

  summary.durationMs = Date.now() - startedAt;
  const allFailed = summary.sources.every((s) => !s.ok);
  return NextResponse.json(summary, { status: allFailed ? 502 : 200 });
}

export async function GET(): Promise<NextResponse> {
  // Convenience for operators: no token required, reveals no data, just state.
  return NextResponse.json({
    ok: true,
    message:
      "Gunakan POST dengan tanda tangan HMAC (GitHub Actions) atau token OIDC (Cloud Scheduler) untuk menjalankan ingest.",
    configured: {
      hmac: isHmacConfigured(),
      oidc: isOidcConfigured(),
      database: isSupabaseConfigured(),
    },
  });
}
