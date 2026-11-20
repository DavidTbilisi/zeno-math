// Practice: Estimators. Easy finds the bias E(θ̂) − θ of a scaled sum or of the variance with divisor n (the sign
// flipped, E(θ̂) itself, the divisor-n variance called unbiased, named); medium the mean squared error of a weighted
// sum of two draws (the weights not squared in the variance, the bias not squared, named); hard says whether an
// estimator is consistent (unbiased taken for consistent, biased taken for inconsistent, named).
import { exact, pickOf, word } from "../calculusTwo";
import { F } from "../mathStats";
import type { MistakeId } from "../mistakes";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

function biasPart(r: Rng, w: PracticeWords): Part {
  if (r.next() < 0.6) {
    const n = r.int(3, 6);
    const k = r.int(1, 2);
    const mu = r.int(2, 9);
    const e = F(n * mu, n + k);
    const bias = e.sub(F(mu));
    return {
      prompt: w.st.prompt.bias,
      q: `E(X_i) = \\mu = ${mu}, \\quad n = ${n}, \\quad \\hat{\\mu} = \\frac{X_1 + \\dots + X_{${n}}}{${n + k}}`,
      ...exact(bias, [["biasSignFlipped", bias.neg()], ["biasIsExpectation", e]]),
      steps: [`E(\\hat{\\mu}) = \\frac{${n}\\mu}{${n + k}} = ${e.tex()}`, `E(\\hat{\\mu}) - \\mu = ${e.tex()} - ${mu} = ${bias.tex()}`],
    };
  }
  const n = r.int(3, 8);
  const s2 = n * r.int(1, 6);
  const e = F((n - 1) * s2, n);
  const bias = e.sub(F(s2));
  return {
    prompt: w.st.prompt.bias,
    q: `\\operatorname{Var}(X_i) = \\sigma^{2} = ${s2}, \\quad n = ${n}, \\quad \\hat{\\sigma}^{2} = \\frac{1}{n} \\sum (X_i - \\bar{X})^{2}`,
    ...exact(bias, [["divisorNUnbiased", 0], ["biasSignFlipped", bias.neg()], ["biasIsExpectation", e]]),
    steps: [
      `E\\left(\\sum (X_i - \\bar{X})^{2}\\right) = (n - 1)\\sigma^{2}`,
      `E(\\hat{\\sigma}^{2}) = \\frac{${n - 1}}{${n}} \\cdot ${s2} = ${e.tex()}`,
      `${e.tex()} - ${s2} = ${bias.tex()}`,
    ],
  };
}

const WEIGHTS: [number, number][][] = [
  [[1, 2], [1, 2]],
  [[1, 4], [3, 4]],
  [[1, 3], [1, 3]],
  [[2, 3], [2, 3]],
  [[1, 3], [2, 3]],
  [[1, 2], [1, 4]],
  [[3, 4], [3, 4]],
];

function msePart(r: Rng, w: PracticeWords): Part {
  const [[an, ad], [bn, bd]] = r.pick(WEIGHTS);
  const [a, b] = [F(an, ad), F(bn, bd)];
  const mu = r.int(2, 9);
  const s2 = r.int(1, 9);
  const bias = a.add(b).sub(F(1)).mul(F(mu));
  const v = a.mul(a).add(b.mul(b)).mul(F(s2));
  const mse = v.add(bias.mul(bias));
  return {
    prompt: w.st.prompt.mse,
    q: `E(X_i) = ${mu}, \\quad \\operatorname{Var}(X_i) = ${s2}, \\quad \\hat{\\mu} = ${a.tex()} X_1 + ${b.tex()} X_2`,
    ...exact(mse, [["weightsNotSquared", a.add(b).mul(F(s2)).add(bias.mul(bias))], ["mseBiasNotSquared", v.add(bias)]]),
    steps: [
      `\\operatorname{Bias} = \\left(${a.tex()} + ${b.tex()} - 1\\right) \\cdot ${mu} = ${bias.tex()}`,
      `\\operatorname{Var}(\\hat{\\mu}) = \\left(${a.tex()}^{2} + ${b.tex()}^{2}\\right) \\cdot ${s2} = ${v.tex()}`,
      `\\operatorname{MSE} = \\operatorname{Var} + \\operatorname{Bias}^{2} = ${v.tex()} + ${bias.texP()}^{2} = ${mse.tex()}`,
    ],
  };
}

