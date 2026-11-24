// Gate run: a runner on a road of three lanes, a number fact on the sign overhead (6 × 7), and a row of three gates
// coming up the road, a number on each: the answer and two slips a learner might make (36, 48). The runner is steered
// into the lane of the answer before the gates arrive; a lane picked outright (a tap on it, or its number) sends the
// runner dashing to its gate at once, so a player who knows the fact is not kept waiting, and the time to that pick is
// the time the fact took. Through the right gate the run goes on; through a wrong one is a slip, the right gate shown,
// and the fact comes back once after the rest. Three stars for a run without a slip, two for one or two, else one.
// Two games share it, + − and × ÷, with the facts of math/facts.ts and the ladders of number rain's kind; the endless
// run draws with the learner's book in hand. The run is worked out here, and the board's piece only draws it.
import { decoys, drawFacts, poolOf, QUICK_MS, type Fact, type FactBook, type FactFamily } from "./facts";
import { rng } from "./random";
import type { EndlessGame, GameLevel } from "./ladder";
import type { FactMark } from "./facts";

export const RUN_LANES = 3;
/** How long a dash to the gates takes, and how long the gates passed stay to be seen before the next row comes. */
export const DASH = 280;
export const REST = 750;
/** The first row comes a moment after the run starts. */
const LEAD = 400;

/** A run: `count` facts of these families, each row of gates `travel` ms on its way up the road. */
export type RunSpec = { families: FactFamily[]; count: number; travel: number };
/** A row of gates: its fact, the number on each gate, which lane holds the answer, and whether it is a missed fact coming back. */
export type Gate = { fact: Fact; options: number[]; right: number; again: boolean };

/** The run's rows: the facts drawn (with the book, the weak ones most), the answer in a lane at random among two decoys. */
export function course(spec: RunSpec, next: () => number, book?: FactBook): Gate[] {
  return drawFacts(poolOf(spec.families), spec.count, next, book).map((fact) => {
    const options = decoys(fact, RUN_LANES - 1, next);
    const right = Math.floor(next() * RUN_LANES);
    options.splice(right, 0, fact.answer);
    return { fact, options, right, again: false };
  });
}

/** How the last row was passed: the lane run through, and when. */
export type Passed = { gate: Gate; lane: number; ok: boolean; t: number };
export type Sim = {
  t: number;
  /** The rows, missed facts added at the end as they are missed; `at` is the row on the road (or next to come). */
  gates: Gate[];
  at: number;
  /** When the row on the road appeared (-1: none on the road), and when the runner dashed for it (-1: not yet). */
  t0: number;
  dashed: number;
  lane: number;
  passed: Passed | null;
};
export const startSim = (gates: Gate[]): Sim => ({ t: 0, gates, at: 0, t0: -1, dashed: -1, lane: 1, passed: null });

export type RunEvent =
  /** Through the right gate, picked in `ms` from when the row appeared; quick only when picked outright in time. */
  | { kind: "right"; fact: Fact; ms: number; quick: boolean; again: boolean }
  /** Through a wrong gate: the number on it. */
  | { kind: "wrong"; fact: Fact; picked: number; again: boolean };

/** The row on the road, if there is one. */
export const onRoad = (sim: Sim): Gate | null => (sim.t0 >= 0 && sim.at < sim.gates.length ? sim.gates[sim.at] : null);
/** When the row on the road reaches the runner: the end of its travel, or the end of the dash. */
const arrival = (sim: Sim, travel: number) => (sim.dashed >= 0 ? Math.min(sim.dashed + DASH, sim.t0 + travel) : sim.t0 + travel);
/** How far up the road the row is: 1 at the horizon, 0 at the runner. A dash closes what is left in its own short time. */
export function depth(sim: Sim, travel: number): number {
  if (sim.t0 < 0) return 1;
  const at = (t: number) => Math.max(0, 1 - (t - sim.t0) / travel);
  if (sim.dashed < 0) return at(sim.t);
  return at(sim.dashed) * Math.max(0, 1 - (sim.t - sim.dashed) / Math.max(1, arrival(sim, travel) - sim.dashed));
}

