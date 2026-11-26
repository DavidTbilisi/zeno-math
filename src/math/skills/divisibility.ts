// Practice: Divisible by?.
// Which of the divisors offered divide a number at every level; with it, factors and multiples picked: the factor
// pair that makes a number, a factor of it and a multiple of a number (P4); then which way round "factor of" and
// "multiple of" go, the prime among odd numbers and the factor pairs of a number to 100; then the composite number
// (1 and 2 offered beside it), whether a number is prime or composite and the multiples of 12 to 18. Adding to the
// number for a factor pair, a multiple for a factor and a factor for a multiple, the relation turned round, an odd
// number taken for prime, and 1 or 2 taken for composite are named.
import { fill } from "../chart";
import { divSlips, divTask } from "../divisible";
import { shuffled } from "../mulDivKit";
import type { MistakeId } from "../mistakes";
import type { ExprOption } from "../exprMatch";
import type { Gen, Part, Trap } from "../practiceTypes";

/** Odd numbers under 100 that are not prime and not multiples of 5: the ones taken for prime. */
const ODD_COMPOSITES = [21, 27, 33, 39, 49, 51, 57, 63, 69, 77, 81, 87, 91, 93];
const PRIMES = [11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];
/** n's smallest factor above 1. */
const least = (n: number) => {
  for (let f = 2; f * f <= n; f++) if (n % f === 0) return f;
  return n;
};

