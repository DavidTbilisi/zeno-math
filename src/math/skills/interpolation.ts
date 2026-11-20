// Practice: polynomial interpolation. Easy finds a Lagrange basis polynomial Lᵢ at a point (the denominator left off,
// named) or the value of the quadratic through three points (the straight line through the two nearest, named);
// medium the second divided difference f[x₀, x₁, x₂] (the difference not divided, divided by the wrong span, named);
// hard the bound M |Π(x − xᵢ)| / (n + 1)! on the interpolation error (the factorial left off, n! for (n + 1)!, named).
import { exact } from "../calculusTwo";
import { F, dividedDifferences, interpolate, lagrangeBasis } from "../numericalAnalysis";
import { fact } from "../realAnalysis";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

/** k distinct whole-number nodes, in increasing order, with spread-out gaps. */
function nodesOf(r: Rng, k: number): number[] {
  const xs = [r.int(-3, 2)];
  while (xs.length < k) xs.push(xs[xs.length - 1] + r.int(1, 3));
  return xs;
}

const pts = (xs: number[], ys: number[]) => xs.map((x, i) => `(${x}, ${ys[i]})`).join(", \\; ");

function easyPart(r: Rng, w: PracticeWords): Part {
  const xs = nodesOf(r, 3);
  let x: number;
  do x = r.int(xs[0] - 1, xs[2] + 1);
  while (xs.includes(x));
  if (r.next() < 0.5) {
    const i = r.int(0, 2);
    const v = lagrangeBasis(xs, i, F(x));
    const others = xs.filter((_, j) => j !== i);
    const top = others.reduce((s, xj) => s * (x - xj), 1);
    const bottom = others.reduce((s, xj) => s * (xs[i] - xj), 1);
    return {
      prompt: fill(w.na.prompt.basis, { i }),
      q: `x_0 = ${xs[0]}, \\; x_1 = ${xs[1]}, \\; x_2 = ${xs[2]}, \\quad x = ${x}`,
      ...exact(v, [["basisNumeratorOnly", top]]),
      steps: [
        `L_{${i}}(x) = ${others.map((xj) => `\\frac{x - (${xj})}{${xs[i]} - (${xj})}`).join(" \\cdot ")}`,
        `L_{${i}}(${x}) = \\frac{${top}}{${bottom}} = ${v.tex()}`,
      ],
    };
  }
  let ys: number[];
  // Redraw until the three points are not on a line, so the quadratic and the chord differ.
  do ys = xs.map(() => r.int(-6, 9));
  while (dividedDifferences(xs, ys).d012.isZero());
  const v = interpolate(xs, ys, F(x));
  // The chord through the two nodes nearest x.
  const near = [...xs.keys()].sort((p, q) => Math.abs(xs[p] - x) - Math.abs(xs[q] - x) || p - q).slice(0, 2).sort();
  const [p, q] = near;
  const chord = F(ys[p]).add(F(ys[q] - ys[p], xs[q] - xs[p]).mul(F(x - xs[p])));
  return {
    prompt: fill(w.na.prompt.interp, { x }),
    q: pts(xs, ys),
    ...exact(v, [["interpLinearOnly", chord]]),
    steps: [
      `p(x) = ${xs.map((_, i) => `${ys[i]} \\, L_{${i}}(x)`).join(" + ")}`,
      `L_0(${x}) = ${lagrangeBasis(xs, 0, F(x)).tex()}, \\; L_1(${x}) = ${lagrangeBasis(xs, 1, F(x)).tex()}, \\; L_2(${x}) = ${lagrangeBasis(xs, 2, F(x)).tex()}`,
      `p(${x}) = ${v.tex()}`,
    ],
  };
}

function dividedPart(r: Rng, w: PracticeWords): Part {
  const xs = nodesOf(r, 3);
  let ys: number[];
  do ys = xs.map(() => r.int(-6, 9));
  while (dividedDifferences(xs, ys).d012.isZero());
  const { d01, d12, d012 } = dividedDifferences(xs, ys);
  const gap = d12.sub(d01);
  return {
    prompt: w.na.prompt.divided,
    q: pts(xs, ys),
    ...exact(d012, [["differenceNotDivided", gap], ["dividedDifferenceSpan", gap.div(F(xs[2] - xs[1]))]]),
    steps: [
      `f[x_0, x_1] = \\frac{${ys[1]} - (${ys[0]})}{${xs[1]} - (${xs[0]})} = ${d01.tex()}, \\quad f[x_1, x_2] = \\frac{${ys[2]} - (${ys[1]})}{${xs[2]} - (${xs[1]})} = ${d12.tex()}`,
      `f[x_0, x_1, x_2] = \\frac{${d12.tex()} - ${d01.texP()}}{${xs[2]} - (${xs[0]})} = ${d012.tex()}`,
    ],
  };
}

function errorPart(r: Rng, w: PracticeWords): Part {
  const n = r.int(2, 3);
  let xs: number[];
  // Redraw until two neighbouring nodes are at least 2 apart, so a whole x lies strictly between the nodes.
  do xs = nodesOf(r, n + 1);
  while (xs.every((x, i) => i === 0 || x - xs[i - 1] === 1));
  let x: number;
  do x = r.int(xs[0], xs[n]);
  while (xs.includes(x));
  const m = r.pick([1, 2, 3, 4, 6, 8, 12]);
  const prod = Math.abs(xs.reduce((s, xi) => s * (x - xi), 1));
  const bound = F(m * prod, fact(n + 1));
  return {
    prompt: fill(w.na.prompt.interpError, { n, k: n + 1 }),
    q: `x_i = ${xs.join(", \\; ")}, \\quad |f^{(${n + 1})}| \\le ${m}, \\quad x = ${x}`,
    ...exact(bound, [["errorFactorialMissing", m * prod], ["errorFactorialLow", F(m * prod, fact(n))]]),
    steps: [
      `\\left| \\prod (x - x_i) \\right| = ${xs.map((xi) => `|${x} - (${xi})|`).join(" \\cdot ")} = ${prod}`,
      `|f(x) - p(x)| \\le \\frac{M}{(n + 1)!} \\left| \\prod (x - x_i) \\right| = \\frac{${m} \\cdot ${prod}}{${fact(n + 1)}} = ${bound.tex()}`,
    ],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? easyPart(r, w) : L === 2 ? dividedPart(r, w) : errorPart(r, w));

export default gen;
