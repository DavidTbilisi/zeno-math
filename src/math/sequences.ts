// Sequences and series, exactly: the rule behind a list of terms (a difference table for linear, quadratic and
// cubic rules, ratios for geometric ones, recurrences), arithmetic and geometric sequences from any two facts (the nth
// term, sums, sums to infinity, which term is a value, the first term or sum past a bound), sums in Σ notation (the
// standard results for Σk, Σk², Σk³, …, geometric parts, telescoping fractions, series written out with dots) and
// recurrences (fixed points, closed forms of linear ones, cobweb diagrams, the characteristic equation).
// Every number is a fraction while it stays small enough; the pictures show the terms and the partial sums.
import { axes, C, compose, curve, dot, esc, fill, FONT, lbl, makeFrame, nt, r2, texLines, tn, W, type Caption, type TexLine } from "./chart";
import { derive } from "./derive";
import { evalE, exprMessages, has, N, parseE, qsNum, qsPlain, qsTex, realRoots, rootFrac, simp, substitute, tex, toPoly, V, type E, type QS } from "./expr";
import { Frac } from "./fraction";
import type { RenderedSvg } from "./latex";

export type SeqTopic = "pattern" | "arith" | "geom" | "sigma" | "recur";
export const SEQ_TOPICS: SeqTopic[] = ["pattern", "arith", "geom", "sigma", "recur"];
export type SeqSpec = { topic: SeqTopic; src: string };

export type SeqWords = {
  bad: string;
  tooBig: string;
  onlyVar: string;
  zeroDiv: string;
  need: Record<SeqTopic, string>;
  few: string;
  conflict: string;
  noSolve: string;
  terms: string;
  term: string;
  isTerm: string;
  notTerm: string;
  everyTerm: string;
  never: string;
  firstU: string;
  firstS: string;
  sumIs: string;
  check: string;
  pattern: {
    linear: string;
    zeroTerm: string;
    quadA: string;
    quadRest: string;
    newton: string;
    expand: string;
    geom: string;
    recur1: string;
    recur2: string;
    fib: string;
    none: string;
    next: string;
    constLevel: string;
    ratioCap: string;
  };
  arith: {
    d: string;
    notArith: string;
    eq: string;
    subtract: string;
    solve: string;
    back: string;
    nth: string;
    sum: string;
    sumFirstLast: string;
    which: string;
    first: string;
    firstSum: string;
    roots: string;
    gauss: string;
    count: string;
  };
  geom: {
    eq: string;
    r: string;
    notGeom: string;
    zero: string;
    divide: string;
    alt: string;
    a: string;
    inf: string;
    noInf: string;
    infCap: string;
    which: string;
    logs: string;
    first: string;
    firstSum: string;
    noRoot: string;
  };
  sigma: {
    notation: string;
    writtenArith: string;
    expand: string;
    split: string;
    shift: string;
    zeroTerm: string;
    standard: string;
    simplify: string;
    value: string;
    geo: string;
    geoSum: string;
    partial: string;
    cancel: string;
    left: string;
    limit: string;
    direct: string;
    diverges: string;
    noMethod: string;
    undefinedAt: string;
    written: string;
    picture: string;
    shown: string;
  };
  recur: {
    initial: string;
    step: string;
    arith: string;
    geom: string;
    fixed: string;
    shifted: string;
    closed: string;
    fixedEq: string;
    deriv: string;
    attract: string;
    repel: string;
    charEq: string;
    general: string;
    constants: string;
    complex: string;
    converge: string;
    diverge: string;
    cycle: string;
    chaos: string;
    constant: string;
    ratio: string;
    cobweb: string;
    neutral: string;
    undefinedTerm: string;
  };
};

let words: SeqWords;

// ---------- exact numbers that refuse to lose digits ----------

const F = (n: number, d = 1) => new Frac(n, d);
const ZERO = F(0);
const ONE = F(1);
class TooBig extends Error {}
const ok = (...xs: number[]) => xs.every((x) => Number.isSafeInteger(x));
function add(a: Frac, b: Frac): Frac {
  if (!ok(a.n * b.d, b.n * a.d, a.d * b.d, a.n * b.d + b.n * a.d)) throw new TooBig(words.tooBig);
  return a.add(b);
}
const sub = (a: Frac, b: Frac) => add(a, b.neg());
function mul(a: Frac, b: Frac): Frac {
  if (!ok(a.n * b.n, a.d * b.d)) throw new TooBig(words.tooBig);
  return a.mul(b);
}
function div(a: Frac, b: Frac): Frac {
  if (b.isZero()) throw new Error(words.zeroDiv);
  if (!ok(a.n * b.d, a.d * b.n)) throw new TooBig(words.tooBig);
  return a.div(b);
}
function pw(b: Frac, k: number): Frac {
  let r = ONE;
  for (let i = 0; i < Math.abs(k); i++) r = mul(r, b);
  return k < 0 ? div(ONE, r) : r;
}
/** The exact value, or null when the numbers get too large. */
function exact<T>(f: () => T): T | null {
  try {
    return f();
  } catch (e) {
    if (e instanceof TooBig) return null;
    throw e;
  }
}
const eq = (a: Frac, b: Frac) => a.n === b.n && a.d === b.d;
const fnum = (f: Frac) => f.toNumber();
const iabs = (f: Frac) => (f.isNeg() ? f.neg() : f);

/** Exact or approximate: a number is the fallback when fractions get too large. */
type Q = Frac | number;
const qnum = (q: Q) => (typeof q === "number" ? q : q.toNumber());
/** "= 3/4" or "≈ 1.2e15" for the end of a row. */
const qeq = (q: Q) => (typeof q === "number" ? `\\approx ${tn(q, 6)}` : `= ${q.tex()}`);
const qtex = (q: Q) => (typeof q === "number" ? tn(q, 6) : q.tex());
/** −3/4 for captions. */
const fp = (f: Frac) => `${f.n < 0 ? "−" : ""}${Math.abs(f.n)}${f.d === 1 ? "" : `/${f.d}`}`;
const qp = (q: Q) => (typeof q === "number" ? `≈ ${nt(q, 6)}` : `= ${fp(q)}`);
const qplain = (q: Q) => (typeof q === "number" ? nt(q, 6) : fp(q));
const par = (f: Frac) => f.texP();
/** A power base: 3, (−2), (1/2). */
const baseTex = (f: Frac) => (f.isInt() && !f.isNeg() ? f.tex() : `\\left(${f.tex()}\\right)`);
const SUBS = "₀₁₂₃₄₅₆₇₈₉";
const subs = (n: number | string) => String(n).replace(/\d/g, (d) => SUBS[Number(d)]).replace(/-/g, "₋");
const uName = (L: string, k: number | string) => `${L}${subs(k)}`;
const uTex = (L: string, k: number | string) => `${L}_{${k}}`;

/** A term with its sign for the middle of a sum: "+ 3(n − 1)", "− (n − 1)". */
function signed(c: Frac, body: string, first = false): string {
  const a = iabs(c);
  const t = a.isOne() && body ? body : `${a.tex()}${body}`;
  if (first) return c.isNeg() ? `-${t}` : t;
  return c.isNeg() ? ` - ${t}` : ` + ${t}`;
}

// ---------- polynomials (coefficients from the constant up) ----------

type P = Frac[];
function trim(p: P): P {
  let d = p.length - 1;
  while (d > 0 && p[d].isZero()) d--;
  return p.slice(0, d + 1);
}
const deg = (p: P) => trim(p).length - 1;
const padd = (a: P, b: P): P => trim(Array.from({ length: Math.max(a.length, b.length) }, (_, i) => add(a[i] ?? ZERO, b[i] ?? ZERO)));
const pscale = (a: P, k: Frac): P => trim(a.map((x) => mul(x, k)));
function pmul(a: P, b: P): P {
  const r = Array.from({ length: a.length + b.length - 1 }, () => ZERO);
  a.forEach((x, i) => b.forEach((y, j) => (r[i + j] = add(r[i + j], mul(x, y)))));
  return trim(r);
}
const pev = (p: P, x: Frac) => p.reduceRight((acc, c) => add(mul(acc, x), c), ZERO);
const pnum = (p: P, x: number) => p.reduceRight((acc, c) => acc * x + c.toNumber(), 0);

function polyTex(p: P, v = "n"): string {
  let out = "";
  for (let k = p.length - 1; k >= 0; k--) {
    const c = p[k];
    if (!c || c.isZero()) continue;
    const vv = k === 0 ? "" : k === 1 ? v : `${v}^{${k}}`;
    out += k === 0 ? (out ? (c.isNeg() ? ` - ${c.neg().tex()}` : ` + ${c.tex()}`) : c.tex()) : signed(c, vv, !out);
  }
  return out || "0";
}
const igcd = (a: number, b: number): number => (b ? igcd(b, a % b) : Math.abs(a));
function divisors(n: number): number[] {
  n = Math.abs(n);
  const out: number[] = [];
  for (let i = 1; i * i <= n && i <= 1e5; i++)
    if (n % i === 0) {
      out.push(i);
      if (i * i !== n) out.push(n / i);
    }
  return out.sort((a, b) => a - b);
}

/** K · ∏(b·v − a)^e · rest, with the rational roots a/b taken out. */
type Factored = { K: Frac; fs: { a: number; b: number; e: number }[]; rest: P | null };
function factorize(p0: P): Factored {
  let p = trim(p0);
  const lead = p[p.length - 1];
  p = p.map((c) => div(c, lead));
  let K = lead;
  const fs: Factored["fs"] = [];
  while (p.length > 1) {
    const L = p.reduce((acc, c) => (acc * c.d) / igcd(acc, c.d), 1);
    const ints = p.map((c) => c.mul(F(L)).n);
    let root: Frac | null = null;
    if (ints[0] === 0) root = ZERO;
    else
      outer: for (const a of divisors(ints[0]))
        for (const b of divisors(ints[ints.length - 1]))
          for (const s of [1, -1])
            if (pev(p, F(s * a, b)).isZero()) {
              root = F(s * a, b);
              break outer;
            }
    if (!root) break;
    const q: P = [];
    let carry = ZERO;
    for (let i = p.length - 1; i >= 1; i--) {
      carry = add(mul(carry, root), p[i]);
      q.unshift(carry);
    }
    p = q;
    const f = fs.find((x) => x.a === root.n && x.b === root.d);
    if (f) f.e++;
    else fs.push({ a: root.n, b: root.d, e: 1 });
    K = div(K, F(root.d));
  }
  let rest: P | null = null;
  if (p.length > 1) {
    const L = p.reduce((acc, c) => (acc * c.d) / igcd(acc, c.d), 1);
    const ints = p.map((c) => c.mul(F(L)).n);
    const g = ints.reduce((acc, c) => igcd(acc, c), 0) || 1;
    rest = ints.map((c) => F(c / g));
    K = mul(K, F(g, L));
  }
  // n first, then (n + 1), (n + 2), then (2n + 1), …
  fs.sort((x, y) => Number(y.a === 0) - Number(x.a === 0) || x.b - y.b || fnum(F(y.a, y.b)) - fnum(F(x.a, x.b)));
  return { K, fs, rest };
}
/** n(n + 1)(2n + 1)/6; with `at`, the factors as numbers: 20·21·41/6. */
function factorTex(p: P, v = "n", at?: number): string {
  if (deg(p) <= 0) return (p[0] ?? ZERO).tex();
  const { K, fs, rest } = factorize(p);
  // The factors must multiply back to p; if they ever don't, show p as it is.
  const back = fs.reduce<P>((acc, f) => Array.from({ length: f.e }, () => [F(-f.a), F(f.b)] as P).reduce(pmul, acc), pscale(rest ?? [ONE], K));
  if (deg(padd(back, pscale(p, F(-1)))) > 0 || !padd(back, pscale(p, F(-1)))[0].isZero()) return at === undefined ? polyTex(p, v) : String(pnum(p, at));
  const parts: string[] = [];
  const count = fs.reduce((s, f) => s + f.e, 0) + (rest ? 1 : 0);
  for (const f of fs) {
    const lin: P = [F(-f.a), F(f.b)];
    if (at !== undefined) {
      const val = f.b * at - f.a;
      for (let i = 0; i < f.e; i++) parts.push(val < 0 ? `(${val})` : String(val));
      continue;
    }
    const body = polyTex(lin, v);
    const simple = f.a === 0 && f.b === 1;
    const wrapped = simple || (count === 1 && K.isOne()) ? body : `\\left(${body}\\right)`;
    parts.push(f.e > 1 ? `${simple ? body : `\\left(${body}\\right)`}^{${f.e}}` : wrapped);
  }
  if (rest) {
    if (at !== undefined) {
      const val = pnum(rest, at);
      parts.push(val < 0 ? `(${val})` : String(val));
    } else parts.push(count === 1 && K.isOne() ? polyTex(rest, v) : `\\left(${polyTex(rest, v)}\\right)`);
  }
  const k = iabs(K);
  const join = at !== undefined ? " \\cdot " : "";
  const top = (k.n === 1 ? "" : `${k.n}${at !== undefined ? " \\cdot " : ""}`) + parts.join(join);
  return `${K.isNeg() ? "-" : ""}${k.d === 1 ? top : `\\frac{${top}}{${k.d}}`}`;
}

/** Through the points (x, y). */
function interp(xs: number[], ys: Frac[]): P {
  let res: P = [ZERO];
  xs.forEach((xi, i) => {
    let basis: P = [ONE];
    let den = ONE;
    xs.forEach((xj, j) => {
      if (j === i) return;
      basis = pmul(basis, [F(-xj), ONE]);
      den = mul(den, F(xi - xj));
    });
    res = padd(res, pscale(basis, div(ys[i], den)));
  });
  return res;
}
/** Σ_{k=1}^{n} k^d as a polynomial in n. */
const POWER_SUMS: P[] = [];
function powerSum(d: number): P {
  if (!POWER_SUMS[d]) {
    const xs = Array.from({ length: d + 2 }, (_, i) => i);
    let s = ZERO;
    const ys = xs.map((x) => (x === 0 ? ZERO : (s = add(s, pw(F(x), d)))));
    POWER_SUMS[d] = interp(xs, ys);
  }
  return POWER_SUMS[d];
}

// ---------- reading the input ----------

function normal(s: string): string {
  return s
    .replace(/[−–]/g, "-")
    .replace(/\.\.\.|⋯/g, "…")
    .replace(/>=/g, "≥")
    .replace(/<=/g, "≤")
    .replace(/\\infty|\binfinity\b|\binf\b/gi, "∞")
    .replace(/\s+/g, " ")
    .trim();
}

/** Items split at ; and new lines, and at commas between facts ("a = 3, d = 4"); a list of numbers stays one item. */
function itemsOf(src: string): string[] {
  const out: string[] = [];
  for (let part of src.split(/[;\n]+/)) {
    part = normal(part);
    if (!part) continue;
    // A decimal comma inside a fact: r = 0,5.
    if (/[=<>≤≥]/.test(part)) part = part.replace(/(\d),(\d)/g, "$1.$2");
    const chunks: string[] = [];
    let depth = 0;
    let cur = "";
    for (const ch of part) {
      if ("([{".includes(ch)) depth++;
      else if (")]}".includes(ch)) depth--;
      if (ch === "," && depth === 0) {
        chunks.push(cur.trim());
        cur = "";
      } else cur += ch;
    }
    chunks.push(cur.trim());
    let list: string[] = [];
    const flush = () => {
      if (list.length) out.push(list.join(", "));
      list = [];
    };
    for (const c of chunks) {
      if (!c) continue;
      if (/[=<>≤≥]/.test(c) || /^[a-zA-ZΣ∑]/.test(c)) {
        flush();
        out.push(c);
      } else list.push(c);
    }
    flush();
  }
  return out;
}

const bad = (s: string) => new Error(fill(words.bad, { s }));
/** A constant: 3, −1/2, 0.25, 2^10, (1/2)^3. */
function constE(e: E): Frac | null {
  switch (e.k) {
    case "num":
      return e.v;
    case "add": {
      let s = ZERO;
      for (const t of e.ts) {
        const v = constE(t);
        if (!v) return null;
        s = add(s, v);
      }
      return s;
    }
    case "mul": {
      let s = ONE;
      for (const t of e.fs) {
        const v = constE(t);
        if (!v) return null;
        s = mul(s, v);
      }
      return s;
    }
    case "pow": {
      const b = constE(e.b);
      const x = constE(e.e);
      if (!b || !x || !x.isInt() || Math.abs(x.n) > 200) return null;
      return pw(b, x.n);
    }
    default:
      return null;
  }
}
function numOf(s: string): Frac {
  const t = s.trim();
  const f = Frac.parse(t);
  if (f) return f;
  let e: E;
  try {
    e = parseE(t);
  } catch {
    throw bad(t);
  }
  const v = constE(e);
  if (!v) throw bad(t);
  return v;
}

