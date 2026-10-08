// The study protocol: what a class is doing now (its phase, set by the teacher), timed practice sessions, and the pre-
// and post-test. A test answer is stored once per student, test and question, with what was typed and how the server
// marked it; nothing is shown to the student, and the learner model never sees it, so the outcome measure stays apart
// from what the adaptive condition learns from.
//
// Every phase change is logged, so the server can tell whether an answer came in its phase. The browser waits for the
// phase too, but it hears of a change only every 30 s and keeps answers while the Wi-Fi is down, so the server judges
// by when an answer arrives: a test that hasn't started is refused, and an answer that arrives more than GRACE after
// its phase ended is stored but marked late, for the analysis to report (an offline tablet's answers aren't lost).
import type { IncomingMessage, ServerResponse } from "node:http";
import type { DatabaseSync } from "node:sqlite";
import { CURRICULUM } from "../src/model/curriculum.ts";
import { DEFAULT_TEST_LENGTH, formFor, MAX_TEST_LENGTH, MIN_TEST_LENGTH, testItems, type TestOrder, type TestPhase } from "../src/model/testForms.ts";
import { stmt, transaction } from "./db.ts";
import { HttpError, readJson, send } from "./http.ts";
import { mark } from "./marking.ts";

/**
 * open: class practice any time (no timer); pretest / posttest: the test, for students who haven't finished it;
 * session: class practice until sessionEnds, the same window for everyone; closed: no class practice.
 */
export const PHASES = ["open", "pretest", "session", "posttest", "closed"] as const;
export type Phase = (typeof PHASES)[number];
/** A test answer: right, nearly right, wrong, or passed over. Form messages ("lowest terms") are retried, not stored. */
export const TEST_VERDICTS = ["correct", "close", "wrong", "skipped"] as const;
const MAX_SESSION_MINUTES = 240;
const DAY = 24 * 60 * 60 * 1000;
/** How long after its phase ends an answer still counts as on time: the 30 s poll, and a question finished as time runs out. */
export const GRACE = 5 * 60_000;

export function initProtocol(db: DatabaseSync) {
  const add = (table: string, column: string, type: string) => {
    const has = (stmt(db, `PRAGMA table_info(${table})`).all() as { name: string }[]).some((c) => c.name === column);
    if (!has) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  };
  add("classes", "phase", "TEXT NOT NULL DEFAULT 'open'");
  add("classes", "session_ends", "INTEGER");
  add("classes", "test_length", `INTEGER NOT NULL DEFAULT ${DEFAULT_TEST_LENGTH}`);
  // AB: form A for the pre-test and B for the post-test; BA the other way round (NULL for students from before tests).
  add("students", "test_order", "TEXT");
  db.exec(`
    CREATE TABLE IF NOT EXISTS test_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT NOT NULL UNIQUE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      phase TEXT NOT NULL,
      form TEXT NOT NULL,
      item INTEGER NOT NULL,
      skill TEXT NOT NULL,
      level INTEGER NOT NULL,
      seed INTEGER NOT NULL,
      input TEXT NOT NULL,
      verdict TEXT NOT NULL,
      -- answers sent back for their form before the one that counted
      retries INTEGER NOT NULL,
      ms INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE (student_id, phase, item)
    );
    CREATE TABLE IF NOT EXISTS class_phases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_code TEXT NOT NULL REFERENCES classes(code),
      phase TEXT NOT NULL,
      session_ends INTEGER,
      started_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS class_phases_class ON class_phases(class_code, id);
  `);
  // The browser's verdict, where the server marked the answer differently (NULL when they agree).
  add("test_responses", "client_verdict", "TEXT");
  // 1: arrived more than GRACE after its test ended.
  add("test_responses", "late", "INTEGER NOT NULL DEFAULT 0");
  // A class from before the log gets the history its data shows: open from when it was made, each test from its first
  // stored answer, and its phase now from now on. So an answer still waiting in a browser for a test that ran before
  // this update is kept (late, if its test has since ended), not refused.
  const unlogged = stmt(db, "SELECT code, phase, session_ends AS sessionEnds, created_at AS createdAt FROM classes c WHERE NOT EXISTS (SELECT 1 FROM class_phases p WHERE p.class_code = c.code)")
    .all() as { code: string; phase: Phase; sessionEnds: number | null; createdAt: number }[];
  const firstAnswers = stmt(db, `
    SELECT t.phase, MIN(t.created_at) AS at FROM test_responses t JOIN students s ON s.id = t.student_id WHERE s.class_code = ? GROUP BY t.phase ORDER BY at
  `);
  const now = Date.now();
  if (unlogged.length) transaction(db, () => {
    for (const c of unlogged) {
      logPhase(db, c.code, "open", null, c.createdAt);
      for (const t of firstAnswers.all(c.code) as { phase: TestPhase; at: number }[]) logPhase(db, c.code, t.phase === "pre" ? "pretest" : "posttest", null, t.at);
      logPhase(db, c.code, c.phase, c.sessionEnds, now);
    }
  });
}

