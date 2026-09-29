import { type ReactNode } from "react";

// A small LaTeX-to-React renderer for the formulas a study assistant writes: fractions, roots,
// powers and indices, Greek letters, relations and common symbols. It builds React elements
// only (no HTML strings), and anything outside this subset (matrices, cases, accents...) is
// shown as the original TeX in a code style instead of breaking the layout.

const symbols: Record<string, string> = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", varepsilon: "ε", zeta: "ζ", eta: "η", theta: "θ", vartheta: "ϑ",
  iota: "ι", kappa: "κ", lambda: "λ", mu: "μ", nu: "ν", xi: "ξ", pi: "π", rho: "ρ", sigma: "σ", tau: "τ", upsilon: "υ",
  phi: "φ", varphi: "φ", chi: "χ", psi: "ψ", omega: "ω", Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Xi: "Ξ",
  Pi: "Π", Sigma: "Σ", Phi: "Φ", Psi: "Ψ", Omega: "Ω",
  times: "×", cdot: "·", div: "÷", pm: "±", mp: "∓", ast: "∗", star: "⋆", circ: "∘", bullet: "•", oplus: "⊕", otimes: "⊗",
  leq: "≤", le: "≤", geq: "≥", ge: "≥", neq: "≠", ne: "≠", approx: "≈", equiv: "≡", sim: "∼", propto: "∝", ll: "≪", gg: "≫",
  to: "→", rightarrow: "→", leftarrow: "←", leftrightarrow: "↔", Rightarrow: "⇒", Leftarrow: "⇐", Leftrightarrow: "⇔",
  implies: "⟹", impliedby: "⟸", iff: "⟺", mapsto: "↦", uparrow: "↑", downarrow: "↓",
  infty: "∞", partial: "∂", nabla: "∇", forall: "∀", exists: "∃", nexists: "∄", emptyset: "∅", varnothing: "∅",
  in: "∈", notin: "∉", ni: "∋", subset: "⊂", subseteq: "⊆", supset: "⊃", supseteq: "⊇", cup: "∪", cap: "∩", setminus: "∖",
  land: "∧", wedge: "∧", lor: "∨", vee: "∨", neg: "¬", lnot: "¬",
  sum: "∑", prod: "∏", int: "∫", oint: "∮", angle: "∠", perp: "⊥", parallel: "∥", degree: "°", prime: "′",
  ldots: "…", dots: "…", cdots: "⋯", vdots: "⋮", therefore: "∴", because: "∵", hbar: "ℏ", ell: "ℓ", aleph: "ℵ",
  langle: "⟨", rangle: "⟩", lfloor: "⌊", rfloor: "⌋", lceil: "⌈", rceil: "⌉", mid: "∣", vert: "|", Vert: "‖",
  lbrace: "{", rbrace: "}", lbrack: "[", rbrack: "]",
};
/** Relations and arrows get a little air around them. */
const relations = new Set(["leq", "le", "geq", "ge", "neq", "ne", "approx", "equiv", "sim", "propto", "to", "rightarrow", "leftarrow", "leftrightarrow", "Rightarrow", "Leftarrow", "Leftrightarrow", "implies", "impliedby", "iff", "mapsto", "in", "notin", "subset", "subseteq", "supset", "supseteq"]);
const functions = new Set(["sin", "cos", "tan", "cot", "sec", "csc", "log", "ln", "lg", "exp", "lim", "max", "min", "sup", "inf", "gcd", "lcm", "det", "deg", "arg", "mod", "sinh", "cosh", "tanh", "arcsin", "arccos", "arctan"]);
const spaces: Record<string, string> = { ",": " ", ";": " ", ":": " ", "!": "", " ": " ", quad: " ", qquad: "  " };
const literal = new Set(["%", "$", "&", "#", "_", "{", "}"]);
const upright = new Set(["text", "mathrm", "textrm", "operatorname", "mathsf", "textnormal"]);
const bold = new Set(["mathbf", "textbf", "boldsymbol", "bm"]);

class Unsupported extends Error {}

