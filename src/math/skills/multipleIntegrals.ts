// Practice: Double integrals. Easy integrates px + qy over a rectangle (each term integrated in its own letter only,
// the other side's length left out, named); medium over a triangle, the inner limit depending on x (the limit taken
// as the far side, so the whole square, named); hard an integral that can only be done with the order reversed
// (the number from the inside's derivative not divided out, named).
import { exact, F, numTraps } from "../calculusTwo";
import { gcd, num } from "../practiceKit";
import { polyTex, term } from "../vectorCalculus";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

/** ∫₀ʷ∫₀ʰ (px + qy) dy dx. */
function rectanglePart(r: Rng, w: PracticeWords): Part {
  const [p, q, a, b] = [r.int(1, 4), r.int(1, 4), r.int(2, 4), r.int(2, 4)];
  const f = polyTex([term(p, 1), term(q, 0, 1)]);
  const v = F(p * a * a * b + q * a * b * b, 2);
  return {
    prompt: w.vcalc.prompt.integral,
    q: `\\int_{0}^{${a}} \\int_{0}^{${b}} \\left(${f}\\right) dy \\, dx`,
    ...exact(v, [["forgotOtherWidth", F(p * a * a + q * b * b, 2)]]),
    steps: [
      `\\int_{0}^{${b}} \\left(${f}\\right) dy = ${polyTex([term(p * b, 1)])} + \\frac{${q * b * b}}{2}`,
      `\\int_{0}^{${a}} \\left(${polyTex([term(p * b, 1)])} + \\frac{${q * b * b}}{2}\\right) dx = \\frac{${p * b * a * a}}{2} + \\frac{${q * b * b * a}}{2} = ${v.tex()}`,
    ],
  };
}

/** ∫₀ᵃ∫₀ˣ (px + qy) dy dx: the triangle under y = x. */
function trianglePart(r: Rng, w: PracticeWords): Part {
  const [p, q, a] = [r.int(1, 4), r.int(1, 4), r.int(1, 4)];
  const f = polyTex([term(p, 1), term(q, 0, 1)]);
  const v = F((2 * p + q) * a ** 3, 6);
  return {
    prompt: w.vcalc.prompt.integral,
    q: `\\int_{0}^{${a}} \\int_{0}^{x} \\left(${f}\\right) dy \\, dx`,
    ...exact(v, [["limitsAsConstants", F((p + q) * a ** 3, 2)]]),
    steps: [
      `\\int_{0}^{x} \\left(${f}\\right) dy = ${p === 1 ? "" : p}x^{2} + \\frac{${q === 1 ? "" : q}x^{2}}{2} = \\frac{${2 * p + q}}{2}x^{2}`,
      `\\int_{0}^{${a}} \\frac{${2 * p + q}}{2}x^{2} \\, dx = \\frac{${2 * p + q}}{6} \\cdot ${a ** 3} = ${v.tex()}`,
    ],
  };
}

/** ∫₀^{ka}∫_{y/k}^{a} e^{x²} dx dy, or the same with e^{x³} over y ≤ kx²: reversed, the inner integral is kx eˣ² (or kx²eˣ³). */
function swapPart(r: Rng, w: PracticeWords): Part {
  const n = r.int(2, 3);
  const a = r.int(1, 2);
  const k = r.int(1, 3);
  const top = k * a ** (n - 1);
  const e = a ** n;
  const v = (k * (Math.exp(e) - 1)) / n;
  const traps = numTraps(v, [["forgotInnerFactor", k * (Math.exp(e) - 1)]]);
  const kk = k === 1 ? "" : String(k);
  // The number in front, k/n in lowest terms.
  const g = gcd(k, n);
  const [top1, bot1] = [k / g, n / g];
  const lead = top1 === 1 ? "" : String(top1);
  const showV = bot1 === 1 ? `${lead}\\left(e^{${e}} - 1\\right)` : `\\frac{${lead}\\left(e^{${e}} - 1\\right)}{${bot1}}`;
  const plainV = bot1 === 1 ? (lead ? `${lead}(e^${e} - 1)` : `e^${e} - 1`) : `${lead}(e^${e} - 1)/${bot1}`;
  const lower = n === 2 ? (k === 1 ? "y" : `\\frac{y}{${k}}`) : k === 1 ? "\\sqrt{y}" : `\\sqrt{\\frac{y}{${k}}}`;
  const inner = n === 2 ? `${kk}x` : `${kk}x^{2}`;
  const lowerY = n === 2 ? `${kk}x` : `${kk}x^{2}`;
  return {
    prompt: w.vcalc.prompt.swapOrder,
    q: `\\int_{0}^{${top}} \\int_{${lower}}^{${a}} e^{x^{${n}}} \\, dx \\, dy`,
    answer: { ...num(v), ...(traps.length ? { traps } : {}) },
    show: showV,
    plain: plainV,
    format: "exact",
    steps: [
      `0 \\le y \\le ${lowerY}, \\quad 0 \\le x \\le ${a}: \\quad \\int_{0}^{${a}} \\int_{0}^{${lowerY}} e^{x^{${n}}} \\, dy \\, dx = \\int_{0}^{${a}} ${inner} e^{x^{${n}}} \\, dx`,
      `= \\left[\\frac{${kk}e^{x^{${n}}}}{${n}}\\right]_{0}^{${a}} = ${showV}`,
    ],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? rectanglePart(r, w) : L === 2 ? trianglePart(r, w) : swapPart(r, w));

export default gen;
