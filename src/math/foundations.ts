// Logic and set theory as a degree's foundations course teaches them (Enderton, A Mathematical Introduction to Logic;
// Elements of Set Theory): statements of P, Q and R, their models and normal forms, resolution; first-order formulas
// read in a finite structure, free variables, relations that are models of axioms; ordinals below ω^ω in Cantor
// normal form, cardinal arithmetic and the axioms of ZFC. The words, the data and the rules; the questions are in
// src/math/skills/{normalForms,structures,ordinalArith}.ts.

/** The words of these questions (the locale's `fo` block). */
export type FoundationsWords = {
  prompt: {
    models: string;
    dnf: string;
    cnf: string;
    resolve: string;
    classify: string;
    count: string;
    free: string;
    relations: string;
    ordinal: string;
    cardinal: string;
    axiom: string;
  };
  classes: { tautology: string; satisfiable: string; unsatisfiable: string };
  axioms: { separation: string; replacement: string; power: string; union: string; pairing: string; infinity: string; choice: string };
};

// ---------- statements of P, Q and R ----------

export type F3 = { v: 0 | 1 | 2 } | { op: "not"; a: F3 } | { op: "and" | "or" | "imp" | "iff"; a: F3; b: F3 };
/** A misreading: "if … then" false whenever its first part is, "or" as one but not both. */
export type Slip3 = "vacuous" | "exclusive" | null;

const P: F3 = { v: 0 };
const Q: F3 = { v: 1 };
const R: F3 = { v: 2 };
const not = (a: F3): F3 => ({ op: "not", a });
const and = (a: F3, b: F3): F3 => ({ op: "and", a, b });
const or = (a: F3, b: F3): F3 => ({ op: "or", a, b });
const imp = (a: F3, b: F3): F3 => ({ op: "imp", a, b });
const iff = (a: F3, b: F3): F3 => ({ op: "iff", a, b });

export function value(f: F3, row: readonly boolean[], slip: Slip3 = null): boolean {
  if ("v" in f) return row[f.v];
  if (f.op === "not") return !value(f.a, row, slip);
  const a = value(f.a, row, slip);
  const b = value(f.b, row, slip);
  if (f.op === "and") return a && b;
  if (f.op === "or") return slip === "exclusive" ? a !== b : a || b;
  if (f.op === "imp") return slip === "vacuous" ? a && b : !a || b;
  return a === b;
}

/** The eight rows of P, Q, R, from all true down to all false. */
export const ROWS3: readonly boolean[][] = Array.from({ length: 8 }, (_, i) => [!(i & 4), !(i & 2), !(i & 1)]);
/** How many of the eight rows make the statement true. */
export const models = (f: F3, slip: Slip3 = null) => ROWS3.filter((row) => value(f, row, slip)).length;

const NAMES = ["P", "Q", "R"];
const SYM = { and: "∧", or: "∨", imp: "→", iff: "↔" } as const;
const TEX = { and: "\\land", or: "\\lor", imp: "\\to", iff: "\\leftrightarrow" } as const;
export function f3Tex(f: F3, top = true): string {
  if ("v" in f) return NAMES[f.v];
  if (f.op === "not") return `\\lnot ${f3Tex(f.a, false)}`;
  const s = `${f3Tex(f.a, false)} ${TEX[f.op]} ${f3Tex(f.b, false)}`;
  return top ? s : `(${s})`;
}
export function f3Text(f: F3, top = true): string {
  if ("v" in f) return NAMES[f.v];
  if (f.op === "not") return `¬${f3Text(f.a, false)}`;
  const s = `${f3Text(f.a, false)} ${SYM[f.op]} ${f3Text(f.b, false)}`;
  return top ? s : `(${s})`;
}

/** Statements whose models are counted (easy) and whose full normal forms are sized (medium). */
export const COUNT_FORMULAS: readonly F3[] = [
  imp(P, or(Q, R)),
  imp(and(P, Q), R),
  or(imp(P, Q), R),
  and(or(P, Q), imp(Q, R)),
  and(imp(P, Q), imp(Q, R)),
  imp(or(P, Q), R),
  or(and(P, not(Q)), R),
  and(or(P, R), not(Q)),
  imp(P, and(Q, not(R))),
  and(or(P, Q), or(not(P), R)),
  or(imp(P, not(Q)), and(Q, R)),
  imp(imp(P, Q), R),
];

