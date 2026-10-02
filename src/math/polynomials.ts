// Polynomials beyond quadratics: long and synthetic division with the remainder theorem; the factor and remainder
// theorems with unknown coefficients (each condition becomes an equation, solved together); solving cubics and quartics
// (a common factor, a hidden quadratic, rational roots found by trial and divided out, then the quadratic formula) and
// polynomial inequalities with a sign table; the binomial expansion of (a + b)ⁿ with Pascal's triangle, a single term,
// and the binomial series for any power with its interval of validity; simultaneous equations where one is linear and
// the other a curve; partial fractions by substitution (the cover-up rule) and comparing coefficients. All exact.
import { axes, C, compose, curve, dot, fill, lbl, makeFrame, r2, sampleY, texLines, tn, W, yRange, type Caption, type Frame, type TexLine } from "./chart";
import { add, exprMessages, gcd, mul, N, neg, numericRoots, parseE, powFrac, qs, qsAdd, qsMul, qsNum, qsTex, realRoots, rootFrac, sqrtSplit, substitute, tex, V, type E, type QS } from "./expr";
import { Frac } from "./fraction";
import { latexToSvg, type RenderedSvg } from "./latex";

export type PolyTopic = "divide" | "theorem" | "solve" | "binomial" | "simultaneous" | "partial";
export const POLY_TOPICS: PolyTopic[] = ["divide", "theorem", "solve", "binomial", "simultaneous", "partial"];
export type PolySpec = { topic: PolyTopic; src: string };

export type PolyWords = {
  bad: string;
  onlyX: string;
  tooBig: string;
  need: Record<PolyTopic, string>;
  notPoly: string;
  tooHigh: string;
  noX: string;
  or: string;
  lhs: string;
  rhs: string;
  divide: {
    identity: string;
    fraction: string;
    remThm: string;
    isFactor: string;
    remainder: string;
    lower: string;
    constDivisor: string;
    longCap: string;
    syntheticCap: string;
    scaled: string;
  };
  theorem: {
    factorThm: string;
    remThm: string;
    given: string;
    substitute: string;
    simplify: string;
    rearrange: string;
    divide: string;
    into: string;
    from: string;
    solveTogether: string;
    back: string;
    factorise: string;
    isFactor: string;
    notFactor: string;
    holds: string;
    fails: string;
    badClause: string;
    needLinear: string;
    nonLinear: string;
    tooFew: string;
    noUnique: string;
    search: string;
    found: string;
    graphCap: string;
  };
  solve: {
    rearrange: string;
    flip: string;
    times: string;
    takeOut: string;
    divide: string;
    candidates: string;
    root: string;
    division: string;
    factorise: string;
    discriminant: string;
    formula: string;
    noReal: string;
    substitute: string;
    back: string;
    noRational: string;
    factored: string;
    roots: string;
    repeated: string;
    noRoots: string;
    solution: string;
    interval: string;
    all: string;
    none: string;
    graphCap: string;
    ineqCap: string;
    signCap: string;
    syntheticCap: string;
  };
  binomial: {
    theorem: string;
    term: string;
    expansion: string;
    general: string;
    power: string;
    coefficient: string;
    noTerm: string;
    takeOut: string;
    series: string;
    valid: string;
    validCap: string;
    pascal: string;
    estimate: string;
    exact: string;
    errorCap: string;
    notTwo: string;
    needConst: string;
    needExact: string;
    tooBigN: string;
    firstTerms: string;
  };
  sim: {
    subject: string;
    substitute: string;
    collect: string;
    divide: string;
    discriminant: string;
    two: string;
    one: string;
    none: string;
    factorise: string;
    formula: string;
    back: string;
    solutions: string;
    needTwo: string;
    needLinear: string;
    tooHigh: string;
    always: string;
    never: string;
    numeric: string;
    graphCap: string;
  };
  partial: {
    improper: string;
    factor: string;
    scale: string;
    setup: string;
    multiply: string;
    substitute: string;
    compare: string;
    solve: string;
    result: string;
    check: string;
    needFraction: string;
    hardDen: string;
    polyOnly: string;
    coverCap: string;
    compareCap: string;
  };
};

/** What was worked out, for the tests. */
export type PolyData = {
  q?: number[];
  r?: number[];
  values?: Record<string, number>;
  poly?: number[];
  roots?: number[];
  set?: { lo: number; hi: number; loIn: boolean; hiIn: boolean }[];
  terms?: [number, number][];
  coef?: number;
  valid?: number;
  points?: [number, number][];
  pf?: (x: number) => number;
};

let words: PolyWords;
let data: PolyData = {};

// ---------- exact numbers and polynomials (coefficients from x⁰ up) ----------

const F = (n: number, d = 1) => new Frac(n, d);
const ZERO = F(0);
const ONE = F(1);
const MINUS = F(-1);
/** Fractions stay exact only while their products fit in a double. */
function chk(f: Frac): Frac {
  if (!Number.isSafeInteger(f.n) || !Number.isSafeInteger(f.d) || Math.abs(f.n) > 6e7 || f.d > 6e7) throw new Error(words.tooBig);
  return f;
}

type P = Frac[];
function ptrim(p: P): P {
  let d = p.length - 1;
  while (d > 0 && p[d].isZero()) d--;
  return p.slice(0, Math.max(d + 1, 1));
}
const pdeg = (p: P) => {
  const t = ptrim(p);
  return t.length === 1 && t[0].isZero() ? -1 : t.length - 1;
};
const lead = (p: P) => {
  const t = ptrim(p);
  return t[t.length - 1];
};
const at = (p: P, k: number) => p[k] ?? ZERO;
const padd = (a: P, b: P): P => ptrim(Array.from({ length: Math.max(a.length, b.length) }, (_, i) => chk(at(a, i).add(at(b, i)))));
const pscale = (a: P, k: Frac): P => ptrim(a.map((x) => chk(x.mul(k))));
const psub = (a: P, b: P): P => padd(a, pscale(b, MINUS));
function pmul(a: P, b: P): P {
  const r = Array.from({ length: a.length + b.length - 1 }, () => ZERO);
  a.forEach((x, i) => b.forEach((y, j) => (r[i + j] = chk(r[i + j].add(chk(x.mul(y)))))));
  return ptrim(r);
}
const xk = (c: Frac, k: number): P => Array.from({ length: k + 1 }, (_, i) => (i === k ? c : ZERO));
function pdivmod(a: P, b: P): { q: P; r: P } {
  let r = ptrim(a);
  const db = pdeg(b);
  const q: Frac[] = Array.from({ length: Math.max(pdeg(a) - db + 1, 1) }, () => ZERO);
  while (pdeg(r) >= db && pdeg(r) >= 0) {
    const k = pdeg(r) - db;
    const c = chk(lead(r).div(lead(b)));
    q[k] = c;
    r = psub(r, pmul(xk(c, k), b));
  }
  return { q: ptrim(q), r };
}
const pval = (p: P, x: Frac): Frac => p.reduceRight((acc, c) => chk(chk(acc.mul(x)).add(c)), ZERO);
const pnum = (p: P, x: number) => p.reduceRight((acc, c) => acc * x + c.toNumber(), 0);
const pqs = (p: P, x: QS): QS => p.reduceRight<QS>((acc, c) => qsAdd(qsMul(acc, x), qs(c)), qs(ZERO));
const pderiv = (p: P): P => (p.length <= 1 ? [ZERO] : ptrim(p.slice(1).map((c, i) => chk(c.mul(F(i + 1))))));
const lcmDen = (cs: Frac[]) => cs.reduce((acc, c) => (acc * c.d) / gcd(acc, c.d), 1);
/** p = k·q with q whole, coprime and leading positive. */
function content(p: P): { k: Frac; q: P } {
  const L = lcmDen(p);
  const ints = p.map((c) => chk(c.mul(F(L))).n);
  let g = ints.reduce((acc, c) => gcd(acc, c), 0) || 1;
  if (lead(p).isNeg()) g = -g;
  return { k: F(g, L), q: ptrim(ints.map((c) => F(c / g))) };
}
const nums = (p: P) => ptrim(p).map((c) => c.toNumber() + 0);

// ---------- writing polynomials ----------

/** One term with its sign: "-3x^{2}", "+ \frac{1}{2}x", "+ \frac{2}{x^{2}}"; the first has no plus. */
function termTex(c: Frac, k: number, first: boolean, v = "x"): string {
  const a = c.abs();
  let body: string;
  if (k === 0) body = a.tex();
  else if (k > 0) body = `${a.isOne() ? "" : a.tex()}${k === 1 ? v : `${v}^{${k}}`}`;
  else body = `\\frac{${a.n}}{${a.d === 1 ? "" : a.d}${k === -1 ? v : `${v}^{${-k}}`}}`;
  return first ? (c.isNeg() ? `-${body}` : body) : `${c.isNeg() ? "-" : "+"} ${body}`;
}
function polyTex(p: P, v = "x", ascending = false): string {
  const ks = Array.from({ length: p.length }, (_, k) => k).filter((k) => !p[k].isZero());
  if (!ascending) ks.reverse();
  return ks.map((k, i) => termTex(p[k], k, i === 0, v)).join(" ") || "0";
}
/** Terms (power, coefficient) in the given order. */
const termsTex = (ts: [number, Frac][], v = "x") => ts.filter(([, c]) => !c.isZero()).map(([k, c], i) => termTex(c, k, i === 0, v)).join(" ") || "0";
const br = (t: string) => `\\left(${t}\\right)`;
/** The factor (bx − a) of the root a/b. */
const facP = (r: Frac): P => [F(-r.n), F(r.d)];
const facTex = (r: Frac, v = "x") => polyTex(facP(r), v);
/** + p, written after other terms: "+ 7", "- 3", "+ (2x + 1)". */
function plusTex(p: P): string {
  if (pdeg(p) < 0) return "";
  const nz = p.map((c, k) => [k, c] as [number, Frac]).filter(([, c]) => !c.isZero());
  return nz.length === 1 ? termTex(nz[0][1], nz[0][0], false) : `+ ${br(polyTex(p))}`;
}
/** 2(2)^3 − 3(2)^2 + 4(2) − 5 */
function substTex(p: P, x: Frac, v = "x"): string {
  const xt = br(x.tex());
  let out = "";
  for (let k = pdeg(p); k >= 0; k--) {
    const c = at(p, k);
    if (c.isZero()) continue;
    const a = c.abs();
    const body = k === 0 ? a.tex() : `${a.isOne() ? "" : a.tex()}${xt}${k === 1 ? "" : `^{${k}}`}`;
    out += out ? ` ${c.isNeg() ? "-" : "+"} ${body}` : c.isNeg() ? `-${body}` : body;
  }
  void v;
  return out || "0";
}
/** 16 − 12 + 8 − 5: the value of each term. */
function valuesTex(p: P, x: Frac): string {
  let out = "";
  for (let k = pdeg(p); k >= 0; k--) {
    const c = at(p, k);
    if (c.isZero()) continue;
    const t = chk(c.mul(powFrac(x, k)));
    out += out ? ` ${t.isNeg() ? "-" : "+"} ${t.abs().tex()}` : t.tex();
  }
  return out || "0";
}

// ---------- factorising over the rationals ----------

function divisors(n: number): number[] {
  n = Math.abs(n);
  const out: number[] = [];
  for (let i = 1; i <= Math.min(n, 1e5); i++) if (n % i === 0) out.push(i);
  return out;
}
/** ±p/q with p | constant, q | leading coefficient, smallest first. */
function candidates(p: P): Frac[] {
  const { q } = content(p);
  const seen = new Set<string>();
  const out: Frac[] = [];
  for (const a of divisors(q[0].n))
    for (const b of divisors(lead(q).n)) {
      const f = F(a, b);
      if (seen.has(`${f.n}/${f.d}`)) continue;
      seen.add(`${f.n}/${f.d}`);
      out.push(f);
    }
  out.sort((x, y) => x.toNumber() - y.toNumber());
  return out.flatMap((f) => [f, f.neg()]);
}
const isRoot = (p: P, r: Frac) => pval(p, r).isZero();
function findRoot(p: P): Frac | null {
  if (at(p, 0).isZero()) return ZERO;
  return candidates(p).find((r) => isRoot(p, r)) ?? null;
}
/** p = K·∏(bx − a)^m·rest, the rest whole and coprime with no rational roots. */
type Factored = { K: Frac; roots: { r: Frac; m: number }[]; rest: P | null };
function factorQ(p0: P): Factored {
  let p = ptrim(p0);
  const roots: { r: Frac; m: number }[] = [];
  while (pdeg(p) >= 1) {
    const r = pdeg(p) === 1 ? chk(at(p, 0).neg().div(at(p, 1))) : findRoot(p);
    if (!r) break;
    const e = roots.find((x) => x.r.sub(r).isZero());
    if (e) e.m++;
    else roots.push({ r, m: 1 });
    p = pscale(pdivmod(p, [r.neg(), ONE]).q, F(1, r.d));
  }
  roots.sort((x, y) => Number(!x.r.isZero()) - Number(!y.r.isZero()) || x.r.toNumber() - y.r.toNumber());
  if (pdeg(p) <= 0) return { K: at(p, 0), roots, rest: null };
  const c = content(p);
  return { K: c.k, roots, rest: c.q };
}
function factorParts(f: Factored, v = "x"): string[] {
  const parts = f.roots.map(({ r, m }) => {
    const plain = r.isZero();
    const b = plain ? v : br(facTex(r, v));
    return m > 1 ? `${b}^{${m}}` : b;
  });
  if (f.rest) parts.push(br(polyTex(f.rest, v)));
  return parts;
}
function factoredTex(f: Factored, v = "x"): string {
  const parts = factorParts(f, v);
  if (!parts.length) return f.K.tex();
  const k = f.K.isOne() ? "" : f.K.n === -1 && f.K.d === 1 ? "-" : f.K.tex();
  if (parts.length === 1 && !k && parts[0].startsWith("\\left(") && parts[0].endsWith("\\right)")) return parts[0].slice(6, -7);
  return k + parts.join("");
}
const factorCount = (f: Factored) => f.roots.reduce((s, r) => s + r.m, 0) + (f.rest ? 1 : 0);

// ---------- pictures ----------

type Pic = { svg: string; h: number; w?: number };
const cache = new Map<string, RenderedSvg>();
function tx(t: string, color: string = C.ink): RenderedSvg {
  const key = `${color}|${t}`;
  let r = cache.get(key);
  if (!r) {
    if (cache.size > 800) cache.clear();
    r = latexToSvg(t, color);
    cache.set(key, r);
  }
  return r;
}
const twidth = (t: string) => tx(t).width;
/** A LaTeX snippet with its vertical centre at y. */
function put(t: string, x: number, y: number, anchor: "start" | "middle" | "end" = "middle", color: string = C.ink, scale = 1): string {
  const r = tx(t, color);
  const [w, h] = [r.width * scale, r.height * scale];
  const x0 = anchor === "start" ? x : anchor === "middle" ? x - w / 2 : x - w;
  return r.svg
    .replace(/width="[\d.]+"/, `width="${r2(w)}"`)
    .replace(/height="[\d.]+"/, `height="${r2(h)}"`)
    .replace(/^<svg/, `<svg x="${r2(x0)}" y="${r2(y - h / 2)}"`);
}
const line = (x1: number, y1: number, x2: number, y2: number, color: string, width = 1.4, extra = "") =>
  `<line x1="${r2(x1)}" y1="${r2(y1)}" x2="${r2(x2)}" y2="${r2(y2)}" stroke="${color}" stroke-width="${width}" ${extra}/>`;
