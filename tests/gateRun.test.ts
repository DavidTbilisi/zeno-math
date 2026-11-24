// Gate run: a course is the facts asked for, the answer on one gate of three and a different wrong number on each of
// the others; a row arrives at the end of its travel or of a dash, and the lane the runner is in is judged; a fact
// missed comes back once; every run on both ladders can be run without a slip, and a runner who never moves slips on
// most of it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { decoys, markFact, poolOf, QUICK_MS, shown, type FactMark } from "../src/math/facts.ts";
import { rng } from "../src/math/random.ts";
import {
  advance,
  course,
  dash,
  DASH,
  depth,
  onRoad,
  REST,
  RUN_LADDERS,
  RUN_LANES,
  RUN_LEVELS,
  runNow,
  runOver,
  runStars,
  runStart,
  startSim,
  steer,
  type Gate,
  type RunDeck,
  type RunEvent,
  type Sim,
} from "../src/math/gateRun.ts";

const DECKS: RunDeck[] = ["plus", "times"];
const TRAVEL = 6000;

/** Runs a course in steps of 50 ms; `pick` says which lane to dash for when a row is on the road (null: leave it). */
function run(gates: Gate[], travel: number, pick: (g: Gate, sim: Sim) => number | null): { sim: Sim; events: RunEvent[]; marks: FactMark[] } {
  let sim = startSim(gates);
  const events: RunEvent[] = [];
  for (let t = 0; t < 600_000 && !runOver(sim); t += 50) {
    const a = advance(sim, { travel }, t);
    sim = a.sim;
    events.push(...a.events);
    const row = onRoad(sim);
    const lane = row && sim.dashed < 0 ? pick(row, sim) : null;
    if (lane !== null) sim = dash(steer(sim, lane));
  }
  assert.ok(runOver(sim), "the run ends");
  const marks = events.reduce((m, e) => markFact(m, { fact: e.fact, ok: e.kind === "right", quick: e.kind === "right" && e.quick, again: e.again }), [] as FactMark[]);
  return { sim, events, marks };
}

test("decoys are wrong, different, positive, and the slips a learner makes", () => {
  const next = rng(4);
  for (const f of poolOf(["add10", "sub10", "bond10", "add20", "sub20", "bond20", "bond100", "squares", "times2", "times7", "times12", "div2", "div9"])) {
    const wrong = decoys(f, 2, next);
    assert.equal(wrong.length, 2, f.text);
    assert.ok(wrong.every((x) => Number.isInteger(x) && x > 0 && x !== f.answer), `${f.text}: ${wrong}`);
    assert.notEqual(wrong[0], wrong[1], f.text);
  }
  // 6 × 7: the next multiples along either table.
  const six = poolOf(["times7"]).find((f) => f.text === "6 × 7")!;
  for (let i = 0; i < 20; i++) assert.ok(decoys(six, 2, next).every((x) => [36, 48, 35, 49].includes(x)));
  // 1 + 1: nothing below 1, so the numbers above fill in.
  assert.deepEqual(decoys(poolOf(["add10"])[0], 3, rng(1)).sort((a, b) => a - b).slice(0, 1), [1]);
  assert.equal(shown("7 + □ = 10", 3), "7 + 3 = 10");
  assert.equal(shown("6 × 7", 42), "6 × 7 = 42");
});

test("a course is the facts asked for, none twice, the answer on one gate of three and two different wrong numbers on the others", () => {
  for (const deck of DECKS)
    for (const { spec, seed } of RUN_LADDERS[deck]) {
      const gates = course(spec, rng(seed));
      assert.equal(gates.length, spec.count);
      assert.equal(new Set(gates.map((g) => g.fact.key)).size, spec.count);
      for (const g of gates) {
        assert.equal(g.options.length, RUN_LANES);
        assert.equal(g.options[g.right], g.fact.answer);
        assert.equal(new Set(g.options).size, RUN_LANES, `${g.fact.text}: ${g.options}`);
        assert.equal(g.again, false);
      }
      assert.deepEqual(course(spec, rng(seed)), gates);
      // The answer is not always in the same lane.
      assert.ok(new Set(gates.map((g) => g.right)).size > 1);
    }
  for (const deck of DECKS) {
    assert.equal(RUN_LADDERS[deck].length, 9);
    assert.ok(RUN_LADDERS[deck][0].spec.travel > RUN_LADDERS[deck][7].spec.travel);
    for (const spec of Object.values(RUN_LEVELS[deck])) assert.ok(poolOf(spec.families).length >= spec.count);
  }
});

test("every run on both ladders, and every level, can be run without a slip: three stars, every fact marked right and quick", () => {
  for (const deck of DECKS) {
    const runs = [
      ...RUN_LADDERS[deck].map((_, stage) => runNow({ ...runStart(deck), stage })),
      ...([1, 2, 3] as const).map((level) => runNow({ ...runStart(deck), mode: "endless", level, seed: 12, timed: level === 3 })),
    ];
    for (const { spec, gates } of runs) {
      const { sim, events, marks } = run(gates, spec.travel, (g) => g.right);
      assert.equal(events.length, spec.count);
      assert.ok(events.every((e) => e.kind === "right" && e.quick && !e.again));
      assert.equal(runStars(0), 3);
      assert.deepEqual(marks.map((m) => m.text), gates.map((g) => g.fact.text));
      assert.ok(marks.every((m) => m.ok && m.quick));
      // Dashing at once, a row costs a dash and a rest, not its whole travel.
      assert.ok(sim.t < spec.count * (DASH + REST + 150) + 1000, `over at ${sim.t}`);
    }
  }
  assert.deepEqual([runStars(0), runStars(1), runStars(2), runStars(3)], [3, 2, 2, 1]);
});

