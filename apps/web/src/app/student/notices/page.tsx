"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { countdown, DemoBanner, PageTitle } from "@/components/portal/Parts";
import { clock, longDay, notices, useDemoState } from "@/lib/portal-demo";

const categories = ["Tất cả", "Đào tạo", "Công tác sinh viên", "Tài chính", "Hoạt động"] as const;

export default function NoticesPage() {
  const [now] = useState(Date.now);
  const [read, setRead] = useDemoState<string[]>("notices-read", () => []);
  const [category, setCategory] = useState<(typeof categories)[number]>("Tất cả");
  const list = notices(now);
  const visible = list.filter((item) => category === "Tất cả" || item.category === category);
  const unread = list.filter((item) => !read.includes(item.id)).length;

  return (
    <>
      <DemoBanner />
      <PageTitle title="Thông báo" lead={unread ? `Bạn có ${unread} thông báo chưa đọc.` : "Bạn đã đọc hết thông báo."}>
        {unread > 0 && (
          <button className="button button-outline button-small" type="button" onClick={() => setRead(list.map((item) => item.id))}>
            <Icon name="check" /> Đánh dấu đã đọc tất cả
          </button>
        )}
      </PageTitle>

      <div className="toolbar">
        <div className="segmented pt-scroll" role="group" aria-label="Lọc thông báo">
          {categories.map((item) => (
            <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>

      <ul className="pt-notices">
        {visible.map((item) => {
          const isRead = read.includes(item.id);
          return (
            <li key={item.id} className={isRead ? "" : "is-unread"}>
              <details
                onToggle={(event) => {
                  if ((event.currentTarget as HTMLDetailsElement).open && !isRead) setRead((value) => [...value, item.id]);
                }}
              >
                <summary>
                  <span className="pt-notice-icon" aria-hidden="true"><Icon name="megaphone" /></span>
                  <span className="pt-notice-head">
                    <strong>
                      {!isRead && <span className="sr-only">Chưa đọc: </span>}
                      {item.title}
                    </strong>
                    <small>{item.from} · {countdown(item.at, now)}</small>
                  </span>
                  <span className="pt-notice-tags">
                    {item.important && <span className="chip overdue">Quan trọng</span>}
                    <span className="chip">{item.category}</span>
                  </span>
                </summary>
                <div className="pt-notice-body">
                  <p>{item.body}</p>
                  <p className="pt-muted">Đăng lúc {clock(item.at)}, {longDay(item.at)}</p>
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </>
  );
}
