// Probability as a model, one step at a time: a discrete random variable from its table (the probabilities add up to 1,
// E[X] the probability-weighted mean and balance point of the bars, Var(X) = E[X²] − E[X]², the cdf as steps), a
// continuous one from its density f(x) on an interval (the same by integrals, with the median where F reaches ½),
// the rules E[aX + b] = aE[X] + b and Var(aX + b) = a²Var(X), a joint table (margins, a conditional row, independence
// cell by cell, E[XY], covariance, correlation, and X + Y), and the covariance matrix of points drawn as ellipses whose
// long axis is PC1. Tables are kept exact as fractions while the numbers stay small; integrals are numerical.
import { axes, C, compose, curve, dot, esc, fill, FONT, lbl, makeFrame, nt, r2, simpson, texLines, W, yRange, type Caption, type Frame, type TexLine } from "./chart";
import { approx, evalE, exprMessages, has, isNum, parseE, simp, tex, tidy } from "./expr";
import { Frac } from "./fraction";
import type { RenderedSvg } from "./latex";
import { eigenSym, squared } from "./multivar";

export type RvTopic = "discrete" | "continuous" | "rules" | "joint" | "cov";
export const RV_TOPICS: RvTopic[] = ["discrete", "continuous", "rules", "joint", "cov"];
/** What a picture is made from, one typed line per field of the topic (see `RV_FIELDS`). */
export type RvSpec = { topic: RvTopic; src: string[] };
/** The fields each topic asks for, by their names in the words. */
export const RV_FIELDS: Record<RvTopic, ("values" | "probs" | "f" | "from" | "to" | "a" | "b" | "xs" | "ys" | "table" | "given" | "points")[]> = {
  discrete: ["values", "probs"],
  continuous: ["f", "from", "to"],
  rules: ["values", "probs", "a", "b"],
  joint: ["xs", "ys", "table", "given"],
  cov: ["points"],
};

export type RvWords = {
  bad: string;
  tooBig: string;
  onlyX: string;
  needNumbers: string;
  sameCount: string;
  needOne: string;
  negative: string;
  repeated: string;
  needEnds: string;
  tableShape: string;
  givenNotX: string;
  givenZero: string;
  fewPoints: string;
  discrete: { sum: string; mean: string; squares: string; variance: string; sd: string; bars: string; cdf: string; summary: string };
  continuous: { total: string; mean: string; squares: string; variance: string; cdf: string; median: string; pdf: string; summary: string; skew: string };
  rules: { y: string; meanDirect: string; meanRule: string; variance: string; sd: string; summary: string };
  joint: {
    sum: string;
    margX: string;
    margY: string;
    given: string;
    independent: string;
    dependent: string;
    means: string;
    cov: string;
    corr: string;
    sum2: string;
    varSum: string;
    summaryIndependent: string;
    summaryDependent: string;
    barsGiven: string;
    barsY: string;
  };
  cov: { means: string; entries: string; together: string; matrix: string; corr: string; eigen: string; share: string; summary: string; ellipses: string; pc1: string };
};

// ---------- exact numbers ----------

/** A rational number, or null when one is too large to keep exactly (then numbers are decimals). */
type Q = Frac | null;
const SAFE = 1e9;
const ok = (f: Frac) => Math.abs(f.n) < SAFE && f.d < SAFE;
const qAdd = (a: Q, b: Q): Q => (a && b ? keep(a.add(b)) : null);
const qMul = (a: Q, b: Q): Q => (a && b ? keep(a.mul(b)) : null);
const qSub = (a: Q, b: Q): Q => (a && b ? keep(a.sub(b)) : null);
const keep = (f: Frac): Q => (ok(f) ? f : null);
/** A number in LaTeX: exact when it can be (a small fraction), else four decimals. */
const show = (q: Q, v: number) => (q && q.d <= 10000 ? q.tex() : approx(clean(v)).replace("−", "-"));
const showP = (q: Q, v: number) => {
  const s = show(q, v);
  return s.startsWith("-") ? `\\left(${s}\\right)` : s;
};
const clean = (v: number) => (Math.abs(v) < 1e-12 ? 0 : v);
/** A value worked out with an integral: what is left below 10⁻⁹ is rounding. */
const tiny = (v: number) => (Math.abs(v) < 1e-9 ? 0 : v);
const n = (v: number) => approx(clean(v)).replace("−", "-");

// ---------- reading ----------

/** A list of numbers, separated by commas, semicolons or spaces: 1/8, 0.25, −2, pi. */
export function readList(s: string, w: RvWords): { q: Q[]; v: number[] } {
  const parts = s.split(/[,;\s]+/).map((p) => p.trim()).filter(Boolean);
  if (!parts.length) throw new Error(w.needNumbers);
  const q: Q[] = [];
  const v: number[] = [];
  for (const p of parts) {
    let e;
    try {
      e = simp(parseE(p));
    } catch {
      throw new Error(fill(w.bad, { s: p }));
    }
    const x = evalE(e, 0);
    if (has(e) || !Number.isFinite(x)) throw new Error(w.needNumbers);
    q.push(isNum(e) ? keep(e.v) : null);
    v.push(x);
  }
  return { q, v };
}
/** One number. */
const readOne = (s: string, w: RvWords) => {
  const r = readList(s, w);
  if (r.v.length !== 1) throw new Error(w.needNumbers);
  return { q: r.q[0], v: r.v[0] };
};
/** A table's probabilities: they must be at least 0 and add up to 1. */
function checkProbs(q: Q[], v: number[], w: RvWords): { sum: Q; total: number } {
  if (v.some((p) => p < 0)) throw new Error(w.negative);
  const sum = q.reduce<Q>((a, b) => qAdd(a, b), new Frac(0));
  const total = v.reduce((a, b) => a + b, 0);
  if (Math.abs(total - 1) > 1e-9) throw new Error(fill(w.needOne, { s: nt(total, 4) }));
  return { sum, total };
}
/** A sum written out: every term, or the first three and the last when there are many. */
const terms = (ts: string[]) => (ts.length <= 6 ? ts.join(" + ") : `${ts.slice(0, 3).join(" + ")} + \\cdots + ${ts[ts.length - 1]}`).replace(/\+ -/g, "- ");

// ---------- a discrete random variable ----------

