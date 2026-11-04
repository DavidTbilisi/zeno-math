// Learner records for the class studies: classes, each testing one feature (src/model/arms.ts), students randomised to
// the arm with it or without it, and one row for each practice question a student works on. No names or emails are kept: a student is a code they write down. Exports name
// students by a number ("s17") instead, so a published data set can't be used to sign in.
import type { IncomingMessage, ServerResponse } from "node:http";
import type { DatabaseSync } from "node:sqlite";
import { randomInt, timingSafeEqual } from "node:crypto";
import { ALL_SKILLS, AREAS, FIRST_SKILLS, SKILLS, areaOf, type Area, type SkillId } from "../src/math/practiceSkills.ts";
import { CURRICULUM, GRADES, inCurriculumOrder, skillsOfGrade, YEARS, type Grade } from "../src/model/curriculum.ts";
import { ClassModel } from "../src/model/classModel.ts";
import type { Level } from "../src/model/elo.ts";
import { evidence } from "../src/model/evaluate.ts";
import { IDEAS } from "../src/model/conceptGraph.ts";
import { hasIdeas, type IdeaState } from "../src/model/ideaState.ts";
import { learnEma, RECENT, type EmaState } from "../src/model/policy.ts";
import { learnClassSpacing, type Spacing } from "../src/model/spacing.ts";
import type { Fading } from "../src/model/fading.ts";
import { learnStepDown, noStepDown, type StepDown } from "../src/model/stepDown.ts";
import { RATINGS, type Rating } from "../src/model/difficulty.ts";
import { BLOCK, conditionOf, FEATURES, hasFeature, type Arm, type Feature } from "../src/model/arms.ts";
import { dashboard, markSeen } from "./dashboard.ts";
import { initHomework, isHomework, makeHomework, studentHomework } from "./homework.ts";
import { stmt, transaction } from "./db.ts";
import { HttpError, readJson, send } from "./http.ts";
import { clientOf, passwords } from "./limiter.ts";
import { mark, stepCount, stepsAfterMiss, trackFading, trackIdeas, type Answered, type SteppedThrough } from "./marking.ts";
import { classProtocol, initProtocol, logPhase, nextTestOrder, onTime, parseTestLength, phaseWindows, PRACTICE_PHASES, recordPaperTest, recordTestAnswer, setPhase, studentTests } from "./protocol.ts";

const TEACHER_PASSWORD = process.env.TEACHER_PASSWORD ?? "";
// An attempt is a few hundred bytes; nothing legitimate comes near this.
const MAX_ATTEMPT_BODY = 64 * 1024;

export const RESEARCH_RESOURCES = new Set(["classes", "students", "attempts", "tests", "research"]);

/** The policy class practice chooses by: adaptive, or fixed for the arm without it in a class testing the policy. */
export const CONDITIONS = ["adaptive", "fixed"] as const;
export type Condition = (typeof CONDITIONS)[number];

export const OUTCOMES = ["solved", "revealed", "skipped"] as const;
/**
 * Who chose the question: the student's condition (class practice), the student (free practice), the review of misses,
 * the spaced review, or a step-down to one idea after an early failure (stepDown.ts).
 */
export const POLICIES = ["adaptive", "fixed", "free", "review", "spaced", "stepdown", "homework"] as const;
/** correct; close (nearly); wrong (a named mistake too); form (right idea, wrong form: sent back, not counted). */
export const VERDICTS = ["correct", "close", "wrong", "form"] as const;
const MAX_ANSWERS = 50;
const MAX_INPUT = 200;
const DAY = 24 * 60 * 60 * 1000;

