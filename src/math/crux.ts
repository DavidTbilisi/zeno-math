// Find the crux (issue #583): a problem worked in three steps or more, the steps shown by what they ask and their
// answers hidden, and the player taps the step it all hinges on, the one that makes the rest routine. Then the steps
// are shown worked, the crux lit, with a line on why it is the crux. Later puzzles show the steps scrambled and ask for
// the crux first, then the order they are worked in. Two sets, each a game with its own ladder: the hard bar-model word
// problems (barProblems.ts, whose questions record their crux: the gap before a gift that makes two amounts equal, the
// leftover and the shortage together, the extra taken away to leave equal units, and with them k times with a total,
// k + 1 units), and equations with x twice (the linear skill's x on both sides and its bracket, and a bracket with
// another x on the same side), whose crux is the move that leaves x in one place only. Kept free of React; the words
// are the locale's.
import { barQuestion, type BarForm, type BarQuestion, type BarStep } from "./barProblems";
import type { EndlessGame, GameLevel, TryGame } from "./ladder";
import { rngOf } from "./practiceKit";
import type { PracticeWords, Rng } from "./practiceTypes";
import { old as linearGen } from "./skills/linear";
import { coeffsOf, num, sideOf } from "./whichTool";

export const CRUX_GROUPS = ["word", "eq"] as const;
export type CruxGroup = (typeof CRUX_GROUPS)[number];
/** The live piece each set is. */
export const CRUX_PIECES = { word: "cruxWord", eq: "cruxEq" } as const;
/** The word problems worked in three steps or more: the hard forms, and k times with a total. */
export const CRUX_FORMS = ["times", "give", "leftShort", "three"] as const satisfies readonly BarForm[];
export type CruxForm = (typeof CRUX_FORMS)[number];
/** The equations: x on both sides; a bracket, then x on both sides; a bracket and another x on the same side. */
export const EQ_KINDS = ["both", "brackets", "same"] as const;
export type EqKind = (typeof EQ_KINDS)[number];
export const CRUX_KINDS = { word: CRUX_FORMS, eq: EQ_KINDS } as const;
export type CruxKind = CruxForm | EqKind;

// ---------- equations ----------

const MINUS = "−";
/** A term of a side: its number, and whether it is an x term. */
export type Term = readonly [c: number, x: 0 | 1];
export type Side = readonly Term[];
export type Equation = readonly [Side, Side];
/** A side as written, its zero terms left out ("0" when nothing is left). */
export function sideText(side: Side): string {
  const terms = side.filter(([c]) => c !== 0);
  if (!terms.length) return "0";
  return terms
    .map(([c, x], i) => {
      const body = x ? (Math.abs(c) === 1 ? "x" : `${Math.abs(c)}x`) : `${Math.abs(c)}`;
      return i === 0 ? (c < 0 ? `${MINUS}${body}` : body) : ` ${c < 0 ? MINUS : "+"} ${body}`;
    })
    .join("");
}
export const eqText = ([l, r]: Equation) => `${sideText(l)} = ${sideText(r)}`;
/** A side's value at x. */
export const sideAt = (side: Side, x: number) => side.reduce((s, [c, isX]) => s + (isX ? c * x : c), 0);
/** How many x terms an equation has, over both sides. */
export const xTerms = ([l, r]: Equation) => [...l, ...r].filter(([c, x]) => x && c !== 0).length;
const xTerm = (c: number) => (c === 1 ? "x" : `${c}x`);
const signed = (v: number) => (v < 0 ? ` ${MINUS} ${-v}` : ` + ${v}`);

/** What a step of an equation does: multiply out, take an x term from both sides, put the x's together, take or add a number, divide. */
export type EqAct = "expand" | "collectBoth" | "collectSide" | "take" | "add" | "divide";

// ---------- the steps ----------

/** A step of a problem: what it asks (a word problem's step, or its answer) and the amount it finds. */
export type BarCruxStep = { ask: BarStep["ask"] | "answer"; v: number; needs: number[] };
/** A step of an equation: what it does (with the term or number it does it with) and the equation it leaves. */
export type EqCruxStep = { act: EqAct; n: string; eq: Equation; needs: number[] };
export type CruxStep = BarCruxStep | EqCruxStep;
export const isBarStep = (s: CruxStep): s is BarCruxStep => "ask" in s;

