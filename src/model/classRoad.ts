// A class's roadmap goal on the teacher page (#461): each student on the roadmap's skills the class practises, from
// the learner model the dashboard already reports. A skill item is done once every level it asks for is mastered.
// Games, intros and labs are kept in each student's own browser, so the server can't count them.
import type { SkillId } from "../math/practiceSkills.ts";
import { isSkill, itemsOf, type GoalId } from "./roadmap.ts";
import { ROADMAPS } from "./roadmaps/index.ts";

export type RoadStudent = { mastery: Partial<Record<SkillId, { p: readonly number[]; n: number }>> };

/** How many of the roadmap's skill items in the class's list there are, and how many each student has done. */
export function classRoad(goal: GoalId, classSkills: readonly SkillId[], students: readonly RoadStudent[], masteredAt: number) {
  const items = itemsOf(ROADMAPS[goal]).filter(isSkill).filter((i) => classSkills.includes(i.skill));
  const done = (s: RoadStudent) =>
    items.filter((i) => {
      const m = s.mastery[i.skill];
      return !!m && m.n > 0 && i.levels.every((L) => m.p[L - 1] >= masteredAt);
    }).length;
  return { total: items.length, done: students.map(done) };
}
