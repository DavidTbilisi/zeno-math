// Practice: Binomial and normal. L1 P(X = k) for a binomial, L2 P(X ≤ k) or P(X ≥ k), L3 a normal probability. Since
// #739 half the questions at each level come from `more()`: L1 which variables are binomial, binomial or geometric,
// and a geometric probability; L2 a binomial's standard deviation, a cumulative geometric probability and the mean
// wait for a first success; L3 new settings: a binomial probability estimated from simulations, and a trip's two
// independent normal times added.
import { fill } from "../chart";
import { tableSvg } from "../displays";
import { normCdf } from "../inference";
import { inOrder, numPart, place, tf } from "../partKit";
import { dp, num } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";
import { pickPart } from "../tTails";

/** n choose k. */
const choose = (n: number, k: number) => {
  let c = 1;
  for (let i = 1; i <= k; i++) c = (c * (n - k + i)) / i;
  return c;
};

const r4 = (v: number) => Math.round(v * 10000) / 10000;

function more(r: Rng, L: 1 | 2 | 3, w: PracticeWords): Part {
  const K = w.dsK;
  const p = r.pick([0.1, 0.2, 0.25, 0.3, 0.4]);
  const q = r4(1 - p);
  if (L === 1) {
    const t = r.pick(["identify", "kind", "geo"] as const);
    if (t === "identify")
      return pickPart(r, [r.pick([K.binA0, K.binA1]), K.geoA, K.depA], 0, [{ id: "geometricAsBinomial", at: 1 }, { id: "dependentTrials", at: 2 }], K.identQ, [`\\text{${K.binWhy}}`]);
    if (t === "kind") {
      const geo = r.next() < 0.5;
      const sc = geo ? r.pick([K.scG0, K.scG1]) : r.pick([K.scB0, K.scB1]);
      return inOrder([K.binName, K.geoName, K.neither], geo ? 1 : 0, geo ? [{ id: "binomialForGeometric", at: 0 }] : [{ id: "geometricForBinomial", at: 1 }],
        fill(K.kindQ, { s: sc }), [`\\text{${geo ? K.geoWhy : K.binWhy}}`]);
    }
    const k = r.int(2, 5);
    const v = q ** (k - 1) * p;
    const vars = { p, q, k, j: k - 1, v: dp(v, 3) };
    return numPart(fill(K.geoQ, { p, k }), v, [tf("geometricPowerK", q ** k * p, vars, 0.0005), tf("successFailSwapped", p ** (k - 1) * q, vars, 0.0005)],
      [`P(X = ${k}) = ${q}^{${k - 1}} \\times ${p} = ${dp(v, 3)}`], 0.00051);
  }
  if (L === 2) {
    const t = r.pick(["sd", "cum", "mean"] as const);
    if (t === "sd") {
      const n = r.pick([20, 25, 40, 50, 60, 80, 100]);
      const V = r4(n * p * q);
      const v = Math.sqrt(V);
      const vars = { n, p, q, var: V, v: dp(v, 2) };
      return numPart(fill(K.sdQ, { n, p }), v, [tf("binomialVarianceForSd", V, vars, 0.005), tf("failuresLeftOut", Math.sqrt(n * p), vars, 0.005)],
        [`\\sqrt{${n} \\times ${p} \\times ${q}} = \\sqrt{${V}} = ${dp(v, 2)}`], 0.005);
    }
    if (t === "cum") {
      const k = r.int(3, 6);
      const v = 1 - q ** k;
      const vars = { p, q, k, v: dp(v, 3) };
      return numPart(fill(K.cumQ, { p, k }), v, [tf("firstSuccessOnlyAtK", q ** (k - 1) * p, vars, 0.0005), tf("cumulativeComplementLeft", q ** k, vars, 0.0005)],
        [`1 - ${q}^{${k}} = ${dp(v, 3)}`], 0.00051);
    }
    const pm = r.pick([0.05, 0.1, 0.2, 0.25, 0.5]);
    const v = Math.round(1 / pm);
    const vars = { p: pm, v };
    return numPart(fill(K.meanQ, { p: pm }), v, [tf("geometricMeanAsP", pm, vars), tf("geometricMeanFailures", r4((1 - pm) / pm), vars)], [`\\frac{1}{${pm}} = ${v}`]);
  }
  if (r.next() < 0.5) {
    const tt = 5;
    const ps = r.pick([0.3, 0.4, 0.5, 0.6]);
    const n = 50;
    const fs = Array.from({ length: tt + 1 }, (_, k) => Math.round(n * choose(tt, k) * ps ** k * (1 - ps) ** (tt - k)));
    const big = fs.indexOf(Math.max(...fs));
    fs[big] += n - fs.reduce((a, b) => a + b, 0);
    const k = r.int(2, 4);
    const c = fs.slice(k).reduce((a, b) => a + b, 0);
    const v = c / n;
    const vars = { k, c, n, v };
    return numPart(fill(K.simQ, { n, t: tt, p: ps, k }), v, [tf("simStrict", fs.slice(k + 1).reduce((a, b) => a + b, 0) / n, vars), tf("simCountNotShare", c, vars)],
      [`\\frac{${fs.slice(k).join(" + ")}}{${n}} = \\frac{${c}}{${n}} = ${v}`], 1e-9, place(tableSvg([K.succHead, K.setsHead], fs.map((f, i) => [i, f]))));
  }
  const [a, b, c] = r.pick([[3, 4, 5], [6, 8, 10], [5, 12, 13]] as const);
  const [m1, m2] = [r.int(8, 15), r.int(20, 40)];
  const d = r.nz(-Math.floor(1.5 * c), Math.floor(1.5 * c));
  const tm = m1 + m2 + d;
  const P = (s: number) => 1 - normCdf((tm - m1 - m2) / s);
  const v = P(c);
  const vars = { a, b, c, c2: c * c, v: dp(v, 3) };
  return numPart(fill(K.tripQ, { m1, v1: a * a, m2, v2: b * b, t: tm }), v, [tf("normalSdsAdded", P(a + b), vars, 0.0005), tf("normalVarianceAsSd", P(c * c), vars, 0.0005)],
    [`X + Y \\sim N(${m1 + m2}, ${a * a} + ${b * b} = ${c * c}), \\quad \\sigma = ${c}`, `P(X + Y > ${tm}) = ${dp(v, 3)}`], 0.00051);
}

