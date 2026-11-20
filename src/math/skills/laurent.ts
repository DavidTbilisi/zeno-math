// Practice: Laurent series and singularities. Easy names the singularity at 0 of sin z/zᵐ, (1 − cos z)/zᵐ,
// (eᶻ − 1)/zᵐ or e^{1/z} (the numerator's zero ignored, or an essential singularity called a pole, named); medium finds
// the coefficient of z⁻¹ of e^{az}/zᵐ, sin(az)/zᵐ or cos(az)/zᵐ (the next term, or n! left out, named); hard finds a
// coefficient of 1/((z − a)(z − b)) on the annulus between the poles (1/(z − a) expanded in powers of z, or the
// partial fractions' sign, named).
import { exact, F, minusA, type NumSlip, pickOf, word } from "../calculusTwo";
import { annulusCoefficient, fact, zPow, zPowTex } from "../complexAnalysis";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

/** The numerators with a zero at 0: LaTeX, the zero's order, its series. */
const ZEROS = [
  { tex: "\\sin z", order: 1, series: "z - \\frac{z^{3}}{6} + \\dots" },
  { tex: "1 - \\cos z", order: 2, series: "\\frac{z^{2}}{2} - \\frac{z^{4}}{24} + \\dots" },
  { tex: "e^{z} - 1", order: 1, series: "z + \\frac{z^{2}}{2} + \\dots" },
];
const ESSENTIAL = [
  { tex: "e^{1/z}", series: "1 + \\frac{1}{z} + \\frac{1}{2z^{2}} + \\dots" },
  { tex: "z^{2} e^{1/z}", series: "z^{2} + z + \\frac{1}{2} + \\frac{1}{6z} + \\dots" },
  { tex: "\\sin \\frac{1}{z}", series: "\\frac{1}{z} - \\frac{1}{6z^{3}} + \\dots" },
  { tex: "\\cos \\frac{1}{z}", series: "1 - \\frac{1}{2z^{2}} + \\frac{1}{24z^{4}} - \\dots" },
];

/** Removable, a pole of order 1–4, or essential: option i is a pole of order i (0 removable, 5 essential). */
function kindPart(r: Rng, w: PracticeWords): Part {
  const k = w.ca.kind;
  const options = [word(k.removable), word(k.simple), ...[2, 3, 4].map((m) => word(fill(k.pole, { m }))), word(k.essential)];
  if (r.next() < 0.25) {
    const e = r.pick(ESSENTIAL);
    return {
      prompt: w.ca.prompt.kind,
      q: `f(z) = ${e.tex}`,
      ...pickOf(options, 5, [["essentialCalledPole", 1]]),
      steps: [`f(z) = ${e.series}`, `c_{-n} \\ne 0 \\; (n = 1, 2, 3, \\dots)`],
    };
  }
  const z = r.pick(ZEROS);
  const m = r.int(z.order, z.order + 2);
  const order = m - z.order;
  return {
    prompt: w.ca.prompt.kind,
    q: `f(z) = \\frac{${z.tex}}{${zPowTex(m)}}`,
    ...pickOf(options, order, [["zeroOfNumeratorIgnored", m]]),
    steps: [`${z.tex} = ${z.series}`, `f(z) = \\frac{${z.series}}{${zPowTex(m)}} \\sim ${order === 0 ? "c_{0}" : `\\frac{c}{${zPowTex(order)}}`}`],
  };
}

/** The coefficient of z⁻¹ (the residue at 0) of e^{az}/zᵐ, sin(az)/zᵐ (m = 4) or cos(az)/zᵐ (m = 3, 5). */
function coefficientPart(r: Rng, w: PracticeWords): Part {
  const kind = r.pick(["exp", "exp", "sin", "cos"] as const);
  const m = kind === "exp" ? r.int(2, 4) : kind === "sin" ? 4 : r.pick([3, 5]);
  const a = kind === "exp" && m === 2 ? r.pick([2, 3, -1, -2]) : r.pick([1, 2, 3, -1, -2]);
  const n = m - 1;
  const az = a === 1 ? "z" : a === -1 ? "-z" : `${a}z`;
  // the coefficient of zⁿ in the numerator's series
  const coef = (j: number) =>
    kind === "exp" ? F(a ** j, fact(j)) : kind === "sin" ? (j % 2 ? F((-1) ** ((j - 1) / 2) * a ** j, fact(j)) : F(0)) : j % 2 ? F(0) : F((-1) ** (j / 2) * a ** j, fact(j));
  const right = coef(n);
  const arg = a === 1 ? "z" : `(${az})`;
  const num = kind === "exp" ? `e^{${a === 1 ? "" : a === -1 ? "-" : a}z}` : a === 1 ? `\\${kind} z` : `\\${kind}${arg}`;
  const series = kind === "exp" ? `\\sum \\frac{${a < 0 ? `(${a})` : a}^{n} z^{n}}{n!}` : kind === "sin" ? `\\sum (-1)^{k} \\frac{${arg}^{2k + 1}}{(2k + 1)!}` : `\\sum (-1)^{k} \\frac{${arg}^{2k}}{(2k)!}`;
  const slips: NumSlip[] = [];
  if (kind === "exp") slips.push(["laurentIndexOff", coef(m - 2)]);
  if (m >= 3) slips.push(["laurentFactorialDropped", right.mul(F(fact(n)))]);
  return {
    prompt: fill(w.ca.prompt.coefficient, { t: zPow(-1) }),
    q: `f(z) = \\frac{${num}}{${zPowTex(m)}}`,
    ...exact(right, slips),
    steps: [
      `${num} = ${series}`,
      `z^{n - ${m}} = z^{-1} \\;\\Rightarrow\\; n = ${n}`,
      `c_{-1} = ${right.tex()}`,
    ],
  };
}

/** The coefficient of zᵏ of 1/((z − a)(z − b)) on |a| < |z| < |b|. */
function annulusPart(r: Rng, w: PracticeWords): Part {
  const a = r.pick([1, -1, 2, -2]);
  const b = r.pick([3, -3, 4, -4].filter((x) => Math.abs(x) > Math.abs(a)));
  const k = r.pick([-2, -1, 0, 1]);
  const [p, q] = annulusCoefficient(a, b, k);
  const right = F(p, q);
  const wrong = k < 0 ? F(0) : F(1, b ** (k + 1)).sub(F(1, a ** (k + 1))).div(F(a - b));
  return {
    prompt: fill(w.ca.prompt.annulus, { t: zPow(k), a: Math.abs(a), b: Math.abs(b) }),
    q: `f(z) = \\frac{1}{(${minusA(a, "z")})(${minusA(b, "z")})}, \\quad ${Math.abs(a)} < |z| < ${Math.abs(b)}`,
    ...exact(right, [["wrongAnnulusExpansion", wrong], ["partialFractionSign", right.neg()]]),
    steps: [
      `f(z) = \\frac{1}{${a - b}}\\left(\\frac{1}{${minusA(a, "z")}} - \\frac{1}{${minusA(b, "z")}}\\right)`,
      `\\frac{1}{${minusA(a, "z")}} = \\sum_{n \\ge 0} \\frac{${a < 0 ? `(${a})` : a}^{n}}{z^{n + 1}}, \\quad -\\frac{1}{${minusA(b, "z")}} = \\sum_{n \\ge 0} \\frac{z^{n}}{${b < 0 ? `(${b})` : b}^{n + 1}}`,
      `c_{${k}} = ${right.tex()}`,
    ],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? kindPart(r, w) : L === 2 ? coefficientPart(r, w) : annulusPart(r, w));

export default gen;
