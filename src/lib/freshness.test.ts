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
    expect(freshnessLevel(null, NOW)).toBe("critical");
    expect(freshnessLevel("", NOW)).toBe("critical");
    expect(freshnessLevel("not-a-date", NOW)).toBe("critical");
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
});
