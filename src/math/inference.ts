// Statistical inference: confidence intervals for a mean (z or t) or a proportion, a simulation of what "95% confident"
// means, one-sample tests (z, t, proportion) with the p-value shaded on the null distribution, two-sample tests (Welch's
// t, paired t, two proportions) with the interval for the difference, χ² tests (goodness of fit, independence in a
// two-way table) and the two kinds of error with the power of a z-test.
// The distribution functions are computed here (incomplete gamma and beta functions), not looked up in tables.
import { axes, C, compose, curve, esc, fill, FONT, lbl, makeFrame, nt, r2, texLines, tn, W, type Caption, type Frame, type TexLine } from "./chart";
import type { RenderedSvg } from "./latex";
import { niceStep } from "./plot";

export type InfTopic = "ci" | "coverage" | "test" | "two" | "chi" | "power";
export const INF_TOPICS: InfTopic[] = ["ci", "coverage", "test", "two", "chi", "power"];
export type OneKind = "t" | "z" | "prop";
export const ONE_KINDS: OneKind[] = ["t", "z", "prop"];
export type TwoKind = "means" | "paired" | "props";
export const TWO_KINDS: TwoKind[] = ["means", "paired", "props"];
export type ChiKind = "gof" | "indep";
export const CHI_KINDS: ChiKind[] = ["gof", "indep"];
export type CoverKind = "z" | "t";
export const COVER_KINDS: CoverKind[] = ["z", "t"];
export type Alt = "ne" | "lt" | "gt";
export const ALTS: Alt[] = ["ne", "lt", "gt"];

/** a–f: numbers whose meaning depends on the topic and kind (see infFields); data, data2: lists or a table; level: confidence or α. */
export type InfSpec = {
  topic: InfTopic;
  kind: string;
  a: string;
  b: string;
  c: string;
  d: string;
  e: string;
  f: string;
  data: string;
  data2: string;
  level: string;
  alt: Alt;
  seed: number;
};

export type InfWords = {
  bad: string;
  needN: string;
  needSd: string;
  needCount: string;
  needP0: string;
  needConf: string;
  needAlpha: string;
  needData: string;
  pairLength: string;
  needCounts: string;
  ratioLength: string;
  tooMany: string;
  ragged: string;
  needDiff: string;
  fields: {
    data: string;
    dataZ: string;
    mean: string;
    sd: string;
    sigma: string;
    n: string;
    x: string;
    mu0: string;
    p0: string;
    mu: string;
    mu1: string;
    data1: string;
    data2: string;
    before: string;
    after: string;
    observed: string;
    ratio: string;
    table: string;
    conf: string;
    alpha: string;
  };
  kinds: { one: Record<OneKind, string>; two: Record<TwoKind, string>; chi: Record<ChiKind, string>; cover: Record<CoverKind, string> };
  alt: Record<Alt, string>;
  ops: {
    data: string;
    se: string;
    crit: string;
    margin: string;
    interval: string;
    hypotheses: string;
    statistic: string;
    pvalue: string;
    reject: string;
    keep: string;
    pooled: string;
    seCi: string;
    welch: string;
    diffs: string;
    hypChi: string;
    expected: string;
    expectedIndep: string;
    contributions: string;
    cut: string;
    beta: string;
    power: string;
    nNeeded: string;
  };
  param: { mean: string; prop: string; diff: string; diffP: string; paired: string };
  ciSay: string;
  ciMeaning: string;
  yes: string;
  no: string;
  ciZeroIn: string;
  ciZeroOut: string;
  propCheck: string;
  chiSmall: string;
  chiH1: Record<ChiKind, string>;
  legend: { reject: string; p: string; alpha: string; beta: string; power: string };
  chi: { category: string; total: string };
  coverage: { caught: string; longRun: string };
  power: { typeI: string; typeII: string; power: string; nNeeded: string };
};

let words: InfWords;
/** What the last render worked out (statistic, p-value, interval, power, …), for the tests. */
let last: Record<string, number> = {};
export const lastResult = () => last;

// ---------- distributions ----------

const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012,
  9.9843695780195716e-6, 1.5056327351493116e-7,
];
/** ln Γ(x) (Lanczos, g = 7). */
export function lnGamma(x: number): number {
  if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lnGamma(1 - x);
  x -= 1;
  let a = LANCZOS[0];
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += LANCZOS[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

const TINY = 1e-300;

/** Regularised incomplete gamma: [P(a, x), Q(a, x)] (series below a + 1, continued fraction above). */
function gammaPQ(a: number, x: number): [number, number] {
  if (x <= 0) return [0, 1];
  const lead = a * Math.log(x) - x - lnGamma(a);
  if (x < a + 1) {
    let ap = a;
    let term = 1 / a;
    let sum = term;
    for (let i = 0; i < 10000; i++) {
      ap++;
      term *= x / ap;
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-16) break;
    }
    const p = Math.min(1, sum * Math.exp(lead));
    return [p, 1 - p];
  }
  let b = x + 1 - a;
  let c = 1 / TINY;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 10000; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < TINY) d = TINY;
    c = b + an / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-16) break;
  }
  const q = Math.min(1, Math.exp(lead) * h);
  return [1 - q, q];
}

function betaCf(a: number, b: number, x: number): number {
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < TINY) d = TINY;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 10000; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 3e-16) break;
  }
  return h;
}
/** Regularised incomplete beta I_x(a, b). */
function betaI(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (bt * betaCf(a, b, x)) / a : 1 - (bt * betaCf(b, a, 1 - x)) / b;
}

/** P(Z ≥ z), accurate far into the tail. */
export const normSf = (z: number) => (z >= 0 ? 0.5 * gammaPQ(0.5, (z * z) / 2)[1] : 1 - 0.5 * gammaPQ(0.5, (z * z) / 2)[1]);
export const normCdf = (z: number) => normSf(-z);
/** P(T ≥ t) for Student's t with df degrees of freedom (any df > 0, not only whole numbers). */
export function tSf(t: number, df: number): number {
  if (df > 1e7) return normSf(t);
  const tail = 0.5 * betaI(df / 2, 0.5, df / (df + t * t));
  return t >= 0 ? tail : 1 - tail;
}
/** P(χ² ≥ x) with k degrees of freedom. */
export const chiSf = (x: number, k: number) => (x <= 0 ? 1 : gammaPQ(k / 2, x / 2)[1]);

/** x with sf(x) = p, by bisection on [lo, hi] (sf decreasing). */
function invertSf(sf: (x: number) => number, p: number, lo: number, hi: number): number {
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (sf(mid) > p) lo = mid;
    else hi = mid;
    if (hi - lo < 1e-13 * Math.max(1, Math.abs(mid))) break;
  }
  return (lo + hi) / 2;
}
/** The z with P(Z ≥ z) = p. */
export const zUpper = (p: number) => invertSf(normSf, p, -40, 40);
/** The t with P(T ≥ t) = p. */
export const tUpper = (p: number, df: number) => invertSf((x) => tSf(x, df), p, -1e6, 1e6);
/** The x with P(χ² ≥ x) = p. */
export const chiUpper = (p: number, k: number) => invertSf((x) => chiSf(x, k), p, 0, k + 200 * Math.sqrt(2 * k) + 200);

const SQ2PI = Math.sqrt(2 * Math.PI);
const normPdf = (x: number) => Math.exp((-x * x) / 2) / SQ2PI;
function tPdf(df: number): (x: number) => number {
  const c = Math.exp(lnGamma((df + 1) / 2) - lnGamma(df / 2)) / Math.sqrt(df * Math.PI);
  return (x) => c * (1 + (x * x) / df) ** (-(df + 1) / 2);
}
function chiPdf(k: number): (x: number) => number {
  const c = -(k / 2) * Math.LN2 - lnGamma(k / 2);
  return (x) => (x <= 0 ? (k === 2 ? 0.5 : k < 2 ? Infinity : 0) : Math.exp(c + (k / 2 - 1) * Math.log(x) - x / 2));
}

/** A model for the standardised statistic: N(0, 1) or t with df. */
type Ref = { sf: (x: number) => number; pdf: (x: number) => number; sym: string; name: string };
const zRef = (): Ref => ({ sf: normSf, pdf: normPdf, sym: "Z", name: "N(0, 1)" });
const tRef = (df: number): Ref => ({ sf: (x) => tSf(x, df), pdf: tPdf(df), sym: `T_{${tn(df, 2)}}`, name: `t, df = ${nt(df, 2)}` });
const upper = (r: Ref, p: number) => invertSf(r.sf, p, -1e6, 1e6);

// ---------- reading the inputs ----------

const err = (s: string, v: Record<string, string | number> = {}) => new Error(fill(s, v));

