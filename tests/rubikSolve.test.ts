// Reading a real cube's colours and solving it: every cube scrambled by turns comes back solved, and colours no cube
// can have (by miscounting, or by a piece put back the wrong way) are told apart.
import { test } from "node:test";
import assert from "node:assert/strict";
import { rng } from "../src/math/random.ts";
import { colorsAfter, type Face, isSolved, scramble, STICKERS, stickerAt, type V3 } from "../src/math/rubik.ts";
import { readCube, solve } from "../src/math/rubikSolve.ts";

const solved = () => STICKERS.map((s) => s.face);
const at = (pos: V3, normal: V3) => stickerAt(pos, normal)!;
const errorOf = (colors: Face[]) => {
  const read = readCube(colors);
  return "error" in read ? read.error : "ok";
};

// How short depends on how long the search has (it keeps the shortest found in the time); 30 turns is its bound.
test("scrambled cubes are solved, in at most 30 turns", () => {
  const r = rng(11);
  for (let k = 0; k < 4; k++) {
    const s = scramble(25, r);
    const read = readCube(colorsAfter(s));
    assert.ok("cubies" in read);
    const moves = solve(read.cubies, 200);
    assert.ok(isSolved(colorsAfter([...s, ...moves])), `scramble ${k}`);
    assert.ok(moves.length <= 30, `${moves.length} turns`);
  }
});

test("a solved cube needs no turns, and one turn needs one", () => {
  const none = readCube(solved());
  assert.ok("cubies" in none);
  assert.deepEqual(solve(none.cubies, 50), []);
  const one = readCube(colorsAfter([{ face: "R", turns: 3 }]));
  assert.ok("cubies" in one);
  assert.deepEqual(solve(one.cubies, 50), [{ face: "R", turns: 1 }]);
});

test("colours no cube can have are told apart", () => {
  const swap = (colors: Face[], i: number, j: number) => {
    const c = [...colors];
    [c[i], c[j]] = [c[j], c[i]];
    return c;
  };
  const [u, d, f, r] = [[0, 1, 0], [0, -1, 0], [0, 0, 1], [1, 0, 0]] as V3[];
  const [urfU, urfF, urfR] = [at([1, 1, 1], u), at([1, 1, 1], f), at([1, 1, 1], r)];
  const [ufU, ufF, dfD] = [at([0, 1, 1], u), at([0, 1, 1], f), at([0, -1, 1], d)];
  const [urU, urR] = [at([1, 1, 0], u), at([1, 1, 0], r)];

  assert.equal(errorOf(solved()), "ok");
  assert.equal(errorOf(solved().map((c, i) => (i === 0 ? "D" : c))), "count");
  assert.equal(errorOf(swap(solved(), 4, 31)), "centres");
  // Two of a corner's stickers swapped: its colours go round the wrong way, which no corner does.
  assert.equal(errorOf(swap(solved(), urfF, urfR)), "corner");
  // An edge with white and yellow on it, opposite colours, and another with green twice.
  assert.equal(errorOf(swap(solved(), ufF, dfD)), "edge");
  // A corner turned in its place, all three stickers moved round one.
  const twisted = solved();
  [twisted[urfU], twisted[urfF], twisted[urfR]] = [twisted[urfR], twisted[urfU], twisted[urfF]];
  assert.equal(errorOf(twisted), "twist");
  assert.equal(errorOf(swap(solved(), ufU, ufF)), "flip");
  assert.equal(errorOf(swap(swap(solved(), ufU, urU), ufF, urR)), "parity");
  // The same faults on a scrambled cube are found too.
  const mixed = colorsAfter(scramble(20, rng(5)));
  assert.equal(errorOf(swap(mixed, ufU, ufF)), "flip");
  assert.equal(errorOf(swap(swap(mixed, ufU, urU), ufF, urR)), "parity");
});
