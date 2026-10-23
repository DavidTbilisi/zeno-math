// The benchmark results behind the dashboard (docs/evaluation/prediction-benchmark.md): on a data set's held-out
// students, how well each model predicts the next first answer, the logistic model against Elo by the paired bootstrap
// on several splits, and the mastery rules of H3 with the logistic rule beside them, their trade-off curves and how the
// logistic rule compares on each split.
//
//   npm run benchmark                                         data/assistments.json, results in docs/results
//   npm run benchmark -- assistments.json --out docs/results --seeds 1,2,3,4,5 --resamples 2000 --test-share 0.2
//
// The first seed's split is the one the tables show; the others only show whether the comparisons hang on it.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fromFile, type DatasetFile } from "../src/model/datasets.ts";
import { EloModel } from "../src/model/elo.ts";
import {
  BktModel, EmaModel, globalRate, heldOutPredictions, itemRate, metrics, pairedLogLoss, PfaModel, splitByStudent, studentSkillRate, type Predictor,
} from "../src/model/evaluate.ts";
import { LogisticModel } from "../src/model/logistic.ts";
import {
  bktRule, compareAfter, emaRule, fitRules, heldOutLogisticRule, judge, logisticRule, practicesFrom, rightAfter, streakRule, usualRules, type MasteryRule, type Practice,
} from "../src/model/mastery.ts";

const args = process.argv.slice(2);
const opt = (name: string, fallback: string) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const valued = new Set(["--out", "--seeds", "--resamples", "--test-share"]);
const file = args.find((a, i) => !a.startsWith("--") && !valued.has(args[i - 1])) ?? "data/assistments.json";
const out = opt("--out", "docs/results");
const seeds = opt("--seeds", "1,2,3,4,5").split(",").map(Number);
const resamples = Number(opt("--resamples", "2000"));
const testShare = Number(opt("--test-share", "0.2"));
if (!seeds.length || seeds.some((s) => !Number.isInteger(s)) || !(resamples > 0) || !(testShare > 0 && testShare < 1)) {
  console.error("--seeds must be whole numbers separated by commas, --resamples above 0, --test-share between 0 and 1");
  process.exit(2);
}

const { source, observations, areas, classes } = fromFile(JSON.parse(readFileSync(file, "utf8")) as DatasetFile);
const areaOf = (k: string) => areas[k] ?? "other";
const cell = (v: unknown) => (typeof v === "number" ? (Number.isFinite(v) ? String(Number(v.toFixed(4))) : "") : JSON.stringify(String(v)));
const write = (name: string, rows: readonly Record<string, unknown>[]) => {
  const columns = Object.keys(rows[0]);
  writeFileSync(join(out, name), [columns.join(","), ...rows.map((r) => columns.map((c) => cell(r[c])).join(","))].join("\n") + "\n");
  console.log(`wrote ${join(out, name)} (${rows.length} rows)`);
};
console.log(`${source}: ${observations.length.toLocaleString("en")} answers; seeds ${seeds.join(", ")}`);

// ---------- predicting the next answer ----------

