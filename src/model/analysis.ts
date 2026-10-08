// The analysis of a class study, fixed before any data exists (and run on simulated classes for the power analysis).
//
// Primary: ANCOVA. The post-test score is regressed on the condition and the pre-test score, with the form order (A
// or B first) and the class as factors when they vary; the coefficient of the condition is the effect of adaptive over fixed practice, with its
// standard error, 95 % confidence interval and two-sided p-value. Adjusting for the pre-test removes the part of the
// post-test that was there before practice, so the comparison is sharper than one of gains (Van Breukelen 2006).
// Secondary: Welch's t-test on gains (post − pre), which assumes nothing about equal variances. Check: the two test
// forms on the pre-test, which should score alike if the forms are parallel.
//
// Only students who finished both tests count (a per-protocol analysis); how many didn't is reported beside it.
// No library: plain least squares, and Student's t from src/math/distributions.ts, so the server, the browser and the
// scripts can all use this file.
import { tSf, tUpper } from "../math/distributions.ts";

/** The two-sided p-value of a t statistic. */
export const twoSided = (t: number, df: number) => Math.min(1, 2 * tSf(Math.abs(t), df));

/** The inverse of a small square matrix (Gauss–Jordan with partial pivoting); null if it is singular. */
export function inverse(A: readonly number[][]): number[][] | null {
  const n = A.length;
  const M = A.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let pivot = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[pivot][c])) pivot = r;
    if (Math.abs(M[pivot][c]) < 1e-12) return null;
    [M[c], M[pivot]] = [M[pivot], M[c]];
    const p = M[c][c];
    for (let k = 0; k < 2 * n; k++) M[c][k] /= p;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c];
      for (let k = 0; k < 2 * n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row) => row.slice(n));
}

export type Ols = { beta: number[]; se: number[]; df: number; sigma: number; r2: number };
/** Ordinary least squares, y = Xβ + ε, with the usual standard errors. Throws if the columns are collinear. */
export function ols(X: readonly number[][], y: readonly number[]): Ols {
  const n = X.length;
  const k = X[0].length;
  const XtX = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => X.reduce((s, row) => s + row[i] * row[j], 0)));
  const inv = inverse(XtX);
  if (!inv) throw new Error("the predictors are collinear");
  const Xty = Array.from({ length: k }, (_, i) => X.reduce((s, row, r) => s + row[i] * y[r], 0));
  const beta = inv.map((row) => row.reduce((s, v, j) => s + v * Xty[j], 0));
  const residuals = X.map((row, r) => y[r] - row.reduce((s, v, j) => s + v * beta[j], 0));
  const sse = residuals.reduce((s, e) => s + e * e, 0);
  const df = n - k;
  const sigma2 = df > 0 ? sse / df : NaN;
  const ybar = y.reduce((s, v) => s + v, 0) / n;
  const sst = y.reduce((s, v) => s + (v - ybar) ** 2, 0);
  return { beta, se: inv.map((row, i) => Math.sqrt(sigma2 * row[i])), df, sigma: Math.sqrt(sigma2), r2: sst ? 1 - sse / sst : NaN };
}

const mean = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const variance = (xs: readonly number[]) => xs.reduce((s, x) => s + (x - mean(xs)) ** 2, 0) / (xs.length - 1);

/** An estimated difference with its uncertainty. */
export type Estimate = { estimate: number; se: number; df: number; t: number; p: number; ci: [number, number] };
const estimate = (est: number, se: number, df: number): Estimate => {
  const half = tUpper(0.025, df) * se;
  return { estimate: est, se, df, t: est / se, p: twoSided(est / se, df), ci: [est - half, est + half] };
};

/** Welch's t-test of mean(a) − mean(b). */
export function welch(a: readonly number[], b: readonly number[]): Estimate {
  const va = variance(a) / a.length;
  const vb = variance(b) / b.length;
  const df = (va + vb) ** 2 / (va ** 2 / (a.length - 1) + vb ** 2 / (b.length - 1));
  return estimate(mean(a) - mean(b), Math.sqrt(va + vb), df);
}

/**
 * One student's scores (shares right, 0–1); treated = 1 for the adaptive condition, 0 for fixed. class and order
 * (which form came first) enter the model as factors when they vary.
 */
export type StudyRow = { treated: 0 | 1; pre: number; post: number; class?: string; order?: string };
export type Ancova = Estimate & {
  /** The effect in standard deviations of the post-test (pooled within the groups), as a standardised effect size. */
  d: number;
  /** The post-test means each group would have at the average pre-test (and the average mix of classes and orders). */
  adjusted: { treated: number; control: number };
  n: { treated: number; control: number };
};
/** Dummy columns for a factor: one for each level but the first, none when it doesn't vary. */
function dummies(rows: readonly StudyRow[], of: (r: StudyRow) => string) {
  const levels = [...new Set(rows.map(of))].sort().slice(1);
  return (r: StudyRow): number[] => levels.map((l) => (of(r) === l ? 1 : 0));
}
/** Parameters the ANCOVA fits: intercept, condition, pre-test, and the class and order factors. */
export const ancovaParams = (rows: readonly StudyRow[]) =>
  3 + new Set(rows.map((r) => r.class ?? "")).size - 1 + new Set(rows.map((r) => r.order ?? "")).size - 1;
