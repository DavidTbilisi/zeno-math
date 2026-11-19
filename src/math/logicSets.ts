// Logic and sets, the first course of a maths degree (Velleman, How to Prove It; Hammack, Book of Proof; Halmos, Naive
// Set Theory): statements of P and Q and their truth tables, quantified statements and their negations, the relations
// on a small set and its properties, the four kinds of function, and which infinite sets can be listed. The data and
// the rules here; the questions are in src/math/skills/{logic,quantifiers,sets,mappings,relations,cardinality}.ts.

// ---------- statements of P and Q ----------

export type Formula = { v: "P" | "Q" } | { op: "not"; a: Formula } | { op: "and" | "or" | "imp" | "iff"; a: Formula; b: Formula };
/** A slip in reading a connective: "if P then Q" taken as false whenever P is false, "or" taken as one or the other but not both. */
export type Slip = "vacuous" | "exclusive";

export const P: Formula = { v: "P" };
export const Q: Formula = { v: "Q" };
export const not = (a: Formula): Formula => ({ op: "not", a });
export const and = (a: Formula, b: Formula): Formula => ({ op: "and", a, b });
export const or = (a: Formula, b: Formula): Formula => ({ op: "or", a, b });
export const imp = (a: Formula, b: Formula): Formula => ({ op: "imp", a, b });
export const iff = (a: Formula, b: Formula): Formula => ({ op: "iff", a, b });

export function truth(f: Formula, p: boolean, q: boolean, slip: Slip | null = null): boolean {
  if ("v" in f) return f.v === "P" ? p : q;
  if (f.op === "not") return !truth(f.a, p, q, slip);
  const [a, b] = [truth(f.a, p, q, slip), truth(f.b, p, q, slip)];
  if (f.op === "and") return a && b;
  if (f.op === "or") return slip === "exclusive" ? a !== b : a || b;
  if (f.op === "imp") return slip === "vacuous" ? a && b : !a || b;
  return a === b;
}

/** The rows of a truth table, top to bottom: P and Q both true, then P true and Q false, and so on. */
export const ROWS: readonly [boolean, boolean][] = [
  [true, true],
  [true, false],
  [false, true],
  [false, false],
];
export const column = (f: Formula, slip: Slip | null = null) => ROWS.map(([p, q]) => (truth(f, p, q, slip) ? 1 : 0));
export const sameColumn = (f: Formula, g: Formula) => column(f).every((v, i) => v === column(g)[i]);

const SYM = { and: "∧", or: "∨", imp: "→", iff: "↔" } as const;
const TEX = { and: "\\land", or: "\\lor", imp: "\\to", iff: "\\leftrightarrow" } as const;
/** As typed and on a button: ¬(P ∧ Q) → Q. */
export function formulaText(f: Formula, top = true): string {
  if ("v" in f) return f.v;
  if (f.op === "not") return `¬${formulaText(f.a, false)}`;
  const s = `${formulaText(f.a, false)} ${SYM[f.op]} ${formulaText(f.b, false)}`;
  return top ? s : `(${s})`;
}
export function formulaTex(f: Formula, top = true): string {
  if ("v" in f) return f.v;
  if (f.op === "not") return `\\lnot ${formulaTex(f.a, false)}`;
  const s = `${formulaTex(f.a, false)} ${TEX[f.op]} ${formulaTex(f.b, false)}`;
  return top ? s : `(${s})`;
}
/** The parts of a statement, innermost first, without the letters themselves: how its value is worked out. */
export function partsOf(f: Formula): Formula[] {
  if ("v" in f) return [];
  if (f.op === "not") return [...partsOf(f.a), f];
  return [...partsOf(f.a), ...partsOf(f.b), f];
}

/** Statements to evaluate at one row (easy). */
export const VALUE_FORMULAS: readonly Formula[] = [imp(P, Q), or(P, Q), and(P, not(Q)), or(not(P), Q), imp(P, not(Q)), not(and(P, Q)), imp(not(P), Q), iff(P, Q)];
/** Statements whose whole column is worked out (medium). */
export const TABLE_FORMULAS: readonly Formula[] = [
  imp(P, Q),
  imp(or(P, Q), P),
  imp(not(P), Q),
  and(imp(P, Q), imp(Q, P)),
  iff(P, not(Q)),
  imp(and(P, Q), not(P)),
  not(or(P, Q)),
  or(imp(P, Q), Q),
  and(imp(P, Q), not(Q)),
];

