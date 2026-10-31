"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { DemoBanner, Empty, PageTitle } from "@/components/portal/Parts";
import { ago, campusNewsFallback, formatNewsDate, news, type NewsPost } from "@/lib/news";
import "@/components/news/news.css";

const categoryTone: Record<string, string> = {
  "Đào tạo": "is-edu",
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
          <span className="nw-cover-seal">SDU</span>
          <small>{post.source?.name ?? "Trường Đại học Sao Đỏ"}</small>
        </div>
      )}
    </div>
  );
}

function Card({ post, lead = false }: { post: NewsPost; lead?: boolean }) {
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
          <time dateTime={post.published_at} title={formatNewsDate(post.published_at)}>
            {lead ? `${ago(post.published_at)} · ${formatNewsDate(post.published_at)}` : ago(post.published_at)}
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
          <span className="nw-read">
            <span>{lead ? "Đọc toàn văn" : "Xem bài gốc"}</span>
            <Icon name="external" />
            <span className="sr-only"> (mở tab mới)</span>
          </span>
        </footer>
      </div>
    </article>
  );
}

export default function NewsPage() {
  const [livePosts, setLivePosts] = useState<NewsPost[] | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("Tất cả");
  const [source, setSource] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      const fetched = await news.posts();
      if (fetched.length > 0) {
        setLivePosts(fetched);
        setUsingFallback(false);
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
      5 * 60_000,
    );
    return () => window.clearInterval(timer);
  }, [load]);

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
        lead="Tin học vụ, hợp tác doanh nghiệp, nghiên cứu khoa học và đời sống sinh viên từ các đơn vị trong trường"
      >
        <div className="reg-window is-open" role="note">
          <span className="reg-window-dot" aria-hidden="true" />
          <span>
            <strong>{posts.length}</strong> bản tin · <strong>{sources.length}</strong> đơn vị phát hành
          </span>
        </div>
      </PageTitle>

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
              <Card post={lead} lead />

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
                          <time dateTime={post.published_at}>{ago(post.published_at)}</time>
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
              <Card post={lead} lead />
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
                  <Card key={post.id} post={post} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
