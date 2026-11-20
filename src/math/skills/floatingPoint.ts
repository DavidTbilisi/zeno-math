// Practice: rounding error and conditioning. Easy finds the absolute or relative error of a fraction rounded to a few
// decimals (the sign kept, the relative error taken over the approximation or left absolute, named); medium the
// relative condition number |x f′(x) / f(x)| of a function at a point, where subtracting nearly equal numbers blows
// up (the absolute condition number |f′(x)|, the ratio upside down, named); hard the condition number ‖A‖∞ ‖A⁻¹‖∞
// of a 2 × 2 matrix (A⁻¹ left undivided by det A, ‖A‖∞ squared, named).
import { exact } from "../calculusTwo";
import { F, inverse2, matTex, normInf } from "../numericalAnalysis";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";
import type { Frac } from "../fraction";

function errorPart(r: Rng, w: PracticeWords): Part {
  const d = r.pick([3, 7, 9, 11, 13]);
  let n: number;
  do n = r.int(1, 3 * d);
  while (n % d === 0);
  // The relative error rounds to one decimal, so dividing by p* instead of p moves the answer visibly.
  const relative = r.next() < 0.5;
  const k = relative ? 1 : r.int(2, 3);
  const p = F(n, d);
  const approx = F(Math.round((n / d) * 10 ** k), 10 ** k);
  const abs = p.sub(approx).abs();
  const pTex = `p = ${p.tex()}, \\quad p^{*} = ${approx.toNumber().toFixed(k)}`;
  if (!relative)
    return {
      prompt: w.na.prompt.absError,
      q: pTex,
      ...exact(abs, [["errorSignKept", abs.neg()]]),
      steps: [`p^{*} = ${approx.tex()}`, `|p - p^{*}| = \\left| ${p.tex()} - ${approx.tex()} \\right| = ${abs.tex()}`],
    };
  const rel = abs.div(p);
  return {
    prompt: w.na.prompt.relError,
    q: pTex,
    ...exact(rel, [["relativeOverApprox", abs.div(approx)], ["relativeIsAbsolute", abs]]),
    steps: [`|p - p^{*}| = ${abs.tex()}`, `\\frac{|p - p^{*}|}{|p|} = \\frac{${abs.tex()}}{${p.tex()}} = ${rel.tex()}`],
  };
}

function conditionPart(r: Rng, w: PracticeWords): Part {
  const a = r.int(2, 9);
  let b: number;
  do b = a + r.pick([-2, -1, 1, 2]);
  while (b === 0);
  const x = F(b);
  const kind = r.int(0, 2);
  // f, f′ and f at x = b, written out.
  const [fTex, fx, dfx]: [string, Frac, Frac] =
    kind === 0
      ? [`f(x) = x - ${a}`, F(b - a), F(1)]
      : kind === 1
        ? [`f(x) = x^{2} - ${a * a}`, F(b * b - a * a), F(2 * b)]
        : [`f(x) = \\frac{1}{${a} - x}`, F(1, a - b), F(1, (a - b) * (a - b))];
  const kappa = x.mul(dfx).div(fx).abs();
  return {
    prompt: w.na.prompt.condition,
    q: `${fTex}, \\quad x = ${b}`,
    ...exact(kappa, [["conditionAbsolute", dfx.abs()], ["conditionInverted", fx.div(x.mul(dfx)).abs()]]),
    steps: [`f(${b}) = ${fx.tex()}, \\quad f'(${b}) = ${dfx.tex()}`, `\\kappa = \\left| \\frac{x f'(x)}{f(x)} \\right| = \\left| \\frac{${b} \\cdot ${dfx.tex()}}{${fx.tex()}} \\right| = ${kappa.tex()}`],
  };
}

function matrixPart(r: Rng, w: PracticeWords): Part {
  let a: number[][];
  let det: number;
  do {
    a = [
      [r.int(1, 9), r.int(-9, 9)],
      [r.int(-9, 9), r.int(1, 9)],
    ];
    det = a[0][0] * a[1][1] - a[0][1] * a[1][0];
  } while (Math.abs(det) < 2);
  const A = a.map((row) => row.map((v) => F(v)));
  const inv = inverse2(a);
  const nA = normInf(A);
  const nInv = normInf(inv);
  const kappa = nA.mul(nInv);
  return {
    prompt: w.na.prompt.condMatrix,
    q: `A = ${matTex(a)}`,
    ...exact(kappa, [["inverseDetSkipped", kappa.mul(F(Math.abs(det)))], ["conditionNormSquared", nA.mul(nA)]]),
    steps: [`A^{-1} = ${matTex(inv)}`, `\\|A\\|_\\infty = ${nA.tex()}, \\quad \\|A^{-1}\\|_\\infty = ${nInv.tex()}`, `\\kappa_\\infty(A) = ${nA.tex()} \\cdot ${nInv.tex()} = ${kappa.tex()}`],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? errorPart(r, w) : L === 2 ? conditionPart(r, w) : matrixPart(r, w));

export default gen;
