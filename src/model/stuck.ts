// Stuck practice on real answers, a look after the thesis at where ASSISTments students' answers go (23 October 2026).
// A visit is one student's answers on one skill within one assignment; the skill builders end a visit at three right
// in a row, so the streak rule is the data's own stopping point. Three questions are asked of the visits. How many
// answers could any stopping rule have saved: the final run of right answers is all an oracle that saw the future
// could skip. Where the rest go: a visit is stuck, in Beck and Gong's (2013) sense of wheel-spinning, when it runs to
// ten answers or more with no three in a row in the first ten. And what helps a stuck student: the next answer after
// a wrong one, with and without hints, against how often other students get the same problem right.
import { assistmentsTopic, type Attempt } from "./datasets.ts";

/** Right answers in a row that end a skill-builder visit. */
export const STREAK = 3;
/** A visit with no streak in its first this many answers, and at least this many, is stuck. */
export const STUCK_WITHIN = 10;
/** A problem's usual share right is only used when this many other answers to it are known. */
export const USUAL_MIN = 10;
/** An answer given faster than this (ms) is too fast to have been worked out. */
export const FAST_MS = 5000;

export type Visit = readonly Attempt[];

/** The attempts as visits, each in the order answered, the visits in the order of their first answer. */
export function visitsOf(attempts: readonly Attempt[]): Attempt[][] {
  const by = new Map<string, Attempt[]>();
  for (const a of attempts) {
    const key = `${a.student}\u0000${a.skill}\u0000${a.assignment}`;
    (by.get(key) ?? by.set(key, []).get(key)!).push(a);
  }
  return [...by.values()];
}

/** After how many answers the visit first has n right in a row, or null if it never does. */
export function firstStreak(visit: Visit, n = STREAK): number | null {
  let run = 0;
  for (let i = 0; i < visit.length; i++) if ((run = visit[i].correct ? run + 1 : 0) >= n) return i + 1;
  return null;
}
export const isStuck = (visit: Visit, within = STUCK_WITHIN) => visit.length >= within && (firstStreak(visit) ?? Infinity) > within;

/**
 * Each answer's problem's usual share right: the share of the other answers to that problem that were right, the
 * answer itself left out so that it does not predict itself; NaN for a problem with fewer than min other answers.
 */
export function usualShare(attempts: readonly Attempt[], min = USUAL_MIN): (a: Attempt) => number {
  const counts = new Map<string, [number, number]>();
  for (const a of attempts) {
    const c = counts.get(a.problem) ?? counts.set(a.problem, [0, 0]).get(a.problem)!;
    c[0] += a.correct ? 1 : 0;
    c[1]++;
  }
  return (a) => {
    const [right, n] = counts.get(a.problem) ?? [0, 0];
    return n - 1 >= min ? (right - (a.correct ? 1 : 0)) / (n - 1) : NaN;
  };
}

/** The final run of right answers, the answers after the last wrong one. */
const finalRun = (visit: Visit) => {
  let run = 0;
  for (let i = visit.length - 1; i >= 0 && visit[i].correct; i--) run++;
  return run;
};

export type AnswerPart = { part: string; answers: number; share: number };
/**
 * Every answer in one of three parts: in visits that reached a streak, the final run of right answers (what an oracle
 * could have skipped) and the answers before it; and the visits that never reached one.
 */
export function answerParts(visits: readonly Visit[]): AnswerPart[] {
  let run = 0, before = 0, never = 0;
  for (const v of visits) {
    if (firstStreak(v) === null) never += v.length;
    else (run += finalRun(v)), (before += v.length - finalRun(v));
  }
  const total = run + before + never;
  return [
    ["final run of right answers", run],
    ["before the final run", before],
    ["visits with no three in a row", never],
  ].map(([part, answers]) => ({ part: part as string, answers: answers as number, share: (answers as number) / total }));
}

export type CurvePoint = { group: string; answer: number; visits: number; answers: number; right: number; usual: number };
/**
 * The share right at each of the first `length` answers of a fixed set of visits, against the same problems' usual
 * share right; only answers whose problem has a usual share count. Every visit in a group has at least `length`
 * answers, so no visit leaves the group as it goes on.
 */
