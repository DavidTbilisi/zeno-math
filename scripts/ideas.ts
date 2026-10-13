// Skills made of ideas, asked by Zeno's own questions (src/model/ideas.ts): H2's comparison on times, hcf and
// fractions in a world where a learner knows or does not know each idea of the fractions graph and every question is
// one the generator makes, needing several ideas at once. For each skill and learning rate, BKT on the skill, EMA and
// the streak rule as H2 ran them, then BKT on each idea: afresh, with a recognised mistake's blame on its idea, and
// carried from skill to skill; how well each score matches the truth (every idea known); and whether BKT on each idea
// finds the one idea a student is short of. Every method is also judged at the threshold a deployed system would use
// without a truth (BKT 0.95, the EMA at the streak rule's cost, streak 3), and when more than one setting is run the
// last table puts the sweep side by side (G2: the share of questions asking for one idea alone against practice
// length; G1: the skills, three to sixteen ideas modelled as one).
//
//   npm run ideas
//   npm run ideas -- --skills fractions --isolate 0,0.25,0.5,1 --length 30,60,120     G2's sweep
//   --learn-rates 0.02,0.1  --students 400  --length 30  --trap-rate 0.5  --seed 1
//   --skills fractions      only these skills (times, hcf, fractions)
//   --isolate 0,0.3         the share of questions asking for one idea alone (0: the generators as they are; 1: every question)
//   --length 30,60,120      questions on each skill
//   --test-share 0.2  --target 0.9  --resamples 2000
//   --beyond   search thresholds above 0.9999 too, up to 1 − 10^−15, as H2's check after the results did
//   --json     machine-readable output
import { compareIdeas, DEFAULT_IDEAS, IDEA_SKILLS, ideasOf, simulateIdeas, type IdeasComparison, type IdeaSkill } from "../src/model/ideas.ts";
import { splitByStudent } from "../src/model/evaluate.ts";
import { BEYOND_THRESHOLDS, FINE_THRESHOLDS, PRECISION_TARGET, type AtPrecision } from "../src/model/mastery.ts";

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

const rates = opt("--learn-rates", "0.02,0.1").split(",").map(Number);
if (rates.some((r) => !(r > 0))) fail("--learn-rates must be numbers above 0, separated by commas");
const skills = opt("--skills", IDEA_SKILLS.join(",")).split(",") as IdeaSkill[];
if (skills.some((s) => !IDEA_SKILLS.includes(s))) fail(`--skills must be among ${IDEA_SKILLS.join(", ")}`);
const isolates = opt("--isolate", "0").split(",").map(Number);
if (isolates.some((x) => !(x >= 0 && x <= 1))) fail("--isolate must be shares from 0 to 1, separated by commas");
const lengths = opt("--length", String(DEFAULT_IDEAS.length)).split(",").map(Number);
if (lengths.some((n) => !Number.isInteger(n) || n < 1)) fail("--length must be whole numbers above 0, separated by commas");
const base = {
  students: whole("--students", DEFAULT_IDEAS.students),
  trapRate: share("--trap-rate", DEFAULT_IDEAS.trapRate),
  seed: whole("--seed", DEFAULT_IDEAS.seed),
};
const testShare = share("--test-share", 0.2);
const target = share("--target", PRECISION_TARGET);
const resamples = whole("--resamples", 2000);
const thresholds = args.includes("--beyond") ? BEYOND_THRESHOLDS : FINE_THRESHOLDS;

type Result = { learnRate: number; isolateRate: number; length: number; knownAtEnd: number; ideasPerQuestion: number } & IdeasComparison;
const results: Result[] = [];
for (const learnRate of rates)
  for (const isolateRate of isolates)
    for (const length of lengths) {
      const { train, test } = splitByStudent(simulateIdeas({ ...base, length, learnRate, isolateRate }), testShare, base.seed);
      for (const skill of skills) {
        const mine = test.filter((p) => p.skill === skill);
        const knownAtEnd = mine.filter((p) => p.known[p.known.length - 1]).length / mine.length;
        const ideasPerQuestion = mine.reduce((s, p) => s + p.needs.reduce((t, n) => t + n.length, 0), 0) / mine.reduce((s, p) => s + p.needs.length, 0);
        results.push({ learnRate, isolateRate, length, knownAtEnd, ideasPerQuestion, ...compareIdeas(train, test, skill, target, resamples, base.seed, thresholds) });
      }
    }
// Written with a single write, not console.log and process.exit: a large JSON on a pipe is cut off by an exit before it has drained.
if (args.includes("--json")) process.stdout.write(JSON.stringify({ ...base, lengths, learnRates: rates, isolateRates: isolates, testShare, target, resamples, highestThreshold: thresholds.at(-1), results }, null, 2) + "\n");
else report();