function num(s: string): number {
  const t = s.trim().replace(/−/g, "-").replace(",", ".");
  const v = Number(t);
  if (!t || !Number.isFinite(v)) throw err(words.bad, { s: s.trim() });
  return v;
}
/** Numbers separated by spaces, commas, semicolons, colons or new lines. */
function list(s: string): number[] {
  const parts = s.replace(/−/g, "-").split(/[\s,;:]+/).filter(Boolean);
  return parts.map((p) => {
    const v = Number(p);
    if (!Number.isFinite(v)) throw err(words.bad, { s: p });
    return v;
  });
}
function size(s: string, min = 2): number {
  const v = num(s);
  if (!Number.isInteger(v) || v < min || v > 1e7) throw err(words.needN, { m: min });
  return v;
}
function positive(s: string): number {
  const v = num(s);
  if (!(v > 0)) throw err(words.needSd);
  return v;
}
function count(s: string, n: number): number {
  const v = num(s);
  if (!Number.isInteger(v) || v < 0 || v > n) throw err(words.needCount);
  return v;
}
function confLevel(s: string): number {
  let v = num(s.replace("%", ""));
  if (v >= 1) v /= 100;
  if (!(v >= 0.5 && v <= 0.999)) throw err(words.needConf);
  return v;
}
function alphaLevel(s: string): number {
  let v = num(s.replace("%", ""));
  if (s.includes("%") || v >= 1) v /= 100;
  if (!(v >= 0.001 && v <= 0.5)) throw err(words.needAlpha);
  return v;
}

type Summary = { n: number; mean: number; sd: number; xs: number[] };
function summarise(xs: number[]): Summary {
  if (xs.length < 2) throw err(words.needData);
  const n = xs.length;
  const mean = xs.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(xs.reduce((a, x) => a + (x - mean) ** 2, 0) / (n - 1));
  return { n, mean, sd, xs };
}

// ---------- formatting ----------

const f4 = (v: number) => tn(v, 4);
const f3 = (v: number) => tn(v, 3);
const pr = (v: number) => (v < 0 ? `(${f4(v)})` : f4(v));
/** Percent with no trailing zeros: 95, 97.5. */
const pc = (v: number) => nt(v * 100, 2);
const listTex = (xs: number[], max = 8) => (xs.length > max ? [...xs.slice(0, max - 1).map(f4), "\\ldots", f4(xs[xs.length - 1])] : xs.map(f4)).join(",\\ ");
/** A sum of many terms, shortened in the middle. */
const sumTex = (xs: number[]) => (xs.length > 6 ? [...xs.slice(0, 3).map(f3), "\\cdots", f3(xs[xs.length - 1])] : xs.map(f3)).join(" + ");

// ---------- pictures ----------

const text = (x: number, y: number, s: string, o: { size?: number; color?: string; anchor?: string; bold?: boolean } = {}) =>
  `<text x="${r2(x)}" y="${r2(y)}" ${FONT} font-size="${o.size ?? 13}" fill="${o.color ?? C.ink}" text-anchor="${o.anchor ?? "start"}"${o.bold ? ` font-weight="700"` : ""}>${esc(s)}</text>`;

const PINK = "#ff8787";
const GREEN = "#8ce99a";
const LILAC = "#d0bfff";
/** Hatched fills: the p-value (orange) and α in the power picture (red). */
const DEFS =
  `<defs>` +
  `<pattern id="hatchP" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#ffd8a8" fill-opacity="0.6"/><line x1="0" y1="0" x2="0" y2="7" stroke="${C.orange}" stroke-width="2.4"/></pattern>` +
  `<pattern id="hatchA" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><line x1="0" y1="0" x2="0" y2="7" stroke="${C.red}" stroke-width="2"/></pattern>` +
  `</defs>`;

/** The area under pdf between a and b (clipped to the frame). */
function shade(f: Frame, pdf: (x: number) => number, a: number, b: number, fillAttr: string): string {
  const lo = Math.max(a, f.x0);
  const hi = Math.min(b, f.x1);
  if (!(hi > lo)) return "";
  const pts = [`${r2(f.sx(lo))},${r2(f.sy(0))}`];
  for (let i = 0; i <= 160; i++) {
    const x = lo + ((hi - lo) * i) / 160;
    const y = Math.min(pdf(x), f.y1);
    pts.push(`${r2(f.sx(x))},${r2(f.sy(Number.isFinite(y) ? y : f.y1))}`);
  }
  pts.push(`${r2(f.sx(hi))},${r2(f.sy(0))}`);
  return `<polygon points="${pts.join(" ")}" ${fillAttr} stroke="none"/>`;
}

/** A row of colour keys under a picture; wraps when it runs out of width. */
function keys(y: number, items: { fill: string; text: string; line?: string }[]): { svg: string; h: number } {
  const parts: string[] = [];
  let x = 56;
  let row = 0;
  for (const it of items) {
    const w = 30 + it.text.length * 7.2 + 22;
    if (x + w > W - 16 && x > 56) {
      x = 56;
      row++;
    }
    const yy = y + row * 22;
    parts.push(
      it.line
        ? `<line x1="${x}" y1="${yy - 4}" x2="${x + 22}" y2="${yy - 4}" stroke="${it.line}" stroke-width="2.6"/>`
        : `<rect x="${x}" y="${yy - 12}" width="22" height="13" ${it.fill} stroke="#868e96" stroke-width="0.8"/>`,
      text(x + 30, yy, it.text, { size: 13 }),
    );
    x += w;
  }
  return { svg: parts.join(""), h: (row + 1) * 22 };
}

const PW = W - 48 - 18;

/** The null distribution of the statistic, with the rejection region, the p-value and the statistic itself. */
function nullPicture(y: number, ref: Ref, stat: number, alt: Alt, crit: number, alpha: number, p: number, chiDf?: number): { svg: string; h: number } {
  const H = 160;
  let x0: number;
  let x1: number;
  let yTop: number;
  if (chiDf !== undefined) {
    const k = chiDf;
    x0 = 0;
    x1 = Math.max(crit * 1.5, k + 4 * Math.sqrt(2 * k));
    x1 = Math.max(x1, Math.min(stat * 1.12, x1 * 2));
    let m = 0;
    for (let i = 1; i <= 200; i++) m = Math.max(m, ref.pdf((x1 * i) / 200));
    yTop = k <= 2 ? 0.6 : m * 1.6;
  } else {
    const R = Math.min(6.5, Math.max(4, Math.abs(stat) + 0.7, crit + 0.8));
    x0 = -R;
    x1 = R;
    yTop = ref.pdf(0) * 1.3;
  }
  const f = makeFrame("inull", 48, y + 4, PW, H, [x0, x1], [0, yTop]);
  const parts = [axes(f, { xAtBottom: true, yAxis: false })];
  const upperTail = chiDf !== undefined || alt === "gt";
  const rej: [number, number][] = upperTail ? [[crit, Infinity]] : alt === "lt" ? [[-Infinity, -crit]] : [[-Infinity, -crit], [crit, Infinity]];
  const s = Math.abs(stat);
  const pReg: [number, number][] = upperTail ? [[stat, Infinity]] : alt === "lt" ? [[-Infinity, stat]] : [[-Infinity, -s], [s, Infinity]];
  const g: string[] = [];
  for (const [a, b] of rej) g.push(shade(f, ref.pdf, a, b, `fill="${PINK}" fill-opacity="0.5"`));
  for (const [a, b] of pReg) g.push(shade(f, ref.pdf, a, b, `fill="url(#hatchP)"`));
  parts.push(`<g clip-path="url(#${f.id})">${g.join("")}</g>`, curve(f, ref.pdf, C.ink, 2.2));
  const crits = upperTail ? [crit] : alt === "lt" ? [-crit] : [-crit, crit];
  for (const c of crits) if (c > x0 && c < x1) parts.push(`<line x1="${r2(f.sx(c))}" y1="${f.top + 22}" x2="${r2(f.sx(c))}" y2="${f.bottom}" stroke="${C.red}" stroke-width="1.6" stroke-dasharray="6 4"/>`, lbl(f.sx(c), f.top + 16, nt(c, 3), C.red, "middle", 12, false));
  const symText = chiDf !== undefined ? "χ²" : ref.sym.startsWith("T") ? "t" : "z";
  const statLabel = `${symText} = ${nt(stat, 3)}`;
  if (stat >= x0 && stat <= x1) {
    const px = f.sx(stat);
    parts.push(`<line x1="${r2(px)}" y1="${f.top + 26}" x2="${r2(px)}" y2="${f.bottom}" stroke="${C.blue}" stroke-width="2.6"/>`);
    // Beside the line, on the side away from the centre where there is room.
    const right = chiDf !== undefined ? px < f.right - 90 : stat < 0 ? px < f.left + 90 : px < f.right - 90;
    parts.push(lbl(px + (right ? 6 : -6), f.top + 40, statLabel, C.blue, right ? "start" : "end", 13, false));
  } else if (stat > x1) parts.push(lbl(f.right - 6, f.top + 40, `${statLabel} →`, C.blue, "end", 13, false));
  else parts.push(lbl(f.left + 6, f.top + 40, `← ${statLabel}`, C.blue, "start", 13, false));
  const k = keys(f.bottom + 36, [
    { fill: `fill="${PINK}" fill-opacity="0.5"`, text: fill(words.legend.reject, { a: nt(alpha, 4) }) },
    { fill: `fill="url(#hatchP)"`, text: fill(words.legend.p, { p: nt(p, 4) }) },
    { fill: "", line: C.ink, text: chiDf !== undefined ? `χ², df = ${chiDf}` : ref.name },
  ]);
  parts.push(k.svg);
  return { svg: parts.join(""), h: H + 30 + k.h + 6 };
}

