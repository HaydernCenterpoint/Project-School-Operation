"use client";

import { FormEvent, useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { PageTitle, Section, StatTile } from "@/components/portal/Parts";
import { classCode, formatDate, formatDeadline } from "@/lib/format";
import { useStudent } from "@/lib/student-context";

export default function TeacherAssignmentsPage() {
  const {
    data,
    account,
    roster,
    subjectClasses,
    allSubmissions,
    createAssignment,
    gradeSubmission,
  } = useStudent();

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState("");

  // Create assignment state
  const [showNewAssignment, setShowNewAssignment] = useState(false);
  const [asgClassId, setAsgClassId] = useState("11111111-1111-4111-8111-111111111101");
  const [asgTitle, setAsgTitle] = useState("");
  const [asgInstructions, setAsgInstructions] = useState("");
  const [asgDueDays, setAsgDueDays] = useState("7");

  // Grade submission state
  const [gradingSubId, setGradingSubId] = useState<string | null>(null);
  const [scoreDraft, setScoreDraft] = useState("9.0");
  const [feedbackDraft, setFeedbackDraft] = useState("");

  const filteredAssignments = useMemo(
    () =>
      selectedSubjectId
        ? (data?.assignments ?? []).filter((a) => a.classId === selectedSubjectId)
        : (data?.assignments ?? []),
    [data?.assignments, selectedSubjectId],
  );

  if (!data) return null;

  const focusedAssignment =
    filteredAssignments.find((a) => a.id === selectedAssignmentId) ??
    filteredAssignments[0] ??
    null;

  const pendingGradingCount = allSubmissions.filter((item) => item.status === "submitted").length;
  const gradedCount = allSubmissions.filter((item) => item.status === "reviewed").length;
  const avgScore = gradedCount
    ? (
        allSubmissions
          .filter((item) => item.status === "reviewed" && item.score !== null)
          .reduce((sum, item) => sum + (item.score ?? 0), 0) / gradedCount
      ).toFixed(1)
    : "—";

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
    setStatusMessage(`Đã giao bài tập mới "${created.title}" cho lớp bộ môn.`);
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
    setStatusMessage(`Đã chấm ${numeric}/10 và gửi phản hồi cho sinh viên ${studentName}.`);
  }

  return (
    <div className="tcm-page">
      <PageTitle
        title="Quản lý Bài tập & Chấm điểm của Giáo viên"
        lead="Giao bài tập thực hành/đồ án theo lớp bộ môn · Theo dõi tiến độ nộp bài của sinh viên và chấm điểm thang 10 kèm nhận xét"
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
            onClick={() => {
              setAsgClassId(selectedSubjectId || subjectClasses[0]?.id || "11111111-1111-4111-8111-111111111101");
              setShowNewAssignment((v) => !v);
            }}
          >
            <Icon name="plus" /> Giao bài tập mới
          </button>
        </div>
      </PageTitle>

      {statusMessage && (
        <div className="notice ok" role="status">
          <Icon name="checkCircle" />
          <div>
            <strong>Đã cập nhật bài tập & điểm số</strong>
            <p>{statusMessage}</p>
          </div>
          <button type="button" className="button button-quiet button-xs" onClick={() => setStatusMessage("")}>
            Đóng
          </button>
        </div>
      )}

      <div className="pt-stats">
        <StatTile
          icon="assignment"
          label="Tổng số đề bài tập"
          value={`${data.assignments.length} bài tập`}
          note="Đã phát hành cho các lớp học phần"
          tone="good"
        />
        <StatTile
          icon="file"
          label="Tổng bài nộp của SV"
          value={`${allSubmissions.length} bài nộp`}
          note={`${gradedCount} bài đã chấm · ${pendingGradingCount} bài chờ chấm`}
          tone={pendingGradingCount > 0 ? "warn" : "good"}
        />
        <StatTile
          icon="checkCircle"
          label="Tỷ lệ hoàn thành chấm"
          value={`${Math.round((gradedCount / Math.max(1, allSubmissions.length)) * 100)}%`}
          note={`${gradedCount}/${allSubmissions.length} bài nộp đã có điểm`}
          tone="good"
        />
        <StatTile
          icon="award"
          label="Điểm trung bình bài tập"
          value={`${avgScore}/10`}
          note="Điểm quá trình các bài đã chấm"
          tone="good"
        />
      </div>

      {showNewAssignment && (
        <section className="card rbac-compose-card" aria-label="Giao bài tập mới">
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
                <Icon name="send" /> Công bố bài tập
              </button>
            </div>
          </form>
        </section>
      )}

      <Section
        title="Danh sách bài tập & Phòng chấm điểm trực tuyến"
        action={<span className="reg-table-meta">Chọn đề bài bên trái để chấm bài của từng sinh viên trong lớp</span>}
      >
        <div className="tcm-att-layout">
          <div className="tcm-att-sessions">
            <div className="tcm-subhead">
              <strong>Đề bài đã giao</strong>
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
                      <span className="chip">
                        {subj ? ("courseCode" in subj ? subj.courseCode : classCode(subj.id)) : "LHP"}
                      </span>
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
                          <div>
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
                                  Nhận xét chi tiết của giảng viên
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
                            Sinh viên chưa gửi bài nộp cho đề bài này.
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
    </div>
  );
}
