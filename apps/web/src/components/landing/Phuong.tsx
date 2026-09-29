// Red flamboyant (hoa phượng) motif: tree illustration, flower glyph, divider.
// Everything is generated from a seeded random source so server and client
// render the same SVG.

import type { CSSProperties } from "react";

const petalPath = "M0 0C-5 -4 -7 -12 0 -17C7 -12 5 -4 0 0Z";

function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Five-petal flamboyant flower; the upper petal is paler, like the real bloom. */
export function PhuongFlower({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="-20 -20 40 40" aria-hidden="true">
      {[0, 72, 144, 216, 288].map((angle, index) => (
        <path key={angle} d={petalPath} transform={`rotate(${angle})`} fill={index === 0 ? "#FFB347" : index % 2 ? "#E63946" : "#FF6B4A"} />
      ))}
      <circle r="3.2" fill="#F4B942" />
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

const bloomColors = ["#D8261E", "#EC3A1F", "#FF5A26", "#C21D1D", "#FF7A33"];

// Blossom tones, back to front: shadowed underside, sunlit body, bright crown.
const tones = {
  dark: ["#8C1515", "#A11B1B", "#B3221E"],
  mid: ["#CC231E", "#DD2F1E", "#E8401F"],
  light: ["#F2471F", "#FF5A26", "#FF7432"],
  green: ["#2E7D32", "#3B8F3F", "#4CA64C"],
} as const;
type Tone = keyof typeof tones;
type Shape = "a" | "b";

// Two reusable blossom clumps: overlapping round heads, shaded by index into a tone.
const clumpParts = Object.fromEntries(
  (["a", "b"] as const).map((shape, n) => {
    const rand = seeded(7 + n * 12);
    return [
      shape,
      Array.from({ length: 18 }, (_, index) => {
        const angle = rand() * Math.PI * 2;
        const dist = index === 0 ? 0 : 6 + rand() * 20;
        const r = (v: number) => Math.round(v * 10) / 10;
        return { x: r(Math.cos(angle) * dist), y: r(Math.sin(angle) * dist * 0.8), size: r(4.5 + rand() * 5), shade: Math.floor(rand() * 3) };
      }),
    ];
  }),
) as Record<Shape, { x: number; y: number; size: number; shade: number }[]>;

// Pinnate leaf: leaflet pairs along a midrib that arcs out and droops, like M0 0Q10 -28 4 -56.
const leaflets = Array.from({ length: 13 }, (_, index) => {
  const t = (index + 1) / 14;
  const r = (v: number) => Math.round(v * 10) / 10;
  return { x: r(2 * (1 - t) * t * 10 + t * t * 4), y: r(2 * (1 - t) * t * -28 + t * t * -56), size: r(4.6 - t * 2) };
});

/** Broad, domed flamboyant tree in full bloom, after a real phượng: thick trunk, fanned limbs, red crown. */
export function PhuongTree({ className, id = "phuong" }: { className?: string; id?: string }) {
  const random = seeded(1969);
  // One decimal is plenty at this size and keeps the inline SVG small.
  const r = (n: number) => Math.round(n * 10) / 10;
  const between = (min: number, max: number) => r(min + random() * (max - min));
  const pick = <T,>(items: readonly T[]) => items[Math.floor(random() * items.length)]!;

  // Crown: a wide dome, fuller above the centre line than below it.
  const inCrown = (x: number, y: number) => {
    const dx = (x - 300) / 238;
    const dy = (y - 225) / (y < 225 ? 135 : 95);
    return dx * dx + dy * dy < 1;
  };
  const spot = (minY: number, maxY: number) => {
    for (;;) {
      const x = between(60, 540);
      const y = between(minY, maxY);
      if (inCrown(x, y)) return { x, y };
    }
  };

  // Limbs grow recursively from the fork and bend back toward vertical, so tips fan into the dome.
  const limbs: { d: string; w: number }[] = [];
  const tips: { x: number; y: number }[] = [];
  const grow = (x: number, y: number, angle: number, length: number, width: number, depth: number) => {
    const bend = between(-0.3, 0.3);
    const ex = x + Math.sin(angle) * length;
    const ey = y - Math.cos(angle) * length;
    const cx = x + Math.sin(angle + bend) * length * 0.55;
    const cy = y - Math.cos(angle + bend) * length * 0.55;
    limbs.push({ d: `M${r(x)} ${r(y)}Q${r(cx)} ${r(cy)} ${r(ex)} ${r(ey)}`, w: r(width) });
    if (depth === 0) {
      tips.push({ x: r(ex), y: r(ey) });
      return;
    }
    const count = depth === 1 ? 3 : 2;
    for (let i = 0; i < count; i++) {
      const spread = (i - (count - 1) / 2) * 0.62;
      grow(ex, ey, angle * 0.82 + spread + between(-0.2, 0.2), length * between(0.62, 0.76), width * 0.64, depth - 1);
    }
  };
  grow(296, 480, -0.9, 96, 28, 4);
  grow(300, 478, -0.08, 92, 25, 4);
  grow(304, 480, 0.85, 96, 28, 4);

  const clump = (tone: Tone, at: { x: number; y: number }, min: number, max: number) => ({
    ...at,
    tone,
    shape: (random() < 0.5 ? "a" : "b") as Shape,
    scale: between(min, max),
    turn: between(0, 360),
  });
  const clumps = [
    ...Array.from({ length: 70 }, () => clump("dark", spot(80, 330), 1.1, 1.6)),
    ...Array.from({ length: 34 }, () => clump("green", spot(140, 325), 0.8, 1.2)),
    ...tips.flatMap((tip) => [clump("mid", tip, 0.8, 1.2), clump("mid", { x: r(tip.x + between(-18, 18)), y: r(tip.y + between(-16, 8)) }, 0.6, 1)]),
    ...Array.from({ length: 36 }, () => clump("mid", spot(90, 280), 0.8, 1.2)),
    ...Array.from({ length: 64 }, () => clump("light", spot(70, 230), 0.55, 0.95)),
  ];
  const back = clumps.filter((c) => c.tone === "dark" || c.tone === "green");
  const front = clumps.filter((c) => c.tone === "mid" || c.tone === "light");
  const blooms = Array.from({ length: 90 }, () => ({ ...spot(72, 250), scale: between(0.32, 0.5), turn: between(0, 72) }));
  // Feathery leaves only peek out at the rim, as in full bloom.
  const fronds = Array.from({ length: 38 }, () => {
    // Sit just inside the rim, lower half mostly, and point outward so the tips peek past the blossoms.
    const angle = between(-0.15, Math.PI + 0.15) * (random() < 0.3 ? -1 : 1);
    const reach = between(0.8, 0.95);
    const x = r(300 + Math.cos(angle) * 238 * reach);
    const y = r(225 + Math.sin(angle) * (angle > 0 ? 95 : 135) * reach);
    const outward = (angle * 180) / Math.PI + 90;
    return { x, y, turn: r(outward + between(-25, 25)), scale: between(0.6, 0.95), dark: random() < 0.5 };
  });
  // Petals leave the lower crown and fall to the ground: a steady trickle, plus a burst blown sideways by each gust.
  const falling = (gust: boolean) => {
    const x = between(90, 510);
    const y = between(240, 320);
    return {
      x,
      y,
      turn: between(0, 360),
      fill: pick(bloomColors),
      style: {
        "--dx": `${gust ? between(110, 230) : between(-40, 40)}px`,
        "--dy": `${r(between(575, 600) - y)}px`,
        "--dur": `${gust ? 12 : between(7, 12)}s`,
        "--delay": `${gust ? -between(0, 0.9) : -between(0, 12)}s`,
        "--spin": `${between(1.2, 2.6)}s`,
      } as CSSProperties,
    };
  };
  const drifting = Array.from({ length: 14 }, () => falling(false));
  const gusting = Array.from({ length: 16 }, () => falling(true));
  const carpet = Array.from({ length: 56 }, () => ({ x: between(110, 500), y: between(580, 606), turn: between(0, 360), fill: pick(bloomColors) }));
  const place = (c: { x: number; y: number; turn: number; scale: number }) => `translate(${c.x} ${c.y}) rotate(${c.turn}) scale(${c.scale})`;

  return (
    <svg className={className} viewBox="0 0 600 620" role="img" aria-label="Minh họa cây phượng đỏ nở rộ, biểu tượng của Hải Phòng">
      <defs>
        {(Object.keys(tones) as Tone[]).flatMap((tone) =>
          (["a", "b"] as const).map((shape) => (
            <g key={`${tone}-${shape}`} id={`${id}-${tone}-${shape}`}>
              {clumpParts[shape].map((part, index) => (
                <circle key={index} cx={part.x} cy={part.y} r={part.size} fill={tones[tone][part.shade]} />
              ))}
              {clumpParts[shape].slice(1, 6).map((part, index) => (
                <path key={`p${index}`} d={petalPath} transform={`translate(${r(part.x * 1.25)} ${r(part.y * 1.25)}) rotate(${index * 67}) scale(.45)`} fill={tones[tone][2]} />
              ))}
            </g>
          )),
        )}
        <g id={`${id}-bloom`}>
          {[0, 72, 144, 216, 288].map((angle, petal) => (
            <path key={angle} d={petalPath} transform={`rotate(${angle})`} fill={petal === 0 ? "#FFE3A3" : petal % 2 ? "#FF4B22" : "#FF6A2B"} />
          ))}
          <circle r="2.6" fill="#FFC857" />
        </g>
        {(["#2F8A3A", "#4BAA4F"] as const).map((green, index) => (
          <g key={green} id={`${id}-frond-${index}`} fill={green}>
            <path d="M0 0Q10 -28 4 -56" fill="none" stroke={green} strokeWidth="1.1" />
            {leaflets.map((leaf) => (
              <g key={leaf.y}>
                <ellipse cx={leaf.x - leaf.size} cy={leaf.y} rx={leaf.size} ry="1.1" transform={`rotate(-32 ${leaf.x - leaf.size} ${leaf.y})`} />
                <ellipse cx={leaf.x + leaf.size} cy={leaf.y} rx={leaf.size} ry="1.1" transform={`rotate(32 ${leaf.x + leaf.size} ${leaf.y})`} />
              </g>
            ))}
          </g>
        ))}
        <linearGradient id={`${id}-bark`} x1="0" x2="1">
          <stop offset="0" stopColor="#8A7263" />
          <stop offset=".45" stopColor="#6A5244" />
          <stop offset="1" stopColor="#4A382E" />
        </linearGradient>
      </defs>

      <ellipse cx="300" cy="594" rx="250" ry="20" fill="#C93A2A" opacity=".12" />
      <g className="sd-tree-gust">
        <g className="sd-tree-sway">
          {back.map((c, index) => (
            <use key={`k${index}`} href={`#${id}-${c.tone}-${c.shape}`} transform={place(c)} />
          ))}
          {fronds.map((leaf, index) => (
            <use key={`l${index}`} href={`#${id}-frond-${leaf.dark ? 0 : 1}`} transform={place(leaf)} />
          ))}
          <g fill="none" stroke="#67503F" strokeLinecap="round">
            {limbs.map((limb, index) => (
              <path key={`b${index}`} d={limb.d} strokeWidth={limb.w} />
            ))}
          </g>
          {/* Trunk with flared roots */}
          <path
            d="M246 600C262 592 274 580 278 560C282 530 280 505 283 482L317 482C320 505 318 530 322 560C326 580 338 592 356 600C338 602 322 598 312 592C306 598 294 598 288 592C278 598 262 602 246 600Z"
            fill={`url(#${id}-bark)`}
          />
          <g fill="none" strokeLinecap="round">
            <path d="M288 580C290 550 288 520 292 494" stroke="#A58B7A" strokeWidth="4" opacity=".55" />
            <path d="M304 586C306 556 302 530 306 500" stroke="#3E2F27" strokeWidth="2.5" opacity=".5" />
            <path d="M314 572C314 548 312 532 312 514" stroke="#3E2F27" strokeWidth="2" opacity=".4" />
          </g>
          {front.map((c, index) => (
            <use key={`m${index}`} href={`#${id}-${c.tone}-${c.shape}`} transform={place(c)} />
          ))}
          {blooms.map((b, index) => (
            <use key={`f${index}`} href={`#${id}-bloom`} transform={place(b)} />
          ))}
        </g>
      </g>
      {[...drifting, ...gusting].map((petal, index) => (
        <g key={`d${index}`} className={index < drifting.length ? "sd-fall" : "sd-fall sd-fall-gust"} style={petal.style} aria-hidden="true">
          <g transform={`translate(${petal.x} ${petal.y})`}>
            <g className="sd-fall-spin">
              <path d={petalPath} transform={`rotate(${petal.turn}) scale(.5)`} fill={petal.fill} />
            </g>
          </g>
        </g>
      ))}
      {carpet.map((petal, index) => (
        <path key={`p${index}`} d={petalPath} transform={`translate(${petal.x} ${petal.y}) rotate(${petal.turn}) scale(.55 .4)`} fill={petal.fill} opacity=".9" />
      ))}
    </svg>
  );
}