function consistentPart(r: Rng, w: PracticeWords): Part {
  const k = r.int(1, 5);
  const iid = "E(X_i) = \\mu, \\; \\operatorname{Var}(X_i) = \\sigma^{2}";
  const cases: { q: string; right: 0 | 1; slip?: MistakeId; steps: string[] }[] = [
    { q: `${iid}, \\quad \\hat{\\theta}_n = \\bar{X}_n \\; (\\theta = \\mu)`, right: 0, steps: ["E(\\bar{X}_n) = \\mu", "\\operatorname{Var}(\\bar{X}_n) = \\frac{\\sigma^{2}}{n} \\to 0"] },
    { q: `${iid}, \\quad \\hat{\\theta}_n = X_1 \\; (\\theta = \\mu)`, right: 1, slip: "unbiasedMeansConsistent", steps: ["E(X_1) = \\mu", "\\operatorname{Var}(X_1) = \\sigma^{2} \\not\\to 0"] },
    { q: `${iid}, \\quad \\hat{\\theta}_n = \\frac{X_1 + X_n}{2} \\; (\\theta = \\mu)`, right: 1, slip: "unbiasedMeansConsistent", steps: ["E(\\hat{\\theta}_n) = \\mu", "\\operatorname{Var}(\\hat{\\theta}_n) = \\frac{\\sigma^{2}}{2} \\not\\to 0"] },
    { q: `${iid}, \\quad \\hat{\\theta}_n = \\frac{n}{n + ${k}} \\bar{X}_n \\; (\\theta = \\mu)`, right: 0, slip: "biasedMeansInconsistent", steps: [`E(\\hat{\\theta}_n) - \\mu = -\\frac{${k}\\mu}{n + ${k}} \\to 0`, `\\operatorname{Var}(\\hat{\\theta}_n) \\le \\frac{\\sigma^{2}}{n} \\to 0`] },
    { q: `${iid}, \\quad \\hat{\\theta}_n = \\bar{X}_n + \\frac{${k}}{n} \\; (\\theta = \\mu)`, right: 0, slip: "biasedMeansInconsistent", steps: [`E(\\hat{\\theta}_n) - \\mu = \\frac{${k}}{n} \\to 0`, "\\operatorname{Var}(\\hat{\\theta}_n) = \\frac{\\sigma^{2}}{n} \\to 0"] },
    { q: `${iid}, \\quad \\hat{\\theta}_n = \\frac{1}{n} \\sum (X_i - \\bar{X}_n)^{2} \\; (\\theta = \\sigma^{2})`, right: 0, slip: "biasedMeansInconsistent", steps: ["E(\\hat{\\theta}_n) - \\sigma^{2} = -\\frac{\\sigma^{2}}{n} \\to 0", "\\hat{\\theta}_n = \\overline{X^{2}}_n - \\bar{X}_n^{2} \\to E(X^{2}) - \\mu^{2} = \\sigma^{2}"] },
    { q: "X_i \\sim U(0, \\theta), \\quad \\hat{\\theta}_n = \\max X_i", right: 0, slip: "biasedMeansInconsistent", steps: ["E(\\hat{\\theta}_n) = \\frac{n}{n + 1}\\theta \\to \\theta", "P(\\hat{\\theta}_n < \\theta - \\varepsilon) = \\left(1 - \\frac{\\varepsilon}{\\theta}\\right)^{n} \\to 0"] },
    { q: `${iid}, \\quad \\hat{\\theta}_n = \\bar{X}_n + ${k} \\; (\\theta = \\mu)`, right: 1, steps: [`\\hat{\\theta}_n \\to \\mu + ${k} \\ne \\mu`] },
  ];
  const s = r.pick(cases);
  const options = [word(w.st.consistent), word(w.st.notConsistent)];
  return { prompt: w.st.prompt.consistent, q: s.q, ...pickOf(options, s.right, s.slip ? [[s.slip, 1 - s.right]] : []), steps: s.steps };
}

const gen: Gen = (r, L, w) => (L === 1 ? biasPart(r, w) : L === 2 ? msePart(r, w) : consistentPart(r, w));

export default gen;
