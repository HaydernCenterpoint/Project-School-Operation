import { apiError, json } from "@/lib/academic-api";
import { campusNewsFallback, type NewsPost } from "@/lib/news";
import { isPublicHttpUrl } from "@/lib/news-parse";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import {
  DEFAULT_TINYFISH_GOAL,
  runCampusNewsAgent,
  SDU_AGENT_SOURCES,
  type AgentRunReport,
} from "@/lib/tinyfish-agent";

type CachedFeedState = {
  updatedAt: number;
  report: AgentRunReport | null;
  posts: NewsPost[];
};

const CACHE_TTL_MS = 10 * 60_000; // 10 minutes automatic refresh window

const globalCache = globalThis as unknown as {
  __sduNewsAgentCache?: CachedFeedState;
};

function getCache(): CachedFeedState {
  if (!globalCache.__sduNewsAgentCache) {
    globalCache.__sduNewsAgentCache = {
      updatedAt: 0,
      report: null,
      posts: [],
    };
  }
  return globalCache.__sduNewsAgentCache;
}

function mergePosts(primary: NewsPost[], secondary: NewsPost[]): NewsPost[] {
  const seen = new Set<string>();
  const out: NewsPost[] = [];
  for (const post of [...primary, ...secondary]) {
    if (!post.url || seen.has(post.url)) continue;
    seen.add(post.url);
    out.push(post);
  }
  return out.sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at)).slice(0, 60);
}

/**
 * GET /api/news/agent
 * Returns the live AI Agent news feed + status metadata. Automatically crawls SDU feeds
 * (and TinyFish when TINYFISH_API_KEY is set) if the cache is older than 10 minutes.
 */
export async function GET() {
  const state = getCache();
  const isStale = Date.now() - state.updatedAt > CACHE_TTL_MS || state.posts.length === 0;

  if (isStale) {
    try {
      const report = await runCampusNewsAgent();
      state.report = report;
      state.posts =
        report.posts.length > 0
          ? mergePosts(report.posts, state.posts)
          : mergePosts(state.posts, campusNewsFallback);
      state.updatedAt = Date.now();
    } catch {
      if (state.posts.length === 0) {
        state.posts = campusNewsFallback;
      }
    }
  }

  return json({
    posts: state.posts.length > 0 ? state.posts : campusNewsFallback,
    report: state.report ?? {
      engine: process.env.TINYFISH_API_KEY ? "tinyfish" : "sdu-live-agent",
      tinyfishConfigured: Boolean(process.env.TINYFISH_API_KEY),
      ranAt: new Date(state.updatedAt || Date.now()).toISOString(),
      durationMs: 0,
      sourcesChecked: SDU_AGENT_SOURCES.length,
      articlesFound: state.posts.length,
      steps: [],
      posts: state.posts,
    },
    sources: SDU_AGENT_SOURCES,
    defaultGoal: DEFAULT_TINYFISH_GOAL,
  });
}

/**
 * POST /api/news/agent
 * Triggers an immediate AI Agent crawl (TinyFish Web Agent or SDU multi-source crawler).
 * Accepts optional `{ url, name, category, goal, apiKey, preferTinyFish }`.
 */
export async function POST(request: Request) {
  const limited = await rateLimit("ip", clientIp(request));
  if (limited) return limited;

  const body = (await request.json().catch(() => ({}))) as {
    url?: unknown;
    name?: unknown;
    category?: unknown;
    goal?: unknown;
    apiKey?: unknown;
    preferTinyFish?: unknown;
  };

  const customUrl = typeof body.url === "string" && body.url.trim() ? body.url.trim() : undefined;
  if (customUrl && !isPublicHttpUrl(customUrl)) {
    return apiError(400, "invalid_url", "Địa chỉ URL cần quét phải là http(s) công khai");
  }

  const customName = typeof body.name === "string" ? body.name.trim().slice(0, 80) : undefined;
  const customCategory =
    typeof body.category === "string" ? body.category.trim().slice(0, 40) : undefined;
  const goal = typeof body.goal === "string" ? body.goal.trim().slice(0, 800) : undefined;
  const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim().slice(0, 240) : undefined;
  const preferTinyFish = Boolean(body.preferTinyFish);

  const report = await runCampusNewsAgent({
    customUrl,
    customName,
    customCategory,
    goal,
    apiKey,
    preferTinyFish,
  });

  const state = getCache();
  state.report = report;
  if (report.posts.length > 0) {
    state.posts = mergePosts(report.posts, state.posts);
  } else if (state.posts.length === 0) {
    state.posts = campusNewsFallback;
  }
  state.updatedAt = Date.now();

  return json({
    posts: state.posts,
    report,
    sources: SDU_AGENT_SOURCES,
  });
}
