"use client";

import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "./Icon";
import { phuongFonts } from "./landing/fonts";
import { usePhuongTheme } from "@/lib/theme";
import { useSlider } from "@/lib/use-slider";
import "@/app/landing.css";
import "./app-phuong.css";
import "./portal.css";

export type NavItem = { href: Route; label: string; icon: IconName; exact?: boolean; short?: string; newTab?: boolean; /** Shown in the phone bottom bar; the rest sit under "Thêm". */ mobile?: boolean;
  /** Sibling pages shown as tabs above the content; the entry is current on any of them. */
  tabs?: { href: Route; label: string; exact?: boolean }[];
  /** Pulled out of the list into a highlighted button at the foot of the sidebar. */
  featured?: boolean;
};
export type NavGroup = { label: string; items: NavItem[] };
export type Notification = { id: string; title: string; text: string; href: Route };

/** Nine entries, no group headings: related pages share one entry and switch with tabs (see `tabs`). */
export const studentNav: NavGroup[] = [
  {
    label: "",
    items: [
      { href: "/student", label: "Tổng quan", icon: "home", mobile: true, tabs: [{ href: "/student", label: "Tổng quan", exact: true }, { href: "/student/notices", label: "Thông báo" }] },
      { href: "/student/schedule", label: "Lịch", icon: "calendar", mobile: true, tabs: [{ href: "/student/schedule", label: "Lịch tuần" }, { href: "/student/exams", label: "Lịch thi" }] },
      { href: "/student/assignments", label: "Học tập", icon: "book", mobile: true, tabs: [{ href: "/student/assignments", label: "Bài tập" }, { href: "/student/classes", label: "Lớp học" }, { href: "/student/grades", label: "Kết quả" }] },
      { href: "/student/registration", label: "Đăng ký học phần", short: "Đăng ký", icon: "clipboard" },
      { href: "/student/tuition", label: "Học phí", icon: "wallet" },
      { href: "/student/activities", label: "Hoạt động", icon: "flag", tabs: [{ href: "/student/activities", label: "Sự kiện & rèn luyện" }, { href: "/student/clubs", label: "Câu lạc bộ" }] },
      { href: "/student/community", label: "Cộng đồng", icon: "message" },
      { href: "/student/ai", label: "Trợ lý AI", short: "AI", icon: "sparkle", newTab: true, mobile: true, featured: true },
      { href: "/student/account", label: "Tài khoản", icon: "user", tabs: [{ href: "/student/account", label: "Thông tin" }, { href: "/student/services", label: "Thủ tục & góp ý" }] },
    ],
  },
];

const collapseKey = "sao-do:sidebar-collapsed";
/** The AI workspace is a full-page tool; it opens beside the portal rather than replacing it. */
export const newTab = { target: "_blank", rel: "noopener" } as const;

