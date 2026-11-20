// Practice: discrete logarithms. Easy finds the order of g mod a prime p (p − 1 by Fermat, the power where gᵏ ≡ −1,
// named); medium finds x with gˣ ≡ h for a primitive root g (the log the other way round, the powers counted from g¹
// as 0, named); hard finds the Diffie–Hellman shared key from Alice's secret a and Bob's public B (the two public
// keys multiplied, Alice's own public key, named).
import { primitiveRoots, orderMod } from "../crypto";
import { gcd, invMod } from "../groups";
import { powMod, squaringTex } from "../numberTheoryTwo";
import { wholeOf } from "../realAnalysis";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const PRIMES = [11, 13, 17, 19, 23, 29, 31, 37, 41, 43];
/** g¹, g², …, gᵏ mod p as one TeX line. */
const powersTex = (g: number, k: number, p: number) =>
  `${Array.from({ length: k }, (_, i) => `${g}^{${i + 1}} \\equiv ${powMod(g, i + 1, p)}`).join(", \\ ")} \\pmod{${p}}`;

function orderPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const p = r.pick(PRIMES);
    const g = r.int(2, p - 2);
    const k = orderMod(g, p);
    if (k === p - 1 || k < 3) continue;
    return {
      prompt: w.cr.prompt.order,
      q: `g = ${g}, \\quad p = ${p}`,
      ...wholeOf(k, [["orderAsPMinusOne", p - 1], ["orderStoppedAtMinusOne", k % 2 === 0 ? k / 2 : 0]]),
      steps: [powersTex(g, k, p), `\\operatorname{ord}_{${p}}(${g}) = ${k}, \\quad ${k} \\mid ${p - 1}`],
    };
  }
}

function dlogPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const p = r.pick(PRIMES.filter((q) => q <= 29));
    const g = r.pick(primitiveRoots(p));
    const x = r.int(2, p - 2);
    const h = powMod(g, x, p);
    const n = p - 1;
    // the log the other way round: y with hʸ ≡ g, which exists when x is a unit mod p − 1
    const back = gcd(x, n) === 1 ? invMod(x, n) : 0;
    return {
      prompt: w.cr.prompt.dlog,
      q: `${g}^{x} \\equiv ${h} \\pmod{${p}}, \\quad 0 \\le x < ${n}`,
      ...wholeOf(x, [["logBaseSwapped", back], ["logIndexShifted", x - 1]]),
      steps: [powersTex(g, x, p), `x = ${x}`],
    };
  }
}

function dhPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const p = r.pick(PRIMES.filter((q) => q >= 19));
    const g = r.pick(primitiveRoots(p).slice(0, 3));
    const a = r.int(3, p - 3);
    const b = r.int(3, p - 3);
    const A = powMod(g, a, p);
    const B = powMod(g, b, p);
    const K = powMod(B, a, p);
    if (a === b || K === A || K === B || K === (A * B) % p) continue;
    return {
      prompt: w.cr.prompt.dhKey,
      q: `p = ${p}, \\quad g = ${g}, \\quad a = ${a}, \\quad B = ${B}`,
      ...wholeOf(K, [["dhPublicsMultiplied", (A * B) % p], ["dhOwnPublic", A]]),
      steps: [`K \\equiv B^{a} = ${B}^{${a}} \\pmod{${p}}`, ...squaringTex(B, a, p), `A = ${g}^{${a}} \\equiv ${A}, \\quad K \\equiv A^{b} = ${A}^{${b}} \\equiv ${K} \\pmod{${p}}`],
    };
  }
}

const gen: Gen = (r, L, w) => (L === 1 ? orderPart(r, w) : L === 2 ? dlogPart(r, w) : dhPart(r, w));

export default gen;