export type Moments = { mean: number; m2: number; variance: number; meanQ: Q; m2Q: Q; varQ: Q };
/** E[X], E[X²] and Var(X) of a table, exactly where possible. */
export function momentsOf(xq: Q[], xv: number[], pq: Q[], pv: number[]): Moments {
  let [meanQ, m2Q]: [Q, Q] = [new Frac(0), new Frac(0)];
  let [mean, m2] = [0, 0];
  xv.forEach((x, i) => {
    mean += x * pv[i];
    m2 += x * x * pv[i];
    meanQ = qAdd(meanQ, qMul(xq[i], pq[i]));
    m2Q = qAdd(m2Q, qMul(qMul(xq[i], xq[i]), pq[i]));
  });
  const variance = Math.max(0, m2 - mean * mean);
  return { mean, m2, variance, meanQ, m2Q, varQ: qSub(m2Q, qMul(meanQ, meanQ)) };
}

function readTable(src: string[], w: RvWords) {
  const xs = readList(src[0] ?? "", w);
  const ps = readList(src[1] ?? "", w);
  if (xs.v.length !== ps.v.length) throw new Error(fill(w.sameCount, { a: xs.v.length, b: ps.v.length }));
  if (new Set(xs.v).size !== xs.v.length) throw new Error(w.repeated);
  const { sum } = checkProbs(ps.q, ps.v, w);
  // In order of x, for the bars and the steps.
  const order = xs.v.map((_, i) => i).sort((a, b) => xs.v[a] - xs.v[b]);
  return { xq: order.map((i) => xs.q[i]), xv: order.map((i) => xs.v[i]), pq: order.map((i) => ps.q[i]), pv: order.map((i) => ps.v[i]), sum };
}

/** The rows that work out E[X], E[X²], Var(X) and σ from a table. */
function momentRows(t: { xq: Q[]; xv: number[]; pq: Q[]; pv: number[] }, m: Moments, Dw: RvWords["discrete"], name = "X"): TexLine[] {
  const xs = t.xv.map((x, i) => showP(t.xq[i], x));
  const ps = t.pv.map((p, i) => show(t.pq[i], p));
  return [
    { tex: `E[${name}] = \\sum x\\,P(${name} = x) = ${terms(xs.map((x, i) => `${x} \\cdot ${ps[i]}`))} = ${show(m.meanQ, m.mean)}`, op: Dw.mean, color: C.blue },
    { tex: `E[${name}^2] = \\sum x^2\\,P(${name} = x) = ${terms(xs.map((x, i) => `${squared(x)} \\cdot ${ps[i]}`))} = ${show(m.m2Q, m.m2)}`, op: Dw.squares },
    { tex: `\\mathrm{Var}(${name}) = E[${name}^2] - E[${name}]^2 = ${show(m.m2Q, m.m2)} - ${squared(show(m.meanQ, m.mean))} = ${show(m.varQ, m.variance)}`, op: Dw.variance, color: C.orange },
    { tex: `\\sigma_{${name}} = \\sqrt{\\mathrm{Var}(${name})} \\approx ${n(Math.sqrt(m.variance))}`, op: Dw.sd },
  ];
}

/** Bars of a table on a frame, the mean dashed and a band one σ either side. */
function bars(fr: Frame, xv: number[], pv: number[], mean: number, sd: number, color: string, labels = true): string {
  const gaps = xv.slice(1).map((x, i) => x - xv[i]);
  const width = Math.max(4, Math.min(34, (fr.sx(xv[0] + Math.min(...(gaps.length ? gaps : [1]))) - fr.sx(xv[0])) * 0.6));
  let s = `<rect x="${r2(fr.sx(mean - sd))}" y="${fr.top}" width="${r2(Math.max(0, fr.sx(mean + sd) - fr.sx(mean - sd)))}" height="${fr.bottom - fr.top}" fill="${color}" opacity="0.08" clip-path="url(#${fr.id})"/>`;
  xv.forEach((x, i) => {
    const [px, py] = [fr.sx(x), fr.sy(pv[i])];
    s += `<rect x="${r2(px - width / 2)}" y="${r2(py)}" width="${r2(width)}" height="${r2(Math.max(0, fr.sy(0) - py))}" fill="${color}" opacity="0.85"/>`;
    if (labels && xv.length <= 12) s += `<text x="${r2(px)}" y="${r2(py - 5)}" ${FONT} font-size="10.5" fill="#495057" text-anchor="middle">${esc(nt(pv[i], 3))}</text>`;
  });
  s += `<line x1="${r2(fr.sx(mean))}" y1="${fr.top}" x2="${r2(fr.sx(mean))}" y2="${fr.bottom}" stroke="${C.ink}" stroke-width="2" stroke-dasharray="6 4"/>`;
  s += lbl(fr.sx(mean) + 4, fr.top + 14, `E = ${nt(mean, 3)}`, C.ink, "start", 12, false);
  return s;
}
/** The x range for a table's pictures: a little beyond the values on each side. */
const spanOf = (xs: number[]): [number, number] => {
  const [lo, hi] = [Math.min(...xs), Math.max(...xs)];
  const pad = Math.max(0.6, (hi - lo) * 0.12);
  return [lo - pad, hi + pad];
};