// No 0/O, 1/I/L: codes are read off paper and typed in by children.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const randomCode = (n: number) => Array.from({ length: n }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
const STUDENT_LEN = 8;
const CLASS_LEN = 6;
/** Upper case, without spaces and dashes; a student code is shown as XXXX-XXXX. */
export function normalizeCode(value: unknown): string {
  const raw = String(value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return raw.length === STUDENT_LEN ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw;
}

export function initResearch(db: DatabaseSync) {
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS classes (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      -- the arms still to hand out from the current randomisation block (JSON array)
      block TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL
      -- skills TEXT (added below): the skills the class practises, in curriculum order (JSON array; stored when the class is made, so skills added later stay out)
    );
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      class_code TEXT NOT NULL REFERENCES classes(code),
      condition TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      -- made by the client, so a retried upload isn't stored twice
      client_id TEXT NOT NULL UNIQUE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      skill TEXT NOT NULL,
      level INTEGER NOT NULL,
      seed INTEGER NOT NULL,
      review INTEGER NOT NULL,
      outcome TEXT NOT NULL,
      -- the rest is worked out from answers when the row is stored
      first_correct INTEGER NOT NULL,
      wrongs INTEGER NOT NULL,
      retries INTEGER NOT NULL,
      solution_viewed INTEGER NOT NULL,
      ms_first INTEGER,
      ms_total INTEGER NOT NULL,
      answers TEXT NOT NULL,
      shown_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS attempts_student ON attempts(student_id, id);
    -- a stuck student the teacher has seen (dashboard.ts): off the list until ten more questions after attempt "through"
    CREATE TABLE IF NOT EXISTS stuck_seen (
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      skill TEXT NOT NULL,
      through INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (student_id, skill)
    );
    -- a class's students (the dashboard, the exports and counterbalancing all start from them)
    CREATE INDEX IF NOT EXISTS students_class ON students(class_code, condition);
  `);
  // Columns added after the first version; databases made before get them here.
  const add = (table: string, column: string, type: string) => {
    const has = (stmt(db, `PRAGMA table_info(${table})`).all() as { name: string }[]).some((c) => c.name === column);
    if (!has) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  };
  add("classes", "skills", "TEXT");
  // A class made without a skill list used to store none, meaning every skill. Skills added since mustn't join a class
  // that has started (its tests are spread over its skills), so those classes keep the list they had; new ones store it.
  stmt(db, "UPDATE classes SET skills = ? WHERE skills IS NULL").run(JSON.stringify(inCurriculumOrder(AREAS.flatMap((a) => [...FIRST_SKILLS[a]]))));
  add("attempts", "policy", "TEXT NOT NULL DEFAULT 'free'");
  // the learner model's chance of a right first answer when the question was shown
  add("attempts", "predicted", "REAL");
  // How many of the answers the server marked differently from the browser (each keeps the browser's verdict as "client").
  add("attempts", "remarked", "INTEGER NOT NULL DEFAULT 0");
  // 1: class practice that arrived more than GRACE after the class's practice time ended (protocol.ts).
  add("attempts", "late", "INTEGER NOT NULL DEFAULT 0");
  // The ideas the student ticked as hard after a wrong answer (JSON array), or NULL: not asked, or nothing ticked.
  add("attempts", "hard", "TEXT");
  // The steps worked after a wrong answer (JSON array, one {answers, shown} per step), or NULL: not worked in steps.
  add("attempts", "steps", "TEXT");
  // A faded worked example (src/model/fading.ts): how many of its steps were shown done, or NULL: asked whole.
  add("attempts", "faded", "INTEGER");
  // How the question felt to the student once it was over (easy, right or hard: too easy, about right, too hard), or
  // NULL: they didn't say.
  add("attempts", "rated", "TEXT");
  // The feature a class tests (arms.ts), chosen when it is made; classes from before arms tested the policy.
  add("classes", "feature", "TEXT NOT NULL DEFAULT 'policy'");
  // The student's arm: on (with the feature) or off. Students from before arms take it from their condition, and the
  // blocks still being handed out turn their conditions into arms.
  add("students", "arm", "TEXT");
  // The student's number in the class list, if they gave one: the teacher finds a lost student code by it. It stays on
  // the teacher's page and is never exported, so the research data still knows students only by their own number.
  add("students", "list_no", "INTEGER");
  stmt(db, "UPDATE students SET arm = CASE condition WHEN 'fixed' THEN 'off' ELSE 'on' END WHERE arm IS NULL").run();
  stmt(db, `UPDATE classes SET block = replace(replace(block, '"adaptive"', '"on"'), '"fixed"', '"off"') WHERE block LIKE '%"adaptive"%' OR block LIKE '%"fixed"%'`).run();
  initProtocol(db);
  initHomework(db);
}

/**
 * A class's skills from what a teacher sent: skill ids, area names (all of that area), grades of the course ("G7":
 * every skill with a level in it; G10 is grades 9–10, G12 grades 11–12, G13 university) and, as before grades, years
 * of the primary syllabus ("P4", the same as "G4"), in curriculum order.
 */
export function parseSkills(value: unknown): SkillId[] | null {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value) || !value.length) throw new HttpError(400, "skills must be a list of skills, areas or grades");
  const out = new Set<string>();
  for (const v of value) {
    const grade = typeof v === "string" && /^[PG]\d+$/.test(v) ? Number(v.slice(1)) : null;
    if (AREAS.includes(v as Area)) SKILLS[v as Area].forEach((k) => out.add(k));
    else if (grade && (v[0] === "P" ? YEARS : GRADES).includes(grade as Grade)) skillsOfGrade(grade as Grade).forEach((k) => out.add(k));
    else if (ALL_SKILLS.includes(v as SkillId)) out.add(v);
    else throw new HttpError(400, `unknown skill, area or grade: ${String(v).slice(0, 40)}`);
  }
  return inCurriculumOrder([...out]);
}
/** The highest number in a class list a student can give. */
export const MAX_LIST_NO = 99;
/** The student's number in the class list, or null when they gave none. */
export function parseListNo(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > MAX_LIST_NO)
    throw new HttpError(400, `number must be a whole number from 1 to ${MAX_LIST_NO}`);
  return value as number;
}
const classSkills = (json: string | null): SkillId[] => (json ? JSON.parse(json) : [...CURRICULUM]);

// ---------- the learner model and each student's ideas and moving averages, kept up to date with every stored attempt ----------

type Replay = {
  model: ClassModel; ideas: Map<number, IdeaState>; ema: Map<number, EmaState>; spacing: Map<number, Spacing>; fading: Map<number, Fading>;
  stepDown: Map<number, StepDown>; lastId: number;
};
const replays = new WeakMap<DatabaseSync, Replay>();
/**
 * Replays attempts stored since the last call (all of them the first time) into the model and the students' ideas,
 * moving averages, spaced reviews, fading and step-downs.
 */
function replay(db: DatabaseSync): Replay {
  let cache = replays.get(db);
  if (!cache) replays.set(db, (cache = { model: new ClassModel(), ideas: new Map(), ema: new Map(), spacing: new Map(), fading: new Map(), stepDown: new Map(), lastId: 0 }));
  const rows = stmt(db, `
    SELECT a.id, a.student_id, a.skill, a.level, a.seed, a.outcome, a.first_correct, a.answers, a.hard, a.steps, a.faded, a.shown_at, a.policy, s.arm, c.feature,
      json_array_length(a.answers) - a.retries AS counted
    FROM attempts a JOIN students s ON s.id = a.student_id JOIN classes c ON c.code = s.class_code WHERE a.id > ? ORDER BY a.id
  `).all(cache.lastId) as {
    id: number; student_id: number; skill: SkillId; level: Level; seed: number; outcome: string; first_correct: number; answers: string; hard: string | null; steps: string | null;
    faded: number | null; shown_at: number; policy: string; arm: Arm; feature: Feature; counted: number;
  }[];
  const json = <T>(v: string | null) => (v ? (JSON.parse(v) as T) : undefined);
  for (const r of rows) {
    // Counted answers are those not sent back for their form, as the export reads them (evaluate.ts, observation).
    const correct = evidence(r.counted, r.outcome, r.first_correct === 1, r.faded !== null);
    const q = { skill: r.skill, level: r.level, seed: r.seed };
    const answers = JSON.parse(r.answers) as Answered[];
    const steps = json<SteppedThrough[]>(r.steps);
    if (correct !== null) {
      cache.model.update({ student: `s${r.student_id}`, skill: r.skill, level: r.level, correct });
      learnEma(cache.ema.get(r.student_id) ?? cache.ema.set(r.student_id, {}).get(r.student_id)!, r.skill, correct);
    }
    // On a skill made of ideas, the question is rebuilt and the student's ideas move as the browser's did (learner.ts).
    if (hasIdeas(r.skill)) {
      const ideas = cache.ideas.get(r.student_id) ?? cache.ideas.set(r.student_id, {}).get(r.student_id)!;
      trackIdeas(ideas, q, r.outcome, answers, json<string[]>(r.hard), steps, r.faded ?? undefined);
    }
    // Then the spaced reviews, by the same rule as the browser's (learner.ts), with mastery as it stands after this answer.
    if (correct !== null) {
      const spacing = cache.spacing.get(r.student_id) ?? cache.spacing.set(r.student_id, {}).get(r.student_id)!;
      const ema = cache.ema.get(r.student_id)!;
      learnClassSpacing(spacing, cache.model, `s${r.student_id}`, ema, cache.ideas.get(r.student_id) ?? {}, r.skill, correct, r.shown_at);
    }
    // And the fading of worked examples, on the skills worked in steps.
    trackFading(cache.fading.get(r.student_id) ?? cache.fading.set(r.student_id, {}).get(r.student_id)!, q, r.outcome, answers, steps, r.faded ?? undefined);
    // And, for the arm with it, the step-down, with the ideas as they stand after this answer.
    if (hasFeature(r, "stepdown")) {
      const stepDown = cache.stepDown.get(r.student_id) ?? cache.stepDown.set(r.student_id, noStepDown()).get(r.student_id)!;
      learnStepDown(stepDown, { skill: r.skill, policy: r.policy, correct }, cache.ideas.get(r.student_id) ?? {});
    }
    cache.lastId = r.id;
  }
  return cache;
}
export const currentModel = (db: DatabaseSync): ClassModel => replay(db).model;
/** What a student knows of each idea they have met (ideaState.ts), for the adaptive policy to aim at the weakest. */
export const currentIdeas = (db: DatabaseSync, studentId: number): IdeaState => replay(db).ideas.get(studentId) ?? {};
/** A student's moving average on each skill they have answered, for the adaptive policy's mastery rule (policy.ts). */
export const currentEma = (db: DatabaseSync, studentId: number): EmaState => replay(db).ema.get(studentId) ?? {};
/** A student's spaced reviews (spacing.ts): when each skill they have mastered comes back. */
export const currentSpacing = (db: DatabaseSync, studentId: number): Spacing => replay(db).spacing.get(studentId) ?? {};
/** A student's fading worked examples (fading.ts): how many steps they work on each skill being faded. */
export const currentFading = (db: DatabaseSync, studentId: number): Fading => replay(db).fading.get(studentId) ?? {};
/** A student's step-down (stepDown.ts): their early answers on each skill made of ideas, and the step-down under way. */
export const currentStepDown = (db: DatabaseSync, studentId: number): StepDown => replay(db).stepDown.get(studentId) ?? noStepDown();
/** Deleted answers can't be taken out of the records and weights one by one: the next request replays what is left. */
const forgetModel = (db: DatabaseSync) => replays.delete(db);

function teacher(req: IncomingMessage) {
  if (!TEACHER_PASSWORD) return;
  const client = clientOf(req);
  const wait = passwords.retryAfter(client);
  if (wait) throw new HttpError(429, "too many wrong passwords; try again later", { "Retry-After": String(wait) });
  const sent = String(req.headers["x-teacher-password"] ?? "");
  const given = Buffer.from(sent);
  const want = Buffer.from(TEACHER_PASSWORD);
  if (given.length !== want.length || !timingSafeEqual(given, want)) {
    if (sent) passwords.fail(client);
    throw new HttpError(403, "teacher password required");
  }
  passwords.succeed(client);
}

function shuffled<T>(items: readonly T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const isInt = (v: unknown, lo: number, hi: number): v is number => Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi;
const oneOf = <T extends string>(items: readonly T[], v: unknown): v is T => items.includes(v as T);

type Verdict = (typeof VERDICTS)[number];
/** An answer as stored: the server's verdict, and the browser's as client where it differed. */
type Answer = { input: string; verdict: Verdict; ms: number; client?: Verdict };
/** A step of a question worked in steps: its answers, and whether its answer was shown. */
type Step = { answers: Answer[]; shown: boolean };
export type AttemptRow = {
  clientId: string;
  skill: SkillId;
  level: number;
  seed: number;
  review: boolean;
  outcome: (typeof OUTCOMES)[number];
  policy: (typeof POLICIES)[number];
  predicted: number | null;
  firstCorrect: boolean;
  wrongs: number;
  retries: number;
  solutionViewed: boolean;
  msFirst: number | null;
  msTotal: number;
  answers: Answer[];
  shownAt: number;
  /** The ideas ticked as hard, each one of the fractions graph's, on a skill with ideas. */
  hard?: string[];
  /** The steps worked after a wrong answer, in order, no more than the question has; on a faded example, all of them. */
  steps?: Step[];
  /** A faded worked example: how many of its steps were shown done (the first ones). */
  faded?: number;
  /** How the question felt to the student once it was over: too easy, about right or too hard. */
  rated?: Rating;
};

/** Checks an uploaded attempt and works out the summary columns from its answers, so they can't disagree. */
export function parseAttempt(body: Record<string, unknown>): AttemptRow {
  const bad = (what: string) => new HttpError(400, `invalid ${what}`);
  const { clientId, skill, level, seed, review, outcome, solutionViewed, msTotal, shownAt, answers, policy = "free", predicted = null, hard, steps, faded, rated } = body;
  if (typeof clientId !== "string" || !/^[A-Za-z0-9-]{8,64}$/.test(clientId)) throw bad("clientId");
  if (!oneOf(ALL_SKILLS, skill)) throw bad("skill");
  if (!isInt(level, 1, 3)) throw bad("level");
  if (!isInt(seed, 0, 2 ** 31)) throw bad("seed");
  if (typeof review !== "boolean") throw bad("review");
  if (!oneOf(OUTCOMES, outcome)) throw bad("outcome");
  if (!oneOf(POLICIES, policy) || (policy === "review") !== review) throw bad("policy");
  if (predicted !== null && !(typeof predicted === "number" && predicted >= 0 && predicted <= 1)) throw bad("predicted");
  if (typeof solutionViewed !== "boolean") throw bad("solutionViewed");
  if (!isInt(msTotal, 0, DAY)) throw bad("msTotal");
  if (!isInt(shownAt, 0, Number.MAX_SAFE_INTEGER)) throw bad("shownAt");
  const answerList = (value: unknown, what: string): Answer[] => {
    if (!Array.isArray(value) || value.length > MAX_ANSWERS) throw bad(what);
    const list = value.map((a): Answer => {
      if (!a || typeof a !== "object" || typeof a.input !== "string" || !oneOf(VERDICTS, a.verdict) || !isInt(a.ms, 0, DAY)) throw bad("answer");
      return { input: a.input.slice(0, MAX_INPUT), verdict: a.verdict, ms: a.ms };
    });
    // Nothing follows a correct answer.
    const correctAt = list.findIndex((a) => a.verdict === "correct");
    if (correctAt >= 0 && correctAt !== list.length - 1) throw bad(what);
    return list;
  };
  const list = answerList(answers, "answers");
  const correctAt = list.findIndex((a) => a.verdict === "correct");
  if (faded === undefined) {
    // What happened has to match the answers: solved ends on a correct one; a skip had a try.
    if ((outcome === "solved") !== (correctAt >= 0)) throw bad("outcome");
    if (outcome === "skipped" && !list.length) throw bad("outcome");
  }
  // What was ticked as hard: ideas of a graph, each once, and only on a skill made of them.
  const ideas = Object.keys(IDEAS);
  if (hard !== undefined && (!hasIdeas(skill) || !Array.isArray(hard) || !hard.length || new Set(hard).size !== hard.length || !hard.every((h) => ideas.includes(h)))) throw bad("hard");
  // The student's word on the difficulty, asked only once the question is over (solved or its answer shown).
  if (rated !== undefined && (!oneOf(RATINGS, rated) || outcome === "skipped")) throw bad("rated");
  // The steps: after a wrong first answer on a skill worked in steps then, no more than the question has, each
  // answered or shown; or a faded worked example's, below.
  let stepList: Step[] | undefined;
  const n = steps !== undefined || faded !== undefined ? stepCount({ skill, level, seed }) : 0;
  const stepsOf = (from: number) => (steps as unknown[]).map((s, i): Step => {
    if (!s || typeof s !== "object" || typeof (s as Step).shown !== "boolean") throw bad("steps");
    const stepAnswers = answerList((s as Step).answers, "steps");
    if ((!stepAnswers.length && !(s as Step).shown) || (i < from && (stepAnswers.length || !(s as Step).shown))) throw bad("steps");
    return { answers: stepAnswers, shown: (s as Step).shown };
  });
  if (faded !== undefined) {
    // A faded worked example: the first `faded` steps shown done, the student's after them, and no whole answer. It is
    // solved or revealed by its last step once the student gets that far, and skipped before.
    if (!isInt(faded, 1, n - 1) || list.length || !Array.isArray(steps) || steps.length <= faded || steps.length > n) throw bad("faded");
    stepList = stepsOf(faded);
    const last = stepList.length === n ? stepList[n - 1] : null;
    const want = !last ? "skipped" : last.answers.some((a) => a.verdict === "correct") ? "solved" : "revealed";
    if (outcome !== want) throw bad("outcome");
  } else if (steps !== undefined) {
    if (!stepsAfterMiss(skill) || !Array.isArray(steps) || !steps.length || summary(list).firstCorrect || !list.length || steps.length > n) throw bad("steps");
    stepList = stepsOf(0);
  }
  return {
    clientId, skill, level, seed, review, outcome, policy, predicted, ...summary(list), solutionViewed, msFirst: list[0]?.ms ?? null, msTotal, answers: list, shownAt,
    ...(hard ? { hard: hard as string[] } : {}),
    ...(stepList ? { steps: stepList } : {}),
    ...(faded !== undefined ? { faded: faded as number } : {}),
    ...(rated !== undefined ? { rated: rated as Rating } : {}),
  };
}

/** The summary columns, from the answers: a form message doesn't count as a try. */
function summary(list: readonly Answer[]) {
  const counted = list.filter((a) => a.verdict !== "form");
  return { firstCorrect: counted[0]?.verdict === "correct", wrongs: counted.filter((a) => a.verdict !== "correct").length, retries: list.length - counted.length };
}

/**
 * The attempt with every answer marked again by the server (marking.ts), and the summary worked out from those
 * verdicts. What the student did (the outcome) is the browser's account and stays as sent; where the verdicts differ,
 * remarked says how many, and the export shows both.
 */
export function markAttempt(a: AttemptRow): AttemptRow & { remarked: number } {
  const remark = (list: Answer[], step?: number) => list.map((x): Answer => {
    const verdict = mark(a, x.input, step);
    return verdict === x.verdict ? x : { ...x, verdict, client: x.verdict };
  });
  const answers = remark(a.answers);
  const steps = a.steps?.map((s, i) => ({ ...s, answers: remark(s.answers, i) }));
  const remarked = [answers, ...(steps ?? []).map((s) => s.answers)].flat().filter((x) => x.client).length;
  return { ...a, ...summary(answers), answers, ...(steps ? { steps } : {}), remarked };
}

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const CSV_COLUMNS = [
  "attempt", "student", "class", "feature", "arm", "condition", "policy", "predicted", "area", "skill", "level", "seed", "review", "outcome", "first_correct", "wrongs",
  "retries", "solution_viewed", "ms_first", "ms_total", "n_answers", "answers", "hard", "steps", "faded", "rated", "remarked", "late", "shown_at", "created_at",
] as const;

const TEST_CSV_COLUMNS = [
  "response", "student", "class", "feature", "arm", "condition", "test_order", "phase", "form", "test_length", "item", "area", "skill", "level", "seed", "input",
  "verdict", "correct", "client_verdict", "late", "paper", "retries", "ms", "created_at",
] as const;
function sendCsv(res: ServerResponse, name: string, columns: readonly string[], rows: Record<string, unknown>[]) {
  const stamp = new Date().toISOString().slice(0, 10);
  res.writeHead(200, {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="zeno-${name}-${stamp}.csv"`,
  }).end([columns.join(","), ...rows.map((r) => columns.map((c) => csvCell(r[c])).join(","))].join("\n") + "\n");
}

