"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect } from "react";

// Scene changes: welcome ↔ login, login → portal, sign-out, AI → portal. The curtain is a plain DOM node on <body>, not React state,
// so it survives the route change (and any loading UI) until the login page opens it again.
const CURTAIN = "sd-curtain";
const petal = "M0 0C-5 -4 -7 -12 0 -17C7 -12 5 -4 0 0Z";
const flower = `<svg viewBox="-20 -20 40 40" aria-hidden="true">${[0, 72, 144, 216, 288]
  .map((angle, index) => `<path d="${petal}" transform="rotate(${angle})" fill="${index === 0 ? "#FFE3A3" : "#FFF4EC"}"/>`)
  .join("")}<circle r="3.2" fill="#F4B942"/></svg>`;

/**
 * Covers the page with the phượng curtain growing from (x, y), with an optional caption.
 * `closed` resolves once the page is fully covered; `cancel` removes it (e.g. a failed login).
 * Returns null when motion is reduced or a curtain is already up; callers then just navigate.
 */
export function closeCurtain(x: number, y: number, label?: string) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.querySelector(`.${CURTAIN}`)) return null;
  const curtain = document.createElement("div");
  curtain.className = CURTAIN;
  curtain.setAttribute("aria-hidden", "true");
  curtain.style.setProperty("--x", `${x}px`);
  curtain.style.setProperty("--y", `${y}px`);
  curtain.innerHTML = flower;
  if (label) {
    const caption = document.createElement("span");
    caption.textContent = label;
    curtain.append(caption);
  }
  document.body.append(curtain);
  // Never leave the page covered if navigation stalls.
  const guard = window.setTimeout(() => curtain.remove(), 8000);
  return {
    closed: new Promise<void>((resolve) => window.setTimeout(resolve, 700)),
    cancel: () => {
      window.clearTimeout(guard);
      curtain.remove();
    },
  };
}

/** Centre of an element, for curtains started from a button or keyboard activation. */
export function centerOf(element: Element) {
  const box = element.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

/** Any plain click on a link to `to` closes the curtain from the click point, then navigates. */
export function SceneCurtain({ to }: { to: Route }) {
  const router = useRouter();

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.(`a[href="${to}"]`);
      if (!link || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      event.preventDefault();
      event.stopPropagation();
      // Keyboard activation reports 0,0: grow from the link itself instead.
      const origin = event.detail ? { x: event.clientX, y: event.clientY } : centerOf(link);
      const curtain = closeCurtain(origin.x, origin.y);
      if (curtain) void curtain.closed.then(() => router.push(to));
    };
    router.prefetch(to);
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router, to]);

  return null;
}

/** Opens a curtain left by the previous page and flags the page's entrance (html.sd-arriving). */
export function SceneArrival() {
  useLayoutEffect(() => {
    const curtain = document.querySelector<HTMLElement>(`.${CURTAIN}:not(.is-open)`);
    if (!curtain) return;
    const root = document.documentElement;
    curtain.classList.add("is-open");
    root.classList.add("sd-arriving");
    window.setTimeout(() => {
      curtain.remove();
      root.classList.remove("sd-arriving");
    }, 1500);
  }, []);

  return null;
}
