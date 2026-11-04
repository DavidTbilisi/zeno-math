// The practice study's API: classes need the teacher password, students are randomised in balanced blocks, attempts are
// checked and summarised from their answers, a retried upload is stored once, deleting a student deletes their answers,
// the CSV export names students by number, never by code, and the learner model reads it back. Class practice: a
// class's skills, the plan a student's browser chooses from, attempts that must come from the student's own condition,
// and a database from before these columns that gets them on start. The protocol: phases and timed sessions set by the
// teacher, counterbalanced test forms, one stored answer per test question, and the results on the dashboard. Every
// answer is marked again by the server, and what arrives long after its phase is kept but marked late.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { ALL_SKILLS } from "../src/math/practiceSkills.ts";
import { spawn, type ChildProcess } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initResearch, normalizeCode, parseAttempt } from "../server/research.ts";
import { GRACE, initProtocol, logPhase, onTime, phaseWindows, PRACTICE_PHASES } from "../server/protocol.ts";
import { skillsOfGrade, skillsOfYear } from "../src/model/curriculum.ts";
import { EloModel } from "../src/model/elo.ts";
import { observationsFromCsv, parseCsv, replay } from "../src/model/evaluate.ts";
import { usesOf } from "../src/model/ideaState.ts";
import { learnEma, type EmaState } from "../src/model/policy.ts";
import { DAY } from "../src/model/spacing.ts";
import { analyseStudy, scoresFromTests } from "../src/model/analysis.ts";
import { testItems } from "../src/model/testForms.ts";
import { applyAttempt, toClassPlan, verdictOf, type Attempt } from "../src/learner.ts";
import { en } from "../src/locales/en.ts";
import { check, exercise, stepsOf, trapInputs, type SkillId } from "../src/math/practice.ts";

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

