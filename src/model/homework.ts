// Homework made for one student (issue #297): what a homework question is, which ones are answered, and how long
// homework may be. The questions themselves are chosen in src/homework.ts, which needs the question generators; this
// part is what the server image needs without them.
import type { SkillId } from "../math/practiceSkills.ts";
import type { Level } from "./elo.ts";

/** review: a spaced review that is due; practice: the adaptive policy's next question; stretch: a harder one to end on. */
export const HOMEWORK_WHY = ["review", "practice", "stretch"] as const;
export type HomeworkWhy = (typeof HOMEWORK_WHY)[number];
/** One homework question: what it is (rebuilt from skill, level and seed), why it was chosen, and the idea it aims at. */
export type HomeworkItem = { skill: SkillId; level: Level; seed: number; why: HomeworkWhy; idea?: string };
/** A student's homework as the plan carries it: its questions, and which of them have been answered (by index). */
export type Homework = { id: number; createdAt: number; items: HomeworkItem[]; done: number[] };

export const HOMEWORK_LENGTH = 8;
export const MIN_HOMEWORK = 4;
export const MAX_HOMEWORK = 20;
/** Spaced reviews at most, of those due: homework is mostly new practice. */
export const HOMEWORK_REVIEWS = 2;
/**
 * The chance of a right first answer the stretch question aims at: an even chance, harder than practice's three in
 * four (TARGET in policy.ts), so the student meets something a little out of reach once.
 */
export const STRETCH_TARGET = 0.5;

/** The homework question to ask next: the first one not answered yet (null once all are). */
export const nextHomework = (h: Homework | null | undefined): { item: HomeworkItem; index: number } | null => {
  if (!h) return null;
  const index = h.items.findIndex((_, i) => !h.done.includes(i));
  return index < 0 ? null : { item: h.items[index], index };
};

/** The index of the homework question this one is (by skill, level and seed), or -1 when it isn't one. */
export const homeworkIndex = (h: Pick<Homework, "items">, q: { skill: string; level: number; seed: number }) =>
  h.items.findIndex((i) => i.skill === q.skill && i.level === q.level && i.seed === q.seed);
