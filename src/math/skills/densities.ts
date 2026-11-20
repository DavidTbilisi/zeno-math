// Practice: Densities and distribution functions. Easy finds the constant k that makes f a density (k making the
// highest point 1, the integral not inverted, named); medium finds a probability from a uniform, a power or an
// exponential density (the length of the interval alone, f(c) for F(c), 1 − e^(−λt) for e^(−λt), the density's
// value, named); hard finds the mean (the midpoint, ∫ f for ∫ x f, λ for 1/λ, named).
import { exact } from "../calculusTwo";
import { dp3Of, F } from "../probTheory";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

/** k xⁿ (n ≥ 1) as TeX. */
const powTex = (n: number) => (n === 1 ? "x" : `x^{${n}}`);

function constantPart(r: Rng, w: PracticeWords): Part {
  const a = r.int(1, 4);
  if (r.int(0, 1) === 0) {
    const n = r.int(1, 3);
    const k = F(n + 1, a ** (n + 1));
    return {
      prompt: w.pt.prompt.constant,
      q: `f(x) = k${powTex(n)}, \\quad 0 \\le x \\le ${a}`,
      ...exact(k, [["densityHeightOne", F(1, a ** n)], ["constantNotInverted", F(a ** (n + 1), n + 1)]]),
      steps: [`\\int_{0}^{${a}} k${powTex(n)} \\, dx = k \\cdot \\frac{${a}^{${n + 1}}}{${n + 1}} = k \\cdot ${F(a ** (n + 1), n + 1).tex()} = 1`, `k = ${k.tex()}`],
    };
  }
  const b = a + 1;
  const k = F(6, b ** 3);
  return {
    prompt: w.pt.prompt.constant,
    q: `f(x) = kx(${b} - x), \\quad 0 \\le x \\le ${b}`,
    ...exact(k, [["densityHeightOne", F(4, b * b)], ["constantNotInverted", F(b ** 3, 6)]]),
    steps: [
      `\\int_{0}^{${b}} k(${b}x - x^{2}) \\, dx = k\\left[\\frac{${b}x^{2}}{2} - \\frac{x^{3}}{3}\\right]_{0}^{${b}} = k \\cdot \\frac{${b}^{3}}{6} = 1`,
      `k = ${k.tex()}`,
    ],
  };
}

function probabilityPart(r: Rng, w: PracticeWords): Part {
  const kind = r.int(0, 2);
  if (kind === 0) {
    const a = r.int(0, 5);
    const b = a + r.int(4, 12);
    const c = r.int(a, b - 3);
    const d = r.int(c + 2, b);
    if (c === a && d === b) return probabilityPart(r, w);
    const v = F(d - c, b - a);
    return {
      prompt: fill(w.pt.prompt.probability, { e: `${c} < X < ${d}` }),
      q: `X \\sim U(${a}, ${b})`,
      ...exact(v, [["uniformLengthOnly", d - c]]),
      steps: [`f(x) = \\frac{1}{${b} - ${a}} = ${F(1, b - a).tex()}, \\quad ${a} \\le x \\le ${b}`, `P(${c} < X < ${d}) = \\frac{${d} - ${c}}{${b - a}} = ${v.tex()}`],
    };
  }
  if (kind === 1) {
    const a = r.int(2, 5);
    const n = r.int(1, 3);
    const c = r.int(1, a - 1);
    const k = F(n + 1, a ** (n + 1));
    const v = F(c ** (n + 1), a ** (n + 1));
    return {
      prompt: fill(w.pt.prompt.probability, { e: `X < ${c}` }),
      q: `f(x) = ${k.tex()}${powTex(n)}, \\quad 0 \\le x \\le ${a}`,
      ...exact(v, [["cdfIsDensity", k.mul(F(c ** n))]]),
      steps: [`F(x) = \\int_{0}^{x} ${k.tex()}t^{${n}} \\, dt = \\frac{x^{${n + 1}}}{${a ** (n + 1)}}`, `P(X < ${c}) = F(${c}) = \\frac{${c}^{${n + 1}}}{${a ** (n + 1)}} = ${v.tex()}`],
    };
  }
  const lam = r.pick([F(1, 2), F(1), F(2), F(1, 4), F(3), F(1, 5)]);
  const t = r.pick([1, 2, 3, 4, 5, 6, 8, 10].filter((x) => lam.toNumber() * x >= 0.4 && lam.toNumber() * x <= 3));
  const lt = lam.mul(F(t)).toNumber();
  const v = Math.exp(-lt);
  return {
    prompt: fill(w.pt.prompt.probability, { e: `X > ${t}` }),
    q: `X \\sim \\operatorname{Exp}(${lam.tex()}), \\quad f(x) = ${lam.isOne() ? "" : lam.tex()}e^{-${lam.isOne() ? "" : lam.tex()}x}, \\; x \\ge 0`,
    ...dp3Of(v, `e^{-${lt}}`, [["exponentialCdfForSurvival", 1 - v], ["densityForProbability", lam.toNumber() * v]]),
    steps: [`P(X > ${t}) = \\int_{${t}}^{\\infty} ${lam.isOne() ? "" : lam.tex()}e^{-${lam.isOne() ? "" : lam.tex()}x} \\, dx = e^{-${lam.tex()} \\cdot ${t}} = e^{-${lt}}`, `e^{-${lt}} \\approx ${v.toFixed(4)}`],
  };
}

function meanPart(r: Rng, w: PracticeWords): Part {
  if (r.int(0, 2) > 0) {
    const a = r.int(1, 6);
    const n = r.int(1, 3);
    const k = F(n + 1, a ** (n + 1));
    const v = F((n + 1) * a, n + 2);
    return {
      prompt: w.pt.prompt.mean,
      q: `f(x) = ${k.tex()}${powTex(n)}, \\quad 0 \\le x \\le ${a}`,
      ...exact(v, [["meanIsMidpoint", F(a, 2)], ["expectationWithoutX", 1]]),
      steps: [
        `E(X) = \\int_{0}^{${a}} x \\cdot ${k.tex()}${powTex(n)} \\, dx = ${k.tex()} \\cdot \\frac{${a}^{${n + 2}}}{${n + 2}}`,
        `E(X) = ${v.tex()}`,
      ],
    };
  }
  const lam = r.pick([F(2), F(3), F(4), F(5), F(1, 2), F(1, 3), F(2, 3), F(3, 2)]);
  const v = F(1).div(lam);
  return {
    prompt: w.pt.prompt.mean,
    q: `X \\sim \\operatorname{Exp}(${lam.tex()}), \\quad f(x) = ${lam.tex()}e^{-${lam.tex()}x}, \\; x \\ge 0`,
    ...exact(v, [["exponentialMeanIsRate", lam]]),
    steps: [`E(X) = \\int_{0}^{\\infty} x \\cdot ${lam.tex()}e^{-${lam.tex()}x} \\, dx = \\frac{1}{\\lambda}`, `E(X) = \\frac{1}{${lam.tex()}} = ${v.tex()}`],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? constantPart(r, w) : L === 2 ? probabilityPart(r, w) : meanPart(r, w));

export default gen;
