// The practice study's API: classes need the teacher password, students are randomised in balanced blocks, attempts are
// checked and summarised from their answers, a retried upload is stored once, deleting a student deletes their answers,
// the CSV export names students by number, never by code, and the learner model reads it back.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { normalizeCode, parseAttempt } from "../server/research.ts";
import { EloModel } from "../src/model/elo.ts";
import { observationsFromCsv, replay } from "../src/model/evaluate.ts";

const PORT = 20000 + Math.floor(Math.random() * 20000);
const BASE = `http://127.0.0.1:${PORT}`;
const TEACHER = { "X-Teacher-Password": "chalk" };
const dir = mkdtempSync(join(tmpdir(), "zeno-research-"));
let server: ChildProcess;

before(async () => {
  server = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", "server/index.ts"], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR: join(dir, "data"), STATIC_DIR: join(dir, "dist"), APP_PASSWORD: "", TEACHER_PASSWORD: "chalk" },
    stdio: "pipe",
  });
  await new Promise<void>((ok, fail) => {
    server.stdout!.on("data", (d) => String(d).includes("listening") && ok());
    server.on("exit", (code) => fail(new Error(`server exited with ${code}`)));
  });
});

after(async () => {
  if (server.exitCode === null) await new Promise((ok) => (server.once("exit", ok), server.kill()));
  rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

const call = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text && res.headers.get("content-type")?.startsWith("application/json") ? JSON.parse(text) : text, headers: res.headers };
};

const newClass = async (name = "7B") => (await call("POST", "/api/classes", { name }, TEACHER)).body as { code: string };

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