function parse(src: string): ReactNode {
  let i = 0;
  let key = 0;
  const nextKey = () => key++;
  const isLetter = (ch: string | undefined) => ch !== undefined && /[A-Za-z]/.test(ch);
  const skipSpaces = () => {
    while (src[i] === " " || src[i] === "\n") i += 1;
  };

  /** One argument: a braced group or a single token. */
  function argument(): ReactNode {
    skipSpaces();
    if (src[i] === "{") {
      i += 1;
      const inner = sequence("}");
      if (src[i] !== "}") throw new Unsupported();
      i += 1;
      return inner;
    }
    if (i >= src.length) throw new Unsupported();
    const item = atom();
    return item.letter ? <i key={nextKey()}>{item.letter}</i> : item.node;
  }

  /** Raw text between balanced braces, for \text{...}. */
  function rawGroup(): string {
    skipSpaces();
    if (src[i] !== "{") throw new Unsupported();
    let depth = 0;
    const start = i + 1;
    for (; i < src.length; i += 1) {
      if (src[i] === "{") depth += 1;
      else if (src[i] === "}") {
        depth -= 1;
        if (depth === 0) {
          const text = src.slice(start, i);
          i += 1;
          return text;
        }
      }
    }
    throw new Unsupported();
  }

  function command(): { node: ReactNode; letter?: string } {
    let name = "";
    if (isLetter(src[i])) {
      while (isLetter(src[i])) name += src[i++];
    } else {
      name = src[i++] ?? "";
    }
    if (!name) throw new Unsupported();

    if (name === "frac" || name === "dfrac" || name === "tfrac") {
      const top = argument();
      const bottom = argument();
      return { node: <span key={nextKey()} className="tx-frac"><span>{top}</span><span>{bottom}</span></span> };
    }
    if (name === "sqrt") {
      let index: string | null = null;
      skipSpaces();
      if (src[i] === "[") {
        const end = src.indexOf("]", i);
        if (end < 0) throw new Unsupported();
        index = src.slice(i + 1, end);
        i = end + 1;
      }
      const inner = argument();
      return {
        node: (
          <span key={nextKey()} className="tx-sqrt">
            {index && <sup className="tx-root-index">{index}</sup>}
            <span className="tx-radical">√</span>
            <span className="tx-radicand">{inner}</span>
          </span>
        ),
      };
    }
    if (name === "overline" || name === "bar") return { node: <span key={nextKey()} className="tx-over">{argument()}</span> };
    if (upright.has(name)) return { node: <span key={nextKey()} className="tx-text">{rawGroup()}</span> };
    if (bold.has(name)) return { node: <b key={nextKey()}>{argument()}</b> };
    if (name === "mathbb" || name === "mathcal" || name === "mathit") return { node: <span key={nextKey()}>{argument()}</span> };
    if (name === "left" || name === "right") {
      skipSpaces();
      const next = src[i++];
      if (next === ".") return { node: "" };
      if (next === "\\") return command();
      return { node: next ?? "" };
    }
    if (name in symbols) {
      const glyph = symbols[name]!;
      return { node: relations.has(name) ? ` ${glyph} ` : glyph };
    }
    if (functions.has(name)) return { node: <span key={nextKey()} className="tx-text">{name}</span> };
    if (name in spaces) return { node: spaces[name]! };
    if (literal.has(name)) return { node: name };
    if (name === "|") return { node: "‖" };
    if (name === "\\") return { node: <br key={nextKey()} /> };
    // \begin, \end, \vec, \hat, \binom, \over ...: outside the supported subset.
    throw new Unsupported();
  }

  function atom(): { node: ReactNode; letter?: string } {
    const ch = src[i++]!;
    if (ch === "{") {
      const inner = sequence("}");
      if (src[i] !== "}") throw new Unsupported();
      i += 1;
      return { node: <span key={nextKey()}>{inner}</span> };
    }
    if (ch === "\\") return command();
    if (isLetter(ch)) return { node: null, letter: ch };
    if (ch === "-") return { node: " − " };
    if (ch === "+") return { node: " + " };
    if (ch === "=" || ch === "<" || ch === ">") return { node: ` ${ch} ` };
    if (ch === "'") return { node: "′" };
    if (ch === "*") return { node: "∗" };
    return { node: ch };
  }

  /** Trailing ^ and _ (in either order) for the atom just read. */
  function scripts(): { sup?: ReactNode; sub?: ReactNode } {
    const found: { sup?: ReactNode; sub?: ReactNode } = {};
    for (;;) {
      skipSpaces();
      if (src[i] === "^" && found.sup === undefined) {
        i += 1;
        found.sup = argument();
      } else if (src[i] === "_" && found.sub === undefined) {
        i += 1;
        found.sub = argument();
      } else return found;
    }
  }

  function sequence(stop?: string): ReactNode[] {
    const out: ReactNode[] = [];
    let letters = "";
    const flush = () => {
      if (letters) out.push(<i key={nextKey()}>{letters}</i>);
      letters = "";
    };
    while (i < src.length) {
      const ch = src[i]!;
      if (stop && ch === stop) break;
      if (ch === "}") throw new Unsupported();
      if (ch === " " || ch === "\n") {
        i += 1;
        continue;
      }
      // A script with nothing before it applies to an empty base.
      const item = ch === "^" || ch === "_" ? { node: "" as ReactNode } : atom();
      const { sup, sub } = scripts();
      if (item.letter && sup === undefined && sub === undefined) {
        letters += item.letter;
        continue;
      }
      flush();
      const base = item.letter ? <i key={nextKey()}>{item.letter}</i> : item.node;
      if (sup === undefined && sub === undefined) {
        out.push(base);
      } else if (sup !== undefined && sub !== undefined) {
        out.push(
          <span key={nextKey()} className="tx-with-scripts">
            {base}
            <span className="tx-stack"><sup>{sup}</sup><sub>{sub}</sub></span>
          </span>,
        );
      } else {
        out.push(
          <span key={nextKey()} className="tx-with-scripts">
            {base}
            {sup !== undefined ? <sup>{sup}</sup> : <sub>{sub}</sub>}
          </span>,
        );
      }
    }
    flush();
    return out;
  }

  const result = sequence();
  if (i < src.length) throw new Unsupported();
  return result;
}

export function Tex({ source, display = false }: { source: string; display?: boolean }) {
  const text = source.trim();
  if (!text) return null;
  let parsed: ReactNode | null = null;
  try {
    parsed = parse(text);
  } catch {
    // Outside the supported subset: show the source instead.
  }
  if (parsed === null) return <code className="tx-raw">{text}</code>;
  return <span className={display ? "tx tx-display" : "tx"} role="math" aria-label={text}>{parsed}</span>;
}
