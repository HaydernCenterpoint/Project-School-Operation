"use client";

import { Icon } from "@/components/Icon";

export type Kind = "class" | "exam" | "activity" | "club";

/** One calendar entry with the details a student needs at a glance. */
export type ScheduleItem = {
  id: string;
  kind: Kind;
  title: string;
  start: Date;
  end: Date;
  place: string;
  /** "Lý thuyết", "Thực hành", "Thi giữa kỳ", activity category… */
  tag: string;
  /** "Tiết 1–3" for classes. */
  periods?: string;
  /** Lecturer or organiser. */
  person?: string;
  personLabel?: string;
  /** Course code and credits, exam seat, activity points… */
  note?: string;
};

const parts = [
  { key: "morning", label: "Buổi sáng", short: "Sáng", test: (hour: number) => hour < 12 },
  { key: "afternoon", label: "Buổi chiều", short: "Chiều", test: (hour: number) => hour >= 12 && hour < 18 },
  { key: "evening", label: "Buổi tối", short: "Tối", test: (hour: number) => hour >= 18 },
] as const;

const hm = (date: Date) => date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

export function duration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return hours ? `${hours} giờ${rest ? ` ${rest} phút` : ""}` : `${rest} phút`;
}

/** Live state of an item relative to now. */
function statusOf(item: ScheduleItem, now: number) {
  const start = item.start.getTime();
  const end = item.end.getTime();
  if (now >= end) return { key: "done", text: "Đã kết thúc" } as const;
  if (now >= start) {
    return { key: "live", text: `Đang diễn ra · còn ${duration((end - now) / 60_000)}`, progress: (now - start) / (end - start) } as const;
  }
  const minutes = (start - now) / 60_000;
  if (minutes < 24 * 60 && new Date(start).toDateString() === new Date(now).toDateString()) {
    return { key: "soon", text: `Bắt đầu sau ${duration(Math.max(1, minutes))}` } as const;
  }
  return { key: "later", text: "" } as const;
}

function ItemCard({ item, now, order }: { item: ScheduleItem; now: number; order: number }) {
  const status = statusOf(item, now);
  const minutes = (item.end.getTime() - item.start.getTime()) / 60_000;
  return (
    <li className={`sd-row k-${item.kind} is-${status.key}`} style={{ "--i": order } as React.CSSProperties}>
      <div className="sd-time">
        <strong>{hm(item.start)}</strong>
        <span>{hm(item.end)}</span>
        <small>{duration(minutes)}</small>
      </div>
      <span className="sd-rail" aria-hidden="true"><i /></span>
      <article className="sd-card" aria-label={`${item.title}, ${hm(item.start)} đến ${hm(item.end)}`}>
        <header>
          <span className="sd-tag">
            <i className="sd-dot" aria-hidden="true" />
            {item.tag}
          </span>
          {item.periods && <code className="sd-periods">{item.periods} · {item.place}</code>}
          {!item.periods && <code className="sd-periods">{item.place}</code>}
          {status.key !== "later" && <span className={`sd-status s-${status.key}`}>{status.text}</span>}
        </header>
        <h3>{item.title}</h3>
        <dl className="sd-meta">
          <div>
            <dt>Phòng học</dt>
            <dd className="is-mono">{item.place}</dd>
          </div>
          {item.person && (
            <div>
              <dt>{item.personLabel ?? "Giảng viên"}</dt>
              <dd>{item.person}</dd>
            </div>
          )}
          {item.note && (
            <div>
              <dt>Học phần</dt>
              <dd className="is-mono">{item.note}</dd>
            </div>
          )}
        </dl>
        {status.key === "live" && (
          <div className="sd-progress" role="progressbar" aria-label="Tiến độ buổi học" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(status.progress * 100)}>
            <span style={{ width: `${status.progress * 100}%` }} />
          </div>
        )}
      </article>
    </li>
  );
}

/**
 * All seven days share one grid cell, so the frame is as tall as the busiest day and never
 * changes size when the selection moves.
 */
export function DayStack({ days, selected, now }: { days: { date: Date; items: ScheduleItem[] }[]; selected: number; now: number }) {
  return (
    <div className="sd-stack">
      {days.map((day, index) => (
        <div
          key={index}
          className={`sd-pane ${index === selected ? "is-active" : index < selected ? "is-before" : "is-after"}`}
          aria-hidden={index !== selected}
          inert={index !== selected}
        >
          <DayAgenda date={day.date} items={day.items} now={now} />
        </div>
      ))}
    </div>
  );
}