/** u5, u_5, u_{5}, u(5), u[5], Sn, S_∞, a, d, r. */
type Ref = { letter: string; idx: number | "n" | "∞" | null };
function refOf(s: string): Ref | null {
  const m = /^([A-Za-z])\s*(?:_\s*)?(?:\{\s*([^{}]*?)\s*\}|\(\s*([^()]*?)\s*\)|\[\s*([^[\]]*?)\s*\]|(\d+|n|∞))?$/.exec(s.trim());
  if (!m) return null;
  const raw = m[2] ?? m[3] ?? m[4] ?? m[5];
  if (raw === undefined) return { letter: m[1], idx: null };
  if (raw === "n" || raw === "∞") return { letter: m[1], idx: raw };
  if (!/^\d+$/.test(raw)) return null;
  return { letter: m[1], idx: Number(raw) };
}

type Op = "=" | ">" | "<" | "≥" | "≤";
const OP_TEX: Record<Op, string> = { "=": "=", ">": ">", "<": "<", "≥": "\\ge", "≤": "\\le" };
const holds = (x: number, op: Op, v: number) => (op === "=" ? Math.abs(x - v) < 1e-9 * Math.max(1, Math.abs(v)) : op === ">" ? x > v : op === "<" ? x < v : op === "≥" ? x >= v : x <= v);
const flip = (op: Op): Op => (op === ">" ? "<" : op === "<" ? ">" : op === "≥" ? "≤" : op === "≤" ? "≥" : op);

type Query =
  | { k: "term"; n: number }
  | { k: "sum"; n: number }
  | { k: "inf" }
  | { k: "which"; v: Frac }
  | { k: "first"; of: "u" | "S"; op: Op; v: Frac };
type Facts = {
  letter: string;
  list: Frac[];
  last: Frac | null;
  a?: Frac;
  d?: Frac;
  r?: Frac;
  terms: { k: number; v: Frac }[];
  sums: { k: number; v: Frac }[];
  inf?: Frac;
  queries: Query[];
};

function listOf(item: string): { list: Frac[]; last: Frac | null; open: boolean } {
  const parts = item.split(",").map((p) => p.trim()).filter(Boolean);
  const dots = parts.indexOf("…");
  const list = (dots < 0 ? parts : parts.slice(0, dots)).map(numOf);
  const after = dots < 0 ? [] : parts.slice(dots + 1);
  if (after.length > 1 || after.includes("…")) throw bad(item);
  return { list, last: after.length ? numOf(after[0]) : null, open: dots >= 0 };
}

function factsOf(src: string, params: string[]): Facts {
  const f: Facts = { letter: "u", list: [], last: null, terms: [], sums: [], queries: [] };
  const termRef = (r: Ref | null) => !!r && r.idx !== null && r.letter !== "S" && !params.includes(r.letter);
  for (const item of itemsOf(src)) {
    const m = /^(.*?)\s*(=|>|<|≥|≤)\s*(.*)$/.exec(item);
    if (!m) {
      const r = refOf(item);
      if (r && r.letter === "S" && typeof r.idx === "number") f.queries.push({ k: "sum", n: r.idx });
      else if (r && r.letter === "S" && r.idx === "∞") f.queries.push({ k: "inf" });
      else if (termRef(r) && typeof r!.idx === "number") {
        f.letter = r!.letter;
        f.queries.push({ k: "term", n: r!.idx as number });
      } else if (!/^[a-zA-Z]/.test(item)) {
        const l = listOf(item);
        if (f.list.length) throw bad(item);
        [f.list, f.last] = [l.list, l.last];
      } else throw bad(item);
      continue;
    }
    const [, lhs, op, rhs] = m as unknown as [string, string, Op, string];
    if (!rhs) throw bad(item);
    if (!lhs) {
      if (op !== "=") throw bad(item);
      f.queries.push({ k: "which", v: numOf(rhs) });
      continue;
    }
    const r = refOf(lhs);
    if (!r) throw bad(item);
    const v = numOf(rhs);
    if (r.idx === null && params.includes(r.letter)) {
      if (op !== "=") throw bad(item);
      f[r.letter as "a" | "d" | "r"] = v;
    } else if (r.letter === "S") {
      if (r.idx === "∞" && op === "=") f.inf = v;
      else if (typeof r.idx === "number" && op === "=") f.sums.push({ k: r.idx, v });
      else if (r.idx === "n") f.queries.push({ k: "first", of: "S", op, v });
      else throw bad(item);
    } else if (termRef(r)) {
      f.letter = r.letter;
      if (typeof r.idx === "number" && op === "=") {
        if (r.idx < 1) throw bad(item);
        f.terms.push({ k: r.idx, v });
      } else if (r.idx === "n") f.queries.push(op === "=" ? { k: "which", v } : { k: "first", of: "u", op, v });
      else throw bad(item);
    } else throw bad(item);
  }
  for (const q of f.queries) if ((q.k === "term" || q.k === "sum") && (q.n < 1 || q.n > 100000)) throw bad(`${q.k === "sum" ? "S" : f.letter}${q.n}`);
  return f;
}

// ---------- pictures ----------

type Pic = { svg: string; h: number };

/** Terms (or partial sums) against n: bars or joined dots, with an optional limit line and the rule's curve. */
function panel(
  id: string, left: number, top: number, w: number, h: number, ns: number[], vs: number[],
  o: { title: string; color: string; bars?: boolean; limit?: { v: number; label: string }; fn?: (x: number) => number },
): string {
  const fin = vs.filter(Number.isFinite);
  let lo = Math.min(0, ...fin, o.limit?.v ?? 0);
  let hi = Math.max(0, ...fin, o.limit?.v ?? 0);
  if (hi - lo < 1e-9) (lo -= 1), (hi += 1);
  const pad = (hi - lo) * 0.1;
  const fr = makeFrame(id, left, top, w, h, [ns[0] - 0.7, ns[ns.length - 1] + 0.7], [lo - (lo < 0 ? pad : 0), hi + pad]);
  const below = lo < 0;
  const parts = [axes(fr, { integerX: true, xAtBottom: below })];
  if (below) parts.push(`<line x1="${fr.left}" y1="${r2(fr.sy(0))}" x2="${fr.right}" y2="${r2(fr.sy(0))}" stroke="#495057" stroke-width="1.2"/>`);
  if (o.fn) parts.push(curve(fr, o.fn, C.purple, 1.6, `stroke-dasharray="5 4" opacity="0.8"`, ns[0], ns[ns.length - 1], 400));
  if (o.limit) {
    const y = r2(fr.sy(o.limit.v));
    parts.push(`<line x1="${fr.left}" y1="${y}" x2="${fr.right}" y2="${y}" stroke="${C.green}" stroke-width="1.8" stroke-dasharray="7 4"/>`);
  }
  const bw = Math.max(2, Math.min(22, (0.62 * w) / ns.length));
  if (o.bars) {
    const y0 = fr.sy(0);
    ns.forEach((n, i) => {
      if (!Number.isFinite(vs[i])) return;
      const y = fr.sy(vs[i]);
      parts.push(`<rect x="${r2(fr.sx(n) - bw / 2)}" y="${r2(Math.min(y, y0))}" width="${r2(bw)}" height="${r2(Math.abs(y - y0))}" fill="${o.color}" opacity="0.8" clip-path="url(#${id})"/>`);
    });
  } else {
    const pts = ns.map((n, i) => (Number.isFinite(vs[i]) ? `${r2(fr.sx(n))},${r2(fr.sy(vs[i]))}` : "")).filter(Boolean);
    parts.push(`<polyline points="${pts.join(" ")}" fill="none" stroke="${o.color}" stroke-width="1.4" opacity="0.6" clip-path="url(#${id})"/>`);
    ns.forEach((n, i) => Number.isFinite(vs[i]) && parts.push(dot(fr.sx(n), fr.sy(vs[i]), o.color, ns.length > 30 ? 2.6 : 3.6)));
  }
  if (o.limit) parts.push(lbl(fr.right - 6, fr.sy(o.limit.v) + (fr.sy(o.limit.v) - fr.top < 24 ? 16 : -6), o.limit.label, C.green, "end"));
  parts.push(lbl(fr.left + 6, fr.top + 16, o.title, C.ink, "start", 14));
  return parts.join("");
}

/** Terms on the left, partial sums on the right. */
const SUB_LETTER: Record<string, string> = { n: "ₙ", k: "ₖ", r: "ᵣ", i: "ᵢ", j: "ⱼ", m: "ₘ", t: "ₜ", p: "ₚ", s: "ₛ", x: "ₓ" };
function twin(ns: number[], us: number[], ss: number[], o: { limit?: { v: number; label: string }; L: string; sub?: string; bars?: boolean }): Pic {
  const h = 230;
  const left = panel("seqU", 52, 8, 250, h, ns, us, { title: `${o.L}${o.sub ?? "ₙ"}`, color: C.blue, bars: o.bars ?? true });
  const right = panel("seqS", 372, 8, 250, h, ns, ss, { title: "Sₙ", color: C.orange, bars: o.bars ?? true, limit: o.limit });
  return { svg: left + right, h: h + 30 };
}

/** Two copies of an arithmetic sum, one upside down, filling an n × (first + last) rectangle. */
function gauss(us: number[], L: string): Pic {
  const n = us.length;
  const H = us[0] + us[n - 1];
  const h = 220;
  const fr = makeFrame("seqG", 52, 10, 470, h, [0.5, n + 0.5], [0, H * 1.04]);
  const parts = [axes(fr, { integerX: true, xAtBottom: true })];
  const bw = (fr.sx(1) - fr.sx(0)) * 0.94;
  us.forEach((u, i) => {
    const x = fr.sx(i + 1) - bw / 2;
    const back = us[n - 1 - i];
    parts.push(
      `<rect x="${r2(x)}" y="${r2(fr.sy(u))}" width="${r2(bw)}" height="${r2(fr.sy(0) - fr.sy(u))}" fill="${C.blue}" opacity="0.85"/>`,
      `<rect x="${r2(x)}" y="${r2(fr.sy(u + back))}" width="${r2(bw)}" height="${r2(fr.sy(u) - fr.sy(u + back))}" fill="${C.orange}" opacity="0.45"/>`,
    );
  });
  const [yt, yb] = [fr.sy(H), fr.sy(0)];
  const xr = fr.right + 14;
  parts.push(
    `<path d="M${xr - 6},${r2(yt)} H${xr} V${r2(yb)} H${xr - 6}" fill="none" stroke="${C.ink}" stroke-width="1.4"/>`,
    lbl(xr + 6, (yt + yb) / 2 - 4, `${L}₁ + ${uName(L, n)}`, C.ink, "start", 13),
    lbl(xr + 6, (yt + yb) / 2 + 14, `= ${nt(H)}`, C.ink, "start", 13, false),
  );
  return { svg: parts.join(""), h: h + 34 };
}

/** The difference table: terms on top, each row the differences of the row above; the constant row in green. */
function diffTable(levels: Frac[][], constant: number, ratios: Frac[] | null, L: string): Pic {
  const m = levels[0].length;
  const longest = Math.max(...levels.flat().map((f) => fp(f).length));
  const sx = Math.min(70, Math.max(longest * 8.5 + 14, 40), (W - 110) / Math.max(m - 0.5, 1));
  const x0 = 96;
  const rowH = 34;
  const top = ratios ? 52 : 24;
  const parts: string[] = [];
  const font = (s: string) => (s.length * 8.5 > sx - 6 ? Math.max(10, ((sx - 6) / s.length) * 1.6) : 15);
  const txt = (x: number, y: number, s: string, color: string, size = font(s), weight = 600) =>
    `<text x="${r2(x)}" y="${r2(y)}" ${FONT} font-size="${r2(size)}" font-weight="${weight}" fill="${color}" text-anchor="middle">${esc(s)}</text>`;
  const nY = ratios ? 14 : top - 4;
  for (let j = 0; j < m; j++) parts.push(txt(x0 + j * sx, nY, String(j + 1), C.grey, 11, 400));
  parts.push(`<text x="26" y="${nY}" ${FONT} font-size="11" font-style="italic" fill="${C.grey}">n</text>`);
  const colors = [C.ink, C.blue, C.orange, C.purple, C.red];
  levels.forEach((row, i) => {
    const y = top + 20 + i * rowH;
    const color = i === constant ? C.green : colors[i % colors.length];
    parts.push(`<text x="26" y="${y}" ${FONT} font-size="14" font-weight="700" fill="${color}">${i === 0 ? `${L}ₙ` : `Δ${i > 1 ? "²³⁴⁵⁶"[i - 2] : ""}`}</text>`);
    row.forEach((v, j) => {
      const x = x0 + (j + i / 2) * sx;
      parts.push(txt(x, y, fp(v), color));
      if (i > 0) {
        const [xa, xb] = [x0 + (j + (i - 1) / 2) * sx, x0 + (j + 1 + (i - 1) / 2) * sx];
        const ya = y - rowH + 6;
        parts.push(`<path d="M${r2(xa + 4)},${r2(ya)} L${r2(x)},${r2(y - 15)} L${r2(xb - 4)},${r2(ya)}" fill="none" stroke="#ced4da" stroke-width="1.1"/>`);
      }
    });
  });
  if (ratios) {
    const y = top;
    ratios.forEach((r, j) => {
      const [xa, xb] = [x0 + j * sx + 6, x0 + (j + 1) * sx - 6];
      parts.push(`<path d="M${r2(xa)},${y} Q${r2((xa + xb) / 2)},${y - 22} ${r2(xb)},${y}" fill="none" stroke="${C.green}" stroke-width="1.4"/>`);
      parts.push(txt((xa + xb) / 2, y - 16, `×${fp(r)}`, C.green, Math.min(13, font(`×${fp(r)}`))));
    });
  }
  return { svg: parts.join(""), h: top + 20 + (levels.length - 1) * rowH + 14 };
}

