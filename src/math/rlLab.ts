// The reinforcement-learning lab. A Markov chain first: weather moving between sunny, cloudy and rainy by a matrix of
// chances; stepped again and again, the shares settle to the long-run distribution, the same from any start (the
// eigenvector of the matrix for eigenvalue 1). Then a grid world, a Markov decision process: states are cells, actions
// are moves, rewards wait in some cells, and a reward t steps away is worth γᵗ of itself now. Value iteration sweeps
// V(s) = max over moves of (reward + γ·V(next)), spreading the rewards back one step a sweep; the best move in each
// cell is the policy. Q-learning learns the same by trial and error, with no map: it moves (at random with chance ε,
// else the best it knows), and nudges Q(s, a) towards reward + γ·max Q(next). Kept free of React so it can be tested
// on its own.
import type { GameBase } from "./ladder";
import { rng } from "./random";
import { nf } from "./text";

// ---------- a Markov chain ----------

export const CHAIN: number[][] = [
  [0.7, 0.2, 0.1],
  [0.3, 0.4, 0.3],
  [0.2, 0.3, 0.5],
];
/** One step: the shares after, π·P. */
export const stepChain = (pi: number[], P = CHAIN) => P[0].map((_, j) => pi.reduce((s, p, i) => s + p * P[i][j], 0));
/** The long-run shares: stepped until they stop moving. */
export function stationary(P = CHAIN): number[] {
  let pi = P.map(() => 1 / P.length);
  for (let i = 0; i < 500; i++) pi = stepChain(pi, P);
  return pi;
}
export const chainAfter = (start: number[], k: number) => {
  let pi = start;
  for (let i = 0; i < k; i++) pi = stepChain(pi);
  return pi;
};

// ---------- a grid world ----------

/** A cell: open, a wall, or a reward that ends the walk. */
export type Cell = { kind: "open" } | { kind: "wall" } | { kind: "end"; reward: number };
export type World = { w: number; h: number; cells: Cell[]; start: number };
const O: Cell = { kind: "open" };
const X: Cell = { kind: "wall" };
const E = (reward: number): Cell => ({ kind: "end", reward });
export const WORLDS = {
  maze: { w: 5, h: 4, start: 15, cells: [O, O, O, O, E(10), O, X, X, O, E(-10), O, O, O, O, O, O, O, X, O, O] },
  near: { w: 6, h: 3, start: 12, cells: [O, O, O, O, O, E(10), O, X, X, X, X, O, O, O, E(1), X, X, O] },
} satisfies Record<string, World>;
export type WorldId = keyof typeof WORLDS;
export type Move = 0 | 1 | 2 | 3;
export const MOVES: Move[] = [0, 1, 2, 3];
const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];
/** Where a move from a cell leads: a wall or the edge leaves the walker where it was. */
export function next(world: World, s: number, a: Move): number {
  const [x, y] = [(s % world.w) + DX[a], Math.floor(s / world.w) + DY[a]];
  if (x < 0 || y < 0 || x >= world.w || y >= world.h) return s;
  const t = y * world.w + x;
  return world.cells[t].kind === "wall" ? s : t;
}
const rewardOf = (world: World, t: number) => {
  const c = world.cells[t];
  return c.kind === "end" ? c.reward : 0;
};
const ends = (world: World, s: number) => world.cells[s].kind === "end";
/** One sweep of value iteration: V(s) = max over moves of (reward on arrival + γ·V(next)), V = 0 at the ends. */
export function sweep(world: World, V: number[], gamma: number): number[] {
  return V.map((_, s) => (ends(world, s) || world.cells[s].kind === "wall" ? 0 : Math.max(...MOVES.map((a) => rewardOf(world, next(world, s, a)) + gamma * V[next(world, s, a)]))));
}
export const sweeps = (world: World, gamma: number, n: number) => {
  let V = world.cells.map(() => 0);
  for (let i = 0; i < n; i++) V = sweep(world, V, gamma);
  return V;
};
/** The best move in a cell by its values (the first of equals), or by Q. */
export const greedyV = (world: World, V: number[], gamma: number, s: number): Move =>
  MOVES.reduce((best, a) => (rewardOf(world, next(world, s, a)) + gamma * V[next(world, s, a)] > rewardOf(world, next(world, s, best)) + gamma * V[next(world, s, best)] + 1e-12 ? a : best), 0 as Move);
