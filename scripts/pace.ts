// Relative response time (issue #63, src/model/pace.ts) on a data set with first-response times: how much of a
// student's relative time the three layers predict, whether weighting fast answers improves the EMA mastery rule by the
// verdict rule fixed before the first run (PACE_VERDICT), and how often a change of pace comes up and what follows it.
//
//   npm run import-assistments -- data/skill_builder_data.csv --out assistments.json
//   npm run pace -- --observations assistments.json
//   --seed 1  --test-share 0.2  --streak 3  --resamples 2000  --json
//
// A CSV export of Zeno's own attempts (server/research.ts) works too: its ms_first column is the first-response time.
import { readFileSync } from "node:fs";
import { fromFile, type DatasetFile } from "../src/model/datasets.ts";
import type { Observation } from "../src/model/elo.ts";
import { observationsFromCsv, splitByStudent } from "../src/model/evaluate.ts";
import { compareAfter, emaRule, fitRules, judge, streakRule, thresholdForCost, type MasteryRule } from "../src/model/mastery.ts";
import {
  adopted, explained, fitNorms, fitPace, pacedPractices, paceJump, paceRows, PACE_VERDICT, POSITION_CAP, predictPace, relative, SPEED_VARIANTS,
  speedEmaLogLoss, speedEmaRule, type PaceRow,
} from "../src/model/pace.ts";

const args = process.argv.slice(2);
const opt = (name: string, fallback: string) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const file = opt("--observations", "");
if (!file) {
  console.error("usage: npm run pace -- --observations assistments.json (or a CSV export of attempts)");
  process.exit(2);
}
const seed = Number(opt("--seed", "1"));
const testShare = Number(opt("--test-share", "0.2"));
const streak = Number(opt("--streak", "3"));
const resamples = Number(opt("--resamples", "2000"));
const json = args.includes("--json");

let observations: Observation[], areas: Record<string, string> = {}, source = file;
if (file.endsWith(".csv")) observations = observationsFromCsv(readFileSync(file, "utf8"));
else ({ observations, areas, source } = fromFile(JSON.parse(readFileSync(file, "utf8")) as DatasetFile));
const timed = observations.filter((o) => o.ms !== undefined).length;
if (!timed) {
  console.error(`${file} has no first-response times: import it again (the importer keeps them since issue #63)`);
  process.exit(2);
}
const areaOf = (k: string) => areas[k] ?? "other";
const { train, test } = splitByStudent(observations, testShare, seed);
const norms = fitNorms(train);

// 1. The three layers, alone and together, with and without the position term, fitted on training students.
const rowsTrain = paceRows(train, norms, areaOf);
const rowsTest = paceRows(test, norms, areaOf);
const configs: { name: string; layers: number[]; positions: boolean }[] = [
  { name: "student", layers: [0], positions: false },
  { name: "area", layers: [1], positions: false },
  { name: "skill", layers: [2], positions: false },
  { name: "all three", layers: [0, 1, 2], positions: false },
  { name: "all three + position", layers: [0, 1, 2], positions: true },
];
const layers = configs.map((c) => {
  const w = fitPace(rowsTrain, c.layers, c.positions);
  return { name: c.name, weights: w, explained: explained(rowsTest, (r) => predictPace(w, r)) };
});
const byPosition = Array.from({ length: POSITION_CAP }, (_, i) => {
  const ys = rowsTrain.filter((r: PaceRow) => r.position === i + 1).map((r) => r.y);
  return ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : NaN;
});

// 2. The speed-qualified EMA, each at the training cost of the streak rule, against the plain EMA at the same cost.
const ptrain = pacedPractices(train, norms);
const ptest = pacedPractices(test, norms);
const fitted = fitRules(ptrain);
const cost = judge(streakRule(streak), ptrain).cost;
const plain = emaRule(fitted.ema, thresholdForCost((t) => emaRule(fitted.ema, t), ptrain, cost));
const plainLoss = speedEmaLogLoss(ptest, fitted.ema, { fastRight: 1, fastWrong: 1 });
const variants = SPEED_VARIANTS.map((v) => {
  const make = (t: number): MasteryRule => speedEmaRule(fitted.ema, t, v.weights, v.name);
  const rule = make(thresholdForCost(make, ptrain, cost));
  const vs = compareAfter(rule, plain, ptest, resamples, seed);
  const loss = speedEmaLogLoss(ptest, fitted.ema, v.weights);
  return { variant: v.name, rule: rule.name, right: vs.right, rightInterval: vs.rightInterval, cost: vs.cost, costInterval: vs.costInterval, logLossGain: plainLoss - loss, adopted: adopted(vs.right, vs.rightInterval) };
});

