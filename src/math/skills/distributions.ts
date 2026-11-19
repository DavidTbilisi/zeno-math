// Practice: Binomial and normal.
import { fill } from "../chart";
import { normCdf } from "../inference";
import { dp, num } from "../practiceKit";
import type { Gen } from "../practiceTypes";

/** n choose k. */
const choose = (n: number, k: number) => {
  let c = 1;
  for (let i = 1; i <= k; i++) c = (c * (n - k + i)) / i;
  return c;
};

const gen: Gen = (r, L, w) => {
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
