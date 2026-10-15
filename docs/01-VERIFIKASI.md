# Daftar [VERIFIKASI] — Radar Karhutla Warga

Semua butir di bawah dicek terhadap **dokumentasi/halaman resmi** pada **15 Oktober 2026** (kecuali ditandai lain).
Legenda: ✅ sudah terverifikasi (aman dipakai) · ⚠️ terverifikasi dengan catatan · ❌ belum terverifikasi (jangan diasumsikan; wajib dicek sebelum dipakai).

> Angka kuota/harga/kebijakan dapat berubah kapan saja. Cantumkan tanggal pengecekan di halaman "Tentang Data" dan perbarui dokumen ini setiap fase.

---

## A. Titik panas — NASA FIRMS

| # | Butir | Status | Catatan |
|---|---|---|---|
| A1 | Pola URL Area API: `/api/area/csv/[MAP_KEY]/[SOURCE]/[bbox]/[DAY_RANGE]` (+ `[DATE]` opsional) | ✅ | Respons **hanya CSV** (format lain ditolak). API v4.2.0. |
| A2 | Urutan bbox `west,south,east,north`; bbox Indonesia usulan **95,-11,141,6** | ⚠️ | Urutan terverifikasi; endpoint `/api/countries` **tidak tersedia** → bbox usulan belum terverifikasi terhadap extent resmi. Validasi visual di Fase 1 (titik Aceh/Papua muncul). |
| A3 | `DAY_RANGE` maksimum 5 | ✅ | Validasi klien wajib: server menerima 0/-1. |
| A4 | Daftar SOURCE: `VIIRS_NOAA20_NRT`, `VIIRS_NOAA21_NRT`, `MODIS_NRT`, `VIIRS_SNPP_NRT`, dll. | ✅ | ⚠️ `VIIRS_SNPP_NRT` berhenti **2 Nov 2026** (S-NPP). Prioritas: NOAA-21 (primer), NOAA-20 (sekunder). |
| A5 | Kuota **5.000 transaksi / 10 menit / MAP_KEY**; query besar = banyak transaksi | ✅ | Contoh resmi: 1 query `world/1` VIIRS ≈ 36 transaksi. Pantau `…/mapserver/mapkey_status/?MAP_KEY=…`. |
| A6 | Kode error/HTTP saat kuota habis; penangguhan key | ❌ | Tidak terdokumentasi. Tangani 429/5xx generik + backoff; uji saat punya key. |
| A7 | Kolom CSV: `latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight` | ✅ | Bentuk persis respons ber-key belum diuji (perlu MAP_KEY). `acq_time` = HHMM **UTC**. |
| A8 | `confidence`: VIIRS `l/n/h`; MODIS angka 0–100 | ✅ | Dua skala **tidak dapat disamakan**; jangan gabung ke satu skala numerik. |
| A9 | Latensi NRT global ≈ ≤3 jam; RT/URT hanya AS/Kanada | ✅ | Kelola ekspektasi di UI ("bukan real-time"). |
| A10 | Kebijakan data: boleh komersial (CC0), atribusi diminta, dilarang menyiratkan endorsement NASA | ✅ | Teks atribusi di `02-ATRIBUSI-DAN-LEGAL.md`. |
| A11 | Filter low-confidence malam (anomali magnetik Atlantik Selatan mencakup Indonesia) | ✅ | Dokumentasi VIIRS resmi — jadikan **keharusan**, bukan opsi. |
| A12 | Dampak berhentinya S-NPP terhadap segmen SOURCE di Area API | ❌ | Konfirmasi ke tim FIRMS; sementara: fallback otomatis bila satu sumber mengembalikan CSV kosong. |

## B. Kualitas udara

