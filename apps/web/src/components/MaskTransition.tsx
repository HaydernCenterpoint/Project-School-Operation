"use client";

import { useEffect, useRef, useState } from "react";

// Motion Prompt #017 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#017
// Shared helper code from https://showheyohtaki.github.io/motion-prompt/api/v1/kit/motion.js

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, x: number) => a + (b - a) * x;
export const P = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const eIO = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

export function star(
  k: CanvasRenderingContext2D,
  x: number,
  y: number,
  R: number,
  rot = 0,
  inner = 0.5,
  n = 5,
) {
  k.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? R * inner : R;
    const a = rot - Math.PI / 2 + (i * Math.PI) / n;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i) k.lineTo(px, py);
    else k.moveTo(px, py);
  }
  k.closePath();
}

/** SVG path `d` for a circle centered at (cx, cy) with radius R (used by View Transition clip-path). */
export function circleSvgPath(cx: number, cy: number, r: number): string {
  const radius = Math.max(0.1, r);
  return `M ${cx - radius},${cy} a ${radius},${radius} 0 1,0 ${radius * 2},0 a ${radius},${radius} 0 1,0 ${-radius * 2},0 Z`;
}

/** SVG path `d` for the exact 5-point star from Motion Prompt #017. */
export function starSvgPath(
  x: number,
  y: number,
  R: number,
  rot = 0,
  inner = 0.5,
  n = 5,
): string {
  const radius = Math.max(0.1, R);
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? radius * inner : radius;
    const a = rot - Math.PI / 2 + (i * Math.PI) / n;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    pts.push(`${i === 0 ? "M" : "L"} ${px.toFixed(2)},${py.toFixed(2)}`);
  }
  pts.push("Z");
  return pts.join(" ");
}

// Reference coordinates & timing constants from Motion Prompt #017:
// Day scene -> night scene -> day scene, 2.35 s each half.
// Transition window: 0.45s to 1.6s of each half (duration = 1.15 s), cubic ease-in-out (eIO).
export const SEG3 = 2.35;
export const TA = 0.5; // TA - 0.05 = 0.45
export const TB = 1.5; // TB + 0.10 = 1.60
export const TRANSITION_DURATION_S = 1.15;
export const TRANSITION_DURATION_MS = 1150;
export const SUN: [number, number] = [112, 104];
export const MOON: [number, number] = [427, 104];
export const REF_W = 540;
export const REF_H = 360;

/**
 * Draws the SDU Day (Light) scene on a w x h Canvas 2D context.
 * Sun sits at (112, 104) in the 540x360 coordinate space.
 */
