"use client";

import type { Route } from "next";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { PageTitle, Section, StatTile } from "@/components/portal/Parts";
import type {
  AttendanceMarkStatus,
  ClassStudentRosterItem,
} from "@/lib/accounts";
import { classCode, formatDate, formatDeadline } from "@/lib/format";
import { useStudent } from "@/lib/student-context";

type ActiveTab = "all" | "homeroom" | "subjects" | "attendance" | "assignments";

const ATTENDANCE_LABELS: Record<AttendanceMarkStatus, string> = {
  present: "Có mặt",
  excused: "Vắng có phép",
  unexcused: "Vắng không phép",
};

export default function TeacherClassManagementPage() {
  const {
    data,
    account,
    accounts,
    switchAccount,
    roster,
    subjectClasses,
    attendanceSessions,
    allSubmissions,
    classAnnouncements,
    updateStudentNote,
    addClassStudent,
    addSubjectClass,
    createAttendanceSession,
    updateAttendanceSessionMark,
    createAssignment,
    gradeSubmission,
    postClassAnnouncement,
  } = useStudent();

  const [activeTab, setActiveTab] = useState<ActiveTab>("all");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState("");

  // Homeroom student management state
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudentCode, setNewStudentCode] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentPhone, setNewStudentPhone] = useState("");
  const [newStudentRole, setNewStudentRole] =
    useState<ClassStudentRosterItem["roleInClass"]>("Thành viên lớp");
  const [editingStudentCode, setEditingStudentCode] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [attendanceDraft, setAttendanceDraft] = useState(100);

  // Class announcement state
  const [showNewNotice, setShowNewNotice] = useState(false);
  const [noticeClassId, setNoticeClassId] = useState("11111111-1111-4111-8111-111111111101");
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeBody, setNoticeBody] = useState("");

  // Subject class creation state
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [subjClassCode, setSubjClassCode] = useState("");
  const [subjCourseCode, setSubjCourseCode] = useState("IT3040");
  const [subjName, setSubjName] = useState("");
  const [subjCredits, setSubjCredits] = useState("3");
  const [subjCohort, setSubjCohort] = useState("DK13-CNTT1");
  const [subjSchedule, setSubjSchedule] = useState("Thứ 3 (Tiết 1–3) · Thứ 5 (Tiết 6–9)");
  const [subjRoom, setSubjRoom] = useState("A1-301 / B1-Lab 3");
  const [subjPeriods, setSubjPeriods] = useState("60");

  // Attendance roll-call state
  const [showNewAttendance, setShowNewAttendance] = useState(false);
  const [attSubjectId, setAttSubjectId] = useState("11111111-1111-4111-8111-111111111101");
  const [attDate, setAttDate] = useState(() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  });
  const [attPeriods, setAttPeriods] = useState("Tiết 1 - 3");
  const [attTopic, setAttTopic] = useState("");
  const [attDraftMarks, setAttDraftMarks] = useState<Record<string, AttendanceMarkStatus>>({});
  const [attDraftNotes, setAttDraftNotes] = useState<Record<string, string>>({});
  const [activeSessionId, setActiveSessionId] = useState<string>("");

  // Assignment & grading state
  const [showNewAssignment, setShowNewAssignment] = useState(false);
  const [asgClassId, setAsgClassId] = useState("11111111-1111-4111-8111-111111111101");
  const [asgTitle, setAsgTitle] = useState("");
  const [asgInstructions, setAsgInstructions] = useState("");
  const [asgDueDays, setAsgDueDays] = useState("7");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
  const [gradingSubId, setGradingSubId] = useState<string | null>(null);
  const [scoreDraft, setScoreDraft] = useState("9.0");
  const [feedbackDraft, setFeedbackDraft] = useState("");

  if (!data) return null;

  const isTeacher = account.role === "teacher" || account.permissions.canManageClassRoster;
  const activeSubjectId = selectedSubjectId || subjectClasses[0]?.id || "11111111-1111-4111-8111-111111111101";

  const avgAttendance = roster.length
    ? Math.round(roster.reduce((sum, item) => sum + item.attendancePct, 0) / roster.length)
    : 100;
  const warningStudentsCount = roster.filter((item) => item.attendancePct < 85 || item.status === "warning").length;
  const totalSubjectPeriods = subjectClasses.reduce((sum, item) => sum + item.totalPeriods, 0);
  const completedSubjectPeriods = subjectClasses.reduce((sum, item) => sum + item.completedPeriods, 0);
  const pendingGradingCount = allSubmissions.filter((item) => item.status === "submitted").length;
  const gradedCount = allSubmissions.filter((item) => item.status === "reviewed").length;

  const filteredSessions = useMemo(
    () =>
      selectedSubjectId
        ? attendanceSessions.filter((s) => s.subjectClassId === selectedSubjectId)
        : attendanceSessions,
    [attendanceSessions, selectedSubjectId],
  );

  const currentAttendanceSession =
    filteredSessions.find((s) => s.id === activeSessionId) ?? filteredSessions[0] ?? null;

  const filteredAssignments = useMemo(
    () =>
      selectedSubjectId
        ? data.assignments.filter((a) => a.classId === selectedSubjectId)
        : data.assignments,
    [data.assignments, selectedSubjectId],
  );

  const focusedAssignment =
    filteredAssignments.find((a) => a.id === selectedAssignmentId) ??
    filteredAssignments[0] ??
    null;

  function openRollCallForm(targetSubjectId?: string) {
    const classId = targetSubjectId || activeSubjectId;
    setAttSubjectId(classId);
    const initialMarks: Record<string, AttendanceMarkStatus> = {};
    for (const st of roster) {
      initialMarks[st.studentCode] = "present";
    }
    setAttDraftMarks(initialMarks);
    setAttDraftNotes({});
    setShowNewAttendance(true);
  }

  function handleSaveAttendanceSession(event: FormEvent) {
    event.preventDefault();
    if (!attTopic.trim()) return;
    const marks: Record<string, AttendanceMarkStatus> = {};
    for (const st of roster) {
      marks[st.studentCode] = attDraftMarks[st.studentCode] ?? "present";
    }
    const created = createAttendanceSession({
      subjectClassId: attSubjectId,
      date: attDate,
      periods: attPeriods,
      topic: attTopic,
      marks,
      notes: attDraftNotes,
    });
    setActiveSessionId(created.id);
    setAttTopic("");
    setShowNewAttendance(false);
    const subj = subjectClasses.find((c) => c.id === attSubjectId);
    setStatusMessage(
      `Đã lưu sổ điểm danh buổi học ngày ${attDate} (${attPeriods}) cho lớp bộ môn ${subj?.name ?? "học phần"}.`,
    );
  }

  function handleAddSubjectClass(event: FormEvent) {
    event.preventDefault();
    if (!subjName.trim()) return;
    const created = addSubjectClass({
      classCode: subjClassCode,
      courseCode: subjCourseCode,
      name: subjName.includes("(") ? subjName : `${subjName.trim()} (${subjCourseCode.trim().toUpperCase()})`,
      credits: Number(subjCredits) || 3,
      cohortClass: subjCohort,
      schedule: subjSchedule,
      room: subjRoom,
      totalPeriods: Number(subjPeriods) || 60,
    });
    setSelectedSubjectId(created.id);
    setSubjClassCode("");
    setSubjName("");
    setShowAddSubject(false);
    setStatusMessage(`Đã mở thêm lớp bộ môn "${created.name}" (${created.classCode}).`);
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
    setStatusMessage(`Đã bổ sung sinh viên ${newStudentName.trim()} (${newStudentCode.trim()}) vào lớp ${account.cohortClass}.`);
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
    setStatusMessage(`Đã cập nhật thông tin chuyên cần & ghi chú cố vấn cho sinh viên ${studentCode}.`);
  }

  function handleCreateAssignment(event: FormEvent) {
    event.preventDefault();
    if (!asgTitle.trim()) return;
    const days = Math.max(1, Number(asgDueDays) || 7);
    const due = new Date(Date.now() + days * 86_400_000);
    due.setHours(23, 59, 0, 0);
    const created = createAssignment({
      classId: asgClassId,
      title: asgTitle,
      instructions: asgInstructions,
      dueAt: due.toISOString(),
    });
    setSelectedAssignmentId(created.id);
    setAsgTitle("");
    setAsgInstructions("");
    setShowNewAssignment(false);
    setStatusMessage(`Đã giao bài tập "${created.title}" cho lớp bộ môn.`);
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
    setStatusMessage("Đã đăng thông báo học vụ mới tới sinh viên trong lớp.");
  }

  function openGradeEditor(subId: string, currentScore: number | null, currentFeedback: string | null) {
    setGradingSubId(subId);
    setScoreDraft(currentScore !== null ? String(currentScore) : "9.0");
    setFeedbackDraft(
      currentFeedback
        ? currentFeedback.replace(/^Điểm\s+[\d.]+\/10\s*·\s*/, "")
        : "Bài làm đáp ứng tốt yêu cầu của học phần, trình bày mã nguồn rõ ràng.",
    );
  }

  function handleSaveGrade(subId: string, studentName: string) {
    const numeric = Number(scoreDraft);
    if (Number.isNaN(numeric) || numeric < 0 || numeric > 10) return;
    gradeSubmission({
      submissionId: subId,
      score: numeric,
      feedback: feedbackDraft,
      gradedBy: account.displayName,
    });
    setGradingSubId(null);
    setStatusMessage(`Đã chấm ${numeric}/10 và gửi nhận xét cho sinh viên ${studentName}.`);
  }

  return (
    <div className="tcm-page">
      <PageTitle
        title="Quản lý lớp học & Lớp bộ môn"
        lead={`Giảng viên phụ trách: ${account.displayName} (${account.code}) · ${account.department} · Cố vấn học tập lớp ${account.cohortClass}`}
      >
        <div className="role-action-bar">
          {!isTeacher && (
            <button
              type="button"
              className="button button-primary button-small"
              onClick={() => switchAccount("acc-teacher-duc")}
            >
              <Icon name="shield" /> Chuyển sang tài khoản Giảng viên (ThS. Trần Minh Đức)
            </button>
          )}
          <button
            type="button"
            className="button button-primary button-small"
            onClick={() => openRollCallForm()}
          >
            <Icon name="checkCircle" /> Điểm danh buổi học
          </button>
          <button
            type="button"
            className="button button-outline button-small"
            onClick={() => {
              setAsgClassId(activeSubjectId);
              setShowNewAssignment((v) => !v);
            }}
          >
            <Icon name="plus" /> Giao bài tập mới
          </button>
          <button
            type="button"
            className="button button-outline button-small"
            onClick={() => setShowAddSubject((v) => !v)}
          >
            <Icon name="class" /> Thêm lớp bộ môn
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
        <div className="notice ok" role="status" style={{ marginBottom: 16 }}>
          <Icon name="checkCircle" />
          <div>
            <strong>Đã cập nhật trên Không gian Quản lý lớp học</strong>
            <p>{statusMessage}</p>
          </div>
          <button
            type="button"
            className="button button-quiet button-xs"
            onClick={() => setStatusMessage("")}
          >
            Đóng
          </button>
        </div>
      )}

      <div className="pt-stats">
        <StatTile
          icon="users"
          label={`Lớp chủ nhiệm ${account.cohortClass}`}
          value={`${roster.length} sinh viên`}
          note="Cố vấn học tập & quản lý sĩ số"
          tone="good"
        />
        <StatTile
          icon="class"
          label="Lớp bộ môn giảng dạy"
          value={`${subjectClasses.length} lớp HP`}
          note={`Đã dạy ${completedSubjectPeriods}/${totalSubjectPeriods} tiết HK1`}
          tone="good"
        />
        <StatTile
          icon="checkCircle"
          label="Điểm danh & Chuyên cần"
          value={`${avgAttendance}%`}
          note={`${attendanceSessions.length} buổi đã điểm danh · ${warningStudentsCount} SV lưu ý`}
          tone={warningStudentsCount > 0 ? "warn" : "good"}
        />
        <StatTile
          icon="assignment"
          label="Bài tập & Chấm điểm"
          value={`${gradedCount}/${allSubmissions.length} bài`}
          note={`${data.assignments.length} đề bài · ${pendingGradingCount} bài chờ chấm`}
          tone={pendingGradingCount > 0 ? "warn" : "good"}
        />
      </div>

      {/* Filter & Navigation Bar */}
      <div className="tcm-toolbar">
        <div className="asg-tabs" role="tablist" aria-label="Phân hệ quản lý lớp học của giảng viên">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "all"}
            aria-pressed={activeTab === "all"}
            onClick={() => setActiveTab("all")}
          >
            <span>Tất cả phân hệ</span>
            <code>4</code>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "subjects"}
            aria-pressed={activeTab === "subjects"}
            onClick={() => setActiveTab("subjects")}
          >
            <span>Lớp bộ môn</span>
            <code>{subjectClasses.length}</code>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "homeroom"}
            aria-pressed={activeTab === "homeroom"}
            onClick={() => setActiveTab("homeroom")}
          >
            <span>Lớp chủ nhiệm ({account.cohortClass})</span>
            <code>{roster.length}</code>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "attendance"}
            aria-pressed={activeTab === "attendance"}
            onClick={() => setActiveTab("attendance")}
          >
            <span>Điểm danh</span>
            <code>{attendanceSessions.length}</code>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "assignments"}
            aria-pressed={activeTab === "assignments"}
            onClick={() => setActiveTab("assignments")}
          >
            <span>Bài tập & Chấm bài</span>
            <code>{data.assignments.length}</code>
          </button>
        </div>

        <label className="asg-class-select tcm-subject-filter">
          <span className="sr-only">Lọc theo lớp bộ môn</span>
          <select
            value={selectedSubjectId}
            onChange={(event) => setSelectedSubjectId(event.target.value)}
          >
            <option value="">Tất cả lớp bộ môn ({subjectClasses.length})</option>
            {subjectClasses.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.courseCode} · {cls.name} ({cls.cohortClass})
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Compose Modals / Cards */}
      {showAddSubject && (
        <section className="card rbac-compose-card" aria-label="Thêm lớp bộ môn mới">
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
                  placeholder="A1-305 / B1-Lab 2"
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

      {showNewAttendance && (
        <section className="card rbac-compose-card" aria-label="Điểm danh buổi học mới">
          <div className="card-head">
            <h3>Điểm danh buổi học theo lớp bộ môn</h3>
            <button type="button" className="button button-quiet button-xs" onClick={() => setShowNewAttendance(false)}>
              Đóng
            </button>
          </div>
          <form className="pt-form" onSubmit={handleSaveAttendanceSession}>
            <div className="ad-grid">
              <label className="field">
                Lớp bộ môn
                <select value={attSubjectId} onChange={(e) => setAttSubjectId(e.target.value)}>
                  {subjectClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.courseCode} · {cls.name} ({cls.cohortClass})
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Ngày điểm danh
                <input
                  type="text"
                  required
                  value={attDate}
                  onChange={(e) => setAttDate(e.target.value)}
                  placeholder="VD: 01/11/2026"
                />
              </label>
              <label className="field">
                Ca / Tiết học
                <input
                  type="text"
                  required
                  value={attPeriods}
                  onChange={(e) => setAttPeriods(e.target.value)}
                  placeholder="VD: Tiết 1 - 3 (Lý thuyết A1-301)"
                />
              </label>
              <label className="field">
                Nội dung bài giảng / Thực hành
                <input
                  type="text"
                  required
                  value={attTopic}
                  onChange={(e) => setAttTopic(e.target.value)}
                  placeholder="VD: Thực hành mẫu thiết kế chiến lược & kiểm thử đơn vị"
                />
              </label>
            </div>

            <div className="tcm-rollcall-bar">
              <span>Đánh dấu nhanh toàn lớp ({roster.length} SV):</span>
              <button
                type="button"
                className="button button-outline button-xs"
                onClick={() => {
                  const next: Record<string, AttendanceMarkStatus> = {};
                  for (const st of roster) next[st.studentCode] = "present";
                  setAttDraftMarks(next);
                }}
              >
                <Icon name="checkCircle" /> Có mặt tất cả (100%)
              </button>
            </div>

            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead>
                  <tr>
                    <th scope="col">MSSV</th>
                    <th scope="col">Họ và tên sinh viên</th>
                    <th scope="col">Trạng thái điểm danh</th>
                    <th scope="col">Ghi chú lý do (nếu vắng)</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((st) => {
                    const currentMark = attDraftMarks[st.studentCode] ?? "present";
                    return (
                      <tr key={st.studentCode}>
                        <td className="ad-code">{st.studentCode}</td>
                        <td className="ad-name">
                          <strong>{st.fullName}</strong>
                          <small>{st.roleInClass}</small>
                        </td>
                        <td>
                          <div className="tcm-mark-pills" role="radiogroup" aria-label={`Điểm danh ${st.fullName}`}>
                            {(["present", "excused", "unexcused"] as const).map((status) => (
                              <button
                                key={status}
                                type="button"
                                className={`tcm-mark-btn is-${status}${currentMark === status ? " is-selected" : ""}`}
                                onClick={() =>
                                  setAttDraftMarks((prev) => ({
                                    ...prev,
                                    [st.studentCode]: status,
                                  }))
                                }
                              >
                                {ATTENDANCE_LABELS[status]}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td>
                          <input
                            type="text"
                            className="tcm-note-input"
                            value={attDraftNotes[st.studentCode] ?? ""}
                            onChange={(e) =>
                              setAttDraftNotes((prev) => ({
                                ...prev,
                                [st.studentCode]: e.target.value,
                              }))
                            }
                            placeholder={currentMark === "present" ? "Đi học đúng giờ" : "Nhập lý do vắng học…"}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pt-form-actions">
              <button type="submit" className="button button-primary button-small">
                <Icon name="check" /> Lưu sổ điểm danh buổi học
              </button>
            </div>
          </form>
        </section>
      )}

      {showNewAssignment && (
        <section className="card rbac-compose-card" aria-label="Giao bài tập mới cho lớp bộ môn">
          <div className="card-head">
            <h3>Giao bài tập học phần mới cho lớp bộ môn</h3>
            <button type="button" className="button button-quiet button-xs" onClick={() => setShowNewAssignment(false)}>
              Đóng
            </button>
          </div>
          <form className="pt-form" onSubmit={handleCreateAssignment}>
            <div className="ad-grid">
              <label className="field">
                Lớp bộ môn nhận bài
                <select value={asgClassId} onChange={(e) => setAsgClassId(e.target.value)}>
                  {subjectClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.courseCode} · {cls.name} ({cls.cohortClass})
                    </option>
                  ))}
                  {data.session.classes
                    .filter((c) => !subjectClasses.some((s) => s.id === c.id))
                    .map((cls) => (
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
                placeholder="VD: Bài thực hành 3: Kiểm thử tích hợp & Thiết kế bộ test JUnit 5"
              />
            </label>
            <label className="field">
              Nội dung yêu cầu & Tiêu chí chấm điểm
              <textarea
                rows={3}
                required
                value={asgInstructions}
                onChange={(e) => setAsgInstructions(e.target.value)}
                placeholder="Mô tả yêu cầu bài tập, định dạng nộp và thang điểm đánh giá…"
              />
            </label>
            <div className="pt-form-actions">
              <button type="submit" className="button button-primary button-small">
                <Icon name="send" /> Công bố bài tập ngay
              </button>
            </div>
          </form>
        </section>
      )}

      {showNewNotice && (
        <section className="card rbac-compose-card" aria-label="Đăng thông báo lớp">
          <div className="card-head">
            <h3>Đăng thông báo học vụ tới lớp</h3>
            <button type="button" className="button button-quiet button-xs" onClick={() => setShowNewNotice(false)}>
              Đóng
            </button>
          </div>
          <form className="pt-form" onSubmit={handlePostNotice}>
            <label className="field">
              Áp dụng cho lớp
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
                placeholder="VD: Lịch chấm thực hành trên phòng máy B1-Lab 3"
              />
            </label>
            <label className="field">
              Nội dung chi tiết
              <textarea
                rows={3}
                required
                value={noticeBody}
                onChange={(e) => setNoticeBody(e.target.value)}
                placeholder="Nhập nội dung thông báo gửi tới toàn bộ sinh viên trong lớp…"
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

      {/* 1. QUẢN LÝ CÁC LỚP BỘ MÔN */}
      {(activeTab === "all" || activeTab === "subjects") && (
        <Section
          title="1. Quản lý các lớp bộ môn giảng dạy"
          action={
            <div className="role-action-bar">
              <span className="reg-table-meta">{subjectClasses.length} lớp học phần đang phụ trách</span>
              <button
                type="button"
                className="button button-outline button-xs"
                onClick={() => setShowAddSubject((v) => !v)}
              >
                <Icon name="plus" /> Mở lớp bộ môn
              </button>
            </div>
          }
        >
          <div className="tcm-subject-grid">
            {subjectClasses.map((subj) => {
              const isSelected = selectedSubjectId === subj.id;
              const classAsgCount = data.assignments.filter((a) => a.classId === subj.id).length;
              const classAttCount = attendanceSessions.filter((s) => s.subjectClassId === subj.id).length;
              const progressPct = Math.min(100, Math.round((subj.completedPeriods / subj.totalPeriods) * 100));

              return (
                <article
                  key={subj.id}
                  className={`tcm-subject-card${isSelected ? " is-selected" : ""}`}
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
                    <button
                      type="button"
                      className="button button-primary button-xs"
                      onClick={() => {
                        setSelectedSubjectId(subj.id);
                        openRollCallForm(subj.id);
                      }}
                    >
                      <Icon name="checkCircle" /> Điểm danh
                    </button>
                    <button
                      type="button"
                      className="button button-outline button-xs"
                      onClick={() => {
                        setSelectedSubjectId(subj.id);
                        setAsgClassId(subj.id);
                        setShowNewAssignment(true);
                      }}
                    >
                      <Icon name="plus" /> Giao bài tập
                    </button>
                    <Link
                      className="button button-quiet button-xs"
                      href={`/student/classes/${subj.id}` as Route}
                    >
                      Chi tiết LHP <Icon name="arrow" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </Section>
      )}

      {/* 2. QUẢN LÝ THÔNG TIN ĐIỂM DANH CỦA GIÁO VIÊN */}
      {(activeTab === "all" || activeTab === "attendance") && (
        <Section
          title="2. Quản lý thông tin điểm danh & Chuyên cần theo lớp bộ môn"
          action={
            <div className="role-action-bar">
              <span className="reg-table-meta">
                {filteredSessions.length} phiên điểm danh · Quy chế: nghỉ quá 20% số tiết bị cấm thi
              </span>
              <button
                type="button"
                className="button button-primary button-xs"
                onClick={() => openRollCallForm()}
              >
                <Icon name="plus" /> Tạo phiên điểm danh mới
              </button>
            </div>
          }
        >
          <div className="tcm-att-layout">
            <div className="tcm-att-sessions">
              <div className="tcm-subhead">
                <strong>Nhật ký các buổi điểm danh</strong>
                <small>{filteredSessions.length} buổi</small>
              </div>
              <div className="tcm-session-list">
                {filteredSessions.map((sess) => {
                  const subj = subjectClasses.find((c) => c.id === sess.subjectClassId);
                  const isCurrent = currentAttendanceSession?.id === sess.id;
                  const presentCount = roster.filter(
                    (st) => (sess.marks[st.studentCode] ?? "present") === "present",
                  ).length;
                  const excusedCount = roster.filter(
                    (st) => sess.marks[st.studentCode] === "excused",
                  ).length;
                  const unexcusedCount = roster.filter(
                    (st) => sess.marks[st.studentCode] === "unexcused",
                  ).length;

                  return (
                    <button
                      key={sess.id}
                      type="button"
                      className={`tcm-session-item${isCurrent ? " is-selected" : ""}`}
                      onClick={() => setActiveSessionId(sess.id)}
                    >
                      <div className="tcm-session-item-top">
                        <span className="chip">{subj?.courseCode ?? "LHP"}</span>
                        <code>{sess.date}</code>
                      </div>
                      <strong>{sess.topic}</strong>
                      <small>{sess.periods}</small>
                      <div className="tcm-session-counts">
                        <span className="is-good">Có mặt: {presentCount}/{roster.length}</span>
                        {excusedCount > 0 && <span className="is-warn">Có phép: {excusedCount}</span>}
                        {unexcusedCount > 0 && <span className="is-bad">Không phép: {unexcusedCount}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="tcm-att-detail">
              {currentAttendanceSession ? (
                <>
                  <div className="tcm-subhead">
                    <div>
                      <strong>
                        Bảng điểm danh ngày {currentAttendanceSession.date} · {currentAttendanceSession.periods}
                      </strong>
                      <p className="pt-muted" style={{ margin: "2px 0 0", fontSize: 13 }}>
                        Bài giảng: {currentAttendanceSession.topic} (Bấm trực tiếp vào trạng thái để cập nhật điểm danh)
                      </p>
                    </div>
                  </div>
                  <div className="ad-table-wrap">
                    <table className="ad-table">
                      <thead>
                        <tr>
                          <th scope="col">MSSV</th>
                          <th scope="col">Họ và tên</th>
                          <th scope="col">Trạng thái buổi học</th>
                          <th scope="col">Tỷ lệ chuyên cần</th>
                          <th scope="col">ĐK dự thi</th>
                          <th scope="col">Ghi chú điểm danh</th>
                        </tr>
                      </thead>
                      <tbody>
                        {roster.map((st) => {
                          const mark: AttendanceMarkStatus =
                            currentAttendanceSession.marks[st.studentCode] ?? "present";
                          const note = currentAttendanceSession.notes[st.studentCode] ?? "";
                          const eligible = st.attendancePct >= 80;

                          return (
                            <tr key={st.studentCode}>
                              <td className="ad-code">{st.studentCode}</td>
                              <td className="ad-name">
                                <strong>{st.fullName}</strong>
                                <small>{st.roleInClass}</small>
                              </td>
                              <td>
                                <div className="tcm-mark-pills">
                                  {(["present", "excused", "unexcused"] as const).map((status) => (
                                    <button
                                      key={status}
                                      type="button"
                                      className={`tcm-mark-btn is-${status}${mark === status ? " is-selected" : ""}`}
                                      onClick={() => {
                                        updateAttendanceSessionMark(
                                          currentAttendanceSession.id,
                                          st.studentCode,
                                          status,
                                        );
                                        setStatusMessage(
                                          `Đã cập nhật điểm danh của ${st.fullName} (${st.studentCode}): ${ATTENDANCE_LABELS[status]}.`,
                                        );
                                      }}
                                    >
                                      {ATTENDANCE_LABELS[status]}
                                    </button>
                                  ))}
                                </div>
                              </td>
                              <td>
                                <span className={`chip ${st.attendancePct < 85 ? "danger" : "success"}`}>
                                  {st.attendancePct}%
                                </span>
                              </td>
                              <td>
                                <span className={`chip ${eligible ? "reviewed" : "overdue"}`}>
                                  {eligible ? "Đủ ĐK" : "Cấm thi"}
                                </span>
                              </td>
                              <td style={{ fontSize: 12, color: "var(--muted)" }}>
                                {note || (mark === "present" ? "Có mặt đầy đủ" : "—")}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="empty">
                  <Icon name="checkCircle" />
                  <strong>Chưa có phiên điểm danh cho lớp bộ môn này</strong>
                  <p>Bấm &ldquo;Tạo phiên điểm danh mới&rdquo; để ghi nhận chuyên cần cho buổi học hôm nay.</p>
                </div>
              )}
            </div>
          </div>
        </Section>
      )}

      {/* 3. QUẢN LÝ BÀI TẬP & CHẤM ĐIỂM CỦA GIÁO VIÊN */}
      {(activeTab === "all" || activeTab === "assignments") && (
        <Section
          title="3. Quản lý bài tập & Chấm điểm lớp bộ môn"
          action={
            <div className="role-action-bar">
              <span className="reg-table-meta">
                {filteredAssignments.length} bài tập · {gradedCount} đã chấm · {pendingGradingCount} chờ chấm
              </span>
              <button
                type="button"
                className="button button-primary button-xs"
                onClick={() => {
                  setAsgClassId(activeSubjectId);
                  setShowNewAssignment((v) => !v);
                }}
              >
                <Icon name="plus" /> Giao bài tập mới
              </button>
            </div>
          }
        >
          <div className="tcm-att-layout">
            <div className="tcm-att-sessions">
              <div className="tcm-subhead">
                <strong>Danh sách bài tập đã giao</strong>
                <small>{filteredAssignments.length} bài</small>
              </div>
              <div className="tcm-session-list">
                {filteredAssignments.map((asg) => {
                  const subj =
                    subjectClasses.find((c) => c.id === asg.classId) ??
                    data.session.classes.find((c) => c.id === asg.classId);
                  const subsForAsg = allSubmissions.filter((s) => s.assignmentId === asg.id);
                  const gradedForAsg = subsForAsg.filter((s) => s.status === "reviewed").length;
                  const isCurrent = focusedAssignment?.id === asg.id;

                  return (
                    <button
                      key={asg.id}
                      type="button"
                      className={`tcm-session-item${isCurrent ? " is-selected" : ""}`}
                      onClick={() => setSelectedAssignmentId(asg.id)}
                    >
                      <div className="tcm-session-item-top">
                        <span className="chip">{subj ? ("courseCode" in subj ? subj.courseCode : classCode(subj.id)) : "LHP"}</span>
                        <code>Hạn: {formatDeadline(asg.dueAt)}</code>
                      </div>
                      <strong>{asg.title}</strong>
                      <div className="tcm-session-counts">
                        <span className="is-good">Đã nộp: {subsForAsg.length}/{roster.length} SV</span>
                        <span className="is-warn">Đã chấm: {gradedForAsg}/{subsForAsg.length}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="tcm-att-detail">
              {focusedAssignment ? (
                <>
                  <div className="tcm-subhead">
                    <div>
                      <strong>{focusedAssignment.title}</strong>
                      <p className="pt-muted" style={{ margin: "2px 0 0", fontSize: 13 }}>
                        Hạn nộp: {formatDeadline(focusedAssignment.dueAt)} · {focusedAssignment.instructions}
                      </p>
                    </div>
                    <Link
                      className="button button-outline button-xs"
                      href={`/student/assignments/${focusedAssignment.id}` as Route}
                    >
                      Mở trang bài tập <Icon name="arrow" />
                    </Link>
                  </div>

                  <div className="teacher-grade-list">
                    {roster.map((student) => {
                      const stuSub = allSubmissions.find(
                        (item) =>
                          item.assignmentId === focusedAssignment.id &&
                          item.studentCode === student.studentCode,
                      );
                      const isGradingThis = gradingSubId === stuSub?.id;

                      return (
                        <article key={student.studentCode} className="card teacher-grade-card">
                          <div className="teacher-grade-head">
                            <div>
                              <strong>{student.fullName}</strong>
                              <span className="ad-code" style={{ marginLeft: 8 }}>{student.studentCode}</span>
                              <span className="chip" style={{ marginLeft: 8 }}>{student.roleInClass}</span>
                            </div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              {stuSub ? (
                                <span className={`chip ${stuSub.status === "reviewed" ? "reviewed" : "submitted"}`}>
                                  {stuSub.status === "reviewed"
                                    ? `Đã chấm · ${stuSub.score ?? "—"}/10`
                                    : "Chờ giảng viên chấm"}
                                </span>
                              ) : (
                                <span className="chip warning">Chưa nộp bài</span>
                              )}
                            </div>
                          </div>

                          {stuSub ? (
                            <>
                              <div className="prose-block submitted-copy" style={{ marginTop: 8 }}>
                                {stuSub.content}
                              </div>
                              <small style={{ color: "var(--muted)", display: "block", marginTop: 4 }}>
                                Nộp lúc {formatDate(stuSub.submittedAt)}
                              </small>

                              {stuSub.feedback && !isGradingThis && (
                                <div className="teacher-feedback" style={{ marginTop: 10 }}>
                                  <h4>
                                    <Icon name="message" /> Nhận xét ({stuSub.gradedBy ?? account.displayName})
                                  </h4>
                                  <p>{stuSub.feedback}</p>
                                </div>
                              )}

                              {isGradingThis ? (
                                <div className="pt-form" style={{ marginTop: 10 }}>
                                  <div className="ad-grid">
                                    <label className="field">
                                      Điểm số (thang 10)
                                      <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max="10"
                                        value={scoreDraft}
                                        onChange={(e) => setScoreDraft(e.target.value)}
                                      />
                                    </label>
                                  </div>
                                  <label className="field">
                                    Nhận xét của giảng viên
                                    <textarea
                                      rows={2}
                                      value={feedbackDraft}
                                      onChange={(e) => setFeedbackDraft(e.target.value)}
                                    />
                                  </label>
                                  <div className="pt-form-actions">
                                    <button
                                      type="button"
                                      className="button button-primary button-xs"
                                      onClick={() => handleSaveGrade(stuSub.id, student.fullName)}
                                    >
                                      <Icon name="check" /> Lưu điểm & phản hồi
                                    </button>
                                    <button
                                      type="button"
                                      className="button button-quiet button-xs"
                                      onClick={() => setGradingSubId(null)}
                                    >
                                      Huỷ
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ marginTop: 10 }}>
                                  <button
                                    type="button"
                                    className="button button-primary button-xs"
                                    onClick={() => openGradeEditor(stuSub.id, stuSub.score, stuSub.feedback)}
                                  >
                                    <Icon name="pen" />{" "}
                                    {stuSub.status === "reviewed" ? "Sửa điểm & nhận xét" : "Chấm điểm & nhận xét"}
                                  </button>
                                </div>
                              )}
                            </>
                          ) : (
                            <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: "0.84rem" }}>
                              Sinh viên chưa gửi bài nộp cho bài tập này.
                            </p>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="empty">
                  <Icon name="assignment" />
                  <strong>Chưa có bài tập nào</strong>
                  <p>Bấm &ldquo;Giao bài tập mới&rdquo; để tạo bài tập cho lớp bộ môn.</p>
                </div>
              )}
            </div>
          </div>
        </Section>
      )}

      {/* 4. QUẢN LÝ LỚP HỌC CHỦ NHIỆM (DANH SÁCH SINH VIÊN & CỐ VẤN HỌC TẬP) */}
      {(activeTab === "all" || activeTab === "homeroom") && (
        <Section
          title={`4. Quản lý lớp học chủ nhiệm ${account.cohortClass} & Sổ cố vấn học tập`}
          action={
            <div className="role-action-bar">
              <span className="reg-table-meta">{roster.length} sinh viên chính quy</span>
              <button
                type="button"
                className="button button-outline button-xs"
                onClick={() => setShowAddStudent((v) => !v)}
              >
                <Icon name="users" /> Thêm sinh viên vào lớp
              </button>
            </div>
          }
        >
          {showAddStudent && (
            <form className="pt-form" style={{ marginBottom: 16 }} onSubmit={handleAddStudent}>
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
                  Ban cán sự / Vai trò
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
                <button type="submit" className="button button-primary button-xs">
                  <Icon name="plus" /> Lưu sinh viên vào lớp {account.cohortClass}
                </button>
                <button
                  type="button"
                  className="button button-quiet button-xs"
                  onClick={() => setShowAddStudent(false)}
                >
                  Đóng
                </button>
              </div>
            </form>
          )}

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
                {roster.map((student) => {
                  const subCount = allSubmissions.filter((s) => s.studentCode === student.studentCode).length;
                  const switchableAcc = accounts.find((a) => a.code === student.studentCode);
                  const isEditing = editingStudentCode === student.studentCode;

                  return (
                    <tr key={student.studentCode}>
                      <td className="ad-code">{student.studentCode}</td>
                      <td className="ad-name">
                        <strong>{student.fullName}</strong>
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
                      <td style={{ maxWidth: 280 }}>
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
                              <Icon name="pen" /> Sửa
                            </button>
                          )}
                          {switchableAcc && (
                            <button
                              type="button"
                              className="button button-quiet button-xs"
                              onClick={() => switchAccount(switchableAcc.id)}
                              title={`Xem cổng dưới góc nhìn ${student.fullName}`}
                            >
                              Xem TK SV
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

          {classAnnouncements.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div className="tcm-subhead" style={{ marginBottom: 8 }}>
                <strong>Thông báo đã gửi tới lớp ({classAnnouncements.length})</strong>
              </div>
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
            </div>
          )}
        </Section>
      )}
    </div>
  );
}
