// Practice: Powers and their laws (#720). Easy (grade 7): a power worked out, which product a power stands for, and
// order of operations with fractions and powers. Medium (grade 8): the power in a product or a quotient of powers of
// one number, a power of a power, and a product or a quotient raised to a power. Hard: negative exponents in products,
// quotients and powers of powers, and powers of two in a new setting, computer memory and a doubling culture. The
// base times the exponent, the exponents multiplied in a product, divided in a quotient or added in a power of a
// power, only the top of a fraction squared, the number in front not raised and a negative exponent taken as positive
// are slips.
import { fill } from "../chart";
import { parseE, tex } from "../expr";
import type { ExprOption } from "../exprMatch";
import { fr, fracTex, num, plainFrac } from "../practiceKit";
import type { Gen, Part, Rng, Trap } from "../practiceTypes";

const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
/** k as a superscript, "⁻³" for −3. */
const sup = (k: number) => `${k < 0 ? "⁻" : ""}${[...String(Math.abs(k))].map((c) => SUP[Number(c)]).join("")}`;
/** a^k as read: "7⁴", "x⁻²". */
const pw = (a: string | number, k: number) => `${a}${sup(k)}`;

function shuffled<T>(r: Rng, xs: T[]): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = r.int(0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** A whole number to type, with one slip if it differs. */
function numberPart(prompt: string, q: string, v: number, slip: [Trap["id"], number, Record<string, string | number>] | undefined, steps: string[]): Part {
  const traps: Trap[] = slip && slip[1] !== v ? [{ id: slip[0], a: num(slip[1]), vars: { x: slip[1], v, ...slip[2] } }] : [];
  return { prompt, q, answer: { ...num(v), traps }, show: String(v), plain: String(v), format: "number", steps };
}

const gen: Gen = (r, L, w) => {
  const W = w.pwlP;
  const kind = r.int(0, 9);
  if (L === 1 && kind <= 3) {
    // A power worked out: the base multiplied by itself, as many times as the exponent says.
    const [a, n] = r.pick([[2, 5], [2, 6], [2, 7], [3, 3], [3, 4], [4, 3], [5, 3], [5, 4], [6, 3], [10, 5], [10, 6], [2, 8], [7, 3], [9, 3]] as const);
    const e = Array.from({ length: n }, () => a).join(" × ");
    return numberPart(w.prompts.evaluate, `${a}^{${n}}`, a ** n, ["timesNotPower", a * n, { n: a, k: n, e }], [`${a}^{${n}} = ${e.replace(/×/g, "\\times")} = ${a ** n}`]);
  }
  if (L === 1 && kind <= 5) {
    // Which product a power stands for, picked from four.
    const [a, n] = [r.int(3, 9), r.int(3, 5)];
    const reps = (b: number, k: number) => Array.from({ length: k }, () => b).join(" × ");
    const right = reps(a, n);
    const slip = `${a} × ${n}`;
    const texts = shuffled(r, [right, slip, reps(n, a), Array.from({ length: n }, () => a).join(" + ")]);
    const options: ExprOption[] = texts.map((t) => ({ text: t, plain: t, tex: t.replace(/×/g, "\\times") }));
    return {
      prompt: fill(W.means, { p: pw(a, n) }), q: "",
      answer: { k: "pick", options, right: texts.indexOf(right), traps: [{ id: "powerAsTimes", a: { k: "pick", options, right: texts.indexOf(slip) }, vars: { x: slip, p: pw(a, n), a, n, v: right } }] },
      show: right.replace(/×/g, "\\times"), plain: right, format: "pick", steps: [`${a}^{${n}} = ${right.replace(/×/g, "\\times")}`],
    };
  }
  if (L === 1) {
    // Order of operations with a fraction squared: the power first, the top and the bottom both squared.
    const [a, b] = r.pick([[1, 2], [2, 3], [1, 3], [3, 4], [2, 5], [1, 4], [3, 5]] as const);
    const c = r.int(1, 5);
    const times = kind >= 8;
    const sq = fr(a * a, b * b);
    const v = times ? sq.mul(fr(c)) : sq.add(fr(c, b * b));
    const top = times ? fr(a * a, b).mul(fr(c)) : fr(a * a, b).add(fr(c, b * b));
    const q = times ? `${c} \\times \\left(${fracTex(a, b)}\\right)^{2}` : `\\left(${fracTex(a, b)}\\right)^{2} + ${fr(c, b * b).tex()}`;
    const traps: Trap[] = top.sub(v).isZero() ? [] : [{ id: "fracTopOnlySquared", a: num(top.toNumber()), vars: { x: plainFrac(top), f: `${a}/${b}`, s: `${a * a}/${b * b}`, v: plainFrac(v) } }];
    return {
      prompt: w.prompts.evaluate, q, answer: { ...num(v.toNumber(), 1e-9, { lowest: true }), traps }, show: v.tex(), plain: plainFrac(v), format: "fraction",
      steps: [`\\left(${fracTex(a, b)}\\right)^{2} = ${fracTex(a * a, b * b)}`, times ? `${c} \\times ${fracTex(a * a, b * b)} = ${v.tex()}` : `${fracTex(a * a, b * b)} + ${fr(c, b * b).tex()} = ${v.tex()}`],
    };
  }
  if (L === 2 && kind <= 2) {
    // A product of powers of one number: the exponents add.
    const [a, m, n] = [r.int(2, 9), r.int(2, 7), r.int(2, 6)];
    return numberPart(fill(W.exponent, { e: `${pw(a, m)} × ${pw(a, n)}`, a }), "", m + n, ["powerProductMultiplied", m * n, { a, m, n }], [`${a}^{${m}} \\times ${a}^{${n}} = ${a}^{${m} + ${n}} = ${a}^{${m + n}}`]);
  }
  if (L === 2 && kind <= 4) {
    // A quotient of powers of one number: the exponents are taken away.
    const [a, n, t] = [r.int(2, 9), r.int(2, 4), r.int(2, 4)];
    const m = n * t + r.pick([0, 0, n]);
    return numberPart(fill(W.exponent, { e: `${pw(a, m)} ÷ ${pw(a, n)}`, a }), "", m - n, ["powersDivided", m / n, { a, m, n }], [`${a}^{${m}} \\div ${a}^{${n}} = ${a}^{${m} - ${n}} = ${a}^{${m - n}}`]);
  }
  if (L === 2 && kind <= 6) {
    // A power of a power: the exponents multiply.
    const [a, m, n] = [r.int(2, 9), r.int(2, 5), r.int(2, 5)];
    return numberPart(fill(W.exponent, { e: `(${pw(a, m)})${sup(n)}`, a }), "", m * n, ["powerOfPowerAdded", m + n, { a, m, n }], [`\\left(${a}^{${m}}\\right)^{${n}} = ${a}^{${m} \\times ${n}} = ${a}^{${m * n}}`]);
  }
  if (L === 2) {
    // A product or a quotient raised to a power: every factor is raised, the number in front too.
    const [c, m, n] = [r.int(2, 5), r.int(2, 4), r.pick([2, 3])];
    const quotient = kind === 9;
    const right = quotient ? `x^${m * n}/${c ** n}` : `${c ** n}x^${m * n}`;
    const slip = quotient ? `x^${m * n}/${c}` : `${c}x^${m * n}`;
    const q = quotient ? `\\left(\\frac{x^{${m}}}{${c}}\\right)^{${n}}` : `\\left(${c}x^{${m}}\\right)^{${n}}`;
    const E = (s: string) => parseE(s);
    return {
      prompt: W.simplify, q,
      answer: { k: "expr", e: E(right), traps: [{ id: "coefficientNotRaised", a: { k: "expr", e: E(slip) }, vars: { x: quotient ? `x${sup(m * n)}/${c}` : `${c}x${sup(m * n)}`, c, n, p: c ** n, v: quotient ? `x${sup(m * n)}/${c ** n}` : `${c ** n}x${sup(m * n)}` } }] },
      show: tex(E(right)), plain: right, format: "expr",
      steps: [quotient ? `\\frac{\\left(x^{${m}}\\right)^{${n}}}{${c}^{${n}}} = \\frac{x^{${m * n}}}{${c ** n}}` : `${c}^{${n}} \\times \\left(x^{${m}}\\right)^{${n}} = ${c ** n}x^{${m * n}}`],
    };
  }
  if (kind <= 2) {
    // Negative exponents in a product: the exponents still add, a negative one takes away.
    const [m, n] = [r.int(2, 7), r.int(2, 7)];
    const neg = r.next() < 0.5;
    const [p, q] = neg ? [-m, n] : [m, -n];
    return numberPart(fill(W.exponent, { e: `${pw("x", p)} × ${pw("x", q)}`, a: "x" }), "", p + q, ["negExponentAsPositive", m + n, { p: String(p).replace("-", "−"), q: String(q).replace("-", "−"), s: String(p + q).replace("-", "−") }],
      [`x^{${p}} \\times x^{${q}} = x^{${p} + (${q})} = x^{${p + q}}`]);
  }
  if (kind <= 4) {
    // Negative exponents in a quotient: taking a negative exponent away adds.
    const [m, n] = [r.int(2, 6), r.int(2, 6)];
    return numberPart(fill(W.exponent, { e: `${pw("x", m)} ÷ ${pw("x", -n)}`, a: "x" }), "", m + n, ["negExponentAsPositive", m - n, { p: m, q: `−${n}`, s: m + n }],
      [`x^{${m}} \\div x^{-${n}} = x^{${m} - (-${n})} = x^{${m + n}}`]);
  }
  if (kind <= 6) {
    // A power of a power with a negative exponent: the exponents multiply, signs and all.
    const [m, n] = [r.int(2, 4), r.int(2, 4)];
    const k = r.int(1, 6);
    const v = -m * n + k;
    return numberPart(fill(W.exponent, { e: `(${pw("x", -m)})${sup(n)} × ${pw("x", k)}`, a: "x" }), "", v, ["powerOfPowerAdded", -m + n + k, { a: "x", m: `−${m}`, n }],
      [`\\left(x^{-${m}}\\right)^{${n}} = x^{-${m * n}}`, `x^{-${m * n}} \\times x^{${k}} = x^{${v}}`]);
  }
  if (kind <= 8) {
    // Computer memory: a kilobyte is 2¹⁰ bytes, a megabyte 2¹⁰ kilobytes.
    const k = r.int(1, 6);
    return numberPart(fill(W.memory, { k: pw(2, k) }), "", 20 + k, ["powerProductMultiplied", 100 * k, { a: 2, m: 10, n: 10 }],
      [`2^{${k}} \\times 2^{10} \\times 2^{10} = 2^{${k} + 10 + 10} = 2^{${20 + k}}`]);
  }
  // A culture that doubles every hour: 2 to the hours more cells.
  const [a, h] = [r.int(3, 8), r.int(3, 9)];
  return numberPart(fill(W.culture, { a: pw(2, a), h }), "", a + h, ["powerProductMultiplied", a * h, { a: 2, m: a, n: h }],
    [`2^{${a}} \\times 2^{${h}} = 2^{${a} + ${h}} = 2^{${a + h}}`]);
};

export default gen;
