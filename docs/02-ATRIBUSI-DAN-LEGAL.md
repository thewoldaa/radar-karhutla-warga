# Atribusi, Disclaimer & Kepatuhan — Radar Karhutla Warga

Dokumen ini merangkum **teks atribusi wajib**, **disclaimer**, dan **kewajiban kepatuhan** yang harus muncul di aplikasi (halaman "Tentang Data", footer, dan di dekat data terkait). Semua butir diverifikasi dari sumber resmi pada 15 Oktober 2026.

> ⚠️ **Bukan nasihat hukum.** Butir bertanda **[ADVOKAT]** harus ditinjau penasihat hukum sebelum rilis publik.

---

## 1. Teks atribusi (siap salin)

### 1.1 NASA FIRMS — titik panas (wajib, diminta resmi)

> Kami mengakui penggunaan data dan/atau citra dari NASA's Fire Information for Resource Management System (FIRMS), bagian dari NASA's Land, Atmosphere Near real-time Capability for Earth observations (LANCE) dan NASA's Earth Science Data and Information System (ESDIS).

Versi Inggris (sesuai permintaan resmi, boleh ditampilkan berdampingan):

> We acknowledge the use of data and/or imagery from NASA's Fire Information for Resource Management System (FIRMS) (<https://earthdata.nasa.gov/firms>), part of NASA's Land, Atmosphere Near real-time Capability for Earth observations (LANCE) (<https://earthdata.nasa.gov/lance>) and NASA's Earth Science Data and Information System (ESDIS).

Ketentuan tambahan:
- Data NASA umumnya **CC0** (boleh dipakai komersial), tetapi **tidak boleh** menampilkan logo/branding NASA seolah-olah NASA mendukung aplikasi ini (larangan endorsement).
- Data disediakan **"as is"** — tanggung jawab penggunaan ada pada pengguna aplikasi.

### 1.2 Open-Meteo — udara (model)

- **Wajib**, ditempatkan **di dekat** lokasi data ditampilkan (bukan hanya di footer):
  > <a href="https://open-meteo.com/">Weather data by Open-Meteo.com</a>
- **Wajib tambahan untuk data kualitas udara**: kredit penyedia **CAMS ENSEMBLE** (Copernicus Atmosphere Monitoring Service) — docs Open-Meteo: "must provide a clear attribution to CAMS ENSEMBLE data provider as well as a reference to Open-Meteo".
- Lisensi data CC BY 4.0.

### 1.3 OpenAQ — udara (stasiun)

- Sebut **OpenAQ** sebagai titik akses data, **plus** sumber asli setiap stasiun (ambil dari `licenses[]` per lokasi; sebagian berlisensi CC BY 4.0 dengan `attributionRequired = true`).
- Sebelum monetisasi: audit `commercialUseAllowed` per lokasi; jangan tampilkan lokasi yang lisensinya melarang penggunaan komersial.

### 1.4 Peta & tile

| Penyedia | Teks atribusi |
|---|---|
| OpenFreeMap (default) | `© OpenFreeMap © OpenMapTiles Data from OpenStreetMap` |
| OpenStreetMap (di mana pun) | `© OpenStreetMap contributors` (tautan aktif; **tidak boleh** disembunyikan di balik toggle) |
| Thunderforest (cadangan) | `Thunderforest` + `© OpenStreetMap contributors` |
| CARTO (cadangan) | `© OpenStreetMap contributors, © CARTO` |

### 1.5 Perangkat lunak & regulasi

- **MapLibre GL JS** (BSD-3-Clause) — sebutkan di halaman Tentang Data.
- **ISPU**: sitasi resmi — *Permen LHK Nomor P.14/MENLHK/SETJEN/KUM.1/7/2020 tentang Indeks Standar Pencemar Udara, Berita Negara RI Tahun 2020 Nomor 774* (tautan JDIH BPK: <https://peraturan.bpk.go.id/Details/163466>).

---

## 2. Disclaimer (wajib tampil di layar utama & Tentang Data)

Teks usulan (Bahasa Indonesia sederhana):

> **Aplikasi ini bukan peringatan resmi.** Informasi di sini bersifat umum dan bisa terlambat/tidak lengkap.
> **Titik panas adalah anomali panas yang terdeteksi satelit, belum tentu kebakaran.**
> Satelit tidak mengamati terus-menerus dan awan/asap dapat menghalangi deteksi — **tidak adanya titik panas bukan berarti tidak ada api.**
> Untuk informasi resmi, ikuti **BMKG, BNPB/BPBD**, dan pemerintah daerah.
> **Darurat: 112** (nasional) · **117** (Pusdalops BNPB) · **119** (ambulans) · **113** (pemadam kebakaran — nomor dapat berbeda per daerah).

Aturan di UI:
- Disclaimer singkat tampil di kartu ringkasan & popup titik panas.
- Jangan pernah menulis "kebakaran terkonfirmasi"; gunakan "titik panas" / "anomali panas".
- Setiap titik panas menampilkan: **waktu pengamatan (zona lokal + UTC), satelit, tingkat kepercayaan, FRP**.
- Panel sinyal sosial berlabel: *"Sedang ramai dibicarakan (belum diverifikasi)"*.
- Tautan laporan warga ke titik panas: *"Ada titik panas satelit di sekitar"* — **bukan** "terverifikasi".

---

## 3. Kepatuhan UU PDP No. 27/2022 (ringkas)

| Kewajiban | Penerapan di aplikasi |
|---|---|
| Dasar pemrosesan (Pasal 20) | Laporan: **persetujuan** (centang saat mengirim) + **kepentingan sah** untuk keamanan (hash anti-spam). |
| Info saat meminta persetujuan (Pasal 21) | Formulir memuat: tujuan, jenis data (foto, perkiraan lokasi, catatan), masa retensi, hak pengguna. |
| Bukti persetujuan (Pasal 24) | Simpan catatan persetujuan (timestamp + versi teks) di database. |
| Minimisasi | Tanpa akun; tanpa nama/telepon; lokasi publik dibulatkan ~1 km; EXIF dihapus di server; tidak menyimpan device ID mentah. |
| Hak subjek ≤3×24 jam (Pasal 30/32/40/41) | Kanal email di halaman Privasi + SOP internal; hapus atas permintaan. |
| Retensi & penghapusan (Pasal 42–44) | Job otomatis (pg_cron): laporan 12 bulan, hotspot 30 hari, rate limit 7 hari. **[ADVOKAT: tetapkan & dokumentasikan retensi resmi.]** |
| Notifikasi kegagalan pelindungan (Pasal 46) | Prosedur insiden (3×24 jam) — tulis di dokumen internal. |
| Sanksi | Administratif s.d. **2% pendapatan tahunan**; pidana s.d. Rp6 miliar (Pasal 57, 67–68). |

**Banner cookie/iklan:** karena UU PDP tidak mengatur format khusus, gunakan praktik baik: banner persetujuan **granular** sebelum skrip iklan/analitik pihak ketiga dimuat; simpan pilihan; sediakan "Kelola cookie". **[ADVOKAT]**

---

## 4. PSE (Kemkomdigi) — prasyarat rilis publik

- Dasar: PM Kominfo No. 5/2020 — PSE lingkup privat wajib **mendaftar sebelum** sistem dipakai; salah satu kriteria (layanan penyediaan Informasi Elektronik/UGC) memicunya.
- Prosedur: NIB + KBLI → OSS (PB-UMKU) → TDPSE. **Gratis.**
- Sanksi tidak daftar: pemutusan akses (blokir); Komdigi aktif menindak (Mei 2025: 36 entitas diperingatkan).
- **Status proyek ini: belum terdaftar.** Klasifikasi kewajiban (badan hukum vs perorangan) **[ADVOKAT]**.
- PSE UGC wajib: tata kelola konten + kanal pelaporan → tombol "Laporkan konten" + halaman Pedoman Komunitas + log takedown.

## 5. Moderasi & pencegahan penyalahgunaan (kebijakan internal)

1. **Semua laporan baru berstatus `pending`** — tampil publik hanya setelah disetujui moderator.
2. Kategori laporan: `asap`, `api`, `banjir`, `lainnya`. Catatan maks 280 karakter.
3. **Dilarang menyebut nama** perusahaan/lembaga/individu dalam catatan (disebut di Pedoman Komunitas; moderator menolak laporan yang melanggar).
4. **3 flag → auto-hide** sampai ditinjau moderator.
5. Rate limit **5 laporan/jam** per perangkat+IP (disimpan sebagai hash) + **Turnstile**.
6. Foto: JPEG/PNG/WebP saja; validasi magic bytes + ukuran di server; **EXIF dihapus**; bucket privat; tampil via signed URL pendek hanya bila `approved`.
7. Moderator: akun Supabase (magic link / password) → halaman `/admin`; lihat foto & **lokasi presisi**; aksi: setujui/tolak/sembunyikan; semua aksi dicatat (`moderated_by`, `moderated_at`).
8. Konten ilegal/sensitif (mis. tidak pantas, anak, ekstremisme): prosedur khusus + eskalasi ke otoritas. **[ADVOKAT]**

## 6. Iklan & sponsor (ringkas — detail di `03-IKLAN.md`)

- Label jelas **"Iklan"** / **"Sponsor"** pada setiap slot; tidak menyerupai konten/navigasi.
- **Layar peta, kartu peringatan darurat, dan formulir laporan bebas iklan** (kebijakan Google: iklan tidak boleh di layar "alerts/navigation"; hindari salah klik dekat tombol).
- Tidak menyesatkan; tidak mengeksploitasi bencana (kebijakan Sensitive Events); tidak memakai kata kunci bencana untuk mendorong trafik.
- Permendag No. 19/2026 (berlaku 8 Jun 2026): iklan elektronik dilarang menyesatkan; wajib fungsi tutup/skip. **[VERIFIKASI teks pasal saat finalisasi]**
- Etika Pariwara Indonesia: jujur, benar, bertanggung jawab; klaim superlatif wajib bukti.

## 7. Checklist sebelum rilis publik

- [ ] Halaman: Tentang Data (sumber + atribusi + batasan), Kebijakan Privasi, Pedoman Komunitas, Kontak.
- [ ] Disclaimer "bukan peringatan resmi" di layar utama.
- [ ] Nomor darurat terverifikasi per wilayah tampilan.
- [ ] PSE terdaftar (atau penilaian hukum tertulis bahwa tidak wajib).
- [ ] Retensi & job purge berjalan + diuji.
- [ ] Kanal permintaan hak subjek (email) aktif + SOP ≤3×24 jam.
- [ ] RLS diuji (pgTAP): anon tidak bisa membaca `geom_exact`/`device_hash`/laporan non-approved.
- [ ] Atribusi FIRMS/Open-Meteo(+CAMS)/OpenAQ/OSM tampil dan tertaut.
- [ ] ads.txt siap di root domain.
- [ ] Review hukum: moderasi UGC, risiko pencemaran nama baik, pajak sponsor. **[ADVOKAT]**
