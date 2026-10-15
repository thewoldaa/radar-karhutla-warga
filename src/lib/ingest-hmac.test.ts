import { describe, expect, it } from "vitest";

import {
  DEFAULT_MAX_SKEW_SECONDS,
  signIngestPayload,
  verifyIngestSignature,
} from "./ingest-hmac";

const SECRET = "test-secret-please-rotate";
const BODY = "{}";
const NOW = new Date("2026-10-15T12:00:00.000Z");
const NOW_SECONDS = Math.floor(NOW.getTime() / 1000);

function headersFor(timestampSeconds: number, signature: string) {
  return {
    timestampHeader: String(timestampSeconds),
    signatureHeader: `sha256=${signature}`,
  };
}

describe("signIngestPayload", () => {
  it("is deterministic for the same input", () => {
    const a = signIngestPayload(SECRET, NOW_SECONDS, BODY);
    const b = signIngestPayload(SECRET, NOW_SECONDS, BODY);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes when the body changes (signature binds the payload)", () => {
    const a = signIngestPayload(SECRET, NOW_SECONDS, "{}");
    const b = signIngestPayload(SECRET, NOW_SECONDS, '{"extra":1}');
    expect(a).not.toBe(b);
  });

  it("changes when the secret changes", () => {
    const a = signIngestPayload(SECRET, NOW_SECONDS, BODY);
    const b = signIngestPayload("another-secret", NOW_SECONDS, BODY);
    expect(a).not.toBe(b);
  });
});

describe("verifyIngestSignature", () => {
  it("accepts a correctly signed request", () => {
    const signature = signIngestPayload(SECRET, NOW_SECONDS, BODY);
    const result = verifyIngestSignature({
      secret: SECRET,
      ...headersFor(NOW_SECONDS, signature),
      rawBody: BODY,
      now: NOW,
    });
    expect(result.ok).toBe(true);
  });

  it("accepts a signature without the sha256= prefix", () => {
    const signature = signIngestPayload(SECRET, NOW_SECONDS, BODY);
    const result = verifyIngestSignature({
      secret: SECRET,
      timestampHeader: String(NOW_SECONDS),
      signatureHeader: signature,
      rawBody: BODY,
      now: NOW,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a tampered body", () => {
    const signature = signIngestPayload(SECRET, NOW_SECONDS, BODY);
    const result = verifyIngestSignature({
      secret: SECRET,
      ...headersFor(NOW_SECONDS, signature),
      rawBody: '{"injected":true}',
      now: NOW,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/tidak cocok/i);
  });

  it("rejects a wrong secret", () => {
    const signature = signIngestPayload("attacker-secret", NOW_SECONDS, BODY);
    const result = verifyIngestSignature({
      secret: SECRET,
      ...headersFor(NOW_SECONDS, signature),
      rawBody: BODY,
      now: NOW,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a stale timestamp (replay protection)", () => {
    const oldTimestamp = NOW_SECONDS - DEFAULT_MAX_SKEW_SECONDS - 60;
    const signature = signIngestPayload(SECRET, oldTimestamp, BODY);
    const result = verifyIngestSignature({
      secret: SECRET,
      ...headersFor(oldTimestamp, signature),
      rawBody: BODY,
      now: NOW,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/kedaluwarsa|replay/i);
  });

  it("rejects a far-future timestamp", () => {
    const futureTimestamp = NOW_SECONDS + DEFAULT_MAX_SKEW_SECONDS + 60;
    const signature = signIngestPayload(SECRET, futureTimestamp, BODY);
    const result = verifyIngestSignature({
      secret: SECRET,
      ...headersFor(futureTimestamp, signature),
      rawBody: BODY,
      now: NOW,
    });
    expect(result.ok).toBe(false);
  });

  it("accepts a timestamp just inside the window", () => {
    const edge = NOW_SECONDS - DEFAULT_MAX_SKEW_SECONDS + 5;
    const signature = signIngestPayload(SECRET, edge, BODY);
    const result = verifyIngestSignature({
      secret: SECRET,
      ...headersFor(edge, signature),
      rawBody: BODY,
      now: NOW,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects missing headers", () => {
    expect(
      verifyIngestSignature({
        secret: SECRET,
        timestampHeader: null,
        signatureHeader: null,
        rawBody: BODY,
        now: NOW,
      }).ok,
    ).toBe(false);
  });

  it("rejects a non-numeric timestamp", () => {
    const signature = signIngestPayload(SECRET, NOW_SECONDS, BODY);
    const result = verifyIngestSignature({
      secret: SECRET,
      timestampHeader: "not-a-number",
      signatureHeader: `sha256=${signature}`,
      rawBody: BODY,
      now: NOW,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a malformed signature of the wrong length", () => {
    const result = verifyIngestSignature({
      secret: SECRET,
      timestampHeader: String(NOW_SECONDS),
      signatureHeader: "sha256=deadbeef",
      rawBody: BODY,
      now: NOW,
    });
    expect(result.ok).toBe(false);
  });
});
