"use client";

// Red flamboyant (hoa phượng vĩ — Delonix regia) motif:
// 3 radically distinct, master-crafted illustrations + flower glyph + divider + interactive showcase.
// Deterministic seeded PRNG ensures identical SSR and client SVG output.

import { useState, type CSSProperties } from "react";

export type PhuongVariant = "canopy" | "watercolor" | "woodcut";

export const PHUONG_VARIANTS: {
  id: PhuongVariant;
  badge: string;
  name: string;
  subtitle: string;
}[] = [
  {
    id: "canopy",
    badge: "Mẫu 1",
    name: "Cổ thụ Sân trường",
    subtitle: "Dáng phượng cổ thụ nghiêng bóng mát qua mái trường, cành uốn lượn nhiều tầng, lá kép lông chim và quả phượng.",
  },
  {
    id: "watercolor",
    badge: "Mẫu 2",
    name: "Màu nước Mùa thi",
    subtitle: "Tán hoa loang màu nước mềm mại dưới nắng chiều vàng óng, cành ẩn hiện trong mây hoa và chùm phượng cận cảnh.",
  },
  {
    id: "woodcut",
    badge: "Mẫu 3",
    name: "Sơn mài Khắc gỗ",
    subtitle: "Phong cách tranh khắc gỗ & sơn mài Việt Nam: thân phượng đôi uốn thế rồng, vân mây đỏ son thếp vàng.",
  },
];

const petalPath = "M0 0C-5 -4 -7 -12 0 -17C7 -12 5 -4 0 0Z";
// Authentic Delonix regia clawed petal: slender basal claw widening into a ruffled orbicular blade
const clawedPetalPath =
  "M0 0 C-0.9 -3.2 -2.2 -5.5 -4.8 -8.2 C-7.4 -11 -6.8 -15.8 -3.8 -18.2 C-1.6 -19.8 1.6 -19.8 3.8 -18.2 C6.8 -15.8 7.4 -11 4.8 -8.2 C2.2 -5.5 0.9 -3.2 0 0Z";

function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r = (n: number) => Math.round(n * 10) / 10;

/** Five-petal flamboyant flower; the upper banner petal is creamy-gold with crimson nectar spots, like real Delonix regia. */
export function PhuongFlower({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="-22 -22 44 44" aria-hidden="true">
      {[0, 72, 144, 216, 288].map((angle, index) => (
        <g key={angle} transform={`rotate(${angle})`}>
          <path
            d={clawedPetalPath}
            fill={index === 0 ? "#FFF3CC" : index % 2 ? "#D9232E" : "#F24827"}
            stroke={index === 0 ? "#D9232E" : "#9E141C"}
            strokeWidth="0.65"
          />
          {index === 0 && (
            <>
              <circle cx="-1.5" cy="-11.8" r="1.05" fill="#D9232E" />
              <circle cx="1.4" cy="-13.1" r="0.95" fill="#D9232E" />
              <circle cx="0" cy="-9.6" r="0.85" fill="#E84A27" />
              <circle cx="-0.7" cy="-14.6" r="0.8" fill="#D9232E" />
            </>
          )}
        </g>
      ))}
      <g stroke="#B81422" strokeWidth="0.75" fill="none" strokeLinecap="round">
        <path d="M0 0 Q-4 -8 -7 -13" />
        <path d="M0 0 Q4 -9 6.5 -14" />
        <path d="M0 0 Q-7 -2 -12 -5" />
        <path d="M0 0 Q7 -2 12 -4" />
        <path d="M0 0 Q0 7 2 12" />
      </g>
      <circle cx="-7" cy="-13" r="1" fill="#F4B942" />
      <circle cx="6.5" cy="-14" r="1" fill="#F4B942" />
      <circle cx="-12" cy="-5" r="1" fill="#F4B942" />
      <circle cx="12" cy="-4" r="1" fill="#F4B942" />
      <circle cx="2" cy="12" r="1" fill="#F4B942" />
      <circle r="2.5" fill="#F4B942" stroke="#9E141C" strokeWidth="0.6" />
    </svg>
  );
}

export function PhuongDivider() {
  return (
    <div className="sd-divider" aria-hidden="true">
      <span />
      <PhuongFlower size={18} />
      <PhuongFlower size={28} />
      <PhuongFlower size={18} />
      <span />
    </div>
  );
}

// Helper: scalloped umbrella cloud-pad path with organic billows
function createCloudPadPath(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  lobes: number,
  seedNum: number,
  flatBottom = 0.52,
) {
  const rand = seeded(seedNum);
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < lobes; i++) {
    const a = (i / lobes) * Math.PI * 2;
    const isBottom = Math.sin(a) > 0;
    const yScale = isBottom ? ry * flatBottom : ry;
    const jitter = 0.9 + rand() * 0.18;
    pts.push({
      x: cx + Math.cos(a) * rx * jitter,
      y: cy + Math.sin(a) * yScale * jitter,
    });
  }
  let d = "";
  for (let i = 0; i < lobes; i++) {
    const p0 = pts[i]!;
    const p1 = pts[(i + 1) % lobes]!;
    const midX = (p0.x + p1.x) / 2;
    const midY = (p0.y + p1.y) / 2;
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = dy / len;
    const ny = -dx / len;
    const isBottomLobe = Math.sin(((i + 0.5) / lobes) * Math.PI * 2) > 0.2;
    const bulge = (11 + rand() * 11) * (isBottomLobe ? 0.45 : 1.2);
    const ctrlX = midX + nx * bulge;
    const ctrlY = midY + ny * bulge;
    if (i === 0) {
      d += `M ${r(p0.x)} ${r(p0.y)} `;
    }
    d += `Q ${r(ctrlX)} ${r(ctrlY)} ${r(p1.x)} ${r(p1.y)} `;
  }
  return d + "Z";
}

