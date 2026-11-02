// A dress rehearsal of the class study with simulated students, through the real server and its HTTP API: a class is
// made to test a feature, students join and are randomised to its arms, the teacher moves the class through pre-test,
// a practice session, post-test and delayed post-test, and every student answers as a browser would: test questions rebuilt from the class code, practice
// chosen by their condition from the plan the server sends and carried forward between refreshes, answers typed and
// judged by the real checker. Whether an answer is right comes from a simulated learner (src/model/simulate.ts), who
// learns from practice. Then both exports are downloaded, the analysis is run on them, and the study's guarantees are
// checked: balanced randomisation, counterbalanced forms, complete tests, attempts stored once, the right policy, and
// the dashboard's scores by intention to treat against the export. (The simulated learners don't forget, so the
// delayed post-test here checks the plumbing, not forgetting.)
//
// With --parallel every student acts at once, as fast as the server answers: far heavier than a class at a human pace
// (an answer every half minute or so each), so a server that keeps up with it keeps up with a class. Every request is
// timed, and the times are reported by kind of request. With --base the rehearsal runs against a server already
// running (the public one, say: ZENO_APP_PASSWORD and ZENO_TEACHER_PASSWORD from the environment), and --clean-up then
// deletes its students, which takes their answers with them; the class itself is left, named so it can be found.
//
//   npm run dry-run                          40 students, 30 practice questions each, 12-question tests, testing the policy
//   npm run dry-run -- --students 60 --questions 60 --test-length 12 --world bkt --seed 3 --feature spaced --out dry-run
//   npm run dry-run -- --base https://zeno.example.org --parallel --students 30 --clean-up
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { en } from "../src/locales/en.ts";
import { check, exercise, trapInputs, type Exercise } from "../src/math/practice.ts";
import type { SkillId } from "../src/math/practiceSkills.ts";
import { applyAttempt, classQuestion, finish, logAnswer, ME, startLog, toAttempt, toClassPlan, verdictOf, type ClassPlan, type Plan } from "../src/learner.ts";
import { analyseStudy, scoresFromTests, type StudyAnalysis } from "../src/model/analysis.ts";
import { inCurriculumOrder } from "../src/model/curriculum.ts";
import { evidence, logLoss, parseCsv } from "../src/model/evaluate.ts";
import { makeWorld, rng, SIM_SKILLS, type SimParams } from "../src/model/simulate.ts";
import { isStuckNow, sinceLastStreak, type Try } from "../src/model/stuckList.ts";
import { formFor, TEST_PHASES, testItems, type TestOrder, type TestPhase } from "../src/model/testForms.ts";
import { ARMS, FEATURES, type Feature } from "../src/model/arms.ts";

const w = en.pracWords;

export type DryRunOptions = {
  base: string;
  teacher: string;
  students: number;
  questions: number;
  testLength: number;
  world: SimParams["world"];
  seed: number;
  skills?: readonly SkillId[];
  /** The feature the class tests (arms.ts); the policy when not given. */
  feature?: Feature;
  /** How many questions a browser carries its plan forward before asking the server again. */
  refreshEvery?: number;
  /** Every student at once, as fast as the server answers (a load test), rather than one after another. */
  parallel?: boolean;
  /** Sent with every request (the app password, for a server that asks for one). */
  headers?: Record<string, string>;
  /** The class's name. */
  name?: string;
};
/** How long the server took over each kind of request, in ms. */
export type Timing = { kind: string; n: number; p50: number; p95: number; max: number };
export type Check = { name: string; ok: boolean; detail: string };
export type DryRunResult = {
  classCode: string; students: string[]; testsCsv: string; attemptsCsv: string; analysis: StudyAnalysis; checks: Check[]; predictedLogLoss: number; timings: Timing[];
};

/** Each kind of request (method and route, codes left out) with its median, 95th percentile and slowest time. */
export function summariseTimings(times: readonly { kind: string; ms: number }[]): Timing[] {
  const kinds = new Map<string, number[]>();
  for (const t of times) (kinds.get(t.kind) ?? kinds.set(t.kind, []).get(t.kind)!).push(t.ms);
  const at = (sorted: number[], q: number) => sorted[Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1)];
  return [...kinds].map(([kind, ms]) => {
    const sorted = [...ms].sort((a, b) => a - b);
    return { kind, n: sorted.length, p50: at(sorted, 0.5), p95: at(sorted, 0.95), max: sorted.at(-1)! };
  });
}
/** A request's kind: its method and route, with class and student codes and the query left out. */
const kindOf = (method: string, path: string) =>
  `${method} ${path.split("?")[0].replace(/\/[A-Z0-9]{4}-[A-Z0-9]{4}(?=\/|$)/, "/:student").replace(/\/classes\/[A-Z0-9]+/, "/classes/:class")}`;

