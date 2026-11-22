// Tile drop: waves keep at most `open` groups under way, the plan clears every row, a bar slides into a row, one
// whole clears it, past one jams and the bar falls on, unplaced bars are lost at the wall.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Frac } from "../src/math/fraction.ts";
import { sumOf, sumText } from "../src/math/makeOne.ts";
import {
  advanceTiles, lowest, planRows, sendTo, startTiles, TILE_LADDER, tileNow, tileSlips, tileStars, tilesOver, tileWave, type TileDrop,
} from "../src/math/tileDrop.ts";
import { rng } from "../src/math/random.ts";

const f = (n: number, d: number) => new Frac(n, d);

test("every wave: its groups each make one, never more than `open` under way, and the plan clears them all", () => {
  for (const { spec, seed } of TILE_LADDER) {
    const drops = tileWave(spec, rng(seed));
    for (let g = 0; g < spec.goal; g++) assert.ok(sumOf(drops.filter((d) => d.group === g).map((d) => d.f)).isOne());
    // A group is under way from its first bar to its last.
    const span = (g: number) => [drops.findIndex((d) => d.group === g), drops.findLastIndex((d) => d.group === g)];
    for (let i = 0; i < drops.length; i++) {
      const under = Array.from({ length: spec.goal }, (_, g) => span(g)).filter(([a, b]) => a <= i && i <= b).length;
      assert.ok(under <= spec.open, `${under} groups under way at bar ${i}`);
    }
    let sim = startTiles();
    const plan = planRows(drops);
    let made = 0;
    drops.forEach((_, i) => {
      sim = advanceTiles(sim, drops, spec.fall, drops[i].at);
      const r = sendTo(sim, drops, spec.fall, plan[i]);
      assert.notEqual(r.event?.kind, "jam");
      if (r.event?.kind === "clear") made++;
      sim = r.sim;
    });
    assert.equal(made, spec.goal);
  }
  assert.equal(tileNow({ mode: "endless", stage: 0, level: 3, seed: 2, timed: true }).spec.fall, Math.round(3100 * 0.8));
});

test("sliding in, clearing, jamming, losing", () => {
  const drops: TileDrop[] = [f(1, 2), f(1, 4), f(3, 4), f(1, 4)].map((x, i) => ({ f: x, at: i * 10, group: 0 }));
  let sim = advanceTiles(startTiles(), drops, 1000, 50);
  assert.equal(lowest(sim)?.i, 0);
  let r = sendTo(sim, drops, 1000, 0);
  assert.equal(r.event?.kind, "in");
  r = sendTo(r.sim, drops, 1000, 0);
  assert.ok(r.event?.kind === "in" && r.event.sum.n === 3 && r.event.sum.d === 4);
  const jam = sendTo(r.sim, drops, 1000, 0);
  assert.ok(jam.event?.kind === "jam" && jam.event.sum.n === 3 && jam.event.sum.d === 2);
  assert.equal(lowest(jam.sim)?.i, 2);
  r = sendTo(jam.sim, drops, 1000, 1);
  r = sendTo(r.sim, drops, 1000, 1);
  assert.ok(r.event?.kind === "clear" && sumText(r.event.parts) === "3/4 + 1/4");
  assert.deepEqual(r.sim.rows[1], []);
  assert.equal(r.sim.cleared, 1);
  assert.equal(r.sim.jams, 1);
  sim = advanceTiles(r.sim, drops, 1000, 2000);
  assert.ok(tilesOver(sim, drops));
  assert.equal(sendTo(sim, drops, 1000, 2).event, null);
  const lost = advanceTiles(advanceTiles(startTiles(), drops, 1000, 50), drops, 1000, 1005);
  assert.equal(lost.tiles[0].end?.kind, "lost");
});

test("stars and slips", () => {
  assert.equal(tileSlips(3, 0, 3), 0);
  assert.equal(tileSlips(2, 1, 3), 2);
  assert.deepEqual([0, 1, 2, 5].map(tileStars), [3, 2, 1, 1]);
});
