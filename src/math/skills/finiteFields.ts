// Practice: Finite fields. Easy finds an inverse or a power in GF(p) = ℤₚ (the additive inverse, or the exponent
// reduced mod p instead of p − 1, named); medium counts in GF(pⁿ): the multiplicative group, its generators, the
// subfields (the field's size, every non-zero element, or every m ≤ n, named); hard multiplies in GF(pⁿ) = ℤₚ[x]/(f)
// (the power xⁿ not reduced by f, or the coefficients not reduced mod p, named).
import { divisors, invMod, setOfTex, Zn } from "../groups";
import { fnOf } from "../odes";
import { wholeOf } from "../realAnalysis";
import { mulIn, mulPoly, polyPlain, polyTex, reduceMod, remPoly, totient, type Poly } from "../ringsFields";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const GF = (q: number | string) => `GF(${q})`;

function primePart(r: Rng, w: PracticeWords): Part {
  const p = r.pick([7, 11, 13, 17, 19, 23]);
  if (r.int(0, 1) === 0) {
    for (;;) {
      const a = r.int(2, p - 2);
      const inv = invMod(a, p);
      if (inv === p - a) continue;
      const k = (a * inv - 1) / p;
      return {
        prompt: fill(w.rf.prompt.inverseModP, { p }),
        q: `${a}^{-1} \\in ${GF(p)}`,
        ...wholeOf(inv, [["inverseAsNegative", p - a]]),
        steps: [`${a} \\cdot ${inv} = ${a * inv} = ${k} \\cdot ${p} + 1`, `${a} \\cdot ${inv} \\equiv 1 \\pmod{${p}}`],
      };
    }
  }
  for (;;) {
    const a = r.int(2, p - 2);
    const k = r.int(2 * p, 5 * p);
    const s = k % (p - 1);
    const pw = (e: number) => Array.from({ length: e }).reduce<number>((x) => (x * a) % p, 1);
    const v = pw(s);
    const wrong = pw(k % p);
    if (wrong === v) continue;
    return {
      prompt: fill(w.rf.prompt.powerModP, { p }),
      q: `${a}^{${k}} \\in ${GF(p)}`,
      ...wholeOf(v, [["fermatExponentModP", wrong]]),
      steps: [`${a}^{${p - 1}} \\equiv 1 \\pmod{${p}}`, `${k} = ${Math.floor(k / (p - 1))} \\cdot ${p - 1} + ${s} \\Rightarrow ${a}^{${k}} \\equiv ${a}^{${s}} \\equiv ${v}`],
    };
  }
}

function countPart(r: Rng, w: PracticeWords): Part {
  const kind = r.int(0, 2);
  if (kind < 2) {
    const [p, n] = r.pick([[2, 3], [2, 4], [2, 5], [2, 6], [3, 2], [3, 3], [3, 4], [5, 2], [5, 3], [7, 2]]);
    const q = p ** n;
    const field = GF(`${p}^{${n}}`);
    if (kind === 0)
      return {
        prompt: w.rf.prompt.groupOrder,
        q: `|${field}^{\\times}|`,
        ...wholeOf(q - 1, [["groupOrderIsFieldSize", q]]),
        steps: [`${field}^{\\times} = ${field} \\setminus \\{0\\}`, `${p}^{${n}} - 1 = ${q - 1}`],
      };
    const v = totient(q - 1);
    return {
      prompt: w.rf.prompt.primitive,
      q: field,
      ...wholeOf(v, [["primitiveCountAll", q - 1]]),
      steps: [`${field}^{\\times} \\cong \\mathbb{Z}_{${q - 1}}`, `\\varphi(${q - 1}) = ${v}`],
    };
  }
  const p = r.pick([2, 3, 5]);
  const n = r.pick([4, 6, 8, 9, 10, 12]);
  const ds = divisors(n);
  return {
    prompt: w.rf.prompt.subfields,
    q: GF(`${p}^{${n}}`),
    ...wholeOf(ds.length, [["subfieldsAllBelow", n]]),
    steps: [`${GF(`${p}^{m}`)} \\subseteq ${GF(`${p}^{${n}}`)} \\iff m \\mid ${n}`, `m \\in ${setOfTex(ds)}`],
  };
}

/** GF(pⁿ) as ℤₚ[x]/(f), f monic irreducible of degree n. */
const FIELDS: { p: number; f: Poly }[] = [
  { p: 2, f: [1, 1, 1] },
  { p: 2, f: [1, 1, 0, 1] },
  { p: 3, f: [1, 0, 1] },
  { p: 5, f: [2, 0, 1] },
  { p: 7, f: [1, 0, 1] },
];

function productPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const { p, f } = r.pick(FIELDS);
    const n = f.length - 1;
    const el = (): Poly => [r.int(0, p - 1), ...Array.from({ length: n - 2 }, () => r.int(0, p - 1)), r.int(1, p - 1)];
    const [a, b] = [el(), el()];
    const raw = mulPoly(a, b);
    const modP = reduceMod(raw, p);
    const v = mulIn(a, b, f, p);
    const overZ = remPoly(raw, f);
    if (polyPlain(modP) === polyPlain(v) || polyPlain(overZ) === polyPlain(v)) continue;
    const q = p ** n;
    const xn = reduceMod(remPoly([...Array(n).fill(0), 1], f), p);
    return {
      prompt: fill(w.rf.prompt.product, { q, p, n }),
      q: `(${polyTex(a)})(${polyTex(b)}) \\in ${Zn(p)}[x] / (${polyTex(f)})`,
      ...fnOf(polyPlain(v), [["powerNotReduced", polyPlain(modP)], ["notReducedMod", polyPlain(overZ)]]),
      steps: [`= ${polyTex(raw)} \\equiv ${polyTex(modP)} \\pmod{${p}}`, `x^{${n}} \\equiv ${polyTex(xn)}`, `= ${polyTex(v)}`],
    };
  }
}

const gen: Gen = (r, L, w) => (L === 1 ? primePart(r, w) : L === 2 ? countPart(r, w) : productPart(r, w));

export default gen;
