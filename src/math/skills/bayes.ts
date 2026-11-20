// Practice: Bayesian inference. Easy finds the posterior probability that a coin is the biased one after some tosses
// (prior × likelihood left unnormalised, the prior ignored, named); medium the posterior mean of p under a beta prior
// (successes and failures swapped, the prior ignored, named); hard the posterior mean of a normal mean or a Poisson
// rate (the two means averaged unweighted, the prior ignored, the rate left at β, named).
import { exact } from "../calculusTwo";
import { F, likelihood } from "../mathStats";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

function coinPart(r: Rng, w: PracticeWords): Part {
  const pb = F(...r.pick([[1, 4], [3, 4], [1, 3], [2, 3]] as [number, number][]));
  const prior = F(...r.pick([[1, 3], [1, 4], [2, 3], [1, 5], [3, 4]] as [number, number][]));
  const n = r.int(2, 4);
  const k = r.int(0, n);
  const lb = likelihood(pb, k, n);
  const la = likelihood(F(1, 2), k, n);
  const top = prior.mul(lb);
  const post = top.div(top.add(F(1).sub(prior).mul(la)));
  return {
    prompt: w.st.prompt.posteriorCoin,
    q: `P(H \\mid A) = \\tfrac{1}{2}, \\; P(H \\mid B) = ${pb.tex()}, \\quad P(B) = ${prior.tex()}, \\quad D: \\; ${k} \\, H, \\; ${n - k} \\, T`,
    ...exact(post, [["posteriorNotNormalised", top], ["priorIgnored", lb.div(lb.add(la))]]),
    steps: [
      `P(D \\mid B) = ${pb.texP()}^{${k}} \\cdot ${F(1).sub(pb).texP()}^{${n - k}} = ${lb.tex()}, \\quad P(D \\mid A) = \\left(\\tfrac{1}{2}\\right)^{${n}} = ${la.tex()}`,
      `P(B \\mid D) = \\frac{${prior.tex()} \\cdot ${lb.tex()}}{${prior.tex()} \\cdot ${lb.tex()} + ${F(1).sub(prior).tex()} \\cdot ${la.tex()}} = ${post.tex()}`,
    ],
  };
}

function betaPart(r: Rng, w: PracticeWords): Part {
  const a = r.int(1, 6);
  const b = r.int(1, 6);
  const n = r.int(5, 20);
  let k: number;
  do k = r.int(0, n);
  while (2 * k === n && a === b);
  const post = F(a + k, a + b + n);
  return {
    prompt: w.st.prompt.posteriorBeta,
    q: `p \\sim \\operatorname{Beta}(${a}, ${b}), \\quad k = ${k}, \\; n = ${n}`,
    ...exact(post, [["posteriorFailuresSwapped", F(a + n - k, a + b + n)], ["priorIgnored", F(k, n)]]),
    steps: [`p \\mid D \\sim \\operatorname{Beta}(${a} + ${k}, \\; ${b} + ${n - k}) = \\operatorname{Beta}(${a + k}, ${b + n - k})`, `E(p \\mid D) = \\frac{${a + k}}{${a + k} + ${b + n - k}} = ${post.tex()}`],
  };
}

function hardPart(r: Rng, w: PracticeWords): Part {
  if (r.next() < 0.5) {
    const t2 = r.pick([1, 2, 4]);
    const s2 = r.pick([4, 9, 16]);
    const n = r.int(2, 8);
    const m0 = r.int(0, 20);
    let xbar: number;
    do xbar = r.int(0, 30);
    while (xbar === m0);
    const pp = F(1, t2);
    const pd = F(n, s2);
    const post = pp.mul(F(m0)).add(pd.mul(F(xbar))).div(pp.add(pd));
    return {
      prompt: fill(w.st.prompt.posteriorMean, { p: "μ" }),
      q: `\\mu \\sim N(${m0}, ${t2}), \\quad X_i \\mid \\mu \\sim N(\\mu, ${s2}), \\quad n = ${n}, \\; \\bar{x} = ${xbar}`,
      ...exact(post, [["precisionsNotWeighted", F(m0 + xbar, 2)], ["priorIgnored", xbar]]),
      steps: [
        `\\frac{1}{\\tau^{2}} = ${pp.tex()}, \\quad \\frac{n}{\\sigma^{2}} = ${pd.tex()}`,
        `E(\\mu \\mid D) = \\frac{${pp.tex()} \\cdot ${m0} + ${pd.tex()} \\cdot ${xbar}}{${pp.tex()} + ${pd.tex()}} = ${post.tex()}`,
      ],
    };
  }
  const al = r.int(1, 6);
  const be = r.int(1, 4);
  const n = r.int(3, 6);
  const xs = Array.from({ length: n }, () => r.int(0, 8));
  const s = xs.reduce((x, y) => x + y, 0);
  const post = F(al + s, be + n);
  return {
    prompt: fill(w.st.prompt.posteriorMean, { p: "λ" }),
    q: `\\lambda \\sim \\operatorname{Gamma}(${al}, ${be}), \\quad X_i \\mid \\lambda \\sim \\operatorname{Poisson}(\\lambda): \\; ${xs.join(", ")}`,
    ...exact(post, [["priorIgnored", F(s, n)], ["posteriorRateNotUpdated", F(al + s, be)]]),
    steps: [`\\lambda \\mid D \\sim \\operatorname{Gamma}(${al} + ${s}, \\; ${be} + ${n})`, `E(\\lambda \\mid D) = \\frac{${al + s}}{${be + n}} = ${post.tex()}`],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? coinPart(r, w) : L === 2 ? betaPart(r, w) : hardPart(r, w));

export default gen;
