// Server-only: pulls new posts from every active news source and records them.
// Called from /api/news/sync by a staff member ("Cập nhật ngay") or by the hourly scheduled job.
import type { SupabaseClient } from "@supabase/supabase-js";
import { aiConfig, streamCompletion } from "./ai-provider";
import { extractArticle, facebookItem, fallbackSummary, isPublicHttpUrl, parseRss, type FacebookPost, type NewsItem } from "./news-parse";

type Source = { id: string; tenant_id: string; kind: "rss" | "facebook"; name: string; url: string; last_synced_at: string | null };
export type SyncResult = { source: string; name: string; added: number; error?: string };

/** New posts taken per source per run; bounds both run time and AI cost. */
const perRun = 8;
const graphVersion = "v21.0";

async function fetchText(url: string, limit = 3_000_000) {
  if (!isPublicHttpUrl(url)) throw new Error("Địa chỉ nguồn không hợp lệ.");
  const response = await fetch(url, {
    headers: { "user-agent": "SaoDoPortal-NewsBot/1.0", accept: "application/rss+xml, application/xml, text/html;q=0.9, */*;q=0.5" },
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Nguồn trả về lỗi ${response.status}.`);
  const text = await response.text();
  return text.length > limit ? text.slice(0, limit) : text;
}

/** Two or three neutral sentences in Vietnamese, or null when AI is off or fails (the caller falls back). */
async function summarize(title: string, text: string): Promise<string | null> {
  const config = aiConfig();
  if (!config || text.length < 200) return null;
  let out = "";
  try {
    await streamCompletion(
      { ...config, maxOutputTokens: 400 },
      "Bạn tóm tắt tin tức của Trường Đại học Sao Đỏ cho sinh viên. Viết 2-3 câu tiếng Việt, trung lập, tối đa 70 từ. " +
        "Chỉ dùng thông tin có trong bài; giữ đúng tên, ngày, số liệu. Không mở đầu bằng 'Bài viết' hay 'Tóm tắt'. Chỉ trả về đoạn tóm tắt.",
      [{ role: "user", content: `Tiêu đề: ${title}\n\nNội dung:\n${text.slice(0, 6000)}` }],
      (delta) => { out += delta; },
      AbortSignal.timeout(30_000),
    );
  } catch {
    return null;
  }
  const summary = out.replace(/\s+/g, " ").trim();
  return summary.length >= 20 ? summary.slice(0, 1200) : null;
}

async function rssItems(source: Source, known: (urls: string[]) => Promise<Set<string>>): Promise<NewsItem[]> {
  const feed = parseRss(await fetchText(source.url), source.url);
  const seen = await known(feed.map((item) => item.url));
  const fresh = feed.filter((item) => !seen.has(item.url)).slice(0, perRun);
  // Feeds carry only title and thumbnail; the article page has the lead, full image and text.
  return Promise.all(fresh.map(async (item) => {
    try {
      if (!isPublicHttpUrl(item.url)) return item;
      const page = extractArticle(await fetchText(item.url), item.url);
      const ai = await summarize(item.title, page.text || page.lead);
      return {
        ...item,
        summary: ai ?? (fallbackSummary(page.lead, page.text) || item.summary),
        image_url: page.image_url ?? item.image_url,
        ai_summary: Boolean(ai),
      };
    } catch {
      return item;
    }
  }));
}

async function facebookItems(source: Source, known: (urls: string[]) => Promise<Set<string>>): Promise<NewsItem[]> {
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!token) throw new Error("Chưa cấu hình FACEBOOK_PAGE_ACCESS_TOKEN trên máy chủ.");
  const page = encodeURIComponent(source.url.trim());
  const response = await fetch(
    `https://graph.facebook.com/${graphVersion}/${page}/posts?fields=id,message,created_time,permalink_url,full_picture&limit=15`,
    // Token in a header, never in the URL, so it cannot land in logs.
    { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15_000) },
  );
  const body = (await response.json().catch(() => ({}))) as { data?: FacebookPost[]; error?: { message?: string } };
  if (!response.ok) throw new Error(`Facebook từ chối: ${body.error?.message?.slice(0, 160) ?? response.status}`);
  const posts = (body.data ?? []).map(facebookItem).filter((item): item is NewsItem => Boolean(item));
  const seen = await known(posts.map((item) => item.url));
  const fresh = posts.filter((item) => !seen.has(item.url)).slice(0, perRun);
  return Promise.all(fresh.map(async (item) => {
    const ai = item.summary.length > 320 ? await summarize(item.title, item.summary) : null;
    return { ...item, summary: ai ?? fallbackSummary("", item.summary), ai_summary: Boolean(ai) };
  }));
}

/**
 * Syncs one source, or every active source not synced in the last minute.
 * `db` is either the staff member's client (RLS applies) or the privileged backend client of the job.
 */
export async function syncNews(db: SupabaseClient, only?: string): Promise<SyncResult[]> {
  let query = db.from("news_sources").select("id, tenant_id, kind, name, url, last_synced_at").eq("active", true);
  if (only) query = query.eq("id", only);
  const { data, error } = await query;
  if (error) throw new Error("Không đọc được danh sách nguồn tin.");
  const recent = Date.now() - 60_000;
  const sources = (data as Source[]).filter((item) => only || !item.last_synced_at || Date.parse(item.last_synced_at) < recent);

  // ponytail: sources run one after another; parallelise in small batches if the list grows past ~30.
  const results: SyncResult[] = [];
  for (const source of sources) {
    const known = async (urls: string[]) => {
      if (!urls.length) return new Set<string>();
      const { data: rows } = await db.from("news_posts").select("url").eq("tenant_id", source.tenant_id).in("url", urls);
      return new Set((rows ?? []).map((row: { url: string }) => row.url));
    };
    try {
      const items = source.kind === "facebook" ? await facebookItems(source, known) : await rssItems(source, known);
      const { data: added, error: saveError } = await db.rpc("news_record_sync", { source: source.id, items });
      if (saveError) throw new Error("Không lưu được bài mới.");
      results.push({ source: source.id, name: source.name, added: Number(added ?? 0) });
    } catch (syncError) {
      const message = syncError instanceof Error ? syncError.message : "Lỗi không xác định.";
      await db.rpc("news_record_sync", { source: source.id, items: [], error: message });
      results.push({ source: source.id, name: source.name, added: 0, error: message });
    }
  }
  return results;
}
