// What the teacher's dashboard shows for a class: each student's mastery of each skill (from the learner model), the
// two arms side by side (with the feature the class tests and without it, src/model/arms.ts), the three tests, and how
// well the model's logged predictions matched what students then did; and at the top, who is stuck on what and why
// (src/model/stuckList.ts). A skill a student has mastered is told apart from one they have kept, right on a review
// days later (issue #264, holdOf in spacing.ts): keeping is the result, mastering is progress.
//
// The arms are compared by intention to treat (issue #268): every student counts in the arm they were given, and a
// question not answered counts as wrong, so a student who never sat a test scores 0 on it. Counting only those who
// finished credits an arm for the students it lost (the ASSISTments outcome of 23 October 2026); how many finished is
// shown beside the scores as an outcome of its own.
import type { DatabaseSync } from "node:sqlite";
import type { SkillId } from "../src/math/practiceSkills.ts";
import { CURRICULUM } from "../src/model/curriculum.ts";
import type { Level } from "../src/model/elo.ts";
import { auc, calibration, evidence, logLoss, type Prediction } from "../src/model/evaluate.ts";
import { hasIdeas, knownOf, SKILL_IDEAS } from "../src/model/ideaState.ts";
import { TARGET } from "../src/model/policy.ts";
import { holdOf, holds, type Hold } from "../src/model/spacing.ts";
import type { Arm, Feature } from "../src/model/arms.ts";
import { TEST_PHASES, type TestPhase } from "../src/model/testForms.ts";
import { becauseOf, groupByReason, isStuckNow, sinceLastStreak, type Because, type Example } from "../src/model/stuckList.ts";
import type { MistakeId } from "../src/math/mistakes.ts";
import { stmt } from "./db.ts";
import { mistakeOf } from "./marking.ts";
import { classProtocol, phaseWindows, TEST_PHASE_OF, testScores } from "./protocol.ts";
import { currentIdeas, currentModel, currentSpacing } from "./research.ts";