function renderDiscrete(s: RvSpec, w: RvWords): RenderedSvg {
  const Dw = w.discrete;
  const t = readTable(s.src, w);
  const m = momentsOf(t.xq, t.xv, t.pq, t.pv);
  const sd = Math.sqrt(m.variance);
  const rows: TexLine[] = [{ tex: `\\sum P(X = x) = ${terms(t.pv.map((p, i) => show(t.pq[i], p)))} = 1`, op: Dw.sum }, ...momentRows(t, m, Dw)];
  const body: string[] = [];
  let y = 4;
  const ln = texLines(rows, y);
  body.push(ln.svg);
  y += ln.h + 14;
  const half = (W - 3 * 44) / 2;
  const span = spanOf(t.xv);
  const left = makeFrame("rv-pmf", 44, y + 18, half, 200, span, [0, Math.max(...t.pv) * 1.18]);
  const right = makeFrame("rv-cdf", 88 + half, y + 18, half, 200, span, [0, 1.08]);
  body.push(title(left, Dw.bars), axes(left, { xAtBottom: true, yAxis: false }), bars(left, t.xv, t.pv, m.mean, sd, C.blue));
  body.push(title(right, Dw.cdf), axes(right), steps(right, t.xv, t.pv));
  y += 18 + 200 + 26;
  return compose(`X: ${t.xv.map((x, i) => `P(X = ${show(t.xq[i], x)}) = ${show(t.pq[i], t.pv[i])}`).slice(0, 6).join(",\\; ")}${t.xv.length > 6 ? ",\\; \\ldots" : ""}`, body.join(""), y, [{ text: fill(Dw.summary, { m: nt(m.mean, 4), s: nt(sd, 4) }), color: "#495057" }]);
}
const title = (fr: Frame, text: string) => `<text x="${r2((fr.left + fr.right) / 2)}" y="${fr.top - 8}" ${FONT} font-size="13" font-weight="700" fill="#495057" text-anchor="middle">${esc(text)}</text>`;
/** The cdf of a table: flat between the values, a jump of P(X = x) at each, a filled dot where each step starts. */
function steps(fr: Frame, xv: number[], pv: number[]): string {
  let s = "";
  let F = 0;
  const xs = [fr.x0, ...xv, fr.x1];
  for (let i = 0; i < xs.length - 1; i++) {
    if (i > 0) F += pv[i - 1];
    const [a, b] = [xs[i], xs[i + 1]];
    s += `<line x1="${r2(fr.sx(a))}" y1="${r2(fr.sy(F))}" x2="${r2(fr.sx(b))}" y2="${r2(fr.sy(F))}" stroke="${C.purple}" stroke-width="2.6"/>`;
    if (i > 0) s += dot(fr.sx(a), fr.sy(F), C.purple, 4);
    if (i < xs.length - 2) s += dot(fr.sx(b), fr.sy(F), C.purple, 4, true);
  }
  return s;
}

// ---------- a continuous random variable ----------

/** An end of the interval: a number, or ∞ (a long way out, where any density has long since faded). */
function readEnd(s: string, w: RvWords, sign: 1 | -1): number {
  const t = s.trim().toLowerCase().replace(/\s+/g, "");
  if (/^[+\-−]?(inf|infinity|∞)$/.test(t)) return t.startsWith("-") || t.startsWith("−") ? -60 : 60 * sign;
  const r = readOne(s, w);
  return r.v;
}

