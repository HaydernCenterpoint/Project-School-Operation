"use client";

import type { AcademicSession, Assignment, Submission } from "@sao-do/contracts";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { Empty, PageTitle, Section } from "@/components/portal/Parts";
import { academicRequest } from "@/lib/academic-client";
import { getSupabaseBrowserClient, hasSupabaseEnvironment } from "@/lib/supabase-browser";

// Classes, assignments and feedback for teachers and admins, inside the management shell
// (app/(quan-ly)/layout.tsx). Class names such as academic-form and assignment-list are kept
// because tests/e2e/academic-ui.test.mjs finds the forms by them.

type Notice = { kind: "success" | "error"; message: string } | null;
type AssignmentResponse = { assignments: Assignment[] };
type SubmissionResponse = { submissions: Submission[] };

const roleLabels = {
  admin: "Quản trị viên",
  staff: "Cán bộ phòng ban",
  teacher: "Giảng viên",
  student: "Sinh viên",
} as const;

function classCode(id: string) {
  return `CLS-${id.replaceAll("-", "").slice(0, 6).toUpperCase()}`;
}

function formatDate(value: string | null) {
  if (!value) return "Không giới hạn";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function PortalPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [session, setSession] = useState<AcademicSession | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [loading, setLoading] = useState(hasSupabaseEnvironment);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [notice, setNotice] = useState<Notice>(
    hasSupabaseEnvironment ? null : { kind: "error", message: "Cổng học tập chưa được cấu hình. Vui lòng liên hệ quản trị viên." },
  );
  const [reload, setReload] = useState(0);
  const [studentQuery, setStudentQuery] = useState("");
  const [selectedStudentCount, setSelectedStudentCount] = useState(0);
  const [showPublishForm, setShowPublishForm] = useState(true);
  const [submissionFilter, setSubmissionFilter] = useState<"all" | "submitted" | "reviewed">("all");
  const [submissionQuery, setSubmissionQuery] = useState("");
  const assignmentsController = useRef<AbortController | null>(null);
  const submissionsController = useRef<AbortController | null>(null);
  const sectionLoading = assignmentsLoading || submissionsLoading;

  const loadSession = useCallback(
    async (accessToken: string) => {
      setLoading(true);
      setNotice(null);
      try {
        const data = await academicRequest<AcademicSession>("/api/classes", accessToken);
        if (data.role === "student") {
          router.replace("/student");
          return;
        }
        setSession(data);
        setSelectedClassId((current) => (data.classes.some((item) => item.id === current) ? current : (data.classes[0]?.id ?? "")));
      } catch (error) {
        setNotice({ kind: "error", message: error instanceof Error ? error.message : "Không thể tải cổng học tập." });
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  // The layout guards sign-in; this only keeps the bearer token for the API current.
  useEffect(() => {
    if (!hasSupabaseEnvironment) return;
    let cancelled = false;
    let currentToken = "";
    const supabase = getSupabaseBrowserClient();
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const accessToken = data.session?.access_token;
      if (!accessToken) return router.replace("/login?next=/portal" as Route);
      currentToken = accessToken;
      setToken(accessToken);
      void loadSession(accessToken);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!nextSession) return router.replace("/login?next=/portal" as Route);
      if (nextSession.access_token !== currentToken) {
        currentToken = nextSession.access_token;
        setToken(currentToken);
        queueMicrotask(() => void loadSession(currentToken));
      }
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [loadSession, reload, router]);

  const loadAssignments = useCallback(
    async (classId: string, accessToken = token) => {
      assignmentsController.current?.abort();
      submissionsController.current?.abort();
      const controller = new AbortController();
      assignmentsController.current = controller;
      setAssignments([]);
      setSelectedAssignmentId("");
      setSubmissions([]);
      setSubmissionsLoading(false);
      if (!classId || !accessToken) {
        setAssignmentsLoading(false);
        return;
      }
      setAssignmentsLoading(true);
      setNotice(null);
      try {
        const data = await academicRequest<AssignmentResponse>(`/api/assignments?classId=${encodeURIComponent(classId)}`, accessToken, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setAssignments(data.assignments);
        setSelectedAssignmentId(data.assignments[0]?.id ?? "");
      } catch (error) {
        if (controller.signal.aborted) return;
        setNotice({ kind: "error", message: error instanceof Error ? error.message : "Không thể tải bài tập." });
      } finally {
        if (assignmentsController.current === controller) {
          assignmentsController.current = null;
          setAssignmentsLoading(false);
        }
      }
    },
    [token],
  );

  useEffect(() => {
    if (selectedClassId && token) queueMicrotask(() => void loadAssignments(selectedClassId));
  }, [loadAssignments, selectedClassId, token]);

  const loadSubmissions = useCallback(
    async (assignmentId: string) => {
      submissionsController.current?.abort();
      const controller = new AbortController();
      submissionsController.current = controller;
      setSubmissions([]);
      if (!assignmentId || !token || session?.role === "admin") {
        setSubmissionsLoading(false);
        return;
      }
      setSubmissionsLoading(true);
      try {
        const data = await academicRequest<SubmissionResponse>(`/api/submissions?assignmentId=${encodeURIComponent(assignmentId)}`, token, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setSubmissions(data.submissions);
      } catch (error) {
        if (controller.signal.aborted) return;
        setNotice({ kind: "error", message: error instanceof Error ? error.message : "Không thể tải bài nộp." });
      } finally {
        if (submissionsController.current === controller) {
          submissionsController.current = null;
          setSubmissionsLoading(false);
        }
      }
    },
    [session?.role, token],
  );

  useEffect(() => {
    if (selectedAssignmentId) {
      queueMicrotask(() => void loadSubmissions(selectedAssignmentId));
    } else {
      queueMicrotask(() => {
        submissionsController.current?.abort();
        submissionsController.current = null;
        setSubmissions([]);
        setSubmissionsLoading(false);
      });
    }
  }, [loadSubmissions, selectedAssignmentId]);

  useEffect(() => () => {
    assignmentsController.current?.abort();
    submissionsController.current?.abort();
  }, []);

  const selectedClass = session?.classes.find((item) => item.id === selectedClassId) ?? null;
  const selectedAssignment = assignments.find((item) => item.id === selectedAssignmentId) ?? null;
  const teachers = useMemo(() => session?.people.filter((person) => person.role === "teacher") ?? [], [session]);
  const students = useMemo(() => session?.people.filter((person) => person.role === "student") ?? [], [session]);
  const normalizedStudentQuery = studentQuery.trim().toLowerCase();
  const matchingStudentCount = useMemo(
    () =>
      !normalizedStudentQuery
        ? students.length
        : students.filter((person) => `${person.displayName} ${person.email}`.toLowerCase().includes(normalizedStudentQuery)).length,
    [normalizedStudentQuery, students],
  );
  const pendingSubmissionCount = useMemo(() => submissions.filter((item) => item.status !== "reviewed").length, [submissions]);
  const reviewedSubmissionCount = submissions.length - pendingSubmissionCount;
  const normalizedSubmissionQuery = submissionQuery.trim().toLowerCase();

  async function mutate(run: () => Promise<void>, success: string, failure: string) {
    setMutating(true);
    setNotice(null);
    try {
      await run();
      setNotice({ kind: "success", message: success });
    } catch (error) {
      setNotice({ kind: "error", message: error instanceof Error ? error.message : failure });
    } finally {
      setMutating(false);
    }
  }

  function createClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    void mutate(async () => {
      await academicRequest("/api/classes", token, {
        method: "POST",
        body: JSON.stringify({
          name: String(values.get("name") ?? ""),
          teacherId: String(values.get("teacherId") ?? ""),
          studentIds: values.getAll("studentIds").map(String),
        }),
      });
      form.reset();
      await loadSession(token);
    }, "Đã tạo lớp và phân công thành viên.", "Không thể tạo lớp.");
  }

  function publishAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const dueAt = String(values.get("dueAt") ?? "");
    void mutate(async () => {
      await academicRequest("/api/assignments", token, {
        method: "POST",
        body: JSON.stringify({
          classId: selectedClassId,
          title: String(values.get("title") ?? ""),
          instructions: String(values.get("instructions") ?? ""),
          status: "published",
          dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        }),
      });
      form.reset();
      await loadAssignments(selectedClassId);
    }, "Đã công bố bài tập cho lớp.", "Không thể công bố bài tập.");
  }

  function sendFeedback(event: FormEvent<HTMLFormElement>, submissionId: string) {
    event.preventDefault();
    const feedback = String(new FormData(event.currentTarget).get("feedback") ?? "");
    void mutate(async () => {
      await academicRequest(`/api/submissions/${submissionId}/feedback`, token, { method: "POST", body: JSON.stringify({ feedback }) });
      await loadSubmissions(selectedAssignmentId);
    }, "Đã gửi phản hồi cho sinh viên.", "Không thể gửi phản hồi.");
  }

  return (
    <div className="ad-page">
      <PageTitle
        title="Lớp học & bài tập"
        lead={session ? <>Xin chào {session.user.displayName}. Bạn đang truy cập với vai trò <strong>{roleLabels[session.role]}</strong>.</> : "Đang xác thực…"}
      />

      <div aria-live="polite" aria-atomic="true">
        {notice && (
          <div className={`notice ${notice.kind === "error" ? "error" : "success"} lp-notice`} role={notice.kind === "error" ? "alert" : "status"}>
            <Icon name={notice.kind === "error" ? "alert" : "checkCircle"} />
            <div><strong>{notice.kind === "success" ? "Hoàn tất" : "Có lỗi"}</strong><p>{notice.message}</p></div>
            {notice.kind === "error" && hasSupabaseEnvironment && (
              <button className="button button-outline button-xs" type="button" onClick={() => setReload((value) => value + 1)}>
                <Icon name="retry" /> Thử lại
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div aria-busy="true">
          <span className="sr-only">Đang tải dữ liệu học thuật…</span>
          <div className="skeleton" style={{ height: 180, marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 320 }} />
        </div>
      ) : session && (
        <>
          <Section title="Lớp học" icon="class" action={<span className="pt-muted">{session.classes.length} lớp được phép truy cập</span>}>
            {session.classes.length ? (
              <div className="lp-classes" aria-label="Danh sách lớp học">
                {session.classes.map((item, index) => (
                  <button
                    type="button"
                    key={item.id}
                    className={`lp-class tone-${index % 6}${item.id === selectedClassId ? " is-selected" : ""}`}
                    onClick={() => setSelectedClassId(item.id)}
                    aria-pressed={item.id === selectedClassId}
                    style={{ "--i": Math.min(index, 12) } as React.CSSProperties}
                  >
                    <span className="lp-class-mark" aria-hidden="true"><Icon name="class" /></span>
                    <span className="pt-code">{classCode(item.id)}</span>
                    <strong>{item.name}</strong>
                    <small>{item.teacherId === session.user.id ? "Bạn phụ trách" : "Lớp đang hoạt động"}</small>
                  </button>
                ))}
              </div>
            ) : (
              <Empty icon="class" title="Chưa có lớp học" text="Lớp được cấp quyền sẽ xuất hiện tại đây." />
            )}
          </Section>

          {session.role === "admin" && (
            <Section
              title="Tạo lớp mới"
              icon="plus"
              action={
                students.length > 0 ? (
                  <span className="lp-members-count">
                    Đã chọn {selectedStudentCount}/{students.length} sinh viên
                  </span>
                ) : undefined
              }
            >
              {students.length > 0 && (
                <div className="lp-filter-bar">
                  <label className="ad-search">
                    <Icon name="search" />
                    <input
                      type="search"
                      value={studentQuery}
                      onChange={(event) => setStudentQuery(event.target.value)}
                      placeholder="Tìm sinh viên theo tên hoặc email…"
                      aria-label="Tìm sinh viên theo tên hoặc email"
                    />
                  </label>
                  {normalizedStudentQuery && (
                    <span className="pt-muted">
                      Hiển thị {matchingStudentCount}/{students.length} sinh viên
                    </span>
                  )}
                </div>
              )}
              <form
                className="academic-form lp-form"
                onSubmit={createClass}
                onChange={(event) => {
                  const checked = event.currentTarget.querySelectorAll('input[name="studentIds"]:checked').length;
                  setSelectedStudentCount(checked);
                }}
                onReset={() => setSelectedStudentCount(0)}
              >
                <div className="form-heading">
                  <h3>Tạo lớp mới</h3>
                  <p className="pt-muted">Chọn một giảng viên và ít nhất một sinh viên.</p>
                </div>
                <label className="field">
                  Tên lớp
                  <input name="name" required maxLength={200} placeholder="Ví dụ: Công nghệ thông tin 15A" />
                </label>
                <label className="field">
                  Giảng viên
                  <select name="teacherId" required defaultValue="">
                    <option value="" disabled>Chọn giảng viên</option>
                    {teachers.map((person) => (
                      <option key={person.id} value={person.id}>{person.displayName} · {person.email}</option>
                    ))}
                  </select>
                </label>
                <fieldset className="lp-members">
                  <legend>
                    <span>Sinh viên</span>
                    <span className="lp-members-count">Đã chọn {selectedStudentCount}</span>
                  </legend>
                  <div>
                    {students.map((person) => {
                      const matches =
                        !normalizedStudentQuery ||
                        `${person.displayName} ${person.email}`.toLowerCase().includes(normalizedStudentQuery);
                      return (
                        <label key={person.id} hidden={!matches}>
                          <input type="checkbox" name="studentIds" value={person.id} />
                          <span><strong>{person.displayName}</strong><small>{person.email}</small></span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
                {!teachers.length || !students.length ? (
                  <p className="notice" role="status"><Icon name="info" /> Cần có sẵn giảng viên và sinh viên trong cơ sở để tạo lớp.</p>
                ) : (
                  <div className="pt-form-actions">
                    <button className="button button-primary" type="submit" disabled={mutating || sectionLoading}>
                      {mutating ? "Đang tạo…" : "Tạo lớp và phân công"}
                    </button>
                  </div>
                )}
              </form>
            </Section>
          )}

          {session.role !== "admin" && (
            <Section
              title="Bài tập"
              icon="assignment"
              action={
                <div className="lp-section-actions">
                  <span className="pt-muted">{selectedClass?.name ?? "Chọn một lớp để tiếp tục"}</span>
                  {session.role === "teacher" && selectedClass && (
                    <button
                      type="button"
                      className="button button-outline button-small"
                      aria-expanded={showPublishForm}
                      onClick={() => setShowPublishForm((open) => !open)}
                    >
                      <Icon name={showPublishForm ? "chevron" : "plus"} />
                      {showPublishForm ? "Thu gọn biểu mẫu" : "Công bố bài tập mới"}
                    </button>
                  )}
                </div>
              }
            >
              {sectionLoading && <p className="section-loading" role="status">Đang cập nhật dữ liệu…</p>}

              {session.role === "teacher" && selectedClass && (
                <form className="academic-form assignment-form lp-form" hidden={!showPublishForm} onSubmit={publishAssignment}>
                  <div className="form-heading">
                    <h3>Công bố bài tập</h3>
                    <p className="pt-muted">Bài tập sẽ hiển thị ngay cho sinh viên trong lớp.</p>
                  </div>
                  <label className="field">
                    Tiêu đề
                    <input name="title" required maxLength={200} />
                  </label>
                  <label className="field">
                    Hạn nộp
                    <input name="dueAt" type="datetime-local" />
                  </label>
                  <label className="field lp-wide">
                    Yêu cầu
                    <textarea name="instructions" maxLength={10000} rows={4} />
                  </label>
                  <div className="pt-form-actions">
                    <button className="button button-primary" type="submit" disabled={mutating}>
                      {mutating ? "Đang công bố…" : "Công bố bài tập"}
                    </button>
                  </div>
                </form>
              )}

              <div className="lp-assignments">
                <div className="assignment-list lp-list" aria-label="Danh sách bài tập">
                  {assignments.map((item, index) => (
                    <button
                      type="button"
                      key={item.id}
                      className={item.id === selectedAssignmentId ? "is-selected" : undefined}
                      onClick={() => setSelectedAssignmentId(item.id)}
                      aria-pressed={item.id === selectedAssignmentId}
                      style={{ "--i": Math.min(index, 12) } as React.CSSProperties}
                    >
                      <span className={`chip ${item.status === "published" ? "success" : "draft"}`}>{item.status === "published" ? "Đã công bố" : "Bản nháp"}</span>
                      <strong>{item.title}</strong>
                      <small><Icon name="clock" /> Hạn nộp: {formatDate(item.dueAt)}</small>
                    </button>
                  ))}
                  {!assignments.length && !sectionLoading && (
                    <Empty icon="assignment" title="Chưa có bài tập" text={session.role === "teacher" ? "Công bố bài đầu tiên cho lớp." : "Giảng viên chưa công bố bài tập."} />
                  )}
                </div>

                <div className="lp-detail">
                  {selectedAssignment ? (
                    <div key={selectedAssignment.id} className="lp-detail-body">
                      <span className={`chip ${selectedAssignment.status === "published" ? "success" : "draft"}`}>
                        {selectedAssignment.status === "published" ? "Đã công bố" : "Bản nháp"}
                      </span>
                      <h3>{selectedAssignment.title}</h3>
                      <p className="pt-muted">Hạn nộp: {formatDate(selectedAssignment.dueAt)}</p>
                      <div className="lp-instructions">{selectedAssignment.instructions || "Không có yêu cầu bổ sung."}</div>

                      {session.role === "teacher" && (
                        <div className="submission-list lp-submissions">
                          <div className="lp-submissions-head">
                            <h4>Bài nộp ({submissions.length})</h4>
                            {submissions.length > 0 && (
                              <div className="segmented" role="group" aria-label="Lọc trạng thái bài nộp">
                                <button
                                  type="button"
                                  aria-pressed={submissionFilter === "all"}
                                  onClick={() => setSubmissionFilter("all")}
                                >
                                  Tất cả ({submissions.length})
                                </button>
                                <button
                                  type="button"
                                  aria-pressed={submissionFilter === "submitted"}
                                  onClick={() => setSubmissionFilter("submitted")}
                                >
                                  Chờ chấm ({pendingSubmissionCount})
                                </button>
                                <button
                                  type="button"
                                  aria-pressed={submissionFilter === "reviewed"}
                                  onClick={() => setSubmissionFilter("reviewed")}
                                >
                                  Đã phản hồi ({reviewedSubmissionCount})
                                </button>
                              </div>
                            )}
                          </div>
                          {submissions.length > 1 && (
                            <div className="lp-filter-bar">
                              <label className="ad-search">
                                <Icon name="search" />
                                <input
                                  type="search"
                                  value={submissionQuery}
                                  onChange={(event) => setSubmissionQuery(event.target.value)}
                                  placeholder="Tìm bài nộp theo tên sinh viên…"
                                  aria-label="Tìm bài nộp theo tên sinh viên"
                                />
                              </label>
                            </div>
                          )}
                          {submissions.map((item, index) => {
                            const matchesStatus =
                              submissionFilter === "all" ||
                              (submissionFilter === "reviewed" ? item.status === "reviewed" : item.status !== "reviewed");
                            const matchesName =
                              !normalizedSubmissionQuery ||
                              item.studentDisplayName.toLowerCase().includes(normalizedSubmissionQuery);
                            return (
                              <article
                                key={item.id}
                                className={item.status === "reviewed" ? "is-reviewed" : undefined}
                                hidden={!matchesStatus || !matchesName}
                                style={{ "--i": Math.min(index, 12) } as React.CSSProperties}
                              >
                                <header>
                                  <strong>{item.studentDisplayName}</strong>
                                  <span className={`chip ${item.status === "reviewed" ? "reviewed" : "submitted"}`}>
                                    {item.status === "reviewed" ? "Đã phản hồi" : "Đã nộp"}
                                  </span>
                                </header>
                                <p className="lp-content">{item.content}</p>
                                <small className="pt-muted">Nộp lúc {formatDate(item.submittedAt)}</small>
                                <form className="pt-form" onSubmit={(event) => sendFeedback(event, item.id)}>
                                  <label className="field">
                                    Phản hồi
                                    <textarea name="feedback" rows={3} maxLength={5000} required defaultValue={item.feedback ?? ""} />
                                  </label>
                                  <div className="pt-form-actions">
                                    <button className="button button-outline button-small" type="submit" disabled={mutating || sectionLoading}>
                                      <Icon name="send" /> {item.feedback ? "Cập nhật phản hồi" : "Gửi phản hồi"}
                                    </button>
                                  </div>
                                </form>
                              </article>
                            );
                          })}
                          {!submissions.length && !sectionLoading && <p className="pt-muted">Chưa có sinh viên nộp bài.</p>}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Empty icon="assignment" title="Chọn một bài tập để xem chi tiết" />
                  )}
                </div>
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  );
}
