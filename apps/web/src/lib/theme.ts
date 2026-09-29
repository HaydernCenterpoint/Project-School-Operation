"use client";

import { useEffect, useState } from "react";

export type Theme = "light" | "dark";
const themeKey = "sao-do:theme";

/** Light/dark for the student area: a saved choice wins; otherwise follow the system and keep following it. */
export function usePhuongTheme() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const system = window.matchMedia("(prefers-color-scheme: dark)");
    const saved = () => {
      try {
        const value = localStorage.getItem(themeKey);
        return value === "light" || value === "dark" ? value : null;
      } catch {
        return null;
      }
    };
    const sync = () => setTheme(saved() ?? (system.matches ? "dark" : "light"));
    sync();
    system.addEventListener("change", sync);
    // Another tab (e.g. the AI workspace) switching theme updates this one too.
    window.addEventListener("storage", sync);
    return () => {
      system.removeEventListener("change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem(themeKey, next);
    } catch {
      // Preference only.
    }
  }

  return { theme, toggleTheme };
}
