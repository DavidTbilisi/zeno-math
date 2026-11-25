// Roles (#687): an admin named in ADMIN_EMAILS makes teachers; each teacher sees and changes only their own classes,
// by every route (404, as if it weren't there); an admin sees every class, gives one to a teacher, reads the usage counts
// and the backup; the teacher password still works from a script, as an admin; a wrong one, or one sent to a server
// that takes none, gets nobody in. While the server sends mail, a role counts only once the address is confirmed.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PORT = 20000 + Math.floor(Math.random() * 20000);
const dir = mkdtempSync(join(tmpdir(), "zeno-roles-"));
const servers: ChildProcess[] = [];
const PASSWORD = "script-password";
const SCRIPT = { "X-Teacher-Password": PASSWORD };

async function start(port: number, name: string, env: Record<string, string>) {
  const server = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", "server/index.ts"], {
    env: { ...process.env, PORT: String(port), DATA_DIR: join(dir, name), STATIC_DIR: join(dir, "dist"), APP_PASSWORD: "", BACKUP_KEEP: "0", SMTP_HOST: "", ...env },
    stdio: "pipe",
  });
  servers.push(server);
  await new Promise<void>((ok, fail) => {
    server.stdout!.on("data", (d) => String(d).includes("listening") && ok());
    server.on("exit", (code) => fail(new Error(`server exited with ${code}`)));
  });
}

before(async () => {
  mkdirSync(join(dir, "dist"), { recursive: true });
  writeFileSync(join(dir, "dist", "index.html"), "<!doctype html><title>Zeno</title>");
  await start(PORT, "data", { TEACHER_PASSWORD: PASSWORD, ADMIN_EMAILS: " Head@School.example ,other-head@school.example" });
});
after(async () => {
  for (const server of servers) if (server.exitCode === null) await new Promise((ok) => (server.once("exit", ok), server.kill()));
  rmSync(dir, { recursive: true, force: true });
});

