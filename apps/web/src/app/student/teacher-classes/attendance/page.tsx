"use client";

import { FormEvent, useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { PageTitle, Section, StatTile } from "@/components/portal/Parts";
import type { AttendanceMarkStatus } from "@/lib/accounts";
import { useStudent } from "@/lib/student-context";

const ATTENDANCE_LABELS: Record<AttendanceMarkStatus, string> = {
  present: "Có mặt",
  excused: "Vắng có phép",
  unexcused: "Vắng không phép",
};

export default function TeacherAttendancePage() {
  const {
    data,
    roster,
    subjectClasses,
    attendanceSessions,
    createAttendanceSession,
    updateAttendanceSessionMark,
  } = useStudent();

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState("");

  // New attendance session state
  const [showNewSession, setShowNewSession] = useState(false);
  const [attSubjectId, setAttSubjectId] = useState("11111111-1111-4111-8111-111111111101");
  const [attDate, setAttDate] = useState(() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  });
  const [attPeriods, setAttPeriods] = useState("Tiết 1 - 3");
  const [attTopic, setAttTopic] = useState("");
  const [attDraftMarks, setAttDraftMarks] = useState<Record<string, AttendanceMarkStatus>>({});
  const [attDraftNotes, setAttDraftNotes] = useState<Record<string, string>>({});

  const filteredSessions = useMemo(
    () =>
      selectedSubjectId
        ? attendanceSessions.filter((s) => s.subjectClassId === selectedSubjectId)
        : attendanceSessions,
    [attendanceSessions, selectedSubjectId],
  );

  if (!data) return null;

  const currentSession =
    filteredSessions.find((s) => s.id === activeSessionId) ?? filteredSessions[0] ?? null;

  const avgAttendance = roster.length
    ? Math.round(roster.reduce((sum, item) => sum + item.attendancePct, 0) / roster.length)
    : 100;
  const eligibleCount = roster.filter((item) => item.attendancePct >= 80).length;
  const warningCount = roster.filter((item) => item.attendancePct < 85).length;

  function openNewRollCall() {
    setAttSubjectId(selectedSubjectId || subjectClasses[0]?.id || "11111111-1111-4111-8111-111111111101");
    const nextMarks: Record<string, AttendanceMarkStatus> = {};
    for (const st of roster) {
      nextMarks[st.studentCode] = "present";
    }
    setAttDraftMarks(nextMarks);
    setAttDraftNotes({});
    setShowNewSession(true);
  }

  function handleCreateSession(event: FormEvent) {
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
    setShowNewSession(false);
    setStatusMessage(`Đã lưu sổ điểm danh buổi học ngày ${attDate} (${attPeriods}).`);
  }

  return (
    <div className="tcm-page">
      <PageTitle
        title="Quản lý Thông tin Điểm danh & Chuyên cần"
        lead="Sổ điểm danh điện tử theo từng lớp bộ môn · Tự động tính tỷ lệ chuyên cần và xét điều kiện dự thi kết thúc học phần"
      >
        <div className="role-action-bar">
          <label className="asg-class-select tcm-subject-filter">
            <span className="sr-only">Lọc theo lớp bộ môn</span>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
            >
              <option value="">Tất cả lớp bộ môn ({subjectClasses.length})</option>
              {subjectClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.courseCode} · {cls.name} ({cls.cohortClass})
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="button button-primary button-small"
            onClick={openNewRollCall}
          >
            <Icon name="checkCircle" /> Tạo buổi điểm danh mới
          </button>
        </div>
      </PageTitle>

      {statusMessage && (
        <div className="notice ok" role="status">
          <Icon name="checkCircle" />
          <div>
            <strong>Đã cập nhật sổ điểm danh</strong>
            <p>{statusMessage}</p>
          </div>
          <button type="button" className="button button-quiet button-xs" onClick={() => setStatusMessage("")}>
            Đóng
          </button>
        </div>
      )}

      <div className="pt-stats">
        <StatTile
          icon="checkCircle"
          label="Tỷ lệ chuyên cần TB"
          value={`${avgAttendance}%`}
          note="Tính trên toàn bộ các buổi đã học"
          tone="good"
        />
        <StatTile
          icon="calendar"
          label="Số buổi đã điểm danh"
          value={`${filteredSessions.length} buổi`}
          note="Lưu trữ đầy đủ lịch sử từng ca học"
          tone="good"
        />
        <StatTile
          icon="award"
          label="Đủ điều kiện dự thi"
          value={`${eligibleCount}/${roster.length} SV`}
          note="Chuyên cần đạt từ 80% số tiết trở lên"
          tone="good"
        />
        <StatTile
          icon="alert"
          label="Cảnh báo vắng học"
          value={`${warningCount} SV`}
          note="Chuyên cần dưới 85% cần nhắc nhở"
          tone={warningCount > 0 ? "warn" : "good"}
        />
      </div>

      {showNewSession && (
        <section className="card rbac-compose-card" aria-label="Điểm danh buổi học mới">
          <div className="card-head">
            <h3>Lập phiếu điểm danh buổi học mới</h3>
            <button type="button" className="button button-quiet button-xs" onClick={() => setShowNewSession(false)}>
              Đóng
            </button>
          </div>
          <form className="pt-form" onSubmit={handleCreateSession}>
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
                Ngày học
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
                  placeholder="VD: Kiểm thử tích hợp & Thiết kế bộ test JUnit"
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
                    <th scope="col">Ghi chú lý do</th>
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
                          <div className="tcm-mark-pills">
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
                <Icon name="check" /> Lưu phiên điểm danh
              </button>
            </div>
          </form>
        </section>
      )}

      <Section
        title="Sổ điểm danh chi tiết theo từng buổi học"
        action={<span className="reg-table-meta">Chọn buổi học bên trái để xem hoặc chỉnh sửa trạng thái điểm danh</span>}
      >
        <div className="tcm-att-layout">
          <div className="tcm-att-sessions">
            <div className="tcm-subhead">
              <strong>Danh sách buổi học</strong>
              <small>{filteredSessions.length} buổi</small>
            </div>
            <div className="tcm-session-list">
              {filteredSessions.map((sess) => {
                const subj = subjectClasses.find((c) => c.id === sess.subjectClassId);
                const isCurrent = currentSession?.id === sess.id;
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
            {currentSession ? (
              <>
                <div className="tcm-subhead">
                  <div>
                    <strong>
                      Buổi học ngày {currentSession.date} · {currentSession.periods}
                    </strong>
                    <p className="pt-muted" style={{ margin: "2px 0 0", fontSize: 13 }}>
                      Nội dung: {currentSession.topic}
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
                          currentSession.marks[st.studentCode] ?? "present";
                        const note = currentSession.notes[st.studentCode] ?? "";
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
                                        currentSession.id,
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
                <strong>Chưa có phiên điểm danh nào</strong>
                <p>Bấm &ldquo;Tạo buổi điểm danh mới&rdquo; để bắt đầu điểm danh lớp học phần.</p>
              </div>
            )}
          </div>
        </div>
      </Section>
    </div>
  );
}
