// Practice: Line integrals. Easy asks whether a field in the plane is conservative (∂P/∂x set against ∂Q/∂y instead
// of ∂P/∂y against ∂Q/∂x, named); medium is the work a conservative field does between two points, through its
// potential (only the potential at the end, named); hard is ∫ F · dr along a curve r(t) = (t, tᵐ) (r′(t) left out,
// named).
import { exact, F, pickOf, word } from "../calculusTwo";
import { fill } from "../text";
import { at, d, par, type Poly, polyTex, term } from "../vectorCalculus";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

/** Is F = (P, Q) conservative? */
function conservativePart(r: Rng, w: PracticeWords): Part {
  const yes = r.next() < 0.5;
  let P: Poly, Q: Poly;
  if (yes) {
    // F = ∇φ, φ = ax²y + bxy² + cx: P_x = 2ay and Q_y = 2bx differ, P_y = Q_x.
    const [a, b, c] = [r.nz(-3, 3), r.nz(-3, 3), r.nz(-4, 4)];
    const phi: Poly = [term(a, 2, 1), term(b, 1, 2), term(c, 1)];
    [P, Q] = [d(phi, 0), d(phi, 1)];
  } else {
    // P = px² + ky, Q = nx + 2pxy: P_x = Q_y, but P_y = k and Q_x = n + 2py differ.
    const [p, k] = [r.nz(-3, 3), r.nz(-4, 4)];
    let n = r.nz(-4, 4);
    while (n === k) n = r.nz(-4, 4);
    [P, Q] = [[term(p, 2), term(k, 0, 1)], [term(n, 1), term(2 * p, 1, 1)]];
  }
  const options = [word(w.vcalc.yes), word(w.vcalc.no)];
  const right = yes ? 0 : 1;
  return {
    prompt: w.vcalc.prompt.conservative,
    q: `\\mathbf{F}(x, y) = \\left(${polyTex(P)}, \\; ${polyTex(Q)}\\right)`,
    ...pickOf(options, right, [["wrongPartialsCompared", 1 - right]]),
    steps: [
      `\\frac{\\partial P}{\\partial y} = ${polyTex(d(P, 1))}, \\quad \\frac{\\partial Q}{\\partial x} = ${polyTex(d(Q, 0))}`,
      `\\text{${options[right].text}}`,
    ],
  };
}

/** The work F = ∇φ does from A to B: φ(B) − φ(A). */
function workPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const [a, b, c, e] = [r.nz(-3, 3), r.nz(-3, 3), r.int(-4, 4), r.int(-4, 4)];
    const phi: Poly = [term(a, 2, 1), term(b, 1, 2), term(c, 1), term(e, 0, 1)];
    const [ax, ay, bx, by] = [r.int(-2, 2), r.int(-2, 2), r.int(-2, 2), r.int(-2, 2)];
    const [fa, fb] = [at(phi, ax, ay), at(phi, bx, by)];
    if (fa === 0 || fb === fa) continue;
    return {
      prompt: fill(w.vcalc.prompt.work, { ax, ay, bx, by }),
      q: `\\mathbf{F}(x, y) = \\left(${polyTex(d(phi, 0))}, \\; ${polyTex(d(phi, 1))}\\right)`,
      ...exact(F(fb - fa), [["potentialAtEndOnly", fb]]),
      steps: [
        `\\mathbf{F} = \\nabla\\varphi, \\quad \\varphi(x, y) = ${polyTex(phi)}`,
        `W = \\varphi(${bx}, ${by}) - \\varphi(${ax}, ${ay}) = ${fb} - ${par(fa)} = ${fb - fa}`,
      ],
    };
  }
}

/** ∫ F · dr along r(t) = (t, tᵐ), 0 ≤ t ≤ 1, with P = p xⁱyʲ and Q = q xᵏyˡ. */
function curvePart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const m = r.int(2, 3);
    const [p, q] = [r.nz(-3, 3), r.nz(-3, 3)];
    const [i, j, k, l] = [r.int(0, 2), r.int(0, 1), r.int(0, 1), r.int(0, 1)];
    if (k + l === 0) continue;
    const [e1, e2] = [i + m * j, k + m * l + m - 1];
    const v = F(p, e1 + 1).add(F(q * m, e2 + 1));
    if (v.isZero()) continue;
    const slip = F(p, e1 + 1).add(F(q, k + m * l + 1));
    const P: Poly = [term(p, i, j)];
    const Q: Poly = [term(q, k, l)];
    return {
      prompt: w.vcalc.prompt.lineIntegral,
      q: `\\int_{C} \\mathbf{F} \\cdot d\\mathbf{r}, \\quad \\mathbf{F} = \\left(${polyTex(P)}, \\; ${polyTex(Q)}\\right), \\quad \\mathbf{r}(t) = \\left(t, t^{${m}}\\right), \\; 0 \\le t \\le 1`,
      ...exact(v, [["forgotDrDt", slip]]),
      steps: [
        `\\mathbf{r}'(t) = \\left(1, ${m}t^{${m - 1}}\\right): \\quad \\int_{0}^{1} \\left(${polyTex([term(p, e1), term(q * m, e2)], ["t"])}\\right) dt`,
        `= ${F(p, e1 + 1).tex()} + ${F(q * m, e2 + 1).texP()} = ${v.tex()}`,
      ],
    };
  }
}

const gen: Gen = (r, L, w) => (L === 1 ? conservativePart(r, w) : L === 2 ? workPart(r, w) : curvePart(r, w));

export default gen;
