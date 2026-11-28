// Who may teach (#687). A teacher is an account with the teacher's role and sees only the classes it made; an admin
// (an account with the admin's role, or one named in ADMIN_EMAILS) sees every class, sets everyone's role and gives a
// class to a teacher. The shared TEACHER_PASSWORD is still taken from scripts (the dry run, the restore check, the
// API in the docs) and counts as an admin; the teacher's page no longer asks for it. With neither TEACHER_PASSWORD nor
// ADMIN_EMAILS set, the server is open, as a home install always was: anyone is an admin.
import { timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { DatabaseSync } from "node:sqlite";
import { accountOf, ADMIN_EMAILS, ROLES, roleOf, type Account, type Role } from "./accounts.ts";
import { normalizeCode } from "./codes.ts";
import { stmt } from "./db.ts";
import { HttpError, readJson, send } from "./http.ts";
import { clientOf, passwords } from "./limiter.ts";

const TEACHER_PASSWORD = process.env.TEACHER_PASSWORD ?? "";
/** No teacher password and no admin named: a home install, where anyone is an admin. */
export const OPEN = !TEACHER_PASSWORD && ADMIN_EMAILS.size === 0;

/** A teacher or an admin. accountId: whose account, or null for a script with the teacher password (or an open server). */
export type Staff = { admin: true; accountId: number | null } | { admin: false; accountId: number };

export function initRoles(db: DatabaseSync) {
  // The teacher whose class it is; NULL for a class made before roles (or by a script): only admins see it then.
  if (!(stmt(db, "PRAGMA table_info(classes)").all() as { name: string }[]).some((c) => c.name === "owner_id"))
    db.exec("ALTER TABLE classes ADD COLUMN owner_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL");
}

/** The teacher password a script sends: right, or 403 (429 after too many wrong ones from one address). */
function teacherPassword(req: IncomingMessage) {
  // A server with no password takes any header only while it is open; with admins named, the header gets nobody in.
  if (!TEACHER_PASSWORD) {
    if (OPEN) return;
    throw new HttpError(403, "this server takes no teacher password: sign in with a teacher's account");
  }
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

/** What an account's own role lets it do: teach, run everything, or neither (null). */
export const accountStaff = (account: Account): Staff | null =>
  account.role === "admin" ? { admin: true, accountId: account.id } : account.role === "teacher" ? { admin: false, accountId: account.id } : null;

/**
 * The teacher or admin making this request, or null for anyone else. A wrong teacher password is an error, not null.
 * On an open server everyone is an admin here (classes, exports); boards go by the account's own role (boardUser).
 */
export function staffOf(req: IncomingMessage, db: DatabaseSync): Staff | null {
  if (req.headers["x-teacher-password"] !== undefined) {
    teacherPassword(req);
    return { admin: true, accountId: null };
  }
  const account = accountOf(req, db);
  const who = account && accountStaff(account);
  if (who) return who;
  return OPEN ? { admin: true, accountId: account?.id ?? null } : null;
}

/** Lets a teacher or an admin through, or answers 403. */
export function staff(req: IncomingMessage, db: DatabaseSync): Staff {
  const who = staffOf(req, db);
  if (!who) throw new HttpError(403, "a teacher's account is needed");
  return who;
}

/** Lets an admin through, or answers 403. */
export function admin(req: IncomingMessage, db: DatabaseSync): Staff {
  const who = staff(req, db);
  if (!who.admin) throw new HttpError(403, "an admin's account is needed");
  return who;
}

/** A class this teacher may follow and change: any class for an admin, their own for a teacher; 404 otherwise, as if it weren't there. */
export function classFor(db: DatabaseSync, who: Staff, code: string): string {
  const row = stmt(db, "SELECT owner_id AS owner FROM classes WHERE code = ?").get(code) as { owner: number | null } | undefined;
  if (!row || (!who.admin && row.owner !== who.accountId)) throw new HttpError(404, "no such class");
  return code;
}

/** Whether this teacher may read a student's boards: an admin anyone's, a teacher those of the students in their classes. */
export const seesStudent = (db: DatabaseSync, who: Staff, studentId: number) =>
  who.admin || !!stmt(db, "SELECT 1 FROM students s JOIN classes c ON c.code = s.class_code WHERE s.id = ? AND c.owner_id = ?").get(studentId, who.accountId);

/** An SQL condition on classes `c` for the classes this teacher sees, and its value: every class for an admin. */
export const ownClasses = (who: Staff): [string, number] => (who.admin ? ["1 = ?", 1] : ["c.owner_id = ?", who.accountId]);

const MAX_PEOPLE = 1000;

/**
 * /api/people, an admin's: GET lists the accounts (with their roles and whether ADMIN_EMAILS fixes them as admins)
 * and the classes with their teachers, students who asked to teach first (#873); POST /api/people/<id> { role } sets an
 * account's role, which answers that ask.
 */
export async function handlePeople(req: IncomingMessage, res: ServerResponse, id: string | undefined, db: DatabaseSync) {
  const me = admin(req, db);
  if (id === undefined && req.method === "GET") {
    const accounts = (stmt(db, `
      SELECT a.id, a.email, a.name, a.verified_at AS verifiedAt, a.role, a.wants_teach AS wantsTeach, (SELECT COUNT(*) FROM classes c WHERE c.owner_id = a.id) AS classes
      FROM accounts a ORDER BY a.wants_teach IS NULL, a.role = 'student', a.name COLLATE NOCASE, a.email LIMIT ?
    `).all(MAX_PEOPLE) as { id: number; email: string; name: string; verifiedAt: number | null; role: Role; wantsTeach: number | null; classes: number }[])
      .map((a) => {
        const role = roleOf(a.email, a.verifiedAt !== null, a.role);
        return { id: a.id, email: a.email, name: a.name, verified: a.verifiedAt !== null, role, wantsTeach: role === "student" && a.wantsTeach !== null, fixed: ADMIN_EMAILS.has(a.email), classes: a.classes };
      });
    const classes = stmt(db, "SELECT code, name, owner_id AS owner FROM classes ORDER BY created_at").all();
    return send(res, 200, { accounts, classes, me: me.accountId });
  }
  if (id !== undefined && req.method === "POST") {
    const body = await readJson(req, 1024);
    if (!ROLES.includes(body.role as Role)) throw new HttpError(400, `role must be one of ${ROLES.join(", ")}`);
    const target = Number(id);
    // An admin can't take their own role away: there would be no one to give it back.
    if (target === me.accountId && body.role !== "admin") throw new HttpError(409, "an admin can't take away their own role");
    const done = stmt(db, "UPDATE accounts SET role = ?, wants_teach = NULL WHERE id = ?").run(body.role as Role, Number.isSafeInteger(target) ? target : -1);
    return done.changes ? send(res, 200, { role: body.role }) : send(res, 404, { error: "no such account" });
  }
  return send(res, 405, { error: "method not allowed" });
}

/** POST /api/classes/<code>/owner { owner: account id | null }, an admin's: gives the class to a teacher (or to nobody). */
export async function setOwner(req: IncomingMessage, res: ServerResponse, db: DatabaseSync, code: string) {
  admin(req, db);
  const body = await readJson(req, 1024);
  const owner = body.owner;
  if (owner !== null && !Number.isSafeInteger(owner)) throw new HttpError(400, "owner must be an account id or null");
  if (owner !== null) {
    const row = stmt(db, "SELECT email, verified_at AS verifiedAt, role FROM accounts WHERE id = ?").get(owner) as { email: string; verifiedAt: number | null; role: Role } | undefined;
    if (!row) throw new HttpError(404, "no such account");
    if (roleOf(row.email, row.verifiedAt !== null, row.role) === "student") throw new HttpError(409, "a class goes to a teacher or an admin");
  }
  const done = stmt(db, "UPDATE classes SET owner_id = ? WHERE code = ?").run(owner as number | null, normalizeCode(code));
  return done.changes ? send(res, 200, { owner }) : send(res, 404, { error: "no such class" });
}
