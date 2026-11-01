"use client";

// Motion Prompt #049, #057, #071, #081, #085 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/
// Ported per references/porting.md (Section 1 & Colors: palette object C mapped to SDU Hoa Phượng Đỏ brand tokens).

import { useEffect, useRef, useState } from "react";

export type MotionPromptId = "071" | "057" | "081" | "085";

export const MOTION_PROMPT_ITEMS: {
  id: MotionPromptId;
  code: string;
  title: string;
  summary: string;
  url: string;
}[] = [
  {
    id: "071",
    code: "#071",
    title: "Badge Pop & Ripple",
    summary: "Huy hiệu thông báo nảy 1.3× (0.3s easeOutCubic) kèm vòng sóng lan tỏa 0.5s",
    url: "https://showheyohtaki.github.io/motion-prompt/#071",
  },
  {
    id: "057",
    code: "#057",
    title: "Tabs Slide & Cross-fade",
    summary: "Thanh gạch chân trượt mượt (0.25s easeInOutCubic) & nội dung nâng nhẹ 8px",
    url: "https://showheyohtaki.github.io/motion-prompt/#057",
  },
  {
    id: "081",
    code: "#081",
    title: "Hover Lift Cards",
    summary: "Thẻ hội thoại & tin nhắn nổi lên khi rê chuột (0.3s easeOutCubic) kèm đổ bóng ấm",
    url: "https://showheyohtaki.github.io/motion-prompt/#081",
  },
  {
    id: "085",
    code: "#085",
    title: "Click Ink Ripple",
    summary: "Sóng tròn lan từ điểm bấm nút Gửi & tác vụ nhanh (0.6s easeOutCubic)",
    url: "https://showheyohtaki.github.io/motion-prompt/#085",
  },
];

