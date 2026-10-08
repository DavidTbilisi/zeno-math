// A dress rehearsal of the class study with simulated students, through the real server and its HTTP API: a class is
// made, students join and are randomised, the teacher moves the class through pre-test, a practice session and
// post-test, and every student answers as a browser would: test questions rebuilt from the class code, practice
// chosen by their condition from the plan the server sends and carried forward between refreshes, answers typed and
// judged by the real checker. Whether an answer is right comes from a simulated learner (src/model/simulate.ts), who
// learns from practice. Then both exports are downloaded, the analysis is run on them, and the study's guarantees are
// checked: balanced randomisation, counterbalanced forms, complete tests, attempts stored once, the right policy.
//
//   npm run dry-run                          40 students, 30 practice questions each, 12-question tests
//   npm run dry-run -- --students 60 --questions 60 --test-length 12 --world bkt --seed 3 --out dry-run
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { en } from "../src/locales/en.ts";
import { check, exercise, trapInputs, type Exercise } from "../src/math/practice.ts";
import type { SkillId } from "../src/math/practiceSkills.ts";
import { applyAttempt, finish, logAnswer, ME, startLog, toAttempt, toClassPlan, verdictOf, type ClassPlan, type Plan } from "../src/learner.ts";
import { analyseStudy, scoresFromTests, type StudyAnalysis } from "../src/model/analysis.ts";
import { inCurriculumOrder } from "../src/model/curriculum.ts";
import { logLoss, parseCsv } from "../src/model/evaluate.ts";
import { choose } from "../src/model/policy.ts";
import { makeWorld, rng, SIM_SKILLS, type SimParams } from "../src/model/simulate.ts";
import { testItems, type TestPhase } from "../src/model/testForms.ts";

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
  /** How many questions a browser carries its plan forward before asking the server again. */
  refreshEvery?: number;
};
export type Check = { name: string; ok: boolean; detail: string };
export type DryRunResult = { classCode: string; testsCsv: string; attemptsCsv: string; analysis: StudyAnalysis; checks: Check[]; predictedLogLoss: number };