/** post ~ treated + pre (+ class + order): the effect of treatment on the post-test, adjusted for the pre-test. */
export function ancova(rows: readonly StudyRow[]): Ancova {
  const preMean = mean(rows.map((r) => r.pre));
  const byClass = dummies(rows, (r) => r.class ?? "");
  const byOrder = dummies(rows, (r) => r.order ?? "");
  const factors = (r: StudyRow) => [...byClass(r), ...byOrder(r)];
  const X = rows.map((r) => [1, r.treated, r.pre - preMean, ...factors(r)]);
  const fit = ols(X, rows.map((r) => r.post));
  const post = (g: 0 | 1) => rows.filter((r) => r.treated === g).map((r) => r.post);
  const [t1, t0] = [post(1), post(0)];
  const pooled = Math.sqrt(((t1.length - 1) * variance(t1) + (t0.length - 1) * variance(t0)) / (t1.length + t0.length - 2));
  // The factors at their average over everyone, so the adjusted means are for the study's own mix of classes and orders.
  const shift = rows.reduce((s, r) => s + factors(r).reduce((t, v, j) => t + v * fit.beta[3 + j], 0), 0) / rows.length;
  return {
    ...estimate(fit.beta[1], fit.se[1], fit.df),
    d: fit.beta[1] / pooled,
    adjusted: { treated: fit.beta[0] + fit.beta[1] + shift, control: fit.beta[0] + shift },
    n: { treated: t1.length, control: t0.length },
  };
}

// ---------- the tests export (GET /api/research/tests.csv) ----------

export type StudentScores = {
  student: string;
  class: string;
  condition: string;
  order: string;
  pre: { form: string; answered: number; correct: number } | null;
  post: { form: string; answered: number; correct: number } | null;
};

/** Each student's tests from the export's rows: questions answered and right, and the form, per test. */
export function scoresFromTests(rows: readonly Record<string, string>[]): StudentScores[] {
  const students = new Map<string, StudentScores>();
  for (const r of rows) {
    const s = students.get(r.student) ?? students.set(r.student, { student: r.student, class: r.class, condition: r.condition, order: r.test_order, pre: null, post: null }).get(r.student)!;
    const phase = r.phase === "pre" ? "pre" : r.phase === "post" ? "post" : null;
    if (!phase) continue;
    const t = (s[phase] ??= { form: r.form, answered: 0, correct: 0 });
    t.answered++;
    if (r.correct === "1" || r.verdict === "correct") t.correct++;
  }
  return [...students.values()];
}

/**
 * Per condition: test answers, how many arrived long after their test ended (late), and how many the student's browser
 * marked differently from the server (client_verdict). Reported beside the analysis, which keeps every answer as the
 * server marked it; exports from before these columns count none.
 */
export function answerChecks(rows: readonly Record<string, string>[]): Record<string, { answers: number; late: number; remarked: number }> {
  const out: Record<string, { answers: number; late: number; remarked: number }> = {};
  for (const r of rows) {
    const c = (out[r.condition] ??= { answers: 0, late: 0, remarked: 0 });
    c.answers++;
    if (r.late === "1") c.late++;
    if (r.client_verdict) c.remarked++;
  }
  return out;
}

export type StudyAnalysis = {
  /** Students in each condition, and how many of them finished both tests. */
  students: Record<string, { all: number; complete: number }>;
  testLength: number;
  means: Record<string, { pre: number; post: number; gain: number }>;
  ancova: Ancova | null;
  gains: Estimate | null;
  /** Pre-test score on form A minus form B: near 0 when the forms are parallel. */
  forms: Estimate | null;
};

/**
 * The pre-registered analysis of a study's test answers. A test is finished when every question on it has an answer
 * (a passed question counts as answered and wrong); the length is the most questions any student answered.
 */
export function analyseStudy(scores: readonly StudentScores[]): StudyAnalysis {
  const testLength = Math.max(0, ...scores.flatMap((s) => [s.pre?.answered ?? 0, s.post?.answered ?? 0]));
  const done = (t: StudentScores["pre"]) => !!t && t.answered === testLength;
  const complete = scores.filter((s) => done(s.pre) && done(s.post));
  const conditions = [...new Set(scores.map((s) => s.condition))].sort();
  const share = (t: NonNullable<StudentScores["pre"]>) => t.correct / testLength;
  const rows: StudyRow[] = complete.map((s) => ({ treated: s.condition === "adaptive" ? 1 : 0, pre: share(s.pre!), post: share(s.post!), class: s.class, order: s.order }));
  const means = Object.fromEntries(conditions.map((c) => {
    const of = complete.filter((s) => s.condition === c);
    const pre = mean(of.map((s) => share(s.pre!)));
    const post = mean(of.map((s) => share(s.post!)));
    return [c, { pre, post, gain: post - pre }];
  }));
  const enough = (g: 0 | 1) => rows.filter((r) => r.treated === g).length >= 2;
  const canCompare = enough(0) && enough(1) && rows.length > ancovaParams(rows) + 1;
  const gainsOf = (g: 0 | 1) => rows.filter((r) => r.treated === g).map((r) => r.post - r.pre);
  const finishedPre = scores.filter((s) => done(s.pre));
  const preOn = (form: string) => finishedPre.filter((s) => s.pre!.form === form).map((s) => share(s.pre!));
  const [onA, onB] = [preOn("A"), preOn("B")];
  return {
    students: Object.fromEntries(conditions.map((c) => [c, { all: scores.filter((s) => s.condition === c).length, complete: complete.filter((s) => s.condition === c).length }])),
    testLength,
    means,
    ancova: canCompare ? ancova(rows) : null,
    gains: canCompare ? welch(gainsOf(1), gainsOf(0)) : null,
    forms: onA.length >= 2 && onB.length >= 2 ? welch(onA, onB) : null,
  };
}
