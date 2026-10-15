import { describe, expect, it } from "vitest";

import {
  freshnessLevel,
  freshnessMessage,
  STALE_CRITICAL_HOURS,
  STALE_WARN_HOURS,
} from "./freshness";

const NOW = new Date("2026-10-15T12:00:00.000Z");

function hoursBefore(hours: number): string {
  return new Date(NOW.getTime() - hours * 3_600_000).toISOString();
}

describe("freshnessLevel", () => {
  it("treats data younger than the warn threshold as fresh", () => {
    expect(freshnessLevel(hoursBefore(0), NOW)).toBe("fresh");
    expect(freshnessLevel(hoursBefore(1), NOW)).toBe("fresh");
    expect(freshnessLevel(hoursBefore(STALE_WARN_HOURS - 0.1), NOW)).toBe("fresh");
  });

  it("warns once data passes the warn threshold", () => {
    expect(freshnessLevel(hoursBefore(STALE_WARN_HOURS), NOW)).toBe("warn");
    expect(freshnessLevel(hoursBefore(12), NOW)).toBe("warn");
  });

  it("escalates to critical at the critical threshold", () => {
    expect(freshnessLevel(hoursBefore(STALE_CRITICAL_HOURS), NOW)).toBe("critical");
    expect(freshnessLevel(hoursBefore(72), NOW)).toBe("critical");
  });

  it("never reports fresh when there is no data at all", () => {
    // This is the important safety property: an empty database must NOT look
    // like "no fires today" — it must look like "we have no data".
    expect(freshnessLevel(null, NOW)).toBe("nodata");
    expect(freshnessLevel("", NOW)).toBe("nodata");
    expect(freshnessLevel("not-a-date", NOW)).toBe("nodata");
  });

  it("distinguishes 'no data' from 'old data' (different UI banners)", () => {
    // A fresh install (nodata) and a stalled ingest (critical) must not render
    // the same banner, and neither may read as healthy.
    expect(freshnessLevel(null, NOW)).not.toBe(freshnessLevel(hoursBefore(48), NOW));
    expect(freshnessLevel(null, NOW)).not.toBe("fresh");
  });

  it("does not treat future timestamps as stale", () => {
    const future = new Date(NOW.getTime() + 3_600_000).toISOString();
    expect(freshnessLevel(future, NOW)).toBe("fresh");
  });

  it("threshold constants match the documented policy", () => {
    expect(STALE_WARN_HOURS).toBe(6);
    expect(STALE_CRITICAL_HOURS).toBe(24);
  });
});

describe("freshnessMessage", () => {
  it("mentions the timestamp for every level", () => {
    const label = "15 Okt 2026, 12.00 WIB";
    expect(freshnessMessage("fresh", label)).toContain(label);
    expect(freshnessMessage("warn", label)).toContain(label);
    expect(freshnessMessage("critical", label)).toContain(label);
  });

  it("says the source may be unavailable when critical", () => {
    expect(freshnessMessage("critical", "kemarin")).toMatch(/tidak tersedia/i);
  });

  it("never implies 'no fires' when we hold no data", () => {
    const message = freshnessMessage("nodata", "-");
    // Must state that data is missing, and must explicitly deny the dangerous
    // reading ("no hot spots" = "no fires"). Asserting on the full sentence is
    // what matters, not the absence of the phrase itself.
    expect(message).toMatch(/belum ada data/i);
    expect(message).toMatch(/bukan berarti tidak ada titik panas/i);
  });
});
