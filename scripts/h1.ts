// H1, the thesis's one confirmatory test (docs/thesis/outline.md): on held-out students, does BKT predict the next
// first-attempt answer better than the moving average (EMA)? Both models are fitted on the training students and
// predict the same held-out answers; the difference in mean log-loss per answer (BKT − EMA, below zero when BKT is
// better) gets a 95 % interval from the paired bootstrap over students, and a verdict by the rule fixed in advance.
// The first split seed is the test; the others only show whether the result hangs on one split. When the data set
// names each student's class, the interval is also made by resampling whole classes, a robustness check and not a
// second test: students in one class share a teacher and lessons, so resampling students alone is optimistic.
//
//   npm run h1 -- --observations assistments.json     a data set (scripts/import-assistments.ts)
//   npm run h1 -- zeno-attempts.csv                   the CSV from /api/research/attempts.csv
//   npm run h1 -- --simulate                          synthetic learners, to try it without data
//   --seeds 1,2,3,4,5   --test-share 0.2   --resamples 10000   --smallest 0.005   --json
import { readFileSync } from "node:fs";
import { fromFile, type DatasetFile } from "../src/model/datasets.ts";
import type { Observation } from "../src/model/elo.ts";
import { BktModel, EmaModel, heldOutPredictions, observationsFromCsv, pairedLogLoss, SMALLEST_DIFFERENCE, splitByStudent, type PairedTest } from "../src/model/evaluate.ts";
import { simulateRandom } from "../src/model/simulate.ts";

const args = process.argv.slice(2);
const opt = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const fail = (message: string) => {
  console.error(message);
  process.exit(2);
};
const valued = new Set(["--observations", "--seeds", "--test-share", "--resamples", "--smallest"]);
const file = args.find((a, i) => !a.startsWith("--") && !valued.has(args[i - 1]));
const dataset = opt("--observations");
if (!file && !dataset && !args.includes("--simulate")) fail("usage: npm run h1 -- <attempts.csv> | --observations <data.json> | --simulate   [--seeds 1,2,3,4,5] [--test-share 0.2] [--resamples 10000] [--smallest 0.005] [--json]");
const seeds = (opt("--seeds") ?? "1,2,3,4,5").split(",").map(Number);
const testShare = Number(opt("--test-share") ?? 0.2);
const resamples = Number(opt("--resamples") ?? 10000);
const smallest = Number(opt("--smallest") ?? SMALLEST_DIFFERENCE);
if (!seeds.length || seeds.some((s) => !Number.isInteger(s))) fail("--seeds must be whole numbers, separated by commas");
if (!(testShare > 0 && testShare < 1)) fail("--test-share must be between 0 and 1");
if (!Number.isInteger(resamples) || resamples < 100) fail("--resamples must be a whole number of at least 100");
if (!(smallest > 0)) fail("--smallest must be above 0");

let source = "simulated class";
let observations: Observation[];
let classes: Record<string, string> = {};
if (dataset) ({ source, observations, classes } = fromFile(JSON.parse(readFileSync(dataset, "utf8")) as DatasetFile));
else if (file) (source = file), (observations = observationsFromCsv(readFileSync(file, "utf8")));
else observations = simulateRandom().observations;
if (!observations.length) fail("no usable attempts in the file");

// A student with no class stands alone, as in the student-level bootstrap.
const classOf = (student: string) => (student in classes ? `class ${classes[student]}` : `student ${student}`);
const byClass = Object.keys(classes).length > 0;

const runs: (PairedTest & { seed: number; ema: EmaModel["params"]; byClass?: PairedTest })[] = seeds.map((seed) => {
  const { train, test } = splitByStudent(observations, testShare, seed);
  if (!train.length || !test.length) fail("too few students to hold some out");
  const bkt = new BktModel();
  const ema = new EmaModel();
  const first = { name: bkt.name, predictions: heldOutPredictions(bkt, train, test) };
  const second = { name: ema.name, predictions: heldOutPredictions(ema, train, test) };
  const result = pairedLogLoss(first, second, { resamples, seed, smallest });
  return { seed, ema: ema.params, ...result, ...(byClass && { byClass: pairedLogLoss(first, second, { resamples, seed, smallest, groupOf: classOf }) }) };
});

if (args.includes("--json")) {
  console.log(JSON.stringify({ source, testShare, resamples, smallest, runs }, null, 2));
} else {
  const n = (x: number) => x.toLocaleString("en");
  const signed = (x: number) => `${x < 0 ? "−" : "+"}${Math.abs(x).toFixed(4)}`;
  console.log(`${source}: ${n(observations.length)} answers; ${(testShare * 100).toFixed(0)} % of students held out; ${n(resamples)} resamples of students; smallest difference that counts ${smallest}\n`);
  console.log(`${"seed".padEnd(8)}${"students".padStart(9)}${"answers".padStart(10)}${"BKT".padStart(9)}${"EMA".padStart(9)}${"BKT − EMA".padStart(11)}  ${"95 % interval".padEnd(20)}verdict`);
  for (const r of runs)
    console.log(`${`${r.seed}${r === runs[0] ? " (test)" : ""}`.padEnd(8)}${n(r.students).padStart(9)}${n(r.answers).padStart(10)}${r.firstLogLoss.toFixed(4).padStart(9)}${r.secondLogLoss.toFixed(4).padStart(9)}${signed(r.difference).padStart(11)}  ${`[${signed(r.interval[0])}, ${signed(r.interval[1])}]`.padEnd(20)}${r.verdict.replace("first", "BKT").replace("second", "EMA")}`);
  if (byClass) {
    console.log("\nresampling whole classes (a robustness check, not a second test)");
    console.log(`${"seed".padEnd(8)}${"groups".padStart(9)}${"95 % interval".padStart(15)}       verdict`);
    for (const r of runs) {
      const c = r.byClass!;
      console.log(`${String(r.seed).padEnd(8)}${n(c.groups).padStart(9)}  ${`[${signed(c.interval[0])}, ${signed(c.interval[1])}]`.padEnd(20)}${c.verdict.replace("first", "BKT").replace("second", "EMA")}`);
    }
  } else if (dataset) console.log("\nthe data set names no classes: the interval resamples students only, and is optimistic if classmates are alike");
  console.log(`\nH1 is decided by seed ${runs[0].seed}: ${runs[0].verdict.replace("first", "BKT").replace("second", "EMA")}. Below zero, BKT predicts better.`);
  console.log(`EMA fitted on the training students (seed ${runs[0].seed}): α ${runs[0].ema.alpha}, start ${runs[0].ema.start.toFixed(3)}`);
}
