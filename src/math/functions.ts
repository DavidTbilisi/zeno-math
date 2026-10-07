// Functions and their graphs: the domain (every restriction found and solved: denominators, even roots, logs,
// arcsin) and the range (stationary values and limits at the ends), composite functions and inverses (undoing
// the layers one by one, or by collecting y), transformations of y = f(x) step by step with the key points carried
// along, and curve sketching (intercepts, asymptotes — vertical, horizontal and oblique — stationary points and the
// signs of f and f′), exactly for polynomials and rational functions and numerically for the rest.
import { axes, C, compose, curve, dot, esc, fill, FONT, lbl, makeFrame, nt, r2, texLines, tn, W, type Caption, type Frame, type TexLine } from "./chart";
import { derive } from "./derive";
import {
  add, div, evalE, exprMessages, fn, has, isNum, key, mul, N, neg, parseE, pow, qs, qsAdd, qsMul, qsNum, qsTex, realRoots, simp, sqrtSplit, sub,
  substitute, tex, tidy, toPoly, V, X, type E, type QS,
} from "./expr";
import { Frac } from "./fraction";
import { latexToSvg, type RenderedSvg } from "./latex";

export type FnTopic = "domain" | "compose" | "transform" | "sketch";
export const FN_TOPICS: FnTopic[] = ["domain", "compose", "transform", "sketch"];
export type FnSpec = { topic: FnTopic; src: string };

export type FnWords = {
  bad: string;
  onlyX: string;
  tooBig: string;
  need: Record<FnTopic, string>;
  noLetter: string;
  domain: {
    den: string;
    root: string;
    rootPos: string;
    log: string;
    arcsin: string;
    base: string;
    periodic: string;
    solve: string;
    domain: string;
    all: string;
    empty: string;
    range: string;
    limit: string;
    smallest: string;
    largest: string;
    domainCap: string;
    rangeCap: string;
    periodicCap: string;
    numeric: string;
  };
  compose: {
    sub: string;
    domainOf: string;
    value: string;
    order: string;
    same: string;
    differ: string;
    machine: string;
  };
  inverse: {
    y: string;
    swap: string;
    subtract: string;
    add: string;
    divide: string;
    reciprocal: string;
    power: string;
    root: string;
    rootPlus: string;
    rootMinus: string;
    exp: string;
    log: string;
    undo: string;
    absDrop: string;
    collect: string;
    factorY: string;
    complete: string;
    result: string;
    domainSwap: string;
    rangeSwap: string;
    notOneToOne: string;
    restrictHint: string;
    noInverse: string;
    check: string;
    mirror: string;
  };
  transform: {
    start: string;
    stretchX: string;
    reflectY: string;
    shiftX: string;
    stretchY: string;
    reflectX: string;
    shiftY: string;
    absOut: string;
    absIn: string;
    map: string;
    full: string;
    points: string;
    notTransform: string;
  };
  sketch: {
    factor: string;
    cancel: string;
    hole: string;
    yInt: string;
    noYInt: string;
    xInt: string;
    noXInt: string;
    vert: string;
    horiz: string;
    oblique: string;
    noHoriz: string;
    deriv: string;
    stat: string;
    noStat: string;
    max: string;
    min: string;
    inflection: string;
    sides: string;
    ends: string;
    crosses: string;
    touches: string;
    positive: string;
    statCap: string;
    numeric: string;
  };
};

let words: FnWords;

// ---------- numbers: exact when they can be recognised ----------

const F = (n: number, d = 1) => new Frac(n, d);
const ZERO = F(0);
const ONE = F(1);

/** A value with how to write it: exact (3/4, √2, e², π/3) or rounded (≈ 1.234). */
type Num = { v: number; tex: string; plain: string; approx?: boolean; q?: QS };
const plainOfTex = (t: string) =>
  t
    .replace(/\\mathbb\{R\}/g, "ℝ")
    .replace(/\\mathbb\{Z\}/g, "ℤ")
    .replace(/\\varnothing/g, "∅")
    .replace(/\\\{|\\\}/g, (m) => (m === "\\{" ? "\u0001" : "\u0002"))
    .replace(/\\cup/g, "∪")
    .replace(/\\in\b/g, "∈")
    .replace(/\\ne\b/g, "≠")
    .replace(/\\le\b/g, "≤")
    .replace(/\\ge\b/g, "≥")
    .replace(/\\text\{([^{}]*)\}/g, "$1")
    .replace(/\\sqrt\{([^{}]+)\}/g, "√$1")
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, (_, a: string, b: string) => `${/[\s+-]/.test(a.trim().replace(/^-/, "")) ? `(${a})` : a}/${b}`)
    .replace(/\\pi/g, "π")
    .replace(/\\infty/g, "∞")
    .replace(/e\^\{([^{}]+)\}/g, "e^$1")
    .replace(/\\left|\\right|\\,|\\;|\\quad/g, "")
    .replace(/\\(ln|log|sin|cos|tan|arcsin|arccos|arctan|sec|csc|cot)\b/g, "$1")
    .replace(/[{}]/g, "")
    // \u0001 and \u0002 stand in for the braces that must stay while the others are taken out.
    // eslint-disable-next-line no-control-regex
    .replace(/\u0001/g, "{")
    // eslint-disable-next-line no-control-regex
    .replace(/\u0002/g, "}")
    .replace(/\s*\\cdot\s*/g, "·")
    .replace(/-/g, "−");
const numF = (f: Frac): Num => ({ v: f.toNumber(), tex: f.tex(), plain: plainOfTex(f.tex()) });
const numQS = (q: QS): Num => ({ v: qsNum(q), tex: qsTex(q), plain: plainOfTex(qsTex(q)), q });
/** The fraction closest to v with a small denominator, if it is v. */
function asFrac(v: number, maxDen = 360, tol = 1e-10): Frac | null {
  if (!Number.isFinite(v) || Math.abs(v) > 1e9) return null;
  if (Math.abs(v - Math.round(v)) < 1e-9) return F(Math.round(v));
  let [h0, h1, k0, k1] = [0, 1, 1, 0];
  let x = v;
  for (let i = 0; i < 20; i++) {
    const a = Math.floor(x);
    [h0, h1] = [h1, a * h1 + h0];
    [k0, k1] = [k1, a * k1 + k0];
    if (k1 > maxDen) return null;
    if (Math.abs(h1 / k1 - v) < tol * Math.max(1, Math.abs(v))) return F(h1, k1);
    if (x - a < 1e-12) return null;
    x = 1 / (x - a);
  }
  return null;
}
/** A number as text: a fraction, a root, a power of e, a multiple of π — or rounded. */
function numOf(v: number, tol = 1e-10): Num {
  if (v === Infinity || v === -Infinity) return { v, tex: v > 0 ? "\\infty" : "-\\infty", plain: v > 0 ? "∞" : "−∞" };
  // A loose tolerance (a limit found numerically) only trusts simple fractions.
  const f = asFrac(v, tol > 1e-9 ? 24 : 360, tol);
  if (f) return numF(f);
  const sq = asFrac(v * v, 100, tol);
  if (sq && !sq.isZero()) {
    const { out, s } = sqrtSplit(sq);
    if (s > 1) {
      const q: QS = qs(F(0), v < 0 ? out.neg() : out, s);
      return numQS(q);
    }
  }
  const pi = asFrac(v / Math.PI, 12, tol);
  if (pi && !pi.isZero()) {
    const t = pi.isOne() ? "\\pi" : eqF(pi, F(-1)) ? "-\\pi" : pi.isInt() ? `${pi.n}\\pi` : `${pi.n < 0 ? "-" : ""}\\frac{${Math.abs(pi.n) === 1 ? "" : Math.abs(pi.n)}\\pi}{${pi.d}}`;
    return { v, tex: t, plain: plainOfTex(t) };
  }
  if (v > 0) {
    const l = asFrac(Math.log(v), 6, tol);
    if (l && !l.isZero()) {
      const t = l.isOne() ? "e" : eqF(l, F(-1)) ? "\\frac{1}{e}" : l.isNeg() && l.isInt() ? `\\frac{1}{e^{${-l.n}}}` : `e^{${l.isInt() ? l.n : `${l.n}/${l.d}`}}`;
      return { v, tex: t, plain: plainOfTex(t) };
    }
  }
  return { v, tex: tn(v, 3), plain: nt(v, 3), approx: true };
}
const eqF = (a: Frac, b: Frac) => a.n === b.n && a.d === b.d;
const close = (a: number, b: number, tol = 1e-7) => (Number.isFinite(a) && Number.isFinite(b) ? Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b)) : a === b);
/** "= 3" or "≈ 1.414" */
const eqTex = (n: Num) => `${n.approx ? "\\approx" : "="} ${n.tex}`;
const eqPlain = (n: Num) => `${n.approx ? "≈" : "="} ${n.plain}`;

// a + b√s that can be divided.
const qsC = (a: Frac, b: Frac, s: number): QS => (b.isZero() || s === 1 ? { a: s === 1 ? a.add(b) : a, b: ZERO, s: 1 } : { a, b, s });
function qsDiv(x: QS, y: QS): QS | null {
  const den = y.a.mul(y.a).sub(y.b.mul(y.b).mul(F(y.s)));
  if (den.isZero()) return null;
  const top = qsMul(x, { a: y.a, b: y.b.neg(), s: y.s });
  return qsC(top.a.div(den), top.b.div(den), top.s);
}

// ---------- polynomials (coefficients from the constant up) and rational functions ----------

type P = Frac[];
function ptrim(p: P): P {
  let d = p.length - 1;
  while (d > 0 && p[d].isZero()) d--;
  return p.slice(0, Math.max(d + 1, 1));
}
const pdeg = (p: P) => (ptrim(p).length === 1 && ptrim(p)[0].isZero() ? -1 : ptrim(p).length - 1);
const padd = (a: P, b: P): P => ptrim(Array.from({ length: Math.max(a.length, b.length) }, (_, i) => (a[i] ?? ZERO).add(b[i] ?? ZERO)));
const pscale = (a: P, k: Frac): P => ptrim(a.map((x) => x.mul(k)));
const psub = (a: P, b: P): P => padd(a, pscale(b, F(-1)));
function pmul(a: P, b: P): P {
  const r = Array.from({ length: a.length + b.length - 1 }, () => ZERO);
  a.forEach((x, i) => b.forEach((y, j) => (r[i + j] = r[i + j].add(x.mul(y)))));
  return ptrim(r);
}
const pderiv = (p: P): P => (p.length <= 1 ? [ZERO] : ptrim(p.slice(1).map((c, i) => c.mul(F(i + 1)))));
const pnum = (p: P, x: number) => p.reduceRight((acc, c) => acc * x + c.toNumber(), 0);
const pqs = (p: P, x: QS): QS => p.reduceRight<QS>((acc, c) => qsAdd(qsMul(acc, x), qs(c)), qs(ZERO));
const lead = (p: P) => ptrim(p)[ptrim(p).length - 1];
function pdivmod(a: P, b: P): { q: P; r: P } {
  let r = ptrim(a);
  const db = pdeg(b);
  const q: Frac[] = Array.from({ length: Math.max(pdeg(a) - db + 1, 1) }, () => ZERO);
  while (pdeg(r) >= db && pdeg(r) >= 0) {
    const k = pdeg(r) - db;
    const c = lead(r).div(lead(b));
    q[k] = c;
    r = psub(r, pmul(Array.from({ length: k + 1 }, (_, i) => (i === k ? c : ZERO)), b));
  }
  return { q: ptrim(q), r };
}
function pgcd(a: P, b: P): P {
  let [x, y] = [ptrim(a), ptrim(b)];
  while (pdeg(y) >= 0) [x, y] = [y, pdivmod(x, y).r];
  return pdeg(x) <= 0 ? [ONE] : pscale(x, ONE.div(lead(x)));
}
/** A rational function as top/bottom polynomials, or null. */
type Rat = { n: P; d: P };
function toRat(e: E): Rat | null {
  switch (e.k) {
    case "num":
      return { n: [e.v], d: [ONE] };
    case "var":
      return e.name === "x" ? { n: [ZERO, ONE], d: [ONE] } : null;
    case "add": {
      let r: Rat = { n: [ZERO], d: [ONE] };
      for (const t of e.ts) {
        const s = toRat(t);
        if (!s) return null;
        r = { n: padd(pmul(r.n, s.d), pmul(s.n, r.d)), d: pmul(r.d, s.d) };
      }
      return r;
    }
    case "mul": {
      let r: Rat = { n: [ONE], d: [ONE] };
      for (const f of e.fs) {
        const s = toRat(f);
        if (!s) return null;
        r = { n: pmul(r.n, s.n), d: pmul(r.d, s.d) };
      }
      return r;
    }
    case "pow": {
      if (!isNum(e.e) || !e.e.v.isInt() || Math.abs(e.e.v.n) > 8) return null;
      const b = toRat(e.b);
      if (!b) return null;
      let r: Rat = { n: [ONE], d: [ONE] };
      for (let i = 0; i < Math.abs(e.e.v.n); i++) r = { n: pmul(r.n, b.n), d: pmul(r.d, b.d) };
      return e.e.v.n < 0 ? { n: r.d, d: r.n } : r;
    }
    default:
      return null;
  }
}
/** Top and bottom with whole coefficients and the bottom's leading coefficient positive. */
function tidyRat(r: Rat): Rat {
  const all = [...r.n, ...r.d];
  const L = all.reduce((acc, c) => (acc * c.d) / gcdI(acc, c.d), 1);
  let n = pscale(r.n, F(L));
  let d = pscale(r.d, F(L));
  const g = [...n, ...d].reduce((acc, c) => gcdI(acc, c.n), 0) || 1;
  n = pscale(n, F(1, g));
  d = pscale(d, F(1, g));
  if (lead(d).isNeg()) [n, d] = [pscale(n, F(-1)), pscale(d, F(-1))];
  return { n, d };
}
const gcdI = (a: number, b: number): number => (b ? gcdI(b, a % b) : Math.abs(a));

