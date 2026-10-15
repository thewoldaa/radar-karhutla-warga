# Strategi Hosting — Radar Karhutla Warga

Keputusan pemilik (15 Okt 2026): **staging di GitHub Pages**, **produksi di Cloudflare Pages**.
Semua fakta di bawah diverifikasi langsung dari dokumentasi resmi pada 15 Oktober 2026.

---

## 1. Mengapa bukan GitHub Pages untuk produksi

Bunyi persis dari dokumentasi GitHub (kutipan verbatim, diverifikasi ulang secara adversarial):

> "GitHub Pages is **not intended for or allowed to be used as a free web-hosting service** to run your online business, e-commerce site, or any other website that is **primarily directed at either facilitating commercial transactions or providing commercial software as a service (SaaS)**. **Some monetization efforts are permitted** on Pages, such as **donation buttons and crowdfunding links**."
> — [GitHub Terms for Additional Products and Features](https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features)

**Yang juga berlaku dan penting** — GitHub Acceptable Use Policies §10 "Advertising on GitHub":

> "We **do not generally prohibit** use of GitHub for advertising. […] While we understand that you may want to promote your Content by posting **supporters' names or logos** in your Account, **the primary focus** of the Content posted in or through your Account to the Service **should not be advertising** or promotional marketing. **This includes Content posted in or through Pages** […]"
> — [GitHub Acceptable Use Policies §10](https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies#10-advertising-on-github)

**Pembacaan yang jujur:**

| Pertanyaan | Jawaban |
|---|---|
| Apakah GitHub melarang komersial secara umum? | **Tidak.** Klausa menyasar tiga sasaran spesifik: menjalankan bisnis online, e-commerce, atau situs yang *terutama* untuk transaksi komersial/SaaS. |
| Apakah donasi/urun dana boleh? | **Ya, eksplisit diizinkan.** |
| Apakah iklan dilarang? | **Tidak dilarang secara umum** (AUP §10). Iklan tidak boleh menjadi **fokus utama** konten. |
| Apakah AdSense di Pages diizinkan secara resmi? | **Tidak ada pernyataan resmi.** Kata "adsense" tidak muncul sama sekali di ToS, AUP, maupun Additional Terms. Ini zona yang belum ditafsirkan GitHub. |

**Catatan penting:** klausa lama yang sering dikutip ("solely as permitted and intended … and for no other purpose") **sudah tidak ada lagi** di ketentuan yang berlaku (dihapus sekitar Mei 2018). Sumber-sumber lama yang mengutipnya sudah kedaluwarsa — baik untuk membela maupun menyerang penggunaan iklan.

**Posisi proyek ini:** secara tekstual posisinya **cukup kuat** — ini aplikasi informasi publik, kontennya (titik panas, kualitas udara, laporan warga) jelas menjadi fokus utama, dan iklan hanya pendamping. Namun karena tidak ada penafsiran resmi, menaruh **produksi** di sana tetap berarti menaruh layanan darurat pada klausa yang bisa ditafsirkan sepihak. Risiko nyatanya: **kehilangan hosting tepat saat kabut asap** — momen ketika aplikasi paling dibutuhkan.

**Keputusan:** GitHub Pages dipakai untuk **staging/demo** (tanpa iklan, tanpa risiko layanan warga). Produksi di Cloudflare Pages. Jika kelak ingin memakai GitHub Pages untuk produksi, jalur resminya adalah **bertanya langsung ke GitHub Support** — dokumen ToS sendiri menyediakan jalur itu.

### Batas teknis GitHub Pages (terverifikasi)
Situs maksimum **1 GB**, bandwidth *soft* **100 GB/bulan**, *soft* **10 build/jam**, deploy
timeout 10 menit, HTTPS + domain kustom gratis, satu situs per repo.

---

## 2. Staging: GitHub Pages (aktif)

**URL:** `https://thewoldaa.github.io/radar-karhutla-warga/`
**Workflow:** `.github/workflows/staging-pages.yml` (push ke `main` atau manual)

Cara kerjanya:
1. Jalankan lint + typecheck + tes (gerbang mutu yang sama dengan CI).
2. Hapus `src/app/api` — route handler tidak bisa ada di static export.
3. Build statis (`STATIC_EXPORT=true`, `NEXT_PUBLIC_BASE_PATH=/radar-karhutla-warga`).
4. Publikasikan folder `out/` ke GitHub Pages.

Staging ini:
- berjalan pada **data contoh** yang ter-*bake* saat build;
- menampilkan banner **"STAGING — DATA CONTOH"** di puncak peta;
- **tidak** punya akses basis data, **tidak** punya endpoint ingest, **tidak** ada iklan.

Prasyarat sekali saja: **Settings → Pages → Source = "GitHub Actions"**.

---

## 3. Produksi: Cloudflare Pages

Alasan memilih (terverifikasi dari dokumentasi Cloudflare):
- **Tidak ada larangan komersial** pada tier gratis.
- **Bandwidth statis tak terbatas** (tidak ada batas 100 GB seperti GitHub Pages).
- **500 build/bulan** pada tier gratis; build timeout 20 menit.
- **Cloudflare Pages Functions** (berbasis Workers): **100.000 request/hari** gratis — cukup
  untuk verifikasi Turnstile dan pemrosesan foto pada Fase 3.

### Perombakan yang dibutuhkan (belum dikerjakan)

| Sekarang (server) | Di Cloudflare Pages |
|---|---|
| `GET /api/hotspots` | Klien membaca Supabase langsung (RLS sudah membatasi) **atau** Pages Function |
| `POST /api/ingest` (HMAC) | Tetap GitHub Actions, tapi menulis **langsung ke Supabase** (tanpa endpoint HTTP) |
| Verifikasi Turnstile (Fase 3) | Pages Function |
| Hapus EXIF foto (Fase 3) | Pages Function (WASM) **atau** Supabase Edge Function |

**Catatan penting:** pola "klien membaca Supabase langsung" hanya aman bila RLS benar.
Skrip `npm run verify:db` sudah menguji ini, dan wajib dijalankan ulang setelah perombakan.

### Alternatif yang sudah dievaluasi dan ditolak

| Opsi | Alasan ditolak |
|---|---|
| **Vercel Hobby** | Dokumentasi resmi menyebut iklan sebagai penggunaan komersial: *"Commercial usage Hobby teams are restricted to non-commercial personal use only"*, dan contohnya secara eksplisit menyebut *"The inclusion of advertisements, including but not limited to online advertising platforms like Google AdSense"*. |
| **Firebase App Hosting** | Berfungsi penuh dan sudah terpasang, tetapi **wajib akun penagihan Blaze** — pemilik ingin jalur tanpa kartu. Kode tetap kompatibel; ini pilihan cadangan bila Cloudflare menyulitkan. |
| **GitHub Pages (produksi)** | Zona abu-abu ToS di atas + batas 100 GB/bulan (berisiko saat lonjakan kabut asap). |

---

## 4. Ringkasan keputusan

| Lingkungan | Host | Data | Iklan | Status |
|---|---|---|---|---|
| Pengembangan lokal | `next dev` | Supabase lokal/remote + data contoh | Tidak | ✅ jalan |
| **Staging/demo** | **GitHub Pages** | Data contoh ter-bake | Tidak | ✅ workflow siap |
| **Produksi** | **Cloudflare Pages** (rencana) | Supabase (RLS) | Ya (AdSense + sponsor) | ⬜ Fase 4 |
| Cadangan | Firebase App Hosting | Supabase | Ya | Kode sudah kompatibel |

## 5. [VERIFIKASI] yang masih terbuka

- **Belum diuji:** apakah Cloudflare Pages Functions cukup untuk menghapus EXIF pada foto
  berukuran besar dalam batas CPU Workers (Fase 3 — perlu uji nyata).
- **Belum diuji:** perilaku service worker PWA di GitHub Pages `basePath` sub-folder
  (scope service worker bisa terbatas pada sub-path; perlu uji di browser sungguhan).
- **Belum diverifikasi:** apakah Supabase Edge Functions (Deno) punya pustaka pemroses
  gambar setara `sharp`; jika tidak, opsi adalah Cloudflare Functions + WASM.
- **Perlu dicek ulang sebelum rilis:** ketentuan ToS GitHub dan Cloudflare dapat berubah —
  tanggal verifikasi dokumen ini: **15 Oktober 2026**.