/** Records that a class has entered a phase (when it is made, and on every change). */
export const logPhase = (db: DatabaseSync, classCode: string, phase: Phase, sessionEnds: number | null, at: number) =>
  stmt(db, "INSERT INTO class_phases (class_code, phase, session_ends, started_at) VALUES (?, ?, ?, ?)").run(classCode, phase, sessionEnds, at);

export type PhaseWindow = { phase: Phase; start: number; end: number };
/** The class's phases in order, each from its start to the next change (or the end of its session). */
export function phaseWindows(db: DatabaseSync, classCode: string): PhaseWindow[] {
  const rows = stmt(db, "SELECT phase, session_ends AS sessionEnds, started_at AS start FROM class_phases WHERE class_code = ? ORDER BY started_at, id")
    .all(classCode) as { phase: Phase; sessionEnds: number | null; start: number }[];
  return rows.map((r, i) => ({
    phase: r.phase,
    start: r.start,
    end: Math.min(rows[i + 1]?.start ?? Infinity, r.phase === "session" && r.sessionEnds !== null ? r.sessionEnds : Infinity),
  }));
}
/** Whether something arriving at `at` came while the class was in one of these phases, or within GRACE of one ending. */
export const onTime = (windows: readonly PhaseWindow[], phases: readonly Phase[], at: number) =>
  windows.some((w) => phases.includes(w.phase) && w.start <= at && at < w.end + GRACE);
/** The phases class practice happens in (a session only until its time is up). */
export const PRACTICE_PHASES: readonly Phase[] = ["open", "session"];

/** Counterbalancing: within a class and condition, students alternate between taking form A first and form B first. */
export function nextTestOrder(db: DatabaseSync, classCode: string, condition: string): TestOrder {
  const { n } = stmt(db, "SELECT COUNT(*) AS n FROM students WHERE class_code = ? AND condition = ?").get(classCode, condition) as { n: number };
  return n % 2 ? "BA" : "AB";
}
/** A student from before tests existed gets an order from their number. */
export const testOrderOf = (s: { id: number; test_order: string | null }): TestOrder => (s.test_order as TestOrder | null) ?? (s.id % 2 ? "AB" : "BA");

export type ClassProtocol = { phase: Phase; sessionEnds: number | null; testLength: number };
export const classProtocol = (db: DatabaseSync, classCode: string): ClassProtocol =>
  stmt(db, "SELECT phase, session_ends AS sessionEnds, test_length AS testLength FROM classes WHERE code = ?").get(classCode) as ClassProtocol;

export function parseTestLength(value: unknown): number {
  if (value === undefined || value === null) return DEFAULT_TEST_LENGTH;
  if (!Number.isInteger(value) || (value as number) < MIN_TEST_LENGTH || (value as number) > MAX_TEST_LENGTH)
    throw new HttpError(400, `testLength must be a whole number from ${MIN_TEST_LENGTH} to ${MAX_TEST_LENGTH}`);
  return value as number;
}

/** What the student's browser needs about the tests: for each, the form to take and which questions are answered. */
export function studentTests(db: DatabaseSync, student: { id: number; test_order: string | null }) {
  const done = stmt(db, "SELECT phase, item FROM test_responses WHERE student_id = ? ORDER BY item").all(student.id) as { phase: TestPhase; item: number }[];
  const order = testOrderOf(student);
  const of = (phase: TestPhase) => ({ form: formFor(order, phase), answered: done.filter((d) => d.phase === phase).map((d) => d.item) });
  return { pre: of("pre"), post: of("post") };
}

const MAX_BODY = 64 * 1024;