function useFallingPetals(seedNum: number) {
  const random = seeded(seedNum);
  const between = (min: number, max: number) => r(min + random() * (max - min));
  const bloomColors = ["#C81E28", "#E03124", "#F44D27", "#FF6E38", "#FFB347"];
  const pick = <T,>(items: readonly T[]) => items[Math.floor(random() * items.length)]!;

  const falling = (gust: boolean) => {
    const x = between(80, 535);
    const y = between(200, 330);
    return {
      x,
      y,
      turn: between(0, 360),
      fill: pick(bloomColors),
      style: {
        "--dx": `${gust ? between(110, 230) : between(-45, 45)}px`,
        "--dy": `${r(between(575, 600) - y)}px`,
        "--dur": `${gust ? 12 : between(7, 12)}s`,
        "--delay": `${gust ? -between(0, 0.9) : -between(0, 12)}s`,
        "--spin": `${between(1.2, 2.6)}s`,
      } as CSSProperties,
    };
  };

  const drifting = Array.from({ length: 14 }, () => falling(false));
  const gusting = Array.from({ length: 16 }, () => falling(true));
  const carpet = Array.from({ length: 68 }, () => ({
    x: between(145, 535),
    y: between(578, 605),
    turn: between(0, 360),
    scale: between(0.4, 0.65),
    fill: pick(bloomColors),
  }));

  return { drifting, gusting, carpet };
}

/* ============================================================================
 * MẪU 1: CỔ THỤ SÂN TRƯỜNG (Botanical Schoolyard Ancient Canopy)
 * Asymmetrical, gnarled S-curve trunk and heavy sinuous boughs with lush
 * multi-level umbrella foliage tiers, compound fern fronds, hanging seed pods
 * (quả phượng), and hundreds of layered blossoms. No bare stick gaps!
 * ========================================================================== */
