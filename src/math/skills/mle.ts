// Practice: Maximum likelihood. Easy estimates a Bernoulli p or a Poisson λ from a sample (the failures counted, the
// sum left undivided, named); medium an exponential rate or a geometric p, which is one over the mean (the mean itself,
// named); hard a normal variance or a uniform end point (the divisor n − 1, twice the mean as the method of moments
// gives, named).
import { exact } from "../calculusTwo";
import { F, meanOf, sxx } from "../mathStats";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const sample = (r: Rng, n: number, lo: number, hi: number) => Array.from({ length: n }, () => r.int(lo, hi));
const listed = (xs: number[]) => xs.join(", ");

function easyPart(r: Rng, w: PracticeWords): Part {
  if (r.next() < 0.5) {
    const n = r.int(6, 10);
    let xs: number[];
    do xs = sample(r, n, 0, 1);
    while (xs.every((x) => x === xs[0]) || 2 * xs.filter((x) => x === 1).length === n);
    const k = xs.filter((x) => x === 1).length;
    const p = F(k, n);
    return {
      prompt: w.st.prompt.mle,
      q: `X_i \\sim \\operatorname{Bernoulli}(p): \\; ${listed(xs)}, \\quad \\hat{p}`,
      ...exact(p, [["mleFailuresCounted", F(n - k, n)], ["mleSumNotMean", k]]),
      steps: [`\\ell(p) = ${k} \\ln p + ${n - k} \\ln(1 - p)`, `\\ell'(p) = \\frac{${k}}{p} - \\frac{${n - k}}{1 - p} = 0`, `\\hat{p} = \\frac{${k}}{${n}} = ${p.tex()}`],
    };
  }
  const n = r.int(4, 6);
  let xs: number[];
  do xs = sample(r, n, 0, 6);
  while (xs.every((x) => x === 0));
  const s = xs.reduce((a, b) => a + b, 0);
  const m = meanOf(xs);
  return {
    prompt: w.st.prompt.mle,
    q: `X_i \\sim \\operatorname{Poisson}(\\lambda): \\; ${listed(xs)}, \\quad \\hat{\\lambda}`,
    ...exact(m, [["mleSumNotMean", s]]),
    steps: [`\\ell(\\lambda) = ${s} \\ln \\lambda - ${n}\\lambda + c`, `\\ell'(\\lambda) = \\frac{${s}}{\\lambda} - ${n} = 0`, `\\hat{\\lambda} = \\frac{${s}}{${n}} = ${m.tex()}`],
  };
}

function ratePart(r: Rng, w: PracticeWords): Part {
  const geo = r.next() < 0.5;
  const n = r.int(3, 5);
  let xs: number[];
  do xs = sample(r, n, 1, geo ? 6 : 9);
  while (xs.reduce((a, b) => a + b, 0) === n);
  const s = xs.reduce((a, b) => a + b, 0);
  const v = F(n, s);
  if (geo)
    return {
      prompt: w.st.prompt.mle,
      q: `X_i \\sim \\operatorname{Geometric}(p), \\; P(X = x) = (1 - p)^{x - 1} p: \\; ${listed(xs)}, \\quad \\hat{p}`,
      ...exact(v, [["mleRateInverted", F(s, n)]]),
      steps: [`L(p) = p^{${n}} (1 - p)^{${s - n}}`, `\\frac{${n}}{p} - \\frac{${s - n}}{1 - p} = 0`, `\\hat{p} = \\frac{${n}}{${s}} = ${v.tex()}`],
    };
  return {
    prompt: w.st.prompt.mle,
    q: `X_i \\sim \\operatorname{Exp}(\\lambda), \\; f(x) = \\lambda e^{-\\lambda x}: \\; ${listed(xs)}, \\quad \\hat{\\lambda}`,
    ...exact(v, [["mleRateInverted", F(s, n)]]),
    steps: [`\\ell(\\lambda) = ${n} \\ln \\lambda - ${s}\\lambda`, `\\ell'(\\lambda) = \\frac{${n}}{\\lambda} - ${s} = 0`, `\\hat{\\lambda} = \\frac{${n}}{${s}} = ${v.tex()}`],
  };
}

function hardPart(r: Rng, w: PracticeWords): Part {
  const n = r.int(4, 6);
  if (r.next() < 0.5) {
    let xs: number[];
    do xs = sample(r, n, 1, 12);
    while (sxx(xs).isZero());
    const ss = sxx(xs);
    const v = ss.div(F(n));
    return {
      prompt: w.st.prompt.mle,
      q: `X_i \\sim N(\\mu, \\sigma^{2}): \\; ${listed(xs)}, \\quad \\hat{\\sigma}^{2}`,
      ...exact(v, [["mleBesselDivisor", ss.div(F(n - 1))]]),
      steps: [`\\hat{\\mu} = \\bar{x} = ${meanOf(xs).tex()}`, `\\sum (x_i - \\bar{x})^{2} = ${ss.tex()}`, `\\hat{\\sigma}^{2} = \\frac{1}{${n}} \\sum (x_i - \\bar{x})^{2} = ${v.tex()}`],
    };
  }
  let xs: number[];
  do xs = sample(r, n, 1, 20);
  while (meanOf(xs).mul(F(2)).toNumber() === Math.max(...xs));
  const top = Math.max(...xs);
  return {
    prompt: w.st.prompt.mle,
    q: `X_i \\sim U(0, \\theta): \\; ${listed(xs)}, \\quad \\hat{\\theta}`,
    ...exact(F(top), [["momentsForMle", meanOf(xs).mul(F(2))]]),
    steps: [`L(\\theta) = \\theta^{-${n}} \\; (\\theta \\ge ${top}), \\quad L(\\theta) = 0 \\; (\\theta < ${top})`, `\\frac{d}{d\\theta} \\theta^{-${n}} < 0`, `\\hat{\\theta} = \\max x_i = ${top}`],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? easyPart(r, w) : L === 2 ? ratePart(r, w) : hardPart(r, w));

export default gen;
