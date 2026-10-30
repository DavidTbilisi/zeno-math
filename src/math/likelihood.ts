// Maximum likelihood, one step at a time: the parameters that make the data most likely. A coin's p from its flips (the
// likelihood p^k(1 − p)^(n − k), its log, the slope set to 0, p̂ = k/n), a normal's μ and σ from a sample (μ̂ the mean,
// σ̂² dividing by n), a Poisson rate from counts (λ̂ the mean count), and where the losses come from: least squares is
// the likelihood of a line under normal noise, and log loss is minus the log-likelihood of 0/1 labels.
import { axes, C, compose, curve, dot, esc, fill, FONT, lbl, makeFrame, nt, r2, texLines, tn, W, yRange, type AxesOptions, type Frame, type TexLine } from "./chart";
import { evalE, exprMessages, has, parseE, simp } from "./expr";
import type { RenderedSvg } from "./latex";
import { niceStep } from "./scale";

export type LkTopic = "bernoulli" | "normal" | "poisson" | "squares" | "logloss";
export const LK_TOPICS: LkTopic[] = ["bernoulli", "normal", "poisson", "squares", "logloss"];
/** What a picture is made from, one typed line per field of the topic (see `LK_FIELDS`). */
export type LkSpec = { topic: LkTopic; src: string[] };
/** The fields each topic asks for, by their names in the words. */
export const LK_FIELDS: Record<LkTopic, ("flips" | "data" | "counts" | "points" | "labels" | "probs")[]> = {
  bernoulli: ["flips"],
  normal: ["data"],
  poisson: ["counts"],
  squares: ["points"],
  logloss: ["labels", "probs"],
};

export type LkWords = {
  bad: string;
  tooBig: string;
  onlyX: string;
  needNumbers: string;
  tooMany: string;
  zeroOne: string;
  fewValues: string;
  sameValues: string;
  counts: string;
  fewPoints: string;
  sameX: string;
  sameCount: string;
  openProb: string;
  bernoulli: { one: string; product: string; log: string; slope: string; edge: string; estimate: string; top: string; curveL: string; curveLog: string; summary: string };
  normal: { one: string; log: string; slopeMu: string; mu: string; slopeSigma: string; sigma: string; unbiased: string; curve: string; bell: string; summary: string };
  poisson: { one: string; log: string; slope: string; edge: string; estimate: string; top: string; curve: string; bars: string; seen: string; expected: string; summary: string };
  squares: { model: string; log: string; same: string; fit: string; mse: string; line: string; curve: string; summary: string };
  logloss: { one: string; product: string; log: string; loss: string; bars: string; curves: string; label1: string; label0: string; summary: string };
};

const MAX = 200;

// ---------- reading ----------

/** Numbers separated by commas, semicolons or spaces: 1, 0.5, 3/4. */
export function readNums(s: string, w: LkWords): number[] {
  const parts = s.split(/[,;\s]+/).map((p) => p.trim()).filter(Boolean);
  if (!parts.length) throw new Error(w.needNumbers);
  if (parts.length > MAX) throw new Error(fill(w.tooMany, { n: MAX }));
  return parts.map((p) => {
    let v: number;
    try {
      const e = simp(parseE(p));
      if (has(e)) throw new Error();
      v = evalE(e, 0);
    } catch {
      throw new Error(fill(w.bad, { s: p }));
    }
    if (!Number.isFinite(v)) throw new Error(fill(w.bad, { s: p }));
    return v;
  });
}
/** Points as x, y pairs separated by semicolons. */
export function readPairs(s: string, w: LkWords): [number, number][] {
  const groups = s.split(";").map((g) => g.trim()).filter(Boolean);
  if (groups.length > MAX) throw new Error(fill(w.tooMany, { n: MAX }));
  const pts = groups.map((g) => {
    const v = readNums(g, w);
    if (v.length !== 2) throw new Error(w.fewPoints);
    return [v[0], v[1]] as [number, number];
  });
  if (pts.length < 2) throw new Error(w.fewPoints);
  return pts;
}
const zeroOnes = (s: string, w: LkWords) => {
  const v = readNums(s, w);
  if (v.some((x) => x !== 0 && x !== 1)) throw new Error(w.zeroOne);
  return v;
};

