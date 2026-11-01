"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Motion Prompt #007 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#007
// Motion Prompt #079 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#079
// Motion Prompt #080 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#080
// Motion Prompt #081 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#081
// Motion Prompt #084 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#084
// Motion Prompt #085 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#085
// Motion Prompt #086 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#086
// Motion Prompt #151 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#151
// Motion Prompt #153 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#153
// Motion Prompt #154 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#154
// Motion Prompt #162 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#162
// Motion Prompt #165 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#165
// Motion Prompt #166 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#166
// Motion Prompt #167 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#167
// Kit lp / lp2 / motion · MIT License (c) 2026 Shohei Ohtaki

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const eOut = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
const eIO = (x: number) => {
  const t = clamp(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
// elastic.out(1, 0.3) from kit lp (#084)
const eEl = (x: number) => {
  const t = clamp(x);
  return t === 0 || t === 1
    ? t
    : Math.pow(2, -10 * t) * Math.sin(((t - 0.075) * (2 * Math.PI)) / 0.3) + 1;
};

/**
 * #079 Scroll progress bar & #151 Back-to-top button
 * - #079: 4px top bar, track + orange/crimson fill = scroll / maxScroll
 * - #151: Round button at bottom-right; fades in & rises 10px between 80px and 140px scroll (cubic ease-out);
 *         clicking glides scroll to 0 over 0.6s with cubic ease-in-out.
 */
export function ScrollProgressAndBackToTop() {
  const fillRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const animRafRef = useRef<number>(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      const y = window.scrollY || document.documentElement.scrollTop;
      const max = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const p = clamp(y / max, 0, 1);
      // #151 formula: tb = eOut(clamp((y - 80) / 60))
      const tb = eOut(clamp((y - 80) / 60, 0, 1));

      if (fillRef.current) {
        fillRef.current.style.transform = `scaleX(${p.toFixed(4)})`;
      }
      if (btnRef.current) {
        btnRef.current.style.opacity = tb.toFixed(4);
        btnRef.current.style.transform = `translate3d(0, ${(10 * (1 - tb)).toFixed(2)}px, 0)`;
        btnRef.current.style.pointerEvents = tb > 0.05 ? "auto" : "none";
      }
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(animRafRef.current);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const scrollToTop = useCallback(() => {
    cancelAnimationFrame(animRafRef.current);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.scrollTo({ top: 0, behavior: "instant" });
      return;
    }
    // #151 spec: 0.6s cubic ease-in-out return to 0.
    // Must use behavior: "instant" per frame so global `html { scroll-behavior: smooth }`
    // does not fight the rAF interpolation and cause stutter.
    const startY = window.scrollY || document.documentElement.scrollTop;
    if (startY <= 0) return;
    const html = document.documentElement;
    const prevBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";

    const t0 = performance.now();
    const dur = 600;
    const stopOnUserInput = () => {
      cancelAnimationFrame(animRafRef.current);
      html.style.scrollBehavior = prevBehavior;
      cleanupListeners();
    };
    const cleanupListeners = () => {
      window.removeEventListener("wheel", stopOnUserInput);
      window.removeEventListener("touchstart", stopOnUserInput);
      window.removeEventListener("keydown", stopOnUserInput);
    };
    window.addEventListener("wheel", stopOnUserInput, { passive: true });
    window.addEventListener("touchstart", stopOnUserInput, { passive: true });
    window.addEventListener("keydown", stopOnUserInput, { passive: true });

    const step = (now: number) => {
      const p = clamp((now - t0) / dur, 0, 1);
      const nextY = Math.round(startY * (1 - eIO(p)));
      window.scrollTo({ top: nextY, behavior: "instant" });
      if (p < 1) {
        animRafRef.current = requestAnimationFrame(step);
      } else {
        window.scrollTo({ top: 0, behavior: "instant" });
        html.style.scrollBehavior = prevBehavior;
        cleanupListeners();
      }
    };
    animRafRef.current = requestAnimationFrame(step);
  }, []);

  return (
    <>
      <div className="mp-scroll-progress" aria-hidden="true">
        <div
          ref={fillRef}
          className="mp-scroll-progress-fill"
          style={{ transform: "scaleX(0)" }}
        />
      </div>
      <button
        ref={btnRef}
        type="button"
        className="mp-back-to-top"
        aria-label="Lên đầu trang"
        onClick={scrollToTop}
        style={{
          opacity: 0,
          transform: "translate3d(0, 10px, 0)",
          pointerEvents: "none",
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M5 15.5L12 8L19 15.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </>
  );
}

/**
 * #167 Scroll-down cue
 * Centered below the hero: "SCROLL" (11px, 3px letter spacing), mouse outline (24x38, rx 12, stroke 2.2),
 * dot inside (5x9) drops 14px over first 70% of 1.57s beat, fades out 45%->75%, plus two down-chevrons
 * 40px to each side drifting 24px downward half a beat apart with sine opacity 0 -> 0.8 -> 0.
 */
export function ScrollDownCue({ targetId = "gioi-thieu" }: { targetId?: string }) {
  const handleClick = () => {
    const el = document.getElementById(targetId);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="mp-scroll-cue-wrap">
      <button
        type="button"
        className="mp-scroll-cue"
        onClick={handleClick}
        aria-label="Cuộn xuống phần giới thiệu"
      >
        <span className="mp-scroll-cue-label">Cuộn xuống</span>
        <span className="mp-scroll-cue-stage" aria-hidden="true">
          <span className="mp-scroll-chevrons is-left">
            <i className="mp-chevron is-1" />
            <i className="mp-chevron is-2" />
          </span>
          <span className="mp-scroll-mouse">
            <i className="mp-scroll-dot" />
          </span>
          <span className="mp-scroll-chevrons is-right">
            <i className="mp-chevron is-1" />
            <i className="mp-chevron is-2" />
          </span>
        </span>
      </button>
    </div>
  );
}

/**
 * #165 Animated shape divider
 * Two layered wave shapes swaying continuously with opposite sine phases on a 4.7s cycle.
 * Back wave (opacity 0.45): wavelength 260/130, amp 8/4, phase a+1 and -2a.
 * Front wave (opacity 1): wavelength 300/110, amp 9/3.5, phase -a and 2a+0.5.
 */
export function AnimatedWaveDivider({
  className = "",
  fill = "#fff1eb",
}: {
  className?: string;
  fill?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const k = canvas.getContext("2d");
    if (!k) return;

    const VW = 511;
    const VH = 38;
    const CYC = 4.7;
    canvas.width = VW * 2;
    canvas.height = VH * 2;

    const drawWave = (
      base: number,
      A1: number,
      L1: number,
      p1: number,
      A2: number,
      L2: number,
      p2: number,
    ) => {
      k.beginPath();
      k.moveTo(0, VH + 2);
      for (let x = 0; x <= VW + 4; x += 4) {
        const y =
          base +
          A1 * Math.sin((2 * Math.PI * x) / L1 + p1) +
          A2 * Math.sin((2 * Math.PI * x) / L2 + p2);
        k.lineTo(x, y);
      }
      k.lineTo(VW, VH + 2);
      k.closePath();
    };

    const renderFrame = (u: number) => {
      const a = (2 * Math.PI * u) / CYC;
      k.setTransform(1, 0, 0, 1, 0, 0);
      k.clearRect(0, 0, canvas.width, canvas.height);
      k.save();
      k.scale(2, 2);
      k.globalAlpha = 0.45;
      k.fillStyle = fill;
      drawWave(16, 8, 260, a + 1, 4, 130, -2 * a);
      k.fill();
      k.globalAlpha = 1;
      k.fillStyle = fill;
      drawWave(24, 9, 300, -a, 3.5, 110, 2 * a + 0.5);
      k.fill();
      k.restore();
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      renderFrame(0);
      return;
    }

    const t0 = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const u = (((now - t0) / 1000) % CYC + CYC) % CYC;
      renderFrame(u);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [fill]);

  return (
    <canvas
      ref={canvasRef}
      className={`mp-wave-divider ${className}`.trim()}
      aria-hidden="true"
    />
  );
}

/**
 * #007 Count-up
 * Spec: 0 -> target over 2.45s (0.45->2.9s in card), value = round(target * (1 - (1 - p)^4)).
 * On landing: scale does a small bounce 1 + 0.07 * e^(-7t) * cos(15t), and a bottom bar fills v / target.
 */
export function CountUpStat({
  rawText,
  showBar = true,
}: {
  rawText: string;
  showBar?: boolean;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState(rawText);
  const [ratio, setRatio] = useState(1);
  const [bounceScale, setBounceScale] = useState(1);
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Extract numeric part (supports "1969", "2010", "Gần 27 ha", "988 m²", "4.000", "85%")
    const match = rawText.match(/^(.*?)(\d+(?:[.,]\d+)?)(\s*.*)$/);
    if (!match || !match[2]) return;
    const prefix = match[1] ?? "";
    const numStr = match[2];
    const suffix = match[3] ?? "";
    const hasDotThousands = /^\d{1,3}(\.\d{3})+$/.test(numStr);
    const target = hasDotThousands
      ? parseInt(numStr.replace(/\./g, ""), 10)
      : parseFloat(numStr.replace(",", "."));
    if (!Number.isFinite(target) || target <= 0) return;

    const formatVal = (v: number) => {
      const rounded = Math.round(v);
      if (hasDotThousands) {
        return rounded.toLocaleString("vi-VN");
      }
      return String(rounded);
    };

    let raf = 0;
    let triggered = false;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || triggered) return;
        triggered = true;
        observer.disconnect();

        const countDur = 1650; // Scaled smoothly for web reading while preserving (1 - (1 - p)^4) curve
        const settleDur = 650;
        const t0 = performance.now();

        const step = (now: number) => {
          const elapsed = now - t0;
          const p = clamp(elapsed / countDur, 0, 1);
          const eased = 1 - Math.pow(1 - p, 4);
          const v = Math.round(target * eased);
          setDisplay(`${prefix}${formatVal(v)}${suffix}`);
          setRatio(target > 0 ? v / target : 1);

          if (p >= 1) {
            setLanded(true);
            const landT = (elapsed - countDur) / 1000;
            if (landT < settleDur / 1000) {
              // #007 spec: 1 + 0.07 * e^(-7t) * cos(15t)
              const pop = 1 + 0.07 * Math.exp(-7 * landT) * Math.cos(15 * landT);
              setBounceScale(pop);
              raf = requestAnimationFrame(step);
            } else {
              setBounceScale(1);
            }
          } else {
            raf = requestAnimationFrame(step);
          }
        };

        raf = requestAnimationFrame(step);
      },
      { threshold: 0.35 },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [rawText]);

  return (
    <span
      ref={ref}
      className={`mp-countup${landed ? " is-landed" : ""}`}
      style={{
        display: "inline-block",
        transform: bounceScale !== 1 ? `scale(${bounceScale.toFixed(4)})` : undefined,
        fontVariantNumeric: "tabular-nums lining-nums",
      }}
    >
      {display}
      {showBar && (
        <span className="mp-countup-bar" aria-hidden="true">
          <span
            className="mp-countup-bar-fill"
            style={{ transform: `scaleX(${ratio.toFixed(4)})` }}
          />
        </span>
      )}
    </span>
  );
}

/**
 * #166 Like button animation
 * Clicking the heart squeezes to 0.78x, fills red (#F23D5C) and pops to 1.45x in 0.12s (cubic ease-out),
 * then settles with 1 + 0.45*e^(-7t)*cos(15t). Emits an expanding ring + 6 colored particles (#F23D5C, #FFB020, #FF5A2C)
 * and vertically slides the count by 1 over 0.05-0.35s.
 */
export function LikeBurstButton({
  initialCount = 128,
  storageKey,
  label = "Yêu thích",
}: {
  initialCount?: number;
  storageKey?: string;
  label?: string;
}) {
  const [liked, setLiked] = useState(false);
  const [bursting, setBursting] = useState(false);

  useEffect(() => {
    if (!storageKey) return;
    queueMicrotask(() => {
      try {
        if (localStorage.getItem(storageKey) === "1") setLiked(true);
      } catch {
        // Ignore storage access errors
      }
    });
  }, [storageKey]);

  const toggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !liked;
    setLiked(next);
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, next ? "1" : "0");
      } catch {
        // Ignore
      }
    }
    if (next) {
      setBursting(false);
      requestAnimationFrame(() => setBursting(true));
    } else {
      setBursting(false);
    }
  };

  const count = liked ? initialCount + 1 : initialCount;

  return (
    <button
      type="button"
      className={`mp-like-btn${liked ? " is-liked" : ""}${bursting ? " is-bursting" : ""}`}
      aria-pressed={liked}
      aria-label={`${label} (${count})`}
      onClick={toggle}
    >
      <span className="mp-like-icon-wrap" aria-hidden="true">
        <span className="mp-like-ring" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <i
            key={i}
            className="mp-like-particle"
            style={
              {
                "--angle": `${-90 + i * 60}deg`,
                "--p-color": ["#F23D5C", "#FFB020", "#FF5A2C"][i % 3],
              } as React.CSSProperties
            }
          />
        ))}
        <svg className="mp-like-heart" viewBox="-16 -16 32 32">
          <path d="M0 11 C-3 8.4 -12 2.4 -12 -4.2 C-12 -8.6 -8.6 -11.5 -4.8 -11.5 C-2.2 -11.5 -0.7 -10.1 0 -8.4 C0.7 -10.1 2.2 -11.5 4.8 -11.5 C8.6 -11.5 12 -8.6 12 -4.2 C12 2.4 3 8.4 0 11 Z" />
        </svg>
      </span>
      <span className="mp-like-Slot" aria-hidden="true">
        <span className="mp-like-Slot-track" style={{ transform: liked ? "translateY(-50%)" : "translateY(0%)" }}>
          <span>{initialCount}</span>
          <span className="is-liked-num">{initialCount + 1}</span>
        </span>
      </span>
    </button>
  );
}

