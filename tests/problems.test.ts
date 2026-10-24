// Every interview problem, in every language: its example solves and ends on its answer, every frame has a note and
// draws something, nothing says NaN or undefined, the words of all three languages fill every placeholder, and the
// registry lists each problem once, under the category it belongs to, easy ones first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { CATEGORIES, PROBLEM_IDS, problemInfo, problemsIn, problemTrace, problemWords } from "../src/math/problems/index.ts";

const LANGS = { en, ka, ru };

test("the registry: each problem once, in its category, easy ones first", () => {
  assert.equal(new Set(PROBLEM_IDS).size, PROBLEM_IDS.length);
  assert.deepEqual(CATEGORIES.flatMap((c) => problemsIn(c)), PROBLEM_IDS);
  for (const c of CATEGORIES) {
    const levels = problemsIn(c).map((id) => problemInfo(id).level);
    assert.deepEqual(levels, [...levels].sort(), c);
  }
});

test("every example solves in every language and ends on its answer", () => {
  for (const id of PROBLEM_IDS)
    for (const [lang, t] of Object.entries(LANGS)) {
      const w = t.live.problems;
      const words = problemWords(id, w);
      assert.equal(words.labels.length, problemInfo(id).example.length, `${id} (${lang}): a label for every input`);
      const trace = problemTrace(id, problemInfo(id).example, w);
      assert.ok(trace.frames.length >= 2, `${id} (${lang}): at least one step and the answer`);
      assert.equal(trace.frames[trace.frames.length - 1].note, trace.answer, `${id} (${lang})`);
      for (const [k, f] of trace.frames.entries()) {
        const where = `${id} (${lang}) @ ${k}`;
        assert.ok(f.note.trim(), `${where}: a note`);
        assert.ok(f.cells || f.rows?.length || f.list || f.tree || f.grid || f.mat || f.graph || f.spans, `${where}: a picture`);
        const all = JSON.stringify(f);
        assert.doesNotMatch(all, /NaN|undefined|Infinity|\{\w+\}/, where);
      }
    }
});

test("the words of every problem have the same keys in all three languages", () => {
  for (const id of PROBLEM_IDS) {
    const keys = Object.keys(problemWords(id, en.live.problems)).sort();
    for (const t of [ka, ru]) assert.deepEqual(Object.keys(problemWords(id, t.live.problems)).sort(), keys, id);
  }
});