function PhuongTreeCanopy({ className, id = "phuong-m1" }: { className?: string; id?: string }) {
  const random = seeded(2026);
  const between = (min: number, max: number) => r(min + random() * (max - min));
  const { drifting, gusting, carpet } = useFallingPetals(2026);

  // Back shadow foliage masses (deep crimson-burgundy)
  const backPads = [
    { cx: 128, cy: 278, rx: 98, ry: 44, lobes: 13, seed: 11 },
    { cx: 472, cy: 308, rx: 94, ry: 42, lobes: 12, seed: 12 },
    { cx: 235, cy: 232, rx: 135, ry: 56, lobes: 15, seed: 13 },
    { cx: 395, cy: 242, rx: 132, ry: 54, lobes: 15, seed: 14 },
    { cx: 305, cy: 162, rx: 168, ry: 68, lobes: 16, seed: 15 },
  ];

  // Mid-canopy scarlet umbrella tiers (placed at multiple heights from y=315 up to y=115)
  const midPads = [
    { cx: 476, cy: 294, rx: 86, ry: 38, lobes: 12, seed: 21 }, // low right tier
    { cx: 122, cy: 256, rx: 96, ry: 42, lobes: 13, seed: 22 }, // low left tier
    { cx: 228, cy: 266, rx: 92, ry: 40, lobes: 12, seed: 23 }, // inner lower-left tier covering branch fork
    { cx: 378, cy: 268, rx: 94, ry: 40, lobes: 12, seed: 24 }, // inner lower-right tier covering branch fork
    { cx: 185, cy: 198, rx: 118, ry: 50, lobes: 14, seed: 25 },
    { cx: 422, cy: 206, rx: 116, ry: 48, lobes: 14, seed: 26 },
    { cx: 302, cy: 188, rx: 136, ry: 54, lobes: 15, seed: 27 },
    { cx: 248, cy: 136, rx: 124, ry: 50, lobes: 14, seed: 28 },
    { cx: 362, cy: 140, rx: 118, ry: 48, lobes: 14, seed: 29 },
  ];

  // Bright sunlit upper tiers (vermilion-orange-gold)
  const brightPads = [
    { cx: 478, cy: 278, rx: 66, ry: 28, lobes: 10, seed: 31 },
    { cx: 120, cy: 238, rx: 74, ry: 32, lobes: 11, seed: 32 },
    { cx: 226, cy: 248, rx: 68, ry: 28, lobes: 10, seed: 33 },
    { cx: 378, cy: 250, rx: 70, ry: 28, lobes: 10, seed: 34 },
    { cx: 182, cy: 178, rx: 92, ry: 38, lobes: 12, seed: 35 },
    { cx: 420, cy: 186, rx: 90, ry: 38, lobes: 12, seed: 36 },
    { cx: 302, cy: 162, rx: 104, ry: 42, lobes: 13, seed: 37 },
    { cx: 288, cy: 106, rx: 122, ry: 46, lobes: 14, seed: 38 },
  ];

  // Bipinnate emerald fern-leaf clusters tucked under the tiers
  const fronds = [
    { x: 56, y: 274, rot: -74, scale: 0.96, shade: 0 },
    { x: 96, y: 298, rot: -48, scale: 0.9, shade: 1 },
    { x: 158, y: 304, rot: -26, scale: 0.88, shade: 0 },
    { x: 215, y: 296, rot: -14, scale: 0.84, shade: 1 },
    { x: 272, y: 288, rot: 8, scale: 0.8, shade: 0 },
    { x: 345, y: 292, rot: -10, scale: 0.82, shade: 1 },
    { x: 418, y: 318, rot: 22, scale: 0.9, shade: 0 },
    { x: 478, y: 332, rot: 38, scale: 0.94, shade: 1 },
    { x: 536, y: 312, rot: 68, scale: 0.95, shade: 0 },
    { x: 548, y: 268, rot: 82, scale: 0.86, shade: 1 },
    { x: 74, y: 212, rot: -66, scale: 0.85, shade: 1 },
    { x: 516, y: 204, rot: 66, scale: 0.85, shade: 1 },
    { x: 142, y: 152, rot: -48, scale: 0.78, shade: 0 },
    { x: 458, y: 156, rot: 50, scale: 0.78, shade: 0 },
    { x: 295, y: 222, rot: -18, scale: 0.76, shade: 1 },
    { x: 328, y: 220, rot: 20, scale: 0.76, shade: 0 },
  ];

  // Distribute 135 detailed blossoms across all tiers
  const blooms = Array.from({ length: 135 }, (_, idx) => {
    const pad = [...midPads, ...brightPads][idx % (midPads.length + brightPads.length)]!;
    const a = between(0, Math.PI * 2);
    const d = Math.sqrt(random()) * 0.88;
    const x = r(pad.cx + Math.cos(a) * pad.rx * d);
    const y = r(pad.cy + Math.sin(a) * pad.ry * d);
    const isHero = idx < 34;
    return {
      x,
      y,
      scale: isHero ? between(0.58, 0.88) : between(0.32, 0.52),
      rot: between(0, 360),
      isHero,
    };
  });

  return (
    <svg className={className} viewBox="0 0 600 620" role="img" aria-label="Mẫu 1: Cây phượng cổ thụ sân trường">
      <defs>
        <linearGradient id={`${id}-bark`} x1="0" y1="0" x2="1" y2="0.15">
          <stop offset="0%" stopColor="#94745C" />
          <stop offset="35%" stopColor="#6E503D" />
          <stop offset="75%" stopColor="#4C3528" />
          <stop offset="100%" stopColor="#332118" />
        </linearGradient>
        <linearGradient id={`${id}-pad-back`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9B141E" />
          <stop offset="100%" stopColor="#5E0A11" />
        </linearGradient>
        <linearGradient id={`${id}-pad-mid`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E32E24" />
          <stop offset="65%" stopColor="#BF1A20" />
          <stop offset="100%" stopColor="#8C1018" />
        </linearGradient>
        <linearGradient id={`${id}-pad-bright`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF7E38" />
          <stop offset="52%" stopColor="#F03E24" />
          <stop offset="100%" stopColor="#C41D22" />
        </linearGradient>
        <radialGradient id={`${id}-halo`} cx="50%" cy="36%" r="48%">
          <stop offset="0%" stopColor="#FFB84D" stopOpacity="0.32" />
          <stop offset="70%" stopColor="#FF5A26" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#FF5A26" stopOpacity="0" />
        </radialGradient>

        {/* Bipinnate fern leaf */}
        {(["#1B6836", "#2E8F49"] as const).map((color, idx) => (
          <g key={color} id={`${id}-frond-${idx}`}>
            <path d="M0 0 Q6 -28 2 -62" fill="none" stroke="#164A28" strokeWidth="1.4" strokeLinecap="round" />
            {Array.from({ length: 13 }, (_, i) => {
              const t = (i + 1) / 14;
              const py = -t * 58;
              const px = 2 * (1 - t) * t * 6 + t * t * 2;
              const w = Math.sin(t * Math.PI) * 14 + 3.5;
              return (
                <g key={i} fill={color}>
                  <ellipse cx={r(px - w * 0.55)} cy={r(py)} rx={r(w * 0.5)} ry="1.65" transform={`rotate(-26 ${r(px - w * 0.55)} ${r(py)})`} />
                  <ellipse cx={r(px + w * 0.55)} cy={r(py)} rx={r(w * 0.5)} ry="1.65" transform={`rotate(26 ${r(px + w * 0.55)} ${r(py)})`} />
                </g>
              );
            })}
          </g>
        ))}

        {/* Hero 5-petal blossom with white-gold banner petal & stamens */}
        <g id={`${id}-hero-bloom`}>
          {[0, 72, 144, 216, 288].map((angle, idx) => (
            <path
              key={angle}
              d={clawedPetalPath}
              transform={`rotate(${angle})`}
              fill={idx === 0 ? "#FFF2C6" : idx % 2 ? "#DF2228" : "#FF5A29"}
              stroke={idx === 0 ? "#D9232E" : "none"}
              strokeWidth="0.5"
            />
          ))}
          <circle cx="0" cy="-12" r="1.2" fill="#C81922" />
          <path d="M0 0 Q-5 -9 -8 -14 M0 0 Q5 -9 8 -14 M0 0 Q-8 -2 -12 -5" stroke="#FFD15C" strokeWidth="0.8" fill="none" strokeLinecap="round" />
          <circle r="2.3" fill="#FFD15C" />
        </g>

        <g id={`${id}-cluster-bloom`}>
          {[0, 72, 144, 216, 288].map((angle, idx) => (
            <path
              key={angle}
              d={petalPath}
              transform={`rotate(${angle})`}
              fill={idx === 0 ? "#FFD782" : idx % 2 ? "#FF4722" : "#FF7033"}
            />
          ))}
          <circle r="2.1" fill="#FFE082" />
        </g>
      </defs>

      <circle cx="305" cy="215" r="255" fill={`url(#${id}-halo)`} />
      <ellipse cx="342" cy="593" rx="220" ry="17" fill="#B52B22" opacity="0.14" />
      <ellipse cx="345" cy="593" rx="125" ry="10" fill="#4E2F21" opacity="0.24" />

      <g className="sd-tree-gust">
        <g className="sd-tree-sway">
          {/* Layer 1: Deep shadow foliage pads */}
          {backPads.map((pad) => (
            <path key={pad.seed} d={createCloudPadPath(pad.cx, pad.cy, pad.rx, pad.ry, pad.lobes, pad.seed, 0.54)} fill={`url(#${id}-pad-back)`} />
          ))}

          {/* Layer 2: Bipinnate emerald fronds */}
          {fronds.map((f, i) => (
            <use
              key={`fr-${i}`}
              href={`#${id}-frond-${f.shade}`}
              transform={`translate(${f.x} ${f.y}) rotate(${f.rot}) scale(${f.scale})`}
            />
          ))}

          {/* Characteristic hanging woody seed pods (quả phượng vĩ) */}
          <g fill="#4A2E20" stroke="#2E1B12" strokeWidth="0.8">
            <path d="M162 290 C158 316 162 344 156 368 C162 366 168 342 169 314 Z" />
            <path d="M174 294 C172 316 175 338 171 356 C176 354 180 336 180 314 Z" />
            <path d="M436 304 C440 330 436 358 442 380 C448 376 448 348 444 306 Z" />
          </g>

          {/* Layer 3: Sculpted gnarled S-curve trunk & lower-forking sinuous boughs */}
          <g fill={`url(#${id}-bark)`}>
            {/* Gnarled trunk with wide buttress roots, curving left then right */}
            <path d="M262 598 C294 588 312 562 314 522 C316 484 304 452 308 416 L354 416 C348 452 358 486 362 524 C366 560 388 586 426 598 C396 601 372 596 356 588 C342 596 322 596 308 588 C290 596 276 600 262 598 Z" />
            {/* Sweeping lower-left bough (arches gracefully over where the Nhà B1 photo sits) */}
            <path d="M312 436 C276 404 228 388 182 346 C152 318 132 288 114 260 L128 252 C148 278 172 306 202 332 C246 368 290 384 326 414 Z" />
            {/* Sweeping lower-right bough */}
            <path d="M346 438 C382 412 424 398 456 362 C474 342 486 318 494 296 L480 290 C470 310 456 332 438 350 C406 382 368 396 334 420 Z" />
            {/* Mid-left sinuous limb */}
            <path d="M314 422 C292 378 254 344 218 292 C196 260 184 228 178 196 L192 194 C200 224 214 254 236 284 C270 330 308 364 332 412 Z" />
            {/* Center-crown S-curve limb */}
            <path d="M324 418 C316 366 328 314 314 256 C304 218 294 184 296 148 L310 148 C310 182 320 216 330 254 C344 312 334 366 344 418 Z" />
            {/* Mid-right sinuous limb */}
            <path d="M342 422 C368 378 402 346 422 294 C434 262 436 230 430 198 L416 198 C420 228 418 258 406 286 C386 334 352 366 328 414 Z" />
          </g>

          {/* Bark texture ridges & sunlit rim highlights */}
          <g fill="none" strokeLinecap="round">
            <path d="M322 580 C328 536 316 482 320 426" stroke="#B89982" strokeWidth="3.6" opacity="0.52" />
            <path d="M306 588 C296 568 284 562 272 594" stroke="#B89982" strokeWidth="2.4" opacity="0.45" />
            <path d="M342 584 C346 534 338 482 340 426" stroke="#301E15" strokeWidth="3" opacity="0.55" />
            <path d="M362 582 C374 564 388 572 408 594" stroke="#301E15" strokeWidth="2.5" opacity="0.48" />
            <path d="M312 426 C272 396 226 378 182 336" stroke="#B89982" strokeWidth="2.4" opacity="0.48" />
            <path d="M348 432 C384 406 424 390 456 354" stroke="#301E15" strokeWidth="2.4" opacity="0.48" />
          </g>

          {/* Layer 4: Mid-canopy scarlet umbrella tiers (partially occluding the upper branch forks) */}
          {midPads.map((pad) => (
            <path key={pad.seed} d={createCloudPadPath(pad.cx, pad.cy, pad.rx, pad.ry, pad.lobes, pad.seed, 0.55)} fill={`url(#${id}-pad-mid)`} />
          ))}

          {/* Layer 5: Sunlit upper crown tiers */}
          {brightPads.map((pad) => (
            <path key={pad.seed} d={createCloudPadPath(pad.cx, pad.cy, pad.rx, pad.ry, pad.lobes, pad.seed, 0.56)} fill={`url(#${id}-pad-bright)`} />
          ))}

          {/* Layer 6: Individual 5-petal blossoms & hero blooms */}
          {blooms.map((b, i) => (
            <use
              key={`bl-${i}`}
              href={`#${id}-${b.isHero ? "hero-bloom" : "cluster-bloom"}`}
              transform={`translate(${b.x} ${b.y}) rotate(${b.rot}) scale(${b.scale})`}
            />
          ))}
        </g>
      </g>

      {/* Falling petals */}
      {[...drifting, ...gusting].map((petal, index) => (
        <g key={`d${index}`} className={index < drifting.length ? "sd-fall" : "sd-fall sd-fall-gust"} style={petal.style} aria-hidden="true">
          <g transform={`translate(${petal.x} ${petal.y})`}>
            <g className="sd-fall-spin">
              <path d={clawedPetalPath} transform={`rotate(${petal.turn}) scale(.48)`} fill={petal.fill} />
            </g>
          </g>
        </g>
      ))}

      {/* Ground petal carpet */}
      {carpet.map((petal, index) => (
        <path
          key={`p${index}`}
          d={clawedPetalPath}
          transform={`translate(${petal.x} ${petal.y}) rotate(${petal.turn}) scale(${petal.scale} ${r(petal.scale * 0.62)})`}
          fill={petal.fill}
          opacity="0.9"
        />
      ))}
    </svg>
  );
}

/* ============================================================================
 * MẪU 2: MÀU NƯỚC MÙA THI (Poetic Watercolor, Sunbeams & Botanical Close-ups)
 * Soft blurred watercolor washes, diagonal golden sunbeams, branches weaving
 * through translucent flower clouds, and oversized botanical specimen flowers
 * framing the top-right and left canopy edges.
 * ========================================================================== */
function PhuongTreeWatercolor({ className, id = "phuong-m2" }: { className?: string; id?: string }) {
  const random = seeded(1985);
  const between = (min: number, max: number) => r(min + random() * (max - min));
  const { drifting, gusting, carpet } = useFallingPetals(1985);

  const cloudBlobs = [
    { cx: 145, cy: 262, rx: 112, ry: 64, seed: 51, grad: "wc-deep", op: 0.78 },
    { cx: 455, cy: 272, rx: 110, ry: 62, seed: 52, grad: "wc-deep", op: 0.78 },
    { cx: 295, cy: 195, rx: 185, ry: 92, seed: 53, grad: "wc-deep", op: 0.82 },
    { cx: 225, cy: 272, rx: 98, ry: 52, seed: 54, grad: "wc-mid", op: 0.86 },
    { cx: 375, cy: 276, rx: 96, ry: 52, seed: 55, grad: "wc-mid", op: 0.86 },
    { cx: 165, cy: 210, rx: 118, ry: 62, seed: 56, grad: "wc-mid", op: 0.88 },
    { cx: 432, cy: 214, rx: 116, ry: 60, seed: 57, grad: "wc-mid", op: 0.88 },
    { cx: 302, cy: 142, rx: 156, ry: 72, seed: 58, grad: "wc-mid", op: 0.9 },
    { cx: 235, cy: 165, rx: 108, ry: 54, seed: 59, grad: "wc-sun", op: 0.86 },
    { cx: 372, cy: 168, rx: 106, ry: 52, seed: 60, grad: "wc-sun", op: 0.86 },
    { cx: 300, cy: 112, rx: 118, ry: 50, seed: 61, grad: "wc-sun", op: 0.92 },
  ];

  // Oversized botanical specimen blossoms in foreground clusters
  const specimenCluster = [
    { x: 468, y: 158, scale: 1.55, rot: 18 },
    { x: 506, y: 192, scale: 1.32, rot: 54 },
    { x: 432, y: 186, scale: 1.18, rot: -22 },
    { x: 126, y: 184, scale: 1.45, rot: -28 },
    { x: 92, y: 222, scale: 1.24, rot: -64 },
    { x: 164, y: 212, scale: 1.15, rot: 15 },
    { x: 296, y: 108, scale: 1.38, rot: 8 },
    { x: 334, y: 128, scale: 1.16, rot: 42 },
    { x: 258, y: 132, scale: 1.14, rot: -32 },
  ];

  const smallBlooms = Array.from({ length: 72 }, () => {
    const a = between(0, Math.PI * 2);
    const d = Math.sqrt(random());
    return {
      x: r(302 + Math.cos(a) * d * 226),
      y: r(198 + Math.sin(a) * d * (Math.sin(a) > 0 ? 88 : 112)),
      scale: between(0.42, 0.72),
      rot: between(0, 360),
    };
  });

  // Watercolor pigment droplets
  const droplets = Array.from({ length: 64 }, () => {
    const a = between(-Math.PI * 1.08, Math.PI * 0.08);
    const rx = between(160, 275);
    const ry = between(80, 155);
    return {
      x: r(302 + Math.cos(a) * rx),
      y: r(202 + Math.sin(a) * ry),
      r: between(2, 6.5),
      op: between(0.28, 0.75),
      fill: random() < 0.45 ? "#FF5C2B" : random() < 0.78 ? "#D9232E" : "#F4B942",
    };
  });

  return (
    <svg className={className} viewBox="0 0 600 620" role="img" aria-label="Mẫu 2: Cây phượng màu nước mùa thi">
      <defs>
        <radialGradient id={`${id}-wc-deep`} cx="50%" cy="45%" r="54%">
          <stop offset="0%" stopColor="#D91E2A" stopOpacity="0.9" />
          <stop offset="68%" stopColor="#A6121D" stopOpacity="0.72" />
          <stop offset="100%" stopColor="#7A0B14" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-wc-mid`} cx="48%" cy="40%" r="54%">
          <stop offset="0%" stopColor="#FF6230" stopOpacity="0.92" />
          <stop offset="62%" stopColor="#E62F25" stopOpacity="0.78" />
          <stop offset="100%" stopColor="#B81620" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-wc-sun`} cx="50%" cy="35%" r="52%">
          <stop offset="0%" stopColor="#FFE082" stopOpacity="0.94" />
          <stop offset="52%" stopColor="#FF7A33" stopOpacity="0.82" />
          <stop offset="100%" stopColor="#E63525" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-wc-leaf`} cx="50%" cy="50%" r="54%">
          <stop offset="0%" stopColor="#52B765" stopOpacity="0.86" />
          <stop offset="68%" stopColor="#267D3B" stopOpacity="0.64" />
          <stop offset="100%" stopColor="#185427" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-sunbeam`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#FFE599" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#FFE599" stopOpacity="0" />
        </linearGradient>

        {/* Botanical specimen flower with detailed veining, spotted banner petal & long stamens */}
        <g id={`${id}-specimen-bloom`}>
          {[0, 72, 144, 216, 288].map((angle, idx) => (
            <g key={angle} transform={`rotate(${angle})`}>
              <path
                d={clawedPetalPath}
                fill={idx === 0 ? "#FFF7DC" : idx % 2 ? "#DF2228" : "#FF5E2E"}
                stroke={idx === 0 ? "#E03124" : "#9E121B"}
                strokeWidth="0.45"
              />
              {idx === 0 && (
                <>
                  <circle cx="-1.5" cy="-11.5" r="0.95" fill="#D9232E" />
                  <circle cx="1.4" cy="-12.8" r="0.9" fill="#D9232E" />
                  <circle cx="0" cy="-9.5" r="0.8" fill="#E84A27" />
                  <circle cx="-0.6" cy="-14.2" r="0.75" fill="#D9232E" />
                </>
              )}
            </g>
          ))}
          <g stroke="#8F111B" strokeWidth="0.65" fill="none" strokeLinecap="round">
            <path d="M0 0 Q-5 -10 -9 -15" />
            <path d="M0 0 Q5 -10 8.5 -15" />
            <path d="M0 0 Q-9 -3 -14 -6" />
            <path d="M0 0 Q9 -3 14 -5" />
            <path d="M0 0 Q0 8 2.5 14" />
          </g>
          <circle cx="-9" cy="-15" r="1.1" fill="#FFD15C" />
          <circle cx="8.5" cy="-15" r="1.1" fill="#FFD15C" />
          <circle cx="-14" cy="-6" r="1.1" fill="#FFD15C" />
          <circle cx="14" cy="-5" r="1.1" fill="#FFD15C" />
          <circle cx="2.5" cy="14" r="1.1" fill="#FFD15C" />
          <circle r="2.4" fill="#F4B942" />
        </g>
      </defs>

      {/* Golden summer sun & diagonal sunbeams */}
      <circle cx="445" cy="88" r="68" fill="#FFE8A3" opacity="0.55" />
      <polygon points="410,40 520,40 360,580 180,580" fill={`url(#${id}-sunbeam)`} />
      <polygon points="340,40 420,40 240,580 110,580" fill={`url(#${id}-sunbeam)`} opacity="0.7" />

      <ellipse cx="332" cy="593" rx="225" ry="17" fill="#D93829" opacity="0.13" />

      <g className="sd-tree-gust">
        <g className="sd-tree-sway">
          {/* Emerald watercolor leaf splashes */}
          {[
            { cx: 92, cy: 274, rx: 68, ry: 30, rot: -28, s: 71 },
            { cx: 196, cy: 302, rx: 72, ry: 28, rot: -12, s: 72 },
            { cx: 412, cy: 308, rx: 74, ry: 28, rot: 14, s: 73 },
            { cx: 512, cy: 278, rx: 68, ry: 30, rot: 28, s: 74 },
            { cx: 128, cy: 158, rx: 62, ry: 26, rot: -35, s: 75 },
            { cx: 478, cy: 152, rx: 62, ry: 26, rot: 35, s: 76 },
          ].map((lw) => (
            <path
              key={lw.s}
              d={createCloudPadPath(lw.cx, lw.cy, lw.rx, lw.ry, 11, lw.s, 0.72)}
              fill={`url(#${id}-wc-leaf)`}
              transform={`rotate(${lw.rot} ${lw.cx} ${lw.cy})`}
            />
          ))}

          {/* Deep crimson watercolor base clouds */}
          {cloudBlobs.slice(0, 3).map((b) => (
            <path
              key={b.seed}
              d={createCloudPadPath(b.cx, b.cy, b.rx, b.ry, 14, b.seed, 0.64)}
              fill={`url(#${id}-${b.grad})`}
              opacity={b.op}
            />
          ))}

          {/* Calligraphic sepia ink trunk & organic curved limbs */}
          <g fill="#4E3629">
            <path d="M254 598 C286 586 304 558 308 514 C312 472 304 432 306 392 L346 392 C342 432 348 474 354 516 C360 558 382 586 418 598 C388 600 364 595 348 588 C334 595 314 595 298 588 C282 595 268 599 254 598 Z" />
            {/* Curved left boughs */}
            <path d="M310 418 C272 384 218 362 158 306 L168 296 C226 346 280 368 322 402 Z" />
            <path d="M314 398 C288 346 248 302 204 236 L216 228 C260 292 300 336 328 390 Z" />
            {/* Curved center & right boughs */}
            <path d="M322 396 C320 330 326 264 316 196 L328 196 C338 264 334 330 338 396 Z" />
            <path d="M334 402 C362 348 402 304 442 238 L454 246 C414 312 374 356 346 410 Z" />
            <path d="M340 422 C380 390 432 368 486 312 L496 322 C442 380 390 404 348 436 Z" />
          </g>

          {/* Mid and sunlit watercolor washes (overlapping the branch forks so branches weave IN and OUT of flowers) */}
          {cloudBlobs.slice(3).map((b) => (
            <path
              key={b.seed}
              d={createCloudPadPath(b.cx, b.cy, b.rx, b.ry, 14, b.seed, 0.62)}
              fill={`url(#${id}-${b.grad})`}
              opacity={b.op}
            />
          ))}

          {/* Small background blooms */}
          {smallBlooms.map((b, i) => (
            <use
              key={`sb-${i}`}
              href={`#${id}-specimen-bloom`}
              transform={`translate(${b.x} ${b.y}) rotate(${b.rot}) scale(${b.scale})`}
            />
          ))}

          {/* Oversized Foreground Botanical Specimen Clusters */}
          {specimenCluster.map((b, i) => (
            <use
              key={`spb-${i}`}
              href={`#${id}-specimen-bloom`}
              transform={`translate(${b.x} ${b.y}) rotate(${b.rot}) scale(${b.scale})`}
            />
          ))}

          {/* Watercolor splatter droplets */}
          {droplets.map((d, i) => (
            <circle key={`dr-${i}`} cx={d.x} cy={d.y} r={d.r} fill={d.fill} opacity={d.op} />
          ))}
        </g>
      </g>

      {/* Nostalgic schoolyard wooden bench & open book beside the trunk */}
      <g transform="translate(382 548)" opacity="0.88">
        <rect x="0" y="18" width="86" height="5" rx="2" fill="#8C5A3C" />
        <rect x="4" y="8" width="78" height="7" rx="2" fill="#A66E4E" />
        <rect x="12" y="23" width="5" height="16" rx="1.5" fill="#4E3222" />
        <rect x="69" y="23" width="5" height="16" rx="1.5" fill="#4E3222" />
        {/* Little white student notebook with a red phượng flower pressed on top */}
        <path d="M34 16 L48 13 L60 16 L46 19 Z" fill="#FFFDF9" stroke="#C9B3A3" strokeWidth="0.7" />
        <use href={`#${id}-specimen-bloom`} transform="translate(47 14) scale(0.32)" />
      </g>

      {/* Falling petals */}
      {[...drifting, ...gusting].map((petal, index) => (
        <g key={`d${index}`} className={index < drifting.length ? "sd-fall" : "sd-fall sd-fall-gust"} style={petal.style} aria-hidden="true">
          <g transform={`translate(${petal.x} ${petal.y})`}>
            <g className="sd-fall-spin">
              <path d={clawedPetalPath} transform={`rotate(${petal.turn}) scale(.5)`} fill={petal.fill} opacity="0.88" />
            </g>
          </g>
        </g>
      ))}

      {/* Ground petal carpet */}
      {carpet.map((petal, index) => (
        <path
          key={`p${index}`}
          d={clawedPetalPath}
          transform={`translate(${petal.x} ${petal.y}) rotate(${petal.turn}) scale(${petal.scale} ${r(petal.scale * 0.6)})`}
          fill={petal.fill}
          opacity="0.86"
        />
      ))}
    </svg>
  );
}

/* ============================================================================
 * MẪU 3: SƠN MÀI KHẮC GỖ (Vietnamese Woodblock & Gold-Leaf Lacquer Art)
 * Twin intertwined trunks (cây phượng đôi), concentric cloud-scroll lacquer
 * medallions with gold-leaf rims, ornamental fern fans, and woodcut blooms.
 * ========================================================================== */
function PhuongTreeWoodcut({ className, id = "phuong-m3" }: { className?: string; id?: string }) {
  const { drifting, gusting, carpet } = useFallingPetals(1969);

  // Ornamental lacquer cloud medallions (layered from back to front)
  const medallions = [
    { cx: 132, cy: 264, rx: 92, ry: 46, lobes: 10, seed: 81, tier: 1 },
    { cx: 474, cy: 274, rx: 90, ry: 44, lobes: 10, seed: 82, tier: 1 },
    { cx: 304, cy: 172, rx: 168, ry: 74, lobes: 14, seed: 83, tier: 1 },
    { cx: 215, cy: 252, rx: 102, ry: 48, lobes: 12, seed: 84, tier: 2 },
    { cx: 396, cy: 256, rx: 102, ry: 48, lobes: 12, seed: 85, tier: 2 },
    { cx: 168, cy: 196, rx: 106, ry: 50, lobes: 12, seed: 86, tier: 2 },
    { cx: 438, cy: 202, rx: 104, ry: 48, lobes: 12, seed: 87, tier: 2 },
    { cx: 304, cy: 196, rx: 124, ry: 54, lobes: 12, seed: 88, tier: 3 },
    { cx: 238, cy: 142, rx: 108, ry: 48, lobes: 12, seed: 89, tier: 3 },
    { cx: 372, cy: 146, rx: 106, ry: 48, lobes: 12, seed: 90, tier: 3 },
    { cx: 304, cy: 108, rx: 112, ry: 46, lobes: 12, seed: 91, tier: 4 },
  ];

  // Curated rosette positions for woodcut phoenix blooms
  const rosettes = [
    { x: 122, y: 258, s: 0.86, rot: -15 },
    { x: 162, y: 244, s: 0.68, rot: 22 },
    { x: 212, y: 254, s: 0.88, rot: 8 },
    { x: 252, y: 238, s: 0.66, rot: -28 },
    { x: 304, y: 212, s: 0.94, rot: 0 },
    { x: 356, y: 242, s: 0.72, rot: 18 },
    { x: 404, y: 256, s: 0.88, rot: -12 },
    { x: 468, y: 268, s: 0.85, rot: 24 },
    { x: 158, y: 192, s: 0.9, rot: -18 },
    { x: 204, y: 178, s: 0.72, rot: 32 },
    { x: 254, y: 188, s: 0.76, rot: -10 },
    { x: 352, y: 188, s: 0.76, rot: 14 },
    { x: 406, y: 182, s: 0.72, rot: -26 },
    { x: 448, y: 196, s: 0.9, rot: 20 },
    { x: 226, y: 138, s: 0.92, rot: -14 },
    { x: 274, y: 148, s: 0.74, rot: 25 },
    { x: 334, y: 148, s: 0.74, rot: -22 },
    { x: 382, y: 142, s: 0.92, rot: 16 },
    { x: 304, y: 102, s: 1.02, rot: 0 },
    { x: 262, y: 108, s: 0.78, rot: -30 },
    { x: 346, y: 108, s: 0.78, rot: 30 },
  ];

  return (
    <svg className={className} viewBox="0 0 600 620" role="img" aria-label="Mẫu 3: Cây phượng sơn mài khắc gỗ Việt Nam">
      <defs>
        <linearGradient id={`${id}-lacquer-1`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7D0E16" />
          <stop offset="100%" stopColor="#4A070C" />
        </linearGradient>
        <linearGradient id={`${id}-lacquer-2`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#BD1822" />
          <stop offset="100%" stopColor="#850E16" />
        </linearGradient>
        <linearGradient id={`${id}-lacquer-3`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#EA3825" />
          <stop offset="100%" stopColor="#B81920" />
        </linearGradient>
        <linearGradient id={`${id}-lacquer-4`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF7A33" />
          <stop offset="100%" stopColor="#DF2B22" />
        </linearGradient>

        {/* Woodblock carved fern fan */}
        <g id={`${id}-wc-fern`}>
          <path d="M0 0 L0 -56" stroke="#164A28" strokeWidth="2.2" strokeLinecap="round" />
          {[-46, -36, -26, -16, -6].map((ly, i) => {
            const w = 15 - i * 1.7;
            return (
              <path
                key={ly}
                d={`M0 ${ly} L-${w} ${ly - 5} L-${w * 0.45} ${ly - 9} L0 ${ly - 3} L${w * 0.45} ${ly - 9} L${w} ${ly - 5} Z`}
                fill={i % 2 === 0 ? "#1E6B3A" : "#349B54"}
                stroke="#123D20"
                strokeWidth="0.6"
              />
            );
          })}
        </g>

        {/* Woodblock & gold-leaf rosette flower */}
        <g id={`${id}-woodcut-bloom`}>
          {[0, 72, 144, 216, 288].map((angle, idx) => (
            <g key={angle} transform={`rotate(${angle})`}>
              <path
                d={clawedPetalPath}
                fill={idx === 0 ? "#FFF3C4" : idx % 2 ? "#D91E28" : "#FF5A26"}
                stroke="#3B1212"
                strokeWidth="0.95"
              />
              <path d="M0 -3 L0 -14" stroke={idx === 0 ? "#D91E28" : "#FFD166"} strokeWidth="0.7" strokeLinecap="round" />
            </g>
          ))}
          <circle r="4.2" fill="#F4B942" stroke="#3B1212" strokeWidth="0.9" />
          <circle r="1.8" fill="#850E16" />
        </g>
      </defs>

      {/* Traditional Dong Ho / Lacquer golden sun aureole with decorative rings */}
      <g opacity="0.72">
        <circle cx="315" cy="188" r="172" fill="#FFE8BD" stroke="#F4B942" strokeWidth="1.5" strokeDasharray="6 4" />
        <circle cx="315" cy="188" r="138" fill="#FFD894" opacity="0.55" />
      </g>

      <ellipse cx="335" cy="593" rx="225" ry="16" fill="#9E1B1E" opacity="0.15" />

      <g className="sd-tree-gust">
        <g className="sd-tree-sway">
          {/* Woodcut fern fans around perimeter */}
          {[
            { x: 64, y: 256, rot: -72, s: 1 },
            { x: 112, y: 298, rot: -45, s: 0.94 },
            { x: 182, y: 296, rot: -22, s: 0.88 },
            { x: 428, y: 302, rot: 24, s: 0.88 },
            { x: 496, y: 306, rot: 46, s: 0.94 },
            { x: 542, y: 266, rot: 74, s: 1 },
            { x: 102, y: 172, rot: -58, s: 0.86 },
            { x: 508, y: 176, rot: 60, s: 0.86 },
          ].map((f, i) => (
            <use key={`wf-${i}`} href={`#${id}-wc-fern`} transform={`translate(${f.x} ${f.y}) rotate(${f.rot}) scale(${f.s})`} />
          ))}

          {/* Tier 1 & 2 Lacquer Medallions with gold-leaf rim stroke */}
          {medallions
            .filter((m) => m.tier <= 2)
            .map((m) => (
              <path
                key={m.seed}
                d={createCloudPadPath(m.cx, m.cy, m.rx, m.ry, m.lobes, m.seed, 0.56)}
                fill={`url(#${id}-lacquer-${m.tier})`}
                stroke="#F4B942"
                strokeWidth="1.4"
              />
            ))}

          {/* Twin intertwined woodblock trunks (cây phượng đôi) with carved bark lines */}
          <g stroke="#2B1810" strokeWidth="1.8" strokeLinejoin="round">
            {/* Left intertwined trunk */}
            <path
              fill="#6E4B37"
              d="M256 596 C284 584 298 552 296 508 C294 466 278 432 292 388 C252 362 196 334 134 274 L146 262 C208 316 262 344 304 368 C294 316 264 268 222 208 L236 200 C280 258 310 308 322 364 L326 594 C300 594 278 598 256 596 Z"
            />
            {/* Right intertwined trunk */}
            <path
              fill="#4E3324"
              d="M318 594 C320 538 338 494 326 446 C318 414 324 384 334 358 C346 304 374 256 416 202 L430 210 C390 264 364 312 352 364 C394 342 444 318 486 272 L498 282 C452 332 400 358 354 384 C366 428 352 468 358 512 C364 554 386 584 422 596 C390 599 354 594 318 594 Z"
            />
          </g>
          {/* Gold-leaf & ink woodcut bark lines */}
          <g fill="none" stroke="#F4B942" strokeWidth="1.2" strokeLinecap="round" opacity="0.68">
            <path d="M286 584 C306 544 292 486 306 432" />
            <path d="M342 582 C338 534 352 482 340 426" />
            <path d="M296 382 C252 354 202 326 146 272" />
            <path d="M350 378 C394 354 442 328 488 280" />
          </g>

          {/* Tier 3 & 4 Front Lacquer Medallions */}
          {medallions
            .filter((m) => m.tier >= 3)
            .map((m) => (
              <path
                key={m.seed}
                d={createCloudPadPath(m.cx, m.cy, m.rx, m.ry, m.lobes, m.seed, 0.56)}
                fill={`url(#${id}-lacquer-${m.tier})`}
                stroke="#FFD166"
                strokeWidth="1.5"
              />
            ))}

          {/* Woodblock phoenix flower rosettes */}
          {rosettes.map((b, i) => (
            <use
              key={`wr-${i}`}
              href={`#${id}-woodcut-bloom`}
              transform={`translate(${b.x} ${b.y}) rotate(${b.rot}) scale(${b.s})`}
            />
          ))}
        </g>
      </g>

      {/* Falling petals */}
      {[...drifting, ...gusting].map((petal, index) => (
        <g key={`d${index}`} className={index < drifting.length ? "sd-fall" : "sd-fall sd-fall-gust"} style={petal.style} aria-hidden="true">
          <g transform={`translate(${petal.x} ${petal.y})`}>
            <g className="sd-fall-spin">
              <path d={clawedPetalPath} transform={`rotate(${petal.turn}) scale(.48)`} fill={petal.fill} stroke="#3B1212" strokeWidth="0.5" />
            </g>
          </g>
        </g>
      ))}

      {/* Ground petal carpet */}
      {carpet.map((petal, index) => (
        <path
          key={`p${index}`}
          d={clawedPetalPath}
          transform={`translate(${petal.x} ${petal.y}) rotate(${petal.turn}) scale(${petal.scale} ${r(petal.scale * 0.62)})`}
          fill={petal.fill}
          opacity="0.92"
        />
      ))}
    </svg>
  );
}

/** Main PhuongTree component supporting all 3 variants (`canopy` default). */
export function PhuongTree({
  className,
  id = "phuong",
  variant = "canopy",
}: {
  className?: string;
  id?: string;
  variant?: PhuongVariant;
}) {
  if (variant === "watercolor") {
    return <PhuongTreeWatercolor className={className} id={`${id}-wc`} />;
  }
  if (variant === "woodcut") {
    return <PhuongTreeWoodcut className={className} id={`${id}-wd`} />;
  }
  return <PhuongTreeCanopy className={className} id={`${id}-cp`} />;
}

/** Interactive Hero showcase so the user can switch among the 3 tree designs or compare all 3 side-by-side. */
export function PhuongHeroShowcase({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<PhuongVariant>("canopy");
  const [compareAll, setCompareAll] = useState(false);

  const currentMeta = PHUONG_VARIANTS.find((v) => v.id === active) ?? PHUONG_VARIANTS[0]!;

  return (
    <div className="sd-hero-art sd-rise sd-rise-2">
      {/* Variant Switcher Bar */}
      <div className="sd-tree-switcher" role="group" aria-label="Chọn mẫu cây hoa phượng đỏ">
        {PHUONG_VARIANTS.map((item) => {
          const isSelected = !compareAll && active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`sd-tree-pill ${isSelected ? "is-active" : ""}`}
              onClick={() => {
                setActive(item.id);
                setCompareAll(false);
              }}
              aria-pressed={isSelected}
            >
              <strong>{item.badge}</strong>
              <span>{item.name}</span>
            </button>
          );
        })}
        <button
          type="button"
          className={`sd-tree-pill sd-tree-pill-compare ${compareAll ? "is-active" : ""}`}
          onClick={() => setCompareAll((v) => !v)}
          aria-pressed={compareAll}
        >
          <span>{compareAll ? "Đóng so sánh" : "Xem cả 3 mẫu"}</span>
        </button>
      </div>

      {compareAll ? (
        <div className="sd-tree-compare-grid" role="region" aria-label="So sánh 3 mẫu cây hoa phượng đỏ">
          {PHUONG_VARIANTS.map((item) => (
            <div
              key={item.id}
              className={`sd-tree-compare-card ${active === item.id ? "is-selected" : ""}`}
              onClick={() => {
                setActive(item.id);
                setCompareAll(false);
              }}
            >
              <div className="sd-tree-compare-head">
                <span className="sd-tree-compare-badge">{item.badge}</span>
                <strong>{item.name}</strong>
              </div>
              <div className="sd-tree-compare-stage">
                <PhuongTree className="sd-tree" id={`cmp-${item.id}`} variant={item.id} />
              </div>
              <p className="sd-tree-compare-desc">{item.subtitle}</p>
              <button
                type="button"
                className="sd-tree-compare-pick"
                onClick={(e) => {
                  e.stopPropagation();
                  setActive(item.id);
                  setCompareAll(false);
                }}
              >
                Chọn xem lớn {item.badge}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="sd-tree-stage">
            <PhuongTree className="sd-tree" id={`hero-${active}`} variant={active} />
            {children}
          </div>
          <p className="sd-tree-caption" aria-live="polite">
            <strong>
              {currentMeta.badge} — {currentMeta.name}:
            </strong>{" "}
            {currentMeta.subtitle}
          </p>
        </>
      )}
    </div>
  );
}
