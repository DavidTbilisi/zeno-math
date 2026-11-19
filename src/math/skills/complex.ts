// Practice: Complex numbers. Easy multiplies two complex numbers (i² taken as +1, or only the like parts multiplied,
// named); medium divides by multiplying top and bottom by the conjugate (the bottom left out, named) or finds a modulus
// (the square root forgotten, named); hard solves a real quadratic with a negative discriminant (the sign of −b/2a
// lost, or only b halved, named).
import { exact, F } from "../calculusTwo";
import { cartesian, cmul, conj, cx, cxTex } from "../complexPractice";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const p = (n: number) => (n < 0 ? `(${n})` : String(n));

/** (a + bi)(c + di). */
function productPart(r: Rng, w: PracticeWords): Part {
  const z = cx(r.nz(-5, 5), r.nz(-5, 5));
  const v = cx(r.nz(-5, 5), r.nz(-5, 5));
  const right = cmul(z, v);
  const iPlus = cx(z.re * v.re + z.im * v.im, z.re * v.im + z.im * v.re);
  const likeOnly = cx(z.re * v.re, z.im * v.im);
  return {
    prompt: w.cxq.prompt.product,
    q: `(${cxTex(z)})(${cxTex(v)})`,
    ...cartesian([right], [["iSquaredPlusOne", [iPlus]], ["likePartsOnly", [likeOnly]]]),
    steps: [
      `= ${p(z.re)} \\cdot ${p(v.re)} + ${p(z.re)} \\cdot ${p(v.im)}i + ${p(z.im)} \\cdot ${p(v.re)}i + ${p(z.im)} \\cdot ${p(v.im)}i^{2}`,
      `i^{2} = -1: \\quad ${z.re * v.re} - (${z.im * v.im}) + (${z.re * v.im + z.im * v.re})i = ${cxTex(right)}`,
    ],
  };
}

/** (a + bi) / (c + di), made from its answer. */
function quotientPart(r: Rng, w: PracticeWords): Part {
  const q = cx(r.nz(-4, 4), r.nz(-4, 4));
  const d = cx(r.nz(-3, 3), r.nz(-3, 3));
  const n = cmul(q, d);
  const m = d.re * d.re + d.im * d.im;
  const top = cmul(n, conj(d));
  return {
    prompt: w.cxq.prompt.quotient,
    q: `\\frac{${cxTex(n)}}{${cxTex(d)}}`,
    ...cartesian([q], [["conjugateTopOnly", [top]]]),
    steps: [
      `\\frac{${cxTex(n)}}{${cxTex(d)}} \\cdot \\frac{${cxTex(conj(d))}}{${cxTex(conj(d))}} = \\frac{${cxTex(top)}}{${d.re}^{2} + ${p(d.im)}^{2}} = \\frac{${cxTex(top)}}{${m}}`,
      `= ${cxTex(q)}`,
    ],
  };
}

const TRIPLES = [[3, 4, 5], [5, 12, 13], [6, 8, 10], [8, 15, 17], [7, 24, 25], [9, 12, 15]];

/** |a + bi| with a whole modulus. */
function modulusPart(r: Rng, w: PracticeWords): Part {
  const [a, b, L] = r.pick(TRIPLES);
  const z = r.next() < 0.5 ? cx(r.sign() * a, r.sign() * b) : cx(r.sign() * b, r.sign() * a);
  return {
    prompt: w.cxq.prompt.modulus,
    q: `|${cxTex(z)}|`,
    ...exact(F(L), [["modulusNoRoot", L * L]]),
    steps: [`|${cxTex(z)}| = \\sqrt{${p(z.re)}^{2} + ${p(z.im)}^{2}} = \\sqrt{${L * L}} = ${L}`],
  };
}

/** z² + bz + c = 0 with roots p ± qi. */
function quadraticPart(r: Rng, w: PracticeWords): Part {
  const re = r.nz(-4, 4);
  const im = r.int(1, 4);
  const [b, c] = [-2 * re, re * re + im * im];
  const roots = [cx(re, im), cx(re, -im)];
  const disc = b * b - 4 * c;
  return {
    prompt: w.cxq.prompt.quadratic,
    q: `z^{2} ${b < 0 ? "-" : "+"} ${Math.abs(b) === 1 ? "" : Math.abs(b)}z + ${c} = 0`,
    ...cartesian(roots, [
      ["minusBForgotten", [cx(-re, im), cx(-re, -im)]],
      ["halvedOnlyB", [cx(re, 2 * im), cx(re, -2 * im)]],
    ]),
    steps: [
      `\\Delta = ${p(b)}^{2} - 4 \\cdot ${c} = ${disc}, \\quad \\sqrt{\\Delta} = ${2 * im}i`,
      `z = \\frac{${-b} \\pm ${2 * im}i}{2} = ${re} \\pm ${im === 1 ? "" : im}i`,
    ],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? productPart(r, w) : L === 2 ? (r.next() < 0.6 ? quotientPart(r, w) : modulusPart(r, w)) : quadraticPart(r, w));

export default gen;
