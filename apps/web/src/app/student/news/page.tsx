"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { LikeBurstButton } from "@/components/landing/MotionPromptEffects";
import { DemoBanner, Empty, PageTitle } from "@/components/portal/Parts";
import {
  ago,
  campusNewsFallback,
  formatNewsDate,
  news,
  type AgentFeedResponse,
  type NewsPost,
} from "@/lib/news";
import { useHydratedNow } from "@/lib/portal-demo";
import "@/components/news/news.css";

const TINYFISH_KEY_STORAGE = "sao-do:tinyfish-api-key";

const categoryTone: Record<string, string> = {
  "Đào tạo": "is-edu",
  "Sự kiện": "is-edu",
  "Nghiên cứu & Công nghệ": "is-tech",
  "Hợp tác doanh nghiệp": "is-biz",
  "Học bổng & Khen thưởng": "is-award",
  "Đời sống sinh viên": "is-life",
};

/** Picture of a post; a calm institutional plate when there is none or it fails to load. */
function Cover({ post, eager = false }: { post: NewsPost; eager?: boolean }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="nw-cover">
      {post.image_url && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element -- campus and remote RSS photographs
        <img
          src={post.image_url}
          alt=""
          loading={eager ? "eager" : "lazy"}
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
        />
      ) : (
        <div className="nw-cover-fallback" aria-hidden="true">
          <span className="nw-cover-seal">
            <img src="/sao-do-logo.png" alt="" width={36} height={38} />
          </span>
          <small>{post.source?.name ?? "Trường Đại học Sao Đỏ"}</small>
        </div>
      )}
    </div>
  );
}

function Card({ post, lead = false, now }: { post: NewsPost; lead?: boolean; now: number }) {
  const tone = categoryTone[post.category] ?? "is-edu";
  return (
    <article className={`nw-card${lead ? " is-lead" : ""}`}>
      <Cover post={post} eager={lead} />
      <div className="nw-body">
        <div className="nw-meta">
          <span className={`nw-cat ${tone}`}>
            <i aria-hidden="true" />
            {post.category}
          </span>
          <time dateTime={post.published_at} title={formatNewsDate(post.published_at)} suppressHydrationWarning>
            {lead ? `${ago(post.published_at, now)} · ${formatNewsDate(post.published_at)}` : ago(post.published_at, now)}
          </time>
        </div>
        <h3>
          <a href={post.url} target="_blank" rel="noopener noreferrer" className="nw-link">
            {post.title}
          </a>
        </h3>
        {post.summary && <p className="nw-summary">{post.summary}</p>}
        <footer className="nw-foot">
          <code className="nw-source-tag">
            [{post.source?.name ?? "ĐH Sao Đỏ"}]
          </code>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
            <LikeBurstButton
              initialCount={42 + (post.id.charCodeAt(post.id.length - 1) % 90)}
              storageKey={`sdu-news-like-${post.id}`}
            />
            <span className="nw-read">
              <span>{lead ? "Đọc toàn văn" : "Xem bài gốc"}</span>
              <Icon name="external" />
              <span className="sr-only"> (mở tab mới)</span>
            </span>
          </div>
        </footer>
      </div>
    </article>
  );
}

function mergePosts(primary: NewsPost[], secondary: NewsPost[]): NewsPost[] {
  const seen = new Set<string>();
  const out: NewsPost[] = [];
  for (const post of [...primary, ...secondary]) {
    if (!post.url || seen.has(post.url)) continue;
    seen.add(post.url);
    out.push(post);
  }
  return out.sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));
}