/** Starts the server on a port of its own, with its own data directory. */
export async function startServer(dataDir: string, port: number, teacher: string, env: Record<string, string> = {}) {
  const server = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", "server/index.ts"], {
    env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, STATIC_DIR: join(dataDir, "no-static"), APP_PASSWORD: "", TEACHER_PASSWORD: teacher, BIND_ADDRESS: "127.0.0.1", ...env },
    stdio: "pipe",
  });
  await new Promise<void>((ok, fail) => {
    server.stdout!.on("data", (d) => String(d).includes("listening") && ok());
    server.on("exit", (code) => fail(new Error(`server exited with ${code}`)));
  });
  return {
    base: `http://127.0.0.1:${port}`,
    stop: () => new Promise<void>((ok) => (server.exitCode !== null ? ok() : (server.once("exit", () => ok()), server.kill()))),
  };
}

/**
 * A typed answer the checker judges plainly wrong (not "nearly", not sent back for its form), or null if none is found:
 * the answer a known mistake gives when the question has one (or the wrong sign), so the exports hold mistakes to find.
 */
function wrongInput(ex: Exercise): string | null {
  for (const input of [...trapInputs(ex).map((t) => t.input), `-(${ex.plain})`, "12345", "x", "-7", "12345; 12345", "12345; 12345; 12345", "(12345, 12345)", "x^7", "2"])
    if (input !== ex.plain && verdictOf(check(ex, input, w)) === "wrong") return input;
  return null;
}

