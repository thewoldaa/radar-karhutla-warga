"use client";

import { useCallback, useEffect, useState } from "react";

import { nearestCity } from "@/config/cities";
import type { AirReading, AirResponse } from "@/lib/types";
import { ageLabel, formatWIB } from "@/lib/utils/time";

export interface AirPanelProps {
  userLocation: { lat: number; lon: number } | null;
}

const KIND_LABEL: Record<AirReading["kind"], string> = {
  model: "Model",
  station: "Stasiun",
};

const KIND_EXPLANATION: Record<AirReading["kind"], string> = {
  model: "Model CAMS ±45 km — perkiraan area, bukan pengukuran di titik Anda.",
  station: "Pengukuran alat di lokasi ini.",
};

/**
 * "Udara di lokasiku" panel.
 *
 * Honesty rules baked into the UI:
 *  - the provider kind (model vs station) is always visible;
 *  - an ISPU derived from a non-24h value is labelled "perkiraan";
 *  - advice is general and points to official sources.
 */
export function AirPanel({ userLocation }: AirPanelProps) {
  const [data, setData] = useState<AirResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async (lat: number, lon: number) => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/air?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as AirResponse);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userLocation) return;
    void load(userLocation.lat, userLocation.lon);
  }, [userLocation, load]);

  if (!userLocation) {
    return (
      <p className="text-xs text-slate-600 dark:text-slate-400">
        Tekan <strong>Lokasi saya</strong> untuk melihat kualitas udara di sekitar Anda.
      </p>
    );
  }

  if (loading) {
    return (
      <p role="status" className="text-xs text-slate-600 dark:text-slate-400">
        Memuat data kualitas udara…
      </p>
    );
  }

  if (failed) {
    return (
      <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
        Gagal memuat data kualitas udara. Coba lagi nanti.
      </p>
    );
  }

  if (!data || data.readings.length === 0) {
    return (
      <p className="text-xs text-slate-600 dark:text-slate-400">
        Belum ada data kualitas udara yang tersedia.
        {data?.freshness.staleReason ? ` ${data.freshness.staleReason}` : ""}
      </p>
    );
  }

  // Nearest configured city to the user (the reading is for that grid cell).
  const near = nearestCity(userLocation.lat, userLocation.lon);
  const reading = near
    ? (data.readings.find((r) => r.locationName.startsWith(near.city.name)) ??
      data.readings[0])
    : data.readings[0];

  const ispu = reading.ispu;
  const categoryColor = ispu?.category.color ?? "#64748b";

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        {/* Colour + text + shape: never colour alone (WCAG). */}
        <span
          aria-hidden="true"
          className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: categoryColor }}
        >
          {ispu ? ispu.value : "?"}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {ispu ? ispu.category.label : "Tidak diketahui"}
            {ispu?.isEstimate ? (
              <span className="ml-1 font-normal text-slate-500">(perkiraan)</span>
            ) : null}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {reading.locationName}
            {near && near.distanceKm > 25
              ? ` · ±${Math.round(near.distanceKm)} km dari lokasi Anda`
              : ""}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <dt className="text-slate-500">PM2,5</dt>
        <dd className="font-medium">
          {reading.pm25 === null ? "-" : `${reading.pm25} µg/m³`}
        </dd>
        <dt className="text-slate-500">PM10</dt>
        <dd className="font-medium">
          {reading.pm10 === null ? "-" : `${reading.pm10} µg/m³`}
        </dd>
        <dt className="text-slate-500">Jenis data</dt>
        <dd className="font-medium">
          {KIND_LABEL[reading.kind]}
          {reading.stationId ? ` · ${reading.stationId}` : ""}
        </dd>
        <dt className="text-slate-500">Waktu</dt>
        <dd className="font-medium">
          {formatWIB(reading.observedAt)}
          <span className="ml-1 text-slate-500">({ageLabel(reading.observedAt)})</span>
        </dd>
      </dl>

      <p className="text-[11px] text-slate-500">{KIND_EXPLANATION[reading.kind]}</p>

      {ispu ? (
        <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <strong>Anjuran umum:</strong> {ispu.category.advice}
        </p>
      ) : null}

      <p className="text-[11px] text-slate-500">
        {data.attribution.openMeteo} · {data.attribution.cams}. Kategori ISPU mengikuti
        Permen LHK P.14/2020. Ini bukan nasihat medis — ikuti arahan otoritas kesehatan
        setempat.
      </p>
    </div>
  );
}
