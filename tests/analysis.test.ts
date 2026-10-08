// The study's analysis: least squares, ANCOVA and Welch's test against hand-worked values and printed t tables, and
// the tests export read into per-student scores and analysed, finished tests only.
import { test } from "node:test";
import assert from "node:assert/strict";
import { analyseStudy, ancova, answerChecks, inverse, ols, scoresFromTests, twoSided, welch, type StudyRow } from "../src/model/analysis.ts";
import { tUpper } from "../src/math/distributions.ts";

const close = (a: number, b: number, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);

test("two-sided p-values and t quantiles agree with printed tables", () => {
  close(twoSided(2.228139, 10), 0.05, 1e-6);
  close(twoSided(2.570582, 5), 0.05, 1e-6);
  close(twoSided(-2.042272, 30), 0.05, 1e-6);
  close(twoSided(0, 7), 1);
  close(tUpper(0.025, 10), 2.228139, 1e-5);
});

test("a matrix inverse and a simple regression come out as worked by hand", () => {
  const inv = inverse([[4, 7], [2, 6]])!;
  [[0.6, -0.7], [-0.2, 0.4]].forEach((row, i) => row.forEach((v, j) => close(inv[i][j], v)));
  assert.equal(inverse([[1, 2], [2, 4]]), null);
  // x = 1…5, y = 2, 4, 5, 4, 5: slope 0.6, intercept 2.2, SSE 2.4 on 3 df.
  const fit = ols([1, 2, 3, 4, 5].map((x) => [1, x]), [2, 4, 5, 4, 5]);
  close(fit.beta[0], 2.2);
  close(fit.beta[1], 0.6);
  close(fit.se[1], Math.sqrt(0.8 / 10));
  close(fit.se[0], Math.sqrt(0.8 * (1 / 5 + 9 / 10)));
  close(fit.r2, 0.6);
  assert.equal(fit.df, 3);
  assert.throws(() => ols([[1, 1], [1, 1], [1, 1]], [1, 2, 3]), /collinear/);
});

test("ANCOVA: with the same pre-tests in both groups the effect is the difference in post-test means", () => {
  const rows: StudyRow[] = [
    ...[[0.2, 0.5], [0.4, 0.6], [0.6, 0.8]].map(([pre, post]): StudyRow => ({ treated: 1, pre, post })),
    ...[[0.2, 0.3], [0.4, 0.5], [0.6, 0.6]].map(([pre, post]): StudyRow => ({ treated: 0, pre, post })),
  ];
  const a = ancova(rows);
  close(a.estimate, 0.5 / 3);
  assert.equal(a.df, 3);
  close(a.ci[1] - a.estimate, tUpper(0.025, 3) * a.se);
  close(a.p, twoSided(a.t, 3));
  close(a.adjusted.treated - a.adjusted.control, a.estimate);
  assert.deepEqual(a.n, { treated: 3, control: 3 });
});

test("ANCOVA finds an effect hidden by unequal pre-tests, and allows for classes", () => {
  // post = 0.1 + 0.05·treated + 0.9·pre exactly, but the treated group started lower: gains favour it, post-tests don't.
  const rows: StudyRow[] = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6].flatMap((pre, i) => [
    { treated: 1 as const, pre: pre - 0.1, post: 0.1 + 0.05 + 0.9 * (pre - 0.1) + (i % 2 ? 0.001 : -0.001), class: i < 3 ? "A" : "B" },
    { treated: 0 as const, pre, post: 0.1 + 0.9 * pre + (i % 2 ? -0.001 : 0.001), class: i < 3 ? "A" : "B" },
  ]);
  const a = ancova(rows);
  close(a.estimate, 0.05, 0.002);
  assert.ok(a.p < 0.001);
  assert.equal(a.df, rows.length - 4, "intercept, condition, pre-test and one class dummy");
  // The form order is a factor too: a harder form B taken second by some students is allowed for.
  const ordered = rows.map((r, i) => ({ ...r, order: i % 4 < 2 ? "AB" : "BA", post: r.post - (i % 4 < 2 ? 0.03 : 0) }));
  const b = ancova(ordered);
  close(b.estimate, 0.05, 0.002);
  assert.equal(b.df, rows.length - 5);
});

