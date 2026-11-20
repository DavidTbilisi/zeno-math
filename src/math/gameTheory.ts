// Game theory as a degree's elective teaches it (Osborne, An Introduction to Game Theory; Luce & Raiffa, Games and
// Decisions), after the linear programmes of src/math/optimisation.ts: best responses, pure Nash equilibria and the
// iterated removal of dominated strategies in a game in normal form; saddle points, mixed equilibria by
// indifference and the value of a zero-sum game; backward induction in a game tree and the Stackelberg duopoly. The
// words, and the exact maths the answers are made of; the questions are in
// src/math/skills/{normalForm,mixedNash,backwardInduction}.ts.
import { Frac } from "./fraction";

/** The words of these questions (the locale's `gt` block). */
export type GameWords = {
  prompt: {
    rowBest: string;
    colBest: string;
    pureNash: string;
    iterated: string;
    saddle: string;
    zeroSumMix: string;
    zeroSumValue: string;
    mixRow: string;
    mixCol: string;
    tree: string;
    stackLeader: string;
    stackFollower: string;
    stackPrice: string;
  };
};

export const F = (n: number, d = 1) => new Frac(n, d);
export const ROWS = ["U", "M", "D"] as const;
export const COLS = ["L", "C", "R"] as const;

/** A game in normal form: a[i][j] is Row's payoff and b[i][j] Column's when Row plays i and Column j. */
export type Game = { a: number[][]; b: number[][] };

/** The indices where xs is largest. */
export const argmaxes = (xs: number[]) => xs.flatMap((x, i) => (x === Math.max(...xs) ? [i] : []));
/** The index where xs is largest, or null when it is not alone there. */
export const argmax = (xs: number[]) => (argmaxes(xs).length === 1 ? argmaxes(xs)[0] : null);
const column = (m: number[][], j: number) => m.map((row) => row[j]);

/** Row's best responses to Column's strategy j, and Column's to Row's strategy i. */
export const rowBest = (g: Game, j: number) => argmaxes(column(g.a, j));
export const colBest = (g: Game, i: number) => argmaxes(g.b[i]);
/** The cells where each strategy is a best response to the other. */
export const pureNash = (g: Game): [number, number][] =>
  g.a.flatMap((row, i) => row.flatMap((_, j) => (rowBest(g, j).includes(i) && colBest(g, i).includes(j) ? [[i, j] as [number, number]] : [])));

/** One removal of a strictly dominated strategy: whose (0 Row, 1 Column), which, and by which. */
export type Removal = { who: 0 | 1; out: number; by: number };
/** Iterated removal of strictly dominated pure strategies, Row first in each round; the strategies left. */
export function iterated(g: Game): { rows: number[]; cols: number[]; removed: Removal[] } {
  let rows = g.a.map((_, i) => i);
  let cols = g.a[0].map((_, j) => j);
  const removed: Removal[] = [];
  const beats = (u: (k: number, l: number) => number, k: number, l: number, against: number[]) => against.every((x) => u(k, x) > u(l, x));
  for (;;) {
    const pair = (mine: number[], against: number[], u: (k: number, l: number) => number) => {
      for (const out of mine) for (const by of mine) if (by !== out && beats(u, by, out, against)) return { out, by };
      return null;
    };
    const r = pair(rows, cols, (i, j) => g.a[i][j]);
    if (r) {
      removed.push({ who: 0, ...r });
      rows = rows.filter((i) => i !== r.out);
      continue;
    }
    const c = pair(cols, rows, (j, i) => g.b[i][j]);
    if (c) {
      removed.push({ who: 1, ...c });
      cols = cols.filter((j) => j !== c.out);
      continue;
    }
    return { rows, cols, removed };
  }
}

/** Row's guaranteed payoff in a zero-sum game m (what Column pays Row), and Column's guaranteed ceiling. */
export const maximin = (m: number[][]) => Math.max(...m.map((row) => Math.min(...row)));
export const minimax = (m: number[][]) => Math.min(...m[0].map((_, j) => Math.max(...column(m, j))));
/** The slips: the smallest row maximum, and the largest column minimum. */
export const minOfRowMaxima = (m: number[][]) => Math.min(...m.map((row) => Math.max(...row)));
export const maxOfColumnMinima = (m: number[][]) => Math.max(...m[0].map((_, j) => Math.min(...column(m, j))));

/** In a 2 × 2 game, the probability p of Row's first strategy that leaves Column indifferent (from Column's payoffs b). */
export const mixRow = (b: number[][]) => F(b[1][1] - b[1][0], b[0][0] - b[1][0] - b[0][1] + b[1][1]);
/** The probability q of Column's first strategy that leaves Row indifferent (from Row's payoffs a). */
export const mixCol = (a: number[][]) => F(a[1][1] - a[0][1], a[0][0] - a[0][1] - a[1][0] + a[1][1]);
/** The value of a 2 × 2 zero-sum game with no saddle point. */
export const zeroSumValue = (m: number[][]) => F(m[0][0] * m[1][1] - m[0][1] * m[1][0], m[0][0] - m[0][1] - m[1][0] + m[1][1]);
/** −(the game made zero-sum): Column's payoffs when Column pays Row m. */
export const negate = (m: number[][]) => m.map((row) => row.map((x) => -x));

/** A game tree: a leaf with the payoffs of players 1 and 2, or a node where player 0 or 1 picks a move. */
export type Tree = { pay: [number, number] } | { who: 0 | 1; moves: [string, Tree][] };
/** How a mover picks among the payoffs its moves lead to: the index of the move. */
export type Chooser = (who: 0 | 1, outcomes: [number, number][]) => number;

/** The payoffs a tree ends in when every mover picks by choose; the choices, deepest first, are pushed to log. */
export function solve(t: Tree, choose: Chooser, log: { path: string[]; move: string; outcomes: [number, number][]; who: 0 | 1 }[] = [], path: string[] = []): [number, number] {
  if ("pay" in t) return t.pay;
  const outcomes = t.moves.map(([m, sub]) => solve(sub, choose, log, [...path, m]));
  const k = choose(t.who, outcomes);
  log.push({ path, move: t.moves[k][0], outcomes, who: t.who });
  return outcomes[k];
}
/** Each mover takes their own best payoff: the subgame-perfect equilibrium. */
export const selfish: Chooser = (who, outs) => outs.map((o) => o[who]).indexOf(Math.max(...outs.map((o) => o[who])));
/** Every mover takes what is best for player p (the other player helps p). */
export const helping = (p: 0 | 1): Chooser => (_, outs) => outs.map((o) => o[p]).indexOf(Math.max(...outs.map((o) => o[p])));
/** p takes its best payoff, the other player the worst for p (as if the game were zero-sum). */
export const hostile = (p: 0 | 1): Chooser => (who, outs) =>
  who === p ? helping(p)(who, outs) : outs.map((o) => o[p]).indexOf(Math.min(...outs.map((o) => o[p])));
/** True when every mover of the tree has a single best move. */
export function strict(t: Tree): boolean {
  if ("pay" in t) return true;
  const own = t.moves.map(([, sub]) => solve(sub, selfish)[t.who]);
  return new Set(own).size === own.length && t.moves.every(([, sub]) => strict(sub));
}
/** Every leaf of a tree with the moves that lead to it. */
export const leaves = (t: Tree, path: string[] = []): [string[], [number, number]][] =>
  "pay" in t ? [[path, t.pay]] : t.moves.flatMap(([m, sub]) => leaves(sub, [...path, m]));
