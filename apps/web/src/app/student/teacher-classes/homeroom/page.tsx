"use client";

import { FormEvent, useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { PageTitle, Section, StatTile } from "@/components/portal/Parts";
import type { ClassStudentRosterItem } from "@/lib/accounts";
import { formatDate } from "@/lib/format";
import { useStudent } from "@/lib/student-context";

export default function TeacherHomeroomPage() {
  const {
    data,
    account,
    accounts,
    roster,
    allSubmissions,
    classAnnouncements,
    subjectClasses,
    updateStudentNote,
    addClassStudent,
    postClassAnnouncement,
    switchAccount,
  } = useStudent();

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusMessage, setStatusMessage] = useState("");

  // Add student state
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudentCode, setNewStudentCode] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentPhone, setNewStudentPhone] = useState("");
  const [newStudentRole, setNewStudentRole] =
    useState<ClassStudentRosterItem["roleInClass"]>("Thành viên lớp");

  // Edit advisor note state
  const [editingStudentCode, setEditingStudentCode] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [attendanceDraft, setAttendanceDraft] = useState(100);
  const [gpaDraft, setGpaDraft] = useState("3.20");

  // Announcement state
  const [showNewNotice, setShowNewNotice] = useState(false);
  const [noticeClassId, setNoticeClassId] = useState("11111111-1111-4111-8111-111111111101");
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeBody, setNoticeBody] = useState("");

  const filteredRoster = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return roster.filter((st) => {
      if (roleFilter === "officers" && st.roleInClass === "Thành viên lớp") return false;
      if (roleFilter === "warning" && st.attendancePct >= 85 && st.status !== "warning") return false;
      if (!q) return true;
      return (
        st.fullName.toLowerCase().includes(q) ||
        st.studentCode.toLowerCase().includes(q) ||
        st.email.toLowerCase().includes(q) ||
        st.roleInClass.toLowerCase().includes(q)
      );
    });
  }, [roleFilter, roster, searchQuery]);

  if (!data) return null;

  const avgGpa = roster.length
    ? (roster.reduce((sum, item) => sum + item.gpa, 0) / roster.length).toFixed(2)
    : "0.00";
  const avgAttendance = roster.length
    ? Math.round(roster.reduce((sum, item) => sum + item.attendancePct, 0) / roster.length)
    : 100;
  const officersCount = roster.filter((item) => item.roleInClass !== "Thành viên lớp").length;
  const warningCount = roster.filter((item) => item.attendancePct < 85 || item.status === "warning").length;

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
    setStatusMessage(`Đã thêm sinh viên ${newStudentName.trim()} (${newStudentCode.trim()}) vào danh sách lớp ${account.cohortClass}.`);
  }

  function startEditStudent(student: ClassStudentRosterItem) {
    setEditingStudentCode(student.studentCode);
    setNoteDraft(student.teacherNote);
    setAttendanceDraft(student.attendancePct);
    setGpaDraft(student.gpa.toFixed(2));
  }

  function saveStudentEdit(studentCode: string) {
    const parsedGpa = Number(gpaDraft);
    updateStudentNote(studentCode, {
      teacherNote: noteDraft,
      attendancePct: Math.max(0, Math.min(100, Number(attendanceDraft) || 0)),
      gpa: !Number.isNaN(parsedGpa) && parsedGpa >= 0 && parsedGpa <= 4 ? parsedGpa : undefined,
      status: attendanceDraft < 85 ? "warning" : "active",
    });
    setEditingStudentCode(null);
    setStatusMessage(`Đã cập nhật hồ sơ & ghi chú cố vấn học tập cho sinh viên ${studentCode}.`);
  }

  function handlePostNotice(event: FormEvent) {
    event.preventDefault();
    if (!noticeTitle.trim() || !noticeBody.trim()) return;
    postClassAnnouncement({
      classId: noticeClassId,
      title: noticeTitle,
      body: noticeBody,
      pinned: true,
    });
    setNoticeTitle("");
    setNoticeBody("");
    setShowNewNotice(false);
    setStatusMessage("Đã đăng thông báo mới lên bảng tin lớp chủ nhiệm.");
  }

  return (
    <div className="tcm-page">
      <PageTitle
        title={`Quản lý Lớp chủ nhiệm ${account.cohortClass}`}
        lead={`Cố vấn học tập: ${account.displayName} · Theo dõi sĩ số, ban cán sự, kết quả học tập và sổ cố vấn sinh viên`}
      >
        <div className="role-action-bar">
          <button
            type="button"
            className="button button-primary button-small"
            onClick={() => setShowAddStudent((v) => !v)}
          >
            <Icon name="plus" /> Thêm sinh viên vào lớp
          </button>
          <button
            type="button"
            className="button button-outline button-small"
            onClick={() => setShowNewNotice((v) => !v)}
          >
            <Icon name="bell" /> Đăng thông báo lớp
          </button>
        </div>
      </PageTitle>

      {statusMessage && (
        <div className="notice ok" role="status">
          <Icon name="checkCircle" />
          <div>
            <strong>Đã lưu thay đổi lớp chủ nhiệm</strong>
            <p>{statusMessage}</p>
          </div>
          <button type="button" className="button button-quiet button-xs" onClick={() => setStatusMessage("")}>
            Đóng
          </button>
        </div>
      )}

      <div className="pt-stats">
        <StatTile
          icon="users"
          label="Tổng sĩ số lớp"
          value={`${roster.length} SV`}
          note={`Lớp niên chế ${account.cohortClass}`}
          tone="good"
        />
        <StatTile
          icon="award"
          label="GPA trung bình lớp"
          value={`${avgGpa}/4.0`}
          note="Điểm trung bình tích lũy toàn lớp"
          tone="good"
        />
        <StatTile
          icon="flag"
          label="Ban cán sự & Cán bộ"
          value={`${officersCount} cán bộ`}
          note="Lớp trưởng, Bí thư, Trưởng CLB"
          tone="good"
        />
        <StatTile
          icon="checkCircle"
          label="Chuyên cần & Cảnh báo"
          value={`${avgAttendance}%`}
          note={warningCount > 0 ? `${warningCount} SV cần nhắc nhở chuyên cần` : "100% đủ điều kiện học tập"}
          tone={warningCount > 0 ? "warn" : "good"}
        />
      </div>

      {showAddStudent && (
        <section className="card rbac-compose-card" aria-label="Thêm sinh viên mới vào lớp chủ nhiệm">
          <div className="card-head">
            <h3>Bổ sung sinh viên vào lớp {account.cohortClass}</h3>
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
                Số điện thoại liên hệ
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
                  onChange={(e) =>
                    setNewStudentRole(e.target.value as ClassStudentRosterItem["roleInClass"])
                  }
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

      {showNewNotice && (
        <section className="card rbac-compose-card" aria-label="Đăng thông báo lớp chủ nhiệm">
          <div className="card-head">
            <h3>Gửi thông báo tới lớp {account.cohortClass}</h3>
            <button type="button" className="button button-quiet button-xs" onClick={() => setShowNewNotice(false)}>
              Đóng
            </button>
          </div>
          <form className="pt-form" onSubmit={handlePostNotice}>
            <label className="field">
              Học phần / Lớp áp dụng
              <select value={noticeClassId} onChange={(e) => setNoticeClassId(e.target.value)}>
                {subjectClasses.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.courseCode} · {cls.name} ({cls.cohortClass})
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Tiêu đề thông báo
              <input
                type="text"
                required
                value={noticeTitle}
                onChange={(e) => setNoticeTitle(e.target.value)}
                placeholder="VD: Lịch sinh hoạt lớp định kỳ tháng 11 & xét điểm rèn luyện"
              />
            </label>
            <label className="field">
              Nội dung thông báo
              <textarea
                rows={3}
                required
                value={noticeBody}
                onChange={(e) => setNoticeBody(e.target.value)}
                placeholder="Nhập nội dung gửi tới toàn bộ sinh viên trong lớp…"
              />
            </label>
            <div className="pt-form-actions">
              <button type="submit" className="button button-primary button-small">
                <Icon name="bell" /> Đăng thông báo
              </button>
            </div>
          </form>
        </section>
      )}

      <Section
        title={`Danh sách sinh viên lớp ${account.cohortClass}`}
        action={
          <div className="tcm-filter-inline">
            <div className="asg-tabs">
              <button
                type="button"
                aria-pressed={roleFilter === "all"}
                onClick={() => setRoleFilter("all")}
              >
                <span>Tất cả</span>
                <code>{roster.length}</code>
              </button>
              <button
                type="button"
                aria-pressed={roleFilter === "officers"}
                onClick={() => setRoleFilter("officers")}
              >
                <span>Ban cán sự</span>
                <code>{officersCount}</code>
              </button>
              <button
                type="button"
                aria-pressed={roleFilter === "warning"}
                onClick={() => setRoleFilter("warning")}
              >
                <span>Cần lưu ý</span>
                <code>{warningCount}</code>
              </button>
            </div>
            <input
              type="search"
              className="tcm-search-inline"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tên, MSSV, chức vụ…"
            />
          </div>
        }
      >
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th scope="col">MSSV</th>
                <th scope="col">Họ và tên</th>
                <th scope="col">Chức vụ lớp</th>
                <th scope="col">Chuyên cần</th>
                <th scope="col">GPA</th>
                <th scope="col">Bài tập đã nộp</th>
                <th scope="col">Ghi chú cố vấn học tập</th>
                <th scope="col">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoster.map((student) => {
                const subCount = allSubmissions.filter((s) => s.studentCode === student.studentCode).length;
                const switchableAcc = accounts.find((a) => a.code === student.studentCode);
                const isEditing = editingStudentCode === student.studentCode;

                return (
                  <tr key={student.studentCode}>
                    <td className="ad-code">{student.studentCode}</td>
                    <td className="ad-name">
                      <strong>{student.fullName}</strong>
                      <small>
                        {student.email} · {student.phone}
                      </small>
                    </td>
                    <td>
                      <span
                        className={`chip ${
                          student.roleInClass !== "Thành viên lớp" ? "reviewed" : ""
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
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          max={4}
                          value={gpaDraft}
                          onChange={(e) => setGpaDraft(e.target.value)}
                          style={{ width: 68 }}
                        />
                      ) : (
                        <strong>{student.gpa.toFixed(2)}</strong>
                      )}
                    </td>
                    <td>
                      <code>
                        {subCount}/{data.assignments.length} bài
                      </code>
                    </td>
                    <td style={{ maxWidth: 280 }}>
                      {isEditing ? (
                        <textarea
                          rows={2}
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          style={{ width: "100%", fontSize: "0.82rem" }}
                        />
                      ) : (
                        <span style={{ fontSize: "0.84rem", color: "var(--muted)" }}>
                          {student.teacherNote}
                        </span>
                      )}
                    </td>
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
                            <Icon name="pen" /> Sửa sổ cố vấn
                          </button>
                        )}
                        {switchableAcc && (
                          <button
                            type="button"
                            className="button button-quiet button-xs"
                            onClick={() => switchAccount(switchableAcc.id)}
                          >
                            Xem góc nhìn SV
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        title={`Bảng tin thông báo lớp ${account.cohortClass}`}
        action={<span className="reg-table-meta">{classAnnouncements.length} thông báo đã phát hành</span>}
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
    </div>
  );
}
