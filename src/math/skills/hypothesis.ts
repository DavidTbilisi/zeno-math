// Practice: Hypothesis tests. L1 a decision from p and α, L2 a z test's statistic, L3 its p-value. #742 adds, on half
// the seeds: what a small or large P-value suggests, hypotheses written for a mean or a proportion and a P-value
// estimated from simulations (L1); hypotheses for a difference of means, the conditions for a t test, the P-value of
// a z test for a proportion and of a t test for a mean, and a conclusion in context (L2); then a new setting, two
// plant foods compared by a two-sample t test, its P-value and its conclusion (L3).
import { fill } from "../chart";
import { tSf } from "../distributions";
import { type Alt, type InfSpec, normCdf, normSf } from "../inference";
import { numPart, shuffled, textTex, tf } from "../partKit";
import { dp, num } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";

type Slip = { id: Trap["id"]; at: number; vars?: Record<string, string | number> };
const r4 = (v: number) => Math.round(v * 10000) / 10000;

/** Which conclusion: reject when P ≤ α (said as the claim), fail to reject, or H₀ taken as shown. */
export function conclusion(r: Rng, w: PracticeWords, setup: string, claim: string, nul: string, ids: { flipped: Trap["id"]; accepted: Trap["id"] }): Part {
  const K = w.htK;
  const a = r.pick([0.01, 0.05, 0.1]);
  const reject = r.next() < 0.5;
  const p = reject ? r.int(1, Math.round(a * 1000) - 1) / 1000 : r.int(Math.round(a * 1000) + 6, 400) / 1000;
  const right = reject ? 0 : 1;
  return shuffled(r, [fill(K.optReject, { c: claim }), fill(K.optKeep, { c: claim }), fill(K.optAccept, { c: nul })], right,
    [{ id: ids.flipped, at: 1 - right, vars: { p, a } }, { id: ids.accepted, at: 2 }], fill(K.conclQ, { s: setup, p, a }), [`P = ${p} ${reject ? "\\le" : ">"} ${a} = \\alpha`]);
}

/** P-values from a statistic rounded to 2 places, to 3 places; a slip within CLEAR (21 × TOL) would read as rounding. */
const TOL = 0.0006;
const CLEAR = 21 * TOL;
/** A P-value from a statistic: one-sided in the given direction or two-sided (the statistic is rounded to 2 places first). */
const tailP = (sf: (x: number) => number, x: number, alt: Alt) => (alt === "ne" ? 2 * sf(Math.abs(x)) : alt === "gt" ? sf(x) : sf(-x));

