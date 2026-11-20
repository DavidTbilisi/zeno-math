// Practice: Analytic functions. Easy finds the k that makes u + iv satisfy the Cauchy–Riemann equations (the second
// equation with its sign lost, named); medium finds f′(z₀) = uₓ − i u_y from u alone (+ i u_y, named); hard finds the
// harmonic conjugate v of u with v(0, 0) = 0 at a point (the sign of v flipped, named).
import { exact, F } from "../calculusTwo";
import { termsTex } from "../complexAnalysis";
import { cartesian, conj, cx, cxTex } from "../complexPractice";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

/** u = a(x² − y²) + bx + cy and v = kxy + by − cx: analytic when k = 2a. */
function crPart(r: Rng, w: PracticeWords): Part {
  const a = r.nz(-3, 3);
  const b = r.nz(-4, 4);
  const c = r.nz(-4, 4);
  const k = 2 * a;
  return {
    prompt: w.ca.prompt.crK,
    q: `u = ${termsTex([[a, "x^{2}"], [-a, "y^{2}"], [b, "x"], [c, "y"]])}, \\quad v = kxy ${termsTex([[b, "y"], [-c, "x"]]).replace(/^(?!-)/, "+ ").replace(/^-/, "- ")}`,
    ...exact(F(k), [["cauchyRiemannSign", F(-k)]]),
    steps: [
      `u_x = v_y: \\quad ${termsTex([[2 * a, "x"], [b, ""]])} = kx ${b < 0 ? "-" : "+"} ${Math.abs(b)}`,
      `u_y = -v_x: \\quad ${termsTex([[-2 * a, "y"], [c, ""]])} = -(ky ${c < 0 ? "+" : "-"} ${Math.abs(c)})`,
      `k = ${k}`,
    ],
  };
}

/** u = a(x³ − 3xy²) + b(x² − y²) + cx + dy, the real part of f = az³ + bz² + (c − di)z; f′(z₀) = uₓ − i u_y. */
function derivativePart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const a = r.int(-1, 1);
    const b = r.nz(-2, 2);
    const c = r.int(-3, 3);
    const d = r.nz(-3, 3);
    const x = r.int(-2, 2);
    const y = r.nz(-2, 2);
    const ux = a * (3 * x * x - 3 * y * y) + 2 * b * x + c;
    const uy = -6 * a * x * y - 2 * b * y + d;
    if (uy === 0) continue;
    const right = cx(ux, -uy);
    const z0 = cx(x, y);
    return {
      prompt: fill(w.ca.prompt.derivative, { z: cxTex(z0).replace(/-/g, "−") }),
      q: `u(x, y) = ${termsTex([[a, "x^{3}"], [-3 * a, "xy^{2}"], [b, "x^{2}"], [-b, "y^{2}"], [c, "x"], [d, "y"]])}`,
      ...cartesian([right], [["derivativeSignCR", [conj(right)]]]),
      steps: [
        `u_x = ${termsTex([[3 * a, "x^{2}"], [-3 * a, "y^{2}"], [2 * b, "x"], [c, ""]])}, \\quad u_y = ${termsTex([[-6 * a, "xy"], [-2 * b, "y"], [d, ""]])}`,
        `x = ${x}, \\; y = ${y}: \\quad u_x = ${ux}, \\quad u_y = ${uy}`,
        `f'(z) = u_x - i\\,u_y = ${cxTex(right)}`,
      ],
    };
  }
}

/** u = a(x² − y²) + bxy + cx + dy (b even); v = 2axy − (b/2)(x² − y²) + cy − dx, with v(0, 0) = 0. */
function conjugatePart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const a = r.nz(-3, 3);
    const h = r.nz(-2, 2);
    const c = r.int(-3, 3);
    const d = r.int(-3, 3);
    const x = r.nz(-2, 2);
    const y = r.nz(-2, 2);
    const v = 2 * a * x * y - h * (x * x - y * y) + c * y - d * x;
    if (v === 0) continue;
    return {
      prompt: fill(w.ca.prompt.conjugate, { x: String(x).replace("-", "−"), y: String(y).replace("-", "−") }),
      q: `u(x, y) = ${termsTex([[a, "x^{2}"], [-a, "y^{2}"], [2 * h, "xy"], [c, "x"], [d, "y"]])}`,
      ...exact(F(v), [["harmonicConjugateSign", F(-v)]]),
      steps: [
        `v_y = u_x = ${termsTex([[2 * a, "x"], [2 * h, "y"], [c, ""]])} \\;\\Rightarrow\\; v = ${termsTex([[2 * a, "xy"], [h, "y^{2}"], [c, "y"]])} + g(x)`,
        `v_x = -u_y: \\quad ${termsTex([[2 * a, "y"]])} + g'(x) = ${termsTex([[2 * a, "y"], [-2 * h, "x"], [-d, ""]])} \\;\\Rightarrow\\; g(x) = ${termsTex([[-h, "x^{2}"], [-d, "x"]])}`,
        `v = ${termsTex([[2 * a, "xy"], [-h, "x^{2}"], [h, "y^{2}"], [c, "y"], [-d, "x"]])}, \\quad v(${x}, ${y}) = ${v}`,
      ],
    };
  }
}

const gen: Gen = (r, L, w) => (L === 1 ? crPart(r, w) : L === 2 ? derivativePart(r, w) : conjugatePart(r, w));

export default gen;
