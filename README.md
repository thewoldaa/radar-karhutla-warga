# Radar Karhutla Warga

PWA berbahasa Indonesia yang menyatukan **titik panas satelit**, **kualitas udara**, **laporan foto warga**, dan **sinyal sosial** dalam satu peta — untuk kesadaran situasional warga saat musim karhutla.

[![CI](https://github.com/thewoldaa/radar-karhutla-warga/actions/workflows/ci.yml/badge.svg)](https://github.com/thewoldaa/radar-karhutla-warga/actions/workflows/ci.yml)

> **Penting:** aplikasi ini **bukan** pengganti peringatan resmi (BMKG, BNPB, kementerian/BPBD).
> Titik panas adalah anomali panas yang terdeteksi satelit, **bukan bukti kebakaran**.
> Dalam keadaan darurat hubungi **112** (darurat nasional) atau **117** (Pusdalops BNPB).

## Lisensi & kontribusi

Kode ini terbuka di bawah **[AGPL-3.0-or-later](LICENSE)**. Artinya Anda bebas memakai,
memodifikasi, dan menjalankannya — tetapi jika Anda menyediakan versi modifikasi sebagai
layanan daring, Anda **wajib** membuka kodenya juga. Ini menjaga agar perbaikan kembali ke
komunitas dan mencegah pengambilan versi tertutup.

- Ingin berkontribusi? Baca [`CONTRIBUTING.md`](CONTRIBUTING.md) — ada aturan wajib
  (jangan mengarang data, titik panas bukan kebakaran, jangan menuduh pihak mana pun).
- Menemukan celah keamanan? Ikuti [`SECURITY.md`](SECURITY.md) — jangan buka issue publik.
- **Data warga tidak ada di repositori ini.** Laporan dan foto tersimpan di basis data
  terpisah (Supabase); repo hanya berisi kode.
- Nama "Radar Karhutla Warga" dipakai untuk **versi resmi proyek ini**. Bila Anda membuat
  versi modifikasi, harap ganti namanya agar warga tidak tertukar — terutama saat darurat.

## Status

| Fase | Isi | Status |
|---|---|---|
| 0 | Rencana (tanpa kode) | ✅ selesai — lihat `docs/` |
| 1 | Peta + Titik Panas (FIRMS) | ✅ selesai (kode + tes; menunggu kredensial untuk uji end-to-end) |
| 2 | Kualitas Udara (ISPU) | ⬜ belum |
| 3 | Laporan Warga & Moderasi | ⬜ belum |
| 4 | Sinyal Sosial, PWA, Penyelesaian | ⬜ belum |

## Menjalankan (Fase 1)

```bash
npm install
cp .env.example .env.local   # lalu isi nilainya (minimal Supabase + FIRMS)
npm run dev                  # http://localhost:3000
```

Perintah lain:

| Perintah | Fungsi |
|---|---|
| `npm run typecheck` | TypeScript strict, tanpa keluaran build |
| `npm run lint` | ESLint (next/core-web-vitals + next/typescript) |
| `npm test` | Tes unit Vitest (parser CSV FIRMS, klasifikasi kepercayaan) |
| `npm run build` | Build produksi |
| `npm run verify:db` | Memeriksa skema Supabase + membuktikan RLS memblokir `anon` |

Tanpa Supabase, aplikasi tetap berjalan dan menampilkan banner "Basis data belum dikonfigurasi".
Untuk melihat peta berisi contoh titik: set `NEXT_PUBLIC_DEMO_MODE=true` (hanya pengembangan —
otomatis nonaktif saat `NODE_ENV=production`) lalu jalankan `npm run dev`. Semua data contoh
berlabel **DATA CONTOH**.

### Menyiapkan basis data (sekali)

1. Buat proyek Supabase (region Singapura disarankan).
2. Dashboard → Database → Extensions: aktifkan **postgis** (schema `extensions`) dan **pg_cron**.
3. Jalankan isi `supabase/migrations/0001_init.sql` di SQL Editor.
4. Isi `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
   `SUPABASE_SECRET_KEY`) lalu jalankan `npm run verify:db` — semua pemeriksaan harus lulus.
5. (Opsional, untuk kartu "5 provinsi teratas") impor batas provinsi:
   unduh `gjDownloadURL` dari <https://www.geoboundaries.org/api/current/gbOpen/IDN/ADM1/>
   lalu `node scripts/import-regions.mjs <berkas.geojson>`.
   Lisensi **ODbL 1.0** — sertakan atribusi geoBoundaries/OpenStreetMap di Tentang Data.

### Menjadwalkan ingest

Dua jalur didukung; pilih salah satu (atau keduanya).

**(A) GitHub Actions cron — dipakai proyek ini.** Workflow `.github/workflows/ingest.yml`
berjalan tiap 30 menit. Tambahkan **repository secrets** (Settings → Secrets → Actions):

| Secret | Isi |
|---|---|
| `INGEST_URL` | URL penuh, mis. `https://<domain>/api/ingest` |
| `INGEST_HMAC_SECRET` | string acak ≥32 byte — **sama** dengan nilai di server |
| `STATUS_URL` | (opsional) URL publik `/api/hotspots` untuk cek kesegaran data |

Untuk mencoba dari komputer sendiri: `INGEST_HMAC_SECRET=... node scripts/sign-ingest.mjs <url>`
lalu salin perintah `curl` yang dicetak. (Secret dibaca dari environment, **bukan** argumen
command line — agar tidak bocor ke daftar proses dan riwayat shell.)

> **Catatan trade-off:** cron GitHub Actions bisa tertunda saat beban tinggi, dan jadwalnya
> **dinonaktifkan otomatis setelah 60 hari tanpa aktivitas repo**. Workflow ini sudah
> menangani keduanya: ada langkah yang mengaktifkan ulang jadwal bila dinonaktifkan, dan
> ingest hanya dijalankan bila data terdeteksi basi. Untuk ketahanan maksimum, tambahkan
> juga jalur (B).

**(B) Cloud Scheduler (opsional, GCP).** Buat job tiap 30 menit → `POST /api/ingest`
dengan OIDC service account; isi `INGEST_AUDIENCE` + `INGEST_SA_EMAIL` di environment.

Kedua jalur bersifat *fail-closed*: tanpa kredensial yang cocok, endpoint menolak semua
permintaan (terbukti 401 untuk tanda tangan salah, timestamp kedaluwarsa, dan body yang
diubah setelah ditandatangani).

## Arsitektur ringkas

- **Aplikasi:** Next.js (App Router) + TypeScript strict + Tailwind + MapLibre GL JS → deploy **Firebase App Hosting** (region `asia-southeast1`, wajib paket Blaze).
- **Data & backend:** **Supabase** (Postgres + PostGIS, Storage, Auth). Semua panggilan ke sumber data luar (FIRMS / Open-Meteo / OpenAQ) dilakukan **di server**; klien hanya memanggil API internal `/api/*`.
- **Penjadwalan ingest:** Cloud Scheduler (tiap 30 menit) → `POST /api/ingest` (verifikasi OIDC).
- **Monetisasi:** slot sponsor langsung + slot iklan jaringan (AdSense untuk web; AdMob memerlukan pembungkusan TWA — lihat `docs/03-IKLAN.md`).

## Dokumen

- `docs/00-RENCANA.md` — keputusan arsitektur, struktur repo, alur data, biaya, risiko
- `docs/01-VERIFIKASI.md` — daftar butir **[VERIFIKASI]** (apa yang sudah/belum terverifikasi dari dokumentasi resmi, per 15 Okt 2026)
- `docs/02-ATRIBUSI-DAN-LEGAL.md` — teks atribusi, disclaimer, kepatuhan (UU PDP, PSE, moderasi)
- `docs/03-IKLAN.md` — rencana monetisasi & slot iklan
- `supabase/migrations/0001_init.sql` — skema database
- `.env.example` — daftar variabel lingkungan (tanpa nilai rahasia)

## Yang perlu disiapkan sebelum Fase 1 selesai (uji end-to-end)

1. **Akun Firebase + akun penagihan (paket Blaze)** — App Hosting wajib Blaze.
2. **Proyek Supabase** (region terdekat, mis. Singapura) — paket Free cukup untuk mulai.
3. **NASA FIRMS MAP_KEY** (gratis): <https://firms.modaps.eosdis.nasa.gov/api/map_key/>
4. **OpenAQ API key** (gratis, untuk Fase 2): <https://explore.openaq.org/register>
5. **Cloudflare Turnstile** (gratis, untuk Fase 3) — sitekey + secret key.
6. **Akun GitHub** — jalur deploy yang disarankan (alternatif: deploy via CLI lokal).

## Prinsip proyek

- Tidak ada API key/secret di kode klien, repo, atau riwayat git.
- Tidak mengarang data. Data contoh hanya untuk pengembangan, berlabel **"DATA CONTOH"**, dan nonaktif di produksi.
- Selalu tampilkan waktu pengamatan, sumber, dan tingkat kepercayaan.
- Tidak menuduh perusahaan, lembaga, atau individu sebagai penyebab kebakaran.
- Minimalkan data pribadi (selaras UU PDP No. 27/2022); lokasi publik dibulatkan ~1 km; pelaporan tanpa akun.
- Anjuran kesehatan bersifat umum, dengan disclaimer, dan mengarah ke otoritas resmi.

## Atribusi

Teks lengkap di `docs/02-ATRIBUSI-DAN-LEGAL.md`. Ringkas: NASA FIRMS/LANCE/ESDIS (titik panas), Open-Meteo + CAMS ENSEMBLE (udara model), OpenAQ dan sumber aslinya (udara stasiun), penyedia tile peta (OpenFreeMap/OSM), MapLibre GL JS, dan Permen LHK P.14/2020 (kategori ISPU).
