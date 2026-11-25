// Practice: Fractions before grade 6, the staged way in to `fractions`. Fractions with the same bottom added and taken
// away on bars, and a division written as a fraction (3 ÷ 4 = 3/4, three wholes shared among four); then different
// bottoms, mixed numbers and a fraction of a whole number (2/3 of 12 on rows of counters); then a unit fraction
// divided by a whole number (shared) and a whole number by a unit fraction (how many fit), each also as a story. Tops
// and bottoms added or taken away, the division read the wrong way round, the wholes left out, one part of the number
// taken for all of them, and dividing done as multiplying are the slips.
import { fill } from "../chart";
import { fr, num, plainFrac } from "../practiceKit";
import type { MistakeId } from "../mistakes";
import type { Gen, Part, Trap } from "../practiceTypes";

type F = { n: number; d: number };
/** A fraction as typed, 3/4, or a whole number, 3. */
const txt = (f: F) => (f.d === 1 ? String(f.n) : `${f.n}/${f.d}`);
const ftex = (f: F) => (f.d === 1 ? String(f.n) : `\\frac{${f.n}}{${f.d}}`);
/** A mixed number as typed (2 1/3) and in TeX. */
const mixTxt = (w: number, f: F) => `${w} ${f.n}/${f.d}`;
const mixTex = (w: number, f: F) => `${w}\\frac{${f.n}}{${f.d}}`;

