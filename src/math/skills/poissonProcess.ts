// Practice: the Poisson process. Easy finds P(N(t) = k) (the rate not scaled by t, the k! missed, named); medium the
// exponential gaps: the chance the first event comes after t (the distribution function for the tail, the rate read
// as the mean, named), the memoryless chance given a quiet start (the whole time used, named), or the mean time of the
// n-th event (nλ, named); hard splits a process (the rate not thinned, named) or races two (λ₁/λ₂, the means added,
// named).
import { exact } from "../calculusTwo";
import { dp3Of } from "../probTheory";
import { F, poissonPmf, seen } from "../stochastic";
import type { Frac } from "../fraction";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const TIMES = [F(1, 2), F(1), F(2), F(3)];
const SPLITS = [F(1, 2), F(1, 3), F(2, 3), F(1, 4), F(3, 4)];

/** e^{-μ} μ^k / k! written out. */
const pmfTex = (mu: Frac, k: number) => `e^{-${mu.tex()}} \\frac{${mu.d === 1 ? mu.tex() : `(${mu.tex()})`}^{${k}}}{${k}!}`;

function countPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const lambda = r.int(1, 4);
    const t = r.pick(TIMES);
    const mu = F(lambda).mul(t);
    if (mu.toNumber() < 1 || mu.toNumber() > 8) continue;
    const k = r.int(0, 5);
    const e = `P(N(${t.tex()}) = ${k})`;
    return {
      prompt: w.sp.prompt.poissonCount,
      q: `\\lambda = ${lambda}, \\quad ${e}`,
      ...dp3Of(poissonPmf(k, mu.toNumber()), e, seen(poissonPmf(k, mu.toNumber()), [
        ["poissonRateNotScaled", poissonPmf(k, lambda)],
        ["poissonFactorialMissed", Math.exp(-mu.toNumber()) * mu.toNumber() ** k],
      ])),
      steps: [`N(${t.tex()}) \\sim \\operatorname{Poisson}(\\lambda t) = \\operatorname{Poisson}(${mu.tex()})`, `${e} = ${pmfTex(mu, k)}`],
    };
  }
}

/** A rate and a time whose product is between 1/2 and 3. */
function rateTime(r: Rng) {
  for (;;) {
    const lambda = r.pick([F(1, 2), F(1, 3), F(2), F(3), F(3, 2)]);
    const t = r.pick([F(1), F(2), F(3), F(1, 2)]);
    const mu = lambda.mul(t).toNumber();
    if (mu >= 0.5 && mu <= 3) return { lambda, t, mu };
  }
}

function tailPart(r: Rng, w: PracticeWords): Part {
  const { lambda, t, mu } = rateTime(r);
  const e = `P(T_{1} > ${t.tex()})`;
  return {
    prompt: w.sp.prompt.expTail,
    q: `\\lambda = ${lambda.tex()}, \\quad ${e}`,
    ...dp3Of(Math.exp(-mu), e, seen(Math.exp(-mu), [["expCdfForTail", 1 - Math.exp(-mu)], ["expRateAsMean", Math.exp(-t.toNumber() / lambda.toNumber())]])),
    steps: [`T_{1} > t \\iff N(t) = 0`, `${e} = e^{-\\lambda t} = e^{-${lambda.mul(t).texP()}}`],
  };
}

function memorylessPart(r: Rng, w: PracticeWords): Part {
  const { lambda, t, mu } = rateTime(r);
  const s = r.int(1, 4);
  const e = `P(T_{1} > ${t.add(F(s)).tex()} \\mid T_{1} > ${s})`;
  return {
    prompt: w.sp.prompt.memoryless,
    q: `\\lambda = ${lambda.tex()}, \\quad ${e}`,
    ...dp3Of(Math.exp(-mu), e, seen(Math.exp(-mu), [["memorylessIgnored", Math.exp(-lambda.mul(t.add(F(s))).toNumber())], ["expCdfForTail", 1 - Math.exp(-mu)]])),
    steps: [`${e} = \\frac{e^{-\\lambda (s + t)}}{e^{-\\lambda s}} = e^{-\\lambda t}`, `e^{-${lambda.tex()} \\cdot ${t.texP()}} = e^{-${lambda.mul(t).texP()}}`],
  };
}

function nthPart(r: Rng, w: PracticeWords): Part {
  const lambda = r.int(2, 6);
  const n = r.int(2, 8);
  const m = F(n, lambda);
  return {
    prompt: w.sp.prompt.nthArrival,
    q: `\\lambda = ${lambda}, \\quad E(T_{${n}})`,
    ...exact(m, [["gammaMeanInverted", n * lambda]]),
    steps: [`T_{${n}} = G_{1} + \\cdots + G_{${n}}, \\quad E(G_{i}) = \\frac{1}{\\lambda}`, `E(T_{${n}}) = \\frac{${n}}{${lambda}} = ${m.tex()}`],
  };
}

function splitPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const lambda = r.int(2, 8);
    const p = r.pick(SPLITS);
    const t = r.int(1, 3);
    const mu = F(lambda * t).mul(p);
    if (mu.toNumber() < 1 || mu.toNumber() > 8) continue;
    const k = r.int(1, 5);
    const e = `P(B(${t}) = ${k})`;
    return {
      prompt: w.sp.prompt.split,
      q: `\\lambda = ${lambda}, \\quad p = ${p.tex()}, \\quad ${e}`,
      ...dp3Of(poissonPmf(k, mu.toNumber()), e, seen(poissonPmf(k, mu.toNumber()), [["splitRateNotThinned", poissonPmf(k, lambda * t)]])),
      steps: [`\\lambda p = ${lambda} \\cdot ${p.tex()} = ${F(lambda).mul(p).tex()}`, `B(${t}) \\sim \\operatorname{Poisson}(${mu.tex()})`, `${e} = ${pmfTex(mu, k)}`],
    };
  }
}

function racePart(r: Rng, w: PracticeWords): Part {
  const a = r.int(1, 6);
  let b: number;
  do b = r.int(1, 6);
  while (b === a);
  const q = `\\lambda_{1} = ${a}, \\quad \\lambda_{2} = ${b}`;
  if (r.next() < 0.5) {
    const v = F(a, a + b);
    return {
      prompt: w.sp.prompt.firstFrom,
      q,
      ...exact(v, [["competingRatioWrong", F(a, b)]]),
      steps: [`P(T^{(1)} < T^{(2)}) = \\frac{\\lambda_{1}}{\\lambda_{1} + \\lambda_{2}} = ${v.tex()}`],
    };
  }
  const v = F(1, a + b);
  return {
    prompt: w.sp.prompt.firstEither,
    q,
    ...exact(v, [["mergedMeansAdded", F(1, a).add(F(1, b))]]),
    steps: [`\\lambda_{1} + \\lambda_{2} = ${a + b}`, `E(\\min(T^{(1)}, T^{(2)})) = \\frac{1}{\\lambda_{1} + \\lambda_{2}} = ${v.tex()}`],
  };
}

const gen: Gen = (r, L, w) => {
  if (L === 1) return countPart(r, w);
  if (L === 2) return r.pick([tailPart, memorylessPart, nthPart])(r, w);
  return r.next() < 0.5 ? splitPart(r, w) : racePart(r, w);
};

export default gen;
