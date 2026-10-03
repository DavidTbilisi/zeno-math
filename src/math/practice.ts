// Practice: questions made from a seed for each skill and level, answers checked (numbers, fractions, surds, sets of
// roots, points, expressions up to equivalence — in the form the question asks for), and a worked solution from the
// tool that covers the topic. A worksheet is a numbered set of questions with an optional answer key.
import { antiderivative } from "./applied";
import { C, esc, fill, FONT, r2, W, wrap } from "./chart";
import { derive } from "./derive";
import { circleFigure, solidFigure } from "./euclid";
import { evalE, exprMessages, fromPoly, parseE, simp, sqrtSplit, tex, toPoly, type E } from "./expr";
import { Frac } from "./fraction";
import { tUpper, zUpper } from "./inference";
import { latexToSvg, type RenderedSvg } from "./latex";
import { AREAS, SKILLS, type Area, type SkillId } from "./practiceSkills";

export { ALL_SKILLS, AREAS, SKILLS, areaOf, type Area, type SkillId } from "./practiceSkills";
export type Level = 1 | 2 | 3;
export const LEVELS: Level[] = [1, 2, 3];

/** The tools whose pictures serve as worked solutions. */
export type SolutionKind = "model" | "algebra" | "powers" | "coord" | "trig" | "deriv" | "applied" | "statistics" | "comb" | "nt" | "inference" | "vectors" | "sequences" | "functions" | "identities" | "polynomials" | "euclid" | "numerical";
export type Format =
  | "number" | "exact" | "fraction" | "dp2" | "dp3" | "roots" | "point" | "vector" | "interval" | "line" | "expr" | "factors" | "antiderivative" | "primes";

type Answer =
  | { k: "num"; v: number; tol: number; lowest?: boolean; surd?: boolean }
  | { k: "set"; vs: number[]; tol: number }
  | { k: "tuple"; vs: number[]; tol: number }
  | { k: "expr"; e: E; mode?: "factor" | "expand" | "plusC" | "line" }
  | { k: "primes"; n: number };

export type Exercise = {
  skill: SkillId;
  level: Level;
  seed: number;
  /** The instruction, in words. */
  prompt: string;
  /** The question in LaTeX ("" when the prompt says it all). */
  q: string;
  /** A drawing that goes with the question (the right triangle), with its height. */
  pic?: { svg: (x: number, y: number) => string; h: number };
  answer: Answer;
  /** The answer in LaTeX. */
  show: string;
  /** A typed answer that is accepted (for the tests). */
  plain: string;
  format: Format;
  solution?: { kind: SolutionKind; spec: unknown };
  /** Worked lines when no tool draws the solution. */
  steps?: string[];
};

export type PracticeWords = {
  bad: string;
  onlyX: string;
  tooBig: string;
  skills: Record<SkillId, string>;
  levels: Record<"1" | "2" | "3", string>;
  mixed: string;
  prompts: {
    times: string;
    fractions: string;
    percentOf: string;
    percentChange: string;
    percentReverse: string;
    hcf: string;
    lcm: string;
    primes: string;
    linear: string;
    expand: string;
    factor: string;
    quadratic: string;
    simultaneous: string;
    evaluate: string;
    surds: string;
    rationalise: string;
    line: string;
    perp: string;
    midpoint: string;
    distance: string;
    trigexact: string;
    idDouble: string;
    idMax: string;
    polyRem: string;
    polyCoef: string;
    circleFind: string;
    similarSide: string;
    similarA: string;
    scaleArea: string;
    scaleVolume: string;
    scaleAreaVolume: string;
    volume: string;
    surface: string;
    solidDim: string;
    rightSide: string;
    rightAngle: string;
    vecCombo: string;
    vecLength: string;
    vecPerp: string;
    vecDot: string;
    vecAngle: string;
    vecAngleExact: string;
    seqTerm: string;
    seqTwo: string;
    serSum: string;
    serInf: string;
    serSigma: string;
    fnComp: string;
    fnInv: string;
    differentiate: string;
    gradient: string;
    tangent: string;
    stationary: string;
    integrate: string;
    definite: string;
    numNewton: string;
    numRoot: string;
    numIterate: string;
    numTrapezium: string;
    numSimpson: string;
    mean: string;
    median: string;
    mode: string;
    range: string;
    sd: string;
    die: string;
    dice: string;
    marbles: string;
    lineUp: string;
    podium: string;
    choose: string;
    word: string;
    ciZ: string;
    ciT: string;
    ciP: string;
  };
  events: { even: string; greater: string; prime: string; mult3: string };
  marbleNames: { first: string; second: string };
  formats: Record<Format, string>;
  reasons: {
    empty: string;
    unreadable: string;
    notLowest: string;
    notSimplified: string;
    notFactored: string;
    notExpanded: string;
    notPrime: string;
    count: string;
    rounding: string;
  };
  answer: string;
  answers: string;
  ui: {
    practise: string;
    sheet: string;
    check: string;
    next: string;
    reveal: string;
    correct: string;
    wrong: string;
    revealed: string;
    review: string;
    score: string;
    progress: string;
    count: string;
    withAnswers: string;
    newSet: string;
    answerHere: string;
    solving: string;
    reset: string;
  };
};

// ---------- random numbers ----------

type Rng = { next: () => number; int: (lo: number, hi: number) => number; nz: (lo: number, hi: number) => number; pick: <T>(a: readonly T[]) => T; sign: () => 1 | -1 };
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

// ---------- building expressions ----------

