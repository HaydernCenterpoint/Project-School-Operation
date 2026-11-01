"use client";

import { useState } from "react";
import { DemoBanner, PageTitle, Section, StatTile } from "@/components/portal/Parts";
import { scheduleProgress, semester } from "@/lib/portal-demo";

export default function ScheduleProgressPage() {
  const [kindFilter, setKindFilter] = useState<"all" | "Lý thuyết" | "Thực hành">("all");
  const visible = scheduleProgress.filter((item) => kindFilter === "all" || item.kind === kindFilter);
  const totalWeeks = scheduleProgress.reduce((sum, item) => sum + item.totalWeeks, 0);
  const doneWeeks = scheduleProgress.reduce((sum, item) => sum + item.completedWeeks, 0);
  const overallPct = Math.round((doneWeeks / totalWeeks) * 100);

  return (
    <>
      <DemoBanner />
      <PageTitle
        title="Lịch theo tiến độ"
        lead={`${semester.name} · Tra cứu tiến độ giảng dạy từng lớp học phần từ tuần bắt đầu đến tuần kết thúc`}
      >
        <div className="asg-tabs" role="group" aria-label="Lọc loại hình học phần">
          <button type="button" aria-pressed={kindFilter === "all"} onClick={() => setKindFilter("all")}>
            <span>Tất cả</span>
            <code>{scheduleProgress.length}</code>
          </button>
          <button type="button" aria-pressed={kindFilter === "Lý thuyết"} onClick={() => setKindFilter("Lý thuyết")}>
            <span>Lý thuyết</span>
            <code>{scheduleProgress.filter((i) => i.kind === "Lý thuyết").length}</code>
          </button>
          <button type="button" aria-pressed={kindFilter === "Thực hành"} onClick={() => setKindFilter("Thực hành")}>
            <span>Thực hành</span>
            <code>{scheduleProgress.filter((i) => i.kind === "Thực hành").length}</code>
          </button>
        </div>
      </PageTitle>

      <div className="pt-stats">
        <StatTile label="Tổng buổi/nhóm theo lịch" value={`${scheduleProgress.length} nhóm`} note="6 học phần trong đợt" />
        <StatTile label="Tiến độ học kỳ" value={`${overallPct}%`} note="Tuần 8 / 15 của học kỳ" tone="good" />
        <StatTile label="Lý thuyết" value={`${scheduleProgress.filter((i) => i.kind === "Lý thuyết").length} lớp`} note="Giảng đường A1, A2, C1" />
        <StatTile label="Thực hành" value={`${scheduleProgress.filter((i) => i.kind === "Thực hành").length} nhóm`} note="Phòng máy nhà B1 & Nhà thi đấu" />
      </div>

      <Section
        title="Bảng lịch học theo tiến độ học kỳ"
        action={<span className="reg-table-meta">{visible.length} dòng tiến độ</span>}
      >
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th scope="col">Mã lớp HP</th>
                <th scope="col">Tên môn học / học phần</th>
                <th scope="col">TC</th>
                <th scope="col">Nhóm</th>
                <th scope="col">Thứ / Tiết</th>
                <th scope="col">Phòng học</th>
                <th scope="col">Giảng viên</th>
                <th scope="col">Thời gian (BĐ - KT)</th>
                <th scope="col">Tiến độ tuần</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => {
                const pct = Math.round((item.completedWeeks / item.totalWeeks) * 100);
                return (
                  <tr key={item.id}>
                    <td className="ad-code">{item.classCode}</td>
                    <td>
                      <strong>{item.courseName}</strong>
                      <div className="pt-code">{item.courseCode}</div>
                    </td>
                    <td className="ad-code">{item.credits}</td>
                    <td>
                      <span className={`chip ${item.kind === "Thực hành" ? "soon" : "submitted"}`}>
                        {item.group} · {item.kind}
                      </span>
                    </td>
                    <td className="ad-code">{item.dayOfWeek} · {item.periods}</td>
                    <td className="ad-code">{item.room}</td>
                    <td>{item.lecturer}</td>
                    <td className="ad-code">
                      <div>{item.startDate} - {item.endDate}</div>
                      <small className="pt-muted">{item.weeksRange}</small>
                    </td>
                    <td className="ad-code">
                      <span>{item.completedWeeks}/{item.totalWeeks} tuần ({pct}%)</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
