// Number rain: a wave drops the facts asked for, none twice, never two running in one column; the target is the tile
// nearest to landing and stays until it ends; what is typed is judged digit by digit; a fact missed comes back once
// and digs its block out; every wave on both ladders can be played without a slip, a wave left alone lands every tile,
// and the blocks shorten the fall.
import { test } from "node:test";
import assert from "node:assert/strict";
import { learn, poolOf, QUICK_MS, type FactBook } from "../src/math/facts.ts";
import { rng } from "../src/math/random.ts";
import {
  advance,
  answer,
  floorOf,
  markUp,
  paced,
  RAIN_COLS,
  RAIN_H,
  RAIN_LADDERS,
  RAIN_LEVELS,
  rainNow,
  rainStars,
  rainStart,
  startSim,
  targetOf,
  TILE_H,
  tileY,
  wave,
  waveOver,
  type Drop,
  type RainDeck,
  type RainEvent,
  type RainMark,
  type RainSpec,
  type Sim,
} from "../src/math/numberRain.ts";

const DECKS: RainDeck[] = ["plus", "times"];
const SPEC: RainSpec = { families: ["times6", "times7"], count: 6, gap: 2000, fall: 8000 };

/** Plays a wave in steps of 50 ms; `type` says what to type for the target at each step (null: nothing). */
function play(spec: RainSpec, drops: Drop[], type: (sim: Sim) => string | null, limit = 400_000): { sim: Sim; events: RainEvent[]; marks: RainMark[] } {
  let sim = startSim(drops);
  const events: RainEvent[] = [];
  for (let t = 0; t <= limit && !waveOver(sim); t += 50) {
    const a = advance(sim, spec, t);
    sim = a.sim;
    events.push(...a.events);
    const typed = targetOf(sim) ? type(sim) : null;
    if (typed) {
      // Digit by digit, as it is typed.
      let entry = "";
      for (const c of typed) {
        const r = answer(sim, entry + c, spec);
        sim = r.sim;
        entry = r.entry;
        events.push(...r.events);
      }
    }
  }
  assert.ok(waveOver(sim), "the wave ends");
  return { sim, events, marks: events.reduce(markUp, [] as RainMark[]) };
}
const slips = (events: RainEvent[]) => events.filter((e) => (e.kind === "wrong" || e.kind === "landed") && e.slip).length;
const rights = (events: RainEvent[]) => events.filter((e) => e.kind === "right");

test("a wave drops the facts asked for, none twice, a gap apart, never two running in one column, the same from the same seed", () => {
  for (const deck of DECKS)
    for (const { spec, seed } of RAIN_LADDERS[deck]) {
      const drops = wave(spec, rng(seed));
      const pool = new Set(poolOf(spec.families).map((f) => f.key));
      assert.equal(drops.length, spec.count);
      assert.equal(new Set(drops.map((d) => d.fact.key)).size, spec.count, `${deck} ${seed}: no fact twice`);
      assert.ok(drops.every((d) => pool.has(d.fact.key) && d.col >= 0 && d.col < RAIN_COLS && !d.again));
      drops.forEach((d, i) => i && (assert.equal(d.at - drops[i - 1].at, spec.gap), assert.notEqual(d.col, drops[i - 1].col)));
      assert.deepEqual(wave(spec, rng(seed)), drops);
      // Two tiles in one column never touch: the one after has at least a tile's height to fall behind.
      assert.ok((2 * spec.gap * RAIN_H) / spec.fall > TILE_H);
    }
});

test("the ladders go from one kind of fact, slowly, to mixed and faster, and every level has facts enough", () => {
  for (const deck of DECKS) {
    const ladder = RAIN_LADDERS[deck];
    assert.equal(ladder.length, 9);
    assert.equal(ladder[0].spec.families.length <= 3, true);
    assert.ok(ladder[0].spec.fall > ladder[7].spec.fall);
    assert.equal(new Set(ladder.map((p) => p.seed)).size, 9);
    for (const { spec } of [...ladder, ...Object.values(RAIN_LEVELS[deck]).map((spec) => ({ spec }))]) assert.ok(poolOf(spec.families).length >= spec.count, `${deck}: ${spec.families.join(" ")}`);
  }
  assert.ok(RAIN_LADDERS.plus.every((p) => poolOf(p.spec.families).every((f) => /[+−]/.test(f.text))));
  assert.ok(RAIN_LADDERS.times.every((p) => poolOf(p.spec.families).every((f) => /[×÷²]/.test(f.text))));
});

