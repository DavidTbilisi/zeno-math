// Join up: two tiles join into their sum while it is no more than the target, or into their product while it divides
// the target, and a pair that makes the target is cleared; a slide moves every tile as far as it goes, the pair nearer
// the edge joining first and a tile joining once; a round is replayed from its seed and its slides; and on both
// ladders the player at the foot of joinUp.ts finishes every round, while sliding at random seldom passes one.
import { test } from "node:test";
import assert from "node:assert/strict";
import { rng } from "../src/math/random.ts";
import {
  botSlide,
  canSlide,
  DIRS,
  finishNotice,
  JOIN_LADDERS,
  JOIN_LEVELS,
  JOIN_N,
  joinNow,
  joinOf,
  joinStars,
  joinStart,
  joinText,
  needs,
  play,
  slide,
  stuck,
  type Grid,
  type JoinDeck,
  type JoinSpec,
} from "../src/math/joinUp.ts";

const DECKS: JoinDeck[] = ["sum", "product"];
const TEN: JoinSpec = { kind: "sum", target: 10, tiles: [1, 2, 3, 4, 5, 6, 7, 8, 9], pass: 3, full: 5 };
const P24: JoinSpec = { kind: "product", target: 24, tiles: [2, 3, 4, 6, 8, 12], pass: 3, full: 5 };
const _ = null;
/** The player of joinUp.ts, to the end of the round. */
function botPlay(spec: JoinSpec, seed: number): string {
  let slides = "";
  for (let i = 0; i < 400; i++) {
    const r = play(spec, seed, slides);
    const d = r.full || r.stuck ? null : botSlide(spec, r.grid);
    if (!d) break;
    slides += d;
  }
  return slides;
}

test("two tiles join into their sum up to the target, or into their product while it divides the target", () => {
  assert.equal(joinOf(TEN, 3, 4), 7);
  assert.equal(joinOf(TEN, 7, 3), 10);
  assert.equal(joinOf(TEN, 9, 8), null);
  assert.equal(joinOf(TEN, 5, 5), 10);
  assert.equal(joinOf(P24, 2, 3), 6);
  assert.equal(joinOf(P24, 4, 6), 24);
  assert.equal(joinOf(P24, 4, 4), null, "16 does not divide 24");
  assert.equal(joinOf(P24, 3, 3), null);
  assert.equal(joinOf(P24, 8, 6), null);
  assert.equal(joinText(TEN, { a: 7, b: 3, v: 10, made: true }), "7 + 3 = 10");
  assert.equal(joinText(P24, { a: 4, b: 6, v: 24, made: true }), "4 × 6 = 24");
  assert.deepEqual([needs(TEN, 7), needs(P24, 6)], [3, 4]);
});

test("a slide moves every tile as far as it goes; the pair nearer the edge joins first, a tile joins once, and a pair that makes the target is cleared", () => {
  // prettier-ignore
  const grid: Grid = [
    _, 3, _, 4,
    7, 3, _, _,
    2, 2, 2, _,
    9, _, _, 8,
  ];
  const left = slide(grid, "L", TEN);
  // prettier-ignore
  assert.deepEqual(left.grid, [
    7, _, _, _,
    _, _, _, _,
    4, 2, _, _,
    9, 8, _, _,
  ]);
  assert.deepEqual(left.joined, [{ a: 3, b: 4, v: 7, made: false }, { a: 7, b: 3, v: 10, made: true }, { a: 2, b: 2, v: 4, made: false }]);
  assert.equal(left.moved, true);
  // To the right, the pair nearer the right edge joins: 2 2 2 → 2 4.
  assert.deepEqual(slide(grid, "R", TEN).grid.slice(8, 12), [_, _, 2, 4]);
  // Down: the column 3, 3, 2 joins its lower pair first (3 + 2), and 4 + 8 is over ten.
  const down = slide(grid, "D", TEN);
  assert.deepEqual([down.grid[9], down.grid[13]], [3, 5]);
  assert.deepEqual([down.grid[11], down.grid[15]], [4, 8]);
  // Up: 7 + 2 = 9, and then 9 does not join the 9 below it.
  const up = slide(grid, "U", TEN);
  assert.deepEqual([up.grid[0], up.grid[4], up.grid[8]], [9, 9, _]);
  // Nothing moves a full grid of tiles that do not belong together.
  const full: Grid = Array.from({ length: 16 }, (_x, i) => ((i + Math.floor(i / 4)) % 2 ? 9 : 8));
  assert.ok(DIRS.every((d) => !slide(full, d, TEN).moved));
  assert.equal(stuck(full, TEN), true);
  assert.equal(stuck(grid, TEN), false);
  // Products: 4 and 6 are cleared, 4 and 4 block.
  assert.deepEqual(slide([4, 6, _, _, 4, 4, _, _, _, _, _, _, _, _, _, _], "L", P24).grid.slice(0, 8), [_, _, _, _, 4, 4, _, _]);
});

