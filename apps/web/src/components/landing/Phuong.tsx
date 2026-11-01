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
      viewBox="-56 18 712 596"
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
        <radialGradient id={`${id}-sun-halo`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFCC66" stopOpacity="0.28" />
          <stop offset="60%" stopColor="#FF6B35" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#FF6B35" stopOpacity="0" />
        </radialGradient>

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

      {/* Atmospheric golden summer sun glow (contained inside viewBox so no hard top edge is clipped) */}
      <circle cx="308" cy="240" r="190" fill={`url(#${id}-sun-halo)`} />

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

/**
 * Illustrated campus scenery & weeping floral willow vines (các dây hoa liễu
 * rủ dọc rìa khung) for the left `.auth-art` panel on `/login`.
 * Slender pendulous garlands of willow-lancet leaves, cascading 5-petal blooms,
 * and coral-gold buds drape from the top and side borders around `<CampusArt />`.
 */
export function PhuongAuthBackdrop({ className = "auth-art-backdrop" }: { className?: string }) {
  const id = "phuong-auth";

  // Helper to evaluate a cubic Bezier point & tangent angle at parameter t in [0, 1]
  const cubicPoint = (
    p0: [number, number],
    p1: [number, number],
    p2: [number, number],
    p3: [number, number],
    t: number,
  ) => {
    const u = 1 - t;
    const x =
      u * u * u * p0[0] +
      3 * u * u * t * p1[0] +
      3 * u * t * t * p2[0] +
      t * t * t * p3[0];
    const y =
      u * u * u * p0[1] +
      3 * u * u * t * p1[1] +
      3 * u * t * t * p2[1] +
      t * t * t * p3[1];
    const dx =
      3 * u * u * (p1[0] - p0[0]) +
      6 * u * t * (p2[0] - p1[0]) +
      3 * t * t * (p3[0] - p2[0]);
    const dy =
      3 * u * u * (p1[1] - p0[1]) +
      6 * u * t * (p2[1] - p1[1]) +
      3 * t * t * (p3[1] - p2[1]);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    return { x: r(x), y: r(y), angle: r(angle) };
  };

  // Weeping floral willow strands (dây hoa liễu rủ mềm quanh rìa khung)
  const willowStrands: Array<{
    p0: [number, number];
    p1: [number, number];
    p2: [number, number];
    p3: [number, number];
    nodes: number;
    bloomEvery: number;
    bloomOffset: number;
    scale: number;
    dur: number;
    delay: number;
  }> = [
    // Left-edge draping strands (starting well below brand-lockup at y>=165, hugging left margin x=8..62)
    {
      p0: [-6, 168],
      p1: [34, 228],
      p2: [12, 338],
      p3: [28, 462],
      nodes: 12,
      bloomEvery: 2,
      bloomOffset: 1,
      scale: 0.92,
      dur: 6.2,
      delay: -0.8,
    },
    {
      p0: [18, 156],
      p1: [58, 212],
      p2: [38, 304],
      p3: [52, 396],
      nodes: 10,
      bloomEvery: 2,
      bloomOffset: 0,
      scale: 0.84,
      dur: 5.5,
      delay: -2.1,
    },
    {
      p0: [-4, 272],
      p1: [24, 348],
      p2: [10, 442],
      p3: [22, 542],
      nodes: 10,
      bloomEvery: 3,
      bloomOffset: 2,
      scale: 0.82,
      dur: 6.8,
      delay: -3.4,
    },

    // Top-right & right-margin cascading curtain of weeping floral vines (graceful catenary S-curves)
    {
      p0: [358, -6],
      p1: [342, 42],
      p2: [368, 92],
      p3: [352, 146],
      nodes: 7,
      bloomEvery: 2,
      bloomOffset: 1,
      scale: 0.8,
      dur: 5.4,
      delay: -1.2,
    },
    {
      p0: [414, -6],
      p1: [392, 56],
      p2: [426, 122],
      p3: [406, 186],
      nodes: 8,
      bloomEvery: 2,
      bloomOffset: 0,
      scale: 0.86,
      dur: 6.0,
      delay: -2.6,
    },
    {
      p0: [472, 2],
      p1: [448, 72],
      p2: [484, 148],
      p3: [462, 224],
      nodes: 9,
      bloomEvery: 2,
      bloomOffset: 1,
      scale: 0.9,
      dur: 5.7,
      delay: -0.5,
    },
    {
      p0: [528, 8],
      p1: [502, 92],
      p2: [544, 184],
      p3: [520, 278],
      nodes: 11,
      bloomEvery: 2,
      bloomOffset: 0,
      scale: 0.94,
      dur: 6.4,
      delay: -1.9,
    },
    {
      p0: [582, 16],
      p1: [554, 118],
      p2: [602, 238],
      p3: [576, 366],
      nodes: 13,
      bloomEvery: 2,
      bloomOffset: 1,
      scale: 0.98,
      dur: 6.9,
      delay: -3.1,
    },
    {
      p0: [628, 24],
      p1: [598, 156],
      p2: [646, 318],
      p3: [614, 496],
      nodes: 16,
      bloomEvery: 2,
      bloomOffset: 0,
      scale: 1.02,
      dur: 7.3,
      delay: -1.4,
    },
    {
      p0: [664, 34],
      p1: [634, 198],
      p2: [674, 412],
      p3: [644, 636],
      nodes: 19,
      bloomEvery: 2,
      bloomOffset: 1,
      scale: 1.05,
      dur: 7.8,
      delay: -2.8,
    },

    // Lower-right trailing floral vines (draping past the bottom-right of CampusArt)
    {
      p0: [684, 430],
      p1: [630, 518],
      p2: [614, 642],
      p3: [596, 772],
      nodes: 12,
      bloomEvery: 2,
      bloomOffset: 0,
      scale: 0.92,
      dur: 6.5,
      delay: -0.9,
    },
    {
      p0: [686, 536],
      p1: [644, 622],
      p2: [632, 732],
      p3: [618, 848],
      nodes: 11,
      bloomEvery: 2,
      bloomOffset: 1,
      scale: 0.88,
      dur: 6.1,
      delay: -2.3,
    },
  ];

  // Soft crown bouquets anchoring the top-right and mid-left vine origins
  const anchorBouquets = [
    { x: 488, y: 4, rot: -8, scale: 0.84, palette: "crimson" as const, shape: "b" as const },
    { x: 578, y: 12, rot: 12, scale: 0.94, palette: "scarlet" as const, shape: "a" as const },
    { x: 654, y: 34, rot: 22, scale: 1.02, palette: "crimson" as const, shape: "c" as const },
    { x: 534, y: 8, rot: 6, scale: 0.78, palette: "sunlit" as const, shape: "a" as const },
    { x: 628, y: 20, rot: -14, scale: 0.86, palette: "amber" as const, shape: "b" as const },
    { x: -12, y: 174, rot: -18, scale: 0.76, palette: "crimson" as const, shape: "a" as const },
    { x: 6, y: 188, rot: 14, scale: 0.68, palette: "sunlit" as const, shape: "c" as const },
    { x: 662, y: 788, rot: -16, scale: 0.82, palette: "crimson" as const, shape: "b" as const },
    { x: 644, y: 818, rot: 12, scale: 0.72, palette: "sunlit" as const, shape: "a" as const },
  ];

  // Fallen petals on the lower-right courtyard walkway
  const rand = seeded(20261101);
  const between = (min: number, max: number) => r(min + rand() * (max - min));
  const courtyardPetals = Array.from({ length: 28 }, () => ({
    x: between(410, 666),
    y: between(838, 906),
    turn: between(0, 360),
    scale: between(0.38, 0.62),
    fill: ["#E62E2D", "#FF4722", "#FF6B35", "#FFA62B", "#FFD166"][Math.floor(rand() * 5)],
  }));

  // Floating pollen motes dancing around the weeping floral vines
  const motes = Array.from({ length: 18 }, () => ({
    x: between(340, 665),
    y: between(24, 680),
    r: between(1.4, 2.8),
    delay: `${-between(0, 5)}s`,
    dur: `${between(3.2, 5.4)}s`,
  }));

  const place = (c: { x: number; y: number; rot: number; scale: number }) =>
    `translate(${c.x} ${c.y}) rotate(${c.rot}) scale(${c.scale})`;

  return (
    <svg
      className={className}
      viewBox="0 0 680 920"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-sky`} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor="#FFFDF9" />
          <stop offset="45%" stopColor="#FFF4E6" />
          <stop offset="100%" stopColor="#FFE4CC" />
        </linearGradient>
        <radialGradient id={`${id}-sun`} cx="82%" cy="10%" r="58%">
          <stop offset="0%" stopColor="#FFD875" stopOpacity="0.46" />
          <stop offset="42%" stopColor="#FF8E47" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#FF6B35" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-beam`} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE28A" stopOpacity="0.32" />
          <stop offset="65%" stopColor="#FFB56B" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#FFB56B" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-bark`} x1="0" y1="0" x2="1" y2="0.2">
          <stop offset="0%" stopColor="#9A785F" />
          <stop offset="42%" stopColor="#72523D" />
          <stop offset="100%" stopColor="#3B261B" />
        </linearGradient>
        <linearGradient id={`${id}-hill-far`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F7D6BE" stopOpacity="0.68" />
          <stop offset="100%" stopColor="#F5DEC9" stopOpacity="0.15" />
        </linearGradient>
        <linearGradient id={`${id}-hill-near`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#EFC3A4" stopOpacity="0.62" />
          <stop offset="100%" stopColor="#FBE8D6" stopOpacity="0.2" />
        </linearGradient>
        <radialGradient id={`${id}-text-veil-top`} cx="18%" cy="6%" r="36%">
          <stop offset="0%" stopColor="#FFFAF4" stopOpacity="0.94" />
          <stop offset="70%" stopColor="#FFFAF4" stopOpacity="0.58" />
          <stop offset="100%" stopColor="#FFFAF4" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-text-veil-bottom`} cx="28%" cy="88%" r="48%">
          <stop offset="0%" stopColor="#FFF5EA" stopOpacity="0.95" />
          <stop offset="68%" stopColor="#FFF2E2" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#FFEEDE" stopOpacity="0" />
        </radialGradient>

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

        {/* Slender willow-lancet leaf pair (cặp lá liễu thon dài rủ dọc dây) */}
        <g id={`${id}-willow-node-a`}>
          <path
            d="M0 0 C-7 -4 -17 -3 -26 2 C-16 5 -7 4 0 0 Z"
            fill="#2E8547"
            stroke="#1B592D"
            strokeWidth="0.35"
          />
          <path
            d="M0 2 C7 -2 17 -1 25 4 C16 7 7 6 0 2 Z"
            fill="#47A45B"
            stroke="#236837"
            strokeWidth="0.35"
          />
        </g>
        <g id={`${id}-willow-node-b`}>
          <path
            d="M0 0 C-6 -5 -15 -5 -23 -1 C-14 3 -6 3 0 0 Z"
            fill="#5BB366"
            stroke="#28723B"
            strokeWidth="0.35"
          />
          <path
            d="M0 2 C6 -3 15 -2 22 2 C14 5 6 5 0 2 Z"
            fill="#27733D"
            stroke="#184D27"
            strokeWidth="0.35"
          />
        </g>

        {/* Detailed 5-petal hero blossom on the weeping vine */}
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

        {/* Delicate 5-petal garland blossom + side buds */}
        <g id={`${id}-garland-bloom`}>
          {[0, 72, 144, 216, 288].map((angle, idx) => (
            <path
              key={angle}
              d={petalPath}
              transform={`rotate(${angle})`}
              fill={idx === 0 ? "#FFE299" : idx % 2 ? "#E62E2D" : "#FF6433"}
            />
          ))}
          <circle r="2.2" fill="#FFF0B8" />
          <circle cx="-11" cy="5" r="2.6" fill="#FF7844" />
          <circle cx="11" cy="-4" r="2.2" fill="#FFD166" />
        </g>

        {/* Pendant tassel bud at the tip of each weeping willow-flower vine */}
        <g id={`${id}-vine-tassel`}>
          <path d="M0 0 C-4 7 -5 15 0 22 C5 15 4 7 0 0 Z" fill="#E62E2D" />
          <path d="M0 3 C-2.5 8 -3 14 0 19 C3 14 2.5 8 0 3 Z" fill="#FF7A45" />
          <circle cx="-5" cy="6" r="2.4" fill="#FFB74D" />
          <circle cx="5" cy="8" r="2.1" fill="#FFE082" />
          <circle cx="0" cy="23.5" r="1.6" fill="#FFD166" />
        </g>
      </defs>

      {/* 1. Warm summer sky & sunlit radial glow */}
      <rect width="680" height="920" fill={`url(#${id}-sky)`} />
      <rect width="680" height="920" fill={`url(#${id}-sun)`} />

      {/* Diagonal golden summer sunbeams streaming from top-right */}
      <g className="sd-sunbeam-pulse">
        <polygon points="680,0 510,0 120,520 265,520" fill={`url(#${id}-beam)`} />
        <polygon points="680,40 680,190 250,680 140,680" fill={`url(#${id}-beam)`} />
        <polygon points="465,0 365,0 30,410 110,410" fill={`url(#${id}-beam)`} opacity="0.65" />
      </g>

      {/* 2. Soft summer sun disc, clouds & distant swallows in the sky around the frame */}
      <g>
        <circle cx="268" cy="62" r="34" fill="#FFE699" opacity="0.45" />
        <circle cx="268" cy="62" r="19" fill="#FFF3C4" opacity="0.68" />
      </g>
      <g fill="#FFFDF9" opacity="0.78">
        <path d="M182 86 C190 70 216 66 232 76 C246 62 276 64 288 80 C306 80 318 92 314 104 L170 104 C166 92 172 86 182 86 Z" />
        <path d="M46 134 C54 122 74 120 88 128 C100 118 122 120 130 132 C142 132 150 140 148 148 L38 148 C34 140 40 134 46 134 Z" opacity="0.68" />
      </g>
      {/* Distant summer swallows (chim én mùa hạ) */}
      <g stroke="#B85D43" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.62">
        <path d="M232 52 Q239 44 246 50 Q253 44 260 52" />
        <path d="M268 40 Q273 34 278 39 Q283 34 288 40" />
        <path d="M204 70 Q209 64 214 69 Q219 64 224 70" opacity="0.75" />
      </g>

      {/* 3. Distant Chí Linh hills & Sao Đỏ campus architectural silhouettes peeking around the frame */}
      <g>
        {/* Far rolling hills across the mid-lower horizon */}
        <path
          d="M-20 518 Q95 472 230 504 T510 478 Q605 462 700 494 L700 760 L-20 760 Z"
          fill={`url(#${id}-hill-far)`}
        />
        {/* Nearer courtyard hill & warm terracotta ground wash */}
        <path
          d="M-20 584 Q105 542 240 572 T500 548 Q600 534 700 568 L700 840 L-20 840 Z"
          fill={`url(#${id}-hill-near)`}
        />

        {/* Left peeking campus wing (visible in the left margin at x=0..82, y=455..595) */}
        <g opacity="0.76">
          <circle cx="22" cy="468" r="26" fill="#5D965B" opacity="0.48" />
          <circle cx="52" cy="476" r="22" fill="#487D47" opacity="0.44" />
          <rect x="-10" y="488" width="78" height="88" rx="3" fill="#F6DEC9" stroke="#D49B7E" strokeWidth="1.2" />
          <polygon points="-18,490 30,456 76,490" fill="#D96B4E" />
          <line x1="-14" y1="490" x2="74" y2="490" stroke="#A8422B" strokeWidth="2.2" />
          {[4, 24, 44].map((wx) => (
            <g key={wx}>
              <path
                d={`M${wx} 522 L${wx} 503 A6 6 0 0 1 ${wx + 12} 503 L${wx + 12} 522 Z`}
                fill="#CE8A67"
              />
              <path
                d={`M${wx} 556 L${wx} 536 A6 6 0 0 1 ${wx + 12} 536 L${wx + 12} 556 Z`}
                fill="#CE8A67"
              />
            </g>
          ))}
          <line x1="72" y1="518" x2="72" y2="578" stroke="#9E5E44" strokeWidth="2" />
          <circle cx="72" cy="514" r="5" fill="#FFE899" stroke="#9E5E44" strokeWidth="1.2" />
          <path d="M-12 578 L82 578" stroke="#D49B7E" strokeWidth="2" />
        </g>

        {/* Right peeking campus wing & clock gable (visible in the right margin at x=580..680, y=375..510) */}
        <g opacity="0.76">
          <circle cx="604" cy="396" r="24" fill="#5D965B" opacity="0.45" />
          <circle cx="658" cy="392" r="28" fill="#487D47" opacity="0.42" />
          <rect x="588" y="412" width="102" height="92" rx="3" fill="#F6DEC9" stroke="#D49B7E" strokeWidth="1.2" />
          <polygon points="578,414 638,376 698,414" fill="#D96B4E" />
          <line x1="580" y1="414" x2="696" y2="414" stroke="#A8422B" strokeWidth="2.2" />
          <circle cx="638" cy="398" r="7.5" fill="#FFF9F0" stroke="#A8422B" strokeWidth="1.4" />
          <line x1="638" y1="398" x2="638" y2="393" stroke="#A8422B" strokeWidth="1.2" />
          <line x1="638" y1="398" x2="642" y2="398" stroke="#A8422B" strokeWidth="1.2" />
          {[598, 620, 642, 664].map((wx) => (
            <g key={wx}>
              <path
                d={`M${wx} 448 L${wx} 428 A6 6 0 0 1 ${wx + 12} 428 L${wx + 12} 448 Z`}
                fill="#CE8A67"
              />
              <path
                d={`M${wx} 482 L${wx} 462 A6 6 0 0 1 ${wx + 12} 462 L${wx + 12} 482 Z`}
                fill="#CE8A67"
              />
            </g>
          ))}
        </g>

        {/* Bottom-right courtyard walkway & petal shadow */}
        <path
          d="M320 882 Q495 848 680 874"
          fill="none"
          stroke="#DFA98C"
          strokeWidth="1.6"
          strokeDasharray="7 6"
          opacity="0.68"
        />
        <ellipse cx="595" cy="878" rx="145" ry="20" fill="#B52B22" opacity="0.1" />
      </g>

      {/* 4. Soft readability veils behind top-left brand lockup & bottom-left greeting */}
      <rect width="680" height="920" fill={`url(#${id}-text-veil-top)`} />
      <rect width="680" height="920" fill={`url(#${id}-text-veil-bottom)`} />

      {/* 5. WEEPING FLORAL WILLOW VINES (CÁC DÂY HOA LIỄU RỦ MỀM Ở RÌA KHUNG) */}
      <g className="sd-tree-gust">
        {/* Soft upper-edge bough & anchor blossom clusters */}
        <g fill={`url(#${id}-bark)`} opacity="0.88">
          <path d="M696 52 C618 22 518 6 352 -6 L358 -16 C524 -4 624 10 702 38 Z" />
          <path d="M-18 192 C4 170 24 156 44 146 L38 138 C16 148 -4 162 -26 184 Z" />
        </g>

        <g className="sd-canopy-mid">
          {anchorBouquets.map((b, i) => (
            <use key={`anc-${i}`} href={`#${id}-bq-${b.palette}-${b.shape}`} transform={place(b)} />
          ))}
        </g>

        {/* Pendulous swaying willow-flower garlands */}
        {willowStrands.map((strand, sIdx) => {
          const d = `M${strand.p0[0]} ${strand.p0[1]} C${strand.p1[0]} ${strand.p1[1]} ${strand.p2[0]} ${strand.p2[1]} ${strand.p3[0]} ${strand.p3[1]}`;
          const tip = cubicPoint(strand.p0, strand.p1, strand.p2, strand.p3, 1);
          return (
            <g
              key={`ws-${sIdx}`}
              className="sd-willow-strand"
              style={
                {
                  transformOrigin: `${strand.p0[0]}px ${strand.p0[1]}px`,
                  "--willow-dur": `${strand.dur}s`,
                  "--willow-delay": `${strand.delay}s`,
                } as CSSProperties
              }
            >
              {/* Main slender weeping stem */}
              <path
                d={d}
                fill="none"
                stroke="#3E6B38"
                strokeWidth={r(1.7 * strand.scale)}
                strokeLinecap="round"
                opacity="0.88"
              />
              <path
                d={d}
                fill="none"
                stroke="#7AB864"
                strokeWidth={r(0.75 * strand.scale)}
                strokeLinecap="round"
                opacity="0.55"
              />

              {/* Willow-lancet leaf pairs & floral nodes strung along the curve */}
              {Array.from({ length: strand.nodes }, (_, nIdx) => {
                const t = (nIdx + 1) / (strand.nodes + 1);
                const pt = cubicPoint(strand.p0, strand.p1, strand.p2, strand.p3, t);
                const taper = (0.72 + 0.42 * Math.sin(t * Math.PI)) * strand.scale;
                const isBloom = (nIdx + strand.bloomOffset) % strand.bloomEvery === 0;
                const isHero = isBloom && (nIdx + sIdx) % 4 === 0;
                return (
                  <g key={`nd-${nIdx}`} transform={`translate(${pt.x} ${pt.y})`}>
                    {/* Willow leaf pair aligned with the downward tangent */}
                    <use
                      href={`#${id}-willow-node-${nIdx % 2 === 0 ? "a" : "b"}`}
                      transform={`rotate(${r(pt.angle - 90)}) scale(${r(taper)})`}
                    />
                    {/* Blossom or coral-gold bud cluster */}
                    {isBloom ? (
                      <use
                        href={`#${id}-${isHero ? "hero-bloom" : "garland-bloom"}`}
                        transform={`rotate(${r((nIdx * 47 + sIdx * 31) % 360)}) scale(${r(taper * (isHero ? 0.68 : 0.62))})`}
                      />
                    ) : (
                      <circle
                        cx={nIdx % 2 === 0 ? -4.5 : 4.5}
                        cy="1.5"
                        r={r(2.1 * taper)}
                        fill={nIdx % 3 === 0 ? "#FF6B35" : "#FFD166"}
                      />
                    )}
                  </g>
                );
              })}

              {/* Pendant floral tassel at the tip of the strand */}
              <use
                href={`#${id}-vine-tassel`}
                transform={`translate(${tip.x} ${tip.y}) rotate(${r(tip.angle - 90)}) scale(${r(strand.scale * 0.88)})`}
              />
            </g>
          );
        })}

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

      {/* Fallen red-and-gold petals on the lower-right courtyard ground */}
      {courtyardPetals.map((petal, index) => (
        <path
          key={`cp-${index}`}
          d={clawedPetalPath}
          transform={`translate(${petal.x} ${petal.y}) rotate(${petal.turn}) scale(${petal.scale} ${r(petal.scale * 0.62)})`}
          fill={petal.fill}
          opacity="0.86"
        />
      ))}
    </svg>
  );
}

