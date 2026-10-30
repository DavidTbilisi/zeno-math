// The decision-tree lab: Gini and entropy, the fall in impurity from a cut, the best cut found among the half-way
// points, trees from hand-made splits and grown greedily (boxes, leaves, depth), a forest's vote, every puzzle unsolved
// at its start and won by the cuts or the setting it asks for, each kind of miss told apart, and the picture.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  accuracy,
  bestSplit,
  callOf,
  controlsOf,
  depthOf,
  findNode,
  forestOf,
  forestVote,
  fromPx,
  gain,
  grow,
  impurity,
  judgeTree,
  leafAt,
  leaves,
  modelOf,
  pointsOf,
  snapT,
  testOf,
  toPx,
  trainOf,
  TREE_LADDER,
  TREE_START,
  treeOf,
  treeSvg,
  type LiveTree,
  type TPoint,
} from "../src/math/treeLab.ts";

const words = { box: "box", cut: "cut", after: "after", fall: "falls", best: "best", treeSize: "tree {n}", depthIs: "depth {d}", train: "train", test: "test", forest: "forest", tapBox: "tap", measures: { gini: "Gini", entropy: "entropy" } };
const puzzle = (i: number, change: Partial<LiveTree> = {}): LiveTree => ({ ...TREE_START, stage: i, ...TREE_LADDER[i].start, ...change });
const won = (d: LiveTree) => judgeTree(d, TREE_LADDER[d.stage].goal).state === "won";
const close = (a: number, b: number) => Math.abs(a - b) < 1e-12;

test("Gini and entropy: 0 for a pure box, highest half and half", () => {
  assert.equal(impurity(5, 0, "gini"), 0);
  assert.equal(impurity(0, 0, "entropy"), 0);
  assert.ok(close(impurity(3, 3, "gini"), 0.5));
  assert.ok(close(impurity(3, 3, "entropy"), 1));
  assert.ok(close(impurity(1, 3, "gini"), 1 - (1 / 16 + 9 / 16)));
  assert.ok(close(impurity(1, 3, "entropy"), -(0.25 * Math.log2(0.25) + 0.75 * Math.log2(0.75))));
});

test("a cut's fall in impurity, and the best cut half-way between two values", () => {
  const ps: TPoint[] = [{ x: 0.1, y: 0.9, c: 0 }, { x: 0.2, y: 0.1, c: 0 }, { x: 0.7, y: 0.8, c: 1 }, { x: 0.8, y: 0.2, c: 1 }];
  assert.ok(close(gain(ps, 0, 0.5, "gini"), 0.5), "a clean cut removes all of it");
  assert.ok(close(gain(ps, 1, 0.5, "gini"), 0), "a cut across the other feature removes nothing");
  assert.deepEqual(bestSplit(ps, "gini"), { axis: 0, t: 0.45, gain: 0.5 });
  assert.equal(gain([], 0, 0.5, "gini"), 0);
  assert.equal(bestSplit([ps[0]], "gini"), null);
  assert.equal(snapT(0.4288), 0.43);
  assert.equal(snapT(0.4226), 0.425);
});

test("trees: hand-made splits make boxes, and a grown tree stops when pure", () => {
  const ps = trainOf(pointsOf("corner", 1));
  const t = treeOf([{ path: "", axis: 0, t: 0.5 }, { path: "R", axis: 1, t: 0.5 }, { path: "LL", axis: 1, t: 0.2 }], ps);
  assert.equal(leaves(t).length, 3, "a split of a box never made is left out");
  assert.deepEqual(findNode(t, "RR")!.box, { x0: 0.5, x1: 1, y0: 0.5, y1: 1 });
  assert.equal(findNode(t, "Q"), null);
  assert.equal(callOf(leafAt(t, { x: 0.9, y: 0.9 })), 1);
  assert.equal(callOf(leafAt(t, { x: 0.9, y: 0.1 })), 0);
  assert.equal(depthOf(t), 2);
  const g = grow(ps, 10, "gini");
  assert.ok(leaves(g).every((l) => !l.n[0] || !l.n[1]), "grown until every box is pure");
  assert.equal(accuracy({ tree: g }, ps), 1);
  assert.equal(depthOf(grow(ps, 1, "entropy")), 1);
  assert.ok(Number.isNaN(accuracy({ tree: g }, [])));
});

