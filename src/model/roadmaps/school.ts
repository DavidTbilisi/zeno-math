// School, grades 1 to 12: each grade of the syllabus (curriculum.ts) with the levels it teaches, the levels of one
// skill in one item. University (grade 13) is the course's business.
import { CURRICULUM, gradeOf, GRADES } from "../curriculum.ts";
import type { Level } from "../elo.ts";
import type { Roadmap } from "../roadmap.ts";

const LEVELS: readonly Level[] = [1, 2, 3];
export const SCHOOL: Roadmap = {
  id: "school",
  order: "grade",
  stages: GRADES.filter((g) => g !== 13).map((g) => ({
    id: String(g),
    items: CURRICULUM.flatMap((skill) => {
      const levels = LEVELS.filter((L) => gradeOf(skill, L) === g);
      return levels.length ? [{ skill, levels }] : [];
    }),
  })),
};
