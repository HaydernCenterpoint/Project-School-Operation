"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { DemoBanner, PageTitle } from "@/components/portal/Parts";
import { DayStack, WeekPanel, type Kind, type ScheduleItem } from "@/components/portal/ScheduleDay";
import "@/components/portal/schedule.css";
import { useSlider } from "@/lib/use-slider";
import {
  activities,
  clubs,
  courseByCode,
  exams,
  initialActivities,
  initialClubs,
  periods,
  sessions,
  shortDay,
  useDemoState,
  weekdays,
  weekStart,
} from "@/lib/portal-demo";

/** Calendar entry plus the one-line summary used by the compact week grid. */
type Item = ScheduleItem & { detail: string };

const kinds: { key: Kind; label: string }[] = [
  { key: "class", label: "Lịch học" },
  { key: "exam", label: "Lịch thi" },
  { key: "activity", label: "Hoạt động" },
  { key: "club", label: "Câu lạc bộ" },
];

const day = 86_400_000;

const at = (base: number, time: string) => {
  const date = new Date(base);
  const [hours, minutes] = time.split(":").map(Number);
  date.setHours(hours!, minutes!, 0, 0);
  return date;
};
const hm = (date: Date) => date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

/** Everything on the student's calendar for the week starting `monday`. */
function weekItems(monday: number, now: number, joinedClubs: string[], registered: string[]): Item[] {
  const inWeek = (date: Date) => date.getTime() >= monday && date.getTime() < monday + 7 * day;
  const items: Item[] = [];
  for (const session of sessions) {
    const course = courseByCode.get(session.course)!;
    const base = monday + session.day * day;
    items.push({
      id: `c-${session.course}-${session.day}-${session.from}`,
      kind: "class",
      title: course.name,
      start: at(base, periods[session.from - 1]!.start),
      end: at(base, periods[session.to - 1]!.end),
      place: session.room,
      tag: session.kind,
      periods: `Tiết ${session.from}–${session.to}`,
      person: course.lecturer,
      note: `${course.code} · ${course.credits} tín chỉ`,
      detail: `${session.kind} · Tiết ${session.from}–${session.to} · ${course.lecturer}`,
    });
  }
  for (const exam of exams(now)) {
    const start = new Date(exam.at);
    if (!inWeek(start)) continue;
    items.push({
      id: `e-${exam.course}`,
      kind: "exam",
      title: courseByCode.get(exam.course)!.name,
      start,
      end: new Date(start.getTime() + exam.minutes * 60_000),
      place: exam.room,
      tag: `Thi ${exam.round.toLowerCase()}`,
      note: `${exam.form} · ${exam.seat} · ${exam.minutes} phút`,
      detail: `Thi ${exam.round.toLowerCase()} · ${exam.form} · ${exam.seat}`,
    });
  }
  for (const activity of activities(now)) {
    const start = new Date(activity.at);
    if (!registered.includes(activity.id) || !inWeek(start)) continue;
    items.push({
      id: activity.id,
      kind: "activity",
      title: activity.title,
      start,
      end: new Date(start.getTime() + 2 * 3600_000),
      place: activity.place,
      tag: activity.category,
      person: activity.organizer,
      personLabel: "Đơn vị tổ chức",
      note: `+${activity.points} điểm rèn luyện`,
      detail: `${activity.organizer} · +${activity.points} điểm rèn luyện`,
    });
  }
  for (const club of clubs) {
    if (!joinedClubs.includes(club.id)) continue;
    const start = at(monday + club.day * day, club.time);
    items.push({
      id: `k-${club.id}`,
      kind: "club",
      title: club.name,
      start,
      end: new Date(start.getTime() + 90 * 60_000),
      place: club.place,
      tag: "Sinh hoạt CLB",
      note: `${club.category} · sinh hoạt định kỳ hằng tuần`,
      detail: "Sinh hoạt định kỳ",
    });
  }
  return items.sort((a, b) => a.start.getTime() - b.start.getTime());
}

// ---------- Time grid ----------

/** Visible hours and pixels per hour of the week grid. */
const firstHour = 7;
const lastHour = 21;
const hourPx = 64;

/** Day parts drawn as quiet bands behind the grid (school periods 1-5 and 6-10, lunch, evening). */
const dayParts = [
  { key: "morning", label: "Sáng", from: "07:00", to: periods[4]!.end },
  { key: "lunch", label: "Nghỉ trưa", from: periods[4]!.end, to: periods[5]!.start },
  { key: "afternoon", label: "Chiều", from: periods[5]!.start, to: periods[9]!.end },
  { key: "evening", label: "Tối", from: "18:00", to: "21:00" },
] as const;

