// Practice: Confidence intervals: L1 a z interval for a mean, L2 a t interval, L3 a z interval for a proportion. #743
// adds, on half the seeds: the conditions for a z interval for a proportion or a t interval for a mean, and the
// critical values z* and t* for a confidence level (L1); the sample size for a margin of error, how the margin moves
// with n and the confidence level, and whether an interval for a proportion or a mean supports a claim (L2); then a
// new setting, two groups compared, and whether an interval for a difference of means or proportions supports a claim
// (L3).
import { fill } from "../chart";
import { tUpper, zUpper } from "../inference";
import { numPart, shuffled, tf } from "../partKit";
import { dp } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { conditions } from "./hypothesis";

/** Critical values to 3 places; a slip within CLEAR of the answer would read as rounding. */
const TOL = 0.0006;
const CLEAR = 21 * TOL;
const Z_STAR: Record<number, number> = { 90: 1.645, 95: 1.96, 99: 2.576 };

/** Does the interval (lo, hi) for a parameter support the claim that it is above v? */
export function claimPart(r: Rng, w: PracticeWords, prompt: string, lo: number, hi: number, v: number): Part {
  const K = w.ciK;
  const right = lo > v ? 0 : hi < v ? 2 : 1;
  const vars = { lo, hi, v };
  const traps: { id: Trap["id"]; at: number; vars: typeof vars }[] = [0, 1, 2].filter((i) => i !== right).map((i) => ({ id: right === 1 && i === 0 ? "ciCentreOnly" : "ciClaimMisread", at: i, vars }));
  return shuffled(r, [fill(K.clYes, { v }), fill(K.clNo, { v }), fill(K.clOpp, { v })], right, traps, prompt, [`(${lo}, \\; ${hi})`]);
}

/** An interval about c with half-width e, placed above, around or below v. */
function around(r: Rng, v: number, e: number, places: number) {
  const where = r.int(0, 2);
  const c = where === 0 ? v + e * (1.2 + r.next()) : where === 2 ? v - e * (1.2 + r.next()) : v + e * (r.next() - 0.5) * 1.2;
  const f = (x: number) => Number(x.toFixed(places));
  return [f(c - e), f(c + e)] as const;
}