// ---------- the estimates ----------

/** a · ln q, with 0 · ln 0 = 0 (a term that is not there). */
const xlog = (a: number, q: number) => (a === 0 ? 0 : a * Math.log(q));
/** ln k! by adding logs (the counts are small). */
export const lnFact = (k: number) => {
  let s = 0;
  for (let i = 2; i <= k; i++) s += Math.log(i);
  return s;
};

/** A coin: the number of 1s, p̂ = k/n and the log-likelihood as a function of p. */
export function bernoulliFit(xs: number[]) {
  const n = xs.length;
  const k = xs.filter((x) => x === 1).length;
  const ll = (p: number) => xlog(k, p) + xlog(n - k, 1 - p);
  return { n, k, p: k / n, ll, top: ll(k / n) };
}
/** A normal sample: μ̂ the mean, σ̂² the mean squared distance from it (÷ n), s² the same ÷ (n − 1). */
export function normalFit(xs: number[]) {
  const n = xs.length;
  const mu = xs.reduce((a, b) => a + b, 0) / n;
  const ss = xs.reduce((a, x) => a + (x - mu) ** 2, 0);
  const v = ss / n;
  const ll = (m: number, s: number) => -n * Math.log(s) - (n / 2) * Math.log(2 * Math.PI) - xs.reduce((a, x) => a + (x - m) ** 2, 0) / (2 * s * s);
  return { n, mu, v, sd: Math.sqrt(v), s2: n > 1 ? ss / (n - 1) : NaN, ll, top: ll(mu, Math.sqrt(v)) };
}
/** Counts: λ̂ the mean count, and the log-likelihood as a function of λ. */
export function poissonFit(ks: number[]) {
  const n = ks.length;
  const S = ks.reduce((a, b) => a + b, 0);
  const c = ks.reduce((a, k) => a + lnFact(k), 0);
  const ll = (l: number) => xlog(S, l) - n * l - c;
  return { n, S, c, lambda: S / n, ll, top: ll(S / n) };
}
/** A line by least squares: the slope s_xy / s_xx, the intercept through the means, and the mean squared error. */
export function lineFit(pts: [number, number][]) {
  const n = pts.length;
  const [mx, my] = [pts.reduce((a, p) => a + p[0], 0) / n, pts.reduce((a, p) => a + p[1], 0) / n];
  let [sxx, sxy, syy] = [0, 0, 0];
  for (const [x, y] of pts) {
    sxx += (x - mx) ** 2 / n;
    sxy += ((x - mx) * (y - my)) / n;
    syy += (y - my) ** 2 / n;
  }
  const b = sxy / sxx;
  const a = my - b * mx;
  /** The mean squared error of the best line with slope `s` (its intercept through the means). */
  const mseAt = (s: number) => syy - 2 * s * sxy + s * s * sxx;
  return { n, mx, my, sxx, sxy, a, b, mse: mseAt(b), mseAt };
}
/** Labels and the chances a model gave to 1: each label's chance, −ℓ and the log loss −ℓ / n. */
export function logLoss(ys: number[], qs: number[]) {
  const ps = ys.map((y, i) => (y === 1 ? qs[i] : 1 - qs[i]));
  const nll = -ps.reduce((a, p) => a + Math.log(p), 0);
  return { ps, nll, loss: nll / ys.length };
}

// ---------- drawing ----------

