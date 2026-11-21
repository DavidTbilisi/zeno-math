// The board's paper (#453): which marks each paper draws, and where points snap on isometric and polar paper.
import { test } from "node:test";
import assert from "node:assert/strict";
import { installPaper, isPaper, PAPERS, paperMarks, paperMove, paperSnap, snapIso, snapPolar } from "../src/paper.ts";

const box = { x0: -100, y0: -100, x1: 100, y1: 100 };
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

test("every paper name is a paper, and nothing else is", () => {
  for (const p of PAPERS) assert.ok(isPaper(p));
  assert.ok(!isPaper("hex"));
  assert.ok(!isPaper(undefined));
});

test("plain paper draws nothing; squares draw a line every square both ways", () => {
  const plain = paperMarks("plain", box, 20, 1);
  assert.equal(plain.lines.length + plain.dots.length + plain.rings.length + plain.labels.length, 0);
  const sq = paperMarks("squares", box, 20, 1);
  // -100, -80 … 100: 11 lines each way.
  assert.equal(sq.lines.length, 22);
  assert.ok(sq.lines.every((l) => l.tone === "minor"));
});

test("graph paper makes every fifth line darker", () => {
  const g = paperMarks("graph", box, 20, 1);
  const major = g.lines.filter((l) => l.tone === "major");
  // x = -100, 0, 100 and y the same.
  assert.equal(major.length, 6);
  assert.ok(major.every((l) => near(l.x1 % 100, 0) && near(l.y1 % 100, 0)));
});

test("zoomed far out, the lines that would crowd together are left out", () => {
  const g = paperMarks("graph", { x0: 0, y0: 0, x1: 1000, y1: 1000 }, 20, 0.2);
  // 20 units at 0.2 is 4 px apart: only the every-fifth lines stay (100 units, 20 px).
  assert.ok(g.lines.every((l) => l.tone === "major"));
  assert.equal(g.lines.length, 22);
  const d = paperMarks("dots", { x0: 0, y0: 0, x1: 1000, y1: 1000 }, 20, 0.2);
  assert.equal(d.dots.length, 11 * 11);
});

test("dotted paper has a dot on every corner of the squares", () => {
  const d = paperMarks("dots", { x0: 0, y0: 0, x1: 40, y1: 40 }, 20, 1);
  assert.deepEqual(d.dots.map((p) => [p.x, p.y]), [[0, 0], [0, 20], [0, 40], [20, 0], [20, 20], [20, 40], [40, 0], [40, 20], [40, 40]]);
});

test("isometric dots: columns √3/2 apart, each one a step from six neighbours", () => {
  const { dots } = paperMarks("isoDots", box, 20, 1);
  const h = 10 * Math.sqrt(3);
  assert.ok(dots.some((p) => near(p.x, 0) && near(p.y, 0)));
  assert.ok(dots.some((p) => near(p.x, h) && near(p.y, 10)));
  assert.ok(dots.some((p) => near(p.x, h) && near(p.y, -10)));
  const around = dots.filter((p) => Math.abs(Math.hypot(p.x, p.y) - 20) < 1e-6);
  assert.equal(around.length, 6);
  // No dot closer than one step to another.
  const nearest = Math.min(...dots.filter((p) => p.x || p.y).map((p) => Math.hypot(p.x, p.y)));
  assert.ok(near(nearest, 20));
});

test("isometric lines pass through the lattice: verticals and the two 30° families", () => {
  const { lines } = paperMarks("isoLines", box, 20, 1);
  const slopes = new Set(lines.map((l) => (l.x1 === l.x2 ? "|" : ((l.y2 - l.y1) / (l.x2 - l.x1)).toFixed(4))));
  assert.deepEqual([...slopes].sort(), [(-1 / Math.sqrt(3)).toFixed(4), (1 / Math.sqrt(3)).toFixed(4), "|"].sort());
  // A rising line through (√3/2·20, 10), a lattice point.
  const h = 10 * Math.sqrt(3);
  const on = lines.filter((l) => l.x1 !== l.x2).some((l) => near(l.y1 + ((h - l.x1) * (l.y2 - l.y1)) / (l.x2 - l.x1), 10));
  assert.ok(on);
});

test("the coordinate plane draws both axes and numbers them, y upwards", () => {
  const a = paperMarks("axes", box, 20, 1);
  const axes = a.lines.filter((l) => l.tone === "axis");
  assert.equal(axes.length, 2);
  const x2 = a.labels.find((l) => l.text === "2" && l.base === "top");
  assert.equal(x2?.x, 40);
  // Scene y grows downwards, so the "2" on the y-axis is 40 above the origin.
  const y2 = a.labels.find((l) => l.text === "2" && l.align === "right" && l.base === "middle");
  assert.equal(y2?.y, -40);
  assert.ok(a.labels.some((l) => l.text === "0"));
});

test("polar paper: rings a square apart, a ray every 15°, the axes darker", () => {
  const p = paperMarks("polar", box, 20, 1);
  assert.equal(p.lines.length, 24);
  assert.equal(p.lines.filter((l) => l.tone === "axis").length, 4);
  assert.deepEqual(p.rings.slice(0, 3).map((r) => r.r), [20, 40, 60]);
  assert.equal(p.rings.find((r) => r.r === 100)?.tone, "major");
});

test("lined paper: a ruled line every two squares", () => {
  const l = paperMarks("lined", box, 20, 1);
  assert.deepEqual(l.lines.map((x) => x.y1), [-80, -40, 0, 40, 80]);
});

test("a point snaps to the nearest isometric dot", () => {
  const h = 10 * Math.sqrt(3);
  assert.deepEqual(snapIso(1, -2, 20), [0, 0]);
  const [x, y] = snapIso(h - 1, 11, 20);
  assert.ok(near(x, h) && near(y, 10));
  // Halfway between columns, the nearer row wins.
  const [x2, y2] = snapIso(h / 2, 19, 20);
  assert.ok(near(Math.hypot(x2 - h / 2, y2 - 19), Math.min(Math.hypot(0 - h / 2, 20 - 19), Math.hypot(h - h / 2, 10 - 19))));
});

test("a point on polar paper snaps to a ring and a 15° ray", () => {
  const [x, y] = snapPolar(38, -12, 20);
  const r = Math.hypot(x, y);
  const deg = (Math.atan2(-y, x) * 180) / Math.PI;
  assert.ok(near(r, 40));
  assert.ok(near(deg, 15));
  assert.deepEqual(snapPolar(3, 4, 20), [0, 0]);
});

test("square papers keep Excalidraw's own snapping; a drag on isometric paper moves by whole dots", () => {
  assert.equal(paperSnap("graph"), undefined);
  assert.equal(paperMove("axes"), undefined);
  const move = paperMove("isoDots")!;
  const h = 10 * Math.sqrt(3);
  const [x, y] = move(5, 7, h + 2, 9, 20);
  assert.ok(near(x - 5, h) && near(y - 7, 10));
});

test("installing a paper sets Excalidraw's hooks; plain takes them away", () => {
  installPaper("isoDots");
  assert.ok(globalThis.__zenoPaper?.snap);
  // An export without its background has no paper: Excalidraw is told to draw its own (none).
  assert.equal(globalThis.__zenoPaper!.draw({} as CanvasRenderingContext2D, { scrollX: 0, scrollY: 0, zoom: { value: 1 }, viewBackgroundColor: null }, false, true, 10, 10), false);
  installPaper("squares");
  assert.equal(globalThis.__zenoPaper?.snap, undefined);
  installPaper("plain");
  assert.equal(globalThis.__zenoPaper, undefined);
});