| # | Butir | Status | Catatan |
|---|---|---|---|
| B1 | Open-Meteo Air Quality: `https://air-quality-api.open-meteo.com/v1/air-quality` + `current=pm2_5,pm10,us_aqi` | ✅ | Satuan μg/m³; `us_aqi` tersedia untuk Indonesia (uji Kalteng 15 Okt 2026). |
| B2 | Batas gratis: 10.000/hari, 5.000/jam, 600/menit; multi-koordinat **mengalikan** hitungan call; maks 1.000 lokasi/permintaan | ✅ | Limit per menit aktif (HTTP 429). Limit bulanan belum ditegakkan keras — jangan diandalkan. |
| B3 | **Free tier = non-komersial**; iklan/sponsor = komersial → wajib langganan | ✅ | Definisi eksplisit di Terms Open-Meteo. **Konsekuensi: sebelum monetisasi aktif, langganan wajib.** |
| B4 | Harga langganan (Standard ~€29/bln; Professional ~€99/bln) | ⚠️ | Harga hanya di widget Stripe; verifikasi langsung di halaman pricing saat checkout. |
| B5 | Atribusi: tautan "Weather data by Open-Meteo.com" **di dekat data** + kredit **CAMS ENSEMBLE** | ✅ | Dua lapis; kredit CAMS hanya disebut di docs Air Quality. |
| B6 | Kualitas: CAMS global ~45 km, per 3 jam; **bukan pengukuran stasiun** | ✅ | Label UI wajib: "model". |
| B7 | Variabel `pm10_wildfires` / `pm2_5_total_organic_matter` | ✅ (jangan dipakai) | **null di luar Eropa** — tidak berguna untuk Indonesia. |
| B8 | OpenAQ: header `X-API-Key`; batas 60/menit & 2.000/jam | ✅ | Header respons `x-ratelimit-*`. |
| B9 | OpenAQ: CORS diblokir → wajib proxy server | ✅ | Rekomendasi resmi FAQ OpenAQ. |
| B10 | OpenAQ: endpoint `/v3/locations?bbox=…&parameters_id=2` dan `/v3/parameters/2/latest` | ✅ | `bbox=minLon,minLat,maxLon,maxLat`; presisi 4 desimal. |
| B11 | OpenAQ: lisensi per lokasi (`licenses[].commercialUseAllowed`) | ⚠️ | Wajib audit per lokasi Indonesia sebelum monetisasi; kecualikan yang non-komersial. |
| B12 | Jumlah stasiun PM2,5 aktif di Sumatra/Kalimantan | ❌ | Tidak dapat dicek tanpa key. **Cek segera setelah daftar key** — menentukan apakah layer stasiun layak atau cukup model. |
| B13 | Harga tier "Custom use" OpenAQ | ❌ | Tidak dipublikasikan ("Contact us"). |
| B14 | Durasi cache resmi OpenAQ | ❌ | Tidak ada angka resmi; pakai cache konservatif (mis. 10 menit). |
| B15 | Google Air Quality API (fallback) | ✅ | 10.000 call gratis/bln, lalu $5/1.000; cakupan Indonesia belum diverifikasi. |
| B16 | ISPU: kategori 1–50/51–100/101–200/201–300/≥301; batas PM2,5 15,5/55,4/150,4/250,4/500 | ✅ | Permen LHK P.14/2020 (BN 774/2020), status **Berlaku** per 15 Okt 2026. |
| B17 | Rumus interpolasi `I = ((Ia−Ib)/(Xa−Xb)) × (Xx−Xb) + Ib` | ✅ | Validasi contoh resmi: 31,4 µg/m³ → 70. |
| B18 | ISPU resmi = rata-rata 24 jam; label untuk nilai sesaat | ⚠️ | Regulasi **tidak** mengatur label "perkiraan"; ini pilihan kehati-hatian kami — tulis jelas di UI. |
| B19 | Ketentuan PM2,5 > 500 µg/m³ | ❌ | Tidak diatur di Permen; usulan: tampilkan "> 500 (Berbahaya)". |
| B20 | Nomor darurat: 112 (nasional), 117 (BNPB), 119 (ambulans), 113 (damkar) | ⚠️ | Variasi daerah (mis. damkar kode area). Verifikasi ulang saat rilis; jangan hardcode nomor lokal. |

## C. Platform

