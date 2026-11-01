"use client";

import type { Route } from "next";
import Link from "next/link";
import { newTab } from "@/components/AppShell";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { DueChip } from "@/components/Dashboard";
import { Icon } from "@/components/Icon";
import { Section } from "@/components/portal/Parts";
import { academicRequest } from "@/lib/academic-client";
import { dueState, formatDate, formatDeadline } from "@/lib/format";
import { useStudent } from "@/lib/student-context";

const maxLength = 20_000;
const draftKey = (id: string, code: string) => `sao-do:draft:${id}:${code}`;

function readDraft(id: string, code: string) {
  try {
    return localStorage.getItem(draftKey(id, code)) ?? "";
  } catch {
    return "";
  }
}

function writeDraft(id: string, code: string, value: string) {
  try {
    if (value) localStorage.setItem(draftKey(id, code), value);
    else localStorage.removeItem(draftKey(id, code));
  } catch {
    // Drafts are a convenience; ignore blocked storage.
  }
}

export default function AssignmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    data,
    account,
    accounts,
    switchAccount,
    roster,
    allSubmissions,
    submitStudentWork,
    gradeSubmission,
    refresh,
  } = useStudent();
  const [now] = useState(Date.now);
  const [content, setContent] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [scoreDraft, setScoreDraft] = useState("9.0");
  const [feedbackDraft, setFeedbackDraft] = useState("");
  const attempt = useRef<{ content: string; key: string } | null>(null);

  useEffect(() => {
    queueMicrotask(() => setContent(readDraft(id, account.code)));
  }, [id, account.code]);

  if (!data) return null;
  const assignment = data.assignments.find((item) => item.id === id);
  const mySharedSubmission = allSubmissions.find(
    (item) => item.assignmentId === id && item.studentCode === account.code,
  );
  const submission = data.submissions.find((item) => item.assignmentId === id);
  const className = data.session.classes.find((item) => item.id === assignment?.classId)?.name;
  const isTeacher = account.permissions.canGradeSubmissions;
  const classSubmissions = allSubmissions.filter((item) => item.assignmentId === id);

  if (!assignment) {
    return (
      <div className="empty" style={{ marginTop: 8 }}>
        <Icon name="question" />
        <strong>Không tìm thấy bài tập</strong>
        <p>Bài tập không tồn tại hoặc bạn không có quyền truy cập.</p>
        <Link className="button button-quiet" href="/student/assignments">Về danh sách bài tập</Link>
      </div>
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || trimmed.length > maxLength || !data) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }
    if (attempt.current?.content !== trimmed) {
      attempt.current = { content: trimmed, key: crypto.randomUUID() };
    }
    setSending(true);
    setError("");
    try {
      if (data.token && data.token !== "local-multi-role-session") {
        await academicRequest("/api/submissions", data.token, {
          method: "POST",
          headers: { "Idempotency-Key": attempt.current.key },
          body: JSON.stringify({ assignmentId: id, content: trimmed }),
        });
      }
      // Save immediately to shared multi-role state so Teacher sees it right away
      submitStudentWork({
        assignmentId: id,
        content: trimmed,
        account,
      });
      writeDraft(id, account.code, "");
      setNotice(
        `Đã nộp bài thành công với tài khoản ${account.displayName} (${account.code}). Giảng viên ${account.advisorName} đã nhận được bài làm.`,
      );
      await refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Không thể nộp bài. Vui lòng thử lại.",
      );
    } finally {
      setSending(false);
      setConfirming(false);
    }
  }

  function openGradeEditor(subId: string, currentScore: number | null, currentFeedback: string | null) {
    setGradingId(subId);
    setScoreDraft(currentScore !== null ? String(currentScore) : "9.0");
    setFeedbackDraft(
      currentFeedback ? currentFeedback.replace(/^Điểm\s+[\d.]+\/10\s*·\s*/, "") : "Bài làm đúng yêu cầu, cấu trúc lớp rõ ràng.",
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
    setGradingId(null);
    setNotice(`Đã chấm ${numeric}/10 và gửi phản hồi cho sinh viên ${studentName}.`);
  }

  const overdue = dueState(assignment.dueAt, now) === "overdue";
  const length = content.trim().length;

  return (
    <>
      <Link className="back-link" href="/student/assignments">
        <Icon name="back" /> Bài tập
      </Link>

      {notice && (
        <div className="notice" role="status" style={{ marginBottom: 16 }}>
          <Icon name="checkCircle" />
          <div>
            <strong>Đã đồng bộ dữ liệu bài tập</strong>
            <p>{notice}</p>
          </div>
        </div>
      )}

      <div className="detail-grid">
        <article className="card">
          <div className="detail-head">
            {isTeacher ? (
              <span className="chip reviewed">Chế độ Giảng viên chấm bài</span>
            ) : submission ? (
              <span className={`chip ${submission.status}`}>
                {submission.status === "reviewed" ? "Đã có phản hồi" : "Đã nộp"}
              </span>
            ) : (
              <DueChip dueAt={assignment.dueAt} now={now} />
            )}
            {className && <span className="chip">{className}</span>}
            <h2>{assignment.title}</h2>
          </div>
          <div className="prose-block">{assignment.instructions || "Giảng viên không ghi yêu cầu bổ sung."}</div>
        </article>

        <div className="dash-col">
          <section className="card" aria-labelledby="info-title">
            <h3 id="info-title" style={{ margin: 0, fontSize: "1.1rem" }}>Thông tin</h3>
            <dl className="meta-list">
              <div><dt>Hạn nộp</dt><dd>{formatDeadline(assignment.dueAt)}</dd></div>
              <div><dt>Công bố</dt><dd>{formatDate(assignment.createdAt)}</dd></div>
              <div>
                <dt>{isTeacher ? "Tiến độ nộp của lớp" : "Trạng thái của bạn"}</dt>
                <dd>
                  {isTeacher
                    ? `${classSubmissions.length}/${roster.length} sinh viên đã nộp`
                    : submission
                      ? "Đã nộp"
                      : "Chưa nộp"}
                </dd>
              </div>
              {!isTeacher && mySharedSubmission?.score !== null && mySharedSubmission?.score !== undefined && (
                <div>
                  <dt>Điểm giảng viên chấm</dt>
                  <dd><strong>{mySharedSubmission.score} / 10</strong></dd>
                </div>
              )}
            </dl>
            <Link
              className="button button-quiet button-block"
              style={{ marginTop: 16 }}
              href={`/student/ai?assignment=${assignment.id}` as Route}
              {...newTab}
            >
              <Icon name="sparkle" /> Hỏi trợ lý AI về bài này
            </Link>
          </section>
        </div>
      </div>

      {isTeacher ? (
        <Section
          title={`Bảng chấm bài & Phản hồi cho sinh viên lớp ${account.cohortClass}`}
          action={
            <span className="reg-table-meta">
              {classSubmissions.length} đã nộp · {roster.length - classSubmissions.length} chưa nộp
            </span>
          }
        >
          <div className="teacher-grade-list">
            {roster.map((student) => {
              const stuSub = classSubmissions.find((item) => item.studentCode === student.studentCode);
              const switchableAcc = accounts.find((a) => a.code === student.studentCode);
              const isGradingThis = gradingId === stuSub?.id;

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
                      {switchableAcc && (
                        <button
                          type="button"
                          className="button button-quiet button-xs"
                          onClick={() => switchAccount(switchableAcc.id)}
                        >
                          Chuyển sang TK {student.fullName}
                        </button>
                      )}
                    </div>
                  </div>

                  {stuSub ? (
                    <>
                      <div className="prose-block submitted-copy" style={{ marginTop: 10 }}>
                        {stuSub.content}
                      </div>
                      <small style={{ color: "var(--muted)", display: "block", marginTop: 6 }}>
                        Nộp lúc {formatDate(stuSub.submittedAt)}
                      </small>

                      {stuSub.feedback && !isGradingThis && (
                        <div className="teacher-feedback" style={{ marginTop: 12 }}>
                          <h4><Icon name="message" /> Nhận xét đã lưu ({stuSub.gradedBy ?? account.displayName})</h4>
                          <p>{stuSub.feedback}</p>
                        </div>
                      )}

                      {isGradingThis ? (
                        <div className="pt-form" style={{ marginTop: 12 }}>
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
                              rows={3}
                              value={feedbackDraft}
                              onChange={(e) => setFeedbackDraft(e.target.value)}
                              placeholder="Nhập nhận xét chi tiết cho bài làm của sinh viên…"
                            />
                          </label>
                          <div className="pt-form-actions">
                            <button
                              type="button"
                              className="button button-primary button-small"
                              onClick={() => handleSaveGrade(stuSub.id, student.fullName)}
                            >
                              <Icon name="check" /> Lưu điểm & gửi phản hồi
                            </button>
                            <button
                              type="button"
                              className="button button-quiet button-small"
                              onClick={() => setGradingId(null)}
                            >
                              Huỷ
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ marginTop: 12 }}>
                          <button
                            type="button"
                            className="button button-primary button-small"
                            onClick={() => openGradeEditor(stuSub.id, stuSub.score, stuSub.feedback)}
                          >
                            <Icon name="pen" /> {stuSub.status === "reviewed" ? "Sửa điểm & nhận xét" : "Chấm điểm & nhận xét"}
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: "0.88rem" }}>
                      Sinh viên chưa gửi bài nộp cho học phần này.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </Section>
      ) : (
        <section className="card" style={{ marginTop: 16 }} aria-labelledby="submit-title">
          <div className="card-head">
            <h3 id="submit-title">
              {submission ? `Bài làm của ${account.displayName} (${account.code})` : `Nộp bài (${account.displayName} · ${account.code})`}
            </h3>
            {submission && <small style={{ color: "var(--muted)" }}>Nộp lúc {formatDate(submission.submittedAt)}</small>}
          </div>

          {submission ? (
            <div className="dash-col">
              <div className="prose-block submitted-copy" style={{ marginTop: 0 }}>{submission.content}</div>
              {submission.feedback ? (
                <div className="teacher-feedback">
                  <h4><Icon name="message" /> Phản hồi của giảng viên ({submission.feedbackBy ?? account.advisorName})</h4>
                  <p>{submission.feedback}</p>
                  {submission.feedbackAt && (
                    <small style={{ color: "var(--muted)" }}>{formatDate(submission.feedbackAt)}</small>
                  )}
                </div>
              ) : (
                <div className="notice">
                  <Icon name="clock" />
                  <div>
                    <strong>Đang chờ giảng viên nhận xét ({account.advisorName})</strong>
                    <p>
                      Bài đã được ghi nhận. Bạn có thể chuyển sang tài khoản{" "}
                      <button
                        type="button"
                        className="button button-outline button-xs"
                        style={{ marginLeft: 4 }}
                        onClick={() => switchAccount("acc-teacher-duc")}
                      >
                        Giảng viên ThS. Trần Minh Đức
                      </button>{" "}
                      để chấm điểm và phản hồi ngay cho bài này.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <form className="submit-form" onSubmit={submit}>
              {overdue && (
                <div className="notice error">
                  <Icon name="alert" />
                  <div>
                    <strong>Bài tập đã quá hạn</strong>
                    <p>Bạn vẫn có thể nộp; giảng viên sẽ thấy thời điểm bạn nộp bài.</p>
                  </div>
                </div>
              )}
              <label className="field">
                Nội dung bài làm của {account.displayName} ({account.code})
                <small>Bản nháp được lưu tự động. Sau khi nộp, giảng viên phụ trách lớp sẽ nhận được ngay.</small>
                <textarea
                  name="content"
                  rows={10}
                  value={content}
                  maxLength={maxLength}
                  aria-describedby="content-count"
                  onChange={(event) => {
                    setContent(event.target.value);
                    setConfirming(false);
                    writeDraft(id, account.code, event.target.value);
                  }}
                  placeholder="Nhập hoặc dán bài làm của bạn…"
                />
              </label>
              <span id="content-count" className={`counter${length > maxLength ? " over" : ""}`}>
                {length.toLocaleString("vi-VN")} / {maxLength.toLocaleString("vi-VN")} ký tự
              </span>
              <div aria-live="polite">
                {error && (
                  <div className="notice error" role="alert">
                    <Icon name="alert" />
                    <div>
                      <strong>Chưa nộp được bài</strong>
                      <p>{error} Bài làm của bạn vẫn được giữ nguyên.</p>
                    </div>
                  </div>
                )}
                {confirming && !sending && (
                  <p className="form-error" style={{ color: "var(--ink)" }}>
                    Xác nhận nộp bài với tư cách {account.displayName} ({account.code})?
                  </p>
                )}
              </div>
              <div className="hero-actions" style={{ marginTop: 0 }}>
                <button
                  className={`button ${confirming ? "button-accent" : "button-primary"}`}
                  type="submit"
                  disabled={!length || length > maxLength || sending}
                  aria-busy={sending}
                >
                  {sending ? "Đang nộp…" : confirming ? "Xác nhận nộp bài" : "Nộp bài"}
                </button>
                {confirming && !sending && (
                  <button className="button button-quiet" type="button" onClick={() => setConfirming(false)}>
                    Huỷ
                  </button>
                )}
              </div>
            </form>
          )}
        </section>
      )}
    </>
  );
}
