// After "yes": can the answers that follow a mastery declaration show, without a truth, that the skill is modelled too
// coarse? In the world of components (src/model/atoms.ts) the truth is known, so the share of declarations that are
// right (precision) can be set beside two things a deployed system can see: the share right on the next three answers
// after a declaration, and, for BKT, the share right its own parameters forecast for those answers at the moment it
// declares (its promise). The same two are then read on real answers at three grains (src/model/grain.ts), where
// there is no truth. Exploratory: made after the results of G1 and G4.
//
//   npm run after-yes                                        the world of components, k = 1,2,4,8,16
//   npm run after-yes -- --observations data/assistments.json    real answers at the three grains
// Every setting and seed is a task of its own, seeded on its own, and the tasks run on worker threads, so the numbers
// do not depend on how many threads there are.
//
//   --atoms 1,2,4,8,16  --learn-rates 0.02,0.1  --seeds 1,2,3,4,5  --length 30  --next 3  --test-share 0.2  --resamples 2000  --json
//   --jobs 4      worker threads (default: the processors less one; 1 gives the same numbers)
import { readFileSync } from "node:fs";
import { isMainThread } from "node:worker_threads";
import { simulateAtoms } from "../src/model/atoms.ts";
import { assistmentsTopic, fromFile, type DatasetFile } from "../src/model/datasets.ts";
import { splitByStudent } from "../src/model/evaluate.ts";
import { GRAINS, regrain } from "../src/model/grain.ts";
import { jobsFrom, pool, serve } from "./pool.ts";
import { afterYes, fitRules, practicesFrom, usualRules, type AfterYes, type Practice } from "../src/model/mastery.ts";

const args = process.argv.slice(2);
const opt = (name: string, fallback: string) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const list = (name: string, fallback: string) => opt(name, fallback).split(",").map(Number);
const next = Number(opt("--next", "3"));
const testShare = Number(opt("--test-share", "0.2"));
const resamples = Number(opt("--resamples", "2000"));
const seeds = list("--seeds", "1,2,3,4,5");
const dataset = opt("--observations", "");

type Row = { setting: string; seed: number; base: number } & AfterYes;
type Task = { seed: number; grain?: (typeof GRAINS)[number]; atoms?: number; learnRate?: number };
const length = Number(opt("--length", "30"));

/** One setting on one seed: the rules fitted on the training students and read on the held-out ones. */
let loaded: ReturnType<typeof fromFile> | undefined;
function runTask(t: Task): Row[] {
  let setting: string, train: readonly Practice[], test: readonly Practice[];
  if (t.grain) {
    const d = (loaded ??= fromFile(JSON.parse(readFileSync(dataset, "utf8")) as DatasetFile));
    const split = splitByStudent(regrain(d.observations, t.grain, (skill) => d.areas[skill] ?? assistmentsTopic(skill)), testShare, t.seed);
    (setting = t.grain), (train = practicesFrom(split.train)), (test = practicesFrom(split.test));
  } else {
    ({ train, test } = splitByStudent(simulateAtoms({ atoms: t.atoms, learnRate: t.learnRate, length, seed: t.seed }), testShare, t.seed));
    setting = `rate ${t.learnRate}, ${t.atoms} component${t.atoms! > 1 ? "s" : ""}`;
  }
  const fitted = fitRules(train);
  let right = 0, n = 0;
  for (const p of test) for (const a of p.answers) (n++, (right += a));
  return usualRules(fitted, train).map((rule) => ({ setting, seed: t.seed, base: right / n, ...afterYes(rule, test, fitted, next, resamples, t.seed) }));
}

if (!isMainThread) serve(runTask);
else {
  const tasks: Task[] = [];
  if (dataset) for (const seed of seeds) for (const grain of GRAINS) tasks.push({ seed, grain });
  else for (const learnRate of list("--learn-rates", "0.02,0.1")) for (const atoms of list("--atoms", "1,2,4,8,16")) for (const seed of seeds) tasks.push({ seed, atoms, learnRate });
  const rows = (await pool(import.meta.url, tasks, jobsFrom(args, tasks.length), runTask)).flat();

  if (args.includes("--json")) process.stdout.write(JSON.stringify(rows, null, 2) + "\n");
  else {
    const pct = (x: number) => (Number.isNaN(x) ? "–" : `${(x * 100).toFixed(1)} %`);
    const pts = (x: number) => (Number.isNaN(x) ? "–" : `${x < 0 ? "−" : "+"}${Math.abs(x * 100).toFixed(1)}`);
    console.log(`the next ${next} answers after a declaration, on held-out students (${(testShare * 100).toFixed(0)} %); intervals from ${resamples} resamples of students\n`);
    console.log(`${"setting".padEnd(26)}${"seed".padStart(4)}  ${"rule".padEnd(16)}${"declared".padStart(9)}${"precision".padStart(10)}${"all right".padStart(10)}${"right after".padStart(12)}  ${"95 % interval".padEnd(18)}${"promised".padStart(9)}${"gap".padStart(7)}  95 % interval`);
    for (const r of rows)
      console.log(
        `${r.setting.padEnd(26)}${String(r.seed).padStart(4)}  ${r.rule.padEnd(16)}${pct(r.declared).padStart(9)}${pct(r.precision).padStart(10)}${pct(r.base).padStart(10)}${pct(r.right).padStart(12)}  ${`[${pct(r.rightInterval[0])}, ${pct(r.rightInterval[1])}]`.padEnd(18)}${pct(r.promised).padStart(9)}${pts(r.gap).padStart(7)}  ${Number.isNaN(r.gap) ? "" : `[${pts(r.gapInterval[0])}, ${pts(r.gapInterval[1])}]`}`,
      );
  }
}