function polyTex(p: P, v = "x"): string {
  let out = "";
  for (let k = p.length - 1; k >= 0; k--) {
    const c = p[k];
    if (!c || c.isZero()) continue;
    const vv = k === 0 ? "" : k === 1 ? v : `${v}^{${k}}`;
    const a = c.abs();
    const body = k === 0 ? a.tex() : `${a.isOne() ? "" : a.tex()}${vv}`;
    out += out ? (c.isNeg() ? ` - ${body}` : ` + ${body}`) : c.isNeg() ? `-${body}` : body;
  }
  return out || "0";
}
/** K·∏(b·x − a)^e·rest: the rational roots taken out. */
function factorize(p0: P): { K: Frac; fs: { a: number; b: number; e: number }[]; rest: P | null } {
  let p = ptrim(p0);
  let K = lead(p);
  p = pscale(p, ONE.div(K));
  const fs: { a: number; b: number; e: number }[] = [];
  const divisors = (n: number) => {
    const out: number[] = [];
    for (let i = 1; i <= Math.min(Math.abs(n), 5000); i++) if (n % i === 0) out.push(i);
    return out;
  };
  while (p.length > 1) {
    const L = p.reduce((acc, c) => (acc * c.d) / gcdI(acc, c.d), 1);
    const ints = p.map((c) => c.mul(F(L)).n);
    let root: Frac | null = ints[0] === 0 ? ZERO : null;
    if (!root)
      outer: for (const a of divisors(ints[0]))
        for (const b of divisors(ints[ints.length - 1]))
          for (const s of [1, -1])
            if (pqs(p, qs(F(s * a, b))).a.isZero()) {
              root = F(s * a, b);
              break outer;
            }
    if (!root) break;
    p = pdivmod(p, [root.neg(), ONE]).q;
    const f = fs.find((x) => x.a === root.n && x.b === root.d);
    if (f) f.e++;
    else fs.push({ a: root.n, b: root.d, e: 1 });
    K = K.div(F(root.d));
  }
  let rest: P | null = null;
  if (p.length > 1) {
    const L = p.reduce((acc, c) => (acc * c.d) / gcdI(acc, c.d), 1);
    const ints = p.map((c) => c.mul(F(L)).n);
    const g = ints.reduce((acc, c) => gcdI(acc, c), 0) || 1;
    rest = ints.map((c) => F(c / g));
    K = K.mul(F(g, L));
  }
  fs.sort((x, y) => Number(y.a === 0) - Number(x.a === 0) || x.b - y.b || y.a / y.b - x.a / x.b);
  return { K, fs, rest };
}
function factorTex(p: P, v = "x", wrapSingle = false): string {
  if (pdeg(p) <= 0) return ptrim(p)[0].tex();
  const { K, fs, rest } = factorize(p);
  const count = fs.reduce((s, f) => s + f.e, 0) + (rest ? 1 : 0);
  // A lone factor needs no brackets — unless a minus sign stands in front of a sum.
  const solo = count === 1 && K.isOne() && !wrapSingle;
  const parts: string[] = [];
  for (const f of fs) {
    const body = polyTex([F(-f.a), F(f.b)], v);
    const simple = f.a === 0 && f.b === 1;
    const w = simple || solo ? body : `\\left(${body}\\right)`;
    parts.push(f.e > 1 ? `${simple ? body : `\\left(${body}\\right)`}^{${f.e}}` : w);
  }
  if (rest) parts.push(solo ? polyTex(rest, v) : `\\left(${polyTex(rest, v)}\\right)`);
  const k = K.abs();
  const top = (k.n === 1 ? "" : String(k.n)) + parts.join("");
  return `${K.isNeg() ? "-" : ""}${k.d === 1 ? top : `\\frac{${top}}{${k.d}}`}`;
}
/** The real roots of p, exact where possible, in order. */
function rootsOf(p: P): Num[] {
  if (pdeg(p) <= 0) return [];
  const r = realRoots(p);
  return [...r.exact.map(numQS), ...r.approx.map((x) => ({ ...numOf(x) }))].sort((a, b) => a.v - b.v);
}
const ratTex = (r: Rat, factored = true) => {
  const top = factored ? factorTex(r.n) : polyTex(r.n);
  if (pdeg(r.d) <= 0) {
    const d = ptrim(r.d)[0];
    return d.isOne() ? top : `\\frac{${top}}{${d.tex()}}`;
  }
  return `\\frac{${top}}{${factored ? factorTex(r.d) : polyTex(r.d)}}`;
};

// ---------- sets of real numbers ----------

/** An interval with its ends (±∞ allowed). */
type Iv = { lo: Num; hi: Num; loIn: boolean; hiIn: boolean };
const NEG_INF = numOf(-Infinity);
const POS_INF = numOf(Infinity);
const REALS: Iv[] = [{ lo: NEG_INF, hi: POS_INF, loIn: false, hiIn: false }];
function intersect(a: Iv[], b: Iv[]): Iv[] {
  const out: Iv[] = [];
  for (const p of a)
    for (const q of b) {
      const lo = p.lo.v > q.lo.v ? p.lo : q.lo;
      const hi = p.hi.v < q.hi.v ? p.hi : q.hi;
      const loIn = close(p.lo.v, q.lo.v, 1e-12) ? p.loIn && q.loIn : p.lo.v > q.lo.v ? p.loIn : q.loIn;
      const hiIn = close(p.hi.v, q.hi.v, 1e-12) ? p.hiIn && q.hiIn : p.hi.v < q.hi.v ? p.hiIn : q.hiIn;
      if (lo.v < hi.v || (close(lo.v, hi.v, 1e-12) && loIn && hiIn)) out.push({ lo, hi, loIn, hiIn });
    }
  return merge(out);
}
function merge(ivs: Iv[]): Iv[] {
  const s = [...ivs].sort((a, b) => a.lo.v - b.lo.v || Number(b.loIn) - Number(a.loIn));
  const out: Iv[] = [];
  for (const iv of s) {
    const last = out[out.length - 1];
    if (last && (iv.lo.v < last.hi.v - 1e-12 || (close(iv.lo.v, last.hi.v, 1e-12) && (iv.loIn || last.hiIn)))) {
      if (iv.hi.v > last.hi.v + 1e-12) [last.hi, last.hiIn] = [iv.hi, iv.hiIn];
      else if (close(iv.hi.v, last.hi.v, 1e-12)) last.hiIn ||= iv.hiIn;
    } else out.push({ ...iv });
  }
  return out;
}
const isReals = (s: Iv[]) => s.length === 1 && s[0].lo.v === -Infinity && s[0].hi.v === Infinity;
/** (−∞, 2) ∪ (2, ∞) */
function ivTex(s: Iv[]): string {
  if (!s.length) return "\\varnothing";
  if (isReals(s)) return "\\mathbb{R}";
  return s.map((iv) => (close(iv.lo.v, iv.hi.v, 1e-12) ? `\\{${iv.lo.tex}\\}` : `${iv.loIn ? "[" : "("}${iv.lo.tex}, ${iv.hi.tex}${iv.hiIn ? "]" : ")"}`)).join(" \\cup ");
}
const ivPlain = (s: Iv[]) => plainOfTex(ivTex(s));
/** The same set as inequalities: x ≥ −3, x ≠ 2, −1 < x ≤ 4, x < 0 or x > 1. */
function ineqTex(s: Iv[], v = "x"): string {
  if (!s.length) return "\\varnothing";
  if (isReals(s)) return `${v} \\in \\mathbb{R}`;
  // ℝ with points taken out.
  if (s[0].lo.v === -Infinity && s[s.length - 1].hi.v === Infinity && s.every((iv, i) => i === 0 || (!iv.loIn && !s[i - 1].hiIn && close(iv.lo.v, s[i - 1].hi.v, 1e-12))))
    return s.slice(1).map((iv) => `${v} \\ne ${iv.lo.tex}`).join(", \\; ");
  const one = (iv: Iv) => {
    if (close(iv.lo.v, iv.hi.v, 1e-12)) return `${v} = ${iv.lo.tex}`;
    const l = iv.lo.v === -Infinity ? "" : `${iv.lo.tex} ${iv.loIn ? "\\le" : "<"} `;
    const r = iv.hi.v === Infinity ? "" : ` ${iv.hiIn ? "\\le" : "<"} ${iv.hi.tex}`;
    if (!l) return `${v}${r}`;
    if (!r) return `${v} ${iv.loIn ? "\\ge" : ">"} ${iv.lo.tex}`;
    return `${l}${v}${r}`;
  };
  return s.map(one).join(" \\text{ or } ");
}

// ---------- the domain ----------

type Why = "den" | "root" | "rootPos" | "log" | "arcsin" | "base";
type Cond = { g: E; op: "ne" | "ge" | "gt" | "in11"; why: Why };
type Periodic = { a: E; zeroOf: "cos" | "sin"; f: string };

/** Every restriction in e: what must not be 0, must be ≥ 0, > 0 or between −1 and 1. */
function conditions(e: E, out: { conds: Cond[]; periodic: Periodic[]; never: boolean } = { conds: [], periodic: [], never: false }) {
  const push = (c: Cond) => {
    if (!has(c.g)) {
      const v = evalE(c.g, 0);
      const ok = c.op === "ne" ? v !== 0 : c.op === "ge" ? v >= 0 : c.op === "gt" ? v > 0 : v >= -1 && v <= 1;
      if (!ok) out.never = true;
      return;
    }
    if (!out.conds.some((d) => key(d.g) === key(c.g) && d.op === c.op)) out.conds.push(c);
  };
  switch (e.k) {
    case "add":
      e.ts.forEach((t) => conditions(t, out));
      break;
    case "mul":
      e.fs.forEach((f) => conditions(f, out));
      break;
    case "pow": {
      conditions(e.b, out);
      conditions(e.e, out);
      if (isNum(e.e)) {
        const p = e.e.v;
        const even = p.d % 2 === 0;
        if (p.isNeg() && even) push({ g: e.b, op: "gt", why: "rootPos" });
        else if (p.isNeg()) push({ g: e.b, op: "ne", why: "den" });
        else if (even) push({ g: e.b, op: "ge", why: "root" });
      } else if (has(e.e) && !(e.b.k === "e" || (isNum(e.b) && e.b.v.toNumber() > 0))) push({ g: e.b, op: "gt", why: "base" });
      break;
    }
    case "fn":
      conditions(e.a, out);
      if (e.f === "ln") push({ g: e.a, op: "gt", why: "log" });
      else if (e.f === "asin" || e.f === "acos") push({ g: e.a, op: "in11", why: "arcsin" });
      else if ((e.f === "tan" || e.f === "sec" || e.f === "cot" || e.f === "csc") && has(e.a))
        out.periodic.push({ a: e.a, zeroOf: e.f === "tan" || e.f === "sec" ? "cos" : "sin", f: e.f });
      break;
    case "log":
      conditions(e.a, out);
      push({ g: e.a, op: "gt", why: "log" });
      break;
    default:
      break;
  }
  return out;
}

/** Where a function of x changes sign or stops being defined, numerically, on [−L, L]. */
function criticalNumeric(g: (x: number) => number, L = 60, n = 6000): { zeros: number[]; poles: number[]; edges: number[] } {
  const zeros: number[] = [];
  const poles: number[] = [];
  const edges: number[] = [];
  const xs = Array.from({ length: n + 1 }, (_, i) => -L + (2 * L * i) / n);
  const ys = xs.map(g);
  const bisect = (a: number, b: number, test: (x: number) => boolean) => {
    for (let k = 0; k < 80; k++) {
      const m = (a + b) / 2;
      if (test(m) === test(a)) a = m;
      else b = m;
    }
    return (a + b) / 2;
  };
  for (let i = 0; i < n; i++) {
    const [a, b, ya, yb] = [xs[i], xs[i + 1], ys[i], ys[i + 1]];
    // An exact 0 counts only on its own (a run of zeros is underflow, as for e^(−x²) far out).
    if (ya === 0 && i > 0 && ys[i - 1] !== 0 && yb !== 0) zeros.push(a);
    if (Number.isFinite(ya) !== Number.isFinite(yb)) {
      edges.push(bisect(a, b, (x) => Number.isFinite(g(x))));
      continue;
    }
    if (!Number.isFinite(ya) || ya === 0 || yb === 0) continue;
    if (ya * yb < 0) {
      const x = bisect(a, b, (t) => g(t) > 0);
      (Math.abs(g(x)) < 1e-6 ? zeros : poles).push(x);
    } else if (i > 0 && Number.isFinite(ys[i - 1]) && Math.abs(ya) < Math.abs(ys[i - 1]) && Math.abs(ya) <= Math.abs(yb) && Math.abs(ya) < 1e-3) {
      // Touching zero: a dip of |g| to 0 without a change of sign.
      let [lo, hi] = [xs[i - 1], b];
      for (let k = 0; k < 100; k++) {
        const [m1, m2] = [lo + (hi - lo) / 3, hi - (hi - lo) / 3];
        if (Math.abs(g(m1)) < Math.abs(g(m2))) hi = m2;
        else lo = m1;
      }
      const x = (lo + hi) / 2;
      if (Math.abs(g(x)) < 1e-9) zeros.push(x);
    }
  }
  const uniq = (a: number[]) => a.sort((p, q) => p - q).filter((x, i, arr) => i === 0 || Math.abs(x - arr[i - 1]) > 1e-7);
  return { zeros: uniq(zeros), poles: uniq(poles), edges: uniq(edges) };
}