| # | Butir | Status | Catatan |
|---|---|---|---|
| C1 | Firebase App Hosting wajib Blaze; region `asia-southeast1` tersedia | ✅ | Region **harus diset eksplisit** (default baru `us-east4`). |
| C2 | Dukungan Next.js: 15.2.x `active`; 16.x **preview** | ✅ | **Pin 15.2.x (≥15.2.6)**; cek tabel dukungan sebelum upgrade. |
| C3 | Kuota App Hosting: bandwidth 10 GiB/bln; Cloud Run 180k vCPU-s / 2 jt req; Cloud Build 2.500 mnt | ✅ | 10 rb kunjungan ≈ $0,01; 1 juta ≈ $69,58. |
| C4 | Secret via Cloud Secret Manager (`firebase apphosting:secrets:set` + `grantaccess`); `NEXT_PUBLIC_` bocor ke klien | ✅ | Jangan pakai `NEXT_PUBLIC_` untuk rahasia; set `availability: RUNTIME`. |
| C5 | Cloud Scheduler: 3 job gratis/akun; autentikasi OIDC ke endpoint; endpoint **wajib verifikasi token sendiri** | ✅ | Verifikasi: JWKS, `iss`, `aud`, email SA. Tanpa ini endpoint bisa dibakar siapa pun. **Jalur opsional** — proyek ini default memakai GitHub Actions + HMAC. |
| C5b | GitHub Actions cron: minimum 5 menit; bisa tertunda saat beban tinggi; jadwal **nonaktif setelah 60 hari tanpa aktivitas repo** | ✅ | Dokumentasi GitHub resmi. Mitigasi terpasang di `.github/workflows/ingest.yml`: langkah re-enable otomatis + cek kesegaran sebelum ingest. |
| C5c | HMAC ingest: replay window 5 menit, perbandingan constant-time | ✅ | Diuji end-to-end di server sungguhan: tanda tangan benar → lolos; salah → 401; timestamp kedaluwarsa → 401; body diubah → 401. (12 tes unit tambahan.) |
| C6 | App Hosting tidak punya preview channel | ✅ | Sediakan backend staging terpisah. |
| C7 | Perilaku service worker / `/sw.js` di App Hosting | ❌ | Tidak terdokumentasi; uji di domain kustom (header `Cache-Control` untuk `/sw.js`). |
| C8 | Supabase Free: DB 500 MB, storage 1 GB, egress 5 GB, pause 7 hari idle | ✅ | Ingest 30 menit menjaga aktivitas; `cron.job_run_details` menambah disk — jadwalkan cleanup. |
| C9 | PostGIS tersedia (termasuk Free); pasang di schema `extensions`, **bukan** `public` | ✅ | Sejak PostGIS 2.3 tidak relocatable. |
| C10 | pg_cron + pg_net di Free | ⚠️ | Tidak ada pembatasan paket yang disebut; **verifikasi di dashboard** saat setup. Rekomendasi: maks 8 job, ≤10 mnt/job. |
| C11 | Signed URL: masa berlaku maksimum | ⚠️ | Tidak ada maksimum resmi; untuk foto pakai ≤1 jam. |
| C12 | `@supabase/ssr`: cookie sesi httpOnly | ❌ | Tidak disebut di docs; berdampak pada paparan XSS sesi moderator. Uji; pertimbangkan auth cookie sendiri. |
| C13 | Kunci `anon`/`service_role` legacy deprecated akhir 2026 | ✅ | Pakai `sb_publishable_…` (klien) & `sb_secret_…` (server). |
| C14 | View RLS: wajib `with(security_invoker = true)` (PG15+) | ✅ | Plus GRANT eksplisit; buktikan dengan pgTAP. |
| C15 | Backup: Free tanpa backup otomatis | ✅ | Jadwalkan `supabase db dump` berkala + simpan di luar. |
| C16 | Cloud Scheduler minimum interval 1 menit | ✅ | 30 menit aman. |

## D. Peta, PWA, anti-abuse

