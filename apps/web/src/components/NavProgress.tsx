"use client";

/* eslint-disable @next/next/no-img-element -- tiny static logo */
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Non-blocking route feedback: a top bar plus a small logo pill. It appears
 * only if the navigation takes longer than 150ms, so cached transitions never
 * flash, and gives up after 10s so a failed navigation cannot leave it stuck.
 */
export function NavProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);

  useEffect(() => {
    let show: ReturnType<typeof setTimeout> | undefined;
    let giveUp: ReturnType<typeof setTimeout> | undefined;
    const start = () => {
      clearTimeout(show);
      clearTimeout(giveUp);
      show = setTimeout(() => setActive(true), 150);
      giveUp = setTimeout(() => setActive(false), 10_000);
    };
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement) || link.target || link.hasAttribute("download")) return;
      const url = new URL(link.href);
      if (url.origin === location.origin && url.pathname !== location.pathname) start();
    };
    document.addEventListener("click", onClick);
    window.addEventListener("popstate", start);
    return () => {
      clearTimeout(show);
      clearTimeout(giveUp);
      document.removeEventListener("click", onClick);
      window.removeEventListener("popstate", start);
    };
  }, [pathname]);

  useEffect(() => {
    queueMicrotask(() => setActive(false));
  }, [pathname]);

  return (
    <>
      <div className={`nav-progress${active ? " active" : ""}`} aria-hidden="true" />
      <div className={`nav-pill${active ? " active" : ""}`} aria-hidden="true">
        <img src="/sao-do-logo.png" alt="" width={30} height={32} />
        Đang tải…
      </div>
      <span className="sr-only" role="status">
        {active ? "Đang chuyển trang…" : ""}
      </span>
    </>
  );
}