test("a runner who never moves goes through the middle gate of every row when it arrives: right where the answer is there, and never quick", () => {
  const { spec, gates } = runNow(runStart("times"));
  const { sim, events, marks } = run(gates, spec.travel, () => null);
  const wrong = gates.filter((g) => g.right !== 1);
  assert.ok(wrong.length >= 3);
  // Each row missed came back once, and was missed again unless its answer was in the middle (it never is: same row).
  assert.equal(sim.gates.length, gates.length + wrong.length);
  assert.equal(events.filter((e) => e.kind === "wrong").length, 2 * wrong.length);
  assert.ok(events.every((e) => e.kind === "wrong" || (!e.quick && e.ms === spec.travel)));
  assert.equal(marks.length, gates.length);
  assert.equal(marks.filter((m) => !m.ok).length, wrong.length);
  assert.ok(marks.every((m) => !m.mended));
});

test("a row comes up the road in its travel time, a dash brings it at once, and the lane the runner is in is judged", () => {
  const fact = poolOf(["times7"]).find((f) => f.text === "6 × 7")!;
  const gate: Gate = { fact, options: [36, 42, 48], right: 1, again: false };
  let sim = advance(startSim([gate, { ...gate, right: 2, options: [36, 48, 42] }]), { travel: TRAVEL }, 400).sim;
  assert.equal(onRoad(sim), gate);
  assert.equal(depth(sim, TRAVEL), 1);
  assert.equal(depth(advance(sim, { travel: TRAVEL }, 400 + TRAVEL / 2).sim, TRAVEL), 0.5);
  // Steering changes the lane, not the row; a lane off the road is no lane.
  assert.equal(steer(sim, 0).lane, 0);
  assert.equal(steer(sim, 3), sim);
  assert.equal(steer(sim, -1), sim);
  // Left alone in the middle lane, the row arrives at the end of its travel: right, but not quick.
  const slow = advance(sim, { travel: TRAVEL }, 400 + TRAVEL);
  assert.deepEqual(slow.events, [{ kind: "right", fact, ms: TRAVEL, quick: false, again: false }]);
  // A dash at 1.5 s: the row is there a dash later, and the time taken is the time to the dash.
  sim = advance(sim, { travel: TRAVEL }, 1900).sim;
  const dashed = dash(sim);
  assert.equal(dashed.dashed, 1900);
  assert.equal(steer(dashed, 0), dashed, "nothing moves once the dash is on");
  assert.equal(dash(dashed), dashed);
  assert.equal(advance(dashed, { travel: TRAVEL }, 1900 + DASH - 20).events.length, 0);
  assert.ok(depth(advance(dashed, { travel: TRAVEL }, 1900 + DASH / 2).sim, TRAVEL) < 0.4);
  const through = advance(dashed, { travel: TRAVEL }, 1900 + DASH);
  assert.deepEqual(through.events, [{ kind: "right", fact, ms: 1500, quick: true, again: false }]);
  assert.equal(through.sim.passed!.ok, true);
  assert.equal(onRoad(through.sim), null);
  // A slow pick is right but not quick.
  const late = advance(sim, { travel: TRAVEL }, 400 + QUICK_MS + 100).sim;
  assert.equal((advance(dash(late), { travel: TRAVEL }, late.t + DASH).events[0] as Extract<RunEvent, { kind: "right" }>).quick, false);
  // The next row comes a rest after the last was passed; a dash for the wrong gate is a slip, and the fact comes back.
  sim = advance(through.sim, { travel: TRAVEL }, through.sim.passed!.t + REST).sim;
  assert.equal(onRoad(sim)!.right, 2);
  assert.equal(dash(startSim([gate])).dashed, -1, "no dash with no row on the road");
  const wrong = advance(dash(steer(sim, 0)), { travel: TRAVEL }, sim.t + DASH);
  assert.deepEqual(wrong.events, [{ kind: "wrong", fact, picked: 36, again: false }]);
  assert.equal(wrong.sim.gates.length, 3);
  assert.equal(wrong.sim.gates[2].again, true);
  assert.equal(runOver(wrong.sim), false);
});

test("a fact missed comes back once after the rest; right then, its mark is mended", () => {
  const { spec, gates } = runNow(runStart("plus"));
  const missed = gates[2];
  const { sim, events, marks } = run(gates, spec.travel, (g) => (g.fact === missed.fact && !g.again ? (g.right + 1) % RUN_LANES : g.right));
  assert.equal(events.filter((e) => e.kind === "wrong").length, 1);
  assert.equal(runStars(1), 2);
  assert.equal(sim.gates.length, gates.length + 1);
  const last = events.at(-1)!;
  assert.deepEqual([last.kind, last.fact, last.again], ["right", missed.fact, true]);
  assert.deepEqual(marks.find((m) => m.text === missed.fact.text), { text: missed.fact.text, answer: missed.fact.answer, ok: false, quick: false, mended: true });
  assert.equal(marks.length, gates.length);
});

test("a puzzle is always the same run; calm is slower and the clock faster", () => {
  const d = { ...runStart("times"), mode: "endless" as const, level: 2 as const, seed: 5 };
  assert.deepEqual(runNow(d), runNow(d));
  assert.notDeepEqual(runNow({ ...d, seed: 6 }).gates, runNow(d).gates);
  const base = RUN_LEVELS.times[2].travel;
  assert.equal(runNow({ ...d, timed: true }).spec.travel, base * 0.8);
  assert.equal(runNow({ ...d, timed: true }, { calm: true }).spec.travel, base * 1.5);
  assert.equal(runNow(runStart("plus")).spec.travel, RUN_LADDERS.plus[0].spec.travel);
});
