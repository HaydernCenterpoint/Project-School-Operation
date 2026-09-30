"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { Empty, PageTitle } from "@/components/portal/Parts";
import { ago, news, type NewsPost } from "@/lib/news";
import "@/components/news/news.css";

/** Picture of a post; a calm placeholder when there is none or it fails to load. */
function Cover({ post, eager = false }: { post: NewsPost; eager?: boolean }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="nw-cover">
      {post.image_url && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote images from school sites, sizes unknown
        <img src={post.image_url} alt="" loading={eager ? "eager" : "lazy"} referrerPolicy="no-referrer" onError={() => setBroken(true)} />
      ) : (
        <span className="nw-cover-empty" aria-hidden="true"><Icon name="news" /></span>
      )}
    </div>
  );
}

function Card({ post, lead = false, index = 0 }: { post: NewsPost; lead?: boolean; index?: number }) {
  return (
    <article className={`nw-card${lead ? " is-lead" : ""}`} style={{ "--i": Math.min(index, 14) } as React.CSSProperties}>
      <Cover post={post} eager={lead} />
      <div className="nw-body">
        <p className="nw-meta">
          <span className="chip">{post.category}</span>
          <span>{post.source?.name}</span>
          <time dateTime={post.published_at}>{ago(post.published_at)}</time>
        </p>
        <h3>
          <a href={post.url} target="_blank" rel="noopener noreferrer" className="nw-link">{post.title}</a>
        </h3>
        {post.summary && <p className="nw-summary">{post.summary}</p>}
        <p className="nw-foot">
          {post.ai_summary && <span className="nw-ai" title="Đoạn tóm tắt do AI viết từ bài gốc"><Icon name="sparkle" /> Tóm tắt bởi AI</span>}
          <span className="nw-read">Đọc bài gốc <Icon name="external" /><span className="sr-only"> (mở tab mới)</span></span>
        </p>
      </div>
    </article>
  );
}

export default function NewsPage() {
  const [posts, setPosts] = useState<NewsPost[] | null>(null);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("Tất cả");
  const [source, setSource] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      setPosts(await news.posts());
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không tải được tin tức.");
    }
  }, []);
  useEffect(() => {
    queueMicrotask(() => void load());
    // New posts arrive from the hourly sync; refresh while the page stays open.
    const timer = window.setInterval(() => document.visibilityState === "visible" && void load(), 5 * 60_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const categories = ["Tất cả", ...new Set((posts ?? []).map((post) => post.category))];
  const sources = [...new Set((posts ?? []).map((post) => post.source?.name).filter(Boolean) as string[])].sort();
  const q = query.trim().toLowerCase();
  const visible = (posts ?? []).filter((post) =>
    (category === "Tất cả" || post.category === category)
    && (!source || post.source?.name === source)
    && (!q || `${post.title} ${post.summary}`.toLowerCase().includes(q)));
  const [lead, ...rest] = visible;

  return (
    <div className="nw-page">
      <PageTitle title="Tin tức" lead="Tin mới từ website trường, các khoa và fanpage Đại học Sao Đỏ, tự động cập nhật mỗi giờ." />

      <div className="nw-toolbar">
        <label className="nw-search">
          <Icon name="search" />
          <span className="sr-only">Tìm tin tức</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tin tức…" />
        </label>
        <label className="nw-select">
          <span className="sr-only">Lọc theo nguồn</span>
          <select value={source} onChange={(event) => setSource(event.target.value)}>
            <option value="">Mọi nguồn</option>
            {sources.map((name) => <option key={name}>{name}</option>)}
          </select>
        </label>
      </div>
      <div className="segmented pt-scroll nw-tabs" role="group" aria-label="Lọc theo chủ đề">
        {categories.map((item) => (
          <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>
        ))}
      </div>

      {error ? (
        <div className="notice error" role="alert">
          <Icon name="alert" />
          <div><strong>Không tải được tin tức</strong><p>{error}</p></div>
          <button className="button button-outline button-xs" type="button" onClick={() => void load()}><Icon name="retry" /> Thử lại</button>
        </div>
      ) : !posts ? (
        <div aria-busy="true">
          <span className="sr-only">Đang tải tin tức…</span>
          <div className="skeleton" style={{ height: 300, marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 260 }} />
        </div>
      ) : !lead ? (
        <Empty icon="news" title={posts.length ? "Không có tin khớp bộ lọc" : "Chưa có tin tức"} text={posts.length ? "Thử bỏ bớt bộ lọc." : "Tin mới sẽ xuất hiện sau lần cập nhật tới."} />
      ) : (
        <div key={`${category}|${source}|${q}`}>
          <Card post={lead} lead />
          {rest.length > 0 && (
            <div className="nw-grid">
              {rest.map((post, index) => <Card key={post.id} post={post} index={index + 1} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