/** A statement, the one that means the same, and three that don't (with the mistake that picks one). */
export type Equivalence = { given: Formula; right: Formula; others: { f: Formula; trap?: "converseSlip" | "deMorganSlip" | "negatedImplication" }[] };
export const EQUIVALENCES: readonly Equivalence[] = [
  { given: imp(P, Q), right: imp(not(Q), not(P)), others: [{ f: imp(Q, P), trap: "converseSlip" }, { f: imp(not(P), not(Q)), trap: "converseSlip" }, { f: and(P, not(Q)) }] },
  { given: not(and(P, Q)), right: or(not(P), not(Q)), others: [{ f: and(not(P), not(Q)), trap: "deMorganSlip" }, { f: and(not(P), Q) }, { f: or(not(P), Q) }] },
  { given: not(or(P, Q)), right: and(not(P), not(Q)), others: [{ f: or(not(P), not(Q)), trap: "deMorganSlip" }, { f: and(not(P), Q) }, { f: not(and(P, Q)) }] },
  { given: imp(P, Q), right: or(not(P), Q), others: [{ f: or(P, not(Q)) }, { f: and(not(P), Q) }, { f: imp(Q, P), trap: "converseSlip" }] },
  { given: not(imp(P, Q)), right: and(P, not(Q)), others: [{ f: imp(not(P), not(Q)), trap: "negatedImplication" }, { f: imp(P, not(Q)), trap: "negatedImplication" }, { f: or(not(P), Q) }] },
];

// ---------- quantifiers ----------

/** A property of x, tested on a small set: its TeX, the TeX of one case, and the test. */
export type Property = { tex: string; at: (x: number) => string; holds: (x: number) => boolean };
const par = (x: number) => (x < 0 ? `(${x})` : `${x}`);
export const PROPERTIES: readonly Property[] = [
  { tex: "x^2 > x", at: (x) => `${par(x)}^2 = ${x * x} ${x * x > x ? ">" : "\\le"} ${x}`, holds: (x) => x * x > x },
  { tex: "x^2 \\ge x", at: (x) => `${par(x)}^2 = ${x * x} ${x * x >= x ? "\\ge" : "<"} ${x}`, holds: (x) => x * x >= x },
  { tex: "x + 3 > 4", at: (x) => `${x} + 3 = ${x + 3} ${x + 3 > 4 ? ">" : "\\le"} 4`, holds: (x) => x + 3 > 4 },
  { tex: "x^2 < 10", at: (x) => `${par(x)}^2 = ${x * x} ${x * x < 10 ? "<" : "\\ge"} 10`, holds: (x) => x * x < 10 },
  { tex: "|x| \\le 2", at: (x) => `|${x}| = ${Math.abs(x)} ${Math.abs(x) <= 2 ? "\\le" : ">"} 2`, holds: (x) => Math.abs(x) <= 2 },
  { tex: "x^3 \\ge x", at: (x) => `${par(x)}^3 = ${x ** 3} ${x ** 3 >= x ? "\\ge" : "<"} ${x}`, holds: (x) => x ** 3 >= x },
  { tex: "2 \\mid x", at: (x) => (x % 2 === 0 ? `${x} = 2 \\times ${par(x / 2)}` : `${x} = 2 \\times ${par((x - 1) / 2)} + 1`), holds: (x) => x % 2 === 0 },
];
export const DOMAINS: readonly number[][] = [
  [1, 2, 3, 4, 5],
  [-2, -1, 0, 1, 2],
  [0, 1, 2, 3],
  [-3, -2, -1, 0, 1, 2, 3],
];