function renderContinuous(s: RvSpec, w: RvWords): RenderedSvg {
  const Cw = w.continuous;
  if (!(s.src[0] ?? "").trim()) throw new Error(fill(w.bad, { s: "" }));
  const f = tidy(parseE(s.src[0]));
  if (!(s.src[1] ?? "").trim() || !(s.src[2] ?? "").trim()) throw new Error(w.needEnds);
  const [a, b] = [readEnd(s.src[1], w, -1), readEnd(s.src[2], w, 1)];
  if (!(a < b)) throw new Error(w.needEnds);
  const F = (x: number) => evalE(f, x);
  // The density must be a number and at least 0 everywhere on the interval.
  for (let i = 0; i <= 400; i++) {
    const v = F(a + ((b - a) * (i + 0.5)) / 401);
    if (!Number.isFinite(v)) throw new Error(fill(w.bad, { s: s.src[0] }));
    if (v < -1e-12) throw new Error(w.negative);
  }
  const int = (g: (x: number) => number, lo = a, hi = b) => simpson(g, lo, hi, 4000);
  const total = int(F);
  if (Math.abs(total - 1) > 1e-4) throw new Error(fill(w.needOne, { s: nt(total, 4) }));
  const mean = tiny(int((x) => x * F(x)));
  const m2 = int((x) => x * x * F(x));
  const variance = Math.max(0, m2 - mean * mean);
  const sd = Math.sqrt(variance);
  // The cdf, once, as a running sum on a fine grid (trapezia), read between its points; the median where it is ½.
  const N = 6000;
  const grid = Array.from({ length: N + 1 }, (_, i) => a + ((b - a) * i) / N);
  const run = [0];
  for (let i = 1; i <= N; i++) run.push(run[i - 1] + ((F(grid[i - 1]) + F(grid[i])) / 2) * ((b - a) / N));
  const cdf = (x: number) => {
    if (x <= a) return 0;
    if (x >= b) return run[N];
    const k = Math.min(N - 1, Math.floor(((x - a) / (b - a)) * N));
    return run[k] + ((run[k + 1] - run[k]) * (x - grid[k])) / (grid[k + 1] - grid[k]);
  };
  const median = tiny(bisectCdf(cdf, a, b, 0.5));
  const end = (v: number) => (v >= 60 ? "\\infty" : v <= -60 ? "-\\infty" : n(v));
  const [A, B] = [end(a), end(b)];
  const rows: TexLine[] = [
    { tex: `\\int_{${A}}^{${B}} f(x)\\,dx = ${n(total)}`, op: Cw.total },
    { tex: `E[X] = \\int_{${A}}^{${B}} x\\,f(x)\\,dx \\approx ${n(mean)}`, op: Cw.mean, color: C.blue },
    { tex: `E[X^2] = \\int_{${A}}^{${B}} x^2 f(x)\\,dx \\approx ${n(m2)}`, op: Cw.squares },
    { tex: `\\mathrm{Var}(X) = E[X^2] - E[X]^2 \\approx ${n(variance)}, \\quad \\sigma \\approx ${n(sd)}`, op: Cw.variance, color: C.orange },
    { tex: `F(x) = P(X \\le x) = \\int_{${A}}^{x} f(t)\\,dt, \\quad F(m) = \\tfrac12 \\text{ at } m \\approx ${n(median)}`, op: Cw.median, color: C.purple },
  ];
  const body: string[] = [];
  let y = 4;
  const ln = texLines(rows, y);
  body.push(ln.svg);
  y += ln.h + 14;
  // The view: the interval, or where the far ends of an infinite one hold almost nothing.
  let [v0, v1] = [a, b];
  if (a <= -60) v0 = bisectCdf(cdf, a, b, 0.001);
  if (b >= 60) v1 = bisectCdf(cdf, a, b, 0.999);
  const pad = (v1 - v0) * 0.08;
  const span: [number, number] = [v0 - pad, v1 + pad];
  const half = (W - 3 * 44) / 2;
  const dens = (x: number) => (x < a || x > b ? 0 : F(x));
  const ys = Array.from({ length: 301 }, (_, i) => dens(span[0] + ((span[1] - span[0]) * i) / 300)).filter(Number.isFinite);
  const left = makeFrame("rv-pdf", 44, y + 18, half, 200, span, yRange([0, ...ys], [0]));
  const right = makeFrame("rv-ccdf", 88 + half, y + 18, half, 200, span, [0, 1.08]);
  let area = `M${r2(left.sx(Math.max(a, span[0])))} ${r2(left.sy(0))}`;
  for (let i = 0; i <= 300; i++) {
    const x = Math.max(a, span[0]) + ((Math.min(b, span[1]) - Math.max(a, span[0])) * i) / 300;
    area += `L${r2(left.sx(x))} ${r2(left.sy(dens(x)))}`;
  }
  area += `L${r2(left.sx(Math.min(b, span[1])))} ${r2(left.sy(0))}z`;
  const vline = (fr: Frame, x: number, color: string, text: string, dy: number) =>
    `<line x1="${r2(fr.sx(x))}" y1="${fr.top}" x2="${r2(fr.sx(x))}" y2="${fr.bottom}" stroke="${color}" stroke-width="2" stroke-dasharray="6 4"/>` + lbl(fr.sx(x) + 4, fr.top + dy, text, color, "start", 12, false);
  body.push(title(left, Cw.pdf), axes(left), `<path d="${area}" fill="${C.blue}" opacity="0.15" clip-path="url(#${left.id})"/>`, curve(left, dens, C.blue, 2.4));
  body.push(vline(left, mean, C.ink, `E = ${nt(mean, 3)}`, 14), vline(left, median, C.purple, `m = ${nt(median, 3)}`, 30));
  const cdfPts = Array.from({ length: 121 }, (_, i) => span[0] + ((span[1] - span[0]) * i) / 120).map((x) => `${r2(right.sx(x))},${r2(right.sy(cdf(x)))}`);
  body.push(title(right, Cw.cdf), axes(right), `<polyline clip-path="url(#${right.id})" points="${cdfPts.join(" ")}" fill="none" stroke="${C.purple}" stroke-width="2.4"/>`);
  body.push(`<line x1="${right.left}" y1="${r2(right.sy(0.5))}" x2="${r2(right.sx(median))}" y2="${r2(right.sy(0.5))}" stroke="${C.purple}" stroke-dasharray="4 3"/>`, dot(right.sx(median), right.sy(0.5), C.purple, 4.5));
  y += 18 + 200 + 26;
  const caps: Caption[] = [{ text: fill(Cw.summary, { m: nt(mean, 4), s: nt(sd, 4) }), color: "#495057" }];
  if (Math.abs(mean - median) > 0.02 * Math.max(sd, 1e-9)) caps.push({ text: fill(Cw.skew, { m: nt(mean, 3), d: nt(median, 3) }), color: C.purple });
  return compose(`f(x) = ${tex(f)}, \\quad ${A} \\le x \\le ${B}`, body.join(""), y, caps);
}
/** Where the cdf reaches p. */
function bisectCdf(cdf: (x: number) => number, a: number, b: number, p: number): number {
  let [lo, hi] = [a, b];
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (cdf(mid) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// ---------- the rules for aX + b ----------

function renderRules(s: RvSpec, w: RvWords): RenderedSvg {
  const Rw = w.rules;
  const t = readTable(s.src, w);
  const A = readOne(s.src[2] ?? "", w);
  const B = readOne(s.src[3] ?? "", w);
  const m = momentsOf(t.xq, t.xv, t.pq, t.pv);
  const yq = t.xq.map((x) => qAdd(qMul(A.q, x), B.q));
  const yv = t.xv.map((x) => A.v * x + B.v);
  const my = momentsOf(yq, yv, t.pq, t.pv);
  const ruleMeanQ = qAdd(qMul(A.q, m.meanQ), B.q);
  const ruleVarQ = qMul(qMul(A.q, A.q), m.varQ);
  const a = show(A.q, A.v);
  // aX + b as it is written: X for a = 1, −X for a = −1, and no "+ 0".
  const bPart = B.v === 0 ? "" : ` ${B.v < 0 ? "-" : "+"} ${show(B.q && B.q.abs(), Math.abs(B.v))}`;
  const aX = (x: string) => `${a === "1" ? "" : a === "-1" ? "-" : a}${x}`;
  const rows: TexLine[] = [
    { tex: `Y = ${aX("X")}${bPart}: \\quad ${terms(t.xv.map((x, i) => `${showP(t.xq[i], x)} \\mapsto ${show(yq[i], yv[i])}`)).replace(/ \+ /g, ",\\; ")}`, op: Rw.y },
    ...momentRows(t, m, w.discrete).filter((_, i) => i !== 3),
    { tex: `E[Y] = \\sum y\\,P(Y = y) = ${show(my.meanQ, my.mean)}`, op: Rw.meanDirect },
    { tex: `E[Y] = ${aX("\\,E[X]")}${bPart} = ${showP(A.q, A.v)} \\cdot ${showP(m.meanQ, m.mean)}${bPart} = ${show(ruleMeanQ, A.v * m.mean + B.v)}`, op: Rw.meanRule, color: C.blue },
    { tex: `\\mathrm{Var}(Y) = ${showP(A.q, A.v)}^{2}\\,\\mathrm{Var}(X) = ${show(qMul(A.q, A.q), A.v * A.v)} \\cdot ${showP(m.varQ, m.variance)} = ${show(ruleVarQ, A.v * A.v * m.variance)}`, op: Rw.variance, color: C.orange },
    { tex: `\\sigma_Y = \\left|${a}\\right|\\,\\sigma_X \\approx ${n(Math.abs(A.v) * Math.sqrt(m.variance))}`, op: Rw.sd },
  ];
  const body: string[] = [];
  let y = 4;
  const ln = texLines(rows, y);
  body.push(ln.svg);
  y += ln.h + 14;
  // X above and Y below, on one scale, the means joined by an arrow.
  const span = spanOf([...t.xv, ...yv]);
  const top = Math.max(...t.pv) * 1.25;
  const fx = makeFrame("rv-x", 48, y + 18, W - 48 - 24, 130, span, [0, top]);
  const fy = makeFrame("rv-y", 48, y + 18 + 130 + 40, W - 48 - 24, 130, span, [0, top]);
  const sx = Math.sqrt(m.variance);
  body.push(title(fx, "X"), axes(fx, { xAtBottom: true, yAxis: false }), bars(fx, t.xv, t.pv, m.mean, sx, C.blue, false));
  body.push(title(fy, "Y"), axes(fy, { xAtBottom: true, yAxis: false }), bars(fy, [...yv].sort((p, q) => p - q), sortedBy(yv, t.pv), my.mean, Math.sqrt(my.variance), C.orange, false));
  body.push(`<line x1="${r2(fx.sx(m.mean))}" y1="${fx.bottom}" x2="${r2(fy.sx(my.mean))}" y2="${fy.top}" stroke="${C.ink}" stroke-width="1.6" stroke-dasharray="3 3"/>`);
  y += 18 + 130 + 40 + 130 + 26;
  return compose(`Y = ${aX("X")}${bPart}`, body.join(""), y, [{ text: Rw.summary, color: "#495057" }]);
}
/** The probabilities in the order their values sort to (a negative a turns the table round). */
const sortedBy = (vs: number[], ps: number[]) => vs.map((v, i) => [v, ps[i]] as const).sort((p, q) => p[0] - q[0]).map(([, p]) => p);

// ---------- a joint table ----------
// The rows of the table are separated by |, since / is a fraction's.

/** A joint table read and worked out: the margins, the means, E[XY], the covariance and correlation, the first cell that
 * is not the product of its margins (null when X and Y are independent) and the conditional row given X = x₀. */
export function jointOf(src: string[], w: RvWords) {
  const s = { src };
  const xs = readList(s.src[0] ?? "", w);
  const ys = readList(s.src[1] ?? "", w);
  if (new Set(xs.v).size !== xs.v.length || new Set(ys.v).size !== ys.v.length) throw new Error(w.repeated);
  const rowsSrc = (s.src[2] ?? "").split("|").map((r) => r.trim()).filter(Boolean);
  if (rowsSrc.length !== xs.v.length) throw new Error(fill(w.tableShape, { r: xs.v.length, c: ys.v.length }));
  const P = rowsSrc.map((r) => readList(r, w));
  if (P.some((r) => r.v.length !== ys.v.length)) throw new Error(fill(w.tableShape, { r: xs.v.length, c: ys.v.length }));
  checkProbs(P.flatMap((r) => r.q), P.flatMap((r) => r.v), w);
  const given = readOne(s.src[3] ?? "", w);
  const gi = xs.v.findIndex((x) => Math.abs(x - given.v) < 1e-12);
  if (gi < 0) throw new Error(w.givenNotX);
  const zero = () => new Frac(0);
  const pxQ = P.map((r) => r.q.reduce<Q>((a, b) => qAdd(a, b), zero()));
  const pxV = P.map((r) => r.v.reduce((a, b) => a + b, 0));
  const pyQ = ys.v.map((_, j) => P.reduce<Q>((a, r) => qAdd(a, r.q[j]), zero()));
  const pyV = ys.v.map((_, j) => P.reduce((a, r) => a + r.v[j], 0));
  if (pxV[gi] <= 0) throw new Error(w.givenZero);
  const mx = momentsOf(xs.q, xs.v, pxQ, pxV);
  const myM = momentsOf(ys.q, ys.v, pyQ, pyV);
  let [exyQ, exy]: [Q, number] = [zero(), 0];
  P.forEach((r, i) => r.v.forEach((p, j) => {
    exy += xs.v[i] * ys.v[j] * p;
    exyQ = qAdd(exyQ, qMul(qMul(xs.q[i], ys.q[j]), r.q[j]));
  }));
  const cov = clean(exy - mx.mean * myM.mean);
  const covQ = qSub(exyQ, qMul(mx.meanQ, myM.meanQ));
  const corr = mx.variance > 0 && myM.variance > 0 ? cov / Math.sqrt(mx.variance * myM.variance) : NaN;
  // Independence, cell by cell: the first cell that is not the product of its margins.
  let bad: [number, number] | null = null;
  for (let i = 0; i < P.length && !bad; i++) for (let j = 0; j < ys.v.length && !bad; j++) if (Math.abs(P[i].v[j] - pxV[i] * pyV[j]) > 1e-12) bad = [i, j];
  const cond = P[gi].v.map((p) => p / pxV[gi]);
  const condQ = P[gi].q.map((p) => (p && pxQ[gi] && !pxQ[gi]!.isZero() ? keep(p.div(pxQ[gi]!)) : null));
  return { xs, ys, P, gi, zero, pxQ, pxV, pyQ, pyV, mx, myM, exyQ, exy, cov, covQ, corr, bad: bad as [number, number] | null, cond, condQ };
}

function renderJoint(s: RvSpec, w: RvWords): RenderedSvg {
  const Jw = w.joint;
  const { xs, ys, P, gi, zero, pxQ, pxV, pyQ, pyV, mx, myM, exyQ, exy, cov, covQ, corr, bad, cond, condQ } = jointOf(s.src, w);
  const X = (i: number) => show(xs.q[i], xs.v[i]);
  const Y = (j: number) => show(ys.q[j], ys.v[j]);
  const total = P.flatMap((r) => r.q).reduce<Q>((a, b) => qAdd(a, b), zero());
  const rows: TexLine[] = [
    { tex: `\\sum_{x,\\,y} P(X = x, Y = y) = ${show(total, 1)}`, op: Jw.sum },
    { tex: `P(X = x) = ${xs.v.map((_, i) => `${show(pxQ[i], pxV[i])}`).join(",\\; ")} \\quad (x = ${xs.v.map((_, i) => X(i)).join(", ")})`, op: Jw.margX },
    { tex: `P(Y = y) = ${ys.v.map((_, j) => `${show(pyQ[j], pyV[j])}`).join(",\\; ")} \\quad (y = ${ys.v.map((_, j) => Y(j)).join(", ")})`, op: Jw.margY },
    { tex: `P(Y = y \\mid X = ${X(gi)}) = \\frac{P(X = ${X(gi)},\\, Y = y)}{P(X = ${X(gi)})} = ${cond.map((c, j) => show(condQ[j], c)).join(",\\; ")}`, op: Jw.given, color: C.orange },
  ];
  if (bad) {
    const [i, j] = bad;
    rows.push({ tex: `P(X = ${X(i)}, Y = ${Y(j)}) = ${show(P[i].q[j], P[i].v[j])} \\ne ${show(pxQ[i], pxV[i])} \\cdot ${show(pyQ[j], pyV[j])} = P(X = ${X(i)})\\,P(Y = ${Y(j)})`, op: Jw.dependent, color: C.red });
  } else rows.push({ tex: `P(X = x, Y = y) = P(X = x)\\,P(Y = y) \\text{ in every cell}`, op: Jw.independent, color: C.green });
  rows.push(
    { tex: `E[X] = ${show(mx.meanQ, mx.mean)}, \\quad E[Y] = ${show(myM.meanQ, myM.mean)}, \\quad E[XY] = \\sum xy\\,P(x, y) = ${show(exyQ, exy)}`, op: Jw.means },
    { tex: `\\mathrm{Cov}(X, Y) = E[XY] - E[X]\\,E[Y] = ${show(exyQ, exy)} - ${showP(mx.meanQ, mx.mean)} \\cdot ${showP(myM.meanQ, myM.mean)} = ${show(covQ, cov)}`, op: Jw.cov, color: C.blue },
    { tex: `\\rho = \\frac{\\mathrm{Cov}(X, Y)}{\\sigma_X\\,\\sigma_Y} ${Number.isFinite(corr) ? `\\approx ${n(corr)}` : "\\text{ — }"}`, op: Jw.corr },
    { tex: `E[X + Y] = E[X] + E[Y] = ${show(qAdd(mx.meanQ, myM.meanQ), mx.mean + myM.mean)}`, op: Jw.sum2 },
    { tex: `\\mathrm{Var}(X + Y) = \\mathrm{Var}(X) + \\mathrm{Var}(Y) + 2\\,\\mathrm{Cov}(X, Y)`, op: Jw.varSum },
    { tex: `\\mathrm{Var}(X + Y) = ${showP(mx.varQ, mx.variance)} + ${showP(myM.varQ, myM.variance)} + 2 \\cdot ${showP(covQ, cov)} = ${show(qAdd(qAdd(mx.varQ, myM.varQ), qMul(new Frac(2), covQ)), mx.variance + myM.variance + 2 * cov)}`, op: "", color: C.purple },
  );
  const body: string[] = [];
  let y = 4;
  const ln = texLines(rows, y);
  body.push(ln.svg);
  y += ln.h + 14;
  const tbl = jointTable(y + 6, xs.v.map((_, i) => X(i)), ys.v.map((_, j) => Y(j)), P.map((r) => r.v), P.map((r) => r.q), pxV, pyV, gi);
  body.push(tbl.svg);
  // Beside it: Y given X = x₀ against Y on its own, a pair of bars per value of y; the same bars when independent.
  const k = ys.v.length;
  const fr = makeFrame("rv-cond", tbl.w + 70, y + 26, W - tbl.w - 70 - 24, 170, [0.4, k + 0.6], [0, Math.max(...cond, ...pyV) * 1.2]);
  const bw = Math.min(16, ((fr.right - fr.left) / k) * 0.3);
  let b = axes(fr, { xAtBottom: true, xTicks: ys.v.map((_, j) => ({ v: j + 1, label: plain(Y(j)) })) }) + title(fr, fill(Jw.barsGiven, { x: nt(xs.v[gi], 3) }));
  ys.v.forEach((_, j) => {
    const px = fr.sx(j + 1);
    b += `<rect x="${r2(px - bw - 1)}" y="${r2(fr.sy(pyV[j]))}" width="${r2(bw)}" height="${r2(fr.sy(0) - fr.sy(pyV[j]))}" fill="${C.grey}"/>`;
    b += `<rect x="${r2(px + 1)}" y="${r2(fr.sy(cond[j]))}" width="${r2(bw)}" height="${r2(fr.sy(0) - fr.sy(cond[j]))}" fill="${C.orange}"/>`;
  });
  b += legendRow(fr.left, fr.bottom + 32, [{ text: fill(Jw.barsGiven, { x: nt(xs.v[gi], 3) }), color: C.orange }, { text: Jw.barsY, color: C.grey }]);
  body.push(b);
  y += Math.max(tbl.h + 12, 26 + 170 + 40);
  return compose(`P(X = x, Y = y)`, body.join(""), y, [{ text: bad ? Jw.summaryDependent : Jw.summaryIndependent, color: "#495057" }]);
}

/** The joint table: a cell per (x, y) tinted by its probability, the margins along the right and the bottom, the given
 * row outlined. */
function jointTable(top: number, xs: string[], ys: string[], P: number[][], Pq: Q[][], px: number[], py: number[], gi: number): { svg: string; h: number; w: number } {
  const cw = Math.min(64, 300 / (ys.length + 2));
  const ch = 30;
  const left = 30;
  const big = Math.max(...P.flat(), 1e-12);
  let s = `<text x="${left + cw / 2}" y="${top + ch / 2 + 5}" ${FONT} font-size="12" font-weight="700" fill="#495057" text-anchor="middle">x ╲ y</text>`;
  ys.forEach((y, j) => (s += `<text x="${r2(left + cw * (j + 1.5))}" y="${top + ch / 2 + 5}" ${FONT} font-size="12.5" font-weight="700" fill="${C.ink}" text-anchor="middle">${esc(plain(y))}</text>`));
  s += `<text x="${r2(left + cw * (ys.length + 1.5))}" y="${top + ch / 2 + 5}" ${FONT} font-size="12" font-weight="700" fill="#495057" text-anchor="middle">P(x)</text>`;
  xs.forEach((x, i) => {
    const yy = top + ch * (i + 1);
    s += `<text x="${left + cw / 2}" y="${yy + ch / 2 + 5}" ${FONT} font-size="12.5" font-weight="700" fill="${C.ink}" text-anchor="middle">${esc(plain(x))}</text>`;
    P[i].forEach((p, j) => {
      const xx = left + cw * (j + 1);
      s += `<rect x="${r2(xx)}" y="${yy}" width="${r2(cw)}" height="${ch}" fill="${C.blue}" fill-opacity="${r2(0.08 + 0.5 * (p / big))}" stroke="#fff" stroke-width="2"/>`;
      s += `<text x="${r2(xx + cw / 2)}" y="${yy + ch / 2 + 5}" ${FONT} font-size="12" fill="${C.ink}" text-anchor="middle">${esc(cellText(Pq[i][j], p))}</text>`;
    });
    s += `<text x="${r2(left + cw * (ys.length + 1.5))}" y="${yy + ch / 2 + 5}" ${FONT} font-size="12" font-weight="700" fill="#495057" text-anchor="middle">${esc(nt(px[i], 3))}</text>`;
  });
  const by = top + ch * (xs.length + 1);
  s += `<text x="${left + cw / 2}" y="${by + ch / 2 + 5}" ${FONT} font-size="12" font-weight="700" fill="#495057" text-anchor="middle">P(y)</text>`;
  py.forEach((p, j) => (s += `<text x="${r2(left + cw * (j + 1.5))}" y="${by + ch / 2 + 5}" ${FONT} font-size="12" font-weight="700" fill="#495057" text-anchor="middle">${esc(nt(p, 3))}</text>`));
  s += `<rect x="${r2(left + cw)}" y="${top + ch * (gi + 1)}" width="${r2(cw * ys.length)}" height="${ch}" fill="none" stroke="${C.orange}" stroke-width="2.6" rx="3"/>`;
  return { svg: s, h: ch * (xs.length + 2), w: left + cw * (ys.length + 2) };
}
/** A table cell: a fraction such as 3/8 when exact and short, else up to three decimals. */
const cellText = (q: Q, v: number) => (q && q.d <= 100 && !q.isInt() && q.d !== 10 && q.d !== 100 ? `${q.n}/${q.d}`.replace("-", "−") : nt(v, 3));
/** A LaTeX number as plain text for the table: \frac{a}{b} → a/b. */
const plain = (t: string) => t.replace(/\\frac\{(-?\d+)\}\{(\d+)\}/g, "$1/$2").replace(/^-/, "−").replace(/\\pi/g, "π");

function legendRow(x: number, y: number, items: { text: string; color: string }[]): string {
  let s = "";
  let at = x;
  for (const it of items) {
    s += `<rect x="${r2(at)}" y="${r2(y - 9)}" width="14" height="6" fill="${it.color}"/><text x="${r2(at + 19)}" y="${r2(y - 3)}" ${FONT} font-size="11.5" fill="#495057">${esc(it.text)}</text>`;
    at += 19 + it.text.length * 6.2 + 16;
  }
  return s;
}

// ---------- the covariance matrix ----------

/** Points typed as x, y pairs separated by semicolons: 1, 2; 2, 3.5; … */
export function readPoints(s: string, w: RvWords): [number, number][] {
  const pts = s.split(";").map((p) => p.trim()).filter(Boolean).map((p) => {
    const r = readList(p.replace(/^\(|\)$/g, ""), w);
    if (r.v.length !== 2) throw new Error(w.fewPoints);
    return [r.v[0], r.v[1]] as [number, number];
  });
  if (pts.length < 2) throw new Error(w.fewPoints);
  return pts;
}

/** The means, the covariance matrix (divided by n) and the correlation of points. */
export function covariance(pts: [number, number][]) {
  const k = pts.length;
  const [mx, my] = [pts.reduce((a, p) => a + p[0], 0) / k, pts.reduce((a, p) => a + p[1], 0) / k];
  let [sxx, syy, sxy] = [0, 0, 0];
  for (const [x, y] of pts) {
    sxx += (x - mx) ** 2;
    syy += (y - my) ** 2;
    sxy += (x - mx) * (y - my);
  }
  [sxx, syy, sxy] = [sxx / k, syy / k, sxy / k];
  return { mx, my, sxx, syy, sxy, corr: sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : NaN };
}

function renderCov(s: RvSpec, w: RvWords): RenderedSvg {
  const Vw = w.cov;
  const pts = readPoints(s.src[0] ?? "", w);
  const c = covariance(pts);
  const { l1, l2, angle } = eigenSym(c.sxx, c.sxy, c.syy);
  const pm = (a: string, b: string, cc: string, d: string) => `\\begin{pmatrix} ${a} & ${b} \\\\ ${cc} & ${d} \\end{pmatrix}`;
  const rows: TexLine[] = [
    { tex: `\\bar x = ${n(c.mx)}, \\quad \\bar y = ${n(c.my)} \\quad (n = ${pts.length})`, op: Vw.means },
    { tex: `s_{xx} = \\tfrac1n \\sum (x - \\bar x)^2 = ${n(c.sxx)}, \\quad s_{yy} = \\tfrac1n \\sum (y - \\bar y)^2 = ${n(c.syy)}`, op: Vw.entries },
    { tex: `s_{xy} = \\tfrac1n \\sum (x - \\bar x)(y - \\bar y) = ${n(c.sxy)}`, op: Vw.together },
    { tex: `\\Sigma = ${pm("s_{xx}", "s_{xy}", "s_{xy}", "s_{yy}")} = ${pm(n(c.sxx), n(c.sxy), n(c.sxy), n(c.syy))}`, op: Vw.matrix, color: C.blue },
    { tex: `\\rho = \\frac{s_{xy}}{\\sqrt{s_{xx}\\,s_{yy}}} ${Number.isFinite(c.corr) ? `\\approx ${n(c.corr)}` : "\\text{ — }"}`, op: Vw.corr },
    { tex: `\\lambda_1 = ${n(l1)}, \\quad \\lambda_2 = ${n(l2)}`, op: Vw.eigen, color: C.red },
    { tex: `\\frac{\\lambda_1}{\\lambda_1 + \\lambda_2} \\approx ${n(l1 / (l1 + l2 || 1))}`, op: Vw.share },
  ];
  const body: string[] = [];
  let y = 4;
  const ln = texLines(rows, y);
  body.push(ln.svg);
  y += ln.h + 14;
  // Equal units both ways around the points, so the ellipses keep their shape.
  const [x0, x1] = [Math.min(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[0]))];
  const [y0, y1] = [Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[1]))];
  const half = Math.max(x1 - x0, y1 - y0, 2 * Math.sqrt(Math.max(l1, 1e-9)) * 2.2) / 2 + 0.6;
  const size = 360;
  const fr = makeFrame("rv-cov", (W - size) / 2, y, size, size, [c.mx - half, c.mx + half], [c.my - half, c.my + half]);
  const [u, v] = [[Math.cos(angle), Math.sin(angle)], [-Math.sin(angle), Math.cos(angle)]];
  const ellipse = (k: number, dash: string) => {
    const ps: string[] = [];
    for (let i = 0; i <= 120; i++) {
      const t = (2 * Math.PI * i) / 120;
      const [a, b] = [k * Math.sqrt(Math.max(l1, 0)) * Math.cos(t), k * Math.sqrt(Math.max(l2, 0)) * Math.sin(t)];
      ps.push(`${r2(fr.sx(c.mx + a * u[0] + b * v[0]))},${r2(fr.sy(c.my + a * u[1] + b * v[1]))}`);
    }
    return `<polyline clip-path="url(#${fr.id})" points="${ps.join(" ")}" fill="none" stroke="${C.blue}" stroke-width="1.8" ${dash}/>`;
  };
  const axis = (dir: number[], len: number, color: string, name: string) =>
    `<line x1="${r2(fr.sx(c.mx - len * dir[0]))}" y1="${r2(fr.sy(c.my - len * dir[1]))}" x2="${r2(fr.sx(c.mx + len * dir[0]))}" y2="${r2(fr.sy(c.my + len * dir[1]))}" stroke="${color}" stroke-width="2.6"/>` +
    lbl(fr.sx(c.mx + len * dir[0]) + 4, fr.sy(c.my + len * dir[1]) - 6, name, color, "start", 12.5);
  body.push(axes(fr), ellipse(1, ""), ellipse(2, `stroke-dasharray="6 4"`));
  body.push(axis(u, 2 * Math.sqrt(Math.max(l1, 0)), C.red, Vw.pc1), axis(v, 2 * Math.sqrt(Math.max(l2, 0)), C.green, "PC2"));
  for (const [px, py] of pts) body.push(dot(fr.sx(px), fr.sy(py), C.ink, 4));
  body.push(`<path d="M${r2(fr.sx(c.mx) - 6)},${r2(fr.sy(c.my) - 6)}l12,12m0,-12l-12,12" stroke="${C.green}" stroke-width="2.4"/>`);
  body.push(legendRow(fr.left, fr.bottom + 24, [{ text: Vw.ellipses, color: C.blue }, { text: Vw.pc1, color: C.red }]));
  y = fr.bottom + 34;
  return compose(`\\Sigma \\text{ of } ${pts.length} \\text{ points}`, body.join(""), y, [{ text: fill(Vw.summary, { p: nt(Math.round((1000 * l1) / (l1 + l2 || 1)) / 10, 3) }), color: "#495057" }]);
}