const title = (fr: Frame, text: string) => `<text x="${r2((fr.left + fr.right) / 2)}" y="${fr.top - 8}" ${FONT} font-size="13" font-weight="700" fill="#495057" text-anchor="middle">${esc(text)}</text>`;
/** A dashed line up to the top of a curve, a dot on it and its name. */
function peak(fr: Frame, x: number, y: number, name: string, color = C.blue): string {
  const [px, py] = [fr.sx(x), Math.max(fr.top, Math.min(fr.bottom, fr.sy(y)))];
  const right = px < (fr.left + fr.right) / 2;
  return `<line x1="${r2(px)}" y1="${r2(py)}" x2="${r2(px)}" y2="${fr.bottom}" stroke="${color}" stroke-width="1.6" stroke-dasharray="5 4"/>` + dot(px, py, color, 4.5) + lbl(px + (right ? 6 : -6), Math.max(fr.top + 14, py - 8), name, color, right ? "start" : "end", 12.5, false);
}
function legendRow(x: number, y: number, items: { text: string; color: string; round?: boolean }[]): string {
  let s = "";
  let at = x;
  for (const it of items) {
    s += it.round ? dot(at + 7, y - 6, it.color, 4) : `<rect x="${r2(at)}" y="${r2(y - 9)}" width="14" height="6" fill="${it.color}"/>`;
    s += `<text x="${r2(at + 19)}" y="${r2(y - 3)}" ${FONT} font-size="11.5" fill="#495057">${esc(it.text)}</text>`;
    at += 19 + it.text.length * 6.2 + 16;
  }
  return s;
}
/** About five x ticks: a half-width frame has no room for the usual ten. */
function few(fr: Frame, integer = false): AxesOptions {
  const step = integer ? Math.max(1, Math.round(niceStep(fr.x1 - fr.x0, 5))) : niceStep(fr.x1 - fr.x0, 5);
  const xTicks: { v: number; label: string }[] = [];
  for (let x = Math.ceil(fr.x0 / step) * step; x <= fr.x1 + 1e-9; x += step) xTicks.push({ v: x, label: nt(Math.abs(x) < step / 1e6 ? 0 : x, 3) });
  return { xTicks, xAtBottom: true };
}
/** Two frames side by side under the rows. */
const HALF = (W - 3 * 44) / 2;
const PH = 190;
const pair = (y: number, id: string, left: { x: number[]; y: number[] }, right: { x: number[]; y: number[] }) => [
  makeFrame(`${id}-l`, 44, y + 18, HALF, PH, left.x, left.y),
  makeFrame(`${id}-r`, 88 + HALF, y + 18, HALF, PH, right.x, right.y),
];
/** The rows, then whatever is drawn under them; returns the picture's body and its height. */
function layout(rows: TexLine[], draw: (y: number) => { svg: string; h: number }) {
  const ln = texLines(rows, 4);
  const d = draw(4 + ln.h + 14);
  return { body: ln.svg + d.svg, h: 4 + ln.h + 14 + d.h };
}
/** A long product written out: the first two terms and the last when there are more than four. */
const terms = (ts: string[], op: string) => (ts.length <= 4 ? ts.join(op) : `${ts.slice(0, 2).join(op)} \\cdots ${ts[ts.length - 1]}`);
/** A number for LaTeX, a negative one in brackets. */
const tp = (v: number) => (v < 0 ? `\\left(${tn(v)}\\right)` : tn(v));
const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
/** A likelihood is often tiny: the power of ten to draw it in, so that its axis reads 0 to a few (1 when it is not). */
const unitOf = (top: number) => (top < 0.01 ? 10 ** Math.floor(Math.log10(top)) : 1);
const tenTo = (u: number) => `10${String(Math.round(Math.log10(u))).replace("-", "⁻").replace(/\d/g, (d) => SUP[Number(d)])}`;
/** A number for a caption, a tiny one as 2.4 · 10⁻¹⁵. */
const sci = (v: number) => {
  if (v === 0 || v >= 0.001) return nt(v, 3);
  const u = unitOf(v);
  return `${nt(v / u, 2)} · ${tenTo(u)}`;
};

// ---------- a coin ----------