function more(r: Rng, L: 1 | 2 | 3, w: PracticeWords): Part {
  const K = w.htK;
  const hyp = (h0: string, h1: string) => `H₀: ${h0}, H₁: ${h1}`;
  /** Hypotheses as options: right, swapped, the wrong sidedness, about the statistic. */
  const write = (prompt: string, par: string, stat: string, v: string | number, rel: "<" | ">" | "≠") => {
    const other = rel === "≠" ? ">" : "≠";
    const h0 = `${par} = ${v}`;
    const h1 = `${par} ${rel} ${v}`;
    const vars = { h0: `H₀: ${h0}`, h1: `H₁: ${h1}`, par, stat };
    return shuffled(r, [hyp(h0, h1), hyp(h1, h0), hyp(h0, `${par} ${other} ${v}`), hyp(`${stat} = ${v}`, `${stat} ${rel} ${v}`)], 0,
      [{ id: "hypothesesSwapped", at: 1, vars }, { id: rel === "≠" ? "oneSidedForTwo" : "twoSidedForOne", at: 2, vars }, { id: "statisticInHypothesis", at: 3, vars }], prompt, [textTex(`${vars.h0}, ${vars.h1}`)]);
  };
  if (L === 1) {
    const t = r.pick(["simple", "write", "sim"] as const);
    if (t === "simple") {
      const small = r.next() < 0.5;
      const d = small ? r.int(12, 18) : r.int(2, 6);
      const h = 50 + r.pick([-1, 1]) * d;
      const p = Number(dp(2 * normSf((d - 0.5) / 5), 3));
      const right = small ? 0 : 1;
      return shuffled(r, [K.sNotFair, K.sNoEvidence, K.sProved], right, [{ id: small ? "smallPKept" : "largePRejected", at: 1 - right, vars: { p } }, { id: "rejectAsProof", at: 2 }],
        fill(K.simpleQ, { h, p }), [`p = ${p} ${small ? "<" : ">"} 0.05`]);
    }
    if (t === "write") {
      if (r.next() < 0.5) {
        const m = r.pick([20, 30, 40, 50, 60]);
        return write(fill(K.writeMean, { m }), "μ", "x̄", m, "<");
      }
      const p = r.pick([20, 25, 30, 40]);
      return write(fill(K.writeProp, { p }), "p", "p̂", p / 100, ">");
    }
    const k = r.int(2, 24);
    const v = k / 200;
    const vars = { k, v };
    return numPart(fill(K.simQ, { k }), v, [tf("simCountAsP", k, vars), tf("simComplement", 1 - v, vars)], [`\\frac{${k}}{200} = ${v}`]);
  }
  if (L === 2) {
    const t = r.pick(["writeDiff", "cond", "zProp", "tMean", "concl"] as const);
    if (t === "writeDiff") return r.next() < 0.5 ? write(K.diffSleep, "μ₁ − μ₂", "x̄₁ − x̄₂", 0, ">") : write(K.diffFood, "μ₁ − μ₂", "x̄₁ − x̄₂", 0, "≠");
    if (t === "cond") {
      const names = [K.cRandom, K.cTen, K.cNormal, K.cAll];
      const k = r.int(0, 3);
      const why = [K.whyRandom, K.whyTen, K.whyNormal, K.whyAll][k];
      const traps: Slip[] = [0, 1, 2, 3].filter((i) => i !== k).map((i): Slip => (i === 3 ? { id: "conditionsMissed", at: 3, vars: { why } } : { id: "conditionMixed", at: i, vars: { got: names[i], why } }));
      return shuffled(r, names, k, traps, fill(K.condQ, { s: [K.sRandom, K.sTen, K.sNormal, K.sAll][k] }), [`\\text{${why}}`]);
    }
    if (t === "zProp") {
      for (;;) {
        const n = r.pick([100, 150, 200, 250, 400]);
        const p0 = r.pick([0.2, 0.25, 0.3, 0.4, 0.5]);
        const x = Math.round(n * p0) + r.int(-40, 40);
        const ph = x / n;
        const se = Math.sqrt((p0 * (1 - p0)) / n);
        const z = (ph - p0) / se;
        if (Math.abs(z) < 0.8 || Math.abs(z) > 2.6) continue;
        const alt: Alt = z > 0 ? "gt" : "lt";
        const P = tailP(normSf, Number(dp(z, 2)), alt);
        const zh = (ph - p0) / Math.sqrt((ph * (1 - ph)) / n);
        const pHat = tailP(normSf, Number(dp(zh, 2)), alt);
        if (Math.abs(pHat - P) <= CLEAR || P <= CLEAR) continue;
        const vars = { n, x, ph: r4(ph), p0, z: dp(z, 2), v: dp(P, 3) };
        return numPart(fill(K.zPropQ, { n, x, p0, rel: alt === "gt" ? ">" : "<" }), P, [tf("seFromPHat", pHat, vars, TOL), tf("tailDoubled", 2 * P, vars, TOL)],
          [`\\hat p = \\frac{${x}}{${n}} = ${r4(ph)}`, `z = \\frac{${r4(ph)} - ${p0}}{\\sqrt{${p0}(1 - ${p0})/${n}}} = ${dp(z, 2)}`, `P \\approx ${dp(P, 3)}`], TOL);
      }
    }
    if (t === "tMean") {
      for (;;) {
        const n = r.pick([9, 16, 25, 36]);
        const s = r.int(3, 12);
        const mu = r.int(20, 90);
        const sd = s / Math.sqrt(n);
        const m = Math.round((mu + (r.int(-28, 28) / 10) * sd) * 10) / 10;
        const tt = Number(dp((m - mu) / sd, 2));
        if (Math.abs(tt) < 0.8 || Math.abs(tt) > 2.8) continue;
        const alt: Alt = tt > 0 ? "gt" : "lt";
        const sf = (x: number) => tSf(x, n - 1);
        const P = tailP(sf, tt, alt);
        if (P <= CLEAR) continue;
        const vars = { t: dp(tt, 2), df: n - 1, v: dp(P, 3) };
        return numPart(fill(K.tMeanQ, { n, m, s, mu, rel: alt === "gt" ? ">" : "<" }), P, [tf("zForT", tailP(normSf, tt, alt), vars, TOL), tf("tailDoubled", 2 * P, { ...vars, z: dp(tt, 2) }, TOL)],
          [`t = \\frac{${m} - ${mu}}{${s}/\\sqrt{${n}}} = ${dp(tt, 2)}, \\quad \\mathrm{df} = ${n - 1}`, `P \\approx ${dp(P, 3)}`], TOL);
      }
    }
    return r.next() < 0.5 ? conclusion(r, w, K.ctxCycle, K.claimCycle, K.nullCycle, { flipped: "decisionFlipped", accepted: "nullAccepted" })
      : conclusion(r, w, K.ctxBattery, K.claimBattery, K.nullBattery, { flipped: "decisionFlipped", accepted: "nullAccepted" });
  }
  // A new setting: two plant foods compared.
  if (r.next() < 0.5) return conclusion(r, w, K.ctxFood, K.claimFood, K.nullFood, { flipped: "decisionFlipped", accepted: "nullAccepted" });
  for (;;) {
    const [n1, n2] = [r.pick([10, 12, 15, 20]), r.pick([10, 12, 15, 20])];
    const [s1, s2] = [r.int(3, 8), r.int(3, 8)];
    const m2 = r.int(20, 40);
    const m1 = Math.round((m2 + r.int(-60, 60) / 10) * 10) / 10;
    const se = Math.sqrt((s1 * s1) / n1 + (s2 * s2) / n2);
    const tt = Number(dp((m1 - m2) / se, 2));
    if (Math.abs(tt) < 0.8 || Math.abs(tt) > 2.8) continue;
    const df = Math.min(n1, n2) - 1;
    const sf = (x: number) => tSf(x, df);
    const P = tailP(sf, tt, "ne");
    if (P / 2 <= CLEAR) continue;
    const vars = { t: dp(tt, 2), df, v: dp(P, 3) };
    return numPart(fill(K.twoTQ, { n1, m1, s1, n2, m2, s2, df }), P, [tf("tailNotDoubled", P / 2, vars, TOL), tf("zForT", tailP(normSf, tt, "ne"), vars, TOL)],
      [`t = \\frac{${m1} - ${m2}}{\\sqrt{${s1}^2/${n1} + ${s2}^2/${n2}}} = ${dp(tt, 2)}, \\quad \\mathrm{df} = ${df}`, `P = 2 \\cdot P(T > ${dp(Math.abs(tt), 2)}) \\approx ${dp(P, 3)}`], TOL);
  }
}

/** The Inference tool's one-sample z test. */
const zTest = (mean: number, sigma: number, n: number, mu0: number, alt: Alt): InfSpec => ({
  topic: "test", kind: "z", a: String(mean), b: String(sigma), c: String(n), d: String(mu0), e: "", f: "", data: "", data2: "", level: "0.05", alt, seed: 1,
});

const gen: Gen = (r, L, w) => {
  if (r.int(0, 9) >= 5) return more(r, L, w);
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
