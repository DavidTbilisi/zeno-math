// Proof answers: ways to check reasoning automatically, for any skill that asks for a proof. A proof's lines can be put
// in order (some lines don't belong); a marked line's reason picked from a short list; the first wrong line of a faulty
// proof picked; a claim's counterexample typed (a whole number, a pair, a real number, a 2 × 2 matrix) and tested
// against the claim; or a claim decided true or false, with a counterexample when false. The claims are tested here,
// by their own rule, so any object that breaks a claim is right, not only the one the book gives.

// ---------- lines in order ----------

export const LINE_LETTERS = ["A", "B", "C", "D", "E", "F", "G"] as const;
export type LinesProblem = "unreadable" | "repeated" | "count";
/** The letters typed, as places in the lines shown: "C, A, D" → [2, 0, 3]. */
export function readLines(count: number, src: string): { seq: number[] } | { problem: LinesProblem } {
  const ps = src.split(/[\s,;→>-]+/).map((p) => p.trim().toUpperCase()).filter(Boolean);
  const seq = ps.map((p) => LINE_LETTERS.indexOf(p as (typeof LINE_LETTERS)[number]));
  if (!ps.length || seq.some((i) => i < 0 || i >= count)) return { problem: "unreadable" };
  if (new Set(seq).size !== seq.length) return { problem: "repeated" };
  return { seq };
}
export const linesText = (seq: readonly number[]) => seq.map((i) => LINE_LETTERS[i]).join(", ");

// ---------- claims tested against an object ----------

export type ClaimKind = "int" | "pair" | "real" | "matrix";
export type ClaimId = "euler41" | "mersenne" | "squaresEqual" | "primeSum" | "squareBigger" | "nilpotent" | "oddSquare" | "evenProduct" | "cubeMinus" | "sqrtSum";
type Obj = number[] | number[][];
/** A claim: the objects it is about (`about`), and what it says of them (`says`). A counterexample is about it and breaks it. */
type Claim = { kind: ClaimKind; about: (x: Obj) => boolean; says: (x: Obj) => boolean; truth: boolean; example?: string };

export const isPrime = (n: number) => {
  if (!Number.isInteger(n) || n < 2) return false;
  for (let p = 2; p * p <= n; p++) if (n % p === 0) return false;
  return true;
};
/** The primes p ≤ 61 with 2^p − 1 prime. */
const MERSENNE = [2, 3, 5, 7, 13, 17, 19, 31, 61];
const whole = (v: number) => Number.isInteger(v);
const n1 = (x: Obj) => (x as number[])[0];
const pair = (x: Obj) => x as number[];
const mat = (x: Obj) => x as number[][];
const square2 = (m: number[][]) => [
  [m[0][0] * m[0][0] + m[0][1] * m[1][0], m[0][0] * m[0][1] + m[0][1] * m[1][1]],
  [m[1][0] * m[0][0] + m[1][1] * m[1][0], m[1][0] * m[0][1] + m[1][1] * m[1][1]],
];
const zero = (m: number[][]) => m.every((r) => r.every((v) => Math.abs(v) < 1e-12));

export const CLAIMS: Record<ClaimId, Claim> = {
  // For every whole number n ≥ 0, n² + n + 41 is prime. False at n = 40.
  euler41: { kind: "int", about: (x) => whole(n1(x)) && n1(x) >= 0, says: (x) => isPrime(n1(x) ** 2 + n1(x) + 41), truth: false, example: "40" },
  // For every prime p, 2^p − 1 is prime. False at p = 11 (2047 = 23 × 89); tested up to 61.
  mersenne: { kind: "int", about: (x) => isPrime(n1(x)) && n1(x) <= 61, says: (x) => MERSENNE.includes(n1(x)), truth: false, example: "11" },
  // If a² = b², then a = b. False for a = 2, b = −2.
  squaresEqual: { kind: "pair", about: (x) => pair(x).length === 2, says: (x) => pair(x)[0] ** 2 !== pair(x)[1] ** 2 || pair(x)[0] === pair(x)[1], truth: false, example: "2, -2" },
  // The sum of two primes is even. False for 2 and 3.
  primeSum: { kind: "pair", about: (x) => pair(x).length === 2 && pair(x).every(isPrime), says: (x) => (pair(x)[0] + pair(x)[1]) % 2 === 0, truth: false, example: "2, 3" },
  // For every real x > 0, x² > x. False for x = 1/2 (and x = 1).
  squareBigger: { kind: "real", about: (x) => n1(x) > 0, says: (x) => n1(x) ** 2 > n1(x), truth: false, example: "1/2" },
  // For every 2 × 2 matrix A, A² = 0 only when A = 0. False for A = (0 1; 0 0).
  nilpotent: { kind: "matrix", about: (x) => mat(x).length === 2 && mat(x).every((r) => r.length === 2), says: (x) => !zero(square2(mat(x))) || zero(mat(x)), truth: false, example: "0, 1; 0, 0" },
  // True ones, to decide.
  oddSquare: { kind: "int", about: (x) => whole(n1(x)) && Math.abs(n1(x)) % 2 === 1, says: (x) => Math.abs(n1(x) ** 2) % 2 === 1, truth: true },
  evenProduct: { kind: "pair", about: (x) => pair(x).length === 2 && pair(x).every(whole) && pair(x)[0] % 2 === 0, says: (x) => (pair(x)[0] * pair(x)[1]) % 2 === 0, truth: true },
  cubeMinus: { kind: "int", about: (x) => whole(n1(x)), says: (x) => (n1(x) ** 3 - n1(x)) % 6 === 0, truth: true },
  // √(a + b) = √a + √b for all a, b ≥ 0. False for 1 and 1.
  sqrtSum: { kind: "pair", about: (x) => pair(x).length === 2 && pair(x).every((v) => v >= 0), says: (x) => Math.abs(Math.sqrt(pair(x)[0] + pair(x)[1]) - Math.sqrt(pair(x)[0]) - Math.sqrt(pair(x)[1])) < 1e-9, truth: false, example: "1, 1" },
};
export const COUNTER_CLAIMS = (Object.keys(CLAIMS) as ClaimId[]).filter((id) => !CLAIMS[id].truth);
export const TRUE_CLAIMS = (Object.keys(CLAIMS) as ClaimId[]).filter((id) => CLAIMS[id].truth);

