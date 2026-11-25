// Payments for lessons (#757): the class's lesson price, the register of lessons held and who came, and the payments
// the teacher records. The sums are src/model/payments.ts; here they are stored and checked. Only the class's teacher
// (or an admin) reads or changes them; a student reads only their own line. No money passes through Zeno.
import type { IncomingMessage, ServerResponse } from "node:http";
import type { DatabaseSync } from "node:sqlite";
import { CURRENCY, isAmount, isDay, payLine, type Payment, type PayLine, type RegisterLesson } from "../src/model/payments.ts";
import { stmt, transaction } from "./db.ts";
import { HttpError, readJson, send } from "./http.ts";

const MAX_NOTE = 200;
const DEFAULT_CURRENCY = "GEL";

export function initPayments(db: DatabaseSync) {
  const cols = (stmt(db, "PRAGMA table_info(classes)").all() as { name: string }[]).map((c) => c.name);
  // The price of one lesson in minor units (NULL: not set yet), and the currency it is in.
  if (!cols.includes("lesson_price")) db.exec("ALTER TABLE classes ADD COLUMN lesson_price INTEGER");
  if (!cols.includes("currency")) db.exec("ALTER TABLE classes ADD COLUMN currency TEXT");
  db.exec(`
    -- a lesson the class held: its date and its price as it was when entered
    CREATE TABLE IF NOT EXISTS register_lessons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_code TEXT NOT NULL REFERENCES classes(code),
      day TEXT NOT NULL,
      price INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS register_lessons_class ON register_lessons(class_code, day);
    -- who came to it
    CREATE TABLE IF NOT EXISTS register_present (
      lesson_id INTEGER NOT NULL REFERENCES register_lessons(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      PRIMARY KEY (lesson_id, student_id)
    );
    CREATE INDEX IF NOT EXISTS register_present_student ON register_present(student_id);
    -- a payment a student made, as the teacher recorded it (minor units)
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL,
      day TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS payments_student ON payments(student_id, day);
  `);
}

/** A class going: its register goes with it (a class can only be deleted while nobody has joined it). */
export function forgetRegister(db: DatabaseSync, classCode: string) {
  stmt(db, "DELETE FROM register_lessons WHERE class_code = ?").run(classCode);
}

type Pricing = { price: number | null; currency: string };
const pricing = (db: DatabaseSync, classCode: string): Pricing | undefined => {
  const row = stmt(db, "SELECT lesson_price AS price, currency FROM classes WHERE code = ?").get(classCode) as
    { price: number | null; currency: string | null } | undefined;
  return row && { price: row.price, currency: row.currency ?? DEFAULT_CURRENCY };
};

function lessonsOf(db: DatabaseSync, classCode: string): RegisterLesson[] {
  const rows = stmt(db, `
    SELECT l.id, l.day, l.price, group_concat(p.student_id) AS present FROM register_lessons l
    LEFT JOIN register_present p ON p.lesson_id = l.id WHERE l.class_code = ? GROUP BY l.id ORDER BY l.day, l.id
  `).all(classCode) as { id: number; day: string; price: number; present: string | null }[];
  return rows.map((r) => ({ id: r.id, day: r.day, price: r.price, present: r.present ? r.present.split(",").map((id) => `s${id}`) : [] }));
}

function paymentsOf(db: DatabaseSync, classCode: string): Payment[] {
  const rows = stmt(db, `
    SELECT p.id, p.student_id AS student, p.amount, p.day, p.note FROM payments p JOIN students s ON s.id = p.student_id
    WHERE s.class_code = ? ORDER BY p.day, p.id
  `).all(classCode) as { id: number; student: number; amount: number; day: string; note: string }[];
  return rows.map((r) => ({ ...r, student: `s${r.student}` }));
}

/** GET /api/classes/:code/payments (teacher): the price, every lesson in the register and every payment. */
export function classPayments(res: ServerResponse, db: DatabaseSync, classCode: string) {
  const p = pricing(db, classCode);
  if (!p) return send(res, 404, { error: "no such class" });
  return send(res, 200, { ...p, lessons: lessonsOf(db, classCode), payments: paymentsOf(db, classCode) });
}

/** The class's students named as the dashboard names them ("s12"), mapped to their ids. */
const studentIds = (db: DatabaseSync, classCode: string) =>
  new Map((stmt(db, "SELECT id FROM students WHERE class_code = ?").all(classCode) as { id: number }[]).map((r) => [`s${r.id}`, r.id]));

const studentOf = (db: DatabaseSync, classCode: string, v: unknown): number => {
  const id = typeof v === "string" ? studentIds(db, classCode).get(v) : undefined;
  if (id === undefined) throw new HttpError(400, "student must be one of the class's students (\"s12\")");
  return id;
};

