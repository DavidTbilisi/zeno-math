// Group theory as a degree's second year teaches it (Pinter, A Book of Abstract Algebra; Judson, Abstract Algebra:
// Theory and Applications; Gallian, Contemporary Abstract Algebra): the group axioms, identities and inverses in ℤₙ,
// U(n) and made-up operations; orders of elements and cyclic groups; subgroups, cosets and Lagrange's theorem;
// permutations in cycle notation, composing them and their sign; homomorphisms, kernels, quotients and normal
// subgroups. The words, and the whole numbers the answers are made of; the questions are in
// src/math/skills/{groups,elementOrder,subgroups,permutations,homomorphisms}.ts.
import type { MistakeId } from "./mistakes";
import type { Answer, Format, Trap } from "./practiceTypes";

/** The words of these questions (the locale's `group` block). */
export type GroupWords = {
  axioms: { group: string; closure: string; associative: string; identity: string; inverses: string };
  even: string;
  odd: string;
  normal: string;
  notNormal: string;
  prompt: {
    addInverse: string;
    mulInverse: string;
    dihedral: string;
    identity: string;
    inverse: string;
    isGroup: string;
    additiveOrder: string;
    multOrder: string;
    generators: string;
    pairOrder: string;
    index: string;
    subgroupOrders: string;
    cyclicSubgroup: string;
    coset: string;
    cosetCount: string;
    permOrder: string;
    compose: string;
    sign: string;
    cycleCount: string;
    kernelSize: string;
    imageSize: string;
    homValue: string;
    kernel: string;
    quotientOrder: string;
    normal: string;
  };
};

export const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
export const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;
/** ((x mod n) + n) mod n: the element of {0, …, n − 1}. */
export const mod = (x: number, n: number) => ((x % n) + n) % n;
/** Euler's φ: how many of 1, …, n are coprime to n. */
export const phi = (n: number) => Array.from({ length: n }, (_, i) => i + 1).filter((k) => gcd(k, n) === 1).length;
/** The order of a in (ℤₙ, +): n / gcd(a, n). */
export const addOrder = (a: number, n: number) => n / gcd(a, n);
/** The order of a in U(n): the smallest k ≥ 1 with aᵏ ≡ 1 (mod n). Needs gcd(a, n) = 1. */
export function mulOrder(a: number, n: number): number {
  let [x, k] = [mod(a, n), 1];
  while (x !== 1 % n) [x, k] = [(x * a) % n, k + 1];
  return k;
}
/** a⁻¹ in U(n) (NaN when a is not a unit). */
export function invMod(a: number, n: number): number {
  for (let b = 1; b < n; b++) if ((a * b) % n === 1) return b;
  return NaN;
}
/** The powers a, a², …, aᵏ = 1 mod n. */
export function powers(a: number, n: number): number[] {
  const out = [mod(a, n)];
  while (out[out.length - 1] !== 1) out.push((out[out.length - 1] * a) % n);
  return out;
}
/** ⟨g⟩ in ℤₙ for g | n: 0, g, 2g, …. */
export const multiples = (g: number, n: number) => Array.from({ length: n / g }, (_, i) => i * g);
export const primesBelow = (n: number) => Array.from({ length: Math.max(0, n - 2) }, (_, i) => i + 2).filter((p) => Array.from({ length: p - 2 }, (_, i) => i + 2).every((d) => p % d !== 0));
export const divisors = (n: number) => Array.from({ length: n }, (_, i) => i + 1).filter((d) => n % d === 0);

// ---------- permutations ----------