/** The cobweb: y = f(x), y = x and the path u₁ → u₂ → … bouncing between them. */
function cobweb(f: (x: number) => number, us: number[], fixed: number[], L: string): string {
  // While the terms stay in view: a diverging cobweb shows its first steps.
  const cap = 100 * Math.max(1, Math.abs(us[0]), ...fixed.map(Math.abs));
  const pts: number[] = [];
  for (const u of us.slice(0, 40)) {
    if (!Number.isFinite(u) || Math.abs(u) > cap) break;
    pts.push(u);
  }
  const keep = [...pts, ...fixed.filter((x) => Math.abs(x) < 1e6)];
  let lo = Math.min(...keep);
  let hi = Math.max(...keep);
  if (hi - lo < 1e-6) (lo -= 1), (hi += 1);
  const pad = (hi - lo) * 0.15;
  [lo, hi] = [lo - pad, hi + pad];
  const fr = makeFrame("seqC", 52, 8, 250, 230, [lo, hi], [lo, hi]);
  const parts = [axes(fr)];
  parts.push(curve(fr, (x) => x, C.grey, 1.4, `stroke-dasharray="5 4"`));
  parts.push(curve(fr, f, C.blue, 2.2));
  const path: string[] = [`M${r2(fr.sx(pts[0]))},${r2(fr.sy(pts[0]))}`];
  for (let i = 0; i + 1 < pts.length; i++) path.push(`L${r2(fr.sx(pts[i]))},${r2(fr.sy(pts[i + 1]))}`, `L${r2(fr.sx(pts[i + 1]))},${r2(fr.sy(pts[i + 1]))}`);
  parts.push(`<path d="${path.join(" ")}" fill="none" stroke="${C.orange}" stroke-width="1.5" clip-path="url(#seqC)"/>`);
  for (const x of fixed) if (x > lo && x < hi) parts.push(dot(fr.sx(x), fr.sy(x), C.green, 4.5));
  parts.push(dot(fr.sx(pts[0]), fr.sy(pts[0]), C.orange, 4));
  parts.push(lbl(fr.sx(pts[0]) + 6, fr.sy(pts[0]) + 16, `${L}₁`, C.orange));
  parts.push(lbl(fr.right - 6, fr.top + 16, "y = x", C.grey, "end", 12));
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
const listTex = (vs: Frac[], open = true) => vs.map((v) => v.tex()).join(", ") + (open ? ", \\ldots" : "");

// ---------- shared: the value of term n from a rule ----------

type Rule = {
  /** u_n exactly (a number when too large). */
  at: (n: number) => Q;
  /** u_n as a float, cheaply: for searching. */
  num: (n: number) => number;
  /** u_n = … in LaTeX, when there is a formula. */
  tex?: string;
  /** The formula as a polynomial in n. */
  poly?: P;
  /** For the picture. */
  fn?: (x: number) => number;
  /** What the row with the formula says. */
  op?: string;
};

/** u_n for n = from…to by repeating a step, exactly while possible. */
function iterate(first: Frac[], step: (prev: Frac[], n: number) => Frac, stepN: (prev: number[], n: number) => number, upto: number): Q[] {
  const out: Q[] = [...first];
  let exactOk = true;
  for (let n = first.length + 1; n <= upto; n++) {
    const k = first.length;
    if (exactOk) {
      const prev = out.slice(-k) as Frac[];
      const v = exact(() => step(prev, n));
      if (v && v.d <= 1e6 && Math.abs(v.n) < 1e15) {
        out.push(v);
        continue;
      }
      exactOk = false;
    }
    out.push(stepN(out.slice(-k).map(qnum), n));
  }
  return out;
}

/** "u₂₀ = 1201", "3 is term number 4", … for each question about a rule. */
function ruleQueries(f: Facts, rule: Rule, rows: TexLine[], caps: Caption[], L: string) {
  for (const q of f.queries) {
    if (q.k === "term") {
      const v = rule.at(q.n);
      const sub = rule.poly ? ` = ${polySub(rule.poly, q.n)}` : "";
      rows.push({ tex: `${uTex(L, q.n)}${sub} ${qeq(v)}`, op: fill(words.term, { u: uName(L, q.n) }), color: C.blue });
      caps.push({ text: `${uName(L, q.n)} ${qp(v)}` });
    } else if (q.k === "which") {
      const n = whichTerm(rule, q.v);
      if (rule.poly) {
        const p = padd(rule.poly, [q.v.neg()]);
        const all = realRoots(p);
        const pos = all.exact.filter((r) => qsNum(r) > 0);
        const shown = (pos.length ? pos : all.exact).map(qsTex);
        if (shown.length) rows.push({ tex: `${polyTex(rule.poly)} = ${q.v.tex()} \\;\\Rightarrow\\; n = ${shown.join(" \\text{ or } ")}`, op: words.arith.which });
      }
      caps.push(n > 0 ? { text: fill(words.isTerm, { v: fp(q.v), n, u: uName(L, n) }), color: C.green } : { text: fill(words.notTerm, { v: fp(q.v) }), color: C.red });
    } else if (q.k === "first") {
      const n = firstN(rule.num, q.op, fnum(q.v));
      caps.push(n > 0 ? { text: fill(words.firstU, { u: uName(L, n), op: q.op, v: fp(q.v), x: qplain(rule.at(n)) }), color: C.green } : { text: words.never, color: C.red });
    }
  }
}
/** 3·20² − 20 + 1 */
function polySub(p: P, n: number): string {
  let out = "";
  for (let k = p.length - 1; k >= 0; k--) {
    const c = p[k];
    if (c.isZero()) continue;
    const nn = k === 0 ? "" : k === 1 ? String(n) : `${n}^{${k}}`;
    const body = k === 0 ? iabs(c).tex() : iabs(c).isOne() ? nn : `${iabs(c).tex()} \\cdot ${nn}`;
    out += out ? (c.isNeg() ? ` - ${body}` : ` + ${body}`) : c.isNeg() ? `-${body}` : body;
  }
  return out || "0";
}
/** The number of the term equal to v, or 0. */
function whichTerm(rule: Rule, v: Frac): number {
  if (rule.poly) {
    const roots = realRoots(padd(rule.poly, [v.neg()])).exact;
    const n = roots.find((r) => r.b.isZero() && r.a.isInt() && r.a.n >= 1);
    if (deg(rule.poly) === 0) return eq(rule.poly[0], v) ? 1 : 0;
    return n ? n.a.n : 0;
  }
  const target = v.toNumber();
  for (let n = 1; n <= 2000; n++) {
    const x = rule.num(n);
    if (!Number.isFinite(x) || Math.abs(x) > 1e15 * Math.max(1, Math.abs(target))) break;
    if (Math.abs(x - target) <= 1e-9 * Math.max(1, Math.abs(target))) {
      const u = rule.at(n);
      if (typeof u === "number" || eq(u, v)) return n;
    }
  }
  return 0;
}
/** The first n ≥ 1 with value(n) op v (0 if none up to 10⁶). */
function firstN(value: (n: number) => number, op: Op, v: number): number {
  for (let n = 1; n <= 1e6; n++) {
    const x = value(n);
    if (!Number.isFinite(x) || Math.abs(x) > 1e300) return 0;
    if (holds(x, op, v)) return n;
  }
  return 0;
}

/** A rule given by a recurrence: exact values first, then numbers, kept as they are worked out. */
function recurRule(first: Q[], next: (xs: number[]) => number): Rule {
  const exactVals = [...first];
  const nums = first.map(qnum);
  const grow = (n: number) => {
    while (nums.length < n) nums.push(next(nums));
  };
  return {
    at: (n) => (n <= exactVals.length ? exactVals[n - 1] : (grow(n), nums[n - 1])),
    num: (n) => (grow(n), nums[n - 1]),
  };
}

// ---------- the rule behind a list ----------

function renderPattern(src: string): RenderedSvg {
  const W_ = words.pattern;
  const f = factsOf(src, []);
  const us = f.list;
  const L = f.letter;
  if (us.length < 3) throw new Error(us.length ? fill(words.few, { n: 3 }) : words.need.pattern);
  const levels: Frac[][] = [us];
  while (levels.length < 6 && levels[levels.length - 1].length > 1) {
    const prev = levels[levels.length - 1];
    levels.push(prev.slice(1).map((v, i) => sub(v, prev[i])));
  }
  const constAt = levels.findIndex((row, i) => i >= 1 && row.length >= 2 && row.every((v) => eq(v, row[0])));
  const rows: TexLine[] = [];
  const caps: Caption[] = [];
  const m = us.length;
  let rule: Rule | null = null;
  let ratios: Frac[] | null = null;
  const fromPoly = (p: P): Rule => ({ at: (n) => exact(() => pev(p, F(n))) ?? pnum(p, n), num: (n) => pnum(p, n), poly: p, tex: polyTex(p), fn: (x) => pnum(p, x) });

  const allNonZero = us.every((u) => !u.isZero());
  const rs = allNonZero ? us.slice(1).map((u, i) => div(u, us[i])) : [];
  const geometric = allNonZero && rs.every((r) => eq(r, rs[0])) && !eq(rs[0], ONE);

  if (constAt === 1) {
    const d = levels[1][0];
    const c = sub(us[0], d);
    const p = trim([c, d]);
    rows.push({ tex: `\\Delta = ${d.tex()} \\;\\Rightarrow\\; ${uTex(L, "n")} = ${d.isZero() ? "c" : `${signed(d, "n", true)} + c`}`, op: W_.linear });
    if (!d.isZero()) rows.push({ tex: `c = ${uTex(L, 0)} = ${uTex(L, 1)} - \\Delta = ${us[0].tex()} - ${par(d)} = ${c.tex()}`, op: W_.zeroTerm });
    rule = fromPoly(p);
  } else if (geometric) {
    const r = rs[0];
    ratios = rs;
    rows.push({ tex: `r = \\frac{${uTex(L, 2)}}{${uTex(L, 1)}} = \\frac{${us[1].tex()}}{${us[0].tex()}} = ${r.tex()}`, op: W_.geom });
    const a = us[0];
    rule = {
      at: (n) => exact(() => mul(a, pw(r, n - 1))) ?? fnum(a) * fnum(r) ** (n - 1),
      num: (n) => fnum(a) * fnum(r) ** (n - 1),
      tex: `${a.isOne() ? "" : `${a.tex()} \\cdot `}${baseTex(r)}^{n - 1}`,
      fn: (x) => fnum(a) * Math.abs(fnum(r)) ** (x - 1) * (r.isNeg() ? NaN : 1),
    };
    caps.push({ text: fill(W_.ratioCap, { r: fp(r) }) });
  } else if (constAt >= 2 && constAt <= 4) {
    const s = levels[constAt][0];
    if (constAt === 2) {
      const a = div(s, F(2));
      rows.push({ tex: `\\Delta^2 = ${s.tex()} = 2a \\;\\Rightarrow\\; a = ${a.tex()}`, op: W_.quadA });
      const an2 = us.map((_, i) => mul(a, F((i + 1) ** 2)));
      const rest = us.map((u, i) => sub(u, an2[i]));
      const show = Math.min(m, 6);
      const cols = (vs: Frac[]) => vs.slice(0, show).map((v) => v.tex()).join(" & ");
      const an2Tex = `${a.isOne() ? "" : a.tex()}n^2`;
      rows.push({
        tex: `\\begin{array}{r|${"c".repeat(show)}} n & ${Array.from({ length: show }, (_, i) => i + 1).join(" & ")} \\\\ \\hline ${uTex(L, "n")} & ${cols(us)} \\\\ ${an2Tex} & ${cols(an2)} \\\\ ${uTex(L, "n")} - ${an2Tex} & ${cols(rest)} \\end{array}`,
        op: W_.quadRest,
      });
      const d = sub(rest[1], rest[0]);
      const lin = trim([sub(rest[0], d), d]);
      rows.push({ tex: `${uTex(L, "n")} - ${an2Tex} = ${polyTex(lin)}`, op: W_.linear });
      rule = fromPoly(padd(lin, [ZERO, ZERO, a]));
    } else {
      const heads = levels.slice(0, constAt + 1).map((row) => row[0]);
      let p: P = [ZERO];
      let basis: P = [ONE];
      let fact = 1;
      const terms: string[] = [];
      heads.forEach((h, k) => {
        if (k > 0) {
          basis = pmul(basis, [F(-k), ONE]);
          fact *= k;
        }
        p = padd(p, pscale(basis, div(h, F(fact))));
        const prod = Array.from({ length: k }, (_, j) => `(n - ${j + 1})`).join("");
        const coef = k === 0 ? h.tex() : k === 1 ? `${h.tex()}${prod}` : `\\frac{${h.tex()}}{${k}!}${prod}`;
        terms.push(k === 0 ? coef : `${h.isNeg() ? "" : "+ "}${coef}`);
      });
      rows.push({ tex: `${uTex(L, "n")} = ${terms.join(" ")}`, op: W_.newton });
      rule = { ...fromPoly(p), op: W_.expand };
    }
  } else if (m >= 4 && !eq(us[1], us[0])) {
    const p = div(sub(us[2], us[1]), sub(us[1], us[0]));
    const q = sub(us[1], mul(p, us[0]));
    const fits = us.slice(1).every((u, i) => eq(u, add(mul(p, us[i]), q)));
    if (fits) {
      const step = (x: Frac) => add(mul(p, x), q);
      const vals = iterate([us[0]], ([x]) => step(x), ([x]) => fnum(p) * x + fnum(q), 60);
      rows.push({ tex: `${uTex(L, "{n+1}")} = ${signed(p, uTex(L, "n"), true)}${q.isZero() ? "" : signed(q, "")}`, op: W_.recur1 });
      rule = recurRule(vals, (xs) => fnum(p) * xs[xs.length - 1] + fnum(q));
    }
  }
  if (!rule && m >= 5) {
    const det = sub(mul(us[1], us[1]), mul(us[0], us[2]));
    if (!det.isZero()) {
      const p = div(sub(mul(us[2], us[1]), mul(us[0], us[3])), det);
      const q = div(sub(mul(us[1], us[3]), mul(us[2], us[2])), det);
      const fits = us.slice(2).every((u, i) => eq(u, add(mul(p, us[i + 1]), mul(q, us[i]))));
      if (fits) {
        const fib = p.isOne() && q.isOne();
        rows.push({ tex: `${uTex(L, "{n+2}")} = ${signed(p, uTex(L, "{n+1}"), true)}${signed(q, uTex(L, "n"))}`, op: fib ? W_.fib : W_.recur2 });
        const first = iterate([us[0], us[1]], ([x, y]) => add(mul(p, y), mul(q, x)), ([x, y]) => fnum(p) * y + fnum(q) * x, 60);
        rule = recurRule(first, (xs) => fnum(p) * xs[xs.length - 1] + fnum(q) * xs[xs.length - 2]);
      }
    }
  }

  const shown = ratios ? [us] : constAt > 0 ? levels.slice(0, constAt + 1) : levels.slice(0, Math.min(levels.length, 4));
  const pics: Pic[] = [diffTable(shown, constAt, ratios, L)];
  if (rule) {
    if (rule.tex) rows.push({ tex: `${uTex(L, "n")} = ${rule.tex}`, op: rule.op, color: C.green });
    const next = [m + 1, m + 2, m + 3].map((n) => rule!.at(n));
    rows.push({ tex: `${uTex(L, m + 1)}, ${uTex(L, m + 2)}, ${uTex(L, m + 3)} = ${next.map(qtex).join(", ")}`, op: W_.next, color: C.blue });
    caps.unshift({ text: fill(W_.constLevel, { list: next.map(qplain).join(", ") }) });
    ruleQueries(f, rule, rows, caps, L);
    const ns = Array.from({ length: m + 3 }, (_, i) => i + 1);
    const vs = ns.map((n) => qnum(rule!.at(n)));
    pics.push({ svg: panel("seqP", 52, 8, 560, 200, ns, vs, { title: `${L}ₙ`, color: C.blue, fn: rule.fn }), h: 230 });
  } else caps.push({ text: W_.none, color: C.red });
  return finish(`${listTex(us)}`, rows, pics, caps);
}

// ---------- arithmetic ----------

/** One linear fact about two unknowns: ca·x + cb·y = v. */
type Lin = { ca: Frac; cb: Frac; v: Frac; tex: string };

/** Solve for two unknowns from what is known, with the rows that show how. */
function solve2(names: [string, string], known: [Frac | undefined, Frac | undefined], eqs: Lin[], rows: TexLine[]): [Frac, Frac] {
  let [x, y] = known;
  const W_ = words.arith;
  const used: Lin[] = [];
  const show = (e: Lin) => {
    rows.push({ tex: e.tex, op: W_.eq });
    used.push(e);
  };
  if (x === undefined || y === undefined) {
    if (x !== undefined || y !== undefined) {
      const e = eqs.find((e) => !(x !== undefined ? e.cb : e.ca).isZero());
      if (!e) throw new Error(words.noSolve);
      show(e);
      if (x !== undefined) {
        const rhs = sub(e.v, mul(e.ca, x));
        y = div(rhs, e.cb);
        rows.push({ tex: `${e.cb.isOne() ? "" : e.cb.tex()}${names[1]} = ${e.v.tex()} ${e.ca.isZero() ? "" : `- ${par(mul(e.ca, x))}`} \\;\\Rightarrow\\; ${names[1]} = ${y.tex()}`, op: W_.back });
      } else {
        const rhs = sub(e.v, mul(e.cb, y!));
        x = div(rhs, e.ca);
        rows.push({ tex: `${names[0]} = ${e.ca.isOne() ? `${e.v.tex()} - ${par(e.cb)} \\cdot ${par(y!)}` : `\\frac{${rhs.tex()}}{${e.ca.tex()}}`} = ${x.tex()}`, op: W_.back });
      }
    } else {
      let pair: [Lin, Lin] | null = null;
      for (let i = 0; i < eqs.length && !pair; i++)
        for (let j = i + 1; j < eqs.length && !pair; j++) if (!sub(mul(eqs[i].ca, eqs[j].cb), mul(eqs[j].ca, eqs[i].cb)).isZero()) pair = [eqs[i], eqs[j]];
      if (!pair) throw new Error(words.noSolve);
      let [e1, e2] = pair;
      show(e1);
      show(e2);
      if (eq(e1.ca, e2.ca)) {
        if (fnum(e2.cb) < fnum(e1.cb)) [e1, e2] = [e2, e1];
        const cb = sub(e2.cb, e1.cb);
        const v = sub(e2.v, e1.v);
        y = div(v, cb);
        rows.push({ tex: `${cb.isOne() ? "" : cb.tex()}${names[1]} = ${e2.v.tex()} - ${par(e1.v)} = ${v.tex()} \\;\\Rightarrow\\; ${names[1]} = ${y.tex()}`, op: W_.subtract });
        x = div(sub(e1.v, mul(e1.cb, y)), e1.ca);
        rows.push({ tex: `${names[0]} = ${e1.ca.isOne() ? "" : `\\frac{1}{${e1.ca.tex()}}`}\\left(${e1.v.tex()} - ${par(e1.cb)} \\cdot ${par(y)}\\right) = ${x.tex()}`.replace("\\left(", e1.ca.isOne() ? "" : "\\left(").replace("\\right)", e1.ca.isOne() ? "" : "\\right)"), op: W_.back });
      } else {
        const det = sub(mul(e1.ca, e2.cb), mul(e2.ca, e1.cb));
        x = div(sub(mul(e1.v, e2.cb), mul(e2.v, e1.cb)), det);
        y = div(sub(mul(e1.ca, e2.v), mul(e2.ca, e1.v)), det);
        rows.push({ tex: `${names[0]} = ${x.tex()}, \\quad ${names[1]} = ${y.tex()}`, op: W_.solve });
      }
    }
  }
  for (const e of eqs) if (!eq(add(mul(e.ca, x!), mul(e.cb, y!)), e.v)) throw new Error(fill(words.conflict, { s: e.tex.replace(/\\[a-z]+|[{}]/g, "").replace(/\s+/g, " ") }));
  return [x!, y!];
}

function renderArith(src: string): RenderedSvg {
  const W_ = words.arith;
  const f = factsOf(src, ["a", "d"]);
  const L = f.letter;
  const rows: TexLine[] = [];
  const caps: Caption[] = [];
  let a = f.a;
  let d = f.d;
  if (f.list.length) {
    if (a && !eq(a, f.list[0])) throw new Error(fill(words.conflict, { s: `a = ${fp(a)}` }));
    a = f.list[0];
    if (f.list.length >= 2) {
      const ds = f.list.slice(1).map((u, i) => sub(u, f.list[i]));
      if (!ds.every((x) => eq(x, ds[0]))) throw new Error(fill(W_.notArith, { list: ds.map(fp).join(", ") }));
      if (d && !eq(d, ds[0])) throw new Error(fill(words.conflict, { s: `d = ${fp(d)}` }));
      d = ds[0];
      rows.push({ tex: `d = ${uTex(L, 2)} - ${uTex(L, 1)} = ${f.list[1].tex()} - ${par(f.list[0])} = ${d.tex()}`, op: W_.d });
    }
  }
  const eqs: Lin[] = [
    ...f.terms.map(({ k, v }) => ({ ca: ONE, cb: F(k - 1), v, tex: `${uTex(L, k)} = a${k === 1 ? "" : ` + ${k - 1 === 1 ? "" : k - 1}d`} = ${v.tex()}` })),
    ...f.sums.map(({ k, v }) => ({ ca: F(k), cb: F((k * (k - 1)) / 2), v, tex: `S_{${k}} = \\frac{${k}}{2}\\left(2a + ${k - 1}d\\right) = ${v.tex()} \\;\\Rightarrow\\; ${k}a + ${(k * (k - 1)) / 2}d = ${v.tex()}` })),
  ];
  if (a === undefined && d === undefined && eqs.length < 2) throw new Error(eqs.length || f.queries.length ? words.noSolve : words.need.arith);
  if ((a === undefined) !== (d === undefined) && !eqs.length) throw new Error(words.noSolve);
  [a, d] = solve2(["a", "d"], [a, d], eqs, rows);

  const term: P = trim([sub(a, d), d]);
  const nth = d.isZero() ? a.tex() : `${a.tex()}${signed(d, "(n - 1)")}`;
  rows.push({ tex: `${uTex(L, "n")} = a + (n - 1)d = ${nth}${d.isZero() || deg(term) === 0 ? "" : ` = ${polyTex(term)}`}`, op: W_.nth, color: C.green });
  const Sp: P = trim([ZERO, sub(a, div(d, F(2))), div(d, F(2))]);
  rows.push({ tex: `S_n = \\frac{n}{2}\\left(2a + (n - 1)d\\right) = \\frac{n}{2}\\left(${mul(F(2), a).tex()}${d.isZero() ? "" : signed(d, "(n - 1)")}\\right) = ${factorTex(Sp)}`, op: W_.sum, color: C.green });

  const rule: Rule = { at: (n) => exact(() => pev(term, F(n))) ?? pnum(term, n), num: (n) => pnum(term, n), poly: term };
  const Sat = (n: number): Q => exact(() => pev(Sp, F(n))) ?? pnum(Sp, n);
  let picN = 0;
  if (f.last) f.queries.unshift({ k: "which", v: f.last });
  for (const q of f.queries) {
    if (q.k === "term") {
      rows.push({ tex: `${uTex(L, q.n)} = a + ${q.n - 1}d = ${a.tex()} + ${q.n - 1} \\cdot ${par(d)} ${qeq(rule.at(q.n))}`, op: fill(words.term, { u: uName(L, q.n) }), color: C.blue });
      caps.push({ text: `${uName(L, q.n)} ${qp(rule.at(q.n))}` });
      picN = Math.max(picN, q.n);
    } else if (q.k === "sum") {
      const last = rule.at(q.n);
      const s = Sat(q.n);
      rows.push({ tex: `S_{${q.n}} = \\frac{${q.n}}{2}\\left(${uTex(L, 1)} + ${uTex(L, q.n)}\\right) = \\frac{${q.n}}{2}\\left(${a.tex()} + ${typeof last === "number" ? tn(last) : par(last)}\\right) ${qeq(s)}`, op: W_.sumFirstLast, color: C.blue });
      caps.push({ text: fill(words.sumIs, { s: `S${subs(q.n)}`, v: qplain(s) }) });
      picN = Math.max(picN, q.n);
    } else if (q.k === "which") {
      if (d.isZero()) {
        caps.push(eq(a, q.v) ? { text: words.everyTerm, color: C.green } : { text: fill(words.notTerm, { v: fp(q.v) }), color: C.red });
        continue;
      }
      const n = div(sub(q.v, term[0]), d);
      rows.push({ tex: `${polyTex(term)} = ${q.v.tex()} \\;\\Rightarrow\\; n = \\frac{${q.v.tex()} ${term[0].isNeg() ? "+" : "-"} ${iabs(term[0]).tex()}}{${d.tex()}} = ${n.tex()}`, op: W_.which });
      if (n.isInt() && n.n >= 1) {
        caps.push({ text: fill(words.isTerm, { v: fp(q.v), n: n.n, u: uName(L, n.n) }), color: C.green });
        if (f.last && q.v === f.last) {
          const s = Sat(n.n);
          rows.push({ tex: `S_{${n.n}} = \\frac{${n.n}}{2}\\left(${a.tex()} + ${par(q.v)}\\right) ${qeq(s)}`, op: W_.sumFirstLast, color: C.blue });
          caps.push({ text: fill(words.sumIs, { s: `S${subs(n.n)}`, v: qplain(s) }) });
        }
        picN = Math.max(picN, n.n);
      } else caps.push({ text: fill(words.notTerm, { v: fp(q.v) }), color: C.red });
    } else if (q.k === "first" && q.of === "u") {
      const n = firstN(rule.num, q.op, fnum(q.v));
      if (!d.isZero()) {
        const bound = div(sub(q.v, term[0]), d);
        const op2 = d.isNeg() ? flip(q.op) : q.op;
        rows.push({ tex: `${polyTex(term)} ${OP_TEX[q.op]} ${q.v.tex()} \\;\\Rightarrow\\; n ${OP_TEX[op2]} ${bound.tex()}${bound.isInt() ? "" : ` \\approx ${tn(fnum(bound), 3)}`}${n ? ` \\;\\Rightarrow\\; n = ${n}` : ""}`, op: W_.first });
      }
      caps.push(n ? { text: fill(words.firstU, { u: uName(L, n), op: q.op, v: fp(q.v), x: qplain(rule.at(n)) }), color: C.green } : { text: words.never, color: C.red });
      if (n) picN = Math.max(picN, n);
    } else if (q.k === "first" && q.of === "S") {
      const n = firstN((k) => pnum(Sp, k), q.op, fnum(q.v));
      const ineq = padd(Sp, [q.v.neg()]);
      const lcm = ineq.reduce((acc, c) => (acc * c.d) / igcd(acc, c.d), 1);
      const scaled = pscale(ineq, F(lcm));
      const roots = deg(scaled) >= 1 ? realRoots(scaled) : { exact: [], approx: [] };
      const rootNums = [...roots.exact.map(qsNum), ...roots.approx].filter((x) => x > 0);
      rows.push({
        tex: `${factorTex(Sp)} ${OP_TEX[q.op]} ${q.v.tex()} \\;\\Leftrightarrow\\; ${polyTex(scaled)} ${OP_TEX[q.op]} 0${rootNums.length ? ` \\qquad n ${q.op === "=" ? "=" : "\\approx"} ${rootNums.map((x) => tn(x, 3)).join(", ")}` : ""}`,
        op: W_.roots,
      });
      if (n) {
        const prev = n > 1 ? `, \\quad S_{${n - 1}} ${qeq(Sat(n - 1))}` : "";
        rows.push({ tex: `S_{${n}} ${qeq(Sat(n))}${prev}`, op: W_.firstSum, color: C.blue });
        caps.push({ text: fill(words.firstS, { n, S: `S${subs(n)}`, op: q.op, v: fp(q.v), s: qplain(Sat(n)) }), color: C.green });
        picN = Math.max(picN, n);
      } else caps.push({ text: words.never, color: C.red });
    } else if (q.k === "inf") caps.push({ text: words.geom.noInf, color: C.red });
  }

  const N = Math.min(Math.max(picN || 8, 2), 100);
  const us = Array.from({ length: N }, (_, i) => fnum(a!) + i * fnum(d!));
  const pics: Pic[] = [];
  if (us.every((u) => u >= 0) && us[0] + us[N - 1] > 0) {
    pics.push(gauss(us, L));
    caps.push({ text: fill(W_.gauss, { n: N, h: nt(us[0] + us[N - 1]), S: `S${subs(N)}`, s: qplain(Sat(N)) }) });
  } else {
    let s = 0;
    pics.push(twin(us.map((_, i) => i + 1), us, us.map((u) => (s += u)), { L }));
  }
  const head = f.list.length ? listTex(f.list, true) + (f.last ? `, ${f.last.tex()}` : "") : `a = ${a.tex()}, \\; d = ${d.tex()}`;
  return finish(head, rows, pics, caps);
}

// ---------- geometric ----------

/** r from r^m = Q, with the row that shows it; `alt` when −r works too. */
function rootRow(m: number, Q: Frac, lhs: string, rows: TexLine[], op: string): { r: Frac; alt: boolean } {
  const W_ = words.geom;
  if (Q.isZero()) throw new Error(W_.zero);
  const r = m === 1 ? Q : rootFrac(Q, m);
  if (Q.isNeg() && m % 2 === 0) throw new Error(fill(words.conflict, { s: `r^${m} = ${fp(Q)}` }));
  if (!r) throw new Error(fill(W_.noRoot, { m, q: fp(Q) }));
  const alt = m % 2 === 0;
  rows.push({ tex: `${lhs} = ${Q.tex()} \\;\\Rightarrow\\; r = ${m === 1 ? "" : alt ? `\\pm\\sqrt[${m === 2 ? "" : m}]{${Q.tex()}} = ${alt ? "\\pm " : ""}` : `\\sqrt[${m}]{${Q.tex()}} = `}${r.tex()}`, op });
  return { r, alt };
}

/** r^m op T  ⇒  m op' ln T / ln r. */
function logRow(r: Frac, m: string, op: Op, T: Frac, rows: TexLine[]) {
  if (!(fnum(T) > 0) || r.isNeg() || r.isOne()) return;
  const op2 = fnum(r) < 1 ? flip(op) : op;
  const x = Math.log(fnum(T)) / Math.log(fnum(r));
  rows.push({ tex: `${baseTex(r)}^{${m}} ${OP_TEX[op]} ${T.tex()} \\;\\Rightarrow\\; ${m} ${OP_TEX[op2]} \\frac{\\ln ${baseTex(T)}}{\\ln ${baseTex(r)}} \\approx ${tn(x, 3)}`, op: words.geom.logs });
}

function renderGeom(src: string): RenderedSvg {
  const W_ = words.geom;
  const f = factsOf(src, ["a", "r"]);
  const L = f.letter;
  const rows: TexLine[] = [];
  const caps: Caption[] = [];
  let a = f.a;
  let r = f.r;
  let alt = false;
  if (f.list.length) {
    if (a && !eq(a, f.list[0])) throw new Error(fill(words.conflict, { s: `a = ${fp(a)}` }));
    a = f.list[0];
    if (f.list.length >= 2) {
      if (f.list.some((u) => u.isZero())) throw new Error(W_.zero);
      const rs = f.list.slice(1).map((u, i) => div(u, f.list[i]));
      if (!rs.every((x) => eq(x, rs[0]))) throw new Error(fill(W_.notGeom, { list: rs.map(fp).join(", ") }));
      if (r && !eq(r, rs[0])) throw new Error(fill(words.conflict, { s: `r = ${fp(r)}` }));
      r = rs[0];
      rows.push({ tex: `r = \\frac{${uTex(L, 2)}}{${uTex(L, 1)}} = \\frac{${f.list[1].tex()}}{${f.list[0].tex()}} = ${r.tex()}`, op: W_.r });
    }
  }
  const termTex = (k: number, v: Frac) => `${uTex(L, k)} = a${k === 1 ? "" : k === 2 ? "r" : `r^{${k - 1}}`} = ${v.tex()}`;
  const firstTerm = f.terms.find((t) => t.k >= 2);
  if (a === undefined && r === undefined) {
    const ts = [...f.terms].sort((x, y) => x.k - y.k);
    const pair = ts.length >= 2 ? [ts[0], ts.find((t) => t.k > ts[0].k)] : null;
    if (!pair || !pair[1]) throw new Error(f.terms.length || f.sums.length || f.inf ? words.noSolve : words.need.geom);
    const [p, q] = pair as [{ k: number; v: Frac }, { k: number; v: Frac }];
    rows.push({ tex: `${termTex(p.k, p.v)}, \\quad ${termTex(q.k, q.v)}`, op: W_.eq });
    if (p.v.isZero()) throw new Error(W_.zero);
    const m = q.k - p.k;
    const res = rootRow(m, div(q.v, p.v), `\\frac{${uTex(L, q.k)}}{${uTex(L, p.k)}} = r^{${m === 1 ? "" : m}}`.replace("r^{}", "r"), rows, W_.divide);
    r = res.r;
    alt = res.alt;
    a = div(p.v, pw(r, p.k - 1));
    if (p.k > 1) rows.push({ tex: `a = \\frac{${uTex(L, p.k)}}{r${p.k === 2 ? "" : `^{${p.k - 1}}`}} = \\frac{${p.v.tex()}}{${p.k === 2 ? r.tex() : `${baseTex(r)}^{${p.k - 1}}`}} = ${a.tex()}`, op: W_.a });
  } else if (r === undefined) {
    if (firstTerm) {
      rows.push({ tex: termTex(firstTerm.k, firstTerm.v), op: W_.eq });
      const m = firstTerm.k - 1;
      const res = rootRow(m, div(firstTerm.v, a!), `r^{${m}} = \\frac{${firstTerm.v.tex()}}{${a!.tex()}}`.replace("r^{1}", "r"), rows, W_.divide);
      r = res.r;
      alt = res.alt;
    } else if (f.inf) {
      r = sub(ONE, div(a!, f.inf));
      rows.push({ tex: `S_\\infty = \\frac{a}{1 - r} = ${f.inf.tex()} \\;\\Rightarrow\\; 1 - r = \\frac{${a!.tex()}}{${f.inf.tex()}} \\;\\Rightarrow\\; r = ${r.tex()}`, op: W_.inf });
    } else throw new Error(words.noSolve);
  } else if (a === undefined) {
    if (firstTerm || f.terms.length) {
      const t = firstTerm ?? f.terms[0];
      a = div(t.v, pw(r, t.k - 1));
      rows.push({ tex: `${termTex(t.k, t.v)} \\;\\Rightarrow\\; a = \\frac{${t.v.tex()}}{${baseTex(r)}^{${t.k - 1}}} = ${a.tex()}`, op: W_.a });
    } else if (f.inf) {
      a = mul(f.inf, sub(ONE, r));
      rows.push({ tex: `S_\\infty = \\frac{a}{1 - r} = ${f.inf.tex()} \\;\\Rightarrow\\; a = ${f.inf.tex()}\\left(1 - ${par(r)}\\right) = ${a.tex()}`, op: W_.a });
    } else if (f.sums.length) {
      const { k, v } = f.sums[0];
      a = r.isOne() ? div(v, F(k)) : div(mul(v, sub(ONE, r)), sub(ONE, pw(r, k)));
      rows.push({ tex: `S_{${k}} = \\frac{a(1 - r^{${k}})}{1 - r} = ${v.tex()} \\;\\Rightarrow\\; a = ${a.tex()}`, op: W_.a });
    } else throw new Error(words.noSolve);
  }
  if (a!.isZero() || r!.isZero()) throw new Error(W_.zero);
  const A = a!;
  const R = r!;
  const at = (n: number): Q => exact(() => mul(A, pw(R, n - 1))) ?? fnum(A) * fnum(R) ** (n - 1);
  const small = Math.abs(fnum(R)) < 1;
  const K = R.isOne() ? ZERO : small ? div(A, sub(ONE, R)) : div(A, sub(R, ONE));
  const Sat = (n: number): Q => (R.isOne() ? exact(() => mul(A, F(n))) ?? fnum(A) * n : exact(() => mul(K, small ? sub(ONE, pw(R, n)) : sub(pw(R, n), ONE))) ?? fnum(K) * (small ? 1 - fnum(R) ** n : fnum(R) ** n - 1));
  // Check every fact against a and r.
  const facts: [string, Q, Frac][] = [
    ...f.terms.map(({ k, v }) => [`${uName(L, k)} = ${fp(v)}`, at(k), v] as [string, Q, Frac]),
    ...f.sums.map(({ k, v }) => [`S${subs(k)} = ${fp(v)}`, Sat(k), v] as [string, Q, Frac]),
  ];
  if (f.inf) facts.push([`S∞ = ${fp(f.inf)}`, small ? div(A, sub(ONE, R)) : NaN, f.inf]);
  for (const [s, got, want] of facts) if (typeof got === "number" ? !(Math.abs(got - fnum(want)) < 1e-9) : !eq(got, want)) throw new Error(fill(words.conflict, { s }));

  const coef = A.isOne() ? "" : eq(A, F(-1)) ? "-" : `${A.tex()} \\cdot `;
  const nthTex = `${coef}${baseTex(R)}^{n - 1}`;
  rows.push({ tex: `${uTex(L, "n")} = ar^{n - 1} = ${nthTex}`, op: words.arith.nth, color: C.green });
  const pTex = (n: string) => `${baseTex(R)}^{${n}}`;
  const sumClosed = (n: string) => (K.isOne() ? (small ? `1 - ${pTex(n)}` : `${pTex(n)} - 1`) : `${K.tex()}\\left(${small ? `1 - ${pTex(n)}` : `${pTex(n)} - 1`}\\right)`);
  if (R.isOne()) rows.push({ tex: `S_n = na = ${A.isOne() ? "" : A.tex()}n`, op: words.arith.sum, color: C.green });
  else
    rows.push({
      tex: small
        ? `S_n = \\frac{a(1 - r^n)}{1 - r} = \\frac{${A.tex()}\\left(1 - ${pTex("n")}\\right)}{1 - ${par(R)}} = ${sumClosed("n")}`
        : `S_n = \\frac{a(r^n - 1)}{r - 1} = \\frac{${A.tex()}\\left(${pTex("n")} - 1\\right)}{${R.tex()} - 1} = ${sumClosed("n")}`,
      op: words.arith.sum,
      color: C.green,
    });
  let limit: { v: number; label: string } | undefined;
  if (small) {
    const S = div(A, sub(ONE, R));
    rows.push({ tex: `S_\\infty = \\frac{a}{1 - r} = \\frac{${A.tex()}}{1 - ${par(R)}} = ${S.tex()}`, op: W_.inf, color: C.green });
    caps.push({ text: fill(W_.infCap, { s: fp(S) }), color: C.green });
    limit = { v: fnum(S), label: `S∞ = ${fp(S)}` };
  }
  if (alt) caps.push({ text: fill(W_.alt, { r: fp(R.neg()) }) });

  let picN = 0;
  if (f.last) f.queries.unshift({ k: "which", v: f.last });
  const positive = !A.isNeg() && !R.isNeg();
  for (const q of f.queries) {
    if (q.k === "term") {
      rows.push({ tex: `${uTex(L, q.n)} = ${coef}${pTex(String(q.n - 1))} ${qeq(at(q.n))}`, op: fill(words.term, { u: uName(L, q.n) }), color: C.blue });
      caps.push({ text: `${uName(L, q.n)} ${qp(at(q.n))}` });
      picN = Math.max(picN, q.n);
    } else if (q.k === "sum") {
      rows.push({ tex: `S_{${q.n}} = ${R.isOne() ? `${q.n} \\cdot ${par(A)}` : sumClosed(String(q.n))} ${qeq(Sat(q.n))}`, op: fill(words.term, { u: `S${subs(q.n)}` }), color: C.blue });
      caps.push({ text: fill(words.sumIs, { s: `S${subs(q.n)}`, v: qplain(Sat(q.n)) }) });
      picN = Math.max(picN, q.n);
    } else if (q.k === "inf") {
      if (!small) caps.push({ text: fill(W_.noInf, { r: fp(R) }), color: C.red });
    } else if (q.k === "which") {
      const n = whichTerm({ at, num: (k) => fnum(A) * fnum(R) ** (k - 1) }, q.v);
      const T = div(q.v, A);
      if (positive && fnum(T) > 0 && !R.isOne()) {
        const x = Math.log(fnum(T)) / Math.log(fnum(R));
        rows.push({ tex: `${nthTex} = ${q.v.tex()} \\;\\Rightarrow\\; ${pTex("n - 1")} = ${T.tex()} \\;\\Rightarrow\\; n - 1 = ${n ? `${n - 1}` : `\\frac{\\ln ${baseTex(T)}}{\\ln ${baseTex(R)}} \\approx ${tn(x, 3)}`}`, op: W_.which });
      }
      caps.push(n ? { text: fill(words.isTerm, { v: fp(q.v), n, u: uName(L, n) }), color: C.green } : { text: fill(words.notTerm, { v: fp(q.v) }), color: C.red });
      if (n) {
        picN = Math.max(picN, n);
        if (f.last && q.v === f.last) {
          rows.push({ tex: `S_{${n}} = ${R.isOne() ? `${n} \\cdot ${par(A)}` : sumClosed(String(n))} ${qeq(Sat(n))}`, op: fill(words.term, { u: `S${subs(n)}` }), color: C.blue });
          caps.push({ text: fill(words.sumIs, { s: `S${subs(n)}`, v: qplain(Sat(n)) }) });
        }
      }
    } else if (q.k === "first") {
      const [a0, r0, k0] = [fnum(A), fnum(R), fnum(K)];
      const value = q.of === "u" ? (k: number) => a0 * r0 ** (k - 1) : R.isOne() ? (k: number) => a0 * k : (k: number) => k0 * (small ? 1 - r0 ** k : r0 ** k - 1);
      const n = firstN(value, q.op, fnum(q.v));
      if (positive && !R.isOne()) {
        if (q.of === "u") {
          rows.push({ tex: `${nthTex} ${OP_TEX[q.op]} ${q.v.tex()} \\;\\Rightarrow\\; ${pTex("n - 1")} ${OP_TEX[q.op]} ${div(q.v, A).tex()}`, op: W_.first });
          logRow(R, "n - 1", q.op, div(q.v, A), rows);
        } else {
          const T = small ? sub(ONE, div(q.v, K)) : add(ONE, div(q.v, K));
          const op = small ? flip(q.op) : q.op;
          rows.push({ tex: `${sumClosed("n")} ${OP_TEX[q.op]} ${q.v.tex()} \\;\\Rightarrow\\; ${pTex("n")} ${OP_TEX[op]} ${T.tex()}`, op: W_.firstSum });
          logRow(R, "n", op, T, rows);
        }
      }
      if (n) {
        const v = q.of === "u" ? at(n) : Sat(n);
        const prev = n > 1 ? (q.of === "u" ? at(n - 1) : Sat(n - 1)) : null;
        rows.push({ tex: `n = ${n}: \\quad ${q.of === "u" ? uTex(L, n) : `S_{${n}}`} ${qeq(v)}${prev !== null ? `, \\quad ${q.of === "u" ? uTex(L, n - 1) : `S_{${n - 1}}`} ${qeq(prev)}` : ""}`, op: words.arith.firstSum, color: C.blue });
        caps.push({ text: q.of === "u" ? fill(words.firstU, { u: uName(L, n), op: q.op, v: fp(q.v), x: qplain(v) }) : fill(words.firstS, { n, S: `S${subs(n)}`, op: q.op, v: fp(q.v), s: qplain(v) }), color: C.green });
        picN = Math.max(picN, n);
      } else caps.push({ text: words.never, color: C.red });
    }
  }
  const N = Math.min(Math.max(picN || 10, 3), 25);
  const ns = Array.from({ length: N }, (_, i) => i + 1);
  const us = ns.map((n) => qnum(at(n)));
  const ss = ns.map((n) => qnum(Sat(n)));
  const head = f.list.length ? listTex(f.list, true) + (f.last ? `, ${f.last.tex()}` : "") : `a = ${A.tex()}, \\; r = ${R.tex()}`;
  return finish(head, rows, [twin(ns, us, ss, { L, limit })], caps);
}

// ---------- sums in Σ notation ----------

type Bound = { k: "num"; n: number } | { k: "sym"; v: string } | { k: "inf" };
type Part =
  | { k: "poly"; p: P }
  | { k: "geo"; c: Frac; R: Frac }
  /** α·(1/(q·k + s) − 1/(q·(k + m) + s)) */
  | { k: "tele"; alpha: Frac; q: number; s: number; m: number; c: Frac; den: P };

function geoOf(e: E): { c: Frac; R: Frac } | null {
  if (e.k === "pow") {
    const b = constE(e.b);
    if (b) {
      const ex = toPoly(e.e);
      if (!ex || ex.length !== 2 || !ex[1].isInt() || !ex[0].isInt() || ex[1].isZero() || Math.abs(ex[1].n) > 20 || Math.abs(ex[0].n) > 60) return null;
      return { c: pw(b, ex[0].n), R: pw(b, ex[1].n) };
    }
    const inner = geoOf(e.b);
    const ex = constE(e.e);
    return inner && ex && ex.isInt() && Math.abs(ex.n) <= 3 ? { c: pw(inner.c, ex.n), R: pw(inner.R, ex.n) } : null;
  }
  if (e.k === "mul") {
    let c = ONE;
    let g: { c: Frac; R: Frac } | null = null;
    for (const f of e.fs) {
      const v = constE(f);
      if (v) {
        c = mul(c, v);
        continue;
      }
      const h = geoOf(f);
      if (!h || g) return null;
      g = h;
    }
    return g ? { c: mul(c, g.c), R: g.R } : null;
  }
  return null;
}
function teleOf(e: E): Part | null {
  const fs = e.k === "mul" ? e.fs : [e];
  let c = ONE;
  let den: P = [ONE];
  for (const f of fs) {
    const v = constE(f);
    if (v) {
      c = mul(c, v);
      continue;
    }
    if (f.k === "pow") {
      const ex = constE(f.e);
      const b = toPoly(f.b);
      if (ex && b && ex.isInt() && ex.n < 0 && ex.n >= -2) {
        for (let i = 0; i < -ex.n; i++) den = pmul(den, b);
        continue;
      }
    }
    return null;
  }
  if (deg(den) !== 2) return null;
  const roots = realRoots(den).exact;
  if (roots.length !== 2 || roots.some((r) => !r.b.isZero())) return null;
  const [lo, hi] = [roots[0].a, roots[1].a];
  const m = sub(hi, lo);
  if (!m.isInt() || m.n < 1 || m.n > 6 || lo.d !== hi.d) return null;
  const q = hi.d;
  return { k: "tele", alpha: div(mul(c, F(q)), mul(den[2], F(m.n))), q, s: -hi.n, m: m.n, c, den };
}
function partsOf(e: E): Part[] | null {
  const p = toPoly(e);
  if (p) return [{ k: "poly", p: trim(p) }];
  if (e.k === "add") {
    const out: Part[] = [];
    for (const t of e.ts) {
      const ps = partsOf(t);
      if (!ps) return null;
      for (const x of ps) {
        const same = out.find((y) => (x.k === "poly" && y.k === "poly") || (x.k === "geo" && y.k === "geo" && eq(x.R, y.R)));
        if (same?.k === "poly" && x.k === "poly") same.p = padd(same.p, x.p);
        else if (same?.k === "geo" && x.k === "geo") same.c = add(same.c, x.c);
        else out.push(x);
      }
    }
    return out;
  }
  const g = geoOf(e);
  if (g) return g.R.isOne() ? [{ k: "poly", p: [g.c] }] : [{ k: "geo", ...g }];
  const t = teleOf(e);
  return t ? [t] : null;
}

type SigmaIn = { idx: string; lo: number; hi: Bound; e: E; head: string; rows: TexLine[]; caps: Caption[] };

/** Σ_{k=1}^{20} (3k − 2), sum k=1..n k^2, sum r=1 to ∞ of (1/2)^r — or a series written out: 1 + 4 + 7 + … + 100. */
function sigmaIn(src: string): SigmaIn {
  const s = normal(src.replace(/[;\n]+/g, " "));
  if (!s) throw new Error(words.need.sigma);
  const m = /^(?:sum|Σ|∑|\\sum)\s*_?\s*\{?\s*\(?\s*([a-zA-Z])\s*=\s*(-?\d+)\s*\)?\s*\}?\s*(?:\^\s*\{?\s*(∞|\d+|[a-zA-Z])\s*\}?|(?:\.\.|…|to)\s*(∞|\d+|[a-zA-Z]))\s*(?:of\b|:)?\s*(.+)$/i.exec(s);
  if (m) {
    const [, idx, loS, h1, h2, body] = m;
    const hiS = h1 ?? h2;
    if (idx === "e") throw bad(s);
    const hi: Bound = hiS === "∞" ? { k: "inf" } : /^\d+$/.test(hiS) ? { k: "num", n: Number(hiS) } : { k: "sym", v: hiS };
    if (hi.k === "sym" && hi.v === idx) throw bad(s);
    const lo = Number(loS);
    if (lo < 0 || lo > 1e6 || (hi.k === "num" && (hi.n < lo || hi.n > 1e7))) throw bad(s);
    const raw = body.trim();
    if (idx !== "x" && /(?<![a-zA-Z])x(?![a-zA-Z])/.test(raw)) throw new Error(fill(words.onlyVar, { v: idx }));
    exprMessages({ bad: words.bad, onlyX: fill(words.onlyVar, { v: idx }), tooBig: words.tooBig });
    const e = parseE(raw.replace(new RegExp(`(?<![a-zA-Z])${idx}(?![a-zA-Z])`, "g"), "x"));
    const head = `\\sum_{${idx}=${lo}}^{${hi.k === "inf" ? "\\infty" : hi.k === "num" ? hi.n : hi.v}} ${wrapSum(e, idx)}`;
    return { idx, lo, hi, e, head, rows: [], caps: [] };
  }
  return writtenIn(s);
}
const texIn = (e: E, idx: string) => tex(substitute(e, "x", V(idx)));
const wrapSum = (e: E, idx: string) => (e.k === "add" ? `\\left(${texIn(e, idx)}\\right)` : texIn(e, idx));

/** 1 + 4 + 7 + … + 100 → Σ_{k=1}^{34} (3k − 2). */
function writtenIn(s: string): SigmaIn {
  const terms: string[] = [];
  let depth = 0;
  let cur = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if ("([{".includes(ch)) depth++;
    else if (")]}".includes(ch)) depth--;
    const prev = cur.trim();
    if (depth === 0 && (ch === "+" || ch === "-") && prev && !/[*/^(e]$/.test(prev)) {
      terms.push(prev);
      cur = ch === "-" ? "-" : "";
    } else cur += ch;
  }
  if (cur.trim()) terms.push(cur.trim());
  if (terms.length < 2) throw new Error(words.need.sigma);
  const dots = terms.findIndex((t) => t === "…" || t === "-…");
  const given = (dots < 0 ? terms : terms.slice(0, dots)).map(numOf);
  const after = dots < 0 ? [] : terms.slice(dots + 1);
  if (after.length > 1 || given.length < (dots < 0 ? 2 : 2)) throw new Error(fill(words.few, { n: 2 }));
  const last = after.length ? numOf(after[0]) : dots < 0 ? given[given.length - 1] : null;
  const W_ = words.sigma;
  const rows: TexLine[] = [];
  const caps: Caption[] = [];
  const written = `${given.map((g, i) => (i === 0 ? g.tex() : g.isNeg() ? `- ${g.neg().tex()}` : `+ ${g.tex()}`)).join(" ")}${dots >= 0 ? " + \\cdots" : ""}${after.length ? (last!.isNeg() ? ` - ${last!.neg().tex()}` : ` + ${last!.tex()}`) : ""}`;
  const ds = given.slice(1).map((g, i) => sub(g, given[i]));
  const arith = ds.every((d) => eq(d, ds[0]));
  const nonzero = given.every((g) => !g.isZero());
  const rs = nonzero ? given.slice(1).map((g, i) => div(g, given[i])) : [];
  const geom = nonzero && rs.every((r) => eq(r, rs[0]));
  const a = given[0];
  const X_: E = { k: "var", name: "x" };
  if (last === null) {
    // An infinite series.
    if (geom && (given.length === 2 || !arith)) {
      const r = rs[0];
      const e: E = { k: "mul", fs: [N(a), { k: "pow", b: N(r), e: { k: "add", ts: [X_, N(-1)] } }] };
      rows.push({ tex: `${written} = \\sum_{k=1}^{\\infty} ${texIn(e, "k")}`, op: fill(W_.written, { r: fp(r) }) });
      return { idx: "k", lo: 1, hi: { k: "inf" }, e, head: written, rows, caps };
    }
    if (arith && given.length >= 3) {
      const e = polyE([sub(a, ds[0]), ds[0]]);
      rows.push({ tex: `${written} = \\sum_{k=1}^{\\infty} ${wrapSum(e, "k")}`, op: fill(W_.writtenArith, { d: fp(ds[0]) }) });
      return { idx: "k", lo: 1, hi: { k: "inf" }, e, head: written, rows, caps };
    }
    throw new Error(W_.noMethod);
  }
  // A finite series: how many terms?
  if (arith && !ds[0].isZero()) {
    const d = ds[0];
    const n = add(div(sub(last, a), d), ONE);
    if (!n.isInt() || n.n < given.length) throw new Error(fill(words.notTerm, { v: fp(last) }));
    const e = polyE([sub(a, d), d]);
    rows.push({ tex: `N = \\frac{${last.tex()} - ${par(a)}}{${d.tex()}} + 1 = ${n.n}`, op: words.arith.count });
    rows.push({ tex: `${written} = \\sum_{k=1}^{${n.n}} ${wrapSum(e, "k")}`, op: W_.notation });
    return { idx: "k", lo: 1, hi: { k: "num", n: n.n }, e, head: written, rows, caps };
  }
  if (geom && !rs[0].isOne()) {
    const r = rs[0];
    let n = 0;
    let t = a;
    for (let k = 1; k <= 200; k++) {
      if (eq(t, last)) {
        n = k;
        break;
      }
      const next = exact(() => mul(t, r));
      if (!next) break;
      t = next;
    }
    if (!n) throw new Error(fill(words.notTerm, { v: fp(last) }));
    const e: E = { k: "mul", fs: [N(a), { k: "pow", b: N(r), e: { k: "add", ts: [X_, N(-1)] } }] };
    rows.push({ tex: `r = ${r.tex()}, \\quad ${a.tex()} \\cdot ${baseTex(r)}^{N - 1} = ${last.tex()} \\;\\Rightarrow\\; N = ${n}`, op: words.arith.count });
    rows.push({ tex: `${written} = \\sum_{k=1}^{${n}} ${texIn(e, "k")}`, op: W_.notation });
    return { idx: "k", lo: 1, hi: { k: "num", n }, e, head: written, rows, caps };
  }
  if (dots >= 0) throw new Error(W_.noMethod);
  // Just numbers to add.
  const e: E = { k: "num", v: ZERO };
  return { idx: "k", lo: 1, hi: { k: "num", n: given.length }, e, head: written, rows, caps, ...{ plain: given } } as SigmaIn;
}
function polyE(p: P): E {
  const ts: E[] = [];
  if (!p[1]?.isZero()) ts.push(p[1].isOne() ? { k: "var", name: "x" } : { k: "mul", fs: [N(p[1]), { k: "var", name: "x" }] });
  if (!p[0].isZero()) ts.push(N(p[0]));
  return ts.length === 1 ? ts[0] : ts.length ? { k: "add", ts } : N(0);
}

/** The value of the summand at k, exactly if it is rational. */
function termAt(e: E, k: number, idx: string): Q {
  const undef = () => new Error(fill(words.sigma.undefinedAt, { k: `${idx} = ${k}` }));
  let v: Frac | null;
  try {
    v = exact(() => constE(substitute(e, "x", N(F(k)))));
  } catch {
    throw undef();
  }
  const x = v ?? evalE(e, k);
  if (typeof x === "number" && !Number.isFinite(x)) throw undef();
  return x;
}
const qadd = (a: Q, b: Q): Q => (typeof a === "number" || typeof b === "number" ? qnum(a) + qnum(b) : exact(() => add(a, b)) ?? a.toNumber() + b.toNumber());

function renderSigma(src: string): RenderedSvg {
  const W_ = words.sigma;
  const S = sigmaIn(src);
  const plain = (S as SigmaIn & { plain?: Frac[] }).plain;
  const { idx, lo, hi, e } = S;
  const rows = S.rows;
  const caps = S.caps;
  const U = hi.k === "num" ? String(hi.n) : hi.k === "sym" ? hi.v : "\\infty";
  const sumTex = (body: string, from = lo, to = U) => `\\sum_{${idx}=${from}}^{${to}} ${body}`;
  const v = hi.k === "sym" ? hi.v : "n";
  const count = hi.k === "num" ? hi.n - lo + 1 : Infinity;
  const term = (k: number): Q => (plain ? plain[k - 1] : termAt(e, k, idx));

  // The first few terms written out.
  const show = hi.k === "num" ? Math.min(count, 4) : 3;
  const first = Array.from({ length: show }, (_, i) => term(lo + i));
  const firstTex = first.map(qtex).map((t, i) => (i === 0 ? t : t.startsWith("-") ? `- ${t.slice(1)}` : `+ ${t}`)).join(" ");
  if (!plain && !S.rows.length) {
    const lastTex = hi.k === "num" ? (count > show ? ` + \\cdots ${(() => { const t = qtex(term(hi.n)); return t.startsWith("-") ? `- ${t.slice(1)}` : `+ ${t}`; })()}` : "") : hi.k === "sym" ? ` + \\cdots + ${wrapSum(substitute(e, "x", V(v)), "x").replace(/\bx\b/g, v)}` : " + \\cdots";
    rows.push({ tex: `= ${firstTex}${lastTex}`, op: words.terms });
  }

  const parts = plain ? null : partsOf(e);
  let total: Q = ZERO;
  /** For a sum up to n: the closed form in LaTeX and as a function of n. */
  const closed: { tex: string; at: (n: number) => number }[] = [];
  let limitQ: Q | null = null;
  let diverges = false;

  if (!parts) {
    if (hi.k !== "num" || count > 2000) throw new Error(W_.noMethod);
    let s: Q = ZERO;
    for (let k = lo; k <= hi.n; k++) s = qadd(s, term(k));
    total = s;
    rows.push({ tex: `${qeq(s)}`, op: W_.direct, color: C.green });
  } else {
    if (parts.length > 1) rows.push({ tex: `= ${parts.map((p, i) => (i ? " + " : "") + sumTex(partTex(p, idx))).join("")}`, op: W_.split });
    for (const p of parts) {
      if (p.k === "poly") {
        const r = polyRows(p.p, idx, lo, hi, rows, sumTex, wrapSum(e, idx), parts.length === 1);
        if (r.diverges) diverges = true;
        total = qadd(total, r.value ?? 0);
        if (r.closed) closed.push(r.closed);
      } else if (p.k === "geo") {
        const r = geoRows(p, idx, lo, hi, rows, v, parts.length === 1 ? texIn(e, idx) : partTex(p, idx));
        if (r.diverges) diverges = true;
        if (r.value !== null) total = qadd(total, r.value);
        if (r.limit !== null) limitQ = qadd(limitQ ?? ZERO, r.limit);
        if (r.closed) closed.push(r.closed);
      } else {
        const r = teleRows(p, idx, lo, hi, rows, v, parts.length === 1 ? texIn(e, idx) : partTex(p, idx));
        if (r.value !== null) total = qadd(total, r.value);
        if (r.limit !== null) limitQ = qadd(limitQ ?? ZERO, r.limit);
        if (r.closed) closed.push(r.closed);
      }
    }
    if (hi.k === "inf" && parts.some((p) => p.k === "poly" && !(deg(p.p) === 0 && p.p[0].isZero()))) diverges = true;
  }

  if (hi.k === "num") {
    if (parts && parts.length > 1) rows.push({ tex: `\\sum ${qeq(total)}`, op: W_.value, color: C.green });
    caps.push({ text: fill(words.sumIs, { s: "Σ", v: qplain(total) }), color: C.green });
  } else if (hi.k === "sym") {
    if (closed.length > 1) rows.push({ tex: `\\sum = ${closed.map((c, i) => (i && !c.tex.startsWith("-") ? "+ " : "") + c.tex).join(" ")}`, op: W_.value, color: C.green });
    const n0 = lo + 1;
    const want = Array.from({ length: 2 }, (_, i) => term(lo + i)).reduce(qadd, ZERO);
    const got = closed.reduce((s2, c) => s2 + c.at(n0), 0);
    const same = Math.abs(got - qnum(want)) < 1e-9 * Math.max(1, Math.abs(got));
    caps.push({ text: fill(words.check, { n: `${v} = ${n0}`, v: same ? qplain(want) : nt(got, 6), w: `${qplain(term(lo))} + ${qplain(term(lo + 1))}` }), color: same ? C.ink : C.red });
  } else if (diverges) caps.push({ text: W_.diverges, color: C.red });
  else if (limitQ !== null) {
    if (parts && parts.length > 1)
      rows.push({ tex: `${sumTex("")} ${qeq(limitQ)}`.replace(/\}\s+=/, "} =").replace(`${idx}=${lo}}^{\\infty} `, `${idx}=${lo}}^{\\infty} ${wrapSum(e, idx)} `), op: W_.limit, color: C.green });
    caps.push({ text: fill(words.sumIs, { s: "Σ", v: qplain(limitQ) }), color: C.green });
  }

  // Pictures: the terms and the partial sums.
  const picN = hi.k === "num" ? Math.min(count, 30) : hi.k === "sym" ? 10 : 16;
  const ns = Array.from({ length: picN }, (_, i) => lo + i);
  const us = ns.map((k) => qnum(term(k)));
  let acc = 0;
  const ss = us.map((u) => (acc += u));
  if (hi.k === "sym") caps.push({ text: fill(W_.picture, { n: `${v} = ${lo + picN - 1}` }) });
  else if (hi.k === "num" && count > picN) caps.push({ text: fill(W_.shown, { n: picN }) });
  const limit = limitQ !== null && !diverges ? { v: qnum(limitQ), label: `${qplain(limitQ)}` } : undefined;
  const pics = us.every(Number.isFinite) ? [twin(ns, us, ss, { L: "a", sub: SUB_LETTER[idx] ?? "", limit, bars: picN <= 30 })] : [];
  return finish(S.head, rows, pics, caps);
}