/** "For all x there is a y" and its kin: the property, written and negated, as text and TeX. */
export type Relation2 = { text: string; neg: string; tex: string; negTex: string };
export const RELATIONS2: readonly Relation2[] = [
  { text: "x + y = 0", neg: "x + y ≠ 0", tex: "x + y = 0", negTex: "x + y \\ne 0" },
  { text: "y > x", neg: "y ≤ x", tex: "y > x", negTex: "y \\le x" },
  { text: "xy = 1", neg: "xy ≠ 1", tex: "xy = 1", negTex: "xy \\ne 1" },
  { text: "y² = x", neg: "y² ≠ x", tex: "y^2 = x", negTex: "y^2 \\ne x" },
];
export type Quant = "all" | "some";
export const QTEXT: Record<Quant, string> = { all: "∀", some: "∃" };
export const QTEX: Record<Quant, string> = { all: "\\forall", some: "\\exists" };
export const flipQ = (q: Quant): Quant => (q === "all" ? "some" : "all");

/** The definitions of a limit and of continuity, negated: the right negation and three that aren't. */
export type LimitNegation = { tex: string; right: string; others: { text: string; trap?: "keptQuantifier" | "negatedImplication" }[] };
export const LIMIT_NEGATIONS: readonly LimitNegation[] = [
  {
    tex: "\\forall \\varepsilon > 0\\ \\exists N\\ \\forall n > N:\\ |a_n - L| < \\varepsilon",
    right: "∃ε > 0 ∀N ∃n > N: |aₙ − L| ≥ ε",
    others: [{ text: "∀ε > 0 ∃N ∀n > N: |aₙ − L| ≥ ε", trap: "keptQuantifier" }, { text: "∃ε > 0 ∀N ∃n ≤ N: |aₙ − L| ≥ ε" }, { text: "∃ε > 0 ∀N ∃n > N: |aₙ − L| < ε" }],
  },
  {
    tex: "\\forall \\varepsilon > 0\\ \\exists \\delta > 0\\ \\forall x:\\ |x - a| < \\delta \\to |f(x) - f(a)| < \\varepsilon",
    right: "∃ε > 0 ∀δ > 0 ∃x: |x − a| < δ ∧ |f(x) − f(a)| ≥ ε",
    others: [
      { text: "∃ε > 0 ∀δ > 0 ∃x: |x − a| < δ → |f(x) − f(a)| ≥ ε", trap: "negatedImplication" },
      { text: "∀ε > 0 ∃δ > 0 ∀x: |x − a| < δ ∧ |f(x) − f(a)| ≥ ε", trap: "keptQuantifier" },
      { text: "∃ε > 0 ∀δ > 0 ∃x: |x − a| ≥ δ ∧ |f(x) − f(a)| ≥ ε" },
    ],
  },
];

/** A statement with two quantifiers, as given and with them swapped round: each one's truth, and why (TeX). */
export type QuantOrder = { tex: string; swapped: string; truth: boolean; swappedTruth: boolean; why: string; swappedWhy: string };
export const QUANT_ORDERS: readonly QuantOrder[] = [
  {
    tex: "\\forall x \\in \\mathbb{Z}\\ \\exists y \\in \\mathbb{Z}:\\ x + y = 0",
    swapped: "\\exists y \\in \\mathbb{Z}\\ \\forall x \\in \\mathbb{Z}:\\ x + y = 0",
    truth: true, swappedTruth: false,
    why: "y = -x", swappedWhy: "x = 1 - y:\\ x + y = 1 \\ne 0",
  },
  {
    tex: "\\forall x \\in \\mathbb{N}\\ \\exists y \\in \\mathbb{N}:\\ y > x",
    swapped: "\\exists y \\in \\mathbb{N}\\ \\forall x \\in \\mathbb{N}:\\ y > x",
    truth: true, swappedTruth: false,
    why: "y = x + 1", swappedWhy: "x = y:\\ y \\not> y",
  },
  {
    tex: "\\forall x \\in \\mathbb{R} \\setminus \\{0\\}\\ \\exists y \\in \\mathbb{R}:\\ xy = 1",
    swapped: "\\exists y \\in \\mathbb{R}\\ \\forall x \\in \\mathbb{R} \\setminus \\{0\\}:\\ xy = 1",
    truth: true, swappedTruth: false,
    why: "y = \\tfrac{1}{x}", swappedWhy: "x = \\tfrac{2}{y}\\ (y \\ne 0),\\ x = 1\\ (y = 0):\\ xy \\ne 1",
  },
  {
    tex: "\\exists x \\in \\mathbb{R}\\ \\forall y \\in \\mathbb{R}:\\ xy = 0",
    swapped: "\\forall y \\in \\mathbb{R}\\ \\exists x \\in \\mathbb{R}:\\ xy = 0",
    truth: true, swappedTruth: true,
    why: "x = 0", swappedWhy: "x = 0",
  },
  {
    tex: "\\forall x \\in \\mathbb{R}\\ \\exists y \\in \\mathbb{R}:\\ y^2 = x",
    swapped: "\\exists y \\in \\mathbb{R}\\ \\forall x \\in \\mathbb{R}:\\ y^2 = x",
    truth: false, swappedTruth: false,
    why: "x = -1:\\ y^2 \\ge 0 > -1", swappedWhy: "x = -1:\\ y^2 \\ge 0 > -1",
  },
  {
    tex: "\\exists x \\in \\mathbb{N}\\ \\forall y \\in \\mathbb{N}:\\ x \\le y",
    swapped: "\\forall y \\in \\mathbb{N}\\ \\exists x \\in \\mathbb{N}:\\ x \\le y",
    truth: true, swappedTruth: true,
    why: "x = \\min \\mathbb{N}", swappedWhy: "x = y",
  },
];

