// The helpers the practice generators share: the seeded random numbers, fractions and polynomials written out,
// answers as numbers, matrices and inequalities, and the parts of a question worked in steps. practice.ts and the
// skills build their questions from these.
import type { Rel } from "./algebra";
import { fill } from "./chart";
import { type E, parseE, tex } from "./expr";
import { Frac } from "./fraction";
import type { CompareSign } from "./live";
import { env, type Mat, type MatrixCalcSpec, type MatrixOp } from "./matrix";
import type { NumberTheoryQuestion } from "./numberTheory";
import { sumText } from "./target";
import type { Answer, Bound, Exercise, Part, PracticeWords, Rng, StepForm, Trap } from "./practiceTypes";

/** mulberry32: the same seed gives the same questions. */
export function rngOf(seed: number): Rng {
  let a = seed >>> 0 || 1;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const nz = (lo: number, hi: number) => {
    for (;;) {
      const v = int(lo, hi);
      if (v) return v;
    }
  };
  return { next, int, nz, pick: (a) => a[Math.floor(next() * a.length)], sign: () => (next() < 0.5 ? -1 : 1) };
}

export const gcd = (a: number, b: number): number => {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
};

export const fr = (n: number, d = 1) => new Frac(n, d);

/** A polynomial typed out from its coefficients, highest power first: [c0, c1, c2] → "c2x^2 + c1x + c0". */
export function polyStr(cs: number[], v = "x"): string {
  let out = "";
  for (let k = cs.length - 1; k >= 0; k--) {
    const c = cs[k];
    if (!c) continue;
    const a = Math.abs(c);
    const body = k === 0 ? String(a) : `${a === 1 ? "" : a}${v}${k > 1 ? `^${k}` : ""}`;
    out += out ? (c < 0 ? ` - ${body}` : ` + ${body}`) : c < 0 ? `-${body}` : body;
  }
  return out || "0";
}

/** Product of two polynomials given by coefficients. */
export const pmul = (a: number[], b: number[]) => {
  const out = Array<number>(a.length + b.length - 1).fill(0);
  a.forEach((x, i) => b.forEach((y, j) => (out[i + j] += x * y)));
  return out;
};

/** "(2x + 3)" from a, b. */
export const bracket = (a: number, b: number) => `(${polyStr([b, a])})`;

export const T = (src: string) => tex(parseE(src));

/** A number as a typed answer: 3/4, -2. */
export const plainFrac = (f: Frac) => (f.d === 1 ? String(f.n) : `${f.n}/${f.d}`);

/** The signs of a sum as words list them: × and ÷, a true minus. */
export const OP_SIGN = { "+": "+", "-": "−", "*": "×", "/": "÷" } as const;

/** A sum of cards in LaTeX: (3 + 5) \times 2. */
export const sumTex = (e: Parameters<typeof sumText>[0]) => sumText(e).replace(/×/g, "\\times").replace(/÷/g, "\\div").replace(/−/g, "-");

/** p + q√m in LaTeX. */
export function surdTex(p: Frac, q: Frac, m: number): string {
  if (m === 1) return p.add(q).tex();
  const qa = q.abs();
  const root = qa.d === 1 ? `${qa.n === 1 ? "" : qa.n}\\sqrt{${m}}` : `\\frac{${qa.n === 1 ? "" : qa.n}\\sqrt{${m}}}{${qa.d}}`;
  if (p.isZero()) return (q.isNeg() ? "-" : "") + root;
  return `${p.tex()} ${q.isNeg() ? "-" : "+"} ${root}`;
}

export const num = (v: number, tol = 1e-9, extra: { lowest?: boolean; surd?: boolean; form?: "improper" | "mixed" | "fraction" | "decimal" } = {}): Answer => ({ k: "num", v, tol, ...extra });

export const dp = (v: number, d: number) => String(Math.round(v * 10 ** d) / 10 ** d);

/** E as text that parseE reads back. */
export function plainE(e: E): string {
  switch (e.k) {
    case "num":
      return e.v.d === 1 ? (e.v.n < 0 ? `(${e.v.n})` : String(e.v.n)) : `(${e.v.n}/${e.v.d})`;
    case "var":
      return e.name;
    case "e":
      return "e";
    case "pi":
      return "pi";
    case "add":
      return `(${e.ts.map(plainE).join(" + ")})`;
    case "mul":
      return `(${e.fs.map(plainE).join(" * ")})`;
    case "pow":
      return `(${plainE(e.b)})^(${plainE(e.e)})`;
    case "fn":
      return `${e.f}(${plainE(e.a)})`;
    case "log":
      return e.base.d === 1 && e.base.n === 10 ? `log(${plainE(e.a)})` : `log_${e.base.n}(${plainE(e.a)})`;
    case "d":
      return plainE(e.a);
  }
}

