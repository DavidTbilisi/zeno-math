// Be the sort: a player who makes the algorithm's moves finishes every puzzle and endless task, the moves are the ones
// a plain implementation of each algorithm makes, every wrong tap is refused with the rule it broke, the tasks are
// worth playing, and the stars, notices, pictures and words follow the rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { rng } from "../src/math/random.ts";
import { checkTap, levelSpec, moveLine, SORT_ALGOS, SORT_LADDER, SORT_PLAY_CODE, sortCodeSvg, sortNotice, sortNow, sortRun, sortStars, sortSvg, sortTask, type SortLevel, type SortTask } from "../src/math/beSort.ts";

const ascending = (a: number[]) => [...a].sort((x, y) => x - y);
const tasks = (): { t: SortTask; where: string }[] => [
  ...SORT_LADDER.map((_, stage) => ({ t: sortNow({ mode: "puzzle", stage, level: 1, seed: 1 }), where: `puzzle ${stage + 1}` })),
  ...([1, 2, 3] as SortLevel[]).flatMap((level) => Array.from({ length: 50 }, (_, i) => ({ t: sortNow({ mode: "endless", stage: 0, level, seed: 100 + i }), where: `level ${level} seed ${100 + i}` }))),
];

/** The swaps, drops, picks and takes each algorithm makes, written the plain way. */
function plainMoves(t: SortTask): number[] {
  const a = [...t.a];
  const out: number[] = [];
  if (t.algo === "bubble")
    for (let pass = 0; pass < a.length - 1; pass++) {
      let swapped = false;
      for (let j = 0; j < a.length - 1 - pass; j++) if (a[j] > a[j + 1]) ([a[j], a[j + 1]] = [a[j + 1], a[j]]), out.push(j), (swapped = true);
      if (!swapped) break;
    }
  if (t.algo === "insertion")
    for (let i = 1; i < a.length; i++) {
      const key = a[i];
      let j = i - 1;
      while (j >= 0 && a[j] > key) (a[j + 1] = a[j]), j--;
      a[j + 1] = key;
      out.push(j + 1);
    }
  if (t.algo === "selection")
    for (let i = 0; i < a.length - 1; i++) {
      const m = a.indexOf(Math.min(...a.slice(i)), i);
      out.push(m);
      [a[i], a[m]] = [a[m], a[i]];
    }
  if (t.algo === "merge") {
    let [p, q] = [0, t.mid];
    while (p < t.mid && q < a.length) out.push(a[p] <= a[q] ? (p++, 0) : (q++, 1));
  }
  if (t.algo === "partition") a.slice(0, -1).forEach((x, j) => x < a[a.length - 1] && out.push(j));
  if (t.algo === "quick") {
    const qs = (lo: number, hi: number) => {
      if (lo >= hi) return;
      let i = lo;
      for (let j = lo; j < hi; j++) if (a[j] < a[hi]) ([a[i], a[j]] = [a[j], a[i]]), out.push(j), i++;
      [a[i], a[hi]] = [a[hi], a[i]];
      out.push(hi);
      qs(lo, i - 1);
      qs(i + 1, hi);
    };
    qs(0, a.length - 1);
  }
  return out;
}

test("the algorithm's own moves finish every task, as a plain implementation makes them, and leave it sorted", () => {
  for (const { t, where } of tasks()) {
    const run = sortRun(t);
    assert.deepEqual(run.moves, plainMoves(t), where);
    assert.equal(run.looks.length, run.moves.length, where);
    assert.ok(run.moves.length >= 1, where);
    run.moves.forEach((m, k) => assert.deepEqual(checkTap(run, k, m), { ok: true }, `${where} move ${k}`));
    if (t.algo === "partition") {
      const at = run.end.pivotAt;
      const p = t.a[t.a.length - 1];
      assert.equal(run.end.a[at], p, where);
      assert.ok(run.end.a.slice(0, at).every((x) => x < p) && run.end.a.slice(at + 1).every((x) => x >= p), where);
      assert.deepEqual(ascending(run.end.a), ascending(t.a), where);
    } else assert.deepEqual(run.end.a, ascending(t.a), where);
  }
});

