// Guess my rule: a machine that does the same to every number put in — adds, multiplies, or multiplies and adds — and
// the rule to find from what comes out. Easy: one step (n + 7, 4n); medium: two (3n + 2, 5n − 4), asked for a number
// too big to try; hard: two steps, and half the time backwards (what went in to make 47?). Finding the rule is the
// first step of algebra: the same thing done to any number. Two slips are named: doubling what goes in taken to
// double what comes out (10 ↦ 2 × 17 when 5 ↦ 17), and undoing the steps in the wrong order (47 ÷ 3 − 2).
import { rng } from "./random";
import type { EndlessGame, TryGame } from "./ladder";

export type MachineLevel = 1 | 2 | 3;
/** out = mul × in + add. */
export type Rule = { mul: number; add: number };
/** The rule, and the question: what comes out for `n`, or what went in to make `out`. */
export type MachineTask = { level: MachineLevel; rule: Rule; ask: { dir: "out"; n: number } | { dir: "in"; out: number } };

export const apply = (r: Rule, n: number) => r.mul * n + r.add;
/** What went in to make `out`: take off what is added, then divide. */
export const undo = (r: Rule, out: number) => (out - r.add) / r.mul;
/** The numbers the board's machine takes. */
export const INPUTS = Array.from({ length: 11 }, (_, k) => k);

export function machineRule(level: MachineLevel, next: () => number): Rule {
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  if (level === 1) return next() < 0.5 ? { mul: 1, add: int(2, 12) } : { mul: int(2, 10), add: 0 };
  for (;;) {
    const mul = int(2, level === 2 ? 5 : 9);
    const add = level === 2 ? int(-5, 9) : int(-9, 12);
    if (add !== 0) return { mul, add };
  }
}
export function machineTask(level: MachineLevel, next: () => number): MachineTask {
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const rule = machineRule(level, next);
  if (level === 1) return { level, rule, ask: { dir: "out", n: int(15, 60) } };
  if (level === 2) return { level, rule, ask: { dir: "out", n: int(12, 30) } };
  return next() < 0.5 ? { level, rule, ask: { dir: "out", n: 100 } } : { level, rule, ask: { dir: "in", out: apply(rule, int(11, 30)) } };
}
/** The answer to the task's question. */
export const machineAnswer = (t: MachineTask) => (t.ask.dir === "out" ? apply(t.rule, t.ask.n) : undo(t.rule, t.ask.out));

/** The rule in LaTeX, as n ↦ 3n + 2. */
export function ruleTex(r: Rule): string {
  const m = r.mul === 1 ? "n" : `${r.mul}n`;
  return r.add === 0 ? m : `${m} ${r.add < 0 ? "-" : "+"} ${Math.abs(r.add)}`;
}
const signed = (k: number) => (k < 0 ? `- ${-k}` : `+ ${k}`);

// ---------- the practice question ----------

/** The pairs shown, the question and the slips it can catch. */
export type RuleQuestion = MachineTask & { shown: number[] };
/**
 * A table of four pairs and the question: easy, a one-step rule and what comes out for 10, 15 or 20 (5 is shown);
 * medium, two steps and 20 to 100 (10 is shown); hard, two steps backwards.
 */
export function ruleQuestion(level: MachineLevel, next: () => number): RuleQuestion {
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const rule = machineRule(level, next);
  if (level === 1) return { level, rule, shown: [1, 2, 3, 5], ask: { dir: "out", n: 5 * int(2, 4) } };
  if (level === 2) return { level, rule, shown: [1, 2, 3, 10], ask: { dir: "out", n: [20, 30, 50, 100][int(0, 3)] } };
  return { level, rule, shown: [1, 2, 3, 4], ask: { dir: "in", out: apply(rule, int(6, 20)) } };
}
/** The pairs and the question in LaTeX: 1 ↦ 5, 2 ↦ 8, …, 20 ↦ ?. */
export const ruleTable = (q: RuleQuestion) =>
  [...q.shown.map((n) => `${n} \\mapsto ${apply(q.rule, n)}`), q.ask.dir === "out" ? `${q.ask.n} \\mapsto \\;?` : `? \\mapsto ${q.ask.out}`].join(", \\quad ");