/** m/10^p with k decimal places shown (none when k ≤ 0). */
export const fmtM = (m: number, p: number, k = p) => (m / 10 ** p).toFixed(Math.max(0, Math.min(k, p)));

/** A decimal without trailing zeros, safe from floating dust: 7.350000001 → "7.35". */
export const tidy = (v: number) => String(Number(v.toFixed(10)));

/** An amount of money in the language's currency: a whole amount bare, any other with its two places (20, 4.05). */
export const money = (w: PracticeWords, v: number) => fill(w.money, { v: Number.isInteger(v) ? String(v) : v.toFixed(2) });

/** A whole number from lo to hi that doesn't end in 0, so a decimal made from it shows all its places. */
export function noZeroEnd(r: Rng, lo: number, hi: number): number {
  for (;;) {
    const m = r.int(lo, hi);
    if (m % 10) return m;
  }
}

/** The worked picture of a fraction form: bars of the fractions named, with the form and numbers kept so the question can be read for its ideas. */
export const fracBars = (form: StepForm, a: string, b: string | null, rows: { n: number; d: number }[]) => ({
  kind: "model" as const,
  spec: { type: "fraction", form, a, b, rows, shape: "bar", unitLabels: true },
});

export const fracTex = (n: number, d: number) => `\\frac{${n}}{${d}}`;

/** The subscript digits a base is written with after a numeral (1011₂). */
export const SUBSCRIPT = "₀₁₂₃₄₅₆₇₈₉";

/**
 * A number theory question as a practice question: a whole number, a fraction in lowest terms (a repeating decimal), or
 * a numeral in base b, typed as its digits and read as such (1011 for 1011₂; a written base after it is taken off).
 * The worked solution is the number theory tool's picture where it draws one, else the working.
 */
export function numberTheoryPart(q: NumberTheoryQuestion, w: PracticeWords): Part {
  const units = q.base ? [`_${q.base}`, SUBSCRIPT[q.base], `(${q.base})`] : undefined;
  return {
    prompt: fill(w.numberTheory[q.kind], q.vars),
    q: q.q,
    answer: { ...num(q.v, 1e-9, q.frac ? { lowest: true } : {}), ...(units ? { units } : {}), traps: q.traps.map((t) => ({ id: t.id, a: num(t.v), vars: t.vars })) },
    show: q.frac ? fracTex(q.frac[0], q.frac[1]) : q.base ? `${q.v}_{${q.base}}` : String(q.v),
    plain: q.frac ? `${q.frac[0]}/${q.frac[1]}` : String(q.v),
    format: q.frac ? "fraction" : q.base ? "base" : "number",
    ...(q.spec ? { solution: { kind: "nt" as const, spec: q.spec } } : { steps: q.steps }),
  };
}

export const mixedTex = (whole: number, n: number, d: number) => `${whole}\\frac{${n}}{${d}}`;

/** A step whose answer is an expression; an antiderivative accepts any constant added. */
export function exprPart(prompt: string, q: string, e: E, plusC = false): Part {
  return {
    prompt, q, answer: { k: "expr", e, ...(plusC ? { mode: "plusC" as const } : {}) },
    show: tex(e) + (plusC ? " + C" : ""), plain: plainE(e) + (plusC ? " + C" : ""), format: plusC ? "antiderivative" : "expr",
  };
}

/** A step whose answer is a number: a whole one, a simple fraction exactly, or anything else to 3 decimal places. */
export function numPart(prompt: string, q: string, v: number): Part {
  if (Number.isInteger(v)) return { prompt, q, answer: num(v), show: String(v), plain: String(v), format: "number" };
  const f = toFrac(v);
  if (f.d <= 100 && Math.abs(f.toNumber() - v) < 1e-9) return { prompt, q, answer: num(v), show: f.tex(), plain: plainFrac(f), format: "exact" };
  return { prompt, q, answer: num(v, 0.0006), show: dp(v, 3), plain: dp(v, 6), format: "dp3" };
}

export const FLIP_SIGN: Record<CompareSign, CompareSign> = { "<": ">", "=": "=", ">": "<" };

/** A number as a hint writes it, with a proper minus sign. */
export const minusSign = (s: string | number) => String(s).replace(/^-/, "−");

/** The one sign in an answer (<, = or >, typed or full-width), or null when there is none or more than one. */
export function readSign(src: string): CompareSign | null {
  const signs = src.replace(/＜/g, "<").replace(/＞/g, ">").replace(/＝/g, "=").match(/[<>=]/g);
  return signs?.length === 1 ? (signs[0] as CompareSign) : null;
}