test("every task is worth playing: never sorted already, merge runs that interleave, a pivot that splits", () => {
  for (const { t, where } of tasks()) {
    if (t.algo === "merge") {
      const [l, r] = [t.a.slice(0, t.mid), t.a.slice(t.mid)];
      assert.deepEqual(l, ascending(l), where);
      assert.deepEqual(r, ascending(r), where);
      assert.ok(l[l.length - 1] > r[0] && r[r.length - 1] > l[0], where);
    } else assert.notDeepEqual(t.a, ascending(t.a), where);
    if (t.algo === "partition") {
      const n = sortRun(t).moves.length;
      assert.ok(n >= 2 && n <= t.a.length - 3, where);
    }
  }
  assert.deepEqual(
    SORT_LADDER.map((s, stage) => [sortNow({ mode: "puzzle", stage, level: 1, seed: 1 }).algo, s.n]),
    [["bubble", 5], ["bubble", 6], ["insertion", 5], ["insertion", 7], ["selection", 6], ["selection", 6], ["merge", 6], ["partition", 7], ["merge", 8], ["quick", 6], ["quick", 8]],
  );
  // The repeated values puzzle has two smallest alike to choose from at least once.
  const dups = sortRun(sortNow({ mode: "puzzle", stage: 5, level: 1, seed: 1 }));
  assert.ok(
    dups.moves.some((m, k) => {
      const look = dups.looks[k];
      return look.algo === "selection" && look.a.indexOf(look.a[m], m + 1) > 0 && checkTap(dups, k, look.a.indexOf(look.a[m], m + 1)).ok === false;
    }),
  );
  // The endless levels: the three simple sorts first, then every algorithm.
  for (let s = 1; s <= 200; s++) {
    assert.ok(["bubble", "insertion", "selection"].includes(levelSpec(1, rng(s)).algo!));
    assert.equal(levelSpec(2, rng(s)).algo, null);
  }
  const seen = new Set(Array.from({ length: 60 }, (_, i) => sortTask({ algo: null, n: 8 }, rng(i + 1)).algo));
  assert.deepEqual([...seen].sort(), [...SORT_ALGOS].sort());
});

test("a wrong tap is refused with the rule it broke, worked by hand", () => {
  const why = (t: SortTask, k: number, tap: number) => {
    const c = checkTap(sortRun(t), k, tap);
    return c.ok ? "ok" : [c.why, c.vars];
  };
  // Bubble sort of 3 5 2 8 1: first 5 ⇄ 2 (gap 1), then 8 ⇄ 1 (gap 3), and 8 is settled.
  const bubble: SortTask = { algo: "bubble", a: [3, 5, 2, 8, 1], mid: 5 };
  assert.deepEqual(sortRun(bubble).moves.slice(0, 2), [1, 3]);
  assert.deepEqual(why(bubble, 0, 0), ["inOrder", { x: 3, y: 5 }]);
  assert.deepEqual(why(bubble, 0, 3), ["first", { x: 5, y: 2 }]);
  assert.deepEqual(why(bubble, 2, 3), ["settled", {}]);
  // Insertion of 1 into 2 4 6 slides past all three; 5 stops after 4, short of 2 and past 6 both wrong.
  assert.deepEqual(why({ algo: "insertion", a: [2, 4, 6, 1], mid: 4 }, 2, 1), ["slidesPast", { x: 2, k: 1 }]);
  const late: SortTask = { algo: "insertion", a: [2, 4, 6, 5], mid: 4 };
  assert.deepEqual(why(late, 2, 1), ["stopsAfter", { x: 4, k: 5 }]);
  assert.deepEqual(why(late, 2, 3), ["slidesPast", { x: 6, k: 5 }]);
  // Selection: the sorted part, a bigger one, the second of two alike.
  const selection: SortTask = { algo: "selection", a: [4, 1, 3, 1], mid: 4 };
  assert.deepEqual(why(selection, 0, 0), ["notMin", { m: 1, x: 4 }]);
  assert.deepEqual(why(selection, 0, 3), ["firstMin", { m: 1 }]);
  assert.deepEqual(why(selection, 1, 0), ["sortedPart", {}]);
  // Merge of 2 5 | 3 5: 2 goes, then 3, then a tie of 5s goes from the top run.
  const merge: SortTask = { algo: "merge", a: [2, 5, 3, 5], mid: 2 };
  assert.deepEqual(sortRun(merge).moves, [0, 1, 0]);
  assert.deepEqual(why(merge, 0, 1), ["smaller", { x: 2, y: 3 }]);
  assert.deepEqual(why(merge, 2, 1), ["tie", { x: 5 }]);
  // Partition of 7 2 9 1 5 around 5: 2 goes behind the wall, then 1.
  const partition: SortTask = { algo: "partition", a: [7, 2, 9, 1, 5], mid: 5 };
  assert.deepEqual(sortRun(partition).moves, [1, 3]);
  assert.deepEqual(why(partition, 0, 0), ["notSmaller", { x: 7, p: 5 }]);
  assert.deepEqual(why(partition, 0, 3), ["scanFirst", { x: 2, p: 5 }]);
  assert.deepEqual(why(partition, 1, 0), ["behind", { x: 2 }]);
  assert.deepEqual(sortRun(partition).end, { algo: "partition", a: [2, 1, 5, 7, 9], done: true, pivotAt: 2 });
  // Quicksort of 3 7 1 8 2 5: around 5 take 3, 1, 2 and land 5 at place 3; then 3 1 2 around 2 takes 1 and lands 2;
  // then 7 8 around 8 takes 7 and lands 8 where it is.
  const quick: SortTask = { algo: "quick", a: [3, 7, 1, 8, 2, 5], mid: 6 };
  assert.deepEqual(sortRun(quick).moves, [0, 2, 4, 5, 1, 2, 4, 5]);
  assert.deepEqual(why(quick, 0, 1), ["notSmaller", { x: 7, p: 5 }]);
  assert.deepEqual(why(quick, 0, 2), ["scanFirst", { x: 3, p: 5 }]);
  assert.deepEqual(why(quick, 0, 5), ["pivotEarly", { x: 3, p: 5 }]);
  assert.deepEqual(why(quick, 1, 0), ["behind", { x: 3 }]);
  assert.deepEqual(why(quick, 3, 3), ["landNow", { p: 5 }]);
  assert.deepEqual(why(quick, 4, 3), ["fixed", { x: 5 }]);
  assert.deepEqual(why(quick, 4, 4), ["otherPart", { x: 7 }]);
  assert.deepEqual(sortRun(quick).end.a, [1, 2, 3, 5, 7, 8]);
});

