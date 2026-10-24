// Logic grids: every mark a step makes holds in every answer the clues allow, a puzzle with one answer is always
// worked out to the end, each clue form means what it says, and the examples render in every language.
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderLogic, type LogicSpec } from "../src/math/logic.ts";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { everyAnswer, GRID_PRESETS, gridSteps, workGrid } from "../src/math/logicGrid.ts";

const w = en.logicWords.grid;

let seed = 5;
const rand = (n: number) => ((seed = (seed * 1103515245 + 12345) % 2147483648), (seed >>> 16) % n);
const shuffle = <T>(a: T[]) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const CATS: [string, string[]][] = [["A", ["a1", "a2", "a3", "a4"]], ["B", ["b1", "b2", "b3", "b4"]], ["N", ["10", "20", "30", "40"]], ["D", ["d1", "d2", "d3", "d4"]]];
const cats = CATS.map(([n, it]) => `${n}: ${it.join(", ")}`).join("\n");

/** True clues about a random hidden answer, in every form, until only that answer is left (or 16 clues). */
function randomPuzzle(): string {
  const perm = CATS.map((_, i) => (i === 0 ? [0, 1, 2, 3] : shuffle([0, 1, 2, 3])));
  const item = (c: number, e: number) => CATS[c][1][perm[c][e]];
  const val = (e: number) => Number(item(2, e));
  const clue = (): string => {
    const [e, f, c, d, k] = [rand(4), rand(4), rand(4), rand(4), rand(6)];
    if (c === d || e === f) return clue();
    return [
      `${item(c, e)} = ${item(d, e)}`,
      `${item(c, e)} ≠ ${item(d, f)}`,
      `${item(c, e)} ${val(e) < val(f) ? "<" : ">"} ${item(d, f)}`,
      `${item(c, e)} = ${item(d, f)} ${val(e) >= val(f) ? "+" : "-"} ${Math.abs(val(e) - val(f))}`,
      `${item(c, e)} = ${item(d, e)} | ${item(c, e)} = ${item(d, f)}`,
      `{${item(c, e)}, ${item(c, f)}} = {${item(d, f)}, ${item(d, e)}}`,
    ][k];
  };
  const clues: string[] = [];
  while (clues.length < 16 && (clues.length < 3 || everyAnswer(cats, clues.join("\n"), w).length > 1)) clues.push(clue());
  return clues.join("\n");
}

test("every mark a step makes holds in every answer, and a puzzle with one answer is worked out to the end", () => {
  let unique = 0;
  for (let t = 0; t < 60; t++) {
    const clues = randomPuzzle();
    const answers = everyAnswer(cats, clues, w);
    const wk = workGrid(cats, clues, w);
    assert.equal(wk.count, answers.length);
    for (const s of wk.steps)
      for (const [a, b, v] of s.marks) assert.ok(answers.every((ent) => (ent[a] === ent[b]) === (v === 1)), `${clues}: ${s.kind}`);
    if (answers.length === 1) {
      unique++;
      assert.ok(wk.solved, clues);
    } else assert.equal(wk.solved, false, clues);
  }
  assert.ok(unique >= 20, `${unique} unique`);
});

const count = (c: string, clues: string) => everyAnswer(c, clues, w).length;
const ABC = "Name: Ann, Ben, Cara\nPet: cat, dog, fish";
const YEARS = "Name: Ann, Ben, Cara\nYear: 2001, 2002, 2003";

test("each clue form means what it says", () => {
  assert.equal(count(ABC, ""), 6);
  assert.equal(count(ABC, "Ann = cat"), 2);
  assert.equal(count(ABC, "Ann ≠ cat"), 4);
  assert.equal(count(ABC, "Ann != cat\nAnn <> dog"), 2);
  // All different: Ann, dog and Ben are three different ones, so Cara has the dog.
  assert.equal(count(ABC, "Ann ≠ dog ≠ Ben"), 2);
  // Of Ann and Ben, one has the cat and the other the dog.
  assert.equal(count(ABC, "{Ann, Ben} = {cat, dog}"), 2);
  assert.equal(count(ABC, "Ann = cat | Ann = dog"), 4);
  assert.equal(count(ABC, "Ann = cat or Ann = dog"), 4);
  assert.equal(count(ABC, "Ann = cat -> Ben = dog"), 5);
  assert.equal(count(ABC, "if Ann = cat then Ben = dog"), 5);
  assert.equal(count(ABC, "Ann = cat <-> Ben = dog"), 4);
  assert.equal(count(ABC, "not Ann = cat and ~(Ben = dog)"), 3);
  assert.equal(count(ABC, "1. Ann = cat\n2) Ben = dog"), 1);
  assert.equal(count(YEARS, "Ann < Ben"), 3);
  assert.equal(count(YEARS, "Ann > Ben"), 3);
  assert.equal(count(YEARS, "Ann = Ben + 1"), 2);
  assert.equal(count(YEARS, "Ann = Ben − 2"), 1);
  assert.equal(count(YEARS, "Ann = 2001 + 1"), 2);
});

test("a category of numbers is put in order; a name with a digit in it is not a number", () => {
  for (const nums of ["2001, 2002, 2003", "$4, $5, $6", "3 kg, 4 kg, 5 kg", "10%, 20%, 30%", "1.5, 2.5, 3.5"]) assert.equal(count(`Name: Ann, Ben, Cara\nX: ${nums}`, "Ann < Ben"), 3, nums);
  assert.throws(() => count("Name: Ann, Ben, Cara\nRoom: Room 1, Room 2, Room 3", "Ann < Ben"), /Clue 1: <, > and \+ need a category of numbers/);
});

