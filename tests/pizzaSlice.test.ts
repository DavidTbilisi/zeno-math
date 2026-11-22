// Slice the pizza: orders within their range and never the same twice running, cuts and a fresh pizza, serving
// judged (too few, too many), guests served what there is when they arrive, the next order after the pause.
import { test } from "node:test";
import assert from "node:assert/strict";
import { rng } from "../src/math/random.ts";
import {
  advancePizza, cutPizza, freshPizza, judgePizza, MAX_SLICES, PIZZA_LADDER, pizzaNotice, pizzaNow, pizzaOver, pizzaStars, pizzaWave,
  SERVE_PAUSE, servePizza, startPizza, walked, type PizzaOrder,
} from "../src/math/pizzaSlice.ts";

test("every wave: orders in range, of the kind asked, never the same twice running", () => {
  for (const { spec, seed } of PIZZA_LADDER) {
    const orders = pizzaWave(spec, rng(seed));
    assert.equal(orders.length, spec.orders);
    for (const [i, o] of orders.entries()) {
      assert.ok(o.want >= spec.lo && o.want <= spec.hi);
      if (spec.pick !== "mix") assert.equal(o.kind, spec.pick);
      assert.ok(o.kind === "share" ? o.k === o.want : o.k >= 1 && o.k < o.want);
      if (i) assert.notEqual(o.want, orders[i - 1].want);
    }
  }
  const mixed = PIZZA_LADDER.filter((r) => r.spec.pick === "mix").flatMap((r) => pizzaWave(r.spec, rng(r.seed)));
  assert.ok(mixed.some((o) => o.kind === "share") && mixed.some((o) => o.kind === "size"));
  assert.equal(pizzaNow({ mode: "endless", stage: 0, level: 3, seed: 4, timed: true }).spec.walk, 4000);
});

test("cutting, a fresh pizza, serving and the clock", () => {
  const orders: PizzaOrder[] = [{ kind: "share", k: 4, want: 4 }, { kind: "size", k: 2, want: 6 }];
  let sim = startPizza();
  for (let i = 0; i < 3; i++) sim = cutPizza(sim, orders);
  assert.equal(sim.n, 4);
  assert.equal(freshPizza(sim, orders).n, 1);
  let r = servePizza(sim, orders);
  assert.ok(r.event && r.event.why === null && !r.event.late);
  sim = r.sim;
  assert.equal(cutPizza(sim, orders).n, 4);
  assert.equal(servePizza(sim, orders).event, null);
  sim = advancePizza(sim, orders, 5000, SERVE_PAUSE).sim;
  assert.deepEqual([sim.at, sim.n, sim.since], [1, 1, SERVE_PAUSE]);
  assert.equal(walked(advancePizza(sim, orders, 5000, SERVE_PAUSE + 2500).sim, 5000), 0.5);
  r = advancePizza(sim, orders, 5000, SERVE_PAUSE + 5000);
  assert.ok(r.event && r.event.why === "few" && r.event.late);
  assert.equal(r.sim.wrong, 1);
  sim = advancePizza(r.sim, orders, 5000, SERVE_PAUSE * 2 + 5000).sim;
  assert.ok(pizzaOver(sim, orders));
  let many = startPizza();
  for (let i = 0; i < 20; i++) many = cutPizza(many, orders);
  assert.equal(many.n, MAX_SLICES);
});

test("judging, stars and notices", () => {
  assert.equal(judgePizza({ kind: "share", k: 4, want: 4 }, 8), "many");
  assert.equal(judgePizza({ kind: "size", k: 2, want: 6 }, 3), "few");
  assert.deepEqual([0, 1, 2].map(pizzaStars), [3, 2, 1]);
  assert.equal(pizzaNotice({ kind: "size", k: 2, want: 6 }), "leftover");
  assert.equal(pizzaNotice({ kind: "share", k: 8, want: 8 }), "many");
  assert.equal(pizzaNotice({ kind: "share", k: 3, want: 3 }), null);
});