export type CruxProblem = {
  group: CruxGroup;
  kind: CruxKind;
  /** In the order they are worked; each names the steps it needs done before it (`needs`). */
  steps: CruxStep[];
  /** The step it all hinges on. */
  crux: number;
  /** The numbers its words and its why use. */
  vars: Record<string, number>;
  bar?: BarQuestion;
  /** The equation as written (a bracket kept), to solve for x (in `vars`). */
  show?: string;
};

/** Each word problem's steps (its own and then its answer), and the steps each needs first: leftover and shortage's two can go either way. */
const BAR_NEEDS: Record<CruxForm, number[][]> = {
  times: [[], [0], [1]],
  give: [[], [0], [1]],
  three: [[], [0], [1]],
  leftShort: [[], [], [0, 1]],
};
/** The numbers a word problem's why uses: its own, the answer, the amounts found on the way. */
function barCruxVars(q: BarQuestion): Record<string, number> {
  const v = q.vars;
  return { ...v, v: q.v, ...(q.form === "three" ? { e: v.t - v.d } : {}), ...(q.form === "times" ? { m: v.k + 1 } : {}), ...(q.form === "leftShort" ? { ls: v.l + v.s } : {}) };
}
/**
 * A word problem of a form; with `noise`, one with a sentence the answer doesn't use. Leftover and shortage with a
 * share that grows by more than one, so its last step is a division of its own.
 */
export function cruxWord(form: CruxForm, r: Rng, noise = false): CruxProblem {
  let q = barQuestion(form, r.next);
  while ((noise && !q.noise) || (form === "leftShort" && q.vars.e < 2)) q = barQuestion(form, r.next);
  const needs = BAR_NEEDS[form];
  const steps: BarCruxStep[] = [...q.steps.map((s, i) => ({ ask: s.ask, v: s.v, needs: needs[i] })), { ask: "answer", v: q.v, needs: needs[q.steps.length] }];
  return { group: "word", kind: form, steps, crux: q.crux, vars: barCruxVars(q), bar: q };
}

/**
 * From a x + p = c x + q (a ≠ c), the steps that solve it: the x term with less taken from both sides (the crux: x
 * is left in one place), the number beside it taken or added, and the division. Null when one of them would not be
 * there (no number beside x, one x left) or x is not a whole number.
 */
function collectSteps(a: number, p: number, c: number, q: number, from: number): EqCruxStep[] | null {
  const left = a > c;
  const k = Math.abs(a - c);
  const [m, rest] = left ? [p, q] : [q, p];
  if (m === 0 || k < 2 || (rest - m) % k !== 0 || rest === m) return null;
  const x = (rest - m) / k;
  const xSide: Side = [[k, 1], [m, 0]];
  const flip = (xs: Side, other: Side): Equation => (left ? [xs, other] : [other, xs]);
  return [
    { act: "collectBoth", n: xTerm(left ? c : a), eq: flip(xSide, [[rest, 0]]), needs: from > 0 ? [from - 1] : [] },
    { act: m > 0 ? "take" : "add", n: `${Math.abs(m)}`, eq: flip([[k, 1]], [[rest - m, 0]]), needs: [from] },
    { act: "divide", n: `${k}`, eq: [[[1, 1]], [[x, 0]]], needs: [from + 1] },
  ];
}
const NO_WORDS = { prompts: {}, formulae: {} } as unknown as PracticeWords;
const linearEq = (r: Rng, level: 2 | 3) => (linearGen(r, level, NO_WORDS).solution?.spec as { eq: string }).eq.split("=");

