// A concept's inside, as a graph (prototype, fractions only). The skills are what the curriculum orders; each one is
// made of smaller ideas (nodes) joined by connections (edges), and how big that graph is says how complex the concept
// is. An edge is one of two kinds: needs (the second idea cannot be done without the first, as dividing by a fraction
// cannot without its reciprocal) or joins (the two are used together, one inside the other, as a common denominator
// inside adding unlike fractions). A node shows in a question that needs it; an edge shows only in a question that
// needs both of its ends, so a question is read for the nodes it uses and exercises every edge between them. The more
// nodes one question uses, the more a student must hold together at once (Sweller's element interactivity).
//
// Concepts share ideas. Fractions is built on whole-number arithmetic: every arithmetic idea is one of its ideas too,
// with the edges between them, and bridges say where each comes in (the highest common factor into lowest terms, the
// lowest common multiple into a common denominator). An idea is one thing wherever it is used, so knowing it counts in
// every concept that has it: a student who masters arithmetic is already part of the way into fractions, and a right
// answer on a fractions question is evidence about the arithmetic inside it.
//
// Mastery is only well defined on ideas that are atoms: learnt as one thing, so that a student has it or has not. The
// three tests at the end ask that of an idea: whether a question tests it alone, whether its learning curve is one
// smooth fall, and whether practice on one form of it carries over to the others. Nothing in the app reads this yet.
import type { MistakeId } from "../math/mistakes.ts";
import type { Exercise } from "../math/practice.ts";
import { fitLogistic } from "./evaluate.ts";

export type EdgeKind = "needs" | "joins";
export type ConceptGraph<N extends string = string> = {
  /** Each idea and what having it means. */
  nodes: Readonly<Record<N, string>>;
  /** [from, to, kind]: to needs from, or the two are used together. */
  edges: readonly (readonly [N, N, EdgeKind])[];
};
export type EdgeId = `${string}→${string}`;
export const edgeId = ([from, to]: readonly [string, string, ...unknown[]]): EdgeId => `${from}→${to}`;

/** Whole-number arithmetic as far as fractions rests on it: Zeno's times and hcf skills. */
export const ARITHMETIC = {
  nodes: {
    addWhole: "adding and subtracting whole numbers",
    multiplyFacts: "the times tables: any two numbers up to 12 multiplied",
    multiplyLong: "multiplying a number above 12 by place value, adding the partial products",
    divideExact: "dividing a whole number by one of its factors",
    hcf: "the highest common factor of two numbers",
    lcm: "the lowest common multiple of two numbers: one divided by their highest common factor, times the other",
  },
  edges: [
    ["multiplyFacts", "multiplyLong", "needs"],
    ["addWhole", "multiplyLong", "needs"],
    ["multiplyFacts", "divideExact", "needs"],
    ["divideExact", "hcf", "needs"],
    ["hcf", "lcm", "needs"],
    ["multiplyFacts", "lcm", "needs"],
    ["multiplyLong", "lcm", "joins"],
  ],
} as const satisfies ConceptGraph;
export type ArithmeticNode = keyof typeof ARITHMETIC.nodes;

