"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useStaff } from "@/components/admin/StaffContext";
import { Icon } from "@/components/Icon";
import { PageTitle, Section } from "@/components/portal/Parts";
import { ago, news, type NewsPost, type NewsSource, type SyncResult } from "@/lib/news";
import "@/components/news/news.css";

const blank = { kind: "rss" as NewsSource["kind"], name: "", url: "", category: "Tin tức" };

export default function ManageNews() {
  const { role } = useStaff();
  const [sources, setSources] = useState<NewsSource[] | null>(null);
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState<string | "all" | null>(null);
  const [results, setResults] = useState<SyncResult[] | null>(null);
  const [form, setForm] = useState(blank);
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    try {
      const [list, feed] = await Promise.all([news.sources(), news.posts(40)]);
      setSources(list);
      setPosts(feed);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không tải được dữ liệu.");
    }
  }, []);
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  if (role === "teacher") {
    return <p className="notice" role="status"><Icon name="info" /> Chỉ phòng ban và quản trị viên quản lý tin tức.</p>;
  }

  async function sync(sourceId?: string) {
    setSyncing(sourceId ?? "all");
    setError("");
    try {
      const done = await news.sync(sourceId);
      setResults(done);
      const added = done.reduce((sum, item) => sum + item.added, 0);
      setStatus(`Đã cập nhật ${done.length} nguồn, ${added} bài mới.`);
      await load();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Không cập nhật được.");
    } finally {
      setSyncing(null);
    }
  }

  async function act(run: () => Promise<unknown>, message: string) {
    try {
      await run();
      setStatus(message);
      await load();
    } catch (actError) {
      setError(actError instanceof Error ? actError.message : "Không thực hiện được.");
    }
  }

  async function add(event: FormEvent) {
    event.preventDefault();
    const url = form.url.trim();
    if (form.kind === "rss" && !/^https?:\/\/\S+$/i.test(url)) return setError("Địa chỉ RSS phải bắt đầu bằng http:// hoặc https://");
    if (form.kind === "facebook" && !/^[\w.-]{3,80}$/.test(url)) return setError("Facebook: nhập tên hoặc ID trang, ví dụ TruongDHSaoDo");
    const tenant = await news.tenant();
    if (!tenant) return setError("Không xác định được cơ sở của bạn.");
    await act(async () => {
      await news.addSource(tenant, { ...form, name: form.name.trim(), url, category: form.category.trim() || "Tin tức" });
      setForm(blank);
    }, `Đã thêm nguồn ${form.name.trim()}.`);
  }

  const failing = sources?.filter((item) => item.active && item.last_error).length ?? 0;
  return (
    <div className="ad-page">
      <PageTitle title="Tin tức" lead="Bài mới được lấy tự động mỗi giờ từ các nguồn dưới đây, AI tóm tắt rồi đăng ngay cho sinh viên. Ẩn bài nếu có sai sót.">
        <button className="button button-primary button-small" type="button" onClick={() => void sync()} disabled={syncing !== null}>
          <span className={syncing === "all" ? "nw-spin" : undefined}><Icon name="retry" /></span> {syncing === "all" ? "Đang cập nhật…" : "Cập nhật ngay"}
        </button>
      </PageTitle>

      {error && <p className="notice error" role="alert"><Icon name="alert" /> {error}</p>}
      {results && (
        <ul className="nw-results" aria-label="Kết quả cập nhật">
          {results.map((item) => (
            <li key={item.source} className={item.error ? "is-bad" : item.added ? "is-new" : undefined}>
              <strong>{item.name}</strong>
              <span>{item.error ?? (item.added ? `+${item.added} bài mới` : "Không có bài mới")}</span>
            </li>
          ))}
        </ul>
      )}

      <Section title={`Nguồn tin (${sources?.length ?? 0})`} icon="list" action={failing ? <span className="chip danger">{failing} nguồn đang lỗi</span> : undefined}>
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead><tr><th scope="col">Nguồn</th><th scope="col">Loại</th><th scope="col">Chủ đề</th><th scope="col">Lần lấy gần nhất</th><th scope="col">Bật</th><th scope="col"><span className="sr-only">Thao tác</span></th></tr></thead>
            <tbody>
              {(sources ?? []).map((item, index) => (
                <tr key={item.id} style={{ "--i": Math.min(index, 20) } as React.CSSProperties}>
                  <td className="ad-name">{item.name}<small className="nw-url">{item.url}</small></td>
                  <td><span className={`chip ${item.kind === "facebook" ? "submitted" : "success"}`}>{item.kind === "facebook" ? "Facebook" : "RSS"}</span></td>
                  <td>{item.category}</td>
                  <td>
                    {item.last_synced_at ? ago(item.last_synced_at) : "Chưa lấy"}
                    {item.last_error && <small className="ad-bad nw-error">{item.last_error}</small>}
                  </td>
                  <td>
                    <label className="nw-switch">
                      <input type="checkbox" checked={item.active} onChange={(event) => void act(() => news.setActive(item.id, event.target.checked), `${event.target.checked ? "Đã bật" : "Đã tạm dừng"} ${item.name}.`)} />
                      <span aria-hidden="true" />
                      <span className="sr-only">Bật nguồn {item.name}</span>
                    </label>
                  </td>
                  <td className="ad-actions">
                    <button className="button button-quiet button-xs" type="button" disabled={syncing !== null || !item.active} onClick={() => void sync(item.id)} aria-label={`Lấy tin ngay từ ${item.name}`}>
                      <span className={syncing === item.id ? "nw-spin" : undefined}><Icon name="retry" /></span> <span>Lấy ngay</span>
                    </button>
                    <button className="button button-quiet button-xs" type="button" onClick={() => window.confirm(`Xoá nguồn ${item.name}? Các bài đã lấy từ nguồn này cũng bị xoá.`) && void act(() => news.removeSource(item.id), `Đã xoá ${item.name}.`)} aria-label={`Xoá nguồn ${item.name}`}>
                      <Icon name="trash" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form className="lp-form nw-add" onSubmit={add}>
          <div className="form-heading"><h3>Thêm nguồn</h3><p className="pt-muted">RSS của website hoặc tên trang Facebook (cần FACEBOOK_PAGE_ACCESS_TOKEN trên máy chủ).</p></div>
          <label className="field">
            Loại
            <select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as NewsSource["kind"] })}>
              <option value="rss">RSS / website</option>
              <option value="facebook">Trang Facebook</option>
            </select>
          </label>
          <label className="field">
            Tên hiển thị
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required minLength={2} maxLength={80} placeholder="Khoa Công nghệ thông tin" />
          </label>
          <label className="field">
            {form.kind === "rss" ? "Địa chỉ RSS" : "Tên hoặc ID trang"}
            <input value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} required maxLength={500}
              placeholder={form.kind === "rss" ? "https://saodo.edu.vn/vi/news/rss/thong-bao/" : "TruongDHSaoDo"} />
          </label>
          <label className="field">
            Chủ đề
            <input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} maxLength={40} />
          </label>
          <div className="pt-form-actions"><button className="button button-primary" type="submit"><Icon name="plus" /> Thêm nguồn</button></div>
        </form>
      </Section>

      <Section title="Bài gần đây" icon="news">
        <ul className="nw-admin-posts">
          {posts.map((post, index) => (
            <li key={post.id} className={post.hidden ? "is-hidden" : undefined} style={{ "--i": Math.min(index, 20) } as React.CSSProperties}>
              <div>
                <a href={post.url} target="_blank" rel="noopener noreferrer">{post.title}<span className="sr-only"> (mở tab mới)</span></a>
                <small>
                  {post.source?.name} · {ago(post.published_at)} · {post.category}
                  {post.ai_summary && <> · <Icon name="sparkle" /> AI</>}
                  {post.hidden && <> · <strong>Đã ẩn</strong></>}
                </small>
              </div>
              <button className="button button-outline button-xs" type="button" onClick={() => void act(() => news.setHidden(post.id, !post.hidden), post.hidden ? "Đã hiện lại bài." : "Đã ẩn bài.")}>
                <Icon name={post.hidden ? "eye" : "eyeOff"} /> {post.hidden ? "Hiện lại" : "Ẩn"}
              </button>
            </li>
          ))}
          {!posts.length && <li className="pt-muted">Chưa có bài nào. Bấm “Cập nhật ngay” để lấy tin lần đầu.</li>}
        </ul>
      </Section>
      <p className="sr-only" role="status" aria-live="polite">{status}</p>
    </div>
  );
}
