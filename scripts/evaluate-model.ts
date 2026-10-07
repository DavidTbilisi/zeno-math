// Replays logged answers through the learner model and its baselines and prints the metrics.
//
//   npm run model -- zeno-attempts.csv          the CSV from /api/research/attempts.csv
//   npm run model -- zeno-attempts.csv --fit    also search α and β for the lowest log-loss
//   npm run model -- --simulate                 synthetic learners with a known truth (src/model/simulate.ts)
//   add --json for machine-readable output
import { readFileSync } from "node:fs";
import { EloModel, type EloParams, type Observation } from "../src/model/elo.ts";
import { evaluate, globalRate, itemRate, observationsFromCsv, studentSkillRate, type Metrics } from "../src/model/evaluate.ts";
import { simulateRandom } from "../src/model/simulate.ts";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const file = args.find((a) => !a.startsWith("--"));
if (!file && !flag("--simulate")) {
  console.error("usage: npm run model -- <attempts.csv> [--fit] [--json]   or   npm run model -- --simulate [--fit] [--json]");
  process.exit(2);
}

const observations: Observation[] = file ? observationsFromCsv(readFileSync(file, "utf8")) : simulateRandom().observations;
if (!observations.length) {
  console.error("no usable attempts in the file");
  process.exit(1);
}

// The model, what each layer of ability adds (ablations), and what simply counting gets (baselines).
const models = [
  new EloModel(),
  Object.assign(new EloModel({ weights: { global: 0.4, area: 0, skill: 1 } }), { name: "elo, no area layer" }),
  Object.assign(new EloModel({ weights: { global: 0, area: 0, skill: 1 } }), { name: "elo, skill layer only" }),
  studentSkillRate(),
  itemRate(),
  globalRate(),
];
const results: Metrics[] = models.map((m) => evaluate(m, observations));

let fit: { params: Partial<EloParams>; logLoss: number }[] = [];
if (flag("--fit")) {
  for (const alpha of [0.4, 0.6, 0.8, 1, 1.5, 2])
    for (const beta of [0, 0.01, 0.02, 0.05, 0.1, 0.2])
      fit.push({ params: { alpha, beta }, logLoss: evaluate(new EloModel({ alpha, beta }), observations).logLoss });
  fit = fit.sort((a, b) => a.logLoss - b.logLoss).slice(0, 5);
}

if (flag("--json")) {
  console.log(JSON.stringify({ source: file ?? "simulation", results, fit }, null, 2));
} else {
  const students = new Set(observations.map((o) => o.student)).size;
  const right = observations.filter((o) => o.correct).length / observations.length;
  console.log(`${file ?? "simulated class"}: ${observations.length} answers from ${students} students, ${(right * 100).toFixed(1)} % right first time\n`);
  const pad = (s: string | number, n: number) => String(s).padStart(n);
  console.log(`${"model".padEnd(24)}${pad("log-loss", 10)}${pad("RMSE", 8)}${pad("AUC", 8)}${pad("accuracy", 10)}`);
  for (const r of results) console.log(`${r.name.padEnd(24)}${pad(r.logLoss.toFixed(4), 10)}${pad(r.rmse.toFixed(4), 8)}${pad(r.auc.toFixed(3), 8)}${pad(r.accuracy.toFixed(3), 10)}`);
  console.log("\ncalibration of elo (predicted → observed, answers):");
  for (const b of results[0].calibration.filter((b) => b.n))
    console.log(`  ${b.from.toFixed(1)}–${b.to.toFixed(1)}  ${b.predicted.toFixed(3)} → ${b.observed.toFixed(3)}  (${b.n})`);
  if (fit.length) {
    console.log("\nbest α, β by log-loss:");
    for (const f of fit) console.log(`  α = ${f.params.alpha}, β = ${f.params.beta}: ${f.logLoss.toFixed(4)}`);
  }
}
