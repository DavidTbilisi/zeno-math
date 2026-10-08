// Which mistakes students made, from the study's exports. Every wrong answer is checked again against its question
// (skill, level and seed fix the question), so this works on any export, including ones made before the checker
// named mistakes. A descriptive, secondary outcome: which slips each condition's students made, not how many.
//
//   npm run mistakes -- zeno-attempts.csv      practice answers, by condition (/api/research/attempts.csv)
//   npm run mistakes -- zeno-tests.csv         test answers, by condition and phase (/api/research/tests.csv)
//   add --json for machine-readable output
import { readFileSync } from "node:fs";
import { en } from "../src/locales/en.ts";
import { MISTAKES, type MistakeId } from "../src/math/mistakes.ts";
import { ALL_SKILLS, check, exercise, type SkillId } from "../src/math/practice.ts";
import { parseCsv } from "../src/model/evaluate.ts";

export type MistakeTally = {
  /** Wrong answers looked at, and those a mistake was named in, by group: the condition ("free" outside a class), and the phase for tests. */
  wrong: Record<string, number>;
  named: Record<string, number>;
  byMistake: Record<MistakeId, Record<string, number>>;
  bySkill: Record<string, { wrong: number; named: number }>;
};

export function tallyMistakes(rows: readonly Record<string, string>[]): MistakeTally {
  const w = en.pracWords;
  const t: MistakeTally = { wrong: {}, named: {}, byMistake: Object.fromEntries(MISTAKES.map((m) => [m, {}])) as MistakeTally["byMistake"], bySkill: {} };
  const bump = (o: Record<string, number>, k: string) => (o[k] = (o[k] ?? 0) + 1);
  for (const row of rows) {
    const [skill, level, seed] = [row.skill as SkillId, Number(row.level), Number(row.seed)];
    if (!ALL_SKILLS.includes(skill) || ![1, 2, 3].includes(level) || !Number.isInteger(seed)) continue;
    // Practice rows hold every try of an attempt; test rows hold one answer, written as a JSON string.
    const inputs = "answers" in row
      ? (JSON.parse(row.answers || "[]") as { input: string; verdict: string }[]).filter((a) => a.verdict === "wrong").map((a) => a.input)
      : row.verdict === "wrong" ? [row.input.startsWith('"') ? (JSON.parse(row.input) as string) : row.input] : [];
    if (!inputs.length) continue;
    const group = [row.condition || "free", row.phase].filter(Boolean).join(" ");
    const ex = exercise(skill, level as 1 | 2 | 3, seed, w);
    const s = (t.bySkill[skill] ??= { wrong: 0, named: 0 });
    for (const input of inputs) {
      const m = check(ex, input, w).mistake;
      bump(t.wrong, group);
      s.wrong++;
      if (m) {
        bump(t.named, group);
        bump(t.byMistake[m], group);
        s.named++;
      }
    }
  }
  return t;
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--"));
  if (!file) {
    console.error("usage: npm run mistakes -- <attempts.csv | tests.csv> [--json]");
    process.exit(2);
  }
  const t = tallyMistakes(parseCsv(readFileSync(file, "utf8")));
  if (args.includes("--json")) console.log(JSON.stringify(t, null, 2));
  else {
    const groups = Object.keys(t.wrong).sort();
    const total = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);
    const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(0)} %` : "–");
    console.log(`${file}: ${total(t.wrong)} wrong answers; a mistake is named in ${total(t.named)} (${pct(total(t.named), total(t.wrong))})\n`);
    console.log(`${"".padEnd(14)}${groups.map((g) => g.padStart(16)).join("")}`);
    console.log(`${"wrong".padEnd(14)}${groups.map((g) => String(t.wrong[g]).padStart(16)).join("")}`);
    for (const m of MISTAKES) {
      if (!total(t.byMistake[m])) continue;
      console.log(`${m.padEnd(14)}${groups.map((g) => `${t.byMistake[m][g] ?? 0} (${pct(t.byMistake[m][g] ?? 0, t.wrong[g])})`.padStart(16)).join("")}`);
    }
    console.log("\nby skill (wrong answers, a mistake named in):");
    for (const [skill, s] of Object.entries(t.bySkill).sort((a, b) => b[1].wrong - a[1].wrong)) console.log(`  ${skill.padEnd(14)}${String(s.wrong).padStart(6)}${String(s.named).padStart(6)}`);
  }
}
