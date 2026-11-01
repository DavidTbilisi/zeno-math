// A concept's inside, as a graph. The skills are what the curriculum orders; each one is
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
import { orderTree, orderValue, type OrderMode, type OrderNode } from "../math/orderOps.ts";
import type { Exercise, StepForm } from "../math/practice.ts";
import type { RoundSolution } from "../math/roundPics.ts";
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

const inGraphOrder = (nodes: ReadonlySet<FractionsNode>) => (Object.keys(FRACTIONS.nodes) as FractionsNode[]).filter((k) => nodes.has(k));

/**
 * The ideas a question asking for one idea of fractions alone needs (FractionForm in practice.ts), from the form and
 * its numbers: a missing top needs equivalent and the product that scales it; lowest terms needs lowest and the common
 * factor; the lowest common denominator needs commonDenom and the multiple; a reciprocal needs reciprocal, and of a
 * mixed number toImproper too; the conversions need toImproper or toMixed, the only question that asks for toMixed.
 * The steps of an operation (stepsOf in practice.ts) are read the same way, with the operation's own step once the
 * fractions are ready for it: tops added or taken over one denominator need addSub; tops times tops need multiply and
 * the two products, and after a division divide too.
 */
function formIdeas(form: StepForm, a: string, b: string | null): Set<FractionsNode> {
  const nodes = new Set<FractionsNode>(["part"]);
  const times = (x: number, y: number) => product(x, y).forEach((n) => nodes.add(n));
  const mixed = (s: string) => {
    const x = improper(s);
    if (x.mixed) (nodes.add("toImproper").add("addWhole"), times(x.whole, x.d));
  };
  switch (form) {
    case "equivalent": {
      const x = improper(a), y = improper(b!);
      nodes.add("equivalent");
      times(x.n, y.d / x.d);
      break;
    }
    case "lowest":
      nodes.add("lowest").add("equivalent").add("hcf").add("divideExact");
      break;
    case "lcd": {
      const x = improper(a), y = improper(b!);
      nodes.add("commonDenom").add("lcm");
      times(x.d / gcd(x.d, y.d), y.d);
      break;
    }
    case "reciprocal":
      nodes.add("reciprocal");
      if (a.includes("/")) mixed(a);
      break;
    case "toImproper":
      mixed(a);
      break;
    case "toMixed":
      nodes.add("toMixed");
      break;
    case "addTops":
      nodes.add("addSub").add("addWhole");
      break;
    case "timesTops":
    case "divideTops": {
      const x = improper(a), y = improper(b!);
      nodes.add("multiply");
      if (form === "divideTops") nodes.add("divide");
      (times(x.n, y.n), times(x.d, y.d));
      break;
    }
  }
  return nodes;
}

/**
 * The ideas a fractions question needs. An operation is read from its worked solution: the operation, whether a number
 * is mixed, and whether the usual method (over the lowest common denominator; tops times tops) leaves a result to be
 * simplified; and the whole-number arithmetic each step of that method does (every product, sum, common multiple and
 * common factor). A question asking for one idea alone is read by formIdeas.
 */
export function fractionsUses(ex: Exercise): Uses<FractionsNode> {
  const spec = ex.solution?.spec as { form?: StepForm; op: "+" | "-" | "×" | "÷"; a: string; b: string };
  if (spec.form) return usesOf(FRACTIONS, inGraphOrder(formIdeas(spec.form, spec.a, spec.b)));
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
  return usesOf(FRACTIONS, inGraphOrder(nodes));
}

/** The idea or connection each fractions mistake shows is missing. */
export const FRACTIONS_GAPS: Partial<Record<MistakeId, FractionsNode | EdgeId>> = {
  // 1/5 + 2/5 answered 3/10: adding the bottoms as well, not knowing what adding fractions means.
  addAcross: "addSub",
  // 1/2 ÷ 3/4 answered 3/2: knowing to flip, but not which number dividing multiplies by the reciprocal of.
  flipFirst: "reciprocal→divide",
  // 3/4 = ?/12 answered 11: the same number added to top and bottom, not knowing what keeps a fraction's value.
  addedToBoth: "equivalent",
  // 2 3/4 answered 10/4: the whole multiplied by the top, not knowing what the whole is made of.
  wholeTimesTop: "toImproper",
};

// ---------- beyond fractions (issue #265) ----------
// The skills whose recognised mistakes were shown to the student and then lost: signed numbers, powers, brackets,
// order of operations and rounding. Each has a few ideas of its own on the arithmetic below it, and shares an idea with
// another where the two ask the same thing (the sign of a product, a power worked out, the index laws). Every mistake
// their questions recognise names the idea it shows is missing, in the *_GAPS tables after the graphs.