export async function dryRun(o: DryRunOptions): Promise<DryRunResult> {
  // Step-down needs skills made of ideas (times, hcf, fractions), which are number's; the rest is tried on algebra.
  const skills = o.skills ?? inCurriculumOrder(SIM_SKILLS[o.feature === "stepdown" ? "number" : "algebra"]);
  const teacher = { "X-Teacher-Password": o.teacher };
  const times: { kind: string; ms: number }[] = [];
  const call = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
    const t0 = performance.now();
    const res = await fetch(o.base + path, { method, headers: { "Content-Type": "application/json", ...o.headers, ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await res.text();
    times.push({ kind: kindOf(method, path), ms: performance.now() - t0 });
    if (res.status >= 400) throw new Error(`${method} ${path}: ${res.status} ${text}`);
    return { status: res.status, body: res.headers.get("content-type")?.startsWith("application/json") ? JSON.parse(text) : text };
  };
  const phase = (p: string, extra: Record<string, unknown> = {}) => call("POST", `/api/classes/${klass}/phase`, { phase: p, ...extra }, teacher);
  const r = rng(o.seed + 17);
  // Upload ids are unique across runs, as a browser's are: a repeat is only ever a retried upload.
  const run = randomUUID().slice(0, 8);
  let ids = 0;
  const clientId = () => `dry-${run}-${(ids++).toString().padStart(8, "0")}`;

  const klass: string = (await call("POST", "/api/classes", { name: o.name ?? "Dry run", skills, testLength: o.testLength, feature: o.feature ?? "policy" }, teacher)).body.code;
  const world = makeWorld({ students: o.students, seed: o.seed, world: o.world });
  const students: { code: string; condition: string; arm: string }[] = [];
  // Joined one after another even in parallel, so the arms' blocks and the counterbalancing come out as they would.
  for (let i = 0; i < o.students; i++) students.push((await call("POST", "/api/students", { class: klass })).body);
  /** Each student's part, one after another or all at once. */
  const each = async (work: (s: (typeof students)[number], i: number) => Promise<void>) => {
    if (o.parallel) await Promise.all(students.map((s, i) => work(s, i)));
    else for (const [i, s] of students.entries()) await work(s, i);
  };
  const plan = async (code: string) => (await call("GET", `/api/students/${encodeURIComponent(code)}/plan`)).body as Plan;

  let unanswerable = 0;
  let repeatsStored = 0;
  const sitTest = async (testPhase: TestPhase) => {
    await phase({ pre: "pretest", post: "posttest", delayed: "delayed" }[testPhase]);
    await each(async (s, i) => {
      const p = await plan(s.code);
      const form = p.tests[testPhase].form;
      for (const [item, q] of testItems(klass, p.skills, form, p.testLength).entries()) {
        const ex = exercise(q.skill, q.level, q.seed, w);
        // A test doesn't teach: the chance is read, not answered through the world.
        const right = r.next() < world.chance(world.learners[i], q.skill, q.level);
        const wrong = right ? null : wrongInput(ex);
        if (!right && wrong === null) unanswerable++;
        const input = right ? ex.plain : wrong ?? "";
        const v = input ? verdictOf(check(ex, input, w)) : "skipped";
        const verdict = v === "form" ? "wrong" : v;
        const body = { clientId: clientId(), student: s.code, phase: testPhase, item, input, verdict, retries: 0, ms: 20_000 + Math.floor(r.next() * 40_000) };
        await call("POST", "/api/tests", body);
        // The upload is retried once, as after a dropped connection: it must not be stored twice.
        if (item === 0 && (await call("POST", "/api/tests", body)).body.stored) repeatsStored++;
      }
    });
  };

  await sitTest("pre");
  await phase("session", { minutes: 60 });
  const refreshEvery = o.refreshEvery ?? 10;
  const plans = new Map<string, ClassPlan>();
  let attempts = 0;
  for (let q = 0; q < o.questions; q++)
    await each(async (s, i) => {
      if (q % refreshEvery === 0) plans.set(s.code, toClassPlan(await plan(s.code)));
      const cp = plans.get(s.code)!;
      // As the browser chooses: a step-down under way for the arm with it, else the student's condition.
      const { ex, policy } = classQuestion(cp, w, {}, r.next);
      const predicted = cp.model.predict({ student: ME, skill: ex.skill, level: ex.level });
      const right = world.answer(world.learners[i], ex.skill, ex.level);
      const log = startLog(Date.now(), 0);
      const ms = 15_000 + Math.floor(r.next() * 60_000);
      const typed = right ? ex.plain : wrongInput(ex);
      if (typed !== null) logAnswer(log, typed, check(ex, typed, w), ms);
      // Right: solved. Wrong: the student opens the answer, as many do after a miss.
      finish(log, right ? "solved" : "revealed", ms);
      if (!right) log.solutionViewed = true;
      const a = toAttempt(log, ex, { policy, review: false, predicted }, { code: s.code, class: klass, condition: cp.condition }, ms, clientId())!;
      const res = await call("POST", "/api/attempts", a);
      if (res.status === 201) attempts++;
      if (q === 0 && i === 0 && (await call("POST", "/api/attempts", a)).body.stored) repeatsStored++;
      applyAttempt(cp, a);
    });
  await sitTest("post");
  await sitTest("delayed");
  await phase("closed");

  const testsCsv = (await call("GET", `/api/research/tests.csv?class=${klass}`, undefined, teacher)).body as string;
  const attemptsCsv = (await call("GET", `/api/research/attempts.csv?class=${klass}`, undefined, teacher)).body as string;
  const testRows = parseCsv(testsCsv);
  const attemptRows = parseCsv(attemptsCsv);
  const analysis = analyseStudy(scoresFromTests(testRows));

  // ---------- the study's guarantees ----------
  const count = (arm: string) => students.filter((s) => s.arm === arm).length;
  const orders = (arm: string) => {
    const seen = new Map(testRows.filter((t) => t.arm === arm).map((t) => [t.student, t.test_order]));
    return [...seen.values()];
  };
  const balancedOrders = ARMS.every((arm) => {
    const os = orders(arm);
    return Math.abs(os.filter((x) => x === "AB").length - os.filter((x) => x === "BA").length) <= 1;
  });
  const formsFollowOrder = testRows.every((t) => t.form === formFor(t.test_order as TestOrder, t.phase as TestPhase));
  const complete = Object.values(analysis.students).reduce((s, n) => s + n.complete, 0);
  const delayedDone = new Set(testRows.filter((t) => t.phase === "delayed").map((t) => t.student)).size;
  const classPractice = attemptRows.filter((a) => a.policy === "adaptive" || a.policy === "fixed");
  const stepDowns = (arm: string) => attemptRows.filter((a) => a.policy === "stepdown" && a.arm === arm).length;
  const checks: Check[] = [
    { name: "randomised in balanced blocks", ok: Math.abs(count("on") - count("off")) <= 2, detail: `with ${o.feature ?? "policy"} ${count("on")}, without ${count("off")}` },
    { name: "test forms counterbalanced within each arm", ok: balancedOrders, detail: ARMS.map((a) => `${a}: ${orders(a).join(" ")}`).join("; ") },
    { name: "each test on the form its order says (C for the delayed post-test)", ok: formsFollowOrder, detail: `${testRows.length} test answers` },
    { name: "every student finished all three tests", ok: complete === o.students && delayedDone === o.students, detail: `${complete} of ${o.students} both, ${delayedDone} the delayed post-test` },
    { name: "every practice question stored", ok: attempts === o.students * o.questions && attemptRows.length === attempts, detail: `${attemptRows.length} of ${o.students * o.questions}` },
    { name: "retried uploads stored once", ok: repeatsStored === 0, detail: repeatsStored ? `${repeatsStored} stored twice` : "a repeated test answer and attempt were each kept once" },
    { name: "class practice follows each student's condition", ok: classPractice.every((a) => a.policy === a.condition), detail: `${classPractice.length} class-practice questions` },
    {
      name: "step-down only for the arm with it, in a class testing it",
      ok: stepDowns("off") === 0 && (o.feature === "stepdown" ? stepDowns("on") > 0 : stepDowns("on") === 0),
      detail: `${stepDowns("on")} step-down questions with it, ${stepDowns("off")} without`,
    },
    { name: "the model's prediction logged with each question", ok: classPractice.every((a) => a.predicted !== ""), detail: "" },
    { name: "the planned analysis runs on the export", ok: analysis.ancova !== null, detail: analysis.ancova ? `effect ${(analysis.ancova.estimate * 100).toFixed(1)} points, p = ${analysis.ancova.p.toFixed(3)}` : "too few students" },
    { name: "every wrong test answer could be typed", ok: unanswerable === 0, detail: unanswerable ? `${unanswerable} passed instead` : "" },
    {
      name: "the server marked every answer as the browser did",
      ok: testRows.every((t) => !t.client_verdict) && attemptRows.every((a) => a.remarked === "0"),
      detail: `${testRows.length + attemptRows.length} test answers and practice questions marked again`,
    },
    { name: "nothing arrived after its phase", ok: [...testRows, ...attemptRows].every((r) => r.late === "0"), detail: "" },
  ];
  // The teacher's stuck list, against the export: the same students and skills, each with as many questions.
  const dash = (await call("GET", `/api/research/dashboard?class=${klass}`, undefined, teacher)).body as {
    stuck: { rows: { student: string; skill: string; answers: number }[] }[];
    arms: Record<string, Record<TestPhase, { n: number; mean: number | null; finished: number }>>;
  };
  // The dashboard's tests by intention to treat, against the export: every student of an arm, a question unanswered as wrong.
  const fromExport = (arm: string, p: TestPhase) =>
    testRows.filter((t) => t.arm === arm && t.phase === p && t.correct === "1").length / o.testLength / count(arm);
  const ittAgrees = ARMS.every((a) => TEST_PHASES.every((p) => Math.abs((dash.arms[a][p].mean ?? 0) - fromExport(a, p)) < 1e-9 && dash.arms[a][p].n === count(a)));
  checks.push({
    name: "the dashboard compares the arms by intention to treat, as the export does",
    ok: ittAgrees,
    detail: ARMS.map((a) => `${a}: ${TEST_PHASES.map((p) => `${p} ${((dash.arms[a][p].mean ?? 0) * 100).toFixed(1)} %`).join(", ")}`).join("; "),
  });
  const listed = dash.stuck.flatMap((g) => g.rows.map((r) => `${r.student} ${r.skill} ${r.answers}`)).sort();
  const bySkill = new Map<string, Try[]>();
  for (const a of attemptRows) {
    const correct = evidence(Number(a.n_answers) - Number(a.retries), a.outcome, a.first_correct === "1", !!a.faded);
    const k = `${a.student} ${a.skill}`;
    if (correct !== null) (bySkill.get(k) ?? bySkill.set(k, []).get(k)!).push({ id: Number(a.attempt), correct });
  }
  const expected = [...bySkill].flatMap(([k, tries]) => {
    const since = sinceLastStreak(tries);
    return isStuckNow(since) ? [`${k} ${since.length}`] : [];
  }).sort();
  checks.push({
    name: "the stuck list matches the export",
    ok: JSON.stringify(listed) === JSON.stringify(expected),
    detail: `${listed.length} stuck in ${dash.stuck.length} groups${JSON.stringify(listed) === JSON.stringify(expected) ? "" : `; the export says ${expected.join(", ")}`}`,
  });
  const predicted = classPractice.map((a) => ({ p: Number(a.predicted), correct: a.first_correct === "1" }));
  return {
    classCode: klass, students: students.map((s) => s.code), testsCsv, attemptsCsv, analysis, checks, predictedLogLoss: logLoss(predicted), timings: summariseTimings(times),
  };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const opt = (name: string, fallback: string) => {
    const i = args.indexOf(name);
    return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
  };
  const num = (name: string, fallback: string) => {
    const v = Number(opt(name, fallback));
    if (!Number.isInteger(v) || v < 1) throw new Error(`${name} must be a whole number above 0`);
    return v;
  };
  const out = opt("--out", "dry-run");
  const remote = opt("--base", "").replace(/\/$/, "");
  const parallel = args.includes("--parallel");
  // A server of our own, unless one is named; that one's passwords come from the environment, never the command line.
  const dir = remote ? "" : mkdtempSync(join(tmpdir(), "zeno-dry-run-"));
  const teacherPassword = remote ? process.env.ZENO_TEACHER_PASSWORD ?? "" : "dry-run";
  const app = process.env.ZENO_APP_PASSWORD;
  const headers: Record<string, string> = remote && app ? { Authorization: `Basic ${Buffer.from(`dry-run:${app}`).toString("base64")}` } : {};
  const server = remote ? null : await startServer(join(dir, "data"), 20000 + Math.floor(Math.random() * 20000), teacherPassword);
  let made: string[] = [];
  try {
    const t0 = Date.now();
    const result = await dryRun({
      base: remote || server!.base,
      teacher: teacherPassword,
      headers,
      parallel,
      name: remote ? `Dry run ${new Date().toISOString().slice(0, 16)} (delete me)` : undefined,
      students: num("--students", "40"),
      questions: num("--questions", "30"),
      testLength: num("--test-length", "12"),
      world: opt("--world", "elo") as SimParams["world"],
      seed: num("--seed", "1"),
      feature: ((f) => {
        if (!FEATURES.includes(f as Feature)) throw new Error(`--feature must be one of ${FEATURES.join(", ")}`);
        return f as Feature;
      })(opt("--feature", "policy")),
    });
    made = result.students;
    const seconds = (Date.now() - t0) / 1000;
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, "tests.csv"), result.testsCsv);
    writeFileSync(join(out, "attempts.csv"), result.attemptsCsv);
    writeFileSync(join(out, "summary.json"), JSON.stringify({ class: result.classCode, checks: result.checks, analysis: result.analysis, predictedLogLoss: result.predictedLogLoss, timings: result.timings }, null, 2));
    const requests = result.timings.reduce((n, t) => n + t.n, 0);
    console.log(`Dry run of class ${result.classCode}${remote ? ` on ${remote}` : ""} in ${seconds.toFixed(1)} s: ${requests} requests, ${(requests / seconds).toFixed(1)} a second${parallel ? ", every student at once" : ""}\n`);
    for (const c of result.checks) console.log(`${c.ok ? "✓" : "✗"} ${c.name}${c.detail ? `: ${c.detail}` : ""}`);
    console.log("\nms per request      n    median   95 %    slowest");
    for (const t of result.timings) console.log(`${t.kind.padEnd(38)} ${String(t.n).padStart(5)} ${t.p50.toFixed(0).padStart(7)} ${t.p95.toFixed(0).padStart(7)} ${t.max.toFixed(0).padStart(8)}`);
    console.log(`\nlog-loss of the predictions logged in class practice: ${result.predictedLogLoss.toFixed(3)}`);
    console.log(`exports and summary in ${out}/; analyse them with: npm run analyse -- ${join(out, "tests.csv")}`);
    if (remote) console.log(`the class ${result.classCode} is left on the server${args.includes("--clean-up") ? " without its students" : ""}`);
    if (result.checks.some((c) => !c.ok)) process.exitCode = 1;
  } finally {
    // Deleting a student takes their answers with them, and the server forgets them in its learner model.
    if (remote && args.includes("--clean-up")) {
      let gone = 0;
      for (const code of made)
        if ((await fetch(`${remote}/api/students/${encodeURIComponent(code)}`, { method: "DELETE", headers })).status === 204) gone++;
      console.log(`deleted ${gone} of ${made.length} students`);
    }
    await server?.stop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
}
