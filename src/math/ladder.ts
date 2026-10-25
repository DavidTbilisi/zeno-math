// What the games on the board share: a ladder of puzzles, each with up to three stars and open once the one before it
// has a star, the things a player has noticed, and the best streak. Kept per game in this browser, so it is read back
// as carefully as anything a user could have edited. The shape every game's state starts from is here too, and the
// arithmetic of finishing a puzzle (the streak, the stars, a notice found, how big a celebration), so a game on the
// board only works out what is right or wrong and how well, and the shell (live/useGame.tsx) does the rest.
export type Ladder<K extends string> = { stars: number[]; found: K[]; best: number };

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
};
/** A game checked in tries: the misses so far, and whether this puzzle is done. */
export type TryGame = { misses: number; done: boolean };

export function readLadder<K extends string>(json: string | null, size: number, keys: readonly K[]): Ladder<K> {
  const empty: Ladder<K> = { stars: Array(size).fill(0), found: [], best: 0 };
  try {
    const p = JSON.parse(json ?? "null") as Partial<Ladder<K>> | null;
    if (!p || typeof p !== "object") return empty;
    const stars = empty.stars.map((_, i) => {
      const s = Array.isArray(p.stars) ? Number(p.stars[i]) : 0;
      return s >= 1 && s <= 3 ? Math.floor(s) : 0;
    });
    const found = Array.isArray(p.found) ? keys.filter((k) => p.found!.includes(k)) : [];
    const best = Number.isFinite(p.best) && p.best! > 0 ? Math.floor(p.best!) : 0;
    return { stars, found, best };
  } catch {
    return empty;
  }
}
/** The best stars of each puzzle are kept. */
export const withStars = <K extends string>(p: Ladder<K>, stage: number, stars: number): Ladder<K> => ({ ...p, stars: p.stars.map((s, i) => (i === stage ? Math.max(s, stars) : s)) });
/** A thing noticed, kept in the order of `keys`. */
export const withFound = <K extends string>(p: Ladder<K>, k: K, keys: readonly K[]): Ladder<K> => (p.found.includes(k) ? p : { ...p, found: keys.filter((n) => n === k || p.found.includes(n)) });
export const withBest = <K extends string>(p: Ladder<K>, streak: number): Ladder<K> => (streak > p.best ? { ...p, best: streak } : p);
/**
 * A puzzle opens once the one before it has a star. Finishing a puzzle always earns at least one star and so opens
 * the next: the ladder paces a player, it does not gate them, and the feedback (a small cheer, a nudge to try again),
 * not the lock, says how well it went.
 */
export const isOpen = (p: { stars: number[] }, stage: number) => stage === 0 || p.stars[stage - 1] > 0;

/** The streak after an answer: in the endless run up by one when clean, back to nought when not; elsewhere unchanged. */
export const nextStreak = (mode: GameMode, streak: number, clean: boolean) => (mode === "endless" ? (clean ? streak + 1 : 0) : streak);

/**
 * The ladder after a puzzle is finished: the best streak (the endless run's), the stage's stars (1 to 3, in a puzzle
 * only, and only up), and a notice found. The same object back when nothing changed, so nothing need be saved.
 */
export function settle<K extends string>(p: Ladder<K>, o: { mode: GameMode; stage: number; stars?: number; streak: number; key: K | null; keys: readonly K[] }): Ladder<K> {
  let next = withBest(p, o.mode === "endless" ? o.streak : 0);
  if (o.mode === "puzzle" && o.stars !== undefined) {
    const s = Math.max(1, Math.min(3, Math.floor(o.stars)));
    if (s > (next.stars[o.stage] ?? 0)) next = withStars(next, o.stage, s);
  }
  if (o.key) next = withFound(next, o.key, o.keys);
  return next;
}

/** Every puzzle on the ladder has a star. */
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