/** What a typed object is, against a claim: one it is not about, one it holds for, or a counterexample. */
export type Tested = "counter" | "holds" | "outside";
export function testObject(id: ClaimId, x: Obj): Tested {
  const c = CLAIMS[id];
  if (!c.about(x)) return "outside";
  return c.says(x) ? "holds" : "counter";
}

// ---------- the proofs and the faulty ones ----------

/** Why a line follows. */
export type ReasonKey =
  | "hypothesis" | "defEven" | "defOdd" | "defDivides" | "algebra" | "substitution" | "assumeNot" | "knownResult" | "contradiction" | "contrapositive"
  | "base" | "assumeK" | "inductionHyp" | "induction";
export const REASON_KEYS: readonly ReasonKey[] = ["hypothesis", "defEven", "defOdd", "defDivides", "algebra", "substitution", "assumeNot", "knownResult", "contradiction", "contrapositive"];
export type ProofId = "evenSum" | "oddProduct" | "consecutive" | "divides" | "sqrt2" | "contrapositive";
/** Each proof's lines' reasons, in order, and the line its wrong look-alike stands in for. */
export const PROOFS: Record<ProofId, { reasons: ReasonKey[]; mimics: number }> = {
  evenSum: { reasons: ["hypothesis", "defEven", "algebra", "defEven"], mimics: 1 },
  oddProduct: { reasons: ["hypothesis", "defOdd", "algebra", "defOdd"], mimics: 2 },
  consecutive: { reasons: ["hypothesis", "algebra", "algebra", "defDivides"], mimics: 1 },
  divides: { reasons: ["hypothesis", "defDivides", "substitution", "defDivides"], mimics: 2 },
  sqrt2: { reasons: ["assumeNot", "algebra", "knownResult", "algebra", "contradiction", "contradiction"], mimics: 2 },
  contrapositive: { reasons: ["contrapositive", "defOdd", "algebra", "defOdd"], mimics: 1 },
};
export const SHORT_PROOFS: readonly ProofId[] = ["evenSum", "oddProduct", "consecutive", "divides"];
export const LONG_PROOFS: readonly ProofId[] = ["sqrt2", "contrapositive"];
export type FlawId = "oneIsTwo" | "rootOfSquare" | "examples" | "flipInequality";
/** Each faulty proof's first wrong line, and a later one that is wrong only because of it. */
export const FLAWS: Record<FlawId, { lines: number; first: number; later: number | null }> = {
  oneIsTwo: { lines: 6, first: 4, later: 5 },
  rootOfSquare: { lines: 3, first: 2, later: null },
  examples: { lines: 4, first: 3, later: null },
  flipInequality: { lines: 3, first: 1, later: 2 },
};
export const FLAW_IDS: readonly FlawId[] = ["oneIsTwo", "rootOfSquare", "examples", "flipInequality"];

// ---------- proofs by induction ----------

