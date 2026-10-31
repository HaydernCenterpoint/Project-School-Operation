// Red flamboyant (hoa phượng vĩ — Delonix regia) motif:
// Mastercrafted botanical SVG tree illustration with multi-layer wind animation,
// five-petal flower glyph, and section divider.
// Deterministic seeded PRNG ensures server and client render identical SVG markup.

import type { CSSProperties } from "react";

const petalPath = "M0 0C-5 -4 -7 -12 0 -17C7 -12 5 -4 0 0Z";
// Authentic Delonix regia clawed petal: slender basal claw flaring into a ruffled orbicular blade
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

// Reusable organic blossom-and-foliage bouquet definitions (layered circles + petals, no hard cartoon outline)
const bouquetTemplates = (["a", "b", "c"] as const).map((shape, n) => {
  const rand = seeded(41 + n * 29);
  const puffs = Array.from({ length: 16 }, (_, idx) => {
    const a = (idx / 16) * Math.PI * 2 + rand() * 0.35;
    const dist = idx === 0 ? 0 : 7 + rand() * 22;
    return {
      x: r(Math.cos(a) * dist * 1.15),
      y: r(Math.sin(a) * dist * 0.78),
      rx: r(6.5 + rand() * 6.5),
      ry: r(5.2 + rand() * 5.2),
      rot: r(rand() * 180),
      shade: idx < 5 ? 0 : idx < 11 ? 1 : 2,
    };
  });
  const accents = Array.from({ length: 7 }, (_, idx) => {
    const a = (idx / 7) * Math.PI * 2 + rand() * 0.5;
    const dist = 6 + rand() * 19;
    return {
      x: r(Math.cos(a) * dist * 1.1),
      y: r(Math.sin(a) * dist * 0.78),
      rot: r((a * 180) / Math.PI + 90 + (rand() - 0.5) * 45),
      scale: r(0.38 + rand() * 0.24),
    };
  });
  return { shape, puffs, accents };
});

const bouquetPalettes = {
  deep: ["#590910", "#780E17", "#96141E"],
  crimson: ["#9E141D", "#BF1B23", "#DC2925"],
  scarlet: ["#CC2023", "#E63525", "#F54E28"],
  sunlit: ["#EB3B24", "#FF622E", "#FF853B"],
  amber: ["#F55326", "#FF7E36", "#FFB04A"],
  emerald: ["#18542B", "#24733B", "#35964F"],
} as const;
type PaletteKey = keyof typeof bouquetPalettes;

/**
 * Mastercrafted Animated SVG Royal Poinciana Tree (Cây Hoa Phượng Đỏ):
 * - Gnarled, wide-buttressed ancient trunk with natural bark grain and warm rim lighting
 * - Sinuous crooked boughs weaving IN and OUT of multi-layered foliage (no bare stick gap)
 * - 260+ organic textured blossom bouquets across 6 color temperatures (deep wine → scarlet → sunlit coral-gold)
 * - 34 fluttering bipinnate fern-like leaf fronds (`sd-frond-flutter`)
 * - 4 pendulum-swinging woody seed pods (`sd-pod-swing`)
 * - 12 swaying foreground hero flower panicles (`sd-panicle-sway`) + 95 individual 5-petal blooms
 * - Pulsing golden summer sunbeams (`sd-sunbeam-pulse`), twinkling pollen motes, and 34 falling 3D petals
 */