test("what can't be read says why", () => {
  const bad = (c: string, clues: string, re: RegExp) => assert.throws(() => workGrid(c, clues, w), re);
  bad("", "", /Type the categories/);
  bad("Name Ann, Ben", "", /isn't a category/);
  bad("Name: Ann", "", /isn't a category/);
  bad("Name: Ann, Ben", "", /At most 4 categories of 6 items/);
  bad("Name: Ann, Ben, Cara\nPet: cat, dog", "", /“Pet” needs 3 items/);
  bad("A: a, b\nB: c, d\nC: e, f\nD: g, h\nE: i, j", "", /At most 4 categories/);
  bad("A: a, b, c, d, e, f, g\nB: h, i, j, k, l, m, n", "", /At most 4 categories of 6 items/);
  bad("Name: Ann, Ben\nPet: ann, dog", "", /“ann” is in two places/);
  bad(ABC, "Ann = cat\nAnn", /Clue 2: couldn't read “Ann”/);
  bad(ABC, "Ann ==", /Clue 1: “=” isn't an item/);
  bad(ABC, "(Ann = cat", /Clue 1: couldn't read/);
  bad(ABC, "Ann = cat)", /Clue 1: couldn't read/);
  bad(ABC, "Ann ? cat", /Clue 1: couldn't read/);
  bad(ABC, "Ann = cow", /Clue 1: “cow” isn't an item/);
  bad(ABC, "Ann < Ben", /Clue 1: <, > and \+ need/);
  bad(ABC, "Ann = cat\nAnn = dog", /No arrangement fits/);
  assert.equal(gridSteps({ topic: "grid", f: "", g: "", vals: "", tf: true }, w), 0);
});

test("the examples: one answer each and worked out to the end, but for the one with too few clues", () => {
  const got = GRID_PRESETS.map((p) => {
    const wk = workGrid(p.spec.f, p.spec.g, w);
    return [p.label, wk.count, wk.solved];
  });
  assert.deepEqual(got, [
    ["Three friends", 1, true],
    ["Prices", 1, true],
    ["Dogs by year", 1, true],
    ["Needs a supposition", 1, true],
    ["Not enough clues", 7, false],
    ["Три друга", 1, true],
    ["სამი მეგობარი", 1, true],
  ]);
  const sup = GRID_PRESETS[3].spec;
  assert.ok(workGrid(sup.f, sup.g, w).steps.some((s) => s.kind === "assume" && s.why !== undefined));
});

/** The captions of one step as a single string (a long one wraps over several lines). */
const caps = (spec: LogicSpec, step?: number, words = en.logicWords) =>
  [...renderLogic({ ...spec, step }, words).svg.matchAll(/font-size="14.5"[^>]*>([^<]*)</g)].map((m) => m[1]).join(" ").replace(/&#39;/g, "'");

test("the captions say what each step did", () => {
  const friends = GRID_PRESETS[0].spec;
  assert.match(caps(friends, 0), /The empty grid and 4 clues/);
  assert.match(caps(friends, 1), /Clue 1: Ann ≠ cat\. On its own it settles ✗\s1\./);
  const withMarks = workGrid(GRID_PRESETS[2].spec.f, GRID_PRESETS[2].spec.g, w).steps.findIndex((s) => s.kind === "clue" && s.withMarks);
  assert.match(caps(GRID_PRESETS[2].spec, withMarks), /Together with the marks so far it settles/);
  assert.match(caps(friends, 2), /Clue 2: Ben = fish\. On its own it settles ✗\s4\s·\s●\s1\./);
  assert.doesNotMatch(caps(friends, 2), /● 0|✗ 0/);
  assert.match(caps(friends), /Solved in 13 steps/);
  assert.match(caps(friends, 99), /Solved in 13 steps/);
  const steps = workGrid(friends.f, friends.g, w).steps;
  const only = steps.findIndex((s) => s.kind === "only");
  assert.match(caps(friends, steps.findIndex((s) => s.kind === "copy")), /Copy across: \S+ and \S+ go together, so whatever is known of one/);
  assert.match(caps(friends, only), /Only one left: everything else in the row is ✗, so \S+ goes with \S+/);
  const sup = GRID_PRESETS[3].spec;
  const at = workGrid(sup.f, sup.g, w).steps.findIndex((s) => s.kind === "assume");
  assert.match(caps(sup, at), /Stuck, so suppose \S+ goes with \S+: then clue \d can no longer hold\. That can't be, so/);
  assert.match(caps(GRID_PRESETS[4].spec), /Stuck: the clues allow 7 different answers/);
});

test("every example renders at every step in every language", () => {
  for (const words of [en.logicWords, ru.logicWords, ka.logicWords])
    for (const p of GRID_PRESETS) {
      const n = gridSteps(p.spec, words.grid);
      for (const step of [0, Math.floor(n / 2), n]) {
        const svg = renderLogic({ ...p.spec, step }, words).svg;
        assert.doesNotMatch(svg, /NaN|undefined|\{\w+\}/, `${p.label} @ ${step}`);
      }
    }
});
