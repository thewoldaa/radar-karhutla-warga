"use client";

import { useState } from "react";

import { EMERGENCY } from "@/config/site";
import { freshnessMessage } from "@/lib/freshness";
import type { HotspotsResponse } from "@/lib/types";
import { ageLabel, formatWIB } from "@/lib/utils/time";

export interface SummarySheetProps {
  data: HotspotsResponse;
}

const LEGEND: Array<{ label: string; className: string; shape: string }> = [
  { label: "Kepercayaan tinggi", className: "bg-red-600", shape: "ring-2 ring-white" },
  { label: "Kepercayaan sedang", className: "bg-orange-600", shape: "ring-1 ring-white" },
  { label: "Kepercayaan rendah", className: "bg-yellow-700", shape: "opacity-60" },
];

/**
 * Bottom sheet "Ringkasan": 24h national count, top provinces, legend,
 * freshness banner, and the standing disclaimer. Collapsible so the map stays
 * usable on small screens.
 */
export function SummarySheet({ data }: SummarySheetProps) {
  const [open, setOpen] = useState(true);
  const { freshness } = data;
  // Trust the server-computed level. Recomputing it here from `lastUpdated`
  // would turn "we hold no data" into a green "fresh" banner.
  const level = freshness.level;
  const isDemo = freshness.source === "demo";
  const hasData = freshness.lastUpdated !== null;
  // `total24h === null` means the count could not be determined — show "-" rather
  // than "0", which would falsely read as "no hot spots".
  const totalLabel = data.total24h === null ? "?" : String(data.total24h);

  const bannerClasses =
    level === "critical" || level === "nodata"
      ? "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
      : level === "warn"
        ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
        : "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";

  return (
    <section
      aria-label="Ringkasan data titik panas"
      className="absolute inset-x-0 bottom-0 z-10 rounded-t-2xl border border-b-0 border-[var(--border-subtle)] bg-[var(--surface)]/97 shadow-lg backdrop-blur"
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="summary-content"
        className="tap-target flex w-full items-center justify-between gap-2 px-4 py-2 text-left"
      >
        <span className="text-sm font-semibold">
          {/* Never claim a count we do not actually have. The bbox we watch is
              slightly wider than Indonesia, so neighbouring detections count too —
              the label says "area pantau", not "nasional". */}
          {hasData
            ? `Ringkasan · ${totalLabel} titik panas 24 jam terakhir`
            : "Ringkasan · belum ada data tersimpan"}
        </span>
        <span aria-hidden="true" className="text-slate-500">
          {open ? "▾" : "▴"}
        </span>
      </button>

      <div
        id="summary-content"
        hidden={!open}
        className="max-h-[45vh] overflow-y-auto px-4 pb-4"
      >
        {isDemo ? (
          <p className="mb-3 rounded-lg border border-purple-300 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-900 dark:border-purple-700 dark:bg-purple-950 dark:text-purple-200">
            DATA CONTOH — untuk pengembangan. Bukan data satelit sebenarnya.
          </p>
        ) : null}

        <p className={`mb-3 rounded-lg border px-3 py-2 text-xs ${bannerClasses}`}>
          {freshness.stale && freshness.staleReason
            ? freshness.staleReason
            : freshnessMessage(
                level,
                freshness.lastUpdated ? formatWIB(freshness.lastUpdated) : "-",
              )}
          {!freshness.stale && freshness.lastUpdated ? (
            <span className="block text-[11px] opacity-80">
              Umur data: {ageLabel(freshness.lastUpdated)}
            </span>
          ) : null}
        </p>

        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          5 provinsi teratas (sesuai filter)
        </h3>
        {data.topProvinces.length > 0 ? (
          <ol className="mb-3 space-y-1">
            {data.topProvinces.map((province, index) => (
              <li key={province.name} className="flex items-center justify-between text-sm">
                <span>
                  <span className="mr-2 inline-block w-4 text-right text-slate-500">
                    {index + 1}.
                  </span>
                  {province.name}
                </span>
                <span className="font-semibold">{province.count}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mb-3 text-xs text-slate-500">
            Data provinsi belum tersedia (batas wilayah belum dimuat).
          </p>
        )}

        {/* Never clip data silently: say so when the viewport limit applies. */}
        {data.truncated ? (
          <p className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            Menampilkan sebagian titik saja (batas tampilan). Perbesar peta untuk melihat
            area tertentu.
          </p>
        ) : null}

        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Keterangan titik
        </h3>
        <ul className="mb-3 space-y-1 text-sm">
          {LEGEND.map((item) => (
            <li key={item.label} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`inline-block h-3.5 w-3.5 rounded-full ${item.className} ${item.shape}`}
              />
              {item.label}
            </li>
          ))}
          <li className="text-xs text-slate-500">
            Ukuran titik mengikuti nilai FRP (kekuatan radiasi panas).
          </li>
          <li className="text-xs text-slate-500">
            Angka di atas mencakup seluruh <strong>area pantau</strong> (bbox sedikit lebih
            luas dari Indonesia), jadi bisa termasuk deteksi di perairan/wilayah tetangga.
          </li>
        </ul>

        <p className="mb-2 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <strong>Titik panas adalah anomali panas yang terdeteksi satelit, belum tentu
          kebakaran.</strong>{" "}
          Satelit tidak mengamati terus-menerus dan awan/asap dapat menghalangi deteksi.
          Data satelit biasanya tertunda sekitar 3 jam.
        </p>

        <p className="text-xs text-slate-600 dark:text-slate-400">
          Bukan pengganti peringatan resmi (BMKG, BNPB/BPBD). Darurat:{" "}
          <a className="underline" href={`tel:${EMERGENCY.national.number}`}>
            {EMERGENCY.national.number}
          </a>{" "}
          · Laporan titik api:{" "}
          <a className="underline" href={`tel:${EMERGENCY.bnpb.number}`}>
            {EMERGENCY.bnpb.number}
          </a>{" "}
          (BNPB).
        </p>
      </div>
    </section>
  );
}
