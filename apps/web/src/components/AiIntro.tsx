"use client";

import { useEffect, useState } from "react";
import { PhuongFlower } from "./landing/Phuong";

const seenKey = "sao-do:ai-intro";

/**
 * Opening scene for the AI workspace tab: a phượng-red splash that blooms, waits until the
 * workspace is `ready` (at least ~0.9 s so it never flickers), then opens like a curtain.
 * Plays once per tab (sessionStorage), never under prefers-reduced-motion.
 * `arrived` switches on the staggered entrance of the workspace behind it.
 */
export function useAiIntro(ready: boolean) {
  // "idle" until mounted, so server and client render the same markup.
  const [phase, setPhase] = useState<"idle" | "show" | "leaving" | "done">("idle");
  const [minElapsed, setMinElapsed] = useState(false);
  // Stays true after the curtain opens so the staggered entrance is not cut short.
  const [arrived, setArrived] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(seenKey) === "1";
    } catch {
      // No storage: play it.
    }
    const skip = seen || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    queueMicrotask(() => setPhase(skip ? "done" : "show"));
    if (skip) return;
    const timer = window.setTimeout(() => setMinElapsed(true), 900);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (phase !== "show" || !ready || !minElapsed) return;
    queueMicrotask(() => {
      setPhase("leaving");
      setArrived(true);
    });
  }, [phase, ready, minElapsed]);

  const finish = () => {
    setPhase("done");
    try {
      sessionStorage.setItem(seenKey, "1");
    } catch {
      // Preference only.
    }
  };

  const splash =
    phase === "show" || phase === "leaving" ? (
      <div
        className={`aw-splash${phase === "leaving" ? " is-leaving" : ""}`}
        aria-hidden="true"
        onAnimationEnd={(event) => {
          if (event.animationName === "aw-splash-out") finish();
        }}
      >
        <span className="aw-splash-mark"><PhuongFlower size={58} /></span>
        <strong>Trợ lý Sao Đỏ</strong>
        <span>Học cùng AI</span>
      </div>
    ) : null;

  return { splash, arrived };
}
