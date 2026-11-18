// Make the diagram: the ladder's kinds, what a tap or a drag draws, when the drawing is right, the slips told apart,
// the notices, and the pictures.
import { test } from "node:test";
import assert from "node:assert/strict";
import { lineGeom, MAKE_LADDER, makeNotice, makeNow, makeStars, makeSvg, makeTask, moveEnd, PIE_STEP, pieChildren, pieEnds, pieGeom, pictoGeom, slipAt, SLOTS, targetOf, wrongParts, type MakeTask } from "../src/math/makeDiagram.ts";
import { rng } from "../src/math/random.ts";

/** The drawing that is right: the faces, the temperatures, or the slices' ends. */
function rightDrawn(m: MakeTask): (number | null)[] {
  const want = targetOf(m);
  if (m.kind !== "pie") return want;
  return want.slice(0, -1).map((_, i) => want.slice(0, i + 1).reduce((a, b) => a + b, 0));
}

test("the ladder: three picture graphs, three line graphs, three pie charts, each puzzle the same every time", () => {
  assert.equal(MAKE_LADDER.length, 9);
  assert.deepEqual(MAKE_LADDER.map((s) => s.level), [1, 1, 1, 2, 2, 2, 3, 3, 3]);
  MAKE_LADDER.forEach((s, stage) => {
    const m = makeNow({ mode: "puzzle", stage, level: 1, seed: 1 });
    assert.equal(m.kind, ["picto", "line", "pie"][s.level - 1]);
    assert.deepEqual(m, makeTask(s.level, rng(s.seed)));
  });
  assert.equal(makeNow({ mode: "endless", stage: 0, level: 3, seed: 5 }).kind, "pie");
});

test("every diagram can be drawn: the faces fit the places, the temperatures the scale, the angles the 15° steps", () => {
  for (let seed = 1; seed <= 200; seed++)
    for (const level of [1, 2, 3] as const) {
      const m = makeTask(level, rng(seed));
      const want = targetOf(m);
      if (m.kind === "picto") for (const f of want) assert.ok(f > 0 && f <= SLOTS && (f * 2) % 1 === 0);
      if (m.kind === "line") for (const v of want) assert.ok(v >= 0 && v <= lineGeom(m.t).top && v % lineGeom(m.t).grain === 0);
      if (m.kind === "pie") for (const a of want) assert.ok(a % PIE_STEP === 0 && a >= PIE_STEP);
      assert.deepEqual(wrongParts(m, rightDrawn(m)), []);
      assert.equal(slipAt(m, rightDrawn(m)), -1);
      assert.ok(wrongParts(m, []).length > 0);
    }
});

test("a picture graph: a tap fills a row to the place tapped, half a face on its left half when the key is even", () => {
  const m = makeTask(1, rng(3));
  assert.equal(m.kind, "picto");
  if (m.kind !== "picto") return;
  const G = pictoGeom(m.t);
  const place = (k: number, part: number) => 56 + (k + part) * 34;
  assert.equal(G.facesAt(40), 0);
  assert.equal(G.facesAt(place(2, 0.9)), 3);
  assert.equal(G.facesAt(place(2, 0.2)), m.t.key % 2 === 0 ? 2.5 : 3);
  assert.equal(G.facesAt(place(40, 0.9)), SLOTS);
  assert.equal(G.rowAt(G.rowY(1)), 1);
  assert.equal(G.rowAt(-5), -1);
  // As many faces as the number: each face taken for 1.
  const slip = m.t.rows.map((r, i) => (i === 2 ? r.v : r.v / m.t.key));
  if (m.t.rows[2].v <= SLOTS) assert.equal(slipAt(m, slip), 2);
  assert.deepEqual(wrongParts(m, slip), m.t.rows[2].v === m.t.rows[2].v / m.t.key ? [] : [2]);
});

