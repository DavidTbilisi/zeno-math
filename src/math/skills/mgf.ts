// Practice: Moment generating functions. Easy finds E(X) = M′(0) from a binomial, Poisson, exponential or normal MGF
// (M(0) = 1 for M′(0), named); medium Var(X) = M″(0) − M′(0)² (E(X²) for the variance, named); hard the variance of
// aX ± bY for independent normals (the variances subtracted, a and b not squared, named) or the parameter of a sum of
// independent binomials or Poissons (the parameters multiplied, named).
import { exact } from "../calculusTwo";
import { F } from "../probTheory";
import { fill } from "../text";
import type { Frac } from "../fraction";
import type { NumSlip } from "../calculusTwo";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

type Family = { M: string; dM: string; mean: Frac; second: Frac; name: string };

const lin = (k: number, v = "t") => (k === 1 ? v : k === -1 ? `-${v}` : `${k}${v}`);
/** kt + in an exponent, or nothing when k = 0. */
const linPlus = (k: number) => (k === 0 ? "" : `${lin(k)} + `);

function familyOf(r: Rng): Family {
  const kind = r.int(0, 3);
  if (kind === 0) {
    const p = r.pick([F(1, 2), F(1, 3), F(2, 3), F(1, 4), F(3, 4), F(1, 5), F(2, 5)]);
    const q = F(1).sub(p);
    const n = r.int(3, 12);
    const mean = p.mul(F(n));
    return {
      M: `\\left(${q.tex()} + ${p.tex()}e^{t}\\right)^{${n}}`,
      dM: `${n} \\cdot ${p.tex()}e^{t}\\left(${q.tex()} + ${p.tex()}e^{t}\\right)^{${n - 1}}`,
      mean,
      second: mean.mul(q).add(mean.mul(mean)),
      name: `B(${n}, ${p.tex()})`,
    };
  }
  if (kind === 1) {
    const l = r.int(2, 9);
    return { M: `e^{${l}(e^{t} - 1)}`, dM: `${l}e^{t}e^{${l}(e^{t} - 1)}`, mean: F(l), second: F(l + l * l), name: `\\operatorname{Po}(${l})` };
  }
  if (kind === 2) {
    const l = r.int(2, 5);
    return { M: `\\frac{${l}}{${l} - t}`, dM: `\\frac{${l}}{(${l} - t)^{2}}`, mean: F(1, l), second: F(2, l * l), name: `\\operatorname{Exp}(${l})` };
  }
  const mu = r.pick([-5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8, 9]);
  const s2 = r.int(1, 16);
  const half = F(s2, 2);
  const quad = `${half.isOne() ? "" : half.tex()}t^{2}`;
  return {
    M: `e^{${lin(mu)} + ${quad}}`,
    dM: `(${mu} + ${s2 === 1 ? "" : s2}t)e^{${lin(mu)} + ${quad}}`,
    mean: F(mu),
    second: F(s2 + mu * mu),
    name: `N(${mu}, ${s2})`,
  };
}

function meanPart(r: Rng, w: PracticeWords): Part {
  const f = familyOf(r);
  return {
    prompt: w.pt.prompt.mgfMean,
    q: `M_X(t) = ${f.M}`,
    ...exact(f.mean, [["mgfAtZero", 1]]),
    steps: [`M_X'(t) = ${f.dM}`, `E(X) = M_X'(0) = ${f.mean.tex()}`],
  };
}

function variancePart(r: Rng, w: PracticeWords): Part {
  const f = familyOf(r);
  const v = f.second.sub(f.mean.mul(f.mean));
  return {
    prompt: w.pt.prompt.mgfVar,
    q: `M_X(t) = ${f.M}`,
    ...exact(v, [["secondMomentAsVariance", f.second]]),
    steps: [
      `X \\sim ${f.name}: \\quad E(X) = M_X'(0) = ${f.mean.tex()}`,
      `E(X^{2}) = M_X''(0) = ${f.second.tex()}`,
      `\\operatorname{Var}(X) = ${f.second.tex()} - \\left(${f.mean.tex()}\\right)^{2} = ${v.tex()}`,
    ],
  };
}