export const greedyQ = (Q: number[][], s: number): Move => MOVES.reduce((best, a) => (Q[s][a] > Q[s][best] + 1e-12 ? a : best), 0 as Move);
/** The walk a policy takes from the start (at most 30 moves): the cells, and the reward it ends with (0 if it never ends). */
export function walk(world: World, policy: (s: number) => Move): { path: number[]; reward: number } {
  const path = [world.start];
  let s = world.start;
  for (let i = 0; i < 30 && !ends(world, s); i++) {
    s = next(world, s, policy(s));
    if (path.includes(s) && !ends(world, s)) {
      path.push(s);
      return { path, reward: 0 };
    }
    path.push(s);
  }
  return { path, reward: ends(world, s) ? rewardOf(world, s) : 0 };
}
export const ALPHA = 0.5;
export const Q_GAMMA = 0.9;
/** Episodes of Q-learning from the start: each move random with chance ε (else the best known), Q(s, a) nudged by α
 * towards reward + γ·max Q(next); an episode ends at an end cell or after 60 moves. */
export function qEpisodes(world: World, Q: number[][], eps: number, n: number, seed: number): number[][] {
  const q = Q.map((r) => [...r]);
  const r = rng(seed * 61 + 7);
  for (let e = 0; e < n; e++) {
    let s = world.start;
    for (let i = 0; i < 60 && !ends(world, s); i++) {
      const a: Move = r() < eps ? (Math.floor(r() * 4) as Move) : greedyQ(q, s);
      const t = next(world, s, a);
      const target = rewardOf(world, t) + (ends(world, t) ? 0 : Q_GAMMA * Math.max(...q[t]));
      q[s][a] += ALPHA * (target - q[s][a]);
      s = t;
    }
  }
  return q;
}
export const emptyQ = (world: World) => world.cells.map(() => [0, 0, 0, 0]);

// ---------- the puzzles ----------

export type RlView = "chain" | "values" | "q";
export type RlGoal = { kind: "settled"; tol: number } | { kind: "reach"; reward: number };
export type RlControl = "step" | "start" | "sweep" | "gamma" | "episodes" | "eps";
export type RlNotice = "chain" | "sweep" | "discount" | "explore";
export const RL_NOTICES: RlNotice[] = ["chain", "sweep", "discount", "explore"];
export type RlPuzzle = { view: RlView; world: WorldId; start: Partial<LiveRl>; controls: RlControl[]; goal: RlGoal; notice: RlNotice };
const BASE: Partial<LiveRl> = { pi: [1, 0, 0], chainSteps: 0, history: [[1, 0, 0]], sweeps: 0, gamma: 0.9, Q: null, episodes: 0, eps: 0 };
export const RL_LADDER: RlPuzzle[] = [
  { view: "chain", world: "maze", start: { ...BASE }, controls: ["step", "start"], goal: { kind: "settled", tol: 0.01 }, notice: "chain" },
  { view: "values", world: "maze", start: { ...BASE }, controls: ["sweep"], goal: { kind: "reach", reward: 10 }, notice: "sweep" },
  { view: "values", world: "near", start: { ...BASE, gamma: 0.5, sweeps: 30 }, controls: ["gamma"], goal: { kind: "reach", reward: 10 }, notice: "discount" },
  { view: "q", world: "maze", start: { ...BASE }, controls: ["episodes", "eps"], goal: { kind: "reach", reward: 10 }, notice: "explore" },
];
export const GAMMAS = [0.1, 0.3, 0.5, 0.7, 0.8, 0.9, 0.95, 0.99];
export const EPSILONS = [0, 0.05, 0.1, 0.2, 0.3, 0.5, 1];
export const EPISODES = 10;

