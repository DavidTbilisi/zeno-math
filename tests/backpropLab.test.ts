// The backprop lab: every graph's gradients agree with a numerical derivative, L's own is 1, and a value used twice
// gets both paths; every puzzle starts unsolved and is solved by its gradients typed to two decimals, and each kind of
// failed try is told apart where it starts; typed numbers are read in every usual form; free play's steps and nudge,
// the hints and the picture follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  backward,
  BP_GRAPHS,
  BP_LADDER,
  BP_PLOT,
  BP_START,
  bpGraph,
  bpHit,
  bpPos,
  bpPuzzle,
  bpStars,
  bpSvg,
  closeEnough,
  exprOf,
  forward,
  graphOf,
  inputsOf,
  judgeBp,
  num,
  num4,
  nudge,
  paths,
  readAnswer,
  stepped,
  usesOf,
  valuesOf,
  VALUE_MAX,
} from "../src/math/backpropLab.ts";

const P = BP_LADDER;
const close = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;
const truth = (i: number) => {
  const g = bpGraph(P[i].graph);
  return backward(g, forward(g, g.values));
};
const typed = (i: number, change: Record<string, string> = {}) => ({
  ...Object.fromEntries(P[i].blanks.map((id) => [id, String(Math.round(truth(i)[id] * 100) / 100)])),
  ...change,
});
const picture = { blanks: [], answers: {}, hide: [], focus: null, wrong: null, done: false, sel: null, caption: "c" };

test("every gradient is the slope of L: against a numerical derivative, at the given values and others", () => {
  for (const g of BP_GRAPHS) {
    for (const shift of [0, 0.7, -1.3]) {
      const values = Object.fromEntries(Object.entries(g.values).map(([k, v]) => [k, v + shift]));
      const v = forward(g, values);
      const grad = backward(g, v);
      assert.equal(grad.L, 1);
      assert.equal(g.nodes[g.nodes.length - 1].id, "L");
      for (const id of inputsOf(g)) {
        const h = 1e-6;
        const up = forward(g, { ...values, [id]: values[id] + h }).L;
        const down = forward(g, { ...values, [id]: values[id] - h }).L;
        // A ReLU at its kink has no slope; every value here is off it.
        assert.ok(close((up - down) / (2 * h), grad[id], 1e-5), `${g.id}: ∂L/∂${id}`);
      }
    }
  }
  // The classic: q = 3, L = −12; z gets q, q gets z, and x and y get what q gets.
  const c = bpGraph("classic");
  const v = forward(c, c.values);
  assert.deepEqual([v.q, v.L], [3, -12]);
  assert.deepEqual(["q", "z", "x", "y"].map((id) => backward(c, v)[id]), [-4, 3, -4, -4]);
  // x used twice: a path through p and one straight to L, added up.
  const f = bpGraph("fork");
  const fv = forward(f, f.values);
  const fg = backward(f, fv);
  assert.deepEqual(paths(f, fv, fg, "x").map((p) => p.part), [3, 1]);
  assert.equal(fg.x, 4);
});

test("every puzzle starts unsolved, and its gradients to two decimals solve it", () => {
  P.forEach((q, i) => {
    assert.deepEqual(judgeBp(q, {}), { state: "lost", why: "empty", node: q.blanks[0], have: "" }, `puzzle ${i + 1}`);
    assert.deepEqual(judgeBp(q, typed(i)), { state: "won" }, `puzzle ${i + 1}`);
    const g = bpGraph(q.graph);
    const ids = g.nodes.map((n) => n.id);
    for (const id of [...q.blanks, ...q.hide]) assert.ok(ids.includes(id) && id !== "L", `puzzle ${i + 1}: ${id}`);
    assert.ok(q.blanks.every((id) => !q.hide.includes(id)));
    // The boxes go back from L: none before a box of a node it goes into.
    q.blanks.forEach((id, k) => assert.ok(usesOf(g, id, "").every((u) => !q.blanks.slice(k).includes(u.to)), `puzzle ${i + 1}: ${id}`));
  });
  // The ReLU that is off sends nothing back, and log loss gives σ − 1 at z.
  assert.ok(P[5].blanks.every((id) => truth(5)[id] === 0));
  const l = bpGraph("logloss");
  const lv = forward(l, l.values);
  assert.ok(close(backward(l, lv).z, lv.p - 1));
});

test("a failed try says why, at the first box from L that is wrong", () => {
  const why = (i: number, change: Record<string, string>) => {
    const v = judgeBp(P[i], typed(i, change));
    return v.state === "lost" ? [v.why, v.node] : [v.state];
  };
  assert.deepEqual(why(0, { z: "" }), ["empty", "z"]);
  assert.deepEqual(why(0, { q: "four" }), ["bad", "q"]);
  assert.deepEqual(why(0, { q: "4" }), ["sign", "q"]);
  assert.deepEqual(why(3, { x: "3" }), ["path", "x"]);
  assert.deepEqual(why(3, { x: "1" }), ["path", "x"]);
  // w's local slope is x = 2, without the gradient above it, −6.
  assert.deepEqual(why(2, { w: "2" }), ["above", "w"]);
  assert.deepEqual(why(2, { w: "-11" }), ["off", "w"]);
  // Two slips: the one nearer L is told first.
  assert.deepEqual(why(2, { w: "2", e: "6" }), ["sign", "e"]);
  // A ReLU's 0 has no sign to get wrong.
  assert.deepEqual(why(5, { z: "1" }), ["off", "z"]);
});

