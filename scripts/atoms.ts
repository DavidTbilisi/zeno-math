// Skills made of atoms (src/model/atoms.ts): H2's comparison in a world where every skill is k atoms, each learnt as
// BKT assumes, asked for in turn. For each number of atoms and learning rate, BKT on the skill, EMA and the streak rule
// as H2 ran them, then BKT on each atom, which knows which atom each question asked for; and how well each score after
// every answer matches the truth (every atom known).
//
//   npm run atoms
//   --atoms 1,2,3,4  --learn-rates 0.02,0.1  --students 400  --skills 12  --length 30  --seed 1
//   --test-share 0.2  --target 0.9  --resamples 2000
//   --beyond   search thresholds above 0.9999 too, up to 1 − 10^−15, as H2's check after the results did
//   --json     machine-readable output
import { compareAtoms, DEFAULT_ATOMS, simulateAtoms, type AtomsComparison } from "../src/model/atoms.ts";
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
const list = (name: string, fallback: string) => opt(name, fallback).split(",").map(Number);

const atoms = list("--atoms", "1,2,3,4");
if (atoms.some((k) => !Number.isInteger(k) || k < 1 || k > 255)) fail("--atoms must be whole numbers from 1 to 255, separated by commas");
const rates = list("--learn-rates", "0.02,0.1");
if (rates.some((r) => !(r > 0))) fail("--learn-rates must be numbers above 0, separated by commas");
const base = {
  students: whole("--students", DEFAULT_ATOMS.students),
  skills: whole("--skills", DEFAULT_ATOMS.skills),
  length: whole("--length", DEFAULT_ATOMS.length),
  seed: whole("--seed", DEFAULT_ATOMS.seed),
};
const testShare = share("--test-share", 0.2);
const target = share("--target", PRECISION_TARGET);
const resamples = whole("--resamples", 2000);
const thresholds = args.includes("--beyond") ? BEYOND_THRESHOLDS : FINE_THRESHOLDS;

type Result = { atoms: number; learnRate: number; knownAtEnd: number } & AtomsComparison;
const results: Result[] = [];
for (const learnRate of rates)
  for (const k of atoms) {
    const { train, test } = splitByStudent(simulateAtoms({ ...base, atoms: k, learnRate }), testShare, base.seed);
    const knownAtEnd = test.filter((p) => p.known[p.known.length - 1]).length / test.length;
    results.push({ atoms: k, learnRate, knownAtEnd, ...compareAtoms(train, test, target, resamples, base.seed, thresholds) });
  }
if (args.includes("--json")) {
  console.log(JSON.stringify({ ...base, learnRates: rates, testShare, target, resamples, highestThreshold: thresholds.at(-1), results }, null, 2));
  process.exit(0);
}

const pct = (x: number) => (Number.isNaN(x) ? "–" : `${(x * 100).toFixed(1)} %`);
const answers = (x: number) => (Number.isNaN(x) ? "–" : x.toFixed(2));
const span = ([lo, hi]: [number, number]) => `[${answers(lo)}, ${answers(hi)}]`;
const row = (label: string, a: AtPrecision, saves: string) => {
  const j = a.judgement;
  if (!j) return console.log(`  ${label.padEnd(18)}never right ${pct(target)} of the time on the training learners`);
  console.log(`  ${label.padEnd(18)}${a.rule!.replace(/^.* θ /, "θ ").padEnd(16)}${answers(j.cost).padStart(8)}  ${span(j.costInterval).padEnd(16)}${pct(j.precision).padStart(10)}${pct(j.declared).padStart(10)}   ${saves}`);
};
console.log(`${base.students} simulated learners × ${base.skills} skills × ${base.length} questions; each skill is k atoms asked for in turn; ${pct(testShare)} of learners held out, seed ${base.seed}`);
console.log(`the answers each method needs for its declarations to be right at least ${pct(target)} of the time (threshold set on the training learners, up to ${thresholds === FINE_THRESHOLDS ? "0.9999" : "1 − 10^−15"})`);
for (const r of results) {
  console.log(`\n${r.atoms} atom${r.atoms > 1 ? "s" : ""}, learning rate ${r.learnRate}: every atom known after the last answer ${pct(r.knownAtEnd)}`);
  console.log(`  ${"method".padEnd(18)}${"rule".padEnd(16)}${"answers".padStart(8)}  ${"95 % interval".padEnd(16)}${"precision".padStart(10)}${"declared".padStart(10)}   per atom minus on the skill`);
  const [bkt, ema, streak] = r.skill;
  row("BKT on the skill", bkt, "");
  row("EMA", ema, "");
  row("streak", streak, "");
  row("BKT per atom", r.perAtom, r.perAtom.bktSaves ? `${answers(r.perAtom.bktSaves.estimate)} ${span(r.perAtom.bktSaves.interval)}` : "");
  const names = ["BKT P(known)", "BKT P(right)", "EMA", "BKT per atom"];
  console.log(`  Brier score against the truth after every answer: ${r.calibration.map((c, i) => `${names[i]} ${c.brier.toFixed(3)}`).join(", ")}`);
}
