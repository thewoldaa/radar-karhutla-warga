# Rencana Monetisasi & Slot Iklan — Radar Karhutla Warga

Diverifikasi dari dokumentasi resmi Google (AdSense) & penyedia lain pada **15 Oktober 2026**.
Ringkasan: **3 slot sponsor langsung** (pembuka) + **1 slot jaringan iklan (AdSense)** — sesuai permintaan pemilik.

> **Keputusan pemilik (15 Okt 2026): AdMob dibatalkan.** Tidak ada pembungkusan TWA/Play Store.
> Monetisasi hanya lewat web: slot sponsor langsung + AdSense. Bagian AdMob di bawah
> disimpan sebagai catatan historis/rujukan saja.

---

## 1. Rancangan slot iklan

### 1.1 Slot sponsor langsung (diisi manual — hubungi pemilik)

| Slot | Posisi | Ukuran | Catatan |
|---|---|---|---|
| `sponsor-top` | Di bawah header, di atas konten halaman **non-peta** (mis. Tentang Data, Pasang Iklan, artikel) | 970×90 (desktop) / 320×100 (mobile) | Jangan di layar peta |
| `sponsor-bottom` | Footer / akhir artikel | 728×90 / 320×50 | — |
| `sponsor-side` | Sidebar (hanya layar ≥ 1024 px) | 300×600 atau 300×250 | Bisa diganti slot jaringan bila kosong |

Setiap slot:
- berlabel **"Sponsor"** (badge kecil, kontras WCAG AA);
- berisi placeholder "Slot sponsor tersedia" + tombol **"Hubungi kami"** → `/pasang-iklan`;
- reservasi ruang via CSS `min-height` (anti-CLS);
- tidak pernah muncul di: layar peta utama, kartu peringatan darurat, formulir laporan.

### 1.2 Slot jaringan iklan (pasif)

| Slot | Posisi | Ukuran | Status |
|---|---|---|---|
| `network-ad` | Di bawah panel Ringkasan pada halaman **non-peta** | Responsif (320×100 mobile, 728×90 desktop) | ⏳ nonaktif sampai AdSense disetujui |

Implementasi teknis (Fase 4): komponen `<AdSlot slot="…" />` dengan `config/ads.ts`:

```ts
// src/config/ads.ts (rencana)
export const ADS = {
  sponsorTop:    { enabled: true,  minHeight: 100 },
  sponsorBottom: { enabled: true,  minHeight: 90  },
  sponsorSide:   { enabled: true,  minHeight: 250 },
  networkAd:     { enabled: false, minHeight: 100 }, // aktif setelah approval AdSense
} as const;
```

Jika slot sponsor terjual → ganti placeholder dengan materi sponsor (gambar + tautan) dan tetap berlabel "Sponsor".

---

## 2. Halaman `/pasang-iklan` (media kit)

Isi halaman (Bahasa Indonesia sederhana):
1. **Tentang audiens** — warga, relawan, jurnalis di wilayah rawan karhutla; lonjakan trafik saat kabut asap (jujur soal pola trafik musiman).
2. **Daftar slot + ukuran + posisi** (tabel dari bagian 1).
3. **Harga per bulan** (maksimum 3 paket; boleh "hubungi untuk penawaran" bila belum ditetapkan).
4. **Ketentuan konten sponsor**: tidak menyesatkan, tidak mengeksploitasi bencana, tidak boleh terkait rokok/alkohol/judi/senjata (mengikuti kebijakan AdSense agar tidak menurunkan status akun), wajib berlabel.
5. **Kontak** — formulir email atau WhatsApp (nomor disimpan di `config/site.ts`, **bukan** hardcode di komponen; tampil hanya jika diaktifkan).

> Catatan kepatuhan: label "Advertisements"/"Sponsored Links" hanya boleh untuk iklan Google. Untuk sponsor lokal, gunakan kata **"Sponsor"** / "Iklan" biasa — jangan meniru label Google.

---

## 3. AdMob — DIBATALKAN (catatan historis)

**Keputusan pemilik 15 Okt 2026: tidak memakai AdMob.** Tidak ada pembungkusan TWA maupun publikasi ke Google Play. Bagian ini hanya catatan bila suatu saat keputusan berubah.