/** Signed numbers (the integers skill): four ideas of their own on whole-number arithmetic. */
export const SIGNED = {
  nodes: {
    negLine: "numbers below zero: counting on and back past zero, as on a number line",
    addNeg: "adding a negative number takes its size away: 5 + (−3) = 5 − 3",
    minusNeg: "taking a negative number away adds its size: 5 − (−3) = 5 + 3",
    signTimes: "multiplying or dividing signed numbers: like signs give plus, unlike signs minus",
    ...ARITHMETIC.nodes,
  },
  edges: [
    ["negLine", "addNeg", "needs"],
    ["negLine", "minusNeg", "needs"],
    ...ARITHMETIC.edges,
    ["addWhole", "negLine", "needs"],
    ["multiplyFacts", "signTimes", "needs"],
    ["divideExact", "signTimes", "joins"],
  ],
} as const satisfies ConceptGraph;
export type SignedNode = keyof typeof SIGNED.nodes;

/** Powers (the indices skill): a power worked out, and the three laws the questions ask for. */
export const POWERS = {
  nodes: {
    powValue: "a power is a number multiplied by itself: 2⁵ = 2 × 2 × 2 × 2 × 2",
    powLaws: "powers of one number multiply by adding their indices and divide by taking them away",
    negIndex: "a negative index is one over the power: 2⁻³ = 1/2³, not −8",
    fracIndex: "a fractional index is a root, then a power: 8^(2/3) is the cube root of 8, squared",
    ...ARITHMETIC.nodes,
  },
  edges: [
    ["powValue", "powLaws", "needs"],
    ["powValue", "negIndex", "needs"],
    ["powValue", "fracIndex", "needs"],
    ["negIndex", "fracIndex", "joins"],
    ...ARITHMETIC.edges,
    ["multiplyFacts", "powValue", "needs"],
    ["multiplyLong", "powValue", "joins"],
    ["addWhole", "powLaws", "needs"],
  ],
} as const satisfies ConceptGraph;
export type PowersNode = keyof typeof POWERS.nodes;

/** Brackets (the expand skill): a number times a bracket, two brackets, a bracket squared; and the signs inside. */
export const BRACKETS = {
  nodes: {
    distribute: "a number times a bracket multiplies every term inside: 3(x + 2) = 3x + 6",
    twoBrackets: "two brackets multiply each term of one by each term of the other, then like terms are collected",
    squareBracket: "a bracket squared is the bracket times itself: (x + 3)² = x² + 6x + 9, not x² + 9",
    signTimes: SIGNED.nodes.signTimes,
    ...ARITHMETIC.nodes,
  },
  edges: [
    ["distribute", "twoBrackets", "joins"],
    ["twoBrackets", "squareBracket", "needs"],
    ["signTimes", "twoBrackets", "joins"],
    ...ARITHMETIC.edges,
    ["multiplyFacts", "distribute", "needs"],
    ["multiplyFacts", "twoBrackets", "needs"],
    ["addWhole", "twoBrackets", "needs"],
    ["multiplyFacts", "signTimes", "needs"],
  ],
} as const satisfies ConceptGraph;
export type BracketsNode = keyof typeof BRACKETS.nodes;

/** Order of operations: the four rules the questions turn on, on the arithmetic each step does. */
export const ORDER = {
  nodes: {
    bracketsFirst: "brackets first: what is inside a bracket is worked out before what is around it",
    powFirst: "powers before multiplying: 3 × 2² is 3 × 4, not 6²",
    mulFirst: "multiplying and dividing before adding and taking away: 2 + 3 × 4 is 14",
    chainLeft: "a chain of the same kind is worked from the left: 9 − 4 − 2 is 3, not 7",
    powValue: POWERS.nodes.powValue,
    negLine: SIGNED.nodes.negLine,
    signTimes: SIGNED.nodes.signTimes,
    ...ARITHMETIC.nodes,
  },
  edges: [
    ["mulFirst", "powFirst", "needs"],
    ["bracketsFirst", "mulFirst", "joins"],
    ["powValue", "powFirst", "needs"],
    ["multiplyFacts", "mulFirst", "needs"],
    ["addWhole", "chainLeft", "needs"],
    ...ARITHMETIC.edges,
    ["multiplyFacts", "powValue", "needs"],
    ["addWhole", "negLine", "needs"],
    ["multiplyFacts", "signTimes", "needs"],
  ],
} as const satisfies ConceptGraph;
export type OrderIdea = keyof typeof ORDER.nodes;