/** The x where g(x) op 0. */
function solveCond(g: E, op: Cond["op"]): Iv[] {
  if (op === "in11") return intersect(solveCond(sub(N(1), g), "ge"), solveCond(add(g, N(1)), "ge"));
  const r = toRat(g);
  let zeros: Num[];
  let poles: Num[];
  if (r) {
    if (pdeg(r.n) < 0) return op === "ge" ? REALS : [];
    zeros = rootsOf(r.n);
    poles = rootsOf(r.d);
  } else {
    const c = criticalNumeric((x) => evalE(g, x));
    zeros = c.zeros.map((x) => numOf(x));
    poles = [...c.poles, ...c.edges].map((x) => numOf(x));
  }
  const fx = (x: number) => evalE(g, x);
  const ok = (v: number) => Number.isFinite(v) && (op === "ne" ? v !== 0 : op === "ge" ? v >= 0 : v > 0);
  // A point that is both a zero of the top and of the bottom is not in the domain: it counts as a pole.
  const crit: { n: Num; zero: boolean }[] = [];
  for (const c of [...poles.map((n) => ({ n, zero: false })), ...zeros.map((n) => ({ n, zero: true }))])
    if (!crit.some((d) => close(d.n.v, c.n.v, 1e-10))) crit.push(c);
  crit.sort((a, b) => a.n.v - b.n.v);
  const out: Iv[] = [];
  const ends = [NEG_INF, ...crit.map((c) => c.n), POS_INF];
  for (let i = 0; i + 1 < ends.length; i++) {
    const [a, b] = [ends[i].v, ends[i + 1].v];
    const mid = a === -Infinity ? (b === Infinity ? 0 : b - 1) : b === Infinity ? a + 1 : (a + b) / 2;
    if (ok(fx(mid))) out.push({ lo: ends[i], hi: ends[i + 1], loIn: false, hiIn: false });
  }
  for (const c of crit) {
    const inc = c.zero ? op === "ge" : false;
    if (inc) out.push({ lo: c.n, hi: c.n, loIn: true, hiIn: true });
  }
  // Points between two intervals that hold join them.
  return merge(out);
}

/** The value of e at x, exactly when it can be. */
function exactAt(e: E, x: Num, rat?: Rat | null): Num {
  const f = asFrac(x.v);
  if (f && !x.approx) {
    try {
      const v = simp(substitute(e, "x", N(f)));
      if (isNum(v)) return numF(v.v);
      const n = evalE(e, x.v);
      const known = numOf(n);
      if (!known.approx) return known;
      if (Number.isFinite(n)) {
        const t = tex(v);
        return t.length < 40 ? { v: n, tex: t, plain: plainOfTex(t) } : numOf(n);
      }
    } catch {
      // Fall through to numbers.
    }
  }
  if (rat && x.q) {
    const v = qsDiv(pqs(rat.n, x.q), pqs(rat.d, x.q));
    if (v) return numQS(v);
  }
  return numOf(evalE(e, x.v));
}

/** f near a from one side (or at ±∞): a number, ±∞, or null when it has no limit. */
function limitOf(f: (x: number) => number, a: number, side: 1 | -1): number | null {
  // One sample per power of 10 on the way in.
  const xs = !Number.isFinite(a) ? [1e1, 1e2, 1e3, 1e4, 1e6, 1e8, 1e10, 1e12, 1e14].map((t) => t * Math.sign(a)) : [1e-2, 1e-3, 1e-4, 1e-5, 1e-6, 1e-7, 1e-8, 1e-9, 1e-10].map((h) => a + side * h);
  let vs = xs.map(f);
  // Overflow on the way out is a limit of ±∞.
  const inf = vs.findIndex((v) => v === Infinity || v === -Infinity);
  if (inf > 0 && vs.slice(inf).every((v) => v === vs[inf])) return vs[inf];
  if (vs.some((v) => !Number.isFinite(v))) return null;
  vs = vs.slice(-5);
  const last = vs[vs.length - 1];
  const ds = vs.slice(1).map((v, i) => v - vs[i]);
  const monotone = ds.every((d) => d > 0) || ds.every((d) => d < 0);
  const [d1, d2] = [Math.abs(ds[ds.length - 2]), Math.abs(ds[ds.length - 1])];
  // Steps that don't shrink: it keeps going (like ln or √ of something growing).
  if (monotone && d2 >= 0.5 * d1 && d2 > 1e-9 * Math.max(1, Math.abs(last))) return last > 0 ? Infinity : -Infinity;
  const shrinking = Math.abs(last) < Math.abs(vs[vs.length - 2]) && Math.abs(last) < 1e-5;
  if (d2 <= 1e-6 * Math.max(1, Math.abs(last)) || shrinking) return Math.abs(last) < 1e-5 ? 0 : last;
  return null;
}

const condTex = (c: Cond) =>
  c.op === "in11" ? `-1 \\le ${tex(c.g)} \\le 1` : `${tex(c.g)} ${c.op === "ne" ? "\\ne" : c.op === "ge" ? "\\ge" : ">"} 0`;
/** x ≠ x₀ + kπ/α for cos(αx + β) ≠ 0 or sin(αx + β) ≠ 0. */
function periodicOf(p: Periodic): { tex: string; plain: string; xs: number[] } | null {
  const lin = toPoly(p.a);
  if (!lin || lin.length !== 2 || lin[1].isZero()) return null;
  const [beta, alpha] = [lin[0].toNumber(), lin[1].toNumber()];
  const base = p.zeroOf === "cos" ? Math.PI / 2 : 0;
  const x0 = numOf((base - beta) / alpha);
  const step = numOf(Math.PI / Math.abs(alpha));
  const t = `x \\ne ${x0.v === 0 ? "" : `${x0.tex} + `}k${step.tex === "\\pi" ? "\\pi" : `\\cdot ${step.tex}`}, \\; k \\in \\mathbb{Z}`;
  const xs: number[] = [];
  for (let k = -40; k <= 40; k++) xs.push(x0.v + k * step.v);
  return { tex: t, plain: plainOfTex(t), xs };
}

type DomainInfo = { dom: Iv[]; rows: TexLine[]; periodic: { tex: string; plain: string; xs: number[] }[]; any: boolean };
function domainOf(e: E, restrict: Iv[] | null = null): DomainInfo {
  const W_ = words.domain;
  const c = conditions(e);
  const rows: TexLine[] = [];
  let dom: Iv[] = c.never ? [] : REALS;
  for (const cond of c.conds) {
    const set = solveCond(cond.g, cond.op);
    const [lhs, rhs] = [condTex(cond), ineqTex(set)];
    rows.push({ tex: lhs.replace(/\s+/g, "") === rhs.replace(/\s+/g, "") ? lhs : `${lhs} \\;\\Rightarrow\\; ${rhs}`, op: W_[cond.why] });
    dom = intersect(dom, set);
  }
  const periodic: DomainInfo["periodic"] = [];
  for (const p of c.periodic) {
    const r = periodicOf(p);
    rows.push({ tex: `\\${p.zeroOf} ${tex(p.a).includes(" ") ? `\\left(${tex(p.a)}\\right)` : tex(p.a)} \\ne 0${r ? ` \\;\\Rightarrow\\; ${r.tex}` : ""}`, op: fill(W_.periodic, { f: p.f, g: p.zeroOf }) });
    if (r) periodic.push(r);
  }
  if (restrict) dom = intersect(dom, restrict);
  return { dom, rows, periodic, any: c.conds.length > 0 || c.periodic.length > 0 || c.never };
}

type Cand = { x: Num | null; val: Num; attained: boolean; row: TexLine };
/** The set of values f takes on its domain, from the stationary values and the limits at the ends. */
function rangeOf(e: E, dom0: Iv[], rat: Rat | null, oscillates: boolean, gaps: number[] = []): { set: Iv[]; rows: TexLine[]; cands: Cand[] } {
  // Points left out periodically (tan x) split the domain into pieces near the middle.
  let dom = dom0;
  const cuts = gaps.filter((x) => Math.abs(x) < 12).sort((a, b) => a - b);
  if (cuts.length) {
    const pieces: Iv[] = [];
    const ends = [NEG_INF, ...cuts.map((x) => numOf(x)), POS_INF];
    for (let i = 0; i + 1 < ends.length; i++) pieces.push({ lo: ends[i], hi: ends[i + 1], loIn: false, hiIn: false });
    // The two outer pieces run past more gaps: the middle ones show every value.
    dom = intersect(dom0, pieces.slice(1, -1)).slice(0, 14);
  }
  const W_ = words.domain;
  const f = (x: number) => evalE(e, x);
  let d: E | null = null;
  try {
    d = simp(derive(e));
  } catch {
    d = null;
  }
  const dRat = rat ? { n: psub(pmul(pderiv(rat.n), rat.d), pmul(rat.n, pderiv(rat.d))), d: pmul(rat.d, rat.d) } : null;
  const numericCrit = d ? criticalNumeric((x) => evalE(d!, x)) : { zeros: [], poles: [], edges: [] };
  const set: Iv[] = [];
  const all: Cand[] = [];
  for (const iv of dom.slice(0, 14)) {
    const inside = (x: number) => x > iv.lo.v + 1e-9 && x < iv.hi.v - 1e-9;
    const cands: Cand[] = [];
    if (close(iv.lo.v, iv.hi.v, 1e-12)) {
      const v = exactAt(e, iv.lo, rat);
      cands.push({ x: iv.lo, val: v, attained: true, row: { tex: `f\\left(${iv.lo.tex}\\right) ${eqTex(v)}` } });
    } else {
      // Stationary points (and corners like |x| at 0) inside.
      const xs: Num[] = dRat ? rootsOf(dRat.n).filter((x) => inside(x.v) && Math.abs(pnum(rat!.d, x.v)) > 1e-12) : [...numericCrit.zeros, ...numericCrit.poles.filter((x) => Number.isFinite(f(x)))].filter(inside).map((x) => numOf(x));
      for (const x of xs.slice(0, 6)) {
        const v = exactAt(e, x, rat);
        if (Number.isFinite(v.v)) cands.push({ x, val: v, attained: true, row: { tex: `f\\left(${x.tex}\\right) ${eqTex(v)}` } });
      }
      // The two ends.
      for (const [end, inc, side] of [[iv.lo, iv.loIn, 1], [iv.hi, iv.hiIn, -1]] as const) {
        if (inc) {
          const v = exactAt(e, end, rat);
          cands.push({ x: end, val: v, attained: true, row: { tex: `f\\left(${end.tex}\\right) ${eqTex(v)}` } });
          continue;
        }
        let L: number | null;
        let Ln: Num | null = null;
        if (rat && !Number.isFinite(end.v)) {
          const [dn, dd] = [pdeg(rat.n), pdeg(rat.d)];
          if (dn < dd) Ln = numF(ZERO);
          else if (dn === dd) Ln = numF(lead(rat.n).div(lead(rat.d)));
          L = Ln ? Ln.v : limitOf(f, end.v, side);
        } else L = limitOf(f, end.v, side);
        if (L === null) continue;
        if (!Ln) Ln = Number.isFinite(L) && rat && Number.isFinite(end.v) && Math.abs(pnum(rat.d, end.v)) > 1e-12 ? exactAt(e, end, rat) : numOf(L, 1e-6);
        const to = !Number.isFinite(end.v) ? end.tex : `${end.tex}^{${side > 0 ? "+" : "-"}}`;
        cands.push({ x: null, val: Ln, attained: false, row: { tex: `x \\to ${to}: \\quad f(x) \\to ${Ln.tex}`, op: W_.limit } });
      }
      // A check by sampling, for anything missed (and for functions that keep oscillating).
      const [a, b] = [Math.max(iv.lo.v, -60), Math.min(iv.hi.v, 60)];
      let [smin, smax] = [Infinity, -Infinity];
      for (let i = 1; i < 3000; i++) {
        const y = f(a + ((b - a) * i) / 3000);
        if (Number.isFinite(y)) [smin, smax] = [Math.min(smin, y), Math.max(smax, y)];
      }
      const vals = cands.map((c) => c.val.v);
      const both = vals.includes(-Infinity) && vals.includes(Infinity);
      if (!both && oscillates || !vals.length || smin < Math.min(...vals) - 1e-6 * Math.max(1, Math.abs(smin)))
        if (Number.isFinite(smin) && !vals.some((v) => close(v, smin, 1e-6))) cands.push({ x: null, val: numOf(smin), attained: true, row: { tex: `f \\approx ${tn(smin, 3)}`, op: W_.numeric } });
      if (!both && (oscillates || !vals.length || smax > Math.max(...vals) + 1e-6 * Math.max(1, Math.abs(smax))))
        if (Number.isFinite(smax) && !vals.some((v) => close(v, smax, 1e-6))) cands.push({ x: null, val: numOf(smax), attained: true, row: { tex: `f \\approx ${tn(smax, 3)}`, op: W_.numeric } });
    }
    if (!cands.length) continue;
    const lo = cands.reduce((m, c) => (c.val.v < m.val.v || (close(c.val.v, m.val.v) && c.attained) ? c : m));
    const hi = cands.reduce((m, c) => (c.val.v > m.val.v || (close(c.val.v, m.val.v) && c.attained) ? c : m));
    if (lo.attained && lo.x) lo.row.op ??= W_.smallest;
    if (hi.attained && hi.x) hi.row.op ??= W_.largest;
    set.push({ lo: lo.val, hi: hi.val, loIn: lo.attained && Number.isFinite(lo.val.v), hiIn: hi.attained && Number.isFinite(hi.val.v) });
    // With periodic gaps, one piece (the one at 0) speaks for all of them.
    if (!cuts.length || (iv.lo.v <= 0 && iv.hi.v > 0)) all.push(...cands);
  }
  const rows = all.filter((c) => c.row.op === W_.smallest || c.row.op === W_.largest || c.row.op === W_.limit || c.row.op === W_.numeric).map((c) => c.row);
  // Rows that say the same thing once.
  const seen = new Set<string>();
  return { set: merge(set), rows: rows.filter((r) => (seen.has(r.tex) ? false : (seen.add(r.tex), true))).slice(0, 6), cands: all };
}