/** Shrinks a picture that is too wide. */
function fit(svg: string, w: number, h: number, max = W - 24): Pic {
  if (w <= max) return { svg, h, w };
  const k = max / w;
  return { svg: `<g transform="scale(${r2(k * 1000) / 1000})">${svg}</g>`, h: h * k, w: max };
}
/** Pictures side by side while they fit, then on the next line. */
function flow(pics: Pic[], gap = 24): Pic[] {
  const out: Pic[] = [];
  let cur: Pic[] = [];
  const flush = () => {
    if (!cur.length) return;
    const tw = cur.reduce((s, p) => s + (p.w ?? W), 0) + gap * (cur.length - 1);
    let x = 0;
    const svg = cur.map((p) => {
      const s = `<g transform="translate(${r2(x)} 0)">${p.svg}</g>`;
      x += (p.w ?? W) + gap;
      return s;
    });
    out.push({ svg: svg.join(""), h: Math.max(...cur.map((p) => p.h)), w: tw });
    cur = [];
  };
  for (const p of pics) {
    const tw = cur.reduce((s, q) => s + (q.w ?? W) + gap, 0) + (p.w ?? W);
    if (cur.length && tw > W - 24) flush();
    cur.push(p);
  }
  flush();
  return out;
}
function finish(header: string, rows: TexLine[], pics: Pic[], caps: Caption[]): RenderedSvg {
  const ln = texLines(rows, 4);
  let y = 4 + ln.h + (rows.length ? 10 : 0);
  let body = ln.svg;
  for (const p of pics) {
    body += `<g transform="translate(${r2((W - (p.w ?? W)) / 2)} ${r2(y)})">${p.svg}</g>`;
    y += p.h + 10;
  }
  return compose(header, body, y, caps);
}

type Curve = { f: (x: number) => number; color: string; dash?: boolean; width?: number };
type Mark = { x: number; y: number; color: string; label?: string; hollow?: boolean };
type Seg = { lo: number; hi: number; loIn: boolean; hiIn: boolean };
let frameNo = 0;
/** y = f(x) around the points that matter, with marked points, a solution set on the axis or a shaded strip. */
function graphPic(curves: Curve[], focus: number[], marks: Mark[], o: { shade?: Seg[]; strip?: [number, number]; xr?: [number, number]; yr?: [number, number]; h?: number } = {}): Pic {
  const fx = focus.filter(Number.isFinite);
  const [lo, hi] = fx.length ? [Math.min(...fx), Math.max(...fx)] : [0, 0];
  const span = Math.max(hi - lo, 2);
  const [x0, x1] = o.xr ?? [lo - span * 0.35 - 0.6, hi + span * 0.35 + 0.6];
  const [i0, i1] = o.xr ? [o.xr[0] + (o.xr[1] - o.xr[0]) * 0.08, o.xr[1] - (o.xr[1] - o.xr[0]) * 0.08] : [lo - span * 0.08 - 0.15, hi + span * 0.08 + 0.15];
  const ys = curves.flatMap((c) => sampleY(c.f, i0, i1, 400));
  const [y0, y1] = o.yr ?? yRange(ys, [0, ...marks.filter((m) => m.x >= x0 && m.x <= x1).map((m) => m.y)]);
  const H = o.h ?? 290;
  const fr = makeFrame(`pg${++frameNo}`, 48, 8, W - 48 - 18, H, [x0, x1], [y0, y1]);
  let svg = axes(fr);
  if (o.strip) {
    const [a, b] = [Math.max(fr.sx(o.strip[0]), fr.left), Math.min(fr.sx(o.strip[1]), fr.right)];
    if (b > a) svg += `<rect x="${r2(a)}" y="${fr.top}" width="${r2(b - a)}" height="${fr.bottom - fr.top}" fill="${C.purple}" opacity="0.08"/>`;
    for (const s of o.strip) if (s > x0 && s < x1) svg += line(fr.sx(s), fr.top, fr.sx(s), fr.bottom, C.purple, 1.2, `stroke-dasharray="5 4"`);
  }
  if (o.shade) svg += shadeAxis(fr, o.shade);
  for (const c of curves) svg += curve(fr, c.f, c.color, c.width ?? 2.4, c.dash ? `stroke-dasharray="7 5"` : "");
  for (const m of marks) {
    if (m.x < x0 || m.x > x1 || m.y < y0 || m.y > y1) continue;
    svg += dot(fr.sx(m.x), fr.sy(m.y), m.color, 4.5, m.hollow);
    if (m.label) {
      const right = fr.sx(m.x) < fr.right - 90;
      svg += lbl(fr.sx(m.x) + (right ? 8 : -8), fr.sy(m.y) - 9, m.label, m.color, right ? "start" : "end", 12.5, false);
    }
  }
  return { svg, h: H + 26 };
}
function shadeAxis(fr: Frame, segs: Seg[]): string {
  let s = "";
  const y = Math.min(Math.max(fr.sy(0), fr.top), fr.bottom);
  for (const g of segs) {
    const a = Math.max(fr.sx(Math.max(g.lo, fr.x0 - 1)), fr.left);
    const b = Math.min(fr.sx(Math.min(g.hi, fr.x1 + 1)), fr.right);
    if (b >= a) s += line(a, y, b, y, C.green, 6, `stroke-linecap="round" opacity="0.8"`);
    if (Number.isFinite(g.lo) && g.lo >= fr.x0) s += dot(fr.sx(g.lo), y, C.green, 5, !g.loIn);
    if (Number.isFinite(g.hi) && g.hi <= fr.x1 && g.hi !== g.lo) s += dot(fr.sx(g.hi), y, C.green, 5, !g.hiIn);
  }
  return s;
}

// ---------- reading ----------

/** As a polynomial in x, dividing by numbers allowed (x/2), or null. */
function polyOf(e: E): P | null {
  switch (e.k) {
    case "num":
      return [e.v];
    case "var":
      return e.name === "x" ? [ZERO, ONE] : null;
    case "add": {
      let r: P = [ZERO];
      for (const t of e.ts) {
        const q = polyOf(t);
        if (!q) return null;
        r = padd(r, q);
      }
      return r;
    }
    case "mul": {
      let r: P = [ONE];
      for (const f of e.fs) {
        const q = polyOf(f);
        if (!q) return null;
        r = pmul(r, q);
      }
      return r;
    }
    case "pow": {
      if (e.e.k !== "num" || !e.e.v.isInt() || Math.abs(e.e.v.n) > 12) return null;
      const b = polyOf(e.b);
      if (!b) return null;
      if (e.e.v.n < 0) return pdeg(b) === 0 && !b[0].isZero() ? [chk(powFrac(b[0], e.e.v.n))] : null;
      let r: P = [ONE];
      for (let i = 0; i < e.e.v.n; i++) r = pmul(r, b);
      return r;
    }
    default:
      return null;
  }
}
function readP(src: string): P {
  const s = src.trim();
  if (!s) throw new Error(fill(words.notPoly, { s }));
  const p = polyOf(parseE(s));
  if (!p) throw new Error(fill(words.notPoly, { s }));
  p.forEach(chk);
  return ptrim(p);
}
/** The last top-level occurrence of one of the characters, splitting the text in two. */
function splitTop(src: string, chars: string): [string, string] | null {
  let depth = 0;
  let pos = -1;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if ("([{".includes(c)) depth++;
    else if (")]}".includes(c)) depth--;
    else if (depth === 0 && chars.includes(c)) pos = i;
  }
  return pos < 0 ? null : [src.slice(0, pos), src.slice(pos + 1)];
}
type Rel = "=" | "<" | ">" | "≤" | "≥";
const REL_TEX: Record<Rel, string> = { "=": "=", "<": "<", ">": ">", "≤": "\\le", "≥": "\\ge" };
const FLIP: Record<Rel, Rel> = { "=": "=", "<": ">", ">": "<", "≤": "≥", "≥": "≤" };
function splitRel(src: string): { l: string; r: string | null; rel: Rel | null } {
  const s = src.replace(/<=|=</g, "≤").replace(/>=|=>/g, "≥");
  const m = /[=<>≤≥]/.exec(s);
  if (!m) return { l: s, r: null, rel: null };
  return { l: s.slice(0, m.index), r: s.slice(m.index + 1), rel: m[0] as Rel };
}
const clauses = (src: string) => src.split(/[;\n]+/).map((s) => s.trim()).filter(Boolean);

// ---------- division ----------

type DivStep = { k: number; c: Frac; prod: P; after: P };
function longDivide(p: P, d: P): { q: P; r: P; steps: DivStep[] } {
  const [n, m] = [pdeg(p), pdeg(d)];
  let r = p.slice();
  const q: Frac[] = Array.from({ length: Math.max(n - m + 1, 1) }, () => ZERO);
  const steps: DivStep[] = [];
  for (let k = n - m; k >= 0; k--) {
    const c = chk(at(r, k + m).div(lead(d)));
    if (c.isZero()) continue;
    q[k] = c;
    const prod = pmul(xk(c, k), d);
    r = psub(r, prod);
    steps.push({ k, c, prod, after: r });
  }
  return { q: ptrim(q), r: ptrim(r), steps };
}

/** The long division written out: the quotient over the bar, each product subtracted, the next term brought down. */
function longDivisionPic(p: P, d: P, q: P, steps: DivStep[], r: P): Pic {
  const [n, m] = [pdeg(p), pdeg(d)];
  type Cell = { t: string; color: string };
  type Row = { cells: Map<number, Cell>; minus?: boolean };
  const rowOf = (poly: P, from: number, to: number, color: string, zeros = false, forceZero = false): Map<number, Cell> => {
    const cells = new Map<number, Cell>();
    for (let j = from; j >= to; j--) {
      const c = at(poly, j);
      if (c.isZero() && !(zeros && cells.size)) continue;
      cells.set(j, { t: termTex(c, j, !cells.size), color: c.isZero() ? C.grey : color });
    }
    if (!cells.size && forceZero) cells.set(to, { t: "0", color });
    return cells;
  };
  const rows: Row[] = [{ cells: rowOf(q, n - m, 0, C.blue) }, { cells: rowOf(p, n, 0, C.ink, true) }];
  steps.forEach((s, i) => {
    rows.push({ cells: rowOf(s.prod, s.k + m, s.k, C.ink), minus: true });
    const next = steps[i + 1];
    if (next) rows.push({ cells: rowOf(s.after, s.k + m - 1, next.k, C.ink) });
    else rows.push({ cells: rowOf(s.after, Math.max(s.k + m - 1, 0), 0, pdeg(r) < 0 ? C.green : C.red, false, true) });
  });
  const colW = new Map<number, number>();
  for (let j = n; j >= 0; j--) colW.set(j, Math.max(30, ...rows.map((row) => (row.cells.has(j) ? twidth(row.cells.get(j)!.t) + 16 : 0))));
  const dT = polyTex(d);
  const bx = 12 + twidth(dT) + 12;
  const start = bx + 10;
  const left = new Map<number, number>();
  let x = start;
  for (let j = n; j >= 0; j--) {
    left.set(j, x);
    x += colW.get(j)!;
  }
  const right = x;
  const rowH = 30;
  let svg = "";
  let y = 4 + rowH / 2;
  rows.forEach((row, i) => {
    const js = [...row.cells.keys()];
    for (const [j, c] of row.cells) svg += put(c.t, left.get(j)! + colW.get(j)! / 2, y, "middle", c.color);
    if (i === 1) {
      // the bar over the dividend and the bracket round it, the divisor on the left
      const top = y - rowH / 2 - 1;
      svg += line(bx - 2, top, right, top, C.ink, 1.6);
      svg += `<path d="M${r2(bx - 2)} ${r2(top)} Q${r2(bx + 6)} ${r2(top + rowH / 2)} ${r2(bx - 2)} ${r2(top + rowH)}" fill="none" stroke="${C.ink}" stroke-width="1.6"/>`;
      svg += put(dT, bx - 8, y, "end");
    }
    if (row.minus && js.length) {
      const [hi, lo] = [Math.max(...js), Math.min(...js)];
      svg += put("-\\Big(", left.get(hi)! + 4, y, "end", C.red);
      svg += put("\\Big)", left.get(lo)! + colW.get(lo)! - 4, y, "start", C.red);
      svg += line(left.get(hi)! - 6, y + rowH / 2, left.get(lo)! + colW.get(lo)! + 6, y + rowH / 2, C.ink, 1.2);
    }
    y += rowH + (i === 0 ? 4 : 0);
  });
  return fit(svg, right + 18, y - rowH / 2 + 6);
}

/** Synthetic division by x − r: bring down, multiply by r, add. */
function syntheticPic(p: P, r: Frac): { pic: Pic; q: P; rem: Frac } {
  const n = pdeg(p);
  const top = Array.from({ length: n + 1 }, (_, i) => at(p, n - i));
  const mid: (Frac | null)[] = [null];
  const bot: Frac[] = [top[0]];
  for (let i = 1; i <= n; i++) {
    const m = chk(bot[i - 1].mul(r));
    mid.push(m);
    bot.push(chk(top[i].add(m)));
  }
  const rem = bot[n];
  const all = [...top, ...bot, ...mid.filter((m): m is Frac => !!m)].map((f) => f.tex());
  const cw = Math.max(36, ...all.map((t) => twidth(t) + 16));
  const rw = twidth(r.tex()) + 18;
  const x0 = 4 + rw;
  let svg = put(r.tex(), 4 + rw / 2, 17, "middle", C.purple);
  svg += line(x0, 2, x0, 62, C.ink, 1.4) + line(x0, 64, x0 + (n + 1) * cw, 64, C.ink, 1.4);
  top.forEach((c, i) => (svg += put(c.tex(), x0 + (i + 0.5) * cw, 17)));
  mid.forEach((c, i) => c && (svg += put(c.tex(), x0 + (i + 0.5) * cw, 47, "middle", C.grey)));
  bot.forEach((c, i) => (svg += put(c.tex(), x0 + (i + 0.5) * cw, 82, "middle", i === n ? (rem.isZero() ? C.green : C.red) : C.blue)));
  const rx = x0 + n * cw + 4;
  svg += `<rect x="${r2(rx)}" y="68" width="${r2(cw - 8)}" height="28" fill="none" stroke="${rem.isZero() ? C.green : C.red}" stroke-width="1.4" rx="3"/>`;
  return { pic: { svg, h: 100, w: x0 + (n + 1) * cw + 6 }, q: ptrim(bot.slice(0, n).reverse()), rem };
}