export default function NewsPage() {
  const [now] = useHydratedNow(60_000);
  const [livePosts, setLivePosts] = useState<NewsPost[] | null>(null);
  const [agentMeta, setAgentMeta] = useState<AgentFeedResponse["report"] | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("Tất cả");
  const [source, setSource] = useState("");
  const [query, setQuery] = useState("");

  // TinyFish AI Web Agent console state
  const [agentOpen, setAgentOpen] = useState(false);
  const [syncingAgent, setSyncingAgent] = useState(false);
  const [agentNotice, setAgentNotice] = useState("");
  const [agentError, setAgentError] = useState("");
  const [customUrl, setCustomUrl] = useState("https://saodo.edu.vn/vi/news/Tin-tuc-su-kien/");
  const [customName, setCustomName] = useState("ĐH Sao Đỏ · Tin tức & Sự kiện");
  const [customCategory, setCustomCategory] = useState("Sự kiện");
  const [customGoal, setCustomGoal] = useState(
    "Trích xuất 6 bài viết tin tức hoặc thông báo mới nhất trên trang này kèm tiêu đề, đường dẫn, ảnh đại diện và tóm tắt tiếng Việt",
  );
  const [tinyfishKey, setTinyfishKey] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const savedKey = localStorage.getItem(TINYFISH_KEY_STORAGE);
        if (savedKey) setTinyfishKey(savedKey);
      } catch {
        // Ignore storage errors in private mode.
      }
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const [dbResult, agentResult] = await Promise.allSettled([
        news.posts(),
        news.agentFeed(),
      ]);

      const dbPosts = dbResult.status === "fulfilled" ? dbResult.value : [];
      const agentFeed = agentResult.status === "fulfilled" ? agentResult.value : null;

      if (agentFeed?.report) {
        setAgentMeta(agentFeed.report);
      }

      const combined = mergePosts(dbPosts, agentFeed?.posts ?? []);
      if (combined.length > 0) {
        setLivePosts(combined);
        const onlyDemo = combined.every((p) => p.id.startsWith("sdu-news-"));
        setUsingFallback(onlyDemo);
      } else {
        setLivePosts(campusNewsFallback);
        setUsingFallback(true);
      }
      setError("");
    } catch {
      setLivePosts(campusNewsFallback);
      setUsingFallback(true);
      setError("");
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
    const timer = window.setInterval(
      () => document.visibilityState === "visible" && void load(),
      3 * 60_000,
    );
    return () => window.clearInterval(timer);
  }, [load]);

  async function triggerQuickSync() {
    setSyncingAgent(true);
    setAgentError("");
    setAgentNotice("");
    try {
      const res = await news.runAgent({
        apiKey: tinyfishKey.trim() || undefined,
        preferTinyFish: Boolean(tinyfishKey.trim()),
      });
      setAgentMeta(res.report);
      setLivePosts((current) => mergePosts(res.posts, current ?? campusNewsFallback));
      setUsingFallback(false);
      setAgentNotice(
        `Đã quét ${res.report.sourcesChecked} nguồn (${res.report.engine === "tinyfish" ? "TinyFish Web Agent" : "SDU Live Agent"}) · ${res.report.articlesFound} bài viết trong ${res.report.durationMs} ms`,
      );
    } catch (err) {
      setAgentError(err instanceof Error ? err.message : "Không thể chạy AI Agent lúc này");
    } finally {
      setSyncingAgent(false);
    }
  }

  async function handleCustomAgentSubmit(event: FormEvent) {
    event.preventDefault();
    setSyncingAgent(true);
    setAgentError("");
    setAgentNotice("");
    try {
      if (tinyfishKey.trim()) {
        try {
          localStorage.setItem(TINYFISH_KEY_STORAGE, tinyfishKey.trim());
        } catch {
          // Ignore storage quota errors.
        }
      }
      const res = await news.runAgent({
        url: customUrl.trim(),
        name: customName.trim() || undefined,
        category: customCategory.trim() || "Tin tức",
        goal: customGoal.trim() || undefined,
        apiKey: tinyfishKey.trim() || undefined,
        preferTinyFish: true,
      });
      setAgentMeta(res.report);
      setLivePosts((current) => mergePosts(res.posts, current ?? campusNewsFallback));
      setUsingFallback(false);
      setAgentNotice(
        `Đã quét "${customName || customUrl}" bằng ${res.report.engine === "tinyfish" ? "TinyFish Web Agent" : "SDU Live Agent"} · Thu thập ${res.report.articlesFound} bài (${res.report.durationMs} ms)`,
      );
    } catch (err) {
      setAgentError(err instanceof Error ? err.message : "Không thể quét địa chỉ đã chọn");
    } finally {
      setSyncingAgent(false);
    }
  }

  const posts = livePosts ?? campusNewsFallback;

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const post of posts) {
      counts.set(post.category, (counts.get(post.category) ?? 0) + 1);
    }
    return counts;
  }, [posts]);

  const categories = useMemo(
    () => ["Tất cả", ...Array.from(categoryCounts.keys())],
    [categoryCounts],
  );

  const sources = useMemo(
    () =>
      [
        ...new Set(
          posts.map((post) => post.source?.name).filter(Boolean) as string[],
        ),
      ].sort(),
    [posts],
  );

  const q = query.trim().toLowerCase();
  const isFiltered = category !== "Tất cả" || Boolean(source) || Boolean(q);

  const visible = useMemo(
    () =>
      posts.filter(
        (post) =>
          (category === "Tất cả" || post.category === category) &&
          (!source || post.source?.name === source) &&
          (!q ||
            `${post.title} ${post.summary} ${post.source?.name ?? ""} ${post.category}`
              .toLowerCase()
              .includes(q)),
      ),
    [posts, category, source, q],
  );

  const lead = visible[0];
  const wirePosts = !isFiltered ? visible.slice(1, 4) : [];
  const gridPosts = !isFiltered ? visible.slice(4) : visible.slice(1);

  function resetFilters() {
    setCategory("Tất cả");
    setSource("");
    setQuery("");
  }

  return (
    <div className="nw-page">
      {usingFallback && <DemoBanner />}

      <PageTitle
        title="Bản tin Đại học Sao Đỏ"
        lead="Tin học vụ, hợp tác doanh nghiệp, nghiên cứu khoa học và đời sống sinh viên cập nhật tự động qua AI Web Agent"
      >
        <div className="nw-header-actions">
          <div className="reg-window is-open" role="note">
            <span className="reg-window-dot" aria-hidden="true" />
            <span>
              <strong>{posts.length}</strong> bản tin · <strong>{sources.length}</strong> đơn vị
            </span>
          </div>
          <button
            type="button"
            className="nw-agent-trigger"
            onClick={() => void triggerQuickSync()}
            disabled={syncingAgent}
          >
            <span className={syncingAgent ? "nw-spin" : undefined}>
              <Icon name="retry" />
            </span>
            <span>{syncingAgent ? "Agent đang quét…" : "Quét tin mới"}</span>
          </button>
          <button
            type="button"
            className={`nw-agent-toggle${agentOpen ? " is-active" : ""}`}
            aria-expanded={agentOpen}
            onClick={() => setAgentOpen((open) => !open)}
          >
            <Icon name="news" />
            <span>TinyFish Agent</span>
          </button>
        </div>
      </PageTitle>

      {(agentNotice || agentError) && (
        <div className={`nw-agent-banner${agentError ? " is-error" : ""}`} role="status">
          <span className="nw-agent-banner-dot" aria-hidden="true" />
          <span>{agentError || agentNotice}</span>
        </div>
      )}

      {agentOpen && (
        <section className="nw-agent-panel" aria-label="Cấu hình AI Web Agent (TinyFish)">
          <header className="nw-agent-head">
            <div>
              <span className="reg-label">Kết nối AI Web Agent tự động</span>
              <h3>TinyFish Web Agent (agent.tinyfish.ai) &amp; SDU Live Crawler</h3>
              <p>
                Tự động điều hướng trình duyệt, trích xuất bài viết mới từ cổng <code>saodo.edu.vn</code> và các trang khoa theo mục tiêu ngôn ngữ tự nhiên
              </p>
            </div>
            <div className="nw-agent-status-meta">
              <span className="reg-standing good">
                {agentMeta?.tinyfishConfigured || tinyfishKey.trim()
                  ? "TinyFish API sẵn sàng"
                  : "Chế độ SDU Live Agent"}
              </span>
              {agentMeta?.ranAt && (
                <code suppressHydrationWarning>Lần quét gần nhất: {ago(agentMeta.ranAt, now)}</code>
              )}
            </div>
          </header>

          <form className="nw-agent-form" onSubmit={handleCustomAgentSubmit}>
            <div className="nw-agent-form-grid">
              <label className="nw-agent-field">
                <span>URL trang tin cần quét</span>
                <input
                  type="url"
                  required
                  value={customUrl}
                  onChange={(event) => setCustomUrl(event.target.value)}
                  placeholder="https://saodo.edu.vn/vi/news/Tin-tuc-su-kien/"
                />
              </label>
              <label className="nw-agent-field">
                <span>Tên đơn vị phát hành</span>
                <input
                  type="text"
                  value={customName}
                  onChange={(event) => setCustomName(event.target.value)}
                  placeholder="ĐH Sao Đỏ · Tin tức & Sự kiện"
                />
              </label>
              <label className="nw-agent-field">
                <span>Chuyên mục</span>
                <input
                  type="text"
                  value={customCategory}
                  onChange={(event) => setCustomCategory(event.target.value)}
                  placeholder="Sự kiện"
                />
              </label>
              <label className="nw-agent-field">
                <span>TinyFish API Key (tuỳ chọn nếu máy chủ đã cấu hình)</span>
                <input
                  type="password"
                  value={tinyfishKey}
                  onChange={(event) => setTinyfishKey(event.target.value)}
                  placeholder="tf_live_... (Header X-API-Key)"
                  autoComplete="off"
                />
              </label>
              <label className="nw-agent-field is-wide">
                <span>Mục tiêu trích xuất (Goal gửi tới POST /v1/automation/run)</span>
                <input
                  type="text"
                  value={customGoal}
                  onChange={(event) => setCustomGoal(event.target.value)}
                />
              </label>
            </div>

            <div className="nw-agent-presets">
              <span className="nw-wire-sources-label">Chọn nhanh nguồn ĐH Sao Đỏ:</span>
              <button
                type="button"
                className="nw-source-pill"
                onClick={() => {
                  setCustomUrl("https://saodo.edu.vn/vi/news/Tin-tuc-su-kien/");
                  setCustomName("ĐH Sao Đỏ · Tin tức & Sự kiện");
                  setCustomCategory("Sự kiện");
                }}
              >
                Tin tức & Sự kiện
              </button>
              <button
                type="button"
                className="nw-source-pill"
                onClick={() => {
                  setCustomUrl("https://saodo.edu.vn/vi/news/Thong-bao/");
                  setCustomName("ĐH Sao Đỏ · Thông báo học vụ");
                  setCustomCategory("Đào tạo");
                }}
              >
                Thông báo học vụ
              </button>
              <button
                type="button"
                className="nw-source-pill"
                onClick={() => {
                  setCustomUrl("https://saodo.edu.vn/vi/news/Sinh-vien/");
                  setCustomName("ĐH Sao Đỏ · Công tác sinh viên");
                  setCustomCategory("Đời sống sinh viên");
                }}
              >
                Công tác sinh viên
              </button>
              <button
                type="button"
                className="nw-source-pill"
                onClick={() => {
                  setCustomUrl("http://cntt.saodo.edu.vn/vi/news/rss/");
                  setCustomName("Khoa Công nghệ thông tin");
                  setCustomCategory("Nghiên cứu & Công nghệ");
                }}
              >
                Khoa CNTT
              </button>
            </div>

            <div className="nw-agent-actions">
              <button
                type="submit"
                className="nw-agent-run-btn"
                disabled={syncingAgent}
              >
                <span className={syncingAgent ? "nw-spin" : undefined}>
                  <Icon name="retry" />
                </span>
                <span>{syncingAgent ? "Đang chạy Agent…" : "Chạy AI Agent trên URL này"}</span>
              </button>
              <button
                type="button"
                className="nw-reset-btn"
                onClick={() => void triggerQuickSync()}
                disabled={syncingAgent}
              >
                Quét đồng loạt 6 kênh SDU
              </button>
            </div>
          </form>

          {agentMeta && agentMeta.steps.length > 0 && (
            <div className="nw-agent-steps" aria-label="Nhật ký phiên quét gần nhất">
              <span className="nw-wire-sources-label">
                Nhật ký phiên quét ({agentMeta.durationMs} ms · {agentMeta.articlesFound} bài viết):
              </span>
              <ul className="nw-agent-step-list">
                {agentMeta.steps.map((step) => (
                  <li key={step.source}>
                    <div className="nw-agent-step-head">
                      <strong>{step.source}</strong>
                      <code>{step.engine === "tinyfish" ? "TINYFISH" : "SDU-AGENT"}</code>
                    </div>
                    <span>
                      {step.count} bài viết{step.note ? ` · ${step.note}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="nw-filter-bar" aria-label="Bộ lọc và tìm kiếm bản tin">
        <div className="nw-toolbar">
          <label className="nw-search">
            <Icon name="search" />
            <span className="sr-only">Tìm tin tức</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm tiêu đề, khoa, chủ đề…"
            />
          </label>
          <label className="nw-select">
            <span className="sr-only">Lọc theo đơn vị phát hành</span>
            <select value={source} onChange={(event) => setSource(event.target.value)}>
              <option value="">Mọi đơn vị phát hành ({sources.length})</option>
              {sources.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          {isFiltered && (
            <button type="button" className="nw-reset-btn" onClick={resetFilters}>
              Xoá bộ lọc
            </button>
          )}
        </div>

        <div className="nw-tabs pt-scroll" role="group" aria-label="Lọc theo chuyên mục">
          {categories.map((item) => {
            const count = item === "Tất cả" ? posts.length : (categoryCounts.get(item) ?? 0);
            const active = category === item;
            return (
              <button
                key={item}
                type="button"
                className={`nw-tab${active ? " is-active" : ""}`}
                aria-pressed={active}
                onClick={() => setCategory(item)}
              >
                <span>{item}</span>
                <code>{count}</code>
              </button>
            );
          })}
        </div>
      </section>

      {error ? (
        <div className="notice error" role="alert">
          <Icon name="alert" />
          <div>
            <strong>Không tải được bản tin</strong>
            <p>{error}</p>
          </div>
          <button className="button button-outline button-xs" type="button" onClick={() => void load()}>
            <Icon name="retry" /> Thử lại
          </button>
        </div>
      ) : !lead ? (
        <Empty
          icon="news"
          title="Không có bản tin khớp bộ lọc"
          text="Thử từ khóa khác hoặc chọn lại chuyên mục để xem toàn bộ bản tin nhà trường"
        />
      ) : (
        <>
          {!isFiltered && wirePosts.length > 0 ? (
            <div className="nw-desk">
              <Card post={lead} lead now={now} />

              <aside className="nw-wire-card" aria-label="Điểm tin nhanh từ các đơn vị">
                <header className="nw-wire-head">
                  <div>
                    <span className="reg-label">Điểm tin nhanh</span>
                    <h3>Tin mới từ các Khoa & Phòng ban</h3>
                  </div>
                  <code className="reg-table-meta">{wirePosts.length} tin tiêu điểm</code>
                </header>

                <ul className="nw-wire-list">
                  {wirePosts.map((post) => {
                    const tone = categoryTone[post.category] ?? "is-edu";
                    return (
                      <li key={post.id} className="nw-wire-item">
                        <div className="nw-meta">
                          <span className={`nw-cat ${tone}`}>
                            <i aria-hidden="true" />
                            {post.category}
                          </span>
                          <time dateTime={post.published_at} suppressHydrationWarning>
                            {ago(post.published_at, now)}
                          </time>
                        </div>
                        <a
                          href={post.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="nw-wire-link"
                        >
                          {post.title}
                        </a>
                        <div className="nw-wire-foot">
                          <code>[{post.source?.name ?? "ĐH Sao Đỏ"}]</code>
                          <span>{formatNewsDate(post.published_at)}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <footer className="nw-wire-sources" aria-label="Các nguồn tin đang kết nối">
                  <span className="nw-wire-sources-label">Kênh đồng bộ:</span>
                  <div className="nw-wire-badges">
                    {sources.map((srcName) => (
                      <button
                        key={srcName}
                        type="button"
                        className={`nw-source-pill${source === srcName ? " is-active" : ""}`}
                        onClick={() => setSource((prev) => (prev === srcName ? "" : srcName))}
                      >
                        {srcName}
                      </button>
                    ))}
                  </div>
                </footer>
              </aside>
            </div>
          ) : (
            <div className="nw-filtered-lead">
              <Card post={lead} lead now={now} />
            </div>
          )}

          {gridPosts.length > 0 && (
            <section className="nw-feed-section" aria-label="Danh sách bản tin">
              <header className="nw-section-head">
                <h3>{isFiltered ? "Kết quả lọc bản tin" : "Chuyên mục & Bản tin gần đây"}</h3>
                <span className="reg-table-meta">{gridPosts.length} bài viết</span>
              </header>
              <div className="nw-grid">
                {gridPosts.map((post) => (
                  <Card key={post.id} post={post} now={now} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
