# Kontribusi ke Radar Karhutla Warga

Terima kasih telah membantu. Proyek ini menyajikan data kebencanaan kepada warga,
jadi ada beberapa aturan yang **tidak bisa dinegosiasikan**.

## Aturan wajib

1. **Jangan mengarang data.** Data contoh hanya untuk pengembangan, wajib berlabel
   "DATA CONTOH", dan harus nonaktif di produksi (`NEXT_PUBLIC_DEMO_MODE`).
2. **Titik panas bukan kebakaran.** Jangan pernah menulis "kebakaran terkonfirmasi"
   atau mengubah teks UI menjadi lebih tegas dari bukti satelit.
3. **Jangan menuduh.** Jangan menambahkan fitur/teks yang menyebut perusahaan,
   lembaga, atau individu sebagai penyebab kebakaran.
4. **Jangan taruh secret di kode.** Tidak ada API key di klien, repo, atau riwayat
   git. Gunakan `.env.example` untuk mendokumentasikan variabel.
5. **Jangan scraping sumber yang melarangnya.** Sumber data baru hanya lewat API
   resmi/berizin, dan wajib mencantumkan atribusi.
6. **Minimalkan data pribadi** (UU PDP No. 27/2022): lokasi publik dibulatkan ~1 km,
   tidak ada nama/telepon pelapor, hash alih-alih identitas mentah.
7. **Anjuran kesehatan bersifat umum** dengan disclaimer, dan selalu arahkan ke
   otoritas resmi (112, 117, BMKG, BNPB/BPBD).

## Sebelum mengirim pull request

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run build
```

Semua harus lulus — CI akan memeriksa hal yang sama.

## Gaya kode

- TypeScript strict. Identifier dan komentar kode dalam **Bahasa Inggris**.
- Seluruh teks antarmuka dalam **Bahasa Indonesia yang sederhana**.
- Validasi input di server dengan **Zod**.
- Jika menyentuh integrasi sumber data luar, tambahkan komentar `VERIFY:` bila ada
  asumsi yang belum terverifikasi, dan catat di `docs/01-VERIFIKASI.md`.
- Pilih solusi paling sederhana yang memenuhi kebutuhan; jangan menambah fitur di
  luar cakupan tanpa diskusi di issue terlebih dahulu.

## Melaporkan masalah keamanan

Jangan buka issue publik. Ikuti `SECURITY.md`.

## Lisensi kontribusi

Dengan berkontribusi, Anda menyetujui kontribusi Anda dilisensikan di bawah
**AGPL-3.0-or-later**, sama seperti proyek ini.
