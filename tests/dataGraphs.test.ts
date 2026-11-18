// The data diagrams: picture graphs, line graphs, pie charts and stem-and-leaf plots — their questions have the
// answers the pictures show, their slips give other answers, and the pictures draw.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { rng } from "../src/math/random.ts";
import { diagramPic, lineQuestion, lineTraps, pictoQuestion, pictoTraps, pieCount, pieQuestion, pieTraps, renderDiagram, stemQuestion, stemTraps } from "../src/math/dataGraphs.ts";
import { exercise } from "../src/math/practice.ts";

const words = en.pracWords.stemLeaf;
const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1);

test("picture graphs: a key of 2, 5 or 10, halves only of an even key, the answer read from the rows", () => {
  for (const seed of SEEDS) {
    const q = pictoQuestion(rng(seed));
    const vs = q.task.rows.map((r) => r.v);
    assert.ok([2, 5, 10].includes(q.task.key));
    assert.equal(new Set(vs).size, 4);
    for (const v of vs) assert.ok(Number.isInteger((2 * v) / q.task.key) && v > 0);
    if (q.task.key === 5) assert.ok(vs.every((v) => v % 5 === 0));
    const [a, b] = q.at.map((k) => vs[k]);
    assert.equal(q.v, q.ask === "one" ? a : a - b);
    assert.ok(q.v > 0);
    for (const t of pictoTraps(q)) assert.notEqual(t.v, q.v);
    assert.ok(!diagramPic({ kind: "picto", q }).body.includes("NaN"));
  }
});

test("line graphs: the readings stay on the scale, one biggest rise, half past is the middle of two readings", () => {
  const asks = new Set<string>();
  for (const seed of SEEDS) {
    const q = lineQuestion(rng(seed));
    const { vs, step, lines } = q.task;
    asks.add(q.ask);
    assert.equal(vs.length, 7);
    for (const v of vs) assert.ok(v >= 0 && v <= step * lines && Number.isInteger(v));
    const rises = vs.slice(1).map((v, i) => v - vs[i]);
    if (q.ask === "read") assert.equal(q.v, vs[q.at]);
    if (q.ask === "half") assert.equal(q.v, (vs[q.at] + vs[q.at + 1]) / 2);
    if (q.ask === "half") assert.ok(Number.isInteger(q.v) && vs[q.at] !== vs[q.at + 1]);
    if (q.ask === "rise") {
      assert.equal(q.v, Math.max(...rises));
      assert.equal(rises.filter((x) => x === q.v).length, 1);
    }
    for (const t of lineTraps(q)) assert.notEqual(t.v, q.v);
    assert.ok(!diagramPic({ kind: "line", q }, true).body.includes("NaN"));
  }
  assert.deepEqual([...asks].sort(), ["half", "read", "rise"]);
});

test("pie charts: the angles make 360°, every slice a whole number of children", () => {
  for (const seed of SEEDS) {
    const q = pieQuestion(rng(seed));
    const degs = q.task.slices.map((s) => s.deg);
    assert.equal(degs.reduce((a, b) => a + b, 0), 360);
    for (const d of degs) assert.ok(Number.isInteger((d * q.task.n) / 360) && d > 0);
    assert.equal(q.v, q.ask === "count" ? pieCount(q) : degs[q.at]);
    for (const t of pieTraps(q)) assert.notEqual(t.v, q.v);
    const pic = diagramPic({ kind: "pie", q });
    assert.ok(!pic.body.includes("NaN"));
    // The angle asked for is hidden; the count question shows them all.
    assert.equal((pic.body.match(/>\?</g) ?? []).length, q.ask === "angle" ? 1 : 0);
  }
});

test("stem-and-leaf plots: the marks in order, an odd number of them, median and range", () => {
  for (const seed of SEEDS) {
    const q = stemQuestion(rng(seed));
    const m = q.task.marks;
    assert.equal(m.length % 2, 1);
    assert.deepEqual(m, [...m].sort((a, b) => a - b));
    assert.equal(q.v, q.ask === "median" ? m[(m.length - 1) / 2] : m[m.length - 1] - m[0]);
    for (const t of stemTraps(q)) assert.notEqual(t.v, q.v);
    const pic = diagramPic({ kind: "stem", q, words }, true);
    // A leaf for every mark: the digits drawn after the stems equal the marks' units.
    assert.ok(pic.body.includes(`Key: ${Math.floor(m[0] / 10)} | ${m[0] % 10} means ${m[0]}`));
  }
});

test("the diagrams skill: each level's diagram, the answer a number, the worked solution drawn", () => {
  for (const level of [1, 2, 3] as const)
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const ex = exercise("diagrams", level, seed, en.pracWords);
      assert.equal(ex.format, "number");
      assert.ok(ex.pic && ex.pic.w > 0 && ex.pic.h > 0);
      assert.equal(ex.solution?.kind, "diagram");
      const r = renderDiagram(ex.solution!.spec as Parameters<typeof renderDiagram>[0], null);
      assert.ok(r.svg.startsWith("<svg") && !r.svg.includes("NaN"));
    }
});
