// The network lab: the perceptron's update turning its line until no point is wrong (and never finishing on XOR), a
// network's forward pass, its gradient checked against finite differences, training lowering the loss, the curves
// kept every ten steps, every puzzle unsolved at its start and won by what it asks, each miss told apart, and the picture.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  accuracy,
  caller,
  controlsOf,
  forward,
  initNet,
  judgeNn,
  lossOf,
  NN_LADDER,
  NN_START,
  nnSvg,
  perceptronCalls,
  perceptronUpdate,
  pointsOf,
  testOf,
  trainMore,
  trainOf,
  trainStep,
  type LiveNn,
  type Net,
  type NPoint,
  type Perceptron,
} from "../src/math/nnLab.ts";

const words = { loss: "loss", train: "train", test: "test", steps: "{n} steps", updates: "{n} updates", network: "network", perceptron: "perceptron" };
const puzzle = (i: number, change: Partial<LiveNn> = {}): LiveNn => ({ ...NN_START, stage: i, ...NN_LADDER[i].start, ...change });
const won = (d: LiveNn) => judgeNn(d, NN_LADDER[d.stage].goal).state === "won";
const trained = (d: LiveNn, n: number) => ({ ...d, ...trainMore(d, n) });

test("the perceptron: each update turns the line towards a wrong point, until none is wrong", () => {
  const ps = trainOf(pointsOf("line", 1));
  let w: Perceptron = [1, 1, 0];
  let next = 0;
  let n = 0;
  const first = perceptronUpdate(w, ps, 0)!;
  const p = ps[first.used];
  assert.notEqual(perceptronCalls(w, p), p.c, "it takes a point called wrong");
  for (let u = perceptronUpdate(w, ps, next); u; u = perceptronUpdate(w, ps, next)) [w, next, n] = [u.w, u.next, n + 1];
  assert.ok(n > 5 && n < 100);
  assert.equal(accuracy((q) => perceptronCalls(w, q), ps), 1);
  // On XOR it never runs out of wrong points.
  const xor = trainOf(pointsOf("xor", 1));
  let v: Perceptron = [1, 1, 0];
  let at = 0;
  for (let i = 0; i < 300; i++) {
    const u = perceptronUpdate(v, xor, at)!;
    assert.ok(u, "always a wrong point");
    [v, at] = [u.w, u.next];
  }
});

test("the network: forward, and the gradient against finite differences", () => {
  const ps: NPoint[] = [{ x: 0.2, y: 0.3, c: 0 }, { x: 0.8, y: 0.6, c: 1 }, { x: 0.4, y: 0.9, c: 1 }];
  for (const act of ["sigmoid", "tanh", "relu"] as const) {
    const net = initNet(3, act, 2);
    const p = forward(net, ps[0]);
    assert.ok(p > 0 && p < 1);
    // One step with η is −η times the gradient; compare a weight's change with the slope of the loss.
    const eta = 1e-3;
    const stepped = trainStep(net, ps, eta);
    const h = 1e-6;
    const nudged: Net = { ...net, hidden: net.hidden.map((r, j) => (j === 1 ? [r[0], r[1] + h, r[2]] : r)) };
    const slope = (lossOf(nudged, ps) - lossOf(net, ps)) / h;
    assert.ok(Math.abs((net.hidden[1][1] - stepped.hidden[1][1]) / eta - slope) < 1e-4, `${act}: backprop matches the slope`);
    const nudgedOut: Net = { ...net, out: net.out.map((v, k) => (k === 2 ? v + h : v)) };
    const slopeOut = (lossOf(nudgedOut, ps) - lossOf(net, ps)) / h;
    assert.ok(Math.abs((net.out[2] - stepped.out[2]) / eta - slopeOut) < 1e-4);
  }
  assert.ok(Number.isNaN(lossOf(initNet(2, "tanh", 1), [])));
});

test("training lowers the loss and keeps the curves every ten steps", () => {
  const d = puzzle(2, { hidden: 4, act: "relu" });
  const t = trained(d, 100);
  assert.equal(t.steps, 100);
  assert.equal(t.losses.length, 11);
  assert.ok(t.losses[10] < t.losses[0]);
  const more = { ...t, ...trainMore(t, 100) };
  assert.equal(more.losses.length, 21, "continues from where it was");
  const noisy = trained(puzzle(3), 100);
  assert.equal(noisy.testLosses.length, 11);
  assert.equal(testOf(pointsOf("noisy", 1)).length, 120);
});

test("every puzzle is unsolved at its start and won by what it asks", () => {
  NN_LADDER.forEach((_, i) => assert.ok(!won(puzzle(i)), `puzzle ${i + 1} starts unsolved`));
  // 1: updated until no point is wrong.
  let d = puzzle(0);
  for (let u = perceptronUpdate(d.perceptron, trainOf(pointsOf("line", 1)), d.next); u; u = perceptronUpdate(d.perceptron, trainOf(pointsOf("line", 1)), d.next)) d = { ...d, perceptron: u.w, next: u.next };
  assert.ok(won(d));
  // 2: XOR needs hidden units.
  assert.ok(!won(trained(puzzle(1, { hidden: 1 }), 500)));
  assert.ok(won(trained(puzzle(1, { hidden: 4 }), 200)));
  // 3: the circle needs more than two hidden units.
  assert.ok(!won(trained(puzzle(2, { hidden: 2 }), 1000)));
  assert.ok(won(trained(puzzle(2, { hidden: 4, act: "relu" }), 200)));
  // 4: stopped early the big network passes; trained long it does not.
  assert.ok(won(trained(puzzle(3), 300)));
  assert.ok(!won(trained(puzzle(3), 2000)));
  assert.deepEqual(controlsOf(puzzle(0)), ["update"]);
  assert.deepEqual(controlsOf({ ...NN_START, mode: "free" }), ["update", "hidden", "act", "eta", "train"]);
  assert.equal(caller(puzzle(3))({ x: 0.5, y: 0.9 }), 0, "an untrained network calls everything blue");
});

test("a miss says why", () => {
  const why = (d: LiveNn) => {
    const v = judgeNn(d, NN_LADDER[d.stage].goal);
    return v.state === "lost" ? v.why : null;
  };
  assert.equal(why(puzzle(0)), "wrongPoints");
  assert.equal(why(puzzle(2)), "trainLow");
  assert.equal(why(puzzle(3)), "testLow");
});

test("the picture is drawn for the perceptron and for a network", () => {
  const states = [puzzle(0), puzzle(0, { used: 3, perceptron: [0, 0, 1] }), puzzle(0, { perceptron: [0, 1, 0] }), trained(puzzle(2, { hidden: 4 }), 100), trained(puzzle(3), 100), puzzle(1, { hidden: 2 })];
  for (const d of states) assert.ok(!/NaN|Infinity/.test(nnSvg(d, words)));
  assert.ok(nnSvg(puzzle(0), words).includes(">perceptron<"));
  assert.ok(nnSvg(trained(puzzle(2, { hidden: 4 }), 100), words).includes("network: 2 → 4 → 1"));
  assert.ok(nnSvg(trained(puzzle(3), 100), words).includes("stroke-dasharray=\"5 3\""), "the test loss is drawn dashed");
});