/** A permutation of 1, …, n by its images: p[i − 1] is where i goes. */
export type Perm = number[];
/** The permutation a product of cycles makes, applied right to left (the rightmost cycle first). */
export function fromCycles(cycles: number[][], n: number): Perm {
  let p: Perm = Array.from({ length: n }, (_, i) => i + 1);
  for (const c of cycles) {
    const one: Perm = Array.from({ length: n }, (_, i) => i + 1);
    c.forEach((x, i) => (one[x - 1] = c[(i + 1) % c.length]));
    p = compose(one, p);
  }
  return p;
}
/** σ∘τ: τ first, then σ. */
export const compose = (s: Perm, t: Perm): Perm => t.map((x) => s[x - 1]);
/** The disjoint cycles of p, 1-cycles left out, each starting from its smallest element. */
export function cyclesOf(p: Perm): number[][] {
  const seen = new Set<number>();
  const out: number[][] = [];
  for (let i = 1; i <= p.length; i++) {
    if (seen.has(i)) continue;
    const c = [i];
    seen.add(i);
    for (let x = p[i - 1]; x !== i; x = p[x - 1]) {
      c.push(x);
      seen.add(x);
    }
    if (c.length > 1) out.push(c);
  }
  return out;
}
/** The order of p: the lcm of its cycle lengths. */
export const permOrder = (p: Perm) => cyclesOf(p).reduce((m, c) => lcm(m, c.length), 1);
/** +1 for even, −1 for odd: a k-cycle is k − 1 transpositions. */
export const signOf = (cycles: number[][]) => (cycles.reduce((s, c) => s + c.length - 1, 0) % 2 === 0 ? 1 : -1);
/** Cycles as LaTeX: (1\,3\,2)(4\,5); the identity as e. */
export const cyclesTex = (cycles: number[][]) => (cycles.length ? cycles.map((c) => `(${c.join("\\,")})`).join("") : "e");
/** Two-line notation as LaTeX. */
export const twoLineTex = (p: Perm) => `\\begin{pmatrix} ${p.map((_, i) => i + 1).join(" & ")} \\\\ ${p.join(" & ")} \\end{pmatrix}`;

// ---------- answers ----------

type Shown = { answer: Answer; show: string; plain: string; format: Format };

/** Where 1, …, n go, in order (or any whole numbers in a fixed order), with named slips that give another row. */
export function rowOf(vs: number[], slips: [MistakeId, number[]][], format: Format = "images"): Shown {
  const traps: Trap[] = [];
  const same = (a: number[], b: number[]) => a.every((x, i) => x === b[i]);
  for (const [id, s] of slips)
    if (!same(s, vs) && !traps.some((o) => o.a.k === "tuple" && same(o.a.vs, s))) traps.push({ id, a: { k: "tuple", vs: s, tol: 1e-9 } });
  return {
    answer: { k: "tuple", vs, tol: 1e-9, ...(traps.length ? { traps } : {}) },
    show: vs.join(", \\; "),
    plain: vs.join("; "),
    format,
  };
}

/** Whole numbers in any order (the elements of a subgroup, a coset, a kernel), with named slips that give another set. */
export function elementsOf(vs: number[], slips: [MistakeId, number[]][]): Shown {
  const key = (xs: number[]) => [...new Set(xs)].sort((x, y) => x - y).join(";");
  const right = [...new Set(vs)].sort((x, y) => x - y);
  const seen = new Set([key(vs)]);
  const traps: Trap[] = [];
  for (const [id, s] of slips) {
    if (seen.has(key(s)) || !s.length) continue;
    seen.add(key(s));
    traps.push({ id, a: { k: "set", vs: [...new Set(s)].sort((x, y) => x - y), tol: 1e-9, listed: true } });
  }
  return {
    answer: { k: "set", vs: right, tol: 1e-9, listed: true, ...(traps.length ? { traps } : {}) },
    show: right.join(", \\; "),
    plain: right.join("; "),
    format: "elements",
  };
}

/** \mathbb{Z}_{n} */
export const Zn = (n: number) => `\\mathbb{Z}_{${n}}`;
/** LaTeX for a set of numbers: \{0, 4, 8\}. */
export const setOfTex = (xs: number[]) => `\\{${xs.join(", ")}\\}`;
