// Trigonometric identities: exact values from the compound, double and half angle formulas (and from given ratios),
// a·sin x + b·cos x as R·sin(x + α), proofs (each side rewritten in sin and cos of one angle, put over one fraction,
// then sin² + cos² = 1 and cancelling — the shortest route on which the two sides meet), and equations that need an
// identity first (a quadratic in sin, cos or tan, a common factor, the R-form). Exact numbers are sums of surds.
import { axes, C, compose, curve, dot, esc, fill, FONT, hline, lbl, legend, makeFrame, nt, r2, texLines, tn, vline, W, yRange, sampleY, type Caption, type TexLine } from "./chart";
import { add, div, evalE, exprMessages, fn, gcd, isNum, key, mul, N, neg, parseE, pow, qsNum, qsTex, realRoots, sqrtSplit, sub, tex, tidy, V, type E, type Fn } from "./expr";
import { Frac } from "./fraction";
import { latexToSvg, type RenderedSvg } from "./latex";

export type IdTopic = "compound" | "rform" | "prove" | "equation";
export const ID_TOPICS: IdTopic[] = ["compound", "rform", "prove", "equation"];
export type IdSpec = { topic: IdTopic; src: string };

type Pyth = "pyth" | "redC" | "redS" | "toC2" | "toS2";
type Formula = "sinSum" | "cosSum" | "tanSum" | "sin2" | "cos2" | "tan2" | "recip" | "pyth" | "half";

export type IdWords = {
  bad: string;
  onlyX: string;
  tooBig: string;
  need: Record<IdTopic, string>;
  onlyTrig: string;
  linearArg: string;
  angle15: string;
  noValue: string;
  zeroDiv: string;
  lhs: string;
  rhs: string;
  or: string;
  formulas: Record<Formula, string>;
  formulasUsed: string;
  steps: {
    compound: string;
    exact: string;
    negative: string;
    double: string;
    split: string;
    recip: string;
    combine: string;
    expand: string;
    simplify: string;
    factorise: string;
    cancel: string;
    rearrange: string;
    pyth: Record<Pyth, string>;
  };
  prove: {
    start: string;
    done: string;
    checked: string;
    notIdentity: string;
    counter: string;
    tryEquation: string;
    graphCap: string;
    bridge: string;
  };
  eq: {
    given: string;
    subst: string;
    collect: string;
    times: string;
    divide: string;
    factorise: string;
    formula: string;
    values: string;
    principal: string;
    outside: string;
    noneInRange: string;
    solutions: string;
    noSolutions: string;
    always: string;
    rejected: string;
    numeric: string;
    graphCap: string;
    badInterval: string;
  };
  rform: {
    expand: string;
    compare: string;
    squareAdd: string;
    divide: string;
    result: string;
    max: string;
    solve: string;
    needBoth: string;
    notLinear: string;
    triangle: string;
    graphCap: string;
  };
  compound: {
    split: string;
    formula: string;
    values: string;
    simplify: string;
    rationalise: string;
    timesBoth: string;
    standard: string;
    half: string;
    sign: string;
    notExact: string;
    recip: string;
    given: string;
    quadrant: string;
    assume: string;
    wrongQuad: string;
    other: string;
    tanRatio: string;
    find: string;
    noTan: string;
    tooHard: string;
    expand: string;
    expandCap: string;
    circleCap: string;
    acute: string;
    obtuse: string;
  };
};

let words: IdWords;

// ---------- exact numbers Σ q·√r ----------

const fr = (n: number, d = 1) => new Frac(n, d);
const lcmN = (a: number, b: number) => (a / gcd(a, b)) * b;
const mod = (x: number, m: number) => ((x % m) + m) % m;
function smallestPrime(n: number): number {
  for (let p = 2; p * p <= n; p++) if (n % p === 0) return p;
  return n;
}
/** A fraction with a small denominator, if v is one. */
function ratOf(v: number, maxDen = 24): Frac | null {
  if (!Number.isFinite(v)) return null;
  for (let d = 1; d <= maxDen; d++) {
    const n = Math.round(v * d);
    if (Math.abs(n / d - v) < 1e-9 && Math.abs(n) < 1e9) return fr(n, d);
  }
  return null;
}

class Sd {
  readonly t: ReadonlyMap<number, Frac>;
  constructor(t: ReadonlyMap<number, Frac>) {
    this.t = t;
  }
  static readonly ZERO = new Sd(new Map());
  static of(q: Frac | number, r = 1): Sd {
    const f = typeof q === "number" ? fr(q) : q;
    if (f.isZero() || r === 0) return Sd.ZERO;
    const { out, s } = sqrtSplit(fr(r));
    return new Sd(new Map([[s, f.mul(out)]]));
  }
  static readonly ONE = Sd.of(1);
  private static make(m: Map<number, Frac>): Sd {
    for (const [r, q] of [...m]) if (q.isZero()) m.delete(r);
    return new Sd(m);
  }
  add(o: Sd): Sd {
    if (!o.t.size) return this;
    if (!this.t.size) return o;
    const m = new Map(this.t);
    for (const [r, q] of o.t) m.set(r, (m.get(r) ?? fr(0)).add(q));
    return Sd.make(m);
  }
  neg(): Sd {
    return new Sd(new Map([...this.t].map(([r, q]) => [r, q.neg()])));
  }
  sub(o: Sd): Sd {
    return this.add(o.neg());
  }
  scale(f: Frac): Sd {
    return Sd.make(new Map([...this.t].map(([r, q]) => [r, q.mul(f)])));
  }
  mul(o: Sd): Sd {
    if (!this.t.size || !o.t.size) return Sd.ZERO;
    const m = new Map<number, Frac>();
    for (const [r1, q1] of this.t)
      for (const [r2, q2] of o.t) {
        // √r1·√r2 = g·√(r1r2/g²) with g = gcd(r1, r2), both square-free.
        const g = gcd(r1, r2);
        const r = (r1 / g) * (r2 / g);
        const q = q1.mul(q2).mul(fr(g));
        m.set(r, (m.get(r) ?? fr(0)).add(q));
      }
    return Sd.make(m);
  }
  isZero() {
    return this.t.size === 0;
  }
  eq(o: Sd) {
    return this.sub(o).isZero();
  }
  isOne() {
    return this.eq(Sd.ONE);
  }
  val(): number {
    let v = 0;
    for (const [r, q] of this.t) v += q.toNumber() * Math.sqrt(r);
    return v;
  }
  rat(): Frac | null {
    if (!this.t.size) return fr(0);
    return this.t.size === 1 && this.t.has(1) ? this.t.get(1)! : null;
  }
  /** 1/x: multiply by conjugates (one prime at a time) until the bottom is rational. */
  inv(): Sd {
    if (this.isZero()) throw new Error(words.zeroDiv);
    let num: Sd = Sd.ONE;
    let den: Sd = this;
    for (let guard = 0; guard < 12; guard++) {
      const q = den.rat();
      if (q) return num.scale(fr(1).div(q));
      const r = [...den.t.keys()].find((k) => k > 1)!;
      const p = smallestPrime(r);
      const conj = new Sd(new Map([...den.t].map(([k, v]) => [k, k % p === 0 ? v.neg() : v])));
      num = num.mul(conj);
      den = den.mul(conj);
    }
    throw new Error(words.tooBig);
  }
  div(o: Sd): Sd {
    return this.mul(o.inv());
  }
  /** √x when x is a rational square root's worth: √(p/q) = √(pq)/q. */
  sqrt(): Sd | null {
    const q = this.rat();
    if (!q || q.isNeg()) return null;
    return Sd.of(fr(1, q.d), q.n * q.d);
  }
  key(): string {
    return [...this.t].sort((a, b) => a[0] - b[0]).map(([r, q]) => `${q.n}/${q.d}√${r}`).join("+");
  }
  private parts() {
    const ent = [...this.t].sort((a, b) => (a[0] === 1 ? -1 : b[0] === 1 ? 1 : b[0] - a[0]));
    const L = ent.reduce((acc, [, q]) => lcmN(acc, q.d), 1);
    let ps = ent.map(([r, q]) => ({ r, n: q.mul(fr(L)).n }));
    const allNeg = ps.every((p) => p.n < 0);
    if (allNeg) ps = ps.map((p) => ({ ...p, n: -p.n }));
    // A positive term first: √3 − 1 rather than −1 + √3.
    const i = ps.findIndex((p) => p.n > 0);
    if (i > 0) ps = [ps[i], ...ps.filter((_, k) => k !== i)];
    return { ps, L, allNeg };
  }
  tex(): string {
    if (this.isZero()) return "0";
    const { ps, L, allNeg } = this.parts();
    const top = ps
      .map((p, i) => {
        const a = Math.abs(p.n);
        const body = p.r === 1 ? String(a) : `${a === 1 ? "" : a}\\sqrt{${p.r}}`;
        return i === 0 ? (p.n < 0 ? "-" : "") + body : (p.n < 0 ? " - " : " + ") + body;
      })
      .join("");
    const s = L === 1 ? top : `\\frac{${top}}{${L}}`;
    return allNeg ? `-${s}` : s;
  }
  plain(): string {
    if (this.isZero()) return "0";
    const { ps, L, allNeg } = this.parts();
    const top = ps
      .map((p, i) => {
        const a = Math.abs(p.n);
        const body = p.r === 1 ? String(a) : `${a === 1 ? "" : a}√${p.r}`;
        return i === 0 ? (p.n < 0 ? "−" : "") + body : (p.n < 0 ? " − " : " + ") + body;
      })
      .join("");
    const s = L === 1 ? top : ps.length > 1 ? `(${top})/${L}` : `${top}/${L}`;
    return (allNeg ? "−" : "") + s;
  }
}

// sin of 0°, 15°, …, 90°.
const T15: Sd[] = [
  Sd.ZERO,
  Sd.of(fr(1, 4), 6).sub(Sd.of(fr(1, 4), 2)),
  Sd.of(fr(1, 2)),
  Sd.of(fr(1, 2), 2),
  Sd.of(fr(1, 2), 3),
  Sd.of(fr(1, 4), 6).add(Sd.of(fr(1, 4), 2)),
  Sd.ONE,
];
const isMult = (d: number, k: number) => Math.abs(d / k - Math.round(d / k)) < 1e-9;
function sinD(d: number): Sd | null {
  if (!isMult(d, 15)) return null;
  const D = mod(Math.round(d), 360);
  const t = (x: number) => T15[Math.round(x / 15)];
  if (D <= 90) return t(D);
  if (D <= 180) return t(180 - D);
  if (D <= 270) return t(D - 180).neg();
  return t(360 - D).neg();
}
const cosD = (d: number) => sinD(90 - d);
/** The exact value of f at d degrees: null when d is not a multiple of 15°, false where f has no value. */
function trigD(f: Fn, d: number): Sd | null | false {
  const s = sinD(d);
  const c = cosD(d);
  if (!s || !c) return null;
  switch (f) {
    case "sin":
      return s;
    case "cos":
      return c;
    case "tan":
      return c.isZero() ? false : s.div(c);
    case "sec":
      return c.isZero() ? false : c.inv();
    case "csc":
      return s.isZero() ? false : s.inv();
    case "cot":
      return s.isZero() ? false : c.div(s);
    default:
      return null;
  }
}
function sdE(v: Sd): E {
  const ts = [...v.t].sort((a, b) => a[0] - b[0]).map(([r, q]) => (r === 1 ? N(q) : mul(N(q), pow(N(r), N(fr(1, 2))))));
  return ts.length === 0 ? N(0) : ts.length === 1 ? ts[0] : add(...ts);
}
/** An exact number written with fractions and square roots (3/5, sqrt(3)/2, 1 - sqrt(2)). */
function sdOf(e: E): Sd | null {
  switch (e.k) {
    case "num":
      return Sd.of(e.v);
    case "add": {
      let acc = Sd.ZERO;
      for (const t of e.ts) {
        const v = sdOf(t);
        if (!v) return null;
        acc = acc.add(v);
      }
      return acc;
    }
    case "mul": {
      let acc = Sd.ONE;
      for (const f of e.fs) {
        const v = sdOf(f);
        if (!v) return null;
        acc = acc.mul(v);
      }
      return acc;
    }
    case "pow": {
      if (!isNum(e.e)) return null;
      const p = e.e.v;
      if (isNum(e.b) && p.d === 2) {
        const q = e.b.v;
        if (q.isNeg()) return null;
        const root = Sd.of(fr(1, q.d), q.n * q.d);
        let r = Sd.ONE;
        for (let k = 0; k < Math.abs(p.n); k++) r = r.mul(root);
        return p.isNeg() ? r.inv() : r;
      }
      if (!p.isInt()) return null;
      const b = sdOf(e.b);
      if (!b) return null;
      let r = Sd.ONE;
      for (let k = 0; k < Math.abs(p.n); k++) r = r.mul(b);
      return p.isNeg() ? r.inv() : r;
    }
    default:
      return null;
  }
}

// ---------- polynomials in s = sin u and c = cos u ----------

type Mono = { i: number; j: number; k: Sd };
class P {
  readonly ts: Mono[];
  constructor(ts: Mono[]) {
    const m = new Map<number, Mono>();
    for (const t of ts) {
      const k = t.i * 4096 + t.j;
      const old = m.get(k);
      m.set(k, old ? { i: t.i, j: t.j, k: old.k.add(t.k) } : t);
    }
    this.ts = [...m.values()].filter((t) => !t.k.isZero()).sort((a, b) => b.i + b.j - (a.i + a.j) || b.i - a.i);
  }
  static k(v: Sd | number): P {
    return new P([{ i: 0, j: 0, k: typeof v === "number" ? Sd.of(v) : v }]);
  }
  static mono(i: number, j: number, k: Sd = Sd.ONE): P {
    return new P([{ i, j, k }]);
  }
  add(o: P) {
    return new P([...this.ts, ...o.ts]);
  }
  neg() {
    return new P(this.ts.map((t) => ({ ...t, k: t.k.neg() })));
  }
  sub(o: P) {
    return this.add(o.neg());
  }
  scale(k: Sd) {
    return new P(this.ts.map((t) => ({ ...t, k: t.k.mul(k) })));
  }
  mul(o: P) {
    const m = new Map<number, Mono>();
    for (const a of this.ts)
      for (const b of o.ts) {
        const [i, j] = [a.i + b.i, a.j + b.j];
        const k = i * 4096 + j;
        const old = m.get(k);
        const v = a.k.mul(b.k);
        m.set(k, { i, j, k: old ? old.k.add(v) : v });
      }
    return new P([...m.values()]);
  }
  isZero() {
    return this.ts.length === 0;
  }
  konst(): Sd | null {
    if (!this.ts.length) return Sd.ZERO;
    return this.ts.length === 1 && this.ts[0].i === 0 && this.ts[0].j === 0 ? this.ts[0].k : null;
  }
  eq(o: P) {
    return this.sub(o).isZero();
  }
  get deg() {
    return Math.max(0, ...this.ts.map((t) => t.i + t.j));
  }
  get degS() {
    return Math.max(0, ...this.ts.map((t) => t.i));
  }
  get degC() {
    return Math.max(0, ...this.ts.map((t) => t.j));
  }
  rational() {
    return this.ts.every((t) => t.k.rat() !== null);
  }
  val(s: number, c: number) {
    return this.ts.reduce((acc, t) => acc + t.k.val() * s ** t.i * c ** t.j, 0);
  }
  key() {
    return this.ts.map((t) => `${t.i},${t.j}:${t.k.key()}`).join(" ");
  }
  divMono(i: number, j: number) {
    return new P(this.ts.map((t) => ({ i: t.i - i, j: t.j - j, k: t.k })));
  }
  /** this / f when f divides exactly (division in lex order: the leading terms must match up), else null. */
  divExact(f: P): P | null {
    const lt = (p: P) => p.ts.reduce((b, t) => (t.i > b.i || (t.i === b.i && t.j > b.j) ? t : b));
    const F0 = lt(f);
    let r: P = this;
    const q: Mono[] = [];
    for (let guard = 0; !r.isZero(); guard++) {
      if (guard > 300) return null;
      const T = lt(r);
      if (T.i < F0.i || T.j < F0.j) return null;
      const m: Mono = { i: T.i - F0.i, j: T.j - F0.j, k: T.k.div(F0.k) };
      q.push(m);
      r = r.sub(f.mul(new P([m])));
    }
    return new P(q);
  }
}
const S_ = P.mono(1, 0);
const C_ = P.mono(0, 1);
const isS = (p: P) => p.ts.length === 1 && p.ts[0].i === 1 && p.ts[0].j === 0 && p.ts[0].k.isOne();
const isC = (p: P) => p.ts.length === 1 && p.ts[0].i === 0 && p.ts[0].j === 1 && p.ts[0].k.isOne();
const prod = (fs: P[]) => fs.reduce((a, f) => a.mul(f), P.k(1));

