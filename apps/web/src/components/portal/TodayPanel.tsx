"use client";

import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { countdown, daysUntil } from "@/components/portal/Parts";
import { initials } from "@/lib/format";
import {
  courseByCode,
  courses,
  curriculumSemesters,
  exams,
  gpa,
  invoices,
  letter,
  money,
  notices,
  profile,
  program,
  sessions,
  sessionTime,
  standing,
  terms,
  total,
  useDemoState,
} from "@/lib/portal-demo";
import { useStudent } from "@/lib/student-context";

const quickActions: { href: Route; label: string; icon: IconName }[] = [
  { href: "/student/grades", label: "Kết quả học tập", icon: "award" },
  { href: "/student/activities", label: "Kết quả rèn luyện", icon: "flag" },
  { href: "/student/schedule", label: "Lịch theo tuần", icon: "calendar" },
  { href: "/student/schedule-progress" as Route, label: "Lịch theo tiến độ", icon: "clock" },
  { href: "/student/tuition", label: "Tra cứu công nợ", icon: "wallet" },
  { href: "/student/tuition#thanh-toan" as Route, label: "Thanh toán trực tuyến", icon: "checkCircle" },
  { href: "/student/receipts" as Route, label: "Phiếu thu trực tuyến", icon: "file" },
];

