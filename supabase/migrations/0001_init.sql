-- Radar Karhutla Warga — skema awal
-- Target: Supabase (Postgres 15+) + PostGIS
-- Prinsip: waktu disimpan UTC; kolom sensitif tidak pernah di-grant ke anon;
--          view publik memakai security_invoker; penulisan hanya lewat server.
--
-- Cara pakai:
--   1. Supabase Dashboard > Database > Extensions: aktifkan "postgis" (schema: extensions)
--      dan "pg_cron" (Integrations > Cron).
--   2. Jalankan file ini di SQL Editor.
--   3. Jalankan `npm run verify:db` untuk memeriksa hasilnya.
--
-- [VERIFIKASI] Sebelum produksi:
--   - uji RLS dengan pgTAP (docs/02-ATRIBUSI-DAN-LEGAL.md bagian 7)
--   - tetapkan masa retensi resmi (butuh keputusan pemilik + tinjauan hukum)

-- ============================================================================
-- 0. Ekstensi (aktifkan lewat Dashboard bila belum; baris ini idempoten)
-- ============================================================================
create extension if not exists postgis with schema extensions;

-- ============================================================================
-- 1. hotspots — titik panas NASA FIRMS
--    lat/lon disimpan eksplisit (dipakai untuk query & filter viewport),
--    geom dihitung otomatis untuk indeks spasial dan join wilayah.
-- ============================================================================
create table if not exists public.hotspots (
  id                bigint generated always as identity primary key,
  lat               double precision not null check (lat between -90 and 90),
  lon               double precision not null check (lon between -180 and 180),
  geom              extensions.geometry(Point, 4326)
                      generated always as
                      (extensions.st_setsrid(extensions.st_makepoint(lon, lat), 4326)) stored,
  acq_at            timestamptz not null,                 -- UTC (acq_date + acq_time)
  satellite         text not null,                        -- N20, N21, N, T, A
  instrument        text not null,                        -- VIIRS / MODIS
  confidence_class  text not null
                      check (confidence_class in ('low','nominal','high')),
  confidence_raw    text,                                 -- 'l'/'n'/'h' atau angka MODIS
  frp               numeric(10,2),
  daynight          text check (daynight in ('D','N')),
  source            text not null,                        -- VIIRS_NOAA21_NRT, dst.
  created_at        timestamptz not null default now(),
  constraint hotspots_unique unique (lat, lon, acq_at, satellite)
);

create index if not exists hotspots_geom_gix on public.hotspots using gist (geom);
create index if not exists hotspots_acq_at_idx on public.hotspots (acq_at desc);
create index if not exists hotspots_lat_idx on public.hotspots (lat);
create index if not exists hotspots_lon_idx on public.hotspots (lon);

-- ============================================================================
-- 2. air_readings — kualitas udara (model & stasiun)   [Fase 2]
-- ============================================================================
create table if not exists public.air_readings (
  id             bigint generated always as identity primary key,
  provider       text not null,                           -- 'open-meteo' | 'openaq'
  kind           text not null check (kind in ('station','model')),
  station_id     text,
  location_name  text,
  lat            double precision not null,
  lon            double precision not null,
  geom           extensions.geometry(Point, 4326)
                   generated always as
                   (extensions.st_setsrid(extensions.st_makepoint(lon, lat), 4326)) stored,
  pm25           numeric(8,2),
  pm10           numeric(8,2),
  aqi_us         integer,
  ispu_value     integer,
  ispu_category  text,
  observed_at    timestamptz not null,
  fetched_at     timestamptz not null default now()
);

create index if not exists air_readings_geom_gix on public.air_readings using gist (geom);
create index if not exists air_readings_observed_idx on public.air_readings (observed_at desc);
create unique index if not exists air_readings_unique
  on public.air_readings (provider, coalesce(station_id, ''), observed_at);

