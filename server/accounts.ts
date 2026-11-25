// Accounts (issue #605): an email, a name and a password, for anyone past the site password, in a class or not. An
// account is who someone is on any device: sign in, and the server knows whose records to bring.
//
// The password is stored as an scrypt hash with its own salt. Signing in starts a session: a random token the browser
// keeps in a cookie scripts can't read (HttpOnly) and other sites can't send (SameSite=Lax); the database holds only
// the token's SHA-256, so a copy of the database signs nobody in. The links mailed for confirming an email and for a
// new password carry tokens kept the same way, each good once and for a limited time.
//
// Wrong passwords are counted per client and per email, sign-ups and mails per client, and mails per address, so
// guessing a password, filling the database and using the server to send mail at someone all run into a wait (429).
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { DatabaseSync } from "node:sqlite";
import { stmt, transaction } from "./db.ts";
import { HttpError, readJson, send } from "./http.ts";
import { clientOf, FailureLimiter } from "./limiter.ts";
import { normalizeCode } from "./codes.ts";
import { follows, KEYS_MAX, mergeState, VALUE_MAX } from "../src/model/accountState.ts";
import { mailSettings, sendMail } from "./mail.ts";
import { mailLang, mailWords, type MailLang } from "./mailWords.ts";

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
/** A session lasts a year, about as long as browsers keep a cookie. */
const SESSION_MS = 365 * DAY;
const TOKEN_MS = { reset: 60 * MINUTE, verify: 7 * DAY } as const;
export type TokenKind = keyof typeof TOKEN_MS;
export const SESSION_COOKIE = "zeno_session";
export const MIN_PASSWORD = 8;
const MAX_PASSWORD = 200;
const MAX_NAME = 60;
const MAX_BODY = 16 * 1024;
/** A browser's progress in one request: every key at once the first time it signs in. */
const MAX_STATE_BODY = 4 * 1024 * 1024;
const MAIL = mailSettings();

/**
 * What an account may do (#687): a student practises, a teacher also makes classes and follows their own, an admin
 * does that for every class and sets everyone's role. New accounts are students.
 */
export const ROLES = ["student", "teacher", "admin"] as const;
export type Role = (typeof ROLES)[number];
/** The admins the server is started with (ADMIN_EMAILS, comma-separated): how the first admin comes to be. */
export const ADMIN_EMAILS: ReadonlySet<string> = new Set(
  (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean),
);
/**
 * The role an account has now: an address in ADMIN_EMAILS is an admin's, any other has the role stored for it. While
 * the server sends mail, an address not yet confirmed has a student's role only, so nobody gets a teacher's or an
 * admin's role by signing up first with their address. A server without mail can't confirm one, so there it counts.
 */
export function roleOf(email: string, verified: boolean, stored: Role): Role {
  if (MAIL && !verified) return "student";
  return ADMIN_EMAILS.has(email) ? "admin" : stored;
}

/** role: the one the account has now (roleOf), not only the one stored. */
export type Account = { id: number; email: string; name: string; verified: boolean; role: Role };
/** An account as its owner's browser sees it. */
const shown = (a: Account) => ({ email: a.email, name: a.name, verified: a.verified, role: a.role });

