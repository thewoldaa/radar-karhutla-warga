import type { NextConfig } from "next";

/**
 * Static export mode (GitHub Pages staging/demo).
 *
 * Set STATIC_EXPORT=true to build a fully static site into `out/`.
 * In this mode the app runs on baked-in DEMO data only (no API routes, no SSR),
 * and NEXT_PUBLIC_BASE_PATH must match the GitHub Pages sub-path
 * (e.g. "/radar-karhutla-warga" for a project site).
 *
 * Production keeps the default server build (Cloudflare Pages / Firebase).
 */
const isStaticExport = process.env.STATIC_EXPORT === "true";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Security headers.
 *
 * CSP is the second line of defence for the map popups, which build HTML from
 * NASA CSV fields (currently escaped by hand). `connect-src` allows the map tile
 * provider, Supabase (Fase 2/3) and AdSense (Fase 4); `frame-src` allows ad frames.
 * `'unsafe-inline'` for styles is required by MapLibre GL's inline styling.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://pagead2.googlesyndication.com https://partner.googleadservices.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://tiles.openfreemap.org https://*.basemaps.cartocdn.com https://tile.thunderforest.com https://*.supabase.co https://pagead2.googlesyndication.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co https://tiles.openfreemap.org https://*.basemaps.cartocdn.com https://tile.thunderforest.com https://pagead2.googlesyndication.com",
  "worker-src 'self' blob:",
  "frame-src 'self' https://googleads.g.doubleclick.net https://tpc.googlesyndication.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=()" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Static hosting (GitHub Pages) serves files directly and cannot apply these
  // headers; Cloudflare/Firebase deployments can, so only apply them there.
  ...(isStaticExport
    ? {
        output: "export" as const,
        basePath,
        assetPrefix: basePath || undefined,
        trailingSlash: true, // GitHub Pages serves /path/index.html
        images: { unoptimized: true }, // required by `output: export`
        // NOTE: route handlers cannot exist under `output: export`. The staging
        // workflow removes src/app/api before building (see staging-pages.yml),
        // because a static site has no server to run them on.
      }
    : {
        async headers() {
          return [{ source: "/:path*", headers: SECURITY_HEADERS }];
        },
      }),
};

export default nextConfig;
