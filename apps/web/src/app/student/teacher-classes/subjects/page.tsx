"use client";

import type { Route } from "next";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { Icon } from "@/components/Icon";
import { PageTitle, Section, StatTile } from "@/components/portal/Parts";
import { useStudent } from "@/lib/student-context";

export default function TeacherSubjectsPage() {
  const {
    data,
    account,
    roster,
    subjectClasses,
    attendanceSessions,
    addSubjectClass,
  } = useStudent();

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [subjClassCode, setSubjClassCode] = useState("");
  const [subjCourseCode, setSubjCourseCode] = useState("IT3100");
  const [subjName, setSubjName] = useState("");
  const [subjCredits, setSubjCredits] = useState("3");
  const [subjCohort, setSubjCohort] = useState("DK13-CNTT1");
  const [subjSchedule, setSubjSchedule] = useState("Thứ 3 (Tiết 1–3) · Thứ 5 (Tiết 6–9)");
  const [subjRoom, setSubjRoom] = useState("B1-201 / B1-203");
  const [subjPeriods, setSubjPeriods] = useState("60");
  const [statusMessage, setStatusMessage] = useState("");

  if (!data) return null;

  const focusedClass =
    subjectClasses.find((c) => c.id === selectedClassId) ?? subjectClasses[0] ?? null;

  const totalCredits = subjectClasses.reduce((sum, item) => sum + item.credits, 0);
  const totalPeriods = subjectClasses.reduce((sum, item) => sum + item.totalPeriods, 0);
  const completedPeriods = subjectClasses.reduce((sum, item) => sum + item.completedPeriods, 0);

  function handleAddSubjectClass(event: FormEvent) {
    event.preventDefault();
    if (!subjName.trim()) return;
    const created = addSubjectClass({
      classCode: subjClassCode,
      courseCode: subjCourseCode,
      name: subjName.includes("(")
        ? subjName.trim()
        : `${subjName.trim()} (${subjCourseCode.trim().toUpperCase()})`,
      credits: Number(subjCredits) || 3,
      cohortClass: subjCohort,
      schedule: subjSchedule,
      room: subjRoom,
      totalPeriods: Number(subjPeriods) || 60,
    });
    setSelectedClassId(created.id);
    setSubjClassCode("");
    setSubjName("");
    setShowAddSubject(false);
    setStatusMessage(`Đã mở thêm lớp bộ môn "${created.name}" (${created.classCode}).`);
  }

  return (
    <div className="tcm-page">
      <PageTitle
        title="Quản lý các Lớp bộ môn Giảng dạy"
        lead={`Giảng viên phụ trách: ${account.displayName} · Quản lý kế hoạch giảng dạy, phòng học/Lab và danh sách sinh viên theo từng lớp học phần`}
      >
        <div className="role-action-bar">
          <button
            type="button"
            className="button button-primary button-small"
            onClick={() => setShowAddSubject((v) => !v)}
          >
            <Icon name="plus" /> Mở thêm lớp bộ môn
          </button>
        </div>
      </PageTitle>

      {statusMessage && (
        <div className="notice ok" role="status">
          <Icon name="checkCircle" />
          <div>
            <strong>Đã cập nhật lớp bộ môn</strong>
            <p>{statusMessage}</p>
          </div>
          <button type="button" className="button button-quiet button-xs" onClick={() => setStatusMessage("")}>
            Đóng
          </button>
        </div>
      )}

      <div className="pt-stats">
        <StatTile
          icon="class"
          label="Số lớp bộ môn"
          value={`${subjectClasses.length} lớp HP`}
          note="Đang trực tiếp giảng dạy HK1"
          tone="good"
        />
        <StatTile
          icon="book"
          label="Tổng khối lượng tín chỉ"
          value={`${totalCredits} tín chỉ`}
          note="Lý thuyết & Thực hành phòng Lab"
          tone="good"
        />
        <StatTile
          icon="clock"
          label="Tiến độ số tiết giảng dạy"
          value={`${completedPeriods}/${totalPeriods} tiết`}
          note={`Hoàn thành ${Math.round((completedPeriods / Math.max(1, totalPeriods)) * 100)}% kế hoạch kỳ`}
          tone="good"
        />
        <StatTile
          icon="users"
          label="Quy mô sinh viên"
          value={`${roster.length} SV / lớp`}
          note="Đồng bộ danh sách từ Phòng Đào tạo"
          tone="good"
        />
      </div>

      {showAddSubject && (
        <section className="card rbac-compose-card" aria-label="Mở lớp bộ môn mới">
          <div className="card-head">
            <h3>Mở thêm lớp bộ môn giảng dạy</h3>
            <button type="button" className="button button-quiet button-xs" onClick={() => setShowAddSubject(false)}>
              Đóng
            </button>
          </div>
          <form className="pt-form" onSubmit={handleAddSubjectClass}>
            <div className="ad-grid">
              <label className="field">
                Mã học phần
                <input
                  type="text"
                  required
                  value={subjCourseCode}
                  onChange={(e) => setSubjCourseCode(e.target.value)}
                  placeholder="VD: IT3100"
                />
              </label>
              <label className="field">
                Mã lớp học phần
                <input
                  type="text"
                  value={subjClassCode}
                  onChange={(e) => setSubjClassCode(e.target.value)}
                  placeholder="VD: 010110220101"
                />
              </label>
              <label className="field">
                Tên lớp bộ môn
                <input
                  type="text"
                  required
                  value={subjName}
                  onChange={(e) => setSubjName(e.target.value)}
                  placeholder="VD: Phát triển ứng dụng Web"
                />
              </label>
              <label className="field">
                Lớp niên chế theo học
                <input
                  type="text"
                  required
                  value={subjCohort}
                  onChange={(e) => setSubjCohort(e.target.value)}
                  placeholder="VD: DK13-CNTT1"
                />
              </label>
              <label className="field">
                Số tín chỉ
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={subjCredits}
                  onChange={(e) => setSubjCredits(e.target.value)}
                />
              </label>
              <label className="field">
                Tổng số tiết quy định
                <input
                  type="number"
                  min={15}
                  max={120}
                  value={subjPeriods}
                  onChange={(e) => setSubjPeriods(e.target.value)}
                />
              </label>
              <label className="field">
                Lịch giảng dạy hàng tuần
                <input
                  type="text"
                  value={subjSchedule}
                  onChange={(e) => setSubjSchedule(e.target.value)}
                  placeholder="Thứ 2 (Tiết 1–3) · Thứ 4 (Tiết 6–9)"
                />
              </label>
              <label className="field">
                Phòng học / Phòng Lab
                <input
                  type="text"
                  value={subjRoom}
                  onChange={(e) => setSubjRoom(e.target.value)}
                  placeholder="B1-205 / B1-202"
                />
              </label>
            </div>
            <div className="pt-form-actions">
              <button type="submit" className="button button-primary button-small">
                <Icon name="plus" /> Lưu lớp bộ môn
              </button>
            </div>
          </form>
        </section>
      )}

      <Section
        title="Danh sách các lớp bộ môn đang phụ trách"
        action={<span className="reg-table-meta">Bấm vào từng lớp để xem danh sách sinh viên và học liệu</span>}
      >
        <div className="tcm-subject-grid">
          {subjectClasses.map((subj) => {
            const isSelected = focusedClass?.id === subj.id;
            const classAsgCount = data.assignments.filter((a) => a.classId === subj.id).length;
            const classAttCount = attendanceSessions.filter((s) => s.subjectClassId === subj.id).length;
            const progressPct = Math.min(100, Math.round((subj.completedPeriods / subj.totalPeriods) * 100));

            return (
              <article
                key={subj.id}
                className={`tcm-subject-card${isSelected ? " is-selected" : ""}`}
                onClick={() => setSelectedClassId(subj.id)}
                style={{ cursor: "pointer" }}
              >
                <div className="tcm-subject-top">
                  <span className="role-badge is-teacher">{subj.courseCode}</span>
                  <code className="pt-code">Mã LHP: {subj.classCode}</code>
                  <span className="chip reviewed" style={{ marginLeft: "auto" }}>
                    Lớp {subj.cohortClass}
                  </span>
                </div>

                <h4>{subj.name}</h4>

                <dl className="tcm-subject-meta">
                  <div>
                    <dt>Lịch dạy</dt>
                    <dd>{subj.schedule}</dd>
                  </div>
                  <div>
                    <dt>Phòng học</dt>
                    <dd>{subj.room}</dd>
                  </div>
                  <div>
                    <dt>Tín chỉ</dt>
                    <dd>{subj.credits} TC · {subj.semester}</dd>
                  </div>
                  <div>
                    <dt>Hoạt động</dt>
                    <dd>{classAttCount} buổi điểm danh · {classAsgCount} bài tập</dd>
                  </div>
                </dl>

                <div className="tcm-subject-progress">
                  <div className="tcm-subject-progress-head">
                    <span>Tiến độ giảng dạy</span>
                    <strong>
                      {subj.completedPeriods}/{subj.totalPeriods} tiết ({progressPct}%)
                    </strong>
                  </div>
                  <div className="pt-progress" style={{ margin: 0 }}>
                    <span style={{ width: `${progressPct}%` }} />
                  </div>
                </div>

                <div className="tcm-subject-actions">
                  <Link
                    href={`/student/teacher-classes/attendance?classId=${subj.id}` as Route}
                    className="button button-primary button-xs"
                  >
                    <Icon name="checkCircle" /> Điểm danh lớp này
                  </Link>
                  <Link
                    href={`/student/teacher-classes/assignments?classId=${subj.id}` as Route}
                    className="button button-outline button-xs"
                  >
                    <Icon name="assignment" /> Bài tập ({classAsgCount})
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </Section>

      {focusedClass && (
        <Section
          title={`Danh sách sinh viên lớp học phần: ${focusedClass.name}`}
          action={
            <span className="reg-table-meta">
              Mã LHP {focusedClass.classCode} · Lớp {focusedClass.cohortClass} · Phòng {focusedClass.room}
            </span>
          }
        >
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr>
                  <th scope="col">MSSV</th>
                  <th scope="col">Họ và tên sinh viên</th>
                  <th scope="col">Lớp niên chế</th>
                  <th scope="col">Chuyên cần bộ môn</th>
                  <th scope="col">Điều kiện dự thi</th>
                  <th scope="col">Nhận xét của giảng viên</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((st) => {
                  const eligible = st.attendancePct >= 80;
                  return (
                    <tr key={st.studentCode}>
                      <td className="ad-code">{st.studentCode}</td>
                      <td className="ad-name">
                        <strong>{st.fullName}</strong>
                        <small>{st.email}</small>
                      </td>
                      <td>
                        <code>{st.cohortClass}</code>
                      </td>
                      <td>
                        <span className={`chip ${st.attendancePct < 85 ? "danger" : "success"}`}>
                          {st.attendancePct}%
                        </span>
                      </td>
                      <td>
                        <span className={`chip ${eligible ? "reviewed" : "overdue"}`}>
                          {eligible ? "Đủ điều kiện thi" : "Cảnh báo cấm thi"}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: "var(--muted)" }}>{st.teacherNote}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  );
}
