// Numerical methods with every value on show: locating roots by a change of sign (with a decimal search and the
// bounds check that proves a root to k decimal places, and the ways a sign check can mislead — breaks in the graph,
// repeated roots, an even number of roots), bisection and false position, Newton–Raphson and the secant method (with
// the tangents drawn, and the ways it fails: a flat tangent, cycles, running away), fixed-point iteration x = g(x)
// with its staircase or cobweb and the |g′(α)| < 1 test, the trapezium, mid-ordinate and Simpson's rules (strips
// drawn, compared with the exact integral, over/underestimates from f″, the order of the error as n grows), and
// forward, backward and central differences for f′(x).
import { antiderivative } from "./applied";
import { axes, C, compose, curve, dot, fill, FONT, lbl, makeFrame, nt, r2, sampleY, simpson, sub as low, texLines, W, yRange, type Caption, type Frame, type TexLine } from "./chart";
import { derive } from "./derive";
import { evalE, exprMessages, has, key, parseE, simp, sub, substitute, tex, V, X, type E } from "./expr";
import { latexToSvg, type RenderedSvg } from "./latex";

export type NumTopic = "sign" | "bisect" | "newton" | "iterate" | "integrate" | "diff";
export const NUM_TOPICS: NumTopic[] = ["sign", "bisect", "newton", "iterate", "integrate", "diff"];
export type NumSpec = { topic: NumTopic; src: string };

export type NumWords = {
  bad: string;
  onlyX: string;
  tooBig: string;
  need: Record<NumTopic, string>;
  noFunction: string;
  needInterval: string;
  badInterval: string;
  needStart: string;
  needSecond: string;
  undefinedAt: string;
  unknown: string;
  tooMany: string;
  sign: {
    valuesOp: string;
    change: string;
    zeroEnd: string;
    noChange: string;
    hidden: string;
    touch: string;
    none: string;
    jump: string;
    scan: string;
    scanJump: string;
    scanNone: string;
    scanOp: string;
    stepOp: string;
    boundsOp: string;
    rounded: string;
    nearEdge: string;
    exactRoot: string;
    graphCap: string;
  };
  bisect: {
    midOp: string;
    chordOp: string;
    boundOp: string;
    keep: string;
    keepFalse: string;
    sameSign: string;
    after: string;
    afterFalse: string;
    agree: string;
    exact: string;
    stuck: string;
    slow: string;
    ladderCap: string;
  };
  newton: {
    derivOp: string;
    formulaOp: string;
    secantOp: string;
    firstOp: string;
    converged: string;
    settled: string;
    steps: string;
    flat: string;
    flatSecant: string;
    diverge: string;
    cycle: string;
    outside: string;
    slow: string;
    quadratic: string;
    secantOrder: string;
    graphCap: string;
    secantCap: string;
  };
  iterate: {
    formulaOp: string;
    firstOp: string;
    derivOp: string;
    testOp: string;
    needForm: string;
    converge: string;
    diverge: string;
    staircase: string;
    cobweb: string;
    runaway: string;
    noFixed: string;
    converged: string;
    settled: string;
    steps: string;
    cycle: string;
    outside: string;
    slow: string;
    check: string;
    notRoot: string;
    graphCap: string;
  };
  integrate: {
    widthOp: string;
    trapOp: string;
    midOp: string;
    simpOp: string;
    exactOp: string;
    accurateOp: string;
    errorOp: string;
    over: string;
    under: string;
    mixed: string;
    straight: string;
    needEven: string;
    uneven: string;
    lengths: string;
    needTwo: string;
    noMid: string;
    order: string;
    simpExact: string;
    better: string;
    many: string;
    capTrap: string;
    capMid: string;
    capSimp: string;
    dataCap: string;
  };
  diff: {
    needAt: string;
    forwardOp: string;
    backwardOp: string;
    centralOp: string;
    exactOp: string;
    errorOp: string;
    central: string;
    order: string;
    roundoff: string;
    drawn: string;
    graphCap: string;
  };
};

/** What was worked out, for the tests. */
export type NumData = {
  verdict?: "root" | "none" | "even" | "touch" | "jump" | "exact";
  intervals?: [number, number][];
  roots?: number[];
  values?: number[];
  root?: number;
  rounded?: number;
  status?: Status;
  kind?: "staircase" | "cobweb";
  gd?: number;
  estimates?: Record<string, number>;
  exact?: number;
  bend?: number;
};
type Status = "converged" | "steps" | "flat" | "diverge" | "cycle" | "outside" | "slow" | "exact";

let words: NumWords;
let data: NumData = {};

// ---------- numbers ----------

type Fn1 = (x: number) => number;
const fnOf = (e: E): Fn1 => (x) => evalE(e, x);
const rnd = (v: number, k: number) => Number(v.toFixed(k));
/** Fixed decimals for TeX (no "−0.000"). */
const fx = (v: number, d: number) => (Math.abs(v) < 0.5 * 10 ** -d ? 0 : v).toFixed(d);
/** About five significant figures for TeX; tiny and huge values as a × 10ⁿ. */
function sci(v: number, p = 5): string {
  if (!Number.isFinite(v)) return "\\varnothing";
  if (v === 0) return "0";
  const a = Math.abs(v);
  if (a < 1e-4 || a >= 1e7) {
    const [m, e] = v.toExponential(2).split("e");
    return `${m} \\times 10^{${Number(e)}}`;
  }
  return String(Number(v.toPrecision(p)));
}
/** Fixed decimals, or a × 10ⁿ once the value is large. */
const fxs = (v: number, d: number) => (Math.abs(v) >= 1e5 ? sci(v) : fx(v, d));
/** Up to d decimals, no trailing zeros, for TeX. */
const tr = (v: number, d = 6) => sci(Number(v.toFixed(d)), 12);
const sgnCol = (v: number) => (v > 0 ? C.blue : v < 0 ? C.red : C.green);
const col = (s: string, c: string) => `{\\color{${c}}${s}}`;
const rel = (v: number) => (v > 0 ? "> 0" : v < 0 ? "< 0" : "= 0");
/** A bracketed value for substituting into a formula. */
const par = (t: string) => (t.startsWith("-") ? `(${t})` : t);

/** A typed value: its number and how it looks. */
type Val = { v: number; t: string };
/** TeX of a typed value as plain text for the captions. */
function plainT(x: Val): string {
  if (/^-?\d+(\.\d+)?$/.test(x.t)) return x.t.replace("-", "−");
  const s = x.t
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "$1/$2")
    .replace(/\\pi/g, "π")
    .replace(/\\sqrt\{([^{}]+)\}/g, "√$1")
    .replace(/\\left|\\right|\\cdot|[{}\\ ]/g, "")
    .replace(/-/g, "−");
  return /^[−\d./π√]+$/.test(s) ? s : nt(x.v, 4);
}

// ---------- reading ----------

type Method = "trapezium" | "midpoint" | "simpson" | "false" | "secant";
type Opts = {
  f?: E;
  eq?: string;
  g?: E;
  a?: Val;
  b?: Val;
  x0?: Val;
  x1?: Val;
  ns?: number[];
  dp?: number;
  hs?: Val[];
  at?: Val;
  methods: Method[];
  all?: boolean;
  xs?: number[];
  ys?: number[];
};

function val(s: string): Val {
  const t = s.trim();
  if (!t) throw new Error(fill(words.unknown, { s }));
  // 1e-8 is a number here, not 1·e − 8
  const sciNum = /^-?(\d+\.?\d*|\.\d+)e[+-]?\d+$/i.test(t) ? Number(t) : NaN;
  if (Number.isFinite(sciNum)) {
    const [m, p] = t.toLowerCase().split("e");
    return { v: sciNum, t: `${m} \\cdot 10^{${Number(p)}}` };
  }
  const e = parseE(t);
  if (has(e)) throw new Error(fill(words.unknown, { s: t }));
  const v = evalE(e, NaN);
  if (!Number.isFinite(v)) throw new Error(fill(words.unknown, { s: t }));
  return { v, t: /^-?(\d+\.?\d*|\.\d+)$/.test(t) ? t : tex(e) };
}
const items = (s: string) => s.split(",").map((t) => t.trim()).filter(Boolean);

