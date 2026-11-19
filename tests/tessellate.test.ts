// Tile it: only triangles, squares and hexagons fill a point alone, every vertex fill makes 360° exactly, the seven
// tangram pieces make their 4 by 4 square as quarter cells, every ladder and random outline can be made from its pieces,
// the tray keeps the pieces apart, and the notices.
import { test } from "node:test";
import assert from "node:assert/strict";
import { GAME_LEVELS } from "../src/math/ladder.ts";
import { rng } from "../src/math/random.ts";
import {
  angleOf,
  aroundPoint,
  BOARD,
  cornersOf,
  coverOf,
  degText,
  EASY_SIDES,
  fullness,
  neighbours,
  orient,
  PALETTE,
  PIECE_SHAPES,
  piecesNow,
  polygonAt,
  quarterKey,
  quartersOf,
  quartersOfPlaced,
  randomOutline,
  SQUARE_SOLUTION,
  sumOf,
  TANGRAM,
  TESSELLATE_LADDER,
  tessellateNotice,
  tessellateTask,
  tilesAlone,
  trayOf,
  VERTEX_FILLS,
  type PieceKind,
  type Placed,
  type ShapeTask,
} from "../src/math/tessellate.ts";

const AREA: Record<PieceKind, number> = { large: 4, medium: 2, small: 1, square: 2, para: 2 };
/** The quarters of a whole rectangle of grid squares. */
const rect = (x0: number, y0: number, w: number, h: number) => {
  const out: string[] = [];
  for (let x = x0; x < x0 + w; x++) for (let y = y0; y < y0 + h; y++) for (let q = 0; q < 4; q++) out.push(quarterKey(x, y, q));
  return out.sort();
};

test("a polygon's angle, and which fill a point on their own", () => {
  assert.deepEqual(EASY_SIDES.map(angleOf).map(degText), ["60°", "90°", "108°", "120°", "128.6°", "135°", "140°", "144°", "150°"]);
  assert.deepEqual(EASY_SIDES.filter(tilesAlone), [3, 4, 6]);
  assert.deepEqual(aroundPoint(5), { fit: 3, gap: 36 });
  assert.deepEqual(aroundPoint(6), { fit: 3, gap: 0 });
  assert.deepEqual(aroundPoint(8), { fit: 2, gap: 90 });
  assert.equal(fullness(360), "full");
  assert.equal(fullness(324), "gap");
  assert.equal(fullness(432), "over");
});

test("a polygon drawn at the point closes, with its angle there", () => {
  for (const n of EASY_SIDES) {
    const pts = polygonAt(n, 30, 1);
    assert.equal(pts.length, n);
    // Every side is 1 long, the last one back to the point included.
    for (let i = 0; i < n; i++) {
      const [a, b] = [pts[i], pts[(i + 1) % n]];
      assert.ok(Math.abs(Math.hypot(b[0] - a[0], b[1] - a[1]) - 1) < 1e-9, `${n} side ${i}`);
    }
    // The two sides at the point leave it at 30° and 30° + its angle.
    const dir = (p: [number, number]) => (Math.atan2(p[1], p[0]) * 180) / Math.PI;
    assert.ok(Math.abs(dir(pts[1]) - 30) < 1e-9);
    assert.ok(Math.abs(((dir(pts[n - 1]) - 30 + 360) % 360) - angleOf(n)) < 1e-9, `${n}`);
  }
});

test("every way to fill a point from the palette makes 360° and mixes two kinds", () => {
  assert.deepEqual(VERTEX_FILLS.map((f) => f.join(".")), ["3.3.3.3.6", "3.3.3.4.4", "3.3.4.12", "3.3.6.6", "3.4.4.6", "3.12.12", "4.6.12", "4.8.8"]);
  for (const f of VERTEX_FILLS) {
    assert.equal(fullness(sumOf(f)), "full");
    assert.ok(new Set(f).size > 1);
    assert.ok(f.every((n) => PALETTE.includes(n)));
  }
});

test("medium's points can always be filled from the palette", () => {
  const completes = (given: number[]) => VERTEX_FILLS.some((f) => {
    const rest = [...f];
    return given.every((n) => {
      const i = rest.indexOf(n as never);
      return i >= 0 && rest.splice(i, 1).length === 1;
    }) && rest.length > 0;
  });
  for (const t of TESSELLATE_LADDER) if (t.level === 2) assert.ok(completes(t.given), t.given.join("."));
  for (let seed = 1; seed <= 200; seed++) {
    const t = tessellateTask(2, rng(seed));
    if (t.level !== 2) throw new Error("level");
    assert.ok(t.given.length >= 1 && completes(t.given), t.given.join("."));
  }
});