/** A browser: keeps the session cookie between calls. */
function device(base = `http://127.0.0.1:${PORT}`) {
  let cookie = "";
  const call = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
    const res = await fetch(base + path, {
      method, headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(cookie ? { Cookie: cookie } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0];
    const text = await res.text();
    return { status: res.status, body: text && res.headers.get("content-type")?.includes("json") ? JSON.parse(text) : text };
  };
  return { call };
}
async function signUp(email: string, name: string, base?: string) {
  const d = device(base);
  assert.equal((await d.call("POST", "/api/account", { email, name, password: "long enough" })).status, 201);
  return d;
}

test("an admin makes teachers, and each teacher has only their own classes", async () => {
  const head = await signUp("head@school.example", "Head");
  assert.equal((await head.call("GET", "/api/account")).body.account.role, "admin", "named in ADMIN_EMAILS, whatever the case");
  const ana = await signUp("ana@school.example", "Ana");
  const ben = await signUp("ben@school.example", "Ben");
  const kid = await signUp("kid@school.example", "Kid");
  assert.equal((await ana.call("GET", "/api/account")).body.account.role, "student", "every new account is a student's");

  // Nobody but an admin reaches the people list or the classes.
  for (const who of [device(), kid, ana]) {
    assert.equal((await who.call("GET", "/api/people")).status, 403);
    assert.equal((await who.call("POST", "/api/people/1", { role: "admin" })).status, 403);
  }
  assert.equal((await kid.call("GET", "/api/classes")).status, 403);
  assert.equal((await device().call("GET", "/api/classes")).status, 403);

  const people = (await head.call("GET", "/api/people")).body as { accounts: { id: number; email: string; role: string; fixed: boolean }[]; me: number };
  const idOf = (email: string) => people.accounts.find((a) => a.email === email)!.id;
  assert.equal(people.accounts.find((a) => a.email === "head@school.example")!.fixed, true);
  for (const email of ["ana@school.example", "ben@school.example"]) assert.equal((await head.call("POST", `/api/people/${idOf(email)}`, { role: "teacher" })).status, 200);
  assert.equal((await head.call("POST", `/api/people/${idOf("kid@school.example")}`, { role: "boss" })).status, 400);
  assert.equal((await head.call("POST", `/api/people/${people.me}`, { role: "teacher" })).status, 409, "an admin keeps their own role");
  assert.equal((await ana.call("GET", "/api/account")).body.account.role, "teacher");

  // Each makes a class; each sees only their own.
  const a = (await ana.call("POST", "/api/classes", { name: "Ana's class", skills: ["algebra"] })).body.code as string;
  const b = (await ben.call("POST", "/api/classes", { name: "Ben's class", skills: ["algebra"] })).body.code as string;
  assert.deepEqual((await ana.call("GET", "/api/classes")).body.map((c: { code: string }) => c.code), [a]);
  assert.deepEqual((await ben.call("GET", "/api/classes")).body.map((c: { code: string }) => c.code), [b]);
  assert.deepEqual((await head.call("GET", "/api/classes")).body.map((c: { code: string }) => c.code), [a, b], "an admin sees every class");

  // A student joins Ben's class and makes a board there.
  const me = (await kid.call("POST", "/api/students", { class: b })).body;
  const board = (await kid.call("POST", "/api/boards", { title: "Kid's work" }, { "X-Student-Code": me.code })).body.id as string;

  // Ana reaches nothing of Ben's class, by any route: as if it weren't there.
  const enc = encodeURIComponent(b);
  const tries: [string, string, unknown?][] = [
    ["GET", `/api/research/dashboard?class=${enc}`],
    ["POST", `/api/classes/${enc}/phase`, { phase: "pretest" }],
    ["POST", `/api/classes/${enc}/homework`, { length: 5 }],
    ["POST", `/api/classes/${enc}/study`, { study: false }],
    ["POST", `/api/classes/${enc}/games`, { games: [] }],
    ["POST", `/api/classes/${enc}/goal`, { goal: null }],
    ["POST", `/api/classes/${enc}/paper`, { student: "s1", phase: "pretest", form: "A", answers: [] }],
    ["POST", `/api/classes/${enc}/seen`, { student: "s1", skill: "linear", through: 1 }],
    ["DELETE", `/api/classes/${enc}`],
    ["GET", `/api/research/attempts.csv?class=${enc}`],
    ["GET", `/api/research/tests.csv?class=${enc}`],
    ["GET", `/api/boards?class=${enc}`],
    ["GET", `/api/boards/${board}`],
  ];
  for (const [method, path, body] of tries) assert.equal((await ana.call(method, path, body)).status, 404, `${method} ${path}`);
  assert.equal((await ana.call("POST", `/api/classes/${enc}/owner`, { owner: null })).status, 403, "only an admin gives a class away");
  // Ana's own export of every class leaves Ben's out.
  assert.ok(!String((await ana.call("GET", "/api/research/attempts.csv")).body).includes(b));

  // Ben and the admin reach it; the board reads only.
  assert.equal((await ben.call("GET", `/api/research/dashboard?class=${enc}`)).status, 200);
  assert.equal((await ben.call("GET", `/api/boards/${board}`)).body.readOnly, true);
  assert.equal((await head.call("GET", `/api/boards/${board}`)).body.readOnly, true);
  assert.deepEqual((await ben.call("GET", `/api/boards?class=${enc}`)).body.map((x: { title: string }) => x.title), ["Kid's work"]);
  assert.equal((await ben.call("PUT", `/api/boards/${board}`, { title: "Marked" })).status, 403);

  // Usage counts and the whole backup are an admin's.
  for (const path of ["/api/usage?days=7", "/api/export"]) {
    assert.equal((await ana.call("GET", path)).status, 403, path);
    assert.equal((await head.call("GET", path)).status, 200, path);
  }

  // A class made by a script is nobody's: only admins see it, until one gives it to a teacher (not to a student).
  const c = (await device().call("POST", "/api/classes", { name: "Imported" }, SCRIPT)).body.code as string;
  assert.equal((await device().call("GET", "/api/classes", undefined, SCRIPT)).body.length, 3);
  assert.ok(!(await ana.call("GET", "/api/classes")).body.some((x: { code: string }) => x.code === c));
  assert.equal((await head.call("POST", `/api/classes/${c}/owner`, { owner: idOf("kid@school.example") })).status, 409);
  assert.equal((await head.call("POST", `/api/classes/${c}/owner`, { owner: idOf("ana@school.example") })).status, 200);
  assert.deepEqual((await ana.call("GET", "/api/classes")).body.map((x: { code: string }) => x.code), [a, c]);

  // Back to a student: the classes stay hers, but she reaches none of them now.
  await head.call("POST", `/api/people/${idOf("ana@school.example")}`, { role: "student" });
  assert.equal((await ana.call("GET", "/api/classes")).status, 403);
  // Made an admin, Ben sees everything.
  await head.call("POST", `/api/people/${idOf("ben@school.example")}`, { role: "admin" });
  assert.equal((await ben.call("GET", "/api/classes")).body.length, 3);
});

test("a wrong teacher password gets nobody in", async () => {
  assert.equal((await device().call("GET", "/api/classes", undefined, { "X-Teacher-Password": "nope" })).status, 403);
  assert.equal((await device().call("GET", "/api/people", undefined, SCRIPT)).status, 200, "the script's password is an admin's");
  // A server that takes no password, with admins named, lets no header in.
  const port = PORT + 1;
  await start(port, "nopassword", { TEACHER_PASSWORD: "", ADMIN_EMAILS: "head@school.example" });
  const d = device(`http://127.0.0.1:${port}`);
  assert.equal((await d.call("GET", "/api/classes", undefined, { "X-Teacher-Password": "" })).status, 403);
  assert.equal((await d.call("GET", "/api/classes")).status, 403);
  // With neither, the server is open, as a home install always was.
  await start(port + 1, "open", { TEACHER_PASSWORD: "", ADMIN_EMAILS: "" });
  assert.equal((await device(`http://127.0.0.1:${port + 1}`).call("GET", "/api/classes")).status, 200);
});

test("while the server sends mail, a role counts once the address is confirmed", async () => {
  Object.assign(process.env, { SMTP_HOST: "mail.example", MAIL_FROM: "z@school.example", PUBLIC_URL: "https://zeno.school.example", ADMIN_EMAILS: "head@school.example" });
  const { roleOf } = await import("../server/accounts.ts");
  assert.equal(roleOf("head@school.example", false, "student"), "student", "anyone could sign up with the head's address first");
  assert.equal(roleOf("head@school.example", true, "student"), "admin");
  assert.equal(roleOf("ana@school.example", false, "teacher"), "student");
  assert.equal(roleOf("ana@school.example", true, "teacher"), "teacher");
});
