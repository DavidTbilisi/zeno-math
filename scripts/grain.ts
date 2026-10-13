// G4 (docs/thesis/outline.md): the same real answers modelled at three grains, the data set's own skills, the topics
// they fall into, and one skill for everything (src/model/grain.ts). At each grain BKT and the moving average are
// fitted on the training students and predict the held-out students' answers; the paired test of H1 then compares
// grains on the answers every grain has, the finest against the coarsest for BKT being the one confirmatory test.
// Beside prediction: the fits at the grid's edge at each grain, what coarsening costs BKT minus what it costs the EMA,
// and the mastery declarations each method makes at each grain, counted as H3 counts them.
//
//   npm run grain -- --observations assistments.json     a data set (scripts/import-assistments.ts); topics from its areas
//   npm run grain -- --simulate                          synthetic learners, topics being the curriculum's areas
//   --seed 1   --test-share 0.2   --resamples 10000   --smallest 0.005   --streak 3   --json
import { readFileSync } from "node:fs";
import { AREAS, type SkillId } from "../src/math/practiceSkills.ts";
import { assistmentsTopic, fromFile, type DatasetFile } from "../src/model/datasets.ts";
import type { Observation } from "../src/model/elo.ts";
import { SMALLEST_DIFFERENCE } from "../src/model/evaluate.ts";
import { compareGrains, type GrainResult } from "../src/model/grain.ts";
import { SIM_SKILLS, simulateRandom } from "../src/model/simulate.ts";

const args = process.argv.slice(2);
const opt = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const fail = (message: string) => {
  console.error(message);
  process.exit(2);
};
const dataset = opt("--observations");
if (!dataset && !args.includes("--simulate")) fail("usage: npm run grain -- --observations <data.json> | --simulate   [--seed 1] [--test-share 0.2] [--resamples 10000] [--smallest 0.005] [--streak 3] [--json]");
const seed = Number(opt("--seed") ?? 1);
const testShare = Number(opt("--test-share") ?? 0.2);
const resamples = Number(opt("--resamples") ?? 10000);
const smallest = Number(opt("--smallest") ?? SMALLEST_DIFFERENCE);
const streak = Number(opt("--streak") ?? 3);
if (!Number.isInteger(seed)) fail("--seed must be a whole number");
if (!(testShare > 0 && testShare < 1)) fail("--test-share must be between 0 and 1");
if (!Number.isInteger(resamples) || resamples < 100) fail("--resamples must be a whole number of at least 100");
if (!(smallest > 0)) fail("--smallest must be above 0");
if (!Number.isInteger(streak) || streak < 1) fail("--streak must be a whole number above 0");

let source = "simulated class";
let observations: Observation[];
let topicOf: (skill: string) => string;
if (dataset) {
  const d = fromFile(JSON.parse(readFileSync(dataset, "utf8")) as DatasetFile);
  ({ source, observations } = d);
  topicOf = (skill) => d.areas[skill] ?? assistmentsTopic(skill);
} else {
  observations = simulateRandom().observations;
  const areaOf = new Map<string, string>(AREAS.flatMap((a) => (SIM_SKILLS[a] as readonly SkillId[]).map((s) => [s, a] as const)));
  topicOf = (skill) => areaOf.get(skill) ?? "other";
}
if (!observations.length) fail("no usable answers in the file");
const withProblems = observations.filter((o) => o.problem !== undefined).length;

const result = compareGrains(observations, topicOf, { seed, testShare, resamples, smallest, streak });

if (args.includes("--json")) {
  process.stdout.write(JSON.stringify({ source, withProblems, ...result }, null, 2) + "\n");
} else {
  const n = (x: number) => x.toLocaleString("en");
  const pct = (x: number) => (Number.isNaN(x) ? "–" : `${(x * 100).toFixed(1)} %`);
  const signed = (x: number) => `${x < 0 ? "−" : "+"}${Math.abs(x).toFixed(4)}`;
  const span = ([lo, hi]: [number, number]) => `[${signed(lo)}, ${signed(hi)}]`;
  console.log(`${source}: ${n(observations.length)} answers${withProblems ? ` (${n(withProblems)} name their problem)` : " (no problems named: nothing falls together at a coarser grain)"}; ${(testShare * 100).toFixed(0)} % of students held out, seed ${seed}; ${n(resamples)} resamples of students; smallest difference that counts ${smallest}\n`);
  console.log(`${"grain".padEnd(8)}${"skills".padStart(7)}${"train".padStart(10)}${"test".padStart(9)}${"BKT".padStart(9)}${"EMA".padStart(9)}  ${"BKT fits at bound / edge".padEnd(26)}EMA α`);
  for (const g of result.grains)
    console.log(`${g.grain.padEnd(8)}${n(g.skills).padStart(7)}${n(g.answers.train).padStart(10)}${n(g.answers.test).padStart(9)}${g.bkt.logLoss.toFixed(4).padStart(9)}${g.ema.logLoss.toFixed(4).padStart(9)}  ${`${pct(g.bkt.fits.atBound)} / ${pct(g.bkt.fits.atEdge)} of ${g.bkt.fits.fits}`.padEnd(26)}${g.ema.alpha}`);
  console.log(`\nfiner grain against coarser, mean log-loss per answer on the ${n(result.tests[0].test.answers)} answers every grain has (below zero, the finer predicts better)`);
  console.log(`${"comparison".padEnd(28)}${"difference".padStart(11)}  ${"95 % interval".padEnd(20)}verdict`);
  for (const { name, test } of result.tests) console.log(`${`${name}${test === result.tests[0].test ? " (test)" : ""}`.padEnd(28)}${signed(test.difference).padStart(11)}  ${span(test.interval).padEnd(20)}${test.verdict.replace("first", "finer").replace("second", "coarser")}`);
  console.log(`\nG4 is decided by BKT skill against one: ${result.tests[0].test.verdict.replace("first", "the finer grain").replace("second", "the coarser grain")}.`);
  const e = result.emaLosesLess;
  console.log(`coarsening from skills to one costs BKT ${signed(e.estimate)} per answer more than it costs the EMA ${span(e.interval)} (above zero, BKT loses more)`);
  console.log("\nmastery declarations on the held-out practices at each grain (no truth; the share declared, the mean answers to a declaration, the share right on the next three answers)");
  const line = (g: GrainResult, d: GrainResult["declarations"][number]) => console.log(`  ${g.grain.padEnd(8)}${d.rule.padEnd(22)}${pct(d.declared).padStart(8)}${d.cost.toFixed(2).padStart(9)}${pct(d.rightAfter).padStart(9)}`);
  console.log(`  ${"grain".padEnd(8)}${"rule".padEnd(22)}${"declared".padStart(8)}${"answers".padStart(9)}${"right after".padStart(12)}`);
  for (const g of result.grains) for (const d of g.declarations) line(g, d);
}
