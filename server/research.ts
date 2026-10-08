// Learner records for the adaptive-practice study: classes, students randomised to a condition, and one row for each
// practice question a student works on. No names or emails are kept: a student is a code they write down. Exports name
// students by a number ("s17") instead, so a published data set can't be used to sign in.
import type { IncomingMessage, ServerResponse } from "node:http";
import type { DatabaseSync } from "node:sqlite";
import { randomInt, timingSafeEqual } from "node:crypto";
import { ALL_SKILLS, AREAS, FIRST_SKILLS, SKILLS, areaOf, type Area, type SkillId } from "../src/math/practiceSkills.ts";
import { CURRICULUM, inCurriculumOrder } from "../src/model/curriculum.ts";
import { EloModel, type Level } from "../src/model/elo.ts";
import { evidence } from "../src/model/evaluate.ts";
import { RECENT } from "../src/model/policy.ts";
import { dashboard } from "./dashboard.ts";
import { HttpError, readJson, send } from "./http.ts";
import { clientOf, passwords } from "./limiter.ts";
import { classProtocol, initProtocol, nextTestOrder, parseTestLength, recordTestAnswer, setPhase, studentTests } from "./protocol.ts";

const TEACHER_PASSWORD = process.env.TEACHER_PASSWORD ?? "";
// An attempt is a few hundred bytes; nothing legitimate comes near this.
const MAX_ATTEMPT_BODY = 64 * 1024;

export const RESEARCH_RESOURCES = new Set(["classes", "students", "attempts", "tests", "research"]);

export const CONDITIONS = ["adaptive", "fixed"] as const;
export type Condition = (typeof CONDITIONS)[number];
/** Each block hands out every condition twice in a random order, so a class never drifts more than 2 apart. */
const BLOCK: readonly Condition[] = ["adaptive", "adaptive", "fixed", "fixed"];

