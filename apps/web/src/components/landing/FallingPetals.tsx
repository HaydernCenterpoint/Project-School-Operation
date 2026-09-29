// Petals and small leaves drifting down the page gutters. Pure CSS (no JS),
// sits behind the content, never takes pointer events, and is removed under
// prefers-reduced-motion (see landing.css).

type Piece = { side: "left" | "right"; x: number; size: number; fall: number; delay: number; sway: number; spin: number; leaf: boolean };

// Hand-tuned so sizes, speeds and phases never line up.
const pieces: Piece[] = [
  { side: "left", x: 1.5, size: 18, fall: 17, delay: -2, sway: 26, spin: 5.5, leaf: false },
  { side: "left", x: 6.5, size: 12, fall: 22, delay: -11, sway: 18, spin: 7, leaf: true },
  { side: "left", x: 3.5, size: 22, fall: 19, delay: -6, sway: 32, spin: 6.5, leaf: false },
  { side: "left", x: 9, size: 14, fall: 25, delay: -17, sway: 22, spin: 8, leaf: false },
  { side: "left", x: 5, size: 10, fall: 21, delay: -14, sway: 16, spin: 6, leaf: true },
  { side: "left", x: 2.5, size: 16, fall: 28, delay: -22, sway: 28, spin: 9, leaf: false },
  { side: "left", x: 8, size: 20, fall: 18, delay: -8.5, sway: 24, spin: 5, leaf: false },
  { side: "right", x: 2, size: 20, fall: 18, delay: -4, sway: 30, spin: 6, leaf: false },
  { side: "right", x: 7, size: 12, fall: 24, delay: -13, sway: 20, spin: 7.5, leaf: true },
  { side: "right", x: 4, size: 16, fall: 20, delay: -9, sway: 26, spin: 5.8, leaf: false },
  { side: "right", x: 9.5, size: 22, fall: 26, delay: -19, sway: 34, spin: 8.5, leaf: false },
  { side: "right", x: 5.5, size: 11, fall: 22, delay: -1, sway: 18, spin: 6.8, leaf: true },
  { side: "right", x: 1, size: 14, fall: 29, delay: -24, sway: 22, spin: 9.5, leaf: false },
  { side: "right", x: 8, size: 18, fall: 17, delay: -15, sway: 28, spin: 5.2, leaf: false },
];

export function FallingPetals() {
  return (
    <div className="sd-petals" aria-hidden="true">
      {pieces.map((piece, index) => (
        <span
          key={index}
          className={`sd-petal${index % 3 === 2 ? " sd-petal-extra" : ""}`}
          style={
            {
              [piece.side]: `${piece.x}vw`,
              "--fall": `${piece.fall}s`,
              "--delay": `${piece.delay}s`,
              "--sway": `${piece.sway}px`,
              "--spin": `${piece.spin}s`,
            } as React.CSSProperties
          }
        >
          <svg width={piece.size} height={piece.size} viewBox="-12 -20 24 24">
            {piece.leaf ? (
              <>
                <path d="M0 2C-6 -4 -6 -13 0 -18C6 -13 6 -4 0 2Z" fill="#3DB36B" />
                <path d="M0 1V-16" stroke="#237A46" strokeWidth="1" />
              </>
            ) : (
              <path d="M0 2C-8 -3 -9 -13 0 -18C9 -13 8 -3 0 2Z" fill={index % 2 ? "#FF6B4A" : "#E63946"} />
            )}
          </svg>
        </span>
      ))}
    </div>
  );
}