/** Rows back into CSV, for code that reads an export. */
const csvOf = (rows: Record<string, string>[]) =>
  [Object.keys(rows[0]).join(","), ...rows.map((r) => Object.values(r).map((v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(","))].join("\n");

const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≉ ${b}`);

/** Something to type that the checker marks this way for the question (the server marks every answer again). */
function typed(q: { skill: string; level: number; seed: number }, verdict: string): string {
  // A question that doesn't exist, or a verdict that doesn't, is for a request that is refused anyway.
  if (!ALL_SKILLS.includes(q.skill as SkillId) || ![1, 2, 3].includes(q.level) || !["correct", "close", "wrong", "form"].includes(verdict)) return "1";
  const ex = exercise(q.skill as SkillId, q.level as 1 | 2 | 3, q.seed, en.pracWords);
  const input = verdict === "correct" ? ex.plain : verdict === "form" ? "((" : "12345";
  assert.equal(verdictOf(check(ex, input, en.pracWords)), verdict === "close" ? "wrong" : verdict, `${q.skill}: ${input}`);
  return input;
}

let n = 0;
/** An attempt; an answer without an input gets one the checker gives its verdict. */
function attempt(student: string, extra: Record<string, unknown> = {}) {
  const a = {
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
    answers: [{ verdict: "wrong", ms: 15000 }, { verdict: "form", ms: 30000 }, { verdict: "correct", ms: 41000 }] as { input?: string; verdict: string; ms: number }[],
    ...extra,
  };
  return { ...a, answers: a.answers.map((x) => ({ ...x, input: x.input ?? typed(a, x.verdict) })) };
}

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
  const list = (await call("GET", "/api/classes", undefined, TEACHER)).body as { code: string; feature: string; students: number; on: number; off: number }[];
  const row = list.find((c) => c.code === code)!;
  assert.deepEqual([row.feature, row.students, row.on, row.off], ["policy", 12, 6, 6], "a class tests the policy unless it was made to test another feature");
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
  assert.deepEqual(JSON.parse(row.answers.slice(1, -1).replace(/""/g, '"')).map((x: { input: string }) => x.input), ["12345", "((", "6"]);
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

test("how a question felt to the student (issue #290): checked, stored and exported, from class practice in either condition", async () => {
  const { code } = await newClass();
  const students = [(await call("POST", "/api/students", { class: code })).body, (await call("POST", "/api/students", { class: code })).body] as { code: string; condition: string }[];
  // The first two of a block of four: the conditions may match, so post each in its own.
  const post = (who: { code: string; condition: string }, extra: Record<string, unknown>) =>
    call("POST", "/api/attempts", attempt(who.code, { policy: who.condition, ...extra }));
  const [s] = students;
  for (const rated of ["meh", "EASY", 3, null])
    assert.deepEqual((await post(s, { rated })).body, { error: "invalid rated" }, JSON.stringify(rated));
  // Asked only once the question is over: not on one left after a try.
  assert.equal((await post(s, { outcome: "skipped", answers: [{ verdict: "close", ms: 5 }], rated: "hard" })).status, 400);
  for (const [who, rated] of [[students[0], "easy"], [students[1], "hard"], [students[0], "right"]] as const)
    assert.equal((await post(who, { rated })).status, 201, `${who.condition} ${rated}`);
  assert.equal((await post(s, {})).status, 201, "and it can be left out");
  const exported = parseCsv((await call("GET", `/api/research/attempts.csv?class=${code}`, undefined, TEACHER)).body as string);
  assert.deepEqual(exported.map((r) => r.rated), ["easy", "hard", "right", ""]);
  assert.deepEqual(exported.map((r) => r.policy), [students[0], students[1], students[0], students[0]].map((x) => x.condition));
});

test("a student's number in the class list: checked, warned about when given twice, on the dashboard and never exported", async () => {
  const { code } = await newClass();
  const join = (body: Record<string, unknown>) => call("POST", "/api/students", { class: code, ...body });
  for (const number of [0, 100, 2.5, "7"]) assert.equal((await join({ number })).status, 400, `number ${number}`);
  const first = await join({ number: 7 });
  assert.equal(first.status, 201);
  assert.equal((await join({ number: 7 })).status, 409, "the same number again is most likely the same student");
  const again = await join({ number: 7, again: true });
  assert.equal(again.status, 201, "joined anyway when they say it wasn't them");
  assert.notEqual(again.body.code, first.body.code);
  assert.equal((await join({})).status, 201, "a number is optional");
  const other = await newClass();
  assert.equal((await call("POST", "/api/students", { class: other.code, number: 7 })).status, 201, "numbers are per class");

  const board = (await call("GET", `/api/research/dashboard?class=${code}`, undefined, TEACHER)).body as { students: { code: string; number: number | null }[] };
  assert.deepEqual(board.students.map((s) => s.number), [7, 7, null]);
  assert.equal(board.students[0].code, first.body.code);

  await call("POST", "/api/attempts", attempt(first.body.code));
  for (const kind of ["attempts", "tests"]) {
    const csv = (await call("GET", `/api/research/${kind}.csv?class=${code}`, undefined, TEACHER)).body as string;
    assert.doesNotMatch(csv.split("\n")[0], /number|list/, `${kind}.csv has no list number`);
  }
});

test("a paper test typed in: marked like an online one, flagged paper, an online answer kept, the order swapped to fit when it still can be", async () => {
  const skills = ["linear", "expand", "factor"];
  const { code } = (await call("POST", "/api/classes", { name: "Paper", skills, testLength: 6 }, TEACHER)).body as { code: string };
  const join = async () => (await call("POST", "/api/students", { class: code })).body.code as string;
  const [a, b, c] = [await join(), await join(), await join()];
  const formOf = async (s: string, phase: "pre" | "post") => (await call("GET", `/api/students/${s}/plan`)).body.tests[phase].form as "A" | "B";
  const paper = (body: Record<string, unknown>, headers: Record<string, string> = TEACHER) => call("POST", `/api/classes/${code}/paper`, body, headers);
  /** Six answers for the form: right, wrong, blank, unreadable ("lowest terms" can't be sent back on paper), right, right. */
  const sheet = (form: string) => testItems(code, skills as never, form as never, 6).map((q, i) =>
    i === 2 ? "" : i === 1 ? typed(q, "wrong") : i === 3 ? typed(q, "form") : typed(q, "correct"));

  const formA = await formOf(a, "pre");
  assert.equal((await paper({ student: a, phase: "pre", answers: sheet(formA) }, {})).status, 403, "the teacher's password");
  assert.equal((await paper({ student: "AAAA-BBBB", phase: "pre", answers: sheet(formA) })).status, 404);
  const elsewhere = (await call("POST", "/api/students", { class: (await newClass()).code })).body.code;
  assert.equal((await paper({ student: elsewhere, phase: "pre", answers: sheet("A") })).status, 404, "only a student of this class");
  assert.equal((await paper({ student: a, phase: "pre", answers: sheet(formA).slice(1) })).status, 400, "one answer per question");
  assert.equal((await paper({ student: a, phase: "mid", answers: sheet(formA) })).status, 400);

  // Typed in before the class's test has even started (the network was down): stored, each marked by the server.
  const done = await paper({ student: a, phase: "pre", answers: sheet(formA) });
  assert.equal(done.status, 201);
  assert.deepEqual(done.body, { form: formA, stored: 6, kept: 0, verdicts: ["correct", "wrong", "skipped", "wrong", "correct", "correct"], reordered: false });
  assert.equal((await paper({ student: a, phase: "pre", answers: sheet(formA) })).body.stored, 0, "typed in twice, stored once");
  // Their post-test is the other form; giving them the same form again is refused, naming theirs.
  const wrongForm = await paper({ student: a, phase: "post", form: formA, answers: sheet(formA) });
  assert.deepEqual([wrongForm.status, wrongForm.body.form], [409, formA === "A" ? "B" : "A"]);
  assert.equal((await paper({ student: a, phase: "delayed", form: "A", answers: sheet("A") })).status, 409, "the delayed post-test is form C");

  // A question answered online before the network went keeps its online answer.
  await call("POST", `/api/classes/${code}/phase`, { phase: "pretest" }, TEACHER);
  const formB = await formOf(b, "pre");
  const q0 = testItems(code, skills as never, formB, 6)[0];
  await call("POST", "/api/tests", { clientId: `paper-online-${Date.now()}`, student: b, phase: "pre", item: 0, input: typed(q0, "wrong"), verdict: "wrong", retries: 0, ms: 9000 });
  const mixed = (await paper({ student: b, phase: "pre", answers: sheet(formB) })).body;
  assert.deepEqual([mixed.stored, mixed.kept, mixed.verdicts[0]], [5, 1, null]);
  assert.equal(await formOf(b, "post"), formB === "A" ? "B" : "A");

  // A student who wrote the other form than their order says, before any test: their order is swapped to fit, so the
  // post-test is the form they haven't seen.
  const formC = await formOf(c, "pre");
  const other = formC === "A" ? "B" : "A";
  const swapped = await paper({ student: c, phase: "pre", form: other, answers: sheet(other) });
  assert.deepEqual([swapped.status, swapped.body.reordered, swapped.body.verdicts[0]], [201, true, "correct"]);
  assert.deepEqual([await formOf(c, "pre"), await formOf(c, "post")], [other, formC]);

  const rows = parseCsv((await call("GET", `/api/research/tests.csv?class=${code}`, undefined, TEACHER)).body as string);
  assert.equal(rows.length, 18);
  assert.equal(rows.filter((r) => r.paper === "1").length, 17, "all but the one answered online");
  assert.ok(rows.every((r) => r.late === "0" && r.client_verdict === ""), "paper isn't late, and the server's verdict is the only one");
  assert.ok(rows.every((r) => r.form === (r.test_order === "AB" ? "A" : "B")), "every pre-test on the form the (swapped) order says");
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
  const right = { outcome: "solved", answers: [{ verdict: "correct", ms: 900 }] };
  await call("POST", "/api/attempts", attempt(s1, right));
  await call("POST", "/api/attempts", attempt(s2));
  await call("POST", "/api/attempts", attempt(s2, { skill: "factor", level: 1, outcome: "revealed", answers: [] }));
  await call("POST", "/api/attempts", attempt(s1, { outcome: "skipped", answers: [{ verdict: "form", ms: 9 }] }));
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
  assert.deepEqual(made.body.skills.slice(0, 7), ["average", "findRule", "growingPattern", "balance", "sameExpression", "graphStory", "linear"]);
  assert.equal(made.body.skills.length, 23); // the 22 algebra skills and averages
  assert.equal((await call("POST", "/api/classes", { skills: ["astrology"] }, TEACHER)).status, 400);
  assert.equal((await call("POST", "/api/classes", { skills: [] }, TEACHER)).status, 400);
  // A year of the primary syllabus: every skill with a level in it.
  const p6 = (await call("POST", "/api/classes", { name: "P6", skills: ["P6"] }, TEACHER)).body;
  assert.deepEqual(p6.skills, skillsOfYear(6));
  assert.equal((await call("POST", "/api/classes", { skills: ["P7"] }, TEACHER)).status, 400);
  // A grade of the course: the same for the primary years, and on past them; 9 and 11 are inside the two-year stages.
  assert.deepEqual((await call("POST", "/api/classes", { name: "G6", skills: ["G6"] }, TEACHER)).body.skills, skillsOfYear(6));
  assert.deepEqual((await call("POST", "/api/classes", { name: "Uni", skills: ["G13"] }, TEACHER)).body.skills, skillsOfGrade(13));
  for (const bad of ["G9", "G11", "G14", "G0"]) assert.equal((await call("POST", "/api/classes", { skills: [bad] }, TEACHER)).status, 400, bad);
  const all = (await call("POST", "/api/classes", { name: "everything" }, TEACHER)).body;
  assert.equal(all.skills.length, ALL_SKILLS.length);
  const listed = (await call("GET", "/api/classes", undefined, TEACHER)).body as { code: string; skills: string[] }[];
  assert.deepEqual(listed.find((c) => c.code === made.body.code)!.skills, made.body.skills);
});

test("the plan carries the student's spaced reviews: a skill mastered comes back a day later, then three days after a right review; kept, then not", async () => {
  const { code } = (await call("POST", "/api/classes", { skills: ["linear"] }, TEACHER)).body;
  const joined = (await call("POST", "/api/students", { class: code })).body;
  const plan = async () => (await call("GET", `/api/students/${joined.code}/plan`)).body;
  assert.deepEqual((await plan()).spacing, {});
  const right = (shownAt: number, policy = joined.condition) =>
    attempt(joined.code, { policy, level: 3, shownAt, answers: [{ verdict: "correct", ms: 9000 }] });
  const T = Date.UTC(2026, 10, 1, 9);
  let at = T, spacing: Record<string, { step: number; due: number; again?: boolean }> = {};
  for (let i = 0; i < 60 && !spacing.linear; i++) {
    assert.equal((await call("POST", "/api/attempts", right((at += 60_000)))).status, 201);
    spacing = (await plan()).spacing;
  }
  assert.deepEqual(spacing.linear, { step: 0, due: at + DAY }, "scheduled by the answer that mastered it, on the student's clock");
  // The review: chosen by the spaced review, never marked as a review of misses.
  assert.equal((await call("POST", "/api/attempts", attempt(joined.code, { policy: "spaced", review: true }))).status, 400);
  const review = at + DAY + 5000;
  assert.equal((await call("POST", "/api/attempts", right(review, "spaced"))).status, 201);
  assert.deepEqual((await plan()).spacing.linear, { step: 1, due: review + 3 * DAY });
  // The teacher sees the skill kept, and the arm counts it as the result, not as progress still to check.
  const dash = async () => (await call("GET", `/api/research/dashboard?class=${code}`, undefined, TEACHER)).body;
  let d = await dash();
  assert.deepEqual([d.students[0].holds, d.students[0].held], [{ linear: "kept" }, { mastered: 0, kept: 1, again: 0 }]);
  assert.deepEqual([d.arms[joined.arm].kept, d.arms[joined.arm].mastered], [1, 0]);
  // Wrong on the next review: no longer kept, practised again.
  const wrong = attempt(joined.code, { policy: "spaced", level: 3, shownAt: review + 3 * DAY + 5000, outcome: "revealed", answers: [{ verdict: "wrong", ms: 9000 }] });
  assert.equal((await call("POST", "/api/attempts", wrong)).status, 201);
  d = await dash();
  assert.deepEqual([d.students[0].holds, d.arms[joined.arm].kept], [{ linear: "again" }, 0]);
  const exported = parseCsv((await call("GET", `/api/research/attempts.csv?class=${code}`, undefined, TEACHER)).body as string);
  assert.equal(exported.filter((r) => r.policy === "spaced").length, 2);
});

test("the plan: condition, skills, place in the fixed sequence, recent skills and the student's own records", async () => {
  const { code } = (await call("POST", "/api/classes", { skills: ["volume", "circles"] }, TEACHER)).body;
  const joined = (await call("POST", "/api/students", { class: code })).body;
  const plan = async () => (await call("GET", `/api/students/${joined.code}/plan`)).body;
  const fresh = await plan();
  const { condition, skills, position, recent } = fresh;
  assert.deepEqual({ condition, skills, position, recent }, { condition: joined.condition, skills: ["volume", "circles"], position: 0, recent: [] });
  assert.deepEqual(fresh.state.students, {});
  assert.deepEqual(fresh.ideas, {});
  assert.deepEqual(fresh.ema, {});

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
  // Only this student's records come back, under "me"; the weights and the answers per skill are everyone's.
  assert.deepEqual(Object.keys(after.state.students), ["me"]);
  for (const k of ["volume", "circles"]) assert.equal(after.state.answers[k], (fresh.state.answers[k] ?? 0) + 1, k);
  assert.equal(after.state.students.me.answers, 2);
  assert.ok(typeof after.state.weights["e:volume:2"] === "number", "volume's weights, from the simulated class");
  assert.deepEqual(after.ideas, {}, "no question on a skill made of ideas yet");
  // Both first answers were wrong: the moving average on each skill falls from its start, as the browser's does.
  const missedOnce: EmaState = {};
  learnEma(missedOnce, "volume", false), learnEma(missedOnce, "circles", false);
  assert.deepEqual(after.ema, missedOnce);
  // A fractions question, right first time, raises the ideas it needed; the plan carries them for the policy to aim at.
  const sum = exercise("fractions", 1, 5, en.pracWords);
  assert.equal((await call("POST", "/api/attempts", attempt(joined.code, { policy: "free", skill: "fractions", level: 1, seed: 5, answers: [{ verdict: "correct", ms: 9000 }] }))).status, 201);
  const ideas = (await plan()).ideas as Record<string, number>;
  assert.deepEqual(Object.keys(ideas).sort(), [...usesOf(sum)].sort());
  for (const p of Object.values(ideas)) assert.ok(p > 0.5 && p < 1);
  // A miss with an idea ticked as hard lowers that idea more than the others; the ticks are checked, stored and exported.
  const missed = { policy: "free", skill: "fractions", level: 1, seed: 5, outcome: "revealed", answers: [{ verdict: "wrong", ms: 9000 }] };
  const [idea, unticked] = usesOf(sum);
  for (const hard of [[], ["nope"], [idea, idea], "part"])
    assert.equal((await call("POST", "/api/attempts", attempt(joined.code, { ...missed, hard }))).status, 400, JSON.stringify(hard));
  assert.equal((await call("POST", "/api/attempts", attempt(joined.code, { ...missed, skill: "volume", seed: 1, hard: [idea] }))).status, 400, "only on a skill made of ideas");
  assert.equal((await call("POST", "/api/attempts", attempt(joined.code, { ...missed, hard: [idea] }))).status, 201);
  const lowered = (await plan()).ideas as Record<string, number>;
  assert.ok(ideas[idea] - lowered[idea] > ideas[unticked] - lowered[unticked], `${idea} fell more than ${unticked}`);
  const exported = parseCsv((await call("GET", `/api/research/attempts.csv?class=${code}`, undefined, TEACHER)).body as string);
  assert.deepEqual(exported.map((r) => r.hard).filter(Boolean), [JSON.stringify([idea])]);
  // On signed numbers too (issue #265): a tick on one of its ideas is taken, and lowers that idea from its start (0.5).
  const signedSeed = Array.from({ length: 50 }, (_, i) => i + 1).find((s) => usesOf(exercise("integers", 2, s, en.pracWords)).includes("minusNeg"))!;
  assert.equal((await call("POST", "/api/attempts", attempt(joined.code, { ...missed, skill: "integers", level: 2, seed: signedSeed, hard: ["minusNeg"] }))).status, 201);
  assert.ok(((await plan()).ideas as Record<string, number>).minusNeg! < 0.5);
  assert.equal((await call("GET", `/api/students/${joined.code}/nope`)).status, 404);

  const csv = (await call("GET", `/api/research/attempts.csv?class=${code}`, undefined, TEACHER)).body as string;
  const [head, first] = csv.split("\n");
  const cols = head.split(",");
  const cells = first.split(",");
  assert.equal(cells[cols.indexOf("policy")], joined.condition);
  assert.equal(cells[cols.indexOf("predicted")], "0.71");

  // Deleting the student takes their answers out of the model as well.
  const before = (await plan()).state.answers.circles;
  const second = (await call("POST", "/api/students", { class: code })).body.code;
  await call("POST", "/api/attempts", attempt(second, { skill: "circles" }));
  const count = async () => (await call("GET", `/api/students/${second}/plan`)).body.state.answers.circles;
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
    INSERT INTO classes VALUES ('OLDOLD', 'old', '["adaptive","fixed"]', 1);
    INSERT INTO students VALUES (1, 'AAAA-BBBB', 'OLDOLD', 'fixed', 1);
    INSERT INTO attempts VALUES (1, 'old-attempt-1', 1, 'linear', 2, 5, 0, 'solved', 1, 0, 0, 0, 900, 900, '[{"input":"6","verdict":"correct","ms":900}]', 1, 1);
  `);
  db.close();
  const port = PORT + 1;
  await start(port, "old");
  const base = `http://127.0.0.1:${port}`;
  const plan = await call("GET", "/api/students/AAAA-BBBB/plan", undefined, {}, base);
  assert.equal(plan.status, 200);
  // No skills stored meant every skill there was: the 38 from before, not the ones added since.
  assert.equal(plan.body.skills.length, 38);
  assert.ok(!plan.body.skills.includes("inequalities"));
  assert.equal(plan.body.position, 0); // the old attempt counts as free practice
  assert.ok(plan.body.state.students.me);
  const csv = (await call("GET", "/api/research/attempts.csv", undefined, TEACHER, base)).body as string;
  assert.match(csv.split("\n")[1], /^1,s1,OLDOLD,policy,off,fixed,free,,/, "the class tested the policy, and the fixed condition was the arm without it");
  // The block being handed out when the server stopped goes on, as arms.
  const joined = [(await call("POST", "/api/students", { class: "OLDOLD" }, {}, base)).body, (await call("POST", "/api/students", { class: "OLDOLD" }, {}, base)).body];
  assert.deepEqual(joined.map((j) => [j.condition, j.feature, j.arm]), [["adaptive", "policy", "on"], ["fixed", "policy", "off"]]);
});