function renderDivide(src: string): RenderedSvg {
  const W_ = words.divide;
  const parts = src.includes(";") ? (src.split(";").slice(0, 2) as [string, string]) : (splitTop(src, "÷") ?? splitTop(src, "/"));
  if (!parts || !parts[0].trim() || !parts[1].trim()) throw new Error(words.need.divide);
  const p = readP(parts[0]);
  const d = readP(parts[1]);
  if (pdeg(d) < 1) throw new Error(W_.constDivisor);
  if (pdeg(p) < pdeg(d)) throw new Error(W_.lower);
  if (pdeg(p) > 10) throw new Error(words.tooHigh);
  const { q, r, steps } = longDivide(p, d);
  data = { q: nums(q), r: pdeg(r) < 0 ? [] : nums(r) };
  const [pT, dT, qT] = [polyTex(p), polyTex(d), polyTex(q)];
  const rows: TexLine[] = [
    { tex: `${pT} = ${br(dT)}${pdeg(q) > 0 || !q[0].isOne() ? br(qT) : ""} ${plusTex(r)}`, op: W_.identity },
  ];
  if (pdeg(r) >= 0) {
    const rc = pdeg(r) === 0;
    const rT = rc ? r[0].abs().tex() : polyTex(r);
    rows.push({ tex: `\\frac{${pT}}{${dT}} = ${qT} ${rc && r[0].isNeg() ? "-" : "+"} \\frac{${rT}}{${dT}}`, op: W_.fraction });
  } else rows.push({ tex: `\\frac{${pT}}{${dT}} = ${qT}`, op: W_.fraction });
  const pics: Pic[] = [longDivisionPic(p, d, q, steps, r)];
  const caps: Caption[] = [{ text: W_.longCap }];
  if (pdeg(d) === 1) {
    const a = chk(at(d, 0).neg().div(at(d, 1)));
    const val = pval(p, a);
    rows.push({ tex: `f\\left(${a.tex()}\\right) = ${substTex(p, a)} = ${valuesTex(p, a)} = ${val.tex()}`, op: W_.remThm, color: val.isZero() ? C.green : C.blue });
    const syn = syntheticPic(p, a);
    pics.push(syn.pic);
    caps.push({ text: fill(W_.syntheticCap, { d: plainTex(polyTex([a.neg(), ONE])), r: plainTex(a.tex()) }) });
    if (!at(d, 1).isOne()) caps.push({ text: fill(W_.scaled, { d: plainTex(dT), b: plainTex(at(d, 1).tex()), r: plainTex(a.tex()) }) });
  }
  caps.push(
    pdeg(r) < 0
      ? { text: fill(W_.isFactor, { d: plainTex(dT), p: plainTex(pT) }), color: C.green }
      : { text: fill(W_.remainder, { q: plainTex(qT), r: plainTex(polyTex(r)) }), color: C.blue },
  );
  return finish(`${br(pT)} \\div ${br(dT)}`, rows, pics, caps);
}

/** LaTeX as plain text for captions: \frac{a}{b} → a/b, x^{2} → x², \sqrt{3} → √3. */
function plainTex(t: string): string {
  const sup: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻" };
  let s = t;
  for (let i = 0; i < 4; i++) s = s.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, (_, a: string, b: string) => `${/[ +−-]/.test(a.trim()) ? `(${a})` : a}/${/[ +−-]/.test(b.trim()) ? `(${b})` : b}`);
  return s
    .replace(/\^\{(-?\d+)\}/g, (_, e: string) => [...e].map((c) => sup[c] ?? c).join(""))
    .replace(/\\sqrt\[(\d+)\]\{([^{}]*)\}/g, (_, k: string, a: string) => `${k === "3" ? "∛" : `${k}√`}${a.length > 1 ? `(${a})` : a}`)
    .replace(/\\sqrt\{([^{}]*)\}/g, (_, a: string) => `√${a.length > 1 ? `(${a})` : a}`)
    .replace(/\\left|\\right|\\Big|\\big/g, "")
    .replace(/\\pm/g, "±")
    .replace(/\\cdot/g, "·")
    .replace(/\\infty/g, "∞")
    .replace(/\\[,;:! ]/g, " ")
    .replace(/\\(le|leq)\b/g, "≤")
    .replace(/\\(ge|geq)\b/g, "≥")
    .replace(/\\[a-zA-Z]+/g, "")
    .replace(/[{}]/g, "")
    .replace(/-/g, "−")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------- the factor and remainder theorems ----------

/** A number plus unknowns to the first power: 4a + 2b − 10 ("" holds the number). */
type Lin = Map<string, Frac>;
const lin = (c: Frac): Lin => new Map([["", c]]);
function lAdd(a: Lin, b: Lin): Lin {
  const r: Lin = new Map(a);
  for (const [k, v] of b) {
    const s = chk((r.get(k) ?? ZERO).add(v));
    if (s.isZero() && k !== "") r.delete(k);
    else r.set(k, s);
  }
  if (!r.has("")) r.set("", ZERO);
  return r;
}
function lScale(a: Lin, k: Frac): Lin {
  const r: Lin = new Map([["", ZERO]]);
  for (const [u, v] of a) {
    const s = chk(v.mul(k));
    if (u === "" || !s.isZero()) r.set(u, s);
  }
  return r;
}
const lConst = (a: Lin): Frac | null => ([...a.keys()].every((k) => k === "") ? (a.get("") ?? ZERO) : null);
function lMul(a: Lin, b: Lin): Lin {
  const ca = lConst(a);
  if (ca) return lScale(b, ca);
  const cb = lConst(b);
  if (cb) return lScale(a, cb);
  throw new Error(words.theorem.nonLinear);
}
/** A polynomial in x whose coefficients may hold unknowns. */
type LP = Lin[];
const lpAdd = (a: LP, b: LP): LP => Array.from({ length: Math.max(a.length, b.length) }, (_, i) => lAdd(a[i] ?? lin(ZERO), b[i] ?? lin(ZERO)));
function lpMul(a: LP, b: LP): LP {
  const r: LP = Array.from({ length: a.length + b.length - 1 }, () => lin(ZERO));
  a.forEach((x, i) => b.forEach((y, j) => (r[i + j] = lAdd(r[i + j], lMul(x, y)))));
  return r;
}
function toLP(e: E, src: string): LP {
  switch (e.k) {
    case "num":
      return [lin(e.v)];
    case "var":
      return e.name === "x" ? [lin(ZERO), lin(ONE)] : [new Map([["", ZERO], [e.name, ONE]])];
    case "add":
      return e.ts.map((t) => toLP(t, src)).reduce(lpAdd);
    case "mul":
      return e.fs.map((f) => toLP(f, src)).reduce(lpMul);
    case "pow": {
      if (e.e.k !== "num" || !e.e.v.isInt() || Math.abs(e.e.v.n) > 12) break;
      const b = toLP(e.b, src);
      if (e.e.v.n < 0) {
        const c = b.length === 1 ? lConst(b[0]) : null;
        if (!c || c.isZero()) break;
        return [lin(chk(powFrac(c, e.e.v.n)))];
      }
      let r: LP = [lin(ONE)];
      for (let i = 0; i < e.e.v.n; i++) r = lpMul(r, b);
      return r;
    }
  }
  throw new Error(fill(words.notPoly, { s: src.trim() }));
}
const lpEval = (p: LP, x: Frac): Lin => p.reduceRight((acc, c) => lAdd(lScale(acc, x), c), lin(ZERO));
/** 4a + 2b + 10, unknowns in the given order and the number last. */
function linTex(l: Lin, order: readonly string[]): string {
  const ts: string[] = [];
  for (const u of order) {
    const c = l.get(u);
    if (c && !c.isZero()) ts.push(termTex(c, 1, !ts.length, u));
  }
  const c0 = l.get("") ?? ZERO;
  if (!c0.isZero() || !ts.length) ts.push(termTex(c0, 0, !ts.length));
  return ts.join(" ");
}
/** The coefficient Lin times (a)^k, for the substitution line. */
function lpSubstTex(p: LP, x: Frac, order: readonly string[]): string {
  const xt = br(x.tex());
  let out = "";
  for (let k = p.length - 1; k >= 0; k--) {
    const c = p[k];
    const cc = lConst(c);
    if (cc?.isZero()) continue;
    const pw = k === 0 ? "" : `${xt}${k === 1 ? "" : `^{${k}}`}`;
    let neg = false;
    let body: string;
    if (cc) {
      neg = cc.isNeg();
      body = k === 0 ? cc.abs().tex() : `${cc.abs().isOne() ? "" : cc.abs().tex()}${pw}`;
    } else {
      const us = order.filter((u) => c.has(u));
      const single = us.length === 1 && (c.get("") ?? ZERO).isZero() && c.get(us[0])!.abs().isOne();
      if (single) {
        neg = c.get(us[0])!.isNeg();
        body = `${us[0]}${pw}`;
      } else body = k === 0 ? linTex(c, order) : `${br(linTex(c, order))}${pw}`;
    }
    out += out ? ` ${neg ? "-" : "+"} ${body}` : `${neg ? "-" : ""}${body}`;
  }
  return out || "0";
}

type Eq = { c: Map<string, Frac>; rhs: Frac };
/** Whole coefficients without a common factor, the first one positive. */
function normEq(e: Eq, order: readonly string[]): { eq: Eq; k: Frac } {
  const cs = [...e.c.values(), e.rhs];
  const L = lcmDen(cs);
  const ints = cs.map((c) => chk(c.mul(F(L))).n);
  let g = ints.reduce((acc, c) => gcd(acc, c), 0) || 1;
  const firstU = order.find((u) => e.c.has(u) && !e.c.get(u)!.isZero());
  if (firstU && e.c.get(firstU)!.isNeg()) g = -g;
  const k = F(L, g);
  const c = new Map<string, Frac>();
  for (const [u, v] of e.c) if (!v.isZero()) c.set(u, chk(v.mul(k)));
  return { eq: { c, rhs: chk(e.rhs.mul(k)) }, k };
}
const eqTex = (e: Eq, order: readonly string[]) => `${linTex(new Map([...e.c, ["", ZERO]]), order)} = ${e.rhs.tex()}`;

/** Exact Gaussian elimination; null when the solution is not unique or there is none. */
function solveLinear(eqs: Eq[], us: readonly string[]): Map<string, Frac> | null {
  const M = eqs.map((e) => [...us.map((u) => e.c.get(u) ?? ZERO), e.rhs]);
  const n = us.length;
  let row = 0;
  const piv: number[] = [];
  for (let c = 0; c < n; c++) {
    const p = M.findIndex((r, i) => i >= row && !r[c].isZero());
    if (p < 0) return null;
    [M[row], M[p]] = [M[p], M[row]];
    const pv = M[row][c];
    M[row] = M[row].map((x) => chk(x.div(pv)));
    for (let i = 0; i < M.length; i++)
      if (i !== row && !M[i][c].isZero()) {
        const f = M[i][c];
        M[i] = M[i].map((x, j) => chk(x.sub(chk(f.mul(M[row][j])))));
      }
    piv.push(c);
    row++;
  }
  for (let i = row; i < M.length; i++) if (!M[i][n].isZero()) return null;
  return new Map(us.map((u, i) => [u, M[i][n]]));
}

/** Two unknowns by elimination, every line shown; more by elimination in one go. */
function solveShown(eqs: { eq: Eq; label: string }[], us: string[], rows: TexLine[]): Map<string, Frac> {
  const W_ = words.theorem;
  const sol = solveLinear(eqs.map((e) => e.eq), us);
  if (!sol) throw new Error(W_.noUnique);
  const val = (u: string) => sol.get(u)!;
  const valRow = (u: string, coef: Frac, rhs: Frac, why: string) => {
    if (!coef.isOne()) rows.push({ tex: `${termTex(coef, 1, true, u)} = ${rhs.tex()}`, op: why });
    rows.push({ tex: `${u} = ${val(u).tex()}`, op: coef.isOne() ? why : fill(W_.divide, { k: plainTex(coef.tex()) }), color: C.green });
  };
  if (us.length === 1) {
    const u = us[0];
    const e = eqs.find((x) => x.eq.c.get(u) && !x.eq.c.get(u)!.isZero())!;
    if (!e.eq.c.get(u)!.isOne()) rows.push({ tex: `${u} = ${val(u).tex()}`, op: fill(W_.divide, { k: plainTex(e.eq.c.get(u)!.tex()) }), color: C.green });
    return sol;
  }
  if (us.length > 2) {
    rows.push({ tex: us.map((u) => `${u} = ${val(u).tex()}`).join(",\\quad "), op: W_.solveTogether, color: C.green });
    return sol;
  }
  // two equations that fix both unknowns
  let pair: [{ eq: Eq; label: string }, { eq: Eq; label: string }] | null = null;
  for (let i = 0; i < eqs.length && !pair; i++)
    for (let j = i + 1; j < eqs.length && !pair; j++) if (solveLinear([eqs[i].eq, eqs[j].eq], us)) pair = [eqs[i], eqs[j]];
  const [E1, E2] = pair!;
  const co = (e: Eq, u: string) => e.c.get(u) ?? ZERO;
  // An equation with one unknown gives it at once; the other comes from substituting.
  const single = [E1, E2].find((e) => us.filter((u) => !co(e.eq, u).isZero()).length === 1);
  if (single) {
    const other = single === E1 ? E2 : E1;
    const u = us.find((x) => !co(single.eq, x).isZero())!;
    const v = us.find((x) => x !== u)!;
    valRow(u, co(single.eq, u), single.eq.rhs, fill(W_.from, { n: single.label }));
    const left = chk(co(other.eq, u).mul(val(u)));
    rows.push({ tex: `${co(other.eq, u).isOne() ? "" : co(other.eq, u).tex()}${br(val(u).tex())} ${termTex(co(other.eq, v), 1, false, v)} = ${other.eq.rhs.tex()}`, op: fill(W_.into, { n: other.label }) });
    valRow(v, co(other.eq, v), chk(other.eq.rhs.sub(left)), W_.rearrange);
    return sol;
  }
  // eliminate the unknown whose coefficients match, or else the second one
  const [a0, b0] = us;
  const elim = co(E1.eq, b0).abs().sub(co(E2.eq, b0).abs()).isZero() || !co(E1.eq, a0).abs().sub(co(E2.eq, a0).abs()).isZero() ? b0 : a0;
  const keep = elim === a0 ? b0 : a0;
  const [c1, c2] = [co(E1.eq, elim), co(E2.eq, elim)];
  const g = gcd(c1.n, c2.n) || 1;
  const [k1, k2] = [Math.abs(c2.n) / g, Math.abs(c1.n) / g];
  const same = c1.isNeg() === c2.isNeg();
  const comb = (e1: Frac, e2: Frac) => chk(chk(e1.mul(F(k1))).add(chk(e2.mul(F(same ? -k2 : k2)))));
  const kc = comb(co(E1.eq, keep), co(E2.eq, keep));
  const kr = comb(E1.eq.rhs, E2.eq.rhs);
  const how = `${k1 === 1 ? "" : `${k1}×`}${E1.label} ${same ? "−" : "+"} ${k2 === 1 ? "" : `${k2}×`}${E2.label}`;
  valRow(keep, kc, kr, how);
  const into = co(E1.eq, elim).isZero() ? E2 : E1;
  const left = chk(co(into.eq, keep).mul(val(keep)));
  const kt = co(into.eq, keep);
  rows.push({ tex: `${kt.isOne() ? "" : kt.n === -1 && kt.d === 1 ? "-" : kt.tex()}${br(val(keep).tex())} ${termTex(co(into.eq, elim), 1, false, elim)} = ${into.eq.rhs.tex()}`, op: fill(W_.into, { n: into.label }) });
  valRow(elim, co(into.eq, elim), chk(into.eq.rhs.sub(left)), W_.rearrange);
  return sol;
}