/** The estimate's sampling distribution with the middle C% shaded and the interval bracketed underneath. */
function ciPicture(y: number, est: number, se: number, std: (x: number) => number, crit: number, conf: number, estName: string): { svg: string; h: number } {
  const H = 150;
  const R = Math.min(14, Math.max(4, crit + 1.3));
  const lo = est - crit * se;
  const hi = est + crit * se;
  const pdf = (x: number) => std((x - est) / se) / se;
  const f = makeFrame("ici", 48, y + 4, PW, H, [est - R * se, est + R * se], [0, pdf(est) * 1.2]);
  const ticks = [lo, est, hi].map((v) => ({ v, label: nt(v, 4) }));
  const parts = [axes(f, { xAtBottom: true, yAxis: false, xTicks: ticks })];
  parts.push(
    `<g clip-path="url(#${f.id})">${shade(f, pdf, lo, hi, `fill="${GREEN}" fill-opacity="0.6"`)}${shade(f, pdf, -Infinity, lo, `fill="#dee2e6"`)}${shade(f, pdf, hi, Infinity, `fill="#dee2e6"`)}</g>`,
    curve(f, pdf, C.ink, 2.2),
    lbl(f.sx(est), f.sy(pdf(est) * 0.4), pc(conf) + "%", C.green, "middle", 15, false),
  );
  const tail = pc((1 - conf) / 2) + "%";
  const tx = Math.max(f.left + 24, f.sx(lo) - 30);
  parts.push(lbl(tx, f.bottom - 12, tail, C.grey, "middle", 12, false), lbl(Math.min(f.right - 24, f.sx(hi) + 30), f.bottom - 12, tail, C.grey, "middle", 12, false));
  const by = f.bottom + 34;
  const [a, b] = [f.sx(lo), f.sx(hi)];
  parts.push(
    `<path d="M${r2(a)},${by - 7} L${r2(a)},${by} L${r2(b)},${by} L${r2(b)},${by - 7}" fill="none" stroke="${C.green}" stroke-width="2.6"/>`,
    `<circle cx="${r2(f.sx(est))}" cy="${by}" r="4.5" fill="${C.blue}"/>`,
    text(f.sx(est), by + 20, `${estName} ± E`, { anchor: "middle", color: C.green, bold: true }),
  );
  return { svg: parts.join(""), h: H + 34 + 30 };
}

/** The interval for a difference on a number line, against 0. */
function stripPicture(y: number, lo: number, hi: number, est: number, conf: number): { svg: string; h: number } {
  const span = Math.max(hi, 0) - Math.min(lo, 0);
  const pad = span * 0.12 || 1;
  const f = makeFrame("istrip", 48, y + 4, PW, 34, [Math.min(lo, 0) - pad, Math.max(hi, 0) + pad], [0, 1]);
  const step = niceStep(f.x1 - f.x0, 8);
  const parts: string[] = [`<line x1="${f.left}" y1="${f.bottom}" x2="${f.right}" y2="${f.bottom}" stroke="#495057" stroke-width="1.2"/>`];
  for (let v = Math.ceil(f.x0 / step) * step; v <= f.x1 + 1e-9; v += step)
    parts.push(`<line x1="${r2(f.sx(v))}" y1="${f.bottom}" x2="${r2(f.sx(v))}" y2="${f.bottom + 5}" stroke="#495057"/>`, text(f.sx(v), f.bottom + 18, nt(v, 3), { anchor: "middle", size: 11, color: "#495057" }));
  const cy = f.top + 14;
  parts.push(
    `<line x1="${r2(f.sx(0))}" y1="${f.top - 2}" x2="${r2(f.sx(0))}" y2="${f.bottom}" stroke="${C.red}" stroke-width="1.8" stroke-dasharray="5 4"/>`,
    `<path d="M${r2(f.sx(lo))},${cy - 7} L${r2(f.sx(lo))},${cy + 7} M${r2(f.sx(lo))},${cy} L${r2(f.sx(hi))},${cy} M${r2(f.sx(hi))},${cy - 7} L${r2(f.sx(hi))},${cy + 7}" fill="none" stroke="${C.green}" stroke-width="3"/>`,
    `<circle cx="${r2(f.sx(est))}" cy="${cy}" r="4.5" fill="${C.blue}"/>`,
    lbl(f.sx(hi) + 8, cy + 5, `${pc(conf)}%`, C.green, "start", 13, false),
  );
  return { svg: parts.join(""), h: 34 + 30 };
}

type Cell = { t: string; sub?: string; bold?: boolean; color?: string; shade?: boolean };
/** A table of counts, centred. */
function tablePicture(y: number, rows: Cell[][]): { svg: string; h: number } {
  const cols = rows[0].length;
  const cw = Math.min(92, (W - 40) / cols);
  const twoLine = rows.some((r) => r.some((c) => c.sub));
  const rh = twoLine ? 38 : 26;
  const x0 = (W - cw * cols) / 2;
  const parts: string[] = [];
  rows.forEach((row, i) =>
    row.forEach((c, j) => {
      const x = x0 + j * cw;
      const yy = y + i * rh;
      parts.push(`<rect x="${r2(x)}" y="${yy}" width="${r2(cw)}" height="${rh}" fill="${c.shade ? "#f1f3f5" : "#ffffff"}" stroke="#ced4da"/>`);
      const mid = x + cw / 2;
      if (c.sub) parts.push(text(mid, yy + 16, c.t, { anchor: "middle", bold: c.bold, color: c.color }), text(mid, yy + 32, c.sub, { anchor: "middle", size: 11.5, color: C.blue }));
      else parts.push(text(mid, yy + rh / 2 + 5, c.t, { anchor: "middle", bold: c.bold, color: c.color }));
    }),
  );
  return { svg: parts.join(""), h: rows.length * rh + 8 };
}

type Pic = (y: number) => { svg: string; h: number };
function finish(header: string, rows: TexLine[], pics: Pic[], caps: Caption[]): RenderedSvg {
  const body: string[] = [DEFS];
  let y = 4;
  const ln = texLines(rows, y);
  body.push(ln.svg);
  y += ln.h + 8;
  for (const pic of pics) {
    const p = pic(y);
    body.push(p.svg);
    y += p.h + 6;
  }
  return compose(header, body.join(""), y, caps);
}

// ---------- shared pieces of a test ----------

function pValue(ref: Ref, stat: number, alt: Alt): number {
  if (alt === "ne") return Math.min(1, 2 * ref.sf(Math.abs(stat)));
  return alt === "lt" ? 1 - ref.sf(stat) : ref.sf(stat);
}
function pTex(ref: Ref, stat: number, alt: Alt): string {
  if (alt === "ne") return `2P(${ref.sym} \\ge ${f4(Math.abs(stat))})`;
  return alt === "lt" ? `P(${ref.sym} \\le ${f4(stat)})` : `P(${ref.sym} \\ge ${f4(stat)})`;
}
const critOf = (ref: Ref, alpha: number, alt: Alt) => upper(ref, alt === "ne" ? alpha / 2 : alpha);
const REL: Record<Alt, string> = { ne: "\\ne", lt: "<", gt: ">" };
const RELT: Record<Alt, string> = { ne: "≠", lt: "<", gt: ">" };

/** "|t| = 2.25 > 2.064,  p = 0.034 < 0.05 = α", coloured by the decision. */
function decision(sym: string, stat: number, alt: Alt, crit: number, p: number, alpha: number): TexLine {
  const reject = p < alpha;
  const byStat =
    alt === "ne"
      ? `|${sym}| = ${f4(Math.abs(stat))} ${Math.abs(stat) > crit ? ">" : "\\le"} ${f3(crit)}`
      : alt === "gt"
        ? `${sym} = ${f4(stat)} ${stat > crit ? ">" : "\\le"} ${f3(crit)}`
        : `${sym} = ${f4(stat)} ${stat < -crit ? "<" : "\\ge"} ${f3(-crit)}`;
  return { tex: `${byStat}, \\qquad p = ${f4(p)} ${reject ? "<" : "\\ge"} ${tn(alpha)} = \\alpha`, op: reject ? words.ops.reject : words.ops.keep, color: C.green };
}
function verdict(alpha: number, p: number, h1: string): Caption {
  return { text: fill(p < alpha ? words.yes : words.no, { a: pc(alpha), p: nt(p, 4), h1 }), color: p < alpha ? C.green : C.ink };
}

