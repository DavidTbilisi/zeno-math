// The home page's boards in the order the learner picked: by last change or by when they were made (newest first,
// under Today / Past 7 days / Past 30 days / Older), or by name (A to Z in the page's language, untitled ones last).
import type { BoardSummary } from "./api";

export type BoardSort = "recent" | "created" | "name";
export const BOARD_SORTS: readonly BoardSort[] = ["recent", "created", "name"];
export type BoardAge = "today" | "week" | "month" | "older";
export type BoardRun = { age?: BoardAge; boards: BoardSummary[] };

const DAY = 24 * 60 * 60 * 1000;

/** How long ago `t` was, by the calendar day it fell on (so "today" ends at midnight, not 24 hours later). */
export function ageOf(t: number, now: number): BoardAge {
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  const start = midnight.getTime();
  if (t >= start) return "today";
  if (t >= start - 6 * DAY) return "week";
  if (t >= start - 29 * DAY) return "month";
  return "older";
}

/** The boards in runs: one run per age for the two date orders, a single run without a heading for names. */
export function sortBoards(boards: readonly BoardSummary[], sort: BoardSort, o: { now: number; locale: string; untitled: string }): BoardRun[] {
  if (sort === "name") {
    const blank = (b: BoardSummary) => !b.title.trim() || b.title === o.untitled;
    const names = new Intl.Collator(o.locale, { sensitivity: "base", numeric: true });
    // Untitled boards have no name to sort by, so among themselves the last changed comes first.
    const sorted = [...boards].sort((a, b) =>
      Number(blank(a)) - Number(blank(b)) || (blank(a) ? 0 : names.compare(a.title, b.title)) || b.updatedAt - a.updatedAt);
    return sorted.length ? [{ boards: sorted }] : [];
  }
  const when = (b: BoardSummary) => (sort === "created" ? b.createdAt : b.updatedAt);
  const runs: BoardRun[] = [];
  for (const b of [...boards].sort((a, b) => when(b) - when(a))) {
    const age = ageOf(when(b), o.now);
    const last = runs[runs.length - 1];
    if (last?.age === age) last.boards.push(b);
    else runs.push({ age, boards: [b] });
  }
  return runs;
}

export const isBoardSort = (s: unknown): s is BoardSort => BOARD_SORTS.includes(s as BoardSort);
