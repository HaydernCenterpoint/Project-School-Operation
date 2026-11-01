// Request rate limits for /api/* routes. On Cloudflare the Workers Rate Limiting bindings in
// wrangler.jsonc count across the edge; elsewhere (next dev) a per-process window stands in.
// Volumetric DDoS is absorbed by Cloudflare before any of this runs (docs/security.md).

export type Bucket = "ip" | "user";

/** Must match wrangler.jsonc "ratelimits" (the edge enforces its own copy of these numbers). */
export const limits: Record<Bucket, { binding: string; limit: number; periodMs: number }> = {
  // Generous: a whole computer lab can share one school IP.
  ip: { binding: "API_IP_LIMITER", limit: 600, periodMs: 60_000 },
  user: { binding: "API_USER_LIMITER", limit: 120, periodMs: 60_000 },
};

type Window = { start: number; count: number };
const windows = new Map<string, Window>();

/**
 * Fixed-window counter in memory. ponytail: per process, so N instances allow N× the limit;
 * only used where the Cloudflare binding is absent (local dev, tests).
 */
export function memoryLimit(key: string, limit: number, periodMs: number, now = Date.now()) {
  const current = windows.get(key);
  if (!current || now - current.start >= periodMs) {
    if (windows.size > 10_000) windows.clear();
    windows.set(key, { start: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= limit;
}

type Limiter = { limit(options: { key: string }): Promise<{ success: boolean }> };

async function edgeLimiter(binding: string): Promise<Limiter | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const env = getCloudflareContext().env as unknown as Record<string, Limiter | undefined>;
    return env[binding] ?? null;
  } catch {
    return null; // Not running on Cloudflare.
  }
}

/** Client address as Cloudflare reports it; the other headers only matter off Cloudflare. */
export function clientIp(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

/** Returns a 429 response when `key` is over its bucket's limit, else null. */
export async function rateLimit(bucket: Bucket, key: string): Promise<Response | null> {
  const { binding, limit, periodMs } = limits[bucket];
  const edge = await edgeLimiter(binding);
  const allowed = edge
    // Fail open: a limiter outage must not take the whole API down with it.
    ? (await edge.limit({ key: `${bucket}:${key}` }).catch(() => ({ success: true }))).success
    : memoryLimit(`${bucket}:${key}`, limit, periodMs);
  if (allowed) return null;
  return Response.json(
    { error: { code: "rate_limited", message: "Too many requests. Please slow down." } },
    { status: 429, headers: { "Retry-After": String(Math.ceil(periodMs / 1000)), "Cache-Control": "no-store" } },
  );
}
