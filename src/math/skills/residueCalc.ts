// Practice: Residues. Easy finds the residue at a simple pole of g(z)/((z − a)(z − b)) (the factor taken the wrong way
// round, or the numerator left out, named); medium the residue at a double pole of g(z)/((z − a)²(z − b)) (no
// derivative taken, named); hard a real integral by residues, over the line or round the unit circle (πi in place of
// 2πi, or every pole counted, named).
import { exact, F, minusA, type NumSlip, piTimes } from "../calculusTwo";
import { fill } from "../text";
import type { Frac } from "../fraction";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const lin = (c: number) => (c === 0 ? "z" : minusA(-c, "z"));

/** g(z) = z + c or a constant p; Res at z = a of g/((z − a)(z − b)) = g(a)/(a − b). */
function simplePart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const a = r.int(-3, 3);
    const b = r.int(-3, 3);
    if (a === b) continue;
    const linear = r.next() < 0.6;
    const c = r.int(-3, 3);
    const p = r.nz(-5, 5);
    const ga = linear ? a + c : p;
    if (ga === 0 || (linear && c === -b)) continue;
    const right = F(ga, a - b);
    const slips: NumSlip[] = [["residueFactorFlipped", right.neg()]];
    if (ga !== 1) slips.push(["residueNumeratorDropped", F(1, a - b)]);
    return {
      prompt: fill(w.ca.prompt.residue, { a: String(a).replace("-", "−") }),
      q: `f(z) = \\frac{${linear ? lin(c) : p}}{(${minusA(a, "z")})(${minusA(b, "z")})}`,
      ...exact(right, slips),
      steps: [
        `\\operatorname{Res}_{z = ${a}} f = \\lim_{z \\to ${a}} (${minusA(a, "z")}) f(z) = \\frac{${linear ? (c ? `${a} ${c < 0 ? "-" : "+"} ${Math.abs(c)}` : a) : p}}{${a} ${b < 0 ? "+" : "-"} ${Math.abs(b)}}`,
        `= ${right.tex()}`,
      ],
    };
  }
}

/** Res at z = a of g/((z − a)²(z − b)) = (g/(z − b))′ at a = (g′(a)(a − b) − g(a))/(a − b)². */
function doublePart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const a = r.int(-2, 2);
    const b = r.int(-3, 3);
    if (a === b) continue;
    const linear = r.next() < 0.6;
    const c = r.int(-3, 3);
    const p = r.nz(-5, 5);
    const ga = linear ? a + c : p;
    const dga = linear ? 1 : 0;
    if (linear && c === -b) continue;
    const right = F(dga * (a - b) - ga, (a - b) ** 2);
    const naive = F(ga, a - b);
    if (right.n === 0 || naive.sub(right).n === 0) continue;
    return {
      prompt: fill(w.ca.prompt.residue, { a: String(a).replace("-", "−") }),
      q: `f(z) = \\frac{${linear ? lin(c) : p}}{${a === 0 ? "z^{2}" : `(${minusA(a, "z")})^{2}`}(${minusA(b, "z")})}`,
      ...exact(right, [["doublePoleNoDerivative", naive]]),
      steps: [
        `\\operatorname{Res}_{z = ${a}} f = \\frac{d}{dz}\\left[\\frac{${linear ? lin(c) : p}}{${minusA(b, "z")}}\\right]_{z = ${a}}`,
        `= \\frac{${dga} \\cdot ${a - b < 0 ? `(${a - b})` : a - b} - ${ga < 0 ? `(${ga})` : ga}}{${a - b < 0 ? `(${a - b})` : a - b}^{2}} = ${right.tex()}`,
      ],
    };
  }
}

/** The unit-circle integrals 1/(p + q cos θ) with √(p² − q²) whole. */
const TRIGS: [number, number, number][] = [[5, 3, 4], [5, 4, 3], [13, 5, 12], [13, 12, 5], [17, 8, 15], [10, 6, 8], [10, 8, 6]];