// ---------- pictures ----------

type Pic = { svg: string; h: number };
/** Tick labels that don't crowd a small frame: at most `max` of them, at 1, 2, 5, 10, … apart. */
function ticks(lo: number, hi: number, max = 8): { v: number; label: string }[] {
  const span = hi - lo;
  let step = 1;
  for (const s of [0.25, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000]) if (span / s <= max) {
    step = s;
    break;
  }
  const out: { v: number; label: string }[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) if (Math.abs(v) > step / 2) out.push({ v, label: nt(v, 2) });
  return out;
}
/** A sensible window: the features plus a margin, and the y-values that matter (not the spikes at asymptotes). */
function windowFor(fs: ((x: number) => number)[], featX: number[], featY: number[], minHalf = 4): { x: [number, number]; y: [number, number] } {
  const fx = featX.filter(Number.isFinite);
  let [a, b] = fx.length ? [Math.min(...fx), Math.max(...fx)] : [0, 0];
  const pad = Math.max(1.5, (b - a) * 0.35);
  [a, b] = [a - pad, b + pad];
  if (b - a < 2 * minHalf) {
    const m = (a + b) / 2;
    [a, b] = [m - minHalf, m + minHalf];
  }
  const ys: number[] = [];
  for (const f of fs) for (let i = 0; i <= 600; i++) ys.push(f(a + ((b - a) * i) / 600));
  const fin = ys.filter(Number.isFinite).sort((p, q) => p - q);
  let [lo, hi] = fin.length ? [fin[Math.floor(fin.length * 0.06)], fin[Math.ceil(fin.length * 0.94) - 1]] : [-1, 1];
  for (const y of featY) if (Number.isFinite(y)) [lo, hi] = [Math.min(lo, y), Math.max(hi, y)];
  lo = Math.min(lo, 0);
  hi = Math.max(hi, 0);
  if (hi - lo < 2) [lo, hi] = [lo - 1, hi + 1];
  const p2 = (hi - lo) * 0.12;
  return { x: [a, b], y: [lo - p2, hi + p2] };
}
const dash = (fr: Frame, x1: number, y1: number, x2: number, y2: number, color: string, extra = "") =>
  `<line x1="${r2(fr.sx(x1))}" y1="${r2(fr.sy(y1))}" x2="${r2(fr.sx(x2))}" y2="${r2(fr.sy(y2))}" stroke="${color}" stroke-width="1.6" stroke-dasharray="7 5" clip-path="url(#${fr.id})" ${extra}/>`;
/** Hollow or filled end of an interval drawn along an axis. */
const endDot = (x: number, y: number, color: string, filled: boolean) => dot(x, y, color, 4.5, !filled);

/** The domain along the x-axis (green) and the range along the y-axis (orange). */
function domainRangeMarks(fr: Frame, dom: Iv[], range: Iv[] | null): string {
  const parts: string[] = [];
  const yAx = Math.min(Math.max(fr.sy(0), fr.top), fr.bottom);
  const xAx = Math.min(Math.max(fr.sx(0), fr.left), fr.right);
  for (const iv of dom) {
    const [a, b] = [Math.max(fr.sx(iv.lo.v), fr.left), Math.min(fr.sx(iv.hi.v), fr.right)];
    if (b < a) continue;
    parts.push(`<line x1="${r2(a)}" y1="${r2(yAx)}" x2="${r2(b)}" y2="${r2(yAx)}" stroke="${C.green}" stroke-width="6" opacity="0.55" stroke-linecap="butt"/>`);
    if (Number.isFinite(iv.lo.v) && iv.lo.v >= fr.x0) parts.push(endDot(fr.sx(iv.lo.v), yAx, C.green, iv.loIn));
    if (Number.isFinite(iv.hi.v) && iv.hi.v <= fr.x1) parts.push(endDot(fr.sx(iv.hi.v), yAx, C.green, iv.hiIn));
  }
  for (const iv of range ?? []) {
    const [a, b] = [Math.min(fr.sy(iv.lo.v), fr.bottom), Math.max(fr.sy(iv.hi.v), fr.top)];
    if (a < b) continue;
    parts.push(`<line x1="${r2(xAx)}" y1="${r2(a)}" x2="${r2(xAx)}" y2="${r2(b)}" stroke="${C.orange}" stroke-width="6" opacity="0.55"/>`);
    if (Number.isFinite(iv.lo.v) && iv.lo.v >= fr.y0) parts.push(endDot(xAx, fr.sy(iv.lo.v), C.orange, iv.loIn));
    if (Number.isFinite(iv.hi.v) && iv.hi.v <= fr.y1) parts.push(endDot(xAx, fr.sy(iv.hi.v), C.orange, iv.hiIn));
  }
  return parts.join("");
}

function finish(header: string, rows: TexLine[], pics: Pic[], caps: Caption[]): RenderedSvg {
  const ln = texLines(rows, 4);
  let y = 4 + ln.h + (rows.length ? 8 : 0);
  let body = ln.svg;
  for (const p of pics) {
    body += `<g transform="translate(0 ${r2(y)})">${p.svg}</g>`;
    y += p.h;
  }
  return compose(header, body, y, caps);
}

// ---------- reading functions ----------

/** "f(x) = …" or just "…", with an optional restriction "x ≥ 2". */
type Def = { name: string; e: E; restrict: Iv[] | null; restrictTex: string };
function readExpr(src: string): E {
  try {
    return tidy(parseE(src));
  } catch (err) {
    throw err instanceof Error ? err : new Error(fill(words.bad, { s: src }));
  }
}
function restrictionOf(s: string): { set: Iv[]; tex: string } | null {
  const t = s.replace(/>=/g, "≥").replace(/<=/g, "≤").replace(/\s+/g, "");
  let m = /^x(≥|>|≤|<)(.+)$/.exec(t);
  if (m) {
    const v = numOf(evalE(readExpr(m[2]), 0));
    const set: Iv[] = m[1] === "≥" || m[1] === ">" ? [{ lo: v, hi: POS_INF, loIn: m[1] === "≥", hiIn: false }] : [{ lo: NEG_INF, hi: v, loIn: false, hiIn: m[1] === "≤" }];
    return { set, tex: ineqTex(set) };
  }
  m = /^(.+?)(≤|<)x(≤|<)(.+)$/.exec(t);
  if (m) {
    const [a, b] = [numOf(evalE(readExpr(m[1]), 0)), numOf(evalE(readExpr(m[4]), 0))];
    const set: Iv[] = [{ lo: a, hi: b, loIn: m[2] === "≤", hiIn: m[3] === "≤" }];
    return { set, tex: ineqTex(set) };
  }
  return null;
}
function defsOf(src: string): { defs: Def[]; rest: string[] } {
  const defs: Def[] = [];
  const rest: string[] = [];
  for (const raw of src.split(/[;\n]+/).map((s) => s.trim()).filter(Boolean)) {
    const m = /^([a-zA-Z])\s*\(\s*x\s*\)\s*=\s*(.+)$/.exec(raw) ?? /^(y)\s*=\s*(.+)$/.exec(raw);
    if (!m) {
      rest.push(raw);
      continue;
    }
    let body = m[2];
    let restrict: { set: Iv[]; tex: string } | null = null;
    const comma = body.lastIndexOf(",");
    if (comma > 0) {
      const r = restrictionOf(body.slice(comma + 1));
      if (r) {
        restrict = r;
        body = body.slice(0, comma);
      }
    }
    defs.push({ name: m[1], e: readExpr(body), restrict: restrict?.set ?? null, restrictTex: restrict?.tex ?? "" });
  }
  return { defs, rest };
}
/** The one function of a single-function tab: "f(x) = …" or a bare expression. */
function oneFunction(src: string, need: string): Def {
  const { defs, rest } = defsOf(src);
  if (defs.length) return defs[0];
  if (!rest.length) throw new Error(need);
  const body = rest.join(" ");
  const comma = body.lastIndexOf(",");
  const r = comma > 0 ? restrictionOf(body.slice(comma + 1)) : null;
  return { name: "f", e: readExpr(r ? body.slice(0, comma) : body), restrict: r?.set ?? null, restrictTex: r?.tex ?? "" };
}

// ---------- domain and range ----------

function renderDomain(src: string): RenderedSvg {
  const W_ = words.domain;
  const def = oneFunction(src, words.need.domain);
  const e = def.e;
  const rat = toRat(e);
  const D = domainOf(e, def.restrict);
  const rows = [...D.rows];
  if (!D.any) rows.push({ tex: `x \\in \\mathbb{R}`, op: W_.all });
  if (def.restrict) rows.push({ tex: def.restrictTex, op: W_.solve });
  if (!D.dom.length) throw new Error(W_.empty);
  rows.push({ tex: `x \\in ${ivTex(D.dom)}`, op: W_.domain, color: C.green });
  const R = rangeOf(e, D.dom, rat, D.periodic.length > 0 || /sin|cos|tan/.test(key(e)), D.periodic.flatMap((p) => p.xs));
  rows.push(...R.rows);
  rows.push({ tex: `f(x) \\in ${ivTex(R.set)}`, op: W_.range, color: C.orange });
  const caps: Caption[] = [
    { text: fill(W_.domainCap, { d: ivPlain(D.dom) }), color: C.green },
    { text: fill(W_.rangeCap, { r: ivPlain(R.set) }), color: C.orange },
  ];
  for (const p of D.periodic) caps.push({ text: fill(W_.periodicCap, { list: p.plain }) });
  // The picture.
  const f = (x: number) => evalE(e, x);
  const featX = [0, ...D.dom.flatMap((iv) => [iv.lo.v, iv.hi.v]), ...R.cands.map((c) => c.x?.v ?? NaN)];
  const featY = R.set.flatMap((iv) => [iv.lo.v, iv.hi.v]);
  const win = windowFor([f], featX, featY);
  const fr = makeFrame("fnD", 48, 8, W - 72, 300, win.x, win.y);
  const parts = [axes(fr)];
  for (const p of D.periodic) for (const x of p.xs) if (x > fr.x0 && x < fr.x1) parts.push(dash(fr, x, fr.y0, x, fr.y1, C.red, `opacity="0.6"`));
  parts.push(curve(fr, f, C.blue, 2.6));
  parts.push(domainRangeMarks(fr, D.dom, R.set));
  // Excluded points on the curve: hollow; ends that belong: filled.
  for (const iv of D.dom)
    for (const [end, inc] of [[iv.lo, iv.loIn], [iv.hi, iv.hiIn]] as const) {
      if (!Number.isFinite(end.v) || end.v < fr.x0 || end.v > fr.x1) continue;
      const y = inc ? f(end.v) : limitOf(f, end.v, end === iv.lo ? 1 : -1);
      if (y !== null && Number.isFinite(y) && y > fr.y0 && y < fr.y1) parts.push(endDot(fr.sx(end.v), fr.sy(y), C.blue, inc));
    }
  parts.push(lbl(fr.left + 8, fr.top + 18, "y = f(x)", C.blue, "start", 13, false));
  return finish(`f(x) = ${tex(e)}`, rows, [{ svg: parts.join(""), h: 330 }], caps);
}

// ---------- composite functions and inverses ----------

const countY = (e: E): number =>
  e.k === "var" ? Number(e.name === "y") : e.k === "add" ? e.ts.reduce((n, t) => n + countY(t), 0) : e.k === "mul" ? e.fs.reduce((n, t) => n + countY(t), 0) : e.k === "pow" ? countY(e.b) + countY(e.e) : e.k === "fn" || e.k === "log" ? countY(e.a) : 0;
const hasY = (e: E) => countY(e) > 0;
const T = (e: E) => tex(tidy(e));
const one = (ts: E[], k: "add" | "mul"): E => (ts.length === 1 ? ts[0] : k === "add" ? add(...ts) : mul(...ts));
/** Sample points of a set (inside [−20, 20]). */
function samples(dom: Iv[], n = 400): number[] {
  const out: number[] = [];
  for (const iv of dom) {
    const [a, b] = [Math.max(iv.lo.v, -20), Math.min(iv.hi.v, 20)];
    if (b < a) continue;
    if (b === a) {
      out.push(a);
      continue;
    }
    for (let i = 1; i < n; i++) out.push(a + ((b - a) * i) / n);
  }
  return out;
}
/** −1, 0 or 1 when g keeps one sign on the set, NaN when it changes sign. */
function signOn(g: (x: number) => number, dom: Iv[]): number {
  const vs = samples(dom).map(g).filter(Number.isFinite);
  if (vs.every((v) => v >= -1e-12)) return 1;
  if (vs.every((v) => v <= 1e-12)) return -1;
  return NaN;
}