// ---------- functions: injective, surjective ----------

export type MapKind = "injOnly" | "surjOnly" | "bij" | "neither";
export const MAP_KINDS: readonly MapKind[] = ["injOnly", "surjOnly", "bij", "neither"];
/** The kind of a function given as the image of each element of {0, …, n − 1} in {0, …, m − 1}. */
export function kindOf(f: readonly number[], m: number): MapKind {
  const inj = new Set(f).size === f.length;
  const surj = new Set(f).size === m;
  return inj && surj ? "bij" : inj ? "injOnly" : surj ? "surjOnly" : "neither";
}
/** Two elements with the same image, and an element of the target nothing goes to (null when there is none). */
export function shared(f: readonly number[]): [number, number] | null {
  for (let i = 0; i < f.length; i++) for (let j = i + 1; j < f.length; j++) if (f[i] === f[j]) return [i, j];
  return null;
}
export const missed = (f: readonly number[], m: number) => {
  for (let v = 0; v < m; v++) if (!f.includes(v)) return v;
  return null;
};

/** A function given by its rule: its kind, why (TeX), and for a wrong pick the mistake and the numbers it names. */
export type MapRule = { tex: string; kind: MapKind; why: string; missed?: string; shared?: [string, string, string] };
export const MAP_RULES: readonly MapRule[] = [
  { tex: "f\\colon \\mathbb{R} \\to \\mathbb{R},\\ f(x) = 2x + 1", kind: "bij", why: "f^{-1}(y) = \\tfrac{y - 1}{2}" },
  { tex: "f\\colon \\mathbb{R} \\to \\mathbb{R},\\ f(x) = x^3", kind: "bij", why: "f^{-1}(y) = \\sqrt[3]{y}" },
  { tex: "f\\colon \\mathbb{R} \\to \\mathbb{R},\\ f(x) = x^2", kind: "neither", why: "f(-1) = f(1) = 1,\\ x^2 \\ne -1", missed: "−1", shared: ["−1", "1", "1"] },
  { tex: "f\\colon \\mathbb{R} \\to \\mathbb{R},\\ f(x) = e^x", kind: "injOnly", why: "e^a = e^b \\Rightarrow a = b,\\ e^x \\ne -1", missed: "−1" },
  { tex: "f\\colon \\mathbb{R} \\to \\mathbb{R},\\ f(x) = x^3 - x", kind: "surjOnly", why: "f(-1) = f(1) = 0,\\ \\lim_{x \\to \\pm\\infty} f(x) = \\pm\\infty", shared: ["−1", "1", "0"] },
  { tex: "f\\colon [0, \\infty) \\to \\mathbb{R},\\ f(x) = x^2", kind: "injOnly", why: "a^2 = b^2,\\ a, b \\ge 0 \\Rightarrow a = b;\\ x^2 \\ne -1", missed: "−1" },
  { tex: "f\\colon \\mathbb{R} \\to [0, \\infty),\\ f(x) = x^2", kind: "surjOnly", why: "f(-2) = f(2) = 4,\\ y = (\\sqrt{y})^2", shared: ["−2", "2", "4"] },
  { tex: "f\\colon \\mathbb{Z} \\to \\mathbb{Z},\\ f(n) = 2n", kind: "injOnly", why: "2a = 2b \\Rightarrow a = b,\\ 2n \\ne 1", missed: "1" },
  { tex: "f\\colon \\mathbb{Z} \\to \\mathbb{Z},\\ f(n) = n + 5", kind: "bij", why: "f^{-1}(m) = m - 5" },
  { tex: "f\\colon \\mathbb{R} \\to \\mathbb{R},\\ f(x) = \\sin x", kind: "neither", why: "\\sin 0 = \\sin \\pi = 0,\\ \\sin x \\ne 2", missed: "2", shared: ["0", "π", "0"] },
];