const gen: Gen = (r, L, w) => {
  const W = w.fracSums;
  /** A number from lo to hi that shares no factor with b, so a/b is already in lowest terms. */
  /** A proper fraction over d already in lowest terms (2/3, never 3/9). */
  const part = (d: number): F => ({ n: coprime(d, 1, d - 1), d });
  const coprime = (b: number, lo: number, hi: number) => r.pick(Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter((a) => a !== b && gcd(a, b) === 1));
  /** The answer v as a fraction in lowest terms (6/8 is sent back for 3/4), or a whole number. */
  const out = (q: string, v: F, more: { traps?: Trap[]; prompt?: string; solution: Part["solution"] }): Part => {
    const f = fr(v.n, v.d);
    return { prompt: more.prompt ?? w.prompts.fractions, q, answer: { ...num(v.n / v.d, 1e-9, { lowest: true }), traps: more.traps ?? [] }, show: f.tex(), plain: plainFrac(f), format: "fraction", solution: more.solution };
  };
  /** The slips whose answers differ from the right one and from each other. */
  const slips = (v: number, list: [MistakeId, number | null, Record<string, string | number>][]): Trap[] => {
    const seen = new Set([v]);
    return list.flatMap(([id, x, vars]) => {
      if (x === null || !Number.isFinite(x) || x <= 0 || [...seen].some((s) => Math.abs(s - x) < 1e-9)) return [];
      seen.add(x);
      return [{ id, a: num(x), vars }];
    });
  };
  const model = (op: "+" | "-" | "×" | "÷", a: string, b: string, pic?: "share" | "of") => ({ kind: "model" as const, spec: { type: "fracop", op, a, b, step: 99, ...(pic ? { pic } : {}) } });

  /** a ± b, worked on bars cut into the common pieces. Tops and bottoms added, or taken away, are the slips. */
  const sum = (a: F, b: F, plus: boolean) => {
    const v = plus ? { n: a.n * b.d + b.n * a.d, d: a.d * b.d } : { n: a.n * b.d - b.n * a.d, d: a.d * b.d };
    const L = (a.d * b.d) / gcd(a.d, b.d);
    const work = `${(a.n * L) / a.d}/${L} ${plus ? "+" : "−"} ${(b.n * L) / b.d}/${L}`;
    const big = a.n / a.d > b.n / b.d ? a : b;
    const traps = slips(v.n / v.d, [
      ["addAcross", plus ? (a.n + b.n) / (a.d + b.d) : null, { r: `${a.n + b.n}/${a.d + b.d}`, big: txt(big) }],
      ["subtractedAcross", !plus && a.d > b.d && a.n > b.n ? (a.n - b.n) / (a.d - b.d) : null, { x: `${a.n - b.n}/${a.d - b.d}`, work, v: plainFrac(fr(v.n, v.d)) }],
    ]);
    return out(`${ftex(a)} ${plus ? "+" : "-"} ${ftex(b)}`, v, { traps, solution: model(plus ? "+" : "-", txt(a), txt(b)) });
  };
  /** a ÷ b written as a fraction: a shared among b. b/a is the slip. */
  const asDivision = (a: number, b: number, prompt = W.asFraction, q = `${a} \\div ${b}`) => {
    const traps = slips(a / b, [["quotientFlipped", b / a, { a, b, v: `${a}/${b}`, x: plainFrac(fr(b, a)) }]]);
    return out(q, { n: a, d: b }, { prompt, traps, solution: model("÷", String(a), String(b), "share") });
  };
  /** a ÷ b with one of them a unit fraction. a × b is the slip. */
  const divide = (a: F, b: F, prompt?: string, q?: string) => {
    const v = { n: a.n * b.d, d: a.d * b.n };
    const x = (a.n * b.n) / (a.d * b.d);
    const vars = { a: txt(a), b: txt(b), v: plainFrac(fr(v.n, v.d)), x: plainFrac(fr(a.n * b.n, a.d * b.d)) };
    const traps = slips(v.n / v.d, [["dividedAsTimes", x, vars]]);
    return out(q ?? `${ftex(a)} \\div ${ftex(b)}`, v, { prompt, traps, solution: model("÷", txt(a), txt(b), b.d === 1 ? "share" : undefined) });
  };

  if (L === 1) {
    const kind = r.int(0, 2);
    if (kind === 2) {
      // 3 ÷ 4, and now and then more than one each: 5 ÷ 3.
      const b = r.int(2, 9);
      // Less than one each (3 ÷ 4), now and then more (5 ÷ 3); one whole shared only when the bottom is 2.
      const less = r.next() < 0.75;
      return asDivision(less ? coprime(b, b > 2 ? 2 : 1, b - 1) : coprime(b, b + 1, 2 * b - 1), b);
    }
    const d = r.int(3, 12);
    const plus = kind === 0;
    // Two different tops over the same bottom, each fraction in lowest terms; the larger first when taking away.
    const x = part(d);
    let y = part(d);
    for (let i = 0; i < 9 && y.n === x.n; i++) y = part(d);
    if (y.n === x.n) return sum(x, x, true);
    return plus ? sum(x, y, true) : sum(x.n > y.n ? x : y, x.n > y.n ? y : x, false);
  }
  if (L === 2) {
    const kind = r.int(0, 2);
    if (kind === 0) {
      // Different bottoms: one a multiple of the other (1/2 and 3/8), or two that share nothing (2/3 and 1/4).
      const [d1, d2] = r.next() < 0.5 ? (() => { const d = r.int(2, 5); return [d * r.int(2, 3), d]; })() : r.pick([[3, 2], [4, 3], [5, 2], [5, 3], [5, 4], [6, 5]]);
      const [a, b] = [part(d1), part(d2)];
      const plus = r.next() < 0.5 || a.n / a.d === b.n / b.d;
      if (plus) return sum(a, b, true);
      return a.n / a.d > b.n / b.d ? sum(a, b, false) : sum(b, a, false);
    }
    if (kind === 1) {
      // Mixed numbers with the same or a related bottom, added or taken away (the larger first).
      const d = r.int(2, 6);
      const d2 = r.next() < 0.5 ? d : d * 2;
      const [fa, fb] = [part(d2), part(d)];
      const [wa, wb] = [r.int(2, 5), r.int(1, 3)];
      const plus = r.next() < 0.5 || wa <= wb;
      const A = { n: wa * fa.d + fa.n, d: fa.d };
      const B = { n: wb * fb.d + fb.n, d: fb.d };
      const v = plus ? A.n / A.d + B.n / B.d : A.n / A.d - B.n / B.d;
      const wholes = plus ? wa + wb : wa - wb;
      const vf = fr(plus ? A.n * B.d + B.n * A.d : A.n * B.d - B.n * A.d, A.d * B.d);
      const traps = slips(v, [["wholesLeftOut", v - wholes, { wa, wb, op: plus ? "+" : "−", w: wholes, v: plainFrac(vf), x: plainFrac(fr(Math.round((v - wholes) * A.d * B.d), A.d * B.d)) }]]);
      return out(`${mixTex(wa, fa)} ${plus ? "+" : "-"} ${mixTex(wb, fb)}`, { n: vf.n, d: vf.d }, { traps, solution: model(plus ? "+" : "-", mixTxt(wa, fa), mixTxt(wb, fb)) });
    }
    // A fraction of a whole number: 2/3 of 12, worked on rows of counters.
    const d = r.int(2, 6);
    // Mostly more than one part (2/3 of 12), where taking one part for all of them can happen.
    const n = d > 2 && r.next() < 0.7 ? coprime(d, 2, d - 1) : 1;
    const N = d * r.int(2, 8);
    const traps = slips((n * N) / d, [["onlyOnePart", n > 1 ? N / d : null, { n: N, d, k: n, x: N / d, v: (n * N) / d }]]);
    return out("", { n: n * N, d }, { prompt: fill(W.of, { f: `${n}/${d}`, n: N }), traps, solution: model("×", `${n}/${d}`, String(N), "of") });
  }
  const kind = r.int(0, 2);
  const d = r.int(2, 6);
  if (kind === 0) return divide({ n: 1, d }, { n: r.int(2, 6), d: 1 });
  if (kind === 1) return divide({ n: r.int(2, 9), d: 1 }, { n: 1, d });
  // Stories: a piece of cake shared, servings of rice, pizzas shared.
  const story = r.int(0, 2);
  if (story === 0) {
    const n = r.int(2, 5);
    return divide({ n: 1, d }, { n, d: 1 }, fill(W.cake, { f: `1/${d}`, n }), "");
  }
  if (story === 1) {
    const N = r.int(2, 6);
    return divide({ n: N, d: 1 }, { n: 1, d }, fill(W.servings, { f: `1/${d}`, n: N }), "");
  }
  const b = r.int(3, 8);
  const a = coprime(b, 2, b + 3);
  return asDivision(a, b, fill(W.pizzas, { a, b }), "");
};

function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : a;
}

export default gen;