/** Moves the run on to time t: the next row appears when the road is clear, and a row that has arrived is judged. */
export function advance(sim: Sim, spec: Pick<RunSpec, "travel">, t: number): { sim: Sim; events: RunEvent[] } {
  const events: RunEvent[] = [];
  let s: Sim = { ...sim, t };
  for (;;) {
    if (s.at >= s.gates.length) break;
    if (s.t0 < 0) {
      const due = s.passed ? s.passed.t + REST : LEAD;
      if (t < due) break;
      s = { ...s, t0: due, dashed: -1 };
    }
    const when = arrival(s, spec.travel);
    if (t < when) break;
    const gate = s.gates[s.at];
    const ok = s.lane === gate.right;
    if (ok) {
      const ms = (s.dashed >= 0 ? s.dashed : when) - s.t0;
      events.push({ kind: "right", fact: gate.fact, ms, quick: s.dashed >= 0 && ms <= QUICK_MS, again: gate.again });
    } else events.push({ kind: "wrong", fact: gate.fact, picked: gate.options[s.lane], again: gate.again });
    // A fact missed comes back once, after the rest.
    const gates = ok || gate.again ? s.gates : [...s.gates, { ...gate, again: true }];
    s = { ...s, gates, at: s.at + 1, t0: -1, dashed: -1, passed: { gate, lane: s.lane, ok, t: when } };
  }
  return { sim: s, events };
}

/** The runner moved to a lane; nothing moves once the dash is on. */
export function steer(sim: Sim, lane: number): Sim {
  if (sim.dashed >= 0 || lane < 0 || lane >= RUN_LANES || lane === sim.lane) return sim;
  return { ...sim, lane };
}
/** The runner dashes for the gate of the lane it is in: the pick is made. Only with a row on the road. */
export const dash = (sim: Sim): Sim => (onRoad(sim) && sim.dashed < 0 ? { ...sim, dashed: sim.t } : sim);

/** Every row has been passed. */
export const runOver = (sim: Sim) => sim.at >= sim.gates.length;

// ---------- the board's games ----------

export type RunDeck = "plus" | "times";
export const RUN_PIECES = { plus: "runPlus", times: "runTimes" } as const;
const SLOW = 9000;
const STEADY = 7000;
const BRISK = 5500;
const QUICK = 4500;
/** Easy to hard: one kind of fact at a time and slowly, then mixed, then faster. */
export const RUN_LADDERS: Record<RunDeck, { spec: RunSpec; seed: number }[]> = {
  plus: [
    { spec: { families: ["add10"], count: 8, travel: SLOW }, seed: 5101 },
    { spec: { families: ["sub10"], count: 8, travel: SLOW }, seed: 5102 },
    { spec: { families: ["bond10"], count: 9, travel: SLOW }, seed: 5103 },
    { spec: { families: ["add10", "sub10", "bond10"], count: 12, travel: STEADY }, seed: 5104 },
    { spec: { families: ["add20"], count: 10, travel: SLOW }, seed: 5105 },
    { spec: { families: ["sub20"], count: 10, travel: SLOW }, seed: 5106 },
    { spec: { families: ["add20", "sub20"], count: 12, travel: STEADY }, seed: 5107 },
    { spec: { families: ["bond20", "bond100"], count: 10, travel: STEADY }, seed: 5108 },
    { spec: { families: ["add10", "sub10", "add20", "sub20", "bond10", "bond20", "bond100"], count: 14, travel: BRISK }, seed: 5109 },
  ],
  times: [
    { spec: { families: ["times2", "times5", "times10"], count: 10, travel: SLOW }, seed: 5201 },
    { spec: { families: ["div2", "div5", "div10"], count: 10, travel: SLOW }, seed: 5202 },
    { spec: { families: ["times3", "times4"], count: 10, travel: SLOW }, seed: 5203 },
    { spec: { families: ["div3", "div4"], count: 10, travel: SLOW }, seed: 5204 },
    { spec: { families: ["times6", "times7"], count: 12, travel: STEADY }, seed: 5205 },
    { spec: { families: ["times8", "times9"], count: 12, travel: STEADY }, seed: 5206 },
    { spec: { families: ["div6", "div7", "div8", "div9"], count: 12, travel: STEADY }, seed: 5207 },
    { spec: { families: ["times6", "times7", "times8", "times9", "div6", "div7", "div8", "div9"], count: 14, travel: BRISK }, seed: 5208 },
    { spec: { families: ["times11", "times12", "squares"], count: 12, travel: STEADY }, seed: 5209 },
  ],
};
export const RUN_LEVELS: Record<RunDeck, Record<GameLevel, RunSpec>> = {
  plus: {
    1: { families: ["add10", "sub10", "bond10"], count: 8, travel: STEADY },
    2: { families: ["add20", "sub20", "bond20"], count: 8, travel: STEADY },
    3: { families: ["add10", "sub10", "add20", "sub20", "bond10", "bond20", "bond100"], count: 10, travel: QUICK },
  },
  times: {
    1: { families: ["times2", "times3", "times4", "times5", "times10", "div2", "div3", "div4", "div5", "div10"], count: 8, travel: STEADY },
    2: { families: ["times6", "times7", "times8", "times9", "div6", "div7", "div8", "div9"], count: 8, travel: STEADY },
    3: { families: ["times6", "times7", "times8", "times9", "times11", "times12", "div6", "div7", "div8", "div9", "div11", "div12", "squares"], count: 10, travel: QUICK },
  },
};