// 3. A change of pace on held-out students: how often, and the next answer against the student's own share right.
const byStudent = new Map<string, Observation[]>();
for (const o of test) (byStudent.get(o.student) ?? byStudent.set(o.student, []).get(o.student)!).push(o);
const jumps = { none: [0, 0], faster: [0, 0], slower: [0, 0] } as Record<"none" | "faster" | "slower", [number, number]>;
for (const answers of byStudent.values()) {
  const share = answers.filter((o) => o.correct).length / answers.length;
  const rel: number[] = [];
  answers.forEach((o, i) => {
    if (i) {
      const j = paceJump(rel);
      const s = jumps[j ? j.direction : "none"];
      if (rel.filter((x) => !Number.isNaN(x)).length >= 15) (s[0] += Number(o.correct) - share), s[1]++;
    }
    rel.push(relative(norms, o));
  });
}
const pace = Object.fromEntries(Object.entries(jumps).map(([k, [sum, n]]) => [k, { points: n, nextVsOwn: n ? sum / n : NaN }]));

if (json) {
  console.log(JSON.stringify({ source, seed, testShare, timed, layers, byPosition, ema: fitted.ema, streakCost: cost, plain: plain.name, plainLogLoss: plainLoss, verdictRule: PACE_VERDICT, variants, pace }, null, 2));
  process.exit(0);
}
const pct = (x: number) => `${(100 * x).toFixed(1)} %`;
const pts = (x: number) => `${x >= 0 ? "+" : "−"}${Math.abs(100 * x).toFixed(1)}`;
console.log(`${source}: ${observations.length.toLocaleString("en")} answers, ${timed.toLocaleString("en")} with a first-response time; ${pct(testShare)} of students held out, seed ${seed}`);
console.log(`\n1. The next relative log time (0 = the question's norm), variance explained on held-out students (${rowsTest.length.toLocaleString("en")} answers):`);
for (const l of layers) console.log(`  ${l.name.padEnd(22)} ${pct(l.explained).padStart(7)}   weights ${l.weights.layers.map((w) => w.toFixed(2)).join(" / ")}`);
console.log(`  mean relative time by position on the skill (training): ${byPosition.map((y, i) => `${i + 1}${i + 1 === POSITION_CAP ? "+" : ""} ${y >= 0 ? "+" : ""}${y.toFixed(2)}`).join(", ")}`);
console.log(`\n2. EMA mastery with fast answers weighted, each at the streak's training cost (${cost.toFixed(2)} answers); plain ${plain.name}`);
console.log(`   verdict rule fixed before the run: adopt if the next three answers after mastery are right ≥ ${PACE_VERDICT.minGain * 100} point more often than after the plain EMA, interval above 0`);
for (const v of variants)
  console.log(`  ${v.variant.padEnd(18)} next three right ${pts(v.right)} points [${v.rightInterval.map(pts).join(", ")}], answers before ${v.cost >= 0 ? "+" : ""}${v.cost.toFixed(2)}, log-loss gain ${v.logLossGain >= 0 ? "+" : ""}${v.logLossGain.toFixed(4)} → ${v.adopted ? "adopt" : "keep the plain EMA"}`);
console.log(`\n3. A change of pace (the last 5 timed answers at least twice or half the student's own pace before), held-out students:`);
for (const [k, v] of Object.entries(pace)) console.log(`  ${k.padEnd(7)} ${v.points.toLocaleString("en").padStart(9)} points, next answer ${pts(v.nextVsOwn)} points against the student's own share right`);