function partTex(p: Part, idx: string): string {
  if (p.k === "poly") {
    const t = polyTex(p.p, idx);
    return p.p.filter((c) => !c.isZero()).length > 1 ? `\\left(${t}\\right)` : t;
  }
  if (p.k === "geo") return `${p.c.isOne() ? "" : `${p.c.tex()} \\cdot `}${baseTex(p.R)}^{${idx}}`;
  return `\\frac{${p.c.tex()}}{${polyTex(p.den, idx)}}`;
}

/** Σ of a polynomial: split, the standard results, simplified. */
function polyRows(p: P, idx: string, lo: number, hi: Bound, rows: TexLine[], sumTex: (b: string, from?: number, to?: string) => string, given: string, alone: boolean) {
  const W_ = words.sigma;
  const d = deg(p);
  if (d > 6) throw new Error(W_.noMethod);
  if (hi.k === "inf") return { diverges: !(d === 0 && p[0].isZero()), value: null, closed: null };
  const pieces = p.map((c, k) => ({ c, k })).filter((x) => !x.c.isZero()).reverse();
  if (!pieces.length) return { diverges: false, value: ZERO as Q, closed: { tex: "0", at: () => 0 } };
  const v = hi.k === "sym" ? hi.v : "n";
  const norm = (t: string) => t.replace(/\\left|\\right|\s/g, "");
  const body = partTex({ k: "poly", p }, idx);
  if (alone && d >= 1 && norm(body) !== norm(given)) rows.push({ tex: `= ${sumTex(body)}`, op: W_.expand });
  let pre: Frac = ZERO;
  if (lo === 0) {
    pre = p[0];
    rows.push({ tex: `= ${pre.tex()} + ${sumTex(body, 1)}`, op: fill(W_.zeroTerm, { k: idx }) });
  } else if (lo >= 2) rows.push({ tex: `= ${sumTex(body, 1)} - ${sumTex(body, 1, String(lo - 1))}`, op: W_.shift });
  const sigmaK = (k: number) => (k === 0 ? `\\sum 1` : `\\sum ${idx}${k === 1 ? "" : `^{${k}}`}`);
  const join = (ts: string[]) => ts.map((t, i) => (i === 0 ? t : t.startsWith("-") ? `- ${t.slice(1)}` : `+ ${t}`)).join(" ");
  const coef = (c: Frac, dot: boolean) => (c.isOne() ? "" : eq(c, F(-1)) ? "-" : `${c.tex()}${dot ? " \\cdot " : ""}`);
  if (pieces.length > 1 || !pieces[0].c.isOne()) rows.push({ tex: `= ${join(pieces.map(({ c, k }) => `${coef(c, false)}${sigmaK(k)}`))}`, op: W_.split });
  const P = pieces.reduce<P>((acc, { c, k }) => padd(acc, pscale(powerSum(k), c)), [ZERO]);
  const stdAt = (at?: number) => join(pieces.map(({ c, k }) => `${coef(c, true)}${k === 0 ? (at ?? v) : factorTex(powerSum(k), v, at)}`));
  const wrapP = (t: string) => (pieces.length > 1 ? `\\left(${t}\\right)` : t);
  const sub1 = lo >= 2 ? pev(P, F(lo - 1)) : ZERO;
  if (hi.k === "num") {
    const top = pev(P, F(hi.n));
    let value = top;
    if (lo >= 2) {
      rows.push({ tex: `= ${wrapP(stdAt(hi.n))} - ${wrapP(stdAt(lo - 1))}`, op: W_.standard });
      value = sub(top, sub1);
      rows.push({ tex: `= ${top.tex()} - ${par(sub1)} = ${value.tex()}`, op: W_.value });
    } else {
      const vals = pieces.map(({ c, k }) => mul(c, pev(powerSum(k), F(hi.n))));
      rows.push({ tex: `= ${stdAt(hi.n)}${pieces.length > 1 ? "" : ` = ${top.tex()}`}`, op: W_.standard });
      if (pieces.length > 1) rows.push({ tex: `= ${join(vals.map((x) => x.tex()))} = ${top.tex()}`, op: W_.value });
      if (lo === 0) {
        value = add(top, pre);
        rows.push({ tex: `= ${pre.tex()} + ${par(top)} = ${value.tex()}`, op: W_.value });
      }
    }
    if (alone) rows[rows.length - 1].color = C.green;
    return { diverges: false, value: value as Q, closed: null };
  }
  rows.push({ tex: `= ${stdAt()}`, op: W_.standard });
  let Pn = P;
  if (lo >= 2) {
    Pn = padd(P, [sub1.neg()]);
    rows.push({ tex: `= ${factorTex(P, v)} - ${par(sub1)}`, op: W_.shift });
  } else if (lo === 0) {
    Pn = padd(P, [pre]);
    rows.push({ tex: `= ${pre.tex()} + ${factorTex(P, v)}`, op: W_.value });
  }
  const std = rows[rows.length - 1];
  if (lo === 1 && std.tex === `= ${factorTex(Pn, v)}`) std.color = alone ? C.green : undefined;
  else rows.push({ tex: `= ${factorTex(Pn, v)}`, op: W_.simplify, color: alone ? C.green : undefined });
  return { diverges: false, value: null, closed: { tex: factorTex(Pn, v), at: (n: number) => pnum(Pn, n) } };
}