/** POST /api/classes/:code/price (teacher): { price, currency? } — the price of one lesson in minor units. */
export async function setPrice(req: IncomingMessage, res: ServerResponse, db: DatabaseSync, classCode: string) {
  const body = await readJson(req, 1024);
  if (!isAmount(body.price)) throw new HttpError(400, "price must be a whole number of minor units (tetri, cents), 0 or more");
  if (body.currency !== undefined && (typeof body.currency !== "string" || !CURRENCY.test(body.currency)))
    throw new HttpError(400, "currency must be a three-letter code such as GEL");
  const old = pricing(db, classCode);
  if (!old) return send(res, 404, { error: "no such class" });
  const currency = (body.currency as string | undefined) ?? old.currency;
  stmt(db, "UPDATE classes SET lesson_price = ?, currency = ? WHERE code = ?").run(body.price, currency, classCode);
  return send(res, 200, { price: body.price, currency });
}

/**
 * POST /api/classes/:code/register (teacher): { id?, day, present } adds a lesson (201, at the class's price) or, with
 * an id, changes its date and who came; { id, remove: true } takes it out of the register (204).
 */
export async function setRegister(req: IncomingMessage, res: ServerResponse, db: DatabaseSync, classCode: string) {
  const body = await readJson(req, 16384);
  const own = (id: unknown) =>
    Number.isInteger(id) && !!stmt(db, "SELECT 1 FROM register_lessons WHERE id = ? AND class_code = ?").get(id as number, classCode);
  if (body.remove === true) {
    if (!own(body.id)) return send(res, 404, { error: "no such lesson" });
    stmt(db, "DELETE FROM register_lessons WHERE id = ?").run(body.id as number);
    return send(res, 204);
  }
  if (!isDay(body.day)) throw new HttpError(400, "day must be a date, YYYY-MM-DD");
  if (!Array.isArray(body.present) || body.present.length > 1000) throw new HttpError(400, "present must be a list of the class's students");
  const ids = studentIds(db, classCode);
  const present = [...new Set(body.present as unknown[])].map((s) => {
    const id = typeof s === "string" ? ids.get(s) : undefined;
    if (id === undefined) throw new HttpError(400, "present must be a list of the class's students (\"s12\")");
    return id;
  });
  if (body.id !== undefined && !own(body.id)) return send(res, 404, { error: "no such lesson" });
  const p = pricing(db, classCode)!;
  if (body.id === undefined && p.price === null) return send(res, 409, { error: "set the lesson price first" });
  const id = transaction(db, () => {
    let lesson = body.id as number | undefined;
    if (lesson === undefined) {
      lesson = Number(stmt(db, "INSERT INTO register_lessons (class_code, day, price, created_at) VALUES (?, ?, ?, ?)")
        .run(classCode, body.day, p.price, Date.now()).lastInsertRowid);
    } else {
      stmt(db, "UPDATE register_lessons SET day = ? WHERE id = ?").run(body.day, lesson);
      stmt(db, "DELETE FROM register_present WHERE lesson_id = ?").run(lesson);
    }
    for (const s of present) stmt(db, "INSERT INTO register_present (lesson_id, student_id) VALUES (?, ?)").run(lesson, s);
    return lesson;
  });
  const lesson = lessonsOf(db, classCode).find((l) => l.id === id);
  return send(res, body.id === undefined ? 201 : 200, lesson);
}

/**
 * POST /api/classes/:code/payments (teacher): { student, amount, day, note? } records a payment (201);
 * { id, remove: true } takes one out, entered by mistake (204).
 */
export async function setPayment(req: IncomingMessage, res: ServerResponse, db: DatabaseSync, classCode: string) {
  const body = await readJson(req, 2048);
  if (body.remove === true) {
    const gone = Number.isInteger(body.id) &&
      stmt(db, "DELETE FROM payments WHERE id = ? AND student_id IN (SELECT id FROM students WHERE class_code = ?)").run(body.id as number, classCode).changes;
    return gone ? send(res, 204) : send(res, 404, { error: "no such payment" });
  }
  const student = studentOf(db, classCode, body.student);
  if (!isAmount(body.amount) || body.amount === 0) throw new HttpError(400, "amount must be a whole number of minor units (tetri, cents), more than 0");
  if (!isDay(body.day)) throw new HttpError(400, "day must be a date, YYYY-MM-DD");
  if (body.note !== undefined && typeof body.note !== "string") throw new HttpError(400, "note must be text");
  const note = String(body.note ?? "").trim().slice(0, MAX_NOTE);
  const id = Number(stmt(db, "INSERT INTO payments (student_id, amount, day, note, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(student, body.amount, body.day, note, Date.now()).lastInsertRowid);
  const payment: Payment = { id, student: `s${student}`, amount: body.amount, day: body.day, note };
  return send(res, 201, payment);
}

/**
 * What a student sees of their own payments (GET /api/students/:code): the currency and their line over all months,
 * with the date of their last payment; null while their class keeps no register and they have no payments.
 */
export function studentPay(db: DatabaseSync, student: { id: number; class: string }): (PayLine & { currency: string; lastPaid: string | null }) | null {
  const lessons = lessonsOf(db, student.class);
  const payments = (stmt(db, "SELECT id, amount, day, note FROM payments WHERE student_id = ? ORDER BY day, id").all(student.id) as
    Omit<Payment, "student">[]).map((p) => ({ ...p, student: `s${student.id}` }));
  if (!lessons.length && !payments.length) return null;
  return { ...payLine(`s${student.id}`, lessons, payments), currency: pricing(db, student.class)!.currency, lastPaid: payments.at(-1)?.day ?? null };
}