export function curve(group: string, visits: readonly Visit[], usual: (a: Attempt) => number, length: number): CurvePoint[] {
  const set = visits.filter((v) => v.length >= length);
  return Array.from({ length }, (_, i) => {
    let answers = 0, right = 0, sum = 0;
    for (const v of set) {
      const u = usual(v[i]);
      if (Number.isNaN(u)) continue;
      answers++;
      right += v[i].correct ? 1 : 0;
      sum += u;
    }
    return { group, answer: i + 1, visits: set.length, answers, right: answers ? right / answers : NaN, usual: answers ? sum / answers : NaN };
  });
}
/** The curves the dashboard draws: all long visits, the stuck ones, and the long ones that were not stuck. */
export const curves = (visits: readonly Visit[], usual: (a: Attempt) => number): CurvePoint[] => [
  ...curve("visits of 10 or more answers", visits, usual, STUCK_WITHIN),
  ...curve("visits of 20 or more answers", visits, usual, 2 * STUCK_WITHIN),
  ...curve("stuck visits", visits.filter((v) => isStuck(v)), usual, STUCK_WITHIN),
  ...curve("stuck visits of 20 or more", visits.filter((v) => isStuck(v)), usual, 2 * STUCK_WITHIN),
  ...curve("not stuck, 10 or more", visits.filter((v) => !isStuck(v)), usual, STUCK_WITHIN),
];

export type Warning = { firstRight: number; visits: number; reached: number; stuck: number; ended: number };
/**
 * What becomes of a visit with no streak in its first k answers, by how many of them were right: a streak by the
 * STUCK_WITHIN-th answer, stuck, or ended before then without one.
 */
export function earlyWarning(visits: readonly Visit[], k = STREAK): Warning[] {
  const rows = Array.from({ length: k }, (_, firstRight) => ({ firstRight, visits: 0, reached: 0, stuck: 0, ended: 0 }));
  for (const v of visits) {
    if (v.length < k || firstStreak(v.slice(0, k)) !== null) continue;
    const r = rows[v.slice(0, k).filter((a) => a.correct).length];
    const at = firstStreak(v);
    r.visits++;
    if (at !== null && at <= STUCK_WITHIN) r.reached++;
    else if (isStuck(v)) r.stuck++;
    else r.ended++;
  }
  return rows.map((r) => ({ ...r, reached: r.reached / r.visits, stuck: r.stuck / r.visits, ended: r.ended / r.visits }));
}

/** What the answer before was: right, or wrong in one of four ways. */
export function before(a: Attempt) {
  if (a.correct) return "right";
  if (a.firstAction === "1") return "hint first";
  if (a.firstAction === "2") return "scaffolding first";
  return a.hints > 0 ? "wrong try then hints" : "wrong try, no hint";
}
export type NextAnswer = { visits: string; after: string; answers: number; right: number; usual: number };
/** The next answer in the same visit, by what the answer before was, in stuck visits and in the rest. */
export function nextAnswers(visits: readonly Visit[], usual: (a: Attempt) => number): NextAnswer[] {
  const rows = new Map<string, NextAnswer>();
  for (const v of visits) {
    const group = isStuck(v) ? "stuck" : "not stuck";
    for (let i = 1; i < v.length; i++) {
      const u = usual(v[i]);
      if (Number.isNaN(u)) continue;
      const key = `${group}\u0000${before(v[i - 1])}`;
      const r = rows.get(key) ?? rows.set(key, { visits: group, after: before(v[i - 1]), answers: 0, right: 0, usual: 0 }).get(key)!;
      r.answers++;
      r.right += v[i].correct ? 1 : 0;
      r.usual += u;
    }
  }
  return [...rows.values()].map((r) => ({ ...r, right: r.right / r.answers, usual: r.usual / r.answers }));
}

export type SkillRow = { skill: string; topic: string; visits: number; stuck: number; answers: number; stuckAnswers: number; shareStuck: number; shareOfStuckAnswers: number };
/** Each skill's visits and stuck visits, most stuck answers first. */
export function stuckSkills(visits: readonly Visit[]): SkillRow[] {
  const by = new Map<string, SkillRow>();
  let all = 0;
  for (const v of visits) {
    const skill = v[0].skill;
    const r = by.get(skill) ?? by.set(skill, { skill, topic: assistmentsTopic(skill), visits: 0, stuck: 0, answers: 0, stuckAnswers: 0, shareStuck: 0, shareOfStuckAnswers: 0 }).get(skill)!;
    r.visits++;
    r.answers += v.length;
    if (isStuck(v)) (r.stuck++, (r.stuckAnswers += v.length), (all += v.length));
  }
  return [...by.values()]
    .map((r) => ({ ...r, shareStuck: r.stuck / r.visits, shareOfStuckAnswers: all ? r.stuckAnswers / all : 0 }))
    .sort((a, b) => b.stuckAnswers - a.stuckAnswers || b.visits - a.visits);
}