/** Σ c·R^k from lo: a geometric series. */
function geoRows(p: { c: Frac; R: Frac }, idx: string, lo: number, hi: Bound, rows: TexLine[], v: string, label: string) {
  const W_ = words.sigma;
  const T = mul(p.c, pw(p.R, lo));
  const countTex = hi.k === "num" ? String(hi.n - lo + 1) : hi.k === "sym" ? polyTex([F(1 - lo), ONE], v) : "\\infty";
  rows.push({ tex: `${label}: \\quad a = ${T.tex()}, \\quad r = ${p.R.tex()}${hi.k === "inf" ? "" : `, \\quad N = ${countTex}`}`, op: W_.geo });
  const small = Math.abs(fnum(p.R)) < 1;
  if (hi.k === "inf") {
    if (!small) return { diverges: true, value: null, limit: null, closed: null };
    const L = div(T, sub(ONE, p.R));
    rows.push({ tex: `\\frac{a}{1 - r} = \\frac{${T.tex()}}{1 - ${par(p.R)}} = ${L.tex()}`, op: words.geom.inf, color: C.green });
    return { diverges: false, value: null, limit: L as Q, closed: null };
  }
  const K = small ? div(T, sub(ONE, p.R)) : div(T, sub(p.R, ONE));
  const pTex = (n: string) => `${baseTex(p.R)}^{${n}}`;
  const form = (n: string) => (K.isOne() ? (small ? `1 - ${pTex(n)}` : `${pTex(n)} - 1`) : `${K.tex()}\\left(${small ? `1 - ${pTex(n)}` : `${pTex(n)} - 1`}\\right)`);
  const formula = small ? `\\frac{a(1 - r^N)}{1 - r} = \\frac{${T.tex()}\\left(1 - ${pTex(countTex)}\\right)}{1 - ${par(p.R)}}` : `\\frac{a(r^N - 1)}{r - 1} = \\frac{${T.tex()}\\left(${pTex(countTex)} - 1\\right)}{${p.R.tex()} - 1}`;
  if (hi.k === "num") {
    const N = hi.n - lo + 1;
    const value: Q = exact(() => mul(K, small ? sub(ONE, pw(p.R, N)) : sub(pw(p.R, N), ONE))) ?? fnum(K) * (small ? 1 - fnum(p.R) ** N : fnum(p.R) ** N - 1);
    rows.push({ tex: `${formula} ${qeq(value)}`, op: W_.geoSum, color: C.green });
    return { diverges: false, value, limit: null, closed: null };
  }
  rows.push({ tex: `${formula} = ${form(countTex)}`, op: W_.geoSum, color: C.green });
  const [k, r] = [fnum(K), fnum(p.R)];
  return { diverges: false, value: null, limit: null, closed: { tex: form(countTex), at: (n: number) => k * (small ? 1 - r ** (n - lo + 1) : r ** (n - lo + 1) - 1) } };
}

