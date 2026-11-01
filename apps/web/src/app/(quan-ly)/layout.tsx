"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { StaffContext, type Staff } from "@/components/admin/StaffContext";
import { AppShell, type NavGroup } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { SceneArrival } from "@/components/landing/SceneTransition";
import { usePortalAccounts } from "@/lib/accounts";
import { useAvatarSync } from "@/lib/avatar";
import { initials } from "@/lib/format";
import { students, type StaffRole } from "@/lib/students";
import { getSupabaseBrowserClient, hasSupabaseEnvironment } from "@/lib/supabase-browser";
import "@/components/admin/admin.css";

const roleLabels: Record<StaffRole, string> = { admin: "Quản trị viên", staff: "Cán bộ phòng ban", teacher: "Giảng viên" };

/** One shell for teachers, staff and admins: account RBAC dashboard, class work and student records side by side. */
function navFor(role: StaffRole): NavGroup[] {
  const manage = role !== "teacher";
  return [{
    label: "",
    items: [
      { href: "/quan-tri/tai-khoan" as Route, label: "Quản lý tài khoản & quyền", short: "Tài khoản", icon: "shield", mobile: true },
      ...(role !== "staff" ? [{ href: "/portal" as Route, label: "Lớp học & bài tập", short: "Lớp học", icon: "class" as const, mobile: true }] : []),
      { href: "/quan-tri", label: manage ? "Hồ sơ sinh viên" : "Sinh viên lớp tôi", short: "Sinh viên", icon: "users", exact: true, mobile: true },
      ...(manage ? [{ href: "/quan-tri/nhap" as Route, label: "Nhập từ tệp", short: "Nhập", icon: "file" as const, mobile: true }] : []),
      ...(manage ? [{ href: "/quan-tri/tin-tuc" as Route, label: "Tin tức", short: "Tin tức", icon: "news" as const, mobile: true }] : []),
      { href: "/student" as Route, label: "Về Cổng học tập", short: "Cổng SV", icon: "home", mobile: true },
    ],
  }];
}

export default function ManagementLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const portalAccounts = usePortalAccounts();
  const avatarUrl = useAvatarSync(portalAccounts.activeAccount.id, false);
  const [remoteStaff, setRemoteStaff] = useState<Staff | null>(null);

  useEffect(() => {
    if (!hasSupabaseEnvironment) return;
    void (async () => {
      try {
        const { data } = await getSupabaseBrowserClient().auth.getSession();
        if (!data.session) return;
        if (data.session.user.app_metadata.must_change_password) {
          router.replace(`/doi-mat-khau?next=${encodeURIComponent(pathname)}` as Route);
          return;
        }
        const found = await students.role();
        if (found) setRemoteStaff(found);
      } catch {
        // Fall back to multi-role portal account for the management dashboard.
      }
    })();
    // Only on entry; moving between management pages keeps the same session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const activeStaff = useMemo<Staff>(() => {
    if (remoteStaff) return remoteStaff;
    const acc = portalAccounts.activeAccount;
    return {
      user_id: acc.id,
      name: acc.displayName,
      email: acc.email,
      role: acc.role === "teacher" ? "teacher" : "admin",
      faculty: acc.department,
    };
  }, [portalAccounts.activeAccount, remoteStaff]);

  return (
    <>
      <SceneArrival />
      <AppShell
        nav={navFor(activeStaff.role)}
        user={{
          name: portalAccounts.activeAccount.displayName,
          role: `${portalAccounts.activeAccount.roleTitle} · ${roleLabels[activeStaff.role]}`,
          initial: initials(portalAccounts.activeAccount.displayName),
          avatarUrl,
        }}
        tag="QL"
        searchAction="/quan-tri"
        searchLabel="Tìm tài khoản, vai trò, sinh viên"
        notifications={null}
        profileHref={"/quan-tri/tai-khoan" as Route}
        headerActions={
          activeStaff.role === "teacher" ? (
            <Link
              href={"/student/teacher-classes" as Route}
              className="top-teacher-btn"
              title="Quản lý lớp chủ nhiệm, các lớp bộ môn, điểm danh và bài tập giảng viên"
            >
              <Icon name="class" />
              <span>Quản lý lớp học</span>
            </Link>
          ) : null
        }
      >
        <StaffContext.Provider value={activeStaff}>{children}</StaffContext.Provider>
      </AppShell>
    </>
  );
}