/** Statements to sort: tautologies, contradictions and the rest. */
export const CLASS_FORMULAS: readonly F3[] = [
  or(imp(P, Q), imp(Q, P)),
  imp(and(imp(P, Q), imp(Q, R)), imp(P, R)),
  imp(and(P, imp(P, Q)), Q),
  or(or(P, not(P)), R),
  imp(and(imp(P, R), imp(Q, R)), imp(or(P, Q), R)),
  and(and(imp(P, Q), P), not(Q)),
  and(and(or(P, Q), not(P)), not(Q)),
  and(iff(P, Q), iff(P, not(Q))),
  imp(imp(P, Q), imp(Q, P)),
  imp(or(P, Q), and(P, R)),
  and(imp(P, R), imp(Q, R)),
  imp(imp(P, Q), imp(R, Q)),
  iff(imp(P, Q), or(not(P), R)),
];
export type Kind = "tautology" | "satisfiable" | "unsatisfiable";
export const kindOf = (f: F3): Kind => (models(f) === 8 ? "tautology" : models(f) === 0 ? "unsatisfiable" : "satisfiable");

// ---------- clauses ----------

export type Lit = { v: 0 | 1 | 2; neg: boolean };
export const litText = (l: Lit) => `${l.neg ? "¬" : ""}${NAMES[l.v]}`;
export const litTex = (l: Lit) => `${l.neg ? "\\lnot " : ""}${NAMES[l.v]}`;
export const clauseText = (c: readonly Lit[], op = "∨") => c.map(litText).join(` ${op} `);
export const clauseTex = (c: readonly Lit[], op = "\\lor") => c.map(litTex).join(` ${op} `);
/** The resolvent of two clauses on the variable v (positive in a, negative in b). */
export const resolvent = (a: readonly Lit[], b: readonly Lit[], v: number): Lit[] => {
  const out: Lit[] = [];
  for (const l of [...a.filter((l) => l.v !== v), ...b.filter((l) => l.v !== v)]) if (!out.some((m) => m.v === l.v && m.neg === l.neg)) out.push(l);
  return out;
};

// ---------- first-order structures ----------

/** Relations on {1, …, n} given by a rule. */
export type Rule = { tex: (n: number) => string; holds: (x: number, y: number, n: number) => boolean };
export const RULES: readonly Rule[] = [
  { tex: () => "x \\le y", holds: (x, y) => x <= y },
  { tex: () => "x < y", holds: (x, y) => x < y },
  { tex: () => "x \\mid y", holds: (x, y) => y % x === 0 },
  { tex: (n) => `x + y \\le ${n + 1}`, holds: (x, y, n) => x + y <= n + 1 },
  { tex: () => "|x - y| = 1", holds: (x, y) => Math.abs(x - y) === 1 },
  { tex: () => "y = 2x", holds: (x, y) => y === 2 * x },
  { tex: () => "x + y \\text{ even}", holds: (x, y) => (x + y) % 2 === 0 },
  { tex: () => "x \\ne y", holds: (x, y) => x !== y },
];
export type Quant = "all" | "some";
/** How many x in {1, …, n} make ∀y R(x, y) or ∃y R(x, y) true (or with R(y, x) when swapped). */
export function countX(rule: Rule, n: number, q: Quant, swapped: boolean): number {
  let k = 0;
  for (let x = 1; x <= n; x++) {
    const ys = Array.from({ length: n }, (_, i) => i + 1).map((y) => (swapped ? rule.holds(y, x, n) : rule.holds(x, y, n)));
    if (q === "all" ? ys.every(Boolean) : ys.some(Boolean)) k++;
  }
  return k;
}