export function drawSduDayScene(
  k: CanvasRenderingContext2D,
  w: number,
  h: number,
  sunPos: [number, number] = SUN,
) {
  k.save();
  // Warm Phuong daylight sky
  const sky = k.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#fff6ec");
  sky.addColorStop(0.62, "#ffe8d1");
  sky.addColorStop(1, "#ffd4b0");
  k.fillStyle = sky;
  k.fillRect(0, 0, w, h);

  // Soft sun halo + sun disc at (112, 104)
  const [sx, sy] = sunPos;
  const halo = k.createRadialGradient(sx, sy, 8, sx, sy, 92);
  halo.addColorStop(0, "rgba(255, 180, 50, 0.55)");
  halo.addColorStop(0.55, "rgba(230, 57, 70, 0.18)");
  halo.addColorStop(1, "rgba(230, 57, 70, 0)");
  k.fillStyle = halo;
  k.beginPath();
  k.arc(sx, sy, 92, 0, Math.PI * 2);
  k.fill();

  // Sun rays
  k.strokeStyle = "#f59e0b";
  k.lineWidth = 3;
  k.lineCap = "round";
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    k.beginPath();
    k.moveTo(sx + Math.cos(a) * 36, sy + Math.sin(a) * 36);
    k.lineTo(sx + Math.cos(a) * 48, sy + Math.sin(a) * 48);
    k.stroke();
  }

  k.fillStyle = "#f59e0b";
  k.beginPath();
  k.arc(sx, sy, 28, 0, Math.PI * 2);
  k.fill();
  k.fillStyle = "#fde68a";
  k.beginPath();
  k.arc(sx - 6, sy - 6, 10, 0, Math.PI * 2);
  k.fill();

  // Distant Chi Linh hills & campus silhouette
  k.fillStyle = "#f3c6a8";
  k.beginPath();
  k.moveTo(0, h * 0.72);
  k.quadraticCurveTo(w * 0.28, h * 0.56, w * 0.56, h * 0.7);
  k.quadraticCurveTo(w * 0.8, h * 0.58, w, h * 0.68);
  k.lineTo(w, h);
  k.lineTo(0, h);
  k.closePath();
  k.fill();

  // Campus main building card preview (Light UI representation)
  const cardX = w * 0.12;
  const cardY = h * 0.52;
  const cardW = w * 0.76;
  const cardH = h * 0.36;
  k.fillStyle = "#ffffff";
  k.strokeStyle = "rgba(120, 50, 40, 0.14)";
  k.lineWidth = 1.5;
  k.beginPath();
  k.roundRect(cardX, cardY, cardW, cardH, 14);
  k.fill();
  k.stroke();

  // Red SDU accent bar & typography
  k.fillStyle = "#d62839";
  k.beginPath();
  k.roundRect(cardX + 18, cardY + 18, 42, 42, 10);
  k.fill();
  k.fillStyle = "#ffffff";
  k.font = "700 13px sans-serif";
  k.textAlign = "center";
  k.textBaseline = "middle";
  k.fillText("SDU", cardX + 39, cardY + 39);

  k.textAlign = "left";
  k.textBaseline = "alphabetic";
  k.fillStyle = "#241614";
  k.font = "700 17px sans-serif";
  k.fillText("Giao diện Sáng · Đại học Sao Đỏ", cardX + 74, cardY + 36);
  k.fillStyle = "#7a5b53";
  k.font = "500 12.5px sans-serif";
  k.fillText("Mặt trời (112, 104) · Nền giấy ấm & sắc đỏ Hoa Phượng", cardX + 74, cardY + 56);

  // Skeleton UI bars inside card
  k.fillStyle = "#f7ede4";
  k.beginPath();
  k.roundRect(cardX + 18, cardY + 76, cardW - 36, 34, 8);
  k.fill();
  k.fillStyle = "#d62839";
  k.beginPath();
  k.roundRect(cardX + 26, cardY + 85, 88, 16, 5);
  k.fill();
  k.fillStyle = "#d8c3b4";
  k.beginPath();
  k.roundRect(cardX + 124, cardY + 85, 140, 16, 5);
  k.fill();
  k.restore();
}

/**
 * Draws the SDU Night (Dark) scene on a w x h Canvas 2D context.
 * Moon & Sao Đỏ star sit at (427, 104) in the 540x360 coordinate space.
 */
export function drawSduNightScene(
  k: CanvasRenderingContext2D,
  w: number,
  h: number,
  moonPos: [number, number] = MOON,
) {
  k.save();
  // Deep night sky
  const sky = k.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#0d090b");
  sky.addColorStop(0.6, "#181115");
  sky.addColorStop(1, "#24161c");
  k.fillStyle = sky;
  k.fillRect(0, 0, w, h);

  // Twinkling stars
  const starCoords = [
    [68, 54, 2],
    [154, 42, 1.5],
    [232, 78, 2.2],
    [310, 48, 1.6],
    [94, 142, 1.8],
    [275, 128, 1.4],
    [486, 62, 1.8],
  ];
  k.fillStyle = "rgba(255, 240, 210, 0.78)";
  for (const [x, y, r] of starCoords) {
    k.beginPath();
    k.arc((x! / REF_W) * w, (y! / REF_H) * h, r!, 0, Math.PI * 2);
    k.fill();
  }

  // Moon & five-point star glow at (427, 104)
  const [mx, my] = moonPos;
  const glow = k.createRadialGradient(mx, my, 6, mx, my, 96);
  glow.addColorStop(0, "rgba(250, 204, 21, 0.42)");
  glow.addColorStop(0.55, "rgba(244, 63, 94, 0.16)");
  glow.addColorStop(1, "rgba(244, 63, 94, 0)");
  k.fillStyle = glow;
  k.beginPath();
  k.arc(mx, my, 96, 0, Math.PI * 2);
  k.fill();

  // Golden five-point star + crescent moon at (427, 104)
  k.fillStyle = "#facc15";
  star(k, mx, my, 28, 0, 0.5, 5);
  k.fill();

  // Night hills silhouette
  k.fillStyle = "#1c1318";
  k.beginPath();
  k.moveTo(0, h * 0.72);
  k.quadraticCurveTo(w * 0.28, h * 0.56, w * 0.56, h * 0.7);
  k.quadraticCurveTo(w * 0.8, h * 0.58, w, h * 0.68);
  k.lineTo(w, h);
  k.lineTo(0, h);
  k.closePath();
  k.fill();

  // Dark UI card preview
  const cardX = w * 0.12;
  const cardY = h * 0.52;
  const cardW = w * 0.76;
  const cardH = h * 0.36;
  k.fillStyle = "#1d1518";
  k.strokeStyle = "rgba(255, 220, 210, 0.14)";
  k.lineWidth = 1.5;
  k.beginPath();
  k.roundRect(cardX, cardY, cardW, cardH, 14);
  k.fill();
  k.stroke();

  k.fillStyle = "#e63946";
  k.beginPath();
  k.roundRect(cardX + 18, cardY + 18, 42, 42, 10);
  k.fill();
  k.fillStyle = "#ffffff";
  k.font = "700 13px sans-serif";
  k.textAlign = "center";
  k.textBaseline = "middle";
  k.fillText("SDU", cardX + 39, cardY + 39);

  k.textAlign = "left";
  k.textBaseline = "alphabetic";
  k.fillStyle = "#f9eef0";
  k.font = "700 17px sans-serif";
  k.fillText("Giao diện Tối · Đại học Sao Đỏ", cardX + 74, cardY + 36);
  k.fillStyle = "#b59ca2";
  k.font = "500 12.5px sans-serif";
  k.fillText("Ngôi sao (427, 104) · Nền đêm dịu mắt & viền trắng 7px", cardX + 74, cardY + 56);

  k.fillStyle = "#2a1e23";
  k.beginPath();
  k.roundRect(cardX + 18, cardY + 76, cardW - 36, 34, 8);
  k.fill();
  k.fillStyle = "#facc15";
  k.beginPath();
  k.roundRect(cardX + 26, cardY + 85, 88, 16, 5);
  k.fill();
  k.fillStyle = "#523c44";
  k.beginPath();
  k.roundRect(cardX + 124, cardY + 85, 140, 16, 5);
  k.fill();
  k.restore();
}

