// How a question felt to the student against the model's prediction (issue #292): exploratory, not part of the
// pre-registered analysis. Each attempt the student rated (too easy, about right, too hard; `rated` in attempts.csv)
// and the model gave a chance of a right first answer (`predicted`) is one pair. If the model knows what is hard for
// this student, questions it gave a high chance should feel easier, so the rank correlation between the two should be
// positive.
//
// The student rates the question after answering it, so a rating partly echoes how the answer went: a wrong answer
// feels hard whatever the model said. The correlation is therefore also given within answers right first time and
// within those that were not, where that echo cannot drive it. A student's answers are not independent of each other,
// so the 95 % intervals come from resampling students, not answers.
import { RATINGS, type Rating } from "./difficulty.ts";
import { rng } from "./random.ts";

/** One rated attempt with a prediction. */
export type RatedAnswer = { student: string; rated: Rating; predicted: number; firstCorrect: boolean };

/** The rated attempts with a prediction, from the attempts export; the rest (not rated, no model) are left out. */
export function ratedAnswers(rows: readonly Record<string, string>[]): RatedAnswer[] {
  return rows.flatMap((r) => {
    const p = r.predicted === "" || r.predicted === undefined ? NaN : Number(r.predicted);
    if (!RATINGS.includes(r.rated as Rating) || !(p >= 0 && p <= 1)) return [];
    return [{ student: r.student, rated: r.rated as Rating, predicted: p, firstCorrect: r.first_correct === "1" }];
  });
}

/** How easy it felt, as a number to rank: too easy 1, about right 0, too hard −1. */
export const EASE: Record<Rating, number> = { easy: 1, right: 0, hard: -1 };

/** Ranks from 1, ties sharing the mean of the ranks they span. */
export function ranks(xs: readonly number[]): number[] {
  const order = xs.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0]);
  const out = new Array<number>(xs.length);
  for (let i = 0; i < order.length; ) {
    let j = i;
    while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j++;
    for (let k = i; k <= j; k++) out[order[k][1]] = (i + j) / 2 + 1;
    i = j + 1;
  }
  return out;
}

/** Spearman's rank correlation (Pearson's on the ranks), or null when either side does not vary or there are under 3. */
export function spearman(xs: readonly number[], ys: readonly number[]): number | null {
  if (xs.length < 3) return null;
  const [rx, ry] = [ranks(xs), ranks(ys)];
  const mx = rx.reduce((a, b) => a + b, 0) / rx.length;
  const my = ry.reduce((a, b) => a + b, 0) / ry.length;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < rx.length; i++) {
    sxy += (rx[i] - mx) * (ry[i] - my);
    sxx += (rx[i] - mx) ** 2;
    syy += (ry[i] - my) ** 2;
  }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
}

/** A correlation, the answers it rests on, and its 95 % interval from resampling students (null with fewer than 2). */
export type Correlation = { rho: number; answers: number; students: number; ci: [number, number] | null };

const rhoOf = (as: readonly RatedAnswer[]) => spearman(as.map((a) => a.predicted), as.map((a) => EASE[a.rated]));

/** Spearman's ρ between the prediction and how easy it felt, with a percentile interval over students resampled. */
export function correlation(as: readonly RatedAnswer[], resamples = 2000, seed = 1): Correlation | null {
  const rho = rhoOf(as);
  if (rho === null) return null;
  const byStudent = new Map<string, RatedAnswer[]>();
  for (const a of as) byStudent.set(a.student, [...(byStudent.get(a.student) ?? []), a]);
  const students = [...byStudent.values()];
  let ci: [number, number] | null = null;
  if (students.length >= 2) {
    const r = rng(seed);
    const draws: number[] = [];
    for (let b = 0; b < resamples; b++) {
      const d = rhoOf(students.flatMap(() => r.pick(students)));
      if (d !== null) draws.push(d);
    }
    draws.sort((a, b) => a - b);
    const at = (q: number) => draws[Math.min(draws.length - 1, Math.floor(q * draws.length))];
    if (draws.length) ci = [at(0.025), at(0.975)];
  }
  return { rho, answers: as.length, students: students.length, ci };
}

/** The answers given one rating: how many, the model's mean chance of a right first answer, and the share right first time. */
export type RatingGroup = { answers: number; predicted: number; firstCorrect: number };

export type RatingCheck = {
  /** Rated answers with a prediction, and the students who gave them. */
  answers: number;
  students: number;
  byRating: Record<Rating, RatingGroup | null>;
  /** The prediction against how easy it felt: over all rated answers, and within answers right first time and not. */
  all: Correlation | null;
  right: Correlation | null;
  wrong: Correlation | null;
};

export function ratingCheck(as: readonly RatedAnswer[], resamples = 2000): RatingCheck {
  const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const group = (r: Rating): RatingGroup | null => {
    const of = as.filter((a) => a.rated === r);
    return of.length ? { answers: of.length, predicted: mean(of.map((a) => a.predicted)), firstCorrect: mean(of.map((a) => (a.firstCorrect ? 1 : 0))) } : null;
  };
  return {
    answers: as.length,
    students: new Set(as.map((a) => a.student)).size,
    byRating: { easy: group("easy"), right: group("right"), hard: group("hard") },
    all: correlation(as, resamples),
    right: correlation(as.filter((a) => a.firstCorrect), resamples),
    wrong: correlation(as.filter((a) => !a.firstCorrect), resamples),
  };
}
