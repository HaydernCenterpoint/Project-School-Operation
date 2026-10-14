import { createClient } from "@supabase/supabase-js";
import { apiError, getAcademicContext, isUuid, json } from "@/lib/academic-api";
import { syncNews } from "@/lib/news-sync";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/** Constant-time compare, so the secret cannot be guessed byte by byte from timing. */
function sameSecret(given: string | null, expected: string | undefined) {
  if (!given || !expected || expected.length < 24) return false;
  const a = new TextEncoder().encode(given);
  const b = new TextEncoder().encode(expected);
  let diff = a.length ^ b.length;
  for (let i = 0; i < b.length; i++) diff |= (a[i] ?? 0) ^ b[i]!;
  return diff === 0;
}

/**
 * Pull new posts now. Two callers:
 * - the scheduled job (x-cron-secret = NEWS_CRON_SECRET), which writes with the service role;
 * - staff or admins from /quan-tri/tin-tuc, whose own session (and RLS) is used.
 * Body: optional { "sourceId": uuid } to sync one source.
 */
export async function POST(request: Request) {
  // The secret check below runs before auth, so guessing it is rate limited per IP too.
  const limited = await rateLimit("ip", clientIp(request));
  if (limited) return limited;
  const body = (await request.json().catch(() => ({}))) as { sourceId?: unknown };
  const only = isUuid(body.sourceId) ? body.sourceId : undefined;

  if (sameSecret(request.headers.get("x-cron-secret"), process.env.NEWS_CRON_SECRET)) {
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return apiError(500, "server_configuration", "News sync is not configured.");
    const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    return json({ results: await syncNews(db, only) });
  }

  const auth = await getAcademicContext(request);
  if (auth.response) return auth.response;
  if (auth.context.membership.role !== "admin" && auth.context.membership.role !== "staff") {
    return apiError(403, "forbidden", "Staff access is required.");
  }
  try {
    return json({ results: await syncNews(auth.context.supabase, only) });
  } catch (error) {
    return apiError(500, "sync_failed", error instanceof Error ? error.message : "Sync failed.");
  }
}