| # | Butir | Status | Catatan |
|---|---|---|---|
| D1 | Tile `tile.openstreetmap.org`: larangan bulk/offline; peringatan khusus layanan komersial | ✅ | **Produksi beriklan: jangan pakai.** Prototipe saja. |
| D2 | OpenFreeMap: gratis tanpa batas view, **komersial diizinkan**, tanpa API key, ada style Dark | ✅ | Tanpa SLA; "may discontinue at any time". Siapkan cadangan. |
| D3 | Thunderforest: 150 rb tile/bln gratis, komersial diizinkan | ✅ | Atribusi: "Thunderforest" + "© OpenStreetMap contributors". |
| D4 | CARTO: 1 juta req/bln gratis untuk komersial | ✅ | Style MapLibre + Dark Matter; atribusi © CARTO + OSM. |
| D5 | MapTiler & Stadia free tier **melarang** komersial | ✅ | Jangan dipakai untuk aplikasi beriklan (Stadia $20/bln, MapTiler Flex $30/bln bila berbayar). |
| D6 | MapLibre GL JS stabil 6.14.0; ESM-only; **WebGL2 wajib** | ✅ | Deteksi WebGL2 + fallback non-peta. |
| D7 | Cluster GeoJSON bawaan (`cluster: true`) | ✅ | Tidak perlu plugin. |
| D8 | Serwist (`@serwist/next`) menggantikan next-pwa | ⚠️ | `@serwist/turbopack` belum jelas stabil (10 masih preview) — uji build Turbopack vs webpack. |
| D9 | Background Sync hanya Chromium | ✅ | Antrean IndexedDB + tombol "Kirim sekarang" sebagai pengganti. |
| D10 | Safari menghapus storage situs setelah 7 hari tanpa interaksi (kecuali terinstal) | ✅ | Simpan draf hanya sementara; hapus setelah terkirim. |
| D11 | `sharp`: metadata/EXIF dihapus default; `.rotate()` = autoOrient | ✅ | Urutan `.rotate().resize()` penting; validasi magic bytes (`file-type`) sebelum proses. |
| D12 | Re-encode canvas di klien menghapus seluruh EXIF (semua browser) | ❌ | Spesifikasi HTML tidak menjamin (bug W3C 23510) → gerbang wajib di server. |
| D13 | Turnstile Free: challenge tak terbatas, 10 hostname/widget, wajib verifikasi `siteverify` di server | ✅ | Token sekali pakai, berlaku 300 detik. Perilaku lonjakan trafik belum diketahui. |
| D14 | Rate limit Postgres (sliding window) di Free | ❌ | Tidak ada pola resmi Supabase; uji beban sendiri (atau Upstash Redis: 500 rb command/bln gratis). |
| D15 | HMAC + secret server untuk `device_hash` (ICO/OWASP) | ✅ | Simpan hanya hash; secret di Secret Manager + rotasi. |
| D16 | Kualitas data OSM Indonesia (jalan, batas desa) | ❌ | Uji visual di Riau/Kalteng/Sumsel sebelum rilis. |
| D17 | Rate limit per detik penyedia tile | ❌ | Tidak dipublikasikan (CARTO/Thunderforest/Stadia). |
| D18 | Next.js + MapLibre SSR (dynamic import tanpa SSR) | ✅ | Diverifikasi di Fase 1: `dynamic(..., { ssr: false })` berhasil di build produksi. MapLibre 6 memakai **named exports** (bukan default export) dan **WebGL2 wajib**. |
| D19 | Ambang numerik kelas confidence MODIS (0–100 → low/nominal/high) | ❌ | **Tidak dipublikasikan NASA.** Fase 1 memakai konstanta proyek < 30 = rendah, ≥ 80 = tinggi (`src/lib/sources/firms/confidence.ts`), dilabeli jelas di UI sebagai ambang praktis, bukan ambang resmi. Validasi lapangan sebelum produksi. |
| D20 | Bentuk byte-level CSV FIRMS dari respons ber-key | ❌ | Parser Fase 1 diuji terhadap contoh resmi NASA (17 tes unit lulus). Verifikasi ulang saat MAP_KEY tersedia (jalankan ingest pertama & periksa `ingestion_runs`). |
| D21 | Lisensi geoBoundaries IDN ADM1 | ✅ | **ODbL 1.0** (bukan CC BY 4.0 seperti dugaan awal Fase 0). Wajib atribusi geoBoundaries + OpenStreetMap contributors. |