/** Rounding: to a place, keeping a whole number's size, significant figures, standard form and bounds. */
export const ROUNDING = {
  nodes: {
    roundPlace: "rounding to a place: the next digit alone decides, and 5 or more rounds up",
    placeHolders: "a whole number rounded keeps its size: zeros hold the places, so 4372 to the nearest hundred is 4400",
    sigFigs: "significant figures count from the first digit that isn't 0",
    stdForm: "standard form: a number from 1 up to 10, times a power of ten",
    bounds: "a rounded number could have been up to half a unit either way",
    powLaws: POWERS.nodes.powLaws,
    ...ARITHMETIC.nodes,
  },
  edges: [
    ["roundPlace", "placeHolders", "joins"],
    ["roundPlace", "sigFigs", "needs"],
    ["roundPlace", "bounds", "needs"],
    ["powLaws", "stdForm", "joins"],
    ...ARITHMETIC.edges,
    ["addWhole", "powLaws", "needs"],
  ],
} as const satisfies ConceptGraph;
export type RoundingNode = keyof typeof ROUNDING.nodes;

/**
 * Every idea of every graph, each once, in the order the app lists them: fractions' (with arithmetic's) first, then
 * each later graph's own. An idea is one thing wherever it is used, so a student has one P(known) for each.
 */
export const IDEAS = { ...FRACTIONS.nodes, ...SIGNED.nodes, ...POWERS.nodes, ...BRACKETS.nodes, ...ORDER.nodes, ...ROUNDING.nodes };
export type IdeaNode = keyof typeof IDEAS;

const inOrderOf = <N extends string>(g: ConceptGraph<N>, nodes: ReadonlySet<string>): Uses<N> => usesOf(g, (Object.keys(g.nodes) as N[]).filter((n) => nodes.has(n)));
/** The ideas working out bⁿ by multiplying needs: each product on the way (2³ is 2 × 2, then 4 × 2). */
const powerIdeas = (b: number, n: number): string[] => {
  if (n < 2 || Math.abs(b) === 1) return [];
  const out = ["powValue"];
  for (let j = 2; j <= n; j++) out.push(...product(b ** (j - 1), b));
  return out;
};

/**
 * The ideas a signed-numbers question needs, read from its working (src): × and ÷ first, each needing the sign rule
 * when a number is negative, then the sums from the left. Adding a negative number needs addNeg, taking one away
 * minusNeg, and a sum that starts, passes or ends below zero needs the number line below it.
 */
export function signedUses(ex: Exercise): Uses<SignedNode> {
  const nodes = new Set<string>();
  const toks = ex.src!.split(" ");
  const val = (t: string) => Number(t.replace(/[()]/g, ""));
  const terms = [{ v: val(toks[0]), op: "+" }];
  for (let i = 1; i < toks.length; i += 2) {
    const [op, v] = [toks[i], val(toks[i + 1])], last = terms.at(-1)!;
    if (op === "+" || op === "-") {
      terms.push({ v, op });
      continue;
    }
    if (last.v < 0 || v < 0) nodes.add("signTimes");
    if (op === "*") product(last.v, v).forEach((n) => nodes.add(n));
    else nodes.add("divideExact");
    last.v = op === "*" ? last.v * v : last.v / v;
  }
  let run = terms[0].v;
  for (const t of terms.slice(1)) {
    nodes.add("addWhole");
    if (t.v < 0) nodes.add(t.op === "+" ? "addNeg" : "minusNeg");
    const next = run + (t.op === "+" ? t.v : -t.v);
    if (run < 0 || next < 0) nodes.add("negLine");
    run = next;
  }
  return inOrderOf(SIGNED, nodes);
}

/**
 * The ideas a powers question needs, read from its source: powers of one number multiplied and divided need the laws
 * and the sum of the indices; a negative index needs negIndex, a fractional one fracIndex and the root it takes; and
 * each power worked out needs the products on the way.
 */