/** POST /api/classes/:code/phase (teacher): { phase, minutes? }; a session needs minutes (1–240) and starts now. */
export async function setPhase(req: IncomingMessage, res: ServerResponse, db: DatabaseSync, classCode: string) {
  const body = await readJson(req, MAX_BODY);
  const phase = body.phase as Phase;
  if (!PHASES.includes(phase)) throw new HttpError(400, `phase must be one of ${PHASES.join(", ")}`);
  let sessionEnds: number | null = null;
  if (phase === "session") {
    const minutes = body.minutes;
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > MAX_SESSION_MINUTES)
      throw new HttpError(400, `minutes must be a whole number from 1 to ${MAX_SESSION_MINUTES}`);
    sessionEnds = Date.now() + minutes * 60_000;
  }
  const result = stmt(db, "UPDATE classes SET phase = ?, session_ends = ? WHERE code = ?").run(phase, sessionEnds, classCode);
  if (!result.changes) return send(res, 404, { error: "no such class" });
  logPhase(db, classCode, phase, sessionEnds, Date.now());
  return send(res, 200, { phase, sessionEnds });
}

/**
 * POST /api/tests: one test answer. Which question it was (skill, level, seed) is worked out here from the class code,
 * the student's form and the question's number, so a client can't answer a question that wasn't on its test; the
 * server marks what was typed itself. A test the class hasn't started yet can't be answered.
 */
export async function recordTestAnswer(
  req: IncomingMessage, res: ServerResponse, db: DatabaseSync, findStudent: (code: unknown) => { id: number; class: string; test_order: string | null } | undefined,
) {
  const body = await readJson(req, MAX_BODY);
  const student = findStudent(body.student);
  if (!student) return send(res, 404, { error: "no such student" });
  const bad = (what: string) => new HttpError(400, `invalid ${what}`);
  const { clientId, phase, item, input, verdict, retries, ms } = body;
  if (typeof clientId !== "string" || !/^[A-Za-z0-9-]{8,64}$/.test(clientId)) throw bad("clientId");
  if (phase !== "pre" && phase !== "post") throw bad("phase");
  const { testLength } = classProtocol(db, student.class);
  if (!Number.isInteger(item) || item < 0 || item >= testLength) throw bad("item");
  if (typeof input !== "string") throw bad("input");
  if (!TEST_VERDICTS.includes(verdict)) throw bad("verdict");
  if (!Number.isInteger(retries) || retries < 0 || retries > 50) throw bad("retries");
  if (!Number.isInteger(ms) || ms < 0 || ms > DAY) throw bad("ms");
  const now = Date.now();
  const windows = phaseWindows(db, student.class);
  const testPhase: Phase = phase === "pre" ? "pretest" : "posttest";
  if (!windows.some((w) => w.phase === testPhase && w.start <= now)) throw new HttpError(400, `the ${phase}-test hasn't started`);
  const late = !onTime(windows, [testPhase], now);
  const { skills } = stmt(db, "SELECT skills FROM classes WHERE code = ?").get(student.class) as { skills: string | null };
  const form = formFor(testOrderOf(student), phase);
  const q = testItems(student.class, skills ? JSON.parse(skills) : CURRICULUM, form, testLength)[item];
  const typed = input.slice(0, 200);
  // A pass stays a pass; anything typed is marked here. A "form" verdict means the browser should have sent it back.
  const marked = verdict === "skipped" ? "skipped" : mark(q, typed);
  // One answer per question: a repeat (a retried upload, or a second try from another tab) keeps the first.
  const result = stmt(db, `
    INSERT OR IGNORE INTO test_responses (client_id, student_id, phase, form, item, skill, level, seed, input, verdict, client_verdict, late, retries, ms, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(clientId, student.id, phase, form, item, q.skill, q.level, q.seed, typed, marked, marked === verdict ? null : verdict, Number(late), retries, ms, now);
  return send(res, result.changes ? 201 : 200, { stored: result.changes === 1 });
}

export type TestScore = { phase: TestPhase; form: string; answered: number; correct: number };
/** Each student's scores: answers given and right, per test. */
export function testScores(db: DatabaseSync, classCode: string) {
  return stmt(db, `
    SELECT t.student_id AS studentId, t.phase, t.form, COUNT(*) AS answered, SUM(t.verdict = 'correct') AS correct
    FROM test_responses t JOIN students s ON s.id = t.student_id WHERE s.class_code = ?
    GROUP BY t.student_id, t.phase
  `).all(classCode) as (TestScore & { studentId: number })[];
}