/** Dashboard hub: what matters today across the portal modules (sample data for now). */
export function TodayPanel({ now }: { now: number }) {
  const { account, avatarUrl } = useStudent();
  const [read] = useDemoState<string[]>("notices-read", () => []);
  const [gradeTermIdx, setGradeTermIdx] = useState(0);
  const [courseSemIdx, setCourseSemIdx] = useState(2);

  const today = (new Date(now).getDay() + 6) % 7;
  const classes = sessions.filter((item) => item.day === today).sort((a, b) => a.from - b.from);
  const nextExam = exams(now).find((item) => daysUntil(item.at, now) >= 0);
  const unread = notices(now).filter((item) => !read.includes(item.id)).length;
  const bill = invoices(now)[0]!;
  const owed = Math.max(0, bill.items.reduce((sum, item) => sum + item.amount, 0) - bill.paid);

  const pickPersonal = (label: string) => profile.personal.find((f) => f.label === label)?.value ?? "-";
  const pickEdu = (label: string) => profile.education.find((f) => f.label === label)?.value ?? "-";

  const allCurrCourses = curriculumSemesters.flatMap((s) => s.courses);
  const earnedCredits =
    allCurrCourses.filter((c) => c.status === "passed").reduce((sum, c) => sum + c.credits, 0) +
    courses.reduce((sum, c) => sum + c.credits, 0);
  const totalProgramCredits = program.requiredCredits;
  const creditPct = Math.min(100, Math.round((earnedCredits / totalProgramCredits) * 100));

  const selectedTerm = terms[gradeTermIdx] ?? terms[0]!;
  const selectedTermGpa = gpa(selectedTerm.rows);
  const selectedCurrSem = curriculumSemesters[courseSemIdx] ?? curriculumSemesters[0]!;

  const ringRadius = 56;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - creditPct / 100);

  return (
    <>
      <section className="sdu-dash-top" aria-label="Thông tin sinh viên và nhắc nhở trong tuần">
        <article className="sdu-profile-box">
          <header className="sdu-box-head">
            <h3>Thông tin sinh viên</h3>
            <Link href="/student/account" className="sdu-more-link">
              Xem chi tiết <Icon name="arrow" />
            </Link>
          </header>
          <div className="sdu-profile-body">
            <Link href="/student/account" className="sdu-profile-avatar" title="Xem hồ sơ sinh viên">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" />
              ) : (
                <span>{initials(account.displayName)}</span>
              )}
            </Link>
            <dl className="sdu-profile-grid">
              <div>
                <dt>MSSV:</dt>
                <dd>{account.code}</dd>
              </div>
              <div>
                <dt>Lớp học:</dt>
                <dd>{account.cohortClass}</dd>
              </div>
              <div>
                <dt>Họ tên:</dt>
                <dd>{account.displayName}</dd>
              </div>
              <div>
                <dt>Khóa học:</dt>
                <dd>2022</dd>
              </div>
              <div>
                <dt>Giới tính:</dt>
                <dd>{pickPersonal("Giới tính")}</dd>
              </div>
              <div>
                <dt>Bậc đào tạo:</dt>
                <dd>Đại học</dd>
              </div>
              <div>
                <dt>Ngày sinh:</dt>
                <dd>{pickPersonal("Ngày sinh")}</dd>
              </div>
              <div>
                <dt>Loại hình đào tạo:</dt>
                <dd>Chính quy</dd>
              </div>
              <div>
                <dt>Nơi sinh:</dt>
                <dd>{pickPersonal("Nơi sinh")}</dd>
              </div>
              <div>
                <dt>Ngành:</dt>
                <dd>{pickEdu("Ngành đào tạo")}</dd>
              </div>
            </dl>
          </div>
        </article>

        <div className="sdu-week-counters">
          <Link href="/student/notices" className="sdu-counter-card is-notice">
            <div>
              <span className="sdu-counter-label">Nhắc nhở mới, chưa xem</span>
              <strong className="sdu-counter-num">{unread}</strong>
              <span className="sdu-counter-sub">Xem chi tiết</span>
            </div>
            <span className="sdu-counter-icon"><Icon name="bell" /></span>
          </Link>
          <div className="sdu-counter-split">
            <Link href="/student/schedule" className="sdu-counter-card is-class">
              <div>
                <span className="sdu-counter-label">Lịch học trong tuần</span>
                <strong className="sdu-counter-num">{sessions.length}</strong>
                <span className="sdu-counter-sub">Xem chi tiết</span>
              </div>
              <span className="sdu-counter-icon"><Icon name="calendar" /></span>
            </Link>
            <Link href="/student/exams" className="sdu-counter-card is-exam">
              <div>
                <span className="sdu-counter-label">Lịch thi trong tuần</span>
                <strong className="sdu-counter-num">
                  {exams(now).filter((e) => daysUntil(e.at, now) >= 0 && daysUntil(e.at, now) <= 7).length}
                </strong>
                <span className="sdu-counter-sub">Xem chi tiết</span>
              </div>
              <span className="sdu-counter-icon"><Icon name="clock" /></span>
            </Link>
          </div>
        </div>
      </section>

      <nav className="sdu-quick-tiles" aria-label="Truy cập nhanh phân hệ học vụ">
        {quickActions.map((item) => (
          <Link key={`${item.href}-${item.label}`} href={item.href} className="sdu-quick-tile">
            <span className="sdu-quick-icon"><Icon name={item.icon} /></span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <section className="sdu-academic-triad" aria-label="Kết quả học tập, Tiến độ tín chỉ và Lớp học phần theo đợt">
        <article className="sdu-triad-card">
          <header className="sdu-box-head">
            <h3>
              <Link href="/student/grades">Kết quả học tập</Link>
            </h3>
            <select
              className="sdu-term-select"
              aria-label="Chọn học kỳ xem kết quả học tập"
              value={gradeTermIdx}
              onChange={(e) => setGradeTermIdx(Number(e.target.value))}
            >
              {terms.map((t, idx) => (
                <option key={t.name} value={idx}>
                  {t.name}
                </option>
              ))}
            </select>
          </header>
          <div className="sdu-grade-bars">
            {selectedTerm.rows.map((row) => {
              const scoreVal = total(row);
              const { grade } = letter(scoreVal);
              const pct = Math.min(100, Math.round(scoreVal * 10));
              return (
                <div key={row.code} className="sdu-grade-bar-row">
                  <div className="sdu-grade-bar-meta">
                    <span>
                      <code>{row.code}</code> {row.name}
                    </span>
                    <strong>
                      {scoreVal.toFixed(1)} ({grade})
                    </strong>
                  </div>
                  <div className="sdu-grade-bar-track">
                    <span style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <footer className="sdu-triad-foot">
            <span>GPA học kỳ: <strong>{selectedTermGpa.value.toFixed(2)}</strong> ({standing(selectedTermGpa.value)})</span>
            <Link href="/student/grades" className="sdu-more-link">Bảng điểm đầy đủ</Link>
          </footer>
        </article>

        <article className="sdu-triad-card sdu-gauge-card">
          <header className="sdu-box-head">
            <h3>Tiến độ học tập</h3>
            <Link href={"/student/curriculum" as Route} className="sdu-more-link">
              Khung CT
            </Link>
          </header>
          <div className="sdu-gauge-body">
            <svg viewBox="0 0 140 140" className="sdu-gauge-svg" role="img" aria-label={`Đã tích lũy ${earnedCredits} trên ${totalProgramCredits} tín chỉ (${creditPct}%)`}>
              <circle cx="70" cy="70" r={ringRadius} className="sdu-gauge-bg" />
              <circle
                cx="70"
                cy="70"
                r={ringRadius}
                className="sdu-gauge-fill"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
              />
              <text x="70" y="66" textAnchor="middle" className="sdu-gauge-pct">
                {creditPct}%
              </text>
              <text x="70" y="86" textAnchor="middle" className="sdu-gauge-sub">
                Hoàn thành
              </text>
            </svg>
            <strong className="sdu-gauge-ratio">
              {earnedCredits} / {totalProgramCredits} tín chỉ
            </strong>
            <p className="pt-muted">Ngành {program.name}</p>
          </div>
        </article>

        <article className="sdu-triad-card">
          <header className="sdu-box-head">
            <h3>Lớp học phần</h3>
            <select
              className="sdu-term-select"
              aria-label="Chọn đợt học xem lớp học phần"
              value={courseSemIdx}
              onChange={(e) => setCourseSemIdx(Number(e.target.value))}
            >
              {curriculumSemesters.map((s, idx) => (
                <option key={s.semester} value={idx}>
                  {s.termCode}
                </option>
              ))}
            </select>
          </header>
          <div className="sdu-lhp-table-wrap">
            <table className="sdu-lhp-table">
              <thead>
                <tr>
                  <th scope="col">Môn học / học phần</th>
                  <th scope="col">Số TC</th>
                </tr>
              </thead>
              <tbody>
                {selectedCurrSem.courses.map((c) => (
                  <tr key={c.code}>
                    <td>
                      <Link href={"/student/schedule-progress" as Route} className="sdu-lhp-code">
                        {c.classCode}
                      </Link>
                      <div>{c.name}</div>
                    </td>
                    <td className="ad-code">{c.credits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

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
    </>
  );
}

