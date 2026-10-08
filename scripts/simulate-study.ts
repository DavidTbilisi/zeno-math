// The simulation study: ways of choosing questions compared on simulated classes, across the assumptions the result
// depends on (the world answers come from, how learning works, transfer to later skills, learning rate).
//
//   npm run simulate                      adaptive against fixed in every world and assumption, 10 classes per row
//   npm run simulate -- --grid            also adaptive against random choice, and adaptive aiming at 60 % and 85 %
//   npm run simulate -- --power           power of the planned analysis (ANCOVA on the class tests) by class size
//   --skills algebra,average  --students 60  --questions 60  --runs 10  --test-length 12
//   --sizes 20,40,80,160  (power: total students per study)   --worlds elo,bkt   --csv results.csv   --json
//   --target 0.6  the chance of success adaptive practice aims at (75 % unless given)
//   --jobs 4      threads the studies run on (every core unless given; 1 runs them one after another, same numbers)
import { writeFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { Worker } from "node:worker_threads";
import { AREAS, type Area, type SkillId } from "../src/math/practiceSkills.ts";
import { inCurriculumOrder } from "../src/model/curriculum.ts";
import { TARGET } from "../src/model/policy.ts";
import { tUpper } from "../src/math/distributions.ts";
import { isSimSkill, mean, runStudy, sd, SIM_SKILLS, WORLDS, type Arm, type SimParams, type StudyParams } from "../src/model/simulate.ts";
import { outcome, type Outcome, type Task } from "./simulate-worker.ts";

const args = process.argv.slice(2);
const opt = (name: string, fallback: string) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const fail = (message: string) => {
  console.error(message);
  process.exit(2);
};
const skillArg = opt("--skills", "algebra").split(",");
const skills = inCurriculumOrder(skillArg.flatMap((s): readonly string[] => (AREAS.includes(s as Area) ? SIM_SKILLS[s as Area] : [s]))) as SkillId[];
const unknown = skillArg.filter((s) => !AREAS.includes(s as Area) && !isSimSkill(s as SkillId));
if (unknown.length || !skills.length) fail(`unknown skills: ${unknown.join(", ")}`);
const worlds = opt("--worlds", WORLDS.join(",")).split(",") as SimParams["world"][];
if (worlds.some((w) => !WORLDS.includes(w))) fail(`worlds are ${WORLDS.join(", ")}`);
const positive = (name: string, fallback: string) => {
  const v = Number(opt(name, fallback));
  if (!Number.isInteger(v) || v < 1) fail(`${name} must be a whole number above 0`);
  return v;
};
const questions = positive("--questions", "60");
const testLength = positive("--test-length", "12");
const power = args.includes("--power");
const runs = positive("--runs", power ? "100" : "10");
const csvFile = opt("--csv", "");
const json = args.includes("--json");
const targetArg = opt("--target", "");
const target = targetArg ? Number(targetArg) : undefined;
if (target !== undefined && !(target > 0 && target < 1)) fail("--target must be a chance between 0 and 1");
const jobs = positive("--jobs", String(availableParallelism()));

type Assumption = Pick<SimParams, "world" | "learning" | "transfer" | "learnRate">;
const assumptions = (transfers: number[], rates: number[]): Assumption[] =>
  worlds.flatMap((world) => (["flat", "zpd"] as const).flatMap((learning) => transfers.flatMap((transfer) => rates.map((learnRate) => ({ world, learning, transfer, learnRate })))));
const ADAPTIVE: Arm = target === undefined ? { policy: "adaptive" } : { policy: "adaptive", target };
const ADAPTIVE_FIXED: [Arm, Arm] = [ADAPTIVE, { policy: "fixed" }];
const comparisons: [Arm, Arm][] = args.includes("--grid")
  ? [ADAPTIVE_FIXED, [ADAPTIVE, { policy: "random" }], [{ policy: "adaptive", target: 0.6 }, { policy: "fixed" }], [{ policy: "adaptive", target: 0.85 }, { policy: "fixed" }]]
  : [ADAPTIVE_FIXED];
/** One simulated study: its seed comes from its run alone, so it is the same whichever thread runs it. */
const study = (a: Assumption, arms: [Arm, Arm], students: number, run: number): Partial<StudyParams> =>
  ({ ...a, arms, skills, students, questions, testLength, seed: (run + 1) * 101 });

/** Every study, on `jobs` threads (in this thread with --jobs 1); the outcomes come back in the tasks' order. */
async function runAll(tasks: Partial<StudyParams>[]): Promise<Outcome[]> {
  if (jobs === 1 || tasks.length < 2) return tasks.map((t) => outcome(runStudy(t)));
  // The biggest classes go first, so no thread is left with a long study while the others have finished.
  const order = tasks.map((_, i) => i).sort((i, j) => (tasks[j].students ?? 0) - (tasks[i].students ?? 0));
  const results: Outcome[] = new Array(tasks.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(jobs, tasks.length) }, () => new Worker(new URL("./simulate-worker.ts", import.meta.url)));
  await Promise.all(workers.map((w) => new Promise<void>((done, failed) => {
    const give = () => {
      if (next >= order.length) return void w.terminate().then(() => done(), failed);
      const id = order[next++];
      w.postMessage({ id, params: tasks[id] } satisfies Task);
    };
    w.on("message", (m: { id: number; outcome: Outcome }) => {
      results[m.id] = m.outcome;
      give();
    });
    w.on("error", failed);
    give();
  })));
  return results;
}
const pad = (s: string | number, n: number) => String(s).padStart(n);
const csv = (rows: Record<string, unknown>[]) => {
  if (!csvFile || !rows.length) return;
  const cols = Object.keys(rows[0]);
  writeFileSync(csvFile, [cols.join(","), ...rows.map((r) => cols.map((c) => (typeof r[c] === "number" ? Number((r[c] as number).toPrecision(6)) : r[c])).join(","))].join("\n") + "\n");
};

