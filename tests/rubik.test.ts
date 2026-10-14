// The Rubik's cube: face turns as sticker permutations, sequences written and read, orders, scrambles, the path the
// animation takes between two cubes, and the circle picture.
import { test } from "node:test";
import assert from "node:assert/strict";
import { rng } from "../src/math/random.ts";
import {
  axisOf,
  common,
  bandCentre,
  bandRadius,
  colorsAfter,
  cycleLengths,
  dotAt,
  dotDuring,
  FACES,
  inverseSeq,
  isSolved,
  movePerm,
  movesText,
  NORMAL,
  onLayer,
  order,
  parseMoves,
  path,
  POSITIONS,
  ringCentre,
  scramble,
  STICKERS,
  type Layout,
  type Move,
} from "../src/math/rubik.ts";

const seq = (s: string) => parseMoves(s)!;

test("a face turn moves its own 8 stickers and 12 round it, in 4-cycles", () => {
  for (const face of FACES) {
    const c = cycleLengths(movePerm({ face, turns: 1 }));
    assert.deepEqual(c, [4, 4, 4, 4, 4], face);
    assert.deepEqual(cycleLengths(movePerm({ face, turns: 2 })), Array(10).fill(2), face);
  }
});

test("turns go the usual way: R lifts the front up, U sends the front left, F sends the top right", () => {
  const at = (face: string, row: number, col: number) => FACES.indexOf(face as never) * 9 + row * 3 + col;
  const after = (s: string) => colorsAfter(seq(s));
  // The middle of F's right column goes to U's right column.
  assert.equal(after("R")[at("U", 1, 2)], "F");
  assert.equal(after("U")[at("L", 0, 1)], "F");
  assert.equal(after("F")[at("R", 1, 0)], "U");
  assert.equal(after("R′")[at("D", 1, 2)], "F");
});

test("known orders", () => {
  const cases: [string, number][] = [["R", 4], ["R2", 2], ["R U R′ U′", 6], ["R U", 105], ["R U′", 63], ["R2 U2", 6], ["R L", 4], ["", 1]];
  for (const [s, n] of cases) {
    assert.equal(order(seq(s)), n, s);
    const moves = Array.from({ length: n }, () => seq(s)).flat();
    assert.ok(isSolved(colorsAfter(moves)), `${s} × ${n}`);
    if (n > 1) assert.ok(!isSolved(colorsAfter(Array.from({ length: n - 1 }, () => seq(s)).flat())), `${s} × ${n - 1}`);
  }
  assert.equal(POSITIONS, (40320n * 3n ** 7n * 479001600n * 2n ** 11n) / 2n);
});

test("moves read and written", () => {
  assert.deepEqual(seq("R U' F2 B’ Li D2′ (R U)"), [
    { face: "R", turns: 1 }, { face: "U", turns: 3 }, { face: "F", turns: 2 }, { face: "B", turns: 3 },
    { face: "L", turns: 3 }, { face: "D", turns: 2 }, { face: "R", turns: 1 }, { face: "U", turns: 1 },
  ]);
  assert.equal(movesText(seq("RUR'U'")), "R U R′ U′");
  assert.equal(movesText(seq("R3")), "R′");
  assert.deepEqual(parseMoves("  "), []);
  for (const bad of ["X", "R4", "r", "R U x", "2R"]) assert.equal(parseMoves(bad), null, bad);
  assert.equal(movesText(inverseSeq(seq("R U2 F′"))), "F U2 R′");
});

test("a sequence and its inverse leave the cube solved; colours stay nine of each", () => {
  const r = rng(7);
  for (let k = 0; k < 30; k++) {
    const s = scramble(25, r);
    const colors = colorsAfter(s);
    for (const f of FACES) assert.equal(colors.filter((c) => c === f).length, 9);
    // Centres never move.
    for (const f of FACES) assert.equal(colors[FACES.indexOf(f) * 9 + 4], f);
    assert.ok(isSolved(colorsAfter(inverseSeq(s), colors)));
  }
});

test("scrambles never turn one face twice running, nor one axis three times", () => {
  const r = rng(3);
  const axis = (m: Move) => FACES.indexOf(m.face) % 3;
  for (let k = 0; k < 200; k++) {
    const s = scramble(20, r);
    assert.equal(s.length, 20);
    s.forEach((m, i) => {
      if (i > 0) assert.notEqual(m.face, s[i - 1].face);
      if (i > 1) assert.ok(!(axis(m) === axis(s[i - 1]) && axis(m) === axis(s[i - 2])));
    });
  }
});

test("the animation's path: back to where two sequences part, then on", () => {
  const turns = (a: string, b: string) => movesText(path(seq(a), seq(b)).map((s) => s.move));
  assert.equal(turns("R U", "R U F"), "F");
  assert.equal(turns("R U F", "R U"), "F′");
  assert.equal(turns("R U F", "R D"), "F′ U′ D");
  assert.equal(turns("R", "R"), "");
  assert.equal(common(seq("R U F"), seq("R U B")), 2);
  // Each step leaves shown the cube its sequence makes.
  const [a, b] = [seq("R U F2 L"), seq("R B D′")];
  let colors = colorsAfter(a);
  for (const step of path(a, b)) {
    colors = colorsAfter([step.move], colors);
    assert.deepEqual(colors, colorsAfter(step.after));
  }
  assert.deepEqual(colors, colorsAfter(b));
});

test("the circle picture: three bands of circles, a face where two cross, a turn slides its ring along one circle", () => {
  const l: Layout = { cx: 570, cy: 215, d: 60, rho: 110, step: 15 };
  const dist = (p: number[], q: number[]) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  const near = (p: number[], q: number[]) => dist(p, q) < 1e-9;
  const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;
  // Each face's middle sticker is its crossing, on the middle circles of the other two bands, and opposite faces share them.
  FACES.forEach((f, k) => {
    const c = ringCentre(f, l);
    assert.ok(near(dotAt(k * 9 + 4, l), c), f);
    for (const a of [0, 1, 2] as const) if (a !== axisOf(f)) assert.ok(close(dist(c, bandCentre(a, l)), l.rho), `${f} on band ${a}`);
  });
  // Every sticker is on the circles of its two layers.
  STICKERS.forEach((s, i) => {
    for (const a of [0, 1, 2] as const)
      if (a !== axisOf(s.face)) assert.ok(close(dist(dotAt(i, l), bandCentre(a, l)), bandRadius(a, s.pos[a], l)), `sticker ${i} band ${a}`);
  });
  // No two dots overlap.
  for (let i = 0; i < 54; i++) for (let j = i + 1; j < 54; j++) assert.ok(dist(dotAt(i, l), dotAt(j, l)) > 15, `${i} ${j}`);
  for (const face of FACES)
    for (const turns of [1, 2, 3] as const) {
      const m = { face, turns };
      const p = movePerm(m);
      STICKERS.forEach((s, i) => {
        assert.ok(near(dotDuring(i, m, 0, l), dotAt(i, l)));
        assert.ok(near(dotDuring(i, m, 1, l), dotAt(p[i], l)), `${face}${turns} sticker ${i}`);
        // The stickers beside the face stay on their circle all the way.
        if (onLayer(face, i) && s.face !== face) {
          const a = axisOf(face);
          for (const t of [0.25, 0.5, 0.75]) assert.ok(close(dist(dotDuring(i, m, t, l), bandCentre(a, l)), bandRadius(a, NORMAL[face][a], l)));
        }
      });
    }
});