const gcd = (a: number, b: number): number => {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
};
const fr = (n: number, d = 1) => new Frac(n, d);
/** A polynomial typed out from its coefficients, highest power first: [c0, c1, c2] → "c2x^2 + c1x + c0". */
function polyStr(cs: number[], v = "x"): string {
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
const pmul = (a: number[], b: number[]) => {
  const out = Array<number>(a.length + b.length - 1).fill(0);
  a.forEach((x, i) => b.forEach((y, j) => (out[i + j] += x * y)));
  return out;
};
/** "(2x + 3)" from a, b. */
const bracket = (a: number, b: number) => `(${polyStr([b, a])})`;
const T = (src: string) => tex(parseE(src));
/** A number as a typed answer: 3/4, -2. */
const plainFrac = (f: Frac) => (f.d === 1 ? String(f.n) : `${f.n}/${f.d}`);
/** p + q√m in LaTeX. */
function surdTex(p: Frac, q: Frac, m: number): string {
  if (m === 1) return p.add(q).tex();
  const qa = q.abs();
  const root = qa.d === 1 ? `${qa.n === 1 ? "" : qa.n}\\sqrt{${m}}` : `\\frac{${qa.n === 1 ? "" : qa.n}\\sqrt{${m}}}{${qa.d}}`;
  if (p.isZero()) return (q.isNeg() ? "-" : "") + root;
  return `${p.tex()} ${q.isNeg() ? "-" : "+"} ${root}`;
}
const num = (v: number, tol = 1e-9, extra: { lowest?: boolean; surd?: boolean } = {}): Answer => ({ k: "num", v, tol, ...extra });
const dp = (v: number, d: number) => String(Math.round(v * 10 ** d) / 10 ** d);
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

// ---------- the generators ----------

type Gen = (r: Rng, L: Level, w: PracticeWords) => Omit<Exercise, "skill" | "level" | "seed">;

const GENS: Record<SkillId, Gen> = {
  times(r, L, w) {
    const [a, b] = L === 1 ? [r.int(12, 99), r.int(3, 9)] : L === 2 ? [r.int(12, 99), r.int(12, 99)] : [r.int(101, 999), r.int(12, 99)];
    return { prompt: w.prompts.times, q: `${a} \\times ${b}`, answer: num(a * b), show: String(a * b), plain: String(a * b), format: "number", solution: { kind: "model", spec: { type: "multiply", style: "area", a, b, step: 999 } } };
  },

  fractions(r, L, w) {
    const op = L === 1 ? r.pick(["+", "-"] as const) : r.pick(["+", "-", "×", "÷"] as const);
    const part = () => {
      const d = r.int(2, L === 1 ? 9 : 12);
      const n = r.int(1, d - 1);
      const whole = L === 3 ? r.int(1, 3) : 0;
      return { whole, n, d, f: fr(whole * d + n, d) };
    };
    let a = part();
    let b = part();
    if (L === 1 && r.next() < 0.5) {
      // Same or doubled denominator.
      const d = a.d * r.pick([1, 2]);
      const n = r.int(1, d - 1);
      b = { whole: 0, n, d, f: fr(n, d) };
    }
    if (op === "-" && a.f.toNumber() < b.f.toNumber()) [a, b] = [b, a];
    const res = op === "+" ? a.f.add(b.f) : op === "-" ? a.f.sub(b.f) : op === "×" ? a.f.mul(b.f) : a.f.div(b.f);
    const ftex = (p: typeof a) => `${p.whole ? p.whole : ""}\\frac{${p.n}}{${p.d}}`;
    const ftxt = (p: typeof a) => (p.whole ? `${p.whole} ${p.n}/${p.d}` : `${p.n}/${p.d}`);
    const opTex = { "+": "+", "-": "-", "×": "\\times", "÷": "\\div" }[op];
    const whole = Math.trunc(res.n / res.d);
    const show = res.d === 1 || Math.abs(whole) === 0 ? res.tex() : `${res.tex()} = ${whole}\\frac{${Math.abs(res.n) % res.d}}{${res.d}}`;
    return {
      prompt: w.prompts.fractions,
      q: `${ftex(a)} ${opTex} ${ftex(b)}`,
      answer: num(res.toNumber(), 1e-9, { lowest: true }),
      show,
      plain: plainFrac(res),
      format: "fraction",
      solution: { kind: "model", spec: { type: "fracop", op, a: ftxt(a), b: ftxt(b), step: 99 } },
    };
  },

  percent(r, L, w) {
    const P = (kind: string, p: number, a: number, b: number, up = true) => ({ type: "percratio", kind, p: String(p), a: String(a), b: String(b), ratio: "2:3", up, step: 999 });
    if (L === 1) {
      const p = r.pick([5, 10, 15, 20, 25, 30, 40, 60, 75]);
      const a = 20 * r.int(2, 30);
      const v = (p * a) / 100;
      return { prompt: fill(w.prompts.percentOf, { p, a }), q: "", answer: num(v), show: String(v), plain: String(v), format: "number", solution: { kind: "model", spec: P("of", p, a, 1) } };
    }
    const p = r.pick([5, 10, 15, 20, 25, 30, 40, 50]);
    const a = 20 * r.int(2, 30);
    if (L === 2) {
      const up = r.next() < 0.5;
      const b = (a * (100 + (up ? p : -p))) / 100;
      const v = up ? p : -p;
      return { prompt: fill(w.prompts.percentChange, { a, b }), q: "", answer: num(v), show: `${v}\\%`, plain: `${v}%`, format: "number", solution: { kind: "model", spec: P("percentChange", p, a, b) } };
    }
    const now = (a * (100 + p)) / 100;
    return { prompt: fill(w.prompts.percentReverse, { p, a: now }), q: "", answer: num(a), show: String(a), plain: String(a), format: "number", solution: { kind: "model", spec: P("reverseChange", p, now, 1, true) } };
  },

  hcf(r, L, w) {
    const g = L === 3 ? r.int(6, 30) : r.int(2, 12);
    let m: number;
    let n: number;
    do {
      m = r.int(2, L === 3 ? 15 : 9);
      n = r.int(2, L === 3 ? 15 : 9);
    } while (m === n || gcd(m, n) !== 1);
    const [a, b] = [g * m, g * n];
    const lcm = L === 2;
    const v = lcm ? g * m * n : g;
    return { prompt: fill(lcm ? w.prompts.lcm : w.prompts.hcf, { a, b }), q: "", answer: num(v), show: String(v), plain: String(v), format: "number", solution: { kind: "nt", spec: { topic: "gcd", mode: "euclid", a: String(a), b: String(b), c: "1" } } };
  },

  primes(r, L, w) {
    const ps = L === 1 ? [2, 3, 5, 7] : L === 2 ? [2, 3, 5, 7, 11] : [2, 3, 5, 7, 11, 13];
    const limit = L === 1 ? 100 : L === 2 ? 1000 : 10000;
    let n = 1;
    let k = 0;
    for (;;) {
      const p = r.pick(ps);
      if (n * p > limit) {
        if (k >= (L === 1 ? 2 : 3)) break;
        n = 1;
        k = 0;
        continue;
      }
      n *= p;
      k++;
    }
    const pf: [number, number][] = [];
    let m = n;
    for (const p of ps)
      if (m % p === 0) {
        let e = 0;
        while (m % p === 0) (m /= p), e++;
        pf.push([p, e]);
      }
    return {
      prompt: fill(w.prompts.primes, { n }),
      q: "",
      answer: { k: "primes", n },
      show: pf.map(([p, e]) => (e > 1 ? `${p}^{${e}}` : String(p))).join(" \\cdot "),
      plain: pf.map(([p, e]) => (e > 1 ? `${p}^${e}` : String(p))).join(" * "),
      format: "primes",
      solution: { kind: "nt", spec: { topic: "factor", n: String(n) } },
    };
  },

  linear(r, L, w) {
    let eq: string;
    let x: Frac;
    if (L === 1) {
      const a = r.int(2, 9);
      const xv = r.nz(-9, 9);
      const b = r.nz(-15, 15);
      eq = `${polyStr([b, a])} = ${a * xv + b}`;
      x = fr(xv);
    } else if (L === 2) {
      let a = r.int(2, 9);
      let c = r.int(1, 9);
      while (c === a) c = r.int(1, 9);
      if (r.next() < 0.5) [a, c] = [c, a];
      const xv = r.nz(-9, 9);
      const b = r.int(-12, 12);
      const d = (a - c) * xv + b;
      eq = `${polyStr([b, a])} = ${polyStr([d, c])}`;
      x = fr(xv);
    } else {
      const a = r.int(2, 6);
      const b = r.nz(-6, 6);
      let c = r.int(1, 9);
      while (c === a) c = r.int(1, 9);
      const d = r.int(-12, 12);
      eq = `${a}${bracket(1, b)} = ${polyStr([d, c])}`;
      x = fr(d - a * b, a - c);
    }
    return { prompt: w.prompts.linear, q: T(eq.split("=")[0]) + " = " + T(eq.split("=")[1]), answer: num(x.toNumber()), show: `x = ${x.tex()}`, plain: plainFrac(x), format: "exact", solution: { kind: "algebra", spec: { topic: "linear", eq, method: "factor" } } };
  },

  expand(r, L, w) {
    let src: string;
    let cs: number[];
    if (L === 1) {
      const [a, b] = [r.nz(-9, 9), r.nz(-9, 9)];
      src = `${bracket(1, a)}${bracket(1, b)}`;
      cs = pmul([a, 1], [b, 1]);
    } else if (L === 2) {
      const [a, b, c, d] = [r.int(2, 5), r.nz(-7, 7), r.int(1, 5), r.nz(-7, 7)];
      src = `${bracket(a, b)}${bracket(c, d)}`;
      cs = pmul([b, a], [d, c]);
    } else {
      const kind = r.int(0, 2);
      if (kind === 0) {
        const [a, b] = [r.int(2, 5), r.nz(-7, 7)];
        src = `${bracket(a, b)}^2`;
        cs = pmul([b, a], [b, a]);
      } else if (kind === 1) {
        const [a, b, c] = [r.nz(-5, 5), r.nz(-5, 5), r.nz(-6, 6)];
        src = `${bracket(1, a)}(${polyStr([c, b, 1])})`;
        cs = pmul([a, 1], [c, b, 1]);
      } else {
        const [k, a, b] = [r.int(2, 5) * r.sign(), r.nz(-6, 6), r.nz(-6, 6)];
        src = `${k}${bracket(1, a)}${bracket(1, b)}`;
        cs = pmul([k], pmul([a, 1], [b, 1]));
      }
    }
    const out = polyStr(cs);
    return { prompt: w.prompts.expand, q: T(src), answer: { k: "expr", e: parseE(out), mode: "expand" }, show: T(out), plain: out, format: "expr", solution: { kind: "algebra", spec: { topic: "expand", eq: src, method: "factor" } } };
  },

  factor(r, L, w) {
    let fac: string;
    let cs: number[];
    if (L === 1) {
      const [a, b] = [r.nz(-9, 9), r.nz(-9, 9)];
      fac = `${bracket(1, a)}${bracket(1, b)}`;
      cs = pmul([a, 1], [b, 1]);
    } else if (L === 2) {
      let p: number, a: number, q: number, b: number;
      do [p, a, q, b] = [r.int(2, 3), r.nz(-7, 7), r.int(1, 2), r.nz(-7, 7)];
      while (gcd(p, a) !== 1 || gcd(q, b) !== 1 || p * b === q * a);
      fac = `${bracket(p, a)}${bracket(q, b)}`;
      cs = pmul([a, p], [b, q]);
    } else {
      const kind = r.int(0, 2);
      if (kind === 0) {
        let p: number, a: number;
        do [p, a] = [r.int(1, 5), r.int(1, 9)];
        while (gcd(p, a) !== 1);
        fac = `${bracket(p, -a)}${bracket(p, a)}`;
        cs = pmul([-a, p], [a, p]);
      } else if (kind === 1) {
        const [k, a, b] = [r.int(2, 5), r.nz(-6, 6), r.nz(-6, 6)];
        fac = `${k}${bracket(1, a)}${bracket(1, b)}`;
        cs = pmul([k], pmul([a, 1], [b, 1]));
      } else {
        let k: number, a: number, p: number;
        do [k, p, a] = [r.int(1, 4), r.int(2, 6), r.nz(-9, 9)];
        while (gcd(p, a) !== 1);
        fac = `${k === 1 ? "" : k}x${bracket(p, a)}`;
        cs = pmul([0, k], [a, p]);
      }
    }
    const ex = polyStr(cs);
    return { prompt: w.prompts.factor, q: T(ex), answer: { k: "expr", e: parseE(ex), mode: "factor" }, show: T(fac), plain: fac, format: "factors", solution: { kind: "algebra", spec: { topic: "factor", eq: ex, method: "factor" } } };
  },

  quadratic(r, L, w) {
    if (L < 3) {
      let p: number, q: number, a: number, cs: number[];
      let roots: Frac[];
      if (L === 1) {
        do [p, q] = [r.int(-9, 9), r.int(-9, 9)];
        while (p === q);
        a = 1;
        cs = pmul([-p, 1], [-q, 1]);
        roots = [fr(p), fr(q)];
      } else {
        do [a, p, q] = [r.int(2, 3), r.nz(-7, 7), r.int(-6, 6)];
        while (gcd(a, p) !== 1);
        cs = pmul([-p, a], [-q, 1]);
        roots = [fr(p, a), fr(q)];
      }
      const eq = `${polyStr(cs)} = 0`;
      roots.sort((x, y) => x.toNumber() - y.toNumber());
      return {
        prompt: w.prompts.quadratic,
        q: `${T(polyStr(cs))} = 0`,
        answer: { k: "set", vs: roots.map((x) => x.toNumber()), tol: 1e-9 },
        show: roots.map((x) => `x = ${x.tex()}`).join(", \\; "),
        plain: roots.map(plainFrac).join("; "),
        format: "roots",
        solution: { kind: "algebra", spec: { topic: "quadratic", eq, method: "factor" } },
      };
    }
    let b: number, c: number, D: number;
    do [b, c] = [r.int(-8, 8), r.nz(-10, 10)];
    while ((D = b * b - 4 * c) <= 0 || Number.isInteger(Math.sqrt(D)));
    const { out, s } = sqrtSplit(fr(D));
    const eq = `${polyStr([c, b, 1])} = 0`;
    const vs = [(-b - Math.sqrt(D)) / 2, (-b + Math.sqrt(D)) / 2];
    return {
      prompt: w.prompts.quadratic,
      q: `${T(polyStr([c, b, 1]))} = 0`,
      answer: { k: "set", vs, tol: 0.0051 },
      show: `x = ${surdTex(fr(-b, 2), out.div(fr(2)), s).replace(/ [+-] /, " \\pm ")} \\approx ${dp(vs[0], 2)}, \\; ${dp(vs[1], 2)}`,
      plain: vs.map((v) => dp(v, 3)).join("; "),
      format: "roots",
      solution: { kind: "algebra", spec: { topic: "quadratic", eq, method: "formula" } },
    };
  },

  simultaneous(r, L, w) {
    const x = r.int(-6, 6);
    const y = r.int(-6, 6);
    const big = L === 3 ? 9 : 5;
    let a1: number, b1: number, a2: number, b2: number;
    do {
      [a1, b1, a2, b2] = [r.nz(-big, big), r.nz(-big, big), r.nz(-big, big), r.nz(-big, big)];
      if (L === 1) b2 = r.pick([b1, -b1]);
    } while (a1 * b2 - a2 * b1 === 0);
    const eq = (a: number, b: number) => `${polyStr([0, a])} ${b < 0 ? "-" : "+"} ${Math.abs(b) === 1 ? "" : Math.abs(b)}y = ${a * x + b * y}`;
    const [e1, e2] = [eq(a1, b1), eq(a2, b2)];
    return {
      prompt: w.prompts.simultaneous,
      q: `\\begin{cases} ${e1} \\\\ ${e2} \\end{cases}`,
      answer: { k: "tuple", vs: [x, y], tol: 1e-9 },
      show: `x = ${x}, \\; y = ${y}`,
      plain: `x = ${x}; y = ${y}`,
      format: "point",
      solution: { kind: "coord", spec: { topic: "meet", src: `${e1}; ${e2}` } },
    };
  },

  polynomials(r, L, w) {
    const sol = (topic: string, src: string) => ({ kind: "polynomials" as const, spec: { topic, src } });
    const sup = (k: number) => String(k).replace(/\d/g, (d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(d)]);
    if (L === 1) {
      // The remainder theorem: dividing by (x − a) leaves f(a).
      const cs = [r.nz(-6, 6), r.int(-5, 5), r.int(-5, 5), r.pick([1, 1, 2, -1, 3])];
      const a = r.nz(-3, 3);
      const p = polyStr(cs);
      const v = cs.reduceRight((acc, c) => acc * a + c, 0);
      const d = `x ${a < 0 ? "+" : "-"} ${Math.abs(a)}`;
      return { prompt: fill(w.prompts.polyRem, { d: `(${d.replace("-", "−")})` }), q: `f(x) = ${T(p)}`, answer: num(v), show: String(v), plain: String(v), format: "number", solution: sol("divide", `(${p}) / (${d})`) };
    }
    if (L === 2) {
      // A cubic with three rational roots, found by the factor theorem.
      const r1 = r.nz(-4, 4);
      let r2 = r.nz(-4, 4);
      while (r2 === r1) r2 = r.nz(-4, 4);
      const b = r.pick([1, 1, 2]);
      let a = b === 2 ? r.pick([-3, -1, 1, 3, 5]) : r.nz(-5, 5);
      while (b === 1 && (a === r1 || a === r2)) a = r.nz(-5, 5);
      const cs = pmul(pmul([-r1, 1], [-r2, 1]), [-a, b]);
      const ex = polyStr(cs);
      const fac = [bracket(1, -r1), bracket(1, -r2), bracket(b, -a)].join("");
      return { prompt: w.prompts.factor, q: T(ex), answer: { k: "expr", e: parseE(ex), mode: "factor" }, show: T(fac), plain: fac, format: "factors", solution: sol("solve", ex) };
    }
    // A coefficient in (ax + b)ⁿ: C(n, k)·aᵏ·bⁿ⁻ᵏ.
    const n = r.int(4, 7);
    const a = r.pick([1, 2, 2, 3]);
    const b = r.nz(-3, 3);
    const k = r.int(1, n - 1);
    let c = 1;
    for (let i = 1; i <= k; i++) c = (c * (n - k + i)) / i;
    const v = Math.round(c) * a ** k * b ** (n - k);
    const src = `(${polyStr([b, a])})^${n}`;
    return {
      prompt: fill(w.prompts.polyCoef, { t: k === 1 ? "x" : `x${sup(k)}` }),
      q: T(src),
      answer: num(v),
      show: String(v),
      plain: String(v),
      format: "number",
      solution: sol("binomial", `${src}, x^${k}`),
    };
  },

  indices(r, L, w) {
    let src: string;
    let v: Frac;
    let q: string;
    if (L === 1) {
      const a = r.int(2, 5);
      const kind = r.int(0, 1);
      if (kind === 0) {
        const [m, n] = [r.int(2, 6), r.int(1, 5)];
        const k = r.int(Math.max(1, m + n - (a === 2 ? 8 : 4)), m + n);
        src = `${a}^${m} * ${a}^${n} / ${a}^${k}`;
        q = `\\frac{${a}^{${m}} \\times ${a}^{${n}}}{${a}^{${k}}}`;
        v = fr(a ** (m + n - k));
      } else {
        const n = r.int(1, 3);
        src = `${a}^(-${n})`;
        q = `${a}^{-${n}}`;
        v = fr(1, a ** n);
      }
    } else {
      const [k, d] = r.pick([[2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [2, 3], [3, 3], [4, 3], [2, 4], [3, 4], [2, 5]] as const);
      const base = k ** d;
      let n = r.int(1, d === 2 ? 3 : 2);
      if (n % d === 0) n++;
      if (L === 2) {
        src = `${base}^(${n}/${d})`;
        q = `${base}^{\\frac{${n}}{${d}}}`;
        v = fr(k ** n);
      } else {
        const [p, qq] = r.pick([[2, 3], [3, 2], [1, 2], [2, 5], [3, 4], [1, 3]] as const);
        const [P, Q] = [p ** d, qq ** d];
        src = `(${P}/${Q})^(-${n}/${d})`;
        q = `\\left(\\frac{${P}}{${Q}}\\right)^{-\\frac{${n}}{${d}}}`;
        v = fr(qq ** n, p ** n);
      }
    }
    return { prompt: w.prompts.evaluate, q, answer: num(v.toNumber()), show: v.tex(), plain: plainFrac(v), format: "exact", solution: { kind: "powers", spec: { topic: "laws", src } } };
  },

  logs(r, L, w) {
    const logTex = (b: number, x: string) => (b === 10 ? `\\log ${x}` : `\\log_{${b}} ${x}`);
    const logSrc = (b: number, x: string) => (b === 10 ? `log(${x})` : `log_${b}(${x})`);
    let src: string;
    let q: string;
    let v: Frac;
    if (L === 1) {
      const b = r.pick([2, 3, 5, 10]);
      const k = r.int(1, b === 2 ? 7 : b === 10 ? 5 : 4);
      src = logSrc(b, String(b ** k));
      q = logTex(b, String(b ** k));
      v = fr(k);
    } else if (L === 2) {
      if (r.next() < 0.5) {
        const b = r.pick([2, 3, 10]);
        const k = r.int(1, 4);
        src = logSrc(b, `1/${b ** k}`);
        q = logTex(b, `\\frac{1}{${b ** k}}`);
        v = fr(-k);
      } else {
        const b = r.pick([2, 3]);
        const [m, n] = r.pick([[2, 3], [2, 1], [2, 5], [3, 2], [3, 1], [2, 4]] as const);
        if (b ** n > 10000 || b ** m > 100) return GENS.logs(r, 1, w);
        src = logSrc(b ** m, String(b ** n));
        q = logTex(b ** m, String(b ** n));
        v = fr(n, m);
      }
    } else {
      const b = r.pick([2, 3, 5, 6, 10]);
      const k = r.int(1, b <= 3 ? 3 : 2);
      if (b === 6 || b === 10) {
        const t = b ** k;
        const parts = k === 1 ? (b === 6 ? [2, 3] : [2, 5]) : b === 6 ? [4, 9] : k === 2 ? [4, 25] : [8, 125];
        src = `${logSrc(b, String(parts[0]))} + ${logSrc(b, String(parts[1]))}`;
        q = `${logTex(b, String(parts[0]))} + ${logTex(b, String(parts[1]))}`;
        v = fr(Math.round(Math.log(t) / Math.log(b)));
      } else {
        const y = r.pick([2, 3, 5, 6, 7].filter((x) => x % b !== 0));
        src = `${logSrc(b, String(y * b ** k))} - ${logSrc(b, String(y))}`;
        q = `${logTex(b, String(y * b ** k))} - ${logTex(b, String(y))}`;
        v = fr(k);
      }
    }
    return { prompt: w.prompts.evaluate, q, answer: num(v.toNumber()), show: v.tex(), plain: plainFrac(v), format: "exact", solution: { kind: "powers", spec: { topic: "logs", src } } };
  },

  surds(r, L, w) {
    const M = [2, 3, 5, 6, 7, 10, 11];
    if (L === 1) {
      const [k, m] = [r.int(2, 6), r.pick(M)];
      const n = k * k * m;
      return { prompt: w.prompts.surds, q: `\\sqrt{${n}}`, answer: num(k * Math.sqrt(m), 1e-9, { surd: true }), show: `${k}\\sqrt{${m}}`, plain: `${k}sqrt(${m})`, format: "exact", solution: { kind: "powers", spec: { topic: "surds", src: `√${n}` } } };
    }
    if (L === 2) {
      const m = r.pick(M.slice(0, 4));
      let c: number[];
      do c = [r.int(1, 5), r.int(1, 5), r.int(1, 5)];
      while (c[0] + c[1] - c[2] === 0 || c[0] === c[1] || c[1] === c[2] || c[0] === c[2]);
      const k = c[0] + c[1] - c[2];
      const ns = c.map((x) => x * x * m);
      const src = `√${ns[0]} + √${ns[1]} - √${ns[2]}`;
      return { prompt: w.prompts.surds, q: `\\sqrt{${ns[0]}} + \\sqrt{${ns[1]}} - \\sqrt{${ns[2]}}`, answer: num(k * Math.sqrt(m), 1e-9, { surd: true }), show: surdTex(fr(0), fr(k), m), plain: `${k}sqrt(${m})`, format: "exact", solution: { kind: "powers", spec: { topic: "surds", src } } };
    }
    if (r.next() < 0.5) {
      const [a, b] = [r.int(1, 12), r.pick([2, 3, 5, 6, 7])];
      if (a % b === 0 && a / b === 1) return GENS.surds(r, 3, w);
      const coef = fr(a, b);
      return { prompt: w.prompts.rationalise, q: `\\frac{${a}}{\\sqrt{${b}}}`, answer: num(a / Math.sqrt(b), 1e-9, { surd: true }), show: surdTex(fr(0), coef, b), plain: `(${a}/${b})sqrt(${b})`, format: "exact", solution: { kind: "powers", spec: { topic: "surds", src: `${a} / √${b}` } } };
    }
    const [a, b, c] = [r.int(1, 6), r.int(2, 5), r.pick([2, 3, 5, 7])];
    const den = b * b - c;
    const p = fr(a * b, den);
    const q = fr(a, den);
    return {
      prompt: w.prompts.rationalise,
      q: `\\frac{${a}}{${b} - \\sqrt{${c}}}`,
      answer: num(a / (b - Math.sqrt(c)), 1e-9, { surd: true }),
      show: surdTex(p, q, c),
      plain: `${plainFrac(p).replace(/^(.*)$/, "($1)")} + (${plainFrac(q)})sqrt(${c})`,
      format: "exact",
      solution: { kind: "powers", spec: { topic: "surds", src: `${a} / (${b} - √${c})` } },
    };
  },

  sequences(r, L, w) {
    const sol = (topic: string, src: string) => ({ kind: "sequences" as const, spec: { topic, src } });
    const list = (vs: number[]) => `${vs.join(", ")}, …`.replace(/-/g, "−");
    const listSrc = (vs: number[]) => `${vs.join(", ")}, …`;
    const done = (prompt: string, v: number, spec: { kind: "sequences"; spec: { topic: string; src: string } }) => ({
      prompt, q: "", answer: num(v), show: String(v), plain: String(v), format: "number" as const, solution: spec,
    });
    const sub = (n: number) => String(n).replace(/\d/g, (d) => "₀₁₂₃₄₅₆₇₈₉"[Number(d)]);
    if (L === 1 || (L === 2 && r.next() < 0.5)) {
      const [a, d] = [r.int(-10, 20), r.nz(-6, 9)];
      const terms = [0, 1, 2, 3].map((i) => a + i * d);
      const n = r.int(10, 40);
      if (L === 1) return done(fill(w.prompts.seqTerm, { n, list: list(terms) }), a + (n - 1) * d, sol("arith", `${listSrc(terms)}; u${n}`));
      let p = r.int(2, 8);
      let q = r.int(p + 2, 15);
      if (r.next() < 0.5) [p, q] = [q, p];
      const [x, y] = [a + (p - 1) * d, a + (q - 1) * d];
      const n2 = r.int(16, 30);
      return done(fill(w.prompts.seqTwo, { a: `u${sub(p)} = ${x}`.replace(/-/g, "−"), b: `u${sub(q)} = ${y}`.replace(/-/g, "−"), c: `u${sub(n2)}` }), a + (n2 - 1) * d, sol("arith", `u${p} = ${x}, u${q} = ${y}; u${n2}`));
    }
    if (L === 2) {
      const [a, ratio] = [r.nz(-4, 5), r.pick([2, 3, -2, -3] as const)];
      const terms = [0, 1, 2, 3].map((i) => a * ratio ** i);
      const n = r.int(6, 9);
      return done(fill(w.prompts.seqTerm, { n, list: list(terms) }), a * ratio ** (n - 1), sol("geom", `${listSrc(terms)}; u${n}`));
    }
    // A quadratic rule an² + bn + c.
    const [a, b, c] = [r.int(1, 3), r.int(-5, 5), r.int(-5, 6)];
    const u = (n: number) => a * n * n + b * n + c;
    const terms = [1, 2, 3, 4, 5].map(u);
    const n = r.int(10, 25);
    return done(fill(w.prompts.seqTerm, { n, list: list(terms) }), u(n), sol("pattern", `${terms.join(", ")}; u${n}`));
  },
  series(r, L, w) {
    const sol = (topic: string, src: string) => ({ kind: "sequences" as const, spec: { topic, src } });
    const list = (vs: string[]) => `${vs.join(", ")}, …`.replace(/-/g, "−");
    if (L === 1) {
      const [a, d] = [r.int(-5, 15), r.nz(-3, 8)];
      const n = r.int(10, 30);
      const terms = [0, 1, 2, 3].map((i) => String(a + i * d));
      const v = (n * (2 * a + (n - 1) * d)) / 2;
      return { prompt: fill(w.prompts.serSum, { n, list: list(terms) }), q: "", answer: num(v), show: String(v), plain: String(v), format: "number", solution: sol("arith", `${terms.join(", ")}, …; S${n}`) };
    }
    if (L === 2) {
      if (r.next() < 0.5) {
        const [a, ratio, n] = [r.int(1, 5), r.pick([2, 3] as const), r.int(5, 8)];
        const terms = [0, 1, 2, 3].map((i) => String(a * ratio ** i));
        const v = (a * (ratio ** n - 1)) / (ratio - 1);
        return { prompt: fill(w.prompts.serSum, { n, list: list(terms) }), q: "", answer: num(v), show: String(v), plain: String(v), format: "number", solution: sol("geom", `${terms.join(", ")}, …; S${n}`) };
      }
      const [p, q] = r.pick([[1, 2], [1, 3], [2, 3], [-1, 2], [3, 4], [-1, 3], [-2, 3]] as const);
      const a = r.int(1, 3) * q ** 3;
      const terms = [0, 1, 2, 3].map((i) => (a * p ** i) / q ** i);
      const v = fr(a * q, q - p);
      return {
        prompt: fill(w.prompts.serInf, { list: list(terms.map(String)) }),
        q: "",
        answer: num(v.toNumber(), 1e-9, { lowest: true }),
        show: v.tex(),
        plain: plainFrac(v),
        format: "fraction",
        solution: sol("geom", `${terms.join(", ")}, …; S∞`),
      };
    }
    const N = r.int(10, 30);
    if (r.next() < 0.5) {
      // 1/(k(k + m)) telescopes.
      const m = r.pick([1, 1, 2] as const);
      let v = fr(0);
      for (let k = 1; k <= N; k++) v = v.add(fr(1, k * (k + m)));
      return {
        prompt: w.prompts.serSigma,
        q: `\\sum_{k=1}^{${N}} \\frac{1}{k(k + ${m})}`,
        answer: num(v.toNumber(), 1e-9, { lowest: true }),
        show: v.tex(),
        plain: plainFrac(v),
        format: "fraction",
        solution: sol("sigma", `sum k=1..${N} 1/(k(k + ${m}))`),
      };
    }
    const [p, q, c] = [r.int(0, 3), r.nz(-4, 6), r.int(-5, 5)];
    const f = (k: number) => p * k * k + q * k + c;
    let v = 0;
    for (let k = 1; k <= N; k++) v += f(k);
    const body = polyStr([c, q, p], "k");
    return {
      prompt: w.prompts.serSigma,
      q: `\\sum_{k=1}^{${N}} \\left(${T(polyStr([c, q, p])).replace(/x/g, "k")}\\right)`,
      answer: num(v),
      show: String(v),
      plain: String(v),
      format: "number",
      solution: sol("sigma", `sum k=1..${N} (${body})`),
    };
  },

  functions(r, L, w) {
    const sol = (src: string) => ({ kind: "functions" as const, spec: { topic: "compose", src } });
    if (L === 1) {
      const [p, q] = [r.nz(-5, 5), r.int(-6, 6)];
      const quad = r.next() < 0.5;
      const [s, t] = [r.nz(-4, 4), r.int(-5, 5)];
      const gs = quad ? polyStr([t, 0, 1]) : polyStr([t, s]);
      const fs = polyStr([q, p]);
      const a = r.int(-4, 4);
      const g = quad ? a * a + t : s * a + t;
      const v = p * g + q;
      return {
        prompt: fill(w.prompts.fnComp, { a }), q: `f(x) = ${T(fs)}, \\quad g(x) = ${T(gs)}`, answer: num(v), show: String(v), plain: String(v), format: "number",
        solution: sol(`f(x) = ${fs}; g(x) = ${gs}; fg(${a})`),
      };
    }
    const a = r.int(-6, 9);
    let fs: string;
    let v: Frac;
    if (L === 2) {
      const [p, q] = [r.pick([2, 3, 4, 5, -2, -3] as const), r.int(-8, 8)];
      fs = polyStr([q, p]);
      v = fr(a - q, p);
    } else {
      // (p x + q)/(x + s): x = (q − s a)/(a − p).
      let p: number, q: number, s: number;
      do [p, q, s] = [r.nz(-4, 4), r.int(-6, 6), r.nz(-5, 5)];
      while (p * s === q || a === p);
      fs = `(${polyStr([q, p])})/(${polyStr([s, 1])})`;
      v = fr(q - s * a, a - p);
    }
    return {
      prompt: fill(w.prompts.fnInv, { a }), q: `f(x) = ${T(fs)}`, answer: num(v.toNumber(), 1e-9, { lowest: true }), show: v.tex(), plain: plainFrac(v),
      format: v.isInt() ? "number" : "fraction", solution: sol(`f(x) = ${fs}; f^-1(${a})`),
    };
  },

  line(r, L, w) {
    const pt = (x: number, y: number) => `(${x}, ${y})`;
    if (L < 3) {
      const x1 = r.int(-5, 5);
      const y1 = r.int(-5, 5);
      let dx = r.int(1, 4);
      let dy = L === 1 ? r.nz(-4, 4) * dx : r.nz(-7, 7);
      if (L === 2 && dy % dx === 0) dx = dx === 1 ? 2 : dx + 1;
      if (L === 2 && dy % dx === 0) dy += 1;
      const [x2, y2] = [x1 + dx, y1 + dy];
      const m = fr(dy, dx);
      const c = fr(y1).sub(m.mul(fr(x1)));
      const e = fromPoly([c, m]);
      return {
        prompt: fill(w.prompts.line, { a: pt(x1, y1), b: pt(x2, y2) }),
        q: "",
        answer: { k: "expr", e, mode: "line" },
        show: `y = ${tex(e)}`,
        plain: `y = (${plainFrac(m)})x + (${plainFrac(c)})`,
        format: "line",
        solution: { kind: "coord", spec: { topic: "line", src: `${pt(x1, y1)}, ${pt(x2, y2)}` } },
      };
    }
    const m0 = fr(r.nz(-4, 4), r.pick([1, 1, 2, 3]));
    const c0 = r.int(-6, 6);
    const [px, py] = [r.int(-5, 5), r.int(-5, 5)];
    const m = fr(-1).div(m0);
    const c = fr(py).sub(m.mul(fr(px)));
    const given = fromPoly([fr(c0), m0]);
    const givenSrc = `y = ${m0.d === 1 ? polyStr([c0, m0.n]) : `${m0.n}/${m0.d}x ${c0 < 0 ? "-" : "+"} ${Math.abs(c0)}`}`;
    const e = fromPoly([c, m]);
    return {
      prompt: fill(w.prompts.perp, { p: pt(px, py) }),
      q: `y = ${tex(given)}`,
      answer: { k: "expr", e, mode: "line" },
      show: `y = ${tex(e)}`,
      plain: `y = (${plainFrac(m)})x + (${plainFrac(c)})`,
      format: "line",
      solution: { kind: "coord", spec: { topic: "perp", src: `${givenSrc}; P${pt(px, py)}` } },
    };
  },

  distance(r, L, w) {
    const [x1, y1] = [r.int(-6, 6), r.int(-6, 6)];
    let dx: number, dy: number;
    if (L === 2) {
      const [a, b] = r.pick([[3, 4], [5, 12], [6, 8], [8, 15], [4, 3], [12, 5], [8, 6]] as const);
      [dx, dy] = [a * r.sign(), b * r.sign()];
    } else {
      do [dx, dy] = [r.int(-7, 7), r.int(-7, 7)];
      while (!dx || !dy || (L === 3 && Number.isInteger(Math.hypot(dx, dy))));
    }
    const [x2, y2] = [x1 + dx, y1 + dy];
    const A = `A(${x1}, ${y1})`;
    const B = `B(${x2}, ${y2})`;
    const solution = { kind: "coord" as const, spec: { topic: "points", src: `${A}, ${B}` } };
    if (L === 1) {
      const mx = fr(x1 + x2, 2);
      const my = fr(y1 + y2, 2);
      return { prompt: fill(w.prompts.midpoint, { a: A, b: B }), q: "", answer: { k: "tuple", vs: [mx.toNumber(), my.toNumber()], tol: 1e-9 }, show: `\\left(${mx.tex()}, \\; ${my.tex()}\\right)`, plain: `(${plainFrac(mx)}; ${plainFrac(my)})`, format: "point", solution };
    }
    const d2 = dx * dx + dy * dy;
    const { out, s } = sqrtSplit(fr(d2));
    const v = Math.sqrt(d2);
    return {
      prompt: fill(w.prompts.distance, { a: A, b: B }),
      q: "",
      answer: num(v, L === 2 ? 1e-9 : 0.0051, { surd: true }),
      show: s === 1 ? String(out.n) : `${surdTex(fr(0), out, s)} \\approx ${dp(v, 2)}`,
      plain: s === 1 ? String(out.n) : `${out.n === 1 ? "" : out.n}sqrt(${s})`,
      format: L === 2 ? "number" : "exact",
      solution,
    };
  },

  trigexact(r, L, w) {
    // sin and cos of the reference angles, exactly.
    const REF: Record<number, [string, number, string, number]> = {
      0: ["0", 0, "1", 1],
      30: ["\\frac{1}{2}", 0.5, "\\frac{\\sqrt{3}}{2}", Math.sqrt(3) / 2],
      45: ["\\frac{\\sqrt{2}}{2}", Math.SQRT1_2, "\\frac{\\sqrt{2}}{2}", Math.SQRT1_2],
      60: ["\\frac{\\sqrt{3}}{2}", Math.sqrt(3) / 2, "\\frac{1}{2}", 0.5],
      90: ["1", 1, "0", 0],
    };
    const TAN: Record<number, [string, number]> = { 0: ["0", 0], 30: ["\\frac{\\sqrt{3}}{3}", Math.sqrt(3) / 3], 45: ["1", 1], 60: ["\\sqrt{3}", Math.sqrt(3)] };
    const f = r.pick(["sin", "cos", "tan"] as const);
    let deg: number;
    do deg = L === 1 ? r.pick([30, 45, 60]) : r.pick([0, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330]);
    while (f === "tan" && deg % 180 === 90);
    const rad = (deg * Math.PI) / 180;
    const ref = [0, 30, 45, 60, 90].find((a) => [deg, 180 - deg, deg - 180, 360 - deg].includes(a))!;
    const v0 = f === "sin" ? Math.sin(rad) : f === "cos" ? Math.cos(rad) : Math.tan(rad);
    const v = Math.abs(v0) < 1e-12 ? 0 : v0;
    const mag = f === "sin" ? REF[ref][0] : f === "cos" ? REF[ref][2] : TAN[ref][0];
    const show = v === 0 ? "0" : `${v < 0 ? "-" : ""}${mag}`;
    let angleTex = `${deg}^\\circ`;
    if (L === 3) {
      const g = gcd(deg, 180);
      const [n, d] = [deg / g, 180 / g];
      angleTex = deg === 0 ? "0" : d === 1 ? `${n === 1 ? "" : n}\\pi` : `\\frac{${n === 1 ? "" : n}\\pi}{${d}}`;
    }
    const plain = show.replace(/\\sqrt\{(\d+)\}/g, "sqrt($1)").replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "($1)/($2)");
    return { prompt: w.prompts.trigexact, q: `\\${f} ${angleTex}`, answer: num(v), show, plain, format: "exact", solution: { kind: "trig", spec: { topic: "circle", angle: deg, unit: "deg" } } };
  },

  righttri(r, L, w) {
    const ang = r.int(20, 70);
    const t = (ang * Math.PI) / 180;
    const S = (v: number) => String(Math.round(v * 10) / 10);
    let given: string;
    let known: { opp?: string; adj?: string; hyp?: string; ang?: string };
    let ask: "opp" | "adj" | "hyp" | "ang";
    let v: number;
    const hyp = r.int(6, 20);
    if (L === 1) {
      known = { hyp: String(hyp), ang: String(ang) };
      ask = r.pick(["opp", "adj"] as const);
      v = ask === "opp" ? hyp * Math.sin(t) : hyp * Math.cos(t);
      given = "angHyp";
    } else if (L === 2) {
      const side = r.int(4, 15);
      if (r.next() < 0.5) {
        known = { adj: String(side), ang: String(ang) };
        ask = r.pick(["opp", "hyp"] as const);
        v = ask === "opp" ? side * Math.tan(t) : side / Math.cos(t);
        given = "angAdj";
      } else {
        known = { opp: String(side), ang: String(ang) };
        ask = r.pick(["adj", "hyp"] as const);
        v = ask === "adj" ? side / Math.tan(t) : side / Math.sin(t);
        given = "angOpp";
      }
    } else {
      const [a, b] = [r.int(3, 15), r.int(3, 15)];
      const kind = r.int(0, 2);
      ask = "ang";
      if (kind === 0) {
        known = { opp: String(a), adj: String(b) };
        v = (Math.atan(a / b) * 180) / Math.PI;
        given = "oppAdj";
      } else {
        const h = Math.max(a, b) + r.int(1, 6);
        const s = Math.min(a, b);
        if (kind === 1) {
          known = { opp: String(s), hyp: String(h) };
          v = (Math.asin(s / h) * 180) / Math.PI;
          given = "oppHyp";
        } else {
          known = { adj: String(s), hyp: String(h) };
          v = (Math.acos(s / h) * 180) / Math.PI;
          given = "adjHyp";
        }
      }
    }
    // The values the trig tool needs; unknown sides get a placeholder it ignores for this case.
    const spec = { topic: "right", given, opp: known.opp ?? "3", adj: known.adj ?? "4", hyp: known.hyp ?? S(hyp), ang: known.ang ?? "30" };
    const pic = (x0: number, y0: number) => {
      // θ at bottom left, right angle at bottom right; roughly to scale.
      const th = ((ask === "ang" ? v : ang) * Math.PI) / 180;
      const [bw, bh] = Math.tan(th) * 210 <= 120 ? [210, 210 * Math.tan(th)] : [120 / Math.tan(th), 120];
      const [bx, by] = [x0 + 20, y0 + 135];
      const [cx, ay] = [r2(bx + bw), r2(by - bh)];
      const lab = (x: number, y: number, s: string, color: string, anchor = "middle") =>
        `<text x="${r2(x)}" y="${r2(y)}" ${FONT} font-size="15" font-weight="700" fill="${color}" text-anchor="${anchor}">${esc(s)}</text>`;
      const side = (k: "opp" | "adj" | "hyp") => (ask === k ? "x" : known[k] ?? "");
      const parts = [
        `<polygon points="${bx},${by} ${cx},${by} ${cx},${ay}" fill="#e7f5ff" stroke="${C.blue}" stroke-width="2.4" stroke-linejoin="round"/>`,
        `<path d="M${cx - 14},${by} L${cx - 14},${by - 14} L${cx},${by - 14}" fill="none" stroke="${C.blue}" stroke-width="1.6"/>`,
        `<path d="M${bx + 42},${by} A42,42 0 0 0 ${r2(bx + 42 * Math.cos(Math.atan2(by - ay, cx - bx)))},${r2(by - 42 * Math.sin(Math.atan2(by - ay, cx - bx)))}" fill="none" stroke="${C.orange}" stroke-width="2"/>`,
        lab(bx + 58, by - 8, ask === "ang" ? "θ" : `${known.ang}°`, C.orange, "start"),
      ];
      const hs = side("hyp");
      const os = side("opp");
      const as = side("adj");
      if (as) parts.push(lab((bx + cx) / 2, by + 20, as, as === "x" ? C.red : C.ink));
      if (os) parts.push(lab(cx + 10, (by + ay) / 2 + 5, os, os === "x" ? C.red : C.ink, "start"));
      if (hs) parts.push(lab((bx + cx) / 2 - 12, (by + ay) / 2 - 6, hs, hs === "x" ? C.red : C.ink, "end"));
      return parts.join("");
    };
    return {
      prompt: ask === "ang" ? w.prompts.rightAngle : w.prompts.rightSide,
      q: "",
      pic: { svg: pic, h: 160 },
      answer: num(v, 0.0051),
      show: `${ask === "ang" ? "\\theta" : "x"} \\approx ${dp(v, 2)}${ask === "ang" ? "^\\circ" : ""}`,
      plain: dp(v, 2),
      format: "dp2",
      solution: { kind: "trig", spec },
    };
  },

  circles(r, L, w) {
    // An angle (or a length) from a circle theorem, with the figure.
    const make = (src: string, given: string, ask: string, v: number, angle = true) => {
      const full = `${src}; find ${ask}`;
      const fig = circleFigure(full);
      return {
        prompt: fill(w.prompts.circleFind, { a: angle ? `∠${ask}` : ask }),
        q: given,
        pic: fig ? { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${fig.svg}</g>`, h: fig.h } : undefined,
        answer: num(v, 1e-6),
        show: angle ? `${v}^\\circ` : String(v),
        plain: String(v),
        format: "number" as const,
        solution: { kind: "euclid" as const, spec: { topic: "circle", src: full } },
      };
    };
    const deg = (n: string, v: number) => `\\angle ${n} = ${v}^\\circ`;
    if (L === 1) {
      const kind = r.int(0, 2);
      const a = r.int(25, 70);
      if (kind === 0) return r.next() < 0.5 ? make(`centre; AOB = ${2 * a}`, deg("AOB", 2 * a), "ACB", a) : make(`centre; ACB = ${a}`, deg("ACB", a), "AOB", 2 * a);
      if (kind === 1) return make(`semicircle; CAB = ${a}`, deg("CAB", a), "CBA", 90 - a);
      return make(`segment; ACB = ${a}`, deg("ACB", a), "ADB", a);
    }
    if (L === 2) {
      if (r.next() < 0.5) {
        const [A, B] = [r.int(55, 125), r.int(55, 125)];
        const src = `cyclic; A = ${A}; B = ${B}`;
        const q = `${deg("DAB", A)},\\quad ${deg("ABC", B)}`;
        return r.next() < 0.5 ? make(src, q, "BCD", 180 - A) : make(src, q, "CDA", 180 - B);
      }
      const P = 2 * r.int(15, 50);
      return r.next() < 0.5 ? make(`tangents; APB = ${P}`, deg("APB", P), "AOB", 180 - P) : make(`tangents; APB = ${P}`, deg("APB", P), "PAB", (180 - P) / 2);
    }
    const kind = r.int(0, 2);
    if (kind === 0) {
      const [a, b] = [r.int(40, 75), r.int(40, 75)];
      return make(`alternate; TAB = ${a}; SAC = ${b}`, `${deg("TAB", a)},\\quad ${deg("SAC", b)}`, "BAC", 180 - a - b);
    }
    if (kind === 1) {
      const P = 2 * r.int(15, 50);
      return make(`tangents; APB = ${P}`, deg("APB", P), "OAB", P / 2);
    }
    const [m, h, k] = r.pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [6, 8, 10], [9, 12, 15], [12, 16, 20]] as const);
    const [half, om] = r.next() < 0.5 ? [m, h] : [h, m];
    return make(`chord; AB = ${2 * half}; OA = ${k}`, `AB = ${2 * half},\\quad OA = ${k}`, "OM", om, false);
  },

  similarity(r, L, w) {
    const sol = (src: string) => ({ kind: "euclid" as const, spec: { topic: "similar", src } });
    const out = (prompt: string, q: string, v: number, src: string) => ({
      prompt,
      q,
      answer: num(v, 1e-6),
      show: dp(v, 3),
      plain: dp(v, 3),
      format: "number" as const,
      solution: sol(src),
    });
    if (L === 1) {
      const a = 2 * r.int(1, 5);
      const k = r.pick([2, 3, 1.5, 0.5, 2.5]);
      const b = r.int(3, 9);
      const [de, ef] = [a * k, b * k];
      return out(fill(w.prompts.similarSide, { a: "ABC", b: "DEF", s: "EF" }), `AB = ${a},\\quad BC = ${b},\\quad DE = ${dp(de, 3)}`, ef, `ABC ~ DEF; AB = ${a}; BC = ${b}; DE = ${dp(de, 3)}; find EF`);
    }
    if (L === 2) {
      const [a, b, m] = [r.int(2, 6), r.int(2, 8), r.int(1, 3)];
      return out(w.prompts.similarA, `AD = ${a},\\quad DB = ${b},\\quad DE = ${a * m}`, m * (a + b), `ADE ~ ABC; AD = ${a}; DB = ${b}; DE = ${a * m}; find BC`);
    }
    const [a, b] = r.pick([[2, 3], [3, 4], [2, 5], [3, 5], [1, 2], [1, 3], [4, 5]] as const);
    const m = r.int(1, 4);
    const kind = r.int(0, 2);
    if (kind === 0) return out(fill(w.prompts.scaleArea, { a, b, A: a * a * m }), "", b * b * m, `lengths ${a} : ${b}; area ${a * a * m} : ?`);
    if (kind === 1) return out(fill(w.prompts.scaleVolume, { a, b, V: a ** 3 * m }), "", b ** 3 * m, `lengths ${a} : ${b}; volume ${a ** 3 * m} : ?`);
    return out(fill(w.prompts.scaleAreaVolume, { a: a * a, b: b * b, V: a ** 3 * m }), "", b ** 3 * m, `areas ${a * a} : ${b * b}; volume ${a ** 3 * m} : ?`);
  },

  volume(r, L, w) {
    const sol = (src: string) => ({ kind: "euclid" as const, spec: { topic: "solids", src } });
    const pic = (src: string, ask?: string) => {
      const f = solidFigure(src, ask);
      return f ? { svg: (x: number, y: number) => `<g transform="translate(${r2(x)} ${r2(y)})">${f.svg}</g>`, h: f.h } : undefined;
    };
    const out = (prompt: string, q: string, v: number, src: string, figSrc: string, ask?: string) => {
      const whole = Math.abs(v - Math.round(v)) < 1e-9;
      return {
        prompt,
        q,
        pic: pic(figSrc, ask),
        answer: num(v, whole ? 1e-9 : 0.0051),
        show: whole ? String(Math.round(v)) : dp(v, 2),
        plain: whole ? String(Math.round(v)) : dp(v, 2),
        format: whole ? ("number" as const) : ("dp2" as const),
        solution: sol(src),
      };
    };
    if (L === 1) {
      const kind = r.int(0, 2);
      if (kind === 0) {
        const [l, wd, h] = [r.int(2, 9), r.int(2, 9), r.int(2, 9)];
        const src = `cuboid ${l} x ${wd} x ${h}`;
        return out(w.prompts.volume, "", l * wd * h, src, src);
      }
      if (kind === 1) {
        const [b, h, l] = [2 * r.int(2, 5), r.int(2, 8), r.int(4, 12)];
        const src = `prism b = ${b} h = ${h} l = ${l}`;
        return out(w.prompts.volume, "", (b * h * l) / 2, src, src);
      }
      const [rr, h] = [r.int(2, 8), r.int(3, 15)];
      const src = `cylinder r = ${rr} h = ${h}`;
      return out(w.prompts.volume, "", Math.PI * rr * rr * h, src, src);
    }
    if (L === 2) {
      const kind = r.int(0, 3);
      if (kind === 0) {
        const [rr, h] = [r.int(2, 8), r.int(3, 15)];
        const src = `cylinder r = ${rr} h = ${h}`;
        return out(w.prompts.surface, "", 2 * Math.PI * rr * rr + 2 * Math.PI * rr * h, src, src);
      }
      if (kind === 1) {
        const [rr, h, l] = r.pick([[3, 4, 5], [5, 12, 13], [6, 8, 10], [8, 15, 17], [9, 12, 15]] as const);
        const src = `cone r = ${rr} h = ${h}`;
        return r.next() < 0.5 ? out(w.prompts.volume, "", (Math.PI * rr * rr * h) / 3, src, src) : out(w.prompts.surface, "", Math.PI * rr * rr + Math.PI * rr * l, src, src);
      }
      if (kind === 2) {
        const rr = r.int(2, 10);
        const src = `sphere r = ${rr}`;
        return r.next() < 0.5 ? out(w.prompts.volume, "", (4 / 3) * Math.PI * rr ** 3, src, src) : out(w.prompts.surface, "", 4 * Math.PI * rr * rr, src, src);
      }
      const [a, h] = [2 * r.int(2, 6), r.int(3, 12)];
      const src = `pyramid a = ${a} h = ${h}`;
      return out(w.prompts.volume, "", (a * a * h) / 3, src, src);
    }
    // A length from the volume.
    const kind = r.int(0, 2);
    if (kind === 0) {
      const rr = r.int(2, 8);
      const V = r.int(100, 900);
      const h = V / (Math.PI * rr * rr);
      return out(fill(w.prompts.solidDim, { V, d: "h" }), `V = ${V}`, h, `cylinder r = ${rr} V = ${V}`, `cylinder r = ${rr} h = ${h}`, "h");
    }
    if (kind === 1) {
      const V = r.int(100, 2000);
      const rr = Math.cbrt((3 * V) / (4 * Math.PI));
      return out(fill(w.prompts.solidDim, { V, d: "r" }), `V = ${V}`, rr, `sphere V = ${V}`, `sphere r = ${rr}`, "r");
    }
    const rr = r.int(2, 8);
    const V = r.int(50, 600);
    const h = (3 * V) / (Math.PI * rr * rr);
    return out(fill(w.prompts.solidDim, { V, d: "h" }), `V = ${V}`, h, `cone r = ${rr} V = ${V}`, `cone r = ${rr} h = ${h}`, "h");
  },

  identities(r, L, w) {
    const sol = (topic: string, src: string) => ({ kind: "identities" as const, spec: { topic, src } });
    if (L === 1) {
      // sin, cos, tan of 15°, 75°, 105°, 165°: from the compound angle formulas.
      const f = r.pick(["sin", "cos", "tan"] as const);
      const deg = r.pick([15, 75, 105, 165]);
      const t = (deg * Math.PI) / 180;
      const v = f === "sin" ? Math.sin(t) : f === "cos" ? Math.cos(t) : Math.tan(t);
      const [s6, s2, s3] = [Math.sqrt(6), Math.sqrt(2), Math.sqrt(3)];
      const forms: [number, string, string, string, string][] = [
        [(s6 + s2) / 4, "\\frac{\\sqrt{6} + \\sqrt{2}}{4}", "(sqrt(6) + sqrt(2))/4", "-\\frac{\\sqrt{6} + \\sqrt{2}}{4}", "-(sqrt(6) + sqrt(2))/4"],
        [(s6 - s2) / 4, "\\frac{\\sqrt{6} - \\sqrt{2}}{4}", "(sqrt(6) - sqrt(2))/4", "\\frac{\\sqrt{2} - \\sqrt{6}}{4}", "(sqrt(2) - sqrt(6))/4"],
        [2 + s3, "2 + \\sqrt{3}", "2 + sqrt(3)", "-2 - \\sqrt{3}", "-2 - sqrt(3)"],
        [2 - s3, "2 - \\sqrt{3}", "2 - sqrt(3)", "\\sqrt{3} - 2", "sqrt(3) - 2"],
      ];
      const m = forms.find((x) => Math.abs(Math.abs(v) - x[0]) < 1e-9)!;
      const [show, plain] = v > 0 ? [m[1], m[2]] : [m[3], m[4]];
      return { prompt: w.prompts.trigexact, q: `\\${f} ${deg}^\\circ`, answer: num(v), show, plain, format: "exact", solution: sol("compound", `${f} ${deg}°`) };
    }
    if (L === 2) {
      // A Pythagorean triple gives sin A, cos A and tan A; the double angle formulas give the rest.
      let [a, b, h] = r.pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29]] as const) as unknown as [number, number, number];
      if (r.next() < 0.5) [a, b] = [b, a];
      const f = r.pick(["sin", "cos", "tan"] as const);
      const g = r.pick(["sin", "cos", "tan"] as const);
      const given = f === "sin" ? fr(a, h) : f === "cos" ? fr(b, h) : fr(a, b);
      const v = g === "sin" ? fr(2 * a * b, h * h) : g === "cos" ? fr(b * b - a * a, h * h) : fr(2 * a * b, b * b - a * a);
      return {
        prompt: fill(w.prompts.idDouble, { f, v: plainFrac(given) }),
        q: `\\${g} 2A`,
        answer: num(v.toNumber(), 1e-9, { lowest: true }),
        show: v.tex(),
        plain: plainFrac(v),
        format: "fraction",
        solution: sol("compound", `${f} A = ${plainFrac(given)}, A acute; ${g} 2A`),
      };
    }
    // The greatest value of a sin x + b cos x is R = √(a² + b²).
    const [a, b] = [r.nz(-6, 6), r.nz(-6, 6)];
    const { out, s } = sqrtSplit(fr(a * a + b * b));
    const R = Math.sqrt(a * a + b * b);
    const src = `${a} sin x ${b < 0 ? "-" : "+"} ${Math.abs(b)} cos x`;
    return {
      prompt: w.prompts.idMax,
      q: `${a === 1 ? "" : a === -1 ? "-" : a}\\sin x ${b < 0 ? "-" : "+"} ${Math.abs(b) === 1 ? "" : Math.abs(b)}\\cos x`,
      answer: num(R, 1e-9, { surd: true }),
      show: s === 1 ? String(out.n) : surdTex(fr(0), out, s),
      plain: s === 1 ? String(out.n) : `${out.n === 1 ? "" : out.n}sqrt(${s})`,
      format: "exact",
      solution: sol("rform", src),
    };
  },

  vectors(r, L, w) {
    const vec = (n: number, lo: number, hi: number) => Array.from({ length: n }, () => r.int(lo, hi));
    const vs = (v: (number | string)[]) => `(${v.join(", ")})`;
    const col = (v: number[]) => `\\begin{pmatrix} ${v.join(" \\\\ ")} \\end{pmatrix}`;
    const sol = (topic: string, src: string) => ({ kind: "vectors" as const, spec: { topic, src } });
    if (L === 1) {
      const [a, b] = [vec(2, -6, 6), vec(2, -6, 6)];
      const [p, q] = [r.pick([1, 2, 3, -2] as const), r.pick([1, 2, 3, -1, -2, -3] as const)];
      const res = a.map((x, i) => p * x + q * b[i]);
      const k = (c: number, first: boolean) => (Math.abs(c) === 1 ? (c < 0 && first ? "-" : "") : String(first ? c : Math.abs(c)));
      const e = `${k(p, true)}a ${q < 0 ? "-" : "+"} ${k(q, false)}b`;
      return {
        prompt: fill(w.prompts.vecCombo, { a: vs(a), b: vs(b) }),
        q: e.replace(/([ab])/g, "\\mathbf{$1}"),
        answer: { k: "tuple", vs: res, tol: 1e-9 },
        show: col(res),
        plain: `(${res.join("; ")})`,
        format: "vector",
        solution: sol("basics", `a = ${vs(a)}; b = ${vs(b)}; ${e}`),
      };
    }
    if (L === 2) {
      const A = vec(3, -5, 5);
      let d: number[];
      do d = vec(3, -6, 6);
      while (d.filter(Boolean).length < 2);
      const B = A.map((x, i) => x + d[i]);
      const d2 = d.reduce((s, x) => s + x * x, 0);
      const { out, s } = sqrtSplit(fr(d2));
      const v = Math.sqrt(d2);
      return {
        prompt: fill(w.prompts.vecLength, { a: `A${vs(A)}`, b: `B${vs(B)}` }),
        q: "",
        answer: num(v, 1e-9, { surd: true }),
        show: s === 1 ? String(out.n) : `${surdTex(fr(0), out, s)} \\approx ${dp(v, 2)}`,
        plain: s === 1 ? String(out.n) : `${out.n === 1 ? "" : out.n}sqrt(${s})`,
        format: "exact",
        solution: sol("basics", `A${vs(A)}; B${vs(B)}`),
      };
    }
    // a = (k, p, q), b = (m, k, n) are perpendicular when k·m + p·k + q·n = 0.
    let p: number, q: number, m: number, n: number;
    do [p, q, m, n] = [r.nz(-5, 5), r.nz(-5, 5), r.nz(-5, 5), r.nz(-5, 5)];
    while (m + p === 0);
    const kv = fr(-q * n, m + p);
    const at = (v: (number | string)[]) => v.map((x) => (x === "k" ? `${kv.n}/${kv.d}` : x));
    return {
      prompt: fill(w.prompts.vecPerp, { a: vs(["k", p, q]), b: vs([m, "k", n]) }),
      q: "",
      answer: num(kv.toNumber(), 1e-9, { lowest: true }),
      show: kv.tex(),
      plain: plainFrac(kv),
      format: "fraction",
      solution: sol("dot", `a = ${vs(at(["k", p, q]))}; b = ${vs(at([m, "k", n]))}`),
    };
  },
  dotangle(r, L, w) {
    const vs = (v: number[]) => `(${v.join(", ")})`;
    const sol = (a: number[], b: number[]) => ({ kind: "vectors" as const, spec: { topic: "dot", src: `a = ${vs(a)}; b = ${vs(b)}` } });
    const nonzero = (n: number) => {
      for (;;) {
        const v = Array.from({ length: n }, () => r.int(-5, 5));
        if (v.filter(Boolean).length >= 2) return v;
      }
    };
    const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);
    if (L === 1) {
      const [a, b] = [nonzero(3), nonzero(3)];
      const v = dot(a, b);
      return { prompt: fill(w.prompts.vecDot, { a: vs(a), b: vs(b) }), q: "", answer: num(v), show: String(v), plain: String(v), format: "number", solution: sol(a, b) };
    }
    if (L === 2) {
      const n = r.pick([2, 3] as const);
      let a: number[], b: number[], c: number;
      do [a, b] = [nonzero(n), nonzero(n)], (c = dot(a, b) / Math.hypot(...a) / Math.hypot(...b));
      while (Math.abs(c) > 0.98 || Math.abs(c) < 1e-9);
      const v = (Math.acos(c) * 180) / Math.PI;
      return { prompt: fill(w.prompts.vecAngle, { a: vs(a), b: vs(b) }), q: "", answer: num(v, 0.0051), show: `${dp(v, 2)}^\\circ`, plain: dp(v, 2), format: "dp2", solution: sol(a, b) };
    }
    // Pairs with a whole-number angle, scaled and turned so they look different every time.
    const [a0, b0, deg] = r.pick([
      [[1, 1, 0], [0, 1, 1], 60],
      [[1, 0, 1], [0, 1, 1], 60],
      [[1, 0, 0], [1, 1, 0], 45],
      [[1, 1, 0], [-1, 0, 1], 120],
      [[1, 0, 0], [-1, 1, 0], 135],
      [[2, 1, 1], [1, 1, 0], 30],
      [[2, 1, 1], [-1, -1, 0], 150],
      [[1, 2, 2], [2, -2, 1], 90],
      [[1, 1, 1], [1, 1, -2], 90],
    ] as const);
    const perm = r.pick([[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]] as const);
    const signs = [r.sign(), r.sign(), r.sign()];
    const turn = (v: readonly number[], k: number) => perm.map((j, i) => signs[i] * k * v[j] || 0);
    const [a, b] = [turn(a0, r.int(1, 3)), turn(b0, r.int(1, 2))];
    return { prompt: fill(w.prompts.vecAngleExact, { a: vs(a), b: vs(b) }), q: "", answer: num(deg), show: `${deg}^\\circ`, plain: String(deg), format: "number", solution: sol(a, b) };
  },
  differentiate(r, L, w) {
    let src: string;
    if (L === 1) {
      const n = r.int(3, 5);
      const cs = Array.from({ length: n + 1 }, (_, k) => (k === n ? r.nz(-6, 6) : r.next() < 0.6 ? r.int(-9, 9) : 0));
      src = polyStr(cs);
    } else if (L === 2) {
      const [a, b, k, n] = [r.int(2, 5), r.nz(-6, 6), r.nz(-4, 4), r.int(2, 5)];
      src = r.pick([`(${polyStr([b, a])})^${n}`, `e^(${k}x)`, `sin(${a}x)`, `cos(${a}x)`, `${a}x^2 + ${Math.abs(b)}/x`, `${a}sqrt(x)`, `${a}e^(${k}x) + x^${n}`]);
    } else {
      const [a, n] = [r.int(1, 5), r.int(2, 4)];
      src = r.pick([`x^${n} e^x`, `x^${n} sin x`, `x cos(${a}x)`, `ln(x^2 + ${a})`, `x/(x + ${a})`, `(x^2 + ${a})^${n}`, `e^(x^2)`, `(x^2 + 1)/(x - ${a})`, `x ln x`, `e^(${a}x) sin x`]);
    }
    const f = parseE(src);
    const d = simp(derive(f));
    return { prompt: w.prompts.differentiate, q: `y = ${tex(f)}`, answer: { k: "expr", e: d }, show: `\\frac{dy}{dx} = ${tex(d)}`, plain: plainE(d), format: "expr", solution: { kind: "deriv", spec: { topic: "rules", src, at: "" } } };
  },

  tangent(r, L, w) {
    let src: string;
    let at: number;
    if (L === 2) {
      const pick = r.int(0, 2);
      if (pick === 0) [src, at] = [`sqrt(x)`, r.pick([1, 4, 9, 16])];
      else if (pick === 1) [src, at] = [`${r.int(1, 6)}/x`, r.pick([1, 2, 3, -1, -2])];
      else [src, at] = [`x^3 - ${r.int(1, 9)}x`, r.int(-3, 3)];
    } else {
      src = polyStr([r.int(-6, 6), r.int(-6, 6), r.nz(-4, 4), r.next() < 0.5 ? r.nz(-2, 2) : 0]);
      at = r.int(-3, 3);
    }
    const f = parseE(src);
    const d = derive(f);
    const m = evalE(d, at);
    const y0 = evalE(f, at);
    const mF = toFrac(m);
    if (L < 3)
      return { prompt: fill(w.prompts.gradient, { a: at }), q: `y = ${tex(f)}`, answer: num(m), show: `\\frac{dy}{dx}\\Big|_{x = ${at}} = ${mF.tex()}`, plain: plainFrac(mF), format: "exact", solution: { kind: "deriv", spec: { topic: "tangent", src, at: String(at) } } };
    const c = toFrac(y0 - m * at);
    const e = fromPoly([c, mF]);
    return { prompt: fill(w.prompts.tangent, { a: at }), q: `y = ${tex(f)}`, answer: { k: "expr", e, mode: "line" }, show: `y = ${tex(e)}`, plain: `y = (${plainFrac(mF)})x + (${plainFrac(c)})`, format: "line", solution: { kind: "deriv", spec: { topic: "tangent", src, at: String(at) } } };
  },

  stationary(r, L, w) {
    let cs: number[];
    let xs: number[];
    if (L === 1) {
      const [a, h] = [r.nz(-3, 3), r.int(-5, 5)];
      cs = [r.int(-9, 9), -2 * a * h, a];
      xs = [h];
    } else if (L === 2) {
      let p: number, q: number, k: number;
      do [p, q, k] = [r.int(-4, 4), r.int(-4, 4), r.pick([1, 2])];
      while (p === q || (k === 1 && (p + q) % 2 !== 0));
      // f′ = 3k(x − p)(x − q)
      cs = [r.int(-9, 9), 3 * k * p * q, (-3 * k * (p + q)) / 2, k];
      xs = [p, q].sort((a, b) => a - b);
    } else if (r.next() < 0.5) {
      const a = r.int(1, 3);
      cs = [r.int(-9, 9), 0, -2 * a * a, 0, 1];
      xs = [-a, 0, a];
    } else {
      const p = r.nz(-2, 2);
      cs = [r.int(-9, 9), 0, 0, -4 * p, 1];
      xs = [0, 3 * p].sort((a, b) => a - b);
    }
    const src = polyStr(cs);
    return { prompt: w.prompts.stationary, q: `y = ${T(src)}`, answer: { k: "set", vs: xs, tol: 1e-9 }, show: xs.map((x) => `x = ${x}`).join(", \\; "), plain: xs.join("; "), format: "roots", solution: { kind: "deriv", spec: { topic: "stationary", src, at: "" } } };
  },

  integrate(r, L, w) {
    let src: string;
    if (L === 1) {
      const n = r.int(2, 4);
      const cs = Array.from({ length: n + 1 }, (_, k) => (k === n || r.next() < 0.6 ? r.nz(-5, 5) * (k + 1) : 0));
      src = polyStr(cs);
    } else if (L === 2) {
      const [a, k] = [r.int(1, 6), r.nz(-3, 3)];
      src = r.pick([`${a}/x^2`, `${3 * a}sqrt(x)`, `e^(${k}x)`, `${a}/x`, `x^2 + ${a}/x^2`, `${2 * a}x + e^x`]);
    } else {
      const [a, b, n] = [r.int(2, 5), r.nz(-5, 5), r.int(2, 4)];
      src = r.pick([`sin(${a}x)`, `cos(${a}x)`, `(${polyStr([b, a])})^${n}`, `e^(${a}x ${b < 0 ? "-" : "+"} ${Math.abs(b)})`, `${a}cos x - sin(${a}x)`, `1/(${polyStr([b, a])})`]);
    }
    const f = parseE(src);
    const Fe = antiderivative(f)!;
    return {
      prompt: w.prompts.integrate,
      q: `\\int ${tex(f)} \\, dx`,
      answer: { k: "expr", e: Fe, mode: "plusC" },
      show: `${tex(Fe)} + C`,
      plain: `${plainE(Fe)} + C`,
      format: "antiderivative",
      steps: [`\\int ${tex(f)} \\, dx = ${tex(Fe)} + C`, `\\frac{d}{dx}\\left(${tex(Fe)}\\right) = ${tex(simp(derive(Fe)))}`],
    };
  },

  definite(r, L, w) {
    let src: string;
    let a: string;
    let b: string;
    let v: number;
    let show: string;
    if (L === 1) {
      const cs = [r.int(0, 6), r.int(0, 6), r.int(1, 4)];
      const [lo, hi] = [r.int(0, 2), r.int(3, 4)];
      src = polyStr(cs);
      [a, b] = [String(lo), String(hi)];
      const I = cs.reduce((acc, c, k) => acc.add(fr(c * (hi ** (k + 1) - lo ** (k + 1)), k + 1)), fr(0));
      v = I.toNumber();
      show = I.tex();
    } else if (L === 2) {
      const pick = r.int(0, 2);
      if (pick === 0) {
        const k = r.int(2, 5);
        [src, a, b] = [`1/x^2`, "1", String(k)];
        const I = fr(k - 1, k);
        [v, show] = [I.toNumber(), I.tex()];
      } else if (pick === 1) {
        const k = r.pick([4, 9, 16]);
        [src, a, b] = [`sqrt(x)`, "0", String(k)];
        const I = fr(2 * Math.sqrt(k) ** 3, 3);
        [v, show] = [I.toNumber(), I.tex()];
      } else {
        const [p, q] = [r.int(1, 3), r.int(4, 6)];
        const c = r.int(1, 6);
        src = `x^3 + ${c}`;
        [a, b] = [String(p), String(q)];
        const I = fr(q ** 4 - p ** 4, 4).add(fr(c * (q - p)));
        [v, show] = [I.toNumber(), I.tex()];
      }
    } else {
      const pick = r.int(0, 3);
      const k = r.int(2, 4);
      if (pick === 0) [src, a, b, v, show] = [`e^x`, "0", String(k), Math.exp(k) - 1, `e^{${k}} - 1`];
      else if (pick === 1) [src, a, b, v, show] = [`1/x`, "1", String(k), Math.log(k), `\\ln ${k}`];
      else if (pick === 2) [src, a, b, v, show] = [`sin x`, "0", "pi", 2, "2"];
      else [src, a, b, v, show] = [`cos x`, "0", "pi/2", 1, "1"];
    }
    const lim = (s: string) => (s === "pi" ? "\\pi" : s === "pi/2" ? "\\frac{\\pi}{2}" : s);
    return {
      prompt: w.prompts.definite,
      q: `\\int_{${lim(a)}}^{${lim(b)}} ${T(src)} \\, dx`,
      answer: num(v, 0.0006),
      show: Number.isInteger(v) || /frac|^\d+$/.test(show) ? show : `${show} \\approx ${dp(v, 3)}`,
      plain: dp(v, 6),
      format: "dp3",
      solution: { kind: "applied", spec: { topic: "area", f: src, g: "", a, b, c: "", opt: "" } },
    };
  },

  numroots(r, L, w) {
    const sol = (topic: string, src: string) => ({ kind: "numerical" as const, spec: { topic, src } });
    if (L === 2) {
      // x_(n+1) = ∛(ax + b) or √(ax + b): three steps
      const cube = r.next() < 0.5;
      const [a, b] = [r.int(2, 5), r.int(1, 9)];
      const x0 = r.int(1, 3);
      const g = (x: number) => (cube ? Math.cbrt(a * x + b) : Math.sqrt(a * x + b));
      const x3 = g(g(g(x0)));
      const src = `${cube ? "cbrt" : "sqrt"}(${a}x + ${b})`;
      return {
        prompt: fill(w.prompts.numIterate, { a: x0 }),
        q: `x_{n+1} = ${cube ? "\\sqrt[3]" : "\\sqrt"}{${a}x_n + ${b}}`,
        answer: num(x3, 0.0006),
        show: dp(x3, 3),
        plain: dp(x3, 6),
        format: "dp3",
        solution: sol("iterate", `x = ${src}; x0 = ${x0}; 3 steps`),
      };
    }
    // Newton–Raphson: one step (level 1) or to the root (level 3)
    let src: string;
    let x0: number;
    const pick = L === 1 ? 0 : r.int(0, 3);
    if (pick === 0) {
      x0 = r.int(1, 3);
      const b = r.int(-2, 4);
      const c = -(x0 ** 3 + b * x0) + r.nz(-3, 3);
      src = polyStr([c, b, 0, 1]);
    } else if (pick === 1) {
      let k = r.int(3, 40);
      while (Number.isInteger(Math.sqrt(k))) k++;
      [src, x0] = [`x^2 - ${k}`, Math.floor(Math.sqrt(k))];
    } else if (pick === 2) [src, x0] = [`e^x - ${r.int(3, 4)}x`, r.pick([0, 2])];
    else [src, x0] = [r.pick(["x - cos x", "x + ln x - 2", "x^3 + x - 3"]), r.pick([1, 2])];
    const f = parseE(src);
    const d = simp(derive(f));
    const step = (x: number) => x - evalE(f, x) / evalE(d, x);
    let v = step(x0);
    if (L === 3) for (let i = 0; i < 30; i++) v = step(v);
    return {
      prompt: fill(L === 1 ? w.prompts.numNewton : w.prompts.numRoot, { a: x0 }),
      q: `f(x) = ${T(src)}`,
      answer: num(v, 0.0006),
      show: dp(v, 3),
      plain: dp(v, 6),
      format: "dp3",
      solution: sol("newton", L === 1 ? `${src}; x0 = ${x0}; 1 step` : `${src}; x0 = ${x0}; 3 dp`),
    };
  },

  numint(r, L, w) {
    const fs: [string, number, number][] =
      L === 1
        ? [[`x^2 + ${r.int(1, 5)}`, 0, 2], ["x^3", 1, 3], ["sqrt x", 0, 4], [`${r.int(2, 6)}/x`, 1, 3]]
        : [["e^x", 0, 1], ["ln x", 1, 3], ["sqrt(1 + x^2)", 0, 2], ["1/(1 + x)", 0, 2], ["e^(-x^2)", 0, 1], ["sqrt(1 + x^3)", 0, 2]];
    const [src, a, b] = r.pick(fs);
    const n = L === 1 ? r.pick([2, 4]) : 4;
    const simpsonRule = L === 3;
    const f = parseE(src);
    const h = (b - a) / n;
    const ys = Array.from({ length: n + 1 }, (_, i) => evalE(f, a + i * h));
    const inner = ys.slice(1, n);
    const v = simpsonRule
      ? (h / 3) * (ys[0] + ys[n] + inner.reduce((s, y, i) => s + y * (i % 2 ? 2 : 4), 0))
      : (h / 2) * (ys[0] + ys[n] + 2 * inner.reduce((s, y) => s + y, 0));
    return {
      prompt: fill(simpsonRule ? w.prompts.numSimpson : w.prompts.numTrapezium, { n }),
      q: `\\int_{${a}}^{${b}} ${T(src)} \\, dx`,
      answer: num(v, 0.0006),
      show: dp(v, 3),
      plain: dp(v, 6),
      format: "dp3",
      solution: { kind: "numerical", spec: { topic: "integrate", src: `${src}; [${a}, ${b}]; n = ${n}; ${simpsonRule ? "simpson" : "trapezium"}` } },
    };
  },

  average(r, L, w) {
    const n = r.int(5, 9);
    let xs: number[];
    let stat: "mean" | "median" | "mode" | "range" | "sd";
    let v: number;
    if (L === 1) {
      stat = r.pick(["mean", "range"] as const);
      for (;;) {
        xs = Array.from({ length: n - 1 }, () => r.int(1, 20));
        const mean = r.int(5, 15);
        const last = mean * n - xs.reduce((s, x) => s + x, 0);
        if (last >= 1 && last <= 25) {
          xs.push(last);
          break;
        }
      }
    } else if (L === 2) {
      stat = r.pick(["median", "mode"] as const);
      xs = Array.from({ length: n }, () => r.int(1, 30));
      if (stat === "mode") {
        const m = xs[0];
        xs[1] = m;
        xs[2] = m;
        const counts = new Map<number, number>();
        xs.forEach((x) => counts.set(x, (counts.get(x) ?? 0) + 1));
        if ([...counts.entries()].filter(([, c]) => c >= 3).length > 1) return GENS.average(r, L, w);
      }
    } else {
      stat = "sd";
      xs = Array.from({ length: n }, () => r.int(1, 20));
      if (new Set(xs).size === 1) xs[0]++;
    }
    // Shuffle (Fisher–Yates), so a mode or the last value doesn't sit at a fixed place.
    for (let i = xs.length - 1; i > 0; i--) {
      const j = r.int(0, i);
      [xs[i], xs[j]] = [xs[j], xs[i]];
    }
    const sorted = [...xs].sort((a, b) => a - b);
    const mean = xs.reduce((s, x) => s + x, 0) / n;
    if (stat === "mean") v = mean;
    else if (stat === "range") v = sorted[n - 1] - sorted[0];
    else if (stat === "median") v = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
    else if (stat === "mode") v = [...new Set(sorted)].reduce((best, x) => (sorted.filter((y) => y === x).length > sorted.filter((y) => y === best).length ? x : best), sorted[0]);
    else v = Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1));
    return {
      prompt: w.prompts[stat],
      q: xs.join(",\\ "),
      answer: num(v, stat === "sd" ? 0.0051 : 1e-9),
      show: stat === "sd" ? `s \\approx ${dp(v, 2)}` : String(v),
      plain: stat === "sd" ? dp(v, 2) : String(v),
      format: stat === "sd" ? "dp2" : "number",
      solution: { kind: "statistics", spec: { topic: "data", values: xs.join(" "), chart: "dot", bins: 0 } },
    };
  },

  probability(r, L, w) {
    if (L === 1) {
      const kind = r.pick(["even", "greater", "prime", "mult3"] as const);
      const k = r.int(2, 5);
      const good = kind === "even" ? [2, 4, 6] : kind === "greater" ? [1, 2, 3, 4, 5, 6].filter((x) => x > k) : kind === "prime" ? [2, 3, 5] : [3, 6];
      const p = fr(good.length, 6);
      return {
        prompt: fill(w.prompts.die, { event: fill(w.events[kind], { k }) }),
        q: "",
        answer: num(p.toNumber(), 1e-9, { lowest: true }),
        show: p.tex(),
        plain: plainFrac(p),
        format: "fraction",
        steps: [`\\{${good.join(", ")}\\}: \\quad P = \\frac{${good.length}}{6} = ${p.tex()}`],
      };
    }
    if (L === 2) {
      const k = r.int(2, 12);
      const pairs: string[] = [];
      for (let a = 1; a <= 6; a++) if (k - a >= 1 && k - a <= 6) pairs.push(`(${a}, ${k - a})`);
      const p = fr(pairs.length, 36);
      return {
        prompt: fill(w.prompts.dice, { k }),
        q: "",
        answer: num(p.toNumber(), 1e-9, { lowest: true }),
        show: p.tex(),
        plain: plainFrac(p),
        format: "fraction",
        steps: [`${pairs.join(",\\ ")}`, `P = \\frac{${pairs.length}}{36} = ${p.tex()}`],
      };
    }
    const [red, blue] = [r.int(3, 8), r.int(2, 7)];
    const n = red + blue;
    const p = fr(red * (red - 1), n * (n - 1));
    return {
      prompt: fill(w.prompts.marbles, { r: red, b: blue }),
      q: "",
      answer: num(p.toNumber(), 1e-9, { lowest: true }),
      show: p.tex(),
      plain: plainFrac(p),
      format: "fraction",
      steps: [`P = \\frac{${red}}{${n}} \\cdot \\frac{${red - 1}}{${n - 1}} = \\frac{${red * (red - 1)}}{${n * (n - 1)}} = ${p.tex()}`],
      solution: { kind: "statistics", spec: { topic: "tree", pA: `${red}/${n}`, pBA: `${red - 1}/${n - 1}`, pBnotA: `${red}/${n - 1}`, nameA: w.marbleNames.first, nameB: w.marbleNames.second } },
    };
  },

  counting(r, L, w) {
    const fact = (k: number): number => (k <= 1 ? 1 : k * fact(k - 1));
    const count = (kind: string, n: number, k: number, word = "MISSISSIPPI") => ({ kind: "comb" as const, spec: { topic: "count", kind, n: String(n), r: String(k), word } });
    if (L === 1) {
      if (r.next() < 0.5) {
        const n = r.int(4, 7);
        return { prompt: fill(w.prompts.lineUp, { n }), q: "", answer: num(fact(n)), show: `${n}! = ${fact(n)}`, plain: String(fact(n)), format: "number", solution: count("perm", n, n) };
      }
      const [n, k] = [r.int(5, 10), r.int(2, 3)];
      const v = fact(n) / fact(n - k);
      return { prompt: fill(w.prompts.podium, { n, r: k }), q: "", answer: num(v), show: `P(${n}, ${k}) = ${v}`, plain: String(v), format: "number", solution: count("perm", n, k) };
    }
    if (L === 2) {
      const [n, k] = [r.int(6, 15), r.int(2, 4)];
      const v = Math.round(fact(n) / fact(k) / fact(n - k));
      return { prompt: fill(w.prompts.choose, { n, r: k }), q: "", answer: num(v), show: `\\binom{${n}}{${k}} = ${v}`, plain: String(v), format: "number", solution: count("comb", n, k) };
    }
    const word = r.pick(["BANANA", "LEVEL", "APPLE", "PEPPER", "LETTER", "COFFEE", "BALLOON", "SUCCESS", "STATISTICS"]);
    const counts = new Map<string, number>();
    for (const ch of word) counts.set(ch, (counts.get(ch) ?? 0) + 1);
    const v = Math.round([...counts.values()].reduce((acc, c) => acc / fact(c), fact(word.length)));
    const rep = [...counts.values()].filter((c) => c > 1).map((c) => `${c}!`).join(" \\cdot ");
    return { prompt: fill(w.prompts.word, { word }), q: "", answer: num(v), show: `\\frac{${word.length}!}{${rep}} = ${v}`, plain: String(v), format: "number", solution: count("word", 5, 3, word) };
  },

  ci(r, L, w) {
    const conf = r.pick([90, 95, 99]);
    const tail = (1 - conf / 100) / 2;
    const base = { topic: "ci", d: "", e: "", f: "", data: "", data2: "", level: String(conf), alt: "ne", seed: 1 };
    if (L === 3) {
      const n = r.pick([100, 200, 250, 400, 500]);
      const x = r.int(Math.round(n * 0.2), Math.round(n * 0.8));
      const p = x / n;
      const E = zUpper(tail) * Math.sqrt((p * (1 - p)) / n);
      return {
        prompt: fill(w.prompts.ciP, { n, x, c: conf }),
        q: "",
        answer: { k: "tuple", vs: [p - E, p + E], tol: 0.00051 },
        show: `(${dp(p - E, 3)}, \\; ${dp(p + E, 3)})`,
        plain: `(${dp(p - E, 3)}; ${dp(p + E, 3)})`,
        format: "interval",
        solution: { kind: "inference", spec: { ...base, kind: "prop", a: String(x), b: String(n), c: "" } },
      };
    }
    const n = L === 1 ? r.pick([25, 36, 49, 64, 100]) : r.int(8, 30);
    const m = r.int(20, 80) + r.pick([0, 0.5, 0.2, 0.8]);
    const s = r.int(2, 15);
    const crit = L === 1 ? zUpper(tail) : tUpper(tail, n - 1);
    const E = (crit * s) / Math.sqrt(n);
    return {
      prompt: fill(L === 1 ? w.prompts.ciZ : w.prompts.ciT, { n, m, s, c: conf }),
      q: "",
      answer: { k: "tuple", vs: [m - E, m + E], tol: 0.0051 },
      show: `(${dp(m - E, 2)}, \\; ${dp(m + E, 2)})`,
      plain: `(${dp(m - E, 2)}; ${dp(m + E, 2)})`,
      format: "interval",
      solution: { kind: "inference", spec: { ...base, kind: L === 1 ? "z" : "t", a: String(m), b: String(s), c: String(n) } },
    };
  },
};

/** A decimal that is really a simple fraction (gradients, values of derivatives) back to the fraction. */
function toFrac(v: number): Frac {
  for (let d = 1; d <= 1000; d++) {
    const n = Math.round(v * d);
    if (Math.abs(n / d - v) < 1e-9) return fr(n, d);
  }
  return fr(Math.round(v * 1e6), 1e6);
}

/** The exercise for a skill, level and seed: always the same one. */
export function exercise(skill: SkillId, level: Level, seed: number, w: PracticeWords): Exercise {
  exprMessages(w);
  const r = rngOf(seed);
  return { skill, level, seed, ...GENS[skill](r, level, w) };
}

// ---------- checking an answer ----------

export type Verdict = { ok: boolean; why?: string; close?: boolean };

const SAMPLES = [-2.71, -1.33, -0.62, 0.37, 0.91, 1.73, 2.29, 3.11, 0.17, 1.19, 2.63, -0.23, 4.37, 5.71, 7.13, -4.61];

/** "x = 2", "θ = 35°", "25%" → the bare value. */
const bare = (s: string) => s.trim().replace(/^[a-zA-Zθ]\w*\s*=\s*/, "").replace(/[%°]/g, "").trim();

function value(s: string): number {
  const t = bare(s);
  const mixed = t.match(/^(-?)(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) return (mixed[1] ? -1 : 1) * (Number(mixed[2]) + Number(mixed[3]) / Number(mixed[4]));
  const e = parseE(t);
  return evalE(e, NaN);
}
/** Split a list of values: on ";", or on ", " / "," between values when there is no decimal comma ambiguity. */
function parts(s: string): string[] {
  const t = s.replace(/^[\s([{]+|[\s)\]}]+$/g, "");
  if (t.includes(";")) return t.split(";").map((p) => p.trim()).filter(Boolean);
  return t.split(/,\s+|\s+and\s+|\s+и\s+|\s+და\s+/).map((p) => p.trim()).filter(Boolean);
}
const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol + 1e-9 * Math.max(1, Math.abs(b));

/** The factors of a product, with nested products opened: 2·(3·5) → 2, 3, 5. */
const factorsOf = (e: E): E[] => (e.k === "mul" ? e.fs.flatMap(factorsOf) : [e]);

/** Every √n in the expression has n square-free, and no root is left in a denominator. */
function simplifiedSurd(e: E, inDen = false): boolean {
  switch (e.k) {
    case "pow": {
      const half = e.e.k === "num" && e.e.v.d === 2;
      if (half) {
        if (inDen) return false;
        if (e.b.k !== "num" || !e.b.v.isInt() || sqrtSplit(e.b.v).out.n !== 1) return false;
      }
      const negative = e.e.k === "num" && e.e.v.isNeg();
      return simplifiedSurd(e.b, inDen || negative);
    }
    case "add":
      return e.ts.every((t) => simplifiedSurd(t, inDen));
    case "mul":
      return factorsOf(e).every((f) => simplifiedSurd(f, inDen));
    default:
      return true;
  }
}
/** A product of linear factors with whole, coprime coefficients (and a number in front). */
function factored(e: E): boolean {
  const fs = factorsOf(e);
  if (fs.filter((f) => f.k !== "num").length < 2 && !(fs.length === 1 && e.k === "pow")) {
    // a single bracket only counts with a number or power in front: 3(x + 2), (x + 1)^2
    if (!(e.k === "mul" && fs.some((f) => f.k === "num"))) return false;
  }
  return fs.every((f) => {
    if (f.k === "num") return true;
    const base = f.k === "pow" && f.e.k === "num" && f.e.v.isInt() && f.e.v.n > 0 ? f.b : f;
    const p = toPoly(base);
    if (!p || p.length > 2 || p.every((c) => c.isZero())) return false;
    if (!p.every((c) => c.isInt())) return false;
    return p.reduce((g, c) => gcd(g, c.n), 0) === 1;
  });
}
/** No brackets left around a sum. */
function expanded(e: E): boolean {
  const sumInside = (x: E): boolean => x.k === "add" || (x.k === "mul" && x.fs.some(sumInside)) || (x.k === "pow" && sumInside(x.b));
  const terms = e.k === "add" ? e.ts : [e];
  return terms.every((t) => !(t.k === "mul" && t.fs.some(sumInside)) && !(t.k === "pow" && sumInside(t.b)));
}

export function check(ex: Exercise, input: string, w: PracticeWords): Verdict {
  exprMessages(w);
  const src = input.trim();
  if (!src) return { ok: false, why: w.reasons.empty };
  const a = ex.answer;
  try {
    switch (a.k) {
      case "num": {
        const v = value(src);
        if (!Number.isFinite(v)) return { ok: false, why: fill(w.reasons.unreadable, { s: src }) };
        if (!near(v, a.v, a.tol)) return a.tol >= 0.0005 && near(v, a.v, a.tol * 20) ? { ok: false, close: true, why: w.reasons.rounding } : { ok: false };
        const t = bare(src);
        if (a.lowest) {
          const m = t.match(/(\d+)\s*\/\s*(\d+)\s*$/);
          if (m && gcd(Number(m[1]), Number(m[2])) !== 1) return { ok: false, close: true, why: w.reasons.notLowest };
        }
        if (a.surd && a.tol < 1e-6 && !simplifiedSurd(parseE(t))) return { ok: false, close: true, why: w.reasons.notSimplified };
        return { ok: true };
      }
      case "set":
      case "tuple": {
        let ps = parts(src);
        if (a.k === "tuple") {
          // "y = 3; x = 2" in any order.
          const named: (string | undefined)[] = ps.map((p) => p.match(/^\s*([a-z])\s*=/i)?.[1].toLowerCase());
          if (named.every((n) => n === "x" || n === "y") && new Set(named).size === ps.length) ps = (["x", "y"] as const).map((n) => ps[named.indexOf(n)] ?? "");
        }
        const vs = ps.map(value);
        if (vs.some((v) => !Number.isFinite(v))) return { ok: false, why: fill(w.reasons.unreadable, { s: src }) };
        if (vs.length !== a.vs.length) return { ok: false, why: fill(w.reasons.count, { n: a.vs.length }) };
        if (a.k === "tuple") {
          if (vs.every((v, i) => near(v, a.vs[i], a.tol))) return { ok: true };
          return a.tol >= 0.0005 && vs.every((v, i) => near(v, a.vs[i], a.tol * 20)) ? { ok: false, close: true, why: w.reasons.rounding } : { ok: false };
        }
        const left = [...a.vs];
        for (const v of vs) {
          const i = left.findIndex((x) => near(v, x, a.tol));
          if (i < 0) return { ok: false };
          left.splice(i, 1);
        }
        return { ok: true };
      }
      case "expr": {
        let t = src.replace(/[′']/g, "");
        if (t.includes("=")) t = t.slice(t.lastIndexOf("=") + 1);
        if (a.mode === "plusC") t = t.replace(/\+\s*[cC]\s*$/, "").replace(/^\s*[cC]\s*\+/, "");
        const e = parseE(t);
        let diff0: number | null = null;
        let compared = 0;
        for (const x of SAMPLES) {
          const u = evalE(e, x);
          const v = evalE(a.e, x);
          if (!Number.isFinite(u) || !Number.isFinite(v)) continue;
          compared++;
          if (a.mode === "plusC") {
            diff0 ??= u - v;
            if (!near(u - v, diff0, 1e-7 * Math.max(1, Math.abs(v)))) return { ok: false };
          } else if (!near(u, v, 1e-7 * Math.max(1, Math.abs(v)))) return { ok: false };
        }
        if (compared < 4) return { ok: false, why: fill(w.reasons.unreadable, { s: src }) };
        if (a.mode === "factor" && !factored(e)) return { ok: false, close: true, why: w.reasons.notFactored };
        if (a.mode === "expand" && !expanded(e)) return { ok: false, close: true, why: w.reasons.notExpanded };
        return { ok: true };
      }
      case "primes": {
        const e = parseE(src.replace(/[·×]/g, "*"));
        const fs = factorsOf(e);
        let prod = 1;
        let allPrime = true;
        for (const f of fs) {
          const [b, k] = f.k === "num" ? [f.v, 1] : f.k === "pow" && f.b.k === "num" && f.e.k === "num" && f.e.v.isInt() ? [f.b.v, f.e.v.n] : [null, 0];
          if (!b || !b.isInt() || k < 1) return { ok: false, why: fill(w.reasons.unreadable, { s: src }) };
          prod *= b.n ** k;
          if (!isPrime(b.n)) allPrime = false;
        }
        if (prod !== a.n) return { ok: false };
        return allPrime ? { ok: true } : { ok: false, close: true, why: fill(w.reasons.notPrime, { n: a.n }) };
      }
    }
  } catch {
    return { ok: false, why: fill(w.reasons.unreadable, { s: src }) };
  }
}
const isPrime = (n: number) => {
  if (n < 2) return false;
  for (let p = 2; p * p <= n; p++) if (n % p === 0) return false;
  return true;
};

/** What the input reads as, in LaTeX, so a typo shows before checking (null when it can't be read). */
export function preview(ex: Exercise, input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  try {
    if (ex.answer.k === "set" || ex.answer.k === "tuple") return parts(s).map((p) => tex(parseE(bare(p)))).join(", \\; ");
    let t = s.replace(/[′']/g, "");
    if (ex.answer.k === "expr" && t.includes("=")) t = t.slice(t.lastIndexOf("=") + 1);
    if (ex.answer.k === "expr" && ex.answer.mode === "plusC") return tex(parseE(t.replace(/\+\s*[cC]\s*$/, ""))) + " + C";
    if (ex.answer.k === "num") {
      const mixed = bare(t).match(/^(-?)(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
      if (mixed) return `${mixed[1]}${mixed[2]}\\frac{${mixed[3]}}{${mixed[4]}}`;
      t = bare(t);
    }
    return tex(parseE(t.replace(/[·×]/g, "*")));
  } catch {
    return null;
  }
}

// ---------- worksheets ----------

/** A sheet of questions (count 1: a single question card). */
export type PracticeSpec = { area: Area; skill: SkillId | "mixed"; level: Level; seed: number; count: number; answers: boolean };

/** The seed of question i on a sheet. */
const seedOf = (seed: number, i: number) => (Math.imul(seed ^ 0x9e3779b9, 2654435761) + i * 7919) >>> 0;

export function exercisesOf(spec: PracticeSpec, w: PracticeWords): Exercise[] {
  const skills = spec.skill === "mixed" ? [...SKILLS[spec.area]] : [spec.skill];
  const n = Math.max(1, Math.min(30, Math.round(spec.count)));
  if (n === 1) return [exercise(skills[spec.seed % skills.length], spec.level, spec.seed, w)];
  const start = spec.seed % skills.length;
  return Array.from({ length: n }, (_, i) => exercise(skills[(start + i) % skills.length], spec.level, seedOf(spec.seed, i), w));
}

function placeTex(t: string, x: number, y: number, maxW: number, color = C.ink, scale = 1): { svg: string; h: number; w: number } {
  const r = latexToSvg(t, color);
  const k = Math.min(scale, maxW / r.width);
  const [ww, hh] = [r.width * k, r.height * k];
  return {
    svg: r.svg
      .replace(/width="[\d.]+"/, `width="${r2(ww)}"`)
      .replace(/height="[\d.]+"/, `height="${r2(hh)}"`)
      .replace(/^<svg/, `<svg x="${r2(x)}" y="${r2(y)}"`),
    h: hh,
    w: ww,
  };
}
const line = (x: number, y: number, s: string, o: { size?: number; color?: string; bold?: boolean; anchor?: string } = {}) =>
  `<text x="${r2(x)}" y="${r2(y)}" ${FONT} font-size="${o.size ?? 15}" fill="${o.color ?? C.ink}" text-anchor="${o.anchor ?? "start"}"${o.bold ? ` font-weight="700"` : ""}>${esc(s)}</text>`;

export function renderPractice(spec: PracticeSpec, w: PracticeWords): RenderedSvg {
  const exs = exercisesOf(spec, w);
  const single = exs.length === 1;
  const parts: string[] = [];
  let y = 18;
  const title = `${spec.skill === "mixed" ? w.mixed : w.skills[spec.skill]} · ${w.levels[String(spec.level) as "1" | "2" | "3"]}`;
  parts.push(line(20, y + 6, title, { size: 13, color: C.grey, bold: true }));
  y += 22;
  exs.forEach((ex, i) => {
    const x0 = single ? 20 : 48;
    if (!single) parts.push(line(20, y + 15, `${i + 1}.`, { bold: true, color: C.blue }));
    for (const l of wrap(ex.prompt, single ? 70 : 66)) {
      parts.push(line(x0, y + 15, l));
      y += 21;
    }
    if (ex.q) {
      const q = placeTex(ex.q, x0 + 8, y + 4, W - x0 - 30, C.ink, 1.1);
      parts.push(q.svg);
      y += q.h + 10;
    }
    if (ex.pic) {
      parts.push(ex.pic.svg(x0 + 10, y));
      y += ex.pic.h;
    }
    if (single && spec.answers) {
      parts.push(line(x0, y + 18, w.answer + ":", { bold: true, color: C.green }));
      const a = placeTex(ex.show, x0 + 80, y + 4, W - x0 - 100, C.green);
      parts.push(a.svg);
      y += Math.max(26, a.h + 8);
    }
    y += single ? 6 : 12;
  });
  if (!single && spec.answers) {
    y += 4;
    parts.push(`<line x1="20" y1="${r2(y)}" x2="${W - 20}" y2="${r2(y)}" stroke="#ced4da" stroke-dasharray="6 4"/>`);
    y += 10;
    parts.push(line(20, y + 15, w.answers, { bold: true, color: C.green }));
    y += 26;
    exs.forEach((ex, i) => {
      parts.push(line(28, y + 15, `${i + 1}.`, { bold: true, color: C.green, size: 13 }));
      const a = placeTex(ex.show, 56, y + 2, W - 80, C.green, 0.9);
      parts.push(a.svg);
      y += Math.max(22, a.h + 6);
    });
  }
  const H = Math.ceil(y + 10);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#ffffff"/>${parts.join("")}</svg>`;
  return { svg, width: W, height: H };
}

export const PRACTICE_PRESETS: { label: string; spec: PracticeSpec }[] = AREAS.flatMap((area) =>
  LEVELS.map((level) => ({ label: `${area} ${level}`, spec: { area, skill: "mixed" as const, level, seed: 7 + level, count: 2 * SKILLS[area].length, answers: true } })),
);

/** Worked lines as a picture, for questions no tool draws. */
export function renderSteps(steps: string[]): RenderedSvg {
  const parts: string[] = [];
  let y = 12;
  for (const s of steps) {
    const t = placeTex(s, 24, y, W - 48);
    parts.push(t.svg);
    y += t.h + 14;
  }
  const H = Math.ceil(y + 4);
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#ffffff"/>${parts.join("")}</svg>`, width: W, height: H };
}
