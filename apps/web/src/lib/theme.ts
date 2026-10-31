"use client";

import { type MouseEvent, useEffect, useState } from "react";
import { playThemeMaskTransition } from "@/components/MaskTransition";

export type Theme = "light" | "dark";
const themeKey = "sao-do:theme";
const themeSyncEvent = "sao-do:theme-sync";

function readResolvedTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const value = localStorage.getItem(themeKey);
    if (value === "light" || value === "dark") return value;
  } catch {
    // Ignore storage access errors.
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Light/dark for the student area: a saved choice wins; otherwise follow the system and keep following it. */
export function usePhuongTheme() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const system = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setTheme(readResolvedTheme());
    sync();
    system.addEventListener("change", sync);
    window.addEventListener("storage", sync);
    window.addEventListener(themeSyncEvent, sync);
    return () => {
      system.removeEventListener("change", sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener(themeSyncEvent, sync);
    };
  }, []);

  function toggleTheme(
    trigger?: MouseEvent<HTMLElement> | { x: number; y: number },
  ) {
    const current = readResolvedTheme();
    const next: Theme = current === "dark" ? "light" : "dark";

    let origin: { x: number; y: number } | undefined;
    if (trigger && "currentTarget" in trigger && trigger.currentTarget) {
      const rect = trigger.currentTarget.getBoundingClientRect();
      origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    } else if (trigger && "x" in trigger && typeof trigger.x === "number") {
      origin = trigger;
    }

    const applyTheme = () => {
      if (typeof document !== "undefined") {
        document.querySelectorAll<HTMLElement>(".sd-app, .aw").forEach((el) => {
          el.setAttribute("data-theme", next);
        });
      }
      setTheme(next);
      try {
        localStorage.setItem(themeKey, next);
        window.dispatchEvent(new CustomEvent(themeSyncEvent));
      } catch {
        // Preference only.
      }
    };

    playThemeMaskTransition({
      fromTheme: current,
      toTheme: next,
      origin,
      applyTheme,
    });
  }

  return { theme, toggleTheme };
}

