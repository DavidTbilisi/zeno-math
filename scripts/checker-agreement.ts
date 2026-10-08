// How often the answer checker agrees with a teacher's marking, on the labelled answers in tests/fixtures/answers.json.
// The class study's outcome is only as good as its marking: a right answer marked wrong (or the other way round)
// moves a test score, and a wrong answer marked right teaches the learner model the wrong thing.
//
// A wrong answer may also carry the mistake a teacher sees in it: the second table is how often the checker names the
// same one, and how often it names a mistake in a wrong answer the teacher saw none in.
//
//   npm run checker-agreement              the confusion matrix, agreement, and every disagreement
//   add --json for machine-readable output
import { readFileSync } from "node:fs";
import { en } from "../src/locales/en.ts";
import { check, exercise } from "../src/math/practice.ts";
import type { MistakeId } from "../src/math/mistakes.ts";
import type { SkillId } from "../src/math/practiceSkills.ts";
import { verdictOf } from "../src/learner.ts";

export const LABELS = ["correct", "close", "wrong", "form"] as const;
export type Label = (typeof LABELS)[number];
export type LabelledAnswer = { skill: SkillId; level: 1 | 2 | 3; seed: number; input: string; label: Label; mistake?: MistakeId; note?: string };
export type Agreement = {
  n: number;
  agreed: number;
  /** matrix[teacher][checker]: how many answers the teacher marked one way and the checker the other. */
  matrix: Record<Label, Record<Label, number>>;
  /** Right answers the checker took for wrong (or close), and wrong answers it took for right: the costly mistakes. */
  falseRejects: number;
  falseAccepts: number;
  disagreements: (LabelledAnswer & { checker: Label })[];
  /** Naming the mistake in wrong answers: labelled ones named the same, named otherwise, and plain ones given a name. */
  diagnosis: {
    labelled: number;
    named: number;
    misnamed: number;
    plain: number;
    falselyNamed: number;
    differences: (LabelledAnswer & { named: MistakeId | null })[];
  };
};

export const loadAnswers = (path = new URL("../tests/fixtures/answers.json", import.meta.url)) =>
  (JSON.parse(readFileSync(path, "utf8")) as { answers: LabelledAnswer[] }).answers;

export function agreement(answers: readonly LabelledAnswer[]): Agreement {
  const w = en.pracWords;
  const matrix = Object.fromEntries(LABELS.map((t) => [t, Object.fromEntries(LABELS.map((c) => [c, 0]))])) as Agreement["matrix"];
  const disagreements: Agreement["disagreements"] = [];
  const diagnosis: Agreement["diagnosis"] = { labelled: 0, named: 0, misnamed: 0, plain: 0, falselyNamed: 0, differences: [] };
  for (const a of answers) {
    const v = check(exercise(a.skill, a.level, a.seed, w), a.input, w);
    const checker = verdictOf(v);
    matrix[a.label][checker]++;
    if (checker !== a.label) disagreements.push({ ...a, checker });
    if (a.label !== "wrong") continue;
    const named = v.mistake ?? null;
    if (a.mistake) {
      diagnosis.labelled++;
      if (named === a.mistake) diagnosis.named++;
      else if (named) diagnosis.misnamed++;
    } else {
      diagnosis.plain++;
      if (named) diagnosis.falselyNamed++;
    }
    if (named !== (a.mistake ?? null)) diagnosis.differences.push({ ...a, named });
  }
  return {
    n: answers.length,
    agreed: answers.length - disagreements.length,
    matrix,
    falseRejects: matrix.correct.wrong + matrix.correct.close,
    falseAccepts: matrix.wrong.correct + matrix.close.correct + matrix.form.correct,
    disagreements,
    diagnosis,
  };
}

if (import.meta.main) {
  const r = agreement(loadAnswers());
  if (process.argv.includes("--json")) console.log(JSON.stringify(r, null, 2));
  else {
    const pct = (x: number) => `${((x / r.n) * 100).toFixed(1)} %`;
    console.log(`${r.n} labelled answers: the checker agrees with the teacher on ${r.agreed} (${pct(r.agreed)})\n`);
    console.log(`${"teacher \\ checker".padEnd(20)}${LABELS.map((l) => l.padStart(9)).join("")}`);
    for (const t of LABELS) console.log(`${t.padEnd(20)}${LABELS.map((c) => String(r.matrix[t][c]).padStart(9)).join("")}`);
    console.log(`\nright answers rejected (marked wrong or close): ${r.falseRejects}; wrong answers accepted: ${r.falseAccepts}`);
    console.log(`(a "form" verdict sends the answer back without counting it, so a disagreement into or out of "form" costs a retry, not a mark)\n`);
    console.log("disagreements:");
    for (const d of r.disagreements)
      console.log(`  ${`${d.skill} ${d.level}`.padEnd(17)} ${JSON.stringify(d.input).padEnd(30)} teacher ${d.label.padEnd(8)} checker ${d.checker.padEnd(8)}${d.note ? ` (${d.note})` : ""}`);
    const g = r.diagnosis;
    console.log(`\nnaming the mistake, in the ${g.labelled + g.plain} wrong answers:`);
    console.log(`  ${g.labelled} with a mistake the teacher names: the checker names the same one in ${g.named}, another in ${g.misnamed}, none in ${g.labelled - g.named - g.misnamed}`);
    console.log(`  ${g.plain} with none: the checker names one anyway in ${g.falselyNamed}`);
    for (const d of g.differences)
      console.log(`  ${`${d.skill} ${d.level}`.padEnd(17)} ${JSON.stringify(d.input).padEnd(30)} teacher ${(d.mistake ?? "-").padEnd(12)} checker ${d.named ?? "-"}`);
  }
}