function renderBernoulli(s: LkSpec, w: LkWords): RenderedSvg {
  const B = w.bernoulli;
  const f = bernoulliFit(zeroOnes(s.src[0] ?? "", w));
  const { n, k, p } = f;
  const L = Math.exp(f.top);
  const rows: TexLine[] = [
    { tex: `P(x \\mid p) = p^{x}(1-p)^{1-x}, \\quad x \\in \\{0, 1\\}`, op: B.one },
    { tex: `L(p) = \\prod_{i=1}^{${n}} p^{x_i}(1-p)^{1-x_i} = p^{${k}}(1-p)^{${n - k}}`, op: B.product },
    { tex: `\\ell(p) = \\ln L(p) = ${k}\\ln p + ${n - k}\\ln(1-p)`, op: B.log, color: C.purple },
    k > 0 && k < n
      ? { tex: `\\ell'(p) = \\frac{${k}}{p} - \\frac{${n - k}}{1-p} = 0 \\quad\\Rightarrow\\quad ${k}(1-p) = ${n - k}\\,p`, op: B.slope }
      : { tex: k === n ? `\\ell'(p) = \\frac{${n}}{p} > 0` : `\\ell'(p) = -\\frac{${n}}{1-p} < 0`, op: B.edge },
    { tex: `\\hat p = \\frac{k}{n} = \\frac{${k}}{${n}} = ${tn(p)}`, op: B.estimate, color: C.blue },
    { tex: `L(\\hat p) = ${tn(L)}, \\quad \\ell(\\hat p) = ${tn(f.top)}`, op: B.top },
  ];
  const lik = (q: number) => Math.exp(f.ll(q));
  const logs = Array.from({ length: 191 }, (_, i) => f.ll(0.025 + (0.95 * i) / 190));
  const { body, h } = layout(rows, (y) => {
    const u = unitOf(L);
    const [left, right] = pair(y, "lk-b", { x: [0, 1], y: [0, (L / u) * 1.18] }, { x: [0, 1], y: yRange(logs, [f.top + 0.5]) });
    const svg =
      title(left, u === 1 ? B.curveL : `${B.curveL}, × ${tenTo(u)}`) + axes(left, few(left)) + curve(left, (q) => lik(q) / u, C.blue, 2.4) + peak(left, p, L / u, `p̂ = ${nt(p, 3)}`) +
      title(right, B.curveLog) + axes(right, few(right)) + curve(right, f.ll, C.purple, 2.4, "", 1e-4, 1 - 1e-4) + peak(right, p, f.top, `p̂ = ${nt(p, 3)}`, C.purple);
    return { svg, h: 18 + PH + 26 };
  });
  return compose(`k = ${k}, \\quad n = ${n}, \\quad \\hat p = ${tn(p)}`, body, h, [{ text: fill(B.summary, { n, L: sci(L), l: nt(f.top, 4), p: nt(p, 4) }), color: "#495057" }]);
}

// ---------- a normal sample ----------

