"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { countdown, daysUntil, DemoBanner, PageTitle, Section } from "@/components/portal/Parts";
import { clock, courseByCode, exams, longDay, semester, useHydratedNow } from "@/lib/portal-demo";

const rounds = ["Tất cả", "Giữa kỳ", "Cuối kỳ"] as const;

export default function ExamsPage() {
  const [now] = useHydratedNow();
  const [round, setRound] = useState<(typeof rounds)[number]>("Tất cả");
  const list = exams(now)
    .filter((exam) => round === "Tất cả" || exam.round === round)
    .sort((a, b) => a.at.localeCompare(b.at));
  const next = exams(now).find((exam) => daysUntil(exam.at, now) >= 0);

  return (
    <>
      <DemoBanner />
      <PageTitle title="Lịch thi" lead={`${semester.name}. Giờ thi theo giờ Việt Nam.`} />

      {next && (
        <div className="pt-hero-card">
          <div>
            <span className="pt-kicker">Môn thi gần nhất · {countdown(next.at, now)}</span>
            <h3>{courseByCode.get(next.course)!.name}</h3>
            <p>
              {longDay(next.at)}, {clock(next.at)} · {next.room} · {next.seat}
            </p>
          </div>
          <div className="pt-hero-count" aria-hidden="true">
            <strong>{Math.max(0, daysUntil(next.at, now))}</strong>
            <span>ngày</span>
          </div>
        </div>
      )}

      <div className="toolbar">
        <div className="segmented" role="group" aria-label="Lọc kỳ thi">
          {rounds.map((item) => (
            <button key={item} type="button" aria-pressed={round === item} onClick={() => setRound(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>

      <ul className="pt-list">
        {list.map((exam) => {
          const course = courseByCode.get(exam.course)!;
          const days = daysUntil(exam.at, now);
          return (
            <li key={exam.course + exam.round} className="pt-exam">
              <div className="pt-date" aria-hidden="true">
                <strong>{new Date(exam.at).getDate()}</strong>
                <span>Th {new Date(exam.at).getMonth() + 1}</span>
              </div>
              <div className="pt-exam-main">
                <h4>{course.name}</h4>
                <p>
                  {longDay(exam.at)} · {clock(exam.at)} · {exam.minutes} phút
                </p>
                <p className="pt-meta">
                  <span><Icon name="pin" /> {exam.room}</span>
                  <span><Icon name="user" /> {exam.seat}</span>
                  <span><Icon name="pen" /> {exam.form}</span>
                </p>
              </div>
              <div className="pt-exam-side">
                <span className="chip">{exam.round}</span>
                <span className={`chip ${days <= 3 ? "soon" : ""}`}><Icon name="clock" /> {countdown(exam.at, now)}</span>
              </div>
            </li>
          );
        })}
      </ul>

      <Section title="Lưu ý khi dự thi" icon="info">
        <ul className="pt-notes">
          <li>Có mặt tại phòng thi trước giờ thi 15 phút, mang thẻ sinh viên hoặc căn cước.</li>
          <li>Không mang điện thoại và tài liệu vào phòng thi, trừ khi đề thi cho phép.</li>
          <li>Sinh viên chưa hoàn thành học phí có thể không đủ điều kiện dự thi cuối kỳ.</li>
          <li>Vắng thi có lý do chính đáng: nộp đơn tại mục Thủ tục một cửa trong 3 ngày làm việc.</li>
        </ul>
      </Section>
    </>
  );
}