-- ============================================================================
-- 3. reports — laporan warga (moderasi)   [Fase 3]
-- ============================================================================
create table if not exists public.reports (
  id                    bigint generated always as identity primary key,
  category              text not null check (category in ('asap','api','banjir','lainnya')),
  note                  text check (char_length(note) <= 280),
  geom_exact            extensions.geography(Point, 4326) not null,  -- SENSITIF: moderator saja
  geom_public           extensions.geography(Point, 4326) not null,  -- dibulatkan ~1 km
  photo_path            text,
  status                text not null default 'pending'
                          check (status in ('pending','approved','rejected','hidden')),
  flag_count            integer not null default 0,
  device_hash           text,                                        -- SENSITIF: HMAC(deviceId, secret)
  ip_hash               text,                                        -- SENSITIF: HMAC(ip, secret)
  consent_version       text,                                        -- bukti persetujuan (UU PDP Pasal 24)
  nearest_hotspot_km    numeric(6,2),                                -- info netral, bukan verifikasi
  nearest_hotspot_age_h numeric(6,2),
  created_at            timestamptz not null default now(),
  moderated_by          uuid,
  moderated_at          timestamptz
);

create index if not exists reports_public_geom_gix on public.reports using gist (geom_public);
create index if not exists reports_status_idx on public.reports (status, created_at desc);

-- ============================================================================
-- 4. trend_snapshots — sinyal sosial (manual)   [Fase 4]
-- ============================================================================
create table if not exists public.trend_snapshots (
  id            bigint generated always as identity primary key,
  captured_at   timestamptz not null default now(),
  topic         text not null,
  rank          integer,
  score         numeric(12,2),
  source        text not null default 'manual',
  keyword_match text[] not null default '{}'
);

create index if not exists trend_snapshots_captured_idx on public.trend_snapshots (captured_at desc);

-- ============================================================================
-- 5. report_rate_limits — rate limit 5 laporan/jam (per perangkat+IP, bentuk hash)  [Fase 3]
-- ============================================================================
create table if not exists public.report_rate_limits (
  id           bigint generated always as identity primary key,
  bucket       timestamptz not null,                      -- date_bin('1 hour', now(), ...)
  device_hash  text not null,
  ip_hash      text not null,
  count        integer not null default 0,
  constraint rrl_unique unique (bucket, device_hash, ip_hash)
);

create index if not exists rrl_bucket_idx on public.report_rate_limits (bucket);

-- ============================================================================
-- 6. regions — batas provinsi (ADM1) untuk agregasi "5 provinsi teratas"
--    Impor dengan: node scripts/import-regions.mjs <geoBoundaries-ADM1.geojson>
--    Sumber usulan: geoBoundaries gbOpen IDN ADM1.
--    LISENSI: Open Data Commons Open Database License 1.0 (ODbL) — WAJIB
--    mencantumkan atribusi "geoBoundaries" + "OpenStreetMap contributors"
--    di halaman Tentang Data bila data ini dipakai.
-- ============================================================================
create table if not exists public.regions (
  id       bigint generated always as identity primary key,
  code     text unique,                                   -- kode BPS/provinsi bila tersedia
  name     text not null,
  geom     extensions.geometry(MultiPolygon, 4326) not null
);

create index if not exists regions_geom_gix on public.regions using gist (geom);

-- ============================================================================
-- 7. ingestion_runs — log jalannya ingest (observabilitas)
--    Tanpa log ini, "tidak ada titik panas" tidak bisa dibedakan dari "cron gagal".
-- ============================================================================
create table if not exists public.ingestion_runs (
  id          bigint generated always as identity primary key,
  source      text not null,
  status      text not null check (status in ('ok','error','skipped')),
  detail      text,
  fetched     integer not null default 0,
  upserted    integer not null default 0,
  duration_ms integer,
  created_at  timestamptz not null default now()
);

create index if not exists ingestion_runs_created_idx on public.ingestion_runs (created_at desc);

-- ============================================================================
-- 8. Retensi (pg_cron) — sesuaikan dengan keputusan retensi resmi
--    [VERIFIKASI] masa retensi perlu keputusan pemilik + tinjauan hukum (UU PDP).
-- ============================================================================
-- select cron.schedule('purge-hotspots', '15 3 * * *',
--   $$delete from public.hotspots where acq_at < now() - interval '30 days'$$);
-- select cron.schedule('purge-air', '20 3 * * *',
--   $$delete from public.air_readings where observed_at < now() - interval '90 days'$$);
-- select cron.schedule('purge-reports', '25 3 * * *',
--   $$delete from public.reports where created_at < now() - interval '365 days'$$);
-- select cron.schedule('purge-rate-limits', '30 3 * * *',
--   $$delete from public.report_rate_limits where bucket < now() - interval '7 days'$$);
-- select cron.schedule('purge-ingestion-runs', '35 3 * * *',
--   $$delete from public.ingestion_runs where created_at < now() - interval '90 days'$$);
-- select cron.schedule('purge-cron-details', '40 3 * * *',
--   $$delete from cron.job_run_details where end_time < now() - interval '7 days'$$);