type Cond = { a: Frac; v: Lin; kind: "factor" | "remainder"; src: string };
const UNKNOWNS = ["a", "b", "c", "d", "k", "m", "n", "p", "q", "r", "s", "t"];
function readCond(raw: string, name: string, vars: readonly string[]): Cond {
  const W_ = words.theorem;
  const bad = () => new Error(fill(W_.badClause, { s: raw }));
  const m = /^([a-zA-Z])\s*\(([^()]*)\)\s*=\s*(.+)$/.exec(raw);
  if (m && m[1] === name) {
    const a = polyOf(parseE(m[2]));
    if (!a || pdeg(a) > 0) throw bad();
    const lp = toLP(parseE(m[3], vars), m[3]);
    if (lp.length > 1 && lp.slice(1).some((c) => lConst(c) === null || !lConst(c)!.isZero())) throw bad();
    const v = lp[0];
    return { a: chk(a[0]), v, kind: lConst(v)?.isZero() ? "factor" : "remainder", src: raw };
  }
  const g = /\(([^()]*x[^()]*)\)/.exec(raw);
  let d: P | null = null;
  let rest = "";
  if (g) {
    d = readP(g[1]);
    rest = raw.slice(0, g.index) + " " + raw.slice(g.index + g[0].length);
  } else
    try {
      d = readP(raw);
    } catch {
      throw bad();
    }
  if (pdeg(d) !== 1) throw new Error(W_.needLinear);
  const a = chk(at(d, 0).neg().div(at(d, 1)));
  const num = /[-−+]?\s*\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?/.exec(rest);
  if (!num) return { a, v: lin(ZERO), kind: "factor", src: raw };
  const f = Frac.parse(num[0].replace(/\s+/g, "").replace("−", "-"));
  if (!f) throw bad();
  return { a, v: lin(f), kind: f.isZero() ? "factor" : "remainder", src: raw };
}

function renderTheorem(src: string): RenderedSvg {
  const W_ = words.theorem;
  const cs = clauses(src);
  if (!cs.length) throw new Error(words.need.theorem);
  const def = /^([a-zA-Z])\s*\(\s*x\s*\)\s*=\s*(.+)$/.exec(cs[0]);
  const name = def ? def[1] : "f";
  const body = def ? def[2] : cs[0];
  const vars = UNKNOWNS.filter((u) => u !== name);
  const e = parseE(body, vars);
  const lp = toLP(e, body);
  if (lp.length < 2) throw new Error(words.noX);
  if (lp.length > 11) throw new Error(words.tooHigh);
  const order = vars.filter((u) => lp.some((c) => c.has(u))).sort((x, y) => body.indexOf(x) - body.indexOf(y));
  const conds = cs.slice(1).map((c) => readCond(c, name, vars));
  const fx = `${name}(x) = ${tex(e)}`;
  const rows: TexLine[] = [];
  const caps: Caption[] = [];
  const marks: Mark[] = [];
  const fa = (a: Frac) => `${name}\\left(${a.tex()}\\right)`;

  if (order.length && conds.length < order.length) throw new Error(fill(W_.tooFew, { u: order.length, c: conds.length }));

  let p: P;
  if (!order.length) {
    p = lp.map((c) => lConst(c)!);
    if (!conds.length) {
      // No conditions: search for factors among ±p/q.
      caps.push({ text: W_.search });
      const roots: Frac[] = [];
      for (const r of candidates(p).slice(0, 12)) {
        const v = pval(p, r);
        const ok = v.isZero();
        if (ok) roots.push(r);
        rows.push({ tex: `${fa(r)} = ${valuesTex(p, r)} = ${v.tex()}`, op: ok ? fill(W_.found, { d: plainTex(facTex(r)) }) : "", color: ok ? C.green : C.grey });
        if (roots.length >= pdeg(p)) break;
      }
      for (const r of roots) marks.push({ x: r.toNumber(), y: 0, color: C.green, label: plainTex(facTex(r)) });
    } else
      for (const c of conds) {
        const v = pval(p, c.a);
        const want = lConst(c.v)!;
        const d = plainTex(facTex(c.a));
        rows.push({ tex: `${fa(c.a)} = ${substTex(p, c.a)} = ${valuesTex(p, c.a)} = ${v.tex()}`, op: c.kind === "factor" ? W_.factorThm : W_.remThm, color: v.sub(want).isZero() ? C.green : C.red });
        const t = { a: plainTex(c.a.tex()), d, v: plainTex(v.tex()), w: plainTex(want.tex()) };
        caps.push(
          c.kind === "factor"
            ? { text: fill(v.isZero() ? W_.isFactor : W_.notFactor, t), color: v.isZero() ? C.green : C.red }
            : { text: fill(v.sub(want).isZero() ? W_.holds : W_.fails, t), color: v.sub(want).isZero() ? C.green : C.red },
        );
        marks.push({ x: c.a.toNumber(), y: v.toNumber(), color: v.isZero() ? C.green : C.purple, label: `(${plainTex(c.a.tex())}, ${plainTex(v.tex())})` });
      }
  } else {
    const eqs: { eq: Eq; label: string }[] = [];
    conds.forEach((c, i) => {
      const label = `(${i + 1})`;
      const want = c.v;
      rows.push({ tex: `${fa(c.a)} = ${linTex(want, order)}`, op: c.kind === "factor" ? `${W_.factorThm}: ${plainTex(facTex(c.a))}` : W_.remThm });
      rows.push({ tex: `${lpSubstTex(lp, c.a, order)} = ${linTex(want, order)}`, op: fill(W_.substitute, { a: plainTex(c.a.tex()) }) });
      const lhs = lAdd(lpEval(lp, c.a), lScale(want, MINUS));
      const raw: Eq = { c: new Map([...lhs].filter(([u]) => u !== "")), rhs: (lhs.get("") ?? ZERO).neg() };
      const simple = `${linTex(lhs, order)} = 0`;
      rows.push({ tex: simple, op: W_.simplify });
      const { eq, k } = normEq(raw, order);
      if (!eq.c.size) throw new Error(W_.noUnique);
      rows.push({ tex: `${eqTex(eq, order)} \\qquad ${label}`, op: k.isOne() ? W_.rearrange : `${W_.rearrange}, ${k.n === 1 ? `÷ ${k.d}` : k.n === -1 ? `÷ (−${k.d})` : `× ${plainTex(k.tex())}`}`, color: C.blue });
      eqs.push({ eq, label });
      marks.push({ x: c.a.toNumber(), y: 0, color: c.kind === "factor" ? C.green : C.purple });
    });
    const sol = solveShown(eqs, order, rows);
    data.values = Object.fromEntries([...sol].map(([u, v]) => [u, v.toNumber() + 0]));
    p = ptrim(lp.map((c) => [...c].reduce((acc, [u, v]) => chk(acc.add(u === "" ? v : chk(v.mul(sol.get(u)!)))), ZERO)));
    rows.push({ tex: `${name}(x) = ${polyTex(p)}`, op: W_.back, color: C.green });
    marks.forEach((m, i) => (m.y = pval(p, conds[i].a).toNumber()));
    marks.forEach((m, i) => (m.label = `(${plainTex(conds[i].a.tex())}, ${plainTex(pval(p, conds[i].a).tex())})`));
  }
  data.poly = nums(p);
  const f = factorQ(p);
  if (f.roots.length && factorCount(f) > 1) rows.push({ tex: `${name}(x) = ${factoredTex(f)}`, op: W_.factorise, color: C.green });
  const real = realRoots(p);
  const rx = [...real.exact.map(qsNum), ...real.approx];
  const pic = graphPic([{ f: (x) => pnum(p, x), color: C.blue }], [...rx, ...marks.map((m) => m.x), ...numericRoots(nums(pderiv(p)))], marks);
  caps.push({ text: W_.graphCap });
  return finish(fx, rows, [pic], caps);
}

// ---------- solving polynomial equations and inequalities ----------

type Root = { v: number; tex: string; m: number };
function addRoot(roots: Root[], r: Root) {
  const e = roots.find((x) => Math.abs(x.v - r.v) < 1e-9);
  if (e) e.m += r.m;
  else roots.push(r);
}
const candTex = (p: P) => {
  const pos = candidates(p).filter((c) => !c.isNeg());
  const shown = pos.slice(0, 12).map((c) => `\\pm ${c.tex()}`);
  return shown.join(",\\ ") + (pos.length > 12 ? ",\\ \\ldots" : "");
};
/** x = ±ᵏ√u, exactly when it can be. */
function kthRoots(u: QS, k: number): Root[] {
  const v = qsNum(u);
  if (Math.abs(v) < 1e-15) return [{ v: 0, tex: "0", m: 1 }];
  if (v < 0 && k % 2 === 0) return [];
  const rational = u.b.isZero();
  let r: Root[] = [];
  const mag = Math.abs(v) ** (1 / k);
  if (rational) {
    const f = rootFrac(u.a.abs(), k);
    if (f) r = [{ v: mag, tex: f.tex(), m: 1 }];
    else if (k === 2) {
      const { out, s } = sqrtSplit(u.a.abs());
      r = [{ v: mag, tex: qsTex(qs(ZERO, out, s)), m: 1 }];
    } else r = [{ v: mag, tex: `\\sqrt[${k}]{${u.a.abs().tex()}}`, m: 1 }];
  } else r = [{ v: mag, tex: k === 2 ? `\\sqrt{${qsTex(v < 0 ? qsMul(u, qs(MINUS)) : u)}}` : `\\sqrt[${k}]{${qsTex(v < 0 ? qsMul(u, qs(MINUS)) : u)}}`, m: 1 }];
  if (k % 2 === 1) return v < 0 ? [{ v: -mag, tex: `-${r[0].tex}`, m: 1 }] : r;
  return [{ v: -mag, tex: `-${r[0].tex}`, m: 1 }, r[0]];
}
const rootsTex = (rs: Root[]) => {
  const ex = rs.filter((r) => !r.tex.startsWith("\\approx"));
  const ap = rs.filter((r) => r.tex.startsWith("\\approx"));
  const parts: string[] = [];
  if (ex.length) parts.push(`x = ${ex.map((r) => r.tex).join(",\\ ")}`);
  if (ap.length) parts.push(`x ${ap.map((r) => r.tex).join(",\\ ")}`);
  return parts.join(",\\quad ");
};

function solveQuadratic(q: P, rows: TexLine[], suffix: string, roots: Root[], v = "x"): void {
  const W_ = words.solve;
  const [c, b, a] = [at(q, 0), at(q, 1), at(q, 2)];
  const D = chk(chk(b.mul(b)).sub(chk(F(4).mul(a).mul(c))));
  const f = factorQ(q);
  if (f.roots.length) {
    rows.push({ tex: suffix ? `${factoredTex(f, v)}${suffix}` : `${polyTex(q, v)} = ${factoredTex(f, v)}`, op: W_.factorise });
    for (const { r, m } of f.roots) addRoot(roots, { v: r.toNumber(), tex: r.tex(), m });
    return;
  }
  rows.push({ tex: `b^2 - 4ac = ${br(b.tex())}^2 - 4${br(a.tex())}${br(c.tex())} = ${D.tex()}${D.isNeg() ? " < 0" : ""}`, op: W_.discriminant, color: D.isNeg() ? C.grey : undefined });
  if (D.isNeg()) return;
  const { out, s } = sqrtSplit(D);
  const two = chk(a.mul(F(2)));
  const rs = [qs(chk(b.neg().div(two)), chk(out.neg().div(two)), s), qs(chk(b.neg().div(two)), chk(out.div(two)), s)];
  rows.push({ tex: `${v} = \\frac{${b.neg().tex()} \\pm \\sqrt{${D.tex()}}}{${two.tex()}} = ${rs.map(qsTex).join(",\\ ")}`, op: W_.formula });
  for (const r of rs) addRoot(roots, { v: qsNum(r), tex: qsTex(r), m: 1 });
}

/** The whole route to the roots of p (p[0] may be 0); returns the roots with their multiplicities. */
function solveSteps(p: P, rows: TexLine[], pics: Pic[], caps: Caption[], eq: boolean): { roots: Root[]; factored?: string } {
  const W_ = words.solve;
  const roots: Root[] = [];
  const sfx = eq ? " = 0" : "";
  let q = p;
  let pre = "";
  let k0 = 0;
  while (at(q, k0).isZero() && k0 < pdeg(q)) k0++;
  if (k0 > 0) {
    q = ptrim(q.slice(k0));
    pre = k0 === 1 ? "x" : `x^{${k0}}`;
    addRoot(roots, { v: 0, tex: "0", m: k0 });
    rows.push({ tex: `${pre}${br(polyTex(q))}${sfx}`, op: fill(W_.takeOut, { f: plainTex(pre) }) });
  }
  const c = content(q);
  if (!c.k.isOne() && pdeg(q) >= 1) {
    q = c.q;
    if (eq) rows.push({ tex: `${pre}${pre || pdeg(q) > 0 ? br(polyTex(q)) : polyTex(q)}${sfx}`, op: fill(W_.divide, { k: plainTex(c.k.tex()) }) });
    else {
      pre = (c.k.n === -1 && c.k.d === 1 ? "-" : c.k.tex()) + pre;
      rows.push({ tex: `${pre}${br(polyTex(q))}`, op: fill(W_.takeOut, { f: plainTex(c.k.tex()) }) });
    }
  }
  // a quadratic in xᵏ: only the powers 0, k and 2k
  const nz = q.map((x, i) => (x.isZero() ? -1 : i)).filter((i) => i >= 0);
  const kk = pdeg(q) / 2;
  if (pdeg(q) >= 4 && Number.isInteger(kk) && nz.every((i) => i === 0 || i === kk || i === 2 * kk) && !at(q, 0).isZero()) {
    const uq: P = [at(q, 0), at(q, kk), at(q, 2 * kk)];
    const xk_ = `x^{${kk}}`;
    rows.push({ tex: `u = ${xk_}:\\quad ${polyTex(uq, "u")} = 0`, op: fill(W_.substitute, { u: plainTex(xk_) }) });
    const us: Root[] = [];
    solveQuadratic(uq, rows, " = 0", us, "u");
    const uf = factorQ(uq);
    const uvals: QS[] = uf.roots.length
      ? uf.roots.flatMap(({ r, m }) => Array.from({ length: m }, () => qs(r)))
      : realRoots(uq).exact;
    const found: Root[] = [];
    for (const u of uvals) for (const r of kthRoots(u, kk)) addRoot(found, r);
    found.sort((a, b) => a.v - b.v);
    rows.push({
      tex: uvals.length ? uvals.map((u) => `${xk_} = ${qsTex(u)}`).join(` \\text{ ${words.or} } `) + (found.length ? ` \\;\\Rightarrow\\; ${rootsTex(found)}` : "") : `${xk_} \\notin \\mathbb{R}`,
      op: W_.back,
    });
    for (const r of found) addRoot(roots, r);
    if (!uf.roots.length) return { roots };
    // a(xᵏ − u₁)(xᵏ − u₂), each bracket split as far as it goes
    let K = lead(q);
    const parts: string[] = [];
    for (const { r, m } of uf.roots) {
      const piece = xk(F(r.d), kk);
      piece[0] = F(-r.n);
      K = chk(K.div(powFrac(F(r.d), m)));
      const fp = factorParts(factorQ(piece));
      for (let i = 0; i < m; i++) parts.push(...fp);
    }
    const kT = K.isOne() ? "" : K.n === -1 && K.d === 1 ? "-" : K.tex();
    return { roots, factored: `${pre}${kT}${parts.join("")}` };
  }
  let shownCands = false;
  while (pdeg(q) >= 3) {
    if (!shownCands) {
      rows.push({ tex: candTex(q), op: W_.candidates });
      shownCands = true;
    }
    let found: Frac | null = null;
    let fails = 0;
    for (const cand of candidates(q)) {
      const v = pval(q, cand);
      if (v.isZero()) {
        found = cand;
        rows.push({ tex: `x = ${cand.tex()}:\\quad ${valuesTex(q, cand)} = 0`, op: fill(W_.root, { d: plainTex(facTex(cand)) }), color: C.green });
        break;
      }
      if (fails < 3) rows.push({ tex: `x = ${cand.tex()}:\\quad ${valuesTex(q, cand)} = ${v.tex()} \\ne 0`, color: C.grey });
      else if (fails === 3) rows.push({ tex: "\\vdots", color: C.grey });
      fails++;
    }
    if (!found) break;
    const syn = syntheticPic(q, found);
    pics.push(syn.pic);
    const next = pscale(syn.q, F(1, found.d));
    rows.push({ tex: `${polyTex(q)} = ${br(facTex(found))}${br(polyTex(next))}`, op: fill(W_.division, { d: plainTex(facTex(found)) }) });
    addRoot(roots, { v: found.toNumber(), tex: found.tex(), m: 1 });
    q = next;
  }
  if (pdeg(q) === 2) solveQuadratic(q, rows, sfx, roots);
  else if (pdeg(q) === 1) addRoot(roots, { v: chk(at(q, 0).neg().div(at(q, 1))).toNumber(), tex: chk(at(q, 0).neg().div(at(q, 1))).tex(), m: 1 });
  else if (pdeg(q) >= 3) {
    const ap = numericRoots(nums(q));
    for (const x of ap) addRoot(roots, { v: x, tex: `\\approx ${tn(x, 4)}`, m: 1 });
    caps.push({ text: W_.noRational, color: C.orange });
  }
  return { roots };
}

