/**
 * Pure HMAC signing/verification for the scheduled-ingest endpoint.
 *
 * Deliberately free of `server-only` and of environment access so it can be
 * unit-tested and reused by the signing script (scripts/sign-ingest.mjs).
 * The server wiring lives in src/lib/ingest-auth.ts.
 *
 * Scheme:
 *   message   = `${unixTimestampSeconds}.${rawBody}`
 *   signature = hex( HMAC-SHA256(secret, message) )
 *   headers   = X-Ingest-Timestamp, X-Ingest-Signature: sha256=<hex>
 */

import { createHmac, timingSafeEqual } from "node:crypto";

/** Replay window: requests older/newer than this are rejected (seconds). */
export const DEFAULT_MAX_SKEW_SECONDS = 300;

export function signIngestPayload(
  secret: string,
  timestampSeconds: number,
  rawBody: string,
): string {
  return createHmac("sha256", secret)
    .update(`${timestampSeconds}.${rawBody}`)
    .digest("hex");
}

export interface VerifySignatureInput {
  secret: string;
  timestampHeader: string | null;
  signatureHeader: string | null;
  rawBody: string;
  now?: Date;
  maxSkewSeconds?: number;
}

export interface VerifySignatureResult {
  ok: boolean;
  reason?: string;
}

export function verifyIngestSignature({
  secret,
  timestampHeader,
  signatureHeader,
  rawBody,
  now = new Date(),
  maxSkewSeconds = DEFAULT_MAX_SKEW_SECONDS,
}: VerifySignatureInput): VerifySignatureResult {
  const timestamp = timestampHeader?.trim() ?? "";
  const signature = signatureHeader?.trim() ?? "";

  if (!timestamp || !signature) {
    return { ok: false, reason: "Header tanda tangan ingest tidak lengkap." };
  }

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds)) {
    return { ok: false, reason: "Timestamp ingest tidak valid." };
  }

  const skewSeconds = Math.abs(now.getTime() / 1000 - timestampSeconds);
  if (skewSeconds > maxSkewSeconds) {
    return { ok: false, reason: "Timestamp ingest kedaluwarsa (kemungkinan replay)." };
  }

  const expected = signIngestPayload(secret, timestampSeconds, rawBody);
  const received = signature.replace(/^sha256=/i, "").toLowerCase();

  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(received, "utf8");
  // Lengths must match before timingSafeEqual; a mismatch is already a failure.
  if (expectedBuffer.length !== receivedBuffer.length) {
    return { ok: false, reason: "Tanda tangan ingest tidak cocok." };
  }
  if (!timingSafeEqual(expectedBuffer, receivedBuffer)) {
    return { ok: false, reason: "Tanda tangan ingest tidak cocok." };
  }
  return { ok: true };
}
