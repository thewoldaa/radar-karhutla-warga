import { describe, expect, it } from "vitest";

import {
  categoryForIspu,
  formatIspu,
  pm25ToIspu,
  PM25_BREAKPOINTS,
  PM25_SCALE_MAX,
} from "./convert";

describe("pm25ToIspu — nilai batas tiap kategori (kriteria selesai MVP #7)", () => {
  it("menghasilkan contoh resmi dari Permen LHK: 31,4 µg/m³ → ISPU 70 (Sedang)", () => {
    // Angka ini adalah contoh perhitungan resmi di dokumen KLHK.
    const result = pm25ToIspu(31.4);
    expect(result?.value).toBe(70);
    expect(result?.category.id).toBe("sedang");
  });

  it("batas bawah kategori Baik: 0 µg/m³ → ISPU 0", () => {
    expect(pm25ToIspu(0)?.value).toBe(0);
    expect(pm25ToIspu(0)?.category.id).toBe("baik");
  });

  it("batas atas kategori Baik: 15,5 µg/m³ → ISPU 50 (masih Baik)", () => {
    const result = pm25ToIspu(15.5);
    expect(result?.value).toBe(50);
    expect(result?.category.id).toBe("baik");
  });

  it("sedikit di atas batas Baik masuk kategori Sedang", () => {
    expect(pm25ToIspu(15.6)?.category.id).toBe("sedang");
  });

  it("batas atas kategori Sedang: 55,4 µg/m³ → ISPU 100 (masih Sedang)", () => {
    const result = pm25ToIspu(55.4);
    expect(result?.value).toBe(100);
    expect(result?.category.id).toBe("sedang");
  });

  it("sedikit di atas batas Sedang masuk Tidak Sehat", () => {
    expect(pm25ToIspu(55.5)?.category.id).toBe("tidak-sehat");
  });

  it("batas atas kategori Tidak Sehat: 150,4 µg/m³ → ISPU 200", () => {
    const result = pm25ToIspu(150.4);
    expect(result?.value).toBe(200);
    expect(result?.category.id).toBe("tidak-sehat");
  });

  it("sedikit di atas batas Tidak Sehat masuk Sangat Tidak Sehat", () => {
    expect(pm25ToIspu(150.5)?.category.id).toBe("sangat-tidak-sehat");
  });

  it("batas atas kategori Sangat Tidak Sehat: 250,4 µg/m³ → ISPU 300", () => {
    const result = pm25ToIspu(250.4);
    expect(result?.value).toBe(300);
    expect(result?.category.id).toBe("sangat-tidak-sehat");
  });

  it("sedikit di atas batas Sangat Tidak Sehat masuk Berbahaya", () => {
    expect(pm25ToIspu(250.5)?.category.id).toBe("berbahaya");
  });

  it("nilai ekstrem (mis. 299,9 µg/m³ saat karhutla) tetap Berbahaya", () => {
    const result = pm25ToIspu(299.9);
    expect(result?.category.id).toBe("berbahaya");
    expect(result?.value).toBeGreaterThan(300);
    expect(result?.isBeyondScale).toBe(false);
  });
});

describe("pm25ToIspu — di luar tabel regulasi (>500 µg/m³)", () => {
  it("menandai isBeyondScale alih-alih mengarang angka", () => {
    const result = pm25ToIspu(800);
    expect(result?.isBeyondScale).toBe(true);
    expect(result?.value).toBe(PM25_SCALE_MAX);
    expect(result?.category.id).toBe("berbahaya");
  });

  it("format menampilkan '> 500' untuk nilai di luar skala", () => {
    const result = pm25ToIspu(800);
    expect(result && formatIspu(result)).toBe(`> ${PM25_SCALE_MAX}`);
  });
});

describe("pm25ToIspu — label 'perkiraan' untuk data bukan 24 jam", () => {
  it("menambahkan tanda perkiraan bila diminta", () => {
    const result = pm25ToIspu(31.4, { isEstimate: true });
    expect(result?.isEstimate).toBe(true);
    expect(result && formatIspu(result)).toBe("70 (perkiraan)");
  });

  it("tanpa opsi, nilai dianggap bukan perkiraan", () => {
    expect(pm25ToIspu(31.4)?.isEstimate).toBe(false);
  });
});

describe("pm25ToIspu — input tidak valid harus null, bukan 0", () => {
  it("menolak null/undefined (jangan tampilkan sebagai udara bersih)", () => {
    expect(pm25ToIspu(null)).toBeNull();
    expect(pm25ToIspu(undefined)).toBeNull();
  });

  it("menolak NaN dan Infinity", () => {
    expect(pm25ToIspu(Number.NaN)).toBeNull();
    expect(pm25ToIspu(Number.POSITIVE_INFINITY)).toBeNull();
    expect(pm25ToIspu(Number.NEGATIVE_INFINITY)).toBeNull();
  });

  it("menolak konsentrasi negatif", () => {
    expect(pm25ToIspu(-1)).toBeNull();
  });
});

describe("categoryForIspu — batas kategori (Lampiran II)", () => {
  it.each([
    [0, "baik"],
    [50, "baik"],
    [51, "sedang"],
    [100, "sedang"],
    [101, "tidak-sehat"],
    [200, "tidak-sehat"],
    [201, "sangat-tidak-sehat"],
    [300, "sangat-tidak-sehat"],
    [301, "berbahaya"],
    [500, "berbahaya"],
  ])("ISPU %i → %s", (value, expected) => {
    expect(categoryForIspu(value as number).id).toBe(expected);
  });
});

describe("PM25_BREAKPOINTS — kontinuitas tabel", () => {
  it("setiap batas atas kategori sama dengan batas bawah kategori berikutnya", () => {
    for (let i = 1; i < PM25_BREAKPOINTS.length; i++) {
      expect(PM25_BREAKPOINTS[i].concLow).toBe(PM25_BREAKPOINTS[i - 1].concHigh);
      expect(PM25_BREAKPOINTS[i].ispuLow).toBe(PM25_BREAKPOINTS[i - 1].ispuHigh);
    }
  });

  it("dimulai dari 0 dan berakhir di 500 µg/m³", () => {
    expect(PM25_BREAKPOINTS[0].concLow).toBe(0);
    expect(PM25_BREAKPOINTS[PM25_BREAKPOINTS.length - 1].concHigh).toBe(PM25_SCALE_MAX);
  });
});

describe("setiap kategori punya anjuran kesehatan umum", () => {
  it("semua kategori punya teks anjuran yang tidak kosong", () => {
    for (const value of [10, 75, 150, 250, 400]) {
      const category = categoryForIspu(value);
      expect(category.advice.length).toBeGreaterThan(20);
      expect(category.label.length).toBeGreaterThan(0);
      expect(category.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
