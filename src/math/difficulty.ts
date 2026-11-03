// The student's word on a question's difficulty (issues #288, #290): after a question they can say it was too
// easy, about right or too hard. In free practice the next questions move a level up or down (at the ends of the scale
// there is no level to move to, and the student is told so); in class practice the study chooses, and the rating only
// goes with the attempt as data.
import type { Level } from "./practice";

export type Rating = "easy" | "right" | "hard";
export const RATINGS: readonly Rating[] = ["easy", "right", "hard"];

/** The level after a rating, and whether the rating asked for a level past either end. */
export function rateLevel(L: Level, r: Rating): { level: Level; edge: boolean } {
  if (r === "easy") return L < 3 ? { level: (L + 1) as Level, edge: false } : { level: L, edge: true };
  if (r === "hard") return L > 1 ? { level: (L - 1) as Level, edge: false } : { level: L, edge: true };
  return { level: L, edge: false };
}
