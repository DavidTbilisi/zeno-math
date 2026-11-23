// Marking a word problem first (issue #582): every bar-model structure and every proportion word problem comes in
// sentences, each with the mark its structure gives it; the noise sentence's number is one the answer doesn't use; the
// marks read the same in every language; a pick is checked, the first wrong one found, and the marks reach the attempt.
import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "../src/locales/en.ts";
import { ka } from "../src/locales/ka.ts";
import { ru } from "../src/locales/ru.ts";
import { rng } from "../src/math/random.ts";
import { BAR_FORMS, BAR_STORY, barQuestion, barSentences, type BarForm, type BarQuestion } from "../src/math/barProblems.ts";
import { WORD_KINDS, wordQuestion, wordSentences } from "../src/math/proportion.ts";
import { exercise, LEVELS } from "../src/math/practice.ts";
import { fill } from "../src/math/chart.ts";
import { firstWrong, markOf, MARKS, pickCode, PICK_CODES, pickRight, textOf, usesOf, type MarkedSentence } from "../src/math/wordMarks.ts";
import { FEATURES, hasFeature, ON_TRIAL } from "../src/model/arms.ts";
import { markedLog, startLog, studentHas, toAttempt } from "../src/learner.ts";

const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1);
const FORMS = Object.values(BAR_FORMS).flat();
const W = en.pracWords.barModels;

// The working of each structure, written again here, so the marks are checked against it and not against themselves.
const SOLVE: Record<BarForm, (v: Record<string, number>) => number> = {
  less: (v) => v.a - v.d,
  posts: (v) => v.L / v.g + 1,
  howMuchMore: (v) => 2 * v.a - v.t,
  sumDiff: (v) => (v.t - v.d) / 2,
  times: (v) => (v.k * v.t) / (v.k + 1),
  loop: (v) => v.L / v.g,
  give: (v) => (2 * v.g * v.k) / (v.k - 1),
  leftShort: (v) => (v.l + v.s) / (v.q - v.p),
  three: (v) => (v.t + 3 * v.d) / 4,
};
/** Who has more in each relation of a structure (a, b, c: Ann, Ben, Cara), in the order its sentences compare. */
const BIGGER: Partial<Record<BarForm, string[]>> = { less: ["a"], sumDiff: ["a"], times: ["a"], give: ["a"], three: ["a", "c"] };

const plainFill = (q: BarQuestion) => (s: string) => fill(s, { ...Object.fromEntries(Object.entries(q.vars).map(([k, v]) => [k, String(v)])), z: String(q.noise?.z ?? "") });
/** The numbers a sentence names, by the placeholders of its template. */
const namedIn = (template: string) => [...template.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);

test("every bar-model structure comes in sentences, each marked as its structure says", () => {
  for (const form of FORMS)
    for (const seed of SEEDS) {
      const q = barQuestion(form, rng(seed));
      const marked = barSentences(q, W, plainFill(q));
      const templates = [...W.prompt[form]];
      if (q.noise) templates.splice(q.noise.at, 0, W.noise[q.noise.kind]);
      assert.equal(marked.length, BAR_STORY[form].length + (q.noise ? 1 : 0), `${form} ${seed}`);
      // The question is the last sentence, and the only one asked.
      assert.deepEqual(marked.map((s) => s.mark === "asked"), marked.map((_, i) => i === marked.length - 1), `${form} ${seed}`);
      assert.match(marked.at(-1)!.text, /\?$/);
      const relations: string[] = [];
      marked.forEach((s, i) => {
        const keys = namedIn(templates[i]);
        // A number the answer uses changes the answer when it changes; one it doesn't use, doesn't.
        const used = keys.filter((k) => k in q.vars && SOLVE[form]({ ...q.vars, [k]: q.vars[k] + 1 }) !== SOLVE[form](q.vars));
        if (s.mark === "given") assert.ok(used.length, `${form} ${seed}: "${s.text}" is given but its numbers aren't used`);
        if (s.mark === "notNeeded") {
          assert.ok(q.noise && i === q.noise.at, `${form} ${seed}: only the noise is not needed`);
          assert.deepEqual(keys, ["z"]);
          assert.ok(s.text.includes(String(q.noise.z)));
        }
        if (s.mark === "relation") {
          assert.ok(s.compare, `${form} ${seed}: a relation says who is compared`);
          relations.push(Object.entries(W.names).find(([, name]) => name === s.compare!.who[s.compare!.bigger])![0]);
        } else assert.equal(s.compare, undefined);
      });
      assert.deepEqual(relations, BIGGER[form] ?? [], `${form} ${seed}: who has more`);
    }
});

test("the noise: only on medium and hard, sometimes, never first, with a number of its own the answer doesn't use", () => {
  const seen = new Set<string>();
  for (const form of FORMS)
    for (const seed of SEEDS) {
      const q = barQuestion(form, rng(seed));
      const level = LEVELS.find((L) => BAR_FORMS[L].includes(form))!;
      seen.add(`${level}:${!!q.noise}`);
      if (!q.noise) continue;
      assert.ok(level > 1, `${form}: no noise on easy`);
      assert.ok(q.noise.at >= 1 && q.noise.at < BAR_STORY[form].length, `${form} ${seed}: at ${q.noise.at}`);
      const { z } = q.noise;
      assert.ok(!Object.values(q.vars).includes(z) && z !== q.v, `${form} ${seed}: ${z} is another number of the question`);
      // The answer is the same whatever the noise says: it is worked from the other numbers alone.
      assert.equal(SOLVE[form]({ ...q.vars, z: z + 7 }), q.v);
      // Nor do the steps on the way: none of them is the noise's number or worked from it.
      assert.ok(q.steps.every((st) => st.v !== z), `${form} ${seed}: a step is ${z}`);
    }
  for (const level of [2, 3]) assert.ok(seen.has(`${level}:true`) && seen.has(`${level}:false`), `level ${level} with and without noise`);
  assert.ok(!seen.has("1:true"));
});

