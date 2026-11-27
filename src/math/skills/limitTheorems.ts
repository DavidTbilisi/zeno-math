// Practice: The law of large numbers and the central limit theorem. Easy finds Var(X̄) = σ²/n or SD(X̄) = σ/√n (one
// X's spread, n and √n swapped, named); medium P(X̄ > c) or P(X̄ < c) by the CLT (σ for σ/√n, the other tail, named);
// hard a probability for a sum of n draws (nσ for σ√n, the other tail, named) or for a binomial by the normal
// approximation with continuity correction (the correction left out, the other tail, named). #743 adds, on half the
// seeds: statistics and parameters, a biased and an unbiased estimator, the standard deviation of a sample proportion
// and when its sampling distribution is close to normal (L1); a probability for a sample proportion, the standard
// deviation of a difference of sample proportions and the shape of its sampling distribution (L2); then a new setting,
// two factories' bolts, the standard deviation of a difference of sample means and a probability for it (L3).
import { exact } from "../calculusTwo";
import { numPart, shuffled, tf } from "../partKit";
import { dp } from "../practiceKit";
import { dp3Of, F, Phi } from "../probTheory";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";

const ROOTS = [2, 3, 4, 5, 6, 7, 8, 10];

function spreadPart(r: Rng, w: PracticeWords): Part {
  const k = r.pick(ROOTS);
  const n = k * k;
  const s = r.int(2, 30);
  if (r.int(0, 1) === 0) {
    const v = F(s * s, n);
    return {
      prompt: fill(w.pt.prompt.meanVar, { n }),
      q: `\\operatorname{Var}(X_i) = ${s * s}, \\quad n = ${n}`,
      ...exact(v, [["varianceNotDivided", s * s], ["rootNConfused", F(s * s, k)]]),
      steps: [`\\operatorname{Var}(\\bar{X}) = \\frac{1}{n^{2}} \\sum \\operatorname{Var}(X_i) = \\frac{\\sigma^{2}}{n} = \\frac{${s * s}}{${n}} = ${v.tex()}`],
    };
  }
  const v = F(s, k);
  return {
    prompt: fill(w.pt.prompt.meanSd, { n }),
    q: `\\sigma = ${s}, \\quad n = ${n}`,
    ...exact(v, [["varianceNotDivided", s], ["rootNConfused", F(s, n)]]),
    steps: [`\\operatorname{SD}(\\bar{X}) = \\sqrt{\\frac{\\sigma^{2}}{n}} = \\frac{\\sigma}{\\sqrt{n}} = \\frac{${s}}{${k}} = ${v.tex()}`],
  };
}

/** P(above c) or P(below c) for N(m, sd²), with the z worked out. */
function tail(m: number, sd: number, c: number, above: boolean) {
  const z = (c - m) / sd;
  return { z, v: above ? 1 - Phi(z) : Phi(z) };
}

function cltPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const k = r.pick([4, 5, 6, 7, 8, 10]);
    const n = k * k;
    const s = k * r.int(1, 6);
    const mu = r.int(10, 90);
    const se = s / k;
    const c = mu + r.pick([-1, 1]) * se * r.pick([0.5, 1, 1.5, 2, 2.5]);
    if (!Number.isInteger(c)) continue;
    const above = r.int(0, 1) === 0;
    const { z, v } = tail(mu, se, c, above);
    const e = `\\bar{X} ${above ? ">" : "<"} ${c}`;
    return {
      prompt: fill(w.pt.prompt.cltMean, { n, e: `X̄ ${above ? ">" : "<"} ${c}` }),
      q: `\\mu = ${mu}, \\quad \\sigma = ${s}, \\quad n = ${n}, \\quad P(${e})`,
      ...dp3Of(v, `P(${e})`, [["cltForgotRootN", tail(mu, s, c, above).v], ["normalWrongTail", 1 - v]]),
      steps: [
        `\\bar{X} \\approx N\\left(${mu}, \\frac{${s}^{2}}{${n}}\\right), \\quad \\frac{\\sigma}{\\sqrt{n}} = \\frac{${s}}{${k}} = ${se}`,
        `z = \\frac{${c} - ${mu}}{${se}} = ${z}`,
        `P(${e}) = ${above ? `1 - \\Phi(${z})` : `\\Phi(${z})`} \\approx ${v.toFixed(4)}`,
      ],
    };
  }
}

function sumPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const k = r.pick([4, 5, 6, 8, 10]);
    const n = k * k;
    const mu = r.int(2, 9);
    const s = r.int(1, 4);
    const sd = s * k;
    const c = n * mu + r.pick([-1, 1]) * sd * r.pick([0.5, 1, 1.5, 2]);
    if (!Number.isInteger(c)) continue;
    const above = r.int(0, 1) === 0;
    const { z, v } = tail(n * mu, sd, c, above);
    const e = `S ${above ? ">" : "<"} ${c}`;
    return {
      prompt: fill(w.pt.prompt.cltSum, { n, e }),
      q: `E(X_i) = ${mu}, \\quad \\operatorname{SD}(X_i) = ${s}, \\quad S = X_1 + \\dots + X_{${n}}`,
      ...dp3Of(v, `P(${e})`, [["sumSdLinear", tail(n * mu, n * s, c, above).v], ["normalWrongTail", 1 - v]]),
      steps: [
        `E(S) = ${n} \\cdot ${mu} = ${n * mu}, \\quad \\operatorname{SD}(S) = ${s}\\sqrt{${n}} = ${sd}`,
        `z = \\frac{${c} - ${n * mu}}{${sd}} = ${z}`,
        `P(${e}) = ${above ? `1 - \\Phi(${z})` : `\\Phi(${z})`} \\approx ${v.toFixed(4)}`,
      ],
    };
  }
}

const APPROX: [number, number, number][] = [[100, 1, 2], [400, 1, 2], [64, 1, 2], [144, 1, 2], [100, 1, 5], [225, 1, 5], [400, 1, 5], [100, 1, 10], [900, 1, 10]];

function binomialPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const [n, pn, pd] = r.pick(APPROX);
    const m = (n * pn) / pd;
    const sd = Math.sqrt((m * (pd - pn)) / pd);
    const k = m + r.int(-2, 2) * Math.round(sd / 2) + r.int(-1, 1);
    if (k === m) continue;
    const atMost = r.int(0, 1) === 0;
    const c = atMost ? k + 0.5 : k - 0.5;
    const { z, v } = tail(m, sd, c, !atMost);
    const e = `X ${atMost ? "\\le" : "\\ge"} ${k}`;
    return {
      prompt: fill(w.pt.prompt.binomApprox, { e: `X ${atMost ? "≤" : "≥"} ${k}` }),
      q: `X \\sim B(${n}, ${pd === 1 ? pn : `\\frac{${pn}}{${pd}}`})`,
      ...dp3Of(v, `P(${e})`, [["continuityCorrectionMissed", tail(m, sd, k, !atMost).v], ["normalWrongTail", 1 - v]]),
      steps: [
        `np = ${m}, \\quad \\sqrt{np(1 - p)} = ${sd}, \\quad X \\approx N(${m}, ${sd * sd})`,
        `P(${e}) \\approx P(Y ${atMost ? "<" : ">"} ${c}), \\quad z = \\frac{${c} - ${m}}{${sd}} = ${Math.round(z * 1000) / 1000}`,
        `P(${e}) \\approx ${atMost ? `\\Phi(${Math.round(z * 1000) / 1000})` : `1 - \\Phi(${Math.round(z * 1000) / 1000})`} \\approx ${v.toFixed(4)}`,
      ],
    };
  }
}

/** Answers to 3 places; a slip within CLEAR of the answer would read as rounding. */
const TOL = 0.0006;
const CLEAR = 21 * TOL;
/** A proportion p and a sample size n whose p̂ has a whole standard deviation sd. */
const PHAT: [number, number, number][] = [[0.5, 100, 0.05], [0.2, 100, 0.04], [0.1, 100, 0.03], [0.2, 400, 0.02], [0.5, 400, 0.025], [0.4, 150, 0.04], [0.6, 150, 0.04], [0.1, 225, 0.02], [0.3, 84, 0.05]];
/** Two groups' σ and n whose difference of means has a round standard deviation. */
const TWO: [number, number, number, number][] = [[6, 25, 8, 25], [3, 25, 4, 25], [9, 36, 12, 36], [12, 16, 16, 16], [6, 12, 6, 36], [15, 25, 20, 25], [24, 36, 15, 25], [9, 9, 8, 4]];
type Slip = { id: Trap["id"]; at: number; vars?: Record<string, string | number> };
const round = (v: number, k = 4) => Number(v.toFixed(k));

