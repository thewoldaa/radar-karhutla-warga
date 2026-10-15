"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { SummarySheet } from "@/components/summary/SummarySheet";
import { MapControls } from "@/components/map/MapControls";
import { STATIC_MODE } from "@/config/site";
import type { Bbox, HotspotsResponse } from "@/lib/types";

// MapLibre touches `window` at import time → client-only, no SSR.
const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-100 dark:bg-slate-900">
      <p className="text-sm text-slate-600 dark:text-slate-400">Memuat peta…</p>
    </div>
  ),
});

const DEFAULT_STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? "https://tiles.openfreemap.org/styles/liberty";
const DARK_STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL_DARK ?? "https://tiles.openfreemap.org/styles/dark";

export interface MapShellProps {
  initialData: HotspotsResponse;
}

export function MapShell({ initialData }: MapShellProps) {
  const [data, setData] = useState<HotspotsResponse>(initialData);
  const [timeFilter, setTimeFilter] = useState<"24h" | "48h" | "7d">("24h");
  const [includeLow, setIncludeLow] = useState(false);
  const [showHotspots, setShowHotspots] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const bboxRef = useRef<Bbox | null>(null);

  // Follow the OS colour scheme for the map style.
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(media.matches);
    const listener = (event: MediaQueryListEvent) => setIsDark(event.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  const fetchData = useCallback(
    async (hours: "24h" | "48h" | "7d", low: boolean, bbox: Bbox | null) => {
      // Static staging has no server: filtering happens client-side on the
      // baked-in demo data (see the useMemo below).
      if (STATIC_MODE) return;
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ hours, low: low ? "1" : "0" });
        if (bbox) {
          params.set(
            "bbox",
            [bbox.west, bbox.south, bbox.east, bbox.north].map((n) => n.toFixed(4)).join(","),
          );
        }
        const response = await fetch(`/api/hotspots?${params.toString()}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        setData((await response.json()) as HotspotsResponse);
      } catch {
        // Keep the previous payload; the freshness banner stays as-is.
        setData((previous) => ({
          ...previous,
          freshness: {
            ...previous.freshness,
            stale: true,
            staleReason: "Gagal memuat data terbaru. Menampilkan data terakhir yang tersimpan.",
          },
        }));
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // --- Static staging: filter the baked-in demo payload in the browser --------
  const displayData = useMemo<HotspotsResponse>(() => {
    if (!STATIC_MODE) return data;
    const hours = timeFilter === "24h" ? 24 : timeFilter === "48h" ? 48 : 168;
    const from = Date.now() - hours * 3_600_000;
    const inWindow = data.data.filter((h) => new Date(h.acqAt).getTime() >= from);
    const visible = inWindow.filter((h) => includeLow || h.confidenceClass !== "low");
    const bbox = bboxRef.current;
    const inView = bbox
      ? visible.filter(
          (h) =>
            h.lon >= bbox.west && h.lon <= bbox.east && h.lat >= bbox.south && h.lat <= bbox.north,
        )
      : visible;
    const provinceTotals = new Map<string, number>();
    for (const h of visible) {
      // Demo data carries no province field; group by rounded coordinates so the
      // panel stays meaningful without inventing administrative names.
      const key = `${Math.round(h.lat)},${Math.round(h.lon)}`;
      provinceTotals.set(key, (provinceTotals.get(key) ?? 0) + 1);
    }
    const topProvinces = [...provinceTotals.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    return {
      ...data,
      data: inView,
      topProvinces,
      total24h: data.data.filter(
        (h) => Date.now() - new Date(h.acqAt).getTime() <= 86_400_000,
      ).length,
    };
  }, [data, timeFilter, includeLow]);

  const handleBoundsChange = useCallback(
    (bbox: Bbox) => {
      bboxRef.current = bbox;
      void fetchData(timeFilter, includeLow, bbox);
    },
    [fetchData, includeLow, timeFilter],
  );

  const handleTimeFilter = useCallback(
    (next: "24h" | "48h" | "7d") => {
      setTimeFilter(next);
      void fetchData(next, includeLow, bboxRef.current);
    },
    [fetchData, includeLow],
  );

  const handleIncludeLow = useCallback(
    (next: boolean) => {
      setIncludeLow(next);
      void fetchData(timeFilter, next, bboxRef.current);
    },
    [fetchData, timeFilter],
  );

  const handleLocate = useCallback(() => {
    setLocationMessage(null);
    if (!("geolocation" in navigator)) {
      setLocationMessage("Perangkat ini tidak mendukung lokasi.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: Number(position.coords.latitude.toFixed(4)),
          lon: Number(position.coords.longitude.toFixed(4)),
        });
      },
      () => setLocationMessage("Izin lokasi ditolak atau lokasi tidak tersedia."),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }, []);

  const styleUrl = useMemo(() => (isDark ? DARK_STYLE : DEFAULT_STYLE), [isDark]);

  return (
    <div className="relative flex-1 overflow-hidden">
      {STATIC_MODE ? (
        <p
          role="status"
          className="absolute inset-x-0 top-0 z-30 border-b border-purple-300 bg-purple-100 px-3 py-1.5 text-center text-xs font-semibold text-purple-900"
        >
          STAGING — DATA CONTOH. Versi uji tanpa data satelit sebenarnya.
        </p>
      ) : null}

      <MapView
        features={displayData.data}
        styleUrl={styleUrl}
        showHotspots={showHotspots}
        userLocation={userLocation}
        onBoundsChange={handleBoundsChange}
      />

      <MapControls
        timeFilter={timeFilter}
        onTimeFilterChange={handleTimeFilter}
        includeLow={includeLow}
        onIncludeLowChange={handleIncludeLow}
        showHotspots={showHotspots}
        onShowHotspotsChange={setShowHotspots}
        onLocate={handleLocate}
        isLoading={isLoading}
        locationMessage={locationMessage}
      />

      <SummarySheet data={displayData} />
    </div>
  );
}