/** The working: the step between outputs, the rule, then the answer from it. */
export function ruleSteps(q: MachineTask): string[] {
  const r = q.rule;
  const lines = [`n \\mapsto ${ruleTex(r)}`];
  if (q.ask.dir === "out") lines.push(`${q.ask.n} \\mapsto ${r.mul === 1 ? q.ask.n : `${r.mul} \\times ${q.ask.n}`}${r.add ? ` ${signed(r.add)}` : ""} = ${apply(r, q.ask.n)}`);
  else {
    const n = undo(r, q.ask.out);
    lines.push(`${ruleTex(r)} = ${q.ask.out}`, `${r.mul === 1 ? "n" : `${r.mul}n`} = ${q.ask.out} ${signed(-r.add)} = ${q.ask.out - r.add}`);
    if (r.mul !== 1) lines.push(`n = ${q.ask.out - r.add} \\div ${r.mul} = ${n}`);
  }
  return lines;
}
/** Doubling what goes in taken to double what comes out: k × out(m) for k × m, when something is added. */
export function scaledOutput(q: RuleQuestion): { v: number; m: number; k: number; o: number } | null {
  if (q.ask.dir !== "out" || q.rule.add === 0) return null;
  const m = q.shown[q.shown.length - 1];
  const k = q.ask.n / m;
  return Number.isInteger(k) && k > 1 ? { v: k * apply(q.rule, m), m, k, o: apply(q.rule, m) } : null;
}
/** The steps undone in the wrong order: out ÷ mul − add. */
export function undoOrder(q: RuleQuestion): number | null {
  if (q.ask.dir !== "in" || q.rule.mul === 1 || q.rule.add === 0) return null;
  const v = q.ask.out / q.rule.mul - q.rule.add;
  return Math.abs(v - undo(q.rule, q.ask.out)) > 1e-9 ? v : null;
}

// ---------- the board's game ----------

export const MACHINE_LADDER: { level: MachineLevel; seed: number }[] = [
  { level: 1, seed: 401 },
  { level: 1, seed: 405 },
  { level: 1, seed: 409 },
  { level: 2, seed: 427 },
  { level: 2, seed: 412 },
  { level: 2, seed: 413 },
  { level: 3, seed: 421 },
  { level: 3, seed: 424 },
  { level: 3, seed: 437 },
];
/** Stars: right first time three, after one miss two, else one. */
export const machineStars = (misses: number) => (misses === 0 ? 3 : misses === 1 ? 2 : 1);
export type MachineNotice = "zero" | "fewTries" | "backwards" | "streak10";
export const MACHINE_NOTICES: MachineNotice[] = ["zero", "fewTries", "backwards", "streak10"];
/**
 * What a right answer shows: 0 put in (out comes what is added), right first time after only two numbers tried, a
 * backwards question right first time, ten right first time in a row.
 */
export function machineNotice(t: MachineTask, tried: number[], misses: number, streak: number): MachineNotice | null {
  if (streak === 10) return "streak10";
  if (misses === 0 && t.ask.dir === "in") return "backwards";
  if (misses === 0 && tried.length <= 2 && t.rule.mul !== 1 && t.rule.add !== 0) return "fewTries";
  if (tried.includes(0) && t.rule.add !== 0) return "zero";
  return null;
}
export type LiveMachine = EndlessGame<MachineNotice, MachineLevel, { kind: "wrong"; v: number }> &
  TryGame & {
    /** The numbers put in, in the order they were. */
    tried: number[];
    /** The answer as typed so far. */
    typed: string;
  };
export const machineNow = (d: Pick<LiveMachine, "mode" | "stage" | "level" | "seed">): MachineTask =>
  d.mode === "puzzle" ? machineTask(MACHINE_LADDER[d.stage].level, rng(MACHINE_LADDER[d.stage].seed)) : machineTask(d.level, rng(d.seed));

/** A typed whole number, with a minus sign at the front, or null. */
export const readWhole = (s: string): number | null => (/^\s*[-−]?\d{1,6}\s*$/.test(s) ? Number(s.trim().replace("−", "-")) : null);