/**
 * a ? b, written as given. `naive` are the traps of known mistakes, each with the sign it gives; the first that gives
 * a different sign from the right one is the question's trap, or else the sign turned round (when it isn't =).
 */
export function signExercise(w: PracticeWords, a: string, b: string, sign: CompareSign, more: Partial<Omit<Exercise, "skill" | "level" | "seed">>, naive: Trap[] = []) {
  const big = sign === "<" ? b : a;
  const trap = naive.find((t) => t.a.k === "sign" && t.a.v !== sign);
  const traps: Trap[] = trap ? [trap] : sign === "=" ? [] : [{ id: "compareFlip", a: { k: "sign", v: FLIP_SIGN[sign] }, vars: { big: minusSign(big.replace(/\\frac\{(\d+)\}\{(\d+)\}/, "$1/$2")) } }];
  return { prompt: w.prompts.compare, q: `${a} \\;\\square\\; ${b}`, answer: { k: "sign" as const, v: sign, traps }, show: `${a} ${sign} ${b}`, plain: sign, format: "sign" as const, ...more };
}

/** An m × n matrix of whole numbers from lo to hi. */
export const ints = (r: Rng, m: number, n: number, lo: number, hi: number) => Array.from({ length: m }, () => Array.from({ length: n }, () => r.int(lo, hi)));

export const M = (rows: number[][]): Mat => rows.map((row) => row.map((x) => fr(x)));

export const matAnswer = (m: Mat): Answer => ({ k: "matrix", rows: m.map((row) => row.map((x) => x.toNumber())), tol: 1e-9 });

/** A matrix as typed: rows split by ;, numbers by commas. */
export const matPlain = (m: Mat) => m.map((row) => row.map(plainFrac).join(", ")).join("; ");

/** A column of entries already in LaTeX. */
export const colTex = (v: string[]) => env(v.map((x) => [x]));

/** The Matrices tool's working for an operation on A (and B). */
export const matCalc = (op: MatrixOp, A: number[][], B: number[][] = []): Exercise["solution"] => {
  const spec: MatrixCalcSpec = { type: "calc", op, A: A.map((row) => row.map(String)), B: B.map((row) => row.map(String)), k: "1", steps: true };
  return { kind: "matrix", spec };
};

/** A factor in a product, bracketed when negative. */
export const par = (v: number | string) => (String(v).startsWith("-") ? `(${v})` : String(v));

/** Errors in a table: one column for each of `heads`, one row for each named list. */
export const errTable = (head: string, heads: (string | number)[], rows: [string, number[]][]) =>
  `\\begin{array}{c|${"c".repeat(heads.length)}} ${head} & ${heads.join(" & ")} \\\\ \\hline ${rows.map(([k, vs]) => `${k} & ${vs.join(" & ")}`).join(" \\\\ ")} \\end{array}`;

/** A decimal that is really a simple fraction (gradients, values of derivatives) back to the fraction. */
export function toFrac(v: number): Frac {
  for (let d = 1; d <= 1000; d++) {
    const n = Math.round(v * d);
    if (Math.abs(n / d - v) < 1e-9) return fr(n, d);
  }
  return fr(Math.round(v * 1e6), 1e6);
}

export const FLIP: Record<Rel, Rel> = { "<": ">", "<=": ">=", ">": "<", ">=": "<=", "=": "=" };

export const boundTex = (b: Bound, below: boolean) => (below ? (b.closed ? "\\le" : "<") : b.closed ? "\\ge" : ">");

/** x ≥ 4, −1 < x ≤ 3 in LaTeX. */
export function ineqTex(lo: Bound | null, hi: Bound | null, v = "x"): string {
  const n = (b: Bound) => toFrac(b.v).tex();
  if (lo && hi) return `${n(lo)} ${boundTex(lo, true)} ${v} ${boundTex(hi, true)} ${n(hi)}`;
  if (lo) return `${v} ${boundTex(lo, false)} ${n(lo)}`;
  return `${v} ${boundTex(hi!, true)} ${n(hi!)}`;
}

/** The same, typed: x >= 4, -1 < x <= 3. */
export function ineqPlain(lo: Bound | null, hi: Bound | null, v = "x"): string {
  const n = (b: Bound) => plainFrac(toFrac(b.v));
  const op = (b: Bound, below: boolean) => (below ? (b.closed ? "<=" : "<") : b.closed ? ">=" : ">");
  if (lo && hi) return `${n(lo)} ${op(lo, true)} ${v} ${op(hi, true)} ${n(hi)}`;
  if (lo) return `${v} ${op(lo, false)} ${n(lo)}`;
  return `${v} ${op(hi!, true)} ${n(hi!)}`;
}