export function powersUses(ex: Exercise): Uses<PowersNode> {
  const nodes = new Set<string>();
  const src = (ex.solution?.spec as { src: string }).src;
  const add = (ids: string[]) => ids.forEach((n) => nodes.add(n));
  /** A root and a power of it: the d-th root of x, to the n. */
  const rootPower = (x: number, n: number, d: number) => {
    const k = Math.round(x ** (1 / d));
    (add(powerIdeas(k, d)), add(powerIdeas(k, n)));
  };
  let m: RegExpExecArray | null;
  if ((m = /^(\d+)\^(\d+) \* \d+\^(\d+) \/ \d+\^(\d+)$/.exec(src))) {
    const [a, i, j, k] = m.slice(1).map(Number);
    (nodes.add("powLaws").add("addWhole"), add(powerIdeas(a, i + j - k)));
  } else if ((m = /^(\d+)\^\(-(\d+)\)$/.exec(src))) (nodes.add("negIndex"), add(powerIdeas(Number(m[1]), Number(m[2]))));
  else if ((m = /^(\d+)\^\((\d+)\/(\d+)\)$/.exec(src))) (nodes.add("fracIndex"), rootPower(Number(m[1]), Number(m[2]), Number(m[3])));
  else if ((m = /^\((\d+)\/(\d+)\)\^\(-(\d+)\/(\d+)\)$/.exec(src))) {
    const [P, Q, n, d] = m.slice(1).map(Number);
    (nodes.add("negIndex").add("fracIndex"), rootPower(P, n, d), rootPower(Q, n, d));
  } else throw new Error(`not a powers question: ${src}`);
  return inOrderOf(POWERS, nodes);
}

/** The terms of a polynomial as written ("2x^2 - 3x + 4"): each coefficient with its power of x. */
const termsOf = (s: string) => s.replace(/ - /g, " + -").split(" + ").map((t) => {
  const [, minus, c, x, p] = /^(-?)(\d*)(x(?:\^(\d+))?)?$/.exec(t)!;
  const size = c ? Number(c) : 1;
  return { c: minus ? -size : size, p: x ? Number(p ?? 1) : 0 };
});
/**
 * The ideas an expanding question needs, read from its source: every term of one bracket times every term of the
 * other, then like terms collected; a bracket squared needs squareBracket too, and a number in front distribute and
 * its products. A product with a negative number needs the sign rule.
 */
