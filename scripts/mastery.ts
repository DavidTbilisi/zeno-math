// Mastery decisions (docs/thesis/outline.md, H2 and H3). On simulated learners, whose true state is recorded after
// every answer, H2: the answers BKT, EMA and the streak rule each need for their declarations to be right at least 90 %
// of the time, with thresholds set on training learners and judged on the rest, in each world and at each learning
// rate separately; then, as description, the three at the streak rule's cost, and the trade-off curves. On logged
// answers, where the truth is unknown, H3: how often the rules agree, and how the students did after each declared
// mastery.
//
//   npm run mastery                                       H2 in every world: bkt, bkt with forgetting, elo, irt2pl
//   npm run mastery -- --observations assistments.json    H3 on a data set (scripts/import-assistments.ts)
//   --worlds bkt,elo  --students 400  --length 30  --seed 1  --test-share 0.2  --streak 3  --resamples 2000
//   --skills algebra,average   --learn-rates 0.02,0.1   --target 0.9   --forget 0.02   --mastered-at 0.9
//   --beyond              search BKT and EMA thresholds above 0.9999 too, up to 1 − 10^−15 (a check after the results)
//   --curves curves.csv   every method's cost and precision at every threshold, per world, for a plot
//   --json                machine-readable output
import { readFileSync, writeFileSync } from "node:fs";
import { AREAS, type Area, type SkillId } from "../src/math/practiceSkills.ts";
import { fromFile, type DatasetFile } from "../src/model/datasets.ts";
import { splitByStudent } from "../src/model/evaluate.ts";
import {
  agreement, ALL_SIM_SKILLS, BEYOND_THRESHOLDS, bktRule, bootstrapByStudent, compareAtCost, compareAtPrecision, decide, emaRule, FINE_THRESHOLDS, fitRules,
  judge, MASTERED_AT, practicesFrom,
  PRECISION_TARGET, precisionOf, rightAfter, simulatePractice, streakRule, thresholdForCost, tradeOff,
  type AtCost, type AtPrecision, type CurvePoint, type PracticeParams,
} from "../src/model/mastery.ts";
import { isSimSkill, SIM_SKILLS } from "../src/model/simulate.ts";

const args = process.argv.slice(2);
const opt = (name: string, fallback: string) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const fail = (message: string) => {
  console.error(message);
  process.exit(2);
};
const whole = (name: string, fallback: number) => {
  const v = Number(opt(name, String(fallback)));
  if (!Number.isInteger(v) || v < 1) fail(`${name} must be a whole number above 0`);
  return v;
};
const share = (name: string, fallback: number) => {
  const v = Number(opt(name, String(fallback)));
  if (!(v >= 0 && v < 1)) fail(`${name} must be at least 0 and below 1`);
  return v;
};
const seed = whole("--seed", 1);
const testShare = share("--test-share", 0.2);
const streak = whole("--streak", 3);
const resamples = whole("--resamples", 2000);
const json = args.includes("--json");
const thresholds = args.includes("--beyond") ? BEYOND_THRESHOLDS : FINE_THRESHOLDS;
const pct = (x: number) => (Number.isNaN(x) ? "–" : `${(x * 100).toFixed(1)} %`);
const interval = ([lo, hi]: [number, number]) => `[${pct(lo)}, ${pct(hi)}]`;

const dataset = args.includes("--observations") ? opt("--observations", "") : "";
if (dataset) realAnswers(dataset);
else simulated();