test("typed numbers: minus signs, commas, fractions; close to two decimals", () => {
  assert.deepEqual(["−4", "-4", " 0,25 ", ".5", "+2", "1/4", "−1/2", "3."].map(readAnswer), [-4, -4, 0.25, 0.5, 2, 0.25, -0.5, 3]);
  for (const bad of ["", "x", "1/0", "--1", "1/2/3", "2e3", "1-"]) assert.equal(readAnswer(bad), null, bad);
  assert.ok(closeEnough(0.69, Math.LN2) && !closeEnough(0.67, Math.LN2) && closeEnough(-12.05, -12) && !closeEnough(0.02, 0));
});

test("free play: inputs step by a half within range, and a nudge shows the gradient", () => {
  assert.equal(stepped(1, 0.5), 1.5);
  assert.equal(stepped(-4.5, -0.5), -VALUE_MAX);
  assert.equal(stepped(VALUE_MAX, 0.5), null);
  const g = bpGraph("neuron");
  const n = nudge(g, g.values, "w");
  assert.equal(n.before, 9);
  assert.ok(close((n.after - n.before) / 0.01, backward(g, forward(g, g.values)).w, 0.05));
  // The graph and values in play: the puzzle's, or free play's own.
  const free = { ...BP_START, mode: "free" as const, graph: "fork" as const, values: { x: 1, y: 1 } };
  assert.equal(graphOf(free).id, "fork");
  assert.deepEqual(valuesOf(free), { x: 1, y: 1 });
  assert.equal(bpPuzzle(free), null);
  assert.equal(graphOf({ ...BP_START, stage: 2 }).id, "neuron");
  assert.equal(valuesOf({ ...BP_START, stage: 2 }), bpGraph("neuron").values);
});

test("the hint: each arrow out of a node, where it goes, and its local slope", () => {
  const n = bpGraph("neuron");
  assert.deepEqual(usesOf(n, "w", "[{a} > 0]"), [{ to: "m", expr: "w × x", slope: "x" }]);
  assert.deepEqual(usesOf(n, "y", ""), [{ to: "e", expr: "s − y", slope: "−1" }]);
  assert.deepEqual(usesOf(n, "e", "").map((u) => [u.expr, u.slope]), [["e²", "2e"]]);
  assert.deepEqual(usesOf(bpGraph("fork"), "x", "").map((u) => u.to), ["p", "L"]);
  assert.deepEqual(usesOf(bpGraph("deep"), "z", "1 if {a} > 0").map((u) => u.slope), ["1 if z > 0"]);
  assert.deepEqual(usesOf(bpGraph("logloss"), "p", "").map((u) => [u.expr, u.slope]), [["−ln p", "−1/p"]]);
  assert.deepEqual(usesOf(bpGraph("sigmoid"), "z", "").map((u) => [u.expr, u.slope]), [["σ(z)", "L(1 − L)"]]);
  assert.deepEqual(usesOf(bpGraph("classic"), "q", "").map((u) => u.slope), ["z"]);
  assert.equal(exprOf(bpGraph("relu").nodes[5]), "ReLU(z)");
  assert.equal(exprOf(n.nodes[0]), "w");
});

test("every picture draws inside its frame, with boxes to fill, gradients shown and hidden", () => {
  for (const g of BP_GRAPHS) {
    const pos = bpPos(g);
    for (const [x, y] of Object.values(pos)) assert.ok(x > 20 && x < BP_PLOT.w - 20 && y > 20 && y < BP_PLOT.h - 50, `${g.id}`);
    const svg = bpSvg(g, g.values, { ...picture, sel: inputsOf(g)[0] });
    assert.doesNotMatch(svg, /NaN|undefined|Infinity/);
    // Every node's gradient is shown in free play.
    assert.equal(svg.match(/fill="#f8f0fc"/g)!.length, g.nodes.length);
    // A tap on a node, or on its box, finds it.
    for (const nd of g.nodes) assert.equal(bpHit(g, pos[nd.id][0], pos[nd.id][1]), nd.id);
  }
  assert.equal(bpHit(BP_GRAPHS[0], 0, 0), null);
  P.forEach((q, i) => {
    const g = bpGraph(q.graph);
    const svg = bpSvg(g, g.values, { ...picture, blanks: q.blanks, hide: q.hide, answers: { [q.blanks[0]]: "<1/4>" }, focus: q.blanks[1], wrong: q.blanks[0] });
    assert.equal(svg.match(/stroke-dasharray/g)!.length, q.blanks.length, `puzzle ${i + 1}`);
    assert.equal(svg.match(/fill="#f8f0fc"/g)!.length, g.nodes.length - q.blanks.length - q.hide.length, `puzzle ${i + 1}`);
    assert.match(svg, /&lt;1\/4&gt;/);
    assert.match(svg, /#e03131/);
  });
  // Done, the boxes turn green; a long answer is cut short.
  const done = bpSvg(bpGraph("classic"), bpGraph("classic").values, { ...picture, blanks: ["q"], answers: { q: "−4.000000" }, done: true });
  assert.match(done, /#2f9e44/);
  assert.match(done, />−4.000…</);
});

test("stars, the start, and numbers for the picture and the nudge", () => {
  assert.deepEqual([bpStars(0), bpStars(1), bpStars(3)], [3, 2, 1]);
  assert.equal(bpPuzzle(BP_START), P[0]);
  assert.deepEqual(BP_START.values, BP_GRAPHS[0].values);
  assert.notEqual(BP_START.values, BP_GRAPHS[0].values);
  assert.deepEqual([num(-0.004), num(0.693), num(-12)], ["0", "0.69", "−12"]);
  assert.deepEqual([num4(-0.12), num4(0.00001), num4(8.8801)], ["−0.12", "0", "8.8801"]);
});