/** Fractions: ten ideas of its own, every arithmetic idea and edge, and nine bridges from arithmetic into its own. */
export const FRACTIONS = {
  nodes: {
    part: "a fraction is equal parts of a whole: n/d is n of d parts",
    equivalent: "multiplying or dividing top and bottom by the same number keeps the value",
    lowest: "lowest terms: dividing top and bottom by their highest common factor",
    commonDenom: "a common denominator of two fractions, best the lowest common multiple",
    addSub: "fractions over the same denominator add and subtract by their tops",
    multiply: "tops times tops over bottoms times bottoms",
    reciprocal: "the reciprocal of n/d is d/n, and a number times its reciprocal is 1",
    divide: "dividing by a fraction is multiplying by its reciprocal",
    toImproper: "a mixed number as an improper fraction: 2 3/4 is 11/4",
    toMixed: "an improper fraction as a mixed number: 11/4 is 2 3/4",
    ...ARITHMETIC.nodes,
  },
  edges: [
    ["part", "equivalent", "needs"],
    ["equivalent", "lowest", "needs"],
    ["equivalent", "commonDenom", "needs"],
    ["part", "addSub", "needs"],
    ["part", "multiply", "needs"],
    ["part", "reciprocal", "needs"],
    ["reciprocal", "divide", "needs"],
    ["multiply", "divide", "needs"],
    ["part", "toImproper", "needs"],
    ["part", "toMixed", "needs"],
    ["commonDenom", "addSub", "joins"],
    ["toImproper", "addSub", "joins"],
    ["toImproper", "multiply", "joins"],
    ...ARITHMETIC.edges,
    // The bridges: where each arithmetic idea comes into fractions.
    ["addWhole", "addSub", "needs"],
    ["multiplyFacts", "equivalent", "needs"],
    ["multiplyFacts", "multiply", "needs"],
    ["multiplyLong", "multiply", "joins"],
    ["hcf", "lowest", "needs"],
    ["divideExact", "lowest", "needs"],
    ["lcm", "commonDenom", "needs"],
    ["multiplyFacts", "toImproper", "needs"],
    ["addWhole", "toImproper", "needs"],
  ],
} as const satisfies ConceptGraph;
export type FractionsNode = keyof typeof FRACTIONS.nodes;

/** How complex a concept is: its ideas, the connections between them, and both together. */
export const complexity = (g: ConceptGraph) => {
  const nodes = Object.keys(g.nodes).length;
  return { nodes, edges: g.edges.length, total: nodes + g.edges.length };
};

/** The ideas two concepts share: knowing one counts in both. */
export const sharedIdeas = (a: ConceptGraph, b: ConceptGraph) => Object.keys(a.nodes).filter((n) => n in b.nodes);

/** The ideas and connections one question needs. */
export type Uses<N extends string = string> = { nodes: N[]; edges: EdgeId[] };
const usesOf = <N extends string>(g: ConceptGraph<N>, nodes: N[]): Uses<N> => ({
  nodes,
  edges: g.edges.filter(([a, b]) => nodes.includes(a) && nodes.includes(b)).map(edgeId),
});

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
/** "2 3/4" or "3/4" as an improper fraction, with its whole part and whether it was mixed. */
const improper = (s: string) => {
  const [, whole, n, d] = /^(?:(\d+) )?(\d+)\/(\d+)$/.exec(s)!;
  return { n: Number(whole ?? 0) * Number(d) + Number(n), d: Number(d), whole: Number(whole ?? 0), mixed: whole !== undefined };
};

/** The ideas multiplying two whole numbers needs: the times tables, and long multiplication when one is above 12. */
const product = (x: number, y: number): ArithmeticNode[] => (Math.max(Math.abs(x), Math.abs(y)) > 12 ? ["multiplyFacts", "multiplyLong", "addWhole"] : ["multiplyFacts"]);

/**
 * The ideas an arithmetic question needs (times and hcf), read from it: a product needs what multiplying its two
 * numbers needs; a highest common factor needs dividing exactly; a lowest common multiple needs the highest common
 * factor first and then one number divided by it times the other.
 */
export function arithmeticUses(ex: Exercise): Uses<ArithmeticNode> {
  const nodes = new Set<ArithmeticNode>();
  const spec = ex.solution?.spec as { type?: string; topic?: string; a: number | string; b: number | string };
  const a = Number(spec.a), b = Number(spec.b);
  if (spec.type === "multiply") for (const n of product(a, b)) nodes.add(n);
  else if (spec.topic === "gcd") {
    const g = gcd(a, b);
    nodes.add("hcf").add("divideExact").add("multiplyFacts");
    if (ex.answer.k === "num" && ex.answer.v !== g) {
      nodes.add("lcm");
      for (const n of product(a / g, b)) nodes.add(n);
    }
  } else throw new Error(`not an arithmetic question: ${ex.skill}`);
  return usesOf(ARITHMETIC, Object.keys(ARITHMETIC.nodes).filter((k) => nodes.has(k as ArithmeticNode)) as ArithmeticNode[]);
}

/**
 * The ideas a fractions question needs, read from its worked solution: the operation, whether a number is mixed, and
 * whether the usual method (over the lowest common denominator; tops times tops) leaves a result to be simplified;
 * and the whole-number arithmetic each step of that method does (every product, sum, common multiple and common
 * factor). Never toMixed: an improper answer is accepted, so no question asks for a mixed number back.
 */