export type Fact = { key: string; label: string; value: number; usual: number; n: number };
const share = (as: readonly Attempt[], test: (a: Attempt) => boolean) => as.filter(test).length / as.length;
/** The single figures: shares of answers, visits or students, and against the problems' usual share where one applies. */
export function facts(visits: readonly Visit[], usual: (a: Attempt) => number): Fact[] {
  const answers = visits.flat();
  const stuck = visits.filter((v) => isStuck(v));
  const stuckAnswers = stuck.flat();
  const rest = visits.filter((v) => !isStuck(v)).flat();
  const parts = answerParts(visits);
  const oneRightFirst = visits.reduce((s, v) => s + (firstStreak(v) === null ? 0 : Math.max(0, finalRun(v) - 1)), 0);
  const afterStreak = visits.flatMap((v) => {
    const at = firstStreak(v);
    return at === null ? [] : v.slice(at);
  });
  // A streak carried over: the first answer of each later visit to a skill, by whether an earlier visit had a streak.
  const later = { yes: [] as Attempt[], no: [] as Attempt[] };
  const practices = new Map<string, Visit[]>();
  for (const v of visits) {
    const key = `${v[0].student}\u0000${v[0].skill}`;
    (practices.get(key) ?? practices.set(key, []).get(key)!).push(v);
  }
  for (const vs of practices.values()) {
    let streak = false;
    vs.forEach((v, j) => {
      if (j > 0) (streak ? later.yes : later.no).push(v[0]);
      streak ||= firstStreak(v) !== null;
    });
  }
  const stuckStudents = new Set(stuck.map((v) => v[0].student));
  const students = new Set(answers.map((a) => a.student));
  const elsewhere = (wasStuck: boolean) => visits.filter((v) => stuckStudents.has(v[0].student) === wasStuck && !isStuck(v)).flat();
  const right = (as: readonly Attempt[]) => share(as, (a) => a.correct);
  const row = (key: string, label: string, value: number, n: number, u = NaN): Fact => ({ key, label, value, usual: u, n });
  // Against the problems' usual share: both over the answers whose problem has one.
  const against = (key: string, label: string, as: readonly Attempt[]): Fact => {
    const known = as.filter((a) => !Number.isNaN(usual(a)));
    return row(key, label, right(known), known.length, known.reduce((s, a) => s + usual(a), 0) / known.length);
  };
  const fast = (a: Attempt) => a.firstAction !== "1" && a.ms >= 0 && a.ms < FAST_MS;
  return [
    row("oracle", "Answers an oracle could skip: each visit's final run of right answers", parts[0].share, answers.length),
    row("oracle_one_right", "The same, if the oracle must see one right answer first", oneRightFirst / answers.length, answers.length),
    row("after_streak", "Answers after a visit's first three in a row", afterStreak.length / answers.length, answers.length),
    against("after_streak_right", "Of those, right", afterStreak),
    against("carry_yes", "First answer of a later visit, an earlier visit had three in a row", later.yes),
    against("carry_no", "First answer of a later visit, no earlier three in a row", later.no),
    row("stuck_visits", "Visits stuck: 10 or more answers, no three in a row in the first 10", stuck.length / visits.length, visits.length),
    row("stuck_answers", "Answers in stuck visits", stuckAnswers.length / answers.length, answers.length),
    against("stuck_right", "Answers in stuck visits, right", stuckAnswers),
    row("students_stuck", "Students stuck at least once", stuckStudents.size / students.size, students.size),
    row("elsewhere_stuck", "Right on their other visits, students stuck somewhere", right(elsewhere(true)), elsewhere(true).length),
    row("elsewhere_never", "Right on their visits, students never stuck", right(elsewhere(false)), elsewhere(false).length),
    row("hint_first_stuck", "Answers begun with a hint, stuck visits", share(stuckAnswers, (a) => a.firstAction === "1"), stuckAnswers.length),
    row("hint_first_rest", "Answers begun with a hint, other visits", share(rest, (a) => a.firstAction === "1"), rest.length),
    row("fast_stuck", "Tries under 5 seconds, stuck visits", share(stuckAnswers, fast), stuckAnswers.length),
    row("fast_rest", "Tries under 5 seconds, other visits", share(rest, fast), rest.length),
  ];
}
