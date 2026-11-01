// Who is stuck, on what, and why (issue #267): the teacher's short list. The stopping-ceiling check of 23 October
// (stuck.ts) found that being stuck is a gap between one student and one skill that more hints don't close, so it needs
// a person. A student is stuck on a skill, as there, in Beck and Gong's (2013) sense of wheel-spinning: ten answers or
// more with no three right in a row in the first ten. Class practice has no assignments, so the answers that count are
// those since the student last had three right in a row on the skill, or since the teacher marked them seen: three in a
// row takes them off the list, and a teacher who has been over to help takes them off until ten more go by.
//
// Why: the mistake they repeat, as the checker names it (the answer a known mistake gives, mistakes.ts); failing that,
// the idea they ticked as hard most often; failing that, on a skill made of ideas, the idea the student is least likely
// to know. Students with the same reason are grouped, so the teacher can take them as a small group.
import type { MistakeId } from "../math/mistakes.ts";
import type { SkillId } from "../math/practiceSkills.ts";
import { STREAK, STUCK_WITHIN } from "./stuck.ts";

/** A mistake or a ticked idea counts as repeated once it comes up on this many questions since the last streak. */
export const REPEATED = 2;

/** One question answered: its attempt id, whether its first try was right, and the ideas ticked as hard on it. */
export type Try = { id: number; correct: boolean; hard?: readonly string[] };

/**
 * The questions since the student last had STREAK right in a row, after the attempt the teacher marked seen through,
 * in order. A stuck student is one with at least STUCK_WITHIN of them: none of them ends a streak.
 */
export function sinceLastStreak<T extends Try>(tries: readonly T[], seenThrough = 0): T[] {
  let start = 0, run = 0;
  tries.forEach((t, i) => {
    run = t.id <= seenThrough ? STREAK : t.correct ? run + 1 : 0;
    if (run >= STREAK) (start = i + 1), (run = 0);
  });
  return tries.slice(start);
}
export const isStuckNow = (since: readonly Try[]) => since.length >= STUCK_WITHIN;

/**
 * The key that comes up on the most lists (each list counts a key once), with how many; on a tie, the one met last,
 * as the more recent gap. Null when none comes up on `min` lists.
 */
export function mostOften<K>(lists: readonly (readonly K[])[], min = REPEATED): { key: K; times: number } | null {
  const seen = new Map<K, { times: number; last: number }>();
  lists.forEach((list, i) => {
    for (const k of new Set(list)) seen.set(k, { times: (seen.get(k)?.times ?? 0) + 1, last: i });
  });
  let best: { key: K; times: number; last: number } | null = null;
  for (const [key, { times, last }] of seen) if (!best || times > best.times || (times === best.times && last > best.last)) best = { key, times, last };
  return best && best.times >= min ? { key: best.key, times: best.times } : null;
}

/** A wrong answer that gave a mistake, to show the teacher in their own language (the checker words its hint). */
export type Example = { skill: SkillId; level: number; seed: number; input: string };
export type Because =
  | { kind: "mistake"; mistake: MistakeId; times: number; example: Example }
  | { kind: "ticked"; idea: string; times: number }
  | { kind: "weakest"; idea: string; known: number };

/**
 * Why the student is stuck, from the questions since their last streak: `mistakes(t)` names the mistakes the checker
 * recognised in a question's wrong answers, each with an answer that gave it; `weakest` is the idea of the skill they
 * are least likely to know, when the skill is made of ideas. Null when nothing repeats and the skill has no ideas.
 */
export function becauseOf<T extends Try>(
  since: readonly T[], mistakes: (t: T) => readonly { mistake: MistakeId; example: Example }[], weakest?: { idea: string; known: number },
): Because | null {
  const found = since.map(mistakes);
  const mistake = mostOften(found.map((f) => f.map((m) => m.mistake)));
  if (mistake) {
    const example = found.flat().findLast((m) => m.mistake === mistake.key)!.example;
    return { kind: "mistake", mistake: mistake.key, times: mistake.times, example };
  }
  const ticked = mostOften(since.map((t) => t.hard ?? []));
  if (ticked) return { kind: "ticked", idea: ticked.key, times: ticked.times };
  return weakest ? { kind: "weakest", ...weakest } : null;
}

/** The same reason for two students, so they share a group: a mistake, or an idea (ticked or weakest alike). */
export const reasonKey = (b: Because | null) => (!b ? "" : b.kind === "mistake" ? `mistake:${b.mistake}` : `idea:${b.idea}`);

/**
 * Rows grouped by their reason: the biggest group first (a small group to teach together), the students with no
 * reason last; within a group, the longest stuck first.
 */
export function groupByReason<R extends { because: Because | null; answers: number }>(rows: readonly R[]): { key: string; rows: R[] }[] {
  const by = new Map<string, R[]>();
  for (const r of rows) (by.get(reasonKey(r.because)) ?? by.set(reasonKey(r.because), []).get(reasonKey(r.because))!).push(r);
  return [...by].map(([key, rs]) => ({ key, rows: rs.sort((a, b) => b.answers - a.answers) }))
    .sort((a, b) => Number(!a.key) - Number(!b.key) || b.rows.length - a.rows.length || (a.key < b.key ? -1 : 1));
}