function more(r: Rng, L: 1 | 2 | 3, w: PracticeWords): Part {
  const K = w.ciK;
  if (L === 1) {
    const t = r.pick(["cond", "zStar", "tStar"] as const);
    if (t === "cond") {
      const k = r.int(0, 3);
      const H = w.htK;
      if (r.next() < 0.5) return conditions(r, [H.cRandom, H.cTen, K.cLarge, H.cAll], k, [K.whyRandomP, K.whyTenP, K.whyLargeP, K.whyAllP][k], fill(K.condP, { s: [K.sRandomP, K.sTenP, K.sLargeP, K.sAllP][k] }));
      return conditions(r, [H.cRandom, H.cTen, H.cNormal, H.cAll], k, [H.whyRandom, H.whyTen, H.whyNormal, H.whyAll][k], fill(K.condM, { s: [H.sRandom, H.sTen, H.sNormal, H.sAll][k] }));
    }
    if (t === "zStar") {
      const c = r.pick([80, 85, 90, 92, 95, 96, 98, 99]);
      const a = (100 - c) / 2;
      const v = zUpper(a / 100);
      const vars = { c, a, a2: 100 - c, v: dp(v, 3) };
      return numPart(fill(K.zStarQ, { c }), v, [tf("zStarOneTail", zUpper(1 - c / 100), vars, TOL)], [`P(Z > z^*) = \\frac{1 - ${c / 100}}{2} = ${a / 100}`, `z^* = ${dp(v, 3)}`], TOL);
    }
    for (;;) {
      const c = r.pick([90, 95, 99]);
      const n = r.int(4, 16);
      const tail = (1 - c / 100) / 2;
      const v = tUpper(tail, n - 1);
      if (Math.abs(tUpper(tail, n) - v) <= CLEAR) continue;
      const vars = { df: n - 1, t: dp(v, 3), z: Z_STAR[c] };
      return numPart(fill(K.tStarQ, { c, n }), v, [tf("dfIsN", tUpper(tail, n), vars, TOL), tf("tStarAsZ", zUpper(tail), vars, TOL)],
        [`\\mathrm{df} = ${n} - 1 = ${n - 1}`, `P(T > t^*) = ${tail}`, `t^* = ${dp(v, 3)}`], TOL);
    }
  }
  if (L === 2) {
    const t = r.pick(["sizeP", "sizeM", "margin", "claimP", "claimM"] as const);
    if (t === "sizeP" || t === "sizeM") {
      for (;;) {
        const c = r.pick([90, 95, 99]);
        const z = Z_STAR[c];
        const p = r.pick([0.5, 0.2, 0.3, 0.4, 0.6]);
        const E = t === "sizeP" ? r.pick([0.02, 0.03, 0.04, 0.05]) : r.pick([0.5, 1, 2, 2.5]);
        const s = r.int(3, 15);
        const raw = t === "sizeP" ? (z * z * p * (1 - p)) / (E * E) : ((z * s) / E) ** 2;
        if (Math.abs(raw - Math.round(raw)) < 0.01) continue;
        const n = Math.ceil(raw);
        const flat = Math.ceil(t === "sizeP" ? (z * Math.sqrt(p * (1 - p))) / E : (z * s) / E);
        const vars = { raw: dp(raw, 2), n };
        const prompt = t === "sizeP" ? fill(K.sizePQ, { c, E, p, z }) : fill(K.sizeMQ, { c, E, s, z });
        const step = t === "sizeP" ? `n \\ge \\frac{${z}^2 \\cdot ${p}(1 - ${p})}{${E}^2} = ${dp(raw, 2)}` : `n \\ge \\left(\\frac{${z} \\cdot ${s}}{${E}}\\right)^2 = ${dp(raw, 2)}`;
        return numPart(prompt, n, [tf("sizeRoundedDown", n - 1, vars), tf("sizeNotSquared", flat, vars)], [step, `n = ${n}`]);
      }
    }
    if (t === "margin") {
      if (r.next() < 0.5) {
        const k = r.pick([2, 3, 4]);
        const vars = { k, k2: k * k };
        return shuffled(r, [fill(K.mDivK, vars), fill(K.mDivK2, vars), fill(K.mTimesK, vars)], 0, [{ id: "marginByN", at: 1, vars }, { id: "marginGrows", at: 2, vars }],
          fill(K.marginNQ, vars), [`E \\propto \\frac{1}{\\sqrt{n}}: \\quad \\frac{1}{\\sqrt{${k * k}}} = \\frac{1}{${k}}`]);
      }
      const [a, b] = r.pick([[90, 99], [90, 95], [95, 99]]);
      const vars = { a, b };
      return shuffled(r, [K.mWider, K.mNarrower, K.mSame], 0, [{ id: "confidenceNarrows", at: 1, vars }, { id: "confidenceNarrows", at: 2, vars }],
        fill(K.marginCQ, vars), [`z^*: ${Z_STAR[a]} \\to ${Z_STAR[b]}`]);
    }
    if (t === "claimP") {
      const v = r.pick([0.4, 0.5, 0.6, 0.3]);
      const [lo, hi] = around(r, v, r.int(3, 6) / 100, 3);
      return claimPart(r, w, fill(K.claimPQ, { lo, hi, v }), lo, hi, v);
    }
    const v = r.pick([40, 50, 60]);
    const [lo, hi] = around(r, v, r.int(15, 40) / 10, 1);
    return claimPart(r, w, fill(K.claimMQ, { lo, hi, v }), lo, hi, v);
  }
  // A new setting: two groups compared, the interval for a difference.
  if (r.next() < 0.5) {
    const [lo, hi] = around(r, 0, r.int(15, 50) / 10, 1);
    return claimPart(r, w, fill(K.claimDMQ, { lo, hi }), lo, hi, 0);
  }
  const [lo, hi] = around(r, 0, r.int(3, 8) / 100, 3);
  return claimPart(r, w, fill(K.claimDPQ, { lo, hi }), lo, hi, 0);
}

const gen: Gen = (r, L, w) => {
  if (r.int(0, 9) >= 5) return more(r, L, w);
  const conf = r.pick([90, 95, 99]);
  const tail = (1 - conf / 100) / 2;
  const base = { topic: "ci", d: "", e: "", f: "", data: "", data2: "", level: String(conf), alt: "ne", seed: 1 };
  if (L === 3) {
    const n = r.pick([100, 200, 250, 400, 500]);
    const x = r.int(Math.round(n * 0.2), Math.round(n * 0.8));
    const p = x / n;
    const E = zUpper(tail) * Math.sqrt((p * (1 - p)) / n);
    return {
      prompt: fill(w.prompts.ciP, { n, x, c: conf }),
      q: "",
      answer: { k: "tuple", vs: [p - E, p + E], tol: 0.00051 },
      show: `(${dp(p - E, 3)}, \\; ${dp(p + E, 3)})`,
      plain: `(${dp(p - E, 3)}; ${dp(p + E, 3)})`,
      format: "interval",
      solution: { kind: "inference", spec: { ...base, kind: "prop", a: String(x), b: String(n), c: "" } },
    };
  }
  const n = L === 1 ? r.pick([25, 36, 49, 64, 100]) : r.int(8, 30);
  const m = r.int(20, 80) + r.pick([0, 0.5, 0.2, 0.8]);
  const s = r.int(2, 15);
  const crit = L === 1 ? zUpper(tail) : tUpper(tail, n - 1);
  const E = (crit * s) / Math.sqrt(n);
  return {
    prompt: fill(L === 1 ? w.prompts.ciZ : w.prompts.ciT, { n, m, s, c: conf }),
    q: "",
    answer: { k: "tuple", vs: [m - E, m + E], tol: 0.0051 },
    show: `(${dp(m - E, 2)}, \\; ${dp(m + E, 2)})`,
    plain: `(${dp(m - E, 2)}; ${dp(m + E, 2)})`,
    format: "interval",
    solution: { kind: "inference", spec: { ...base, kind: L === 1 ? "z" : "t", a: String(m), b: String(s), c: String(n) } },
  };
};

export default gen;