// ---------- confidence intervals ----------

const oneKind = (s: InfSpec): OneKind => ((ONE_KINDS as string[]).includes(s.kind) ? (s.kind as OneKind) : "t");

/** x̄, s (or σ) and n, from the data when it is there. */
function meanInputs(s: InfSpec, k: "t" | "z", rows: TexLine[]): { mean: number; sd: number; n: number; head: string } {
  if (s.data.trim()) {
    const d = summarise(list(s.data));
    rows.push({ tex: `\\bar{x} = \\frac{\\sum x}{n} = \\frac{${f4(d.mean * d.n)}}{${d.n}} = ${f4(d.mean)}`, op: words.ops.data });
    const sd = k === "t" ? d.sd : positive(s.b);
    if (k === "t") rows.push({ tex: `s = \\sqrt{\\frac{\\sum (x - \\bar{x})^2}{n - 1}} = \\sqrt{\\frac{${f4(d.sd * d.sd * (d.n - 1))}}{${d.n - 1}}} = ${f4(d.sd)}` });
    return { mean: d.mean, sd, n: d.n, head: `x = ${listTex(d.xs)} \\; (n = ${d.n})${k === "z" ? `, \\; \\sigma = ${f4(sd)}` : ""}` };
  }
  const mean = num(s.a);
  const sd = positive(s.b);
  const n = size(s.c);
  return { mean, sd, n, head: `\\bar{x} = ${f4(mean)}, \\; ${k === "t" ? "s" : "\\sigma"} = ${f4(sd)}, \\; n = ${n}` };
}

function renderCi(s: InfSpec): RenderedSvg {
  const k = oneKind(s);
  const conf = confLevel(s.level);
  const tailPct = pc((1 - conf) / 2);
  const rows: TexLine[] = [];
  const caps: Caption[] = [];
  let header: string;
  let est: number;
  let se: number;
  let crit: number;
  let std: (x: number) => number;
  let estName: string;
  let param: string;
  if (k === "prop") {
    const n = size(s.b, 1);
    const x = count(s.a, n);
    est = x / n;
    se = Math.sqrt((est * (1 - est)) / n);
    if (!(se > 0)) throw err(words.needCount);
    crit = zUpper((1 - conf) / 2);
    std = normPdf;
    estName = "p̂";
    param = words.param.prop;
    header = `x = ${x}, \\; n = ${n}, \\; C = ${pc(conf)}\\%`;
    rows.push(
      { tex: `\\hat{p} = \\frac{x}{n} = \\frac{${x}}{${n}} = ${f4(est)}` },
      { tex: `SE = \\sqrt{\\frac{\\hat{p}(1 - \\hat{p})}{n}} = \\sqrt{\\frac{${f4(est)} \\cdot ${f4(1 - est)}}{${n}}} = ${f4(se)}`, op: words.ops.se },
      { tex: `z^{*} = ${f3(crit)}`, op: fill(words.ops.crit, { t: tailPct }) },
      { tex: `E = z^{*} \\cdot SE = ${f3(crit)} \\cdot ${f4(se)} = ${f4(crit * se)}`, op: words.ops.margin },
    );
    if (Math.min(x, n - x) < 10) caps.push({ text: fill(words.propCheck, { a: nt(x, 2), b: nt(n - x, 2) }), color: C.orange });
  } else {
    const m = meanInputs(s, k, rows);
    est = m.mean;
    se = m.sd / Math.sqrt(m.n);
    header = `${m.head}, \\; C = ${pc(conf)}\\%`;
    estName = "x̄";
    param = words.param.mean;
    const sdSym = k === "t" ? "s" : "\\sigma";
    rows.push({ tex: `SE = \\frac{${sdSym}}{\\sqrt{n}} = \\frac{${f4(m.sd)}}{\\sqrt{${m.n}}} = ${f4(se)}`, op: words.ops.se });
    if (k === "t") {
      crit = tUpper((1 - conf) / 2, m.n - 1);
      std = tPdf(m.n - 1);
      rows.push(
        { tex: `df = n - 1 = ${m.n - 1}, \\quad t^{*}_{${m.n - 1}} = ${f3(crit)}`, op: fill(words.ops.crit, { t: tailPct }) },
        { tex: `E = t^{*} \\cdot SE = ${f3(crit)} \\cdot ${f4(se)} = ${f4(crit * se)}`, op: words.ops.margin },
      );
    } else {
      crit = zUpper((1 - conf) / 2);
      std = normPdf;
      rows.push(
        { tex: `z^{*} = ${f3(crit)}`, op: fill(words.ops.crit, { t: tailPct }) },
        { tex: `E = z^{*} \\cdot SE = ${f3(crit)} \\cdot ${f4(se)} = ${f4(crit * se)}`, op: words.ops.margin },
      );
    }
  }
  const lo = est - crit * se;
  const hi = est + crit * se;
  const sym = k === "prop" ? "\\hat{p}" : "\\bar{x}";
  rows.push({ tex: `${sym} \\pm E = ${f4(est)} \\pm ${f4(crit * se)} = (${f4(lo)},\\ ${f4(hi)})`, op: words.ops.interval, color: C.green });
  caps.unshift(
    { text: fill(words.ciSay, { c: pc(conf), param, lo: nt(lo, 4), hi: nt(hi, 4) }), color: C.green },
    { text: fill(words.ciMeaning, { c: pc(conf) }), color: C.grey },
  );
  last = { est, se, crit, lo, hi };
  return finish(header, rows, [(y) => ciPicture(y, est, se, std, crit, conf, estName)], caps);
}

// ---------- what the confidence level means ----------

