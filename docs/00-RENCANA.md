# Rencana Fase 0 — Radar Karhutla Warga

Status: **Fase 0 (rencana, tanpa kode aplikasi)**.
Semua fakta teknis di dokumen ini telah diverifikasi dari dokumentasi resmi pada **15 Oktober 2026** (metode dan sumber: `docs/01-VERIFIKASI.md`). Angka biaya/kuota dapat berubah — tanggal verifikasi dicatat per butir.

---

## 1. Keputusan arsitektur

| # | Komponen | Keputusan | Catatan kunci (terverifikasi 15 Okt 2026) |
|---|---|---|---|
| 1 | Hosting & deploy | **Firebase App Hosting**, region **asia-southeast1 (Singapura)** | Wajib paket **Blaze**. Region default backend baru `us-east4` → set eksplisit. SSR Next.js di Hosting klasik sudah ditutup untuk proyek baru. |
| 2 | Framework | **Next.js 15.2.x** (pin, patch ≥ 15.2.6), Node.js 22+ | Tabel dukungan resmi App Hosting: 15.2.x = `active`; Next.js 16.x masih **preview** → jangan dikunci untuk produksi. |
| 3 | Database | **Supabase** Free → Pro saat dibutuhkan | PostGIS dipasang di schema `extensions` (bukan `public`). Free: DB 500 MB, storage 1 GB, proyek di-pause setelah 7 hari idle (ingest 30 menit menulis tiap hari sehingga aman). Pro $25/bln: tanpa pause + backup harian 7 hari. |
| 4 | Penjadwalan ingest | **GitHub Actions cron** (utama, keputusan pemilik 15 Okt 2026) + **Cloud Scheduler/OIDC** (opsional) | GHA: gratis untuk repo publik, portabel. ⚠️ Bisa tertunda saat beban tinggi & **dinonaktifkan otomatis setelah 60 hari tanpa aktivitas repo** → workflow memuat langkah re-enable + cek kesegaran sebelum ingest. Endpoint diautentikasi HMAC (replay window 5 menit) atau OIDC. |
| 4b | Lisensi & model pengembangan | **AGPL-3.0-or-later**, repo **publik** sejak Fase 1 | Melindungi dari pengambilan versi tertutup; CI gratis untuk repo publik. Nama "Radar Karhutla Warga" tidak dilindungi lisensi — fork diminta memakai nama berbeda (dicatat di README). |
| 5 | Titik panas | **NASA FIRMS Area API** (CSV), sumber `VIIRS_NOAA20_NRT` + `VIIRS_NOAA21_NRT` | ⚠️ `VIIRS_SNPP_NRT` berhenti **2 Nov 2026**. `MODIS_NRT` hanya pelengkap (MODIS juga menuju akhir masa). Kuota **5.000 transaksi / 10 menit / MAP_KEY**; query besar dihitung sebagai banyak transaksi. `DAY_RANGE` 1–5. Respons **hanya CSV**. |
| 6 | Udara (model) | **Open-Meteo Air Quality** (CAMS global ~45 km) | Free tier = **non-komersial**. Begitu ada iklan/sponsor (komersial) → wajib langganan (Standard, sekitar €29/bln; verifikasi harga saat checkout). Label UI: **"model"**. |
| 7 | Udara (stasiun) | **OpenAQ API v3** | 60 req/menit & 2.000/jam per key. **CORS diblokir** → wajib proxy server (rekomendasi resmi). Label UI: **"stasiun"**. Cek `commercialUseAllowed` per lokasi sebelum menampilkan. |
| 8 | Kategori udara | **ISPU** (Permen LHK P.14/2020) dari PM2,5 | Batas 15,5 / 55,4 / 150,4 / 250,4 / 500 µg/m³; rumus interpolasi resmi. ISPU resmi = rata-rata 24 jam; bila hanya nilai sesaat → label **"perkiraan"**. |
| 9 | Peta | **MapLibre GL JS 6.14** + tile **OpenFreeMap** (default) | Gratis, **komersial diizinkan**, tanpa API key, ada style gelap. Cadangan: Thunderforest (150 rb tile/bln gratis) & CARTO (1 juta req/bln gratis, komersial). Tile `osm.org` **hanya untuk prototipe**. MapLibre v6: ESM-only, **butuh WebGL2**. |
| 10 | Foto laporan | Supabase Storage (bucket privat) + signed URL | Kompres di klien (≤1280 px, ~1 MB); server: validasi magic bytes (`file-type`) + `sharp` (metadata/EXIF dihapus default). |
| 11 | Anti-abuse | **Cloudflare Turnstile** + rate limit 5/jam | Rate limit disimpan sebagai hash di tabel Postgres (`date_bin` per jam). Device ID hanya disimpan sebagai **HMAC + secret server** (bukan ID mentah). Upstash Redis hanya bila diperlukan. |
| 12 | Sinyal sosial | `TrendProvider` — **adapter manual** (admin mengisi) | Tanpa scraping X/Twitter. Tampilkan hanya topik + peringkat + waktu. Label: "Sedang ramai dibicarakan (belum diverifikasi)". |
| 13 | Monetisasi | Slot **sponsor langsung** + slot **iklan jaringan (AdSense)** | ⚠️ **AdMob tidak bisa di web/PWA murni** (hanya aplikasi di store). Jalur AdMob = bungkus TWA + Play Store (opsi lanjutan). Detail: `docs/03-IKLAN.md`. |
| 14 | PWA | **Serwist** (`@serwist/next`) | `next-pwa` sudah tidak terpelihara. Antrean laporan: IndexedDB + tombol "kirim ulang" (Background Sync hanya Chromium). |
| 15 | Batas wilayah provinsi | Tabel `regions` (ADM1) untuk hitung "5 provinsi teratas" | Sumber: **geoBoundaries gbOpen IDN ADM1** — lisensi **ODbL 1.0** (diverifikasi 15 Okt 2026; berbasis OpenStreetMap). Wajib atribusi "geoBoundaries / OpenStreetMap contributors" di Tentang Data. Impor: `scripts/import-regions.mjs`. |
| 16 | Monetisasi (keputusan pemilik) | Slot sponsor langsung + AdSense. **AdMob dibatalkan** (15 Okt 2026) — tanpa TWA/Play Store. | Lihat `docs/03-IKLAN.md`. |

