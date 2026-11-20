// Number theory as a degree teaches it (Burton, Elementary Number Theory; Stein, Elementary Number Theory: Primes,
// Congruences, and Secrets; Niven, Zuckerman & Montgomery, An Introduction to the Theory of Numbers), past the
// divisors, bases and simple congruences of src/math/numberTheory.ts: the extended Euclidean algorithm and linear
// Diophantine equations, linear congruences, the Chinese remainder theorem, Fermat, Euler and Wilson, RSA with small
// primes, quadratic residues and the Legendre symbol. The words, and the whole-number maths the answers are made of;
// the questions are in src/math/skills/{bezout,congruences,crt,fermatEuler,rsa,residues}.ts.
import { gcd, mod } from "./groups";

/** The words of these questions (the locale's `nt` block). */
export type NtWords = {
  yes: string;
  no: string;
  prompt: {
    gcd: string;
    solvable: string;
    bezout: string;
    positiveCount: string;
    inverse: string;
    solveAll: string;
    solutionCount: string;
    cancel: string;
    crt: string;
    crtClass: string;
    phi: string;
    powerMod: string;
    primitiveRoots: string;
    wilson: string;
    rsaPhi: string;
    rsaE: string;
    rsaD: string;
    encrypt: string;
    decrypt: string;
    residues: string;
    euler: string;
    reciprocity: string;
  };
};

export const isPrime = (n: number) => n > 1 && Array.from({ length: Math.floor(Math.sqrt(n)) - 1 }, (_, i) => i + 2).every((d) => n % d !== 0);

/** The rows a = q·b + r of the Euclidean algorithm on a ≥ b > 0, down to remainder 0. */
export function euclid(a: number, b: number): { a: number; q: number; b: number; r: number }[] {
  const rows = [];
  while (b > 0) {
    rows.push({ a, q: Math.floor(a / b), b, r: a % b });
    [a, b] = [b, a % b];
  }
  return rows;
}

/** gcd(a, b) = d and the x, y of the extended Euclidean algorithm with ax + by = d. */
export function extGcd(a: number, b: number): { d: number; x: number; y: number } {
  if (b === 0) return { d: a, x: 1, y: 0 };
  const { d, x, y } = extGcd(b, a % b);
  return { d, x: y, y: x - Math.floor(a / b) * y };
}

/** aᵏ mod n by repeated squaring (the numbers here stay below 2⁵³). */
export function powMod(a: number, k: number, n: number): number {
  let [out, base] = [1 % n, mod(a, n)];
  for (let e = k; e > 0; e = Math.floor(e / 2)) {
    if (e % 2) out = (out * base) % n;
    base = (base * base) % n;
  }
  return out;
}

/** The prime factorisation of n as [p, e] pairs, smallest p first. */
export function factorise(n: number): [number, number][] {
  const out: [number, number][] = [];
  for (let p = 2; p * p <= n; p++) {
    let e = 0;
    while (n % p === 0) [n, e] = [n / p, e + 1];
    if (e) out.push([p, e]);
  }
  if (n > 1) out.push([n, 1]);
  return out;
}

/** The smallest x ≥ 0 with x ≡ rᵢ (mod mᵢ) for all i, and the modulus lcm(mᵢ) it is unique to; null when there is none. */
export function crtSolve(rs: number[], ms: number[]): { x: number; m: number } | null {
  let [x, m] = [0, 1];
  rs.forEach((r, i) => {
    if (Number.isNaN(x)) return;
    const n = ms[i];
    let t = 0;
    while (t < n && mod(x + m * t - r, n) !== 0) t++;
    if (t === n) x = NaN;
    else [x, m] = [mod(x + m * t, (m / gcd(m, n)) * n), (m / gcd(m, n)) * n];
  });
  return Number.isNaN(x) ? null : { x, m };
}

/** The Legendre symbol (a/p) for an odd prime p, by Euler's criterion. */
export const legendre = (a: number, p: number): 1 | -1 | 0 => {
  const v = powMod(a, (p - 1) / 2, p);
  return v === 0 ? 0 : v === 1 ? 1 : -1;
};

/** The non-zero quadratic residues mod p, smallest first. */
export const residuesMod = (p: number) => [...new Set(Array.from({ length: p - 1 }, (_, i) => ((i + 1) * (i + 1)) % p))].sort((x, y) => x - y);

// ---------- written out ----------

/** The rows of the Euclidean algorithm as TeX. */
export const euclidTex = (a: number, b: number) => euclid(a, b).map((w) => `${w.a} = ${w.q} \\cdot ${w.b} + ${w.r}`);

/** aᵏ mod n by repeated squaring as TeX: the squares a, a², a⁴, … that k needs, then their product. */
export function squaringTex(a: number, k: number, n: number): string[] {
  const bits: number[] = [];
  let [sq, p] = [mod(a, n), 1];
  const squares: string[] = [];
  for (let e = k; e > 0; e = Math.floor(e / 2), p *= 2) {
    squares.push(`${a}^{${p}} \\equiv ${sq}`);
    if (e % 2) bits.push(p);
    sq = (sq * sq) % n;
  }
  const v = powMod(a, k, n);
  const lines = [`${squares.join(", \\; ")} \\pmod{${n}}`];
  if (bits.length > 1) lines.push(`${a}^{${k}} = ${bits.map((b) => `${a}^{${b}}`).join(" \\cdot ")} \\equiv ${v} \\pmod{${n}}`);
  else lines.push(`${a}^{${k}} \\equiv ${v} \\pmod{${n}}`);
  return lines;
}

/** (a/p) as TeX. */
export const legTex = (a: number | string, p: number | string) => `\\left(\\frac{${a}}{${p}}\\right)`;
/** n = p₁^e₁ · p₂^e₂ as TeX. */
export const factorTex = (f: [number, number][]) => f.map(([p, e]) => (e === 1 ? `${p}` : `${p}^{${e}}`)).join(" \\cdot ");