test("each tangram piece is its area in quarter cells, turned or flipped", () => {
  for (const kind of Object.keys(PIECE_SHAPES) as PieceKind[])
    for (let rot = 0; rot < 4; rot++)
      for (const flip of [false, true]) {
        const qs = quartersOf(orient(kind, rot, flip));
        assert.equal(qs.length, AREA[kind] * 4, `${kind} ${rot} ${flip}`);
        assert.equal(new Set(qs).size, qs.length);
      }
  // Four quarter turns come back to the start.
  assert.deepEqual(orient("para", 4, true), orient("para", 0, true));
  assert.deepEqual(TANGRAM.reduce((s, k) => s + AREA[k], 0), 16);
});

test("the seven pieces make the 4 by 4 square, each quarter once", () => {
  const cover = coverOf(SQUARE_SOLUTION, new Set(rect(0, 0, 4, 4)));
  assert.ok(cover.made);
  assert.deepEqual(cover.twice, []);
  assert.deepEqual([...SQUARE_SOLUTION.map((p) => p.kind)].sort(), [...TANGRAM].sort());
});

test("coverOf names parts covered twice and parts outside the outline", () => {
  const target = new Set(rect(0, 0, 2, 2));
  const medium: Placed = { kind: "medium", x: 0, y: 0, rot: 0, flip: false };
  const half = coverOf([medium], target);
  assert.equal(half.covered, 8);
  assert.ok(!half.made);
  const twice = coverOf([medium, { ...medium }], target);
  assert.equal(twice.twice.length, 8);
  const out = coverOf([{ ...medium, x: 2 }], target);
  assert.equal(out.outside.length, 8);
  // Quarter cells side by side: the two beside it in its square, and the one across the grid line.
  assert.deepEqual(neighbours(quarterKey(3, 3, 0)), ["3,3,1", "3,3,3", "3,2,2"]);
});

test("every ladder outline is made by its own pieces", () => {
  const shapes = TESSELLATE_LADDER.filter((t): t is ShapeTask => t.level === 3);
  assert.deepEqual(shapes.map((t) => t.name), ["triangle", "square", "bigSquare"]);
  for (const t of shapes) assert.equal(t.target.length, t.kinds.reduce((s, k) => s + AREA[k], 0) * 4, t.name);
});

test("random outlines can be made, fit left of the tray, and are the same for a seed", () => {
  for (let seed = 1; seed <= 60; seed++) {
    const o = randomOutline(3 + (seed % 3), rng(seed));
    const target = new Set(o.target);
    assert.ok(coverOf(o.solution, target).made, `seed ${seed}`);
    assert.equal(o.kinds.length, 3 + (seed % 3));
    const xs = o.solution.flatMap(cornersOf).map((p) => p[0]);
    const ys = o.solution.flatMap(cornersOf).map((p) => p[1]);
    assert.ok(Math.min(...xs) >= 0 && Math.max(...xs) <= BOARD.trayFrom - 1, `seed ${seed} x`);
    assert.ok(Math.min(...ys) >= 0 && Math.max(...ys) <= BOARD.rows, `seed ${seed} y`);
    assert.deepEqual(randomOutline(3 + (seed % 3), rng(seed)).target, o.target);
  }
});

test("the tray keeps every piece apart, on the board, right of the outline", () => {
  const tray = trayOf(TANGRAM);
  const all = tray.flatMap(quartersOfPlaced);
  assert.equal(new Set(all).size, all.length);
  for (const p of tray)
    for (const [x, y] of cornersOf(p)) {
      assert.ok(x >= BOARD.trayFrom && x <= BOARD.cols, `${p.kind} x ${x}`);
      assert.ok(y >= 0 && y <= BOARD.rows, `${p.kind} y ${y}`);
    }
  // The pieces start in the tray, and stay where they are put once moved.
  const t = TESSELLATE_LADDER[8] as ShapeTask;
  assert.deepEqual(piecesNow(t, []), trayOf(t.kinds));
  const moved = trayOf(t.kinds).map((p, i) => (i === 0 ? { ...p, x: 0, y: 0 } : p));
  assert.deepEqual(piecesNow(t, moved), moved);
});

test("each level's tasks", () => {
  for (const level of GAME_LEVELS)
    for (let seed = 1; seed <= 20; seed++) {
      const t = tessellateTask(level, rng(seed));
      assert.equal(t.level, level);
      if (t.level === 1) assert.ok(EASY_SIDES.includes(t.n));
    }
});

test("the ladder's notices", () => {
  const [easy, medium, hard] = [TESSELLATE_LADDER[0], TESSELLATE_LADDER[3], TESSELLATE_LADDER[6]];
  assert.equal(tessellateNotice(easy, 0, 1), "threeAlone");
  assert.equal(tessellateNotice(medium, 0, 1), "fullTurn");
  assert.equal(tessellateNotice(hard, 0, 1), "sameArea");
  assert.equal(tessellateNotice(easy, 1, 1), null);
  assert.equal(tessellateNotice(hard, 2, 10), "streak10");
});