export const OUTCOMES = ["solved", "revealed", "skipped"] as const;
/** Who chose the question: the student's condition (class practice), the student (free practice), or the review of misses. */
export const POLICIES = ["adaptive", "fixed", "free", "review"] as const;
/** correct; close (nearly: a sign or rounding slip); wrong; form (right idea, wrong form: sent back, not counted). */
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
      -- the conditions still to hand out from the current randomisation block (JSON array)
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
  `);
  // Columns added after the first version; databases made before get them here.
  const add = (table: string, column: string, type: string) => {
    const has = (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).some((c) => c.name === column);
    if (!has) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  };
  add("classes", "skills", "TEXT");
  // A class made without a skill list used to store none, meaning every skill. Skills added since mustn't join a class
  // that has started (its tests are spread over its skills), so those classes keep the list they had; new ones store it.
  db.prepare("UPDATE classes SET skills = ? WHERE skills IS NULL").run(JSON.stringify(inCurriculumOrder(AREAS.flatMap((a) => [...FIRST_SKILLS[a]]))));
  add("attempts", "policy", "TEXT NOT NULL DEFAULT 'free'");
  // the learner model's chance of a right first answer when the question was shown
  add("attempts", "predicted", "REAL");
  initProtocol(db);
}

/** A class's skills from what a teacher sent: skill ids and area names (all of that area), in curriculum order. */
export function parseSkills(value: unknown): SkillId[] | null {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value) || !value.length) throw new HttpError(400, "skills must be a list of skills or areas");
  const out = new Set<string>();
  for (const v of value) {
    if (AREAS.includes(v as Area)) SKILLS[v as Area].forEach((k) => out.add(k));
    else if (ALL_SKILLS.includes(v as SkillId)) out.add(v);
    else throw new HttpError(400, `unknown skill or area: ${String(v).slice(0, 40)}`);
  }
  return inCurriculumOrder([...out]);
}
const classSkills = (json: string | null): SkillId[] => (json ? JSON.parse(json) : [...CURRICULUM]);

// ---------- the learner model, kept up to date with every stored attempt ----------

const models = new WeakMap<DatabaseSync, { model: EloModel; lastId: number }>();
/** Replays attempts stored since the last call (all of them the first time) and returns the model. */
export function currentModel(db: DatabaseSync): EloModel {
  let cache = models.get(db);
  if (!cache) models.set(db, (cache = { model: new EloModel(), lastId: 0 }));
  const rows = db.prepare("SELECT id, student_id, skill, level, outcome, first_correct, wrongs FROM attempts WHERE id > ? ORDER BY id")
    .all(cache.lastId) as { id: number; student_id: number; skill: SkillId; level: Level; outcome: string; first_correct: number; wrongs: number }[];
  for (const r of rows) {
    // Counted answers: the wrong and nearly right ones, and the right one that solved it.
    const correct = evidence(r.wrongs + (r.outcome === "solved" ? 1 : 0), r.outcome, r.first_correct === 1);
    if (correct !== null) cache.model.update({ student: `s${r.student_id}`, skill: r.skill, level: r.level, correct });
    cache.lastId = r.id;
  }
  return cache.model;
}
/** Deleted answers can't be taken out of the ratings one by one: the next request replays what is left. */
const forgetModel = (db: DatabaseSync) => models.delete(db);

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

type Answer = { input: string; verdict: (typeof VERDICTS)[number]; ms: number };
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
};

/** Checks an uploaded attempt and works out the summary columns from its answers, so they can't disagree. */
export function parseAttempt(body: Record<string, unknown>): AttemptRow {
  const bad = (what: string) => new HttpError(400, `invalid ${what}`);
  const { clientId, skill, level, seed, review, outcome, solutionViewed, msTotal, shownAt, answers, policy = "free", predicted = null } = body;
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
  if (!Array.isArray(answers) || answers.length > MAX_ANSWERS) throw bad("answers");
  const list: Answer[] = answers.map((a) => {
    if (!a || typeof a !== "object" || typeof a.input !== "string" || !oneOf(VERDICTS, a.verdict) || !isInt(a.ms, 0, DAY)) throw bad("answer");
    return { input: a.input.slice(0, MAX_INPUT), verdict: a.verdict, ms: a.ms };
  });
  // What happened has to match the answers: solved ends on a correct one; nothing follows a correct one; a skip had a try.
  const correctAt = list.findIndex((a) => a.verdict === "correct");
  if (correctAt >= 0 && correctAt !== list.length - 1) throw bad("answers");
  if ((outcome === "solved") !== (correctAt >= 0)) throw bad("outcome");
  if (outcome === "skipped" && !list.length) throw bad("outcome");
  const counted = list.filter((a) => a.verdict !== "form");
  return {
    clientId,
    skill,
    level,
    seed,
    review,
    outcome,
    policy,
    predicted,
    firstCorrect: counted[0]?.verdict === "correct",
    wrongs: counted.filter((a) => a.verdict !== "correct").length,
    retries: list.length - counted.length,
    solutionViewed,
    msFirst: list[0]?.ms ?? null,
    msTotal,
    answers: list,
    shownAt,
  };
}

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const CSV_COLUMNS = [
  "attempt", "student", "class", "condition", "policy", "predicted", "area", "skill", "level", "seed", "review", "outcome", "first_correct", "wrongs",
  "retries", "solution_viewed", "ms_first", "ms_total", "n_answers", "answers", "shown_at", "created_at",
] as const;

const TEST_CSV_COLUMNS = [
  "response", "student", "class", "condition", "test_order", "phase", "form", "item", "area", "skill", "level", "seed", "input", "verdict",
  "correct", "retries", "ms", "created_at",
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
    db.prepare("SELECT id, code, class_code AS class, condition, test_order FROM students WHERE code = ?").get(normalizeCode(code)) as
      { id: number; code: string; class: string; condition: Condition; test_order: string | null } | undefined;

  if (resource === "classes" && id && sub === "phase" && req.method === "POST") {
    teacher(req);
    return setPhase(req, res, db, normalizeCode(decodeURIComponent(id)));
  }

  if (resource === "classes" && !id) {
    teacher(req);
    if (req.method === "GET") {
      const rows = db.prepare(`
        SELECT c.code, c.name, c.skills, c.created_at AS createdAt, c.phase, c.session_ends AS sessionEnds, c.test_length AS testLength,
          (SELECT COUNT(*) FROM students s WHERE s.class_code = c.code) AS students,
          (SELECT COUNT(*) FROM students s WHERE s.class_code = c.code AND s.condition = 'adaptive') AS adaptive,
          (SELECT COUNT(*) FROM students s WHERE s.class_code = c.code AND s.condition = 'fixed') AS fixed,
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
      const now = Date.now();
      let code = randomCode(CLASS_LEN);
      while (db.prepare("SELECT 1 FROM classes WHERE code = ?").get(code)) code = randomCode(CLASS_LEN);
      const stored = skills ?? [...CURRICULUM];
      db.prepare("INSERT INTO classes (code, name, skills, test_length, created_at) VALUES (?, ?, ?, ?, ?)").run(code, name, JSON.stringify(stored), testLength, now);
      return send(res, 201, { code, name, skills: stored, createdAt: now, phase: "open", sessionEnds: null, testLength });
    }
    return send(res, 405, { error: "method not allowed" });
  }

  if (resource === "students") {
    if (!id && req.method === "POST") {
      const body = await readJson(req, MAX_ATTEMPT_BODY);
      const klass = db.prepare("SELECT code, block FROM classes WHERE code = ?").get(normalizeCode(body.class)) as
        { code: string; block: string } | undefined;
      if (!klass) return send(res, 404, { error: "no such class" });
      // node:sqlite is synchronous, so nothing else runs between reading the block and writing it back.
      let block = JSON.parse(klass.block) as Condition[];
      if (!block.length) block = shuffled(BLOCK);
      const condition = block.shift()!;
      let code = randomCode(STUDENT_LEN);
      while (findStudent(code)) code = randomCode(STUDENT_LEN);
      code = normalizeCode(code);
      db.prepare("UPDATE classes SET block = ? WHERE code = ?").run(JSON.stringify(block), klass.code);
      db.prepare("INSERT INTO students (code, class_code, condition, test_order, created_at) VALUES (?, ?, ?, ?, ?)")
        .run(code, klass.code, condition, nextTestOrder(db, klass.code, condition), Date.now());
      return send(res, 201, { code, class: klass.code, condition });
    }
    if (!id) return send(res, 405, { error: "method not allowed" });
    const student = findStudent(decodeURIComponent(id));
    if (!student) return send(res, 404, { error: "no such student" });
    // What the student's browser needs to choose questions: their condition and skills, where they are in the fixed
    // sequence, their last skills, and the model (the class-wide difficulties and their own ratings, under "me").
    if (sub === "plan" && req.method === "GET") {
      const { skills } = db.prepare("SELECT skills FROM classes WHERE code = ?").get(student.class) as { skills: string | null };
      const { position } = db.prepare("SELECT COUNT(*) AS position FROM attempts WHERE student_id = ? AND policy = 'fixed'").get(student.id) as { position: number };
      const recent = (db.prepare("SELECT skill FROM attempts WHERE student_id = ? ORDER BY id DESC LIMIT ?").all(student.id, RECENT) as { skill: SkillId }[])
        .map((r) => r.skill).reverse();
      const state = currentModel(db).state([`s${student.id}`]);
      const me = state.students[`s${student.id}`];
      return send(res, 200, {
        class: student.class,
        condition: student.condition,
        skills: classSkills(skills),
        position,
        recent,
        state: { ...state, students: me ? { me } : {} },
        ...classProtocol(db, student.class),
        tests: studentTests(db, student),
      });
    }
    if (sub) return send(res, 404, { error: "not found" });
    if (req.method === "GET") {
      const { n } = db.prepare("SELECT COUNT(*) AS n FROM attempts WHERE student_id = ?").get(student.id) as { n: number };
      return send(res, 200, { code: student.code, class: student.class, condition: student.condition, answered: n });
    }
    // Knowing the code is enough to wipe the record: it is all that ties the answers to the student.
    if (req.method === "DELETE") {
      db.prepare("DELETE FROM students WHERE id = ?").run(student.id);
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
    const a = parseAttempt(body);
    // Class practice is chosen by the student's own condition; anything else would mix the groups up.
    if ((a.policy === "adaptive" || a.policy === "fixed") && a.policy !== student.condition) throw new HttpError(400, "invalid policy");
    const result = db.prepare(`
      INSERT OR IGNORE INTO attempts (client_id, student_id, skill, level, seed, review, outcome, policy, predicted, first_correct, wrongs,
        retries, solution_viewed, ms_first, ms_total, answers, shown_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      a.clientId, student.id, a.skill, a.level, a.seed, Number(a.review), a.outcome, a.policy, a.predicted, Number(a.firstCorrect), a.wrongs, a.retries,
      Number(a.solutionViewed), a.msFirst, a.msTotal, JSON.stringify(a.answers), a.shownAt, Date.now(),
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
    const klass = query.get("class");
    const rows = db.prepare(`
      SELECT a.id AS attempt, 's' || s.id AS student, s.class_code AS class, s.condition, a.policy, a.predicted, a.skill, a.level, a.seed, a.review,
        a.outcome, a.first_correct, a.wrongs, a.retries, a.solution_viewed, a.ms_first, a.ms_total, a.answers, a.shown_at, a.created_at
      FROM attempts a JOIN students s ON s.id = a.student_id
      WHERE ? IS NULL OR s.class_code = ?
      ORDER BY a.id
    `).all(klass && normalizeCode(klass), klass && normalizeCode(klass)) as Record<string, unknown>[];
    return sendCsv(res, "attempts", CSV_COLUMNS, rows.map((r) => ({
      ...r,
      area: areaOf(r.skill as SkillId),
      n_answers: (JSON.parse(r.answers as string) as unknown[]).length,
      shown_at: new Date(r.shown_at as number).toISOString(),
      created_at: new Date(r.created_at as number).toISOString(),
    })));
  }

  // Every test answer as CSV, one row per student, test and question; ?class=CODE for one class. What was typed is a
  // JSON string, so a spreadsheet never reads an answer like "=1+2" as a formula.
  if (resource === "research" && id === "tests.csv" && req.method === "GET") {
    teacher(req);
    const klass = query.get("class");
    const rows = db.prepare(`
      SELECT t.id AS response, 's' || s.id AS student, s.class_code AS class, s.condition, COALESCE(s.test_order, '') AS test_order,
        t.phase, t.form, t.item, t.skill, t.level, t.seed, t.input, t.verdict, t.verdict = 'correct' AS correct, t.retries, t.ms, t.created_at
      FROM test_responses t JOIN students s ON s.id = t.student_id
      WHERE ? IS NULL OR s.class_code = ?
      ORDER BY s.id, t.phase DESC, t.item
    `).all(klass && normalizeCode(klass), klass && normalizeCode(klass)) as Record<string, unknown>[];
    return sendCsv(res, "tests", TEST_CSV_COLUMNS, rows.map((r) => ({
      ...r,
      area: areaOf(r.skill as SkillId),
      input: JSON.stringify(r.input),
      created_at: new Date(r.created_at as number).toISOString(),
    })));
  }

  return send(res, 404, { error: "not found" });
}
