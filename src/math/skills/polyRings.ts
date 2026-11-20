// Practice: Polynomial rings. Easy finds the remainder of f on division by x − a in ℤₚ[x] (f(−a), or f(a) not reduced
// mod p, named); medium names the prime that makes Eisenstein's criterion work (a prime whose square divides the
// constant term, named); hard says whether f is irreducible over ℤₚ (a root missed, or a quartic with no root taken to
// be irreducible though it is two quadratics, named).
import { pickOf, word } from "../calculusTwo";
import { Zn } from "../groups";
import { wholeOf } from "../realAnalysis";
import { evalMod, evalPoly, mulPoly, polyTex, rootsMod } from "../ringsFields";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

function remainderPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const p = r.pick([5, 7, 11]);
    const f = [r.int(0, p - 1), r.int(0, p - 1), r.int(0, p - 1), r.int(1, p - 1)];
    const a = r.int(2, p - 1);
    const raw = evalPoly(f, a);
    const v = evalMod(f, a, p);
    const back = evalMod(f, p - a, p);
    if (raw === v || back === v) continue;
    const terms = f
      .map((c, k) => [c, k] as const)
      .filter(([c]) => c !== 0)
      .reverse()
      .map(([c, k]) => (k === 0 ? String(c) : `${c === 1 ? "" : `${c} \\cdot `}${a}${k > 1 ? `^{${k}}` : ""}`))
      .join(" + ");
    return {
      prompt: fill(w.rf.prompt.remainder, { a, p }),
      q: `f(x) = ${polyTex(f)} \\in ${Zn(p)}[x]`,
      ...wholeOf(v, [["notReducedMod", raw], ["remainderAtMinusA", back]]),
      steps: [`f(x) = (x - ${a})\\,q(x) + f(${a})`, `f(${a}) = ${terms} = ${raw}`, `${raw} \\equiv ${v} \\pmod{${p}}`],
    };
  }
}

function eisensteinPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const [p, q] = [r.pick([2, 3, 5, 7]), r.pick([2, 3, 5])];
    if (p === q) continue;
    const n = r.int(3, 5);
    const middle = Array.from({ length: n - 1 }, () => p * q * r.int(-2, 2));
    if (middle.every((c) => c === 0)) continue;
    const a0 = r.sign() * p * q * q;
    const f = [a0, ...middle, 1];
    const shown = f.slice(0, -1).filter((c) => c !== 0);
    return {
      prompt: w.rf.prompt.eisenstein,
      q: `f(x) = ${polyTex(f)}`,
      ...wholeOf(p, [["eisensteinSquareIgnored", q]]),
      steps: [
        `${p} \\mid ${shown.join(", \\; ")}, \\quad ${p} \\nmid 1, \\quad ${p * p} \\nmid ${a0}`,
        `${q * q} \\mid ${a0}`,
      ],
    };
  }
}

/** The monic quadratics with no root over ℤ₂ and ℤ₃, whose products are quartics with no root that still factor. */
const NO_ROOT: Record<number, number[][]> = { 2: [[1, 1, 1]], 3: [[1, 0, 1], [2, 1, 1], [2, 2, 1]] };

function irreduciblePart(r: Rng, w: PracticeWords): Part {
  const options = [word(w.rf.irreducible), word(w.rf.reducible)];
  if (r.next() < 0.3) {
    const p = r.pick([2, 3]);
    const [g, h] = [r.pick(NO_ROOT[p]), r.pick(NO_ROOT[p])];
    const f = mulPoly(g, h).map((c) => c % p);
    const values = Array.from({ length: p }, (_, x) => evalMod(f, x, p));
    return {
      prompt: fill(w.rf.prompt.irreducibleModP, { p }),
      q: `f(x) = ${polyTex(f)} \\in ${Zn(p)}[x]`,
      ...pickOf(options, 1, [["noRootMeansIrreducible", 0]]),
      steps: [`f(0), \\dots, f(${p - 1}) \\equiv ${values.join(", ")} \\pmod{${p}}`, `f = (${polyTex(g)})(${polyTex(h)})`],
    };
  }
  const p = r.pick([2, 3, 5]);
  const d = r.int(2, 3);
  const f = [r.int(1, p - 1), ...Array.from({ length: d - 1 }, () => r.int(0, p - 1)), 1];
  const roots = rootsMod(f, p);
  const values = Array.from({ length: p }, (_, x) => evalMod(f, x, p));
  const first = `f(0), \\dots, f(${p - 1}) \\equiv ${values.join(", ")} \\pmod{${p}}`;
  if (roots.length)
    return {
      prompt: fill(w.rf.prompt.irreducibleModP, { p }),
      q: `f(x) = ${polyTex(f)} \\in ${Zn(p)}[x]`,
      ...pickOf(options, 1, [["rootMissedModP", 0]]),
      steps: [first, `f(${roots[0]}) \\equiv 0 \\Rightarrow (x - ${roots[0]}) \\mid f`],
    };
  return {
    prompt: fill(w.rf.prompt.irreducibleModP, { p }),
    q: `f(x) = ${polyTex(f)} \\in ${Zn(p)}[x]`,
    ...pickOf(options, 0),
    steps: [first, `\\deg f = ${d} \\le 3: \\; f = gh \\Rightarrow \\deg g = 1 \\Rightarrow f(a) \\equiv 0`],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? remainderPart(r, w) : L === 2 ? eisensteinPart(r, w) : irreduciblePart(r, w));

export default gen;
