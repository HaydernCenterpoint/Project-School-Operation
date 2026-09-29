"use client";

import type { Route } from "next";
import Link from "next/link";
import { newTab } from "@/components/AppShell";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { DueChip } from "@/components/Dashboard";
import { Icon } from "@/components/Icon";
import { academicRequest } from "@/lib/academic-client";
import { dueState, formatDate, formatDeadline } from "@/lib/format";
import { useStudent } from "@/lib/student-context";

const maxLength = 20_000;
const draftKey = (id: string) => `sao-do:draft:${id}`;

function readDraft(id: string) {
  try {
    return localStorage.getItem(draftKey(id)) ?? "";
  } catch {
    return "";
  }
}

function writeDraft(id: string, value: string) {
  try {
    if (value) localStorage.setItem(draftKey(id), value);
    else localStorage.removeItem(draftKey(id));
  } catch {
    // Drafts are a convenience; ignore blocked storage.
  }
}

export default function AssignmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, refresh } = useStudent();
  const [now] = useState(Date.now);
  const [content, setContent] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  // One idempotency key per exact payload, so a retry after a dropped
  // connection can never create a second submission.
  const attempt = useRef<{ content: string; key: string } | null>(null);

  useEffect(() => {
    queueMicrotask(() => setContent(readDraft(id)));
  }, [id]);

  if (!data) return null;
  const assignment = data.assignments.find((item) => item.id === id);
  const submission = data.submissions.find((item) => item.assignmentId === id);
  const className = data.session.classes.find((item) => item.id === assignment?.classId)?.name;

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
      await academicRequest("/api/submissions", data.token, {
        method: "POST",
        headers: { "Idempotency-Key": attempt.current.key },
        body: JSON.stringify({ assignmentId: id, content: trimmed }),
      });
      writeDraft(id, "");
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

  const overdue = dueState(assignment.dueAt, now) === "overdue";
  const length = content.trim().length;

  return (
    <>
      <Link className="back-link" href="/student/assignments">
        <Icon name="back" /> Bài tập
      </Link>
      <div className="detail-grid">
        <article className="card">
          <div className="detail-head">
            {submission ? (
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
              <div><dt>Trạng thái</dt><dd>{submission ? "Đã nộp" : "Chưa nộp"}</dd></div>
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

      <section className="card" style={{ marginTop: 16 }} aria-labelledby="submit-title">
        <div className="card-head">
          <h3 id="submit-title">{submission ? "Bài làm của bạn" : "Nộp bài"}</h3>
          {submission && <small style={{ color: "var(--muted)" }}>Nộp lúc {formatDate(submission.submittedAt)}</small>}
        </div>

        {submission ? (
          <div className="dash-col">
            <div className="prose-block submitted-copy" style={{ marginTop: 0 }}>{submission.content}</div>
            {submission.feedback ? (
              <div className="teacher-feedback">
                <h4><Icon name="message" /> Phản hồi của giảng viên</h4>
                <p>{submission.feedback}</p>
                {submission.feedbackAt && (
                  <small style={{ color: "var(--muted)" }}>{formatDate(submission.feedbackAt)}</small>
                )}
              </div>
            ) : (
              <div className="notice">
                <Icon name="clock" />
                <div>
                  <strong>Đang chờ giảng viên nhận xét</strong>
                  <p>Bài đã được ghi nhận. Bài nộp không thể chỉnh sửa sau khi gửi.</p>
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
              Nội dung bài làm
              <small>Bản nháp được lưu tự động trên thiết bị này. Sau khi nộp, bài không thể chỉnh sửa.</small>
              <textarea
                name="content"
                rows={10}
                value={content}
                maxLength={maxLength}
                aria-describedby="content-count"
                onChange={(event) => {
                  setContent(event.target.value);
                  setConfirming(false);
                  writeDraft(id, event.target.value);
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
                  Bạn chắc chắn muốn nộp? Sau khi nộp sẽ không thể chỉnh sửa.
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
    </>
  );
}