/** Deterministic PRNG (mulberry32), so a picture on the board re-renders identically. */
function rng(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function renderCoverage(s: InfSpec): RenderedSvg {
  const mu = num(s.a);
  const sigma = positive(s.b);
  const n = Math.min(size(s.c), 200);
  const conf = confLevel(s.level);
  const useT = s.kind === "t";
  const crit = useT ? tUpper((1 - conf) / 2, n - 1) : zUpper((1 - conf) / 2);
  const r = rng(s.seed);
  const gauss = () => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
  const draw = (): [number, number, number] => {
    let sum = 0;
    let sq = 0;
    for (let i = 0; i < n; i++) {
      const x = mu + sigma * gauss();
      sum += x;
      sq += x * x;
    }
    const mean = sum / n;
    const sd = useT ? Math.sqrt(Math.max(0, (sq - n * mean * mean) / (n - 1))) : sigma;
    const half = (crit * sd) / Math.sqrt(n);
    return [mean - half, mean + half, mean];
  };
  const M = 40;
  const ints = Array.from({ length: M }, draw);
  const hits = (iv: [number, number, number]) => iv[0] <= mu && mu <= iv[1];
  const caught = ints.filter(hits).length;
  const EXTRA = 2000;
  let more = 0;
  for (let i = 0; i < EXTRA; i++) if (hits(draw())) more++;
  last = { caught, rate: more / EXTRA };

  const reach = Math.max((2.2 * crit * sigma) / Math.sqrt(n), ...ints.map(([lo, hi]) => Math.max(mu - lo, hi - mu) * 1.06));
  const header = useT
    ? `X \\sim N(${f4(mu)},\\ ${f4(sigma)}^2), \\; n = ${n}: \\quad \\bar{x} \\pm t^{*}_{${n - 1}} \\frac{s}{\\sqrt{n}} = \\bar{x} \\pm ${f3(crit)} \\frac{s}{\\sqrt{n}}`
    : `X \\sim N(${f4(mu)},\\ ${f4(sigma)}^2), \\; n = ${n}: \\quad \\bar{x} \\pm z^{*} \\frac{\\sigma}{\\sqrt{n}} = \\bar{x} \\pm ${f3(crit)} \\cdot ${f4(sigma / Math.sqrt(n))}`;
  const step = 9;
  const H = M * step + 14;
  const f = makeFrame("icov", 48, 4, PW, H, [mu - reach, mu + reach], [0, 1]);
  const parts = [DEFS, axes(f, { xAtBottom: true, yAxis: false })];
  ints.forEach((iv, i) => {
    const yy = f.top + 10 + i * step;
    const col = hits(iv) ? C.green : C.red;
    parts.push(
      `<line x1="${r2(f.sx(iv[0]))}" y1="${yy}" x2="${r2(f.sx(iv[1]))}" y2="${yy}" stroke="${col}" stroke-width="${hits(iv) ? 2.4 : 3.2}" stroke-linecap="round"/>`,
      `<circle cx="${r2(f.sx(iv[2]))}" cy="${yy}" r="2.2" fill="${col}"/>`,
    );
  });
  parts.push(`<line x1="${r2(f.sx(mu))}" y1="${f.top}" x2="${r2(f.sx(mu))}" y2="${f.bottom}" stroke="${C.blue}" stroke-width="2" stroke-dasharray="6 4"/>`);
  const caps: Caption[] = [
    { text: fill(words.coverage.caught, { k: caught, m: M, pct: nt((100 * caught) / M, 1), mu: nt(mu, 4) }), color: caught === M ? C.green : C.ink },
    { text: fill(words.coverage.longRun, { m: EXTRA, pct: nt((100 * more) / EXTRA, 1), c: pc(conf) }), color: C.blue },
  ];
  return compose(header, parts.join(""), H + 26, caps);
}

// ---------- one-sample tests ----------

function renderTest(s: InfSpec): RenderedSvg {
  const k = oneKind(s);
  const alpha = alphaLevel(s.level);
  const alt = s.alt;
  const rows: TexLine[] = [];
  let header: string;
  let ref: Ref;
  let stat: number;
  let h1: string;
  const caps: Caption[] = [];
  if (k === "prop") {
    const n = size(s.b, 1);
    const x = count(s.a, n);
    const p0 = num(s.d);
    if (!(p0 > 0 && p0 < 1)) throw err(words.needP0);
    const ph = x / n;
    const se = Math.sqrt((p0 * (1 - p0)) / n);
    stat = (ph - p0) / se;
    ref = zRef();
    header = `x = ${x}, \\; n = ${n}, \\; p_0 = ${f4(p0)}, \\; \\alpha = ${tn(alpha)}`;
    h1 = `p ${RELT[alt]} ${nt(p0, 4)}`;
    rows.push(
      { tex: `H_0: p = ${f4(p0)} \\qquad H_1: p ${REL[alt]} ${f4(p0)}`, op: words.ops.hypotheses },
      { tex: `\\hat{p} = \\frac{x}{n} = \\frac{${x}}{${n}} = ${f4(ph)}` },
      { tex: `SE = \\sqrt{\\frac{p_0(1 - p_0)}{n}} = \\sqrt{\\frac{${f4(p0)} \\cdot ${f4(1 - p0)}}{${n}}} = ${f4(se)}`, op: words.ops.se },
      { tex: `z = \\frac{\\hat{p} - p_0}{SE} = \\frac{${f4(ph)} - ${f4(p0)}}{${f4(se)}} = ${f4(stat)}`, op: words.ops.statistic },
    );
    if (Math.min(n * p0, n * (1 - p0)) < 10) caps.push({ text: fill(words.propCheck, { a: nt(n * p0, 2), b: nt(n * (1 - p0), 2) }), color: C.orange });
  } else {
    const m = meanInputs(s, k, rows);
    const mu0 = num(s.d);
    const se = m.sd / Math.sqrt(m.n);
    stat = (m.mean - mu0) / se;
    ref = k === "t" ? tRef(m.n - 1) : zRef();
    header = `${m.head}, \\; \\mu_0 = ${f4(mu0)}, \\; \\alpha = ${tn(alpha)}`;
    h1 = `μ ${RELT[alt]} ${nt(mu0, 4)}`;
    const sd = k === "t" ? "s" : "\\sigma";
    const v = k === "t" ? "t" : "z";
    rows.splice(0, 0, { tex: `H_0: \\mu = ${f4(mu0)} \\qquad H_1: \\mu ${REL[alt]} ${f4(mu0)}`, op: words.ops.hypotheses });
    rows.push(
      { tex: `SE = \\frac{${sd}}{\\sqrt{n}} = \\frac{${f4(m.sd)}}{\\sqrt{${m.n}}} = ${f4(se)}`, op: words.ops.se },
      { tex: `${v} = \\frac{\\bar{x} - \\mu_0}{SE} = \\frac{${f4(m.mean)} - ${pr(mu0)}}{${f4(se)}} = ${f4(stat)}`, op: k === "t" ? `${words.ops.statistic}, df = ${m.n - 1}` : words.ops.statistic },
    );
  }
  const p = pValue(ref, stat, alt);
  const crit = critOf(ref, alpha, alt);
  rows.push({ tex: `p = ${pTex(ref, stat, alt)} = ${f4(p)}`, op: words.ops.pvalue }, decision(ref.sym === "Z" ? "z" : "t", stat, alt, crit, p, alpha));
  caps.unshift(verdict(alpha, p, h1));
  last = { stat, p, crit };
  return finish(header, rows, [(y) => nullPicture(y, ref, stat, alt, crit, alpha, p)], caps);
}

// ---------- two samples ----------

const twoKind = (s: InfSpec): TwoKind => ((TWO_KINDS as string[]).includes(s.kind) ? (s.kind as TwoKind) : "means");

function renderTwo(s: InfSpec): RenderedSvg {
  const k = twoKind(s);
  const alpha = alphaLevel(s.level);
  const conf = 1 - alpha;
  const alt = s.alt;
  const rows: TexLine[] = [];
  const caps: Caption[] = [];
  let header: string;
  let ref: Ref;
  let stat: number;
  let est: number;
  let seCi: number;
  let h1: string;
  let param: string;
  let critSym: string;
  if (k === "means") {
    const g1 = s.data.trim() ? summarise(list(s.data)) : { n: size(s.c), mean: num(s.a), sd: positive(s.b), xs: [] };
    const g2 = s.data2.trim() ? summarise(list(s.data2)) : { n: size(s.f), mean: num(s.d), sd: positive(s.e), xs: [] };
    if (!(g1.sd > 0 && g2.sd > 0)) throw err(words.needSd);
    const v1 = g1.sd ** 2 / g1.n;
    const v2 = g2.sd ** 2 / g2.n;
    const se = Math.sqrt(v1 + v2);
    const df = (v1 + v2) ** 2 / (v1 ** 2 / (g1.n - 1) + v2 ** 2 / (g2.n - 1));
    est = g1.mean - g2.mean;
    stat = est / se;
    seCi = se;
    ref = tRef(df);
    critSym = "t^{*}";
    h1 = `μ₁ ${RELT[alt]} μ₂`;
    param = words.param.diff;
    const sum = (g: Summary, i: number) => `\\bar{x}_${i} = ${f4(g.mean)}, \\; s_${i} = ${f4(g.sd)}, \\; n_${i} = ${g.n}`;
    header = `${sum(g1, 1)} \\qquad ${sum(g2, 2)}`;
    if (s.data.trim() || s.data2.trim()) rows.push({ tex: header, op: words.ops.data });
    header = `${header}, \\; \\alpha = ${tn(alpha)}`;
    rows.push(
      { tex: `H_0: \\mu_1 = \\mu_2 \\qquad H_1: \\mu_1 ${REL[alt]} \\mu_2`, op: words.ops.hypotheses },
      { tex: `SE = \\sqrt{\\frac{s_1^2}{n_1} + \\frac{s_2^2}{n_2}} = \\sqrt{\\frac{${f4(g1.sd)}^2}{${g1.n}} + \\frac{${f4(g2.sd)}^2}{${g2.n}}} = ${f4(se)}`, op: words.ops.se },
      { tex: `df = \\frac{\\left(\\frac{s_1^2}{n_1} + \\frac{s_2^2}{n_2}\\right)^2}{\\frac{(s_1^2/n_1)^2}{n_1 - 1} + \\frac{(s_2^2/n_2)^2}{n_2 - 1}} = ${tn(df, 2)}`, op: words.ops.welch },
      { tex: `t = \\frac{\\bar{x}_1 - \\bar{x}_2}{SE} = \\frac{${f4(g1.mean)} - ${pr(g2.mean)}}{${f4(se)}} = ${f4(stat)}`, op: words.ops.statistic },
    );
  } else if (k === "paired") {
    const a = list(s.data);
    const b = list(s.data2);
    if (a.length !== b.length) throw err(words.pairLength);
    const d = summarise(a.map((x, i) => x - b[i]));
    if (!(d.sd > 0)) throw err(words.needSd);
    const se = d.sd / Math.sqrt(d.n);
    est = d.mean;
    stat = est / se;
    seCi = se;
    ref = tRef(d.n - 1);
    critSym = "t^{*}";
    param = words.param.paired;
    h1 = `${param} ${RELT[alt]} 0`;
    header = `\\begin{gathered} x_1 = ${listTex(a)} \\\\ x_2 = ${listTex(b)}, \\; \\alpha = ${tn(alpha)} \\end{gathered}`;
    rows.push(
      { tex: `d = x_1 - x_2: \\; ${listTex(d.xs)}`, op: words.ops.diffs },
      { tex: `\\bar{d} = ${f4(d.mean)}, \\; s_d = ${f4(d.sd)}, \\; n = ${d.n}`, op: words.ops.data },
      { tex: `H_0: \\mu_d = 0 \\qquad H_1: \\mu_d ${REL[alt]} 0`, op: words.ops.hypotheses },
      { tex: `SE = \\frac{s_d}{\\sqrt{n}} = \\frac{${f4(d.sd)}}{\\sqrt{${d.n}}} = ${f4(se)}`, op: words.ops.se },
      { tex: `t = \\frac{\\bar{d}}{SE} = \\frac{${f4(d.mean)}}{${f4(se)}} = ${f4(stat)}`, op: `${words.ops.statistic}, df = ${d.n - 1}` },
    );
  } else {
    const n1 = size(s.b, 1);
    const x1 = count(s.a, n1);
    const n2 = size(s.d, 1);
    const x2 = count(s.c, n2);
    const p1 = x1 / n1;
    const p2 = x2 / n2;
    const pp = (x1 + x2) / (n1 + n2);
    const se0 = Math.sqrt(pp * (1 - pp) * (1 / n1 + 1 / n2));
    seCi = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);
    if (!(se0 > 0)) throw err(words.needCount);
    est = p1 - p2;
    stat = est / se0;
    ref = zRef();
    critSym = "z^{*}";
    h1 = `p₁ ${RELT[alt]} p₂`;
    param = words.param.diffP;
    header = `x_1 = ${x1}, \\; n_1 = ${n1} \\qquad x_2 = ${x2}, \\; n_2 = ${n2}, \\; \\alpha = ${tn(alpha)}`;
    rows.push(
      { tex: `\\hat{p}_1 = \\frac{${x1}}{${n1}} = ${f4(p1)}, \\quad \\hat{p}_2 = \\frac{${x2}}{${n2}} = ${f4(p2)}` },
      { tex: `H_0: p_1 = p_2 \\qquad H_1: p_1 ${REL[alt]} p_2`, op: words.ops.hypotheses },
      { tex: `\\hat{p} = \\frac{x_1 + x_2}{n_1 + n_2} = \\frac{${x1 + x2}}{${n1 + n2}} = ${f4(pp)}`, op: words.ops.pooled },
      { tex: `SE = \\sqrt{\\hat{p}(1 - \\hat{p})\\left(\\frac{1}{n_1} + \\frac{1}{n_2}\\right)} = ${f4(se0)}`, op: words.ops.se },
      { tex: `z = \\frac{\\hat{p}_1 - \\hat{p}_2}{SE} = \\frac{${f4(p1)} - ${f4(p2)}}{${f4(se0)}} = ${f4(stat)}`, op: words.ops.statistic },
    );
    const small = Math.min(x1, n1 - x1, x2, n2 - x2);
    if (small < 5) caps.push({ text: fill(words.propCheck, { a: nt(Math.min(x1, n1 - x1), 2), b: nt(Math.min(x2, n2 - x2), 2) }), color: C.orange });
  }
  const p = pValue(ref, stat, alt);
  const crit = critOf(ref, alpha, alt);
  const ciCrit = upper(ref, alpha / 2);
  const lo = est - ciCrit * seCi;
  const hi = est + ciCrit * seCi;
  rows.push({ tex: `p = ${pTex(ref, stat, alt)} = ${f4(p)}`, op: words.ops.pvalue }, decision(ref.sym === "Z" ? "z" : "t", stat, alt, crit, p, alpha));
  const estSym = k === "means" ? "(\\bar{x}_1 - \\bar{x}_2)" : k === "paired" ? "\\bar{d}" : "(\\hat{p}_1 - \\hat{p}_2)";
  const seSym = k === "props" ? "SE'" : "SE";
  if (k === "props")
    rows.push({ tex: `SE' = \\sqrt{\\frac{\\hat{p}_1(1 - \\hat{p}_1)}{n_1} + \\frac{\\hat{p}_2(1 - \\hat{p}_2)}{n_2}} = ${f4(seCi)}`, op: words.ops.seCi });
  rows.push({ tex: `${estSym} \\pm ${critSym} \\cdot ${seSym} = ${f4(est)} \\pm ${f3(ciCrit)} \\cdot ${f4(seCi)} = (${f4(lo)},\\ ${f4(hi)})`, op: fill(words.ops.interval + " ({c}%)", { c: pc(conf) }) });
  caps.unshift(verdict(alpha, p, h1), { text: fill(lo <= 0 && 0 <= hi ? words.ciZeroIn : words.ciZeroOut, { c: pc(conf), param, lo: nt(lo, 4), hi: nt(hi, 4) }), color: C.grey });
  last = { stat, p, crit, lo, hi, est };
  return finish(header, rows, [(y) => nullPicture(y, ref, stat, alt, crit, alpha, p), (y) => stripPicture(y, lo, hi, est, conf)], caps);
}

