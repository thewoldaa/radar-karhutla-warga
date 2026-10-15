import type { Metadata } from "next";
import Link from "next/link";

import { EMERGENCY, OFFICIAL_LINKS, SITE, STATIC_MODE } from "@/config/site";
import { MODIS_CONFIDENCE_THRESHOLDS } from "@/lib/sources/firms/confidence";

export const metadata: Metadata = {
  title: "Tentang Data",
  description:
    "Sumber data, atribusi, keterbatasan, cara moderasi, dan kebijakan privasi Radar Karhutla Warga.",
};

export default function AboutDataPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      {STATIC_MODE ? (
        <p
          role="status"
          className="mb-4 rounded-xl border border-purple-300 bg-purple-100 px-4 py-3 text-sm font-semibold text-purple-900"
        >
          STAGING — DATA CONTOH. Halaman ini adalah versi uji tanpa data satelit sebenarnya
          dan tanpa koneksi basis data.
        </p>
      ) : null}

      <nav aria-label="Breadcrumb" className="mb-4">
        <Link href="/" className="text-sm underline">
          ← Kembali ke peta
        </Link>
      </nav>

      <h1 className="mb-2 text-2xl font-bold">Tentang Data</h1>
      <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
        {SITE.name} menyatukan data titik panas satelit, kualitas udara, dan laporan warga
        dalam satu peta. Halaman ini menjelaskan sumber data, keterbatasannya, dan bagaimana
        data warga dimoderasi.
      </p>

      <section className="mb-8 space-y-3">
        <h2 className="text-lg font-semibold">Sumber data & atribusi</h2>

        <div className="rounded-xl border border-[var(--border-subtle)] p-4">
          <h3 className="font-medium">Titik panas satelit — NASA FIRMS</h3>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
            Kami mengakui penggunaan data dan/atau citra dari NASA&apos;s Fire Information for
            Resource Management System (FIRMS), bagian dari NASA&apos;s Land, Atmosphere Near
            real-time Capability for Earth observations (LANCE) dan NASA&apos;s Earth Science
            Data and Information System (ESDIS).
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Data disediakan &quot;as is&quot;. Penggunaan data menjadi tanggung jawab pengguna.
            Data NASA tidak menyiratkan dukungan NASA terhadap aplikasi ini.
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border-subtle)] p-4">
          <h3 className="font-medium">Kualitas udara</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
            <li>
              <strong>Model:</strong> data dari Open-Meteo (berbasis model CAMS global, resolusi
              kasar ±45 km) — <em>bukan pengukuran stasiun</em>. Atribusi:{" "}
              <a
                className="underline"
                href="https://open-meteo.com/"
                target="_blank"
                rel="noreferrer"
              >
                Weather data by Open-Meteo.com
              </a>
              , serta kredit CAMS ENSEMBLE (Copernicus Atmosphere Monitoring Service).
            </li>
            <li>
              <strong>Stasiun:</strong> data pengukuran dari OpenAQ dan sumber aslinya. Setiap
              lokasi memiliki lisensinya sendiri dan dicantumkan saat ditampilkan.
            </li>
            <li>
              Kategori ISPU mengikuti Permen LHK No. P.14/MENLHK/SETJEN/KUM.1/7/2020. Nilai
              resmi ISPU dihitung dari rata-rata 24 jam; jika kami menampilkan nilai sesaat,
              nilai itu ditandai &quot;perkiraan&quot;.
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-[var(--border-subtle)] p-4">
          <h3 className="font-medium">Peta</h3>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
            Peta dibuat dengan MapLibre GL JS. Data peta &copy; OpenStreetMap contributors;
            tile disajikan oleh OpenFreeMap (&copy; OpenFreeMap &copy; OpenMapTiles).
          </p>
        </div>
      </section>

      <section className="mb-8 space-y-3">
        <h2 className="text-lg font-semibold">Keterbatasan yang perlu Anda tahu</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700 dark:text-slate-300">
          <li>
            <strong>Titik panas bukan kebakaran.</strong> Titik panas adalah anomali panas yang
            terdeteksi satelit. Bisa berasal dari api kecil, pembakaran lahan, kilang, gunung
            api, atau sumber panas lain. Kami tidak pernah menyebutnya &quot;kebakaran
            terkonfirmasi&quot;.
          </li>
          <li>
            <strong>Satelit tidak mengamati terus-menerus.</strong> Satelit melintas beberapa
            kali sehari. Data NRT biasanya tertunda sekitar 3 jam.
          </li>
          <li>
            <strong>Awan dan asap menghalangi deteksi.</strong> Tidak ada titik panas{" "}
            <em>tidak berarti</em> tidak ada api.
          </li>
          <li>
            <strong>Data udara beresolusi kasar.</strong> Nilai model mewakili area luas, bukan
            kondisi di jalan Anda.
          </li>
          <li>
            <strong>Kepercayaan rendah.</strong> Deteksi kepercayaan rendah (terutama malam
            hari di wilayah Indonesia) lebih sering keliru dan disembunyikan secara default.
            Untuk data MODIS, kami memakai ambang praktis berikut (bukan ambang resmi NASA):
            &lt; {MODIS_CONFIDENCE_THRESHOLDS.nominal} = rendah, ≥{" "}
            {MODIS_CONFIDENCE_THRESHOLDS.high} = tinggi.
          </li>
        </ul>
      </section>

      <section className="mb-8 space-y-3">
        <h2 className="text-lg font-semibold">Laporan warga & moderasi</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700 dark:text-slate-300">
          <li>Setiap laporan diperiksa moderator sebelum tampil. Laporan baru berstatus &quot;menunggu&quot;.</li>
          <li>Lokasi laporan yang tampil publik dibulatkan sekitar 1 km untuk melindungi privasi pelapor.</li>
          <li>Catatan maksimal 280 karakter. Dilarang menyebut nama orang, perusahaan, atau lembaga sebagai penyebab.</li>
          <li>Tiga laporan pengguna (flag) otomatis menyembunyikan konten sampai ditinjau moderator.</li>
          <li>Foto: hanya JPEG/PNG/WebP, metadata lokasi (EXIF) dihapus di server, disimpan privat, dan hanya tampil lewat tautan sementara bila laporan disetujui.</li>
          <li>Pelaporan tanpa akun — tanpa nama, tanpa nomor telepon.</li>
        </ul>
      </section>

      <section className="mb-8 space-y-3">
        <h2 className="text-lg font-semibold">Privasi (ringkas)</h2>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          Kami meminimalkan data pribadi selaras UU PDP No. 27/2022. Untuk mencegah spam, kami
          menyimpan <em>hash</em> perangkat dan IP (bukan data mentahnya) dan membatasinya
          dengan masa simpan pendek. Anda dapat meminta penghapusan laporan Anda melalui kontak
          di bawah.
        </p>
      </section>

      <section className="mb-8 space-y-3">
        <h2 className="text-lg font-semibold">Keadaan darurat</h2>
        <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
          <li>
            <strong>{EMERGENCY.national.number}</strong> — {EMERGENCY.national.label}
          </li>
          <li>
            <strong>{EMERGENCY.bnpb.number}</strong> — {EMERGENCY.bnpb.label}
          </li>
          <li>
            <strong>{EMERGENCY.ambulance.number}</strong> — {EMERGENCY.ambulance.label}
          </li>
          <li>
            <strong>{EMERGENCY.fire.number}</strong> — {EMERGENCY.fire.label}
          </li>
        </ul>
        <p className="text-xs text-slate-500">
          Nomor dapat berbeda per daerah. Untuk informasi resmi, kunjungi:{" "}
          {OFFICIAL_LINKS.map((link, index) => (
            <span key={link.href}>
              <a className="underline" href={link.href} target="_blank" rel="noreferrer">
                {link.label}
              </a>
              {index < OFFICIAL_LINKS.length - 1 ? " · " : ""}
            </span>
          ))}
        </p>
      </section>

      <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
        <strong>Aplikasi ini bukan peringatan resmi.</strong> Informasi bersifat umum dan dapat
        terlambat atau tidak lengkap. Selalu ikuti arahan BMKG, BNPB/BPBD, dan pemerintah
        daerah.
      </p>
    </main>
  );
}