// Motion Prompt #049-072 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#049
function drawUiElement(ctx: CanvasRenderingContext2D, id: "057" | "071", u: number) {
  const CW = 542;
  const CH = 191;
  // Palette C mapped to SDU Hoa Phượng Đỏ brand tokens
  const C = {
    bg: "#fff6ee",
    card: "#ffffff",
    border: "#ead8cc",
    line: "#efe2d8",
    line2: "#dec8bc",
    block: "#fbf2ea",
    ink: "#071a34",
    blue: "#c81d2e",
    lb: "#ffe8e4",
    mb: "#f5c2ba",
    sb: "#e2887d",
  };
  const JP = 'system-ui, -apple-system, "Segoe UI", sans-serif';
  const NUMF = 'system-ui, -apple-system, "Segoe UI", sans-serif';

  const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
  const eo = (x: number) => 1 - Math.pow(1 - x, 3);
  const eio = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

  const rr = (x: number, y: number, w: number, h: number, r: number) => {
    const rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  };
  const fillRR = (x: number, y: number, w: number, h: number, r: number, c: string) => {
    rr(x, y, w, h, r);
    ctx.fillStyle = c;
    ctx.fill();
  };
  const strokeRR = (x: number, y: number, w: number, h: number, r: number, c: string, lw = 1.5) => {
    rr(x, y, w, h, r);
    ctx.strokeStyle = c;
    ctx.lineWidth = lw;
    ctx.stroke();
  };
  const bar = (x: number, y: number, w: number, c = C.line, h = 9) => fillRR(x, y, w, h, h / 2, c);
  const text = (
    s: string,
    x: number,
    y: number,
    size: number,
    color: string,
    weight = 500,
    align: CanvasTextAlign = "left",
    font = JP,
  ) => {
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.fillText(s, x, y);
  };
  const circle = (x: number, y: number, r: number, c: string) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = c;
    ctx.fill();
  };
  const ring = (x: number, y: number, r: number, c: string, lw = 2) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = c;
    ctx.lineWidth = lw;
    ctx.stroke();
  };

  ctx.fillStyle = C.card;
  ctx.fillRect(0, 0, CW, CH);

  if (id === "057") {
    // Motion Prompt #057 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#057
    const labs = ["Tất cả", "Chưa đọc", "Danh bạ"];
    const xs = [24, 124, 234];
    const ws = [80, 90, 96];
    const c1 = eio(seg(u, 1.0, 1.25));
    const c2 = eio(seg(u, 2.2, 2.45));
    const c3 = eio(seg(u, 3.4, 3.65));
    const pos = c1 + c2 - 2 * c3;
    const fi = Math.max(0, Math.min(2, Math.floor(pos)));
    const fr = pos - fi;
    const gi = Math.min(2, fi + 1);
    const ux = lerp(xs[fi]!, xs[gi]!, fr);
    const uw = lerp(ws[fi]!, ws[gi]!, fr);
    const act = u < 1.1 ? 0 : u < 2.3 ? 1 : u < 3.5 ? 2 : 0;

    labs.forEach((s, i) =>
      text(s, xs[i]! + ws[i]! / 2, 28, 16, i === act ? C.blue : "#7a6560", i === act ? 600 : 500, "center"),
    );
    ctx.fillStyle = C.line;
    ctx.fillRect(0, 50, CW, 2);
    fillRR(ux, 48, uw, 4, 2, C.blue);

    const tabAlpha = [
      1 - seg(u, 1.0, 1.2) + seg(u, 3.45, 3.65),
      seg(u, 1.1, 1.3) - seg(u, 2.2, 2.4),
      seg(u, 2.3, 2.5) - seg(u, 3.4, 3.6),
    ];
    tabAlpha.forEach((rawA, i) => {
      const a = clamp(rawA);
      if (a <= 0) return;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(0, 8 * (1 - a));
      if (i === 0) {
        bar(24, 70, 220, C.line2, 11);
        bar(24, 94, 494);
        bar(24, 112, 400);
        fillRR(24, 134, 494, 42, 8, C.block);
      }
      if (i === 1) {
        for (let k = 0; k < 3; k++) {
          const x = 24 + k * 168;
          fillRR(x, 68, 158, 108, 10, k === 1 ? C.lb : C.block);
          strokeRR(x, 68, 158, 108, 10, k === 1 ? C.sb : C.line, 1.5);
          bar(x + 16, 84, 60, k === 1 ? C.blue : C.line2, 10);
          text(["02", "10", "04"][k]!, x + 16, 118, 22, k === 1 ? C.blue : C.ink, 600, "left", NUMF);
          bar(x + 16, 146, 110);
        }
      }
      if (i === 2) {
        for (let k = 0; k < 3; k++) {
          const y = 70 + k * 38;
          circle(40, y + 14, 14, k === 0 ? C.mb : C.line);
          bar(64, y + 4, 140, C.line2, 10);
          bar(64, y + 20, 340);
        }
      }
      ctx.restore();
    });
    return;
  }

  // Motion Prompt #071 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#071
  ctx.fillStyle = "#fffaf6";
  ctx.fillRect(0, 0, CW, 54);
  ctx.fillStyle = C.line;
  ctx.fillRect(0, 54, CW, 1.5);
  fillRR(24, 19, 116, 16, 4, C.mb);
  const bx = CW - 60;
  const by = 27;
  ctx.save();
  ctx.translate(bx, by);
  ctx.beginPath();
  ctx.moveTo(-12, 8);
  ctx.quadraticCurveTo(-11, -12, 0, -13);
  ctx.quadraticCurveTo(11, -12, 12, 8);
  ctx.lineTo(15, 11);
  ctx.lineTo(-15, 11);
  ctx.closePath();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 2.2;
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 14, 4, 0, Math.PI);
  ctx.stroke();
  ctx.restore();

  const arr = [0.5, 1.2, 1.9];
  let n = 0;
  arr.forEach((c) => {
    if (u >= c) n++;
  });
  const clear = eio(seg(u, 3.2, 3.5));
  if (n > 0 && clear < 1) {
    const last = arr.filter((c) => u >= c).pop() ?? 0.5;
    const pop = 1 - seg(u, last, last + 0.3);
    const s = (n === 1 ? eo(seg(u, 0.5, 0.7)) : 1) * (1 + 0.3 * pop) * (1 - clear);
    const k = seg(u, last, last + 0.5);
    if (k > 0 && k < 1) {
      ring(bx + 12, by - 12, 12 + 16 * k, `rgba(200, 29, 46, ${0.5 * (1 - k)})`, 2.5);
    }
    ctx.save();
    ctx.translate(bx + 12, by - 12);
    ctx.scale(s, s);
    circle(0, 0, 12, C.blue);
    ring(0, 0, 12, "#fff", 2.5);
    text(String(n), 0, 1, 13, "#fff", 600, "center", NUMF);
    ctx.restore();
  }
  bar(24, 76, 220, C.line2, 12);
  bar(24, 102, 494);
  bar(24, 120, 400);
  fillRR(24, 140, 494, 38, 8, C.block);
}

