// Homework made for each student (issue #297): the teacher makes it for the whole class, each student's from their own
// records (src/homework.ts), and the student answers it in class practice, as attempts with policy "homework" that the
// learner model learns from like any other.
//
// Homework is extra practice, so it waits for the study: a class gets it only once its delayed post-test has been
// given (the class has been in the "delayed" phase and has moved on), and never while a test is running. Before that
// the server refuses to make it, and the plan carries none.
import type { IncomingMessage, ServerResponse } from "node:http";
import type { DatabaseSync } from "node:sqlite";
import type { SkillId } from "../src/math/practiceSkills.ts";
import { CURRICULUM } from "../src/model/curriculum.ts";
import { HOMEWORK_LENGTH, homeworkIndex, MAX_HOMEWORK, MIN_HOMEWORK, type Homework, type HomeworkItem } from "../src/model/homework.ts";
import { newcomerChance } from "../src/model/logistic.ts";
import { stmt, transaction } from "./db.ts";
import { HttpError, readJson, send } from "./http.ts";
import { homeworkFor } from "./marking.ts";
import { classProtocol, phaseWindows, type Phase } from "./protocol.ts";
import { currentEma, currentIdeas, currentModel, currentSpacing } from "./research.ts";

export function initHomework(db: DatabaseSync) {
  db.exec(`
    -- one row each time the teacher makes homework for a student; the newest is the student's homework now
    CREATE TABLE IF NOT EXISTS homework (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      -- the questions, in order (JSON array of { skill, level, seed, why, idea? })
      items TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS homework_student ON homework(student_id, id);
  `);
}

/** The phases a test runs in: no homework then. */
const TESTS: readonly Phase[] = ["pretest", "posttest", "delayed"];
/** Whether the class may have homework: it has given its delayed post-test, and no test is running now. */
export function homeworkOpen(db: DatabaseSync, classCode: string): boolean {
  return !TESTS.includes(classProtocol(db, classCode).phase) && phaseWindows(db, classCode).some((w) => w.phase === "delayed");
}

type Stored = { id: number; items: HomeworkItem[]; createdAt: number };
/** The student's newest homework, or null when they have none. */
function latest(db: DatabaseSync, studentId: number): Stored | null {
  const row = stmt(db, "SELECT id, items, created_at AS createdAt FROM homework WHERE student_id = ? ORDER BY id DESC LIMIT 1").get(studentId) as
    { id: number; items: string; createdAt: number } | undefined;
  return row ? { ...row, items: JSON.parse(row.items) } : null;
}
type Answered = { skill: string; level: number; seed: number; outcome: string; first_correct: number };
const homeworkAnswers = (db: DatabaseSync, studentId: number) =>
  stmt(db, "SELECT skill, level, seed, outcome, first_correct FROM attempts WHERE student_id = ? AND policy = 'homework' ORDER BY id").all(studentId) as Answered[];
/** For each question of the homework, its first answer (null: not answered yet). */
const answersOf = (items: readonly HomeworkItem[], answers: readonly Answered[]) =>
  items.map((it) => answers.find((a) => a.skill === it.skill && a.level === it.level && a.seed === it.seed) ?? null);

/** The student's homework for their plan (null when the class has none open, or they have none). */
export function studentHomework(db: DatabaseSync, student: { id: number; class: string }): Homework | null {
  if (!homeworkOpen(db, student.class)) return null;
  const h = latest(db, student.id);
  if (!h) return null;
  const answers = answersOf(h.items, homeworkAnswers(db, student.id));
  return { ...h, done: answers.flatMap((a, i) => (a ? [i] : [])) };
}

/** Whether a question is one of the student's homework questions, now or before (an answer kept offline arrives late). */
export function isHomework(db: DatabaseSync, studentId: number, q: { skill: string; level: number; seed: number }): boolean {
  const rows = stmt(db, "SELECT items FROM homework WHERE student_id = ?").all(studentId) as { items: string }[];
  return rows.some((r) => homeworkIndex({ items: JSON.parse(r.items) }, q) >= 0);
}

export function parseHomeworkLength(value: unknown): number {
  if (value === undefined || value === null) return HOMEWORK_LENGTH;
  if (!Number.isInteger(value) || (value as number) < MIN_HOMEWORK || (value as number) > MAX_HOMEWORK)
    throw new HttpError(400, `length must be a whole number from ${MIN_HOMEWORK} to ${MAX_HOMEWORK}`);
  return value as number;
}

/**
 * POST /api/classes/:code/homework (teacher): { length? } — new homework for every student in the class, each made
 * from their own records, replacing what they had. Refused (409) until the class has given its delayed post-test.
 */
export async function makeHomework(req: IncomingMessage, res: ServerResponse, db: DatabaseSync, classCode: string) {
  const body = await readJson(req, 4096);
  const length = parseHomeworkLength(body.length);
  const klass = stmt(db, "SELECT skills FROM classes WHERE code = ?").get(classCode) as { skills: string | null } | undefined;
  if (!klass) return send(res, 404, { error: "no such class" });
  if (!homeworkOpen(db, classCode)) throw new HttpError(409, "homework opens once the class has taken its delayed post-test");
  const skills: SkillId[] = klass.skills ? JSON.parse(klass.skills) : [...CURRICULUM];
  const students = stmt(db, "SELECT id FROM students WHERE class_code = ? ORDER BY id").all(classCode) as { id: number }[];
  const model = currentModel(db);
  const unlockFloor = newcomerChance(model);
  const now = Date.now();
  const made = students.map((s) => ({
    id: s.id,
    items: homeworkFor({ model, student: `s${s.id}`, skills, ideas: currentIdeas(db, s.id), ema: currentEma(db, s.id), spacing: currentSpacing(db, s.id), now, unlockFloor }, length),
  }));
  transaction(db, () => {
    const insert = stmt(db, "INSERT INTO homework (student_id, items, created_at) VALUES (?, ?, ?)");
    for (const m of made) insert.run(m.id, JSON.stringify(m.items), now);
  });
  return send(res, 201, { students: made.length, length, createdAt: now });
}

/** A homework question as the teacher sees it: the question, why it was chosen, and how the student did (null: not yet). */
export type HomeworkResult = HomeworkItem & { outcome: string | null; firstCorrect: boolean | null };
/** The class's homework for the teacher: whether it is open, and each student's newest homework with how they did. */
export function homeworkOverview(db: DatabaseSync, classCode: string, students: readonly { id: number }[]) {
  return {
    open: homeworkOpen(db, classCode),
    rows: students.flatMap((s) => {
      const h = latest(db, s.id);
      if (!h) return [];
      const answers = answersOf(h.items, homeworkAnswers(db, s.id));
      const items: HomeworkResult[] = h.items.map((it, i) => ({ ...it, outcome: answers[i]?.outcome ?? null, firstCorrect: answers[i] ? answers[i].first_correct === 1 : null }));
      return [{ student: `s${s.id}`, createdAt: h.createdAt, items }];
    }),
  };
}
