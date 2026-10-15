"use client";

import { TIME_FILTERS } from "@/lib/utils/time";

export interface MapControlsProps {
  timeFilter: "24h" | "48h" | "7d";
  onTimeFilterChange: (value: "24h" | "48h" | "7d") => void;
  includeLow: boolean;
  onIncludeLowChange: (value: boolean) => void;
  showHotspots: boolean;
  onShowHotspotsChange: (value: boolean) => void;
  onLocate: () => void;
  isLoading: boolean;
  locationMessage: string | null;
}

/**
 * Map controls, placed at the top of the screen.
 * Accessibility: 44px touch targets, text labels (never colour alone),
 * and real form controls so keyboard and screen readers work.
 */
export function MapControls({
  timeFilter,
  onTimeFilterChange,
  includeLow,
  onIncludeLowChange,
  showHotspots,
  onShowHotspotsChange,
  onLocate,
  isLoading,
  locationMessage,
}: MapControlsProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 p-3">
      <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)]/95 p-2 shadow-sm backdrop-blur">
        <div
          role="group"
          aria-label="Filter waktu data titik panas"
          className="flex overflow-hidden rounded-lg border border-[var(--border-subtle)]"
        >
          {TIME_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => onTimeFilterChange(filter.id)}
              aria-pressed={timeFilter === filter.id}
              className={`tap-target px-3 text-sm font-medium transition-colors ${
                timeFilter === filter.id
                  ? "bg-blue-700 text-white"
                  : "bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onLocate}
          className="tap-target inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] px-3 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <span aria-hidden="true">📍</span> Lokasi saya
        </button>

        <label className="tap-target inline-flex cursor-pointer items-center gap-2 px-1 text-sm">
          <input
            type="checkbox"
            checked={showHotspots}
            onChange={(event) => onShowHotspotsChange(event.target.checked)}
            className="h-4 w-4"
          />
          Lapisan titik panas
        </label>

        <label className="tap-target inline-flex cursor-pointer items-center gap-2 px-1 text-sm">
          <input
            type="checkbox"
            checked={includeLow}
            onChange={(event) => onIncludeLowChange(event.target.checked)}
            className="h-4 w-4"
          />
          Tampilkan kepercayaan rendah
        </label>

        {isLoading ? (
          <span role="status" className="px-1 text-xs text-slate-500">
            Memuat…
          </span>
        ) : null}
      </div>

      {locationMessage ? (
        <p
          role="status"
          className="pointer-events-auto max-w-md rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
        >
          {locationMessage}
        </p>
      ) : null}
    </div>
  );
}
