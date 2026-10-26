// What the games on the board share: a ladder of puzzles with up to three stars each, the things a player has noticed,
// and how the endless run has gone. Kept per game in this browser, so it is read back as carefully as anything a user
// could have edited. The shape every game's state starts from is here too, and the arithmetic of finishing a puzzle
// (the streak, the stars, a notice found, how big a celebration), so a game on the board only works out what is right
// or wrong and how well, and the shell (live/useGame.tsx) does the rest.
//
// The games follow the drill ladder of the Neural OS notes: accuracy before difficulty, stability before mixing, mixing
// before speed. Free play is orientation; the first puzzles isolate one idea and the later ones vary it, and a puzzle
// opens only when the one before it is clean (two stars). Automaticity and mixing are the endless run, open once every
// puzzle is clean, a level at a time (a streak of five on the level before). Pressure is the clock, open after a streak
// of five on the top level and paced on the player's own clean times. Three misses offer a step back to the stage
// before (the fallback rule), and the ladder names a warm-up (a puzzle already at three stars), the edge (the next
// puzzle or level to pass) and a repair (the puzzle missed most), the drill ladder's anchor, stretch and repair.
// Transfer, the last stage, is outside the game: it is the practice and the problems the game's idea is used in.
export type Ladder<K extends string> = {
  stars: number[];
  found: K[];
  /** The best streak in the endless run at any level. */
  best: number;
  /** The best streak at each level of the endless run. */
  runs: number[];
  /** The misses made on each puzzle, all told: where the player collapses most, for the repair. */
  misses: number[];
  /** A running average of a clean solve's time at each level of the endless run, in milliseconds (0: none yet), the clock's pace. */
  pace: number[];
};

/** A puzzle from the ladder, the endless run (a seed, a level and a streak), or free play (no judging). */
export type GameMode = "puzzle" | "endless" | "free";
export type GameLevel = 1 | 2 | 3;
export const GAME_LEVELS: readonly GameLevel[] = [1, 2, 3];
/** What every game on a ladder keeps: where it is, and what the board last said; a notice found is said the same way in every game. */
export type GameBase<K extends string, Said = never> = {
  mode: GameMode;
  stage: number;
  said: { kind: "notice"; key: K } | Said | null;
};
/** A game with an endless run: a level, a seed for it, and the streak. */
export type EndlessGame<K extends string, L extends GameLevel = GameLevel, Said = never> = GameBase<K, Said> & {
  mode: "puzzle" | "endless";
  level: L;
  seed: number;
  streak: number;
  /** Against the clock: a right answer counts on the streak only within the player's pace. */
  timed?: boolean;
};
/** A game checked in tries: the misses so far, and whether this puzzle is done. */
export type TryGame = { misses: number; done: boolean };

export function readLadder<K extends string>(json: string | null, size: number, keys: readonly K[]): Ladder<K> {
  const zeros = (n: number) => Array<number>(n).fill(0);
  const empty: Ladder<K> = { stars: zeros(size), found: [], best: 0, runs: zeros(3), misses: zeros(size), pace: zeros(3) };
  try {
    const p = JSON.parse(json ?? "null") as Partial<Ladder<K>> | null;
    if (!p || typeof p !== "object") return empty;
    const count = (v: unknown) => (Number.isFinite(v) && (v as number) > 0 ? Math.floor(v as number) : 0);
    const counts = (a: unknown, n: number) => zeros(n).map((_, i) => (Array.isArray(a) ? count(a[i]) : 0));
    const stars = empty.stars.map((_, i) => {
      const s = Array.isArray(p.stars) ? Number(p.stars[i]) : 0;
      return s >= 1 && s <= 3 ? Math.floor(s) : 0;
    });
    const found = Array.isArray(p.found) ? keys.filter((k) => p.found!.includes(k)) : [];
    return { stars, found, best: count(p.best), runs: counts(p.runs, 3), misses: counts(p.misses, size), pace: counts(p.pace, 3) };
  } catch {
    return empty;
  }
}
/** The best stars of each puzzle are kept. */
export const withStars = <K extends string>(p: Ladder<K>, stage: number, stars: number): Ladder<K> => ({ ...p, stars: p.stars.map((s, i) => (i === stage ? Math.max(s, stars) : s)) });
/** A thing noticed, kept in the order of `keys`. */
export const withFound = <K extends string>(p: Ladder<K>, k: K, keys: readonly K[]): Ladder<K> => (p.found.includes(k) ? p : { ...p, found: keys.filter((n) => n === k || p.found.includes(n)) });
export const withBest = <K extends string>(p: Ladder<K>, streak: number): Ladder<K> => (streak > p.best ? { ...p, best: streak } : p);
const at = (a: readonly number[], i: number, v: number) => a.map((x, j) => (j === i ? v : x));