const gen: Gen = (r, L, w) => {
  if (r.int(0, 9) >= 5) return more(r, L, w);
  const at3 = (v: number) => ({ answer: num(v, 0.00051), show: `${dp(v, 3)}`, plain: dp(v, 3), format: "dp3" as const });
  if (L < 3) {
    const n = r.int(4, 10);
    const p = r.pick([0.1, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.75, 0.8, 0.9] as const);
    const pmf = (k: number) => choose(n, k) * p ** k * (1 - p) ** (n - k);
    const dist = (lo: number, hi: number) => ({ kind: "statistics" as const, spec: { topic: "dist", kind: "binomial", n, p: String(p), lambda: "", mu: "", sigma: "", lo: String(lo), hi: String(hi) } });
    if (L === 1) {
      let k: number;
      do k = r.int(0, n);
      while (pmf(k) < 0.01);
      return { prompt: fill(w.prompts.binomEq, { n, p, e: `X = ${k}` }), q: "", ...at3(pmf(k)), solution: dist(k, k) };
    }
    let lo: number, hi: number, v: number;
    do {
      const k = r.int(1, n - 1);
      [lo, hi] = r.next() < 0.5 ? [0, k] : [k, n];
      v = Array.from({ length: hi - lo + 1 }, (_, i) => pmf(lo + i)).reduce((s, x) => s + x, 0);
    } while (v < 0.02 || v > 0.98);
    return { prompt: fill(w.prompts.binomEq, { n, p, e: lo === 0 ? `X ≤ ${hi}` : `X ≥ ${lo}` }), q: "", ...at3(v), solution: dist(lo, hi) };
  }
  // X ~ N(μ, σ²) with whole-number ends within two standard deviations.
  const mu = r.int(20, 80);
  const s = r.pick([2, 3, 4, 5, 8, 10] as const);
  const a = mu - r.int(0, 2 * s);
  const b = mu + r.int(1, 2 * s);
  const shape = r.int(0, 2);
  const [lo, hi] = shape === 0 ? [a, null] : shape === 1 ? [null, b] : [a, b];
  const v = (hi === null ? 1 : normCdf((hi - mu) / s)) - (lo === null ? 0 : normCdf((lo - mu) / s));
  const e = lo !== null && hi !== null ? `${lo} < X < ${hi}` : lo !== null ? `X > ${lo}` : `X < ${hi}`;
  return {
    prompt: fill(w.prompts.normalP, { mu, v: s * s, e }),
    q: "",
    ...at3(v),
    solution: { kind: "statistics", spec: { topic: "dist", kind: "normal", n: 10, p: "", lambda: "", mu: String(mu), sigma: String(s), lo: lo === null ? "" : String(lo), hi: hi === null ? "" : String(hi) } },
  };
};

export default gen;
