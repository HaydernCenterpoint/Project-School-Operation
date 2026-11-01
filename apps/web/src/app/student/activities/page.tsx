"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { countdown, DemoBanner, PageTitle, Section, StatTile } from "@/components/portal/Parts";
import { activities, clock, conduct, initialActivities, longDay, useDemoState, useHydratedNow } from "@/lib/portal-demo";

export default function ActivitiesPage() {
  const [now] = useHydratedNow();
  const [registered, setRegistered] = useDemoState("activities", () => initialActivities);
  const [category, setCategory] = useState("Tất cả");
  const [status, setStatus] = useState("");
  const list = activities(now).sort((a, b) => a.at.localeCompare(b.at));
  const categories = ["Tất cả", ...new Set(list.map((item) => item.category))];
  const visible = list.filter((item) => category === "Tất cả" || item.category === category);
  const pending = list.filter((item) => registered.includes(item.id)).reduce((sum, item) => sum + item.points, 0);

  function toggle(id: string, title: string) {
    const on = registered.includes(id);
    setRegistered((value) => (on ? value.filter((item) => item !== id) : [...value, id]));
    setStatus(on ? `Đã huỷ đăng ký: ${title}.` : `Đã đăng ký: ${title}.`);
  }

  return (
    <>
      <DemoBanner />
      <PageTitle title="Hoạt động & rèn luyện" lead="Sự kiện của trường, Đoàn - Hội và các khoa. Tham gia để tích luỹ điểm rèn luyện." />

      <div className="pt-stats">
        <StatTile icon="award" label={`Điểm rèn luyện ${conduct.term}`} value={`${conduct.score}/100`} note={`Xếp loại ${conduct.rank}`} tone="good" />
        <StatTile icon="flag" label="Học kỳ này đã có" value={`+${conduct.current} điểm`} note="Từ hoạt động đã điểm danh" />
        <StatTile icon="clock" label="Chờ điểm danh" value={`+${pending} điểm`} note={`${registered.length} hoạt động đã đăng ký`} />
      </div>

      <div className="toolbar">
        <div className="segmented pt-scroll" role="group" aria-label="Lọc theo loại hoạt động">
          {categories.map((item) => (
            <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>

      <Section title="Sắp diễn ra" icon="calendar">
        <ul className="pt-list">
          {visible.map((item) => {
            const on = registered.includes(item.id);
            const left = item.capacity - item.registered - (on ? 1 : 0);
            return (
              <li key={item.id} className={`pt-offer${on ? " is-chosen" : ""}`}>
                <div className="pt-date" aria-hidden="true">
                  <strong>{new Date(item.at).getDate()}</strong>
                  <span>Th {new Date(item.at).getMonth() + 1}</span>
                </div>
                <div>
                  <p className="pt-code">{item.category} · +{item.points} điểm rèn luyện</p>
                  <h4>{item.title}</h4>
                  <p className="pt-meta">
                    <span><Icon name="clock" /> {longDay(item.at)}, {clock(item.at)}</span>
                    <span><Icon name="pin" /> {item.place}</span>
                    <span><Icon name="users" /> {item.organizer}</span>
                  </p>
                </div>
                <div className="pt-offer-side">
                  <span className="chip">{countdown(item.at, now)}</span>
                  <span className={`chip ${left <= 0 ? "overdue" : left <= 10 ? "soon" : ""}`}>{left <= 0 ? "Hết chỗ" : `Còn ${left} chỗ`}</span>
                  <button
                    className={`button button-small ${on ? "button-outline" : "button-primary"}`}
                    type="button"
                    onClick={() => toggle(item.id, item.title)}
                    disabled={!on && left <= 0}
                    aria-pressed={on}
                  >
                    {on ? <><Icon name="check" /> Đã đăng ký</> : "Đăng ký"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </Section>
      <p className="sr-only" role="status" aria-live="polite">{status}</p>
    </>
  );
}