## E. Iklan, hukum, operasional

| # | Butir | Status | Catatan |
|---|---|---|---|
| E1 | AdMob = aplikasi saja; web/PWA murni → **AdSense** | ✅ | AdMob butuh app di store + app readiness review. |
| E2 | AdSense di PWA terinstal (standalone) | ⚠️ | Tidak ada dokumen eksplisit "PWA"; aturan: "web-based pages and approved WebView technologies". Secara teknis tetap halaman web. |
| E3 | AdSense: 18+, konten orisinal; review beberapa hari–4 minggu; verifikasi identitas (Jun 2026, ambang $0) | ✅ | Siapkan konten bermakna sebelum mendaftar. |
| E4 | Sensitive Events (sejak Feb 2024): Google dapat membatasi monetisasi saat bencana | ✅ | **Pendapatan iklan tidak stabil tepat saat trafik puncak** — utamakan sponsor langsung. |
| E5 | Larangan iklan di layar "alerts/navigation"; jangan menempel tombol; rasio iklan ≤ konten | ✅ | **Layar peta & peringatan darurat bebas iklan.** |
| E6 | Consent Google hanya untuk EEA/UK/Swiss; non-EEA tidak wajib Consent Mode v2 | ✅ | Untuk Indonesia: kewajiban consent berasal dari **UU PDP**, bukan kebijakan Google. |
| E7 | Pembayaran AdSense Indonesia: EFT/wire; ambang payout Rp1.300.000; PIN via pos | ✅ | Siapkan verifikasi alamat sejak dini. |
| E8 | ads.txt di root domain | ✅ | Sangat direkomendasikan (bukan wajib). |
| E9 | Reservasi ruang iklan via CSS `min-height` (anti-CLS) | ✅ | Dokumentasi Google Publisher Tag. |
| E10 | PSE wajib daftar sebelum dipakai; gratis via OSS + NIB; tidak daftar → blokir | ✅ | **Blocker rilis publik** — mulai proses lebih awal. |
| E11 | Kewajiban UGC: tata kelola konten + kanal pelaporan (safe harbor) | ✅ | SLA takedown (1×24 jam / 1×4 jam) hanya dari pemberitaan — **[VERIFIKASI]** teks resmi. |
| E12 | UU PDP: hak subjek ≤3×24 jam; retensi; sanksi s.d. 2% pendapatan | ✅ | Kanal permintaan (email) + SOP; hapus data atas permintaan. |
| E13 | PP pelaksana UU PDP & Lembaga PDP (status Okt 2026) | ❌ | Belum rampung per laporan terakhir; pantau. |
| E14 | Klasifikasi PSE untuk aplikasi komunitas ini | ❌ | Butuh penilaian hukum; tidak ada ambang ukuran resmi. |
| E15 | Kepmen 522/2024 (SLA takedown) — teks resmi | ❌ | Tidak ditemukan daring; verifikasi via JDIH Komdigi. |
| E16 | Tarif/pajak monetisasi (PPh, PKP) untuk sponsor langsung | ❌ | **Butuh konsultasi pajak/akuntan** sebelum menerima pembayaran sponsor. |
| E17 | Domain & email resmi (untuk sponsor + verifikasi) | ❌ | Pilih domain (.id/.com), siapkan email; harga registrar bervariasi. |

## F. Catatan metodologi

- Riset dilakukan 15 Okt 2026 oleh beberapa agen riset + verifikator independen (adversarial) yang membaca dokumentasi resmi dan, bila memungkinkan, menguji endpoint langsung (FIRMS tanpa key, Open-Meteo, OpenAQ tanpa key, GitHub/npm registry).
- Probe HTTP langsung ke FIRMS membuktikan validasi format/parameter, **bukan** bentuk respons ber-key.
- Butir bertanda ❌ **tidak boleh diasumsikan** di kode; tulis komentar `VERIFY:` di kode yang bergantung padanya (aturan proyek).
- Perbarui tabel ini setiap fase; cantumkan tanggal pengecekan terakhir di halaman "Tentang Data".