test("stars and notices: no miss three stars and what the run showed, ten in a row", () => {
  assert.deepEqual([0, 1, 2, 5].map(sortStars), [3, 2, 1, 1]);
  const early = sortRun({ algo: "bubble", a: [1, 3, 2, 4, 5], mid: 5 });
  assert.deepEqual(early.seen, ["earlyStop"]);
  assert.equal(sortNotice(early, 0, 1), "earlyStop");
  assert.equal(sortNotice(early, 1, 1), null);
  assert.equal(sortNotice(early, 1, 10), "streak10");
  assert.deepEqual(sortRun({ algo: "bubble", a: [5, 4, 3, 2, 1], mid: 5 }).seen, []);
  assert.deepEqual(sortRun({ algo: "insertion", a: [1, 3, 2], mid: 3 }).seen, ["inPlace"]);
  assert.deepEqual(sortRun({ algo: "selection", a: [1, 3, 2], mid: 3 }).seen, ["selfSwap"]);
  assert.deepEqual(sortRun({ algo: "merge", a: [1, 2, 3, 9], mid: 2 }).seen, ["runEmpty"]);
  assert.deepEqual(sortRun({ algo: "merge", a: [1, 4, 2, 3], mid: 2 }).seen, []);
  assert.deepEqual(sortRun({ algo: "partition", a: [7, 2, 9, 1, 5], mid: 5 }).seen, ["landed"]);
  assert.deepEqual(sortRun({ algo: "quick", a: [3, 7, 1, 8, 2, 5], mid: 6 }).seen, ["landed"]);
  assert.deepEqual(sortRun({ algo: "quick", a: [1, 2, 3, 4], mid: 4 }).seen, ["lopsided", "landed"]);
});

