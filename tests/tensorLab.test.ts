// The tensors lab: strides, places and indices agree with each other for every shape and view, a reshape keeps the
// memory's order and a transpose swaps the strides; every puzzle starts unsolved and is solved by its answer, and each
// kind of slip is told apart; free play's walk and readings, and the picture, follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  answerOf,
  colStrides,
  entryText,
  isContiguous,
  judgeTn,
  MEMORY,
  placeOf,
  placeSum,
  readSel,
  readWhole,
  rowStrides,
  setupLabel,
  setupOf,
  sizeOf,
  tapsOn,
  tnCaption,
  tnHit,
  tnLayout,
  TN_LADDER,
  TN_PLOT,
  TN_SETUPS,
  TN_START,
  tnPuzzle,
  tnSetup,
  tnStars,
  tnSvg,
  unravel,
  viewIndexAt,
  viewOf,
  walk,
  type TnSel,
} from "../src/math/tensorLab.ts";

const P = TN_LADDER;
const picture = { sel: null, reveal: false, wrong: false, memory: "memory", caption: "c" };
const view = (i: number): TnSel => ({ at: "view", i });
const mem = (i: number): TnSel => ({ at: "mem", i });
/** A view's entry by its indices, as a tap. */
const cell = (id: Parameters<typeof tnSetup>[0], idx: number[]) => view(idx.reduce((a, x, k) => a + x * rowStrides(viewOf(tnSetup(id)).shape)[k], 0));
const why = (i: number, sel: TnSel | null, answers: string[] = []) => {
  const v = judgeTn(P[i], sel, answers);
  return v.state === "lost" ? [v.why, v.have] : [v.state];
};

test("strides, places and indices: every entry of every view at its own place, each place once", () => {
  assert.deepEqual(rowStrides([2, 3, 4]), [12, 4, 1]);
  assert.deepEqual(colStrides([2, 3, 4]), [1, 2, 6]);
  assert.deepEqual(unravel(17, [2, 3, 4]), [1, 1, 1]);
  for (const s of TN_SETUPS) {
    const v = viewOf(s);
    const n = sizeOf(v.shape);
    assert.equal(n, sizeOf(s.base), s.id);
    assert.ok(n <= MEMORY.length, s.id);
    const places = Array.from({ length: n }, (_, i) => placeOf(v, unravel(i, v.shape)));
    assert.deepEqual([...places].sort((a, b) => a - b), Array.from({ length: n }, (_, i) => i), s.id);
    places.forEach((p, i) => assert.equal(viewIndexAt(v, p), i, s.id));
    // Only a view whose axes are put in another order reads memory out of order.
    assert.equal(isContiguous(v), s.view.kind !== "permute", s.id);
  }
  assert.equal(new Set(MEMORY).size, MEMORY.length);
  // A reshape keeps the order: T[1, 0, 2] at place 14 is R[2, 2]; a transpose swaps the strides.
  const t = viewOf(tnSetup("t234"));
  const r = viewOf(tnSetup("rs46"));
  assert.equal(placeOf(t, [1, 0, 2]), 14);
  assert.deepEqual(unravel(viewIndexAt(r, 14), r.shape), [2, 2]);
  const tr = viewOf(tnSetup("tr34"));
  assert.deepEqual([tr.name, tr.code, tr.shape, tr.strides], ["Tᵀ", "T.T", [4, 3], [1, 4]]);
  const pm = viewOf(tnSetup("pm201"));
  assert.deepEqual([pm.name, pm.code, pm.shape, pm.strides], ["P", "T.permute(2, 0, 1)", [4, 2, 3], [1, 12, 4]]);
  assert.deepEqual([r.name, r.code], ["R", "T.reshape(4, 6)"]);
});

