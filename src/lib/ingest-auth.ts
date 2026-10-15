/**
 * Verification of scheduled-ingest callers. Two supported paths:
 *
 * A) HMAC signature (GitHub Actions cron, default for this project)
 *    The workflow signs `${timestamp}.${body}` with a shared secret:
 *      X-Ingest-Timestamp: <unix seconds>
 *      X-Ingest-Signature: sha256=<hex hmac>
 *    We reject timestamps outside a 5-minute window (replay protection) and
 *    compare digests in constant time. Pure logic: src/lib/ingest-hmac.ts.
 *
 * B) OIDC identity token (Cloud Scheduler, optional self-host path)
 *    VERIFIED (docs/01-VERIFIKASI.md C5): Cloud Scheduler signs but does NOT
 *    verify — "the receiving service must manually verify the token".
 *    https://docs.cloud.google.com/scheduler/docs/http-target-auth
 *    We verify signature (Google JWKS), issuer, audience and caller email.
 *
 * Fail-closed: with neither mechanism configured, the endpoint stays closed.
 */

import "server-only";

import { createRemoteJWKSet, jwtVerify } from "jose";

import { verifyIngestSignature } from "@/lib/ingest-hmac";

const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);

export interface IngestAuthResult {
  ok: boolean;
  method?: "hmac" | "oidc";
  reason?: string;
}

export function isHmacConfigured(): boolean {
  return Boolean(process.env.INGEST_HMAC_SECRET?.trim());
}

export function isOidcConfigured(): boolean {
  return Boolean(
    process.env.INGEST_AUDIENCE?.trim() && process.env.INGEST_SA_EMAIL?.trim(),
  );
}

export function isIngestAuthConfigured(): boolean {
  return isHmacConfigured() || isOidcConfigured();
}

/** Verifies the HMAC signature of a request body against the server secret. */
export function verifyHmacRequest(
  headers: Headers,
  rawBody: string,
  now: Date = new Date(),
): IngestAuthResult {
  const secret = process.env.INGEST_HMAC_SECRET?.trim();
  if (!secret) return { ok: false, reason: "INGEST_HMAC_SECRET belum diatur." };

  const result = verifyIngestSignature({
    secret,
    timestampHeader: headers.get("x-ingest-timestamp"),
    signatureHeader: headers.get("x-ingest-signature"),
    rawBody,
    now,
  });
  return result.ok ? { ok: true, method: "hmac" } : { ok: false, reason: result.reason };
}

export async function verifyOidcRequest(request: Request): Promise<IngestAuthResult> {
  const audience = process.env.INGEST_AUDIENCE?.trim();
  const expectedEmail = process.env.INGEST_SA_EMAIL?.trim();

  if (!audience || !expectedEmail) {
    return { ok: false, reason: "Jalur OIDC tidak dikonfigurasi." };
  }

  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return { ok: false, reason: "Header Authorization Bearer tidak ada." };

  try {
    const { payload } = await jwtVerify(match[1], GOOGLE_JWKS, {
      issuer: "https://accounts.google.com",
      audience,
    });
    if (payload.email !== expectedEmail) {
      return { ok: false, reason: "Service account tidak diizinkan." };
    }
    if (payload.email_verified !== true) {
      return { ok: false, reason: "Email service account belum terverifikasi." };
    }
    return { ok: true, method: "oidc" };
  } catch (error) {
    return {
      ok: false,
      reason:
        error instanceof Error ? `Token tidak valid: ${error.message}` : "Token tidak valid.",
    };
  }
}

/**
 * Tries every configured mechanism. A request is accepted if ANY succeeds,
 * but at least one mechanism must be configured (otherwise: closed).
 */
export async function verifyIngestRequest(
  request: Request,
  rawBody: string,
  now: Date = new Date(),
): Promise<IngestAuthResult> {
  if (!isIngestAuthConfigured()) {
    return {
      ok: false,
      reason:
        "Ingest belum dikonfigurasi (INGEST_HMAC_SECRET atau INGEST_AUDIENCE/INGEST_SA_EMAIL kosong). Endpoint ditutup.",
    };
  }

  const failures: string[] = [];

  if (isHmacConfigured()) {
    const hmac = verifyHmacRequest(request.headers, rawBody, now);
    if (hmac.ok) return hmac;
    failures.push(`HMAC: ${hmac.reason}`);
  }

  if (isOidcConfigured()) {
    const oidc = await verifyOidcRequest(request);
    if (oidc.ok) return oidc;
    failures.push(`OIDC: ${oidc.reason}`);
  }

  return { ok: false, reason: failures.join(" | ") };
}