test("every picture draws without a gap, with one place to tap per move the algorithm could make", () => {
  for (const { t, where } of tasks().slice(0, 40)) {
    const run = sortRun(t);
    for (let k = 0; k <= run.moves.length; k++) {
      const pic = sortSvg(run, k);
      assert.doesNotMatch(pic.body, /NaN|undefined/, `${where} step ${k}`);
      if (k === run.moves.length) {
        assert.equal(pic.targets.length, 0, where);
        continue;
      }
      const look = run.looks[k];
      const moves = pic.targets.map((x) => x.move);
      assert.ok(moves.includes(run.moves[k]), `${where} step ${k}`);
      assert.equal(new Set(moves.map((m, i) => `${pic.targets[i].kind}${m}`)).size, moves.length, where);
      const n = t.a.length;
      const want = look.algo === "bubble" ? n - 1 : look.algo === "insertion" ? look.i + 1 : look.algo === "selection" ? n : look.algo === "merge" ? 2 : look.algo === "quick" ? n : n - 1;
      assert.equal(pic.targets.length, want, `${where} step ${k}`);
    }
  }
});

test("the code view: the same places to tap, no colour telling anything, and the line each move ran", () => {
  // What carries meaning by colour alone in the coloured picture: the role fills (key, compared, sorted, pivot, idle),
  // the wall and the bracket. In the code view colour only edges a cell a named pointer points at.
  const meaning = /#d0ebff|#ffe8cc|#d3f9d8|#f3d9fa|#f8f9fa" stroke="#dee2e6|stroke-width="4"|<path d="M [\d.]+ [\d.]+ V/;
  for (const { t, where } of tasks().slice(0, 40)) {
    const run = sortRun(t);
    for (let k = 0; k <= run.moves.length; k++) {
      const [pic, code] = [sortSvg(run, k), sortCodeSvg(run, k)];
      assert.doesNotMatch(code.body, /NaN|undefined/, `${where} step ${k}`);
      assert.deepEqual(code.targets.map((x) => `${x.kind}${x.move}`), pic.targets.map((x) => `${x.kind}${x.move}`), `${where} step ${k}`);
      // Chips are buttons, not meaning: leave them out before looking for colours.
      assert.doesNotMatch(code.body.replace(/<rect[^>]*rx="12"[^>]*\/>/g, ""), meaning, `${where} step ${k}`);
      // Every coloured cell edge belongs to a pointer: as many as there are cells pointed at.
      const edges = (code.body.match(/fill="none" stroke="#[0-9a-f]{6}" stroke-width="2.6"/g) ?? []).length;
      assert.ok(edges <= (code.body.match(/>↑</g) ?? []).length, `${where} step ${k}`);
      if (k < run.moves.length) {
        const line = moveLine(run, k);
        assert.ok(line >= 0 && line < SORT_PLAY_CODE[t.algo].length, `${where} move ${k}`);
      }
    }
  }
  // Quicksort's pointers: lo, hi, the wall i and the scan j, by name; a landing move runs the pivot's swap line.
  const quick = SORT_LADDER.find((s) => s.algo === "quick")!;
  const q = sortRun(sortTask(quick, rng(quick.seed)));
  assert.match(sortCodeSvg(q, 0).body, />lo<.*>hi<|>hi<.*>lo</s);
  const land = q.moves.findIndex((m, i) => m === (q.looks[i] as { hi: number }).hi);
  assert.equal(moveLine(q, land), 6);
  assert.equal(moveLine(q, -1), -1);
  // Under aliases: the same places to tap, the pointers and the values by their new names, in the old colours.
  const names = { lo: "low", hi: "high", i: "wall" };
  const aliased = sortCodeSvg(q, 0, names);
  assert.deepEqual(aliased.targets, sortCodeSvg(q, 0).targets);
  assert.match(aliased.body, />low<.*>high<|>high<.*>low</s);
  assert.doesNotMatch(aliased.body, />lo<|>hi</);
  assert.match(aliased.body, /fill="#2f9e44"[^>]*>low</);
});

test("the words: every algorithm, rule and notice in every language, with the same blanks", () => {
  const blanks = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
  const flat = (o: object, at = ""): [string, string][] =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === "string" ? [[at + k, v] as [string, string]] : flat(v as object, `${at}${k}.`)));
  const base = flat(en.live.beSort);
  for (const dict of [ka, ru]) {
    const other = new Map(flat(dict.live.beSort));
    assert.deepEqual([...other.keys()].sort(), base.map(([k]) => k).sort());
    for (const [k, v] of base) assert.equal(blanks(other.get(k)!), blanks(v), k);
  }
  for (const algo of SORT_ALGOS) assert.ok(en.live.beSort.names[algo] && en.live.beSort.right[algo].includes("{stars}"));
});
