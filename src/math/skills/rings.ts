// Practice: Rings, ideals and quotient rings. Easy lists the units or the zero divisors of ℤₙ (the two swapped, or 0
// counted as a zero divisor, named); medium says whether a ring is a field, an integral domain that is not a field, or
// neither (a domain called a field, a field's inverses missed, a zero divisor missed, named); hard finds the generator
// of a sum, intersection or product of ideals of ℤ (gcd and lcm swapped, the intersection and the product mixed, the
// generators added, named) or the size of ℤₚ[x]/(f) (p times the degree, named).
import { pickOf, word } from "../calculusTwo";
import { elementsOf, gcd, lcm, setOfTex, Zn } from "../groups";
import { wholeOf } from "../realAnalysis";
import { polyTex, unitsOf, zeroDivisorsOf } from "../ringsFields";
import { fill } from "../text";
import type { MistakeId } from "../mistakes";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

function unitsPart(r: Rng, w: PracticeWords): Part {
  const n = r.pick([8, 9, 10, 12, 14, 15]);
  const U = unitsOf(n);
  const Z = zeroDivisorsOf(n);
  if (r.int(0, 1) === 0)
    return {
      prompt: fill(w.rf.prompt.units, { n }),
      q: `${Zn(n)}^{\\times}`,
      ...elementsOf(U, [["unitsZeroDivisorsSwapped", Z]]),
      steps: [`a \\in ${Zn(n)}^{\\times} \\iff \\gcd(a, ${n}) = 1`, `${Zn(n)}^{\\times} = ${setOfTex(U)}`],
    };
  const a = Z[Z.length - 1];
  const b = n / gcd(a, n);
  return {
    prompt: fill(w.rf.prompt.zeroDivisors, { n }),
    q: Zn(n),
    ...elementsOf(Z, [["zeroDivisorIncludesZero", [0, ...Z]], ["unitsZeroDivisorsSwapped", U]]),
    steps: [`a \\ne 0, \\; \\gcd(a, ${n}) > 1: \\quad a \\cdot \\frac{${n}}{\\gcd(a, ${n})} \\equiv 0 \\pmod{${n}}`, `${a} \\cdot ${b} = ${a * b} \\equiv 0 \\pmod{${n}}`, setOfTex(Z)],
  };
}

/** 0 a field, 1 an integral domain that is not a field, 2 neither. */
type Ring = { q: string; kind: 0 | 1 | 2; step: string };
function ringsOf(r: Rng): Ring[] {
  const p = r.pick([5, 7, 11, 13]);
  const [d, e] = r.pick([[2, 3], [2, 4], [3, 4], [2, 5], [3, 5]]);
  return [
    { q: Zn(p), kind: 0, step: `a \\cdot a^{${p - 2}} = a^{${p - 1}} \\equiv 1 \\pmod{${p}} \\quad (a \\ne 0)` },
    { q: Zn(d * e), kind: 2, step: `${d} \\cdot ${e} = ${d * e} \\equiv 0 \\pmod{${d * e}}` },
    { q: "\\mathbb{Z}", kind: 1, step: "ab = 0 \\Rightarrow a = 0 \\lor b = 0, \\quad 2x = 1 \\Rightarrow x = \\tfrac{1}{2} \\notin \\mathbb{Z}" },
    { q: "\\mathbb{Z}[x]", kind: 1, step: "\\deg(fg) = \\deg f + \\deg g \\ge 1 \\Rightarrow x \\cdot g(x) \\ne 1" },
    { q: "\\mathbb{Z}[i]", kind: 1, step: "\\mathbb{Z}[i] \\subset \\mathbb{C}, \\quad 2(a + bi) = 1 \\Rightarrow a = \\tfrac{1}{2} \\notin \\mathbb{Z}" },
    { q: "\\mathbb{Q}(\\sqrt{2})", kind: 0, step: "(a + b\\sqrt{2})^{-1} = \\frac{a - b\\sqrt{2}}{a^{2} - 2b^{2}}, \\quad a^{2} - 2b^{2} \\ne 0" },
    { q: "M_{2}(\\mathbb{R})", kind: 2, step: "\\begin{pmatrix} 1 & 0 \\\\ 0 & 0 \\end{pmatrix} \\begin{pmatrix} 0 & 0 \\\\ 0 & 1 \\end{pmatrix} = \\begin{pmatrix} 0 & 0 \\\\ 0 & 0 \\end{pmatrix}" },
    { q: "\\mathbb{Z} \\times \\mathbb{Z}", kind: 2, step: "(1, 0) \\cdot (0, 1) = (0, 0)" },
    { q: "\\mathbb{R}[x] / (x^{2} + 1)", kind: 0, step: "x^{2} + 1 \\ne 0 \\; (x \\in \\mathbb{R}) \\Rightarrow \\mathbb{R}[x] / (x^{2} + 1) \\cong \\mathbb{C}" },
    { q: "\\mathbb{R}[x] / (x^{2} - 1)", kind: 2, step: "(x - 1)(x + 1) = x^{2} - 1 \\equiv 0" },
    { q: `${Zn(p)}[x]`, kind: 1, step: `\\deg(fg) = \\deg f + \\deg g \\ge 1 \\Rightarrow x \\cdot g(x) \\ne 1` },
    { q: `${Zn(d * e)}[x]`, kind: 2, step: `${d} \\cdot ${e} = ${d * e} \\equiv 0 \\pmod{${d * e}}` },
    { q: "\\mathbb{Z}_{2}[x] / (x^{2} + x + 1)", kind: 0, step: "f(0) = f(1) = 1 \\ne 0 \\Rightarrow \\mathbb{Z}_{2}[x] / (x^{2} + x + 1) = GF(4)" },
    { q: "\\mathbb{Z}_{2}[x] / (x^{2} + 1)", kind: 2, step: "(x + 1)(x + 1) = x^{2} + 2x + 1 \\equiv x^{2} + 1 \\equiv 0" },
  ];
}

