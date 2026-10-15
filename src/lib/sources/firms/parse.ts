/**
 * NASA FIRMS CSV parsing (Area API, CSV only).
 *
 * VERIFY (docs/01-VERIFIKASI.md A7): the exact byte-level CSV of a keyed response
 * has not been observed without a MAP_KEY. Column set below is taken from the
 * official NASA academy example for VIIRS NRT:
 *   latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,
 *   instrument,confidence,version,bright_ti5,frp,daynight
 * MODIS NRT responses share the same shape (bright_ti4 = brightness).
 *
 * acq_date/acq_time are UTC (FIRMS docs: "Dates are based on GMT").
 */

export interface FirmsHotspot {
  lat: number;
  lon: number;
  acqDate: string; // YYYY-MM-DD (UTC)
  acqTime: string; // HHMM, zero-padded
  satellite: string;
  instrument: string;
  confidenceRaw: string;
  frp: number | null;
  daynight: "D" | "N" | null;
}

const MAX_ROWS = 20_000; // safety bound for a single CSV payload

function splitCsvLine(line: string): string[] {
  // FIRMS CSV contains no quoted fields; a plain split is sufficient and safe.
  return line.split(",");
}

/** Converts FIRMS acq_date + acq_time (UTC) to an ISO instant. */
export function acqToIso(acqDate: string, acqTime: string): string | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(acqDate.trim());
  if (!dateMatch) return null;
  const hhmm = acqTime.trim().padStart(4, "0");
  if (!/^\d{4}$/.test(hhmm)) return null;
  const hh = Number(hhmm.slice(0, 2));
  const mm = Number(hhmm.slice(2, 4));
  if (hh > 23 || mm > 59) return null;
  const iso = `${acqDate.trim()}T${hhmm.slice(0, 2)}:${hhmm.slice(2, 4)}:00Z`;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function parseNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed.toLowerCase() === "null") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function normalizeDayNight(value: string): "D" | "N" | null {
  const v = value.trim().toUpperCase();
  if (v === "D" || v === "N") return v;
  return null;
}

/**
 * Parses a FIRMS Area API CSV body. Tolerant by design:
 * - skips malformed rows instead of failing the whole ingest;
 * - returns [] for empty bodies or error text (callers treat it as "no data").
 */
export function parseFirmsCsv(csv: string): FirmsHotspot[] {
  if (!csv) return [];
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return []; // header only, or error text

  const header = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const iLat = col("latitude");
  const iLon = col("longitude");
  const iDate = col("acq_date");
  const iTime = col("acq_time");
  const iSat = col("satellite");
  const iInst = col("instrument");
  const iConf = col("confidence");
  const iFrp = col("frp");
  const iDayNight = col("daynight");

  if (iLat < 0 || iLon < 0 || iDate < 0 || iTime < 0 || iSat < 0 || iConf < 0) {
    // Not a FIRMS CSV (likely an error message from the API).
    return [];
  }

  const out: FirmsHotspot[] = [];
  for (let i = 1; i < lines.length && out.length < MAX_ROWS; i++) {
    const cells = splitCsvLine(lines[i]);
    const lat = parseNumber(cells[iLat] ?? "");
    const lon = parseNumber(cells[iLon] ?? "");
    const acqDate = (cells[iDate] ?? "").trim();
    const acqTime = (cells[iTime] ?? "").trim();
    if (lat === null || lon === null || !acqDate || !acqTime) continue;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) continue;

    out.push({
      lat,
      lon,
      acqDate,
      acqTime,
      satellite: (cells[iSat] ?? "").trim(),
      instrument: iInst >= 0 ? (cells[iInst] ?? "").trim() : "",
      confidenceRaw: (cells[iConf] ?? "").trim(),
      frp: iFrp >= 0 ? parseNumber(cells[iFrp] ?? "") : null,
      daynight: iDayNight >= 0 ? normalizeDayNight(cells[iDayNight] ?? "") : null,
    });
  }
  return out;
}