## 2. Struktur repo (rencana)

```
radar-karhutla-warga/
├─ apphosting.yaml                  # konfigurasi App Hosting (env & referensi secret)
├─ firebase.json
├─ next.config.ts
├─ package.json
├─ .env.example                     # daftar variabel (tanpa nilai rahasia)
├─ .gitignore
├─ README.md
├─ docs/
│  ├─ 00-RENCANA.md
│  ├─ 01-VERIFIKASI.md
│  ├─ 02-ATRIBUSI-DAN-LEGAL.md
│  └─ 03-IKLAN.md
├─ supabase/
│  └─ migrations/0001_init.sql
└─ src/
   ├─ app/
   │  ├─ page.tsx                  # peta penuh + bottom sheet "Ringkasan"
   │  ├─ lapor/                    # formulir 3 langkah
   │  ├─ tentang-data/             # sumber, atribusi, batasan, moderasi, privasi
   │  ├─ pasang-iklan/             # media kit (kontak pemilik situs)
   │  ├─ admin/                    # moderasi (login Supabase)
   │  └─ api/
   │     ├─ hotspots/route.ts      # baca dari DB (bukan langsung ke FIRMS)
   │     ├─ air/route.ts
   │     ├─ reports/route.ts
   │     ├─ trends/route.ts
   │     └─ ingest/route.ts        # dipanggil Cloud Scheduler (verifikasi OIDC)
   ├─ components/                  # MapView, HotspotLayer, AirPanel, AdSlot, dll.
   ├─ config/
   │  ├─ cities.ts                 # ~30 kota rawan asap + lokasi pengguna
   │  ├─ ads.ts                    # definisi slot iklan & status aktif
   │  └─ site.ts                   # kontak, disclaimer, tautan otoritas
   └─ lib/
      ├─ sources/{firms,openmeteo,openaq}/   # klien sumber data (server-only)
      ├─ trends/                    # TrendProvider (manual + kerangka adapter resmi)
      ├─ ispu/                      # konversi PM2,5 → ISPU + kategori (+ tes unit Fase 2)
      └─ db/                        # klien Supabase server + tipe skema
```

Struktur mengikuti spesifikasi; `tests/` ditambahkan pada Fase 2 untuk modul ISPU.