test("a forest: many trees on resamples, voting", () => {
  const ps = pointsOf("blobs", 13);
  const f = forestOf(trainOf(ps), 10, "gini", 13);
  assert.equal(f.length, 10);
  assert.equal(forestOf(trainOf(ps), 10, "gini", 13), f, "remembered");
  const v = forestVote(f, { x: 0.9, y: 0.9 });
  assert.ok(v > 0.5 && v <= 1);
  assert.ok(accuracy({ forest: f }, testOf(ps)) > 0.6);
  assert.ok("forest" in modelOf(puzzle(5, { trees: 3 }), trainOf(ps)));
  assert.ok("tree" in modelOf(puzzle(5, { trees: 1 }), trainOf(ps)));
});

test("every puzzle is unsolved at its start and won by what it asks for", () => {
  TREE_LADDER.forEach((_, i) => assert.ok(!won(puzzle(i)), `puzzle ${i + 1} starts unsolved`));
  assert.ok(won(puzzle(0, { splits: [{ path: "", axis: 0, t: 0.6 }] })));
  const b = bestSplit(trainOf(pointsOf("blobs", 3)), "gini")!;
  assert.ok(won(puzzle(1, { splits: [{ path: "", axis: b.axis, t: b.t }] })));
  assert.ok(won(puzzle(2, { splits: [{ path: "", axis: 0, t: 0.5 }, { path: "R", axis: 1, t: 0.5 }] })));
  assert.ok(won(puzzle(3, { splits: [{ path: "", axis: 0, t: 0.5 }, { path: "L", axis: 1, t: 0.5 }, { path: "R", axis: 1, t: 0.5 }] })));
  const depths = [...Array(10)].map((_, i) => i + 1).filter((depth) => won(puzzle(4, { depth })));
  assert.ok(depths.length && !depths.includes(10), `a shallow depth does best: ${depths}`);
  assert.ok(!won(puzzle(5, { trees: 1 })) && won(puzzle(5, { trees: 30 })));
  assert.deepEqual(controlsOf(puzzle(4)), ["depth"]);
  assert.deepEqual(controlsOf({ ...TREE_START, mode: "free" }), ["split", "measure", "depth", "forest"]);
});

test("a miss says why", () => {
  const why = (d: LiveTree) => {
    const v = judgeTree(d, TREE_LADDER[d.stage].goal);
    return v.state === "lost" ? [v.why, v.have, v.want] : null;
  };
  assert.deepEqual(why(puzzle(0)), ["noSplit", 0, 1]);
  assert.equal(why(puzzle(0, { splits: [{ path: "", axis: 1, t: 0.5 }] }))![0], "impure");
  const four = [{ path: "", axis: 0 as const, t: 0.5 }, { path: "R", axis: 1 as const, t: 0.5 }, { path: "L", axis: 1 as const, t: 0.5 }];
  assert.deepEqual(why(puzzle(2, { splits: four })), ["tooMany", 4, 3]);
  assert.equal(why(puzzle(1, { splits: [{ path: "", axis: 1, t: 0.9 }] }))![0], "notBest");
  assert.equal(why(puzzle(1))![0], "noSplit");
  assert.equal(why(puzzle(4))![0], "notBestDepth");
  assert.equal(why(puzzle(5))![0], "forestLow");
});

test("the plane maps points to pixels and back, and the picture is drawn", () => {
  const [x, y] = fromPx(...toPx(0.25, 0.75));
  assert.ok(close(x, 0.25) && close(y, 0.75));
  assert.deepEqual(fromPx(-50, 9999), [0, 0]);
  const states = [puzzle(0, { axis: 0, t: 0.6 }), puzzle(2, { splits: [{ path: "", axis: 0, t: 0.5 }], sel: "R" }), puzzle(4, { depth: 10 }), puzzle(5, { trees: 10 }), puzzle(1, { sel: null })];
  for (const d of states) {
    const svg = treeSvg(d, words, true);
    assert.ok(!/NaN|Infinity/.test(svg));
  }
  assert.ok(treeSvg(puzzle(1), words, true).includes("best: "), "free play shows the best cut");
  assert.ok(!treeSvg(puzzle(1), words, false).includes("best: "));
  assert.ok(treeSvg(puzzle(4, { depth: 2 }), words, false).includes("depth 2"));
  assert.ok(treeSvg(puzzle(5, { trees: 10 }), words, false).includes("forest: 10"));
  assert.ok(treeSvg(puzzle(1, { sel: null }), words, false).includes(">tap<"));
});
