// The reinforcement-learning lab: the chain's step keeping shares adding to 1 and settling to the same long run from
// any start (a left eigenvector for eigenvalue 1), moves blocked by walls and edges, value iteration's sweeps, the
// discount choosing the near or the far reward, Q-learning finding the goal only when it explores, every puzzle
// unsolved at its start and won by what it asks, each miss told apart, and the picture.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CHAIN,
  chainAfter,
  controlsOf,
  emptyQ,
  greedyQ,
  greedyV,
  judgeRl,
  next,
  qEpisodes,
  RL_LADDER,
  RL_START,
  rlSvg,
  stationary,
  stepChain,
  sweeps,
  walk,
  WORLDS,
  type LiveRl,
} from "../src/math/rlLab.ts";

const words = { states: ["sunny", "cloudy", "rainy"], shares: "shares", history: "history", steps: "{n} days", sweeps: "{n} sweeps", episodes: "{n} episodes", values: "values", qvalues: "q", policy: "policy", start: "start" };
const puzzle = (i: number, change: Partial<LiveRl> = {}): LiveRl => ({ ...RL_START, stage: i, ...RL_LADDER[i].start, ...change });
const won = (d: LiveRl) => judgeRl(d, RL_LADDER[d.stage].goal).state === "won";
const close = (a: number, b: number, e = 1e-9) => Math.abs(a - b) < e;

test("the chain: shares add up to 1 and settle to the same long run from any start", () => {
  const pi = stepChain([1, 0, 0]);
  assert.deepEqual(pi, CHAIN[0]);
  assert.ok(close(chainAfter([0.2, 0.3, 0.5], 4).reduce((a, b) => a + b, 0), 1));
  const s = stationary();
  assert.ok(stepChain(s).every((v, i) => close(v, s[i])), "a step leaves it where it is: π P = π");
  for (const start of [[1, 0, 0], [0, 0, 1]]) assert.ok(chainAfter(start, 40).every((v, i) => close(v, s[i], 1e-6)));
});

test("moves, value iteration and the discount", () => {
  const m = WORLDS.maze;
  assert.equal(next(m, 15, 3), 15, "the edge holds the walker");
  assert.equal(next(m, 16, 1), 16, "so does a wall");
  assert.equal(next(m, 15, 0), 10);
  const V = sweeps(m, 0.9, 30);
  assert.ok(close(V[3], 10) && close(V[2], 9), "one step from +10 is worth 10, two steps 0.9 × 10");
  assert.equal(V[4], 0, "an end cell has no value of its own");
  assert.equal(walk(m, (s) => greedyV(m, V, 0.9, s)).reward, 10);
  assert.equal(walk(m, () => 0).reward, 0, "walking into the top edge forever ends nowhere");
  const n = WORLDS.near;
  assert.equal(walk(n, (s) => greedyV(n, sweeps(n, 0.5, 30), 0.5, s)).reward, 1, "impatient: the near +1");
  assert.equal(walk(n, (s) => greedyV(n, sweeps(n, 0.9, 30), 0.9, s)).reward, 10, "patient: the far +10");
});

test("Q-learning finds the goal only when it explores", () => {
  const m = WORLDS.maze;
  const run = (eps: number, rounds: number) => {
    let Q = emptyQ(m);
    for (let e = 0; e < rounds; e++) Q = qEpisodes(m, Q, eps, 10, e + 1);
    return walk(m, (s) => greedyQ(Q, s)).reward;
  };
  assert.equal(run(0, 5), 0);
  assert.equal(run(0.3, 3), 10);
  assert.deepEqual(qEpisodes(m, emptyQ(m), 0.3, 5, 2), qEpisodes(m, emptyQ(m), 0.3, 5, 2), "a seed gives the same episodes");
});

test("every puzzle is unsolved at its start and won by what it asks", () => {
  RL_LADDER.forEach((_, i) => assert.ok(!won(puzzle(i)), `puzzle ${i + 1} starts unsolved`));
  assert.ok(won(puzzle(0, { pi: chainAfter([1, 0, 0], 8) })));
  assert.ok(!won(puzzle(1, { sweeps: 2 })) && won(puzzle(1, { sweeps: 7 })));
  assert.ok(won(puzzle(2, { gamma: 0.9 })));
  let Q = emptyQ(WORLDS.maze);
  for (let e = 0; e < 3; e++) Q = qEpisodes(WORLDS.maze, Q, 0.3, 10, e + 1);
  assert.ok(won(puzzle(3, { Q, episodes: 30 })));
  assert.deepEqual(controlsOf(puzzle(2)), ["gamma"]);
  assert.deepEqual(controlsOf({ ...RL_START, mode: "free", view: "q" }), ["episodes", "eps"]);
});

test("a miss says why, and the picture", () => {
  const why = (d: LiveRl) => {
    const v = judgeRl(d, RL_LADDER[d.stage].goal);
    return v.state === "lost" ? [v.why, v.have] : null;
  };
  assert.equal(why(puzzle(0))![0], "notSettled");
  assert.deepEqual(why(puzzle(1)), ["noReach", 0]);
  assert.deepEqual(why(puzzle(2)), ["wrongEnd", 1]);
  for (const d of [puzzle(0), puzzle(0, { pi: chainAfter([1, 0, 0], 3), chainSteps: 3, history: [0, 1, 2, 3].map((k) => chainAfter([1, 0, 0], k)) }), puzzle(1, { sweeps: 4 }), puzzle(2), puzzle(3), { ...RL_START, mode: "free" as const, view: "q" as const, world: "near" as const }]) {
    assert.ok(!/NaN|Infinity|undefined/.test(rlSvg(d, words)));
  }
  assert.ok(rlSvg(puzzle(1, { sweeps: 7 }), words).includes("→ +10"));
  assert.ok(rlSvg(puzzle(2), words).includes("→ +1"));
});