if (power) {
  // How often the planned analysis finds the effect (p < 0.05, either direction) in a class of each size, under each
  // assumption: the test a class sits is noisy, so this is lower than the true effect alone would suggest.
  const sizes = opt("--sizes", "20,40,80,160").split(",").map(Number);
  if (sizes.some((n) => !Number.isInteger(n) || n < 8 || n % 2)) fail("--sizes must be even whole numbers of 8 or more");
  const cells = assumptions([0, 0.3], [0.02, 0.1]).flatMap((a) => sizes.map((students) => ({ a, students })));
  const all = await runAll(cells.flatMap(({ a, students }) => Array.from({ length: runs }, (_, run) => study(a, ADAPTIVE_FIXED, students, run))));
  const rows = cells.map(({ a, students }, i) => {
    const results = all.slice(i * runs, (i + 1) * runs).map((o) => o.ancova);
    const significant = results.filter((x) => x.p < 0.05);
    return {
      ...a,
      students,
      power: significant.length / runs,
      adaptiveWins: significant.filter((x) => x.estimate > 0).length / runs,
      fixedWins: significant.filter((x) => x.estimate < 0).length / runs,
      d: mean(results.map((x) => x.d)),
      t: mean(results.map((x) => x.t)),
    };
  });
  csv(rows);
  if (json) console.log(JSON.stringify({ skills, questions, testLength, runs, target: target ?? TARGET, rows }, null, 2));
  else {
    console.log(`Power of the planned ANCOVA (p < 0.05), ${runs} simulated studies per row: ${questions} questions each, ${testLength}-question tests, on ${skills.join(", ")}, adaptive aiming at ${Math.round((target ?? TARGET) * 100)} %\n`);
    console.log(`${"world".padEnd(7)}${"learning".padEnd(9)}${pad("transfer", 9)}${pad("rate", 6)}${pad("students", 10)}${pad("power", 8)}${pad("adaptive", 10)}${pad("fixed", 7)}${pad("d", 7)}${pad("t", 7)}`);
    for (const r of rows)
      console.log(`${r.world.padEnd(7)}${r.learning.padEnd(9)}${pad(r.transfer, 9)}${pad(r.learnRate, 6)}${pad(r.students, 10)}${pad(`${Math.round(r.power * 100)}%`, 8)}${pad(`${Math.round(r.adaptiveWins * 100)}%`, 10)}${pad(`${Math.round(r.fixedWins * 100)}%`, 7)}${pad(r.d.toFixed(2), 7)}${pad(r.t.toFixed(2), 7)}`);
    console.log("\npower: share of studies with p < 0.05. adaptive / fixed: share significant in that condition's favour. d: mean adjusted effect in SDs of the post-test.");
    console.log("t: mean t-statistic of the effect; it grows with the square root of the class size, and 80 % power needs about 2.8, so a");
    console.log("class of students × (2.8 / t)² would have about 80 % power for the effect in that row's direction.");
  }
} else {
  const students = positive("--students", "60");
  const cells = assumptions([0, 0.3, 0.6], [0.02, 0.1]).flatMap((a) => comparisons.map((arms) => ({ a, arms })));
  const all = await runAll(cells.flatMap(({ a, arms }) => Array.from({ length: runs }, (_, run) => study(a, arms, students, run))));
  const rows = cells.map(({ a }, i) => {
    const s = all.slice(i * runs, (i + 1) * runs).map((o) => o.summary);
    const ds = s.map((x) => x.d);
    const half = runs > 1 ? (tUpper(0.025, runs - 1) * sd(ds)) / Math.sqrt(runs) : NaN;
    return {
      ...a,
      compare: `${s[0].a.name} vs ${s[0].b.name}`,
      d: mean(ds),
      dLow: mean(ds) - half,
      dHigh: mean(ds) + half,
      dTest: mean(s.map((x) => x.dTest)),
      ahead: s.filter((x) => x.d > 0).length / runs,
      gainA: mean(s.map((x) => x.a.gain)),
      gainB: mean(s.map((x) => x.b.gain)),
      offA: mean(s.map((x) => x.a.offTarget)),
      offB: mean(s.map((x) => x.b.offTarget)),
    };
  });
  csv(rows);
  if (json) console.log(JSON.stringify({ skills, students, questions, testLength, runs, rows }, null, 2));
  else {
    console.log(`${runs} simulated classes per row: ${students} students (half each way), ${questions} questions each, on ${skills.join(", ")}\n`);
    const width = Math.max(...rows.map((r) => r.compare.length)) + 2;
    console.log(`${"world".padEnd(7)}${"learning".padEnd(9)}${pad("transfer", 9)}${pad("rate", 6)}  ${"compare".padEnd(width)}${pad("d", 7)}${pad("95 % CI", 16)}${pad("d test", 8)}${pad("ahead", 7)}${pad("off-target", 13)}`);
    for (const r of rows)
      console.log(
        `${r.world.padEnd(7)}${r.learning.padEnd(9)}${pad(r.transfer, 9)}${pad(r.learnRate, 6)}  ${r.compare.padEnd(width)}${pad(r.d.toFixed(2), 7)}` +
          `${pad(`${r.dLow.toFixed(2)} to ${r.dHigh.toFixed(2)}`, 16)}${pad(r.dTest.toFixed(2), 8)}${pad(`${Math.round(r.ahead * 100)}%`, 7)}${pad(`${r.offA.toFixed(2)} / ${r.offB.toFixed(2)}`, 13)}`,
      );
    console.log("\nd: Cohen's d of the first over the second in true gain, with a 95 % interval over the classes; d test: the same in the gain");
    console.log(`on a ${testLength}-question test. ahead: share of classes where the first gained more. off-target: how far the questions were`);
    console.log("from the chance each aimed at (75 % unless named), on average.");
  }
}
if (csvFile) console.error(`wrote ${csvFile}`);
