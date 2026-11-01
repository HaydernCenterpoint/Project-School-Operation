"use client";

/**
 * Clean circular View Transition from the clicked toggle control's coordinates.
 * Uses native View Transitions API + Web Animations API with cubic-bezier(0.22, 1, 0.36, 1)
 * and falls back to an instant theme switch when unsupported or under reduced motion.
 */
export function playThemeMaskTransition(options: {
  fromTheme: "light" | "dark";
  toTheme: "light" | "dark";
  origin?: { x: number; y: number };
  applyTheme: () => void;
}) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    options.applyTheme();
    return;
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    options.applyTheme();
    return;
  }

  const docWithVT = document as Document & {
    startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> };
  };

  if (typeof docWithVT.startViewTransition !== "function") {
    options.applyTheme();
    return;
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cx = options.origin?.x ?? vw - 76;
  const cy = options.origin?.y ?? 32;
  const endRadius = Math.hypot(Math.max(cx, vw - cx), Math.max(cy, vh - cy));

  const root = document.documentElement;
  root.classList.add("is-theme-transitioning");

  const transition = docWithVT.startViewTransition(() => {
    options.applyTheme();
  });

  void transition.ready
    .then(() => {
      root.animate(
        {
          clipPath: [
            `circle(0px at ${cx}px ${cy}px)`,
            `circle(${Math.ceil(endRadius)}px at ${cx}px ${cy}px)`,
          ],
        },
        {
          duration: 420,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    })
    .catch(() => {
      // Ignore interrupted view transitions.
    });

  void transition.finished.finally(() => {
    root.classList.remove("is-theme-transitioning");
  });
}