export function AppShell({
  nav,
  user,
  sideCard,
  searchAction,
  notifications,
  profileHref,
  noticesHref,
  tag = "SV",
  searchLabel = "Tìm bài tập",
  children,
}: {
  nav: NavGroup[];
  user: { name: string; role: string; initial: string } | null;
  sideCard?: React.ReactNode;
  /** Plain GET form target, so search works without JavaScript. */
  searchAction: Route;
  notifications: Notification[] | null;
  profileHref: Route;
  /** Page listing every notice, linked from the bell. */
  noticesHref?: Route;
  /** Short badge beside the logo naming the area (SV, QT…). */
  tag?: string;
  searchLabel?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { theme, toggleTheme } = usePhuongTheme();

  useEffect(() => {
    queueMicrotask(() => {
      try {
        setCollapsed(localStorage.getItem(collapseKey) === "1");
      } catch {
        // Preference only.
      }
    });
  }, []);

  function toggle() {
    setCollapsed((value) => {
      try {
        localStorage.setItem(collapseKey, value ? "0" : "1");
      } catch {
        // Preference only.
      }
      return !value;
    });
  }

  // The highlight moves on click, before the next route finishes loading; it falls back to the
  // real pathname as soon as that changes, so no reset effect is needed.
  const [pending, setPending] = useState<{ from: string; to: string } | null>(null);
  const here = pending && pending.from === pathname ? pending.to : pathname;
  const go = (href: string) => (event: React.MouseEvent) => {
    if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) setPending({ from: pathname, to: href });
  };
  const matches = (href: string, exact?: boolean) => (exact ? here === href : here === href || here.startsWith(`${href}/`));
  const isCurrent = (item: NavItem): boolean =>
    item.tabs ? item.tabs.some((tab) => matches(tab.href, tab.exact)) : matches(item.href, item.exact);
  const items = nav.flatMap((group) => group.items);
  const section = items.find(isCurrent);
  const title = section?.tabs?.find((tab) => matches(tab.href, tab.exact))?.label ?? section?.label ?? "";
  const { attach: navRef, style: navStyle, ready: navReady } = useSlider<HTMLElement>(`${here}|${collapsed}`);
  const { attach: tabRef, style: tabStyle, ready: tabReady } = useSlider<HTMLElement>(here);

  // Direction of travel for the content entrance: down/up between sidebar entries,
  // left/right between tabs of one entry. Derived during render from the previous route.
  const sectionIndex = section ? items.indexOf(section) : -1;
  const tabIndex = section?.tabs?.findIndex((tab) => matches(tab.href, tab.exact)) ?? 0;
  const [travel, setTravel] = useState({ path: pathname, section: sectionIndex, tab: tabIndex, dir: "none" });
  if (travel.path !== pathname) {
    const dir =
      travel.section === sectionIndex
        ? tabIndex > travel.tab ? "right" : "left"
        : sectionIndex > travel.section ? "down" : "up";
    setTravel({ path: pathname, section: sectionIndex, tab: tabIndex, dir });
  }
  const link = (item: NavItem, compact = false) => (
    <Link
      key={item.href}
      href={item.href}
      aria-current={isCurrent(item) ? "page" : undefined}
      title={item.newTab ? `${item.label} (mở tab mới)` : item.label}
      {...(item.newTab ? newTab : { onClick: go(item.href) })}
    >
      <Icon name={item.icon} />
      <span>{compact ? (item.short ?? item.label) : item.label}</span>
    </Link>
  );

  return (
    <div className={`app-shell sd-app ${phuongFonts}${collapsed ? " is-collapsed" : ""}`} data-theme={theme}>
      <aside className="app-side">
        <div className="side-brand">
          <Link href="/" className="brand-lockup" aria-label="Đại học Sao Đỏ, trang chủ">
            <Image src="/sao-do-logo.png" alt="" width={36} height={38} priority />
            <span>
              <strong>Sao Đỏ</strong>
              <small>Cổng học tập</small>
            </span>
          </Link>
          <span className="version-tag">{tag}</span>
        </div>
        <nav className="app-nav" aria-label="Điều hướng chính" ref={navRef}>
          <span className={`nav-slider${navReady ? " is-ready" : ""}`} style={navStyle} aria-hidden="true" />
          {nav.map((group) => (
            <div key={group.label} className="nav-group">
              {group.label && <p>{group.label}</p>}
              {group.items.filter((item) => !item.featured).map((item) => link(item))}
            </div>
          ))}
        </nav>
        {items
          .filter((item) => item.featured)
          .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="side-feature"
              title={`${item.label} (mở tab mới)`}
              {...(item.newTab ? newTab : {})}
              onClick={(event) => {
                // Launch flourish; the new tab opens immediately (a delay would get it blocked as a popup).
                const button = event.currentTarget;
                button.classList.remove("is-launching");
                void button.offsetWidth;
                button.classList.add("is-launching");
                window.setTimeout(() => button.classList.remove("is-launching"), 700);
              }}
            >
              <Icon name={item.icon} />
              <span>
                <strong>{item.label}</strong>
                <small>Hỏi bài, ôn thi</small>
              </span>
              <Icon name="arrow" />
            </Link>
          ))}
        {sideCard}
      </aside>

      <div className="app-main">
        <header className="app-top">
          <button className="icon-button side-toggle" type="button" onClick={toggle} aria-label={collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"} aria-pressed={collapsed}>
            <Icon name="panel" />
          </button>
          <Link href="/" className="brand-lockup top-brand" aria-label="Về trang chủ">
            <Image src="/sao-do-logo.png" alt="" width={32} height={34} />
          </Link>
          <h1 className="sr-only">{title}</h1>
          <form className="top-search" action={searchAction} role="search">
            <Icon name="search" />
            <label className="sr-only" htmlFor="top-search">{searchLabel}</label>
            <input id="top-search" name="q" type="search" placeholder={`${searchLabel}…`} autoComplete="off" />
          </form>
          <div className="top-actions">
            <button
              className="icon-button theme-toggle"
              type="button"
              onClick={toggleTheme}
              aria-label="Chế độ tối"
              aria-pressed={theme === "dark"}
              title={theme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
            >
              <Icon name={theme === "dark" ? "sun" : "moon"} />
            </button>
            <button
              className="icon-button bell"
              type="button"
              popoverTarget="notifications"
              aria-label={notifications?.length ? `Thông báo, ${notifications.length} phản hồi mới` : "Thông báo"}
            >
              <Icon name="bell" />
              {Boolean(notifications?.length) && <span className="dot" aria-hidden="true" />}
            </button>
            <div id="notifications" popover="auto" className="popover-panel">
              <strong>Thông báo</strong>
              {notifications?.length ? (
                <ul>
                  {notifications.map((item) => (
                    <li key={item.id}>
                      <Link href={item.href}>
                        <span className="tile-icon green"><Icon name="message" /></span>
                        <span className="item-text">
                          <strong>{item.title}</strong>
                          <small>{item.text}</small>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Chưa có thông báo mới.</p>
              )}
              {noticesHref && (
                <Link className="popover-all" href={noticesHref} onClick={() => document.getElementById("notifications")?.hidePopover()}>
                  Xem tất cả thông báo <Icon name="arrow" />
                </Link>
              )}
            </div>
            <Link href={profileHref} className="avatar" aria-label={user ? `Tài khoản của ${user.name}` : "Tài khoản"}>
              {user?.initial ?? ""}
            </Link>
          </div>
        </header>
        <main className="app-content" id="noi-dung">
          {section?.tabs && (
            <nav className="section-tabs" aria-label={section.label} ref={tabRef}>
              <span className={`tab-slider${tabReady ? " is-ready" : ""}`} style={tabStyle} aria-hidden="true" />
              {section.tabs.map((tab) => (
                <Link key={tab.href} href={tab.href} aria-current={matches(tab.href, tab.exact) ? "page" : undefined} onClick={go(tab.href)}>
                  {tab.label}
                </Link>
              ))}
            </nav>
          )}
          <div key={pathname} className="page-enter" data-dir={travel.dir}>
            {children}
          </div>
        </main>
        <footer className="app-footer">
          <span>© 2026 Đại học Sao Đỏ. Cổng học tập sinh viên</span>
          <span>{user ? `${user.name} · ${user.role}` : ""}</span>
        </footer>
      </div>

      <nav className="app-bottom" aria-label="Điều hướng nhanh">
        {(items.some((item) => item.mobile) ? items.filter((item) => item.mobile) : items).map((item) => link(item, true))}
        {items.some((item) => !item.mobile) && items.some((item) => item.mobile) && (
          <button type="button" popoverTarget="more-nav" aria-label="Tất cả chức năng">
            <Icon name="grid" />
            <span>Thêm</span>
          </button>
        )}
      </nav>
      <div id="more-nav" popover="auto" className="more-sheet">
        <strong>Tất cả chức năng</strong>
        {nav.map((group) => (
          <div key={group.label} className="more-group">
            {group.label && <p>{group.label}</p>}
            <div>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isCurrent(item) ? "page" : undefined}
                  onClick={() => document.getElementById("more-nav")?.hidePopover()}
                  {...(item.newTab ? newTab : {})}
                >
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