export type RlSlip = "notSettled" | "noReach" | "wrongEnd";
export type RlVerdict = { state: "won" } | { state: "lost"; why: RlSlip; have: number; want: number };

/** The game's state: the chain's shares (and their history), how many sweeps of value iteration have been made, γ,
 * the Q table after the episodes run (null: none yet) and ε; free play's view and world. */
export type LiveRl = GameBase<RlNotice, { kind: "wrong"; why: RlSlip }> & {
  mode: "puzzle" | "free";
  pi: number[];
  chainSteps: number;
  history: number[][];
  sweeps: number;
  gamma: number;
  Q: number[][] | null;
  episodes: number;
  eps: number;
  view: RlView;
  world: WorldId;
  tries: number;
  done: boolean;
};
export const RL_START: LiveRl = { mode: "puzzle", stage: 0, pi: [1, 0, 0], chainSteps: 0, history: [[1, 0, 0]], sweeps: 0, gamma: 0.9, Q: null, episodes: 0, eps: 0, view: "chain", world: "maze", tries: 0, done: false, said: null };
export const rlPuzzle = (d: Pick<LiveRl, "mode" | "stage">) => (d.mode === "puzzle" ? RL_LADDER[d.stage] : null);
export const viewOf = (d: LiveRl): RlView => rlPuzzle(d)?.view ?? d.view;
export const worldOf = (d: LiveRl): World => WORLDS[rlPuzzle(d)?.world ?? d.world];
export const controlsOf = (d: LiveRl): RlControl[] => rlPuzzle(d)?.controls ?? { chain: ["step", "start"], values: ["sweep", "gamma"], q: ["episodes", "eps"] }[d.view] as RlControl[];
export const rlStars = (tries: number) => (tries === 0 ? 3 : tries === 1 ? 2 : 1);
/** The values shown: the sweeps made (the discount puzzle keeps them run to the end for any γ). */
export const valuesOf = (d: LiveRl) => sweeps(worldOf(d), d.gamma, d.sweeps);
/** The walk the state's policy takes. */
export function walkOf(d: LiveRl) {
  const world = worldOf(d);
  if (viewOf(d) === "q") {
    const Q = d.Q ?? emptyQ(world);
    return walk(world, (s) => greedyQ(Q, s));
  }
  const V = valuesOf(d);
  return walk(world, (s) => greedyV(world, V, d.gamma, s));
}

export function judgeRl(d: LiveRl, g: RlGoal): RlVerdict {
  const lost = (why: RlSlip, have: number, want: number): RlVerdict => ({ state: "lost", why, have, want });
  switch (g.kind) {
    case "settled": {
      const gap = Math.max(...stationary().map((p, i) => Math.abs(p - d.pi[i])));
      return gap <= g.tol ? { state: "won" } : lost("notSettled", gap, g.tol);
    }
    case "reach": {
      const r = walkOf(d).reward;
      return r === g.reward ? { state: "won" } : r ? lost("wrongEnd", r, g.reward) : lost("noReach", 0, g.reward);
    }
  }
}

// ---------- the picture ----------

export const RL_PLOT = { w: 640, h: 400 };
const BLUE = "#1971c2";
const ORANGE = "#e8590c";
const GREEN = "#2f9e44";
const RED = "#e03131";
const GREY = "#868e96";
const INK = "#1e1e1e";
const r2 = (v: number) => Math.round(v * 100) / 100;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
type TextStyle = { size?: number; fill?: string; bold?: boolean; anchor?: "start" | "middle" | "end" };
const txt = (x: number, y: number, s: string, o: TextStyle = {}) =>
  `<text x="${r2(x)}" y="${r2(y)}" font-size="${o.size ?? 12}" fill="${o.fill ?? "#495057"}"${o.bold ? ` font-weight="700"` : ""}${o.anchor ? ` text-anchor="${o.anchor}"` : ""}>${esc(s)}</text>`;