/** Formulas and the variables free in them; a set as typed: "{x, y}", or "∅". */
export type FreeItem = { tex: string; free: string; why: string; boundOnce?: string; allFree?: string };
export const FREE_ITEMS: readonly FreeItem[] = [
  { tex: "\\forall x\\, (R(x, y) \\to \\exists y\\, S(x, y))", why: "y \\text{ free in } R(x, y), \\text{ the } y \\text{ in } S \\text{ bound by } \\exists y; \\ x \\text{ bound by } \\forall x", free: "{y}", boundOnce: "∅", allFree: "{x, y}" },
  { tex: "(\\exists x\\, R(x, z)) \\land S(x, y)", why: "x \\text{ in } R(x, z) \\text{ bound}, \\text{ the } x \\text{ in } S(x, y) \\text{ outside it, free}; \\ y, z \\text{ never bound}", free: "{x, y, z}", boundOnce: "{y, z}" },
  { tex: "\\forall y\\, \\exists x\\, (R(x, y) \\land S(y, z))", why: "x, y \\text{ bound by } \\exists x, \\forall y; \\ z \\text{ never bound}", free: "{z}", allFree: "{x, y, z}" },
  { tex: "\\exists z\\, (R(x, z) \\to \\forall x\\, S(x, z))", why: "z \\text{ bound by } \\exists z; \\ \\text{the } x \\text{ in } R(x, z) \\text{ is outside } \\forall x, \\text{ free}", free: "{x}", boundOnce: "∅", allFree: "{x, z}" },
  { tex: "(\\forall x\\, R(x, y)) \\lor \\exists y\\, S(y, x)", why: "\\text{the } y \\text{ in } R(x, y) \\text{ is outside } \\exists y, \\text{ the } x \\text{ in } S(y, x) \\text{ outside } \\forall x: \\text{ both free}", free: "{x, y}", boundOnce: "∅" },
  { tex: "\\forall x\\, \\forall y\\, (R(x, y) \\to R(y, x))", why: "x, y \\text{ both bound}: \\text{ a sentence}", free: "∅", allFree: "{x, y}" },
  { tex: "(\\exists y\\, R(x, y)) \\land \\forall z\\, (S(z, y) \\to R(z, x))", why: "\\text{the } y \\text{ in } S(z, y) \\text{ is outside } \\exists y; \\ x \\text{ never bound}; \\ z \\text{ bound by } \\forall z", free: "{x, y}", boundOnce: "{x}", allFree: "{x, y, z}" },
];
export const FREE_POOL = ["∅", "{x}", "{y}", "{z}", "{x, y}", "{x, z}", "{y, z}", "{x, y, z}"];

/** Axioms for a relation R on an n-element set: the relations that satisfy them are 2^k, k the pairs left free. The
 *  slips: every pair free (all n² of them), the pairs off the diagonal taken in order, the diagonal forgotten. */
export type AxiomSet = { tex: string; free: (n: number) => number; freeTex: string; all?: true; ordered?: true; diagonal?: true };
const REFL = "\\forall x\\, R(x, x)";
const IRREFL = "\\forall x\\, \\lnot R(x, x)";
const SYMM = "\\forall x\\, \\forall y\\, (R(x, y) \\to R(y, x))";
export const AXIOM_SETS: readonly AxiomSet[] = [
  { tex: REFL, free: (n) => n * n - n, freeTex: "n^2 - n", all: true },
  { tex: IRREFL, free: (n) => n * n - n, freeTex: "n^2 - n", all: true },
  { tex: SYMM, free: (n) => (n * (n + 1)) / 2, freeTex: "\\frac{n(n + 1)}{2}", all: true, diagonal: true },
  { tex: `${REFL}, \\quad ${SYMM}`, free: (n) => (n * (n - 1)) / 2, freeTex: "\\frac{n(n - 1)}{2}", ordered: true },
  { tex: `${IRREFL}, \\quad ${SYMM}`, free: (n) => (n * (n - 1)) / 2, freeTex: "\\frac{n(n - 1)}{2}", ordered: true },
];

// ---------- ordinals below ω^ω ----------

