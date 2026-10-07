// Judges the learner model and its rivals on logged answers and prints the metrics. Students are split in two: the
// models fit (or warm up) on the training students, and are scored on the rest, answer by answer, so no score comes
// from students a model was tuned on.
//
//   npm run model -- zeno-attempts.csv                   the CSV from /api/research/attempts.csv
//   npm run model -- --observations assistments.json     a public data set (scripts/import-assistments.ts)
//   npm run model -- --simulate                          synthetic learners with a known truth (src/model/simulate.ts)
//   --fit                    also search α and β on the training students, and score the best on the test students
//   --test-share 0.2         the share of students held out (default 0.2); --seed 1 picks which
//   --calibration bins.csv   every model's calibration bins, for a plot
//   --json                   machine-readable output
import { readFileSync, writeFileSync } from "node:fs";
import { fromFile, type DatasetFile } from "../src/model/datasets.ts";
import { EloModel, type EloParams, type Observation } from "../src/model/elo.ts";
import {
  BktModel, evaluate, evaluateHeldOut, globalRate, itemRate, observationsFromCsv, PfaModel, splitByStudent, studentSkillRate, type Metrics, type Predictor,
} from "../src/model/evaluate.ts";
import { simulateRandom } from "../src/model/simulate.ts";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const opt = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const valued = new Set(["--observations", "--test-share", "--seed", "--calibration"]);
const file = args.find((a, i) => !a.startsWith("--") && !valued.has(args[i - 1]));
const dataset = opt("--observations");
if (!file && !dataset && !flag("--simulate")) {
  console.error("usage: npm run model -- <attempts.csv> | --observations <data.json> | --simulate   [--fit] [--test-share 0.2] [--seed 1] [--calibration bins.csv] [--json]");
  process.exit(2);
}
const testShare = Number(opt("--test-share") ?? 0.2);
const seed = Number(opt("--seed") ?? 1);
if (!(testShare > 0 && testShare < 1) || !Number.isInteger(seed)) {
  console.error("--test-share must be between 0 and 1, --seed a whole number");
  process.exit(2);
}

let source = "simulated class";
let observations: Observation[];
let areas: Record<string, string> | null = null;
if (dataset) {
  const d = fromFile(JSON.parse(readFileSync(dataset, "utf8")) as DatasetFile);
  ({ source, observations, areas } = d);
} else if (file) {
  source = file;
  observations = observationsFromCsv(readFileSync(file, "utf8"));
} else observations = simulateRandom().observations;
if (!observations.length) {
  console.error("no usable attempts in the file");
  process.exit(1);
}
const { train, test } = splitByStudent(observations, testShare, seed);
if (!train.length || !test.length) {
  console.error("too few students to hold some out");
  process.exit(1);
}

// A data set's own skills are grouped by its topics; Zeno's by its areas (the model's default).
const own: Partial<EloParams> = areas ? { areaOf: (k) => areas[k] ?? "other" } : {};
const elo = (name: string, params: Partial<EloParams> = {}) => Object.assign(new EloModel({ ...own, ...params }), { name });
// The model, what each layer of ability adds (ablations), two standard student models, and what simply counting gets.
const models: Predictor[] = [
  elo("elo"),
  elo("elo, no area layer", { weights: { global: 0.4, area: 0, skill: 1 } }),
  elo("elo, skill layer only", { weights: { global: 0, area: 0, skill: 1 } }),
  ...(areas ? [elo("elo, one area", { areaOf: () => "all" })] : []),
  new PfaModel(),
  new BktModel(),
  studentSkillRate(),
  itemRate(),
  globalRate(),
];

let fit: { params: Pick<EloParams, "alpha" | "beta">; logLoss: number }[] = [];
if (flag("--fit")) {
  for (const alpha of [0.2, 0.4, 0.6, 0.8, 1, 1.5])
    for (const beta of [0, 0.01, 0.02, 0.05, 0.1, 0.2])
      fit.push({ params: { alpha, beta }, logLoss: evaluate(new EloModel({ ...own, alpha, beta }), train).logLoss });
  fit = fit.sort((a, b) => a.logLoss - b.logLoss).slice(0, 5);
  const { alpha, beta } = fit[0].params;
  models.splice(1, 0, elo(`elo, fitted (α ${alpha}, β ${beta})`, { alpha, beta }));
}

const results: Metrics[] = models.map((m) => evaluateHeldOut(m, train, test));
const students = (os: readonly Observation[]) => new Set(os.map((o) => o.student)).size;
const right = test.filter((o) => o.correct).length / test.length;

const calibrationFile = opt("--calibration");
if (calibrationFile) {
  const lines = ["model,from,to,n,predicted,observed"];
  for (const r of results) for (const b of r.calibration) lines.push([JSON.stringify(r.name), b.from.toFixed(1), b.to.toFixed(1), b.n, b.predicted.toFixed(4), b.observed.toFixed(4)].join(","));
  writeFileSync(calibrationFile, lines.join("\n") + "\n");
}

if (flag("--json")) {
  console.log(JSON.stringify({ source, testShare, seed, train: { answers: train.length, students: students(train) }, test: { answers: test.length, students: students(test) }, results, fit }, null, 2));
} else {
  console.log(`${source}: ${observations.length.toLocaleString("en")} answers from ${students(observations).toLocaleString("en")} students`);
  console.log(`fitted on ${students(train).toLocaleString("en")} students, scored on ${students(test).toLocaleString("en")} held-out students (${test.length.toLocaleString("en")} answers, ${(right * 100).toFixed(1)} % right first time)\n`);
  const pad = (s: string | number, n: number) => String(s).padStart(n);
  const width = Math.max(24, ...results.map((r) => r.name.length + 2));
  console.log(`${"model".padEnd(width)}${pad("log-loss", 10)}${pad("RMSE", 8)}${pad("AUC", 8)}${pad("accuracy", 10)}`);
  for (const r of results) console.log(`${r.name.padEnd(width)}${pad(r.logLoss.toFixed(4), 10)}${pad(r.rmse.toFixed(4), 8)}${pad(r.auc.toFixed(3), 8)}${pad(r.accuracy.toFixed(3), 10)}`);
  console.log("\ncalibration of elo (predicted → observed, answers):");
  for (const b of results[0].calibration.filter((b) => b.n))
    console.log(`  ${b.from.toFixed(1)}–${b.to.toFixed(1)}  ${b.predicted.toFixed(3)} → ${b.observed.toFixed(3)}  (${b.n})`);
  if (fit.length) {
    console.log("\nbest α, β by log-loss on the training students:");
    for (const f of fit) console.log(`  α = ${f.params.alpha}, β = ${f.params.beta}: ${f.logLoss.toFixed(4)}`);
  }
  if (calibrationFile) console.log(`\ncalibration bins written to ${calibrationFile}`);
}