/** An equation of a kind, the first `r` makes that has every step (and a whole x). */
export function cruxEq(kind: EqKind, r: Rng): CruxProblem {
  for (;;) {
    if (kind === "both") {
      // The linear skill's medium question: a x + b = c x + d.
      const [left, right] = linearEq(r, 2);
      const [b, a] = sideOf(left);
      const [d, c] = sideOf(right);
      const steps = collectSteps(a, b, c, d, 0);
      if (!steps) continue;
      const x = sideAt(steps[2].eq[1], 0);
      return { group: "eq", kind, steps, crux: 0, vars: { a, b, c, d, x }, show: eqText([[[a, 1], [b, 0]], [[c, 1], [d, 0]]]) };
    }
    if (kind === "brackets") {
      // The linear skill's hard question: a(x + b) = c x + d; multiplying out first is routine.
      const [left, right] = linearEq(r, 3);
      const m = /^(\d+)\((.*)\)$/.exec(left.trim());
      if (!m) throw new Error(`not a bracket: ${left}`);
      const [a, b] = [Number(m[1]), coeffsOf(m[2])[0]];
      const [d, c] = sideOf(right);
      const rest = collectSteps(a, a * b, c, d, 1);
      if (!rest) continue;
      const expanded: Equation = [[[a, 1], [a * b, 0]], [[c, 1], [d, 0]]];
      const x = sideAt(rest[2].eq[1], 0);
      return { group: "eq", kind, steps: [{ act: "expand", n: "", eq: expanded, needs: [] }, ...rest], crux: 1, vars: { a, b, c, d, x }, show: `${a}(x${signed(b)}) = ${sideText([[c, 1], [d, 0]])}` };
    }
    // a(x + b) + c x = d: multiply out, then the x's put together leave x once.
    const [a, b, c, x] = [r.int(2, 5), r.nz(-6, 6), r.int(1, 5), r.nz(-9, 9)];
    const k = a + c;
    const d = k * x + a * b;
    if (d === a * b) continue;
    const expanded: Equation = [[[a, 1], [a * b, 0], [c, 1]], [[d, 0]]];
    const steps: EqCruxStep[] = [
      { act: "expand", n: "", eq: expanded, needs: [] },
      { act: "collectSide", n: "", eq: [[[k, 1], [a * b, 0]], [[d, 0]]], needs: [0] },
      { act: a * b > 0 ? "take" : "add", n: `${Math.abs(a * b)}`, eq: [[[k, 1]], [[d - a * b, 0]]], needs: [1] },
      { act: "divide", n: `${k}`, eq: [[[1, 1]], [[x, 0]]], needs: [2] },
    ];
    return { group: "eq", kind, steps, crux: 1, vars: { a, b, c, d, x }, show: `${a}(x${signed(b)}) + ${xTerm(c)} = ${num(d)}` };
  }
}

/** A problem of a kind, made with `r`. */
export function cruxProblem(group: CruxGroup, kind: CruxKind, r: Rng, noise = false): CruxProblem {
  return group === "word" ? cruxWord(kind as CruxForm, r, noise) : cruxEq(kind as EqKind, r);
}

/** The order the steps are worked in: each after the ones it needs. */
export const validOrder = (p: CruxProblem, order: readonly number[]) =>
  order.length === p.steps.length && new Set(order).size === order.length && order.every((s, i) => p.steps[s]?.needs.every((n) => order.slice(0, i).includes(n)));

// ---------- rounds ----------

export type CruxSpec = { kinds: readonly CruxKind[]; scrambled: boolean; noise?: boolean };
/** A puzzle: the problem, and its steps in the order they stand (each place a step's index). */
export type CruxTask = { group: CruxGroup; scrambled: boolean; problem: CruxProblem; order: number[] };

/**
 * A puzzle of a spec: a problem of one of its kinds, its steps in the order they are worked (leftover and shortage the
 * one with the share first, so its crux is not first) or, scrambled, in an order they cannot be worked in.
 */
export function cruxTask(group: CruxGroup, spec: CruxSpec, r: Rng): CruxTask {
  const problem = cruxProblem(group, r.pick(spec.kinds), r, spec.noise);
  const n = problem.steps.length;
  const worked = problem.kind === "leftShort" ? [1, 0, 2] : Array.from({ length: n }, (_, i) => i);
  if (!spec.scrambled) return { group, scrambled: false, problem, order: worked };
  for (;;) {
    const order = worked.map((s) => [r.next(), s] as const).sort((p, q) => p[0] - q[0]).map(([, s]) => s);
    if (!validOrder(problem, order)) return { group, scrambled: true, problem, order };
  }
}

