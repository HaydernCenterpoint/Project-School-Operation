"use client";

import { useState } from "react";
import { DemoBanner, PageTitle, Section, StatTile } from "@/components/portal/Parts";
import { curriculumSemesters, program, type CurriculumCourse } from "@/lib/portal-demo";

type StatusFilter = "all" | CurriculumCourse["status"];

const statusBadge: Record<CurriculumCourse["status"], { label: string; className: string }> = {
  passed: { label: "Đã đạt", className: "reviewed" },
  in_progress: { label: "Đang học", className: "submitted" },
  upcoming: { label: "Chưa học", className: "" },
};

export default function CurriculumPage() {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const allCourses = curriculumSemesters.flatMap((sem) => sem.courses);
  const totalCredits = allCourses.reduce((sum, item) => sum + item.credits, 0);
  const passedCredits = allCourses
    .filter((item) => item.status === "passed")
    .reduce((sum, item) => sum + item.credits, 0);
  const currentCredits = allCourses
    .filter((item) => item.status === "in_progress")
    .reduce((sum, item) => sum + item.credits, 0);
  const requiredCredits = allCourses
    .filter((item) => item.required)
    .reduce((sum, item) => sum + item.credits, 0);
  const electiveCredits = totalCredits - requiredCredits;

  return (
    <>
      <DemoBanner />
      <PageTitle
        title="Chương trình khung"
        lead={`Ngành ${program.name} · Bậc Đại học chính quy · Khung chuẩn theo từng học kỳ đào tạo`}
      >
        <div className="asg-tabs" role="group" aria-label="Lọc trạng thái học phần">
          <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
            <span>Tất cả</span>
            <code>{allCourses.length}</code>
          </button>
          <button type="button" aria-pressed={filter === "passed"} onClick={() => setFilter("passed")}>
            <span>Đã đạt</span>
            <code>{allCourses.filter((c) => c.status === "passed").length}</code>
          </button>
          <button type="button" aria-pressed={filter === "in_progress"} onClick={() => setFilter("in_progress")}>
            <span>Đang học</span>
            <code>{allCourses.filter((c) => c.status === "in_progress").length}</code>
          </button>
          <button type="button" aria-pressed={filter === "upcoming"} onClick={() => setFilter("upcoming")}>
            <span>Chưa học</span>
            <code>{allCourses.filter((c) => c.status === "upcoming").length}</code>
          </button>
        </div>
      </PageTitle>

      <div className="pt-stats">
        <StatTile
          label="Tổng tín chỉ khung"
          value={`${totalCredits} TC`}
          note={`Bắt buộc ${requiredCredits} TC · Tự chọn ${electiveCredits} TC`}
        />
        <StatTile
          label="Tín chỉ đã tích lũy"
          value={`${passedCredits} TC`}
          note={`Hoàn thành ${Math.round((passedCredits / totalCredits) * 100)}% khung hiển thị`}
          tone="good"
        />
        <StatTile
          label="Đang học kỳ này"
          value={`${currentCredits} TC`}
          note={`${allCourses.filter((c) => c.status === "in_progress").length} học phần trong đợt`}
        />
        <StatTile
          label="Còn phải tích lũy"
          value={`${Math.max(0, totalCredits - passedCredits - currentCredits)} TC`}
          note="Bao gồm thực tập và đồ án tốt nghiệp"
        />
      </div>

      {curriculumSemesters.map((sem) => {
        const visible = sem.courses.filter((c) => filter === "all" || c.status === filter);
        if (!visible.length) return null;
        const semCredits = visible.reduce((sum, c) => sum + c.credits, 0);
        return (
          <Section
            key={sem.semester}
            title={`${sem.title} · ${sem.termCode}`}
            action={<span className="reg-table-meta">{visible.length} học phần · {semCredits} tín chỉ</span>}
          >
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead>
                  <tr>
                    <th scope="col">Mã HP</th>
                    <th scope="col">Mã lớp chuẩn</th>
                    <th scope="col">Tên học phần</th>
                    <th scope="col">TC</th>
                    <th scope="col">LT / TH (tiết)</th>
                    <th scope="col">Loại</th>
                    <th scope="col">Tiên quyết</th>
                    <th scope="col">Điểm</th>
                    <th scope="col">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((course) => {
                    const st = statusBadge[course.status];
                    return (
                      <tr key={course.code}>
                        <td className="ad-code">{course.code}</td>
                        <td className="ad-code">{course.classCode}</td>
                        <td>
                          <strong>{course.name}</strong>
                        </td>
                        <td className="ad-code">{course.credits}</td>
                        <td className="ad-code">{course.theoryHours} / {course.practiceHours}</td>
                        <td>
                          <span className="chip">{course.required ? "Bắt buộc" : "Tự chọn"}</span>
                        </td>
                        <td className="ad-code">{course.prerequisite ?? "-"}</td>
                        <td className="ad-code">
                          {course.score10 !== undefined ? `${course.score10.toFixed(1)} (${course.letterGrade})` : "-"}
                        </td>
                        <td>
                          <span className={`chip ${st.className}`}>{st.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>
        );
      })}
    </>
  );
}