/** The reasons offered beside an induction proof's line. */
export const INDUCTION_REASON_KEYS: readonly ReasonKey[] = ["base", "assumeK", "inductionHyp", "induction", "algebra", "defDivides", "hypothesis", "contradiction"];
export type InductionId = "sumN" | "oddSum" | "div3" | "powerBound";
/** Each induction proof's lines' reasons, and the line its look-alike (which assumes what is to be proved) stands in for. */
export const INDUCTION: Record<InductionId, { reasons: ReasonKey[]; mimics: number }> = {
  sumN: { reasons: ["base", "assumeK", "inductionHyp", "algebra", "induction"], mimics: 2 },
  oddSum: { reasons: ["base", "assumeK", "inductionHyp", "algebra", "induction"], mimics: 2 },
  div3: { reasons: ["base", "assumeK", "inductionHyp", "algebra", "defDivides", "induction"], mimics: 2 },
  powerBound: { reasons: ["base", "assumeK", "inductionHyp", "algebra", "algebra", "induction"], mimics: 2 },
};
export const SHORT_INDUCTION: readonly InductionId[] = ["sumN", "oddSum"];
export const LONG_INDUCTION: readonly InductionId[] = ["div3", "powerBound"];
export type InductionFlawId = "horses" | "noBase" | "badBase";
/** Each faulty induction's first wrong line, a later one wrong only because of it, and a right line taken for the wrong one. */
export const INDUCTION_FLAWS: Record<InductionFlawId, { lines: number; first: number; later: number | null; sound: number | null }> = {
  // The two groups of k horses share one only when k ≥ 2: the step from 1 to 2 fails.
  horses: { lines: 6, first: 4, later: 5, sound: null },
  // The step is right, but there is no base case, and n = 1 gives 2, which is even.
  noBase: { lines: 4, first: 3, later: null, sound: 2 },
  // The base case is worked wrong: (1 + 1 + 2)/2 = 2, not 1.
  badBase: { lines: 5, first: 0, later: 4, sound: null },
};
export const INDUCTION_FLAW_IDS: readonly InductionFlawId[] = ["horses", "noBase", "badBase"];
export const INDUCTION_FLAW_TEX: Record<InductionFlawId, string> = {
  horses: "k = 1:\\ \\{h_1\\} \\cap \\{h_2\\} = \\varnothing",
  noBase: "n = 1:\\ 1^2 + 1 = 2",
  badBase: "\\tfrac{1 + 1 + 2}{2} = 2 \\ne 1",
};

/** The words of the proofs (the locale's `proofs` block). */
export type ProofWords = {
  /** The words for true and false, as typed and on the buttons. */
  true: string;
  false: string;
  why: { unreadable: string; repeated: string; notObject: string; outside: string; noWitness: string; notDecided: string };
  reasons: Record<ReasonKey, string>;
  /** Each proof's claim, its lines in order, and a line that looks like one of them but doesn't follow. */
  proofs: Record<ProofId, { claim: string; lines: string[]; wrong: string }>;
  flaws: Record<FlawId, { claim: string; lines: string[] }>;
  /** Proofs by induction, as `proofs`, and faulty ones, as `flaws`. */
  induction: Record<InductionId, { claim: string; lines: string[]; wrong: string }>;
  inductionFlaws: Record<InductionFlawId, { claim: string; lines: string[] }>;
  claims: Record<ClaimId, string>;
  prompt: { order: string; reason: string; flaw: string; counter: string; decide: string };
  /** What each kind of object is typed like, after a counterexample's prompt. */
  typed: Record<ClaimKind, string>;
};

/** The working that shows a claim broken, or proved, in TeX. */
export const CLAIM_TEX: Record<ClaimId, string> = {
  euler41: "40^2 + 40 + 41 = 1681 = 41 \\times 41",
  mersenne: "2^{11} - 1 = 2047 = 23 \\times 89",
  squaresEqual: "2^2 = (-2)^2 = 4,\\quad 2 \\ne -2",
  primeSum: "2 + 3 = 5",
  squareBigger: "\\left(\\tfrac12\\right)^2 = \\tfrac14 < \\tfrac12",
  nilpotent: "\\begin{pmatrix}0&1\\\\0&0\\end{pmatrix}^2 = \\begin{pmatrix}0&0\\\\0&0\\end{pmatrix}",
  oddSquare: "(2k + 1)^2 = 2(2k^2 + 2k) + 1",
  evenProduct: "2k \\cdot m = 2(km)",
  cubeMinus: "n^3 - n = (n - 1)\\,n\\,(n + 1)",
  sqrtSum: "\\sqrt{1 + 1} = \\sqrt2 \\ne 2 = \\sqrt1 + \\sqrt1",
};

/** For a false claim, an object it does hold for: what a student offers who confuses an example with a counterexample. */
export const HOLDS: Partial<Record<ClaimId, number[]>> = { euler41: [1], mersenne: [3], squaresEqual: [2, 2], primeSum: [3, 5], squareBigger: [2], sqrtSum: [0, 4] };

/** What is wrong in each faulty proof, in TeX. */
export const FLAW_TEX: Record<FlawId, string> = {
  oneIsTwo: "a = b \\Rightarrow a - b = 0:\\ \\div 0",
  rootOfSquare: "\\sqrt{(-2)^2} = |-2| = 2",
  examples: "9 = 3 \\times 3",
  flipInequality: "-2x < 6 \\Rightarrow x > -3",
};
