// Turns the ASSISTments 2009–2010 skill-builder file into observations for the learner model (src/model/datasets.ts).
// The file is free to download for research from the ASSISTments data site; it is not part of this repository.
//
//   npm run import-assistments -- skill_builder_data.csv                 writes assistments.json
//   npm run import-assistments -- skill_builder_data.csv --out data.json
//
// Then: npm run model -- --observations assistments.json
import { createReadStream, writeFileSync } from "node:fs";
import { csvRecords, fromAssistments, toFile } from "../src/model/datasets.ts";

const args = process.argv.slice(2);
const opt = (name: string, fallback: string) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const file = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--out");
if (!file) {
  console.error("usage: npm run import-assistments -- <skill_builder_data.csv> [--out assistments.json]");
  process.exit(2);
}
const out = opt("--out", "assistments.json");

// The file is Latin-1, not UTF-8 (skill names have the odd accented letter).
const data = await fromAssistments(csvRecords(createReadStream(file, { encoding: "latin1" })));
writeFileSync(out, JSON.stringify(toFile(data)));
const { rows, kept, students, skills } = data.counts;
const right = data.observations.filter((o) => o.correct).length / Math.max(1, kept);
console.log(`${file}: ${rows.toLocaleString("en")} rows read, ${kept.toLocaleString("en")} answers kept from ${students.toLocaleString("en")} students on ${skills} skills, ${(right * 100).toFixed(1)} % right first time`);
const topics = new Map<string, number>();
for (const t of Object.values(data.areas)) topics.set(t, (topics.get(t) ?? 0) + 1);
console.log(`skills by topic: ${[...topics].map(([t, n]) => `${t} ${n}`).join(", ")}`);
console.log(`wrote ${out}`);