// ---------- χ² ----------

const chiKind = (s: InfSpec): ChiKind => (s.kind === "indep" ? "indep" : "gof");

function renderChi(s: InfSpec): RenderedSvg {
  const k = chiKind(s);
  const alpha = alphaLevel(s.level);
  const rows: TexLine[] = [];
  const caps: Caption[] = [];
  let header: string;
  let chi: number;
  let df: number;
  let minE: number;
  let table: Cell[][];
  const cell = (v: number, d = 4) => nt(v, d);
  if (k === "gof") {
    const O = list(s.data);
    if (O.length < 2 || O.some((o) => o < 0)) throw err(words.needCounts);
    if (O.length > 12) throw err(words.tooMany, { m: 12 });
    const n = O.reduce((a, b) => a + b, 0);
    if (!(n > 0)) throw err(words.needCounts);
    const ratio = s.data2.trim() ? list(s.data2) : O.map(() => 1);
    if (ratio.length !== O.length) throw err(words.ratioLength, { k: O.length });
    if (ratio.some((r) => !(r > 0))) throw err(words.needCounts);
    const rs = ratio.reduce((a, b) => a + b, 0);
    const E = ratio.map((r) => (n * r) / rs);
    const parts = O.map((o, i) => (o - E[i]) ** 2 / E[i]);
    chi = parts.reduce((a, b) => a + b, 0);
    df = O.length - 1;
    minE = Math.min(...E);
    header = `O = ${listTex(O, 12)}, \\; n = ${f4(n)}, \\; \\alpha = ${tn(alpha)}`;
    const kk = O.length;
    const equal = !s.data2.trim();
    rows.push(
      { tex: equal ? `H_0: p_1 = p_2 = \\cdots = p_{${kk}} = \\frac{1}{${kk}}` : `H_0: p_1 : \\cdots : p_{${kk}} = ${ratio.map(f4).join(" : ")}`, op: words.ops.hypChi },
      { tex: equal ? `E = \\frac{n}{${kk}} = \\frac{${f4(n)}}{${kk}} = ${f4(E[0])}` : `E_i = n \\cdot p_i: \\; ${listTex(E, 12)}`, op: words.ops.expected },
      { tex: `\\chi^2 = \\sum \\frac{(O - E)^2}{E} = ${sumTex(parts)} = ${f4(chi)}`, op: words.ops.contributions },
    );
    table = [
      [{ t: words.chi.category, bold: true, shade: true }, ...O.map((_, i) => ({ t: String(i + 1), bold: true, shade: true })), { t: words.chi.total, bold: true, shade: true }],
      [{ t: "O", bold: true, shade: true }, ...O.map((o) => ({ t: cell(o) })), { t: cell(n) }],
      [{ t: "E", bold: true, shade: true, color: C.blue }, ...E.map((e) => ({ t: cell(e, 2), color: C.blue })), { t: cell(n), color: C.blue }],
      [{ t: "(O−E)²/E", bold: true, shade: true, color: C.orange }, ...parts.map((c) => ({ t: cell(c, 3), color: C.orange })), { t: cell(chi, 3), bold: true, color: C.orange }],
    ];
  } else {
    const lines = s.data.split(/[;\n]+/).map((l) => l.trim()).filter(Boolean);
    const O = lines.map(list);
    const c = O[0]?.length ?? 0;
    if (O.length < 2 || c < 2) throw err(words.needCounts);
    if (O.some((r) => r.length !== c)) throw err(words.ragged);
    if (O.length > 6 || c > 6) throw err(words.tooMany, { m: 6 });
    if (O.some((r) => r.some((v) => v < 0))) throw err(words.needCounts);
    const R = O.map((r) => r.reduce((a, b) => a + b, 0));
    const Cs = O[0].map((_, j) => O.reduce((a, r) => a + r[j], 0));
    const n = R.reduce((a, b) => a + b, 0);
    if (R.some((v) => !(v > 0)) || Cs.some((v) => !(v > 0))) throw err(words.needCounts);
    const E = O.map((_, i) => Cs.map((cj) => (R[i] * cj) / n));
    const parts = O.flatMap((r, i) => r.map((o, j) => (o - E[i][j]) ** 2 / E[i][j]));
    chi = parts.reduce((a, b) => a + b, 0);
    df = (O.length - 1) * (c - 1);
    minE = Math.min(...E.flat());
    header = `${O.length} \\times ${c}, \\; n = ${f4(n)}, \\; \\alpha = ${tn(alpha)}`;
    rows.push(
      { tex: `E_{ij} = \\frac{R_i \\cdot C_j}{n}, \\quad E_{11} = \\frac{${f4(R[0])} \\cdot ${f4(Cs[0])}}{${f4(n)}} = ${f4(E[0][0])}`, op: words.ops.expectedIndep },
      { tex: `\\chi^2 = \\sum \\frac{(O - E)^2}{E} = ${sumTex(parts)} = ${f4(chi)}`, op: words.ops.contributions },
    );
    const head: Cell[] = [{ t: "", shade: true }, ...Cs.map((_, j) => ({ t: `C${j + 1}`, bold: true, shade: true })), { t: words.chi.total, bold: true, shade: true }];
    table = [
      head,
      ...O.map((r, i): Cell[] => [{ t: `R${i + 1}`, bold: true, shade: true }, ...r.map((o, j) => ({ t: cell(o), sub: `(${cell(E[i][j], 2)})` })), { t: cell(R[i]), bold: true }]),
      [{ t: words.chi.total, bold: true, shade: true }, ...Cs.map((v) => ({ t: cell(v), bold: true })), { t: cell(n), bold: true }],
    ];
  }
  const p = chiSf(chi, df);
  const crit = chiUpper(alpha, df);
  const reject = p < alpha;
  rows.push(
    { tex: `df = ${k === "gof" ? "k - 1" : "(r - 1)(c - 1)"} = ${df}, \\quad p = P(\\chi^2_{${df}} \\ge ${f4(chi)}) = ${f4(p)}`, op: words.ops.pvalue },
    { tex: `\\chi^2 = ${f4(chi)} ${chi > crit ? ">" : "\\le"} ${f3(crit)}, \\qquad p = ${f4(p)} ${reject ? "<" : "\\ge"} ${tn(alpha)} = \\alpha`, op: reject ? words.ops.reject : words.ops.keep, color: C.green },
  );
  caps.push(verdict(alpha, p, words.chiH1[k]));
  if (minE < 5) caps.push({ text: words.chiSmall, color: C.orange });
  last = { stat: chi, p, crit, df };
  const ref: Ref = { sf: (x) => chiSf(x, df), pdf: chiPdf(df), sym: `\\chi^2_{${df}}`, name: "" };
  return finish(header, rows, [(y) => tablePicture(y, table), (y) => nullPicture(y, ref, chi, "gt", crit, alpha, p, df)], caps);
}

