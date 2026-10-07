// The pre- and post-test of a class study. Two forms, A and B, ask about the same skills at the same levels in the same
// order, with different seeds: the questions differ but come from the same generators, so the forms are parallel by
// construction (the dashboard checks that their scores agree). Half of each condition takes A first and B after, the
// other half the other way round, so a harder form can't pass for learning. Everything follows from the class code,
// so the server and every student's browser build the same forms without storing them.
import type { SkillId } from "../math/practiceSkills.ts";
import type { Level } from "./elo.ts";

export type Form = "A" | "B";
export type TestPhase = "pre" | "post";
/** Which form a student takes first: AB = A before, B after. */
export type TestOrder = "AB" | "BA";
export type TestItem = { skill: SkillId; level: Level; seed: number };

export const DEFAULT_TEST_LENGTH = 12;
export const MIN_TEST_LENGTH = 4;
export const MAX_TEST_LENGTH = 30;
/** Medium first, then easy, then hard, so a short test is mostly medium questions. */
const LEVEL_CYCLE: readonly Level[] = [2, 1, 3];

/** FNV-1a: a small, stable hash, so a form is the same on every machine. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h % 2 ** 31;
}

/**
 * The items of a form. With more skills than items, the items spread evenly over the skills; with fewer, the skills
 * come round again at the next level, so every skill is asked about about equally.
 */
export function testItems(classCode: string, skills: readonly SkillId[], form: Form, length = DEFAULT_TEST_LENGTH): TestItem[] {
  return Array.from({ length }, (_, i) => {
    const many = skills.length >= length;
    const skill = many ? skills[Math.floor(((i + 0.5) * skills.length) / length)] : skills[i % skills.length];
    const level = LEVEL_CYCLE[(many ? i : Math.floor(i / skills.length)) % LEVEL_CYCLE.length];
    return { skill, level, seed: hash(`${classCode}:${form}:${i}`) };
  });
}

export const formFor = (order: TestOrder, phase: TestPhase): Form => (phase === "pre" ? order[0] : order[1]) as Form;
