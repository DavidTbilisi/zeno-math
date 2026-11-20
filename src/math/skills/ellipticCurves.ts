// Practice: elliptic curves over ℤₚ. Easy counts the points of y² = x³ + ax + b, O included (O forgotten, one point
// for each x, named); medium adds two points with the chord rule (the third meet not reflected, the slope upside
// down, named); hard doubles a point with the tangent λ = (3x² + a)/2y, half the time as the shared point of an
// elliptic Diffie–Hellman (a dropped from the tangent, the meet not reflected, named).
import { curveTex, ecAdd, inv, pointOf, points, rhs, rootsOf, slope, smooth, type Curve } from "../crypto";
import { mod } from "../groups";
import { wholeOf } from "../realAnalysis";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

/** A smooth curve over p with at least `min` affine points. */
function curve(r: Rng, ps: number[], min: number): Curve {
  for (;;) {
    const E = { a: r.int(0, 6), b: r.int(1, 7), p: r.pick(ps) };
    if (E.a < E.p && E.b < E.p && smooth(E) && points(E).length >= min) return E;
  }
}

const ptTex = ([x, y]: [number, number]) => `(${x}, ${y})`;

function countPart(r: Rng, w: PracticeWords): Part {
  const E = curve(r, [5, 7, 11], 3);
  const pts = points(E);
  const xs = new Set(pts.map(([x]) => x)).size;
  const rows = Array.from({ length: E.p }, (_, x) => {
    const ys = rootsOf(rhs(E, x), E.p);
    return `x = ${x}: \\ ${rhs(E, x)} \\to ${ys.length ? `y = ${ys.join(", ")}` : "\\varnothing"}`;
  });
  const lines: string[] = [];
  for (let i = 0; i < rows.length; i += 4) lines.push(rows.slice(i, i + 4).join(", \\quad "));
  const n = pts.length + 1;
  return {
    prompt: w.cr.prompt.ecCount,
    q: curveTex(E),
    ...wholeOf(n, [["ecInfinityForgotten", n - 1], ["ecOneRootPerX", xs + 1]]),
    steps: [...lines, `\\#E = ${pts.length} + 1 = ${n} \\quad (+\\,\\mathcal{O})`],
  };
}

function addPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const E = curve(r, [11, 13, 17, 19, 23], 6);
    const pts = points(E);
    const P = r.pick(pts);
    const Q = r.pick(pts);
    if (P[0] === Q[0]) continue;
    const l = slope(E, P, Q)!;
    const S = ecAdd(E, P, Q) as [number, number];
    const flip = P[1] === Q[1] ? null : mod((Q[0] - P[0]) * inv(Q[1] - P[1], E.p), E.p);
    return {
      prompt: w.cr.prompt.ecAdd,
      q: `${curveTex(E)}, \\quad P = ${ptTex(P)}, \\quad Q = ${ptTex(Q)}`,
      ...pointOf(S, [["ecNotReflected", [S[0], mod(-S[1], E.p)]], ["ecSlopeInverted", flip === null ? null : ecAdd(E, P, Q, flip)]]),
      steps: [
        `\\lambda = \\frac{${Q[1]} - ${P[1]}}{${Q[0]} - ${P[0]}} \\equiv ${l} \\pmod{${E.p}}`,
        `x_{3} = \\lambda^{2} - x_{1} - x_{2} \\equiv ${S[0]}`,
        `y_{3} = \\lambda (x_{1} - x_{3}) - y_{1} \\equiv ${S[1]}`,
      ],
    };
  }
}

function doublePart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const E = curve(r, [11, 13, 17, 19, 23], 6);
    if (E.a === 0) continue;
    const P = r.pick(points(E));
    if (P[1] === 0) continue;
    const l = slope(E, P, P)!;
    const D = ecAdd(E, P, P) as [number, number];
    const ecdh = r.next() < 0.5;
    return {
      prompt: ecdh ? w.cr.prompt.ecdh : w.cr.prompt.ecDouble,
      q: `${curveTex(E)}, \\quad ${ecdh ? "Q" : "P"} = ${ptTex(P)}`,
      ...pointOf(D, [["ecDoublingNoA", ecAdd(E, P, P, slope(E, P, P, true)!)], ["ecNotReflected", [D[0], mod(-D[1], E.p)]]]),
      steps: [
        `\\lambda = \\frac{3x_{1}^{2} + a}{2y_{1}} = \\frac{3 \\cdot ${P[0]}^{2} + ${E.a}}{2 \\cdot ${P[1]}} \\equiv ${l} \\pmod{${E.p}}`,
        `x_{3} = \\lambda^{2} - 2x_{1} \\equiv ${D[0]}`,
        `y_{3} = \\lambda (x_{1} - x_{3}) - y_{1} \\equiv ${D[1]}`,
      ],
    };
  }
}

const gen: Gen = (r, L, w) => (L === 1 ? countPart(r, w) : L === 2 ? addPart(r, w) : doublePart(r, w));

export default gen;