test("a round is replayed from its seed and its slides: three tiles to start, one more after every slide that moves something", () => {
  const start = play(TEN, 9, "");
  assert.equal(start.grid.filter((v) => v !== null).length, 3);
  assert.ok(start.grid.every((v) => v === null || TEN.tiles.includes(v)));
  assert.deepEqual(play(TEN, 9, ""), start);
  assert.notDeepEqual(play(TEN, 10, "").grid, start.grid);
  const slides = botPlay({ ...TEN, full: 99 }, 9).slice(0, 12);
  const r = play(TEN, 9, slides);
  assert.equal(r.moves, slides.length);
  assert.deepEqual(play(TEN, 9, slides), r);
  // Step by step: the tiles on the grid are the three, plus one a slide, less those joined.
  let tiles = 3;
  for (let i = 1; i <= slides.length; i++) {
    const now = play(TEN, 9, slides.slice(0, i));
    tiles += 1 - now.last.length - now.last.filter((j) => j.made).length;
    assert.equal(now.grid.filter((v) => v !== null).length, tiles, `after ${i}`);
    assert.ok(now.fresh >= 0 && now.grid[now.fresh] !== null);
  }
  // A slide that moves nothing is passed over, and so is a letter that is no slide.
  const idle = DIRS.find((d) => !canSlide(TEN, start, d));
  if (idle) assert.deepEqual(play(TEN, 9, idle), start);
  assert.deepEqual(play(TEN, 9, "x"), start);
});

test("the round ends when the target has been made often enough, or when nothing moves: three stars, two for a pass, else one", () => {
  assert.deepEqual([joinStars(TEN, 5), joinStars(TEN, 4), joinStars(TEN, 3), joinStars(TEN, 2)], [3, 2, 2, 1]);
  const slides = botPlay(TEN, 3);
  const r = play(TEN, 3, slides);
  assert.ok(r.full || r.stuck);
  assert.equal(r.full, r.made >= TEN.full);
  // Slides after the end change nothing.
  assert.deepEqual(play(TEN, 3, slides + "LRUD"), r);
  assert.ok(DIRS.every((d) => !canSlide(TEN, r, d)));
  assert.equal(finishNotice(TEN, { ...r, full: false }, 3), null);
  assert.equal(finishNotice(TEN, { ...r, full: true, moves: 4 * TEN.full }, 3), "swift");
  assert.equal(finishNotice(TEN, { ...r, full: true, moves: 99, least: 5 }, 3), "roomy");
  assert.equal(finishNotice(TEN, { ...r, full: true, moves: 99, least: 2 }, 10), "streak10");
});

test("on both ladders the player finishes every round, and sliding at random seldom passes one after the first", () => {
  for (const deck of DECKS) {
    const ladder = JOIN_LADDERS[deck];
    assert.equal(ladder.length, 9);
    ladder.forEach(({ spec, seed }, stage) => {
      assert.ok(spec.pass < spec.full && spec.pass >= 2, `${deck} ${stage}`);
      assert.deepEqual(joinNow({ ...joinStart(deck), stage }), { spec, seed });
      const r = play(spec, seed, botPlay(spec, seed));
      assert.ok(r.full, `${deck} ${stage}: the player made ${r.made} of ${spec.full}`);
      assert.equal(joinStars(spec, r.made), 3);
      assert.ok(r.moves <= 90, `${deck} ${stage}: ${r.moves} slides`);
      if (!stage) return;
      let passed = 0;
      for (let k = 0; k < 40; k++) {
        const next = rng(seed * 131 + k);
        const slides = Array.from({ length: 400 }, () => DIRS[Math.floor(next() * 4)]).join("");
        if (play(spec, seed, slides).made >= spec.pass) passed++;
      }
      assert.ok(passed <= 16, `${deck} ${stage}: random sliding passed ${passed} of 40`);
    });
    // Sums are made of tiles below the target; products of its factors.
    for (const { spec } of [...ladder, ...Object.values(JOIN_LEVELS[deck]).map((spec) => ({ spec }))])
      assert.ok(spec.tiles.every((v) => (spec.kind === "sum" ? v > 0 && v < spec.target : v > 1 && v < spec.target && spec.target % v === 0)), `${deck} ${spec.target}`);
  }
});

test("the endless levels can be finished on most seeds by the player", () => {
  for (const deck of DECKS)
    for (const level of [1, 2, 3] as const) {
      let done = 0;
      for (let seed = 1; seed <= 20; seed++) {
        const { spec } = joinNow({ ...joinStart(deck), mode: "endless", level, seed });
        if (play(spec, seed, botPlay(spec, seed)).full) done++;
      }
      assert.ok(done >= 12, `${deck} level ${level}: finished ${done} of 20`);
    }
  assert.equal(JOIN_N, 4);
});