export function fractionsUses(ex: Exercise): Uses<FractionsNode> {
  const spec = ex.solution?.spec as { op: "+" | "-" | "×" | "÷"; a: string; b: string };
  const a = improper(spec.a), b = improper(spec.b);
  const nodes = new Set<FractionsNode>(["part"]);
  const times = (x: number, y: number) => product(x, y).forEach((n) => nodes.add(n));
  // A mixed number's top: its whole times the bottom, plus the top.
  for (const x of [a, b]) if (x.mixed) (nodes.add("toImproper").add("addWhole"), times(x.whole, x.d));
  let raw: [number, number];
  if (spec.op === "+" || spec.op === "-") {
    nodes.add("addSub").add("addWhole");
    const lcm = (a.d / gcd(a.d, b.d)) * b.d;
    if (a.d !== b.d) {
      nodes.add("commonDenom").add("equivalent").add("lcm");
      for (const x of [a, b]) if (x.d !== lcm) times(x.n, lcm / x.d);
    }
    raw = [a.n * (lcm / a.d) + (spec.op === "+" ? 1 : -1) * b.n * (lcm / b.d), lcm];
  } else {
    nodes.add("multiply");
    if (spec.op === "÷") nodes.add("reciprocal").add("divide");
    raw = spec.op === "×" ? [a.n * b.n, a.d * b.d] : [a.n * b.d, a.d * b.n];
    if (spec.op === "×") (times(a.n, b.n), times(a.d, b.d));
    else (times(a.n, b.d), times(a.d, b.n));
  }
  if (raw[0] !== 0 && gcd(raw[0], raw[1]) > 1) nodes.add("lowest").add("equivalent").add("hcf").add("divideExact");
  return usesOf(FRACTIONS, Object.keys(FRACTIONS.nodes).filter((k) => nodes.has(k as FractionsNode)) as FractionsNode[]);
}

/** The idea or connection each fractions mistake shows is missing. */
export const FRACTIONS_GAPS: Partial<Record<MistakeId, FractionsNode | EdgeId>> = {
  // 1/5 + 2/5 answered 3/10: adding the bottoms as well, not knowing what adding fractions means.
  addAcross: "addSub",
  // 1/2 ÷ 3/4 answered 3/2: knowing to flip, but not which number dividing multiplies by the reciprocal of.
  flipFirst: "reciprocal→divide",
};

/**
 * How much of a concept a student has: the share of its ideas and of its connections they know, and whether they have
 * mastered it, which takes every idea and at least the given share of the connections.
 */
export function progressOf(g: ConceptGraph, known: { nodes: ReadonlySet<string>; edges: ReadonlySet<EdgeId> }, edgeShare = 0.8) {
  const n = Object.keys(g.nodes).filter((k) => known.nodes.has(k)).length / Object.keys(g.nodes).length;
  const e = g.edges.filter((edge) => known.edges.has(edgeId(edge))).length / g.edges.length;
  return { nodes: n, edges: e, mastered: n === 1 && e >= edgeShare };
}

// ---------- is an idea an atom? ----------

/** Everything an idea needs, directly or through other ideas (needs edges only). */
export function needsOf<N extends string>(g: ConceptGraph<N>, node: N): Set<N> {
  const out = new Set<N>();
  const visit = (n: N) => {
    for (const [a, b, kind] of g.edges) if (kind === "needs" && b === n && !out.has(a)) (out.add(a), visit(a));
  };
  visit(node);
  return out;
}

/**
 * Test 1, the questions: an idea is tested alone by a question that needs it and, besides it, only what it needs. A
 * wrong answer there points at the idea; anywhere else it could be another one's fault. (Telling every idea apart from
 * answers alone takes such a question for each, the complete Q-matrix of cognitive diagnosis.)
 */
export function testedAlone<N extends string>(g: ConceptGraph<N>, questions: readonly Uses<N>[]): Record<N, boolean> {
  const nodes = Object.keys(g.nodes) as N[];
  return Object.fromEntries(nodes.map((n) => {
    const below = needsOf(g, n);
    return [n, questions.some((q) => q.nodes.includes(n) && q.nodes.every((m) => m === n || below.has(m)))];
  })) as Record<N, boolean>;
}

