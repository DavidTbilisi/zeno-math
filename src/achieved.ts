// When things were achieved, kept in this browser for the roadmaps' achieved list (#449): the first time a practice
// level was made secure ("cell:<skill>.<level>"), a game's ladder was passed ("ladder:<its useGame key>") and a topic's
// intro was read ("read:<topic>", #450) and a lab was first used on its page ("lab:<kind>", #461). Only the first time counts; what was done before this was kept has no date.
import { PASS_STARS } from "./math/ladder";
import { isGoal, type GoalId } from "./model/roadmap";

const KEY = "zeno.achieved.v1";
export type Dates = Record<string, number>;

export function loadAchieved(): Dates {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) ?? "null") as unknown;
    return d && typeof d === "object" && !Array.isArray(d) ? (d as Dates) : {};
  } catch {
    return {};
  }
}
export function noteAchieved(id: string, at = Date.now()) {
  const d = loadAchieved();
  if (d[id] !== undefined) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...d, [id]: at }));
  } catch {
    // private mode or full storage: the date just isn't kept
  }
}

/** Whether a game's ladder kept in this browser under `key` is passed: 2★ or more on every puzzle (ladder.ts). */
export function ladderPassedHere(key: string): boolean {
  try {
    const stars = (JSON.parse(localStorage.getItem(key) ?? "null") as { stars?: unknown } | null)?.stars;
    return Array.isArray(stars) && stars.length > 0 && stars.every((s) => Number(s) >= PASS_STARS);
  } catch {
    return false;
  }
}

// The roadmap goal last opened in this browser (#/roadmaps/<goal>).
const GOAL_KEY = "zeno.goal";
export function storedGoal(): GoalId | null {
  try {
    const g = localStorage.getItem(GOAL_KEY);
    return isGoal(g) ? g : null;
  } catch {
    return null;
  }
}
export function storeGoal(g: GoalId) {
  try {
    localStorage.setItem(GOAL_KEY, g);
  } catch {
    /* private mode: the goal isn't remembered */
  }
}