/** The stars that pass a puzzle: finishing earns at least one, but only a clean finish (at most a slip) moves on. */
export const PASS_STARS = 2;
/** The streak on a level of the endless run that opens the next level (and, on the top level, the clock). */
export const PASS_STREAK = 5;
/** The misses on one puzzle, or in a row in the endless run, after which the ladder offers a step back. */
export const FALLBACK_MISSES = 3;

export const passed = (stars: readonly number[], stage: number) => (stars[stage] ?? 0) >= PASS_STARS;
/** Every puzzle on the ladder is clean. */
export const ladderPassed = (stars: readonly number[]) => stars.length > 0 && stars.every((s) => s >= PASS_STARS);
/**
 * A puzzle opens once the one before it is passed; one already played stays open, so stars won before the rule
 * are not locked away.
 */
export const isOpen = (p: { stars: number[] }, stage: number) => stage === 0 || passed(p.stars, stage - 1) || (p.stars[stage] ?? 0) > 0;

type Run = Pick<Ladder<string>, "stars" | "best" | "runs">;
/** The endless run's first level opens once every puzzle is clean (or for a player who ran it before); each level after it with a streak of five on the one before. */
export const levelOpen = (p: Run, level: GameLevel) =>
  level === 1 ? ladderPassed(p.stars) || p.best > 0 : (p.runs[level - 2] ?? 0) >= PASS_STREAK || (p.runs[level - 1] ?? 0) > 0;
/** The clock opens with a streak of five on the top level. */
export const clockOpen = (p: Pick<Ladder<string>, "runs">) => (p.runs[GAME_LEVELS.length - 1] ?? 0) >= PASS_STREAK;

/** The running average of clean solve times after one more. */
export const paceAfter = (pace: number, ms: number) => Math.round(pace > 0 ? 0.7 * pace + 0.3 * ms : ms);
/** The time a solve must beat against the clock: a fifth more than the player's pace, and never under a second and a half; 0 with no pace yet. */
export const clockMs = (pace: number) => (pace > 0 ? Math.max(1500, Math.round(pace * 1.2)) : 0);

/** The streak after an answer: in the endless run up by one when clean, back to nought when not; elsewhere unchanged. */
export const nextStreak = (mode: GameMode, streak: number, clean: boolean) => (mode === "endless" ? (clean ? streak + 1 : 0) : streak);

/**
 * The ladder after an answer: the best streak (the endless run's, overall and at its level), a clean solve's time
 * into the level's pace, a miss on a puzzle counted, the stage's stars (1 to 3, in a puzzle only, and only up), and a
 * notice found. The same object back when nothing changed, so nothing need be saved.
 */
export function settle<K extends string>(
  p: Ladder<K>,
  o: { mode: GameMode; stage: number; level?: GameLevel; stars?: number; streak: number; missed?: boolean; ms?: number; key: K | null; keys: readonly K[] },
): Ladder<K> {
  let next = withBest(p, o.mode === "endless" ? o.streak : 0);
  if (o.mode === "endless" && o.level) {
    const i = o.level - 1;
    if (o.streak > (next.runs[i] ?? 0)) next = { ...next, runs: at(next.runs, i, o.streak) };
    if (o.ms && o.ms > 0) next = { ...next, pace: at(next.pace, i, paceAfter(next.pace[i] ?? 0, o.ms)) };
  }
  if (o.mode === "puzzle" && o.missed) next = { ...next, misses: at(next.misses, o.stage, (next.misses[o.stage] ?? 0) + 1) };
  if (o.mode === "puzzle" && o.stars !== undefined) {
    const s = Math.max(1, Math.min(3, Math.floor(o.stars)));
    if (s > (next.stars[o.stage] ?? 0)) next = withStars(next, o.stage, s);
  }
  if (o.key) next = withFound(next, o.key, o.keys);
  return next;
}