/** One answer, with the ideas its question needed and, for the transfer test, the form the question took. */
export type Attempt = { student: string; nodes: readonly string[]; right: boolean; form?: string };

/** Each attempt that needs the idea, with how many earlier attempts by the same student needed it (of any form, and of its form). */
function opportunities(attempts: readonly Attempt[], node: string) {
  const any = new Map<string, number>(), same = new Map<string, number>();
  return attempts.filter((a) => a.nodes.includes(node)).map((a) => {
    const formKey = `${a.student}\u0000${a.form}`;
    const o = { a, before: any.get(a.student) ?? 0, beforeSameForm: same.get(formKey) ?? 0 };
    any.set(a.student, o.before + 1);
    same.set(formKey, o.beforeSameForm + 1);
    return o;
  });
}

/** A learning curve is read only as far as at least this many students got. */
export const CURVE_STUDENTS = 20;
/** The share of the curve's spread (in logs) a power law must explain for the curve to count as one smooth fall. */
export const SMOOTH_R2 = 0.8;
/**
 * Test 2, the learning curve: the error rate at each opportunity to use the idea (the first, the second, …) should
 * fall smoothly as a power law, error = a·k^−b (Newell & Rosenbloom), the way practice on one thing falls. A curve that
 * jumps back up, or does not fall, is more than one thing: typically a harder part that only later questions ask.
 */
export function learningCurve(attempts: readonly Attempt[], node: string) {
  const at: { n: number; wrong: number }[] = [];
  for (const { a, before } of opportunities(attempts, node)) {
    at[before] ??= { n: 0, wrong: 0 };
    at[before].n++;
    if (!a.right) at[before].wrong++;
  }
  const cut = at.findIndex((p) => p.n < CURVE_STUDENTS);
  const kept = cut < 0 ? at : at.slice(0, cut);
  // An error rate of 0 has no logarithm: half an error is added to each point (and a whole answer to its count).
  const errors = kept.map((p) => (p.wrong + 0.5) / (p.n + 1));
  const xs = errors.map((_, i) => Math.log(i + 1)), ys = errors.map(Math.log);
  const mx = xs.reduce((s, x) => s + x, 0) / xs.length, my = ys.reduce((s, y) => s + y, 0) / ys.length;
  const sxy = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0), sxx = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  const syy = ys.reduce((s, y) => s + (y - my) ** 2, 0);
  const slope = sxx ? sxy / sxx : 0;
  const r2 = syy ? (sxy * sxy) / (sxx * syy) : 1;
  return { errors, b: -slope, r2, smooth: errors.length >= 3 && slope < 0 && r2 >= SMOOTH_R2 };
}

/**
 * Test 3, transfer: practice on one form of the idea should help with its other forms. Two logistic models predict
 * each answer from its form and from earlier practice, counted once over every form (one idea) and once over the
 * answer's own form only (as many ideas as forms); they have as many weights each, so the one that fits the answers
 * better (higher log-likelihood) is the better account (Learning Factors Analysis, Cen, Koedinger & Junker 2006).
 */
export function transfers(attempts: readonly Attempt[], node: string) {
  const ops = opportunities(attempts, node);
  const forms = [...new Set(ops.map(({ a }) => a.form ?? ""))];
  const y = ops.map(({ a }) => (a.right ? 1 : 0));
  const fit = (practice: (o: (typeof ops)[number]) => number) => {
    const X = ops.map((o) => [...forms.map((f) => ((o.a.form ?? "") === f ? 1 : 0)), Math.log(1 + practice(o))]);
    const w = fitLogistic(X, y);
    return X.reduce((s, x, r) => {
      const p = 1 / (1 + Math.exp(-x.reduce((t, xi, i) => t + xi * w[i], 0)));
      return s + Math.log(Math.min(1 - 1e-9, Math.max(1e-9, y[r] ? p : 1 - p)));
    }, 0);
  };
  const shared = fit((o) => o.before), separate = fit((o) => o.beforeSameForm);
  return { forms, shared, separate, transfers: shared >= separate };
}
