"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { DemoBanner, Empty, PageTitle, Section } from "@/components/portal/Parts";
import { clubs, initialClubs, useDemoState, weekdays } from "@/lib/portal-demo";

export default function ClubsPage() {
  const [joined, setJoined] = useDemoState("clubs", () => initialClubs);
  const [category, setCategory] = useState("Tất cả");
  const [status, setStatus] = useState("");
  const categories = ["Tất cả", ...new Set(clubs.map((club) => club.category))];
  const mine = clubs.filter((club) => joined.includes(club.id));
  const visible = clubs.filter((club) => category === "Tất cả" || club.category === category);

  function toggle(id: string, name: string) {
    const on = joined.includes(id);
    if (on && !window.confirm(`Rời ${name}?`)) return;
    setJoined((value) => (on ? value.filter((item) => item !== id) : [...value, id]));
    setStatus(on ? `Đã rời ${name}.` : `Đã gửi yêu cầu tham gia ${name}.`);
  }

  return (
    <>
      <DemoBanner />
      <PageTitle title="Câu lạc bộ" lead="Tham gia câu lạc bộ để học hỏi, kết bạn và được cộng điểm rèn luyện. Lịch sinh hoạt tự thêm vào Lịch của tôi." />

      <Section title={`Câu lạc bộ của tôi (${mine.length})`} icon="users">
        {mine.length ? (
          <ul className="pt-mini-list">
            {mine.map((club) => (
              <li key={club.id}>
                <strong>{club.name}</strong>
                <span><Icon name="calendar" /> {weekdays[club.day]}, {club.time}</span>
                <span><Icon name="pin" /> {club.place}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty icon="users" title="Bạn chưa tham gia câu lạc bộ nào" text="Chọn một câu lạc bộ bên dưới để bắt đầu." />
        )}
      </Section>

      <div className="toolbar">
        <div className="segmented pt-scroll" role="group" aria-label="Lọc theo lĩnh vực">
          {categories.map((item) => (
            <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-club-grid">
        {visible.map((club, index) => {
          const on = joined.includes(club.id);
          return (
            <article key={club.id} className={`pt-club tone-${index % 6}`}>
              <div className="pt-club-mark" aria-hidden="true">{club.name.replace("CLB ", "").slice(0, 1)}</div>
              <p className="pt-code">{club.category}</p>
              <h4>{club.name}</h4>
              <p>{club.about}</p>
              <p className="pt-meta">
                <span><Icon name="users" /> {club.members + (on ? 1 : 0)} thành viên</span>
                <span><Icon name="calendar" /> {weekdays[club.day]}, {club.time}</span>
              </p>
              <button
                className={`button button-small ${on ? "button-outline" : "button-primary"}`}
                type="button"
                onClick={() => toggle(club.id, club.name)}
                aria-pressed={on}
              >
                {on ? <><Icon name="check" /> Đã tham gia</> : "Tham gia"}
              </button>
            </article>
          );
        })}
      </div>
      <p className="sr-only" role="status" aria-live="polite">{status}</p>
    </>
  );
}