export function bracketsUses(ex: Exercise): Uses<BracketsNode> {
  const nodes = new Set<string>(["twoBrackets", "addWhole"]);
  const eq = (ex.solution?.spec as { eq: string }).eq;
  const times = (x: number, y: number) => {
    if (x < 0 || y < 0) nodes.add("signTimes");
    product(x, y).forEach((n) => nodes.add(n));
  };
  const brackets = [...eq.matchAll(/\(([^()]*)\)/g)].map((b) => termsOf(b[1]));
  const square = eq.endsWith("^2");
  if (square) nodes.add("squareBracket");
  const [f, g] = square ? [brackets[0], brackets[0]] : brackets;
  const out = new Map<number, number>();
  for (const x of f) for (const y of g) (times(x.c, y.c), out.set(x.p + y.p, (out.get(x.p + y.p) ?? 0) + x.c * y.c));
  const k = /^(-?\d+)\(/.exec(eq);
  if (k) {
    nodes.add("distribute");
    for (const c of out.values()) if (c) times(Number(k[1]), c);
  }
  return inOrderOf(BRACKETS, nodes);
}

/** Whether working src the way of a mistake gives another answer, as the order generator lays its traps. */
const orderDiffers = (src: string, mode: OrderMode) => {
  const right = orderValue(orderTree(src, "right")), t = orderValue(orderTree(src, mode));
  return Number.isFinite(t) && Math.abs(t - right) > 1e-9;
};
/**
 * The ideas an order-of-operations question needs, read from its working (src): a rule is needed where working without
 * it gives another answer (the generator's traps are those answers), brackets wherever there are any; and each step
 * done the right way needs its arithmetic, below zero the number line, a negative number multiplied the sign rule.
 */
export function orderUses(ex: Exercise): Uses<OrderIdea> {
  const src = ex.src!;
  const nodes = new Set<string>();
  if (src.includes("(")) nodes.add("bracketsFirst");
  if (orderDiffers(src, "leftToRight")) nodes.add("mulFirst");
  if (/\* (\d+|\([^()]*\)) \^/.test(src) && orderDiffers(src, "mulBeforePow")) nodes.add("powFirst");
  if (orderDiffers(src, "grouped")) nodes.add("chainLeft");
  const work = (n: OrderNode): number => {
    if ("v" in n) return n.v;
    const [l, r] = [work(n.l), work(n.r)];
    const v = n.op === "+" ? l + r : n.op === "-" ? l - r : n.op === "*" ? l * r : n.op === "/" ? l / r : l ** r;
    if (n.op === "+" || n.op === "-") {
      nodes.add("addWhole");
      if (l < 0 || r < 0 || v < 0) nodes.add("negLine");
    } else if (n.op === "^") powerIdeas(l, r).forEach((x) => nodes.add(x));
    else {
      if (l < 0 || r < 0) nodes.add("signTimes");
      if (n.op === "*") product(l, r).forEach((x) => nodes.add(x));
      else nodes.add("divideExact");
    }
    return v;
  };
  work(orderTree(src, "right"));
  return inOrderOf(ORDER, nodes);
}

/** The first significant digit of a number: 400 → 4, 0.3 → 3. */
const leading = (v: number) => Math.round(v / 10 ** Math.floor(Math.log10(Math.abs(v))));
/**
 * The ideas a rounding question needs, read from its worked picture: rounding to a place needs the digit that decides,
 * a whole number rounded to tens or more the zeros that hold its places, to significant figures where they start;
 * standard form, and multiplying in it the index law and the product of the numbers; an estimate each number to one
 * significant figure and the product of their first digits; bounds half a unit, and for a total the product.
 */
export function roundingUses(ex: Exercise): Uses<RoundingNode> {
  const nodes = new Set<string>();
  const add = (ids: string[]) => ids.forEach((n) => nodes.add(n));
  const spec = ex.solution?.spec as RoundSolution;
  switch (spec.pic) {
    case "round":
      nodes.add("roundPlace");
      if (spec.k < 0) nodes.add("placeHolders");
      if (spec.sf) nodes.add("sigFigs");
      break;
    case "estimate":
      nodes.add("roundPlace").add("sigFigs");
      add(product(leading(spec.x1), leading(spec.y1)));
      break;
    case "std":
      nodes.add("stdForm");
      break;
    case "stdMul":
      nodes.add("stdForm").add("powLaws").add("addWhole");
      add(product(Math.round(Number(spec.a) * 10), Math.round(Number(spec.b) * 10)));
      break;
    case "bound":
      nodes.add("bounds");
      break;
    case "boundTotal":
      nodes.add("bounds");
      add(product(spec.n, spec.x));
      break;
  }
  return inOrderOf(ROUNDING, nodes);
}

/** The idea each signed-numbers mistake shows is missing. */
export const SIGNED_GAPS: Partial<Record<MistakeId, SignedNode>> = {
  // 3 − (−5) answered −2: the negative taken away as if it were positive.
  subNeg: "minusNeg",
};
/** The idea each powers mistake shows is missing. */
export const POWERS_GAPS: Partial<Record<MistakeId, PowersNode>> = {
  // 2⁻³ answered −8 (or (2/3)⁻² as 4/9): the minus taken for a sign, not one over the power.
  negPower: "negIndex",
  // 8^(2/3) answered 16/3: the base times the index, not a root and a power.
  powTimes: "fracIndex",
};
/** The idea each expanding mistake shows is missing. */
export const BRACKETS_GAPS: Partial<Record<MistakeId, BracketsNode>> = {
  // (x + 2)(x + 3) answered x² + 6: firsts times firsts and lasts times lasts, the cross products left out.
  noMiddle: "twoBrackets",
  // (2x + 3)² answered 4x² + 9: each term squared, not the bracket times itself.
  squareTerms: "squareBracket",
};
/** The idea each order-of-operations mistake shows is missing. */
export const ORDER_GAPS: Partial<Record<MistakeId, OrderIdea>> = {
  // 2 + 3 × 4 answered 20: worked from the left, adding before multiplying.
  leftToRight: "mulFirst",
  // 3 × 2² answered 36: multiplied before the power.
  mulBeforePow: "powFirst",
  // 9 − 4 − 2 answered 7: a chain grouped from the right.
  grouped: "chainLeft",
};
/** The idea each rounding mistake shows is missing. */
export const ROUNDING_GAPS: Partial<Record<MistakeId, RoundingNode>> = {
  // 3.47 to 1 decimal place answered 3.4: digits cut off, never rounded up.
  truncated: "roundPlace",
  // 3.447 to 1 decimal place answered 3.5: rounded a place at a time from the last digit, not by the next digit alone.
  doubleRound: "roundPlace",
  // 4372 to the nearest hundred answered 44: the zeros that hold the places dropped.
  placeLost: "placeHolders",
  // the upper bound of 7 cm to the nearest cm answered 8: a whole unit, not half.
  fullUnit: "bounds",
};
/** Every mistake that names an idea, from every graph's table; no mistake is in two. */
export const GAPS: Partial<Record<MistakeId, IdeaNode | EdgeId>> = { ...FRACTIONS_GAPS, ...SIGNED_GAPS, ...POWERS_GAPS, ...BRACKETS_GAPS, ...ORDER_GAPS, ...ROUNDING_GAPS };

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