/** Σ α(g(k) − g(k + m)): partial fractions, the cancelling, what is left. */
function teleRows(p: Extract<Part, { k: "tele" }>, idx: string, lo: number, hi: Bound, rows: TexLine[], v: string, label: string) {
  const W_ = words.sigma;
  const { alpha, q, s, m } = p;
  // The summand must be defined for every k in the sum.
  for (const z of [-s / q, (-s - q * m) / q]) if (Number.isInteger(z) && z >= lo && (hi.k !== "num" || z <= hi.n)) throw new Error(fill(W_.undefinedAt, { k: `${idx} = ${z}` }));
  const gTex = (off: number, sym: string, frac = "\\frac") => `${frac}{1}{${polyTex([F(s + q * off), F(q)], sym)}}`;
  const gAt = (j: number) => div(ONE, F(q * j + s));
  const small = (f: Frac) => (f.isInt() ? f.tex() : `${f.isNeg() ? "-" : ""}\\tfrac{${Math.abs(f.n)}}{${f.d}}`);
  const wrapA = (t: string) => (alpha.isOne() ? t : `${alpha.tex()}\\left(${t}\\right)`);
  rows.push({ tex: `${label} = ${wrapA(`${gTex(0, idx)} - ${gTex(m, idx)}`)}`, op: W_.partial });
  // The cancelling, line by line.
  const grey = (t: string) => `\\color{#adb5bd}{\\cancel{${t}}}`;
  const fin = hi.k === "num" ? hi.n : null;
  const ks: (number | string | null)[] = [];
  if (fin !== null && fin - lo + 1 <= 5) for (let k = lo; k <= fin; k++) ks.push(k);
  else {
    ks.push(lo, lo + 1, lo + 2, null);
    if (fin !== null) ks.push(fin - 1, fin);
    else if (hi.k === "sym") ks.push("-1", "0");
  }
  const line = (k: number | string | null) => {
    if (k === null) return `& \\quad \\vdots`;
    if (typeof k === "number") {
      const pos = small(gAt(k));
      const neg = small(gAt(k + m));
      return `${idx} = ${k}: & \\quad ${k >= lo + m ? grey(pos) : pos} - ${fin === null || k + m <= fin ? grey(neg) : neg}`;
    }
    const t = Number(k);
    return `${idx} = ${polyTex([F(t), ONE], v)}: & \\quad ${grey(gTex(t, v, "\\tfrac"))} - ${m <= -t ? grey(gTex(t + m, v, "\\tfrac")) : gTex(t + m, v, "\\tfrac")}`;
  };
  rows.push({ tex: `${alpha.isOne() ? "" : `${alpha.tex()} \\times `}\\begin{aligned} ${ks.map(line).join(" \\\\ ")} \\end{aligned}`, op: W_.cancel });
  const left = Array.from({ length: m }, (_, j) => gAt(lo + j));
  const c0 = left.reduce((x, y) => add(x, y), ZERO);
  const leftTex = left.map((x) => x.tex()).join(" + ");
  if (hi.k === "num") {
    const right = Array.from({ length: m }, (_, j) => gAt(hi.n + 1 + j));
    const value: Q = exact(() => mul(alpha, sub(c0, right.reduce((x, y) => add(x, y), ZERO)))) ?? fnum(alpha) * (fnum(c0) - right.reduce((x, y) => x + fnum(y), 0));
    rows.push({ tex: `= ${wrapA(`${leftTex} - ${right.map((x) => x.tex()).join(" - ")}`)} ${qeq(value)}`, op: W_.left, color: C.green });
    return { value, limit: null, closed: null };
  }
  const limit = mul(alpha, c0);
  if (hi.k === "inf") {
    rows.push({ tex: `= ${wrapA(leftTex)}${alpha.isOne() && m === 1 ? "" : ` = ${limit.tex()}`}`, op: W_.left, color: C.green });
    return { value: null, limit: limit as Q, closed: null };
  }
  const rights = Array.from({ length: m }, (_, j) => gTex(1 + j, v));
  let res = wrapA(`${leftTex} - ${rights.join(" - ")}`);
  if (m === 1) {
    // One fraction: α(c0·(q n + s + q) − 1)/(q n + s + q).
    const den: P = [F(s + q), F(q)];
    let num = pscale(padd(pscale(den, c0), [F(-1)]), alpha);
    let dd = den;
    const L = num.reduce((acc, c) => (acc * c.d) / igcd(acc, c.d), 1);
    num = pscale(num, F(L));
    dd = pscale(dd, F(L));
    res += ` = \\frac{${factorTex(num, v)}}{${polyTex(dd, v)}}`;
  }
  rows.push({ tex: `= ${res}`, op: W_.left, color: C.green });
  rows.push({ tex: `${rights.join(", \\; ")} \\to 0 \\;\\Rightarrow\\; \\sum_{${idx}=${lo}}^{\\infty} ${label} = ${limit.tex()}`, op: W_.limit });
  const [A, C0] = [fnum(alpha), fnum(c0)];
  return {
    value: null,
    limit: null,
    closed: { tex: res.split(" = ").pop()!, at: (n: number) => A * (C0 - Array.from({ length: m }, (_, j) => 1 / (q * (n + 1 + j) + s)).reduce((x, y) => x + y, 0)) },
  };
}