/** Undo f layer by layer: x = f(y) turned into y = …, one row per step. */
function invert(f: E, dom: Iv[], rows: TexLine[]): E {
  const W_ = words.inverse;
  let L: E = X;
  let Rh: E = substitute(f, "x", V("y"));
  rows.push({ tex: `y = ${tex(f)}`, op: W_.y });
  rows.push({ tex: `x = ${tex(Rh)}`, op: W_.swap });
  const fail = () => new Error(W_.noInverse);
  // How the layer inside behaves for x in the domain: what y stands for.
  const inner = (e: E) => (x: number) => evalE(substitute(e, "y", X), x);
  const show = (op: string) => rows.push({ tex: `${T(L)} = ${tex(Rh)}`, op });
  for (let step = 0; step < 14; step++) {
    if (Rh.k === "var" && Rh.name === "y") break;
    if (countY(Rh) > 1) {
      const r = toRat(substitute(Rh, "y", X));
      if (r && pdeg(r.n) <= 1 && pdeg(r.d) === 1) {
        // (a y + b) / (c y + d) = L
        const [b, a] = [r.n[0] ?? ZERO, r.n[1] ?? ZERO];
        const [d, c] = [r.d[0], r.d[1]];
        const lin = (p: Frac, q: Frac) => polyTex([q, p], "y");
        const Lt = L.k === "var" ? "x" : `\\left(${T(L)}\\right)`;
        rows.push({ tex: `${Lt}\\left(${lin(c, d)}\\right) = ${lin(a, b)}`, op: W_.collect });
        rows.push({ tex: `y\\left(${c.isOne() ? "" : c.tex()}${Lt}${a.isZero() ? "" : a.isNeg() ? ` + ${a.neg().tex()}` : ` - ${a.tex()}`}\\right) = ${b.tex()}${d.isZero() ? "" : d.isNeg() ? ` + ${d.neg().tex()}${Lt}` : ` - ${d.isOne() ? "" : d.tex()}${Lt}`}`, op: W_.factorY });
        const top = add(N(b), mul(N(d.neg()), L));
        const bot = add(mul(N(c), L), N(a.neg()));
        return tidy(div(simp(top), simp(bot)));
      }
      const p = toPoly(substitute(Rh, "y", X));
      if (p && pdeg(ptrim(p)) === 2) {
        const [c0, b1, a2] = [p[0] ?? ZERO, p[1] ?? ZERO, p[2]];
        const h = b1.neg().div(a2.mul(F(2)));
        const k = c0.sub(b1.mul(b1).div(a2.mul(F(4))));
        Rh = tidy(add(mul(N(a2), pow(add(V("y"), N(h.neg())), 2)), N(k)));
        show(W_.complete);
        continue;
      }
      throw fail();
    }
    switch (Rh.k) {
      case "add": {
        const withY = Rh.ts.filter(hasY);
        const c = tidy(one(Rh.ts.filter((t) => !hasY(t)), "add"));
        L = tidy(add(L, neg(c)));
        Rh = withY[0];
        const cn = isNum(c) ? c.v : null;
        show(cn && cn.isNeg() ? fill(W_.add, { c: plainOfTex(cn.neg().tex()) }) : fill(W_.subtract, { c: plainOfTex(tex(c)) }));
        break;
      }
      case "mul": {
        const withY = Rh.fs.filter(hasY);
        const k = tidy(one(Rh.fs.filter((t) => !hasY(t)), "mul"));
        L = tidy(div(L, k));
        Rh = withY[0];
        show(fill(W_.divide, { c: plainOfTex(tex(k)) }));
        break;
      }
      case "pow": {
        if (hasY(Rh.b) && isNum(Rh.e)) {
          const p = Rh.e.v;
          const b = Rh.b;
          if (p.n === -1 && p.d === 1) {
            L = tidy(pow(L, -1));
            Rh = b;
            show(W_.reciprocal);
          } else if (p.n === 1) {
            L = tidy(pow(L, p.d));
            Rh = b;
            show(fill(W_.power, { p: p.d }));
          } else if (p.isInt() && p.n > 1 && p.n % 2 === 0) {
            const sg = signOn(inner(b), dom);
            if (Number.isNaN(sg)) throw fail();
            const root = pow(L, N(F(1, p.n)));
            L = tidy(sg > 0 ? root : neg(root));
            Rh = b;
            show(p.n === 2 ? (sg > 0 ? W_.rootPlus : W_.rootMinus) : fill(W_.root, { n: `${p.n}th` }));
          } else {
            L = tidy(pow(L, N(ONE.div(p))));
            Rh = b;
            show(fill(W_.power, { p: plainOfTex(ONE.div(p).tex()) }));
          }
        } else if (!hasY(Rh.b) && hasY(Rh.e)) {
          L = Rh.b.k === "e" ? fn("ln", L) : isNum(Rh.b) ? { k: "log", base: Rh.b.v, a: L } : (() => { throw fail(); })();
          Rh = Rh.e;
          show(W_.log);
        } else throw fail();
        break;
      }
      case "fn": {
        const a = Rh.a;
        const u = inner(a);
        const within = (lo: number, hi: number) => samples(dom).map(u).every((v) => !Number.isFinite(v) || (v >= lo - 1e-9 && v <= hi + 1e-9));
        const undo: Partial<Record<string, () => E>> = {
          ln: () => pow({ k: "e" }, L),
          sin: () => (within(-Math.PI / 2, Math.PI / 2) ? fn("asin", L) : (() => { throw fail(); })()),
          cos: () => (within(0, Math.PI) ? fn("acos", L) : (() => { throw fail(); })()),
          tan: () => (within(-Math.PI / 2, Math.PI / 2) ? fn("atan", L) : (() => { throw fail(); })()),
          asin: () => fn("sin", L),
          acos: () => fn("cos", L),
          atan: () => fn("tan", L),
          abs: () => {
            const sg = signOn(u, dom);
            if (Number.isNaN(sg)) throw fail();
            return sg > 0 ? L : neg(L);
          },
        };
        const g = undo[Rh.f];
        if (!g) throw fail();
        const sg = Rh.f === "abs" ? signOn(u, dom) : 1;
        L = tidy(g());
        const f0 = Rh.f;
        Rh = a;
        show(f0 === "ln" ? W_.exp : f0 === "abs" ? fill(W_.absDrop, { s: sg > 0 ? "" : "−" }) : fill(W_.undo, { f: f0 }));
        break;
      }
      case "log": {
        L = pow(N(Rh.base), L);
        Rh = Rh.a;
        show(W_.exp);
        break;
      }
      default:
        throw fail();
    }
  }
  return L;
}

/** Two x with the same f(x), if f is not one-to-one on the set (searched on [−20, 20]). */
function twoToOne(f: (x: number) => number, dom: Iv[]): { a: number; b: number; y: number; turn: number } | null {
  for (const iv of dom) {
    const xs = samples([iv], 800);
    const ys = xs.map(f);
    let sign = 0;
    for (let i = 1; i < xs.length; i++) {
      const dy = ys[i] - ys[i - 1];
      if (!Number.isFinite(dy) || Math.abs(dy) < 1e-12) continue;
      const s = Math.sign(dy);
      if (sign && s !== sign) {
        // Turned at xs[i − 1]: find b on the other side with f(b) = f(a).
        const t = xs[i - 1];
        const a = xs[Math.max(0, i - 41)];
        const ya = f(a);
        let [lo, hi] = [t, xs[Math.min(xs.length - 1, i + 400)]];
        if ((f(hi) - ya) * (f(lo) - ya) > 0) return { a, b: NaN, y: ya, turn: t };
        for (let k = 0; k < 80; k++) {
          const m = (lo + hi) / 2;
          if ((f(m) - ya) * (f(lo) - ya) > 0) lo = m;
          else hi = m;
        }
        return { a, b: (lo + hi) / 2, y: ya, turn: t };
      }
      sign = s;
    }
  }
  return null;
}

/** x → [g] → g(x) → [f] → f(g(x)) */
function machines(steps: { name: string; rule: string; out: Num }[], x0: Num): Pic {
  const n = steps.length;
  const bw = Math.min(170, (W - 60 - n * 70) / n);
  const parts: string[] = [];
  let x = 24;
  const y = 40;
  const value = (t: string, cx: number) => {
    const r = latexToSvg(t, C.blue);
    const k = Math.min(1, 60 / r.width);
    return r.svg.replace(/width="[\d.]+"/, `width="${r2(r.width * k)}"`).replace(/height="[\d.]+"/, `height="${r2(r.height * k)}"`).replace(/^<svg/, `<svg x="${r2(cx - (r.width * k) / 2)}" y="${r2(y - (r.height * k) / 2)}"`);
  };
  parts.push(value(x0.tex, x + 26));
  x += 56;
  for (const s of steps) {
    parts.push(`<path d="M${x},${y} H${x + 20}" stroke="${C.ink}" stroke-width="1.6"/><path d="M${x + 20},${y - 5} L${x + 28},${y} L${x + 20},${y + 5}z" fill="${C.ink}"/>`);
    x += 30;
    parts.push(`<rect x="${r2(x)}" y="${y - 26}" width="${r2(bw)}" height="52" rx="10" fill="#f1f3f5" stroke="${C.purple}" stroke-width="1.6"/>`);
    const r = latexToSvg(s.rule, C.purple);
    const k = Math.min(1, (bw - 16) / r.width, 40 / r.height);
    parts.push(r.svg.replace(/width="[\d.]+"/, `width="${r2(r.width * k)}"`).replace(/height="[\d.]+"/, `height="${r2(r.height * k)}"`).replace(/^<svg/, `<svg x="${r2(x + bw / 2 - (r.width * k) / 2)}" y="${r2(y - (r.height * k) / 2)}"`));
    parts.push(`<text x="${r2(x + bw / 2)}" y="${y - 32}" ${FONT} font-size="13" font-weight="700" fill="${C.purple}" text-anchor="middle">${esc(s.name)}</text>`);
    x += bw + 4;
    parts.push(`<path d="M${x},${y} H${x + 20}" stroke="${C.ink}" stroke-width="1.6"/><path d="M${x + 20},${y - 5} L${x + 28},${y} L${x + 20},${y + 5}z" fill="${C.ink}"/>`);
    x += 30;
    parts.push(value(s.out.tex, x + 26));
    x += 56;
  }
  return { svg: parts.join(""), h: 84 };
}

