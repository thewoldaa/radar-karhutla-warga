# Kebijakan Keamanan

## Melaporkan kerentanan

**Jangan membuka issue publik untuk masalah keamanan.**

Gunakan [GitHub Security Advisories](../../security/advisories/new) pada repositori ini
(tab **Security** → **Report a vulnerability**). Sertakan:

- deskripsi masalah dan dampaknya,
- langkah reproduksi,
- versi/commit yang terpengaruh.

Kami berupaya menanggapi dalam **7 hari kerja**. Setelah diperbaiki, kami akan
mencantumkan penghargaan atas nama Anda (kecuali Anda memilih anonim).

## Cakupan

Yang paling penting untuk proyek ini:

- kebocoran secret (kunci API, kunci basis data) ke bundel klien atau repositori;
- celah yang memungkinkan publik membaca data sensitif: `geom_exact`, `device_hash`,
  `ip_hash`, atau laporan berstatus `pending`;
- cara memanggil `POST /api/ingest` tanpa tanda tangan yang sah (pembakaran kuota);
- bypass rate limit atau CAPTCHA pada pelaporan warga (Fase 3);
- XSS lewat catatan/foto laporan.

## Praktik yang sudah diterapkan

- Semua panggilan ke sumber data luar (FIRMS/OpenAQ/Open-Meteo) dilakukan di server.
- Endpoint ingest bersifat *fail-closed*: tanpa `INGEST_HMAC_SECRET` (atau OIDC),
  semua permintaan ditolak.
- Tanda tangan HMAC disertai batas waktu 5 menit untuk mencegah replay.
- RLS di basis data: `anon` hanya bisa membaca data publik; laporan hanya lewat
  view `reports_public` (tanpa kolom sensitif).
- Foto laporan: bucket privat, validasi tipe di server, EXIF dihapus, tautan sementara.

## Yang belum (jangan dilaporkan sebagai kerentanan baru)

- Belum ada header CSP penuh (dijadwalkan Fase 4).
- Belum ada autentikasi moderator (dijadwalkan Fase 3).
- Rate limit & CAPTCHA pelaporan (dijadwalkan Fase 3).
