// Practice: Applications of integration. Easy is the area between a parabola and a line that cuts it twice (the
// area under the line alone, named); medium the volume when the region under y = kx, √(kx) or x² is turned about the
// x-axis (π left out, and the integral squared instead of y, named); hard the length of a curve made so that
// 1 + (y′)² is a perfect square (the 1 + left out, so the length is just the rise, named).
import { exact, F, piTimes } from "../calculusTwo";
import { polyStr, T } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

/** The area between y = cx² and the line through the points where x = r₁ and x = r₂. */
function areaPart(r: Rng, w: PracticeWords): Part {
  const r1 = r.int(-3, 2);
  const gap = r.int(1, 4);
  const r2 = r1 + gap;
  const c = r.int(1, 2);
  const [m, b] = [r1 + r2, -r1 * r2];
  const line = polyStr([c * b, c * m]);
  const v = F(c * gap ** 3, 6);
  const under = F(c * (m * (r2 * r2 - r1 * r1) + 2 * b * (r2 - r1)), 2);
  const par = `${c === 1 ? "" : c}x^{2}`;
  return {
    prompt: w.calc2.prompt.area,
    q: `y = ${par}, \\quad y = ${T(line)}`,
    ...exact(v, [["onlyTopCurve", under]]),
    steps: [
      `${par} = ${T(line)} \\Rightarrow x = ${r1}, \\ x = ${r2}`,
      `\\int_{${r1}}^{${r2}} \\left(${T(line)} - ${par}\\right) dx = ${v.tex()}`,
    ],
  };
}

/** The volume when the region under y = f(x), 0 ≤ x ≤ h, is turned about the x-axis. */
function volumePart(r: Rng, w: PracticeWords): Part {
  const kind = r.int(0, 2);
  const k = r.int(1, 3);
  const h = kind === 2 ? r.int(1, 2) : r.int(1, 3);
  const c = kind === 0
    ? { y: `${k === 1 ? "" : k}x`, sq: `${k * k === 1 ? "" : k * k}x^{2}`, v: F(k * k * h ** 3, 3), int: F(k * h * h, 2) }
    : kind === 1
      ? { y: `\\sqrt{${k === 1 ? "" : k}x}`, sq: `${k === 1 ? "" : k}x`, v: F(k * h * h, 2), int: null }
      : { y: "x^{2}", sq: "x^{4}", v: F(h ** 5, 5), int: F(h ** 3, 3) };
  // ∫√(kx) dx = (2/3)√k x^(3/2): its square is (4/9)k h³.
  const squared = c.int ? c.int.mul(c.int).toNumber() : (4 * k * h ** 3) / 9;
  return {
    prompt: w.calc2.prompt.volume,
    q: `y = ${c.y}, \\quad 0 \\le x \\le ${h}`,
    ...piTimes(c.v, [["forgotPi", c.v], ["squaredAfterIntegrating", squared * Math.PI]]),
    steps: [`V = \\pi \\int_{0}^{${h}} y^{2} \\, dx = \\pi \\int_{0}^{${h}} ${c.sq} \\, dx`, `= ${c.v.tex()}\\pi`],
  };
}

/** The length of y = (2/3)x^(3/2) or (1/3)(x² + 2)^(3/2) from x = 0 to b. */
function arcPart(r: Rng, w: PracticeWords): Part {
  if (r.next() < 0.5) {
    const s = r.int(2, 5);
    const b = s * s - 1;
    const v = F(2 * (s ** 3 - 1), 3);
    return {
      prompt: w.calc2.prompt.arc,
      q: `y = \\frac{2}{3}x^{\\frac{3}{2}}, \\quad 0 \\le x \\le ${b}`,
      ...exact(v, [["forgotOnePlus", (2 / 3) * b ** 1.5]]),
      steps: [`y' = \\sqrt{x}, \\quad 1 + (y')^{2} = 1 + x`, `L = \\int_{0}^{${b}} \\sqrt{1 + x} \\, dx = \\left[\\frac{2}{3}(1 + x)^{\\frac{3}{2}}\\right]_{0}^{${b}} = \\frac{2}{3}\\left(${s ** 3} - 1\\right) = ${v.tex()}`],
    };
  }
  const b = r.int(1, 3);
  const v = F(b ** 3 + 3 * b, 3);
  return {
    prompt: w.calc2.prompt.arc,
    q: `y = \\frac{1}{3}\\left(x^{2} + 2\\right)^{\\frac{3}{2}}, \\quad 0 \\le x \\le ${b}`,
    ...exact(v, [["forgotOnePlus", ((b * b + 2) ** 1.5 - 2 ** 1.5) / 3]]),
    steps: [`y' = x\\sqrt{x^{2} + 2}, \\quad 1 + (y')^{2} = \\left(x^{2} + 1\\right)^{2}`, `L = \\int_{0}^{${b}} \\left(x^{2} + 1\\right) dx = \\frac{${b ** 3}}{3} + ${b} = ${v.tex()}`],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? areaPart(r, w) : L === 2 ? volumePart(r, w) : arcPart(r, w));

export default gen;