/** The models of npm run model that the dashboard shows, with the kind each is. */
const models = (): [Predictor & { name: string }, string][] => [
  [Object.assign(new EloModel({ areaOf }), { name: "elo" }), "elo"],
  [Object.assign(new EloModel({ areaOf: () => "all" }), { name: "elo, one area" }), "elo"],
  [new LogisticModel({ areaOf }), "logistic"],
  [new LogisticModel({ areaOf, items: false }, "logistic, no question difficulty"), "logistic"],
  [new PfaModel(), "standard"],
  [new BktModel(), "standard"],
  [new EmaModel(), "standard"],
  [studentSkillRate(), "counting"],
  [itemRate(), "counting"],
  [globalRate(), "counting"],
];
const split = (seed: number) => splitByStudent(observations, testShare, seed);
const predictionRows: Record<string, unknown>[] = [];
const pairedRows: Record<string, unknown>[] = [];
for (const [s, seed] of seeds.entries()) {
  const { train, test } = split(seed);
  // On the first split every model; on the others only the three the paired test compares.
  const chosen = models().filter(([m]) => s === 0 || ["elo", "elo, one area", "logistic"].includes(m.name));
  const predictions = new Map(chosen.map(([m, kind]) => [m.name, { kind, predictions: heldOutPredictions(m, train, test) }]));
  if (s === 0)
    for (const [name, { kind, predictions: ps }] of predictions) {
      const m = metrics(name, ps);
      predictionRows.push({ model: name, kind, log_loss: m.logLoss, rmse: m.rmse, auc: m.auc, accuracy: m.accuracy, answers: m.n });
    }
  const logistic = { name: "logistic", predictions: predictions.get("logistic")!.predictions };
  for (const against of ["elo", "elo, one area"]) {
    const other = { name: against, predictions: predictions.get(against)!.predictions };
    const byStudent = pairedLogLoss(logistic, other, { resamples, seed });
    const byClass = pairedLogLoss(logistic, other, { resamples, seed, groupOf: (st) => classes[st] ?? st });
    pairedRows.push({
      seed, against, difference: byStudent.difference, lo: byStudent.interval[0], hi: byStudent.interval[1],
      class_lo: byClass.interval[0], class_hi: byClass.interval[1], students: byStudent.students, classes: byClass.groups, verdict: byStudent.verdict,
    });
  }
  console.log(`  split ${seed}: prediction done`);
}
write("benchmark-models.csv", predictionRows);
write("benchmark-paired.csv", pairedRows);

// ---------- when to stop (H3) ----------

/** The next three answers after each declaration, and the mean answers before it. */
const afterRow = (rule: MasteryRule, practices: readonly Practice[], kind: string) => {
  const a = rightAfter(rule, practices), j = judge(rule, practices);
  return { rule: rule.name, kind, cost: j.cost, declared: j.declared, right_after: a.right, answers_after: a.answers, practices_after: a.practices };
};
const masteryRows: Record<string, unknown>[] = [];
const versusRows: Record<string, unknown>[] = [];
const curveRows: Record<string, unknown>[] = [];
for (const [s, seed] of seeds.entries()) {
  const { train, test } = splitByStudent(practicesFrom(observations), testShare, seed);
  const fitted = fitRules(train);
  const rules = usualRules(fitted, train);
  const { rule: logistic, threshold, scores } = heldOutLogisticRule(observations, { testShare, seed, params: { areaOf } });
  for (const r of rules) {
    const v = compareAfter(logistic, r, test, resamples, seed);
    versusRows.push({ seed, threshold, against: v.rule, right: v.right, right_lo: v.rightInterval[0], right_hi: v.rightInterval[1], cost: v.cost, cost_lo: v.costInterval[0], cost_hi: v.costInterval[1] });
  }
  if (s === 0) {
    masteryRows.push(...rules.map((r) => afterRow(r, test, r.name.startsWith("streak") ? "streak" : r.name.split(" ")[0])), afterRow(logistic, test, "logistic"));
    // Every setting of each family, as the trade-off curves (description: the thresholds here are not set on training students).
    const families: [string, string, MasteryRule][] = [
      ...[1, 2, 3, 4, 5].map((n): [string, string, MasteryRule] => ["streak", String(n), streakRule(n)]),
      ...[0.55, 0.6, 0.65, 0.7, 0.75, 0.8].map((t): [string, string, MasteryRule] => ["EMA", String(t), emaRule(fitted.ema, t)]),
      ...[0.7, 0.8, 0.9, 0.95, 0.98, 0.99].map((t): [string, string, MasteryRule] => ["BKT", String(t), bktRule(fitted.bkt, t)]),
      ...[0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9].map((t): [string, string, MasteryRule] => ["logistic", String(t), logisticRule(scores, t)]),
    ];
    for (const [method, setting, rule] of families) {
      const r = afterRow(rule, test, method);
      curveRows.push({ method, setting, cost: r.cost, right_after: r.right_after, practices_after: r.practices_after });
    }
  }
  console.log(`  split ${seed}: mastery done`);
}
write("benchmark-mastery.csv", masteryRows);
write("benchmark-versus.csv", versusRows);
write("benchmark-curve.csv", curveRows);
