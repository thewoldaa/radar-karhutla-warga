import { describe, expect, it } from "vitest";

import { acqToIso, parseFirmsCsv } from "./parse";

const VIIRS_HEADER =
  "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight";

describe("parseFirmsCsv", () => {
  it("parses a VIIRS row into a typed hotspot", () => {
    const csv = [
      VIIRS_HEADER,
      "0.5071,101.4472,330.2,0.39,0.44,2026-10-14,0142,N21,VIIRS,n,2.0NRT,295.1,12.5,D",
    ].join("\n");

    const rows = parseFirmsCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      lat: 0.5071,
      lon: 101.4472,
      acqDate: "2026-10-14",
      acqTime: "0142",
      satellite: "N21",
      instrument: "VIIRS",
      confidenceRaw: "n",
      frp: 12.5,
      daynight: "D",
    });
  });

  it("parses MODIS-style rows (numeric confidence, no bright_ti4 naming differences)", () => {
    const csv = [
      "latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight",
      "-2.21,113.92,312.4,1,1,2026-10-14,0530,T,MODIS,78,6.1NRT,290.5,45.0,D",
    ].join("\n");

    const rows = parseFirmsCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].confidenceRaw).toBe("78");
    expect(rows[0].satellite).toBe("T");
  });

  it("returns an empty array for empty input and header-only input", () => {
    expect(parseFirmsCsv("")).toEqual([]);
    expect(parseFirmsCsv(VIIRS_HEADER)).toEqual([]);
  });

  it("returns an empty array for API error text", () => {
    expect(parseFirmsCsv("Invalid MAP_KEY.")).toEqual([]);
    expect(parseFirmsCsv("Error in processing: Invalid format.")).toEqual([]);
  });

  it("skips malformed rows without failing the batch", () => {
    const csv = [
      VIIRS_HEADER,
      "not-a-number,101.4472,330.2,0.39,0.44,2026-10-14,0142,N21,VIIRS,n,2.0NRT,295.1,12.5,D",
      "0.5071,101.4472,330.2,0.39,0.44,2026-10-14,0142,N21,VIIRS,h,2.0NRT,295.1,9.9,D",
      "99.0,101.4472,330.2,0.39,0.44,2026-10-14,0142,N21,VIIRS,h,2.0NRT,295.1,9.9,D",
    ].join("\n");

    const rows = parseFirmsCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].confidenceRaw).toBe("h");
  });

  it("handles CRLF line endings", () => {
    const csv = [
      VIIRS_HEADER,
      "0.5,101.4,330.2,0.39,0.44,2026-10-14,0142,N20,VIIRS,l,2.0NRT,295.1,3.0,N",
    ].join("\r\n");

    expect(parseFirmsCsv(csv)).toHaveLength(1);
  });

  it("treats empty or null FRP as null", () => {
    const csv = [
      VIIRS_HEADER,
      "0.5,101.4,330.2,0.39,0.44,2026-10-14,0142,N20,VIIRS,n,2.0NRT,295.1,,D",
      "0.6,101.5,330.2,0.39,0.44,2026-10-14,0143,N20,VIIRS,n,2.0NRT,295.1,null,D",
    ].join("\n");

    const rows = parseFirmsCsv(csv);
    expect(rows[0].frp).toBeNull();
    expect(rows[1].frp).toBeNull();
  });
});

describe("acqToIso", () => {
  it("converts FIRMS UTC date + HHMM to an ISO instant", () => {
    expect(acqToIso("2026-10-14", "0142")).toBe("2026-10-14T01:42:00.000Z");
  });

  it("zero-pads short acq_time values (FIRMS drops leading zeros)", () => {
    expect(acqToIso("2026-10-14", "42")).toBe("2026-10-14T00:42:00.000Z");
    expect(acqToIso("2026-10-14", "5")).toBe("2026-10-14T00:05:00.000Z");
  });

  it("returns null for invalid input", () => {
    expect(acqToIso("14/10/2026", "0142")).toBeNull();
    expect(acqToIso("2026-10-14", "9999")).toBeNull();
    expect(acqToIso("2026-10-14", "ab")).toBeNull();
  });
});
