// Practice: Complex numbers. Easy multiplies two complex numbers (i² taken as +1, or only the like parts multiplied,
// named); medium divides by multiplying top and bottom by the conjugate (the bottom left out, named) or finds a modulus
// (the square root forgotten, named); hard solves a real quadratic with a negative discriminant (the sign of −b/2a
// lost, or only b halved, named). Since #732, half the questions are new kinds: easy, the root of a negative number,
// a power of i, the real or imaginary part, and whether a number is real, imaginary or neither; medium, a difference,
// the distance and the midpoint of two numbers, a conjugate and z times its conjugate; hard, x² + k² and x⁴ − k⁴
// factorised over the complex numbers and i·z as a quarter turn. The root left real, i's powers taken two at a time,
// the parts swapped, the minus dropped, a zero part misread, the second bracket's sign kept on the imaginary part,
// the midpoint not halved, the real part flipped, a² − b² for z times its conjugate, real brackets for a sum of
// squares, a square for the two brackets and the turn the wrong way are slips.
import { fill } from "../chart";
import { exact, F } from "../calculusTwo";
import { cartesian, cmul, conj, cx, cxTex } from "../complexPractice";
import type { MistakeId } from "../mistakes";
import { num } from "../practiceKit";
import type { CxVal, Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { pickPart } from "../tTails";

const p = (n: number) => (n < 0 ? `(${n})` : String(n));

/** (a + bi)(c + di). */
function productPart(r: Rng, w: PracticeWords): Part {
  const z = cx(r.nz(-5, 5), r.nz(-5, 5));
  const v = cx(r.nz(-5, 5), r.nz(-5, 5));
  const right = cmul(z, v);
  const iPlus = cx(z.re * v.re + z.im * v.im, z.re * v.im + z.im * v.re);
  const likeOnly = cx(z.re * v.re, z.im * v.im);
  return {
    prompt: w.cxq.prompt.product,
    q: `(${cxTex(z)})(${cxTex(v)})`,
    ...cartesian([right], [["iSquaredPlusOne", [iPlus]], ["likePartsOnly", [likeOnly]]]),
    steps: [
      `= ${p(z.re)} \\cdot ${p(v.re)} + ${p(z.re)} \\cdot ${p(v.im)}i + ${p(z.im)} \\cdot ${p(v.re)}i + ${p(z.im)} \\cdot ${p(v.im)}i^{2}`,
      `i^{2} = -1: \\quad ${z.re * v.re} - (${z.im * v.im}) + (${z.re * v.im + z.im * v.re})i = ${cxTex(right)}`,
    ],
  };
}

/** (a + bi) / (c + di), made from its answer. */
function quotientPart(r: Rng, w: PracticeWords): Part {
  const q = cx(r.nz(-4, 4), r.nz(-4, 4));
  const d = cx(r.nz(-3, 3), r.nz(-3, 3));
  const n = cmul(q, d);
  const m = d.re * d.re + d.im * d.im;
  const top = cmul(n, conj(d));
  return {
    prompt: w.cxq.prompt.quotient,
    q: `\\frac{${cxTex(n)}}{${cxTex(d)}}`,
    ...cartesian([q], [["conjugateTopOnly", [top]]]),
    steps: [
      `\\frac{${cxTex(n)}}{${cxTex(d)}} \\cdot \\frac{${cxTex(conj(d))}}{${cxTex(conj(d))}} = \\frac{${cxTex(top)}}{${d.re}^{2} + ${p(d.im)}^{2}} = \\frac{${cxTex(top)}}{${m}}`,
      `= ${cxTex(q)}`,
    ],
  };
}

const TRIPLES = [[3, 4, 5], [5, 12, 13], [6, 8, 10], [8, 15, 17], [7, 24, 25], [9, 12, 15]];

/** |a + bi| with a whole modulus. */
function modulusPart(r: Rng, w: PracticeWords): Part {
  const [a, b, L] = r.pick(TRIPLES);
  const z = r.next() < 0.5 ? cx(r.sign() * a, r.sign() * b) : cx(r.sign() * b, r.sign() * a);
  return {
    prompt: w.cxq.prompt.modulus,
    q: `|${cxTex(z)}|`,
    ...exact(F(L), [["modulusNoRoot", L * L]]),
    steps: [`|${cxTex(z)}| = \\sqrt{${p(z.re)}^{2} + ${p(z.im)}^{2}} = \\sqrt{${L * L}} = ${L}`],
  };
}

/** z² + bz + c = 0 with roots p ± qi. */
function quadraticPart(r: Rng, w: PracticeWords): Part {
  const re = r.nz(-4, 4);
  const im = r.int(1, 4);
  const [b, c] = [-2 * re, re * re + im * im];
  const roots = [cx(re, im), cx(re, -im)];
  const disc = b * b - 4 * c;
  return {
    prompt: w.cxq.prompt.quadratic,
    q: `z^{2} ${b < 0 ? "-" : "+"} ${Math.abs(b) === 1 ? "" : Math.abs(b)}z + ${c} = 0`,
    ...cartesian(roots, [
      ["minusBForgotten", [cx(-re, im), cx(-re, -im)]],
      ["halvedOnlyB", [cx(re, 2 * im), cx(re, -2 * im)]],
    ]),
    steps: [
      `\\Delta = ${p(b)}^{2} - 4 \\cdot ${c} = ${disc}, \\quad \\sqrt{\\Delta} = ${2 * im}i`,
      `z = \\frac{${-b} \\pm ${2 * im}i}{2} = ${re} \\pm ${im === 1 ? "" : im}i`,
    ],
  };
}

const gen: Gen = (r, L, w) => (r.int(0, 9) >= 5 ? more(r, L, w) : L === 1 ? productPart(r, w) : L === 2 ? (r.next() < 0.6 ? quotientPart(r, w) : modulusPart(r, w)) : quadraticPart(r, w));

/** One complex number to type, its slips each with the working its hint fills in. */
function cxPart(prompt: string, q: string, z: CxVal, slips: [MistakeId, CxVal, Record<string, string | number>][], steps: string[]): Part {
  const shown = cartesian([z], slips.map(([id, v]) => [id, [v]]));
  const traps = shown.answer.traps?.map((t) => ({ ...t, vars: slips.find(([id]) => id === t.id)![2] }));
  return { prompt, q, ...shown, answer: { ...shown.answer, ...(traps ? { traps } : {}) }, steps };
}

function numPart(prompt: string, q: string, v: number, traps: Trap[], steps: string[]): Part {
  const kept = traps.filter((t) => t.a.k === "num" && t.a.v !== v);
  return { prompt, q, answer: { ...num(v), traps: kept }, show: String(v), plain: String(v), format: "number", steps };
}

const say = (z: CxVal) => cxTex(z).replace(/-/g, "−");
const I_POW = [cx(1), cx(0, 1), cx(-1), cx(0, -1)];

function more(r: Rng, L: number, w: PracticeWords): Part {
  const W = w.cxM;
  if (L === 1) {
    const t = r.pick(["root", "power", "part", "kind"] as const);
    if (t === "root") {
      const k = r.int(2, 12);
      return cxPart(W.rootQ, `\\sqrt{-${k * k}}`, cx(0, k), [["negativeRootReal", cx(-k), { n: k * k, v: `${k}i` }]],
        [`\\sqrt{-${k * k}} = \\sqrt{${k * k}} \\cdot \\sqrt{-1} = ${k}i`]);
    }
    if (t === "power") {
      const n = r.int(5, 40);
      const v = I_POW[n % 4];
      return cxPart(W.powerQ, `i^{${n}}`, v, [["iPowerModTwo", I_POW[n % 2], { n, k: n % 4, v: say(v) }]],
        [`${n} = 4 \\cdot ${Math.floor(n / 4)} + ${n % 4}`, `i^{${n}} = i^{${n % 4}} = ${cxTex(v)}`]);
    }
    if (t === "part") {
      // The parts' sizes differ, so the parts swapped and the sign dropped never give the same number.
      let z = cx(r.nz(-9, 9), r.nz(-9, 9));
      while (Math.abs(z.re) === Math.abs(z.im)) z = cx(r.nz(-9, 9), r.nz(-9, 9));
      const im = r.next() < 0.5;
      const v = im ? z.im : z.re;
      return numPart(im ? W.imQ : W.reQ, cxTex(z), v, [
        { id: "partsSwapped", a: num(im ? z.re : z.im), vars: { z: say(z), v: String(v).replace("-", "−") } },
        { id: "imagSignDropped", a: num(-v), vars: { v: String(v).replace("-", "−") } },
      ], [`${cxTex(z)}: \\; \\text{Re} = ${z.re}, \\; \\text{Im} = ${z.im}`]);
    }
    // Real (b = 0), imaginary (a = 0) or neither: one part zero, shown as it would be written.
    const kind = r.pick([0, 1, 2]);
    const a = r.nz(-9, 9);
    const b = r.nz(-9, 9);
    const z = kind === 0 ? cx(a) : kind === 1 ? cx(0, b) : cx(a, b);
    const opts = [W.kindReal, W.kindImag, W.kindBoth];
    return pickPart(r, opts, kind, kind === 2 ? [] : [{ id: "zeroPartMisread", at: 1 - kind, vars: { z: say(z), v: opts[kind] } }],
      fill(W.kindQ, { z: say(z) }), [`\\text{Re} = ${z.re}, \\quad \\text{Im} = ${z.im}`]);
  }
  if (L === 2) {
    const t = r.pick(["minus", "distance", "mid", "conj", "zz"] as const);
    const z = cx(r.nz(-6, 6), r.nz(-6, 6));
    if (t === "minus") {
      const v = cx(r.nz(-6, 6), r.nz(-6, 6));
      const right = cx(z.re - v.re, z.im - v.im);
      return cxPart(W.diffQ, `(${cxTex(z)}) - (${cxTex(v)})`, right, [["bracketSignImag", cx(z.re - v.re, z.im + v.im), { d: say(cx(0, v.im)).replace(/^\+/, ""), v: say(right) }]],
        [`(${z.re} - ${v.re < 0 ? `(${v.re})` : v.re}) + (${z.im} - ${v.im < 0 ? `(${v.im})` : v.im})i = ${cxTex(right)}`]);
    }
    if (t === "distance") {
      const [p, q, d] = r.pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 6, 10], [4, 3, 5]] as const);
      const v = cx(z.re + r.sign() * p, z.im + r.sign() * q);
      return { prompt: W.distQ, q: `${cxTex(z)}, \\quad ${cxTex(v)}`, ...exact(F(d), [["modulusNoRoot", d * d]]),
        steps: [`|(${cxTex(v)}) - (${cxTex(z)})| = \\sqrt{${p}^{2} + ${q}^{2}} = ${d}`] };
    }
    if (t === "mid") {
      const v = cx(z.re + 2 * r.nz(-3, 3), z.im + 2 * r.nz(-3, 3));
      const m = cx((z.re + v.re) / 2, (z.im + v.im) / 2);
      return cxPart(W.midQ, `${cxTex(z)}, \\quad ${cxTex(v)}`, m, [["midpointNotHalved", cx(z.re + v.re, z.im + v.im), { v: say(m) }]],
        [`\\frac{(${cxTex(z)}) + (${cxTex(v)})}{2} = ${cxTex(m)}`]);
    }
    if (t === "conj")
      return cxPart(W.conjQ, cxTex(z), conj(z), [["conjugateRealFlipped", cx(-z.re, z.im), { z: say(z), v: say(conj(z)) }]],
        [`\\overline{${cxTex(z)}} = ${cxTex(conj(z))}`]);
    const v = z.re * z.re + z.im * z.im;
    return numPart(W.zzQ, `z = ${cxTex(z)}`, v, [{ id: "conjugateProductMinus", a: num(z.re * z.re - z.im * z.im), vars: { a: Math.abs(z.re), b: Math.abs(z.im), v } }],
      [`(${cxTex(z)})(${cxTex(conj(z))}) = ${z.re}^{2} + ${Math.abs(z.im)}^{2} = ${v}`]);
  }
  const t = r.pick(["sum", "quartic", "turn"] as const);
  if (t === "sum") {
    const k = r.int(2, 9);
    const opts = [`(x + ${k}i)(x − ${k}i)`, `(x + ${k})(x − ${k})`, `(x + ${k}i)²`, `(x − ${k})²`];
    return pickPart(r, opts, 0, [
      { id: "realFactorsForSum", at: 1, vars: { e: `x² + ${k * k}`, v: opts[0] } },
      { id: "complexFactorSquared", at: 2, vars: { e: `x² + ${k * k}`, v: opts[0] } },
    ], fill(W.factorQ, { e: `x² + ${k * k}` }), [`x^{2} + ${k * k} = x^{2} - (${k}i)^{2} = (x + ${k}i)(x - ${k}i)`]);
  }
  if (t === "quartic") {
    const k = r.int(2, 5);
    const opts = [`(x − ${k})(x + ${k})(x − ${k}i)(x + ${k}i)`, `(x − ${k})(x + ${k})(x² + ${k * k})`, `(x² − ${k * k})(x² + ${k * k})`, `(x − ${k})²(x + ${k}i)²`];
    return pickPart(r, opts, 0, [
      { id: "sumNotSplit", at: 1, vars: { f: opts[1], v: opts[0] } },
      { id: "notFullyFactored", at: 2, vars: { f: opts[2], v: opts[0] } },
    ], fill(W.factorQ, { e: `x⁴ − ${k ** 4}` }), [`x^{4} - ${k ** 4} = (x^{2} - ${k * k})(x^{2} + ${k * k})`, `= (x - ${k})(x + ${k})(x - ${k}i)(x + ${k}i)`]);
  }
  // i·z: the point a + bi turned a quarter turn to the left, to −b + ai.
  const z = cx(r.nz(-6, 6), r.nz(-6, 6));
  const right = cmul(cx(0, 1), z);
  return cxPart(W.turnQ, `z = ${cxTex(z)}`, right, [["rotatedWrongWay", cx(z.im, -z.re), { v: say(right) }], ["iSquaredPlusOne", cx(z.im, z.re), {}]],
    [`i(${cxTex(z)}) = ${z.re}i + ${z.im}i^{2} = ${cxTex(right)}`]);
}

export default gen;