/** Is a sampling distribution close to normal? Every count must reach 10; a sample under 30 is no reason by itself. */
function shapePart(r: Rng, w: PracticeWords, counts: number[], small: boolean, prompt: string, step: string): Part {
  const K = w.ltK;
  const short = counts.filter((c) => c < 10);
  const right = short.length ? 1 : 0;
  const list = counts.join(", ");
  const traps: Slip[] = right
    ? [counts.length === 2 ? { id: "conditionsOneSide", at: 0, vars: { a: counts[0], b: counts[1] } } : { id: "normalCountMissed", at: 0, vars: { list, low: short[0] } }]
    : small ? [{ id: "normalNeedsThirty", at: 2, vars: { list } }] : [];
  return shuffled(r, [K.shYes, K.shNo, K.shThirty], right, traps, prompt, [step]);
}

function more(r: Rng, L: 1 | 2 | 3, w: PracticeWords): Part {
  const K = w.ltK;
  if (L === 1) {
    const t = r.pick(["stat", "unbiased", "phatSd", "shape"] as const);
    if (t === "stat") {
      const k = r.int(0, 3);
      const right = k < 2 ? 0 : 1;
      const v = [K.st0v, K.st1v, K.st2v, K.st3v][k];
      const vars = { v, who: right ? K.whoPop : K.whoSample };
      return shuffled(r, [K.optStat, K.optParam], right, [{ id: "statisticParameterSwapped", at: 1 - right, vars }], fill(K.statQ, { s: [K.st0, K.st1, K.st2, K.st3][k], v }), [right ? "\\mu, \\; p, \\; \\sigma" : "\\bar x, \\; \\hat p, \\; s"]);
    }
    if (t === "unbiased") {
      const mu = r.pick([20, 50, 80]);
      const off = r.pick([3, 4, 5]) * r.pick([-1, 1]);
      const est = [{ m: mu, s: r.int(6, 9) }, { m: mu + off, s: r.int(1, 3) }, { m: mu - off, s: r.int(6, 9) }];
      const opts = est.map((e, i) => fill(K.estOpt, { n: "ABC"[i], m: e.m, s: e.s }));
      const vars = { mu, m: est[1].m };
      return shuffled(r, opts, 0, [{ id: "lowSpreadAsUnbiased", at: 1, vars }], fill(K.unbiasedQ, { mu }), [`E(\\hat\\theta) = \\mu = ${mu}`]);
    }
    if (t === "phatSd") {
      for (;;) {
        const p = r.pick([0.1, 0.2, 0.3, 0.4, 0.6, 0.7]);
        const n = r.pick([50, 80, 120, 200, 250, 500]);
        const v = Math.sqrt((p * (1 - p)) / n);
        const vars = { p, n, v: dp(v, 3) };
        const traps = [tf("phatSdNoRoot", (p * (1 - p)) / n, vars, TOL), tf("phatCountSd", Math.sqrt(n * p * (1 - p)), vars, TOL)];
        if (Math.abs((p * (1 - p)) / n - v) <= CLEAR) continue;
        return numPart(fill(K.phatSdQ, { p, n }), v, traps, [`\\mu_{\\hat p} = ${p}`, `\\sigma_{\\hat p} = \\sqrt{\\frac{${p}(1 - ${p})}{${n}}} = ${dp(v, 3)}`], TOL);
      }
    }
    const kind = r.int(0, 2);
    const [p, n] = kind === 0 ? r.pick([[0.5, 24], [0.5, 26], [0.4, 28], [0.6, 28]]) : kind === 1 ? r.pick([[0.05, 120], [0.04, 150], [0.06, 100], [0.08, 100]]) : r.pick([[0.95, 120], [0.96, 150], [0.94, 100], [0.92, 100]]);
    const a = round(n * p, 2);
    const b = round(n * (1 - p), 2);
    return shapePart(r, w, [a, b], kind === 0, fill(K.shapeQ, { p, n }), `np = ${a}, \\quad n(1 - p) = ${b}`);
  }
  if (L === 2) {
    const t = r.pick(["phatP", "diffSd", "diffShape"] as const);
    if (t === "phatP") {
      const [p, n, sd] = r.pick(PHAT);
      const z = r.pick([-1, 1]) * r.pick([0.5, 1, 1.5, 2, 2.5]);
      const c = round(p + z * sd);
      const above = r.next() < 0.5;
      const v = above ? 1 - Phi(z) : Phi(z);
      const wide = Math.sqrt(p * (1 - p));
      const zw = (c - p) / wide;
      const vars = { p, n, sd, z, v: dp(v, 3) };
      const e = `\\hat p ${above ? ">" : "<"} ${c}`;
      return numPart(fill(K.phatPQ, { p, n, e: `p̂ ${above ? ">" : "<"} ${c}` }), v, [tf("phatForgotN", above ? 1 - Phi(zw) : Phi(zw), vars, TOL), tf("normalWrongTail", 1 - v, vars, TOL)],
        [`\\sigma_{\\hat p} = \\sqrt{\\frac{${p}(1 - ${p})}{${n}}} = ${sd}`, `z = \\frac{${c} - ${p}}{${sd}} = ${z}`, `P(${e}) \\approx ${dp(v, 3)}`], TOL);
    }
    const [p1, n1, p2, n2] = r.pick([[0.3, 100, 0.2, 150], [0.6, 200, 0.5, 100], [0.4, 120, 0.25, 80], [0.15, 200, 0.1, 300], [0.7, 90, 0.55, 110], [0.08, 60, 0.12, 50], [0.05, 150, 0.1, 80]]);
    if (t === "diffShape") {
      const counts = [n1 * p1, n1 * (1 - p1), n2 * p2, n2 * (1 - p2)].map((x) => round(x, 2));
      return shapePart(r, w, counts, false, fill(K.diffShapeQ, { p1, n1, p2, n2 }), `${counts.join(", \\; ")}`);
    }
    const [a, b] = [(p1 * (1 - p1)) / n1, (p2 * (1 - p2)) / n2];
    const v = Math.sqrt(a + b);
    const vars = { a: dp(a, 5), b: dp(b, 5), v: dp(v, 3) };
    return numPart(fill(K.diffSdQ, { p1, n1, p2, n2 }), v, [tf("diffSdAdded", Math.sqrt(a) + Math.sqrt(b), vars, TOL), tf("diffVarSubtracted", Math.sqrt(Math.abs(a - b)), vars, TOL)],
      [`\\mu = ${p1} - ${p2} = ${round(p1 - p2, 2)}`, `\\sigma = \\sqrt{\\frac{${p1}(1 - ${p1})}{${n1}} + \\frac{${p2}(1 - ${p2})}{${n2}}} = ${dp(v, 3)}`], TOL);
  }
  // A new setting: bolts from two factories, the difference of their sample means.
  const [s1, n1, s2, n2] = r.pick(TWO);
  const [a, b] = [(s1 * s1) / n1, (s2 * s2) / n2];
  const sd = Math.sqrt(a + b);
  const vars = { a: round(a), b: round(b), v: round(sd) };
  const steps = [`\\sigma = \\sqrt{\\frac{${s1}^2}{${n1}} + \\frac{${s2}^2}{${n2}}} = \\sqrt{${round(a)} + ${round(b)}} = ${round(sd)}`];
  if (r.next() < 0.5) {
    return numPart(fill(K.boltSdQ, { s1, n1, s2, n2 }), sd, [tf("diffSdAdded", Math.sqrt(a) + Math.sqrt(b), vars, TOL), tf("diffVarSubtracted", Math.sqrt(Math.abs(a - b)), vars, TOL)], steps, TOL);
  }
  const k = r.pick([0.5, 1, 1.5, 2]);
  const d = round(k * sd * r.pick([-1, 1]), 2);
  const m2 = r.int(40, 60);
  const m1 = round(m2 + d, 2);
  const v = 1 - Phi(-d / sd);
  const added = Math.sqrt(a) + Math.sqrt(b);
  const pv = { ...vars, z: round(-d / sd, 2), p: dp(v, 3) };
  return numPart(fill(K.boltPQ, { s1, n1, s2, n2, m1, m2 }), v, [tf("diffSdAdded", 1 - Phi(-d / added), pv, TOL), tf("normalWrongTail", 1 - v, pv, TOL)],
    [`\\mu = ${m1} - ${m2} = ${d}`, ...steps, `P(\\bar x_1 - \\bar x_2 > 0) = P\\left(Z > \\frac{0 - ${d}}{${round(sd)}}\\right) = 1 - \\Phi(${round(-d / sd, 2)}) \\approx ${dp(v, 3)}`], TOL);
}

const gen: Gen = (r, L, w) => (r.int(0, 9) >= 5 ? more(r, L, w) : L === 1 ? spreadPart(r, w) : L === 2 ? cltPart(r, w) : r.int(0, 1) === 0 ? sumPart(r, w) : binomialPart(r, w));

export default gen;
