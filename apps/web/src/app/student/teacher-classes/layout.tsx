"use client";

import type { Route } from "next";
import Link from "next/link";
import { AppShell, type NavGroup, type Notification, type SearchSuggestion } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { centerOf, SceneArrival } from "@/components/landing/SceneTransition";
import { initials } from "@/lib/format";
import { useStudent } from "@/lib/student-context";

const teacherClassNav: NavGroup[] = [
  {
    label: "Quản lý giảng dạy",
    items: [
      {
        href: "/student/teacher-classes" as Route,
        label: "Tổng quan giảng dạy",
        short: "Tổng quan",
        icon: "home",
        exact: true,
        mobile: true,
      },
      {
        href: "/student/teacher-classes/homeroom" as Route,
        label: "Lớp chủ nhiệm",
        short: "Chủ nhiệm",
        icon: "users",
        mobile: true,
      },
      {
        href: "/student/teacher-classes/subjects" as Route,
        label: "Các lớp bộ môn",
        short: "Bộ môn",
        icon: "class",
        mobile: true,
      },
      {
        href: "/student/teacher-classes/attendance" as Route,
        label: "Thông tin điểm danh",
        short: "Điểm danh",
        icon: "checkCircle",
        mobile: true,
      },
      {
        href: "/student/teacher-classes/assignments" as Route,
        label: "Bài tập & Chấm điểm",
        short: "Bài tập",
        icon: "assignment",
        mobile: true,
      },
    ],
  },
];

export default function TeacherClassesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    data,
    avatarUrl,
    account,
    subjectClasses,
    attendanceSessions,
    allSubmissions,
    signOut,
  } = useStudent();

  const user = data
    ? {
        name: account.displayName,
        role: `${account.roleTitle} · Cố vấn ${account.cohortClass}`,
        initial: initials(account.displayName),
        avatarUrl,
      }
    : null;

  const pendingSubmissions = allSubmissions.filter((item) => item.status === "submitted");
  const notifications: Notification[] = pendingSubmissions.slice(0, 5).map((sub) => {
    const asg = data?.assignments.find((a) => a.id === sub.assignmentId);
    return {
      id: sub.id,
      title: `Bài nộp mới: ${sub.studentName} (${sub.studentCode})`,
      text: asg?.title ?? "Bài tập học phần chờ chấm điểm",
      href: "/student/teacher-classes/assignments" as Route,
    };
  });

  const searchItems: SearchSuggestion[] = [
    {
      id: "tc-overview",
      label: "Tổng quan giảng dạy",
      detail: "Bảng điều khiển lớp chủ nhiệm, lớp bộ môn, lịch dạy và việc cần duyệt",
      category: "Quản lý lớp học",
      href: "/student/teacher-classes" as Route,
      icon: "home",
      keywords: "tong quan giang day bang dieu khien giao vien",
    },
    {
      id: "tc-homeroom",
      label: `Lớp chủ nhiệm ${account.cohortClass}`,
      detail: "Danh sách sinh viên, ban cán sự, GPA, sổ cố vấn học tập và thông báo lớp",
      category: "Quản lý lớp học",
      href: "/student/teacher-classes/homeroom" as Route,
      icon: "users",
      keywords: "lop chu nhiem sinh vien co van hoc tap dk13 cntt1",
    },
    {
      id: "tc-subjects",
      label: "Các lớp bộ môn giảng dạy",
      detail: "Quản lý lớp học phần, tiến độ tiết dạy, lịch phòng học/Lab và mở lớp mới",
      category: "Quản lý lớp học",
      href: "/student/teacher-classes/subjects" as Route,
      icon: "class",
      keywords: "lop bo mon hoc phan it3040 it3160 tien do tiet day",
    },
    {
      id: "tc-attendance",
      label: "Thông tin điểm danh & Chuyên cần",
      detail: "Sổ điểm danh điện tử theo buổi học, đánh dấu Có mặt/Có phép/Không phép và xét điều kiện thi",
      category: "Quản lý lớp học",
      href: "/student/teacher-classes/attendance" as Route,
      icon: "checkCircle",
      keywords: "thong tin diem danh chuyen can vang hoc cam thi",
    },
    {
      id: "tc-assignments",
      label: "Bài tập & Chấm điểm của giáo viên",
      detail: "Giao bài tập mới, theo dõi tiến độ nộp bài và chấm điểm thang 10 kèm nhận xét",
      category: "Quản lý lớp học",
      href: "/student/teacher-classes/assignments" as Route,
      icon: "assignment",
      keywords: "bai tap cham diem giao bai phan hoi",
    },
    ...subjectClasses.map((cls) => ({
      id: `tc-subj-${cls.id}`,
      label: `${cls.courseCode} · ${cls.name}`,
      detail: `Mã LHP ${cls.classCode} · Lớp ${cls.cohortClass} · ${cls.room}`,
      category: "Lớp bộ môn",
      href: `/student/teacher-classes/subjects?classId=${cls.id}` as Route,
      icon: "class" as const,
      keywords: `${cls.courseCode} ${cls.classCode} ${cls.name} ${cls.cohortClass}`,
    })),
    ...attendanceSessions.map((sess) => ({
      id: `tc-att-${sess.id}`,
      label: `Điểm danh ${sess.date} · ${sess.periods}`,
      detail: sess.topic,
      category: "Điểm danh",
      href: `/student/teacher-classes/attendance?sessionId=${sess.id}` as Route,
      icon: "checkCircle" as const,
      keywords: `diem danh ${sess.date} ${sess.topic}`,
    })),
  ];

  return (
    <>
      <SceneArrival />
      <AppShell
        nav={teacherClassNav}
        user={user}
        tag="GV"
        searchAction={"/student/teacher-classes/subjects" as Route}
        searchLabel="Tìm lớp bộ môn, sinh viên, buổi điểm danh, bài tập"
        searchItems={searchItems}
        notifications={notifications}
        profileHref={"/student/account" as Route}
        noticesHref={"/student/teacher-classes/homeroom" as Route}
        headerActions={
          <Link
            href={"/student" as Route}
            className="top-teacher-btn is-return"
            title="Quay về Cổng thông tin chung"
          >
            <Icon name="home" />
            <span>Về Cổng chính</span>
          </Link>
        }
        sideCard={
          <div className="side-foot">
            <div className="side-links">
              <Link href={"/student" as Route}>
                <Icon name="home" /> <span>Về Cổng học tập</span>
              </Link>
              <button
                type="button"
                onClick={(event) => void signOut(centerOf(event.currentTarget))}
              >
                <Icon name="logout" /> <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        }
      >
        {children}
      </AppShell>
    </>
  );
}