function kindPart(r: Rng, w: PracticeWords): Part {
  const c = r.pick(ringsOf(r));
  const k = w.rf.kind;
  const options = [word(k.field), word(k.domain), word(k.neither)];
  const slip: [MistakeId, number] =
    c.kind === 0 ? ["fieldInversesMissed", 1] : c.kind === 1 ? ["domainCalledField", 0] : ["zeroDivisorMissed", 1];
  return { prompt: w.rf.prompt.ringKind, q: c.q, ...pickOf(options, c.kind, [slip]), steps: [c.step] };
}

function idealPart(r: Rng, w: PracticeWords): Part {
  const kind = r.int(0, 3);
  if (kind === 3) {
    const [p, d] = r.pick([[2, 3], [2, 4], [3, 2], [3, 3], [5, 2], [5, 3], [7, 2]]);
    const f = [r.int(1, p - 1), ...Array.from({ length: d - 1 }, () => r.int(0, p - 1)), 1];
    const v = p ** d;
    return {
      prompt: fill(w.rf.prompt.quotientSize, { p }),
      q: `${Zn(p)}[x] / (${polyTex(f)})`,
      ...wholeOf(v, [["quotientSizeMultiplied", p * d]]),
      steps: [`${Zn(p)}[x] / (f) = \\{c_{0} + c_{1}x${d > 2 ? " + \\dots" : ""} + c_{${d - 1}}x${d > 2 ? `^{${d - 1}}` : ""} : c_{i} \\in ${Zn(p)}\\}`, `${p}^{${d}} = ${v}`],
    };
  }
  for (;;) {
    const [a, b] = [r.pick([4, 6, 8, 9, 10, 12, 14, 15, 18, 20, 21]), r.pick([4, 6, 8, 9, 10, 12, 14, 15, 18, 20, 21])];
    const g = gcd(a, b);
    if (g === 1 || a % b === 0 || b % a === 0) continue;
    const l = lcm(a, b);
    if (kind === 0)
      return {
        prompt: w.rf.prompt.idealSum,
        q: `(${a}) + (${b}) \\subseteq \\mathbb{Z}`,
        ...wholeOf(g, [["idealGcdLcmSwapped", l], ["idealGeneratorsAdded", a + b]]),
        steps: [`(${a}) + (${b}) = \\{${a}x + ${b}y : x, y \\in \\mathbb{Z}\\}`, `= (\\gcd(${a}, ${b})) = (${g})`],
      };
    if (kind === 1)
      return {
        prompt: w.rf.prompt.idealMeet,
        q: `(${a}) \\cap (${b}) \\subseteq \\mathbb{Z}`,
        ...wholeOf(l, [["idealGcdLcmSwapped", g], ["idealIntersectionProduct", a * b]]),
        steps: [`m \\in (${a}) \\cap (${b}) \\iff ${a} \\mid m \\land ${b} \\mid m`, `= (\\operatorname{lcm}(${a}, ${b})) = (${l})`],
      };
    return {
      prompt: w.rf.prompt.idealProduct,
      q: `(${a})(${b}) \\subseteq \\mathbb{Z}`,
      ...wholeOf(a * b, [["idealIntersectionProduct", l], ["idealGcdLcmSwapped", g]]),
      steps: [`(${a})(${b}) = \\{\\textstyle\\sum ${a}x_{i} \\cdot ${b}y_{i}\\}`, `= (${a} \\cdot ${b}) = (${a * b})`],
    };
  }
}

const gen: Gen = (r, L, w) => (L === 1 ? unitsPart(r, w) : L === 2 ? kindPart(r, w) : idealPart(r, w));

export default gen;