const SCR = [drawSduDayScene, drawSduNightScene] as const;

/**
 * Exact reference implementation of Motion Prompt #017 (CELLS[16]):
 * `u` is time in seconds in [0, 4.70) (two 2.35s segments: Day->Night then Night->Day).
 */
export function renderMotionPrompt017Frame(
  k: CanvasRenderingContext2D,
  w: number,
  h: number,
  u: number,
) {
  const sgi = Math.min(1, Math.floor(u / SEG3)) as 0 | 1;
  const uu = u - sgi * SEG3;
  const a = sgi;
  const b = (1 - sgi) as 0 | 1;

  const p = eIO(P(uu, TA - 0.05, TB + 0.1));
  SCR[a](k, w, h);
  if (p > 0) {
    const c = a === 0 ? SUN : MOON;
    const shape = () => {
      if (a === 0) {
        k.beginPath();
        k.arc(c[0], c[1], lerp(0, 470, p), 0, 7);
      } else {
        star(k, c[0], c[1], lerp(0, 1150, p), p * 1.2, 0.5);
      }
    };
    k.save();
    shape();
    k.clip();
    SCR[b](k, w, h);
    k.restore();
    if (p < 1) {
      k.strokeStyle = "#fff";
      k.lineWidth = 7;
      k.lineJoin = "round";
      shape();
      k.stroke();
    }
  }
}