/** Starts the server on a port of its own, with its own data directory. */
export async function startServer(dataDir: string, port: number, teacher: string) {
  const server = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", "server/index.ts"], {
    env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, STATIC_DIR: join(dataDir, "no-static"), APP_PASSWORD: "", TEACHER_PASSWORD: teacher, BIND_ADDRESS: "127.0.0.1" },
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
  const skills = o.skills ?? inCurriculumOrder(SIM_SKILLS.algebra);
  const teacher = { "X-Teacher-Password": o.teacher };
  const call = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
    const res = await fetch(o.base + path, { method, headers: { "Content-Type": "application/json", ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await res.text();
    if (res.status >= 400) throw new Error(`${method} ${path}: ${res.status} ${text}`);
    return { status: res.status, body: res.headers.get("content-type")?.startsWith("application/json") ? JSON.parse(text) : text };
  };
  const phase = (p: string, extra: Record<string, unknown> = {}) => call("POST", `/api/classes/${klass}/phase`, { phase: p, ...extra }, teacher);
  const r = rng(o.seed + 17);
  // Upload ids are unique across runs, as a browser's are: a repeat is only ever a retried upload.
  const run = randomUUID().slice(0, 8);
  let ids = 0;
  const clientId = () => `dry-${run}-${(ids++).toString().padStart(8, "0")}`;

  const klass: string = (await call("POST", "/api/classes", { name: "Dry run", skills, testLength: o.testLength }, teacher)).body.code;
  const world = makeWorld({ students: o.students, seed: o.seed, world: o.world });
  const students: { code: string; condition: string }[] = [];
  for (let i = 0; i < o.students; i++) students.push((await call("POST", "/api/students", { class: klass })).body);
  const plan = async (code: string) => (await call("GET", `/api/students/${encodeURIComponent(code)}/plan`)).body as Plan;

  let unanswerable = 0;
  let repeatsStored = 0;
  const sitTest = async (testPhase: TestPhase) => {
    await phase(testPhase === "pre" ? "pretest" : "posttest");
    for (const [i, s] of students.entries()) {
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
    }
  };

  await sitTest("pre");
  await phase("session", { minutes: 60 });
  const refreshEvery = o.refreshEvery ?? 10;
  const plans = new Map<string, ClassPlan>();
  let attempts = 0;
  for (let q = 0; q < o.questions; q++)
    for (const [i, s] of students.entries()) {
      if (q % refreshEvery === 0) plans.set(s.code, toClassPlan(await plan(s.code)));
      const cp = plans.get(s.code)!;
      const choice = choose(cp.condition, cp.model, ME, cp.skills, cp.position, { recent: cp.recent });
      const ex = exercise(choice.skill, choice.level, Math.floor(r.next() * 2 ** 31), w);
      const predicted = cp.model.predict({ student: ME, skill: choice.skill, level: choice.level });
      const right = world.answer(world.learners[i], choice.skill, choice.level);
      const log = startLog(Date.now(), 0);
      const ms = 15_000 + Math.floor(r.next() * 60_000);
      const typed = right ? ex.plain : wrongInput(ex);
      if (typed !== null) logAnswer(log, typed, check(ex, typed, w), ms);
      // Right: solved. Wrong: the student opens the answer, as many do after a miss.
      finish(log, right ? "solved" : "revealed", ms);
      if (!right) log.solutionViewed = true;
      const a = toAttempt(log, ex, { policy: cp.condition, review: false, predicted }, { code: s.code, class: klass, condition: cp.condition }, ms, clientId())!;
      const res = await call("POST", "/api/attempts", a);
      if (res.status === 201) attempts++;
      if (q === 0 && i === 0 && (await call("POST", "/api/attempts", a)).body.stored) repeatsStored++;
      applyAttempt(cp, a);
    }
  await sitTest("post");
  await phase("closed");

  const testsCsv = (await call("GET", `/api/research/tests.csv?class=${klass}`, undefined, teacher)).body as string;
  const attemptsCsv = (await call("GET", `/api/research/attempts.csv?class=${klass}`, undefined, teacher)).body as string;
  const testRows = parseCsv(testsCsv);
  const attemptRows = parseCsv(attemptsCsv);
  const analysis = analyseStudy(scoresFromTests(testRows));

  // ---------- the study's guarantees ----------
  const count = (c: string) => students.filter((s) => s.condition === c).length;
  const orders = (c: string) => {
    const seen = new Map(testRows.filter((t) => t.condition === c).map((t) => [t.student, t.test_order]));
    return [...seen.values()];
  };
  const balancedOrders = ["adaptive", "fixed"].every((c) => {
    const os = orders(c);
    return Math.abs(os.filter((x) => x === "AB").length - os.filter((x) => x === "BA").length) <= 1;
  });
  const formsFollowOrder = testRows.every((t) => t.form === (t.phase === "pre" ? t.test_order[0] : t.test_order[1]));
  const complete = Object.values(analysis.students).reduce((s, n) => s + n.complete, 0);
  const classPractice = attemptRows.filter((a) => a.policy === "adaptive" || a.policy === "fixed");
  const checks: Check[] = [
    { name: "randomised in balanced blocks", ok: Math.abs(count("adaptive") - count("fixed")) <= 2, detail: `adaptive ${count("adaptive")}, fixed ${count("fixed")}` },
    { name: "test forms counterbalanced within each condition", ok: balancedOrders, detail: ["adaptive", "fixed"].map((c) => `${c}: ${orders(c).join(" ")}`).join("; ") },
    { name: "each test on the form its order says", ok: formsFollowOrder, detail: `${testRows.length} test answers` },
    { name: "every student finished both tests", ok: complete === o.students, detail: `${complete} of ${o.students}` },
    { name: "every practice question stored", ok: attempts === o.students * o.questions && attemptRows.length === attempts, detail: `${attemptRows.length} of ${o.students * o.questions}` },
    { name: "retried uploads stored once", ok: repeatsStored === 0, detail: repeatsStored ? `${repeatsStored} stored twice` : "a repeated test answer and attempt were each kept once" },
    { name: "class practice follows each student's condition", ok: classPractice.every((a) => a.policy === a.condition), detail: `${classPractice.length} class-practice questions` },
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
  const predicted = classPractice.map((a) => ({ p: Number(a.predicted), correct: a.first_correct === "1" }));
  return { classCode: klass, testsCsv, attemptsCsv, analysis, checks, predictedLogLoss: logLoss(predicted) };
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
  const dir = mkdtempSync(join(tmpdir(), "zeno-dry-run-"));
  const teacherPassword = "dry-run";
  const server = await startServer(join(dir, "data"), 20000 + Math.floor(Math.random() * 20000), teacherPassword);
  try {
    const t0 = Date.now();
    const result = await dryRun({
      base: server.base,
      teacher: teacherPassword,
      students: num("--students", "40"),
      questions: num("--questions", "30"),
      testLength: num("--test-length", "12"),
      world: opt("--world", "elo") as SimParams["world"],
      seed: num("--seed", "1"),
    });
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, "tests.csv"), result.testsCsv);
    writeFileSync(join(out, "attempts.csv"), result.attemptsCsv);
    writeFileSync(join(out, "summary.json"), JSON.stringify({ class: result.classCode, checks: result.checks, analysis: result.analysis, predictedLogLoss: result.predictedLogLoss }, null, 2));
    console.log(`Dry run of class ${result.classCode} in ${((Date.now() - t0) / 1000).toFixed(1)} s\n`);
    for (const c of result.checks) console.log(`${c.ok ? "✓" : "✗"} ${c.name}${c.detail ? `: ${c.detail}` : ""}`);
    console.log(`\nlog-loss of the predictions logged in class practice: ${result.predictedLogLoss.toFixed(3)}`);
    console.log(`exports and summary in ${out}/; analyse them with: npm run analyse -- ${join(out, "tests.csv")}`);
    if (result.checks.some((c) => !c.ok)) process.exitCode = 1;
  } finally {
    await server.stop();
    rmSync(dir, { recursive: true, force: true });
  }
}