function report() {
  const pct = (x: number) => (Number.isNaN(x) ? "–" : `${(x * 100).toFixed(1)} %`);
  const answers = (x: number) => (Number.isNaN(x) ? "–" : x.toFixed(2));
  const span = ([lo, hi]: [number, number]) => `[${answers(lo)}, ${answers(hi)}]`;
  const row = (label: string, a: AtPrecision, saves: string) => {
    const j = a.judgement;
    if (!j) return console.log(`  ${label.padEnd(18)}never right ${pct(target)} of the time on the training learners`);
    console.log(`  ${label.padEnd(18)}${a.rule!.replace(/^.* θ /, "θ ").padEnd(16)}${answers(j.cost).padStart(8)}  ${span(j.costInterval).padEnd(16)}${pct(j.precision).padStart(10)}${pct(j.declared).padStart(10)}   ${saves}`);
  };
  const chosen = (a: AtPrecision) => (a.rule ? a.rule.replace(/^.* θ /, "") : "never");
  console.log(`${base.students} simulated learners × ${IDEA_SKILLS.join(", ")} × ${lengths.join(", ")} questions from the generators; ${pct(testShare)} of learners held out, seed ${base.seed}`);
  console.log(`a wrong answer is a recognised mistake ${pct(base.trapRate)} of the time when the question has one and its idea is missing`);
  console.log(`the answers each method needs for its declarations to be right at least ${pct(target)} of the time (threshold set on the training learners, up to ${thresholds === FINE_THRESHOLDS ? "0.9999" : "1 − 10^−15"})`);
  for (const r of results) {
    const alone = r.isolateRate ? `, ${pct(r.isolateRate)} of questions asking for one idea alone` : "";
    console.log(`\n${r.skill} (${ideasOf(r.skill).length} ideas, ${r.ideasPerQuestion.toFixed(1)} per question${alone}), ${r.length} questions, learning rate ${r.learnRate}: every idea known after the last answer ${pct(r.knownAtEnd)}`);
    console.log(`  ${"method".padEnd(18)}${"rule".padEnd(16)}${"answers".padStart(8)}  ${"95 % interval".padEnd(16)}${"precision".padStart(10)}${"declared".padStart(10)}   per idea minus on the skill`);
    const [bkt, ema, streak] = r.onSkill;
    row("BKT on the skill", bkt, "");
    row("EMA", ema, "");
    row("streak", streak, "");
    for (const [label, a] of [["BKT per idea", r.perIdea], ["  blamed", r.blamed], ["  carried", r.carried]] as const) row(label, a, a.bktSaves ? `${answers(a.bktSaves.estimate)} ${span(a.bktSaves.interval)}` : "");
    if (r.carryingSaves) console.log(`  carried minus blamed: ${answers(r.carryingSaves.estimate)} answers ${span(r.carryingSaves.interval)}`);
    const names = ["BKT P(known)", "BKT P(right)", "EMA", "per idea", "blamed", "carried"];
    console.log(`  Brier score against the truth after every answer: ${r.calibration.map((c, i) => `${names[i]} ${c.brier.toFixed(3)}`).join(", ")}`);
    const d = r.diagnosis;
    console.log(`  the one missing idea found (of ${d[0].moments} moments; chance ${pct(d[0].chance)}): per idea ${pct(d[0].right)}, blamed ${pct(d[1].right)}, carried ${pct(d[2].right)}`);
    console.log(`  at the usual thresholds (set without a truth): ${r.usual.map((u) => `${u.rule} right ${pct(u.precision)}, declared ${pct(u.declared)}, ${answers(u.cost)} answers`).join("; ")}`);
  }
  if (results.length < 2) return;
  console.log(`\nthe sweep side by side: precision at the usual threshold (BKT 0.95, the EMA at the streak rule's cost), the cheapest threshold right ${pct(target)} of the time on the training learners, the Brier score against the truth, and the one missing idea found`);
  console.log(`${"setting".padEnd(42)}${"ideas/q".padStart(8)}${"BKT on the skill".padStart(25)}${"EMA".padStart(25)}${"BKT per idea, carried".padStart(25)}${"missing idea found".padStart(32)}${"carrying".padStart(10)}`);
  console.log(`${"".padEnd(50)}${`${"usual".padStart(8)}${"θ 90 %".padStart(10)}${"Brier".padStart(7)}`.repeat(3)}${"afresh".padStart(8)}${"blamed".padStart(8)}${"carried".padStart(8)}${"chance".padStart(8)}${"saves".padStart(10)}`);
  for (const r of results) {
    const setting = `${r.skill}, alone ${pct(r.isolateRate)}, n ${r.length}, rate ${r.learnRate}`;
    const cells = [
      [r.usual[0].precision, chosen(r.onSkill[0]), r.calibration[0].brier],
      [r.usual[1].precision, chosen(r.onSkill[1]), r.calibration[2].brier],
      [r.usual[5].precision, chosen(r.carried), r.calibration[5].brier],
    ] as const;
    const found = [...r.diagnosis.map((d) => d.right), r.diagnosis[0].chance].map((x) => pct(x).padStart(8)).join("");
    console.log(`${setting.padEnd(42)}${r.ideasPerQuestion.toFixed(1).padStart(8)}${cells.map(([p, t, b]) => `${pct(p).padStart(8)}${t.padStart(10)}${b.toFixed(3).padStart(7)}`).join("")}${found}${(r.carryingSaves ? answers(r.carryingSaves.estimate) : "–").padStart(10)}`);
  }
}
