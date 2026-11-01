// The checker's own words for a mistake a stuck student repeats (the teacher page's stuck list): the question is
// rebuilt from its seed and the student's answer checked again in the teacher's language, so the hint names the very
// numbers they got wrong. Loaded when first shown, as it needs the generators.
import { useMemo } from "react";
import { check, exercise, type PracticeWords } from "../math/practice";
import type { Level } from "../model/elo";
import type { Example } from "../model/stuckList";

export function MistakeHint({ example, pw }: { example: Example; pw: PracticeWords }) {
  const hint = useMemo(
    () => check(exercise(example.skill, example.level as Level, example.seed, pw), example.input, pw).hint,
    [example.skill, example.level, example.seed, example.input, pw],
  );
  return <span className="stuck-mistake">{hint}</span>;
}