function comboPart(r: Rng, w: PracticeWords): Part {
  const [m1, m2] = [r.int(-5, 9), r.int(-5, 9)];
  const [s1, s2] = [r.int(1, 9), r.int(1, 9)];
  const [a, b] = [r.int(1, 4), r.int(1, 4)];
  const minus = r.int(0, 1) === 0;
  const v = a * a * s1 + b * b * s2;
  const m = a * m1 + (minus ? -b : b) * m2;
  const slips: NumSlip[] = [["coefficientsNotSquared", a * s1 + b * s2]];
  if (minus) slips.unshift(["varianceSubtracted", a * a * s1 - b * b * s2]);
  const W = `${lin(a, "X")} ${minus ? "-" : "+"} ${lin(b, "Y")}`;
  return {
    prompt: w.pt.prompt.combo,
    q: `X \\sim N(${m1}, ${s1}), \\quad Y \\sim N(${m2}, ${s2}), \\quad W = ${W}`,
    ...exact(F(v), slips),
    steps: [
      `M_W(t) = M_X(${lin(a)}) \\, M_Y(${minus ? "-" : ""}${lin(b)})`,
      `M_W(t) = e^{${linPlus(a * m1)}\\frac{${a * a * s1}}{2}t^{2}} \\cdot e^{${linPlus((minus ? -b : b) * m2)}\\frac{${b * b * s2}}{2}t^{2}} = e^{${linPlus(m)}\\frac{${v}}{2}t^{2}}`,
      `W \\sim N(${m}, ${v}), \\quad \\operatorname{Var}(W) = ${a * a} \\cdot ${s1} + ${b * b} \\cdot ${s2} = ${v}`,
    ],
  };
}

function sumPart(r: Rng, w: PracticeWords): Part {
  if (r.int(0, 1) === 0) {
    const p = r.pick([F(1, 2), F(1, 3), F(1, 4), F(2, 5)]);
    const q = F(1).sub(p);
    const [n1, n2] = [r.int(2, 9), r.int(2, 9)];
    const base = `\\left(${q.tex()} + ${p.tex()}e^{t}\\right)`;
    return {
      prompt: fill(w.pt.prompt.sumParameter, { v: "n" }),
      q: `X \\sim B(${n1}, ${p.tex()}), \\quad Y \\sim B(${n2}, ${p.tex()}), \\quad X + Y \\sim B(n, ${p.tex()})`,
      ...exact(F(n1 + n2), [["mgfExponentsMultiplied", n1 * n2]]),
      steps: [`M_{X+Y}(t) = M_X(t)M_Y(t) = ${base}^{${n1}}${base}^{${n2}} = ${base}^{${n1 + n2}}`, `n = ${n1} + ${n2} = ${n1 + n2}`],
    };
  }
  const [l1, l2] = [r.int(2, 9), r.int(2, 9)];
  return {
    prompt: fill(w.pt.prompt.sumParameter, { v: "λ" }),
    q: `X \\sim \\operatorname{Po}(${l1}), \\quad Y \\sim \\operatorname{Po}(${l2}), \\quad X + Y \\sim \\operatorname{Po}(\\lambda)`,
    ...exact(F(l1 + l2), [["mgfExponentsMultiplied", l1 * l2]]),
    steps: [`M_{X+Y}(t) = e^{${l1}(e^{t} - 1)}e^{${l2}(e^{t} - 1)} = e^{${l1 + l2}(e^{t} - 1)}`, `\\lambda = ${l1} + ${l2} = ${l1 + l2}`],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? meanPart(r, w) : L === 2 ? variancePart(r, w) : r.int(0, 1) === 0 ? comboPart(r, w) : sumPart(r, w));

export default gen;
