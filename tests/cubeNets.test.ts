// Cube nets: of the 35 shapes of six squares 11 fold into a cube; folding finds opposite faces; the questions offer one
// net among look-alikes, or ask for the face opposite ★; the slips are named; the board's stars and notices follow the
// rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { check, exercise, LEVELS, trapInputs } from "../src/math/practice.ts";
import { renderSolution } from "../src/math/practiceSolve.ts";
import { rng } from "../src/math/random.ts";
import { allHexominoes, clashes, fold, hasBlock, hasRow4, isNet, kinds, NET_LADDER, netBoard, netNotice, netNow, netQuestion, netStars, normal, touching, type Cell } from "../src/math/cubeNets.ts";
import { mark } from "../server/checker.ts";

const w = en.pracWords;
const free = (c: Cell[]) =>
  [0, 1, 2, 3, 4, 5, 6, 7].map((k) => normal(c.map(([x, y]): Cell => {
    const [a, b] = k & 1 ? [y, x] : [x, y];
    return [k & 2 ? -a : a, k & 4 ? -b : b];
  })).join(";")).sort()[0];

test("35 shapes of six squares, 11 of them nets of a cube", () => {
  const all = allHexominoes();
  assert.equal(all.length, 216);
  assert.equal(new Set(all.map(free)).size, 35);
  assert.equal(new Set(all.filter(isNet).map(free)).size, 11);
  assert.equal(new Set(kinds().rowNets.map(free)).size, 6, "the six with four in a row");
  assert.ok(all.filter(hasBlock).every((c) => !isNet(c)), "a 2 × 2 block never folds");
  // The cross: a row of four with a square either side; the ends of a row of three are opposite.
  const cross: Cell[] = [[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]];
  const f = fold(cross);
  assert.equal(new Set(f).size, 6);
  assert.equal(f[1], f[3] ^ 1);
  assert.equal(f[0], f[5] ^ 1);
  assert.ok(hasRow4(cross));
  const rect: Cell[] = [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]];
  assert.ok(!isNet(rect) && clashes(rect).length >= 2);
  assert.deepEqual(clashes(cross), []);
});

test("the questions: one net among four, or the face opposite ★", () => {
  for (const level of LEVELS)
    for (let seed = 1; seed <= 150; seed++) {
      const q = netQuestion(level, rng(seed));
      const where = `level ${level} seed ${seed}`;
      if (q.level === 3) {
        assert.ok(isNet(q.net), where);
        const f = fold(q.net);
        const at = (letter: number) => (letter < q.star ? letter : letter + 1);
        assert.equal(f[at(q.right)], f[q.star] ^ 1, where);
        for (const b of q.beside) assert.ok(touching(q.net[at(b)], q.net[q.star]) && b !== q.right, where);
        continue;
      }
      assert.equal(q.shapes.filter(isNet).length, 1, where);
      assert.ok(isNet(q.shapes[q.right]), where);
      assert.equal(hasRow4(q.shapes[q.right]), level === 1, where);
      assert.equal(new Set(q.shapes.map(free)).size, 4, where);
      assert.ok(q.lookalikes.length >= 1 && q.lookalikes.every((i) => !isNet(q.shapes[i]) && !hasBlock(q.shapes[i])), where);
    }
});

test("in practice: the letter typed or picked, the slips named, the net coloured; the server agrees", async () => {
  for (const level of LEVELS) {
    const ex = exercise("cubeNets", level, 7, w);
    assert.ok(ex.pic && !ex.pic.svg(0, 0).includes("NaN"));
    assert.deepEqual(check(ex, ex.plain, w), { ok: true });
    assert.deepEqual(check(ex, ex.plain.toLowerCase(), w), { ok: true });
    assert.match(check(ex, "Z", w).why ?? "", /Pick one of the options offered/);
    const r = await renderSolution(ex.solution!, en);
    assert.ok(!r.svg.includes("NaN") && r.svg.includes("#b2f2bb"));
  }
  for (const [level, id] of [[1, "sixSquares"], [2, "sixSquares"], [3, "nextToOpposite"]] as const) {
    let found = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const ex = exercise("cubeNets", level, seed, w);
      for (const trap of trapInputs(ex).filter((x) => x.id === id)) {
        found++;
        const v = check(ex, trap.input, w);
        assert.equal(v.mistake, id);
        assert.ok(v.hint && !/\{\w+\}/.test(v.hint), v.hint);
      }
    }
    assert.ok(found > 20, `${found} slips named at level ${level}`);
  }
  const q = { skill: "cubeNets" as const, level: 1, seed: 7 };
  assert.deepEqual([mark(q, "D"), mark(q, "A"), mark(q, "Z")], ["correct", "wrong", "form"]);
});

test("the board: shapes to sort or a net to pair, stars from misses, the notices, the ladder", () => {
  for (const level of LEVELS)
    for (let seed = 1; seed <= 100; seed++) {
      const b = netBoard(level, rng(seed));
      if (b.level === 3) {
        assert.ok(isNet(b.net));
        continue;
      }
      assert.equal(b.shapes.length, 6);
      assert.equal(new Set(b.shapes.map(free)).size, 6);
      const nets = b.shapes.filter(isNet);
      if (level === 1) assert.ok(nets.length === 3 && nets.every(hasRow4));
      else assert.ok(nets.length >= 2 && nets.length <= 4 && nets.some((s) => !hasRow4(s)) && b.shapes.every((s) => isNet(s) || !hasBlock(s)));
    }
  assert.deepEqual([netStars(0), netStars(1), netStars(2)], [3, 2, 1]);
  const easy = netBoard(1, rng(3));
  assert.equal(netNotice(easy, 0, 1), "clean");
  assert.equal(netNotice(netBoard(2, rng(3)), 0, 1), "noRow");
  assert.equal(netNotice(netBoard(3, rng(3)), 0, 1), "opposites");
  assert.equal(netNotice(easy, 1, 0), null);
  assert.equal(netNotice(easy, 1, 10), "streak10");
  NET_LADDER.forEach(({ level, seed }, stage) => assert.deepEqual(netNow({ mode: "puzzle", stage, level: 1, seed: 0 }), netBoard(level, rng(seed))));
});
