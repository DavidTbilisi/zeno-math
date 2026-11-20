// Geometry as a degree teaches it after school (Pressley, Elementary Differential Geometry; do Carmo, Differential
// Geometry of Curves and Surfaces; Greenberg, Euclidean and Non-Euclidean Geometries; Coxeter, Projective Geometry):
// the speed, curvature and torsion of curves, tangent planes, the first fundamental form and Gaussian curvature of
// surfaces, angle sums and areas on the sphere and in the hyperbolic plane, and homogeneous coordinates and the
// cross-ratio. The words, and the exact helpers the answers are made of; the questions are in
// src/math/skills/{curves,surfaces,nonEuclidean,projective}.ts.
import { F } from "./pdes";
import type { Frac } from "./fraction";

/** The words of these questions (the locale's `hg` block). */
export type HigherGeometryWords = {
  /** Where a figure is drawn, as a phrase that fits the prompts: "on a sphere", "in the Euclidean plane", … */
  where: { sphere: string; plane: string; hyperbolic: string };
  /** A triangle's angle sum against π. */
  sum: { more: string; equal: string; less: string };
  /** How many lines through a point miss a given line. */
  parallels: { none: string; one: string; many: string };
  prompt: {
    speed: string;
    arcLength: string;
    curvatureGraph: string;
    curvatureHelix: string;
    torsionHelix: string;
    curvatureCubic: string;
    torsionCubic: string;
    tangentPlane: string;
    firstForm: string;
    areaElement: string;
    gaussian: string;
    angleSum: string;
    parallels: string;
    girard: string;
    hyperbolicArea: string;
    sphericalPolygon: string;
    tiling: string;
    tileArea: string;
    homogeneous: string;
    meet: string;
    crossRatio: string;
    harmonic: string;
    projectivity: string;
  };
};

/** The circular helix (a cos t, a sin t, bt): curvature a/(a² + b²), torsion b/(a² + b²). */
export const helix = (a: number, b: number) => ({ kappa: F(a, a * a + b * b), tau: F(b, a * a + b * b) });

/**
 * The twisted cubic (at, bt², ct³) at t = 0: r′ = (a, 0, 0), r″ = (0, 2b, 0), r‴ = (0, 0, 6c), so r′ × r″ = (0, 0, 2ab),
 * κ = |r′ × r″|/|r′|³ = 2|b|/a² and τ = (r′ × r″)·r‴/|r′ × r″|² = 3c/(ab).
 */
export const twistedCubic = (a: number, b: number, c: number) => ({ cross: 2 * Math.abs(a * b), kappa: F(2 * Math.abs(b), a * a), tau: F(3 * c, a * b) });

/** The curvature of y = f(x) where f′ = m and f″ = s: |s|/(1 + m²)^{3/2}, for m with 1 + m² a square of a fraction. */
export function graphCurvature(s: Frac, m: Frac): Frac {
  // 1 + m² = (n² + d²)/d², a perfect square when (d, n, h) is a Pythagorean triple: (1 + m²)^{3/2} = h³/d³.
  const h = Math.round(Math.sqrt(m.n * m.n + m.d * m.d));
  if (h * h !== m.n * m.n + m.d * m.d) throw new Error(`1 + m² is not a square for m = ${m.n}/${m.d}`);
  return s.abs().mul(F(m.d ** 3, h ** 3));
}

/** z = a x² + b xy + c y² + p x + q y + d: its value and first partial derivatives at (x, y). */
export type Quadric = { a: number; b: number; c: number; p: number; q: number; d: number };
export function quadricAt(f: Quadric, x: number, y: number) {
  return {
    z: f.a * x * x + f.b * x * y + f.c * y * y + f.p * x + f.q * y + f.d,
    fx: 2 * f.a * x + f.b * y + f.p,
    fy: f.b * x + 2 * f.c * y + f.q,
  };
}
/** The Gaussian curvature of a graph: (f_xx f_yy − f_xy²)/(1 + f_x² + f_y²)², for the quadric f_xx = 2a, f_xy = b, f_yy = 2c. */
export const gaussian = (f: Quadric, fx: number, fy: number) => F(4 * f.a * f.c - f.b * f.b, (1 + fx * fx + fy * fy) ** 2);

/** Where the regular tiling {p, q} lives: 0 the sphere, 1 the Euclidean plane, 2 the hyperbolic plane. */
export const tilingKind = (p: number, q: number): 0 | 1 | 2 => {
  const k = (p - 2) * (q - 2);
  return k < 4 ? 0 : k === 4 ? 1 : 2;
};
/** The area of one tile of a hyperbolic {p, q} tiling at curvature −1, over π: (p − 2) − 2p/q (its angles are 2π/q). */
export const tileArea = (p: number, q: number) => F(p - 2).add(F(-2 * p, q));

/** The cross-ratio (A, B; C, D) = (c − a)(d − b) / ((c − b)(d − a)) of four points on a line. */
export const crossRatio = (a: Frac, b: Frac, c: Frac, d: Frac) => c.sub(a).mul(d.sub(b)).div(c.sub(b).mul(d.sub(a)));
/** The harmonic conjugate D of C with respect to A and B: (A, B; C, D) = −1, so d = (a(c − b) + b(c − a))/(2c − a − b). */
export const harmonicConjugate = (a: Frac, b: Frac, c: Frac) => a.mul(c.sub(b)).add(b.mul(c.sub(a))).div(c.mul(F(2)).sub(a).sub(b));

/** The projectivity of the line sending 0, 1, ∞ to p, q, r: x ↦ (r t x + p)/(t x + 1) with t = (q − p)/(r − q). */
export function projectivity(p: Frac, q: Frac, r: Frac) {
  const t = q.sub(p).div(r.sub(q));
  return { t, at: (x: Frac) => r.mul(t).mul(x).add(p).div(t.mul(x).add(F(1))) };
}

/** Where a₁x + b₁y + c₁ = 0 meets a₂x + b₂y + c₂ = 0: the cross product of [a₁ : b₁ : c₁] and [a₂ : b₂ : c₂]. */
export function meet(l: [number, number, number], m: [number, number, number]): [number, number, number] {
  const [a1, b1, c1] = l;
  const [a2, b2, c2] = m;
  return [b1 * c2 - c1 * b2, c1 * a2 - a1 * c2, a1 * b2 - b1 * a2];
}