function renderNormal(s: LkSpec, w: LkWords): RenderedSvg {
  const N = w.normal;
  const xs = readNums(s.src[0] ?? "", w);
  if (xs.length < 2) throw new Error(w.fewValues);
  const f = normalFit(xs);
  if (!(f.v > 1e-12)) throw new Error(w.sameValues);
  const sum = xs.reduce((a, b) => a + b, 0);
  const rows: TexLine[] = [
    { tex: `f(x \\mid \\mu, \\sigma) = \\frac{1}{\\sigma\\sqrt{2\\pi}}\\, e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}`, op: N.one },
    { tex: `\\ell(\\mu, \\sigma) = \\sum \\ln f(x_i) = -n\\ln\\sigma - \\tfrac{n}{2}\\ln 2\\pi - \\frac{1}{2\\sigma^2}\\sum (x_i - \\mu)^2`, op: N.log, color: C.purple },
    { tex: `\\frac{\\partial \\ell}{\\partial \\mu} = \\frac{1}{\\sigma^2}\\sum (x_i - \\mu) = 0`, op: N.slopeMu },
    { tex: `\\hat\\mu = \\bar x = \\frac{${tn(sum)}}{${f.n}} = ${tn(f.mu)}`, op: N.mu, color: C.blue },
    { tex: `\\frac{\\partial \\ell}{\\partial \\sigma} = -\\frac{n}{\\sigma} + \\frac{1}{\\sigma^3}\\sum (x_i - \\mu)^2 = 0`, op: N.slopeSigma },
    { tex: `\\hat\\sigma^2 = \\tfrac{1}{n}\\sum (x_i - \\bar x)^2 = ${tn(f.v)}, \\quad \\hat\\sigma = ${tn(f.sd)}`, op: N.sigma, color: C.orange },
    { tex: `s^2 = \\tfrac{1}{n-1}\\sum (x_i - \\bar x)^2 = ${tn(f.s2)}`, op: N.unbiased },
  ];
  const [lo, hi] = [Math.min(...xs), Math.max(...xs)];
  const span: [number, number] = [Math.min(lo, f.mu - 3 * f.sd) - f.sd * 0.3, Math.max(hi, f.mu + 3 * f.sd) + f.sd * 0.3];
  const llMu = (m: number) => f.ll(m, f.sd);
  const lls = Array.from({ length: 121 }, (_, i) => llMu(span[0] + ((span[1] - span[0]) * i) / 120));
  const bell = (x: number) => Math.exp(-((x - f.mu) ** 2) / (2 * f.v)) / (f.sd * Math.sqrt(2 * Math.PI));
  const topBell = bell(f.mu);
  const { body, h } = layout(rows, (y) => {
    const [left, right] = pair(y, "lk-n", { x: span, y: yRange(lls, [f.top + Math.abs(f.top) * 0.02 + 0.5]) }, { x: span, y: [0, topBell * 1.22] });
    // The sample under the bell, a value seen again stacked on the one before.
    const seen = new Map<string, number>();
    const dots = xs
      .map((x) => {
        const key = nt(x, 3);
        const i = seen.get(key) ?? 0;
        seen.set(key, i + 1);
        return dot(right.sx(x), right.sy(0) - 6 - i * 8, C.ink, 3.6);
      })
      .join("");
    const svg =
      title(left, N.curve) + axes(left, few(left)) + curve(left, llMu, C.purple, 2.4) + peak(left, f.mu, f.top, `μ̂ = ${nt(f.mu, 3)}`, C.purple) +
      title(right, N.bell) + axes(right, { ...few(right), yAxis: false }) +
      `<rect x="${r2(right.sx(f.mu - f.sd))}" y="${right.top}" width="${r2(right.sx(f.mu + f.sd) - right.sx(f.mu - f.sd))}" height="${right.bottom - right.top}" fill="${C.orange}" opacity="0.09"/>` +
      curve(right, bell, C.blue, 2.4) + dots + peak(right, f.mu, topBell, `μ̂ = ${nt(f.mu, 3)}`);
    return { svg, h: 18 + PH + 26 };
  });
  return compose(`\\hat\\mu = ${tn(f.mu)}, \\quad \\hat\\sigma = ${tn(f.sd)} \\quad (n = ${f.n})`, body, h, [
    { text: fill(N.summary, { m: nt(f.mu, 4), v: nt(f.v, 4), s: nt(f.s2, 4) }), color: "#495057" },
  ]);
}

// ---------- counts ----------