/**
 * Plays the full-viewport Motion Prompt #017 Mask Transition when toggling Light <-> Dark theme.
 * - Day -> Night (`fromTheme === "light"`): growing circle from origin (or SUN scaled to viewport),
 *   radius 0 -> maxR (470 scaled to viewport diagonal), 1.15s cubic ease-in-out (eIO), 7px white outline.
 * - Night -> Day (`fromTheme === "dark"`): growing 5-point star from origin (or MOON scaled to viewport),
 *   outer radius 0 -> maxStarR (1150 scaled to viewport diagonal), rotating 1.2 rad (~69 deg) as it grows,
 *   1.15s cubic ease-in-out (eIO), 7px white outline.
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

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const scale = Math.hypot(vw, vh) / Math.hypot(REF_W, REF_H);

  // Day -> Night uses a circle (a === 0); Night -> Day uses a 5-point star rotating 1.2 rad (a === 1)
  const a = options.fromTheme === "light" ? 0 : 1;
  const defaultOrigin =
    a === 0
      ? { x: (SUN[0] / REF_W) * vw, y: (SUN[1] / REF_H) * vh }
      : { x: (MOON[0] / REF_W) * vw, y: (MOON[1] / REF_H) * vh };
  const cx = options.origin?.x ?? defaultOrigin.x;
  const cy = options.origin?.y ?? defaultOrigin.y;

  // Ensure the growing shape covers the furthest corner of the viewport at p = 1,
  // while preserving the 470 vs 1150 ratio from Motion Prompt #017.
  const farthestCorner = Math.hypot(Math.max(cx, vw - cx), Math.max(cy, vh - cy));
  const maxCircleR = Math.max(470 * scale, farthestCorner + 16);
  const maxStarR = Math.max(1150 * scale, farthestCorner * 2.25);

  // Create the fixed Canvas 2D overlay that draws the 7px white outline (and fallback mask scene if View Transitions API is absent)
  const existing = document.getElementById("sdu-mask-transition-canvas");
  existing?.remove();

  const canvas = document.createElement("canvas");
  canvas.id = "sdu-mask-transition-canvas";
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(vw * dpr);
  canvas.height = Math.round(vh * dpr);
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100vw",
    height: "100vh",
    pointerEvents: "none",
    zIndex: "9999",
  });
  document.body.appendChild(canvas);
  const k = canvas.getContext("2d");

  const docWithVT = document as Document & {
    startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> };
  };

  const shapeOnCanvas = (ctx: CanvasRenderingContext2D, p: number) => {
    if (a === 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, lerp(0, maxCircleR, p), 0, 7);
    } else {
      star(ctx, cx, cy, lerp(0, maxStarR, p), p * 1.2, 0.5, 5);
    }
  };

  const runAnimationLoop = (onFrame: (raw: number, p: number) => void, onDone: () => void) => {
    const start = performance.now();
    let finished = false;
    let rafId = 0;
    const step = () => {
      if (finished) return;
      const now = performance.now();
      const raw = clamp((now - start) / TRANSITION_DURATION_MS);
      const p = eIO(raw);
      onFrame(raw, p);
      if (raw >= 1) {
        finished = true;
        clearInterval(timerId);
        cancelAnimationFrame(rafId);
        onDone();
      }
    };
    const timerId = window.setInterval(step, 16);
    const rafLoop = () => {
      if (finished) return;
      step();
      if (!finished) rafId = requestAnimationFrame(rafLoop);
    };
    rafId = requestAnimationFrame(rafLoop);
  };

  const runFallbackCanvasLoop = () => {
    runAnimationLoop(
      (_raw, p) => {
        if (k) {
          k.setTransform(dpr, 0, 0, dpr, 0, 0);
          k.clearRect(0, 0, vw, vh);
          if (p > 0 && p < 1) {
            k.save();
            k.fillStyle = a === 0 ? "rgba(255, 246, 236, 0.92)" : "rgba(18, 12, 14, 0.92)";
            k.beginPath();
            k.rect(0, 0, vw, vh);
            shapeOnCanvas(k, p);
            k.fill("evenodd");
            k.restore();

            k.strokeStyle = "#fff";
            k.lineWidth = 7;
            k.lineJoin = "round";
            shapeOnCanvas(k, p);
            k.stroke();
          }
        }
      },
      () => {
        canvas.remove();
      },
    );
  };

  if (typeof docWithVT.startViewTransition === "function") {
    document.documentElement.classList.add("is-mask-transitioning");
    const transition = docWithVT.startViewTransition(() => {
      options.applyTheme();
    });

    void transition.ready
      .then(() => {
        runAnimationLoop(
          (_raw, p) => {
            const pathData =
              a === 0
                ? circleSvgPath(cx, cy, lerp(0, maxCircleR, p))
                : starSvgPath(cx, cy, lerp(0, maxStarR, p), p * 1.2, 0.5, 5);
            document.documentElement.style.setProperty("--mask-clip-path", `path('${pathData}')`);

            if (k) {
              k.setTransform(dpr, 0, 0, dpr, 0, 0);
              k.clearRect(0, 0, vw, vh);
              if (p > 0 && p < 1) {
                k.strokeStyle = "#fff";
                k.lineWidth = 7;
                k.lineJoin = "round";
                shapeOnCanvas(k, p);
                k.stroke();
              }
            }
          },
          () => {
            document.documentElement.style.removeProperty("--mask-clip-path");
            document.documentElement.classList.remove("is-mask-transitioning");
            canvas.remove();
          },
        );
      })
      .catch(() => {
        document.documentElement.style.removeProperty("--mask-clip-path");
        document.documentElement.classList.remove("is-mask-transitioning");
        runFallbackCanvasLoop();
      });
    return;
  }

  // Fallback when View Transitions API is unavailable: render the full Canvas 2D mask transition
  options.applyTheme();
  runFallbackCanvasLoop();
}

/**
 * Interactive Canvas 2D showcase component for Motion Prompt #017 (540x360)
 * Loops or scrubs the exact 4.70s Day -> Night (circle at 112,104, r: 0->470) -> Day (5-point star at 427,104, R: 0->1150, rot: 1.2 rad) cycle.
 */