test("the dashboard: mastery for every student and skill, the two groups, and the logged predictions", async () => {
  const { code } = (await call("POST", "/api/classes", { name: "Dash", skills: ["linear", "expand"] }, TEACHER)).body;
  assert.equal((await call("GET", `/api/research/dashboard?class=${code}`)).status, 403);
  assert.equal((await call("GET", "/api/research/dashboard?class=NOPE22", undefined, TEACHER)).status, 404);
  const empty = (await call("GET", `/api/research/dashboard?class=${code}`, undefined, TEACHER)).body;
  assert.deepEqual(empty.students, []);
  assert.equal(empty.calibration.n, 0);
  assert.equal(empty.arms.on.rightFirst, null);

  const joined = [];
  for (let i = 0; i < 4; i++) joined.push((await call("POST", "/api/students", { class: code })).body);
  const right = { outcome: "solved", msTotal: 4000, answers: [{ verdict: "correct", ms: 4000 }] };
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
  for (const c of ["on", "off"]) {
    const g = d.arms[c];
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

test("the stuck list: ten questions without three right in a row, why, grouped, and off the list when seen or after a streak", async () => {
  const { code } = (await call("POST", "/api/classes", { skills: ["fractions"] }, TEACHER)).body;
  const join = async () => (await call("POST", "/api/students", { class: code })).body as { code: string };
  const [a, b, c] = [await join(), await join(), await join()];
  // A question whose numbers make a known mistake possible, and that mistake's answer.
  const seed = Array.from({ length: 200 }, (_, i) => i + 1).find((s) => trapInputs(exercise("fractions", 1, s, en.pracWords)).length)!;
  const trap = trapInputs(exercise("fractions", 1, seed, en.pracWords))[0];
  const wrong = (student: string, extra: Record<string, unknown> = {}) =>
    attempt(student, { skill: "fractions", level: 1, seed, outcome: "revealed", solutionViewed: true, answers: [{ verdict: "wrong", ms: 9000 }], ...extra });
  const post = async (x: unknown) => assert.equal((await call("POST", "/api/attempts", x)).status, 201);
  for (let i = 0; i < 10; i++) await post(wrong(a.code, { answers: [{ input: trap.input, verdict: "wrong", ms: 9000 }] }));
  for (let i = 0; i < 10; i++) await post(wrong(b.code, { hard: ["commonDenom"] }));
  for (let i = 0; i < 9; i++) await post(wrong(c.code));
  const stuck = async () => (await call("GET", `/api/research/dashboard?class=${code}`, undefined, TEACHER)).body.stuck as
    { key: string; rows: { student: string; code: string; skill: string; answers: number; through: number; because: { kind: string; mistake?: string; idea?: string; example?: { input: string } } | null }[] }[];
  let groups = await stuck();
  assert.deepEqual(groups.map((g) => g.key).sort(), [`mistake:${trap.id}`, "idea:commonDenom"].sort());
  const rowOf = (who: string) => groups.flatMap((g) => g.rows).find((r) => r.code === who);
  assert.equal(rowOf(c.code), undefined, "nine questions is not yet stuck");
  const ra = rowOf(a.code)!;
  assert.equal(ra.answers, 10);
  assert.equal(ra.skill, "fractions");
  assert.deepEqual([ra.because?.kind, ra.because?.mistake, ra.because?.example?.input], ["mistake", trap.id, trap.input]);
  assert.deepEqual([rowOf(b.code)!.because?.kind, rowOf(b.code)!.because?.idea], ["ticked", "commonDenom"]);

  // Marking seen: the teacher's, for an attempt of that student on that skill only; then off the list until ten more.
  const seen = (body: unknown, headers: Record<string, string> = TEACHER) => call("POST", `/api/classes/${code}/seen`, body, headers);
  assert.equal((await seen({ student: ra.student, skill: "fractions", through: ra.through }, {})).status, 403);
  assert.equal((await seen({ student: ra.student, skill: "fractions", through: rowOf(b.code)!.through })).status, 404);
  assert.equal((await seen({ student: ra.student, skill: "linear", through: ra.through })).status, 404);
  assert.equal((await seen({ student: "x1", skill: "fractions", through: ra.through })).status, 404);
  assert.equal((await seen({ student: ra.student, skill: "fractions", through: ra.through })).status, 204);
  assert.equal((await seen({ student: ra.student, skill: "fractions", through: ra.through - 3 })).status, 204, "an older mark doesn't bring them back");
  groups = await stuck();
  assert.equal(rowOf(a.code), undefined);
  for (let i = 0; i < 10; i++) await post(wrong(a.code));
  groups = await stuck();
  assert.equal(rowOf(a.code)!.answers, 10, "back after ten more");
  // Three right in a row take a student off the list.
  for (let i = 0; i < 3; i++) await post(attempt(b.code, { skill: "fractions", level: 1, seed, answers: [{ verdict: "correct", ms: 9000 }] }));
  groups = await stuck();
  assert.equal(rowOf(b.code), undefined);
});

test("the protocol: phases and sessions, counterbalanced forms, one answer per test question, results on the dashboard", async () => {
  const skills = ["linear", "expand", "factor"];
  assert.equal((await call("POST", "/api/classes", { skills, testLength: 3 }, TEACHER)).status, 400);
  assert.equal((await call("POST", "/api/classes", { skills, testLength: 31 }, TEACHER)).status, 400);
  const { code, testLength, phase } = (await call("POST", "/api/classes", { name: "Proto", skills, testLength: 6 }, TEACHER)).body;
  assert.deepEqual([testLength, phase], [6, "open"]);

  // Phases are the teacher's; a session needs its length.
  const move = (body: unknown, headers: Record<string, string> = TEACHER) => call("POST", `/api/classes/${code}/phase`, body, headers);
  assert.equal((await move({ phase: "pretest" }, {})).status, 403);
  assert.equal((await move({ phase: "lunch" })).status, 400);
  assert.equal((await move({ phase: "session" })).status, 400);
  assert.equal((await call("POST", "/api/classes/NOPE22/phase", { phase: "open" }, TEACHER)).status, 404);
  const session = (await move({ phase: "session", minutes: 20 })).body;
  assert.ok(Math.abs(session.sessionEnds - (Date.now() + 20 * 60_000)) < 5000);

  const students: { code: string; condition: string }[] = [];
  for (let i = 0; i < 8; i++) students.push((await call("POST", "/api/students", { class: code })).body);
  const plans = await Promise.all(students.map(async (s) => (await call("GET", `/api/students/${s.code}/plan`)).body));
  assert.deepEqual([plans[0].phase, plans[0].sessionEnds, plans[0].testLength, plans[0].class], ["session", session.sessionEnds, 6, code]);
  // Within each condition, half take form A first.
  for (const c of ["adaptive", "fixed"]) {
    const firsts = plans.filter((p) => p.condition === c).map((p) => p.tests.pre.form);
    assert.deepEqual([...firsts].sort(), ["A", "A", "B", "B"], c);
    assert.ok(plans.filter((p) => p.condition === c).every((p) => p.tests.post.form !== p.tests.pre.form));
  }
  await move({ phase: "pretest" });
  assert.equal((await call("GET", `/api/students/${students[0].code}/plan`)).body.phase, "pretest");

  let k = 0;
  const formOf = (student: string, phase: "pre" | "post") => plans[students.findIndex((s) => s.code === student)]?.tests[phase].form;
  /** A test answer; without an input, one the checker gives this verdict (the server marks it again). */
  const answer = (student: string, phase: string, item: number, verdict: string, input?: string) => {
    const form = (phase === "pre" || phase === "post") && formOf(student, phase);
    const q = form ? testItems(code, skills as never, form, 6)[item] : undefined;
    const typedIn = input ?? (q && verdict !== "skipped" ? typed(q, verdict) : "");
    return call("POST", "/api/tests", { clientId: `t-${Date.now()}-${k++}`, student, phase, item, input: typedIn, verdict, retries: 0, ms: 9000 });
  };
  const s0 = students[0].code;
  // The post-test hasn't started: nothing can be answered on it yet.
  const early = await answer(s0, "post", 0, "correct");
  assert.deepEqual([early.status, early.body.error], [400, "the post-test hasn't started"]);
  assert.equal((await answer(s0, "pre", 6, "correct", "1")).status, 400); // only 6 questions: 0–5
  assert.equal((await answer(s0, "mid", 0, "correct")).status, 400);
  assert.equal((await answer(s0, "pre", 0, "great")).status, 400);
  assert.equal((await answer("AAAA-BBBB", "pre", 0, "correct")).status, 404);
  // The browser says correct; the server's checker would have sent it back (it can't be read), and that is what is
  // stored, with what the browser said beside it.
  assert.equal((await answer(s0, "pre", 0, "correct", "=1+2")).status, 201);
  const again = await answer(s0, "pre", 0, "wrong");
  assert.deepEqual([again.status, again.body.stored], [200, false]); // the first answer stands

  // Everyone takes both tests. Pre-test: 3 of 6 right (2 or 4 for some); post-test: adaptive gains more.
  const prePattern = [3, 2, 3, 4];
  const postPattern = { adaptive: [5, 6, 4, 5], fixed: [4, 3, 4, 5] } as Record<string, number[]>;
  const seen = { adaptive: 0, fixed: 0 } as Record<string, number>;
  const index = new Map<string, number>();
  for (const s of students) {
    const i = seen[s.condition]++;
    index.set(s.code, i);
    // s0's first answer is in already, and wrong, so one of their later ones is right instead.
    const right = (item: number) => (s.code === s0 ? item >= 1 && item <= prePattern[i] : item < prePattern[i]);
    for (let item = 0; item < 6; item++) if (!(s.code === s0 && item === 0)) await answer(s.code, "pre", item, right(item) ? "correct" : "wrong");
  }
  await move({ phase: "posttest" });
  for (const s of students)
    for (let item = 0; item < 6; item++) await answer(s.code, "post", item, item < postPattern[s.condition][index.get(s.code)!] ? "correct" : item === 5 ? "skipped" : "wrong");
  const after = (await call("GET", `/api/students/${s0}/plan`)).body;
  assert.deepEqual(after.tests.pre.answered, [0, 1, 2, 3, 4, 5]);

  // The server worked out each question from the form; what was typed comes back as a JSON string.
  const csv = (await call("GET", `/api/research/tests.csv?class=${code}`, undefined, TEACHER)).body as string;
  const [head, ...lines] = csv.trim().split("\n");
  assert.equal(lines.length, 8 * 12);
  const cols = head.split(",");
  const first = lines.find((l) => l.includes('"""=1+2"""'))!;
  assert.ok(first, "the typed answer is quoted, not a formula");
  const cells = first.match(/("([^"]|"")*"|[^,]*)(,|$)/g)!.map((c) => c.replace(/,$/, ""));
  const row = Object.fromEntries(cols.map((c, i) => [c, cells[i]]));
  const q = testItems(code, skills as never, plans[0].tests.pre.form, 6)[0];
  assert.deepEqual([row.phase, row.form, row.item, row.skill, row.level, row.seed], ["pre", plans[0].tests.pre.form, "0", q.skill, String(q.level), String(q.seed)]);
  assert.deepEqual([row.verdict, row.correct, row.client_verdict, row.late], ["form", "0", "correct", "0"], "marked by the server, not the browser");
  assert.ok(lines.every((l) => !l.includes('"""=1+2"""') === /,,0,0,0,\d+,[^,]+$/.test(l)), "the browser agreed everywhere else"); // client_verdict, late, paper, retries

  // Practice time counts the questions class practice chose.
  await call("POST", "/api/attempts", attempt(s0, { policy: students[0].condition, msTotal: 120_000 }));
  const d = (await call("GET", `/api/research/dashboard?class=${code}`, undefined, TEACHER)).body;
  assert.deepEqual([d.class.phase, d.class.testLength], ["posttest", 6]);
  const me = d.students.find((x: { code: string }) => x.code === s0);
  assert.equal(me.practiceMinutes, 2);
  assert.deepEqual([me.pre.complete, me.post.complete], [true, true]);
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  for (const [c, arm] of [["adaptive", "on"], ["fixed", "off"]]) {
    const g = d.arms[arm];
    assert.deepEqual([g.pre.n, g.post.n, g.pre.finished, g.post.finished, g.delayed.finished], [4, 4, 4, 4, 0]);
    close(g.pre.mean, mean(prePattern) / 6);
    close(g.post.mean, mean(postPattern[c]) / 6);
  }
  assert.ok(d.tests.effect.post > 0, `d = ${d.tests.effect.post}`);
  assert.ok(d.tests.started.pre && d.tests.started.post && d.tests.started.delayed === null, "the delayed post-test hasn't started");
  assert.equal(d.tests.forms.A.n + d.tests.forms.B.n, 8);

  // Deleting a student takes their test answers too.
  await call("DELETE", `/api/students/${s0}`);
  const left = (await call("GET", `/api/research/tests.csv?class=${code}`, undefined, TEACHER)).body as string;
  assert.equal(left.trim().split("\n").length - 1, 7 * 12);
});

test("a class tests any feature: half get it, at random in blocks, and the arm without it can't send answers that show it", async () => {
  assert.equal((await call("POST", "/api/classes", { name: "x", feature: "magic" }, TEACHER)).status, 400);
  /** A class testing the feature, with eight students: two of each arm in each block of four. */
  const testing = async (feature: string) => {
    const made = (await call("POST", "/api/classes", { name: feature, skills: ["fractions"], feature }, TEACHER)).body;
    assert.equal(made.feature, feature);
    const joined: { code: string; condition: string; feature: string; arm: string }[] = [];
    for (let i = 0; i < 8; i++) joined.push((await call("POST", "/api/students", { class: made.code })).body);
    for (let b = 0; b < 8; b += 4) assert.deepEqual(joined.slice(b, b + 4).map((j) => j.arm).sort(), ["off", "off", "on", "on"]);
    assert.ok(joined.every((j) => j.condition === "adaptive" && j.feature === feature), "the adaptive policy for both arms");
    return { code: made.code as string, on: joined.find((j) => j.arm === "on")!.code, off: joined.find((j) => j.arm === "off")!.code };
  };
  const spaced = await testing("spaced");
  const plan = (await call("GET", `/api/students/${spaced.off}/plan`)).body;
  assert.deepEqual([plan.feature, plan.arm, plan.condition], ["spaced", "off", "adaptive"]);
  const me = (await call("GET", `/api/students/${spaced.off}`)).body;
  assert.deepEqual([me.feature, me.arm], ["spaced", "off"], "signing back in tells the browser the arm");
  // A spaced review from the arm without it is refused; class practice is adaptive for both arms.
  const review = { policy: "spaced", skill: "fractions", level: 1, seed: 7 };
  assert.equal((await call("POST", "/api/attempts", attempt(spaced.off, review))).status, 400);
  assert.equal((await call("POST", "/api/attempts", attempt(spaced.on, review))).status, 201);
  assert.equal((await call("POST", "/api/attempts", attempt(spaced.off, { policy: "adaptive" }))).status, 201);
  assert.equal((await call("POST", "/api/attempts", attempt(spaced.off, { policy: "fixed" }))).status, 400);

  // Steps after a miss, and asking what was hard: each refused only from the arm without it, in a class testing it.
  const seed = (() => {
    for (let k = 1; ; k++) if (stepsOf(exercise("fractions", 1, k, en.pracWords), en.pracWords).length) return k;
  })();
  const missed = { policy: "free", skill: "fractions", level: 1, seed, outcome: "revealed", answers: [{ verdict: "wrong", ms: 9000 }] };
  const withSteps = { ...missed, steps: [{ answers: [], shown: true }] };
  const withHard = { ...missed, hard: ["commonDenom"] };
  const steps = await testing("steps");
  assert.deepEqual((await call("POST", "/api/attempts", attempt(steps.off, withSteps))).body, { error: "invalid steps" });
  assert.equal((await call("POST", "/api/attempts", attempt(steps.on, withSteps))).status, 201);
  assert.equal((await call("POST", "/api/attempts", attempt(steps.off, withHard))).status, 201, "what was hard isn't under test here");
  const hard = await testing("hard");
  assert.deepEqual((await call("POST", "/api/attempts", attempt(hard.off, withHard))).body, { error: "invalid hard" });
  assert.equal((await call("POST", "/api/attempts", attempt(hard.on, withHard))).status, 201);
  assert.equal((await call("POST", "/api/attempts", attempt(spaced.off, withSteps))).status, 201, "nor steps in a class testing spaced review");

  // The class list and the dashboard count the arms; the export says each attempt's feature and arm.
  const row = ((await call("GET", "/api/classes", undefined, TEACHER)).body as { code: string; feature: string; on: number; off: number }[]).find((c) => c.code === spaced.code)!;
  assert.deepEqual([row.feature, row.on, row.off], ["spaced", 4, 4]);
  const d = (await call("GET", `/api/research/dashboard?class=${spaced.code}`, undefined, TEACHER)).body;
  assert.deepEqual([d.class.feature, d.arms.on.students, d.arms.off.students, d.arms.on.answered, d.arms.off.answered], ["spaced", 4, 4, 1, 2]);
  assert.equal(d.arms.off.classPractice, 1, "class practice is what the student's condition chose");
  const rows = parseCsv((await call("GET", `/api/research/attempts.csv?class=${spaced.code}`, undefined, TEACHER)).body as string);
  assert.deepEqual(rows.map((r) => [r.feature, r.arm, r.condition, r.policy]), [["spaced", "on", "adaptive", "spaced"], ["spaced", "off", "adaptive", "adaptive"], ["spaced", "off", "adaptive", "free"]]);
});

test("the delayed post-test: form C once the class reaches it, and the arms compared by intention to treat", async () => {
  const skills = ["linear"];
  const { code } = (await call("POST", "/api/classes", { name: "Kept", skills, testLength: 4, feature: "spaced" }, TEACHER)).body;
  const joined: { code: string; arm: string }[] = [];
  for (let i = 0; i < 4; i++) joined.push((await call("POST", "/api/students", { class: code })).body);
  const [on1] = joined.filter((j) => j.arm === "on").map((j) => j.code);
  const [off1, off2] = joined.filter((j) => j.arm === "off").map((j) => j.code);
  let k = 0;
  /** The student's answers on a test: the first `right` of `answered` questions right, the rest wrong. */
  const sit = async (student: string, phase: string, answered: number, right: number) => {
    const form = (await call("GET", `/api/students/${student}/plan`)).body.tests[phase].form;
    for (const [item, q] of testItems(code, skills as never, form, 4).slice(0, answered).entries()) {
      const verdict = item < right ? "correct" : "wrong";
      const sent = await call("POST", "/api/tests", { clientId: `kept-${Date.now()}-${k++}`, student, phase, item, input: typed(q, verdict), verdict, retries: 0, ms: 9000 });
      assert.equal(sent.status, 201, JSON.stringify(sent.body));
    }
    return form;
  };
  const move = (phase: string) => call("POST", `/api/classes/${code}/phase`, { phase }, TEACHER);
  await move("posttest");
  const early = await call("POST", "/api/tests", { clientId: `kept-early-${Date.now()}`, student: on1, phase: "delayed", item: 0, input: "1", verdict: "wrong", retries: 0, ms: 9000 });
  assert.deepEqual([early.status, early.body.error], [400, "the delayed post-test hasn't started"]);
  // The post-test: on1 gets all four, the other student with spaced review never sits it; both off students get two.
  await sit(on1, "post", 4, 4);
  await sit(off1, "post", 4, 2);
  await sit(off2, "post", 4, 2);
  assert.equal((await move("delayed")).status, 200);
  const plan = (await call("GET", `/api/students/${on1}/plan`)).body;
  assert.deepEqual([plan.phase, plan.tests.delayed.form, plan.tests.delayed.answered], ["delayed", "C", []]);
  // A week on: on1 keeps three, off1 one, off2 answers two questions (one right) and stops.
  assert.equal(await sit(on1, "delayed", 4, 3), "C");
  await sit(off1, "delayed", 4, 1);
  await sit(off2, "delayed", 2, 1);
  assert.deepEqual((await call("GET", `/api/students/${off2}/plan`)).body.tests.delayed.answered, [0, 1]);

  const d = (await call("GET", `/api/research/dashboard?class=${code}`, undefined, TEACHER)).body;
  const { on, off } = d.arms;
  // Every student counts: the one who sat nothing scores 0; off2's unanswered questions count as wrong.
  assert.deepEqual([on.post.n, on.post.finished, off.post.n, off.post.finished], [2, 1, 2, 2]);
  close(on.post.mean, 0.5);
  close(off.post.mean, 0.5);
  assert.deepEqual([on.delayed.finished, off.delayed.finished], [1, 1]);
  close(on.delayed.mean, (3 / 4 + 0) / 2);
  close(off.delayed.mean, (1 / 4 + 1 / 4) / 2);
  close(d.tests.effect.delayed, (0.375 - 0.25) / Math.sqrt(((3 / 4 - 0.375) ** 2 * 2) / 2));
  assert.equal(d.tests.effect.post, 0);
  assert.equal(d.tests.started.pre, null, "this class skipped the pre-test");
  assert.ok(d.tests.started.delayed >= d.tests.started.post);
  const me = d.students.find((x: { code: string }) => x.code === off2);
  assert.deepEqual([me.delayed.form, me.delayed.answered, me.delayed.complete], ["C", 2, false]);
  close(me.delayed.score, 1 / 4);

  const tests = parseCsv((await call("GET", `/api/research/tests.csv?class=${code}`, undefined, TEACHER)).body as string);
  const delayed = tests.filter((t) => t.phase === "delayed");
  assert.equal(delayed.length, 4 + 4 + 2);
  assert.ok(delayed.every((t) => t.form === "C" && t.feature === "spaced" && ["on", "off"].includes(t.arm)));
});

test("faded worked examples: checked, stored, replayed into the plan's fading, kept from the model, and switched off for an arm", async () => {
  const { code } = (await call("POST", "/api/classes", { name: "Fade", skills: ["tangent"] }, TEACHER)).body;
  const s = (await call("POST", "/api/students", { class: code })).body.code;
  const q = { skill: "tangent", level: 3, seed: 5 };
  const steps = stepsOf(exercise("tangent", 3, 5, en.pracWords), en.pracWords);
  assert.equal(steps.length, 4);
  const given = { answers: [], shown: true };
  const right = (i: number) => ({ answers: [{ input: steps[i].plain, verdict: "correct", ms: 9000 }], shown: false });
  const fading = async () => (await call("GET", `/api/students/${s}/plan`)).body.fading;
  assert.deepEqual(await fading(), {});

  // Missed whole: the fading starts with the last step for the student.
  const missed = { ...q, policy: "free", predicted: 0.5, outcome: "revealed", answers: [{ verdict: "wrong", ms: 9000 }] };
  assert.equal((await call("POST", "/api/attempts", attempt(s, missed))).status, 201);
  assert.deepEqual(await fading(), { tangent: 1 });
  assert.equal((await call("POST", "/api/attempts", attempt(s, { ...missed, steps: [right(0)] }))).body.error, "invalid steps", "a calculus miss isn't worked in steps");

  const example = { ...q, policy: "free", predicted: 0.9, outcome: "solved", answers: [], faded: 3, steps: [given, given, given, right(3)] };
  const refused: [string, Record<string, unknown>][] = [
    ["faded", { faded: 0 }],
    ["faded", { faded: 4, steps: [given, given, given, given, right(3)] }],
    ["faded", { answers: [{ input: steps[3].plain, verdict: "correct", ms: 1 }] }],
    ["faded", { steps: [given, given, given] }],
    ["steps", { steps: [given, right(1), given, right(3)] }],
    ["outcome", { outcome: "revealed" }],
    ["outcome", { steps: [given, given, given, { answers: [{ input: "y = 1", verdict: "wrong", ms: 1 }], shown: true }] }],
  ];
  for (const [error, change] of refused) {
    const res = await call("POST", "/api/attempts", { ...attempt(s, example), ...change });
    assert.deepEqual([res.status, res.body.error], [400, `invalid ${error}`], JSON.stringify(change));
  }
  // Left before the last step: skipped. Done right: the student does one more step next time.
  assert.equal((await call("POST", "/api/attempts", { ...attempt(s, example), outcome: "skipped", steps: [given, given, given] })).status, 400, "nothing worked");
  assert.equal((await call("POST", "/api/attempts", { ...attempt(s, example) })).status, 201);
  assert.deepEqual(await fading(), { tangent: 2 });
  const wrongStep = { answers: [{ input: "12345", verdict: "wrong", ms: 1 }], shown: true };
  assert.equal((await call("POST", "/api/attempts", { ...attempt(s, { ...example, faded: 2, steps: [given, given, wrongStep, right(3)] }) })).status, 201);
  assert.deepEqual(await fading(), { tangent: 1 }, "a step missed: one back");

  // The export says how many steps were given; the model and the dashboard count only the question asked whole.
  const rows = parseCsv((await call("GET", `/api/research/attempts.csv?class=${code}`, undefined, TEACHER)).body as string);
  assert.deepEqual(rows.map((r) => [r.faded, r.outcome]), [["", "revealed"], ["3", "solved"], ["2", "solved"]]);
  assert.equal(JSON.parse(rows[2].steps)[2].answers[0].verdict, "wrong", "each step marked again by the server");
  const d = (await call("GET", `/api/research/dashboard?class=${code}`, undefined, TEACHER)).body;
  assert.deepEqual([d.students[0].answered, d.students[0].rightFirst, d.calibration.n], [3, 0, 1]);
  assert.equal(d.students[0].mastery.tangent.n, 1);

  // In a class testing the fading, the arm without it can't send a faded example.
  const arms = (await call("POST", "/api/classes", { name: "Fade arms", skills: ["tangent"], feature: "faded" }, TEACHER)).body.code;
  const joined = [];
  for (let i = 0; i < 4; i++) joined.push((await call("POST", "/api/students", { class: arms })).body);
  const without = joined.find((j) => j.arm === "off").code;
  const withIt = joined.find((j) => j.arm === "on").code;
  assert.deepEqual((await call("POST", "/api/attempts", attempt(without, example))).body, { error: "invalid faded" });
  assert.equal((await call("POST", "/api/attempts", attempt(withIt, example))).status, 201);
});

test("targeted step-down: only the arm with it, two early misses step down to the weakest idea, three questions, then back, as the browser has it", async () => {
  const code = (await call("POST", "/api/classes", { name: "Step down", skills: ["fractions"], feature: "stepdown" }, TEACHER)).body.code;
  const joined = [];
  for (let i = 0; i < 4; i++) joined.push((await call("POST", "/api/students", { class: code })).body);
  const on = joined.find((j) => j.arm === "on").code, off = joined.find((j) => j.arm === "off").code;
  const plan = async (s: string) => (await call("GET", `/api/students/${s}/plan`)).body;
  const browser = toClassPlan(await plan(on));
  assert.deepEqual(browser.stepDown, { early: {} });
  const send = async (s: string, extra: Record<string, unknown>) => {
    const a = attempt(s, { skill: "fractions", level: 1, policy: "adaptive", predicted: 0.7, ...extra });
    const res = await call("POST", "/api/attempts", a);
    if (s === on && res.status === 201) applyAttempt(browser, a as unknown as Attempt);
    return res;
  };
  const wrong = { outcome: "revealed", answers: [{ verdict: "wrong", ms: 9000 }] };
  const right = { answers: [{ verdict: "correct", ms: 9000 }] };

  // Right, then two wrong: an early failure, stepped down to the weakest idea, the browser and the server alike.
  await send(on, { seed: 1, ...right });
  await send(on, { seed: 2, ...wrong });
  assert.equal((await plan(on)).stepDown.now, undefined, "one miss is not yet a failure");
  await send(on, { seed: 3, ...wrong });
  const now = (await plan(on)).stepDown.now;
  assert.equal(now.skill, "fractions");
  assert.equal(now.left, 3);
  assert.deepEqual((await plan(on)).stepDown, browser.stepDown);

  // A step-down question only in the arm with it, and only in a class testing it.
  const step = { policy: "stepdown", seed: 4, ...right };
  assert.deepEqual((await send(off, step)).body, { error: "invalid policy" });
  assert.equal((await plan(off)).stepDown.now, undefined, "the arm without it has none under way");
  const other = (await call("POST", "/api/classes", { name: "Spaced", skills: ["fractions"], feature: "spaced" }, TEACHER)).body.code;
  const elsewhere = (await call("POST", "/api/students", { class: other })).body.code;
  assert.deepEqual((await send(elsewhere, step)).body, { error: "invalid policy" });

  // Three questions on the idea, then back to the skill; it steps down once.
  for (const seed of [4, 5, 6]) assert.equal((await send(on, { ...step, seed })).status, 201);
  assert.deepEqual((await plan(on)).stepDown, { early: { fractions: { answered: 3, wrong: 2 } }, back: "fractions" });
  await send(on, { seed: 7, ...wrong });
  await send(on, { seed: 8, ...wrong });
  assert.deepEqual((await plan(on)).stepDown, { early: { fractions: { answered: 3, wrong: 2 } } });
  assert.deepEqual((await plan(on)).stepDown, browser.stepDown);

  // The teacher sees both arms, and how many step-down questions each had.
  const d = (await call("GET", `/api/research/dashboard?class=${code}`, undefined, TEACHER)).body;
  assert.deepEqual([d.class.feature, d.arms.on.stepDown, d.arms.off.stepDown], ["stepdown", 3, 0]);
  const mine = d.students.find((r: { code: string }) => r.code === on);
  assert.equal(mine.practiceMinutes, (8 * 41000) / 60_000, "step-down questions are class practice time");
});

test("the server marks every answer itself, and keeps the browser's verdict where they differ", async () => {
  const { code } = await newClass();
  const student = (await call("POST", "/api/students", { class: code })).body.code;
  // The browser claims a right first answer for 12345; the answer is 6.
  const claimed = { outcome: "solved", answers: [{ input: "12345", verdict: "correct", ms: 5000 }] };
  assert.equal((await call("POST", "/api/attempts", attempt(student, claimed))).status, 201);
  assert.equal((await call("POST", "/api/attempts", attempt(student))).status, 201);
  const rows = parseCsv((await call("GET", `/api/research/attempts.csv?class=${code}`, undefined, TEACHER)).body as string);
  assert.deepEqual([rows[0].first_correct, rows[0].wrongs, rows[0].remarked, rows[0].outcome], ["0", "1", "1", "solved"]);
  assert.deepEqual(JSON.parse(rows[0].answers), [{ input: "12345", verdict: "wrong", ms: 5000, client: "correct" }]);
  assert.deepEqual([rows[1].first_correct, rows[1].wrongs, rows[1].retries, rows[1].remarked], ["0", "1", "1", "0"], "the browser agreed");
  assert.ok(!rows[1].answers.includes("client"));
  // The model learns from the server's verdict: the claimed right answer counts as a miss.
  assert.deepEqual(observationsFromCsv(csvOf(rows)).map((o) => o.correct), [false, false]);
});

test("steps worked after a wrong answer are checked, marked again, replayed into the ideas and exported", async () => {
  const { code } = await newClass("Steps");
  const [withSteps, without] = [(await call("POST", "/api/students", { class: code })).body.code, (await call("POST", "/api/students", { class: code })).body.code];
  // A sum over two denominators: its first step is their lowest common denominator.
  const seed = (() => {
    for (let s = 1; ; s++) if (stepsOf(exercise("fractions", 1, s, en.pracWords), en.pracWords)[0]?.prompt === en.pracWords.prompts.fracLcd) return s;
  })();
  const steps = stepsOf(exercise("fractions", 1, seed, en.pracWords), en.pracWords);
  const missed = { policy: "free", skill: "fractions", level: 1, seed, outcome: "revealed", answers: [{ verdict: "wrong", ms: 9000 }] };
  const step = (input: string, verdict: string, shown = false) => ({ answers: [{ input, verdict, ms: 12000 }], shown });
  const refused = [
    [],
    [{ answers: [], shown: false }],
    steps.map(() => ({ answers: [], shown: true })).concat([{ answers: [], shown: true }]),
    [{ answers: [{ input: "1", verdict: "correct", ms: 1 }, { input: "2", verdict: "wrong", ms: 2 }], shown: false }],
    "lcd",
  ];
  for (const bad of refused) assert.equal((await call("POST", "/api/attempts", attempt(withSteps, { ...missed, steps: bad }))).status, 400, JSON.stringify(bad));
  const right = { ...missed, outcome: "solved", answers: [{ verdict: "correct", ms: 9000 }] };
  assert.equal((await call("POST", "/api/attempts", attempt(withSteps, { ...right, steps: [step("1", "wrong", true)] }))).status, 400, "no steps after a right answer");
  assert.equal((await call("POST", "/api/attempts", attempt(withSteps, { ...missed, skill: "linear", seed: 1, steps: [step("1", "wrong", true)] }))).status, 400, "no steps on a question without them");

  // The first step missed (the browser claimed it right), the second right.
  const worked = [step("12345", "correct", true), step(steps[1].plain, "correct")];
  assert.equal((await call("POST", "/api/attempts", attempt(withSteps, { ...missed, steps: worked }))).status, 201);
  assert.equal((await call("POST", "/api/attempts", attempt(without, missed))).status, 201);
  const ideas = async (student: string) => (await call("GET", `/api/students/${student}/plan`)).body.ideas as Record<string, number>;
  const [a, b] = [await ideas(withSteps), await ideas(without)];
  assert.ok(a.commonDenom < b.commonDenom, "the step missed lowers its idea");
  assert.ok(a.equivalent > b.equivalent, "the step done right raises its idea");
  const rows = parseCsv((await call("GET", `/api/research/attempts.csv?class=${code}`, undefined, TEACHER)).body as string);
  const stored = rows.find((r) => r.steps)!;
  assert.deepEqual(JSON.parse(stored.steps), [
    { answers: [{ input: "12345", verdict: "wrong", ms: 12000, client: "correct" }], shown: true },
    { answers: [{ input: steps[1].plain, verdict: "correct", ms: 12000 }], shown: false },
  ]);
  assert.equal(stored.remarked, "1");
  assert.equal(rows.filter((r) => !r.steps).length, 1);
});

test("the dashboard and the planned analysis score every test alike, across classes given tests of different lengths", async () => {
  const skills = ["linear", "expand", "factor"];
  /** A class of four whose tests have `length` questions; each student gets `right` of them right, and the last stops the post-test short. */
  async function sitClass(length: number, right: (student: number, phase: "pre" | "post") => number) {
    const { code } = (await call("POST", "/api/classes", { name: `Len${length}`, skills, testLength: length }, TEACHER)).body;
    const students: string[] = [];
    for (let i = 0; i < 4; i++) students.push((await call("POST", "/api/students", { class: code })).body.code);
    let k = 0;
    for (const phase of ["pre", "post"] as const) {
      await call("POST", `/api/classes/${code}/phase`, { phase: `${phase}test` }, TEACHER);
      for (const [i, student] of students.entries()) {
        const form = (await call("GET", `/api/students/${student}/plan`)).body.tests[phase].form;
        const answered = phase === "post" && i === 3 ? length - 1 : length;
        for (const [item, q] of testItems(code, skills as never, form, length).slice(0, answered).entries()) {
          const verdict = item < right(i, phase) ? "correct" : "wrong";
          const sent = await call("POST", "/api/tests", { clientId: `len-${Date.now()}-${length}-${k++}`, student, phase, item, input: typed(q, verdict), verdict, retries: 0, ms: 9000 });
          assert.equal(sent.status, 201, JSON.stringify(sent.body));
        }
      }
    }
    return code;
  }
  const classes = [await sitClass(4, (i, phase) => (phase === "pre" ? i % 3 : 1 + (i % 4))), await sitClass(6, (i, phase) => (phase === "pre" ? 1 + i : 6 - i))];

  // The planned analysis on the export of both classes together, as a study with several classes would run it.
  const rows = parseCsv((await call("GET", "/api/research/tests.csv", undefined, TEACHER)).body as string).filter((r) => classes.includes(r.class));
  const scores = new Map(scoresFromTests(rows).map((s) => [s.student, s]));
  const analysis = analyseStudy([...scores.values()]);
  assert.deepEqual(analysis.testLengths, [4, 6]);
  type Test = { score: number; complete: boolean } | null;
  const finished: { condition: string; gain: number }[] = [];
  for (const code of classes) {
    const d = (await call("GET", `/api/research/dashboard?class=${code}`, undefined, TEACHER)).body;
    for (const student of d.students as { id: string; condition: string; pre: Test; post: Test }[]) {
      const mine = scores.get(student.id)!;
      for (const phase of ["pre", "post"] as const) {
        const t = mine[phase]!;
        assert.deepEqual([t.correct / mine.testLength!, t.answered >= mine.testLength!], [student[phase]!.score, student[phase]!.complete], `${student.id} ${phase}`);
      }
      if (student.pre!.complete && student.post!.complete) finished.push({ condition: student.condition, gain: student.post!.score - student.pre!.score });
    }
  }
  // Every class's last student is left out of both, for an unfinished post-test, and the gains agree.
  for (const c of ["adaptive", "fixed"]) {
    const mine = finished.filter((f) => f.condition === c);
    assert.equal(analysis.students[c].complete, mine.length, c);
    close(analysis.means[c].gain, mine.reduce((a, f) => a + f.gain, 0) / mine.length);
  }
  assert.equal(finished.length, 6);
});

test("answers that come long after their phase are kept and marked late", async () => {
  const { code } = (await call("POST", "/api/classes", { name: "Late", skills: ["linear"], testLength: 4 }, TEACHER)).body;
  const s = (await call("POST", "/api/students", { class: code })).body;
  const plan = (await call("GET", `/api/students/${s.code}/plan`)).body;
  await call("POST", `/api/classes/${code}/phase`, { phase: "pretest" }, TEACHER);
  await call("POST", `/api/classes/${code}/phase`, { phase: "closed" }, TEACHER);
  // Move the class's history back an hour: open and the pre-test ended long ago (as when a tablet was offline).
  const db = new DatabaseSync(join(dir, "data", "boards.db"));
  db.prepare("UPDATE class_phases SET started_at = started_at - 3600000 WHERE class_code = ? AND phase <> 'closed'").run(code);
  db.prepare("UPDATE class_phases SET started_at = started_at - 1800000 WHERE class_code = ? AND phase = 'closed'").run(code);
  db.close();
  const q = testItems(code, ["linear"], plan.tests.pre.form, 4)[0];
  const test = { clientId: `late-${Date.now()}`, student: s.code, phase: "pre", item: 0, input: typed(q, "correct"), verdict: "correct", retries: 0, ms: 9000 };
  assert.equal((await call("POST", "/api/tests", test)).status, 201);
  assert.equal((await call("POST", "/api/attempts", attempt(s.code, { policy: s.condition }))).status, 201);
  assert.equal((await call("POST", "/api/attempts", attempt(s.code))).status, 201); // free practice is never late
  const tests = parseCsv((await call("GET", `/api/research/tests.csv?class=${code}`, undefined, TEACHER)).body as string);
  assert.deepEqual([tests[0].verdict, tests[0].late], ["correct", "1"]);
  const attempts = parseCsv((await call("GET", `/api/research/attempts.csv?class=${code}`, undefined, TEACHER)).body as string);
  assert.deepEqual(attempts.map((a) => [a.policy, a.late]), [[s.condition, "1"], ["free", "0"]]);
});

test("phase windows: each phase until the next, a session until its time is up, and a grace after", () => {
  const db = new DatabaseSync(":memory:");
  initResearch(db);
  db.exec("INSERT INTO classes (code, name, block, created_at) VALUES ('WIN234', 'w', '[]', 0)");
  logPhase(db, "WIN234", "open", null, 0);
  logPhase(db, "WIN234", "session", 30 * 60_000, 10 * 60_000);
  logPhase(db, "WIN234", "posttest", null, 60 * 60_000);
  const w = phaseWindows(db, "WIN234");
  assert.deepEqual(w, [
    { phase: "open", start: 0, end: 10 * 60_000 },
    { phase: "session", start: 10 * 60_000, end: 30 * 60_000 },
    { phase: "posttest", start: 60 * 60_000, end: Infinity },
  ]);
  const at = (min: number) => min * 60_000;
  assert.ok(onTime(w, PRACTICE_PHASES, at(20)));
  assert.ok(onTime(w, PRACTICE_PHASES, at(30) + GRACE - 1), "the grace after the session's time is up");
  assert.ok(!onTime(w, PRACTICE_PHASES, at(30) + GRACE));
  assert.ok(!onTime(w, ["pretest"], at(70)), "never in the pre-test");
  assert.ok(onTime(w, ["posttest"], at(600)));

  // A class from before the log: its history is rebuilt from its stored test answers, so a pre-test answer still
  // waiting in a browser is kept, not refused as if the pre-test had never run. When the pre-test ended isn't known,
  // so it runs until the update.
  db.exec(`
    INSERT INTO classes (code, name, block, created_at) VALUES ('OLD234', 'old', '[]', 1000);
    INSERT INTO students (id, code, class_code, condition, created_at) VALUES (90, 'OLDS-TUDE', 'OLD234', 'fixed', 1000);
    INSERT INTO test_responses (client_id, student_id, phase, form, item, skill, level, seed, input, verdict, retries, ms, created_at)
      VALUES ('old-test-1', 90, 'pre', 'A', 0, 'linear', 2, 5, '6', 'correct', 0, 9, 5000);
  `);
  initProtocol(db);
  const old = phaseWindows(db, "OLD234");
  assert.deepEqual(old.map((x) => [x.phase, x.start]), [["open", 1000], ["pretest", 5000], ["open", old[2].start]]);
  assert.ok(old[2].start >= Date.now() - 60_000);
  assert.ok(old.some((x) => x.phase === "pretest" && x.start <= Date.now()), "the pre-test has run");
  assert.ok(onTime(old, ["pretest"], Date.now()));
  assert.ok(!onTime(old, ["pretest"], Date.now() + 2 * GRACE), "late once the grace after the update is over");
});

test("homework (issue #297): refused until the delayed post-test, each student's own, answered in class practice, kept out of the arms, shown to the teacher", async () => {
  const skills = ["fractions", "linear"];
  const { code } = (await call("POST", "/api/classes", { name: "Homework", skills, testLength: 4 }, TEACHER)).body;
  const a = (await call("POST", "/api/students", { class: code })).body.code;
  const b = (await call("POST", "/api/students", { class: code })).body.code;
  const make = (length?: number) => call("POST", `/api/classes/${code}/homework`, { length }, TEACHER);
  const move = (phase: string) => call("POST", `/api/classes/${code}/phase`, { phase }, TEACHER);
  const plan = async (s: string) => (await call("GET", `/api/students/${s}/plan`)).body;

  assert.equal((await call("POST", `/api/classes/${code}/homework`, {})).status, 403, "the teacher's");
  // Before the delayed post-test, and while it runs: none, so the study compares the arms without it.
  for (const phase of ["open", "posttest", "delayed"]) {
    if (phase !== "open") await move(phase);
    const r = await make();
    assert.deepEqual([r.status, r.body.error], [409, "homework opens once the class has taken its delayed post-test (or is out of the study), never during a test"], phase);
    assert.equal((await plan(a)).homework, null, phase);
  }
  await move("closed");
  assert.equal((await make(3)).status, 400);
  const made = await make(6);
  assert.deepEqual([made.status, made.body.students, made.body.length], [201, 2, 6]);
  const mine = (await plan(a)).homework;
  const theirs = (await plan(b)).homework;
  assert.deepEqual([mine.items.length, mine.done, mine.items.at(-1).why], [6, [], "stretch"]);
  assert.ok(mine.items.every((i: { skill: string }) => skills.includes(i.skill)));
  assert.notEqual(mine.id, theirs.id);

  // An answer to a homework question is stored (the class is closed, but homework isn't class practice) and done.
  const [q0, q1] = mine.items;
  const answer = (student: string, q: { skill: string; level: number; seed: number }, answers: { verdict: string; ms: number }[]) =>
    call("POST", "/api/attempts", attempt(student, { policy: "homework", skill: q.skill, level: q.level, seed: q.seed, answers }));
  assert.equal((await answer(a, q0, [{ verdict: "correct", ms: 9000 }])).status, 201);
  assert.equal((await answer(a, q1, [{ verdict: "wrong", ms: 9000 }, { verdict: "correct", ms: 19000 }])).status, 201);
  assert.deepEqual((await plan(a)).homework.done, [0, 1]);
  // Anything else isn't homework: another seed, or someone else's question.
  assert.equal((await answer(a, { ...q0, seed: q0.seed + 1 }, [{ verdict: "correct", ms: 9000 }])).status, 400);
  assert.equal((await answer(b, q0, [{ verdict: "correct", ms: 9000 }])).status, 400);

  const d = (await call("GET", `/api/research/dashboard?class=${code}`, undefined, TEACHER)).body;
  assert.equal(d.homework.open, true);
  const row = d.homework.rows.find((r: { student: string }) => r.student === d.students.find((s: { code: string }) => s.code === a).id);
  assert.deepEqual(row.items.map((i: { outcome: string | null; firstCorrect: boolean | null }) => [i.outcome, i.firstCorrect]),
    [["solved", true], ["solved", false], [null, null], [null, null], [null, null], [null, null]]);
  assert.equal(d.arms.on.answered + d.arms.off.answered, 0, "the arms are compared without homework");
  assert.equal(d.students.find((s: { code: string }) => s.code === a).answered, 2);
  const csv = parseCsv((await call("GET", `/api/research/attempts.csv?class=${code}`, undefined, TEACHER)).body as string);
  assert.deepEqual(csv.map((r) => r.policy), ["homework", "homework"]);

  // A new test (another study in the same class) hides homework again.
  await move("pretest");
  assert.equal((await plan(a)).homework, null);
  assert.equal((await make()).status, 409);
});

test("homework's repair slot (issue #303): a stuck student's homework starts with two easier questions on that skill, aimed at the idea; others get none", async () => {
  const { code } = (await call("POST", "/api/classes", { name: "Repair", skills: ["fractions", "linear"] }, TEACHER)).body;
  const join = async () => (await call("POST", "/api/students", { class: code })).body.code as string;
  const [stuck, fine] = [await join(), await join()];
  await call("POST", `/api/classes/${code}/study`, { study: false }, TEACHER);
  // Ten wrong on fractions, ticking the same idea as hard: on the stuck list for it.
  for (let i = 0; i < 10; i++) {
    const r = await call("POST", "/api/attempts", attempt(stuck, { skill: "fractions", level: 2, seed: 100 + i, outcome: "revealed", solutionViewed: true, hard: ["commonDenom"], answers: [{ verdict: "wrong", ms: 9000 }] }));
    assert.equal(r.status, 201);
  }
  assert.equal((await call("POST", `/api/classes/${code}/homework`, { length: 6 }, TEACHER)).status, 201);
  const homework = async (s: string) => (await call("GET", `/api/students/${s}/plan`)).body.homework.items as { skill: string; level: number; why: string; idea?: string }[];
  const mine = await homework(stuck);
  assert.deepEqual(mine.slice(0, 2).map((i) => [i.why, i.skill, i.idea]), [["repair", "fractions", "commonDenom"], ["repair", "fractions", "commonDenom"]]);
  assert.ok(mine.slice(0, 2).every((i) => i.level === 1), "the level they are most likely to get right");
  assert.deepEqual(mine.slice(2).map((i) => i.why).at(-1), "stretch");
  assert.ok(!(await homework(fine)).some((i) => i.why === "repair"));
  // The teacher's card shows it as a repair.
  const d = (await call("GET", `/api/research/dashboard?class=${code}`, undefined, TEACHER)).body;
  assert.equal(d.homework.rows.find((r: { student: string }) => r.student === d.stuck[0].rows[0].student).items[0].why, "repair");
});

test("a class out of the study (issue #299): homework at any time but during a test, out of the all-classes exports, back in only before homework", async () => {
  const { code, study } = (await call("POST", "/api/classes", { name: "Pilot", skills: ["fractions"], testLength: 4 }, TEACHER)).body;
  assert.equal(study, true, "every class starts in the study");
  const s = (await call("POST", "/api/students", { class: code })).body.code;
  const out = (to: unknown) => call("POST", `/api/classes/${code}/study`, { study: to }, TEACHER);
  const make = () => call("POST", `/api/classes/${code}/homework`, {}, TEACHER);
  const listed = async () => (await call("GET", "/api/classes", undefined, TEACHER)).body.find((c: { code: string }) => c.code === code);

  assert.equal((await call("POST", `/api/classes/${code}/study`, { study: false })).status, 403, "the teacher's");
  assert.equal((await out("no")).status, 400);
  assert.equal((await call("POST", "/api/classes/NOPE99/study", { study: false }, TEACHER)).status, 404);
  assert.equal((await make()).status, 409, "in the study: not yet");
  // Out and back in, before any homework.
  assert.deepEqual([(await out(false)).status, (await listed()).study], [200, false]);
  assert.deepEqual([(await out(true)).status, (await listed()).study], [200, true]);

  // Out of the study, the class is open and has had no test, yet it may have homework.
  await out(false);
  assert.equal((await make()).status, 201);
  const d = (await call("GET", `/api/research/dashboard?class=${code}`, undefined, TEACHER)).body;
  assert.deepEqual([d.homework.open, d.homework.study], [true, false]);
  const [q] = (await call("GET", `/api/students/${s}/plan`)).body.homework.items;
  assert.equal((await call("POST", "/api/attempts", attempt(s, { policy: "homework", skill: q.skill, level: q.level, seed: q.seed }))).status, 201);
  // Its answers are in its own export but not in the study's.
  const rows = async (q: string) => parseCsv((await call("GET", `/api/research/attempts.csv${q}`, undefined, TEACHER)).body as string);
  assert.equal((await rows(`?class=${code}`)).length, 1);
  assert.ok(!(await rows("")).some((r) => r.class === code));
  // Never during a test, and no way back into the study once it has had homework.
  await call("POST", `/api/classes/${code}/phase`, { phase: "pretest" }, TEACHER);
  assert.equal((await make()).status, 409);
  assert.equal((await call("GET", `/api/students/${s}/plan`)).body.homework, null);
  assert.equal((await out(true)).status, 409);
  assert.equal((await listed()).study, false);
});