/** H3: the fitted rules and the streak rule on logged answers. */
function realAnswers(file: string) {
  const { source, observations } = fromFile(JSON.parse(readFileSync(file, "utf8")) as DatasetFile);
  const { train, test } = splitByStudent(practicesFrom(observations), testShare, seed);
  const fitted = fitRules(train);
  // BKT at the usual 0.95; EMA, which has no usual threshold, at the one costing what the streak rule costs on the
  // training students (cost needs no truth).
  const bkt = bktRule(fitted.bkt, 0.95);
  const ema = emaRule(fitted.ema, thresholdForCost((t) => emaRule(fitted.ema, t), train, judge(streakRule(streak), train).cost));
  const rules = [bkt, ema, streakRule(streak)];
  const agree = [agreement(bkt, rules[2], test), agreement(ema, rules[2], test), agreement(bkt, ema, test)];
  const after = rules.map((r) => rightAfter(r, test));
  if (json) return console.log(JSON.stringify({ source, testShare, seed, ema: fitted.ema, practices: test.length, agreement: agree, after }, null, 2));
  console.log(`${source}: ${test.length.toLocaleString("en")} held-out practices (student and skill); EMA α ${fitted.ema.alpha}, start ${fitted.ema.start.toFixed(3)}\n`);
  console.log("agreement                 both    only first  only second  neither  gap (answers)");
  const names = [`${bkt.name} / ${rules[2].name}`, `${ema.name} / ${rules[2].name}`, `${bkt.name} / ${ema.name}`];
  agree.forEach((a, i) => console.log(`${names[i].padEnd(26)}${pct(a.both).padStart(7)}${pct(a.onlyFirst).padStart(13)}${pct(a.onlySecond).padStart(13)}${pct(a.neither).padStart(9)}${(Number.isNaN(a.meanGap) ? "–" : a.meanGap.toFixed(2)).padStart(15)}`));
  console.log("\nthe next three answers after mastery is declared");
  for (const a of after) console.log(`  ${a.rule.padEnd(14)} ${pct(a.right).padStart(7)} right, ${a.answers} answers in ${a.practices} practices`);
}

