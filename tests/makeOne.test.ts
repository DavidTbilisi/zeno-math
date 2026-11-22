// Make one: every way found sums to one, waves hold their groups in turn with decoys among them, pieces fall to the
// floor and are lost, a catch fills the basket, one whole empties it as a one made, past one spills.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Frac } from "../src/math/fraction.ts";
import { rng } from "../src/math/random.ts";
import {
  advance, catchAt, FLOOR, MAKE_LADDER, makeNow, makeStars, makeWave, oneNotice, piecesOf, posAt, slipsOf, startSim, sumOf, sumText, waveOver, waysToOne, type Drop,
} from "../src/math/makeOne.ts";

const f = (n: number, d: number) => new Frac(n, d);

test("the ways to one: each sums to one, within the size, from the pieces given", () => {
  assert.deepEqual(piecesOf([2, 4]).map((x) => `${x.n}/${x.d}`), ["1/2", "1/4", "3/4"]);
  const ways = waysToOne([2, 4], [2, 3]).map(sumText);
  assert.deepEqual(ways.sort(), ["1/4 + 1/4 + 1/2", "1/4 + 3/4", "1/2 + 1/2"].sort());
  for (const spec of MAKE_LADDER.map((r) => r.spec)) assert.ok(waysToOne(spec.dens, spec.parts).every((w) => sumOf(w).isOne()));
});

test("every wave: its groups each make one, in turn, the decoys among them, on the stage", () => {
  for (const { spec, seed } of MAKE_LADDER) {
    const drops = makeWave(spec, rng(seed));
    assert.equal(drops.filter((d) => d.group < 0).length, spec.decoys);
    for (let g = 0; g < spec.goal; g++) assert.ok(sumOf(drops.filter((d) => d.group === g).map((d) => d.f)).isOne());
    const order = drops.filter((d) => d.group >= 0).map((d) => d.group);
    assert.deepEqual(order, [...order].sort((a, b) => a - b));
    assert.ok(drops.every((d, i) => i === 0 || d.at >= drops[i - 1].at));
    assert.ok(drops.every((d) => d.x >= 30 && d.x <= 570));
  }
  assert.equal(makeNow({ mode: "endless", stage: 0, level: 2, seed: 7, timed: true }).spec.fall, Math.round(3600 * 0.8));
});

test("a piece falls to the floor in its time and is lost there", () => {
  const drops: Drop[] = [{ f: f(1, 2), at: 0, x: 300, group: 0 }];
  assert.ok(Math.abs(posAt(drops[0], 1000, 1000)[1] - FLOOR) < 1e-9);
  let sim = advance(startSim(), drops, 1000, 500);
  assert.equal(sim.pieces.length, 1);
  sim = advance(sim, drops, 1000, 1000);
  assert.equal(sim.pieces[0].end?.kind, "fell");
  assert.ok(waveOver(sim, drops));
});

test("catching: into the basket, one whole made, past one spilled", () => {
  const drops: Drop[] = [f(1, 2), f(1, 4), f(1, 4), f(3, 4), f(1, 2)].map((x, i) => ({ f: x, at: 0, x: 60 + i * 110, group: 0 }));
  let sim = advance(startSim(), drops, 4000, 1000);
  const tap = (i: number) => {
    const [x, y] = posAt(drops[i], 4000, sim.t);
    const r = catchAt(sim, drops, 4000, x, y);
    sim = r.sim;
    return r.event;
  };
  assert.equal(catchAt(sim, drops, 4000, 300, 390).event, null);
  assert.equal(tap(0)?.kind, "in");
  assert.equal(tap(1)?.kind, "in");
  const one = tap(2);
  assert.ok(one?.kind === "one" && sumText(one.parts) === "1/2 + 1/4 + 1/4");
  assert.equal(sim.made, 1);
  assert.deepEqual(sim.basket, []);
  assert.equal(tap(3)?.kind, "in");
  const over = tap(4);
  assert.ok(over?.kind === "over" && over.sum.n === 5 && over.sum.d === 4);
  assert.equal(sim.overs, 1);
  assert.equal(tap(4), null);
});

test("stars, slips and notices", () => {
  assert.equal(slipsOf(3, 0, 3), 0);
  assert.equal(slipsOf(2, 1, 3), 2);
  assert.equal(makeStars(0), 3);
  assert.equal(makeStars(1), 2);
  assert.equal(makeStars(2), 1);
  assert.equal(oneNotice([f(1, 2), f(1, 3), f(1, 6)]), "mixed");
  assert.equal(oneNotice([f(1, 4), f(1, 4), f(1, 2)]), "mixed");
  assert.equal(oneNotice([f(1, 3), f(1, 3), f(1, 3)]), "three");
  assert.equal(oneNotice([f(1, 2), f(1, 2)]), null);
});