## 3. Alur data

```
Cloud Scheduler (tiap 30 mnt, OIDC)
        │
        ▼
POST /api/ingest ──► lib/sources/firms      (CSV NOAA-20/21, DAY_RANGE kecil)
                 ──► lib/sources/openmeteo  (model CAMS, banyak koordinat)
                 ──► lib/sources/openaq     (stasiun, proxy server)
        │  upsert idempoten
        ▼
Supabase (Postgres/PostGIS) ◄── retensi via pg_cron (hotspots 30 hari)
        │
        ▼
GET /api/hotspots | /api/air | /api/reports | /api/trends
   (Cache-Control + fallback data tersimpan)
        │
        ▼
PWA (MapLibre) — banner "Data terakhir diperbarui <waktu>" bila sumber gagal
```

Prinsip:
- Ingest **idempoten**: `upsert` dengan kunci unik `(geom, acq_at, satellite)`.
- Respons API internal diberi `Cache-Control` agar tidak melampaui batas laju sumber.
- Klien **tidak pernah** memanggil FIRMS/Open-Meteo/OpenAQ langsung.
- Waktu disimpan **UTC**; ditampilkan dalam WIB/WITA/WIT sesuai perangkat + label zona.
- Jika sumber gagal: tampilkan data tersimpan terakhir + banner umur data (tanpa mengarang).

## 4. Model data (ringkas)

SQL lengkap (draft, belum diterapkan): `supabase/migrations/0001_init.sql`.

| Tabel | Isi | Retensi (rencana) |
|---|---|---|
| `hotspots` | titik panas FIRMS (geom, acq_at, satelit, confidence_class, frp, source) | 30 hari (pg_cron) |
| `air_readings` | PM2,5 / PM10 / AQI / ISPU, provider + kind (model/stasiun) | 90 hari (usulan) |
| `reports` | laporan warga (geom presisi untuk moderator, geom publik ~1 km, status, flag_count, device_hash) | 12 bulan (usulan — **butuh keputusan**) |
| `trend_snapshots` | topik sosial manual (topik, peringkat, waktu, keyword_match) | 30 hari |
| `report_rate_limits` | bucket rate limit (hash perangkat + hash IP per jam) | ~7 hari |
| `regions` | batas provinsi (ADM1) untuk agregasi "5 provinsi teratas" | referensi |
| view `reports_public` | laporan `approved` **tanpa** `geom_exact` & `device_hash` | — |

Keamanan (ringkas):
- RLS aktif di semua tabel; `anon` hanya boleh `select` titik panas/udara/tren dan laporan berstatus `approved`.
- Kolom sensitif (`geom_exact`, `device_hash`) tidak pernah di-grant ke `anon`; view memakai `security_invoker`.
- Semua penulisan (ingest, laporan, moderasi) lewat server dengan secret key.
- Foto hanya tampil lewat **signed URL** berdurasi pendek.

## 5. Variabel lingkungan

Daftar lengkap: `.env.example`. Aturan:

| Kelompok | Contoh | Penyimpanan |
|---|---|---|
| Rahasia (server-only) | `FIRMS_MAP_KEY`, `OPENAQ_API_KEY`, `SUPABASE_SECRET_KEY`, `TURNSTILE_SECRET_KEY`, `DEVICE_HASH_SECRET`, `IP_HASH_SECRET` | Cloud Secret Manager (produksi) / `.env.local` (dev). **Tidak pernah** berprefix `NEXT_PUBLIC_`. |
| Publik | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `NEXT_PUBLIC_MAP_STYLE_URL`, `NEXT_PUBLIC_ADSENSE_CLIENT`, kontak iklan | Boleh di bundel klien. |
| Verifikasi ingest | `INGEST_AUDIENCE`, `INGEST_SA_EMAIL` | Boleh server; dipakai untuk memverifikasi token OIDC dari Cloud Scheduler. |

`apphosting.yaml` hanya memuat **nama** secret (`secret: nama`) — aman di-commit. Nilai yang di-set di Firebase Console menimpa `apphosting.yaml`.

## 6. Biaya (perkiraan per bulan)

