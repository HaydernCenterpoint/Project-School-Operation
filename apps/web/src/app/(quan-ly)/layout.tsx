"use client";

import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StaffContext, type Staff } from "@/components/admin/StaffContext";
import { AppShell, type NavGroup } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { centerOf, closeCurtain, SceneArrival } from "@/components/landing/SceneTransition";
import { initials } from "@/lib/format";
import { students, type StaffRole } from "@/lib/students";
import { getSupabaseBrowserClient, hasSupabaseEnvironment } from "@/lib/supabase-browser";
import "@/components/admin/admin.css";

const roleLabels: Record<StaffRole, string> = { admin: "Quản trị viên", staff: "Cán bộ phòng ban", teacher: "Giảng viên" };

/** One shell for teachers, staff and admins: class work and student records side by side. */
function navFor(role: StaffRole): NavGroup[] {
  const manage = role !== "teacher";
  return [{
    label: "",
    items: [
      ...(role !== "staff" ? [{ href: "/portal" as Route, label: "Lớp học & bài tập", short: "Lớp học", icon: "class" as const, mobile: true }] : []),
      { href: "/quan-tri", label: manage ? "Sinh viên" : "Sinh viên lớp tôi", short: "Sinh viên", icon: "users", exact: true, mobile: true },
      ...(manage ? [{ href: "/quan-tri/nhap" as Route, label: "Nhập từ tệp", short: "Nhập", icon: "file" as const, mobile: true }] : []),
    ],
  }];
}

export default function ManagementLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<Staff | null>(null);
  const [error, setError] = useState(hasSupabaseEnvironment ? "" : "Hệ thống chưa cấu hình dịch vụ xác thực.");

  useEffect(() => {
    if (!hasSupabaseEnvironment) return;
    void (async () => {
      const { data } = await getSupabaseBrowserClient().auth.getSession();
      if (!data.session) return router.replace(`/login?next=${encodeURIComponent(pathname)}` as Route);
      if (data.session.user.app_metadata.must_change_password) return router.replace(`/doi-mat-khau?next=${encodeURIComponent(pathname)}` as Route);
      try {
        const found = await students.role();
        if (!found) return router.replace("/student");
        setMe(found);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Không tải được quyền truy cập.");
      }
    })();
    // Only on entry; moving between management pages keeps the same session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function signOut(event: React.MouseEvent<HTMLButtonElement>) {
    const { x, y } = centerOf(event.currentTarget);
    await closeCurtain(x, y, "Đã đăng xuất. Hẹn gặp lại!")?.closed;
    await getSupabaseBrowserClient().auth.signOut();
    router.replace("/login");
  }

  if (error) {
    return (
      <main className="ad-gate">
        <div className="notice error" role="alert">
          <Icon name="alert" />
          <div><strong>Không mở được trang quản lý</strong><p>{error}</p></div>
        </div>
      </main>
    );
  }

  return (
    <>
      <SceneArrival />
      <AppShell
        nav={me ? navFor(me.role) : []}
        user={me ? { name: me.name, role: roleLabels[me.role], initial: initials(me.name) } : null}
        tag="QL"
        searchAction="/quan-tri"
        searchLabel="Tìm sinh viên"
        notifications={null}
        profileHref="/quan-tri"
        sideCard={
          <div className="side-foot">
            <div className="side-links">
              <button type="button" onClick={(event) => void signOut(event)}><Icon name="logout" /> <span>Đăng xuất</span></button>
            </div>
          </div>
        }
      >
        {me ? (
          <StaffContext.Provider value={me}>{children}</StaffContext.Provider>
        ) : (
          <div aria-busy="true">
            <span className="sr-only">Đang kiểm tra quyền truy cập…</span>
            <div className="skeleton" style={{ height: 56, width: 320, marginBottom: 16 }} />
            <div className="skeleton" style={{ height: 480 }} />
          </div>
        )}
      </AppShell>
    </>
  );
}