test("Welch's test: the difference, its standard error and the Welch–Satterthwaite degrees of freedom", () => {
  const w = welch([1, 2, 3, 4], [2, 4, 6, 8, 10]);
  close(w.estimate, -3.5);
  close(w.se, Math.sqrt(5 / 3 / 4 + 10 / 5));
  close(w.df, (5 / 12 + 2) ** 2 / ((5 / 12) ** 2 / 3 + 2 ** 2 / 4));
  close(w.p, twoSided(w.t, w.df));
});

const row = (student: string, condition: string, order: string, phase: string, form: string, item: number, correct: boolean) =>
  ({ student, class: "K", condition, test_order: order, phase, form, item: String(item), verdict: correct ? "correct" : "wrong", correct: correct ? "1" : "0" });
/** A student's two tests of four questions: how many right on each. */
const sit = (student: string, condition: string, order: string, pre: number, post: number | null) => [
  ...[0, 1, 2, 3].map((i) => row(student, condition, order, "pre", order[0], i, i < pre)),
  ...(post === null ? [] : [0, 1, 2, 3].map((i) => row(student, condition, order, "post", order[1], i, i < post))),
];

test("the tests export becomes scores per student, and only students who finished both tests are analysed", () => {
  const rows = [
    ...sit("s1", "adaptive", "AB", 1, 3), ...sit("s2", "adaptive", "BA", 2, 4), ...sit("s3", "adaptive", "AB", 2, 3),
    ...sit("s4", "fixed", "AB", 1, 2), ...sit("s5", "fixed", "BA", 2, 2), ...sit("s6", "fixed", "AB", 3, 3),
    ...sit("s7", "fixed", "BA", 2, null), // no post-test
    ...sit("s8", "adaptive", "AB", 0, 4).slice(0, 7), // one post-test question unanswered
  ];
  const scores = scoresFromTests(rows);
  assert.equal(scores.length, 8);
  assert.deepEqual(scores[0], { student: "s1", class: "K", condition: "adaptive", order: "AB", pre: { form: "A", answered: 4, correct: 1 }, post: { form: "B", answered: 4, correct: 3 } });
  const r = analyseStudy(scores);
  assert.equal(r.testLength, 4);
  assert.deepEqual(r.students, { adaptive: { all: 4, complete: 3 }, fixed: { all: 4, complete: 3 } });
  close(r.means.adaptive.pre, 5 / 12);
  close(r.means.adaptive.post, 10 / 12);
  close(r.means.fixed.gain, 1 / 12);
  assert.ok(r.ancova && r.ancova.estimate > 0, "adaptive gained more here");
  close(r.gains!.estimate, 5 / 12 - 1 / 12);
  // Form check: every finished pre-test (s7's too), A against B.
  close(r.forms!.estimate, (1 + 2 + 1 + 3 + 0) / 5 / 4 - (2 + 2 + 2) / 3 / 4);
});

test("late answers and the browser's disagreements are counted per condition, from any export", () => {
  const rows: Record<string, string>[] = [...sit("s1", "adaptive", "AB", 1, 3), ...sit("s2", "fixed", "AB", 2, 2)];
  rows[0] = { ...rows[0], late: "1" };
  rows[9] = { ...rows[9], client_verdict: "correct", late: "0" };
  assert.deepEqual(answerChecks(rows), { adaptive: { answers: 8, late: 1, remarked: 0 }, fixed: { answers: 8, late: 0, remarked: 1 } });
});

test("with too few finished tests there is no comparison, rather than a meaningless one", () => {
  const r = analyseStudy(scoresFromTests([...sit("s1", "adaptive", "AB", 1, 3), ...sit("s2", "fixed", "AB", 2, 2)]));
  assert.equal(r.ancova, null);
  assert.equal(r.gains, null);
  assert.equal(r.forms, null);
});
