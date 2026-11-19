// Practice: The polar form of a complex number. Easy writes re^{iθ} as a + bi (cos and sin swapped, named); medium
// multiplies or divides two numbers in polar form, the lengths multiplied and the angles added (the angles multiplied,
// the lengths added, or the angles added in a quotient, named); hard writes a number of the second or third quadrant
// as re^{iθ} (tan⁻¹(b/a) taken as the argument, or r² for r, named).
import { addAngles, angle, angleTex, cartesian, cx, cxTex, fromPolar, neg, type Polar, polarOf, polarTex, polarValue, rad } from "../complexPractice";
import { nice } from "../complex";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

/** A number re^{iθ} whose a + bi is exact and simple: θ a multiple of π/4 with r = m√2, or of π/6 with r = 2m. */
function nicePolar(r: Rng): Polar {
  const m = r.int(1, 3);
  if (r.next() < 0.4) {
    const k = r.pick([1, 3, -1, -3]);
    return { r: m * Math.SQRT2, t: angle(k, 4) };
  }
  const k = r.pick([1, 2, 4, 5, -1, -2, -4, -5]);
  return { r: 2 * m, t: angle(k, 6) };
}

/** re^{iθ} to a + bi. */
function toCartesianPart(r: Rng, w: PracticeWords): Part {
  const p = nicePolar(r);
  const z = polarValue(p);
  const swapped = cx(z.im, z.re);
  const rt = nice(p.r).tex;
  return {
    prompt: w.cxq.prompt.toCartesian,
    q: `z = ${polarTex(p)}`,
    ...cartesian([z], [["cosSinSwapped", [swapped]]]),
    steps: [
      `a = r\\cos\\theta = ${rt}\\cos\\left(${angleTex(p.t)}\\right) = ${nice(z.re).tex}`,
      `b = r\\sin\\theta = ${rt}\\sin\\left(${angleTex(p.t)}\\right) = ${nice(z.im).tex}`,
      `z = ${cxTex(z)}`,
    ],
  };
}

/** z₁z₂ or z₁/z₂ in polar form: lengths multiply (divide), angles add (subtract). */
function productPart(r: Rng, w: PracticeWords): Part {
  const quotient = r.next() < 0.4;
  const t1 = angle(r.nz(-5, 6), 6);
  let t2 = angle(r.nz(-5, 6), 6);
  // Angles that differ and do not cancel, so the answer has an angle to write.
  while (rad(t2) === rad(t1) || rad(t2) === -rad(t1)) t2 = angle(r.nz(-5, 6), 6);
  const r2 = r.int(1, 4);
  const r1 = quotient ? r2 * r.int(2, 4) : r.int(2, 5);
  const z1: Polar = { r: r1, t: t1 };
  const z2: Polar = { r: r2, t: t2 };
  const sum = addAngles(t1, t2);
  if (quotient) {
    const ans: Polar = { r: r1 / r2, t: addAngles(t1, t2, -1) };
    return {
      prompt: w.cxq.prompt.polarQuotient,
      q: `z_1 = ${polarTex(z1)}, \\quad z_2 = ${polarTex(z2)}`,
      ...polarOf(ans, [["quotientAnglesAdded", fromPolar(r1 / r2, rad(sum))]]),
      steps: [
        `\\frac{z_1}{z_2} = \\frac{${r1}}{${r2}}e^{i\\left(${angleTex(t1)} - \\left(${angleTex(t2)}\\right)\\right)}`,
        `= ${polarTex(ans)}`,
      ],
    };
  }
  const ans: Polar = { r: r1 * r2, t: sum };
  return {
    prompt: w.cxq.prompt.polarProduct,
    q: `z_1 = ${polarTex(z1)}, \\quad z_2 = ${polarTex(z2)}`,
    ...polarOf(ans, [
      ["anglesMultiplied", fromPolar(r1 * r2, rad(t1) * rad(t2))],
      ["lengthsAdded", fromPolar(r1 + r2, rad(sum))],
    ]),
    steps: [`z_1 z_2 = ${r1} \\cdot ${r2}\\, e^{i\\left(${angleTex(t1)} + ${angleTex(t2)}\\right)}`, `= ${polarTex(ans)}`],
  };
}

/** a + bi of the second or third quadrant to re^{iθ}. */
function toPolarPart(r: Rng, w: PracticeWords): Part {
  const m = r.int(1, 3);
  const [k, d, R] = r.pick([
    [3, 4, m * Math.SQRT2],
    [5, 6, 2 * m],
    [2, 3, 2 * m],
  ] as const);
  const p: Polar = { r: R, t: angle(r.sign() * k, d) };
  const z = polarValue(p);
  const alpha = angle(d - k, d);
  return {
    prompt: w.cxq.prompt.toPolar,
    q: `z = ${cxTex(z)}`,
    ...polarOf(p, [
      ["arctanQuadrant", neg(z)],
      ["modulusNoRoot", fromPolar(R * R, rad(p.t))],
    ]),
    steps: [
      `r = \\sqrt{${nice(z.re).tex.replace(/^-(.*)$/, "\\left(-$1\\right)")}^{2} + ${nice(z.im).tex.replace(/^-(.*)$/, "\\left(-$1\\right)")}^{2}} = ${nice(R).tex}`,
      `\\tan^{-1}\\left|\\frac{b}{a}\\right| = ${angleTex(alpha)}, \\quad a < 0 \\Rightarrow \\theta = ${z.im > 0 ? "" : "-"}\\left(\\pi - ${angleTex(alpha)}\\right) = ${angleTex(p.t)}`,
      `z = ${polarTex(p)}`,
    ],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? toCartesianPart(r, w) : L === 2 ? productPart(r, w) : toPolarPart(r, w));

export default gen;
