"use client";

import type { Route } from "next";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ClassCard } from "@/components/Dashboard";
import { Icon } from "@/components/Icon";
import { PageTitle, Section } from "@/components/portal/Parts";
import type { ClassStudentRosterItem } from "@/lib/accounts";
import {
  BUILTIN_COURSE_MATERIALS,
  COURSE_MATERIAL_GROUPS,
  MATERIAL_CATEGORY_META,
  readCustomCourseMaterials,
  subscribeCustomCourseMaterials,
  type CourseMaterial,
} from "@/lib/course-materials";
import { classCode, formatDate } from "@/lib/format";
import { useStudent } from "@/lib/student-context";

export default function ClassesPage() {
  const {
    data,
    account,
    roster,
    allSubmissions,
    classAnnouncements,
    updateStudentNote,
    addClassStudent,
    createAssignment,
    postClassAnnouncement,
  } = useStudent();

  const [showNewAssignment, setShowNewAssignment] = useState(false);
  const [asgClassId, setAsgClassId] = useState("11111111-1111-4111-8111-111111111101");
  const [asgTitle, setAsgTitle] = useState("");
  const [asgInstructions, setAsgInstructions] = useState("");
  const [asgDueDays, setAsgDueDays] = useState("7");

  const [showNewNotice, setShowNewNotice] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeBody, setNoticeBody] = useState("");

  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudentCode, setNewStudentCode] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentPhone, setNewStudentPhone] = useState("");
  const [newStudentRole, setNewStudentRole] =
    useState<ClassStudentRosterItem["roleInClass"]>("Thành viên lớp");

  const [editingStudentCode, setEditingStudentCode] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [attendanceDraft, setAttendanceDraft] = useState(100);
  const [statusMessage, setStatusMessage] = useState("");
  const [selectedMatCourse, setSelectedMatCourse] = useState<string>("all");
  const [customMaterials, setCustomMaterials] = useState<CourseMaterial[]>([]);

  useEffect(() => {
    setCustomMaterials(readCustomCourseMaterials());
    return subscribeCustomCourseMaterials(() => {
      setCustomMaterials(readCustomCourseMaterials());
    });
  }, []);

  if (!data) return null;
  const { classes } = data.session;
  const isTeacher = account.permissions.canManageClassRoster;
  const allCourseMaterials = [...customMaterials, ...BUILTIN_COURSE_MATERIALS];
  const visibleMaterials =
    selectedMatCourse === "all"
      ? allCourseMaterials
      : allCourseMaterials.filter((m) => m.courseCode === selectedMatCourse);

  const pendingGradingCount = allSubmissions.filter((item) => item.status === "submitted").length;
  const gradedCount = allSubmissions.filter((item) => item.status === "reviewed").length;

  function handleCreateAssignment(event: FormEvent) {
    event.preventDefault();
    if (!asgTitle.trim()) return;
    const days = Math.max(1, Number(asgDueDays) || 7);
    const due = new Date(Date.now() + days * 86_400_000);
    due.setHours(23, 59, 0, 0);
    createAssignment({
      classId: asgClassId,
      title: asgTitle,
      instructions: asgInstructions,
      dueAt: due.toISOString(),
    });
    setAsgTitle("");
    setAsgInstructions("");
    setShowNewAssignment(false);
    setStatusMessage("Giảng viên đã giao bài tập mới cho lớp — các tài khoản sinh viên trong lớp đã nhận được ngay.");
  }

  function handlePostNotice(event: FormEvent) {
    event.preventDefault();
    if (!noticeTitle.trim() || !noticeBody.trim()) return;
    postClassAnnouncement({
      classId: "11111111-1111-4111-8111-111111111101",
      title: noticeTitle,
      body: noticeBody,
      pinned: true,
    });
    setNoticeTitle("");
    setNoticeBody("");
    setShowNewNotice(false);
    setStatusMessage("Đã đăng thông báo mới lên bảng tin lớp DK13-CNTT1.");
  }

  function handleAddStudent(event: FormEvent) {
    event.preventDefault();
    if (!newStudentCode.trim() || !newStudentName.trim()) return;
    addClassStudent({
      studentCode: newStudentCode,
      fullName: newStudentName,
      phone: newStudentPhone,
      roleInClass: newStudentRole,
    });
    setNewStudentCode("");
    setNewStudentName("");
    setNewStudentPhone("");
    setShowAddStudent(false);
    setStatusMessage(`Đã thêm sinh viên ${newStudentName.trim()} vào lớp DK13-CNTT1.`);
  }

  function startEditStudent(student: ClassStudentRosterItem) {
    setEditingStudentCode(student.studentCode);
    setNoteDraft(student.teacherNote);
    setAttendanceDraft(student.attendancePct);
  }

  function saveStudentEdit(studentCode: string) {
    updateStudentNote(studentCode, {
      teacherNote: noteDraft,
      attendancePct: Math.max(0, Math.min(100, Number(attendanceDraft) || 0)),
      status: attendanceDraft < 85 ? "warning" : "active",
    });
    setEditingStudentCode(null);
    setStatusMessage(`Đã lưu nhận xét cố vấn cho sinh viên ${studentCode}.`);
  }

  return (
    <>
      <PageTitle
        title={isTeacher ? "Quản lý lớp học & Sinh viên thuộc lớp" : "Lớp học & Danh sách sinh viên cùng lớp"}
        lead={
          isTeacher
            ? `Giảng viên phụ trách: ${account.displayName} · Quản lý danh sách sinh viên lớp ${account.cohortClass}, giao bài tập và chấm phản hồi`
            : `Bạn thuộc lớp niên chế ${account.cohortClass} do ${account.advisorName} làm cố vấn học tập và giảng dạy trực tiếp`
        }
      >
        {isTeacher && (
          <div className="role-action-bar">
            <button
              type="button"
              className="button button-primary button-small"
              onClick={() => setShowNewAssignment((v) => !v)}
            >
              <Icon name="plus" /> Giao bài tập mới
            </button>
            <button
              type="button"
              className="button button-outline button-small"
              onClick={() => setShowNewNotice((v) => !v)}
            >
              <Icon name="bell" /> Đăng thông báo lớp
            </button>
            <button
              type="button"
              className="button button-outline button-small"
              onClick={() => setShowAddStudent((v) => !v)}
            >
              <Icon name="users" /> Thêm SV vào lớp
            </button>
          </div>
        )}
      </PageTitle>

      {statusMessage && (
        <div className="notice" role="status" style={{ marginBottom: 16 }}>
          <Icon name="checkCircle" />
          <div>
            <strong>Đã cập nhật dữ liệu lớp học</strong>
            <p>{statusMessage}</p>
          </div>
        </div>
      )}

      {isTeacher && showNewAssignment && (
        <section className="card rbac-compose-card" aria-label="Giao bài tập mới cho lớp">
          <div className="card-head">
            <h3>Giao bài tập học phần mới (Quyền Giảng viên)</h3>
            <button type="button" className="button button-quiet button-xs" onClick={() => setShowNewAssignment(false)}>
              Đóng
            </button>
          </div>
          <form className="pt-form" onSubmit={handleCreateAssignment}>
            <div className="ad-grid">
              <label className="field">
                Lớp học phần
                <select value={asgClassId} onChange={(e) => setAsgClassId(e.target.value)}>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {classCode(cls.id)} · {cls.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Hạn nộp (số ngày kể từ hôm nay)
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={asgDueDays}
                  onChange={(e) => setAsgDueDays(e.target.value)}
                />
              </label>
            </div>
            <label className="field">
              Tiêu đề bài tập
              <input
                type="text"
                required
                value={asgTitle}
                onChange={(e) => setAsgTitle(e.target.value)}
                placeholder="VD: Bài thực hành 2: Thiết kế mẫu Factory & Observer trong C++"
              />
            </label>
            <label className="field">
              Yêu cầu chi tiết cho sinh viên trong lớp
              <textarea
                rows={3}
                required
                value={asgInstructions}
                onChange={(e) => setAsgInstructions(e.target.value)}
                placeholder="Mô tả đầu vào, đầu ra, tiêu chí chấm điểm và định dạng nộp bài…"
              />
            </label>
            <div className="pt-form-actions">
              <button type="submit" className="button button-primary button-small">
                <Icon name="send" /> Công bố bài tập cho cả lớp
              </button>
            </div>
          </form>
        </section>
      )}

      {isTeacher && showNewNotice && (
        <section className="card rbac-compose-card" aria-label="Đăng thông báo lớp học">
          <div className="card-head">
            <h3>Đăng thông báo tới sinh viên lớp DK13-CNTT1</h3>
            <button type="button" className="button button-quiet button-xs" onClick={() => setShowNewNotice(false)}>
              Đóng
            </button>
          </div>
          <form className="pt-form" onSubmit={handlePostNotice}>
            <label className="field">
              Tiêu đề thông báo
              <input
                type="text"
                required
                value={noticeTitle}
                onChange={(e) => setNoticeTitle(e.target.value)}
                placeholder="VD: Nhắc lịch kiểm tra thực hành giữa kỳ tại phòng B1-203"
              />
            </label>
            <label className="field">
              Nội dung gửi lớp
              <textarea
                rows={3}
                required
                value={noticeBody}
                onChange={(e) => setNoticeBody(e.target.value)}
                placeholder="Nhập nội dung thông báo của giảng viên…"
              />
            </label>
            <div className="pt-form-actions">
              <button type="submit" className="button button-primary button-small">
                <Icon name="bell" /> Gửi thông báo
              </button>
            </div>
          </form>
        </section>
      )}

      {isTeacher && showAddStudent && (
        <section className="card rbac-compose-card" aria-label="Thêm sinh viên vào lớp">
          <div className="card-head">
            <h3>Bổ sung sinh viên vào danh sách lớp DK13-CNTT1</h3>
            <button type="button" className="button button-quiet button-xs" onClick={() => setShowAddStudent(false)}>
              Đóng
            </button>
          </div>
          <form className="pt-form" onSubmit={handleAddStudent}>
            <div className="ad-grid">
              <label className="field">
                Mã sinh viên
                <input
                  type="text"
                  required
                  value={newStudentCode}
                  onChange={(e) => setNewStudentCode(e.target.value)}
                  placeholder="VD: 2200292"
                />
              </label>
              <label className="field">
                Họ và tên sinh viên
                <input
                  type="text"
                  required
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="VD: Bùi Quang Huy"
                />
              </label>
              <label className="field">
                Số điện thoại
                <input
                  type="tel"
                  value={newStudentPhone}
                  onChange={(e) => setNewStudentPhone(e.target.value)}
                  placeholder="0987123456"
                />
              </label>
              <label className="field">
                Chức vụ trong lớp
                <select
                  value={newStudentRole}
                  onChange={(e) => setNewStudentRole(e.target.value as ClassStudentRosterItem["roleInClass"])}
                >
                  <option value="Thành viên lớp">Thành viên lớp</option>
                  <option value="Lớp trưởng">Lớp trưởng</option>
                  <option value="Bí thư Chi đoàn">Bí thư Chi đoàn</option>
                  <option value="Trưởng CLB Tin học">Trưởng CLB Tin học</option>
                </select>
              </label>
            </div>
            <div className="pt-form-actions">
              <button type="submit" className="button button-primary button-small">
                <Icon name="plus" /> Lưu vào danh sách lớp
              </button>
            </div>
          </form>
        </section>
      )}

      <Section
        title={`Danh sách sinh viên thuộc lớp của giảng viên ThS. Trần Minh Đức (Lớp ${account.cohortClass})`}
        action={
          <span className="reg-table-meta">
            {roster.length} sinh viên · {gradedCount} bài đã chấm · {pendingGradingCount} bài chờ chấm
          </span>
        }
      >
        <div className="roster-teacher-banner">
          <div className="roster-teacher-info">
            <span className="role-badge is-teacher">GV</span>
            <div>
              <strong>Giảng viên chủ nhiệm & phụ trách học phần: ThS. Trần Minh Đức</strong>
              <p>
                Email: <code>ductm@saodo.edu.vn</code> · Lớp niên chế: <strong>DK13-CNTT1</strong> · Học phần chính:{" "}
                <strong>IT3040 (Lập trình hướng đối tượng)</strong>
              </p>
            </div>
          </div>
          <div className="roster-teacher-stats">
            <span>Sĩ số: <strong>{roster.length} SV</strong></span>
            <span>Chuyên cần TB: <strong>{Math.round(roster.reduce((s, r) => s + r.attendancePct, 0) / roster.length)}%</strong></span>
          </div>
        </div>

        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th scope="col">MSSV</th>
                <th scope="col">Họ và tên</th>
                <th scope="col">Vai trò trong lớp</th>
                <th scope="col">Chuyên cần</th>
                <th scope="col">GPA</th>
                <th scope="col">Bài đã nộp</th>
                <th scope="col">Nhận xét của giảng viên</th>
                {isTeacher && <th scope="col">Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {roster.map((student) => {
                const subCount = allSubmissions.filter((s) => s.studentCode === student.studentCode).length;
                const isMe = account.code === student.studentCode;
                const isEditing = editingStudentCode === student.studentCode;

                return (
                  <tr key={student.studentCode} className={isMe ? "is-current-row" : undefined}>
                    <td className="ad-code">{student.studentCode}</td>
                    <td className="ad-name">
                      <strong>{student.fullName}</strong>
                      {isMe && <span className="chip submitted" style={{ marginLeft: 8 }}>Bạn</span>}
                      <small>{student.email} · {student.phone}</small>
                    </td>
                    <td>
                      <span
                        className={`chip ${
                          student.roleInClass === "Lớp trưởng" || student.roleInClass === "Trưởng CLB Tin học"
                            ? "reviewed"
                            : ""
                        }`}
                      >
                        {student.roleInClass}
                      </span>
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={attendanceDraft}
                          onChange={(e) => setAttendanceDraft(Number(e.target.value))}
                          style={{ width: 68 }}
                        />
                      ) : (
                        <span className={`chip ${student.attendancePct < 85 ? "danger" : "success"}`}>
                          {student.attendancePct}%
                        </span>
                      )}
                    </td>
                    <td>
                      <strong>{student.gpa.toFixed(2)}</strong>
                    </td>
                    <td>
                      <code>{subCount}/{data.assignments.length} bài</code>
                    </td>
                    <td style={{ maxWidth: 300 }}>
                      {isEditing ? (
                        <textarea
                          rows={2}
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          style={{ width: "100%", fontSize: "0.82rem" }}
                        />
                      ) : (
                        <span style={{ fontSize: "0.84rem", color: "var(--muted)" }}>{student.teacherNote}</span>
                      )}
                    </td>
                    {isTeacher && (
                      <td className="ad-actions">
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                className="button button-primary button-xs"
                                onClick={() => saveStudentEdit(student.studentCode)}
                              >
                                Lưu
                              </button>
                              <button
                                type="button"
                                className="button button-quiet button-xs"
                                onClick={() => setEditingStudentCode(null)}
                              >
                                Huỷ
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="button button-outline button-xs"
                              onClick={() => startEditStudent(student)}
                            >
                              <Icon name="pen" /> Sửa ghi chú
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        title="Bảng tin & Thông báo của giảng viên cho lớp"
        action={<span className="reg-table-meta">{classAnnouncements.length} thông báo</span>}
      >
        <div className="cls-notice-list">
          {classAnnouncements.map((ann) => (
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

      <Section
        title={isTeacher ? "Các lớp học phần đang giảng dạy & quản lý" : "Các lớp học phần đang theo học"}
        action={<span className="reg-table-meta">{classes.length} học phần</span>}
      >
        {classes.length ? (
          <div className="class-grid">
            {classes.map((item, index) => (
              <ClassCard
                key={item.id}
                item={item}
                index={index}
                count={data.assignments.filter((entry) => entry.classId === item.id).length}
                href={`/student/classes/${item.id}` as Route}
              />
            ))}
          </div>
        ) : (
          <div className="empty">
            <Icon name="class" />
            <strong>Chưa có lớp học</strong>
            <p>Lớp được nhà trường phân công sẽ xuất hiện tại đây.</p>
          </div>
        )}
      </Section>

      <Section
        title="Kho học liệu mẫu các học phần (Đề cương · Giáo trình · Slide · Bài tập)"
        action={
          <Link className="button button-primary button-xs" href={"/student/ai?course=all" as Route}>
            <Icon name="sparkle" /> Mở Kho học liệu trên Chat AI ({allCourseMaterials.length})
          </Link>
        }
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <button
            type="button"
            className={`button button-xs ${selectedMatCourse === "all" ? "button-primary" : "button-outline"}`}
            onClick={() => setSelectedMatCourse("all")}
          >
            Tất cả ({allCourseMaterials.length})
          </button>
          {COURSE_MATERIAL_GROUPS.map((grp) => (
            <button
              key={grp.courseCode}
              type="button"
              className={`button button-xs ${
                selectedMatCourse === grp.courseCode ? "button-primary" : "button-outline"
              }`}
              onClick={() => setSelectedMatCourse(grp.courseCode)}
            >
              {grp.courseCode} · {grp.courseName}
            </button>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
            gap: 12,
          }}
        >
          {visibleMaterials.map((doc) => {
            const catMeta = MATERIAL_CATEGORY_META[doc.category];
            return (
              <article
                key={doc.id}
                className="card"
                style={{
                  padding: "14px 16px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span className="chip reviewed">{catMeta.shortLabel}</span>
                    <small style={{ color: "var(--muted)" }}>
                      {doc.courseCode} · Phòng {doc.room}
                    </small>
                  </div>
                  <h4 style={{ margin: "8px 0 5px", fontSize: "0.93rem", lineHeight: 1.38 }}>{doc.title}</h4>
                  <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.48 }}>
                    {doc.summary}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", paddingTop: 6 }}>
                  {doc.publicUrl && (
                    <a
                      className="button button-outline button-xs"
                      href={doc.publicUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Icon name="file" /> Xem PDF
                    </a>
                  )}
                  <Link
                    className="button button-primary button-xs"
                    style={{ marginLeft: "auto" }}
                    href={`/student/ai?material=${encodeURIComponent(doc.id)}` as Route}
                  >
                    <Icon name="sparkle" /> Hỏi Trợ lý AI
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </Section>
    </>
  );
}
