// Practice: geometry on the sphere and in the hyperbolic plane. Easy says how a triangle's angle sum compares with π,
// or how many lines through a point miss a line (the sphere and the hyperbolic plane swapped, named), or finds the
// area of a spherical triangle by Girard's theorem (π not subtracted, R² left out, named); medium finds the area of a
// hyperbolic triangle (the defect's sign flipped, R² left out, named) or of a regular spherical polygon (π subtracted
// as for a triangle, named); hard says where a regular tiling {p, q} lives (the sphere and the hyperbolic plane
// swapped, named) or finds the area of one tile of a hyperbolic tiling (the angle π/q, the sign flipped, named).
import { pickOf, sym, word, type NumSlip } from "../calculusTwo";
import type { Frac } from "../fraction";
import { tileArea, tilingKind } from "../higherGeometry";
import type { MistakeId } from "../mistakes";
import { F, piPow } from "../pdes";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

/** A rational multiple of π as TeX: \frac{\pi}{2}, \frac{2\pi}{3}, \pi. */
const piTex = (p: Frac) => {
  const top = p.n === 1 ? "\\pi" : `${p.n}\\pi`;
  return p.d === 1 ? top : `\\frac{${top}}{${p.d}}`;
};
const piSum = (xs: Frac[]) => xs.reduce((s, x) => s.add(x), F(0));
/** Geometry 0 (sphere) and 2 (hyperbolic) swapped; the plane has no such slip. */
/** An option whose words contain π, with π set as maths so KaTeX draws it. */
const piWord = (t: string) => sym(`\\text{${t.replace(/π/g, "}\\pi\\text{")}}`, t);
const swapped = (id: MistakeId, g: 0 | 1 | 2): [MistakeId, number][] => (g === 1 ? [] : [[id, 2 - g]]);

function pickPart(r: Rng, w: PracticeWords): Part {
  const g = r.pick([0, 1, 2] as const);
  const where = [w.hg.where.sphere, w.hg.where.plane, w.hg.where.hyperbolic][g];
  if (r.next() < 0.5) {
    const options = [piWord(w.hg.sum.more), piWord(w.hg.sum.equal), piWord(w.hg.sum.less)];
    return {
      prompt: fill(w.hg.prompt.angleSum, { where }),
      q: "\\alpha + \\beta + \\gamma",
      ...pickOf(options, g, swapped("angleSumSwapped", g)),
      steps: [["\\alpha + \\beta + \\gamma > \\pi", "\\alpha + \\beta + \\gamma = \\pi", "\\alpha + \\beta + \\gamma < \\pi"][g]],
    };
  }
  const options = [word(w.hg.parallels.none), word(w.hg.parallels.one), word(w.hg.parallels.many)];
  return {
    prompt: fill(w.hg.prompt.parallels, { where }),
    q: "P \\notin \\ell",
    ...pickOf(options, g, swapped("parallelsSwapped", g)),
    steps: [["0", "1", "\\infty"][g]],
  };
}

const SPHERE_ANGLES = [F(1, 2), F(1, 3), F(2, 3), F(1, 4), F(3, 4), F(1, 6), F(5, 6)];
const angleTex = (xs: Frac[]) => `\\alpha = ${piTex(xs[0])}, \\quad \\beta = ${piTex(xs[1])}, \\quad \\gamma = ${piTex(xs[2])}`;

function girardPart(r: Rng, w: PracticeWords): Part {
  const R = r.int(2, 4);
  let xs: Frac[];
  do xs = [r.pick(SPHERE_ANGLES), r.pick(SPHERE_ANGLES), r.pick(SPHERE_ANGLES)];
  while (piSum(xs).toNumber() <= 1);
  const sum = piSum(xs);
  const excess = sum.sub(F(1));
  const area = excess.mul(F(R * R));
  return {
    prompt: w.hg.prompt.girard,
    q: `R = ${R}, \\quad ${angleTex(xs)}`,
    ...piPow(area, 1, [["excessNotSubtracted", sum.mul(F(R * R)).toNumber() * Math.PI], ["curvatureRadiusDropped", excess.toNumber() * Math.PI]]),
    steps: [`\\alpha + \\beta + \\gamma - \\pi = ${piTex(sum)} - \\pi = ${piTex(excess)}`, `A = R^{2}(\\alpha + \\beta + \\gamma - \\pi) = ${R * R} \\cdot ${piTex(excess)} = ${piPow(area, 1).show}`],
  };
}

const HYPERBOLIC_ANGLES = [F(1, 3), F(1, 4), F(1, 5), F(1, 6), F(1, 8), F(1, 12), F(2, 5)];