function renderPoisson(s: LkSpec, w: LkWords): RenderedSvg {
  const P = w.poisson;
  const ks = readNums(s.src[0] ?? "", w);
  if (ks.some((k) => k < 0 || k !== Math.round(k) || k > 1000)) throw new Error(w.counts);
  const f = poissonFit(ks);
  const { n, S, lambda } = f;
  const rows: TexLine[] = [
    { tex: `P(k \\mid \\lambda) = \\frac{\\lambda^{k} e^{-\\lambda}}{k!}`, op: P.one },
    { tex: `\\ell(\\lambda) = \\sum \\left(k_i\\ln\\lambda - \\lambda - \\ln k_i!\\right) = ${S}\\ln\\lambda - ${n}\\lambda - ${tp(f.c)}`, op: P.log, color: C.purple },
    S > 0 ? { tex: `\\ell'(\\lambda) = \\frac{${S}}{\\lambda} - ${n} = 0`, op: P.slope } : { tex: `\\ell'(\\lambda) = -${n} < 0`, op: P.edge },
    { tex: `\\hat\\lambda = \\frac{\\sum k_i}{n} = \\frac{${S}}{${n}} = ${tn(lambda)}`, op: P.estimate, color: C.blue },
    { tex: `\\ell(\\hat\\lambda) = ${tn(f.top)}`, op: P.top },
  ];
  const lmax = Math.max(2 * lambda, lambda + 3);
  const lls = Array.from({ length: 121 }, (_, i) => f.ll(0.02 * lmax + (0.98 * lmax * i) / 120));
  const kmax = Math.max(...ks, Math.ceil(lambda + 3 * Math.sqrt(lambda) + 1));
  const share = (k: number) => ks.filter((x) => x === k).length / n;
  const pmf = (k: number) => (lambda === 0 ? (k === 0 ? 1 : 0) : Math.exp(k * Math.log(lambda) - lambda - lnFact(k)));
  const counts = Array.from({ length: kmax + 1 }, (_, k) => k);
  const topBar = Math.max(...counts.map((k) => Math.max(share(k), pmf(k))));
  const { body, h } = layout(rows, (y) => {
    const [left, right] = pair(y, "lk-p", { x: [0, lmax], y: yRange(lls, [f.top + 0.5]) }, { x: [-0.7, kmax + 0.7], y: [0, topBar * 1.18] });
    const bw = Math.max(3, Math.min(26, (right.sx(1) - right.sx(0)) * 0.6));
    let bars = "";
    for (const k of counts) {
      const py = right.sy(share(k));
      bars += `<rect x="${r2(right.sx(k) - bw / 2)}" y="${r2(py)}" width="${r2(bw)}" height="${r2(right.sy(0) - py)}" fill="${C.grey}" opacity="0.55"/>`;
      bars += dot(right.sx(k), right.sy(pmf(k)), C.blue, 4);
    }
    const svg =
      title(left, P.curve) + axes(left, few(left)) + curve(left, f.ll, C.purple, 2.4, "", lmax * 1e-3, lmax) + peak(left, lambda, f.top, `λ̂ = ${nt(lambda, 3)}`, C.purple) +
      title(right, P.bars) + axes(right, { ...few(right, true), yAxis: false }) + bars +
      legendRow(right.left, right.bottom + 34, [{ text: P.seen, color: C.grey }, { text: P.expected, color: C.blue, round: true }]);
    return { svg, h: 18 + PH + 40 };
  });
  return compose(`\\hat\\lambda = \\frac{${S}}{${n}} = ${tn(lambda)}`, body, h, [{ text: fill(P.summary, { l: nt(lambda, 4) }), color: "#495057" }]);
}

// ---------- least squares is the likelihood under normal noise ----------

function renderSquares(s: LkSpec, w: LkWords): RenderedSvg {
  const Q = w.squares;
  const pts = readPairs(s.src[0] ?? "", w);
  const f = lineFit(pts);
  if (!(f.sxx > 1e-12)) throw new Error(w.sameX);
  const rows: TexLine[] = [
    { tex: `y_i = a + b\\,x_i + \\varepsilon_i, \\quad \\varepsilon_i \\sim N(0, \\sigma^2)`, op: Q.model },
    { tex: `\\ell(a, b, \\sigma) = -n\\ln\\sigma - \\tfrac{n}{2}\\ln 2\\pi - \\frac{1}{2\\sigma^2}\\sum (y_i - a - b\\,x_i)^2`, op: Q.log, color: C.purple },
    { tex: `\\max_{a,\\,b}\\, \\ell \\iff \\min_{a,\\,b} \\sum (y_i - a - b\\,x_i)^2`, op: Q.same, color: C.red },
    { tex: `\\hat b = \\frac{s_{xy}}{s_{xx}} = \\frac{${tn(f.sxy)}}{${tn(f.sxx)}} = ${tn(f.b)}, \\quad \\hat a = \\bar y - \\hat b\\,\\bar x = ${tn(f.a)}`, op: Q.fit, color: C.blue },
    { tex: `\\hat\\sigma^2 = \\tfrac{1}{n}\\sum (y_i - \\hat a - \\hat b\\,x_i)^2 = ${tn(f.mse)}`, op: Q.mse, color: C.orange },
  ];
  const [xa, xb] = [Math.min(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[0]))];
  const ys = pts.map((p) => p[1]);
  const padX = (xb - xa) * 0.1;
  const line = (x: number) => f.a + f.b * x;
  const d = Math.max(1, Math.abs(f.b));
  const bspan: [number, number] = [f.b - d, f.b + d];
  const mses = Array.from({ length: 61 }, (_, i) => f.mseAt(bspan[0] + ((bspan[1] - bspan[0]) * i) / 60));
  const { body, h } = layout(rows, (y) => {
    const [left, right] = pair(y, "lk-s", { x: [xa - padX, xb + padX], y: yRange([...ys, line(xa - padX), line(xb + padX)]) }, { x: bspan, y: [0, Math.max(...mses) * 1.08] });
    let res = "";
    for (const [x, yy] of pts) res += `<line x1="${r2(left.sx(x))}" y1="${r2(left.sy(yy))}" x2="${r2(left.sx(x))}" y2="${r2(left.sy(line(x)))}" stroke="${C.red}" stroke-width="2"/>`;
    const svg =
      title(left, Q.line) + axes(left, few(left)) + res + curve(left, line, C.blue, 2.4) + pts.map(([x, yy]) => dot(left.sx(x), left.sy(yy), C.ink, 4)).join("") +
      title(right, Q.curve) + axes(right, few(right)) + curve(right, f.mseAt, C.orange, 2.4) + peak(right, f.b, f.mse, `b̂ = ${nt(f.b, 3)}`, C.orange);
    return { svg, h: 18 + PH + 26 };
  });
  const eq = `y = ${nt(f.a, 3)} ${f.b < 0 ? "−" : "+"} ${nt(Math.abs(f.b), 3)}x`;
  return compose(`\\hat y = ${tn(f.a)} ${f.b < 0 ? "-" : "+"} ${tn(Math.abs(f.b))}\\,x`, body, h, [{ text: fill(Q.summary, { line: eq, m: nt(f.mse, 4) }), color: "#495057" }]);
}