/** Where p > 0 (or < 0, ≥ 0, ≤ 0), from the signs between the roots. */
function solutionSet(p: P, rs: Root[], rel: Rel): Seg[] {
  const xs = rs.map((r) => r.v).sort((a, b) => a - b);
  const ok = (v: number) => (rel === ">" || rel === "≥" ? v > 0 : v < 0);
  const incl = rel === "≥" || rel === "≤";
  // pieces: interval 0, root 1, interval 1, …, root n, interval n
  const good: boolean[] = [];
  for (let i = 0; i <= xs.length; i++) {
    const t = i === 0 ? (xs.length ? xs[0] - 1 : 0) : i === xs.length ? xs[i - 1] + 1 : (xs[i - 1] + xs[i]) / 2;
    if (i > 0) good.push(incl);
    good.push(ok(pnum(p, t)));
  }
  const segs: Seg[] = [];
  const posOf = (j: number) => (j % 2 === 0 ? null : xs[(j - 1) / 2]);
  for (let j = 0; j < good.length; ) {
    if (!good[j]) {
      j++;
      continue;
    }
    let e = j;
    while (e + 1 < good.length && good[e + 1]) e++;
    const lo = j % 2 === 1 ? posOf(j)! : j === 0 ? -Infinity : xs[j / 2 - 1];
    const hi = e % 2 === 1 ? posOf(e)! : e === good.length - 1 ? Infinity : xs[e / 2];
    segs.push({ lo, hi, loIn: j % 2 === 1, hiIn: e % 2 === 1 });
    j = e + 1;
  }
  return segs;
}
function segTex(g: Seg, rs: Root[]): { ineq: string; iv: string } {
  const t = (v: number) => rs.find((r) => Math.abs(r.v - v) < 1e-9)?.tex.replace("\\approx ", "") ?? tn(v, 4);
  if (g.lo === -Infinity && g.hi === Infinity) return { ineq: "x \\in \\mathbb{R}", iv: "(-\\infty, \\infty)" };
  if (g.lo === g.hi) return { ineq: `x = ${t(g.lo)}`, iv: `\\{${t(g.lo)}\\}` };
  const L = g.lo === -Infinity ? "" : `${t(g.lo)} ${g.loIn ? "\\le" : "<"} `;
  const R = g.hi === Infinity ? "" : ` ${g.hiIn ? "\\le" : "<"} ${t(g.hi)}`;
  const ineq = g.lo === -Infinity ? `x${R}` : g.hi === Infinity ? `x ${g.loIn ? "\\ge" : ">"} ${t(g.lo)}` : `${L}x${R}`;
  const iv = `${g.loIn ? "[" : "("}${g.lo === -Infinity ? "-\\infty" : t(g.lo)}, ${g.hi === Infinity ? "\\infty" : t(g.hi)}${g.hiIn ? "]" : ")"}`;
  return { ineq, iv };
}

/** One row per factor, its sign between the roots, and the product's sign underneath. */
function signTablePic(p: P, rs: Root[], rel: Rel): Pic {
  const xs = [...rs].sort((a, b) => a.v - b.v);
  type FRow = { t: string; sign: (x: number) => number; zero: number[] };
  const fr: FRow[] = [];
  const f = factorQ(p);
  for (const r of xs) {
    const exact = f.roots.find((x) => Math.abs(x.r.toNumber() - r.v) < 1e-12);
    const base = exact ? (exact.r.isZero() ? "x" : br(facTex(exact.r))) : br(`x ${r.tex.startsWith("-") ? `+ ${r.tex.slice(1)}` : `- ${r.tex.replace("\\approx ", "")}`}`);
    fr.push({ t: r.m > 1 ? `${base}^{${r.m}}` : base, sign: (x) => (x > r.v ? 1 : r.m % 2 ? -1 : 1), zero: [r.v] });
  }
  const covered = xs.reduce((s, r) => s + r.m, 0);
  if (covered < pdeg(p)) {
    const restT = f.rest && f.roots.length === xs.filter((r) => f.roots.some((x) => Math.abs(x.r.toNumber() - r.v) < 1e-12)).length ? polyTex(f.rest) : "";
    if (restT) fr.push({ t: br(restT), sign: () => (lead(p).isNeg() ? -1 : 1), zero: [] });
  }
  const fT = "f(x)";
  const labW = Math.min(190, Math.max(70, ...fr.map((r) => twidth(r.t) + 20)));
  const n = xs.length;
  const rootW = 34;
  const ivW = (W - 40 - labW - n * rootW) / (n + 1);
  const colX = (i: number) => labW + i * (ivW + rootW); // left of interval i
  const rowH = 30;
  const y0 = 18;
  const ok = (s: number) => (rel === ">" || rel === "≥" ? s > 0 : s < 0);
  const h = y0 + (fr.length + 1) * rowH + 22;
  let svg = "";
  for (let i = 1; i <= n; i++) svg += line(colX(i) - rootW / 2, y0 + rowH / 2 - 2, colX(i) - rootW / 2, h - 6, C.grey, 1, `stroke-dasharray="3 3"`);
  svg += put("x", labW / 2, y0, "middle", C.ink);
  xs.forEach((r, i) => (svg += put(r.tex.replace("\\approx ", ""), colX(i + 1) - rootW / 2, y0, "middle", C.purple, 0.9)));
  const sample = (i: number) => (i === 0 ? xs[0].v - 1 : i === n ? xs[n - 1].v + 1 : (xs[i - 1].v + xs[i].v) / 2);
  const all = [...fr, { t: fT, sign: (x: number) => Math.sign(pnum(p, x)), zero: xs.map((r) => r.v) }];
  all.forEach((row, k) => {
    const y = y0 + (k + 1) * rowH + (k === all.length - 1 ? 6 : 0);
    const last = k === all.length - 1;
    if (last) svg += line(10, y - rowH / 2 - 1, W - 40, y - rowH / 2 - 1, C.ink, 1.3);
    svg += put(row.t, labW - 12, y, "end", last ? C.blue : C.ink, 0.95);
    for (let i = 0; i <= n; i++) {
      const s = row.sign(sample(i));
      const good = last && ok(s);
      if (good) svg += `<rect x="${r2(colX(i) + 4)}" y="${r2(y - rowH / 2 + 3)}" width="${r2(ivW - 8)}" height="${rowH - 6}" fill="${C.green}" opacity="0.15" rx="4"/>`;
      svg += put(s > 0 ? "+" : "-", colX(i) + ivW / 2, y, "middle", last ? (good ? C.green : C.red) : C.ink);
    }
    xs.forEach((r, i) => {
      if (row.zero.some((z) => Math.abs(z - r.v) < 1e-12))
        svg += `<rect x="${r2(colX(i + 1) - rootW / 2 - 7)}" y="${r2(y - 9)}" width="14" height="18" fill="#ffffff"/>` + put("0", colX(i + 1) - rootW / 2, y, "middle", last && (rel === "≥" || rel === "≤") ? C.green : C.ink);
    });
  });
  return { svg, h, w: W - 30 };
}

function renderSolve(src: string): RenderedSvg {
  const W_ = words.solve;
  const { l, r, rel } = splitRel(src);
  if (!l.trim()) throw new Error(words.need.solve);
  const L = readP(l);
  const R = r === null ? [ZERO] : readP(r);
  let p = psub(L, R);
  if (pdeg(p) < 1) throw new Error(words.noX);
  if (pdeg(p) > 10) throw new Error(words.tooHigh);
  const header = rel ? `${tex(parseE(l))} ${REL_TEX[rel]} ${tex(parseE(r!))}` : `f(x) = ${polyTex(p)}`;
  const rows: TexLine[] = [];
  const pics: Pic[] = [];
  const caps: Caption[] = [];
  let R_ = rel;
  if (rel && pdeg(R) >= 0) rows.push({ tex: `${polyTex(p)} ${REL_TEX[rel]} 0`, op: W_.rearrange });
  if (R_ && lead(p).isNeg()) {
    p = pscale(p, MINUS);
    R_ = FLIP[R_];
    rows.push({ tex: `${polyTex(p)} ${REL_TEX[R_]} 0`, op: R_ === "=" ? W_.times : W_.flip });
  }
  const steps = solveSteps(p, rows, pics, caps, R_ === "=");
  const roots = steps.roots.sort((a, b) => a.v - b.v);
  data.roots = roots.map((x) => x.v);
  const f = factorQ(p);
  const fT = steps.factored ?? (roots.length && factorCount(f) > 1 && (f.roots.length || f.rest === null) ? factoredTex(f) : null);
  if (fT) rows.push({ tex: R_ ? `${fT} ${REL_TEX[R_]} 0` : `f(x) = ${fT}`, op: W_.factored, color: C.blue });
  if (!R_ || R_ === "=") {
    if (roots.length) rows.push({ tex: rootsTex(roots), op: W_.roots, color: C.green });
    else caps.push({ text: W_.noRoots, color: C.red });
  }
  const sp = flow(pics.slice(0, 4).map((q) => ({ ...q })));
  const out: Pic[] = [];
  if (sp.length) caps.push({ text: W_.syntheticCap });
  out.push(...sp);
  let shade: Seg[] | undefined;
  if (R_ && R_ !== "=") {
    const segs = solutionSet(p, roots, R_);
    shade = segs;
    data.set = segs;
    const ts = segs.map((g) => segTex(g, roots));
    rows.push({
      tex: segs.length ? ts.map((t) => t.ineq).join(` \\ \\text{${words.or}}\\ `) : `\\text{${W_.none}}`,
      op: W_.solution,
      color: C.green,
    });
    if (segs.length && !(segs.length === 1 && segs[0].lo === -Infinity && segs[0].hi === Infinity)) rows.push({ tex: `x \\in ${ts.map((t) => t.iv).join(" \\cup ")}`, op: W_.interval, color: C.green });
    if (roots.length) out.push(signTablePic(p, roots, R_));
    caps.push({ text: W_.signCap });
    caps.push({ text: fill(W_.ineqCap, { s: R_ }), color: C.green });
  }
  for (const x of roots.filter((x) => x.m > 1)) caps.push({ text: fill(W_.repeated, { x: plainTex(x.tex) }), color: C.purple });
  const stat = numericRoots(nums(pderiv(p)));
  out.push(graphPic([{ f: (x) => pnum(p, x), color: C.blue }], [...roots.map((x) => x.v), ...stat], roots.map((x) => ({ x: x.v, y: 0, color: C.red })), { shade }));
  caps.push({ text: W_.graphCap });
  return finish(header, rows, out, caps);
}

// ---------- the binomial expansion ----------

/** c·xᵖ */
type Mono = { c: Frac; p: number };
function monoOf(e: E): Mono | null {
  switch (e.k) {
    case "num":
      return { c: e.v, p: 0 };
    case "var":
      return e.name === "x" ? { c: ONE, p: 1 } : null;
    case "mul": {
      let m: Mono = { c: ONE, p: 0 };
      for (const f of e.fs) {
        const g = monoOf(f);
        if (!g) return null;
        m = { c: chk(m.c.mul(g.c)), p: m.p + g.p };
      }
      return m;
    }
    case "pow": {
      if (e.e.k !== "num" || !e.e.v.isInt()) return null;
      const b = monoOf(e.b);
      if (!b || (b.c.isZero() && e.e.v.n < 0)) return null;
      return { c: chk(powFrac(b.c, e.e.v.n)), p: b.p * e.e.v.n };
    }
    default:
      return null;
  }
}
/** An exact number from an expression of numbers, or null. */
function constOf(e: E): Frac | null {
  const m = monoOf(e);
  return m && m.p === 0 ? m.c : null;
}
const monoTex = (m: Mono, first = true) => termTex(m.c, m.p, first);
/** x³, x⁰, x⁻² as plain text. */
const xPow = (k: number) => plainTex(`x^{${k}}`);
/** A value inside a product: bracketed only when negative. */
const valTex = (m: Mono) => (m.c.isNeg() ? br(monoTex(m)) : monoTex(m));
const monoPow = (m: Mono, e: number): Mono => ({ c: chk(powFrac(m.c, e)), p: m.p * e });
/** (2x)^{3}, (-3)^{2}, x^{4}; nothing for the power 0. */
function monoPowTex(m: Mono, e: number): string {
  if (e === 0) return "";
  const bare = m.c.isOne() && m.p === 1;
  const simple = m.p === 0 && !m.c.isNeg() && m.c.isInt();
  const t = monoTex(m);
  if (e === 1) return simple || bare ? t : br(t);
  return `${simple || bare ? t : br(t)}^{${e}}`;
}
function choose(n: number, r: number): number {
  let c = 1;
  for (let i = 1; i <= r; i++) c = (c * (n - r + i)) / i;
  return Math.round(c);
}
/** n(n − 1)…(n − r + 1)/r! for any rational n. */
function genChoose(n: Frac, r: number): Frac {
  let c = ONE;
  for (let i = 0; i < r; i++) c = chk(chk(c.mul(n.sub(F(i)))).div(F(i + 1)));
  return c;
}
const fact = (r: number): number => (r <= 1 ? 1 : r * fact(r - 1));

