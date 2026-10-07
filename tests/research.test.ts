// The practice study's API: classes need the teacher password, students are randomised in balanced blocks, attempts are
// checked and summarised from their answers, a retried upload is stored once, deleting a student deletes their answers,
// the CSV export names students by number, never by code, and the learner model reads it back. Class practice: a
// class's skills, the plan a student's browser chooses from, attempts that must come from the student's own condition,
// and a database from before these columns that gets them on start.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { normalizeCode, parseAttempt } from "../server/research.ts";
import { EloModel } from "../src/model/elo.ts";
import { observationsFromCsv, replay } from "../src/model/evaluate.ts";

const PORT = 20000 + Math.floor(Math.random() * 20000);
const BASE = `http://127.0.0.1:${PORT}`;
const TEACHER = { "X-Teacher-Password": "chalk" };
const dir = mkdtempSync(join(tmpdir(), "zeno-research-"));
const servers: ChildProcess[] = [];

async function start(port: number, data: string) {
  const server = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", "server/index.ts"], {
    env: { ...process.env, PORT: String(port), DATA_DIR: join(dir, data), STATIC_DIR: join(dir, "dist"), APP_PASSWORD: "", TEACHER_PASSWORD: "chalk" },
    stdio: "pipe",
  });
  servers.push(server);
  await new Promise<void>((ok, fail) => {
    server.stdout!.on("data", (d) => String(d).includes("listening") && ok());
    server.on("exit", (code) => fail(new Error(`server exited with ${code}`)));
  });
}

before(() => start(PORT, "data"));

after(async () => {
  for (const server of servers) if (server.exitCode === null) await new Promise((ok) => (server.once("exit", ok), server.kill()));
  rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

const call = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}, base = BASE) => {
  const res = await fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text && res.headers.get("content-type")?.startsWith("application/json") ? JSON.parse(text) : text, headers: res.headers };
};

const newClass = async (name = "7B") => (await call("POST", "/api/classes", { name }, TEACHER)).body as { code: string };

