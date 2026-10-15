import { describe, expect, it } from "vitest";

import {
  classifyConfidence,
  isHiddenByDefault,
  MODIS_CONFIDENCE_THRESHOLDS,
} from "./confidence";

describe("classifyConfidence — VIIRS", () => {
  it("maps categorical values directly", () => {
    expect(classifyConfidence("l", "VIIRS")).toBe("low");
    expect(classifyConfidence("n", "VIIRS")).toBe("nominal");
    expect(classifyConfidence("h", "VIIRS")).toBe("high");
  });

  it("is case-insensitive and accepts long forms", () => {
    expect(classifyConfidence("LOW", "VIIRS")).toBe("low");
    expect(classifyConfidence("Nominal", "VIIRS")).toBe("nominal");
    expect(classifyConfidence("HIGH", "VIIRS")).toBe("high");
  });

  it("returns null for unknown values", () => {
    expect(classifyConfidence("x", "VIIRS")).toBeNull();
    expect(classifyConfidence("", "VIIRS")).toBeNull();
  });
});

describe("classifyConfidence — MODIS", () => {
  it("maps numeric confidence using project thresholds", () => {
    expect(classifyConfidence("0", "MODIS")).toBe("low");
    expect(classifyConfidence("29", "MODIS")).toBe("low");
    expect(classifyConfidence("30", "MODIS")).toBe("nominal");
    expect(classifyConfidence("79", "MODIS")).toBe("nominal");
    expect(classifyConfidence("80", "MODIS")).toBe("high");
    expect(classifyConfidence("100", "MODIS")).toBe("high");
  });

  it("threshold constants are the documented project values", () => {
    expect(MODIS_CONFIDENCE_THRESHOLDS.nominal).toBe(30);
    expect(MODIS_CONFIDENCE_THRESHOLDS.high).toBe(80);
  });

  it("returns null for non-numeric garbage", () => {
    expect(classifyConfidence("unknown", "MODIS")).toBeNull();
  });
});

describe("isHiddenByDefault", () => {
  it("hides only low confidence detections by default", () => {
    expect(isHiddenByDefault("low")).toBe(true);
    expect(isHiddenByDefault("nominal")).toBe(false);
    expect(isHiddenByDefault("high")).toBe(false);
  });
});