/** H2: every world on its own, never pooled. */
function simulated() {
  const skillArg = opt("--skills", "");
  const skills: readonly SkillId[] = skillArg
    ? skillArg.split(",").flatMap((s): readonly SkillId[] => (AREAS.includes(s as Area) ? SIM_SKILLS[s as Area] : [s as SkillId]))
    : ALL_SIM_SKILLS;
  const unknown = skills.filter((s) => !isSimSkill(s));
  if (unknown.length) fail(`unknown skills: ${unknown.join(", ")}`);
  const base: PracticeParams = { skills, students: whole("--students", 400), length: whole("--length", 30), seed, masteredAt: share("--mastered-at", MASTERED_AT) };
  // The two learning rates of the simulation study (scripts/simulate-study.ts), so H2 rests on no rate chosen for it.
  const rates = opt("--learn-rates", "0.02,0.1").split(",").map(Number);
  if (rates.some((r) => !(r > 0))) fail("--learn-rates must be numbers above 0, separated by commas");
  const target = share("--target", PRECISION_TARGET);
  const forget = share("--forget", 0.02);
  // The bkt world as BKT assumes it (one level, flat learning, no transfer, no forgetting), then the worlds that are not.
  const WORLDS: Record<string, PracticeParams> = {
    bkt: { world: "bkt" },
    "bkt, forgetting": { world: "bkt", forget },
    elo: { world: "elo" },
    irt2pl: { world: "irt2pl" },
  };
  const chosen = args.includes("--worlds") ? opt("--worlds", "").split(",").map((w) => (w === "bkt-forget" ? "bkt, forgetting" : w)) : Object.keys(WORLDS);
  if (chosen.some((w) => !WORLDS[w])) fail("worlds are bkt, bkt-forget, elo, irt2pl");

  type Result = { world: string; learnRate: number; knownAtStart: number; knownAtEnd: number; ema: { alpha: number; start: number }; atPrecision: AtPrecision[]; atCost: AtCost[]; usual: AtCost; curve: CurvePoint[] };
  const results: Result[] = [];
  for (const learnRate of rates)
    for (const world of chosen) {
      const practices = simulatePractice({ ...base, learnRate, ...WORLDS[world] });
      const { train, test } = splitByStudent(practices, testShare, seed);
      const fitted = fitRules(train);
      // The usual settings, BKT at 0.95 as Cognitive Tutors use it: in the plain bkt world its precision has a floor of
      // 0.95 with the true parameters, so how far below it falls is what fitting costs.
      const rule = bktRule(fitted.bkt, 0.95);
      const decisions = decide(rule, test);
      const knownShare = (i: (p: (typeof test)[number]) => number) => test.filter((p) => p.known![i(p)]).length / test.length;
      results.push({
        world,
        learnRate,
        knownAtStart: knownShare(() => 0),
        knownAtEnd: knownShare((p) => p.known!.length - 1),
        ema: fitted.ema,
        atPrecision: compareAtPrecision(train, test, fitted, target, resamples, seed, thresholds),
        atCost: compareAtCost(train, test, fitted, streak, resamples, seed),
        usual: { ...judge(rule, test, decisions), threshold: 0.95, interval: bootstrapByStudent(test, precisionOf(decisions), resamples, seed) },
        curve: tradeOff(fitted, test),
      });
    }

  const curves = opt("--curves", "");
  if (curves) {
    const lines = ["world,learn_rate,method,threshold,cost,declared,precision,missed"];
    for (const r of results)
      for (const c of r.curve) lines.push([JSON.stringify(r.world), r.learnRate, c.method, c.threshold, c.cost.toFixed(4), c.declared.toFixed(4), c.precision.toFixed(4), c.missed.toFixed(4)].join(","));
    writeFileSync(curves, lines.join("\n") + "\n");
  }
  if (json) return console.log(JSON.stringify({ ...base, learnRates: rates, target, forget, testShare, streak, resamples, highestThreshold: thresholds.at(-1), results }, null, 2));

  const answers = (x: number) => (Number.isNaN(x) ? "–" : x.toFixed(2));
  const span = ([lo, hi]: [number, number]) => `[${answers(lo)}, ${answers(hi)}]`;
  console.log(`${base.students} simulated learners × ${skills.length} skills × ${base.length} questions at level 2; ${pct(testShare)} of learners held out, seed ${seed}`);
  console.log(`H2: the answers each method needs for its declarations to be right at least ${pct(target)} of the time (threshold set on the training learners, up to ${thresholds === FINE_THRESHOLDS ? "0.9999" : "1 − 10^−15"})`);
  for (const r of results) {
    console.log(`\n${r.world}, learning rate ${r.learnRate}: known after the first answer ${pct(r.knownAtStart)}, after the last ${pct(r.knownAtEnd)}; EMA α ${r.ema.alpha}, start ${r.ema.start.toFixed(3)}`);
    console.log(`  ${"rule".padEnd(16)}${"answers".padStart(8)}  ${"95 % interval".padEnd(16)}${"precision".padStart(10)}${"declared".padStart(10)}${"missed".padStart(8)}   BKT saves`);
    for (const a of r.atPrecision) {
      const j = a.judgement;
      if (!j) {
        console.log(`  ${a.method.padEnd(16)}never right ${pct(target)} of the time on the training learners`);
        continue;
      }
      const saves = a.bktSaves ? `${answers(a.bktSaves.estimate)} ${span(a.bktSaves.interval)}` : "";
      console.log(`  ${a.rule!.padEnd(16)}${answers(j.cost).padStart(8)}  ${span(j.costInterval).padEnd(16)}${pct(j.precision).padStart(10)}${pct(j.declared).padStart(10)}${pct(j.missed).padStart(8)}   ${saves}`);
    }
    console.log(`  at the cost of ${streakRule(streak).name} (description):`);
    for (const a of [...r.atCost, r.usual])
      console.log(`    ${a.rule.padEnd(16)}${a.cost.toFixed(2).padStart(7)} answers, ${pct(a.precision)} right ${interval(a.interval)}, ${pct(a.declared)} declared`);
  }
  if (curves) console.log(`\ntrade-off curves written to ${curves}`);
}