function renderBinomial(src: string): RenderedSvg {
  const W_ = words.binomial;
  const [main, ...opts] = src.split(/[;,](?![^(]*\))/).map((s) => s.trim());
  if (!main) throw new Error(words.need.binomial);
  // options: x^k (one term), a whole number (how many terms), x = value (an estimate)
  let target: number | null = null;
  let count: number | null = null;
  let xv: number | null = null;
  for (const o of opts.filter(Boolean)) {
    let m = /^x\s*=\s*(.+)$/.exec(o);
    if (m) {
      const f = constOf(parseE(m[1]));
      if (!f) throw new Error(fill(words.bad, { s: o }));
      xv = f.toNumber();
      continue;
    }
    m = /^x\s*\^\s*\(?\s*([-−]?\d+)\s*\)?$/.exec(o) ?? /^x\s*\^\s*\{([-−]?\d+)\}$/.exec(o);
    if (m) {
      target = Number(m[1].replace("−", "-"));
      continue;
    }
    if (/^x$/.test(o)) {
      target = 1;
      continue;
    }
    if (/^(const|1|x\^0)$/i.test(o.replace(/\s+/g, ""))) {
      target = 0;
      continue;
    }
    m = /(\d+)/.exec(o);
    if (m) {
      count = Math.max(1, Math.min(12, Number(m[1])));
      continue;
    }
    throw new Error(fill(words.bad, { s: o }));
  }
  const e = parseE(main);
  // k·(A + B)^n
  let k = ONE;
  let pw: E | null = null;
  const parts = e.k === "mul" ? e.fs : [e];
  for (const f of parts) {
    const c = constOf(f);
    if (c) k = chk(k.mul(c));
    else if (pw) throw new Error(W_.notTwo);
    else pw = f;
  }
  if (!pw || pw.k !== "pow") throw new Error(W_.notTwo);
  let n = constOf(pw.e);
  let base = pw.b;
  while (base.k === "pow" && n) {
    const m = constOf(base.e);
    if (!m) break;
    n = chk(n.mul(m));
    base = base.b;
  }
  if (!n || base.k !== "add" || base.ts.length !== 2) throw new Error(W_.notTwo);
  const A = monoOf(base.ts[0]);
  const B = monoOf(base.ts[1]);
  if (!A || !B || A.p === B.p || A.c.isZero() || B.c.isZero()) throw new Error(W_.notTwo);
  const head = tex(e);
  const rows: TexLine[] = [];
  const caps: Caption[] = [];
  const pics: Pic[] = [];
  const kT = k.isOne() ? "" : k.n === -1 && k.d === 1 ? "-" : k.tex();
  const rpow = (b: number, e: Frac) => (b < 0 && e.d % 2 === 1 ? (e.n % 2 ? -1 : 1) * Math.abs(b) ** e.toNumber() : b ** e.toNumber());
  const fnum = (x: number) => k.toNumber() * rpow(A.c.toNumber() * x ** A.p + B.c.toNumber() * x ** B.p, n!);

  if (n.isInt() && n.n >= 0) {
    const N_ = n.n;
    if (N_ > 20) throw new Error(W_.tooBigN);
    const term = (r: number) => ({ c: chk(chk(k.mul(F(choose(N_, r)))).mul(chk(chk(powFrac(A.c, N_ - r)).mul(powFrac(B.c, r))))), p: A.p * (N_ - r) + B.p * r });
    const all = Array.from({ length: N_ + 1 }, (_, r) => term(r));
    data.terms = all.map((t) => [t.p, t.c.toNumber()]);
    const aT = monoTex(A);
    const bT = monoTex(B);
    rows.push({ tex: `${head} = ${kT}\\sum_{r=0}^{${N_}} \\binom{${N_}}{r} ${br(aT)}^{${N_} - r} ${br(bT)}^{r}`, op: W_.theorem });
    const termRow = (r: number) => {
      const t = all[r];
      const fs = [`\\binom{${N_}}{${r}}`, monoPowTex(A, N_ - r), monoPowTex(B, r)].filter(Boolean).join("");
      const vals = [String(choose(N_, r)), N_ - r ? valTex(monoPow(A, N_ - r)) : "", r ? valTex(monoPow(B, r)) : ""].filter(Boolean).join(" \\cdot ");
      return { tex: `${kT ? `${kT}\\cdot ` : ""}${fs} = ${kT ? `${kT}\\cdot ` : ""}${vals} = ${monoTex(t)}`, op: fill(W_.term, { r }) };
    };
    if (target !== null) {
      // T(r+1) = C(n, r)·A^(n−r)·B^r: the power of x is A.p(n − r) + B.p·r
      rows.push({ tex: `T_{r+1} = ${kT}\\binom{${N_}}{r}${br(aT)}^{${N_} - r}${br(bT)}^{r}`, op: W_.general });
      const slope = B.p - A.p;
      const c0 = A.p * N_;
      const powT = `${c0 === 0 ? "" : c0}${slope === 0 ? "" : `${slope < 0 ? (c0 === 0 ? "-" : " - ") : c0 === 0 ? "" : " + "}${Math.abs(slope) === 1 ? "" : Math.abs(slope)}r`}`;
      const rr = (target - c0) / slope;
      rows.push({ tex: `x:\\quad ${powT || "0"} = ${target} \\;\\Rightarrow\\; r = ${Number.isInteger(rr) ? rr : F(target - c0, slope).tex()}`, op: W_.power });
      if (Number.isInteger(rr) && rr >= 0 && rr <= N_) {
        const t = all[rr];
        rows.push({ ...termRow(rr), color: C.green });
        data.coef = t.c.toNumber();
        caps.push({ text: fill(W_.coefficient, { t: xPow(target), c: plainTex(t.c.tex()), term: plainTex(monoTex(t)) }), color: C.green });
      } else {
        data.coef = 0;
        caps.push({ text: fill(W_.noTerm, { t: xPow(target), r: plainTex(F(target - c0, slope).tex()), n: N_ }), color: C.red });
      }
    } else {
      const shown = count ?? (N_ <= 7 ? N_ + 1 : 0);
      for (let r = 0; r < Math.min(shown, N_ + 1); r++) rows.push(termRow(r));
      const upto = count ? Math.min(count, N_ + 1) : N_ + 1;
      const ts = all.slice(0, upto);
      const more = upto < N_ + 1 ? " + \\cdots" : "";
      const per = Math.ceil(ts.length / Math.ceil(ts.length / 6));
      for (let i = 0; i < ts.length; i += per) {
        const chunk = ts.slice(i, i + per).map((t, j) => termTex(t.c, t.p, i + j === 0)).join(" ");
        rows.push({ tex: `${i === 0 ? `${head} = ` : "\\quad "}${chunk}${i + per >= ts.length ? more : ""}`, op: i === 0 ? (count ? fill(W_.firstTerms, { n: upto }) : W_.expansion) : "", color: C.green });
      }
      if (xv !== null) {
        const est = ts.reduce((s, t) => s + t.c.toNumber() * xv! ** t.p, 0);
        const ex = fnum(xv);
        rows.push({ tex: `x = ${tn(xv, 6)}:\\quad ${ts.map((t, i) => termTex(F(1), 0, i === 0).replace("1", tn(t.c.toNumber() * xv! ** t.p, 8))).join(" ")} \\approx ${tn(est, 8)}`, op: W_.estimate, color: C.blue });
        rows.push({ tex: `${head.replace(/x/g, `(${tn(xv, 6)})`)} = ${tn(ex, 10)}`, op: W_.exact });
        caps.push({ text: fill(W_.errorCap, { e: plainTex(tn(Math.abs(ex - est), 3)) }) });
      }
    }
    if (N_ <= 10) pics.push(pascalPic(N_));
    caps.push({ text: fill(W_.pascal, { n: N_ }), color: C.blue });
    return finish(head, rows, pics, caps);
  }

  // any other power: (a + b·x^q)^n = a^n (1 + (b/a)x^q)^n, the binomial series
  const [cst, varT] = A.p === 0 ? [A, B] : B.p === 0 ? [B, A] : [null, null];
  if (!cst || !varT || varT.p <= 0) throw new Error(W_.needConst);
  const an = (() => {
    const r = rootFrac(cst.c, n.d);
    return r ? chk(powFrac(r, n.n)) : null;
  })();
  if (!an) throw new Error(fill(W_.needExact, { a: plainTex(cst.c.tex()), n: plainTex(n.tex()) }));
  const u: Mono = { c: chk(varT.c.div(cst.c)), p: varT.p };
  const uT = monoTex(u);
  const nT = n.tex();
  const outer = chk(k.mul(an));
  const N_ = count ?? 4;
  const coefs = Array.from({ length: N_ }, (_, r) => chk(genChoose(n, r).mul(powFrac(u.c, r))));
  if (!cst.c.isOne())
    rows.push({ tex: `${head} = ${kT}${cst.c.tex()}^{${nT}}${br(`1 ${termTex(u.c, u.p, false)}`)}^{${nT}} = ${outer.isOne() ? "" : outer.tex()}${br(`1 ${termTex(u.c, u.p, false)}`)}^{${nT}}`, op: fill(W_.takeOut, { a: plainTex(`${cst.c.tex()}^{${nT}}`) }) });
  rows.push({ tex: `(1 + u)^{n} = 1 + nu + \\frac{n(n-1)}{2!}u^2 + \\frac{n(n-1)(n-2)}{3!}u^3 + \\cdots`, op: W_.series });
  for (let r = 1; r < N_; r++) {
    const fall = Array.from({ length: r }, (_, i) => br(n.sub(F(i)).tex())).join("");
    const lhs = r === 1 ? `${br(nT)}${br(uT)}` : `\\frac{${fall}}{${r}!}${br(uT)}^{${r}}`;
    rows.push({ tex: `${lhs} = ${termTex(coefs[r], u.p * r, true)}`, op: fill(W_.term, { r }) });
  }
  const final = coefs.map((c, r) => [u.p * r, chk(c.mul(outer))] as [number, Frac]);
  data.terms = final.map(([p, c]) => [p, c.toNumber()]);
  let coef: Frac | null = null;
  if (target !== null) {
    const r = target / u.p;
    coef = Number.isInteger(r) && r >= 0 ? chk(chk(genChoose(n, r).mul(powFrac(u.c, r))).mul(outer)) : ZERO;
    data.coef = coef.toNumber();
  }
  rows.push({ tex: `${head} \\approx ${termsTex(final)} + \\cdots`, op: fill(W_.firstTerms, { n: N_ }), color: C.green });
  // |u| < 1
  const R = chk(cst.c.div(varT.c)).abs();
  const rq = u.p === 1 ? R : rootFrac(R, u.p);
  const Rv = R.toNumber() ** (1 / u.p);
  const RT = rq ? rq.tex() : u.p === 2 ? qsTex(qs(ZERO, sqrtSplit(R).out, sqrtSplit(R).s)) : `\\sqrt[${u.p}]{${R.tex()}}`;
  data.valid = Rv;
  rows.push({ tex: `\\left|${uT}\\right| < 1 \\;\\Rightarrow\\; |x| < ${RT}`, op: W_.valid, color: C.purple });
  if (target !== null && coef) caps.push({ text: fill(W_.coefficient, { t: xPow(target), c: plainTex(coef.tex()), term: plainTex(termTex(coef, target, true)) }), color: C.green });
  if (xv !== null) {
    const est = final.reduce((s, [p, c]) => s + c.toNumber() * xv! ** p, 0);
    const ex = fnum(xv);
    rows.push({ tex: `x = ${tn(xv, 6)}:\\quad ${head.replace(/x/g, `(${tn(xv, 6)})`)} \\approx ${tn(est, 8)}`, op: W_.estimate, color: C.blue });
    rows.push({ tex: `${tn(ex, 10)}`, op: W_.exact });
    caps.push({ text: fill(W_.errorCap, { e: plainTex(tn(Math.abs(ex - est), 3)) }) });
  }
  const poly = (x: number) => final.reduce((s, [p, c]) => s + c.toNumber() * x ** p, 0);
  pics.push(
    graphPic(
      [
        { f: fnum, color: C.blue },
        { f: poly, color: C.red, dash: true },
      ],
      [-Rv, Rv],
      [{ x: 0, y: fnum(0), color: C.ink }],
      { xr: [-1.8 * Rv, 1.8 * Rv], strip: [-Rv, Rv], yr: yRange([...sampleY(fnum, -0.9 * Rv, 0.9 * Rv, 200), ...sampleY(poly, -0.9 * Rv, 0.9 * Rv, 200)], [0]) },
    ),
  );
  caps.push({ text: fill(W_.validCap, { c: `|x| < ${plainTex(RT)}` }), color: C.purple });
  return finish(head, rows, pics, caps);
}

function pascalPic(n: number): Pic {
  const cw = n <= 6 ? 40 : 34;
  const rh = 22;
  let svg = "";
  for (let i = 0; i <= n; i++) {
    const y = 12 + i * rh;
    for (let j = 0; j <= i; j++) {
      const x = (W - 24) / 2 + (j - i / 2) * cw;
      const hl = i === n;
      svg += `<text x="${r2(x)}" y="${r2(y + 4)}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${hl ? 14 : 12}" font-weight="${hl ? 700 : 400}" fill="${hl ? C.blue : C.grey}">${choose(i, j)}</text>`;
    }
  }
  return { svg, h: 12 + (n + 1) * rh, w: W - 24 };
}

// ---------- simultaneous equations: a line and a curve ----------

/** A polynomial in x and y: "i,j" → the coefficient of xⁱyʲ. */
type P2 = Map<string, Frac>;
const key2 = (i: number, j: number) => `${i},${j}`;
function p2Add(a: P2, b: P2): P2 {
  const r: P2 = new Map(a);
  for (const [k, v] of b) {
    const s = chk((r.get(k) ?? ZERO).add(v));
    if (s.isZero()) r.delete(k);
    else r.set(k, s);
  }
  return r;
}
function p2Mul(a: P2, b: P2): P2 {
  let r: P2 = new Map();
  for (const [ka, va] of a)
    for (const [kb, vb] of b) {
      const [i1, j1] = ka.split(",").map(Number);
      const [i2, j2] = kb.split(",").map(Number);
      r = p2Add(r, new Map([[key2(i1 + i2, j1 + j2), chk(va.mul(vb))]]));
    }
  return r;
}
function toP2(e: E, src: string): P2 {
  switch (e.k) {
    case "num":
      return e.v.isZero() ? new Map() : new Map([[key2(0, 0), e.v]]);
    case "var":
      return new Map([[e.name === "x" ? key2(1, 0) : key2(0, 1), ONE]]);
    case "add":
      return e.ts.map((t) => toP2(t, src)).reduce(p2Add, new Map());
    case "mul":
      return e.fs.map((f) => toP2(f, src)).reduce(p2Mul, new Map([[key2(0, 0), ONE]]));
    case "pow": {
      if (e.e.k !== "num" || !e.e.v.isInt() || Math.abs(e.e.v.n) > 6) break;
      let r: P2 = new Map([[key2(0, 0), ONE]]);
      const b = toP2(e.b, src);
      if (e.e.v.n < 0) {
        const c = b.size === 1 ? b.get(key2(0, 0)) : b.size === 0 ? ZERO : null;
        if (!c || c.isZero()) break;
        return new Map([[key2(0, 0), chk(powFrac(c, e.e.v.n))]]);
      }
      for (let i = 0; i < e.e.v.n; i++) r = p2Mul(r, b);
      return r;
    }
  }
  throw new Error(fill(words.notPoly, { s: src.trim() }));
}
const p2Deg = (p: P2) => Math.max(-1, ...[...p.keys()].map((k) => k.split(",").map(Number).reduce((a, b) => a + b)));
function p2Fn(p: P2): (x: number, y: number) => number {
  const ts = [...p].map(([k, v]) => [...k.split(",").map(Number), v.toNumber()]);
  return (x, y) => {
    let s = 0;
    for (const [i, j, c] of ts) s += c * x ** i * y ** j;
    return s;
  };
}
/** The polynomial in the other letter after subject = m·t + c. */
function p2Sub(p: P2, subj: "x" | "y", m: Frac, c: Frac): P {
  let out: P = [ZERO];
  const lin_: P = [c, m];
  for (const [k, v] of p) {
    const [i, j] = k.split(",").map(Number);
    const [ps, po] = subj === "y" ? [j, i] : [i, j];
    let t: P = xk(v, po);
    for (let s = 0; s < ps; s++) t = pmul(t, lin_);
    out = padd(out, t);
  }
  return ptrim(out);
}