test("a line graph: a tap reads the height to the scale's grain; a point at as many lines as degrees is the slip", () => {
  for (let seed = 1; seed <= 60; seed++) {
    const m = makeTask(2, rng(seed));
    if (m.kind !== "line") continue;
    const G = lineGeom(m.t);
    assert.equal(G.colAt(G.X(3)), 3);
    assert.equal(G.colAt(G.X(0) - 40), -1);
    assert.equal(G.valueAt(G.Y(m.t.vs[2])), m.t.vs[2]);
    assert.equal(G.valueAt(-100), G.top);
    assert.equal(G.valueAt(G.foot + 50), 0);
    const k = m.t.vs.findIndex((v) => v > 0 && v * m.t.step <= G.top && v * m.t.step !== v);
    if (k < 0) continue;
    const drawn = m.t.vs.map((v, j) => (j === k ? v * m.t.step : v));
    assert.equal(slipAt(m, drawn), k);
    assert.deepEqual(wrongParts(m, drawn), [k]);
  }
});

test("a pie chart: an even start, ends moved in steps that push their neighbours, the slip of degrees for children", () => {
  for (let seed = 1; seed <= 60; seed++) {
    const m = makeTask(3, rng(seed));
    if (m.kind !== "pie") continue;
    const k = m.t.slices.length;
    assert.deepEqual(pieEnds(m.t, []), k === 3 ? [120, 240, 360] : [90, 180, 270, 360]);
    // Pushed to the far end: every other end a step apart behind it.
    const far = moveEnd(m.t, [], 0, 400);
    assert.equal(far[0], 360 - (k - 1) * PIE_STEP);
    for (let i = 1; i < far.length; i++) assert.equal(far[i]! - far[i - 1]!, PIE_STEP);
    const near = moveEnd(m.t, [], k - 2, -20);
    assert.equal(near[k - 2], (k - 1) * PIE_STEP);
    const G = pieGeom();
    assert.equal(G.angleAt(...G.at(90, 50)), 90);
    assert.equal(G.angleAt(...G.at(356, 50)), 0);
    const i = m.t.slices.findIndex((_, j) => j < k - 1 && pieChildren(m.t, j) % PIE_STEP === 0 && pieChildren(m.t, j) !== m.t.slices[j].deg);
    if (i < 0) continue;
    const ends = rightDrawn(m).map((e, j) => (j === i ? (i ? (rightDrawn(m)[i - 1] as number) : 0) + pieChildren(m.t, i) : e));
    if (ends.some((e, j) => j && e! <= ends[j - 1]!)) continue;
    assert.equal(slipAt(m, ends), i);
  }
});

test("stars and notices: three at the first check; half a face, a point between lines, any pie; ten in a row", () => {
  assert.deepEqual([0, 1, 2, 5].map(makeStars), [3, 2, 1, 1]);
  const kinds = new Set<string>();
  for (let seed = 1; seed <= 80; seed++)
    for (const level of [1, 2, 3] as const) {
      const m = makeTask(level, rng(seed));
      const n = makeNotice(m, 0, 3);
      if (n) kinds.add(n);
      assert.equal(makeNotice(m, 1, 3), null);
      assert.equal(makeNotice(m, 1, 10), "streak10");
    }
  assert.deepEqual([...kinds].sort(), ["between", "half", "pie"]);
});

test("the pictures: empty places, faces, points and dots as drawn, wrong parts orange, all green when done", () => {
  for (const level of [1, 2, 3] as const) {
    const m = makeTask(level, rng(7));
    const empty = makeSvg(m, []);
    assert.ok(empty.w > 0 && empty.h > 0 && !empty.body.includes("NaN"));
    const wrong = makeSvg(m, [], { wrong: [0] });
    assert.ok(wrong.body.includes(m.kind === "picto" ? "#ffe8cc" : m.kind === "line" ? "stroke-dasharray=\"5 3\"" : "#e8590c"));
    const done = makeSvg(m, rightDrawn(m), { done: true });
    assert.ok(!done.body.includes("NaN"));
    if (m.kind === "pie") assert.ok(!done.body.includes('r="9"'), "no dots to drag once done");
    if (m.kind === "picto") assert.equal((empty.body.match(/stroke-dasharray="3 3"/g) ?? []).length, SLOTS * m.t.rows.length);
  }
});