function renderCompose(src: string): RenderedSvg {
  const W_ = words.compose;
  const Wi = words.inverse;
  const { defs, rest } = defsOf(src);
  if (!defs.length) throw new Error(words.need.compose);
  const byName = new Map(defs.map((d) => [d.name, d]));
  const get = (n: string) => {
    const d = byName.get(n);
    if (!d) throw new Error(fill(words.noLetter, { f: n }));
    return d;
  };
  type Q = { k: "comp"; outer: string; inner: string; at: string | null } | { k: "inv"; f: string; at: string | null } | { k: "val"; f: string; at: string };
  const qs_: Q[] = [];
  for (const raw of rest) {
    const t = raw.replace(/\s+/g, "").replace(/⁻¹/g, "^-1").replace(/\^\(-1\)/g, "^-1");
    let m = /^([a-z])([a-z])\((.+)\)$/.exec(t) ?? /^([a-z])\(([a-z])\((.+)\)\)$/.exec(t);
    if (m && byName.has(m[1]) && byName.has(m[2])) {
      qs_.push({ k: "comp", outer: m[1], inner: m[2], at: m[3] === "x" ? null : m[3] });
      continue;
    }
    m = /^([a-z])\^-1\((.+)\)$/.exec(t);
    if (m) {
      qs_.push({ k: "inv", f: m[1], at: m[2] === "x" ? null : m[2] });
      continue;
    }
    m = /^([a-z])\((.+)\)$/.exec(t);
    if (m && m[2] !== "x") {
      qs_.push({ k: "val", f: m[1], at: m[2] });
      continue;
    }
    throw new Error(fill(words.bad, { s: raw }));
  }
  if (!qs_.length) {
    if (defs.length >= 2) qs_.push({ k: "comp", outer: defs[0].name, inner: defs[1].name, at: null }, { k: "comp", outer: defs[1].name, inner: defs[0].name, at: null });
    else qs_.push({ k: "inv", f: defs[0].name, at: null });
  }
  const rows: TexLine[] = [];
  const caps: Caption[] = [];
  const pics: Pic[] = [];
  const header = defs.map((d) => `${d.name}(x) = ${tex(d.e)}${d.restrictTex ? `, \\; ${d.restrictTex}` : ""}`).join(", \\quad ");
  const valueOf = (e: E, at: string): Num => {
    const x = evalE(readExpr(at), 0);
    return exactAt(e, numOf(x));
  };
  const comps: { name: string; e: E }[] = [];
  for (const q of qs_) {
    if (q.k === "comp") {
      const [F_, G_] = [get(q.outer), get(q.inner)];
      const name = `${q.outer}${q.inner}`;
      if (q.at !== null) {
        const x0 = numOf(evalE(readExpr(q.at), 0));
        const g0 = exactAt(G_.e, x0);
        const f0 = exactAt(F_.e, g0);
        rows.push({ tex: `${q.inner}\\left(${x0.tex}\\right) ${eqTex(g0)}`, op: fill(W_.value, { f: q.outer, g: q.inner }) });
        rows.push({ tex: `${q.outer}\\left(${q.inner}\\left(${x0.tex}\\right)\\right) = ${q.outer}\\left(${g0.tex}\\right) ${eqTex(f0)}`, color: C.green });
        caps.push({ text: `${name}(${x0.plain}) ${eqPlain(f0)}`, color: C.green });
        caps.push({ text: fill(W_.machine, { f: q.outer, g: q.inner }) });
        pics.push(machines([{ name: q.inner, rule: tex(G_.e), out: g0 }, { name: q.outer, rule: tex(F_.e), out: f0 }], x0));
        continue;
      }
      const raw = substitute(F_.e, "x", G_.e);
      const s_ = simp(raw);
      rows.push({ tex: `${q.outer}${q.inner}(x) = ${q.outer}\\left(${tex(G_.e)}\\right) = ${tex(raw)}${tex(s_) === tex(raw) ? "" : ` = ${tex(s_)}`}`, op: fill(W_.sub, { g: q.inner }), color: C.green });
      // The domain: x must suit g, and g(x) must suit f.
      const D = domainOf(raw, G_.restrict);
      if (D.any || G_.restrict) rows.push({ tex: `x \\in ${ivTex(D.dom)}`, op: fill(W_.domainOf, { f: q.outer, g: q.inner }) });
      comps.push({ name, e: s_ });
      if (!caps.length) caps.push({ text: fill(W_.order, { f: q.outer, g: q.inner }) });
    } else if (q.k === "val") {
      const F_ = get(q.f);
      const v = valueOf(F_.e, q.at);
      const x0 = numOf(evalE(readExpr(q.at), 0));
      rows.push({ tex: `${q.f}\\left(${x0.tex}\\right) ${eqTex(v)}`, color: C.green });
      caps.push({ text: `${q.f}(${x0.plain}) ${eqPlain(v)}` });
    } else {
      const F_ = get(q.f);
      const D = domainOf(F_.e, F_.restrict);
      const fx = (x: number) => evalE(F_.e, x);
      const bad = twoToOne(fx, D.dom);
      if (bad) {
        const hint = fill(Wi.restrictHint, { v: numOf(bad.turn, 1e-6).plain });
        throw new Error(fill(Wi.notOneToOne, { a: numOf(bad.a, 1e-6).plain, b: Number.isFinite(bad.b) ? numOf(bad.b, 1e-6).plain : "…", y: numOf(bad.y, 1e-6).plain, hint }));
      }
      const R = rangeOf(F_.e, D.dom, toRat(F_.e), false);
      const inv = invert(F_.e, D.dom, rows);
      const invS = simp(inv);
      const best = tex(invS).length <= tex(inv).length + 4 ? invS : inv;
      rows.push({ tex: `${q.f}^{-1}(x) = ${tex(best)}`, op: Wi.result, color: C.green });
      rows.push({ tex: `x \\in ${ivTex(R.set)}`, op: Wi.domainSwap });
      rows.push({ tex: `${q.f}^{-1}(x) \\in ${ivTex(D.dom)}`, op: Wi.rangeSwap });
      if (q.at !== null) {
        const v = exactAt(best, numOf(evalE(readExpr(q.at), 0)));
        rows.push({ tex: `${q.f}^{-1}\\left(${numOf(evalE(readExpr(q.at), 0)).tex}\\right) ${eqTex(v)}`, color: C.blue });
        caps.push({ text: `${q.f}⁻¹(${q.at}) ${eqPlain(v)}`, color: C.green });
      }
      // Check at a point inside the range.
      const ys = samples(R.set, 7).filter((y) => Number.isFinite(evalE(best, y)));
      const y0 = ys[Math.floor(ys.length / 2)];
      if (y0 !== undefined && close(fx(evalE(best, y0)), y0, 1e-6)) caps.push({ text: fill(Wi.check, { x: nt(y0, 3) }), color: C.green });
      caps.push({ text: Wi.mirror });
      pics.push(inversePic(F_.e, best, D.dom, R.set, q.f));
    }
  }
  if (comps.length === 2) {
    const same = [-1.3, 0.4, 1.7, 2.9].every((x) => {
      const [a, b] = [evalE(comps[0].e, x), evalE(comps[1].e, x)];
      return !Number.isFinite(a) || !Number.isFinite(b) || close(a, b, 1e-9);
    });
    const [p, q] = [comps[0].name[0], comps[0].name[1]];
    caps.push({ text: fill(same ? W_.same : W_.differ, { f: p, g: q }), color: same ? C.green : C.ink });
  }
  if (comps.length) {
    const fs = comps.map((c) => (x: number) => evalE(c.e, x));
    const win = windowFor(fs, [0], []);
    const fr = makeFrame("fnC", 48, 8, W - 72, 260, win.x, win.y);
    const colors = [C.blue, C.purple];
    const parts = [axes(fr), ...fs.map((f, i) => curve(fr, f, colors[i], 2.4))];
    comps.forEach((c, i) => parts.push(lbl(fr.left + 8, fr.top + 18 + i * 18, `y = ${c.name}(x)`, colors[i], "start", 13, false)));
    pics.push({ svg: parts.join(""), h: 290 });
  }
  return finish(header, rows, pics, caps);
}

/** f, f⁻¹ and the mirror y = x, on equal scales, with a few points and their mirror images. */
function inversePic(f: E, inv: E, dom: Iv[], range: Iv[], name: string): Pic {
  const fx = (x: number) => (dom.some((iv) => x >= iv.lo.v - 1e-12 && x <= iv.hi.v + 1e-12) ? evalE(f, x) : NaN);
  const gx = (x: number) => (range.some((iv) => x >= iv.lo.v - 1e-12 && x <= iv.hi.v + 1e-12) ? evalE(inv, x) : NaN);
  const xs = samples(dom, 60).filter((x) => Math.abs(x) < 8);
  const pts = xs.map((x) => [x, fx(x)]).filter(([, y]) => Number.isFinite(y) && Math.abs(y) < 8);
  const all = pts.flat();
  let lo = Math.min(-1, ...all);
  let hi = Math.max(1, ...all);
  const pad = (hi - lo) * 0.08;
  [lo, hi] = [lo - pad, hi + pad];
  const size = 300;
  const fr = makeFrame("fnI", (W - size) / 2, 8, size, size, [lo, hi], [lo, hi]);
  const parts = [axes(fr, { xTicks: ticks(lo, hi, 8) }), curve(fr, (x) => x, C.grey, 1.4, `stroke-dasharray="6 4"`), curve(fr, fx, C.blue, 2.6), curve(fr, gx, C.orange, 2.6)];
  // Three points spread out along the curve (not bunched where it is flat).
  const near = pts.filter(([a, b]) => Math.abs(a) <= 4 && Math.abs(b) <= 4);
  const pool = near.length >= 3 ? near : pts;
  const pick: number[][] = [];
  const total = pool.slice(1).reduce((acc, p, i) => acc + Math.hypot(p[0] - pool[i][0], p[1] - pool[i][1]), 0);
  let run = 0;
  pool.forEach((p, i) => {
    if (i) run += Math.hypot(p[0] - pool[i - 1][0], p[1] - pool[i - 1][1]);
    if (pick.length < 3 && run >= (total * (pick.length + 0.5)) / 3) pick.push(p);
  });
  for (const [a, b] of pick) {
    parts.push(`<line x1="${r2(fr.sx(a))}" y1="${r2(fr.sy(b))}" x2="${r2(fr.sx(b))}" y2="${r2(fr.sy(a))}" stroke="${C.grey}" stroke-width="1.2" stroke-dasharray="2 3" clip-path="url(#fnI)"/>`);
    parts.push(dot(fr.sx(a), fr.sy(b), C.blue, 4), dot(fr.sx(b), fr.sy(a), C.orange, 4));
  }
  parts.push(lbl(fr.right + 8, fr.top + 18, `y = ${name}(x)`, C.blue, "start", 13, false), lbl(fr.right + 8, fr.top + 38, `y = ${name}⁻¹(x)`, C.orange, "start", 13, false), lbl(fr.right + 8, fr.top + 58, "y = x", C.grey, "start", 13, false));
  return { svg: parts.join(""), h: size + 30 };
}

// ---------- transformations ----------

type Stage = { A: number; B: number; h: number; D: number; abs?: "out" | "in" };
const applyStage = (f: (x: number) => number, s: Stage) => (x: number) => {
  if (s.abs === "out") return Math.abs(f(x));
  if (s.abs === "in") return f(Math.abs(x));
  return s.A * f(s.B * (x - s.h)) + s.D;
};
const mapPoint = (p: [number, number], s: Stage): [number, number] => [p[0] / s.B + s.h, s.A * p[1] + s.D];

/** y = A f(B(x − h)) + D in f notation. */
function stageTex(s: Stage, F_: string): string {
  if (s.abs === "out") return `y = \\left|${F_}(x)\\right|`;
  if (s.abs === "in") return `y = ${F_}\\left(\\left|x\\right|\\right)`;
  const k = (v: number) => numOf(v).tex;
  const shifted = s.h === 0 ? "x" : `x ${s.h > 0 ? "-" : "+"} ${k(Math.abs(s.h))}`;
  const inner = s.B === 1 ? shifted : s.B === -1 ? (s.h === 0 ? "-x" : `-\\left(${shifted}\\right)`) : s.h === 0 ? `${k(s.B)}x` : `${k(s.B)}\\left(${shifted}\\right)`;
  const a = s.A === 1 ? "" : s.A === -1 ? "-" : k(s.A);
  return `y = ${a}${F_}\\left(${inner}\\right)${s.D === 0 ? "" : ` ${s.D > 0 ? "+" : "-"} ${k(Math.abs(s.D))}`}`;
}

/** Turning points and intercepts of f: the points worth following. */
function keyPoints(e: E): [number, number][] {
  const f = (x: number) => evalE(e, x);
  const pts: [number, number][] = [];
  const add_ = (x: number) => {
    const y = f(x);
    if (Number.isFinite(y) && Math.abs(x) <= 6 && Math.abs(y) < 50 && !pts.some(([a]) => Math.abs(a - x) < 0.3)) pts.push([Number(x.toFixed(9)), Number(y.toFixed(9))]);
  };
  try {
    const d = simp(derive(e));
    criticalNumeric((x) => evalE(d, x), 6, 2400).zeros.forEach(add_);
  } catch {
    // no derivative
  }
  add_(0);
  criticalNumeric(f, 6, 2400).zeros.forEach(add_);
  for (const x of [1, -1, 2]) if (pts.length < 2) add_(x);
  return pts.slice(0, 3);
}

