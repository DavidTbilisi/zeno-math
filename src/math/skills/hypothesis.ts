// Practice: Hypothesis tests.
import { fill } from "../chart";
import { type Alt, type InfSpec, normCdf, normSf } from "../inference";
import { dp, num } from "../practiceKit";
import type { Gen } from "../practiceTypes";

/** The Inference tool's one-sample z test. */
const zTest = (mean: number, sigma: number, n: number, mu0: number, alt: Alt): InfSpec => ({
  topic: "test", kind: "z", a: String(mean), b: String(sigma), c: String(n), d: String(mu0), e: "", f: "", data: "", data2: "", level: "0.05", alt, seed: 1,
});

const gen: Gen = (r, L, w) => {
  if (L === 1) {
    // Reject H₀ exactly when p ≤ α.
    const alpha = r.pick([1, 5, 10] as const);
    const reject = r.next() < 0.5;
    let p: number;
    do p = reject ? r.int(1, alpha * 10) / 1000 : r.int(alpha * 10 + 1, 250) / 1000;
    while (p * 100 === alpha);
    const options = (["reject", "keep"] as const).map((k) => ({ text: w.decisions[k].text, plain: w.decisions[k].plain, tex: "" }));
    const cmp = `p = ${p} ${reject ? "\\le" : ">"} ${alpha / 100}`;
    return {
      prompt: fill(w.prompts.hypDecide, { a: alpha, p }),
      q: "",
      answer: { k: "pick", options, right: reject ? 0 : 1 },
      show: cmp,
      plain: options[reject ? 0 : 1].plain,
      format: "pick",
      steps: [cmp],
    };
  }
  // A z test of a mean: σ known, n a square so the standard error is plain.
  const n = r.pick([16, 25, 36, 49, 64, 100] as const);
  const sigma = r.int(2, 15);
  const mu0 = r.int(20, 90);
  const se = sigma / Math.sqrt(n);
  let mean: number, z: number;
  do (mean = Math.round((mu0 + r.int(-30, 30) / 10 * se) * 10) / 10), (z = (mean - mu0) / se);
  while (Math.abs(z) < 0.3 || Math.abs(z) > 3);
  if (L === 2) {
    return {
      prompt: fill(w.prompts.hypZ, { n, m: mean, s: sigma, mu: mu0 }),
      q: "",
      answer: num(z, 0.0051),
      show: dp(z, 2),
      plain: dp(z, 2),
      format: "dp2",
      solution: { kind: "inference", spec: zTest(mean, sigma, n, mu0, "ne") },
    };
  }
  // One-sided in the direction the sample went, or two-sided.
  const alt = r.pick(["ne", z > 0 ? "gt" : "lt"] as const);
  const pOf = (zz: number) => (alt === "ne" ? 2 * normSf(Math.abs(zz)) : alt === "gt" ? normSf(zz) : normCdf(zz));
  const p = pOf(z);
  // z rounded to 2 places first, as from a table, is right too.
  const tol = Math.abs(pOf(Number(dp(z, 2))) - p) + 0.00051;
  return {
    prompt: fill(w.prompts.hypP, { n, m: mean, s: sigma, mu: mu0, rel: alt === "ne" ? "≠" : alt === "gt" ? ">" : "<" }),
    q: "",
    answer: num(p, tol),
    show: `z = ${dp(z, 2)}, \\quad p \\approx ${dp(p, 3)}`,
    plain: dp(p, 3),
    format: "dp3",
    solution: { kind: "inference", spec: zTest(mean, sigma, n, mu0, alt) },
  };
};

export default gen;
