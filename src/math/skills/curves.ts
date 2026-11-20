// Practice: curves in the plane and in space. Easy finds the speed of (at, bt²) at a point (the square root left off,
// |r| for |r′|, named) or the length of a helix (the root left off, the climb b left out, named); medium finds the
// curvature of y = ax² at a point (y″ alone, the power 3/2 taken as 1, named) or the curvature or torsion of the
// helix (a, the radius, read as 1/a, κ and τ swapped, named); hard finds κ or τ of the twisted cubic (at, bt², ct³) at
// t = 0 (|r′ × r″| not divided by |r′|³ or divided by |r′|², |r′ × r″| not squared, κ for τ, named).
import { exact, type NumSlip } from "../calculusTwo";
import { graphCurvature, helix, twistedCubic } from "../higherGeometry";
import { F, coefTex, piPow } from "../pdes";
import { fill } from "../text";
import type { Frac } from "../fraction";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const TRIPLES: [number, number, number][] = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17]];
const sgn = (r: Rng) => (r.next() < 0.5 ? -1 : 1);
const nonzero = (r: Rng, lo: number, hi: number) => {
  let v: number;
  do v = r.int(lo, hi);
  while (v === 0);
  return v;
};
const neg = (v: number) => (v < 0 ? `(${v})` : String(v));
/** A fractional coefficient times a body: \frac{3}{8}x^{2}, -\frac{2}{3}x^{2}, 2x^{2}. */
const fracCoef = (a: Frac, body: string) => (a.d === 1 ? coefTex(a.n, body) : `${a.tex()}${body}`);

function speedPart(r: Rng, w: PracticeWords): Part {
  // r(t) = (at, bt²): r′(t₀) = (a, 2bt₀), a leg of a Pythagorean triple each.
  const [u, v, h] = r.pick(TRIPLES);
  // One leg is r′'s second entry 2bt₀, so it must be even.
  const even = r.pick([u, v].filter((x) => x % 2 === 0));
  const odd = even === u ? v : u;
  const t0 = even % 4 === 0 && r.next() < 0.5 ? 2 : 1;
  const a = sgn(r) * odd;
  const b = (sgn(r) * even) / (2 * t0);
  const flip = r.next() < 0.5;
  const parts = [coefTex(a, "t"), coefTex(b, "t^{2}")];
  const at = [a * t0, b * t0 * t0];
  const d = [a, 2 * b * t0];
  const show = (xs: (string | number)[]) => `(${(flip ? [xs[1], xs[0]] : xs).join(", ")})`;
  return {
    prompt: fill(w.hg.prompt.speed, { t: t0 }),
    q: `\\mathbf{r}(t) = ${show(parts)}`,
    ...exact(F(h), [["speedNoRoot", h * h], ["speedFromPosition", Math.hypot(at[0], at[1])]]),
    steps: [
      `\\mathbf{r}'(t) = ${show([String(a), coefTex(2 * b, "t")])}, \\quad \\mathbf{r}'(${t0}) = ${show(d)}`,
      `|\\mathbf{r}'(${t0})| = \\sqrt{${neg(d[0])}^{2} + ${neg(d[1])}^{2}} = \\sqrt{${h * h}} = ${h}`,
    ],
  };
}

function arcPart(r: Rng, w: PracticeWords): Part {
  const [u, v, h] = r.pick(TRIPLES);
  const [a, b] = r.next() < 0.5 ? [u, v] : [v, u];
  const T = r.pick([1, 2]);
  const Tt = T === 1 ? "\\pi" : "2\\pi";
  return {
    prompt: fill(w.hg.prompt.arcLength, { T: T === 1 ? "π" : "2π" }),
    q: `\\mathbf{r}(t) = (${a}\\cos t, ${a}\\sin t, ${b}t)`,
    ...piPow(F(T * h), 1, [["arcLengthNoRoot", T * h * h * Math.PI], ["arcLengthDropHeight", T * a * Math.PI]]),
    steps: [
      `\\mathbf{r}'(t) = (-${a}\\sin t, ${a}\\cos t, ${b}), \\quad |\\mathbf{r}'(t)| = \\sqrt{${a * a} + ${b * b}} = ${h}`,
      `L = \\int_{0}^{${Tt}} ${h}\\,dt = ${piPow(F(T * h), 1).show}`,
    ],
  };
}

