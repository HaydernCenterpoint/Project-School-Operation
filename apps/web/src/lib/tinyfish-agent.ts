// TinyFish AI Web Agent connector (https://agent.tinyfish.ai) + live Đại học Sao Đỏ
// multi-source crawler. Supports:
// 1. TinyFish Web Agent API (`POST https://agent.tinyfish.ai/v1/automation/run` & `/run-sse`)
//    for natural-language browser navigation and structured JSON extraction on any web page.
// 2. Direct live SDU RSS + OpenGraph/HTML extraction across `saodo.edu.vn` and faculty portals
//    when `TINYFISH_API_KEY` is not yet set, so continuous news updates work out of the box.

import { aiConfig, streamCompletion } from "./ai-provider";
import {
  absoluteUrl,
  decodeEntities,
  extractArticle,
  fallbackSummary,
  htmlToText,
  isPublicHttpUrl,
  parseRss,
  realImage,
} from "./news-parse";
import type { NewsPost } from "./news";

export type AgentSourcePreset = {
  id: string;
  name: string;
  url: string;
  pageUrl: string;
  category: string;
  kind: "rss" | "facebook";
};

/** Official Đại học Sao Đỏ public feeds & portals monitored by the AI Agent. */
export const SDU_AGENT_SOURCES: AgentSourcePreset[] = [
  {
    id: "sdu-events",
    name: "ĐH Sao Đỏ · Tin tức & Sự kiện",
    url: "https://saodo.edu.vn/vi/news/rss/tin-tuc-su-kien/",
    pageUrl: "https://saodo.edu.vn/vi/news/Tin-tuc-su-kien/",
    category: "Sự kiện",
    kind: "rss",
  },
  {
    id: "sdu-notices",
    name: "ĐH Sao Đỏ · Thông báo học vụ",
    url: "https://saodo.edu.vn/vi/news/rss/thong-bao/",
    pageUrl: "https://saodo.edu.vn/vi/news/Thong-bao/",
    category: "Đào tạo",
    kind: "rss",
  },
  {
    id: "sdu-students",
    name: "ĐH Sao Đỏ · Công tác sinh viên",
    url: "https://saodo.edu.vn/vi/news/rss/sinh-vien/",
    pageUrl: "https://saodo.edu.vn/vi/news/Sinh-vien/",
    category: "Đời sống sinh viên",
    kind: "rss",
  },
  {
    id: "sdu-training",
    name: "ĐH Sao Đỏ · Hoạt động đào tạo",
    url: "https://saodo.edu.vn/vi/news/rss/hoat-dong-dao-tao/",
    pageUrl: "https://saodo.edu.vn/vi/news/Hoat-dong-dao-tao/",
    category: "Đào tạo",
    kind: "rss",
  },
  {
    id: "sdu-research",
    name: "ĐH Sao Đỏ · Khoa học & Hợp tác",
    url: "https://saodo.edu.vn/vi/news/rss/nghien-cuu-kh-hop-tac-qt/",
    pageUrl: "https://saodo.edu.vn/vi/news/Nghien-cuu-KH-Hop-tac-QT/",
    category: "Nghiên cứu & Công nghệ",
    kind: "rss",
  },
  {
    id: "sdu-cntt",
    name: "Khoa Công nghệ thông tin",
    url: "http://cntt.saodo.edu.vn/vi/news/rss/",
    pageUrl: "http://cntt.saodo.edu.vn/",
    category: "Nghiên cứu & Công nghệ",
    kind: "rss",
  },
];

export type TinyFishArticle = {
  url: string;
  title: string;
  summary: string;
  image_url: string | null;
  category?: string;
  published_at: string | null;
  source_name?: string;
};

export type AgentRunReport = {
  engine: "tinyfish" | "sdu-live-agent";
  tinyfishConfigured: boolean;
  ranAt: string;
  durationMs: number;
  sourcesChecked: number;
  articlesFound: number;
  steps: { source: string; engine: "tinyfish" | "sdu-live-agent"; count: number; note?: string }[];
  posts: NewsPost[];
};