export const num = (v: number) => (Number.isFinite(v) ? nf(v, 2).replace("-", "−") : "—");
const tint = (hex: string, a: number) => `rgb(${[1, 3, 5].map((i) => Math.round(255 - (255 - parseInt(hex.slice(i, i + 2), 16)) * a)).join(",")})`;
const STATE_COLOURS = [ORANGE, GREY, BLUE];

export type RlWords = { states: readonly string[]; shares: string; history: string; steps: string; sweeps: string; episodes: string; values: string; qvalues: string; policy: string; start: string };

function chainSvg(d: LiveRl, w: RlWords): string {
  // The three states in a triangle with their chances, the shares as bars, and each share over the steps.
  const pos: [number, number][] = [[150, 70], [70, 220], [230, 220]];
  let s = "";
  const arc = (i: number, j: number) => {
    const [a, b] = [pos[i], pos[j]];
    const [mx, my] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const [nx, ny] = [-(b[1] - a[1]) / 10, (b[0] - a[0]) / 10];
    const [cx, cy] = [mx + nx, my + ny];
    return `<path d="M${a[0]} ${a[1]} Q${r2(cx)} ${r2(cy)} ${b[0]} ${b[1]}" fill="none" stroke="#ced4da" stroke-width="${r2(1 + 5 * CHAIN[i][j])}"/>` + txt(mx + nx * 0.9, my + ny * 0.9 + 4, nf(CHAIN[i][j], 2), { anchor: "middle", size: 10.5, fill: INK });
  };
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (i !== j) s += arc(i, j);
  pos.forEach(([x, y], i) => {
    s += `<circle cx="${x}" cy="${y}" r="${r2(18 + 26 * d.pi[i])}" fill="${tint(STATE_COLOURS[i], 0.25 + 0.6 * d.pi[i])}" stroke="${INK}" stroke-width="1.5"/>`;
    s += txt(x, y + 4, w.states[i], { anchor: "middle", bold: true, fill: INK, size: 12 }) + txt(x, y + (i ? 64 : -46), `${nf(CHAIN[i][i], 2)} ↺`, { anchor: "middle", size: 10.5, fill: GREY });
  });
  // The shares, and their history.
  const L = 330;
  s += txt(L, 30, w.shares, { bold: true, size: 13 });
  d.pi.forEach((p, i) => {
    const y = 44 + i * 30;
    s += txt(L, y + 13, w.states[i], { bold: true, fill: INK });
    s += `<rect x="${L + 80}" y="${y + 2}" width="180" height="14" fill="#f1f3f5"/><rect x="${L + 80}" y="${y + 2}" width="${r2(180 * p)}" height="14" fill="${STATE_COLOURS[i]}"/>`;
    s += txt(L + 266, y + 14, nf(p, 3), { bold: true, size: 11 });
  });
  const box = { left: L, top: 160, w: 290, h: 170 };
  s += txt(L, box.top - 8, w.history, { bold: true, size: 12.5 });
  s += `<rect x="${box.left}" y="${box.top}" width="${box.w}" height="${box.h}" fill="#fff" stroke="#dee2e6"/>`;
  const n = Math.max(2, d.history.length);
  const X = (t: number) => box.left + 8 + ((box.w - 16) * t) / (n - 1);
  const Y = (p: number) => box.top + box.h - 6 - (box.h - 12) * p;
  [0, 1, 2].forEach((i) => (s += `<polyline points="${d.history.map((h, t) => `${r2(X(t))},${r2(Y(h[i]))}`).join(" ")}" fill="none" stroke="${STATE_COLOURS[i]}" stroke-width="2.2"/>`));
  s += txt(box.left + box.w, box.top + box.h + 14, w.steps.replace("{n}", String(d.chainSteps)), { anchor: "end", size: 10.5, fill: GREY });
  return s;
}

