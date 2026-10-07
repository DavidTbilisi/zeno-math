// The simulation study: adaptive against fixed question choice on simulated classes, across the assumptions the
// result depends on (how learning works, transfer to later skills, learning rate). Prints Cohen's d of adaptive over
// fixed in test-score gain, averaged over several simulated classes, and how often adaptive came out ahead.
//
//   npm run simulate                                  algebra, 60 students, 60 questions each, 10 classes per cell
//   npm run simulate -- --skills algebra,average --students 30 --questions 40 --runs 20
//   add --json for machine-readable output
import { ALL_SKILLS, AREAS, SKILLS, type Area, type SkillId } from "../src/math/practiceSkills.ts";
import { inCurriculumOrder } from "../src/model/curriculum.ts";
import { runStudy, summarise, type SimParams } from "../src/model/simulate.ts";

const args = process.argv.slice(2);
const opt = (name: string, fallback: string) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const skills = inCurriculumOrder(
  opt("--skills", "algebra").split(",").flatMap((s): readonly string[] => (AREAS.includes(s as Area) ? SKILLS[s as Area] : [s])),
) as SkillId[];
const unknown = opt("--skills", "algebra").split(",").filter((s) => !AREAS.includes(s as Area) && !ALL_SKILLS.includes(s as SkillId));
if (unknown.length || !skills.length) {
  console.error(`unknown skills: ${unknown.join(", ")}`);
  process.exit(2);
}
const students = Number(opt("--students", "60"));
const questions = Number(opt("--questions", "60"));
const runs = Number(opt("--runs", "10"));

const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const rows: { learning: SimParams["learning"]; transfer: number; learnRate: number; d: number; ahead: number; gainA: number; gainF: number; offA: number; offF: number }[] = [];
for (const learning of ["flat", "zpd"] as const)
  for (const transfer of [0, 0.3, 0.6])
    for (const learnRate of [0.02, 0.1]) {
      const s = Array.from({ length: runs }, (_, i) => summarise(runStudy({ skills, students, questions, seed: (i + 1) * 101, learning, transfer, learnRate })));
      rows.push({
        learning, transfer, learnRate,
        d: mean(s.map((x) => x.d)),
        ahead: s.filter((x) => x.d > 0).length / runs,
        gainA: mean(s.map((x) => x.adaptive.gain)),
        gainF: mean(s.map((x) => x.fixed.gain)),
        offA: mean(s.map((x) => x.adaptive.offTarget)),
        offF: mean(s.map((x) => x.fixed.offTarget)),
      });
    }

if (args.includes("--json")) {
  console.log(JSON.stringify({ skills, students, questions, runs, rows }, null, 2));
} else {
  console.log(`${runs} simulated classes per row: ${students} students (half each way), ${questions} questions each, on ${skills.join(", ")}\n`);
  const pad = (s: string | number, n: number) => String(s).padStart(n);
  console.log(`${"learning".padEnd(9)}${pad("transfer", 9)}${pad("rate", 6)}${pad("d", 8)}${pad("ahead", 7)}${pad("gain A", 9)}${pad("gain F", 9)}${pad("off-target A / F", 18)}`);
  for (const r of rows)
    console.log(
      `${r.learning.padEnd(9)}${pad(r.transfer, 9)}${pad(r.learnRate, 6)}${pad(r.d.toFixed(2), 8)}${pad(`${Math.round(r.ahead * 100)}%`, 7)}` +
        `${pad(r.gainA.toFixed(3), 9)}${pad(r.gainF.toFixed(3), 9)}${pad(`${r.offA.toFixed(2)} / ${r.offF.toFixed(2)}`, 18)}`,
    );
  console.log("\nd: Cohen's d of adaptive over fixed in test-score gain. ahead: share of classes where adaptive gained more.");
  console.log("off-target: how far the questions were from a 75 % chance of a right answer, on average (true chance).");
}
