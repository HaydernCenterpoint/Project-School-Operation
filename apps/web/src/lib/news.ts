import { academicRequest } from "./academic-client";
import { getSupabaseBrowserClient } from "./supabase-browser";

// News feed for students and its management for staff. Posts are written only by the sync job
// (lib/news-sync.ts); here staff add sources, pause them and hide posts.

export type NewsPost = {
  id: string;
  url: string;
  title: string;
  summary: string;
  image_url: string | null;
  category: string;
  published_at: string;
  ai_summary: boolean;
  hidden: boolean;
  source: { name: string; kind: "rss" | "facebook" } | null;
};

export type NewsSource = {
  id: string;
  kind: "rss" | "facebook";
  name: string;
  url: string;
  category: string;
  active: boolean;
  last_synced_at: string | null;
  last_error: string | null;
};

export type SyncResult = { source: string; name: string; added: number; error?: string };

const db = () => getSupabaseBrowserClient();

async function run<T>(query: PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }>): Promise<T> {
  const { data, error } = await query;
  if (error) {
    if (error.message === "rate_limited") throw new Error("Bạn thao tác quá nhanh. Chờ một lát rồi thử lại.");
    if (error.code === "23505") throw new Error("Nguồn này đã có trong danh sách.");
    if (error.code === "42501") throw new Error("Bạn không có quyền thực hiện thao tác này.");
    if (error.code === "23514") throw new Error("Dữ liệu chưa hợp lệ. RSS phải là địa chỉ http(s).");
    throw new Error("Không kết nối được máy chủ. Vui lòng thử lại.");
  }
  return data as T;
}

export const news = {
  posts: (limit = 80) =>
    run<NewsPost[]>(
      db().from("news_posts")
        .select("id, url, title, summary, image_url, category, published_at, ai_summary, hidden, source:news_sources(name, kind)")
        .order("published_at", { ascending: false })
        .limit(limit),
    ),
  sources: () => run<NewsSource[]>(db().from("news_sources").select("id, kind, name, url, category, active, last_synced_at, last_error").order("name")),
  addSource: (tenant: string, source: Pick<NewsSource, "kind" | "name" | "url" | "category">) =>
    run(db().from("news_sources").insert({ ...source, tenant_id: tenant })),
  setActive: (id: string, active: boolean) => run(db().from("news_sources").update({ active }).eq("id", id)),
  removeSource: (id: string) => run(db().from("news_sources").delete().eq("id", id)),
  setHidden: (id: string, hidden: boolean) => run(db().from("news_posts").update({ hidden }).eq("id", id)),
  /** Runs the same sync as the hourly job, with the staff member's own session. */
  sync: async (sourceId?: string) => {
    const { data } = await db().auth.getSession();
    if (!data.session) throw new Error("Phiên đăng nhập đã hết hạn.");
    return academicRequest<{ results: SyncResult[] }>("/api/news/sync", data.session.access_token, {
      method: "POST",
      body: JSON.stringify(sourceId ? { sourceId } : {}),
    }).then((body) => body.results);
  },
  /** Tenant of the signed-in staff member, needed when adding a source. */
  tenant: async () => {
    const { data: auth } = await db().auth.getUser();
    const rows = await run<{ tenant_id: string }[]>(db().from("memberships").select("tenant_id").eq("user_id", auth.user?.id ?? ""));
    return rows[0]?.tenant_id ?? null;
  },
};

const relative = new Intl.RelativeTimeFormat("vi", { numeric: "auto" });
const fullDate = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

/** "3 giờ trước" within a week, the date after that. */
export function ago(iso: string, now = Date.now()) {
  const minutes = Math.round((Date.parse(iso) - now) / 60_000);
  if (minutes > -60) return relative.format(Math.min(minutes, 0), "minute");
  if (minutes > -1440) return relative.format(Math.round(minutes / 60), "hour");
  if (minutes > -10080) return relative.format(Math.round(minutes / 1440), "day");
  return fullDate.format(new Date(iso));
}
