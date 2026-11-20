// Practice: ElGamal. Easy finds the public key h = gˣ mod p (g·x and xᵍ, named); medium encrypts a message,
// c₂ = m·hᵏ (the mask gᵏ instead of hᵏ, the mask added, named); hard either decrypts (c₂ times the mask instead of its
// inverse, the mask subtracted, named) or signs: s = (m − x·r)·k⁻¹ mod p − 1 (worked mod p, k not inverted, named).
import { inv, primitiveRoots } from "../crypto";
import { gcd, invMod, mod } from "../groups";
import { powMod, squaringTex } from "../numberTheoryTwo";
import { wholeOf } from "../realAnalysis";
import type { Gen, Part, PracticeWords, Rng } from "../practiceTypes";

const PRIMES = [23, 29, 31, 37, 41, 43, 47];

/** A prime, a primitive root of it and a private key. */
function keys(r: Rng) {
  const p = r.pick(PRIMES);
  const g = r.pick(primitiveRoots(p).slice(0, 3));
  const x = r.int(3, p - 3);
  return { p, g, x, h: powMod(g, x, p) };
}

function publicPart(r: Rng, w: PracticeWords): Part {
  const { p, g, x, h } = keys(r);
  return {
    prompt: w.cr.prompt.elgPublic,
    q: `p = ${p}, \\quad g = ${g}, \\quad x = ${x}`,
    ...wholeOf(h, [["powerAsProduct", (g * x) % p], ["powerBaseSwapped", powMod(x, g, p)]]),
    steps: [`h \\equiv ${g}^{${x}} \\pmod{${p}}`, ...squaringTex(g, x, p)],
  };
}

function encryptPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const { p, g, h } = keys(r);
    const m = r.int(2, p - 2);
    const k = r.int(2, p - 2);
    const s = powMod(h, k, p);
    const c1 = powMod(g, k, p);
    const c2 = (m * s) % p;
    if (s === 1) continue;
    return {
      prompt: w.cr.prompt.elgEncrypt,
      q: `p = ${p}, \\quad g = ${g}, \\quad h = ${h}, \\quad m = ${m}, \\quad k = ${k}`,
      ...wholeOf(c2, [["elgMaskFromG", (m * c1) % p], ["elgMaskAdded", (m + s) % p]]),
      steps: [`c_{1} \\equiv ${g}^{${k}} \\equiv ${c1}`, `h^{k} = ${h}^{${k}} \\equiv ${s} \\pmod{${p}}`, `c_{2} \\equiv m \\, h^{k} = ${m} \\cdot ${s} \\equiv ${c2} \\pmod{${p}}`],
    };
  }
}

function decryptPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const { p, g, x } = keys(r);
    const m = r.int(2, p - 2);
    const k = r.int(2, p - 2);
    const c1 = powMod(g, k, p);
    const s = powMod(c1, x, p);
    const c2 = (m * powMod(g, x * k, p)) % p;
    if (s === 1) continue;
    const si = inv(s, p);
    return {
      prompt: w.cr.prompt.elgDecrypt,
      q: `p = ${p}, \\quad x = ${x}, \\quad (c_{1}, c_{2}) = (${c1}, ${c2})`,
      ...wholeOf(m, [["elgNotInverted", (c2 * s) % p], ["elgMaskSubtracted", mod(c2 - s, p)]]),
      steps: [
        `s = c_{1}^{x} = ${c1}^{${x}} \\equiv ${s} \\pmod{${p}}`,
        `s^{-1} \\equiv ${s}^{${p - 2}} \\equiv ${si}, \\quad ${s} \\cdot ${si} \\equiv 1`,
        `m \\equiv c_{2} \\, s^{-1} = ${c2} \\cdot ${si} \\equiv ${m} \\pmod{${p}}`,
      ],
    };
  }
}

function signPart(r: Rng, w: PracticeWords): Part {
  for (;;) {
    const { p, g, x } = keys(r);
    const n = p - 1;
    const k = r.int(3, n - 1);
    if (gcd(k, n) !== 1) continue;
    const m = r.int(2, n - 1);
    const rr = powMod(g, k, p);
    const ki = invMod(k, n);
    const s = mod((m - x * rr) * ki, n);
    if (s === 0) continue;
    return {
      prompt: w.cr.prompt.elgSign,
      q: `p = ${p}, \\quad g = ${g}, \\quad x = ${x}, \\quad k = ${k}, \\quad m = ${m}`,
      ...wholeOf(s, [["signModP", mod((m - x * rr) * inv(k, p), p)], ["signKNotInverted", mod((m - x * rr) * k, n)]]),
      steps: [
        `r \\equiv g^{k} = ${g}^{${k}} \\equiv ${rr} \\pmod{${p}}`,
        `k^{-1} \\equiv ${ki} \\pmod{${n}}, \\quad ${k} \\cdot ${ki} \\equiv 1`,
        `s \\equiv (m - x r) \\, k^{-1} = (${m} - ${x} \\cdot ${rr}) \\cdot ${ki} \\equiv ${s} \\pmod{${n}}`,
      ],
    };
  }
}

const gen: Gen = (r, L, w) => {
  if (L === 1) return publicPart(r, w);
  if (L === 2) return encryptPart(r, w);
  return r.next() < 0.5 ? decryptPart(r, w) : signPart(r, w);
};

export default gen;
