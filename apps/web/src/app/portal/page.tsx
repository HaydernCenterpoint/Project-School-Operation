"use client";

import type {
  AcademicSession,
  Assignment,
  Submission,
} from "@sao-do/contracts";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { academicRequest } from "@/lib/academic-client";
import {
  getSupabaseBrowserClient,
  hasSupabaseEnvironment,
} from "@/lib/supabase-browser";
import { AiTutorPanel } from "@/components/AiTutorPanel";
import { ModerationQueue } from "@/components/ModerationQueue";

type Notice = { kind: "success" | "error"; message: string } | null;
type AssignmentResponse = { assignments: Assignment[] };
type SubmissionResponse = { submissions: Submission[] };

const roleLabels = {
  admin: "Quản trị viên",
  moderator: "Kiểm duyệt viên",
  teacher: "Giảng viên",
  student: "Sinh viên",
} as const;

function classCode(id: string) {
  return `CLS-${id.replaceAll("-", "").slice(0, 6).toUpperCase()}`;
}

function formatDate(value: string | null) {
  if (!value) return "Không giới hạn";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function Icon({
  name,
}: {
  name: "class" | "assignment" | "tutor" | "user";
}) {
  const path = {
    class: (
      <>
        <path d="m3 8 9-5 9 5-9 5-9-5Z" />
        <path d="M7 11v5c3 2 7 2 10 0v-5" />
      </>
    ),
    assignment: (
      <>
        <path d="M7 3h10v4H7zM5 5H3v16h18V5h-2" />
        <path d="M7 12h10M7 16h7" />
      </>
    ),
    tutor: (
      <>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z" />
        <path d="M8 8h8M8 12h5" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {path[name]}
    </svg>
  );
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
    hasSupabaseEnvironment
      ? null
      : {
          kind: "error",
          message:
            "Portal cần cấu hình Supabase để dùng dữ liệu học thuật thật.",
        },
  );
  const [reload, setReload] = useState(0);
  const assignmentsController = useRef<AbortController | null>(null);
  const submissionsController = useRef<AbortController | null>(null);
  const sectionLoading = assignmentsLoading || submissionsLoading;

  const loadSession = useCallback(
    async (accessToken: string) => {
      setLoading(true);
      setNotice(null);
      try {
        const data = await academicRequest<AcademicSession>(
          "/api/classes",
          accessToken,
        );
        setSession(data);
        setSelectedClassId((current) =>
          data.classes.some((item) => item.id === current)
            ? current
            : (data.classes[0]?.id ?? ""),
        );
      } catch (error) {
        setNotice({
          kind: "error",
          message:
            error instanceof Error ? error.message : "Không thể tải portal.",
        });
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!hasSupabaseEnvironment) return;

    let cancelled = false;
    let currentToken = "";
    const supabase = getSupabaseBrowserClient();
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const accessToken = data.session?.access_token;
      if (!accessToken) {
        router.replace("/#dang-nhap");
        return;
      }
      currentToken = accessToken;
      setToken(accessToken);
      void loadSession(accessToken);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!nextSession) {
        router.replace("/#dang-nhap");
        return;
      }
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
        const data = await academicRequest<AssignmentResponse>(
          `/api/assignments?classId=${encodeURIComponent(classId)}`,
          accessToken,
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        setAssignments(data.assignments);
        setSelectedAssignmentId(data.assignments[0]?.id ?? "");
      } catch (error) {
        if (controller.signal.aborted) return;
        setNotice({
          kind: "error",
          message:
            error instanceof Error ? error.message : "Không thể tải bài tập.",
        });
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
    if (selectedClassId && token) {
      queueMicrotask(() => void loadAssignments(selectedClassId));
    }
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
        const data = await academicRequest<SubmissionResponse>(
          `/api/submissions?assignmentId=${encodeURIComponent(assignmentId)}`,
          token,
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        setSubmissions(data.submissions);
      } catch (error) {
        if (controller.signal.aborted) return;
        setNotice({
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "Không thể tải bài nộp.",
        });
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

  useEffect(
    () => () => {
      assignmentsController.current?.abort();
      submissionsController.current?.abort();
    },
    [],
  );

  const selectedClass =
    session?.classes.find((item) => item.id === selectedClassId) ?? null;
  const selectedAssignment =
    assignments.find((item) => item.id === selectedAssignmentId) ?? null;
  const teachers = useMemo(
    () => session?.people.filter((person) => person.role === "teacher") ?? [],
    [session],
  );
  const students = useMemo(
    () => session?.people.filter((person) => person.role === "student") ?? [],
    [session],
  );

  async function createClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const studentIds = values.getAll("studentIds").map(String);
    setMutating(true);
    setNotice(null);
    try {
      await academicRequest("/api/classes", token, {
        method: "POST",
        body: JSON.stringify({
          name: String(values.get("name") ?? ""),
          teacherId: String(values.get("teacherId") ?? ""),
          studentIds,
        }),
      });
      form.reset();
      await loadSession(token);
      setNotice({ kind: "success", message: "Đã tạo lớp và phân công thành viên." });
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Không thể tạo lớp.",
      });
    } finally {
      setMutating(false);
    }
  }

  async function publishAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const dueAt = String(values.get("dueAt") ?? "");
    setMutating(true);
    setNotice(null);
    try {
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
      setNotice({ kind: "success", message: "Đã công bố bài tập cho lớp." });
    } catch (error) {
      setNotice({
        kind: "error",
        message:
          error instanceof Error ? error.message : "Không thể công bố bài tập.",
      });
    } finally {
      setMutating(false);
    }
  }

  async function sendFeedback(
    event: FormEvent<HTMLFormElement>,
    submissionId: string,
  ) {
    event.preventDefault();
    const form = event.currentTarget;
    const feedback = String(new FormData(form).get("feedback") ?? "");
    setMutating(true);
    setNotice(null);
    try {
      await academicRequest(`/api/submissions/${submissionId}/feedback`, token, {
        method: "POST",
        body: JSON.stringify({ feedback }),
      });
      await loadSubmissions(selectedAssignmentId);
      setNotice({ kind: "success", message: "Đã gửi phản hồi cho sinh viên." });
    } catch (error) {
      setNotice({
        kind: "error",
        message:
          error instanceof Error ? error.message : "Không thể gửi phản hồi.",
      });
    } finally {
      setMutating(false);
    }
  }

  return (
    <div className="portal-shell">
      <aside className="portal-rail">
        <Link href="/" className="rail-brand" aria-label="Về trang chủ">
          <Image src="/sao-do-logo.png" alt="" width={76} height={76} priority />
          <strong>{session?.tenant.name ?? "Đại học Sao Đỏ"}</strong>
        </Link>
        <nav aria-label="Điều hướng portal">
          {session?.role !== "moderator" && (
            <a href="#classes" className="active" aria-current="page">
              <Icon name="class" />
              <span>Lớp học</span>
            </a>
          )}
          {(session?.role === "teacher" || session?.role === "student") && (
            <a href="#assignments">
              <Icon name="assignment" />
              <span>Bài tập</span>
            </a>
          )}
          {session?.role === "student" && (
            <a href="#tutor">
              <Icon name="tutor" />
              <span>Trợ giảng AI</span>
            </a>
          )}
          {(session?.role === "admin" || session?.role === "moderator") && (
            <a
              href="#moderation"
              className={session.role === "moderator" ? "active" : undefined}
              aria-current={
                session.role === "moderator" ? "page" : undefined
              }
            >
              <Icon name="assignment" />
              <span>Kiểm duyệt</span>
            </a>
          )}
        </nav>
        <div className="rail-orbits" aria-hidden="true">
          <i />
          <i />
          <b />
          <b />
        </div>
      </aside>

      <div className="portal-main">
        <header className="portal-topbar">
          <span>{session?.tenant.name ?? "Cổng học thuật Sao Đỏ"}</span>
          <span>
            <Icon name="user" />
            {session ? roleLabels[session.role] : "Đang xác thực…"}
          </span>
        </header>

        <main className="portal-content">
          <div className="page-heading">
            <div>
              <h1>
                {session?.role === "moderator"
                  ? "Kiểm duyệt cộng đồng"
                  : "Không gian học thuật"}
              </h1>
              {session && (
                <p>
                  Xin chào {session.user.displayName}. Bạn đang truy cập với vai trò{" "}
                  <strong>{roleLabels[session.role]}</strong>.
                </p>
              )}
            </div>
          </div>

          <div className="status-region" aria-live="polite" aria-atomic="true">
            {notice && (
              <div className={`portal-notice ${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"}>
                <strong>{notice.kind === "success" ? "Hoàn tất" : "Có lỗi"}</strong>
                <span>{notice.message}</span>
                {notice.kind === "error" && hasSupabaseEnvironment && (
                  <button type="button" onClick={() => setReload((value) => value + 1)}>
                    Thử lại
                  </button>
                )}
              </div>
            )}
          </div>

          {loading ? (
            <div className="portal-feedback" aria-live="polite">
              <span className="spinner" />
              <div>
                <strong>Đang tải dữ liệu học thuật…</strong>
                <p>Phiên đăng nhập đang được xác minh bởi máy chủ.</p>
              </div>
            </div>
          ) : (
            session && (
              <>
                {session.role !== "moderator" && (
                  <section className="academic-section" id="classes">
                  <div className="section-heading">
                    <div>
                      <h2>Lớp học</h2>
                    </div>
                    <p>{session.classes.length} lớp được phép truy cập</p>
                  </div>

                  <div className="class-cards" aria-label="Danh sách lớp học">
                    {session.classes.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        className={item.id === selectedClassId ? "selected" : ""}
                        onClick={() => setSelectedClassId(item.id)}
                        aria-pressed={item.id === selectedClassId}
                      >
                        <span>{classCode(item.id)}</span>
                        <strong>{item.name}</strong>
                        <small>
                          {item.teacherId === session.user.id
                            ? "Bạn phụ trách"
                            : "Lớp đang hoạt động"}
                        </small>
                      </button>
                    ))}
                    {!session.classes.length && (
                      <div className="empty-state">
                        <Icon name="class" />
                        <strong>Chưa có lớp học</strong>
                        <p>Lớp được cấp quyền sẽ xuất hiện tại đây.</p>
                      </div>
                    )}
                  </div>

                  {session.role === "admin" && (
                    <form className="academic-form" onSubmit={createClass}>
                      <div className="form-heading">
                        <h3>Tạo lớp mới</h3>
                        <p>Chọn một giảng viên và ít nhất một sinh viên.</p>
                      </div>
                      <label>
                        Tên lớp
                        <input name="name" required maxLength={200} placeholder="Ví dụ: Công nghệ thông tin 15A" />
                      </label>
                      <label>
                        Giảng viên
                        <select name="teacherId" required defaultValue="">
                          <option value="" disabled>Chọn giảng viên</option>
                          {teachers.map((person) => (
                            <option key={person.id} value={person.id}>
                              {person.displayName} · {person.email}
                            </option>
                          ))}
                        </select>
                      </label>
                      <fieldset>
                        <legend>Sinh viên</legend>
                        <div className="member-checks">
                          {students.map((person) => (
                            <label key={person.id}>
                              <input type="checkbox" name="studentIds" value={person.id} />
                              <span>
                                <strong>{person.displayName}</strong>
                                <small>{person.email}</small>
                              </span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                      {!teachers.length || !students.length ? (
                        <p className="permission-note" role="status">
                          Cần có sẵn giảng viên và sinh viên trong cơ sở để tạo lớp.
                        </p>
                      ) : (
                        <button className="button button-primary" type="submit" disabled={mutating || sectionLoading}>
                          {mutating ? "Đang tạo…" : "Tạo lớp và phân công"}
                        </button>
                      )}
                    </form>
                  )}
                  </section>
                )}

                {session.role === "student" && (
                  <AiTutorPanel
                    classes={session.classes}
                    initialClassId={selectedClassId}
                    token={token}
                  />
                )}

                {(session.role === "teacher" ||
                  session.role === "student") && (
                  <section className="academic-section" id="assignments">
                    <div className="section-heading">
                      <div>
                        <h2>Bài tập</h2>
                      </div>
                      <p>{selectedClass?.name ?? "Chọn một lớp để tiếp tục"}</p>
                    </div>

                    {sectionLoading && (
                      <p className="section-loading" role="status">Đang cập nhật dữ liệu…</p>
                    )}

                    {session.role === "teacher" && selectedClass && (
                      <form className="academic-form assignment-form" onSubmit={publishAssignment}>
                        <div className="form-heading">
                          <h3>Công bố bài tập</h3>
                          <p>Bài tập sẽ hiển thị ngay cho sinh viên trong lớp.</p>
                        </div>
                        <label>
                          Tiêu đề
                          <input name="title" required maxLength={200} />
                        </label>
                        <label>
                          Hạn nộp
                          <input name="dueAt" type="datetime-local" />
                        </label>
                        <label className="wide-field">
                          Yêu cầu
                          <textarea name="instructions" maxLength={10000} rows={5} />
                        </label>
                        <button className="button button-primary" type="submit" disabled={mutating}>
                          {mutating ? "Đang công bố…" : "Công bố bài tập"}
                        </button>
                      </form>
                    )}

                    <div className="assignment-layout">
                      <div className="assignment-list" aria-label="Danh sách bài tập">
                        {assignments.map((item) => (
                          <button
                            type="button"
                            key={item.id}
                            className={item.id === selectedAssignmentId ? "selected" : ""}
                            onClick={() => setSelectedAssignmentId(item.id)}
                            aria-pressed={item.id === selectedAssignmentId}
                          >
                            <span className={`status-chip ${item.status}`}>
                              {item.status === "published" ? "Đã công bố" : "Bản nháp"}
                            </span>
                            <strong>{item.title}</strong>
                            <small>Hạn nộp: {formatDate(item.dueAt)}</small>
                          </button>
                        ))}
                        {!assignments.length && !sectionLoading && (
                          <div className="empty-state compact">
                            <Icon name="assignment" />
                            <strong>Chưa có bài tập</strong>
                            <p>{session.role === "teacher" ? "Công bố bài đầu tiên cho lớp." : "Giảng viên chưa công bố bài tập."}</p>
                          </div>
                        )}
                      </div>

                      <div className="assignment-detail">
                        {selectedAssignment ? (
                          <>
                            <span className={`status-chip ${selectedAssignment.status}`}>
                              {selectedAssignment.status === "published" ? "Đã công bố" : "Bản nháp"}
                            </span>
                            <h3>{selectedAssignment.title}</h3>
                            <p className="due-line">Hạn nộp: {formatDate(selectedAssignment.dueAt)}</p>
                            <div className="instructions">
                              {selectedAssignment.instructions || "Không có yêu cầu bổ sung."}
                            </div>

                            {session.role === "teacher" ? (
                              <div className="submission-list">
                                <h4>Bài nộp ({submissions.length})</h4>
                                {submissions.map((item) => (
                                  <article key={item.id}>
                                    <div className="submission-heading">
                                      <strong>{item.studentDisplayName}</strong>
                                      <span className={`status-chip ${item.status}`}>
                                        {item.status === "reviewed" ? "Đã phản hồi" : "Đã nộp"}
                                      </span>
                                    </div>
                                    <p className="submission-content">{item.content}</p>
                                    <small>Nộp lúc {formatDate(item.submittedAt)}</small>
                                    <form onSubmit={(event) => sendFeedback(event, item.id)}>
                                      <label>
                                        Phản hồi
                                        <textarea
                                          name="feedback"
                                          rows={3}
                                          maxLength={5000}
                                          required
                                          defaultValue={item.feedback ?? ""}
                                        />
                                      </label>
                                      <button className="button button-quiet" type="submit" disabled={mutating || sectionLoading}>
                                        {item.feedback ? "Cập nhật phản hồi" : "Gửi phản hồi"}
                                      </button>
                                    </form>
                                  </article>
                                ))}
                                {!submissions.length && !sectionLoading && (
                                  <p className="permission-note">Chưa có sinh viên nộp bài.</p>
                                )}
                              </div>
                            ) : (
                              <div className="student-status">
                                <h4>Trạng thái của bạn</h4>
                                {submissions[0] ? (
                                  <>
                                    <span className={`status-chip ${submissions[0].status}`}>
                                      {submissions[0].status === "reviewed" ? "Đã nhận phản hồi" : "Đã nộp"}
                                    </span>
                                    <p>{submissions[0].feedback ?? "Giảng viên chưa gửi phản hồi."}</p>
                                  </>
                                ) : (
                                  <p>Chưa nộp bài. Hãy dùng ứng dụng di động để gửi bài.</p>
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="empty-state compact">
                            <strong>Chọn một bài tập để xem chi tiết</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                )}

                {(session.role === "admin" ||
                  session.role === "moderator") && (
                  <ModerationQueue token={token} />
                )}
              </>
            )
          )}
        </main>
      </div>
    </div>
  );
}