function renderTransform(src: string): RenderedSvg {
  const W_ = words.transform;
  const lines = src.split(/[;\n]+/).map((s) => s.trim()).filter(Boolean);
  let F_ = "";
  let fE: E | null = null;
  let body = "";
  for (const l of lines) {
    const m = /^([a-xzA-Z])\s*\(\s*x\s*\)\s*=\s*(.+)$/.exec(l);
    const y = /^y\s*=\s*(.+)$/.exec(l);
    if (m && !fE) [F_, fE] = [m[1], readExpr(m[2])];
    else if (y) body = y[1].trim();
    else if (m) body = m[2].trim();
    else throw new Error(fill(words.bad, { s: l }));
  }
  if (!fE || !body) throw new Error(words.need.transform);
  const f0 = fE;
  const call = (s: string) => s.replace(/\s+/g, "");
  const b = call(body);
  const esc_ = F_.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
  const stages: { s: Stage; op: string }[] = [];
  let full: E;
  if (new RegExp(`^(?:\\|${esc_}\\(x\\)\\||abs\\(${esc_}\\(x\\)\\))$`).test(b)) {
    stages.push({ s: { A: 1, B: 1, h: 0, D: 0, abs: "out" }, op: W_.absOut });
    full = fn("abs", f0);
  } else if (new RegExp(`^${esc_}\\((?:\\|x\\||abs\\(x\\))\\)$`).test(b)) {
    stages.push({ s: { A: 1, B: 1, h: 0, D: 0, abs: "in" }, op: W_.absIn });
    full = substitute(f0, "x", fn("abs", X));
  } else {
    const at = b.indexOf(`${F_}(`);
    if (at < 0 || b.indexOf(`${F_}(`, at + 1) >= 0) throw new Error(W_.notTransform);
    let depth = 0;
    let end = -1;
    for (let i = at + F_.length; i < b.length; i++) {
      if (b[i] === "(") depth++;
      else if (b[i] === ")" && --depth === 0) {
        end = i;
        break;
      }
    }
    if (end < 0) throw new Error(fill(words.bad, { s: body }));
    const innerSrc = b.slice(at + F_.length + 1, end);
    const outerSrc = `${b.slice(0, at)}(x)${b.slice(end + 1)}`;
    const inner = toPoly(readExpr(innerSrc));
    const outer = toPoly(readExpr(outerSrc));
    if (!inner || !outer || pdeg(inner) !== 1 || pdeg(outer) !== 1) throw new Error(W_.notTransform);
    const [C0, B] = [inner[0].toNumber(), inner[1].toNumber()];
    const [D, A] = [outer[0].toNumber(), outer[1].toNumber()];
    const h = -C0 / B;
    let cur: Stage = { A: 1, B: 1, h: 0, D: 0 };
    const push = (s: Stage, op: string) => {
      cur = s;
      stages.push({ s, op });
    };
    if (Math.abs(B) !== 1) push({ ...cur, B: Math.abs(B) }, fill(W_.stretchX, { k: numOf(1 / Math.abs(B)).plain }));
    if (B < 0) push({ ...cur, B }, W_.reflectY);
    if (h !== 0) push({ ...cur, h }, fill(W_.shiftX, { h: numOf(h).plain }));
    if (Math.abs(A) !== 1) push({ ...cur, A: Math.abs(A) }, fill(W_.stretchY, { k: numOf(Math.abs(A)).plain }));
    if (A < 0) push({ ...cur, A }, W_.reflectX);
    if (D !== 0) push({ ...cur, D }, fill(W_.shiftY, { d: numOf(D).plain }));
    if (!stages.length) throw new Error(W_.notTransform);
    full = add(mul(N(outer[1]), substitute(f0, "x", add(mul(N(inner[1]), X), N(inner[0])))), N(outer[0]));
  }
  const rows: TexLine[] = [{ tex: `y = ${F_}(x) = ${tex(f0)}`, op: W_.start }];
  for (const st of stages) rows.push({ tex: stageTex(st.s, F_), op: st.op });
  const fullS = simp(full);
  const ft = tex(tidy(full));
  rows.push({ tex: `y = ${ft}${tex(fullS) !== ft && tex(fullS).length < ft.length + 6 ? ` = ${tex(fullS)}` : ""}`, op: W_.full, color: C.green });
  // Where the key points go.
  const fx = (x: number) => evalE(f0, x);
  const pts = keyPoints(f0);
  const last = stages[stages.length - 1].s;
  const moved = pts.map((p) => (last.abs ? ([p[0], last.abs === "out" ? Math.abs(p[1]) : p[1]] as [number, number]) : mapPoint(p, last)));
  if (!last.abs) rows.push({ tex: `(x, y) \\mapsto \\left(${mapTexX(last)}, \\; ${mapTexY(last)}\\right)`, op: W_.map });
  const P = (p: [number, number]) => `(${numOf(p[0]).plain}, ${numOf(p[1]).plain})`;
  const caps: Caption[] = [{ text: fill(W_.points, { list: pts.map((p, i) => `${P(p)} → ${P(moved[i])}`).join(", ") }) }];
  // One small picture per step: the curve before (dashed) and after.
  const fns = [fx, ...stages.map((st) => applyStage(fx, st.s))];
  const allPts = [pts, ...stages.map((st) => pts.map((p) => (st.s.abs ? ([p[0], st.s.abs === "out" ? Math.abs(p[1]) : p[1]] as [number, number]) : mapPoint(p, st.s))))];
  const win = windowFor(fns, allPts.flat().map((p) => p[0]), allPts.flat().map((p) => p[1]), 3);
  // Around the key points: far-off tails would squash what moves.
  const kys = allPts.flat().map((p) => p[1]);
  if (kys.length) {
    const [lo, hi] = [Math.min(0, ...kys), Math.max(0, ...kys)];
    const pad = Math.max(2, (hi - lo) * 0.6);
    win.y = [Math.max(win.y[0], lo - pad), Math.min(win.y[1], hi + pad)];
  }
  const labels = stages.map((st) => latexToSvg(stageTex(st.s, F_), C.ink));
  const top = 10 + Math.max(...labels.map((l) => Math.min(l.height * 0.85, 44)));
  const cols = stages.length === 1 ? 1 : 2;
  const pw = cols === 1 ? 420 : 280;
  const ph = 190;
  const parts: string[] = [];
  stages.forEach((st, i) => {
    const [cx, cy] = [cols === 1 ? (W - pw) / 2 : 40 + (i % 2) * (pw + 30), top + Math.floor(i / 2) * (ph + top + 20)];
    const fr = makeFrame(`fnT${i}`, cx, cy, pw, ph, win.x, win.y);
    parts.push(axes(fr, { xTicks: ticks(win.x[0], win.x[1], cols === 1 ? 10 : 7) }));
    parts.push(curve(fr, fns[i], C.grey, 1.8, `stroke-dasharray="6 4"`));
    parts.push(curve(fr, fns[i + 1], C.blue, 2.4));
    allPts[i].forEach((p, j) => {
      const q = allPts[i + 1][j];
      const [x1, y1, x2, y2] = [fr.sx(p[0]), fr.sy(p[1]), fr.sx(q[0]), fr.sy(q[1])];
      if (Math.hypot(x2 - x1, y2 - y1) > 6) parts.push(arrowPx(x1, y1, x2, y2, C.orange));
      parts.push(dot(x2, y2, C.orange, 3.5));
    });
    const lt = labels[i];
    const k = Math.min(0.85, (pw - 10) / lt.width);
    parts.push(lt.svg.replace(/width="[\d.]+"/, `width="${r2(lt.width * k)}"`).replace(/height="[\d.]+"/, `height="${r2(lt.height * k)}"`).replace(/^<svg/, `<svg x="${r2(cx)}" y="${r2(cy - 4 - lt.height * k)}"`));
    parts.push(`<text x="${r2(cx + pw)}" y="${r2(cy - 8)}" ${FONT} font-size="11" font-weight="700" fill="${C.blue}" text-anchor="end">${i + 1}</text>`);
  });
  const h = top + Math.ceil(stages.length / cols) * (ph + top + 20) - top + 10;
  return finish(`${F_}(x) = ${tex(f0)} \\quad\\longrightarrow\\quad ${stageTex(last, F_)}`, rows, [{ svg: parts.join(""), h }], caps);
}
const mapTexX = (s: Stage) => {
  const k = numOf(1 / s.B);
  const base = s.B === 1 ? "x" : s.B === -1 ? "-x" : k.tex.startsWith("-") ? `-${k.tex.slice(1)}x` : `${k.tex}x`;
  return s.h === 0 ? base : `${base} ${s.h > 0 ? "+" : "-"} ${numOf(Math.abs(s.h)).tex}`;
};
const mapTexY = (s: Stage) => {
  const base = s.A === 1 ? "y" : s.A === -1 ? "-y" : `${numOf(s.A).tex}y`;
  return s.D === 0 ? base : `${base} ${s.D > 0 ? "+" : "-"} ${numOf(Math.abs(s.D)).tex}`;
};
function arrowPx(x0: number, y0: number, x1: number, y1: number, color: string): string {
  const [dx, dy] = [x1 - x0, y1 - y0];
  const L = Math.hypot(dx, dy);
  const [ux, uy] = [dx / L, dy / L];
  const [bx, by] = [x1 - ux * 7, y1 - uy * 7];
  return `<line x1="${r2(x0)}" y1="${r2(y0)}" x2="${r2(bx)}" y2="${r2(by)}" stroke="${color}" stroke-width="1.4" opacity="0.8"/><path d="M${r2(x1)},${r2(y1)} L${r2(bx - uy * 3.5)},${r2(by + ux * 3.5)} L${r2(bx + uy * 3.5)},${r2(by - ux * 3.5)}z" fill="${color}" opacity="0.8"/>`;
}

// ---------- curve sketching ----------

type Feature = { x: number; y: number; label: string; color: string; hollow?: boolean };

/** Signs of f and f′ between their special points, drawn above the graph on the same x-scale. */
function signStrip(fr: Frame, rowsOf: { name: string; g: (x: number) => number; cuts: number[]; color: string }[], y0: number): string {
  const parts: string[] = [];
  rowsOf.forEach((r, k) => {
    const y = y0 + k * 30;
    parts.push(`<text x="${fr.left - 8}" y="${y + 5}" ${FONT} font-size="14" font-weight="700" fill="${r.color}" text-anchor="end">${esc(r.name)}</text>`);
    parts.push(`<line x1="${fr.left}" y1="${y}" x2="${fr.right}" y2="${y}" stroke="#ced4da" stroke-width="1"/>`);
    const cuts = [fr.x0, ...r.cuts.filter((x) => x > fr.x0 && x < fr.x1).sort((a, b) => a - b), fr.x1];
    for (let i = 0; i + 1 < cuts.length; i++) {
      const m = (cuts[i] + cuts[i + 1]) / 2;
      const v = r.g(m);
      if (!Number.isFinite(v) || Math.abs(v) < 1e-12) continue;
      parts.push(`<text x="${r2(fr.sx(m))}" y="${y + 5}" ${FONT} font-size="15" font-weight="700" fill="${v > 0 ? C.green : C.red}" text-anchor="middle">${v > 0 ? "+" : "−"}</text>`);
    }
    for (const x of cuts.slice(1, -1)) parts.push(`<line x1="${r2(fr.sx(x))}" y1="${y - 9}" x2="${r2(fr.sx(x))}" y2="${y + 9}" stroke="#868e96" stroke-width="1.3"/>`);
  });
  return parts.join("");
}

