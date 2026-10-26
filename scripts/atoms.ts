// Skills made of atoms (src/model/atoms.ts): H2's comparison in a world where every skill is k atoms, each learnt as
// BKT assumes, asked for at random. For each number of atoms and learning rate, BKT on the skill, EMA and the streak rule
// as H2 ran them, then BKT on each atom, which knows which atom each question asked for, started afresh in every skill
// and carried from skill to skill; and how well each score after every answer matches the truth (every atom known).
// With --uses above 1 skills share atoms, each atom in that many skills. With --split above 1 the model is finer than
// the learner: every atom is modelled as that many components (G3, too fine), and beside the comparison the script
// reports the fits at the grid's edge and whether each method's training threshold transfers to the held-out learners.
// With --per-question above 1 every question asks for that many atoms at once and is right only when all are known
// (G1 with several components a question, G2's sweep of how many a question needs). Every method is also judged at
// the threshold a deployed system would use without a truth (BKT 0.95, the EMA at the streak rule's cost, streak 3),
// and when more than one setting is run the last table puts the sweep side by side (G1: precision at the usual
// threshold, the cheapest threshold meeting the standard and the Brier score, against k).
//
//   npm run atoms
//   npm run atoms -- --atoms 3 --uses 1,2,3,4      what carrying shared atoms from skill to skill is worth
//   npm run atoms -- --atoms 2 --split 1,2,4       the model finer than the learner (G3)
//   npm run atoms -- --atoms 1,2,4,8,16            too coarse: k components modelled as one (G1), one asked at a time
//   npm run atoms -- --atoms 1,2,4,8,16 --per-question 1,2,4     the same with several asked at once (G1, G2); a setting asking for more atoms than the skill has is left out
//   --atoms 1,2,3,4  --uses 1  --split 1  --per-question 1  --learn-rates 0.02,0.1  --students 400  --skills 12  --length 30  --seed 1
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
const uses = list("--uses", "1");
if (uses.some((u) => !Number.isInteger(u) || u < 1)) fail("--uses must be whole numbers above 0, separated by commas");
const splits = list("--split", "1");
if (splits.some((s) => !Number.isInteger(s) || s < 1 || s > 16)) fail("--split must be whole numbers from 1 to 16, separated by commas");
const perQuestions = list("--per-question", "1");
if (perQuestions.some((m) => !Number.isInteger(m) || m < 1)) fail("--per-question must be whole numbers above 0, separated by commas");
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
for (const k of atoms)
  for (const u of uses) if ((base.skills * k) % u) fail(`${base.skills} skills of ${k} atoms cannot put every atom in ${u} skills`);

type Result = { atoms: number; uses: number; split: number; perQuestion: number; learnRate: number; knownAtEnd: number } & AtomsComparison;
const results: Result[] = [];
for (const learnRate of rates)
  for (const k of atoms)
    for (const u of uses)
      for (const split of splits)
        for (const perQuestion of perQuestions) {
          if (perQuestion > k) continue;
          if (k * split > 255) fail(`${k} atoms × ${split} components is more than 255 components a skill`);
          const { train, test } = splitByStudent(simulateAtoms({ ...base, atoms: k, uses: u, split, perQuestion, learnRate }), testShare, base.seed);
          const knownAtEnd = test.filter((p) => p.known[p.known.length - 1]).length / test.length;
          results.push({ atoms: k, uses: u, split, perQuestion, learnRate, knownAtEnd, ...compareAtoms(train, test, target, resamples, base.seed, thresholds) });
        }
