"use client";

import { useEffect, useState } from "react";
import { LogoLoader } from "./LogoLoader";

/**
 * Server-rendered on every hard load, dismissed as soon as React hydrates.
 * CSS hides it after 12s even if JavaScript never runs, and offers a reload
 * link after 6s.
 */
export function BootSplash() {
  const [state, setState] = useState<"visible" | "leaving" | "gone">("visible");

  useEffect(() => {
    const leave = requestAnimationFrame(() => setState("leaving"));
    const remove = setTimeout(() => setState("gone"), 400);
    return () => {
      cancelAnimationFrame(leave);
      clearTimeout(remove);
    };
  }, []);

  if (state === "gone") return null;
  return (
    <div
      className={`boot-splash${state === "leaving" ? " is-done" : ""}`}
      aria-hidden={state === "leaving"}
    >
      <div className="logo-loader">
        <LogoLoader label="Đang khởi động cổng học tập…" />
        <p className="boot-slow">
          Trang đang tải lâu hơn dự kiến.{" "}
          <a href="">Tải lại trang</a>
        </p>
      </div>
      <noscript>
        <style>{".boot-splash{display:none}"}</style>
      </noscript>
    </div>
  );
}
