"use client";

import type { Route } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { PageTitle, Section, StatTile } from "@/components/portal/Parts";
import { formatDate, formatDeadline } from "@/lib/format";
import { useStudent } from "@/lib/student-context";

export default function TeacherOverviewPage() {
  const {
    data,
    account,
    roster,
    subjectClasses,
    attendanceSessions,
    allSubmissions,
    classAnnouncements,
  } = useStudent();

  if (!data) return null;

  const avgAttendance = roster.length
    ? Math.round(roster.reduce((sum, item) => sum + item.attendancePct, 0) / roster.length)
    : 100;
  const warningStudents = roster.filter((item) => item.attendancePct < 85 || item.status === "warning");
  const totalSubjectPeriods = subjectClasses.reduce((sum, item) => sum + item.totalPeriods, 0);
  const completedSubjectPeriods = subjectClasses.reduce((sum, item) => sum + item.completedPeriods, 0);
  const pendingSubmissions = allSubmissions.filter((item) => item.status === "submitted");
  const gradedCount = allSubmissions.filter((item) => item.status === "reviewed").length;

  return (
    <div className="tcm-page">
      <PageTitle
        title="Tổng quan Quản lý Lớp học & Giảng dạy"
        lead={`Cổng quản lý độc lập dành cho giảng viên · ${account.displayName} (${account.code}) · ${account.department}`}
      >
        <div className="role-action-bar">
          <Link
            href={"/student/teacher-classes/attendance" as Route}
            className="button button-primary button-small"
          >
            <Icon name="checkCircle" /> Điểm danh buổi học
          </Link>
          <Link
            href={"/student/teacher-classes/assignments" as Route}
            className="button button-outline button-small"
          >
            <Icon name="assignment" /> Giao bài & Chấm điểm ({pendingSubmissions.length} chờ chấm)
          </Link>
        </div>
      </PageTitle>

      <div className="pt-stats">
        <StatTile
          icon="users"
          label={`Lớp chủ nhiệm ${account.cohortClass}`}
          value={`${roster.length} sinh viên`}
          note="Quản lý hồ sơ & cố vấn học tập"
          tone="good"
        />
        <StatTile
          icon="class"
          label="Các lớp bộ môn"
          value={`${subjectClasses.length} lớp HP`}
          note={`Đã dạy ${completedSubjectPeriods}/${totalSubjectPeriods} tiết HK1`}
          tone="good"
        />
        <StatTile
          icon="checkCircle"
          label="Thông tin điểm danh"
          value={`${avgAttendance}%`}
          note={`${attendanceSessions.length} buổi đã lưu · ${warningStudents.length} SV cần lưu ý`}
          tone={warningStudents.length > 0 ? "warn" : "good"}
        />
        <StatTile
          icon="assignment"
          label="Bài tập của giáo viên"
          value={`${gradedCount}/${allSubmissions.length} bài`}
          note={`${data.assignments.length} bài tập · ${pendingSubmissions.length} bài chờ chấm`}
          tone={pendingSubmissions.length > 0 ? "warn" : "good"}
        />
      </div>

      <Section
        title="Các phân hệ quản lý chuyên biệt của giảng viên"
        action={<span className="reg-table-meta">Chọn từng mục trên thanh điều hướng bên trái hoặc bên dưới</span>}
      >
        <div className="tcm-module-grid">
          <Link href={"/student/teacher-classes/homeroom" as Route} className="tcm-module-card">
            <div className="tcm-module-head">
              <span className="tile-icon blue">
                <Icon name="users" />
              </span>
              <span className="chip reviewed">Lớp {account.cohortClass}</span>
            </div>
            <h4>Quản lý lớp chủ nhiệm</h4>
            <p>
              Theo dõi sĩ số {roster.length} sinh viên chính quy, ban cán sự lớp, điểm trung bình tích lũy (GPA), ghi chú cố vấn học tập và bảng tin lớp chủ nhiệm.
            </p>
            <span className="tcm-module-go">
              Mở quản lý lớp chủ nhiệm <Icon name="arrow" />
            </span>
          </Link>

          <Link href={"/student/teacher-classes/subjects" as Route} className="tcm-module-card">
            <div className="tcm-module-head">
              <span className="tile-icon red">
                <Icon name="class" />
              </span>
              <span className="chip">{subjectClasses.length} lớp học phần</span>
            </div>
            <h4>Quản lý các lớp bộ môn</h4>
            <p>
              Quản lý các lớp học phần đang trực tiếp giảng dạy (IT3040, IT3160…), lịch giảng dạy, phòng máy thực hành, tiến độ số tiết và mở lớp học phần mới.
            </p>
            <span className="tcm-module-go">
              Mở danh sách lớp bộ môn <Icon name="arrow" />
            </span>
          </Link>

          <Link href={"/student/teacher-classes/attendance" as Route} className="tcm-module-card">
            <div className="tcm-module-head">
              <span className="tile-icon green">
                <Icon name="checkCircle" />
              </span>
              <span className="chip">{attendanceSessions.length} phiên điểm danh</span>
            </div>
            <h4>Thông tin điểm danh & Chuyên cần</h4>
            <p>
              Lập sổ điểm danh điện tử theo từng ca học, đánh dấu Có mặt / Vắng có phép / Vắng không phép, tự động tính tỷ lệ chuyên cần và xét điều kiện dự thi.
            </p>
            <span className="tcm-module-go">
              Mở sổ điểm danh <Icon name="arrow" />
            </span>
          </Link>

          <Link href={"/student/teacher-classes/assignments" as Route} className="tcm-module-card">
            <div className="tcm-module-head">
              <span className="tile-icon amber">
                <Icon name="assignment" />
              </span>
              <span className="chip warning">{pendingSubmissions.length} bài chờ chấm</span>
            </div>
            <h4>Bài tập & Chấm điểm</h4>
            <p>
              Giao bài tập thực hành/đồ án cho từng lớp bộ môn, kiểm tra danh sách sinh viên đã nộp hay chưa nộp và chấm điểm thang 10 kèm nhận xét.
            </p>
            <span className="tcm-module-go">
              Mở quản lý bài tập <Icon name="arrow" />
            </span>
          </Link>
        </div>
      </Section>

      <div className="tcm-two-col">
        <Section
          title="Lịch giảng dạy các lớp bộ môn trong tuần"
          action={
            <Link className="button button-quiet button-xs" href={"/student/teacher-classes/subjects" as Route}>
              Xem tất cả lớp bộ môn <Icon name="arrow" />
            </Link>
          }
        >
          <div className="tcm-session-list">
            {subjectClasses.map((subj) => {
              const pct = Math.min(100, Math.round((subj.completedPeriods / subj.totalPeriods) * 100));
              return (
                <div key={subj.id} className="tcm-overview-row">
                  <div className="tcm-overview-row-main">
                    <div className="tcm-subject-top">
                      <span className="role-badge is-teacher">{subj.courseCode}</span>
                      <code className="pt-code">Mã LHP: {subj.classCode}</code>
                      <span className="chip reviewed">Lớp {subj.cohortClass}</span>
                    </div>
                    <strong>{subj.name}</strong>
                    <small>
                      {subj.schedule} · Phòng {subj.room}
                    </small>
                  </div>
                  <div className="tcm-overview-row-right">
                    <code>
                      {subj.completedPeriods}/{subj.totalPeriods} tiết ({pct}%)
                    </code>
                    <Link
                      href={`/student/teacher-classes/attendance?classId=${subj.id}` as Route}
                      className="button button-outline button-xs"
                    >
                      Điểm danh
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        <Section
          title="Bài nộp mới chờ giảng viên chấm điểm"
          action={
            <Link className="button button-quiet button-xs" href={"/student/teacher-classes/assignments" as Route}>
              Tới phòng chấm bài <Icon name="arrow" />
            </Link>
          }
        >
          <div className="tcm-session-list">
            {allSubmissions.slice(0, 4).map((sub) => {
              const asg = data.assignments.find((a) => a.id === sub.assignmentId);
              return (
                <div key={sub.id} className="tcm-overview-row">
                  <div className="tcm-overview-row-main">
                    <div className="tcm-subject-top">
                      <strong>{sub.studentName}</strong>
                      <code className="pt-code">{sub.studentCode}</code>
                      <span className={`chip ${sub.status === "reviewed" ? "reviewed" : "submitted"}`}>
                        {sub.status === "reviewed" ? `Đã chấm ${sub.score}/10` : "Chờ chấm"}
                      </span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-2)" }}>
                      {asg?.title ?? "Bài tập học phần"}
                    </span>
                    <small>
                      Nộp lúc {formatDate(sub.submittedAt)}
                      {asg?.dueAt ? ` · Hạn: ${formatDeadline(asg.dueAt)}` : ""}
                    </small>
                  </div>
                  <div className="tcm-overview-row-right">
                    <Link
                      href={`/student/teacher-classes/assignments?assignmentId=${sub.assignmentId}` as Route}
                      className="button button-primary button-xs"
                    >
                      {sub.status === "reviewed" ? "Xem điểm" : "Chấm ngay"}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      </div>

      {classAnnouncements.length > 0 && (
        <Section
          title="Thông báo học vụ gần nhất đã gửi tới sinh viên"
          action={
            <Link className="button button-quiet button-xs" href={"/student/teacher-classes/homeroom" as Route}>
              Quản lý thông báo <Icon name="arrow" />
            </Link>
          }
        >
          <div className="cls-notice-list">
            {classAnnouncements.slice(0, 3).map((ann) => (
              <article key={ann.id} className="cls-notice-card">
                <div className="cls-notice-head">
                  <span className="chip reviewed">{ann.authorName}</span>
                  <small>{formatDate(ann.createdAt)}</small>
                </div>
                <h4>{ann.title}</h4>
                <p>{ann.body}</p>
              </article>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