export function PhuongTree({ className, id = "phuong" }: { className?: string; id?: string }) {
  const random = seeded(1969);
  const between = (min: number, max: number) => r(min + random() * (max - min));
  const bloomColors = ["#C81E28", "#E02E24", "#F44D27", "#FF6E38", "#FFB347"];
  const pick = <T,>(items: readonly T[]) => items[Math.floor(random() * items.length)]!;

  // Multi-tier umbrella canopy zones (modelling a real wide-spreading Delonix regia crown)
  // Includes lower inner sub-canopy zones (zones 6 & 7) right over the main fork so boughs are nestled in blossoms!
  const zones = [
    { cx: 112, cy: 256, rx: 86, ry: 44 }, // 0: far-left low wing
    { cx: 196, cy: 194, rx: 108, ry: 54 }, // 1: mid-left dome
    { cx: 304, cy: 136, rx: 138, ry: 62 }, // 2: upper central crown
    { cx: 416, cy: 198, rx: 108, ry: 54 }, // 3: mid-right dome
    { cx: 494, cy: 266, rx: 84, ry: 42 }, // 4: far-right low wing
    { cx: 302, cy: 218, rx: 146, ry: 58 }, // 5: central heart
    { cx: 238, cy: 284, rx: 88, ry: 42 }, // 6: lower-left fork pillow
    { cx: 374, cy: 288, rx: 88, ry: 42 }, // 7: lower-right fork pillow
    { cx: 306, cy: 318, rx: 72, ry: 34 }, // 8: central crotch foliage cluster
  ];

  const sampleInZones = (zoneIndices: number[], yBias = 0) => {
    const z = zones[pick(zoneIndices)]!;
    const a = random() * Math.PI * 2;
    const d = Math.pow(random(), 0.62);
    return {
      x: r(z.cx + Math.cos(a) * z.rx * d),
      y: r(z.cy + Math.sin(a) * z.ry * d + yBias),
    };
  };

  const makeBouquet = (palette: PaletteKey, pos: { x: number; y: number }, minS: number, maxS: number) => ({
    ...pos,
    palette,
    shape: pick(["a", "b", "c"] as const),
    scale: between(minS, maxS),
    rot: between(0, 360),
  });

  // Layer 1 (Back canopy): deep wine shadow + dark emerald inner foliage (behind the main boughs!)
  const backBouquets = [
    ...Array.from({ length: 58 }, () => makeBouquet("deep", sampleInZones([0, 1, 2, 3, 4, 5, 6, 7, 8], 10), 1.05, 1.55)),
    ...Array.from({ length: 34 }, () => makeBouquet("emerald", sampleInZones([0, 1, 3, 4, 5, 6, 7, 8], 12), 0.85, 1.25)),
    ...Array.from({ length: 32 }, () => makeBouquet("crimson", sampleInZones([5, 6, 7, 8], 6), 0.95, 1.35)),
  ];

  // Layer 2 (Mid canopy): rich crimson & scarlet masses (partially covering the upper branches)
  const midBouquets = [
    ...Array.from({ length: 54 }, () => makeBouquet("crimson", sampleInZones([0, 1, 2, 3, 4, 5, 6, 7], 0), 0.85, 1.3)),
    ...Array.from({ length: 58 }, () => makeBouquet("scarlet", sampleInZones([0, 1, 2, 3, 4, 5, 6, 7], -6), 0.78, 1.2)),
    ...Array.from({ length: 18 }, () => makeBouquet("emerald", sampleInZones([0, 4, 6, 7], 8), 0.7, 1.0)),
  ];

  // Layer 3 (Front sunlit canopy): fiery sunlit vermilion & golden-amber crown highlights
  const frontBouquets = [
    ...Array.from({ length: 52 }, () => makeBouquet("sunlit", sampleInZones([0, 1, 2, 3, 4, 5, 6, 7], -12), 0.65, 1.05)),
    ...Array.from({ length: 38 }, () => makeBouquet("amber", sampleInZones([1, 2, 3, 5], -18), 0.52, 0.88)),
  ];

  // 34 Bipinnate fern-like leaf fronds (lá phượng kép lông chim) around rim & tucked under tiers
  const fronds = [
    { x: 42, y: 266, rot: -82, scale: 0.98, shade: 0, delay: -0.4, dur: 4.3 },
    { x: 68, y: 288, rot: -62, scale: 0.94, shade: 1, delay: -1.6, dur: 4.8 },
    { x: 108, y: 302, rot: -42, scale: 0.9, shade: 0, delay: -2.8, dur: 5.1 },
    { x: 156, y: 308, rot: -26, scale: 0.88, shade: 1, delay: -0.9, dur: 4.5 },
    { x: 208, y: 318, rot: -18, scale: 0.86, shade: 0, delay: -3.2, dur: 5.2 },
    { x: 258, y: 332, rot: -10, scale: 0.82, shade: 1, delay: -1.4, dur: 4.7 },
    { x: 356, y: 334, rot: 12, scale: 0.82, shade: 0, delay: -2.1, dur: 4.9 },
    { x: 406, y: 322, rot: 22, scale: 0.88, shade: 1, delay: -0.7, dur: 4.4 },
    { x: 458, y: 312, rot: 36, scale: 0.92, shade: 0, delay: -3.5, dur: 5.0 },
    { x: 504, y: 300, rot: 54, scale: 0.94, shade: 1, delay: -1.9, dur: 4.6 },
    { x: 542, y: 278, rot: 74, scale: 0.96, shade: 0, delay: -2.6, dur: 4.8 },
    { x: 556, y: 246, rot: 88, scale: 0.88, shade: 1, delay: -1.1, dur: 4.5 },
    { x: 54, y: 222, rot: -74, scale: 0.88, shade: 1, delay: -2.3, dur: 4.7 },
    { x: 84, y: 182, rot: -58, scale: 0.84, shade: 0, delay: -3.7, dur: 5.3 },
    { x: 132, y: 142, rot: -44, scale: 0.82, shade: 1, delay: -0.6, dur: 4.6 },
    { x: 192, y: 104, rot: -28, scale: 0.78, shade: 0, delay: -2.9, dur: 5.0 },
    { x: 416, y: 108, rot: 30, scale: 0.78, shade: 1, delay: -1.5, dur: 4.8 },
    { x: 474, y: 146, rot: 46, scale: 0.82, shade: 0, delay: -3.1, dur: 5.1 },
    { x: 522, y: 188, rot: 62, scale: 0.86, shade: 1, delay: -0.8, dur: 4.4 },
    // Inner canopy fronds peeking out between blossom tiers
    { x: 168, y: 248, rot: -48, scale: 0.76, shade: 1, delay: -1.7, dur: 4.9 },
    { x: 244, y: 236, rot: -24, scale: 0.75, shade: 0, delay: -2.4, dur: 4.6 },
    { x: 366, y: 238, rot: 26, scale: 0.75, shade: 1, delay: -1.2, dur: 4.7 },
    { x: 438, y: 252, rot: 48, scale: 0.76, shade: 0, delay: -3.0, dur: 5.0 },
    { x: 298, y: 266, rot: -6, scale: 0.74, shade: 1, delay: -0.5, dur: 4.5 },
  ];

  // 95 crisp 5-petal individual flowers across the sunlit dome
  const individualBlooms = Array.from({ length: 95 }, (_, idx) => {
    const pos = sampleInZones([0, 1, 2, 3, 4, 5, 6, 7], -8);
    const isHero = idx < 32;
    return {
      ...pos,
      scale: isHero ? between(0.55, 0.84) : between(0.32, 0.5),
      rot: between(0, 360),
      isHero,
    };
  });

  // 12 Animated Foreground Hero Panicles (chùm hoa phượng đầu cành đung đưa)
  const heroPanicles = [
    { x: 88, y: 242, rot: -32, scale: 0.92, delay: -0.5 },
    { x: 144, y: 186, rot: -20, scale: 0.98, delay: -1.7 },
    { x: 212, y: 134, rot: -12, scale: 1.02, delay: -2.9 },
    { x: 284, y: 98, rot: -4, scale: 1.06, delay: -1.1 },
    { x: 348, y: 104, rot: 8, scale: 1.04, delay: -2.3 },
    { x: 418, y: 142, rot: 18, scale: 0.98, delay: -3.4 },
    { x: 472, y: 196, rot: 26, scale: 0.95, delay: -0.8 },
    { x: 512, y: 254, rot: 34, scale: 0.9, delay: -2.0 },
    { x: 194, y: 264, rot: -14, scale: 0.88, delay: -1.4 },
    { x: 274, y: 214, rot: -6, scale: 0.94, delay: -3.1 },
    { x: 346, y: 218, rot: 8, scale: 0.94, delay: -0.9 },
    { x: 412, y: 268, rot: 16, scale: 0.88, delay: -2.6 },
  ];

  // 20 Shimmering golden pollen motes
  const motes = Array.from({ length: 20 }, (_, i) => ({
    x: between(78, 524),
    y: between(62, 295),
    r: between(1.6, 3.2),
    delay: `${r(-i * 0.42)}s`,
    dur: `${between(3.2, 5.4)}s`,
  }));

  // Falling petals & ground carpet
  const falling = (gust: boolean) => {
    const x = between(80, 535);
    const y = between(210, 330);
    return {
      x,
      y,
      turn: between(0, 360),
      fill: pick(bloomColors),
      style: {
        "--dx": `${gust ? between(115, 235) : between(-48, 48)}px`,
        "--dy": `${r(between(576, 602) - y)}px`,
        "--dur": `${gust ? 12 : between(7, 12)}s`,
        "--delay": `${gust ? -between(0, 0.9) : -between(0, 12)}s`,
        "--spin": `${between(1.2, 2.6)}s`,
      } as CSSProperties,
    };
  };
  const drifting = Array.from({ length: 16 }, () => falling(false));
  const gusting = Array.from({ length: 18 }, () => falling(true));
  const carpet = Array.from({ length: 74 }, () => ({
    x: between(145, 535),
    y: between(578, 606),
    turn: between(0, 360),
    scale: between(0.4, 0.66),
    fill: pick(bloomColors),
  }));

  const place = (c: { x: number; y: number; rot: number; scale: number }) =>
    `translate(${c.x} ${c.y}) rotate(${c.rot}) scale(${c.scale})`;

  return (
    <svg
      className={className}
      viewBox="0 0 600 620"
      role="img"
      aria-label="Minh họa cây hoa phượng đỏ cổ thụ nở rộ trong nắng hè Hải Phòng"
    >
      <defs>
        <linearGradient id={`${id}-bark`} x1="0" y1="0" x2="1" y2="0.12">
          <stop offset="0%" stopColor="#9A785F" />
          <stop offset="32%" stopColor="#72523D" />
          <stop offset="72%" stopColor="#4E3526" />
          <stop offset="100%" stopColor="#322016" />
        </linearGradient>
        <linearGradient id={`${id}-bough-back`} x1="0" y1="0" x2="1" y2="0.2">
          <stop offset="0%" stopColor="#6B4C39" />
          <stop offset="100%" stopColor="#3B261B" />
        </linearGradient>
        <radialGradient id={`${id}-sun-halo`} cx="50%" cy="36%" r="48%">
          <stop offset="0%" stopColor="#FFCC66" stopOpacity="0.36" />
          <stop offset="65%" stopColor="#FF6B35" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#FF6B35" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-sunbeam`} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0%" stopColor="#FFE699" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#FFE699" stopOpacity="0" />
        </linearGradient>

        {/* Reusable organic blossom bouquet templates (no artificial flat outline) */}
        {(Object.keys(bouquetPalettes) as PaletteKey[]).flatMap((palette) =>
          bouquetTemplates.map(({ shape, puffs, accents }) => (
            <g key={`${palette}-${shape}`} id={`${id}-bq-${palette}-${shape}`}>
              {puffs.map((p, idx) => (
                <ellipse
                  key={idx}
                  cx={p.x}
                  cy={p.y}
                  rx={p.rx}
                  ry={p.ry}
                  transform={`rotate(${p.rot} ${p.x} ${p.y})`}
                  fill={bouquetPalettes[palette][p.shade]}
                />
              ))}
              {palette !== "emerald" &&
                accents.map((a, idx) => (
                  <path
                    key={`ac-${idx}`}
                    d={clawedPetalPath}
                    transform={`translate(${a.x} ${a.y}) rotate(${a.rot}) scale(${a.scale})`}
                    fill={bouquetPalettes[palette][2]}
                  />
                ))}
            </g>
          )),
        )}

        {/* Compound bipinnate fern-like leaf frond (lá phượng kép lông chim) */}
        {(["#1B6836", "#2E914A"] as const).map((color, idx) => (
          <g key={color} id={`${id}-frond-${idx}`}>
            <path d="M0 0 Q6 -28 2 -62" fill="none" stroke="#154726" strokeWidth="1.4" strokeLinecap="round" />
            {Array.from({ length: 13 }, (_, i) => {
              const t = (i + 1) / 14;
              const py = -t * 58;
              const px = 2 * (1 - t) * t * 6 + t * t * 2;
              const w = Math.sin(t * Math.PI) * 14.5 + 3.5;
              return (
                <g key={i} fill={color}>
                  <ellipse
                    cx={r(px - w * 0.55)}
                    cy={r(py)}
                    rx={r(w * 0.5)}
                    ry="1.7"
                    transform={`rotate(-26 ${r(px - w * 0.55)} ${r(py)})`}
                  />
                  <ellipse
                    cx={r(px + w * 0.55)}
                    cy={r(py)}
                    rx={r(w * 0.5)}
                    ry="1.7"
                    transform={`rotate(26 ${r(px + w * 0.55)} ${r(py)})`}
                  />
                </g>
              );
            })}
          </g>
        ))}

        {/* Detailed 5-petal hero blossom with white-gold spotted banner petal & long curving stamens */}
        <g id={`${id}-hero-bloom`}>
          {[0, 72, 144, 216, 288].map((angle, idx) => (
            <g key={angle} transform={`rotate(${angle})`}>
              <path
                d={clawedPetalPath}
                fill={idx === 0 ? "#FFF4CE" : idx % 2 ? "#DF2228" : "#FF5C2B"}
                stroke={idx === 0 ? "#D9232E" : "#99121A"}
                strokeWidth="0.45"
              />
              {idx === 0 && (
                <>
                  <circle cx="-1.4" cy="-11.5" r="0.95" fill="#D9232E" />
                  <circle cx="1.3" cy="-12.8" r="0.9" fill="#D9232E" />
                  <circle cx="0" cy="-9.5" r="0.8" fill="#E84A27" />
                </>
              )}
            </g>
          ))}
          <path
            d="M0 0 Q-5 -9 -8.5 -14 M0 0 Q5 -9 8.5 -14 M0 0 Q-8 -2 -12.5 -5 M0 0 Q8 -2 12.5 -5"
            stroke="#FFD15C"
            strokeWidth="0.75"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="-8.5" cy="-14" r="1" fill="#FFE082" />
          <circle cx="8.5" cy="-14" r="1" fill="#FFE082" />
          <circle r="2.3" fill="#FFD15C" />
        </g>

        {/* Secondary 5-petal cluster flower */}
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

        {/* Swaying Conical Flower Panicle (chùm hoa + nụ non đầu cành) */}
        <g id={`${id}-panicle`}>
          <use href={`#${id}-hero-bloom`} transform="translate(0 0) scale(0.92)" />
          <use href={`#${id}-hero-bloom`} transform="translate(-15 -10) rotate(-32) scale(0.76)" />
          <use href={`#${id}-hero-bloom`} transform="translate(15 -11) rotate(28) scale(0.74)" />
          <use href={`#${id}-cluster-bloom`} transform="translate(-8 -23) rotate(14) scale(0.66)" />
          <use href={`#${id}-cluster-bloom`} transform="translate(9 -25) rotate(-18) scale(0.64)" />
          <circle cx="-3" cy="-35" r="3.2" fill="#FF8C3B" />
          <circle cx="4" cy="-38" r="2.6" fill="#FFD166" />
          <circle cx="0" cy="-43" r="2.0" fill="#FFE082" />
        </g>
      </defs>

      {/* Atmospheric golden summer sun & pulsing sunbeams */}
      <circle cx="308" cy="210" r="258" fill={`url(#${id}-sun-halo)`} />
      <g className="sd-sunbeam-pulse" aria-hidden="true">
        <polygon points="395,28 495,28 345,565 185,565" fill={`url(#${id}-sunbeam)`} />
        <polygon points="315,28 380,28 225,565 110,565" fill={`url(#${id}-sunbeam)`} opacity="0.65" />
      </g>

      {/* Ground shadow plinth */}
      <ellipse cx="338" cy="593" rx="228" ry="17" fill="#B52B22" opacity="0.14" />
      <ellipse cx="342" cy="593" rx="128" ry="10" fill="#4E2F21" opacity="0.24" />

      <g className="sd-tree-gust">
        <g className="sd-tree-sway">
          {/* LAYER 1: Deep back shadow bouquets & inner crotch foliage (sits BEHIND the main boughs!) */}
          <g className="sd-canopy-back">
            {backBouquets.map((b, i) => (
              <use key={`bk-${i}`} href={`#${id}-bq-${b.palette}-${b.shape}`} transform={place(b)} />
            ))}
          </g>

          {/* LAYER 2: Animated fluttering bipinnate fern fronds */}
          {fronds.map((f, i) => (
            <g key={`fr-${i}`} transform={`translate(${f.x} ${f.y}) rotate(${f.rot}) scale(${f.scale})`}>
              <g
                className="sd-frond-flutter"
                style={
                  {
                    "--flutter-delay": `${f.delay}s`,
                    "--flutter-dur": `${f.dur}s`,
                  } as CSSProperties
                }
              >
                <use href={`#${id}-frond-${f.shade}`} />
              </g>
            </g>
          ))}

          {/* LAYER 3: Back-plane secondary limbs & swinging woody seed pods (quả phượng vĩ) */}
          <g fill={`url(#${id}-bough-back)`}>
            {/* Deep inner limbs partially veiled by back/mid foliage */}
            <path d="M312 404 C284 362 248 334 218 286 C198 254 188 222 184 192 L196 190 C202 218 214 248 234 278 C264 322 298 350 326 394 Z" />
            <path d="M336 406 C366 364 402 336 426 288 C442 256 446 224 440 194 L428 194 C432 222 428 252 412 280 C388 324 352 352 324 396 Z" />
          </g>

          <g transform="translate(166 298)">
            <g className="sd-pod-swing" style={{ "--pod-delay": "-0.8s" } as CSSProperties}>
              <path d="M0 0 C-4 26 0 54 -6 78 C0 76 6 52 7 24 Z" fill="#4A2E20" stroke="#2B1810" strokeWidth="0.8" />
            </g>
          </g>
          <g transform="translate(180 302)">
            <g className="sd-pod-swing" style={{ "--pod-delay": "-2.1s" } as CSSProperties}>
              <path d="M0 0 C-2 22 1 44 -3 62 C2 60 6 42 6 20 Z" fill="#593828" stroke="#2B1810" strokeWidth="0.75" />
            </g>
          </g>
          <g transform="translate(438 308)">
            <g className="sd-pod-swing" style={{ "--pod-delay": "-1.4s" } as CSSProperties}>
              <path d="M0 0 C4 26 0 54 6 76 C12 72 12 44 8 4 Z" fill="#4A2E20" stroke="#2B1810" strokeWidth="0.8" />
            </g>
          </g>

          {/* LAYER 4: Sculpted Gnarled Trunk, Root Buttresses & Primary Crooked Boughs */}
          <g fill={`url(#${id}-bark)`}>
            {/* Gnarled trunk with wide root buttresses and natural S-bend */}
            <path d="M252 598 C286 588 306 562 310 520 C314 482 302 444 306 404 L354 404 C348 444 358 484 362 522 C366 560 390 586 432 598 C398 601 372 596 356 588 C340 596 320 596 304 588 C286 596 268 600 252 598 Z" />
            {/*Crooked horizontal-spreading lower-left bough + sub-fork */}
            <path d="M310 428 C272 402 232 396 192 362 C158 334 134 296 108 262 L122 254 C148 286 172 320 206 346 C244 376 284 382 324 406 Z" />
            <path d="M214 366 C182 356 148 336 118 302 L128 294 C156 324 188 342 222 352 Z" />
            {/* Crooked lower-right bough + sub-fork */}
            <path d="M346 430 C384 406 422 400 456 368 C482 344 500 310 512 276 L498 270 C486 300 468 332 442 354 C410 382 372 388 334 410 Z" />
            <path d="M432 374 C458 362 486 342 512 312 L502 304 C478 330 452 348 424 360 Z" />
            {/* Central sinuous heart boughs */}
            <path d="M318 412 C308 362 278 326 254 274 C238 240 232 204 236 168 L250 168 C246 202 252 234 268 266 C292 314 322 352 334 404 Z" />
            <path d="M332 410 C344 360 374 324 394 274 C408 240 412 206 406 172 L392 172 C396 204 392 236 378 268 C358 314 328 352 318 404 Z" />
            <path d="M324 408 C320 342 332 278 312 212 C302 180 298 148 302 118 L314 118 C312 146 316 178 326 208 C346 276 336 342 340 408 Z" />
          </g>

          {/* Sculpted bark grain, root crevices & sunlit wood highlights */}
          <g fill="none" strokeLinecap="round">
            <path d="M320 584 C326 536 314 478 318 414" stroke="#BC9D86" strokeWidth="3.8" opacity="0.54" />
            <path d="M302 590 C290 568 276 562 262 595" stroke="#BC9D86" strokeWidth="2.5" opacity="0.46" />
            <path d="M332 574 C334 544 328 512 330 478" stroke="#8C6B54" strokeWidth="2.2" opacity="0.48" />
            <path d="M344 584 C348 534 338 478 342 414" stroke="#2D1B12" strokeWidth="3.2" opacity="0.58" />
            <path d="M364 582 C376 564 392 572 414 595" stroke="#2D1B12" strokeWidth="2.6" opacity="0.5" />
            <path d="M312 420 C272 394 232 386 194 352" stroke="#BC9D86" strokeWidth="2.5" opacity="0.5" />
            <path d="M348 424 C386 400 422 392 454 360" stroke="#2D1B12" strokeWidth="2.5" opacity="0.5" />
          </g>

          {/* LAYER 5: Mid-canopy crimson & scarlet bouquets (veiling the upper forks naturally) */}
          <g className="sd-canopy-mid">
            {midBouquets.map((b, i) => (
              <use key={`md-${i}`} href={`#${id}-bq-${b.palette}-${b.shape}`} transform={place(b)} />
            ))}
          </g>

          {/* Fine upper twigs peeking through the mid-canopy */}
          <g stroke="#422A1D" strokeWidth="3.2" strokeLinecap="round" fill="none" opacity="0.78">
            <path d="M188 264 Q156 238 128 218" />
            <path d="M258 218 Q232 182 208 154" />
            <path d="M318 194 Q308 154 296 122" />
            <path d="M368 222 Q394 186 418 158" />
            <path d="M428 268 Q458 242 486 224" />
          </g>

          {/* LAYER 6: Sunlit upper crown bouquets & 95 crisp 5-petal individual flowers */}
          <g className="sd-canopy-front">
            {frontBouquets.map((b, i) => (
              <use key={`frb-${i}`} href={`#${id}-bq-${b.palette}-${b.shape}`} transform={place(b)} />
            ))}
            {individualBlooms.map((b, i) => (
              <use
                key={`ib-${i}`}
                href={`#${id}-${b.isHero ? "hero-bloom" : "cluster-bloom"}`}
                transform={place(b)}
              />
            ))}
          </g>

          {/* LAYER 7: Animated swaying Hero Flower Panicles at the crown rim */}
          {heroPanicles.map((p, i) => (
            <g key={`pan-${i}`} transform={place(p)}>
              <g className="sd-panicle-sway" style={{ "--panicle-delay": `${p.delay}s` } as CSSProperties}>
                <use href={`#${id}-panicle`} />
              </g>
            </g>
          ))}

          {/* Shimmering golden pollen & sunlight motes */}
          {motes.map((m, i) => (
            <circle
              key={`mt-${i}`}
              className="sd-pollen-mote"
              cx={m.x}
              cy={m.y}
              r={m.r}
              fill="#FFE899"
              style={{ "--mote-delay": m.delay, "--mote-dur": m.dur } as CSSProperties}
            />
          ))}
        </g>
      </g>

      {/* Animated falling petals (steady trickle + synchronized wind-gust burst) */}
      {[...drifting, ...gusting].map((petal, index) => (
        <g
          key={`d${index}`}
          className={index < drifting.length ? "sd-fall" : "sd-fall sd-fall-gust"}
          style={petal.style}
          aria-hidden="true"
        >
          <g transform={`translate(${petal.x} ${petal.y})`}>
            <g className="sd-fall-spin">
              <path d={clawedPetalPath} transform={`rotate(${petal.turn}) scale(.48)`} fill={petal.fill} />
            </g>
          </g>
        </g>
      ))}

      {/* Fallen red-and-gold petal carpet around the roots */}
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