/** The curve g(x, y) = 0 traced cell by cell (marching squares). */
function contour(fr: Frame, g: (x: number, y: number) => number, color: string, width = 2.4): string {
  const nx = 240;
  const ny = Math.round((nx * (fr.bottom - fr.top)) / (fr.right - fr.left));
  const X_ = (i: number) => fr.x0 + ((fr.x1 - fr.x0) * i) / nx;
  const Y_ = (j: number) => fr.y0 + ((fr.y1 - fr.y0) * j) / ny;
  const v: number[][] = [];
  for (let j = 0; j <= ny; j++) {
    v.push([]);
    for (let i = 0; i <= nx; i++) {
      const z = g(X_(i) + 1e-9, Y_(j) + 1e-9);
      v[j].push(z === 0 ? 1e-12 : z);
    }
  }
  let d = "";
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const c = [v[j][i], v[j][i + 1], v[j + 1][i + 1], v[j + 1][i]];
      const pts: [number, number][] = [];
      const corner = [
        [i, j],
        [i + 1, j],
        [i + 1, j + 1],
        [i, j + 1],
      ];
      for (let e = 0; e < 4; e++) {
        const [a, b] = [c[e], c[(e + 1) % 4]];
        if (a > 0 !== b > 0 && Number.isFinite(a) && Number.isFinite(b)) {
          const t = a / (a - b);
          const [p, q] = [corner[e], corner[(e + 1) % 4]];
          pts.push([X_(p[0] + (q[0] - p[0]) * t), Y_(p[1] + (q[1] - p[1]) * t)]);
        }
      }
      for (let s = 0; s + 1 < pts.length; s += 2) d += `M${r2(fr.sx(pts[s][0]))} ${r2(fr.sy(pts[s][1]))}L${r2(fr.sx(pts[s + 1][0]))} ${r2(fr.sy(pts[s + 1][1]))}`;
    }
  return `<path clip-path="url(#${fr.id})" d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;
}

function renderSimultaneous(src: string): RenderedSvg {
  const W_ = words.sim;
  const cs = clauses(src);
  if (cs.length !== 2) throw new Error(W_.needTwo);
  const eqs = cs.map((c) => {
    const parts = c.split("=");
    if (parts.length > 2) throw new Error(fill(words.bad, { s: c }));
    const [l, r] = [parseE(parts[0], ["y"]), parseE(parts[1] ?? "0", ["y"])];
    const g = p2Add(toP2(l, c), new Map([...toP2(r, c)].map(([k, v]) => [k, v.neg()])));
    return { l, r, g, src: c };
  });
  const degs = eqs.map((e) => p2Deg(e.g));
  const li = degs[0] === 1 ? 0 : degs[1] === 1 ? 1 : -1;
  if (li < 0) throw new Error(W_.needLinear);
  const L = eqs[li];
  const O = eqs[1 - li];
  if (p2Deg(O.g) > 4) throw new Error(W_.tooHigh);
  if (p2Deg(O.g) < 1) throw new Error(W_.needLinear);
  const [a, b, c] = [L.g.get(key2(1, 0)) ?? ZERO, L.g.get(key2(0, 1)) ?? ZERO, L.g.get(key2(0, 0)) ?? ZERO];
  const unit = (f: Frac) => f.abs().isOne();
  const subj: "x" | "y" = unit(b) ? "y" : unit(a) ? "x" : !b.isZero() ? "y" : "x";
  const other = subj === "y" ? "x" : "y";
  const [m, k] = subj === "y" ? [chk(a.neg().div(b)), chk(c.neg().div(b))] : [chk(b.neg().div(a)), chk(c.neg().div(a))];
  const rows: TexLine[] = [];
  const caps: Caption[] = [];
  const linP: P = [k, m];
  rows.push({ tex: `${subj} = ${polyTex(linP, other, m.isNeg() && !k.isNeg() && !k.isZero())}`, op: fill(W_.subject, { v: subj }) });
  // what replaces the subject, constant first when that avoids a leading minus
  const T: E = V(other);
  const mt: E[] = m.isZero() ? [] : m.isOne() ? [T] : m.n === -1 && m.d === 1 ? [neg(T)] : [mul(N(m), T)];
  const kt: E[] = k.isZero() ? [] : [N(k)];
  const ts = m.isNeg() && !k.isNeg() ? [...kt, ...mt] : [...mt, ...kt];
  const linE: E = ts.length === 0 ? N(0) : ts.length === 1 ? ts[0] : add(...ts);
  rows.push({ tex: `${tex(substitute(O.l, subj, linE))} = ${tex(substitute(O.r, subj, linE))}`, op: W_.substitute });
  let h = p2Sub(O.g, subj, m, k);
  data.points = [];
  const pts: { x: QS | number; y: QS | number }[] = [];
  const back = (t: QS | number) => (typeof t === "number" ? m.toNumber() * t + k.toNumber() : qsAdd(qsMul(qs(m), t), qs(k)));
  const val = (t: QS | number) => (typeof t === "number" ? t : qsNum(t));
  const ttex = (t: QS | number) => (typeof t === "number" ? tn(t, 4) : qsTex(t));
  if (pdeg(h) <= 0) {
    rows.push({ tex: `${polyTex(h, other)} = 0`, op: W_.collect });
    caps.push({ text: pdeg(h) < 0 ? W_.always : W_.never, color: C.red });
  } else {
    if (lead(h).isNeg()) h = pscale(h, MINUS);
    rows.push({ tex: `${polyTex(h, other)} = 0`, op: W_.collect });
    const ct = content(h);
    if (!ct.k.isOne()) {
      h = ct.q;
      rows.push({ tex: `${polyTex(h, other)} = 0`, op: fill(W_.divide, { k: plainTex(ct.k.tex()) }) });
    }
    const roots: (QS | number)[] = [];
    if (pdeg(h) === 1) roots.push(qs(chk(at(h, 0).neg().div(at(h, 1)))));
    else if (pdeg(h) === 2) {
      const [c0, b1, a2] = [at(h, 0), at(h, 1), at(h, 2)];
      const D = chk(chk(b1.mul(b1)).sub(chk(F(4).mul(a2).mul(c0))));
      rows.push({ tex: `b^2 - 4ac = ${br(b1.tex())}^2 - 4${br(a2.tex())}${br(c0.tex())} = ${D.tex()}`, op: W_.discriminant, color: D.isNeg() ? C.red : D.isZero() ? C.purple : C.ink });
      caps.push(D.isNeg() ? { text: W_.none, color: C.red } : D.isZero() ? { text: W_.one, color: C.purple } : { text: W_.two, color: C.green });
      if (!D.isNeg()) {
        const f = factorQ(h);
        if (f.roots.length) rows.push({ tex: `${factoredTex(f, other)} = 0`, op: W_.factorise });
        const ex = realRoots(h).exact;
        if (!f.roots.length) rows.push({ tex: `${other} = \\frac{${b1.neg().tex()} \\pm \\sqrt{${D.tex()}}}{${chk(a2.mul(F(2))).tex()}} = ${ex.map(qsTex).join(",\\ ")}`, op: W_.formula });
        roots.push(...ex);
      }
    } else {
      const f = factorQ(h);
      if (f.roots.length && factorCount(f) > 1) rows.push({ tex: `${factoredTex(f, other)} = 0`, op: W_.factorise });
      const rr = realRoots(h);
      roots.push(...rr.exact, ...rr.approx);
      if (rr.approx.length) caps.push({ text: W_.numeric, color: C.orange });
      if (!roots.length) caps.push({ text: W_.never, color: C.red });
    }
    roots.sort((p, q) => val(p) - val(q));
    for (const t of roots) {
      const s = back(t);
      const tT = br(ttex(t));
      const mBody = m.abs().isOne() ? tT : `${m.abs().tex()}${tT}`;
      const rhs = m.isZero()
        ? k.tex()
        : m.isNeg() && !k.isNeg() && !k.isZero()
          ? `${k.tex()} - ${mBody}`
          : `${m.isNeg() ? "-" : ""}${mBody}${k.isZero() ? "" : ` ${termTex(k, 0, false)}`}`;
      rows.push({ tex: `${other} = ${ttex(t)}:\\quad ${subj} = ${rhs} ${typeof s === "number" ? "\\approx" : "="} ${ttex(s)}`, op: W_.back });
      pts.push(subj === "y" ? { x: t, y: s } : { x: s, y: t });
    }
    if (pts.length) rows.push({ tex: pts.map((p) => `(${ttex(p.x)},\\ ${ttex(p.y)})`).join(` \\quad \\text{${words.or}} \\quad `), op: W_.solutions, color: C.green });
    data.points = pts.map((p) => [val(p.x), val(p.y)]);
  }
  // the picture: both graphs with equal units, around the points of intersection (and the whole curve if it is closed)
  const gs = eqs.map((e) => p2Fn(e.g));
  const ptsN = data.points;
  const xs = ptsN.map((p) => p[0]);
  const ys = ptsN.map((p) => p[1]);
  const Lb = Math.max(10, ...xs.map((v) => Math.abs(v) * 2), ...ys.map((v) => Math.abs(v) * 2));
  const bb = curveBox(gs[1 - li], Lb);
  if (bb && bb.closed) xs.push(bb.x0, bb.x1), ys.push(bb.y0, bb.y1);
  if (!xs.length && bb) xs.push(bb.x0, bb.x1), ys.push(bb.y0, bb.y1);
  if (!xs.length) xs.push(-5, 5), ys.push(-5, 5);
  let [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  let [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  const pad = Math.max(2, 0.25 * Math.max(x1 - x0, y1 - y0));
  [x0, x1, y0, y1] = [x0 - pad, x1 + pad, y0 - pad, y1 + pad];
  const [fw, fh] = [W - 48 - 18, 320];
  const s = Math.max((x1 - x0) / fw, (y1 - y0) / fh);
  const [cx, cy] = [(x0 + x1) / 2, (y0 + y1) / 2];
  const fr = makeFrame(`pg${++frameNo}`, 48, 8, fw, fh, [cx - (s * fw) / 2, cx + (s * fw) / 2], [cy - (s * fh) / 2, cy + (s * fh) / 2]);
  let svg = axes(fr);
  svg += contour(fr, gs[1 - li], C.blue) + contour(fr, gs[li], C.red);
  for (const p of pts) {
    const [px, py] = [val(p.x), val(p.y)];
    svg += dot(fr.sx(px), fr.sy(py), C.green, 5);
    const label = `(${plainTex(ttex(p.x))}, ${plainTex(ttex(p.y))})`;
    svg += lbl(fr.sx(px) + 8, fr.sy(py) - 9, label.length > 26 ? `(${tn(px, 3)}, ${tn(py, 3)})`.replace(/\\[a-z]+/g, "") : label, C.green, "start", 12.5, false);
  }
  caps.push({ text: W_.graphCap });
  return finish(eqs.map((e) => `${tex(e.l)} = ${tex(e.r)}`).join(",\\qquad "), rows, [{ svg, h: fh + 26 }], caps);
}
/** Where the curve lies inside [−L, L]², and whether it stays away from the edges (a closed curve). */
function curveBox(g: (x: number, y: number) => number, L: number): { x0: number; x1: number; y0: number; y1: number; closed: boolean } | null {
  const n = 160;
  let [x0, x1, y0, y1] = [Infinity, -Infinity, Infinity, -Infinity];
  const v = (i: number, j: number) => g(-L + (2 * L * i) / n + 1e-9, -L + (2 * L * j) / n + 1e-9);
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const c = [v(i, j), v(i + 1, j), v(i, j + 1), v(i + 1, j + 1)];
      if (c.some((z) => z > 0) && c.some((z) => z <= 0)) {
        const [x, y] = [-L + (2 * L * (i + 0.5)) / n, -L + (2 * L * (j + 0.5)) / n];
        [x0, x1, y0, y1] = [Math.min(x0, x), Math.max(x1, x), Math.min(y0, y), Math.max(y1, y)];
      }
    }
  if (x0 === Infinity) return null;
  const edge = (2 * L) / n;
  return { x0, x1, y0, y1, closed: x0 > -L + 2 * edge && x1 < L - 2 * edge && y0 > -L + 2 * edge && y1 < L - 2 * edge };
}

// ---------- partial fractions ----------

const LETTERS = ["A", "B", "C", "D", "E", "G", "H", "K"];

function renderPartial(src: string): RenderedSvg {
  const W_ = words.partial;
  const parts = splitTop(src, "/");
  if (!parts || !parts[0].trim() || !parts[1].trim()) throw new Error(W_.needFraction);
  const top = readP(parts[0]);
  const den = readP(parts[1]);
  if (pdeg(den) < 1) throw new Error(W_.needFraction);
  if (pdeg(den) > 8 || pdeg(top) > 10) throw new Error(words.tooHigh);
  const head = `\\frac{${tex(parseE(parts[0]))}}{${tex(parseE(parts[1]))}}`;
  const rows: TexLine[] = [];
  const caps: Caption[] = [];
  let quot: P = [ZERO];
  let num = top;
  if (pdeg(top) >= pdeg(den)) {
    ({ q: quot, r: num } = pdivmod(top, den));
    rows.push({ tex: `${head} = ${polyTex(quot)} ${pdeg(num) < 0 ? "" : `+ \\frac{${polyTex(num)}}{${polyTex(den)}}`}`, op: W_.improper });
  }
  if (pdeg(num) < 0) {
    caps.push({ text: W_.polyOnly, color: C.green });
    data.pf = (x) => pnum(quot, x);
    return finish(head, rows, [], caps);
  }
  const fq = factorQ(den);
  if (fq.rest && pdeg(fq.rest) > 2) throw new Error(W_.hardDen);
  const denF = factoredTex(fq);
  const denT = tex(parseE(parts[1]));
  if (denF !== denT && denF !== polyTex(den)) rows.push({ tex: `${polyTex(den)} = ${denF}`, op: W_.factor });
  // R/(K·∏) = (R/K)/∏
  const R = pscale(num, ONE.div(fq.K));
  const prim: Factored = { K: ONE, roots: fq.roots, rest: fq.rest };
  const primT = factoredTex(prim);
  if (!fq.K.isOne()) rows.push({ tex: `\\frac{${polyTex(num)}}{${denF}} = \\frac{${polyTex(R)}}{${primT}}`, op: fill(W_.scale, { k: plainTex(fq.K.tex()) }) });
  type Term = { letter: string; basis: P; den: string; root?: Frac; j?: number; m?: number; quad?: "x" | "1" };
  const terms: Term[] = [];
  let li = 0;
  const facPow = (r: Frac, e: number): P => Array.from({ length: e }).reduce<P>((acc) => pmul(acc, facP(r)), [ONE]);
  const allLin = fq.roots.reduce<P>((acc, { r, m }) => pmul(acc, facPow(r, m)), [ONE]);
  const withRest = (p: P) => (fq.rest ? pmul(p, fq.rest) : p);
  for (const { r, m } of fq.roots)
    for (let j = 1; j <= m; j++) {
      const others = fq.roots.reduce<P>((acc, o) => pmul(acc, facPow(o.r, o.r.sub(r).isZero() ? m - j : o.m)), [ONE]);
      const base = r.isZero() ? "x" : facTex(r);
      terms.push({ letter: LETTERS[li++], basis: withRest(others), den: j > 1 ? `${r.isZero() ? "x" : br(base)}^{${j}}` : base, root: r, j, m });
    }
  if (fq.rest) {
    terms.push({ letter: LETTERS[li++], basis: pmul(allLin, [ZERO, ONE]), den: polyTex(fq.rest), quad: "x" });
    terms.push({ letter: LETTERS[li++], basis: allLin, den: polyTex(fq.rest), quad: "1" });
  }
  const setup = terms
    .filter((t) => t.quad !== "1")
    .map((t) => (t.quad === "x" ? `\\frac{${t.letter}x + ${terms[terms.indexOf(t) + 1].letter}}{${t.den}}` : `\\frac{${t.letter}}{${t.den}}`))
    .join(" + ");
  rows.push({ tex: `\\frac{${polyTex(R)}}{${primT}} \\equiv ${setup}`, op: W_.setup });
  // R ≡ A·(…) + B·(…) + …
  const basisTex = (t: Term) => {
    const f: Factored = { K: ONE, roots: [], rest: null };
    for (const { r, m } of fq.roots) {
      const e = t.quad ? m : r.sub(t.root!).isZero() ? m - t.j! : m;
      if (e > 0) f.roots.push({ r, m: e });
    }
    if (fq.rest && !t.quad) f.rest = fq.rest;
    const ps = factorParts(f);
    return ps.join("");
  };
  const idParts = terms
    .filter((t) => t.quad !== "1")
    .map((t) => {
      const b = basisTex(t);
      if (t.quad === "x") return `${br(`${t.letter}x + ${terms[terms.indexOf(t) + 1].letter}`)}${b}`;
      return `${t.letter}${b}`;
    });
  rows.push({ tex: `${polyTex(R)} \\equiv ${idParts.join(" + ")}`, op: fill(W_.multiply, { d: plainTex(primT) }) });
  const known = new Map<string, Frac>();
  // x = each root: every term but one vanishes
  for (const { r, m } of fq.roots) {
    const t = terms.find((x) => x.root && x.root.sub(r).isZero() && x.j === m)!;
    const bv = pval(t.basis, r);
    const lv = pval(R, r);
    const v = chk(lv.div(bv));
    known.set(t.letter, v);
    rows.push({ tex: `x = ${r.tex()}:\\quad ${lv.tex()} = ${bv.isOne() ? "" : bv.n === -1 && bv.d === 1 ? "-" : bv.tex()}${t.letter} \\;\\Rightarrow\\; ${t.letter} = ${v.tex()}`, op: fill(W_.substitute, { a: plainTex(r.tex()) }), color: C.blue });
  }
  if (fq.roots.length) caps.push({ text: W_.coverCap });
  // the rest: compare coefficients, highest power, then the constant, then the others
  const left = terms.filter((t) => !known.has(t.letter));
  if (left.length) {
    const deg = pdeg(den) - 1;
    const order = [deg, 0, ...Array.from({ length: deg }, (_, i) => deg - 1 - i).filter((x) => x > 0)];
    const eqs: Eq[] = [];
    for (const pw of order) {
      if (solveLinear(eqs, left.map((t) => t.letter))) break;
      const c = new Map<string, Frac>();
      let rhs = at(R, pw);
      for (const t of terms) {
        const co = at(t.basis, pw);
        if (co.isZero()) continue;
        if (known.has(t.letter)) rhs = chk(rhs.sub(chk(co.mul(known.get(t.letter)!))));
        else c.set(t.letter, co);
      }
      if (!c.size) continue;
      const trial = [...eqs, { c, rhs }];
      // keep only equations that add information
      const rank = (es: Eq[]) => rankOf(es, left.map((t) => t.letter));
      if (rank(trial) === eqs.length) continue;
      eqs.push({ c, rhs });
      const lhsT = terms
        .filter((t) => !at(t.basis, pw).isZero())
        .map((t, i) => {
          const co = at(t.basis, pw);
          const body = known.has(t.letter) ? `${co.isOne() ? "" : `${co.abs().tex()}\\cdot`}${br(known.get(t.letter)!.tex())}` : `${co.abs().isOne() ? "" : co.abs().tex()}${t.letter}`;
          return i === 0 ? `${co.isNeg() ? "-" : ""}${body}` : `${co.isNeg() ? "-" : "+"} ${body}`;
        })
        .join(" ");
      const xT = pw === 1 ? "x" : `x^{${pw}}`;
      rows.push({ tex: `${xT}:\\quad ${at(R, pw).tex()} = ${lhsT}`, op: fill(W_.compare, { t: plainTex(xT) }) });
    }
    const sol = solveLinear(eqs, left.map((t) => t.letter));
    if (!sol) throw new Error(W_.hardDen);
    for (const [u, v] of sol) known.set(u, v);
    rows.push({ tex: left.map((t) => `${t.letter} = ${sol.get(t.letter)!.tex()}`).join(",\\quad "), op: W_.solve, color: C.blue });
    caps.push({ text: W_.compareCap });
  }
  // the answer
  const pieces: { neg: boolean; body: string }[] = [];
  for (const t of terms) {
    const v = known.get(t.letter)!;
    if (t.quad === "1") continue;
    if (t.quad === "x") {
      const nb: P = ptrim([known.get(terms[terms.indexOf(t) + 1].letter)!, v]);
      if (pdeg(nb) < 0) continue;
      const neg = lead(nb).isNeg();
      const Ld = lcmDen(nb);
      const top = pscale(nb, F(neg ? -Ld : Ld));
      pieces.push({ neg, body: `\\frac{${polyTex(top)}}{${Ld === 1 ? t.den : `${Ld}${br(t.den)}`}}` });
      continue;
    }
    if (v.isZero()) continue;
    const a = v.abs();
    const d = a.d === 1 ? t.den : `${a.d}${t.den === "x" || t.den.startsWith("x^") || t.den.startsWith("\\left(") ? t.den : br(t.den)}`;
    pieces.push({ neg: v.isNeg(), body: `\\frac{${a.n}}{${d}}` });
  }
  const qT = pdeg(quot) >= 0 ? polyTex(quot) : "";
  const answer = (qT ? qT + " " : "") + pieces.map((p, i) => (i === 0 && !qT ? `${p.neg ? "-" : ""}${p.body}` : `${p.neg ? "-" : "+"} ${p.body}`)).join(" ");
  rows.push({ tex: `${head} = ${answer}`, op: W_.result, color: C.green });
  const pf = (x: number) =>
    pnum(quot, x) +
    terms.reduce((s, t) => {
      const v = known.get(t.letter)!.toNumber();
      if (t.quad) return s + (v * (t.quad === "x" ? x : 1)) / pnum(fq.rest!, x);
      return s + v / pnum(facP(t.root!), x) ** t.j!;
    }, 0);
  data.pf = pf;
  // a check at a whole number that is not a root
  const x0 = [2, 3, 4, 5, 1, 6, -2, 7].map((v) => F(v)).find((v) => !pval(den, v).isZero())!;
  const lhs = chk(pval(top, x0).div(pval(den, x0)));
  const rhsParts = terms
    .filter((t) => t.quad !== "1")
    .map((t) => {
      if (t.quad === "x") return chk(chk(chk(known.get(t.letter)!.mul(x0)).add(known.get(terms[terms.indexOf(t) + 1].letter)!)).div(pval(fq.rest!, x0)));
      return chk(known.get(t.letter)!.div(powFrac(pval(facP(t.root!), x0), t.j!)));
    })
    .filter((v) => !v.isZero());
  const qv = pval(quot, x0);
  const allR = [...(qT ? [qv] : []), ...rhsParts];
  const rhsT = allR.map((v, i) => (i === 0 ? v.tex() : `${v.isNeg() ? "-" : "+"} ${v.abs().tex()}`)).join(" ");
  const total = allR.reduce((s, v) => chk(s.add(v)), ZERO);
  rows.push({ tex: `x = ${x0.tex()}:\\quad \\text{${words.lhs}} = ${lhs.tex()},\\quad \\text{${words.rhs}} = ${rhsT}${allR.length > 1 ? ` = ${total.tex()}` : ""}\\ ${total.sub(lhs).isZero() ? "\\checkmark" : "\\times"}`, op: fill(W_.check, { a: plainTex(x0.tex()) }) });
  return finish(head, rows, [], caps);
}
function rankOf(eqs: Eq[], us: readonly string[]): number {
  const M = eqs.map((e) => us.map((u) => e.c.get(u) ?? ZERO));
  let rank = 0;
  for (let c = 0; c < us.length && rank < M.length; c++) {
    const p = M.findIndex((r, i) => i >= rank && !r[c].isZero());
    if (p < 0) continue;
    [M[rank], M[p]] = [M[p], M[rank]];
    for (let i = 0; i < M.length; i++)
      if (i !== rank && !M[i][c].isZero()) {
        const f = chk(M[i][c].div(M[rank][c]));
        M[i] = M[i].map((x, j) => chk(x.sub(chk(f.mul(M[rank][j])))));
      }
    rank++;
  }
  return rank;
}

// ---------- the tool ----------

export function renderPolynomials(spec: PolySpec, w: PolyWords): RenderedSvg {
  return buildPolynomials(spec, w).svg;
}
export function buildPolynomials(spec: PolySpec, w: PolyWords): { svg: RenderedSvg; data: PolyData } {
  words = w;
  data = {};
  exprMessages({ bad: w.bad, onlyX: w.onlyX, tooBig: w.tooBig });
  const src = spec.src.trim();
  if (!src) throw new Error(w.need[spec.topic]);
  let svg: RenderedSvg;
  switch (spec.topic) {
    case "divide":
      svg = renderDivide(src);
      break;
    case "theorem":
      svg = renderTheorem(src);
      break;
    case "solve":
      svg = renderSolve(src);
      break;
    case "binomial":
      svg = renderBinomial(src);
      break;
    case "simultaneous":
      svg = renderSimultaneous(src);
      break;
    case "partial":
      svg = renderPartial(src);
      break;
  }
  return { svg, data };
}

const S = (topic: PolyTopic, src: string): PolySpec => ({ topic, src });
export const POLY_PRESETS: { [K in PolyTopic]: { label: string; spec: PolySpec }[] } = {
  divide: [
    { label: "(2x³ − 3x² + 4x − 5) ÷ (x − 2)", spec: S("divide", "(2x^3 - 3x^2 + 4x - 5) / (x - 2)") },
    { label: "(x³ − 7x − 6) ÷ (x + 1)", spec: S("divide", "(x^3 - 7x - 6) / (x + 1)") },
    { label: "(4x³ − 6x² + 2x + 3) ÷ (2x − 1)", spec: S("divide", "(4x^3 - 6x^2 + 2x + 3) / (2x - 1)") },
    { label: "(x⁴ − 1) ÷ (x² + 1)", spec: S("divide", "(x^4 - 1) / (x^2 + 1)") },
    { label: "(2x⁴ + x³ − 5x² + 3) ÷ (x² + x − 1)", spec: S("divide", "(2x^4 + x^3 - 5x^2 + 3) / (x^2 + x - 1)") },
  ],
  theorem: [
    { label: "find a, b", spec: S("theorem", "f(x) = 2x^3 + ax^2 + bx - 6; (x - 2) is a factor; remainder -12 when divided by (x + 1)") },
    { label: "find k", spec: S("theorem", "f(x) = x^3 + kx^2 - 4x - 3; (x + 3) is a factor") },
    { label: "f(1) = 0, f(−1) = 8", spec: S("theorem", "f(x) = x^3 + ax^2 + bx + 6; f(1) = 0; f(-1) = 8") },
    { label: "three unknowns", spec: S("theorem", "f(x) = x^3 + ax^2 + bx + c; f(1) = 0; f(2) = 0; f(0) = 6") },
    { label: "remainder on ÷ (2x − 1)", spec: S("theorem", "f(x) = 2x^3 - 5x^2 + 4x - 3; (2x - 1)") },
    { label: "search for factors", spec: S("theorem", "f(x) = x^3 - 4x^2 + x + 6") },
  ],
  solve: [
    { label: "x³ − 6x² + 11x − 6 = 0", spec: S("solve", "x^3 - 6x^2 + 11x - 6 = 0") },
    { label: "2x³ + 3x² − 8x + 3 = 0", spec: S("solve", "2x^3 + 3x^2 - 8x + 3 = 0") },
    { label: "x³ − 4x² + 2x + 1 = 0", spec: S("solve", "x^3 - 4x^2 + 2x + 1 = 0") },
    { label: "x³ + 3x² − 4 = 0", spec: S("solve", "x^3 + 3x^2 - 4 = 0") },
    { label: "x⁴ − 5x² + 4 = 0", spec: S("solve", "x^4 - 5x^2 + 4 = 0") },
    { label: "x³ = 4x", spec: S("solve", "x^3 = 4x") },
    { label: "x³ − 3x² − x + 3 > 0", spec: S("solve", "x^3 - 3x^2 - x + 3 > 0") },
    { label: "x³ + x² − 5x + 3 ≤ 0", spec: S("solve", "x^3 + x^2 - 5x + 3 <= 0") },
  ],
  binomial: [
    { label: "(2x − 3)⁵", spec: S("binomial", "(2x - 3)^5") },
    { label: "x³ in (2x − 3)⁸", spec: S("binomial", "(2x - 3)^8, x^3") },
    { label: "constant in (x + 2/x)⁶", spec: S("binomial", "(x + 2/x)^6, x^0") },
    { label: "(1 + x/2)¹⁰, 4 terms", spec: S("binomial", "(1 + x/2)^10, 4 terms") },
    { label: "1.02⁸ ≈ ?", spec: S("binomial", "(1 + 2x)^8, 3 terms, x = 0.01") },
    { label: "(1 + 2x)⁻¹", spec: S("binomial", "(1 + 2x)^(-1)") },
    { label: "√(4 + x)", spec: S("binomial", "sqrt(4 + x)") },
    { label: "1/(1 − 3x)²", spec: S("binomial", "1/(1 - 3x)^2") },
  ],
  simultaneous: [
    { label: "y = x² − 3x + 2, y = 2x − 4", spec: S("simultaneous", "y = x^2 - 3x + 2; y = 2x - 4") },
    { label: "x² + y² = 25, x + y = 7", spec: S("simultaneous", "x^2 + y^2 = 25; x + y = 7") },
    { label: "xy = 6, x + y = 5", spec: S("simultaneous", "xy = 6; x + y = 5") },
    { label: "tangent: y = x² + 1, y = 2x", spec: S("simultaneous", "y = x^2 + 1; y = 2x") },
    { label: "no meeting: x² + y² = 4, y = x + 5", spec: S("simultaneous", "x^2 + y^2 = 4; y = x + 5") },
    { label: "x² + 2y² = 9, x − y = 0", spec: S("simultaneous", "x^2 + 2y^2 = 9; x - y = 0") },
    { label: "y = x³, y = 4x", spec: S("simultaneous", "y = x^3; y = 4x") },
  ],
  partial: [
    { label: "(3x + 5)/((x + 1)(x + 2))", spec: S("partial", "(3x + 5)/((x + 1)(x + 2))") },
    { label: "(5x + 4)/(2x² + 5x + 2)", spec: S("partial", "(5x + 4)/(2x^2 + 5x + 2)") },
    { label: "(x² + 1)/(x(x − 1)²)", spec: S("partial", "(x^2 + 1)/(x(x - 1)^2)") },
    { label: "(2x + 3)/((x − 1)(x² + 1))", spec: S("partial", "(2x + 3)/((x - 1)(x^2 + 1))") },
    { label: "(x³ + 2)/(x² − 1)", spec: S("partial", "(x^3 + 2)/(x^2 - 1)") },
  ],
};