// ---------- errors and power ----------

/** P(reject H₀) when the mean is mu, for a z-test with critical values c (one or two of them). */
function rejectProb(alt: Alt, mu: number, se: number, c: number[]): number {
  if (alt === "gt") return normSf((c[0] - mu) / se);
  if (alt === "lt") return normCdf((c[0] - mu) / se);
  return normCdf((c[0] - mu) / se) + normSf((c[1] - mu) / se);
}

function renderPower(s: InfSpec): RenderedSvg {
  const mu0 = num(s.a);
  const mu1 = num(s.b);
  const sigma = positive(s.c);
  const n = size(s.d, 1);
  const alpha = alphaLevel(s.level);
  const alt = s.alt;
  if (alt === "gt" ? !(mu1 > mu0) : alt === "lt" ? !(mu1 < mu0) : mu1 === mu0) throw err(words.needDiff);
  const se = sigma / Math.sqrt(n);
  const zc = zUpper(alt === "ne" ? alpha / 2 : alpha);
  const c = alt === "gt" ? [mu0 + zc * se] : alt === "lt" ? [mu0 - zc * se] : [mu0 - zc * se, mu0 + zc * se];
  const power = rejectProb(alt, mu1, se, c);
  const beta = 1 - power;
  const z80 = zUpper(0.2);
  const nNeed = Math.ceil((((zc + z80) * sigma) / (mu1 - mu0)) ** 2 - 1e-9);
  last = { power, beta, n: nNeed, se };

  const header = `\\mu_0 = ${f4(mu0)}, \\; \\mu_1 = ${f4(mu1)}, \\; \\sigma = ${f4(sigma)}, \\; n = ${n}, \\; \\alpha = ${tn(alpha)}`;
  const zs = alt === "ne" ? "z_{\\alpha/2}" : "z_{\\alpha}";
  const rows: TexLine[] = [
    { tex: `H_0: \\mu = ${f4(mu0)} \\qquad H_1: \\mu ${REL[alt]} ${f4(mu0)}`, op: words.ops.hypotheses },
    { tex: `SE = \\frac{\\sigma}{\\sqrt{n}} = \\frac{${f4(sigma)}}{\\sqrt{${n}}} = ${f4(se)}`, op: words.ops.se },
    {
      tex:
        alt === "gt"
          ? `\\bar{x} > \\mu_0 + ${zs} \\cdot SE = ${f4(mu0)} + ${f3(zc)} \\cdot ${f4(se)} = ${f4(c[0])}`
          : alt === "lt"
            ? `\\bar{x} < \\mu_0 - ${zs} \\cdot SE = ${f4(mu0)} - ${f3(zc)} \\cdot ${f4(se)} = ${f4(c[0])}`
            : `\\bar{x} \\notin [\\mu_0 - ${zs} \\cdot SE,\\ \\mu_0 + ${zs} \\cdot SE] = [${f4(c[0])},\\ ${f4(c[1])}]`,
      op: words.ops.cut,
    },
    {
      tex:
        alt === "gt"
          ? `\\beta = P(\\bar{x} \\le ${f4(c[0])} \\mid \\mu = ${f4(mu1)}) = P\\left(Z \\le \\frac{${f4(c[0])} - ${pr(mu1)}}{${f4(se)}}\\right) = ${f4(beta)}`
          : alt === "lt"
            ? `\\beta = P(\\bar{x} \\ge ${f4(c[0])} \\mid \\mu = ${f4(mu1)}) = P\\left(Z \\ge \\frac{${f4(c[0])} - ${pr(mu1)}}{${f4(se)}}\\right) = ${f4(beta)}`
            : `\\beta = P(${f4(c[0])} \\le \\bar{x} \\le ${f4(c[1])} \\mid \\mu = ${f4(mu1)}) = ${f4(beta)}`,
      op: words.ops.beta,
    },
    { tex: `1 - \\beta = ${f4(power)}`, op: words.ops.power, color: C.green },
    { tex: `n \\ge \\left(\\frac{(${zs} + z_{0.2})\\,\\sigma}{\\mu_1 - \\mu_0}\\right)^2 = \\left(\\frac{(${f3(zc)} + ${f3(z80)}) \\cdot ${f4(sigma)}}{${f4(mu1 - mu0)}}\\right)^2 \\;\\Rightarrow\\; n = ${nNeed}`, op: words.ops.nNeeded },
  ];

  const pic: Pic = (y) => {
    const H = 170;
    const lo = Math.min(mu0, mu1) - 3.8 * se;
    const hi = Math.max(mu0, mu1) + 3.8 * se;
    const pdf0 = (x: number) => normPdf((x - mu0) / se) / se;
    const pdf1 = (x: number) => normPdf((x - mu1) / se) / se;
    const f = makeFrame("ipow", 48, y + 4, PW, H, [lo, hi], [0, pdf0(mu0) * 1.32]);
    const rej: [number, number][] = alt === "gt" ? [[c[0], Infinity]] : alt === "lt" ? [[-Infinity, c[0]]] : [[-Infinity, c[0]], [c[1], Infinity]];
    const acc: [number, number] = alt === "gt" ? [-Infinity, c[0]] : alt === "lt" ? [c[0], Infinity] : [c[0], c[1]];
    const g: string[] = [shade(f, pdf1, acc[0], acc[1], `fill="${LILAC}" fill-opacity="0.75"`)];
    for (const [a, b] of rej) g.push(shade(f, pdf1, a, b, `fill="${GREEN}" fill-opacity="0.6"`));
    for (const [a, b] of rej) g.push(shade(f, pdf0, a, b, `fill="url(#hatchA)"`));
    const parts = [axes(f, { xAtBottom: true, yAxis: false }), `<g clip-path="url(#${f.id})">${g.join("")}</g>`, curve(f, pdf0, C.blue, 2.4), curve(f, pdf1, C.purple, 2.4)];
    for (const v of c) parts.push(`<line x1="${r2(f.sx(v))}" y1="${f.top + 20}" x2="${r2(f.sx(v))}" y2="${f.bottom}" stroke="${C.ink}" stroke-width="1.6" stroke-dasharray="6 4"/>`, lbl(f.sx(v), f.top + 14, nt(v, 4), C.ink, "middle", 12, false));
    const top = f.sy(pdf0(mu0));
    const left = mu0 < mu1;
    parts.push(
      lbl(f.sx(mu0) + (left ? -6 : 6), top - 8, `H₀: μ = ${nt(mu0, 4)}`, C.blue, left ? "end" : "start", 13, false),
      lbl(f.sx(mu1) + (left ? 6 : -6), top - 8, `H₁: μ = ${nt(mu1, 4)}`, C.purple, left ? "start" : "end", 13, false),
    );
    const k = keys(f.bottom + 36, [
      { fill: `fill="url(#hatchA)"`, text: `${words.legend.alpha} = ${nt(alpha, 4)}` },
      { fill: `fill="${LILAC}" fill-opacity="0.75"`, text: `${words.legend.beta} = ${nt(beta, 4)}` },
      { fill: `fill="${GREEN}" fill-opacity="0.6"`, text: `${words.legend.power} = ${nt(power, 4)}` },
    ]);
    parts.push(k.svg);
    return { svg: parts.join(""), h: H + 30 + k.h + 6 };
  };
  const caps: Caption[] = [
    { text: fill(words.power.typeI, { a: nt(alpha, 4) }), color: C.red },
    { text: fill(words.power.typeII, { b: nt(beta, 4) }), color: C.purple },
    { text: fill(words.power.power, { p: nt(power, 4) }), color: C.green },
    { text: fill(words.power.nNeeded, { n: nNeed }), color: C.grey },
  ];
  return finish(header, rows, [pic], caps);
}