/** One day as a timeline grouped by part of day, with the free time between items. */
function DayAgenda({ date, items, now }: { date: Date; items: ScheduleItem[]; now: number }) {
  const busy = items.length ? `${hm(items[0]!.start)} – ${hm(items.at(-1)!.end)}` : "";
  const classes = items.filter((item) => item.kind === "class").length;
  return (
    <section className="sd-day" aria-label={date.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" })}>
      <header className="sd-day-head">
        <h2>{date.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" })}</h2>
        <p>
          {items.length
            ? `${classes ? `${classes} buổi học` : ""}${classes && items.length > classes ? " · " : ""}${items.length > classes ? `${items.length - classes} lịch khác` : ""} · khung giờ ${busy}`
            : "Không có lịch trong ngày"}
        </p>
      </header>
      {items.length ? (
        parts.map((part) => {
          const partItems = items.filter((item) => part.test(item.start.getHours()));
          if (!partItems.length) return null;
          return (
            <div key={part.key} className={`sd-part p-${part.key}`}>
              <h3 className="sd-part-title">{part.label}</h3>
              <ol className="sd-list">
                {partItems.map((item, index) => {
                  const previous = partItems[index - 1];
                  const gap = previous ? (item.start.getTime() - previous.end.getTime()) / 60_000 : 0;
                  return [
                    gap >= 15 && (
                      <li key={`gap-${item.id}`} className="sd-gap">
                        <span>Khoảng trống {duration(gap)}</span>
                      </li>
                    ),
                    <ItemCard key={item.id} item={item} now={now} order={items.indexOf(item)} />,
                  ];
                })}
              </ol>
            </div>
          );
        })
      ) : (
        <div className="sd-empty">
          <Icon name="calendar" />
          <strong>Ngày trống lịch</strong>
          <p>Tranh thủ ôn bài, tự học tại thư viện hoặc tham gia câu lạc bộ</p>
        </div>
      )}
    </section>
  );
}

/** Side panel: what's next, and a week heat map (days × parts of day) to jump between days. */
export function WeekPanel({
  week,
  byDay,
  selected,
  todayIndex,
  now,
  onPick,
}: {
  week: ScheduleItem[];
  byDay: ScheduleItem[][];
  selected: number;
  todayIndex: number;
  now: number;
  onPick: (index: number) => void;
}) {
  const next = week.find((item) => item.end.getTime() > now) ?? week[0];
  const nextStatus = next ? statusOf(next, now) : null;
  const names = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  return (
    <aside className="sd-side">
      {next && (
        <section className={`sd-next k-${next.kind}`}>
          <div className="sd-next-head">
            <span className="sd-next-label">
              <i className="sd-dot" aria-hidden="true" />
              {nextStatus?.key === "live" ? "Đang diễn ra" : next.end.getTime() > now ? "Buổi sắp tới" : "Đầu tuần"}
            </span>
            {next.periods && <code className="sd-next-code">{next.periods}</code>}
          </div>
          <h3>{next.title}</h3>
          <p className="sd-next-meta">
            <span>{next.start.toLocaleDateString("vi-VN", { weekday: "long" })}</span>
            <span>·</span>
            <code>{hm(next.start)} – {hm(next.end)}</code>
            <span>·</span>
            <code>{next.place}</code>
          </p>
          {nextStatus && nextStatus.key !== "later" && nextStatus.key !== "done" && (
            <p className="sd-next-status">{nextStatus.text}</p>
          )}
        </section>
      )}
      <section className="sd-heat">
        <div className="sd-heat-head">
          <h3>Mật độ tuần</h3>
          <code>{week.length} mục</code>
        </div>
        <div className="sd-heat-grid" role="grid" aria-label="Mức độ bận theo ngày và buổi">
          <span />
          {names.map((name, index) => (
            <span key={name} className={`sd-heat-day${index === todayIndex ? " is-today" : ""}`}>{name}</span>
          ))}
          {parts.map((part) => [
            <span key={`${part.key}-label`} className="sd-heat-part">{part.short}</span>,
            ...byDay.map((dayItems, index) => {
              const count = dayItems.filter((item) => part.test(item.start.getHours())).length;
              return (
                <button
                  key={`${part.key}-${index}`}
                  type="button"
                  className={`sd-heat-cell l-${Math.min(count, 3)}${index === selected ? " is-selected" : ""}`}
                  aria-label={`${names[index]}, ${part.label.toLowerCase()}: ${count} mục`}
                  onClick={() => onPick(index)}
                >
                  {count || ""}
                </button>
              );
            }),
          ])}
        </div>
        <p className="sd-heat-legend">
          <span><i className="l-0" /> Trống</span>
          <span><i className="l-1" /> 1 buổi</span>
          <span><i className="l-2" /> 2+ buổi</span>
        </p>
      </section>
    </aside>
  );
}