// sin² + cos² = 1, used five ways.
function rewriteLoop(p: P, step: (p: P) => P | null): P {
  let cur = p;
  for (let g = 0; g < 5000; g++) {
    const nx = step(cur);
    if (!nx) return cur;
    cur = nx;
  }
  return cur;
}
const replace = (p: P, out: Mono[], put: Mono[]) => p.sub(new P(out)).add(new P(put));
const VARIANTS = ["orig", "pyth", "toC2", "toS2", "redC", "redS"] as const;
type Variant = (typeof VARIANTS)[number];
function variant(p: P, v: Variant): P {
  switch (v) {
    case "orig":
      return p;
    case "redC": // cos²ⁿ → (1 − sin²)ⁿ
    case "redS": {
      const one = v === "redC" ? P.k(1).sub(P.mono(2, 0)) : P.k(1).sub(P.mono(0, 2));
      const pows = [P.k(1)];
      const out: P[] = [];
      for (const t of p.ts) {
        const e = v === "redC" ? t.j : t.i;
        while (pows.length <= e >> 1) pows.push(pows[pows.length - 1].mul(one));
        const rest = v === "redC" ? P.mono(t.i, t.j & 1, t.k) : P.mono(t.i & 1, t.j, t.k);
        out.push(rest.mul(pows[e >> 1]));
      }
      return new P(out.flatMap((q) => q.ts));
    }
    case "pyth": // k·sin² + k·cos² → k
      return rewriteLoop(p, (q) => {
        for (const t of q.ts) {
          const u = t.i >= 2 && q.ts.find((u) => u.i === t.i - 2 && u.j === t.j + 2 && u.k.eq(t.k));
          if (u) return replace(q, [t, u], [{ i: t.i - 2, j: t.j, k: t.k }]);
        }
        return null;
      });
    case "toC2": // k − k·sin² → k·cos²
      return rewriteLoop(p, (q) => {
        for (const t of q.ts) {
          const u = q.ts.find((u) => u.i === t.i + 2 && u.j === t.j && u.k.eq(t.k.neg()));
          if (u) return replace(q, [t, u], [{ i: t.i, j: t.j + 2, k: t.k }]);
        }
        return null;
      });
    case "toS2": // k − k·cos² → k·sin²
      return rewriteLoop(p, (q) => {
        for (const t of q.ts) {
          const u = q.ts.find((u) => u.i === t.i && u.j === t.j + 2 && u.k.eq(t.k.neg()));
          if (u) return replace(q, [t, u], [{ i: t.i + 2, j: t.j, k: t.k }]);
        }
        return null;
      });
  }
}

/** p = k·(factors): powers of sin and cos apart, the rest with whole coprime coefficients and a positive constant
 *  term (1 − sin x) or else a positive first term. */
function normFactor(p: P): { k: Sd; fs: P[] } {
  const c = p.konst();
  if (c) return { k: c, fs: [] };
  const mi = Math.min(...p.ts.map((t) => t.i));
  const mj = Math.min(...p.ts.map((t) => t.j));
  const fs: P[] = [...Array<P>(mi).fill(S_), ...Array<P>(mj).fill(C_)];
  let q = p.divMono(mi, mj);
  const qc = q.konst();
  if (qc) return { k: qc, fs };
  let k = Sd.ONE;
  if (q.rational()) {
    const rs = q.ts.map((t) => t.k.rat()!);
    const L = rs.reduce((acc, r) => lcmN(acc, r.d), 1);
    const G = rs.reduce((acc, r) => gcd(acc, Math.abs(r.mul(fr(L)).n)), 0);
    k = Sd.of(fr(G, L));
  }
  const lead = q.ts.find((t) => t.i === 0 && t.j === 0) ?? q.ts[q.ts.length - 1];
  if (lead.k.val() < 0) k = k.neg();
  q = q.scale(k.inv());
  return { k, fs: [...fs, q] };
}
/** Linear factors of a polynomial in sin alone, cos alone, or a homogeneous one (through tan = sin/cos). */
function splitFactor(q: P): P[] {
  if (!q.rational() || q.deg < 2) return [q];
  const uni = q.degC === 0 ? "s" : q.degS === 0 ? "c" : null;
  const homo = q.ts.every((t) => t.i + t.j === q.deg);
  if (!uni && !homo) return [q];
  const deg = uni === "s" ? q.degS : uni === "c" ? q.degC : q.deg;
  const co: Frac[] = Array.from({ length: deg + 1 }, () => fr(0));
  for (const t of q.ts) co[uni === "c" ? t.j : t.i] = t.k.rat()!;
  const roots = realRoots(co).exact.filter((r) => r.b.isZero()).map((r) => r.a);
  const lin = (r: Frac): P =>
    uni === "s" ? S_.sub(P.k(Sd.of(r))) : uni === "c" ? C_.sub(P.k(Sd.of(r))) : S_.sub(C_.scale(Sd.of(r)));
  const out: P[] = [];
  let rest = q;
  for (const r of roots)
    for (let g = 0; g < deg; g++) {
      const d = rest.divExact(lin(r));
      if (!d) break;
      out.push(lin(r));
      rest = d;
    }
  out.push(rest);
  return out;
}
function factorPoly(p: P): { k: Sd; fs: P[] } {
  const base = normFactor(p);
  let k = base.k;
  const fs: P[] = [];
  for (const f of base.fs) {
    if (isS(f) || isC(f)) {
      fs.push(f);
      continue;
    }
    for (const g of splitFactor(f)) {
      const nf = normFactor(g);
      k = k.mul(nf.k);
      fs.push(...nf.fs);
    }
  }
  return { k, fs };
}

/** n / (product of normalised factors). */
type Rat = { n: P; d: P[] };
const ratP = (n: P): Rat => ({ n, d: [] });
function msMinus(L: P[], A: P[]): P[] {
  const rest = [...L];
  for (const a of A) {
    const q = rest.findIndex((f) => f.eq(a));
    if (q >= 0) rest.splice(q, 1);
  }
  return rest;
}
function msLcm(A: P[], B: P[]): P[] {
  const L = [...A];
  const pool = [...A];
  for (const b of B) {
    const q = pool.findIndex((f) => f.eq(b));
    if (q >= 0) pool.splice(q, 1);
    else L.push(b);
  }
  return L;
}
function ratAdd(a: Rat, b: Rat): Rat {
  const L = msLcm(a.d, b.d);
  return { n: a.n.mul(prod(msMinus(L, a.d))).add(b.n.mul(prod(msMinus(L, b.d)))), d: L };
}
const ratMul = (a: Rat, b: Rat): Rat => ({ n: a.n.mul(b.n), d: [...a.d, ...b.d] });
function ratInv(a: Rat): Rat {
  if (a.n.isZero()) throw new Error(words.zeroDiv);
  const { k, fs } = normFactor(a.n);
  return { n: prod(a.d).scale(k.inv()), d: fs };
}
function ratPow(a: Rat, n: number): Rat {
  if (n < 0) return ratPow(ratInv(a), -n);
  let r: Rat = ratP(P.k(1));
  for (let q = 0; q < n; q++) r = ratMul(r, a);
  return r;
}
/** a ÷ b, first cancelling the denominators they share: multiplying top and bottom by them. */
function ratDiv(a: Rat, b: Rat): Rat {
  const common: P[] = [];
  const bd = [...b.d];
  for (const f of a.d) {
    const q = bd.findIndex((g) => g.eq(f));
    if (q >= 0) common.push(...bd.splice(q, 1));
  }
  return ratMul({ n: a.n, d: msMinus(a.d, common) }, ratInv({ n: b.n, d: bd }));
}
const sameRat = (a: Rat, b: Rat) => a.n.mul(prod(b.d)).eq(b.n.mul(prod(a.d)));
/** Equal once sin² + cos² = 1 is used: the cross product is 0 after every cos² becomes 1 − sin². */
const equalRat = (a: Rat, b: Rat) => variant(a.n.mul(prod(b.d)).sub(b.n.mul(prod(a.d))), "redC").isZero();

function cancel(n: P, d: P): { pre: Rat; gone: P[]; post: Rat } {
  const { k, fs } = factorPoly(d);
  const n0 = n.scale(k.inv());
  let num = n0;
  const gone: P[] = [];
  const rest: P[] = [];
  for (const f of fs) {
    const q = num.isZero() ? null : num.divExact(f);
    if (q) {
      num = q;
      gone.push(f);
    } else rest.push(f);
  }
  return { pre: { n: n0, d: fs }, gone, post: { n: num, d: rest } };
}

// ---------- writing them down ----------