// Motion Prompt #073-096 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#073
function drawLpElement(ctx: CanvasRenderingContext2D, id: "081" | "085", u: number) {
  const CW = 542;
  const CH = 191;
  const C = {
    soft: "#fff6ee",
    ink: "#071a34",
    faint: "#ead8cc",
    acc: "#c81d2e",
  };
  const JP = 'system-ui, -apple-system, "Segoe UI", sans-serif';
  const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const P = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
  const eOut = (x: number) => 1 - Math.pow(1 - x, 3);

  ctx.fillStyle = C.soft;
  ctx.fillRect(0, 0, CW, CH);

  if (id === "081") {
    // Motion Prompt #081 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#081
    const CX = [28, 198, 368];
    const CY = 26;
    const CWD = 146;
    const CHT = 138;
    const LIFT = 10;
    const windows: [number, number][] = [
      [0.4, 1.5],
      [1.65, 2.75],
      [2.9, 4.0],
    ];
    for (let i = 0; i < 3; i++) {
      const [t0, t1] = windows[i]!;
      const q = u >= t0 && u <= t1 ? eOut(P(u, t0, t0 + 0.3)) : u > t1 ? 1 - eOut(P(u, t1, t1 + 0.3)) : 0;
      const x = CX[i]!;
      const y = CY - LIFT * q;
      ctx.save();
      ctx.shadowColor = `rgba(7, 26, 52, ${0.08 + 0.14 * q})`;
      ctx.shadowBlur = 6 + 16 * q;
      ctx.shadowOffsetY = 2 + 10 * q;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(x, y, CWD, CHT, 10);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = i === 0 ? "#ffe8e4" : i === 1 ? "#fff0db" : "#e8f1fc";
      ctx.beginPath();
      ctx.roundRect(x + 10, y + 10, CWD - 20, 68, 6);
      ctx.fill();

      ctx.font = `600 13px ${JP}`;
      ctx.fillStyle = C.ink;
      ctx.fillText(["Ôn thi OOP", "CLB Tin học", "Ký túc xá"][i]!, x + 12, y + 102);

      ctx.fillStyle = C.faint;
      ctx.beginPath();
      ctx.roundRect(x + 12, y + 114, 96, 7, 3.5);
      ctx.fill();
    }
    return;
  }

  // Motion Prompt #085 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#085
  const B = { x: 131, y: 68, w: 280, h: 56 };
  const TAPS: [number, number, number][] = [
    [0.6, 185, 96],
    [2.5, 345, 96],
  ];
  const DUR = 0.6;
  ctx.save();
  ctx.shadowColor = "rgba(200, 29, 46, 0.24)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = C.acc;
  ctx.beginPath();
  ctx.roundRect(B.x, B.y, B.w, B.h, 10);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(B.x, B.y, B.w, B.h, 10);
  ctx.clip();
  for (const [tc, px, py] of TAPS) {
    const d = u - tc;
    if (d < 0 || d > 0.8) continue;
    const Rm = Math.max(
      Math.hypot(px - B.x, py - B.y),
      Math.hypot(px - B.x - B.w, py - B.y),
      Math.hypot(px - B.x, py - B.y - B.h),
      Math.hypot(px - B.x - B.w, py - B.y - B.h),
    );
    ctx.fillStyle = `rgba(255, 255, 255, ${0.42 * (1 - P(d, 0.3, 0.8))})`;
    ctx.beginPath();
    ctx.arc(px, py, Rm * eOut(P(d, 0, DUR)), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.font = `600 16px ${JP}`;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Gửi tin nhắn · Hoa Phượng Đỏ", CW / 2, B.y + B.h / 2);
}

export function MotionPromptShowcase() {
  const [activeId, setActiveId] = useState<MotionPromptId>("071");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cycle = activeId === "081" || activeId === "085" ? 4.8 : 4.5;
    let raf = 0;
    const t0 = performance.now();

    const render = (now: number) => {
      const u = ((now - t0) / 1000) % cycle;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, 542, 191);
      ctx.save();
      if (activeId === "057" || activeId === "071") {
        drawUiElement(ctx, activeId, u);
      } else {
        drawLpElement(ctx, activeId, u);
      }
      ctx.restore();
      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [activeId]);

  const current = MOTION_PROMPT_ITEMS.find((item) => item.id === activeId) ?? MOTION_PROMPT_ITEMS[0]!;

  return (
    <div className="cm-mp-card">
      <div className="cm-mp-pills" role="tablist" aria-label="Hiệu ứng Motion Prompt">
        {MOTION_PROMPT_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.id === activeId}
            className={`cm-mp-pill${item.id === activeId ? " is-active" : ""}`}
            onClick={() => setActiveId(item.id)}
          >
            <span>{item.code}</span>
            <small>{item.title}</small>
          </button>
        ))}
      </div>
      <div className="cm-mp-canvas-wrap">
        <canvas ref={canvasRef} width={542} height={191} className="cm-mp-canvas" />
      </div>
      <p className="cm-mp-caption">
        <strong>{current.code}</strong> · {current.summary}
      </p>
    </div>
  );
}