export function MaskTransitionShowcase({
  theme,
  onToggleTheme,
}: {
  theme: "light" | "dark";
  onToggleTheme: (origin?: { x: number; y: number }) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(true);
  const [timeSec, setTimeSec] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const k = canvas.getContext("2d");
    if (!k) return;

    renderMotionPrompt017Frame(k, REF_W, REF_H, timeSec);
    if (!playing) return;

    let raf = 0;
    const startOffset = performance.now() - timeSec * 1000;
    const loopDuration = SEG3 * 2; // 4.70s full cycle (2.35s Day->Night + 2.35s Night->Day)

    const step = () => {
      const elapsed = ((performance.now() - startOffset) / 1000) % loopDuration;
      renderMotionPrompt017Frame(k, REF_W, REF_H, elapsed);
      setTimeSec(elapsed);
    };
    const timer = window.setInterval(step, 50);
    const loop = () => {
      step();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      clearInterval(timer);
      cancelAnimationFrame(raf);
    };
  }, [playing]);

  const isSecondHalf = timeSec >= SEG3;
  const halfTime = isSecondHalf ? timeSec - SEG3 : timeSec;

  return (
    <div className="mp017-card">
      <div className="mp017-head">
        <div>
          <span className="reg-label">Motion Prompt #017 · Mask transition (マスクトランジション)</span>
          <h4>Hiệu ứng chuyển đổi giao diện Sáng ↔ Tối</h4>
          <p>
            Sáng → Tối: cửa sổ hình tròn mở từ tâm Mặt trời <code>(112, 104)</code> bán kính{" "}
            <code>0 → 470</code>. Tối → Sáng: ngôi sao 5 cánh mở từ tâm Mặt trăng{" "}
            <code>(427, 104)</code> bán kính <code>0 → 1150</code> xoay <code>1.2 rad (~69°)</code>,
            viền trắng <code>7px</code> trong <code>1.15s</code> (cubic ease-in-out).
          </p>
        </div>
        <div className="mp017-actions">
          <button
            type="button"
            className="button button-primary button-small"
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              onToggleTheme({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
            }}
          >
            {theme === "dark" ? "Chuyển sang Sáng (Sao 5 cánh)" : "Chuyển sang Tối (Hình tròn)"}
          </button>
          <button
            type="button"
            className="button button-outline button-small"
            onClick={() => setPlaying((v) => !v)}
          >
            {playing ? "Tạm dừng Canvas" : "Chạy tự động"}
          </button>
        </div>
      </div>

      <div className="mp017-stage-wrap">
        <canvas
          ref={canvasRef}
          width={REF_W}
          height={REF_H}
          className="mp017-canvas"
          aria-label="Minh họa Canvas 2D Motion Prompt 017 chuyển cảnh Sáng và Tối"
        />
        <div className="mp017-controls">
          <div className="mp017-meta">
            <span>
              Pha hiện tại:{" "}
              <strong>
                {isSecondHalf
                  ? "Tối → Sáng (Ngôi sao 5 cánh · xoay 1.2 rad)"
                  : "Sáng → Tối (Hình tròn · R 0→470)"}
              </strong>
            </span>
            <code>
              t = {halfTime.toFixed(2)}s / {SEG3}s (cửa sổ chuyển: 0.45s–1.60s)
            </code>
          </div>
          <input
            type="range"
            min={0}
            max={SEG3 * 2 - 0.01}
            step={0.01}
            value={timeSec}
            aria-label="Thanh thời gian hiệu ứng Mask transition"
            onChange={(e) => {
              setPlaying(false);
              const val = Number(e.target.value);
              setTimeSec(val);
              const ctx = canvasRef.current?.getContext("2d");
              if (ctx) renderMotionPrompt017Frame(ctx, REF_W, REF_H, val);
            }}
          />
        </div>
      </div>
    </div>
  );
}