test("every wave on both ladders, and every level, can be played without a slip: three stars, every fact marked right", () => {
  for (const deck of DECKS) {
    const waves = [
      ...RAIN_LADDERS[deck].map((_, stage) => rainNow({ ...rainStart(deck), stage })),
      ...([1, 2, 3] as const).map((level) => rainNow({ ...rainStart(deck), mode: "endless", level, seed: 77, timed: level === 3 })),
    ];
    for (const { spec, drops } of waves) {
      const { sim, events, marks } = play(spec, drops, (s) => String(targetOf(s)!.fact.answer));
      assert.equal(slips(events), 0);
      assert.equal(rainStars(slips(events)), 3);
      assert.equal(rights(events).length, spec.count);
      assert.ok(events.every((e) => e.kind === "right" && e.quick && !e.again && !e.dug));
      assert.deepEqual(marks.map((m) => m.text), drops.map((d) => d.fact.text));
      assert.ok(marks.every((m) => m.ok && m.quick && !m.mended));
      assert.ok(sim.stacks.every((st) => !st.length));
      // A player who answers at once is not kept waiting: the wave is over in well under its full time.
      assert.ok(sim.t < spec.count * 600 + 1000, `over at ${sim.t}`);
    }
  }
});

test("a wave left alone lands every tile once and every fact again when it comes back: one slip a fact, one star", () => {
  const drops = wave(SPEC, rng(9));
  const { sim, events, marks } = play(SPEC, drops, () => null);
  assert.equal(events.length, 2 * SPEC.count);
  assert.ok(events.every((e) => e.kind === "landed" && e.slip));
  assert.equal(events.filter((e) => e.again).length, SPEC.count);
  assert.equal(sim.queue.length, 2 * SPEC.count);
  assert.equal(sim.stacks.flat().length, 2 * SPEC.count);
  // One mark a fact, however often it landed.
  assert.equal(marks.length, SPEC.count);
  assert.ok(marks.every((m) => !m.ok && !m.mended));
  assert.equal(rainStars(SPEC.count), 1);
  assert.deepEqual([rainStars(0), rainStars(1), rainStars(2), rainStars(3)], [3, 2, 2, 1]);
});

test("a tile appears at the top, falls steadily, and lands on the floor or on the blocks under it", () => {
  const drop: Drop = { fact: poolOf(["times6"])[0], at: 0, col: 2, again: false };
  let sim = advance(startSim([drop, { ...drop, fact: poolOf(["times6"])[1], at: 9000 }]), SPEC, 0).sim;
  const tile = sim.tiles[0];
  assert.equal(tileY(tile, 0, SPEC.fall), 0);
  assert.equal(tileY(tile, SPEC.fall / 2, SPEC.fall), RAIN_H / 2);
  assert.equal(floorOf(sim, 2), RAIN_H);
  // It lands when its bottom edge reaches the floor, not before.
  const landsAt = ((RAIN_H - TILE_H) / RAIN_H) * SPEC.fall;
  assert.equal(advance(sim, SPEC, landsAt - 60).events.length, 0);
  const landed = advance(sim, SPEC, landsAt + 10);
  assert.deepEqual(landed.events.map((e) => e.kind), ["landed"]);
  sim = landed.sim;
  assert.equal(floorOf(sim, 2), RAIN_H - TILE_H);
  assert.equal(floorOf(sim, 1), RAIN_H);
  // The next tile in that column has a tile's height less to fall. (With nothing in the air it came early.)
  sim = advance(sim, SPEC, sim.t + 400).sim;
  const second = sim.tiles.find((x) => !x.end)!;
  assert.equal(second.col, 2);
  const secondLands = second.t0 + ((RAIN_H - 2 * TILE_H) / RAIN_H) * SPEC.fall;
  assert.equal(advance(sim, SPEC, secondLands - 60).events.length, 0);
  assert.equal(advance(sim, SPEC, secondLands + 10).events[0].kind, "landed");
});

test("what is typed is judged digit by digit: a start of the answer waits, anything else is wrong at once", () => {
  const fact = poolOf(["times7"]).find((f) => f.text === "7 × 6")!;
  const start = advance(startSim([{ fact, at: 0, col: 0, again: false }]), SPEC, 0).sim;
  assert.equal(targetOf(start)!.fact, fact);
  // "4" could still become 42.
  const four = answer(start, "4", SPEC);
  assert.deepEqual([four.events.length, four.entry], [0, "4"]);
  // "48" cannot: wrong, the entry cleared, the tile still the target and to come back.
  const wrong = answer(start, "48", SPEC);
  assert.deepEqual(wrong.events, [{ kind: "wrong", fact, typed: "48", slip: true, again: false }]);
  assert.equal(wrong.entry, "");
  assert.equal(targetOf(wrong.sim)!.tried, true);
  assert.equal(wrong.sim.queue.length, 2);
  assert.equal(wrong.sim.queue[1].again, true);
  // "5" is wrong at the first digit; a second wrong answer is no second slip, and brings the fact back no second time.
  const again = answer(wrong.sim, "5", SPEC);
  assert.deepEqual(again.events, [{ kind: "wrong", fact, typed: "5", slip: false, again: false }]);
  assert.equal(again.sim.queue.length, 2);
  // Right after a wrong try: cleared, with no credit.
  const fixed = answer(again.sim, "42", SPEC);
  assert.deepEqual(fixed.events, [{ kind: "fixed", fact, again: false }]);
  assert.equal(targetOf(fixed.sim), null);
  // Right at once: timed from when it became the target.
  const later = advance(start, SPEC, 1800).sim;
  assert.deepEqual(answer(later, "42", SPEC).events, [{ kind: "right", fact, ms: 1800, quick: true, again: false, dug: false }]);
  const slow = advance(start, SPEC, QUICK_MS + 50).sim;
  assert.equal((answer(slow, "42", SPEC).events[0] as Extract<RainEvent, { kind: "right" }>).quick, false);
  // Nothing in the air: what is typed is dropped.
  assert.deepEqual(answer(startSim([]), "7", SPEC), { sim: startSim([]), events: [], entry: "" });
});

