"use client";

import type { Route } from "next";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { MaskTransitionShowcase } from "@/components/MaskTransition";
import { centerOf } from "@/components/landing/SceneTransition";
import { DemoBanner, PageTitle, Section } from "@/components/portal/Parts";
import { useStudent } from "@/lib/student-context";
import { usePhuongTheme } from "@/lib/theme";

const collapseKey = "sao-do:sidebar-collapsed";
const notifyPrefKey = "sao-do:pref-notifications";
const compactPrefKey = "sao-do:pref-compact-tables";

export default function StudentSettingsPage() {
  const { account, signOut } = useStudent();
  const { theme, toggleTheme } = usePhuongTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [compactTables, setCompactTables] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      try {
        setSidebarCollapsed(localStorage.getItem(collapseKey) === "1");
        setNotifyEnabled(localStorage.getItem(notifyPrefKey) !== "0");
        setCompactTables(localStorage.getItem(compactPrefKey) === "1");
      } catch {
        // Ignore storage restrictions.
      }
    });
  }, []);

  function updateSidebarPref(next: boolean) {
    setSidebarCollapsed(next);
    try {
      localStorage.setItem(collapseKey, next ? "1" : "0");
    } catch {
      // Ignore storage restrictions.
    }
    setSavedNotice("Đã lưu tuỳ chọn thanh điều hướng bên trái.");
  }

  function updateNotifyPref(next: boolean) {
    setNotifyEnabled(next);
    try {
      localStorage.setItem(notifyPrefKey, next ? "1" : "0");
    } catch {
      // Ignore storage restrictions.
    }
    setSavedNotice("Đã cập nhật tuỳ chọn thông báo học tập.");
  }

  function updateCompactPref(next: boolean) {
    setCompactTables(next);
    try {
      localStorage.setItem(compactPrefKey, next ? "1" : "0");
    } catch {
      // Ignore storage restrictions.
    }
    setSavedNotice("Đã cập nhật mật độ hiển thị bảng dữ liệu.");
  }

  return (
    <>
      <DemoBanner />

      <PageTitle
        title="Cài đặt hệ thống & Giao diện"
        lead="Điều chỉnh chế độ giao diện Sáng / Tối, hiệu ứng chuyển cảnh, tuỳ chọn hiển thị và liên kết sang trang Dashboard Quản lý tài khoản."
      >
        <Link className="button button-primary button-small" href={"/quan-tri/tai-khoan" as Route}>
          <Icon name="shield" /> Mở Dashboard Quản lý tài khoản
        </Link>
      </PageTitle>

      {savedNotice && (
        <div className="notice ok" role="status" style={{ marginBottom: 16 }}>
          <Icon name="checkCircle" />
          <div>
            <strong>Đã lưu cài đặt</strong>
            <p>{savedNotice}</p>
          </div>
          <button
            className="button button-quiet button-xs"
            type="button"
            onClick={() => setSavedNotice("")}
          >
            Đóng
          </button>
        </div>
      )}

      <Section
        title="Giao diện Sáng / Tối (Chế độ hiển thị)"
        action={
          <span className="reg-table-meta">
            Đang sử dụng: <strong>{theme === "dark" ? "Giao diện Tối" : "Giao diện Sáng"}</strong>
          </span>
        }
      >
        <div className="settings-theme-grid" role="radiogroup" aria-label="Chọn giao diện Sáng hoặc Tối">
          <button
            type="button"
            role="radio"
            aria-checked={theme === "light"}
            className={`rbac-account-card${theme === "light" ? " is-active" : ""}`}
            onClick={(event) => {
              if (theme !== "light") toggleTheme(event);
              setSavedNotice("Đã chuyển sang Giao diện Sáng (Giấy sắc phong & Đỏ son Sao Đỏ).");
            }}
          >
            <div className="rbac-account-top">
              <span className="role-badge is-club_leader">
                <Icon name="sun" /> SÁNG
              </span>
              {theme === "light" && <span className="rbac-active-pill">Đang bật</span>}
            </div>
            <strong>Giao diện Sáng (Mặc định)</strong>
            <span className="rbac-account-role">Nền giấy ấm · Chữ mực đậm · Độ tương phản cao</span>
            <p>
              Phù hợp khi tra cứu lịch học, bảng điểm, đọc văn bản học vụ ban ngày hoặc làm việc trong phòng học sáng.
            </p>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={theme === "dark"}
            className={`rbac-account-card${theme === "dark" ? " is-active" : ""}`}
            onClick={(event) => {
              if (theme !== "dark") toggleTheme(event);
              setSavedNotice("Đã chuyển sang Giao diện Tối (Sơn mài đêm & Đỏ phượng trầm).");
            }}
          >
            <div className="rbac-account-top">
              <span className="role-badge is-teacher">
                <Icon name="moon" /> TỐI
              </span>
              {theme === "dark" && <span className="rbac-active-pill">Đang bật</span>}
            </div>
            <strong>Giao diện Tối (Ban đêm)</strong>
            <span className="rbac-account-role">Nền tối dịu mắt · Giảm chói khi làm bài ban đêm</span>
            <p>
              Giảm mỏi mắt khi lập trình, soạn bài nộp hoặc đọc tài liệu học phần trong môi trường ánh sáng yếu.
            </p>
          </button>
        </div>

        <div style={{ marginTop: 16 }}>
          <MaskTransitionShowcase theme={theme} onToggleTheme={toggleTheme} />
        </div>
      </Section>

      <Section title="Tuỳ chọn hiển thị & Thông báo" action={<span className="reg-table-meta">Lưu tự động trên trình duyệt</span>}>
        <div className="stack">
          <article className="row-card">
            <span className="tile-icon blue">
              <Icon name="panel" />
            </span>
            <div className="row-main">
              <strong>Thu gọn cột điều hướng bên trái</strong>
              <small>Chỉ hiển thị biểu tượng ở cột các mục để mở rộng không gian bảng điểm và bài tập</small>
            </div>
            <div className="row-right">
              <button
                type="button"
                className={`button ${sidebarCollapsed ? "button-primary" : "button-outline"} button-small`}
                onClick={() => updateSidebarPref(!sidebarCollapsed)}
              >
                {sidebarCollapsed ? "Đang thu gọn" : "Đang mở rộng"}
              </button>
            </div>
          </article>

          <article className="row-card">
            <span className="tile-icon green">
              <Icon name="bell" />
            </span>
            <div className="row-main">
              <strong>Thông báo phản hồi chấm bài & thông báo lớp</strong>
              <small>Hiển thị chấm đỏ khi giảng viên trả điểm bài tập hoặc đăng thông báo lớp học phần</small>
            </div>
            <div className="row-right">
              <button
                type="button"
                className={`button ${notifyEnabled ? "button-primary" : "button-outline"} button-small`}
                onClick={() => updateNotifyPref(!notifyEnabled)}
              >
                {notifyEnabled ? "Đang bật" : "Đang tắt"}
              </button>
            </div>
          </article>

          <article className="row-card">
            <span className="tile-icon amber">
              <Icon name="list" />
            </span>
            <div className="row-main">
              <strong>Chế độ bảng dữ liệu cô đọng</strong>
              <small>Giảm khoảng đệm dòng trong bảng danh sách lớp học phần và bảng điểm học kỳ</small>
            </div>
            <div className="row-right">
              <button
                type="button"
                className={`button ${compactTables ? "button-primary" : "button-outline"} button-small`}
                onClick={() => updateCompactPref(!compactTables)}
              >
                {compactTables ? "Cô đọng" : "Tiêu chuẩn"}
              </button>
            </div>
          </article>
        </div>
      </Section>

      <Section title="Quản lý tài khoản & Bảo mật phiên làm việc">
        <div className="stack">
          <article className="row-card">
            <span className="tile-icon red">
              <Icon name="shield" />
            </span>
            <div className="row-main">
              <strong>Dashboard Quản lý Tài khoản & Phân quyền (RBAC)</strong>
              <small>
                Chuyển đổi giữa tài khoản Giảng viên, Trưởng CLB và các Sinh viên thuộc lớp {account.cohortClass}; kiểm tra ma trận quyền hạn và dữ liệu lớp/CLB
              </small>
            </div>
            <div className="row-right">
              <Link className="button button-primary button-small" href={"/quan-tri/tai-khoan" as Route}>
                <Icon name="shield" /> Mở Dashboard Quản lý
              </Link>
            </div>
          </article>

          <article className="row-card">
            <span className="tile-icon blue">
              <Icon name="user" />
            </span>
            <div className="row-main">
              <strong>Đổi mật khẩu đăng nhập</strong>
              <small>Cập nhật mật khẩu bảo vệ tài khoản học tập ({account.email})</small>
            </div>
            <div className="row-right">
              <Link className="button button-outline button-small" href="/doi-mat-khau">
                Đổi mật khẩu
              </Link>
            </div>
          </article>

          <article className="row-card">
            <span className="tile-icon red">
              <Icon name="logout" />
            </span>
            <div className="row-main">
              <strong>Đăng xuất khỏi phiên làm việc</strong>
              <small>Đang đăng nhập dưới tên {account.displayName} ({account.code} · {account.roleTitle})</small>
            </div>
            <div className="row-right">
              <button
                className="button button-danger button-small"
                type="button"
                disabled={leaving}
                onClick={(event) => {
                  setLeaving(true);
                  void signOut(centerOf(event.currentTarget));
                }}
              >
                <Icon name="logout" /> {leaving ? "Đang đăng xuất…" : "Đăng xuất"}
              </button>
            </div>
          </article>
        </div>
      </Section>
    </>
  );
}
