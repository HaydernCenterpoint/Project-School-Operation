"use client";

import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { PhuongFlower, PhuongTree } from "@/components/landing/Phuong";
import { countdown, daysUntil } from "@/components/portal/Parts";
import { greeting, initials } from "@/lib/format";
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

  const weekExamsCount = exams(now).filter((e) => daysUntil(e.at, now) >= 0 && daysUntil(e.at, now) <= 7).length;

  return (
    <>
      <section className="sdu-hero-unified" aria-label="Chào mừng, thông tin sinh viên và nhắc nhở trong tuần">
        <div className="sdu-hero-unified__glow" aria-hidden="true" />
        <PhuongTree className="sdu-hero-unified__tree" id="phuong-student-unified" />

        <div className="sdu-hero-unified__top">
          <div className="sdu-hero-unified__greeting">
            <span className="sdu-hero-unified__kicker">
              <PhuongFlower size={16} /> Cổng thông tin Sinh viên · Đại học Sao Đỏ
            </span>
            <h2>
              {greeting(new Date(now))}, {account.displayName}{" "}
              <span className="sun" aria-hidden="true">
                <Icon name="sun" />
              </span>
            </h2>
            <p>Theo dõi việc học, hồ sơ học vụ và lịch trình trong tuần của bạn dưới tán phượng đỏ Sao Đỏ</p>
          </div>
        </div>

        <div className="sdu-hero-unified__divider" aria-hidden="true">
          <span />
          <PhuongFlower size={15} />
          <PhuongFlower size={20} />
          <PhuongFlower size={15} />
          <span />
        </div>

        <div className="sdu-hero-unified__main">
          <div className="sdu-hero-unified__profile">
            <div className="sdu-box-head sdu-hero-unified__subhead">
              <h3>
                <PhuongFlower size={16} /> Thông tin sinh viên
              </h3>
              <Link href="/student/account" className="sdu-more-link">
                Xem chi tiết <Icon name="arrow" />
              </Link>
            </div>
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
          </div>

          <div className="sdu-week-counters sdu-hero-unified__counters">
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
                  <strong className="sdu-counter-num">{weekExamsCount}</strong>
                  <span className="sdu-counter-sub">Xem chi tiết</span>
                </div>
                <span className="sdu-counter-icon"><Icon name="clock" /></span>
              </Link>
            </div>
          </div>
        </div>
      </section>

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