/** Stars: a run without a slip three, with one or two two, else one. */
export const runStars = (slips: number) => (slips === 0 ? 3 : slips <= 2 ? 2 : 1);

export type RunNotice = "quick5" | "mended" | "allQuick" | "streak10";
export const RUN_NOTICES: RunNotice[] = ["quick5", "mended", "allQuick", "streak10"];

export type RunSaid = { kind: "right"; text: string; answer: number; quick: boolean; again: boolean } | { kind: "wrong"; text: string; answer: number; picked: number };
export const saidOf = (e: RunEvent): RunSaid =>
  e.kind === "right" ? { kind: "right", text: e.fact.text, answer: e.fact.answer, quick: e.quick, again: e.again } : { kind: "wrong", text: e.fact.text, answer: e.fact.answer, picked: e.picked };

export type LiveRun = EndlessGame<RunNotice, GameLevel, RunSaid> & {
  deck: RunDeck;
  /** The run is over. */
  done: boolean;
  /** Facts right at the first time, how many of those quick, and slips, in this run. */
  right: number;
  quick: number;
  slips: number;
  /** Once the run is over, every fact of it, right or missed. */
  marks?: FactMark[];
};
export const runStart = (deck: RunDeck): LiveRun => ({ deck, mode: "puzzle", stage: 0, level: 1, seed: 1, done: false, right: 0, quick: 0, slips: 0, marks: [], streak: 0, said: null });

/** The run of a puzzle (always the same) or of the endless run (drawn with the book, when there is one), and its pace: half as slow again in calm, a fifth faster against the clock. */
export function runNow(d: Pick<LiveRun, "deck" | "mode" | "stage" | "level" | "seed" | "timed">, o: { book?: FactBook; calm?: boolean } = {}): { spec: RunSpec; gates: Gate[] } {
  const puzzle = d.mode === "puzzle";
  const { spec: base, seed } = puzzle ? RUN_LADDERS[d.deck][d.stage] : { spec: RUN_LEVELS[d.deck][d.level], seed: d.seed };
  const spec = { ...base, travel: Math.round(base.travel * (o.calm ? 1.5 : !puzzle && d.timed ? 0.8 : 1)) };
  return { spec, gates: course(spec, rng(seed), puzzle ? undefined : o.book) };
}