const gen: Gen = (r, L, w) => {
  const W = w.factors;
  /** A pick among options (numbers or words), each slip with its mistake and hint vars ({x} is the option's text). */
  const pick = (prompt: string, right: string, slips: { text: string; id: MistakeId; vars: Record<string, string | number> }[], others: string[], steps: string[]): Part => {
    const texts = [right, ...slips.map((s) => s.text), ...others];
    const options: ExprOption[] = shuffled(r, texts).map((t) => ({ text: t, plain: t, tex: /^[\d, ×]+$/.test(t) ? t.replace(/×/g, "\\times") : `\\text{${t}}` }));
    const at = (t: string) => options.findIndex((o) => o.text === t);
    const traps: Trap[] = slips.map((s) => ({ id: s.id, a: { k: "pick", options, right: at(s.text) }, vars: { x: s.text, ...s.vars } }));
    return { prompt, q: "", answer: { k: "pick", options, right: at(right), traps }, show: options[at(right)].tex, plain: right, format: "pick", steps };
  };
  /** Numbers from lo to hi for which ok holds, none of them among taken. */
  const others = (k: number, lo: number, hi: number, ok: (n: number) => boolean, taken: number[]) => {
    const out: number[] = [];
    for (let tries = 0; out.length < k && tries < 500; tries++) {
      const n = r.int(lo, hi);
      if (ok(n) && !taken.includes(n) && !out.includes(n)) out.push(n);
    }
    return out.map(String);
  };

  /** The factor pair of n picked from pairs that add up to n and pairs one out. */
  const factorPair = (lo: number, hi: number) => {
    let n = r.int(lo, hi);
    while (least(n) === n || least(n) ** 2 === n) n = r.int(lo, hi);
    const pairs: number[] = [];
    for (let a = 2; a * a < n; a++) if (n % a === 0) pairs.push(a);
    const a = r.pick(pairs);
    const b = n / a;
    const c = r.int(2, Math.floor(n / 2) - 1);
    const sum = `${c}, ${n - c}`;
    const slips = c * (n - c) !== n && c !== a ? [{ text: sum, id: "factorPairAdds" as const, vars: { n, right: `${a} × ${b} = ${n}` } }] : [];
    const near = [`${a}, ${b + 1}`, `${a + 1}, ${b}`].filter((t) => t !== sum);
    return pick(fill(W.pair, { n }), `${a}, ${b}`, slips, near, [`${a} \\times ${b} = ${n}`]);
  };
  /** A factor of n among a multiple of n and numbers that are neither. */
  const isFactor = (lo: number, hi: number) => {
    let n = r.int(lo, hi);
    while (least(n) === n) n = r.int(lo, hi);
    const fs: number[] = [];
    for (let f = 2; f < n; f++) if (n % f === 0) fs.push(f);
    const f = r.pick(fs);
    const m = n * r.int(2, 3);
    return pick(fill(W.factor, { n }), String(f), [{ text: String(m), id: "multipleForFactor", vars: { n, right: `${n} ÷ ${f} = ${n / f}` } }], others(2, 2, n - 1, (x) => n % x !== 0, [f]), [`${n} \\div ${f} = ${n / f}`]);
  };
  /** A multiple of d among a factor of d and numbers that are neither. */
  const isMultiple = (ds: number[]) => {
    const d = r.pick(ds);
    const k = r.int(3, 9);
    const fs: number[] = [];
    for (let f = 2; f < d; f++) if (d % f === 0) fs.push(f);
    const f = r.pick(fs);
    return pick(fill(W.multiple, { d }), String(d * k), [{ text: String(f), id: "factorForMultiple", vars: { d, right: `${d} × ${k} = ${d * k}` } }], others(2, d + 1, d * 10, (x) => x % d !== 0, [d * k]), [`${d} \\times ${k} = ${d * k}`]);
  };

  const kind = r.int(0, 3);
  if (L === 1 && kind === 1) return factorPair(12, 36);
  if (L === 1 && kind === 2) return isFactor(12, 48);
  if (L === 1 && kind === 3) return isMultiple([4, 6, 8, 9]);
  if (L === 2 && kind === 1) {
    // n = a × k: a is a factor of n and n a multiple of a; turned round, both are false.
    const [a, k] = [r.int(3, 9), r.int(3, 9)];
    const n = a * k;
    const b = [a + 1, a + 2, a - 1].find((x) => n % x !== 0)!;
    const right = r.next() < 0.5 ? fill(W.factorOf, { a, b: n }) : fill(W.multipleOf, { a: n, b: a });
    const vars = { n, a, k };
    return pick(fill(W.relate, { n, a, k }), right, [
      { text: fill(W.factorOf, { a: n, b: a }), id: "factorMultipleSwapped", vars },
      { text: fill(W.multipleOf, { a, b: n }), id: "factorMultipleSwapped", vars },
    ], [fill(W.factorOf, { a: b, b: n })], [`${n} = ${a} \\times ${k}`, `${n} \\div ${a} = ${k}`]);
  }
  if (L === 2 && kind === 2) {
    // The prime beside an odd number that is not (51 = 3 × 17), an even number and a multiple of 5.
    const p = r.pick(PRIMES);
    const c = r.pick(ODD_COMPOSITES);
    const f = least(c);
    return pick(W.prime, String(p), [{ text: String(c), id: "oddAsPrime", vars: { n: c, f, g: c / f } }], [String(2 * r.int(6, 45)), String(5 * (2 * r.int(2, 9) + 1))], [`${c} = ${f} \\times ${c / f}`, `${p} = 1 \\times ${p}`]);
  }
  if (L === 2 && kind === 3) return factorPair(40, 100);
  if (L === 3 && kind === 1) {
    // The composite number beside 1, 2 and a prime.
    const c = r.pick(ODD_COMPOSITES);
    const f = least(c);
    const right = `${c} = ${f} × ${c / f}`;
    return pick(W.composite, String(c), [
      { text: "1", id: "oneAsComposite", vars: { right } },
      { text: "2", id: "twoAsComposite", vars: {} },
    ], [String(r.pick(PRIMES))], [right.replace("×", "\\times")]);
  }
  if (L === 3 && kind === 2) {
    // Prime or composite: an odd composite, 2, or a prime.
    const t = r.int(0, 2);
    const n = t === 0 ? r.pick(ODD_COMPOSITES) : t === 1 ? 2 : r.pick(PRIMES);
    const prime = least(n) === n;
    const f = least(n);
    const slips = t === 0 ? [{ text: W.isPrime, id: "oddAsPrime" as const, vars: { n, f, g: n / f } }] : t === 1 ? [{ text: W.isComposite, id: "twoAsComposite" as const, vars: {} }] : [];
    return pick(fill(W.primeOrComposite, { n }), prime ? W.isPrime : W.isComposite, slips, t === 2 ? [W.isComposite] : [], [prime ? `${n} = 1 \\times ${n}` : `${n} = ${f} \\times ${n / f}`]);
  }
  if (L === 3 && kind === 3) return isMultiple([12, 14, 15, 16, 18]);

  // Which of the divisors offered divide a number (src/math/divisible.ts): 2, 5 and 10; then 3 and 9; then 4, 6 and
  // 8. The answer lists them, typed or tapped, in any order; the worked solution is a picture of each divisor's test
  // (src/math/divisiblePics.ts).
  const t = divTask(L, r.next);
  const traps: Trap[] = divSlips(t).map((s) => ({ id: s.id, a: { k: "divisors", n: t.n, offered: t.offered, right: s.right }, vars: s.vars }));
  return {
    prompt: fill(w.prompts.divisibility, { divs: t.offered.join(", ") }),
    q: String(t.n),
    answer: { k: "divisors", n: t.n, offered: t.offered, right: t.right, traps },
    show: t.right.join(", "),
    plain: t.right.join(", "),
    format: "divisors",
    solution: { kind: "divisible", spec: { n: t.n, offered: t.offered } },
  };
};

export default gen;