// ---------- log loss is minus the log-likelihood of labels ----------

function renderLogloss(s: LkSpec, w: LkWords): RenderedSvg {
  const G = w.logloss;
  const ys = zeroOnes(s.src[0] ?? "", w);
  const qs = readNums(s.src[1] ?? "", w);
  if (ys.length !== qs.length) throw new Error(fill(w.sameCount, { a: ys.length, b: qs.length }));
  if (qs.some((q) => !(q > 0 && q < 1))) throw new Error(w.openProb);
  const f = logLoss(ys, qs);
  const n = ys.length;
  const L = Math.exp(-f.nll);
  const factor = (i: number) => (ys[i] === 1 ? tn(qs[i]) : `(1 - ${tn(qs[i])})`);
  const rows: TexLine[] = [
    { tex: `P(y \\mid q) = q^{y}(1-q)^{1-y}, \\quad q = P(y = 1)`, op: G.one },
    { tex: `L = \\prod P(y_i \\mid q_i) = ${terms(ys.map((_, i) => factor(i)), " \\cdot ")} = ${tn(L)}`, op: G.product },
    { tex: `-\\ell = -\\sum \\left[y_i\\ln q_i + (1-y_i)\\ln(1-q_i)\\right] = ${tn(f.nll)}`, op: G.log, color: C.purple },
    { tex: `-\\tfrac{1}{n}\\,\\ell = \\frac{${tn(f.nll)}}{${n}} = ${tn(f.loss)}`, op: G.loss, color: C.blue },
  ];
  const costs = f.ps.map((p) => -Math.log(p));
  const worst = costs.indexOf(Math.max(...costs));
  const cmax = Math.max(4.7, ...costs);
  const { body, h } = layout(rows, (y) => {
    const [left, right] = pair(y, "lk-g", { x: [0.3, n + 0.7], y: [0, Math.max(...costs) * 1.18] }, { x: [0, 1], y: [0, cmax * 1.05] });
    const bw = Math.max(3, Math.min(26, (left.sx(1) - left.sx(0)) * 0.6));
    let bars = "";
    costs.forEach((c, i) => {
      const py = left.sy(c);
      bars += `<rect x="${r2(left.sx(i + 1) - bw / 2)}" y="${r2(py)}" width="${r2(bw)}" height="${r2(left.sy(0) - py)}" fill="${ys[i] === 1 ? C.blue : C.orange}" opacity="0.85"/>`;
    });
    const pts = qs.map((q, i) => dot(right.sx(q), right.sy(costs[i]), ys[i] === 1 ? C.blue : C.orange, 4)).join("");
    const svg =
      title(left, G.bars) + axes(left, few(left, true)) + bars +
      title(right, G.curves) + axes(right, few(right)) + curve(right, (q) => -Math.log(q), C.blue, 2.2, "", 1e-3, 1) + curve(right, (q) => -Math.log(1 - q), C.orange, 2.2, "", 0, 1 - 1e-3) + pts +
      legendRow(left.left, left.bottom + 34, [{ text: G.label1, color: C.blue }, { text: G.label0, color: C.orange }]);
    return { svg, h: 18 + PH + 40 };
  });
  return compose(`-\\tfrac{1}{n}\\,\\ell = ${tn(f.loss)} \\quad (n = ${n})`, body, h, [
    { text: fill(G.summary, { l: nt(f.loss, 4), i: worst + 1, y: ys[worst], q: nt(qs[worst], 3) }), color: "#495057" },
  ]);
}