const METHODS: [RegExp, Method | "all" | null][] = [
  [/^(the )?trapez(ium|oid|oidal)( rule)?$/, "trapezium"],
  [/^(simpson'?s?|simpsons)( rule)?$/, "simpson"],
  [/^mid-?(point|ordinate)( rule)?$/, "midpoint"],
  [/^(false position|regula falsi)( method)?$/, "false"],
  [/^secant( method)?$/, "secant"],
  [/^all( rules| three| methods)?$/, "all"],
  [/^(bisection|newton|newton-raphson|newton–raphson|iteration|forward|backward|central)( method)?$/, null],
];

/** x_(n+1) = g(x_n) as x = g(x). */
const iterForm = (s: string) =>
  s
    .replace(/ₙ₊₁/g, "_(n+1)")
    .replace(/ₙ/g, "_n")
    .replace(/(?<![a-z])x_?[({[]?\s*n\s*\+\s*1\s*[)}\]]?/gi, "x")
    .replace(/(?<![a-z])x_?[({[]?n[)}\]]?(?![a-z(])/gi, "x");

function readOpts(src: string, topic: NumTopic): Opts {
  const o: Opts = { methods: [] };
  const clean = src.replace(/[−–]/g, "-").replace(/₀/g, "0").replace(/₁/g, "1");
  for (const raw of clean.split(";")) {
    const s = raw.trim();
    if (!s) continue;
    const lo = s.toLowerCase().replace(/\s+/g, " ");
    let m: RegExpMatchArray | null;
    if ((m = s.match(/^(?:on|in|over)?\s*[[(]\s*([^,]+),([^,]+)[\])]$/i))) {
      [o.a, o.b] = [val(m[1]), val(m[2])];
      continue;
    }
    if ((m = s.match(/^(?:from|between)\s+(.+?)\s+(?:to|and)\s+(.+)$/i))) {
      [o.a, o.b] = [val(m[1]), val(m[2])];
      continue;
    }
    if ((m = s.match(/^x_?[({]?([01])[)}]?\s*=\s*(.+)$/i))) {
      if (m[1] === "0") o.x0 = val(m[2]);
      else o.x1 = val(m[2]);
      continue;
    }
    if ((m = lo.match(/^(?:to |correct to )?(\d+) ?(?:dp|d\.p\.?|decimal places?)$/)) || (m = lo.match(/^dp ?=? ?(\d+)$/))) {
      o.dp = Math.min(Number(m[1]), 10);
      continue;
    }
    if ((m = lo.match(/^(\d+) ?(strips?|steps?|iterations?|intervals?|ordinates?)$/))) {
      o.ns = [Math.max(1, Number(m[1]) - (m[2].startsWith("ordinate") ? 1 : 0))];
      continue;
    }
    if ((m = s.match(/^n\s*=\s*(.+)$/i))) {
      o.ns = items(m[1]).map((t) => {
        const v = Number(t);
        if (!Number.isInteger(v) || v < 1) throw new Error(fill(words.unknown, { s }));
        return v;
      });
      continue;
    }
    if ((m = s.match(/^h\s*=\s*(.+)$/i))) {
      o.hs = items(m[1]).map(val);
      if (o.hs.some((h) => !(h.v > 0))) throw new Error(fill(words.unknown, { s }));
      continue;
    }
    if ((m = s.match(/^([xy])\s*:\s*(.+)$/i))) {
      const vs = items(m[2]).map((t) => val(t).v);
      if (m[1].toLowerCase() === "x") o.xs = vs;
      else o.ys = vs;
      continue;
    }
    const meth = METHODS.find(([re]) => re.test(lo));
    if (meth) {
      if (meth[1] === "all") o.all = true;
      else if (meth[1]) o.methods.push(meth[1]);
      continue;
    }
    if ((m = s.match(/^at\s+(?:x\s*=\s*)?(.+)$/i))) {
      o.at = val(m[1]);
      continue;
    }
    readFn(topic === "iterate" ? iterForm(s) : s, o, topic);
  }
  return o;
}

function readFn(s0: string, o: Opts, topic: NumTopic): void {
  let s = s0;
  const gPrefix = /^g\s*\(\s*x\s*\)\s*=/i.test(s);
  s = s.replace(/^(?:[fgy]\s*\(\s*x\s*\)|y)\s*=\s*/i, "");
  if (gPrefix) {
    o.g = parseE(s);
    return;
  }
  const eqAt = s.indexOf("=");
  if (eqAt < 0) {
    if (o.f) throw new Error(fill(words.unknown, { s: s0 }));
    o.f = parseE(s);
    return;
  }
  const [l, r] = [s.slice(0, eqAt).trim(), s.slice(eqAt + 1).trim()];
  const le = parseE(l);
  const re = parseE(r);
  if (key(le) === key(X)) {
    if (!has(re)) {
      // x = 1: the point (derivative) or a start (iterations)
      const v = val(r);
      if (topic === "diff") o.at = v;
      else o.x0 = v;
      return;
    }
    if (topic === "iterate") {
      o.g = re;
      return;
    }
  }
  if (o.f) throw new Error(fill(words.unknown, { s: s0 }));
  o.eq = `${tex(le)} = ${tex(re)}`;
  o.f = isZero(re) ? le : simp(sub(le, re));
}
const isZero = (e: E) => e.k === "num" && e.v.isZero();

function needF(o: Opts): E {
  if (!o.f) throw new Error(words.noFunction);
  return o.f;
}
function needAB(o: Opts): [Val, Val] {
  if (!o.a || !o.b) throw new Error(words.needInterval);
  if (!(o.a.v < o.b.v)) throw new Error(fill(words.badInterval, { a: plainT(o.a), b: plainT(o.b) }));
  return [o.a, o.b];
}
/** f(x), or a friendly error where f isn't defined. */
function at(F: Fn1, x: number): number {
  const y = F(x);
  if (!Number.isFinite(y)) throw new Error(fill(words.undefinedAt, { x: nt(x, 6) }));
  return y;
}
const fHead = (o: Opts, f: E) => (o.eq ? `${o.eq} \\;\\Rightarrow\\; f(x) = ${tex(f)}` : `f(x) = ${tex(f)}`);

// ---------- roots of a sampled function ----------

/** Halve [lo, hi] (a sign change) until it can't be halved any more. */
function bis(F: Fn1, lo: number, hi: number): number {
  let flo = F(lo);
  for (let i = 0; i < 200 && hi - lo > 1e-15 * (1 + Math.abs(lo)); i++) {
    const m = (lo + hi) / 2;
    const fm = F(m);
    if (fm === 0) return m;
    if (Math.sign(fm) === Math.sign(flo)) (lo = m), (flo = fm);
    else hi = m;
  }
  return (lo + hi) / 2;
}
/** Crossings, touching points and breaks (poles, jumps, gaps in the domain) of f on [a, b]. */
function scanRoots(F: Fn1, a: number, b: number, N = 2000): { roots: number[]; touches: number[]; breaks: number[] } {
  const xs = Array.from({ length: N + 1 }, (_, i) => a + ((b - a) * i) / N);
  const ys = xs.map(F);
  const abs = ys.filter(Number.isFinite).map(Math.abs).sort((p, q) => p - q);
  const scale = 1 + (abs[Math.floor(abs.length / 2)] ?? 0);
  const roots: number[] = [];
  const touches: number[] = [];
  const breaks: number[] = [];
  const near = (list: number[], x: number) => list.some((r) => Math.abs(r - x) < ((b - a) / N) * 1.5);
  for (let i = 0; i < N; i++) {
    const [y0, y1] = [ys[i], ys[i + 1]];
    if (!Number.isFinite(y0) || !Number.isFinite(y1)) {
      if (Number.isFinite(y0) !== Number.isFinite(y1) || (i === 0 && !Number.isFinite(y0))) if (!near(breaks, xs[i])) breaks.push(Number.isFinite(y0) ? xs[i + 1] : xs[i]);
      continue;
    }
    if (y0 === 0) {
      // a zero between two values of the same sign only touches the axis
      const [p, q] = [ys[i - 1], ys[i + 1]];
      const touching = i > 0 && Number.isFinite(p) && Number.isFinite(q) && p * q > 0;
      if (touching) touches.push(xs[i]);
      else if (!near(roots, xs[i])) roots.push(xs[i]);
      continue;
    }
    if (y0 * y1 < 0) {
      const c = bis(F, xs[i], xs[i + 1]);
      const v = Math.abs(F(c));
      if (v < 1e-6 * scale) roots.push(c);
      else breaks.push(c);
    }
  }
  if (ys[N] === 0 && !near(roots, b)) roots.push(b);
  for (let i = 1; i < N; i++) {
    const [p, q, r] = [ys[i - 1], ys[i], ys[i + 1]];
    if (![p, q, r].every(Number.isFinite) || q === 0 || p * q <= 0 || q * r <= 0) continue;
    if (Math.abs(q) > Math.abs(p) || Math.abs(q) > Math.abs(r)) continue;
    // golden-section search for the smallest |f|
    let [l, h] = [xs[i - 1], xs[i + 1]];
    const g = (Math.sqrt(5) - 1) / 2;
    for (let k = 0; k < 80; k++) {
      const m1 = h - g * (h - l);
      const m2 = l + g * (h - l);
      if (Math.abs(F(m1)) < Math.abs(F(m2))) h = m2;
      else l = m1;
    }
    const m = (l + h) / 2;
    if (Math.abs(F(m)) < 1e-7 * scale && !near(touches, m) && !near(roots, m)) touches.push(m);
  }
  return { roots, touches, breaks };
}

/** The last four values grow in size, ending far from the start. */
function runsAway(xs: number[]): boolean {
  const t = xs.slice(-5).map(Math.abs);
  return t.length === 5 && t.every((v, i) => i === 0 || v > t[i - 1] * 1.2) && t[4] > 20 * (1 + Math.abs(xs[0]));
}

// ---------- pictures ----------

type Pic = { svg: string; h: number };
type Block = TexLine[] | Pic;
let frameNo = 0;

function finish(header: string, blocks: Block[], caps: Caption[]): RenderedSvg {
  let y = 4;
  let body = "";
  for (const b of blocks) {
    if (Array.isArray(b)) {
      if (!b.length) continue;
      const ln = texLines(b, y);
      body += ln.svg;
      y += ln.h + 6;
    } else {
      body += `<g transform="translate(0 ${r2(y)})">${b.svg}</g>`;
      y += b.h + 10;
    }
  }
  const out = compose(header, body, y, caps);
  if (/NaN|undefined|Infinity/.test(out.svg)) throw new Error(words.tooBig);
  return out;
}
/** A table or formula in TeX, centred and shrunk to fit. */
function texPic(t: string): Pic {
  const r = latexToSvg(t);
  const k = Math.min(1, (W - 40) / r.width);
  const [w, h] = [r.width * k, r.height * k];
  const svg = r.svg
    .replace(/width="[\d.]+"/, `width="${r2(w)}"`)
    .replace(/height="[\d.]+"/, `height="${r2(h)}"`)
    .replace(/^<svg/, `<svg x="${r2((W - w) / 2)}" y="4"`);
  return { svg, h: h + 8 };
}
/** A table with a header row, a rule under it and coloured cells. */
function arrayTex(head: string[], rows: string[][]): string {
  return `\\begin{array}{c|${"c".repeat(head.length - 1)}} ${head.join(" & ")} \\\\ \\hline ${rows.map((r) => r.join(" & ")).join(" \\\\ ")} \\end{array}`;
}
/** Two rows of values side by side (x and f(x)), in blocks of `per`. */
function strips(top: string, bottom: string, a: string[], b: string[], per = 7): Pic[] {
  const out: Pic[] = [];
  for (let i = 0; i < a.length; i += per)
    out.push(texPic(`\\begin{array}{c|${"c".repeat(Math.min(per, a.length - i))}} ${top} & ${a.slice(i, i + per).join(" & ")} \\\\ \\hline ${bottom} & ${b.slice(i, i + per).join(" & ")} \\end{array}`));
  return out;
}

type Plot = { fr: Frame; svg: string; H: number };
function plotFrame(xr: [number, number], yr: [number, number], H = 270, fw = W - 66, left = 48): Plot {
  const fr = makeFrame(`nm${++frameNo}`, left, 8, fw, H, xr, yr);
  return { fr, svg: axes(fr), H };
}
const clip = (fr: Frame, s: string) => `<g clip-path="url(#${fr.id})">${s}</g>`;
const seg = (fr: Frame, x1: number, y1: number, x2: number, y2: number, color: string, width = 1.6, extra = "") =>
  `<line x1="${r2(fr.sx(x1))}" y1="${r2(fr.sy(y1))}" x2="${r2(fr.sx(x2))}" y2="${r2(fr.sy(y2))}" stroke="${color}" stroke-width="${width}" ${extra}/>`;
const axisY = (fr: Frame) => Math.min(Math.max(fr.sy(0), fr.top), fr.bottom);
const inX = (fr: Frame, x: number) => x >= fr.x0 && x <= fr.x1;
const inside = (fr: Frame, x: number, y: number) => inX(fr, x) && y >= fr.y0 && y <= fr.y1;
const DASH = `stroke-dasharray="5 4"`;
/** Labels x₀, x₁, … under the axis, skipping any that would overlap. */
function axisLabels(fr: Frame, pts: { x: number; text: string; color: string }[]): string {
  let s = "";
  const used: number[] = [];
  const y = axisY(fr);
  for (const p of pts) {
    if (!inX(fr, p.x)) continue;
    const px = fr.sx(p.x);
    if (used.some((u) => Math.abs(u - px) < 24)) continue;
    used.push(px);
    s += dot(px, y, p.color, 3.2) + lbl(px, y + (y > fr.bottom - 20 ? -8 : 17), p.text, p.color, "middle", 12.5);
  }
  return s;
}
const done = (p: Plot, extra = ""): Pic => ({ svg: p.svg + extra, h: p.H + 26 });
/** A window around the points that matter. */
function around(xs: number[], minPad = 0.5): [number, number] {
  const fx = xs.filter(Number.isFinite);
  const [lo, hi] = [Math.min(...fx), Math.max(...fx)];
  const pad = Math.max((hi - lo) * 0.2, minPad);
  return [lo - pad, hi + pad];
}

// ---------- change of sign ----------

function renderSign(o: Opts): RenderedSvg {
  const f = needF(o);
  const F = fnOf(f);
  const T = words.sign;
  if (!o.a) return renderScan(o, f, F);
  const [A, B] = needAB(o);
  const [a, b] = [A.v, B.v];
  const [pa, pb] = [plainT(A), plainT(B)];
  const fa = at(F, a);
  const fb = at(F, b);
  const blocks: Block[] = [
    [
      { tex: `f(${A.t}) = ${col(sci(fa), sgnCol(fa))} ${rel(fa)}`, op: T.valuesOp },
      { tex: `f(${B.t}) = ${col(sci(fb), sgnCol(fb))} ${rel(fb)}` },
    ],
  ];
  const caps: Caption[] = [];
  const sc = scanRoots(F, a, b);
  data.roots = sc.roots;
  if (fa === 0 || fb === 0) {
    data.verdict = "exact";
    caps.push({ text: fill(T.zeroEnd, { a: fa === 0 ? pa : pb }), color: C.green });
  } else if (fa * fb < 0) {
    if (sc.breaks.length) {
      data.verdict = "jump";
      caps.push({ text: fill(T.jump, { a: pa, b: pb, x: nt(sc.breaks[0], 3) }), color: C.red });
    } else {
      data.verdict = "root";
      caps.push({ text: fill(T.change, { a: pa, b: pb }), color: C.green });
    }
  } else {
    caps.push({ text: fill(T.noChange, { a: pa, b: pb }) });
    if (sc.roots.length) {
      data.verdict = "even";
      caps.push({ text: fill(T.hidden, { k: sc.roots.length, a: pa, b: pb, list: sc.roots.map((r) => nt(r, 3)).join(", ") }), color: C.red });
    } else if (sc.touches.length) {
      data.verdict = "touch";
      caps.push({ text: fill(T.touch, { x: nt(sc.touches[0], 3) }), color: C.red });
    } else {
      data.verdict = "none";
      caps.push({ text: fill(T.none, { a: pa, b: pb }), color: C.green });
    }
  }
  if (o.dp !== undefined && data.verdict === "root") decimalSearch(F, a, b, o.dp, blocks, caps);
  // the graph
  const span = b - a;
  const xr: [number, number] = [a - span * 0.25, b + span * 0.25];
  const ys = sampleY(F, xr[0], xr[1], 500);
  const p = plotFrame(xr, yRange(ys, [0, fa, fb]));
  const { fr } = p;
  let s = `<rect x="${r2(fr.sx(a))}" y="${fr.top}" width="${r2(fr.sx(b) - fr.sx(a))}" height="${fr.bottom - fr.top}" fill="${C.purple}" opacity="0.07"/>`;
  s += curve(fr, F, C.ink, 2.4);
  for (const x of sc.breaks) s += clip(fr, seg(fr, x, fr.y0, x, fr.y1, C.red, 1.3, DASH));
  for (const [x, y] of [[a, fa], [b, fb]]) {
    s += clip(fr, seg(fr, x, 0, x, y, sgnCol(y), 1.6, DASH));
    if (inside(fr, x, y)) s += dot(fr.sx(x), fr.sy(y), sgnCol(y), 5);
  }
  for (const r of [...sc.roots, ...sc.touches]) s += dot(fr.sx(r), fr.sy(0), C.green, 5);
  s += axisLabels(fr, [{ x: a, text: pa, color: C.purple }, { x: b, text: pb, color: C.purple }]);
  blocks.push(done(p, s));
  caps.push({ text: T.graphCap, color: C.grey });
  return finish(`${fHead(o, f)},\\quad [${A.t}, ${B.t}]`, blocks, caps);
}

/** Narrow [a, b] one decimal place at a time, then check the bounds of the rounded value. */
function decimalSearch(F: Fn1, a: number, b: number, k: number, blocks: Block[], caps: Caption[]): void {
  const T = words.sign;
  let [lo, hi] = [a, b];
  let s = 10 ** Math.floor(Math.log10(hi - lo) + 1e-9);
  if (s >= hi - lo - 1e-12) s /= 10;
  const rows: TexLine[] = [];
  let exact: number | undefined;
  while (s > 10 ** -k / 2 && exact === undefined) {
    const dd = Math.max(0, -Math.round(Math.log10(s)));
    const show = (x: number) => (Math.abs(x - rnd(x, dd)) < 1e-9 ? fx(x, dd) : tr(x, 6));
    const flo = F(lo);
    const pts: [number, number][] = [[lo, flo]];
    for (let i = 1; i <= 12; i++) {
      const x = rnd(lo + i * s, 12);
      const y = F(x);
      pts.push([x, y]);
      if (y === 0) {
        exact = x;
        break;
      }
      if (Math.sign(y) !== Math.sign(flo) || x >= hi) {
        [lo, hi] = [pts[pts.length - 2][0], x];
        break;
      }
    }
    if (exact !== undefined) break;
    const shown = pts.length > 5 ? [pts[0], null, ...pts.slice(-3)] : pts;
    const xsT = shown.map((p) => (p ? show(p[0]) : "\\cdots"));
    const ysT = shown.map((p) => (p ? col(sci(p[1], 3), sgnCol(p[1])) : "\\cdots"));
    rows.push({ tex: `\\begin{array}{c|${"c".repeat(shown.length)}} x & ${xsT.join(" & ")} \\\\ \\hline f(x) & ${ysT.join(" & ")} \\end{array}`, op: fill(T.stepOp, { s: nt(s, 10) }) });
    s /= 10;
  }
  blocks.push(rows);
  if (exact !== undefined) {
    data.root = exact;
    data.rounded = rnd(exact, k);
    caps.push({ text: fill(T.exactRoot, { x: nt(exact, 10) }), color: C.green });
    return;
  }
  const root = bis(F, lo, hi);
  data.root = root;
  boundsCheck(F, root, k, blocks, caps);
}
/** f(r − ½·10⁻ᵏ) and f(r + ½·10⁻ᵏ) have opposite signs: the root rounds to r. */
function boundsCheck(F: Fn1, root: number, k: number, blocks: Block[], caps: Caption[]): void {
  const T = words.sign;
  const r = rnd(root, k);
  const [L, U] = [rnd(r - 0.5 * 10 ** -k, k + 1), rnd(r + 0.5 * 10 ** -k, k + 1)];
  const [fL, fU] = [F(L), F(U)];
  if (!Number.isFinite(fL) || !Number.isFinite(fU)) return;
  blocks.push([{ tex: `f(${fx(L, k + 1)}) = ${col(sci(fL, 3), sgnCol(fL))} ${rel(fL)}, \\qquad f(${fx(U, k + 1)}) = ${col(sci(fU, 3), sgnCol(fU))} ${rel(fU)}`, op: T.boundsOp }]);
  if (fL * fU < 0) {
    data.rounded = r;
    caps.push({ text: fill(T.rounded, { lo: fx(L, k + 1), hi: fx(U, k + 1), r: fx(r, k), k }), color: C.green });
  } else caps.push({ text: fill(T.nearEdge, { x: nt(root, k + 3), k }), color: C.orange });
}

/** No interval: f at the whole numbers from −10 to 10. */
function renderScan(o: Opts, f: E, F: Fn1): RenderedSvg {
  const T = words.sign;
  const changes: { a: number; jump: boolean }[] = [];
  const zeros: number[] = [];
  for (let x = -10; x <= 10; x++) {
    const [y0, y1] = [F(x), F(x + 1)];
    if (!Number.isFinite(y0)) continue;
    if (y0 === 0) zeros.push(x);
    else if (x < 10 && Number.isFinite(y1) && y0 * y1 < 0) {
      const s = scanRoots(F, x, x + 1, 400);
      changes.push({ a: x, jump: !s.roots.length && s.breaks.length > 0 });
    }
  }
  const real = changes.filter((c) => !c.jump);
  data.intervals = real.map((c) => [c.a, c.a + 1]);
  const marks = [...changes.flatMap((c) => [c.a, c.a + 1]), ...zeros];
  let cols: (number | null)[];
  if (!marks.length) cols = [-3, -2, -1, 0, 1, 2, 3];
  else {
    const [lo, hi] = [Math.max(-10, Math.min(...marks) - 1), Math.min(10, Math.max(...marks) + 1)];
    if (hi - lo <= 11) cols = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
    else {
      const set = [...new Set(marks.flatMap((m) => [m - 1, m, m + 1]).filter((v) => v >= -10 && v <= 10))].sort((p, q) => p - q);
      cols = set.flatMap((v, i) => (i && v - set[i - 1] > 1 ? [null, v] : [v]));
    }
  }
  const head = cols.map((c) => (c === null ? "\\cdots" : String(c)));
  const vals = cols.map((c) => {
    if (c === null) return "\\cdots";
    const y = F(c);
    return Number.isFinite(y) ? col(sci(y, 3), sgnCol(y)) : col("\\varnothing", C.grey);
  });
  const blocks: Block[] = [[{ tex: `\\begin{array}{c|${"c".repeat(cols.length)}} x & ${head.join(" & ")} \\\\ \\hline f(x) & ${vals.join(" & ")} \\end{array}`, op: T.scanOp }]];
  const caps: Caption[] = [];
  const iv = (c: { a: number }) => `[${nt(c.a)}, ${nt(c.a + 1)}]`;
  if (zeros.length) caps.push({ text: zeros.map((z) => fill(T.exactRoot, { x: nt(z) })).join(" "), color: C.green });
  if (real.length) caps.push({ text: fill(T.scan, { list: real.map(iv).join(", ") }), color: C.green });
  if (changes.some((c) => c.jump)) caps.push({ text: fill(T.scanJump, { list: changes.filter((c) => c.jump).map(iv).join(", ") }), color: C.red });
  const all = scanRoots(F, -10, 10, 8000);
  if (!changes.length && !zeros.length) {
    caps.push({ text: T.scanNone });
    if (all.touches.length) caps.push({ text: fill(T.touch, { x: nt(all.touches[0], 3) }), color: C.red });
  }
  data.roots = all.roots;
  // the graph
  const xr: [number, number] = marks.length ? [Math.min(...marks) - 1.5, Math.max(...marks) + 1.5] : [-5, 5];
  const p = plotFrame(xr, yRange(sampleY(F, xr[0], xr[1], 500), [0]));
  const { fr } = p;
  let s = "";
  for (const c of changes)
    s += `<rect x="${r2(fr.sx(c.a))}" y="${fr.top}" width="${r2(fr.sx(c.a + 1) - fr.sx(c.a))}" height="${fr.bottom - fr.top}" fill="${c.jump ? C.red : C.green}" opacity="0.08"/>`;
  s += curve(fr, F, C.ink, 2.4);
  for (const x of cols) {
    if (x === null) continue;
    const y = F(x);
    if (Number.isFinite(y) && inside(fr, x, y)) s += dot(fr.sx(x), fr.sy(y), sgnCol(y), 4);
  }
  for (const r of all.roots) if (inX(fr, r)) s += dot(fr.sx(r), fr.sy(0), C.green, 4.5, true);
  blocks.push(done(p, s));
  caps.push({ text: T.graphCap, color: C.grey });
  return finish(fHead(o, f), blocks, caps);
}

// ---------- bisection and false position ----------

function renderBisect(o: Opts): RenderedSvg {
  const f = needF(o);
  const F = fnOf(f);
  const T = words.bisect;
  const fp = o.methods.includes("false");
  const [A, B] = needAB(o);
  let [lo, hi] = [A.v, B.v];
  let [flo, fhi] = [at(F, lo), at(F, hi)];
  if (flo * fhi > 0) throw new Error(fill(T.sameSign, { a: plainT(A), b: plainT(B), fa: nt(flo, 4), fb: nt(fhi, 4) }));
  const k = o.dp;
  const nMax = Math.min(o.ns?.[0] ?? (k === undefined ? 6 : 60), 60);
  const D = k !== undefined ? k + 3 : 6;
  const name = fp ? "c" : "m";
  const head = `${fHead(o, f)},\\quad [${A.t}, ${B.t}]`;
  const rows: TexLine[] = [
    fp
      ? { tex: `c = \\frac{a\\,f(b) - b\\,f(a)}{f(b) - f(a)}`, op: T.chordOp }
      : { tex: `m = \\frac{a + b}{2}`, op: T.midOp },
  ];
  const caps: Caption[] = [{ text: fp ? T.keepFalse : T.keep }];
  if (flo === 0 || fhi === 0) {
    const x = flo === 0 ? lo : hi;
    data.root = x;
    data.status = "exact";
    caps.push({ text: fill(T.exact, { m: nt(x, 6) }), color: C.green });
    return finish(head, [rows], caps);
  }
  const steps: { lo: number; hi: number; m: number; fm: number }[] = [];
  let status: Status = "steps";
  let r: number | undefined;
  for (let i = 0; i < nMax; i++) {
    const m = fp ? (lo * fhi - hi * flo) / (fhi - flo) : (lo + hi) / 2;
    const fm = at(F, m);
    steps.push({ lo, hi, m, fm });
    if (fm === 0) {
      status = "exact";
      break;
    }
    if (Math.sign(fm) === Math.sign(flo)) [lo, flo] = [m, fm];
    else [hi, fhi] = [m, fm];
    if (k !== undefined && !o.ns) {
      if (!fp && rnd(lo, k) === rnd(hi, k)) {
        [status, r] = ["converged", rnd(lo, k)];
        break;
      }
      const prev = steps[steps.length - 2]?.m;
      if (fp && prev !== undefined && Math.abs(m - prev) < 0.5 * 10 ** -(k + 1) && rnd(m, k) === rnd(prev, k)) {
        [status, r] = ["converged", rnd(m, k)];
        break;
      }
      if (i === nMax - 1) status = "slow";
    }
  }
  const show = (v: number) => tr(v, D);
  const table = arrayTex(
    ["n", "a_n", "b_n", `${name}_n`, `f(${name}_n)`],
    steps.map((s, i) => [String(i + 1), show(s.lo), show(s.hi), show(s.m), col(sci(s.fm, 4), sgnCol(s.fm))]),
  );
  const blocks: Block[] = [rows, texPic(table)];
  const last = steps[steps.length - 1];
  data.values = steps.map((s) => s.m);
  data.status = status;
  if (status === "exact") {
    data.root = last.m;
    caps.push({ text: fill(T.exact, { m: nt(last.m, 10) }), color: C.green });
  } else if (!fp) {
    const mid = (lo + hi) / 2;
    data.root = mid;
    blocks.push([{ tex: `|\\alpha - ${show(mid)}| \\le \\frac{${tr(hi - lo, D + 2)}}{2} = ${tr((hi - lo) / 2, D + 2)}`, op: T.boundOp }]);
    if (status === "converged") {
      data.rounded = r;
      caps.push({ text: fill(T.agree, { lo: nt(lo, D), hi: nt(hi, D), r: fx(r!, k!), k: k! }), color: C.green });
    } else caps.push({ text: fill(T.after, { n: steps.length, lo: nt(lo, D), hi: nt(hi, D), e: nt((hi - lo) / 2, D + 2), m: nt(mid, D) }), color: status === "slow" ? C.orange : C.green });
    if (status === "slow") caps.push({ text: fill(T.slow, { n: steps.length, k: k! }), color: C.orange });
  } else {
    data.root = last.m;
    if (status === "converged") boundsCheck(F, last.m, k!, blocks, caps);
    else caps.push({ text: fill(T.afterFalse, { n: steps.length, m: nt(last.m, D), f: nt(last.fm, 6) }), color: status === "slow" ? C.orange : C.green });
    const stuckLo = steps.every((s) => s.lo === steps[0].lo);
    const stuckHi = steps.every((s) => s.hi === steps[0].hi);
    if (steps.length >= 3 && (stuckLo || stuckHi)) caps.push({ text: fill(T.stuck, { x: nt(stuckLo ? steps[0].lo : steps[0].hi, 6) }) });
  }
  // the graph: midpoints (or chords) on the curve
  const [a, b] = [A.v, B.v];
  const span = b - a;
  const xr: [number, number] = [a - span * 0.15, b + span * 0.15];
  const p = plotFrame(xr, yRange(sampleY(F, xr[0], xr[1], 400), [0]), 240);
  const { fr } = p;
  let s = `<rect x="${r2(fr.sx(a))}" y="${fr.top}" width="${r2(fr.sx(b) - fr.sx(a))}" height="${fr.bottom - fr.top}" fill="${C.purple}" opacity="0.06"/>`;
  s += curve(fr, F, C.ink, 2.4);
  if (fp) for (const st of steps.slice(0, 4)) s += clip(fr, seg(fr, st.lo, F(st.lo), st.hi, F(st.hi), C.orange, 1.6));
  for (const st of steps.slice(0, 4)) s += clip(fr, seg(fr, st.m, 0, st.m, st.fm, sgnCol(st.fm), 1.3, DASH)) + (inside(fr, st.m, st.fm) ? dot(fr.sx(st.m), fr.sy(st.fm), sgnCol(st.fm), 3.5) : "");
  s += axisLabels(fr, steps.slice(0, 4).map((st, i) => ({ x: st.m, text: `${name}${low(i + 1)}`, color: C.orange })));
  blocks.push(done(p, s));
  // the shrinking intervals
  if (!fp) {
    const rowsN = Math.min(steps.length, 8);
    const [L, R] = [70, W - 40];
    const px = (x: number) => L + ((x - a) / span) * (R - L);
    let ld = `<g ${FONT} font-size="12" fill="#495057">`;
    for (let i = 0; i < rowsN; i++) {
      const st = steps[i];
      const y = 14 + i * 17;
      const [x1, x2] = [px(st.lo), Math.max(px(st.hi), px(st.lo) + 2)];
      ld += `<text x="${L - 12}" y="${y + 4}" text-anchor="end">${i + 1}</text>`;
      ld += `<line x1="${r2(x1)}" y1="${y}" x2="${r2(x2)}" y2="${y}" stroke="${C.purple}" stroke-width="6" stroke-linecap="butt" opacity="0.75"/>`;
      ld += dot(px(st.m), y, sgnCol(st.fm), 3);
    }
    ld += `</g>`;
    blocks.push({ svg: ld, h: 14 + rowsN * 17 });
    caps.push({ text: T.ladderCap, color: C.grey });
  }
  return finish(head, blocks, caps);
}

// ---------- Newton–Raphson and the secant method ----------

function renderNewton(o: Opts): RenderedSvg {
  const f = needF(o);
  const F = fnOf(f);
  const T = words.newton;
  const secant = o.methods.includes("secant");
  if (!o.x0) throw new Error(words.needStart);
  if (secant && !o.x1) throw new Error(words.needSecond);
  const d = secant ? null : simp(derive(f));
  const Df = d ? fnOf(d) : null;
  const k = o.dp;
  const D = k !== undefined ? Math.min(k + 2, 12) : 6;
  const nMax = Math.min(o.ns?.[0] ?? (secant ? 30 : 20), 40);
  const tol = k !== undefined ? 0.5 * 10 ** -(k + 1) : 5e-7;
  const xs = secant ? [o.x0.v, o.x1!.v] : [o.x0.v];
  const steps: { x: number; f: number; d: number; prev: number; fprev: number; next: number }[] = [];
  let status: Status = o.ns ? "steps" : "slow";
  let bad = NaN;
  for (let i = 0; i < nMax; i++) {
    const x = xs[xs.length - 1];
    const fxv = F(x);
    if (!Number.isFinite(fxv)) {
      [status, bad] = ["outside", x];
      break;
    }
    let next: number;
    let dv = NaN;
    const prev = secant ? xs[xs.length - 2] : NaN;
    const fprev = secant ? F(prev) : NaN;
    if (secant) {
      if (fxv === fprev || !Number.isFinite(fprev)) {
        [status, bad] = ["flat", x];
        break;
      }
      next = x - (fxv * (x - prev)) / (fxv - fprev);
    } else {
      dv = Df!(x);
      if (!Number.isFinite(dv)) {
        [status, bad] = ["outside", x];
        break;
      }
      if (Math.abs(dv) < 1e-12) {
        [status, bad] = ["flat", x];
        break;
      }
      next = x - fxv / dv;
    }
    if (fxv === 0) {
      status = "converged";
      break;
    }
    steps.push({ x, f: fxv, d: dv, prev, fprev, next });
    xs.push(next);
    if (!Number.isFinite(next) || Math.abs(next) > 1e8) {
      status = "diverge";
      break;
    }
    if (o.ns) continue;
    if (Math.abs(next - x) < tol && (k === undefined || rnd(next, k) === rnd(x, k))) {
      status = "converged";
      break;
    }
    if (steps.length >= 2 && Math.abs(next - xs[xs.length - 3]) < 1e-9 * (1 + Math.abs(next)) && Math.abs(next - x) > 1e-6) {
      status = "cycle";
      break;
    }
    if (steps.length >= 8 && Math.abs(next) > 1e3 * (1 + Math.abs(xs[0])) && Math.abs(next) > Math.abs(x)) {
      status = "diverge";
      break;
    }
  }
  if (status === "steps" && runsAway(xs)) status = "diverge";
  const head = `${fHead(o, f)},\\quad x_0 = ${o.x0.t}${secant ? `,\\ x_1 = ${o.x1!.t}` : ""}`;
  const rows: TexLine[] = [];
  const xn = V("x_n");
  if (d) {
    rows.push({ tex: `f'(x) = ${tex(d)}`, op: T.derivOp });
    rows.push({ tex: `x_{n+1} = x_n - \\frac{f(x_n)}{f'(x_n)} = x_n - \\frac{${tex(substitute(f, "x", xn))}}{${tex(substitute(d, "x", xn))}}`, op: T.formulaOp });
    if (steps.length) {
      const s0 = steps[0];
      rows.push({ tex: `x_1 = ${par(o.x0.t)} - \\frac{${sci(s0.f)}}{${sci(s0.d)}} = ${fx(s0.next, D)}`, op: T.firstOp });
    }
  } else {
    rows.push({ tex: `x_{n+1} = x_n - f(x_n)\\,\\frac{x_n - x_{n-1}}{f(x_n) - f(x_{n-1})}`, op: T.secantOp });
    if (steps.length) {
      const s0 = steps[0];
      rows.push({ tex: `x_2 = ${par(o.x1!.t)} - ${par(sci(s0.f))} \\cdot \\frac{${o.x1!.t} - ${par(o.x0.t)}}{${sci(s0.f)} - ${par(sci(s0.fprev))}} = ${fx(s0.next, D)}`, op: T.firstOp });
    }
  }
  const blocks: Block[] = [rows];
  const caps: Caption[] = [];
  const root = xs[xs.length - 1];
  const errCol = status === "converged" && steps.length >= 3;
  const off = secant ? 1 : 0;
  if (steps.length) {
    const headRow = secant
      ? ["n", "x_{n-1}", "x_n", "f(x_n)", "x_{n+1}"]
      : ["n", "x_n", "f(x_n)", "f'(x_n)", "x_{n+1}"];
    if (errCol) headRow.push("|x_n - \\alpha|");
    const last = steps.length - 1;
    const body = steps.map((s, i) => {
      const nx = i === last && status === "converged" ? col(fxs(s.next, D), C.green) : fxs(s.next, D);
      const r = secant
        ? [String(i + off), fxs(s.prev, D), fxs(s.x, D), col(sci(s.f, 4), sgnCol(s.f)), nx]
        : [String(i), fxs(s.x, D), col(sci(s.f, 4), sgnCol(s.f)), sci(s.d, 5), nx];
      if (errCol) r.push(sci(Math.abs(s.x - root), 2));
      return r;
    });
    blocks.push(texPic(arrayTex(headRow, body)));
  }
  data.values = xs;
  data.status = status;
  const nLast = xs.length - 1;
  const xLast = `x${low(nLast)}`;
  switch (status) {
    case "converged":
      data.root = root;
      if (k !== undefined && steps.length) {
        caps.push({ text: fill(T.converged, { a: `x${low(nLast - 1)}`, b: xLast, k, r: fx(root, k) }), color: C.green });
        boundsCheck(F, root, k, blocks, caps);
      } else caps.push({ text: fill(T.settled, { r: nt(root, 6) }), color: C.green });
      if (steps.length >= 3) caps.push({ text: secant ? T.secantOrder : T.quadratic });
      break;
    case "steps":
      data.root = root;
      caps.push({ text: fill(T.steps, { n: steps.length, x: xLast, v: nt(root, D) }), color: C.green });
      break;
    case "flat":
      caps.push({ text: fill(secant ? T.flatSecant : T.flat, { x: nt(bad, 6) }), color: C.red });
      break;
    case "outside":
      caps.push({ text: fill(T.outside, { x: nt(bad, 6) }), color: C.red });
      break;
    case "cycle":
      caps.push({ text: fill(T.cycle, { a: nt(xs[xs.length - 2], 4), b: nt(root, 4) }), color: C.red });
      break;
    case "diverge":
      caps.push({ text: T.diverge, color: C.red });
      break;
    default:
      caps.push({ text: fill(T.slow, { n: steps.length }), color: C.orange });
  }
  // the graph: each tangent (or secant) down to the axis
  const showN = Math.min(steps.length, status === "diverge" ? 3 : 5);
  const focus = [...xs.slice(0, showN + 1 + off)];
  if (status === "flat" || status === "outside") focus.push(bad);
  const fin = focus.filter(Number.isFinite);
  const range = Math.max(...fin) - Math.min(...fin);
  const pad = Math.max(range * 0.25, steps.length <= 1 ? 0.8 : 0.15);
  const xr: [number, number] = [Math.min(...fin) - pad, Math.max(...fin) + pad];
  const fvals = [0, ...focus.map(F)].filter((v) => Number.isFinite(v) && Math.abs(v) < 1e6);
  const [ylo, yhi] = [Math.min(...fvals), Math.max(...fvals)];
  const yspan = yhi - ylo || 1;
  const p = plotFrame(xr, [ylo - yspan * 0.3, yhi + yspan * 0.3]);
  const { fr } = p;
  let s = curve(fr, F, C.ink, 2.4);
  for (const st of steps.slice(0, showN)) {
    s += clip(fr, seg(fr, st.x, 0, st.x, st.f, C.grey, 1.3, DASH));
    const [x1, y1] = secant ? [st.prev, st.fprev] : [st.x, st.f];
    // the line through (x1, y1) and (next, 0), drawn a little past both ends
    const [lx, rx] = [Math.min(x1, st.next, st.x), Math.max(x1, st.next, st.x)];
    const slope = secant ? (st.f - st.fprev) / (st.x - st.prev) : st.d;
    const ext = (rx - lx) * 0.2 + (fr.x1 - fr.x0) * 0.12;
    s += clip(fr, seg(fr, lx - ext, st.f + slope * (lx - ext - st.x), rx + ext, st.f + slope * (rx + ext - st.x), C.orange, 1.8));
    if (inside(fr, st.x, st.f)) s += dot(fr.sx(st.x), fr.sy(st.f), C.orange, 4);
    if (secant && inside(fr, x1, y1)) s += dot(fr.sx(x1), fr.sy(y1), C.orange, 4);
  }
  if (status === "flat" && !secant && Number.isFinite(F(bad))) s += clip(fr, seg(fr, fr.x0, F(bad), fr.x1, F(bad), C.red, 1.8, DASH)) + dot(fr.sx(bad), fr.sy(F(bad)), C.red, 4.5);
  s += axisLabels(fr, xs.slice(0, showN + 1 + off).map((x, i) => ({ x, text: `x${low(i)}`, color: i === showN + off && status === "converged" ? C.green : C.orange })));
  blocks.push(done(p, s));
  caps.push({ text: secant ? T.secantCap : T.graphCap, color: C.grey });
  return finish(head, blocks, caps);
}

// ---------- fixed-point iteration ----------

function renderIterate(o: Opts): RenderedSvg {
  const T = words.iterate;
  if (!o.g) throw new Error(o.f ? T.needForm : words.noFunction);
  if (!o.x0) throw new Error(words.needStart);
  const g = o.g;
  const G = fnOf(g);
  const k = o.dp;
  const D = k !== undefined ? Math.min(k + 2, 12) : 6;
  const nMax = Math.min(o.ns?.[0] ?? 40, 60);
  const tol = k !== undefined ? 0.5 * 10 ** -(k + 1) : 5e-7;
  const xs = [o.x0.v];
  let status: Status = o.ns ? "steps" : "slow";
  for (let i = 0; i < nMax; i++) {
    const x = xs[xs.length - 1];
    const next = G(x);
    if (Number.isNaN(next)) {
      status = "outside";
      break;
    }
    xs.push(next);
    if (!Number.isFinite(next) || Math.abs(next) > 1e8) {
      status = "diverge";
      break;
    }
    if (o.ns) continue;
    if (Math.abs(next - x) < tol && (k === undefined || rnd(next, k) === rnd(x, k))) {
      status = "converged";
      break;
    }
    if (xs.length >= 5 && Math.abs(next - xs[xs.length - 3]) < 1e-9 * (1 + Math.abs(next)) && Math.abs(next - x) > 1e-6) {
      status = "cycle";
      break;
    }
  }
  if (status === "steps" && runsAway(xs)) status = "diverge";
  const head = `${o.f ? `${o.eq ?? `${tex(o.f)} = 0`},\\quad ` : ""}x = ${tex(g)},\\quad x_0 = ${o.x0.t}`;
  const rows: TexLine[] = [{ tex: `x_{n+1} = ${tex(substitute(g, "x", V("x_n")))}`, op: T.formulaOp }];
  if (xs.length > 1 && Number.isFinite(xs[1])) rows.push({ tex: `x_1 = ${tex(substitute(g, "x", V(`\\left(${o.x0.t}\\right)`)))} = ${fx(xs[1], D)}`, op: T.firstOp });
  const blocks: Block[] = [rows];
  const shown = xs.filter(Number.isFinite);
  blocks.push(...strips("n", "x_n", shown.map((_, i) => String(i)), shown.map((x, i) => (i === shown.length - 1 && status === "converged" ? col(fxs(x, D), C.green) : fxs(x, D)))));
  const caps: Caption[] = [];
  data.values = xs;
  data.status = status;
  // the fixed point and the slope of g there
  let alpha: number | undefined = status === "converged" ? xs[xs.length - 1] : undefined;
  if (alpha === undefined) {
    const h = (x: number) => G(x) - x;
    const x0 = o.x0.v;
    const sc = scanRoots(h, x0 - 10, x0 + 10, 4000);
    if (sc.roots.length) alpha = sc.roots.reduce((best, r) => (Math.abs(r - x0) < Math.abs(best - x0) ? r : best));
  }
  const nLast = xs.length - 1;
  if (status === "converged") {
    if (k !== undefined) caps.push({ text: fill(T.converged, { a: `x${low(nLast - 1)}`, b: `x${low(nLast)}`, k, r: fx(alpha!, k) }), color: C.green });
    else caps.push({ text: fill(T.settled, { r: nt(alpha!, 6) }), color: C.green });
  } else if (status === "steps") caps.push({ text: fill(T.steps, { n: nLast, x: `x${low(nLast)}`, v: nt(xs[nLast], D) }), color: C.green });
  else if (status === "diverge") caps.push({ text: T.runaway, color: C.red });
  else if (status === "cycle") caps.push({ text: fill(T.cycle, { a: nt(xs[nLast - 1], 4), b: nt(xs[nLast], 4) }), color: C.red });
  else if (status === "outside") caps.push({ text: fill(T.outside, { x: nt(xs[nLast], 6) }), color: C.red });
  else caps.push({ text: fill(T.slow, { n: nLast }), color: C.orange });
  if (alpha !== undefined) {
    data.root = alpha;
    const gd = simp(derive(g));
    const v = evalE(gd, alpha);
    data.gd = v;
    const ok = Math.abs(v) < 1;
    const aT = fx(alpha, 4);
    blocks.push([
      { tex: `g'(x) = ${tex(gd)}`, op: T.derivOp },
      { tex: `|g'(${aT})| = ${sci(Math.abs(v), 3)} ${ok ? "< 1" : "> 1"}`, op: T.testOp, color: ok ? C.green : C.red },
    ]);
    if (ok) {
      data.kind = v >= 0 ? "staircase" : "cobweb";
      caps.push({ text: T.converge, color: C.green }, { text: v >= 0 ? T.staircase : T.cobweb });
    } else caps.push({ text: fill(T.diverge, { a: nt(alpha, 4) }), color: C.red });
    if (o.f && Number.isFinite(alpha)) {
      const F = fnOf(o.f);
      const scale = 1 + Math.abs(F(alpha + 1)) + Math.abs(F(alpha - 1));
      if (Math.abs(F(alpha)) < 1e-6 * scale) caps.push({ text: fill(T.check, { a: nt(alpha, 4) }), color: C.green });
      else caps.push({ text: fill(T.notRoot, { a: nt(alpha, 4) }), color: C.red });
    }
  } else caps.push({ text: T.noFixed, color: C.orange });
  // the staircase or cobweb, on a square with y = x at 45°
  const far = 8 * (Math.abs((xs[1] ?? xs[0]) - xs[0]) + 0.5);
  const cut = xs.findIndex((x) => !Number.isFinite(x) || Math.abs(x - xs[0]) > far);
  const fin = xs.slice(0, Math.min(10, cut < 0 ? xs.length : cut));
  const [lo, hi] = around([...fin, ...(alpha !== undefined ? [alpha] : [])], 0.5);
  const side = 340;
  const p = plotFrame([lo, hi], [lo, hi], side, side, (W - side) / 2 + 10);
  const { fr } = p;
  let s = clip(fr, seg(fr, lo, lo, hi, hi, C.grey, 1.6)) + curve(fr, G, C.blue, 2.4);
  let path = `M${r2(fr.sx(xs[0]))},${r2(axisY(fr))}`;
  for (let i = 0; i + 1 < fin.length; i++) path += `L${r2(fr.sx(fin[i]))},${r2(fr.sy(fin[i + 1]))}L${r2(fr.sx(fin[i + 1]))},${r2(fr.sy(fin[i + 1]))}`;
  s += clip(fr, `<path d="${path}" fill="none" stroke="${C.orange}" stroke-width="1.8" stroke-linejoin="round"/>`);
  if (alpha !== undefined && inX(fr, alpha)) s += dot(fr.sx(alpha), fr.sy(alpha), C.green, 4.5);
  s += axisLabels(fr, fin.slice(0, 4).map((x, i) => ({ x, text: `x${low(i)}`, color: C.orange })));
  blocks.push(done(p, s));
  caps.push({ text: T.graphCap, color: C.grey });
  return finish(head, blocks, caps);
}

// ---------- the trapezium, mid-ordinate and Simpson's rules ----------

type Rule = "trapezium" | "midpoint" | "simpson";
const RULE_SYM: Record<Rule, string> = { trapezium: "T", midpoint: "M", simpson: "S" };
function ruleValue(rule: Rule, ys: number[], h: number, mids: number[]): number {
  const n = ys.length - 1;
  if (rule === "trapezium") return (h / 2) * (ys[0] + ys[n] + 2 * ys.slice(1, n).reduce((s, y) => s + y, 0));
  if (rule === "midpoint") return h * mids.reduce((s, y) => s + y, 0);
  const odd = ys.filter((_, i) => i % 2 === 1 && i < n).reduce((s, y) => s + y, 0);
  const even = ys.filter((_, i) => i % 2 === 0 && i > 0 && i < n).reduce((s, y) => s + y, 0);
  return (h / 3) * (ys[0] + ys[n] + 4 * odd + 2 * even);
}

function renderIntegrate(o: Opts): RenderedSvg {
  const T = words.integrate;
  const dataMode = !!(o.xs || o.ys);
  let rules: Rule[] = o.all ? ["trapezium", "midpoint", "simpson"] : (o.methods.filter((m) => m === "trapezium" || m === "midpoint" || m === "simpson") as Rule[]);
  let F: Fn1 | null = null;
  let a: number;
  let b: number;
  let aT: string;
  let bT: string;
  let ns: number[];
  let pa: string;
  let pb: string;
  let given: number[] | null = null;
  let head: string;
  if (dataMode) {
    const [xs, ys] = [o.xs ?? [], o.ys ?? []];
    if (xs.length !== ys.length) throw new Error(fill(T.lengths, { a: xs.length, b: ys.length }));
    if (xs.length < 2) throw new Error(T.needTwo);
    const h0 = xs[1] - xs[0];
    if (!(h0 > 0) || xs.some((x, i) => Math.abs(x - (xs[0] + i * h0)) > 1e-9 * (1 + Math.abs(x)))) throw new Error(T.uneven);
    [a, b] = [xs[0], xs[xs.length - 1]];
    [aT, bT] = [tr(a), tr(b)];
    [pa, pb] = [nt(a), nt(b)];
    ns = [xs.length - 1];
    given = ys;
    if (rules.includes("midpoint")) {
      rules = rules.filter((r) => r !== "midpoint");
      if (!rules.length) throw new Error(T.noMid);
    }
    head = `\\int_{${aT}}^{${bT}} y\\,dx`;
  } else {
    const f = needF(o);
    F = fnOf(f);
    const [A, B] = needAB(o);
    [a, b, aT, bT] = [A.v, B.v, A.t, B.t];
    [pa, pb] = [plainT(A), plainT(B)];
    ns = o.ns ?? [4];
    head = `\\int_{${aT}}^{${bT}} ${tex(f)}\\,dx`;
  }
  if (ns.some((n) => n > 400)) throw new Error(fill(words.tooMany, { n: 400 }));
  const n = ns[0];
  if (!rules.length) rules = ns.every((m) => m % 2 === 0) || ns.length > 1 ? ["trapezium", "simpson"] : ["trapezium"];
  if (ns.length === 1 && rules.includes("simpson") && n % 2) throw new Error(fill(T.needEven, { n }));
  const blocks: Block[] = [];
  const caps: Caption[] = [];
  const h = (b - a) / n;
  const xsAt = (m: number) => Array.from({ length: m + 1 }, (_, i) => (i === m ? b : a + ((b - a) * i) / m));
  const ordinates = (m: number) => (given && m === n ? given : xsAt(m).map((x) => at(F!, x)));
  const midsAt = (m: number) => (F ? Array.from({ length: m }, (_, i) => at(F!, a + ((b - a) * (i + 0.5)) / m)) : []);
  const xs = xsAt(n);
  const ys = ordinates(n);
  const mids = rules.includes("midpoint") ? midsAt(n) : [];
  // the exact value, when there is a formula
  let exact: number | undefined;
  let exactRow: TexLine | undefined;
  if (F && o.f) {
    const acc = simpson(F, a, b, 2000);
    let Fa: E | null = null;
    try {
      Fa = antiderivative(o.f);
    } catch {
      Fa = null;
    }
    const ex = Fa ? evalE(Fa, b) - evalE(Fa, a) : NaN;
    if (Fa && Number.isFinite(ex) && Math.abs(ex - acc) < 1e-6 * (1 + Math.abs(acc))) {
      exact = ex;
      exactRow = { tex: `\\int_{${aT}}^{${bT}} ${tex(o.f)}\\,dx = \\left[${tex(Fa)}\\right]_{${aT}}^{${bT}} = ${tr(ex, 6)}`, op: T.exactOp, color: C.green };
    } else if (Number.isFinite(acc)) {
      exact = acc;
      exactRow = { tex: `\\int_{${aT}}^{${bT}} ${tex(o.f)}\\,dx \\approx ${tr(acc, 6)}`, op: T.accurateOp, color: C.green };
    }
    data.exact = exact;
  }
  data.estimates = {};
  if (ns.length === 1) {
    blocks.push([{ tex: `h = \\frac{${bT} - ${par(aT)}}{${n}} = ${tr(h, 6)}`, op: T.widthOp }]);
    if (n <= 24) blocks.push(...strips("x_i", "y_i", xs.map((x) => tr(x, 4)), ys.map((y) => tr(y, 4)), 7));
    if (rules.includes("midpoint") && n <= 24)
      blocks.push(...strips("x", "y", xs.slice(0, n).map((x) => tr(x + h / 2, 4)), mids.map((y) => tr(y, 4)), 7));
    const rows: TexLine[] = [];
    const Y = (i: number) => tr(ys[i], 4);
    const sum = (idx: number[]) => (idx.length <= 4 ? idx.map(Y).join(" + ") : tr(idx.reduce((s, i) => s + ys[i], 0), 4));
    const inner = Array.from({ length: Math.max(0, n - 1) }, (_, i) => i + 1);
    const hT = tr(h, 6);
    for (const rule of rules) {
      const v = ruleValue(rule, ys, h, mids);
      data.estimates[`${RULE_SYM[rule]}${n}`] = v;
      const S = `${RULE_SYM[rule]}_{${n}}`;
      if (rule === "trapezium") {
        rows.push({ tex: `${S} = \\frac{h}{2}\\left[y_0 + y_{${n}} + 2(y_1 + \\dots + y_{${n - 1}})\\right]`, op: T.trapOp });
        rows.push({ tex: `= \\frac{${hT}}{2}\\left[${Y(0)} + ${Y(n)}${inner.length ? ` + 2(${sum(inner)})` : ""}\\right] = ${tr(v, 6)}`, color: C.orange });
      } else if (rule === "midpoint") {
        rows.push({ tex: `${S} = h\\left(y_{\\frac{1}{2}} + y_{\\frac{3}{2}} + \\dots + y_{${n - 1}\\frac{1}{2}}\\right)`, op: T.midOp });
        const mt = mids.length <= 4 ? mids.map((y) => tr(y, 4)).join(" + ") : tr(mids.reduce((s, y) => s + y, 0), 4);
        rows.push({ tex: `= ${hT}\\left(${mt}\\right) = ${tr(v, 6)}`, color: C.green });
      } else {
        const odd = inner.filter((i) => i % 2 === 1);
        const even = inner.filter((i) => i % 2 === 0);
        rows.push({ tex: `${S} = \\frac{h}{3}\\left[y_0 + y_{${n}} + 4(y_1 + y_3 + \\dots) + 2(y_2 + y_4 + \\dots)\\right]`, op: T.simpOp });
        rows.push({ tex: `= \\frac{${hT}}{3}\\left[${Y(0)} + ${Y(n)} + 4(${sum(odd)})${even.length ? ` + 2(${sum(even)})` : ""}\\right] = ${tr(v, 6)}`, color: C.purple });
      }
    }
    blocks.push(rows);
    if (exactRow && exact !== undefined) {
      const er: TexLine[] = [exactRow];
      for (const rule of rules) {
        const v = data.estimates[`${RULE_SYM[rule]}${n}`];
        const e = Math.abs(exact - v);
        er.push({ tex: `|I - ${RULE_SYM[rule]}_{${n}}| = ${sci(e, 3)}${exact !== 0 ? ` \\quad (${sci((100 * e) / Math.abs(exact), 2)}\\%)` : ""}`, op: T.errorOp });
      }
      blocks.push(er);
      if (rules.length > 1 && rules.includes("simpson") && rules.includes("trapezium")) {
        const [eT, eS] = [Math.abs(exact - data.estimates[`T${n}`]), Math.abs(exact - data.estimates[`S${n}`])];
        if (eS < eT / 3) caps.push({ text: T.better });
      }
    }
  } else {
    // several n: how the error shrinks
    const head2 = ["n", "h", ...rules.flatMap((r) => (exact !== undefined ? [`${RULE_SYM[r]}_n`, `|I - ${RULE_SYM[r]}_n|`] : [`${RULE_SYM[r]}_n`]))];
    const errs: Record<Rule, [number, number][]> = { trapezium: [], midpoint: [], simpson: [] };
    const body = ns.map((m) => {
      const ysm = ordinates(m);
      const hm = (b - a) / m;
      const cells = [String(m), tr(hm, 6)];
      for (const r of rules) {
        if (r === "simpson" && m % 2) {
          cells.push("\\varnothing", ...(exact !== undefined ? ["\\varnothing"] : []));
          continue;
        }
        const v = ruleValue(r, ysm, hm, r === "midpoint" ? midsAt(m) : []);
        data.estimates![`${RULE_SYM[r]}${m}`] = v;
        cells.push(tr(v, 7));
        if (exact !== undefined) {
          const e = Math.abs(exact - v);
          errs[r].push([hm, e]);
          cells.push(sci(e, 3));
        }
      }
      return cells;
    });
    if (exactRow) blocks.push([exactRow]);
    blocks.push(texPic(arrayTex(head2, body)));
    // observed order: the slope of log(error) against log(h)
    const order = (pts: [number, number][]) => {
      const ok = pts.filter(([, e]) => e > 1e-13);
      if (ok.length < 2) return null;
      const [p, q] = [ok[0], ok[ok.length - 1]];
      return Math.log(p[1] / q[1]) / Math.log(p[0] / q[0]);
    };
    if (exact !== undefined) {
      const parts = rules
        .map((r) => {
          const p = order(errs[r]);
          return p === null ? null : `${RULE_SYM[r]}: p ≈ ${p.toFixed(1)}`;
        })
        .filter(Boolean);
      if (parts.length) caps.push({ text: fill(T.order, { list: parts.join(", ") }) });
      if (rules.includes("simpson") && errs.simpson.length && errs.simpson.every(([, e]) => e < 1e-10)) caps.push({ text: T.simpExact });
    }
  }
  // which way the trapezium rule errs: the sign of f″
  if (o.f && F) {
    let d2: E | null = null;
    try {
      d2 = simp(derive(simp(derive(o.f))));
    } catch {
      d2 = null;
    }
    const vals = d2 ? Array.from({ length: 201 }, (_, i) => evalE(d2!, a + ((b - a) * (i + 0.5)) / 201.5)).filter(Number.isFinite) : [];
    const fa2 = { a: pa, b: pb };
    if (vals.length) {
      if (vals.every((v) => Math.abs(v) < 1e-12)) (data.bend = 0), caps.push({ text: T.straight });
      else if (vals.every((v) => v >= -1e-12)) (data.bend = 1), caps.push({ text: fill(T.over, fa2) });
      else if (vals.every((v) => v <= 1e-12)) (data.bend = -1), caps.push({ text: fill(T.under, fa2) });
      else caps.push({ text: fill(T.mixed, fa2) });
    }
  }
  if (dataMode) caps.push({ text: T.dataCap });
  if (n > 24) caps.push({ text: fill(T.many, { n }) });
  // the picture: strips under the curve
  const span = b - a;
  const xr: [number, number] = [a - span * 0.06, b + span * 0.06];
  const curveYs = F ? sampleY(F, a, b, 400) : ys;
  const p = plotFrame(xr, yRange(curveYs, [0, ...ys, ...mids]), 250);
  const { fr } = p;
  const Y0 = fr.sy(0);
  let s = "";
  const drawN = n <= 60;
  if (drawN) {
    if (rules.includes("trapezium"))
      for (let i = 0; i < n; i++)
        s += `<path d="M${r2(fr.sx(xs[i]))},${r2(Y0)}L${r2(fr.sx(xs[i]))},${r2(fr.sy(ys[i]))}L${r2(fr.sx(xs[i + 1]))},${r2(fr.sy(ys[i + 1]))}L${r2(fr.sx(xs[i + 1]))},${r2(Y0)}Z" fill="${C.orange}" fill-opacity="0.2" stroke="${C.orange}" stroke-width="1.4"/>`;
    if (rules.includes("midpoint")) {
      const only = rules.length === 1;
      for (let i = 0; i < n; i++)
        s += `<rect x="${r2(fr.sx(xs[i]))}" y="${r2(Math.min(fr.sy(mids[i]), Y0))}" width="${r2(fr.sx(xs[i + 1]) - fr.sx(xs[i]))}" height="${r2(Math.abs(fr.sy(mids[i]) - Y0))}" fill="${C.green}" fill-opacity="${only ? 0.2 : 0}" stroke="${C.green}" stroke-width="1.3" ${only ? "" : DASH}/>`;
    }
    if (rules.includes("simpson") && n % 2 === 0) {
      const only = !rules.includes("trapezium");
      for (let i = 0; i < n; i += 2) {
        const [x0, x1, x2] = [xs[i], xs[i + 1], xs[i + 2]];
        const [y0, y1, y2] = [ys[i], ys[i + 1], ys[i + 2]];
        const q = (x: number) =>
          (y0 * (x - x1) * (x - x2)) / ((x0 - x1) * (x0 - x2)) + (y1 * (x - x0) * (x - x2)) / ((x1 - x0) * (x1 - x2)) + (y2 * (x - x0) * (x - x1)) / ((x2 - x0) * (x2 - x1));
        const pts = Array.from({ length: 31 }, (_, j) => x0 + ((x2 - x0) * j) / 30).map((x) => `${r2(fr.sx(x))},${r2(fr.sy(q(x)))}`);
        s += `<path d="M${r2(fr.sx(x0))},${r2(Y0)}L${pts.join("L")}L${r2(fr.sx(x2))},${r2(Y0)}Z" fill="${C.purple}" fill-opacity="${only ? 0.18 : 0}" stroke="${C.purple}" stroke-width="1.6" ${only ? "" : DASH}/>`;
      }
    }
  }
  s = clip(fr, s);
  if (F) s += curve(fr, F, C.blue, 2.4);
  if (drawN) for (let i = 0; i <= n; i++) if (inside(fr, xs[i], ys[i])) s += dot(fr.sx(xs[i]), fr.sy(ys[i]), C.ink, n <= 24 ? 3.2 : 2);
  blocks.push(done(p, s));
  const legend = [rules.includes("trapezium") ? T.capTrap : "", rules.includes("midpoint") ? T.capMid : "", rules.includes("simpson") && n % 2 === 0 ? T.capSimp : ""].filter(Boolean).join(" ");
  if (legend) caps.push({ text: legend, color: C.grey });
  return finish(`${head}${ns.length === 1 ? `,\\quad n = ${n}` : `,\\quad n = ${ns.join(", ")}`}`, blocks, caps);
}

// ---------- numerical derivatives ----------

function renderDiff(o: Opts): RenderedSvg {
  const T = words.diff;
  const f = needF(o);
  const F = fnOf(f);
  if (!o.at) throw new Error(T.needAt);
  const A = o.at;
  const a = A.v;
  at(F, a);
  const hs = o.hs ?? [{ v: 0.1, t: "0.1" }];
  const d = simp(derive(f));
  const exact = evalE(d, a);
  if (!Number.isFinite(exact)) throw new Error(fill(words.undefinedAt, { x: nt(a, 6) }));
  data.exact = exact;
  data.estimates = {};
  const head = `f(x) = ${tex(f)},\\quad x = ${A.t},\\quad h = ${hs.map((h) => h.t).join(", ")}`;
  const blocks: Block[] = [];
  const caps: Caption[] = [];
  const est = (h: number) => {
    const [fp, f0, fm] = [at(F, a + h), at(F, a), at(F, a - h)];
    return { fp, f0, fm, fwd: (fp - f0) / h, bwd: (f0 - fm) / h, cen: (fp - fm) / (2 * h) };
  };
  const exactRows: TexLine[] = [
    { tex: `f'(x) = ${tex(d)}`, op: T.exactOp, color: C.green },
    { tex: `f'(${A.t}) = ${tr(exact, 8)}`, color: C.green },
  ];
  if (hs.length === 1) {
    const h = hs[0];
    const e = est(h.v);
    Object.assign(data.estimates, { forward: e.fwd, backward: e.bwd, central: e.cen });
    const [ap, am] = [tr(a + h.v, 8), tr(a - h.v, 8)];
    const v = (y: number) => tr(y, 6);
    blocks.push([
      { tex: `\\frac{f(${ap}) - f(${A.t})}{${h.t}} = \\frac{${v(e.fp)} - ${par(v(e.f0))}}{${h.t}} = ${tr(e.fwd, 6)}`, op: T.forwardOp, color: C.orange },
      { tex: `\\frac{f(${A.t}) - f(${am})}{${h.t}} = \\frac{${v(e.f0)} - ${par(v(e.fm))}}{${h.t}} = ${tr(e.bwd, 6)}`, op: T.backwardOp, color: C.purple },
      { tex: `\\frac{f(${ap}) - f(${am})}{2 \\cdot ${h.t}} = \\frac{${v(e.fp)} - ${par(v(e.fm))}}{${tr(2 * h.v, 8)}} = ${tr(e.cen, 6)}`, op: T.centralOp, color: C.blue },
    ]);
    blocks.push(exactRows);
    blocks.push([
      { tex: `|${tr(e.fwd, 6)} - ${par(tr(exact, 6))}| = ${sci(Math.abs(e.fwd - exact), 3)}, \\quad |${tr(e.bwd, 6)} - ${par(tr(exact, 6))}| = ${sci(Math.abs(e.bwd - exact), 3)}`, op: T.errorOp },
      { tex: `|${tr(e.cen, 6)} - ${par(tr(exact, 6))}| = ${sci(Math.abs(e.cen - exact), 3)}`, op: T.errorOp },
    ]);
    caps.push({ text: T.central });
  } else {
    blocks.push(exactRows);
    const fe: [number, number][] = [];
    const ce: [number, number][] = [];
    const body = hs.map((h) => {
      const e = est(h.v);
      data.estimates![`forward ${h.t}`] = e.fwd;
      data.estimates![`central ${h.t}`] = e.cen;
      fe.push([h.v, Math.abs(e.fwd - exact)]);
      ce.push([h.v, Math.abs(e.cen - exact)]);
      return [h.t, tr(e.fwd, 9), sci(Math.abs(e.fwd - exact), 2), tr(e.cen, 9), sci(Math.abs(e.cen - exact), 2)];
    });
    blocks.push(texPic(arrayTex(["h", "\\frac{f(x+h) - f(x)}{h}", "|\\varepsilon|", "\\frac{f(x+h) - f(x-h)}{2h}", "|\\varepsilon|"], body)));
    // the order from the first two h (before round-off takes over)
    const order = (pts: [number, number][]) => {
      const [p, q] = pts;
      return p[1] > 1e-14 && q[1] > 1e-14 ? Math.log(p[1] / q[1]) / Math.log(p[0] / q[0]) : NaN;
    };
    const [pf, pc] = [order(fe), order(ce)];
    if (Number.isFinite(pf) && Number.isFinite(pc)) caps.push({ text: fill(T.order, { f: pf.toFixed(1), c: pc.toFixed(1) }) });
    const turn = (pts: [number, number][]) => pts.some((p, i) => i > 0 && p[0] < pts[i - 1][0] && p[1] > pts[i - 1][1] * 1.5);
    if (turn(fe) || turn(ce)) caps.push({ text: T.roundoff, color: C.orange });
  }
  // the chords around the tangent
  const hMax = Math.max(...hs.map((x) => x.v));
  const h = Math.max(hMax, 0.1 * Math.max(1, Math.abs(a)));
  if (h !== hMax) caps.push({ text: fill(T.drawn, { h: nt(h, 4) }), color: C.grey });
  const xr: [number, number] = [a - 2.6 * h, a + 2.6 * h];
  const p = plotFrame(xr, yRange(sampleY(F, xr[0], xr[1], 300), []), 240);
  const { fr } = p;
  const e = est(h);
  const line = (x1: number, y1: number, x2: number, y2: number, color: string, extra = "") => {
    const m = (y2 - y1) / (x2 - x1);
    return clip(fr, seg(fr, fr.x0, y1 + m * (fr.x0 - x1), fr.x1, y1 + m * (fr.x1 - x1), color, 1.7, extra));
  };
  let s = curve(fr, F, C.ink, 2.4);
  s += line(a, e.f0, a + 1, e.f0 + exact, C.green);
  s += line(a, e.f0, a + h, e.fp, C.orange);
  s += line(a - h, e.fm, a, e.f0, C.purple);
  s += line(a - h, e.fm, a + h, e.fp, C.blue, DASH);
  for (const [x, y] of [[a - h, e.fm], [a, e.f0], [a + h, e.fp]]) if (inside(fr, x, y)) s += dot(fr.sx(x), fr.sy(y), C.ink, 4);
  blocks.push(done(p, s));
  caps.push({ text: T.graphCap, color: C.grey });
  return finish(head, blocks, caps);
}

// ---------- the tool ----------

export function renderNumerical(spec: NumSpec, w: NumWords): RenderedSvg {
  return buildNumerical(spec, w).svg;
}
export function buildNumerical(spec: NumSpec, w: NumWords): { svg: RenderedSvg; data: NumData } {
  words = w;
  data = {};
  exprMessages({ bad: w.bad, onlyX: w.onlyX, tooBig: w.tooBig });
  const src = spec.src.trim();
  if (!src) throw new Error(w.need[spec.topic]);
  const o = readOpts(src, spec.topic);
  let svg: RenderedSvg;
  switch (spec.topic) {
    case "sign":
      svg = renderSign(o);
      break;
    case "bisect":
      svg = renderBisect(o);
      break;
    case "newton":
      svg = renderNewton(o);
      break;
    case "iterate":
      svg = renderIterate(o);
      break;
    case "integrate":
      svg = renderIntegrate(o);
      break;
    case "diff":
      svg = renderDiff(o);
      break;
  }
  return { svg, data };
}

const S = (topic: NumTopic, src: string): NumSpec => ({ topic, src });
export const NUM_PRESETS: { [K in NumTopic]: { label: string; spec: NumSpec }[] } = {
  sign: [
    { label: "x³ − 2x − 5 on [2, 3]", spec: S("sign", "x^3 - 2x - 5; [2, 3]") },
    { label: "… to 2 d.p.", spec: S("sign", "x^3 - 2x - 5; [2, 3]; 2 dp") },
    { label: "eˣ = 3 − x to 3 d.p.", spec: S("sign", "e^x = 3 - x; [0, 1]; 3 dp") },
    { label: "find the intervals", spec: S("sign", "x^3 - 4x + 1") },
    { label: "1/(x − 2): a break", spec: S("sign", "1/(x - 2); [1, 3]") },
    { label: "two roots hidden", spec: S("sign", "x^2 - 3x + 2; [0, 3]") },
    { label: "(x − 1)²: touching", spec: S("sign", "(x - 1)^2; [0, 2]") },
  ],
  bisect: [
    { label: "x³ − x − 2, 6 steps", spec: S("bisect", "x^3 - x - 2; [1, 2]; 6 steps") },
    { label: "√2 to 3 d.p.", spec: S("bisect", "x^2 - 2; [1, 2]; 3 dp") },
    { label: "cos x = x to 2 d.p.", spec: S("bisect", "cos x = x; [0, 1]; 2 dp") },
    { label: "eˣ = 4x to 3 d.p.", spec: S("bisect", "e^x = 4x; [0, 1]; 3 dp") },
    { label: "false position", spec: S("bisect", "x^3 - x - 2; [1, 2]; false position; 4 dp") },
  ],
  newton: [
    { label: "x³ − 2x − 5, x₀ = 2", spec: S("newton", "x^3 - 2x - 5; x0 = 2") },
    { label: "√5 to 4 d.p.", spec: S("newton", "x^2 - 5; x0 = 2; 4 dp") },
    { label: "cos x = x", spec: S("newton", "cos x = x; x0 = 1; 5 dp") },
    { label: "eˣ = 3x, x₀ = 0", spec: S("newton", "e^x = 3x; x0 = 0; 3 dp") },
    { label: "fails: flat tangent", spec: S("newton", "x^3 - 3x + 1; x0 = 1") },
    { label: "fails: a cycle", spec: S("newton", "x^3 - 2x + 2; x0 = 0") },
    { label: "fails: runs away", spec: S("newton", "cbrt(x); x0 = 1; 6 steps") },
    { label: "secant method", spec: S("newton", "x^3 - 2x - 5; secant; x0 = 2; x1 = 3") },
  ],
  iterate: [
    { label: "x = ∛(2x + 5)", spec: S("iterate", "x = cbrt(2x + 5); x0 = 2") },
    { label: "x = cos x (cobweb)", spec: S("iterate", "x = cos x; x0 = 1; 3 dp") },
    { label: "a rearrangement that fails", spec: S("iterate", "x^3 - 2x - 5 = 0; x = (x^3 - 5)/2; x0 = 2; 6 steps") },
    { label: "x = e⁻ˣ", spec: S("iterate", "x = e^(-x); x0 = 0.5; 4 dp") },
    { label: "xₙ₊₁ = 2 + 1/xₙ", spec: S("iterate", "x_(n+1) = 2 + 1/x_n; x0 = 1") },
    { label: "x = (x² + 2)/3 (staircase)", spec: S("iterate", "x = (x^2 + 2)/3; x0 = 1.5; 3 dp") },
  ],
  integrate: [
    { label: "∫₀¹ e^{x²}, n = 4", spec: S("integrate", "e^(x^2); [0, 1]; n = 4") },
    { label: "∫₁³ ln x, trapezium", spec: S("integrate", "ln x; [1, 3]; n = 4; trapezium") },
    { label: "√(1 + x³), Simpson", spec: S("integrate", "sqrt(1 + x^3); [0, 2]; n = 6; simpson") },
    { label: "all three rules", spec: S("integrate", "1/(1 + x^2); [0, 1]; n = 4; all") },
    { label: "sin x, n = 2, 4, 8, 16", spec: S("integrate", "sin x; [0, pi]; n = 2, 4, 8, 16") },
    { label: "from a table", spec: S("integrate", "x: 0, 0.5, 1, 1.5, 2; y: 1, 1.3, 2.1, 3.4, 5.2") },
  ],
  diff: [
    { label: "sin x at 1, h = 0.1", spec: S("diff", "sin x; x = 1; h = 0.1") },
    { label: "eˣ at 0, h → 0", spec: S("diff", "e^x; x = 0; h = 0.1, 0.01, 0.001") },
    { label: "x³ at 2, h = 0.5", spec: S("diff", "x^3; x = 2; h = 0.5") },
    { label: "ln x: round-off", spec: S("diff", "ln x; x = 2; h = 0.01, 0.0001, 0.000001, 0.00000001, 0.0000000001") },
    { label: "√x at 4", spec: S("diff", "sqrt x; x = 4; h = 0.2") },
  ],
};