if (!results.length) fail("no setting to run: every --per-question is above every --atoms");
// Written with a single write, not console.log and process.exit: a large JSON on a pipe is cut off by an exit before it has drained.
if (args.includes("--json")) process.stdout.write(JSON.stringify({ ...base, learnRates: rates, testShare, target, resamples, highestThreshold: thresholds.at(-1), results }, null, 2) + "\n");
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
  const θ = (t: number | null) => (t === null ? "never" : String(t));
  const chosen = (a: AtPrecision) => (a.rule ? a.rule.replace(/^.* θ /, "") : "never");
  const setting = (r: Result) => `${r.atoms} atom${r.atoms > 1 ? "s" : ""}${r.perQuestion > 1 ? `, ${r.perQuestion} a question` : ""}${r.uses > 1 ? `, each in ${r.uses} skills` : ""}${r.split > 1 ? `, split ${r.split}` : ""}, rate ${r.learnRate}`;
  console.log(`${base.students} simulated learners × ${base.skills} skills × ${base.length} questions; each skill is k atoms, each question asking for one at random; ${pct(testShare)} of learners held out, seed ${base.seed}`);
  console.log(`the answers each method needs for its declarations to be right at least ${pct(target)} of the time (threshold set on the training learners, up to ${thresholds === FINE_THRESHOLDS ? "0.9999" : "1 − 10^−15"})`);
  for (const r of results) {
    const shared = r.uses > 1 ? `, each in ${r.uses} skills` : "";
    const fine = r.split > 1 ? `, each modelled as ${r.split} components` : "";
    const several = r.perQuestion > 1 ? `, ${r.perQuestion} asked at once` : "";
    console.log(`\n${r.atoms} atom${r.atoms > 1 ? "s" : ""}${several}${shared}${fine}, learning rate ${r.learnRate}: every atom known after the last answer ${pct(r.knownAtEnd)}`);
    console.log(`  ${"method".padEnd(18)}${"rule".padEnd(16)}${"answers".padStart(8)}  ${"95 % interval".padEnd(16)}${"precision".padStart(10)}${"declared".padStart(10)}   per atom minus on the skill`);
    const [bkt, ema, streak] = r.skill;
    row("BKT on the skill", bkt, "");
    row("EMA", ema, "");
    row("streak", streak, "");
    for (const [label, a] of [["BKT per atom", r.perAtom], ["  carried", r.carried]] as const) row(label, a, a.bktSaves ? `${answers(a.bktSaves.estimate)} ${span(a.bktSaves.interval)}` : "");
    if (r.carryingSaves) console.log(`  carried minus afresh: ${answers(r.carryingSaves.estimate)} answers ${span(r.carryingSaves.interval)}`);
    const names = ["BKT P(known)", "BKT P(right)", "EMA", "BKT per atom", "carried"];
    console.log(`  Brier score against the truth after every answer: ${r.calibration.map((c, i) => `${names[i]} ${c.brier.toFixed(3)}`).join(", ")}`);
    const f = r.fits;
    console.log(`  fits with guess or slip at the bound / any parameter at the grid's edge: on the skill ${pct(f.skill.atBound)} / ${pct(f.skill.atEdge)} of ${f.skill.fits}, per atom ${pct(f.perAtom.atBound)} / ${pct(f.perAtom.atEdge)} of ${f.perAtom.fits}, carried ${pct(f.carried.atBound)} / ${pct(f.carried.atEdge)}`);
    console.log(`  threshold on training / held-out learners, and the training one's precision held out: ${r.stability.map((s) => `${s.method} ${θ(s.onTrain)} / ${θ(s.onTest)}${s.precisionOnTest === null ? "" : ` (${pct(s.precisionOnTest)})`}`).join("; ")}`);
    console.log(`  at the usual thresholds (set without a truth): ${r.usual.map((u) => `${u.rule} right ${pct(u.precision)}, declared ${pct(u.declared)}, ${answers(u.cost)} answers`).join("; ")}`);
  }
  if (results.length < 2) return;
  console.log(`\nthe sweep side by side: precision at the usual threshold (BKT 0.95, the EMA at the streak rule's cost), the cheapest threshold right ${pct(target)} of the time on the training learners, and the Brier score against the truth`);
  const head = `${"setting".padEnd(40)}${"BKT on the skill".padEnd(27)}${"EMA".padEnd(27)}${"BKT per atom".padEnd(27)}${"streak 3".padEnd(10)}`;
  console.log(head);
  console.log(`${"".padEnd(40)}${`${"usual".padStart(8)}${"θ 90 %".padStart(9)}${"Brier".padStart(7)}   `.repeat(3)}${"usual".padStart(8)}`);
  for (const r of results) {
    const cells = [
      [r.usual[0].precision, chosen(r.skill[0]), r.calibration[0].brier],
      [r.usual[1].precision, chosen(r.skill[1]), r.calibration[2].brier],
      [r.usual[3].precision, chosen(r.perAtom), r.calibration[3].brier],
    ] as const;
    console.log(`${setting(r).padEnd(40)}${cells.map(([p, t, b]) => `${pct(p).padStart(8)}${t.padStart(9)}${b.toFixed(3).padStart(7)}   `).join("")}${pct(r.usual[2].precision).padStart(8)}`);
  }
}
