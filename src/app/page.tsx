import Link from "next/link";

import { MapShell } from "@/components/map/MapShell";
import { SITE, STATIC_MODE } from "@/config/site";
import { buildHotspotsResponse } from "@/lib/data/hotspot-response";
import { buildStaticHotspotsResponse } from "@/lib/demo/static-payload";

// Hot-spot data refreshes at most every 30 minutes (ingest cadence); cache the
// server-rendered payload for 5 minutes so Slow-4G users get a fast first paint.
// Static exports are prerendered once at build time instead.
export const revalidate = 300;

export default async function HomePage() {
  // A static build has no server: bake the demo payload in at build time.
  const initialData = STATIC_MODE
    ? buildStaticHotspotsResponse()
    : await buildHotspotsResponse({
        hours: 24,
        includeLowConfidence: false,
      });

  return (
    <main className="flex h-dvh flex-col">
      <header className="z-20 flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-2">
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold sm:text-lg">{SITE.name}</h1>
          <p className="truncate text-xs text-slate-600 dark:text-slate-400">
            Titik panas satelit, bukan bukti kebakaran
          </p>
        </div>
        <nav aria-label="Navigasi utama" className="flex shrink-0 items-center gap-2">
          <Link
            href="/tentang-data"
            className="tap-target inline-flex items-center rounded-lg border border-[var(--border-subtle)] px-3 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Tentang Data
          </Link>
        </nav>
      </header>

      <MapShell initialData={initialData} />
    </main>
  );
}
