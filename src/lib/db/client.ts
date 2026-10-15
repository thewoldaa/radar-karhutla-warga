/**
 * Supabase client for SERVER use only.
 *
 * Uses the secret key (sb_secret_...) which must never reach the browser.
 * VERIFY (docs/01-VERIFIKASI.md C13): the legacy service_role key is deprecated
 * at the end of 2026 — use the new secret key.
 *
 * Data access is intentionally funnelled through `src/lib/data/hotspots.ts`:
 * components and API routes never talk to Supabase directly.
 */

import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SECRET_KEY?.trim(),
  );
}

let cached: SupabaseClient | null = null;

export function getServerSupabase(): SupabaseClient | null {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !secret) return null;
  cached = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