const hoursOf = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours! + minutes! / 60;
};
const offsetOf = (date: Date) => (date.getHours() + date.getMinutes() / 60 - firstHour) * hourPx;

/** Side-by-side lanes for overlapping items of one day. */
function layout(dayItems: Item[]) {
  const placed: { item: Item; lane: number; lanes: number }[] = [];
  let cluster: typeof placed = [];
  let clusterEnd = 0;
  const closeCluster = () => {
    const lanes = Math.max(1, ...cluster.map((entry) => entry.lane + 1));
    for (const entry of cluster) entry.lanes = lanes;
    cluster = [];
  };
  for (const item of dayItems) {
    if (cluster.length && item.start.getTime() >= clusterEnd) closeCluster();
    const taken = new Set(cluster.filter((entry) => entry.item.end.getTime() > item.start.getTime()).map((entry) => entry.lane));
    let lane = 0;
    while (taken.has(lane)) lane += 1;
    const entry = { item, lane, lanes: 1 };
    cluster.push(entry);
    placed.push(entry);
    clusterEnd = Math.max(clusterEnd, item.end.getTime());
  }
  closeCluster();
  return placed;
}

const dayName = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export default function SchedulePage() {
  const [now, setNow] = useState(Date.now);
  const [offset, setOffset] = useState(0);
  const [shown, setShown] = useState<Kind[]>(kinds.map((item) => item.key));
  const [picked, setPicked] = useState<number | null>(null);
  const [view, setView] = useState<"day" | "week">("day");
  const [joinedClubs] = useDemoState("clubs", () => initialClubs);
  const [registered] = useDemoState("activities", () => initialActivities);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const monday = weekStart(now) + offset * 7 * day;
  const todayIndex = offset === 0 ? (new Date(now).getDay() + 6) % 7 : -1;
  const all = weekItems(monday, now, joinedClubs, registered);
  const items = all.filter((item) => shown.includes(item.kind));
  const counts = Object.fromEntries(kinds.map((kind) => [kind.key, all.filter((item) => item.kind === kind.key).length]));
  const byDay = weekdays.map((_, index) => items.filter((item) => (item.start.getDay() + 6) % 7 === index));
  const selected = picked ?? (todayIndex >= 0 ? todayIndex : 0);
  const { attach: stripRef, style: pillStyle, ready: pillReady } = useSlider<HTMLDivElement>(`${selected}|${offset}`, '[aria-selected="true"]');
  const nowTop = offsetOf(new Date(now));
  const nowVisible = todayIndex >= 0 && nowTop >= 0 && nowTop <= (lastHour - firstHour) * hourPx;
  const moveWeek = (next: number) => {
    setOffset(next);
    setPicked(null);
  };

  const weekLabel = offset === 0 ? "Tuần hiện tại" : offset > 0 ? `Sau ${offset} tuần` : `Trước ${-offset} tuần`;
  const summaryParts = [
    weekLabel,
    `${counts.class} buổi học`,
    counts.exam ? `${counts.exam} lịch thi` : "",
    counts.activity ? `${counts.activity} hoạt động` : "",
    counts.club ? `${counts.club} sinh hoạt CLB` : "",
  ].filter(Boolean);

  const card = (item: Item, style?: React.CSSProperties & { height?: number }) => {
    const size = style?.height === undefined ? "" : style.height < 70 ? " is-xs" : style.height < 140 ? " is-sm" : "";
    return (
      <article
        key={item.id}
        className={`sch-ev k-${item.kind}${size}`}
        style={style}
        tabIndex={style ? 0 : undefined}
        aria-label={`${item.title}, ${hm(item.start)} đến ${hm(item.end)}, ${item.place}. ${item.detail}`}
      >
        <time>
          <i className="sd-dot" aria-hidden="true" />
          {hm(item.start)} – {hm(item.end)}
          <span className="sch-ev-room"> · {item.place}</span>
        </time>
        <h4>{item.title}</h4>
        <p className="sch-ev-place">{item.place}</p>
        <p className="sch-ev-detail">{item.detail}</p>
      </article>
    );
  };

  return (
    <div className="sch">
      <DemoBanner />
      <PageTitle
        title={`${shortDay(monday)} – ${shortDay(monday + 6 * day)}`}
        lead={summaryParts.join(" · ")}
      >
        <div className="sch-nav" role="group" aria-label="Chọn tuần">
          <button type="button" aria-label="Tuần trước" onClick={() => moveWeek(offset - 1)}>
            <Icon name="back" />
          </button>
          <button type="button" className="sch-today" onClick={() => moveWeek(0)} disabled={offset === 0}>
            Hôm nay
          </button>
          <button type="button" aria-label="Tuần sau" onClick={() => moveWeek(offset + 1)}>
            <Icon name="arrow" />
          </button>
        </div>
      </PageTitle>

      {/* Toolbar: Week strip, category filters, and view switcher */}
      <div className="sch-bar">
        <div className="sch-bar-top">
          <div className="sch-filters" role="group" aria-label="Loại lịch">
            {kinds.map((kind) => (
              <button
                key={kind.key}
                type="button"
                className={`k-${kind.key}`}
                aria-pressed={shown.includes(kind.key)}
                onClick={() => setShown((value) => (value.includes(kind.key) ? value.filter((key) => key !== kind.key) : [...value, kind.key]))}
              >
                <i className="sd-dot" aria-hidden="true" />
                <span>{kind.label}</span>
                <code>{counts[kind.key]}</code>
              </button>
            ))}
          </div>
          <div className="sch-views asg-tabs" role="group" aria-label="Kiểu xem">
            <button type="button" aria-pressed={view === "day"} onClick={() => setView("day")}>Theo ngày</button>
            <button type="button" aria-pressed={view === "week"} onClick={() => setView("week")}>Theo tuần</button>
          </div>
        </div>

        <div className="sch-strip" role="tablist" aria-label="Chọn ngày trong tuần" ref={stripRef}>
          <span className={`sch-pill${pillReady ? " is-ready" : ""}`} style={pillStyle} aria-hidden="true" />
          {weekdays.map((name, index) => {
            const kindsOfDay = [...new Set(byDay[index]!.map((item) => item.kind))];
            return (
              <button
                key={name}
                type="button"
                role="tab"
                aria-selected={index === selected}
                aria-label={`${name} ${shortDay(monday + index * day)}, ${byDay[index]!.length} mục`}
                className={`${index === todayIndex ? "is-today" : ""}${index >= 5 ? " is-weekend" : ""}`}
                onClick={() => {
                  setPicked(index);
                  setView("day");
                }}
              >
                <span>{dayName[index]}</span>
                <strong>{new Date(monday + index * day).getDate()}</strong>
                <em aria-hidden="true">
                  {kindsOfDay.map((kind) => <i key={kind} className={`k-${kind}`} />)}
                </em>
              </button>
            );
          })}
        </div>
      </div>

      {view === "day" && (
        <div className="sch-day-layout">
          <DayStack
            key={monday}
            days={byDay.map((dayItems, index) => ({ date: new Date(monday + index * day), items: dayItems }))}
            selected={selected}
            now={now}
          />
          <WeekPanel week={items} byDay={byDay} selected={selected} todayIndex={todayIndex} now={now} onPick={setPicked} />
        </div>
      )}

      {view === "week" && (
        <div className="sch-board">
          <div className="sch-scroll">
            <div className="sch-grid" style={{ "--hours": lastHour - firstHour, "--hour": `${hourPx}px` } as React.CSSProperties}>
              <div className="sch-corner" />
              {weekdays.map((name, index) => (
                <div key={name} className={`sch-head${index === todayIndex ? " is-today" : ""}${index >= 5 ? " is-weekend" : ""}`}>
                  <span>{dayName[index]}</span>
                  <strong>{new Date(monday + index * day).getDate()}</strong>
                  {index === todayIndex && <em>Hôm nay</em>}
                </div>
              ))}
              <div className="sch-axis">
                {Array.from({ length: lastHour - firstHour + 1 }, (_, hour) => (
                  <span key={hour} style={{ top: hour * hourPx }}>{String(firstHour + hour).padStart(2, "0")}:00</span>
                ))}
              </div>
              <div className="sch-body">
                {dayParts.map((part) => (
                  <span
                    key={part.key}
                    className={`sch-part p-${part.key}`}
                    style={{ top: (hoursOf(part.from) - firstHour) * hourPx, height: (hoursOf(part.to) - hoursOf(part.from)) * hourPx }}
                  />
                ))}
                {byDay.map((dayItems, index) => (
                  <div key={index} className={`sch-col${index === todayIndex ? " is-today" : ""}`} style={{ gridColumn: index + 1 }}>
                    {layout(dayItems).map(({ item, lane, lanes }) => {
                      const height = Math.max(40, ((item.end.getTime() - item.start.getTime()) / 3_600_000) * hourPx - 4);
                      return card(item, {
                        top: offsetOf(item.start),
                        height,
                        "--min": `${height}px`,
                        left: `calc(${(lane / lanes) * 100}% + 4px)`,
                        width: `calc(${100 / lanes}% - 8px)`,
                      } as React.CSSProperties & { height: number });
                    })}
                    {index === todayIndex && nowVisible && <span className="sch-now" style={{ top: nowTop }} aria-hidden="true" />}
                    {!dayItems.length && <p className="sch-free">Trống lịch</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