function renderSketch(src: string): RenderedSvg {
  const W_ = words.sketch;
  const def = oneFunction(src, words.need.sketch);
  const e = def.e;
  const f = (x: number) => evalE(e, x);
  const rows: TexLine[] = [];
  const caps: Caption[] = [];
  const feats: Feature[] = [];
  const asymX: number[] = [];
  const asymLines: ((x: number) => number)[] = [];
  let zeros: number[] = [];
  let stat: number[] = [];
  let poles: number[] = [];
  let dfun: (x: number) => number;
  const raw = toRat(e);
  if (raw) {
    // ----- exactly: a polynomial or a fraction of polynomials -----
    const r0 = tidyRat(raw);
    const poly = pdeg(r0.d) === 0;
    const g = pgcd(r0.n, r0.d);
    const holes = pdeg(g) >= 1 ? rootsOf(g) : [];
    const r: Rat = holes.length ? tidyRat({ n: pdivmod(r0.n, g).q, d: pdivmod(r0.d, g).q }) : r0;
    const eR = (x: number) => pnum(r.n, x) / pnum(r.d, x);
    const fTex = ratTex(r0, true);
    if (fTex !== tex(e)) rows.push({ tex: `f(x) = ${fTex}`, op: W_.factor });
    if (holes.length) {
      rows.push({ tex: `f(x) = ${ratTex(r, true)}, \\quad x \\ne ${holes.map((h) => h.tex).join(", ")}`, op: W_.cancel });
      for (const h of holes) {
        const v = exactAt(tidy(div(polyE(r.n), polyE(r.d))), h, r);
        caps.push({ text: fill(W_.hole, { x: h.plain, y: v.plain }) });
        feats.push({ x: h.v, y: v.v, label: "", color: C.blue, hollow: true });
      }
    }
    // Intercepts.
    if (Math.abs(pnum(r0.d, 0)) > 1e-12) {
      const v = exactAt(e, numF(ZERO), r0);
      rows.push({ tex: `f(0) ${eqTex(v)}`, op: W_.yInt });
      feats.push({ x: 0, y: v.v, label: `(0, ${v.plain})`, color: C.ink });
    } else caps.push({ text: W_.noYInt });
    const xs = rootsOf(r.n);
    zeros = xs.map((x) => x.v);
    if (xs.length) {
      rows.push({ tex: `${factorTex(r.n)} = 0 \\;\\Rightarrow\\; x = ${xs.map((x) => x.tex).join(", \\; ")}`, op: W_.xInt });
      for (const x of xs) feats.push({ x: x.v, y: 0, label: `(${x.plain}, 0)`, color: C.ink });
      for (const fct of factorize(r.n).fs) if (fct.e % 2 === 0) caps.push({ text: fill(W_.touches, { x: numF(F(fct.a, fct.b)).plain }) });
    } else if (pdeg(r.n) >= 1 || r.n[0].isZero()) caps.push({ text: W_.noXInt });
    else caps.push({ text: W_.noXInt });
    // Asymptotes.
    if (!poly) {
      const ps = rootsOf(r.d);
      poles = ps.map((p) => p.v);
      if (ps.length) {
        rows.push({ tex: `${factorTex(r.d)} = 0 \\;\\Rightarrow\\; x = ${ps.map((p) => p.tex).join(", \\; ")}`, op: W_.vert, color: C.red });
        for (const p of ps) {
          asymX.push(p.v);
          const [l, rr] = [limitOf(eR, p.v, -1), limitOf(eR, p.v, 1)];
          const s_ = (v: number | null) => (v === null ? "?" : v > 0 ? "+∞" : "−∞");
          caps.push({ text: fill(W_.sides, { a: p.plain, l: s_(l), r: s_(rr) }) });
        }
      }
      const [dn, dd] = [pdeg(r.n), pdeg(r.d)];
      if (dn <= dd) {
        const c = dn < dd ? ZERO : lead(r.n).div(lead(r.d));
        rows.push({ tex: dn < dd ? `y = 0` : `y = \\frac{${lead(r.n).tex()}}{${lead(r.d).tex()}} = ${c.tex()}`.replace(`\\frac{${c.tex()}}{1} = `, ""), op: W_.horiz, color: C.red });
        asymLines.push(() => c.toNumber());
        const cross = rootsOf(psub(r.n, pscale(r.d, c))).filter((x) => Math.abs(pnum(r.d, x.v)) > 1e-12);
        for (const x of cross) caps.push({ text: fill(W_.crosses, { x: x.plain }) });
      } else if (dn === dd + 1) {
        const { q, r: rem } = pdivmod(r.n, r.d);
        rows.push({ tex: `f(x) = ${polyTex(q)} ${rem.length && !rem.every((c) => c.isZero()) ? `+ \\frac{${polyTex(rem)}}{${polyTex(r.d)}}` : ""} \\;\\Rightarrow\\; y = ${polyTex(q)}`.replace("+ \\frac{-", "- \\frac{"), op: W_.oblique, color: C.red });
        asymLines.push((x) => pnum(q, x));
      } else caps.push({ text: W_.noHoriz });
    }
    // The derivative and stationary points.
    const P = psub(pmul(pderiv(r.n), r.d), pmul(r.n, pderiv(r.d)));
    const dTex = poly ? polyTex(pscale(P, ONE.div(pmul(r.d, r.d)[0]))) : `\\frac{${factorTex(P)}}{${factorTex(pmul(r.d, r.d))}}`;
    rows.push({ tex: `f'(x) = ${dTex}`, op: W_.deriv });
    dfun = (x: number) => pnum(P, x) / pnum(pmul(r.d, r.d), x);
    const st = rootsOf(P).filter((x) => Math.abs(pnum(r.d, x.v)) > 1e-12 && !holes.some((h) => close(h.v, x.v)));
    stat = st.map((x) => x.v);
    if (st.length) {
      const parts = st.map((x) => `\\left(${x.tex}, \\; ${exactAt(e, x, r0).tex}\\right)`);
      rows.push({ tex: `f'(x) = 0 \\;\\Rightarrow\\; ${parts.join(", \\; ")}`, op: W_.stat, color: C.green });
      for (const x of st) {
        const v = exactAt(e, x, r0);
        const kind = classifyStat(dfun, x.v);
        feats.push({ x: x.v, y: v.v, label: `${W_[kind]} (${x.plain}, ${v.plain})`, color: kind === "max" ? C.red : kind === "min" ? C.green : C.purple });
        caps.push({ text: fill(W_.statCap, { k: W_[kind], x: x.plain, y: v.plain }), color: kind === "max" ? C.red : kind === "min" ? C.green : C.purple });
      }
    } else caps.push({ text: W_.noStat });
    if (poly || !asymLines.length) {
      const L = (side: number) => {
        const v = limitOf(eR, side * Infinity, 1);
        return v === null ? "?" : v === Infinity ? "∞" : v === -Infinity ? "−∞" : numOf(v, 1e-6).plain;
      };
      caps.push({ text: fill(W_.ends, { l: L(-1), r: L(1) }) });
    }
  } else {
    // ----- numerically -----
    const D = domainOf(e, def.restrict);
    rows.push(...D.rows.slice(0, 3));
    if (D.any) rows.push({ tex: `x \\in ${ivTex(D.dom)}`, op: words.domain.domain });
    const inDom = (x: number) => D.dom.some((iv) => (x > iv.lo.v || (iv.loIn && x === iv.lo.v)) && (x < iv.hi.v || (iv.hiIn && x === iv.hi.v)));
    if (inDom(0) && Number.isFinite(f(0))) {
      const v = exactAt(e, numF(ZERO));
      rows.push({ tex: `f(0) ${eqTex(v)}`, op: W_.yInt });
      feats.push({ x: 0, y: v.v, label: `(0, ${v.plain})`, color: C.ink });
    } else caps.push({ text: W_.noYInt });
    const c = criticalNumeric(f, 10, 4000);
    zeros = c.zeros.slice(0, 8);
    if (zeros.length) {
      rows.push({ tex: `f(x) = 0 \\;\\Rightarrow\\; x ${zeros.length && zeros.every((z) => !numOf(z).approx) ? "=" : "\\approx"} ${zeros.slice(0, 5).map((z) => numOf(z).tex).join(", \\; ")}${zeros.length > 5 ? ", \\ldots" : ""}`, op: `${W_.xInt} (${W_.numeric})` });
      for (const z of zeros) feats.push({ x: z, y: 0, label: "", color: C.ink });
    } else caps.push({ text: W_.noXInt });
    // Vertical asymptotes: where f runs off to ±∞ at a gap or an end of the domain.
    const cands = [...c.poles, ...D.dom.flatMap((iv) => [iv.lo.v, iv.hi.v]).filter(Number.isFinite)];
    for (const p of cands.filter((x, i, a) => a.findIndex((y) => close(x, y, 1e-9)) === i)) {
      const [l, rr] = [limitOf(f, p, -1), limitOf(f, p, 1)];
      if ((l !== null && !Number.isFinite(l)) || (rr !== null && !Number.isFinite(rr))) {
        poles.push(p);
        asymX.push(p);
      }
    }
    if (poles.length) rows.push({ tex: `x = ${poles.map((p) => numOf(p).tex).join(", \\; ")}`, op: W_.vert, color: C.red });
    const ends = [-1, 1].map((sd) => (inDom(sd * 1e6) ? limitOf(f, sd * Infinity, 1) : null));
    const hs = ends.filter((v): v is number => v !== null && Number.isFinite(v)).filter((v, i, a) => a.indexOf(v) === i);
    if (hs.length) {
      rows.push({ tex: hs.map((v) => `y = ${numOf(v, 1e-6).tex}`).join(", \\; "), op: W_.horiz, color: C.red });
      for (const v of hs) asymLines.push(() => v);
    }
    let d: E | null = null;
    try {
      d = simp(derive(e));
    } catch {
      d = null;
    }
    dfun = d ? (x: number) => evalE(d!, x) : (x: number) => (f(x + 1e-6) - f(x - 1e-6)) / 2e-6;
    if (d) rows.push({ tex: `f'(x) = ${tex(d)}`, op: W_.deriv });
    stat = criticalNumeric(dfun, 10, 4000).zeros.filter((x) => inDom(x) && Number.isFinite(f(x))).slice(0, 6);
    if (stat.length) {
      const parts = stat.map((x) => `\\left(${numOf(x).tex}, \\; ${exactAt(e, numOf(x)).tex}\\right)`);
      rows.push({ tex: `f'(x) = 0 \\;\\Rightarrow\\; ${parts.join(", \\; ")}`, op: `${W_.stat} (${W_.numeric})`, color: C.green });
      for (const x of stat) {
        const v = exactAt(e, numOf(x));
        const kind = classifyStat(dfun, x);
        feats.push({ x, y: v.v, label: `${W_[kind]} (${numOf(x).plain}, ${v.plain})`, color: kind === "max" ? C.red : kind === "min" ? C.green : C.purple });
        caps.push({ text: fill(W_.statCap, { k: W_[kind], x: numOf(x).plain, y: v.plain }), color: kind === "max" ? C.red : kind === "min" ? C.green : C.purple });
      }
    } else caps.push({ text: W_.noStat });
  }
  // Where f is positive and negative.
  const cutsF = [...zeros, ...poles].sort((a, b) => a - b);
  {
    const ends = [-Infinity, ...cutsF, Infinity];
    const pos: string[] = [];
    const negs: string[] = [];
    for (let i = 0; i + 1 < ends.length; i++) {
      const [a, b] = [ends[i], ends[i + 1]];
      const m = a === -Infinity ? (b === Infinity ? 0 : b - 1) : b === Infinity ? a + 1 : (a + b) / 2;
      const v = f(m);
      if (!Number.isFinite(v) || v === 0) continue;
      const t = `(${numOf(a).plain}, ${numOf(b).plain})`;
      (v > 0 ? pos : negs).push(t);
    }
    if (pos.length && negs.length && cutsF.length <= 6) caps.push({ text: fill(W_.positive, { p: pos.join(" ∪ "), n: negs.join(" ∪ ") }) });
  }
  // The picture: signs of f and f′, then the graph.
  const featX = [0, ...feats.map((p) => p.x), ...asymX];
  const featY = feats.map((p) => p.y);
  const win = windowFor([f], featX, featY, 4);
  // Around the features: a polynomial's far ends would squash its turning points.
  if (featY.length) {
    const [lo, hi] = [Math.min(0, ...featY), Math.max(0, ...featY)];
    const pad = Math.max(2, (hi - lo) * 0.8);
    win.y = [Math.max(win.y[0], lo - pad), Math.min(win.y[1], hi + pad)];
  }
  const stripH = 70;
  const fr = makeFrame("fnS", 48, stripH + 10, W - 72, 320, win.x, win.y);
  const parts: string[] = [signStrip(fr, [{ name: "f", g: f, cuts: cutsF, color: C.blue }, { name: "f′", g: dfun, cuts: [...stat, ...poles], color: C.orange }], 18)];
  parts.push(axes(fr));
  for (const x of asymX) parts.push(dash(fr, x, fr.y0, x, fr.y1, C.red));
  for (const g of asymLines) parts.push(curve(fr, g, C.red, 1.6, `stroke-dasharray="7 5"`));
  parts.push(curve(fr, f, C.blue, 2.6));
  for (const p of feats) {
    if (p.x < fr.x0 || p.x > fr.x1 || p.y < fr.y0 || p.y > fr.y1) continue;
    parts.push(dot(fr.sx(p.x), fr.sy(p.y), p.hollow ? C.blue : p.color, 4.5, p.hollow));
    if (p.label && p.color !== C.ink) parts.push(lbl(fr.sx(p.x), fr.sy(p.y) + (p.color === C.red ? -10 : 20), p.label, p.color, "middle", 12, false));
  }
  return finish(`f(x) = ${tex(e)}`, rows, [{ svg: parts.join(""), h: stripH + 10 + 320 + 24 }], caps);
}
function classifyStat(d: (x: number) => number, x: number): "max" | "min" | "inflection" {
  const h = 1e-4 * Math.max(1, Math.abs(x));
  const [l, r] = [d(x - h), d(x + h)];
  return l > 0 && r < 0 ? "max" : l < 0 && r > 0 ? "min" : "inflection";
}
function polyE(p: P): E {
  const ts: E[] = [];
  p.forEach((c, k) => {
    if (!c.isZero()) ts.push(k === 0 ? N(c) : mul(N(c), k === 1 ? X : pow(X, k)));
  });
  return ts.length ? (ts.length === 1 ? ts[0] : add(...ts)) : N(0);
}

// ---------- the tool ----------

export function renderFunctions(spec: FnSpec, w: FnWords): RenderedSvg {
  words = w;
  exprMessages({ bad: w.bad, onlyX: w.onlyX, tooBig: w.tooBig });
  switch (spec.topic) {
    case "domain":
      return renderDomain(spec.src);
    case "compose":
      return renderCompose(spec.src);
    case "transform":
      return renderTransform(spec.src);
    case "sketch":
      return renderSketch(spec.src);
  }
}

const S = (topic: FnTopic, src: string): FnSpec => ({ topic, src });
export const FN_PRESETS: { [K in FnTopic]: { label: string; spec: FnSpec }[] } = {
  domain: [
    { label: "√(x + 3)/(x − 2)", spec: S("domain", "sqrt(x + 3)/(x - 2)") },
    { label: "1/(x² − 1)", spec: S("domain", "1/(x^2 - 1)") },
    { label: "ln(4 − x²)", spec: S("domain", "ln(4 - x^2)") },
    { label: "x² − 4x + 7", spec: S("domain", "x^2 - 4x + 7") },
    { label: "(x + 1)/(x − 1)", spec: S("domain", "(x + 1)/(x - 1)") },
    { label: "√(9 − x²)", spec: S("domain", "sqrt(9 - x^2)") },
    { label: "x², x ≥ 1", spec: S("domain", "f(x) = x^2, x >= 1") },
    { label: "tan x", spec: S("domain", "tan(x)") },
  ],
  compose: [
    { label: "fg, gf", spec: S("compose", "f(x) = 2x + 3; g(x) = x^2") },
    { label: "fg(2)", spec: S("compose", "f(x) = 2x + 3; g(x) = x^2; fg(2)") },
    { label: "f⁻¹: (2x + 1)/(x − 3)", spec: S("compose", "f(x) = (2x + 1)/(x - 3); f^-1(x)") },
    { label: "f⁻¹: 3√(2x − 1) + 4", spec: S("compose", "f(x) = 3sqrt(2x - 1) + 4") },
    { label: "f⁻¹: x² − 4x, x ≥ 2", spec: S("compose", "f(x) = x^2 - 4x, x >= 2") },
    { label: "f⁻¹: e^(2x) + 1", spec: S("compose", "f(x) = e^(2x) + 1") },
    { label: "√ inside ln", spec: S("compose", "f(x) = sqrt(x); g(x) = ln(x); fg(x); gf(x)") },
  ],
  transform: [
    { label: "2f(x − 3) + 1", spec: S("transform", "f(x) = x^2; y = 2f(x - 3) + 1") },
    { label: "−f(2x)", spec: S("transform", "f(x) = x^3 - 3x; y = -f(2x)") },
    { label: "f(x/2) − 1", spec: S("transform", "f(x) = sin(x); y = f(x/2) - 1") },
    { label: "|f(x)|", spec: S("transform", "f(x) = x^2 - 4; y = |f(x)|") },
    { label: "f(|x|)", spec: S("transform", "f(x) = (x - 1)(x - 3); y = f(|x|)") },
    { label: "1/x → 3f(x + 2)", spec: S("transform", "f(x) = 1/x; y = 3f(x + 2)") },
  ],
  sketch: [
    { label: "(x² − 1)/(x − 2)", spec: S("sketch", "(x^2 - 1)/(x - 2)") },
    { label: "(2x + 1)/(x − 3)", spec: S("sketch", "(2x + 1)/(x - 3)") },
    { label: "x/(x² − 4)", spec: S("sketch", "x/(x^2 - 4)") },
    { label: "x³ − 3x² + 4", spec: S("sketch", "x^3 - 3x^2 + 4") },
    { label: "(x² − 1)/(x² + 1)", spec: S("sketch", "(x^2 - 1)/(x^2 + 1)") },
    { label: "x·e⁻ˣ", spec: S("sketch", "x e^(-x)") },
    { label: "ln(x)/x", spec: S("sketch", "ln(x)/x") },
  ],
};
