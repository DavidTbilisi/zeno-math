// The k-means lab: the assign and move steps, the error never rising as they alternate, a run stopping when nothing
// changes, random and k-means++ starts, the lowest error for each k bending at the blobs' number, the disc's own
// cluster on the rings, every puzzle unsolved at its start and won by what it asks, each miss told apart, and the picture.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assignStep,
  bestSse,
  centreAt,
  controlsOf,
  DISC,
  discShare,
  elbowCurve,
  fromPx,
  judgeKm,
  KM_LADDER,
  kmSvg,
  labelsOf,
  moveStep,
  plusStart,
  pointsOf,
  PUZZLE_SEED,
  randomStart,
  run,
  settled,
  sse,
  toPx,
  type LiveKmeans,
  type Pt,
} from "../src/math/kmeansLab.ts";

const words = { error: "error", steps: "after {n} steps", elbow: "elbow", k: "k" };
const base: LiveKmeans = { mode: "puzzle", stage: 0, k: 3, centres: [], labels: null, errs: [], steps: 0, data: "three", seed: 1, starts: 0, tries: 0, done: false, said: null };
const puzzle = (i: number, change: Partial<LiveKmeans> = {}): LiveKmeans => {
  const p = KM_LADDER[i];
  const s = { ...base, stage: i, ...p.start };
  return { ...s, ...(p.controls.includes("k") ? settled(pointsOf(p.data, PUZZLE_SEED), s.k, PUZZLE_SEED) : {}), ...change };
};
const won = (d: LiveKmeans) => judgeKm(d, KM_LADDER[d.stage].goal).state === "won";

test("assign to the nearest centre, move to the mean, and the error", () => {
  const ps: Pt[] = [[0, 0], [0.2, 0], [1, 1], [0.8, 1]];
  const cs: Pt[] = [[0.1, 0.5], [0.9, 0.6]];
  const labels = assignStep(ps, cs);
  assert.deepEqual(labels, [0, 0, 1, 1]);
  const moved = moveStep(ps, labels, cs);
  assert.ok(Math.abs(moved[0][0] - 0.1) < 1e-12 && Math.abs(moved[0][1]) < 1e-12);
  assert.ok(Math.abs(sse(ps, labels, moved) - 4 * 0.01) < 1e-12);
  assert.deepEqual(moveStep(ps, [0, 0, 0, 0], cs)[1], cs[1], "a centre with no points stays");
});

test("a run never raises the error and stops when nothing changes", () => {
  const ps = pointsOf("three", PUZZLE_SEED);
  const out = run(ps, KM_LADDER[0].start.centres!);
  out.errs.forEach((e, i) => i && assert.ok(e <= out.errs[i - 1] + 1e-12, `step ${i} does not raise the error`));
  assert.deepEqual(assignStep(ps, out.centres), out.labels);
  assert.ok(Math.abs(out.errs[out.errs.length - 1] - bestSse(ps, 3)) < 1e-9);
  assert.equal(randomStart(ps, 4, 2).length, 4);
  assert.deepEqual(randomStart(ps, 4, 2), randomStart(ps, 4, 2));
  const plus = plusStart(ps, 3, 5);
  assert.equal(plus.length, 3);
  assert.ok(plus.every((c) => ps.some((p) => p[0] === c[0] && p[1] === c[1])), "k-means++ picks data points");
});

test("the lowest error for each k falls, and bends at the number of blobs", () => {
  const curve = elbowCurve(pointsOf("four", PUZZLE_SEED));
  curve.forEach((e, i) => i && assert.ok(e <= curve[i - 1] + 1e-12));
  const drops = curve.slice(1).map((e, i) => curve[i] - e);
  assert.ok(drops[2] > 3 * drops[3], "the drop to k = 4 dwarfs the one after");
  assert.equal(bestSse(pointsOf("four", PUZZLE_SEED), 4), curve[3], "remembered");
});

