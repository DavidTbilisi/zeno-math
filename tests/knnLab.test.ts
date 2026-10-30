// The nearest-neighbours lab: distances straight and along the axes, in the features' units or scaled, the vote of the
// k nearest with a tie going to the nearest, accuracy on the training and the test points (k = 1 perfect on the first,
// worse than a middle k on the second), distances in many dimensions crowding together, every puzzle unsolved at its
// start and won by the change it asks for, each kind of miss told apart, and the picture.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  accuracy,
  bestTest,
  controlsOf,
  curseOf,
  DIMS,
  distance,
  fromPx,
  judgeKnn,
  KNN_LADDER,
  KNN_START,
  knnSvg,
  pointsOf,
  PUZZLE_SEED,
  testOf,
  toPx,
  trainOf,
  unitsOf,
  vote,
  type KPoint,
  type LiveKnn,
} from "../src/math/knnLab.ts";

const words = { vote: "vote", called: "called", test: "test", train: "train", dims: "in {d} dimensions", ratio: "ratio", near: "near", far: "far", classes: ["blue", "orange"] };
const puzzle = (i: number, change: Partial<LiveKnn> = {}): LiveKnn => ({ ...KNN_START, stage: i, ...KNN_LADDER[i].start, ...change });
const won = (d: LiveKnn) => judgeKnn(d, KNN_LADDER[d.stage].goal).state === "won";
const flat = { metric: "euclid" as const, scaled: true, units: [1, 1] as [number, number] };

test("distances straight and along the axes, in the features' units or scaled", () => {
  const [a, b] = [{ x: 0, y: 0 }, { x: 0.3, y: 0.4 }];
  assert.ok(Math.abs(distance(a, b, "euclid", [1, 1], true) - 0.5) < 1e-12);
  assert.ok(Math.abs(distance(a, b, "manhattan", [1, 1], true) - 0.7) < 1e-12);
  // Unscaled, the feature in thousands swamps the other.
  assert.ok(Math.abs(distance(a, b, "euclid", [1000, 1], false) - Math.hypot(300, 0.4)) < 1e-9);
  assert.ok(Math.abs(distance(a, b, "euclid", [1000, 1], true) - 0.5) < 1e-12);
  assert.deepEqual(unitsOf("units"), [1000, 1]);
  assert.deepEqual(unitsOf("blobs"), [1, 1]);
});

test("the k nearest vote, and a tie goes to the nearest one", () => {
  const pts: KPoint[] = [{ x: 0.1, y: 0, c: 1 }, { x: 0.2, y: 0, c: 0 }, { x: 0.3, y: 0, c: 0 }, { x: 0.9, y: 0.9, c: 1 }];
  const q = { x: 0, y: 0 };
  assert.equal(vote(q, pts, { ...flat, k: 1 }).c, 1);
  assert.deepEqual(vote(q, pts, { ...flat, k: 3 }).votes, [2, 1]);
  assert.equal(vote(q, pts, { ...flat, k: 3 }).c, 0);
  // 2 against 2: the nearest point is orange.
  assert.equal(vote(q, pts, { ...flat, k: 4 }).c, 1);
  assert.deepEqual(vote(q, pts, { ...flat, k: 2 }).near.map((n) => n.p.x), [0.1, 0.2]);
});

test("the datasets: training and test points, and k = 1 perfect on training but beaten on test", () => {
  const ps = pointsOf("blobs", PUZZLE_SEED);
  const [train, test2] = [trainOf(ps), testOf(ps)];
  assert.equal(train.length, 50);
  assert.equal(test2.length, 40);
  assert.ok(ps.every((p) => p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1));
  assert.equal(accuracy(train, train, { ...flat, k: 1 }), 1);
  assert.ok(accuracy(test2, train, { ...flat, k: 1 }) < bestTest(ps, flat) - 0.1);
  assert.ok(Number.isNaN(accuracy([], train, { ...flat, k: 1 })));
  assert.deepEqual(pointsOf("rings", 3), pointsOf("rings", 3), "a seed gives the same points");
  assert.ok(testOf(pointsOf("rings", 3)).length > 0);
  // On "units" the class follows the second feature.
  assert.ok(pointsOf("units", 2).every((p) => p.c === (p.y > 0.5 ? 1 : 0)));
});

test("in more dimensions the nearest of many points is almost as far as the farthest", () => {
  const ratios = DIMS.map((d) => curseOf(d).ratio);
  assert.ok(ratios[1] < 0.2 && ratios[ratios.length - 1] > 0.8);
  assert.ok(ratios.every((r) => r > 0 || r === ratios[0]));
  const c = curseOf(10);
  assert.equal(c.ds.length, 100);
  assert.equal(c.ds[c.ds.length - 1], 1);
  assert.equal(curseOf(10), c, "remembered");
});

test("every puzzle is unsolved at its start and won by the change it asks for", () => {
  KNN_LADDER.forEach((_, i) => assert.ok(!won(puzzle(i)), `puzzle ${i + 1} starts unsolved`));
  assert.ok(won(puzzle(0, { q: [0.75, 0.75] })), "dragged into the orange blob");
  assert.ok(won(puzzle(1, { k: 7 })), "a larger k outvotes the noisy point");
  const best = [...Array(25)].map((_, k) => k + 1).filter((k) => won(puzzle(2, { k })));
  assert.ok(best.length > 0 && !best.includes(1) && !best.includes(25), `the best k is in the middle: ${best}`);
  assert.ok(won(puzzle(3, { scaled: true })), "scaling the features");
  assert.ok(won(puzzle(4, { metric: "manhattan" })), "distance along the axes");
  assert.ok(won(puzzle(5, { dims: 100 })), "100 dimensions");
  assert.deepEqual(controlsOf(puzzle(0)), ["drag"]);
  assert.deepEqual(controlsOf({ ...KNN_START, mode: "free" }), ["drag", "k", "scale", "metric", "dims"]);
});

test("a miss says why", () => {
  assert.deepEqual(judgeKnn(puzzle(0), KNN_LADDER[0].goal), { state: "lost", why: "wrongClass", have: 0, want: 1 });
  const v = judgeKnn(puzzle(2), KNN_LADDER[2].goal);
  assert.equal(v.state === "lost" && v.why, "notBest");
  const c = judgeKnn(puzzle(5), KNN_LADDER[5].goal);
  assert.ok(c.state === "lost" && c.why === "tooSpread" && c.want === 0.6);
});

test("the plane maps points to pixels and back, and the picture is drawn", () => {
  assert.deepEqual(fromPx(...toPx(0.25, 0.75)), [0.25, 0.75]);
  assert.deepEqual(fromPx(-50, 9999), [0, 0], "kept on the plane");
  for (const d of [puzzle(2), puzzle(3), puzzle(4, { metric: "manhattan" }), { ...KNN_START, mode: "free" as const, data: "rings" as const, regions: true, dims: 1000 }]) {
    const svg = knnSvg(d, words);
    assert.ok(!/NaN|Infinity/.test(svg));
    assert.ok(svg.includes("vote, k = "));
  }
  assert.ok(knnSvg(puzzle(2), words).includes("opacity=\"0.16\""), "the regions are shaded");
  assert.ok(!knnSvg(puzzle(3), words).includes(">test<"), "no test points, no accuracies");
  assert.ok(knnSvg(puzzle(4, { metric: "manhattan" }), words).includes("<polygon"), "a diamond for distance along the axes");
});