const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≉ ${b}`);

let n = 0;
const attempt = (student: string, extra: Record<string, unknown> = {}) => ({
  clientId: `test-${Date.now()}-${n++}`,
  student,
  skill: "linear",
  level: 2,
  seed: 12345,
  review: false,
  outcome: "solved",
  solutionViewed: false,
  msTotal: 41000,
  shownAt: Date.now() - 41000,
  answers: [
    { input: "x = 3", verdict: "wrong", ms: 15000 },
    { input: "6/2", verdict: "form", ms: 30000 },
    { input: "3", verdict: "correct", ms: 41000 },
  ],
  ...extra,
});

test("classes need the teacher password", async () => {
  assert.equal((await call("POST", "/api/classes", { name: "x" })).status, 403);
  assert.equal((await call("POST", "/api/classes", { name: "x" }, { "X-Teacher-Password": "chalkk" })).status, 403);
  assert.equal((await call("GET", "/api/classes")).status, 403);
  assert.equal((await fetch(`${BASE}/api/research/attempts.csv`)).status, 403);
  const made = await call("POST", "/api/classes", { name: "  9A  " }, TEACHER);
  assert.equal(made.status, 201);
  assert.equal(made.body.name, "9A");
  assert.match(made.body.code, /^[2-9A-HJKMNP-Z]{6}$/);
});

test("students are randomised in blocks of four, two to each condition", async () => {
  const { code } = await newClass();
  const conditions: string[] = [];
  for (let i = 0; i < 12; i++) {
    const r = await call("POST", "/api/students", { class: code.toLowerCase() }); // codes are typed in any case
    assert.equal(r.status, 201);
    assert.match(r.body.code, /^[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);
    assert.equal(r.body.class, code);
    conditions.push(r.body.condition);
  }
  for (let b = 0; b < 12; b += 4) {
    const block = conditions.slice(b, b + 4);
    assert.equal(block.filter((c) => c === "adaptive").length, 2, block.join());
    assert.equal(block.filter((c) => c === "fixed").length, 2, block.join());
  }
  const list = (await call("GET", "/api/classes", undefined, TEACHER)).body as { code: string; students: number; adaptive: number; fixed: number }[];
  const row = list.find((c) => c.code === code)!;
  assert.deepEqual([row.students, row.adaptive, row.fixed], [12, 6, 6]);
  assert.equal((await call("POST", "/api/students", { class: "NOPE22" })).status, 404);
});

test("a student signs back in with their code, typed loosely", async () => {
  const { code } = await newClass();
  const joined = (await call("POST", "/api/students", { class: code })).body;
  const loose = joined.code.toLowerCase().replace("-", " ");
  const back = await call("GET", `/api/students/${encodeURIComponent(loose)}`);
  assert.equal(back.status, 200);
  assert.deepEqual(back.body, { ...joined, answered: 0 });
  assert.equal((await call("GET", "/api/students/AAAA-BBBB")).status, 404);
});

test("attempts are stored once, with their summary worked out from the answers", async () => {
  const { code } = await newClass();
  const student = (await call("POST", "/api/students", { class: code })).body.code;
  const a = attempt(student);
  assert.equal((await call("POST", "/api/attempts", a)).status, 201);
  // The same upload again (its answer was lost on the way back): accepted, not stored twice.
  const again = await call("POST", "/api/attempts", a);
  assert.equal(again.status, 200);
  assert.equal(again.body.stored, false);
  assert.equal((await call("GET", `/api/students/${student}`)).body.answered, 1);

  const csv = await call("GET", `/api/research/attempts.csv?class=${code}`, undefined, TEACHER);
  assert.equal(csv.status, 200);
  assert.match(csv.headers.get("content-type") ?? "", /text\/csv/);
  const [head, ...rows] = (csv.body as string).trim().split("\n");
  assert.equal(rows.length, 1);
  const cols = head.split(",");
  // The answers column holds JSON with commas, so read the row with a quote-aware split.
  const cells = rows[0].match(/("([^"]|"")*"|[^,]*)(,|$)/g)!.map((c) => c.replace(/,$/, ""));
  const row = Object.fromEntries(cols.map((c, i) => [c, cells[i]]));
  assert.match(row.student, /^s\d+$/);
  assert.ok(!(csv.body as string).includes(student), "the export must not contain the sign-in code");
  assert.equal(row.area, "algebra");
  assert.equal(row.outcome, "solved");
  assert.equal(row.first_correct, "0");
  assert.equal(row.wrongs, "1");
  assert.equal(row.retries, "1");
  assert.equal(row.ms_first, "15000");
  assert.equal(row.n_answers, "3");
  assert.deepEqual(JSON.parse(row.answers.slice(1, -1).replace(/""/g, '"')).map((x: { input: string }) => x.input), ["x = 3", "6/2", "3"]);
});

test("attempts that don't add up are refused", async () => {
  const { code } = await newClass();
  const student = (await call("POST", "/api/students", { class: code })).body.code;
  const refused = async (extra: Record<string, unknown>) => (await call("POST", "/api/attempts", attempt(student, extra))).status;
  assert.equal(await refused({ skill: "astrology" }), 400);
  assert.equal(await refused({ level: 4 }), 400);
  assert.equal(await refused({ seed: -1 }), 400);
  assert.equal(await refused({ outcome: "revealed" }), 400); // but it ends on a correct answer
  assert.equal(await refused({ answers: [{ input: "1", verdict: "wrong", ms: 5 }] }), 400); // "solved" without a correct one
  assert.equal(await refused({ answers: [{ input: "3", verdict: "correct", ms: 5 }, { input: "4", verdict: "wrong", ms: 9 }] }), 400);
  assert.equal(await refused({ outcome: "skipped", answers: [] }), 400);
  assert.equal(await refused({ clientId: "x" }), 400);
  assert.equal(await refused({ msTotal: 2 * 24 * 3600 * 1000 }), 400);
  assert.equal(await refused({ student: "AAAA-BBBB" }), 404);
  // A question revealed without trying, and one left after a try, are fine.
  assert.equal(await refused({ outcome: "revealed", solutionViewed: true, answers: [] }), 201);
  assert.equal(await refused({ outcome: "skipped", answers: [{ input: "2", verdict: "close", ms: 5 }] }), 201);
});

test("deleting a student deletes their answers", async () => {
  const { code } = await newClass();
  const student = (await call("POST", "/api/students", { class: code })).body.code;
  await call("POST", "/api/attempts", attempt(student));
  assert.equal((await call("DELETE", `/api/students/${student}`)).status, 204);
  assert.equal((await call("GET", `/api/students/${student}`)).status, 404);
  const csv = (await call("GET", `/api/research/attempts.csv?class=${code}`, undefined, TEACHER)).body as string;
  assert.equal(csv.trim().split("\n").length, 1, "only the header is left");
});

test("the learner model replays the export", async () => {
  const { code } = await newClass();
  const s1 = (await call("POST", "/api/students", { class: code })).body.code;
  const s2 = (await call("POST", "/api/students", { class: code })).body.code;
  const right = { outcome: "solved", answers: [{ input: "3", verdict: "correct", ms: 900 }] };
  await call("POST", "/api/attempts", attempt(s1, right));
  await call("POST", "/api/attempts", attempt(s2));
  await call("POST", "/api/attempts", attempt(s2, { skill: "factor", level: 1, outcome: "revealed", answers: [] }));
  await call("POST", "/api/attempts", attempt(s1, { outcome: "skipped", answers: [{ input: "6/2", verdict: "form", ms: 9 }] }));
  const csv = (await call("GET", `/api/research/attempts.csv?class=${code}`, undefined, TEACHER)).body as string;
  const obs = observationsFromCsv(csv);
  // The skip after only a form message says nothing, so three of the four count.
  assert.deepEqual(obs.map((o) => [o.skill, o.level, o.correct]), [["linear", 2, true], ["linear", 2, false], ["factor", 1, false]]);
  assert.equal(obs[1].student, obs[2].student); // both s2
  assert.notEqual(obs[0].student, obs[1].student);
  const ps = replay(new EloModel(), obs);
  assert.ok(ps.every(({ p }) => p > 0 && p < 1));
  assert.equal(ps[0].p, 0.5); // nothing known before the first answer
});

test("codes and summaries", () => {
  assert.equal(normalizeCode(" ab2c-d3ef "), "AB2C-D3EF");
  assert.equal(normalizeCode("x7k p9q"), "X7KP9Q");
  const a = parseAttempt({ ...attempt("X"), answers: [{ input: "7/2", verdict: "form", ms: 4 }, { input: "3.5", verdict: "correct", ms: 9 }] });
  // A form message doesn't use up the first try: this counts as right first time.
  assert.equal(a.firstCorrect, true);
  assert.equal(a.wrongs, 0);
  assert.equal(a.retries, 1);
  assert.equal(parseAttempt({ ...attempt("X"), answers: [{ input: "x".repeat(500), verdict: "correct", ms: 1 }] }).answers[0].input.length, 200);
});

test("a class practises the skills it was given, in curriculum order", async () => {
  const made = await call("POST", "/api/classes", { name: "9C", skills: ["average", "algebra", "linear"] }, TEACHER);
  assert.equal(made.status, 201);
  assert.deepEqual(made.body.skills.slice(0, 4), ["average", "linear", "expand", "factor"]);
  assert.equal(made.body.skills.length, 13); // the 12 algebra skills and averages
  assert.equal((await call("POST", "/api/classes", { skills: ["astrology"] }, TEACHER)).status, 400);
  assert.equal((await call("POST", "/api/classes", { skills: [] }, TEACHER)).status, 400);
  const all = (await call("POST", "/api/classes", { name: "everything" }, TEACHER)).body;
  assert.equal(all.skills.length, 38);
  const listed = (await call("GET", "/api/classes", undefined, TEACHER)).body as { code: string; skills: string[] }[];
  assert.deepEqual(listed.find((c) => c.code === made.body.code)!.skills, made.body.skills);
});

test("the plan: condition, skills, place in the fixed sequence, recent skills and the student's own ratings", async () => {
  const { code } = (await call("POST", "/api/classes", { skills: ["volume", "circles"] }, TEACHER)).body;
  const joined = (await call("POST", "/api/students", { class: code })).body;
  const plan = async () => (await call("GET", `/api/students/${joined.code}/plan`)).body;
  const fresh = await plan();
  assert.deepEqual({ ...fresh, state: undefined }, { condition: joined.condition, skills: ["volume", "circles"], position: 0, recent: [], state: undefined });
  assert.deepEqual(fresh.state.students, {});

  const mine = { policy: joined.condition, predicted: 0.71, skill: "volume" };
  assert.equal((await call("POST", "/api/attempts", attempt(joined.code, mine))).status, 201);
  // The other condition's policy, or a review that isn't marked as one, is refused.
  const other = joined.condition === "fixed" ? "adaptive" : "fixed";
  assert.equal((await call("POST", "/api/attempts", attempt(joined.code, { policy: other }))).status, 400);
  assert.equal((await call("POST", "/api/attempts", attempt(joined.code, { policy: "review" }))).status, 400);
  assert.equal((await call("POST", "/api/attempts", attempt(joined.code, { policy: "fixed", review: true }))).status, 400);
  assert.equal((await call("POST", "/api/attempts", attempt(joined.code, { predicted: 1.5 }))).status, 400);
  assert.equal((await call("POST", "/api/attempts", attempt(joined.code, { policy: "review", review: true, skill: "circles" }))).status, 201);

  const after = await plan();
  assert.equal(after.position, joined.condition === "fixed" ? 1 : 0);
  assert.deepEqual(after.recent, ["volume", "circles"]);
  // Only this student's ratings come back, under "me"; difficulties are everyone's.
  assert.deepEqual(Object.keys(after.state.students), ["me"]);
  assert.ok(after.state.skills.volume && after.state.levels["volume:2"]);
  assert.equal((await call("GET", `/api/students/${joined.code}/nope`)).status, 404);

  const csv = (await call("GET", `/api/research/attempts.csv?class=${code}`, undefined, TEACHER)).body as string;
  const [head, first] = csv.split("\n");
  const cols = head.split(",");
  const cells = first.split(",");
  assert.equal(cells[cols.indexOf("policy")], joined.condition);
  assert.equal(cells[cols.indexOf("predicted")], "0.71");

  // Deleting the student takes their answers out of the model as well.
  const before = (await plan()).state.skills.circles[1];
  const second = (await call("POST", "/api/students", { class: code })).body.code;
  await call("POST", "/api/attempts", attempt(second, { skill: "circles" }));
  const count = async () => (await call("GET", `/api/students/${second}/plan`)).body.state.skills.circles[1];
  assert.equal(await count(), before + 1);
  await call("DELETE", `/api/students/${joined.code}`);
  assert.equal(await count(), 1);
});

test("a database from before class practice gets the new columns", async () => {
  const data = join(dir, "old");
  mkdirSync(data, { recursive: true });
  const db = new DatabaseSync(join(data, "boards.db"));
  db.exec(`
    CREATE TABLE classes (code TEXT PRIMARY KEY, name TEXT NOT NULL, block TEXT NOT NULL DEFAULT '[]', created_at INTEGER NOT NULL);
    CREATE TABLE students (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, class_code TEXT NOT NULL REFERENCES classes(code),
      condition TEXT NOT NULL, created_at INTEGER NOT NULL);
    CREATE TABLE attempts (id INTEGER PRIMARY KEY AUTOINCREMENT, client_id TEXT NOT NULL UNIQUE, student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      skill TEXT NOT NULL, level INTEGER NOT NULL, seed INTEGER NOT NULL, review INTEGER NOT NULL, outcome TEXT NOT NULL, first_correct INTEGER NOT NULL,
      wrongs INTEGER NOT NULL, retries INTEGER NOT NULL, solution_viewed INTEGER NOT NULL, ms_first INTEGER, ms_total INTEGER NOT NULL, answers TEXT NOT NULL,
      shown_at INTEGER NOT NULL, created_at INTEGER NOT NULL);
    INSERT INTO classes VALUES ('OLDOLD', 'old', '[]', 1);
    INSERT INTO students VALUES (1, 'AAAA-BBBB', 'OLDOLD', 'fixed', 1);
    INSERT INTO attempts VALUES (1, 'old-attempt-1', 1, 'linear', 2, 5, 0, 'solved', 1, 0, 0, 0, 900, 900, '[]', 1, 1);
  `);
  db.close();
  const port = PORT + 1;
  await start(port, "old");
  const base = `http://127.0.0.1:${port}`;
  const plan = await call("GET", "/api/students/AAAA-BBBB/plan", undefined, {}, base);
  assert.equal(plan.status, 200);
  assert.equal(plan.body.skills.length, 38); // no skills stored: the whole curriculum
  assert.equal(plan.body.position, 0); // the old attempt counts as free practice
  assert.ok(plan.body.state.students.me);
  const csv = (await call("GET", "/api/research/attempts.csv", undefined, TEACHER, base)).body as string;
  assert.match(csv.split("\n")[1], /^1,s1,OLDOLD,fixed,free,,/);
});