// ---------- recurrences ----------

const idxTex = (o: number) => (o === 0 ? "n" : `n ${o > 0 ? "+" : "-"} ${Math.abs(o)}`);
const IDX = (raw: string | undefined) => (raw ? Number(raw.replace(/\s+/g, "")) : 0);

type RecIn = { L: string; order: 1 | 2; off: number; e: E; init: Map<number, Frac>; queries: number[]; lhs: string; rhs: string };

function recurIn(src: string): RecIn {
  let rec: { L: string; off: number; rhs: string } | null = null;
  const init = new Map<number, Frac>();
  const queries: number[] = [];
  for (const item of itemsOf(src)) {
    const m = /^([a-zA-Z])\s*(?:_\s*)?(?:\{\s*n\s*([+-]\s*\d+)?\s*\}|\(\s*n\s*([+-]\s*\d+)?\s*\)|\[\s*n\s*([+-]\s*\d+)?\s*\]|n)\s*=\s*(.+)$/.exec(item);
    if (m) {
      if (rec) throw bad(item);
      rec = { L: m[1], off: IDX(m[2] ?? m[3] ?? m[4]), rhs: m[5] };
      continue;
    }
    const i = /^([a-zA-Z])\s*(?:_\s*)?(?:\{\s*(\d+)\s*\}|\(\s*(\d+)\s*\)|\[\s*(\d+)\s*\]|(\d+))\s*=\s*(.+)$/.exec(item);
    if (i) {
      init.set(Number(i[2] ?? i[3] ?? i[4] ?? i[5]), numOf(i[6]));
      continue;
    }
    const r = refOf(item);
    if (r && typeof r.idx === "number") {
      if (r.idx > 100000) throw bad(item);
      queries.push(r.idx);
      continue;
    }
    throw bad(item);
  }
  if (!rec) throw new Error(words.need.recur);
  const { L, off } = rec;
  if (L === "n" || L === "e") throw bad(rec.rhs);
  const ref = new RegExp(`(?<![a-zA-Z])${L}\\s*(?:_\\s*)?(?:\\{\\s*n\\s*([+-]\\s*\\d+)?\\s*\\}|\\(\\s*n\\s*([+-]\\s*\\d+)?\\s*\\)|\\[\\s*n\\s*([+-]\\s*\\d+)?\\s*\\]|n(?![a-zA-Z]))`, "g");
  let order: 1 | 2 = 1;
  let rhs = rec.rhs.replace(ref, (_all, a?: string, b?: string, c?: string) => {
    const lag = off - IDX(a ?? b ?? c);
    if (lag !== 1 && lag !== 2) throw bad(rec!.rhs);
    if (lag === 2) order = 2;
    return lag === 1 ? " §1 " : " §2 ";
  });
  const onlyVar = fill(words.onlyVar, { v: `${L}ₙ` });
  if (new RegExp(`(?<![a-zA-Z])(${L}|x|y)(?![a-zA-Z])`).test(rhs)) throw new Error(onlyVar);
  rhs = rhs.replace(/§1/g, "x").replace(/§2/g, "y");
  exprMessages({ bad: words.bad, onlyX: onlyVar, tooBig: words.tooBig });
  const e = parseE(rhs, ["y", "n"]);
  const shown = substitute(substitute(e, "x", V(`${L}_{${idxTex(off - 1)}}`)), "y", V(`${L}_{${idxTex(off - 2)}}`));
  return { L, order, off, e, init, queries, lhs: `${L}_{${idxTex(off)}}`, rhs: tex(shown) };
}

/** e at x, y, n — exactly when it is rational. */
function recAt(e: E, x: Q, y: Q, n: number): Q {
  if (typeof x !== "number" && typeof y !== "number") {
    let v: Frac | null = null;
    try {
      v = exact(() => constE(substitute(substitute(substitute(e, "x", N(x)), "y", N(y)), "n", N(F(n)))));
    } catch {
      // 1/0 and the like: the number below is ±∞ or NaN.
    }
    if (v && v.d <= 1e6 && Math.abs(v.n) < 1e15) return v;
  }
  return evalE(e, qnum(x), { y: qnum(y), n });
}

/** ca + cx·x + cy·y when e is linear in x and y with number coefficients. */
function linearOf(e: E): { c: Frac; px: Frac; qy: Frac } | null {
  if (has(e, "n")) return null;
  const at = (x: number, y: number) => {
    try {
      return exact(() => constE(substitute(substitute(e, "x", N(F(x))), "y", N(F(y)))));
    } catch {
      return null;
    }
  };
  const c = at(0, 0);
  const px0 = at(1, 0);
  const qy0 = at(0, 1);
  if (!c || !px0 || !qy0) return null;
  const px = sub(px0, c);
  const qy = sub(qy0, c);
  for (const [x, y] of [[2, 3], [-3, 5], [7, -2], [1, 1]]) {
    const v = at(x, y);
    if (!v || !eq(v, add(c, add(mul(px, F(x)), mul(qy, F(y)))))) return null;
  }
  return { c, px, qy };
}

