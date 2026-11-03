// How a question felt against the model's prediction (issue #292): the export read, ranks and Spearman's ρ, the
// three correlations, intervals from resampling students, and what is left out.
import { test } from "node:test";
import assert from "node:assert/strict";
import { correlation, ranks, ratedAnswers, ratingCheck, spearman, type RatedAnswer } from "../src/model/ratingCheck.ts";
import { rng } from "../src/model/random.ts";

const close = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

test("ranks share ties; Spearman's ρ is 1 for any rising pair, −1 for a falling one, null without spread", () => {
  assert.deepEqual(ranks([10, 30, 20, 20]), [1, 4, 2.5, 2.5]);
  close(spearman([1, 2, 3, 4], [1, 4, 9, 16])!, 1);
  close(spearman([1, 2, 3, 4], [8, 4, 2, 1])!, -1);
  assert.equal(spearman([1, 2, 3], [5, 5, 5]), null);
  assert.equal(spearman([1, 2], [1, 2]), null);
});

test("from the export: only rated answers with a prediction, first_correct as a flag", () => {
  const rows = [
    { student: "s1", rated: "easy", predicted: "0.9", first_correct: "1" },
    { student: "s1", rated: "", predicted: "0.5", first_correct: "0" },
    { student: "s2", rated: "hard", predicted: "", first_correct: "0" },
    { student: "s2", rated: "meh", predicted: "0.4", first_correct: "0" },
    { student: "s2", rated: "hard", predicted: "0.3", first_correct: "0" },
  ];
  assert.deepEqual(ratedAnswers(rows), [
    { student: "s1", rated: "easy", predicted: 0.9, firstCorrect: true },
    { student: "s2", rated: "hard", predicted: 0.3, firstCorrect: false },
  ]);
});

/** A class whose ratings follow the model's chance (noisily) when `follows`, and ignore it otherwise. */
function cls(follows: boolean, students = 12, each = 20): RatedAnswer[] {
  const r = rng(7);
  return Array.from({ length: students }, (_, s) => Array.from({ length: each }, (): RatedAnswer => {
    const predicted = 0.2 + 0.7 * r.next();
    const firstCorrect = r.next() < predicted;
    const felt = (follows ? predicted : 0.55) + r.normal(0.12);
    return { student: `s${s}`, predicted, firstCorrect, rated: felt > 0.7 ? "easy" : felt < 0.4 ? "hard" : "right" };
  })).flat();
}

test("ratings that follow the model: ρ clearly positive, overall and within each outcome, and the groups in order", () => {
  const c = ratingCheck(cls(true), 500);
  assert.equal(c.answers, 240);
  assert.equal(c.students, 12);
  for (const k of ["all", "right", "wrong"] as const) {
    assert.ok(c[k]!.rho > 0.5, `${k} ${c[k]!.rho}`);
    assert.ok(c[k]!.ci![0] > 0, `${k} interval above 0`);
  }
  const { easy, right, hard } = c.byRating;
  assert.ok(easy!.predicted > right!.predicted && right!.predicted > hard!.predicted);
  assert.equal(easy!.answers + right!.answers + hard!.answers, 240);
});

test("ratings that ignore the model: the interval covers 0", () => {
  const c = ratingCheck(cls(false), 500);
  assert.ok(c.all!.ci![0] < 0 && c.all!.ci![1] > 0, JSON.stringify(c.all));
});

test("the interval is the same on every run, and there is none for one student", () => {
  const as = cls(true, 5, 10);
  assert.deepEqual(correlation(as, 300), correlation(as, 300));
  const one = correlation(as.filter((a) => a.student === "s0"), 300)!;
  assert.equal(one.students, 1);
  assert.equal(one.ci, null);
  const empty = ratingCheck([], 10);
  assert.deepEqual([empty.all, empty.byRating.easy], [null, null]);
});
