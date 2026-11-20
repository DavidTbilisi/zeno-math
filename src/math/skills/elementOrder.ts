// Practice: Orders of elements and cyclic groups. Easy finds the order of a in (ℤₙ, +) (a itself, n, gcd(a, n)
// named); medium the order of a unit in U(n) under multiplication (the group's size φ(n), a itself, the additive order,
// named); hard counts the generators of ℤₙ (every non-zero element, the primes, named) or finds the order of (a, b) in
// ℤₘ × ℤₙ (the product of the orders, the size of the group, named).
import { addOrder, gcd, lcm, mulOrder, phi, powers, primesBelow, Zn } from "../groups";
import { wholeOf } from "../realAnalysis";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

/** a, 2a, 3a, … mod n until 0, while short enough to write out. */
function multiplesTex(a: number, n: number): string {
  const k = addOrder(a, n);
  const xs = Array.from({ length: k }, (_, i) => ((i + 1) * a) % n);
  return k <= 8 ? xs.map((x, i) => `${i + 1} \\cdot ${a} \\equiv ${x}`).join(", \\; ") : `${k} \\cdot ${a} = ${k * a} \\equiv 0`;
}

function additivePart(r: Rng, w: PracticeWords): Part {
  const n = r.pick([6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 24]);
  const a = r.pick(Array.from({ length: n - 2 }, (_, i) => i + 2).filter((x) => gcd(x, n) > 1));
  const g = gcd(a, n);
  const v = n / g;
  return {
    prompt: w.group.prompt.additiveOrder,
    q: `${a} \\in (${Zn(n)}, +)`,
    ...wholeOf(v, [["orderIsElement", a], ["orderIsGroupSize", n], ["orderIsGcd", g]]),
    steps: [multiplesTex(a, n), `|${a}| = \\frac{${n}}{\\gcd(${a}, ${n})} = \\frac{${n}}{${g}} = ${v}`],
  };
}

function multiplicativePart(r: Rng, w: PracticeWords): Part {
  const n = r.pick([7, 9, 10, 11, 13, 14, 15, 16, 17, 18]);
  const units = Array.from({ length: n - 2 }, (_, i) => i + 2).filter((a) => gcd(a, n) === 1);
  const a = r.pick(units);
  const ps = powers(a, n);
  const v = mulOrder(a, n);
  return {
    prompt: w.group.prompt.multOrder,
    q: `${a} \\in U(${n})`,
    ...wholeOf(v, [["orderIsGroupSize", phi(n)], ["orderIsElement", a], ["orderAdditive", addOrder(a, n)]]),
    steps: [ps.map((x, i) => `${a}^{${i + 1}} \\equiv ${x}`).join(", \\; "), `|${a}| = ${v}`],
  };
}

function cyclicPart(r: Rng, w: PracticeWords): Part {
  if (r.int(0, 1) === 0) {
    const n = r.int(8, 30);
    const gens = Array.from({ length: n - 1 }, (_, i) => i + 1).filter((k) => gcd(k, n) === 1);
    const v = phi(n);
    return {
      prompt: fill(w.group.prompt.generators, { n }),
      q: `${Zn(n)} = \\langle 1 \\rangle`,
      ...wholeOf(v, [["generatorsAllNonzero", n - 1], ["generatorsArePrimes", primesBelow(n).length]]),
      steps: [`\\langle k \\rangle = ${Zn(n)} \\iff \\gcd(k, ${n}) = 1`, `k \\in \\{${gens.join(", ")}\\}`, `\\varphi(${n}) = ${v}`],
    };
  }
  const [m, n] = [r.pick([4, 6, 8, 9, 10, 12]), r.pick([4, 6, 8, 10, 12, 15])];
  const [a, b] = [r.int(1, m - 1), r.int(1, n - 1)];
  const [p, q] = [addOrder(a, m), addOrder(b, n)];
  const v = lcm(p, q);
  return {
    prompt: w.group.prompt.pairOrder,
    q: `(${a}, ${b}) \\in ${Zn(m)} \\times ${Zn(n)}`,
    ...wholeOf(v, [["orderProductNotLcm", p * q], ["orderIsGroupSize", m * n]]),
    steps: [`${a} \\in ${Zn(m)}: |${a}| = ${p}, \\quad ${b} \\in ${Zn(n)}: |${b}| = ${q}`, `|(${a}, ${b})| = \\operatorname{lcm}(${p}, ${q}) = ${v}`],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? additivePart(r, w) : L === 2 ? multiplicativePart(r, w) : cyclicPart(r, w));

export default gen;
