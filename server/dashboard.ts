// What the teacher's dashboard shows for a class: each student's mastery of each skill (from the learner model), the
// two conditions side by side, the pre- and post-test, and how well the model's logged predictions matched what
// students then did.
import type { DatabaseSync } from "node:sqlite";
import type { SkillId } from "../src/math/practiceSkills.ts";
import { CURRICULUM } from "../src/model/curriculum.ts";
import type { Level } from "../src/model/elo.ts";
import { auc, calibration, evidence, logLoss, type Prediction } from "../src/model/evaluate.ts";
import { TARGET } from "../src/model/policy.ts";
import { classProtocol, testScores } from "./protocol.ts";
import { currentModel } from "./research.ts";

type AttemptRow = {
  student_id: number; condition: string; policy: string; predicted: number | null; skill: SkillId; level: Level;
  outcome: string; first_correct: number; wrongs: number; solution_viewed: number; ms_total: number; created_at: number;
};
const share = (xs: readonly boolean[]) => (xs.length ? xs.filter(Boolean).length / xs.length : null);
const mean = (xs: readonly number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
const sd = (xs: readonly number[]) => {
  if (xs.length < 2) return null;
  const m = mean(xs)!;
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
};
const describe = (xs: readonly number[]) => ({ n: xs.length, mean: mean(xs), sd: sd(xs) });
function median(xs: readonly number[]) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
/** Right first time, wrong, or nothing to say, by the rule the model learns by. */
const verdict = (a: AttemptRow) => evidence(a.wrongs + (a.outcome === "solved" ? 1 : 0), a.outcome, a.first_correct === 1);

export function dashboard(db: DatabaseSync, classCode: string) {
  const klass = db.prepare("SELECT code, name, skills, created_at AS createdAt FROM classes WHERE code = ?").get(classCode) as
    { code: string; name: string; skills: string | null; createdAt: number } | undefined;
  if (!klass) return null;
  const skills: SkillId[] = klass.skills ? JSON.parse(klass.skills) : [...CURRICULUM];
  const students = db.prepare("SELECT id, code, condition FROM students WHERE class_code = ? ORDER BY id").all(classCode) as
    { id: number; code: string; condition: string }[];
  const attempts = db.prepare(`
    SELECT a.student_id, s.condition, a.policy, a.predicted, a.skill, a.level, a.outcome, a.first_correct, a.wrongs,
      a.solution_viewed, a.ms_total, a.created_at
    FROM attempts a JOIN students s ON s.id = a.student_id WHERE s.class_code = ? ORDER BY a.id
  `).all(classCode) as AttemptRow[];

  const model = currentModel(db);
  const protocol = classProtocol(db, classCode);
  // A test counts once every question on it has an answer (passing over a question is an answer).
  const scores = new Map<number, { pre?: { form: string; answered: number; score: number }; post?: { form: string; answered: number; score: number } }>();
  for (const t of testScores(db, classCode)) {
    const entry = scores.get(t.studentId) ?? {};
    entry[t.phase] = { form: t.form, answered: t.answered, score: t.correct / protocol.testLength };
    scores.set(t.studentId, entry);
  }
  const complete = (t?: { answered: number }) => !!t && t.answered >= protocol.testLength;
  const byStudent = new Map<number, AttemptRow[]>();
  for (const a of attempts) byStudent.set(a.student_id, [...(byStudent.get(a.student_id) ?? []), a]);
  const rows = students.map((s) => {
    const mine = byStudent.get(s.id) ?? [];
    const verdicts = mine.map(verdict).filter((v) => v !== null);
    const test = scores.get(s.id) ?? {};
    return {
      id: `s${s.id}`,
      code: s.code,
      condition: s.condition,
      answered: mine.length,
      /** Minutes spent on questions class practice chose (what timed sessions keep equal). */
      practiceMinutes: mine.filter((a) => a.policy === s.condition).reduce((sum, a) => sum + a.ms_total, 0) / 60_000,
      pre: test.pre ? { ...test.pre, complete: complete(test.pre) } : null,
      post: test.post ? { ...test.post, complete: complete(test.post) } : null,
      rightFirst: share(verdicts),
      lastAt: mine.at(-1)?.created_at ?? null,
      // The chance of a right first answer at each level, and how many answers on the skill it rests on.
      mastery: Object.fromEntries(skills.map((k) => {
        const m = model.mastery(`s${s.id}`, k);
        return [k, { p: [m.p[1], m.p[2], m.p[3]], n: m.n }];
      })),
    };
  });

  const group = (condition: string) => {
    const mine = attempts.filter((a) => a.condition === condition);
    const chosen = mine.filter((a) => a.policy === condition);
    const people = rows.filter((r) => r.condition === condition);
    const both = people.filter((r) => r.pre?.complete && r.post?.complete);
    return {
      students: students.filter((s) => s.condition === condition).length,
      answered: mine.length,
      classPractice: chosen.length,
      rightFirst: share(mine.map(verdict).filter((v) => v !== null)),
      /** What the model expected of the questions class practice chose, and how far that was from the target. */
      predicted: mean(chosen.flatMap((a) => (a.predicted === null ? [] : [a.predicted]))),
      offTarget: mean(chosen.flatMap((a) => (a.predicted === null ? [] : [Math.abs(a.predicted - TARGET)]))),
      medianSeconds: median(mine.map((a) => a.ms_total / 1000)),
      solutionViewed: share(mine.map((a) => a.solution_viewed === 1)),
      skipped: share(mine.map((a) => a.outcome === "skipped")),
      practiceMinutes: mean(people.map((r) => r.practiceMinutes)),
      // Test scores (share right) over completed tests; the gain only for students who completed both.
      pre: describe(people.filter((r) => r.pre?.complete).map((r) => r.pre!.score)),
      post: describe(people.filter((r) => r.post?.complete).map((r) => r.post!.score)),
      gain: describe(both.map((r) => r.post!.score - r.pre!.score)),
    };
  };
  const conditions = { adaptive: group("adaptive"), fixed: group("fixed") };
  // Cohen's d of the gain, adaptive over fixed, with the pooled SD: a first look; the thesis analysis belongs in R.
  const [a, f] = [conditions.adaptive.gain, conditions.fixed.gain];
  const pooled = a.n >= 2 && f.n >= 2 ? Math.sqrt(((a.n - 1) * a.sd! ** 2 + (f.n - 1) * f.sd! ** 2) / (a.n + f.n - 2)) : null;
  const effect = pooled ? (a.mean! - f.mean!) / pooled : null;
  // The forms should be equally hard: compare them on the pre-test, before any practice could make a difference.
  const preByForm = (form: string) => describe(rows.filter((r) => r.pre?.complete && r.pre.form === form).map((r) => r.pre!.score));

  // The predictions logged when each question appeared, against what the student then did: no hindsight involved.
  const predictions: Prediction[] = attempts.flatMap((a) => {
    const v = verdict(a);
    return a.predicted === null || v === null ? [] : [{ p: a.predicted, correct: v }];
  });

  return {
    class: { code: klass.code, name: klass.name, skills, createdAt: klass.createdAt, ...protocol },
    students: rows,
    conditions,
    tests: { effect: Number.isFinite(effect) ? effect : null, forms: { A: preByForm("A"), B: preByForm("B") } },
    calibration: {
      n: predictions.length,
      logLoss: predictions.length ? logLoss(predictions) : null,
      auc: predictions.length ? auc(predictions) : null,
      bins: calibration(predictions),
    },
  };
}
export type Dashboard = NonNullable<ReturnType<typeof dashboard>>;
