// Practice: RSA with small primes. Easy finds φ(n) = (p − 1)(q − 1) (n − 1 as if n were prime, named) or picks a
// valid public exponent e (one sharing a factor with φ(n), named); medium finds the private key d = e⁻¹ mod φ(n) (the
// inverse mod n, the coefficient that gives −1, named); hard encrypts c = mᵉ mod n or decrypts m = cᵈ mod n (m · e
// for mᵉ, the other key, named).
import { pickOf, sym } from "../calculusTwo";
import { gcd, invMod } from "../groups";
import { euclidTex, extGcd, powMod, squaringTex } from "../numberTheoryTwo";
import { wholeOf } from "../realAnalysis";
import { fill } from "../text";
import type { MistakeId } from "../mistakes";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const BIG = [11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47];
const SMALL = [3, 5, 7, 11, 13];

function primesOf(r: Rng, pool: number[]): { p: number; q: number; n: number; f: number } {
  for (;;) {
    const [p, q] = [r.pick(pool), r.pick(pool)].sort((x, y) => x - y);
    if (p !== q) return { p, q, n: p * q, f: (p - 1) * (q - 1) };
  }
}

const exponentsOf = (f: number) => Array.from({ length: Math.min(f, 60) - 3 }, (_, i) => i + 3).filter((e) => gcd(e, f) === 1);

function keysPart(r: Rng, w: PracticeWords): Part {
  const { p, q, n, f } = primesOf(r, BIG);
  if (r.int(0, 1) === 0)
    return {
      prompt: fill(w.nt.prompt.rsaPhi, { p, q }),
      q: `n = ${p} \\cdot ${q} = ${n}`,
      ...wholeOf(f, [["phiAsPrime", n - 1]]),
      steps: [`\\varphi(${n}) = (${p} - 1)(${q} - 1) = ${p - 1} \\cdot ${q - 1} = ${f}`],
    };
  const good = r.pick(exponentsOf(f));
  const bad = Array.from({ length: 40 }, (_, i) => i + 3).filter((e) => gcd(e, f) > 1 && e !== good);
  const wrong = [r.pick(bad.filter((e) => e % 2 === 0)), r.pick(bad.filter((e) => e % 2 === 1))];
  const es = [good, ...wrong].sort((x, y) => x - y);
  const options = es.map((e) => sym(String(e), String(e)));
  const right = es.indexOf(good);
  return {
    prompt: fill(w.nt.prompt.rsaE, { p, q }),
    q: `n = ${p} \\cdot ${q}, \\quad \\varphi(n) = ${f}`,
    ...pickOf(options, right, wrong.map((e): [MistakeId, number] => ["eNotCoprime", es.indexOf(e)])),
    steps: [...es.map((e) => `\\gcd(${e}, ${f}) = ${gcd(e, f)}`), `e = ${good}`],
  };
}

function privatePart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const { p, q, n, f } = primesOf(r, BIG);
    const e = r.pick(exponentsOf(f));
    const d = invMod(e, f);
    if (d === e) continue;
    const x = extGcd(f, e);
    return {
      prompt: fill(w.nt.prompt.rsaD, { e }),
      q: `n = ${p} \\cdot ${q} = ${n}, \\quad e = ${e}`,
      ...wholeOf(d, [["inverseModN", invMod(e, n)], ["bezoutSignSlip", f - d]]),
      steps: [
        `\\varphi(${n}) = ${p - 1} \\cdot ${q - 1} = ${f}`,
        ...euclidTex(f, e),
        `1 = ${f} \\cdot (${x.x}) + ${e} \\cdot (${x.y})`,
        `d \\equiv ${e}^{-1} \\equiv ${d} \\pmod{${f}}, \\quad ${e} \\cdot ${d} = ${e * d} = ${(e * d - 1) / f} \\cdot ${f} + 1`,
      ],
    };
  }
}

function cipherPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const { p, q, n, f } = primesOf(r, SMALL);
    if (n < 30) continue;
    const e = r.pick(exponentsOf(f).filter((x) => x < 20));
    const d = invMod(e, f);
    const m = r.int(2, n - 2);
    if (e === undefined || d === e || gcd(m, n) !== 1) continue;
    const c = powMod(m, e, n);
    if (r.int(0, 1) === 0) {
      if (c === m) continue;
      return {
        prompt: fill(w.nt.prompt.encrypt, { m }),
        q: `(n, e) = (${n}, ${e}), \\quad m = ${m}`,
        ...wholeOf(c, [["rsaMultiplied", (m * e) % n], ["rsaWrongKey", powMod(m, d, n)]]),
        steps: [`c = ${m}^{${e}} \\bmod ${n}`, ...squaringTex(m, e, n)],
      };
    }
    if (c === m) continue;
    return {
      prompt: fill(w.nt.prompt.decrypt, { c }),
      q: `n = ${p} \\cdot ${q} = ${n}, \\quad e = ${e}, \\quad c = ${c}`,
      ...wholeOf(m, [["rsaMultiplied", (c * d) % n], ["rsaWrongKey", powMod(c, e, n)]]),
      steps: [`\\varphi(${n}) = ${f}, \\quad d \\equiv ${e}^{-1} \\equiv ${d} \\pmod{${f}}`, `m = ${c}^{${d}} \\bmod ${n}`, ...squaringTex(c, d, n)],
    };
  }
}

const gen: Gen = (r, L, w) => (L === 1 ? keysPart(r, w) : L === 2 ? privatePart(r, w) : cipherPart(r, w));

export default gen;