-- ============================================================================
-- 9. RLS — aktifkan; akses publik hanya baca data non-sensitif
-- ============================================================================
alter table public.hotspots           enable row level security;
alter table public.air_readings       enable row level security;
alter table public.reports            enable row level security;
alter table public.trend_snapshots    enable row level security;
alter table public.report_rate_limits enable row level security;
alter table public.regions            enable row level security;
alter table public.ingestion_runs     enable row level security;

-- Data publik (aman dibaca siapa pun): titik panas, udara, tren, wilayah.
drop policy if exists hotspots_public_read on public.hotspots;
create policy hotspots_public_read on public.hotspots
  for select to anon, authenticated using (true);

drop policy if exists air_public_read on public.air_readings;
create policy air_public_read on public.air_readings
  for select to anon, authenticated using (true);

drop policy if exists trends_public_read on public.trend_snapshots;
create policy trends_public_read on public.trend_snapshots
  for select to anon, authenticated using (true);

drop policy if exists regions_public_read on public.regions;
create policy regions_public_read on public.regions
  for select to anon, authenticated using (true);

-- reports / report_rate_limits / ingestion_runs:
--   TIDAK ada policy untuk anon — akses hanya lewat server (secret key)
--   atau view reports_public di bawah.

-- ============================================================================
-- 10. View publik laporan — tanpa geom_exact & device_hash/ip_hash   [Fase 3]
-- ============================================================================
create or replace view public.reports_public
with (security_invoker = true)
as
select
  r.id,
  r.category,
  r.note,
  r.geom_public              as geom,
  r.photo_path,
  r.created_at,
  r.nearest_hotspot_km,
  r.nearest_hotspot_age_h
from public.reports r
where r.status = 'approved';

grant select on public.reports_public to anon, authenticated;

-- ============================================================================
-- 11. Fungsi agregasi provinsi (dipakai server untuk "5 provinsi teratas")
-- ============================================================================
create or replace function public.province_hotspot_counts(
  from_ts timestamptz,
  to_ts timestamptz,
  include_low boolean default false
)
returns table (name text, count bigint)
language sql
stable
as $$
  select r.name, count(h.id) as count
  from public.hotspots h
  join public.regions r on extensions.st_intersects(h.geom, r.geom)
  where h.acq_at >= from_ts
    and h.acq_at <= to_ts
    -- Bound the work: reject unbounded windows instead of scanning everything.
    and to_ts >= from_ts
    and to_ts - from_ts <= interval '8 days'
    and (include_low or h.confidence_class <> 'low')
  group by r.name
  order by count(h.id) desc
  limit 5;
$$;

-- SECURITY: functions get EXECUTE for PUBLIC by default and are auto-exposed by
-- PostgREST. The server calls this with the secret key, so the public roles do
-- not need it — revoking prevents unauthenticated spatial-join abuse.
revoke all on function public.province_hotspot_counts(timestamptz, timestamptz, boolean)
  from public, anon, authenticated;

-- ============================================================================
-- 12. Catatan keamanan
-- ============================================================================
-- * Penulisan (ingest, laporan baru, moderasi) HANYA lewat server (secret key).
-- * Jangan pernah memberi grant pada kolom geom_exact/device_hash/ip_hash ke anon.
-- * Uji sebelum rilis (pgTAP / supabase test db):
--     - anon select reports_public  -> hanya baris approved
--     - anon select reports (tabel) -> ditolak/empty
--     - anon select kolom sensitif  -> ditolak (42501)
-- * [VERIFIKASI] Supabase sedang mengubah default grants platform menjadi opt-in;
--   setelah membuat tabel, periksa "Exposed schemas" & default privileges di dashboard.
--   Jalankan `npm run verify:db` untuk memeriksa eksposur dasar.
