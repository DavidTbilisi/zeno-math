// Free practice's progress, kept in this browser: kept apart from the practice dialog so the front page can say where
// the learner is without loading it.
import type { Level, SkillId } from "./math/practice";
import type { Grade } from "./model/curriculum";
import type { Cells } from "./model/placement";
import type { Spacing } from "./model/spacing";

export type Stat = { seen: number; right: number };
/** A missed question comes back once `due` more questions have been answered. */
export type Mistake = { skill: SkillId; level: Level; seed: number; due: number };
/**
 * `cells` and `placed` came later (where the learner is in the course), and `spacing` (when each secure level comes back
 * for review, keyed as the cells are) later still, so older progress may have none of them.
 */
export type Progress = { stats: Partial<Record<SkillId, Stat>>; mistakes: Mistake[]; answered: number; cells?: Cells; placed?: Grade; spacing?: Spacing };
const KEY = "zeno.practice.v1";
export const emptyProgress = (): Progress => ({ stats: {}, mistakes: [], answered: 0 });
export function loadProgress(): Progress {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? "null") as Progress | null;
    return p && typeof p.answered === "number" && Array.isArray(p.mistakes) ? p : emptyProgress();
  } catch {
    return emptyProgress();
  }
}
export function saveProgress(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // private mode or full storage: progress just isn't kept
  }
}
