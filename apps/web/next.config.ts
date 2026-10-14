import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

/**
 * Content Security Policy. No third-party scripts, frames or plugins; data only from this site
 * and Supabase. ponytail: scripts allow 'unsafe-inline' because Next injects inline hydration
 * scripts; move to per-request nonces (proxy.ts) to drop it. News images come from the school's
 * sites, some over plain http, hence http: in img-src.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https: http:",
  // Chat videos stream from Supabase Storage; blob: is the local preview before upload.
  `media-src 'self' blob: ${supabase}`.trim(),
  "font-src 'self' data:",
  `connect-src 'self' ${supabase}${dev ? " ws: wss:" : ""}`.trim(),
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Browsers ignore HSTS over plain http, so this is harmless in local development.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), clipboard-write=(self)" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  typedRoutes: true,
  transpilePackages: ["@sao-do/contracts"],
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