const TINYFISH_ENDPOINT =
  process.env.TINYFISH_API_URL?.replace(/\/+$/, "") || "https://agent.tinyfish.ai";

export const DEFAULT_TINYFISH_GOAL =
  "Extract the latest 6 university news articles or announcements from this page. " +
  "Return ONLY valid JSON with shape {\"articles\": [{\"title\": string, \"url\": string, \"summary\": string, \"image_url\": string | null, \"published_at\": string | null, \"category\": string}]}. " +
  "Keep titles and summaries in Vietnamese.";

/** Stable hash ID for a post URL so deduplication is deterministic across sync runs. */
function hashUrlId(url: string): string {
  let h1 = 0xdeadbeef ^ url.length;
  let h2 = 0x41c6ce57 ^ url.length;
  for (let i = 0; i < url.length; i++) {
    const ch = url.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `tf-${(h2 >>> 0).toString(16).padStart(8, "0")}${(h1 >>> 0).toString(16).padStart(8, "0")}`;
}

function normalizeIsoDate(raw: string | null | undefined): string {
  if (!raw) return new Date().toISOString();
  const trimmed = raw.trim();
  // Support Vietnamese dd/mm/yyyy or dd-mm-yyyy dates often found on NukeViet pages.
  const vnMatch = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?/.exec(trimmed);
  if (vnMatch) {
    const [, dd, mm, yyyy, hh = "08", min = "00"] = vnMatch;
    const iso = `${yyyy}-${mm!.padStart(2, "0")}-${dd!.padStart(2, "0")}T${hh.padStart(2, "0")}:${min}:00+07:00`;
    const parsed = Date.parse(iso);
    if (!Number.isNaN(parsed)) return new Date(Math.min(parsed, Date.now())).toISOString();
  }
  const time = Date.parse(trimmed);
  if (!Number.isNaN(time)) return new Date(Math.min(time, Date.now())).toISOString();
  return new Date().toISOString();
}

/** Extracts JSON array/object from a TinyFish agent result payload (object, JSON string, or markdown fence). */
function parseTinyFishArticles(payload: unknown, baseUrl: string): TinyFishArticle[] {
  if (!payload) return [];

  let candidate: unknown = payload;
  if (typeof candidate === "object" && candidate !== null) {
    const record = candidate as Record<string, unknown>;
    if ("result" in record && record.result !== undefined) candidate = record.result;
    else if ("data" in record && record.data !== undefined) candidate = record.data;
    else if ("output" in record && record.output !== undefined) candidate = record.output;
  }

  if (typeof candidate === "string") {
    const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(candidate)?.[1] ?? candidate;
    const jsonMatch = /(\{[\s\S]*\}|\[[\s\S]*\])/.exec(fenced);
    if (jsonMatch) {
      try {
        candidate = JSON.parse(jsonMatch[1]!);
      } catch {
        return [];
      }
    }
  }

  let list: unknown[] = [];
  if (Array.isArray(candidate)) {
    list = candidate;
  } else if (typeof candidate === "object" && candidate !== null) {
    const obj = candidate as Record<string, unknown>;
    if (Array.isArray(obj.articles)) list = obj.articles;
    else if (Array.isArray(obj.items)) list = obj.items;
    else if (Array.isArray(obj.posts)) list = obj.posts;
    else if (Array.isArray(obj.results)) list = obj.results;
  }

  const out: TinyFishArticle[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const title = typeof item.title === "string" ? htmlToText(item.title).trim() : "";
    const rawUrl =
      typeof item.url === "string"
        ? item.url
        : typeof item.link === "string"
          ? item.link
          : "";
    const url = absoluteUrl(rawUrl, baseUrl);
    if (!title || !url || !isPublicHttpUrl(url)) continue;

    const summary =
      typeof item.summary === "string"
        ? htmlToText(item.summary).slice(0, 600)
        : typeof item.description === "string"
          ? htmlToText(item.description).slice(0, 600)
          : "";
    const rawImage =
      typeof item.image_url === "string"
        ? item.image_url
        : typeof item.image === "string"
          ? item.image
          : null;
    const image_url = realImage(absoluteUrl(rawImage, url));
    const published_at =
      typeof item.published_at === "string"
        ? item.published_at
        : typeof item.date === "string"
          ? item.date
          : null;
    const category = typeof item.category === "string" ? item.category.trim() : undefined;

    out.push({ url, title, summary, image_url, published_at, category });
  }
  return out;
}

/**
 * Calls TinyFish Web Agent (`POST https://agent.tinyfish.ai/v1/automation/run`).
 * Also supports SSE responses if the endpoint streams `data: {...}` lines.
 */
export async function runTinyFishAgent(options: {
  url: string;
  goal?: string;
  apiKey?: string;
  timeoutMs?: number;
}): Promise<TinyFishArticle[]> {
  const apiKey = (options.apiKey || process.env.TINYFISH_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("Chưa cấu hình TINYFISH_API_KEY.");
  }
  if (!isPublicHttpUrl(options.url)) {
    throw new Error("Địa chỉ URL cần quét phải là http(s) công khai.");
  }

  const response = await fetch(`${TINYFISH_ENDPOINT}/v1/automation/run`, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      url: options.url,
      goal: options.goal?.trim() || DEFAULT_TINYFISH_GOAL,
    }),
    signal: AbortSignal.timeout(options.timeoutMs ?? 45_000),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`TinyFish Agent trả về mã ${response.status}${errText ? `: ${errText.slice(0, 140)}` : ""}`);
  }

  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();

  if (contentType.includes("text/event-stream") || rawText.startsWith("data:")) {
    let lastResult: unknown = null;
    for (const line of rawText.split(/\r?\n/)) {
      if (!line.startsWith("data:")) continue;
      const dataStr = line.slice(5).trim();
      if (!dataStr || dataStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(dataStr) as Record<string, unknown>;
        if (parsed.resultJson || parsed.result || parsed.data || parsed.articles) {
          lastResult = parsed.resultJson ?? parsed.result ?? parsed.data ?? parsed;
        }
      } catch {
        // Ignore partial SSE lines.
      }
    }
    return parseTinyFishArticles(lastResult, options.url);
  }

  try {
    const json = JSON.parse(rawText) as unknown;
    return parseTinyFishArticles(json, options.url);
  } catch {
    return parseTinyFishArticles(rawText, options.url);
  }
}