/** An ordinal in Cantor normal form: [exponent, coefficient] terms, exponents falling, coefficients ≥ 1. 0 is []. */
export type Ord = [number, number][];
export const nat = (n: number): Ord => (n === 0 ? [] : [[0, n]]);
export const omega = (k = 1, e = 1): Ord => [[e, k]];

export function oadd(a: Ord, b: Ord): Ord {
  if (!b.length) return a;
  const e = b[0][0];
  const keep = a.filter(([x]) => x > e);
  const same = a.find(([x]) => x === e);
  const head: [number, number] = [e, b[0][1] + (same ? same[1] : 0)];
  return [...keep, head, ...b.slice(1)];
}
/** The natural (Hessenberg) sum: the terms added as if addition were commutative. */
export function natural(a: Ord, b: Ord): Ord {
  const m = new Map<number, number>();
  for (const [e, c] of [...a, ...b]) m.set(e, (m.get(e) ?? 0) + c);
  return [...m].sort((x, y) => y[0] - x[0]);
}
export function omul(a: Ord, b: Ord): Ord {
  if (!a.length || !b.length) return [];
  let out: Ord = [];
  const [a0, c0] = a[0];
  for (const [e, d] of b) out = oadd(out, e > 0 ? [[a0 + e, d]] : [[a0, c0 * d], ...a.slice(1)]);
  return out;
}
const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const sup = (n: number) => [...String(n)].map((c) => SUP[+c]).join("");
export function ordText(a: Ord): string {
  if (!a.length) return "0";
  return a.map(([e, c]) => (e === 0 ? `${c}` : `ω${e === 1 ? "" : sup(e)}${c === 1 ? "" : `·${c}`}`)).join(" + ");
}
export function ordTex(a: Ord): string {
  if (!a.length) return "0";
  return a.map(([e, c]) => (e === 0 ? `${c}` : `\\omega${e === 1 ? "" : `^{${e}}`}${c === 1 ? "" : ` \\cdot ${c}`}`)).join(" + ");
}
/** The product as if multiplication were commutative: (ω + 1)·2 = ω·2 + 2, the natural (Hessenberg) product. */
export function natProduct(a: Ord, b: Ord): Ord {
  let out: Ord = [];
  for (const [e, c] of a) for (const [f, d] of b) out = natural(out, [[e + f, c * d]]);
  return out;
}
/** An ordinal as a factor: in brackets when it is a sum or has a coefficient. */
export const ordFactorTex = (a: Ord) => (a.length > 1 || (a.length === 1 && a[0][0] > 0 && a[0][1] > 1) ? `\\left(${ordTex(a)}\\right)` : ordTex(a));

// ---------- cardinals and ZFC ----------