// ---------- entry ----------

export function renderLikelihood(spec: LkSpec, w: LkWords): RenderedSvg {
  exprMessages(w);
  switch (spec.topic) {
    case "bernoulli":
      return renderBernoulli(spec, w);
    case "normal":
      return renderNormal(spec, w);
    case "poisson":
      return renderPoisson(spec, w);
    case "squares":
      return renderSquares(spec, w);
    case "logloss":
      return renderLogloss(spec, w);
  }
}

const P_ = (topic: LkTopic, ...src: string[]): LkSpec => ({ topic, src });
export const LK_PRESETS: { [K in LkTopic]: { label: string; spec: LkSpec }[] } = {
  bernoulli: [
    { label: "7 heads in 10 flips", spec: P_("bernoulli", "1 1 0 1 1 1 0 1 0 1") },
    { label: "2 free throws in 12", spec: P_("bernoulli", "0 0 1 0 0 0 0 1 0 0 0 0") },
    { label: "30 clicks in 50 visits", spec: P_("bernoulli", "1 0 1 1 0 1 1 0 1 1 0 1 0 1 1 0 1 1 1 0 0 1 1 0 1 0 1 1 0 1 1 0 1 0 0 1 1 1 0 1 0 1 1 0 1 0 0 1 1 0") },
    { label: "5 heads in 5", spec: P_("bernoulli", "1 1 1 1 1") },
  ],
  normal: [
    { label: "heights in cm", spec: P_("normal", "172, 168, 181, 175, 169, 177, 171, 174") },
    { label: "a test's scores", spec: P_("normal", "62, 71, 58, 80, 75, 66, 69, 73, 77, 64") },
    { label: "three values", spec: P_("normal", "2, 4, 9") },
    { label: "measuring g", spec: P_("normal", "9.79, 9.83, 9.81, 9.78, 9.84, 9.80") },
  ],
  poisson: [
    { label: "goals in 12 matches", spec: P_("poisson", "0 1 2 1 3 0 1 2 1 0 2 1") },
    { label: "emails an hour", spec: P_("poisson", "4 6 3 5 7 4 5 2 6 4") },
    { label: "rare events", spec: P_("poisson", "0 0 1 0 0 0 2 0 0 1") },
  ],
  squares: [
    { label: "a rising line", spec: P_("squares", "1, 2.1; 2, 2.9; 3, 4.2; 4, 4.8; 5, 6.1; 6, 6.8") },
    { label: "a falling line", spec: P_("squares", "0, 9; 1, 7.5; 2, 6.8; 3, 4.9; 4, 4.2; 5, 2.6") },
    { label: "one point far off", spec: P_("squares", "1, 1; 2, 2.2; 3, 2.9; 4, 4.1; 5, 9") },
  ],
  logloss: [
    { label: "a good model", spec: P_("logloss", "1 1 0 1 0 0", "0.9, 0.8, 0.2, 0.7, 0.1, 0.3") },
    { label: "one confident mistake", spec: P_("logloss", "1 1 0 1 0 0", "0.9, 0.8, 0.2, 0.02, 0.1, 0.3") },
    { label: "guessing ½", spec: P_("logloss", "1 1 0 1 0 0", "0.5, 0.5, 0.5, 0.5, 0.5, 0.5") },
  ],
};
