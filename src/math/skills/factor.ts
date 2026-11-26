// Practice: Factorising. #719 added, at the easy level: the greatest common factor of two monomials, a monomial
// divided by a factor given, a sum of two numbers written as the greatest common factor times a sum, and a negative
// factor taken out. The higher powers taken, the power not reduced, a common factor that is not the greatest and the
// signs inside not changed are slips. #728 added, three times in ten at the medium and hard levels, which pattern a
// quadratic fits: a difference of squares, a perfect square or neither. A sum of squares taken for a difference and
// a middle term that is not double the product taken for a perfect square are slips.
import { fill } from "../chart";
import { parseE, tex } from "../expr";
import { bracket, gcd, num, pmul, polyStr, T } from "../practiceKit";
import type { Gen, Part, PracticeWords, Rng, Trap } from "../practiceTypes";
import { pickPart } from "../tTails";

const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const sup = (k: number) => (k === 1 ? "" : [...String(k)].map((c) => SUP[Number(c)]).join(""));
/** c x^m y^n as read, "12x³y" (a power of 0 leaves the letter out). */
const monoRead = (c: number, m: number, n = 0) => `${c === 1 ? "" : c === -1 ? "−" : String(c).replace("-", "−")}${m ? `x${sup(m)}` : ""}${n ? `y${sup(n)}` : ""}` || "1";
const monoTyped = (c: number, m: number, n = 0) => `${c}${m ? `*x^${m}` : ""}${n ? `*y^${n}` : ""}`;
const readOf = (s: string) => s.replace(/\^(\d+)/g, (_, d: string) => [...d].map((c) => SUP[Number(c)]).join("")).replace(/ - /g, " − ").replace(/^-/, "−");

/** An expression in `vars` to type. */
function exprPart(prompt: string, right: string, vars: string[], slips: [Trap["id"], string, Record<string, string | number>][], steps: string[]): Part {
  const e = (t: string) => parseE(t, vars);
  return {
    prompt, q: "",
    answer: { k: "expr", e: e(right), vars, traps: slips.map(([id, t, v]) => ({ id, a: { k: "expr", e: e(t), vars }, vars: v })) },
    show: tex(e(right)), plain: right.replace(/\*/g, "").replace(/\^1(?!\d)/g, ""), format: "expr", steps,
  };
}

/** The kinds #719 added. */
function more(r: Rng, kind: number, w: PracticeWords): Part {
  const W = w.fctP;
  if (kind <= 6) {
    // The GCF of two monomials: the greatest number, and each letter to its lower power.
    const g = r.int(2, 6);
    const [p, q] = r.pick([[1, 2], [2, 3], [3, 4], [2, 5], [3, 5], [4, 5], [1, 3]]);
    const [m1, m2] = [r.int(1, 4), r.int(1, 4)];
    const [n1, n2] = [r.int(0, 3), r.int(1, 3)];
    const [m, n] = [Math.min(m1, m2), Math.min(n1, n2)];
    const right = monoTyped(g, m, n);
    const high = monoTyped(g, Math.max(m1, m2), Math.max(n1, n2));
    const slips: [Trap["id"], string, Record<string, string | number>][] = high === right ? [] : [["gcfHighestPower", high, { x: monoRead(g, Math.max(m1, m2), Math.max(n1, n2)), v: monoRead(g, m, n) }]];
    return exprPart(fill(W.gcf, { a: monoRead(g * p, m1, n1), b: monoRead(g * q, m2, n2) }), right, ["x", "y"], slips, [`${tex(parseE(monoTyped(g, m, n), ["x", "y"]))}: ${g} = \\gcd(${g * p}, ${g * q}), \\; x^{${m}}, \\; y^{${n}}`]);
  }
  if (kind === 7) {
    // A monomial divided by a factor: divide the numbers, take the powers away.
    const [f, c, k, m] = [r.int(2, 6), r.int(2, 7), r.int(1, 2), r.int(3, 6)];
    const right = monoTyped(c, m - k);
    return exprPart(fill(W.mono, { e: monoRead(f * c, m), f: monoRead(f, k) }), right, ["x"], [["monomialPowerKept", monoTyped(c, m), { x: monoRead(c, m), v: monoRead(c, m - k), k, m }]],
      [`${T(monoTyped(f * c, m))} \\div ${T(monoTyped(f, k))} = ${T(right)}`]);
  }
  if (kind === 8) {
    // A sum of two numbers as the greatest common factor times a sum.
    const g = r.pick([4, 6, 8, 9, 10, 12, 14, 15]);
    const [a, b] = r.pick([[2, 3], [3, 4], [2, 5], [3, 5], [4, 5], [5, 6], [3, 7], [4, 7]]);
    const small = g / [2, 3, 5, 7].find((p) => g % p === 0)!;
    return {
      prompt: fill(W.numbers, { a: g * a, b: g * b }), q: "",
      answer: { ...num(g), traps: [{ id: "notGreatestFactor", a: num(small), vars: { x: small, v: g, a: (g * a) / small, b: (g * b) / small, p: a, q: b } }] },
      show: `${g * a} + ${g * b} = ${g}(${a} + ${b})`, plain: String(g), format: "number", steps: [`${g * a} + ${g * b} = ${g}(${a} + ${b})`],
    };
  }
  // A negative factor taken out: every sign inside changes.
  const [g, a, b] = [r.int(2, 6), r.int(1, 7), r.int(1, 9)];
  const whole = polyStr([0, g * b, -g * a]);
  const right = polyStr([-b, a]);
  return exprPart(fill(W.negative, { e: readOf(whole), g: `−${g}x` }), right, ["x"], [["negFactorSign", polyStr([b, a]), { x: readOf(polyStr([b, a])), v: readOf(right), g: `−${g}x` }]],
    [`${T(whole)} = -${g}x(${T(right)})`]);
}

