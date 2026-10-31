"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppShell, studentNav, type Notification, type SearchSuggestion } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { initials } from "@/lib/format";
import { centerOf, SceneArrival } from "@/components/landing/SceneTransition";
import { StudentProvider, useStudent } from "@/lib/student-context";

function Frame({ children }: { children: React.ReactNode }) {
  const { data, error, avatarUrl, account, switchAccount, refresh, signOut } = useStudent();
  const pathname = usePathname();
  // The AI workspace is its own full-page app (opened in a new tab); it only needs the session.
  if (pathname.startsWith("/student/ai")) return children;
  const isTeacher = account.role === "teacher" || account.permissions.canManageClassRoster;
  const isOnTeacherClasses = pathname.startsWith("/student/teacher-classes");
  const user = data
    ? {
        name: account.displayName,
        role: account.roleTitle,
        initial: initials(account.displayName),
        avatarUrl,
      }
    : null;
  const titles = new Map(data?.assignments.map((item) => [item.id, item.title]));
  const notifications: Notification[] | null = data
    ? data.submissions
        .filter((item) => item.feedback)
        .sort((a, b) => (b.feedbackAt ?? "").localeCompare(a.feedbackAt ?? ""))
        .slice(0, 5)
        .map((item) => ({
          id: item.id,
          title: `Phản hồi: ${titles.get(item.assignmentId) ?? "Bài tập"}`,
          text: item.feedback!,
          href: `/student/assignments/${item.assignmentId}` as Route,
        }))
    : null;

  const classNames = new Map(data?.session.classes.map((item) => [item.id, item.name]));
  const searchItems: SearchSuggestion[] | undefined = data
    ? [
        ...data.assignments.map((item) => ({
          id: `asg-${item.id}`,
          label: item.title,
          detail: classNames.get(item.classId) ?? "Bài tập học phần",
          category: "Bài tập",
          href: `/student/assignments/${item.id}` as Route,
          icon: "assignment" as const,
        })),
        ...data.session.classes.map((item) => ({
          id: `cls-${item.id}`,
          label: item.name,
          detail: "Lớp học phần của bạn",
          category: "Lớp học",
          href: `/student/classes/${item.id}` as Route,
          icon: "class" as const,
        })),
      ]
    : undefined;

  return (
    <>
      <SceneArrival />
      <AppShell
        nav={studentNav}
        user={user}
        tag={account.roleBadge}
        searchAction="/student/assignments"
        searchItems={searchItems}
        notifications={notifications}
        profileHref="/student/account"
        noticesHref="/student/notices"
        headerActions={
          isTeacher ? (
            <Link
              href={"/student/teacher-classes" as Route}
              className={`top-teacher-btn${isOnTeacherClasses ? " is-active" : ""}`}
              aria-current={isOnTeacherClasses ? "page" : undefined}
              title="Quản lý lớp chủ nhiệm, các lớp bộ môn, điểm danh và bài tập giảng viên"
            >
              <Icon name="class" />
              <span>Quản lý lớp học</span>
            </Link>
          ) : null
        }
        sideCard={
          <div className="side-foot">
            <div className="side-links">
              <button
                type="button"
                onClick={() =>
                  switchAccount(isTeacher ? "acc-leader-minh" : "acc-teacher-duc")
                }
                title={
                  isTeacher
                    ? "Chuyển sang tài khoản Sinh viên (Nguyễn Văn Minh)"
                    : "Chuyển sang tài khoản Giảng viên (ThS. Trần Minh Đức)"
                }
              >
                <Icon name="shield" />{" "}
                <span>{isTeacher ? "Đang xem: Giáo viên" : "Đổi sang TK Giáo viên"}</span>
              </button>
              <button type="button" onClick={(event) => void signOut(centerOf(event.currentTarget))}>
                <Icon name="logout" /> <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        }
      >
        {error ? (
          <div className="notice error" role="alert">
            <Icon name="alert" />
            <div>
              <strong>Không thể tải dữ liệu học tập</strong>
              <p>{error}</p>
            </div>
            <button className="button button-outline button-xs" type="button" onClick={() => void refresh()}>
              <Icon name="retry" /> Thử lại
            </button>
          </div>
        ) : data ? (
          children
        ) : (
          <div aria-busy="true" aria-live="polite">
            <span className="sr-only">Đang tải dữ liệu học tập…</span>
            <div className="skeleton" style={{ height: 56, width: 320, marginBottom: 16 }} />
            <div className="skeleton" style={{ height: 520 }} />
          </div>
        )}
      </AppShell>
    </>
  );
}

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <StudentProvider>
      <Frame>{children}</Frame>
    </StudentProvider>
  );
}