/** ℵ₀, 𝔠 = 2^ℵ₀ and 2^𝔠: the three sizes the questions need. */
export const CARDINALS = [
  { text: "ℵ₀", tex: "\\aleph_0" },
  { text: "𝔠 = 2^ℵ₀", tex: "\\mathfrak{c} = 2^{\\aleph_0}" },
  { text: "2^𝔠", tex: "2^{\\mathfrak{c}}" },
] as const;
export type CardinalSlip = "cardinalProductPower" | "powerStaysCountable" | "powerJumps";
export const CARDINAL_SUMS: readonly { tex: string; right: 0 | 1 | 2; why: string; trap?: [CardinalSlip, 0 | 1 | 2] }[] = [
  { tex: "\\aleph_0 + \\aleph_0", right: 0, why: "|\\mathbb{N} \\sqcup \\mathbb{N}| = |\\mathbb{Z}| = \\aleph_0" },
  { tex: "\\aleph_0 \\cdot \\aleph_0", right: 0, why: "|\\mathbb{N} \\times \\mathbb{N}| = \\aleph_0", trap: ["cardinalProductPower", 1] },
  { tex: "\\aleph_0^{\\aleph_0}", right: 1, why: "2^{\\aleph_0} \\le \\aleph_0^{\\aleph_0} \\le \\left(2^{\\aleph_0}\\right)^{\\aleph_0} = 2^{\\aleph_0 \\cdot \\aleph_0} = 2^{\\aleph_0}", trap: ["powerStaysCountable", 0] },
  { tex: "\\mathfrak{c} \\cdot \\mathfrak{c}", right: 1, why: "2^{\\aleph_0} \\cdot 2^{\\aleph_0} = 2^{\\aleph_0 + \\aleph_0} = 2^{\\aleph_0}", trap: ["cardinalProductPower", 2] },
  { tex: "\\mathfrak{c}^{\\aleph_0}", right: 1, why: "\\left(2^{\\aleph_0}\\right)^{\\aleph_0} = 2^{\\aleph_0 \\cdot \\aleph_0} = 2^{\\aleph_0}", trap: ["powerJumps", 2] },
  { tex: "\\aleph_0 \\cdot \\mathfrak{c}", right: 1, why: "\\mathfrak{c} \\le \\aleph_0 \\cdot \\mathfrak{c} \\le \\mathfrak{c} \\cdot \\mathfrak{c} = \\mathfrak{c}", trap: ["cardinalProductPower", 2] },
  { tex: "2^{\\aleph_0 \\cdot \\aleph_0}", right: 1, why: "\\aleph_0 \\cdot \\aleph_0 = \\aleph_0", trap: ["powerJumps", 2] },
  { tex: "\\mathfrak{c}^{\\mathfrak{c}}", right: 2, why: "2^{\\mathfrak{c}} \\le \\mathfrak{c}^{\\mathfrak{c}} \\le \\left(2^{\\aleph_0}\\right)^{\\mathfrak{c}} = 2^{\\aleph_0 \\cdot \\mathfrak{c}} = 2^{\\mathfrak{c}}" },
];

export type AxiomName = keyof FoundationsWords["axioms"];
export const AXIOM_NAMES: readonly AxiomName[] = ["separation", "replacement", "power", "union", "pairing", "infinity", "choice"];
export const CONSTRUCTIONS: readonly { tex: string; right: AxiomName; why: string; trap?: ["replacementForSeparation" | "separationForReplacement", AxiomName] }[] = [
  { tex: "\\{x \\in A : x \\ne \\varnothing\\}", right: "separation", why: "\\{x \\in A : \\varphi(x)\\} \\subseteq A: \\text{ a part of a set already there, cut out by a property}", trap: ["replacementForSeparation", "replacement"] },
  { tex: "\\{x \\in A : \\exists y \\in A\\ (x \\in y)\\}", right: "separation", why: "\\{x \\in A : \\varphi(x)\\} \\subseteq A: \\text{ a part of a set already there, cut out by a property}", trap: ["replacementForSeparation", "replacement"] },
  { tex: "\\{\\{x\\} : x \\in A\\}", right: "replacement", why: "\\{F(x) : x \\in A\\}: \\text{ the image of a set under a rule } x \\mapsto F(x)", trap: ["separationForReplacement", "separation"] },
  { tex: "\\{x \\cup \\{x\\} : x \\in A\\}", right: "replacement", why: "\\{F(x) : x \\in A\\}: \\text{ the image of a set under a rule } x \\mapsto F(x)", trap: ["separationForReplacement", "separation"] },
  { tex: "\\{B : B \\subseteq A\\}", right: "power", why: "\\text{all subsets of } A \\text{ together}" },
  { tex: "\\bigcup A = \\{x : \\exists B \\in A\\ (x \\in B)\\}", right: "union", why: "\\text{the members of the members of } A" },
  { tex: "\\{a, b\\}", right: "pairing", why: "\\text{a set with exactly the members } a, b" },
  { tex: "\\omega = \\{0, 1, 2, \\dots\\}", right: "infinity", why: "\\text{a set with } \\varnothing \\text{ that holds } x \\cup \\{x\\} \\text{ whenever it holds } x" },
  { tex: "f\\colon \\mathcal{A} \\setminus \\{\\varnothing\\} \\to \\bigcup \\mathcal{A}, \\quad f(X) \\in X", right: "choice", why: "\\text{a choice function: one member picked from every non-empty set at once}" },
];