test("every puzzle starts unsolved, and its answer solves it", () => {
  P.forEach((q, i) => {
    const want = answerOf(q);
    const start = judgeTn(q, null, []);
    assert.equal(start.state, "lost", `puzzle ${i + 1}`);
    if (q.kind === "strides") {
      assert.equal(want, null);
      assert.deepEqual(judgeTn(q, null, viewOf(tnSetup(q.setup)).strides.map(String)), { state: "won" });
    } else {
      assert.deepEqual(tapsOn(q), [want!.at], `puzzle ${i + 1}`);
      assert.deepEqual(judgeTn(q, want, []), { state: "won" }, `puzzle ${i + 1}`);
      // A tap on the other part of the picture is not an answer.
      assert.equal(judgeTn(q, { at: want!.at === "view" ? "mem" : "view", i: want!.i }, []).state, "lost");
    }
  });
  // The answers the notices speak of.
  assert.deepEqual(answerOf(P[1]), mem(9));
  assert.deepEqual(answerOf(P[3]), mem(23));
  assert.deepEqual(answerOf(P[4]), cell("t234", [1, 1, 1]));
  assert.deepEqual(viewOf(tnSetup("t432")).strides, [6, 2, 1]);
  assert.deepEqual(answerOf(P[6]), cell("rs46", [2, 2]));
  assert.deepEqual(answerOf(P[7]), mem(7));
  assert.deepEqual(tapsOn(null), ["view", "mem"]);
  assert.deepEqual(tapsOn(P[5]), []);
});

test("a failed try says why: counting from 1, the indices swapped, a view read as laid out on its own, column-major, one off", () => {
  assert.deepEqual(why(0, null), ["none", ""]);
  assert.deepEqual(why(0, cell("m34", [2, 3])), ["oneBased", "T[2, 3]"]);
  assert.deepEqual(why(0, cell("m34", [2, 1])), ["swapped", "T[2, 1]"]);
  assert.deepEqual(why(0, cell("m34", [0, 0])), ["offCell", "T[0, 0]"]);
  assert.deepEqual(why(2, cell("t234", [0, 1, 2])), ["swapped", "T[0, 1, 2]"]);
  // T[2, 1] of a 3 × 4: row-major 9, column-major 2 + 3·1 = 5.
  assert.deepEqual(why(1, mem(5)), ["colMajor", "5"]);
  assert.deepEqual(why(1, mem(10)), ["near", "10"]);
  assert.deepEqual(why(1, mem(0)), ["offPlace", "0"]);
  // Tᵀ[3, 1] read as if Tᵀ were a 4 × 3 laid out on its own: 3·3 + 1 = 10.
  assert.deepEqual(why(7, mem(10)), ["contiguous", "10"]);
  // Place 17 in column-major order is T[1, 2, 2]: 1 + 2·2 + 2·6.
  assert.deepEqual(why(4, cell("t234", [1, 2, 2])), ["colEntry", "T[1, 2, 2]"]);
  assert.deepEqual(why(4, cell("t234", [1, 1, 0])), ["nearEntry", "T[1, 1, 0]"]);
  assert.deepEqual(why(4, cell("t234", [0, 0, 0])), ["offFind", "T[0, 0, 0]"]);
  assert.deepEqual(why(6, cell("rs46", [0, 0])), ["offFind", "R[0, 0]"]);
  // The strides of 4 × 3 × 2.
  const k = (answers: string[]) => {
    const v = judgeTn(P[5], null, answers);
    return v.state === "lost" ? [v.why, v.have, v.k] : [v.state];
  };
  assert.deepEqual(k(["6", "", "1"]), ["empty", "", 1]);
  assert.deepEqual(k(["6", "two", "1"]), ["bad", "two", 1]);
  assert.deepEqual(k(["4", "3", "2"]), ["shape", "4, 3, 2", 0]);
  assert.deepEqual(k(["1", "2", "6"]), ["reversed", "1, 2, 6", 0]);
  assert.deepEqual(k(["1", "4", "12"]), ["colStrides", "1, 4, 12", 0]);
  assert.deepEqual(k(["6", "3", "1"]), ["axis", "3", 1]);
  assert.deepEqual(k([" 6 ", "2", "1"]), ["won"]);
});

test("typed whole numbers", () => {
  assert.deepEqual(["6", " 12 ", "−3", "-0"].map(readWhole), [6, 12, -3, -0]);
  for (const bad of ["", "x", "1.5", "1,5", "2e3", "--1"]) assert.equal(readWhole(bad), null, bad);
});

