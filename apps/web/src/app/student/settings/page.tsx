"use client";

import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
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
    const syncPrefs = () => {
      try {
        setSidebarCollapsed(localStorage.getItem(collapseKey) === "1");
        setNotifyEnabled(localStorage.getItem(notifyPrefKey) !== "0");
        setCompactTables(localStorage.getItem(compactPrefKey) === "1");
      } catch {
        // Ignore storage restrictions.
      }
    };
    queueMicrotask(syncPrefs);
    window.addEventListener("storage", syncPrefs);
    window.addEventListener("sao-do:sidebar-sync", syncPrefs);
    return () => {
      window.removeEventListener("storage", syncPrefs);
      window.removeEventListener("sao-do:sidebar-sync", syncPrefs);
    };
  }, []);

  function updateSidebarPref(next: boolean) {
    setSidebarCollapsed(next);
    try {
      localStorage.setItem(collapseKey, next ? "1" : "0");
      window.dispatchEvent(new CustomEvent("sao-do:sidebar-sync"));
    } catch {
      // Ignore storage restrictions.
    }
    setSavedNotice(
      next
        ? "Đã thu gọn thanh điều hướng bên trái xuống 72px"
        : "Đã mở rộng thanh điều hướng bên trái lên 248px",
    );
  }

  function updateNotifyPref(next: boolean) {
    setNotifyEnabled(next);
    try {
      localStorage.setItem(notifyPrefKey, next ? "1" : "0");
    } catch {
      // Ignore storage restrictions.
    }
    setSavedNotice(
      next
        ? "Đã bật chấm thông báo khi có điểm hoặc phản hồi bài tập mới"
        : "Đã tắt chấm thông báo trên thanh công cụ",
    );
  }

  function updateCompactPref(next: boolean) {
    setCompactTables(next);
    try {
      localStorage.setItem(compactPrefKey, next ? "1" : "0");
    } catch {
      // Ignore storage restrictions.
    }
    setSavedNotice(
      next
        ? "Đã chuyển bảng dữ liệu sang mật độ cô đọng (36px/dòng)"
        : "Đã chuyển bảng dữ liệu về mật độ tiêu chuẩn (48px/dòng)",
    );
  }

  return (
    <div className="stg-page">
      <DemoBanner />

      <PageTitle
        title="Cài đặt không gian học tập"
        lead="Tuỳ chỉnh bảng màu sáng tối, mật độ hiển thị bảng dữ liệu, thông báo học vụ và bảo mật phiên đăng nhập"
      >
        <Link className="button button-quiet button-sm" href="/student/account">
          <Icon name="user" /> Hồ sơ sinh viên
        </Link>
        <Link className="button button-primary button-sm" href={"/quan-tri/tai-khoan" as Route}>
          <Icon name="shield" /> Phân quyền & tài khoản
        </Link>
      </PageTitle>

      {savedNotice && (
        <div className="stg-toast" role="status" aria-live="polite">
          <span className="stg-toast-dot" aria-hidden="true" />
          <div className="stg-toast-body">
            <strong>Đã đồng bộ tuỳ chọn</strong>
            <span>{savedNotice}</span>
          </div>
          <button
            className="stg-toast-close"
            type="button"
            onClick={() => setSavedNotice("")}
          >
            Đóng
          </button>
        </div>
      )}

      {/* Overview Ledger: Session Dossier + Active Environment Summary */}
      <div className="stg-overview">
        <article className="stg-session-card" aria-label="Phiên đăng nhập hiện tại">
          <header className="stg-session-head">
            <div className="stg-session-school">
              <span className="stg-session-seal">
                <Image src="/sao-do-logo.png" alt="Trường Đại học Sao Đỏ" width={28} height={30} />
              </span>
              <div>
                <strong>Trường Đại học Sao Đỏ</strong>
                <span>Không gian học tập số · saodo.edu.vn</span>
              </div>
            </div>
            <span className="stg-live-pill">
              <i aria-hidden="true" /> Phiên hợp lệ
            </span>
          </header>

          <dl className="stg-session-grid">
            <div>
              <dt>Tài khoản đang dùng</dt>
              <dd className="is-sans">{account.displayName}</dd>
            </div>
            <div>
              <dt>Mã định danh</dt>
              <dd>{account.code}</dd>
            </div>
            <div>
              <dt>Vai trò học vụ</dt>
              <dd className="is-sans">{account.roleTitle}</dd>
            </div>
            <div>
              <dt>Email học vụ</dt>
              <dd>{account.email}</dd>
            </div>
          </dl>

          <footer className="stg-session-foot">
            <span>
              Đơn vị: <strong>{account.department}</strong>
            </span>
            <code>RLS · Tenant SDU-01</code>
          </footer>
        </article>

        <article className="stg-env-card" aria-label="Trạng thái cấu hình giao diện">
          <div className="stg-env-head">
            <div>
              <span className="stg-env-label">Cấu hình thiết bị hiện tại</span>
              <strong className="stg-env-value">
                {theme === "dark" ? "Sơn mài đêm" : "Giấy sắc phong"}
              </strong>
            </div>
            <span className="stg-env-code">{theme === "dark" ? "DARK · #1F1517" : "LIGHT · #FFFAF4"}</span>
          </div>

          <dl className="stg-env-metrics">
            <div>
              <dt>Cột điều hướng</dt>
              <dd>{sidebarCollapsed ? "72 px" : "248 px"}</dd>
            </div>
            <div>
              <dt>Dòng bảng</dt>
              <dd>{compactTables ? "36 px" : "48 px"}</dd>
            </div>
            <div>
              <dt>Thông báo</dt>
              <dd>{notifyEnabled ? "Đang bật" : "Đang tắt"}</dd>
            </div>
          </dl>

          <div className="stg-env-foot">
            <span>Phím tắt tra cứu nhanh trên mọi trang</span>
            <span className="stg-keycaps" aria-label="Phím tắt Ctrl K">
              <kbd>Ctrl</kbd>
              <kbd>K</kbd>
            </span>
          </div>
        </article>
      </div>

      {/* Pass 8 Moment: Dual-Material Studio Specimen Selector */}
      <Section
        title="Bảng màu & chế độ sáng tối"
        action={
          <span className="reg-table-meta">
            Đang áp dụng: <strong>{theme === "dark" ? "Giao diện tối" : "Giao diện sáng"}</strong>
          </span>
        }
      >
        <div className="settings-theme-grid" role="radiogroup" aria-label="Chọn giao diện Sáng hoặc Tối">
          <button
            type="button"
            role="radio"
            aria-checked={theme === "light"}
            className={`stg-theme-card${theme === "light" ? " is-active" : ""}`}
            onClick={(event) => {
              if (theme !== "light") toggleTheme(event);
              setSavedNotice("Đã chuyển sang Giao diện sáng (Giấy sắc phong & Đỏ son Sao Đỏ)");
            }}
          >
            <div className="stg-specimen is-light" aria-hidden="true">
              <div className="stg-spec-side">
                <span className="stg-spec-brand" />
                <span className="stg-spec-nav is-current" />
                <span className="stg-spec-nav" />
                <span className="stg-spec-nav" />
              </div>
              <div className="stg-spec-main">
                <div className="stg-spec-top">
                  <span className="stg-spec-search" />
                  <span className="stg-spec-kbd">⌘K</span>
                </div>
                <div className="stg-spec-sheet">
                  <div className="stg-spec-row">
                    <span className="stg-spec-code">IT3040</span>
                    <span className="stg-spec-bar" />
                    <span className="stg-spec-dot" />
                  </div>
                  <div className="stg-spec-row">
                    <span className="stg-spec-code">IT3090</span>
                    <span className="stg-spec-bar is-short" />
                    <span className="stg-spec-dot is-green" />
                  </div>
                </div>
                <div className="stg-spec-swatches">
                  <span style={{ background: "#fffaf4" }} title="#fffaf4" />
                  <span style={{ background: "#ffffff" }} title="#ffffff" />
                  <span style={{ background: "#071a34" }} title="#071a34" />
                  <span style={{ background: "#c81d2e" }} title="#c81d2e" />
                </div>
              </div>
            </div>

            <div className="stg-theme-meta">
              <div className="stg-theme-title-row">
                <span className="stg-theme-icon">
                  <Icon name="sun" />
                </span>
                <strong>Giao diện sáng</strong>
                <code className="stg-theme-tag">Mặc định</code>
                {theme === "light" && (
                  <span className="stg-active-indicator">
                    <i aria-hidden="true" /> Đang bật
                  </span>
                )}
              </div>
              <span className="stg-theme-sub">Giấy sắc phong ấm (#fffaf4) · Mực đậm (#071a34) · Đỏ phượng (#c81d2e)</span>
              <p>
                Tương phản cao cho việc tra cứu thời khóa biểu, bảng điểm học kỳ và đọc văn bản học vụ trong phòng học sáng.
              </p>
            </div>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={theme === "dark"}
            className={`stg-theme-card${theme === "dark" ? " is-active" : ""}`}
            onClick={(event) => {
              if (theme !== "dark") toggleTheme(event);
              setSavedNotice("Đã chuyển sang Giao diện tối (Sơn mài đêm & Đỏ phượng trầm)");
            }}
          >
            <div className="stg-specimen is-dark" aria-hidden="true">
              <div className="stg-spec-side">
                <span className="stg-spec-brand" />
                <span className="stg-spec-nav is-current" />
                <span className="stg-spec-nav" />
                <span className="stg-spec-nav" />
              </div>
              <div className="stg-spec-main">
                <div className="stg-spec-top">
                  <span className="stg-spec-search" />
                  <span className="stg-spec-kbd">⌘K</span>
                </div>
                <div className="stg-spec-sheet">
                  <div className="stg-spec-row">
                    <span className="stg-spec-code">IT3040</span>
                    <span className="stg-spec-bar" />
                    <span className="stg-spec-dot" />
                  </div>
                  <div className="stg-spec-row">
                    <span className="stg-spec-code">IT3090</span>
                    <span className="stg-spec-bar is-short" />
                    <span className="stg-spec-dot is-green" />
                  </div>
                </div>
                <div className="stg-spec-swatches">
                  <span style={{ background: "#1f1517" }} title="#1f1517" />
                  <span style={{ background: "#2a1c1f" }} title="#2a1c1f" />
                  <span style={{ background: "#f6e9e2" }} title="#f6e9e2" />
                  <span style={{ background: "#ff6b5e" }} title="#ff6b5e" />
                </div>
              </div>
            </div>

            <div className="stg-theme-meta">
              <div className="stg-theme-title-row">
                <span className="stg-theme-icon">
                  <Icon name="moon" />
                </span>
                <strong>Giao diện tối</strong>
                <code className="stg-theme-tag">Ban đêm</code>
                {theme === "dark" && (
                  <span className="stg-active-indicator">
                    <i aria-hidden="true" /> Đang bật
                  </span>
                )}
              </div>
              <span className="stg-theme-sub">Sơn mài đêm (#1f1517) · Chữ kem ấm (#f6e9e2) · Đỏ san hô (#ff6b5e)</span>
              <p>
                Giảm chói mắt khi làm bài tập lập trình, đọc tài liệu học phần hoặc trao đổi với trợ lý AI vào buổi tối.
              </p>
            </div>
          </button>
        </div>
      </Section>

      {/* Display & Notification Ledger */}
      <Section
        title="Tuỳ chọn hiển thị & thông báo"
        action={<span className="reg-table-meta">Đồng bộ tự động trên trình duyệt</span>}
      >
        <div className="stg-ledger">
          <article className="stg-row">
            <span className="stg-row-icon" aria-hidden="true">
              <Icon name="panel" />
            </span>
            <div className="stg-row-main">
              <div className="stg-row-head">
                <strong>Thu gọn cột điều hướng bên trái</strong>
                <code>{sidebarCollapsed ? "72 px" : "248 px"}</code>
              </div>
              <p>Chỉ giữ lại cột biểu tượng để mở rộng diện tích cho bảng điểm, thời khóa biểu và bài tập</p>
            </div>
            <div className="stg-row-control">
              <div className="stg-segmented" role="group" aria-label="Chế độ thanh điều hướng">
                <button
                  type="button"
                  aria-pressed={!sidebarCollapsed}
                  onClick={() => updateSidebarPref(false)}
                >
                  Mở rộng
                </button>
                <button
                  type="button"
                  aria-pressed={sidebarCollapsed}
                  onClick={() => updateSidebarPref(true)}
                >
                  Thu gọn
                </button>
              </div>
            </div>
          </article>

          <article className="stg-row">
            <span className="stg-row-icon" aria-hidden="true">
              <Icon name="bell" />
            </span>
            <div className="stg-row-main">
              <div className="stg-row-head">
                <strong>Chấm báo phản hồi chấm bài & thông báo lớp</strong>
                <code>{notifyEnabled ? "ON" : "OFF"}</code>
              </div>
              <p>Hiển thị chỉ báo trên chuông thông báo khi giảng viên trả điểm bài tập hoặc đăng tin lớp học phần</p>
            </div>
            <div className="stg-row-control">
              <div className="stg-segmented" role="group" aria-label="Thông báo học tập">
                <button
                  type="button"
                  aria-pressed={notifyEnabled}
                  onClick={() => updateNotifyPref(true)}
                >
                  Đang bật
                </button>
                <button
                  type="button"
                  aria-pressed={!notifyEnabled}
                  onClick={() => updateNotifyPref(false)}
                >
                  Tắt
                </button>
              </div>
            </div>
          </article>

          <article className="stg-row">
            <span className="stg-row-icon" aria-hidden="true">
              <Icon name="list" />
            </span>
            <div className="stg-row-main">
              <div className="stg-row-head">
                <strong>Mật độ dòng trong bảng dữ liệu</strong>
                <code>{compactTables ? "36 px / dòng" : "48 px / dòng"}</code>
              </div>
              <p>Điều chỉnh khoảng đệm dọc của danh sách lớp học phần, lịch thi và bảng điểm tích lũy</p>
            </div>
            <div className="stg-row-control">
              <div className="stg-segmented" role="group" aria-label="Mật độ bảng dữ liệu">
                <button
                  type="button"
                  aria-pressed={!compactTables}
                  onClick={() => updateCompactPref(false)}
                >
                  Tiêu chuẩn
                </button>
                <button
                  type="button"
                  aria-pressed={compactTables}
                  onClick={() => updateCompactPref(true)}
                >
                  Cô đọng
                </button>
              </div>
            </div>
          </article>
        </div>
      </Section>

      {/* Account & Session Security Ledger */}
      <Section
        title="Tài khoản & bảo mật phiên làm việc"
        action={<span className="reg-table-meta">{account.code} · {account.cohortClass}</span>}
      >
        <div className="stg-ledger">
          <article className="stg-row">
            <span className="stg-row-icon" aria-hidden="true">
              <Icon name="shield" />
            </span>
            <div className="stg-row-main">
              <div className="stg-row-head">
                <strong>Bảng phân quyền & chuyển đổi tài khoản (RBAC)</strong>
                <code>3 vai trò</code>
              </div>
              <p>
                Chuyển nhanh giữa tài khoản Giảng viên, Trưởng CLB và Sinh viên thuộc lớp {account.cohortClass} để kiểm tra ma trận quyền hạn
              </p>
            </div>
            <div className="stg-row-control">
              <Link className="button button-outline button-sm" href={"/quan-tri/tai-khoan" as Route}>
                Mở bảng phân quyền <Icon name="arrow" />
              </Link>
            </div>
          </article>

          <article className="stg-row">
            <span className="stg-row-icon" aria-hidden="true">
              <Icon name="user" />
            </span>
            <div className="stg-row-main">
              <div className="stg-row-head">
                <strong>Đổi mật khẩu đăng nhập</strong>
                <code>{account.email}</code>
              </div>
              <p>Cập nhật mật khẩu xác thực cho tài khoản học tập và cổng thông tin sinh viên</p>
            </div>
            <div className="stg-row-control">
              <Link className="button button-outline button-sm" href="/doi-mat-khau">
                Đổi mật khẩu
              </Link>
            </div>
          </article>

          <article className="stg-row">
            <span className="stg-row-icon is-danger" aria-hidden="true">
              <Icon name="logout" />
            </span>
            <div className="stg-row-main">
              <div className="stg-row-head">
                <strong>Kết thúc phiên làm việc trên thiết bị này</strong>
                <code>{account.roleTitle}</code>
              </div>
              <p>
                Đăng xuất khỏi tài khoản {account.displayName} ({account.code}) và xoá phiên làm việc hiện tại
              </p>
            </div>
            <div className="stg-row-control">
              <button
                className="button button-danger button-sm"
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
    </div>
  );
}
