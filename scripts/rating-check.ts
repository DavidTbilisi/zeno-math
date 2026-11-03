// How a question felt to the student against the model's prediction (src/model/ratingCheck.ts), on the attempts
// export. Exploratory: not part of the pre-registered analysis (npm run analyse).
//
//   npm run ratings -- zeno-attempts.csv       the CSV from /api/research/attempts.csv
//   add --json for machine-readable output
import { readFileSync } from "node:fs";
import { parseCsv } from "../src/model/evaluate.ts";
import { ratedAnswers, ratingCheck, type Correlation } from "../src/model/ratingCheck.ts";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
if (!file) {
  console.error("usage: npm run ratings -- <attempts.csv> [--json]");
  process.exit(2);
}
const rows = parseCsv(readFileSync(file, "utf8"));
if (rows.length && !("rated" in rows[0])) {
  console.error(`${file} has no rated column: it was exported before ratings were recorded (issue #290).`);
  process.exit(1);
}
const result = ratingCheck(ratedAnswers(rows));

if (args.includes("--json")) {
  console.log(JSON.stringify(result, null, 2));
} else {
  const pct = (x: number) => `${(x * 100).toFixed(1)} %`;
  const withPrediction = rows.filter((r) => r.predicted !== "").length;
  console.log(`${file}: ${result.answers} answers rated by ${result.students} students (of ${withPrediction} attempts with a prediction)\n`);
  console.log(`${"".padEnd(13)}${"answers".padStart(8)}  ${"model's chance".padStart(14)}  ${"right first time".padStart(16)}`);
  for (const [r, name] of [["easy", "too easy"], ["right", "about right"], ["hard", "too hard"]] as const) {
    const g = result.byRating[r];
    console.log(`${name.padEnd(13)}${String(g?.answers ?? 0).padStart(8)}  ${(g ? pct(g.predicted) : "–").padStart(14)}  ${(g ? pct(g.firstCorrect) : "–").padStart(16)}`);
  }
  const line = (label: string, c: Correlation | null) =>
    `  ${label.padEnd(22)}` + (c ? `ρ = ${c.rho.toFixed(2)}` + (c.ci ? ` (95 % CI ${c.ci[0].toFixed(2)} to ${c.ci[1].toFixed(2)})` : " (one student: no interval)") + `, ${c.answers} answers, ${c.students} students` : "not enough answers, or no spread");
  console.log("\nThe model's chance against how easy it felt (Spearman's ρ; intervals from resampling students):");
  console.log(line("all rated answers", result.all));
  console.log(line("right first time", result.right));
  console.log(line("not right first time", result.wrong));
  console.log("\nA positive ρ: questions the model gave a higher chance felt easier. The rating comes after the answer, so");
  console.log("the two lines within an outcome are the ones the answer itself cannot explain. Exploratory, not pre-registered.");
}
