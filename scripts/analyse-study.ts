// The study's pre-registered analysis (src/model/analysis.ts) on the tests export.
//
//   npm run analyse -- zeno-tests.csv          the CSV from /api/research/tests.csv (the teacher page's download)
//   add --json for machine-readable output
import { readFileSync } from "node:fs";
import { analyseStudy, answerChecks, scoresFromTests, type Estimate } from "../src/model/analysis.ts";
import { parseCsv } from "../src/model/evaluate.ts";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
if (!file) {
  console.error("usage: npm run analyse -- <tests.csv> [--json]");
  process.exit(2);
}
const rows = parseCsv(readFileSync(file, "utf8"));
const result = analyseStudy(scoresFromTests(rows));
const checks = answerChecks(rows);

if (args.includes("--json")) {
  console.log(JSON.stringify({ ...result, checks }, null, 2));
} else {
  const pct = (x: number) => `${(x * 100).toFixed(1)} %`;
  const pts = (x: number) => `${x >= 0 ? "+" : "−"}${Math.abs(x * 100).toFixed(1)}`;
  const line = (e: Estimate) => `${pts(e.estimate)} points (95 % CI ${pts(e.ci[0])} to ${pts(e.ci[1])}), t(${e.df.toFixed(1)}) = ${e.t.toFixed(2)}, p = ${e.p < 0.001 ? "< 0.001" : e.p.toFixed(3)}`;
  console.log(`${file}: ${result.testLength} questions per test\n`);
  for (const [c, n] of Object.entries(result.students)) {
    const m = result.means[c];
    console.log(`${c.padEnd(9)} ${n.complete} of ${n.all} students finished both tests` + (m ? `; pre ${pct(m.pre)}, post ${pct(m.post)}, gain ${pts(m.gain)} points` : ""));
  }
  console.log("");
  if (result.ancova) {
    const a = result.ancova;
    console.log("Primary (ANCOVA, post-test adjusted for pre-test): adaptive − fixed");
    console.log(`  ${line(a)}`);
    console.log(`  adjusted post-test means: adaptive ${pct(a.adjusted.treated)}, fixed ${pct(a.adjusted.control)}; d = ${a.d.toFixed(2)}`);
  } else console.log("Primary (ANCOVA): not enough students who finished both tests in each condition");
  if (result.gains) console.log(`Secondary (Welch's t-test on gains): adaptive − fixed\n  ${line(result.gains)}`);
  if (result.forms) console.log(`Check (pre-test, form A − form B; near 0 if the forms are parallel)\n  ${line(result.forms)}`);
  // Report these with the result: answers sent long after their test ended, and the browser disagreeing with the server.
  console.log("\nAnswers (all kept, as the server marked them):");
  for (const [c, n] of Object.entries(checks))
    console.log(`  ${c.padEnd(9)} ${n.answers} answers; ${n.late} late (sent after their test had ended); ${n.remarked} marked differently by the browser`);
}
