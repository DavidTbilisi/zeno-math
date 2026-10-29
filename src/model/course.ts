// The course from counting to machine learning, in eight stages: school maths in three (number; algebra and geometry;
// calculus), the maths machine learning runs on in three (linear algebra; probability and statistics; optimisation),
// then classical machine learning and deep learning. Every skill is in one stage, after the stages of what it builds
// on. How far a learner has come is read from free practice in this browser: a level is secure after a run of right
// answers at the first try, and the levels of grades below the one they are working on count as behind them.
import { areaOf, type Area, type SkillId } from "../math/practiceSkills.ts";
import { CURRICULUM, gradeOf, GRADES, PREREQUISITES, type Grade } from "./curriculum.ts";
import type { Level } from "./elo.ts";
import { cellKey, currentGrade, isSecure, type Cells } from "./placement.ts";

export type StageId = "number" | "algebra" | "calculus" | "linear" | "probability" | "optimisation" | "classical" | "deep";
export type Stage = { id: StageId; skills: readonly SkillId[] };

const LEVELS = [1, 2, 3] as const;
/** The stage of each skill not in the stage of its practice area: linear algebra, the machine learning, and data. */
const MOVED: Partial<Record<SkillId, StageId>> = {
  projection: "linear", matrices: "linear", determinant: "linear", elimination: "linear", eigen: "linear",
  descent: "optimisation",
  overfitting: "classical", precision: "classical", clustering: "classical",
  backprop: "deep", softmax: "deep",
  // Reading a chart and the mean are primary-school data, taught with number; so are the puzzles.
  readChart: "number", average: "number", oneStroke: "number", colouring: "number", shortestPath: "number", spanningTree: "number", parity: "number", inversions: "number",
  shapeArea: "algebra", estimateAngle: "algebra", missingAngle: "algebra", symmetryLines: "algebra", cubeNets: "algebra", coordinates: "algebra",
};
const AREA_STAGE: Record<Area, StageId> = { number: "number", algebra: "algebra", geometry: "algebra", calculus: "calculus", data: "probability" };
const STAGE_IDS: readonly StageId[] = ["number", "algebra", "calculus", "linear", "probability", "optimisation", "classical", "deep"];

/** The stage a skill is in: its practice area's, unless it is one of those moved. */
export const stageOf = (skill: SkillId): StageId => MOVED[skill] ?? AREA_STAGE[areaOf(skill)];
/** The stages in order, each with its skills in curriculum order. */
export const STAGES: readonly Stage[] = STAGE_IDS.map((id) => ({ id, skills: CURRICULUM.filter((k) => stageOf(k) === id) }));

/** A level as the map shows it: secure, behind the learner's grade, or still to do. */
export type LevelState = "secure" | "behind" | "open";
/** A skill no syllabus here gives a grade (the graph puzzles): on the map, but never the next thing to do. */
export const isExtra = (skill: SkillId) => LEVELS.every((L) => gradeOf(skill, L) === null);

export type Standing = {
  grade: Grade;
  level: (skill: SkillId, L: Level) => LevelState;
  /**
   * Whether a level's prerequisites are met: every level of what it builds on taught by the same grade or earlier is
   * secure or behind. (Comparing whole numbers comes before the times tables; comparing negative ones, grade 7, need not.)
   */
  ready: (skill: SkillId, L: Level) => boolean;
};

const rank = (g: Grade | null) => (g === null ? Infinity : GRADES.indexOf(g));

export function standing(cells: Cells, placed: Grade | null): Standing {
  const grade = currentGrade(placed, cells);
  const level = (skill: SkillId, L: Level): LevelState =>
    isSecure(cells[cellKey({ skill, level: L })]) ? "secure" : rank(gradeOf(skill, L)) < rank(grade) ? "behind" : "open";
  const ready = (skill: SkillId, L: Level) => {
    const by = rank(gradeOf(skill, L));
    return (PREREQUISITES[skill] ?? []).every((pre) => LEVELS.every((M) => rank(gradeOf(pre, M)) > by || level(pre, M) !== "open"));
  };
  return { grade, level, ready };
}

/** How much of a stage is secure, and how much is behind the learner's grade, in levels. */
export function stageProgress(stage: Stage, s: Standing) {
  const all = stage.skills.flatMap((k) => LEVELS.map((L) => s.level(k, L)));
  return { secure: all.filter((x) => x === "secure").length, behind: all.filter((x) => x === "behind").length, total: all.length };
}

/**
 * What to do next: of the open levels whose prerequisites are met, those of the lowest grade, and of those the first
 * in the course. The puzzles and the one level without a grade are never next. Null once nothing is left.
 */
export function nextStep(s: Standing, stages: readonly Stage[] = STAGES): { skill: SkillId; level: Level } | null {
  let best: { skill: SkillId; level: Level; key: number } | null = null;
  let i = 0;
  for (const st of stages)
    for (const skill of st.skills) {
      i++;
      for (const level of LEVELS) {
        const g = gradeOf(skill, level);
        if (g === null || s.level(skill, level) !== "open" || !s.ready(skill, level)) continue;
        const key = rank(g) * 1e4 + i * 10 + level;
        if (!best || key < best.key) best = { skill, level, key };
      }
    }
  return best && { skill: best.skill, level: best.level };
}