| Pos | Sebelum iklan aktif | Setelah iklan aktif |
|---|---|---|
| Firebase App Hosting (Blaze) | $0 (kuota: bandwidth 10 GiB/bln; 10 rb kunjungan ≈ $0,01) | $0–1 |
| Cloud Scheduler | $0 (1 dari 3 job gratis) | $0 |
| Supabase | $0 (Free) | $0–25 |
| Open-Meteo | $0 (non-komersial) | **~€29** (wajib begitu komersial) |
| OpenAQ / Turnstile / tile OpenFreeMap | $0 | $0 |
| Domain | — | ~Rp150–250 ribu/tahun **[VERIFIKASI harga registrar]** |
| **Total** | **≈ Rp0** | **≈ Rp500–700 ribu/bln + domain** |

Catatan: lonjakan besar (mis. 1 juta kunjungan/bulan) menambah ≈ **$70** bandwidth Firebase (contoh resmi $69,58) + kemungkinan langganan tile. Pasang **budget alert + spend cap** di Firebase sejak hari pertama (fitur spend cap masih Public Preview per Sep 2026).

## 7. Risiko utama & mitigasi

| # | Risiko | Dampak | Mitigasi | Fase |
|---|---|---|---|---|
| 1 | Satelit S-NPP berhenti 2 Nov 2026 | Sumber titik panas hilang | Pakai NOAA-20/21; daftar SOURCE di konfigurasi (bukan hardcode); pantau `/mapserver/mapkey_status/` | 1 |
| 2 | Next.js 16 masih *preview* di App Hosting | Upgrade tidak aman | Pin 15.2.x; cek tabel dukungan sebelum upgrade | 1+ |
| 3 | OpenFreeMap tanpa SLA | Peta bisa mati | URL gaya peta via env; cadangan Thunderforest/CARTO (gratis, komersial) | 1 |
| 4 | Kuota FIRMS (5.000 transaksi/10 mnt; query besar = banyak transaksi) | Ingest gagal | Cache server, `DAY_RANGE` kecil, backoff, monitor kuota | 1 |
| 5 | Batas Open-Meteo (600/mnt; multi-koordinat mengalikan hitungan call) | Panel udara kosong | Hanya server yang memanggil; cache per jam; ≤ ~30 kota | 2 |
| 6 | Proyek Supabase Free di-pause (7 hari idle) | Aplikasi mati | Ingest 30 menit menulis tiap hari; health check + email peringatan | 1 |
| 7 | Biaya bandwidth saat lonjakan | Tagihan tak terduga | Cache-Control, muat per viewport, budget alert + spend cap, mode hemat data | 1 |
| 8 | MapLibre v6 butuh WebGL2 | Peta tidak tampil di perangkat lama | Deteksi WebGL2 + tampilan ringkas non-peta | 1 |
| 9 | Service worker di App Hosting belum terdokumentasi resmi | Offline gagal | Uji di domain kustom; jaga `/sw.js` tidak ter-cache CDN | 1/4 |
| 10 | Sensitive Events AdSense membatasi monetisasi saat bencana | Pendapatan turun tepat saat trafik puncak | Jangan bergantung pada iklan; utamakan sponsor langsung | 4 |
| 11 | Data contoh bocor ke produksi | Pelanggaran "jangan mengarang data" | Mode `demo` mati saat build produksi + label "DATA CONTOH" | 1 |
| 12 | Re-encode canvas tidak menjamin EXIF terhapus di semua browser | Lokasi pribadi bocor | Gerbang akhir hapus EXIF di server (`sharp`) | 3 |
| 13 | Spam laporan | Storage penuh + moderator kewalahan | Turnstile + rate limit + auto-hide 3 flag + kategori ketat | 3 |

## 8. Risiko hukum & kepatuhan (perlu tinjauan advokat sebelum rilis publik)

- **UU PDP No. 27/2022** — dasar pemrosesan & persetujuan; wajib memberi info tujuan/jenis/retensi/hak saat meminta persetujuan; pemenuhan hak subjek ≤ 3×24 jam; retensi & penghapusan; sanksi administratif s.d. 2% pendapatan tahunan.
- **Pendaftaran PSE (Kemkomdigi)** — melalui OSS (gratis, butuh NIB); belum daftar → risiko pemutusan akses; Komdigi aktif menindak.
- **Moderasi UGC** — wajib punya tata kelola konten + kanal pelaporan (syarat "safe harbor"); tindak lanjut permintaan resmi; jangan menuduh individu/perusahaan.
- **Pencemaran nama baik** — aturan komunitas melarang menyebut nama pihak; moderasi cepat; catat semua takedown.
- **Iklan** — label "Iklan/Sponsor"; tidak menyesatkan; Permendag 19/2026 (fungsi tutup/skip); Etika Pariwara Indonesia.
- **Disclaimer** — "bukan peringatan resmi"; titik panas ≠ kebakaran; arahkan ke 112/117/BMKG/BNPB.

