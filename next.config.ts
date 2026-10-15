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

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
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
    : {}),
};

export default nextConfig;