type Behaviour = { k: "converge"; v: number } | { k: "diverge" } | { k: "cycle"; vs: number[] } | { k: "chaos" } | { k: "constant"; v: number };
function behaviour(us: number[]): Behaviour {
  if (us.some((u) => !Number.isFinite(u) || Math.abs(u) > 1e12)) return { k: "diverge" };
  const n = us.length;
  const close = (a: number, b: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
  if (us.every((u) => close(u, us[0]))) return { k: "constant", v: us[0] };
  const last = us[n - 1];
  if (us.slice(n - 60).every((u) => close(u, last))) return { k: "converge", v: last };
  for (let p = 2; p <= 8; p++) if (us.slice(n - 80).every((u, i, a) => i < p || close(u, a[i - p]))) return { k: "cycle", vs: us.slice(n - p) };
  const tail = us.slice(n - 200);
  if (Math.max(...tail.map(Math.abs)) > 1e8) return { k: "diverge" };
  // Still climbing (or falling) steadily at the end, by steps that don't shrink: no limit.
  const steps = tail.slice(1).map((u, i) => u - tail[i]);
  if (steps.every((d) => d > 0) || steps.every((d) => d < 0)) {
    if (Math.abs(steps[steps.length - 1]) >= Math.abs(steps[0]) * 0.999) return { k: "diverge" };
    if (Math.abs(steps[steps.length - 1]) < Math.abs(steps[0]) * 0.5) return { k: "converge", v: last };
  }
  return { k: "chaos" };
}

// a + b√s as numbers that can be divided.
const qsC = (a: Frac, b: Frac, s: number): QS => (b.isZero() || s === 1 ? { a: s === 1 ? add(a, b) : a, b: ZERO, s: 1 } : { a, b, s });
const qsAdd2 = (x: QS, y: QS) => qsC(add(x.a, y.a), add(x.b, y.b), x.s === 1 ? y.s : x.s);
const qsSub2 = (x: QS, y: QS) => qsAdd2(x, { a: y.a.neg(), b: y.b.neg(), s: y.s });
const qsMul2 = (x: QS, y: QS) => {
  const s = x.s === 1 ? y.s : x.s;
  return qsC(add(mul(x.a, y.a), mul(mul(x.b, y.b), F(s))), add(mul(x.a, y.b), mul(x.b, y.a)), s);
};
function qsDiv2(x: QS, y: QS): QS {
  const conj = { a: y.a, b: y.b.neg(), s: y.s };
  const den = sub(mul(y.a, y.a), mul(mul(y.b, y.b), F(y.s)));
  const top = qsMul2(x, conj);
  return qsC(div(top.a, den), div(top.b, den), top.s);
}
const qsPow2 = (x: QS, k: number) => Array.from({ length: k }, () => x).reduce(qsMul2, qsC(ONE, ZERO, 1));
const qsOf = (f: Frac): QS => qsC(f, ZERO, 1);
const qsWrap = (x: QS) => (x.b.isZero() && !x.a.isNeg() ? qsTex(x) : `\\left(${qsTex(x)}\\right)`);
const qsIsZero = (x: QS) => x.a.isZero() && x.b.isZero();
const qsIsOne = (x: QS) => x.b.isZero() && x.a.isOne();

function renderRecur(src: string): RenderedSvg {
  const W_ = words.recur;
  const R = recurIn(src);
  const { L, order, e, init } = R;
  const rows: TexLine[] = [];
  const caps: Caption[] = [];
  const idxs = [...init.keys()].sort((a, b) => a - b);
  const s0 = idxs.length ? idxs[0] : Math.max(1, R.off - order + 1);
  const need = Array.from({ length: order }, (_, i) => s0 + i);
  if (!need.every((k) => init.has(k))) throw new Error(fill(W_.initial, { list: need.map((k) => `${uName(L, k)} = …`).join(", ") }));
  const startVals: Q[] = need.map((k) => init.get(k)!);
  const nAt = (t: number) => t - R.off;
  const upto = Math.max(3000, ...R.queries.map((q) => q - s0 + 1));
  const vals: Q[] = [...startVals];
  for (let i = order; i < upto; i++) {
    const t = s0 + i;
    const x = vals[i - 1];
    const y = order === 2 ? vals[i - 2] : ZERO;
    vals.push(i < 400 ? recAt(e, x, y, nAt(t)) : evalE(e, qnum(x), { y: qnum(y), n: nAt(t) }));
    if (!Number.isFinite(qnum(vals[i]))) break;
  }
  const u = (t: number): Q => vals[t - s0] ?? NaN;
  const nums = vals.map(qnum);
  const shownCount = order === 1 ? 8 : 10;
  const autonomous = !has(e, "n");

  // The first steps, then the list.
  for (let i = order; i < Math.min(order + 2, vals.length); i++) {
    const t = s0 + i;
    const x = vals[i - 1];
    const y = order === 2 ? vals[i - 2] : null;
    if (typeof x === "number" || (y !== null && typeof y === "number")) break;
    let sub_ = substitute(e, "x", N(x));
    if (y !== null) sub_ = substitute(sub_, "y", N(y as Frac));
    sub_ = substitute(sub_, "n", N(F(nAt(t))));
    rows.push({ tex: `${uTex(L, t)} = ${tex(sub_)} ${qeq(vals[i])}`, op: i === order ? fill(W_.step, { n: idxTex(R.off).replace(/ /g, "") === "n" ? `n = ${nAt(t)}` : `n = ${nAt(t)}` }) : "" });
  }
  const list = vals.slice(0, shownCount);
  const short = (v: Q) => (typeof v === "number" || v.d > 100 ? tn(qnum(v), 4) : v.tex());
  rows.push({ tex: `${uTex(L, s0)}, \\ldots, ${uTex(L, s0 + list.length - 1)}: \\quad ${list.map(short).join(", ")}, \\ldots`, op: words.terms, color: C.blue });

  const lin = linearOf(e);
  let fixed: number[] = [];
  let exactLimit: string | null = null;
  if (order === 1 && lin) {
    const { c: q, px: p } = lin;
    const u0 = startVals[0] as Frac;
    const k0 = s0;
    const pTex = (b: Frac) => `${baseTex(b)}^{${idxTex(-k0)}}`;
    if (p.isOne()) {
      rows.push({ tex: `${uTex(L, idxTex(R.off))} - ${uTex(L, idxTex(R.off - 1))} = ${q.tex()}`, op: W_.arith });
      rows.push({ tex: `${uTex(L, "n")} = ${uTex(L, k0)} + ${k0 === 0 ? "n" : `(n - ${k0})`}d = ${polyTex(trim([sub(u0, mul(q, F(k0))), q]))}`, op: W_.closed, color: C.green });
    } else if (q.isZero()) {
      rows.push({ tex: `${uTex(L, "n")} = ${uTex(L, k0)} \\cdot ${pTex(p)} = ${u0.isOne() ? "" : `${u0.tex()} \\cdot `}${pTex(p)}`, op: W_.geom, color: C.green });
      if (Math.abs(fnum(p)) < 1) exactLimit = "0";
    } else {
      const l = div(q, sub(ONE, p));
      fixed = [fnum(l)];
      rows.push({ tex: `\\ell = ${signed(p, "\\ell", true)}${signed(q, "")} \\;\\Rightarrow\\; \\ell = \\frac{${q.tex()}}{1 - ${par(p)}} = ${l.tex()}`, op: W_.fixed });
      const minusL = `${l.isNeg() ? "+" : "-"} ${iabs(l).tex()}`;
      rows.push({ tex: `${uTex(L, idxTex(R.off))} ${minusL} = ${eq(p, F(-1)) ? "-" : p.tex()}\\left(${uTex(L, idxTex(R.off - 1))} ${minusL}\\right)`, op: W_.shifted });
      const A = sub(u0, l);
      rows.push({ tex: `${uTex(L, "n")} = ${l.tex()}${A.isZero() ? "" : signed(A, ` \\cdot ${pTex(p)}`).replace(/1 \\cdot /, iabs(A).isOne() ? "" : "1 \\cdot ")}`, op: W_.closed, color: C.green });
      if (Math.abs(fnum(p)) < 1 || A.isZero()) exactLimit = l.tex();
    }
  } else if (order === 1 && autonomous) {
    // Fixed points of a curved map.
    const fx = (x: number) => evalE(e, x);
    const poly = toPoly(e);
    if (poly && deg(trim(poly)) >= 2 && deg(trim(poly)) <= 4) {
      const g = padd(trim(poly), [ZERO, F(-1)]);
      const roots = realRoots(g);
      fixed = [...roots.exact.map(qsNum), ...roots.approx].sort((a, b) => a - b);
      const shown = [...roots.exact.map(qsTex), ...roots.approx.map((x) => `${tn(x, 4)}`)];
      rows.push({ tex: `\\ell = ${tex(substitute(e, "x", V("\\ell")))} \\;\\Rightarrow\\; ${polyTex(g, "\\ell")} = 0${shown.length ? ` \\;\\Rightarrow\\; \\ell = ${shown.join(", \\; ")}` : ""}`, op: W_.fixedEq });
    } else {
      const g = (x: number) => fx(x) - x;
      const lo = Math.min(-10, ...nums.slice(0, 50).filter(Number.isFinite)) - 1;
      const hi = Math.max(10, ...nums.slice(0, 50).filter(Number.isFinite)) + 1;
      const steps = 4000;
      for (let i = 0; i < steps; i++) {
        let [a, b] = [lo + ((hi - lo) * i) / steps, lo + ((hi - lo) * (i + 1)) / steps];
        const [ga, gb] = [g(a), g(b)];
        if (!Number.isFinite(ga) || !Number.isFinite(gb) || ga * gb > 0) continue;
        for (let k = 0; k < 80; k++) {
          const mid = (a + b) / 2;
          if (g(a) * g(mid) <= 0) b = mid;
          else a = mid;
        }
        const x = (a + b) / 2;
        if (Math.abs(g(x)) < 1e-6 && !fixed.some((f) => Math.abs(f - x) < 1e-7)) fixed.push(x);
      }
      rows.push({ tex: `\\ell = ${tex(substitute(e, "x", V("\\ell")))}${fixed.length ? ` \\;\\Rightarrow\\; \\ell \\approx ${fixed.map((x) => tn(x, 4)).join(", \\; ")}` : ""}`, op: W_.fixedEq });
    }
    if (fixed.length) {
      try {
        const d = simp(derive(e));
        const at = fixed.map((x) => {
          const v0 = evalE(d, x);
          const v = Math.abs(v0) < 1e-9 ? 0 : v0;
          return `f'(${tn(x, 4)}) ${Number.isInteger(v * 1e4) ? "=" : "\\approx"} ${tn(v, 3)}`;
        });
        rows.push({ tex: `f'(x) = ${tex(d)}, \\quad ${at.join(", \\; ")}`, op: W_.deriv });
        for (const x of fixed) {
          const v = Math.abs(evalE(d, x));
          if (Number.isFinite(v)) caps.push({ text: fill(Math.abs(v - 1) < 1e-9 ? W_.neutral : v < 1 ? W_.attract : W_.repel, { l: nt(x, 4), d: nt(v < 1e-9 ? 0 : v, 3) }) });
        }
      } catch {
        // No derivative: the picture still shows it.
      }
    }
  } else if (order === 2 && lin) {
    const { c, px: p, qy: q } = lin;
    const roots = realRoots([q.neg(), p.neg(), ONE]).exact;
    rows.push({ tex: `\\lambda^2 = ${signed(p, "\\lambda", true)}${signed(q, "")} \\;\\Rightarrow\\; ${polyTex([q.neg(), p.neg(), ONE], "\\lambda")} = 0${roots.length ? ` \\;\\Rightarrow\\; \\lambda = ${roots.map(qsTex).join(", \\; ")}` : ""}`, op: W_.charEq });
    const den = sub(sub(ONE, p), q);
    let K: Frac | null = ZERO;
    if (!c.isZero()) {
      K = den.isZero() ? null : div(c, den);
      if (K) rows.push({ tex: `K = ${signed(p, "K", true)}${signed(q, "K")}${signed(c, "")} \\;\\Rightarrow\\; K = ${K.tex()}`, op: W_.fixed });
    }
    const u0 = sub(startVals[0] as Frac, K ?? ZERO);
    const u1 = sub(startVals[1] as Frac, K ?? ZERO);
    const Kt = K && !K.isZero() ? signed(K, "") : "";
    if (!roots.length) caps.push({ text: W_.complex });
    else if (K) {
      const k0 = s0;
      if (roots.length === 2) {
        const [al, be] = roots[1] && Math.abs(qsNum(roots[1])) >= Math.abs(qsNum(roots[0])) ? [roots[1], roots[0]] : [roots[0], roots[1]];
        const pow = (r: QS) => (qsIsOne(r) ? "" : `${r.b.isZero() && !r.a.isNeg() ? " \\cdot " : ""}${qsWrap(r)}^{n}`);
        rows.push({ tex: `${uTex(L, "n")} = A${pow(al)} + B${pow(be)}${Kt}`, op: W_.general });
        const consts = exact(() => {
          const [a0, b0] = [qsPow2(al, k0), qsPow2(be, k0)];
          const B = qsDiv2(qsSub2(qsOf(u1), qsMul2(al, qsOf(u0))), qsMul2(b0, qsSub2(be, al)));
          const A = qsDiv2(qsSub2(qsOf(u0), qsMul2(B, b0)), a0);
          return [A, B] as const;
        });
        if (consts) {
          const [A, B] = consts;
          rows.push({ tex: `${uTex(L, k0)} = ${(startVals[0] as Frac).tex()}, \\; ${uTex(L, k0 + 1)} = ${(startVals[1] as Frac).tex()} \\;\\Rightarrow\\; A = ${qsTex(A)}, \\; B = ${qsTex(B)}`, op: W_.constants });
          const termT = (C0: QS, r: QS, first: boolean) => {
            if (qsIsZero(C0)) return "";
            const neg = qsNum(C0) < 0;
            const C_ = neg ? qsC(C0.a.neg(), C0.b.neg(), C0.s) : C0;
            const coef = qsIsOne(C_) ? "" : C_.b.isZero() || C_.a.isZero() ? qsTex(C_) : qsWrap(C_);
            const t = qsIsOne(r) ? qsTex(C_) : `${coef}${qsWrap(r)}^{n}`;
            return first ? `${neg ? "-" : ""}${t}` : ` ${neg ? "-" : "+"} ${t}`;
          };
          const body = (termT(A, al, true) + termT(B, be, qsIsZero(A))).trim() || "0";
          rows.push({ tex: `${uTex(L, "n")} = ${body}${Kt}`, op: W_.closed, color: C.green });
        }
        if (Math.abs(qsNum(al)) !== Math.abs(qsNum(be))) caps.push({ text: fill(W_.ratio, { r: al.b.isZero() ? qsPlain(al) : `${qsPlain(al)} ≈ ${nt(qsNum(al), 6)}` }) });
      } else {
        const al = roots[0];
        const powA = qsIsOne(al) ? "" : `${qsWrap(al)}^{n}`;
        rows.push({ tex: `${uTex(L, "n")} = ${powA ? "(A + Bn)" : "A + Bn"}${powA}${Kt}`, op: W_.general });
        const a = al.a;
        if (!a.isZero()) {
          const r = exact(() => {
            // (A + B k0) a^k0 = u0, (A + B(k0+1)) a^(k0+1) = u1.
            const e1 = div(u0, pw(a, k0));
            const e2 = div(u1, pw(a, k0 + 1));
            const B = sub(e2, e1);
            return [sub(e1, mul(B, F(k0))), B] as const;
          });
          if (r) {
            const [A, B] = r;
            rows.push({ tex: `A = ${A.tex()}, \\; B = ${B.tex()}`, op: W_.constants });
            rows.push({ tex: `${uTex(L, "n")} = ${a.isOne() ? polyTex(trim([A, B])) : `\\left(${polyTex(trim([A, B]))}\\right)${baseTex(a)}^{n}`}${Kt}`, op: W_.closed, color: C.green });
          }
        }
      }
    }
  }

  // Questions about single terms.
  for (const t of R.queries) {
    if (t < s0) continue;
    rows.push({ tex: `${uTex(L, t)} ${qeq(u(t))}`, op: fill(words.term, { u: uName(L, t) }), color: C.blue });
    caps.push({ text: `${uName(L, t)} ${qp(u(t))}` });
  }

  // What happens in the long run.
  const bad_ = nums.findIndex((x) => !Number.isFinite(x));
  const b: Behaviour | null = bad_ > 0 && Math.abs(nums[bad_ - 1]) < 1e12 ? null : behaviour(nums.slice(0, 3000));
  if (!b) caps.unshift({ text: fill(W_.undefinedTerm, { u: uName(L, s0 + bad_) }), color: C.red });
  else if (b.k === "converge") caps.unshift({ text: fill(W_.converge, { l: exactLimit && Math.abs(fnum(numOfTex(exactLimit)) - b.v) < 1e-6 ? plainTex(exactLimit) : nt(b.v, 6) }), color: C.green });
  else if (b.k === "constant") caps.unshift({ text: fill(W_.constant, { v: nt(b.v, 6) }), color: C.green });
  else if (b.k === "diverge") caps.unshift({ text: W_.diverge, color: C.red });
  else if (b.k === "cycle") caps.unshift({ text: fill(W_.cycle, { k: b.vs.length, list: b.vs.map((x) => nt(x, 4)).join(", ") }), color: C.orange });
  else caps.unshift({ text: W_.chaos, color: C.orange });

  const T = Math.max(order === 1 ? 15 : 12, Math.min(40, Math.max(0, ...R.queries) - s0 + 1));
  const ns = Array.from({ length: Math.min(T, nums.length) }, (_, i) => s0 + i);
  const vs = ns.map((t) => qnum(u(t)));
  const lim = b?.k === "converge" ? { v: b.v, label: `ℓ = ${nt(b.v, 4)}` } : undefined;
  let pic: Pic;
  if (order === 1 && autonomous && vs.every(Number.isFinite)) {
    const fx = (x: number) => evalE(e, x);
    pic = { svg: cobweb(fx, vs, fixed, L) + panel("seqR", 372, 8, 250, 230, ns, vs, { title: `${L}ₙ`, color: C.blue, limit: lim }), h: 260 };
    caps.push({ text: W_.cobweb });
  } else pic = { svg: panel("seqR", 52, 8, 570, 230, ns, vs, { title: `${L}ₙ`, color: C.blue, limit: lim }), h: 260 };
  const initTex = need.map((k) => `${uTex(L, k)} = ${(init.get(k) as Frac).tex()}`).join(", \\; ");
  return finish(`${R.lhs} = ${R.rhs}, \\quad ${initTex}`, rows, [pic], caps);
}
const numOfTex = (t: string) => {
  const m = /^(-)?\\frac\{(\d+)\}\{(\d+)\}$/.exec(t);
  return m ? F((m[1] ? -1 : 1) * Number(m[2]), Number(m[3])) : F(Number(t));
};
const plainTex = (t: string) => fp(numOfTex(t));

// ---------- the tool ----------

export function renderSequences(spec: SeqSpec, w: SeqWords): RenderedSvg {
  words = w;
  exprMessages({ bad: w.bad, onlyX: fill(w.onlyVar, { v: "n" }), tooBig: w.tooBig });
  try {
    switch (spec.topic) {
      case "pattern":
        return renderPattern(spec.src);
      case "arith":
        return renderArith(spec.src);
      case "geom":
        return renderGeom(spec.src);
      case "sigma":
        return renderSigma(spec.src);
      case "recur":
        return renderRecur(spec.src);
    }
  } catch (e) {
    if (e instanceof TooBig) throw new Error(w.tooBig);
    throw e;
  }
}

const S = (topic: SeqTopic, src: string): SeqSpec => ({ topic, src });
export const SEQ_PRESETS: { [K in SeqTopic]: { label: string; spec: SeqSpec }[] } = {
  pattern: [
    { label: "5, 8, 11, 14, …", spec: S("pattern", "5, 8, 11, 14, 17; u50") },
    { label: "2, 5, 10, 17, 26", spec: S("pattern", "2, 5, 10, 17, 26; = 401") },
    { label: "3, 6, 12, 24", spec: S("pattern", "3, 6, 12, 24, 48") },
    { label: "1, 3, 6, 10, 15", spec: S("pattern", "1, 3, 6, 10, 15, 21") },
    { label: "1, 8, 27, 64", spec: S("pattern", "1, 8, 27, 64, 125, 216") },
    { label: "1, 1, 2, 3, 5, 8", spec: S("pattern", "1, 1, 2, 3, 5, 8, 13") },
  ],
  arith: [
    { label: "3, 7, 11, …", spec: S("arith", "3, 7, 11, 15, …; u20; S20") },
    { label: "u₅ = 17, u₁₂ = 38", spec: S("arith", "u5 = 17, u12 = 38; S10") },
    { label: "1 + 2 + … + 100", spec: S("arith", "1, 2, 3, …, 100") },
    { label: "a = 2, S₁₀ = 155", spec: S("arith", "a = 2, S10 = 155") },
    { label: "Sₙ > 500", spec: S("arith", "4, 7, 10, …; Sn > 500") },
    { label: "50, 46, 42, …", spec: S("arith", "50, 46, 42, …; un < 0") },
  ],
  geom: [
    { label: "2, 6, 18, …", spec: S("geom", "2, 6, 18, …; u8; S8") },
    { label: "16, 8, 4, … S∞", spec: S("geom", "16, 8, 4, …; S∞") },
    { label: "u₂ = 6, u₅ = 162", spec: S("geom", "u2 = 6, u5 = 162") },
    { label: "uₙ > 1000", spec: S("geom", "a = 3, r = 2; un > 1000") },
    { label: "S∞ = 12, a = 4", spec: S("geom", "a = 4, S∞ = 12; S5") },
    { label: "8, −4, 2, …", spec: S("geom", "8, -4, 2, …; S∞") },
  ],
  sigma: [
    { label: "Σ (3k − 2), k = 1…20", spec: S("sigma", "sum k=1..20 (3k - 2)") },
    { label: "Σ r(r + 1), r = 1…n", spec: S("sigma", "sum r=1..n r(r + 1)") },
    { label: "Σ k², k = 11…20", spec: S("sigma", "sum k=11..20 k^2") },
    { label: "Σ 3·2ᵏ", spec: S("sigma", "sum k=1..10 3*2^k") },
    { label: "Σ 1/(k(k + 1))", spec: S("sigma", "sum k=1..n 1/(k(k + 1))") },
    { label: "1 + ½ + ¼ + …", spec: S("sigma", "1 + 1/2 + 1/4 + 1/8 + …") },
    { label: "1 + 4 + 7 + … + 100", spec: S("sigma", "1 + 4 + 7 + … + 100") },
  ],
  recur: [
    { label: "uₙ₊₁ = ½uₙ + 3", spec: S("recur", "u(n+1) = u(n)/2 + 3; u(1) = 2") },
    { label: "uₙ₊₁ = 2uₙ + 1", spec: S("recur", "u(n+1) = 2u(n) + 1; u(1) = 1") },
    { label: "xₙ₊₁ = √(xₙ + 2)", spec: S("recur", "x(n+1) = sqrt(x(n) + 2); x(1) = 0") },
    { label: "uₙ₊₁ = 3.2uₙ(1 − uₙ)", spec: S("recur", "u(n+1) = 3.2u(n)(1 - u(n)); u(0) = 0.2") },
    { label: "Fibonacci", spec: S("recur", "F(n+2) = F(n+1) + F(n); F(1) = 1; F(2) = 1; F(20)") },
    { label: "uₙ₊₂ = 5uₙ₊₁ − 6uₙ", spec: S("recur", "u(n+2) = 5u(n+1) - 6u(n); u(0) = 2; u(1) = 5") },
  ],
};