export async function handleResearch(
  req: IncomingMessage, res: ServerResponse, resource: string, id: string | undefined, sub: string | undefined, query: URLSearchParams, db: DatabaseSync,
) {
  const findStudent = (code: unknown) =>
    stmt(db, `
      SELECT s.id, s.code, s.class_code AS class, s.condition, s.arm, c.feature, s.test_order FROM students s JOIN classes c ON c.code = s.class_code WHERE s.code = ?
    `).get(normalizeCode(code)) as { id: number; code: string; class: string; condition: Condition; arm: Arm; feature: Feature; test_order: string | null } | undefined;
  // An export of one class or of all of them: two statements, so the one for a class goes by the students_class index
  // (a "? IS NULL OR class_code = ?" condition would make SQLite scan every row either way).
  const forClass = (klass: string | null, sql: string) =>
    (klass
      ? stmt(db, sql.replace("{where}", "WHERE s.class_code = ?")).all(normalizeCode(klass))
      : stmt(db, sql.replace("{where}", "")).all()) as Record<string, unknown>[];

  if (resource === "classes" && id && sub === "phase" && req.method === "POST") {
    teacher(req);
    return setPhase(req, res, db, normalizeCode(decodeURIComponent(id)));
  }

  // Homework for every student in the class, each made from their own records (issue #297).
  if (resource === "classes" && id && sub === "homework" && req.method === "POST") {
    teacher(req);
    return makeHomework(req, res, db, normalizeCode(decodeURIComponent(id)));
  }

  // A test written on paper, typed in by the teacher.
  if (resource === "classes" && id && sub === "paper" && req.method === "POST") {
    teacher(req);
    return recordPaperTest(req, res, db, normalizeCode(decodeURIComponent(id)), findStudent);
  }

  // The teacher has seen a stuck student ({ student: "s3", skill, through: attempt id }).
  if (resource === "classes" && id && sub === "seen" && req.method === "POST") {
    teacher(req);
    const body = (await readJson(req)) as Record<string, unknown>;
    return markSeen(db, normalizeCode(decodeURIComponent(id)), body.student, body.skill, body.through)
      ? send(res, 204) : send(res, 404, { error: "no such stuck student" });
  }

  if (resource === "classes" && !id) {
    teacher(req);
    if (req.method === "GET") {
      // Each count goes by the students_class index (and from there attempts_student), so no table is scanned.
      const rows = stmt(db, `
        SELECT c.code, c.name, c.skills, c.feature, c.created_at AS createdAt, c.phase, c.session_ends AS sessionEnds, c.test_length AS testLength,
          (SELECT COUNT(*) FROM students s WHERE s.class_code = c.code) AS students,
          (SELECT COUNT(*) FROM students s WHERE s.class_code = c.code AND s.arm = 'on') AS "on",
          (SELECT COUNT(*) FROM students s WHERE s.class_code = c.code AND s.arm = 'off') AS "off",
          (SELECT COUNT(*) FROM attempts a JOIN students s ON s.id = a.student_id WHERE s.class_code = c.code) AS attempts
        FROM classes c ORDER BY c.created_at
      `).all() as { skills: string | null }[];
      return send(res, 200, rows.map((r) => ({ ...r, skills: classSkills(r.skills) })));
    }
    if (req.method === "POST") {
      const body = await readJson(req, MAX_ATTEMPT_BODY);
      const name = String(body.name ?? "").trim().slice(0, 100) || "Class";
      const skills = parseSkills(body.skills);
      const testLength = parseTestLength(body.testLength);
      const feature = body.feature ?? "policy";
      if (!oneOf(FEATURES, feature)) throw new HttpError(400, `feature must be one of ${FEATURES.join(", ")}`);
      const now = Date.now();
      let code = randomCode(CLASS_LEN);
      while (stmt(db, "SELECT 1 FROM classes WHERE code = ?").get(code)) code = randomCode(CLASS_LEN);
      const stored = skills ?? [...CURRICULUM];
      stmt(db, "INSERT INTO classes (code, name, skills, feature, test_length, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(code, name, JSON.stringify(stored), feature, testLength, now);
      logPhase(db, code, "open", null, now);
      return send(res, 201, { code, name, skills: stored, feature, createdAt: now, phase: "open", sessionEnds: null, testLength });
    }
    return send(res, 405, { error: "method not allowed" });
  }

  if (resource === "students") {
    if (!id && req.method === "POST") {
      const body = await readJson(req, MAX_ATTEMPT_BODY);
      const classCode = normalizeCode(body.class);
      const listNo = parseListNo(body.number);
      // One transaction: the arm leaves the block and the student is stored together, or neither is. (node:sqlite is
      // synchronous, so nothing else runs in between anyway.)
      const joined = transaction(db, () => {
        const klass = stmt(db, "SELECT code, block, feature FROM classes WHERE code = ?").get(classCode) as { code: string; block: string; feature: Feature } | undefined;
        if (!klass) return null;
        // Someone in the class already gave this number: most likely the same student on another device, who would
        // split their record (and could land in the other arm). Joined again only when they say it isn't them.
        if (listNo !== null && body.again !== true && stmt(db, "SELECT 1 FROM students WHERE class_code = ? AND list_no = ?").get(klass.code, listNo))
          return "taken" as const;
        let block = JSON.parse(klass.block) as Arm[];
        if (!block.length) block = shuffled(BLOCK);
        const arm = block.shift()!;
        const condition = conditionOf(klass.feature, arm);
        let code = randomCode(STUDENT_LEN);
        while (findStudent(code)) code = randomCode(STUDENT_LEN);
        code = normalizeCode(code);
        stmt(db, "UPDATE classes SET block = ? WHERE code = ?").run(JSON.stringify(block), klass.code);
        stmt(db, "INSERT INTO students (code, class_code, condition, arm, test_order, list_no, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
          .run(code, klass.code, condition, arm, nextTestOrder(db, klass.code, arm), listNo, Date.now());
        return { code, class: klass.code, condition, feature: klass.feature, arm };
      });
      if (joined === "taken") return send(res, 409, { error: "a student in this class already gave that number" });
      return joined ? send(res, 201, joined) : send(res, 404, { error: "no such class" });
    }
    if (!id) return send(res, 405, { error: "method not allowed" });
    const student = findStudent(decodeURIComponent(id));
    if (!student) return send(res, 404, { error: "no such student" });
    // What the student's browser needs to choose questions: their condition and skills, where they are in the fixed
    // sequence, their last skills, the model (the class-wide weights and their own records, under "me"), their ideas and
    // their moving average on each skill.
    if (sub === "plan" && req.method === "GET") {
      const { skills } = stmt(db, "SELECT skills FROM classes WHERE code = ?").get(student.class) as { skills: string | null };
      const { position } = stmt(db, "SELECT COUNT(*) AS position FROM attempts WHERE student_id = ? AND policy = 'fixed'").get(student.id) as { position: number };
      const recent = (stmt(db, "SELECT skill FROM attempts WHERE student_id = ? ORDER BY id DESC LIMIT ?").all(student.id, RECENT) as { skill: SkillId }[])
        .map((r) => r.skill).reverse();
      const state = currentModel(db).state([`s${student.id}`]);
      const me = state.students[`s${student.id}`];
      return send(res, 200, {
        class: student.class,
        condition: student.condition,
        feature: student.feature,
        arm: student.arm,
        skills: classSkills(skills),
        position,
        recent,
        state: { ...state, students: me ? { me } : {} },
        ideas: currentIdeas(db, student.id),
        ema: currentEma(db, student.id),
        spacing: currentSpacing(db, student.id),
        fading: currentFading(db, student.id),
        stepDown: currentStepDown(db, student.id),
        ...classProtocol(db, student.class),
        tests: studentTests(db, student),
        homework: studentHomework(db, student),
      });
    }
    if (sub) return send(res, 404, { error: "not found" });
    if (req.method === "GET") {
      const { n } = stmt(db, "SELECT COUNT(*) AS n FROM attempts WHERE student_id = ?").get(student.id) as { n: number };
      return send(res, 200, { code: student.code, class: student.class, condition: student.condition, feature: student.feature, arm: student.arm, answered: n });
    }
    // Knowing the code is enough to wipe the record: it is all that ties the answers to the student.
    if (req.method === "DELETE") {
      stmt(db, "DELETE FROM students WHERE id = ?").run(student.id);
      forgetModel(db);
      return send(res, 204);
    }
    return send(res, 405, { error: "method not allowed" });
  }

  if (resource === "tests" && !id && req.method === "POST") return recordTestAnswer(req, res, db, findStudent);

  if (resource === "attempts" && !id) {
    if (req.method !== "POST") return send(res, 405, { error: "method not allowed" });
    const body = await readJson(req, MAX_ATTEMPT_BODY);
    const student = findStudent(body.student);
    if (!student) return send(res, 404, { error: "no such student" });
    const a = markAttempt(parseAttempt(body));
    // Class practice is chosen by the student's own condition, and a feature the student's arm hasn't got doesn't show
    // in their answers: anything else would mix the arms up.
    const classPractice = a.policy === "adaptive" || a.policy === "fixed";
    if (classPractice && a.policy !== student.condition) throw new HttpError(400, "invalid policy");
    if (a.policy === "spaced" && !hasFeature(student, "spaced")) throw new HttpError(400, "invalid policy");
    if (a.policy === "stepdown" && !hasFeature(student, "stepdown")) throw new HttpError(400, "invalid policy");
    if (a.steps && !hasFeature(student, "steps")) throw new HttpError(400, "invalid steps");
    if (a.hard && !hasFeature(student, "hard")) throw new HttpError(400, "invalid hard");
    if (a.faded && !hasFeature(student, "faded")) throw new HttpError(400, "invalid faded");
    // Homework is the student's own questions: an answer to anything else isn't homework.
    if (a.policy === "homework" && !isHomework(db, student.id, a)) throw new HttpError(400, "invalid policy");
    const now = Date.now();
    // Class practice belongs in practice time; arriving long after it ended, it is kept and marked late.
    const late = (classPractice || a.policy === "stepdown") && !onTime(phaseWindows(db, student.class), PRACTICE_PHASES, now);
    const result = stmt(db, `
      INSERT OR IGNORE INTO attempts (client_id, student_id, skill, level, seed, review, outcome, policy, predicted, first_correct, wrongs,
        retries, solution_viewed, ms_first, ms_total, answers, shown_at, remarked, late, hard, steps, faded, rated, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      a.clientId, student.id, a.skill, a.level, a.seed, Number(a.review), a.outcome, a.policy, a.predicted, Number(a.firstCorrect), a.wrongs, a.retries,
      Number(a.solutionViewed), a.msFirst, a.msTotal, JSON.stringify(a.answers), a.shownAt, a.remarked, Number(late), a.hard ? JSON.stringify(a.hard) : null,
      a.steps ? JSON.stringify(a.steps) : null, a.faded ?? null, a.rated ?? null, now,
    );
    // 200 for a repeat of one already stored: the client can drop it from its outbox either way.
    return send(res, result.changes ? 201 : 200, { stored: result.changes === 1 });
  }

  // The teacher's dashboard for one class (?class=CODE).
  if (resource === "research" && id === "dashboard" && req.method === "GET") {
    teacher(req);
    const data = dashboard(db, normalizeCode(query.get("class")));
    return data ? send(res, 200, data) : send(res, 404, { error: "no such class" });
  }

  // Every attempt as CSV, for R / pandas; ?class=CODE for one class.
  if (resource === "research" && id === "attempts.csv" && req.method === "GET") {
    teacher(req);
    const rows = forClass(query.get("class"), `
      SELECT a.id AS attempt, 's' || s.id AS student, s.class_code AS class, c.feature, s.arm, s.condition, a.policy, a.predicted, a.skill, a.level, a.seed, a.review,
        a.outcome, a.first_correct, a.wrongs, a.retries, a.solution_viewed, a.ms_first, a.ms_total, a.answers, a.hard, a.steps, a.faded, a.rated, a.remarked, a.late, a.shown_at, a.created_at,
        json_array_length(a.answers) AS n_answers
      FROM attempts a JOIN students s ON s.id = a.student_id JOIN classes c ON c.code = s.class_code
      {where}
      ORDER BY a.id
    `);
    return sendCsv(res, "attempts", CSV_COLUMNS, rows.map((r) => ({
      ...r,
      area: areaOf(r.skill as SkillId),
      shown_at: new Date(r.shown_at as number).toISOString(),
      created_at: new Date(r.created_at as number).toISOString(),
    })));
  }

  // Every test answer as CSV, one row per student, test and question; ?class=CODE for one class. What was typed is a
  // JSON string, so a spreadsheet never reads an answer like "=1+2" as a formula.
  if (resource === "research" && id === "tests.csv" && req.method === "GET") {
    teacher(req);
    const rows = forClass(query.get("class"), `
      SELECT t.id AS response, 's' || s.id AS student, s.class_code AS class, c.feature, s.arm, s.condition, COALESCE(s.test_order, '') AS test_order,
        t.phase, t.form, c.test_length, t.item, t.skill, t.level, t.seed, t.input, t.verdict, t.verdict = 'correct' AS correct,
        t.client_verdict, t.late, t.paper, t.retries, t.ms, t.created_at
      FROM test_responses t JOIN students s ON s.id = t.student_id JOIN classes c ON c.code = s.class_code
      {where}
      ORDER BY s.id, t.phase DESC, t.item
    `);
    return sendCsv(res, "tests", TEST_CSV_COLUMNS, rows.map((r) => ({
      ...r,
      area: areaOf(r.skill as SkillId),
      input: JSON.stringify(r.input),
      created_at: new Date(r.created_at as number).toISOString(),
    })));
  }

  return send(res, 404, { error: "not found" });
}