/** Which pattern p²x² … q² fits: a difference of squares, a perfect square, or neither (#728). */
function pattern(r: Rng, w: PracticeWords): Part {
  const W = w.fctS;
  const [p, q] = [r.int(1, 4), r.int(1, 9)];
  const px = `${p === 1 ? "" : p * p}x²`;
  const kind = r.pick(["diff", "square", "sum", "middle"] as const);
  const opts = [W.diff, W.square, W.neither];
  if (kind === "diff") return pickPart(r, opts, 0, [], fill(W.patternQ, { e: `${px} − ${q * q}` }), [`(${p === 1 ? "" : p}x)^2 - ${q}^2 = (${p === 1 ? "" : p}x - ${q})(${p === 1 ? "" : p}x + ${q})`]);
  const sign = r.next() < 0.5 ? "+" : "−";
  if (kind === "square") return pickPart(r, opts, 1, [], fill(W.patternQ, { e: `${px} ${sign} ${2 * p * q}x + ${q * q}` }), [`(${p === 1 ? "" : p}x ${sign === "+" ? "+" : "-"} ${q})^2`]);
  if (kind === "sum") {
    const e = `${px} + ${q * q}`;
    return pickPart(r, opts, 2, [{ id: "sumOfSquaresFactored", at: 0, vars: { e } }], fill(W.patternQ, { e }), [`\\text{${fill(W.sumWhy, { e })}}`]);
  }
  let m = 2 * p * q + r.pick([-2, -1, 1, 2, 3]);
  if (m <= 0) m = 2 * p * q + 1;
  const e = `${px} ${sign} ${m}x + ${q * q}`;
  return pickPart(r, opts, 2, [{ id: "middleNotDouble", at: 1, vars: { e, a: p === 1 ? "x" : `${p}x`, b: q, d: 2 * p * q, m } }], fill(W.patternQ, { e }), [`2 \\times ${p === 1 ? "" : p}x \\times ${q} = ${2 * p * q}x \\ne ${m}x`]);
}

const gen: Gen = (r, L, w) => {
  if (L === 1) {
    const extra = r.int(0, 9);
    if (extra >= 5) return more(r, extra, w);
  }
  if (L > 1 && r.int(0, 9) >= 7) return pattern(r, w);
  let fac: string;
  let cs: number[];
  if (L === 1) {
    const [a, b] = [r.nz(-9, 9), r.nz(-9, 9)];
    fac = `${bracket(1, a)}${bracket(1, b)}`;
    cs = pmul([a, 1], [b, 1]);
  } else if (L === 2) {
    let p: number, a: number, q: number, b: number;
    do [p, a, q, b] = [r.int(2, 3), r.nz(-7, 7), r.int(1, 2), r.nz(-7, 7)];
    while (gcd(p, a) !== 1 || gcd(q, b) !== 1 || p * b === q * a);
    fac = `${bracket(p, a)}${bracket(q, b)}`;
    cs = pmul([a, p], [b, q]);
  } else {
    const kind = r.int(0, 2);
    if (kind === 0) {
      let p: number, a: number;
      do [p, a] = [r.int(1, 5), r.int(1, 9)];
      while (gcd(p, a) !== 1);
      fac = `${bracket(p, -a)}${bracket(p, a)}`;
      cs = pmul([-a, p], [a, p]);
    } else if (kind === 1) {
      const [k, a, b] = [r.int(2, 5), r.nz(-6, 6), r.nz(-6, 6)];
      fac = `${k}${bracket(1, a)}${bracket(1, b)}`;
      cs = pmul([k], pmul([a, 1], [b, 1]));
    } else {
      let k: number, a: number, p: number;
      do [k, p, a] = [r.int(1, 4), r.int(2, 6), r.nz(-9, 9)];
      while (gcd(p, a) !== 1);
      fac = `${k === 1 ? "" : k}x${bracket(p, a)}`;
      cs = pmul([0, k], [a, p]);
    }
  }
  const ex = polyStr(cs);
  return { prompt: w.prompts.factor, q: T(ex), answer: { k: "expr", e: parseE(ex), mode: "factor" }, show: T(fac), plain: fac, format: "factors", solution: { kind: "algebra", spec: { topic: "factor", eq: ex, method: "factor" } } };
};

export default gen;