Detail teks & checklist: `docs/02-ATRIBUSI-DAN-LEGAL.md`.

## 9. Perubahan penting terhadap spesifikasi awal (hasil riset)

1. **`VIIRS_SNPP_NRT` hampir mati** (produk S-NPP berhenti 2 Nov 2026) → tulang punggung: `VIIRS_NOAA20_NRT` + `VIIRS_NOAA21_NRT`.
2. **AdMob tidak bisa di web** — untuk PWA web gunakan **AdSense**; AdMob hanya lewat pembungkusan TWA + Play Store.
3. **Open-Meteo free tier non-komersial** — iklan/sponsor = komersial → langganan wajib saat monetisasi aktif.
4. **Next.js 16.x belum `active`** di App Hosting → kunci 15.2.x.
5. **Free tier MapTiler & Stadia melarang komersial** → jangan dipakai untuk aplikasi beriklan (OpenFreeMap/Thunderforest/CARTO aman).
6. **Titik panas NRT tidak real-time** (latensi ~1–3 jam; RT/URT hanya AS/Kanada) → kelola ekspektasi di UI.
7. **Anomali Magnetik Atlantik Selatan** memengaruhi piksel VIIRS malam low-confidence **di wilayah Indonesia** → filter low-confidence malam adalah keharusan.
8. **Endpoint country FIRMS tidak tersedia** → wilayah Indonesia wajib lewat bbox pada Area API.

## 10. Roadmap fase berikutnya (ringkas)

**Fase 1 — Peta + Titik Panas**
Scaffold Next.js 15.2 (TS strict, Tailwind, MapLibre 6.14, Serwist), `firebase init apphosting` (region Singapura) + budget alert, terapkan `0001_init.sql` di Supabase, klien FIRMS server + `POST /api/ingest` (verifikasi OIDC) + Cloud Scheduler 30 menit, upsert idempoten, `/api/hotspots` + Cache-Control, peta cluster (warna = kepercayaan, ukuran = FRP, popup lengkap + kalimat disclaimer), filter 24/48/7 hari + toggle kepercayaan rendah, kartu Ringkasan (jumlah 24 jam nasional + 5 provinsi), penanda kesegaran + banner kegagalan sumber, halaman Tentang Data, tombol "Lokasi saya", mode gelap.

**Fase 2 — Kualitas Udara**
Modul ISPU + tes unit batas kategori, provider Open-Meteo (model) & OpenAQ (stasiun), cache server, panel "udara di lokasiku", label model/stasiun + anjuran umum, `config/cities.ts` (~30 kota).

**Fase 3 — Laporan Warga & Moderasi**
Formulir 3 langkah, kompresi klien, hapus EXIF di server, Turnstile + rate limit, bucket privat + signed URL, antrean moderasi `/admin`, tampil di peta (lokasi dibulatkan), tombol "Laporkan konten" (auto-hide 3 flag), tautan titik panas terdekat (≤5 km, ±24 jam, netral), tes RLS/pgTAP.

**Fase 4 — Sinyal Sosial, PWA, Penyelesaian**
TrendProvider manual + panel, antrean offline IndexedDB, PWA (manifest, ikon, service worker), audit aksesibilitas (WCAG AA) + performa Slow 4G, halaman `/pasang-iklan` + aktivasi slot iklan (sesuai keputusan pengguna), README final, verifikasi kriteria selesai MVP.

## 11. Definisi "Fase 0 selesai"

- [x] Dokumen rencana, verifikasi, atribusi/legal, iklan
- [x] Draft skema SQL + daftar variabel lingkungan
- [x] Daftar risiko teknis & hukum + perkiraan biaya
- [ ] Jawaban 3 pertanyaan keputusan (menunggu pengguna) → dikunci sebelum Fase 1