/** A real integral by residues: its LaTeX, the answer as a multiple of π, the residue steps. */
function realPart(r: Rng, w: PracticeWords): Part {
  const kind = r.int(0, 4);
  const a = r.int(1, 4);
  const b = r.pick([1, 2, 3, 4].filter((x) => x !== a));
  let q: string;
  let ans: Frac;
  let steps: string[];
  const half = (x: Frac) => x.mul(F(1, 2));
  const allPoles: NumSlip[] = [["allPolesCounted", 0]];
  if (kind === 0) {
    q = `\\int_{-\\infty}^{\\infty} \\frac{dx}{x^{2} + ${a * a}}`;
    ans = F(1, a);
    steps = [`\\operatorname{Res}_{z = ${a === 1 ? "" : a}i} \\frac{1}{z^{2} + ${a * a}} = \\frac{1}{${2 * a}i}`, `2\\pi i \\cdot \\frac{1}{${2 * a}i} = ${piTimes(ans).show}`];
  } else if (kind === 1) {
    q = `\\int_{-\\infty}^{\\infty} \\frac{dx}{(x^{2} + ${a * a})^{2}}`;
    ans = F(1, 2 * a ** 3);
    steps = [
      `\\operatorname{Res}_{z = ${a === 1 ? "" : a}i} \\frac{1}{(z - ${a === 1 ? "" : a}i)^{2}(z + ${a === 1 ? "" : a}i)^{2}} = \\frac{d}{dz}\\frac{1}{(z + ${a === 1 ? "" : a}i)^{2}} \\Big|_{${a === 1 ? "" : a}i} = \\frac{-2}{(${2 * a}i)^{3}} = \\frac{1}{${4 * a ** 3}i}`,
      `2\\pi i \\cdot \\frac{1}{${4 * a ** 3}i} = ${piTimes(ans).show}`,
    ];
  } else if (kind === 2 || kind === 3) {
    const top = kind === 2 ? "dx" : "x^{2} \\, dx";
    q = `\\int_{-\\infty}^{\\infty} \\frac{${top}}{(x^{2} + ${a * a})(x^{2} + ${b * b})}`;
    ans = kind === 2 ? F(1, a * b * (a + b)) : F(1, a + b);
    const ra = kind === 2 ? `\\frac{1}{${2 * a}i(${b * b - a * a})}` : `\\frac{${-a * a}}{${2 * a}i(${b * b - a * a})}`;
    const rb = kind === 2 ? `\\frac{1}{${2 * b}i(${a * a - b * b})}` : `\\frac{${-b * b}}{${2 * b}i(${a * a - b * b})}`;
    steps = [
      `z = ${a === 1 ? "" : a}i: \\; ${ra}, \\quad z = ${b === 1 ? "" : b}i: \\; ${rb}`,
      `2\\pi i \\cdot \\left(${ra} + ${rb}\\right) = ${piTimes(ans).show}`,
    ];
  } else {
    const [p, c, s] = r.pick(TRIGS);
    q = `\\int_{0}^{2\\pi} \\frac{d\\theta}{${p} + ${c}\\cos\\theta}`;
    ans = F(2, s);
    const z1 = F(-p + s, c);
    steps = [
      `z = e^{i\\theta}: \\quad \\oint_{|z| = 1} \\frac{2\\,dz}{i(${c}z^{2} + ${2 * p}z + ${c})}, \\quad |z_1| = \\left|${z1.tex()}\\right| < 1`,
      `2\\pi i \\cdot \\frac{2}{i \\cdot ${c}(z_1 - z_2)} = 2\\pi i \\cdot \\frac{2}{${2 * s}i} = ${piTimes(ans).show}`,
    ];
    return { prompt: w.ca.prompt.real, q, ...piTimes(ans, [["piIForTwoPiI", half(ans).toNumber() * Math.PI]]), steps };
  }
  return { prompt: w.ca.prompt.real, q, ...piTimes(ans, [["piIForTwoPiI", half(ans).toNumber() * Math.PI], ...allPoles]), steps };
}

const gen: Gen = (r, L, w) => (L === 1 ? simplePart(r, w) : L === 2 ? doublePart(r, w) : realPart(r, w));

export default gen;