test("the disc gets a cluster of its own only once the ring is cut into enough pieces", () => {
  const ps = pointsOf("rings", PUZZLE_SEED);
  assert.equal(ps.length, 60);
  assert.ok(ps.slice(0, DISC).every((p) => Math.hypot(p[0] - 0.5, p[1] - 0.5) < 0.12));
  assert.equal(discShare(settled(ps, 2, PUZZLE_SEED).labels!), 0);
  assert.equal(discShare(settled(ps, 6, PUZZLE_SEED).labels!), 1);
  assert.equal(discShare([...Array(DISC).fill(0), ...Array(42).fill(1)]), 1);
});

test("every puzzle is unsolved at its start and won by what it asks", () => {
  KM_LADDER.forEach((_, i) => assert.ok(!won(puzzle(i)), `puzzle ${i + 1} starts unsolved`));
  const ps = pointsOf("three", PUZZLE_SEED);
  const done = run(ps, KM_LADDER[0].start.centres!);
  assert.ok(won(puzzle(0, { centres: done.centres, labels: done.labels })));
  assert.ok(won(puzzle(1, { centres: done.centres })), "centres dragged onto the blobs (shown live)");
  const fixed = run(ps, plusStart(ps, 3, 1));
  assert.ok(won(puzzle(2, { centres: fixed.centres, labels: fixed.labels })));
  assert.ok(won(puzzle(3, settled(pointsOf("four", PUZZLE_SEED), 4, PUZZLE_SEED))));
  const ks = [2, 3, 4, 5, 6, 7, 8].filter((k) => won(puzzle(4, settled(pointsOf("rings", PUZZLE_SEED), k, PUZZLE_SEED))));
  assert.equal(ks[0], 6);
  assert.deepEqual(controlsOf(puzzle(1)), ["drag"]);
  assert.deepEqual(controlsOf({ ...base, mode: "free" }), ["step", "drag", "run", "starts", "k"]);
  assert.equal(labelsOf(puzzle(0), ps), null, "only a live puzzle colours points before assigning");
  assert.equal(labelsOf(puzzle(1), ps)!.length, ps.length);
});

test("a miss says why", () => {
  const why = (d: LiveKmeans) => {
    const v = judgeKm(d, KM_LADDER[d.stage].goal);
    return v.state === "lost" ? v : null;
  };
  const ps = pointsOf("three", PUZZLE_SEED);
  assert.equal(why(puzzle(0))!.why, "notConverged");
  const once = assignStep(ps, KM_LADDER[0].start.centres!);
  assert.equal(why(puzzle(0, { labels: once }))!.why, "notConverged", "assigned but not moved");
  assert.equal(why(puzzle(2))!.why, "errorHigh");
  assert.deepEqual([why(puzzle(3))!.why, why(puzzle(3))!.have, why(puzzle(3))!.want], ["fewK", 2, 3]);
  const many = why(puzzle(3, settled(pointsOf("four", PUZZLE_SEED), 6, PUZZLE_SEED)))!;
  assert.deepEqual([many.why, many.have, many.want], ["manyK", 6, 5]);
  assert.equal(why(puzzle(4))!.why, "discMixed");
});

test("the plane maps to pixels and back, a centre is grabbed near it, and the picture is drawn", () => {
  assert.deepEqual(fromPx(...toPx(0.25, 0.75)), [0.25, 0.75]);
  const cs: Pt[] = [[0.2, 0.2], [0.8, 0.8]];
  assert.equal(centreAt(cs, ...toPx(0.8, 0.8)), 1);
  assert.equal(centreAt(cs, ...toPx(0.5, 0.5)), null);
  for (const d of [puzzle(0), puzzle(1), puzzle(2), puzzle(3), puzzle(4), { ...base, mode: "free" as const, data: "even" as const, centres: [[0.5, 0.5]] as Pt[], k: 1 }]) {
    const svg = kmSvg(d, words);
    assert.ok(!/NaN|Infinity/.test(svg));
  }
  assert.ok(kmSvg(puzzle(0), words).includes("error = —"), "no error before the first assignment");
});