function hyperbolicPart(r: Rng, w: PracticeWords): Part {
  const R = r.int(2, 3);
  let xs: Frac[];
  do xs = [r.pick(HYPERBOLIC_ANGLES), r.pick(HYPERBOLIC_ANGLES), r.pick(HYPERBOLIC_ANGLES)];
  while (piSum(xs).toNumber() >= 1);
  const sum = piSum(xs);
  const defect = F(1).sub(sum);
  const area = defect.mul(F(R * R));
  return {
    prompt: w.hg.prompt.hyperbolicArea,
    q: `K = -\\frac{1}{${R * R}}, \\quad ${angleTex(xs)}`,
    ...piPow(area, 1, [["defectSignSwapped", -area.toNumber() * Math.PI], ["curvatureRadiusDropped", defect.toNumber() * Math.PI]]),
    steps: [`R^{2} = ${R * R}, \\quad \\pi - (\\alpha + \\beta + \\gamma) = \\pi - ${piTex(sum)} = ${piTex(defect)}`, `A = R^{2}(\\pi - \\alpha - \\beta - \\gamma) = ${piPow(area, 1).show}`],
  };
}

function polygonPart(r: Rng, w: PracticeWords): Part {
  const n = r.pick([4, 5]);
  const theta = n === 4 ? r.pick([F(2, 3), F(3, 4), F(5, 6)]) : r.pick([F(2, 3), F(3, 4), F(4, 5)]);
  const R = r.int(1, 3);
  const sum = theta.mul(F(n));
  const area = sum.sub(F(n - 2)).mul(F(R * R));
  const slips: NumSlip[] = [["polygonAsTriangle", sum.sub(F(1)).mul(F(R * R)).toNumber() * Math.PI]];
  if (R > 1) slips.push(["curvatureRadiusDropped", sum.sub(F(n - 2)).toNumber() * Math.PI]);
  return {
    prompt: fill(w.hg.prompt.sphericalPolygon, { n }),
    q: `R = ${R}, \\quad \\theta = ${piTex(theta)}`,
    ...piPow(area, 1, slips),
    steps: [`${n}\\theta = ${piTex(sum)}, \\quad (${n} - 2)\\pi = ${piTex(F(n - 2))}`, `A = R^{2}\\left(${n}\\theta - (${n} - 2)\\pi\\right) = ${piPow(area, 1).show}`],
  };
}

const TILINGS: [number, number][] = [[3, 3], [3, 4], [4, 3], [3, 5], [5, 3], [3, 6], [4, 4], [6, 3], [3, 7], [7, 3], [4, 5], [5, 4], [4, 6], [6, 4], [5, 5], [3, 8]];
const HYPERBOLIC_TILINGS = TILINGS.filter(([p, q]) => tilingKind(p, q) === 2);

function tilingPart(r: Rng, w: PracticeWords): Part {
  const [p, q] = r.pick(TILINGS);
  const g = tilingKind(p, q);
  const k = (p - 2) * (q - 2);
  const options = [word(w.hg.where.sphere), word(w.hg.where.plane), word(w.hg.where.hyperbolic)];
  return {
    prompt: fill(w.hg.prompt.tiling, { p, q }),
    q: `\\{${p}, ${q}\\}`,
    ...pickOf(options, g, swapped("tilingTypeSwapped", g)),
    steps: [`(p - 2)(q - 2) = ${p - 2} \\cdot ${q - 2} = ${k}`, k < 4 ? `${k} < 4` : k === 4 ? "4 = 4" : `${k} > 4`],
  };
}

function tileAreaPart(r: Rng, w: PracticeWords): Part {
  const [p, q] = r.pick(HYPERBOLIC_TILINGS);
  const area = tileArea(p, q);
  return {
    prompt: fill(w.hg.prompt.tileArea, { p, q }),
    q: `\\{${p}, ${q}\\}, \\quad K = -1`,
    ...piPow(area, 1, [["tilingAngleHalved", F(p - 2).sub(F(p, q)).toNumber() * Math.PI], ["defectSignSwapped", -area.toNumber() * Math.PI]]),
    steps: [
      `\\theta = \\frac{2\\pi}{${q}}`,
      `A = (${p} - 2)\\pi - ${p} \\cdot ${piTex(F(2, q))} = ${piTex(F(p - 2))} - ${piTex(F(2 * p, q))} = ${piPow(area, 1).show}`,
    ],
  };
}

const gen: Gen = (r, L, w) => {
  if (L === 1) return r.next() < 0.5 ? pickPart(r, w) : girardPart(r, w);
  if (L === 2) return r.next() < 0.5 ? hyperbolicPart(r, w) : polygonPart(r, w);
  return r.next() < 0.5 ? tilingPart(r, w) : tileAreaPart(r, w);
};

export default gen;