type GalleryItem = {
  src: string;
  alt: string;
  rect: DOMRect;
};

/**
 * #162 Lightbox
 * Clicking any photo in the welcome gallery dims the page (rgba(14,18,28,0.82) over 0.45s cubic ease-out)
 * and grows the clicked thumbnail into the center; shows "k / N" counter, prev/next arrows, and × button
 * that shrinks it back in 0.35s cubic ease-in-out.
 */
export function GalleryLightbox({ selector = "[data-lightbox]" }: { selector?: string }) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const figure = target?.closest<HTMLElement>(selector);
      if (!figure) return;
      const img = figure.querySelector<HTMLImageElement>("img");
      if (!img) return;

      event.preventDefault();
      const allFigures = Array.from(document.querySelectorAll<HTMLElement>(selector));
      const collected: GalleryItem[] = [];
      let clickedIdx = 0;

      allFigures.forEach((fig) => {
        const image = fig.querySelector<HTMLImageElement>("img");
        if (!image) return;
        if (fig === figure) clickedIdx = collected.length;
        collected.push({
          src: image.currentSrc || image.src,
          alt: image.alt || fig.querySelector("figcaption")?.textContent || "Ảnh nhà trường",
          rect: fig.getBoundingClientRect(),
        });
      });

      if (collected.length > 0) {
        setClosing(false);
        setItems(collected);
        setActiveIndex(clickedIdx);
      }
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [selector]);

  const close = useCallback(() => {
    setClosing(true);
    window.setTimeout(() => {
      setActiveIndex(null);
      setClosing(false);
    }, 350);
  }, []);

  useEffect(() => {
    if (activeIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight")
        setActiveIndex((idx) => (idx === null ? null : (idx + 1) % items.length));
      if (e.key === "ArrowLeft")
        setActiveIndex((idx) =>
          idx === null ? null : (idx - 1 + items.length) % items.length,
        );
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, items.length, close]);

  if (activeIndex === null || !items[activeIndex]) return null;
  const current = items[activeIndex];

  return (
    <div
      className={`mp-lightbox${closing ? " is-closing" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={current.alt}
      onClick={close}
    >
      <button
        type="button"
        className="mp-lightbox-close"
        aria-label="Đóng ảnh phóng to"
        onClick={(e) => {
          e.stopPropagation();
          close();
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M6 6L18 18M18 6L6 18"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {items.length > 1 && (
        <>
          <button
            type="button"
            className="mp-lightbox-nav is-prev"
            aria-label="Ảnh trước"
            onClick={(e) => {
              e.stopPropagation();
              setActiveIndex((activeIndex - 1 + items.length) % items.length);
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M15 6L9 12L15 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            className="mp-lightbox-nav is-next"
            aria-label="Ảnh tiếp theo"
            onClick={(e) => {
              e.stopPropagation();
              setActiveIndex((activeIndex + 1) % items.length);
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M9 6L15 12L9 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </>
      )}

      <figure
        className="mp-lightbox-figure"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current.src} alt={current.alt} />
        <figcaption>
          <span>{current.alt}</span>
          <strong>
            {activeIndex + 1} / {items.length}
          </strong>
        </figcaption>
      </figure>
    </div>
  );
}

/**
 * Global interactive behaviors from Motion Prompt:
 * - #080 Highlighter animation: triggers [data-highlight] when passing 80% viewport height (0.8s cubic ease-out)
 * - #084 Magnetic button: [data-magnetic] pulls by (cursor - center) * 0.35 within 110px radius, 18% per frame,
 *                         and returns with elastic.out(1, 0.3) over 1.1s on leave
 * - #085 Ripple effect: clicking .sd-btn, .button-primary, .button-dark, .auth-role-card spawns a clipped white
 *                       ripple circle growing to farthest corner Rm over 0.6s cubic ease-out, fading 0.3-0.8s
 * - #153 3D tilt on hover: [data-tilt] tilts by nx/ny * 8deg with perspective(520px) + radial glare (r=130px)
 * - #154 Spotlight hover: updates --spot-x and --spot-y on [data-spotlight], .pt-stat, .class-card, .pt-club, .nw-card
 */
export function MotionPromptInteractions() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document
        .querySelectorAll<HTMLElement>("[data-highlight]")
        .forEach((el) => el.classList.add("is-highlighted"));
      return;
    }

    // 1. #080 Highlighter animation observer (trigger at 80% viewport height)
    const highlightEls = Array.from(
      document.querySelectorAll<HTMLElement>("[data-highlight]"),
    );
    const hlObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-highlighted");
          }
        });
      },
      { rootMargin: "0px 0px -20% 0px", threshold: 0.1 },
    );
    highlightEls.forEach((el) => hlObserver.observe(el));

    // 2. #085 Ripple effect on click
    const onPointerDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>(
        ".sd-btn, .button-primary, .button-dark, .nw-agent-trigger, .nw-agent-run-btn",
      );
      if (!target) return;

      const rect = target.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      const rm = Math.max(
        Math.hypot(px, py),
        Math.hypot(px - rect.width, py),
        Math.hypot(px, py - rect.height),
        Math.hypot(px - rect.width, py - rect.height),
      );

      const ripple = document.createElement("span");
      ripple.className = "mp-ripple";
      ripple.style.left = `${px}px`;
      ripple.style.top = `${py}px`;
      ripple.style.width = `${rm * 2}px`;
      ripple.style.height = `${rm * 2}px`;
      target.appendChild(ripple);
      window.setTimeout(() => ripple.remove(), 820);
    };

    // 3. #153 3D tilt on hover & #154 Spotlight hover
    const onMouseMove = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      // #154 Spotlight hover cards
      const spotCard = target.closest<HTMLElement>(
        "[data-spotlight], .pt-stat, .class-card, .pt-club, .nw-card, .auth-role-card",
      );
      if (spotCard) {
        const r = spotCard.getBoundingClientRect();
        spotCard.style.setProperty("--spot-x", `${event.clientX - r.left}px`);
        spotCard.style.setProperty("--spot-y", `${event.clientY - r.top}px`);
      }

      // #153 3D tilt on hover cards
      const tiltCard = target.closest<HTMLElement>("[data-tilt]");
      if (tiltCard) {
        const r = tiltCard.getBoundingClientRect();
        const bx = r.left + r.width / 2;
        const by = r.top + r.height / 2;
        const nx = clamp((event.clientX - bx) / (r.width / 2), -1, 1);
        const ny = clamp((event.clientY - by) / (r.height / 2), -1, 1);
        // Scale angle gently for large DOM cards while keeping #153 glare coordinates exact
        const maxDeg = Number(tiltCard.dataset.tiltMax || 7);
        tiltCard.style.setProperty("--tilt-ry", `${(nx * maxDeg).toFixed(2)}deg`);
        tiltCard.style.setProperty("--tilt-rx", `${(-ny * maxDeg).toFixed(2)}deg`);
        tiltCard.style.setProperty("--glare-x", `${((nx * 0.5 + 0.5) * 100).toFixed(1)}%`);
        tiltCard.style.setProperty("--glare-y", `${((ny * 0.5 + 0.5) * 100).toFixed(1)}%`);
        tiltCard.style.setProperty("--glare-alpha", "0.38");
      }
    };

    const onMouseOut = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const tiltCard = target?.closest<HTMLElement>("[data-tilt]");
      if (tiltCard && !tiltCard.contains(event.relatedTarget as Node | null)) {
        tiltCard.style.setProperty("--tilt-ry", "0deg");
        tiltCard.style.setProperty("--tilt-rx", "0deg");
        tiltCard.style.setProperty("--glare-alpha", "0");
      }
    };

    // 4. #084 Magnetic button loop (60fps 18% step inside R, elastic.out(1, 0.3) over 1.1s on leave)
    type MagState = {
      el: HTMLElement;
      ox: number;
      oy: number;
      leaveOx: number;
      leaveOy: number;
      leaveTime: number | null;
      inside: boolean;
    };
    const magEls = Array.from(document.querySelectorAll<HTMLElement>("[data-magnetic]"));
    const magStates: MagState[] = magEls.map((el) => ({
      el,
      ox: 0,
      oy: 0,
      leaveOx: 0,
      leaveOy: 0,
      leaveTime: null,
      inside: false,
    }));

    let mouseX = -9999;
    let mouseY = -9999;
    const onTrackMouse = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    let magRaf = 0;
    const updateMagnetic = (now: number) => {
      let anyActive = false;
      for (const st of magStates) {
        const r = st.el.getBoundingClientRect();
        const bx = r.left + r.width / 2 - st.ox;
        const by = r.top + r.height / 2 - st.oy;
        const dist = Math.hypot(mouseX - bx, mouseY - by);
        const R = 95;
        const PULL = 0.28;

        if (dist < R) {
          st.inside = true;
          st.leaveTime = null;
          st.ox += ((mouseX - bx) * PULL - st.ox) * 0.18;
          st.oy += ((mouseY - by) * PULL - st.oy) * 0.18;
          st.el.style.transform = `translate3d(${st.ox.toFixed(2)}px, ${st.oy.toFixed(2)}px, 0)`;
          anyActive = true;
        } else if (st.inside) {
          st.inside = false;
          st.leaveOx = st.ox;
          st.leaveOy = st.oy;
          st.leaveTime = now;
          anyActive = true;
        } else if (st.leaveTime !== null) {
          const p = clamp((now - st.leaveTime) / 1100, 0, 1);
          const e = 1 - eEl(p);
          st.ox = st.leaveOx * e;
          st.oy = st.leaveOy * e;
          if (p >= 1) {
            st.ox = 0;
            st.oy = 0;
            st.leaveTime = null;
            st.el.style.transform = "";
          } else {
            st.el.style.transform = `translate3d(${st.ox.toFixed(2)}px, ${st.oy.toFixed(2)}px, 0)`;
            anyActive = true;
          }
        }
      }
      if (anyActive || magStates.length > 0) {
        magRaf = requestAnimationFrame(updateMagnetic);
      }
    };

    if (magStates.length > 0) {
      window.addEventListener("mousemove", onTrackMouse, { passive: true });
      magRaf = requestAnimationFrame(updateMagnetic);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("mouseout", onMouseOut, { passive: true });

    return () => {
      hlObserver.disconnect();
      cancelAnimationFrame(magRaf);
      window.removeEventListener("mousemove", onTrackMouse);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseout", onMouseOut);
    };
  }, []);

  return null;
}
