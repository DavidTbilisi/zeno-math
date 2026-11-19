// Practice: De Moivre's theorem, n-th roots and loci. Easy raises a number to a power through (re^{iθ})ⁿ = rⁿe^{inθ}
// (r left unpowered, or θ not multiplied, named); medium solves zⁿ = w for all its roots (the modulus not rooted, or the
// angle of w not divided by n, named); hard names a locus in the Argand diagram, |z − a| = r or arg(z − a) = θ (the
// centre's sign flipped, or the whole line for a half-line, named).
import { angle, angleTex, angleText, cartesian, cx, cxPlain, cxTex, fromPolar, neg, type Polar, polarList, polarTex, polarValue, rad, zMinusTex } from "../complexPractice";
import { pickOf, word } from "../calculusTwo";
import { fill } from "../text";
import { shuffle } from "../linearAlgebra";
import { nice } from "../complex";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

// Bases whose powers stay exact: 1 ± i (r = √2, θ = ±π/4, ±3π/4), 1 ± √3i and √3 ± i (r = 2).
const BASES: [Polar, number][] = [
  ...[1, 3, -1, -3].map((k): [Polar, number] => [{ r: Math.SQRT2, t: angle(k, 4) }, 8]),
  ...[1, 2, -1, -2].map((k): [Polar, number] => [{ r: 2, t: angle(k, 3) }, 6]),
  ...[1, 5, -1, -5].map((k): [Polar, number] => [{ r: 2, t: angle(k, 6) }, 6]),
];

/** (a + bi)ⁿ through the polar form. */
function powerPart(r: Rng, w: PracticeWords): Part {
  const [base, top] = r.pick(BASES);
  const n = r.int(3, top);
  const z = polarValue(base);
  const t = angle(base.t.k * n, base.t.d);
  const rn = base.r ** n;
  const ans = fromPolar(rn, rad(t));
  const clean = cx(Math.round(ans.re * 1e9) / 1e9, Math.round(ans.im * 1e9) / 1e9);
  return {
    prompt: w.cxq.prompt.power,
    q: `\\left(${cxTex(z)}\\right)^{${n}}`,
    ...cartesian([clean], [
      ["modulusNotPowered", [fromPolar(base.r, rad(t))]],
      ["argumentNotMultiplied", [fromPolar(rn, rad(base.t))]],
    ]),
    steps: [
      `${cxTex(z)} = ${polarTex(base)}`,
      `\\left(${polarTex(base)}\\right)^{${n}} = ${nice(rn).tex}\\, e^{i \\cdot ${n} \\cdot ${base.t.k < 0 ? `\\left(${angleTex(base.t)}\\right)` : angleTex(base.t)}} = ${polarTex({ r: rn, t })}`,
      `= ${cxTex(clean)}`,
    ],
  };
}

/** zⁿ = w with w on an axis, so its roots are R e^{i(φ + 2πk)/n}. */
function rootsPart(r: Rng, w: PracticeWords): Part {
  const n = r.int(2, 4);
  const R = r.int(1, 3);
  // φ = 0, π/2, π or −π/2, as kπ/2.
  const q = r.int(-1, 2);
  const target = fromPolar(R ** n, (q * Math.PI) / 2);
  const roots = (mod: number, divided: boolean): Polar[] =>
    Array.from({ length: n }, (_, j) => ({ r: mod, t: divided ? angle(q + 4 * j, 2 * n) : angle(q * n + 4 * j, 2 * n) }));
  const right = roots(R, true);
  return {
    prompt: w.cxq.prompt.roots,
    q: `z^{${n}} = ${cxTex(cx(Math.round(target.re), Math.round(target.im)))}`,
    ...polarList(right, [
      ["rootModulusNotRooted", roots(R ** n, true)],
      ["rootsAngleNotDivided", roots(R, false)],
    ]),
    steps: [
      `${cxTex(cx(Math.round(target.re), Math.round(target.im)))} = ${polarTex({ r: R ** n, t: angle(q, 2) })}`,
      `z = ${R === 1 ? "" : `\\sqrt[${n}]{${R ** n}}\\,`}e^{i\\frac{${q === 0 ? "" : `${angleTex(angle(q, 2))} + `}2\\pi k}{${n}}}, \\quad k = 0, \\dots, ${n - 1}`,
      `z = ${right.map(polarTex).join(", \\; ")}`,
    ],
  };
}

/** |z − a| = r is a circle; arg(z − a) = θ a half-line from a. */
function locusPart(r: Rng, w: PracticeWords): Part {
  const a = cx(r.nz(-4, 4), r.nz(-4, 4));
  const c = cxPlain(a).replace(/-/g, "−");
  const minus = cxPlain(neg(a)).replace(/-/g, "−");
  if (r.next() < 0.5) {
    const rad0 = r.int(2, 5);
    const options = [
      word(fill(w.cxq.locus.circle, { c, r: rad0 })),
      word(fill(w.cxq.locus.circle, { c: minus, r: rad0 })),
      word(fill(w.cxq.locus.circle, { c, r: rad0 * rad0 })),
      word(fill(w.cxq.locus.line, { c, t: "π/4" })),
    ];
    const order = shuffle(r, [0, 1, 2, 3]);
    const at = (i: number) => order.indexOf(i);
    return {
      prompt: w.cxq.prompt.locus,
      q: `|${zMinusTex(a)}| = ${rad0}`,
      ...pickOf(order.map((i) => options[i]), at(0), [["locusCentreSign", at(1)]]),
      steps: [`|z - (${cxTex(a)})| = ${rad0}: \\text{${fill(w.cxq.locus.circle, { c, r: rad0 })}}`],
    };
  }
  const t = angle(r.pick([1, -1, 3, -3]), 4);
  const tt = angleText(t);
  const options = [
    word(fill(w.cxq.locus.halfLine, { c, t: tt })),
    word(fill(w.cxq.locus.line, { c, t: tt })),
    word(fill(w.cxq.locus.halfLine, { c: minus, t: tt })),
    word(fill(w.cxq.locus.halfLine, { c, t: angleText(angle(-t.k, t.d)) })),
  ];
  const order = shuffle(r, [0, 1, 2, 3]);
  const at = (i: number) => order.indexOf(i);
  return {
    prompt: w.cxq.prompt.locus,
    q: `\\arg(${zMinusTex(a)}) = ${angleTex(t)}`,
    ...pickOf(order.map((i) => options[i]), at(0), [["locusFullLine", at(1)], ["locusCentreSign", at(2)]]),
    steps: [`\\arg(z - (${cxTex(a)})) = ${angleTex(t)}: \\text{${fill(w.cxq.locus.halfLine, { c, t: tt })}}`],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? powerPart(r, w) : L === 2 ? rootsPart(r, w) : locusPart(r, w));

export default gen;
