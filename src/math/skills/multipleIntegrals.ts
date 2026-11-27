// Practice: Double integrals. Easy integrates px + qy over a rectangle (each term integrated in its own letter only,
// the other side's length left out, named), or px + qy + sz over a box (the same, named); medium over a triangle, the
// inner limit depending on x (the limit taken as the far side, so the whole square, named), or picks the integral
// that covers the region between a parabola and a line (the curves swapped, the outer limit taken from y, or the
// order of dx and dy, named); hard an integral that can only be done with the order reversed (the number from the
// inside's derivative not divided out, named), or the area of a plane above a rectangle (the 1 under the root left
// out, or the rectangle's own area, named).
import { exact, F, numTraps, shuffled, sym } from "../calculusTwo";
import { fill } from "../text";
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

/** ∫₀ᵃ∫₀ᵇ∫₀ᶜ (px + qy + sz) dz dy dx = abc(pa + qb + sc)/2. */
function boxPart(r: Rng, w: PracticeWords): Part {
  const [p, q, s, a, b, c] = [r.int(1, 4), r.int(1, 4), r.int(1, 4), r.int(1, 3), r.int(1, 3), r.int(2, 3)];
  const f = polyTex([term(p, 1), term(q, 0, 1), term(s, 0, 0, 1)]);
  const v = F(a * b * c * (p * a + q * b + s * c), 2);
  return {
    prompt: w.vcalc.prompt.integral,
    q: `\\int_{0}^{${a}} \\int_{0}^{${b}} \\int_{0}^{${c}} \\left(${f}\\right) dz \\, dy \\, dx`,
    ...exact(v, [["tripleWidthsLeftOut", F(p * a * a + q * b * b + s * c * c, 2)]]),
    steps: [
      `\\int_{0}^{${c}} \\left(${f}\\right) dz = ${polyTex([term(p * c, 1), term(q * c, 0, 1)])} + \\frac{${s * c * c}}{2}`,
      `\\text{each term over the box: } \\frac{${p} \\cdot ${a * a} \\cdot ${b * c} + ${q} \\cdot ${b * b} \\cdot ${a * c} + ${s} \\cdot ${c * c} \\cdot ${a * b}}{2} = ${v.tex()}`,
    ],
  };
}

/** Which integral covers the region between y = x² and y = kx? */
function boundsPart(r: Rng, w: PracticeWords): Part {
  const k = r.int(2, 4);
  const opt = (top: number, lo: string, hi: string, loP: string, hiP: string, inner: "y" | "x") =>
    sym(`\\int_{0}^{${top}} \\int_{${lo}}^{${hi}} f(x, y) \\, d${inner} \\, d${inner === "y" ? "x" : "y"}`, `int 0..${top} int ${loP}..${hiP} f d${inner} d${inner === "y" ? "x" : "y"}`);
  const options = [
    opt(k, "x^{2}", `${k}x`, "x^2", `${k}x`, "y"),
    opt(k, `${k}x`, "x^{2}", `${k}x`, "x^2", "y"),
    opt(k * k, "x^{2}", `${k}x`, "x^2", `${k}x`, "y"),
    opt(k, "x^{2}", `${k}x`, "x^2", `${k}x`, "x"),
  ];
  return {
    prompt: fill(w.mvK.boundsQ, { k }),
    q: `y = x^{2}, \\quad y = ${k}x`,
    ...shuffled(r, options, 0, [["boundsCurvesSwapped", 1], ["outerLimitAsHeight", 2], ["innerVariableMismatch", 3]]),
    steps: [
      `x^{2} = ${k}x \\Rightarrow x = 0, \\; x = ${k}; \\quad 0 \\le x \\le ${k}: \\; x^{2} \\le y \\le ${k}x`,
      options[0].tex,
    ],
  };
}

const ROOTED = [[2, 2, 3], [4, 8, 9], [8, 4, 9]] as const;

/** The area of z = ax + by + c above [0, p] × [0, q]: √(1 + a² + b²)·pq. */
function surfacePart(r: Rng, w: PracticeWords): Part {
  const [a0, b0, root] = r.pick(ROOTED);
  const [a, b] = [a0 * r.sign(), b0 * r.sign()];
  const [p, q, c] = [r.int(1, 3), r.int(1, 3), r.int(-3, 3)];
  return {
    prompt: w.mvK.surfaceQ,
    q: `z = ${polyTex([term(a, 1), term(b, 0, 1), term(c, 0)])}, \\quad D = [0, ${p}] \\times [0, ${q}]`,
    ...exact(F(root * p * q), [["surfaceOneLeftOut", Math.sqrt(a * a + b * b) * p * q], ["surfaceAsShadow", p * q]]),
    steps: [
      `dS = \\sqrt{1 + z_{x}^{2} + z_{y}^{2}} \\, dA = \\sqrt{1 + ${a * a} + ${b * b}} \\, dA = ${root} \\, dA`,
      `S = ${root} \\cdot ${p * q} = ${root * p * q}`,
    ],
  };
}

const gen: Gen = (r, L, w) => {
  const more = r.int(0, 9) >= 5;
  if (L === 1) return more ? boxPart(r, w) : rectanglePart(r, w);
  if (L === 2) return more ? boundsPart(r, w) : trianglePart(r, w);
  return more ? surfacePart(r, w) : swapPart(r, w);
};

export default gen;
