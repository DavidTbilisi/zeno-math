// Discrete mathematics as a degree teaches it (Rosen, Discrete Mathematics and Its Applications; Levin, Discrete
// Mathematics: An Open Introduction; Wilf, generatingfunctionology; Wilson, Introduction to Graph Theory), past the
// counting and graph puzzles of school: linear recurrences, generating functions, inclusion–exclusion and
// derangements, the pigeonhole principle, graph theory. The words, and the exact maths the answers are made of; the
// questions are in src/math/skills/{recurrences,growth,generating,inclusionExclusion,pigeonhole,graphTheory}.ts.

/** The words of these questions (the locale's `dm` block). */
export type DiscreteWords = {
  yes: string;
  no: string;
  prompt: {
    term: string;
    roots: string;
    closed: string;
    multiset: string;
    bounded: string;
    coefficient: string;
    union: string;
    divisibleAny: string;
    divisibleNone: string;
    derangement: string;
    fixedPoints: string;
    socks: string;
    months: string;
    fullest: string;
    sumPair: string;
    difference: string;
    edgesFromDegrees: string;
    treeEdges: string;
    completeEdges: string;
    eulerCircuit: string;
    faces: string;
    matchings: string;
    growthFastest: string;
    growthCount: string;
    growthLoop: string;
    growthRecurrence: string;
    growthTime: string;
  };
};

/** The first terms a₀, a₁, …, a_n of aₙ = p aₙ₋₁ + q aₙ₋₂. */
export function recurrenceTerms(p: number, q: number, a0: number, a1: number, n: number): number[] {
  const a = [a0, a1];
  for (let k = 2; k <= n; k++) a.push(p * a[k - 1] + q * a[k - 2]);
  return a.slice(0, n + 1);
}

/** n choose k (0 when k is out of range). */
export function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let c = 1;
  for (let i = 1; i <= k; i++) c = (c * (n - k + i)) / i;
  return Math.round(c);
}

/** n! */
export const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));

/** The number of solutions of x₁ + … + x_m = n with 0 ≤ xᵢ ≤ capᵢ: the coefficient of xⁿ in Π (1 + x + … + x^capᵢ). */
export function boundedSolutions(caps: readonly number[], n: number): number {
  let poly = [1];
  for (const c of caps) {
    const next = new Array(poly.length + c).fill(0);
    poly.forEach((v, i) => {
      for (let j = 0; j <= c; j++) next[i + j] += v;
    });
    poly = next;
  }
  return poly[n] ?? 0;
}

/** The coefficient of xⁿ in 1/((1 − ax)(1 − bx)): Σ aⁱ bⁿ⁻ⁱ. */
export function twoGeometric(a: number, b: number, n: number): number {
  let s = 0;
  for (let i = 0; i <= n; i++) s += a ** i * b ** (n - i);
  return s;
}

/** How many of 1, …, N are divisible by at least one of ds (counted one by one). */
export function divisibleCount(N: number, ds: readonly number[]): number {
  let c = 0;
  for (let k = 1; k <= N; k++) if (ds.some((d) => k % d === 0)) c++;
  return c;
}

/** The number of derangements of n things: Dₙ = n! Σ (−1)ᵏ/k!. */
export function derangements(n: number): number {
  let d = 1;
  for (let k = 1; k <= n; k++) d = k * d + (k % 2 === 0 ? 1 : -1);
  return n === 0 ? 1 : d;
}

/** The perfect matchings of K₂ₙ: (2n − 1)!! = 1 · 3 · … · (2n − 1). */
export function matchings(n: number): number {
  let m = 1;
  for (let k = 1; k < 2 * n; k += 2) m *= k;
  return m;
}

/** A graph's degree sequence is a graph's (Erdős–Gallai). */
export function graphical(ds: readonly number[]): boolean {
  const d = [...ds].sort((x, y) => y - x);
  const total = d.reduce((s, x) => s + x, 0);
  if (total % 2 !== 0) return false;
  for (let k = 1; k <= d.length; k++) {
    const left = d.slice(0, k).reduce((s, x) => s + x, 0);
    const right = k * (k - 1) + d.slice(k).reduce((s, x) => s + Math.min(x, k), 0);
    if (left > right) return false;
  }
  return true;
}

const SUB = "₀₁₂₃₄₅₆₇₈₉";
const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
/** A whole number in subscript (K₁₂) or superscript (x⁵) digits, for prompts in plain text. */
export const sub = (n: number) => String(n).replace(/\d/g, (c) => SUB[Number(c)]);
export const sup = (n: number) => String(n).replace(/\d/g, (c) => SUP[Number(c)]);