// ---------- entry points ----------

export function renderInference(spec: InfSpec, w: InfWords): RenderedSvg {
  words = w;
  last = {};
  switch (spec.topic) {
    case "ci":
      return renderCi(spec);
    case "coverage":
      return renderCoverage(spec);
    case "test":
      return renderTest(spec);
    case "two":
      return renderTwo(spec);
    case "chi":
      return renderChi(spec);
    case "power":
      return renderPower(spec);
  }
}

/** The kinds a topic offers (empty: no choice). */
export function kindsOf(topic: InfTopic): readonly string[] {
  return topic === "ci" || topic === "test" ? ONE_KINDS : topic === "two" ? TWO_KINDS : topic === "chi" ? CHI_KINDS : topic === "coverage" ? COVER_KINDS : [];
}
export const kindLabel = (topic: InfTopic, kind: string, w: InfWords): string =>
  topic === "two" ? w.kinds.two[kind as TwoKind] : topic === "chi" ? w.kinds.chi[kind as ChiKind] : topic === "coverage" ? w.kinds.cover[kind as CoverKind] : w.kinds.one[kind as OneKind];
/** Whether the topic tests against a one- or two-sided alternative. */
export const hasAlt = (topic: InfTopic) => topic === "test" || topic === "two" || topic === "power";

export type InfField = { key: "a" | "b" | "c" | "d" | "e" | "f" | "data" | "data2" | "level"; label: string; area?: boolean };
/** The inputs the dialog shows for a spec, with their labels. */
export function infFields(s: InfSpec, w: InfWords): InfField[] {
  const F = w.fields;
  const level: InfField = { key: "level", label: s.topic === "ci" || s.topic === "coverage" ? F.conf : F.alpha };
  switch (s.topic) {
    case "ci":
    case "test": {
      const k = oneKind(s);
      const out: InfField[] =
        k === "prop"
          ? [{ key: "a", label: F.x }, { key: "b", label: F.n }]
          : [{ key: "data", label: k === "t" ? F.data : F.dataZ, area: true }, { key: "a", label: F.mean }, { key: "b", label: k === "t" ? F.sd : F.sigma }, { key: "c", label: F.n }];
      if (s.topic === "test") out.push({ key: "d", label: k === "prop" ? F.p0 : F.mu0 });
      return [...out, level];
    }
    case "coverage":
      return [{ key: "a", label: F.mu }, { key: "b", label: F.sigma }, { key: "c", label: F.n }, level];
    case "two": {
      const k = twoKind(s);
      if (k === "paired") return [{ key: "data", label: F.before, area: true }, { key: "data2", label: F.after, area: true }, level];
      if (k === "props") return [{ key: "a", label: "x₁" }, { key: "b", label: "n₁" }, { key: "c", label: "x₂" }, { key: "d", label: "n₂" }, level];
      return [
        { key: "data", label: F.data1, area: true },
        { key: "data2", label: F.data2, area: true },
        { key: "a", label: "x̄₁" },
        { key: "b", label: "s₁" },
        { key: "c", label: "n₁" },
        { key: "d", label: "x̄₂" },
        { key: "e", label: "s₂" },
        { key: "f", label: "n₂" },
        level,
      ];
    }
    case "chi":
      return chiKind(s) === "gof"
        ? [{ key: "data", label: F.observed, area: true }, { key: "data2", label: F.ratio }, level]
        : [{ key: "data", label: F.table, area: true }, level];
    case "power":
      return [{ key: "a", label: F.mu0 }, { key: "b", label: F.mu1 }, { key: "c", label: F.sigma }, { key: "d", label: F.n }, level];
  }
}

const S = (topic: InfTopic, kind: string, v: Partial<InfSpec> = {}): InfSpec => ({
  topic,
  kind,
  a: "",
  b: "",
  c: "",
  d: "",
  e: "",
  f: "",
  data: "",
  data2: "",
  level: topic === "ci" || topic === "coverage" ? "95" : "0.05",
  alt: "ne",
  seed: 1,
  ...v,
});
export const INF_PRESETS: { [K in InfTopic]: { label: string; spec: InfSpec }[] } = {
  ci: [
    { label: "x̄ = 50.3, s = 4.2, n = 25", spec: S("ci", "t", { a: "50.3", b: "4.2", c: "25" }) },
    { label: "8 measurements, 95%", spec: S("ci", "t", { data: "12.1 11.8 12.5 12.0 11.6 12.3 12.4 11.9" }) },
    { label: "x̄ = 172, σ = 8, n = 40, 90%", spec: S("ci", "z", { a: "172", b: "8", c: "40", level: "90" }) },
    { label: "112 of 200, 95%", spec: S("ci", "prop", { a: "112", b: "200" }) },
    { label: "520 of 1000, 99%", spec: S("ci", "prop", { a: "520", b: "1000", level: "99" }) },
  ],
  coverage: [
    { label: "N(50, 10²), n = 20, 95%", spec: S("coverage", "z", { a: "50", b: "10", c: "20", seed: 3 }) },
    { label: "t, n = 5, 95%", spec: S("coverage", "t", { a: "50", b: "10", c: "5", seed: 11 }) },
    { label: "N(50, 10²), n = 20, 80%", spec: S("coverage", "z", { a: "50", b: "10", c: "20", level: "80", seed: 3 }) },
  ],
  test: [
    { label: "x̄ = 51.8, s = 4, n = 25; μ₀ = 50", spec: S("test", "t", { a: "51.8", b: "4", c: "25", d: "50" }) },
    { label: "10 bags, μ₀ = 500, <", spec: S("test", "t", { data: "498 502 497 495 500 494 499 496 501 493", d: "500", alt: "lt" }) },
    { label: "x̄ = 103, σ = 15, n = 36; μ₀ = 100, >", spec: S("test", "z", { a: "103", b: "15", c: "36", d: "100", alt: "gt" }) },
    { label: "58 heads of 100, p₀ = 0.5", spec: S("test", "prop", { a: "58", b: "100", d: "0.5" }) },
    { label: "12 of 200, p₀ = 0.1, <", spec: S("test", "prop", { a: "12", b: "200", d: "0.1", alt: "lt" }) },
  ],
  two: [
    { label: "78 ± 10 (30) vs 72 ± 12 (35)", spec: S("two", "means", { a: "78", b: "10", c: "30", d: "72", e: "12", f: "35" }) },
    { label: "two groups of data", spec: S("two", "means", { data: "23 25 28 30 26 27 31 24", data2: "20 22 25 21 24 19 23", alt: "gt" }) },
    { label: "before / after", spec: S("two", "paired", { data: "120 135 128 142 130 125 138 133", data2: "115 130 126 135 128 122 131 130", alt: "gt" }) },
    { label: "45/150 vs 30/150", spec: S("two", "props", { a: "45", b: "150", c: "30", d: "150" }) },
  ],
  chi: [
    { label: "die: 60 rolls", spec: S("chi", "gof", { data: "8 12 9 14 7 10" }) },
    { label: "Mendel 9 : 3 : 3 : 1", spec: S("chi", "gof", { data: "315 108 101 32", data2: "9:3:3:1" }) },
    { label: "2 × 2 table", spec: S("chi", "indep", { data: "20 30\n30 20" }) },
    { label: "2 × 3 table", spec: S("chi", "indep", { data: "25 35 40\n15 45 40" }) },
  ],
  power: [
    { label: "μ₀ = 100, μ₁ = 105, σ = 15, n = 36, >", spec: S("power", "", { a: "100", b: "105", c: "15", d: "36", alt: "gt" }) },
    { label: "same, n = 100", spec: S("power", "", { a: "100", b: "105", c: "15", d: "100", alt: "gt" }) },
    { label: "μ₀ = 50, μ₁ = 52, σ = 6, n = 25, ≠", spec: S("power", "", { a: "50", b: "52", c: "6", d: "25" }) },
  ],
};