function graphPart(r: Rng, w: PracticeWords): Part {
  // y = ax² at x₀ with y′(x₀) = m, where 1 + m² is the square of a fraction.
  const [u, v] = r.pick(TRIPLES);
  const m = r.next() < 0.5 ? F(sgn(r) * u, v) : F(sgn(r) * v, u);
  const x0 = r.pick([1, 2, -1]);
  const a = m.div(F(2 * x0));
  const s = a.mul(F(2));
  const k = graphCurvature(s, m);
  const onePlus = F(1).add(m.mul(m));
  return {
    prompt: fill(w.hg.prompt.curvatureGraph, { x: x0 }),
    q: `y = ${fracCoef(a, "x^{2}")}`,
    ...exact(k, [["curvatureIsSecondDerivative", s.abs()], ["curvaturePowerOne", s.abs().div(onePlus)]]),
    steps: [
      `y' = ${fracCoef(s, "x")}, \\quad y'(${x0}) = ${m.tex()}, \\quad y'' = ${s.tex()}`,
      `1 + y'^{2} = ${onePlus.tex()}, \\quad \\left(${onePlus.tex()}\\right)^{3/2} = ${F(1).div(k.div(s.abs())).tex()}`,
      `\\kappa = \\frac{|y''|}{(1 + y'^{2})^{3/2}} = ${k.tex()}`,
    ],
  };
}

function helixPart(r: Rng, w: PracticeWords, torsion: boolean): Part {
  const a = r.int(1, 5);
  let b: number;
  do b = torsion ? nonzero(r, -5, 5) : r.int(1, 5);
  while (Math.abs(b) === a);
  const { kappa, tau } = helix(a, b);
  const slips: NumSlip[] = torsion ? [["torsionCurvatureSwapped", kappa]] : [["curvatureCircleRadius", F(1, a)], ["torsionCurvatureSwapped", tau]];
  return {
    prompt: torsion ? w.hg.prompt.torsionHelix : w.hg.prompt.curvatureHelix,
    q: `\\mathbf{r}(t) = (${a}\\cos t, ${a}\\sin t, ${coefTex(b, "t")})`,
    ...exact(torsion ? tau : kappa, slips),
    steps: [
      `a = ${a}, \\quad b = ${b}, \\quad a^{2} + b^{2} = ${a * a + b * b}`,
      torsion ? `\\tau = \\frac{b}{a^{2} + b^{2}} = ${tau.tex()}` : `\\kappa = \\frac{a}{a^{2} + b^{2}} = ${kappa.tex()}`,
    ],
  };
}

function cubicPart(r: Rng, w: PracticeWords): Part {
  const torsion = r.next() < 0.5;
  // κ needs |a| ≥ 2, or not dividing by |r′|³ would change nothing.
  const a = torsion ? nonzero(r, -3, 3) : sgn(r) * r.int(2, 3);
  const b = nonzero(r, -3, 3);
  const c = nonzero(r, -3, 3);
  const { cross, kappa, tau } = twistedCubic(a, b, c);
  const slips: NumSlip[] = torsion
    ? [["torsionNotSquared", (12 * a * b * c) / cross], ["torsionCurvatureSwapped", kappa]]
    : [["curvatureNotNormalised", cross], ["curvatureSpeedSquared", F(2 * Math.abs(b), Math.abs(a))]];
  return {
    prompt: torsion ? w.hg.prompt.torsionCubic : w.hg.prompt.curvatureCubic,
    q: `\\mathbf{r}(t) = (${coefTex(a, "t")}, ${coefTex(b, "t^{2}")}, ${coefTex(c, "t^{3}")})`,
    ...exact(torsion ? tau : kappa, slips),
    steps: [
      `\\mathbf{r}'(0) = (${a}, 0, 0), \\quad \\mathbf{r}''(0) = (0, ${2 * b}, 0), \\quad \\mathbf{r}'''(0) = (0, 0, ${6 * c})`,
      `\\mathbf{r}' \\times \\mathbf{r}'' = (0, 0, ${2 * a * b})`,
      torsion
        ? `\\tau = \\frac{(\\mathbf{r}' \\times \\mathbf{r}'') \\cdot \\mathbf{r}'''}{|\\mathbf{r}' \\times \\mathbf{r}''|^{2}} = \\frac{${12 * a * b * c}}{${cross * cross}} = ${tau.tex()}`
        : `\\kappa = \\frac{|\\mathbf{r}' \\times \\mathbf{r}''|}{|\\mathbf{r}'|^{3}} = \\frac{${cross}}{${Math.abs(a) ** 3}} = ${kappa.tex()}`,
    ],
  };
}

const gen: Gen = (r, L, w) => {
  if (L === 1) return r.next() < 0.5 ? speedPart(r, w) : arcPart(r, w);
  if (L === 2) {
    const k = r.next();
    return k < 1 / 3 ? graphPart(r, w) : helixPart(r, w, k >= 2 / 3);
  }
  return cubicPart(r, w);
};

export default gen;
