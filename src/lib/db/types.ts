/**
 * Database row types (mirrors supabase/migrations/0001_init.sql).
 */

export interface HotspotRow {
  id: number;
  geom: unknown; // PostGIS geography (GeoJSON via select)
  acq_at: string;
  satellite: string;
  instrument: string;
  confidence_class: string;
  confidence_raw: string | null;
  frp: number | null;
  daynight: string | null;
  source: string;
  created_at: string;
}

export interface IngestionRunRow {
  id: number;
  source: string;
  status: "ok" | "error" | "skipped";
  detail: string | null;
  fetched: number;
  upserted: number;
  duration_ms: number | null;
  created_at: string;
}