test("free play: readings, the walk through a view in its own order, labels", () => {
  const tr = viewOf(tnSetup("tr34"));
  // Tᵀ[3, 1] is T[1, 3], at place 7, whose number is the 8th in memory.
  assert.deepEqual(readSel(tr, cell("tr34", [3, 1])), { idx: [3, 1], place: 7, value: MEMORY[7] });
  assert.deepEqual(readSel(tr, mem(7)), { idx: [3, 1], place: 7, value: MEMORY[7] });
  assert.equal(placeSum(tr, [3, 1]), "3·1 + 1·4");
  // Walking Tᵀ jumps across memory: 0, 4, 8, 1, …
  let sel: TnSel | null = null;
  const places: number[] = [];
  for (let i = 0; i < 13; i++) {
    sel = walk(tr, sel);
    places.push(readSel(tr, sel).place);
  }
  assert.deepEqual(places, [0, 4, 8, 1, 5, 9, 2, 6, 10, 3, 7, 11, 0]);
  assert.deepEqual(walk(tr, mem(4)), view(2));
  assert.equal(entryText("T", [1, 0, 2]), "T[1, 0, 2]");
  assert.equal(setupLabel(tnSetup("m34")), "T: 3 × 4");
  assert.equal(setupLabel(tnSetup("rs46")), "T.reshape(4, 6), T: 2 × 3 × 4");
  assert.equal(tnCaption(tnSetup("t234")), "T: 2 × 3 × 4");
  assert.equal(tnCaption(tnSetup("tr34")), "T: 3 × 4 · Tᵀ = T.T: 4 × 3");
  // The setup in play: the puzzle's, or free play's own.
  assert.equal(setupOf(TN_START).id, "m34");
  assert.equal(tnPuzzle(TN_START), P[0]);
  assert.equal(setupOf({ ...TN_START, mode: "free", setup: "pm201" }).id, "pm201");
  assert.equal(tnPuzzle({ ...TN_START, mode: "free" }), null);
  assert.deepEqual([tnStars(0), tnStars(1), tnStars(4)], [3, 2, 1]);
});

test("every picture draws inside its frame; a tap finds what it is on", () => {
  for (const s of TN_SETUPS) {
    const v = viewOf(s);
    const { cells, mem: places, top } = tnLayout(v);
    for (const b of [...cells, ...places]) assert.ok(b.x >= 10 && b.x + b.cs <= TN_PLOT.w - 10 && b.y >= top && b.y + b.cs <= TN_PLOT.h - 20, s.id);
    // The view stays clear of memory and of the words over it.
    assert.ok(Math.max(...cells.map((b) => b.y + b.cs)) < TN_PLOT.memTop - 20, s.id);
    cells.forEach((b, i) => assert.deepEqual(tnHit(v, b.x + b.cs / 2, b.y + b.cs / 2), view(i), s.id));
    places.forEach((b, p) => assert.deepEqual(tnHit(v, b.x + b.cs / 2, b.y + b.cs / 2), mem(p), s.id));
    assert.equal(tnHit(v, 2, 2), null);
    // Plain, memory shows no numbers; revealed, every number twice, and a tap's partner with the line to it.
    const plain = tnSvg(s, picture);
    assert.doesNotMatch(plain, /NaN|undefined|<line/);
    assert.equal(plain.match(/<rect/g)!.length, 2 * cells.length);
    const shown = tnSvg(s, { ...picture, reveal: true, sel: mem(3) });
    assert.equal(shown.match(/#ff922b/g)!.length, 2);
    assert.equal(shown.match(/<line/g)!.length, 1);
    for (const x of MEMORY.slice(0, cells.length)) assert.equal(shown.match(new RegExp(`>${x}</text>`, "g"))!.length >= 2, true, `${s.id} ${x}`);
  }
  // Order 3 has its slices titled; a wrong tap is red, and only what was tapped is lit until revealed.
  const t = tnSetup("t234");
  assert.match(tnSvg(t, picture), />T\[1\]</);
  const wrong = tnSvg(t, { ...picture, sel: view(5), wrong: true });
  assert.match(wrong, /#e03131/);
  assert.equal(wrong.match(/#ff922b/g), null);
  assert.equal(tnSvg(t, { ...picture, sel: view(5) }).match(/#ff922b/g)!.length, 1);
  assert.match(tnSvg(tnSetup("pm201"), picture), />P\[3\]</);
});
