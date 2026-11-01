"use client";

import { useLayoutEffect, useState } from "react";

type Box = { x: number; y: number; w: number; h: number };

/**
 * Tracks the `[aria-current="page"]` child of a container so a single highlight can slide
 * between items instead of jumping. Re-measures whenever `key` changes or the container
 * resizes (sidebar collapse, fonts loading). `ready` turns true after the first measure,
 * so the highlight appears in place on load and only animates on later moves.
 */
export function useSlider<T extends HTMLElement>(key: string, selector = '[aria-current="page"]') {
  // Callback ref (state, not useRef) so the container can be read in the effect below.
  const [container, attach] = useState<T | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [ready, setReady] = useState(false);

  // Layout effect: runs in the same commit as the aria-current change, so the highlight starts
  // moving on click even while the next route is still rendering (a passive effect waits for
  // the main thread to be idle, which can take seconds in dev).
  useLayoutEffect(() => {
    if (!container) return;
    const measure = () => {
      const current = container.querySelector<HTMLElement>(selector);
      setBox(current ? { x: current.offsetLeft, y: current.offsetTop, w: current.offsetWidth, h: current.offsetHeight } : null);
      requestAnimationFrame(() => setReady(true));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [container, key, selector]);

  const style = box
    ? { transform: `translate(${box.x}px, ${box.y}px)`, width: box.w, height: box.h, opacity: 1 }
    : { opacity: 0 };
  return { attach, style, ready };
}