/** Extracts article links directly from an HTML news listing page when RSS is absent. */
export function extractHtmlListingArticles(html: string, pageUrl: string): TinyFishArticle[] {
  const seen = new Set<string>();
  const items: TinyFishArticle[] = [];

  // Match anchor tags that look like NukeViet or university article links.
  const anchorRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(anchorRegex)) {
    const href = match[1] ?? "";
    const inner = match[2] ?? "";
    const url = absoluteUrl(href, pageUrl);
    if (!url || seen.has(url) || !isPublicHttpUrl(url)) continue;
    // Skip navigation/category links; keep article links (usually ending with -<id>.html or /news/slug).
    if (!/(\/news\/[^/]+\/[^/]+|-\d+\.html?$)/i.test(url)) continue;
    const title = htmlToText(inner).replace(/\s+/g, " ").trim();
    if (title.length < 24 || title.length > 260) continue;
    seen.add(url);
    items.push({
      url,
      title: decodeEntities(title),
      summary: "",
      image_url: null,
      published_at: null,
    });
    if (items.length >= 6) break;
  }
  return items;
}

async function fetchPublicText(url: string, timeoutMs = 10_000): Promise<string> {
  if (!isPublicHttpUrl(url)) throw new Error("Địa chỉ nguồn không hợp lệ.");
  const response = await fetch(url, {
    headers: {
      "user-agent": "SaoDoPortal-TinyFishAgent/1.0 (+https://saodo.edu.vn)",
      accept: "application/rss+xml, application/xml, text/html;q=0.9, */*;q=0.5",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const text = await response.text();
  return text.slice(0, 2_000_000);
}

async function maybeAiSummarize(title: string, text: string): Promise<string | null> {
  const config = aiConfig();
  if (!config || text.length < 180) return null;
  let out = "";
  try {
    await streamCompletion(
      { ...config, maxOutputTokens: 260 },
      "Tóm tắt bản tin Trường Đại học Sao Đỏ cho sinh viên trong 2 câu tiếng Việt trung lập, tối đa 55 từ. Không mở đầu bằng 'Bài viết'.",
      [{ role: "user", content: `Tiêu đề: ${title}\n\nNội dung:\n${text.slice(0, 4500)}` }],
      (delta) => {
        out += delta;
      },
      AbortSignal.timeout(12_000),
    );
  } catch {
    return null;
  }
  const clean = out.replace(/\s+/g, " ").trim();
  return clean.length >= 25 ? clean.slice(0, 600) : null;
}

/** Crawls a single preset or custom source using TinyFish (if key available) or Live SDU crawler. */
export async function crawlNewsSource(options: {
  source: AgentSourcePreset;
  goal?: string;
  apiKey?: string;
  preferTinyFish?: boolean;
  maxItems?: number;
}): Promise<{ posts: NewsPost[]; engine: "tinyfish" | "sdu-live-agent"; note?: string }> {
  const { source, goal, apiKey, preferTinyFish = false, maxItems = 4 } = options;
  const effectiveKey = (apiKey || process.env.TINYFISH_API_KEY || "").trim();

  // 1. If TinyFish is explicitly requested or configured for a page crawl, run TinyFish Web Agent.
  if (effectiveKey && (preferTinyFish || !source.url.includes("/rss"))) {
    try {
      const targetUrl = source.pageUrl || source.url;
      const extracted = await runTinyFishAgent({
        url: targetUrl,
        goal,
        apiKey: effectiveKey,
        timeoutMs: 35_000,
      });
      if (extracted.length > 0) {
        const posts: NewsPost[] = extracted.slice(0, maxItems).map((item) => ({
          id: hashUrlId(item.url),
          url: item.url,
          title: item.title,
          summary: item.summary || `Bản tin tổng hợp tự động từ ${source.name}`,
          image_url: item.image_url,
          category: item.category || source.category,
          published_at: normalizeIsoDate(item.published_at),
          ai_summary: true,
          hidden: false,
          source: { name: source.name, kind: source.kind },
        }));
        return { posts, engine: "tinyfish", note: `TinyFish Agent đã trích xuất ${posts.length} bài` };
      }
    } catch (err) {
      // Fall through to direct SDU RSS/HTML extraction if TinyFish times out or quota is reached.
      const msg = err instanceof Error ? err.message : "TinyFish fallback";
      return crawlDirectSduSource(source, maxItems, `Chuyển sang bộ quét trực tiếp (${msg})`);
    }
  }

  return crawlDirectSduSource(source, maxItems);
}

async function crawlDirectSduSource(
  source: AgentSourcePreset,
  maxItems: number,
  fallbackNote?: string,
): Promise<{ posts: NewsPost[]; engine: "sdu-live-agent"; note?: string }> {
  const raw = await fetchPublicText(source.url, 10_000);
  const rssItems = parseRss(raw, source.url);

  const candidates: TinyFishArticle[] =
    rssItems.length > 0
      ? rssItems.slice(0, maxItems)
      : extractHtmlListingArticles(raw, source.pageUrl || source.url).slice(0, maxItems);

  const enriched = await Promise.all(
    candidates.map(async (item) => {
      let summary = item.summary;
      let image_url = item.image_url;
      let ai_summary = false;

      if ((!summary || !image_url) && isPublicHttpUrl(item.url)) {
        try {
          const articleHtml = await fetchPublicText(item.url, 7_000);
          const parsed = extractArticle(articleHtml, item.url);
          image_url = parsed.image_url ?? image_url;
          const aiText = await maybeAiSummarize(item.title, parsed.text || parsed.lead);
          if (aiText) {
            summary = aiText;
            ai_summary = true;
          } else {
            summary = fallbackSummary(parsed.lead, parsed.text) || summary;
          }
        } catch {
          // Keep RSS summary & thumbnail when the article page is slow.
        }
      }

      return {
        id: hashUrlId(item.url),
        url: item.url,
        title: item.title,
        summary: summary || `Tin mới từ ${source.name}`,
        image_url,
        category: item.category || source.category,
        published_at: normalizeIsoDate(item.published_at),
        ai_summary,
        hidden: false,
        source: { name: source.name, kind: source.kind },
      } satisfies NewsPost;
    }),
  );

  return {
    posts: enriched,
    engine: "sdu-live-agent",
    note: fallbackNote ?? `Đã đồng bộ ${enriched.length} bài từ ${source.name}`,
  };
}

/**
 * Runs a multi-source crawl across the official Đại học Sao Đỏ feeds (or a custom URL + goal)
 * and returns deduplicated, newest-first `NewsPost[]` along with an execution report.
 */
export async function runCampusNewsAgent(options?: {
  customUrl?: string;
  customName?: string;
  customCategory?: string;
  goal?: string;
  apiKey?: string;
  preferTinyFish?: boolean;
}): Promise<AgentRunReport> {
  const started = Date.now();
  const effectiveKey = (options?.apiKey || process.env.TINYFISH_API_KEY || "").trim();
  const hasKey = Boolean(effectiveKey);

  const targets: AgentSourcePreset[] = options?.customUrl
    ? [
        {
          id: "custom-agent-target",
          name: options.customName?.trim() || new URL(options.customUrl).hostname,
          url: options.customUrl.trim(),
          pageUrl: options.customUrl.trim(),
          category: options.customCategory?.trim() || "Tin tức",
          kind: "rss",
        },
      ]
    : SDU_AGENT_SOURCES;

  const steps: AgentRunReport["steps"] = [];
  const allPosts: NewsPost[] = [];
  const seenUrls = new Set<string>();

  const settled = await Promise.allSettled(
    targets.map((source) =>
      crawlNewsSource({
        source,
        goal: options?.goal,
        apiKey: effectiveKey,
        preferTinyFish: Boolean(options?.preferTinyFish || options?.customUrl),
        maxItems: options?.customUrl ? 6 : 3,
      }),
    ),
  );

  let usedTinyFish = false;
  settled.forEach((result, idx) => {
    const src = targets[idx]!;
    if (result.status === "fulfilled") {
      if (result.value.engine === "tinyfish") usedTinyFish = true;
      steps.push({
        source: src.name,
        engine: result.value.engine,
        count: result.value.posts.length,
        note: result.value.note,
      });
      for (const post of result.value.posts) {
        if (!seenUrls.has(post.url)) {
          seenUrls.add(post.url);
          allPosts.push(post);
        }
      }
    } else {
      const msg = result.reason instanceof Error ? result.reason.message : "Không phản hồi";
      steps.push({
        source: src.name,
        engine: hasKey ? "tinyfish" : "sdu-live-agent",
        count: 0,
        note: `Lỗi: ${msg}`,
      });
    }
  });

  allPosts.sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));

  return {
    engine: usedTinyFish ? "tinyfish" : "sdu-live-agent",
    tinyfishConfigured: hasKey,
    ranAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    sourcesChecked: targets.length,
    articlesFound: allPosts.length,
    steps,
    posts: allPosts,
  };
}