/** Every puzzle on the ladder has a star (has been finished at all). */
export const ladderDone = (stars: readonly number[]) => stars.length > 0 && stars.every((s) => s > 0);
export const totalStars = (stars: readonly number[]) => stars.reduce((a, b) => a + b, 0);

/** The streaks worth a cheer of their own. */
export const STREAK_MARKS: readonly number[] = [5, 10, 25, 50];
export const isMilestone = (streak: number) => STREAK_MARKS.includes(streak);

/** How big a celebration: one star is a pop with no confetti, two a small burst, three a big one thrown further; a streak mark is a burst of its own. */
export function burst(kind: "stars" | "streak", stars = 0): { pieces: number; cls: "s1" | "s2" | "s3" | "streak" } {
  if (kind === "streak") return { pieces: 16, cls: "streak" };
  return stars >= 3 ? { pieces: 24, cls: "s3" } : stars === 2 ? { pieces: 12, cls: "s2" } : { pieces: 0, cls: "s1" };
}

/** Somewhere on the ladder to go: a puzzle, a level of the endless run (with the clock or not), or free play. */
export type Drill = { mode: "puzzle"; stage: number } | { mode: "endless"; level: GameLevel; timed: boolean } | { mode: "free" };

/** The edge: the first puzzle not yet clean; once all are, the first level without a streak of five; then the clock. */
export function stretchOf(p: Run, hasEndless: boolean): Drill | null {
  const stage = p.stars.findIndex((s) => s < PASS_STARS);
  if (stage >= 0) return { mode: "puzzle", stage };
  if (!hasEndless) return null;
  const level = GAME_LEVELS.find((l) => (p.runs[l - 1] ?? 0) < PASS_STREAK);
  return level ? { mode: "endless", level, timed: false } : { mode: "endless", level: GAME_LEVELS[GAME_LEVELS.length - 1], timed: true };
}

/**
 * The drill ladder's daily block: a warm-up on stable material (the furthest puzzle at three stars), the edge, and a
 * repair on the most common collapse (the puzzle not yet at three stars with the most misses), each left out when
 * there is none or it is the edge itself.
 */
export function dailyBlock(p: Ladder<string>, hasEndless: boolean): { anchor: number | null; stretch: Drill | null; repair: number | null } {
  const stretch = stretchOf(p, hasEndless);
  const edge = stretch?.mode === "puzzle" ? stretch.stage : -1;
  let anchor: number | null = null;
  let repair: number | null = null;
  p.stars.forEach((s, i) => {
    if (i === edge) return;
    if (s === 3) anchor = i;
    else if (s > 0 && (p.misses[i] ?? 0) > 0 && (repair === null || p.misses[i] > p.misses[repair])) repair = i;
  });
  return { anchor, stretch, repair };
}

/**
 * The fallback after three misses: from a puzzle to the one before (from the first to free play, if the game has it);
 * from the clock to the same level without it; from a level to the one below; from the first level back to the
 * puzzles, to the repair or else the last puzzle. None in free play or before three misses.
 */
export function fallbackOf(p: Ladder<string>, o: { mode: GameMode; stage: number; level?: GameLevel; timed?: boolean; slips: number; hasFree: boolean }): Drill | null {
  if (o.slips < FALLBACK_MISSES || o.mode === "free") return null;
  if (o.mode === "puzzle") return o.stage > 0 ? { mode: "puzzle", stage: o.stage - 1 } : o.hasFree ? { mode: "free" } : null;
  const level = o.level ?? 1;
  if (o.timed) return { mode: "endless", level, timed: false };
  if (level > 1) return { mode: "endless", level: (level - 1) as GameLevel, timed: false };
  return { mode: "puzzle", stage: dailyBlock(p, true).repair ?? p.stars.length - 1 };
}
