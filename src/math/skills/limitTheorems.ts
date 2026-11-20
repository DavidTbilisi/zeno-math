// Practice: The law of large numbers and the central limit theorem. Easy finds Var(X̄) = σ²/n or SD(X̄) = σ/√n (one
// X's spread, n and √n swapped, named); medium P(X̄ > c) or P(X̄ < c) by the CLT (σ for σ/√n, the other tail, named);
// hard a probability for a sum of n draws (nσ for σ√n, the other tail, named) or for a binomial by the normal
// approximation with continuity correction (the correction left out, the other tail, named).
import { exact } from "../calculusTwo";
import { dp3Of, F, Phi } from "../probTheory";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

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

const gen: Gen = (r, L, w) => (L === 1 ? spreadPart(r, w) : L === 2 ? cltPart(r, w) : r.int(0, 1) === 0 ? sumPart(r, w) : binomialPart(r, w));

export default gen;