**Fakta terverifikasi (15 Okt 2026):**
- AdMob inventory = **App** (bukan web); SDK hanya untuk Android/iOS/Unity/dll.
- AdMob mensyaratkan app **terdaftar di toko** yang didukung + lolos *app readiness review*.
- PWA murni (tanpa listing toko) **tidak memenuhi syarat AdMob**.

**Jalur bila suatu saat diaktifkan kembali:** bungkus PWA sebagai TWA → publikasikan di Play Store → integrasikan Google Mobile Ads SDK. Catatan: consent (TCF) tidak disebarkan otomatis dari app ke WebView.

**Status saat ini:** MVP dan seterusnya memakai **AdSense** untuk slot jaringan; AdMob keluar dari cakupan.

---

## 4. AdSense — syarat & langkah

1. **Prasyarat konten**: situs live dengan konten orisinal & bermanfaat (halaman Tentang Data, metodologi, pedoman komunitas, arsip laporan yang disetujui). Jangan mendaftar saat situs masih kosong.
2. **Pendaftaran**: usia 18+, akses HTML source. Review biasanya beberapa hari, bisa 2–4 minggu.
3. **Verifikasi identitas** (mulai Jun 2026, ambang $0): selesaikan sebelum iklan tampil/pembayaran.
4. **ads.txt** di root domain: `google.com, pub-XXXXXXXX, DIRECT, f08c47fec0942fa0` (ganti pub-ID).
5. **Kebijakan privasi** wajib mengungkap cookie/teknologi iklan pihak ketiga + tautan ke kebijakan Google.
6. **Penempatan**: jangan di dekat tombol/navigasi; jangan menyerupai konten; jumlah iklan ≤ konten; **bebas iklan di layar peta/peringatan darurat**.
7. **Pembayaran Indonesia**: Check/EFT/Wire; ambang payout **Rp1.300.000**; verifikasi PIN dikirim pos (~3 minggu).
8. **Risiko pendapatan**: kebijakan **Sensitive Events** — saat bencana besar, Google dapat membatasi monetisasi konten terkait. Karena trafik puncak aplikasi ini justru saat bencana, **jangan bergantung pada iklan**; jadikan sponsor langsung sebagai pendapatan utama.

**Consent (cookie):** Google hanya mewajibkan CMP tersertifikasi untuk pengguna **EEA/UK/Swiss**. Untuk audiens Indonesia, kewajiban consent berasal dari **UU PDP** — praktik baik: banner persetujuan granular sebelum memuat skrip iklan + halaman "Kelola cookie".

---

## 5. Alternatif jaringan (cadangan, non-Google)

Boleh dipertimbangkan **hanya** jika AdSense tidak disetujui. Risiko: kualitas iklan popunder/interstitial merusak kepercayaan & melanggar Better Ads Standards; jangan pernah di layar peta/peringatan.

- **Media.net** — jaringan kontekstual; syarat penerbit perlu diverifikasi ulang. **[VERIFIKASI]**
- **Adsterra / Monetag** — ambang pembayaran rendah ($5), tetapi format popunder agresif. **[VERIFIKASI]** — rekomendasi: hindari, atau batasi ke halaman artikel.

---

## 6. Aturan tampilan (checklist implementasi Fase 4)

- [ ] `config/ads.ts` mengontrol semua slot (mudah dimatikan; mode "tanpa iklan" untuk pengujian & layar darurat).
- [ ] Reservasi ruang via `min-height`/`aspect-ratio` — target CLS < 0,1.
- [ ] Lazy-load slot di bawah fold; jangan refresh < 30 detik.
- [ ] Label "Sponsor"/"Iklan" selalu terlihat (bukan tooltip).
- [ ] Slot kosong tetap menyimpan ruang (jangan collapse → CLS).
- [ ] Layar `/peta`, kartu darurat, formulir `/lapor` — **tanpa** iklan (uji otomatis: komponen AdSlot tidak dirender di rute tersebut).
- [ ] Halaman `/pasang-iklan` + kontak pemilik aktif.
- [ ] `ads.txt` tersedia di root domain (verifikasi: `https://<domain>/ads.txt`).