const ARROWS = ["↑", "→", "↓", "←"];
function gridSvg(d: LiveRl, w: RlWords): string {
  const world = worldOf(d);
  const q = viewOf(d) === "q";
  const Q = d.Q ?? emptyQ(world);
  const V = q ? Q.map((r) => Math.max(...r)) : valuesOf(d);
  const cell = Math.min(380 / world.w, 300 / world.h);
  const [L, T] = [24, 40];
  const top = Math.max(1e-9, ...V.map(Math.abs));
  let s = txt(L, T - 14, q ? w.qvalues : w.values, { bold: true, size: 13 });
  const route = walkOf(d);
  world.cells.forEach((c, i) => {
    const [x, y] = [L + (i % world.w) * cell, T + Math.floor(i / world.w) * cell];
    const fill = c.kind === "wall" ? "#495057" : c.kind === "end" ? (c.reward > 0 ? tint(GREEN, 0.55) : tint(RED, 0.55)) : V[i] ? tint(V[i] > 0 ? GREEN : RED, 0.08 + 0.5 * (Math.abs(V[i]) / top)) : "#fff";
    s += `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(cell)}" height="${r2(cell)}" fill="${fill}" stroke="#ced4da"/>`;
    if (c.kind === "end") s += txt(x + cell / 2, y + cell / 2 + 6, c.reward > 0 ? `+${c.reward}` : String(c.reward).replace("-", "−"), { anchor: "middle", size: 18, bold: true, fill: INK });
    else if (c.kind === "open") {
      s += txt(x + cell / 2, y + cell - 8, num(V[i]), { anchor: "middle", size: 11, fill: INK });
      const best = q ? greedyQ(Q, i) : greedyV(world, V, d.gamma, i);
      if (V[i] || q) s += txt(x + cell / 2, y + cell / 2 + 2, ARROWS[best], { anchor: "middle", size: 20, fill: q && !Math.max(...Q[i].map(Math.abs)) ? "#ced4da" : INK });
      if (i === world.start) s += txt(x + 6, y + 14, w.start, { size: 10.5, bold: true, fill: BLUE });
    }
  });
  // The walk the policy takes from the start.
  const centre = (i: number) => [L + (i % world.w) * cell + cell / 2, T + Math.floor(i / world.w) * cell + cell / 2];
  s += `<polyline points="${route.path.map((i) => centre(i).map(r2).join(",")).join(" ")}" fill="none" stroke="${BLUE}" stroke-width="3" stroke-dasharray="2 6" stroke-linecap="round"/>`;
  s += `<circle cx="${r2(centre(world.start)[0])}" cy="${r2(centre(world.start)[1])}" r="6" fill="${BLUE}"/>`;
  // Beside it, what has been done.
  const S = 430;
  s += txt(S, T, w.policy, { bold: true, size: 12.5 });
  s += txt(S, T + 20, q ? `ε = ${d.eps}, γ = ${Q_GAMMA}, α = ${ALPHA}` : `γ = ${d.gamma}`, { size: 11.5 });
  s += txt(S, T + 40, (q ? w.episodes : w.sweeps).replace("{n}", String(q ? d.episodes : d.sweeps)), { size: 11.5 });
  s += txt(S, T + 70, route.reward ? `→ ${route.reward > 0 ? "+" : "−"}${Math.abs(route.reward)}` : "→ …", { size: 22, bold: true, fill: route.reward > 0 ? GREEN : route.reward < 0 ? RED : GREY });
  return s;
}

/** The chain (its states, the shares and their history) or the grid world (values, the best moves and the walk from the start). */
export const rlSvg = (d: LiveRl, w: RlWords) => (viewOf(d) === "chain" ? chainSvg(d, w) : gridSvg(d, w));