// ---------- relations ----------

export type RelProp = "reflexive" | "symmetric" | "transitive";
export const REL_PROPS: readonly RelProp[] = ["reflexive", "symmetric", "transitive"];
export type Pair = readonly [number, number];
const has = (R: readonly Pair[], x: number, y: number) => R.some(([a, b]) => a === x && b === y);
/** Why a relation on {1, …, n} lacks a property: the pairs that show it, or null when it has the property. */
export function breaks(R: readonly Pair[], n: number, prop: RelProp): number[] | null {
  if (prop === "reflexive") {
    for (let x = 1; x <= n; x++) if (!has(R, x, x)) return [x];
    return null;
  }
  if (prop === "symmetric") {
    for (const [x, y] of R) if (!has(R, y, x)) return [x, y];
    return null;
  }
  for (const [x, y] of R) for (const [y2, z] of R) if (y === y2 && !has(R, x, z)) return [x, y, z];
  return null;
}
/** The relation made to have a property: loops added, reverses added, or closed under chains. */
export function closeUnder(R: readonly Pair[], n: number, prop: RelProp): Pair[] {
  const out = [...R];
  const add = (x: number, y: number) => {
    if (!has(out, x, y)) out.push([x, y]);
  };
  if (prop === "reflexive") for (let x = 1; x <= n; x++) add(x, x);
  else if (prop === "symmetric") for (const [x, y] of [...out]) add(y, x);
  else
    for (let grew = true; grew; ) {
      grew = false;
      for (const [x, y] of [...out]) for (const [y2, z] of [...out]) if (y === y2 && !has(out, x, z)) (add(x, z), (grew = true));
    }
  return out.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

/** The minimal (nothing else in the set divides it) or maximal (it divides nothing else) elements under divides. */
export function extremes(S: readonly number[], which: "min" | "max"): number[] {
  return S.filter((a) => !S.some((b) => b !== a && (which === "min" ? a % b === 0 : b % a === 0)));
}
/** The pairs a below b with nothing in between: the lines of the Hasse diagram. */
export function covers(S: readonly number[]): Pair[] {
  const out: Pair[] = [];
  for (const a of S) for (const b of S) if (a !== b && b % a === 0 && !S.some((c) => c !== a && c !== b && c % a === 0 && b % c === 0)) out.push([a, b]);
  return out;
}
/** The number of prime factors, counted with repeats: the row of the Hasse diagram. */
export function primeFactors(n: number): number {
  let k = 0;
  for (let p = 2; n > 1; p++) while (n % p === 0) ((n /= p), k++);
  return k;
}
export const POSET_POOL: readonly number[] = [2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 18, 20, 24, 30, 36];

// ---------- countable and uncountable ----------

export type InfiniteSet = "N" | "Z" | "Q" | "NxN" | "finiteStrings" | "primes" | "R" | "unit" | "powerN" | "binarySeqs" | "irrationals";
export const COUNTABLE: readonly InfiniteSet[] = ["N", "Z", "Q", "NxN", "finiteStrings", "primes"];
export const UNCOUNTABLE: readonly InfiniteSet[] = ["R", "unit", "powerN", "binarySeqs", "irrationals"];
/** The sets written in symbols; the others are named in words (LogicWords.card.sets). */
export const SET_SYMBOLS: Partial<Record<InfiniteSet, string>> = { N: "ℕ", Z: "ℤ", Q: "ℚ", NxN: "ℕ × ℕ", R: "ℝ", unit: "(0, 1)", powerN: "𝒫(ℕ)" };
/** Why: a listing of a countable set, a pairing or Cantor's argument for an uncountable one. */
export const SET_WHY: Record<InfiniteSet, string> = {
  N: "1, 2, 3, 4, \\dots",
  Z: "0, 1, -1, 2, -2, 3, -3, \\dots",
  Q: "0, \\tfrac{1}{1}, -\\tfrac{1}{1}, \\tfrac{1}{2}, -\\tfrac{1}{2}, \\tfrac{2}{1}, -\\tfrac{2}{1}, \\tfrac{1}{3}, \\dots",
  NxN: "(1, 1), (1, 2), (2, 1), (1, 3), (2, 2), (3, 1), \\dots",
  finiteStrings: "0, 1, 00, 01, 10, 11, 000, \\dots",
  primes: "2, 3, 5, 7, 11, 13, \\dots",
  R: "|\\mathbb{R}| = |\\mathcal{P}(\\mathbb{N})| > |\\mathbb{N}|",
  unit: "x \\mapsto \\tan\\left(\\pi x - \\tfrac{\\pi}{2}\\right):\\ (0, 1) \\to \\mathbb{R}",
  powerN: "|\\mathcal{P}(\\mathbb{N})| > |\\mathbb{N}|",
  binarySeqs: "\\{0, 1\\}^{\\mathbb{N}} \\leftrightarrow \\mathcal{P}(\\mathbb{N})",
  irrationals: "\\mathbb{R} = \\mathbb{Q} \\cup (\\mathbb{R} \\setminus \\mathbb{Q})",
};
/** The place of an integer in the list 0, 1, −1, 2, −2, …, from 1; and the integer in a place. */
export const placeOfInt = (m: number) => (m > 0 ? 2 * m : 2 * -m + 1);
export const intAtPlace = (n: number) => (n % 2 === 0 ? n / 2 : (1 - n) / 2);
/** The place of the pair (a, b), a, b ≥ 1, listed along the diagonals a + b = 2, 3, …, a counting up on each. */
export const placeOfPair = (a: number, b: number) => {
  const d = a + b - 1;
  return (d * (d - 1)) / 2 + a;
};

/** The words of these questions (the locale's `logic` block). */
export type LogicWords = {
  yes: string;
  no: string;
  prompt: {
    value: string;
    table: string;
    same: string;
    sameSaid: string;
    finite: string;
    negate: string;
    order: string;
    venn: string;
    count: string;
    mapKind: string;
    compute: string;
    relProp: string;
    relClass: string;
    minimal: string;
    maximal: string;
    uncountable: string;
    countable: string;
    zPlace: string;
    zValue: string;
    pairs: string;
    diagonal: string;
  };
  /** "If {a}, then {b}.", and statements with their negations, to make it from. */
  ifThen: string;
  said: { p: string; notP: string; q: string; notQ: string }[];
  maps: Record<MapKind, string>;
  rel: Record<RelProp, string>;
  sets: Partial<Record<InfiniteSet, string>>;
};

// ---------- shared by the questions ----------

/** A copy of xs in random order. */
export function shuffled<T>(r: { next: () => number }, xs: readonly T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r.next() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
/** An option to pick, shown and typed as text. */
export const option = (text: string, tex = `\\text{${text}}`) => ({ text, plain: text, tex });
export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const setTex = (xs: readonly number[]) => `\\{${xs.join(", ")}\\}`;
/** A minus sign for a number in words. */
export const minus = (v: number) => String(v).replace(/^-/, "−");