export function initAccounts(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      -- lower case, so one address is one account however it is typed
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      -- scrypt$N$salt$key
      password TEXT NOT NULL,
      -- when the address was confirmed from its mail (NULL: not yet)
      verified_at INTEGER,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      -- the SHA-256 of the cookie's token
      token TEXT PRIMARY KEY,
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      seen_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_account ON sessions(account_id);
    -- the links mailed out: kind is reset or verify; the token is stored as its SHA-256
    CREATE TABLE IF NOT EXISTS account_tokens (
      token TEXT PRIMARY KEY,
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS account_tokens_account ON account_tokens(account_id, kind);
    -- the learner's progress as their browsers keep it (#607): one row for each localStorage key that follows the
    -- account (src/model/accountState.ts); rev is the account's revision when the row was last written
    CREATE TABLE IF NOT EXISTS account_state (
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      rev INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (account_id, key)
    );
    CREATE INDEX IF NOT EXISTS account_state_rev ON account_state(account_id, rev);
  `);
  // The role stored for the account (#687; roleOf says what it is now). Databases made before it get the column here.
  if (!(stmt(db, "PRAGMA table_info(accounts)").all() as { name: string }[]).some((c) => c.name === "role"))
    db.exec("ALTER TABLE accounts ADD COLUMN role TEXT NOT NULL DEFAULT 'student'");
  const now = Date.now();
  stmt(db, "DELETE FROM sessions WHERE expires_at <= ?").run(now);
  stmt(db, "DELETE FROM account_tokens WHERE expires_at <= ?").run(now);
  if (!MAIL && process.env.SMTP_HOST) console.warn("SMTP_HOST is set, but mail also needs MAIL_FROM and PUBLIC_URL (http… or https…): no mail will be sent.");
}

// ---------- passwords ----------

/** scrypt's cost; stored with each hash, so raising it later leaves the old hashes readable. */
const COST = 16384;
const derive = (password: string, salt: Buffer, cost: number) =>
  new Promise<Buffer>((ok, fail) =>
    // NFKC: the same password typed on two keyboards (composed or not) is the same bytes.
    scrypt(password.normalize("NFKC"), salt, 64, { N: cost, r: 8, p: 1 }, (err, key) => (err ? fail(err) : ok(key))));

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  return `scrypt$${COST}$${salt.toString("base64url")}$${(await derive(password, salt, COST)).toString("base64url")}`;
}
export async function passwordMatches(password: string, stored: string): Promise<boolean> {
  const [kind, cost, salt, key] = stored.split("$");
  if (kind !== "scrypt" || !key || password.length > MAX_PASSWORD) return false;
  const want = Buffer.from(key, "base64url");
  const got = await derive(password, Buffer.from(salt, "base64url"), Number(cost));
  return got.length === want.length && timingSafeEqual(got, want);
}
/** Checked when nobody has the email, so "no such account" takes as long to answer as "wrong password". */
let nobody: Promise<string> | undefined;
const nobodysHash = () => (nobody ??= hashPassword(randomBytes(16).toString("hex")));

// ---------- what a request may send ----------

export function parseEmail(value: unknown): string {
  const email = String(value ?? "").trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@<>"',;:\\]+@[^\s@<>"',;:\\]+\.[^\s@<>"',;:\\]+$/.test(email)) throw new HttpError(400, "email must be an email address");
  return email;
}
export function parseName(value: unknown): string {
  // eslint-disable-next-line no-control-regex
  const name = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (!name || name.length > MAX_NAME) throw new HttpError(400, `name must be 1 to ${MAX_NAME} characters`);
  return name;
}
export function parsePassword(value: unknown): string {
  if (typeof value !== "string" || value.length < MIN_PASSWORD || value.length > MAX_PASSWORD)
    throw new HttpError(400, `password must be ${MIN_PASSWORD} to ${MAX_PASSWORD} characters`);
  return value;
}

// ---------- sessions ----------

const sha = (token: string) => createHash("sha256").update(token).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");

function cookieOf(req: IncomingMessage, name: string): string | null {
  for (const part of String(req.headers.cookie ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}
/** Over HTTPS (here, or at the reverse proxy in front) the cookie is marked Secure: never sent over plain HTTP. */
const isHttps = (req: IncomingMessage) =>
  (req.socket as { encrypted?: boolean }).encrypted === true || String(req.headers["x-forwarded-proto"] ?? "").split(",")[0].trim() === "https";
const setCookie = (req: IncomingMessage, res: ServerResponse, token: string, seconds: number) =>
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${isHttps(req) ? "; Secure" : ""}`);

function startSession(db: DatabaseSync, req: IncomingMessage, res: ServerResponse, accountId: number, now = Date.now()) {
  const token = newToken();
  stmt(db, "INSERT INTO sessions (token, account_id, created_at, seen_at, expires_at) VALUES (?, ?, ?, ?, ?)").run(sha(token), accountId, now, now, now + SESSION_MS);
  setCookie(req, res, token, SESSION_MS / 1000);
}

type AccountRow = { id: number; email: string; name: string; verifiedAt: number | null; role: Role };
const toAccount = (r: AccountRow): Account => {
  const verified = r.verifiedAt !== null;
  return { id: r.id, email: r.email, name: r.name, verified, role: roleOf(r.email, verified, r.role) };
};
const accountById = (db: DatabaseSync, id: number) =>
  toAccount(stmt(db, "SELECT id, email, name, verified_at AS verifiedAt, role FROM accounts WHERE id = ?").get(id) as AccountRow);

/** The request's session, when its cookie names one that hasn't run out: whose it is, and the session's stored key. */
function sessionOf(req: IncomingMessage, db: DatabaseSync, now = Date.now()): { account: Account; key: string } | null {
  const token = cookieOf(req, SESSION_COOKIE);
  if (!token) return null;
  const key = sha(token);
  const row = stmt(db, `
    SELECT a.id, a.email, a.name, a.verified_at AS verifiedAt, a.role, s.seen_at AS seenAt
    FROM sessions s JOIN accounts a ON a.id = s.account_id WHERE s.token = ? AND s.expires_at > ?
  `).get(key, now) as (AccountRow & { seenAt: number }) | undefined;
  if (!row) return null;
  // When the session was last used, to the day: enough to tell a live one from a forgotten one.
  if (now - row.seenAt > DAY) stmt(db, "UPDATE sessions SET seen_at = ? WHERE token = ?").run(now, key);
  return { account: toAccount(row), key };
}
/** Who is signed in on this request, or null. */
export const accountOf = (req: IncomingMessage, db: DatabaseSync): Account | null => sessionOf(req, db)?.account ?? null;
function signedIn(req: IncomingMessage, db: DatabaseSync) {
  const session = sessionOf(req, db);
  if (!session) throw new HttpError(401, "not signed in");
  return session;
}

// ---------- the account's class record ----------

/** A student as the browser keeps one (Student in src/learner.ts). */
type StudentRow = { code: string; class: string; condition: string; feature: string; arm: string };
/**
 * The class record the account practises under (#606): the one it joined last. The students table is the class
 * study's (research.ts), which gives each row its account; null for an account in no class.
 */
export const studentOf = (db: DatabaseSync, accountId: number): StudentRow | null =>
  (stmt(db, `
    SELECT s.code, s.class_code AS class, s.condition, c.feature, s.arm FROM students s JOIN classes c ON c.code = s.class_code
    WHERE s.account_id = ? ORDER BY s.created_at DESC, s.id DESC LIMIT 1
  `).get(accountId) as StudentRow | undefined) ?? null;

// ---------- progress that follows the account ----------

type State = { rev: number; items: Record<string, string> };
const revOf = (db: DatabaseSync, accountId: number) =>
  (stmt(db, "SELECT COALESCE(MAX(rev), 0) AS rev FROM account_state WHERE account_id = ?").get(accountId) as { rev: number }).rev;
const changedSince = (db: DatabaseSync, accountId: number, since: number) =>
  stmt(db, "SELECT key, value FROM account_state WHERE account_id = ? AND rev > ?").all(accountId, since) as { key: string; value: string }[];
/** A revision a browser sent: a whole number, 0 for a browser that has seen nothing (or sends nonsense). */
const parseRev = (v: unknown) => (Number.isSafeInteger(Number(v)) && Number(v) > 0 ? Number(v) : 0);

/** What changed for the account since the revision a browser last saw. */
function stateSince(db: DatabaseSync, accountId: number, since: number): State {
  return { rev: revOf(db, accountId), items: Object.fromEntries(changedSince(db, accountId, since).map((r) => [r.key, r.value])) };
}

/**
 * Takes the keys a browser sends and gives back what it lacks. Each key sent is merged with the copy kept
 * (mergeState), unless the browser says to replace it (a learner who reset their progress means it). The answer holds
 * every key that changed elsewhere since `since`, and every key sent whose merged value isn't the one sent.
 */
function putState(db: DatabaseSync, accountId: number, since: number, items: Record<string, string>, replace: ReadonlySet<string>, now: number): State {
  return transaction(db, () => {
    const last = revOf(db, accountId);
    let rev = last;
    const back: Record<string, string> = {};
    for (const [key, sent] of Object.entries(items)) {
      const kept = stmt(db, "SELECT value FROM account_state WHERE account_id = ? AND key = ?").get(accountId, key) as { value: string } | undefined;
      const value = kept && !replace.has(key) ? mergeState(key, kept.value, sent) : sent;
      if (!kept || value !== kept.value) {
        rev = last + 1;
        stmt(db, `
          INSERT INTO account_state (account_id, key, value, rev, updated_at) VALUES (?, ?, ?, ?, ?)
          ON CONFLICT (account_id, key) DO UPDATE SET value = excluded.value, rev = excluded.rev, updated_at = excluded.updated_at
        `).run(accountId, key, value, rev, now);
      }
      if (value !== sent) back[key] = value;
    }
    const { n } = stmt(db, "SELECT COUNT(*) AS n FROM account_state WHERE account_id = ?").get(accountId) as { n: number };
    if (n > KEYS_MAX) throw new HttpError(413, `an account keeps at most ${KEYS_MAX} keys`);
    for (const r of changedSince(db, accountId, since)) if (!(r.key in items)) back[r.key] = r.value;
    return { rev, items: back };
  });
}

// ---------- mailed links ----------

/** A fresh link token for the account; an earlier one of the same kind stops working. Returns the token to mail. */
export function makeToken(db: DatabaseSync, accountId: number, kind: TokenKind, now = Date.now()): string {
  const token = newToken();
  transaction(db, () => {
    stmt(db, "DELETE FROM account_tokens WHERE account_id = ? AND kind = ?").run(accountId, kind);
    stmt(db, "INSERT INTO account_tokens (token, account_id, kind, expires_at) VALUES (?, ?, ?, ?)").run(sha(token), accountId, kind, now + TOKEN_MS[kind]);
  });
  return token;
}
/** Uses a link's token up: the account it was for, or null when it was used before, has run out, or never was. */
function takeToken(db: DatabaseSync, token: unknown, kind: TokenKind, now: number): number | null {
  const key = sha(String(token ?? ""));
  const row = stmt(db, "SELECT account_id AS id FROM account_tokens WHERE token = ? AND kind = ? AND expires_at > ?").get(key, kind, now) as { id: number } | undefined;
  if (!row) return null;
  stmt(db, "DELETE FROM account_tokens WHERE token = ?").run(key);
  return row.id;
}
/** Where a mailed link leads: the account page's route for it (src/pages/AccountPage.tsx). */
export const linkFor = (site: string, kind: TokenKind, token: string) => `${site}/#/account/${kind}/${token}`;

/** Mails the account a link. Not waited for: the request is answered whether or not the mail server is quick. */
function mailLink(db: DatabaseSync, account: Account, kind: TokenKind, lang: MailLang) {
  if (!MAIL) return;
  const { subject, text } = mailWords(lang, kind, account.name, linkFor(MAIL.site, kind, makeToken(db, account.id, kind)));
  sendMail(MAIL, { to: account.email, subject, text }).catch((e: Error) => console.error(`mail (${kind}) was not sent: ${e.message}`));
}

// ---------- limits ----------

// A school reaches the server from one address, so the per-client limits are wide (and ten times wider once someone
// there has signed in, as for the site password: limiter.ts); the per-email ones are what stops guessing at one account.
const wrongByClient = new FailureLimiter(30, 10 * MINUTE);
const wrongByEmail = new FailureLimiter(8, 10 * MINUTE, 10_000, 8);
// A school's classes may all make their accounts in one lesson, from one address.
const signUps = new FailureLimiter(300, 60 * MINUTE, 10_000, 300);
const mailsByClient = new FailureLimiter(20, 60 * MINUTE, 10_000, 20);
const mailsByEmail = new FailureLimiter(3, 60 * MINUTE, 10_000, 3);
function limit(limiter: FailureLimiter, key: string) {
  const wait = limiter.retryAfter(key);
  if (wait) throw new HttpError(429, "too many tries; try again later", { "Retry-After": String(wait) });
}

/** Checks the account's own password (to change it, or to delete the account); a wrong one counts against the email. */
async function ownPassword(db: DatabaseSync, account: Account, given: unknown) {
  limit(wrongByEmail, account.email);
  const { password } = stmt(db, "SELECT password FROM accounts WHERE id = ?").get(account.id) as { password: string };
  if (await passwordMatches(String(given ?? ""), password)) return;
  wrongByEmail.fail(account.email);
  throw new HttpError(403, "the current password is wrong");
}

// ---------- routes ----------

/**
 * /api/account and /api/account/{session,reset,verify,student,state}; see docs/api.md, Accounts. recordsGone is called when
 * class records were deleted with their account, for the class study to forget what it had learnt from them.
 */
export async function handleAccount(
  req: IncomingMessage, res: ServerResponse, id: string | undefined, sub: string | undefined, query: URLSearchParams, db: DatabaseSync, recordsGone: () => void = () => {},
) {
  if (sub !== undefined) return send(res, 404, { error: "not found" });
  const client = clientOf(req);
  const now = Date.now();

  if (id === undefined) {
    // Who is signed in (null for nobody) and the class record they practise under (null for none), and whether this
    // server can mail a link for a forgotten password.
    if (req.method === "GET") {
      const account = accountOf(req, db);
      return send(res, 200, { account: account && shown(account), student: account && studentOf(db, account.id), mail: !!MAIL });
    }
    // A new account: { email, name, password, lang? }. Signed in at once; the mail to confirm the address follows.
    if (req.method === "POST") {
      limit(signUps, client);
      const body = await readJson(req, MAX_BODY);
      const email = parseEmail(body.email);
      const name = parseName(body.name);
      const hash = await hashPassword(parsePassword(body.password));
      const made = transaction(db, () => {
        if (stmt(db, "SELECT 1 FROM accounts WHERE email = ?").get(email)) return null;
        return Number(stmt(db, "INSERT INTO accounts (email, name, password, created_at) VALUES (?, ?, ?, ?)").run(email, name, hash, now).lastInsertRowid);
      });
      if (made === null) return send(res, 409, { error: "an account with this email already exists" });
      signUps.fail(client);
      wrongByClient.succeed(client);
      const account: Account = { id: made, email, name, verified: false, role: roleOf(email, false, "student") };
      startSession(db, req, res, made, now);
      mailLink(db, account, "verify", mailLang(body.lang));
      return send(res, 201, shown(account));
    }
    if (req.method === "PUT") {
      // { name? } renames; { password, current } changes the password and signs every other device out.
      const { account, key } = signedIn(req, db);
      const body = await readJson(req, MAX_BODY);
      const name = body.name === undefined ? account.name : parseName(body.name);
      let hash: string | null = null;
      if (body.password !== undefined) {
        const next = parsePassword(body.password);
        await ownPassword(db, account, body.current);
        hash = await hashPassword(next);
      }
      transaction(db, () => {
        stmt(db, "UPDATE accounts SET name = ?, password = COALESCE(?, password) WHERE id = ?").run(name, hash, account.id);
        if (hash) stmt(db, "DELETE FROM sessions WHERE account_id = ? AND token <> ?").run(account.id, key);
      });
      return send(res, 200, shown({ ...account, name }));
    }
    if (req.method === "DELETE") {
      // { password }: the account and everything kept under it, gone.
      const { account } = signedIn(req, db);
      const body = await readJson(req, MAX_BODY);
      await ownPassword(db, account, body.password);
      // The class records go too, with their answers, tests and boards (as "Delete my answers" does for one record).
      const records = transaction(db, () => {
        const gone = stmt(db, "DELETE FROM students WHERE account_id = ?").run(account.id).changes;
        stmt(db, "DELETE FROM accounts WHERE id = ?").run(account.id);
        return Number(gone);
      });
      if (records) recordsGone();
      setCookie(req, res, "", 0);
      return send(res, 204);
    }
    return send(res, 405, { error: "method not allowed" });
  }

  if (id === "session") {
    // Signing in: { email, password }.
    if (req.method === "POST") {
      const body = await readJson(req, MAX_BODY);
      const email = String(body.email ?? "").trim().toLowerCase().slice(0, 254);
      limit(wrongByClient, client);
      limit(wrongByEmail, email);
      const row = stmt(db, "SELECT id, email, name, verified_at AS verifiedAt, role, password FROM accounts WHERE email = ?").get(email) as
        (AccountRow & { password: string }) | undefined;
      const right = await passwordMatches(String(body.password ?? ""), row?.password ?? (await nobodysHash()));
      if (!row || !right) {
        wrongByClient.fail(client);
        wrongByEmail.fail(email);
        return send(res, 401, { error: "wrong email or password" });
      }
      wrongByClient.succeed(client);
      startSession(db, req, res, row.id, now);
      return send(res, 200, shown(toAccount(row)));
    }
    // Signing out: this device's session only.
    if (req.method === "DELETE") {
      const token = cookieOf(req, SESSION_COOKIE);
      if (token) stmt(db, "DELETE FROM sessions WHERE token = ?").run(sha(token));
      setCookie(req, res, "", 0);
      return send(res, 204);
    }
    return send(res, 405, { error: "method not allowed" });
  }

  if (id === "reset") {
    // A forgotten password: { email, lang? } mails a link, if the address has an account. The answer is the same
    // either way, so it doesn't say who has one.
    if (req.method === "POST") {
      if (!MAIL) return send(res, 503, { error: "this server sends no mail" });
      const body = await readJson(req, MAX_BODY);
      const email = parseEmail(body.email);
      limit(mailsByClient, client);
      mailsByClient.fail(client);
      const row = stmt(db, "SELECT id, email, name, verified_at AS verifiedAt, role FROM accounts WHERE email = ?").get(email) as AccountRow | undefined;
      if (row && !mailsByEmail.retryAfter(email)) {
        mailsByEmail.fail(email);
        mailLink(db, toAccount(row), "reset", mailLang(body.lang));
      }
      return send(res, 202, {});
    }
    // The link's page: { token, password } sets the password, signs every device out and this one in. Whoever holds
    // the link reads the address's mail, so it confirms the address too.
    if (req.method === "PUT") {
      const body = await readJson(req, MAX_BODY);
      const password = parsePassword(body.password);
      const accountId = takeToken(db, body.token, "reset", now);
      if (accountId === null) return send(res, 410, { error: "this link was used already or is too old" });
      const hash = await hashPassword(password);
      transaction(db, () => {
        stmt(db, "UPDATE accounts SET password = ?, verified_at = COALESCE(verified_at, ?) WHERE id = ?").run(hash, now, accountId);
        stmt(db, "DELETE FROM sessions WHERE account_id = ?").run(accountId);
      });
      startSession(db, req, res, accountId, now);
      return send(res, 200, shown(accountById(db, accountId)));
    }
    return send(res, 405, { error: "method not allowed" });
  }

  if (id === "verify") {
    if (req.method !== "POST") return send(res, 405, { error: "method not allowed" });
    const body = await readJson(req, MAX_BODY);
    // The confirming link's page: { token }.
    if (body.token !== undefined) {
      const accountId = takeToken(db, body.token, "verify", now);
      if (accountId === null) return send(res, 410, { error: "this link was used already or is too old" });
      stmt(db, "UPDATE accounts SET verified_at = COALESCE(verified_at, ?) WHERE id = ?").run(now, accountId);
      return send(res, 200, { verified: true });
    }
    // Signed in, without a token: mail the confirming link again ({ lang? }).
    const { account } = signedIn(req, db);
    if (account.verified) return send(res, 200, { verified: true });
    if (!MAIL) return send(res, 503, { error: "this server sends no mail" });
    limit(mailsByEmail, account.email);
    mailsByEmail.fail(account.email);
    mailLink(db, account, "verify", mailLang(body.lang));
    return send(res, 202, {});
  }

  if (id === "student") {
    // A record from before the account, added to it by its code: { code }. From then on signing in brings it. A code
    // that is another account's is refused, and so is a second record in a class the account is already in.
    if (req.method !== "POST") return send(res, 405, { error: "method not allowed" });
    const { account } = signedIn(req, db);
    const body = await readJson(req, MAX_BODY);
    const code = normalizeCode(body.code);
    const result = transaction(db, () => {
      const row = stmt(db, "SELECT id, class_code AS class, account_id AS accountId FROM students WHERE code = ?").get(code) as
        { id: number; class: string; accountId: number | null } | undefined;
      if (!row) return 404;
      if (row.accountId === account.id) return 200;
      if (row.accountId !== null) return 409;
      if (stmt(db, "SELECT 1 FROM students WHERE class_code = ? AND account_id = ?").get(row.class, account.id)) return 409;
      stmt(db, "UPDATE students SET account_id = ? WHERE id = ?").run(account.id, row.id);
      return 200;
    });
    if (result === 404) return send(res, 404, { error: "no such student code" });
    if (result === 409) return send(res, 409, { error: "this code belongs to another account, or the account is already in its class" });
    return send(res, 200, studentOf(db, account.id));
  }

  if (id === "state") {
    // The progress that follows the account (#607). GET ?since=REV: what changed since a revision. PUT { since, items,
    // replace? }: the keys this browser changed, merged with what is kept; the answer is what the browser lacks.
    if (req.method === "GET") return send(res, 200, stateSince(db, signedIn(req, db).account.id, parseRev(query.get("since"))));
    if (req.method !== "PUT") return send(res, 405, { error: "method not allowed" });
    const { account } = signedIn(req, db);
    const body = await readJson(req, MAX_STATE_BODY);
    const items = body.items;
    if (items === null || typeof items !== "object" || Array.isArray(items)) throw new HttpError(400, "items must be an object of keys and their values");
    for (const [key, value] of Object.entries(items)) {
      if (!follows(key)) throw new HttpError(400, `this key doesn't follow the account: ${key.slice(0, 60)}`);
      if (typeof value !== "string" || value.length > VALUE_MAX) throw new HttpError(400, `the value of ${key} must be a string of at most ${VALUE_MAX} characters`);
    }
    const replace = new Set<string>(Array.isArray(body.replace) ? body.replace.filter((k: unknown) => typeof k === "string") : []);
    return send(res, 200, putState(db, account.id, parseRev(body.since), items as Record<string, string>, replace, now));
  }

  return send(res, 404, { error: "not found" });
}
