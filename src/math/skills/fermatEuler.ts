// Practice: Fermat's little theorem, Euler's φ and theorem, primitive roots and Wilson's theorem. Easy finds φ(n) from
// the factorisation (n − 1 as if n were prime, the powers left out, named); medium finds aᵏ mod n by reducing k mod
// φ(n) (k reduced mod n or mod n − 1, named); hard counts the primitive roots mod p (φ(p) for φ(p − 1), the
// non-residues, named) or uses Wilson's theorem (+1 for −1, named).
import { gcd, phi } from "../groups";
import { factorTex, factorise, isPrime, powMod, squaringTex } from "../numberTheoryTwo";
import { wholeOf } from "../realAnalysis";
import { fill } from "../text";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

function phiPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const n = r.int(40, 1000);
    const f = factorise(n);
    if (f.length < 2 || f.every(([, e]) => e === 1)) continue;
    const v = phi(n);
    const bare = f.reduce((s, [p]) => s * (p - 1), 1);
    return {
      prompt: fill(w.nt.prompt.phi, { n }),
      q: `\\varphi(${n})`,
      ...wholeOf(v, [["phiAsPrime", n - 1], ["phiPowersIgnored", bare]]),
      steps: [
        `${n} = ${factorTex(f)}`,
        `\\varphi(${n}) = ${f.map(([p, e]) => (e === 1 ? `(${p} - 1)` : `${p}^{${e - 1}}(${p} - 1)`)).join(" \\cdot ")} = ${v}`,
      ],
    };
  }
}

function powerPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const n = r.pick([11, 13, 17, 19, 23, 10, 12, 14, 15, 18, 20, 21, 24, 26, 28, 33, 35, 36, 40, 45, 50]);
    const a = r.int(2, 19);
    const k = r.int(100, 999);
    const f = phi(n);
    if (gcd(a, n) !== 1 || a % n === 1 || k % f === 0) continue;
    const v = powMod(a, k, n);
    const slips = [powMod(a, k % n, n), powMod(a, k % (n - 1), n)];
    if (slips.every((s) => s === v)) continue;
    const e = k % f;
    return {
      prompt: fill(w.nt.prompt.powerMod, { n }),
      q: `${a}^{${k}} \\bmod ${n}`,
      ...wholeOf(v, [["exponentModN", slips[0]], ["exponentModNMinusOne", slips[1]]]),
      steps: [
        `\\gcd(${a}, ${n}) = 1, \\quad \\varphi(${n}) = ${f} \\Rightarrow ${a}^{${f}} \\equiv 1 \\pmod{${n}}`,
        `${k} = ${Math.floor(k / f)} \\cdot ${f} + ${e} \\Rightarrow ${a}^{${k}} \\equiv ${a}^{${e}} \\pmod{${n}}`,
        ...(e > 1 ? squaringTex(a, e, n) : [`${a}^{${e}} \\equiv ${v} \\pmod{${n}}`]),
      ],
    };
  }
}

function hardPart(r: Rng, w: PracticeWords): Part {
  const p = r.pick([7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61].filter(isPrime));
  if (r.int(0, 1) === 0) {
    const v = phi(p - 1);
    return {
      prompt: fill(w.nt.prompt.primitiveRoots, { p }),
      q: `\\#\\{g \\in U(${p}) : \\operatorname{ord}_{${p}}(g) = ${p - 1}\\}`,
      ...wholeOf(v, [["phiOfPNotPMinusOne", p - 1], ["primitiveRootsNonresidues", (p - 1) / 2]]),
      steps: [`U(${p}) \\cong \\mathbb{Z}_{${p - 1}}`, `\\varphi(${p - 1}) = \\varphi(${factorTex(factorise(p - 1))}) = ${v}`],
    };
  }
  const two = r.int(0, 1) === 0;
  const [k, v, slip] = two ? [p - 2, 1, p - 1] : [p - 1, p - 1, 1];
  return {
    prompt: fill(w.nt.prompt.wilson, { p }),
    q: `${k}! \\bmod ${p}`,
    ...wholeOf(v, [["wilsonSign", slip]]),
    steps: two
      ? [`${p - 1}! \\equiv -1 \\pmod{${p}}`, `${p - 1}! = ${p - 1} \\cdot ${p - 2}! \\equiv -1 \\cdot ${p - 2}! \\pmod{${p}}`, `${p - 2}! \\equiv 1 \\pmod{${p}}`]
      : [`${p - 1}! \\equiv -1 \\pmod{${p}}`, `-1 \\equiv ${p - 1} \\pmod{${p}}`],
  };
}

const gen: Gen = (r, L, w) => (L === 1 ? phiPart(r, w) : L === 2 ? powerPart(r, w) : hardPart(r, w));

export default gen;
