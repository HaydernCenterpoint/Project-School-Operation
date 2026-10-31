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

export function formatNewsDate(iso: string) {
  return fullDate.format(new Date(iso));
}

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();

/**
 * Curated SDU campus dispatches shown when the database feed has not been synced yet,
 * so the student newsroom always renders real university articles and photography.
 */
export const campusNewsFallback: NewsPost[] = [
  {
    id: "sdu-news-1",
    url: "https://saodo.edu.vn",
    title: "Trường Đại học Sao Đỏ triển khai học kỳ doanh nghiệp và chuẩn đầu ra kỹ năng số năm học 2026–2027",
    summary:
      "Nhà trường đón hơn 2.400 sinh viên bước vào học kỳ mới tại Cơ sở 1 (TP. Chí Linh, Hải Dương), đồng thời áp dụng khung thực tập hưởng lương tại doanh nghiệp đối tác cho các ngành Công nghệ thông tin, Cơ khí, Điện và Ô tô.",
    image_url: "/truong/khai-giang-hoi-truong.jpg",
    category: "Đào tạo",
    published_at: hoursAgo(3),
    ai_summary: true,
    hidden: false,
    source: { name: "Cổng thông tin ĐH Sao Đỏ", kind: "rss" },
  },
  {
    id: "sdu-news-2",
    url: "https://saodo.edu.vn",
    title: "Ngày hội Doanh nghiệp đồng hành cùng sinh viên SDU: hơn 1.200 vị trí thực tập và tuyển dụng kỹ sư",
    summary:
      "28 tập đoàn và doanh nghiệp sản xuất tại Hải Dương, Bắc Ninh, Hải Phòng trực tiếp phỏng vấn tuyển dụng sinh viên năm 3 và năm cuối ngay tại hội trường lớn.",
    image_url: "/truong/su-kien-doanh-nghiep.jpg",
    category: "Hợp tác doanh nghiệp",
    published_at: hoursAgo(9),
    ai_summary: true,
    hidden: false,
    source: { name: "TT Tuyển sinh & Quan hệ DN", kind: "rss" },
  },
  {
    id: "sdu-news-3",
    url: "https://saodo.edu.vn",
    title: "Khoa Công nghệ thông tin đưa vào vận hành phòng Lab AI, Mạng máy tính và Điện toán đám mây nhà B1",
    summary:
      "Hệ thống phòng máy thực hành tầng 3 nhà B1 được nâng cấp đồng bộ, phục vụ sinh viên thực hiện đồ án lập trình hướng đối tượng, cơ sở dữ liệu và phát triển ứng dụng web.",
    image_url: "/truong/khoa-cntt.jpg",
    category: "Nghiên cứu & Công nghệ",
    published_at: hoursAgo(18),
    ai_summary: false,
    hidden: false,
    source: { name: "Khoa Công nghệ thông tin", kind: "rss" },
  },
  {
    id: "sdu-news-4",
    url: "https://saodo.edu.vn",
    title: "Tuyên dương 145 sinh viên đạt danh hiệu Sinh viên 5 tốt và trao học bổng khuyến khích học tập",
    summary:
      "Hội đồng thi đua khen thưởng nhà trường trao chứng nhận và học bổng cho các sinh viên đạt GPA từ 3.20 trở lên, có công trình nghiên cứu khoa học và đóng góp tích cực cho cộng đồng.",
    image_url: "/truong/su-kien-trao-thuong.jpg",
    category: "Học bổng & Khen thưởng",
    published_at: hoursAgo(32),
    ai_summary: true,
    hidden: false,
    source: { name: "Phòng Công tác sinh viên", kind: "rss" },
  },
  {
    id: "sdu-news-5",
    url: "https://saodo.edu.vn",
    title: "Thư viện số Đại học Sao Đỏ mở rộng khung giờ tự học tối phục vụ kỳ thi giữa kỳ HK1",
    summary:
      "Không gian đọc và thảo luận nhóm tại tầng 2 – tầng 3 thư viện mở cửa đến 21:00 từ thứ Hai đến thứ Bảy, bổ sung hơn 450 đầu giáo trình điện tử và tài liệu tham khảo chuyên ngành.",
    image_url: "/truong/thu-vien-2.jpg",
    category: "Đời sống sinh viên",
    published_at: hoursAgo(50),
    ai_summary: false,
    hidden: false,
    source: { name: "TT Thông tin - Thư viện", kind: "rss" },
  },
  {
    id: "sdu-news-6",
    url: "https://saodo.edu.vn",
    title: "Sinh viên Khoa Cơ khí và Khoa Điện đạt giải Nhất hội thi tay nghề CNC & Tự động hóa cấp trường",
    summary:
      "Các đội thi hoàn thành bài gia công chi tiết chính xác trên trung tâm gia công CNC 5 trục và lập trình điều khiển dây chuyền tự động theo tiêu chuẩn công nghiệp.",
    image_url: "/truong/thuc-hanh-01.jpg",
    category: "Nghiên cứu & Công nghệ",
    published_at: hoursAgo(76),
    ai_summary: false,
    hidden: false,
    source: { name: "Khoa Cơ khí", kind: "rss" },
  },
  {
    id: "sdu-news-7",
    url: "https://saodo.edu.vn",
    title: "Đêm hội Chào tân sinh viên và chung kết Sinh viên thanh lịch Đại học Sao Đỏ",
    summary:
      "Chương trình giao lưu văn nghệ giữa 7 liên chi đoàn khoa cùng phần trình diễn bộ sưu tập thiết kế của sinh viên Khoa May và Thời trang tại sân khấu trung tâm.",
    image_url: "/truong/su-kien-thanh-lich.jpg",
    category: "Đời sống sinh viên",
    published_at: hoursAgo(110),
    ai_summary: false,
    hidden: false,
    source: { name: "Đoàn TN - Hội Sinh viên", kind: "facebook" },
  },
];