test("the dashboard: mastery for every student and skill, the two groups, and the logged predictions", async () => {
  const { code } = (await call("POST", "/api/classes", { name: "Dash", skills: ["linear", "expand"] }, TEACHER)).body;
  assert.equal((await call("GET", `/api/research/dashboard?class=${code}`)).status, 403);
  assert.equal((await call("GET", "/api/research/dashboard?class=NOPE22", undefined, TEACHER)).status, 404);
  const empty = (await call("GET", `/api/research/dashboard?class=${code}`, undefined, TEACHER)).body;
  assert.deepEqual(empty.students, []);
  assert.equal(empty.calibration.n, 0);
  assert.equal(empty.conditions.adaptive.rightFirst, null);

  const joined = [];
  for (let i = 0; i < 4; i++) joined.push((await call("POST", "/api/students", { class: code })).body);
  const right = { outcome: "solved", msTotal: 4000, answers: [{ input: "3", verdict: "correct", ms: 4000 }] };
  for (const s of joined) {
    // Class practice, with the model's chance logged; then a free question that was revealed without a try.
    await call("POST", "/api/attempts", attempt(s.code, { ...right, policy: s.condition, predicted: 0.7, skill: "linear", level: 1 }));
    await call("POST", "/api/attempts", attempt(s.code, { outcome: "revealed", answers: [], solutionViewed: true, skill: "expand", predicted: 0.4 }));
  }
  const d = (await call("GET", `/api/research/dashboard?class=${code}`, undefined, TEACHER)).body;
  assert.deepEqual(d.class.skills, ["linear", "expand"]);
  assert.equal(d.students.length, 4);
  const s = d.students[0];
  assert.match(s.id, /^s\d+$/);
  assert.equal(s.answered, 2);
  assert.equal(s.rightFirst, 0.5);
  assert.deepEqual(Object.keys(s.mastery), ["linear", "expand"]);
  assert.equal(s.mastery.linear.n, 1);
  assert.ok(s.mastery.linear.p[0] > s.mastery.linear.p[1] && s.mastery.linear.p[1] > s.mastery.linear.p[2]);
  for (const c of ["adaptive", "fixed"]) {
    const g = d.conditions[c];
    assert.deepEqual([g.students, g.answered, g.classPractice, g.rightFirst, g.solutionViewed, g.skipped], [2, 4, 2, 0.5, 0.5, 0]);
    close(g.predicted, 0.7);
    close(g.offTarget, 0.05);
    assert.equal(g.medianSeconds, (4 + 41) / 2); // the right answers took 4 s, the revealed questions 41 s
  }
  // Eight logged predictions: 0.7 came true four times, 0.4 failed four times.
  assert.equal(d.calibration.n, 8);
  assert.equal(d.calibration.auc, 1);
  const bins = d.calibration.bins.filter((b: { n: number }) => b.n);
  assert.deepEqual(bins.map((b: { n: number; observed: number }) => [b.n, b.observed]), [[4, 0], [4, 1]]);
});
