// The solve ladder: every coding question has its techniques and costs, its questions offer four different answers
// with the right one among them, and the "what happens next?" questions made from a trace's kinds of step always
// offer the step that really comes next.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { PROBLEM_IDS, problemInfo, problemTrace, SYSTEM_CATEGORIES } from "../src/math/problems/index.ts";
import { CODING_IDS, costQuestion, DONE, isCoding, RUNGS, rungsOf, solveInfo, stepKind, TECHNIQUES, techniqueQuestion, withAsks } from "../src/math/problems/solve.ts";

test("every coding question, and only those, has its techniques and costs", () => {
  const coding = PROBLEM_IDS.filter((id) => !SYSTEM_CATEGORIES.includes(problemInfo(id).cat));
  assert.equal(coding.length, 205);
  assert.deepEqual(new Set(CODING_IDS), new Set(coding));
  assert.equal(isCoding("lruCache"), true);
  assert.equal(isCoding("urlShortener"), false);
  const used = new Set<string>();
  for (const id of CODING_IDS) {
    const { techniques, brute, time, space } = solveInfo(id);
    for (const t of techniques) {
      assert.ok((TECHNIQUES as readonly string[]).includes(t), `${id}: ${t}`);
      used.add(t);
    }
    assert.equal(new Set(techniques).size, techniques.length, id);
    for (const c of [brute, time, space]) if (c !== undefined) assert.match(c, /^O\(.+\)$/, id);
    assert.notEqual(brute, time, `${id}: the brute force is slower than the solution`);
  }
  assert.deepEqual([...TECHNIQUES].filter((t) => !used.has(t)), [], "every technique is some problem's");
});

test("each technique question offers the main technique, three wrong ones, and nothing else that is right", () => {
  for (const id of CODING_IDS) {
    const q = techniqueQuestion(id);
    const { techniques } = solveInfo(id);
    if (!techniques.length) {
      assert.equal(q, undefined, id);
      continue;
    }
    assert.equal(q!.options.length, 4, id);
    assert.equal(new Set(q!.options).size, 4, id);
    assert.deepEqual(q!.options.filter((o) => techniques.includes(o)), [techniques[0]], id);
  }
  // The right answer doesn't always sit in the same place.
  const places = new Set(CODING_IDS.map((id) => techniqueQuestion(id)?.options.indexOf(solveInfo(id).techniques[0])));
  assert.ok(places.size >= 4);
});

test("each cost question offers the right cost once among four", () => {
  for (const id of CODING_IDS)
    for (const which of ["brute", "time", "space"] as const) {
      const q = costQuestion(id, which);
      const right = solveInfo(id)[which];
      if (!right) {
        assert.equal(q, undefined, id);
        continue;
      }
      assert.equal(q!.right, right);
      assert.equal(q!.options.length, 4, `${id} ${which}`);
      assert.equal(new Set(q!.options).size, 4, `${id} ${which}`);
      assert.equal(q!.options.filter((o) => o === right).length, 1, `${id} ${which}`);
    }
});

test("the rungs: a problem that is a technique has no technique question, one without a brute force no brute force", () => {
  assert.deepEqual(rungsOf("twoNumberSum"), [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(rungsOf("bubbleSort"), [0, 3, 4, 5]);
  assert.deepEqual(rungsOf("reverseLinkedList"), [0, 1, 3, 4, 5]);
  assert.equal(DONE, RUNGS.length);
});

test("a kind of step is its note without the numbers and the quoted words", () => {
  assert.equal(stepKind("8: is 10 − 8 = 2 in the set? Yes!"), "#: is # − # = # in the set? Yes!");
  assert.equal(stepKind("“abc” ≠ “abd”: −3 and 1.5"), "“” ≠ “”: # and #");
});

test("before every step, the question offers what really happens next, and other kinds of step the trace takes", () => {
  let asking = 0;
  for (const [lang, t] of Object.entries({ en, ka, ru }))
    for (const id of CODING_IDS) {
      const w = t.live.problems;
      const frames = withAsks(problemTrace(id, problemInfo(id).example, w).frames, w.solve.whatNext);
      // The kinds of step on the way, the answer's own left out.
      const kinds = new Set(frames.slice(1, -1).map((f) => stepKind(f.note)));
      kinds.delete(stepKind(frames[frames.length - 1].note));
      frames.forEach((f, k) => {
        if (!f.ask) return;
        const where = `${id} (${lang}) @ ${k}`;
        assert.ok(k < frames.length - 1, where);
        assert.equal(f.ask.options[f.ask.answer], frames[k + 1].note, where);
        assert.ok(f.ask.options.length >= 2 && f.ask.options.length <= 3, where);
        assert.equal(new Set(f.ask.options).size, f.ask.options.length, where);
        // Different kinds of step, or (when the steps on the way are all of one kind) the same step with another number.
        if (kinds.size >= 2) assert.equal(new Set(f.ask.options.map(stepKind)).size, f.ask.options.length, `${where}: different kinds of step`);
        for (const o of f.ask.options) assert.doesNotMatch(o, /#|undefined/, where);
      });
      if (kinds.size >= 2) assert.ok(frames.slice(0, -1).every((f) => f.ask), `${id} (${lang}): asks before every step`);
      else assert.ok(frames.some((f) => f.ask), `${id} (${lang}): asks for a number`);
      if (lang === "en" && frames.some((f) => f.ask)) asking++;
    }
  assert.equal(asking, 205);
});

test("the ladder's words fill their placeholders in every language", () => {
  for (const t of [en, ka, ru]) {
    const s = t.live.problems.solve;
    assert.equal(s.rungs.length, RUNGS.length);
    assert.deepEqual(Object.keys(s.techniques).sort(), [...TECHNIQUES].sort());
    assert.match(s.techniqueRight, /\{names\}.*\{signal\}/);
    assert.match(s.techniqueWrong, /\{name\}.*\{signal\}/);
    assert.match(s.plan, /\{o\}/);
    assert.match(s.score, /\{right\}.*\{n\}|\{n\}.*\{right\}/);
  }
});