test("a proportion word problem: what is given, then what is asked", () => {
  const kinds = new Set<string>();
  for (const seed of SEEDS) {
    const q = wordQuestion(rng(seed));
    kinds.add(q.kind);
    const marked = wordSentences(q, en.pracWords.proportion, (s) => fill(s, q.vars));
    assert.deepEqual(marked.map((s) => s.mark), ["given", "asked"], `${q.kind} ${seed}`);
    const { n, t, m } = q.vars as Record<string, number>;
    for (const x of [n, t]) assert.ok(marked[0].text.includes(String(x)), `${q.kind}: ${x} in "${marked[0].text}"`);
    assert.ok(marked[1].text.includes(String(m)) && marked[1].text.endsWith("?"));
  }
  assert.equal(kinds.size, WORD_KINDS.length);
  // The algebra of the higher levels isn't a word problem.
  for (const seed of SEEDS.slice(0, 20)) for (const L of [2, 3] as const) assert.equal(exercise("proportion", L, seed, en.pracWords).marked, undefined);
});

test("the marked version is the question as practice shows it, in every language, marked alike", () => {
  for (const [skill, levels] of [["barModels", LEVELS], ["proportion", [1]]] as const)
    for (const level of levels)
      for (const seed of SEEDS.slice(0, 60)) {
        const marks = [en, ka, ru].map(({ pracWords: w }) => {
          const ex = exercise(skill, level, seed, w);
          assert.ok(ex.marked?.length, `${skill} ${level} ${seed}`);
          assert.equal(ex.prompt, textOf(ex.marked!));
          for (const s of ex.marked!) assert.ok(!/[{}]/.test(s.text) && s.text.trim() === s.text && s.text.length > 3, s.text);
          return ex.marked!.map((s) => `${s.mark}${s.compare ? s.compare.bigger : ""}`).join(" ");
        });
        assert.equal(new Set(marks).size, 1, `${skill} ${level} ${seed}: ${marks.join(" | ")}`);
      }
});

test("which amount is bigger isn't always the first one offered", () => {
  const firsts = new Set<number>();
  for (const seed of SEEDS) {
    const ex = exercise("barModels", 2, seed, en.pracWords);
    for (const s of ex.marked!) if (s.compare) firsts.add(s.compare.bigger);
  }
  assert.deepEqual([...firsts].sort(), [0, 1]);
});

test("marks from clauses, picks checked, the first wrong one found", () => {
  const uses = usesOf((v) => v.a + 2 * v.b, { a: 1, b: 2, z: 9 });
  assert.equal(uses("a") && uses("b"), true);
  assert.equal(uses("z"), false);
  assert.equal(markOf({ says: ["a"] }, uses), "given");
  assert.equal(markOf({ says: ["z"] }, uses), "notNeeded");
  assert.equal(markOf({ asks: true, says: ["a"] }, uses), "asked");
  assert.equal(markOf({ compares: ["a", "b"], says: ["b"] }, uses), "relation");
  const s: MarkedSentence[] = [
    { text: "Ann has 30.", mark: "given" },
    { text: "That is 5 more than Ben has.", mark: "relation", compare: { who: ["Ann", "Ben"], bigger: 0 } },
    { text: "Ann is 9 years old.", mark: "notNeeded" },
    { text: "How much does Ben have?", mark: "asked" },
  ];
  const right = [{ mark: "given" }, { mark: "relation", bigger: 0 }, { mark: "notNeeded" }, { mark: "asked" }] as const;
  assert.equal(firstWrong(s, [...right]), -1);
  assert.equal(firstWrong(s, [right[0], { mark: "relation", bigger: 1 }, right[2], right[3]]), 1, "the relation's bigger amount counts");
  assert.equal(firstWrong(s, [right[0], right[1], { mark: "given" }, { mark: "given" }]), 2, "only the first wrong one");
  assert.equal(firstWrong(s, [right[0]]), 1, "a sentence left unmarked is wrong");
  assert.equal(pickRight(s[0], { mark: "given", bigger: 1 }), true);
  assert.deepEqual(right.map(pickCode), ["given", "relation:0", "notNeeded", "asked"]);
  for (const m of MARKS) assert.ok(PICK_CODES.includes(pickCode({ mark: m, bigger: 1 })));
});

test("marking is on trial: only the arm with it in a class testing it; the marks go with the attempt, the answers timed after", () => {
  assert.equal(FEATURES.at(-1), "marking", "a new feature joins at the end");
  assert.ok(ON_TRIAL.includes("marking"));
  assert.equal(studentHas(null, "marking"), false, "nobody signed in");
  assert.equal(hasFeature({ feature: "marking", arm: "on" }, "marking"), true);
  assert.equal(hasFeature({ feature: "marking", arm: "off" }, "marking"), false);
  assert.equal(hasFeature({ feature: "spaced", arm: "on" }, "marking"), false);
  const log = startLog(1000, 0);
  markedLog(log, ["given", "relation:0", "asked"], 12_000);
  log.answers.push({ input: "25", verdict: "correct", ms: 15_000 - log.t0 });
  log.outcome = "solved";
  log.msTotal = 3000;
  const ex = exercise("barModels", 1, 1, en.pracWords);
  const a = toAttempt(log, ex, { policy: "adaptive", review: false, predicted: null }, { code: "S", class: "C", condition: "adaptive" })!;
  assert.deepEqual(a.marks, { picks: ["given", "relation:0", "asked"], ms: 12_000 });
  assert.equal(a.answers[0].ms, 3000, "the first answer is timed from the start of solving");
});
