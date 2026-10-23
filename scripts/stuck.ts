// Stuck practice on the ASSISTments answers (src/model/stuck.ts): where the answers go, how much any stopping rule
// could save, and what follows a wrong answer in the visits that get stuck. It reads the raw skill-builder file, not
// the importer's assistments.json, since it needs the assignments, problems and hints the importer leaves out.
//
//   npm run stuck                                             data/skill_builder_data.csv, results in docs/results
//   npm run stuck -- skill_builder_data.csv --out docs/results
import { createReadStream, writeFileSync } from "node:fs";
import { join } from "node:path";
import { assistmentsAttempts, csvRecords } from "../src/model/datasets.ts";
import { answerParts, curves, earlyWarning, facts, nextAnswers, stuckSkills, usualShare, visitsOf } from "../src/model/stuck.ts";

const args = process.argv.slice(2);
const opt = (name: string, fallback: string) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const file = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--out") ?? "data/skill_builder_data.csv";
const out = opt("--out", "docs/results");

// The file is Latin-1, not UTF-8 (skill names have the odd accented letter).
const { attempts } = await assistmentsAttempts(csvRecords(createReadStream(file, { encoding: "latin1" })));
const visits = visitsOf(attempts);
const usual = usualShare(attempts);

const cell = (v: unknown) => (typeof v === "number" ? (Number.isFinite(v) ? String(Number(v.toFixed(4))) : "") : JSON.stringify(String(v)));
const write = (name: string, rows: readonly Record<string, unknown>[]) => {
  const columns = Object.keys(rows[0]);
  const snake = (c: string) => c.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
  writeFileSync(join(out, name), [columns.map(snake).join(","), ...rows.map((r) => columns.map((c) => cell(r[c])).join(","))].join("\n") + "\n");
  console.log(`wrote ${join(out, name)} (${rows.length} rows)`);
};

const pc = (x: number) => `${(100 * x).toFixed(1)} %`;
console.log(`${file}: ${attempts.length.toLocaleString("en")} answers in ${visits.length.toLocaleString("en")} visits (a student, a skill, an assignment)`);
const all = facts(visits, usual);
for (const f of all) console.log(`  ${f.label}: ${pc(f.value)}${Number.isNaN(f.usual) ? "" : ` (the problems' usual ${pc(f.usual)})`}, of ${f.n.toLocaleString("en")}`);
const oracle = all.find((f) => f.key === "oracle")!.value;
console.log(`  so no stopping rule saves more than ${pc(oracle)} of the answers, ${(1 / (1 - oracle)).toFixed(2)} times as fast`);

write("stuck-facts.csv", all);
write("stuck-answers.csv", answerParts(visits));
write("stuck-curves.csv", curves(visits, usual));
write("stuck-warning.csv", earlyWarning(visits));
write("stuck-next.csv", nextAnswers(visits, usual));
write("stuck-skills.csv", stuckSkills(visits));
