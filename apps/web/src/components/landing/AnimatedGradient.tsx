"use client";

import { useEffect, useRef } from "react";

// Motion Prompt #095 · Animated gradient (グラデーションアニメーション)
// Reference coordinate space: 511 × 168 px, seamless 4.8 s elliptical cycle.
const VW = 511;
const VH = 168;
const CYC = 4.8;

type BlobSpec = readonly [
  color: string,
  x0: number,
  y0: number,
  r: number,
  ax: number,
  ay: number,
  phase: number,
];

// Reference geometry, radii, ellipse axes, and start angles (0, 2.1, 4.2, 1.0 rad) kept intact.
// Colours: Base #FFF1EB, Orange (#FF5A2C, r=230), Light orange #FFB08F (r=210),
// Blue (#3B64E8, r=240), Light blue #9DB6FB (r=200), each at 0.85 opacity.
const LIGHT_BASE = "#FFF1EB";
const LIGHT_FADE = "rgba(255,255,255,0)";
const LIGHT_BLOBS: readonly BlobSpec[] = [
  ["#FF5A2C", 150, 60, 230, 70, 30, 0],
  ["#FFB08F", 380, 40, 210, 60, 40, 2.1],
  ["#3B64E8", 330, 150, 240, 80, 30, 4.2],
  ["#9DB6FB", 90, 170, 200, 50, 35, 1.0],
];

const DARK_BASE = "#161513";
const DARK_FADE = "rgba(22,21,19,0)";
const DARK_BLOBS: readonly BlobSpec[] = [
  ["#8F1D2C", 150, 60, 230, 70, 30, 0],
  ["#5E2A1E", 380, 40, 210, 60, 40, 2.1],
  ["#1D3578", 330, 150, 240, 80, 30, 4.2],
  ["#243B6B", 90, 170, 200, 50, 35, 1.0],
];

export function drawAnimatedGradient(
  k: CanvasRenderingContext2D,
  w: number,
  h: number,
  u: number,
  dark = false,
) {
  const a = (2 * Math.PI * u) / CYC;
  const blobs = dark ? DARK_BLOBS : LIGHT_BLOBS;
  const base = dark ? DARK_BASE : LIGHT_BASE;
  const fade = dark ? DARK_FADE : LIGHT_FADE;

  k.save();
  k.scale(w / VW, h / VH);
  k.fillStyle = base;
  k.fillRect(0, 0, VW, VH);

  for (const [col, x0, y0, r, ax, ay, ph] of blobs) {
    const x = x0 + ax * Math.cos(a + ph);
    const y = y0 + ay * Math.sin(a + ph);
    const g = k.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col);
    g.addColorStop(1, fade);
    k.globalAlpha = 0.85;
    k.fillStyle = g;
    k.fillRect(0, 0, VW, VH);
    k.globalAlpha = 1;
  }
  k.restore();
}

export function AnimatedGradient({ className = "sd-gradient-bg" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const k = canvas.getContext("2d");
    if (!k) return;

    const cw = VW * 2;
    const ch = VH * 2;
    canvas.width = cw;
    canvas.height = ch;

    const isDark = () =>
      Boolean(document.querySelector('[data-theme="dark"]'));

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) {
      k.setTransform(1, 0, 0, 1, 0, 0);
      k.clearRect(0, 0, cw, ch);
      drawAnimatedGradient(k, cw, ch, 0, isDark());
      return;
    }

    const t0 = performance.now();
    let rafId = 0;

    const loop = (now: number) => {
      const u = (((now - t0) / 1000) % CYC + CYC) % CYC;
      k.setTransform(1, 0, 0, 1, 0, 0);
      k.clearRect(0, 0, cw, ch);
      drawAnimatedGradient(k, cw, ch, u, isDark());
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
    />
  );
}