/** Each set's ladder: the first puzzles in order, a form or kind at a time, then scrambled, the crux first and then the order. */
export const CRUX_LADDERS: Record<CruxGroup, (CruxSpec & { seed: number })[]> = {
  word: [
    { kinds: ["times"], scrambled: false, seed: 5831 },
    { kinds: ["give"], scrambled: false, seed: 5832 },
    { kinds: ["leftShort"], scrambled: false, seed: 5833 },
    { kinds: ["three"], scrambled: true, seed: 5834 },
    { kinds: ["give", "leftShort"], scrambled: true, seed: 5835 },
    { kinds: CRUX_FORMS, scrambled: true, noise: true, seed: 5836 },
  ],
  eq: [
    { kinds: ["both"], scrambled: false, seed: 5837 },
    { kinds: ["same"], scrambled: false, seed: 5838 },
    { kinds: ["brackets"], scrambled: false, seed: 5839 },
    { kinds: ["both"], scrambled: true, seed: 5840 },
    { kinds: ["same", "brackets"], scrambled: true, seed: 5841 },
    { kinds: EQ_KINDS, scrambled: true, seed: 5842 },
  ],
};
/** The endless run: in order; scrambled; scrambled with a sentence the answer doesn't use, or four steps. */
export function levelSpec(group: CruxGroup, level: GameLevel): CruxSpec {
  const kinds = CRUX_KINDS[group];
  if (level === 1) return { kinds, scrambled: false };
  if (level === 2) return { kinds, scrambled: true };
  return group === "word" ? { kinds, scrambled: true, noise: true } : { kinds: ["brackets", "same"], scrambled: true };
}

// ---------- the board's state ----------

export type CruxNotice = "hidden" | "clean" | "streak10";
export const CRUX_NOTICES: CruxNotice[] = ["hidden", "clean", "streak10"];
/** What the line says: a step that is not the crux, one tapped before a step it needs, the crux found (the order next). */
export type CruxSaid = { kind: "notCrux"; tile: number } | { kind: "early"; tile: number } | { kind: "found" };
export type LiveCrux = EndlessGame<CruxNotice, GameLevel, CruxSaid> &
  TryGame & {
    group: CruxGroup;
    /** The places tapped right: the crux first, then (scrambled) the steps in the order they are worked. */
    ops: number[];
  };
export const cruxStart = (group: CruxGroup): LiveCrux => ({ group, mode: "puzzle", stage: 0, level: 1, seed: 1, ops: [], misses: 0, done: false, streak: 0, said: null });

export function cruxNow(d: Pick<LiveCrux, "group" | "mode" | "stage" | "level" | "seed">): CruxTask {
  if (d.mode === "puzzle") {
    const s = CRUX_LADDERS[d.group][d.stage] ?? CRUX_LADDERS[d.group][0];
    return cruxTask(d.group, s, rngOf(s.seed));
  }
  return cruxTask(d.group, levelSpec(d.group, d.level), rngOf(d.seed));
}

/** How far a puzzle has gone: whether the crux is found, the steps put in order so far (their indices), and whether it is done. */
export type CruxMachine = { task: CruxTask; found: boolean; placed: number[]; done: boolean };
export function replay(task: CruxTask, ops: readonly number[]): CruxMachine {
  const found = ops.length > 0;
  const placed = ops.slice(1).map((at) => task.order[at]);
  return { task, found, placed, done: found && (!task.scrambled || placed.length === task.order.length) };
}

export type CruxCheck = { ok: true } | { ok: false; why: "notCrux" | "early" } | null;
/** A tap on a place: the crux (while it is being looked for), the next step in order, or not; null for one that does nothing (already placed, or done). */
export function checkTap(m: CruxMachine, at: number): CruxCheck {
  const s = m.task.order[at];
  if (m.done || s === undefined) return null;
  if (!m.found) return s === m.task.problem.crux ? { ok: true } : { ok: false, why: "notCrux" };
  if (m.placed.includes(s)) return null;
  return m.task.problem.steps[s].needs.every((n) => m.placed.includes(n)) ? { ok: true } : { ok: false, why: "early" };
}
/** The taps that do it without a slip: the crux, then (scrambled) the steps in the order they are worked. */
export function bestOps(task: CruxTask): number[] {
  const at = (s: number) => task.order.indexOf(s);
  const crux = at(task.problem.crux);
  if (!task.scrambled) return [crux];
  const worked = task.problem.kind === "leftShort" ? [1, 0, 2] : task.problem.steps.map((_, i) => i);
  return [crux, ...worked.map(at)];
}

/** No miss: three stars; one: two; more: one. */
export const cruxStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);

/** What a puzzle finished showed: ten clean in a row; a scrambled one, crux and order, without a slip; a crux that was not the first step, found first time. */
export function cruxNotice(m: CruxMachine, misses: number, streak: number): CruxNotice | null {
  if (streak === 10) return "streak10";
  if (misses > 0) return null;
  if (m.task.scrambled) return "clean";
  return m.task.order.indexOf(m.task.problem.crux) > 0 ? "hidden" : null;
}