// ---------- entry ----------

export function renderRandvar(spec: RvSpec, w: RvWords): RenderedSvg {
  exprMessages(w);
  switch (spec.topic) {
    case "discrete":
      return renderDiscrete(spec, w);
    case "continuous":
      return renderContinuous(spec, w);
    case "rules":
      return renderRules(spec, w);
    case "joint":
      return renderJoint(spec, w);
    case "cov":
      return renderCov(spec, w);
  }
}

const P_ = (topic: RvTopic, ...src: string[]): RvSpec => ({ topic, src });
export const RV_PRESETS: { [K in RvTopic]: { label: string; spec: RvSpec }[] } = {
  discrete: [
    { label: "a fair die", spec: P_("discrete", "1, 2, 3, 4, 5, 6", "1/6, 1/6, 1/6, 1/6, 1/6, 1/6") },
    { label: "heads in 3 coins", spec: P_("discrete", "0, 1, 2, 3", "1/8, 3/8, 3/8, 1/8") },
    { label: "a bet on red", spec: P_("discrete", "1, -1", "18/37, 19/37") },
    { label: "a lottery ticket", spec: P_("discrete", "-2, 8, 98", "0.89, 0.1, 0.01") },
    { label: "the sum of two dice", spec: P_("discrete", "2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12", "1/36, 2/36, 3/36, 4/36, 5/36, 6/36, 5/36, 4/36, 3/36, 2/36, 1/36") },
    { label: "a skewed one", spec: P_("discrete", "0, 1, 2, 10", "0.5, 0.3, 0.15, 0.05") },
  ],
  continuous: [
    { label: "uniform on [0, 2]", spec: P_("continuous", "1/2", "0", "2") },
    { label: "2x on [0, 1]", spec: P_("continuous", "2x", "0", "1") },
    { label: "3x² on [0, 1]", spec: P_("continuous", "3x^2", "0", "1") },
    { label: "e^(−x) on [0, ∞)", spec: P_("continuous", "e^(-x)", "0", "inf") },
    { label: "the normal bell", spec: P_("continuous", "e^(-x^2/2)/sqrt(2pi)", "-inf", "inf") },
    { label: "6x(1 − x) on [0, 1]", spec: P_("continuous", "6x(1 - x)", "0", "1") },
  ],
  rules: [
    { label: "a die, 2X + 1", spec: P_("rules", "1, 2, 3, 4, 5, 6", "1/6, 1/6, 1/6, 1/6, 1/6, 1/6", "2", "1") },
    { label: "a skewed one, −X + 3", spec: P_("rules", "0, 1, 2, 10", "0.5, 0.3, 0.15, 0.05", "-1", "3") },
    { label: "°C to °F", spec: P_("rules", "10, 20, 30", "0.25, 0.5, 0.25", "9/5", "32") },
    { label: "points to a score, 10X − 5", spec: P_("rules", "0, 1", "0.3, 0.7", "10", "-5") },
  ],
  joint: [
    { label: "dependent: rain and umbrella", spec: P_("joint", "0, 1", "0, 1", "0.5 0.1 | 0.05 0.35", "1") },
    { label: "independent: two coins", spec: P_("joint", "0, 1", "0, 1", "1/4 1/4 | 1/4 1/4", "0") },
    { label: "a 2 × 3 table", spec: P_("joint", "0, 1", "0, 1, 2", "0.1 0.2 0.1 | 0.2 0.3 0.1", "1") },
    { label: "negative covariance", spec: P_("joint", "0, 1, 2", "0, 1, 2", "0 0.1 0.2 | 0.1 0.2 0.1 | 0.2 0.1 0", "2") },
    { label: "uncorrelated, not independent", spec: P_("joint", "-1, 0, 1", "0, 1", "0 1/3 | 1/3 0 | 0 1/3", "0") },
  ],
  cov: [
    { label: "a rising cloud", spec: P_("cov", "1, 2; 2, 2.5; 3, 4; 4, 4.2; 5, 5.5; 6, 6.1") },
    { label: "a falling cloud", spec: P_("cov", "1, 6; 2, 5.2; 3, 4.6; 4, 3; 5, 2.2; 6, 1.5") },
    { label: "no trend", spec: P_("cov", "1, 3; 2, 1; 3, 4; 4, 2; 5, 3.5; 6, 1.5; 3.5, 2.6") },
    { label: "the PCA lab's cloud", spec: P_("cov", "-2.97, -1.25; -1.87, -1.77; -1.66, -0.73; -1.3, 0.06; -0.27, -0.73; -0.05, 0.09; 0.13, 0.77; 1.07, 0.15; 1.24, 1.06; 2.26, 0.49; 2.09, 1.78; 2.96, 1.48") },
  ],
};