test("the target is the tile nearest to landing and stays the target until it ends", () => {
  const [a, b, c] = poolOf(["times6"]);
  const drops: Drop[] = [{ fact: a, at: 0, col: 0, again: false }, { fact: b, at: 2000, col: 1, again: false }, { fact: c, at: 4000, col: 2, again: false }];
  let sim = advance(startSim(drops), SPEC, 0).sim;
  assert.equal(targetOf(sim)!.fact, a);
  sim = advance(sim, SPEC, 4100).sim;
  assert.equal(sim.tiles.length, 3);
  assert.equal(targetOf(sim)!.fact, a);
  sim = answer(sim, String(a.answer), SPEC).sim;
  assert.equal(targetOf(sim)!.fact, b);
  // The time of the next answer runs from when its tile became the target, not from when it appeared.
  sim = advance(sim, SPEC, 4600).sim;
  const r = answer(sim, String(b.answer), SPEC);
  assert.equal((r.events[0] as Extract<RainEvent, { kind: "right" }>).ms, 500);
  assert.equal(targetOf(r.sim)!.fact, c);
});

test("a fact missed comes back once after the rest; got right then, its block is dug out and its mark mended", () => {
  const drops = wave(SPEC, rng(3));
  const missed = drops[1].fact;
  // Everything answered at once, but the second fact the first time it comes.
  let seen = 0;
  const { sim, events, marks } = play(SPEC, drops, (s) => {
    const x = targetOf(s)!;
    if (x.fact !== missed) return String(x.fact.answer);
    return x.again ? String(x.fact.answer) : (seen++, null);
  });
  assert.ok(seen > 0);
  assert.equal(slips(events), 1);
  assert.equal(rainStars(slips(events)), 2);
  const order = events.map((e) => `${e.kind}${e.again ? "+" : ""}`);
  assert.equal(order.filter((k) => k === "landed").length, 1);
  assert.equal(order.at(-1), "right+");
  const dug = events.at(-1) as Extract<RainEvent, { kind: "right" }>;
  assert.deepEqual([dug.fact, dug.again, dug.dug], [missed, true, true]);
  assert.ok(sim.stacks.every((st) => !st.length), "the block is gone");
  assert.equal(marks.length, SPEC.count);
  assert.deepEqual(marks.find((m) => m.text === missed.text), { text: missed.text, answer: missed.answer, ok: false, quick: false, mended: true });
  assert.equal(marks.filter((m) => m.ok).length, SPEC.count - 1);
  // The fact came back after every other tile had come.
  assert.equal(sim.queue.at(-1)!.again, true);
  assert.equal(sim.queue.length, SPEC.count + 1);
});

test("the endless run draws with the book: the same wave without one, the weak facts first in line with one; calm is slower, the clock faster", () => {
  const d = { ...rainStart("times"), mode: "endless" as const, level: 2 as const, seed: 31 };
  const plain = rainNow(d);
  assert.deepEqual(rainNow(d), plain);
  assert.notDeepEqual(rainNow({ ...d, seed: 32 }).drops, plain.drops);
  // Every fact of the level fast but three weak ones: the weak ones are in nearly every wave.
  const pool = poolOf(RAIN_LEVELS.times[2].families);
  const weak = [pool[3], pool[20], pool[41]].map((f) => f.key);
  let book: FactBook = {};
  for (const f of pool) for (let i = 0; i < 3; i++) book = learn(book, f.key, !weak.includes(f.key), 900);
  let hits = 0;
  for (let seed = 1; seed <= 40; seed++) hits += rainNow({ ...d, seed }, { book }).drops.filter((x) => weak.includes(x.fact.key)).length;
  const plainHits = Array.from({ length: 40 }, (_, i) => rainNow({ ...d, seed: i + 1 }).drops.filter((x) => weak.includes(x.fact.key)).length).reduce((s, n) => s + n, 0);
  assert.ok(hits > 2 * plainHits, `${hits} with the book, ${plainHits} without`);
  // A puzzle is the same wave whatever the book says.
  assert.deepEqual(rainNow(rainStart("times"), { book }).drops, rainNow(rainStart("times")).drops);
  const base = RAIN_LEVELS.times[2];
  assert.equal(rainNow({ ...d, timed: true }).spec.fall, base.fall * 0.8);
  assert.equal(rainNow({ ...d, timed: true }, { calm: true }).spec.fall, base.fall * 1.5);
  assert.equal(rainNow(rainStart("plus"), { calm: true }).spec.gap, RAIN_LADDERS.plus[0].spec.gap * 1.5);
  assert.deepEqual(paced(base, 1), base);
});