type AttemptRow = {
  id: number; seed: number; answers: string; hard: string | null; faded: number | null;
  student_id: number; arm: Arm; condition: string; policy: string; predicted: number | null; skill: SkillId; level: Level;
  outcome: string; first_correct: number; counted: number; solution_viewed: number; ms_total: number; created_at: number;
};
const share = (xs: readonly boolean[]) => (xs.length ? xs.filter(Boolean).length / xs.length : null);
const mean = (xs: readonly number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
const sd = (xs: readonly number[]) => {
  if (xs.length < 2) return null;
  const m = mean(xs)!;
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
};
const describe = (xs: readonly number[]) => ({ n: xs.length, mean: mean(xs), sd: sd(xs) });
/** Cohen's d of a over b with the pooled SD: a first look; the planned analysis is `npm run analyse`. */
function cohen(a: readonly number[], b: readonly number[]) {
  const [x, y] = [describe(a), describe(b)];
  if (x.n < 2 || y.n < 2) return null;
  const pooled = Math.sqrt(((x.n - 1) * x.sd! ** 2 + (y.n - 1) * y.sd! ** 2) / (x.n + y.n - 2));
  return pooled ? (x.mean! - y.mean!) / pooled : null;
}
function median(xs: readonly number[]) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
/** Right first time, wrong, or nothing to say, by the rule the model learns by. */
const verdict = (a: AttemptRow) => evidence(a.counted, a.outcome, a.first_correct === 1, a.faded !== null);

export function dashboard(db: DatabaseSync, classCode: string) {
  const klass = stmt(db, "SELECT code, name, skills, feature, created_at AS createdAt FROM classes WHERE code = ?").get(classCode) as
    { code: string; name: string; skills: string | null; feature: Feature; createdAt: number } | undefined;
  if (!klass) return null;
  const skills: SkillId[] = klass.skills ? JSON.parse(klass.skills) : [...CURRICULUM];
  const students = stmt(db, "SELECT id, code, arm, condition FROM students WHERE class_code = ? ORDER BY id").all(classCode) as
    { id: number; code: string; arm: Arm; condition: string }[];
  const attempts = stmt(db, `
    SELECT a.id, a.seed, a.answers, a.hard, a.faded, a.student_id, s.arm, s.condition, a.policy, a.predicted, a.skill, a.level, a.outcome, a.first_correct,
      json_array_length(a.answers) - a.retries AS counted, a.solution_viewed, a.ms_total, a.created_at
    FROM attempts a JOIN students s ON s.id = a.student_id WHERE s.class_code = ? ORDER BY a.id
  `).all(classCode) as AttemptRow[];

  const model = currentModel(db);
  const protocol = classProtocol(db, classCode);
  // A test is finished once every question on it has an answer (passing over a question is an answer); its score is
  // the share of all its questions answered right.
  type Score = { form: string; answered: number; score: number };
  const scores = new Map<number, Partial<Record<TestPhase, Score>>>();
  for (const t of testScores(db, classCode)) {
    const entry = scores.get(t.studentId) ?? {};
    entry[t.phase] = { form: t.form, answered: t.answered, score: t.correct / protocol.testLength };
    scores.set(t.studentId, entry);
  }
  const complete = (t?: { answered: number }) => !!t && t.answered >= protocol.testLength;
  const byStudent = new Map<number, AttemptRow[]>();
  for (const a of attempts) {
    const mine = byStudent.get(a.student_id);
    if (mine) mine.push(a);
    else byStudent.set(a.student_id, [a]);
  }
  const rows = students.map((s) => {
    const mine = byStudent.get(s.id) ?? [];
    const spacing = currentSpacing(db, s.id);
    const verdicts = mine.map(verdict).filter((v) => v !== null);
    const test = scores.get(s.id) ?? {};
    return {
      id: `s${s.id}`,
      code: s.code,
      arm: s.arm,
      condition: s.condition,
      answered: mine.length,
      /** Minutes spent on questions class practice chose, its step-downs too (what timed sessions keep equal). */
      practiceMinutes: mine.filter((a) => a.policy === s.condition || a.policy === "stepdown").reduce((sum, a) => sum + a.ms_total, 0) / 60_000,
      pre: test.pre ? { ...test.pre, complete: complete(test.pre) } : null,
      post: test.post ? { ...test.post, complete: complete(test.post) } : null,
      delayed: test.delayed ? { ...test.delayed, complete: complete(test.delayed) } : null,
      rightFirst: share(verdicts),
      lastAt: mine.at(-1)?.created_at ?? null,
      // The chance of a right first answer at each level, and how many answers on the skill it rests on.
      mastery: Object.fromEntries(skills.map((k) => {
        const m = model.mastery(`s${s.id}`, k);
        return [k, { p: [m.p[1], m.p[2], m.p[3]], n: m.n }];
      })),
      /** Each of the class's skills the student has mastered: kept once right on a review days later, again after a wrong one. */
      holds: Object.fromEntries(skills.flatMap((k) => {
        const h = holdOf(spacing[k]);
        return h ? [[k, h]] : [];
      })) as Partial<Record<SkillId, Hold>>,
      /** How many of the class's skills the student has kept, mastered (not yet reviewed), and is practising again. */
      held: Object.fromEntries(Object.entries(holds(spacing, skills)).map(([h, ks]) => [h, ks.length])) as Record<Hold, number>,
    };
  });

  /** Each student's score on a test, by intention to treat: a test not sat scores 0, and questions left unanswered count as wrong. */
  const itt = (people: typeof rows, phase: TestPhase) => people.map((r) => r[phase]?.score ?? 0);
  const group = (arm: Arm) => {
    const mine = attempts.filter((a) => a.arm === arm);
    const chosen = mine.filter((a) => a.policy === a.condition);
    const people = rows.filter((r) => r.arm === arm);
    return {
      students: people.length,
      answered: mine.length,
      classPractice: chosen.length,
      /** Questions of a step-down to one idea after an early failure (stepDown.ts): only a class testing it has any. */
      stepDown: mine.filter((a) => a.policy === "stepdown").length,
      rightFirst: share(mine.map(verdict).filter((v) => v !== null)),
      /** What the model expected of the questions class practice chose, and how far that was from the target. */
      predicted: mean(chosen.flatMap((a) => (a.predicted === null ? [] : [a.predicted]))),
      offTarget: mean(chosen.flatMap((a) => (a.predicted === null ? [] : [Math.abs(a.predicted - TARGET)]))),
      medianSeconds: median(mine.map((a) => a.ms_total / 1000)),
      solutionViewed: share(mine.map((a) => a.solution_viewed === 1)),
      skipped: share(mine.map((a) => a.outcome === "skipped")),
      practiceMinutes: mean(people.map((r) => r.practiceMinutes)),
      /** Skills per student kept (right on a review days later: the result) and mastered but not yet reviewed (progress). */
      kept: mean(people.map((r) => r.held.kept)),
      mastered: mean(people.map((r) => r.held.mastered)),
      // Each test by intention to treat, over every student of the arm, and how many of them finished it.
      ...(Object.fromEntries(TEST_PHASES.map((p) => [p, { ...describe(itt(people, p)), finished: people.filter((r) => r[p]?.complete).length }])) as
        Record<TestPhase, ReturnType<typeof describe> & { finished: number }>),
    };
  };
  const arms = { on: group("on"), off: group("off") };
  const armRows = (arm: Arm) => rows.filter((r) => r.arm === arm);
  // When each test began (null: not yet), so the page shows only the tests the class has reached, and how long after
  // the post-test the delayed one came.
  const windows = phaseWindows(db, classCode);
  const started = Object.fromEntries(TEST_PHASES.map((p) => [p, windows.find((w) => w.phase === TEST_PHASE_OF[p])?.start ?? null])) as Record<TestPhase, number | null>;
  // The forms should be equally hard: compare them on the pre-test, before any practice could make a difference.
  const preByForm = (form: string) => describe(rows.filter((r) => r.pre?.complete && r.pre.form === form).map((r) => r.pre!.score));

  // The predictions logged when each question appeared, against what the student then did: no hindsight involved.
  const predictions: Prediction[] = attempts.flatMap((a) => {
    const v = verdict(a);
    return a.predicted === null || v === null ? [] : [{ p: a.predicted, correct: v }];
  });

  return {
    stuck: stuckList(db, classCode, students, attempts),
    class: { code: klass.code, name: klass.name, skills, feature: klass.feature, createdAt: klass.createdAt, ...protocol },
    students: rows,
    arms,
    tests: {
      started,
      // Cohen's d of each test, by intention to treat, the arm with the feature over the arm without.
      effect: Object.fromEntries(TEST_PHASES.map((p) => [p, cohen(itt(armRows("on"), p), itt(armRows("off"), p))])) as Record<TestPhase, number | null>,
      forms: { A: preByForm("A"), B: preByForm("B") },
    },
    calibration: {
      n: predictions.length,
      logLoss: predictions.length ? logLoss(predictions) : null,
      auc: predictions.length ? auc(predictions) : null,
      bins: calibration(predictions),
    },
  };
}
export type Dashboard = NonNullable<ReturnType<typeof dashboard>>;

export type StuckRow = {
  student: string; code: string; skill: SkillId;
  /** Questions answered since the student last had three right in a row on the skill (or was marked seen). */
  answers: number;
  /** The last of them: marking the row seen takes it off the list until ten more questions after this one. */
  through: number;
  because: Because | null;
};

/**
 * The stuck students of a class, one row per student and skill, grouped by why: the mistake they repeat, the idea they
 * ticked as hard, or their weakest idea (stuckList.ts). Only stuck rows are read for mistakes, so the checker rebuilds
 * a few questions, not the class's every answer.
 */
function stuckList(db: DatabaseSync, classCode: string, students: readonly { id: number; code: string }[], attempts: readonly AttemptRow[]) {
  const seen = new Map((stmt(db, `
    SELECT x.student_id || ' ' || x.skill AS k, x.through FROM stuck_seen x JOIN students s ON s.id = x.student_id WHERE s.class_code = ?
  `).all(classCode) as { k: string; through: number }[]).map((r) => [r.k, r.through]));
  type Tried = Omit<AttemptRow, "hard"> & { correct: boolean; hard?: string[] };
  const bySkill = new Map<string, Tried[]>();
  for (const a of attempts) {
    const correct = verdict(a);
    if (correct === null) continue;
    const k = `${a.student_id} ${a.skill}`;
    const t = { ...a, correct, hard: a.hard ? (JSON.parse(a.hard) as string[]) : undefined };
    (bySkill.get(k) ?? bySkill.set(k, []).get(k)!).push(t);
  }
  const codes = new Map(students.map((s) => [s.id, s.code]));
  const rows: StuckRow[] = [];
  for (const [k, tries] of bySkill) {
    const since = sinceLastStreak(tries, seen.get(k));
    if (!isStuckNow(since)) continue;
    const { student_id: id, skill } = tries[0];
    const mistakes = (t: Tried) => (JSON.parse(t.answers) as { input: string; verdict: string }[]).flatMap((x) => {
      if (x.verdict !== "wrong") return [];
      const mistake = mistakeOf({ skill: t.skill, level: t.level, seed: t.seed }, x.input);
      return mistake ? [{ mistake, example: { skill: t.skill, level: t.level, seed: t.seed, input: x.input } as Example }] : [];
    }) satisfies { mistake: MistakeId; example: Example }[];
    let weakest: { idea: string; known: number } | undefined;
    if (hasIdeas(skill)) {
      const ideas = currentIdeas(db, id);
      for (const idea of SKILL_IDEAS[skill]) if (!weakest || knownOf(ideas, idea) < weakest.known) weakest = { idea, known: knownOf(ideas, idea) };
    }
    rows.push({ student: `s${id}`, code: codes.get(id)!, skill, answers: since.length, through: since.at(-1)!.id, because: becauseOf(since, mistakes, weakest) });
  }
  return groupByReason(rows);
}

/**
 * The teacher has seen a stuck student: the row leaves the list, and comes back only after ten more questions on the
 * skill with no three right in a row. `through` is the last attempt the teacher saw; a later mark never moves it back.
 */
export function markSeen(db: DatabaseSync, classCode: string, student: unknown, skill: unknown, through: unknown): boolean {
  const id = typeof student === "string" && /^s\d+$/.test(student) ? Number(student.slice(1)) : NaN;
  const ok = Number.isInteger(through) && stmt(db, `
    SELECT 1 FROM attempts a JOIN students s ON s.id = a.student_id WHERE a.id = ? AND a.student_id = ? AND a.skill = ? AND s.class_code = ?
  `).get(through as number, id, String(skill), classCode);
  if (!ok) return false;
  stmt(db, `
    INSERT INTO stuck_seen (student_id, skill, through, created_at) VALUES (?, ?, ?, ?)
    ON CONFLICT (student_id, skill) DO UPDATE SET through = MAX(through, excluded.through), created_at = excluded.created_at
  `).run(id, String(skill), through as number, Date.now());
  return true;
}