/** How sin u and cos u are written (tan u for a polynomial in tan). */
type Nm = { s: string; c: string; arg: string; ps: string; pc: string; parg: string };
const SUP: Record<string, string> = { 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶" };
function monoTex(i: number, j: number, nm: Nm): string {
  const one = (f: string, k: number) => (k === 0 ? "" : k === 1 ? `${f} ${nm.arg}` : `${f}^{${k}} ${nm.arg}`);
  return [one(nm.s, i), one(nm.c, j)].filter(Boolean).join(" ");
}
function monoPlain(i: number, j: number, nm: Nm): string {
  const one = (f: string, k: number) => (k === 0 ? "" : `${f}${k === 1 ? " " : SUP[k] ?? `^${k}`}${nm.parg}`);
  return [one(nm.ps, i), one(nm.pc, j)].filter(Boolean).join(" ");
}
/** Highest powers first, but a positive term leads (3 sin x − 4 sin³x); with constFirst a positive constant leads
 *  (1 + sin x, as in a fraction). */
function polyTex(p: P, nm: Nm, plain = false, constFirst = false): string {
  if (p.isZero()) return "0";
  let ts = [...p.ts];
  const c0 = ts.findIndex((t) => t.i === 0 && t.j === 0 && t.k.val() > 0);
  const lead = constFirst && c0 > 0 && ts.length <= 3 ? c0 : ts[0].k.val() < 0 ? ts.findIndex((t) => t.k.val() > 0) : 0;
  if (lead > 0) ts = [ts[lead], ...ts.filter((_, q) => q !== lead)];
  return ts
    .map((t, q) => {
      const vars = plain ? monoPlain(t.i, t.j, nm) : monoTex(t.i, t.j, nm);
      const single = t.k.t.size === 1;
      const ng = single && t.k.val() < 0;
      const a = ng ? t.k.neg() : t.k;
      const at = plain ? a.plain() : a.tex();
      const coef = !vars ? at : a.isOne() ? "" : single ? at : plain ? `(${at})` : `\\left(${at}\\right)`;
      const body = `${coef}${coef && vars ? (plain ? "" : " ") : ""}${vars}`;
      if (q === 0) return (ng ? (plain ? "−" : "-") : "") + body;
      return (ng ? (plain ? " − " : " - ") : " + ") + body;
    })
    .join("");
}
function factorsTex(fs: P[], nm: Nm, alone = false, plain = false): string {
  let i = 0;
  let j = 0;
  const others: { p: P; n: number }[] = [];
  for (const f of fs) {
    if (isS(f)) i++;
    else if (isC(f)) j++;
    else {
      const o = others.find((o) => o.p.eq(f));
      if (o) o.n++;
      else others.push({ p: f, n: 1 });
    }
  }
  const parts: string[] = [];
  const m = plain ? monoPlain(i, j, nm) : monoTex(i, j, nm);
  if (m) parts.push(m);
  for (const o of others) {
    const body = polyTex(o.p, nm, plain, true);
    if (alone && fs.length === 1) parts.push(body);
    else if (plain) parts.push(`(${body})${o.n > 1 ? SUP[o.n] ?? `^${o.n}` : ""}`);
    else parts.push(`\\left(${body}\\right)${o.n > 1 ? `^{${o.n}}` : ""}`);
  }
  return parts.join(plain ? "" : " ") || "1";
}
function ratTex(r: Rat, nm: Nm): string {
  if (!r.d.length) return polyTex(r.n, nm);
  const den = factorsTex(r.d, nm, true);
  const n = r.n;
  if (n.ts.length === 1 && n.ts[0].k.t.size === 1 && n.ts[0].k.val() < 0) return `-\\frac{${polyTex(n.neg(), nm)}}{${den}}`;
  return `\\frac{${polyTex(n, nm, false, true)}}{${den}}`;
}
/** The fraction with the factors about to cancel shown on top and below. */
function factoredTex(c: { pre: Rat; gone: P[]; post: Rat }, nm: Nm): string {
  const q = c.post.n;
  const k = q.konst();
  const g = factorsTex(c.gone, nm);
  const top = k && k.isOne() ? g : q.ts.length === 1 ? `${polyTex(q, nm)} ${g}` : `${g} \\left(${polyTex(q, nm)}\\right)`;
  return `\\frac{${top}}{${factorsTex(c.pre.d, nm)}}`;
}

// ---------- angles ----------

type Unit = "deg" | "rad";
/** The angle n·(x/m) + a°. */
type Arg = { n: number; a: number; af: Frac | null };
type Ctx = { unit: Unit; m: number; letter: string; plainLetter: string; args: Map<string, Arg>; used: Set<Formula> };
const TRIG: Fn[] = ["sin", "cos", "tan", "sec", "csc", "cot"];

function piTex(q: Frac, plain: boolean): string {
  const a = q.abs();
  const sg = q.isNeg() ? (plain ? "−" : "-") : "";
  if (a.isZero()) return "0";
  if (a.isInt()) return sg + (a.n === 1 ? (plain ? "π" : "\\pi") : `${a.n}${plain ? "π" : "\\pi"}`);
  const top = `${a.n === 1 ? "" : a.n}${plain ? "π" : "\\pi"}`;
  return sg + (plain ? `${top}/${a.d}` : `\\frac{${top}}{${a.d}}`);
}
/** An angle given in degrees, written in the unit of the question. */
function angleTex(deg: number, unit: Unit, plain = false): string {
  if (unit === "deg") return plain ? `${nt(deg, 2)}°` : `${tn(deg, 2)}^\\circ`;
  const q = ratOf(deg / 180, 72);
  if (q) return piTex(q, plain);
  const v = (deg * Math.PI) / 180;
  return plain ? nt(v, 3) : tn(v, 3);
}
function coefLetter(k: Frac, L: string, plain: boolean): string {
  if (k.isZero()) return "";
  const a = k.abs();
  const s = a.isInt() ? (a.n === 1 ? L : `${a.n}${L}`) : plain ? `${a.n === 1 ? "" : a.n}${L}/${a.d}` : `\\frac{${a.n === 1 ? "" : a.n}${L}}{${a.d}}`;
  return (k.isNeg() ? (plain ? "−" : "-") : "") + s;
}
function argStr(ctx: Ctx, n: number, a: number, plain: boolean): string {
  const lin = coefLetter(fr(n, ctx.m), plain ? ctx.plainLetter : ctx.letter, plain);
  const ang = a === 0 ? "" : angleTex(Math.abs(a), ctx.unit, plain);
  const s = !ang ? lin || "0" : !lin ? (a < 0 ? (plain ? "−" : "-") : "") + ang : `${lin} ${a < 0 ? (plain ? "−" : "-") : "+"} ${ang}`;
  const wrap = / /.test(s) || /^[-−]/.test(s);
  return wrap ? (plain ? `(${s})` : `\\left(${s}\\right)`) : s;
}
/** sin, cos, … of n·(x/m) + a°, its argument registered by its LaTeX. */
function at(ctx: Ctx, f: Fn, n: number, a = 0): E {
  const name = argStr(ctx, n, a, false);
  if (!ctx.args.has(name)) ctx.args.set(name, { n, a, af: ratOf(a, 8) });
  return fn(f, V(name));
}
const baseNm = (ctx: Ctx): Nm => ({ s: "\\sin", c: "\\cos", arg: argStr(ctx, 1, 0, false), ps: "sin", pc: "cos", parg: argStr(ctx, 1, 0, true) });
const tanNm = (ctx: Ctx): Nm => ({ ...baseNm(ctx), s: "\\tan", ps: "tan" });
const rad = (d: number) => (d * Math.PI) / 180;
/** Value at x (in degrees). */
function evalAt(e: E, ctx: Ctx, xDeg: number): number {
  const env: Record<string, number> = {};
  for (const [name, a] of ctx.args) env[name] = rad((a.n / ctx.m) * xDeg + a.a);
  // An angle written plain "x" is read by evalE as the variable itself.
  return evalE(e, env.x ?? 0, env);
}
const texE = (e: E) => tex(e);

function hasPi(e: E): boolean {
  switch (e.k) {
    case "pi":
      return true;
    case "add":
      return e.ts.some(hasPi);
    case "mul":
      return e.fs.some(hasPi);
    case "pow":
      return hasPi(e.b) || hasPi(e.e);
    case "fn":
    case "log":
    case "d":
      return hasPi(e.a);
    default:
      return false;
  }
}
/** Pupils' spellings: θ, cosec, degrees. */
function prep(src: string): { s: string; unit: Unit; theta: boolean } {
  const theta = /θ|theta/.test(src);
  const unit: Unit = /°/.test(src) ? "deg" : /π|pi/.test(src) ? "rad" : "deg";
  const s = src.replace(/theta|θ/g, "x").replace(/cosec/g, "csc").replace(/°/g, "");
  return { s, unit, theta };
}
function newCtx(unit: Unit, theta: boolean): Ctx {
  return { unit, m: 1, letter: theta ? "\\theta" : "x", plainLetter: theta ? "θ" : "x", args: new Map(), used: new Set() };
}
function readE(src: string): E {
  return parseE(src);
}
/** The angle inside a trig function: k·x + a, with a in degrees. */
function analyze(arg: E, unit: Unit): { k: Frac; a: number } {
  const [v0, v1, v2] = [evalE(arg, 0), evalE(arg, 1), evalE(arg, 2)];
  if (![v0, v1, v2].every(Number.isFinite) || Math.abs(v2 - 2 * v1 + v0) > 1e-9) throw new Error(words.linearArg);
  const k = ratOf(v1 - v0, 24);
  if (!k) throw new Error(words.linearArg);
  let a = hasPi(arg) || unit === "rad" ? (v0 * 180) / Math.PI : v0;
  const af = ratOf(a, 8);
  if (af) a = af.toNumber();
  return { k, a };
}
function collectK(e: E, unit: Unit, out: Frac[]): void {
  switch (e.k) {
    case "fn":
      if (TRIG.includes(e.f)) out.push(analyze(e.a, unit).k);
      else collectK(e.a, unit, out);
      return;
    case "add":
      return e.ts.forEach((t) => collectK(t, unit, out));
    case "mul":
      return e.fs.forEach((f) => collectK(f, unit, out));
    case "pow":
      collectK(e.b, unit, out);
      collectK(e.e, unit, out);
      return;
    case "log":
    case "d":
      return collectK(e.a, unit, out);
    default:
      return;
  }
}
function atomize(e: E, ctx: Ctx): E {
  switch (e.k) {
    case "fn": {
      if (!TRIG.includes(e.f)) throw new Error(words.onlyTrig);
      const { k, a } = analyze(e.a, ctx.unit);
      const n = k.mul(fr(ctx.m));
      if (n.isZero()) {
        const v = trigD(e.f, a);
        if (v === false) throw new Error(fill(words.noValue, { f: e.f === "csc" ? "cosec" : e.f, a: angleTex(a, ctx.unit, true) }));
      }
      return at(ctx, e.f, n.n, a);
    }
    case "var":
    case "log":
    case "d":
    case "e":
      throw new Error(words.onlyTrig);
    case "add":
      return add(...e.ts.map((t) => atomize(t, ctx)));
    case "mul":
      return mul(...e.fs.map((f) => atomize(f, ctx)));
    case "pow": {
      const p = atomize(e.e, ctx);
      if (!isNum(tidy(p)) && tidy(p).k !== "mul") throw new Error(words.onlyTrig);
      return pow(atomize(e.b, ctx), p);
    }
    default:
      return e;
  }
}
/** Read the sides, choose x/m as the base angle (so every angle is a whole multiple of it), and name the angles. */
function setup(srcs: string[], forceUnit?: Unit): { ctx: Ctx; es: E[] } {
  const ps = srcs.map(prep);
  const theta = ps.some((p) => p.theta);
  const unit = forceUnit ?? (ps.some((p) => p.unit === "rad") && !srcs.some((s) => /°/.test(s)) ? "rad" : "deg");
  const raw = ps.map((p) => readE(p.s));
  const ks: Frac[] = [];
  raw.forEach((e) => collectK(e, unit, ks));
  const ctx = newCtx(unit, theta);
  ctx.m = ks.reduce((acc, k) => lcmN(acc, k.d), 1);
  return { ctx, es: raw.map((e) => tidy(atomize(e, ctx))) };
}

// ---------- rewriting in sin and cos of the base angle ----------

/** sin x · cos x · cos x → sin x cos²x. */
function merge(e: E): E {
  switch (e.k) {
    case "add":
      return add(...e.ts.map(merge));
    case "mul": {
      const rest: E[] = [];
      const out: { b: E; p: number; k: string }[] = [];
      for (const f of e.fs.map(merge)) {
        const [b, p] = f.k === "pow" && f.b.k === "fn" && isNum(f.e) && f.e.v.isInt() && f.e.v.n > 0 ? [f.b, f.e.v.n] : f.k === "fn" ? [f, 1] : [null, 0];
        if (!b) {
          rest.push(f);
          continue;
        }
        const k = key(b);
        const o = out.find((o) => o.k === k);
        if (o) o.p += p;
        else out.push({ b, p, k });
      }
      return mul(...rest, ...out.map((o) => (o.p === 1 ? o.b : pow(o.b, o.p))));
    }
    case "pow":
      return pow(merge(e.b), e.e);
    default:
      return e;
  }
}
/** A key that ignores the order of terms and factors. */
function ckey(e: E): string {
  switch (e.k) {
    case "add":
      return `(+ ${e.ts.map(ckey).sort().join(" ")})`;
    case "mul":
      return `(* ${e.fs.map(ckey).sort().join(" ")})`;
    case "pow":
      return `(^ ${ckey(e.b)} ${ckey(e.e)})`;
    case "fn":
      return `(${e.f} ${ckey(e.a)})`;
    default:
      return key(e);
  }
}
function mapAtoms(e: E, ctx: Ctx, g: (f: Fn, arg: Arg) => E | null): E {
  const go = (u: E): E => {
    switch (u.k) {
      case "fn":
        if (u.a.k === "var") {
          const arg = ctx.args.get(u.a.name);
          if (arg) return g(u.f, arg) ?? u;
        }
        return u;
      case "add":
        return add(...u.ts.map(go));
      case "mul":
        return mul(...u.fs.map(go));
      case "pow":
        return pow(go(u.b), u.e);
      default:
        return u;
    }
  };
  return tidy(merge(tidy(go(e))));
}
function atomsOf(e: E, ctx: Ctx): { f: Fn; arg: Arg }[] {
  const out: { f: Fn; arg: Arg }[] = [];
  mapAtoms(e, ctx, (f, arg) => (out.push({ f, arg }), null));
  return out;
}
type Pass = { e: E; op: string };
function passCompound(e: E, ctx: Ctx): Pass {
  let used = false;
  let exact = false;
  const r = mapAtoms(e, ctx, (f, arg) => {
    if (arg.a === 0) return null;
    if (arg.n === 0) {
      const v = trigD(f, arg.a);
      if (v === null) throw new Error(words.angle15);
      if (v === false) throw new Error(fill(words.noValue, { f, a: angleTex(arg.a, ctx.unit, true) }));
      exact = true;
      return sdE(v);
    }
    const sa = sinD(arg.a);
    const ca = cosD(arg.a);
    if (!sa || !ca) throw new Error(words.angle15);
    used = true;
    const A = (g: Fn) => at(ctx, g, arg.n);
    const sinX = add(mul(A("sin"), sdE(ca)), mul(A("cos"), sdE(sa)));
    const cosX = sub(mul(A("cos"), sdE(ca)), mul(A("sin"), sdE(sa)));
    switch (f) {
      case "sin":
      case "csc":
        ctx.used.add("sinSum");
        return f === "sin" ? sinX : pow(sinX, -1);
      case "cos":
      case "sec":
        ctx.used.add("cosSum");
        return f === "cos" ? cosX : pow(cosX, -1);
      case "tan": {
        ctx.used.add("tanSum");
        const t = trigD("tan", arg.a);
        if (t === false) return neg(div(N(1), A("tan")));
        const top = t!.val() > 0 ? add(sdE(t!), A("tan")) : add(A("tan"), sdE(t!));
        return div(top, sub(N(1), mul(sdE(t!), A("tan"))));
      }
      default:
        ctx.used.add("sinSum").add("cosSum");
        return div(cosX, sinX);
    }
  });
  return { e: r, op: used ? words.steps.compound : exact ? words.steps.exact : "" };
}
function passNegative(e: E, ctx: Ctx): Pass {
  let used = false;
  const r = mapAtoms(e, ctx, (f, arg) => {
    if (arg.n >= 0) return null;
    used = true;
    const A = at(ctx, f, -arg.n);
    return f === "cos" || f === "sec" ? A : neg(A);
  });
  return { e: r, op: used ? words.steps.negative : "" };
}
function passMultiple(e: E, ctx: Ctx, choice: number): Pass {
  let dbl = false;
  const split = new Set<number>();
  const r = mapAtoms(e, ctx, (f, arg) => {
    if (arg.n < 2 || arg.a !== 0) return null;
    const n = arg.n;
    const Sn = (k: number) => at(ctx, "sin", k);
    const Cn = (k: number) => at(ctx, "cos", k);
    const Tn = (k: number) => at(ctx, "tan", k);
    let sinX: E, cosX: E, tanX: E;
    if (n % 2 === 0) {
      dbl = true;
      const h = n / 2;
      sinX = mul(N(2), Sn(h), Cn(h));
      cosX = choice === 0 ? sub(pow(Cn(h), 2), pow(Sn(h), 2)) : choice === 1 ? sub(N(1), mul(N(2), pow(Sn(h), 2))) : sub(mul(N(2), pow(Cn(h), 2)), N(1));
      tanX = div(mul(N(2), Tn(h)), sub(N(1), pow(Tn(h), 2)));
      ctx.used.add(f === "tan" ? "tan2" : f === "sin" || f === "csc" ? "sin2" : f === "cot" ? (ctx.used.add("sin2"), "cos2") : "cos2");
    } else {
      split.add(n);
      sinX = add(mul(Sn(n - 1), Cn(1)), mul(Cn(n - 1), Sn(1)));
      cosX = sub(mul(Cn(n - 1), Cn(1)), mul(Sn(n - 1), Sn(1)));
      tanX = div(add(Tn(n - 1), Tn(1)), sub(N(1), mul(Tn(n - 1), Tn(1))));
      ctx.used.add(f === "tan" ? "tanSum" : f === "sin" || f === "csc" ? "sinSum" : "cosSum");
    }
    switch (f) {
      case "sin":
        return sinX;
      case "cos":
        return cosX;
      case "tan":
        return tanX;
      case "sec":
        return pow(cosX, -1);
      case "csc":
        return pow(sinX, -1);
      default:
        return div(cosX, sinX);
    }
  });
  const ops = [dbl ? words.steps.double : "", ...[...split].map((n) => fill(words.steps.split, { a: argStr(ctx, n, 0, true), b: argStr(ctx, n - 1, 0, true), c: argStr(ctx, 1, 0, true) }))];
  return { e: r, op: ops.filter(Boolean).join("; ") };
}
function passRecip(e: E, ctx: Ctx): Pass {
  const seen = new Set<string>();
  const r = mapAtoms(e, ctx, (f, arg) => {
    if (arg.n !== 1 || arg.a !== 0 || f === "sin" || f === "cos") return null;
    seen.add(f);
    ctx.used.add("recip");
    const s = at(ctx, "sin", 1);
    const c = at(ctx, "cos", 1);
    return f === "tan" ? div(s, c) : f === "sec" ? pow(c, -1) : f === "csc" ? pow(s, -1) : div(c, s);
  });
  const u = argStr(ctx, 1, 0, true);
  const names: Record<string, string> = { tan: `tan ${u} = sin ${u}/cos ${u}`, sec: `sec ${u} = 1/cos ${u}`, csc: `cosec ${u} = 1/sin ${u}`, cot: `cot ${u} = cos ${u}/sin ${u}` };
  return { e: r, op: [...seen].map((f) => names[f]).join(", ") ? fill(words.steps.recip, { list: [...seen].map((f) => names[f]).join(", ") }) : "" };
}
/** Every pass in order, on several expressions at once (the two sides of an equation move together). */
type RStep = { es: E[]; op: string; fs: Formula[] };
function rewriteAll(es: E[], ctx: Ctx, choice: number, keepTan = false): { es: E[]; steps: RStep[] } {
  const steps: RStep[] = [];
  let cur = es;
  const outer = ctx.used;
  const run = (pass: (e: E) => Pass) => {
    ctx.used = new Set();
    const rs = cur.map(pass);
    const op = [...new Set(rs.map((r) => r.op).filter(Boolean))].join("; ");
    const changed = rs.some((r, i) => key(r.e) !== key(cur[i]));
    cur = rs.map((r) => r.e);
    if (changed) steps.push({ es: cur, op, fs: [...ctx.used] });
    for (const f of ctx.used) outer.add(f);
    ctx.used = outer;
    return changed;
  };
  run((e) => passCompound(e, ctx));
  run((e) => passNegative(e, ctx));
  for (let g = 0; g < 6 && run((e) => passMultiple(e, ctx, choice)); g++);
  const onlyTan = cur.every((e) => atomsOf(e, ctx).every((a) => a.f === "tan"));
  if (!(keepTan && onlyTan)) run((e) => passRecip(e, ctx));
  return { es: cur, steps };
}
function toRat(e: E, ctx: Ctx): Rat {
  switch (e.k) {
    case "num":
      return ratP(P.k(Sd.of(e.v)));
    case "add":
      return e.ts.map((t) => toRat(t, ctx)).reduce(ratAdd);
    case "mul": {
      const below = (f: E) => f.k === "pow" && isNum(f.e) && f.e.v.isInt() && f.e.v.isNeg() && !sdOf(f);
      const top = e.fs.filter((f) => !below(f)).map((f) => toRat(f, ctx)).reduce(ratMul, ratP(P.k(1)));
      const bot = e.fs.filter(below).map((f) => toRat(pow((f as { b: E }).b, N((f as { e: { v: Frac } }).e.v.neg())), ctx));
      return bot.length ? ratDiv(top, bot.reduce(ratMul)) : top;
    }
    case "pow": {
      const v = sdOf(e);
      if (v) return ratP(P.k(v));
      if (!isNum(e.e) || !e.e.v.isInt()) throw new Error(words.onlyTrig);
      return ratPow(toRat(e.b, ctx), e.e.v.n);
    }
    case "fn": {
      const arg = e.a.k === "var" ? ctx.args.get(e.a.name) : undefined;
      if (!arg || arg.n !== 1 || arg.a !== 0 || (e.f !== "sin" && e.f !== "cos")) throw new Error(words.onlyTrig);
      return ratP(e.f === "sin" ? S_ : C_);
    }
    default:
      throw new Error(words.onlyTrig);
  }
}

// ---------- proofs ----------

type Step = { tex: string; op: string; ck: string; val?: (xDeg: number) => number; fs?: Formula[] };
const ratVal = (r: Rat, s: number, c: number) => r.n.val(s, c) / r.d.reduce((acc, f) => acc * f.val(s, c), 1);
const PROBES = [17, 41, 73, 128, 199, 311, -67];
/** Does every line have the value of the first one (wherever both have a value)? */
function verified(e0: E, ctx: Ctx, steps: Step[]): boolean {
  for (const x of PROBES) {
    const v0 = evalAt(e0, ctx, x);
    if (!Number.isFinite(v0) || Math.abs(v0) > 1e6) continue;
    for (const st of steps) {
      const v = st.val!(x);
      if (Number.isFinite(v) && Math.abs(v) < 1e9 && Math.abs(v - v0) > 1e-7 * (1 + Math.abs(v0))) return false;
    }
  }
  return true;
}
const ratKey = (r: Rat) => `P:${r.n.key()}/${r.d.map((f) => f.key()).sort().join(";")}`;
/** The canonical key of an expression: a polynomial in sin and cos by its terms, anything else by its tree. */
function stepCk(e: E, ctx: Ctx): string {
  const plainPoly = (u: E): boolean =>
    u.k === "add" ? u.ts.every(plainPoly) : u.k === "mul" ? u.fs.every(plainPoly) : u.k === "pow" ? isNum(u.e) && u.e.v.isInt() && !u.e.v.isNeg() && plainPoly(u.b) : true;
  if (plainPoly(e) && atomsOf(e, ctx).every((a) => a.arg.n === 1 && a.arg.a === 0 && (a.f === "sin" || a.f === "cos"))) {
    try {
      return ratKey(toRat(e, ctx));
    } catch {
      return ckey(e);
    }
  }
  return ckey(e);
}
type Chain = { steps: Step[]; fin: Rat };
function pythLabel(vn: Variant, vd: Variant, nm: Nm): string {
  const one = (v: Variant) => (v === "orig" ? "" : fill(words.steps.pyth[v], { a: nm.parg }));
  return [...new Set([one(vn), one(vd)].filter(Boolean))].join(", ");
}
function dedupe(steps: Step[], first: string): Step[] {
  const out: Step[] = [];
  let last = first;
  for (const s of steps) if (s.tex !== last) (out.push(s), (last = s.tex));
  return out;
}
/** Every way to rewrite one side: the three forms of cos 2A, then sin² + cos² = 1 used in five ways above and below. */
function sideChains(e0: E, ctx: Ctx): Chain[] {
  const t1 = Date.now();
  const nm = baseNm(ctx);
  const out: Chain[] = [];
  const seen = new Set<string>();
  const t0 = texE(e0);
  for (const choice of [0, 1, 2]) {
    const { es, steps } = rewriteAll([e0], ctx, choice);
    const k = steps.map((s) => texE(s.es[0])).join("|");
    if (seen.has(k)) continue;
    seen.add(k);
    const r = toRat(es[0], ctx);
    const sc = (x: number) => [Math.sin(rad(x / ctx.m)), Math.cos(rad(x / ctx.m))] as const;
    const R = (x: Rat, op: string): Step => ({ tex: ratTex(x, nm), op, ck: ratKey(x), val: (d) => ratVal(x, ...sc(d)) });
    const base: Step[] = [
      ...steps.map((s) => ({ tex: texE(s.es[0]), op: s.op, ck: stepCk(s.es[0], ctx), val: (d: number) => evalAt(s.es[0], ctx, d), fs: s.fs })),
      R(r, r.d.length ? words.steps.combine : words.steps.expand),
    ];
    const Nn = r.n;
    const Dd = prod(r.d);
    const big = Nn.ts.length + Dd.ts.length > 30;
    for (const vn of VARIANTS)
      for (const vd of VARIANTS) {
        // A large expression gets the plain route and one use of sin² + cos² = 1; there is a time limit too.
        if ((big && (vn !== "orig" && vn !== "redC" || vd !== "orig")) || (out.length && Date.now() - t1 > 500)) continue;
        const n2 = variant(Nn, vn);
        const d2 = variant(Dd, vd);
        if ((vn !== "orig" && n2.eq(Nn)) || (vd !== "orig" && d2.eq(Dd))) continue;
        const st = [...base];
        if (vd !== "orig" && r.d.length > 1) st.push(R({ n: Nn, d: [Dd] }, words.steps.expand));
        const c = cancel(n2, d2);
        if (vn !== "orig" || vd !== "orig") st.push({ ...R(c.pre, pythLabel(vn, vd, nm)), fs: ["pyth"] });
        if (c.gone.length) {
          // Only a common factor that is a bracket (or a top that needs factorising) is worth a line of its own.
          if (c.gone.some((f) => !isS(f) && !isC(f)) || c.pre.n.ts.length > 1)
            st.push({ tex: factoredTex(c, nm), op: words.steps.factorise, ck: `F:${ratKey(c.pre)}`, val: (d) => ratVal(c.pre, ...sc(d)) });
          st.push(R(c.post, fill(words.steps.cancel, { f: factorsTex(c.gone, nm, false, true) })));
        } else st.push(R(c.post, words.steps.simplify));
        if (verified(e0, ctx, st)) out.push({ steps: dedupe(st, t0), fin: c.post });
      }
  }
  return out;
}
const texLen = (s: string) => s.replace(/\\[a-z]+|[{}\s]/g, (m) => (m.startsWith("\\") ? "f" : "")).length;

function formulaCaption(ctx: Ctx | Formula[]): Caption[] {
  const ks = Array.isArray(ctx) ? [...new Set(ctx)] : [...ctx.used];
  if (!ks.length) return [];
  return [{ text: fill(words.formulasUsed, { list: ks.map((k) => words.formulas[k]).join(";  ") }), color: C.grey }];
}

/** Ticks along x for a range in degrees, in the unit of the question. */
function angleTicks(lo: number, hi: number, unit: Unit) {
  const span = hi - lo;
  const step = span > 1000 ? 180 : span > 400 ? 90 : span > 200 ? 45 : span > 90 ? 30 : 15;
  const out: { v: number; label: string }[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) if (Math.abs(v) > 1e-9) out.push({ v, label: angleTex(v, unit, true) });
  return out;
}
type Plot = { f: (xDeg: number) => number; color: string; width?: number; extra?: string; name?: string };
function graph(id: string, plots: Plot[], lo: number, hi: number, unit: Unit, h = 220, marks: { x: number; y: number; color: string }[] = [], extra = ""): { svg: string; h: number } {
  const ys = plots.flatMap((p) => sampleY(p.f, lo, hi, 500));
  let [y0, y1] = yRange(ys.map((y) => (Math.abs(y) > 6 ? NaN : y)), [0, ...marks.map((m) => m.y)]);
  if (y1 - y0 < 2) [y0, y1] = [Math.min(y0, -1.2), Math.max(y1, 1.2)];
  const fr_ = makeFrame(id, 48, 8, W - 48 - 20, h - 30, [lo, hi], [y0, y1]);
  let svg = axes(fr_, { xTicks: angleTicks(lo, hi, unit) });
  svg += extra.replace(/FRAME_X\(([-\d.e]+)\)/g, (_, v) => String(r2(fr_.sx(Number(v))))).replace(/FRAME_Y\(([-\d.e]+)\)/g, (_, v) => String(r2(fr_.sy(Number(v)))));
  for (const p of plots) svg += curve(fr_, p.f, p.color, p.width ?? 2.4, p.extra ?? "");
  for (const m of marks) svg += dot(fr_.sx(m.x), fr_.sy(m.y), m.color, 4.5);
  const named = plots.filter((p) => p.name);
  if (named.length) svg += legend(fr_, named.map((p) => ({ text: p.name!, color: p.color, dash: /dasharray/.test(p.extra ?? "") })));
  return { svg, h };
}
/** What a tab works out: the lines, pictures and captions, and the answers themselves (for checking). */
export type IdData = { identity?: boolean; solutions?: number[]; rejected?: number[]; value?: number; values?: number[]; R?: number; alpha?: number; form?: string };
export type Built = { header: string; rows: TexLine[]; pics: { svg: string; h: number }[]; caps: Caption[]; data: IdData };
const built = (header: string, rows: TexLine[], pics: { svg: string; h: number }[], caps: Caption[], data: IdData = {}): Built => ({ header, rows, pics, caps, data });
function finish({ header, rows, pics, caps }: Built): RenderedSvg {
  const ln = texLines(rows, 4);
  let y = 4 + ln.h + (rows.length ? 8 : 0);
  let body = ln.svg;
  for (const p of pics) {
    body += `<g transform="translate(0 ${r2(y)})">${p.svg}</g>`;
    y += p.h;
  }
  return compose(header, body, y, caps);
}
function splitSides(src: string): [string, string] | null {
  const parts = src.split(/≡|===|=/);
  return parts.length === 2 && parts[0].trim() && parts[1].trim() ? [parts[0], parts[1]] : null;
}

function renderProve(src: string): Built {
  const sides = splitSides(src);
  if (!sides) throw new Error(words.need.prove);
  const { ctx, es } = setup(sides);
  const [eL, eR] = es;
  const [L0, R0] = [texE(eL), texE(eR)];
  const Lf = (x: number) => evalAt(eL, ctx, x);
  const Rf = (x: number) => evalAt(eR, ctx, x);
  const span = 360 * ctx.m;
  const plots = (same: boolean): Plot[] => [
    { f: Lf, color: same ? "#74c0fc" : C.blue, width: same ? 7 : 2.6, name: words.lhs },
    { f: Rf, color: C.red, width: 2.2, extra: `stroke-dasharray="7 5"`, name: words.rhs },
  ];

  const Ls = sideChains(eL, ctx);
  const Rs = sideChains(eR, ctx);
  if (!Ls.length || !Rs.length) throw new Error(words.tooBig);
  const numericSame = PROBES.every((x) => {
    const [l, r] = [Lf(x), Rf(x)];
    return !Number.isFinite(l) || !Number.isFinite(r) || Math.abs(l) > 1e6 || Math.abs(l - r) < 1e-7 * (1 + Math.abs(l));
  });
  const isId = numericSame && equalRat(Ls[0].fin, Rs[0].fin);
  if (!isId) {
    const tries = [30, 45, 60, 20, 10, 75, 120, 135, 150, 210, 100, 1];
    const x = tries.find((d) => Number.isFinite(Lf(d)) && Number.isFinite(Rf(d)) && Math.abs(Lf(d) - Rf(d)) > 1e-7) ?? 30;
    const xt = angleTex(x, ctx.unit);
    const rows: TexLine[] = [
      { tex: `${ctx.letter} = ${xt}: \\quad \\text{${words.lhs}} \\approx ${tn(Lf(x), 4)}, \\quad \\text{${words.rhs}} \\approx ${tn(Rf(x), 4)}`, op: words.prove.counter, color: C.red },
    ];
    const g = graph("idp", plots(false), -span, span, ctx.unit);
    return built(`${L0} \\not\\equiv ${R0}`, rows, [g], [{ text: words.prove.notIdentity, color: C.red }, { text: words.prove.tryEquation }], { identity: false });
  }

  // The shortest route: the first place where the two chains meet, or their last lines when those are equal.
  type Best = { a: Chain; b: Chain; i: number; j: number; bridge: boolean; cost: number };
  let best = null as Best | null;
  const consider = (c: Best) => {
    if (!best || c.cost < best.cost) best = c;
  };
  const [cL, cR] = [stepCk(eL, ctx), stepCk(eR, ctx)];
  // Two numbers at points off the circle tell fractions apart cheaply; equal ones are then compared exactly.
  const fp = (r: Rat) => `${ratVal(r, 0.31, 0.77).toPrecision(9)},${ratVal(r, -0.53, 0.19).toPrecision(9)}`;
  const Rinfo = Rs.map((b) => {
    const bt = [{ tex: R0, ck: cR }, ...b.steps];
    const first = new Map<string, number>();
    bt.forEach((t, j) => {
      if (!first.has(t.tex)) first.set(t.tex, j);
      if (!first.has(t.ck)) first.set(t.ck, j);
    });
    return { b, bt, first, fp: fp(b.fin) };
  });
  for (const a of Ls) {
    const at_ = [{ tex: L0, ck: cL }, ...a.steps];
    const afp = fp(a.fin);
    for (const { b, bt, first, fp: bfp } of Rinfo) {
      if (best && best.cost < 1) break;
      at_.forEach((t, i) => {
        if (best && i >= best.cost) return;
        const j = first.get(t.tex) ?? first.get(t.ck);
        if (j !== undefined) consider({ a, b, i, j, bridge: bt[j].tex !== t.tex, cost: i + j + (bt[j].tex !== t.tex ? 0.6 : 0) + texLen(t.tex) / 200 });
      });
      const c = at_.length + bt.length - 1 + 0.6;
      if ((!best || c < best.cost) && afp === bfp && sameRat(a.fin, b.fin)) consider({ a, b, i: at_.length - 1, j: bt.length - 1, bridge: true, cost: c });
    }
  }
  if (!best)
    for (const a of Ls.slice(0, 6))
      for (const b of Rs.slice(0, 6))
        if (!best && equalRat(a.fin, b.fin)) consider({ a, b, i: a.steps.length, j: b.steps.length, bridge: true, cost: 99 });
  const B = best as Best | null;
  if (!B) throw new Error(words.tooBig);
  // Start from the longer side.
  const fromLeft = texLen(L0) >= texLen(R0) || B.i > 0;
  const [A, Bc, i, j, A0, B0, nA, nB] = fromLeft ? [B.a, B.b, B.i, B.j, L0, R0, words.lhs, words.rhs] : [B.b, B.a, B.j, B.i, R0, L0, words.rhs, words.lhs];
  const at_ = [A0, ...A.steps.map((s) => s.tex)];
  const bt = [B0, ...Bc.steps.map((s) => s.tex)];
  const rows: TexLine[] = [{ tex: `\\text{${nA}} = ${at_[0]}`, op: words.prove.start }];
  for (let k = 1; k <= i; k++) rows.push({ tex: `= ${at_[k]}`, op: A.steps[k - 1].op });
  if (B.bridge && at_[i] !== bt[j])
    rows.push({ tex: `= ${bt[j]}`, op: !equalRat(A.fin, Bc.fin) ? words.prove.bridge : /\\left\(/.test(at_[i]) && !/\\left\(/.test(bt[j]) ? words.steps.expand : words.steps.rearrange });
  for (let k = j - 1; k >= 0; k--) rows.push({ tex: `= ${bt[k]}`, op: Bc.steps[k].op });
  rows[rows.length - 1] = { ...rows[rows.length - 1], tex: `${rows[rows.length - 1].tex} = \\text{${nB}}`, color: rows.length > 1 ? C.green : undefined };
  if (rows.length === 1) rows.push({ tex: `= ${B0} = \\text{${nB}}`, op: words.steps.rearrange, color: C.green });
  const g = graph("idp", plots(true), -span, span, ctx.unit);
  const shown = [...A.steps.slice(0, i), ...Bc.steps.slice(0, j)].flatMap((s) => s.fs ?? []);
  return built(`${L0} \\equiv ${R0}`, rows, [g], [
    { text: words.prove.done, color: C.green },
    ...formulaCaption(shown),
    { text: words.prove.checked, color: C.grey },
    { text: words.prove.graphCap },
  ], { identity: true });
}

// ---------- R-form ----------

type RForm = "sin+" | "sin-" | "cos+" | "cos-";
type RRes = { R: Sd | null; Rv: number; alpha: number; alphaExact: boolean; form: RForm };
/** a·sin θ + b·cos θ as R·sin(θ ± α) or R·cos(θ ± α), with R > 0 and α in degrees. */
function rSolve(a: Sd, b: Sd, form: RForm | null): RRes {
  const [av, bv] = [a.val(), b.val()];
  const R2 = a.mul(a).add(b.mul(b));
  const R = R2.sqrt();
  const Rv = Math.sqrt(R2.val());
  const pick = (f: RForm) => {
    const deg = (y: number, x: number) => (Math.atan2(y, x) * 180) / Math.PI;
    return f === "sin+" ? deg(bv, av) : f === "sin-" ? deg(-bv, av) : f === "cos+" ? deg(-av, bv) : deg(av, bv);
  };
  let f: RForm;
  if (form) f = form;
  else {
    const ok = (["sin+", "sin-", "cos-", "cos+"] as RForm[]).find((g) => {
      const al = pick(g);
      return al > 0 && al < 90;
    });
    f = ok ?? "sin+";
  }
  let alpha = pick(f);
  const ex = ratOf(alpha, 4);
  const alphaExact = !!ex && isMult(alpha, 15);
  if (alphaExact) alpha = Math.round(alpha);
  return { R, Rv, alpha, alphaExact, form: f };
}
const formTex = (f: RForm, R: string, th: string, al: string) => `${R}\\${f.slice(0, 3)}\\left(${th} ${f.endsWith("+") ? "+" : "-"} ${al}\\right)`;
function alphaTex(r: RRes, unit: Unit): string {
  if (r.alphaExact) return angleTex(r.alpha, unit);
  return unit === "deg" ? `${tn(r.alpha, 2)}^\\circ` : tn(rad(r.alpha), 3);
}
const sqTexP = (v: Sd) => (v.rat()?.isInt() && !v.rat()!.isNeg() ? v.tex() : `\\left(${v.tex()}\\right)`);
const sdTexP = (v: Sd) => (v.val() < 0 || v.t.size > 1 ? `\\left(${v.tex()}\\right)` : v.tex());

/** a·sin θ + b·cos θ (+ d) from an expression in one angle. */
function linearSC(e: E, ctx: Ctx): { a: Sd; b: Sd; d: Sd } | null {
  const r = toRat(rewriteAll([e], ctx, 0).es[0], ctx);
  if (r.d.length || r.n.deg > 1) return null;
  const get = (i: number, j: number) => r.n.ts.find((t) => t.i === i && t.j === j)?.k ?? Sd.ZERO;
  return { a: get(1, 0), b: get(0, 1), d: get(0, 0) };
}

/** Parse "lo ≤ x < hi" (or with θ); the bounds in degrees. */
type Interval = { lo: number; hi: number; loIn: boolean; hiIn: boolean; unit: Unit };
function intervalOf(s: string, unitHint: Unit): Interval | null {
  const t = s.replace(/<=/g, "≤").replace(/>=/g, "≥").replace(/θ|theta/g, "x").replace(/\s+/g, "");
  const m = /^(.+?)(≤|<)x(≤|<)(.+)$/.exec(t);
  if (!m) return null;
  const unit: Unit = /π|pi/.test(t) && !/°/.test(t) ? "rad" : /°/.test(t) ? "deg" : unitHint;
  const val = (v: string) => {
    const e = parseE(v.replace(/°/g, ""));
    const x = evalE(e, 0);
    return unit === "rad" ? (x * 180) / Math.PI : x;
  };
  const [lo, hi] = [val(m[1]), val(m[4])];
  if (!(lo < hi) || hi - lo > 3600 * 4) throw new Error(words.eq.badInterval);
  return { lo, hi, loIn: m[2] === "≤", hiIn: m[3] === "≤", unit };
}
const ivTex = (iv: Interval, letter: string) =>
  `${angleTex(iv.lo, iv.unit)} ${iv.loIn ? "\\le" : "<"} ${letter} ${iv.hiIn ? "\\le" : "<"} ${angleTex(iv.hi, iv.unit)}`;
const inIv = (x: number, iv: Interval) => (iv.loIn ? x >= iv.lo - 1e-7 : x > iv.lo + 1e-7) && (iv.hiIn ? x <= iv.hi + 1e-7 : x < iv.hi - 1e-7);
/** Split "equation, interval" (the interval is the last part with ≤ or <). */
function splitInterval(src: string): { main: string; iv: string | null; extra: string[] } {
  const parts = src.split(/;|,(?=\s*[^\d])/).map((p) => p.trim()).filter(Boolean);
  const ivAt = parts.findIndex((p) => /(<|≤|<=)\s*(x|θ|theta)\s*(<|≤|<=)/.test(p));
  const iv = ivAt >= 0 ? parts[ivAt] : null;
  const rest = parts.filter((_, i) => i !== ivAt);
  return { main: rest[0] ?? "", iv, extra: rest.slice(1) };
}

/** The angles in [lo, hi] (degrees) where f = v; exact when the principal angle is a multiple of 15°. */
type Sol = { deg: number; exact: boolean };
function basicSolve(f: "sin" | "cos" | "tan", v: number, iv: Interval): { principal: number | null; exact: boolean; sols: Sol[] } {
  if ((f !== "tan" && Math.abs(v) > 1 + 1e-12) || !Number.isFinite(v)) return { principal: null, exact: false, sols: [] };
  const vv = f === "tan" ? v : Math.max(-1, Math.min(1, v));
  let al = ((f === "sin" ? Math.asin(vv) : f === "cos" ? Math.acos(vv) : Math.atan(vv)) * 180) / Math.PI;
  const exact = isMult(al, 15);
  if (exact) al = Math.round(al);
  const bases = f === "sin" ? [al, 180 - al] : f === "cos" ? [al, -al] : [al];
  const P_ = f === "tan" ? 180 : 360;
  const sols: Sol[] = [];
  for (const b of bases)
    for (let k = Math.floor((iv.lo - b) / P_) - 1; k <= Math.ceil((iv.hi - b) / P_) + 1; k++) {
      const x = b + k * P_;
      if (inIv(x, iv) && !sols.some((s) => Math.abs(s.deg - x) < 1e-7)) sols.push({ deg: x, exact });
    }
  return { principal: al, exact, sols: sols.sort((a, b) => a.deg - b.deg) };
}
const solTex = (s: Sol, unit: Unit) => (s.exact ? angleTex(s.deg, unit) : unit === "deg" ? `${tn(s.deg, 1)}^\\circ` : tn(rad(s.deg), 3));

function renderRForm(src: string): Built {
  const { main, iv: ivSrc, extra } = splitInterval(src);
  if (!main) throw new Error(words.need.rform);
  let form: RForm | null = null;
  for (const x of extra) {
    const m = /(sin|cos)\s*\(\s*[^+\-−]*([+\-−])/.exec(x);
    if (m) form = `${m[1]}${m[2] === "+" ? "+" : "-"}` as RForm;
  }
  const sides = main.includes("=") ? splitSides(main) : [main, ""];
  if (!sides) throw new Error(words.need.rform);
  const { ctx, es } = setup(sides[1] ? [sides[0], sides[1]] : [sides[0]]);
  const atoms = atomsOf(es[0], ctx);
  if (!atoms.length) throw new Error(words.rform.notLinear);
  const argKey = (a: Arg) => `${a.n}|${a.a}`;
  if (new Set(atoms.map((a) => argKey(a.arg))).size > 1) throw new Error(words.rform.notLinear);
  const arg0 = atoms[0].arg;
  // Work in θ = the common angle.
  const th = argStr(ctx, arg0.n, arg0.a, false);
  const thPlain = argStr(ctx, arg0.n, arg0.a, true);
  const c2: Ctx = { ...newCtx(ctx.unit, false), letter: th, plainLetter: thPlain };
  const e1 = mapAtoms(es[0], ctx, (f) => at(c2, f, 1));
  const lin = linearSC(e1, c2);
  if (!lin) throw new Error(words.rform.notLinear);
  const { a, b } = lin;
  let d = lin.d;
  if (a.isZero() || b.isZero()) throw new Error(words.rform.needBoth);
  let k: Sd | null = null;
  if (sides[1]) {
    const kv = sdOf(tidy(es[1]));
    if (!kv) throw new Error(words.rform.notLinear);
    k = kv.sub(d);
    d = Sd.ZERO;
  }
  const r = rSolve(a, b, form);
  const Rt = r.R ? r.R.tex() : `\\sqrt{${a.mul(a).add(b.mul(b)).tex()}}`;
  const al = alphaTex(r, ctx.unit);
  const nm = baseNm(c2);
  const lhsP = new P([{ i: 1, j: 0, k: a }, { i: 0, j: 1, k: b }]);
  const lhs = polyTex(lhsP, nm);
  const cosA = r.form.startsWith("sin") ? a : b;
  const sinA = r.form === "sin+" ? b : r.form === "sin-" ? b.neg() : r.form === "cos+" ? a.neg() : a;
  const fT = r.form.slice(0, 3);
  const expand =
    r.form === "sin+" ? `R\\sin ${th}\\cos\\alpha + R\\cos ${th}\\sin\\alpha`
    : r.form === "sin-" ? `R\\sin ${th}\\cos\\alpha - R\\cos ${th}\\sin\\alpha`
    : r.form === "cos+" ? `R\\cos ${th}\\cos\\alpha - R\\sin ${th}\\sin\\alpha`
    : `R\\cos ${th}\\cos\\alpha + R\\sin ${th}\\sin\\alpha`;
  const rows: TexLine[] = [
    { tex: `${formTex(r.form, "R", th, "\\alpha")} = ${expand}`, op: words.rform.expand },
    { tex: `R\\cos\\alpha = ${cosA.tex()}, \\quad R\\sin\\alpha = ${sinA.tex()}`, op: words.rform.compare },
    { tex: `R = \\sqrt{${sqTexP(cosA)}^2 + ${sqTexP(sinA)}^2} = ${Rt}${r.R && r.R.rat() ? "" : ` \\approx ${tn(r.Rv, 3)}`}`, op: words.rform.squareAdd },
    { tex: `\\tan\\alpha = \\frac{R\\sin\\alpha}{R\\cos\\alpha} = ${sinA.div(cosA).tex()}, \\quad \\alpha = ${al}`, op: words.rform.divide },
    { tex: `${lhs} = ${formTex(r.form, Rt, th, al)}`, op: words.rform.result, color: C.green },
  ];
  // θ where the wave is largest and smallest (before d).
  const peak = r.form === "sin+" ? 90 - r.alpha : r.form === "sin-" ? 90 + r.alpha : r.form === "cos+" ? -r.alpha : r.alpha;
  const caps: Caption[] = [];
  const thetaTex = (deg: number) => (r.alphaExact ? angleTex(mod(deg, 360), ctx.unit) : solTex({ deg: mod(deg, 360), exact: false }, ctx.unit));
  rows.push({
    tex: `\\max = ${Rt} \\text{ at } ${th} = ${thetaTex(peak)}, \\quad \\min = -${Rt} \\text{ at } ${th} = ${thetaTex(peak + 180)}`,
    op: words.rform.max,
  });
  // x from θ = (n/m)x + a.
  const kx = arg0.n / ctx.m;
  const toX = (thDeg: number) => (thDeg - arg0.a) / kx;
  const marks: { x: number; y: number; color: string }[] = [];
  let iv: Interval;
  if (ivSrc) iv = intervalOf(ivSrc, ctx.unit) ?? { lo: 0, hi: 360, loIn: true, hiIn: false, unit: ctx.unit };
  else iv = { lo: 0, hi: 360, loIn: true, hiIn: false, unit: ctx.unit };
  if (k) {
    const v = k.val() / r.Rv;
    const kTex = r.R ? k.div(r.R).tex() : `\\frac{${k.tex()}}{${Rt}}`;
    rows.push({ tex: `${formTex(r.form, Rt, th, al)} = ${k.tex()} \\;\\Rightarrow\\; \\${fT}\\left(${th} ${r.form.endsWith("+") ? "+" : "-"} ${al}\\right) = ${kTex}`, op: words.rform.solve });
    // φ = θ ± α runs over the shifted interval.
    const sgn = r.form.endsWith("+") ? 1 : -1;
    const thIv = (() => {
      const [p, q] = [kx * iv.lo + arg0.a, kx * iv.hi + arg0.a];
      return kx > 0 ? { lo: p, hi: q, loIn: iv.loIn, hiIn: iv.hiIn, unit: iv.unit } : { lo: q, hi: p, loIn: iv.hiIn, hiIn: iv.loIn, unit: iv.unit };
    })();
    const phIv = { ...thIv, lo: thIv.lo + sgn * r.alpha, hi: thIv.hi + sgn * r.alpha };
    const res = basicSolve(fT as "sin" | "cos", v, phIv);
    if (res.principal === null) rows.push({ tex: `\\left|${kTex}\\right| > 1`, op: words.eq.outside, color: C.red });
    else {
      const xs = res.sols.map((s) => ({ deg: toX(s.deg - sgn * r.alpha), exact: s.exact && r.alphaExact && isMult(toX(s.deg - sgn * r.alpha), 0.5) }));
      const phi = `${th} ${sgn > 0 ? "+" : "-"} ${al}`;
      rows.push({ tex: `${phi} = ${res.sols.map((s) => solTex(s, ctx.unit)).join(", ") || "\\varnothing"}`, op: fill(words.eq.principal, { f: `${fT}⁻¹`, v: nt(v, 4), a: solTex({ deg: res.principal, exact: res.exact }, ctx.unit).replace(/\^\\circ/g, "°").replace(/\\pi/g, "π").replace(/\\frac\{(.+?)\}\{(.+?)\}/g, "$1/$2") }) });
      rows.push({ tex: `${c2.letter === ctx.letter ? ctx.letter : ctx.letter} = ${xs.map((s) => solTex(s, ctx.unit)).join(", ") || "\\varnothing"}`, op: fill(words.eq.solutions, { n: xs.length }), color: C.green });
      for (const s of xs) marks.push({ x: s.deg, y: k.val(), color: C.green });
    }
    caps.push({ text: ivSrc ? "" : "" });
  }
  // Pictures: the triangle for R and α, and the waves.
  const tri = triangle(cosA.val(), sinA.val(), cosA.plain(), sinA.plain(), r.R ? r.R.plain() : nt(r.Rv, 3), alphaTex(r, ctx.unit).replace(/\^\\circ/g, "°").replace(/\\pi/g, "π").replace(/\\frac\{(.+?)\}\{(.+?)\}/g, "$1/$2"));
  const Aw = (x: number) => a.val() * Math.sin(rad(kx * x + arg0.a));
  const Bw = (x: number) => b.val() * Math.cos(rad(kx * x + arg0.a));
  const plots: Plot[] = [
    { f: Aw, color: C.blue, width: 1.6, extra: `opacity="0.7"`, name: polyTex(new P([{ i: 1, j: 0, k: a }]), nm, true) },
    { f: Bw, color: C.green, width: 1.6, extra: `opacity="0.7"`, name: polyTex(new P([{ i: 0, j: 1, k: b }]), nm, true) },
    { f: (x) => Aw(x) + Bw(x), color: C.purple, width: 3, name: `${r.R ? r.R.plain() : nt(r.Rv, 3)} ${fT}(${thPlain.replace(/^\((.*)\)$/, "$1")} ${r.form.endsWith("+") ? "+" : "−"} α)` },
  ];
  const lines = `<g stroke="${C.purple}" stroke-dasharray="5 4" stroke-width="1.2"><line x1="48" x2="${W - 20}" y1="FRAME_Y(${r.Rv})" y2="FRAME_Y(${r.Rv})"/><line x1="48" x2="${W - 20}" y1="FRAME_Y(${-r.Rv})" y2="FRAME_Y(${-r.Rv})"/></g>`;
  const kLine = k ? `<line x1="48" x2="${W - 20}" y1="FRAME_Y(${k.val()})" y2="FRAME_Y(${k.val()})" stroke="${C.orange}" stroke-width="1.6"/>` : "";
  const g = graph("idr", plots, iv.lo, iv.hi, ctx.unit, 240, marks, lines + kLine);
  const header = k ? `${polyTex(lhsP, nm)} = ${k.add(lin.d).tex()}${ivSrc ? `, \\quad ${ivTex(iv, ctx.letter)}` : ""}` : `${polyTex(lhsP, nm)}${d.isZero() ? "" : ` + ${d.tex()}`}`;
  return built(header, rows, [tri, g], [{ text: words.rform.triangle }, { text: words.rform.graphCap }, ...caps.filter((c) => c.text)], {
    R: r.Rv,
    alpha: r.alpha,
    form: r.form,
    solutions: k ? marks.map((m) => m.x) : undefined,
  });
}
/** A right triangle with legs |a| (across) and |b| (up), hypotenuse R and the angle α at the left. */
function triangle(a: number, b: number, at_: string, bt: string, Rt: string, alt: string): { svg: string; h: number } {
  const h = 150;
  const [A, B] = [Math.abs(a), Math.abs(b)];
  const k = Math.min(260 / A, 110 / B);
  const [x0, y0] = [W / 2 - (A * k) / 2, 20 + B * k];
  const [x1, y1] = [x0 + A * k, y0 - B * k];
  const ang = Math.atan2(B, A);
  const arc = `M ${r2(x0 + 30)} ${r2(y0)} A 30 30 0 0 0 ${r2(x0 + 30 * Math.cos(ang))} ${r2(y0 - 30 * Math.sin(ang))}`;
  const svg =
    `<polygon points="${r2(x0)},${r2(y0)} ${r2(x1)},${r2(y0)} ${r2(x1)},${r2(y1)}" fill="#f3f0ff" stroke="${C.purple}" stroke-width="2"/>` +
    `<path d="${arc}" fill="none" stroke="${C.orange}" stroke-width="2"/>` +
    `<rect x="${r2(x1 - 10)}" y="${r2(y0 - 10)}" width="10" height="10" fill="none" stroke="${C.ink}"/>` +
    lbl((x0 + x1) / 2, y0 + 17, at_, C.blue, "middle", 13, false) +
    lbl(x1 + 8, (y0 + y1) / 2 + 5, bt, C.green, "start", 13, false) +
    lbl((x0 + x1) / 2 - 14, (y0 + y1) / 2 - 6, `R = ${Rt}`, C.purple, "end", 13, false) +
    lbl(x0 + 36, y0 - 6, `α = ${alt}`, C.orange, "start", 13, false);
  return { svg, h };
}

// ---------- equations ----------

type Val = { tex: string; v: number };
type Plan =
  | { kind: "poly"; v: "s" | "c" | "t"; q: P; red: Variant | "tan"; rank: number }
  | { kind: "rform"; a: Sd; b: Sd; k: Sd; rank: number }
  | { kind: "none"; rank: number };
const lead = (q: P) => (q.ts.length && q.ts[0].k.val() < 0 ? q.neg() : q);
function planFor(q0: P): Plan {
  const p = planFor0(q0);
  return p.kind === "poly" ? { ...p, q: lead(p.q) } : p;
}
function planFor0(q: P): Plan {
  if (q.konst()) return { kind: "none", rank: 5 };
  if (q.degC === 0) return { kind: "poly", v: "s", q, red: "orig", rank: 0 };
  if (q.degS === 0) return { kind: "poly", v: "c", q, red: "orig", rank: 0 };
  if (q.ts.every((t) => t.j % 2 === 0)) return { kind: "poly", v: "s", q: variant(q, "redC"), red: "redC", rank: 1 };
  if (q.ts.every((t) => t.i % 2 === 0)) return { kind: "poly", v: "c", q: variant(q, "redS"), red: "redS", rank: 1 };
  if (q.ts.every((t) => t.i + t.j === q.deg)) return { kind: "poly", v: "t", q, red: "tan", rank: 2 };
  if (q.deg === 1) {
    const get = (i: number, j: number) => q.ts.find((t) => t.i === i && t.j === j)?.k ?? Sd.ZERO;
    return { kind: "rform", a: get(1, 0), b: get(0, 1), k: get(0, 0).neg(), rank: 3 };
  }
  return { kind: "none", rank: 9 };
}
/** Coefficients (lowest first) of a polynomial in one of sin, cos or tan (tan: Σ k·sinⁱcos^(d−i) → Σ k·tanⁱ). */
function uniCoeffs(q: P, v: "s" | "c" | "t"): Sd[] {
  const deg = v === "s" ? q.degS : v === "c" ? q.degC : q.deg;
  const co: Sd[] = Array.from({ length: deg + 1 }, () => Sd.ZERO);
  for (const t of q.ts) co[v === "c" ? t.j : t.i] = co[v === "c" ? t.j : t.i].add(t.k);
  return co;
}
function rootsOf(co: Sd[]): Val[] {
  while (co.length > 1 && co[co.length - 1].isZero()) co = co.slice(0, -1);
  if (co.length < 2) return [];
  if (co.every((c) => c.rat())) {
    const { exact, approx } = realRoots(co.map((c) => c.rat()!));
    return [...exact.map((r) => ({ tex: qsTex(r), v: qsNum(r) })), ...approx.map((v) => ({ tex: tn(v, 4), v }))];
  }
  if (co.length === 2) {
    const r = co[0].neg().div(co[1]);
    return [{ tex: r.tex(), v: r.val() }];
  }
  const vals = co.map((c) => c.val());
  const out: Val[] = [];
  for (let i = 0; i <= 4000; i++) {
    const [x0, x1] = [-50 + (i * 100) / 4000, -50 + ((i + 1) * 100) / 4000];
    const f = (x: number) => vals.reduceRight((acc, k) => acc * x + k, 0);
    if (f(x0) === 0) out.push({ tex: tn(x0, 4), v: x0 });
    else if (f(x0) * f(x1) < 0) {
      let [lo, hi] = [x0, x1];
      for (let k = 0; k < 80; k++) {
        const mid = (lo + hi) / 2;
        if (f(lo) * f(mid) <= 0) hi = mid;
        else lo = mid;
      }
      out.push({ tex: tn(lo, 4), v: lo });
    }
  }
  return out;
}

function renderEquation(src: string): Built {
  const { main, iv: ivSrc } = splitInterval(src);
  const sides = splitSides(main);
  if (!sides) throw new Error(words.need.equation);
  const { ctx, es } = setup(sides, ivSrc && /π|pi/.test(ivSrc) && !/°/.test(src) ? "rad" : undefined);
  const iv: Interval = (ivSrc && intervalOf(ivSrc, ctx.unit)) || (ctx.unit === "rad" ? { lo: 0, hi: 360, loIn: true, hiIn: false, unit: "rad" } : { lo: 0, hi: 360, loIn: true, hiIn: false, unit: "deg" });
  ctx.unit = iv.unit;
  const [eL, eR] = es;
  const rows: TexLine[] = [];
  const caps: Caption[] = [];
  const header = `${texE(eL)} = ${texE(eR)}, \\quad ${ivTex(iv, ctx.letter)}`;

  // One angle everywhere (2x − 30°): call it θ and solve in θ over the stretched interval.
  const atoms = [...atomsOf(eL, ctx), ...atomsOf(eR, ctx)];
  const args = [...new Map(atoms.map((a) => [`${a.arg.n}|${a.arg.a}`, a.arg])).values()];
  let work: Ctx = ctx;
  let sides2 = [eL, eR];
  let toX = (thDeg: number) => thDeg;
  let thIv = iv;
  let exactMap = (s: Sol) => s.exact;
  if (args.length === 1 && (args[0].n !== ctx.m || args[0].a !== 0) && args[0].n !== 0) {
    const g = args[0];
    const kx = g.n / ctx.m;
    work = { ...newCtx(ctx.unit, false), letter: ctx.letter === "\\theta" ? "u" : "\\theta", plainLetter: ctx.letter === "\\theta" ? "u" : "θ" };
    sides2 = [eL, eR].map((e) => mapAtoms(e, ctx, (f) => at(work, f, 1)));
    toX = (th) => (th - g.a) / kx;
    const [p, q] = [kx * iv.lo + g.a, kx * iv.hi + g.a];
    thIv = kx > 0 ? { ...iv, lo: p, hi: q } : { ...iv, lo: q, hi: p, loIn: iv.hiIn, hiIn: iv.loIn };
    exactMap = (s) => s.exact && isMult(toX(s.deg), 0.5);
    rows.push({ tex: `${work.letter} = ${argStr(ctx, g.n, g.a, false).replace(/^\\left\((.*)\\right\)$/, "$1")}, \\quad ${ivTex(thIv, work.letter)}`, op: words.eq.subst });
  } else if (args.length > 1 && args.some((a) => a.a !== 0 && !a.af)) throw new Error(words.angle15);

  // Rewrite with each form of cos 2A and keep the one that gives the simplest equation.
  type Try = { steps: RStep[]; F: Rat; mono: [number, number]; plan: Plan; kq: Sd };
  let best: Try | null = null;
  for (const choice of [0, 1, 2]) {
    const { es: rw, steps } = rewriteAll(sides2, work, choice);
    const F = ratAdd(toRat(rw[0], work), ratMul(toRat(rw[1], work), ratP(P.k(-1))));
    if (variant(F.n, "redC").isZero()) {
      best = { steps, F, mono: [0, 0], plan: { kind: "none", rank: -1 }, kq: Sd.ONE };
      break;
    }
    const nf = normFactor(F.n);
    const mi = nf.fs.filter(isS).length;
    const mj = nf.fs.filter(isC).length;
    let q = nf.fs.find((f) => !isS(f) && !isC(f)) ?? P.k(1);
    if (q.ts[0].k.val() < 0) q = q.neg();
    const plan = planFor(q);
    const t: Try = { steps, F, mono: [mi, mj], plan, kq: nf.k };
    if (!best || plan.rank < best.plan.rank || (plan.rank === best.plan.rank && q.ts.length < (best.plan.kind === "poly" ? best.plan.q.ts.length : 99))) best = t;
  }
  const B = best!;
  const nm = baseNm(work);
  for (const s of B.steps) rows.push({ tex: `${texE(s.es[0])} = ${texE(s.es[1])}`, op: s.op });

  const thLetter = work.letter;
  const fnTex = (f: "sin" | "cos" | "tan") => `\\${f} ${argStr(work, 1, 0, false)}`;
  const xs: Sol[] = [];
  const cases: { f: "sin" | "cos" | "tan"; val: Val }[] = [];
  let numeric = false;
  if (B.plan.rank === -1) {
    rows.push({ tex: `0 = 0`, op: words.eq.always, color: C.green });
    caps.push({ text: words.eq.always });
  } else {
    const [mi, mj] = B.mono;
    const q = B.plan.kind === "poly" ? B.plan.q : B.plan.kind === "rform" ? new P([{ i: 1, j: 0, k: B.plan.a }, { i: 0, j: 1, k: B.plan.b }, { i: 0, j: 0, k: B.plan.k.neg() }]) : (normFactor(B.F.n).fs.find((f) => !isS(f) && !isC(f)) ?? P.k(1));
    const monoT = monoTex(mi, mj, nm);
    const qT = q.konst() ? "" : polyTex(B.plan.kind === "poly" && B.plan.red !== "tan" ? q : q, B.plan.kind === "poly" && B.plan.v === "t" ? nm : nm);
    const opCollect = [
      words.eq.collect,
      B.F.d.length ? fill(words.eq.times, { d: factorsTex(B.F.d, nm, true, true) }) : "",
      B.plan.kind === "poly" && B.plan.red !== "orig" && B.plan.red !== "tan" ? fill(words.steps.pyth[B.plan.red], { a: nm.parg }) : "",
    ].filter(Boolean).join("; ");
    const lhsT = monoT && qT ? `${monoT} \\left(${qT}\\right)` : monoT || qT;
    const simple = !mi && !mj && !B.F.d.length && ((!B.steps.length && B.plan.kind === "poly" && B.plan.red === "orig" && B.plan.q.deg === 1) || B.plan.kind === "rform");
    if (!simple) rows.push({ tex: `${lhsT} = 0`, op: opCollect });
    if (mi) cases.push({ f: "sin", val: { tex: "0", v: 0 } });
    if (mj) cases.push({ f: "cos", val: { tex: "0", v: 0 } });
    const plan = B.plan;
    if (plan.kind === "poly") {
      const f = plan.v === "s" ? "sin" : plan.v === "c" ? "cos" : "tan";
      if (plan.v === "t") rows.push({ tex: `${polyTex(new P(uniCoeffs(plan.q, "t").map((k, i) => ({ i, j: 0, k }))), tanNm(work))} = 0`, op: fill(words.eq.divide, { d: monoPlain(0, plan.q.deg, nm) }) });
      const co = uniCoeffs(plan.q, plan.v);
      const roots = rootsOf(co);
      const tnm = plan.v === "t" ? tanNm(work) : plan.v === "c" ? { ...nm, s: "\\cos", ps: "cos" } : nm;
      const asS = new P(co.map((k, i) => ({ i, j: 0, k })));
      const fac = factorPoly(asS);
      if (co.length > 2 && fac.fs.length > 1) rows.push({ tex: `${fac.fs.map((f) => `\\left(${polyTex(lead(f), tnm)}\\right)`).join("")} = 0`, op: words.eq.factorise });
      else if (co.length === 3 && roots.length) rows.push({ tex: `${fnTex(f)} = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}`, op: words.eq.formula });
      for (const r of roots) cases.push({ f, val: r });
    } else if (plan.kind === "rform") {
      const r = rSolve(plan.a, plan.b, null);
      const Rt = r.R ? r.R.tex() : tn(r.Rv, 4);
      const al = alphaTex(r, iv.unit);
      const fT = r.form.slice(0, 3) as "sin" | "cos";
      const sgn = r.form.endsWith("+") ? 1 : -1;
      const v = plan.k.val() / r.Rv;
      rows.push({ tex: `${formTex(r.form, Rt, thLetter, al)} = ${plan.k.tex()}`, op: words.rform.result });
      rows.push({ tex: `\\${fT}\\left(${thLetter} ${sgn > 0 ? "+" : "-"} ${al}\\right) = ${r.R ? plan.k.div(r.R).tex() : tn(v, 4)}`, op: words.rform.solve });
      const phIv = { ...thIv, lo: thIv.lo + sgn * r.alpha, hi: thIv.hi + sgn * r.alpha };
      const res = basicSolve(fT, v, phIv);
      if (res.principal === null) rows.push({ tex: `\\left|${tn(v, 4)}\\right| > 1`, op: words.eq.outside, color: C.red });
      else
        rows.push({
          tex: `${thLetter} ${sgn > 0 ? "+" : "-"} ${al} = ${res.sols.map((s) => solTex(s, iv.unit)).join(", ") || "\\varnothing"}`,
          op: res.sols.length ? fill(words.eq.principal, { f: `${fT}⁻¹`, v: nt(v, 4), a: plainAngle(solTex({ deg: res.principal, exact: res.exact }, iv.unit)) }) : words.eq.noneInRange,
        });
      for (const s of res.sols) xs.push({ deg: toX(s.deg - sgn * r.alpha), exact: s.exact && r.alphaExact && exactMap({ deg: s.deg - sgn * r.alpha, exact: true }) });
    } else if (plan.kind === "none" && !q.konst()) numeric = true;
    if (cases.length > 1) rows.push({ tex: cases.map((c) => `${fnTex(c.f)} = ${c.val.tex}`).join(` \\;\\text{ ${words.or} }\\; `), op: words.eq.values });
    for (const c of cases) {
      const res = basicSolve(c.f, c.val.v, thIv);
      if (res.principal === null) {
        rows.push({ tex: `${fnTex(c.f)} = ${c.val.tex}`, op: words.eq.outside, color: C.grey });
        continue;
      }
      const sols = res.sols.map((s) => ({ deg: s.deg, exact: s.exact }));
      const pr = solTex({ deg: res.principal, exact: res.exact }, iv.unit);
      rows.push({
        tex: `${fnTex(c.f)} = ${c.val.tex}: \\quad ${thLetter} = ${sols.map((s) => solTex(s, iv.unit)).join(", ") || "\\varnothing"}`,
        op: sols.length ? fill(words.eq.principal, { f: `${c.f}⁻¹`, v: nt(c.val.v, 4), a: plainAngle(pr) }) : words.eq.noneInRange,
      });
      for (const s of sols) xs.push({ deg: toX(s.deg), exact: exactMap(s) });
    }
  }
  const Lf = (x: number) => evalAt(eL, ctx, x);
  const Rf = (x: number) => evalAt(eR, ctx, x);
  if (numeric) {
    const n = 4000;
    const f = (x: number) => Lf(x) - Rf(x);
    for (let i = 0; i < n; i++) {
      const [x0, x1] = [iv.lo + ((iv.hi - iv.lo) * i) / n, iv.lo + ((iv.hi - iv.lo) * (i + 1)) / n];
      const [f0, f1] = [f(x0), f(x1)];
      if (!Number.isFinite(f0) || !Number.isFinite(f1)) continue;
      if (f0 === 0 && inIv(x0, iv)) xs.push({ deg: x0, exact: false });
      else if (f0 * f1 < 0 && Math.abs(f0 - f1) < 5) {
        let [lo, hi] = [x0, x1];
        for (let k = 0; k < 80; k++) {
          const mid = (lo + hi) / 2;
          if (f(lo) * f(mid) <= 0) hi = mid;
          else lo = mid;
        }
        xs.push({ deg: lo, exact: false });
      }
    }
    caps.push({ text: words.eq.numeric, color: C.orange });
  }
  // Keep the solutions where both sides have a value.
  const sols: Sol[] = [];
  const rejected: Sol[] = [];
  for (const s of xs.sort((a, b) => a.deg - b.deg)) {
    if (sols.some((t) => Math.abs(t.deg - s.deg) < 1e-6) || !inIv(s.deg, iv)) continue;
    const [l, r] = [Lf(s.deg), Rf(s.deg)];
    if (!Number.isFinite(l) || !Number.isFinite(r) || Math.abs(l) > 1e9 || Math.abs(r) > 1e9) rejected.push(s);
    else if (Math.abs(l - r) < 1e-6 * (1 + Math.abs(l))) sols.push(s);
  }
  if (B.plan.rank !== -1) {
    rows.push({
      tex: sols.length ? `${ctx.letter} = ${sols.map((s) => solTex(s, iv.unit)).join(", ")}` : `\\text{${words.eq.noSolutions}}`,
      op: sols.length ? fill(words.eq.solutions, { n: sols.length }) : "",
      color: C.green,
    });
  }
  if (rejected.length) caps.push({ text: fill(words.eq.rejected, { list: rejected.map((s) => plainAngle(solTex(s, iv.unit))).join(", ") }), color: C.orange });
  const g = graph("ide", [
    { f: Lf, color: C.blue, width: 2.6, name: words.lhs },
    { f: Rf, color: C.red, width: 2.2, extra: `stroke-dasharray="7 5"`, name: words.rhs },
  ], iv.lo, iv.hi, iv.unit, 230, sols.map((s) => ({ x: s.deg, y: Lf(s.deg), color: C.green })), sols.map((s) => `<line x1="FRAME_X(${s.deg})" x2="FRAME_X(${s.deg})" y1="8" y2="208" stroke="${C.green}" stroke-dasharray="3 4" opacity="0.6"/>`).join(""));
  const fsUsed = [...B.steps.flatMap((s) => s.fs), ...(B.plan.kind === "poly" && B.plan.red !== "orig" && B.plan.red !== "tan" ? (["pyth"] as Formula[]) : [])];
  return built(header, rows, [g], [...caps, ...formulaCaption(fsUsed), { text: words.eq.graphCap }], {
    identity: B.plan.rank === -1,
    solutions: sols.map((s) => s.deg),
    rejected: rejected.map((s) => s.deg),
  });
}
const plainAngle = (t: string) =>
  t.replace(/\^\\circ/g, "°").replace(/\\frac\{(.*?)\}\{(.*?)\}/g, "$1/$2").replace(/\\pi/g, "π").replace(/-/g, "−").replace(/\\/g, "");

// ---------- compound angles: exact values, given ratios, expansions ----------

const BASIC = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330, 360];
function renderCompound(src: string): Built {
  if (/(sin|cos|tan)\s*[A-Z]\s*=/.test(src)) return renderRatios(src);
  const { s, unit, theta } = prep(src);
  let e: E;
  try {
    e = tidy(readE(s));
  } catch (err) {
    throw err;
  }
  const hasX = JSON.stringify(e).includes(`"name":"x"`);
  if (hasX) return renderExpand(src);
  if (e.k !== "fn" || !TRIG.includes(e.f)) throw new Error(words.need.compound);
  void theta;
  const { a: deg } = analyze(e.a, unit);
  const f = e.f;
  const ctx = newCtx(unit, false);
  const A = (d: number) => angleTex(d, unit);
  const name = (g: Fn) => (g === "csc" ? "\\csc" : `\\${g}`);
  const rows: TexLine[] = [];
  const caps: Caption[] = [];
  let value: Sd | null = null;
  let valueTex = "";
  let num = NaN;
  // sec, cosec, cot through cos, sin, tan.
  const base: Fn = f === "sec" ? "cos" : f === "csc" ? "sin" : f === "cot" ? "tan" : f;
  const recip = base !== f;
  const head = `${name(f)} ${A(deg)}`;
  if (recip) rows.push({ tex: `${head} = \\frac{1}{${name(base)} ${A(deg)}}`, op: words.compound.recip });
  const pre = recip ? `\\frac{1}{${name(base)} ${A(deg)}}` : head;
  const wrapV = (t: string) => (recip ? `\\frac{1}{${t}}` : t);
  void pre;
  if (isMult(deg, 15) && !BASIC.some((b) => isMult(deg - b, 360))) {
    // A ± B with A, B among the standard angles.
    let pair: [number, number, 1 | -1] | null = null;
    const D = mod(Math.round(deg), 360);
    for (const a of BASIC)
      for (const sg of [1, -1] as const)
        for (const b of [30, 45, 60]) if (!pair && a >= b && mod(a + sg * b, 360) === D) pair = [a, b, sg];
    const [a, b, sg] = pair!;
    const op = sg > 0 ? "+" : "-";
    const v = (g: Fn, d: number) => trigD(g, d) as Sd;
    rows.push({ tex: `${name(base)} ${A(deg)} = ${name(base)}\\left(${A(a)} ${op} ${A(b)}\\right)`, op: fill(words.compound.split, { a: plainAngle(A(deg)), b: plainAngle(A(a)), c: plainAngle(A(b)), s: op === "+" ? "+" : "−" }) });
    let res: Sd;
    if (base === "sin" || base === "cos") {
      const formula =
        base === "sin" ? `\\sin ${A(a)}\\cos ${A(b)} ${op} \\cos ${A(a)}\\sin ${A(b)}` : `\\cos ${A(a)}\\cos ${A(b)} ${sg > 0 ? "-" : "+"} \\sin ${A(a)}\\sin ${A(b)}`;
      const [p1, p2] = base === "sin" ? [[v("sin", a), v("cos", b)], [v("cos", a), v("sin", b)]] : [[v("cos", a), v("cos", b)], [v("sin", a), v("sin", b)]];
      const sign2 = base === "sin" ? sg : -sg;
      rows.push({ tex: `= ${formula}`, op: words.compound.formula });
      rows.push({ tex: `= ${sdTexP(p1[0])} \\cdot ${sdTexP(p1[1])} ${sign2 > 0 ? "+" : "-"} ${sdTexP(p2[0])} \\cdot ${sdTexP(p2[1])}`, op: words.compound.values });
      res = p1[0].mul(p1[1]).add(p2[0].mul(p2[1]).scale(fr(sign2)));
      ctx.used.add(base === "sin" ? "sinSum" : "cosSum");
    } else {
      const [ta, tb] = [trigD("tan", a), trigD("tan", b)];
      if (ta === false || ta === null || tb === false || tb === null) throw new Error(words.compound.noTan);
      rows.push({ tex: `= \\frac{\\tan ${A(a)} ${op} \\tan ${A(b)}}{1 ${sg > 0 ? "-" : "+"} \\tan ${A(a)}\\tan ${A(b)}}`, op: words.compound.formula });
      const top = ta.add(tb.scale(fr(sg)));
      const bot = Sd.ONE.sub(ta.mul(tb).scale(fr(sg)));
      rows.push({ tex: `= \\frac{${ta.tex()} ${op} ${tb.tex()}}{1 ${sg > 0 ? "-" : "+"} ${ta.mul(tb).tex()}}`, op: words.compound.values });
      // Clear the small fractions, then multiply by the conjugate of the bottom.
      const L = [...top.t.values(), ...bot.t.values()].reduce((acc, q) => lcmN(acc, q.d), 1);
      const [T, Bt] = [top.scale(fr(L)), bot.scale(fr(L))];
      if (L > 1) rows.push({ tex: `= \\frac{${T.tex()}}{${Bt.tex()}}`, op: fill(words.compound.timesBoth, { k: L }) });
      if (!Bt.rat() && Bt.t.size === 2) {
        const conj = new Sd(new Map([...Bt.t].map(([r, q]) => [r, r === 1 ? q : q.neg()])));
        rows.push({ tex: `= \\frac{\\left(${T.tex()}\\right)\\left(${conj.tex()}\\right)}{\\left(${Bt.tex()}\\right)\\left(${conj.tex()}\\right)} = \\frac{${T.mul(conj).tex()}}{${Bt.mul(conj).tex()}}`, op: words.compound.rationalise });
      }
      res = top.div(bot);
      rows.push({ tex: `= ${res.tex()}`, op: words.compound.simplify });
      ctx.used.add("tanSum");
    }
    value = recip ? res.inv() : res;
    if (base !== "tan") rows.push({ tex: `= ${wrapV(res.tex())}`, op: words.compound.simplify });
    if (recip) rows.push({ tex: `= ${value.tex()}`, op: words.compound.rationalise });
    caps.push({ text: fill(words.compound.split, { a: plainAngle(A(deg)), b: plainAngle(A(a)), c: plainAngle(A(b)), s: op === "+" ? "+" : "−" }) });
    num = value.val();
    valueTex = value.tex();
  } else if (isMult(deg, 7.5) && !isMult(deg, 15)) {
    // Half of a standard angle: cos 2A = 1 − 2sin²A = 2cos²A − 1.
    const d2 = 2 * deg;
    const c2 = trigD("cos", d2) as Sd;
    const s2 = trigD("sin", d2) as Sd;
    const q = mod(deg, 360);
    const sgnS = q < 180 ? 1 : -1;
    const sgnC = q < 90 || q > 270 ? 1 : -1;
    ctx.used.add("half");
    if (base === "tan") {
      rows.push({ tex: `\\tan A = \\frac{\\sin 2A}{1 + \\cos 2A}, \\quad A = ${A(deg)}`, op: words.compound.half });
      const res = s2.div(Sd.ONE.add(c2));
      rows.push({ tex: `\\tan ${A(deg)} = \\frac{${s2.tex()}}{1 + ${sdTexP(c2)}} = ${res.tex()}`, op: words.compound.values });
      value = recip ? res.inv() : res;
      if (recip) rows.push({ tex: `\\cot ${A(deg)} = ${value.tex()}`, op: words.compound.rationalise });
      num = value.val();
      valueTex = value.tex();
    } else {
      const sg = base === "sin" ? sgnS : sgnC;
      const inner = base === "sin" ? Sd.ONE.sub(c2).scale(fr(1, 2)) : Sd.ONE.add(c2).scale(fr(1, 2));
      rows.push({
        tex: base === "sin" ? `\\cos 2A = 1 - 2\\sin^2 A \\;\\Rightarrow\\; \\sin A = \\pm\\sqrt{\\frac{1 - \\cos 2A}{2}}` : `\\cos 2A = 2\\cos^2 A - 1 \\;\\Rightarrow\\; \\cos A = \\pm\\sqrt{\\frac{1 + \\cos 2A}{2}}`,
        op: words.compound.half,
      });
      rows.push({ tex: `${name(base)} ${A(deg)} = ${sg < 0 ? "-" : ""}\\sqrt{\\frac{1 ${base === "sin" ? "-" : "+"} ${sdTexP(c2)}}{2}}`, op: fill(words.compound.sign, { s: sg > 0 ? "+" : "−" }) });
      const root = nestedRoot(inner);
      const t = `${sg < 0 ? "-" : ""}${root.tex}`;
      rows.push({ tex: `= ${sg < 0 ? "-" : ""}\\sqrt{${inner.tex()}} = ${t}`, op: words.compound.simplify });
      num = sg * Math.sqrt(inner.val());
      valueTex = t;
      if (recip) {
        num = 1 / num;
        valueTex = `\\frac{1}{${t}}`;
        rows.push({ tex: `${head} = ${valueTex}`, op: words.compound.recip });
      }
    }
  } else if (isMult(deg, 15)) {
    const v = trigD(f, deg);
    if (v === false) throw new Error(fill(words.noValue, { f, a: plainAngle(A(deg)) }));
    value = v as Sd;
    num = value.val();
    valueTex = value.tex();
    rows.push({ tex: `${head} = ${valueTex}`, op: words.compound.standard });
  } else {
    const v = evalE(tidy(fn(f, N(ratOf(rad(deg), 1000) ?? fr(0)))), 0);
    void v;
    throw new Error(fill(words.compound.notExact, { v: nt(evalAt(at(ctx, f, 0, deg), ctx, 0), 4) }));
  }
  rows.push({ tex: `${head} = ${valueTex} \\approx ${tn(num, 4)}`, op: "", color: C.green });
  const pic = circlePanel(deg, unit);
  return built(head, rows, [pic], [...formulaCaption(ctx), { text: words.compound.circleCap }], { value: num });
}
/** √(Y/w) written as (g/w)·√(Y·w/g²) with whole numbers inside. */
function nestedRoot(x: Sd): { tex: string } {
  const r = x.sqrt();
  if (r) return { tex: r.tex() };
  const L = [...x.t.values()].reduce((acc, q) => lcmN(acc, q.d), 1);
  const Yw = x.scale(fr(L * L)); // = Y·w with w = L
  const ints = [...Yw.t.values()].map((q) => Math.abs(q.n));
  let g = 1;
  for (let k = 2; k * k <= Math.min(...ints); k++) if (ints.every((n) => n % (k * k) === 0)) g = k;
  const inner = Yw.scale(fr(1, g * g));
  const coef = fr(g, L);
  const body = `\\sqrt{${inner.tex()}}`;
  return { tex: coef.isOne() ? body : coef.n === 1 ? `\\frac{${body}}{${coef.d}}` : `\\frac{${coef.n}${body}}{${coef.d}}` };
}
/** The unit circle with the angle and the point (cos, sin). */
function circlePanel(deg: number, unit: Unit): { svg: string; h: number } {
  const h = 230;
  const [cx, cy, R] = [W / 2, 115, 90];
  const t = rad(deg);
  const [px, py] = [cx + R * Math.cos(t), cy - R * Math.sin(t)];
  const sweep = mod(deg, 360);
  const large = sweep > 180 ? 1 : 0;
  const ar = 26;
  const arc = sweep < 1e-9 ? "" : `<path d="M ${cx + ar} ${cy} A ${ar} ${ar} 0 ${large} 0 ${r2(cx + ar * Math.cos(t))} ${r2(cy - ar * Math.sin(t))}" fill="none" stroke="${C.orange}" stroke-width="2"/>`;
  const svg =
    `<line x1="${cx - R - 20}" y1="${cy}" x2="${cx + R + 20}" y2="${cy}" stroke="#495057"/><line x1="${cx}" y1="${cy - R - 15}" x2="${cx}" y2="${cy + R + 15}" stroke="#495057"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#adb5bd" stroke-width="1.5"/>` +
    arc +
    `<line x1="${cx}" y1="${cy}" x2="${r2(px)}" y2="${r2(py)}" stroke="${C.purple}" stroke-width="2.4"/>` +
    `<line x1="${r2(px)}" y1="${r2(py)}" x2="${r2(px)}" y2="${cy}" stroke="${C.red}" stroke-width="2" stroke-dasharray="5 4"/>` +
    `<line x1="${cx}" y1="${cy}" x2="${r2(px)}" y2="${cy}" stroke="${C.blue}" stroke-width="3"/>` +
    dot(px, py, C.purple, 4.5) +
    lbl(px + (Math.cos(t) >= 0 ? 8 : -8), py - 8, `(cos, sin)`, C.purple, Math.cos(t) >= 0 ? "start" : "end", 12, false) +
    lbl(cx + ar + 6, cy - 6, angleTex(deg, unit, true), C.orange, "start", 12, false);
  return { svg, h };
}

type Given = { name: string; f: "sin" | "cos" | "tan"; v: Sd; quad: number; assumed: boolean; s: Sd; c: Sd; t: Sd | null };
function renderRatios(src: string): Built {
  const parts = src.split(/[;,](?!\d)/).map((p) => p.trim()).filter(Boolean);
  const givens: Given[] = [];
  const quads = new Map<string, number>();
  const queries: { f: "sin" | "cos" | "tan"; a: string; op: "" | "+" | "-" | "2"; b: string }[] = [];
  const rows: TexLine[] = [];
  const caps: Caption[] = [];
  const isAcute = new RegExp(`\\b([A-Z])\\b.*\\b(acute|${words.compound.acute})`, "i");
  const isObtuse = new RegExp(`\\b([A-Z])\\b.*\\b(obtuse|${words.compound.obtuse})`, "i");
  for (const raw of parts) {
    const p = raw.replace(new RegExp(`^(find|${words.compound.find})\\s*:?\\s*`, "i"), "");
    let m = /^(sin|cos|tan)\s*([A-Z])\s*=\s*(.+)$/.exec(p);
    if (m) {
      const e = tidy(parseE(m[3].replace(/√(\d+)/g, "sqrt($1)")));
      const v = sdOf(e);
      if (!v) throw new Error(words.compound.tooHard);
      givens.push({ name: m[2], f: m[1] as Given["f"], v, quad: 0, assumed: false, s: Sd.ZERO, c: Sd.ZERO, t: null });
      continue;
    }
    if ((m = isAcute.exec(p))) {
      quads.set(m[1], 1);
      continue;
    }
    if ((m = isObtuse.exec(p))) {
      quads.set(m[1], 2);
      continue;
    }
    m = /(-?[\d.]+)°?\s*(<|≤|<=)\s*([A-Z])\s*(<|≤|<=)\s*(-?[\d.]+)°?/.exec(p);
    if (m) {
      const mid = mod((Number(m[1]) + Number(m[5])) / 2, 360);
      quads.set(m[3], Math.floor(mid / 90) + 1);
      continue;
    }
    m = /([A-Z]).*(?:quadrant|Q)\s*(\d)/i.exec(p);
    if (m) {
      quads.set(m[1], Number(m[2]));
      continue;
    }
    const qs = [...p.matchAll(/(sin|cos|tan)\s*\(?\s*(2\s*[A-Z]|[A-Z])\s*(?:([+\-−])\s*([A-Z]))?\s*\)?/g)];
    if (qs.length) {
      for (const q of qs) {
        const two = q[2].replace(/\s/g, "");
        if (two.startsWith("2")) queries.push({ f: q[1] as Given["f"], a: two.slice(1), op: "2", b: "" });
        else queries.push({ f: q[1] as Given["f"], a: two, op: q[3] ? (q[3] === "+" ? "+" : "-") : "", b: q[4] ?? "" });
      }
      continue;
    }
    throw new Error(fill(words.bad, { s: raw }));
  }
  if (!givens.length) throw new Error(words.need.compound);
  for (const g of givens) {
    let q = quads.get(g.name) ?? 0;
    const v = g.v.val();
    if (!q) {
      g.assumed = true;
      q = v >= 0 ? 1 : g.f === "sin" ? 4 : 2;
    }
    g.quad = q;
    const sPos = q === 1 || q === 2;
    const cPos = q === 1 || q === 4;
    const okSign = g.f === "sin" ? (v >= 0) === sPos || v === 0 : g.f === "cos" ? (v >= 0) === cPos || v === 0 : (v >= 0) === (sPos === cPos) || v === 0;
    if (!okSign) throw new Error(fill(words.compound.wrongQuad, { f: g.f, a: g.name, q }));
    const rootOf = (x: Sd) => {
      const r = x.sqrt();
      if (!r) throw new Error(words.compound.tooHard);
      return r;
    };
    const fName = `\\${g.f} ${g.name}`;
    const quadTex = `\\text{${fill(words.compound.quadrant, { q })}}`;
    rows.push({ tex: `${fName} = ${g.v.tex()}, \\quad ${quadTex}`, op: g.assumed ? words.compound.assume : words.compound.given });
    if (g.f === "sin" || g.f === "cos") {
      if (Math.abs(v) > 1) throw new Error(fill(words.compound.wrongQuad, { f: g.f, a: g.name, q }));
      const other = rootOf(Sd.ONE.sub(g.v.mul(g.v)));
      const o = (g.f === "sin" ? cPos : sPos) ? other : other.neg();
      [g.s, g.c] = g.f === "sin" ? [g.v, o] : [o, g.v];
      const of = g.f === "sin" ? "cos" : "sin";
      rows.push({ tex: `\\${of} ${g.name} = ${(g.f === "sin" ? cPos : sPos) ? "" : "-"}\\sqrt{1 - ${sqTexP(g.v)}^2} = ${o.tex()}`, op: words.compound.other });
    } else {
      // 1 + tan² = sec²
      const sec = rootOf(Sd.ONE.add(g.v.mul(g.v)));
      g.c = (cPos ? sec : sec.neg()).inv();
      g.s = g.v.mul(g.c);
      rows.push({ tex: `\\cos ${g.name} = ${cPos ? "" : "-"}\\frac{1}{\\sqrt{1 + ${sqTexP(g.v)}^2}} = ${g.c.tex()}, \\quad \\sin ${g.name} = \\tan ${g.name}\\cos ${g.name} = ${g.s.tex()}`, op: words.compound.other });
    }
    g.t = g.c.isZero() ? null : g.s.div(g.c);
    if (g.f !== "tan") rows.push({ tex: `\\tan ${g.name} = \\frac{\\sin ${g.name}}{\\cos ${g.name}} = ${g.t ? g.t.tex() : "—"}`, op: words.compound.tanRatio });
  }
  const names = givens.map((g) => g.name);
  if (!queries.length) {
    if (givens.length >= 2) for (const f of ["sin", "cos", "tan"] as const) queries.push({ f, a: names[0], op: "+", b: names[1] });
    else for (const f of ["sin", "cos", "tan"] as const) queries.push({ f, a: names[0], op: "2", b: "" });
  }
  const G = (n: string) => {
    const g = givens.find((g) => g.name === n);
    if (!g) throw new Error(fill(words.bad, { s: n }));
    return g;
  };
  const ctx = newCtx("deg", false);
  const values: number[] = [];
  for (const q of queries) {
    const A = G(q.a);
    const a = q.a;
    let formula: string;
    let subst: string;
    let res: Sd | null;
    if (q.op === "2") {
      if (q.f === "sin") {
        formula = `\\sin 2${a} = 2\\sin ${a}\\cos ${a}`;
        subst = `2 \\cdot ${sdTexP(A.s)} \\cdot ${sdTexP(A.c)}`;
        res = A.s.mul(A.c).scale(fr(2));
        ctx.used.add("sin2");
      } else if (q.f === "cos") {
        formula = `\\cos 2${a} = \\cos^2 ${a} - \\sin^2 ${a}`;
        subst = `${sqTexP(A.c)}^2 - ${sqTexP(A.s)}^2`;
        res = A.c.mul(A.c).sub(A.s.mul(A.s));
        ctx.used.add("cos2");
      } else {
        if (!A.t) throw new Error(words.compound.noTan);
        formula = `\\tan 2${a} = \\frac{2\\tan ${a}}{1 - \\tan^2 ${a}}`;
        subst = `\\frac{2 \\cdot ${sdTexP(A.t)}}{1 - ${sqTexP(A.t)}^2}`;
        const den = Sd.ONE.sub(A.t.mul(A.t));
        res = den.isZero() ? null : A.t.scale(fr(2)).div(den);
        ctx.used.add("tan2");
      }
    } else {
      const Bq = q.op ? G(q.b) : A;
      const b = q.b;
      const o = q.op === "+" ? "+" : "-";
      const no = q.op === "+" ? "-" : "+";
      const sg = q.op === "+" ? 1 : -1;
      if (!q.op) {
        res = q.f === "sin" ? A.s : q.f === "cos" ? A.c : A.t;
        rows.push({ tex: `\\${q.f} ${a} = ${res ? res.tex() : "—"}`, op: "", color: C.green });
        values.push(res ? res.val() : NaN);
        continue;
      }
      if (q.f === "sin") {
        formula = `\\sin(${a} ${o} ${b}) = \\sin ${a}\\cos ${b} ${o} \\cos ${a}\\sin ${b}`;
        subst = `${sdTexP(A.s)} \\cdot ${sdTexP(Bq.c)} ${o} ${sdTexP(A.c)} \\cdot ${sdTexP(Bq.s)}`;
        res = A.s.mul(Bq.c).add(A.c.mul(Bq.s).scale(fr(sg)));
        ctx.used.add("sinSum");
      } else if (q.f === "cos") {
        formula = `\\cos(${a} ${o} ${b}) = \\cos ${a}\\cos ${b} ${no} \\sin ${a}\\sin ${b}`;
        subst = `${sdTexP(A.c)} \\cdot ${sdTexP(Bq.c)} ${no} ${sdTexP(A.s)} \\cdot ${sdTexP(Bq.s)}`;
        res = A.c.mul(Bq.c).sub(A.s.mul(Bq.s).scale(fr(sg)));
        ctx.used.add("cosSum");
      } else {
        if (!A.t || !Bq.t) throw new Error(words.compound.noTan);
        formula = `\\tan(${a} ${o} ${b}) = \\frac{\\tan ${a} ${o} \\tan ${b}}{1 ${no} \\tan ${a}\\tan ${b}}`;
        subst = `\\frac{${A.t.tex()} ${o} ${sdTexP(Bq.t)}}{1 ${no} ${sdTexP(A.t)} \\cdot ${sdTexP(Bq.t)}}`;
        const den = Sd.ONE.sub(A.t.mul(Bq.t).scale(fr(sg)));
        res = den.isZero() ? null : A.t.add(Bq.t.scale(fr(sg))).div(den);
        ctx.used.add("tanSum");
      }
    }
    rows.push({ tex: formula, op: q.op === "2" ? words.steps.double : words.compound.formula });
    rows.push({ tex: `= ${subst} = ${res ? res.tex() : "\\text{—}"}`, op: res ? words.compound.values : words.compound.noTan, color: C.green });
    values.push(res ? res.val() : NaN);
  }
  const pics = givens.slice(0, 2).map((g) => ({ g, svg: quadPanel(g) }));
  const pic = { svg: pics.map((p, i) => `<g transform="translate(${pics.length === 1 ? W / 4 : i * (W / 2)} 0)">${p.svg}</g>`).join(""), h: 200 };
  const header = givens.map((g) => `\\${g.f} ${g.name} = ${g.v.tex()}`).join(", \\quad ");
  return built(header, rows, [pic], [...formulaCaption(ctx), ...givens.filter((g) => g.assumed).map((g) => ({ text: fill(words.compound.assume + " ({a}: {q})", { a: g.name, q: g.quad }), color: C.orange }))], { values });
}
/** The angle in its quadrant with the triangle cos (across) and sin (up). */
function quadPanel(g: Given): string {
  const [cx, cy, R] = [W / 4, 100, 72];
  const [c, s] = [g.c.val(), g.s.val()];
  const [px, py] = [cx + R * c, cy - R * s];
  const t = Math.atan2(s, c);
  const sweep = mod((t * 180) / Math.PI, 360);
  const ar = 20;
  const arc = `<path d="M ${cx + ar} ${cy} A ${ar} ${ar} 0 ${sweep > 180 ? 1 : 0} 0 ${r2(cx + ar * Math.cos(t))} ${r2(cy - ar * Math.sin(t))}" fill="none" stroke="${C.orange}" stroke-width="2"/>`;
  return (
    `<line x1="${cx - R - 14}" y1="${cy}" x2="${cx + R + 14}" y2="${cy}" stroke="#495057"/><line x1="${cx}" y1="${cy - R - 10}" x2="${cx}" y2="${cy + R + 10}" stroke="#495057"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#dee2e6"/>` +
    arc +
    `<line x1="${cx}" y1="${cy}" x2="${r2(px)}" y2="${r2(py)}" stroke="${C.purple}" stroke-width="2.4"/>` +
    `<line x1="${r2(px)}" y1="${r2(py)}" x2="${r2(px)}" y2="${cy}" stroke="${C.red}" stroke-width="2" stroke-dasharray="5 4"/>` +
    `<line x1="${cx}" y1="${cy}" x2="${r2(px)}" y2="${cy}" stroke="${C.blue}" stroke-width="3"/>` +
    dot(px, py, C.purple, 4) +
    lbl(cx + ar + 4, cy + (s >= 0 ? 16 : -6), g.name, C.orange, "start", 13) +
    lbl((cx + px) / 2, cy + (s >= 0 ? 16 : -8), `cos ${g.name} = ${g.c.plain()}`, C.blue, "middle", 12, false) +
    lbl(px + (c >= 0 ? 6 : -6), (cy + py) / 2, `sin ${g.name} = ${g.s.plain()}`, C.red, c >= 0 ? "start" : "end", 12, false)
  );
}

function renderExpand(src: string): Built {
  const { ctx, es } = setup([src]);
  const e0 = es[0];
  const t0 = texE(e0);
  type Out = { rows: TexLine[]; score: number; fs: Formula[] };
  let best: Out | null = null;
  for (const choice of [0, 1, 2]) {
    const { es: rw, steps } = rewriteAll([e0], ctx, choice, true);
    const fs: Formula[] = steps.flatMap((s) => s.fs);
    const rows: TexLine[] = [{ tex: t0, op: "" }];
    let last = t0;
    for (const s of steps) {
      const t = texE(s.es[0]);
      if (t !== last) rows.push({ tex: `= ${t}`, op: s.op });
      last = t;
    }
    const atoms = atomsOf(rw[0], ctx);
    let score = rows.length;
    const nested = (u: E): boolean =>
      u.k === "add" ? u.ts.some(nested) : u.k === "mul" ? u.fs.some((f) => f.k === "add" || nested(f)) : u.k === "pow" ? u.b.k === "add" || (isNum(u.e) && u.e.v.isNeg()) || nested(u.b) : false;
    const uniE = atoms.every((a) => a.f === "sin") || atoms.every((a) => a.f === "cos");
    if (!atoms.every((a) => a.f === "tan") && (nested(rw[0]) || !uniE)) {
      const r = toRat(rw[0], ctx);
      const nm = baseNm(ctx);
      let pick: { tex: string; op: string; score: number } | null = null;
      for (const v of ["orig", "redC", "redS"] as Variant[]) {
        const n2 = variant(r.n, v);
        const c = cancel(n2, prod(r.d));
        const t = ratTex(c.post, nm);
        const uni = (c.post.n.degC === 0 || c.post.n.degS === 0) && !c.post.d.length ? 0 : 1;
        const sc = uni * 10 + c.post.n.ts.length;
        if (!pick || sc < pick.score) pick = { tex: t, op: v === "orig" ? words.steps.simplify : fill(words.steps.pyth[v], { a: nm.parg }), score: sc };
      }
      if (pick!.tex !== last && (nested(rw[0]) || pick!.score < 10)) {
        rows.push({ tex: `= ${pick!.tex}`, op: pick!.op });
        if (pick!.op !== words.steps.simplify) fs.push("pyth");
      }
      score = pick!.score * 2 + rows.length;
    }
    if (!best || score < best.score) best = { rows, score, fs };
  }
  const rows = best!.rows;
  rows[rows.length - 1] = { ...rows[rows.length - 1], color: C.green };
  const span = 360 * ctx.m;
  const f = (x: number) => evalAt(e0, ctx, x);
  const g = graph("idx", [{ f, color: C.blue, width: 2.6 }], -span, span, ctx.unit, 200);
  return built(t0, rows, [g], [...formulaCaption(best!.fs), { text: words.compound.expandCap }]);
}

// ---------- entry ----------

export function renderIdentities(spec: IdSpec, w: IdWords): RenderedSvg {
  return finish(buildIdentities(spec, w));
}
export function buildIdentities(spec: IdSpec, w: IdWords): Built {
  words = w;
  exprMessages({ bad: w.bad, onlyX: w.onlyX, tooBig: w.tooBig });
  if (!spec.src.trim()) throw new Error(w.need[spec.topic]);
  switch (spec.topic) {
    case "compound":
      return renderCompound(spec.src);
    case "rform":
      return renderRForm(spec.src);
    case "prove":
      return renderProve(spec.src);
    case "equation":
      return renderEquation(spec.src);
  }
}

const S = (topic: IdTopic, src: string): IdSpec => ({ topic, src });
export const ID_PRESETS: { [K in IdTopic]: { label: string; spec: IdSpec }[] } = {
  compound: [
    { label: "sin 75°", spec: S("compound", "sin 75°") },
    { label: "tan 15°", spec: S("compound", "tan 15°") },
    { label: "cos(7π/12)", spec: S("compound", "cos(7pi/12)") },
    { label: "cos 22.5°", spec: S("compound", "cos 22.5°") },
    { label: "sin A = 3/5, cos B = −5/13", spec: S("compound", "sin A = 3/5, A acute; cos B = -5/13, B obtuse") },
    { label: "tan A = 2: sin 2A, cos 2A", spec: S("compound", "tan A = 2, A acute; sin 2A, cos 2A, tan 2A") },
    { label: "sin 3x", spec: S("compound", "sin 3x") },
    { label: "cos(x + 60°)", spec: S("compound", "cos(x + 60°)") },
  ],
  rform: [
    { label: "3 sin x + 4 cos x", spec: S("rform", "3 sin x + 4 cos x") },
    { label: "sin x − √3 cos x", spec: S("rform", "sin x - sqrt(3) cos x") },
    { label: "5 cos x − 12 sin x, R cos(x + α)", spec: S("rform", "5 cos x - 12 sin x; R cos(x + a)") },
    { label: "3 sin x + 4 cos x = 2", spec: S("rform", "3 sin x + 4 cos x = 2, 0 ≤ x < 360") },
    { label: "√3 sin 2x + cos 2x", spec: S("rform", "sqrt(3) sin 2x + cos 2x") },
  ],
  prove: [
    { label: "(1 − cos 2x)/sin 2x ≡ tan x", spec: S("prove", "(1 - cos 2x)/sin 2x = tan x") },
    { label: "cos x/(1 − sin x) + cos x/(1 + sin x)", spec: S("prove", "cos x/(1 - sin x) + cos x/(1 + sin x) = 2 sec x") },
    { label: "1 + tan²x ≡ sec²x", spec: S("prove", "1 + tan^2 x = sec^2 x") },
    { label: "sin 3x ≡ 3 sin x − 4 sin³x", spec: S("prove", "sin 3x = 3 sin x - 4 sin^3 x") },
    { label: "tan(x + 45°)", spec: S("prove", "tan(x + 45°) = (1 + tan x)/(1 - tan x)") },
    { label: "(sin x + sin 2x)/(1 + cos x + cos 2x)", spec: S("prove", "(sin x + sin 2x)/(1 + cos x + cos 2x) = tan x") },
    { label: "cosec x − sin x ≡ cos x cot x", spec: S("prove", "cosec x - sin x = cos x cot x") },
  ],
  equation: [
    { label: "2cos²x + 3 sin x = 3", spec: S("equation", "2cos^2 x + 3 sin x = 3, 0 ≤ x < 360") },
    { label: "sin 2x = cos x", spec: S("equation", "sin 2x = cos x, 0 ≤ x ≤ 360") },
    { label: "cos 2x = sin x", spec: S("equation", "cos 2x = sin x, 0 ≤ x < 2pi") },
    { label: "3 tan²x − 2 sec x = 2", spec: S("equation", "3 tan^2 x - 2 sec x = 2, 0 ≤ x < 360") },
    { label: "sin(2x − 30°) = 1/2", spec: S("equation", "sin(2x - 30°) = 1/2, 0 ≤ x < 360") },
    { label: "sin x + √3 cos x = 1", spec: S("equation", "sin x + sqrt(3) cos x = 1, 0 ≤ x < 360") },
    { label: "2 sin²x = sin x cos x", spec: S("equation", "2 sin^2 x = sin x cos x, -180 ≤ x ≤ 180") },
  ],
};
