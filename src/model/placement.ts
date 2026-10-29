// Where a learner stands in the course. A short placement finds their grade by halving: each question comes from the
// middle of the grades still possible, and the answer rules out the half above or below it. From there practice
// moves them on, a grade at a time, as its levels become secure.
import type { SkillId } from "../math/practiceSkills.ts";
import { CURRICULUM, gradeOf, GRADES, type Grade } from "./curriculum.ts";
import type { Level } from "./elo.ts";

export type Cell = { skill: SkillId; level: Level };
/** A level's record in free practice: answers, right at the first try, and right at the first try in a row. */
export type CellStat = { seen: number; right: number; run: number };
export type Cells = Partial<Record<string, CellStat>>;
export const cellKey = (c: Cell) => `${c.skill}.${c.level}`;

/** Right at the first try in a row that make a level secure: the three of ASSISTments' skill builders. */
export const SECURE_RUN = 3;
/** The share of a grade's levels that must be secure before the next grade is the one being worked on. */
export const GRADE_DONE = 0.8;

/** The levels a grade teaches, in curriculum order. */
export const cellsOf = (grade: Grade): Cell[] =>
  CURRICULUM.flatMap((skill) => ([1, 2, 3] as const).filter((level) => gradeOf(skill, level) === grade).map((level) => ({ skill, level })));
export const isSecure = (s: CellStat | undefined) => (s?.run ?? 0) >= SECURE_RUN;
/** One more answer on a level: only a right answer at the first try counts towards securing it. */
export const recordCell = (s: CellStat | undefined, firstTry: boolean): CellStat => ({
  seen: (s?.seen ?? 0) + 1,
  right: (s?.right ?? 0) + (firstTry ? 1 : 0),
  run: firstTry ? (s?.run ?? 0) + 1 : 0,
});

export function gradeProgress(grade: Grade, cells: Cells) {
  const all = cellsOf(grade);
  return { secure: all.filter((c) => isSecure(cells[cellKey(c)])).length, total: all.length };
}
const done = (grade: Grade, cells: Cells) => {
  const p = gradeProgress(grade, cells);
  return p.secure >= GRADE_DONE * p.total;
};
/** The grade being worked on: the placed one (or grade 1), moved past every grade whose levels are mostly secure. */
export function currentGrade(placed: Grade | null, cells: Cells): Grade {
  let i = Math.max(0, GRADES.indexOf(placed ?? GRADES[0]));
  while (i < GRADES.length - 1 && done(GRADES[i], cells)) i++;
  return GRADES[i];
}

// ---------- placement ----------

/** Right answers a grade needs before the placement rules out the grades below it; one wrong rules it out at once. */
export const PER_PROBE = 2;
/** The grades still possible (indices into GRADES, both ends included), and right answers so far on the one asked. */
export type Placement = { lo: number; hi: number; right: number; asked: number };
export const startPlacement = (): Placement => ({ lo: 0, hi: GRADES.length - 1, right: 0, asked: 0 });
/** The grade the next question comes from: the middle of those left, rounded up so every answer narrows them. */
export const probe = (p: Placement): Grade => GRADES[Math.ceil((p.lo + p.hi) / 2)];
export function placementStep(p: Placement, rightFirstTry: boolean): Placement {
  const mid = Math.ceil((p.lo + p.hi) / 2);
  const asked = p.asked + 1;
  if (!rightFirstTry) return { lo: p.lo, hi: mid - 1, right: 0, asked };
  return p.right + 1 >= PER_PROBE ? { lo: mid, hi: p.hi, right: 0, asked } : { ...p, right: p.right + 1, asked };
}
/** The grade found, once one is left. */
export const placedGrade = (p: Placement): Grade | null => (p.lo === p.hi ? GRADES[p.lo] : null);
/** The most questions a placement can take. */
export const MAX_PLACEMENT = PER_PROBE * Math.ceil(Math.log2(GRADES.length));
