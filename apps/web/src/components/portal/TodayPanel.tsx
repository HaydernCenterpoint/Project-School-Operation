"use client";

import Link from "next/link";
import { Icon } from "@/components/Icon";
import { countdown, daysUntil } from "@/components/portal/Parts";
import { courseByCode, exams, invoices, money, notices, sessions, sessionTime, useDemoState } from "@/lib/portal-demo";

/** Dashboard hub: what matters today across the portal modules (sample data for now). */
export function TodayPanel({ now }: { now: number }) {
  const [read] = useDemoState<string[]>("notices-read", () => []);
  const today = (new Date(now).getDay() + 6) % 7;
  const classes = sessions.filter((item) => item.day === today).sort((a, b) => a.from - b.from);
  const nextExam = exams(now).find((item) => daysUntil(item.at, now) >= 0);
  const unread = notices(now).filter((item) => !read.includes(item.id)).length;
  const bill = invoices(now)[0]!;
  const owed = Math.max(0, bill.items.reduce((sum, item) => sum + item.amount, 0) - bill.paid);

  return (
    <section className="today" aria-labelledby="today-title">
      <div className="today-main">
        <h3 id="today-title"><Icon name="calendar" /> Lịch học hôm nay</h3>
        {classes.length ? (
          <ul>
            {classes.map((item) => (
              <li key={`${item.course}-${item.from}`}>
                <time>{sessionTime(item)}</time>
                <span>
                  <strong>{courseByCode.get(item.course)!.name}</strong>
                  <small><Icon name="pin" /> {item.room} · {item.kind}</small>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="today-free">Hôm nay bạn không có tiết học nào.</p>
        )}
        <Link href="/student/schedule" className="button button-outline button-xs">
          Xem cả tuần <Icon name="arrow" />
        </Link>
      </div>
      <div className="today-side">
        {nextExam && (
          <Link href="/student/exams" className="today-tile">
            <Icon name="pen" />
            <span>
              <small>Môn thi gần nhất</small>
              <strong>{courseByCode.get(nextExam.course)!.name}</strong>
              <em>{countdown(nextExam.at, now)}</em>
            </span>
          </Link>
        )}
        <Link href="/student/notices" className="today-tile">
          <Icon name="megaphone" />
          <span>
            <small>Thông báo</small>
            <strong>{unread ? `${unread} chưa đọc` : "Đã đọc hết"}</strong>
          </span>
        </Link>
        <Link href="/student/tuition" className="today-tile">
          <Icon name="wallet" />
          <span>
            <small>Học phí {bill.term}</small>
            <strong>{owed ? `Còn nợ ${money(owed)}` : "Đã hoàn thành"}</strong>
            {owed > 0 && <em>Hạn: {countdown(bill.due, now).toLowerCase()}</em>}
          </span>
        </Link>
      </div>
      <p className="today-note">Lịch học, thi, thông báo và học phí đang dùng dữ liệu minh họa.</p>
    </section>
  );
}
