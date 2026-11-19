// Two AoPS Introduction to Geometry chapters as practice. Ch. 10, geometric inequalities (`triangleInequality`): which
// three lengths make a triangle (easy); the third side's range as an inequality, or how many whole lengths it can be
// (medium); an isosceles triangle's perimeter when only one of the two ways closes, and the largest angle, opposite the
// longest side (hard). Ch. 13, power of a point (`powerPoint`): two crossing chords (easy), two secants from a point
// (medium), a tangent and a secant (hard), every figure drawn by the circle theorems tool. The usual slips are the
// traps: two sides that add up to exactly the third, the short end of the range left out, the isosceles triangle that
// can't close, the angle beside the longest side, chord parts added, a secant's inside part used for the whole, the
// whole secant given for its inside part, and PT² given for PT.
type Next = () => number;
const intOf = (next: Next) => (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
const shuffled = <T>(next: Next, xs: T[]) => {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export type SidesMistake = "flatTriangle" | "noLowerBound" | "boundary" | "isoscelesImpossible" | "besideNotOpposite";
export type SecantMistake = "chordsAdded" | "secantChordOnly" | "wholeSecant" | "tangentNotRooted";
export const LETTERS = ["A", "B", "C", "D"] as const;

/** The prompts of the triangle inequality questions (the locale's `triangleSides` block). */
export type TriangleSidesWords = { pick: string; range: string; count: string; isosceles: string; largest: string };

/** The third side lies strictly between |a − b| and a + b. */
export type Range = { lo: number; hi: number };

export type SidesQuestion =
  | { kind: "pick"; sets: [number, number, number][]; right: number; flat: number; steps: string[] }
  | { kind: "range"; a: number; b: number; range: Range; steps: string[] }
  | { kind: "count" | "isosceles"; vars: Record<string, number>; v: number; trap: { id: SidesMistake; v: number; vars: Record<string, string | number> }; steps: string[] }
  | { kind: "largest"; vars: Record<string, number>; right: number; beside: number[]; longest: string; steps: string[] };

const check = ([a, b, c]: [number, number, number]) => `${a} + ${b} = ${a + b} ${a + b > c ? ">" : a + b === c ? "=" : "<"} ${c}`;

/** Level 1: of four sets of lengths, which makes a triangle: one does, one is flat (a + b = c), two fall short. */
export function pickQuestion(next: Next): SidesQuestion {
  const int = intOf(next);
  const make = (gap: number): [number, number, number] => {
    // a ≤ b < c with a + b − c = gap.
    for (;;) {
      const [a, b] = [int(2, 9), int(3, 12)].sort((x, y) => x - y);
      const c = a + b - gap;
      if (c > b && c <= 20) return [a, b, c];
    }
  };
  const sets = shuffled(next, [make(int(1, 3)), make(0), make(-int(1, 3)), make(-int(2, 5))]);
  const right = sets.findIndex(([a, b, c]) => a + b > c);
  const flat = sets.findIndex(([a, b, c]) => a + b === c);
  return { kind: "pick", sets, right, flat, steps: sets.map((s, i) => `\\text{${LETTERS[i]}: } ${check(s)} \\; ${i === right ? "\\checkmark" : "\\times"}`) };
}

/** Level 2: the third side's range (b − a < x < a + b), or how many whole lengths it can be (2a − 1 for a ≤ b). */
export function rangeQuestion(next: Next): SidesQuestion {
  const int = intOf(next);
  const [a, b] = [int(2, 12), int(3, 18)].sort((x, y) => x - y);
  if (a === b || next() < 0.6) {
    const [p, q] = a === b ? [a, b + int(1, 6)] : [a, b];
    return { kind: "range", a: p, b: q, range: { lo: q - p, hi: p + q }, steps: [`${q} - ${p} < x < ${q} + ${p}`, `${q - p} < x < ${p + q}`] };
  }
  const v = 2 * a - 1;
  return {
    kind: "count",
    vars: { a, b },
    v,
    trap: { id: "boundary", v: v + 2, vars: {} },
    steps: [`${b - a} < x < ${a + b}`, `x = ${b - a + 1}, ${b - a + 2}, \\ldots, ${a + b - 1}`, `${a + b - 1} - ${b - a} = ${v}`],
  };
}

/** Level 3: an isosceles triangle with sides a and b where a, a, b can't close; or the largest angle of a triangle. */
export function hardSidesQuestion(next: Next): SidesQuestion {
  const int = intOf(next);
  if (next() < 0.5) {
    const a = int(2, 9);
    const b = int(2 * a, 2 * a + 8);
    const v = 2 * b + a;
    return {
      kind: "isosceles",
      vars: { a, b },
      v,
      trap: { id: "isoscelesImpossible", v: 2 * a + b, vars: { x: 2 * a + b, a, b, s: 2 * a, v } },
      steps: [`${a} + ${a} = ${2 * a} \\le ${b} \\; \\times`, `${a} + ${b} = ${a + b} > ${b} \\; \\checkmark`, `${b} + ${b} + ${a} = ${v}`],
    };
  }
  for (;;) {
    // BC = a faces A, CA = b faces B, AB = c faces C.
    const [a, b, c] = [int(3, 15), int(3, 15), int(3, 15)];
    if (new Set([a, b, c]).size < 3 || a + b <= c || b + c <= a || a + c <= b) continue;
    const sides = [a, b, c];
    const right = sides.indexOf(Math.max(...sides));
    const longest = ["BC", "CA", "AB"][right];
    // The ends of the longest side: the other two vertices.
    const beside = [0, 1, 2].filter((i) => i !== right);
    // The sides in order, and the angles opposite them in the same order.
    const rank = [0, 1, 2].sort((i, j) => sides[j] - sides[i]);
    const order = [rank.map((i) => `${["BC", "CA", "AB"][i]} = ${sides[i]}`).join(" > "), rank.map((i) => `\\angle ${LETTERS[i]}`).join(" > ")];
    return {
      kind: "largest",
      vars: { a, b, c },
      right,
      beside,
      longest,
      steps: order,
    };
  }
}

// ---------- power of a point ----------

export type SecantQuestion = {
  /** The circle theorems tool's input, ending in find …; its figure is the question's picture. */
  src: string;
  /** What is asked for, and the givens as TeX. */
  ask: string;
  given: string;
  v: number;
  traps: { id: SecantMistake; v: number; vars: Record<string, string | number> }[];
};

const fmt = (v: number) => String(Math.round(v * 100) / 100);
const keep = (v: number, traps: SecantQuestion["traps"]) => traps.filter((t) => Number.isFinite(t.v) && t.v > 0 && Math.abs(t.v - v) > 0.01);
const isSquare = (n: number) => Number.isInteger(Math.sqrt(n));

/** Level 1: two chords crossing at E: AE × EB = CE × ED, for ED. */
export function chordsQuestion(next: Next): SecantQuestion {
  const int = intOf(next);
  for (;;) {
    const [ae, eb, ce] = [int(2, 12), int(2, 12), int(2, 12)];
    const ed = (ae * eb) / ce;
    if (!Number.isInteger(ed) || ce === ae || ce === eb || ed > 30) continue;
    const added = ae + eb - ce;
    return {
      src: `chords; AE = ${ae}; EB = ${eb}; CE = ${ce}`,
      ask: "ED",
      given: `AE = ${ae},\\quad EB = ${eb},\\quad CE = ${ce}`,
      v: ed,
      traps: keep(ed, [{ id: "chordsAdded", v: added, vars: { x: added, v: ed } }]),
    };
  }
}

/** Level 2: two secants from P: PA × PB = PC × PD, for the inside part CD. */
export function secantsQuestion(next: Next): SecantQuestion {
  const int = intOf(next);
  for (;;) {
    const [pa, ab, pc] = [int(2, 8), int(2, 10), int(2, 12)];
    const pd = (pa * (pa + ab)) / pc;
    if (!Number.isInteger(pd) || pd <= pc || pc === pa || pd > 30) continue;
    const cd = pd - pc;
    const inside = (pa * ab) / pc;
    return {
      src: `secants; PA = ${pa}; AB = ${ab}; PC = ${pc}`,
      ask: "CD",
      given: `PA = ${pa},\\quad AB = ${ab},\\quad PC = ${pc}`,
      v: cd,
      traps: keep(cd, [
        { id: "secantChordOnly", v: inside, vars: { x: fmt(inside), f: "PA × PB = PC × PD", v: cd } },
        { id: "wholeSecant", v: pd, vars: { x: pd, w: "PD", o: "PC", v: cd } },
      ]),
    };
  }
}

/** Level 3: a tangent and a secant from P: PT² = PA × PB, for PT, or for the inside part AB. */
export function tangentQuestion(next: Next): SecantQuestion {
  const int = intOf(next);
  for (;;) {
    const [pa, pb] = [int(1, 12), int(3, 32)];
    if (pb <= pa + 1 || !isSquare(pa * pb)) continue;
    const pt = Math.sqrt(pa * pb);
    const ab = pb - pa;
    if (next() < 0.5) {
      const inside = Math.sqrt(pa * ab);
      return {
        src: `secant; PA = ${pa}; AB = ${ab}`,
        ask: "PT",
        given: `PA = ${pa},\\quad AB = ${ab}`,
        v: pt,
        traps: keep(pt, [
          { id: "tangentNotRooted", v: pa * pb, vars: { x: pa * pb, v: pt } },
          { id: "secantChordOnly", v: inside, vars: { x: fmt(inside), f: "PT² = PA × PB", v: pt } },
        ]),
      };
    }
    return {
      src: `secant; PT = ${pt}; PA = ${pa}`,
      ask: "AB",
      given: `PT = ${pt},\\quad PA = ${pa}`,
      v: ab,
      traps: keep(ab, [{ id: "wholeSecant", v: pb, vars: { x: pb, w: "PB", o: "PA", v: ab } }]),
    };
  }
}
